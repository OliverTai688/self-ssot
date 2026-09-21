# Admin, Org, and Personal Setting Boundary

**Document ID:** `ARC-039`
**Date:** 2026-09-02
**Status:** Active

## 1. Purpose

As Personal OS expands to support team collaboration (`WorkspaceType.TEAM`) and multi-tenant capabilities, the system needs clear boundaries for settings and administration. Certain modules and features (like Finance and Life) must remain strictly personal, while others (like Work or Chamber) can be shared within a team context.

This document defines the UI, BFF Contract, and authorization boundaries separating **Superadmin**, **Workspace (Org)**, and **Personal** scopes, to ensure data isolation and clarify the scope of AI Agents/Skills.

## 2. Setting Layer Definitions

The settings surface is split into three distinct layers:

### A. Personal Layer (`/settings`)
- **Target:** The individual user (`Profile`).
- **Scope:** Auth resolution, mock/real identity, and strictly personal modules.
- **Enforcement:**
  - High-risk modules (e.g., `Life`, `Finance`) are enforced to operate **only** when the active `Workspace.type === 'PERSONAL'`.
  - Personal Agent Skills (Scope: `PERSONAL`) are managed here and are isolated to this specific Profile, regardless of which workspace they are currently acting in.
- **BFF Contract:** `SettingsHubModel` focuses on the individual's profile state and permissions.

### B. Workspace / Org Layer (`/settings/workspace`)
- **Target:** The `Workspace` currently in context.
- **Scope:** Workspace name, member management (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`), and team-shared module settings (e.g., `Work`, `Company`, `Chamber`).
- **Enforcement:**
  - Only users with `WorkspaceMemberRole.OWNER` or `ADMIN` can modify workspace settings.
  - Workspace Agent Skills (Scope: `WORKSPACE`) are managed here. These skills are available to all members of the workspace but do not cross workspace boundaries.
- **BFF Contract:** `WorkspaceSettingsBffContract` exposes workspace details and member lists.

### C. Superadmin Layer (`/admin`)
- **Target:** The entire system / deployment instance.
- **Scope:** Agent Protocol Readiness, Launch Blockers, Loop State, Developer Console.
- **Enforcement:**
  - Used by the system owner for development and instance-wide audits.
  - Global Agent Skills (Scope: `GLOBAL`) readiness and registry are viewed here.

## 3. Skill & Agent Scope (Future Expansion)

When adding UI features to create or manage Skills/Agents in the future, the `contextScope` must be explicitly declared:
1. `PERSONAL`: Tied to `Profile.id`.
2. `WORKSPACE`: Tied to `Workspace.id`.
3. `GLOBAL`: System-wide built-in skills (typically defined statically in `.codex/skills/`).

## 4. Verification & Stop Conditions
- Never expose Workspace member emails to users lacking `ADMIN` or `OWNER` roles.
- `requireUser()` and service-level authorization (like `assertCanAccessWorkspace`) must be used before fetching Workspace settings.
- Do not migrate existing `.codex/skills` to database tables without a dedicated schema migration task (`SCH-xxx`) and owner approval.
