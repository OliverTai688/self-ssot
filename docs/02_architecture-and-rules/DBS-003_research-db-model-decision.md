# D-DECISION-001: Research Network DB Model Decision

**Task:** RESEARCH-001
**Date:** 2026-06-09
**Status:** DECIDED + UPDATED — `RESEARCH_MODEL_RECONCILIATION_CONTRACT` supersedes stale greenfield assumptions before migration

> 2026-06-24 update: DBS-003 previous no-research-tables statement is superseded. The current Prisma schema now has a partial thread-first transitional Research state. No migration is authorized by this decision update.

---

## Context

Research began as mock/localStorage state in `research-context.tsx`, with a target Research Object Network shape in `src/types/research.ts`. Before expanding DB-backed Research operation, the canonical model must be decided: specifically whether Research objects (issues, sources, ideas, concepts, writing projects, events, people) use a single polymorphic graph approach or separate typed tables.

The repository has since moved past the original greenfield assumption. The existing TypeScript types define both legacy `ResearchThread` and canonical network-layer types such as `ResearchIssue`, `ResearchQuestion`, `ResearchSource`, `ResearchConcept`, `ResearchIdeaV2`, `ResearchWritingProject`, `WritingSection`, `AIFeedbackRun`, `ResearchEvent`, `AcademicPerson`, and `ResearchLink`.

The Prisma schema currently contains a partial thread-first transitional state:

- `ResearchThread`
- `ResearchSource`
- `ResearchConcept`
- `ResearchWritingProject`
- `ResearchWritingSection`
- `AIFeedbackRun`
- `ResearchDigest`
- `ResearchEvent`
- `AcademicPerson`

Those models are not deleted by this document. They are treated as transitional until the canonical ResearchIssue/object-network model and owner-scoped BFF read DTO contract are approved.

---

## Decision

**Use separate typed tables with an explicit link table for cross-object relationships.**

Rationale:
- Research objects have meaningfully different fields (an issue has `mainResearchQuestion`, a source has `doi`/`year`/`authors`). A single polymorphic `research_nodes` table with a JSON blob column would lose the ability to query/index typed fields.
- The existing `ResearchLink` type already models a many-to-many edge with `sourceEntityType`, `targetEntityType`, `relation`, and `metadata`. This maps cleanly to a `research_links` table.
- Separate tables allow Prisma to generate type-safe accessors per entity class.

---

## Proposed Table Structure

```
research_issues          id, owner_id, title, status, main_research_question, keywords[], description, created_at, updated_at
research_questions       id, issue_id, owner_id, text, status, created_at
research_concepts        id, owner_id, title, description, definitions(JSON), tags[], created_at
research_sources         id, owner_id, title, source_type, doi, url, authors[], year, publisher, reliability, abstract, notes, keywords[], created_at
research_ideas_v2        id, owner_id, title, body, idea_type, status, source_context, linked_project_id?, created_at
research_writing_projects id, owner_id, title, writing_type, status, target_venue_id?, target_venue_name?, abstract, created_at
research_writing_sections id, writing_project_id, heading, content, word_count, section_type, order_index
research_events          id, owner_id, name, event_type, submission_deadline?, notification_date?, event_date?, location, fields[], acceptance_rate?, created_at
research_people          id, owner_id, name, affiliation, role, research_fields[], collaboration_status?, created_at
research_links           id, owner_id, source_entity_type TEXT, source_entity_id UUID, target_entity_type TEXT, target_entity_id UUID, relation TEXT, metadata(JSON), created_at
```

