# Next Thirty Loop Maturity Research

**Document ID:** `RES-001`
**Last updated:** 2026-06-21
**Status:** Active research target for the next 30 development loops
**Scope:** Frontstage, member settings, admin, backend/BFF, module operating surfaces, AI agent workspaces, agent operation APIs/CLI, multi-agent coordination, and NANDA registration readiness

---

## 1. Purpose

This document resets the next 30-loop goal from narrow launch-proof waiting into a broader maturity program.

The system already has important pieces: protected routes, Work DB-backed foundations, Settings/Admin readiness surfaces, Client Portal containment, AI Input formal readiness, internal AgentFacts-lite manifests, and launch proof tooling. The next 30 loops should now convert the remaining gaps into increasingly mature operating surfaces and architecture slices while still respecting the existing auth, DB, public-output, and high-risk stop rules.

Every three loops must include a research-to-task pass. That pass must inspect current code, docs, and any relevant primary external sources, then convert gaps into executable artifacts: formal docs, BFF/API contracts, schema proposals, acceptance criteria, verification scripts, or backlog rows. Research that does not produce an implementation-ready artifact is not complete.

## 2. Current Answer Snapshot

| Question | Current answer | Evidence |
|---|---|---|
| Have the modules been developed? | Partially. Work is the only operational DB-backed module. Research, AI Input, Workflow, Life, Finance, Chamber, Company, and Client Portal have varying UI, mock, readiness, or proposal states. | `AGENTS.md`, `ACC-001`, `PLN-061`, `tasks.md` |
| Has mock data become a demo account? | Partially. `prisma/seed.ts` creates an `admin@example.com` OWNER profile and Work demo rows. Runtime mock data still exists in Research, AI Input, Workflow, Life, and other prototype surfaces. | `prisma/seed.ts`, `src/lib/services/auth.service.ts` |
| Can the owner log in with a real account and start using it? | Not yet as a proven launch path. Supabase SSR login scaffolding exists, but current proof is blocked by missing Supabase public env and missing signed-in `/auth/status` evidence. A real Supabase email must map to a `Profile` row before Work access is valid. | `pnpm launch:proof`, `pnpm auth:proof`, `ACC-003`, `ACC-005` |
| Does each module have interface, AI agent workspace, and agent operation API/CLI settings? | No. Some module operating surfaces exist, and Work has Agent/Records stubs. There is no complete per-module agent workspace + API/CLI operation contract across all modules. | `FOPS-*` tasks, `src/app/(dashboard)/*`, `PLN-060` |
| Can every AI agent communicate and operate with other agents? | No. There are internal agent manifests and validation, but no runtime multi-agent bus, inbox, task delegation protocol, CLI, API, or autonomous execution layer. | `AGENT-005` through `AGENT-007`, `ARC-028` |
| Is the system ready for MIT NANDA registration at any time? | No. It is internally AgentFacts-lite ready, but external registration remains blocked. Missing: public runtime endpoints, auth/scopes, trust attestations, rollback, observability claims, registration approval workflow, and human approval. | `ARC-028`, `pnpm agent:registry:check`, NANDA sources below |

## 3. Source Basis

### Local sources

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/02_architecture-and-rules/ARC-018_work-module-contract.md`
- `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
- `docs/02_architecture-and-rules/ARC-027_ai-input-formal-readiness-bff.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md`
- `docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md`
- `docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- latest loop reports 44, 45, and 46

### External primary or near-primary sources

- [Project NANDA GitHub organization](https://github.com/projnanda)
- [Project NANDA core repository](https://github.com/projnanda/projnanda)
- [AgentFacts format repository](https://github.com/projnanda/agentfacts-format)
- [NANDA Adapter repository](https://github.com/projnanda/adapter)
- [NANDA Index and A2A FAQ](https://github.com/projnanda/projnanda/blob/main/faq_nanda_a2a.md)
- [Beyond DNS: Unlocking the Internet of AI Agents via the NANDA Index and Verified AgentFacts](https://arxiv.org/abs/2507.14263)
- [Using the NANDA Index Architecture in Practice: An Enterprise Perspective](https://arxiv.org/abs/2508.03101)

## 4. Maturity Target

The next 30 loops should aim for this target state:

```txt
Private Personal OS cockpit
  -> real owner auth and demo account boundary
  -> mature frontstage/member/admin surfaces
  -> module operating shells with operation, agent, records, settings
  -> Work proven DB-backed and refresh-safe
  -> AI Input persistence path ready or implemented in safe slices
  -> per-module agent workspace and operation API/CLI contracts
  -> internal multi-agent coordination proof
  -> NANDA registration-readiness proposal, adapter boundary, and approval workflow
