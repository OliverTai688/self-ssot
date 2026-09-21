# Team Workspace, Project Collaboration, And AI Feedback Memory Research

**Document ID:** `RES-026`  
**Last updated:** 2026-07-27  
**Status:** Owner-directed research and product decision; no runtime or schema migration applied  
**Companion artifacts:** `SCH-006`, `AUT-008`, `PLN-066`  
**Supersedes:** The product decision in `RES-020` that one `Profile` belongs to exactly one isolated tenant and that shared team workspaces are out of scope. `RES-020` remains historical evidence for the current owner-scoped runtime and isolation audit.

---

## 1. Owner Requirement

The owner wants the Work area to support team tabs/workspaces:

- A signed-in person can choose a team and see that team's shared projects.
- A personal project can be converted or transferred into a team project.
- People can be invited by email.
- Invitees can receive view, edit, or management permissions.
- A project shared to a team appears for active members when they select that team.
- Feedback left by external collaborators inside the project can be known and used by the owner's AI.

The attached Work screenshot shows the current surface is still one owner-scoped project list. It has no workspace selector, team tabs, members/invitations area, project access panel, or team-feedback memory boundary.

## 2. Strategic Product Decision

Use a **multi-workspace membership model**, not the earlier one-profile/one-tenant model:

```txt
Authenticated identity (Profile)
  -> belongs to one personal workspace
  -> may belong to zero or more team workspaces
  -> selects an active workspace
  -> sees workspace-visible projects
  -> may receive a more specific role on one project
```

The collaboration container owns the project:

```txt
Workspace
  -> WorkspaceMembership
  -> Project.workspaceId
  -> ProjectAccessGrant (only for exceptions or stronger/weaker project role)
  -> ProjectFeedback
  -> ProjectMemoryCandidate
```

This is a deliberate correction to the `RES-020` decision. The new owner requirement is real and explicit, so `TenantMembership`/`WorkspaceMembership` is no longer hypothetical over-design.

## 3. Research-To-Task Quality Gate

### 3.1 Page Requirement Understanding Score

| Dimension | Score | Evidence |
|---|---:|---|
| Actor/job clarity | 19/20 | Owner, team member, external collaborator, workspace manager, and project manager jobs are explicit. |
| PRD/local evidence fit | 18/20 | Work DB-backed service exists; `PRD-005` already expects partner collaboration and internal/external boundaries. |
| Data/BFF/API clarity | 18/20 | Current exact-owner authorization was audited; the replacement membership/access resolver is defined below. |
| UI/reference-pattern confidence | 13/15 | Linear workspace switching, Notion teamspaces/page permissions, Google Drive access roles, and GitHub repository roles provide mature references. |
| Risk/auth/public-output clarity | 12/15 | Invite, transfer, offboarding, external feedback, AI use, RLS, and audit boundaries are defined; production migration and provider configuration still need owner approval. |
| Acceptance/verification clarity | 9/10 | Staged tasks include negative authorization tests, disposable DB proof, UI states, audit, and stop conditions. |
| **Total** | **89/100 — High** | Three research rounds required and completed. |

### 3.2 Research Round 1 — Local Product, Code, And Prior-Decision Fit

Findings:

- `Profile.email` is globally unique and currently resolves the authenticated user.
- `Project.ownerId` points directly to one `Profile`.
- Every Work read/write authorizes through exact owner equality. This is safe for current personal projects but cannot represent a team member.
- Existing global `UserRole` (`OWNER | PARTNER | CLIENT`) controls module defaults; it must not be reused as a workspace or project role.
- `RES-020` and `SCH-004` intentionally rejected shared workspaces and many-to-many membership based on the earlier owner decision.
- `ARC-033` correctly blocks role-based cross-owner bypass. The future membership resolver must replace exact-owner access explicitly; it must not weaken the current rule through an ad hoc `role === OWNER` bypass.
- `RES-011` already distinguishes raw history, `MemoryCandidate`, and approved `AgentMemory`, which is the correct foundation for collaborator feedback.

Selected:

- Preserve current exact-owner authorization until the new membership schema, resolver, migration proof, and negative tests land together.
- Replace the one-profile/one-tenant proposal before implementing it.
- Add new workspace and project roles instead of stretching `UserRole`.

Rejected:

