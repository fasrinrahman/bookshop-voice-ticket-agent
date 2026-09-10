# Database Schema Document

## Bookshop Voice Ticket Agent (BVTA)

**Version:** 1.0
**Database:** MongoDB Atlas (M0 Free Tier)
**Driver:** Mongoose 8.x
**Companion to:** SRS v1.0, System Design v1.0, API Spec v1.0

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| Single source of truth | Every ticket exists once |
| Speakable IDs | Ticket numbers are `A47`, not ObjectIds |
| TTL for ephemeral data | Sessions auto-expire after 24h |
| Soft deletes | Tickets are cancelled, never hard-deleted |
| Audit trail | Every status change is recorded |
| Idempotent writes | Duplicate retries never create duplicate tickets |
| Denormalize for reads | Store customer info on ticket, not referenced |
| Index for queries | Every query pattern has a matching index |

---

## 2. Collections Overview

| Collection | Purpose | Est. Size | Growth |
|------------|---------|-----------|--------|
| `tickets` | Customer requests | Small | ~50/day |
| `users` | Admin & manager accounts | Tiny | ~10 total |
| `sessions` | Chat session memory | Medium | TTL 24h |
| `counters` | Atomic sequences | Tiny | Static |
| `audit_logs` | Compliance trail | Medium | TTL 90d |
| `system_flags` | Feature toggles, health | Tiny | Static |

---

## 3. Collection: `tickets`

### 3.1 Purpose

Stores every customer request. This is the core collection — everything else supports it.

### 3.2 Mongoose Schema

```typescript
// server/src/modules/tickets/ticket.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export type RequestType = 'printed_copy' | 'reservation' | 'inquiry';
export type TicketStatus = 'new' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

export interface IAuditEntry {
  action: 'created' | 'status_changed' | 'notes_updated' | 'assigned' | 'cancelled';
  from: TicketStatus | null;
  to: TicketStatus | null;
  by: mongoose.Types.ObjectId | 'system';
  at: Date;
  meta?: Record<string, any>;
}

export interface ITicket extends Document {
  ticketNumber: string;
  bookTitle: string;
  requestType: RequestType;
  status: TicketStatus;
  customerName?: string;
  customerPhone?: string;
  confidence: number;
  sourceLanguage: string;
  aiRawResponse?: Record<string, any>;
  notes?: string;
  assignedTo?: mongoose.Types.ObjectId;
  idempotencyKey?: string;
  auditLog: IAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const AuditEntrySchema = new Schema<IAuditEntry>(
  {
    action: {
      type: String,
      enum: ['created', 'status_changed', 'notes_updated', 'assigned', 'cancelled'],
      required: true,
    },
    from: { type: String, enum: ['new', 'in_progress', 'ready', 'delivered', 'cancelled', null], default: null },
    to:   { type: String, enum: ['new', 'in_progress', 'ready', 'delivered', 'cancelled', null], default: null },
    by:   { type: Schema.Types.Mixed, required: true }, // ObjectId or 'system'
    at:   { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      match: /^[A-Z]\d{2,4}$/,
    },
    bookTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
      index: 'text',
    },
    requestType: {
      type: String,
      enum: ['printed_copy', 'reservation', 'inquiry'],
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'ready', 'delivered', 'cancelled'],
      default: 'new',
      required: true,
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    customerPhone: {
      type: String,
      trim: true,
      match: /^\+?[0-9]{7,15}$/,
      default: null,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    sourceLanguage: {
      type: String,
      enum: ['en', 'si', 'ta'],
      default: 'en',
    },
    aiRawResponse: {
      type: Schema.Types.Mixed,
      default: null,
      select: false, // don't return in API by default
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    auditLog: {
      type: [AuditEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'tickets',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.aiRawResponse;
        delete ret.idempotencyKey;
        return ret;
      },
    },
  }
);

// Indexes
TicketSchema.index({ status: 1, createdAt: -1 });
TicketSchema.index({ requestType: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });
TicketSchema.index({ assignedTo: 1, status: 1 });

export const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);
```

