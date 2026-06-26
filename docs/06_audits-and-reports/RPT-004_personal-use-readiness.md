# D-EVAL-004: Personal Use Launch Readiness Research

**Date:** 2026-06-20
**Status:** CURRENT
**Scope:** Distance from current repository state to putting existing Personal OS needs online for owner self-use
**Output type:** Research + target-level gap analysis

---

## 1. Executive Judgment

The project is close to a **private online Work-first self-use launch**, but not close to having **all current Personal OS requirements** online as real, durable product behavior.

The shortest responsible target is:

```txt
L1 - Private Online Work OS
```

That means:

- deploy the app online behind real authentication;
- keep Work as the only serious DB-backed operating module;
- keep Research, AI Input, Dashboard, Workflow, Life, Finance, Chamber, Company as clearly marked prototype/planning surfaces;
- do not treat Client Portal, Finance, Life, Company, or external source connectors as production-ready.

The fuller target implied by "把現有需求都上線讓我自己用" is closer to:

```txt
L3 - Daily Personal OS with source workflow persistence
```

That is materially larger. It requires real auth, route protection, DB-backed module permissions, Research persistence, AI Input SourceAsset / workflow persistence, a real Morning Brief, and careful handling of high-risk personal/company/finance data.

The current codebase has strong foundations:

- Work CRUD has a real BFF/service/Prisma pattern.
- Prisma schema and baseline migration are mature.
- The frontend operating surface plan is now much more structured than a raw prototype.
- AI Input has excellent UI and governance design, including a mock-data kill switch.

The main blocker is not UI polish. It is the production boundary:

```txt
mock auth + localStorage permissions + mock/public surfaces
```

Until that boundary closes, "online" should mean private owner-only use, not shareable, multi-user, client-facing, or connector-driven operation.

---

## 2. Research Method

This pass reviewed:

- project source docs: `AGENTS.md`, PRDs, target version, current sprint, backlog, docs index;
- current code: auth service, Work actions/service, Prisma schema, Dashboard, Research context, Inbox, Client Portal, module permissions;
- local Next.js 16 docs in `node_modules/next/dist/docs/`;
- external official references for deployment, auth, RLS, production database changes, environment management, and security levels.

External references used:

