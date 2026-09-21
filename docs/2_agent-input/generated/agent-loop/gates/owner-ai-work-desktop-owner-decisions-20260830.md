# Owner AI Work Desktop — Gate A/B/C Owner Decisions

**Recorded:** 2026-08-30

**Status:** Product Owner decisions confirmed; UI Registry established

**Scope:** Gate A → Gate B → Gate C preflight only

**Runtime/UI change:** None

**Automation change:** None; the heartbeat remains paused

## 1. Confirmed Product Owner Decisions

| ID | Decision | Gate impact |
|---|---|---|
| OD-01 | C-level clearance is granted or removed by the company Owner or an explicitly designated C-level administrator. Every change is audited, and the last authorized Owner cannot be removed. | Unblocks the policy direction for Gate B visibility and offboarding research. |
| OD-02 | Members may propose formal Company knowledge. Company Admin or Owner approves publication and its visibility. | Unblocks the Company private-draft → formal-shared-knowledge state-machine design. |
| OD-03 | Public Space may be started manually, on a schedule, or by an AI agent. Scheduled and AI-initiated runs must remain inside an owner/member-approved goal/template and policy envelope, be visible, pauseable, rate-limited, fully transcribed, and proposal-only downstream. | Unblocks Public Space trigger research without authorizing unconstrained autonomous execution. |
| OD-04 | Active Personal OS data is retained for 180 days and then enters indefinite archive. Product deletion is database soft archive; R2 objects remain archived until the Owner explicitly authorizes terminal purge. No automatic permanent deletion is allowed. | Resolves the default DB/R2 retention lifecycle while leaving restore/export/legal-hold implementation research to Gate C. |
| OD-05 | Private deployment target is Vercel at `www.person.yzedtech.com`. | Selects the Gate A/Gate C deployment target; it does not authorize deployment or environment mutation in this packet. |
| OD-06 | Initial real pilot participants are the Owner and one marketing partner. Gate B should require the Owner plus every active company member, with at least one invited non-owner, instead of an arbitrary two-to-three non-owner threshold. | Aligns pilot acceptance with the complete current company population while preserving a real cross-user proof requirement. |
| OD-07 | Existing dirty/untracked/deleted work must be preserved. Establish a dedicated release worktree or checkpoint before resuming the ten-minute automation. | Authorizes the release-baseline preparation direction; no checkpoint, commit, worktree, or automation update was performed here. |

## 2. Confirmed Architecture Decision

All future operational UI remains BFF-first:

```txt
UI need
  -> typed UI-safe view model
  -> Server Component loader or Server Action / protected route
  -> requireUser()
  -> service-layer authorization
  -> domain service
  -> Prisma or approved provider adapter
  -> mapper / redaction
  -> Client Component interaction
```

Additional boundaries:

- Client Components do not import Prisma models, raw auth claims, provider payloads, secrets, or internal proof packets.
- Cross-user, workspace, project, Company, C-level, file, Inbox, diary, Public Space, and AI retrieval decisions are evaluated server-side.
- AI-initiated work remains capability-scoped, audited, rate-limited, reversible where applicable, and proposal-only for formal/shared/high-risk writes.
- External agent database access and external registration remain disabled.

## 3. Confirmed Global UI Decision

This decision was confirmed by the Product Owner and applies to future screen-by-screen work governed by `saas-ui-refactor-director`:

**Pattern:** Product operation surfaces versus explanatory governance content

**Decision:** Normal product pages must not contain rule manuals, architecture explanations, launch-gate prose, task IDs, proof instructions, raw capability fields, or long governance explanations. They show only the primary job, current actionable state, necessary concise restriction/block reason, and the next user action. Full explanations belong in the web user manual; operator-only diagnostics belong in Admin.

**Reason:** The product must behave like a concise SaaS tool rather than an engineering/status report.

**Applies to:** All owner/member product routes.

**Exceptions:** Concise safety confirmation, legal consent, destructive-action warning, permission denial reason, and setup blocker text required to make an immediate decision.

**Approved by/context:** Product Owner instruction on 2026-08-30.

The Product Owner approved creation of the unique UI Registry on 2026-08-31. `docs/03_feature-reference/REF-003_ui-screen-registry.md` is now the only authoritative Screen ID source. No Active UI was selected; all registered screens begin at `NOT_REVIEWED`. The Product Owner must name one UI ID before Review begins and approve that screen's proposal before implementation.

## 4. Web User Manual Ownership

The future web user manual is the product-facing source for explanations that should not crowd operational pages, including:

- workspace and visibility concepts;
- C-level access and publication responsibilities;
- AI proposal, approval, Public Space, and agent-initiated trigger behavior;
- 180-day active retention and archive behavior;
- file/source lifecycle, export, restore, and deletion expectations;
- connected-source consent, revoke, retry, and failure behavior;
- member onboarding, suspension, removal, and offboarding.

The manual's formal document/route should be created or selected only after the dirty-worktree release baseline is established.

## 5. Resolved Rollout Decisions

### RESOLVED-01 — Pilot threshold

The available pilot is the complete current company: Owner plus one marketing partner. The approved Gate B product rule is:

> Owner plus every active company member, with at least one invited non-owner.

The authoritative Gate contract/checker wording still requires promotion after the release baseline is established; this decision packet does not silently rewrite stale Gate evidence.

### RESOLVED-02 — Archive lifecycle

The approved default is:

- active data remains active for 180 days;
- product deletion creates a database soft archive;
- archived database records and R2 objects are retained indefinitely by default;
- only an explicit Owner-authorized terminal purge may permanently remove them;
- no automated hard-delete job is allowed.

Restore roles, export-before-purge, legal hold, cached provider snapshots, and audit retention remain Gate C implementation/research details. They may not weaken the confirmed no-automatic-purge boundary.

## 6. Resume Preconditions

Before the ten-minute Gate loop is resumed:

1. Preserve the current dirty work and establish a reviewable release baseline/worktree.
2. Reconcile the actual paused automation state with repository loop state.
3. Promote these owner decisions into the authoritative audit, plan, gate prompt/state, acceptance, backlog, and user-manual location without overwriting unrelated dirty work.
4. Promote the approved pilot and archive wording into the authoritative Gate contract/checker before collecting Gate B/C proof.
5. Reverify Gmail connection freshness and configure Vercel/Supabase/Google/R2/provider environments through explicit owner/operator actions.
6. Generate fresh no-secret Gate evidence against one tested/deployed commit; stale evidence cannot be reused.

## 7. Non-Claims

- Gate A, Gate B, and Gate C remain not achieved.
- This packet does not authorize a production migration, provider activation, deployment, public output, high-risk write, terminal deletion, external agent database access, or external registration.
- This packet does not approve any UI proposal or implementation.
