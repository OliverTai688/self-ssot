# D-PLAN-011 Frontend Operating Surface Development Plan

Date: 2026-06-07

Status: `FOPS-001_DONE`

Purpose: plan the next large frontend development phase after the initial Work CRUD and AI Input workflow console work. This plan prioritizes clear frontend boundaries, structured operation, module-specific Agent workspaces, and module records/audit subpages.

Primary architecture doc:

- `docs/architecture/frontend_operating_surface.md`

## 1. Development Goal

Make Personal OS modules easier to operate before adding more backend behavior.

The next large phase should make every major module answer:

```txt
What needs attention?
What can I operate here?
What is the module agent proposing?
What happened before?
What boundaries or visibility rules apply?
```

## 2. Frontend-first Scope

This phase is frontend-first and BFF-first.

Allowed:

- IA planning
- UI-only/mock module shells
- subpage navigation prototypes
- module Agent workspace mock shells
- records/audit table mock shells
- BFF-visible view model contracts
- task and acceptance updates

Not allowed without a separate reviewed task:

- Prisma schema changes
- migrations
- Supabase writes
- runtime agent autonomy
- external connector runtime
- public/client-visible output
- high-risk module final writes
- broad redesign of every module in one pass

## 3. FOPS Task Batch

| Task id | Title | Status | Mode | Output |
|---|---|---|---|---|
| `FOPS-001` | Define frontend operating surface and module attention model | DONE | docs/architecture | `frontend_operating_surface.md`, this plan |
| `FOPS-002` | Audit existing module routes against operating surface model | TODO | docs/report | route-by-route IA gap report |
| `FOPS-003` | Prototype common module subpage navigation pattern | TODO | UI-only/mock | shared pattern for overview/agent/records/settings |
| `FOPS-004` | Prototype module Agent workspace shell | TODO | UI-only/mock | agent queue, proposal table, boundary panel, run log |
| `FOPS-005` | Prototype module records/audit subpage pattern | TODO | UI-only/mock | filterable records table + timeline drilldown |
| `FOPS-006` | Refactor Work IA toward operation/agent/records boundaries | TODO | UI-first | Work attention and future subpage boundaries |
| `FOPS-007` | Refactor Research IA toward evidence/agent/records boundaries | TODO | UI-first | Research evidence/data-unit/agent/records clarity |
| `FOPS-008` | Define placeholder module operating surfaces for Finance, Chamber, Company, and Life | TODO | UI-first | placeholder modules become operation-ready shells |

## 4. Recommended Sequence

1. `FOPS-002`: Audit current routes and identify attention/operation/agent/records gaps.
2. `FOPS-003`: Prototype common module subpage navigation using UI-only state or mock routes.
3. `FOPS-004`: Prototype one module Agent workspace shell, likely Work or AI Input.
4. `FOPS-005`: Prototype one records/audit subpage pattern.
5. `FOPS-006`: Apply the pattern to Work after existing Work CRUD remains stable.
6. `FOPS-007`: Apply the pattern to Research after evidence/DataUnit direction is reviewed.
7. `FOPS-008`: Upgrade Finance, Chamber, Company, and Life placeholders into structured operation surfaces without real high-risk writes.

## 5. Module Priority

| Priority | Module | Reason |
|---|---|---|
| P0 | Work | First DB-backed operational module; best place to validate module operation + records + agent workspace. |
| P0 | AI Input / Ingestion | Already has workflow console; needs @mention, records, and formal BFF path. |
| P1 | Research | Needs source/evidence/DataUnit clarity before DB alignment. |
| P1 | Workflow | Existing rule/audit UI can become records/run surface. |
| P2 | Chamber | Relationship operations need clearer list/queue/contact/opportunity surfaces. |
| P2 | Life | Needs privacy-first reflection and records boundary before persistence. |
| P2 | Finance | High-risk; start as draft/review queue only. |
| P2 | Company | Strategy should have decisions/initiatives/principles with strong privacy boundaries. |
| P3 | Client Portal | Public page should remain simple; internal visibility/records can be planned separately. |

## 6. UI Pattern Priorities

Highest priority:

- attention header
- table/list queue
- records/audit table
- agent proposal table
- command bar
- detail drawer
- responsive subpage navigation

Lower priority:

- dense metrics dashboards
- decorative summary cards
- visual graph enhancements
- complex multi-column card layouts

## 7. Acceptance Principles

A module UI is acceptable when:

- the primary attention is obvious in the first viewport
- the main operation surface is clear
- the module agent has a bounded workspace
- records/audit are findable
- settings/boundaries are separate from operational work
- review items are not confused with final records
- high-risk module actions show explicit review/approval boundaries
- the page is useful on mobile without duplicating entire desktop IA
- no Client Component imports Prisma/provider secret/raw adapter payloads

## 8. Relationship To DATTR And Agent Team OS

`FOPS-*` is the frontend operating companion to:

- `DATTR-*` source/input architecture
- `DATA-*` data operations and write-intent architecture
- `AGENT-*` agent governance architecture

FOPS does not replace those tracks. It gives them a visible and reviewable frontend structure.

## 9. Recommended Next Task

Recommended immediate next task:

```txt
FOPS-002 — Audit existing module routes against operating surface model
```

Alternative if source-input governance remains more urgent:

```txt
DATTR-011 — Define source intake security, privacy, and retention policy
```

