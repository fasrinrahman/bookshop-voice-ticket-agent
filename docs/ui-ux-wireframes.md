# UI/UX Wireframes Document

## Bookshop Voice Ticket Agent (BVTA)

**Version:** 1.0
**Framework:** React + TypeScript + TailwindCSS
**Design System:** Custom (mobile-first, accessible)
**Companion to:** SRS v1.0, System Design v1.0, API Spec v1.0, DB Schema v1.0

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| **Mobile-first** | Customers use phones; design for 375px width first |
| **Voice-primary, text-always-available** | Mic is the hero, but text never hidden |
| **Zero-training UI** | A customer should use it without explanation |
| **Real-time feedback** | Every action shows immediate state change |
| **Accessible** | WCAG AA contrast, keyboard nav, ARIA labels |
| **Fast perception** | Skeleton loaders, optimistic updates |
| **Multilingual-ready** | EN/SI/TA switch, text expandable 30% |
| **Calm palette** | Bookshop = warm, paper, ink, sage |

---

## 2. Design System

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--ink-900` | `#1A1A1A` | Primary text |
| `--ink-700` | `#3D3D3D` | Secondary text |
| `--ink-400` | `#8A8A8A` | Muted text |
| `--paper-50` | `#FAF7F2` | Page background |
| `--paper-100` | `#F2EDE4` | Card background |
| `--paper-200` | `#E5DDD0` | Borders |
| `--sage-500` | `#7A9E7E` | Primary action |
| `--sage-600` | `#5F8264` | Hover |
| `--sage-100` | `#E8F0E9` | Soft success bg |
| `--amber-500` | `#E0A458` | Warning |
| `--amber-100` | `#FBEFDC` | Warning bg |
| `--rust-500` | `#C05746` | Error / destructive |
| `--rust-100` | `#F7E0DC` | Error bg |
| `--sky-500` | `#5B8DB8` | Info |
| `--sky-100` | `#E1ECF5` | Info bg |

### 2.2 Typography

| Token | Font | Size | Weight | Line |
|-------|------|------|--------|------|
| `text-display` | Inter | 32px | 700 | 1.2 |
| `text-h1` | Inter | 24px | 600 | 1.3 |
| `text-h2` | Inter | 20px | 600 | 1.4 |
| `text-body` | Inter | 16px | 400 | 1.6 |
| `text-small` | Inter | 14px | 400 | 1.5 |
| `text-tiny` | Inter | 12px | 500 | 1.4 |
| `text-mono` | JetBrains Mono | 14px | 500 | 1.4 |

**Sinhala/Tamil:** Noto Sans Sinhala, Noto Sans Tamil fallback.

### 2.3 Spacing Scale

`4, 8, 12, 16, 24, 32, 48, 64` (px) — Tailwind default.

### 2.4 Radius

| Token | Value |
|-------|-------|
| `rounded-sm` | 6px |
| `rounded-md` | 10px |
| `rounded-lg` | 16px |
| `rounded-full` | 9999px |

### 2.5 Shadows

| Token | Value |
|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` |
| `shadow-lg` | `0 12px 32px rgba(0,0,0,0.12)` |

### 2.6 Status Colors

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| `new` | `--rust-100` | `--rust-500` | `--rust-500` |
| `in_progress` | `--amber-100` | `--amber-500` | `--amber-500` |
| `ready` | `--sky-100` | `--sky-500` | `--sky-500` |
| `delivered` | `--sage-100` | `--sage-600` | `--sage-500` |
| `cancelled` | `#EEE` | `--ink-400` | `--ink-400` |

---

## 3. Site Map

```
/
├── /                       Customer Chat (public)
│   └── Voice / Text intake
│
├── /login                  Admin/Manager Login
│
├── /admin                  Admin Dashboard (protected)
│   ├── /admin              Ticket list + filters
│   ├── /admin/tickets/:id  Ticket detail modal
│   └── /admin/settings     User mgmt, flags
│
└── /manager                Manager Dashboard (protected)
    └── Read-only ticket feed
```

---

## 4. Customer Chat Screen (`/`)