- Adding `teamId` only to the UI or localStorage.
- Treating `PARTNER` as implicit access to every owner's project.
- Passing caller-supplied `ownerId`, `workspaceId`, or role from a Client Component as authorization evidence.
- Implementing a project-share dialog before the BFF authorization contract exists.

### 3.3 Research Round 2 — Comparable Product Patterns

Applicable official product patterns:

- Linear treats a workspace as the shared organizational container, supports workspace switching, separates workspace members/admins/owners from team-level ownership, and limits guests to explicitly granted teams.
- Notion teamspaces add a membership and permission layer inside a workspace; page permissions separate view, comment, edit, and full access.
- Google Drive separates Viewer, Commenter, and Editor; shared-drive Manager is a distinct governance role.
- GitHub separates organization roles from repository roles and recommends least-privilege resource roles such as Read, Write, Maintain, and Admin.

Selected:

- Separate **workspace governance role** from **project capability role**.
- Add a `COMMENTER` project role even though the owner named view/edit/manage, because external feedback should not require edit permission.
- Team members see workspace-visible projects by inheritance; guests see only explicitly granted projects.
- Project-level grants can override the inherited default only through an auditable manager action.

Rejected:

- One flat role list used for the whole product.
- Giving every invited external person workspace-wide visibility.
- Letting project editors invite others or manage permissions by default.
- Public "anyone with link can edit/comment" as the first collaboration path.

### 3.4 Research Round 3 — Auth, Persistence, AI, And Safety Boundary

Applicable official platform/governance patterns:

- Supabase Auth invitation is an admin action performed only in a trusted server environment; the secret key must never reach the browser.
- Authorization data must not rely on user-editable metadata. Membership and project grants remain database records and service-layer checks.
- Supabase/Postgres RLS is defense-in-depth only after a JWT-aware runtime and tested policies exist. The current Prisma direct-connection path still requires application service authorization.
- NIST AI RMF guidance emphasizes documenting data lineage, feedback mechanisms, oversight, and training-data provenance.

Selected:

- Store application invitations separately from Supabase Auth users.
- Accept an invitation only when the authenticated email exactly matches the normalized invited email.
- Store only a digest of the application invitation token.
- Keep service-layer authorization canonical; add RLS only after a disposable two-workspace proof.
- Treat collaborator feedback as attributed project data, then as an evidence-linked `MemoryCandidate`; do not automatically fine-tune a model.
- Durable project memory requires policy or human approval, remains project/workspace scoped, and can be revoked or superseded.

Rejected:

- Storing a service-role/secret key in browser code.
- Auto-joining a workspace based only on email domain.
- Trusting `raw_user_meta_data` for authorization.
- Sending all project feedback to a model provider with no data-use policy or provenance.
- Calling every comment "training data".
- Promoting one comment directly into global agent memory or a final Work write.

## 4. Actor And Job Model

| Actor | Primary job | Default boundary |
|---|---|---|
| Personal owner | Keep private projects isolated; decide when one becomes team-owned | Owner of personal workspace |
| Workspace owner | Create/suspend team workspace, manage admins and policy | Full workspace governance |
| Workspace admin | Manage day-to-day members, invitations, and project policy | No billing/destructive owner-only actions unless separately granted |
| Workspace member | Enter team workspace and work on shared projects | At least view workspace-visible projects |
| Workspace guest | Collaborate on explicitly assigned projects | No workspace-wide project discovery |
| Project viewer | Read allowed project content | No feedback or edits |
| Project commenter | Read and leave feedback | No project data edits |
| Project editor | Create/update normal project content | No member/permission/transfer management |
| Project manager | Manage project settings, roles, and transfer proposals | Cannot delete workspace or bypass high-risk policy |
| WorkAgent | Summarize feedback and propose scoped memory/actions | Internal/protected, proposal-only |

## 5. Workspace And Project Visibility Model

### 5.1 Workspace Types

| Type | Meaning |
|---|---|
| `PERSONAL` | Automatically associated with one owner; private by default; no inherited access for others |
| `TEAM` | Has multiple memberships, invitation policy, default project visibility, audit, and AI feedback policy |

One `Profile` has exactly one personal workspace and may have many team memberships.

### 5.2 Workspace Roles

