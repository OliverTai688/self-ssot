# D-POLICY-001: Source Intake Security, Privacy, and Retention Policy

**Task:** DATTR-011
**Date:** 2026-06-09
**Status:** APPROVED (initial policy) — must be reviewed before any runtime connector or raw payload storage is activated

---

## 1. Scope

This policy covers all data ingested via source adapters into `RawIntakeItem` and `NormalizedContent` (see DATA-002), including:
- LINE messages and group chats
- Google Drive and Docs file content
- Gmail messages and threads
- RSS/Atom feed articles
- GitHub repository Markdown files
- Static HTML snapshots from fetched URLs
- Manual clipboard paste and file upload
- Audio, image, and video media files

---

## 2. URL Fetch and Web Content

| Rule | Policy |
|---|---|
| SSRF prevention | URL fetch must only target user-supplied URLs; internal network ranges (10.x, 172.16-31.x, 192.168.x, 127.x, fc00::/7) and non-HTTP(S) schemes are blocked at the adapter layer |
| Robots/TOS | `robots.txt` must be checked before any crawl; pages with `noindex` or `noarchive` must not be stored as `WEB_PAGE` assets |
| Content type validation | Only `text/html`, `text/plain`, `application/pdf`, and approved document MIME types may be fetched; binary executables and archives are rejected |
| URL canonicalization | Redirect chains are followed up to 5 hops; the final canonical URL is stored alongside the requested URL |
| Rate limiting | Maximum 1 fetch per URL per hour per user; batch jobs must use exponential backoff |

---

## 3. Messaging Source (LINE, Telegram, Gmail)

| Rule | Policy |
|---|---|
| Scope consent | Only chats/groups/labels explicitly added to sync scope by the user are ingested; all others are blocked |
| Message deletion | If a message is deleted or unsent at the source, the corresponding `RawIntakeItem` must be flagged for deletion review within 24 hours |
| Group membership | Third-party participant messages in group chats may only be stored if the user is an active participant in that group |
| No shadow capture | The user must explicitly enable sync for a source; no implicit background ingestion |
| PII in payloads | Raw message payloads are stored encrypted-at-rest; PII is not extracted or indexed unless the user explicitly triggers a normalization run |

---

## 4. File and Document Content

| Rule | Policy |
|---|---|
| EXIF and metadata | Location metadata (GPS EXIF) is stripped from images before storage; device identifiers are not stored |
| Large files | Files over 50 MB are not ingested into `RawIntakeItem.rawPayload`; a metadata-only record is created with a reference URL |
| Binary content | Audio, video, and image files require explicit user opt-in for content extraction (transcription, OCR, captioning); raw binary bytes are not stored in DB |
| Access revocation | If a user revokes Drive/Gmail OAuth, all assets from that source must be flagged REVOKED and excluded from future reads within 1 hour |
| Clipboard | Clipboard paste is ephemeral; only user-confirmed paste actions are stored |

---

## 5. High-Risk Module Routing

| Module | Policy |
|---|---|
| Finance | Source items mentioning financial data (invoices, transactions, account numbers) must not be auto-routed to Finance without explicit `ModuleWriteIntent` approval |
| Life | Health, fitness, and personal diary content must not be shared with any other module or Agent without explicit user action |
| Company | Strategy documents and contracts must remain `internal_only` by default; no auto-routing to public or client surfaces |
| Client Portal | No `RawIntakeItem` may be auto-exposed to Client Portal; only content explicitly marked `client_visible` after review |

---

## 6. Retention Policy

| Data type | Default retention | User override |
|---|---|---|
| `RawIntakeItem.rawPayload` | 30 days after normalization | User may extend to 90 days or delete immediately |
| `NormalizedContent` | 180 days | User may delete on request |
| `Evidence` | Retained as long as linked `Proposal` is active | Deleted when all linked proposals are resolved |
| `Proposal` (rejected) | 90 days after rejection | User may purge immediately |
| `ModuleWriteIntent` (committed) | Permanent (audit trail) | Cannot be deleted; can be annotated as corrected |
| `AIConversation` | 90 days | User may delete per conversation |
| `SourceLineage` | Permanent (audit trail) | Cannot be deleted independently |

---

## 7. Agent Access Constraints

| Agent | May read raw payload | May read normalized content | May write proposals |
|---|---|---|---|
| WorkAgent | No | Yes (project-scoped only) | Yes (Work module only) |
| ResearchAgent | No | Yes (research-scoped only) | Yes (Research module only) |
| IngestionAgent | Yes | Yes | Yes (Inbox/AI Input only) |
| FinanceAgent | No | No | No (human-only) |
| LifeAgent | No | Yes (life-scoped only, privacy gate required) | No (human-only) |
| CompanyAgent | No | No | No (human-only) |
| External agents | Never | Never | Never |

---

## 8. Storage and Encryption Requirements

- `RawIntakeItem.rawPayload` (JSON) must be encrypted at rest in the database. Supabase column-level encryption or application-layer encryption before insert.
- API credentials (OAuth tokens, LINE channel secrets, webhook secrets) must NEVER be stored in `RawIntakeItem` or `NormalizedContent`. Store only in server-side environment or a dedicated secrets table with restricted access.
- Source IDs from external providers (LINE message ID, Gmail message ID) should be treated as potentially sensitive and not exposed in client-facing APIs.

---

## 9. Acceptance Criteria

- [x] URL fetch SSRF, robots/TOS, and content-type rules documented
- [x] Messaging source scope consent and deletion rules documented
- [x] EXIF stripping, large file, binary content, and revocation rules documented
- [x] High-risk module routing restrictions documented
- [x] Retention schedule documented
- [x] Agent access matrix documented
- [x] Encryption and secrets storage requirements documented
- [ ] Supabase column-level encryption implementation (follow-on, requires WORK-007)
- [ ] Audit log for source revocation events (follow-on, requires DATA-002 + AUTH-001)
