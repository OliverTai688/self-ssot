# RPT-014 Loop 78 Research Gap Review

Date: 2026-06-22

Loop: 78

Selected task: `LOOP-078`

Launch level remains: `L0_LOCAL_PROTOTYPE`

## 1. Strategic Review Gate

Primary target remains `L1_PRIVATE_ONLINE_WORK_OS`, then `L3_FULL_FRONT_MEMBER_ADMIN_EXPERIENCE`. The proof blockers have not changed: `AUTH-005` still needs Supabase public env plus signed-in `/auth/status` evidence, `WORK-009` still needs an approved local/disposable proof DB target and write confirmations, and `DEPLOY-002` remains downstream.

The last three completed loops changed the agent-operating surface:

- Loop 75 completed the launch-level review and created `ARC-032` for the internal task/message bus.
- Loop 76 completed `AGENT-011`, the proposal-only internal multi-agent bus contract and checker.
- Loop 77 completed `AGENT-012`, protected `/agents` as an owner AI command center with single-agent and group-agent proposal packets.

The current blocker preventing the next milestone is no longer interface coverage for agent commands. The gap is that the owner command center is still local-proposal-only, even though the protected internal dry-run HTTP route exists. The highest-leverage no-proof task is therefore to connect `/agents` to `POST /api/agent-operations/dry-run` in a safe owner-only dry-run panel.

What is more true after this loop: the post-command-center gap is formally documented, `RES-004` is refreshed, `AGENT-015` is now an executable backlog row, and loop 79 can implement a small runtime/BFF interaction instead of doing another abstract review.

## 2. Proof Gate

Commands run before task selection:

- `pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-78-20260622-launch-proof.json`
  - Result: expected blocked state. Supabase public URL/key are missing, and the proof cannot claim `L1`.
- `pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-78-20260622-auth-proof.json`
  - Result: expected blocked state. `canRunAuth005=false` because signed-in `/auth/status` evidence is absent.
- `pnpm work:proof-target:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-78-20260622-work-proof-target-readiness.json`
  - Result: expected `needs_operator_input`. `WORK-009` cannot run until `WORK_PROOF_DATABASE_URL`, local/disposable target classification, `PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1`, and the confirmation phrase are present.

Owner-run handoff still applies: if the owner can supply one clean auth/session or Work proof target packet, run `AUTH-005` or `WORK-009` directly. Otherwise do not spend the next loop gathering adjacent evidence.

## 3. Requirement Understanding Score

Page/task: protected `/agents` owner command center dry-run API proof panel.

Score: 91/100, high understanding.

- Actor/job clarity: 19/20. The actor is the owner, and the job is to run safe dry-run proof from a selected agent command.
- PRD/local evidence fit: 19/20. `RES-001`, `RES-002`, `RES-004`, `ARC-028`, `ARC-029`, `ARC-032`, and `ACC-002` all point toward owner-controlled agent operations.
- Data/BFF/API clarity: 18/20. The route and service exist and return a dry-run proof DTO, but the browser-facing UI contract needs one implementation pass.
- UI interaction/reference-pattern confidence: 13/15. The existing `/agents` command center has selection, instruction, proposal, and parity surfaces; the next step is a proof-result panel, not a redesign.
- Risk/auth/public-output clarity: 14/15. Existing route and page are protected; external/public registration remains blocked.
- Acceptance/verification clarity: 8/10. Checkers exist, and loop 79 should extend `pnpm agent:command-center:check` plus use `pnpm agent:api:check`.

High understanding requires three same-issue research optimization rounds before implementation. This loop completed five lenses: local docs/code fit, external protocol sources, BFF/API boundary, risk/permission/public-output boundary, and acceptance/verification split.

## 4. Research Findings

### Local Product And Code Fit

Protected `/agents` is already owner-visible and server-backed by `OwnerAgentCommandCenterContract`. It can select 10 `AGENT-010` operations and four groups from the `AGENT-011` bus, but proposal creation stays local UI state. Separately, `POST /api/agent-operations/dry-run` already exists as an internal OWNER-only route backed by `buildAgentOperationDryRun`.

Selected local gap: `/agents` should call the protected dry-run route for the selected command and render the returned `AgentOperationDryRunProof` safety, validation, registry, and next-action fields.

### External Protocol Sources

