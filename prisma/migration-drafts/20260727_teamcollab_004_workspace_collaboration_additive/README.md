# TEAMCOLLAB-004 Workspace Collaboration Migration Draft

This directory is a review-only, nondeployable migration draft. It is intentionally outside `prisma/migrations`, so `prisma migrate deploy` cannot discover or apply it.

The SQL is additive and is rehearsed only by the TEAMCOLLAB self-created local disposable PostgreSQL proof. It creates workspace, membership, invitation, project-grant, feedback/version, and AI-memory-candidate storage; adds nullable auth/workspace transition columns; and backfills one personal workspace plus owner membership per existing profile.

It does not:

- connect to or apply against Supabase, production, staging, or any pre-existing database;
- enable RLS or claim JWT-aware database isolation;
- send email, accept invitations, transfer projects, expose public output, or promote feedback into AI memory;
- include unrelated pending `ProjectPhaseNode`/`ProjectMilestone` schema changes.

Static review:

```bash
pnpm teamcollab:migration-draft:check
```

Disposable proof is dry-run-first and owns its temporary data directory. See `pnpm teamcollab:proof:local -- --help` after the proof runner is added.
