// lib/ragPipeline.ts
// Phase 6 — Full RAG orchestration
// Flow: scope guard → retrieve → relevance gate → prompt → LLM → parse → return

import { isBlocked } from "./scopeGuard";
import { retrieveChunks } from "./retriever";
import { relevanceGate, buildCorpusMissResponse } from "./relevanceGate";
import { buildPrompt } from "./promptBuilder";
import { getHistory } from "./db";
import Groq from "groq-sdk";
import { ChatResponseSchema, type ChatResponse } from "./schema";

// ── Groq client ──────────────────────────────────────────────────────────────

let _groq: Groq | null = null;
function getGroqClient(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

// ── Scope guard refusal ──────────────────────────────────────────────────────

function buildScopeGuardResponse(): ChatResponse {
  return {
    answer:
      "I'm not able to provide personal dietary targets, weight recommendations, or medical advice. Please consult a registered dietitian or your doctor.",
    claims: [],
  };
}

// ── JSON cleanup helper ───────────────────────────────────────────────────────

function cleanJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}

// ── LLM call ─────────────────────────────────────────────────────────────────

async function callLLM(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ChatResponse> {
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    temperature: 0.2,
    max_tokens: 1024,
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJson(raw));
  } catch {
    throw new Error(`LLM returned non-JSON: "${raw.slice(0, 300)}"`);
  }

  // Validate with Zod
  const validated = ChatResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn(`[ragPipeline] LLM schema mismatch. Retrying... Error: ${validated.error.message}`);
    
    // Retry once with stricter prompt
    const retryPrompt = systemPrompt + `\n\nCRITICAL FIX: Your previous response did not match the expected format. Ensure "claims" contains objects with "claim_text" and "source". Error: ${validated.error.message}`;
    
    const retryCompletion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: retryPrompt },
        ...messages,
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });
    
    const retryRaw = retryCompletion.choices[0]?.message?.content ?? "";
    let retryParsed: unknown;
    try {
      retryParsed = JSON.parse(cleanJson(retryRaw));
    } catch {
      throw new Error(`LLM returned non-JSON on retry: "${retryRaw.slice(0, 300)}"`);
    }
    
    const retryValidated = ChatResponseSchema.safeParse(retryParsed);
    if (!retryValidated.success) {
      throw new Error(`LLM schema mismatch on retry: ${retryValidated.error.message}`);
    }
    
    return retryValidated.data;
  }

  return validated.data;
}

// ── Main RAG pipeline ────────────────────────────────────────────────────────

export async function ragPipeline(
  message: string,
  sessionId: string
): Promise<ChatResponse> {
  // Step 1: Scope guard (pre-retrieval — no vector search wasted)
  if (isBlocked(message)) {
    return buildScopeGuardResponse();
  }

  // Step 2: Retrieve top-k chunks from Chroma
  const k = parseInt(process.env.RETRIEVAL_K ?? "3");
  const chunks = await retrieveChunks({ query: message, k });

  // Step 3: Relevance gate (post-retrieval — no LLM call wasted)
  const gate = relevanceGate(chunks);
  if (!gate.pass) {
    return buildCorpusMissResponse(gate.searched_documents);
  }

  // Step 4: Build prompt with retrieved context
  // Only pass the last 4 messages, extracting text/answer to avoid inflating token count
  const history = getHistory(sessionId).slice(-4).map((m) => {
    let content = m.content;
    try {
      const p = JSON.parse(m.content);
      content = p.text ?? p.answer ?? m.content;
    } catch {
      // not JSON
    }
    return {
      role: m.role as "user" | "assistant",
      content,
    };
  });

  const { systemPrompt, messages } = buildPrompt(
    gate.relevant_chunks,
    history,
    message
  );

  // Step 5 & 6: LLM call + Zod parse
  const response = await callLLM(systemPrompt, messages);

  // If answer indicates refusal, out of scope, or no information in documents, ensure claims is empty
  const refusalPatterns = [
    /do not contain (?:any )?information/i,
    /does not contain (?:any )?information/i,
    /don't appear to cover/i,
    /doesn't appear to cover/i,
    /no information (?:is )?(?:provided|found|available)/i,
    /cannot answer/i,
    /cannot provide/i,
    /not able to provide/i,
    /not covered in the/i,
    /outside (?:the )?scope/i,
  ];

  const isDeclinedOrNoInfo = refusalPatterns.some((pattern) => pattern.test(response.answer));

  if (isDeclinedOrNoInfo) {
    response.claims = [];
  } else {
    // Only keep claims with valid, non-empty sources and positive factual content
    response.claims = (response.claims || []).filter((claim) => {
      if (!claim || !claim.claim_text || !claim.source || !claim.source.document_name) {
        return false;
      }
      if (/does not contain|do not contain|not mentioned|no information|cannot be found/i.test(claim.claim_text)) {
        return false;
      }
      return true;
    });

    // Enforce mandatory medical advice disclaimer on all advisory responses
    const hasMedicalDisclaimer = /doctor|dietitian|dietician|physician/i.test(response.answer);
    if (!hasMedicalDisclaimer) {
      response.answer =
        response.answer.trim() +
        "\n\nDisclaimer: All dietary and medical advice should be checked with a qualified doctor or registered dietitian.";
    }
  }

  return response;
}
