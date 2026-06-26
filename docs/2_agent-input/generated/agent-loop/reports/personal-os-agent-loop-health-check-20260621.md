# Codex / AGENTS.md Development Loop Health Check

Date: 2026-06-21
Scope: AGENTS.md, development loop docs, automation prompts, sprint/backlog state, acceptance docs, recent reports, and loop strategy.
Changed files in this pass: this generated audit report only.

## 1. Summary Judgment

The current automation system is healthier than a loose "agent writes random code" loop: it has canonical docs, a task backlog, sprint state, acceptance files, loop state, evidence reports, and fifth-loop launch reviews.
It is not structurally out of control, but it does have a moderate-to-high risk of getting stuck in adjacent safe work while the real L1 launch blockers remain unresolved.
The strongest proof is that loops 15, 20, and 21 still record `L0_LOCAL_PROTOTYPE`, while the system continues to complete readiness contracts, proof packaging, token proposals, and public-safe containment.
The loop does include Research-To-Task rules, but the rule often converts research into proposals, contracts, or readiness surfaces rather than forcing a runtime slice, disposable proof, contract test, or user-visible capability.
Overall evaluation exists every fifth loop, but normal loops do not require a per-loop strategic review that compares the last three reports, detects repetition, and asks whether the next task changes product capability.
AGENTS.md and the Codex prompts should be adjusted, not because they are broken, but because they currently make "smallest useful change plus evidence report" too easy to satisfy with safe documentation-heavy output.
The next loop should prefer a proof/unblock slice such as `WORK-008` or `AUTH-006` over another proposal-only review, unless real env/session/DB readiness allows `AUTH-005` or `WORK-007` to run.

## 2. Main Risks

| Risk | Evidence Position | Possible Consequence | Severity | Recommendation |
|---|---|---|---|---|
| The loop can keep making safe progress while launch level stays L0. | `loop-state.json:41-50`; `personal-os-loop-20...md:38-47`; `PLN-061_current-sprint.md:57-59` | Many commits and reports without crossing `L1_PRIVATE_ONLINE_WORK_OS`. | High | Add a "launch-level delta" requirement: every loop must state why launch level did or did not move and what exact blocker was removed. |
| No hard anti-repetition rule for doc/checklist/evidence-only loops. | `AGENTS.md:83-88`; `MAN-002_development-loop.md:18-21`; `continue-loop.md:26-29` | Repeated small safe changes can satisfy Definition of Done without product capability gain. | High | If two consecutive loops are documentation/proposal/readiness-only, the next loop must be proof/runtime/unblock unless tied to a named acceptance blocker. |
| Blocker fallback exists in practice but is too late and not mandatory. | `PLN-060_task-backlog.md:57-58`; `PLN-061_current-sprint.md:196-208` | Env/DB/auth blockers push the agent into adjacent reviews before disposable proof or setup proof is forced. | High | On the second recurrence of the same blocker, require `WORK-008`-style disposable proof, mock test, schema review, static proof, or setup checklist. |
| Research-to-task can become research-to-proposal rather than research-to-product. | `AGENTS.md:122-141`; `ACC-002_module-acceptance-criteria.md:291-348`; `PLN-061_current-sprint.md:75-107` | Research artifacts are archived well but do not always produce an executable, verifiable product slice. | Medium | Require each research/proposal task to create one acceptance-linked artifact: BFF contract, schema migration slice, UI flow, prototype, test, or validation checklist. |
| Normal loop prompt reads the most recent report, not the last three-loop pattern. | `continue-loop.md:12-13`; fifth-loop prompt reads latest reports at `whole-site-gap-review-loop.md:14` | The agent can act locally and miss repetitive behavior across several loops. | Medium | Normal loops should summarize the last three completed reports and identify what is genuinely new in the selected task. |
| L3/L4 target pressure may conflict with current L0 proof reality. | `AGENTS.md:270-273`; `loop-state.json:25-30`; `personal-os-loop-20...md:38-47` | The loop may chase L2/L3 surfaces before proving L1 auth, DB, and Work operation. | Medium | Add a pre-L1 convergence mode until `AUTH-005` and `WORK-007` or their disposable proof alternatives are complete. |
| README remains generic create-next-app onboarding. | `README.md:1-35` | New agents or humans may miss the actual Personal OS operating docs if they begin from README. | Low | Eventually replace README with links to `AGENTS.md`, `MAN-001`, `PLN-061`, and launch proof commands. |

