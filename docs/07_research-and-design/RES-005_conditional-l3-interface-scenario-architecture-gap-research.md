# Conditional L3 Interface Scenario Architecture Gap Research

**Document ID:** `RES-005`
**Date:** 2026-06-23
**Status:** Active research-to-task bridge
**Scope:** Conditional L3 product maturity, interface viewframe, scenario viewframe, architecture viewframe, Manual Ops launch boundary

---

## 1. Purpose

This document answers the owner direction: continue moving toward L3 even when formal launch proof is still blocked, but keep missing evidence as Manual Ops instead of pretending the launch level has upgraded.

The working distinction is:

- Formal launch level remains `L0_LOCAL_PROTOTYPE` until `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence exists.
- Conditional product maturity may keep advancing toward `C-L3_CONDITIONAL_FULL_EXPERIENCE` when the interface layer, scenario layer, and architecture layer are complete enough for owner operation review.
- Manual setup blockers become owner/operator Manual Ops rows, not reasons to stop interface, scenario, and architecture maturity work.

This is not a new permission to skip launch proof. It is a way to keep loop development productive while the missing proof depends on local environment, signed-in auth evidence, Docker/local PostgreSQL, or deployment setup.

## 2. Local Source Review

Reviewed local sources:

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-003_interface-completion-operating-surface-research.md`
- `docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/08_acceptance-and-qa/ACC-007_manual-ops-conditional-launch-gate.md`
- Recent evidence: `MANUAL-OPS-001`, loop 101 `AUDIT-OPS-003`, loop 102 `AUDIT-OPS-004`

Current local synthesis:

- Interface layer is broadly complete for owner review through `INTERFACE-001` and `INTERFACE-002`.
- Scenario layer exists through `SCENARIO-001` and `SCENARIO-002`, but the scenario route map is not yet treated as the controlling index for L3 completeness.
- Architecture layer has backend operation, real-data, agent operation, audit, and Manual Ops contracts, but there is no single conditional L3 claim model tying them together.
- Formal launch level correctly remains blocked because owner/operator evidence is missing.

## 3. External Reference Review

External sources reviewed for the three-layer viewframe:

