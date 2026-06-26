# Per-Module Real-Data Migration Matrix

**Document ID:** `DBS-005`
**Last updated:** 2026-06-21
**Status:** Contract / research-to-task artifact for `REALDATA-001`
**Scope:** Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS real-data progression.

---

## 1. Purpose

`REALDATA-001` converts the current maturity research into an executable real-data migration matrix. The goal is not to add schema or runtime writes in this loop. The goal is to make every module's next honest move from mock/demo/formal/readiness state toward DB-backed operation explicit:

- current mock/demo/formal/DB state;
- next data object;
- BFF route/action or service boundary;
- authz boundary;
- audit need;
- acceptance proof;
- stop condition.

The machine-readable companion is `src/lib/contracts/module-real-data-matrix.contract.ts`, validated by `pnpm module:realdata:check`.

## 2. Source Basis

This matrix uses local product and architecture context first:

- `RES-001_next-thirty-loop-maturity-research.md`: next maturity target and three-loop research cadence.
- `RES-002_saas-os-operating-surface-maturity-research.md`: SaaS/OS operating-surface bar.
- `ARC-030_module-resource-index-bff-contract.md`: shared resource index contract and module boundary basis.
- `DBS-001_database-contract.md`: Prisma schema is canonical and valuable migrations require review.
- `DBS-002_source-workflow-schema-contract.md`: AI Input/source workflow schema proposal.
- `DBS-003_research-db-model-decision.md`: Research DB decision and model reconciliation need.
- `DBS-004_client-portal-token-schema-contract.md`: Client Portal token proposal.
- `SCH-001_agent-team-os-schema-proposal.md`: Agent Team OS schema proposal.
- `SCH-002_source-asset-registry-schema-proposal.md`: source asset registry proposal.
- `ACC-002_module-acceptance-criteria.md`: module acceptance criteria.

No current external provider or framework behavior is needed for this loop because no provider integration, Next.js runtime API, Supabase auth behavior, Prisma migration, or deployment behavior is changed.

## 3. Global Migration Rules

| Rule | Decision |
|---|---|
| BFF-first | UI need must map to BFF contract, auth boundary, service, mapper, and then client interaction. |
| Work-first proof | `AUTH-005` and `WORK-009` still preempt this matrix if their prerequisites appear. |
| No hidden persistence | Mock UI cannot silently become persistence. Formal empty/readiness states are required before real writes. |
| Schema writes | Not allowed in `REALDATA-001`. Each module must receive reviewed schema proposal or approved migration task first. |
| Runtime writes | Not allowed in `REALDATA-001`. Real writes require explicit task, proof target, and approval where high risk. |
| Audit | Every module that moves toward real data must name an append-only audit need before writes. |
| Public output | Client Portal remains fail-closed/token-gated. No public payload expansion is allowed from this matrix. |
| Agent operations | Agent Team OS stays internal/protected. External registration remains blocked by policy and human approval. |

## 4. Matrix

