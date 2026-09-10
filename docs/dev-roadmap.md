# Development Roadmap

## Bookshop Voice Ticket Agent (BVTA)

**Version:** 1.0
**Duration:** 6 weeks (part-time, ~15 hrs/week)
**Companion to:** SRS, System Design, API Spec, DB Schema, UI/UX Wireframes
**Status:** Ready to execute

---

## 1. How to Use This Roadmap

- **Each week has one milestone.** Don't move on until it's done.
- **Each day has a deliverable.** End the day with something working.
- **Each milestone has acceptance criteria.** Test against them.
- **Deploy every Friday.** Even if the app is small — ship it.
- **Read the linked resource** before starting that day's task.

**Time budget:** 15 hrs/week. If you have more, finish faster. If less, don't skip tests.

**Golden rule:** Never spend more than 4 hours stuck. Ask for help, simplify, or skip and come back.

---

## 2. Prerequisites (Before Week 1)

Spend **1 day** setting up accounts and tools.

| Task | Time | Link |
|------|------|------|
| Create GitHub account | 5 min | github.com |
| Install Node.js 20 LTS | 15 min | nodejs.org |
| Install VS Code | 10 min | code.visualstudio.com |
| Install Git | 10 min | git-scm.com |
| Create Google AI Studio account → get Gemini API key | 10 min | aistudio.google.com |
| Create MongoDB Atlas account → free cluster | 15 min | mongodb.com/atlas |
| Create Vercel account | 5 min | vercel.com |
| Create Render account | 5 min | render.com |
| Create Telegram bot via @BotFather | 10 min | telegram.org |
| Get Telegram chat ID (message @userinfobot) | 5 min | — |
| Install Postman or Insomnia | 10 min | postman.com |

**Deliverable:** All accounts active, keys stored in a secure note.

**Storage for secrets (do NOT commit):**

```
GEMINI_API_KEY=...
MONGODB_URI=...
JWT_SECRET=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
SEED_ADMIN_EMAIL=admin@bookshop.lk
SEED_ADMIN_PASSWORD=ChangeMe123!
```

---

## 3. Milestone Overview

| Week | Theme | Milestone | Acceptance |
|------|-------|-----------|-----------|
| **1** | Foundation | Server runs, health check works, DB connected | `curl /health` returns ok |
| **2** | AI + Tickets | Chat endpoint creates tickets via AI | 20 phrasings produce tickets |
| **3** | Admin API | Full ticket CRUD + auth | Postman can list/update tickets |
| **4** | Frontend Core | Customer chat UI works end-to-end | Speak → ticket appears in DB |
| **5** | Admin Dashboard | Real-time dashboard + notifications | New ticket pops in < 1s |
| **6** | Voice + Polish + Deploy | Live on Vercel + Render with voice | Public URL works on mobile |

---

## 4. Week 1 — Foundation

**Theme:** Get a skeleton running, connected to DB, with health check.

**Goal:** By Friday, `curl https://your-api.onrender.com/health` returns `{status: "ok"}`.

### Day 1 — Project Setup

**Tasks:**
- Create repo `bvta` on GitHub
- Clone locally
- Create `server/` and `client/` folders (empty for now)
- `cd server && npm init -y`
- Install: `express`, `mongoose`, `dotenv`, `cors`, `typescript`, `ts-node`, `nodemon`, `@types/node`, `@types/express`, `@types/cors`
- `npx tsc --init`
- Create folder structure per System Design:
  ```
  server/src/
    ├── index.ts
    ├── config/
    ├── modules/
    ├── shared/
    └── middleware/
  ```

**Deliverable:** `npm run dev` starts server on port 3000.

**Resource:** Express "Hello World" tutorial (10 min).

### Day 2 — TypeScript Server + Health Check

**Tasks:**
- Write `server/src/index.ts` with Express app
- Add `GET /health` returning `{status: "ok"}`
- Add `tsconfig.json` with `outDir: "./dist"`
- Add scripts: `dev`, `build`, `start`
- Test with `curl http://localhost:3000/health`

**Deliverable:** Health endpoint works locally.

**Resource:** Express + TypeScript setup guide.

### Day 3 — MongoDB Connection

**Tasks:**
- Create cluster on MongoDB Atlas
- Whitelist your IP (and `0.0.0.0/0` for Render)
- Create database user
- Get connection string
- Add `.env` with `MONGODB_URI`
- Write `server/src/config/db.ts` with `connectDB()`
- Call `connectDB()` on server start
- Add connection event logging

