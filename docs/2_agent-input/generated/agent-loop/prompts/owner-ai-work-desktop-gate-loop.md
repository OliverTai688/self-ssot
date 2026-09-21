# Owner AI Work Desktop Gate Loop

Run one reviewable Personal OS delivery loop for `OWNEROS` Gate A → Gate B → Gate C. This is an implementation/research/proof heartbeat, not a status-only reminder.

## 1. Required Startup

On every wakeup:

1. Run only from release worktree `/Users/pzps0964713/Documents/github/self-stucture-v1-gate-release` on branch `codex/gate-loop-release-baseline-20260831`, and verify `HEAD` descends from checkpoint `900620e1f4b324e1e817edb24415f25f634f2301`. If the path, branch, ancestry, or clean-start check fails, do not write or send; report `RELEASE_BASELINE_REQUIRED` and exit.
2. Read root `AGENTS.md` completely and obey all required-reading, Strategic Review, Research-To-Task, BFF-first, high-risk, NANDA, verification, documentation, and owner-evidence rules.
3. Read `docs/03_feature-reference/REF-003_ui-screen-registry.md`. The Registry is the only Screen ID source. Do not select an Active UI or edit a product page unless the Product Owner names one UI ID and approves that screen's Review proposal under `saas-ui-refactor-director`.
4. Read `docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-owner-decisions-20260830.md`; OD-01 through OD-07 are authoritative within their recorded scope.
5. Read:
   - `docs/06_audits-and-reports/RPT-062_scenario-system-contraction-and-internal-sharing-gap-audit.md`
   - `docs/05_execution-plans/PLN-067_owner-ai-work-desktop-and-company-sharing-contraction-plan.md`
   - `docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-gate-state.json`
   - active strategy, loop state, sprint, backlog, acceptance, and the latest three relevant evidence reports.
6. Inspect `git status --short --branch`. Preserve all unrelated user/agent changes. Never reset, discard, stage, commit, or push unless the owner separately authorizes it. A normal heartbeat begins only from a clean release worktree; unexpected dirty paths are an overlap stop.
7. Acquire the gate-state run lease before doing work. If another run is `RUNNING` and started less than 30 minutes ago, do not start a second loop; report overlap avoidance and exit. A lease may be marked stale/recovered only after 60 minutes with no completion evidence.
8. Record a run id, start commit, and the initial dirty path/hash inventory. Touch only files explicitly owned by the selected slice. If a target is already dirty and ownership is unclear, switch to a disjoint/read-only proof or stop for direction. Recheck the target hashes before integration and closeout; unexpected overlap stops the write.
9. Run the Strategic Review Gate and score the top three candidate slices by gate leverage, risk reduction, end-to-end completeness, proof value, and reversibility.
10. Select exactly one narrow slice that advances the earliest incomplete gate. Static documents alone cannot complete a runtime acceptance item.

## 2. Bounded Sub-Agent Environment

Use sub-agents only for concrete independent work, with at most three children in addition to the primary agent:

- `explorer/researcher`: read-only code/docs/official-primary-source investigation; returns evidence, files/lines, selected/rejected patterns, and task shape.
- `trust/architecture reviewer`: read-only auth, visibility, schema, BFF, NANDA, public-output, migration, and high-risk review.
- `QA/verifier`: read-only or proof-only test design/execution; returns commands, pass/fail evidence, missing proof, and regression risk.
- Use one `worker` in place of one reviewer only when it owns a small disjoint file set. Never let two agents edit overlapping files.

Every sub-agent instruction must say: do not revert unrelated dirty changes; do not stage/commit/push; do not enable production DB/provider/public/external-agent behavior; report touched files and verification. Read-only sub-agents must not edit shared state/governance files such as `AGENTS.md`, gate state, loop state, sprint, backlog, acceptance, or completed log. The primary agent owns task selection, integration, review, final verification, evidence, and gate decisions.

## 3. Issue Discovery And Research Escalation

When a selected slice reveals a missing requirement, actor journey, schema/auth boundary, AI operating model, connector constraint, or acceptance ambiguity:

1. Pause runtime expansion for that issue.
2. Inspect local PRD/ARC/AUT/DBS/SCH/PLN/ACC/RPT and related source code.
3. Use current official/primary sources when framework, auth, provider, deployment, security, protocol, or connector behavior matters.
4. Complete the required requirement-understanding/research rounds.
5. Produce or update a formal artifact plus an executable backlog row with scope, acceptance, likely files, verification, risk, and stop conditions.
6. Implement only the smallest safe slice after the gate is clear; otherwise stop for owner direction.

