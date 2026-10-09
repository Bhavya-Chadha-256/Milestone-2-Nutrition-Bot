// lib/retriever.ts
// Phase 4 — Retrieval Module
// Handles: query embedding → vector search → metadata-rich results
//
// Embedding: calls local Python embed_server.py (http://127.0.0.1:8001/embed)
//   which uses jinaai/jina-embeddings-v2-small-en — SAME model used during indexing.
// Vector search: Chroma DB HTTP client (http://127.0.0.1:8000)
// Metadata enrichment: SQLite documents table (via db.ts)

import { getDocumentByDocId, getAllChunks } from "./db";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

export interface RetrievalOptions {
  query: string;
  k?: number;                        // default: 6
  filter?: { doc_id: string };       // optional per-document filter
}

export interface RetrievedChunk {
  chunk_id: string;
  content: string;
  document_name: string;
  publisher: string;
  year: number;
  section_heading: string;
  source_url: string;
  similarity_score: number;
}

// ── 1. Query Embedding via local Python embed server ─────────────────────────

const EMBED_SERVER = process.env.EMBED_SERVER_URL ?? "http://127.0.0.1:8001";

async function embedQuery(text: string): Promise<number[]> {
  const hfToken = process.env.HF_TOKEN;

  if (hfToken) {
    let retries = 3;
    while (retries > 0) {
      const res = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/jinaai/jina-embeddings-v2-small-en", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (res.status === 503) {
        console.warn("[HF API] Model is loading. Retrying in 10 seconds...");
        await new Promise(r => setTimeout(r, 10000));
        retries--;
        continue;
      }

      if (!res.ok) {
        throw new Error(`HF API returned ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      return Array.isArray(json[0]) ? json[0] : json;
    }
    throw new Error("HF API timed out loading the model after multiple retries.");
  }

  // Fallback to local embed server
  const res = await fetch(`${EMBED_SERVER}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(
      `Embed server returned ${res.status}: ${await res.text()}`
    );
  }

  const json = (await res.json()) as { embedding: number[]; dimensions: number };
  return json.embedding;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── 3. Main retrieval function ───────────────────────────────────────────────

export async function retrieveChunks(
  options: RetrievalOptions
): Promise<RetrievedChunk[]> {
  // Step 1: embed the query with the same model used during indexing
  const queryEmbedding = await embedQuery(options.query);

  // Step 2: Fetch all chunks from SQLite and compute similarity locally
  // This bypasses the need for Chroma DB (and avoids AVX instruction segfaults on cheap cloud CPUs)
  const allChunks = getAllChunks() as any[];
  
  let scoredChunks = allChunks.map((chunk) => {
    // Parse the stored JSON array embedding
    const chunkEmbedding = JSON.parse(chunk.embedding);
    const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    return { ...chunk, score };
  });

  // Apply optional filtering
  if (options.filter?.doc_id) {
    scoredChunks = scoredChunks.filter(c => c.doc_id === options.filter!.doc_id);
  }

  // Sort by highest score descending
  scoredChunks.sort((a, b) => b.score - a.score);

  // Take top K
  const topK = scoredChunks.slice(0, options.k ?? 6);

  // Step 3: return results enriched with SQLite metadata
  const retrieved: RetrievedChunk[] = [];

  for (const result of topK) {
    const doc = await getDocumentByDocId(result.doc_id);
    retrieved.push({
      chunk_id: result.id,
      content: result.content,
      document_name: result.document_name,
      publisher: result.publisher,
      year: result.year,
      section_heading: result.section_heading,
      source_url: doc?.source_url ?? "",
      similarity_score: result.score,
    });
  }

  return retrieved;
}
