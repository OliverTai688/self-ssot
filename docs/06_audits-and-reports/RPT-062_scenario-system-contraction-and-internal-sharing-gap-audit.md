# Scenario-System Contraction And Internal Sharing Gap Audit

**Document ID:** `RPT-062`  
**Last updated:** 2026-08-31
**Status:** Owner direction and governance decisions recorded; runtime gaps remain
**Scope:** Private owner use first, followed by company-internal member sharing  
**Companion plan:** `PLN-067_owner-ai-work-desktop-and-company-sharing-contraction-plan.md`

---

## 0. Executive Decision

The current website should not attempt to launch every visible module. It should contract into an **AI Work Desktop** whose first complete operating loop is:

```txt
conversation or source
  -> structured situation/context
  -> General Coordinator AI or module AI collaboration
  -> Inbox intervention and free-text reply
  -> document/task/project/research/company record
  -> daily/weekly agent diary
  -> Rule/Skill candidate
  -> governed personal/team/company reuse
```

The initial real product surface is:

- a ChatGPT-desktop-like unified conversation surface;
- distinct Work, Research, and Company AI workspaces;
- an Inbox where a human can reply in text, not only approve or reject;
- one logical file library per person, backed by shared Cloudflare R2 storage and reusable across modules;
- Personal Workspace plus explicitly shared Team Workspaces/projects;
- an internal AI Public Space where authorized Work AIs can discuss scoped goals and the human can inspect and intervene;
- agent daily/weekly diaries and completed-task summaries;
- a reviewable loop that turns repeated work into Rule/Skill candidates;
- Google sign-in and the first three external sources: LINE, Google Drive, and Gmail.

Finance, Life, and Chamber remain visually present only as clearly marked mock/unavailable areas and should be visually collapsed. Client Portal is deferred. No external agent registration or public sharing is part of this contraction.

The repository is not at this product state today. The formal launch state remains `L0_LOCAL_PROTOTYPE`; this report does not change it.

---

# 第一章：主軸與支線情境

## 1.1 Product Main Narrative

The product's primary user is a company owner or knowledge worker who already thinks, communicates, researches, and manages projects across chat, LINE, Gmail, Drive, and existing documents. The system's job is not merely to provide more dashboards. It must preserve context across time and turn conversation into organized, retrievable, governable company work.

The main narrative is:

> I can speak with one AI work desktop about company ideas and active work. The AI understands which person, company, project, research thread, source, role, and decision I mean; organizes the resulting files and records; brings them back when needed; and continues the discussion without forcing me to reconstruct context. Module AIs behave like colleagues: they perform bounded work, report what they did, keep diaries, exchange explicitly authorized context, and propose reusable rules or skills as our working pattern becomes clearer.

This requires one continuous experience rather than a collection of unrelated module demos.

## 1.2 Main Spine Scenarios

### Scenario A — Owner Starts From Conversation

1. The owner opens the unified AI chat.
2. The owner types an idea, question, decision, or work request and may upload files immediately.
3. General Coordinator AI identifies the relevant company, project, research thread, people, sensitivity, and intended output.
4. The owner can review or correct the resulting context package.
5. The AI continues the discussion using durable context and routes bounded tasks to Work, Research, Company, or File Organization AI.
6. Resulting documents, tasks, decisions, sources, and links remain retrievable from both the conversation and their destination modules.

**Required outcome:** conversation is a durable operating entry point, not isolated client state.

### Scenario B — Work And Project Collaboration

1. A member enters their Personal Workspace or an authorized Team Workspace.
2. Work AI understands the member's position, responsibilities, project role, project goal, current phase, files, decisions, and open tasks.
3. Human and AI discuss work in the project or Work AI chat.
4. Low-risk administrative outputs may be written automatically under an owner-configured policy; formal, shared, high-risk, C-level, or externally visible writes require review.
5. Project records link back to the originating conversation and source evidence.
6. Work AI records completed tasks, unresolved issues, and a daily/weekly diary.

**Required outcome:** an invited member can do actual project work, not only see a redacted project card.