The NANDA materials position the ecosystem around agent identity, indexes, protocol bridges, onboarding, attestation, and client-agent mapping. The local implication is to keep Personal OS agents internal-first with explicit manifests, stable capability metadata, and controlled registration-readiness instead of jumping to external registration. Sources: [Project NANDA GitHub organization](https://github.com/projnanda), [projnanda/projnanda](https://github.com/projnanda/projnanda).

The A2A project describes an open standard for agent-to-agent communication and interoperability. The local implication is to continue treating tasks, participants, messages, parts, and lifecycle state as a bus contract before external publication. Source: [A2A Project GitHub organization](https://github.com/a2aproject).

The MCP specification describes a standardized host/client/server protocol for context and tools over JSON-RPC 2.0. The official changelog now lists a newer 2025-11-25 spec after the local docs' 2025-06-18 reference, including auth/discovery-related changes. The local implication is that `AGENT-013` should include a source-refresh step before any external adapter approval package. Sources: [MCP 2025-06-18 specification](https://modelcontextprotocol.io/specification/2025-06-18), [MCP 2025-11-25 changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog).

### BFF/API Boundary

The selected pattern is BFF-first and owner-only:

- UI selection builds a dry-run request from the existing operation command.
- Client Component calls same-origin `POST /api/agent-operations/dry-run` only with `mode: "dry_run"`.
- Route enforces `requireUser()` and OWNER role.
- Service returns no-secret proof DTO from generated internal registry files and the shared command catalog.
- UI renders proof state and validation without persistence, provider calls, DB writes, external registry writes, or execute mode.

### Rejected Alternatives

- External NANDA/A2A/MCP adapter first: rejected because auth/session, deployment proof, scopes, trust, public-safety review, rollback, and human approval are still absent.
- Persisted task/thread/audit store now: rejected because audit schema and real-data persistence are still contract-only and require approved DB targets.
- Provider-backed autonomous agent runtime: rejected because it would cross high-risk write, provider, and external-collaboration boundaries.
- Public AgentFacts/Agent Card endpoint: rejected because every manifest remains `externalRegisterable: false`.

## 5. NANDA Agent Protocol Gate

Affected AgentFacts-lite fields:

- Identity: existing generated internal manifests remain the source of internal agent labels.
- Provider: no provider runtime is added by the selected next task.
- Lifecycle: stays `dry_run` and proposal-first.
- Endpoints: protected internal `/api/agent-operations/dry-run` only.
- Protocols: CLI and protected HTTP dry-run parity only; no external A2A/MCP/NANDA adapter.
- Capabilities and skills: bounded to the 10 shared `AGENT-010` operation ids.
- Auth: `requireUser()` plus OWNER route/page authorization.
- Trust: no external agent access, no direct DB access, no public output.
- Observability: no persisted audit yet; proof DTO and generated evidence remain the current observability layer.
- Registry status: `externalRegisterable: false`.

Classification: protected-owner visible internal runtime. It is not external-registerable.

## 6. Executable Task Added

`AGENT-015 | Wire owner AI command center to protected dry-run API proof panel`

Scope:

- Extend `/agents` client UI so the selected command can call `POST /api/agent-operations/dry-run` with `mode: "dry_run"`.
- Render proof status, operation id, validation flags, safety flags, registry readiness, and next review action from the response.
- Preserve local proposal packets as proposal-only UI state.
- Keep non-owner access blocked by existing page and route boundaries.

Acceptance:

- Owner can run a selected command through the protected dry-run API from `/agents`.
- UI clearly distinguishes local proposal packet state from server dry-run proof state.
- Errors from unauthenticated, unauthorized, invalid JSON, non-dry-run, or validation failure states render as safe UI messages.
- No DB read/write, provider call, public endpoint, external registry write, persisted audit event, autonomous execution, high-risk final write, secret output, or external agent DB access is added.

Likely files:

- `src/app/(dashboard)/agents/agent-command-center-client.tsx`
- `src/types/agent-command-center.ts`
- `src/lib/services/agent-command-center.service.ts`
- `scripts/check-agent-command-center.mjs`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- Generated loop evidence report

Verification:

- `pnpm agent:command-center:check`
- `pnpm agent:api:check`
- `pnpm agent:commands:check`
- `pnpm agent:bus:check`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm db:validate`
- protected route smoke where a mock-owner session is available
- JSON parse and `git diff --check`

Stop conditions:

- Any attempt to add execute mode, provider calls, DB writes, external agent access, public endpoints, persistent audit writes, or external registration.
- Ambiguous auth/session behavior beyond existing `requireUser()` plus OWNER route policy.

## 7. Next Decision

Loop 79 should run:

1. `AUTH-005` if Supabase public env and signed-in `/auth/status` evidence appears.
2. `WORK-009` if `pnpm work:proof-target:check` reports `ready_for_work_009`.
3. Otherwise `AGENT-015`, the protected `/agents` dry-run API proof panel.

Loop 80 remains the next required launch-level review if the level has not improved earlier.
