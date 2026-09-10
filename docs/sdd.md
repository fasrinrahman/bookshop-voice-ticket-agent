# System Design Document (SDD)

## Bookshop Voice Ticket Agent (BVTA)

**Version:** 1.0
**Companion to:** SRS v1.0
**Audience:** Developer, architect, reviewers

---

## 1. Design Overview

### 1.1 Design Goals

| Goal | Design Decision |
|------|----------------|
| Zero cost | Browser-based voice, free AI tier, free hosting |
| Low latency | Streaming pipeline, WebSocket push, edge CDN |
| Simple to operate | Single backend, single database, no queues |
| Beginner-friendly | Modular monolith, TypeScript end-to-end |
| Privacy-respecting | No raw audio leaves browser |
| Real-time feel | Socket.io over REST polling |

### 1.2 Design Principles

1. **Browser does the heavy lifting** for audio (no server cost)
2. **Server is a thin, secure proxy** for AI + real-time state
3. **Everything is a ticket** — single source of truth
4. **Fail open to text** — if voice fails, text input always works
5. **Idempotent operations** — retries never duplicate tickets

### 1.3 Architectural Style

**Modular Monolith** — one deployable backend, internally split into modules (auth, chat, tickets, notifications, ai). Chosen over microservices because:
- Free-tier hosting can't run 5 services
- Beginner-friendly (single repo, single deploy)
- Can be split later if needed

---

## 2. High-Level Architecture

### 2.1 System Context Diagram

```
┌──────────────┐                          ┌─────────────────┐
│  CUSTOMER    │                          │  ADMIN/MANAGER  │
│  (Mobile/PC) │                          │  (PC/Tablet)    │
└──────┬───────┘                          └────────┬────────┘
       │                                           │
       │ Voice + Text                              │ Dashboard + Alerts
       │                                           │
       ▼                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BVTA WEB APPLICATION                     │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │  Customer Interface │    │   Admin Interface        │   │
│  └─────────────────────┘    └──────────────────────────┘   │
└─────────┬───────────────────────────────┬───────────────────┘
          │                               │
          │ HTTPS/WSS                     │ HTTPS/WSS
          ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   BVTA BACKEND (Node.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │   Auth   │ │   Chat   │ │ Tickets  │ │ Notifications │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────────────┐  ┌────────────────────────────┐  │
│  │   AI Orchestrator    │  │   Socket.io Server         │  │
│  └──────────────────────┘  └────────────────────────────┘  │
└────┬──────────────┬───────────────┬──────────────┬─────────┘
     │              │               │              │
     ▼              ▼               ▼              ▼
┌─────────┐   ┌──────────┐   ┌───────────┐  ┌───────────┐
│ MongoDB │   │ Gemini   │   │ Telegram  │  │ Browser   │
│ Atlas   │   │ API      │   │ Bot API   │  │ Push      │
└─────────┘   └──────────┘   └───────────┘  └───────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility | Owns |
|-----------|---------------|------|
| **Customer UI** | Voice capture, chat display | Session state |
| **Admin UI** | Ticket list, status updates | UI state |
| **Auth Module** | Login, JWT, roles | Sessions |
| **Chat Module** | Message handling, AI orchestration | Conversations |
| **Tickets Module** | CRUD, lifecycle | Ticket data |
| **Notifications Module** | Real-time push, Telegram | Alerts |
| **AI Orchestrator** | Prompting, extraction, fallback | AI calls |
| **Socket.io Server** | Real-time channel | Connections |
| **MongoDB** | Persistence | All data |

---

## 3. Detailed Component Design

### 3.1 Frontend Architecture

#### 3.1.1 Component Tree

```
App
├── Router
│   ├── /              → CustomerPage
│   │   ├── VoiceInput
│   │   ├── TextInput
│   │   ├── TranscriptView
│   │   ├── AIResponse
│   │   └── TicketConfirmation
│   │
│   ├── /admin/login   → LoginPage
│   │
│   └── /admin         → AdminDashboard (protected)
│       ├── NotificationBell
│       ├── TicketFilters
│       ├── TicketList
│       │   └── TicketCard
│       └── TicketDetailModal
│
└── Providers
    ├── QueryClientProvider
    ├── AuthProvider
    └── SocketProvider
