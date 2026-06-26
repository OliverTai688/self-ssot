# Docs Usage Manual

**Document ID:** `MAN-000`
**Last updated:** 2026-06-20
**Purpose:** Define the Personal OS documentation architecture, numbering rules, and agent loop file placement.

---

## 1. Core Rule

Formal docs use this format:

```txt
docs/<numbered-folder>/<TYPE>-<NNN>_<kebab-case-title>.<ext>
```

Examples:

- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`

Use `_` between the document number and the English kebab-case title. Use `-` inside the title.

## 2. Folder Map

| Folder | Purpose |
|---|---|
| `00_manual-and-index` | Manuals, operating guides, document indexes |
| `01_product-requirements` | Product requirements, product vision, current PRDs |
| `02_architecture-and-rules` | Architecture, system contracts, auth rules, DB contracts, schema proposals, migration decisions |
| `03_feature-reference` | Stable feature references and reusable source material |
| `04_playbook` | User-facing playbooks, operating scripts, reusable front-stage guidance |
| `05_execution-plans` | Plans, sprint files, task backlog, implementation proposals |
| `06_audits-and-reports` | Evaluations, audits, inventories, completed logs, readiness reports |
| `07_research-and-design` | Research notes, design exploration, external comparison notes |
| `08_acceptance-and-qa` | Acceptance criteria, QA checklists, release gates |
| `2_agent-input` | Agent-generated reports, temporary context, raw datasets, non-formal working material |

`docs/2_agent-input` is intentionally not part of the formal document library. It can contain generated reports, raw files, evidence packets, and temporary research material without receiving a formal document number.

## 3. Type Codes

Use the document property first, not the product module.

| Type | Meaning | Usual folder |
|---|---|---|
| `ACC` | Acceptance criteria, QA checklist, acceptance gate | `08_acceptance-and-qa` |
| `ARC` | Architecture, operating model, system rule | `02_architecture-and-rules` |
| `AST` | Asset reference or generated artifact | `03_feature-reference` or `2_agent-input/assets` |
| `AUD` | Audit | `06_audits-and-reports` |
| `AUT` | Auth, identity, permission, privacy rule | `02_architecture-and-rules` |
| `BIZ` | Business rules | `02_architecture-and-rules` |
| `BUG` | Bug report or issue analysis | `06_audits-and-reports` |
| `DBS` | Database contract or DB design decision | `02_architecture-and-rules` |
| `ENV` | Environment, deployment, runtime configuration | `02_architecture-and-rules` |
| `EXE` | Execution proposal or implementation contract | `05_execution-plans` |
| `MAN` | Manual, guide, index | `00_manual-and-index` |
| `MIG` | Migration plan or migration decision | `02_architecture-and-rules` |
| `PBK` | Playbook | `04_playbook` |
| `PLN` | Plan, backlog, sprint, roadmap | `05_execution-plans` |
| `PRD` | Product requirement or product vision | `01_product-requirements` |
| `REC` | Recovery report | `06_audits-and-reports` |
| `REF` | Feature reference or reusable domain reference | `03_feature-reference` |
| `RES` | Research | `07_research-and-design` |
| `RLS` | Release note or launch report | `06_audits-and-reports` |
| `RPT` | Report, evaluation, inventory, completed log | `06_audits-and-reports` |
| `SCH` | Schema proposal | `02_architecture-and-rules` |

## 4. New Doc Workflow

1. Decide the document property: PRD, architecture, plan, report, acceptance, reference, and so on.
2. Choose the folder from the folder map.
3. Find the highest existing number for the selected type.
4. Create the next number using three digits.
5. Use an English kebab-case title after `_`.
6. Add the doc to `MAN-001_document-index.md` if it is a formal doc.
7. If the doc changes behavior or acceptance, update the relevant task and completed log.

Do not create new prefix families such as `P-PRD`, `A-ARCH`, `D-PLAN`, `T-*`, or `AG-*`. Those were migrated on 2026-06-20 into this numbering system.

## 5. Agent Loop Files

Formal loop state lives in:

- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`

Generated loop evidence lives in:

- `docs/2_agent-input/generated/agent-loop/reports/`

Agent reports should follow:

- `docs/2_agent-input/generated/agent-loop/report-template.md`

## 6. Migration Note

On 2026-06-20, the docs library was migrated from the older prefix/folder families:

- `docs/product/P-*`
- `docs/architecture/A-ARCH-*`
- `docs/dev/D-*`
- `docs/agents/AG-*`
- `docs/tasks/T-*`
- `docs/reference/R-*`

The canonical paths are now the numbered folders listed in `MAN-001_document-index.md`. Historical text inside older docs may still mention old paths for audit context; update those references when touching the relevant doc.
