# API Specification

## Bookshop Voice Ticket Agent (BVTA)

**Version:** 1.0
**Base URL (prod):** `https://bvta-api.onrender.com`
**Base URL (dev):** `http://localhost:3000`
**Companion to:** SRS v1.0, System Design v1.0
**Protocols:** HTTPS (REST) + WSS (WebSocket)

---

## 1. Conventions

### 1.1 General Rules

| Rule | Value |
|------|-------|
| Content-Type | `application/json` |
| Charset | UTF-8 |
| Auth | `Authorization: Bearer <JWT>` |
| Timestamps | ISO 8601 UTC (`2026-01-15T10:30:00.000Z`) |
| IDs | MongoDB ObjectId (24-char hex) |
| Ticket numbers | Human-readable (`A47`) |
| Versioning | Path-based (`/api/v1/...`) — v1 implicit for now |

### 1.2 Standard Response Envelope

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "uuid" }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket A99 not found",
    "details": { "ticketNumber": "A99" }
  },
  "meta": { "requestId": "uuid" }
}
```

### 1.3 HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Wrong role |
| 404 | Not Found | Resource missing |
| 409 | Conflict | Invalid state transition |
| 422 | Unprocessable | AI couldn't parse |
| 429 | Too Many Requests | Rate limit |
| 500 | Internal Error | Bug |
| 503 | Service Unavailable | AI down |

### 1.4 Error Codes (Full List)

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Input failed schema |
| `MISSING_FIELD` | 400 | Required field absent |
| `INVALID_LANGUAGE` | 400 | Unsupported language |
| `UNAUTHORIZED` | 401 | No/invalid token |
| `TOKEN_EXPIRED` | 401 | JWT expired |
| `FORBIDDEN` | 403 | Role not allowed |
| `TICKET_NOT_FOUND` | 404 | No such ticket |
| `USER_NOT_FOUND` | 404 | No such user |
| `INVALID_TRANSITION` | 409 | Bad status change |
| `DUPLICATE_EMAIL` | 409 | Email already used |
| `AI_PARSE_FAILED` | 422 | Gemini returned junk |
| `AI_LOW_CONFIDENCE` | 422 | Confidence below threshold |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_UNAVAILABLE` | 503 | Gemini unreachable |
| `INTERNAL_ERROR` | 500 | Unexpected |

### 1.5 Rate Limits

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| `POST /api/v1/chat` | 20 | 1 min | per IP |
| `POST /api/v1/auth/login` | 5 | 5 min | per IP |
| `GET /api/v1/tickets` | 60 | 1 min | per user |
| `PATCH /api/v1/tickets/:id` | 30 | 1 min | per user |
| Global | 300 | 1 min | per IP |

