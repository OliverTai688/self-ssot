# DATTR-024H Source Workflow Create-Only Draft

This directory is intentionally outside `prisma/migrations`.

It is a reviewable migration draft for `DATTR-024H-MIGRATION-DRAFT`, not an applied or deployable Prisma migration. Do not copy it into `prisma/migrations` or run it against a valuable database until:

- human review approves the schema and SQL;
- `DATTR-024I-PROOF-RUNNER` has a safe local/disposable proof target;
- migration apply approval is explicit;
- RLS/audit storage follow-up gates are accepted.

The Prisma schema has been updated so `pnpm db:validate` and `pnpm db:generate` can verify model shape, but the SQL file remains a no-apply draft artifact.