### 3.3 Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | Internal |
| `ticketNumber` | String | yes | `A47`, unique, speakable |
| `bookTitle` | String | yes | 1–200 chars, text-indexed |
| `requestType` | Enum | yes | printed_copy / reservation / inquiry |
| `status` | Enum | yes | new / in_progress / ready / delivered / cancelled |
| `customerName` | String | no | Max 100 |
| `customerPhone` | String | no | E.164 format |
| `confidence` | Number | yes | 0–1, AI's certainty |
| `sourceLanguage` | Enum | yes | en / si / ta |
| `aiRawResponse` | Mixed | no | Debug only, not in API |
| `notes` | String | no | Admin notes, max 1000 |
| `assignedTo` | ObjectId → User | no | Staff assigned |
| `idempotencyKey` | String | no | For duplicate prevention |
| `auditLog` | Array | yes | History of changes |
| `createdAt` | Date | auto | — |
| `updatedAt` | Date | auto | — |

### 3.4 Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `ticketNumber_1` | `ticketNumber` (unique) | Fast lookup by number |
| `status_1_createdAt_-1` | `status`, `createdAt` desc | Dashboard list |
| `bookTitle_text` | `bookTitle` (text) | Search |
| `requestType_1_status_1` | `requestType`, `status` | Filtered stats |
| `assignedTo_1_status_1` | `assignedTo`, `status` | Per-staff view |
| `idempotencyKey_1` | `idempotencyKey` (sparse) | Duplicate prevention |

### 3.5 Example Document

```json
{
  "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
  "ticketNumber": "A47",
  "bookTitle": "Atomic Habits",
  "requestType": "printed_copy",
  "status": "in_progress",
  "customerName": "Kamal Silva",
  "customerPhone": "+94771234567",
  "confidence": 0.95,
  "sourceLanguage": "en",
  "notes": "Customer wants hardcover edition",
  "assignedTo": "65a1b2c3d4e5f6a7b8c9d0e9",
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
      "by": "65a1b2c3d4e5f6a7b8c9d0e9",
      "at": "2026-01-15T10:35:00.000Z"
    }
  ],
  "createdAt": "2026-01-15T10:30:00.000Z",
  "updatedAt": "2026-01-15T10:35:00.000Z"
}
```

### 3.6 Status Transition Rules (Enforced in Service Layer)

```typescript
export const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new:         ['in_progress', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready:       ['delivered', 'cancelled'],
  delivered:   [],
  cancelled:   [],
};
```

Any PATCH with an invalid transition → `409 INVALID_TRANSITION`.

---

## 4. Collection: `users`

### 4.1 Purpose

Admin and manager accounts. No public signup — created by admin only.

### 4.2 Mongoose Schema

```typescript
// server/src/modules/auth/user.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'admin' | 'manager';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned in queries by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ['admin', 'manager'],
      required: true,
      default: 'manager',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
```

### 4.3 Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | — |
| `email` | String | yes | Unique, lowercase |
| `passwordHash` | String | yes | bcrypt cost 12, hidden |
| `name` | String | yes | 2–100 chars |
| `role` | Enum | yes | admin / manager |
| `isActive` | Boolean | yes | Default true |
| `lastLoginAt` | Date | no | Updated on login |
| `createdAt` | Date | auto | — |
| `updatedAt` | Date | auto | — |

### 4.4 Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `email_1` | `email` (unique) | Login lookup |
| `role_1_isActive_1` | `role`, `isActive` | List active users |

### 4.5 Password Hashing

```typescript
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

### 4.6 Seed Script (Initial Admin)

```typescript
// server/scripts/seed-admin.ts

import { User } from '../src/modules/auth/user.model';
import { hashPassword } from '../src/modules/auth/auth.service';

export async function seedAdmin() {
  const exists = await User.findOne({ role: 'admin' });
  if (exists) {
    console.log('Admin already exists');
    return;
  }
  await User.create({
    email: process.env.SEED_ADMIN_EMAIL || 'admin@bookshop.lk',
    passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD || 'changeMe123!'),
    name: 'Default Admin',
    role: 'admin',
  });
  console.log('Admin created');
}
```

---

## 5. Collection: `sessions`

### 5.1 Purpose

Short-lived chat memory. Enables continuity when a customer returns to the chat within 24h. TTL index auto-purges.

### 5.2 Mongoose Schema

```typescript
// server/src/modules/chat/session.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: Date;
}

