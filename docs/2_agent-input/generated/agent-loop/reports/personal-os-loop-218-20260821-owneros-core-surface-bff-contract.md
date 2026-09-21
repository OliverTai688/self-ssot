# Personal OS Loop 218 - OwnerOS Core Surface BFF Contract

**Run id:** `gate-loop-20260821T170027-owneros-bff-001`  
**Selected task:** `OWNEROS-BFF-001`  
**UI foundation:** `OWNEROS-UI-003`  
**Date:** 2026-08-21  
**Gate status:** Gate A/B/C remain `NOT_ACHIEVED`  
**Gmail:** Not triggered  

## Strategic Review Gate

- Current target: Gate A `OWNER_PRIVATE_AI_WORK_DESKTOP_READY`, then Gate B team pilot, then Gate C hardened internal rollout.
- Last three loops completed: `OWNEROS-002A` chat/context contract, `OWNEROS-UI-001` simplified SaaS UI pattern, and `OWNEROS-UI-002` dashboard runtime simplification.
- Current blocker: Gate A still lacks real owner auth/runtime/deployed/no-mock evidence. UI/BFF drift would slow Gate B/C, so the highest-leverage safe slice is the shared contract before runtime page edits.
- Anti-repetition outcome: this is another contract slice, but it directly unblocks the owner-requested `/ai-input`, `/settings`, and `/admin` runtime simplification while avoiding dirty runtime overlap.
- What is more true: four core protected surfaces now share one BFF/view-model and layout-component contract with a checker.

## Research-To-Task Gate

Requirement understanding score: `94/100` High.

Research rounds:

1. Local product/code fit: `RPT-062`, `PLN-067`, `ARC-036`, and current route loaders show the safest order is `/ai-input`, then `/settings`, then `/admin`.
2. BFF/Next.js boundary: local Next.js 16 docs reviewed for Server/Client Components, data fetching, mutations, data security, route handlers, and Link. Selected pattern is Server Component loader -> auth/service -> UI-safe DTO -> Client Component.
3. Gate/NANDA/risk boundary: AI Input agent surfaces stay internal/protected proposal workspaces; external registration, public output, provider activation, and direct external-agent DB access remain blocked.

External UI reference sources used:

- Shopify app home index table composition: https://shopify.dev/docs/api/app-home/patterns/compositions/index-table
- Shopify Polaris common actions: https://polaris.shopify.com/patterns/common-actions
- Atlassian navigation system layout: https://atlassian.design/components/navigation-system/layout/
- IBM Carbon data table usage: https://carbondesignsystem.com/components/data-table/usage/
- GitLab Pajamas design system: https://design.gitlab.com/

## Implementation

Added:

- `docs/02_architecture-and-rules/ARC-037_owneros-core-surface-bff-view-model-contract.md`
- `src/lib/contracts/owneros-core-surface-bff.contract.ts`
- `scripts/check-owneros-core-surface-bff-contract.mjs`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-218-20260821-owneros-core-surface-bff-contract.json`

Updated:

- `package.json`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `tasks.md`

Runtime pages intentionally not edited:

- `src/app/(dashboard)/ai-input/page.tsx`
- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/admin/page.tsx`

## Product Capability Delta

The next UI simplification pass now has a shared contract:

- Shared layout components: `OwnerOsSurfaceFrame`, `OwnerOsCommandBar`, `OwnerOsResourceIndex`, `OwnerOsDetailPane`, `OwnerOsAgentProposalPane`, `OwnerOsRecordsAudit`, `OwnerOsBoundaryPanel`.
- Core surfaces: `/dashboard`, `/ai-input`, `/settings`, `/admin`.
- BFF invariants: Server Component loader, `requireUser()` or `resolveCurrentUser()`, service authorization, UI-safe DTO, serializable Client props, Manual Ops handoff, no secret/raw provider payloads.
- Follow-up tasks: `OWNEROS-AIINPUT-UI-001`, `OWNEROS-UI-003`, `OWNEROS-UI-004`.

## Verification

Passed:

- `node --check scripts/check-owneros-core-surface-bff-contract.mjs`
- `pnpm owneros:surface-bff:check`
- `pnpm owneros:surface-bff:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-218-20260821-owneros-core-surface-bff-contract.json`
- `pnpm ui:simplified-saas:check`
- `pnpm dashboard:simplified:check`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm gate:a:check -- --allow-incomplete --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-218-20260821-gate-a-incomplete-after-core-surface-bff.json`
- `jq empty docs/2_agent-input/generated/agent-loop/loop-state.json docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-gate-state.json docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-218-20260821-owneros-core-surface-bff-contract.json docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-218-20260821-gate-a-incomplete-after-core-surface-bff.json`
- `git diff --check -- <touched files>`

Expected blocked proof:

- Gate A proof remains `NOT_ACHIEVED`.
- Blocking categories remain A1 through A8 runtime/owner/deployed evidence plus deployed commit/report requirements.
- Safety packet confirms no email, DB mutation, provider mutation, public output, external-agent DB access, or external registration.

## NANDA Alignment

AgentFacts-lite posture for this slice:

- identity/provider/lifecycle/endpoints/protocols/capabilities/skills: unchanged
- auth/trust: clarified through BFF and UI-safe DTO boundaries
- observability: checker and proof packet added
- registry: `externalRegisterable: false`

No external agent registration or direct external-agent database access was added.

## Risks

- `PRD-004_next-stage-development-plan.md` is still deleted in the dirty worktree; this is a governance risk outside this slice.
- Runtime `/ai-input`, `/settings`, and `/admin` files have pre-existing dirty changes; this loop avoided overlap.
- Gate A cannot be claimed until fresh owner auth, runtime, deployed, no-mock, and negative evidence exists.

## Next Task

Recommended next implementation slice:

1. Run the overdue short launch-level review if the automation cadence requires it.
2. If no owner auth proof appears, start `OWNEROS-AIINPUT-UI-001`: simplify `/ai-input` first viewport using `ARC-036` and `ARC-037` while preserving existing protected DTOs and all provider/DB/public/external stop conditions.
