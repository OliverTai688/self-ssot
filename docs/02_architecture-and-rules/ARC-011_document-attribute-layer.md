# Source Asset / Document Attribute Layer

Date: 2026-06-06

Status: `DATTR-001_DONE`

Purpose: define how Personal OS should treat external and local source assets: Google Docs, Markdown files, HTML/web pages, uploaded documents, images, videos, audio, links/bookmarks, datasets, API responses, calendar/contact sources, AI conversation exports, and sources that are sometimes executable task boards.

## 1. Research Signals

External references reviewed:

- [TickTick Kanban View](https://help.ticktick.com/articles/7055782353376903168): task collections can be viewed as list, Kanban, and timeline; Kanban examples include progress columns such as prepare-to-do, doing, and done.
- [TickTick Select Different Views](https://help.ticktick.com/articles/7055782381696843776): task systems can expose the same task set through different views instead of making each view a separate object type.
- [Google Drive custom file properties](https://developers.google.com/workspace/drive/api/guides/properties): Drive supports custom metadata through public `properties` and app-private `appProperties`.
- [Google Drive labels overview](https://developers.google.com/workspace/drive/api/guides/about-labels): labels are typed metadata used to organize, search, and apply policy to files.
- [Google Drive files resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files): Drive files have stable IDs, MIME types, parent folders, revisions, links, permissions, and custom metadata.
- [Google Docs document concept](https://developers.google.com/workspace/docs/api/concepts/document): Docs documents are addressed by stable `documentId` and can be created, read, and updated through the Docs API.
- [CommonMark spec](https://spec.commonmark.org/0.31.2/): Markdown is a plain text format for structured documents, making it a good local/repo-friendly document body format.
- [MDN MIME types](https://developer.mozilla.org/docs/Web/HTTP/Guides/MIME_types): MIME/media types identify the nature and format of a document, image, audio, video, or byte stream.
- [MDN common media types](https://developer.mozilla.org/docs/Web/HTTP/Guides/MIME_types/Common_types): common extensions map to MIME types such as `text/markdown`, `image/png`, `audio/mpeg`, and `video/mp4`.
- [WHATWG HTML links](https://html.spec.whatwg.org/dev/links.html): HTML links represent relationships between resources, and `canonical` can identify the preferred URL for a document.
- [Fetch Standard](https://fetch.spec.whatwg.org/): web fetching is a request/response process with redirects, response metadata, and content-type behavior that should be recorded in fetch audit trails.
- [RFC 9309 Robots Exclusion Protocol](https://www.ietf.org/rfc/rfc9309.html): automated web clients should respect robots.txt access rules when fetching public web resources.
- [LINE Messaging API webhooks](https://developers.line.biz/en/docs/messaging-api/receiving-messages/): LINE sends webhook event objects for user messages and requires signature verification before processing events.
- [Telegram Bot API](https://core.telegram.org/bots/api): Telegram updates include `update_id` for deduplication/ordering and can be received through polling or webhooks.

Takeaway:

- Treat "task-like", "file-like", "media-like", "web-like", and "link-like" as asset attributes, not as mutually exclusive product silos.
- A Google Doc can be a reference document, a project brief, an executable checklist, or a mixed object.
- A Markdown file can be a durable knowledge document, a PRD, a sprint plan, or an operational task list.
- An image, video, audio recording, or URL can also produce normalized text, evidence, action items, and module write intents.
- A captured link can remain a `LINK` locator while the fetched static HTML is saved as a related `WEB_PAGE` asset.
- LINE and Telegram inputs should enter as messaging source assets with provider event IDs, chat/thread IDs, sender metadata, and attachment links.
- The system needs a lightweight registry that separates asset identity, source metadata, content snapshots, extracted content, executable state, and module links.

## 2. Placement In Personal OS

The Source Asset / Document Attribute Layer should sit inside the cross-cutting Data Operations Layer:

```txt
External Source
  -> RawSourceItem
  -> SourceAsset / AssetAttributeSet
  -> NormalizedContent
  -> Evidence
  -> ModuleWriteIntent
  -> Module SSOT
```

It should not replace:

- Work tasks.
- Research sources.
- Project deliverables.
- Agent Team OS instructions / skills.
- Repo docs such as `AGENTS.md` or `SKILL.md`.

It should provide a shared contract so these modules can reference the same document, image, video, audio, or link without copying or reclassifying it differently.

## 3. Core Concept

Every imported or authored source asset gets two layers:

| Layer | Responsibility | Examples |
|---|---|---|
| Source asset identity layer | What this object is and where it came from | Google Doc ID, Drive file ID, local Markdown path, image URL, audio file, video file, MIME type, content hash |
| Source asset attribute layer | How Personal OS should treat it right now | reference doc, actionable task doc, image evidence, meeting audio, source link, deliverable draft, doing/done state |

Recommended primary distinction:

```txt
SourceAsset
  assetKind: DOCUMENT | WEB_PAGE | IMAGE | VIDEO | AUDIO | LINK | DATASET | MESSAGE | CONVERSATION | MIXED | OTHER
  format: GOOGLE_DOC | MARKDOWN | HTML | DOCX | PDF | PLAIN_TEXT | PNG | JPEG | WEBP | MP4 | MOV | WEBM | MP3 | M4A | WAV | CSV | SPREADSHEET | JSON | API_RESPONSE | URL | CALENDAR_EVENT | PROFILE | SLIDE_DECK | LINE_MESSAGE | TELEGRAM_MESSAGE | OTHER
  storageMode: EXTERNAL_REF | LOCAL_REPO_FILE | DB_SNAPSHOT | UPLOADED_FILE

AssetAttributeSet
  interpretationKind: REFERENCE | ACTIONABLE | EVIDENCE | DELIVERABLE | MIXED
  workflowState: INBOX | TODO | DOING | WAITING | DONE | ARCHIVED
  reviewState: UNREVIEWED | REVIEWED | APPROVED | REJECTED
  moduleHint: work | research | ingestion | workflow | life | finance | chamber | company
  riskLevel: LOW | MEDIUM | HIGH | CRITICAL
  visibility: PRIVATE | INTERNAL | CLIENT_VISIBLE | PUBLIC_SAFE
```

This lets a single source move from "Google Doc reference" to "actionable project brief", or from "meeting audio" to "Work task proposal", without losing the original source identity.

## 4. Single Source Recognition Boundary

`SourceAsset` remains the atomic identity record, but it should be enriched before naming, grouping, DataUnit proposals, or module write intents.

Single Source Recognition is documented in `docs/architecture/single_source_recognition_layer.md`.

Recognition responsibilities:

- format detection should use multiple signals, not only extension or declared MIME type.
- descriptive metadata supports search, citation, reuse, and AI grouping.
- provenance events record how a source entered and changed over time.
- evidence selectors support fragment-level citations such as paragraph, page, time range, bounding box, JSON pointer, spreadsheet range, DOM selector, and heading path.
- quality profiles help AI avoid treating all sources as equally reliable.
- URL safety checks must happen before fetch or HTML snapshot creation.
- media metadata policies must handle EXIF, GPS, device info, C2PA/content credentials, AI-generated media signals, and privacy actions.

Recognition pipeline:

```txt
RawSourceItem
  -> SourceAsset
  -> SourceFormatDetection
  -> SourceDescriptiveMetadata
  -> SourceProvenanceEvent
  -> SourceQualityProfile
  -> SourceEvidenceSelector
  -> AssetAttributeSet
  -> AssetExtraction
  -> SourceNamingProfile
  -> DataUnitProposal
```

Composite DataUnit grouping should consume recognized sources rather than raw imported sources directly.

## 5. AI Source Workflow Operating Boundary

Source recognition and composite grouping should be orchestrated through the AI Source Workflow Operating Layer, documented in `docs/architecture/ai_source_workflow_operating_layer.md`.

The workflow layer records:

- source environment rules
- source organizing runs
- recognition, naming, grouping, and anomaly steps
- review cards through `AIWorkItem`
- morning brief anomaly and summary reporting
- user corrections through @mention-driven correction workflows

Design rule:

```txt
SourceAsset and recognition models describe the source.
AIWorkflowRun describes the processing run.
AIWorkItem describes what needs human attention.
ModuleWriteIntent remains the only path toward final module writes.
```

## 6. Composite Data Unit Boundary

`SourceAsset` remains the atomic source identity. It is not a project, interview, case, research packet, or final module record.

The `SourceAsset pool` contains all imported atomic sources. A source may stay ungrouped, be suggested for a unit, become a candidate, be selected, be excluded, be removed, or belong to multiple composite units.

Composite grouping belongs to the `Composite Data Unit Layer`, documented in `docs/architecture/composite_data_unit_layer.md`.

Key boundary:

```txt
SourceAsset
  -> SourceNamingProfile
  -> DataUnitProposal
  -> DataUnit
  -> DataUnitAssetLink
  -> ModuleWriteIntent
  -> module service authorization
  -> module SSOT
```

Source naming rules:

- `originalName` must never be overwritten.
- `canonicalName` is an internal Personal OS semantic name for AI grouping, role inference, and UI organization.
- `displayName` controls what the user sees.
- `canonicalName` does not rename external Google Drive files, repo files, local files, or chat attachments.
- External file rename must be a separate explicit action with audit trail.

DataUnit rules:

- `DataUnit` is user-curated or AI-assisted composite evidence grouping.
- `DataUnitAssetLink` stores the role and membership status of a source asset inside a unit.
- SourceAsset type answers what the object is: document, audio, image, video, dataset, message, link.
- DataUnit role answers what the object does inside the unit: transcript, raw audio, participant profile, consent document, AI coding.
- DataUnit annotations can contain researcher notes, AI summaries, coding memos, questions, and decisions.
- DataUnit does not bypass `ModuleWriteIntent` or module service authorization.

## 7. SourceAsset Type vs DataUnit Role

| SourceAsset type | Possible DataUnit roles |
|---|---|
| document | participant profile, transcript, researcher note, consent document, reference |
| audio | raw audio, meeting recording, life story recording |
| image | observation evidence, receipt, consent photo, context material |
| video | raw video, observation clip, meeting recording |
| dataset | AI coding, questionnaire result, analysis table |
| message | meeting note, participant context, consent confirmation |
| link / web page | source document, context material, reference |

This separation prevents the system from treating every document as a task or every AI coding file as a final research conclusion.

## 8. All-source Coverage

| Source type | Capture metadata | Normalization / extraction | Evidence addressing | Possible action output |
|---|---|---|---|---|
| Google Doc | `documentId`, Drive `fileId`, URL, revision, MIME | plain text, headings, markdown snapshot, chunks | document id + revision + heading/offset | Work task, Research source, PRD update |
| Markdown file | repo path, content hash, frontmatter, extension, MIME | markdown AST/text chunks | path + hash + heading/line | task item, sprint note, agent instruction |
| HTML / web page | URL, canonical URL, MIME `text/html`, title, meta description, fetchedAt, content hash | readability text, DOM sections, heading tree, screenshots, link preview | URL + fetchedAt + selector/heading/offset | research source, reading task, Work context |
| PDF / DOCX | file id/path, MIME, size, hash | text extraction, page chunks, OCR if scanned | page + offset + hash | deliverable draft, research source |
| Image | MIME, dimensions, thumbnail, EXIF if allowed, hash | OCR text, caption, object/scene summary | region/bounding box + hash | design task, receipt draft, visual evidence |
| Video | MIME, duration, dimensions, thumbnail, hash | audio transcript, captions, scene summaries, keyframes | timecode range + frame/keyframe | meeting action item, review task, evidence clip |
| Audio | MIME, duration, waveform metadata, hash | transcript, speaker labels, summary | timestamp range + speaker | meeting note, follow-up task, life reflection |
| URL / link bookmark | raw URL, source app, capturedAt, title if available | link preview, target classification, optional fetch into HTML asset | URL + capturedAt | reading queue item, source candidate |
| Spreadsheet / CSV | file id/path, MIME, sheet names, row/column dimensions, hash | table preview, row chunks, schema inference | sheet + cell/range + hash | finance draft, research dataset, Work report |
| JSON / API response | endpoint, provider, schema/version, fetchedAt, hash | normalized JSON paths, summaries, schema inference | JSON pointer + fetchedAt + hash | workflow input, data evidence, integration debug |
| Presentation / slides | file id/path, MIME, slide count, thumbnail, hash | slide text, speaker notes, slide images | slide number + element id + hash | client deliverable, research talk source |
| Calendar event | provider event id, attendees, start/end, location | event summary, agenda, transcript/notes links | event id + occurrence time | Work meeting note, follow-up tasks |
| Contact / profile page | URL/provider id, name, organization, capturedAt | profile summary, relationship context | URL/id + field | Chamber contact, research person |
| AI conversation | thread id, module, participants, trace id | dialogue entries, summary, decision boundaries | entry id + turn index | module write intent, agent context package |
| LINE message / thread | webhook event id, reply token if applicable, source user/group/room id, message id/type, timestamp | text, attachments, quoted message ref, mention metadata, attachment extraction | provider + event id/message id + timestamp | inbox triage, Work follow-up, Chamber context |
| Telegram message / chat | update id, chat id/type, message id, sender id, date, message type | text, entities, media/file refs, reply/thread refs, attachment extraction | provider + update id/message id + chat id | inbox triage, Work follow-up, Research source |

Design rule:

- `mimeType` and `assetKind` classify what the source is.
- `interpretationKind` and `workflowState` classify what Personal OS should do with it.
- Extraction results become `NormalizedContent`, not permanent module records.
- Actionable outputs become `ModuleWriteIntent`, not direct writes.
- URL is a locator. HTML/web page is content. A bookmark may later create a fetched `WEB_PAGE` asset, but the system should preserve both the original captured URL and the fetched content snapshot.
- Messaging app entries are external events first. They can produce message, conversation, link, image, video, audio, or document assets, but they should not directly create Work tasks or client-visible records.

## 9. Proposed Data Contract

This is a schema proposal only. Do not implement Prisma models until a reviewed DB task approves migration impact.

### SourceAsset

Purpose: canonical registry row for an external, local, uploaded, or DB-snapshotted source asset.

Fields to consider:

- `id`
- `ownerProfileId`
- `title`
- `assetKind`
- `format`
- `storageMode`
- `sourceProvider`
- `sourceType`
- `externalId`
- `externalUrl`
- `sourcePath`
- `mimeType`
- `fileExtension`
- `sizeBytes`
- `durationMs`
- `width`
- `height`
- `thumbnailUrl`
- `canonicalUrl`
- `fetchedAt`
- `sourceRevisionId`
- `contentHash`
- `currentSnapshotId`
- `parentAssetId`
- `syncGroupKey`
- `fetchPolicy`
- `lastFetchedAt`
- `lastFetchStatus`
- `privacyLevel`
- `status`
- `createdAt`
- `updatedAt`

### SourceFetchRun

Purpose: auditable record of fetching a URL/link into a static HTML/web-page snapshot.

Fields to consider:

- `id`
- `sourceLinkAssetId`
- `resultWebPageAssetId`
- `requestedUrl`
- `finalUrl`
- `canonicalUrl`
- `httpStatus`
- `contentType`
- `robotsPolicyStatus`
- `fetchMode`
- `fetchStatus`
- `etag`
- `lastModified`
- `contentHash`
- `snapshotId`
- `errorSummary`
- `startedAt`
- `completedAt`

Early v0.1 constraints:

- Fetch only static HTML by default.
- Do not execute JavaScript or perform browser rendering in the first pass.
- Respect robots.txt for public unauthenticated web fetching.
- Do not fetch authenticated, paywalled, private, or token-bearing URLs unless the user explicitly connects that source and approves the scope.
- Store fetch runs and snapshots explicitly; do not silently overwrite previous HTML snapshots.

### SourceConversation

Purpose: optional grouping object for chat apps, AI conversations, email threads, or messaging channels.

Fields to consider:

- `id`
- `sourceProvider`
- `externalConversationId`
- `conversationType`
- `displayName`
- `participantRefs`
- `privacyLevel`
- `lastMessageAt`
- `status`
- `createdAt`
- `updatedAt`

### SourceMessageEvent

Purpose: provider-specific message intake record before normalization into content, evidence, or action proposals.

Fields to consider:

- `id`
- `conversationId`
- `assetId`
- `sourceProvider`
- `externalEventId`
- `externalMessageId`
- `dedupeKey`
- `senderExternalId`
- `senderDisplayName`
- `messageType`
- `text`
- `replyToExternalMessageId`
- `quotedExternalMessageId`
- `providerTimestamp`
- `receivedAt`
- `signatureVerified`
- `rawPayloadSnapshot`

Important boundary:

- LINE and Telegram records should preserve provider IDs and signature/deduplication metadata.
- Attachments should become linked `SourceAsset` rows using their own MIME/format metadata.
- Unsend/delete events should mark source state or create tombstone events instead of silently deleting downstream history.

### AssetAttributeSet

Purpose: current Personal OS interpretation of a source asset.

Fields to consider:

- `id`
- `assetId`
- `interpretationKind`
- `workflowState`
- `reviewState`
- `moduleHint`
- `topicTags`
- `dueAt`
- `priority`
- `focusArea`
- `riskLevel`
- `visibility`
- `clientVisible`
- `requiresHumanApproval`
- `metadata`
- `createdAt`
- `updatedAt`

### SourceActionItem

Purpose: task/checklist/action item extracted from or attached to an actionable source asset.

Fields to consider:

- `id`
- `assetId`
- `parentTaskId`
- `title`
- `body`
- `status`
- `sectionKey`
- `sortOrder`
- `dueAt`
- `priority`
- `assigneeProfileId`
- `targetModuleKey`
- `targetEntityType`
- `targetEntityId`
- `moduleWriteIntentId`
- `createdAt`
- `updatedAt`

Important boundary:

- `SourceActionItem` is not a replacement for `ProjectTask`.
- It can become a `ProjectTask` only through `ModuleWriteIntent` and Work service authorization.

### AssetExtraction

Purpose: extracted, generated, or normalized derivative of an asset.

Fields to consider:

- `id`
- `assetId`
- `extractionType`
- `text`
- `summary`
- `language`
- `startOffset`
- `endOffset`
- `startTimeMs`
- `endTimeMs`
- `pageNumber`
- `boundingBox`
- `confidence`
- `metadata`
- `createdAt`

Example `extractionType` values:

- `DOCUMENT_TEXT`
- `DOCUMENT_CHUNK`
- `OCR_TEXT`
- `IMAGE_CAPTION`
- `AUDIO_TRANSCRIPT`
- `VIDEO_TRANSCRIPT`
- `SCENE_SUMMARY`
- `LINK_PREVIEW`
- `HTML_READABILITY_TEXT`
- `HTML_DOM_SECTION`
- `SPREADSHEET_RANGE`
- `JSON_PATH_VALUE`
- `SLIDE_TEXT`

### SourceAssetSnapshot

Purpose: store a reviewable snapshot of external/local document content and metadata.

Fields to consider:

- `id`
- `assetId`
- `sourceRevisionId`
- `version`
- `plainTextSnapshot`
- `markdownSnapshot`
- `transcriptSnapshot`
- `metadataSnapshot`
- `contentHash`
- `capturedAt`

### SourceAssetLink

Purpose: connect a source asset to Work, Research, Ingestion, Agent Team OS, or Client Portal records.

Fields to consider:

- `id`
- `assetId`
- `moduleKey`
- `entityType`
- `entityId`
- `linkType`
- `createdAt`

## 10. Source Mapping

| Source | Personal OS mapping |
|---|---|
| Google Doc | `SourceAsset(assetKind=DOCUMENT, format=GOOGLE_DOC, storageMode=EXTERNAL_REF, externalId=documentId)` |
| Google Drive file | `SourceAsset(assetKind by MIME, format by MIME, storageMode=EXTERNAL_REF, externalId=fileId)` |
| Markdown repo file | `SourceAsset(assetKind=DOCUMENT, format=MARKDOWN, storageMode=LOCAL_REPO_FILE, sourcePath=...)` |
| HTML page | `SourceAsset(assetKind=WEB_PAGE, format=HTML, storageMode=EXTERNAL_REF, externalUrl=canonicalUrl)` |
| Saved HTML file | `SourceAsset(assetKind=WEB_PAGE, format=HTML, storageMode=UPLOADED_FILE or LOCAL_REPO_FILE)` |
| Uploaded `.md` file | `SourceAsset(assetKind=DOCUMENT, format=MARKDOWN, storageMode=UPLOADED_FILE)` |
| Uploaded `.docx` / `.pdf` | `SourceAsset(assetKind=DOCUMENT, format=DOCX/PDF, storageMode=UPLOADED_FILE)` |
| Uploaded image | `SourceAsset(assetKind=IMAGE, format=PNG/JPEG/WEBP, storageMode=UPLOADED_FILE)` |
| Uploaded video | `SourceAsset(assetKind=VIDEO, format=MP4/MOV/WEBM, storageMode=UPLOADED_FILE)` |
| Uploaded audio | `SourceAsset(assetKind=AUDIO, format=MP3/M4A/WAV, storageMode=UPLOADED_FILE)` |
| URL / link bookmark | `SourceAsset(assetKind=LINK, format=URL, storageMode=EXTERNAL_REF, externalUrl=...)`; optional fetch creates related `WEB_PAGE` asset |
| Fetched static HTML from link | `SourceAsset(assetKind=WEB_PAGE, format=HTML, storageMode=DB_SNAPSHOT or LOCAL_FILE_SNAPSHOT, parentAssetId=<LINK asset>)` plus `SourceFetchRun` |
| CSV / spreadsheet | `SourceAsset(assetKind=DATASET, format=CSV/SPREADSHEET, storageMode=EXTERNAL_REF or UPLOADED_FILE)` |
| JSON / API response | `SourceAsset(assetKind=DATASET, format=JSON, storageMode=DB_SNAPSHOT or EXTERNAL_REF)` |
| Calendar event | `SourceAsset(assetKind=MESSAGE, format=CALENDAR_EVENT, storageMode=EXTERNAL_REF)` |
| Contact/profile | `SourceAsset(assetKind=WEB_PAGE or MESSAGE, format=HTML/PROFILE, storageMode=EXTERNAL_REF)` |
| AI conversation export | `SourceAsset(assetKind=MIXED, format=PLAIN_TEXT, sourceProvider=ai_conversation)` |
| LINE message | `SourceAsset(assetKind=MESSAGE, format=LINE_MESSAGE, sourceProvider=line, externalId=messageId or eventId)` plus optional `SourceConversation` |
| Telegram message | `SourceAsset(assetKind=MESSAGE, format=TELEGRAM_MESSAGE, sourceProvider=telegram, externalId=updateId/messageId)` plus optional `SourceConversation` |
| LINE / Telegram attachment | `SourceAsset(assetKind by MIME, format by MIME, sourceProvider=line/telegram, parentAssetId=<MESSAGE asset>)` |

## 11. Link-to-HTML Sync Strategy

When a user captures or imports a link, the system should preserve both the locator and the fetched content:

```txt
Captured URL
  -> SourceAsset(assetKind=LINK, format=URL)
  -> SourceFetchRun(fetch static HTML)
  -> SourceAsset(assetKind=WEB_PAGE, format=HTML, parentAssetId=<LINK>)
  -> SourceAssetSnapshot(raw/static HTML + readable text + metadata hash)
  -> AssetExtraction(HTML_READABILITY_TEXT, HTML_DOM_SECTION, LINK_PREVIEW)
```

Recommended sync policy:

- `MANUAL_FETCH`: user explicitly asks the system to snapshot the link.
- `ON_CAPTURE`: trusted source scopes can fetch static HTML automatically after capture.
- `SCHEDULED_REFRESH`: later feature for selected links only.
- `DISABLED`: default for private, sensitive, authenticated, paywalled, or high-risk links.

Sync rules:

- The `LINK` asset keeps the original captured URL, source app, capture time, and user context.
- The `WEB_PAGE` asset keeps final URL, canonical URL, title, content type, HTTP status, fetched time, and content hash.
- If the page changes, create a new snapshot/version rather than overwriting the prior snapshot.
- If the fetch redirects, record both requested and final URL.
- If canonical URL differs, record canonical URL without deleting the original URL.
- Static fetch comes before rendered/browser fetch. Rendered snapshots can be a later task when the page requires JavaScript.

## 12. Messaging Source Strategy

LINE, Telegram, and future messaging apps should enter through source adapters:

```txt
Messaging webhook / polling update
  -> provider signature or dedupe verification
  -> SourceConversation
  -> SourceMessageEvent
  -> SourceAsset(assetKind=MESSAGE)
  -> attachment SourceAssets
  -> AssetExtraction / NormalizedContent
  -> SourceActionItem / Evidence / ModuleWriteIntent
```

Provider rules:

- LINE webhook intake must verify the platform signature before processing events.
- Telegram intake must use `update_id` / message IDs for deduplication and ordering.
- Messaging apps are permissioned sources. Only explicitly connected bots/accounts/chats should be captured.
- Group chat, room, channel, and direct-message privacy levels must be preserved.
- Attachments from chat apps should not be flattened into message text; they become their own linked source assets.
- Messages that contain URLs can create child `LINK` assets and optional `WEB_PAGE` snapshots through the link-to-HTML strategy.
- Chat-derived tasks are proposals until committed through `ModuleWriteIntent` and target module service authorization.

The shared SourceConnection / InputAdapter lifecycle, source scope, sync cursor, dedupe, deletion event, and attachment graph contract is documented in `docs/architecture/source_connection_input_adapter_contract.md`.

## 13. UI Placement

Do not create a full document management product immediately.

Recommended v0.1 placement:

- `/ai-input`: source selection and import preview.
- `/inbox`: source asset registry debug panel and triage cards.
- Work project detail: show linked documents only after Work CRUD verification.
- Research sources: later map document objects to citation/source records.

Minimal UI-only prototype:

- Add a document kind badge: `Reference`, `Actionable`, `Mixed`.
- Add an asset kind badge: `Doc`, `Web`, `Image`, `Video`, `Audio`, `Link`, `Dataset`, `Message`, `Conversation`.
- Add workflow badges: `Inbox`, `Todo`, `Doing`, `Waiting`, `Done`.
- Show source format: `Google Doc`, `Markdown`, `HTML`, `PDF`, `DOCX`, `CSV`, `JSON`.
- Show media metadata when useful: duration, dimensions, thumbnail, transcript status.
- Show module hint and risk level.
- Show whether an actionable source can produce Work tasks only as proposals.

## 14. Governance Rules

- External source assets remain external references unless explicitly snapshotted.
- Do not silently overwrite Google Docs or repo Markdown files.
- Do not silently overwrite fetched HTML snapshots; create versions and fetch-run audit records.
- Import/export/snapshot actions must be explicit and auditable.
- Public web fetches should respect robots.txt and rate-limit policies.
- Messaging source intake must preserve provider IDs, signatures/dedupe keys, chat scopes, and privacy level.
- Actionable source items are proposals until committed through the target module service.
- Media extraction must preserve timestamp, page, region, transcript, or source URL metadata where available.
- Client-visible document output requires human approval and ClientPortalAgent/AuthPermissionAgent review.
- Finance, Life, Company Strategy, Client Portal, and Auth/Permission documents are high risk by default.
- Agent outputs derived from sources must preserve source IDs, revision IDs, MIME types, timestamps, and content hashes where possible.

## 15. Recommended Sequencing

| Task id | Title | Status | Notes |
|---|---|---|---|
| `DATTR-001` | Define Source Asset / Document Attribute Layer contract | DONE | This document. |
| `DATTR-002` | Propose Source Asset Registry Prisma schema | TODO | Schema proposal and migration impact only; no runtime migration yet. |
| `DATTR-003` | Add UI-only Source Asset / Document Attribute prototype to AI Input / Inbox | TODO | Mock badges and source attribute cards only. |
| `DATTR-004` | Map Google Doc / Drive / Markdown source metadata | TODO | Start with mock adapters and source metadata mapping. |
| `DATTR-005` | Extend source metadata mapping to image / video / audio / HTML / link / dataset | TODO | Mock extraction contracts for OCR, transcript, caption, thumbnail, HTML readability, link preview, CSV/JSON paths. |
| `DATTR-006` | Convert actionable source items into Work write intents | TODO | Requires `DATA-002` and Work service boundaries. |
| `DATTR-007` | Define link-to-static-HTML snapshot sync contract | TODO | `LINK` and `WEB_PAGE` dual asset strategy, fetch run audit, robots policy, snapshot versioning. |
| `DATTR-008` | Define LINE / Telegram messaging source adapter contract | TODO | Provider event IDs, signature/dedupe rules, conversation/message grouping, attachment source assets. |
| `DATTR-009` | Create source input surface inventory and gap analysis | DONE | See `docs/architecture/source_input_surface_inventory.md`. |
| `DATTR-010` | Define SourceConnection / InputAdapter contract | DONE | Provider scopes, sync cursors, dedupe keys, deletion events, attachment graph, adapter lifecycle, and BFF surfaces are documented in `docs/architecture/source_connection_input_adapter_contract.md`. |
| `DATTR-011` | Define source intake security, privacy, and retention policy | TODO | URL fetch SSRF, robots/TOS, clipboard safety, EXIF, media consent, large-file storage, and retention. |
| `DATTR-012` | Prototype source control panel input matrix | TODO | UI-only source matrix for input mode, risk, sync status, and missing permissions. |
| `DATTR-013` | Establish Composite Data Unit Layer | DONE | SourceAsset pool, naming normalization, DataUnit proposal/composer/link/annotation contract. |
| `DATTR-014` | Optimize Single Source Recognition Layer | DONE | Format detection, descriptive metadata, provenance, evidence selectors, source quality, URL safety, media metadata, FAIR profile. |
| `DATTR-015` | Define AI Source Workflow Run Architecture | DONE | Workflow run, work item, correction, morning brief, and @mention architecture. |
| `DATTR-016` | Prototype AI Import Workbench UI | DONE | UI-only/mock Source Workflow Console, no workflow persistence or real connectors. |
| `DATTR-017` | Define Composite Data Unit schema proposal | DONE | Prisma proposal and migration impact only; no production migration yet. |

Recommended next step after current Work verification:

1. Finish `WORK-007`.
2. Run `DATTR-002` as a documentation/schema proposal task.
3. Run `DATTR-016` as a UI-only/mock AI Import Workbench prototype if the next source-input step is interface design.
4. DATTR-017 is complete as Composite DataUnit + Single Source Recognition + AI Source Workflow schema proposal work.
5. DATTR-010 is complete; run `DATTR-011` before real connector runtime.
6. Run `DATTR-003` or `DATTR-012` as UI-only mock prototypes.
