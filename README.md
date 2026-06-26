# Personal OS — Career Competency Operating System

> A database-backed, AI-agent-assisted "operating system" for running real knowledge work:
> projects, research, ingestion pipelines, workflow automation, life/finance context,
> client-facing deliverables, and a closed-loop development process driven by AI agents.

個人結構化管理系統（Personal OS）。一套以資料庫為基礎、由 AI agent 協助運作的個人/職涯作業系統，
用來管理工作專案、研究物件、資料匯入、工作流自動化、生活與財務脈絡、客戶交付物，
並透過 AI agent 的閉環開發循環持續演進。

---

## What this is

Personal OS treats your work as a structured, queryable system instead of scattered notes and tools.
Each domain is a **module**, each module exposes an **operating surface** (resource index, command bar,
detail view, agent workspace, records/audit, settings), and an AI agent loop continuously reads the
product intent, inspects the code, makes one small verified change, and updates project memory.

The architecture follows a strict **BFF-first, service-layer-authorized** flow so that UI never touches
the database directly and high-risk modules can never be silently written to.

## Modules

| Module | Purpose | Status | DB-backed |
|---|---|---|---|
| **Work** | Projects, tasks, notes, deliverables | Operational | ✅ Yes |
| **Research** | Research threads, sources, concepts, writing, events | UI complete | Mock/state |
| **AI Input** | Source ingestion + AI workflow runs + proposals | UI + readiness | Mock/readiness |
| **Workflow** | Rule/automation engine concepts | UI / proposal | Partial |
| **Life** | Personal life context | UI shell | No |
| **Finance** | Financial context (high-risk) | Shell / stub | No |
| **Chamber** | Relationship / CRM | Shell / proposal | No |
| **Company** | Company strategy (high-risk) | Shell / stub | No |
| **Client Portal** | Token-scoped client-visible output | Fail-closed, gated | Gated |
| **Agent Team OS** | Internal AgentFacts-lite agent registry/readiness | Readiness only | Manifests only |

**Work** is currently the only fully operational, DB-backed module. Everything else is a UI-first
prototype or planning surface until its auth + persistence tasks are explicitly selected.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + shadcn / Radix / Base UI components
- **Prisma 7.8** + **PostgreSQL** (Supabase)
- **Supabase SSR auth** (`@supabase/ssr`) with a dev mock-auth fallback
- Server Actions + service-layer authorization
- `@xyflow/react` (graphs), `recharts` (charts), `react-hook-form` + `zod` (forms/validation)

## Project structure

```text
src/
  app/
    (auth)/login/          # Auth entry
    (dashboard)/           # Authenticated app shell + all modules
      work/ research/ ai-input/ workflow/ life/
      finance/ chamber/ company/ agents/ admin/ settings/ ...
    client/[token]/        # Public, token-scoped client portal
    actions/  api/  auth/   # Server actions, route handlers, auth routes
  lib/
    actions/  services/    # Server actions + service-layer authorization
    contracts/  mappers/   # BFF contracts + Prisma→view-model mappers
    validations/  ai/      # zod schemas + AI helpers
    auth/  supabase/  db.ts # Auth boundary, Supabase clients, Prisma client
    mock/                  # Explicitly-marked prototype/demo data
prisma/                    # schema.prisma + migrations + seed
scripts/                   # Launch-readiness / proof / contract check scripts
docs/                      # Numbered documentation library (see below)
```

## Getting started

Requires **Node 20+** (developed on Node 24) and **pnpm**.

```bash
# 1. Install dependencies (runs prisma generate via postinstall)
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in Supabase URL/keys and DATABASE_URL / DIRECT_URL.
# For local UI work without Supabase, you can set:
#   PERSONAL_OS_AUTH_MODE=mock
#   PERSONAL_OS_DEV_USER_EMAIL=admin@example.com

# 3. Validate & generate the Prisma client
pnpm db:validate
pnpm db:generate

# 4. Run the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

```bash
pnpm db:migrate     # create/apply a dev migration
pnpm db:deploy      # apply migrations (production)
pnpm db:push        # push schema without a migration
pnpm db:studio      # open Prisma Studio
pnpm db:seed        # seed a local/disposable database
```

> Do not seed or run write-proofs against a shared database. Use a local/disposable Postgres,
> and never commit real credentials.

## Verification

The smallest useful verification before committing:

```bash
pnpm exec tsc --noEmit --pretty false   # type check
pnpm db:validate && pnpm db:generate     # schema validation
pnpm build                               # full build
```

The `scripts/` directory contains many `launch:*`, `work:*`, `research:*`, `ai-input:*`,
`agent:*`, and `audit:*` readiness/contract checks (see `package.json` scripts). These enforce
the launch gates and BFF contracts described in the docs.

## Architecture rules (short version)

- **BFF-first:** define the UI-visible contract before runtime code. UI need → BFF contract →
  server action / loader → `requireUser()` → service-layer authz → domain service → Prisma →
  mapper → client component.
- **No leaks:** client components must never import Prisma models, DB clients, or provider secrets.
- **Auth is a boundary:** `requireUser()` and `assertCanAccessProject()` are security checks, not
  conveniences. The Client Portal only exposes data explicitly marked client-visible.
- **High-risk modules** (Finance, Life, Company, Auth, Public output, External agents) require human
  approval before any final write. AI agents may suggest/draft/review, never silently persist.
- **AI agent protocol:** agent surfaces evolve toward MIT NANDA-inspired readiness (stable identity,
  capability/skill manifests, trust boundaries). External registration stays
  `HUMAN_APPROVAL_REQUIRED` until endpoint, auth, trust, and rollback are complete.

## Documentation

The full design lives in a numbered docs library under [`docs/`](docs/):

| Folder | Contents |
|---|---|
| `00_manual-and-index/` | Docs usage manual, master index, development loop |
| `01_product-requirements/` | PRDs, product vision and situation |
| `02_architecture-and-rules/` | Architecture, auth rules, DB contracts, NANDA alignment |
| `03_feature-reference/` | Feature references |
| `04_playbook/` | Operating playbooks |
| `05_execution-plans/` | Plans, task backlog, current sprint |
| `06_audits-and-reports/` | Audits, readiness reports, completed log |
| `07_research-and-design/` | Research notes and design explorations |
| `08_acceptance-and-qa/` | Acceptance criteria and QA checklists |
| `2_agent-input/` | Agent loop strategy, state, and generated evidence |

Start with `docs/00_manual-and-index/MAN-001_document-index.md`.
The agent operating rules are in [`AGENTS.md`](AGENTS.md).

## Closed-loop development

This repo runs an AI-agent development loop: each cycle reads the product intent, inspects the
codebase, runs a strategic-review gate, selects exactly one high-leverage task, makes the smallest
useful verified change, and writes an evidence report under
`docs/2_agent-input/generated/agent-loop/reports/`. See `AGENTS.md` §5 for the full cycle.

---

*Private project — not licensed for redistribution.*
