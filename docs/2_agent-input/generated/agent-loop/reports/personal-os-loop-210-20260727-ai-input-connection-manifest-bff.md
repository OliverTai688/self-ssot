# Personal OS Loop 210 — AI Input Connection Manifest And Protected BFF Catalog

## Task

- Task ID: `AIINPUT-CONN-004`
- Title: Define typed provider-step manifests and a protected source-connection BFF DTO catalog
- Date: 2026-07-27
- Agent: Codex root with contract/BFF, manifest-driven UI, and QA subagents

## Source Docs Read

- `AGENTS.md`
- Required manual, product, acceptance, situation, strategy, loop-state, sprint, backlog, and recent evidence files
- `RES-001`, `RES-002`, `RES-005`, `RES-027`, `ARC-015`, `ARC-028`, `ARC-031`, and `AUT-007`
- Relevant Next.js 16.2.4 local Server/Client Component and data-security guides under `node_modules/next/dist/docs/`

## Scope

- In scope: typed provider/account/scope/step manifests; redacted connection/setup/preview/test/impact DTOs; operation, duplicate, authz, audit, stop, runtime, and NANDA contracts; a server-only protected loader; Server Component-to-client-to-wizard wiring; malformed-manifest fail-closed behavior; executable static QA.
- Out of scope: route handlers, Server Actions, OAuth, callbacks, webhooks, polling, provider API/SDK execution, tokens or secrets, provider discovery, DB reads/writes, schema/migration changes, public output, final module writes, external agent DB access, and external registration.

## Strategic Review

- Current launch level / target: formal `L0_LOCAL_PROTOTYPE`; Manual Ops `M1_MANUAL_OPS_READY`; conditional product maturity `C3_ARCHITECTURE_GATE_READY`; next formal target remains L1.
- Last three completed reports reviewed: loop 207 audit-backed team creation, loop 208 AI Input multistep wizard, and loop 209 configured team workspace activation.
- Last-three-loop delta: team workspace runtime and configured DB readiness advanced; AI Input gained the requested setup journey; formal launch still needs owner-session, Work, and deployment proof.
- Repetition check: this is a typed BFF/runtime-read contract and manifest-driven UI refactor with executable proof, not a repeated proposal/checklist loop.
- Current strongest blocker: real provider accounts, secrets, schema/authz/audit persistence, provider callbacks/events, and owner-approved runtime remain intentionally absent.
- Acceptance / roadmap / research / blocker mapping: `RES-027` and Phase 20 `AIINPUT-CONN-004`; closes the contract gap between the loop-208 mock wizard and future provider/schema tasks.
- Expected delta: provider setup behavior and unsafe runtime states become one protected, validated, machine-checkable source of truth before any provider activation.

## Research / Reference Basis

- Local docs/code reviewed: current wizard, AI Input Server Component/readiness service, Source Workflow service authorization, connector-runtime approval, source adapter boundary, and protected BFF patterns.
- External/reference basis: provider and comparable-product research is already captured in `RES-027`; this pass introduced no new provider behavior and used the repository's installed Next.js 16 documentation for RSC/DAL/DTO boundaries.
- Page requirement understanding score: 93/100, inherited from the same `RES-027` source-connection page issue.
- Understanding level: High.
- Required research optimization rounds: 3.
- Completed rounds and lenses: 4 — local product/code fit; provider/account/scope topology; BFF/auth/security boundary; acceptance and rollout split.
- Same-issue synthesis: server validates and returns a no-secret provider catalog; client consumes only DTO metadata; all provider/runtime operations remain blocked independently from mock UI rehearsal.
- Selected implementation pattern: server-only `requireUser()` loader, pure typed manifest/validator, minimal redacted DTO, explicit operation catalog, fail-closed unavailable response, and manifest-driven wizard.
- Rejected alternatives: client-owned provider schema, client fallback in formal mode, provider-specific one-off API shapes, native provider identifiers in DTOs, browser-generated duplicate fingerprints, fake runtime-ready flags, and implementing callbacks/routes/persistence in the contract loop.
- Task shape: `AIINPUT-CONN-004` DONE; `AIINPUT-CONN-005` remains the next source-connection slice after the required launch review.

## NANDA / Agent Protocol Alignment

- Applies?: Yes, because the catalog describes a future source-connection draft-management capability used by internal AI Input/ingestion flows.
- Affected agents or capabilities: protected `source-connection-draft-management` contract only; no agent runtime endpoint or execution capability added.
- AgentFacts-lite fields changed: no registry manifest changed; the DTO restates lifecycle, internal protocol, runtime-disabled, and registration-disabled posture.
- Internal discovery / registry state: unchanged; 15 internal manifests validate and zero have runtime endpoints.
- External registration state: `externalRegisterable: false`, `registrationStatus: not_registered`.
- Trust, auth, approval, and data visibility: protected owner-only, `requireUser()`, client owner id rejected, no direct external-agent DB access, no secrets/raw payload/native provider identifiers, and all side effects blocked.
- Concrete protocol artifact: protected source-connection catalog DTO, manifest validator, server loader, and executable checker.
- Sources reviewed: `ARC-028` and the existing generated AgentFacts-lite registry; no new external protocol behavior was required.

