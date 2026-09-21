# External Source Connection Multistep And Multi-Account Management Research

**Document ID:** `RES-027`  
**Last updated:** 2026-07-27  
**Status:** Research complete / implementation tasks ready / no connector runtime enabled  
**Trigger:** Owner requested that the standalone Google Docs source be replaced by Google Drive folder connections, and asked for a multistep popup plus management model for LINE, Google Drive, RSS, Gmail, GitHub, Telegram, and multiple linked external accounts.

---

## 1. Decision Summary

The source settings surface should adopt the following product decisions:

1. **Remove Google Docs as a standalone connection choice.**
   - The user connects a Google account and selects one or more **Google Drive folders**.
   - Google Docs, Sheets, Slides, PDFs, Office files, images, and other supported files are file subtypes discovered inside the approved Drive scope.
   - A native Google Doc still preserves its Drive file ID, MIME type, revision/modified time, and export/snapshot provenance. It is not a second provider account or a second top-level connector.
2. **Separate provider account authorization from source connection scope.**
   - `Google account`, `GitHub App installation`, `LINE Official Account channel`, and `Telegram bot` are credential/account-level objects.
   - `Drive folder`, `GitHub repository`, `LINE group`, `Telegram chat`, `Gmail label/query`, and `RSS feed URL` are separately manageable source connections.
3. **Support many connections per provider and many connections per authorized account.**
   - One Google account may own several Drive-folder connections.
   - The owner may connect two Google accounts and assign different folders/modules/policies to each.
   - One GitHub App may be installed for a personal account and several organizations, with separate repository connections.
   - RSS normally has no provider account; every validated feed is its own connection.
4. **Use two distinct interaction patterns.**
   - `新增連線` opens a **multistep setup modal**.
   - `管理` opens a **connection detail drawer/modal** for an already-created connection.
   - Account-level actions such as reconnecting or revoking credentials must not be mixed with per-folder/per-feed sync policy editing.
5. **Keep runtime disabled in this research pass.**
   - No OAuth callback, webhook, polling job, provider API call, secret write, database mutation, public output, final module write, or external agent registration is authorized by this document.

This corrects the current screenshot and source-control rows without discarding the useful source identity rules already documented in `ARC-015`.

---

## 2. Strategic Review Gate

### 2.1 Current product target

- Formal launch level: `L0_LOCAL_PROTOTYPE`.
- Conditional product maturity: `C3_ARCHITECTURE_GATE_READY`.
- Next formal target: `L1_PRIVATE_ONLINE_WORK_OS`.
- This task advances the AI Input owner/settings operating surface and the Phase 4 source-workflow target. It does not claim launch proof.

### 2.2 Last-three-loop delta

- Loop 203 proved the additive team-collaboration schema and backfill in disposable PostgreSQL.
- Loop 204 added the protected real Work workspace/project index.
- Loop 205 reconciled clean-history and configured-drift collaboration migration paths without touching the configured database.

### 2.3 Current blocker and anti-repetition result

Formal Auth, owner-run Work persistence, configured collaboration reconciliation, and deployment evidence remain larger launch blockers. The owner explicitly requested a new AI Input source-settings research artifact, so this loop is scoped as a product requirement correction and implementation-ready connector plan. It must not be mistaken for connector activation or launch proof.

### 2.4 Capability delta

After this research, the project has one coherent answer for:

- Google Drive folder connections instead of a separate Google Docs connector;
- provider account versus connection scope;
- setup wizard steps;
- multiple accounts and multiple scoped connections;
- provider-specific limitations;
- BFF, authorization, audit, secret, and rollout boundaries;
- executable implementation tasks.

---

## 3. Current Local Audit

### 3.1 Existing strengths

The current `/ai-input` implementation already contains:

- a `同步設定` source index;
- selectable rows and a settings drawer;
- mock connection state;
- five settings categories for sync, thinking nodes, routing, approval, and governance;
- a protected formal source-control matrix;
- source workflow, connector approval, RLS/audit, and cutover readiness contracts;
- an existing `SourceConnection` Prisma model with owner, provider, display name, status, input mode, secret reference, provider account reference, timestamps, retention, redaction version, and metadata.

Relevant local sources:

- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- `src/lib/services/ai-input-readiness.service.ts`
- `src/types/ai-input-readiness.ts`
- `prisma/schema.prisma`
- `ARC-015_source-connection-adapter-contract.md`
- `ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `AUT-001_source-intake-security-privacy.md`
- `AUT-006_ai-input-source-workflow-rls-audit-storage.md`
- `AUT-007_ai-input-source-workflow-connector-runtime-approval.md`
- `DBS-002_source-workflow-schema-contract.md`
- `RES-012_source-settings-operating-surface-redesign-research.md`

### 3.2 Current gaps

| Gap | Current symptom | Required correction |
|---|---|---|
| Provider and scope are conflated | One table row behaves like provider, account, and selected source at the same time | Model provider account and connection scope separately |
| Google Docs is duplicated | Drive and Google Docs appear as independent connection rows | Present Google Drive folders only; treat Docs as a Drive file subtype |
| Add and manage flows are conflated | Clicking a row opens policy settings, but there is no first-time authorization/scope wizard | Add a separate multistep `新增連線` flow |
| Multi-account identity is unclear | A row has no obvious account label or credential reuse decision | Show provider account label, account health, and connection count |
| Multi-connection actions are absent | No grouped view, duplicate prevention, bulk test, or impact preview | Add account and connection management operations |
| Auth health and sync health are mixed | A connection may look failed without explaining whether OAuth, webhook, scope, or sync failed | Separate `accountAuthStatus` from `connectionHealth` |
| Existing schema is too compressed | `providerAccountRef`, `secretRef`, and `metadata` carry several concerns | Introduce a reviewed account/credential/scope split before runtime |
| Formal and mock naming drift | Mock UI has both Drive and Docs; formal matrix has Docs but no Drive folder row | Normalize both contracts around Drive folder connections |

### 3.3 Important compatibility note

`GOOGLE_DOCS` can remain temporarily in the existing `SourceProvider` enum for migration compatibility and source provenance. New connection creation should not offer it. A later schema task must inventory existing rows before removing or remapping the enum:

```txt
legacy SourceConnection.provider = GOOGLE_DOCS
  -> provider = GOOGLE_DRIVE
  -> scope.kind = drive_folder | drive_file
  -> asset MIME/type preserves Google Docs identity
  -> metadata.legacyProvider = GOOGLE_DOCS when needed for audit
```

Do not delete the enum or rewrite persisted rows during the UI correction task.

---

## 4. Page Requirement Understanding Score Gate

### 4.1 Initial score

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 17/20 | Owner wants to connect and manage named external sources, including multiple accounts |
| PRD/local evidence fit | 17/20 | AI Input source settings, adapter contract, and safety gates already exist |
| Data/BFF/API clarity | 13/20 | Existing `SourceConnection` exists, but provider account, credential, and scope are conflated |
| UI/reference confidence | 11/15 | Existing drawer is useful; first-time setup and account management are undefined |
| Risk/auth/public-output clarity | 12/15 | Strong stop gates exist, but provider-specific auth constraints differ materially |
| Acceptance/verification clarity | 8/10 | Static/UI checks are clear; provider runtime proof must be split by provider |
| **Initial total** | **78/100 — Medium** | Four research optimization rounds required |

### 4.2 Research optimization rounds

| Round | Lens | Finding | Requirement refinement |
|---|---|---|---|
| 1 | Local PRD/code fit | The current page already has a settings drawer and source matrix; the missing surface is setup plus multi-instance identity | Reuse the current index and detail drawer; add a dedicated setup wizard and account grouping |
| 2 | Comparable connection management | Zapier supports multiple accounts per app and central test/reconnect/rename/delete operations; Notion separates a connection catalog from workspace/page scope | Add account-level management, connection counts, status filters, rename/test/reconnect/revoke, and explicit scope assignment |
| 3 | Provider topology | Drive, Gmail, GitHub, LINE, and Telegram do not share one authorization/discovery pattern | Use a shared wizard shell with provider-specific step definitions, not one generic form |
| 4 | BFF/auth/security/acceptance | Tokens, webhook secrets, account subjects, and provider payloads cannot live in Client Component state or UI DTOs | Use server-only authorization/callback/services, redacted DTOs, idempotency, audit events, and provider-by-provider approval |

### 4.3 Final score

| Dimension | Final score |
|---|---:|
| Actor/job clarity | 19/20 |
| PRD/local evidence fit | 19/20 |
| Data/BFF/API clarity | 18/20 |
| UI/reference confidence | 14/15 |
| Risk/auth/public-output clarity | 14/15 |
| Acceptance/verification clarity | 9/10 |
| **Final total** | **93/100 — High** |

The page issue is ready to become executable task shape.

---

## 5. Target Domain Model

### 5.1 Four-layer connection model

```txt
InputAdapterManifest
  -> ProviderAccount
    -> CredentialReference
    -> SourceConnection
      -> SourceScopeVersion
      -> SourceProcessingPolicy
      -> SourceSyncCursor / ProviderEventCursor
      -> InputAdapterRun / AIWorkflowRun
```

| Object | Responsibility | Example |
|---|---|---|
| `InputAdapterManifest` | Static provider capabilities and required setup steps | Google Drive supports OAuth, folder selection, file changes, export |
| `ProviderAccount` | Owner-visible authorized identity or installation | `owner@gmail.com`, GitHub installation for `nuva-club`, LINE OA channel |
| `CredentialReference` | Server-only encrypted/vault reference and token lifecycle metadata | Google refresh-token reference, GitHub App installation reference, bot-token reference |
| `SourceConnection` | One independently managed source boundary | `Personal OS 研究` Drive folder, `客戶信件` Gmail query, one GitHub repo |
| `SourceScopeVersion` | Versioned provider-native scope | folder ID + includeSubfolders, repo ID + branch/glob, chat ID |
| `SourceProcessingPolicy` | Sync, analysis, module routing, risk, retention, and review policy | daily sync, Research target, always require approval |
| `SourceSyncCursor` | Incremental progress separate from dedupe identity | Drive page token, Gmail history ID, Telegram update ID |
| `InputAdapterRun` | One test, preview, import, sync, pause, revoke, or recovery run | Drive preview returns 18 eligible files |

### 5.2 Cardinality

```txt
Profile 1 ── * ProviderAccount
ProviderAccount 1 ── * SourceConnection
SourceConnection 1 ── * SourceScopeVersion
SourceConnection 1 ── 1 active SourceProcessingPolicy
SourceConnection 1 ── * InputAdapterRun

