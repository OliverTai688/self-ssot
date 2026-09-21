# Owner AI Work Desktop And Company Sharing Contraction Plan

**Document ID:** `PLN-067`  
**Last updated:** 2026-08-31
**Status:** Active product contraction plan; Owner governance decisions resolved; runtime proof incomplete
**Primary input:** `RPT-062_scenario-system-contraction-and-internal-sharing-gap-audit.md`  
**Launch impact:** Defines the shortest path from owner use to a named internal company pilot; no launch-level upgrade

---

## 1. Objective

Contract Personal OS into one complete AI Work Desktop loop that the owner can use with real company data and then safely share with each company member:

```txt
Unified / module conversation
  -> authorized structured context
  -> AI work and Inbox collaboration
  -> durable file/document/task/module records
  -> agent daily/weekly diary
  -> reviewed Rule/Skill candidate
  -> explicit personal/team/company reuse
```

The plan finishes one integrated path before expanding dormant modules.

## 2. V1 Scope Freeze

### Real v1 operating surfaces

- General Coordinator AI unified chat
- AI Input / File Organization AI and one logical per-person file library
- Inbox with free-text human reply
- Work and Work AI
- Research and Research AI
- Company and Company AI
- Personal Workspace and explicitly shared Team Workspace/projects
- internal AI Public Space with full transcript and human intervention
- agent daily/weekly diaries and completed-task summaries
- governed Rule/Skill candidate review
- Google sign-in
- LINE, Google Drive, and Gmail source connections

### Contracted or deferred surfaces

- Finance, Life, Chamber: visually collapsed and clearly labeled mock/unavailable.
- Client Portal: deferred and disabled.
- External agent registration, public directories, cross-organization AI collaboration: disabled.
- External client visibility: reserved enum/policy concept only; no v1 route or output.

## 3. Non-Negotiable Boundaries

- BFF-first, `requireUser()`, service-layer authorization, UI-safe DTOs.
- One server-evaluated visibility lattice: Personal Private, Team Project, Company Internal, C-level, future External Client.
- No client-supplied permission or context authorization evidence.
- No silent use of Personal Private, unrelated project, or C-level context in AI prompts, retrieval, summaries, search, diaries, or Public Space.
- Low-risk auto-writes require owner-configured policy and append-only audit.
- Formal company knowledge, C-level changes, high-risk actions, public output, permission changes, and skill activation require human approval.
- External agents never access the database directly.
- All internal agents remain `externalRegisterable: false`.
- Mock data is never silently substituted in formal mode.
- Ambiguous schema or any authority/retention behavior outside the recorded Owner decisions stops before runtime implementation.

## 4. Delivery Stages

### Stage 0 — Product Contraction And Gap Baseline

Task: `OWNEROS-001`

Status: `DONE` on 2026-08-18 as documentation only.

Outputs:

- `RPT-062` three-chapter scenario-system audit;
- `PLN-067` staged delivery plan;
- Phase 21 executable task rows;
- acceptance and project-memory routing updates.

Exit:

- One v1 product narrative exists.
- Real, mock, partial, missing, and deferred surfaces are distinguishable.
- No runtime behavior or launch claim changes.

### Stage 1 — Trust Foundation

Primary dependencies: `TEAMCOLLAB-006B`, `TEAMCOLLAB-006C`, `TENANT-005`, Auth proof tasks, `OWNEROS-003`.

Scope:

- Supabase Google OAuth;
- invitation-gated new-user/Profile onboarding;
- Personal Workspace creation and Team membership binding;
- position/responsibilities profile;
- one visibility/C-level policy and capability contract;
- suspend/remove/offboard behavior and negative auth tests.

Exit:

- The Owner and every active company member can sign in and switch personal/team contexts; the proof group includes at least one invited non-owner.
- Unauthorized project, asset, conversation, company, and C-level reads fail closed.
- Grant/revoke/offboard operations are audited.

Stop:

- Apply OD-01 and OD-04 from the Owner decision packet; stop for any authority, declassification, restore/export/legal-hold, or offboarding behavior not covered there.
- Do not apply a production migration without reviewed migration impact and explicit approval.

### Stage 2 — Durable Conversation, Context, And File Links

Primary tasks: `OWNEROS-002` plus `R2STORE`/`MODLIB` follow-ups.

Scope:

- define UI-visible Conversation/Message/ContextPackage contracts;
- persist unified and module chat histories;
- authorize and redact context references server-side;
- attach files from any chat/module through one creation path;
- persist multi-module/context links without duplicating R2 objects;
- add search, archive, retention, and origin traceability;
- move provider calls behind authenticated, authorized services and audit.

Exit:

- Conversation reload preserves complete history and references.
- Mentioned/selected context actually reaches the AI only after authorization.
- One R2 object can appear in multiple allowed contexts; an unrelated profile cannot read or download it.
- The system can explain which sources and records informed an AI response/action.

Stop:

- Do not create a broad polymorphic schema without migration review and negative authorization fixtures.
- Do not allow external agents or browser clients to resolve raw context directly.

### Stage 3 — Work, Research, And Company Real-Data Core

Primary dependencies: `TEAMCOLLAB-007/008`, existing Research persistence tasks, `COMPANY-001`, `OWNEROS-003`.

Scope:

- Work member detail and allowed CRUD/feedback/file/agent paths;
- Research thread/source/evidence/note/output persistence and sharing;
- Company private-thinking and formal-shared-knowledge lanes;
- per-module AI chat/context and source-linked results;
- explicit empty/loading/error/forbidden/mock/unavailable states.

Exit:

- Owner and member complete a shared Work journey.
- A Research workflow survives reload and supports governed reuse.
- Private Company thinking stays private; approved formal knowledge becomes visible only to intended readers.
- Core modules contain no silent mock fallback in formal mode.

Stop:

- Apply OD-02 from the Owner decision packet; production schema/apply and final shared Company writes still require their normal high-risk review and approval.

### Stage 4 — External Source Continuity

Primary dependencies: `AIINPUT-CONN-007`, `AIINPUT-CONN-009`, `AIINPUT-CONN-011` and the selected source-workflow persistence tasks.

Scope:

- LINE bot/webhook intake and reply boundary;
- Google Drive authorized selection/sync;
- Gmail account/label/sender/query selection and sync;
- provider account, secret reference, connection, cursor, run evidence, revoke and audit;
- source identity and provenance into conversation/module workflows.

Exit:

- Each provider completes one consent/setup, selected ingest, provenance, revoke and failure-recovery proof.
- Provider limitations are accurately represented in UI.
- No secret or raw sensitive payload appears in client DTOs, logs, or audit summaries.

Stop:

- OAuth, webhook, polling, provider APIs and production secret writes require connector runtime approval and reviewed deployment configuration.

### Stage 5 — Inbox, Agent Runtime, Diary, And Skill Loop

Primary tasks: `OWNEROS-004`, `OWNEROS-005`; dependencies include the `AGENT`, `EVENTOPS`, `DATTR`, and `AIDEVTEAM` contract families.

Scope:

- protected internal AgentTask/AgentMessage execution path;
- Inbox free-text reply/follow-up routed to origin;
- action preview, risk/policy evaluation, result and audit;
- owner-configured low-risk administrative auto-write catalog;
- agent journal entries and daily/weekly summaries;
- completed task/source/blocker/next-action evidence;
- Rule/Skill candidate review, version, activation and rollback.

Exit:

- An agent can ask asynchronously, the user can answer in text, and the originating task continues.
- Every core agent shows a sourced daily summary and weekly rollup.
- A repeated correction can become a candidate, be approved, activated, and rolled back with audit.
- High-risk/formal/shared writes cannot bypass review.

### Stage 6 — Internal AI Public Space

Primary task: `OWNEROS-006`.

Scope:

- manually or safely scheduled discussion task;
- selected Work AI participants;
- approved goal and scoped context package;
- member position/role perspective;
- full human-readable transcript and intervention;
- Company Internal/C-level filtering;
- proposal-only downstream results by default;
- retention, pause, cancel and audit.

Exit:

- Multiple internal Work AIs discuss one approved goal using only approved context.
- All intended Team members can read/intervene; non-C-level members cannot infer C-level content.
- Every proposal links to its transcript/context and requires the correct downstream approval.

Stop:

- Apply OD-01, OD-03, and OD-04 from the Owner decision packet; AI-initiated and scheduled runs must remain visible, pauseable, rate-limited, fully transcribed, inside an approved policy envelope, and proposal-only downstream.
- No cross-organization participants, external agent endpoint, or registry write.

### Stage 7 — Named Internal Pilot And Production Proof

Primary task: `OWNEROS-007`.

Scope:

- private deployed environment;
- owner plus every active company member, with at least one invited non-owner (current named pilot: Owner plus one marketing partner);
- scripted integrated acceptance journey;
- isolation/adversarial tests;
- migration, backup/restore, monitoring, provider failure, revoke/offboard proof;
- pilot feedback and launch decision.

Exit:

- All `RPT-062 §3.4` launch-critical gates pass with evidence.
- Pilot members can use the product without reverting to mock state for the core journey.
- No unresolved P0 privacy, C-level, permission, file, source, AI context, or offboarding leak remains.

Formal launch level changes only through the existing launch review process and owner-provided proof.

## 5. Executable Task Shape

