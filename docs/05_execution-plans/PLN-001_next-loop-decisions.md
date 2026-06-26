# D-CHECKPOINT-001: Next Development Loop — Decision Points

**Date:** 2026-06-09
**Status:** AWAITING OWNER RESPONSE
**Purpose:** The autonomous development loop has reached the boundary of what can be decided without human input. This document lists every open decision, organized by blocking priority. Please fill in the "Your decision:" field for each item and return this document (or a response document) to resume the loop.

---

## Current System State (as of this checkpoint)

| Area | Status |
|---|---|
| Work module (projects/tasks/notes/deliverables) | ✅ DB-backed, CRUD wired, seeded in Supabase |
| Supabase connectivity | ✅ Connected (5432 direct, 6543 pooler) |
| Baseline migration | ✅ Applied and reconciled |
| TypeScript | ✅ Clean across all modules |
| Production build | ✅ Passes |
| Auth | ⚠️ Mock user (`requireUser()` hardcoded) |
| AI Input, Research, Workflow, Life | ⚠️ UI complete, DB-backed persistence blocked by AUTH-001 |
| Finance, Chamber, Company | ⚠️ FOPS shell only, scoped — blocked by AUTH-001 |
| Client Portal | ⚠️ Layout only, blocked by AUTH-001 |
| Real AI service | ⚠️ Mock adapter; Anthropic API not wired |
| External sources (LINE, Drive, etc.) | ⚠️ Contracts documented; no runtime adapters |

---

## TIER 1 — Must Decide Before Next Loop

These decisions directly block the next implementable task.

---

### D-1: Auth Provider (AUTH-001)

**Blocking:** Auth is the single largest blocker. Every DB-backed module that needs per-user data isolation (all of them) is waiting for `requireUser()` to return a real user.

**Context:**
- Current `requireUser()` returns a hardcoded mock user ID
- The Supabase project is already set up, which makes **Supabase Auth** the natural choice (no extra service, already integrated)
- Supabase Auth supports: email/password, magic link, Google OAuth, GitHub OAuth, phone OTP
- Alternative: **Clerk** (better DX, more features, external service), **NextAuth.js** (flexible, more setup)
- The `profiles` table already exists in the schema (one row per authenticated user)

**Implications of each choice:**

| Option | Effort | RLS support | Best for |
|---|---|---|---|
| Supabase Auth (email magic link) | Low | Native | Solo/small team, simplest path |
| Supabase Auth + Google OAuth | Medium | Native | If you want social login |
| Clerk | Medium-High | Via Clerk JWT | Better admin UI, more providers |
| NextAuth.js | High | Manual | Full flexibility |

**Questions:**
1. Which provider do you want to use?
2. Should users sign up with email magic link, email+password, or Google OAuth?
3. Is this system single-user (just you) or multi-user (invite others)?
4. Should the mock user be kept as a dev bypass during local development (via `NODE_ENV=development`)?

**Your decision:**
```
Provider: ___
Login method: ___
Single-user or multi-user: ___
Keep dev bypass: yes / no
```

---

### D-2: Row Level Security (RLS)

**Blocking:** Required before any real user session can safely read/write DB data.

**Context:**
- Supabase RLS policies restrict which rows a user can read/write based on their auth token
- Without RLS, any authenticated user can read all rows (cross-user data leak risk)
- RLS must be designed before auth is wired — the policy depends on how the auth token maps to `ownerId`
- For a single-user system, RLS is simpler but still recommended
- The `profiles` table has `id` = auth UID; all other tables have `owner_id` = profile ID

**Recommended RLS pattern:**
```sql
-- Example for projects table (applies to all owned tables)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_only" ON projects
  USING (owner_id = (SELECT id FROM profiles WHERE auth_uid = auth.uid()));
```

**Questions:**
1. Should RLS be added as part of AUTH-001, or as a separate task after auth is wired?
2. Are there any tables that should be readable without auth (public routes)?

**Your decision:**
```
Add RLS as part of AUTH-001: yes / no
Public-readable tables (if any): ___
```

---

### D-3: DB Migration Strategy for Next Feature Tables

**Blocking:** DATA-005 (Work write intent loop) and DATTR-024 (AI Input persistence) both require new Prisma models to be added and a new migration applied to Supabase.

**Proposed new tables (from previous planning):**

