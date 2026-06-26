# Loop 93 Research Gap Review

**Document ID:** `RPT-019`
**Date:** 2026-06-22
**Loop:** 93
**Status:** Complete
**Scope:** `RES-001` / `RES-002` research-to-task review after `WORK-013` and `LOOP-092`

---

## 1. Strategic Review

Current launch level remains `L0_LOCAL_PROTOTYPE`; the next launch target remains `L1_PRIVATE_ONLINE_WORK_OS`.

The last three completed loops were:

| Loop | Result | Impact |
|---|---|---|
| 90 | Launch-level review plus research cadence | Kept level at `L0` and created `WORK-013`. |
| 91 | `WORK-013` Work DB source/static smoke | Guarded Work route/action/service/authz source boundaries without claiming persistence proof. |
| 92 | Shortest-path blocker triage | Confirmed `AUTH-005` and `WORK-009` still need owner/operator proof inputs and routed this loop to research-to-task review. |

The strongest blockers remain external or owner-run:

- `AUTH-005`: missing Supabase public env plus signed-in `/auth/status` evidence.
- `WORK-009`: missing safe local/disposable proof target and write confirmations; Docker daemon unavailable.
- `DEPLOY-002`: downstream of auth/session and Work proof.

Because the previous loops already created proof/source guards, this review should not produce another adjacent evidence harness. It should convert a maturity gap into an implementation-ready runtime or contract slice that does not depend on those owner-run inputs.

## 2. Local Gap Review

Existing local capabilities:

- `SURFACE-MATURITY-003`: module resource index contract covers 10 modules.
- `REALDATA-001`: per-module real-data progression matrix covers 10 modules.
- `AGENT-010` / `AGENT-014` / `AGENT-015`: 10 owner-only agent dry-run operations exist through CLI, protected API contract, and `/agents`.
- `ADMIN-OPS-002`: protected launch operator action registry covers owner-run, dry-run, approval-required, and blocked launch actions.
- `AUDIT-OPS-001`: append-only audit event contract exists as proposal/static proof.

Missing maturity layer:

```txt

Backend/API/BFF operation catalog
  -> route handlers
  -> server actions
  -> service-layer authorization
  -> CLI/check commands
  -> agent operation API/CLI parity
  -> audit/idempotency/retry expectations
  -> module ownership and public-output boundaries
  -> verification command per operation

```

The current system has several strong point contracts, but no single catalog showing which backend operations are route handlers, server actions, protected service loaders, CLI checks, agent dry-runs, owner-run proof commands, proposal-only writes, or blocked high-risk actions.

That absence matters because the next maturity phase needs agents and the owner to reason about the backend without scraping UI or guessing from file names.

## 3. External Reference Review

Primary references used:

- OpenAPI Specification 3.1: operation catalogs should describe paths, operations, parameters, responses, and security schemes. Source: https://spec.openapis.org/oas/v3.1.0.html
- Next.js Route Handlers: App Router backend endpoints are `route.ts` files using Web Request/Response APIs. Source: https://nextjs.org/docs/app/getting-started/route-handlers and https://nextjs.org/docs/app/api-reference/file-conventions/route
- Stripe idempotent requests: mutation APIs need retry/idempotency policy when side effects are possible. Source: https://docs.stripe.com/api/idempotent_requests
- GitHub REST API docs: API references benefit from versioning, authentication guidance, endpoint grouping, and rate-limit visibility. Source: https://docs.github.com/rest
- Local NANDA alignment: agent-operated backends must expose explicit capabilities, endpoints, auth, trust, observability, and approval status before external registration. Source: `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`

Selected pattern for this repo:

- Do not generate a public OpenAPI document yet.
- Do create an internal, protected, no-secret `BackendOperationCatalogContract`.
- Treat each operation as a row with operation id, module, surface, kind, route/action/command, auth boundary, service boundary, DTO boundary, audit need, idempotency/retry stance, risk, verification, and stop condition.
- Start static/contract-first and expose it in protected admin/settings later; no new public route, no DB write, no external registration.