## 3. Missing Or Weak Mechanisms

- Strategic review gate: important because the agent must decide whether the next task removes the real bottleneck, not just whether the task is safe.
- Anti-repeat rule: important because the repo already has many completed docs/proposal/readiness tasks; the loop needs a brake on repeated non-runtime increments.
- Research-to-implementation mapping: important because research should land as a data model, UI flow, BFF/API contract, prototype, test, or acceptance update, not only as a document.
- Acceptance-driven slice selection: important because v0.1 has concrete acceptance items for Work CRUD, auth, Client Portal containment, and launch proof.
- Manual blocker fallback: important because DB/auth/env blockers are expected; the loop should still produce contract tests, local/disposable proof, static checks, or setup instructions.
- Escalation rule: important because repeated blockers need a blocker analysis and unblock plan, not another adjacent "safe" task.
- Product capability metric: important because "files changed" and "verification passed" do not equal "user can now do something new or trust something more."
- Prior-report delta: important because the agent should show what this loop adds beyond the last three reports.

## 4. Suggested AGENTS.md Rules

Paste-ready section:

```md
## Strategic Review Gate

Before selecting a task, the agent must answer:

- What is the current primary product target?
- What did the last three completed loops change?
- What blocker is currently preventing the next launch level or acceptance milestone?
- Is the candidate task new value, or a repeat of documentation, checklist, readiness, or evidence work?
- Which product capability, research hypothesis, acceptance item, or launch blocker will this task move?
- What will be more true after this loop than before it?

If the answers show repeated low-impact work, the agent must escalate to blocker analysis, proof work, or a higher-leverage implementation slice.

## Anti-Repetition Rule

If two consecutive loops are primarily documentation cleanup, checklist updates, readiness displays, proposal-only contracts, or evidence reports, the next loop must not do the same class of work unless it directly closes a named acceptance item or removes a launch blocker.

The next loop must instead choose one of:

- a runtime implementation slice;
- a contract/schema/static proof;
- a local or disposable environment proof;
- a focused blocker analysis with an unblock plan;
- an acceptance test or verification harness.

## Research-To-Implementation Loop

Every research input must be converted into at least one verifiable artifact:

- product concept;
- data model or schema proposal;
- BFF/API contract;
- UI flow or prototype;
- acceptance criteria;
- automated or manual validation checklist;
- user-facing workflow;
- evidence report with a next implementation slice.

Research is not complete when it is merely archived. It is complete only when the next executable slice and acceptance proof are clear.

## Acceptance-Driven Slice

Every selected loop task must map to at least one of:

- a v0.1 acceptance item;
- a roadmap item;
- a launch-level blocker;
- a research hypothesis;
- a newly created backlog task with acceptance criteria.

Evidence reports must name that mapping and describe the product capability delta.

## Manual Blocker Fallback

When DB, auth, env, deployment, provider, or external service state blocks the ideal verification, the agent must not only mark `MANUAL_REQUIRED` or `BLOCKED`.

It must choose the strongest safe fallback available:

- contract test;
- schema review;
- static proof;
- mock-mode proof;
- local/disposable DB proof;
- route smoke test;
- setup checklist with exact readiness criteria.

## Escalation Rule

If the same blocker appears in two loop reports or launch-level reviews, the next loop must stop doing adjacent small tasks and produce a blocker analysis plus an unblock plan, unless the blocker can be removed immediately.

The blocker analysis must include owner action required, agent-actionable fallback, safe verification, and the next task to resume after unblocking.
```

## 5. Suggested Codex Loop Prompt