Do not repeat proposal/checklist/readiness work for two consecutive loops unless it closes a named gate condition. Prefer a user-visible journey, real-data/BFF slice, executable contract proof, or blocker-removal proof.

## 4. Delivery Gates

Gate state is stored in `docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-gate-state.json`. A gate moves to `ACHIEVED` only when every required condition has current evidence and all negative/safety checks pass. `CONDITIONAL`, mock, static, proposal-only, local UI, or stale proof is not achievement. Progress scores may be shown, but achievement is binary/all-of. Each criterion evidence must record environment, commit, evidence paths, negative proof, commands/results, `recordedAt`, and `expiresAt`.

Before any Gate can be achieved, the repository must provide and pass aggregate `pnpm gate:a:check`, `pnpm gate:b:check`, and `pnpm gate:c:check` proof checkers as applicable. Each checker must emit a no-secret JSON packet with gate id/status, target environment, auth mode, deployed/tested commit, freshness, mock-fallback use, runtime/owner evidence flags, individual checks, blocking ids, report path, and report SHA-256. Exit code 0 is allowed only when every required check is current and `PASS`.

### Gate A — `OWNER_PRIVATE_AI_WORK_DESKTOP_READY`

The owner can privately operate the contracted v1 product with real durable data:

1. real Google/Supabase sign-in and protected owner Profile/Personal Workspace proof;
2. persisted unified and module chat with server-authorized ContextPackage and complete reloadable history;
3. one logical owner file library with R2 upload/reload/download, persistent multi-context links, provenance, and unauthorized download denial;
4. DB-backed owner journeys for Work, Research, and Company, including Company private-thinking versus approved formal knowledge separation;
5. Inbox AI message → free-text human reply → originating task/conversation continuation with audit;
6. sourced daily agent summary/diary and reviewable Rule/Skill candidate path without silent self-modification;
7. one owner-scoped connect/import/revoke/failure proof each for LINE, Google Drive, and Gmail, respecting provider constraints and no-secret DTOs;
8. private deployed core journey with no silent mock fallback, current migration evidence, and no P0 privacy/auth/data-loss failure.

Gate A also requires a formal launch review of at least `L1_PRIVATE_ONLINE_WORK_OS`, the tested commit to equal the deployed commit, a fresh machine-readable Gate A proof packet, and an SHA-256 digest of the human-readable report.

### Gate B — `COMPANY_TEAM_PILOT_READY`

The owner and every active company member can safely collaborate; the proof group must include at least one invited non-owner:

1. invitation-gated Google onboarding, Personal Workspace, Team Workspace switching, position/responsibility metadata, and offboarding;
2. shared Work project detail/actions/files according to effective workspace/project role;
3. Personal Private, Team Project, Company Internal, and C-level visibility/inheritance/declassification rules with cross-user negative tests;
4. internal Work-AI Public Space with explicit goal/context package, role perspective, full transcript, human intervention, C-level filtering, and proposal-only downstream writes;
5. member-visible agent daily/weekly summaries within the same authorization boundary;
6. integrated pilot evidence for the owner plus every active company member, with at least one invited non-owner, across all applicable `RPT-062 §3.4` gates.

### Gate C — `HARDENED_INTERNAL_ROLLOUT_READY`

The company can expand internal use with operational confidence:

1. reviewed production migrations and rollback-forward recovery;
2. backup/restore proof, monitoring/error handling, rate/usage limits, provider outage/retry/revoke behavior, and incident runbook;
3. append-only no-secret audit, session/grant revocation, offboarding recovery, export/restore/legal-hold behavior, and the approved retention lifecycle: active for 180 days, then indefinite database/R2 archive, product deletion as database soft archive, and no terminal purge without explicit Owner authorization;
4. adversarial isolation proof across AI retrieval, search, files/signed URLs, Inbox, diaries, Public Space, logs, and errors;
5. accessibility/mobile/loading/empty/error states for the complete core journey;
6. named internal pilot findings closed with no unresolved P0/P1 security, permission, data-loss, or availability blocker.

Gate C requires three consecutive complete Gate A/B/C checks against the same release line across at least 20 minutes, including one cold deploy/restart proof. All v1 agents must still have `externalRegisterable: false`.

## 5. Gate A Gmail Notification