Rejected alternatives:

- Public OpenAPI export now: rejected because public output, auth scope, and private endpoint exposure are not launch-ready.
- Browser-UI scraping by agents: rejected because agent operations should use explicit CLI/API contracts, not unstable UI automation.
- Adding write APIs before cataloging current backend operations: rejected because high-risk modules need authorization, audit, rollback, and human approval gates first.
- Cataloging only route handlers: rejected because this repo also uses Server Actions, service loaders, CLI proof commands, and agent dry-run operations.

## 4. Research-To-Task Decision

Create `BACKEND-OPS-001` as the next implementation-ready task.

### Scope

Build a protected/no-secret backend operation catalog contract and checker.

The first implementation slice should:

- add `src/lib/contracts/backend-operation-catalog.contract.ts`;
- include rows for at least current launch proof commands, auth proof command, Work proof commands, Work server actions, Client Portal gated loader, protected agent dry-run API, module index checker, real-data matrix checker, and high-risk approval blockers;
- add `scripts/check-backend-operation-catalog.mjs`;
- expose `pnpm backend:ops:check`;
- optionally integrate the summary into protected `/admin` and `/settings` through `admin-readiness.service.ts` if the slice remains small;
- update `ACC-002`, backlog, sprint, completed log, tasks, and evidence.

### Acceptance

- Catalog covers route handlers, server actions, services, CLI/check commands, and agent dry-run operations as distinct operation kinds.
- Every row has auth boundary, data/DTO boundary, audit need, idempotency/retry stance, risk, verification command, next task, and stop condition.
- High-risk or public-output operations remain `blocked` or `approval_required`.
- External agent registration remains `externalRegisterable=false`.
- Checker validates required operation ids, no-secret exclusions, package script, docs/task markers, and absence of forbidden secret-like literals.
- No route handler, server action, Prisma schema change, migration, seed, DB read/write, public output expansion, provider mutation, high-risk final write, or external registration is added by the first slice.

### Likely Files

- `src/lib/contracts/backend-operation-catalog.contract.ts`
- `src/lib/services/admin-readiness.service.ts`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `scripts/check-backend-operation-catalog.mjs`
- `package.json`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `tasks.md`

### Verification

- `node --check scripts/check-backend-operation-catalog.mjs`
- `pnpm backend:ops:check -- --out docs/2_agent-input/generated/agent-loop/reports/<loop>-backend-ops-check.json`
- `pnpm agent:api:check`
- `pnpm module:index:check`
- `pnpm module:realdata:check`
- `pnpm launch:actions:check`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm db:validate`
- `git diff --check`

### Risks And Stop Conditions

- Stop before public API documentation if endpoint visibility or auth scope is unclear.
- Stop before write execution or final high-risk module writes.
- Stop before schema or migration changes.
- Stop before exposing raw route payloads, private ids, provider secrets, env values, database URLs, cookies, tokens, or generated proof bodies.
- Stop before external agent registration or public AgentFacts/Agent Card output.

## 5. NANDA Alignment

This review touches agent operation API/CLI readiness but does not change runtime agent behavior.

- Affected fields: endpoints, protocols, capabilities, auth, trust, observability, registry status.
- Runtime status: internal protected dry-run route remains available through `AGENT-014` and `AGENT-015`.
- External registration: still `externalRegisterable=false` and `HUMAN_APPROVAL_REQUIRED`.
- Concrete artifact: `BACKEND-OPS-001` executable task row and acceptance criteria for a no-secret backend operation catalog.

## 6. Next Decision

Loop 94 should run:

1. `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears.
2. `WORK-009` if a safe Docker/local/disposable proof target and confirmations appear.
3. `BACKEND-OPS-001` otherwise.

This keeps the automation moving toward complete operating maturity without waiting inside owner-run proof loops.