```md
Read root `AGENTS.md` first.

Continue the Personal OS launch loop, but begin with strategic review.

Read:

- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- the last three reports in `docs/2_agent-input/generated/agent-loop/reports/`
- relevant PRD/ARC/ACC/PLN/RPT files for the candidate task
- `package.json`
- `git status --short`

Before selecting a task, answer:

1. What is the current launch level and next target?
2. What changed in the last three loops?
3. What is the strongest current bottleneck?
4. Is the candidate task repeating docs/checklist/readiness/evidence work?
5. Which acceptance item, roadmap item, research hypothesis, or blocker does this task move?
6. What product capability or proof will exist after the loop?

Task selection:

1. If this is a fifth-loop cadence review, run the launch-level review prompt.
2. If the same blocker appeared in the last two reports, choose blocker analysis, fallback proof, or unblock plan before adjacent tasks.
3. Choose one meaningful slice at L2 or above unless no higher-value safe work exists.
4. Prefer auth, DB proof, Work verification, Client Portal containment, AI Input persistence, launch proof, or acceptance tests over isolated docs or polish.
5. If blocked by DB/auth/env/external state, produce contract test, schema review, mock test, static proof, local/disposable proof, or setup checklist.
6. Run the Research-To-Task gate for non-trivial, high-risk, unfamiliar, or externally dependent work.
7. Implement the slice or produce the strongest safe proof.
8. Validate with the smallest meaningful command.
9. Write an evidence report that includes prior-report delta, acceptance mapping, product capability delta, validation, risks, and next decision.
10. Update loop state and task docs only when status or strategy actually changes.

Do not spend a loop on documentation cleanup, checklist reshaping, or readiness display if the last two loops were already in that class, unless it directly closes a named acceptance item.
```

## 6. Suggested Task Level System

| Level | Task Type | Example | When To Use | Loop Limit |
|---|---|---|---|---|
| L0 | Hygiene | typo, naming, formatting, index repair | Only when no higher-value safe task exists | Never twice in a row |
| L1 | Proof | static proof, route smoke, schema validation, launch proof packet | When runtime is blocked or before risky changes | Good fallback, but must name blocker |
| L2 | Implementation slice | BFF loader, server action, UI path, mapper, verification | Default loop class | Preferred normal loop |
| L3 | Research translation | theory to schema, workflow, prototype, acceptance test | After research or product ambiguity | Must create executable next slice |
| L4 | Architecture/blocker review | repeated DB/auth/env blocker analysis, unblock plan | Required after same blocker repeats twice | Produces decision and fallback plan |
| L5 | Actor journey completion | login-to-Work proof, client portal safe path, admin readiness flow | When close to launch-level movement | Highest priority before launch reviews |

## 7. Final Recommendations

Most urgent change: update the Codex loop prompt first, then AGENTS.md. The prompt controls the next heartbeat behavior; AGENTS.md should hold the durable policy once approved.

Do not make acceptance docs heavier right now. They are already concrete enough for v0.1; the missing piece is forcing each loop to map to them and prove product capability.

Do not expand the report structure first. Reports are already detailed; the problem is not report quality, it is task-selection gravity.

Next best loop:

1. If real Supabase env/session is ready, run `AUTH-005`.
2. If reachable DB is ready, run `WORK-007`.
3. If not, pull `WORK-008` forward before another proposal-only review, because disposable Work refresh proof is the best blocker fallback.
4. Run `AUTH-006` after or beside that if auth remains blocked and the operator needs an exact session proof checklist.
5. Keep `CLIENT-006` important, but do not let it become another documentation-only substitute for Work/auth proof.

Things not to repeat:

- More generic evidence-report improvements.
- More proposal-only schema/readiness contracts without an implementation or proof follow-up.
- More UI-only mock work unless it directly supports an acceptance item.
- Re-stating the same Supabase/DB blocker without new proof, fallback, or owner-action clarity.

Rules that should become hard rules:

- Anti-repetition after two low-runtime loops.
- Last-three-report strategic review before task selection.
- Same blocker twice triggers escalation.
- Every task maps to acceptance, roadmap, research hypothesis, or blocker.
- Blocked verification must produce the strongest safe fallback proof.
- Evidence reports must state product capability delta, not only files changed.