export interface ISession extends Document {
  sessionId: string;
  language: string;
  messages: IChatMessage[];
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 2000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SessionSchema = new Schema<ISession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^s_[a-zA-Z0-9]{8,64}$/,
    },
    language: {
      type: String,
      enum: ['en', 'si', 'ta'],
      default: 'en',
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
      validate: {
        validator: (arr: IChatMessage[]) => arr.length <= 50,
        message: 'Session cannot exceed 50 messages',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // TTL: 24 hours
    },
  },
  {
    collection: 'sessions',
    versionKey: false,
  }
);

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
```

### 5.3 Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | — |
| `sessionId` | String | yes | Format `s_xxx`, unique |
| `language` | Enum | yes | en / si / ta |
| `messages` | Array | yes | Max 50 entries |
| `messages[].role` | Enum | yes | user / assistant |
| `messages[].content` | String | yes | Max 2000 |
| `messages[].at` | Date | yes | — |
| `createdAt` | Date | yes | TTL 24h |

### 5.4 Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `sessionId_1` | `sessionId` (unique) | Lookup |
| `createdAt_1` (TTL) | `createdAt` | Auto-purge after 24h |

### 5.5 Session ID Generation

```typescript
import { randomBytes } from 'crypto';

export function generateSessionId(): string {
  return `s_${randomBytes(9).toString('base64url')}`; // ~12 chars
}
```

---

## 6. Collection: `counters`

### 6.1 Purpose

Atomic sequence generator for speakable ticket numbers (`A47`, `B12`). Prevents race conditions when two tickets are created simultaneously.

### 6.2 Mongoose Schema

```typescript
// server/src/modules/tickets/counter.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true }, // e.g. 'ticket'
    seq: { type: Number, default: 0 },
  },
  { collection: 'counters', versionKey: false }
);

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
```

### 6.3 Ticket Number Algorithm

```typescript
// server/src/modules/tickets/ticket.service.ts

import { Counter } from './counter.model';

export async function nextTicketNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'ticket' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seq = counter.seq;              // 1, 2, ... 100, 101
  const letterIndex = Math.floor((seq - 1) / 99) % 26; // A-Z
  const letter = String.fromCharCode(65 + letterIndex);
  const number = ((seq - 1) % 99) + 1;  // 1-99
  return `${letter}${number.toString().padStart(2, '0')}`;
}
```

**Produces:** `A01`, `A02`, ..., `A99`, `B01`, ..., `Z99`, `A01` (wraps).

**Uniqueness enforced by:** unique index on `ticketNumber` + atomic counter.

**Collision handling:** if duplicate insert error, increment counter again and retry (max 3 attempts).

### 6.4 Example Document

```json
{
  "_id": "ticket",
  "seq": 47
}
```

---

## 7. Collection: `audit_logs`

### 7.1 Purpose

Append-only compliance trail. Separate from ticket's embedded `auditLog` for cross-entity queries and TTL management.

### 7.2 Mongoose Schema

```typescript
// server/src/modules/audit/audit.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  actor: mongoose.Types.ObjectId | 'system';
  action: string;
  entity: 'ticket' | 'user' | 'auth' | 'system';
  entityId?: mongoose.Types.ObjectId;
  meta?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.Mixed, required: true },
    action: { type: String, required: true, index: true },
    entity: {
      type: String,
      enum: ['ticket', 'user', 'auth', 'system'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    meta: { type: Schema.Types.Mixed },
    ip: { type: String, maxlength: 45 },
    userAgent: { type: String, maxlength: 500 },
    at: {
      type: Date,
      default: Date.now,
      expires: 7776000, // TTL: 90 days
    },
  },
  { collection: 'audit_logs', versionKey: false }
);

