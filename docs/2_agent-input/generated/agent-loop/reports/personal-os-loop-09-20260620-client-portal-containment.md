# Personal OS Loop 09 Evidence - CLIENT-002 Client Portal Containment

Date: 2026-06-20
Automation: `personal-os-20m-aggressive-launch-loop`
Loop: 9
Task: `CLIENT-002 - Gate mock Client Portal before DB-backed launch`
Result: `DONE`

## Decision

`/client/[token]` was too high-risk to leave mock-backed before `CLIENT-001`. This loop converted the public route into a fail-closed containment boundary: requests return the segment-level unavailable UI through `notFound()`, emit noindex metadata, and no longer import or map token strings to mock project, task, or deliverable data.

This is not the final Client Portal implementation. `CLIENT-001` still needs DB-backed token validation, visibility filtering, token lifecycle strategy, and ClientPortalAgent/AuthPermissionAgent review.

## Research Basis

Local sources reviewed:

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/02_architecture-and-rules/ARC-018_work-module-contract.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`

External references:

- [Next.js `notFound()` API](https://nextjs.org/docs/app/api-reference/functions/not-found): used for segment termination and noindex behavior.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): used as the public-output safety baseline: deny by default and validate authorization on each request before returning protected resources.

Selected implementation pattern:

- Use an App Router Server Component page for `/client/[token]`.
- Mark it request-time dynamic.
- Call `notFound()` before rendering any project, task, deliverable, or token-derived content.
- Render a segment-level `not-found.tsx` unavailable boundary explaining that DB-backed token validation and client-visible filtering must land before public output.

Rejected alternatives:

- Keeping mock data behind visual warnings: rejected because public routes would still serve token-derived demo project content.
- Implementing full `CLIENT-001` immediately: rejected for this loop because token validation, visibility filtering, revoke/rotation semantics, and public output review need a separate DB-backed BFF contract.
- Redirecting to `/`: rejected because a 404/noindex boundary is clearer for invalid/unavailable client links and avoids implying the token was accepted.

## Files Changed

- `src/app/client/[token]/page.tsx`
- `src/app/client/[token]/not-found.tsx`
- `src/lib/services/admin-readiness.service.ts`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/02_architecture-and-rules/ARC-018_work-module-contract.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

## Verification

Commands run:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm build
rg -n "mockProjectsFull|mockTasks|mockDeliverables|useParams|Tabs|clientToken|project\\.name|Lisa" 'src/app/client/[token]' src/app/page.tsx
node - <<'NODE'
const url = 'http://127.0.0.1:3000/client/tok-lisa-q2-2026'
const response = await fetch(url)
const html = await response.text()
const required = ['客戶連結目前不可用', 'No mock output', 'Mock data blocked', 'DB token required', 'Visibility filter required', 'noindex']
const privateMarkers = ['Lisa', 'Q2', '銷售趨勢', '渠道分析', 'mockProjectsFull', 'mockTasks', 'mockDeliverables', 'clientToken', '任務進度', '交付物 (']
const result = {
  status: response.status,
  cacheControl: response.headers.get('cache-control'),
  contentType: response.headers.get('content-type'),
  requiredMissing: required.filter((marker) => !html.includes(marker)),
  leakedMarkers: privateMarkers.filter((marker) => html.includes(marker)),
  hasRequestPathEcho: html.includes('tok-lisa-q2-2026'),
}
console.log(JSON.stringify(result, null, 2))
if (result.status !== 404 || result.requiredMissing.length > 0 || result.leakedMarkers.length > 0) {
  process.exit(1)
}
NODE
```

Outcomes:

- TypeScript passed.
- Prisma schema validation passed.
- Production build passed and listed `/client/[token]` as dynamic.
- Source scan found no mock imports or client-side route/UI remnants in the Client Portal route.
- Production HTTP smoke returned `404`.
- Cache header was `private, no-cache, no-store, max-age=0, must-revalidate`.
- Required unavailable/noindex boundary markers were present.
- Mock/private markers were absent.
- The HTML includes the requested token string only as the request path echo inside Next's RSC/app-state payload; no token-to-project mapping content or project data is rendered.

Browser verification note:

- In-app Browser smoke was attempted twice after loading Browser runtime docs and once with Browser visibility enabled.
- Both attempts timed out while attaching to the Browser webview.
- No Browser pass is claimed for this loop; HTTP/source verification is the evidence for the public-output containment.

## Acceptance Update

`CLIENT-002` acceptance now requires:

- No runtime mock imports or rendering in `/client/[token]`.
- Fail-closed unavailable/invalid-token output until DB-backed token validation exists.
- No private project/client/task/deliverable/note/source content in public output.
- Noindex/no-store behavior for the unavailable public route.
- `CLIENT-001` remains responsible for persisted token validation and visibility filters.

## Risks

- `CLIENT-001` still needs a DB-backed loader/BFF service that validates persisted `clientToken` values and filters tasks/deliverables to `client_visible`.
- Token rotation/revoke strategy is still not implemented.
- Public notes remain excluded by default; any future note exposure needs explicit approval.
- Real online Work/Auth proof remains blocked by Supabase env/session/connectivity.
- Loop 10 must run launch-level review before more implementation.

## Next Task

Run loop 10 launch-level review. After review, resume the shortest-path launch blocker, likely `AUTH-005` if Supabase env/session is available, otherwise `CLIENT-001` or Work online verification planning depending on environment readiness.
