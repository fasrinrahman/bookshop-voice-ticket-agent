# Software Requirements Specification (SRS)

## Bookshop Voice Ticket Agent (BVTA)

**Version:** 1.0
**Date:** 2026
**Author:** [Your Name]
**Status:** Draft

---

## 1. Introduction

### 1.1 Purpose

This document specifies the complete requirements for the **Bookshop Voice Ticket Agent (BVTA)** — a web-based AI system that allows bookshop customers to request printed copies, reservations, or book inquiries via voice or text, automatically generates structured tickets, and notifies shop administrators and managers in real time.

This SRS is intended for:
- The developer (you)
- Any future collaborators
- Shop owners evaluating the system
- Academic or portfolio reviewers

### 1.2 Scope

The system will:

- Accept **voice and text input** from customers via a web browser
- Use **AI (LLM)** to understand natural language requests
- **Automatically create structured tickets** in a database
- **Notify admins/managers in real time** via a live dashboard
- Track ticket lifecycle from creation to completion
- Run on **free-tier infrastructure** with zero operating cost

The system will **not**:
- Handle payments or checkout
- Manage inventory or stock levels
- Replace the shop's POS system
- Provide a general-purpose chatbot

### 1.3 Definitions & Acronyms

| Term | Meaning |
|------|---------|
| **BVTA** | Bookshop Voice Ticket Agent |
| **Ticket** | A structured request created from customer input |
| **ASR** | Automatic Speech Recognition |
| **TTS** | Text-to-Speech |
| **LLM** | Large Language Model |
| **RAG** | Retrieval-Augmented Generation |
| **SRS** | Software Requirements Specification |
| **Admin** | Shop staff who process tickets |
| **Manager** | Shop owner/manager who monitors operations |

### 1.4 Intended Audience

- **Primary user:** Sri Lankan bookshop owners with limited technical background
- **Secondary user:** Small bookshop chains (2–10 branches)
- **Tertiary user:** Developers adapting the system

### 1.5 References

- IEEE 830-1998 (SRS standard)
- Google Gemini API documentation
- Web Speech API specification
- MongoDB Atlas free tier documentation

---

## 2. Overall Description

### 2.1 Product Perspective

BVTA is a **standalone web application** that complements (does not replace) a bookshop's existing operations. It sits between the customer and shop staff as an intelligent request intake layer.

```
Customer → Browser (Voice/Text) → AI Agent → Ticket DB → Admin Dashboard
                                                  ↓
                                          Manager Notifications
```

### 2.2 Product Functions (High-Level)

1. **Voice/Text Intake** — Capture customer requests
2. **Intent Understanding** — Determine what the customer wants
3. **Ticket Creation** — Persist structured requests
4. **Real-Time Notification** — Alert admins/managers instantly
5. **Ticket Management** — Track status through completion
6. **Customer Confirmation** — Acknowledge receipt with ticket ID

### 2.3 User Classes & Characteristics

| User | Technical Skill | Frequency | Priority |
|------|----------------|-----------|----------|
| **Customer** | Low | Occasional | Critical |
| **Admin (staff)** | Low–Medium | Daily | Critical |
| **Manager** | Low–Medium | Daily (monitor) | High |
| **Developer** | High | Setup only | Medium |

### 2.4 Operating Environment

**Client (Browser):**
- Chrome, Edge, or Safari (latest versions)
- Desktop and mobile
- Web Speech API support required for voice
- Minimum 2GB RAM

**Server:**
- Node.js 20+ runtime
- Cloud-hosted (Render, Railway, or similar free tier)
- MongoDB Atlas free cluster (512MB)

**Network:**
- HTTPS required for microphone access
- Minimum 1 Mbps bandwidth

### 2.5 Design Constraints

| Constraint | Description |
|-----------|-------------|
| **Zero cost** | Only free-tier services allowed |
| **Browser-only voice** | No server-side audio processing (cost) |
| **HTTPS mandatory** | For Web Speech API |
| **Free AI tier** | Gemini free tier: 15 req/min, 1M tokens/day |
| **Sleeping servers** | Free-tier hosts sleep after inactivity |
| **Storage limit** | 512MB MongoDB Atlas cap |

### 2.6 Assumptions & Dependencies

- Customer has a working microphone (mobile or laptop)
- Customer speaks English or Sinhala/Tamil
- Shop has internet connectivity
- Shop staff can access a browser
- Free-tier services remain available

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### FR-1: Voice Input Capture

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | System shall capture customer voice via browser microphone | Critical |
| FR-1.2 | System shall display live transcript as customer speaks | High |
| FR-1.3 | System shall support English, Sinhala, and Tamil | Medium |
| FR-1.4 | System shall handle background noise gracefully | Medium |
| FR-1.5 | System shall provide visual "listening" indicator | High |

#### FR-2: Text Input

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | System shall accept typed customer messages | Critical |
| FR-2.2 | System shall support Enter to send | High |
| FR-2.3 | System shall preserve message history in session | Medium |

