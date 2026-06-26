# Task Routing

Use this file to route development tasks to the right governance agent and skill.

| Task prefix | Default owner agent | Supporting agents | Recommended skills |
|---|---|---|---|
| `DB-*` | DBAgent | AuthPermissionAgent, QAAgent | `db-contract-review`, `closed-loop-sprint` |
| `AGENT-*` | ProductManagerAgent | WorkflowAgent, AuthPermissionAgent | `prd-to-task-planning`, `codebase-audit` |
| `WORK-*` | WorkAgent | DBAgent, UIUXAgent, AuthPermissionAgent | `work-crud-implementation`, `auth-permission-review` |
| `AUTH-*` | AuthPermissionAgent | DBAgent, ClientPortalAgent | `auth-permission-review`, `db-contract-review` |
| `CLIENT-*` | ClientPortalAgent | AuthPermissionAgent, UIUXAgent | `auth-permission-review`, `uiux-iteration` |
| `RESEARCH-*` | ResearchAgent | DBAgent, ProductManagerAgent | `prd-to-task-planning`, `db-contract-review` |
| `INGEST-*` | IngestionAgent | WorkflowAgent, WorkAgent, ResearchAgent | `codebase-audit`, `closed-loop-sprint` |
| `AI-*` | WorkflowAgent | ProductManagerAgent, ResearchAgent | `prd-to-task-planning`, `closed-loop-sprint` |
| `FOPS-*` | UIUXAgent | ProductManagerAgent, Module owner agent, AuthPermissionAgent | `uiux-iteration`, `prd-to-task-planning` |
| `UIUX-*` | UIUXAgent | QAAgent | `uiux-iteration` |
| `DOC-*` | ProductManagerAgent | QAAgent | `prd-to-task-planning`, `codebase-audit` |

## Routing Rule

Pick one primary owner per task. Supporting agents review the boundaries but should not expand the task scope.
