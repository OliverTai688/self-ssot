# Personal OS Loop 06 Evidence - SETTINGS-001 Owner Settings Shell

## Summary

- Loop: 6 of 30
- Task: `SETTINGS-001` - Add protected member/owner settings shell
- Result: Completed
- Launch level after loop: `L0_LOCAL_PROTOTYPE`
- Next recommended task: `ADMIN-001`

## Research-To-Task Quality Gate

Local sources reviewed:

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md`

Reference implementation sources reviewed:

- GitHub Docs: [Managing user account settings](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings)
- Vercel Docs: [Deployment Protection](https://vercel.com/docs/deployment-protection)

Selected pattern:

- Use a protected dashboard settings route rather than a public settings surface.
- Keep account/auth readiness server-side and expose only safe DTO fields.
- Keep role/module controls as explicit prototype rehearsal controls until `AUTH-002` defines DB-backed permissions.
- Treat source connections as read-only boundary rows until adapter privacy, BFF contracts, OAuth, and persistence are approved.
- Use Proxy upstream request headers for path preservation, per Next.js docs, instead of exposing path state in client response headers.

Rejected alternatives:

- Do not add profile-edit DB writes yet because auth/Profile mapping and permission storage are not production-ready.
- Do not add OAuth/connectors from settings yet because `DATTR-011` privacy/security policy is still pending.
- Do not make module visibility a security boundary while it remains localStorage-backed.

## Implementation

Runtime changes:

- Added `/settings` dashboard route in `src/app/(dashboard)/settings/page.tsx`.
- Added client-side settings controls in `src/app/(dashboard)/settings/settings-client.tsx`.
- Added `設定` sidebar navigation in `src/components/layout/app-sidebar.tsx`.
- Added `/settings` to protected app path matching in `src/lib/auth/redirect.ts`.
- Updated `src/proxy.ts` and `src/lib/supabase/proxy.ts` so protected routes preserve their own login `next` path via upstream request headers.
- Updated `src/app/(dashboard)/layout.tsx` so fallback unauthenticated redirects use the current request path instead of hardcoding `/ai-input`.

Documentation updates:

- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

## Verification

- `pnpm exec tsc --noEmit --pretty false` - passed.
- `pnpm db:validate` - passed; Prisma schema is valid.
- `pnpm build` - passed; route list shows `/settings` as dynamic and Proxy enabled.
- `curl -I http://127.0.0.1:3000/settings` under `next start` - returned `307` with `location: /login?next=%2Fsettings`.
- `curl http://127.0.0.1:3000/auth/status` under `next start` - returned unauthenticated readiness JSON with `authStatus: supabase_config_missing`.
- In-app Browser smoke - direct `/settings` landed on `/login?next=%2Fsettings`, rendered the login entry with an email input and missing Supabase env guidance, and reported no console errors.

## Acceptance Evidence

- `/settings` is protected and path-preserving through login.
- Settings UI separates server-side auth/profile readiness from local client-only prototype controls.
- Owner profile panel does not expose tokens, cookies, raw Supabase claims, provider payloads, or internal profile IDs.
- Source connection status remains read-only and does not introduce OAuth, webhook, scheduled sync, DB writes, migrations, or external source reads.
- Module access controls are explicitly localStorage prototype controls and not authorization.

## Remaining Risks

- Real authenticated rendering is still blocked by missing Supabase public env/session and Profile mapping proof.
- Module permissions remain localStorage-only until `AUTH-002` defines DB-backed or hybrid permission storage.
- Settings has no audit trail or persistent owner preference writes yet.
- Current launch level remains `L0_LOCAL_PROTOTYPE`; `AUTH-005`, `WORK-007`, deployment/env readiness, admin console, frontstage, and Client Portal containment still block L1+.

## Next Task

Recommended next loop: `ADMIN-001` - add a protected read-only admin/operator launch console showing auth readiness, loop state, module readiness, data readiness, and recent evidence links.