**Rate limit response headers:**

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 14
X-RateLimit-Reset: 1705312860
Retry-After: 42
```

### 1.6 Pagination

Query params for list endpoints:

| Param | Type | Default | Max |
|-------|------|---------|-----|
| `page` | number | 1 | — |
| `limit` | number | 20 | 100 |
| `sort` | string | `-createdAt` | — |

**Response meta:**

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

---

## 2. Authentication Endpoints

### 2.1 POST `/api/v1/auth/login`

Authenticate an admin or manager.

**Auth:** Public

**Request:**

```json
{
  "email": "admin@bookshop.lk",
  "password": "securePassword123"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| email | required, valid email |
| password | required, min 8 chars |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "email": "admin@bookshop.lk",
      "name": "Nimal Perera",
      "role": "admin"
    }
  }
}
```

**Errors:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Missing/invalid fields |
| `UNAUTHORIZED` | 401 | Wrong credentials |
| `RATE_LIMITED` | 429 | > 5 attempts / 5 min |

**Example:**

```bash
curl -X POST https://bvta-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookshop.lk","password":"securePassword123"}'
```

---

### 2.2 POST `/api/v1/auth/logout`

Invalidate current session (client-side JWT discard; server logs event).

**Auth:** Required (any role)

**Request:** empty body

**Response 200:**

```json
{
  "success": true,
  "data": { "message": "Logged out" }
}
```

---

### 2.3 GET `/api/v1/auth/me`

Get current user profile.

**Auth:** Required

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "email": "admin@bookshop.lk",
    "name": "Nimal Perera",
    "role": "admin",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## 3. Chat Endpoints

### 3.1 POST `/api/v1/chat`

The **core endpoint**. Accepts a customer message (from voice transcript or typed text), runs AI extraction, optionally creates a ticket, and returns the AI reply.

**Auth:** Public (session-based, not JWT)

**Rate limit:** 20 / min per IP

**Request:**

```json
{
  "message": "I want the printed copy of Atomic Habits",
  "sessionId": "s_abc123xyz",
  "language": "en"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| message | required, 1–500 chars, trimmed |
| sessionId | optional, string 8–64 chars; if absent, server generates |
| language | optional, enum: `en`, `si`, `ta`; default `en` |

**Response 200 (ticket created):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s_abc123xyz",
    "reply": "Got it! I've created ticket A47 for 'Atomic Habits' printed copy. We'll notify you when it's ready.",
    "ticket": {
      "id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "ticketNumber": "A47",
      "bookTitle": "Atomic Habits",
      "requestType": "printed_copy",
      "status": "new",
      "confidence": 0.95,
      "createdAt": "2026-01-15T10:30:00.000Z"
    },
    "shouldSpeak": true
  }
}
```

**Response 200 (no ticket — general reply):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s_abc123xyz",
    "reply": "I can help you request printed copies, reserve books, or check availability. What book are you looking for?",
    "ticket": null,
    "shouldSpeak": true
  }
}
```

**Response 200 (low confidence — clarifying question):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s_abc123xyz",
    "reply": "I want to make sure I understood. Which book are you asking about?",
    "ticket": null,
    "shouldSpeak": true
  }
}
```

**Errors:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Bad input |
| `INVALID_LANGUAGE` | 400 | Unsupported language |
| `RATE_LIMITED` | 429 | > 20 / min |
| `AI_PARSE_FAILED` | 422 | Gemini returned malformed JSON |
| `AI_UNAVAILABLE` | 503 | Gemini down |

**Example:**

```bash
curl -X POST https://bvta-api.onrender.com/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want the printed copy of Atomic Habits",
    "language": "en"
  }'
```

**Behavior notes:**

- Server generates `sessionId` if missing, returns it for continuity.
- Server keeps last 10 messages in session memory (24h TTL).
- `shouldSpeak: true` tells frontend to use TTS; `false` for silent replies.
- Ticket creation is atomic; if any step fails, no partial ticket is stored.

---

### 3.2 GET `/api/v1/chat/session/:sessionId`

Retrieve recent chat history for a session.

**Auth:** Public (session-scoped)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "sessionId": "s_abc123xyz",
    "language": "en",
    "messages": [
      {
        "role": "user",
        "content": "I want the printed copy of Atomic Habits",
        "at": "2026-01-15T10:30:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Got it! I've created ticket A47...",
        "at": "2026-01-15T10:30:02.000Z"
      }
    ]
  }
}
```

**Errors:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Bad sessionId |
| `TICKET_NOT_FOUND` | 404 | Session expired/unknown |

---

## 4. Ticket Endpoints

### 4.1 GET `/api/v1/tickets`

List tickets with filters, pagination, and sorting.

**Auth:** Required (admin or manager)

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | string | — | `new`, `in_progress`, `ready`, `delivered`, `cancelled` |
| `requestType` | string | — | `printed_copy`, `reservation`, `inquiry` |
| `search` | string | — | Fuzzy match on bookTitle |
| `from` | ISO date | — | createdAt ≥ |
| `to` | ISO date | — | createdAt ≤ |
| `page` | number | 1 | — |
| `limit` | number | 20 | max 100 |
| `sort` | string | `-createdAt` | `createdAt`, `-createdAt`, `status` |

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "ticketNumber": "A47",
      "bookTitle": "Atomic Habits",
      "requestType": "printed_copy",
      "status": "new",
      "customerName": null,
      "customerPhone": null,
      "confidence": 0.95,
      "notes": "",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

**Example:**

