# Personal OS Loop 177 Evidence Report - AUTH-009 Redacted Proof Capture

## Task

- Task ID: `AUTH-009-SIGNED-IN-AUTH-STATUS-SANITIZED-CAPTURE`
- Title: Add redacted signed-in auth status proof capture
- Date: 2026-06-25
- Agent: Codex
- Status: `DONE`

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Recent reports: loops 174, 175, and 176.

## Scope

- In scope: add a no-secret `/auth/status?proof=1` DTO, teach `pnpm auth:proof` to accept `profile.emailPresent`, add a structural checker, update owner handoff text, and reduce protected `/admin` readiness load found during the owner auth check.
- Out of scope: claim `AUTH-005`, create Supabase users, mutate provider state, write Profile rows, expose raw email in generated proof, run Work writes, change launch level, or deploy.

## Strategic Review

- Current launch level / target: `L0_LOCAL_PROTOTYPE`, targeting `L1_PRIVATE_ONLINE_WORK_OS`.
- Last-three-loop delta: `AUTH-008` configured owner allowlist/invitation and login transparency; loop 175 refreshed launch level and kept `AUTH-005` as Manual Ops; loop 176 converted the signed-in proof capture gap into `AUTH-009`.
- Repetition check: this loop implemented the no-secret proof capture slice instead of writing another readiness review.
- Current strongest blocker: owner signed-in browser-session evidence is still absent from an owner-run `/auth/status?proof=1` capture.
- Acceptance / roadmap / blocker mapping: `AUTH-009` reduces the Manual Ops risk for `AUTH-005` by making the accepted proof DTO redacted by default.
- Expected delta: the next owner proof can be captured without raw email sanitization, while formal launch remains blocked until that owner-run evidence exists.

## Research / Reference Basis

- Local docs/code reviewed: auth status route, auth proof collector, owner access readiness contract, login/owner handoff surfaces, task memory, and recent proof packets.
- Page requirement understanding score: 95/100 from loop 176.
- Understanding level: High.
- Required research optimization rounds: 3.
- Completed rounds and lenses: local auth/status fit, official Supabase/Next session boundary, and no-secret acceptance/risk boundary.
- Selected implementation pattern: keep `/auth/status` as the signed-in session truth source and add `?proof=1` so the DTO carries `profile.emailPresent` plus role, not a raw email.
- Rejected alternatives: CLI cookie capture, accepting browser cookies/tokens in proof files, auto-provisioning Profile rows, storing raw email in generated reports, or treating fixtures as formal `AUTH-005`.
- Task shape updated: `AUTH-009` is now complete; `AUTH-005` remains the owner-run signed-in proof step.

## NANDA / Agent Protocol Alignment

- Applies?: No direct agent capability change.
- Affected agents or capabilities: none.
- External registration state: `externalRegisterable=false`.
- Trust, auth, approval, and data-visibility boundaries: proof capture is owner-session only, no-secret, no public output expansion, no external agent database access, and no autonomous writes.
- Concrete protocol artifact created: none required.

## Changes

- Added redacted proof mode to `src/app/auth/status/route.ts`.
- Updated `scripts/collect-auth-session-proof.mjs` to accept `profile.emailPresent`.
- Added `scripts/check-auth-redacted-proof-capture.mjs` and `pnpm auth:redacted-proof:check`.
- Updated owner handoff markers in `src/lib/contracts/owner-access-readiness.contract.ts` and `scripts/check-owner-access-readiness.mjs`.
- Fixed mock-auth proxy bypass in `src/proxy.ts` so explicit mock mode does not call Supabase claims in middleware.
- Reduced `/admin` readiness report scanning in `src/lib/services/admin-readiness.service.ts`.
- Fixed clean Next typecheck for `src/app/client/[token]/page.tsx`.

## Verification

| Command | Result | Notes |
|---|---|---|
| `node --check scripts/check-auth-redacted-proof-capture.mjs && pnpm auth:redacted-proof:check` | Passed | Structural no-secret checker for `AUTH-009`. |
| `pnpm auth:proof -- --status-json /tmp/personal-os-redacted-auth-status.json --out /tmp/personal-os-redacted-auth-proof.json` | Passed | Fixture proof returned `ready` and `canRunAuth005=true`; packet did not contain raw email. |
| `node --check scripts/collect-auth-session-proof.mjs && node --check scripts/check-owner-access-readiness.mjs` | Passed | Script syntax remains valid. |
| `curl -i http://localhost:3000/auth/status?proof=1` | Passed as blocked proof | Terminal has no browser cookie, so response correctly returned `401 supabase_session_missing`, `proofMode: redacted`, and no raw email. |
| `curl -I http://localhost:3000/admin` | Passed as protected route smoke | Normal Supabase mode redirected unauthenticated terminal access to `/login?next=%2Fadmin`. |
| `PERSONAL_OS_AUTH_MODE=mock ... curl http://localhost:3000/admin` | Passed | Earlier smoke returned `200` after compile, proving the mock proxy hang was removed. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | Next/TypeScript clean after the client token prop fix. |
| `git diff --check` | Passed | No whitespace errors. |

## Evidence

- DB/profile observation: the owner-provided email has a `Profile` with role `OWNER`; no secret values or raw identifiers were recorded here.
- Product capability delta: owner auth proof capture now has a redacted, machine-checkable path.
- Proof delta: `auth:proof` can accept redacted signed-in status JSON with `profile.emailPresent`.
- Blocker delta: `AUTH-005` is now blocked only on owner-run signed-in evidence, not on raw email sanitization mechanics.
- Admin stability delta: protected `/admin` no longer depends on reading every generated report file during readiness assembly.

## Remaining Risks

- Formal launch remains `L0_LOCAL_PROTOTYPE` until owner-run signed-in `/auth/status?proof=1` evidence exists, Work proof exists, and deployment proof exists.
- Browser automation could not read the owner browser session because local browser navigation to `/auth/status?proof=1` was blocked client-side; this remains owner-run Manual Ops.
- If the owner still sees many `/admin` browser issues, the next runtime task should inspect React streaming/table stability and visual smoke the admin page.
- `AUTH-009` fixture success must not be treated as `AUTH-005`.

## Final Status

- Status: `DONE`
- Recommended next task: run `AUTH-005` immediately if owner signed-in `/auth/status?proof=1` JSON evidence appears; otherwise pick the shortest remaining proof blocker, likely Work proof target setup or admin browser stability if the issue persists.