RSS SourceConnection 0 ── 1 ProviderAccount
```

Rules:

- The same provider may have several `ProviderAccount` rows.
- The same `ProviderAccount` may serve several `SourceConnection` rows.
- A credentialless source such as public RSS has no `ProviderAccount`.
- One source connection has one independently reviewable policy boundary.
- Multiple folders selected in one wizard may create several connection drafts with shared default policy, so each folder can later be paused, rerouted, or revoked independently.

### 5.3 Stable identity and duplicate prevention

Recommended logical keys:

```txt
providerAccountIdentity =
  ownerProfileId + provider + providerTenantOrInstallationId + providerSubject

sourceScopeFingerprint =
  providerAccountId? + provider + normalizedProviderScope
```

Examples:

- Drive: account subject + folder ID + shared-drive ID when applicable.
- Gmail: account subject + normalized label IDs + normalized query + thread mode.
- GitHub: installation ID + repository ID + branch + normalized glob.
- LINE: channel ID + group/room ID.
- Telegram: bot identity + chat ID.
- RSS: canonical feed URL.

The UI must block an exact duplicate scope under the same provider account, but may allow the same visible name when the provider-native identity differs.

---

## 6. Target Information Architecture

### 6.1 Source connections index

The source index remains a dense operational table, but each row represents a **connection instance**, not a provider family.

Recommended columns:

| Column | Content |
|---|---|
| Connection | User-defined name and provider icon |
| Account | Redacted account label or `No account required` |
| Scope | Folder, label/query, repo, group/chat, or feed |
| Auth | Connected, reauthorization required, revoked, not applicable |
| Sync | Healthy, running, stale, paused, failed |
| Policy | Cadence, target module, risk/review level |
| Last/next | Last successful run and next scheduled attempt |
| Actions | Manage, test, pause/resume, overflow menu |

Provider grouping is optional presentation only. It must not collapse several connection instances into one fake row.

### 6.2 Header actions

```txt
[新增連線] [篩選：Provider / Account / Status / Module] [搜尋]
```

Summary counts should distinguish:

- accounts requiring reauthorization;
- active connections;
- paused connections;
- degraded/failed connections;
- draft/setup-incomplete connections;
- high-risk connections awaiting approval.

### 6.3 Account manager

A secondary `管理外部帳號` surface groups authorization identities:

```txt
Google Drive
  owner@gmail.com        Connected       3 folder connections
  research@school.edu    Reauth required 1 folder connection

GitHub
  Personal installation Connected       2 repositories
  nuva-club org         Connected       4 repositories
```

Account-level actions:

- rename local account label;
- test authorization;
- reconnect the same provider subject;
- connect another account;
- inspect granted scopes and last authorization time;
- view dependent connection count;
- revoke account access after dependency impact preview.

The UI must not display refresh tokens, bot tokens, webhook secrets, raw claims, provider account IDs, or secret references.

---

## 7. New Connection Multistep Modal

### 7.1 Shared six-step shell

```txt
1 Provider
  -> 2 Account / credential
  -> 3 Scope
  -> 4 Sync and analysis
  -> 5 Routing, risk, and retention
  -> 6 Review, test, and create
```

The number and label of visible steps may vary by provider, but the underlying state machine remains shared.

### 7.2 Step 1 — Choose provider

Show:

- LINE
- Google Drive
- RSS / Atom
- Gmail
- GitHub
- Telegram

Do not show Google Docs as a provider. Under Google Drive, explain:

> 選擇 Google Drive 資料夾；資料夾內的 Google Docs、Sheets、Slides、PDF 與其他核准檔案類型會依設定納入。

Each provider card shows:

- availability: mock, contract ready, approval required, unavailable;
- auth mode: OAuth, GitHub App, bot/channel secret, or no account;
- supported source scope;
- default risk;
- runtime readiness.

### 7.3 Step 2 — Account or credential

Options:

- `使用已連接帳號`
- `連接另一個帳號`
- `新增 Bot / Channel 設定`
- `不需要帳號` for RSS

OAuth behavior:

- start from a server-generated state/PKCE transaction;
- open a provider authorization window or redirect;
- resume the draft only after the server validates callback state;
- use explicit account selection when supported;
- never store authorization codes, tokens, or provider secrets in React state or localStorage.

If the browser reconnects the same provider subject, the system should offer:

- refresh the existing authorization; or
- return to account selection.

It should not create an indistinguishable duplicate account record.

### 7.4 Step 3 — Select scope

Provider-specific picker fields are defined in section 9.

Shared rules:

- preview a human-readable scope;
- store provider-native IDs only on the server;
- show whether subfolders, attachments, replies, branches, or full content are included;
- calculate a duplicate fingerprint before continuing;
- warn when a scope is broader than the stated connection name;
- show unavailable permissions before activation;
- support multi-select only when the result can be represented as independently manageable connection drafts.

### 7.5 Step 4 — Sync and analysis

Separate two schedules:

- **Sync:** when external data is discovered or retrieved.
- **Analysis:** when Personal OS proposes classification, summaries, tasks, or other review items.

Fields:

- manual, polling/scheduled, or provider event mode;
- timezone;
- safe presets before custom cron;
- analyze only when new data exists;
- initial import mode: none, latest N items/days, preview-selected;
- retry/backoff summary;
- pause-by-default when runtime approval is absent.

Do not label LINE/Telegram webhook intake or Drive/Gmail provider notifications as guaranteed full synchronization. Provider notifications may be delayed, duplicated, dropped, or contain only a change signal.

### 7.6 Step 5 — Routing, risk, and retention

Fields:

- default target module;
- allowed proposal modules;
- risk level;
- approval rule;
- PII masking/redaction policy;
- raw source retention;
- attachment inclusion;
- morning brief behavior;
- public-output prohibition;
- high-risk module stop condition.

Defaults:

- external source results remain proposals;
- no final module write;
- no Client Portal/public output;
- Gmail, private messaging, and private repositories default to high risk;
- RSS defaults to low/medium risk but full-content fetching still requires URL safety controls;
- Finance, Life, Company Strategy, Auth/Permission, and public output always retain human approval.

### 7.7 Step 6 — Review, test, and create

Review:

- provider and account label;
- exact source scope;
- requested permissions;
- sync and analysis policy;
- target modules;
- retention/privacy;
- unsupported or blocked behavior;
- number of connection drafts to create.

Actions:

- `測試連線`
- `儲存為草稿`
- `建立並保持暫停`
- `建立並啟用` only after provider-specific runtime approval and proof

The first implementation should expose only draft/mock-safe actions.

### 7.8 Success state

After creation:

```txt
已建立 3 個 Google Drive 資料夾連線草稿

