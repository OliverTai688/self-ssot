# D-PLAN-018: Chamber Module — CRM MVP Scope

**Task:** CHAMBER-001
**Date:** 2026-06-09
**Status:** DONE — scope definition; no implementation until AUTH-001 + Supabase connectivity

---

## 1. Purpose

The Chamber module tracks relationships within the user's chamber of commerce context: contacts, meeting interactions, referral paths, and collaboration opportunities. It is a lightweight operational CRM — not a general-purpose contacts database.

Risk level: MEDIUM. Chamber data includes personal contact information and business relationship context. It must not be exposed to external agents or public routes.

---

## 2. MVP Scope

Chamber v0.1 supports four object types:

| Object | Description |
|---|---|
| `ChamberContact` | A person in the user's chamber network |
| `ChamberInteraction` | A recorded touch point (meeting, message, referral, intro) |
| `ChamberOpportunity` | A collaboration or referral opportunity in progress |
| `ChamberNote` | A private note about a contact or opportunity |

Objects **not** in v0.1 scope:
- Organisation/company entity (contacts are persons only; company name is a field)
- Calendar event sync (interaction dates are user-supplied)
- LinkedIn / business card OCR integration
- Pipeline / deal stage management (use Work module for that)
- Public-facing member directory

---

## 3. ChamberContact Fields

```typescript
interface ChamberContact {
  id: string
  ownerId: string
  displayName: string
  preferredName?: string           // 稱呼
  title?: string                   // 職稱
  organization?: string            // 所屬機構
  chamberRole?: string             // 商會職位 (理事長、常務理事、委員...)
  email?: string
  phone?: string                   // stored encrypted; not displayed in shared views
  lineId?: string                  // LINE contact handle; stored encrypted
  tags?: string[]                  // e.g., "核心幹部", "潛在合作", "引薦人"
  trustLevel?: "new" | "known" | "trusted" | "partner"
  sourceRef?: string               // how this contact was first introduced
  firstContactDate?: string        // ISO 8601 date
  lastInteractionDate?: string     // derived from ChamberInteraction
  notes?: string
  status: "active" | "inactive" | "archived"
  createdAt: string
}
```

Privacy rules:
- `email`, `phone`, `lineId` are PII — stored encrypted at rest; never exposed to external agents
- `trustLevel` is used to gate how much context internal agents may reference (see Section 6)
- Chamber contacts are never surfaced in Client Portal

---

## 4. ChamberInteraction Fields

```typescript
interface ChamberInteraction {
  id: string
  ownerId: string
  contactId: string                // FK to ChamberContact
  interactionType:
    | "meeting"                    // 會面
    | "message_exchange"           // 訊息互動
    | "referral_given"             // 引薦他人
    | "referral_received"          // 被引薦
    | "introduction"               // 介紹新成員
    | "event_attendance"           // 活動出席
    | "collaboration"              // 合作互動
  date: string                     // ISO 8601 date
  summary: string
  outcome?: string                 // 結果或後續行動
  relatedOpportunityId?: string    // FK to ChamberOpportunity
  sourceAssetIds?: string[]        // FK to SourceAsset (LINE message thread, etc.)
  tags?: string[]
  createdAt: string
}
```

Source asset links allow LINE message threads or meeting notes to be linked to an interaction without duplicating content.

---

## 5. ChamberOpportunity Fields

```typescript
interface ChamberOpportunity {
  id: string
  ownerId: string
  title: string
  opportunityType:
    | "referral"                   // 引薦
    | "collaboration"              // 合作
    | "speaking"                   // 演講/分享
    | "procurement"                // 採購合作
    | "research"                   // 研究合作
    | "other"
  contactIds: string[]             // involved contacts
  status: "exploring" | "active" | "completed" | "paused" | "declined"
  priority?: "HIGH" | "MEDIUM" | "LOW"
  targetDate?: string
  notes?: string
  relatedProjectId?: string        // FK to Work Project if converted to a project
  createdAt: string
  updatedAt: string
}
```

When an opportunity converts to a project, `relatedProjectId` is set. No automatic project creation — user manually links or creates via Work module.