- [GOV.UK Service Manual - Understand users and their needs](https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs): use research and prototypes to understand the whole user context before committing to a service shape.
- [GOV.UK - How government defines a service](https://services.blog.gov.uk/2024/09/25/how-government-defines-a-service/): a service should cover the end-to-end journey and the supporting organizational work behind it.
- [GOV.UK Design System](https://design-system.service.gov.uk/): mature services reuse accessible components for forms, navigation, panels, tables, and predictable interaction.
- [GitLab Handbook - Jobs To Be Done](https://handbook.gitlab.com/handbook/product/ux/jobs-to-be-done/): product requirements should be framed from user jobs with clear end states, not only feature lists.
- [OpenAPI Initiative - What is OpenAPI?](https://www.openapis.org/what-is-openapi): API-first contracts help align requirements, design, development, and testing across the API lifecycle.
- [Atlassian Team Health Monitor](https://www.atlassian.com/team-playbook/health-monitor): recurring health checks help identify functionality and productivity issues before they become invisible blockers.

Integrated interpretation for Personal OS:

- Interface completeness should be evaluated by whether the owner can operate each surface in the first viewport and reach the next useful action.
- Scenario completeness should be evaluated by whether end-to-end owner jobs can move across modules, agents, admin, settings, and evidence without losing context.
- Architecture completeness should be evaluated by whether every visible action has a known BFF/API/CLI/auth/audit/manual-ops boundary, even when runtime persistence is intentionally blocked.

## 4. Understanding Score

This is a cross-page and cross-architecture research task, so it uses the page requirement understanding score gate as a quality bar before creating implementation tasks.

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 18/20 | Owner/operator, member/settings, admin, module operator, and agent collaborator jobs are already named in PRD and acceptance docs. |
| PRD/local evidence fit | 19/20 | `RES-001`, `RES-002`, `RES-003`, `SCENARIO-001/002`, `INTERFACE-001/002`, and Manual Ops evidence align strongly. |
| Data/BFF/API clarity | 17/20 | Backend, real-data, agent, audit, and Manual Ops contracts exist, but they are not yet unified under a conditional L3 gate. |
| UI interaction/reference confidence | 13/15 | Interface shell and smoke harness exist; remaining gap is map/checker visibility, not basic UI pattern discovery. |
| Risk/auth/public-output clarity | 14/15 | Formal launch proof and high-risk boundaries are explicit; conditional product maturity wording needs to prevent false launch claims. |
| Acceptance/verification clarity | 9/10 | Existing checkers cover many parts; the next task should add a conditional L3 matrix/checker. |
| **Total** | **90/100** | High understanding. Three research optimization rounds are enough before implementation tasks. |

## 5. Research Optimization Rounds

### Round 1 - Local PRD, Code, And Evidence Fit

Selected pattern: preserve the existing surface work and define a conditional L3 overlay instead of reworking module pages.

Rejected alternatives:

- Rebuild all pages before owner review.
- Treat `INTERFACE-002` as formal L3 proof.
- Keep repeating launch proof checks while owner-run setup is absent.

Resulting requirement update: conditional L3 must be a viewframe matrix over existing pages, not a visual redesign.

### Round 2 - Comparable Service And Product Pattern

Selected pattern: use job and journey framing from service-design/JTBD references, combined with componentized operating surfaces from existing `RES-002`.

Rejected alternatives:

- Measure completeness by number of pages only.
- Use a marketing-site journey model for protected operational work.
- Hide architecture/manual setup state behind vague "blocked" labels.

Resulting requirement update: every scenario must name trigger, actor, entry surface, data source, action, agent proposal, output, audit/proof, and next task.

### Round 3 - Architecture, Risk, And Manual Ops Boundary

Selected pattern: split formal launch level from conditional product maturity and require architecture rows for BFF/API, auth, persistence stage, audit, agent operation, and Manual Ops status.

Rejected alternatives:

- Upgrade formal `launchLevels.current` without owner evidence.
- Let Manual Ops bypass auth, Work, or deployment evidence.
- Add runtime writes to high-risk modules to make the maturity claim look complete.

Resulting requirement update: conditional L3 may advance only as `C-L3` product maturity; formal L1/L3/L4 remains blocked until evidence exists.

## 6. Three-Layer Viewframe

### Interface Layer Viewframe

Every frontstage, owner/member, admin/operator, module, and agent surface should be evaluated by:

- first-viewport identity, mode, and primary action;
- resource index or primary workbench;
- command bar or immediate next action;
- detail drawer, split pane, or record inspection path;
- agent workspace or proposal review area when the module has agent support;
- records/audit or readiness history;
- settings, permissions, boundaries, and unavailable states;
- explicit real, demo, mock, formal-readiness, DB-backed, or unavailable state;
- mobile and desktop operability;
- no-secret and no-public-private-data boundary.

### Scenario Layer Viewframe

Conditional L3 requires scenario routes, not only pages:

| Scenario route | Required path |
|---|---|
| Owner access | `/` or `/login` -> auth readiness -> protected dashboard -> owner evidence/action row |
| Daily command | `/dashboard` -> action queue -> Work, AI Input, Agents, Admin, or Manual Ops proof |
| Work operation | Work list/detail/action -> service boundary -> proof/readiness row -> audit future mapping |
| Source to work | AI Input source/control -> proposal/work intent -> review boundary -> audit family |
| Research to decision | Research object -> source/proposal -> Work or Company strategy handoff |
| Chamber opportunity | Chamber contact/interaction/opportunity -> Work/client action handoff |
| High-risk review | Finance/Life/Company proposal -> human approval -> no final write unless policy/proof exists |
| Agent command | `/agents` -> single/group command -> protected dry-run API/CLI -> proposal/audit boundary |
| Admin/manual ops | `/admin` or `/settings` -> launch/action/history/backend/audit readiness -> owner-run proof |

Each scenario row must capture:

```txt
trigger -> actor -> entry -> data source -> action -> agent proposal -> output -> audit/proof -> next task
```

### Architecture Layer Viewframe

Every visible operation should map to:

- BFF contract or route/server-action boundary;
- `requireUser()` or public token boundary;
- service-layer authorization;
- view-model/DTO mapper boundary;
- persistence stage: mock, seed demo, formal readiness, DB read, draft write, final write, blocked;
- audit family and storage status;
- owner-only CLI/API command when relevant;
- agent protocol status and `externalRegisterable=false` unless fully approved;
- Manual Ops state when proof depends on owner/operator environment;
- stop condition for high-risk writes, public output, auth, permission, DB migration, deployment, or external collaboration.

## 7. Gap Findings

| Layer | Current state | Gap | Next executable task |
|---|---|---|---|
| Interface | UI-complete prototype and interface smoke harness exist. | No single conditional L3 interface completeness matrix/checker across frontstage, member/settings, admin, modules, and agents. | `L3-UI-001` |
| Scenario | Scenario maturity and daily command center exist. | No end-to-end conditional L3 scenario route map/checker using trigger-to-proof rows. | `L3-SCENARIO-001` |
| Architecture | Backend, real-data, agent, audit, Manual Ops contracts exist. | No conditional L3 claim gate that separates formal launch level from product maturity level. | `L3-ARCH-001` |
| Manual Ops | `M1_MANUAL_OPS_READY` exists. | Manual Ops does not yet feed a conditional L3 maturity status; it only explains formal no-upgrade reasons. | `L3-ARCH-001` |

## 8. Conditional L3 Levels

| Level | Meaning | Formal launch effect |
|---|---|---|
| `C0_RESEARCH_READY` | Viewframe research exists and executable tasks are in backlog. | No formal launch upgrade. |
| `C1_INTERFACE_MATRIX_READY` | Interface completeness matrix/checker exists for all L3 actor surfaces. | No formal launch upgrade. |
| `C2_SCENARIO_ROUTES_READY` | End-to-end scenario routes and proof/audit handoffs are mapped and checked. | No formal launch upgrade. |
| `C3_ARCHITECTURE_GATE_READY` | Conditional L3 claim gate ties UI, scenarios, architecture, and Manual Ops together. | No formal launch upgrade. |
| `C-L3_CONDITIONAL_FULL_EXPERIENCE` | Owner can inspect/operate the full front/member/admin/module/agent experience locally or in protected mode, with missing environment proof delegated to Manual Ops. | Still not formal L1/L3/L4 until owner evidence passes. |

## 9. Executable Task Shape

| Task id | Scope | Acceptance | Verification | Risks / stop conditions |
|---|---|---|---|---|
| `L3-CONDITIONAL-001` | Create this three-layer research bridge and connect it to loop-dev task memory. | `RES-005` exists, is indexed, and backlog/sprint/acceptance/loop state route the next tasks. | docs scan, JSON parse, `git diff --check` | No formal launch claim; no runtime writes. |
| `L3-UI-001` | Add a conditional L3 interface completeness matrix/checker. | Covers frontstage, login, dashboard, settings, admin, Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agents. | `pnpm interface:smoke:check`, new checker, typecheck if code changes. | Stop before redesign; use existing surfaces first. |
| `L3-SCENARIO-001` | Add scenario route map/checker for trigger-to-proof paths. | Covers the scenario rows in section 6 with next task, Manual Ops, agent, and audit handoffs. | new checker, `pnpm owner:evidence:check`, `pnpm launch:actions:check`. | Stop if scenario needs new high-risk writes or public output. |
| `L3-ARCH-001` | Add conditional L3 architecture claim gate/checker. | Separates formal launch level, conditional Manual Ops, and conditional product maturity; blocks formal claims until evidence exists. | new checker, `pnpm launch:manual-ops`, JSON parse. | Stop before changing `launchLevels.current` to L1/L3/L4 without proof. |

## 10. Next Loop Recommendation

Loop 104 should run `AUTH-005` first only if Supabase public env plus signed-in `/auth/status` evidence appears, and `WORK-009` first only if a safe local/Docker/disposable proof target and confirmations appear.

If those owner/operator inputs are still absent, the next highest-leverage product-maturity task is:

```txt
L3-UI-001 -> L3-SCENARIO-001 -> L3-ARCH-001
```

This sequence moves toward `C-L3_CONDITIONAL_FULL_EXPERIENCE` while preserving formal launch honesty.

## 11. Rejected Alternatives

- Upgrade formal `launchLevels.current` from `L0` to `L3` because the UI is broad. Rejected because auth/session, Work persistence, and deployment proof remain missing.
- Stop all product work until owner-run proof exists. Rejected because Manual Ops already isolates the remaining proof work and the owner asked to continue maturing the experience.
- Create more unrelated readiness documents. Rejected because this research must feed executable interface, scenario, and architecture tasks.
- Add high-risk runtime writes to Finance, Life, Company, Client Portal, or external agents to simulate completeness. Rejected because those writes require human approval, authz, audit, and proof target review.

