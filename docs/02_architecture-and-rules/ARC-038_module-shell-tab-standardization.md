# Module Shell Tab Standardization

**Document ID:** `ARC-038`
**Date:** 2026-08-24
**Status:** Active — implemented in `module-operating-shell.tsx`
**Runtime implementation:** UI relabel/reorder only. No route, schema, DB, provider, or public-output change.

## 1. Purpose

Fix one top-level tab order and naming for every module operating surface that uses `ModuleOperatingShell`, so a person moving between modules (商會/Chamber, 生活/Life, 自己/Self, 財務/Finance, and future 工作/Work, 研究/Research, 公司/Company, 自動化/Workflow) finds the same grammar every time. This extends `ARC-036` (simplified SaaS operating surface pattern) and `ARC-012`/`ARC-013` (frontend operating surface, module map).

## 2. Decision

Every module surface exposes exactly 5 tabs, in this fixed order:

| Order | Tab key | Label | Icon | Replaces |
|---|---|---|---|---|
| 1 | `project` | 專案 | `FolderKanbanIcon` | 總覽 (overview) + 操作 (operation), merged into one tab |
| 2 | `library` | 檔案/媒體 | `FolderIcon` | 檔案庫/媒體庫 (previously conditional on `moduleKey`, now always shown) |
| 3 | `agent` | `{module}AI` (e.g. 工作AI, 學術AI, 公司AI, 商會AI, 財務AI, 生活AI, 自我AI) | `BotIcon` | 代理人 (agent) |
| 4 | `records` | 紀錄 | `FileClockIcon` | 紀錄 (records) — label unchanged |
| 5 | `boundaries` | 邊界 | `SlidersIcon` | 設定 (settings) |

Rationale per change:

- **專案 (project):** 總覽 and 操作 were two separate tabs showing the same working set (module focus/current detail, then the record queue/local draft form). They are one job — "work this module's project" — so they render together under one tab instead of forcing an extra click.
- **檔案/媒體 (library):** was previously only shown when the caller passed `moduleKey`. Every module now gets the tab; if a page has not wired `moduleKey` yet, the library renders unfiltered rather than the tab disappearing, so the tab order itself never shifts between modules.
- **`{module}AI` (agent):** the tab is still the proposal-only Agent workspace from `ARC-036` §7 ("Agent as proposal workspace" — scope, proposal, allowed operation, blocked write stay unchanged). Only the label changes, and it changes **per module** rather than staying the generic "代理人": 工作AI for Work, 學術AI for Research, 公司AI for Company, 商會AI for Chamber, 財務AI for Finance, 生活AI for Life, 自我AI for Self. This is a naming decision only — it does not add autonomy, new write scope, or change `externalRegisterable`.
- **紀錄 (records):** unchanged in meaning; kept as the audit/history tab.
- **邊界 (boundaries):** renamed from 設定/settings because the tab's actual content (visibility, Agent read scope, external-share switches) is already titled "Module boundaries" inside the shell, and "邊界" is the term already used across `ARC-018`, `AUT-003`, and the module pages' `privacyNote`/`highRiskNote` copy for this exact concept. This keeps the label honest about what the tab controls — permission/data boundaries, not generic app settings.

## 3. Module → AI label mapping

| `ModuleKey` | Module name | Agent tab label | Status |
|---|---|---|---|
| `work` | 工作 | 工作AI | Not yet on `ModuleOperatingShell` (bespoke page) — apply when migrated |
| `research` | 研究 | 學術AI | Not yet on `ModuleOperatingShell` (bespoke page) — apply when migrated |
| `company` | 公司 | 公司AI | Not yet on `ModuleOperatingShell` (bespoke page) — apply when migrated |
| `chamber` | 商會 | 商會AI | Applied (`src/app/(dashboard)/chamber/page.tsx`) |
| `finance` | 財務 | 財務AI | Applied (`src/app/(dashboard)/finance/page.tsx`) |
| `life` | 生活 | 生活AI | Applied (`src/app/(dashboard)/life/page.tsx`) |
| `self` | 自己 | 自我AI | Applied (`src/app/(dashboard)/self/page.tsx`) |
| `workflow` | 自動化 | 自動化AI | Not yet on `ModuleOperatingShell` (bespoke page) — apply when migrated |

`agentLabel` defaults to `工作AI` in the shell if a caller omits it, so an unmigrated page never crashes — but every real module page should pass its own label from this table.

## 4. Implementation

- `src/components/layout/module-operating-shell.tsx`
  - `ShellTab` narrowed to `"project" | "library" | "agent" | "records" | "boundaries"`.
  - New `agentLabel?: string` prop (default `"工作AI"`).
  - `buildTabItems(agentLabel)` replaces the old `baseTabItems`/`libraryTabItem` split; the library tab is no longer conditional on `moduleKey`.
  - The former `overview` and `operation` tab bodies now render together under `tab === "project"`.
  - The former `settings` tab body is unchanged in content, only its tab key/label moved to `boundaries`/邊界.
- `src/app/(dashboard)/chamber/page.tsx`, `life/page.tsx`, `self/page.tsx`, `finance/page.tsx`: pass `agentLabel` per §3; `life` and `self` also now pass `moduleKey` so their 檔案/媒體 tab is scoped to that module (previously only `chamber` and `finance` did).

## 5. Non-goals / safety flags

- `routeHandlerCreated: false`
- `serverActionCreated: false`
- `schemaMigrationIncluded: false`
- `databaseRead: false`
- `databaseWrite: false`
- `providerCall: false`
- `publicOutputExpanded: false`
- `externalAgentDatabaseAccess: false`
- `externalRegisterable: false`

This document does not change Agent write scope, `externalRegisterable`, or any Gate A/B/C criteria by itself — it is a UI naming/order contract only.

## 6. Follow-up

- When `/work`, `/research`, `/company`, and `/workflow` are migrated onto `ModuleOperatingShell` (per `ARC-036` §9/§11, tasks `OWNEROS-UI-005` and future work-specific tasks), pass `agentLabel` and `moduleKey` per the table in §3 so the tab order and naming stay consistent across every module.
- If the `simplified-saas-operating-surface.contract.ts` slot vocabulary (`agent-proposal-pane`, `resource-index`, `detail-pane`, `settings-boundaries`, …) is later tightened to check literal tab labels, it should reference this document rather than re-deriving the label set.
