# Loop 97 Research Gap Review

**Document ID:** `RPT-021`
**Date:** 2026-06-22
**Status:** Complete
**Loop:** 97
**Scope:** RES-001/RES-002 research-to-task review for module agent operation readiness

---

## 1. Decision

Loop 97 did not run `AUTH-005` or `WORK-009` because their proof prerequisites are still absent:

- `pnpm launch:proof` reports `blocked` on missing Supabase public URL and publishable key.
- `pnpm auth:proof` reports `canRunAuth005=false` because Supabase public env and signed-in `/auth/status` evidence are missing.
- `pnpm work:proof-target:check` reports `needs_operator_input` because no `WORK_PROOF_DATABASE_URL`, write allowance, or confirmation phrase is set.
- `pnpm work:proof:docker-disposable -- --json` reports Docker CLI is present but the daemon is unavailable.

Because this is a due third-loop maturity review after loop 96, the selected loop 97 work is a research-to-task gap review. The next implementation task should be `AGENT-016`: create a protected per-module agent operation readiness matrix that aligns each module's agent workspace, CLI dry-run command, protected HTTP dry-run route, internal bus/group participation, approval boundary, audit readiness, and external-registration block.

## 2. Strategic Review

| Question | Answer |
|---|---|
| Current product target | Still `L0_LOCAL_PROTOTYPE`, targeting `L1_PRIVATE_ONLINE_WORK_OS` next. |
| Last three completed loops | Loop 94 completed `BACKEND-OPS-001`; loop 95 completed `RPT-020`; loop 96 completed `BACKEND-OPS-002`. |
| What changed | Backend/API/BFF operation inventory became machine-checkable and owner-visible in protected admin/settings. |
| Strongest blocker | Real launch proof is still external/operator state: Supabase public env/session evidence, Work disposable proof target, Docker daemon or approved local DB, and deployment marker. |
| Anti-repeat check | Loop 95 was review; loop 96 was runtime UI. Loop 97 can be research because the three-loop cadence is due, but it must create an executable next task. |
| Product delta | The next runtime slice is now narrowed to per-module agent operation readiness, not another generic readiness report. |

## 3. Local Evidence Reviewed

