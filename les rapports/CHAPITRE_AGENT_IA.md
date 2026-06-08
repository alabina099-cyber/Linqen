# Chapter: AI Agent — Autonomous LinkedIn Prospecting Engine

## Intelligent Automation with Human-in-the-Loop Control

---

## 1. Introduction and Objectives

The AI Agent is the **cognitive core** of the Qlinqen platform. Its mission is to transform natural language instructions into concrete, measurable LinkedIn prospecting actions — while maintaining absolute human control over every operation that affects a real professional identity on LinkedIn. Rather than a simple chatbot, the agent functions as an **autonomous decision-making engine** that reasons about objectives, selects appropriate strategies, composes personalized messages, and delegates execution to specialized subsystems, all under a strict approval workflow that prevents any unintended action.

### 1.1 Problem Statement

Manual LinkedIn prospecting suffers from three fundamental inefficiencies: it is **time-intensive** (a single personalized outreach sequence can consume 15-20 minutes per prospect), **inconsistent** (message quality degrades with volume and fatigue), and **risk-exposed** (aggressive automation triggers LinkedIn account restrictions). A naive bot that sends messages autonomously would violate LinkedIn's Terms of Service and expose the user's professional reputation. The challenge, therefore, was to build an intelligent agent that preserves the **quality of human-crafted outreach** while delivering the **scalability of automation** — without ever bypassing human judgment on actions that affect the user's real LinkedIn presence.

### 1.2 Objectives Achieved

The AI Agent module addresses these challenges through four integrated capabilities: a **conversational command interface** that interprets natural language objectives and translates them into structured action plans; an **autonomous reasoning loop** powered by a large language model (LLM) with tool-calling capability, enabling multi-step planning and adaptive behavior; a **comprehensive tool ecosystem** spanning LinkedIn search, profile analysis, message generation, connection requests, campaign management, and database operations; a **compliance and safety layer** enforcing LinkedIn rate limits (daily, hourly, and inter-action delays) and an obligatory human approval gate before any external action; and a **real-time activity monitoring system** that surfaces every pending, approved, executing, and completed action in a unified timeline with full contextual detail.

---

## 2. Technical Architecture of the AI Agent

### 2.1 Architectural Overview

The AI Agent follows a **three-tier agentic architecture** that separates reasoning, action planning, and physical execution:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│                                                             │
│  AgentChat.tsx (Conversational Interface)                   │
│   ├── Chat thread with persisted conversation history       │
│   ├── Real-time activity feed (polling 4s)                │
│   ├── Suggestion chips for common intents                 │
│   ├── Action controls (Approve / Reject / Stop / Retry)     │
│   └── Conversation history sidebar                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (Next.js API Routes)
┌──────────────────────▼──────────────────────────────────────┐
│                   ORCHESTRATION LAYER                       │
│                                                             │
│  POST /api/agent/chat                                       │
│   ├── Zod validation + user authentication                  │
│   ├── Settings enrichment (model, tone, language)         │
│   ├── LangChain agent with tool binding (max 6 rounds)    │
│   ├── History persistence (agent_chat_history table)        │
│   └── Tool step audit trail (agent_tool_steps table)        │
│                                                             │
│  GET /api/agent/activity                                    │
│   ├── Parallel SQL queries (actions + followups +         │
│   │   campaigns + tool_steps + stats)                       │
│   └── Unified timeline with 4 entity types                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ PostgreSQL + Chrome Extension / Worker
┌──────────────────────▼──────────────────────────────────────┐
│                   EXECUTION LAYER                           │
│                                                             │
│  LinkedIn Actions Queue (linkedin_actions_queue)            │
│   ├── Status lifecycle: pending_approval → approved →       │
│   │   processing → completed / failed / rejected / stopped  │
│   ├── Rate-limiter: daily + hourly + delay gates            │
│   ├── Duplicate prevention (1-hour window)                    │
│   └── Scope isolation (admin sees team, member sees own)    │
│                                                             │
│  Execution Engines:                                         │
│   ├── Chrome Extension (content.js + background.js)         │
│   └── Puppeteer Worker (linkedin-agent-worker/ — Docker)    │
│                                                             │
│  Tool Registry (16 tools across 5 categories):              │
│   ├── LinkedIn Actions (search, visit, connect, message)    │
│   ├── Intelligence (analyze, generate_message, strategy)    │
│   ├── Database (search_db, save_prospect, stats)            │
│   ├── Campaigns (create, update, execute)                   │
│   └── Compliance (rate_limits, network_check)             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Integrated AI Agent Tech Stack