### 4.1 Layout — Desktop (≥ 768px)

```
┌────────────────────────────────────────────────────────────┐
│  📚 Lanka Books                         [EN ▾]  [ ? Help ] │  ← Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    ┌──────────────────────┐                │
│                    │                      │                │
│                    │   🎙️  Tap to Speak   │                │  ← Hero mic
│                    │                      │                │
│                    └──────────────────────┘                │
│                                                            │
│              "Or type your request below"                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  💬 Conversation                                           │
│                                                            │
│  ┌─────────────────────────────────────────────┐           │
│  │ 🤖 Hi! I can help you request printed       │           │  ← AI msg
│  │    copies, reserve books, or check stock.   │           │
│  │    10:29 AM                                 │           │
│  └─────────────────────────────────────────────┘           │
│                                                            │
│                        ┌──────────────────────────┐         │
│                        │ I want the printed copy  │         │  ← User msg
│                        │ of Atomic Habits         │         │
│                        │              10:30 AM    │         │
│                        └──────────────────────────┘         │
│                                                            │
│  ┌─────────────────────────────────────────────┐           │
│  │ 🤖 Got it! Ticket A47 created for           │           │  ← Ticket reply
│  │    "Atomic Habits" printed copy.            │           │
│  │    We'll notify you when it's ready.        │           │
│  │    ┌────────────────────────────────┐       │           │
│  │    │ 🎫 Ticket #A47                  │       │           │  ← Ticket card
│  │    │ Atomic Habits                   │       │           │
│  │    │ Printed Copy · New              │       │           │
│  │    └────────────────────────────────┘       │           │
│  │    10:30 AM                                 │           │
│  └─────────────────────────────────────────────┘           │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  ┌────┐  │
│  │ Type your message...                          │  │ ➤  │  │  ← Input bar
│  └──────────────────────────────────────────────┘  └────┘  │
│                     🎙️                                      │  ← Mic (mobile)
└────────────────────────────────────────────────────────────┘
```

### 4.2 Layout — Mobile (< 768px)

```
┌─────────────────────────┐
│ 📚 Lanka Books    [EN▾] │  ← Compact header
├─────────────────────────┤
│                         │
│       ┌─────────┐       │
│       │         │       │
│       │  🎙️     │       │  ← Large mic (60% width)
│       │  Tap    │       │
│       │ to Speak│       │
│       └─────────┘       │
│                         │
│   Or type below ↓       │
│                         │
├─────────────────────────┤
│ 💬 Conversation         │
│                         │
│ ┌─────────────────────┐ │
│ │ 🤖 Hi! I can help…  │ │
│ └─────────────────────┘ │
│                         │
│       ┌───────────────┐ │
│       │ I want the…   │ │
│       │      10:30 AM │ │
│       └───────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 🤖 Got it! Ticket…  │ │
│ │ ┌─────────────────┐ │ │
│ │ │ 🎫 A47          │ │ │
│ │ │ Atomic Habits   │ │ │
│ │ │ Printed · New   │ │ │
│ │ └─────────────────┘ │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ [Type here...]    [➤]   │  ← Sticky bottom
└─────────────────────────┘
```

### 4.3 States

| State | Visual | Behavior |
|-------|--------|----------|
| **Idle** | Gray mic, "Tap to Speak" | Ready |
| **Listening** | Pulsing sage ring, animated waveform | Capture audio |
| **Processing** | Spinner + "Thinking..." | Awaiting AI |
| **Success** | Ticket card slides in, TTS speaks | Confirm |
| **Error** | Red toast + retry button | Recover |
| **No mic support** | Banner: "Voice unavailable, please type" | Fallback |

### 4.4 Component Notes

**Mic Button (Hero):**
- Size: 160px desktop, 120px mobile
- Icon: 🎙️ (48–64px)
- Ring animation on listen: `scale(1.0 → 1.15)` 1.5s infinite
- Disabled when AI unavailable (gray, tooltip)
- ARIA: `aria-label="Start voice input"`, `aria-pressed`

