# Loop 176 Post-Auth-Unblock Gap Review

**Document ID:** `RPT-055`
**Date:** 2026-06-25
**Task:** `LOOP-176-RES-001-POST-AUTH-UNBLOCK-GAP-REVIEW`
**Status:** Completed

## Decision

Formal launch remains `L0_LOCAL_PROTOTYPE`. `AUTH-005` did not preempt because current proof still reports `Auth status supabase_session_missing`. `WORK-009` also did not preempt because no safe proof target or write confirmations exist.

The selected next implementation artifact is:

```txt
AUTH-009-SIGNED-IN-AUTH-STATUS-SANITIZED-CAPTURE
```

This is the shortest useful post-auth-unblock slice. It removes the current owner evidence friction: `/auth/status` is the browser-session truth source, but the raw authenticated payload can include the owner email, while generated evidence must avoid raw account identifiers. The next implementation should add a redacted proof mode for `/auth/status` and teach `pnpm auth:proof` to accept it.

## Strategic Review

| Gate | Answer |
|---|---|
| Current target | `L1_PRIVATE_ONLINE_WORK_OS` while keeping conditional product maturity at `C3_ARCHITECTURE_GATE_READY`. |
| Last three completed loops | Loop 173 added Research live-read eligibility gate; loop 174 configured owner auth allowlist and login error transparency; loop 175 completed launch-level review. |
| Primary blocker | Owner signed-in Supabase session evidence for `AUTH-005`. |
| Repeat risk | Another Research live-read task would repeat owner-evidence dependency because BFF-016 remains Manual Ops. |
| Capability moved | Proof handoff clarity: convert the auth proof capture gap into an implementation-ready task. |
| More true after this loop | The next no-proof fallback is no longer generic Research work; it is a concrete auth evidence sanitizer/capture slice. |

## Research Understanding Score

Subject: owner signed-in `/auth/status` evidence capture for `AUTH-005`.

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 20/20 | Owner must sign in, open proof status, save safe JSON, and run `auth:proof`. |
| PRD/local evidence fit | 19/20 | `AUT-002`, `ACC-005`, `PBK-001`, loop 174, and loop 175 all point to signed-in `/auth/status` as the blocker. |
| Data/BFF/API clarity | 18/20 | Current route and proof collector exist; the gap is accepting redacted status evidence rather than raw status JSON. |
| UI/reference confidence | 13/15 | Login readiness and status endpoint exist; the next slice is a small handoff improvement, not a new page pattern. |
| Risk/auth/public-output clarity | 15/15 | No cookies, tokens, raw claims, Profile ids, DB URLs, Supabase keys, or raw email should enter generated proof. |
| Acceptance/verification clarity | 10/10 | Verification can use a redacted fixture, `auth:proof`, route source scan, `owner:access:check`, typecheck, and DB validate. |
| **Total** | **95/100** | High. Three same-issue research rounds are complete. |

## Research Rounds

### Round 1 - Local Product And Code Fit

Observed local shape:

- `src/app/auth/status/route.ts` returns the authenticated status DTO and currently includes `profile.email` when signed in.
- `scripts/collect-auth-session-proof.mjs` sanitizes that into `profile.emailPresent`, then writes the no-secret proof packet.
- `docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md` says real browser proof usually needs `--status-json`, because CLI should not accept raw cookie values.
- `docs/04_playbook/PBK-001_launch-env-unblock-handoff.md` asks the owner to save sanitized JSON, but the easiest browser output is still the raw endpoint response.

Selected pattern: keep `/auth/status` as the existing truth endpoint, add a proof/sanitized mode for owner evidence capture, and update the proof collector to accept either raw `profile.email` or redacted `profile.emailPresent`.

Rejected alternatives:

- Ask the owner to paste browser cookies into CLI. Rejected for security.
- Auto-create Profile rows from auth proof. Rejected by `AUT-002`.
- Keep manual raw JSON sanitization as the main path. Rejected because it invites accidental raw email evidence.

### Round 2 - Official Auth And Framework Source Fit

Sources reviewed:

- Supabase SSR client docs: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase SSR advanced guide: https://supabase.com/docs/guides/auth/server-side/advanced-guide
- Supabase `getClaims` reference: https://supabase.com/docs/reference/javascript/auth-getclaims
- Next.js authentication guide: https://nextjs.org/docs/app/guides/authentication

Synthesis:

- Supabase SSR stores session state in cookies shared between browser and server, so the CLI cannot truthfully prove a signed-in browser session without owner-provided JSON evidence.
- Supabase recommends using verified claims server-side, and the current repo already uses `getClaims()`.
- Next.js recommends centralizing authorization in a data access layer/DTO boundary and treating route handlers/server actions as public-facing security surfaces.

Selected pattern: produce a server-generated redacted DTO from the signed-in browser request, then let the CLI validate that DTO without handling cookies.

Rejected alternatives:

- Let `auth:proof --status-url` be the primary real-session path from CLI. Rejected because it cannot carry the browser's Supabase SSR cookies.
- Move proof logic into a Client Component. Rejected because proof should come from the same server-side auth/Profile boundary as dashboard and Work.

### Round 3 - Risk, Acceptance, And Launch Boundary

Selected task shape:

```txt
AUTH-009-SIGNED-IN-AUTH-STATUS-SANITIZED-CAPTURE
```

Acceptance:

- `/auth/status?proof=1` or equivalent proof mode returns authenticated proof JSON with `profile.emailPresent: true` instead of the raw email value.
- `pnpm auth:proof -- --status-json <file>` accepts the redacted proof payload and continues to reject unparseable, unauthenticated, Profile-missing, or mapping-incomplete evidence.
- Login/settings/admin owner handoff text points to the redacted proof path instead of asking the owner to manually sanitize raw JSON.
- The change does not claim `AUTH-005`, `WORK-009`, `DEPLOY-002`, L1, L3, or L4 success.

Stop conditions:

- Stop before accepting cookies, tokens, raw claims, provider payloads, Profile ids, Auth UIDs, service-role keys, DB URLs, or raw email values in generated reports.
- Stop before automatic Profile provisioning or auth provider mutation.
- Stop before treating redacted fixture evidence as real `AUTH-005` proof.

## NANDA / Agent Protocol Boundary

This task touches Research/agent routing only indirectly. The selected next task is auth proof capture, not an agent capability. Existing Research BFF-016 remains protected-owner, proposal/proof-only, non-registerable, and `externalRegisterable=false`. No external registration, public endpoint expansion, external collaboration, or external agent database access is allowed.

## Verification

| Command | Result |
|---|---|
| `pnpm auth:proof -- --status-url http://localhost:3000/auth/status --out ...loop-176...auth-proof.json` | Checker passed; proof remains blocked by `supabase_session_missing`. |
| `pnpm work:proof-target:check -- --json --out ...loop-176...work-proof-target-readiness.json` | Checker passed; target remains `needs_operator_input`. |
| `pnpm research:read-issues-live-read-eligibility:check -- --json --out ...loop-176...research-live-read-eligibility.json` | Checker passed; Research live-read remains Manual Ops. |
| `pnpm launch:preempt:check -- --json --out ...loop-176...launch-preemption-router.json` | Proof preemption unavailable; fallback is RES-001 review. |
| `pnpm research:read-issues-live-read-proof-runner:dry-run:check -- --json --out ...loop-176...research-live-read-proof-runner-dry-run-check.json` | Checker passed; status `ready_for_research_issues_live_read_proof_runner_dry_run_cli`. |
| `pnpm research:read-issues-live-read-proof-runner:check -- --json --out ...loop-176...research-live-read-proof-runner-contract-check.json` | Checker passed; status `ready_for_issues_live_read_proof_runner_contract`. |
| `pnpm research:read-issues-selected-field-runtime-adapter:check -- --json --out ...loop-176...research-selected-field-check.json` | Checker passed; status `ready_for_issues_selected_field_runtime_adapter_proof_gate`. |
| `pnpm research:read-issues-service-authz-runtime:check -- --json --out ...loop-176...research-service-authz-check.json` | Checker passed; status `ready_for_issues_service_authz_runtime_proof`. |
| `pnpm db:validate` | Passed. |
| `pnpm exec tsc --noEmit --pretty false` | Passed. |
| `node -e '<parse loop 176 JSON proof packets>'` | Passed. |
| `git diff --check` | Passed. |

## Resulting Backlog Artifact

`AUTH-009-SIGNED-IN-AUTH-STATUS-SANITIZED-CAPTURE` is now the next executable implementation slice if owner signed-in `AUTH-005` evidence does not appear first.

## Next Recommendation

Loop 177 should run `AUTH-005` immediately if owner signed-in proof appears. Otherwise run `AUTH-009-SIGNED-IN-AUTH-STATUS-SANITIZED-CAPTURE`.