```bash
curl "https://bvta-api.onrender.com/api/v1/tickets?status=new&limit=10" \
  -H "Authorization: Bearer <JWT>"
```

---

### 4.2 GET `/api/v1/tickets/:id`

Get a single ticket by ID or ticket number.

**Auth:** Required

**Path param:** `id` accepts either ObjectId (`65a1...`) or ticketNumber (`A47`).

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "ticketNumber": "A47",
    "bookTitle": "Atomic Habits",
    "requestType": "printed_copy",
    "status": "in_progress",
    "customerName": "Kamal Silva",
    "customerPhone": "+94771234567",
    "confidence": 0.95,
    "notes": "Customer wants hardcover edition",
    "auditLog": [
      {
        "action": "created",
        "from": null,
        "to": "new",
        "by": "system",
        "at": "2026-01-15T10:30:00.000Z"
      },
      {
        "action": "status_changed",
        "from": "new",
        "to": "in_progress",
        "by": "65a1...",
        "at": "2026-01-15T10:35:00.000Z"
      }
    ],
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:35:00.000Z"
  }
}
```

**Errors:**

| Code | HTTP | When |
|------|------|------|
| `TICKET_NOT_FOUND` | 404 | No such ID/ticketNumber |

---

### 4.3 PATCH `/api/v1/tickets/:id`

Update ticket status or notes.

**Auth:** Required (admin only; manager gets 403)

**Request:**

```json
{
  "status": "in_progress",
  "notes": "Customer wants hardcover edition"
}
```

Both fields optional, but at least one required.

**Validation:**

| Field | Rules |
|-------|-------|
| status | enum, valid transition only |
| notes | string, max 1000 chars |

**Valid transitions:**

```
new         → in_progress, cancelled
in_progress → ready, cancelled
ready       → delivered, cancelled
delivered   → (terminal)
cancelled   → (terminal)
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "ticketNumber": "A47",
    "status": "in_progress",
    "notes": "Customer wants hardcover edition",
    "updatedAt": "2026-01-15T10:35:00.000Z"
  }
}
```

**Errors:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Bad input |
| `FORBIDDEN` | 403 | Manager tried to update |
| `TICKET_NOT_FOUND` | 404 | No such ticket |
| `INVALID_TRANSITION` | 409 | e.g. new → delivered |

**Example:**

```bash
curl -X PATCH https://bvta-api.onrender.com/api/v1/tickets/A47 \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

---

### 4.4 DELETE `/api/v1/tickets/:id`

Cancel a ticket (soft delete → status `cancelled`).

**Auth:** Required (admin only)

**Response 204:** no body

**Errors:**

| Code | HTTP | When |
|------|------|------|
| `FORBIDDEN` | 403 | Manager |
| `TICKET_NOT_FOUND` | 404 | No such ticket |
| `INVALID_TRANSITION` | 409 | Already delivered |

---

### 4.5 GET `/api/v1/tickets/stats`

Dashboard summary stats.