| Task ID | Title | Priority | Risk | Status | Dependencies | Acceptance summary |
|---|---|---:|---|---|---|---|
| `OWNEROS-001` | Scenario-system contraction audit and staged plan | P0 | Low | DONE | Owner direction, code/docs audit | `RPT-062`, `PLN-067`, backlog/acceptance/index/evidence updates exist; no runtime claim |
| `OWNEROS-002` | Durable unified/module chat and authorized ContextPackage first slice | P0 | High | TODO | Auth/session proof, conversation research/schema/auth review | Protected persisted conversation reloads; references are server-authorized; direct AI action is authenticated/audited |
| `OWNEROS-003` | Cross-surface visibility lattice and C-level contract | P0 | High | TODO | OD-01/OD-02/OD-04 recorded; auth/schema review still required | Capability matrix, inheritance/declassification, AI/search/file negative fixtures; no production apply before review |
| `OWNEROS-004` | Inbox free-text async thread and low-risk action policy | P0 | High | TODO | `OWNEROS-002/003`, EVENTOPS/audit contracts | Reply returns to origin; action preview/result/audit exist; high-risk writes remain gated |
| `OWNEROS-005` | Agent diary, daily/weekly rollup, and Rule/Skill candidate loop | P1 | High | TODO | Durable agent task/message/audit runtime | Sourced diaries and rollups; reviewed versioned candidate activation/rollback |
| `OWNEROS-006` | Internal AI Public Space with scoped context and intervention | P1 | High | TODO | `OWNEROS-002/003/004`, OD-01/OD-03/OD-04 recorded | Full transcript/intervention; scoped context; C-level negative proof; proposal-only writes |
| `OWNEROS-007` | Owner plus every active member integrated pilot acceptance harness | P0 launch gate | High | TODO | Stages 1–6 and deployment readiness; at least one invited non-owner | All 12 `RPT-062 §3.4` gates produce owner/member evidence |

## 6. Existing Backlog Reuse

This plan does not duplicate established tasks. It composes them into one product journey:

- Auth/new member: `TEAMCOLLAB-006B`, `TEAMCOLLAB-006C`, `TENANT-005`, `AUTH-005` family.
- Work sharing: `TEAMCOLLAB-007`, `TEAMCOLLAB-008` and Work proof tasks.
- Research: `RESEARCH-*` DB/BFF/auth tasks.
- Company: `COMPANY-001` and future private/shared knowledge slices.
- Files: `R2STORE-*`, `MODLIB-*`, formal multi-module link persistence.
- Sources: `AIINPUT-CONN-007/009/011`, `DATTR-*` source-workflow persistence.
- Agent runtime/audit: `AGENT-*`, `EVENTOPS-*`, `AIDEVTEAM-*`.

When one of those task families changes the integrated user journey, it must also verify the relevant `OWNEROS` acceptance gate.

## 7. First Implementation Slice Recommendation

With the visibility/retention direction now recorded, the recommended first runtime slice is `OWNEROS-002` narrowly scoped to:

1. a protected UI-safe conversation/thread/message contract;
2. one Personal Private unified chat persisted behind `requireUser()`;
3. server-side reference resolution for one existing FileAsset or Work Project;
4. authenticated AI provider service call with an audit-safe context manifest;
5. reload, cross-owner denial, missing-reference and no-secret tests.

This slice creates the missing durable center without prematurely implementing Public Space, Company publication, connectors, or skill activation.

## 8. Verification Expectations

Documentation stage (`OWNEROS-001`):

```bash
git diff --check
test -f docs/06_audits-and-reports/RPT-062_scenario-system-contraction-and-internal-sharing-gap-audit.md
test -f docs/05_execution-plans/PLN-067_owner-ai-work-desktop-and-company-sharing-contraction-plan.md
rg "OWNEROS-00[1-7]" docs/05_execution-plans/PLN-060_task-backlog.md tasks.md docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md
```

Runtime stages must add the smallest relevant type, contract, authorization, schema, integration, browser, and negative-isolation proof. Documentation alone cannot close a runtime task or change the formal launch level.

## 9. Ten-Minute Gate Automation

`OWNEROS-AUTO-001` updates the existing `personal-os-20m-aggressive-launch-loop` heartbeat rather than creating a duplicate:

- cadence: every 10 minutes in the same Codex task;
- authoritative prompt: `docs/2_agent-input/generated/agent-loop/prompts/owner-ai-work-desktop-gate-loop.md`;
- machine state: `docs/2_agent-input/generated/agent-loop/gates/owner-ai-work-desktop-gate-state.json`;
- sub-agents: at most three bounded independent explorer/trust/QA roles, or one disjoint worker replacing one reviewer;
- overlap safety: run lease plus dirty-path/hash gate; shared state/governance files remain primary-agent owned;
- completion: binary/all-of runtime evidence for Gate A owner use, Gate B team pilot, and Gate C hardened internal rollout;
- email: one authorized Gate A completion message to Gmail `to: "me"`, with deterministic notification id, Sent reconciliation, Markdown attachment, proof path/hash, and fail-closed retry behavior;
- release baseline: normal heartbeats run only from the dedicated clean release worktree/branch recorded in the gate prompt;
- UI control: `REF-003` is the only Screen ID source; no product-page edit without an owner-named UI ID and approved screen proposal;
- stop: Owner decisions resolve the product direction, but production DB/provider/deploy/public/high-risk writes and new ambiguities remain approval-gated.

The setup itself sends no email and does not advance any delivery gate.