#### FR-3: Intent Understanding

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | AI shall classify request as: printed_copy, reservation, or inquiry | Critical |
| FR-3.2 | AI shall extract book title from natural language | Critical |
| FR-3.3 | AI shall extract customer name if mentioned | Medium |
| FR-3.4 | AI shall extract customer phone if mentioned | Medium |
| FR-3.5 | AI shall return confidence score (0–1) | High |
| FR-3.6 | AI shall reject non-bookshop queries politely | High |

#### FR-4: Ticket Creation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | System shall create ticket on confirmed request | Critical |
| FR-4.2 | Ticket shall have unique ID | Critical |
| FR-4.3 | Ticket shall store: book title, type, customer info, timestamp | Critical |
| FR-4.4 | Ticket shall default to "new" status | Critical |
| FR-4.5 | System shall confirm ticket ID to customer | High |

#### FR-5: Real-Time Notification

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | New ticket shall appear on admin dashboard instantly | Critical |
| FR-5.2 | System shall play sound on new ticket | High |
| FR-5.3 | System shall show browser notification | High |
| FR-5.4 | Manager shall receive Telegram alert | Medium |
| FR-5.5 | Notification shall include book title + type | High |

#### FR-6: Ticket Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Admin shall view all tickets | Critical |
| FR-6.2 | Admin shall filter by status | High |
| FR-6.3 | Admin shall update ticket status | Critical |
| FR-6.4 | Admin shall add notes to ticket | Medium |
| FR-6.5 | Admin shall search by book title | Medium |

#### FR-7: Ticket Lifecycle

Status flow: `new → in_progress → ready → delivered`

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | System shall enforce valid status transitions | High |
| FR-7.2 | System shall log status change timestamp | High |
| FR-7.3 | System shall support cancellation | Medium |

#### FR-8: Voice Output (Optional)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | System shall speak AI responses aloud | Medium |
| FR-8.2 | Customer shall be able to mute voice output | High |
| FR-8.3 | Voice shall match selected language | Medium |

#### FR-9: Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-9.1 | Admin dashboard shall require login | Critical |
| FR-9.2 | Customer interface shall be public | Critical |
| FR-9.3 | Session shall expire after 24 hours | High |
| FR-9.4 | Roles: admin, manager (read-only for manager) | Medium |

### 3.2 Non-Functional Requirements

#### Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P1 | Voice-to-transcript latency | < 1.5s |
| NFR-P2 | Ticket creation latency | < 3s |
| NFR-P3 | Real-time notification delay | < 500ms |
| NFR-P4 | Page load time | < 3s |
| NFR-P5 | Concurrent customers supported | 20+ |

#### Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R1 | System uptime | 99% (excluding free-tier sleeps) |
| NFR-R2 | Data persistence | 100% (MongoDB) |
| NFR-R3 | Graceful degradation if AI fails | Required |
| NFR-R4 | Auto-reconnect WebSocket | Required |

#### Security

| ID | Requirement |
|----|-------------|
| NFR-S1 | All traffic over HTTPS |
| NFR-S2 | API keys stored server-side only |
| NFR-S3 | Customer data encrypted at rest (MongoDB Atlas) |
| NFR-S4 | Rate limiting per IP (20 req/min) |
| NFR-S5 | Input sanitization to prevent injection |
| NFR-S6 | Admin passwords hashed (bcrypt) |

#### Usability

| ID | Requirement |
|----|-------------|
| NFR-U1 | Customer UI usable without instruction |
| NFR-U2 | Admin dashboard usable within 5 minutes of training |
| NFR-U3 | Mobile-responsive design |
| NFR-U4 | Works on 3G connections |
| NFR-U5 | Sinhala/Tamil UI support (phase 2) |

#### Maintainability

| ID | Requirement |
|----|-------------|
| NFR-M1 | TypeScript throughout |
| NFR-M2 | Modular architecture (services, routes, models) |
| NFR-M3 | Environment-based configuration |
| NFR-M4 | Logging for all AI calls |
| NFR-M5 | Documented API endpoints |

#### Scalability

| ID | Requirement |
|----|-------------|
| NFR-SC1 | Support 3 shops without code changes |
| NFR-SC2 | Multi-tenant ready (phase 2) |
| NFR-SC3 | Database indexes on status + date |

#### Cost

| ID | Requirement |
|----|-------------|
| NFR-C1 | Zero monthly operating cost |
| NFR-C2 | No paid API dependencies |
| NFR-C3 | Free-tier limits documented |

### 3.3 External Interface Requirements

#### User Interfaces

**Customer UI:**
- Single-page chat interface
- Large microphone button (mobile-first)
- Live transcript area
- AI response area
- Language selector

**Admin UI:**
- Login page
- Ticket list (table/cards)
- Filters (status, date, type)
- Ticket detail modal
- Notification bell
- Logout

**Manager UI:**
- Read-only dashboard
- Real-time ticket feed
- Daily summary stats