```

#### 3.1.2 State Management

| State Type | Tool | Example |
|-----------|------|---------|
| Server state | React Query | Ticket list, ticket detail |
| Auth state | Context + localStorage | JWT, user role |
| Socket state | Context | Connection status |
| UI state | useState/useReducer | Modal open, filters |
| Voice state | Custom hook | Listening, transcript |

#### 3.1.3 Voice Pipeline (Browser)

```
User taps mic
     │
     ▼
┌──────────────────────┐
│ getUserMedia()       │  → Permission granted
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ SpeechRecognition    │  → Continuous mode
│ (webkitSpeechRec.)   │  → interimResults: true
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Interim transcript   │  → Display live
│ Final transcript     │  → Send to /api/chat
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ speechSynthesis      │  → Speak AI reply
└──────────────────────┘
```

**Key design choice:** No audio is sent to the server. Only the *text transcript* travels over the network. This eliminates:
- Audio storage costs
- Audio processing costs
- Privacy concerns
- Latency

#### 3.1.4 Language Handling

| Language | ASR | TTS | LLM |
|----------|-----|-----|-----|
| English | `en-US` | `en-US` | Gemini (native) |
| Sinhala | `si-LK` | `si-LK` | Gemini (prompt-guided) |
| Tamil | `ta-LK` | `ta-LK` | Gemini (prompt-guided) |

Fallback: if browser doesn't support `si-LK`, default to English.

### 3.2 Backend Architecture

#### 3.2.1 Module Structure

```
server/src/
├── index.ts                 # Bootstrap
├── config/
│   ├── env.ts               # Env validation
│   └── db.ts                # Mongo connection
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   └── auth.middleware.ts
│   ├── chat/
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── chat.routes.ts
│   ├── tickets/
│   │   ├── ticket.model.ts
│   │   ├── ticket.service.ts
│   │   ├── ticket.routes.ts
│   │   └── ticket.validation.ts
│   ├── ai/
│   │   ├── ai.client.ts     # Gemini wrapper
│   │   ├── prompts.ts       # All prompts in one place
│   │   └── ai.service.ts
│   └── notifications/
│       ├── socket.ts        # Socket.io server
│       ├── telegram.ts      # Telegram bot
│       └── notify.service.ts
├── shared/
│   ├── logger.ts
│   ├── errors.ts
│   └── types.ts
└── middleware/
    ├── rateLimiter.ts
    ├── errorHandler.ts
    └── requestLogger.ts
```

#### 3.2.2 Request Lifecycle (Chat Endpoint)

```
POST /api/chat  { message, sessionId, language }
   │
   ▼
[1] Rate limiter
   │  → 20 req/min per IP
   ▼
[2] Validation (Zod)
   │  → message length 1-500
   ▼
[3] Chat Controller
   │  → calls ChatService.process()
   ▼
[4] Chat Service
   │  ┌──────────────────────────────┐
   │  │ a. Save user message (memory)│
   │  │ b. Call AI Orchestrator      │
   │  │ c. If ticket → TicketService │
   │  │ d. Emit socket event         │
   │  │ e. Send Telegram alert       │
   │  │ f. Return reply + ticket     │
   │  └──────────────────────────────┘
   ▼