| Workspace role | Can view workspace | Manage projects | Invite members | Manage roles/policy |
|---|---:|---:|---:|---:|
| `OWNER` | Yes | Yes | Yes | Yes, including owner-only settings |
| `ADMIN` | Yes | Yes | Yes | Yes, excluding owner-only destructive actions |
| `MEMBER` | Yes | According to project role/default | No by default | No |
| `GUEST` | Shell only | Explicit projects only | No | No |

### 5.3 Project Roles

| Project role | Read | Feedback | Edit normal content | Manage project/access |
|---|---:|---:|---:|---:|
| `VIEWER` | Yes | No | No | No |
| `COMMENTER` | Yes | Yes | No | No |
| `EDITOR` | Yes | Yes | Yes | No |
| `MANAGER` | Yes | Yes | Yes | Yes |

Workspace `OWNER`/`ADMIN` has `MANAGER` capability on projects inside that workspace. A normal `MEMBER` receives the workspace's configured default project role for `WORKSPACE_VISIBLE` projects; the initial safe default is `VIEWER`. A `GUEST` receives no inherited project access.

### 5.4 Project Access Modes

| Mode | Visibility |
|---|---|
| `PRIVATE` | Only explicit grants and workspace owner/admin |
| `WORKSPACE_VISIBLE` | Active team members inherit the workspace default project role |

Do not add public unauthenticated edit/comment access. The existing Client Portal token remains a separate public read boundary.

## 6. Project Conversion: Personal To Team

The action is a **move of ownership container**, not a copy:

```txt
Personal project
  -> manager opens "轉為團隊專案"
  -> selects a team where they are OWNER/ADMIN
  -> sees access/visibility/client-token/AI-memory consequences
  -> confirms
  -> one transaction changes Project.workspaceId
  -> initiating owner receives MANAGER grant if not implied
  -> audit event records before/after workspace and policy
  -> project appears in the selected team's project list
```

Rules:

- No silent bulk transfer.
- Existing tasks, notes, deliverables, files, media, timeline rows, and stable project ID remain attached.
- Client Portal visibility/token is not expanded or regenerated by transfer.
- Internal notes remain internal; team visibility is governed by project/member capability, not `CLIENT_VISIBLE`.
- Transfer is blocked if the actor is not manager of both the source personal workspace and target team workspace.
- Reversal is another explicit audited transfer, not an undo that erases collaborator history.
- Existing collaborator feedback remains attributed after transfer.

## 7. Invitation And Membership Lifecycle

```txt
Manager enters email + workspace role + optional project role
  -> app creates PENDING invitation with token digest and expiry
  -> trusted server may send Supabase Auth invitation if needed
  -> recipient signs in
  -> app verifies authenticated email == invitation email
  -> invitation is accepted once
  -> WorkspaceMembership becomes ACTIVE
  -> optional ProjectAccessGrant is created
  -> recipient can select the team and see allowed projects
```

Required states:

- Invitation: `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`.
- Membership: `ACTIVE`, `SUSPENDED`, `LEFT`, `REMOVED`.
- Duplicate active membership is idempotent.
- Reinvite creates a new token/version; old tokens remain invalid.
- Suspension removes access immediately but preserves authorship/audit attribution.
- Offboarding never rewrites historical feedback to look like it came from the owner.

## 8. External Feedback And AI Memory

### 8.1 Clarify "AI Knows And Trains"

The first implementation should mean:

```txt
Collaborator feedback
  -> saved as attributed ProjectFeedback
  -> normalized as a project-scoped source/version
  -> WorkAgent may retrieve it for the same project
  -> AI produces summary, issue, action, or MemoryCandidate
  -> manager/owner reviews durable memory or final writes
```

It does **not** mean:

- fine-tuning a foundation model automatically;
- allowing a provider to train on private team data by default;
- converting feedback into global Personal OS memory;
- letting feedback directly modify tasks, deliverables, public output, or permissions.

### 8.2 Feedback Record Requirements

Every feedback item keeps:

- workspace and project IDs;
- target type and target ID (`PROJECT`, `TASK`, `NOTE`, `DELIVERABLE`, `FILE`, `MEDIA`);
- author Profile ID and display snapshot;
- body/version;
- visibility and status;
- created/edited/deleted timestamps;
- source/provenance reference;
- AI-use eligibility and reason;
- withdrawal/deletion tombstone;
- audit reference.

