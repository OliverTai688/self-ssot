# Personal OS Aggressive Launch Development Strategy

Date: 2026-06-21
Status: ACTIVE_FOR_20_MIN_HEARTBEAT_LOOP

## 1. North Star

Reach a complete online Personal OS operating experience, then mature it through the next 30-loop research target in `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md` and the SaaS/OS operating-surface standard in `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`.

Complete experience means the user can operate the system through:

- Frontstage / public-safe entry surface
- Protected owner/member dashboard
- Member settings / owner settings
- Admin / operator page
- Backend BFF/API architecture
- DB-backed Work loop and launch-critical persistence
- Auth, permissions, audit, and evidence
- Per-module operation, Agent workspace, records/audit, and settings boundaries
- Owner-controlled AI agent operation API/CLI contracts
- Internal multi-agent coordination and delegation proof
- NANDA-aligned agent identity, capability, trust, observability, and registration readiness for every AI/agent surface

## 2. Automation

- Automation id: `personal-os-20m-aggressive-launch-loop`
- Cadence: every 20 minutes
- Mode: Codex heartbeat on the current thread
- Strategy: one reviewable implementation increment per wakeup
- Cadence review: every fifth loop runs a launch-level review
- Research cadence: every third loop runs a research-to-task gap review against `RES-001` and the `RES-002` SaaS/OS surface standard; if it coincides with a fifth-loop launch review, combine both reviews

## 3. Development Bias

Be super aggressive about forward motion.

Prefer:

- Real implementation over more planning
- BFF-first slices over decorative UI
- Auth/permission/data-risk reduction over broad redesign
- One working cross-page path over many partial stubs
- Verification evidence over verbal confidence

Do not waste loops on:

- Renaming for neatness only
- Broad docs cleanup without launch impact
- Visual polish that does not unblock a real actor journey
- New dependencies unless clearly justified
- Schema/application writes to high-risk modules without approval

## 3A. Next 30-Loop Maturity Bias

For the next 30-loop maturity phase, do not treat the system as complete merely because Work and readiness surfaces exist. Select tasks that expand complete operating maturity:

- frontstage to protected member journey;
- owner/member settings with real account, demo account, module boundary, and source readiness;
- admin/operator backend controls, audit history, readiness proof, and safe actions;
- BFF/API/server action contracts per module;
- module UI boundaries: operation, Agent workspace, records/audit, settings;
- AI agent workspace contracts and owner-controlled operation API/CLI;
- internal multi-agent communication, proposal review, and task delegation;
- NANDA registration-readiness artifacts without claiming external registration.

The current system is internal AgentFacts-lite ready, not externally registerable. External registration remains blocked until runtime endpoints, auth/scopes, trust evidence, observability claims, rollback, public-safety review, and human approval exist.

Use `RES-002` when maturing frontstage, member/owner settings, admin/operator, module pages, real-data flows, records/audit, or agent API/CLI. Mature surfaces should expose resource indexes, command bars, detail surfaces, agent workspaces, records/audit, settings/boundaries, BFF/API/CLI contracts, and explicit real/demo/mock/unavailable state.

### Conditional L3 Product Maturity

Use `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md` when auth/session, Work proof, Docker/local proof target, or deployment proof remains owner/operator Manual Ops but the owner asks to continue toward L3.

Rules:

- Formal `launchLevels.current` stays below L1/L3/L4 until required owner/operator evidence exists.
- Conditional product maturity may progress through interface, scenario, and architecture viewframe tasks.
- `L3-UI-001`, `L3-SCENARIO-001`, and `L3-ARCH-001` are complete; conditional product maturity is `C3_ARCHITECTURE_GATE_READY` while formal launch remains `L0_LOCAL_PROTOTYPE`.
- Do not claim `C-L3_CONDITIONAL_FULL_EXPERIENCE` until the owner completes `OWNER-UI-REVIEW`; even then it remains an owner-reviewable product maturity status only, not formal L1/L3/L4.
- When `AUTH-005` and `WORK-009` prerequisites remain absent, treat owner UI review as delegated evidence and move dev loops toward the next smallest runtime/contract blocker instead of repeating adjacent proof checks.

## 4. Strategic Review And Anti-Repetition

Every normal loop starts with a strategic review before task selection:

1. Current launch level and next target.
2. What changed in the last three completed reports.
3. The strongest current bottleneck.
4. Whether the candidate task repeats documentation, checklist, readiness, proposal, or evidence work.
5. The acceptance item, roadmap item, research hypothesis, or launch blocker moved by the task.
6. The product capability, proof, or blocker delta expected after the loop.

Anti-repeat rule:

- If two consecutive loops are primarily documentation cleanup, checklist updates, readiness displays, proposal-only contracts, or evidence reports, the next loop must choose runtime implementation, proof, or blocker fallback unless it directly closes a named acceptance item or launch blocker.
- If the same blocker appears in two reports or reviews, the next loop must produce blocker analysis, fallback proof, or an unblock plan unless the blocker can be removed immediately.
- If architecture/proof/evidence-heavy loops repeat and the owner calls out missing scenarios or interface progress, the next no-proof fallback must produce a user-visible scenario journey, runtime interaction, or real-data/BFF maturity slice before another architecture-only artifact.
- Do not select a task only because it is safe. Select it because it moves launch capability, acceptance proof, or blocker state.

