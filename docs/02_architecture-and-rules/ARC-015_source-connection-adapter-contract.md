# DATTR-010 SourceConnection / InputAdapter Contract

Date: 2026-06-07

Status: `DATTR-010_DONE`

Purpose: define the shared contract for source connections and input adapters before real connector runtime, Supabase persistence, or scheduled sync is implemented.

This document turns the AI Input `同步設定` concept into a BFF-ready contract. It does not implement OAuth, webhooks, polling, URL fetching, file scanning, storage, Prisma migration, Supabase writes, or module SSOT writes.

Related docs:

- `docs/architecture/source_input_surface_inventory.md`
- `docs/architecture/document_attribute_layer.md`
- `docs/architecture/single_source_recognition_layer.md`
- `docs/architecture/ai_source_workflow_operating_layer.md`
- `docs/dev/source_workflow_schema_proposal.md`
- `docs/dev/supabase_readiness_report.md`

## 1. Placement

```txt
Input Surface
  -> InputAdapter
  -> SourceConnection
  -> SourceWorkflowConfig
  -> InputAdapterRun
  -> RawSourceItem
  -> SourceAsset
  -> Single Source Recognition
  -> SourceNamingProfile
  -> DataUnitProposal
  -> AIWorkflowRun / AIWorkItem
  -> ModuleWriteIntent
  -> module service authorization
  -> module SSOT
```

The adapter layer is the boundary between external sources and Personal OS source records.

Design rule:

```txt
InputAdapter captures and normalizes provider input.
SourceConnection stores user-approved source scope and status.
RawSourceItem stores provider/import staging data.
SourceAsset stores atomic source identity.
ModuleWriteIntent is still required before final module writes.
```

## 2. What This Layer Solves

The current UI can show sources such as LINE, Drive, Docs, RSS, Telegram, Gmail, GitHub/Markdown, and manual import. Before those become real runtime connectors, the system needs one standard contract for:

- provider identity
- user-approved scope
- auth mode and consent state
- sync mode and cadence
- sync cursor
- dedupe keys
- deletion, unsend, revoke, or external archive events
- attachment graph
- preview before import
- adapter run logs
- retry and error summary
- BFF-safe actions

This prevents every connector from inventing its own shape and prevents AI Input formal mode from silently falling back to mock rows.

## 3. Core Concepts

| Concept | Responsibility |
|---|---|
| `InputAdapterManifest` | Static capability declaration for one provider adapter. |
| `SourceConnection` | User-owned connection or configured source scope. |
| `SourceConnectionScope` | What the user allowed this connection to read or monitor. |
| `SourceConnectionConsent` | Auth/permission grant, consent, revocation, and scope version metadata. |
| `SourceConnectionHealth` | Sync health, last error, next retry, and stale/disconnected status. |
| `SourceSyncCursor` | Provider-specific incremental sync cursor. |
| `SourceDedupeKey` | Stable identity used to avoid duplicate raw/source records. |
| `SourceIdentityRef` | Provider-native object identity for messages, files, events, URLs, and contacts. |
| `SourceDeletionEvent` | Tombstone/unsend/archive/delete signal from external provider. |
| `SourceAttachmentRef` | Provider attachment or linked child source before full SourceAsset creation. |
| `InputAdapterRun` | One preview/import/sync/revoke/normalize run. |
| `InputAdapterOutput` | BFF-readable proposed output from one adapter run. |

## 4. Provider Families

The contract should support these providers in v0.1 planning:

| Provider | Expected source objects | Runtime now? | Notes |
|---|---|---:|---|
| `manual` | manual text, quick capture, user-created note | no real persistence for AI Input yet | Can create local/manual source intent later. |
| `local_file` | uploaded file, drag/drop file | no | Requires storage policy before formal use. |
| `local_repo` / `markdown_repo` | repo Markdown, AGENTS.md, SKILL.md | no | Import/export must be explicit and auditable. |
| `url` | captured link locator | no | `LINK` should be saved before fetch. |
| `web_page` | static/rendered HTML snapshot | no | Needs DATTR-011 security before fetching. |
| `rss` / `atom` | feed item | no | Uses feed URL + item GUID/link/date dedupe. |
| `line` | message, chat, attachment, link | no | Needs signature/webhook or approved polling contract. |
| `telegram` | update, message, chat, attachment | no | Needs update ID/chat ID/message ID dedupe. |
| `gmail` | thread, message, attachment | no | Needs OAuth scope and history cursor. |
| `google_drive` | file, folder, shortcut, revision | no | Needs file ID, revision, labels/properties scope. |
| `google_docs` | doc file/document snapshot | no | Uses document ID / Drive file ID / revision ID. |
| `google_calendar` | event, recurrence instance | no | Needs recurrence and timezone rules. |
| `google_contacts` | person/contact profile | no | Needs etag/source identity and merge policy. |
| `github` | issue, PR, repo doc, release | no | Useful for dev workflows, defer runtime. |
| `clipboard` | pasted text, HTML, URL, image | no | Must be explicit; no background clipboard reads. |
| `browser_capture` | page capture, selected text, screenshot | no | Needs browser extension/bookmarklet review later. |
| `camera` / `microphone` / `screen_capture` | media capture | no | Needs consent and retention policy. |
| `api` / `webhook` | API response or inbound event | no | Needs signed events and replay protection. |
| `client_portal` | public/client submissions | no | High-risk public route boundary. |
| `external_ai` | external agent output | no | External agents cannot access DB directly. |

