# closed-loop-sprint

## Description

Select the next task from the backlog, implement it, verify it, update task status, and record remaining risks.

## When To Use

- Running a normal development cycle.
- Continuing work after a planning pass.
- Turning the repo into a self-improving AI-assisted system.

## Inputs

- `AGENTS.md`
- `docs/tasks/T-002-sprint-current.md`
- `docs/tasks/T-001-backlog.md`
- Relevant PRD and architecture docs (`docs/product/P-PRD-002-next-stage-development-plan.md` primary)
- Related code files

## Process

1. Read project rules.
2. Read current sprint and backlog.
3. Select one task with high leverage and bounded scope.
4. Inspect related code.
5. Make a short plan.
6. Implement a minimal change.
7. Run verification.
8. Update task status in `docs/tasks/T-001-backlog.md` and `docs/tasks/T-002-sprint-current.md`.
9. Append to `docs/tasks/T-005-completed-log.md`.
10. Record risks and propose next task.

## Constraints

- One task at a time.
- Stop if schema, auth, public output, or external collaboration risk is ambiguous.
- Do not expand scope to a full module rewrite.

## Verification Checklist

- Task status updated.
- Verification command recorded.
- Completed log updated when work is done.
- Remaining risks documented.

## Expected Output

- Small implementation.
- Updated task files.
- Clear next task recommendation.