All tables include `owner_id UUID REFERENCES profiles(id)` for row-level isolation.

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Graph edges | Separate `research_links` table (not FK columns) | Enables arbitrary many-to-many edges without schema changes per new relation type |
| Entity IDs in links | `TEXT` + `UUID` columns | Avoid polymorphic FK (Postgres doesn't support multi-table FK targets) |
| Keywords/fields | `TEXT[]` Postgres arrays | Avoids join table for simple tag-like fields; indexable with GIN |
| Writing sections | Child table of writing projects | Sections are ordered and project-scoped; not shared |
| Venue reference | Optional `target_venue_name TEXT` (denormalized) | Full events normalization deferred; FK to `research_events` optional |
| AI feedback runs | Separate table (not in this proposal) | `AIFeedbackRun` is workflow output, belongs with AI module tables |

---

## What Is NOT Included

- No new migration is authorized by this decision update.
- No current `ResearchThread` model is promoted to canonical parent status.
- No `ResearchLink` runtime persistence is authorized until link provenance metadata, audit refs, and owner-scoped authorization are defined.
- No existing Research server actions are approved for formal use while they accept caller-supplied `ownerId` or `threadId` instead of deriving owner identity from `requireUser()`.
- No public output, external collaboration, external agent database access, Research agent final write, or external registration is authorized.
- No `ResearchIdea` v1, `ResearchMaterial`, `ResearchOutput`, or `ResearchData` table is added here; those old v1 concepts remain superseded by sources, idea inbox, writing, typed links, and DataUnit-layer proposals.

---

## RESEARCH-MODEL-001 Reconciliation Contract

`src/lib/contracts/research-model-reconciliation.contract.ts` is the machine-checkable reconciliation artifact for `RESEARCH-MODEL-001`.

It records:

- current DB state as partial thread-first transitional;
- `ResearchThread`, `ResearchSource`, `ResearchConcept`, `ResearchWritingProject`, `ResearchWritingSection`, `AIFeedbackRun`, `ResearchDigest`, `ResearchEvent`, and `AcademicPerson` as transitional Prisma models;
- `ResearchIssue`, `ResearchQuestion`, `ResearchIdeaV2`, `ResearchLink`, records/audit, graph projection, and Research agent proposals as target or planned families;
- the future owner-scoped BFF read DTO path: `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> UI-safe DTO -> Client Component interaction`;
- typed link groups for evidence links, workflow links, and relationship links;
- unsafe current action groups in `research-threads.ts`, `research-sources.ts`, `research-writing.ts`, and `research-events.ts`;
- stop conditions for schema changes, migration/apply, seed changes, route handlers, server actions, runtime DB reads/writes, public output, external collaboration, direct external agent DB access, Research agent final writes, external registration, and launch-level claims.

Existing Research server actions remain unsafe for formal use until service-layer owner authorization replaces or wraps them.

Verification:

```bash
node --check scripts/check-research-model-reconciliation.mjs
pnpm research:model:check
pnpm research:readiness:check
pnpm module:realdata:check
pnpm module:index:check
pnpm db:validate
pnpm exec tsc --noEmit --pretty false
```

## RESEARCH-BFF-001 Owner-Scoped Read DTO Contract

`src/lib/contracts/research-owner-read-dto.contract.ts` is the machine-checkable owner-scoped Research read DTO contract for `RESEARCH-BFF-001`.

It records:

- `RESEARCH_OWNER_READ_DTO_CONTRACT` as the protected owner-read boundary before any Research runtime DB read expansion;
- read DTO families for Research issues, sources, concepts, writing projects, writing sections, events, people, typed links, graph projections, readiness evidence, and Research agent proposals;
- the future owner-scoped Research read path: `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> owner-scoped read query -> mapper -> UI-safe DTO -> Client Component interaction`;
- the invariant that owner identity is derived from `requireUser()` with no caller-supplied `ownerId`;
- the invariant that direct `threadId`-only access is not sufficient until the Research service proves ownership through the authorized owner profile;
- explicit empty/readiness states for no rows, read unavailable, partial transitional data, disabled formal read, and proposal-only agent output;
- blocked runtime reads, writes, schema migrations, public output, external collaboration, external agent direct DB access, Research agent final writes, external registration, and launch-level claims.

No migration is authorized by this decision update. `RESEARCH-BFF-001` only approves the contract and static proof shape for the next server-only service or protected surface slice.

Verification:

```bash
node --check scripts/check-research-owner-read-dto.mjs
pnpm research:read-dto:check
pnpm research:model:check
pnpm research:readiness:check
pnpm db:validate
pnpm exec tsc --noEmit --pretty false
```

## Migration Impact

- Research is no longer greenfield because partial thread-first models already exist.
- Safe migration work requires an explicit follow-up task after `RESEARCH_MODEL_RECONCILIATION_CONTRACT`, `RESEARCH_OWNER_READ_DTO_CONTRACT`, service-layer owner authorization, mapper review, and owner approval.
- Migration options must choose whether to rename/map `ResearchThread` into canonical `ResearchIssue` semantics, add separate `ResearchIssue` and bridge rows, or keep thread legacy as read-only compatibility.
- All canonical Research tables and link/audit additions require reviewed migration impact notes.
- Seed changes are blocked until canonical ownership, link provenance, and audit refs are defined.

---

## Acceptance Criteria

- [x] Issue/source/link model decision documented
- [x] Table list and key design decisions written
- [x] 2026-06-24 reconciliation update marks current thread-first Prisma models as transitional
- [x] `RESEARCH_MODEL_RECONCILIATION_CONTRACT` maps current thread-first state to target Research Object Network families
- [x] `pnpm research:model:check` validates the reconciliation artifact, current schema markers, unsafe action markers, docs, backlog, sprint, and task memory
- [x] Owner-scoped Research read DTO contract proposed
- [ ] Prisma schema migration generated and reviewed

---

## Next Step

After `RESEARCH-BFF-001`, prefer `RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE` as the next no-proof slice unless `AUTH-005` or `WORK-009` prerequisites appear first. Do not run migration until the owner-scoped BFF path, canonical issue/thread mapping, typed link metadata, audit refs, safe DB target, and owner approval are explicitly approved.
