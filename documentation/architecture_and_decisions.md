# SpurDesk - Technical Architecture & Engineering Decisions Documentation

This document provides a comprehensive, end-to-end overview of the logic, architectural layers, design patterns, operational choices, and future scalability roadmap implemented in **SpurDesk**.

---

## 1. System Architecture Overview

SpurDesk is structured as a decoupled monorepo, keeping the backend API (`spurdesk-api`) and frontend web application (`spurdesk-web`) isolated. This separation makes it straightforward to scale and adapt:
- Changing the frontend framework or deploying it to a CDN (e.g. Vercel) does not affect the core backend.
- The backend API can be deployed independently (e.g. Render/AWS) and scale horizontally.
- The system design supports adding alternative frontend client channels (such as WhatsApp, Instagram, or Facebook DMs) by integrating new routes that interface directly with the same underlying service layer.

### High-Level Architecture Diagram
```
                     ┌────────────────────────┐
                     │   Next.js Frontend     │
                     │    (Spur Brand UI)     │
                     └───────────┬────────────┘
                                 │
                                 │ HTTP POST /chat/message
                                 ▼
                     ┌────────────────────────┐
                     │    Express Server      │
                     │ (Validation & Logging) │
                     └───────────┬────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │    ChatController      │
                     └───────────┬────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │  ConversationService   │
                     └─────┬───────────┬──────┘
                           │           │
         Get FAQ Context   │           │ Generate Chat Response
    ┌──────────────────────┘           └──────────────────────┐
    ▼                                                         ▼
┌────────────────────────┐                               ┌────────────────────────┐
│    KnowledgeService    │                               │   GeminiProvider       │
└──────────┬─────────────┘                               │  (LLMProvider Class)   │
           │                                             └───────────┬────────────┘
           ├──────────────────────┐                                  │
           │ Cache HIT            │ Cache MISS                       │ generateReply()
           ▼                      ▼                                  ▼
┌────────────────────┐  ┌────────────────────┐           ┌────────────────────────┐
│    CacheService    │  │   ChatRepository   │           │    Google Gemini API   │
│   (Redis / Map)    │  │  (Prisma / SQLite) │           │     (v1beta / v1)      │
└────────────────────┘  └────────────────────┘           └────────────────────────┘
```

---

## 2. Request Processing & Data Pipeline

When a user submits a support message, the backend processes the request through the following sequence:

1. **Request Validation**: Express route receives the body and parses it using **Zod**. If validation fails (e.g. empty message or message > 2000 characters), it throws a `400 Bad Request` immediately.
2. **Operational Log & Tracing**: A global `requestLogger` middleware generates a unique `requestId` (UUID) for the request, logging the start timestamp and session identifier.
3. **Session Check**: `ConversationService` queries the database via `ChatRepository`. If the client did not provide a `sessionId` or if the session ID does not exist:
   - A new conversation record is created in the database.
   - The session title is derived locally from the first 40 characters of the user's message.
4. **FAQ Context Lookup**: `KnowledgeService` is invoked to retrieve store policies matching the user query:
   - The service formats the query to lowercase and checks if it contains any comma-separated keywords defined in the FAQ database records.
   - It queries `CacheService` (using the query string as a key).
   - **Cache HIT**: Matched FAQ text is returned immediately from the cache, bypassing SQLite queries.
   - **Cache MISS**: Queries the `KnowledgeBase` database table, constructs the matched FAQ context string, and stores it in the cache (5-minute TTL).
5. **Context & History Construction**: The service loads up to the last 10 messages from the database for the active session. It builds a system prompt containing the matched FAQ entries, and appends the conversation history mapped to the format required by the LLM SDK.
6. **AI Response Generation**: The LLM Provider is called to generate the text.
   - The call is executed with an **automatic retry wrapper**. If the API throws a transient `503 Service Unavailable` or `429 Rate Limit` error, the provider catches the error, delays execution, and retries up to 3 times before failing.
7. **Database Persistence**: The user message and the generated AI reply are saved in the SQLite database to maintain chronological consistency.
8. **Client Response**: The backend returns the reply, the sessionId, and the conversation title to the Next.js client, logging the total execution time of the request.

---

## 3. Detailed Logic & Core Modules

### A. Extensible LLM Provider (`src/providers/` & `src/types/`)
Rather than calling generative models directly inside routes, we defined an `LLMProvider` interface:
```typescript
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  generateReply(messages: LLMMessage[]): Promise<string>;
}
```
This abstraction isolates generation details. We have fully implemented three concrete provider classes:
- `GeminiProvider`: Connects to Google's Generative AI SDK (Default).
- `OpenAIProvider`: Integrates with OpenAI's Chat Completions endpoint (`gpt-4o-mini`, etc.) using native Node `fetch`.
- `AnthropicProvider`: Connects to Anthropic's Message API (`claude-3-5-sonnet-latest`, etc.) using native Node `fetch`.

