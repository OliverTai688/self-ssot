# Loop 144 Research Model Reconciliation Gap Review

**Document ID:** `RPT-041`  
**Date:** 2026-06-24  
**Loop:** 144  
**Status:** Completed research-to-task gap review  
**Selected task:** `LOOP-144-RESEARCH-MODEL-GAP-REVIEW`  
**Next executable task created:** `RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION`

---

## 1. Strategic Review Gate

| Question | Answer |
|---|---|
| Current primary target | Keep shortest-path convergence toward private online operating experience while owner-run proof remains Manual Ops. |
| Current launch level | Formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`. |
| Last three loop delta | Loop 141 created the Research formal readiness/BFF task shape. Loop 142 added the contract/checker. Loop 143 surfaced the contract in protected `/research/readiness`. |
| Current blocker | Research cannot become a formal real-data module until `ResearchIssue` / `ResearchThread` / link graph semantics are reconciled and owner-scoped BFF reads are defined. |
| Repeat check | The last two Research loops were contract/surface work. This loop is still documentation-heavy, but it is the required third-loop research cadence and produces the next executable implementation slice. |
| Capability moved | Research model architecture and BFF readiness; no runtime schema/write expansion. |
| More true after this loop | The next safe Research task is no longer vague: reconcile the current thread-first Prisma state with the Research Object Network target before migrations or writes. |

Proof preemption was refreshed for this loop with:

```bash
pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-144-20260624-launch-preemption-router.json
```

Result: recommendation remains `RES-001-RESEARCH-REVIEW`; `AUTH-005`, `WORK-009`, and `DEPLOY-002` are still blocked by missing owner/operator proof prerequisites.

---

## 2. Requirement Understanding Score

**Issue:** Research formal real-data model reconciliation and first owner-scoped BFF path.

| Dimension | Score | Notes |
|---|---:|---|
| Actor/job clarity | 18/20 | Owner needs Research to manage issues, sources, concepts, writing, events, people, graph links, and agent proposals without hidden mock persistence. |
| PRD/local evidence fit | 19/20 | `PRD-001`, `PRD-005`, `ARC-006`, `DBS-003`, `DBS-005`, `RES-001`, `RES-002`, `RESEARCH-OPS-001`, and `/research/readiness` all identify this gap. |
| Data/BFF/API clarity | 16/20 | Current Prisma has thread-first partial models, while UI/types and DBS target an object-network model. The first task must decide the transitional map, not add writes. |
| UI/reference-pattern confidence | 13/15 | The current UI can show readiness; formal resource index/read DTOs are clear enough after the model decision. |
| Risk/auth/public boundary clarity | 14/15 | Existing Research actions accept caller-supplied ids; formal path must derive owner from `requireUser()` and block writes/public output/external collaboration. |
| Acceptance/verification clarity | 9/10 | A contract/checker/update slice can be verified without DB runtime. |

**Total:** 89/100  
**Understanding level:** High  
**Required optimization rounds:** 3  
**Completed:** 3

---

## 3. Research Optimization Rounds

### Round 1: Local Product, Code, And Schema Fit

Local evidence shows two valid but currently divergent models:

- `ARC-006_research-ia-refactor-plan.md` says the correct long-term shape is Research Object Network-centered, where `ResearchIssue` is one organizing view and cross-object relationships use `ResearchLink`.
- `src/types/research.ts` already preserves legacy `ResearchThread` while adding `ResearchIssue`, `ResearchQuestion`, free-standing `ResearchSource`, `ResearchIdeaV2`, writing projects, events, people, and typed links.
- `src/lib/context/research-context.tsx` persists the object network in localStorage keys such as `pos_res_issues`, `pos_res_sources`, `pos_res_links`, `pos_res_people`, and `pos_res_writing`.
- `prisma/schema.prisma` currently has partial thread-first tables: `ResearchThread`, `ResearchSource`, `ResearchConcept`, `ResearchWritingProject`, `ResearchWritingSection`, `AIFeedbackRun`, `ResearchDigest`, `ResearchEvent`, and `AcademicPerson`.
- Existing `src/lib/actions/research-*.ts` actions use direct Prisma calls and caller-supplied `ownerId` / `threadId`, so they are not the formal owner-scoped BFF boundary.
- `DBS-003_research-db-model-decision.md` is now stale in one important way: it still says Prisma has no Research tables, while the schema now has partial Research tables.

Selected local interpretation: keep the current Prisma models as transitional partial state, but do not expand Research runtime writes until a reconciliation artifact maps `ResearchIssue`, `ResearchThread`, free-standing resources, and typed links.

### Round 2: External / Primary Pattern Research

Primary sources support typed resources plus explicit relationships instead of a single forced parent:

- Zotero Web API item JSON includes typed bibliographic item fields plus `tags`, `collections`, and `relations`; write access also requires an API key with write permission. Source: [Zotero Web API basics](https://www.zotero.org/support/dev/web_api/v3/basics), [Zotero write requests](https://www.zotero.org/support/dev/web_api/v3/write_requests).
- OpenAlex describes scholarly data as connected entities such as works, authors, sources, institutions, topics, publishers, and funders in a heterogeneous graph. Source: [OpenAlex Developers overview](https://developers.openalex.org/).
- Notion API represents relation properties as references to another data source, and related databases must be shared with the connection before relation retrieval/update. Source: [Notion data source properties](https://developers.notion.com/reference/property-object), [Notion database object](https://developers.notion.com/reference/database).
- Prisma official docs recommend explicit many-to-many relation models when relation metadata is needed. Source: [Prisma many-to-many relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations).

Selected pattern: Research should use typed resources and an explicit relationship/link model with metadata and provenance. A thread/issue can be a view or organizing record, not the only parent for all sources, concepts, ideas, people, events, and writing.

Rejected pattern: silently rename current `ResearchThread` to `ResearchIssue` in UI or docs. This hides the existing data model split and would make future migrations ambiguous.

### Round 3: BFF, Auth, Risk, And Verification Boundary

The first implementation slice should be contract/static-proof work, not schema/write work:

- Formal reads must follow `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> UI-safe DTO -> Client Component interaction`.
- Existing Research actions are unsafe for formal use because caller-supplied owner/thread ids can bypass the intended service authorization shape.
- Research agent proposals remain protected-owner visible and proposal-only; `externalRegisterable` stays `false`.
- No public output, external collaboration, schema/migration, seed change, route handler, server action expansion, or DB read/write should be added by the model reconciliation task.

Selected verification shape:

- Static model reconciliation contract or updated DBS decision exists.
- Checker proves the contract names current Prisma models, target object-network families, transition mapping, blocked writes, auth boundary, and stop conditions.
- Existing `pnpm research:readiness:check`, `pnpm module:realdata:check`, `pnpm module:index:check`, `pnpm db:validate`, and `pnpm exec tsc --noEmit --pretty false` continue to pass.

---

## 4. Executable Task Shape

| Field | Value |
|---|---|
| Task ID | `RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION` |
| Mode | Research / DB model reconciliation / BFF contract / no-runtime writes |
| Scope | Reconcile `ResearchIssue` / `ResearchThread` semantics, map current Prisma models to Research Object Network resource families, and produce a machine-checkable transition contract before any Research migration or write expansion. |
| Likely files | `DBS-003_research-db-model-decision.md`, new or updated Research model reconciliation contract/checker, `ACC-002`, `PLN-060`, `PLN-061`, `tasks.md`, generated evidence. |
| Acceptance | Current thread-first Prisma state is described as transitional; target Research object-network families are mapped; future owner-scoped BFF read DTO path is named; unsafe actions and writes stay blocked; no launch-level claim is made. |
| Verification | New checker if added, `pnpm research:readiness:check`, `pnpm module:realdata:check`, `pnpm module:index:check`, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse, `git diff --check`. |
| Risks | Ambiguous migration direction, accidental runtime write enablement, stale docs referencing old table state, external/public Research output boundaries. |
| Stop conditions | Stop before Prisma schema changes, migration/apply, runtime DB reads/writes, route handlers/server actions, public output, external collaboration, or agent final writes unless explicitly selected and approved. |

---

## 5. NANDA / Agent Protocol Alignment

Applies because Research agent proposals and external collaboration boundaries are mentioned.

| Field | Decision |
|---|---|
| Surface type | Protected owner-visible proposal/readiness only |
| Affected fields | identity, capabilities, skills, auth, trust, observability, registry status |
| Runtime status | No runtime agent execution or external endpoint added |
| External registration | `externalRegisterable: false` |
| Trust boundary | Research agents may propose links, summaries, and writing feedback only after owner-scoped BFF/audit decisions; no final writes or direct DB access. |
| Concrete artifact | Backlog/acceptance task requiring model reconciliation before Research agent proposal persistence. |

---

## 6. Updates Made

- Added this formal report as `RPT-041`.
- Added generated loop evidence under `docs/2_agent-input/generated/agent-loop/reports/`.
- Added `LOOP-144-RESEARCH-MODEL-GAP-REVIEW` and `RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION` to backlog/task memory.
- Updated sprint, acceptance criteria, completed log, document index, and loop state.

---

## 7. Remaining Risks And Routing

- Formal launch remains `L0_LOCAL_PROTOTYPE` until `AUTH-005`, `WORK-009` or approved Work proof fallback, and `DEPLOY-002` evidence exist.
- Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- Research remains UI-rich/prototype/readiness until model reconciliation and owner-scoped BFF proof exist.
- Loop 145 is the next fifth-loop launch-level review unless proof prerequisites appear and are handled inside that review.
