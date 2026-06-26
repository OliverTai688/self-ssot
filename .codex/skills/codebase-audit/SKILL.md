# codebase-audit

## Description

Audit the current codebase and summarize product, architecture, data, implementation status, and risks.

## When To Use

- Before planning a new sprint.
- When a task starts from unclear current state.
- When product docs and code may have drifted.

## Inputs

- `AGENTS.md`
- `docs/INDEX.md`
- `docs/product/P-INDEX-001-prd-index.md`
- `docs/product/P-TARGET-001-operating-version.md`
- `docs/dev/D-EVAL-004-personal-use-readiness.md`
- Relevant `docs/architecture/A-ARCH-*.md`
- `src/app`, `src/components`, `src/lib`, `src/types`, `prisma/schema.prisma`

## Process

1. Read project rules and relevant PRD docs.
2. Inventory routes, modules, providers, services, actions, mocks, and schema models.
3. Identify DB-backed vs mock/localStorage/state-based modules.
4. Identify blockers to v0.1.
5. Write or update a concise audit summary.

## Constraints

- Do not modify product code during audit unless explicitly requested.
- Do not treat mock data as production state.
- Do not propose schema changes without migration impact notes.

## Verification Checklist

- Routes inspected.
- Prisma models listed.
- Services/actions/providers inspected.
- Runtime data source status identified.
- Risks and next target documented.

## Expected Output

- `docs/dev/D-INV-001-codebase-inventory.md` update.
- `docs/dev/D-EVAL-004-personal-use-readiness.md` update if module status has changed.
- Recommended next closed-loop development target.