**LLM & Reasoning Engine:** LangChain `ChatOpenAI` with native tool binding (`bindTools`), supporting model selection (default `gpt-4o-mini`, configurable per user). Multi-turn tool invocation loop with a hard cap of 6 rounds to prevent infinite loops.

**Tool Framework:** LangChain `DynamicStructuredTool` with Zod schema validation for every tool. Each tool declares its name, description, parameter schema, and execution function — enabling the LLM to make informed decisions about which tool to call and with what arguments.

**Frontend Interface:** React/Next.js conversational UI with Framer Motion animations, real-time 4-second polling for activity updates, rapid 2-second polling after action mutations, and a split-pane layout (chat + activity feed).

**Backend API:** Next.js App Router API routes with Zod request validation, JWT-based user authentication with role-based scope isolation, and parameterized PostgreSQL queries via `node-postgres`.

**Database & Persistence:** PostgreSQL (NeonDB) with three agent-specific tables: `agent_chat_history` (conversation messages with `user_id` isolation), `agent_tool_steps` (audit trail of every tool invocation), and `linkedin_actions_queue` (the action queue with full status lifecycle).

**Execution Engines:** Chrome Extension (`linkedin-chrome-extension/`) for in-browser execution using the active LinkedIn session, and Puppeteer Worker (`linkedin-agent-worker/`) as a Dockerized fallback with anti-detection measures.

### 2.3 LangChain Tool-Calling Architecture

> **Key technical highlight to emphasize during the defense**

The agent implements a **multi-round tool-calling loop** using LangChain's native tool binding. When the user sends a message, the LLM receives the full conversation history plus a system prompt with six absolute rules and six defined workflows. The LLM can then decide to invoke one or more tools (parallel execution within a round), receive their results, and iterate up to a maximum of 6 rounds before returning a final response to the user.

**System Prompt Architecture:**

The system prompt (`@/lib/agent-config.ts:10-176`) encodes six absolute rules that constrain the LLM's behavior:

1. **All actions pass through the approval queue** — no direct execution.
2. **Mandatory tool usage** — the LLM must call a tool for any LinkedIn action; it is forbidden to simply display text instructions.
3. **Never ask for information** — the agent must be autonomous; if a name or URL is missing, it must use `linkedin_search` rather than request clarification.
4. **Never invent limits** — only the rate-limiter tool can reject an action; the LLM must always attempt the tool call.
5. **Multi-category separation** — when the user mentions multiple distinct groups (e.g., "ESIEA students and Phinia employees"), the agent must make separate `linkedin_search` calls for each category, since LinkedIn searches with AND logic, not OR.
6. **Always use tools, never display copy-paste text** — the agent must create queued actions, not provide text for manual copying.

**Tool Round Execution Flow:**

```
User message → LLM receives [system prompt + history + message]
    ↓
Round 0: LLM decides to call tool(s) → execute in parallel → collect results
    ↓
Round 1-5: If more reasoning needed → LLM receives tool results → may call more tools
    ↓
Final round: LLM returns text response (no tool calls) → save to history → return to user
```

**Safety Circuit Breakers:**