```

The target is not public external-agent launch. External registration remains blocked until runtime endpoints, auth, scopes, trust, public safety, rollback, observability, and human approval exist.

### Conditional L3 Product Maturity Lane

`RES-005_conditional-l3-interface-scenario-architecture-gap-research.md` adds a separate product-maturity lane so post-30 loops can keep improving the full owner experience while formal launch proof is still owner/operator-gated.

This lane uses these rules:

- Formal `launchLevels.current` stays `L0_LOCAL_PROTOTYPE` until `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence exists.
- Conditional product maturity may progress through `C0_RESEARCH_READY`, `C1_INTERFACE_MATRIX_READY`, `C2_SCENARIO_ROUTES_READY`, `C3_ARCHITECTURE_GATE_READY`, and `C-L3_CONDITIONAL_FULL_EXPERIENCE`.
- Manual setup blockers remain Manual Ops rows and must not be converted into formal L1/L3/L4 claims.
- If `AUTH-005` and `WORK-009` proof prerequisites are absent, the next highest-leverage no-proof work should be selected from `L3-UI-001`, `L3-SCENARIO-001`, or `L3-ARCH-001` rather than another adjacent proof recheck.

The purpose is to keep the system moving toward a complete front/member/admin/module/agent operating experience while preserving launch honesty.

## 5. Three-Loop Research Cadence

Every three loops form one maturity triad:

| Loop in triad | Expected work |
|---|---|
| First loop | Implement or prove one concrete surface, API, BFF, CLI, schema, or verification slice. |
| Second loop | Extend the slice into a fuller actor journey or adjacent backend/agent contract. |
| Third loop | Run a research-to-task gap review, update or create a formal doc, and convert findings into executable backlog rows with acceptance and verification. |

If the third loop is also a fifth-loop launch review, combine the two reviews. The combined review must still produce a concrete task artifact, not only a summary.

## 6. Next 30-Loop Roadmap

| Maturity loops | Theme | Expected artifact by third loop |
|---|---|---|
| 1-3 | Auth, demo account, and real owner readiness | Exact owner login/demo account split, `AUTH-005` unblock criteria, Profile mapping proof checklist, and next executable auth task |
| 4-6 | Module operating surface maturity | Per-module interface inventory showing operation, agent, records, settings, mock/formal state, and missing BFF/API contracts |
| 7-9 | Work + Client Portal proof path | Work refresh proof or safe blocker proof, Client Portal token smoke plan, and public-output safety acceptance |
| 10-12 | Per-module AI agent workspace contracts | Agent workspace contract for Work, Research, AI Input, Workflow, Life, Finance, Chamber, and Company; high-risk write boundaries explicit |
| 13-15 | Agent operation API/CLI architecture | Protected owner-only agent operation API/CLI proposal with commands, scopes, audit events, and dry-run/approval modes |
| 16-18 | Internal multi-agent coordination | Internal agent message/task bus proposal or proof, including delegation, proposal review, audit, and failure handling |
| 19-21 | AI Input persistence and source workflow | DATTR-024 split into migration-safe BFF slices, SourceAsset/AIWorkflowRun/AIWorkItem contract proof, and verification plan |
| 22-24 | Admin/operator backend and audit | Admin read/write boundaries, audit event schema proposal or proof, readiness history, and operator action safeguards |
| 25-27 | NANDA adapter and registration approval | NANDA adapter boundary, AgentFacts completeness gap list, endpoint/auth/scope requirements, and human approval workflow |
| 28-30 | Hardening and maturity review | Whole-system maturity review across frontstage, member, admin, backend, AI, module agents, NANDA, verification, and launch gates |

## 7. Gap Backlog Seeds

These are not all ready to implement. Each must be selected, narrowed, and verified through the closed-loop process.

