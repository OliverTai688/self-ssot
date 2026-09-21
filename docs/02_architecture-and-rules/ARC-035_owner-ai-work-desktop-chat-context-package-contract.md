# Owner AI Work Desktop Chat ContextPackage Contract

**Document ID:** `ARC-035`  
**Task ID:** `OWNEROS-002A`  
**Last updated:** 2026-08-20  
**Status:** Contract-ready, no runtime/schema/provider activation  
**Gate mapping:** `OWNER_PRIVATE_AI_WORK_DESKTOP_READY` / `A2_DURABLE_AUTHORIZED_CHAT_CONTEXT`

---

## 1. Purpose

`OWNEROS-002` is the first high-risk runtime slice for the owner-directed AI Work Desktop. It must eventually persist a unified/module AI chat, reload complete history, attach authorized context, call the AI service only behind authenticated service boundaries, and prove cross-owner denial.

This document narrows the first safe slice into `OWNEROS-002A`: a contract and checker for the chat and `ContextPackage` boundary. It does not add a route, Server Action, Prisma model, migration, provider call, public output, Gmail send, or external agent registration.

The goal is to make the future runtime implementation executable without ambiguity:

```txt
Protected UI
  -> BFF DTO
  -> requireUser()
  -> profile/workspace authorization
  -> source authorization per reference
  -> redacted ContextPackage
  -> audited AI request envelope
  -> durable Conversation/Message persistence
```

## 2. Requirement Understanding Score

Score: 88/100, High.

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 18/20 | Owner needs one private AI Work Desktop chat that can use Work, Research, Company, Inbox, file, media, and diary context without leaking cross-owner data. |
| PRD/local evidence fit | 19/20 | `RPT-062`, `PLN-067`, `OWNEROS-002`, `ARC-024`, `ARC-028`, `ARC-032`, and `DBS-006` all point to this same durable context center. |
| Data/BFF/API clarity | 17/20 | Contract can define DTOs, source references, redaction, audit, and denial checks now; Prisma migration remains separate and review-required. |
| UI/reference-pattern confidence | 12/15 | Existing `/ai-input` chat is mock/local state and can inform UI shape, but durable chat needs a new BFF-backed boundary. |
| Risk/auth/public-output clarity | 14/15 | Personal Private first, no shared/C-level/external/public access, and no provider/runtime activation in this slice. |
| Acceptance/verification clarity | 8/10 | Static checker proves contract completeness; future runtime proof still needs DB/auth/provider/browser evidence. |

High score requires three same-issue research optimization rounds before implementation. They are recorded here because this loop is the research-to-task artifact.

## 3. Research Rounds

### Round 1 - Local PRD And Code Fit

Selected pattern: keep `OWNEROS-002A` contract-only and explicitly map it to Gate A criterion `A2_DURABLE_AUTHORIZED_CHAT_CONTEXT`.

Local evidence:

- `RPT-062` contracts v1 around one durable AI Work Desktop with Work, Research, Company, Inbox, file library, diaries/skills, and first connectors.
- `PLN-067` Stage 2 names durable conversation, context, and file links as a prerequisite before Inbox, diaries, and Public Space.
- Current `/ai-input` has `ChatThread` and `ChatMessage` local state, folders, auto-title, and ingestion capture, but not DB persistence or server-side context authorization.
- `ARC-032` already separates internal agent bus proposals from external agent runtime and direct DB access.

Rejected alternatives:

- Reuse `/ai-input` localStorage as the v1 source of truth. It cannot satisfy reload, authorization, audit, or cross-owner denial.
- Add schema immediately. `OWNEROS-002` is high-risk and still needs migration impact and negative auth fixtures.
- Add provider execution immediately. Provider calls before authorization/audit contracts would blur data and consent boundaries.

### Round 2 - BFF, Data, And Authorization Boundary

Selected pattern: the browser may submit only user text and opaque context reference candidates; the server resolves every reference after `requireUser()` and profile/workspace checks, then returns a redacted `ContextPackage`.

Contract objects:

- `OwnerAIWorkDesktopConversationDto`
- `OwnerAIWorkDesktopMessageDto`
- `OwnerAIWorkDesktopContextPackageDto`
- `OwnerAIWorkDesktopContextReferenceDto`
- `OwnerAIWorkDesktopContextResolutionCheck`
- `OwnerAIWorkDesktopContextPackageManifest`

Required authorization checks:

- `requireUser()`
- `profile_workspace_membership`
- `source_owner_or_grant`
- `visibility_lattice`
- `c_level_gate`
- `context_redaction`
- `negative_cross_owner`

The future service must fail closed when a reference is missing, owned by another profile/workspace, outside the selected visibility tier, C-level-gated, or not resolved through the server-side source adapter.

Rejected alternatives:

- Let Client Components import Prisma models or raw provider payloads.
- Let external agents, MCP clients, or browser code resolve database context directly.
- Build one broad polymorphic table before deciding retention and visibility behavior.

### Round 3 - NANDA, MCP, Audit, And Acceptance

Selected pattern: align with `ARC-028` AgentFacts-lite posture and current MCP authorization practice by keeping the context package as a server-generated manifest, not an externally readable registry or raw database bundle.

Source basis:

- `ARC-028` requires stable identity, capability declaration, trust boundary, observability, and `externalRegisterable: false` until public endpoint/auth/trust/approval are complete.
- Project NANDA and AgentFacts references remain local alignment targets, not launch claims.
- MCP authorization guidance supports explicit authorization boundaries for HTTP-capable agent integrations; this repo therefore keeps any future MCP/NANDA bridge outside this slice.

