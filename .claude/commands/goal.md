# Goal — Autonomous Closed-Loop Development Iteration

You are running one iteration of the Personal OS autonomous development loop.

Each invocation of this command executes exactly **one task** from the backlog, verifies it, updates docs, evaluates the stopping condition, and either schedules the next iteration or hands off to the human.

---

## STEP 1 — State Read

Read the following files before doing anything else:

1. `/Users/pzps0964713/Documents/github/self-stucture-v1/AGENTS.md` — project rules and governance
2. `/Users/pzps0964713/Documents/github/self-stucture-v1/docs/tasks/T-001-backlog.md` — full task backlog
3. `/Users/pzps0964713/Documents/github/self-stucture-v1/docs/tasks/T-002-sprint-current.md` — current sprint and blockers
4. `/Users/pzps0964713/Documents/github/self-stucture-v1/tasks.md` — current priority sequence

---

## STEP 2 — Task Selection

From the backlog, find the highest-priority task that satisfies ALL of:

- Status is `TODO` (not `DONE`, not `BLOCKED`, not `IN_PROGRESS`)
- Is **autonomously executable** — does NOT require any of:
  - Human decision on auth provider (AUTH-001 and anything depending on it)
  - Supabase/DB credentials or DNS resolution (WORK-007)
  - OAuth tokens or external API credentials
  - Human approval for high-risk module final writes (Finance, Life, Company)
  - Deployment or release pipeline actions
- Has all its listed dependencies satisfied (status `DONE`)

**Priority order for autonomous work:**
1. `UIUX-001` — Edit/Delete UI controls for Task, Note, Deliverable (server actions already exist; just wire UI)
2. `FOPS-002` — Audit module routes (docs only)
3. `FOPS-003` — Common module subpage navigation prototype (UI-only)
4. `FOPS-004` — Module agent workspace shell (UI-only)
5. `FOPS-005` — Module records/audit subpage prototype (UI-only)
6. `FOPS-006` — Refactor Work IA toward operating surface (UI, must not break DB CRUD)
7. `FOPS-007` — Refactor Research IA (UI only)
8. `FOPS-008` — Structured shells for Finance, Chamber, Company, Life stubs
9. `DATTR-020` — @mention target mock model (UI-only)
10. `DATTR-011` — Source intake security/privacy policy (docs)
11. `RESEARCH-001` — Research network DB model decision (docs)
12. `AGENT-002` — Agent Team OS schema proposal (docs)
13. `DB-005` — Supabase migration legacy strategy (docs)
14. `INGEST-001` — Ingestion persistence models proposal (docs)
15. `INGEST-002` — WorkflowRule + AgentMessage DB plan (docs)
16. `DATA-002` — Cross-source data ops persistence contract (docs)
17. `DATA-003` — Visual lineage UI prototype (UI-only)
18. `DATA-004` — Governance event analytics contract (docs)
19. `AI-001` — AI service adapter boundary (docs)
20. `CHAMBER-001` — Chamber CRM MVP scope (docs)
21. `FINANCE-001` — Finance draft-only MVP scope (docs)
22. `COMPANY-001` — Company strategy MVP scope (docs)

If no task from this list has all dependencies satisfied and is not blocked, proceed to the **Stopping Condition** step immediately.

---

## STEP 3 — Architecture Review

Before writing any code, read the relevant source documents:

- For UI tasks: read `docs/architecture/A-ARCH-012-frontend-operating-surface.md`
- For Work module tasks: read `docs/architecture/A-ARCH-018-work-module-contract.md`
- For Research tasks: read `docs/architecture/A-ARCH-006-research-ia-refactor-plan.md`
- For data/ingestion tasks: read `docs/architecture/A-ARCH-011-document-attribute-layer.md`
- For agent tasks: read `docs/agents/AG-002-internal-agents.md`

---

## STEP 4 — Execution

Follow AGENTS.md §5 (BFF-first workflow) and §4 (development principles):