| Table | Proposal doc | Module | Blocking |
|---|---|---|---|
| `module_write_intents` | D-PROPOSAL-002 | Data Operations | DATA-005 |
| `source_action_items` | D-PROPOSAL-002 | Data Operations | DATA-005 |
| `source_lineage` | D-PROPOSAL-002 | Data Operations | DATA-005 |
| `raw_intake_items` | D-PROPOSAL-002 | Ingestion | DATTR-024 |
| `normalized_contents` | D-PROPOSAL-002 | Ingestion | DATTR-024 |
| `evidence` | D-PROPOSAL-002 | Ingestion | DATTR-024 |
| `proposals` | D-PROPOSAL-002 | Ingestion | DATTR-024 |
| `source_assets` | D-PROPOSAL-005 | Source Asset | DATTR-024 |
| `source_connections` | D-PROPOSAL-005 | Source Asset | DATTR-024 |
| `ai_workflow_runs` | DATTR-017 | AI Source Workflow | DATTR-024 |
| `ai_work_items` | DATTR-017 | AI Source Workflow | DATTR-024 |

**Questions:**
1. Should DATA-005 tables (write intents, source action items, lineage) be migrated first as a small focused migration?
2. Should DATTR-024 tables be added in a second migration, or all at once?
3. Do you want to review the full migration SQL before it's applied, or approve based on the proposal docs?

**Your decision:**
```
Migration order: DATA-005 first then DATTR-024 / all at once / other
Review SQL before apply: yes / no
```

---

## TIER 2 — High Priority, Decide Before End of Next Loop

---

### D-4: Real AI Service (Anthropic API)

**Context:**
- The `AIService` interface is defined (D-DECISION-003)
- Current adapter: `MockAIService` (returns hardcoded responses)
- Real adapter: `AnthropicAIService` needs an API key and model selection
- Available models (as of 2026-06): `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`
- The AI service is used for: triage proposals, source workflow runs, morning brief, agent proposals

**Questions:**
1. Do you have an Anthropic API key to configure?
2. Which model tier for each use case?
   - Triage/quick classification: Haiku (fast, cheap) or Sonnet?
   - Deep analysis / agent proposals: Sonnet or Opus?
   - Morning brief generation: Sonnet?
3. Should AI calls be rate-limited or queued, or direct per-request?
4. Should real AI be gated behind a feature flag, or replace mock when `ANTHROPIC_API_KEY` is set?

**Your decision:**
```
API key available: yes / no
Triage model: ___
Analysis model: ___
Morning brief model: ___
Activation: feature flag / auto-detect from env var / manual toggle
```

---

### D-5: Client Portal Token Strategy (CLIENT-001)

**Context:**
- Client Portal exists as a UI layout at `/client/[token]`
- Clients should only see: deliverables marked `visibility: "client"`, project name, timeline
- They must NOT see: internal notes, tasks, financial data, strategy
- Token strategy options:
  - **Signed URL token** (JWT signed with server secret, embeds project ID + expiry) — simple, no DB needed
  - **DB-backed token** (`ClientAccessToken` table, revocable, audited) — more control
  - **Supabase Auth invite** (client gets a Supabase account) — heavy; not recommended for client access

**Questions:**
1. Which token strategy?
2. Should client tokens expire? If yes, after how long?
3. Should clients be able to leave comments on deliverables?

**Your decision:**
```
Token strategy: signed URL / DB-backed / other
Token expiry: no expiry / 7 days / 30 days / ___
Client comments: yes / no
```

---

### D-6: Morning Brief Scope and Delivery

**Context:**
- Morning Brief is defined in DATTR-015 as a daily AI-generated summary
- It should surface: Work overdue/at-risk items, Research urgent CFPs, Chamber follow-ups, AI workflow results
- Delivery options: in-app notification, email (requires email provider), push notification

**Questions:**
1. What time should the morning brief generate? (e.g., 07:00 Taipei time)
2. What modules to include in v1? (Work only? Work + Research? All active modules?)
3. Delivery method: in-app only, email (if yes, which email provider?), or both?
4. Should agents be allowed to include Chamber or Finance data in the brief?

**Your decision:**
```
Generation time: ___
Modules to include: Work / Work+Research / Work+Research+Chamber / all
Delivery: in-app only / email / both
Email provider (if applicable): Resend / SendGrid / SES / other
Chamber/Finance in brief: yes / no
```

---

## TIER 3 — Medium Priority, Decide Within 2–3 Loops

---