### Scenario C — Research Workflow

1. The user brings a question, paper, link, email, Drive file, or conversation into Research.
2. Research AI preserves source identity and evidence references.
3. It helps form research questions, organize sources, compare evidence, develop notes, and draft outputs.
4. The conversation and research objects persist and can be reused in Work or Company without duplicating the physical file.
5. Research AI writes a diary describing what it reviewed, what changed, what remains uncertain, and which research rules may be reusable.

**Required outcome:** Research becomes a durable, source-grounded workflow rather than a localStorage workbench.

### Scenario D — Company Knowledge And Decision Work

Company requires two distinct lanes:

- **Owner private thinking:** sensitive exploration, uncommitted strategy, drafts, and private AI dialogue.
- **Formal shared company knowledge:** approved company decisions, policies, context, documents, and operating rules that authorized members may rely on.

The Company AI may help organize and propose transitions between lanes, but the visibility and approval policy must be explicit. Company is the first non-Work module that should hold real company data; other non-core modules can remain collapsed mock areas.

**Required outcome:** private strategic exploration cannot silently become company-readable truth.

### Scenario E — Inbox As An Asynchronous Human-AI Channel

1. General Coordinator AI or a module AI sends a message, question, proposal, conflict, or completion report to Inbox.
2. The user reads the full originating context.
3. The user can answer in free text, ask a follow-up, edit the proposal, approve, reject, defer, or redirect it.
4. The response returns to the originating conversation/task and becomes part of its auditable history.
5. A reviewed low-risk action may update an administrative record; higher-risk actions remain pending.

**Required outcome:** Inbox is a two-way asynchronous conversation surface, not an approval queue only.

### Scenario F — Agent Diaries And Rule/Skill Contraction

1. Every core agent records what it completed, what it is thinking about, blockers, source references, and next actions.
2. The owner can see daily summaries and weekly rollups per agent and across the system.
3. Repeated instructions, corrections, and successful methods become Rule/Skill candidates.
4. The owner reviews the candidate's scope, evidence, risk, visibility, version, and rollback path.
5. Only approved candidates become active operating rules or skills.

**Required outcome:** the system gets more aligned through observable, reversible governance rather than silent self-modification.

### Scenario G — Internal AI Public Space

1. A member explicitly gives their Work AI a discussion goal.
2. The member approves a scoped context package containing only the required project goal, role/position, responsibilities, public progress, and problem summary.
3. The AI joins an internal Public Space with other authorized Work AIs.
4. Agents discuss from their members' role perspectives and retain a full transcript.
5. Team members can read the transcript and intervene directly.
6. Content tagged `C-level` is visible only to C-level members; other company-internal content is readable by all Team members.
7. Any proposed project/company write returns to an approval or permitted low-risk action path.

**Required outcome:** AI-to-AI discussion never implies unrestricted cross-user, cross-project, or direct database access.

## 1.3 Supporting Scenarios

### External Source Continuity

- LINE should provide a low-friction communication intake/outbound continuity point.
- Google Drive should let the user select and import authorized files/folders with provenance.
- Gmail should let the user select messages by account, sender, label, or query and bring them into the same source workflow.
- Imported sources must preserve origin, account, permissions, timestamps, and evidence links.

### File Continuity

- Each person sees one logically isolated file library.
- Files and media are physically stored in a shared Cloudflare R2 bucket using owner/profile-scoped object keys.
- One physical asset may be linked to Work, Research, Company, a conversation, and a project without copying the binary.
- Team access is granted through explicit workspace/project/asset grants.
- Removing a module link does not delete the source object.

### Member Onboarding

- A company member uses Google sign-in.
- A Profile and Personal Workspace exist or are created through an invitation-gated onboarding path.
- The member can switch between Personal Workspace and authorized Team Workspaces.
- Project access, role, position, visibility, and C-level clearance are evaluated server-side.
- Offboarding revokes membership/grants/sessions while preserving governed audit and retention records.

## 1.4 V1 Agent Set