**Transcript Display (live):**
- Appears above mic during listen
- Interim text: `--ink-400` italic
- Final text: `--ink-900` normal
- Max 3 lines, ellipsis beyond

**Chat Bubble:**
- User: right-aligned, `--sage-500` bg, white text, rounded-lg
- AI: left-aligned, `--paper-100` bg, `--ink-900` text
- Timestamp: `text-tiny`, `--ink-400`, below bubble
- Max-width: 85% desktop, 92% mobile

**Ticket Card (inline in AI msg):**
- Border-left: 4px solid `--rust-500` (new status)
- Background: white
- Padding: 12px
- Ticket number: `text-mono`, bold
- Status pill: colored per status
- Clicking → opens confirmation modal (customer can copy number)

**Input Bar:**
- Sticky bottom
- Rounded-full
- Placeholder: "Type your message..."
- Enter sends; Shift+Enter newline
- Char counter appears > 450 chars

**Language Selector:**
- Dropdown in header
- Options: English, සිංහල, தமிழ்
- Persists in localStorage
- Changes both ASR and TTS language

### 4.5 Interaction Flow

```
User taps mic
   │
   ▼
[Permission prompt if first time]
   │
   ▼
┌─────────────────────────┐
│ State: LISTENING        │
│ - Mic pulses            │
│ - Transcript appears    │
│ - Stop button visible   │
└─────────────────────────┘
   │
   ▼ (silence detected OR user stops)
┌─────────────────────────┐
│ State: PROCESSING       │
│ - Spinner               │
│ - Transcript frozen     │
└─────────────────────────┘
   │
   ▼ (POST /api/v1/chat)
┌─────────────────────────┐
│ State: RESPONDING       │
│ - AI bubble appears     │
│ - Typewriter animation  │
│ - TTS speaks reply      │
│ - Ticket card if any    │
└─────────────────────────┘
   │
   ▼ (after 2s)
[Back to IDLE]
```

### 4.6 Accessibility

- Keyboard: `Tab` to mic, `Space` to start/stop
- Screen reader: announces "Listening", "Processing", "Response received"
- High contrast: meets WCAG AA (4.5:1)
- Reduced motion: respects `prefers-reduced-motion`
- Focus rings: 2px `--sage-500` outline

---

## 5. Admin Login Screen (`/login`)

### 5.1 Layout — Desktop

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│              ┌────────────────────────────┐                │
│              │                            │                │
│              │   📚 BVTA Admin            │                │
│              │   ────────────────         │                │
│              │                            │                │
│              │   Email                    │                │
│              │   ┌──────────────────────┐ │                │
│              │   │ admin@bookshop.lk    │ │                │
│              │   └──────────────────────┘ │                │
│              │                            │                │
│              │   Password                 │                │
│              │   ┌──────────────────────┐ │                │
│              │   │ ••••••••••        👁 │ │                │
│              │   └──────────────────────┘ │                │
│              │                            │                │
│              │   ┌──────────────────────┐ │                │
│              │   │       Sign In         │ │                │
│              │   └──────────────────────┘ │                │
│              │                            │                │
│              │   Forgot password?         │                │
│              │                            │                │
│              └────────────────────────────┘                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Layout — Mobile

```
┌─────────────────────┐
│                     │
│    📚 BVTA Admin    │
│                     │
│    Email            │
│  ┌───────────────┐  │
│  │               │  │
│  └───────────────┘  │
│                     │
│    Password         │
│  ┌───────────────┐  │
│  │        ••• 👁 │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │    Sign In     │  │
│  └───────────────┘  │
│                     │
│  Forgot password?   │
│                     │
└─────────────────────┘
```

### 5.3 States

| State | Behavior |
|-------|----------|
| Idle | Form ready |
| Loading | Button shows spinner, inputs disabled |
| Error | Red banner: "Invalid email or password" |
| Rate limited | Banner: "Too many attempts. Try again in 42s" |
| Success | Redirect to `/admin` or `/manager` based on role |

### 5.4 Component Notes

