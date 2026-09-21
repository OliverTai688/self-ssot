# Personal OS Loop 208 — AI Input Multistep Multi-Account Connection Wizard

## Task

- Task ID: `AIINPUT-CONN-003`
- Title: Implement the provider-aware multistep and multi-account mock connection prototype
- Date: 2026-07-27
- Agent: Codex root with interface, integration/API-boundary, and QA subagents

## Source Docs Read

- `AGENTS.md`
- Required manual, index, product, situation, acceptance, strategy, loop-state, sprint, backlog, and last-three-loop evidence files
- `RES-001`, `RES-002`, `RES-005`, `RES-027`, `ARC-012`, `ARC-028`, and relevant AI Input source-control and connector-boundary artifacts
- Relevant Next.js 16.2.4 local Server/Client Component and data-security guides under `node_modules/next/dist/docs/`

## Scope

- In scope: normalize Google Docs to Google Drive folder connections; add a six-step provider-aware dialog for LINE, Google Drive, RSS, Gmail, GitHub, and Telegram; support multiple accounts and multiple source scopes; add mock-only drafts, account-health management, duplicate prevention, impact preview, responsive behavior, and source/static verification.
- Out of scope: provider OAuth, webhook or polling runtime, provider API calls, secret storage, Prisma/schema/migration changes, DB persistence, server actions, public output, autonomous writes, and external agent registration.

## Strategic Review

- Current launch level / target: formal `L0_LOCAL_PROTOTYPE`; Manual Ops `M1_MANUAL_OPS_READY`; conditional product maturity `C3_ARCHITECTURE_GATE_READY`; next formal target remains L1.
- Last three reports reviewed: loop 205 workspace migration reconciliation, loop 206 launch review and external-source connection research, and loop 207 audit-backed team workspace creation.
- Last-three-loop delta: workspace persistence/proof advanced; formal launch remains owner-proof blocked; `RES-027` created the exact AI Input external-source interaction direction requested by the owner.
- Repetition check: this loop is a user-visible interaction/runtime-state prototype with automated and browser proof, not another proposal-only artifact.
- Current strongest blocker: real provider authorization, secret handling, persistence, and signed-in owner proof remain intentionally unavailable and require separate approval/implementation.
- Acceptance / roadmap / research / blocker mapping: `RES-027`, `PRD-004`, `PLN-060` `AIINPUT-CONN-002/003`, Phase 20 sprint, and `ACC-002` AI Input connection prototype acceptance.
- Expected capability, proof, or blocker delta: owner can now rehearse the complete connection setup and multi-account management journey safely before any provider/runtime activation.

## Research / Reference Basis

- Local docs/code reviewed: AI Input readiness and source-control services, mock/formal mode policy, source workflow contracts, existing dialogs/table UI, provider requirements, and acceptance boundaries.
- External or reference websites reviewed: provider and interaction research already captured in `RES-027`; no new live provider behavior was introduced in this implementation pass.
- Page requirement understanding score: 93/100.
- Understanding level: High.
- Required research optimization rounds: 3.
- Completed rounds and lenses: 4 — local PRD/code fit; provider/account/scope model; BFF/API and mock/formal boundary; risk, authorization, management, and verification behavior.
- Same-issue synthesis: account authorization is separate from source scope selection; one account may own multiple connections; Google Drive is folder-based and preserves Docs/Sheets/Slides provenance; RSS has no provider-account authorization; mock mode must never imply provider readiness.
- Selected implementation pattern: one shared six-step modal with provider-specific account/scope adapters, in-memory connection drafts, exact duplicate guards, per-account health/impact preview, and fail-closed formal-mode controls.
- Rejected alternatives: provider-specific one-off dialogs, treating Google Docs as a standalone connector, one-account-only state, silently replacing existing connections, localStorage persistence, client-side provider calls, and enabling formal actions from readiness metadata.
- Task shape created or updated: `AIINPUT-CONN-002` prerequisite folded into and completed with `AIINPUT-CONN-003`; next BFF contract slice is `AIINPUT-CONN-004`.

## NANDA / Agent Protocol Alignment

