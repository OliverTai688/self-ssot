# Data Flow

## v0.1 Target Flow

```txt
User action
  -> Client component
  -> Server action
  -> requireUser()
  -> service-layer authorization
  -> Prisma write/read
  -> mapper/view model
  -> UI refresh/revalidation
```

## Work Flow

```txt
Project list/detail
  -> getProjects() / getProjectById()
  -> project.service.ts
  -> Prisma Project/Task/Note/Deliverable
  -> work.mapper.ts
  -> Work UI
```

## Client Portal Flow

```txt
Client token route
  -> DB lookup by token
  -> visibility filters
  -> public UI
```

Rules:

- Only client-visible tasks and deliverables are shown.
- Internal notes are hidden by default.
- Token strategy must be auditable and revocable later.

## Ingestion Flow Target

```txt
Raw source item
  -> source asset registry
  -> source asset attributes
  -> source asset snapshot / extraction
  -> normalized content
  -> evidence
  -> AI triage proposal
  -> human decision
  -> module write or rejection
  -> audit trail
```

Ingestion remains mock/local in v0.1 unless a task explicitly migrates a small part.

## Source Asset Flow Target

```txt
Google Doc / Markdown / HTML / PDF / image / video / audio / link / LINE / Telegram / CSV / JSON / API response
  -> SourceAsset
  -> AssetAttributeSet
  -> SourceAssetSnapshot
  -> AssetExtraction
  -> NormalizedContent / Evidence
  -> SourceActionItem or Research source proposal
  -> ModuleWriteIntent
  -> module service authorization
  -> module SSOT record
```

Rules:

- `SourceAsset` identifies the source: provider, external ID, path, URL, MIME type, format, revision, and content hash.
- `AssetAttributeSet` records how Personal OS currently treats it: reference, actionable, evidence, deliverable, mixed, workflow state, risk, and visibility.
- URL/bookmark is a locator; fetched HTML/web page is content and should have its own snapshot metadata.
- Link-to-HTML sync keeps both assets: `LINK` preserves original URL/capture context and fetched `WEB_PAGE` preserves final/canonical URL, HTTP status, content type, fetch time, content hash, and snapshot version.
- LINE / Telegram messages enter as messaging source events with provider IDs, chat/thread IDs, message IDs, event/update IDs, signature/dedupe status, and privacy scope.
- Messaging attachments become their own linked image/video/audio/document/link assets.
- Media and structured-data evidence must preserve addressable source metadata such as page, heading, selector, timestamp, bounding box, spreadsheet range, or JSON pointer.
- Actionable source items never directly mutate Work/Research/Client Portal records; they become reviewed write intents first.
