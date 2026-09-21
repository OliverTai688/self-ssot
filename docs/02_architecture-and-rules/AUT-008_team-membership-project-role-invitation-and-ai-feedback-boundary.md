# Team Membership, Project Role, Invitation, And AI Feedback Boundary

**Document ID:** `AUT-008`  
**Last updated:** 2026-07-27  
**Status:** Architecture/auth policy; create-team and existing-Profile manual-link invitation runtime implemented  
**Source:** `RES-026`, `SCH-006`

---

## 1. Purpose

Define the authorization and trust boundary for team workspaces, shared Work projects, email invitations, collaborator feedback, and AI use of that feedback.

## 2. Identity Is Not Membership

```txt
Supabase Auth identity
  -> Profile
  -> active WorkspaceMembership
  -> effective Project capability
  -> allowed operation
```

Successful login proves identity only. It does not prove:

- membership in a workspace;
- access to a project;
- permission to comment/edit/manage;
- permission to invite others;
- permission to expose feedback to an AI provider.

## 3. Role Namespaces Must Remain Separate

| Namespace | Values | Purpose |
|---|---|---|
| Global/module role | `OWNER`, `PARTNER`, `CLIENT` | Existing module-default and product-shell role |
| Workspace role | `OWNER`, `ADMIN`, `MEMBER`, `GUEST` | Team governance |
| Project role | `VIEWER`, `COMMENTER`, `EDITOR`, `MANAGER` | Project operations |

Never infer a workspace/project capability from global `UserRole`.

## 4. Effective Project Capability

Server-side precedence:

1. Deny when identity, workspace, project, membership, or status is missing.
2. Workspace `OWNER`/`ADMIN` receives project `MANAGER`.
3. An active direct `ProjectAccessGrant` applies.
4. For `WORKSPACE_VISIBLE`, an active `MEMBER` inherits the workspace default project role.
5. `GUEST` receives no inherited role.
6. `PRIVATE` projects require a direct grant unless the actor is workspace owner/admin.

The resolver returns capabilities, not only a role label:

```ts
type ProjectCapability =
  | "project.read"
  | "feedback.create"
  | "feedback.update_own"
  | "feedback.moderate"
  | "project.content.write"
  | "project.access.manage"
  | "project.transfer"
  | "project.feedback_memory.review"
```

Every service/action checks the required capability at the time of operation.

`TEAMCOLLAB-003` implements the contract-only resolver in `src/lib/contracts/team-workspace-capability.contract.ts`. It also declares the workspace capability namespace required by the interface (`workspace.read`, project index/create, member read/invite/manage, policy, audit, and transfer-target receipt), BFF operation policies, a redacted decision DTO, and explicit follow-up-only coverage for invitation and AI lifecycle rows that are not runtime-proven yet.

## 5. BFF Authorization Rules

- Derive `profileId` from `requireUser()`.
- Accept resource IDs only as lookup input, never as proof.
- Load membership and project workspace in the same service boundary.
- Recheck capability inside the transaction for transfer, invite acceptance, role changes, and suspension.
- Return UI-safe DTOs; never return raw invitation digest, Auth UID, provider secret, DB URL, or unrestricted member email list.
- Use safe not-found/forbidden errors that do not reveal another workspace's existence.
- Client Components may store the selected workspace ID as preference, but every request must re-authorize it.

## 6. Invitation Boundary

### Creation

- Only workspace `OWNER`/`ADMIN` may invite by default.
- The inviter selects workspace role and optional project role.
- Normalize email using one canonical function.
- Store token digest, not raw token.
- Set explicit expiry.
- Record inviter, target workspace/project, requested roles, and audit ref.

### Delivery

- Supabase Admin invitation may run only in trusted server code.
- Provider secret/service key never reaches the browser, logs, DTOs, or reports.
- Application invitation is the authorization source of truth; provider Auth invitation only enables account creation/sign-in.
- Redirect URLs must be allowlisted and normalized.

### Acceptance

- Recipient must be authenticated.
- Authenticated verified email must exactly match the invitation email.
- Invitation must be pending, unexpired, unrevoked, and unused.
- Acceptance is idempotent and transactional.
- Existing confirmed users join through the application invitation; do not call provider invite APIs again.
- A membership row is never created from email domain or user metadata alone.

`TEAMCOLLAB-006` now implements this application-invitation boundary for existing Personal OS Profiles. The service rechecks active workspace capability inside each transaction, stores only a token digest, rotates prior pending tokens, supports an optional same-workspace direct project grant, and writes only the reviewed no-secret audit catalog. `/work` exposes a members/invitations Sheet and exact-email acceptance card. Delivery is explicitly `MANUAL_EMAIL_LINK`; automatic Supabase/provider invitation, Auth/Profile provisioning, membership suspension/removal, and public invitation routes remain unimplemented.

### Revocation And Offboarding

