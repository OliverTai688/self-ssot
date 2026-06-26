# D-PLAN-015: LINE / Telegram Messaging Source Adapter Contract

**Task:** DATTR-008
**Date:** 2026-06-09
**Status:** DONE — contract reference; no webhook runtime or schema migration in this pass

---

## Purpose

Define the intake contract for LINE and Telegram message sources. These are the highest-risk and most privacy-sensitive source types in Personal OS because they carry personal conversations, attachment links, and participant identity. The contract covers: provider event structure, provider IDs, deduplication, signature verification, attachment handling, privacy scope, deletion/unsend events, and how messages enter the SourceAsset pipeline.

No webhook endpoint, polling service, OAuth flow, or database write is added in this task.

---

## 1. LINE Messaging Adapter

**API:** LINE Messaging API (webhook delivery)
**Auth:** Channel Access Token (long-lived) + X-Line-Signature HMAC-SHA256 verification

### 1.1 Event Types Handled

| LINE Event Type | Handling |
|---|---|
| `message` (text) | Ingest as `SourceAsset{ assetKind: "MESSAGE" }` |
| `message` (image) | Ingest IMAGE SourceAsset + download attachment |
| `message` (video) | Ingest VIDEO SourceAsset + download attachment |
| `message` (audio) | Ingest AUDIO SourceAsset + download attachment |
| `message` (file) | Ingest SourceAsset per MIME type of file |
| `message` (sticker) | Ignore (no text content; record as `MESSAGE` with zero content) |
| `message` (location) | Ingest as `MESSAGE` with lat/lon in attributes; GPS strip rule applies |
| `postback` | Ignore (UI interaction; not a source asset) |
| `unsend` | Record `SourceDeletionEvent{ eventType: "unsent" }`; mark asset `workflowState: "REVOKED"` |
| `follow` / `unfollow` | Ignore |
| `memberJoined` / `memberLeft` | Ignore |

### 1.2 Provider Identity Fields

| Personal OS Field | LINE Webhook Field | Notes |
|---|---|---|
| `stableId` | `events[].message.id` (messageId) | Globally unique per message |
| `sourceRef` | `events[].source.groupId` or `userId` or `roomId` | Chat context |
| `providerObjectType` | `"line_message"` | |
| `providerParentId` | `events[].source.groupId` or `roomId` | Thread/group context |
| `revisionId` | null | LINE messages are not revisioned |
| `occurredAt` | `events[].timestamp` (ms epoch → ISO 8601) | |

### 1.3 Sender Metadata

| Attribute Key | Source | Notes |
|---|---|---|
| `senderId` | `events[].source.userId` | LINE user ID (opaque) |
| `senderDisplayName` | LINE Profile API `GET /v2/profile/{userId}` | Requires `profile` scope |
| `senderProfileImage` | LINE Profile API → `pictureUrl` | Cache; do not re-fetch per message |
| `chatType` | `events[].source.type` → `user`, `group`, `room` | |
| `groupId` | `events[].source.groupId` | null for 1-to-1 |
| `roomId` | `events[].source.roomId` | null for group and 1-to-1 |
| `groupName` | LINE Group Summary API `GET /v2/bot/group/{groupId}/summary` | Cache |

### 1.4 Signature Verification

Every webhook delivery must be verified before any processing:

```txt
1. Read X-Line-Signature header
2. Compute HMAC-SHA256(body, channelSecret)
3. Base64-encode the computed digest
4. Compare with X-Line-Signature (constant-time comparison)
5. If mismatch: return HTTP 200 (avoid retry storms) but discard payload entirely
6. Log: signature_failed event in GovernanceEvent{ eventType: "BOUNDARY_VIOLATION_BLOCKED" }
```

Never process a webhook event that fails signature verification.

### 1.5 Attachment Download

For `message` events with type `image`, `video`, `audio`, or `file`:

```txt
1. Retrieve content from LINE Content API:
   GET https://api-data.line.me/v2/bot/message/{messageId}/content
   Authorization: Bearer {channelAccessToken}
2. Stream response to temporary buffer (max 50MB)
3. Compute SHA-256 of raw bytes → contentHash
4. Infer MIME from Content-Type header (do not trust message payload)
5. Store as SourceAsset per MIME type (IMAGE / VIDEO / AUDIO / file kind)
6. Link to parent MESSAGE SourceAsset via SourceAssetLink{ linkType: "DERIVED_FROM" }
```

### 1.6 Deduplication

| Key | Strategy |
|---|---|
| `messageId` | Primary dedup key — check `SourceDedupeKey{ provider: "line", dedupeKey: messageId }` before ingesting |
| `contentHash` | Secondary — if two messages have identical content hashes, flag as potential duplicate but still ingest both (different senders/contexts) |

