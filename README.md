# SpurDesk - AI-Powered Customer Support Platform

SpurDesk is a production-ready customer support chat platform designed to simulate a live customer support chat widget. An AI agent, powered by **Gemini 2.5 Flash**, answers user questions using real-time store policy documentation fetched dynamically from a database-driven Knowledge Base.

> [!NOTE]
> For a deep-dive into the backend service patterns, request pipelines, caching logic, error retries, and future scaling plans, please refer to the detailed **[Technical Architecture & Engineering Decisions Documentation](file:///home/Krishna-Singh/AssistFlow/documentation/architecture_and_decisions.md)**.

---

## 1. Overview
SpurDesk simulates the foundational architecture of an automated customer engagement platform. It demonstrates:
- Persistent chat sessions that survive browser reloads.
- An extensible **LLM Provider Abstraction** designed for swapping providers (Gemini, OpenAI, Claude).
- A **Knowledge Retrieval** system that queries FAQs from a database rather than hardcoding business rules in system prompts.
- Operational design patterns suitable for a high-availability customer service environment.

---

## 2. Features
- **Persisted Conversations**: Message history is written to a local database and retrieved seamlessly.
- **Dynamic Context Injection (RAG-lite)**: Identifies key policy terms in customer queries, pulls relevant answers from the DB, and injects them as facts for the AI.
- **Local Conversation Titles**: Derives a meaningful name for new sessions immediately from the user's initial question to keep latency ultra-low.
- **Operational Tracing**: Logs every API request with unique `requestId`, `sessionId`, and latency metrics.
- **Robust Input Validation**: Strict client and server-side rules preventing empty queries or spamming (trimmed and limited to 2000 characters).
- **Spur Brand Theme**: Light theme matching the official Spur design system, featuring electric blue primary accents, user chat bubbles in white with grey borders, AI bubbles in Spur Cobalt Blue, Shopify & Meta Partner badges, and a custom SVG Spur smiley-bag logo.

---

## 3. Tech Stack
- **Monorepo Structure**: Separate services for frontend and backend.
- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS v4).
- **Backend**: Node.js + Express + TypeScript.
- **Database**: SQLite (local) / PostgreSQL (production-compatible) via Prisma.
- **LLM API**: Google Gemini 2.5 Flash (via `@google/generative-ai` SDK) / Swappable OpenAI & Anthropic Claude APIs.
- **Caching**: Redis client (with automatic in-memory fallback).

---

## 4. Project Structure
```
spurdesk/
├── spurdesk-api
│   ├── controllers
│   ├── services
│   ├── repositories
│   ├── providers
│   └── middleware
│
└── spurdesk-web
    ├── app
    ├── components
    └── services
```

---

## 5. Database Schema & Seeding
Our local SQLite database operates on three models configured via Prisma:
- `Conversation`: Chat session metadata including unique `id` (UUID) and derived chat title.
- `Message`: Connects directly to the conversation. Holds `sender` (`user` | `ai`), message `text`, and timestamps. Uses indexes on `conversationId` and `createdAt` for fast chronological loading.
- `KnowledgeBase`: Stores store-policy documentation details.

### Database Seeding (`npx prisma db seed`)
Seeding is handled by `spurdesk-api/prisma/seed.ts` and populates the database with:
- **Shipping FAQ**: Detailed policies on transit times, coverage (USA/International), and rates.
- **Returns FAQ**: 30-day refund policies, conditions, and process.
- **Pricing FAQ**: Standard monthly tiers, annual discounts, and trial details.
- **Integrations FAQ**: Platforms supported including WhatsApp Business API, Facebook Messenger, Instagram, and Shopify.
- **Support Hours FAQ**: Operational schedules (Mon-Fri) and backup live support.

---

## 6. Running Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Step-by-Step Instructions

1. **Install Dependencies**
   From the root folder, run:
   ```bash
   npm run install:all
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env` in `spurdesk-api/`:
     ```bash
     cd spurdesk-api
     cp .env.example .env
     ```
     Configure your API keys in the generated `.env` file.
   - Copy `.env.example` to `.env` in `spurdesk-web/`:
     ```bash
     cd ../spurdesk-web
     cp .env.example .env
     cd ..
     ```

3. **Migrate & Seed the Database**
   Initialize SQLite database and seed FAQ items:
   ```bash
   cd spurdesk-api
   npx prisma migrate dev --name init
   npx prisma db seed
   cd ..
   ```