### 8.3 AI Use Policy

| Stage | Default |
|---|---|
| Retrieval for the same project | Allowed only for users/agents already authorized to that project |
| AI summary/proposal | Allowed as internal, evidence-linked output |
| Durable project memory | `MemoryCandidate`, requires owner/manager review in first release |
| Cross-project/workspace reuse | Denied |
| Final task/deliverable/public write | Human approval required |
| Provider fine-tuning/training | Disabled; separate explicit provider/data-use approval required |

If feedback is removed or AI-use consent is withdrawn, new retrieval excludes it and derived memory candidates/approved memories are invalidated, superseded, or queued for review. Historical audit evidence remains minimal and non-content-bearing where deletion policy requires it.

## 9. UI / Information Architecture

### 9.1 Dashboard Shell

Add a protected workspace switcher:

```txt
個人
設計團隊
研究合作小組
＋ 建立／加入團隊
```

The active workspace is a navigation preference, not authorization evidence. Every loader independently verifies membership.

### 9.2 Work Project Surface

The Work project page should expose:

- `個人` plus one tab/chip per active team;
- active workspace name and member count;
- project index filtered to the verified active workspace;
- explicit real/demo/unavailable state;
- team empty state: "尚無共同專案" plus allowed next action;
- invite/member button only for authorized workspace roles;
- project share/access drawer with inherited and direct roles;
- "轉為團隊專案" only on personal projects where the actor is manager.

### 9.3 Team Management

Protected team settings:

- overview and workspace policy;
- members and status;
- pending/expired invitations;
- default project visibility/role;
- AI feedback-memory policy;
- records/audit;
- suspend/remove/leave controls with impact preview.

### 9.4 Project Detail

Add:

- collaborator avatars and effective roles;
- feedback/thread surface;
- AI feedback summary with source links;
- memory candidates awaiting review;
- access history in Records/Audit.

## 10. BFF-First Contract

```txt
Server Component
  -> requireUser()
  -> resolveActiveWorkspace(profileId, workspaceId)
  -> requireWorkspaceCapability(...)
  -> requireProjectCapability(...)
  -> project/workspace domain service
  -> Prisma
  -> UI-safe workspace/project/member/feedback DTO
  -> Client Component interaction
```

Required read contracts:

- `listMyWorkspaces()`
- `getWorkspaceProjectIndex(workspaceId)`
- `getWorkspaceMembers(workspaceId)`
- `getProjectAccessSummary(projectId)`
- `getProjectFeedback(projectId)`
- `getProjectFeedbackMemoryCandidates(projectId)`

Required write contracts:

- `createTeamWorkspace`
- `inviteWorkspaceMember`
- `acceptCollaborationInvitation`
- `revokeCollaborationInvitation`
- `changeWorkspaceMemberRole`
- `suspendWorkspaceMember`
- `transferProjectToWorkspace`
- `changeProjectAccessGrant`
- `createProjectFeedback`
- `updateProjectFeedback`
- `deleteProjectFeedback`
- `proposeFeedbackMemoryCandidate`
- `approveOrRejectFeedbackMemoryCandidate`

Every action derives the user from `requireUser()`, validates input, rechecks capability inside the service, writes an audit event, and returns a UI-safe DTO/error.

## 11. Schema Direction

The concrete proposal is in `SCH-006`. Core additions:

- `Workspace`
- `WorkspaceMembership`
- `CollaborationInvitation`
- `Project.workspaceId`
- `Project.accessMode`
- `ProjectAccessGrant`
- `ProjectFeedback`
- `ProjectFeedbackVersion`
- `ProjectMemoryCandidate`

`Profile.tenantId` from `SCH-004` must not be implemented. Existing `ownerId` fields remain during a staged migration and become legacy creator/owner compatibility fields until every service has moved to the workspace resolver.

## 12. Authorization Invariants

1. Authentication identifies a `Profile`; it does not grant workspace access.
2. Active `WorkspaceMembership` or an explicit permitted path is required.
3. The effective project capability is computed server-side.
4. Workspace/project roles are not read from client state.
5. Global `UserRole` is not a workspace/project capability.
6. Guests have no inherited project discovery.
7. Client Portal token access remains separate and read-only/fail-closed.
8. External humans never gain direct database access.
9. External agents remain blocked; humans leaving feedback do not make an agent externally registerable.
10. Authorization failures use not-found/forbidden safe errors without exposing team membership.

