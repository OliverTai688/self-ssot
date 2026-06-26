# Personal OS Loop 174 Evidence Report - AUTH-008 Owner Login Allowlist and Error Transparency

## Summary

- Date: 2026-06-25
- Task: `AUTH-008-OWNER-LOGIN-ALLOWLIST-AND-ERROR-TRANSPARENCY`
- Result: `DONE`
- Launch level: formal `L0_LOCAL_PROTOTYPE` unchanged
- Manual Ops level: `M1_MANUAL_OPS_READY` unchanged
- Conditional product maturity: `C3_ARCHITECTURE_GATE_READY` unchanged

## Required Context Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Last generated loop reports for loops 171-173 and the manual Supabase env proof packets.

## Strategic Review Gate

- Current target: shortest path from `L0_LOCAL_PROTOTYPE` to `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three completed loops were Research owner-read proof readiness work. They were useful but did not move the auth blocker once owner Supabase setup appeared.
- New blocker state: Supabase public env and Profile allowlist are now addressable, so the highest-leverage task is auth unblock work rather than another Research fallback.
- Product capability moved: owner login path is now closer to `AUTH-005` because the owner-provided email is mapped to an OWNER `Profile`, Supabase Auth invitation exists, and login errors are no longer falsely reported as sent.
- What is more true after this loop: the remaining `AUTH-005` blocker is owner Manual Ops signed-in `/auth/status` evidence, not missing env, missing allowlist, or invisible OTP/Profile errors.

## Implementation Delta

- Updated `src/app/actions/auth.ts` so Supabase OTP request errors redirect to `status=request-failed` and are logged only as safe error metadata.
- Updated `src/lib/auth/redirect.ts` so login redirects can carry a safe auth status.
- Updated `src/app/(dashboard)/layout.tsx` so missing session/Profile states route back to `/login` with a status code.
- Updated `src/proxy.ts` so `/login` is not auto-skipped solely because a Supabase cookie exists before Profile mapping is proven.
- Updated `src/app/(auth)/login/page.tsx` with safe messages for request failure, missing session, and missing Profile mapping.
- Added the owner-provided email to the application `Profile` allowlist as role `OWNER`.
- Sent a Supabase Auth invitation for the owner-provided email from the Supabase project dashboard.

## Verification

| Check | Result |
|---|---|
| Profile presence check | Passed: owner-provided email has an OWNER `Profile` |
| Supabase Auth Users dashboard observation | Passed: invitation sent for owner-provided email |
| `pnpm exec tsc --noEmit --pretty false` | Passed |
| `pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-174-20260625-launch-proof-after-owner-invite.json` | Completed with `Overall: warn`; no blocked items |
| `pnpm auth:proof -- --status-url http://localhost:3000/auth/status --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-174-20260625-auth-proof-after-owner-invite.json` | Correctly blocked on `supabase_session_missing` because CLI has no signed-in browser cookie |
| `pnpm launch:preempt:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-174-20260625-launch-preemption-after-owner-invite.json` | Routed to fallback until owner session evidence exists |
| `git diff --check` | Passed after docs/code updates |
| Targeted trailing whitespace scan | Passed |

## Security And Boundary Notes

- No Supabase service-role key was requested or stored.
- No cookie, token, raw claims, provider payload, Auth UID, Profile id, DB URL, Supabase key, or raw invitation link was written to this report.
- No automatic profile provisioning was added.
- No Work data migration, Work proof write, public output, Client Portal expansion, deployment mutation, external agent access, or launch-level upgrade was claimed.
- The owner-provided email appears only as an application/account input in runtime setup; generated evidence should continue to avoid printing raw account identifiers where not necessary.

## Owner Manual Ops Handoff

1. Accept the Supabase invitation for the owner account.
2. Sign in through `/login` and complete the magic-link callback in the same browser.
3. Open `/auth/status` in that signed-in browser session.
4. Save the sanitized response JSON without cookies or tokens.
5. Run:

```bash
pnpm auth:proof -- --status-json <signed-in-auth-status.json> --out docs/2_agent-input/generated/agent-loop/reports/owner-auth-session-proof.json
```

Pass signal: `canRunAuth005=true`, authenticated safe DTO present, owner Work project count available, no sensitive fields in output.

## Next Decision

- If owner signed-in `/auth/status` evidence appears, run `AUTH-005` immediately.
- If not, loop 175 should run the required launch-level review and keep `AUTH-005` as the top Manual Ops proof task.
- `WORK-009`, `WORK-007`, and `DEPLOY-002` remain downstream until auth/session proof and safe proof targets exist.
