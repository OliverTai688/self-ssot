# Agent Operation Dry-Run Contract

**Document ID:** `ARC-029`
**Last updated:** 2026-06-21
**Status:** Internal owner-only dry-run contract plus protected API/BFF route
**Runtime implementation:** CLI dry-run proof plus protected owner-only `POST /api/agent-operations/dry-run`; no external/public endpoint

---

## 1. Purpose

`AGENT-OPS-001` moves Agent Team OS from static readiness into the first commandable, verifiable operation contract.

The goal is not autonomous agent execution. The goal is to define one owner-only operation shape that future UI, protected API/BFF, and CLI surfaces can share.

This slice implements `L2_DRY_RUN_CLI` from `RES-002`:

```txt
owner intent
  -> operation id
  -> agent manifest lookup
  -> scope / approval / visibility boundary
  -> dry-run output contract
  -> generated evidence
  -> future protected API or approval-write task
```

## 2. Source Basis

- `docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md`
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md`
- `docs/02_architecture-and-rules/ARC-023_agent-team-os-operating-contract.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json`
- `docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json`

## 3. Current Command

```bash
pnpm agent:op
pnpm agent:op -- --json
pnpm agent:op -- --list
pnpm agent:op -- --operation work.proof.preflight --json
pnpm agent:op -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json
```

The command writes a no-secret proof packet. It reads generated AgentFacts-lite registry files only.

## 4. Operation Contract

Each operation must declare:

| Field | Meaning |
|---|---|
| `id` | Stable operation id used by UI, CLI, and future protected API. |
| `ownerAgent` | Internal AgentFacts-lite manifest label responsible for the operation. |
| `targetModule` | Module or operating surface being acted on. |
| `riskLevel` | Risk level from `ARC-019`. |
| `approvalLevel` | Approval level from `ARC-019`. |
| `scopes` | Future owner-only scopes; not runtime auth claims yet. |
| `allowedModes` | Must be `["dry_run"]` in this slice. |
| `inputContract` | Safe input shape. Do not accept secrets, raw cookies, tokens, DB URLs, or profile IDs. |
| `outputContract` | Proof fields the owner can inspect. |
| `cli` | CLI command shape. |
| `futureProtectedApi` | Future protected API/BFF shape; not implemented yet. |
| `uiSurfaceRefs` | Protected UI surfaces expected to show the same operation id later. |
| `auditRefs` | Generated evidence now and future audit event target. |
| `blockedActions` | Actions the operation must not perform. |

## 5. Implemented Operation Catalog

| Operation | Owner agent | Target module | Mode | Purpose |
|---|---|---|---|---|
| `agent.ops.describe-contract` | `WorkflowAgent` | `agent-team-os` | `dry_run` | Describe the shared UI/API/CLI operation contract and NANDA-safe boundary. |
| `work.proof.preflight` | `WorkAgent` | `work` | `dry_run` | Plan Work proof preflight without running DB writes. |

More operations must be added only when they can define source docs, approval level, data visibility, no-secret inputs, blocked actions, and verification.

## 6. Safety Boundary

`pnpm agent:op` must not:

- read environment variables;
- read cookies, tokens, raw auth claims, provider payloads, database URLs, database hosts, profile IDs, or private records;
- call Prisma, Supabase, deployment providers, AI providers, or external registries;
- create a public route, runtime endpoint, or public agent directory;
- write to the database, run migrations, run seed, mutate env, or mutate auth provider state;
- set `externalRegisterable` to true;
- perform final high-risk module writes.

If `--run` or `--execute` is supplied, the command fails. Execution mode is intentionally not part of `AGENT-OPS-001`.

## 7. NANDA Gate Interpretation

Affected AgentFacts-lite fields:

- identity: operation owner must map to an existing manifest label;
- capabilities: operation must map to explicit capability/risk boundaries;
- skills: no skill execution is performed in this slice;
- auth: runtime auth methods and scopes remain empty in manifests;
- trust: approval level and data visibility are declared in the operation contract;
- observability: generated dry-run proof becomes evidence;
- registry: internal discovery remains true, external registration remains false.

Registry state:

- Internal discovery: allowed through generated manifests and protected owner/admin readiness.
- External registration: blocked by policy.
- External registerable: must remain false.

## 8. Protected API Shape

The internal BFF/API path follows:

```txt
POST /api/agent-operations/dry-run
  -> requireUser()
  -> OWNER-only authorization
  -> validate operation id and input
  -> read internal manifest registry
  -> return AgentOperationDryRunProof DTO
  -> append audit event after AUDIT-OPS-001