## 13. NANDA / Agent Protocol Gate

Applies because feedback becomes AI-readable context and the feature introduces external human collaboration.

Affected future WorkAgent capabilities:

- `project.feedback.summarize`
- `project.feedback.action.propose`
- `project.memory.candidate.propose`

AgentFacts-lite posture:

| Field | Decision |
|---|---|
| Identity/provider/lifecycle | Existing internal WorkAgent; no new external agent |
| Endpoints/protocols | Protected internal BFF only |
| Capabilities/skills | Proposal-only feedback summary and memory candidate creation |
| Auth | Requires current user plus workspace/project capability |
| Trust | Project-scoped data visibility; no cross-workspace reuse |
| Observability | Source refs, feedback version, audit event, approval decision |
| Registry | `internalDiscoverable: true`, `externalRegisterable: false` |

No public agent endpoint, external agent collaboration, registry write, direct external-agent DB access, or autonomous final write is approved by this research.

## 14. Acceptance Scenarios

1. A person can belong to two teams and switch between them without data leakage.
2. Selecting a team lists only that workspace's visible projects.
3. A normal team member sees workspace-visible projects with at least the configured viewer role.
4. A guest sees only explicitly granted projects.
5. A personal project can be transferred to a team by an authorized manager, with stable project ID and audit history.
6. An invited email cannot be accepted by a different authenticated email.
7. Revoked/expired invitations cannot create membership.
8. A viewer cannot comment, edit, invite, transfer, or manage access.
9. A commenter can leave feedback but cannot edit project content.
10. An editor cannot manage members/access by default.
11. A manager can change project grants but cannot silently expand Client Portal visibility.
12. AI summaries cite feedback source/version and remain project scoped.
13. Feedback never becomes durable memory or a final Work write without the configured approval.
14. Feedback deletion/withdrawal prevents future AI retrieval and triggers memory invalidation review.
15. Two-workspace negative tests prove cross-workspace reads/writes are denied.

## 15. Launch-Level Interpretation

This research advances the L5 multi-user path but does not change the current formal launch level:

- Formal level remains `L0_LOCAL_PROTOTYPE`.
- L1 still requires `AUTH-005`, Work DB proof, and deployment proof.
- Team collaboration runtime is not launch-ready until schema, BFF authz, invitation, transfer, feedback, audit, RLS posture, and negative tests are verified.

## 16. External Sources

- Linear Workspaces: https://linear.app/docs/workspaces
- Linear Members and Roles: https://linear.app/docs/members-roles
- Linear Invite Members: https://linear.app/docs/invite-members
- Notion Teamspaces: https://www.notion.com/help/guides/how-workspace-owners-can-set-up-teamspaces-for-their-organization
- Notion Sharing and Permissions: https://www.notion.com/help/sharing-and-permissions
- Google Drive Access Levels: https://support.google.com/drive/answer/16722399
- Google Drive Visitor Sharing: https://support.google.com/drive/answer/9195194
- GitHub Repository Roles: https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization
- Supabase Users and Invitations: https://supabase.com/docs/guides/auth/users
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Custom Claims and RBAC: https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac
- NIST AI RMF Playbook: https://airc.nist.gov/docs/AI_RMF_Playbook.pdf
- NIST Generative AI Profile: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf

## 17. Rejected Alternatives Summary

- Keep one Profile in one Tenant and duplicate a user per team.
- Add a visual team tab without a membership model.
- Reuse `UserRole` for workspace/project authorization.
- Give all team members edit or admin rights.
- Treat public Client Portal links as collaboration identities.
- Auto-join by email domain.
- Store raw invitation tokens.
- Trust client state, JWT user metadata, or email alone after invitation acceptance.
- Fine-tune a provider model automatically from external feedback.
- Promote feedback directly into global memory or final module writes.
- Apply schema/migrations to the live database in this research loop.

## 18. Next Executable Slice

Run `TEAMCOLLAB-003` from `PLN-066`:

- define the server-only workspace/project capability resolver contract;
- encode the role matrix and negative cases in TypeScript;
- add a static or fixture-only checker;
- keep DB reads/writes, schema migration, invitations, project transfer, public output, provider calls, and AI runtime disabled.