| Module | Current state | Next data object | BFF route/action | Authz boundary | Audit need | Acceptance proof | Stop condition |
|---|---|---|---|---|---|---|---|
| Work | DB-backed draft writes exist; final launch proof is blocked by missing safe proof target. | Proof-only project, task, note, deliverable, and derived progress marker. | Existing Work server actions and `project.service`; run `WORK-009` before `WORK-007`. | `requireUser()` plus owner-scoped project checks. | Project/task/note/deliverable mutation and proof refresh events. | `WORK-009` succeeds against an approved disposable target, then `WORK-007` verifies refresh persistence. | Stop before valuable data write when no safe proof target and confirmation exist. |
| Research | UI/mock state plus partial Prisma research models; model naming needs reconciliation with `DBS-003`. | Research thread/issue, source, concept/link, writing section, AI feedback run. | Protected Research loader/action contract after model reconciliation. | Owner-only protected reads/proposal writes until sharing is designed. | Source import, citation/link changes, writing updates, AI feedback provenance. | Schema decision is reconciled and protected formal empty/read contract is proven. | Stop before migration or writes if ResearchIssue/current thread boundary remains ambiguous. |
| AI Input | Formal readiness exists; persistence is proposal-only. | SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, ModuleWriteIntent. | Split `DATTR-024` into protected loader/action contract before persistence. | Owner source scope plus connector consent; no final module writes without review. | Source workflow runs, source refs, proposal lifecycle, connector consent, write-intent decisions. | Formal mode reads real unavailable/empty state and never falls back to hidden mock rows. | Stop before connector OAuth, external sync, migration, or module write-intent commit without approval. |
| Workflow | UI mock/proposal with `WorkflowRule` and `AgentMessage` primitives. | WorkflowRun, RuleExecution, AgentMessage, ApprovalRequest. | Protected workflow run/read BFF; execution remains dry-run/proposal-only until audit exists. | Owner-only reads; execution proposals require module-specific authorization and approval. | Rule evaluation, run start/finish, agent proposal, approval/rejection, rollback refs. | Dry-run proof lists proposed actions and blocked final writes without touching module records. | Stop before autonomous execution, scheduled triggers, or cross-module writes. |
| Life | FOPS shell / private mock state. | PrivateCheckIn, LifeEvent, HealthHabit, MemoryNote, LifeReviewProposal. | Owner-only Life draft schema proposal and read/empty-state BFF. | Owner-only; no public output, no external sharing, no agent final writes. | Private create/update/delete, agent proposals, export, privacy-boundary changes. | Protected page shows formal empty/readiness state and blocked final-write controls. | Stop before private final writes, health conclusions, external sharing, or agent-written records. |
| Finance | FOPS shell / high-risk draft-only plan. | FinanceDraftEntry, BudgetCategory, ReceiptCapture, CashflowNote, FinanceReviewIntent. | Draft-only Finance BFF proposal; final writes blocked. | Owner-only finance scope; agent outputs are suggestions only. | Confirmation, receipt refs, edits, rejection, export, approval actor. | Draft-only formal state and human-approval boundary are visible without final persistence. | Stop before bank connectors, final ledger writes, financial advice, public output, or autonomous writes. |
| Chamber | FOPS shell / CRM proposal. | ChamberContact, Organization, Interaction, Opportunity, FollowUp. | Protected Chamber CRM read/draft BFF proposal. | Owner-only CRM with trust-level fields; no external contact sharing by default. | Contact creation, import source, interactions, follow-ups, consent/trust labels, agent proposals. | Protected Chamber page shows real-data readiness and PII stop rules before persistence. | Stop before importing real contacts, sending messages, exposing PII, or agent relationship notes. |
| Company | FOPS shell / high-risk strategy plan. | StrategyInitiative, StrategyNote, CompetitorEntry, PartnershipPipeline, DecisionRecord. | Draft-only protected strategy BFF proposal. | Owner-only confidential data; no public output or external agent context by default. | Decision source, strategy note changes, proposal approval, rejected alternatives, external-sharing decisions. | Company page distinguishes mock examples from formal empty/private state and draft-only proposals. | Stop before final strategy writes, external sharing, private imports, or agent-authored decisions. |
| Client Portal | Public route fails closed by default; gated DB read proposal exists. | ClientPortalShareToken, ClientPortalAccessEvent, ClientVisibleProjectView. | Owner token lifecycle actions plus public token validation route after approval. | Token-gated public route; owner token management protected and audited. | Token create/rotate/revoke/access/fail, file access, public DTO render events. | `CLIENT-005`/`CLIENT-007` prove lifecycle and public read smoke without internal notes/private files. | Stop before token lifecycle writes, public output expansion, file URLs, or smoke without schema/target approval. |
| Agent Team OS | Generated AgentFacts-lite/readiness only; `agent:op` is dry-run-only. | AgentProfile, AgentRun, AgentApprovalRequest, AgentMessage, OperatingAuditEvent. | Owner-only agent registry/operation read contract; operation API remains dry-run until audit/auth scopes exist. | Protected owner/admin only; external registration disabled until endpoint/auth/trust/rollback/approval exist. | Agent operation requested, dry-run generated, proposal approved/rejected, scope used, registry readiness changes. | `agent:registry:check` and `agent:op` remain no-secret/internal-only; future API proves auth/scopes/audit. | Stop before runtime endpoint, public registry, external collaboration, direct DB access by agents, or external registration. |

## 5. Next Implementation Order

1. If proof prerequisites appear, run `AUTH-005` or `WORK-009` immediately.
2. If proof remains absent, run `AUDIT-OPS-001` next. This is the shortest cross-module leverage because every real-data row above needs append-only operating audit before safe writes.
3. After audit contract, split the next data tasks:
   - Work: `WORK-009` then `WORK-007`.
   - AI Input: split `DATTR-024` into BFF contract, schema review, and safe proof target.
   - Client Portal: `CLIENT-005` then `CLIENT-007` only after schema/action approval.
   - Research: reconcile `DBS-003` with current Prisma models before writes.
   - High-risk modules: Life, Finance, Company, and Chamber stay draft/proposal-only until human approval.

## 6. Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Add Prisma models for all modules now | Too broad, high migration risk, and would violate the current proof-blocked convergence strategy. |
| Convert mock UI to localStorage persistence | Creates hidden persistence without authz/audit and does not move toward launch-grade real data. |
| Start with Client Portal writes | Public output and token lifecycle are high risk and need approved schema/action boundaries first. |
| Start with AI Input connector runtime | Connector consent, source security, schema, and audit are not ready for runtime sync. |
| Expose Agent Team OS externally | Endpoint, auth scopes, trust evidence, rollback, telemetry claims, and human approval are missing. |

## 7. Verification

Minimum proof for this matrix:

```bash
node --check scripts/check-module-real-data-matrix.mjs
pnpm module:realdata:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-53-20260621-real-data-migration-matrix.json
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
git diff --check
```

`REALDATA-001` is complete when the formal doc, TypeScript contract, proof script, backlog/sprint state, acceptance criteria, completed log, loop state, and evidence report all agree that the matrix is static, no-secret, no-runtime-write, and implementation-ready.
