# Interface Completion Operating Surface Research

**Document ID:** `RES-003`
**Date:** 2026-06-21
**Status:** Implemented as `INTERFACE-001`

## Purpose

This research note converts the user's interface-first direction into an executable implementation standard:

- finish the visible operating interface before waiting on backend proof;
- infer incomplete module UI from the original PRDs;
- use mature operating-product patterns as the UI planning index;
- keep all high-risk or unpersisted flows clearly marked as prototype / no DB write.

The runtime implementation target is not "production data complete." It is "interface complete enough for the owner to operate, review, and decide the next backend slice."

## Local Product Index

Local source review:

- `PRD-004_next-stage-development-plan.md`: Personal OS needs Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, settings, admin, backend/API, and agent surfaces.
- `PRD-005_situation-driven-prd.md`: module value comes from situation-driven operations such as commercial work, chamber CRM, company strategy, finance, research, and life context.
- `ACC-001_v0-1-operating-version.md`: v0.1 requires a usable owner operating version, protected settings/admin, safe Client Portal containment, and explicit auth/data boundaries.
- `RES-002_saas-os-operating-surface-maturity-research.md`: mature surfaces need resource index, command/search/filter, detail, agent workspace, records/audit, settings/boundaries, and explicit real/demo/mock/unavailable state.
- Existing code: Work, Research, AI Input, Workflow, dashboard, settings, and admin already have richer surfaces; Finance, Chamber, Company, and Life were still the most visible placeholder-like gaps.

## External Reference Review

- Linear's filter model supports putting search and status filters at the top of resource queues: <https://linear.app/docs/filters>.
- Airtable's interface record detail pattern supports the list/detail approach, with records opened from list/grid/kanban surfaces into detail, action, and history contexts: <https://support.airtable.com/docs/airtable-interface-layout-record-detail>.
- Retool's admin dashboard pattern supports table/search/button/form building blocks for internal tools: <https://retool.com/use-case/admin-dashboard>.
- Notion's projects/tasks guide supports linked parent/child objects, status, due date, progress, and multiple contextual views: <https://www.notion.com/help/guides/getting-started-with-projects-and-tasks>.
- Next.js 16 local docs under `node_modules/next/dist/docs/01-app/` confirm App Router pages are Server Components by default and interactive state/event handlers belong in Client Components, which fits a client-side prototype shell passed from protected pages.

## Selected Pattern

Use one shared module operating shell with module-specific records:

1. Header: module identity, prototype/no-write state, search, status filters.
2. Metrics: active/review/blocked/agent-proposal counts.
3. Overview: module focus and selected record detail.
4. Operation: table queue plus local draft form.
5. Agent workspace: proposal-only review queue with local approve/reject.
6. Records/audit: timeline/table of operating events.
7. Settings/boundaries: local toggles with locked controls for high-risk or public-sharing actions.

This gives all modules an immediately operable interface while preserving BFF-first and high-risk write boundaries.

## Rejected Alternatives

- Full backend implementation before UI completion: rejected because the user explicitly wants an operable interface first and existing auth/DB proof blockers would delay feedback.
- Decorative cards only: rejected because `RES-002` and the reference products favor resource queues, details, filters, actions, and records.
- Hidden mock persistence: rejected because unpersisted behavior must be visible as prototype/no-write.
- Autonomous Agent writes: rejected because Finance, Life, Company, public output, and external collaboration remain high-risk and human-approval-required.

## Executable Task Shape

Task: `INTERFACE-001` - Complete operable module interface layer from PRD inference.

Scope:

- upgrade `ModuleOperatingShell` from placeholder tabs to an interactive operating surface;
- provide module-specific records, proposals, audit rows, and settings for Finance, Chamber, Company, and Life;
- keep Life's existing `FitnessDashboard`;
- remove main module placeholder copy such as "not enabled", "connect later", and "coming soon";
- preserve explicit `Prototype / no DB write` and high-risk boundaries.

Acceptance:

- Finance, Chamber, Company, and Life each have overview, operation queue, record detail, agent proposal queue, records/audit, and settings/boundaries.
- Users can search, filter, select rows, add a local draft, approve/reject local proposals, and toggle non-locked settings.
- High-risk actions remain locked or proposal-only.
- Client Components do not import Prisma, provider clients, server request helpers, or secrets.
- No route handler, server action, schema change, migration, seed, DB read/write, connector runtime, public output expansion, high-risk final write, external collaboration, or external registration is added.

Verification:

- `pnpm exec tsc --noEmit --pretty false`
- targeted scan for main module placeholder copy
- owner visual review by running the local app and checking `/finance`, `/chamber`, `/company`, and `/life`

Risks:

- This completes the interface layer, not formal persistence.
- Launch level remains blocked by `AUTH-005`, `WORK-009`, and deployment proof.
- Owner visual review is still the best final evidence for "feels complete" UI quality.
