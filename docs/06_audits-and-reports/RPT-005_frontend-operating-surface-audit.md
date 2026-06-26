# D-EVAL-005: Frontend Operating Surface Audit

**Task:** FOPS-002
**Date:** 2026-06-09
**Reference:** `docs/architecture/A-ARCH-012-frontend-operating-surface.md`

Each module is mapped against the five-layer operating surface model:
- **Attention** — what needs action right now, visible in first viewport
- **Operation** — primary work surface (tables, queues, editors, timelines)
- **Agent WS** — bounded review/proposal workspace for AI collaboration
- **Records** — audit trail, history, decisions, workflow runs
- **Settings/Boundary** — permissions, visibility, sync, governance

---

## Route Inventory and Gap Map

### Dashboard `/dashboard`

| Layer | Current | Gap |
|---|---|---|
| Attention | Morning brief cards (mock) | No real cross-module attention aggregation |
| Operation | Brief regeneration button | No actionable cross-module queue |
| Agent WS | — | `/dashboard/agent` missing |
| Records | — | `/dashboard/records` missing |
| Settings | — | `/dashboard/settings` missing |

**Assessment:** Card-heavy mock layout. Primary attention area is not obvious — all cards have equal weight. Needs real data aggregation from Work tasks due + AI Input items + Research issues before refactor is meaningful.

**Refactor target:** After AUTH-001 + data from at least 2 live modules. Not first priority.

---

### Work `/work`

| Layer | Current | Gap |
|---|---|---|
| Attention | Project progress bars visible on list | No "what needs my attention now" header across all projects |
| Operation | Project list + filter bar; project detail tabs | ✅ Functional (DB-backed) |
| Agent WS | — | `/work/agent` or agent drawer missing entirely |
| Records | — | `/work/records` missing; no audit trail for project changes |
| Settings/Boundary | Client tab shows client-visible items | No explicit boundary panel; client visibility rules not surfaced |

**Assessment:** Best-implemented module. Project list and detail are DB-backed and operational. The main gaps are: no agent workspace, no records/audit subpage, and no explicit work/boundary settings. Project detail tabs (Pulse / Work / Client) partially cover operation but mix attention + operation.

**Refactor target:** FOPS-006. Add Agent and Records tabs to project detail first, then `/work/agent` and `/work/records` routes.

---

### Work Project Detail `/work/[projectId]`

| Layer | Current | Gap |
|---|---|---|
| Attention | Pulse tab (progress, recent notes, upcoming) | ✅ Present — Pulse tab serves this well |
| Operation | Work tab (tasks, notes, deliverables with CRUD) | ✅ Good — delete now wired (UIUX-001) |
| Agent WS | — | No project-level agent panel |
| Records | — | No project change log or action history |
| Settings/Boundary | Client tab shows client-visible filter | Client visibility rules could be more explicit |

**Assessment:** Pulse tab = attention, Work tab = operation, Client tab = partial boundary. Structure is good. Gaps are agent and records layers.

**Refactor target:** FOPS-006. Add agent drawer and records tab without breaking existing tab behavior.

---

### Research `/research` + subpages

| Layer | Current | Gap |
|---|---|---|
| Attention | — | No "what needs attention" surface; overview page is a nav hub only |
| Operation | Multiple subpages: issues, sources, writing, graph, events, people, exploration | ✅ UI-complete; all mock data |
| Agent WS | — | `/research/agent` missing |
| Records | — | `/research/records` missing |
| Settings/Boundary | — | `/research/settings` missing |

**Sub-route assessment:**

| Route | UI state | Data | Attention |
|---|---|---|---|
| `/research` | Nav hub | mock | ❌ no primary attention |
| `/research/issues` | List + filter | mock context | ⚠️ filter tabs help but no "blocked/overdue" alert |
| `/research/sources` | List + type filter | mock context | ⚠️ no citation gap warnings |
| `/research/writing` | Writing project cards | mock context | ❌ card-heavy |
| `/research/graph` | Network graph | mock | ✅ graph is appropriate for this type |
| `/research/people` | People list | mock | ⚠️ no relationship status indicators |
| `/research/events` | Event timeline | mock | ⚠️ no upcoming/overdue alerts |
| `/research/exploration` | Exploration cards | mock | ❌ card-heavy; needs queue/table |

**Refactor target:** FOPS-007. `/research` overview should surface open issues and unlinked sources as attention items. `/research/writing` should become editor-first, not card grid.

---

### AI Input `/ai-input`

| Layer | Current | Gap |
|---|---|---|
| Attention | AI 工作台 tab shows pending workflow items | ✅ Tab serves attention; mock data |
| Operation | 4 subpages: AI 對話, 參考脈絡, 同步設定, AI 工作台 | ✅ Good IA; all mock |
| Agent WS | AI 工作台 tab is the agent workspace | ✅ Pattern present; needs real data (DATTR-024) |
| Records | — | `/ai-input/records` missing; no run history |
| Settings/Boundary | 同步設定 tab covers connector scope | ✅ Good; connector status UI done |

**Assessment:** Best-structured module after Work for the FOPS model. Existing 4-subpage IA maps well: 對話 = operation, 參考脈絡 = context, 同步設定 = settings, 工作台 = agent WS. Main gap is records subpage and real data.

**Refactor target:** Low priority for IA refactor. Focus on DATTR-024 persistence first.

---

### Inbox `/inbox`

| Layer | Current | Gap |
|---|---|---|
| Attention | Source triage cards (mock) | ⚠️ Cards have equal weight; no priority order |
| Operation | Source items + normalized preview + triage proposals | ⚠️ Proposal cards not queue/table format |
| Agent WS | Triage proposals area | ⚠️ Present but card-heavy, not table format |
| Records | — | `/inbox/records` missing |
| Settings/Boundary | — | `/inbox/settings` missing |

