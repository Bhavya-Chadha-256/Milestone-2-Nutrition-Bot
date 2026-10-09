# Nutrition Bot — Milestone 2

## Overview
A RAG-powered dietary guidance chatbot built for Milestone 2. It integrates a local vector database (Chroma DB) and a custom Python embedding microservice (Jina) to retrieve evidence-based dietary context and dynamically generate accurate, cited responses via the Groq API.

## RAG Configuration
| Parameter | Value |
|-----------|-------|
| Chunk size | 800 tokens |
| Chunk overlap | 100 tokens |
| Embedding model | `jina-embeddings-v2-small-en` (Local Python server) |
| Index type | HNSW (Chroma DB Default) |
| k value | 3 |
| Relevance threshold | 0.75 |

## Corpus (7 Documents)
1. Dietary Guidelines for Americans, 2020-2025 (USDA & HHS)
2. Dietary Reference Values for Nutrients Summary Report (EFSA)
3. Safe Minimum Internal Temperature Chart (FoodSafety.gov)
4. Cold Food Storage Chart (FoodSafety.gov)
5. People at Risk of Food Poisoning (FoodSafety.gov)
6. Safe Handling of Raw Produce and Fresh-Squeezed Fruit and Vegetable Juices (FDA)
7. The Nutrition and Supplement Facts Labels (FDA)

## Schema Changes (M1 → M2)
- `claims[].source` changed from `null` to a structured `Citation` object.
- `Citation` contains: `document_name`, `publisher`, `year`, `url`, `section`.
- All existing M1 messages in the database retain `source: null` — this is expected behavior.

## Chunking Strategy
We utilized **Section-aware recursive splitting**. 
By converting the PDFs/HTML into Markdown and chunking via Header splitters (`MarkdownHeaderTextSplitter`), we maintain the exact section heading for each chunk. If a section was too large, we used `RecursiveCharacterTextSplitter` (800 token chunk size, 100 overlap) to break it down further.
**What it cost (Trade-offs):** 
1. **Preprocessing Overhead:** Required significant manual cleanup to convert PDFs into clean Markdown with proper headers.
2. **Table Splitting:** Some large data tables in the EFSA guidelines were split awkwardly across chunks, requiring manual formatting adjustments to ensure the LLM could still read them.

## Deployment Notes (Vercel)
**WARNING:** This Milestone 2 architecture relies on two local background services:
1. `python3 scripts/embed_server.py` (FastAPI Jina embeddings)
2. `chroma run --path ./chroma_db` (Chroma Vector Store)

**Vercel ONLY hosts Serverless Node.js functions.** You cannot natively run background Python processes or persistent Chroma DB instances on Vercel. 
To deploy this successfully to Vercel, you must:
1. Host the Chroma DB on a stateful provider (e.g. Railway, Render, Fly.io, or Chroma Cloud).
2. Host the Python embed server on a container service, OR switch the `ragPipeline.ts` to use a serverless embedding provider like OpenAI (`text-embedding-3-small`). 

Once the DB and Embedding services are hosted externally, you can deploy the Next.js app to Vercel by setting these environment variables:
- `GROQ_API_KEY`
- `EMBEDDING_API_URL`
- `CHROMA_DB_URL`
- `RETRIEVAL_K`
- `RELEVANCE_THRESHOLD`