[管理連線] [再新增一個來源] [關閉]
```

The success state must name which items remain awaiting authorization, scope test, or owner approval.

---

## 8. Existing Connection Management

The existing five-tab drawer is useful and should evolve instead of being replaced.

Recommended tabs:

1. `總覽與帳號`
2. `來源範圍`
3. `同步與分析`
4. `路由、風險與治理`
5. `健康度與紀錄`

### 8.1 Safe actions

- rename connection;
- edit local description;
- test scope/readiness;
- update policy in mock/draft mode;
- pause/resume approved runtime;
- inspect recent run summaries;
- reconnect authorization;
- duplicate policy into another scope;
- archive a connection.

### 8.2 Destructive or high-impact actions

These require an impact preview and confirmation:

- replace provider account;
- revoke provider account;
- delete connection;
- reduce scope when imported assets still reference removed items;
- change retention or redaction policy;
- enable attachments or full message bodies;
- enable provider runtime;
- add a public-output or high-risk module path.

### 8.3 Account versus connection revocation

| Action | Effect |
|---|---|
| Delete/archive one connection | Stops that scope; does not revoke a shared provider account |
| Revoke provider account | Stops all dependent connections and marks each as authorization unavailable |
| Reauthorize same account | Refreshes account credentials without changing connection identity |
| Replace account | Requires dependency preview and per-connection scope revalidation |

Existing internal SourceAssets and provenance are not silently deleted when a connection or account is revoked.

---

## 9. Provider-Specific Setup Shapes

### 9.1 Google Drive folder

**Connection choice:** Google account -> Drive folder.  
**Do not expose:** Google Docs as a top-level connector.

Setup:

1. Choose existing Google account or connect another account.
2. Select one or more Drive folders.
3. Set `includeSubfolders`.
4. Choose supported MIME/file families.
5. Preview accessible files and permission gaps.
6. Configure sync/analysis/routing.

Technical rules:

- A folder is a Drive file with MIME type `application/vnd.google-apps.folder`.
- Files directly under a folder can be queried with `'<folderId>' in parents`; recursive traversal requires explicit traversal logic.
- Native Google Workspace files are exported/snapshotted using Drive export behavior; downloaded blob files use the normal file-content path.
- Preserve Drive file ID, MIME type, parent folder IDs, modified time/revision signal, shortcut target, shared-drive context, and download capability.
- Drive Changes API page tokens belong to the account/change feed; connection filtering must re-evaluate whether a changed file is inside each approved folder scope.
- Push notifications indicate that a resource/change feed changed; they are not a complete file payload and notification channels expire.
- Prefer `drive.file` plus Google Picker where the required folder/file access is genuinely sufficient.
- **Do not assume** that selecting a folder with `drive.file` automatically grants safe access to every current and future descendant. `AIINPUT-CONN-007` must prove the selected scope behavior. If the use case requires `drive.readonly`, stop for restricted-scope verification/security assessment and owner approval.

Multi-connection example:

```txt
owner@gmail.com
  -> Drive / Personal OS 研究 -> Research -> daily
  -> Drive / 客戶 A 專案      -> Work     -> manual

research@school.edu
  -> Drive / 博論資料          -> Research -> daily