AuditLogSchema.index({ entity: 1, entityId: 1, at: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
```

### 7.3 Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | — |
| `actor` | ObjectId \| 'system' | yes | Who did it |
| `action` | String | yes | e.g. `ticket.created` |
| `entity` | Enum | yes | ticket / user / auth / system |
| `entityId` | ObjectId | no | Related entity |
| `meta` | Mixed | no | Extra context |
| `ip` | String | no | IPv4/IPv6 |
| `userAgent` | String | no | Client string |
| `at` | Date | yes | TTL 90d |

### 7.4 Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `at_1` (TTL) | `at` | Auto-purge after 90d |
| `action_1` | `action` | Filter by action |
| `entity_1_entityId_1_at_-1` | compound | Entity history |

---

## 8. Collection: `system_flags`

### 8.1 Purpose

Feature toggles, AI health state, maintenance mode. Read on every request (cached 30s).

### 8.2 Mongoose Schema

```typescript
// server/src/modules/system/flag.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemFlag extends Document {
  _id: string;
  value: any;
  updatedAt: Date;
}

const SystemFlagSchema = new Schema<ISystemFlag>(
  {
    _id: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  {
    collection: 'system_flags',
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false,
  }
);

export const SystemFlag: Model<ISystemFlag> =
  mongoose.models.SystemFlag || mongoose.model<ISystemFlag>('SystemFlag', SystemFlagSchema);
```

### 8.3 Known Flags

| `_id` | Value Type | Purpose |
|-------|-----------|---------|
| `ai_enabled` | Boolean | Kill switch for AI |
| `maintenance_mode` | Boolean | Block new tickets |
| `ai_last_success` | Date | Health tracking |
| `ai_last_error` | String | Last error message |
| `feature_telegram` | Boolean | Toggle Telegram alerts |

### 8.4 Example Documents

```json
{ "_id": "ai_enabled", "value": true, "updatedAt": "2026-01-15T10:00:00.000Z" }
{ "_id": "ai_last_success", "value": "2026-01-15T10:30:00.000Z", "updatedAt": "2026-01-15T10:30:00.000Z" }
```

---

## 9. Relationships Diagram

```
┌──────────────┐         ┌──────────────┐
│   users      │         │   tickets    │
│              │         │              │
│ _id  ◄───────┼─────────┤ assignedTo   │
│ email        │         │ ticketNumber │
│ role         │         │ auditLog[]   │
└──────────────┘         └──────────────┘
       ▲                        ▲
       │ actor                  │ entityId
       │                        │
       │                 ┌──────┴───────┐
       └─────────────────┤ audit_logs   │
                         └──────────────┘

┌──────────────┐         ┌──────────────┐
│  sessions    │         │  counters    │
│ (TTL 24h)    │         │  (_id: ticket)│
└──────────────┘         └──────────────┘
```

**Note:** Sessions and counters are standalone (no FKs). Tickets reference Users via `assignedTo` (optional).

---

## 10. Data Validation Rules Summary

| Collection | Field | Rule |
|-----------|-------|------|
| tickets | `bookTitle` | 1–200 chars, trimmed, non-empty |
| tickets | `requestType` | Enum only |
| tickets | `status` | Enum, valid transitions |
| tickets | `confidence` | 0.0–1.0 |
| tickets | `customerPhone` | E.164 or null |
| tickets | `notes` | Max 1000 |
| tickets | `ticketNumber` | Unique, regex `^[A-Z]\d{2,4}$` |
| users | `email` | Unique, lowercase, valid |
| users | `password` | Min 8 chars (pre-hash) |
| users | `role` | admin or manager |
| sessions | `messages` | Max 50 entries |
| sessions | `sessionId` | Format `s_[a-zA-Z0-9]{8,64}` |

---

## 11. Query Patterns (Mapped to Indexes)

| API Endpoint | Query | Index Used |
|--------------|-------|------------|
| GET /tickets?status=new | `{ status: 'new' }` sorted by createdAt desc | `status_1_createdAt_-1` |
| GET /tickets?search=atomic | `{ $text: { $search: 'atomic' } }` | `bookTitle_text` |
| GET /tickets/:id | `{ ticketNumber: 'A47' }` | `ticketNumber_1` |
| PATCH /tickets/:id | `findOneAndUpdate` + status | `ticketNumber_1` |
| POST /chat | insert ticket + audit | write path |
| POST /auth/login | `{ email }` | `email_1` |
| GET /chat/session/:id | `{ sessionId }` | `sessionId_1` |

---

## 12. Data Lifecycle

| Data | Retention | Mechanism |
|------|-----------|-----------|
| Active tickets (new/in_progress/ready) | Indefinite | — |
| Delivered tickets | 12 months | Manual archive job (future) |
| Cancelled tickets | 12 months | Same |
| Sessions | 24 hours | TTL index |
| Audit logs | 90 days | TTL index |
| Users | Indefinite | — |

---

## 13. Migration & Seeding

### 13.1 Initial Seed Order

```typescript
// server/scripts/seed.ts

import mongoose from 'mongoose';
import { seedAdmin } from './seed-admin';
import { SystemFlag } from '../src/modules/system/flag.model';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);

  await seedAdmin();

  await SystemFlag.updateOne(
    { _id: 'ai_enabled' },
    { $setOnInsert: { value: true } },
    { upsert: true }
  );
  await SystemFlag.updateOne(
    { _id: 'maintenance_mode' },
    { $setOnInsert: { value: false } },
    { upsert: true }
  );
  await SystemFlag.updateOne(
    { _id: 'feature_telegram' },
    { $setOnInsert: { value: true } },
    { upsert: true }
  );

  console.log('Seed complete');
  await mongoose.disconnect();
}

