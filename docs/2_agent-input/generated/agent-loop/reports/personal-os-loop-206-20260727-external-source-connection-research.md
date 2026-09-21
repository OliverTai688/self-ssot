# Personal OS Loop 206 — External Source Connection Research

## Task

- Task ID: `AIINPUT-CONN-001`
- Title: Research external source multistep setup and multi-account management
- Date: 2026-07-27
- Agent: Codex root

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md`
- `docs/07_research-and-design/RES-012_source-settings-operating-surface-redesign-research.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Loop reports 203, 204, and 205

## Scope

- In scope: correct Google Docs versus Google Drive folder product semantics; plan provider-account and source-scope separation; define a multistep setup modal, multiple-account/multiple-connection management, provider-specific flows, BFF/auth/audit/NANDA boundaries, acceptance criteria, and staged tasks for LINE, Google Drive, RSS, Gmail, GitHub, and Telegram.
- Out of scope: runtime UI implementation, OAuth callback, external account authorization, provider API calls, token or secret storage, webhook/public endpoint, polling, database/schema change, migration, final module write, public output, and external agent registration.

## Strategic Review

- Current launch level / target: formal `L0_LOCAL_PROTOTYPE`; Manual Ops `M1_MANUAL_OPS_READY`; conditional product maturity `C3_ARCHITECTURE_GATE_READY`; next formal target remains `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three reports reviewed: loop 203 collaboration additive schema/disposable proof, loop 204 protected workspace/project index, and loop 205 migration-history/PERSONAL backfill reconciliation.
- Last-three-loop delta: team collaboration gained disposable persistence proof, a protected Work index, and safe clean-history/known-drift reconciliation artifacts.
- Repetition check: the owner explicitly requested a new AI Input settings correction and research artifact. This loop creates an implementation-ready product/BFF/provider plan rather than repeating collaboration proof work.
- Current strongest blocker: formal Auth, owner-run Work/configured collaboration proof, and deployment remain launch blockers; external provider runtime additionally lacks reviewed credential storage, provider approvals, callback/webhook origin, and persistence/authz proof.
- Acceptance / roadmap / research / blocker mapping: AI Input source workflow, `DATTR-022`, `AIINPUT-OPS-002`, `ARC-015`, `AUT-007`, `RES-002` owner settings/operating-surface maturity, and new Phase 20 `AIINPUT-CONN-001..011`.
- Expected capability, proof, or blocker delta: one coherent, provider-aware connection-management requirement and executable staged path with no accidental connector activation.

## Research / Reference Basis

- Local docs/code reviewed: `/ai-input` source index and five-tab drawer, formal source-control service/types, Prisma `SourceConnection`/provider enums, adapter identity contract, connector approval boundary, PRD, acceptance, sprint/backlog, and recent loop evidence.
- External or reference websites reviewed: official OAuth BCP/PKCE, Google OAuth/Drive/Gmail, GitHub Apps/webhooks, LINE Messaging API, Telegram Bot API, Atom RFC, plus Zapier multi-account/connection management and Notion connection-scope management.
- Page requirement understanding score: 78/100 initially; 93/100 after optimization.
- Understanding level: Medium initially; High when converted into executable task shape.
- Required research optimization rounds: 4.
- Completed rounds and lenses: local PRD/code fit; comparable-product connection management; provider authorization/scope/event topology; BFF/auth/security/acceptance boundary.
- Same-issue synthesis: the existing table and detail drawer are useful, but provider identity, credentials, selected source scope, sync health, and setup state are conflated. One shared wizard shell must delegate to provider-specific steps.
- Selected implementation pattern: `ProviderAccount` reused by multiple independently managed `SourceConnection` scopes; Google Drive folder as the connection and Google Docs as a Drive file subtype; separate add wizard, account manager, and connection manager; provider-by-provider rollout.
- Rejected alternatives: standalone Google Docs provider, one provider row hiding all accounts/scopes, one generic all-provider form, using the policy drawer for OAuth setup, browser-held tokens, broad-first scopes, PAT-first GitHub integration, historical LINE/Telegram claims, and all-provider activation in one release.
- Task shape created or updated: `AIINPUT-CONN-001` DONE; `002..005` implementation/contract/schema-review path; `006..011` separately approval-gated provider pilots.

## NANDA / Agent Protocol Alignment

- Applies?: Yes, because AI Input and future IngestionAgent source capabilities, routing, trust, and observability are affected.
- Affected agents or capabilities: future protected `source-connection-draft-management`, `source-scope-preview`, and `source-connection-health-review`.
- AgentFacts-lite fields changed: no runtime manifest values changed; the research specifies future capability, skill, trust, observability, endpoint classification, lifecycle, and registry boundaries.
- Internal discovery / registry state: existing internal registry remains valid and unchanged.
- External registration state: `externalRegisterable: false`.
- Trust, auth, approval, and data-visibility boundaries: protected owner-only management; provider credentials and payloads server-only; external agents receive neither database nor credential access; provider activation is separately approval-gated.
- Concrete protocol artifact created: `RES-027` account/scope/BFF/trust boundary and `AIINPUT-CONN-001..011` staged task split.
- NANDA / AgentFacts / MCP / A2A sources reviewed: local `ARC-028`; no external agent endpoint or protocol implementation was created.

## Changes

- Files changed: `RES-027`, `MAN-001`, `PRD-004`, `PLN-060`, `PLN-061`, `ACC-002`, `RPT-007`, `tasks.md`, this evidence report, and `loop-state.json`.
- Behavior changed: none. The research corrects future UI and connection semantics only.
- Docs changed: source connection decision, six-step flow, account/connection management, provider limitations, BFF/security/NANDA boundaries, acceptance, staged tasks, current sprint, completed log, and loop memory.

## Verification

| Command | Result | Notes |
|---|---|---|
| Research/index/task marker scan | PASS | `RES-027`, Drive-folder wording, NANDA boundary, and `AIINPUT-CONN-001..011` are present across required memory files. |
| `pnpm agent:registry:check` | PASS | 15 manifests valid, 0 external-registerable agents, 0 validation errors. |
| `jq empty docs/2_agent-input/generated/agent-loop/loop-state.json` | PASS | Recorded after final state update. |
| Targeted `git diff --check` | PASS | Research/task-memory/state/report files are whitespace-clean. |
| `pnpm ai-input:source-control:check` | FAIL — pre-existing implementation/checker drift | The current service/client no longer contain the older checker markers. This research did not edit those runtime files; `AIINPUT-CONN-002` must deliberately normalize the real source rows and checker together rather than hiding the drift in a docs-only loop. |

## Evidence

- Relevant output or observation: the current `/ai-input` already has a source index, selectable rows, mock connection state, and five-tab management drawer, but it mixes provider/account/scope and separately lists Drive and Google Docs.
- Screenshots or browser checks: owner screenshot was used as the page requirement reference; no runtime page was changed, so no new browser claim is made.
- DB checks: none; no schema or data change was authorized.
- Product capability delta: the repo now has a complete requirement and staged delivery path for Drive-folder semantics, multistep setup, and many-account/many-connection management across all six requested provider families.
- Proof delta: provider-specific permission/event constraints, BFF operations, trust boundaries, acceptance, and rollout stop conditions are documented and indexed.
- Blocker delta: product ambiguity is closed for `AIINPUT-CONN-002..004`; credential storage, schema/authz review, provider app setup, external origins, and human approvals remain explicit runtime blockers.
- Agent protocol-readiness delta: future source-management capabilities now have protected identity, auth, trust, observability, endpoint classification, registry, and external-registration boundaries.

## Remaining Risks

- Google Picker plus `drive.file` may not satisfy ongoing folder-descendant access; the Drive pilot must prove scope behavior before requesting broader restricted access.
- Gmail body/attachment analysis may trigger restricted-scope verification and security assessment.
- LINE and Telegram bot visibility is future-event and permission dependent; neither can be presented as arbitrary personal/group history sync.
- Credential vault/reference design, webhook/callback production origin, retention, deletion, and provider account ownership are unresolved implementation decisions.
- The current AI Input source-control checker is already out of sync with runtime source strings and must be corrected in `AIINPUT-CONN-002`.
- Formal launch proof remains unchanged and the fifth-loop launch review is overdue.

## Final Status

- Status: `AIINPUT-CONN-001` DONE; no launch-level or runtime-connector claim.
- Recommended next task: run the overdue loop-207 launch-level review; then execute `AIINPUT-CONN-002` as the smallest safe UI/formal-contract correction, followed by the UI-only `AIINPUT-CONN-003` prototype.