| Seed | Gap | First useful artifact |
|---|---|---|
| `AUTH-MATURITY-001` | Real account is not proven usable. | Owner login/Profile mapping proof and safe demo account policy. |
| `MODULE-MATURITY-001` | Not every module has operation/agent/records/settings boundaries. | Module surface inventory and target IA contract. |
| `AGENT-API-001` | Agents do not have owner-controlled operation API/CLI. | Protected dry-run command contract and audit model. |
| `AGENT-RUNTIME-001` | Agents cannot delegate or communicate at runtime. | Internal message bus / proposal queue contract. |
| `NANDA-READY-001` | Internal manifests exist, but external registration is blocked. | Registration readiness checklist and adapter boundary. |
| `ADMIN-AUDIT-001` | Admin is read-only readiness; persisted audit is not implemented. | Append-only audit schema proposal and BFF contract. |
| `AIINPUT-PERSIST-001` | AI Input formal mode is readiness-only. | DATTR-024 implementation split and migration review checklist. |
| `CLIENT-SHARE-001` | Client Portal token lifecycle is proposal-only. | Rotate/revoke action boundary and safe DB proof plan. |
| `FRONTSTAGE-MEMBER-001` | Public/member experience is safe but not mature. | Frontstage-to-member journey map and BFF loading/error states. |
| `BACKEND-OPS-001` | Backend APIs are not consistently exposed as operator contracts. | BFF/API catalog with authz, DTO, audit, and verification per module. |
| `L3-CONDITIONAL-001` | Formal launch blockers are Manual Ops, but conditional L3 product maturity lacks one shared interface/scenario/architecture viewframe. | `RES-005` plus executable `L3-UI-001`, `L3-SCENARIO-001`, and `L3-ARCH-001` tasks. |

## 8. Module Maturity Matrix

| Module | Interface | DB-backed | Agent workspace | Agent operation API/CLI | Runtime agent actions | Status |
|---|---|---|---|---|---|---|
| Work | Mature list/detail; FOPS tabs | Yes, pending final proof | Stub/proposal surface | No | No | Highest maturity, proof blocked |
| Research | Multi-page UI | Mock/state | Not complete | No | No | UI mature, persistence gap |
| AI Input | UI + formal readiness | No formal persistence | AI workbench UI | No | No | Readiness bridge complete, DATTR-024 next |
| Workflow | UI mock and engine concepts | Partial/proposal | Agent registry panel | No | No | Needs persistence and runtime boundary |
| Life | Partial/FOPS shell | No | Stub | No | No | High-risk privacy module |
| Finance | FOPS shell / stub | No | Stub | No | No | High-risk, human approval required |
| Chamber | FOPS shell / stub | No | Stub | No | No | CRM proposal only |
| Company | FOPS shell / stub | No | Stub | No | No | High-risk strategy module |
| Client Portal | Public fail-closed + gated BFF | DB path gated | n/a | No | No | Safe containment, smoke blocked |
| Agent Team OS | Protected readiness surface | Generated manifests only | Governance surface | No | No | Internal-ready, external-blocked |

## 9. NANDA Readiness Interpretation

Current state:

- Internal AgentFacts-lite inventory exists.
- Local validation exists through `pnpm agent:registry:check`.
- Protected admin/settings readiness surface exists.
- External registration is intentionally disabled.

Missing before external registration:

- Runtime HTTPS endpoint or adapter endpoint for each externally visible agent.
- Auth methods and required scopes.
- Capability-specific approval policies and data visibility rules.
- Auditable operation history and rollback.
- Trust attestations that are real, not invented.
- Telemetry claims backed by measurement.
- Public-safety and private-data leakage review.
- Human approval for every external registration target.

The next NANDA work should therefore be `NANDA-READY-001`: a proposal and readiness checklist, not live registration.

## 10. Acceptance For This Research Track

This research track is successful when:

- Every third loop produces a formal research/update artifact and at least one executable task row or acceptance criterion.
- Each module has an explicit interface, agent workspace, records/audit, settings/boundary, and API/BFF target state.
- Every AI agent surface has manifest, runtime status, allowed operations, auth/scope expectations, approval level, observability, and registry status.
- Demo account and real account behavior are separated and verified.
- The system can explain exactly what is demo, what is mock, what is formal but blocked, and what is production-safe.
- External agent registration remains blocked until all NANDA readiness conditions are satisfied and approved by the human owner.

## 11. Rejected Alternatives

- Claiming NANDA readiness because internal AgentFacts-lite manifests exist. Rejected because runtime endpoint, auth, scopes, trust, observability, rollback, and approval are missing.
- Starting broad UI expansion without per-module BFF/API and agent operation boundaries. Rejected because it would create more surfaces without operational maturity.
- Turning all mock data into production data silently. Rejected because demo seed data and runtime mock data have different safety meanings.
- Allowing agents to write high-risk modules directly. Rejected because Finance, Life, Company Strategy, Client Portal, auth/permission, public output, and external collaboration require human approval.