```

This route was enabled only after explicit owner direction on 2026-06-22. It is internal and protected, not public or external-registerable. It accepts `mode: "dry_run"` only, returns no-store DTOs only, and performs no database write, provider call, external registry write, autonomous execution, high-risk final write, or external agent database access.

External/public HTTP execution remains blocked until auth/session proof, endpoint scopes, trust policy, rollback, deployment proof, public-safety review, and explicit approval exist.

## 8A. AGENT-009 API Contract-Only Proof

`AGENT-009` added the machine-readable protected API/BFF contract. `AGENT-014` enables the internal protected dry-run route:

- Contract source: `src/lib/contracts/agent-operation-api.contract.ts`
- Server-only dry-run service: `src/lib/services/agent-operation.service.ts`
- Route handler: `src/app/api/agent-operations/dry-run/route.ts`
- Verification command: `pnpm agent:api:check`
- Endpoint: `POST /api/agent-operations/dry-run`
- Current status: `protected_dry_run_ready`
- Route handler: internal OWNER-only route created
- Allowed mode: `dry_run`
- Operation parity: 10 per-module dry-run operations sourced from `src/lib/contracts/module-agent-command-catalog.contract.ts`

The checker now requires the route to exist and verifies `requireUser()`, OWNER-only authorization, generated internal AgentFacts-lite registry lookup, no-store responses, no external registry write, no provider call, no DB write, no autonomous execution, and no external registration.

The runtime route may remain enabled only while all of these are true:

1. It is internal protected owner-only.
2. It accepts only `dry_run`.
3. It returns UI-safe proof DTOs.
4. It does not persist audit events until audit storage is approved.
5. `externalRegisterable` remains `false`.

External adapter routes, public agent directories, NANDA/A2A/MCP publication, and cross-organization collaboration remain `HUMAN_APPROVAL_REQUIRED`.

## 8B. AGENT-010 Per-Module Command Catalog

`AGENT-010` converts the module-agent workspace gap into a shared command catalog that feeds both CLI and protected HTTP dry-run contracts:

- Shared catalog: `src/lib/contracts/module-agent-command-catalog.contract.ts`
- Catalog checker: `scripts/check-module-agent-command-catalog.mjs`
- Package command: `pnpm agent:commands:check`
- CLI command surface: `pnpm agent:op -- --list` and `pnpm agent:op -- --operation <operation-id> --json`
- Protected HTTP surface: `POST /api/agent-operations/dry-run`
- Current operation count: 10
- Allowed mode: `dry_run`
- External registerable: `false`

Current operation ids:

| Module | Agent | Operation id | Approval |
|---|---|---|---|
| Work | WorkAgent | `work.proof.preflight` | `AUTO_PROPOSE` |
| Research | ResearchAgent | `research.workspace.plan` | `AUTO_PROPOSE` |
| AI Input | IngestionAgent | `ai-input.source-workflow.review` | `HUMAN_APPROVAL_REQUIRED` |
| Workflow | WorkflowAgent | `workflow.queue.plan` | `AUTO_PROPOSE` |
| Life | LifeAgent | `life.routine.propose` | `HUMAN_APPROVAL_REQUIRED` |
| Finance | FinanceAgent | `finance.review-draft` | `HUMAN_APPROVAL_REQUIRED` |
| Chamber | ChamberAgent | `chamber.relationship.plan` | `AUTO_PROPOSE` |
| Company | CompanyAgent | `company.strategy.review` | `HUMAN_APPROVAL_REQUIRED` |
| Client Portal | ClientPortalAgent | `client-portal.visibility.preflight` | `HUMAN_APPROVAL_REQUIRED` |
| Agent Team OS | WorkflowAgent | `agent.ops.describe-contract` | `AUTO_PROPOSE` |

The catalog is a command semantic layer, not execution authorization. It may be used by future owner UI and multi-agent coordination work only while the operation remains dry-run/proposal-only, route access stays protected owner-only, and high-risk final writes remain human-approved.

## 9. Verification

Minimum verification for this slice:

```bash
node --check scripts/agent-operation-dry-run.mjs
pnpm agent:op -- --json --out docs/2_agent-input/generated/agent-loop/reports/<file>.json
node --check scripts/check-module-agent-command-catalog.mjs
pnpm agent:commands:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json
node --check scripts/check-agent-operation-api-contract.mjs
pnpm agent:api:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json
pnpm agent:registry:check
pnpm exec tsc --noEmit --pretty false
```

Optional safety checks:

```bash
rg -n 'process\.env|PrismaClient|createClient|fetch\(|DATABASE_URL|SUPABASE_|cookie|token|profileId' scripts/agent-operation-dry-run.mjs
```

Expected result: no environment, DB, provider, cookie, token, or profile-id reads in the script.

## 10. Rejected Alternatives

- Public/external API endpoint. Rejected because external auth scopes, trust, rollback, deployment proof, public-safety review, and explicit external-collaboration approval are missing.
- External NANDA registration. Rejected because runtime endpoint, auth/scopes, trust evidence, rollback, observability, and human approval are missing.
- Direct agent execution or browser control. Rejected because operation contracts must be stable, auditable, and service-boundary friendly before autonomous execution.
- Work proof run mode. Rejected because `WORK-009` still lacks a safe local/disposable proof DB target and write confirmations.
