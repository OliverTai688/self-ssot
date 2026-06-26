# Thirty Loop Launch Automation Plan

**Document ID:** `PLN-063`
**Last updated:** 2026-06-22
**Status:** Active

---

## 1. Objective

Run a super-aggressive 30-loop autonomous development cadence so Personal OS reaches a complete online operating experience as quickly as possible.

The target complete experience includes:

- Frontstage / public-safe entry experience
- Member settings / owner settings
- Admin / operator page
- Auth and permission boundaries
- Backend architecture and BFF APIs
- DB-backed operational data where launch-critical
- Per-module operation, Agent workspace, records/audit, and settings boundaries
- Owner-controlled AI agent operation API/CLI contracts
- Internal multi-agent coordination and delegation proof
- Verification, evidence, and launch readiness reviews
- NANDA-aligned AI/agent identity, capability, trust, observability, and registration readiness

The automation runs every 20 minutes through Codex heartbeat automation:

- Automation id: `personal-os-20m-aggressive-launch-loop`
- Kind: heartbeat
- Cadence: every 20 minutes
- Scope: current thread and current workspace

## 2. Operating Strategy

Default stance: implement aggressively, but keep every loop reviewable.

Each normal loop should:

1. Read `AGENTS.md`.
2. Read `docs/2_agent-input/generated/agent-loop/development-strategy.md`.
3. Read `docs/2_agent-input/generated/agent-loop/loop-state.json`.
4. Read `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`.
5. Read the last three completed loop reports.
6. Run the Strategic Review Gate: current level, last-three delta, current bottleneck, repetition check, acceptance/blocker mapping, and expected capability/proof delta.
7. Run the NANDA Agent Protocol Gate when a candidate touches AI agents, Agent Team OS, AI Input, Workflow, skill routing, external collaboration, MCP, A2A, NANDA, AgentFacts, or agent registration.
8. Select the highest-leverage launch task.
9. Prefer runtime implementation, proof, blocker fallback, or agent protocol-readiness proof over new planning docs when safe.
10. Make one concrete slice work or produce the strongest safe proof.
11. Run the smallest meaningful verification or fallback proof.
12. Write an evidence report.
13. Update loop state and task docs.

Before implementation, run the Research-To-Task Quality Gate when the selected slice is non-trivial, unfamiliar, high-risk, or quality-sensitive. Research may include local docs/code, official docs, primary provider docs, and comparable website/product implementation patterns. The output must become an executable task shape with scope, acceptance criteria, likely files, verification, and risks.

For page-level UI, settings, admin, module, frontstage, or workflow tasks, run the Page Requirement Understanding Score Gate before implementation. Score understanding from 0 to 100. Low understanding is 0-59 and requires 5 research optimization rounds on the same page issue. Medium is 60-79 and requires 4 rounds. High is 80-100 and requires 3 rounds. Each round must inspect a distinct lens, refine the same page requirement, and record selected/rejected implementation patterns before the page issue becomes executable task shape.

If DB, auth, env, deployment, provider, or external service state blocks ideal verification, the loop must not only mark the task `BLOCKED`. It must run the strongest safe fallback available: contract test, schema review, static proof, mock-mode proof, local/disposable DB proof, route smoke test, or setup checklist.

If architecture/proof/evidence-heavy loops repeat and the owner reports that scenarios or interface experience are not moving, the next no-proof fallback must improve a user-visible actor journey, scenario operating surface, runtime interaction, or real-data/BFF slice before another architecture-only artifact.

If module development reveals a requirement gap, unclear actor workflow, missing architecture boundary, weak AI-agent operating model, missing agent operation API/CLI surface, multi-agent coordination gap, or NANDA readiness gap, the loop must run a focused gap escalation before hard-coding a runtime direction. The escalation combines local docs/code/evidence with internet research from official docs, primary sources, standards, and leading comparable products, then creates or updates a formal artifact and executable backlog rows.

Every third loop in the next maturity phase must run a research-to-task gap review using `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md` and apply `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md` when maturing frontstage, member/owner settings, admin/operator, module pages, real-data flows, records/audit, or agent operation API/CLI. The review must update or create a formal artifact and convert at least one gap into executable backlog rows, acceptance criteria, verification, and risks.