- **Max 6 tool rounds** per user message prevents runaway loops.
- **STOP_LOOP_TOOLS** (`linkedin_search`, `linkedin_send_message`, `linkedin_send_connection`, `bulk_send_messages`) terminate the loop immediately after successful action creation, since these produce queue entries that require human approval before physical execution.
- **History limit of 20 message pairs** (40 messages total) prevents context window exhaustion.
- **Graceful degradation** on API errors: invalid key → specific error message; model not found → specific error message; all other errors → generic fallback with HTTP 200 to preserve frontend state.

---

## 3. The 16-Tool Ecosystem

The agent exposes **16 specialized tools** organized into 5 functional categories. Each tool is a `DynamicStructuredTool` with a Zod schema that the LLM uses to understand required parameters and their types.

### 3.1 Category 1: LinkedIn Direct Actions

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `linkedin_search` | Search profiles + optionally prepare messages | keywords, role, location, network, message_template |
| `linkedin_visit_profile` | Visit a profile to extract public info | linkedin_url, prospect_name |
| `linkedin_send_connection` | Send connection request with note | linkedin_url, prospect_name, note (max 300 chars) |
| `linkedin_send_message` | Send direct message to a 1st-degree connection | linkedin_url, prospect_name, message, message_type |

**Smart URL Builder:** The `buildLinkedInSearchUrl` helper (`@/lib/tools.ts:814-848`) constructs proper LinkedIn search URLs by combining keywords, role, location, and network filters (F=1st degree, S=2nd degree, O=3rd degree+). Location is handled flexibly: numeric values are passed as `geoUrn` parameters, while text locations are folded into the keyword string for soft filtering.

**Anti-Duplication:** The `linkedin_send_message` tool checks for identical pending actions on the same target URL within a 1-hour window (`@/lib/tools.ts:196-215`), preventing accidental double-messaging of the same prospect.

### 3.2 Category 2: Intelligence & AI

| Tool | Purpose | Logic |
|------|---------|-------|
| `analyze_prospect` | Score a prospect's conversion potential | Heuristic scoring: +25 for C-level roles, +15 for mid-management, +15 for tech sector, +15 for ideal company size (11-200 employees). Score range 0-100. |
| `generate_message` | Return message structure guidelines | Returns structure, max length, and tips per message type (connection, followup, response, relance). |
| `suggest_strategy` | Propose a full outreach sequence | Returns a 5-day sequence (connection → profile visit → message 1 → message 2 → final followup) with estimated conversion rates. |

### 3.3 Category 3: Database Operations

| Tool | Purpose |
|------|---------|
| `search_prospects_db` | Query local prospects with filters (industry, role, location, status, min_score) |
| `save_prospect` | Insert or upsert a prospect (ON CONFLICT on linkedin_url) |
| `get_campaign_stats` | Retrieve campaign-level or global statistics |
| `schedule_followup` | Plan a delayed message (J+3, J+7, J+14) in the `scheduled_followups` table |

### 3.4 Category 4: Campaign Management

| Tool | Purpose |
|------|---------|
| `create_campaign` | Create a campaign in `draft` status with targeting criteria and message templates |
| `update_campaign` | Update status, contacted/replied/converted counts |
| `execute_campaign` | Launch campaign: creates a `search_and_connection` or `search_and_message` action in `pending_approval`; auto-activates upon human approval |

### 3.5 Category 5: Compliance & Workflow

| Tool | Purpose |
|------|---------|
| `get_rate_limits` | Return real-time quota status for all 5 action types |
| `check_network_connections` | Verify 1st-degree connection status for a list of prospects via Chrome Extension |
| `get_connection_results` | Retrieve the results of a network check after execution |
| `get_search_results` | Fetch completed search results (profiles found, saved to DB) |
| `bulk_send_messages` | Create multiple `send_message` actions in one command, with template variable substitution (`{name}`, `{role}`, `{company}`) |

---

## 4. Compliance Layer: LinkedIn Rate Limiting

### 4.1 Three-Gate Protection System

The rate limiter (`@/lib/rate-limiter.ts`) implements a **defense-in-depth** approach with three independent gates that must all pass before an action can be queued:

**Gate 1 — Daily Limit:** Counts `completed` actions of the same type with `executed_at >= CURRENT_DATE`. If the count reaches the configured daily maximum, the action is blocked with a message indicating the reset time (midnight).

**Gate 2 — Hourly Limit:** Counts `completed` actions of the same type with `executed_at >= NOW() - INTERVAL '1 hour'`. If the hourly ceiling is reached, the system calculates the next available slot based on the oldest action in the current hour window.

**Gate 3 — Inter-Action Delay:** Measures the elapsed time since the last completed action of the same type using SQL-native `EXTRACT(EPOCH FROM (NOW() - executed_at))`. If the minimum delay (e.g., 90 seconds for messages, 2 minutes for connections) has not been respected, the action is deferred.

### 4.2 Conservative LinkedIn Limits

The limits are intentionally conservative to protect the user's LinkedIn account reputation, especially for accounts under 6 months old:

| Action | Daily Max | Hourly Max | Minimum Delay |
|--------|-----------|------------|---------------|
| Connections | 20 | 5 | 2 minutes |
| Messages | 30 | 8 | 90 seconds |
| Profile Visits | 50 | 15 | 20 seconds |
| Searches | 25 | ~3 | 45 seconds |
| Follow-ups | 20 | ~3 | 10 seconds |

> **Key strength:** The rate limiter queries `executed_at` (the actual execution timestamp) rather than `created_at` (when the action was queued). This ensures that limits reflect real LinkedIn activity, not merely queued intentions — a critical distinction for account safety.

---

## 5. Execution Layer: Two Engines, One Queue

### 5.1 The Approval Queue as Central Hub

All LinkedIn actions flow through a single queue table (`linkedin_actions_queue`) with a strict status lifecycle:

```
[pending_approval] → user clicks APPROVE → [approved]
                                           ↓
                 worker claims via SELECT ... FOR UPDATE SKIP LOCKED
                                           ↓
                                     [processing] → Chrome Extension or Puppeteer executes
                                           ↓
                              [completed] ←── success
                              [failed] ←───── error
                              [rejected] ←── user clicks REJECT
                              [stopped] ←─── user clicks STOP during processing
```

**Concurrency Safety:** The worker uses `SELECT ... FOR UPDATE SKIP LOCKED` (`@/linkedin-agent-worker/src/queue.ts:27-42`) to atomically claim the next approved action. This PostgreSQL feature ensures that multiple workers can poll the same queue without race conditions — skipped locks allow workers to immediately move to the next available row instead of blocking on rows already claimed by other workers.

**Recovery Loop:** Every 60 seconds, the worker releases actions stuck in `processing` for more than 5 minutes (`@/linkedin-agent-worker/src/queue.ts:93-104`), handling worker crashes gracefully without losing actions.

### 5.2 Chrome Extension Execution

The Chrome Extension (`linkedin-chrome-extension/`) is the **primary execution engine**. It operates within the user's authenticated LinkedIn session, requiring no stored credentials. The extension popup provides real-time connectivity status (backend + LinkedIn), a daily summary of actions, and recent activity. When an action is approved, the worker or frontend signals the extension, which executes the action directly on the active LinkedIn tab using DOM manipulation.

### 5.3 Puppeteer Worker Fallback

The Dockerized Puppeteer worker (`linkedin-agent-worker/`) serves as a **reliable fallback** when the Chrome Extension is unavailable. Key anti-detection measures include:

- **Shared browser instance** reused up to 20 times, then restarted to prevent memory leaks.
- **Human-like User-Agent** (`Mozilla/5.0 Windows NT 10.0 Chrome/124.0.0.0`).
- **Resource blocking** — images, stylesheets, fonts, and media are intercepted and aborted to reduce fingerprinting surface.
- **Human behavior simulation** — randomized scroll amounts (100-400px), variable typing delays (30-80ms per character), and natural pauses between actions.
- **Multi-selector fallback strategy** — each action tries 5-7 different CSS selectors plus a DOM text-content fallback, resilient to LinkedIn UI changes.
- **Graceful shutdown** — handles `SIGTERM`, `SIGINT`, uncaught exceptions, and unhandled rejections with proper cleanup of browser and database pool.
- **Consecutive error back-off** — after 10 consecutive errors, the worker pauses for 60 seconds before resuming.

### 5.4 Action Implementations

**Connection Request (`@/linkedin-agent-worker/src/actions/connect.ts`):**
Navigates to the target profile, attempts multiple selectors for the "Connect" button (French and English labels, ARIA labels, data attributes), falls back to DOM text search, handles the "Add a note" modal if a personalized note is provided, clicks send through multiple selector fallbacks, and detects LinkedIn rate-limit messages in the page body.

**Direct Message (`@/linkedin-agent-worker/src/actions/message.ts`):**
Navigates to the profile, clicks the Message button through multiple selector strategies, finds the chat input field (contenteditable divs or textarea), types the message with human-like delays, and sends via button click or `Ctrl+Enter` fallback.

**Profile Visit (`@/linkedin-agent-worker/src/actions/visit.ts`):**
Navigates to the profile, scrolls twice to trigger lazy-loaded content, and extracts name, role, company, and location using a cascading priority of 4-7 selectors per field. Returns the structured profile data in the action result.

---

## 6. Frontend: AgentChat Interface

### 6.1 Conversational Interface

The `AgentChat.tsx` component (`@/components/AgentChat.tsx`) provides a **split-pane chat interface** with the conversation thread on the left and a real-time activity panel on the right.

**Chat Thread Features:**
- **Animated message bubbles** with Framer Motion (fade-in + slide-up, 250ms transitions).
- **Role-differentiated styling** — user messages in blue gradient with white text, assistant messages in white with slate border.
- **Typing indicator** with animated spinner during LLM processing.
- **Auto-scroll** to the latest message.
- **Quick suggestion chips** ("Créer une campagne", "Rédiger un message", "Analyser mes stats") visible when the conversation is empty.
- **Keyboard support** — Enter to send, auto-focus on input.

### 6.2 Activity Feed Panel

The right panel toggles between two views: **Actions** and **History**.

**Actions View:** Displays a unified timeline of four entity types (`linkedin_action`, `followup`, `campaign`, `tool_step`), each rendered as a card with:
- **Icon and color-coded badge** based on action type and status.
- **Contextual action buttons** — Approve/Reject for pending items, Stop for approved/processing items, Continue for stopped items, Retry for failed/rejected items.
- **Detail blocks** showing payload excerpts (keywords, message previews, target names).
- **Timestamps** with "time ago" formatting and execution dates.
- **Deduplication logic** — tool steps that correspond to real queued actions are hidden to avoid visual duplication.

**History View:** Lists all past conversations with first message preview, date, message count, and one-click deletion with a confirmation modal.

### 6.3 Real-Time Polling Strategy

The component implements a **two-speed polling strategy**:
- **Standard polling:** Every 4 seconds for the activity feed during normal operation.
- **Rapid polling:** Every 2 seconds for 30 seconds (15 rounds) after any mutation (approve, retry, stop, continue), ensuring immediate visual feedback on status changes without constant load.

---

## 7. Security and Data Isolation

### 7.1 Conversation Scope Isolation

Conversations are strictly isolated by `user_id`. The `GET /api/agent/chat` endpoint uses a **scope clause** that filters based on the user's role:
- **Administrators** see their own conversations plus all team members' conversations (`user_id = ANY($1) OR user_id IS NULL` for legacy data).
- **Members** see only their own conversations (`user_id = ANY($1)`).

Before returning messages for a specific `conversationId`, the API verifies ownership by checking the `user_id` associated with that conversation's history records. Unauthorized access returns HTTP 403.