Rejected alternatives:

- Public agent directory or external registration.
- External agent database access.
- Sending full private chat history to a provider without source IDs, redaction, retention class, and audit envelope.

## 4. BFF Contract

### Read Conversation

```txt
GET /owner-ai-work-desktop/conversations/:conversationId
  -> requireUser()
  -> assert owner profile
  -> assert workspace membership
  -> load Conversation + Messages scoped by owner/workspace
  -> map to OwnerAIWorkDesktopConversationDto
```

### Draft ContextPackage

```txt
POST /owner-ai-work-desktop/context-packages/draft
  -> requireUser()
  -> validate opaque source refs
  -> resolve each ref server-side
  -> deny unresolved/cross-owner/visibility-ineligible refs
  -> apply redaction policy
  -> emit no-secret audit preview
  -> return OwnerAIWorkDesktopContextPackageDto
```

### Send Message

```txt
POST /owner-ai-work-desktop/conversations/:conversationId/messages
  -> requireUser()
  -> validate message parts
  -> resolve approved ContextPackage
  -> create user message and AI request envelope transactionally
  -> provider call only after OWNEROS-002 runtime/provider approval
  -> persist assistant response and audit envelope
```

No public route is part of this contract. A future route handler or Server Action must use service-layer authorization and must not expose raw adapter errors.

## 5. Domain States

Conversation status:

- `draft`
- `active`
- `archived`
- `blocked_authz`
- `blocked_retention_review`

Message status:

- `draft`
- `submitted`
- `context_resolved`
- `provider_pending`
- `assistant_ready`
- `failed_redacted`
- `blocked_authz`

ContextPackage status:

- `draft`
- `resolved`
- `denied`
- `expired`
- `retention_review_required`

## 6. Visibility

The first runtime slice is Personal Private only.

| Visibility | Runtime in OWNEROS-002 first slice | Rule |
|---|---|---|
| `personal_private` | Allowed after authz | Owner-only context, source IDs preserved. |
| `team_project` | Blocked in first slice | Waits for `OWNEROS-003` visibility lattice. |
| `company_internal` | Blocked in first slice | Waits for publication and governance decision. |
| `c_level` | Blocked in first slice | Requires owner decision on grant authority. |
| `external_client_disabled` | Disabled | No Client Portal or public route context. |

## 7. Source Types

Initial context reference source types:

- `work_project`
- `work_task`
- `file_asset`
- `media_asset`
- `research_thread`
- `research_source`
- `company_private_note`
- `company_formal_knowledge`
- `inbox_thread`
- `agent_diary_entry`
- `source_connection_artifact`

Every reference must keep:

- stable source id
- source type
- owner/workspace scope
- visibility tier
- source title or display label
- redaction class
- retention class
- audit source path

The browser never receives provider secrets, raw database IDs outside approved DTOs, or unresolved private source payloads.

## 8. Audit And Memory

Every future runtime send must emit or prepare an audit envelope containing:

- actor profile/workspace
- conversation id
- message id
- ContextPackage id
- source reference IDs
- denied reference count
- redaction policy
- provider boundary status
- retention class
- no-secret proof path when available

AI memory ingestion is not automatic in `OWNEROS-002A`. Future memory candidates must preserve source attribution, consent, retention, and deletion controls before becoming approved memory.

## 9. NANDA And Agent Protocol Boundary

Affected AgentFacts-lite fields:

| Field | OWNEROS-002A posture |
|---|---|
| identity | No new public agent identity. Internal contract supports future AI Work Desktop agent identity. |
| provider | No provider call in this slice. |
| lifecycle | `contract_only_no_runtime` |
| endpoints | No route handler, Server Action, MCP endpoint, or external endpoint. |
| protocols | Internal BFF/service contract only. |
| capabilities | Draft scoped context package and durable chat persistence proposal. |
| skills | No skill execution. |
| auth | Future runtime must use `requireUser()` and service-layer authorization. |
| trust | Personal Private only; external DB access denied. |
| observability | Static checker and loop evidence only. |
| registry | `externalRegisterable: false`, `registrationStatus: not-registered`. |

`externalRegisterable: false` remains mandatory. External registration, public agent discovery, cross-organization collaboration, and external agent access to private context require explicit owner approval and a separate approval package.

## 10. Acceptance

`OWNEROS-002A` is accepted when:

- A TypeScript contract defines conversation, message, context package, context reference, resolution check, manifest, source types, visibility levels, authz checks, stop conditions, runtime flags, and NANDA posture.
- A checker command validates contract/doc/backlog/tasks/acceptance markers and forbidden side-effect patterns.
- `PLN-060`, `PLN-061`, `tasks.md`, `ACC-002`, and `MAN-001` reference the contract.
- All runtime flags remain false: no schema migration, DB read/write, provider call, route handler, Server Action, public output, email send, external registration, or external agent database access.
- Gate A remains `NOT_ACHIEVED`; this contract is a prerequisite, not runtime proof.

## 11. Next Implementation Tasks

1. `OWNEROS-002B`: create schema/auth review packet for `Conversation`, `ConversationMessage`, `ContextPackage`, `ContextReference`, and audit linkage. Stop before migration apply.
2. `OWNEROS-002C`: implement protected Personal Private BFF read/write service behind mock/disposable proof target, including cross-owner denial fixtures.
3. `OWNEROS-002D`: integrate unified chat UI reload and context picker with server-loaded DTOs.
4. `OWNEROS-002E`: add provider fixture boundary and audited no-secret AI request envelope. Stop before real provider activation without owner approval.