**Deliverable:** Server logs "MongoDB connected" on start.

**Resource:** MongoDB Atlas "Connect your app" tutorial (15 min).

### Day 4 — Error Handling + Logging

**Tasks:**
- Write `server/src/shared/logger.ts` (simple JSON logger)
- Write `server/src/shared/errors.ts` (custom error classes)
- Write `server/src/middleware/errorHandler.ts`
- Add `express.json()` middleware
- Add request logging middleware (log method, path, latency)
- Update `/health` to include `mongo: 'up'`

**Deliverable:** Errors return JSON envelope, logs are structured.

### Day 5 — Deploy to Render

**Tasks:**
- Push code to GitHub
- Create new Web Service on Render
- Connect GitHub repo, select `server/` as root
- Add env vars (`MONGODB_URI`, `PORT`)
- Deploy
- Test `https://your-api.onrender.com/health`

**Deliverable:** Live health check on public URL.

**Resource:** Render "Deploy Node.js" guide (15 min).

### Day 6 — Keep-Alive Cron

**Tasks:**
- Sign up at cron-job.org (free)
- Create job: GET `https://your-api.onrender.com/health` every 10 min
- Verify in Render logs that pings arrive

**Deliverable:** Server never sleeps > 10 min.

### Day 7 — Review + Buffer

**Tasks:**
- Fix any issues from the week
- Add README with setup instructions
- Add `.env.example`
- Add `.gitignore` (node_modules, dist, .env)

**Milestone 1 Acceptance:**
- [ ] `curl https://your-api.onrender.com/health` returns `{status: "ok", mongo: "up"}`
- [ ] Logs visible in Render dashboard
- [ ] Cron pinging every 10 min

**If not passing:** Don't move to Week 2. Debug.

---

## 5. Week 2 — AI + Ticket Creation

**Theme:** Build the brain. AI extracts tickets from natural language.

**Goal:** `POST /api/v1/chat` creates a ticket from "I want the printed copy of X".

### Day 8 — Gemini Client

**Tasks:**
- `npm install @google/generative-ai`
- Write `server/src/modules/ai/ai.client.ts`
- Initialize Gemini with API key from env
- Write a test script: `npx ts-node scripts/test-gemini.ts` that sends "Hello" and logs response
- Handle errors (quota, network)

**Deliverable:** Gemini responds to a test prompt.

**Resource:** Gemini API quickstart (10 min).

### Day 9 — Prompt Engineering

**Tasks:**
- Write `server/src/modules/ai/prompts.ts` with extraction prompt
- Test with 10 phrasings in a script:
  - "I want the printed copy of Atomic Habits"
  - "Can you print me Harry Potter?"
  - "Do you have The Alchemist?"
  - "I'd like to reserve Rich Dad Poor Dad"
  - etc.
- Iterate prompt until JSON output is consistent
- Add few-shot examples in prompt

**Deliverable:** 10/10 test phrasings return correct JSON.

**Resource:** Prompt engineering basics (DeepLearning.AI free course, 1 hour).

### Day 10 — Ticket Model + Counter

**Tasks:**
- Write `server/src/modules/tickets/ticket.model.ts` (per DB Schema)
- Write `server/src/modules/tickets/counter.model.ts`
- Write `nextTicketNumber()` in `ticket.service.ts`
- Test by creating 5 tickets in a script — verify `A01`–`A05`

**Deliverable:** Ticket numbers generate correctly and are unique.

### Day 11 — AI Service

**Tasks:**
- Write `server/src/modules/ai/ai.service.ts`
- Function `extractTicketFromMessage(message)` returns typed object
- Add confidence threshold logic
- Add response generation (templated if ticket, LLM if general)
- Handle AI failures gracefully

**Deliverable:** Service extracts and responds.

### Day 12 — Chat Endpoint

**Tasks:**
- Write `server/src/modules/chat/chat.routes.ts` and `chat.service.ts`
- `POST /api/v1/chat` accepts `{message, sessionId?, language?}`
- Flow: extract → create ticket → respond
- Return per API Spec
- Test with Postman

**Deliverable:** Postman call creates ticket in MongoDB.

### Day 13 — Rate Limiting + Validation