[5] Response { reply, ticket?, sessionId }
```

#### 3.2.3 AI Orchestrator Design

The AI Orchestrator is the **brain**. It handles 3 tasks:

| Task | Model | Prompt Strategy |
|------|-------|----------------|
| Intent extraction | Gemini 1.5 Flash | JSON mode, few-shot |
| Response generation | Gemini 1.5 Flash | Templated (fast) |
| Fallback chat | Gemini 1.5 Flash | General |

**Intent Extraction Contract:**

```typescript
Input:  { message: string, language: string }
Output: {
  isTicketRequest: boolean,
  bookTitle: string | null,
  requestType: 'printed_copy' | 'reservation' | 'inquiry' | null,
  customerName: string | null,
  customerPhone: string | null,
  confidence: number,   // 0-1
  language: string
}
```

**Confidence Handling:**

| Confidence | Action |
|-----------|--------|
| ≥ 0.85 | Auto-create ticket |
| 0.60–0.84 | Create ticket, flag for review |
| < 0.60 | Ask clarifying question |

**Fallback Chain:**

```
Try Gemini Flash (primary)
   │ fail
   ▼
Retry once (network blip)
   │ fail
   ▼
Return canned response + log error
   │
   ▼
Admin sees "AI degraded" banner
```

#### 3.2.4 Ticket Service Design

**State Machine:**

```
        ┌─────────┐
        │  new    │
        └────┬────┘
             │ admin picks up
             ▼
     ┌───────────────┐
     │ in_progress   │
     └───────┬───────┘
             │ work done
             ▼
        ┌─────────┐
        │  ready  │
        └────┬────┘
             │ handed to customer
             ▼
     ┌─────────────┐
     │ delivered   │
     └─────────────┘
             
     Any state → cancelled (admin action)
```

**Transition Rules:**

```typescript
new         → in_progress | cancelled
in_progress → ready       | cancelled
ready       → delivered   | cancelled
delivered   → (terminal)
cancelled   → (terminal)
```

Invalid transitions return `400 Bad Request`.

#### 3.2.5 Notifications Design

**Multi-Channel Strategy:**

| Channel | Trigger | Latency | Cost |
|---------|---------|---------|------|
| Socket.io | Any ticket event | < 500ms | Free |
| Browser Push | New ticket | < 2s | Free |
| Telegram | New ticket | < 3s | Free |
| Sound | New ticket (admin UI) | Instant | Free |

**Socket.io Rooms:**

```
admin-room      → all admins + managers
manager-room    → managers only (read-only feed)
```

**Event Payloads:**

```typescript
// Emitted on new ticket
'ticket:new' → { ticket: Ticket }

// Emitted on any update
'ticket:updated' → { ticket: Ticket }

// Emitted on cancel
'ticket:deleted' → { ticketId: string }
```

**Telegram Message Format:**

```
🎫 New Ticket #A47
📚 Book: Atomic Habits
📝 Type: Printed Copy
👤 Customer: (optional)
⏰ 2 min ago