---

## 6. Data Boundary Rules

| Rule | Detail |
|---|---|
| Owner-only | Chamber data is only visible to the authenticated owner |
| Not on Client Portal | ChamberContact, ChamberInteraction, ChamberOpportunity must never appear in client-facing routes |
| PII encrypted | `email`, `phone`, `lineId` stored encrypted at rest |
| Internal agents — trustLevel-gated | Agents may only reference contact names and chamberRole for contacts with `trustLevel = "trusted"` or `"partner"`; no PII fields; no raw interaction logs |
| External agents | No Chamber context provided to external agents |
| LINE source links | LINE message source assets may link to interactions but require messaging source consent (DATTR-008 opt-in) |

---

## 7. UI Surface (FOPS Shell)

Chamber uses the 5-tab FOPS shell from FOPS-008. Tabs in v0.1:

| Tab | Content |
|---|---|
| 總覽 | Key contacts (recent interaction), open opportunities, interaction frequency |
| 聯絡人管理 | Filterable contact list (name, role, org, trust level, last interaction) |
| 代理人 | AI relationship suggestions (mock); opportunity gap analysis (mock) |
| 互動紀錄 | Timeline of all interactions, filterable by contact/type/date |
| 設定 / 邊界 | PII handling statement; contact import/export (manual CSV only in v0.1) |

No card-heavy layout. Primary surface is a dense contact table with interaction count and last-touch date.

---

## 8. Prisma Schema (Proposal)

```prisma
// Proposed — do not migrate until AUTH-001 complete
model ChamberContact {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId             String   @db.Uuid  @map("owner_id")
  displayName         String             @map("display_name")
  preferredName       String?            @map("preferred_name")
  title               String?
  organization        String?
  chamberRole         String?            @map("chamber_role")
  emailEncrypted      String?            @map("email_encrypted")
  phoneEncrypted      String?            @map("phone_encrypted")
  lineIdEncrypted     String?            @map("line_id_encrypted")
  tags                String[]
  trustLevel          String  @default("new") @map("trust_level")
  sourceRef           String?            @map("source_ref")
  firstContactDate    DateTime? @db.Date @map("first_contact_date")
  status              String  @default("active")
  notes               String?
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt      @map("updated_at")

  interactions        ChamberInteraction[]
}

model ChamberInteraction {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId             String   @db.Uuid  @map("owner_id")
  contactId           String   @db.Uuid  @map("contact_id")
  contact             ChamberContact @relation(fields: [contactId], references: [id])
  interactionType     String             @map("interaction_type")
  date                DateTime @db.Date
  summary             String
  outcome             String?
  relatedOpportunityId String? @db.Uuid  @map("related_opportunity_id")
  sourceAssetRefs     String[]           @map("source_asset_refs")
  tags                String[]
  createdAt           DateTime @default(now()) @map("created_at")
}

model ChamberOpportunity {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId             String   @db.Uuid  @map("owner_id")
  title               String
  opportunityType     String             @map("opportunity_type")
  contactRefs         String[]           @map("contact_refs")
  status              String  @default("exploring")
  priority            String?
  targetDate          DateTime? @db.Date @map("target_date")
  notes               String?
  relatedProjectId    String?  @db.Uuid  @map("related_project_id")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt      @map("updated_at")
}
```

---

## Acceptance Criteria

- [x] MVP scope defined (4 object types; no org entity, no LinkedIn, no deal pipeline)
- [x] ChamberContact, ChamberInteraction, ChamberOpportunity fields documented
- [x] PII fields identified (email, phone, lineId → encrypted at rest)
- [x] trustLevel-gated agent access rules
- [x] Data boundary rules (owner-only, no Client Portal, no external agents)
- [x] FOPS shell tab contents for v0.1
- [x] Prisma schema proposal with encrypted PII column naming
- [ ] Prisma models added to schema.prisma (follow-on after AUTH-001)
- [ ] Chamber server actions implemented (follow-on)
- [ ] LINE interaction source linking (follow-on after DATTR-008 + DATTR-024)
