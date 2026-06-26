# Folder Structure

**Document ID:** `MAN-003`
**Last updated:** 2026-06-20
**Purpose:** Repo folder map for agents working in Personal OS.

---

## Documentation Structure

```txt
docs/
  00_manual-and-index/       Manuals, indexes, loop guides
  01_product-requirements/   Product vision, PRDs, roadmap docs
  02_architecture-and-rules/ Architecture, auth, DB, schema, migration rules
  03_feature-reference/      Stable reference material
  04_playbook/               Playbooks and reusable operating scripts
  05_execution-plans/        Plans, backlog, current sprint, implementation proposals
  06_audits-and-reports/     Reports, audits, inventories, completed log
  07_research-and-design/    Research and design exploration
  08_acceptance-and-qa/      Acceptance criteria and QA gates
  2_agent-input/             Generated agent material, raw data, temporary packets
```

Formal docs must follow `TYPE-NNN_kebab-case-title.ext`. See `MAN-000_docs-usage-manual.md`.

## Runtime Code Structure

```txt
src/app/              App Router routes and route-level server components
src/app/actions/      Route-facing server actions
src/components/       UI, layout, module components
src/lib/actions/      Shared or compatibility server actions
src/lib/services/     Authorization and DB service layer
src/lib/mappers/      DB model to UI view-model conversion
src/lib/context/      Client-side providers and prototype state
src/lib/mock/         Seed/demo/mock data
src/types/            UI/domain view model types
prisma/               Prisma schema, migrations, seed
supabase/             Legacy/current Supabase SQL artifacts
```

## Important Boundaries

- Client Components do not import Prisma, DB clients, provider secrets, or raw adapter payloads.
- DB-backed operational features go through BFF contracts, `requireUser()`, service authorization, domain services, and mappers.
- Mock UI work must remain visibly mock and must not add hidden persistence.
- Raw datasets and generated reports belong in `docs/2_agent-input`, not the formal docs library.