We also implemented a `ProviderFactory` class that intercepts route initialization. The `ProviderFactory` decouples LLM vendors from business logic, allowing OpenAI, Claude, or Gemini to be swapped dynamically without changing conversation orchestration or database interfaces. It resolves which provider to load based on either active key detection in `.env` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`) or the `LLM_PROVIDER` override config.

### B. Fail-Safe Cache Service (`src/services/cacheService.ts`)
To implement caching without creating setup friction for reviewers, `CacheService` acts as a fail-safe wrapper:
- It attempts to establish a connection to Redis using the `REDIS_URL` environmental variable.
- It registers error and readiness listeners on the Redis client.
- **Fail-Safe Fallback**: If connection fails (e.g. the reviewer does not run a local Redis service), the catch block initializes a standard JavaScript `Map` inside the memory stack. All subsequent `get` and `set` operations route to this in-memory fallback cache.
- This satisfies the "nice-to-have" caching criteria in production while remaining zero-configuration for local evaluations.

### C. Knowledge Service & Prompt Guardrails (`src/services/knowledgeService.ts`)
We chose a database-driven approach for domain knowledge:
- FAQs are seeded into the database, keeping policy definitions separated from code.
- Matched policies are dynamically injected into the system prompt:
  ```
  ONLY use the verified store policies provided above to answer policy-related questions. 
  If the policy is NOT in the facts above, politely tell them: "I don't have that information on hand, but I will check with my team..."
  Do NOT make up, invent, or hallucinate store policies under any circumstances.
  ```
- This strict prompting ensures high answer reliability.

---

## 4. UI/UX Brand Decisions

Instead of a generic dark-themed layout, we aligned the application UI directly with Spur's official branding to showcase attention to product details:
- **Spur Electric Blue Theme**: Used Spur's cobalt blue (`#0f62fe`) for AI message bubbles, header status indicators, and call-to-action buttons.
- **Dynamic Blended Logo**: Embedded Spur's custom logo (a shopping bag smile shaped like a chat bubble) as a vector SVG component.
- **Clean Message Bubbles**: Styled user messages as white bubbles with thin grey borders to match Spur's landing page demonstrations, while AI suggestions are presented in high-contrast blue.
- **Persistent Sidebar Selector**: Enables the client to retrieve the user's active session history, showing title updates in real-time and allowing session switching without losing previous data.
- **Cursor Pointers**: Styled all interactive buttons, card selectors, and hamburger toggles with pointer icons (`cursor-pointer`) to make the interface feel responsive and alive.

---

## 5. Robustness & Fault Tolerance

The platform is designed to be resilient against common real-world failures:

| Failure Mode | Guardrail / Defense |
|--------------|---------------------|
| **Empty Inputs** | Enforced by Zod validation on the backend and disabled HTML button states on the client. |
| **Spam / Long Inputs** | Truncated and validated up to 2000 characters to prevent API token inflation and DB bloat. |
| **API Port Conflicts** | Handled by stopping running node processes using PID matching or port-killing utilities. |
| **LLM Key Misconfiguration** | Catches 404/401 errors, logs tracing details, and returns a friendly error banner without crashing the server. |
| **Transient 503 / 429 Errors** | Standard API overload errors are bypassed via automatic exponential backoff retries (3 attempts). |
| **Database Connection Lost** | Prisma query handlers throw clean errors, caught by `errorHandler` middleware returning a `500 Internal Server Error` with `requestId`. |
| **Page Refresh** | The frontend uses `localStorage` to persist `sessionId`, fetching history from the database on mount to restore the view. |

---
## 6. Engineering Roadmap & Future Enhancements (With More Time)

If we had more time to build this into a live enterprise customer platform for Spur, we would prioritize the following engineering tasks:

### A. Core Architecture & AI Enhancements
1. **Semantic Vector Search (RAG)**:
   Migrate keyword-based FAQ lookups to a semantic vector database (such as PostgreSQL with `pgvector` or Pinecone). This would allow the AI assistant to fetch accurate policy records or pricing details even if the user uses synonyms or different terminology (e.g., "how much does it cost" vs "subscription tiers") without needing exact keyword matches.
2. **Actionable AI (Gemini Function Calling)**:
   Extend the `LLMProvider` interface to support native tool calling. This would let the agent detect transactional intent (e.g. check shipping status, process refund, or check calendar availability) and call backend APIs like `checkShopifyOrder(orderId)` or `getCalendlySlots()` dynamically.
3. **Specialized Multi-Agent Orchestration**:
   Instead of a single monolith agent handling general queries, implement a multi-agent system. An intent router would triage requests and delegate to specialized subagents (e.g. *Sales Agent* trained on pricing and tools, *Technical Support Agent* trained on platform APIs, *Mock Store Agent* for simulating client stores).
4. **Context Summary & Token Optimizations**:
   Add a background queue worker to summarize old conversation segments once history exceeds 15 messages. This summary would be injected into the system instruction, allowing us to truncate long historical logs and keep input token sizes (and API latency) small.
5. **Real-time Web Scraper & Sync Workers**:
   Build an automated background sync process. Instead of seeding static pricing tables, the worker would periodically crawl the live Spur website and free tools directory, extract updated details, generate vector embeddings, and refresh the knowledge base dynamically.

### B. Scalability & Channels
1. **Multi-Channel Webhook Adapters**:
   Build webhook adapters for WhatsApp, Instagram, and Facebook Messenger. These would capture incoming JSON payloads, normalize them into the unified `Message` schema, route them to `ConversationService`, and transmit AI replies back to Facebook's Graph API.
2. **Distributed Caching & Rate Limiting**:
   Switch the backend rate limiter from in-memory to Redis-backed rate limiting. Additionally, scale the caching service horizontally by using distributed Redis clusters to support active nodes behind a load balancer.
3. **Enterprise Ticketing & human handover**:
   Add ticket state models (`open`, `snoozed`, `resolved`) and implement an automated human escalation process. If the AI agent fails to resolve an issue or if sentiment analysis indicates customer frustration, the system will trigger a high-priority WebSocket notification to human agents for live takeover.