**Auth:** Required (admin or manager)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "today": {
      "created": 12,
      "delivered": 8,
      "pending": 4
    },
    "byStatus": {
      "new": 3,
      "in_progress": 5,
      "ready": 2,
      "delivered": 128,
      "cancelled": 5
    },
    "byType": {
      "printed_copy": 78,
      "reservation": 32,
      "inquiry": 33
    },
    "avgProcessingMinutes": 42
  }
}
```

---

## 5. User Management Endpoints

### 5.1 GET `/api/v1/users`

List admin/manager users.

**Auth:** Required (admin only)

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "65a1...",
      "email": "admin@bookshop.lk",
      "name": "Nimal Perera",
      "role": "admin",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5.2 POST `/api/v1/users`

Create a new admin/manager.

**Auth:** Required (admin only)

**Request:**

```json
{
  "email": "manager@bookshop.lk",
  "password": "securePassword123",
  "name": "Sunil Fernando",
  "role": "manager"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| email | required, valid, unique |
| password | required, min 8 |
| name | required, 2–100 chars |
| role | enum: `admin`, `manager` |

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "65a2...",
    "email": "manager@bookshop.lk",
    "name": "Sunil Fernando",
    "role": "manager",
    "createdAt": "2026-01-15T11:00:00.000Z"
  }
}
```

**Errors:**

| Code | HTTP | When |
|------|------|------|
| `DUPLICATE_EMAIL` | 409 | Email exists |

---

### 5.3 DELETE `/api/v1/users/:id`

Remove a user.

**Auth:** Required (admin only)

**Response 204:** no body

---

## 6. Health & System Endpoints

### 6.1 GET `/health`

Liveness + dependency check. Used by keep-alive cron.

**Auth:** Public

**Response 200:**

```json
{
  "status": "ok",
  "uptime": 3600,
  "mongo": "up",
  "gemini": "up",
  "sockets": 12,
  "version": "1.0.0",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

**Response 503 (degraded):**

```json
{
  "status": "degraded",
  "mongo": "up",
  "gemini": "down",
  "lastGeminiSuccess": "2026-01-15T10:20:00.000Z"
}
```

---

### 6.2 GET `/api/v1/version`

API version info.

**Auth:** Public

**Response 200:**

```json
{
  "success": true,
  "data": {
    "api": "1.0.0",
    "build": "2026-01-15T09:00:00.000Z",
    "environment": "production"
  }
}
```

---

## 7. WebSocket API

**URL:** `wss://bvta-api.onrender.com`
**Protocol:** Socket.io v4
**Auth:** JWT passed in handshake `auth.token` (for admin/manager only)

### 7.1 Client → Server Events

| Event | Payload | Who | Purpose |
|-------|---------|-----|---------|
| `join:admin` | — | admin, manager | Join admin room for ticket events |
| `join:manager` | — | manager | Join manager room (read-only feed) |
| `leave:admin` | — | admin, manager | Leave room |
| `ping` | — | any | Keep-alive |

### 7.2 Server → Client Events

| Event | Payload | Who receives | When |
|-------|---------|--------------|------|
| `ticket:new` | `{ ticket }` | admin-room, manager-room | Ticket created |
| `ticket:updated` | `{ ticket }` | admin-room, manager-room | Status/notes changed |
| `ticket:deleted` | `{ ticketId }` | admin-room, manager-room | Ticket cancelled |
| `ai:degraded` | `{ since }` | admin-room | Gemini down > 2 min |
| `ai:recovered` | `{ at }` | admin-room | Gemini back up |
| `pong` | — | sender | Response to ping |

### 7.3 Example Connection (client)

```javascript
import { io } from 'socket.io-client';

const socket = io(API_URL, {
  auth: { token: jwtToken },
  transports: ['websocket']
});

socket.on('connect', () => {
  socket.emit('join:admin');
});

socket.on('ticket:new', ({ ticket }) => {
  console.log('New ticket:', ticket.ticketNumber);
  playSound();
  showNotification(ticket);
});

socket.on('ticket:updated', ({ ticket }) => {
  updateTicketInList(ticket);
});
```

### 7.4 Handshake Auth Errors

| Error | Cause |
|-------|-------|
| `AUTH_REQUIRED` | No token provided |
| `TOKEN_INVALID` | Bad/expired JWT |
| `FORBIDDEN` | Customer tried to join admin room |

---

## 8. Request/Response Examples (End-to-End)

### 8.1 Complete Customer Flow

**Step 1 — Customer speaks, browser converts to text:**

```
"I want the printed copy of Atomic Habits"
```

**Step 2 — POST `/api/v1/chat`:**

```bash
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want the printed copy of Atomic Habits",
    "language": "en"
  }'
```

**Step 3 — Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "s_9f8a7b6c5d",
    "reply": "Got it! I've created ticket A47 for 'Atomic Habits' printed copy. We'll notify you when it's ready.",
    "ticket": {
      "id": "65a1b2c3d4e5f6a7b8c9d0e1",
      "ticketNumber": "A47",
      "bookTitle": "Atomic Habits",
      "requestType": "printed_copy",
      "status": "new",
      "confidence": 0.95,
      "createdAt": "2026-01-15T10:30:00.000Z"
    },
    "shouldSpeak": true
  },
  "meta": { "requestId": "req-abc-123" }
}
```

**Step 4 — Browser speaks reply via TTS. Admin receives `ticket:new` via socket.**

---

### 8.2 Admin Login + Fetch Tickets

**Step 1 — POST `/api/v1/auth/login`:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookshop.lk","password":"securePassword123"}'
```

