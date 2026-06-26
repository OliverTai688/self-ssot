# prd-to-task-planning

## Description

Read PRD and product documents and convert them into phases, backlog tasks, acceptance criteria, and module milestones.

## When To Use

- When product direction changes.
- When a PRD needs implementation tasks.
- When backlog and sprint files need refresh.

## Inputs

- `docs/product/P-PRD-001-personal-os-technical-prd.md`
- `docs/product/P-PRD-002-next-stage-development-plan.md`
- `docs/product/P-PRD-003-situation-driven-prd.md`
- Relevant architecture docs
- Existing `docs/tasks/*`

## Process

1. Identify the product intent and operational version target.
2. Extract modules, user flows, data requirements, and risks.
3. Convert work into phase-based tasks.
4. Add owner agent, risk level, dependencies, likely files, acceptance criteria, and verification commands.
5. Update sprint focus without over-expanding scope.

## Constraints

- Keep v0.1 focused on operational closure, not dream scope.
- Do not add runtime agent marketplace tasks to early sprints.
- Keep task changes reviewable.

## Verification Checklist

- Each task has id, status, priority, risk, owner, dependencies, affected files, acceptance criteria, verification.
- Phase plan maps to PRDs.
- Sprint current has one clear focus.

## Expected Output

- Updated `docs/tasks/task_backlog.md`.
- Updated `docs/tasks/phase_plan.md`.
- Updated `docs/tasks/sprint_current.md`.