When and only when Gate A transitions from a non-achieved state to `ACHIEVED`:

1. Write a final Gate A report at `docs/2_agent-input/generated/agent-loop/reports/gate-a-achievement-YYYYMMDD.md` containing every criterion, exact evidence paths, commands/results, remaining Gate B/C work, and explicit statements that Gate B/C are not implied.
2. Create the machine-readable proof packet beside the report and compute the report SHA-256. Set a stable marker `notificationId = gateA:<achievedAt>:<reportSha256>`.
3. Re-read gate state immediately before sending. Check `notification.gateAEmail.status`; send only when it is neither `SENT` nor already reconciled for this `notificationId`.
4. Before sending, use Gmail search against Sent mail for the exact subject plus `notificationId` body marker. If it already exists, reconcile gate state to `SENT` and do not send again. Only the primary agent may send.
5. Use the connected Gmail plugin with recipient `to: "me"`. Do not guess, scrape, or hard-code an address.
6. Subject: `Personal OS Gate A 已達成 — Owner AI Work Desktop 驗收報告`.
7. Send a `multipart/mixed` MIME message whose body contains a concise summary, repository report path, proof-packet path, and `notificationId`; attach the Markdown report as `text/markdown` with `content_disposition: attachment`. The user explicitly required the report attachment, so attachment failure is `FAILED_RETRYABLE`; do not silently downgrade to body-only delivery.
8. After confirmed provider success, record `status: SENT`, `sentAt`, `notificationId`, report/proof paths, report SHA-256, authenticated account reference if safely available, provider message id if returned, and delivery form. Never store tokens, raw message bodies, raw email content, or credentials. Do not expose raw Gmail ids in user-facing reports.
9. If Gmail is unavailable, uninstalled, unauthorized, ambiguous, or fails, do not claim success. Record `PENDING_CONNECTION` or `FAILED_RETRYABLE`, preserve the same report/proof/notificationId, surface the exact owner action, and retry on later heartbeats without regenerating or duplicating the achievement message.

The owner has authorized this one Gate A completion email. No other external email or message is authorized by this automation.

## 6. Safety And Stop Conditions

- Follow all `AGENTS.md` high-risk approval requirements.
- Existing owner answers or explicit approvals may be used only within their recorded scope.
- OD-01 through OD-04 resolve the prior product-direction questions for C-level authority, Company publication, Public Space triggers, and retention. They authorize contract/research/task progression only; production migration/apply, provider activation, public output, terminal purge, permission changes, high-risk final writes, and external agent collaboration still require their existing explicit approvals and proof gates.
- Product pages must not contain rule manuals, architecture explanations, launch-gate prose, task IDs, proof instructions, raw capability fields, or long governance explanations. Put full explanations in the web user manual and operator diagnostics in Admin; preserve concise decision-required safety, permission, and destructive-action messages.
- If an implementation reveals a new ambiguous authority, inheritance, declassification, restore/export/legal-hold, offboarding ownership, or AI-trigger policy detail outside OD-01 through OD-04, stop that slice for owner direction. If the same owner-input blocker prevents meaningful progress for three consecutive heartbeats, pause this automation and ask the owner instead of generating adjacent documents.
- All v1 agents remain internal/protected and `externalRegisterable: false`.
- External agents never access the database directly.
- Never claim a gate from documentation, mock data, screenshots without actor proof, stale evidence, or a single happy path without negative authorization tests.

## 7. Per-Loop Closeout

Every heartbeat must:

1. run the smallest meaningful verification and strongest safe fallback proof;
2. write one structured evidence report and one machine-readable JSON companion under `docs/2_agent-input/generated/agent-loop/reports/`; include run id/time, git/dirty baseline, Gate score before/after, top-three candidate scores, selected slice, sub-agents/touched files, research sources and selected/rejected patterns, approvals/external actions, verification/freshness, Gmail status, blockers, and next slice;
3. update backlog, sprint, acceptance, completed log, loop state, and gate state only when truth changes;
4. report the selected gate/slice, sub-agents used, issue/research findings, files changed, verification, proof paths, blockers, and next slice in the current task;
5. release the run lease with completion status and continue on later heartbeats while Gate C remains incomplete, but pause/ask rather than bypass a high-risk owner decision or external-state blocker.

When Gate C is genuinely achieved and no required work remains, pause automation `personal-os-20m-aggressive-launch-loop` and deliver the final Gate A/B/C proof index.