### D-7: LINE Source Adapter Runtime

**Context:**
- DATTR-008 defines the full contract for LINE message ingestion
- Runtime requires: a LINE Developer Channel (Messaging API), a webhook endpoint, HMAC-SHA256 signature verification
- The webhook endpoint needs to be publicly accessible (Supabase Edge Function or Next.js API route + ngrok for local dev)

**Questions:**
1. Do you have a LINE Developer account and Messaging API channel?
2. Which LINE channels/groups to connect first?
3. Should the webhook be a Next.js API route (`/api/line/webhook`) or a Supabase Edge Function?

**Your decision:**
```
LINE account ready: yes / no
First channels to connect: ___
Webhook implementation: Next.js API route / Supabase Edge Function
```

---

### D-8: Production Deployment

**Context:**
- The app is currently run locally with `pnpm dev`
- The Supabase project is live; the app just needs a hosting platform

**Options:**
- **Vercel** — easiest Next.js deployment, automatic from GitHub, works with Supabase
- **Railway** — alternative if you want more control
- **Self-hosted** — VPS/Docker if needed

**Questions:**
1. Deploy to Vercel now, or wait until auth is complete?
2. Is there a custom domain to configure?
3. Should the production `DATABASE_URL` use port 6543 (pooler) and `DIRECT_DATABASE_URL` use port 5432?

**Your decision:**
```
Deploy now or after auth: now / after auth
Platform: Vercel / Railway / other
Custom domain: ___
Production DATABASE_URL strategy: pooler for runtime + direct for migrations: yes / no
```

---

### D-9: Finance / Chamber / Company — Implementation Approval

**Context:**
- All three modules have been scoped (D-PLAN-017, D-PLAN-018, D-PLAN-019)
- They are HIGH-risk (Finance, Company) or MEDIUM-risk (Chamber)
- Per AGENTS.md: human approval required before any final writes to these modules
- Implementation requires: Prisma models, server actions, UI wired to DB

**Questions:**
1. Which module to implement first?
2. Do you approve adding Finance schema (FinanceDraftEntry, BudgetCategory) as part of the next migration?
3. Do you approve adding Chamber schema (ChamberContact, ChamberInteraction, ChamberOpportunity)?
4. Company Strategy: high sensitivity — do you want this implemented in the same cycle or deferred?

**Your decision:**
```
Implementation order: Finance first / Chamber first / Company first / defer all
Finance schema approval: yes / no
Chamber schema approval: yes / no
Company Strategy: implement now / defer
```

---

### D-10: Research Module DB Backing

**Context:**
- Research module UI is complete (issues, sources, writing, events, people, graph views)
- DB model was decided in D-DECISION-001 (~10 tables)
- Currently all research data is mock
- Depends on AUTH-001

**Questions:**
1. Should Research be DB-backed in the same cycle as Work persistence?
2. Or defer Research DB backing until Work write intent loop (DATA-005) is stable?

**Your decision:**
```
Research DB backing: same cycle as auth / after DATA-005 stable / defer
```

---

## Summary of Blocking Chain

```
AUTH-001 decision (D-1)
  ↓
RLS setup (D-2)
  ↓
requireUser() returns real user
  ↓
┌─────────────────────────────────────────────────────┐
│  DATA-005 migration (D-3)  → Work write intent loop │
│  DATTR-024 migration (D-3) → AI Input persistence   │
│  Real AI service (D-4)     → Live triage proposals  │
│  Research DB (D-10)        → Research persistence   │
│  Finance/Chamber (D-9)     → Module implementations │
└─────────────────────────────────────────────────────┘
  ↓
CLIENT-001 (D-5) → Client Portal live
  ↓
LINE adapter (D-7) → Real source ingestion
  ↓
Morning Brief (D-6) → Operational daily loop
```

---

## How to Respond

Create a new file at `docs/dev/D-CHECKPOINT-001-response.md` with the format:

```markdown
# D-CHECKPOINT-001 Response

**Date:** [your date]

## D-1: Auth Provider
Provider: Supabase Auth
Login method: magic link / email+password / Google OAuth
Single-user or multi-user: single-user
Keep dev bypass: yes

## D-2: RLS
Add RLS as part of AUTH-001: yes
Public-readable tables: none

## D-3: Migration Strategy
[your answer]

... (continue for each D-N)
```

The loop will read this file at the start of the next iteration and use it to select and implement tasks.