Manual blocker fallback:

- If DB/auth/env/deployment/provider state blocks ideal verification, run the strongest safe alternative: contract test, schema review, static proof, mock-mode proof, local/disposable DB proof, route smoke test, or setup checklist.
- The evidence report must state why the fallback is the strongest safe proof available and what re-enables the ideal verification.
- If the remaining evidence can be collected by the owner running one clear local, browser, or deployed-environment check, stop trying to collect adjacent evidence in the automation loop. Leave the exact command/URL/env prerequisites/pass-fail signals, tell the owner to inspect the output directly, keep the launch claim unproven until that evidence exists, and move the next loop to the highest-leverage task that does not depend on that owner-run proof.

## 5. Research-To-Task Quality Gate

Before implementation, run a lightweight research gate when the slice is non-trivial or uncertain.

The gate must produce:

- Local source review: product docs, architecture docs, acceptance docs, and existing code patterns
- External/reference review when relevant: official docs, primary provider docs, or comparable website/product implementation patterns
- Selected implementation pattern and rejected alternatives
- Executable task shape: scope, acceptance criteria, likely files, verification, and risks

For page-level UI, settings, admin, module, frontstage, or workflow tasks, first run the Page Requirement Understanding Score Gate:

- Score understanding from 0 to 100 across actor/job clarity, PRD/local evidence fit, data/BFF/API clarity, UI interaction/reference confidence, risk/auth/public/high-risk boundary clarity, and acceptance/verification clarity.
- Low understanding is 0-59 and requires 5 research optimization rounds on the same page issue before implementation.
- Medium understanding is 60-79 and requires 4 research optimization rounds on the same page issue before implementation.
- High understanding is 80-100 and requires 3 research optimization rounds on the same page issue before implementation.
- Each round must keep the same page issue as the subject, inspect a distinct lens, refine the page requirement, and record selected/rejected implementation patterns.
- Only convert the page issue into implementation tasks after the required rounds produce scope, acceptance criteria, likely files, verification, risks, and stop conditions.

Do not turn research into open-ended browsing. The output must become a concrete implementation slice or a clear blocker.

Use external/current research especially for:

- Auth, permissions, deployment, provider APIs, browser/platform behavior, security, payments, storage, and framework APIs
- New frontstage, member settings, admin, or dashboard interaction models where reference implementations can improve quality
- Any API or library behavior with a meaningful chance of having changed
- Any module-development requirement gap, missing actor workflow, unclear architecture boundary, weak AI-agent operating model, missing agent operation API/CLI, multi-agent coordination gap, or NANDA readiness gap discovered during implementation

Record links or local file references in the evidence report.

Research is not complete when it is merely archived. It must produce at least one verifiable artifact: product concept, data model, UI flow, BFF/API contract, prototype, test, acceptance criteria, validation checklist, user-facing workflow, or next implementation slice.

For NANDA or agent-protocol research, the artifact must be one of: AgentFacts-lite manifest, manifest schema, validation script, internal registry contract, adapter boundary, registration approval workflow, trust/visibility policy, or a focused implementation task.

Every third loop must run the `RES-001` research cadence and apply the `RES-002` operating-surface standard when relevant. It must convert at least one gap into an implementation-ready artifact with scope, acceptance criteria, likely files, verification, risks, and stop rules.

When a module gap appears outside the scheduled third-loop cadence, run a focused gap escalation immediately if continuing without research would hard-code a weak product decision. Combine local docs/code/evidence with internet research from official docs, primary sources, standards, and leading comparable products, then create or update a formal `RES`, `ARC`, `DBS`, `AUT`, `SCH`, `PLN`, `ACC`, or `RPT` artifact and add executable backlog rows before implementing the runtime slice.

## 6. NANDA Agent Protocol Alignment

Every loop that touches AI agents, Agent Team OS, AI Input, Workflow, skill routing, external collaboration, MCP, A2A, NANDA, AgentFacts, or agent registration must run the NANDA Agent Protocol Gate in `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`.

The loop must identify:

- affected agent identity, capability, skill, endpoint, protocol, trust, observability, or registry status;
- whether the agent is governance-only, internal runtime, protected-owner visible, or external-registerable;
- approval and data-visibility boundaries;
- the concrete artifact created: manifest inventory, schema/validation proof, registry/readiness contract, adapter boundary, trust policy, or executable follow-up task.

External registration, public agent directories, and cross-organization agent collaboration remain human-approval-required.

## 7. Actor Surfaces

Every selected loop should improve at least one of these surfaces:

| Surface | Goal |
|---|---|
| Frontstage | Public-safe entry, client-visible preview, clear first action |
| Member settings | Profile, permissions, module switches, mock/formal mode, source connection settings |
| Admin page | System health, agent loop status, audit log, module readiness, data readiness |
| Backend/API | Route handlers, server actions, services, mappers, validation, authz |
| Data | Prisma schema readiness, seed, DB validation, runtime persistence |
| QA/Launch | Build/typecheck, route checks, browser proof, launch level review |
| Agent Protocol/Registry | AgentFacts-lite manifests, validation, internal discovery, trust policy, registration approval path |
| Agent Operation API/CLI | Owner-controlled dry-run commands, approval gates, audit contracts, and safe execution boundaries |
| Multi-Agent Runtime | Internal message/delegation bus, proposal queue, review states, and failure handling |

## 8. 30 Loop Roadmap

| Loops | Main target | Exit condition |
|---|---|---|
| 1-5 | Auth + protected shell | L1 path clear; auth blocker split into executable work |
| 6-10 | Frontstage/member/admin shells | Protected route surfaces exist and are navigable |
| 11-15 | Backend/API + settings/admin data | BFF contracts and DB-backed settings/admin read models exist where needed |
| 16-20 | AI Input + Client Portal containment | Formal mode and public-safe boundaries are demonstrable |
| 21-25 | Hardening + agent protocol readiness | Error/loading/authz/deployment gaps reduced; active AI/agent surfaces have a manifest/readiness path |
| 26-30 | Final launch QA | L3 ready or L4 partial with explicit blockers |
| 31+ | Post-30 convergence | Finish final launch target in the fewest additional loops |

## 8A. Next Thirty Maturity Roadmap

Use `RES-001` as the current 30-loop target and `RES-002` as the mature SaaS/OS surface standard. Each three-loop triad should end with a research-to-task artifact.

| Maturity loops | Main target | Required third-loop artifact |
|---|---|---|
| 1-3 | Auth, demo account, and real owner readiness | Owner login/demo account split and `AUTH-005` proof task |
| 4-6 | Module operating surface maturity | Per-module operation/Agent/records/settings inventory plus `RES-002` maturity checklist |
| 7-9 | Work and Client Portal proof path | Work proof or blocker proof plus public-output safety plan |
| 10-12 | Per-module AI agent workspace contracts | Agent workspace BFF/API contract per module class |
| 13-15 | Agent operation API/CLI architecture | Owner-only dry-run command, approval, scope, audit, and UI/API/CLI contract alignment |
| 16-18 | Internal multi-agent coordination | Internal message bus / delegation / proposal review contract |
| 19-21 | AI Input persistence and source workflow | DATTR-024 split into migration-safe BFF slices |
| 22-24 | Admin/operator backend and audit | Append-only audit/readiness history proposal or proof |
| 25-27 | NANDA adapter and registration approval | Adapter boundary and registration-readiness checklist |
| 28-30 | Hardening and maturity review | Whole-system maturity review and next launch gates |

## 9. Every Fifth Loop

Loops 5, 10, 15, 20, 25, and 30 must run `prompts/whole-site-gap-review-loop.md`.

Loops 3, 6, 9, 12, 15, 18, 21, 24, 27, and 30 must run the `RES-001` research-to-task gap review and apply `RES-002` for SaaS/OS operating surfaces when relevant. Loops 15 and 30 combine research review and launch-level review.

After loop 30, continue launch-level reviews every fifth loop, but keep them short and focused on shortest-path convergence.

The review must:

1. Evaluate current level from `L0` through `L5`.
2. Summarize the last five-loop pattern and repeated blockers.
3. Score top gaps by severity and leverage.
4. Update `loop-state.json`.
5. Update `PLN-063_thirty-loop-launch-automation-plan.md` only if strategy changes.
6. Update backlog/current sprint with the next five-loop target.
7. Produce a report in `reports/`.
8. Include agent protocol readiness when recent work touched AI, Workflow, Agent Team OS, external collaboration, or registration.

## 10. Default Verification

Run only what is meaningful for the slice:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
pnpm db:generate
pnpm build
git diff --check
```

Use local or disposable DBs for seed/migration proof unless the user explicitly approves valuable DB writes.

If ideal verification is blocked, record the fallback proof used and the exact condition required to resume ideal verification.

If only an owner-run check remains, provide the command or URL and pass/fail criteria, then proceed to the next implementable task instead of spending another loop on evidence collection.

## 11. Required Output Per Loop

Each loop must leave behind:

- Research/reference basis when the quality gate applies
- Strategic review: last-three-report delta, repetition check, and current blocker
- Acceptance/roadmap/research/blocker mapping
- Updated code/docs
- Verification result
- Evidence report
- Updated `loop-state.json`
- Updated task tracking when status changes
- Product capability delta, proof delta, or blocker delta
- NANDA/AgentFacts-lite alignment delta when applicable
- A clear next loop recommendation

## 12. Post-30 Convergence Mode

If loop 30 does not reach the final target, switch to `POST_30_CONVERGENCE`.

In this mode:

- Minimize the number of remaining loops.
- Choose only the highest-leverage blocker on the shortest path to the final target.
- Prefer completing end-to-end journeys over starting new surfaces.
- Avoid exploratory, cosmetic, broad-refactor, or documentation-only work unless it directly removes a launch blocker.
- Continue Research-To-Task and verification rules, but keep reviews concise and implementation-biased.
