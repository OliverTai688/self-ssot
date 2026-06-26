# Agent Loop Evidence Report

## Task

- Task ID: `WORK-012`
- Title: Docker-backed disposable Work proof runner
- Date: 2026-06-22
- Agent: Codex

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md`
- Last three generated loop reports: loops 82, 83, 84, plus loop 85 launch review

## Scope

- In scope: add a dry-run-first Docker PostgreSQL bootstrap helper for disposable Work proof targets, wire the package script, update `ACC-004`, update loop memory, and produce no-secret evidence packets.
- Out of scope: claim `WORK-009` as passed, start Docker Desktop, mutate a valuable database, run production migrations, alter auth/session behavior, or deploy.

## Strategic Review

- Current launch level / target: still `L0_LOCAL_PROTOTYPE`; next target remains `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three reports reviewed: loop 82 hardened pre-child Work proof failure evidence; loop 83 converted admin/operator history gap into `ADMIN-OPS-001`; loop 84 implemented launch readiness history; loop 85 reviewed launch level and created `WORK-012`.
- Repetition check: recent work had proof/review/admin evidence weight, but `WORK-012` is an implementation slice that removes a concrete Work proof-target blocker.
- Current strongest blocker: `AUTH-005` lacks Supabase public env plus signed-in `/auth/status`; `WORK-009` lacks a running approved disposable proof target.
- Acceptance / roadmap / research / blocker mapping: `ACC-004`, `WORK-009`, `WORK-012`, `L1_PRIVATE_ONLINE_WORK_OS`, and `RES-001` proof convergence.
- Expected delta: agents/owner now have one command that creates a local Docker proof target when Docker is running, and fails closed with no-secret packets when it is not.

## Research / Reference Basis

- Local docs/code reviewed: existing `scripts/work-proof-local-disposable.mjs`, `scripts/work-refresh-proof.mjs`, `scripts/check-work-proof-target-readiness.mjs`, `ACC-004`, sprint/backlog, loop state.
- External sources reviewed:
  - Docker port publishing guidance: https://docs.docker.com/engine/network/port-publishing/
  - Docker container run reference: https://docs.docker.com/reference/cli/docker/container/run/
  - Docker system info reference: https://docs.docker.com/reference/cli/docker/system/info/
  - Postgres Docker Official Image env vars: https://hub.docker.com/_/postgres
- Page requirement understanding score: not applicable; this is a CLI/proof helper, not a page-level UI task.
- Selected implementation pattern: Docker helper owns local target creation, binds the published Postgres port to `127.0.0.1`, refuses external target URLs, and delegates real proof writes to the existing local disposable helper.
- Rejected alternatives: direct `WORK-009` invocation duplicating safety logic; accepting arbitrary `--target-url`; using `DATABASE_URL`; claiming proof from Docker readiness.
- Task shape created or updated: `WORK-012` marked complete; next proof task remains `WORK-009` after Docker or another safe target is actually available.

## NANDA / Agent Protocol Alignment

- Applies?: No runtime AI/agent capability, registry, external collaboration, AgentFacts, MCP, A2A, or NANDA behavior changed.
- External registration state: unchanged; external registration remains disabled and human-approval-required.

## Changes

- Files changed:
  - `scripts/work-proof-docker-disposable.mjs`
  - `package.json`
  - `docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: `pnpm work:proof:docker-disposable` now emits no-secret dry-run/blocked/run packets, refuses external targets, refuses valuable-looking database names, and can run the existing local disposable helper once Docker is running.
- Docs changed: `ACC-004` now defines `WORK-012` command, safety contract, output schema, and source basis.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:proof -- --out ...loop-86...launch-proof.json` | Expected blocked | Missing Supabase public URL/key. |
| `pnpm auth:proof -- --out ...loop-86...auth-proof.json` | Expected blocked | Missing Supabase public URL/key and signed-in `/auth/status` evidence. |
| `pnpm work:proof-target:check -- --out ...loop-86...work-proof-target-readiness.json` | Expected `needs_operator_input` | No proof DB target or confirmations. |
| `docker --version` | Passed | Docker CLI exists: 29.4.1. |
| `docker info --format '{{.ServerVersion}}'` | Expected failed | Docker daemon/socket unavailable. |
| `node --check scripts/work-proof-docker-disposable.mjs` | Passed | Syntax OK. |
| `pnpm work:proof:docker-disposable -- --json --out ...docker-dry-run.json` | Passed | Packet reports `docker_daemon_unavailable`, no secret fields. |
| `pnpm work:proof:docker-disposable -- --run --setup --out ...docker-run.json --helper-out ... --proof-out ...` | Expected failed closed | Packet reports `mode=blocked_run_preflight`, `status=docker_daemon_unavailable`. |
| `pnpm work:proof:docker-disposable -- --json --target-url postgresql://db.example.com:5432/personal_os_work_proof --out ...remote-blocked.json` | Expected failed closed | Refuses external target URL. |
| `pnpm work:proof:docker-disposable -- --json --database-name production --out ...valuable-blocked.json` | Expected failed closed | Refuses valuable-looking/missing-marker database name. |
| `jq empty ...loop-86*.json docs/2_agent-input/generated/agent-loop/loop-state.json` | Passed | Generated proof packets and loop state parse as JSON. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript remains clean. |
| `pnpm db:validate` | Passed | Prisma schema remains valid. |
| `git diff --check` | Passed | No whitespace errors in the diff. |

## Evidence

- Product capability delta: owner/agent now has a Docker-created local proof-target path for Work proof.
- Proof delta: no-secret proof packets now distinguish CLI available, daemon unavailable, target refusal, and valuable-name refusal.
- Blocker delta: repeated local PostgreSQL admin availability blocker is reduced to an owner-run Docker daemon prerequisite.
- Actual `WORK-009` DB write proof: not claimed. It requires Docker daemon availability and a passing child proof packet.

## Remaining Risks

- Docker daemon is currently unavailable, so `WORK-009` remains unproven.
- `AUTH-005` remains blocked by missing Supabase public env and signed-in `/auth/status` evidence.
- `DEPLOY-002` remains downstream of auth/session and Work proof.
- If Docker runs later, inspect both the Docker bootstrap packet and child Work proof packet before claiming any launch level.

## Final Status

- Status: `WORK-012` complete.
- Recommended next task: run `AUTH-005` if auth/session evidence appears; otherwise start Docker and run `pnpm work:proof:docker-disposable -- --run --setup --out docs/2_agent-input/generated/agent-loop/reports/<docker-bootstrap>.json --helper-out docs/2_agent-input/generated/agent-loop/reports/<local-helper>.json --proof-out docs/2_agent-input/generated/agent-loop/reports/<work-proof>.json`; if Docker remains unavailable, choose the shortest non-evidence launch blocker or owner-visible maturity slice.
