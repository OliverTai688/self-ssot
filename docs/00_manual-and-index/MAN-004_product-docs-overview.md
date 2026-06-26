# PRD Index

`P-PRD-002-next-stage-development-plan.md` is a primary PRD-level planning document and should be treated with the same priority as the original technical PRD.

| Document | Inferred purpose | Related module | Current implementation status | Open questions | Linked tasks |
|---|---|---|---|---|---|
| `P-VISION-001-situation.md` | Original user situation and product need: structure work, school/research, and life. | All | Vision reflected across modules. | How much Life/Finance/Chamber belongs in v0.1? | `DOC-001`, `AGENT-001` |
| `P-PRD-001-personal-os-technical-prd.md` | Original technical PRD with modules, Supabase-oriented schema, auth, routes, API plan. | All | Partially implemented, but stack has evolved to Next 16 + Prisma 7. | Supabase RLS vs Prisma app-layer auth needs explicit decision. | `DB-001`, `AUTH-001` |
| `P-PRD-002-next-stage-development-plan.md` | Current next-stage plan; adds DB contract, Work CRUD, Agent Team OS, phase roadmap. | All, Agent Team OS | Active planning source. | Which Agent Team OS models should enter Prisma first? | `AGENT-001`, `DB-001`, `WORK-001` |
| `P-PRD-003-situation-driven-prd.md` | Rich product philosophy and module-by-module user scenarios. | Work, Chamber, Company, Finance, Research, Life | Product direction reflected, but many modules still prototype/placeholder. | Which scenario is required for v0.1 operational use? | `DOC-001`, `RESEARCH-001` |
| `../architecture/A-ARCH-001-data-flow-and-storage.md` | Data source, capture, storage, and module I/O design. | Ingestion, all modules | Partially reflected in mock ingestion and context providers. | R2/Storage strategy not implemented. | `INGEST-001`, `DB-002` |
| `../architecture/A-ARCH-002-ai-agent-team-external-context.md` | External reference context and GPT/agent role framing. | Agent Team OS | Folded into internal agent roles. | Runtime vs governance agent boundary. | `AGENT-001` |
| `../architecture/A-ARCH-003-sync-structure-plan.md` | LINE / Google Doc sync selection and structure. | Ingestion | Mock UI exists. | Real connector scope and persistence model. | `INGEST-001` |
| `../architecture/A-ARCH-004-pipeline-audit-redesign.md` | Four-stage ingestion pipeline audit and redesign. | Ingestion, Workflow | Mock pipeline exists. | DB model for raw item, normalized content, evidence, proposal. | `INGEST-001` |
| `../architecture/A-ARCH-005-agent-workflow-prd.md` | Workflow and NANDA-inspired agent routing PRD. | Workflow, Agent Team OS | Workflow UI exists with mock data. | Reuse or extend `AgentMessage` for Agent Team OS. | `AGENT-002`, `INGEST-002` |
| `../architecture/A-ARCH-006-research-ia-refactor-plan.md` | Research object network refactor plan. | Research | UI moved toward network model; DB still thread-centered. | Canonical Research DB model. | `RESEARCH-001` |
| `../dev/D-PLAN-001-phase1-frontend-plan.md` | Original phase 1 frontend implementation plan. | App shell, all modules | Mostly superseded by current implementation. | Keep as historical reference. | None |
| `../dev/D-PLAN-002-phase1-ai-native-plan.md` | AI-native experience direction. | AI, Ingestion, Work, Research | Reflected in AI panel and mock flows. | AI service adapter boundary. | `AI-001` |
| `../dev/D-PLAN-003-work-module-plan.md` | Detailed Work module implementation plan. | Work | Many UI pieces implemented; persistence incomplete. | Which local-state interactions still need DB actions? | `WORK-001` |
| `../dev/D-PLAN-004-ai-workspace-dev-plan.md` | AI workspace phase plan. | AI Input | Partially implemented with mock actions. | Persisting AI workspace data. | `INGEST-001` |
| `../dev/D-PLAN-005-next-phase-legacy-plan.md` | Older next-phase plan before current DB status was known. | All | Superseded by `P-PRD-002`. | Keep as history only. | None |
| `../dev/D-PLAN-006-research-workspace-dev-plan.md` | Research workspace design plan. | Research | UI mostly exists. | DB alignment. | `RESEARCH-001` |
| `../dev/D-PLAN-007-link-resource-plan.md` | Link resource module enhancement. | AI Input / Resources | Some link/resource UI exists. | Persistence and ownership. | `INGEST-003` |
| `../dev/D-PLAN-008-notes-timeline-pulse-plan.md` | Notes timeline and pulse plan. | Work | UI exists, DB write path incomplete. | Pin/timeline persistence. | `WORK-004` |
| `../dev/D-PLAN-009-ai-input-development-plan.md` | AI Input development plan. | AI Input | Mock ingestion exists. | Persistence and approval flow. | `INGEST-001` |
| `../dev/D-PLAN-010-interface-data-governance-plan.md` | Cross-cutting interface/data/governance data operations plan for multi-source I/O, module I/O, AI conversation data, lineage, approvals, and operation habit analytics. | Data Operations, Ingestion, Workflow, Agent Team OS, all modules | Planning document completed; no runtime or DB schema change yet. | Which persistence models should be introduced after DB-006, and how should AI conversation retention/privacy be approved? | `DATA-001`, `DATA-002`, `DATA-003`, `DATA-004`, `DATA-005` |