- Logo: 40px emoji + text
- Card: max-width 400px, centered, `shadow-md`
- Input height: 48px (touch-friendly)
- Password toggle: eye icon, `aria-label`
- Button: full-width, `--sage-500`, hover `--sage-600`
- Error banner: `--rust-100` bg, `--rust-500` text, role="alert"

---

## 6. Admin Dashboard (`/admin`)

### 6.1 Layout — Desktop

```
┌────────────────────────────────────────────────────────────────────────┐
│  📚 BVTA Admin      [🔍 Search]        🔔3      Nimal ▾     [Logout]  │  ← Top bar
├──────────────┬─────────────────────────────────────────────────────────┤
│              │                                                         │
│  SIDEBAR     │  Dashboard                                              │
│              │                                                         │
│  ▸ Tickets   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  ▸ Settings  │  │ Today    │ │ Pending  │ │ Ready    │ │ Delivered│   │
│  ▸ Users     │  │   12     │ │    3     │ │    2     │ │    8     │   │
│              │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ─────────   │                                                         │
│  🟢 AI: OK   │  Filters                                                │
│              │  [Status ▾] [Type ▾] [Date ▾]  [Clear]                  │
│              │                                                         │
│              │  ┌───────────────────────────────────────────────────┐  │
│              │  │ A47  Atomic Habits              new      2m ago  │  │
│              │  │      Printed Copy · EN · 95%                       │  │
│              │  ├───────────────────────────────────────────────────┤  │
│              │  │ A46  Harry Potter               in_progress  15m  │  │
│              │  │      Reservation · EN · 88%                        │  │
│              │  ├───────────────────────────────────────────────────┤  │
│              │  │ A45  The Alchemist              ready    1h       │  │
│              │  │      Inquiry · SI · 72%                            │  │
│              │  └───────────────────────────────────────────────────┘  │
│              │                                                         │
│              │  [1] [2] [3] ... [8]                                    │
│              │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
```

### 6.2 Layout — Mobile

```
┌─────────────────────────┐
│ ☰  📚 BVTA    🔔3  👤 │
├─────────────────────────┤
│ 📊 Today: 12  Pending:3 │
├─────────────────────────┤
│ [Status▾] [Type▾] [📅] │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ A47  new      2m    │ │
│ │ Atomic Habits       │ │
│ │ Printed Copy · 95%  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ A46  in_progress    │ │
│ │ Harry Potter        │ │
│ │ Reservation · 88%   │ │
│ └─────────────────────┘ │
│                         │
│ [Load more]             │
└─────────────────────────┘
```

### 6.3 Top Bar

| Element | Behavior |
|---------|----------|
| Logo | Click → `/admin` |
| Search | Fuzzy search bookTitle, ticketNumber |
| Bell 🔔 | Badge count = unread `ticket:new` events; click → dropdown |
| User menu | Name + role, click → Logout |
| Logout | Clears JWT, redirects to `/login` |

### 6.4 Sidebar (Desktop ≥ 1024px)

| Item | Route |
|------|-------|
| Tickets | `/admin` |
| Settings | `/admin/settings` |
| Users | `/admin/users` (admin only) |
| AI Status | Indicator: 🟢 OK / 🔴 Degraded |

Collapses to hamburger on mobile.

### 6.5 Stats Row

Four cards:
- **Today** — tickets created today
- **Pending** — status `new` + `in_progress`
- **Ready** — status `ready`
- **Delivered** — status `delivered` today

Numbers update in real-time via Socket.io `ticket:new` / `ticket:updated`.

### 6.6 Filters

| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select | All, new, in_progress, ready, delivered, cancelled |
| Type | Multi-select | printed_copy, reservation, inquiry |
| Date | Range | Today, 7d, 30d, custom |
| Search | Text | Debounced 300ms |

State stored in URL query params (`?status=new&type=printed_copy`).

### 6.7 Ticket List

**Row anatomy:**

