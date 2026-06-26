Run a Personal OS launch-level review. This prompt is used every fifth automated loop.

Primary lens:

- Judge whether the product is closer to a complete online operating experience.
- Do not let isolated UI polish outrank auth, permissions, DB-backed workflows, BFF/API ownership, public-safe containment, admin operations, settings, deployment, or evidence.
- Every top gap must state actor impact: frontstage user, member/owner, admin/operator, backend/API, and launch risk.

Read first:

- Root `AGENTS.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- The last five reports under `docs/2_agent-input/generated/agent-loop/reports/`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/06_audits-and-reports/RPT-004_personal-use-readiness.md`
- `package.json`
- `git status --short`

Scope:

- Frontstage / public-safe entry
- Protected dashboard and module navigation
- Member settings / owner settings
- Admin / operator page
- Auth and route guards
- Backend BFF/API/server actions
- Prisma/data/seed/readiness
- Client Portal containment
- AI Input formal mode
- Agent protocol / NANDA / registry readiness
- Per-module Agent workspaces and agent operation API/CLI readiness
- Internal multi-agent communication, delegation, proposal review, and audit readiness
- Loading/error/empty/mobile states
- Deployment/env/runbook readiness

Evaluation framework:

1. Determine current level: `L0`, `L1`, `L2`, `L3`, `L4`, or `L5`.
2. Inventory top journeys and classify each as `ready`, `source gap`, `proof gap`, `operator/environment gap`, or `product decision`.
3. Summarize the last five loops and identify whether they were runtime implementation, proof, blocker fallback, planning/proposal, readiness display, or evidence-only.
4. Identify repeated task classes and repeated blockers.
5. Identify whether recent AI/agent work has produced AgentFacts-lite manifests, validation, internal registry contracts, adapter boundaries, trust policies, or only informal documentation.
6. Score each gap:
   - Severity 3: auth/security/privacy/data-loss/public exposure/launch blocker.
   - Severity 2: broken core journey, admin cannot operate, backend proof missing, or agent protocol/registry readiness missing for an active AI surface.
   - Severity 1: UX polish, copy, layout, non-blocking weakness.
   - Leverage 3: unlocks multiple surfaces or future loops.
   - Leverage 2: improves one critical flow.
   - Leverage 1: localized.
7. Pick no more than 10 top gaps.
8. Convert the top gaps into backlog/current sprint updates.
9. Set the next four normal loops before the next review.
10. If this launch review coincides with the every-third-loop `RES-001` research cadence, create or update a formal research/architecture/acceptance artifact and convert at least one maturity gap into executable task rows.

Anti-repeat rule:

- If two or more recent loops were primarily documentation, readiness, proposal, checklist, or evidence work, at least one of the next two normal loops must be runtime implementation, proof, or blocker fallback.
- If the same blocker appeared in two recent reports or reviews, the next normal loop must produce a blocker analysis, fallback proof, or unblock plan unless the blocker can be removed immediately.
- Every recommended next loop must name the acceptance item, roadmap item, research hypothesis, or launch blocker it moves.
- If a recommended loop touches AI/agents, it must also name the AgentFacts-lite or registry-readiness artifact it will create.

If loop number is greater than 30:

- Treat this as a post-30 convergence review.
- Pick only the shortest-path blockers still preventing the final target.
- Avoid broad re-planning; output the fewest remaining loops needed and the next immediate slice.

Outputs:

- Evidence report named `personal-os-loop-NN-YYYYMMDD-launch-level-review.md`.
- Updated `loop-state.json`.
- Updated backlog/current sprint if priorities change.
- Updated acceptance docs if target criteria changed.
- Explicit last-five-loop pattern, repeated blocker analysis, and next four-loop anti-repeat plan.
- Agent protocol readiness summary: active agent surfaces, missing manifests/validation/registry contracts, and next NANDA-alignment slice.
- `RES-001` maturity summary when applicable: frontstage/member/admin/backend/agent/API-CLI/multi-agent/NANDA gaps and the implementation-ready artifact created.

Constraints:

- Do not make broad runtime source changes during the review loop.
- Do not run production mutations or valuable DB migrations.
- Do not duplicate existing reports; refine existing blockers when possible.

Final response must include current level, top 5 gaps with severity/leverage, docs updated, validation commands, and next implementation slice.