### 1.7 Privacy Scope

| Concern | Rule |
|---|---|
| 1-to-1 messages | Require explicit user opt-in per contact; do not auto-ingest |
| Group messages | Ingest only groups the user has explicitly configured in SourceConnectionScope |
| Participant names | Treat `senderDisplayName` as PII; do not surface to external agents |
| Location messages | Strip GPS before evidence extraction; keep in `IMAGE_META.gpsLat/gpsLon` only |
| Attachment content | Apply DATTR-011 retention policy; user must consent before transcription |

### 1.8 Deletion / Unsend

When an `unsend` event is received:

```txt
1. Find SourceAsset where stableId = event.unsend.messageId
2. Create SourceDeletionEvent{ eventType: "unsent", provider: "line", ... }
3. Set SourceAsset.workflowState = "REVOKED"
4. If NormalizedContent has been created: mark as revoked_at = now()
5. If Evidence or Proposal exists: mark as source_revoked = true
6. Do NOT delete physical rows — retain audit trail
7. Notify user via GovernanceEvent if the unsent message was already proposed to a module
```

---

## 2. Telegram Messaging Adapter

**API:** Telegram Bot API (getUpdates polling or webhook delivery)
**Auth:** Bot Token in `Authorization: Bot {token}` header

### 2.1 Event Types Handled

| Telegram Update Type | Handling |
|---|---|
| `message.text` | Ingest as `SourceAsset{ assetKind: "MESSAGE" }` |
| `message.photo` | Ingest IMAGE SourceAsset (largest resolution variant) |
| `message.video` | Ingest VIDEO SourceAsset |
| `message.audio` / `voice` | Ingest AUDIO SourceAsset |
| `message.document` | Ingest SourceAsset per MIME type |
| `message.location` | Ingest as `MESSAGE` with lat/lon; GPS strip rule applies |
| `message.sticker` | Ignore |
| `message.forward_*` | Ingest with `forwardedFrom` metadata; mark as potentially third-party |
| `edited_message` | Update existing SourceAsset; create new SourceAssetSnapshot |
| `channel_post` | Ingest if channel is in configured SourceConnectionScope |
| `inline_query` / `callback_query` | Ignore |

Telegram does not have a native "delete for everyone" webhook for the bot API — treat deleted messages as permanent; rely on user-reported deletion.

### 2.2 Provider Identity Fields

| Personal OS Field | Telegram Field | Notes |
|---|---|---|
| `stableId` | `update.message.message_id` + `chat.id` (composite) | `message_id` is unique per chat, not globally |
| `sourceRef` | `update.message.chat.id` | Chat/channel ID |
| `providerObjectType` | `"telegram_message"` | |
| `providerParentId` | `update.message.chat.id` | Thread/channel context |
| `revisionId` | `update.message.edit_date` (Unix) if present | null for original; set on `edited_message` |
| `occurredAt` | `update.message.date` (Unix epoch → ISO 8601) | |

### 2.3 Update ID Deduplication

Telegram guarantees monotonically increasing `update_id` per bot. The sync cursor is the last processed `update_id`:

```txt
SourceSyncCursor {
  provider: "telegram",
  cursorType: "update_id",
  cursorValue: "12345678"
}
```

On polling, call `getUpdates?offset={lastUpdateId + 1}&limit=100&timeout=30`. On receiving updates, process in order and advance cursor only after all updates are persisted.

For webhook delivery, Telegram guarantees at-least-once delivery. Dedup by:
- `SourceDedupeKey{ provider: "telegram", dedupeKey: "{chatId}:{messageId}" }`

### 2.4 Sender Metadata

| Attribute Key | Source | Notes |
|---|---|---|
| `senderId` | `update.message.from.id` | Telegram user ID |
| `senderDisplayName` | `update.message.from.first_name` + `last_name` | Treat as PII |
| `senderUsername` | `update.message.from.username` | May be null |
| `senderIsBot` | `update.message.from.is_bot` | |
| `chatType` | `update.message.chat.type` → `private`, `group`, `supergroup`, `channel` | |
| `chatTitle` | `update.message.chat.title` | null for private chats |
| `forwardedFrom` | `update.message.forward_from.id` and `username` if present | Mark as third-party |

### 2.5 Attachment Download

For `photo`, `video`, `audio`, `voice`, `document` message types:

```txt
1. Get file path from: POST /getFile{ file_id: <largest photo size or document file_id> }
2. Download from: https://api.telegram.org/file/bot{token}/{file_path}
3. Stream to temporary buffer (max 50MB — Telegram Bot API limit for downloads)
4. Compute SHA-256 → contentHash
5. Infer MIME from file_path extension and document.mime_type
6. Store as SourceAsset per MIME type
7. Link to parent MESSAGE via SourceAssetLink{ linkType: "DERIVED_FROM" }
```

Telegram bot token must never appear in logs or error messages.

### 2.6 Privacy Scope

| Concern | Rule |
|---|---|
| Private chats | Require explicit opt-in; default off |
| Groups / supergroups | Ingest only groups in SourceConnectionScope |
| Channels | Ingest only channels explicitly configured |
| Forwarded messages | Mark `isForwarded = true`; do not attribute to the original sender without verification |
| `voice` messages | Audio; require transcription consent |
| Participant names | Treat `senderDisplayName` as PII |

---

## 3. Shared Messaging Adapter Rules

### 3.1 Message SourceAsset Structure

All ingested messages create a `SourceAsset` with:

```
assetKind: "MESSAGE"
mimeType: "text/plain"   (for text messages)
stableId: {provider-specific composite ID}
workflowState: "INBOX"
moduleHint: derived from SourceConnectionScope.defaultModuleKey
```

And an `AssetAttributeSet{ attributeType: "MESSAGE_META" }` with:

```json
{
  "senderId": "...",
  "senderDisplayName": "...",
  "chatType": "group",
  "chatId": "...",
  "chatTitle": "...",
  "threadId": null,
  "replyToMessageId": null,
  "forwardedFrom": null,
  "attachmentCount": 0,
  "mentionedUserIds": [],
  "hashtags": [],
  "urls": [],
  "isEdited": false,
  "editedAt": null
}
```

### 3.2 Evidence Selectors for Messages

```
SourceEvidenceSelector {
  kind: "FULL",
  note: "entire message body"
}
SourceEvidenceSelector {
  kind: "TEXT_RANGE",
  startOffset: 45,
  endOffset: 120,
  note: "key decision mentioned"
}
```

### 3.3 Conversation Grouping

Multiple messages from the same `chatId` within a time window (e.g., 1 hour) are candidates for grouping into a `DataUnitProposal` via the Composite DataUnit Layer (A-ARCH-009). The adapter does not perform grouping — it produces individual `MESSAGE` SourceAssets. The AIWorkflowRun handles grouping proposals.

### 3.4 Risk Flags

| Flag | Condition |
|---|---|
| `PII_SUSPECTED` | Message text contains phone number, email address, or full name pattern |
| `UNVERIFIED_SOURCE` | Forwarded message from unknown sender |
| `SIGNATURE_FAILED` | LINE webhook signature mismatch (should already be discarded) |
| `ATTACHMENT_OVERSIZED` | Attachment download exceeded 50MB |
| `PRIVATE_CHAT` | chatType = "private" — requires explicit opt-in |

### 3.5 Module Hint Derivation

| SourceConnectionScope.defaultModuleKey | Chat signals | moduleHint |
|---|---|---|
| `chamber` | Any | `Chamber` |
| `work` | Contains project/client keywords | `Work` |
| `research` | Contains paper/idea/concept keywords | `Research` |
| null | No scope default | AI triage required |

---

## Acceptance Criteria

- [x] LINE event types handled (message/unsend/ignore rules)
- [x] LINE provider identity fields and sender metadata
- [x] LINE signature verification procedure (HMAC-SHA256)
- [x] LINE attachment download procedure (Content API)
- [x] LINE deduplication (messageId primary key)
- [x] LINE privacy scope rules (1-to-1 opt-in, group allowlist)
- [x] LINE deletion/unsend event handling (REVOKED state, audit trail preserved)
- [x] Telegram event types handled (message/edited_message/ignore rules)
- [x] Telegram provider identity fields (composite message_id + chat_id key)
- [x] Telegram update_id deduplication with SourceSyncCursor
- [x] Telegram attachment download procedure (getFile + download)
- [x] Telegram privacy scope rules (private/group/channel opt-in)
- [x] Shared MESSAGE SourceAsset + MESSAGE_META attribute structure
- [x] Evidence selectors for messages
- [x] Conversation grouping boundary (adapter = individual messages; grouping = DataUnit layer)
- [x] Risk flags (PII_SUSPECTED, PRIVATE_CHAT, SIGNATURE_FAILED, ATTACHMENT_OVERSIZED)
- [ ] Webhook endpoint implementation (follow-on after AUTH-001 + Supabase)
- [ ] getUpdates polling service (follow-on)
- [ ] LINE / Telegram SourceConnection schema addition (follow-on after DATTR-002 Prisma)