seed().catch(console.error);
```

### 13.2 Index Creation

Mongoose auto-creates indexes on `connect` in dev. In production, disable auto-index and create manually:

```typescript
mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');
```

---

## 14. Connection Configuration

```typescript
// server/src/config/db.ts

import mongoose from 'mongoose';
import { logger } from '../shared/logger';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  mongoose.set('strictQuery', true);
  mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
  });

  mongoose.connection.on('error', (err) => logger.error('Mongo error', err));
  mongoose.connection.on('disconnected', () => logger.warn('Mongo disconnected'));

  logger.info('MongoDB connected');
}
```

**Atlas URL format:**

```
mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/bvta?retryWrites=true&w=majority
```

---

## 15. Storage Estimation (Free Tier: 512MB)

| Collection | Avg Doc Size | Daily Growth | Annual |
|------------|--------------|--------------|--------|
| tickets | ~1.5 KB | 50 docs → 75 KB | ~27 MB |
| users | ~500 B | static | < 1 MB |
| sessions | ~2 KB | 200 sessions (24h TTL) | ~400 KB live |
| counters | ~50 B | static | < 1 KB |
| audit_logs | ~500 B | 200/day (90d TTL) | ~9 MB live |
| system_flags | ~100 B | static | < 1 KB |

**Total:** Well under 100 MB/year — **free tier is safe for 5+ years**.

---

## 16. Backup Strategy

MongoDB Atlas M0 includes:

- **Continuous backup** for 2 days
- **Daily snapshots** for 7 days

Manual export (monthly):

```bash
mongodump --uri="$MONGODB_URI" --out=./backup/$(date +%Y-%m)
```

Store in Google Drive or GitHub private repo (encrypted).

---

## 17. Testing Data

### 17.1 Fixture Tickets

```typescript
export const ticketFixtures = [
  {
    ticketNumber: 'A01',
    bookTitle: 'Atomic Habits',
    requestType: 'printed_copy',
    status: 'new',
    confidence: 0.95,
    sourceLanguage: 'en',
  },
  {
    ticketNumber: 'A02',
    bookTitle: 'Harry Potter and the Philosopher\'s Stone',
    requestType: 'reservation',
    status: 'in_progress',
    confidence: 0.88,
    sourceLanguage: 'en',
  },
  {
    ticketNumber: 'A03',
    bookTitle: 'The Alchemist',
    requestType: 'inquiry',
    status: 'delivered',
    confidence: 0.72,
    sourceLanguage: 'si',
  },
];
```

### 17.2 In-Memory Test DB

```typescript
// server/tests/setup.ts

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
```

---

## 18. Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|---------|-------|
| Store raw audio | Store only text transcripts |
| Reference customer across tickets | Denormalize name/phone onto each ticket |
| Hard-delete tickets | Set status to `cancelled` |
| Store password plaintext | bcrypt cost 12 |
| Sequential integer ticket IDs | Speakable `A47` format |
| Embed all sessions in tickets | Separate `sessions` with TTL |
| Skip indexes | Every query pattern has one |
| Return `passwordHash` | `select: false` + toJSON transform |
| Log full message content | Log only metadata |

---

## 19. Schema Versioning

Add `schemaVersion` field only if a breaking migration is needed:

```typescript
schemaVersion: { type: Number, default: 1 }
```

Migration pattern:

```typescript
await Ticket.updateMany(
  { schemaVersion: { $lt: 2 } },
  { $set: { schemaVersion: 2, newField: null } }
);
```

Currently `v1` — no migrations needed.