```
┌──────────────────────────────────────────────────────────────┐
│ [A47]   Atomic Habits                      [new]      2m ago │
│         Printed Copy · EN · 95% · Kamal Silva                │
└──────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| Ticket number | Mono, bold, click → detail |
| Book title | Truncate > 40 chars |
| Status pill | Colored per status |
| Age | Relative ("2m ago", "1h ago") |
| Meta | Type · Lang · Confidence · Customer name |
| Row hover | `--paper-100` bg |
| Row click | Opens detail modal |

**Real-time updates:**
- New ticket → slide-in animation + sound
- Updated ticket → flash yellow briefly
- Deleted → fade out

### 6.8 Notification Bell Dropdown

```
┌─────────────────────────────┐
│ Notifications          [✕]  │
├─────────────────────────────┤
│ 🎫 A47 Atomic Habits        │
│    New ticket · 2m ago      │
├─────────────────────────────┤
│ 🎫 A46 Harry Potter         │
│    Status → in_progress     │
│    15m ago                  │
├─────────────────────────────┤
│ 🎫 A45 The Alchemist        │
│    New ticket · 1h ago      │
└─────────────────────────────┘
```

Max 10 recent, click → open ticket.

### 6.9 Empty State

```
┌────────────────────────────────────────┐
│                                        │
│              📭                        │
│                                        │
│      No tickets yet                    │
│                                        │
│   New customer requests will           │
│   appear here in real time.            │
│                                        │
└────────────────────────────────────────┘
```

### 6.10 Loading State (Skeleton)

```
┌───────────────────────────────────────┐
│ ▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓    ▓▓▓    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓ · ▓▓ · ▓▓%              │
├───────────────────────────────────────┤
│ ▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓    ▓▓▓    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓ · ▓▓ · ▓▓%              │
└───────────────────────────────────────┘
```

Use `animate-pulse` on gray blocks.

### 6.11 Error State

```
┌────────────────────────────────────────┐
│              ⚠️                        │
│   Couldn't load tickets                │
│   [Retry]                              │
└────────────────────────────────────────┘
```

---

## 7. Ticket Detail Modal (`/admin/tickets/:id`)

### 7.1 Layout — Desktop

```
┌─────────────────────────────────────────────────────────────────────┐
│  Ticket A47                                              [✕]        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📖 Atomic Habits                                                   │
│  Printed Copy · English · Confidence 95%                           │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  Status                                                             │
│  ● new ──○ in_progress ──○ ready ──○ delivered                    │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  Customer                                                           │
│  Name:  Kamal Silva                                                 │
│  Phone: +94 77 123 4567                                             │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  Notes                                                              │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Customer wants hardcover edition                           │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│  [Save Notes]                                                       │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  Actions                                                            │
│  [Mark In Progress] [Mark Ready] [Mark Delivered] [Cancel]         │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  History                                                            │
│  • created        → new            system       10:30 AM           │
│  • status_changed new → in_progress Nimal       10:35 AM           │
│                                                                     │
│  ─────────────────────────────────────────────────────            │
│                                                                     │
│  Created: 2026-01-15 10:30 AM                                       │
│  Updated: 2026-01-15 10:35 AM                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Layout — Mobile

Full-screen sheet (slides up from bottom).

### 7.3 Component Notes

**Status Timeline:**
- Dots connected by line
- Completed: filled `--sage-500`
- Current: filled `--amber-500` + pulse
- Future: hollow `--ink-400`
- Cancelled: entire row turns gray

**Action Buttons:**
- Only valid transitions shown as enabled
- Invalid transitions hidden (not disabled — cleaner)
- Cancel button: `--rust-500`, requires confirm dialog

**Notes:**
- Textarea, max 1000 chars
- Auto-save on blur (with "Saved ✓" toast)
- Explicit save button for clarity

**History:**
- Timeline list, newest first (or oldest — pick oldest first for audit)
- Actor shows name or "system"
- Time relative + absolute on hover

**Keyboard:**
- `Esc` closes modal
- `Tab` cycles through actions
- `Cmd+S` saves notes

### 7.4 Optimistic Updates

When admin clicks "Mark In Progress":
1. UI immediately shows new status
2. PATCH fires
3. On success → confirm
4. On failure → revert + error toast

### 7.5 Confirm Dialog (for Cancel)