- Revoking an invitation invalidates it immediately.
- Suspending/removing a membership immediately removes inherited/direct access.
- Historical author identity and audit remain.
- API/session/token implications are reviewed; external access tokens are revoked where applicable.
- At least one active workspace owner must remain.

## 7. Project Transfer Boundary

Transfer requires:

- `project.transfer` on source project;
- workspace `OWNER`/`ADMIN` on target team;
- explicit consequence preview;
- stable source/target IDs;
- one transaction;
- before/after audit;
- no implicit Client Portal visibility change;
- no deletion/copy that loses feedback authorship.

Blocked transfer conditions:

- target workspace suspended;
- actor lacks either side's capability;
- target is the same workspace;
- project has an unresolved policy requiring owner approval;
- capability resolver/backfill proof is unavailable.

## 8. Feedback Boundary

- `VIEWER` cannot create feedback.
- `COMMENTER` or stronger may create feedback.
- Authors may edit/withdraw their own feedback according to retention policy.
- `MANAGER` moderation does not rewrite authorship; hide/resolve/delete actions are audited.
- Feedback visibility follows project capability, not Client Portal visibility.
- Public/client feedback is a separate future contract.
- Attachments reuse approved private file/media storage boundaries.

## 9. AI Feedback And Memory Boundary

### Allowed

- Internal WorkAgent retrieves feedback only for an already-authorized project request.
- AI output cites feedback ID/version and keeps a safe excerpt/reference.
- AI may create a summary, action proposal, issue proposal, or project-scoped `MemoryCandidate`.
- A manager/owner reviews durable memory in the first runtime version.

### Denied By Default

- Cross-workspace retrieval.
- Global memory promotion.
- Provider fine-tuning/training.
- Final task/deliverable/public writes.
- Permission or member changes.
- External-agent access.
- Public agent endpoint or external registration.

### Consent, Withdrawal, And Deletion

- Workspace policy and feedback-level eligibility both must allow AI use.
- Store the policy version/reason used for each AI run.
- Withdrawal prevents new retrieval.
- Derived memory is invalidated or queued for review.
- Audit retains minimal action metadata without retaining deleted content beyond policy.

## 10. Audit Events

Required event families:

- `workspace.created`
- `workspace.member.invited`
- `workspace.invitation.accepted`
- `workspace.invitation.revoked`
- `workspace.member.role_changed`
- `workspace.member.suspended`
- `workspace.member.removed`
- `project.transferred`
- `project.access.changed`
- `project.feedback.created`
- `project.feedback.updated`
- `project.feedback.withdrawn`
- `project.feedback.moderated`
- `project.feedback.ai_use_changed`
- `project.memory_candidate.proposed`
- `project.memory_candidate.reviewed`
- `project.memory.invalidated`

Audit records include actor, target, result, risk, approval, before/after references, and trace/evidence refs without secrets or unnecessary feedback content.

## 11. Negative Authorization Matrix

Minimum tests:

| Scenario | Expected |
|---|---|
| Non-member lists workspace projects | Deny |
| Member lists another workspace's projects by guessed ID | Deny |
| Guest lists workspace-visible projects without direct grant | Deny |
| Viewer posts feedback | Deny |
| Commenter edits task | Deny |
| Editor invites member | Deny |
| Manager changes workspace owner policy | Deny unless workspace admin/owner |
| Wrong email accepts invitation token | Deny and audit |
| Expired/revoked token is reused | Deny |
| Suspended member uses an old selected-workspace preference | Deny |
| Project transfer expands Client Portal visibility | Must not happen |
| WorkAgent requests feedback from another workspace | Deny |
| Deleted/withdrawn feedback appears in new AI retrieval | Deny |

## 12. RLS Posture

Current application uses Prisma direct connection plus service-layer authorization. Therefore:

- service authorization is mandatory;
- no RLS protection claim is allowed yet;
- JWT claims must not replace membership-table checks;
- user-editable metadata is never authorization data;
- future RLS must map `auth.uid()` to `Profile.authUserId` and evaluate active membership/grants;
- RLS must be proven with two workspaces and negative queries on a disposable DB/JWT-aware path;
- a privileged Prisma connection must remain contained to server services and must not expose generic data access.

## 13. NANDA Status

The affected WorkAgent remains:

- lifecycle: internal/protected;
- data visibility: one authorized project/workspace;
- capabilities: feedback summary/action/memory proposal only;
- observability: feedback/version, decision, audit, trace refs;
- external registration: `externalRegisterable: false`.

External human collaborators are not external AI agents. This feature does not approve NANDA/A2A/MCP exposure or direct external-agent access.

## 14. Human Approval Gates

Explicit owner approval remains required before:

- valuable DB schema migration/backfill;
- real provider invitation delivery;
- Auth/permission runtime cutover;
- production RLS policy apply;
- public/client feedback;
- automatic durable memory promotion;
- provider fine-tuning/training;
- external-agent collaboration or registration.