- Applies?: Reviewed because source connections can later feed internal ingestion-agent capabilities; no agent runtime capability or registration surface changed.
- Affected agents or capabilities: future `IngestionAgent` source intake only.
- AgentFacts-lite fields changed: none.
- Internal discovery / registry state: unchanged; registry validation remains ready for internal use.
- External registration state: `externalRegisterable: false`.
- Trust, auth, approval, and data-visibility boundaries: mock-only local component state; no token, provider payload, secret, DB access, public output, or external agent data access.
- Concrete protocol artifact created: existing source-control/connector-boundary checkers were extended and rerun; no manifest change was appropriate for a non-runtime UI prototype.
- NANDA / AgentFacts / MCP / A2A sources reviewed: `ARC-028` and the generated internal AgentFacts-lite registry.

## Changes

- Added `SourceConnectionWizard`, a responsive six-step dialog covering provider, account, scope, sync/analysis, governance, and review/success states.
- Added multi-account and multi-connection handling, Google Drive multi-folder draft creation, RSS no-account flow, exact duplicate blocking, reauthorization/revoke impact preview, and account-health states.
- Replaced standalone Google Docs readiness rows with canonical Google Drive folder connections while preserving Google Docs/Sheets/Slides provenance.
- Integrated add/manage controls into the AI Input source management surface; mock mode creates session-only drafts while formal mode stays disabled and fail closed.
- Added a dedicated connection-wizard static checker and expanded the source-control matrix checker.
- Updated product, acceptance, backlog, sprint, task, completed-log, evidence, and loop-state memory.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm ai-input:connection-wizard:check` | PASS | Six steps, six providers, multi-account/scope, duplicate, impact, accessibility, mock-only, and forbidden-runtime checks. |
| `pnpm ai-input:source-control:check` | PASS | Google Drive folder canonicalization and source-control matrix ready. |
| `pnpm ai-input:connector-boundary:check` | PASS | 10 providers, 8 requirement areas, and 10 commands remain contract-ready with runtime disabled. |
| `pnpm agent:registry:check` | PASS | 15 manifests; zero external-registerable agents; zero validation errors. |
| Targeted ESLint | PASS | Wizard, readiness service/type, and both checker files. |
| `pnpm exec tsc --noEmit --pretty false` | PASS | Whole-project typecheck. |
| `pnpm build` | PASS | Next.js 16.2.4 webpack production build; an initial concurrent `.next/lock` collision was retried after the other build exited, then passed. |
| In-app browser actual `/ai-input` | PASS | Unauthenticated session redirected to protected login; no login or provider action attempted. |
| Isolated desktop component flow | PASS | Two Google Drive folders produced two drafts; exact existing folder was disabled; completion showed two created drafts; zero console warnings/errors. |
| Isolated mobile 390×844 flow | PASS | Dialog fit inside the viewport; document/body scroll width remained 390 with no horizontal overflow or console warnings/errors. |
| Targeted `git diff --check` | PASS | Changed implementation files were whitespace clean before documentation closeout. |

## Evidence

- Desktop Google Drive rehearsal selected one account and two folders, reviewed two pending connection records, and completed with `已建立草稿：2`.
- The exact pre-existing Drive folder rendered as `已連接 · 不可重複`; additional folders remained selectable.
- The account management surface exposes healthy, expired, and revoked state handling plus reauthorize/revoke impact previews without performing an external action.
- Mock/formal separation is preserved: mock drafts live only in component memory and formal controls cannot open the wizard.
- Product capability delta: the source setup and multi-account management journey is now operable and provider-aware in the protected AI Input prototype.
- Proof delta: source/static gates, typecheck, production build, protected-route smoke, full desktop flow, and mobile overflow checks pass.
- Blocker delta: UI uncertainty for `AIINPUT-CONN-003` is closed; provider BFF/auth/runtime/persistence remains an explicit later contract and approval path.
- Agent protocol-readiness delta: none claimed; registry posture remains internal-only and externally non-registerable.

## Remaining Risks

- This is intentionally mock-only and session-only; refresh loses drafts and no provider account is actually authorized.
- Formal BFF DTOs, provider step manifests, encrypted secret storage, callback/webhook verification, polling, revocation runtime, audit persistence, and DB persistence remain unimplemented.
- Signed-in owner QA on the actual protected page remains an owner-session handoff; isolated component proof covers the full interaction without bypassing auth.
- Provider-specific approval and permission boundaries must be researched and implemented independently before runtime activation.

## Final Status

- Status: `AIINPUT-CONN-002` and `AIINPUT-CONN-003` DONE as a mock multistep/multi-account prototype; no formal connector activation or launch-level upgrade claimed.
- Recommended next task: `AIINPUT-CONN-004` — define typed provider/account/scope step manifests and a protected BFF DTO contract before any provider OAuth, secret, callback, webhook, polling, or persistence work.
