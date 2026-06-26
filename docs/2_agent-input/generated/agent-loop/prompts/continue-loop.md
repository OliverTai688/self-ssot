Read root `AGENTS.md` first.

Continue the Personal OS launch loop, but begin with strategic review.

Before changing code, read:

- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- the last three completed reports in `docs/2_agent-input/generated/agent-loop/reports/`
- relevant PRD/ARC/ACC/PLN/RPT files for the candidate task
- `package.json`
- `git status --short`

Strategic review before task selection:

1. State the current launch level and next target.
2. Summarize what changed in the last three completed loops.
3. Identify the strongest current bottleneck.
4. Decide whether the candidate task repeats documentation, checklist, readiness, proposal, or evidence work.
5. Map the candidate task to an acceptance item, roadmap item, research hypothesis, launch blocker, or explicit backlog row.
6. If the candidate touches AI/agents, state the NANDA/AgentFacts-lite protocol-readiness delta.
7. State what product capability, proof, blocker, or agent protocol-readiness delta will exist after this loop.

Task:

1. If `loop-state.json` says the next loop is a cadence review, run `whole-site-gap-review-loop.md`.
2. If this is every third loop in the `RES-001` maturity phase, run a research-to-task gap review across frontstage, member settings, admin, backend/BFF, module operating surfaces, AI agent workspaces, agent operation API/CLI, internal multi-agent coordination, and NANDA readiness. Apply `RES-002` when the gap touches SaaS/OS operating surfaces, real-data progression, records/audit, or UI/API/CLI alignment. Convert at least one gap into a formal artifact or executable backlog row.
3. If loop number is greater than 30 and the final target is not achieved, stay in `POST_30_CONVERGENCE`, but do not let repeated proof waitpoints prevent `RES-001` or `RES-002` maturity work when external proof prerequisites remain absent.
4. If the same blocker appeared in the last two reports or reviews, choose blocker analysis, fallback proof, unblock plan, or a `RES-001`/`RES-002` maturity artifact that narrows the blocker before adjacent safe tasks.
5. Otherwise select one highest-leverage slice that advances complete launch experience or next-30-loop maturity.
6. Prioritize auth, DB proof, Work verification, route protection, Client Portal containment, AI Input formal persistence, launch proof, acceptance tests, per-module agent workspaces, agent API/CLI contracts, internal multi-agent coordination, or NANDA-aligned agent protocol/registry readiness over isolated docs or polish.
7. Do not spend a loop on documentation cleanup, checklist reshaping, readiness displays, proposal-only contracts, or evidence report improvements if the last two loops were already in that class, unless the work directly closes a named acceptance item, launch blocker, `RES-001`/`RES-002` maturity gap, or agent protocol-readiness blocker.
8. If architecture/proof/evidence-heavy loops repeat and the owner has called out missing scenarios or interface progress, choose a user-visible scenario journey, runtime interaction, or real-data/BFF maturity slice before another architecture-only artifact.
9. Run the Research-To-Task Quality Gate when the slice is non-trivial, unfamiliar, high-risk, or benefits from official docs/reference website implementation patterns.
10. For page-level UI, settings, admin, module, frontstage, or workflow tasks, score page requirement understanding from 0 to 100 before implementation. Use low 0-59 => 5 same-issue research optimization rounds, medium 60-79 => 4 same-issue rounds, high 80-100 => 3 same-issue rounds. Each round must inspect a distinct lens, refine the page requirement, and record selected/rejected implementation patterns before executable task shape is created.
11. If module development reveals a requirement gap, missing actor workflow, unclear architecture boundary, weak AI-agent operating model, missing agent operation API/CLI, multi-agent coordination gap, or NANDA readiness gap, run a focused gap escalation before expanding runtime code. Combine local docs/code/evidence with internet research from official docs, primary sources, standards, and leading comparable products; create or update a formal docs artifact and executable backlog rows.
12. Run the NANDA Agent Protocol Gate from `ARC-028` when the slice touches AI agents, Agent Team OS, AI Input, Workflow, skill routing, external collaboration, MCP, A2A, NANDA, AgentFacts, or agent registration.
13. Convert research findings into executable task shape: scope, acceptance criteria, files likely affected, verification, and risks.
14. For NANDA/protocol slices, produce a concrete artifact: AgentFacts-lite manifest inventory, schema validation, registry/readiness contract, adapter boundary, trust policy, registration approval workflow, or executable follow-up task.
15. Implement one reviewable increment or produce the strongest safe proof.
16. Run meaningful verification. If DB/auth/env/external state blocks the ideal verification, run the strongest safe fallback: contract test, schema review, static proof, mock-mode proof, local/disposable DB proof, route smoke, or setup checklist.
17. If the remaining evidence can be collected by the owner running one clear local, browser, or deployed-environment check, leave the exact command/URL/env prerequisites/pass-fail signals, tell the owner to inspect the generated output directly, keep the launch claim unproven until that evidence exists, and move the loop forward instead of spending another cycle on evidence collection.
18. Write an evidence report with source links or local file references when research was used, including NANDA/AgentFacts-lite alignment when applicable.
19. Update `loop-state.json`, backlog/current sprint/completed log as needed.

Stop and report if:

- A product/spec decision is needed.
- A valuable DB migration or production mutation would be required.
- Auth/provider/security boundary is ambiguous.
- Validation fails due to a real product/code issue.
- The user asks to pause or report.

Final response must include current loop number, launch level, what changed, validation results, and next recommended slice.