**Tasks:**
- `npm install express-rate-limit zod`
- Add rate limiter: 20/min per IP on `/api/v1/chat`
- Add Zod schemas for request validation
- Return proper error codes

**Deliverable:** 21st request in 1 min returns 429.

### Day 14 — Deploy + Review

**Tasks:**
- Push to GitHub
- Render auto-deploys
- Test live `POST /api/v1/chat` from Postman
- Verify ticket in MongoDB Atlas

**Milestone 2 Acceptance:**
- [ ] 20 phrasings produce correct tickets
- [ ] Ticket numbers are sequential (A01, A02, ...)
- [ ] Confidence threshold works (< 0.6 asks clarifying question)
- [ ] Rate limit triggers at 21st request
- [ ] Invalid input returns 400 with error code
- [ ] Live deployment works

**Demo:** Show a friend — they speak, ticket appears in DB.

---

## 6. Week 3 — Admin API + Auth

**Theme:** Complete the backend. Admin can log in and manage tickets.

**Goal:** Full ticket CRUD behind JWT auth.

### Day 15 — User Model + Auth Service

**Tasks:**
- Write `server/src/modules/auth/user.model.ts` (per DB Schema)
- Write `hashPassword()` and `verifyPassword()` (bcryptjs cost 12)
- Write `generateToken()` and `verifyToken()` (jsonwebtoken)
- Write seed script for initial admin

**Deliverable:** Admin user can be seeded into DB.

### Day 16 — Auth Endpoints

**Tasks:**
- `POST /api/v1/auth/login` (validate, compare, return JWT)
- `GET /api/v1/auth/me` (protected)
- `POST /api/v1/auth/logout` (log event)
- Auth middleware: `requireAuth`, `requireRole('admin')`
- Test with Postman

**Deliverable:** Login returns token, protected route rejects without it.

### Day 17 — Ticket CRUD Endpoints

**Tasks:**
- `GET /api/v1/tickets` with filters, pagination, search
- `GET /api/v1/tickets/:id` (accepts ObjectId or ticketNumber)
- `PATCH /api/v1/tickets/:id` with transition validation
- `DELETE /api/v1/tickets/:id` (soft delete → cancelled)
- `GET /api/v1/tickets/stats`

**Deliverable:** Full CRUD via Postman.

### Day 18 — Transition Validation

**Tasks:**
- Write `VALID_TRANSITIONS` map
- Validate in service layer
- Return `409 INVALID_TRANSITION` on bad transition
- Add audit log entry on every change
- Test all transitions

**Deliverable:** `new → delivered` rejected, `new → in_progress` accepted.

### Day 19 — Session Memory

**Tasks:**
- Write `server/src/modules/chat/session.model.ts`
- Save user + assistant messages per session
- TTL 24h (index)
- `GET /api/v1/chat/session/:id` returns history
- Cap at 50 messages per session

**Deliverable:** Chat history persists within session.

### Day 20 — Users Endpoints

**Tasks:**
- `GET /api/v1/users` (admin only)
- `POST /api/v1/users` (create manager/admin)
- `DELETE /api/v1/users/:id`
- Duplicate email returns `409 DUPLICATE_EMAIL`

**Deliverable:** Admin can create managers.

### Day 21 — Review + Deploy

**Tasks:**
- Push, deploy
- Run full Postman collection
- Fix bugs
- Save Postman collection to repo (`docs/postman.json`)

**Milestone 3 Acceptance:**
- [ ] Login works on live URL
- [ ] Manager cannot PATCH tickets (403)
- [ ] Invalid transition returns 409
- [ ] Pagination works (page 2 returns different results)
- [ ] Search finds tickets by book title
- [ ] Stats endpoint returns correct counts
- [ ] Session TTL working (check Atlas after 24h)

---

## 7. Week 4 — Frontend Core (Customer Chat)

**Theme:** Give customers a UI. Voice + text → ticket.

**Goal:** A customer can speak and see a ticket confirmation.

### Day 22 — React Setup

**Tasks:**
- `cd client && npm create vite@latest . -- --template react-ts`
- Install: `axios`, `react-router-dom`, `react-query`, `socket.io-client`, `tailwindcss`
- Configure Tailwind with custom colors from Wireframes doc
- Add Inter font (Google Fonts)
- Set up `.env` with `VITE_API_URL`

**Deliverable:** Blank React app with Tailwind working.

### Day 23 — Layout + Theme