```
┌──────────────────────────────────────┐
│  Cancel ticket A47?                  │
│                                      │
│  This cannot be undone.              │
│                                      │
│  [Keep]              [Cancel Ticket] │
└──────────────────────────────────────┘
```

Destructive button is `--rust-500`.

---

## 8. Manager Dashboard (`/manager`)

### 8.1 Differences from Admin

| Feature | Admin | Manager |
|---------|-------|---------|
| View tickets | ✅ | ✅ |
| Update status | ✅ | ❌ |
| Add notes | ✅ | ❌ |
| View users | ✅ | ❌ |
| View stats | ✅ | ✅ (read-only) |
| Settings | ✅ | ❌ |

### 8.2 Layout

Same as admin, but:
- No sidebar "Users" or "Settings"
- Ticket detail modal has no action buttons
- Read-only banner at top: "Manager view — read only"

---

## 9. Settings Screen (`/admin/settings`)

### 9.1 Sections

```
┌─────────────────────────────────────────────┐
│  Settings                                   │
├─────────────────────────────────────────────┤
│                                             │
│  Feature Flags                              │
│  ☑ AI Extraction Enabled                    │
│  ☑ Telegram Notifications                   │
│  ☐ Maintenance Mode                         │
│                                             │
│  ─────────────────────────────────────     │
│                                             │
│  Telegram                                   │
│  Bot Token: [••••••••••••••••••]            │
│  Chat ID:   [123456789]                     │
│  [Send Test Message]                        │
│                                             │
│  ─────────────────────────────────────     │
│                                             │
│  AI Status                                  │
│  Status:     🟢 Operational                 │
│  Last OK:    2 min ago                      │
│  Last Error: None                           │
│                                             │
│  ─────────────────────────────────────     │
│                                             │
│  System                                     │
│  Version:   1.0.0                           │
│  Uptime:    3d 4h                           │
│  Mongo:     🟢 Connected                    │
│  Sockets:   12                              │
│                                             │
└─────────────────────────────────────────────┘
```

### 9.2 User Management (`/admin/users`)

```
┌────────────────────────────────────────────────────────────┐
│  Users                                       [+ Add User]  │
├────────────────────────────────────────────────────────────┤
│  Nimal Perera    admin@bookshop.lk     Admin    [Edit] [X]│
│  Sunil Fernando  manager@bookshop.lk   Manager  [Edit] [X]│
└────────────────────────────────────────────────────────────┘
```

Add User modal:
- Email, Name, Password, Role
- Validates with same rules as API spec

---

## 10. Shared Components

### 10.1 Toast Notifications

```
┌─────────────────────────────────────┐
│ ✅  Ticket A47 updated              │
└─────────────────────────────────────┘
```

Position: bottom-right (desktop), bottom-center (mobile)
Duration: 4s auto-dismiss
Types: success (sage), error (rust), info (sky), warning (amber)

### 10.2 Confirmation Dialog

Standard pattern: title, message, cancel + confirm.
Destructive actions: confirm button in `--rust-500`.

### 10.3 Loading Spinner

```
    ◐
```

Size variants: sm (16px), md (24px), lg (48px).
Use with `aria-label="Loading"`.

### 10.4 Empty State Template

```
┌─────────────────────┐
│                     │
│       📭            │
│                     │
│   [Title]           │
│   [Description]     │
│                     │
│   [Primary Action]  │
│                     │
└─────────────────────┘
```

### 10.5 Status Pill

```
[ new ]     [ in_progress ]     [ ready ]     [ delivered ]     [ cancelled ]
```

Rounded-full, 24px tall, `text-tiny` uppercase.

### 10.6 Error Boundary

