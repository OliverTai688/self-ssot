# Target Operating Version v0.1

This defines the first usable operational version, not the final dream version.

## What The User Can Do In v0.1

1. Open the dashboard and Work module.
2. Reach a login entry before accessing protected dashboard routes.
3. Create and view projects persisted in PostgreSQL.
4. Add and complete project tasks persisted in PostgreSQL.
5. Add project notes persisted in PostgreSQL.
6. Add deliverables persisted in PostgreSQL.
7. Open a gated client portal link that can read real DB data and only expose client-visible records after env, token, visibility, and DB checks pass.
8. Open protected owner settings to inspect auth readiness, profile mapping state, module visibility rehearsal, mock/formal data boundaries, and the shared read-only audit BFF boundary.
9. Open a protected admin/operator console to inspect launch blockers, loop state, module readiness, environment presence, recent evidence, and the shared read-only audit BFF contract.
10. Open a public-safe root entry that explains the Personal OS owner cockpit, routes protected owner actions through login, and keeps Client Portal access token-only.
11. Inspect protected owner/admin Agent Protocol readiness for internal AgentFacts-lite manifest coverage, validation proof, trust gates, and external registration blockers.
12. Use AGENTS.md, Codex skills, task backlog, and sprint files to run repeatable closed-loop development cycles.

## Active Modules

- Work
- Client Portal
- Agent Team OS as repo governance/documentation
- DB contract and task management docs

## Partially Active Modules

- Research: UI exists, but DB model alignment remains open.
- Ingestion: mock pipeline exists, persistence remains open.
- Workflow: UI and engine exist, persistence/audit alignment remains open.
- Life: fitness/life context exists, still state/mock-based.

## Placeholder Modules

- Finance
- Chamber
- Company

## DB-Persisted Data In v0.1

- Profile seed user
- Projects
- Project tasks
- Project notes
- Project deliverables
- Module permission visibility snapshot from `UserModulePermission` rows overlaid on role defaults

## Mock Or Fallback Data Allowed In v0.1

- AI Pulse
- Morning Brief
- Research network UI data until Phase 3
- Ingestion pipeline data until Phase 4
- Workflow rule/audit demo data until Phase 4
- Life demo data until a privacy-first model is defined

## Operational Criteria

The system is v0.1 operational when:

- Prisma schema and migration strategy are coherent.
- Seed can create demo data.
- Work CRUD persists after page reload.
- Protected dashboard routes require auth or explicit development mock mode.
- Protected owner settings preserve the requested path through `/login?next=...` and avoid high-risk writes.
- Protected admin/operator console preserves the requested path through `/login?next=...` and remains read-only.
- Admin and settings share a server-only read-only audit/readiness BFF contract before any persisted audit or permission write behavior is added.
- `/` is a public-safe static owner entry. It does not render private module state, mock project data, client tokens, env values, source material, internal notes, tasks, or deliverables.
- A private auth readiness route exists to verify Supabase config/session, Profile mapping, and owner-scoped Work access without exposing secrets.
- A no-secret launch readiness command exists to verify Supabase public env presence, Prisma DB URL readiness, DB host DNS reachability, auth mode, and next operator actions before `AUTH-005` / `WORK-007`.
- A no-secret launch proof packet exists for loop reviews, with `canRunAuth005`, `canRunWork007`, `canClaimL1`, expected strict exit code, and blocked labels.
- Module visibility starts from a server-side permission snapshot and labels any browser-only override as rehearsal, not authorization.
- AI Input formal mode has a server-only readiness BFF contract that keeps mock connector/workflow rows hidden and states why SourceAsset / AIWorkflowRun / AIWorkItem persistence is not active yet.
- Client Portal has a gated DB-backed loader; by default `/client/[token]` fails closed and does not serve mock project, task, deliverable, note, or client-token-derived content as public output.
- When `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB=1` and DB/token checks pass, Client Portal reads persisted Work records and respects client-visible boundaries.
- Protected admin/settings expose a Client Portal readiness contract before public sharing, making token schema/hashing, rotation/revoke, audit, public storage/file URL review, and real DB smoke gates explicit.
- Protected admin/settings expose an Agent Protocol readiness contract before any external agent registration, making AgentFacts-lite coverage, validation proof, trust gates, endpoint/auth absence, and external registration blockers explicit.
- Protected dashboard and public not-found/unavailable/error states use consistent no-secret route-state UI; public `/client/[token]` preserves 404/no-store/noindex fail-closed behavior instead of streaming a loading state before token validation.
- Auth and permission risks are documented, with at least app-layer authorization protecting Work data.
- AGENTS.md, skills, backlog, current sprint, and completed log support repeatable development cycles.

## Should Not Be Built Yet

- Full `/agents` runtime UI.
- Full agent marketplace.
- Full NANDA integration.
- External AI collaboration runtime.
- Autonomous high-risk writes.
- Finance transaction finalization.
- Complex CRM/company strategy modules before DB and Work CRUD are stable.
