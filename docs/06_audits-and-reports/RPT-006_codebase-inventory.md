# Codebase Inventory

**Last updated:** 2026-06-02  
**Purpose:** Short audit of current codebase, documents, data sources, and v0.1 blockers.

## 1. Current Product Modules

- Dashboard / Morning Brief
- AI Input
- Inbox / Ingestion
- Work
- Client Portal
- Research
- Workflow
- Life
- Finance
- Chamber
- Company
- Agent Team OS as repo governance

## 2. Current Technical Structure

| Area | Current structure |
|---|---|
| Routes | `src/app/(dashboard)/*`, `src/app/client/[token]`, root redirect/page |
| Work UI | `src/components/work/*` |
| Research UI | `src/components/research/*` |
| Ingestion UI | `src/components/ingestion/*`, `src/components/ai/*` |
| Layout | `src/components/layout/*` |
| DB client | `src/lib/db.ts` with Prisma + `@prisma/adapter-pg` |
| Services | `src/lib/services/auth.service.ts`, `project.service.ts`, `mock-ai.service.ts` |
| Server actions | `src/app/actions/work.ts`, `src/lib/actions/*` |
| Mappers | `src/lib/mappers/work.mapper.ts` |
| Providers | Module permissions, research, workflow, ingestion, AI panel, life |
| Mock data | `src/lib/mock/*`, `src/lib/workflow/mock-data.ts` |
| Schema | `prisma/schema.prisma` |

## 3. Existing Documents

| Folder | Meaning |
|---|---|
| `docs/product` | Product vision and PRD-level docs. |
| `docs/architecture` | Data flow, sync, ingestion pipeline, workflow/agent, research IA architecture. |
| `docs/dev` | Development plans and closed-loop operating docs. |
| `docs/agents` | Internal agent roles, boundary policy, skill registry, task routing. |
| `docs/tasks` | Backlog, phase plan, acceptance criteria, sprint, completed log. |
| `docs/reference` | Raw/reference assets and non-operational material. |

## 4. DB-Backed Modules

| Module | Status |
|---|---|
| Work | DB reads exist for projects, tasks, notes, deliverables. Write UI still partly local state. |
| Research | Prisma actions exist for thread/source/writing/event models, but current UI often uses localStorage/network mock types. |
| Workflow | Prisma models exist, but runtime page uses mock rules/messages. |
| Profile / Permissions | Prisma models exist; runtime auth and module permissions are mock/localStorage. |

## 5. Mock / localStorage / State-Based Modules

| Module | Current state |
|---|---|
| Dashboard | Mock morning brief cards. |
| AI Input / Inbox | Mock source connections, raw items, normalized content, evidence, proposals. |
| Research | `ResearchProvider` hydrates many collections from localStorage fallback mocks. |
| Workflow | Page state uses `MOCK_RULES` and `MOCK_MESSAGES`. |
| Life | Life context uses mock data and local state. |
| Client Portal | Public page still reads mock Work data. |
| Finance / Chamber / Company | Placeholder pages. |

## 6. Key Risks Blocking First Operational Version

1. Prisma schema and Supabase SQL migration drift.
2. No `prisma/migrations` folder despite config pointing there.
3. Auth service returns mock admin user.
4. Module permissions are localStorage-based.
5. Work write interactions still local-state based.
6. Client Portal reads mock data and must be DB visibility-filtered.
7. Research UI and Prisma schema are not yet aligned around the network model.
8. Workflow/Ingestion audit trail is conceptual but not persisted.

## 7. Recommended First Closed-Loop Development Target

Make Work the first operational DB-backed loop:

1. Stabilize DB contract and seed.
2. Connect Work create/toggle/add flows to server actions.
3. Make `/client/[token]` DB-backed with strict visibility filters.
4. Update task files and completed log after each small change.