### 7.2 API Key Protection

The OpenAI API key is stored exclusively in `.env.local` (never hardcoded). The chat route validates its presence before invoking the LLM and returns a clear error message if missing. The key is never logged, transmitted to the frontend, or included in error responses.

### 7.3 SQL Injection Prevention

All database queries use positional parameters (`$1`, `$2`, etc.) via `node-postgres`. The `search_prospects_db` tool uses parameterized `ILIKE` clauses with `%` wildcards safely bound as values, not concatenated into SQL strings.

---

## 8. Key Strengths Summary for the Defense

The AI Agent module presents three categories of strength for the jury.

**On Technical Originality:** The **LangChain tool-calling loop with circuit breakers** is a genuine agentic architecture — not a simple single-prompt response, but a multi-round reasoning system where the LLM plans, executes tools, observes results, and iterates. The **16-tool ecosystem** covers the full prospecting spectrum from search to campaign execution with a unified interface. The **human-in-the-loop approval queue** is architecturally central, not an afterthought — every external action requires explicit human validation, making the system safe by design. The **three-gate rate limiter** (daily + hourly + delay) protects the user's LinkedIn account reputation with conservative, research-backed thresholds. The **dual execution engine** (Chrome Extension primary + Puppeteer fallback) provides operational resilience.

**On Implementation Quality:** The system prompt encodes **six absolute rules** that constrain the LLM's behavior deterministically, reducing hallucination and ensuring consistent tool usage. **Anti-duplication logic** prevents double-messaging. **Graceful error handling** with specific error messages for API key and model issues. **Real-time activity monitoring** with contextual action controls. **Conversation persistence** with full history restoration for resumed sessions. **Zod schema validation** on every API request. **Parameterized SQL** throughout.

**On Business Value:** The agent transforms natural language instructions into queued actions — a user can say "contact 10 software engineers in Paris" and the agent will autonomously plan the search, compose a personalized message, create the queued action, and report back with an approval link. The **prospect scoring heuristic** provides immediate ICP qualification without external data costs. The **automated campaign lifecycle** (create → execute → auto-activate on approval) reduces campaign setup from 30 minutes to a single sentence. The **message template system** with variable substitution (`{name}`, `{role}`, `{company}`) enables scalable personalization.

---

## 9. Complete Screenshot Guide

### Recommended screenshot order

| # | Component | What to Show | Placement in Report |
|---|-----------|-------------|---------------------|
| 1 | **AgentChat full view** | Split pane: chat thread + activity feed | Module overview section |
| 2 | **Welcome message + suggestions** | Chat with 3 suggestion chips visible | Conversational interface section |
| 3 | **User message + assistant response** | Animated bubbles with distinct styling | Chat thread section |
| 4 | **Activity feed — pending action** | Action card with Approve/Reject buttons | Human-in-the-Loop section |
| 5 | **Activity feed — completed action** | Blue badge with execution timestamp | Execution layer section |
| 6 | **Conversation history sidebar** | List of past conversations with dates | Persistence section |
| 7 | **Delete confirmation modal** | Modal with warning and cancel/confirm | UX safety section |
| 8 | **Rate limit tool result** | Formatted quota status in chat | Compliance section |
| 9 | **Tool step audit trail** | Card showing tool name, args, result | Transparency section |
| 10 | **Campaign creation via chat** | User saying "create a campaign" and agent creating it | Autonomy section |

### Screenshot tips

- Use a **real conversation** with at least 3-4 turns to demonstrate the multi-round reasoning.
- Show an action in **pending_approval** state with the Approve button visible.
- Show the same action after approval in **completed** state.
- Include the **activity feed** showing multiple entity types (action, campaign, tool_step).
- Take screenshots in **full-screen** mode for best resolution.

---

_Document prepared for the Final Year Project (PFE) Report — AI Agent Module_
_Project: AI-Powered LinkedIn Prospecting Agent — Qlinqen Platform_