## 5. Adapter Manifest

An adapter manifest declares what a provider can do. It is static or versioned configuration, not user data.

Required manifest fields:

```txt
key
provider
displayName
version
sourceKinds
authModes
syncModes
capabilities
requiredScopes
optionalScopes
defaultRiskLevel
supportsAttachments
supportsDeletionEvents
supportsIncrementalSync
supportsPreview
```

Capabilities should be explicit. Examples:

- `manual_import`
- `preview`
- `polling_sync`
- `webhook_receive`
- `incremental_sync`
- `attachment_fetch`
- `deletion_event`
- `external_delete_detection`
- `url_fetch_candidate`
- `html_snapshot_candidate`
- `media_capture`
- `message_threading`
- `conversation_grouping`
- `contact_identity`
- `calendar_recurrence`
- `file_revision`
- `label_metadata`

## 6. SourceConnection

`SourceConnection` is a user-owned configured source. It can represent an actual external account, a selected folder, a chat/group, a feed URL, a repo path, or a manual capture surface.

Minimum fields:

```txt
id
ownerProfileId
provider
displayName
status
authMode
externalAccountId
accountLabel
scope
consent
health
syncCursor
defaultModuleKey
riskLevel
lastSyncedAt
createdAt
updatedAt
```

Important distinctions:

- Provider identity is not the same as internal module identity.
- A provider account is not the same as a selected source scope.
- A LINE account, LINE group, Gmail mailbox, Drive folder, RSS feed, and local repo path should all be representable as source connections or scoped child connections.
- Revoking a connection should stop sync and record provenance. It should not silently delete SourceAssets, DataUnits, or ModuleWriteIntents.

## 7. Source Scope

Source scope should be explicit and reviewable.

Examples:

| Source | Scope fields |
|---|---|
| LINE group | `chatId`, `chatType`, `includeAttachments`, `since`, `memberVisibilityPolicy` |
| Telegram chat | `chatId`, `chatType`, `includeReplies`, `includeAttachments` |
| Gmail | `labelIds`, `query`, `threadMode`, `includeAttachments` |
| Google Drive | `folderIds`, `fileIds`, `mimeTypes`, `includeSubfolders`, `labels` |
| Google Docs | `documentIds`, `folderIds`, `revisionMode` |
| RSS/Atom | `feedUrl`, `maxItems`, `includeSummary`, `includeFullContentCandidate` |
| URL | `rawUrl`, `normalizedUrl`, `snapshotPolicy` |
| repo Markdown | `repoPath`, `glob`, `branch`, `commitRefPolicy` |
| local file | `storageMode`, `maxSize`, `allowedMimeTypes` |
| calendar | `calendarIds`, `timeRange`, `includeAttendees`, `includeRecurrence` |
| contacts | `contactGroupIds`, `mergePolicy`, `includeOrganizations` |

Scope is data governance, not only UI filtering. It determines what the adapter is allowed to read and what formal mode can persist.

## 8. Adapter Lifecycle

Every provider should map into the same lifecycle, even if some steps are no-op.

```txt
discover
  -> connect
  -> authorize
  -> preview
  -> import_selected
  -> normalize
  -> propose
  -> sync
  -> pause
  -> resume
  -> revoke
```

Lifecycle meanings:

| Stage | Meaning | Writes final module data? |
|---|---|---:|
| `discover` | Show adapter availability and requirements | no |
| `connect` | Create user-visible connection draft or setup intent | no |
| `authorize` | Record approved scopes/consent | no |
| `preview` | Show candidate external items before import | no |
| `import_selected` | Create `RawSourceItem` / SourceAsset intent | no module write |
| `normalize` | Prepare recognized source output | no module write |
| `propose` | Create reviewable AI proposals/work items | no module write |
| `sync` | Incrementally import allowed source changes | no module write |
| `pause` | Stop scheduled/polling activity | no |
| `resume` | Resume allowed scheduled/polling activity | no |
| `revoke` | Stop access and mark consent revoked | no deletion by default |

## 9. Sync Cursor Strategy

Each provider needs cursor records because sync state is provider-specific.

