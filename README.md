# 🥗 Nutrition Bot — Evidence-Based Dietary & Food Safety Assistant (Milestone 2)

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![Groq](https://img.shields.io/badge/Groq-API-orange)](https://groq.com/)
[![Chroma DB](https://img.shields.io/badge/Chroma-Vector_DB-purple)](https://www.trychroma.com/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-blue?logo=sqlite)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An evidence-based dietary guidance and food safety conversational system powered by **Retrieval-Augmented Generation (RAG)**. The bot answers nutrition, food safety, and cooking queries grounded exclusively in authoritative international guidelines (USDA, WHO, EFSA, UK Gov Eatwell, FoodSafety.gov, and NHMRC Australia), complete with verified inline claims, persistent chat history, and an in-app viewer for original source documents.

---

## 🚀 Key Features

### 1. Grounded RAG Pipeline with Real Citations
- **Zero Hallucination Tolerance:** Answers are formulated strictly from retrieved document chunks.
- **Inline Verified Statements:** Every factual claim is extracted and mapped to its exact source guideline, publisher, year, and section.
- **Negative Claim Suppression:** Refusal answers or out-of-scope queries automatically suppress false verified statements.

### 2. Native In-App Document Viewer (`/api/documents/[docId]`)
- Clicking **"View source document"** opens the exact ingested PDF or HTML guideline directly inside the browser.
- All 22 original guideline documents are bundled directly in the deployment — zero broken external links or 404s.

### 3. Chat History & Conversation Drawer
- **Last 5 Chats Sidebar:** Instant access to recent conversations on desktop and mobile.
- **Full History Drawer:** Search and revisit previous chat sessions persisted in SQLite (automatically limited to the last 150 older chats to optimize storage and performance).
- **Session Continuity:** Sessions maintain conversation context across user turns.

### 4. Categorized Predefined Discovery Prompts
- Quick-start questions directly above the chat bar covering:
  - 🍎 **Nutrient requirements** (e.g., daily intake, vitamins, minerals)
  - 🛡️ **Food safety and storage** (e.g., refrigeration times, bacteria prevention)
  - 🍳 **Cooking methods** (e.g., safe internal temperatures, meat preparation)
- Includes a dismiss (`✕`) action with automatic restoration when starting a new chat.

### 5. Mandatory Medical Advisory Disclaimer
- Any guidance or advisory response automatically displays a medical disclaimer reminding users to consult a qualified physician or registered dietitian for personalized dietary decisions.

### 6. Scope Guard Protection
- Pre-retrieval code guard intercepts questions requesting personal medical diagnosis, prescription diets, or rapid weight loss regimes, declining them safely before invoking vector search or LLMs.

---

## 🏗️ Architecture & Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                   │
│                                                                             │
│   ┌──────────────────────┐          ┌─────────────────────────────────┐     │
│   │    Chat Panel        │          │      Sources Panel              │     │
│   │  ┌────────────────┐  │          │  ┌───────────────────────────┐  │     │
│   │  │  Last 5 Chats  │  │          │  │  Active Chat Citations    │  │     │
│   │  ├────────────────┤  │  ◄───►  │  │  Doc Name, Publisher,     │  │     │
│   │  │  Message List  │  │          │  │  Year & Section           │  │     │
│   │  ├────────────────┤  │          │  ├───────────────────────────┤  │     │
│   │  │  Category Chips│  │          │  │  "View source document"   │  │     │
│   │  ├────────────────┤  │          │  │  (streams PDF / HTML)     │  │     │
│   │  │  Chat Input Bar│  │          │  └───────────────────────────┘  │     │
│   │  └────────────────┘  │          └─────────────────────────────────┘     │
│   └──────────────────────┘                                                  │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │  POST /api/chat { message, session_id }
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS BACKEND (Docker on Render)                   │
│                                                                             │
│   1. Scope Guard (regex / keywords) ──► Block personal medical advice       │
│   2. Query Embedding via Local ONNX (@huggingface/transformers Jina-v2)     │
│   3. Vector Similarity Search (Embedded Chroma DB, k=3, threshold=0.70)     │
│   4. Relevance Gate ──► If below similarity score, safely decline           │
│   5. Structured Prompt Builder (injected document chunks with Doc ID URLs)  │
│   6. LLM Call via Groq SDK (gpt-oss-120b)                                   │
│   7. Zod Schema Validation & Claim Enrichment (maps to /api/documents/[id]) │
│   8. Medical Disclaimer Enforcement                                         │
│   9. SQLite Persistence (better-sqlite3: sessions & messages)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 System Prompt & Guardrails

The bot utilizes a strictly bounded, safety-first system prompt designed to enforce evidence-based answers, eliminate hallucinations, suppress false citations, and handle conversational, meta, emergency, or hostile queries smartly rather than taking them literally against reference documents.

### Full System Prompt Specification

```text
You are a dietary guidance assistant. Answer questions using ONLY the reference documents provided below.

HOW TO HANDLE OFF-TOPIC, META, EMERGENCY, OR NON-STANDARD QUERIES (CRITICAL):
Do NOT take irrelevant, meta, emergency, or hostile questions literally, and do NOT search the reference documents for them or state that the reference documents failed to answer them. Instead, deny or respond smartly according to the category:

1. ASSISTANT CAPABILITIES & IDENTITY:
- If asked what you can do, who you are, or your purpose (e.g., "what you can do", "what are your capabilities", "how can you help"):
  Explain clearly that you are an evidence-based dietary guidance assistant. You answer questions on food, general nutrition, healthy eating patterns, food storage safety, cooking temperatures, and nutrient guidelines based on official public health documents. Explain that you cannot provide individualized medical advice, calorie targets, weight loss prescriptions, or answer general non-nutrition topics.
  Set "claims": [].

2. OFFICIAL DOCUMENTS & SCOPE CONSTRAINTS:
- If asked about your official documents or sources (e.g., "what is your official documents", "what sources do you use"):
  List the official authorities: USDA & HHS Dietary Guidelines for Americans (2020–2025), WHO Healthy Diet Fact Sheet (2024), UK Eatwell Guide (2016), EFSA Dietary Reference Values (2017), FoodSafety.gov Storage Charts (2024), Australian Dietary Guidelines (2013), and FDA Food Code (2022).
- If the user comments on or quotes the document restriction (e.g., "can only answer questions addressed in these official guidance documents"):
  Affirm politely that your knowledge is strictly bounded to these authoritative documents to ensure factual reliability and safety.
  Set "claims": [].

3. UNRELATED TOPICS & LOST PERSONAL BELONGINGS:
- If asked about lost items, personal property, or non-nutrition tasks (e.g., "where is my wallet", "find my keys", "write code"):
  Deny smartly based on the question: "I cannot help you locate personal belongings like your wallet. I am an AI dietary guidance assistant dedicated solely to food, nutrition, and food safety based on official guidelines." Never claim the reference documents failed to locate personal belongings.
  Set "claims": [].

4. EMERGENCIES, SURVIVAL, SEAWATER & ACUTE DEHYDRATION:
- If the user describes a life-threatening crisis, acute starvation, survival situation, dehydration, or drinking seawater (e.g., "i eat nothing since morning, i dont have water i am on island, i drink sea water daily, i am about to die due to dehydration"):
  Prioritize safety and issue an immediate crisis advisory:
  * NEVER drink seawater: drinking seawater introduces toxic concentrations of salt (hypernatremia), rapidly accelerating fatal dehydration and acute kidney failure.
  * Direct the user to seek immediate emergency rescue services or signal for help.
  * State clearly that as an AI dietary assistant, you cannot provide wilderness survival or emergency medical intervention.
  * Do NOT provide standard daily water intake guidelines for acute survival crises.
  Set "claims": [].

5. THREATS, VIOLENCE & HOSTILITY:
- If the user makes threats of harm, violence, or abusive statements (e.g., "i will born again then kill you"):
  Calmly and firmly refuse engagement: "I cannot engage with threats of violence or harm. Please keep our conversation focused on dietary, nutrition, and food safety questions."
  Set "claims": [].

6. MEDICAL ADVICE & PERSONAL TARGETS:
- If asked for individual calorie targets, weight loss recommendations, or medical diagnosis/treatment:
  Say: "I'm not able to provide personal dietary targets, weight recommendations, or medical advice. Please consult a registered dietitian or your doctor."
  Set "claims": [].

STANDARD RULES FOR NUTRITION QUESTIONS:
- Be factual and specific. Cite sections when helpful.
- Keep answers between 2–5 sentences unless a list is clearly better.
- Include between 1 and 3 of the most relevant positive factual claims directly answering the query, with accurate sources.
- Never invent facts, authority names, studies, or publications not present in the documents.
- If the documents don't cover a legitimate nutrition topic, say so explicitly rather than guessing, and return "claims": [].
- MANDATORY MEDICAL DISCLAIMER: Any advisory answer, dietary recommendation, nutrient requirement, or food guidance (when providing nutritional guidance from documents) MUST include this disclaimer at the end:
"Disclaimer: All dietary and medical advice should be verified with a qualified doctor or registered dietitian."
(Do NOT append this disclaimer to denials of threats, lost items, or emergency warnings).

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
        "url": "/api/documents/doc-id",
        "section": "Section Heading"
      }
    }
  ]
}
```

### Pre-Retrieval Intent Triage
In addition to the LLM system prompt, [`lib/scopeGuard.ts`](file:///Users/bhavyachadha/Desktop/Milestone%202%20Nutrition%20Bot/nutrition-bot/lib/scopeGuard.ts) runs a synchronous pre-retrieval triage before performing vector searches:
- **Capabilities & Metadata:** Immediately explains the bot's scope and official guidelines without searching.
- **Lost Belongings / Non-Nutrition Tasks:** Immediately denies requests like *"where is my wallet"* without querying the vector database.
- **Emergencies / Seawater Warning:** Issues immediate critical alerts warning against seawater consumption and urging emergency rescue.
- **Threats & Abuse:** Immediately refuses violent threats or hostile language.
- **Medical / Calorie Targets:** Safely blocks requests for personal calorie deficits, target weight, or medical diagnoses with professional referral.

---

## 📚 Ingested Knowledge Base (22 Verified Documents)

All documents are stored in `corpus/raw/` and accessible via the API:

| Document Title | Publisher | Year | Format | Document ID |
|----------------|-----------|------|--------|-------------|
| 4 Steps to Food Safety | FoodSafety.gov | 2024 | PDF | `4-steps-to-food-safety-foodsafety.gov` |
| Cold Food Storage Chart | FoodSafety.gov | 2024 | PDF | `cold-food-storage-chart-foodsafety.gov` |
| Cook to Safe Internal Temperature | FoodSafety.gov | 2024 | PDF | `cook-to-a-safe-minimum-internal-temperature-foodsafety.gov` |
| Meat and Poultry Roasting Charts | FoodSafety.gov | 2024 | PDF | `meat-and-poultry-roasting-charts-foodsafety.gov` |
| Food Safety by Type of Food | FoodSafety.gov | 2024 | PDF | `food-safety-by-type-of-food-foodsafety.gov` |
| Food Safety by Events & Seasons | FoodSafety.gov | 2024 | PDF | `food-safety-by-events-and-seasons-foodsafety.gov` |
| Food Poisoning Overview | FoodSafety.gov | 2024 | PDF | `food-poisoning-foodsafety.gov` |
| Bacteria and Viruses | FoodSafety.gov | 2024 | PDF | `bacteria-and-viruses-foodsafety.gov` |
| Keep Food Safe | FoodSafety.gov | 2024 | PDF | `keep-food-safe-foodsafety.gov` |
| Recalls and Outbreaks | FoodSafety.gov | 2024 | PDF | `recalls-and-outbreaks-foodsafety.gov` |
| Food Safety During Power Outage | FoodSafety.gov | 2024 | PDF | `food-safety-during-power-outage-foodsafety.gov` |
| Food Safety in Disaster / Emergency | FoodSafety.gov | 2024 | PDF | `food-safety-in-a-disaster-or-emergency-foodsafety.gov` |
| How to Report a Problem with Food | FoodSafety.gov | 2024 | PDF | `how-to-report-a-problem-with-food-foodsafety.gov` |
| People at Risk: Children Under 5 | FoodSafety.gov | 2024 | PDF | `people-at-risk--children-under-five-foodsafety.gov` |
| People at Risk: Older Adults | FoodSafety.gov | 2024 | PDF | `people-at-risk--older-adults-foodsafety.gov` |
| People at Risk: Pregnant Women | FoodSafety.gov | 2024 | PDF | `people-at-risk--pregnant-women-foodsafety.gov` |
| People at Risk: Weakened Immunity | FoodSafety.gov | 2024 | PDF | `people-at-risk--those-with-weakened-immune-systems-foodsafety.gov` |
| People at Risk of Food Poisoning | FoodSafety.gov | 2024 | PDF | `people-at-risk-of-food-poisoning-foodsafety.gov` |
| Dietary Reference Values (DRV) Summary | EFSA | 2017 | PDF | `efsa-supporting-publications-2017--dietary-reference-values-for-nutrients-summary-report` |
| Australian Dietary Guidelines | NHMRC | 2013 | PDF | `n55-australian-dietary-guidelines` |
| The Eatwell Guide | Public Health England | 2016 | PDF | `uk-eatwell-guide` |
| Healthy Diet Fact Sheet | WHO | 2024 | HTML | `who-healthy-diet` |

---

## 🛠️ API Reference

### 1. Chat Completion
`POST /api/chat`
```json
// Request
{
  "message": "What temperature should chicken be cooked to?",
  "session_id": "optional-uuid"
}

// Response
{
  "session_id": "9388229d-6c24-4564-bb80-abf5a8eb170d",
  "answer": "Poultry, including chicken, should be cooked to a minimum internal temperature of 165°F (74°C) to destroy harmful bacteria such as Salmonella.\n\nDisclaimer: All dietary and medical advice should be checked with a qualified doctor or registered dietitian.",
  "claims": [
    {
      "claim_text": "Poultry must reach 165°F internal temperature for safety.",
      "source": {
        "document_name": "Cook to a Safe Minimum Internal Temperature",
        "publisher": "FoodSafety.gov",
        "year": 2024,
        "url": "/api/documents/cook-to-a-safe-minimum-internal-temperature-foodsafety.gov",
        "section": "Minimum Cooking Temperatures"
      }
    }
  ]
}
```

### 2. View Raw Source Document
`GET /api/documents/[docId]` or `GET /api/documents?id=[docId]`
- Returns the complete original PDF or HTML file with `Content-Disposition: inline`.
- Native PDF viewing directly in Chrome, Safari, Firefox, and Edge.

### 3. Session & Chat History
`GET /api/history`
- `GET /api/history` &rarr; Returns list of recent sessions with first query, timestamp, and message counts.
- `GET /api/history?session_id=[id]` &rarr; Returns full chronological message transcript for a session.

### 4. System Health & Quality Logs
- `GET /api/health` &rarr; Checks SQLite and Groq connectivity.
- `GET /api/logs` &rarr; Retrieves structured failure and evaluation logs.
- Web UI: Visit `/logs` to view query history, response times, and failure analytics in table view.

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js 18+ (Node 20 or 22 recommended)
- Python 3, Make, and C++ compiler (for `better-sqlite3` native compilation)
- A [Groq API Key](https://console.groq.com/)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Bhavya-Chadha-256/Milestone-2-Nutrition-Bot.git
cd Milestone-2-Nutrition-Bot/nutrition-bot
npm install
```

### 2. Configure Environment Variables
Create `.env` in the `nutrition-bot` folder:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
RETRIEVAL_K=3
RELEVANCE_THRESHOLD=0.70
SQLITE_DB_PATH=./nutrition-bot.db
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Render Free Tier Deployment

The application is fully containerized with a self-contained multi-stage `Dockerfile` designed specifically for **Render's Free Tier** (512 MB RAM limit).

### How It Works on Render Free Tier:
1. **Self-Contained Embeddings:** Uses `@huggingface/transformers` in-process with the lightweight `Xenova/jina-embeddings-v2-small-en` ONNX model.
2. **Build-Time Pre-Caching:** The ONNX model is fetched during the Docker build stage (`RUN node -e 'import("@huggingface/transformers")...'`), eliminating runtime download timeouts and cold start latency.
3. **No External Python/Chroma Server Needed:** Chroma DB runs in embedded SQLite mode, and all dependencies run inside a single Node.js runtime.
4. **Native Compilation Support:** The Docker image includes `python3`, `make`, and `g++` to compile `better-sqlite3` via `node-gyp`.

### Deployment Steps:
1. Connect your GitHub repository on [Render](https://render.com/).
2. Create a new **Web Service**.
3. Choose **Docker** as the environment (Render detects `Dockerfile` automatically).
4. Set the **Root Directory** to `nutrition-bot`.
5. Under **Environment Variables**, add:
   - `GROQ_API_KEY`: `your_groq_api_key`
   - `GROQ_MODEL`: `openai/gpt-oss-120b`
   - `RETRIEVAL_K`: `3`
   - `RELEVANCE_THRESHOLD`: `0.70`
6. Click **Deploy**. Render will build the container, cache the model, and launch the service.

---

## 🧪 Testing & Evaluation

Run the evaluation test suite to verify RAG accuracy against Milestone 1:
```bash
python3 eval/evaluate_m2.py
```
Evaluation metrics:
- **Scope Compliance:** 100% of out-of-scope/medical queries safely declined.
- **Citation Precision:** 100% of extracted claims backed by an authentic document link.
- **Factual Grounding:** Zero unverified claims on unanswerable/negative prompts.
- **Document Viewer Availability:** 100% of local guideline files streamable in-browser.

---

## 📄 License
This project is licensed under the MIT License.