```

### 9.2 RSS / Atom

**Account:** none by default.  
**Connection scope:** one canonical feed URL.

Setup:

1. Enter URL.
2. Perform URL-safety and SSRF checks.
3. Discover RSS/Atom endpoint when safe.
4. Parse title and sample entries.
5. Confirm canonical URL and polling cadence.
6. Configure full-content candidate policy separately from feed summary ingestion.

Preserve:

- feed URL and canonical URL;
- entry ID/GUID, link, published/updated timestamps;
- ETag/Last-Modified when available;
- content hash and category/author metadata.

Do not equate disappearance from a feed with confirmed external deletion.

### 9.3 Gmail

**Account:** Google OAuth account.  
**Connection scope:** mailbox plus labels/query/thread mode.

Setup:

1. Choose or connect Google account.
2. Select labels and/or enter a Gmail query.
3. Choose message or thread mode.
4. Choose attachment and quoted-content boundaries.
5. Preview metadata and requested scope.
6. Configure polling/history-based sync.

Rules:

- `gmail.metadata` exposes headers/labels but not message body.
- Full email analysis normally requires `gmail.readonly`, which Google classifies as a restricted scope.
- If restricted-scope data is stored or transmitted by the server, verification and security-assessment obligations apply.
- Do not request `gmail.modify` for read-only ingestion.
- Incremental sync uses history IDs; push uses Cloud Pub/Sub and watch expiration/renewal, and it still requires history retrieval plus a fallback for delayed/dropped notifications.
- Gmail should be the last provider pilot in this group because email bodies and attachments have the highest privacy and verification cost.

### 9.4 GitHub

**Account:** GitHub App installation, possibly with user authorization when a user-context action is truly needed.  
**Connection scope:** one or more selected repositories; connection instance should normally be one repository plus branch/glob policy.

Setup:

1. Select an existing GitHub App installation or install on another personal/org account.
2. Confirm selected repositories.
3. Pick repository, default branch, and allowed path globs.
4. Choose source kinds such as Markdown, issues, PRs, releases, or code.
5. Configure webhook or manual sync policy.

Rules:

- Prefer a GitHub App with minimum repository permissions and selected repositories.
- Read-only source ingestion should start with repository metadata and `Contents: read`; do not request write permissions.
- Private repository access is installation-scoped.
- Verify webhook signatures with `X-Hub-Signature-256`.
- Governance files such as `AGENTS.md` and `SKILL.md` remain reference/proposal inputs; no silent repo overwrite.

### 9.5 LINE

**Account topology:** LINE Official Account + Messaging API channel, not arbitrary personal LINE history OAuth.  
**Connection scope:** one discovered group/room or approved one-to-one source.

Setup:

1. Register/select LINE Official Account channel configuration.
2. Store channel secret/access-token references on the server.
3. Verify webhook endpoint readiness and signature policy.
4. Enable bot group participation and invite the Official Account.
5. Discover group/room ID from verified webhook events.
6. Name and approve the connection scope.

Rules:

- LINE sends new chat events to the registered webhook.
- Verify the webhook signature before parsing.
- Use webhook event IDs for dedupe; redelivery can be duplicated or out of order.
- LINE does not provide a general API for importing historical group text. Text must be captured when the verified webhook arrives.
- Unsend events require an explicit provenance/retention response.
- The UI must say `從啟用後開始接收`, not `同步整個 LINE 群組歷史`.

### 9.6 Telegram

**Account topology:** Telegram Bot created through BotFather, not a full personal Telegram account mirror.  
**Connection scope:** bot + selected chat/channel/group.

Setup:

1. Add bot credential reference.
2. Test bot identity.
3. Choose webhook or long polling; never both.
4. Configure webhook secret token and allowed update types when webhook is used.
5. Add bot to the target chat and verify permissions/privacy mode.
6. Discover and approve chat ID.

Rules:

- `setWebhook` and `getUpdates` are mutually exclusive.
- Use the webhook secret header and update ID/message ID dedupe.
- Bot privacy mode changes which group messages are visible.
- Make the privacy-mode limitation visible before activation.
- Do not claim access to messages the bot was never entitled to receive.

---

## 10. BFF-First Contract

### 10.1 Read models

```ts
type ProviderAccountSummaryDto = {
  id: string
  provider: "google_drive" | "gmail" | "github" | "line" | "telegram"
  accountLabel: string
  authStatus: "connected" | "reauth_required" | "revoked" | "error"
  grantedScopeLabels: string[]
  connectionCount: number
  lastAuthorizedAt: string | null
  secretMaterialRedacted: true
}

