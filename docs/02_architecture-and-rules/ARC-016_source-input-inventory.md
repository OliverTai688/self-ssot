# Source Input Surface Inventory

Date: 2026-06-06

Status: `DATTR-009_DONE`

Purpose: inventory every source/input surface Personal OS should consider, map each source to the Source Asset / Document Attribute Layer, and identify missing input-side concerns before building runtime connectors.

Related docs:

- `docs/architecture/document_attribute_layer.md`
- `docs/architecture/source_connection_input_adapter_contract.md`
- `docs/dev/D-PLAN-010-interface-data-governance-plan.md`
- `docs/tasks/task_backlog.md`

## 1. Research References

References reviewed for this inventory:

- [Google Drive files resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files): Drive files expose stable IDs, MIME types, links, permissions, revisions, labels, parents, and custom metadata.
- [Google Drive custom file properties](https://developers.google.com/workspace/drive/api/guides/properties): Drive supports app-specific metadata through custom properties.
- [Google Drive labels](https://developers.google.com/workspace/drive/api/guides/about-labels): labels are typed metadata for organization, search, and policy.
- [Google Docs document concept](https://developers.google.com/workspace/docs/api/concepts/document): Google Docs are addressed by stable document IDs and can be read/updated through the Docs API.
- [Gmail API threads](https://developers.google.com/workspace/gmail/api/guides/threads): Gmail groups messages into thread resources with ordered conversation context.
- [Gmail API REST reference](https://developers.google.com/workspace/gmail/api/reference/rest): Gmail exposes messages, threads, labels, drafts, attachments, and mailbox history.
- [Google Calendar events](https://developers.google.com/calendar/api/v3/reference/events): Calendar events include timing, attendees, recurrence, locations, links, and conference metadata.
- [Google People API contacts](https://developers.google.com/people/v1/contacts): contacts require source metadata and etags to avoid concurrent modification conflicts.
- [W3C File API](https://www.w3.org/TR/FileAPI/): browser files are represented as `File`, `Blob`, and `FileList` objects.
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API): clipboard reads/writes require secure contexts and user/permission constraints.
- [MDN DataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer): drag/drop and clipboard flows can transfer text, HTML, URLs, and files.
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia): camera/microphone capture requires explicit user permission and secure contexts.
- [MDN MIME types](https://developer.mozilla.org/docs/Web/HTTP/Guides/MIME_types): MIME types classify documents, images, audio, video, and byte streams.
- [WHATWG HTML links](https://html.spec.whatwg.org/dev/links.html): HTML links represent relationships between resources and can include canonical URLs.
- [Fetch Standard](https://fetch.spec.whatwg.org/): web fetching uses request/response metadata, redirects, content type, and body handling.
- [RFC 9309 Robots Exclusion Protocol](https://www.ietf.org/rfc/rfc9309.html): public automated fetching should respect robots.txt access rules.
- [LINE Messaging API webhooks](https://developers.line.biz/en/docs/messaging-api/receiving-messages/): LINE sends webhook event objects and requires signature verification.
- [Telegram Bot API](https://core.telegram.org/bots/api): Telegram updates include `update_id` and can be received through webhook or polling.
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification): RSS is an XML web content syndication format.
- [RFC 4287 Atom Syndication Format](https://www.rfc-editor.org/info/rfc4287): Atom is an XML feed format with entries, metadata, authors, categories, and links.
- [Schema.org Dataset](https://schema.org/Dataset): dataset metadata can describe structured data, license, distribution, and provenance.

## 2. Source Input Architecture

All sources should enter through a shared source/input pipeline:

```txt
Input Surface
  -> SourceConnection / InputAdapter
  -> RawSourceItem
  -> SourceAsset
  -> AssetAttributeSet
  -> SourceAssetSnapshot / AssetExtraction
  -> NormalizedContent / Evidence
  -> SourceActionItem / AITriageProposal
  -> ModuleWriteIntent
  -> module service authorization
  -> module SSOT
```

Design rules:

- Source identity and module records are different things.
- Input adapters must preserve provider IDs, timestamps, permissions, sync cursors, deletion events, attachment relationships, and content hashes where possible.
- `SourceAsset` describes what the source is.
- Single Source Recognition enriches each asset before naming, grouping, or module write proposals.
- `AssetAttributeSet` describes how Personal OS currently uses it.
- `AssetExtraction` and `NormalizedContent` are intermediate evidence layers, not final module records.
- Module writes must go through `ModuleWriteIntent` and target module service authorization.

## 2.1 Single Source Recognition Requirement

Every input surface should eventually pass through Single Source Recognition before DataUnit grouping.

This applies to:

- local files
- Google Drive files
- Markdown repo files
- URLs and link bookmarks
- fetched HTML snapshots
- image, video, and audio media
- messages
- conversations
- datasets
- calendar events
- contacts and profile pages

Recognition adds:

- `SourceFormatDetection`
- `SourceDescriptiveMetadata`
- `SourceProvenanceEvent`
- `SourceEvidenceSelector`
- `SourceQualityProfile`
- source-specific checks such as `UrlSafetyCheck`, `MediaMetadataProfile`, and `SourceFairProfile`

This makes input surfaces safer and more useful before DATTR-013 naming/grouping and before any module write intent.

## 2.2 AI Source Workflow Requirement

Every meaningful source processing cycle should eventually be wrapped by the AI Source Workflow Operating Layer before user-facing review or correction.

This means a source should not only produce records. It should produce an observable run:

```txt
InputAdapter
  -> RawSourceItem / SourceAsset
  -> AIWorkflowRun
  -> recognition / naming / grouping steps
  -> AIWorkItem when review is needed
  -> MorningBriefItem when the user should be notified
  -> conversation correction when the user mentions a run, item, or source
```

The workflow layer helps the AI Input page show status summaries, things needing confirmation, source environment rules, organizing results, and recent work logs without exposing every low-level data model by default.

## 3. Current Source Inventory

Legend:

- `Current TS`: already represented in `src/types/ingestion.ts` or existing mock sync concepts.
- `Planned`: covered in architecture docs but not implemented.
- `Gap`: important input surface not yet fully represented.
- `Defer`: useful later, but not needed for v0.1.

| Source family | Source subtype | Current status | Input mechanism | SourceAsset mapping | Required identity metadata | Extraction / normalization | Main risks |
|---|---|---|---|---|---|---|---|
| Manual | Manual text note | Current TS | Text form, quick capture, AI Input | `MESSAGE` / `PLAIN_TEXT` or `DOCUMENT` | author, capturedAt, module hint, privacy | text chunks, entities, action items | accidental high-risk write |
| Manual | Manual task-like note | Planned | Text form with todo/doing/done fields | `DOCUMENT` or `MESSAGE` + `ACTIONABLE` | section, status, dueAt, priority | `SourceActionItem` extraction | should not bypass Work service |
| Manual | AI conversation entry | Planned | AI workspace conversation | `CONVERSATION` / `PLAIN_TEXT` | thread id, turn id, speaker, trace id | dialogue summary, evidence refs | private context leakage |
| File | Local file upload | Current TS | file picker, drag/drop | asset by MIME | filename, MIME, size, hash, lastModified | text, OCR, transcript, preview | large files, malware, storage |
| File | Drag/drop file | Gap | browser `DataTransfer` | asset by MIME | transfer source, filename, MIME, hash | same as local file | mixed clipboard/drop formats |
| File | Clipboard paste | Gap | Clipboard API / paste event | text, image, HTML, file assets | clipboard item type, capturedAt | text, HTML, image OCR | secrets/passwords in clipboard |
| File | Google Drive file | Current TS | Drive picker/sync | asset by Drive MIME | fileId, parents, owner, MIME, labels, modifiedTime | by file type | OAuth scope, permissions drift |
| Document | Google Doc | Current TS | Docs/Drive adapter | `DOCUMENT` / `GOOGLE_DOC` | documentId, fileId, revisionId, URL | plain text, headings, chunks | silent overwrite, stale revisions |
| Document | Markdown repo file | Current TS | repo scan, import, explicit sync | `DOCUMENT` / `MARKDOWN` | path, hash, frontmatter, commit ref | markdown chunks, headings | repo/DB source-of-truth conflict |
| Document | PDF | Planned | upload, Drive, email attachment | `DOCUMENT` / `PDF` | MIME, hash, page count | text extraction, OCR if scanned | scanned PDFs, page evidence |
| Document | DOCX | Planned | upload, Drive, email attachment | `DOCUMENT` / `DOCX` | MIME, hash, author/revision if available | text/section extraction | tracked changes, author metadata |
| Document | Plain text | Planned | upload, paste, export | `DOCUMENT` / `PLAIN_TEXT` | path/name, hash, encoding | text chunks | encoding/language detection |
| Document | Slides / presentation | Planned | upload, Drive | `DOCUMENT` / `SLIDE_DECK` | fileId/path, slide count, hash | slide text, speaker notes, thumbnails | client-visible boundary |
| Web | URL bookmark | Current TS | URL field, clipboard, message link | `LINK` / `URL` | original URL, source app, capturedAt | link preview, classification | URL safety, redirects |
| Web | Static HTML fetched from URL | Planned | link-to-HTML sync | `WEB_PAGE` / `HTML` | requested URL, final URL, canonical URL, content hash | readable text, DOM sections | robots, copyright, stale pages |
| Web | Dynamic/rendered page | Gap | browser/rendered snapshot later | `WEB_PAGE` / `HTML` | renderedAt, viewport, script policy | rendered text, screenshot | auth cookies, JS execution risk |
| Web | RSS feed | Gap | feed URL polling | `DATASET` or `WEB_PAGE` / `RSS` | feed URL, item GUID/link, pubDate | feed item summaries | duplicate feed entries |
| Web | Atom feed | Gap | feed URL polling | `DATASET` or `WEB_PAGE` / `ATOM` | feed id, entry id, updated | feed item summaries | source reliability |
| Web | Link preview metadata | Planned | fetch head/meta tags | `AssetExtraction` / `LINK_PREVIEW` | URL, title, description, image URL | preview card | Open Graph spoofing |
| Web | Structured webpage metadata | Gap | JSON-LD / schema.org extraction | `AssetExtraction` / `STRUCTURED_METADATA` | URL, schema type, extractedAt | structured entities | stale or untrusted markup |
| Messaging | LINE direct message | Current TS | webhook or mock sync | `MESSAGE` / `LINE_MESSAGE` | event id, message id, source user id, timestamp | text, entities, links | signature, privacy |
| Messaging | LINE group/room message | Current TS | webhook or mock sync | `MESSAGE` / `LINE_MESSAGE` | group/room id, message id, sender, timestamp | text, mentions, links | group consent, unsend events |
| Messaging | LINE attachment | Planned | message attachment fetch | asset by MIME, parent message asset | content id, MIME, parent message id | OCR/transcript/preview | expiring media URLs |
| Messaging | Telegram direct/group/channel message | Planned | webhook or polling | `MESSAGE` / `TELEGRAM_MESSAGE` | update id, chat id, message id, sender, date | text/entities/links | dedupe, bot access scope |
| Messaging | Telegram attachment | Planned | file API through bot | asset by MIME, parent message asset | file id, unique id, MIME, size | OCR/transcript/preview | token exposure, file expiry |
| Messaging | Gmail thread | Current TS | Gmail API sync | `CONVERSATION` / email thread | threadId, labels, historyId | thread summary, message chunks | OAuth scope, sensitive mail |
| Messaging | Gmail message | Current TS | Gmail API sync | `MESSAGE` / email message | messageId, threadId, from/to/date, labels | body chunks, quoted text filtering | forwarded content, PII |
| Messaging | Gmail attachment | Planned | attachment fetch | asset by MIME, parent message asset | attachment id, message id, filename, MIME | by file type | malware/storage/privacy |
| Messaging | Slack/Discord/WhatsApp | Gap/Defer | provider adapters later | `MESSAGE` by provider | workspace/channel/chat ids, message ids | text, attachments, reactions | scope and consent |
| Calendar | Google Calendar event | Planned | Calendar API | `MESSAGE` / `CALENDAR_EVENT` | event id, calendar id, recurrence id, start/end | agenda summary, follow-ups | recurrence/time zones |
| Calendar | Meeting transcript/recording link | Gap | Calendar/Meet/Drive/manual link | linked audio/video/document assets | meeting id, transcript id, recording id | transcript, action items | consent and retention |
| Contacts | Google contact/person | Planned | People API | `MESSAGE` or `PROFILE` | resourceName, etag, source ids | profile summary, relationship context | identity merge conflicts |
| Contacts | Public profile page | Planned | URL/static HTML | `WEB_PAGE` / `PROFILE` | URL, capturedAt, canonical URL | profile summary | public/private mixing |
| Media | Image upload | Current TS | upload, paste, Drive, message attachment | `IMAGE` | MIME, dimensions, hash, EXIF policy | OCR, caption, objects | EXIF location, sensitive images |
| Media | Screenshot | Gap | paste, upload, screen capture | `IMAGE` | capturedAt, app/window if available | OCR, UI summary | secrets visible in screenshot |
| Media | Video upload | Planned | upload, Drive, message attachment | `VIDEO` | duration, dimensions, thumbnail, hash | transcript, scene summary | storage size, consent |
| Media | Audio upload / voice memo | Current TS | upload, recorder, message attachment | `AUDIO` | duration, MIME, hash, speaker hints | transcript, speaker labels | consent, language |
| Media | Camera/microphone capture | Gap | browser media capture | `IMAGE` / `AUDIO` / `VIDEO` | device permission, capturedAt | OCR/transcript/caption | permission and retention |
| Media | Screen recording | Gap | screen capture later | `VIDEO` | window/screen scope, capturedAt | transcript, frame OCR | secrets, client data |
| Data | Spreadsheet / Google Sheet | Current TS via Drive type | Drive/sheet adapter, upload | `DATASET` / `SPREADSHEET` | fileId, sheet ids, ranges, revision | table chunks, schema inference | formulas, hidden sheets |
| Data | CSV / TSV | Planned | upload, email attachment, Drive | `DATASET` / `CSV` | filename, hash, delimiter, encoding | rows, ranges, schema | PII/finance risk |
| Data | JSON file | Planned | upload/API response | `DATASET` / `JSON` | schema/version, hash | JSON paths, summaries | schema drift |
| Data | API response | Planned | explicit API adapter | `DATASET` / `API_RESPONSE` | endpoint, method, fetchedAt, hash | JSON paths, records | token leakage, rate limits |
| Data | Webhook event | Gap | inbound webhook | `MESSAGE` / `API_RESPONSE` | provider event id, signature, timestamp | normalized event | replay attacks |
| Finance | Receipt image/PDF | Current TS type | upload, email, message attachment | `IMAGE`/`DOCUMENT` + finance hint | merchant/date/amount if extracted | receipt extraction | high-risk final writes |
| Finance | Invoice | Gap | upload/email | `DOCUMENT` | invoice id, vendor, due date | invoice extraction | payment/finance approval |
| Finance | Bank/account CSV | Gap/Defer | upload/manual import | `DATASET` / `CSV` | account id, period, hash | transaction rows | very high privacy |
| Product/Dev | Repo docs | Current docs | repo scan/import | `DOCUMENT` / `MARKDOWN` | path, git commit, hash | markdown chunks | accidental edits/sync |
| Product/Dev | AGENTS.md / SKILL.md | Planned | repo explicit import/export | `DOCUMENT` / `MARKDOWN` | path, version, hash | instruction snapshots | governance/versioning |
| Product/Dev | GitHub issue/PR | Gap/Defer | GitHub adapter later | `MESSAGE` or `DOCUMENT` | repo, issue id, PR id, URL | issue summary, action items | auth and source scope |
| Product/Dev | Logs/terminal output | Gap/Defer | manual paste, local file | `DOCUMENT` / `PLAIN_TEXT` | command, timestamp, env scope | error extraction | secrets in logs |
| Client | Client portal submission | Gap/Defer | form/upload in portal | `MESSAGE` / `DOCUMENT` | token/project id, client contact | request/proposal | public route boundary |
| External AI | External agent output | Planned | future adapter | `MESSAGE` / `CONVERSATION` | external agent id, manifest, request id | proposal summary | never direct DB access |

## 4. Future Input Surfaces

| Input surface | What the user does | Source types produced | First useful v0.1 behavior | Later expansion |
|---|---|---|---|---|
| AI Input text box | Types a thought, command, note, or paste | manual message, actionable note, AI dialogue | create raw item + triage proposal | slash commands, source mentions |
| Inbox quick capture | Drops a quick thought into inbox | manual message | create inbox source asset | mobile capture integration |
| File picker | Selects files from device | document/image/audio/video/dataset | local mock/upload metadata card | real storage + extraction |
| Drag/drop | Drops files, URLs, HTML, text | file, link, HTML snippet | UI-only DATTR-003 prototype | mixed DataTransfer parsing |
| Clipboard paste | Pastes text, URL, image, HTML | text, link, image, HTML | manual capture with type badges | secure clipboard read flow |
| URL capture | Enters or shares a URL | `LINK` | save locator and link preview | DATTR-007 static HTML snapshot |
| Link fetch action | Clicks "snapshot this link" | `WEB_PAGE` from `LINK` | manual static fetch contract only | scheduler, rendered snapshot |
| Google Drive picker | Selects files/folders | Drive file assets | mock sync scope | OAuth + incremental sync |
| Google Docs import | Selects docs | Google Doc assets | metadata + snapshot proposal | read/export Markdown snapshot |
| Gmail thread selection | Selects threads | conversation/message assets | mock selected threads | OAuth + watch/history sync |
| LINE source panel | Selects direct/group chats | LINE conversation/message assets | mock selected chats | webhook + signature verification |
| Telegram source panel | Selects bot-accessible chats | Telegram conversation/message assets | adapter contract | webhook/polling + dedupe |
| Calendar sync | Selects calendars/events | event assets | docs-only | recurrence-aware event intake |
| Contact sync | Selects contact groups | profile/contact assets | docs-only | People API etag/sync |
| RSS/Atom feed | Adds feed URL | feed item assets | docs-only | feed poller + dedupe |
| Camera capture | Takes photo | image asset | defer | receipt/OCR/caption capture |
| Microphone capture | Records voice memo | audio asset | defer | transcript + action items |
| Screen capture | Captures screenshot/recording | image/video asset | defer | OCR and UX review evidence |
| API/webhook connector | Adds provider endpoint | API response/webhook event | docs-only | signed inbound events |
| Browser extension/bookmarklet | Captures current page/link | link, webpage, screenshot | defer | browser-context capture |
| Mobile share sheet | Shares URL/file/text from phone | link/file/text assets | defer | native/mobile integration |
| Client portal form | Client submits request/file | public/client message assets | defer | high-review public intake |

## 5. Input Gaps Not Yet Fully Considered

| Missing aspect | Why it matters | Design recommendation | Related task |
|---|---|---|---|
| Source connection model is too narrow | Current TS has `manual`, `line`, `google_drive`, `google_docs`, `gmail`, `local_file`, `url`; it lacks Telegram, Calendar, Contacts, RSS/Atom, clipboard, webhooks, and capture devices | Add `InputAdapter` / `SourceConnection` proposal before schema changes | `DATTR-010` |
| Permission scope registry | Every source needs explicit user-approved scope | Store provider, account, scope, status, last consent time, and revocation status | `DATTR-010` |
| Sync cursor and dedupe strategy | Messages, email, feeds, and webhooks can duplicate or arrive out of order | Use provider event/message IDs, `historyId`, `update_id`, feed GUID, content hash, and dedupe keys | `DATTR-010` |
| Deletion / unsend / retention | LINE unsend, Telegram deletes, Gmail deletes, Drive deletes, and user retention policies affect provenance | Record tombstone events; do not silently delete downstream decisions | `DATTR-008`, `DATTR-010` |
| Attachment graph | Emails/chats/events often contain attachments and links | Model parent/child source assets and `SourceAssetLink` relationships | `DATTR-002` |
| Static vs rendered web snapshot | Static HTML may miss JS-rendered content | Start static only; add rendered snapshots later with browser/security review | `DATTR-007` |
| Robots/TOS/rate limits | Web fetchers can violate crawl policy or service rules | Respect robots.txt for public fetch; rate-limit; disable private/auth links by default | `DATTR-007` |
| URL security and SSRF | Fetchers can hit localhost/private IPs or dangerous redirects | Block private network targets, local files, credentials in URLs, and unsafe redirects | `DATTR-011` |
| Clipboard safety | Clipboard may contain passwords, tokens, or private text | Make paste explicit; classify secrets; avoid background clipboard reads | `DATTR-011` |
| EXIF/geolocation | Images can leak location/device metadata | Strip or store EXIF only with clear policy | `DATTR-011` |
| Media consent | Audio/video/screen capture can record other people | Require explicit capture consent and retention settings | `DATTR-011` |
| Language/time zone handling | Messages/events/transcripts need correct localization | Store language, original timezone, normalized timezone, and translation status | `DATTR-010` |
| Recurring events | Calendar recurrence creates many event instances | Preserve recurring event id and occurrence id | `DATTR-010` |
| Contact identity merging | People can appear in Gmail, LINE, Telegram, Chamber, Contacts | Separate provider identity from internal person/contact record | `DATTR-010` |
| High-risk module routing | Finance, Life, Client Portal, Company Strategy need review | Source assets can propose, but final writes require approval | `DATA-004`, `DATTR-006` |
| Storage and large-file policy | Video/audio/PDF can be expensive | Define local/remote storage mode, max size, retention, and thumbnail/transcript strategy | `DATTR-010` |
| Error/retry/backoff | Fetch/sync/webhook systems fail | Add fetch/sync run records with status, error summary, retry policy | `DATTR-007`, `DATTR-010` |
| Source reliability | Some sources are authoritative, some are weak signals | Add reliability/sourceQuality fields on asset or extraction | `DATTR-010` |
| Copyright and public output | Snapshotted pages and documents may not be publishable | Keep snapshots private/internal; public output must be summarized and approved | `DATTR-011` |
| External agent context packages | Future agents need bounded source context | Source packages should include IDs, excerpts, risk, and visibility only | `AGENT-002`, `DATTR-006` |

## 6. SourceConnection / InputAdapter Contract

DATTR-010 has now defined the shared adapter contract in `docs/architecture/source_connection_input_adapter_contract.md`.

Before building runtime connectors, every provider should map to this contract:

```txt
InputAdapter
  key
  provider
  sourceKinds
  authMode
  requiredScopes
  supportsWebhook
  supportsPolling
  supportsManualImport
  supportsAttachments
  supportsDeletionEvents
  supportsIncrementalSync
  riskLevel
```

The contract now standardizes:

- provider families and supported source objects
- adapter manifests and capability declarations
- user-owned `SourceConnection` rows
- source scope and consent state
- sync modes, sync cursors, and dedupe keys
- deletion, unsend, archive, and revocation events
- attachment graph references
- adapter lifecycle stages
- BFF-visible actions/loaders
- relationship with `AIWorkflowRun` and `AIWorkItem`

Minimum adapter outputs remain:

- `SourceConnection`
- `RawSourceItem`
- `SourceAsset`
- `AssetAttributeSet`
- optional `SourceConversation`
- optional `SourceMessageEvent`
- optional `SourceFetchRun`
- optional attachment `SourceAsset`
- optional `AssetExtraction`

Minimum adapter lifecycle:

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

Design rule:

```txt
Adapters may create SourceAsset and proposal intents.
Adapters must not write final Work, Research, Client Portal, Finance, Life, Company, or Chamber records directly.
```

## 7. Updated Task Recommendations

| Task id | Title | Status | Purpose |
|---|---|---|---|
| `DATTR-009` | Create source input surface inventory and gap analysis | DONE | This document. |
| `DATTR-010` | Define SourceConnection / InputAdapter contract | DONE | Normalizes provider scopes, sync cursors, dedupe keys, source identity, deletion events, attachment graph, adapter lifecycle, and BFF contract. |
| `DATTR-011` | Define source intake security, privacy, and retention policy | TODO | Cover URL fetch SSRF, robots/TOS, clipboard safety, EXIF, media consent, large-file storage, deletion, and high-risk routing. |
| `DATTR-012` | Prototype source control panel input matrix | TODO | UI-only view showing connected/planned sources, capture mode, risk, sync status, and next action. |
| `DATTR-013` | Establish Composite Data Unit Layer | DONE | Define how SourceAsset pool items become editable, AI-assisted, user-curated DataUnits before module writes. |
| `DATTR-014` | Optimize Single Source Recognition Layer | DONE | Define recognition metadata before SourceNamingProfile, DataUnitProposal, and module workflows. |
| `DATTR-015` | Define AI Source Workflow Run Architecture | DONE | Define AIWorkflowRun, AIWorkItem, source organizing/correction workflows, morning brief reporting, and @mention targets. |
| `DATTR-016` | Prototype AI Import Workbench UI | DONE | UI-only/mock Source Workflow Console for AI Input. |
| `DATTR-017` | Define Composite Data Unit schema proposal | DONE | Translates source, recognition, DataUnit, and workflow layers into schema proposal and migration impact. |

## 8. Immediate Recommendation

Do not implement connectors yet.

Recommended order:

1. Finish `WORK-007` for the Work v0.1 operational loop.
2. Run `DATTR-002` for Source Asset Registry schema proposal and migration impact.
3. Run `DATTR-016` if the next source-input task should make the AI Import Workflow Workbench tangible as UI-only/mock.
4. Run `DATTR-017` for Composite Data Unit + Single Source Recognition + AI Source Workflow schema proposal and migration impact.
5. DATTR-010 is complete. Use `docs/architecture/source_connection_input_adapter_contract.md` before adding any real LINE, Telegram, Gmail, Drive, web fetch, RSS, or clipboard runtime.
6. Run `DATTR-011` before link fetching, message webhooks, media capture, or file storage.
7. Run `DATTR-012` as a UI-only source control panel prototype.