- **Docs-only task**: Write or update the relevant markdown file. No code changes.
- **UI-only task**: Implement the minimal UI change. No DB schema, no new server actions, no migration. Stay within existing component patterns.
- **UI + server action wiring**: Wire existing server actions to UI controls. Do not create new actions; use what already exists in `src/app/actions/work.ts` or the relevant action file.
- **Proposal task**: Write a technical proposal doc. Mark it clearly as proposal/planning, not a runtime change.

Rules:
- One task, minimal scope.
- Do not redesign surrounding code while fixing a specific thing.
- Do not add dependencies without clear justification.
- Do not change auth, DB schema, or routing unless the task explicitly requires it.
- For high-risk modules (Finance, Life, Company): docs and structured shell UI only — no final DB writes.

---

## STEP 5 — Verification

Run only the smallest useful verification:

```bash
# For any code change
cd /Users/pzps0964713/Documents/github/self-stucture-v1
pnpm exec tsc --noEmit --pretty false

# For DB-touching changes (should be rare in autonomous mode)
pnpm db:validate
pnpm db:generate

# For significant code changes
pnpm build
```

If `pnpm build` fails because Supabase is unreachable (DNS error), document the failure and note that it is an infra blocker, not a code bug. Do not block task completion on infrastructure.

---

## STEP 6 — Doc Update

Update these files after every completed task:

1. `docs/tasks/T-001-backlog.md` — change task status to `DONE`
2. `docs/tasks/T-002-sprint-current.md` — add one sentence to the "In Scope / Completed" section
3. `docs/tasks/T-005-completed-log.md` — append one entry: task ID, title, date, result, verification run, risks

Format for T-005 entry:
```
## [TASK-ID] [Title] — [Date]
- Result: [what was done]
- Verification: [commands run and outcome]
- Remaining risks: [anything that could break or needs follow-up]
```

Also update `tasks.md` in the root if the priority sequence has changed.

---

## STEP 7 — Stopping Condition

After completing the task and updating docs, evaluate whether to continue or stop.

**STOP and report if ALL remaining open tasks meet one or more of:**
- Status is `BLOCKED`
- Requires a human decision (auth provider, Supabase credentials, OAuth secrets)
- Is a high-risk final write requiring human approval (Finance real transactions, Life private data, Company strategy)
- Is a deployment, release, or environment-configuration task

**If stopping**, output a clear handoff report:

```
## PRODUCTION HANDOFF REPORT — [date]

All autonomous tasks are complete. The following require human action before launch:

### Environment Configuration Required
- [ ] Set DATABASE_URL to reachable Supabase instance (resolves WORK-007)
- [ ] Choose auth provider: Supabase Auth (magic link / Google) or NextAuth (OAuth)
- [ ] Set NEXTAUTH_SECRET or Supabase anon key
- [ ] Set OAuth client IDs and secrets if using Google / GitHub login

### Human Decisions Required
- [ ] AUTH-001: Select and configure the auth provider
- [ ] Review and approve DB migration before applying to Supabase
- [ ] Review CLIENT-001 client portal visibility rules before enabling

### Deployment
- [ ] `pnpm build` against live Supabase
- [ ] `pnpm db:migrate` on Supabase (after migration review)
- [ ] `pnpm db:seed` for initial data
- [ ] Deploy to Vercel / hosting provider

No further autonomous code changes are recommended before these human steps are complete.
```

Do NOT call ScheduleWakeup if stopping.

---

## STEP 8 — Loop Continuation

If NOT stopping (more autonomous tasks remain):

Call `ScheduleWakeup` with:
- `delaySeconds`: 60 (stay within prompt cache window; we have work to do immediately)
- `prompt`: `/goal`
- `reason`: "continuing autonomous loop — next task: [TASK-ID] [Title]"

This schedules the next iteration of the goal loop.

---

## Notes for the Autonomous Agent

- You are working on a personal productivity OS for a single user (ceo@meetnuva.com).
- The Work module is the only fully DB-backed module. Protect its CRUD behavior.
- All other modules are mock/UI-only until AUTH-001 and WORK-007 are resolved.
- When in doubt about scope, stop and document the ambiguity — don't guess.
- Prefer dense, operational UI patterns. No landing-page layouts. No card-heavy dashboards.
- Never commit changes; your job is to implement in the working tree for human review.