type SourceConnectionSummaryDto = {
  id: string
  provider: "google_drive" | "rss" | "gmail" | "github" | "line" | "telegram"
  displayName: string
  account: ProviderAccountSummaryDto | null
  scopeLabel: string
  lifecycleStatus: string
  healthStatus: string
  cadenceLabel: string
  targetModuleLabel: string
  riskLabel: string
  lastSyncAt: string | null
  nextSyncAt: string | null
  allowedActions: string[]
}
```

### 10.2 Setup actions

| BFF operation | Purpose |
|---|---|
| `listInputAdapterManifests()` | Provider availability, step schema, scopes, and runtime status |
| `listProviderAccounts(provider?)` | Redacted authorized accounts/installations |
| `beginProviderAuthorization(provider, draftId)` | Server-generated OAuth/install transaction |
| `completeProviderAuthorization(callback)` | Validate state/PKCE/callback and store secret reference |
| `createSourceConnectionDraft(provider)` | Start owner-scoped draft |
| `discoverSourceScopes(draftId, input)` | Server-side folder/repo/chat/label discovery |
| `previewSourceScope(draftId, scope)` | UI-safe preview and missing permissions |
| `saveSourceConnectionPolicy(draftId, policy)` | Save reviewed draft policy |
| `testSourceConnectionDraft(draftId)` | No-module-write provider/scope test |
| `activateSourceConnection(draftId)` | Separate owner-approved activation gate |

### 10.3 Management actions

| BFF operation | Purpose |
|---|---|
| `renameProviderAccount(accountId, label)` | Local display label only |
| `testProviderAccount(accountId)` | Auth health test |
| `reauthorizeProviderAccount(accountId)` | Reconnect same provider subject |
| `listProviderAccountDependencies(accountId)` | Impact preview before revoke/replace |
| `revokeProviderAccount(accountId)` | Stop all dependent connections with audit |
| `updateSourceConnectionScope(connectionId, scope)` | Version scope after duplicate/authz check |
| `updateSourceConnectionPolicy(connectionId, policy)` | Update sync/analysis/risk settings |
| `pauseSourceConnection(connectionId)` | Stop scheduled/provider activity |
| `resumeSourceConnection(connectionId)` | Resume only when approved and healthy |
| `archiveSourceConnection(connectionId)` | Stop scope without deleting provenance |
| `runSourceConnectionTest(connectionId)` | Readiness/preview test, not module write |
| `listInputAdapterRuns(connectionId)` | Health and audit summaries |

### 10.4 Mandatory BFF rules

Every operation must:

- call `requireUser()`;
- enforce owner/workspace authorization in the service layer;
- validate provider-specific input server-side;
- return UI-safe DTOs;
- keep provider secrets and raw payloads server-only;
- use state/PKCE or installation callback validation where applicable;
- apply idempotency to callback, draft creation, test, activation, and webhook/event intake;
- write append-only audit events before runtime activation can be approved;
- avoid final module writes;
- fail closed without mock fallback in formal mode.

---

## 11. Data And Migration Proposal Boundary

The existing schema should not be mutated directly from this research. The follow-up schema review should evaluate:

```txt
ProviderAccount
  id
  ownerProfileId
  provider
  providerSubjectHash / installationId
  accountLabel
  authStatus
  grantedScopes
  credentialRef
  credentialVersion
  lastAuthorizedAt
  revokedAt

SourceConnection
  providerAccountId nullable
  provider
  displayName
  lifecycleStatus
  healthStatus
  activeScopeVersionId
  activePolicyVersionId
  lastSuccessfulRunAt
  nextRunAt

SourceScopeVersion
  sourceConnectionId
  version
  scopeKind
  normalizedScope
  scopeFingerprint
  approvedByProfileId
  createdAt

SourceProcessingPolicyVersion
  sourceConnectionId
  version
  syncPolicy
  analysisPolicy
  routingPolicy
  riskPolicy
  retentionPolicy
  approvedByProfileId

ProviderCredentialAudit
  providerAccountId
  action
  result
  scopeDigest
  actorProfileId
  createdAt
