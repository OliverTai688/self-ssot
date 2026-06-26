# D-PROPOSAL-002: Cross-Source Data Operations Persistence Contract

**Task:** DATA-002 (absorbs INGEST-001)
**Date:** 2026-06-09
**Status:** PROPOSAL — no migration until DATTR-011 security policy is approved and Supabase is reachable

---

## Context

The system ingests content from multiple sources (LINE, Google Drive, Gmail, RSS, GitHub, manual clipboard) and processes it through a pipeline: Raw → Normalized → Evidence → Proposal → Decision. This contract defines the Prisma schema for persisting that pipeline. It absorbs INGEST-001 (raw item/proposal/evidence/user decision) and integrates with the DATTR-017 schema for SourceAsset and AI workflow.

---

## Persistence Contract

The data operations layer has 8 entity types:

### 1. Raw Intake
Represents an unprocessed item received from any source.

```prisma
model RawIntakeItem {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  sourceKind      String             @map("source_kind")   // "line", "drive", "gmail", "rss", "github", "manual"
  sourceId        String?            @map("source_id")     // provider-side unique ID
  sourceRef       String?            @map("source_ref")    // URL, chat ID, file path
  rawPayload      Json               @map("raw_payload")   // full raw event/message/file
  receivedAt      DateTime           @map("received_at")
  dedupKey        String?            @map("dedup_key")     // for idempotent ingestion
  processingState String  @default("PENDING") @map("processing_state")  // PENDING, PROCESSING, DONE, FAILED
  createdAt       DateTime @default(now()) @map("created_at")
}
```

### 2. Normalized Content
A cleaned, typed representation of a raw intake item.

```prisma
model NormalizedContent {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  rawIntakeId     String?  @db.Uuid  @map("raw_intake_id")
  sourceAssetId   String?  @db.Uuid  @map("source_asset_id")  // FK to SourceAsset (DATTR-017)
  contentType     String             @map("content_type")  // "text", "image", "audio", "link", "document"
  title           String?
  body            String?
  metadata        Json?
  language        String?
  wordCount       Int?               @map("word_count")
  normalizedAt    DateTime           @map("normalized_at")
  createdAt       DateTime @default(now()) @map("created_at")
}
```

### 3. Evidence
A structured finding extracted from normalized content — the atomic unit that supports a proposal.

```prisma
model Evidence {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId           String   @db.Uuid  @map("owner_id")
  normalizedContentId String? @db.Uuid @map("normalized_content_id")
  evidenceType      String             @map("evidence_type")  // "quote", "summary", "observation", "link"
  body              String
  sourceRef         String?            @map("source_ref")
  selectors         Json?              // text range, page, timestamp, bounding box
  confidence        Float?
  createdAt         DateTime @default(now()) @map("created_at")
}
```

### 4. Proposal
An AI-generated or system-generated suggestion for a module action, backed by evidence.

```prisma
model Proposal {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  proposalType    String             @map("proposal_type")  // "TASK", "NOTE", "DELIVERABLE", "RESEARCH_LINK", "SOURCE_ASSET"
  targetModule    String             @map("target_module")  // "work", "research", "life", etc.
  summary         String
  detail          Json?
  evidenceIds     String[]           @map("evidence_ids")   // UUIDs of supporting Evidence rows
  status          String  @default("PENDING")               // PENDING, ACCEPTED, REJECTED, EXPIRED
  generatedBy     String?            @map("generated_by")   // agent key or "system"
  aiWorkflowRunId String?  @db.Uuid  @map("ai_workflow_run_id")
  createdAt       DateTime @default(now()) @map("created_at")
  resolvedAt      DateTime?          @map("resolved_at")
}
```

### 5. Module Write Intent
A user-confirmed decision to write to a specific module record, with full lineage preserved.

```prisma
model ModuleWriteIntent {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  proposalId      String?  @db.Uuid  @map("proposal_id")
  targetModule    String             @map("target_module")
  targetRecordId  String?  @db.Uuid  @map("target_record_id")   // ID of created/updated record
  writeType       String             @map("write_type")          // "CREATE", "UPDATE", "LINK"
  payload         Json
  status          String  @default("PENDING")                    // PENDING, COMMITTED, FAILED
  committedAt     DateTime?          @map("committed_at")
  committedBy     String?  @db.Uuid  @map("committed_by")
  createdAt       DateTime @default(now()) @map("created_at")
}
```

### 6. AI Conversation Record
Persisted AI cowork conversation context (formal mode only — not mock).

```prisma
model AIConversation {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId         String   @db.Uuid  @map("owner_id")
  title           String?
  mode            String             // "chat", "research", "work_assist"
  messages        Json               // array of { role, content, timestamp, mentionRefs }
  mentionRefs     Json?              @map("mention_refs")  // resolved MentionRef targets
  workflowRunId   String?  @db.Uuid  @map("workflow_run_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt      @map("updated_at")
}
```

### 7. Source Lineage Record
Tracks the provenance chain from raw intake through to module record.

```prisma
model SourceLineage {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId           String   @db.Uuid  @map("owner_id")
  rawIntakeId       String?  @db.Uuid  @map("raw_intake_id")
  normalizedId      String?  @db.Uuid  @map("normalized_id")
  evidenceId        String?  @db.Uuid  @map("evidence_id")
  proposalId        String?  @db.Uuid  @map("proposal_id")
  writeIntentId     String?  @db.Uuid  @map("write_intent_id")
  moduleRecordType  String?            @map("module_record_type")  // "ProjectTask", "ProjectNote", etc.
  moduleRecordId    String?  @db.Uuid  @map("module_record_id")
  createdAt         DateTime @default(now()) @map("created_at")
}
```

---

## Migration Impact

| Table | New | Risk | Dependencies |
|---|---|---|---|
| `raw_intake_items` | Yes | MEDIUM | owner FK to `profiles` |
| `normalized_content` | Yes | LOW | `raw_intake_items`, future `source_assets` (DATTR-017) |
| `evidence` | Yes | LOW | `normalized_content` |
| `proposals` | Yes | MEDIUM | `evidence` IDs (array, not FK), future `ai_workflow_runs` |
| `module_write_intents` | Yes | HIGH | `proposals`, target module tables |
| `ai_conversations` | Yes | MEDIUM | `profiles` |
| `source_lineage` | Yes | LOW | Multiple optional FKs |

**Note:** `evidence_ids` and `mentionRefs` are stored as JSON/arrays rather than junction tables to keep the schema flexible during v0.1. Full relational junction tables can be added in v0.2 once usage patterns are understood.

---

## Absorbed Tasks

**INGEST-001** (Propose ingestion persistence models) is fully absorbed. The contract covers:
- Raw item → `RawIntakeItem`
- Normalized content → `NormalizedContent`
- Evidence → `Evidence`
- User decision + proposal → `Proposal` + `ModuleWriteIntent`
- Lineage tracking → `SourceLineage`

---

## Blocking Conditions

- **DATTR-011** (source intake security/privacy policy) must be completed before `RawIntakeItem` can store real LINE/Gmail/Drive content — raw payloads may contain sensitive data
- **Supabase connectivity** (WORK-007) required before migration can be tested
- **AUTH-001** required before `owner_id` FK is meaningful

---

## Acceptance Criteria

- [x] Persistence contract for all 7 entity types documented with migration impact
- [x] INGEST-001 absorbed
- [ ] Prisma models added to `schema.prisma` (follow-on after DATTR-011 + AUTH-001)
- [ ] `pnpm db:validate` + `pnpm db:generate` pass (follow-on)
- [ ] Security/privacy annotations added after DATTR-011 review
