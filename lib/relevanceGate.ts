// lib/relevanceGate.ts
// Phase 5 — Post-retrieval relevance gate
// Filters retrieved chunks below a similarity threshold.
// If no chunks pass, the query is considered a "corpus miss".

import type { RetrievedChunk } from "./retriever";

export interface GateResult {
  pass: boolean;
  relevant_chunks: RetrievedChunk[];
  searched_documents: string[];
}

const ALL_DOC_NAMES = [
  "Dietary Guidelines for Americans, 2020–2025 (USDA & HHS)",
  "Healthy Diet Fact Sheet (WHO, 2024)",
  "The Eatwell Guide (Public Health England, 2016)",
  "Dietary Reference Values — Summary Report (EFSA, 2017)",
  "Cold Food Storage Charts (FoodSafety.gov, 2024)",
  "Australian Dietary Guidelines (NHMRC, 2013)",
  "FDA Food Code (FDA, 2022)",
];

export function relevanceGate(
  chunks: RetrievedChunk[],
  threshold?: number
): GateResult {
  const THRESHOLD =
    threshold ?? parseFloat(process.env.RELEVANCE_THRESHOLD ?? "0.45");

  const relevant = chunks.filter((c) => c.similarity_score >= THRESHOLD);

  return {
    pass: relevant.length > 0,
    relevant_chunks: relevant,
    searched_documents: ALL_DOC_NAMES,
  };
}

export function buildCorpusMissResponse(searchedDocs: string[]): {
  answer: string;
  claims: [];
} {
  const docList = searchedDocs.join(", ");
  return {
    answer: `The dietary guidance documents I have access to (${docList}) don't appear to cover this topic. I can only answer questions addressed in these official guidance documents.`,
    claims: [],
  };
}