When formal launch proof remains blocked by owner/operator environment work, use `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md` to keep product maturity moving without changing formal launch level. Conditional L3 work may improve interface, scenario, and architecture viewframes through `L3-UI-001`, `L3-SCENARIO-001`, and `L3-ARCH-001`, while `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` stay Manual Ops until evidence exists.

Every fifth loop must run a launch-level review instead of ordinary implementation. The review must evaluate:

- Current launch level
- Last-five-loop task pattern and repeated blockers
- Gaps across frontstage, member settings, admin, backend/API, auth, DB, and deployment
- Agent protocol / NANDA / registry readiness for active AI surfaces
- Top 10 blockers by severity and leverage
- The next five-loop implementation target

## 3. Launch Levels

| Level | Name | Meaning |
|---|---|---|
| `L0` | Local prototype | Runs locally; mock or partial data accepted |
| `L1` | Private online Work OS | Real auth, protected dashboard, Work DB-backed, deployable owner use |
| `L2` | Complete owner operating cockpit | Work, AI Input formal mode, settings, admin/audit, core APIs usable |
| `L3` | Full front/member/admin experience | Frontstage, member settings, admin operations, Client Portal containment, core backend APIs verified |
| `L4` | Hardened private launch | Security, authz, audit, deployment, error/loading states, rollback/runbook evidence ready |
| `L5` | Multi-user / external-agent ready | Scoped multi-user permissions, NANDA-aligned agent manifests/registry controls, external collaboration packages, production-grade governance |

The 30-loop goal is to reach at least `L3`, then use remaining loops to push toward `L4`.

If the final target is not achieved by loop 30, the automation must not stop. It switches to `POST_30_CONVERGENCE` mode and finishes in the fewest possible additional loops.

## 4. Five-Loop Cadence

| Loop range | Focus | Required fifth-loop review |
|---|---|---|
| 1-5 | Auth decision, protected app shell, launch backlog normalization | Level review 1: confirm L1 path |
| 6-10 | Frontstage, member settings, admin route shells, route guards | Level review 2: confirm L1/L2 readiness |
| 11-15 | Backend BFF/API contracts, DB-backed settings/admin audit, Work verification | Level review 3: confirm L2 path |
| 16-20 | AI Input formal persistence, Client Portal containment, cross-page flows | Level review 4: confirm L2/L3 readiness |
| 21-25 | Error/loading states, permission proof, deployment/env hardening | Level review 5: confirm L3 path |
| 26-30 | End-to-end launch QA, visual QA, API/DB proof, launch runbook | Level review 6: final online readiness decision |
| 31+ | Post-30 convergence | Continue only shortest-path launch blockers until the final target is met |

## 4A. Next Thirty-Loop Maturity Reset

The next maturity target is defined in `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`; the SaaS/OS operating-surface maturity standard is defined in `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`.

| Maturity loops | Focus | Third-loop research output |
|---|---|---|
| 1-3 | Auth, demo account, and real owner readiness | Owner login/demo split and `AUTH-005` proof plan |
| 4-6 | Module operating surface maturity | Operation/Agent/records/settings inventory per module plus `RES-002` checklist |
| 7-9 | Work and Client Portal proof path | Work proof/safe blocker proof and public-output safety plan |
| 10-12 | Per-module AI agent workspace contracts | Agent workspace BFF/API contract per module class |
| 13-15 | Agent operation API/CLI architecture | Owner-only dry-run command and approval/audit contract |
| 16-18 | Internal multi-agent coordination | Internal delegation/message bus proposal or proof |
| 19-21 | AI Input persistence and source workflow | DATTR-024 migration-safe implementation split |
| 22-24 | Admin/operator backend and audit | Append-only audit/readiness history proposal or proof |
| 25-27 | NANDA adapter and registration approval | Adapter boundary and registration-readiness checklist |
| 28-30 | Hardening and maturity review | Whole-system maturity review and next launch gates |

When a maturity research loop coincides with a fifth-loop launch review, combine the two reviews and record both outputs in the evidence report.

## 5. Task Selection Scoring

For every implementation loop, score candidates by:

| Factor | Score 3 | Score 2 | Score 1 |
|---|---|---|---|
| Launch leverage | Unlocks multiple surfaces or blocks launch | Unlocks one critical flow | Local improvement |
| Risk reduction | Removes auth/security/data exposure risk | Reduces operational risk | UX-only improvement |
| Completeness | Adds UI + BFF/API + verification | Adds two of the three | Adds only one layer |
| Reversibility | Small, reviewable, easy rollback | Medium change | Broad change |

Select the highest total score unless a blocker makes it unsafe.

Anti-repeat adjustment:

- `-3` if the task repeats documentation, checklist, readiness, proposal, or evidence work after two recent loops in the same class and does not close a named acceptance item or launch blocker.
- `+3` if the task directly removes a repeated blocker or creates the strongest safe fallback proof for it.
- `+2` if the task turns research/proposal material into a verifiable runtime slice, test, contract proof, or acceptance proof.
- `+2` if the task closes or narrows a `RES-001` maturity gap or applies `RES-002` to improve frontstage, member settings, admin, backend/BFF, module operating surfaces, real-data progression, agent API/CLI, multi-agent coordination, or NANDA readiness.
- `+2` if an AI/agent task creates a concrete AgentFacts-lite manifest, schema validation, internal registry contract, adapter boundary, or registration approval workflow.
- `0` if the task is safe but only creates more plan/report surface without new capability or proof.

For loops after 30, add a convergence multiplier:

- `+3` if the task directly removes the current final launch blocker.
- `+2` if the task unblocks verification for several surfaces.
- `0` if the task is cosmetic, exploratory, or not on the shortest path.

Post-30 loops must select the highest convergence-adjusted score.

## 6. Priority Order

1. `AUTH-001`: real single-owner auth strategy and implementation split.
2. Protected dashboard shell and route guards.
3. Member/owner settings page: profile, module permissions, mock-mode controls, source connections placeholder.
4. Admin page: system health, agent loop status, audit log, data readiness, module status.
5. Work online verification and page-refresh proof.
6. Client Portal containment and public-safe visibility.
7. BFF/API route and server action contracts for settings/admin/audit.
8. AI Input formal-mode persistence path.
9. NANDA-aligned agent protocol readiness: AgentFacts-lite manifests, validation, internal discovery, trust policy, and registration approval path.
10. Loading, error, empty, mobile, and accessibility hardening across frontstage/member/admin.
11. Deployment/env/runbook and final launch readiness proof.

## 7. Stop And Safety Rules

The automation may proceed aggressively without asking when work is:

- UI-only/mock and clearly marked
- BFF contract-only
- Protected route or service boundary improvement
- Documentation/evidence update
- Local/disposable DB verification

The automation must stop and ask when work requires:

- Production DB mutation
- Auth provider choice not already decided
- Schema migration apply to a valuable DB
- Public exposure of private data
- Finance, Life, Company Strategy, Client Portal final writes
- External agent access to private data

## 8. Evidence Requirements

Each loop writes a report under:

```txt
docs/2_agent-input/generated/agent-loop/reports/
```

Normal report names:

```txt
personal-os-loop-NN-YYYYMMDD-<slice>.md
```

Fifth-loop review report names:

```txt
personal-os-loop-NN-YYYYMMDD-launch-level-review.md
```

Each report must include:

- Loop number
- Task selected
- Launch level before and after
- Last-three-report delta and repetition check
- Acceptance/roadmap/research/blocker mapping
- Files changed
- UI surfaces affected
- Backend/API surfaces affected
- Verification commands and result
- Product capability delta, proof delta, or blocker delta
- NANDA/AgentFacts-lite alignment delta when applicable
- Remaining risks
- Next loop recommendation

## 9. Post-30 Convergence Mode

If loop 30 finishes without achieving the final target, switch to `POST_30_CONVERGENCE`.

Rules:

1. Minimize remaining loops to the final target.
2. Select only the shortest-path blocker with the highest launch leverage.
3. Prefer fixes that complete an end-to-end actor journey over partial new surfaces.
4. Avoid new exploratory tracks, broad refactors, extra documentation, or visual polish unless they directly unblock final launch.
5. Keep every post-30 review short, explicit, and action-biased.
6. Continue to honor Research-To-Task, high-risk approval, and verification rules.