```

The review must decide whether to:

- add first-class tables;
- evolve the current `SourceConnection` additively while keeping secrets referenced externally;
- use version tables immediately or start with append-only audit plus current projections.

Stop before migration apply, existing `GOOGLE_DOCS` row conversion, secret migration, token storage, or provider runtime.

---

## 12. Lifecycle And Health States

### 12.1 Account authorization

```txt
not_connected
authorizing
connected
reauth_required
scope_change_required
revoked
error
```

### 12.2 Connection lifecycle

```txt
draft
awaiting_authorization
awaiting_scope
awaiting_test
awaiting_approval
active
paused
revoked
archived
```

### 12.3 Connection health

```txt
unknown
healthy
running
stale
permission_error
rate_limited
provider_error
webhook_error
failed
```

Account authorization, connection lifecycle, and sync health must be separate fields. A paused connection can still have healthy credentials; one expired Google account can make several Drive/Gmail connections unavailable.

---

## 13. Security, Privacy, And Approval Rules

- Tokens and bot/channel secrets must be stored only as reviewed backend secret references or encrypted/vault-backed records.
- Client Components must never receive credential references, OAuth codes, refresh/access tokens, bot tokens, webhook secrets, raw claims, raw provider payloads, or unrestricted external IDs.
- OAuth uses authorization code flow, PKCE where applicable, state binding, exact redirect validation, offline-access review, incremental authorization, and revocation.
- Provider scope increases require a new approval event; do not silently broaden an existing account.
- Webhooks require raw-body/provider-specific verification before JSON trust, replay protection, idempotency, and asynchronous processing.
- RSS and any external URL require SSRF, redirect, private-network, credential-bearing URL, size, content-type, and timeout policy.
- Connection tests and previews must not create final module records.
- Source removal/revocation preserves provenance unless a reviewed retention/deletion policy requires removal.
- External messages, email, files, and private repositories remain private owner context.
- Client Portal/public output remains blocked.
- Finance, Life, Company Strategy, Auth/Permission, and cross-organization external sharing remain `HUMAN_APPROVAL_REQUIRED`.

---

## 14. NANDA Agent Protocol Gate

This task affects AI Input and future IngestionAgent source capabilities.

| AgentFacts-lite field | Impact |
|---|---|
| Identity/provider/lifecycle | No new agent identity or provider runtime |
| Capabilities | Future `source-connection-draft-management`, `source-scope-preview`, and `source-connection-health-review` |
| Skills | Provider-specific setup/preview skills remain proposal-only |
| Endpoints/protocols | No public agent endpoint; future provider OAuth/webhook endpoints are connector endpoints, not agent registration endpoints |
| Auth/trust | Protected owner-only account/scope management; provider secrets remain server-only |
| Observability | Setup, test, activation, pause, revoke, scope change, and runtime errors require audit/trace refs |
| Registry | Internal/protected-owner visible only |
| External registration | `externalRegisterable: false` |

Concrete protocol-readiness artifact:

- the account/scope/BFF/trust boundary and executable task split in this document.

No external agent may access provider credentials, provider APIs, or Personal OS database rows directly.

---

## 15. Selected And Rejected Patterns

### Selected

- One setup wizard shell with provider-specific step manifests.
- A separate account manager and per-connection manager.
- One provider account reused across several scoped connections.
- One independently manageable connection per logical folder/feed/repo/chat/mailbox filter.
- Multi-select can produce several connection drafts with shared defaults.
- Google Drive folder is the connection; Google Docs is a file subtype.
- GitHub App with selected repositories and minimum permissions.
- Bot/channel topology for LINE and Telegram.
- RSS as a credentialless source connection.
- Provider-by-provider runtime rollout.
- Formal mode fails closed and never invents mock connections.

### Rejected

- One provider row that hides several accounts and scopes.
- One giant modal containing every provider field.
- Reusing the policy drawer as the first-time OAuth/setup flow.
- Treating Google Docs as a separate account/provider.
- Treating a Google Drive folder name as stable identity instead of folder ID.
- Assuming `drive.file` automatically covers all folder descendants.
- Requesting broad Drive/Gmail scopes before proving a narrower option.
- Using `gmail.modify` for read-only analysis.
- Personal access tokens as the default GitHub product integration.
- Claiming LINE or Telegram historical group sync.
- Storing provider tokens in `SourceConnection.metadata`.
- Revoking a shared provider account when deleting one connection.
- Activating all providers in one release or one approval action.
- Allowing connector results to write directly to module SSOT or public output.

---

## 16. Executable Task Shape

| Task ID | Scope | Acceptance | Likely files | Verification | Risk / stop conditions |
|---|---|---|---|---|---|
| `AIINPUT-CONN-001` | Create this research and task plan | `RES-027` is indexed; PRD/acceptance/task memory agree on Drive-folder and multi-account direction | `RES-027`, `MAN-001`, PRD, backlog/sprint/tasks/ACC, evidence | docs marker scan, link/format review, `git diff --check` | Docs only; no runtime |
| `AIINPUT-CONN-002` | Normalize mock/formal UI from Google Docs row to Google Drive folder connection | No standalone Google Docs row/provider label in source settings; native Docs explained as Drive file subtype; historical enum untouched | `ai-input-client.tsx`, `ai-input-readiness.service.ts`, source-control checker, types | typecheck, source-control check, build, browser smoke | UI/read-contract only; no schema/data rewrite |
| `AIINPUT-CONN-003` | Add mock multistep setup modal and multiple connection/account manager | Six-step provider-aware wizard, reusable accounts, several same-provider connections, account/connection status split, mock-only save/reset label | AI Input UI, new types/components/mock fixtures | typecheck, build, browser click-through, accessibility check | No OAuth/provider/DB; formal mode must not show mock rows |
| `AIINPUT-CONN-004` | Define typed BFF/provider-step manifest/account-scope contract and checker | Redacted DTOs, operation catalog, provider step manifests, duplicate fingerprint, impact preview, authz/audit/stop rules are machine-checkable | new contracts/types/checker, `ARC-031`, `AUT-007`, `ACC-002` | contract checker, typecheck, registry check | No route/callback/provider call/secret/DB |
| `AIINPUT-CONN-005` | Review additive schema/authz/audit migration shape | ProviderAccount/credential/scope/policy/run boundaries, legacy Docs mapping, RLS/app-authz, secret storage, rollback, proof target are approved before migration | new `SCH`/`AUT`/`MIG` artifact, Prisma draft only if separately approved | schema review checker, db validate/generate, disposable proof plan | Stop before valuable DB apply or secret migration |
| `AIINPUT-CONN-006` | Implement RSS as the first credentialless runtime pilot | One safe feed can be previewed/synced into Source Workflow staging with SSRF controls, cursor/dedupe, audit, pause/revoke, no module write | server service/adapter, route/action, safety tests, audit BFF | local/disposable integration, malicious URL fixtures, typecheck/build | Requires URL security approval; no full-page fetch by default |
| `AIINPUT-CONN-007` | Implement Google Drive folder pilot | OAuth/account reuse, folder selection, exact folder scope proof, file subtype/export mapping, changes cursor, reconnect/revoke, no module write | OAuth/callback/service/adapter, Drive picker UI, secret ref, tests | disposable/local callback contract, account/scope tests, owner-run provider proof | Owner approval; restricted-scope escalation if `drive.file` insufficient |
| `AIINPUT-CONN-008` | Implement GitHub App repository pilot | Installation/repository selection, Contents read, branch/glob scope, signature verification, cursor/dedupe, no repo write | GitHub App adapter/webhook/service, tests | signature fixtures, selected-repo negative tests, provider proof | Owner/org approval; no governance-file write |
| `AIINPUT-CONN-009` | Implement LINE group webhook pilot | OA/channel readiness, verified signature, group discovery, event dedupe/redelivery, future-only copy, unsend policy | LINE adapter/webhook/service, tests | signature/replay/order fixtures, owner-run group proof | Human approval; no historical sync claim or public output |
| `AIINPUT-CONN-010` | Implement Telegram bot chat pilot | Bot identity, privacy-mode disclosure, webhook secret, chat discovery, allowed updates, dedupe, pause/revoke | Telegram adapter/webhook/service, tests | secret/update fixtures, privacy-mode scenarios, provider proof | Human approval; webhook and polling cannot both run |
| `AIINPUT-CONN-011` | Implement Gmail read-only/history pilot | Account/label/query scope, least-privilege decision, history cursor, attachment boundary, reauth/revoke, no send/modify/module write | Gmail adapter/service, Pub/Sub only if separately approved, tests | restricted-scope review, history fixtures, owner-run provider proof | Highest privacy risk; security assessment/verification may block runtime |

Recommended sequence:

```txt
001 -> 002 -> 003 -> 004 -> 005
  -> 006 RSS
  -> 007 Drive
  -> 008 GitHub
  -> 009 LINE
  -> 010 Telegram
  -> 011 Gmail
