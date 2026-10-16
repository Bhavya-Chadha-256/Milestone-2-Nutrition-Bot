// lib/promptBuilder.ts
// Phase 6 — Builds the RAG system prompt by injecting retrieved chunks
// into a structured context block, grouped by source document.

import type { RetrievedChunk } from "./retriever";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PromptResult {
  systemPrompt: string;
  messages: Message[];
}

const FORMAT_REMINDER = `

RESPONSE FORMAT:
You MUST respond with a single valid JSON object strictly matching this format:
{
  "answer": "Your 2-5 sentence answer here based on the reference documents.",
  "claims": [
    {
      "claim_text": "A specific positive factual claim directly taken from the documents answering the query.",
      "source": {
        "document_name": "Document Name",
        "publisher": "Publisher",
        "year": 2020,
        "url": "https://example.com/nutrition",
        "section": "Section Heading"
      }
    }
  ]
}
CRITICAL RULES FOR CLAIMS:
- If the documents do NOT contain information to answer the question, or if you state that the documents do not cover the topic: "claims" MUST BE AN EMPTY ARRAY: [].
- Never extract claims about what documents do NOT contain (no negative claims like "Document X does not mention Y").
- Only extract claims when positive, verifiable factual evidence directly from the provided reference documents answers the user's question.
Do not include any explanation or markdown formatting outside the JSON.`;

export function buildPrompt(
  retrievedChunks: RetrievedChunk[],
  conversationHistory: Message[],
  userMessage: string
): PromptResult {
  // Group chunks by document name
  const grouped = new Map<string, RetrievedChunk[]>();
  for (const chunk of retrievedChunks) {
    const key = chunk.document_name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(chunk);
  }

  // Build context block with clear document separation
  const contextBlock = Array.from(grouped.entries())
    .map(([docName, chunks]) => {
      const meta = chunks[0];
      const url = meta.source_url && meta.source_url !== "local-upload" ? meta.source_url : "https://example.com/nutrition";
      const header = `--- ${docName} (${meta.publisher}, ${meta.year}) [URL: ${url}] ---`;
      const body = chunks
        .map((c) => {
          // Cap long chunks at 1200 characters to prevent token limit blowups
          const content = c.content.length > 1200 ? c.content.slice(0, 1200) + "..." : c.content;
          return `[Section: ${c.section_heading}]\n${content}`;
        })
        .join("\n\n");
      return `${header}\n${body}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a dietary guidance assistant. Answer questions using ONLY the reference documents provided below.

Rules:
- Be factual and specific. Cite sections when helpful.
- Keep answers between 2–5 sentences unless a list is clearly better.
- Include between 1 and 3 of the most relevant positive factual claims directly answering the query, with accurate sources.
- Never invent facts, authority names, studies, or publications not present in the documents.
- If the documents don't cover a topic, say so explicitly rather than guessing, and return "claims": [].
- MANDATORY MEDICAL DISCLAIMER: Any advisory answer, dietary recommendation, nutrient requirement, or food guidance (even when directly taken from reference documents) MUST include this disclaimer at the end:
"Disclaimer: All dietary and medical advice should be verified with a qualified doctor or registered dietitian."

REFERENCE DOCUMENTS:
${contextBlock}
${FORMAT_REMINDER}`;

  return {
    systemPrompt,
    messages: [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  };
}
