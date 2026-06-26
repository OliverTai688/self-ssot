# Skill Registry

This registry lists the initial reusable Codex skills for the Personal OS development loop.

| Skill | Path | Use when |
|---|---|---|
| codebase-audit | `.codex/skills/codebase-audit/SKILL.md` | A cycle needs current architecture, module, data, or risk inventory. |
| prd-to-task-planning | `.codex/skills/prd-to-task-planning/SKILL.md` | PRD/product documents need conversion into phases, tasks, acceptance criteria, or milestones. |
| db-contract-review | `.codex/skills/db-contract-review/SKILL.md` | Prisma schema, migrations, seed, enums, or DB ownership are involved. |
| work-crud-implementation | `.codex/skills/work-crud-implementation/SKILL.md` | Implementing DB-backed Work project/task/note/deliverable CRUD. |
| uiux-iteration | `.codex/skills/uiux-iteration/SKILL.md` | Making small UIUX improvements or reviewing visual hierarchy and interaction clarity. |
| auth-permission-review | `.codex/skills/auth-permission-review/SKILL.md` | Reviewing route guards, module permissions, client-visible filters, or service-layer authorization. |
| closed-loop-sprint | `.codex/skills/closed-loop-sprint/SKILL.md` | Selecting one backlog task, implementing, verifying, and updating task memory. |

## Skill Rules

- Skills are development aids, not runtime agents.
- Skill changes must be reviewable.
- Skill usage should update task files when it changes project state.
- Do not create hidden sync between skill files and database records.