```
┌─────────────────────────────────────┐
│                                     │
│             ⚠️                      │
│                                     │
│   Something went wrong              │
│   We've logged the error.           │
│                                     │
│   [Reload Page]                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 11. Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| `sm` | ≥ 640px | Mobile landscape |
| `md` | ≥ 768px | Tablet |
| `lg` | ≥ 1024px | Desktop (sidebar appears) |
| `xl` | ≥ 1280px | Large desktop |

Customer chat: mobile-first, no sidebar ever.
Admin dashboard: sidebar hidden < 1024px.

---

## 12. Animation Guidelines

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Mic listening ring | Pulse scale | 1.5s | ease-in-out |
| Chat bubble enter | Slide up + fade | 200ms | ease-out |
| Ticket card enter | Slide right + fade | 250ms | ease-out |
| New ticket row | Slide from top | 300ms | ease-out |
| Status pill change | Background flash | 500ms | ease-out |
| Modal open | Fade + scale 0.95→1 | 200ms | ease-out |
| Modal close | Fade + scale 1→0.95 | 150ms | ease-in |
| Toast enter | Slide from right | 200ms | ease-out |

Respect `prefers-reduced-motion: reduce` — disable all except opacity.

---

## 13. Accessibility Checklist

- [ ] All interactive elements keyboard-reachable
- [ ] Focus visible (2px sage outline)
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast ≥ 4.5:1 (WCAG AA)
- [ ] Form errors associated with inputs via `aria-describedby`
- [ ] Live regions announce ticket creation, AI response
- [ ] Modal traps focus, `Esc` closes
- [ ] Skip-to-content link on admin dashboard
- [ ] Screen reader announces status changes
- [ ] Voice UI has text fallback always visible

---

## 14. File Structure (Client)

```
client/src/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Spinner.tsx
│   │   ├── StatusPill.tsx
│   │   ├── EmptyState.tsx
│   │   └── ConfirmDialog.tsx
│   ├── customer/
│   │   ├── MicButton.tsx
│   │   ├── VoiceWaveform.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── TicketCard.tsx
│   │   ├── InputBar.tsx
│   │   └── LanguageSelector.tsx
│   ├── admin/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── StatsRow.tsx
│   │   ├── TicketFilters.tsx
│   │   ├── TicketList.tsx
│   │   ├── TicketRow.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── StatusTimeline.tsx
│   │   ├── NotificationBell.tsx
│   │   └── AuditTimeline.tsx
│   └── auth/
│       └── LoginForm.tsx
│
├── pages/
│   ├── CustomerPage.tsx
│   ├── LoginPage.tsx
│   ├── AdminPage.tsx
│   ├── SettingsPage.tsx
│   ├── UsersPage.tsx
│   └── ManagerPage.tsx
│
├── hooks/
│   ├── useVoiceInput.ts
│   ├── useVoiceOutput.ts
│   ├── useTickets.ts
│   ├── useSocket.ts
│   ├── useAuth.ts
│   └── useNotification.ts
│
├── lib/
│   ├── api.ts
│   ├── socket.ts
│   ├── toast.ts
│   └── format.ts
│
├── styles/
│   └── tailwind.css
│
└── App.tsx
```

---

## 15. Tailwind Config Extensions

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#1A1A1A', 700: '#3D3D3D', 400: '#8A8A8A' },
        paper: { 50: '#FAF7F2', 100: '#F2EDE4', 200: '#E5DDD0' },
        sage: { 100: '#E8F0E9', 500: '#7A9E7E', 600: '#5F8264' },
        amber: { 100: '#FBEFDC', 500: '#E0A458' },
        rust: { 100: '#F7E0DC', 500: '#C05746' },
        sky: { 100: '#E1ECF5', 500: '#5B8DB8' },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Sinhala', 'Noto Sans Tamil', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '16px',
      },
    },
  },
};
```

---

## 16. Screen Inventory (Build Checklist)

| # | Screen | Route | Priority |
|---|--------|-------|----------|
| 1 | Customer Chat | `/` | P0 |
| 2 | Login | `/login` | P0 |
| 3 | Admin Dashboard | `/admin` | P0 |
| 4 | Ticket Detail Modal | `/admin/tickets/:id` | P0 |
| 5 | Manager Dashboard | `/manager` | P1 |
| 6 | Settings | `/admin/settings` | P2 |
| 7 | Users | `/admin/users` | P2 |
| 8 | 404 Page | `*` | P1 |

**P0** = ship blocking. **P1** = week 2. **P2** = nice-to-have.