View: https://admin.bvta.app/tickets/A47
```

### 3.3 Data Design

#### 3.3.1 Collections

**tickets**

```javascript
{
  _id: ObjectId,
  ticketNumber: String,       // Human-readable: "A47"
  bookTitle: String,
  requestType: String,        // enum
  customerName: String?,      
  customerPhone: String?,
  status: String,             // enum
  confidence: Number,
  notes: String?,
  auditLog: [{
    action: String,
    from: String?,
    to: String?,
    by: ObjectId,
    at: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**users** (admin/manager)

```javascript
{
  _id: ObjectId,
  email: String (unique),
  passwordHash: String,
  role: String,               // 'admin' | 'manager'
  name: String,
  createdAt: Date
}
```

**sessions** (chat session memory, TTL 24h)

```javascript
{
  _id: ObjectId,
  sessionId: String (unique),
  messages: [{
    role: 'user' | 'assistant',
    content: String,
    at: Date
  }],
  language: String,
  createdAt: Date,            // TTL index: 24h
}
```

**audit_logs** (optional, for compliance)

```javascript
{
  _id: ObjectId,
  actor: ObjectId | 'system',
  action: String,
  entity: String,             // 'ticket'
  entityId: ObjectId,
  meta: Object,
  at: Date                    // TTL: 90 days
}
```

#### 3.3.2 Indexes

```javascript
// tickets
{ status: 1, createdAt: -1 }         // main dashboard query
{ bookTitle: 'text' }                // search
{ ticketNumber: 1 } (unique)         // lookups

// sessions
{ sessionId: 1 } (unique)
{ createdAt: 1 } (TTL: 24h)

// users
{ email: 1 } (unique)

// audit_logs
{ at: 1 } (TTL: 90d)
{ entityId: 1, at: -1 }
```

#### 3.3.3 Ticket Number Generation

Human-friendly IDs like `A47`, `B12`:

```typescript
async function nextTicketNumber(): Promise<string> {
  // Atomic counter in a 'counters' collection
  const counter = await Counter.findOneAndUpdate(
    { _id: 'ticket' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  
  const seq = counter.seq;
  const letter = String.fromCharCode(65 + Math.floor(seq / 100) % 26);
  const num = seq % 100;
  return `${letter}${num.toString().padStart(2, '0')}`;
}
```

Why not `_id`? Customers can't read ObjectIds aloud. `A47` is speakable.

---

## 4. Interaction Flows

### 4.1 Happy Path: Customer Requests a Printed Copy

```
1. Customer opens /  (CustomerPage)
2. Taps mic → browser asks permission
3. Speaks: "I want the printed copy of Atomic Habits"
4. Browser ASR → transcript displayed live
5. On final → POST /api/chat
6. Server: AI extracts { bookTitle, requestType: 'printed_copy', confidence: 0.95 }
7. Confidence ≥ 0.85 → create ticket A47
8. Save session message
9. Emit 'ticket:new' to admin-room
10. Send Telegram to manager
11. Return: { reply: "Ticket A47 created!", ticket }
12. Browser TTS speaks reply
13. Admin sees ticket pop in < 500ms
14. Manager gets Telegram alert
```

**Timeline:**

| Step | Latency |
|------|---------|
| ASR final result | ~800ms after speech |
| /api/chat roundtrip | ~1.5s |
| Socket broadcast | ~200ms |
| Telegram delivery | ~1.5s |
| **Total** | **~4s end-to-end** |

### 4.2 Fallback Path: AI Fails

```
1. Gemini call throws (quota/network)
2. Orchestrator catches → logs
3. Returns canned: "Sorry, I couldn't process that. Please try again or call us."
4. No ticket created
5. Admin sees "AI degraded" indicator (from health check)
```

### 4.3 Admin Updates Ticket

```
1. Admin clicks "in_progress" on ticket A47
2. PATCH /api/tickets/A47 { status: 'in_progress' }
3. Server validates transition (new → in_progress ✅)
4. Updates DB, appends audit log
5. Emits 'ticket:updated' to admin-room
6. All admins see change instantly
7. Manager feed updates (read-only)
```

### 4.4 Session Reconnect

```
1. Customer's browser reconnects
2. Socket sends 'join:admin' OR chat session restore
3. Server checks sessionId → loads messages from sessions collection
4. UI restores chat history (within 24h)
```

---

## 5. Cross-Cutting Concerns

### 5.1 Security

| Threat | Mitigation |
|--------|-----------|
| API key theft | Keys only in server env, never client |
| Prompt injection | System prompt hardening + output validation |
| XSS | React escapes by default; sanitize any HTML |
| CSRF | JWT in Authorization header, not cookies |
| Rate abuse | 20 req/min per IP on /api/chat |
| Brute-force login | Rate limit + bcrypt cost 12 |
| Ticket tampering | Validate transitions server-side |
| Enumeration | Ticket IDs not sequential across tenants |

**JWT Design:**

```typescript
Payload: { userId, role, exp: 24h }
Algorithm: HS256
Storage: localStorage (acceptable for admin UI)
Refresh: not needed (re-login after 24h)
```

### 5.2 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/chat | 20 | 1 min per IP |
| POST /api/auth/login | 5 | 5 min per IP |
| GET /api/tickets | 60 | 1 min per user |
| Global | 300 | 1 min per IP |

Uses in-memory store (Map) — sufficient for a single instance. Redis later if scaling.

### 5.3 Error Handling

**Error Envelope:**

```typescript
{
  error: {
    code: 'TICKET_NOT_FOUND',
    message: 'Ticket A99 not found',
    requestId: 'uuid'
  }
}
```

**Error Codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 400 | Bad input |
| UNAUTHORIZED | 401 | Missing/expired JWT |
| FORBIDDEN | 403 | Wrong role |
| TICKET_NOT_FOUND | 404 | No such ticket |
| INVALID_TRANSITION | 409 | Bad status change |
| RATE_LIMITED | 429 | Too many requests |
| AI_UNAVAILABLE | 503 | Gemini down |
| INTERNAL | 500 | Unexpected |

### 5.4 Logging

Structured JSON logs:

```json
{
  "level": "info",
  "ts": "2026-01-15T10:30:00Z",
  "requestId": "abc-123",
  "route": "POST /api/chat",
  "userId": null,
  "sessionId": "s_789",
  "latencyMs": 1420,
  "aiConfidence": 0.95,
  "ticketCreated": "A47"
}
```

**Never log:** full message content (privacy), JWTs, passwords.

### 5.5 Observability

| Metric | Source | Purpose |
|--------|--------|---------|
| Request count | Logs | Load |
| AI latency p50/p95 | Logs | UX |
| AI error rate | Logs | Health |
| Ticket creation rate | DB | Business |
| Socket connections | Server | Capacity |

No paid APM. Use free tier of Render logs + a `/health` endpoint.

### 5.6 Health Check

```
GET /health →
{
  status: 'ok',
  mongo: 'up',
  gemini: 'up',      // last successful call < 5 min
  sockets: 12,
  uptime: 3600
}
```

Also used by a keep-alive cron to prevent Render sleep.

---

## 6. Deployment Architecture

### 6.1 Environments

| Env | Purpose | Hosting |
|-----|---------|---------|
| Local | Dev | localhost |
| Production | Live | Vercel + Render + Atlas |

No staging (free-tier constraint). Feature flags in code instead.

### 6.2 Deployment Topology

```
┌────────────────────────────────────────────────┐
│  Vercel Edge Network (Global CDN)              │
│  - React SPA                                   │
│  - HTTPS + HTTP/3                              │
│  - Auto-deploy on git push                     │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  Render (Free tier, Singapore/Oregon)          │
│  - Node.js backend                             │
│  - Socket.io server                            │
│  - Sleeps after 15 min inactivity              │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  MongoDB Atlas (M0 Free)                       │
│  - 512MB storage                               │
│  - Shared cluster                              │
│  - Daily backups (7 days)                      │
└────────────────────────────────────────────────┘
```

### 6.3 Sleep Prevention

Render free tier sleeps. Mitigation:

```
External cron (cron-job.org, free)
  → GET https://bvta-api.onrender.com/health
  → every 10 minutes
```

Cost: $0. Trade-off: minimal.

### 6.4 CI/CD

```
GitHub push → main
   │
   ├─► Vercel detects → builds client → deploys
   │
   └─► Render detects → builds server → deploys
```

No custom CI needed. Type checking runs on build.

---

## 7. Scalability & Evolution

### 7.1 Current Capacity

| Resource | Limit | Notes |
|----------|-------|-------|
| Concurrent users | ~50 | Socket.io in-memory |
| Tickets/day | ~1,000 | Gemini free tier |
| Storage | 512MB | ~50k tickets |
| Requests/min | 300 | Single instance |

Sufficient for 1–3 bookshops.

### 7.2 Scaling Path (When Needed)

| Stage | Trigger | Action |
|-------|---------|--------|
| 1 | > 50 concurrent | Add Redis adapter for Socket.io |
| 2 | > 300 req/min | Move to paid Render instance |
| 3 | > 1M tokens/day | Add secondary AI (Groq/OpenRouter) |
| 4 | > 512MB data | Archive delivered tickets to S3 |
| 5 | Multi-branch | Introduce `tenantId` field everywhere |

### 7.3 Multi-Tenancy Design (Future)

Every collection gets `tenantId`. JWT carries `tenantId`. All queries scoped. Subdomain per shop: `shop1.bvta.app`.

---

## 8. Trade-Off Analysis

| Decision | Alternative | Why Chosen |
|----------|-------------|-----------|
| Modular monolith | Microservices | Free tier can't host many services |
| Browser ASR | Server Whisper | Zero cost, zero storage |
| MongoDB | PostgreSQL | Flexible schema, easy free tier |
| Socket.io | SSE | Bidirectional, better mobile support |
| Gemini Flash | GPT-4o mini | Free tier, fast |
| JWT | Sessions | Stateless, easy on free tier |
| TailwindCSS | Material UI | Lighter, faster to learn |
| React Query | Redux | Less boilerplate |

---

## 9. Testing Strategy

| Level | Tool | Coverage Target |
|-------|------|----------------|
| Unit | Vitest | Services, utils |
| Integration | Supertest | API routes |
| E2E | Playwright | Customer + admin flows |
| Manual | Checklist | Voice on real devices |

**Critical test cases:**

1. Ticket created from 20 phrasings of "I want a printed copy of X"
2. Invalid status transition rejected
3. AI failure returns graceful message
4. Socket reconnect restores state
5. Rate limit triggers at 21st request

---

## 10. Risks & Mitigations (Design-Level)

| Risk | Design Response |
|------|----------------|
| Gemini quota exhausted | Fallback + admin banner |
| Socket disconnects | Auto-reconnect + state resync |
| Render cold start | Keep-alive cron + loading UI |
| Mongo connection drop | Retry with backoff |
| AI hallucinates book | Confidence threshold + admin review |
| Voice unsupported | Text always available |

---

## 11. Design Decisions Log (ADR Summary)

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-1 | Browser-based ASR/TTS | Zero cost, privacy |
| ADR-2 | Text-only to server | Minimize bandwidth |
| ADR-3 | Confidence thresholds | Balance automation vs. accuracy |
| ADR-4 | Socket.io rooms | Clean admin/manager separation |
| ADR-5 | Human-readable ticket IDs | Speakable, memorable |
| ADR-6 | Modular monolith | Free tier + beginner-friendly |
| ADR-7 | Telegram over SMS | Free, instant |
| ADR-8 | Zod validation | Type-safe runtime checks |

---

## 12. Appendix

### A. Sequence Diagram — Full Happy Path

```
Customer    Browser    Server    Gemini    MongoDB    Socket    Telegram
   │           │          │         │         │         │         │
   │─speaks───►│          │         │         │         │         │
   │           │─ASR─────►│         │         │         │         │
   │           │          │─extract►│         │         │         │
   │           │          │◄─JSON───│         │         │         │
   │           │          │─save───────────────────────►│         │
   │           │          │         │         │         │         │
   │           │          │─emit────────────────────────►│         │
   │           │          │─notify──────────────────────────────────►
   │           │◄─reply───│         │         │         │         │
   │◄─TTS──────│          │         │         │         │         │
```

### B. Status Transition Matrix

| From \ To | new | in_progress | ready | delivered | cancelled |
|-----------|-----|-------------|-------|-----------|-----------|
| new | — | ✅ | ❌ | ❌ | ✅ |
| in_progress | ❌ | — | ✅ | ❌ | ✅ |
| ready | ❌ | ❌ | — | ✅ | ✅ |
| delivered | ❌ | ❌ | ❌ | — | ❌ |
| cancelled | ❌ | ❌ | ❌ | ❌ | — |

### C. Environment Variables

```
# Server
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=...
JWT_SECRET=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
CLIENT_URL=https://bvta.vercel.app
RATE_LIMIT_CHAT=20

# Client
VITE_API_URL=https://bvta-api.onrender.com
VITE_SOCKET_URL=https://bvta-api.onrender.com
```