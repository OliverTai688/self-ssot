# work-crud-implementation

## Description

Implement Work module DB-backed CRUD through server actions, services, mappers, and UI integration.

## When To Use

- Work project/task/note/deliverable persistence tasks.
- Phase 1 Work Module DB-backed CRUD.

## Inputs

- `src/app/(dashboard)/work/*`
- `src/components/work/*`
- `src/app/actions/work.ts`
- `src/lib/actions/work.ts`
- `src/lib/services/project.service.ts`
- `src/lib/mappers/work.mapper.ts`
- `src/types/work.ts`

## Process

1. Read the current Work task from `docs/tasks/task_backlog.md`.
2. Inspect the relevant UI component and server action.
3. Ensure authorization goes through `requireUser()` and project access checks.
4. Keep DB model conversion inside services/mappers/actions.
5. Implement one CRUD behavior at a time.
6. Verify persistence after refresh when possible.
7. Update task files.

## Constraints

- Do not bypass service-layer authorization.
- Do not expose internal data to Client Portal.
- Do not turn mock runtime data into hidden production state.
- Prefer small UI changes around existing components.

## Verification Checklist

- Server action validates input.
- Ownership/access check exists.
- UI calls the action and handles failures.
- Revalidation or refresh behavior is handled.
- Data persists after reload.

## Expected Output

- Small Work CRUD patch.
- Updated task status and completed log.