**Tasks:**
- Create `CustomerPage.tsx`
- Header with logo + language selector
- Hero section with mic button (visual only)
- Input bar at bottom
- Tailwind tokens for ink/paper/sage/rust colors
- Mobile-responsive

**Deliverable:** Static UI matches wireframe.

### Day 24 — Text Chat

**Tasks:**
- Build `ChatBubble.tsx`
- Build `InputBar.tsx`
- Wire to `POST /api/v1/chat` with axios
- Display user message + AI reply
- Show ticket card inline
- Loading state

**Deliverable:** Type "printed copy of Atomic Habits" → ticket appears.

### Day 25 — Voice Input (ASR)

**Tasks:**
- Build `useVoiceInput.ts` hook
- Use `webkitSpeechRecognition`
- Continuous mode, `interimResults: true`
- Handle permissions, errors, unsupported browsers
- Live transcript display
- Stop on silence (2s)

**Deliverable:** Speak → transcript appears → sends automatically.

**Resource:** MDN Web Speech API docs.

### Day 26 — Voice Output (TTS)

**Tasks:**
- Build `useVoiceOutput.ts` hook
- Use `speechSynthesis`
- Speak AI replies
- Language-aware (en/si/ta)
- Mute toggle
- Handle browser quirks (Chrome needs user gesture)

**Deliverable:** AI replies are spoken aloud.

### Day 27 — Language Selector

**Tasks:**
- Dropdown in header
- Options: English, සිංහල, தமிழ்
- Persist in localStorage
- Pass to API + ASR + TTS
- Test with Sinhala phrase (even if accuracy is low, verify it works)

**Deliverable:** Language switch works end-to-end.

### Day 28 — Polish + Deploy

**Tasks:**
- Add animations (mic pulse, bubble slide-in)
- Add error toasts
- Add empty state
- Deploy to Vercel
- Test on real phone

**Milestone 4 Acceptance:**
- [ ] Speak "I want printed copy of Atomic Habits" → ticket created
- [ ] AI reply spoken aloud
- [ ] Ticket card appears inline
- [ ] Works on mobile Chrome
- [ ] Works on desktop Safari
- [ ] Live URL shared with a friend, they can use it

**Demo:** Record a 30s screen capture. This is your portfolio piece.

---

## 8. Week 5 — Admin Dashboard + Real-Time

**Theme:** Shop staff can see and manage tickets as they arrive.

**Goal:** New ticket appears on admin dashboard in < 1 second.

### Day 29 — Auth Flow (Frontend)

**Tasks:**
- Build `LoginPage.tsx`
- Auth context (store JWT in localStorage)
- Protected route wrapper
- Redirect to `/admin` on success
- Role-based redirect (`/admin` vs `/manager`)

**Deliverable:** Login works, protected routes redirect.

### Day 30 — Admin Layout

**Tasks:**
- Build `AdminPage.tsx` with sidebar + top bar
- Stats row (4 cards)
- Fetch stats from `GET /api/v1/tickets/stats`
- Mobile responsive (hamburger)

**Deliverable:** Dashboard layout matches wireframe.

### Day 31 — Ticket List

**Tasks:**
- `TicketList.tsx`, `TicketRow.tsx`
- Fetch from `GET /api/v1/tickets`
- Status pill (colored per status)
- Relative time ("2m ago")
- Pagination
- Filters (status, type, search)
- URL query params sync

**Deliverable:** List shows tickets, filters work.

### Day 32 — Socket.io Client

**Tasks:**
- Set up `socket.ts` helper
- Connect with JWT in handshake
- Emit `join:admin` on connect
- Listen for `ticket:new`, `ticket:updated`, `ticket:deleted`
- Update React Query cache on events
- Handle reconnect

**Deliverable:** Open two browsers — create ticket in one, appears in other instantly.

**Resource:** Socket.io client docs (20 min).

### Day 33 — Ticket Detail Modal

**Tasks:**
- `TicketDetail.tsx` modal
- Show all fields, status timeline, audit log
- Action buttons (valid transitions only)
- Notes editor with save
- Optimistic updates
- `Esc` closes

**Deliverable:** Click row → modal opens, can change status.

### Day 34 — Notifications

**Tasks:**
- `NotificationBell.tsx` with dropdown
- Badge count for unread
- Sound on new ticket (`notification.mp3`)
- Browser notification via `Notification API`
- Request permission on first login
- Manager view: read-only mode banner

