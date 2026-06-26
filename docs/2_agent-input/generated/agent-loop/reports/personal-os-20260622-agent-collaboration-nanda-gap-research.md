# Personal OS Agent Loop Evidence Report

**Report id:** `personal-os-20260622-agent-collaboration-nanda-gap-research`
**Task id:** `AGENT-008`
**Date:** 2026-06-22
**Loop type:** Manual steering research-to-task update
**Launch level before:** `L0_LOCAL_PROTOTYPE`
**Launch level after:** `L0_LOCAL_PROTOTYPE`

---

## 1. Strategic Review Gate

Current target:

- Shortest launch path still runs through `AUTH-005`, `WORK-009`, and deployment proof.
- Owner steering asked to research the module-agent, CLI/API, AI-to-AI collaboration, group command, and NANDA/MIT protocol cooperation gap and add it to loop-dev goals.

Last relevant changes:

- `AGENT-OPS-001` created `pnpm agent:op` as owner-only dry-run CLI.
- `AGENT-007` created protected read-only agent protocol readiness surfaces.
- `WORK-010` created `pnpm work:proof-target:check` so future loops can stop collecting adjacent proof evidence and route directly.

Current blocker:

- Full private launch remains blocked by missing Supabase public env/session evidence, missing approved Work proof target, and missing deployment marker proof.
- Agent collaboration remains blocked by missing protected agent operation API, per-module command catalog, internal task/message bus, and external adapter approval gates.

What is more true after this loop:

- The agent collaboration gap is now a formal research artifact and executable backlog path, not an informal conversation.
- `AGENT-009` is now the next no-proof user-directed target when `AUTH-005` and `WORK-009` cannot preempt.

---

## 2. Local Context Reviewed

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json`
- `tasks.md`

Current local facts:

- 15 internal agents exist as AgentFacts-lite manifests.
- All manifests remain `lifecycle.status = governance-only`, `registry.internalDiscoverable = true`, and `registry.externalRegisterable = false`.
- `pnpm agent:op -- --list` exposes only `agent.ops.describe-contract` and `work.proof.preflight`.
- There is no protected agent operation API route, no module-wide command catalog, no group-agent conversation bus, and no external NANDA/A2A/MCP adapter.

---

## 3. External Research Reviewed

Primary or official sources:

- Project NANDA core repository: https://github.com/projnanda/projnanda
- Project NANDA site: https://projectnanda.org/
- AgentFacts format repository: https://github.com/projnanda/agentfacts-format
- NANDA enterprise architecture paper: https://arxiv.org/html/2508.03101v1
- A2A protocol specification: https://a2a-protocol.org/latest/specification/
- A2A repository/spec: https://github.com/a2aproject/A2A
- Model Context Protocol 2025-06-18 specification: https://modelcontextprotocol.io/specification/2025-06-18
- MCP tools specification: https://modelcontextprotocol.io/specification/2025-06-18/server/tools

Research interpretation:

- NANDA/AgentFacts supports discovery, capability/trust metadata, indexing, protocol bridges, and registration readiness, but this repo must not claim external registration before endpoint/auth/trust/rollback/human approval exist.
- A2A provides useful task/message lifecycle vocabulary for a future internal multi-agent bus.
- MCP is best treated as a future tool/context bridge. It does not replace the need for Personal OS task/message/approval/audit semantics.

---

## 4. Product Capability Delta

Created:

- `docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md`

Updated:

- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `tasks.md`

Backlog changes:

- `AGENT-008` marked `DONE`.
- Added `AGENT-009`: protected agent operation API dry-run BFF contract.
- Added `AGENT-010`: per-module agent workspace command catalog.
- Added `AGENT-011`: multi-agent conversation and task bus contract.
- Added `AGENT-012`: owner AI command center single/group instruction surface.
- Added `AGENT-013`: external NANDA/A2A/MCP adapter approval package.

---

## 5. NANDA Agent Protocol Gate

Affected AgentFacts-lite fields:

- identity: unchanged, still local generated manifests.
- provider: unchanged.
- lifecycle: remains `governance-only`.
- endpoints: no runtime endpoint added.
- protocols: local research now maps internal/dry-run, A2A task/message vocabulary, MCP tool/context bridge, and future NANDA adapter approval.
- capabilities: follow-up tasks will map module operations and group commands.
- skills: unchanged.
- auth: runtime API remains future work and must use `requireUser()`/authz if implemented.
- trust: external trust attestations remain missing.
- observability: no new telemetry claims.
- registry status: `externalRegisterable: false`, `registrationStatus = not-registered`.

Classification:

- Current artifact is governance/research and loop-routing only.
- Future `AGENT-009` may become protected-owner visible if auth-safe, otherwise contract-only.
- No external-registerable agent was created.

Concrete artifact:

- `RES-004` plus backlog rows `AGENT-009` through `AGENT-013`.

---

## 6. Rejected Alternatives

- Immediate external NANDA registration.
- Public AgentFacts or Agent Card endpoint.
- External agents querying the database directly.
- Autonomous high-risk module writes.
- Group-agent chat before task/message/audit contract.
- Treating MCP as the entire agent protocol.

---

## 7. Verification

Commands planned or run for this evidence slice:

```bash
pnpm agent:op -- --list
pnpm agent:registry:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-20260622-agent-collaboration-registry-check.json
node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json', 'utf8')); console.log('loop-state json ok')"
rg -n "AGENT-008|AGENT-009|RES-004" docs/05_execution-plans/PLN-060_task-backlog.md docs/05_execution-plans/PLN-061_current-sprint.md docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md tasks.md docs/2_agent-input/generated/agent-loop/loop-state.json
git diff --check
```

Expected pass signals:

- `agent.ops.describe-contract` and `work.proof.preflight` still list as dry-run operations. Passed.
- Registry check remains `ready_for_internal_use` and external registration remains `blocked_by_policy`. Passed.
- Loop state JSON parses. Passed.
- Task docs contain `AGENT-008`, `AGENT-009`, and `RES-004`. Passed.
- Diff check reports no whitespace errors. Passed.

---

## 8. Next Decision

Loop 72 selection:

1. Run `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears.
2. Run `WORK-009` if `pnpm work:proof-target:check` reports `ready_for_work_009` and the target is confirmed local/disposable.
3. Otherwise run `AGENT-009` protected agent operation API dry-run BFF contract.
4. If runtime auth remains too risky, complete `AGENT-009` as contract-only proof first.

Stop conditions:

- Public agent directory or public AgentFacts/Agent Card endpoint.
- External NANDA/A2A/MCP registration.
- Runtime route without authz.
- External direct DB access.
- High-risk final writes.
- Prisma migration or production DB write.
- Private context sent to an external agent/provider/server without explicit approval.