4. **Start Dev Environment**
   Run the concurrent server runner:
   ```bash
   npm run dev
   ```
   - Web App: [http://localhost:3000](http://localhost:3000)
   - API Backend: [http://localhost:3001](http://localhost:3001)

---

## 7. Environment Variables

### Backend (`spurdesk-api/.env`)
* **`GEMINI_API_KEY`**: (Optional) API key for Google Gemini model access.
* **`OPENAI_API_KEY`**: (Optional) API key for OpenAI model access.
* **`ANTHROPIC_API_KEY`**: (Optional) API key for Anthropic Claude model access.
* **`LLM_PROVIDER`**: Override provider to force a vendor choice (`gemini` | `openai` | `anthropic`). If unset, `ProviderFactory` auto-detects based on available keys.
* **`DATABASE_URL`**: DB connection URL (Default: `file:./dev.db` for SQLite).
* **`REDIS_URL`**: Redis connection URL (Default: `redis://localhost:6379` - falls back to in-memory if unreachable).
* **`PORT`**: Backend server port (Default: `3001`).

### Frontend (`spurdesk-web/.env`)
* **`NEXT_PUBLIC_API_URL`**: Base backend API url (Default: `http://localhost:3001/api`).

---

## 8. API Endpoints

### 1. `POST /api/chat/message`
Submit a support message to the AI agent. If validation passes (whitespace trimmed, message length ≤ 2000 characters), the pipeline resolves the query.
* **Request Example**:
  ```json
  {
    "message": "What are your pricing plans?",
    "sessionId": "a7a7c950-cb9f-44d4-bc48-ff9472b6066d"
  }
  ```
* **Response Example**:
  ```json
  {
    "reply": "Spur offers three main plans: Starter ($29/mo), Growth ($79/mo), and Scale ($199/mo). If billed annually, you receive a 20% discount.",
    "sessionId": "a7a7c950-cb9f-44d4-bc48-ff9472b6066d",
    "conversationTitle": "What are your pricing plans?"
  }
  ```

### 2. `GET /api/chat/history/:sessionId`
Fetch previous messages for a specific conversation session.

### 3. `GET /api/chat/conversations`
Fetch all previous conversation sessions.

---

## 9. Architecture & Design Decisions

### Request Pipeline Flow
```
Client ──► POST /chat/message ──► ChatController ──► ConversationService ──► KnowledgeService ──► ProviderFactory ──► OpenAI / Claude / Gemini ──► Prisma ──► SQLite
```

### 1. Repository & Service Pattern
We isolated the database layer (`ChatRepository`) from the business logic (`ConversationService` & `KnowledgeService`) and request handlers (`ChatController`). This separation of concerns keeps controllers thin and routing definitions isolated from core application state.

### 2. Decoupled Swappable Providers (Why `ProviderFactory`?)
We defined an `LLMProvider` interface to decouple the chat controller and conversation service from the underlying LLM provider SDK. The `ProviderFactory` decouples LLM vendors from business logic, allowing OpenAI, Claude, or Gemini to be swapped dynamically without changing conversation orchestration or database interfaces. It resolves which provider to load based on either active key detection in `.env` or the `LLM_PROVIDER` override config.

### 3. Dynamic Database-Driven FAQs
Instead of hardcoding store policies in the LLM system prompt, we query the `KnowledgeBase` table for records containing matching keywords. This allows administrators to update store policies dynamically via seed scripts or database dashboards without modifying prompts or redeploying code.

### 4. Fail-Safe Cache Strategy
The `CacheService` caches query-matching keywords for 5 minutes. If local Redis is unavailable (e.g. not running during reviewer local evaluation), it gracefully **falls back to a local in-memory Map** to prevent crashes.

### 5. Automatic Retry Mechanism
To mitigate transient API rate-limit overloads or network timeouts (especially on Gemini's free tier), the LLM providers execute within a custom backoff retry wrapper (up to 4 attempts) ensuring high availability.

### 6. Local Title Derivation
We derive session titles locally using `message.trim().slice(0, 40)`. This saves a high-latency LLM API call on first-load, improving response times.

---

## 10. Prompt Design & LLM Notes
The backend constructs Gemini input as follows:
- **System Instruction**: Configures the agent's support persona, limits instructions to the retrieved FAQ context, and enforces guardrails (e.g. do not invent policies).
- **History Context**: Loads up to the last 10 messages in chronological order, mapping roles between `user` and `model` (Gemini API format).
- **User Prompt**: Appends the latest customer query as the target message.

---

## 11. Tradeoffs
- **SQLite for Local Dev**: We chose SQLite to give reviewers an instant dev environment. Switching to PostgreSQL for production is straightforward and only requires changing the datasource provider string in `schema.prisma`.
- **Simple Keyword Substring Matching**: We check keywords using `toLowerCase().includes()`. While simple, it executes fast and avoids the overhead of setting up a local vector DB index for a 5-entry FAQ set.

---

## 12. Future Improvements ("If I had more time...")
- **Streaming Responses**: Deliver AI text tokens in real-time as they generate to reduce perceived user latency.
- **Semantic Retrieval with Embeddings (RAG)**: Swap keyword matching for a vector database (e.g. pgvector) to retrieve accurate policies even with synonyms.
- **Redis Distributed Cache**: Scale session data and rate limits across horizontally scaled server instances in production.
- **Rate Limiting per Session**: Limit queries per sessionId to prevent malicious API budget drain.
- **Conversation Summarization**: Summarize history beyond 15 messages to conserve token context limits.
- **Citation-Aware RAG**: Inline links to sources/policies inside AI answers to improve user transparency.
- **Better Observability**: Integrate tools like OpenTelemetry or LangSmith to trace latency, cost, and response quality.