**Deliverable:** Sound plays + notification appears on new ticket.

### Day 35 — Polish + Deploy

**Tasks:**
- Loading skeletons
- Error states
- Empty states
- Confirm dialog for cancel
- Deploy to Vercel
- Test with real phone + laptop (multi-device real-time)

**Milestone 5 Acceptance:**
- [ ] Admin logs in, sees tickets
- [ ] New ticket appears in < 1s on all open browsers
- [ ] Sound plays on new ticket
- [ ] Admin can change status
- [ ] Manager cannot change status (buttons hidden)
- [ ] Pagination works with filters
- [ ] Mobile layout usable

**Demo:** Two phones + one laptop, all showing live ticket updates.

---

## 9. Week 6 — Telegram, Polish, Deploy

**Theme:** Ship it. Real notifications, real users, real deployment.

**Goal:** A bookshop could actually use this.

### Day 36 — Telegram Bot

**Tasks:**
- Write `server/src/modules/notifications/telegram.ts`
- On new ticket → send message to configured chat
- Format message (per System Design)
- Toggle via `feature_telegram` flag
- Test send from `/admin/settings` ("Send Test Message")

**Deliverable:** Telegram pings manager on every new ticket.

**Resource:** Telegram Bot API docs (20 min).

### Day 37 — Settings Page

**Tasks:**
- `SettingsPage.tsx`
- Feature flags UI (toggles)
- Telegram config (bot token, chat ID) — read-only display (set via env)
- AI status display (from `/health`)
- System info (version, uptime, sockets)

**Deliverable:** Admin can toggle features live.

### Day 38 — Manager Dashboard

**Tasks:**
- `ManagerPage.tsx` (reuse admin components, hide actions)
- Read-only banner
- Real-time ticket feed
- No sidebar links to settings/users

**Deliverable:** Manager sees live feed, no edit capability.

### Day 39 — Health Banner + Graceful Degradation

**Tasks:**
- On `/health` fail → show "AI degraded" banner
- Disable mic button when AI down
- Show retry button
- Log AI errors to `system_flags`
- Auto-recover when health returns

**Deliverable:** Kill Gemini key → banner appears → restore → banner hides.

### Day 40 — Rate Limiting + Security Headers

**Tasks:**
- `npm install helmet`
- Add security headers
- Verify CORS only allows your Vercel domain
- Test rate limits on live
- Add `Idempotency-Key` support to `POST /api/v1/chat`

**Deliverable:** Helmet headers present, rate limits enforced live.

### Day 41 — End-to-End Testing

**Tasks:**
- Write Playwright tests:
  - Customer creates ticket via text
  - Admin logs in, sees ticket
  - Admin updates status
  - Invalid transition rejected
- Run in CI (GitHub Actions optional)
- Manual test on 3 devices

**Deliverable:** Automated E2E tests pass.

### Day 42 — Final Deploy + Documentation

**Tasks:**
- Final deploy: Vercel (client) + Render (server) + Atlas (DB)
- Update README with:
  - Live URL
  - Screenshots
  - Setup instructions
  - Architecture diagram
  - Tech stack
  - License
- Add `docs/` folder with all spec documents
- Post on LinkedIn / portfolio

**Milestone 6 Acceptance:**
- [ ] Public URL works on mobile + desktop
- [ ] Telegram alerts arrive
- [ ] AI degraded banner works
- [ ] E2E tests pass
- [ ] README complete
- [ ] Zero ongoing cost

**🎉 SHIP IT.**

---

## 10. Post-Launch (Ongoing)

### Week 7+ — Improvements

| Task | Priority | Notes |
|------|----------|-------|
| Add Sinhala/Tamil prompt tuning | High | If customers use them |
| Add book cover image upload | Medium | Customer sends photo |
| Multi-branch support (tenantId) | Medium | If scaling |
| WhatsApp integration | Low | Alternative to Telegram |
| Analytics dashboard | Low | Peak hours, popular books |
| PWA offline mode | Low | Install on phone |
| SMS notifications | Low | Paid, only if needed |

---

## 11. Daily Workflow

**Every coding day:**

