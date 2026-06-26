# Work Refresh Proof Harness

**Document ID:** `ACC-004`
**Last updated:** 2026-06-22
**Status:** Active for `WORK-008`, `WORK-009`, `WORK-010`, `WORK-011`, `WORK-012`, and `WORK-013`

## Purpose

Define the disposable Work refresh proof harness that supports `WORK-008`, the explicit proof run task `WORK-009`, the proof-target readiness helper `WORK-010`, the local disposable bootstrap helper `WORK-011`, the Docker-backed disposable proof runner `WORK-012`, and the Work DB source/static smoke fallback `WORK-013`.

The harness gives agents and operators a repeatable way to prove Work project, task, note, deliverable, and derived progress persistence against a local or disposable PostgreSQL database without mutating a valuable launch database by accident.

## Command

Dry-run preflight, with no database writes:

```bash
pnpm work:proof
pnpm work:proof -- --json
```

Target readiness check, with no database connection and no database writes:

```bash
pnpm work:proof-target:check
pnpm work:proof-target:check -- --json
pnpm work:proof-target:check -- --out docs/2_agent-input/generated/agent-loop/reports/<readiness-file>.json
```

Optional local `DATABASE_URL` fallback, for a disposable local database only:

```bash
pnpm work:proof-target:check -- --use-database-url
```

Local disposable bootstrap helper, implemented by `WORK-011`:

```bash
pnpm work:proof:local-disposable
pnpm work:proof:local-disposable -- --dry-run --out docs/2_agent-input/generated/agent-loop/reports/<readiness-file>.json
pnpm work:proof:local-disposable -- --target-url postgresql://localhost:5432/personal_os_work_proof
pnpm work:proof:local-disposable -- --run --target-url postgresql://localhost:5432/personal_os_work_proof --setup
pnpm work:proof:local-disposable -- --run --create-database --admin-url postgresql://localhost:5432/postgres --setup
```

The helper must use only an approved local disposable PostgreSQL strategy. It must never silently use `DATABASE_URL`, remote targets, production credentials, valuable databases, or databases without a proof marker in the database name.

Supported owner/operator inputs:

- `--target-url` or `WORK_PROOF_LOCAL_TARGET_URL` for an existing local disposable target.
- `--admin-url` or `WORK_PROOF_LOCAL_ADMIN_DATABASE_URL` plus optional `--database-name` / `WORK_PROOF_LOCAL_DATABASE_NAME` for local database creation.
- `--use-database-url` only when the owner explicitly wants to test the current `DATABASE_URL` and it is local, disposable, and proof-marked.
- `--proof-out` to choose where the child `WORK-009` proof packet is written.

Docker-backed disposable helper, implemented by `WORK-012`:

```bash
pnpm work:proof:docker-disposable
pnpm work:proof:docker-disposable -- --json --out docs/2_agent-input/generated/agent-loop/reports/<docker-readiness-file>.json
pnpm work:proof:docker-disposable -- --run --setup \
  --out docs/2_agent-input/generated/agent-loop/reports/<docker-bootstrap-file>.json \
  --helper-out docs/2_agent-input/generated/agent-loop/reports/<local-helper-file>.json \
  --proof-out docs/2_agent-input/generated/agent-loop/reports/<work-proof-file>.json
```

The Docker helper must create or start only a local Docker PostgreSQL target with a proof-marker database name. It refuses `--target-url` so external or ambiguous targets cannot be routed through the Docker path; existing local targets belong to `pnpm work:proof:local-disposable`.

Source-path smoke helper, implemented by `WORK-013`:

```bash
pnpm work:source:check
pnpm work:source:check -- --out docs/2_agent-input/generated/agent-loop/reports/<source-smoke-file>.json
```

The source-path smoke helper is a no-database fallback. It verifies that the Work runtime source still routes list/detail/action behavior through server-only service/action boundaries and does not silently regress to mock Work data while `WORK-009` is blocked by missing proof target inputs. It emits `status: "ready_for_source_path_review"` when the static source path is intact. It must not replace `WORK-009`, `WORK-007`, or any browser/DB-backed launch proof.

Run against a disposable/local database:

```bash
WORK_PROOF_DATABASE_URL="postgresql://..." \
PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1 \
PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA \
pnpm work:proof -- --run --out docs/2_agent-input/generated/agent-loop/reports/<proof-file>.json
```

Optionally apply existing migrations to that disposable target before the proof:

```bash
WORK_PROOF_DATABASE_URL="postgresql://..." \
PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1 \
PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA \
pnpm work:proof -- --run --setup
```

`--setup` runs `pnpm db:deploy` with `DATABASE_URL` and `DIRECT_DATABASE_URL` pointed at `WORK_PROOF_DATABASE_URL`. Use it only for disposable targets.

## Safety Contract

`pnpm work:proof` defaults to dry-run mode. It does not write unless all of these are true:

- `--run` is passed.
- `WORK_PROOF_DATABASE_URL` is set, or `--use-database-url` is explicitly passed.
- `PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1` is set.
- `PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA` is set.
- The target is local, or a remote disposable target is explicitly allowed through `WORK_PROOF_DATABASE_URL` plus `PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE=1`.

The harness must not print database URLs, database hosts, profile IDs, project IDs, task IDs, note IDs, deliverable IDs, cookies, tokens, or provider payloads.

`pnpm work:proof-target:check` is stricter about evidence wording: it must not connect to a database, must not write any database record, and must not print database URLs or hosts. It only reports target source, target presence, parseability, local/remote class, confirmation flags, missing inputs, warnings, and exact next actions.

## Target Readiness Output

`scripts/check-work-proof-target-readiness.mjs` produces a JSON packet with:

- `taskId: "WORK-010"`
- `mode: "readiness_check"`
- `status: "ready_for_work_009"` when the selected target and confirmations are sufficient for `WORK-009`
- `status: "needs_operator_input"` when required target or confirmation inputs are missing
- `canRunWork009: true | false`
- `target.provided`, `target.source`, `target.parseable`, `target.hostClass`, and `target.databaseNameHasProofMarker`
- `confirmations.allowWrites`, `confirmations.confirmationAccepted`, and `confirmations.remoteOverride`
- `missing`, `warnings`, and `nextActions`
- `safety.doesNotConnectToDatabase: true`
- `safety.doesNotWriteDatabase: true`
- `safety.printsSecrets: false`

This readiness output is not Work persistence proof. It is a routing helper for the next loop or owner action:

- If `canRunWork009=false`, collect or choose a local/disposable proof target and confirmations.
- If `canRunWork009=true`, run `WORK-009` with `pnpm work:proof -- --run --json --out docs/2_agent-input/generated/agent-loop/reports/<work-proof>.json`.
- If a remote target is used, `PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE=1` must be deliberate and the target must be confirmed as disposable or non-valuable before running `WORK-009`.

## Local Disposable Bootstrap Acceptance

`WORK-011` reduces the repeated operator-input blocker without weakening safety. The helper is accepted only when it:

- defaults to no-write dry-run/readiness output unless a safe local disposable run is explicitly selected;
- detects or creates only a local disposable PostgreSQL target whose database name contains a proof marker such as `personal_os_work_proof`;
- runs the existing `WORK-009` harness instead of duplicating proof logic;
- injects `WORK_PROOF_DATABASE_URL`, `PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1`, and `PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA` only into the child proof process;
- writes a no-secret JSON readiness/proof packet;
- writes a no-secret JSON failure packet when a local admin database connection is unavailable or rejected before the child proof starts;
- refuses remote, production-like, ambiguous, missing-marker, or valuable-looking targets;
- falls back to exact owner-run instructions when no safe local disposable target is available.

`WORK-011` must not mutate a database merely because `DATABASE_URL` exists. `DATABASE_URL` may be considered only through an explicit disposable/local opt-in path that passes the same marker and safety checks.

`scripts/work-proof-local-disposable.mjs` produces a JSON packet with:

- `taskId: "WORK-011"`
- `mode: "dry_run" | "blocked_run_preflight" | "run"`
- `status: "needs_local_target" | "ready_for_local_disposable_run" | "blocked" | "passed" | "failed"`
- `canRunLocalProof: true | false`
- target source, host class, parseability, protocol allowance, proof-marker result, and valuable-looking-name result without printing URLs or hosts
- database creation availability/request/performed state without printing database names
- child proof command, setup flag, proof output path, and exit code when run
- safety flags showing no silent `DATABASE_URL` use, no remote target allowance, proof-marker requirement, child-process-only confirmation injection, and secret exclusions

## Docker Disposable Bootstrap Acceptance

`WORK-012` reduces the repeated local PostgreSQL availability blocker without weakening the `WORK-009` write-safety contract. The helper is accepted only when it:

- defaults to no-write dry-run/readiness output unless `--run` is explicitly selected;
- probes Docker CLI and daemon availability without printing Docker socket paths or raw daemon errors;
- creates or starts only a local Docker PostgreSQL target whose database name contains a proof marker such as `personal_os_work_proof`;
- refuses `--target-url`, remote targets, ambiguous existing targets, valuable-looking database names, and missing proof markers;
- runs `pnpm work:proof:local-disposable -- --run` as the child helper instead of duplicating `WORK-009` proof logic;
- injects the local Docker target URL and `WORK-009` confirmation env vars only into the child process;
- writes no-secret JSON readiness, daemon-unavailable, blocked-run, failure, and proof packets;
- leaves the actual `WORK-009` claim unproven until the child Work proof packet reports `status: "passed"` and `cleanup.cleanup: "passed"`.

`scripts/work-proof-docker-disposable.mjs` produces a JSON packet with:

- `taskId: "WORK-012"`
- `mode: "dry_run" | "blocked_run_preflight" | "run"`
- `status: "ready_for_docker_disposable_run" | "docker_daemon_unavailable" | "docker_cli_missing" | "blocked" | "passed" | "failed"`
- `canRunDockerProof: true | false`
- Docker CLI/daemon availability, image source class, requested port, and proof-marker status without printing Docker socket paths, database URLs, hosts, or passwords
- target class, refused external target state, proof-marker result, valuable-looking-name result, and redaction flags
- planned or actual child proof command, local-helper output path, Work proof output path, setup flag, and child exit code when run
- safety flags showing local-Docker-only target creation, external-target refusal, no silent `DATABASE_URL` use, proof-marker requirement, child-process-only confirmation injection, and secret exclusions

If Docker CLI exists but the daemon is unavailable, `WORK-012` must produce a packet with `status: "docker_daemon_unavailable"`, `canRunDockerProof: false`, and exact owner-run next action to start Docker and rerun the same command.

## Work Source Smoke Acceptance

`WORK-013` reduces regression risk while actual Work DB write proof is blocked by external proof target inputs. The helper is accepted only when it:

- defaults to no database connection and no database writes;
- scans only local source files and package/docs task memory;
- verifies Work list/detail pages, server actions, and services continue to use the DB-backed service/action path;
- verifies Work UI source files do not import `mockProjectsFull`, `mockTasks`, `mockNotes`, `mockDeliverables`, or other Work mock data as formal runtime sources;
- verifies Work page/action paths still include `requireUser()` or documented service-layer authorization boundaries before project-scoped data is used;
- writes a no-secret JSON packet with pass/fail markers and exact next action;
- refuses to claim `WORK-009`, `WORK-007`, `AUTH-005`, `DEPLOY-002`, L1, L3, or L4 from static evidence.

The checker output should include:

- `taskId: "WORK-013"`
- `status: "ready_for_source_path_review" | "failed"`
- `doesNotConnectToDatabase: true`
- `doesNotWriteDatabase: true`
- source-path markers for list page, detail page, actions, service layer, auth boundary, project authorization, mock import exclusions, docs/task memory, and no-secret output
- `nextActions` that route to `AUTH-005`, `WORK-009`, or the exact source regression to fix

`WORK-013` is not persistence proof. It is only a static/source fallback that keeps Work launch-critical runtime boundaries from drifting while the owner or local environment supplies the real proof target.

## Proof Sequence

When run mode is allowed, `scripts/work-refresh-proof.mjs`:

1. Creates a proof-only `Profile`.
2. Creates a proof-only `Project` with intentionally stale snapshot progress fields.
3. Creates a task as `TODO`, then updates it to `DONE`.
4. Creates a note as unpinned, then updates it to pinned.
5. Creates a deliverable as draft/internal, then updates it to delivered/client-visible.
6. Disconnects the first Prisma client.
7. Reconnects with a new Prisma client and reads the project plus task/note/deliverable rows.
8. Verifies derived progress from task rows is `1/1`, proving it does not trust the intentionally stale project snapshot fields.
9. Deletes the proof-only profile, relying on cascading deletes for the proof project and children.
10. Verifies no proof records remain.

## Expected Markers

A passing proof JSON contains:

- `status: "passed"`
- `mode: "run"`
- `refresh.refreshed: true`
- `refresh.derivedProgress.tasksDone: 1`
- `refresh.derivedProgress.tasksTotal: 1`
- `refresh.markersFound.doneTask: true`
- `refresh.markersFound.pinnedNote: true`
- `refresh.markersFound.deliveredClientVisibleFile: true`
- `cleanup.cleanup: "passed"`

Dry-run output should be treated as safe evidence that the harness is wired but not as Work persistence proof.

## Relationship To WORK-007

`WORK-008` does not replace the final `WORK-007` browser/manual refresh verification.

`WORK-008` is the strongest safe fallback while Supabase public env/session, deployment proof, or a safe DB write target remains unavailable. Once launch or disposable DB proof is approved, `WORK-007` should still verify the full owner browser journey through `/work` and `/work/[projectId]`.

## Research Basis

- Local Work action/service contract: `docs/02_architecture-and-rules/ARC-018_work-module-contract.md`.
- Local v0.1 acceptance: `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`.
- Local module acceptance: `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`.
- Prior Supabase blocker report: `docs/06_audits-and-reports/RPT-003_work-007-verification.md`.
- Prisma Migrate production/testing guidance: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- Prisma Client CRUD reference: https://www.prisma.io/docs/orm/prisma-client/queries/crud
- Prisma Client transaction/reference basis: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Docker port publishing guidance for binding published ports to `127.0.0.1`: https://docs.docker.com/engine/network/port-publishing/
- Docker `container run` reference for creating and starting containers: https://docs.docker.com/reference/cli/docker/container/run/
- Docker `system info` reference for daemon probing with `--format`: https://docs.docker.com/reference/cli/docker/system/info/
- Postgres Docker Official Image environment variable reference: https://hub.docker.com/_/postgres