| Agent identity | Primary job | Default data boundary | V1 status target |
|---|---|---|---|
| General Coordinator AI | Unified conversation, situation synthesis, routing, cross-module retrieval | User-authorized personal and shared context | Internal protected runtime |
| File Organization / AI Input AI | Intake, provenance, classification, file/module linking | Owner asset library plus explicit grants | Internal protected runtime |
| Work AI | Projects, tasks, decisions, project diary, Public Space delegation | Personal or selected team project | Internal protected runtime |
| Research AI | Source-grounded research workflow and research diary | Personal or explicitly shared research context | Internal protected runtime |
| Company AI | Private thinking and approved formal company knowledge | Separate private/shared lanes with approval | Internal protected runtime |

All five remain `externalRegisterable: false`. External agents must not query the database directly.

## 1.5 Visibility And Approval Baseline

The v1 product needs a consistent visibility lattice across conversations, files, projects, research, company records, Inbox messages, diaries, and Public Space transcripts:

| Level | Intended readers | Default use |
|---|---|---|
| Personal Private | One profile only | Personal chat, private files, private agent diary |
| Team Project | Explicit project/team grants | Project work and member collaboration |
| Company Internal | All active Team members | General company knowledge and Public Space |
| C-level | Active members with C-level clearance | Strategy, governance, sensitive company context |
| External Client | Disabled in v1 | Reserved for future Client Portal |

Recommended write policy:

- owner-configured low-risk administrative writes may execute automatically and must emit audit records;
- module content proposals can be edited or replied to before acceptance;
- formal company knowledge, C-level content, high-risk actions, public output, permission changes, and skill activation require explicit human approval;
- mock content must never be presented as real company data.

## 1.6 Scope That Should Be Contracted Or Deferred

| Surface | V1 decision | Reason |
|---|---|---|
| Unified AI chat / AI Input | Core | Main operating entry point |
| Inbox | Core | Human-AI async intervention |
| Work | Core | Existing strongest DB-backed base |
| Research | Core | Required owner workflow, currently prototype |
| Company | Core | First home for real company knowledge |
| File / Media Library | Core infrastructure | Cross-module memory and source continuity |
| Workflow / Rules / Skills | Core governance, initially narrow | Needed for learning loop; avoid general automation scope |
| Agent Team OS | Internal supporting surface | Needed for diaries, task trace, private agent discussion, Public Space |
| Finance | Collapsed mock/unavailable | High risk and not required for first internal pilot |
| Life | Collapsed mock/unavailable | Outside company pilot spine |
| Chamber | Collapsed mock/unavailable | Outside first operating loop |
| Client Portal | Deferred and disabled | Owner explicitly deferred it; public boundary is high risk |

---

# 第二章：情境—系統的開發狀況

## 2.1 Status Legend

- **Ready base:** usable backend or protected contract exists, but may still lack production proof.
- **Partial:** meaningful UI/contract exists but the complete scenario breaks.
- **Mock only:** state or records are local/mock and not durable.
- **Missing:** no adequate product/system path exists.
- **Blocked by decision/proof:** implementation depends on owner governance choice or environment evidence.

## 2.2 Scenario-System Matching Matrix

