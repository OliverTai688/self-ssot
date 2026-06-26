# Module Map

| Module | Routes | Components / libs | Data source now | v0.1 target |
|---|---|---|---|---|
| Dashboard | `/dashboard` | `MorningBriefCard` | Mock AI cards | Mock fallback acceptable |
| AI Input | `/ai-input` | `IngestionProvider`, AI/resource components | Mock/context | Source asset / document / media / link intake preview |
| Inbox | `/inbox` | ingestion cards/proposals | Mock/context | Source asset triage, attribute badges, proposal review |
| Work | `/work`, `/work/[projectId]` | Work components, project services/actions | DB reads + local writes | Full DB CRUD |
| Client Portal | `/client/[token]` | public client page | Mock work data | DB read with visibility filters |
| Research | `/research/*` | Research provider/components | localStorage/mock | DB alignment planned |
| Workflow | `/workflow` | workflow engine/components | mock rules/messages | Persistence planned |
| Life | `/life` | `FitnessDashboard`, LifeProvider | mock/context | Placeholder for later DB model |
| Finance | `/finance` | placeholder | none | Placeholder |
| Chamber | `/chamber` | placeholder | none | Placeholder |
| Company | `/company` | placeholder | none | Placeholder |
| Agent Team OS | future `/agents/*` | docs/skills first | repo docs | Governance only |
| Source Asset Layer | future shared layer, likely surfaced in `/ai-input` and `/inbox` first | ingestion types, data operations docs, future registry services | docs/mock only | Registry contract for Google Docs, Markdown, HTML, images, video, audio, links, LINE/Telegram messages, datasets, snapshots, extraction, and write intents |

## Frontend Operating Surface Direction

Each major module should eventually expose clear frontend boundaries:

```txt
/{module}
  -> attention / overview / primary operation surface
/{module}/agent
  -> module Agent workspace and proposal queue
/{module}/records
  -> audit trail, workflow runs, decisions, approvals, visibility changes
/{module}/settings or /{module}/boundaries
  -> permissions, privacy, sync, risk, and visibility rules
```

This is documented in `docs/architecture/frontend_operating_surface.md`.

Design priority:

- one clear first-viewport attention area
- structured operation over card-heavy information arrangement
- module-specific tables, queues, timelines, editors, graphs, or boards
- records/audit as filterable tables and drilldowns
- Agent workspaces as bounded review/proposal surfaces

## Current Providers

- `ModulePermissionsProvider`
- `ResearchProvider`
- `WorkflowProvider`
- `IngestionProvider`
- `AiPanelProvider`
- `LifeProvider`

## Primary v0.1 Code Path

`/work` -> server action -> project service -> Prisma -> mapper -> UI view model.