**Step 2 — Save token, then GET `/api/v1/tickets?status=new`:**

```bash
curl "http://localhost:3000/api/v1/tickets?status=new" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Step 3 — Update ticket:**

```bash
curl -X PATCH http://localhost:3000/api/v1/tickets/A47 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

---

### 8.3 AI Failure Path

**Request:**

```json
{ "message": "I want the printed copy of Atomic Habits" }
```

**Response 503:**

```json
{
  "success": false,
  "error": {
    "code": "AI_UNAVAILABLE",
    "message": "Our assistant is temporarily unavailable. Please try again or call the shop.",
    "details": { "retryAfter": 30 }
  },
  "meta": { "requestId": "req-xyz-789" }
}
```

Frontend displays error + retry button. No ticket created.

---

## 9. Auth & Roles Matrix

| Endpoint | Public | Customer | Admin | Manager |
|----------|:------:|:--------:|:-----:|:-------:|
| POST /auth/login | ✅ | — | — | — |
| POST /auth/logout | — | — | ✅ | ✅ |
| GET /auth/me | — | — | ✅ | ✅ |
| POST /chat | ✅ | ✅ | ✅ | ✅ |
| GET /chat/session/:id | ✅ | ✅ | ✅ | ✅ |
| GET /tickets | — | — | ✅ | ✅ |
| GET /tickets/:id | — | — | ✅ | ✅ |
| PATCH /tickets/:id | — | — | ✅ | ❌ |
| DELETE /tickets/:id | — | — | ✅ | ❌ |
| GET /tickets/stats | — | — | ✅ | ✅ |
| GET /users | — | — | ✅ | ❌ |
| POST /users | — | — | ✅ | ❌ |
| DELETE /users/:id | — | — | ✅ | ❌ |
| GET /health | ✅ | ✅ | ✅ | ✅ |
| WS join:admin | — | — | ✅ | ✅ |
| WS join:manager | — | — | ❌ | ✅ |

---

## 10. CORS Policy

| Origin | Methods | Credentials |
|--------|---------|-------------|
| `https://bvta.vercel.app` | GET, POST, PATCH, DELETE | Yes |
| `http://localhost:5173` | same | Yes |
| Others | — | Rejected |

---

## 11. Security Headers

All responses include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: microphone=(self)
```

---

## 12. Idempotency

For `POST /api/v1/chat`, clients **may** send:

```
Idempotency-Key: <uuid>
```

If the same key is resent within 5 minutes, server returns the cached response — prevents duplicate tickets on network retries.

---

## 13. Versioning Policy

- Current: `v1` (path-based)
- Breaking changes → `v2`
- Non-breaking additions (new fields, new endpoints) → stay in `v1`
- Deprecations announced 30 days before removal

---

## 14. Testing Checklist (Derived From This Spec)

When you code, verify each of these:

**Auth:**
- [ ] Login with valid creds → 200 + token
- [ ] Login with wrong password → 401
- [ ] Login 6 times → 429
- [ ] GET /me without token → 401
- [ ] GET /me with expired token → 401

**Chat:**
- [ ] 20 phrasings of "printed copy of X" → ticket created
- [ ] Empty message → 400
- [ ] 501-char message → 400
- [ ] Unsupported language → 400
- [ ] 21 requests in 1 min → 429
- [ ] Gemini down → 503 with retry hint

**Tickets:**
- [ ] List with no auth → 401
- [ ] List as manager → 200
- [ ] PATCH as manager → 403
- [ ] PATCH valid transition → 200
- [ ] PATCH invalid transition → 409
- [ ] PATCH nonexistent → 404
- [ ] Search by title → filtered
- [ ] Pagination works

**Socket:**
- [ ] Admin receives `ticket:new` within 500ms
- [ ] Manager receives `ticket:new`
- [ ] Customer cannot join admin room
- [ ] Reconnect restores state