**Assessment:** The triage area partially fills agent WS but uses cards. Should be a filterable queue/table with action controls. Shares many concerns with AI Input.

**Refactor target:** FOPS-008 (structured shell) or later once Inbox gets real data from AI Input.

---

### Workflow `/workflow`

| Layer | Current | Gap |
|---|---|---|
| Attention | — | No "rules triggering now" or "blocked runs" attention header |
| Operation | Rule list + rule builder dialog | ✅ UI present; mock data; rules not persisted |
| Agent WS | Agent registry panel | ⚠️ Present but read-only; no proposal surface |
| Records | Audit trail component | ✅ Pattern present; mock data |
| Settings/Boundary | — | `/workflow/settings` missing |

**Assessment:** Good mock structure. Flow visualizer + rule list + audit trail cover most layers. Agent registry is informational, not an action surface. Primary gap: no real data persistence and no attention header.

**Refactor target:** After INGEST-002 (WorkflowRule persistence). Not a UI-first priority.

---

### Life `/life`

| Layer | Current | Gap |
|---|---|---|
| Attention | Fitness dashboard component | ⚠️ Shows fitness data but no daily attention/reflection prompt |
| Operation | Fitness tracking UI | ⚠️ Partial; no log entry form |
| Agent WS | — | `/life/agent` missing |
| Records | — | `/life/records` missing |
| Settings/Boundary | — | `/life/privacy` missing (high-risk: must not share) |

**Assessment:** FitnessDashboard is a reasonable starting surface. Main gaps: log entry flow, agent workspace (privacy-sensitive), records, and privacy boundary settings.

**Refactor target:** FOPS-008. Add structured shell: attention (today's log + energy status), log entry action, agent (privacy-gated), records, privacy settings.

---

### Finance `/finance`

| Layer | Current | Gap |
|---|---|---|
| Attention | "Coming soon" stub | ❌ Everything missing |
| Operation | Placeholder | ❌ |
| Agent WS | — | ❌ (human approval required) |
| Records | — | ❌ |
| Settings/Boundary | — | ❌ (critical: financial data boundary) |

**Refactor target:** FOPS-008. Structured shell only: draft transaction queue + human approval indicator + boundary panel. No real writes until AUTH-001 and FINANCE-001 docs are done.

---

### Chamber `/chamber`

| Layer | Current | Gap |
|---|---|---|
| Attention | "Coming soon" stub | ❌ Everything missing |
| Operation | Placeholder | ❌ |
| Agent WS | — | ❌ |
| Records | — | ❌ |
| Settings/Boundary | — | ❌ |

**Refactor target:** FOPS-008. Contact list stub + relationship status + agent review surface.

---

### Company `/company`

| Layer | Current | Gap |
|---|---|---|
| Attention | "Coming soon" stub | ❌ Everything missing |
| Operation | Placeholder | ❌ |
| Agent WS | — | ❌ (human approval required for strategy data) |
| Records | — | ❌ |
| Settings/Boundary | — | ❌ (high-risk: strategy privacy) |

**Refactor target:** FOPS-008. Strategy doc list stub + key decisions log + boundary warning panel.

---

## Summary Scorecard

| Module | Attention | Operation | Agent WS | Records | Settings | First Action |
|---|---|---|---|---|---|---|
| Work | ✅ | ✅ | ❌ | ❌ | ⚠️ | FOPS-006: add agent + records tabs |
| Research | ❌ | ✅ UI | ❌ | ❌ | ❌ | FOPS-007: add attention surface + agent |
| AI Input | ✅ | ✅ | ✅ | ❌ | ✅ | records subpage after DATTR-024 |
| Inbox | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | queue/table refactor after real data |
| Workflow | ❌ | ✅ UI | ⚠️ | ✅ UI | ❌ | after INGEST-002 persistence |
| Dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | after 2+ modules have live data |
| Life | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | FOPS-008 structured shell |
| Finance | ❌ | ❌ | ❌ | ❌ | ❌ | FOPS-008 structured shell |
| Chamber | ❌ | ❌ | ❌ | ❌ | ❌ | FOPS-008 structured shell |
| Company | ❌ | ❌ | ❌ | ❌ | ❌ | FOPS-008 structured shell |

---

## Refactor Priority Order

1. **FOPS-003** — Implement common module subpage navigation pattern (overview/agent/records/settings tabs) on one candidate module first
2. **FOPS-004** — Module Agent workspace shell (proposal table + boundary panel + run log)
3. **FOPS-005** — Module records/audit subpage (filterable table + timeline drilldown)
4. **FOPS-006** — Apply pattern to Work (highest-impact; already DB-backed)
5. **FOPS-007** — Apply to Research (add attention surface; fix writing from card grid to editor)
6. **FOPS-008** — Structured shells for Finance, Chamber, Company, Life (no real writes)

**Candidate for FOPS-003 prototype:** Work project detail — it already has tabs (Pulse/Work/Client) which partially map to the pattern. Extending it with Agent and Records tabs is a natural fit and won't break DB-backed CRUD.

---

## Anti-pattern Violations Found

| Module | Violation |
|---|---|
| Research writing | Card grid for writing projects — should be an editor list or table |
| Research exploration | Card grid — should be a filterable table or queue |
| Dashboard | Equal-weight morning brief cards — needs priority/attention ordering |
| Inbox | Triage proposal cards — should be a reviewed queue/table |
| Finance/Chamber/Company | Stub placeholders with no operating surface intent communicated |
