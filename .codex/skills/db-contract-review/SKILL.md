# db-contract-review

## Description

Review Prisma schema, migration strategy, seed flow, enum consistency, database ownership, and data-contract risks.

## When To Use

- Any schema, migration, seed, enum, or persistence task.
- Before Phase 0 DB Contract Stabilization work.
- Before DB-backed module implementation.

## Inputs

- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/seed.ts`
- `supabase/migrations/*`
- `src/lib/db.ts`
- DB-related task files

## Process

1. Compare Prisma schema and SQL migrations.
2. Check enum casing and mapper consistency.
3. Check UUID extension assumptions.
4. Review seed stability from empty DB.
5. Identify auth/RLS/app-layer authorization assumptions.
6. Document migration impact before code changes.

## Constraints

- Do not apply destructive DB changes without explicit approval.
- Do not assume Supabase RLS protects Prisma direct-connection queries.
- Keep Prisma models separate from UI view models.

## Verification Checklist

- Schema/migration drift documented.
- Seed flow reviewed.
- Enum consistency checked.
- Authorization implications noted.
- Verification command proposed.

## Expected Output

- `docs/dev/database_contract.md` update.
- Migration risk checklist.
- Small, scoped DB change proposal when needed.