1. **Morning (10 min):** Pull latest, review yesterday's notes, pick today's task
2. **Focus block 1 (2 hrs):** Build the day's deliverable
3. **Break (15 min):** Walk, water, no screens
4. **Focus block 2 (2 hrs):** Finish, test, commit
5. **End of day (15 min):**
   - Commit with clear message (`feat: add chat endpoint`)
   - Push to GitHub
   - Update a `PROGRESS.md` file with what's done
   - Write tomorrow's first task on a sticky note

**Commit message convention:**

```
feat: add ticket creation endpoint
fix: correct rate limit window
docs: update API spec
refactor: extract AI service
test: add ticket transition tests
chore: update dependencies
```

**Branch strategy (simple):**

- `main` — production, always deployable
- `dev` — work here, merge to main Friday
- `feat/xxx` — for larger features

For solo beginner: just work on `main`, commit often.

---

## 12. Learning Resources (Mapped)

| Week | Topic | Resource | Time |
|------|-------|----------|------|
| Pre | Git basics | "Git in 100 seconds" YouTube | 5 min |
| 1 | Express + TS | "Express TypeScript setup" freeCodeCamp | 30 min |
| 1 | MongoDB Atlas | Atlas "Get Started" official | 20 min |
| 2 | Gemini API | Google AI Studio quickstart | 15 min |
| 2 | Prompt engineering | DeepLearning.AI "ChatGPT Prompt Eng" | 1 hr |
| 3 | JWT auth | "JWT Auth in Node" Traversy Media | 45 min |
| 4 | React + Vite | Vite docs "Getting Started" | 15 min |
| 4 | Web Speech API | MDN SpeechRecognition | 30 min |
| 5 | Socket.io | Socket.io "Get Started" | 30 min |
| 5 | React Query | TanStack Query "Quick Start" | 30 min |
| 6 | Telegram Bot | Telegram Bot API "Getting Started" | 20 min |
| 6 | Playwright | Playwright "Intro" | 30 min |

**Total learning time:** ~6 hours spread across 6 weeks.

---

## 13. Risk Mitigation Plan

| Risk | When It Hits | Response |
|------|-------------|----------|
| Gemini quota exhausted | Week 2 | Add second key, add fallback |
| Render sleeps mid-demo | Week 4+ | Cron keeps warm; test before demo |
| Voice not working on Safari | Week 4 | Test early on real device |
| MongoDB 512MB full | Month 6+ | Archive delivered tickets |
| Socket.io disconnect | Week 5 | Auto-reconnect + state sync |
| Lost motivation | Any week | Ship Friday demo to a friend |
| Stuck > 4 hours | Any day | Ask, simplify, move on |

---

## 14. Definition of Done

A task is "done" when:

- [ ] Code written and works locally
- [ ] Manual test passes
- [ ] Committed with clear message
- [ ] Pushed to GitHub
- [ ] Deployed (if it affects deployed features)
- [ ] Documented (README or inline comment if non-obvious)

A week is "done" when:

- [ ] Milestone acceptance criteria all pass
- [ ] Demo shown to at least 1 person
- [ ] Deployed and accessible

A project is "done" when:

- [ ] All 6 milestones pass
- [ ] Public URL works
- [ ] README complete
- [ ] A real shop could use it
- [ ] You're proud to show it

---

## 15. Weekly Retrospective Template

Every Friday, answer:

1. **What shipped this week?**
2. **What broke or slowed me down?**
3. **What did I learn?**
4. **What will I do differently next week?**
5. **Am I on track for the milestone?**

Keep in `PROGRESS.md` — future-you will thank present-you.

---

## 16. Final Checklist Before "Launch"

- [ ] SRS written
- [ ] System Design written
- [ ] API Spec written
- [ ] DB Schema written
- [ ] Wireframes written
- [ ] Roadmap written
- [ ] Server deployed
- [ ] Client deployed
- [ ] MongoDB Atlas configured
- [ ] Telegram bot working
- [ ] Cron keeping server warm
- [ ] E2E tests pass
- [ ] README complete
- [ ] Demo recorded
- [ ] Shared on portfolio / LinkedIn

---

## 17. Cost Breakdown (Final)

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby | $0 |
| Render | Free | $0 |
| MongoDB Atlas | M0 | $0 |
| Google Gemini | Free tier | $0 |
| Telegram Bot | Free | $0 |
| cron-job.org | Free | $0 |
| GitHub | Free | $0 |
| Domain (optional) | `.vercel.app` subdomain | $0 |
| **Total** | | **$0** |