| Scenario capability | Current evidence | Status | Missing main-line system |
|---|---|---|---|
| Protected desktop shell | Dashboard resolves current user and redirects when absent (`src/app/(dashboard)/layout.tsx:21`) | Partial | Production sign-in/onboarding proof and multi-member session proof |
| Unified AI conversation | Thread/message structures and send flow are client state (`ai-input-client.tsx:676`, `:947`) | Mock only | Durable conversations/messages, project/context references, retrieval, audit, ownership |
| Context-aware AI answer | Provider call exists (`ai-input/actions.ts:3`) | Partial/unsafe as product spine | Direct action auth, service boundary, ContextPackage, visibility filtering, source citation, memory |
| Mentioned context reaches model | UI calculates `contextSuffix` but calls `getAIResponse(text, ...)` (`ai-input-client.tsx:947-972`) | Missing | Server-validated reference resolver and context package injection |
| Google member sign-in | Email OTP/Magic Link exists with `shouldCreateUser:false` (`src/app/actions/auth.ts:47-78`) | Missing for requested scenario | Google OAuth, invitation-gated user/Profile creation, callback, company membership bootstrap |
| Profile-bound protected auth | Supabase claims email maps to Profile (`auth.service.ts:72-121`) | Ready base | Real owner/member end-to-end proof, onboarding and offboarding |
| LINE / Drive / Gmail intake | Provider setup manifests exist but all runtime flags are false and providers are `mock_setup_only` (`ai-input-source-connection-catalog.contract.ts:10-16`, `:146+`) | Mock/contract only | OAuth/bot/webhook/poll runtime, secret storage, consent, cursor, ingestion, audit, revoke/replay |
| Inbox free-text reply | Confirm/edit/dismiss/defer types and review UI exist (`ingestion.ts:452-481`; `inbox/page.tsx:161+`) | Partial mock | Durable message thread, text reply, origin routing, notifications, audit, allowed action dispatch |
| R2 upload/download | Authenticated actions and owner-scoped storage service exist (`storage.ts:44`; `storage.service.ts:29`) | Ready base | Deployment proof, scan/retention, sharing grants, module-link persistence |
| Per-person logical file isolation | Object key is `owner/{ownerId}/{uuid}` (`object-key.ts:9`) and DB reads are owner-scoped | Ready base | Workspace/project/asset authorization beyond owner-only |
| One asset used by multiple modules | `LibraryAssetModuleLink` exists only in client context; formal links start empty (`library-classification-context.tsx:88-89`) | Mock only | DB-backed polymorphic links, origins, grants, visibility and unlink/delete semantics |
| Work owner CRUD | DB-backed Work services/actions already exist | Ready base, proof-blocked | Formal signed-in browser/deployment proof |
| Shared Work project index | Workspace membership and project capability resolver exist (`team-workspace.service.ts:158+`) | Partial | Full invited-member detail/actions; current project service still asserts owner access (`project.service.ts:31`) |
| Invitation lifecycle | Existing-Profile/manual-link lifecycle exists | Partial | Google/new-user onboarding, provider delivery, suspend/remove/offboarding, owner quorum/session effects |
| Research workflow | Rich context/UI stores state in localStorage (`research-context.tsx:125`, `:154`) | Mock only | DB schema/service/BFF/authz/audit, source links, shared research grants |
| Company real data | Company page is hard-coded (`company/page.tsx:14+`) | Mock only | Private/shared lanes, Company records, permissions, approval workflow, real data cutover |
| Daily/weekly agent diary | No durable diary/summary models or runtime found | Missing | Agent journal, daily/weekly aggregation, evidence links, owner/member views |
| Rule/Skill contraction | Project memory candidates and governance docs exist | Partial contract | Cross-module correction evidence, candidate/version/review/activation/rollback runtime |
| AI private conversation | Static internal task/message bus contract exists | Contract only | Protected runtime, persistence, full transcript, human intervention, retention, audit |
| AI Public Space | Static bus explicitly has no route/action/DB/provider runtime (`agent-task-message-bus.contract.ts:428-440`) | Missing | Public-space room/task model, scoped context packages, C-level filtering, transcript and intervention |
| C-level visibility | Workspace roles are Owner/Admin/Member/Guest; existing visibility enums are internal/client or private/client (`schema.prisma:32-36`, `:352-356`, `:374-378`) | Missing | C-level clearance/label/inheritance/declassification and negative authorization tests |
| Daily dashboard of AI work | Admin action queue exists, but it reports launch/operator readiness rather than agent diaries | Missing for user scenario | Agent-completion feed and daily/weekly narrative summaries |

## 2.3 Current Architecture Strengths Worth Preserving

The contraction should build on existing strengths rather than restart the project:

