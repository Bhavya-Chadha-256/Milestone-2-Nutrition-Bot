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

REMINDER — your entire response must be a single valid JSON object with exactly
these keys: "answer" (string) and "claims" (array of objects).
For each claim, you MUST provide a "source" object with these exact keys:
- "document_name" (string)
- "publisher" (string)
- "year" (integer)
- "url" (string, must be a valid URL, e.g., "https://example.com" if unknown)
- "section" (string)
Do not wrap it in markdown. Do not add any text before or after the JSON.`;

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
        .map((c) => `[Section: ${c.section_heading}]\n${c.content}`)
        .join("\n\n");
      return `${header}\n${body}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a dietary guidance assistant. Answer questions using ONLY the reference documents provided below.

Rules:
- Be factual and specific. Cite sections when helpful.
- Keep answers between 2–5 sentences unless a list is clearly better.
- Never invent facts, authority names, studies, or publications not present in the documents.
- If the documents don't cover a topic, say so explicitly rather than guessing.
- Do NOT provide calorie targets or weight loss recommendations.
- If asked about personal dietary requirements (e.g., "How much do I require?"), you must append a disclaimer stating that individual requirements differ and they should consult a real doctor or registered dietitian for specific personal advice.

REFERENCE DOCUMENTS:
${contextBlock}${FORMAT_REMINDER}`;

  return {
    systemPrompt,
    messages: [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  };
}
