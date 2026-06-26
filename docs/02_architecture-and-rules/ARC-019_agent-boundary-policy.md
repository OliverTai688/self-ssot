# Agent Boundary Policy

## Permission Levels

| Level | Meaning |
|---|---|
| `AUTO_READ` | Agent may read scoped project/repo context needed for the task. |
| `AUTO_PROPOSE` | Agent may draft summaries, task proposals, code plans, or non-final outputs. |
| `HUMAN_APPROVAL_REQUIRED` | Agent must ask before final write, public exposure, schema migration, or high-risk action. |
| `BLOCKED` | Agent must not perform the action. |

## Risk Levels

| Level | Meaning |
|---|---|
| `LOW` | Local docs, low-risk UI copy, non-sensitive refactors. |
| `MEDIUM` | App logic, module data flow, visible UI behavior. |
| `HIGH` | Auth, permissions, client-visible data, finance/life/company data. |
| `CRITICAL` | Public exposure, external agent sharing, destructive DB changes, irreversible financial decisions. |

## High-Risk Modules And Surfaces

- Finance
- Life
- Client Portal
- Company Strategy
- Auth / Permission
- Public output
- External agent collaboration

## Policy Examples

- UIUXAgent can propose and implement small UI changes when scoped to a specific component.
- UIUXAgent must ask before a full redesign, navigation restructure, or client-facing flow rewrite.
- DBAgent can propose schema changes but must document migration impact and enum/data compatibility.
- WorkAgent can implement Work CRUD only through approved server actions, services, and mappers.
- AuthPermissionAgent must review client portal and cross-user access changes.
- IngestionAgent can create triage proposals but cannot directly write Finance, Client Portal, or public data without approval.
- ClientPortalAgent must treat all internal notes as private by default.
- External agents cannot access the database directly.
- External agents receive scoped context packages only.
- All external collaboration outputs are proposals, not final writes.
- AGENTS.md and SKILL.md import/export actions must be explicit and auditable.

## Default Stance

When in doubt, downgrade agent capability to `AUTO_PROPOSE` or `HUMAN_APPROVAL_REQUIRED`.