#### API Interfaces (REST)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/chat` | Send message, get AI response + ticket |
| GET | `/api/tickets` | List tickets (admin) |
| GET | `/api/tickets/:id` | Get single ticket |
| PATCH | `/api/tickets/:id` | Update ticket |
| DELETE | `/api/tickets/:id` | Cancel ticket |
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/logout` | Logout |

#### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join:admin` | Client → Server | — |
| `ticket:new` | Server → Client | Ticket object |
| `ticket:updated` | Server → Client | Ticket object |
| `ticket:deleted` | Server → Client | Ticket ID |

#### Third-Party APIs

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| Google Gemini | Intent extraction | 15/min, 1M tokens/day |
| MongoDB Atlas | Database | 512MB |
| Telegram Bot | Manager alerts | Unlimited |
| Web Speech API | Voice (browser) | Unlimited |

### 3.4 Data Requirements

#### Ticket Entity

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | Yes | Auto |
| `bookTitle` | String | Yes | Extracted by AI |
| `requestType` | Enum | Yes | printed_copy / reservation / inquiry |
| `customerName` | String | No | If mentioned |
| `customerPhone` | String | No | If mentioned |
| `status` | Enum | Yes | new / in_progress / ready / delivered |
| `notes` | String | No | Admin notes |
| `confidence` | Number | Yes | AI confidence 0–1 |
| `createdAt` | Date | Yes | Auto |
| `updatedAt` | Date | Yes | Auto |

#### Data Retention

- Active tickets: indefinite
- Delivered tickets: 12 months, then archive
- Logs: 30 days
- Customer data: no PII beyond name/phone

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────┐
│           CLIENT (React + TypeScript)       │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │ Customer UI  │      │   Admin UI      │  │
│  └──────┬───────┘      └────────┬────────┘  │
└─────────┼───────────────────────┼───────────┘
          │ HTTPS + WS            │
┌─────────▼───────────────────────▼───────────┐
│       SERVER (Node.js + Express)            │
│  ┌──────────────────────────────────────┐   │
│  │  REST API  │  WebSocket  │ AI Proxy  │   │
│  └──────────────────────────────────────┘   │
└─────────┬───────────────────────┬───────────┘
          │                       │
    ┌─────▼─────┐          ┌──────▼──────┐
    │ MongoDB   │          │  Gemini API │
    │  Atlas    │          │  (Free)     │
    └───────────┘          └─────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React + TypeScript + Vite | Industry standard, fast |
| Styling | TailwindCSS | Rapid UI development |
| State | React Query | Server state management |
| Backend | Node.js + Express + TypeScript | Single language |
| Real-time | Socket.io | Reliable, easy |
| Database | MongoDB Atlas | Free, flexible schema |
| AI | Google Gemini 1.5 Flash | Free tier, fast, good at extraction |
| Voice Input | Web Speech API | Free, browser-native |
| Voice Output | Web Speech Synthesis | Free, browser-native |
| Auth | JWT + bcrypt | Simple, secure |
| Hosting (FE) | Vercel | Free, fast |
| Hosting (BE) | Render | Free tier |
| Notifications | Telegram Bot | Free, instant |

---

## 5. Constraints, Risks & Mitigation

### 5.1 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Free-tier API limits | High | Medium | Rate limit + fallback responses |
| Server sleeps (Render) | Medium | High | Keep-alive ping every 10 min |
| AI misinterprets intent | High | Medium | Confidence threshold + admin review |
| Voice not supported | Medium | Low | Text input always available |
| MongoDB 512MB exceeded | Medium | Low | Archive delivered tickets |
| Sinhala/Tamil accuracy | Medium | High | Phase 2, start English |

### 5.2 Constraints Summary

- **No paid services** — every component must fit free tier
- **No server-side audio** — voice processed in browser
- **HTTPS required** — mic access depends on it
- **No offline mode** — AI requires internet

---

## 6. Acceptance Criteria

The system is considered complete when:

1. ✅ Customer can speak or type a request
2. ✅ AI extracts book title + request type with ≥85% accuracy
3. ✅ Ticket is created and stored in database
4. ✅ Admin sees new ticket within 1 second
5. ✅ Manager receives Telegram alert
6. ✅ Admin can update ticket status
7. ✅ Customer receives ticket ID confirmation
8. ✅ System runs on free tier with zero cost
9. ✅ Deployed and accessible via public URL
10. ✅ Works on mobile Chrome and desktop

---

## 7. Future Enhancements (Phase 2+)

- Multi-branch support (multi-tenant)
- Sinhala/Tamil full UI
- WhatsApp integration
- Book cover image recognition (customer uploads photo)
- Analytics dashboard (peak hours, popular books)
- Customer account + order history
- SMS notifications
- Offline PWA mode
- Voice cloning for shop's brand voice

---

## 8. Appendices

### A. Glossary
- **Intent**: What the customer wants (print, reserve, ask)
- **Ticket**: A structured request record
- **Confidence score**: AI's certainty (0–1)

### B. Assumptions Log
- Shop name and inventory handled manually
- No payment integration
- English-first launch

### C. Open Questions
1. Should manager approve tickets before admin sees them?
2. Should customers track ticket status via link?
3. Should system support book ISBN lookup?

---
