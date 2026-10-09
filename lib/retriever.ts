// lib/retriever.ts
// Phase 4 — Retrieval Module
// Handles: query embedding → vector search → metadata-rich results
//
// Embedding: calls local Python embed_server.py (http://127.0.0.1:8001/embed)
//   which uses jinaai/jina-embeddings-v2-small-en — SAME model used during indexing.
// Vector search: Chroma DB HTTP client (http://127.0.0.1:8000)
// Metadata enrichment: SQLite documents table (via db.ts)

import { ChromaClient } from "chromadb";
import { getDocumentByDocId } from "./db";

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
    const res = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/jinaai/jina-embeddings-v2-small-en", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!res.ok) {
      throw new Error(`HF API returned ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    // HF Inference API might return a 1D array or a nested 2D array depending on inputs
    return Array.isArray(json[0]) ? json[0] : json;
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

// ── 2. Chroma DB client ──────────────────────────────────────────────────────

const CHROMA_URL = process.env.CHROMA_URL ?? "http://127.0.0.1:8000";

// Shared client — instantiated once per server process
const chromaClient = new ChromaClient({ host: "127.0.0.1", port: 8000, ssl: false });

// ── 3. Main retrieval function ───────────────────────────────────────────────

export async function retrieveChunks(
  options: RetrievalOptions
): Promise<RetrievedChunk[]> {
  // Step 1: embed the query with the same model used during indexing
  const queryEmbedding = await embedQuery(options.query);

  // Step 2: search Chroma DB collection
  const collection = await chromaClient.getCollection({ name: "nutrition_chunks" });

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: options.k ?? 6,
    where: options.filter ? { doc_id: options.filter.doc_id } : undefined,
  });

  if (!results.ids[0] || results.ids[0].length === 0) return [];

  // Step 3: return results enriched with SQLite metadata (source_url)
  const retrieved: RetrievedChunk[] = [];

  for (let i = 0; i < results.ids[0].length; i++) {
    const id = results.ids[0][i];
    const content = results.documents[0][i] || "";
    const meta = results.metadatas[0][i] as Record<string, string | number>;

    // Chroma returns cosine distance (0 = identical), convert to similarity score
    const distance = results.distances?.[0][i] ?? 0;
    const similarity_score = 1 - distance;

    // Fetch source_url from SQLite — Chroma only stores what was indexed
    const doc = await getDocumentByDocId(meta.doc_id as string);

    retrieved.push({
      chunk_id: id,
      content,
      document_name: meta.document_name as string,
      publisher: meta.publisher as string,
      year: meta.year as number,
      section_heading: meta.section_heading as string,
      source_url: doc?.source_url ?? "",
      similarity_score,
    });
  }

  return retrieved;
}