Examples:

| Provider | Cursor examples |
|---|---|
| LINE | latest event timestamp, webhook delivery ID, message ID when available |
| Telegram | `update_id` |
| Gmail | `historyId` |
| Google Drive | page token / change token, file revision |
| Google Docs | Drive revision ID or exported snapshot hash |
| RSS/Atom | item GUID/link + published/updated timestamp |
| GitHub | issue/PR updatedAt cursor, commit SHA |
| Calendar | sync token, event updated timestamp, recurrence instance ID |
| Contacts | sync token / etag |
| Local/repo files | content hash, mtime, git commit ref |

Cursor rules:

- Store provider cursor separately from source dedupe keys.
- Do not advance cursor until the adapter run result is safely recorded.
- Failed runs should preserve previous cursor and store error summary.
- Cursor replay should not duplicate source assets if dedupe keys work.

## 10. Dedupe And Source Identity

Every adapter output should include a dedupe strategy.

Preferred dedupe priority:

1. provider event/update/message/file/thread/document ID
2. provider ID + revision/version ID
3. provider ID + timestamp + sender/author ID
4. URL canonicalization + content hash
5. file content hash + original filename + size
6. import batch ID + local temporary ID

Examples:

| Source | Dedupe key |
|---|---|
| LINE message | `line:{chatId}:{messageId or eventId}` |
| Telegram update | `telegram:{chatId}:{messageId}:{updateId}` |
| Gmail message | `gmail:{messageId}` |
| Gmail thread | `gmail-thread:{threadId}:{historyId}` |
| Drive file revision | `drive:{fileId}:{revisionId}` |
| Google Doc snapshot | `gdoc:{documentId}:{revisionId}` |
| RSS item | `rss:{feedUrlHash}:{guid or linkHash}` |
| URL bookmark | `url:{normalizedUrlHash}:{capturedAt or userScope}` |
| Static HTML snapshot | `webpage:{finalUrlHash}:{contentHash}` |
| Local file | `file:{contentHash}:{sizeBytes}` |

Design rule:

```txt
Dedupe prevents duplicate source records.
It does not erase external deletion/unsend events.
```

## 11. Deletion, Unsend, Archive, And Revocation

External deletion should produce provenance, not silent erasure.

Examples:

- LINE unsend event
- Telegram deleted message detection
- Gmail deleted/archived message
- Drive file trashed or permission removed
- Docs revision no longer accessible
- RSS item removed from feed
- local/repo file deleted
- user revokes OAuth scope

Default handling:

1. Record `SourceDeletionEvent` or provenance event.
2. Mark source availability as changed.
3. Preserve existing internal SourceAsset and DataUnit links unless retention policy requires removal.
4. Prevent future AI context inclusion if policy says deleted/unavailable sources cannot be reused.
5. Never silently delete downstream ModuleWriteIntents or module records.

Detailed retention/deletion policy belongs to `DATTR-011`.

## 12. Attachment Graph

Messages, emails, calendar events, and documents often contain attachments or links.

Adapter outputs should preserve:

- parent source identity
- attachment provider ID
- MIME type and size
- filename/original name
- content URL or fetch token
- expiry information
- content hash when available
- relationship kind

Relationship examples:

```txt
LINE message -> image attachment
Gmail message -> PDF attachment
Calendar event -> Meet transcript link
Google Doc -> embedded link
URL bookmark -> fetched WEB_PAGE snapshot
Audio file -> transcript asset
Transcript -> AI summary asset
```

Attachments should become linked source assets or asset candidates, not flattened into message text.

## 13. BFF Contract

The frontend should not call providers directly.

Recommended BFF-visible actions/loaders:

| BFF surface | Purpose |
|---|---|
| `listInputAdapterManifests()` | Show available/planned adapters and capabilities. |
| `listSourceConnections()` | Load user-owned source connections for `同步設定`. |
| `previewSourceConnection(input)` | Preview candidate source items before import. |
| `createSourceConnection(input)` | Create a manual/local/feed/repo/source connection or setup intent. |
| `updateSourceConnectionScope(connectionId, scope)` | Update allowed source scope. |
| `pauseSourceConnection(connectionId)` | Stop scheduled/polling sync. |
| `resumeSourceConnection(connectionId)` | Resume configured sync. |
| `revokeSourceConnection(connectionId)` | Stop access and record revocation. |
| `runSourceConnectionSync(connectionId)` | Trigger a reviewed/manual sync run. |
| `listInputAdapterRuns(connectionId)` | Show recent run history. |
| `listAdapterPreviewItems(runId)` | Show preview/import candidates. |
| `importPreviewItems(runId, itemIds)` | Convert selected preview items into RawSourceItem/SourceAsset intents. |

All BFF surfaces must:

- call `requireUser()`
- enforce owner-scoped source connection access
- hide provider secrets and raw auth tokens
- return UI-safe view models
- create workflow/audit records for nontrivial runs
- avoid module SSOT writes

## 14. Provider-specific Minimum Contracts

### LINE

Must preserve:

- provider event ID when available
- group/room/user source ID
- message ID when available
- sender ID/display name if allowed
- timestamp
- message type
- reply/quote metadata
- attachments
- unsend/delete events
- webhook signature verification status
- dedupe key

### Telegram

Must preserve:

- `update_id`
- `chat.id`
- chat type
- message ID
- sender ID
- date
- text/entities
- reply/thread refs
- file IDs and unique IDs
- deletion/edit detection where possible

### Gmail

Must preserve:

- account ID/email label
- thread ID
- message ID
- label IDs
- history ID
- sender/recipient/date headers
- attachment IDs
- MIME/body part metadata
- quoted/forwarded content boundary hints

### Google Drive / Google Docs

Must preserve:

- Drive file ID
- Docs document ID when applicable
- revision ID or modified time
- MIME type
- parents/folder IDs
- shortcut targets
- labels/properties
- owner/permission hints
- web view URL
- export/snapshot intent

### RSS / Atom

Must preserve:

- feed URL
- feed title
- item GUID/id
- item link
- canonical URL if available
- published/updated timestamp
- author/category tags
- content hash

### URL / Web Page

Must preserve:

- raw URL
- normalized URL
- requested URL
- final URL
- canonical URL
- redirect chain metadata
- URL safety status
- static HTML snapshot intent
- content hash when fetched

Fetching must wait for `DATTR-011` security policy.

### Local / Repo / Clipboard / Media

Must preserve:

- original name
- MIME/extension/signature signals
- path or source surface
- content hash
- size and dimensions/duration when available
- capture method
- consent/permission context
- storage mode

Clipboard and media capture must remain explicit user actions.

## 15. Error, Retry, And Health

Adapter runs should produce concise, user-visible status:

- `queued`
- `running`
- `completed`
- `completed_with_review_needed`
- `failed`
- `cancelled`

Connection health should distinguish:

- setup required
- connected but idle
- running
- healthy completed sync
- paused by user
- stale
- provider permission error
- provider rate limited
- failed
- revoked

Retry policy should be explicit:

- manual only
- retry once
- exponential backoff
- provider scheduled

Do not hide repeated failures. Failed adapter runs should create AI work items or show up in the workflow console when they affect source freshness.

## 16. Relationship With AI Source Workflow

Every meaningful adapter operation should be attachable to an `AIWorkflowRun`.

Examples:

| Adapter run | Workflow run |
|---|---|
| Preview LINE group | `source_environment_setup` or `source_intake` |
| Daily Gmail sync | `source_organization` |
| RSS poll finds new article | `source_intake` then `source_recognition` |
| User corrects routing | `source_correction` |
| URL fetch blocked by safety | `source_recognition` with `AIWorkItem` risk alert |

The UI can show high-level workflow summaries without exposing every raw provider payload.

## 17. Relationship With DATTR-024

`DATTR-024` should not implement provider runtime yet.

The first Supabase-backed BFF slice should persist only local/manual/formal source workflow records that fit this contract:

1. `SourceConnection` rows for configured source surfaces.
2. `InputAdapterRun` / `AIWorkflowRun` records for manual runs.
3. `RawSourceItem` and `SourceAsset` intent rows from safe manual inputs.
4. `AIWorkItem` review cards for required confirmation.

Provider OAuth, webhook, polling, URL fetch, clipboard, OCR/transcription, and media capture should wait for `DATTR-011` and provider-specific implementation tasks.

## 18. Acceptance Criteria

This task is complete when the project can answer:

1. What is an InputAdapter?
2. What is a SourceConnection?
3. How does a source scope differ from a provider account?
4. What provider families must be supported?
5. What adapter capabilities must be declared?
6. What lifecycle stages must every adapter map to?
7. How are sync cursors stored and advanced?
8. How are dedupe keys built?
9. How are deletion/unsend/revocation events represented?
10. How are attachments preserved as graph relationships?
11. What BFF surfaces should the frontend call?
12. Why should Client Components not call external providers directly?
13. How do adapter runs relate to AIWorkflowRun and AIWorkItem?
14. Why does this layer still avoid module SSOT writes?
15. What remains blocked until DATTR-011?

## 19. Implementation Boundary

Allowed in DATTR-010:

- documentation
- type proposals
- task updates
- BFF contract names
- provider-specific identity notes

Not allowed in DATTR-010:

- production Prisma migration
- Supabase writes
- OAuth runtime
- provider API calls
- webhook routes
- URL fetching
- OCR/transcription
- file storage
- connector scheduling
- module write execution