- [Next.js App Router deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js data security guide](https://nextjs.org/docs/app/guides/data-security)
- [Supabase Auth SSR guide](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Prisma Migrate production deployment guide](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [OWASP ASVS project](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP ASVS level definitions](https://raw.githubusercontent.com/OWASP/ASVS/master/4.0/en/0x03-Using-ASVS.md)

---

## 3. External Readiness Standards Applied

### 3.1 Deployment

Next.js can be deployed as a Node.js server or Docker container with full framework support. This project already has the required `build` and `start` scripts in `package.json`, so deployment shape is not the hard part.

For this repository, static export is not an appropriate target because the app relies on Server Components, Server Actions, Prisma, and authenticated data access.

### 3.2 Auth, Session, Authorization

The Next.js auth model separates three concerns:

- authentication: who the user is;
- session management: how auth state persists across requests;
- authorization: what data/actions the user can access.

Next.js also treats Server Actions and Route Handlers as externally reachable boundaries. Therefore, page-level or client-side UI guards are not sufficient. Each mutation must re-check auth and resource authorization.

The Work module mostly follows this pattern through:

```txt
src/app/actions/work.ts
  -> requireUser()
  -> src/lib/services/project.service.ts
  -> ownership checks
  -> Prisma
  -> UI-safe mapper
```

But `requireUser()` still returns the seeded admin profile instead of a real session user.

### 3.3 Supabase Auth and RLS

Supabase Auth supports SSR frameworks by storing sessions in cookies through its SSR package. This is a good fit for the App Router.

Supabase's RLS guidance is clear that RLS should be enabled for tables in exposed schemas and combined with Supabase Auth for stronger protection. The production checklist also calls out RLS, SSL enforcement, and database network restrictions.

Important nuance for this codebase:

- current runtime uses Prisma direct database access;
- service-layer authorization remains required;
- RLS must be designed intentionally because Prisma direct connections do not automatically become per-user `auth.uid()` browser requests.

So the L1 target can rely on app-layer authorization for private owner-only Work use, but L2+ should add an explicit RLS strategy, especially before multi-user, public routes, or direct Supabase browser access.

### 3.4 Database Migrations

Prisma recommends `prisma migrate deploy` for staging/production, ideally in CI/CD, not by casually pointing a local shell at production. This repository already has a baseline migration and scripts, but future schema expansion should remain reviewed and staged.

### 3.5 Security Target Levels

OWASP ASVS defines three assurance levels:

- Level 1: minimum baseline for all applications.
- Level 2: recommended for most applications that contain sensitive data.
- Level 3: highest assurance for critical/high-value systems.

Because Personal OS contains work context, research ideas, life/health notes, company strategy, client-facing boundaries, and eventually finance data, the long-term target should behave like ASVS Level 2. For the first private launch, use an L1-style launch with strict scoping: owner-only, no high-risk modules, no public sharing, no connectors that ingest private third-party data.

---

## 4. Current Repository Reality

### 4.1 Documentation State

There is one visible inconsistency:

- `docs/dev/D-EVAL-003-work-007-verification.md` says WORK-007 was blocked by Supabase DNS on 2026-06-07.
- `docs/tasks/T-001-backlog.md` and `docs/dev/D-CHECKPOINT-001-next-loop-decisions.md` later say Supabase connectivity, seed, build, and Work verification improved by 2026-06-09.

This report treats the later backlog/checkpoint as more current, but still separates:

```txt
Supabase connectivity/build green
```

from:

```txt
manual browser owner workflow is fully verified for daily production use
```

Those are related, but not identical.

### 4.2 Code State

| Area | Current finding | Launch meaning |
|---|---|---|
| Auth | `src/lib/services/auth.service.ts` returns `admin@example.com` or first profile | Not real online auth |
| Dashboard route guard | `src/app/(dashboard)/layout.tsx` uses client providers only | No server-side dashboard access boundary yet |
| Module permissions | `ModulePermissionsProvider` stores role/modules in localStorage | UX demo only, not security |
| Work | Actions and services enforce profile ownership and return view models | Strongest production foundation |
| Client Portal | `/client/[token]` reads `mockProjectsFull`, `mockTasks`, `mockDeliverables` | Do not share as production client portal |
| Dashboard | Morning Brief reads `mockMorningBriefCards` | Not real daily brief |
| Research | Rich UI uses context/localStorage and mock data | Useful prototype, not reliable source of truth |
| Inbox / AI Input | Mock pipeline plus formal-mode kill switch | Good UX/governance shell; no runtime persistence |
| Workflow | UI and local engine exist | Not production scheduler/audit system |
| Finance/Life/Company | FOPS shells/plans, high-risk policy | Not production writes |
| Chamber | structured shell/plan | Not production CRM |

---

## 5. Target Levels

### L0 - Local Prototype

**Meaning:** Runs locally, useful for inspection, UI rehearsal, and Work development.

**Current status:** Already achieved.

**Can use for:** demoing screens, testing Work flows with local or configured DB, continuing closed-loop development.

**Cannot use for:** reliable online personal operating system.

### L1 - Private Online Work OS

**Meaning:** Owner can log in online and use Work as the first real persisted operating loop.

**User value:** You can start using this for real project/task/note/deliverable tracking.

**Minimum acceptance:**

- real auth provider selected and wired;
- dashboard routes require a real session;
- `requireUser()` maps session user to `Profile`;
- Work CRUD verified through browser refresh against the intended DB;
- deployment environment variables configured outside source code;
- migrations applied through reviewed deployment procedure;
- Client Portal is either disabled/private or made DB-backed before sharing;
- mock modules are visibly marked as prototype/fallback.

**Current distance:** close to medium. The Work runtime exists; auth and deployment boundary remain.

**Recommended next target:** yes.

### L2 - Reliable Daily Driver

**Meaning:** Work, Research, Dashboard attention, and module permissions are durable enough for daily personal use.

**User value:** You can rely on the system for work + research context instead of only Work.

**Minimum acceptance:**

- L1 complete;
- DB-backed module permissions or a documented single-owner policy;
- Research network model implemented through BFF/service/Prisma;
- Dashboard reads real Work/Research attention items;
- Morning Brief starts as deterministic DB aggregation, not generative magic;
- Inbox/AI Input formal mode has at least manual SourceAsset persistence;
- backup/recovery expectations documented.

**Current distance:** medium to large. UI is strong, persistence is missing.

### L3 - Source Workflow Personal OS

**Meaning:** AI Input becomes a real Source Workflow Console, not just a mock/prototype surface.

**User value:** LINE/Drive/Gmail/RSS/manual inputs can become source records, AI work items, and reviewed write intents.

**Minimum acceptance:**

- L2 complete;
- `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `DataUnitProposal`, and `ModuleWriteIntent` persisted through reviewed BFF/service layers;
- DATTR-011 security/privacy/retention policy enforced in runtime code;
- connector runtimes are opt-in and auditable;
- source outputs never write high-risk module records directly;
- Morning Brief surfaces real workflow anomalies and review items.

**Current distance:** large. The architecture and UI are unusually well-prepared, but persistence and runtime connectors are not implemented.

### L4 - Sensitive + External Boundary Version

**Meaning:** Client Portal, Chamber, Finance draft-only, Life, and Company Strategy become safe enough for real sensitive data and limited external visibility.

**User value:** You can put more of your actual life/company/client context into the system.

**Minimum acceptance:**

- L3 or at least L2 security foundations complete;
- Client Portal DB-backed token strategy and visibility filter;
- Finance remains draft-only with human confirmation;
- Life has privacy-first schema and no performance-pressure UX;
- Company Strategy has confidentiality levels and no public leakage path;
- Chamber PII handling and relationship sharing rules are implemented;
- audit records exist for high-risk approvals and public/client-visible changes.

**Current distance:** very large. Plans exist; production data paths do not.

### L5 - Multi-User / Agent Collaboration Platform

**Meaning:** Partners, clients, external agents, and advanced automation participate safely.

**User value:** The system becomes a collaborative operating platform.

**Minimum acceptance:**

- ASVS Level 2 controls are the default baseline;
- selected flows may need Level 3-style assurance;
- true multi-user permissions;
- public route audit;
- external agent context packages only, no direct DB access;
- monitoring, logging, incident response, backups, restore drills.

**Current distance:** future. This should not drive the next launch.

---

## 6. Distance Summary

| Target | Distance | Main blockers | Best next action |
|---|---:|---|---|
| L0 Local Prototype | 0 | none | continue development |
| L1 Private Online Work OS | 6-10 focused cycles | AUTH-001, route protection, deployment/env, Work browser verification, Client Portal boundary | implement auth decision first |
| L2 Reliable Daily Driver | 20-35 focused cycles after L1 | Research persistence, real dashboard, permissions, manual source persistence | finish L1, then Research + Dashboard |
| L3 Source Workflow OS | 35-60 focused cycles after L1 | SourceAsset/workflow persistence, connector runtime, security policy enforcement | DATTR-024 after auth/security |
| L4 Sensitive/External Version | 40+ focused cycles and approvals | Client Portal, Finance/Life/Company/Chamber schemas and audit | only after L2 foundations |
| L5 Multi-user/Agent Platform | not near-term | multi-user authz, external agent governance, monitoring, high assurance | defer |

The highest-leverage move is not another UI surface. It is:

```txt
AUTH-001 -> route protection -> Work online verification -> safe deployment
```

---

## 7. L1 Critical Path

### Step 1 - Make the auth decision

Use the checkpoint decision format in `docs/dev/D-CHECKPOINT-001-next-loop-decisions.md`.

Recommended for the first private launch:

```txt
Provider: Supabase Auth
Login method: email magic link or Google OAuth
User model: single-owner first
Dev bypass: yes, only in development and visibly gated
```

### Step 2 - Replace mock `requireUser()`

Implementation target:

```txt
Supabase session cookie
  -> get authenticated user
  -> find or create Profile
  -> requireUser() returns real profile id
```

This must preserve Work's current service-layer ownership checks.

### Step 3 - Add server-side route protection

Protect dashboard routes before they render operational data. Client-only `ModuleGuard` is not enough.

Server Actions must still keep their own `requireUser()` and resource checks.

### Step 4 - Decide L1 RLS posture

For L1, acceptable temporary posture:

- owner-only account;
- no direct browser Supabase data access;
- Prisma service-layer authorization for Work;
- RLS strategy documented and prepared for L2.

For L2+, add explicit RLS policies or an equivalent reviewed database-level isolation strategy.

### Step 5 - Deployment environment

Use Vercel or another Node-compatible provider. Store secrets in platform environment variables, not in source. Vercel environment variables are encrypted at rest, but access still needs to be limited to trusted project members.

### Step 6 - Database migration/deploy flow

Use reviewed Prisma migrations and a controlled deploy step. Do not rely on ad hoc local production URL changes as the normal migration path.

### Step 7 - Work smoke test

Browser test against the online environment:

- log in;
- create a project;
- add/toggle/delete a task;
- add/pin/delete a note;
- add/update/delete a deliverable;
- reload page and confirm persistence;
- confirm another unauthenticated browser cannot access dashboard data.

### Step 8 - Public route containment

Before L1 goes online, choose one:

- temporarily disable `/client/[token]`;
- keep it inaccessible/unlinked and clearly not production;
- or implement `CLIENT-001` before sharing any client URL.

Because the current public page reads mock data, it is not a trustworthy external boundary.

---

## 8. Module-by-Module Readiness

| Module | UI readiness | Runtime persistence | Security boundary | Launch tier |
|---|---|---|---|---|
| Work | high | high for CRUD | app-layer only, mock auth | L1 core |
| Dashboard | medium | low | no real route auth yet | L2 |
| Research | high | low/localStorage | no real auth/service boundary | L2 |
| AI Input / Inbox | high | low/mock | formal-mode gate exists | L3 |
| Workflow | medium | low/mock | no runtime audit boundary | L3 |
| Client Portal | medium | low/mock | public route risk | L4 unless disabled |
| Chamber | medium shell | none | high/PII not implemented | L4 |
| Finance | medium shell | none | high-risk, approval required | L4 |
| Life | medium shell/fitness | none | high privacy risk | L4 |
| Company | medium shell | none | high strategy risk | L4 |
| Agent Team OS | docs strong | governance only | good docs, no runtime | L5 later |

---

## 9. Recommended Sequencing

### Launch Track - L1

1. `AUTH-001` - Supabase Auth strategy and implementation.
2. Route protection for dashboard routes.
3. `AUTH-002` scoped decision - DB permissions now or single-owner policy for L1.
4. Work online smoke test and updated WORK-007 report.
5. Client Portal containment or `CLIENT-001`.
6. Vercel deployment checklist: env vars, build, migration deploy, seed policy, smoke test.

### Daily Driver Track - L2

1. Research DB-backed BFF/service model.
2. Dashboard real attention aggregation from Work and Research.
3. Morning Brief v1 as deterministic query summary.
4. Module permissions from DB or enforced single-owner config.
5. Backup/restore policy and basic production logging.

### Source Workflow Track - L3

1. `DATTR-024` persistence, after migration review.
2. Manual SourceAsset capture first.
3. AIWorkflowRun / AIWorkItem review queue.
4. ModuleWriteIntent into Work.
5. Only then add real connectors.

### Sensitive Modules Track - L4

1. Client Portal DB-backed token and visibility filter.
2. Chamber CRM MVP with PII policy.
3. Finance draft-only MVP, no final transactions.
4. Life privacy-first MVP.
5. Company Strategy confidentiality gates.

---

## 10. Owner Decisions Blocking Implementation

From `D-CHECKPOINT-001`, these remain the real gates:

- Auth provider and login method.
- Whether L1 is single-owner only.
- Whether dev bypass is allowed locally.
- RLS timing and policy shape.
- Client Portal token strategy.
- Deployment platform and domain.
- Whether any high-risk module may receive real writes.

Recommended immediate decision:

```txt
Approve Supabase Auth, single-owner first, email magic link or Google OAuth, dev bypass only in development.
```

That unlocks the next practical implementation loop.

---

## 11. Risks

| Risk | Severity | Why it matters | Mitigation |
|---|---|---|---|
| Mock auth online | critical | anyone hitting server actions could resolve as seeded admin if route not protected | replace `requireUser()` before online use |
| Client-only module guard | high | localStorage role toggles are not security | server-side auth/permission checks |
| Public client route mock data | high | false confidence around external sharing | disable or implement DB-backed filter |
| Research localStorage | medium | data is browser-local and fragile | DB-backed Research BFF |
| AI Input mock/formal confusion | medium | user may think source data is persisted | keep kill switch and explicit empty states |
| Prisma direct connection vs RLS | high for multi-user | DB-level auth may not match session automatically | service authorization plus explicit RLS strategy |
| High-risk modules too early | high | finance/life/company data can create privacy and decision risk | draft/proposal-only until auth/audit exists |

---

## 12. Final Recommendation

Do not wait for every module before going online. Launch in layers.

The next meaningful milestone should be:

```txt
L1 - Private Online Work OS
```

That is the first version where the system starts paying rent in daily life. It narrows scope enough to be safe while preserving the direction of the full Personal OS.

After L1, the next highest-value path is:

```txt
Research persistence + real Dashboard attention
```

Only after that should the project spend serious implementation time on external connectors, source workflow persistence, Client Portal sharing, Finance, Life, Company, or Chamber production data.

---

## 13. Verification For This Research Pass

Commands and checks performed:

```bash
sed -n ... AGENTS.md docs/product/* docs/tasks/* docs/dev/* docs/architecture/*
rg --files src/app src/components src/lib prisma docs/dev
sed -n ... src/lib/services/auth.service.ts
sed -n ... src/app/actions/work.ts
sed -n ... src/lib/services/project.service.ts
sed -n ... src/app/client/[token]/page.tsx
sed -n ... src/lib/context/module-permissions-context.tsx
sed -n ... src/lib/context/research-context.tsx
sed -n ... node_modules/next/dist/docs/01-app/... deployment/auth/security docs
```

No runtime code, Prisma schema, migration, database, connector, or public route behavior was changed in this pass.