- protected dashboard layout and `requireUser()` service boundary;
- DB-backed Work owner CRUD;
- new Personal/Team Workspace, membership, invitation, grant, feedback, memory-candidate, and append-only audit foundations;
- R2 server-side object-key generation and owner-scoped upload/download actions;
- BFF-first rule and UI-safe DTO pattern;
- provider/source connection manifests that are intentionally fail-closed;
- AgentFacts-lite and internal bus contracts with `externalRegisterable: false`;
- explicit mock/formal state labeling and no-secret readiness surfaces.

These are useful foundations, but none alone proves the end-to-end owner/member product journey.

## 2.4 The Missing Data Plane

The largest systemic gap is not another page. It is a shared data plane linking these durable objects:

```txt
Conversation / Message
  -> ContextPackage + ContextReference
  -> AgentTask / AgentMessage / HumanIntervention
  -> FileAsset / SourceAsset / EvidenceRef
  -> Project / Research / Company records
  -> InboxThread / Decision / ActionAttempt
  -> AgentJournalEntry / DailySummary / WeeklySummary
  -> RuleCandidate / SkillCandidate / Version / Approval
  -> OperatingAuditEvent
```

Today these concepts exist in separate combinations of client state, mocks, proposals, static contracts, and partial DB models. The product cannot yet reconstruct: “what did the user ask, what context did the AI see, what did it propose, what was approved, what changed, and where can the result be found?”

## 2.5 External Integration Reality

The connector user experience must match provider constraints:

- **Google authentication:** implement Supabase Google social login and keep company access invitation/domain governed. Reference: [Supabase Auth — Google](https://supabase.com/docs/guides/auth/social-login/auth-google).
- **Google Drive:** OAuth scope is not naturally “one folder forever.” Prefer least-privilege `drive.file` plus user selection where possible; broader recursive folder sync requires separately reviewed scope/consent. Reference: [Google Drive API authorization](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).
- **Gmail:** label and query selection can support narrower intake, but credentials, sync cursors, revocation, retention, and sensitive message redaction must be server-side. Reference: [Gmail messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).
- **LINE:** a bot must be added to a supported chat and receives webhook events from that point; the product must not promise arbitrary historical group-chat import. References: [LINE group chats](https://developers.line.biz/en/docs/messaging-api/group-chats/), [LINE receiving messages](https://developers.line.biz/en/docs/messaging-api/receiving-messages/).

## 2.6 NANDA / Agent Protocol Gate

This audit affects the proposed identities and capabilities of General Coordinator AI, File Organization AI, Work AI, Research AI, and Company AI.

| AgentFacts-lite field | Decision in this audit |
|---|---|
| identity | Five internal product identities proposed; runtime manifests not changed |
| provider | No provider decision changed |
| lifecycle | Proposed internal protected runtime only |
| endpoints/protocols | No endpoint or external protocol enabled |
| capabilities/skills | Core v1 jobs and bounded responsibilities identified |
| auth/trust | Personal/team/company/C-level visibility and human approval required |
| observability | Full transcript, diary, source references, actions and audit required |
| registry status | `externalRegisterable: false` remains mandatory |

Classification for this report: **governance/documentation proposal only**. It creates no live agent runtime, public directory, cross-organization collaboration, MCP/A2A endpoint, registry write, or external database access.

---

# 第三章：距離公司內部可分享給每個成員還差哪些

## 3.1 Definition Of “Internally Shareable”

“A link can open” is not sufficient. The company-internal milestone is reached only when the Owner and every active company member can safely complete the following journey, with at least one invited non-owner in the proof group:

1. receive or qualify for an invitation;
2. sign in with Google;
3. enter their own Personal Workspace;
4. switch into an authorized Team Workspace;
5. view and work on a specifically shared Work project according to role;
6. talk with General Coordinator AI and Work AI with durable context;
7. upload a file from chat or a module and find it in the one logical file library;
8. reuse the same asset in multiple authorized modules/projects without copying it;
9. receive an AI Inbox message, reply in text, and see the response return to the originating task;
10. read agent daily/weekly work summaries;
11. inspect and intervene in an authorized AI Public Space discussion;
12. fail closed on Personal Private, unauthorized projects, and C-level-tagged content;
13. leave the company or lose access without retaining active membership/session/grants.

## 3.2 Launch-Critical Gaps By Layer

### A. Identity, Onboarding, And Offboarding

Still required:

- Google OAuth entry and callback;
- invitation-gated new Supabase user/Profile creation;
- deterministic Personal Workspace creation;
- company/team membership binding;
- position and responsibilities profile;
- suspend/remove/offboard flow, session/grant consequences, last-owner quorum and audit;
- signed-in multi-user browser proof.

Existing task families to continue: `TEAMCOLLAB-006B`, `TEAMCOLLAB-006C`, `TENANT-005`, and Auth proof tasks.

### B. Authorization And Visibility

Still required:

- one server-evaluated visibility lattice for personal, project, company, C-level, and future external content;
- C-level clearance grant/revoke authority;
- inheritance rules for files, messages, transcripts, diary entries, generated summaries, and search results;
- downgrade/declassification behavior;
- negative tests against guessed IDs, search leakage, AI retrieval leakage, signed URLs, and derived summaries;
- service-layer replacement of owner-only Work detail checks with capability-aware project authorization.

This is a high-risk boundary. §3.5 now records the Owner's direction; runtime work must still stop for schema/apply risk or any authority/inheritance/declassification behavior outside those decisions.

### C. Durable Conversation And Context

Still required:

- Conversation, Message, Participant, ContextReference, and ContextPackage persistence;
- separate Personal/Team/Company ownership and visibility;
- server-side context resolver and redaction;
- attachments and source references;
- full history, search, rename/archive, retention, and deletion policy;
- provider calls behind `requireUser()`, authorization, rate/usage controls, and audit;
- cross-module retrieval without bypassing grants.

### D. Core Module Real-Data Cutover

Still required:

- Work: full member project detail and allowed actions, comments/feedback, file links, agent workspace, and diary;
- Research: DB-backed threads/sources/evidence/notes/outputs plus personal/team sharing;
- Company: private-thinking/shared-knowledge split, DB-backed records, proposal/review/publish, C-level policy, and audit;
- mock content removal from formal mode for these three modules.

### E. Inbox And Human Intervention

Still required:

- durable InboxThread/Message or a compatible shared conversation model;
- free-text reply and follow-up questions;
- origin task/conversation return path;
- action preview, policy evaluation, execution result, idempotency and retry;
- read/unread/assigned/resolved states and notification behavior;
- full audit for auto-write and approved-write paths.

### F. File And Source Plane

Still required:

- production R2/env/browser proof;
- DB-backed cross-module links and origin references;
- explicit asset grants or inherited project/workspace access;
- scan, retention, delete/unlink, revoke, and signed-URL policy;
- LINE, Drive, and Gmail provider adapters with consent, secret, cursor, redaction, replay, revoke and audit;
- source-to-conversation/module traceability.

### G. Agent Runtime, Diary, And Skill Governance

Still required:

- protected AgentTask/AgentMessage runtime and human intervention;
- per-agent daily journal and daily/weekly summaries;
- completed-task evidence and unresolved-thinking fields;
- correction/repetition evidence into Rule/Skill candidates;
- owner review, version, activation, rollback, visibility and audit;
- no silent high-risk or formal shared writes;
- no external registration.

### H. Internal AI Public Space

Still required:

- explicit room/task lifecycle;
- selected participant AIs and human members;
- approved scoped context package;
- role/position perspective metadata;
- full transcript and live human intervention;
- company-internal versus C-level visibility filtering;
- proposal-only downstream writes unless separately permitted;
- retention, deletion and offboarding policy;
- adversarial tests for prompt/context leakage.

### I. Production And Operations Proof

Still required:

- configured production-like Supabase auth, database, R2 and deployment environment;
- migration/apply and rollback evidence for selected schemas;
- owner plus multi-member end-to-end acceptance run;
- backup/restore, audit retention, error monitoring, rate limits and provider failure behavior;
- formal mock/real/unavailable states;
- incident and access-revocation runbooks;
- evidence that no Personal Private or C-level content leaks through AI, search, files, Inbox, diaries, Public Space, logs, or error messages.

## 3.3 Prioritized Gap Order

The shortest safe path is:

1. **Trust foundation:** Google invitation onboarding, Personal Workspace, position/role, offboarding, visibility/C-level contract.
2. **Conversation and context memory:** durable chat, server context resolver, file/source references.
3. **Core real modules:** Work member path, Research persistence, Company private/shared knowledge.
4. **Human-AI loop:** Inbox text reply, agent task/message runtime, low-risk auto-write audit.
5. **Learning loop:** diaries, daily/weekly summary, Rule/Skill candidates.
6. **Source continuity:** LINE, Drive, Gmail.
7. **Team intelligence:** internal Public Space with human intervention and C-level filtering.
8. **Pilot proof:** owner plus every active company member, with at least one invited non-owner, on a deployed/private environment.

Connector work can be developed alongside the core data plane, but connector availability must not substitute for durable conversation, authorization, and module records.

## 3.4 Acceptance Gates Before Company Rollout

| Gate | Minimum pass signal |
|---|---|
| G1 Identity | Real Google sign-in and invitation onboarding for owner/member accounts |
| G2 Isolation | Personal, project, company, and C-level negative authorization tests pass |
| G3 Durable AI | Conversation reload preserves messages, context references, and authorized retrieval |
| G4 Work | Invited member completes one allowed project action and cannot perform one forbidden action |
| G5 Research | Research object/source/note survives reload and obeys personal/team sharing |
| G6 Company | Private draft remains owner-only; approved formal item is visible to intended members only |
| G7 Inbox | AI asks; human replies in text; origin task continues; action/audit is traceable |
| G8 Files | One physical asset links to multiple allowed contexts; unauthorized signed download fails |
| G9 Agent diary | Each core agent shows sourced daily work and a weekly rollup |
| G10 Skill governance | Candidate can be reviewed, activated, versioned, and rolled back without silent mutation |
| G11 Public Space | Full internal transcript and intervention work; C-level and unrelated context do not leak |
| G12 Operations | Deployment, migrations, backup/recovery, monitoring, revocation and failure-state proof pass |

Until all launch-critical gates pass, share only with a named pilot group and label unavailable/mock surfaces honestly.

## 3.5 Owner Decisions Resolved On 2026-08-30

The authoritative decision packet is `docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-owner-decisions-20260830.md`. These decisions resolve product direction but do not by themselves authorize production migration/apply, provider activation, public output, terminal purge, or high-risk final writes:

1. **C-level authority:** the company Owner or an explicitly designated C-level administrator may grant/remove clearance; every change is audited and the last authorized Owner cannot be removed.
2. **Formal Company knowledge:** members may propose; Company Admin or Owner approves publication and visibility.
3. **Public Space triggering:** manual, scheduled, and AI-initiated starts are allowed only inside an approved goal/template and policy envelope; runs remain visible, pauseable, rate-limited, fully transcribed, and proposal-only downstream.
4. **Retention and offboarding:** active data remains active for 180 days, then enters indefinite archive. Product deletion is database soft archive; R2 objects remain archived. Permanent deletion requires explicit Owner-authorized terminal purge; no automated hard-delete job is allowed. Restore roles, export-before-purge, legal hold, cached provider snapshots, and audit retention remain Gate C implementation details.

## 3.6 What This Audit Changes

This report changes the development direction by:

- defining the first coherent product narrative;
- narrowing v1 to an AI Work Desktop and five internal agents;
- establishing Work, Research, Company, Inbox, file/source continuity, diaries, and governed skill learning as one loop;
- making Personal/Team/Company/C-level visibility a cross-cutting launch gate;
- deferring Client Portal and collapsing non-core modules;
- converting the remaining gaps into `OWNEROS-001..007` in `PLN-067` and `PLN-060` Phase 21.

It does **not** add database schema, migration, OAuth, connector runtime, route/action, AI runtime, permission behavior, production deployment, or launch evidence.