## Changes

- Added `src/types/ai-input-source-connection-catalog.ts` with provider/account/scope/step, redacted read/setup/preview/test/impact, operation, duplicate, authorization/audit, runtime, and NANDA DTOs.
- Added `src/lib/contracts/ai-input-source-connection-catalog.contract.ts` with six providers, six ordered steps, Drive document provenance, literal disabled runtime flags, and fail-closed validation.
- Added `src/lib/services/ai-input-source-connection-catalog.service.ts`; it is server-only, calls `requireUser()`, and returns either the validated catalog or an unavailable zero-provider DTO.
- `/ai-input/page.tsx` loads the readiness and source-connection catalogs in parallel and passes the safe DTO through `AIInputClient` to `SourceConnectionWizard`.
- Wizard provider/step/account/scope behavior now consumes the typed catalog and renders an unavailable state for missing, malformed, incomplete, runtime-enabled, or externally registerable catalogs.
- Added `scripts/check-ai-input-connection-manifest-bff.mjs` and `pnpm ai-input:connection-manifest:check`.
- Updated product, architecture, authorization, acceptance, sprint, backlog, task, completed-log, evidence, and loop memory.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm ai-input:connection-manifest:check` | PASS | Typed DTOs, six providers/steps, requireUser handoff, fail-closed validation, operations, fingerprint, impact, audit/stop, and forbidden-runtime scan. |
| `pnpm ai-input:connection-wizard:check` | PASS | Existing six-step/mock/formal safety behavior remains intact. |
| `pnpm ai-input:source-control:check` | PASS | Drive-folder source-control contract remains ready. |
| `pnpm ai-input:connector-boundary:check` | PASS | Existing 10-provider connector boundary remains ready without runtime. |
| `pnpm agent:registry:check` | PASS | 15 manifests; 0 external-registerable; 0 runtime endpoints; 0 validation errors. |
| `pnpm exec tsc --noEmit --pretty false` | PASS | Whole-project typecheck. |
| Targeted ESLint | PASS | New types/contract/service, page, wizard, and checker. Full legacy `ai-input-client.tsx` lint still has an existing unrelated `setMounted(true)` effect rule error and warnings outside this slice. |
| `pnpm build` | PASS | Next.js 16.2.4 webpack production build; compile, TypeScript, page generation, trace collection, and `/ai-input` dynamic route completed. |
| `git diff --check` | PASS | Final tracked worktree check after documentation whitespace correction. |

## Evidence

- Ready catalog contains exactly six providers and 36 provider-step entries; RSS is credentialless and Drive alone carries Google Docs/Sheets/Slides provenance.
- Only `list_provider_manifests` is allowed now via Server Component loader; six other account/draft/preview/test/impact/activation operations remain blocked.
- Invalid manifests return `provider_manifest_catalog_unavailable`, `providers: []`, empty account/scope instances, and no formal-mode client fallback.
- Duplicate scope identity is defined as a future server-generated hash only; native provider ids and fingerprint values are not exposed.
- No provider connection, DB connection, external endpoint, provider payload, or secret was used during verification.
- Product capability delta: the loop-208 wizard is now driven by a protected typed catalog instead of client-owned provider/step rules.
- Proof delta: malformed-manifest, DTO redaction, BFF wiring, and prohibited-runtime behavior are executable and build-proven.
- Blocker delta: UI/BFF contract ambiguity is closed; schema/authz/audit/secret/provider runtime remains deliberately routed to later tasks.
- Launch delta: none; L0/M1/C3 remains unchanged.

## Remaining Risks

- Mock account/scope fixtures remain client-only rehearsal data because account/scope persistence and provider discovery are intentionally unavailable.
- `AIINPUT-CONN-005` requires explicit schema, credential-reference, RLS/service-authz, audit-storage, migration/backfill, rollback, and proof-target review before persistence.
- The first real provider pilot still requires separate owner approval and provider-specific proof; completing this catalog does not authorize OAuth, URL fetching, webhooks, polling, or provider calls.
- The existing broader `ai-input-client.tsx` lint debt should be handled as a separate focused cleanup, not mixed into connector authorization work.

## Final Status

- Status: `AIINPUT-CONN-004` DONE as a protected typed BFF/provider-manifest contract; no connector runtime or launch upgrade claimed.
- Recommended next task: run the required loop-211 launch-level review, then select `AIINPUT-CONN-005` if owner proof does not preempt.
