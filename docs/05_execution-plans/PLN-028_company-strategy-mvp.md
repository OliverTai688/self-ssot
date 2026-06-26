# D-PLAN-019: Company Strategy Module — MVP Scope

**Task:** COMPANY-001
**Date:** 2026-06-09
**Status:** DONE — scope definition; no implementation until AUTH-001 + human approval required

---

## 1. Governing Constraint

Company Strategy is a **high-risk module** (AGENTS.md §11). It contains confidential strategic information about the user's company — competitive analysis, partnership pipeline, financial projections, personnel decisions, and board-level initiatives. Human approval is required before any agent write to this module. It must never appear in public routes, Client Portal, or external agent context packages.

---

## 2. MVP Scope

Company Strategy v0.1 is a **read-and-draft surface only**. Users record strategic items and annotate them. No AI agent writes to this module autonomously.

Supported object types:

| Object | Description |
|---|---|
| `StrategyInitiative` | A named company initiative or strategic bet |
| `CompetitorEntry` | A tracked competitor or market player |
| `PartnershipPipeline` | A potential partnership or alliance being explored |
| `StrategyNote` | A private strategic observation or decision log |

Objects **not** in v0.1 scope:
- Financial projection models or spreadsheet integration
- Board/investor communication drafts (use Work deliverables for that)
- Employee/HR records
- Legal entity or cap-table management
- Public company filings integration

---

## 3. StrategyInitiative Fields

```typescript
interface StrategyInitiative {
  id: string
  ownerId: string
  title: string
  horizon: "0-3m" | "3-6m" | "6-12m" | "12m+"
  status: "exploring" | "active" | "paused" | "completed" | "shelved"
  priority?: "P0" | "P1" | "P2" | "P3"
  description?: string             // strategic intent and rationale
  successCriteria?: string
  resourceNeeds?: string           // budget/team implications
  riskNotes?: string
  relatedProjectIds?: string[]     // FK to Work Projects
  ownerNotes?: string              // private owner-only field
  confidentialityLevel: "internal" | "board_only" | "owner_only"
  createdAt: string
  updatedAt: string
}
```

`confidentialityLevel` governs which internal agents may read a summary (only `"internal"` level; `"board_only"` and `"owner_only"` are excluded from all agent context packages).

---

## 4. CompetitorEntry Fields

```typescript
interface CompetitorEntry {
  id: string
  ownerId: string
  name: string
  category: string                 // market segment or product category
  status: "watching" | "active_threat" | "potential_partner" | "exited"
  strengths?: string[]
  weaknesses?: string[]
  recentSignals?: string           // last observed market signal
  sourceRefs?: string[]            // FK to SourceAsset (articles, links captured via RSS/web)
  confidentialityLevel: "internal" | "owner_only"
  createdAt: string
  updatedAt: string
}
```

---

## 5. PartnershipPipeline Fields

```typescript
interface PartnershipPipeline {
  id: string
  ownerId: string
  partnerName: string
  partnerType: "technology" | "distribution" | "research" | "investment" | "government" | "other"
  status: "prospecting" | "exploring" | "negotiating" | "agreed" | "inactive" | "declined"
  contactRef?: string              // FK to ChamberContact if known
  description?: string
  mutualValue?: string
  risks?: string
  nextAction?: string
  targetDate?: string
  confidentialityLevel: "internal" | "board_only" | "owner_only"
  createdAt: string
  updatedAt: string
}
```

---

## 6. Data Boundary Rules

| Rule | Detail |
|---|---|
| Owner-only by default | All Company Strategy data is owner-only unless explicitly shared |
| Never on Client Portal | No Company Strategy data in client-facing routes |
| `"board_only"` and `"owner_only"` records excluded from all agent access | Even internal agents receive no context for these confidentiality levels |
| Internal agents: `"internal"` level only, summary only | Agents may reference the initiative title and horizon but not `ownerNotes`, `riskNotes`, or `resourceNeeds` |
| External agents | No Company Strategy context provided |
| Source asset links | StrategyNote and CompetitorEntry may link to SourceAssets (articles, etc.) but agent reads of those source assets must not include the company strategy association |
| No Work join | Work queries must not join Company Strategy tables; strategy to project relationship is one-way (initiative may reference projects; projects do not know about initiatives) |

---

## 7. UI Surface (FOPS Shell)

Company Strategy uses the 5-tab FOPS shell from FOPS-008 (`highRisk=true`). Tabs in v0.1:

| Tab | Content |
|---|---|
| 總覽 | Active initiatives count by horizon, partnership pipeline summary |
| 策略操作 | Initiative list (filterable by horizon/status/priority); competitor tracker; partnership pipeline |
| 代理人 | AI strategic memo drafting (internal-level only); agent may not write to this module |
| 紀錄 | Audit log of all create/update actions on strategy objects |
| 設定 / 邊界 | Confidentiality level explanation; data boundary statement; agent access policy |

The privacy notice from FOPS-008 remains visible at all times in this module. All lists use dense table rows, not cards.

---

## 8. Prisma Schema (Proposal)

```prisma
// Proposed — do not migrate until AUTH-001 complete + human approval
model StrategyInitiative {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId               String   @db.Uuid  @map("owner_id")
  title                 String
  horizon               String
  status                String  @default("exploring")
  priority              String?
  description           String?
  successCriteria       String?            @map("success_criteria")
  resourceNeeds         String?            @map("resource_needs")
  riskNotes             String?            @map("risk_notes")
  relatedProjectRefs    String[]           @map("related_project_refs")
  ownerNotes            String?            @map("owner_notes")
  confidentialityLevel  String  @default("internal") @map("confidentiality_level")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt      @map("updated_at")
}

model CompetitorEntry {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId               String   @db.Uuid  @map("owner_id")
  name                  String
  category              String
  status                String  @default("watching")
  strengths             String[]
  weaknesses            String[]
  recentSignals         String?            @map("recent_signals")
  sourceAssetRefs       String[]           @map("source_asset_refs")
  confidentialityLevel  String  @default("internal") @map("confidentiality_level")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt      @map("updated_at")
}

model PartnershipPipeline {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId               String   @db.Uuid  @map("owner_id")
  partnerName           String             @map("partner_name")
  partnerType           String             @map("partner_type")
  status                String  @default("prospecting")
  contactRef            String?  @db.Uuid  @map("contact_ref")
  description           String?
  mutualValue           String?            @map("mutual_value")
  risks                 String?
  nextAction            String?            @map("next_action")
  targetDate            DateTime? @db.Date @map("target_date")
  confidentialityLevel  String  @default("internal") @map("confidentiality_level")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt      @map("updated_at")
}
```

---

## Acceptance Criteria

- [x] MVP scope defined (3 object types; no HR, no financials, no legal entity)
- [x] StrategyInitiative, CompetitorEntry, PartnershipPipeline fields documented
- [x] confidentialityLevel field with 3 levels and agent access rules
- [x] Data boundary rules (owner-only, no Client Portal, no external agents, no Work join)
- [x] FOPS shell tab contents for v0.1 with persistent privacy notice
- [x] Prisma schema proposal
- [ ] Prisma models added to schema.prisma (follow-on after AUTH-001 + human approval)
- [ ] Company server actions implemented (follow-on; human approval required for all writes)
- [ ] Source asset link to competitor tracking (follow-on after DATTR-024)