- `AGENTS.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `src/lib/contracts/module-agent-command-catalog.contract.ts`
- `src/lib/contracts/agent-operation-api.contract.ts`
- `src/lib/contracts/agent-task-message-bus.contract.ts`
- `src/lib/services/agent-command-center.service.ts`
- `src/app/(dashboard)/agents/page.tsx`
- `src/app/(dashboard)/agents/agent-command-center-client.tsx`
- Loop 94, 95, and 96 generated reports and proof packets.

Baseline checks confirm the agent operation foundation already exists:

- `pnpm agent:commands:check`: 10 modules and 10 operations ready.
- `pnpm agent:api:check`: protected route ready at `POST /api/agent-operations/dry-run`.
- `pnpm agent:bus:check`: internal bus contract ready; external runtime disabled.
- `pnpm agent:command-center:check`: protected `/agents` command center and dry-run panel ready.
- `pnpm backend:ops:check`: backend operation catalog admin/settings surface ready.

## 4. External Research Basis

| Source | Relevant pattern |
|---|---|
| [Project NANDA GitHub organization](https://github.com/projnanda) | Agent ecosystems need discovery, capability verification, coordination, and governance across organizations. |
| [AgentFacts format](https://github.com/projnanda/agentfacts-format) | Agent metadata should describe identity, endpoints, capabilities, metrics, and trust credentials before discovery/integration claims. |
| [NANDA Adapter](https://github.com/projnanda/adapter) | External NANDA-style participation assumes hosted agent endpoints, SSL/domain configuration, registry/discovery, and A2A communication pieces that Personal OS has not approved yet. |
| [MCP 2025-06-18 specification](https://modelcontextprotocol.io/specification/2025-06-18) | Tool/context integration should be explicit, standardized, and security reviewed because tools can expose powerful data or execution paths. |
| [MCP authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) | HTTP-based restricted servers should use explicit authorization and resource-owner access token patterns when authorization is enabled. |
| [A2A specification](https://github.com/a2aproject/A2A/blob/main/docs/specification.md) | Remote agent collaboration uses an Agent Card plus message/task/artifact lifecycle concepts; Personal OS should not expose this externally before approval. |
| [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) and [OWASP A09](https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/) | Agent operations, auth failures, high-value actions, exports, approvals, and public-output decisions need consistent auditability. |

## 5. NANDA Agent Protocol Gate

| Gate item | Loop 97 conclusion |
|---|---|
| Agent capability changed? | Runtime is unchanged in loop 97, but next task will expose agent operation readiness more explicitly. |
| Affected AgentFacts-lite fields | Identity, endpoints, protocols, capabilities, skills, auth, trust, observability, registry status. |
| Internal or external state | Protected owner-visible internal runtime readiness only. |
| External registration | Remains `externalRegisterable: false` and `HUMAN_APPROVAL_REQUIRED`. |
| Auth/trust boundary | Existing protected `/agents` and `/api/agent-operations/dry-run` stay owner-only and dry-run-only; high-risk modules remain human-approval-gated. |
| Concrete artifact | This report, new `AGENT-016` task row, and acceptance criteria for a module agent operation readiness matrix. |

Rejected external expansion:

- Do not publish AgentFacts, Agent Cards, MCP server metadata, or A2A endpoints.
- Do not register with NANDA Index or any external registry.
- Do not let external agents access the database.
- Do not add execute mode, provider calls, final writes, or public chat.

## 6. Gap Ranking

| Rank | Gap | Why it matters | Next action |
|---|---|---|---|
| 1 | Auth/Work proof blockers | Still required for L1 and honest launch claims. | Owner/operator evidence or safe proof target only. |
| 2 | Per-module agent operation readiness is fragmented | The user asked whether each module has independent agents, CLI reasoning steps, HTTP execution, internal/external communication, and group AI instructions. The answer exists across several contracts but is not visible as one per-module matrix. | Implement `AGENT-016`. |
| 3 | Audit persistence remains future | `AUDIT-OPS-001` exists, but dry-run operations are not persisted. | Keep audit mapping visible in `AGENT-016`; do not persist until audit storage/auth proof are ready. |
| 4 | External collaboration remains blocked | NANDA/A2A/MCP require endpoint, auth, scopes, trust, rollback, observability, deployment, and approval. | Keep `AGENT-013` blocked until launch proof improves. |

## 7. Created Task Shape

| Field | Value |
|---|---|
| Task id | `AGENT-016` |
| Title | Surface per-module agent operation readiness matrix |
| Scope | Add a protected owner-visible matrix, most likely in `/agents` first, that groups all 10 module commands by module and shows CLI command, protected HTTP dry-run payload, internal bus/group path, proposal outputs, blocked writes, approval level, risk, audit readiness, and external-registration state. |
| Likely files | `src/lib/services/agent-command-center.service.ts`, `src/types/agent-command-center.ts`, `src/app/(dashboard)/agents/agent-command-center-client.tsx`, `scripts/check-agent-command-center.mjs`, `ACC-002`, `PLN-060`, `tasks.md`, generated evidence. |
| Acceptance | All 10 modules have one readiness row; CLI/API/bus parity is visible; high-risk modules show human approval; external registration count remains zero; no execute mode or writes are added. |
| Verification | `pnpm agent:command-center:check`, `pnpm agent:commands:check`, `pnpm agent:api:check`, `pnpm agent:bus:check`, `pnpm backend:ops:check`, `pnpm exec tsc --noEmit --pretty false`, `pnpm db:validate`, JSON parse, `git diff --check`. |
| Stop conditions | Stop before schema changes, DB reads/writes, public endpoint exposure, provider calls, persisted audit writes, execute mode, external registration, or high-risk final writes. |

## 8. Recommended Next Loop

Loop 98 should run `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears, run `WORK-009` if a safe local/Docker/disposable proof target and confirmations appear, otherwise implement `AGENT-016`.
