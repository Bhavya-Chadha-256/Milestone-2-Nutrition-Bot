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
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1536,
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`LLM returned non-JSON: "${raw.slice(0, 300)}"`);
  }

  // Validate with Zod
  const validated = ChatResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn(`[ragPipeline] LLM schema mismatch. Retrying... Error: ${validated.error.message}`);
    
    // Retry once with stricter prompt
    const retryPrompt = systemPrompt + `\n\nCRITICAL FIX: Your previous response was invalid. You MUST output a strictly valid JSON object matching the requested schema. Error: ${validated.error.message}`;
    
    const retryCompletion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: retryPrompt },
        ...messages,
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // lower temp for retry
      max_tokens: 1536,
    });
    
    const retryRaw = retryCompletion.choices[0]?.message?.content ?? "";
    let retryParsed: unknown;
    try {
      retryParsed = JSON.parse(retryRaw);
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
  // Only pass the last 4 messages to save tokens/speed up inference
  const history = getHistory(sessionId).slice(-4).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const { systemPrompt, messages } = buildPrompt(
    gate.relevant_chunks,
    history,
    message
  );

  // Step 5 & 6: LLM call + Zod parse
  return await callLLM(systemPrompt, messages);
}