```

Each provider activation remains a separate approval decision. Finishing the wizard does not authorize provider runtime.

---

## 17. Acceptance And Verification Plan

### Documentation/research acceptance

- Google Docs is explicitly removed from the top-level connection picker.
- Google Drive folder connection behavior covers native Google Docs as a file subtype.
- Account, credential, connection, scope, policy, cursor, and run concepts are distinct.
- Multiple accounts and multiple scoped connections are supported.
- Setup wizard and existing-connection management are separate.
- All six requested provider families have provider-specific steps and limitations.
- BFF/auth/audit/secret/NANDA boundaries are explicit.
- Implementation tasks contain scope, acceptance, files, verification, risks, and stop conditions.

### First UI slice verification

```bash
pnpm ai-input:source-control:check
pnpm exec tsc --noEmit --pretty false
pnpm build
git diff --check
```

Browser proof should cover:

1. `新增連線` opens the provider selector.
2. Google Drive shows existing accounts plus `連接另一個帳號`.
3. Selecting three folders creates three named mock drafts.
4. Two Google accounts remain distinguishable by redacted account labels.
5. Exact duplicate folder scope is blocked.
6. RSS skips the account step.
7. LINE/Telegram show bot/webhook and history limitations.
8. Gmail shows restricted-scope/privacy warning.
9. Closing/backtracking does not leak or invent authorization state.
10. Formal mode shows only server-provided real/readiness rows and no mock accounts.

---

## 18. Remaining Risks And Owner Decisions

The following decisions are intentionally deferred to provider implementation tasks:

- whether Google Picker plus `drive.file` proves sufficient for ongoing folder-descendant access;
- whether a broader restricted Drive scope is acceptable;
- whether Gmail body analysis is worth restricted-scope verification and security assessment;
- where encrypted/vault-backed credential references live;
- which production origin hosts OAuth callbacks and provider webhooks;
- whether LINE uses an existing or new Official Account/channel;
- which Telegram bots/chats and privacy-mode posture are acceptable;
- which GitHub App owner, visibility, and organization approval process apply;
- whether initial import supports only preview-selected items or a bounded recent window;
- retention and deletion behavior for private messages and email attachments.

These are not blockers for `AIINPUT-CONN-002..004`. They are blockers for provider runtime.

---

## 19. Primary And Comparable Sources

### Standards and provider documentation

- OAuth 2.0 Security Best Current Practice: https://www.rfc-editor.org/rfc/rfc9700.html
- OAuth 2.0 PKCE: https://www.rfc-editor.org/rfc/rfc7636
- Google OAuth web-server applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Google Drive API scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google Drive file/folder search: https://developers.google.com/workspace/drive/api/guides/search-files
- Google Drive downloads and Workspace-file export: https://developers.google.com/workspace/drive/api/guides/manage-downloads
- Google Drive changes: https://developers.google.com/workspace/drive/api/guides/manage-changes
- Google Drive push notifications: https://developers.google.com/workspace/drive/api/guides/push
- Gmail scopes: https://developers.google.com/workspace/gmail/api/auth/scopes
- Gmail push/history notifications: https://developers.google.com/workspace/gmail/api/guides/push
- GitHub Apps overview: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps
- GitHub App permissions: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
- GitHub App selected repository installation: https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app
- GitHub webhook signature validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- LINE Messaging API receive/webhook behavior: https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- LINE group chats: https://developers.line.biz/en/docs/messaging-api/group-chats/
- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram bots/privacy mode FAQ: https://core.telegram.org/bots/faq
- Atom Syndication Format: https://www.rfc-editor.org/rfc/rfc4287

### Comparable management patterns

- Zapier connect multiple accounts: https://help.zapier.com/hc/en-us/articles/8496258785421-Connect-your-app-accounts-to-Zapier
- Zapier centralized connection management: https://help.zapier.com/hc/en-us/articles/8496290788109-Manage-your-app-connections
- Notion connection catalog and scoped access management: https://www.notion.com/help/add-and-manage-connections-with-the-api

