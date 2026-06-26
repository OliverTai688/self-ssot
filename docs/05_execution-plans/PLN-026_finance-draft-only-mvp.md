# D-PLAN-017: Finance Module — Draft-Only MVP Scope

**Task:** FINANCE-001
**Date:** 2026-06-09
**Status:** DONE — scope definition; no implementation until AUTH-001 + Supabase connectivity

---

## 1. Governing Constraint

Finance is a **high-risk module** (AGENTS.md §11). Human approval is required before any final write to Finance data. No AI agent may autonomously create, update, or delete Finance records. All Finance data must be kept off public routes and off Client Portal views.

The v0.1 Finance MVP is strictly **draft-only**: users can record financial intents and receipts; no automation commits final transactions.

---

## 2. MVP Scope

Finance v0.1 supports four object types, all in draft state:

| Object | Description | Status |
|---|---|---|
| `FinanceDraftEntry` | An income or expense that the user has recorded but not finalized | DRAFT → CONFIRMED → ARCHIVED |
| `ReceiptCapture` | A receipt image or PDF ingested via Source Asset pipeline | Linked to FinanceDraftEntry |
| `BudgetCategory` | User-defined categories (e.g., Research Costs, Client Expenses, Office) | ACTIVE / ARCHIVED |
| `FinanceNote` | Freeform annotation on a draft entry or period | Internal only |

Objects **not** in v0.1 scope:
- Automated bank feed import
- Invoice generation
- Tax computation
- Multi-currency exchange rates (store amounts in a single currency only)
- External accounting integrations (Xero, QuickBooks, etc.)

---

## 3. Draft Entry Fields

```typescript
interface FinanceDraftEntry {
  id: string
  ownerId: string
  status: "DRAFT" | "CONFIRMED" | "ARCHIVED"
  entryType: "INCOME" | "EXPENSE" | "TRANSFER"
  amount: number                   // in base currency (TWD for v0.1)
  currency: "TWD"                  // locked to TWD in v0.1
  date: string                     // ISO 8601 date (user-supplied)
  description: string
  categoryId?: string              // FK to BudgetCategory
  projectRef?: string              // optional FK to Project (for project expenses)
  receiptAssetIds?: string[]       // FK to SourceAsset (kind: DOCUMENT/IMAGE)
  tags?: string[]
  notes?: string
  createdAt: string
  confirmedAt?: string
  confirmedBy?: string             // must be the owner; no agent confirmation
}
```

Rules:
- `status = "CONFIRMED"` requires human action only — no auto-confirm
- `amount` is stored as a plain number in TWD; no currency conversion in v0.1
- `projectRef` allows Work module cost tracking but does not auto-write to Work
- `confirmedBy` must match `ownerId` — Finance entries cannot be confirmed by agents

---

## 4. Receipt Capture Flow

Receipts enter through the ingestion pipeline (not a direct Finance form):

```txt
Receipt image / PDF
  -> SourceAsset{ assetKind: "DOCUMENT" | "IMAGE" }
  -> AI extraction run (OCR / document understanding)
  -> SourceActionItem{ actionType: "FINANCE_DRAFT" }  ← NEW actionType for Finance
  -> [Human review in AI workbench]
  -> FinanceDraftEntry{ status: "DRAFT" }
  -> User confirms → status: "CONFIRMED"
```

The `FinanceDraftEntry` is never created automatically from OCR without human review.

The `FINANCE_DRAFT` actionType extends DATTR-006 (D-PLAN-016) but is gated differently: the AI workbench must show a dedicated "財務草稿" review lane with additional confirmation warning.

---

## 5. Data Boundary Rules

| Rule | Detail |
|---|---|
| Finance data is owner-only | No other user, agent, or client may read Finance entries |
| Not on Client Portal | `FinanceDraftEntry`, `ReceiptCapture`, `BudgetCategory` must never appear in client-facing routes |
| Not exposed to external agents | External agents receive zero Finance context |
| Internal agents: read-only aggregate only | Internal agents may read total confirmed expense by category (aggregate), not individual entries |
| Receipts stored securely | Receipt SourceAssets must not be in any publicly accessible storage bucket |
| projectRef is one-way | Finance may reference a Project, but Work queries must not join Finance tables |

---

## 6. UI Surface (FOPS Shell)

Finance uses the 5-tab FOPS shell already built in FOPS-008 (`ModuleOperatingShell`, `highRisk=true`). The tabs in v0.1:

| Tab | Content |
|---|---|
| 總覽 | Draft entry count, confirmed total this month by category |
| 財務操作 | Add draft entry form; receipt upload entry point |
| 代理人 | Agent status (read-only aggregate access only); no agent write |
| 紀錄 | Filterable log of all draft entries and confirmation events |
| 設定 / 邊界 | Budget categories CRUD; currency setting (TWD locked); data boundary statement |

Draft entries list uses a dense table view (date, type, amount, category, status) — no card layout.

---

## 7. Prisma Schema (Proposal)

```prisma
// Proposed — do not migrate until AUTH-001 complete + human approval
model FinanceDraftEntry {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId       String   @db.Uuid  @map("owner_id")
  status        String   @default("DRAFT")   // DRAFT, CONFIRMED, ARCHIVED
  entryType     String             @map("entry_type")  // INCOME, EXPENSE, TRANSFER
  amount        Decimal  @db.Decimal(12,2)
  currency      String   @default("TWD")
  date          DateTime @db.Date
  description   String
  categoryId    String?  @db.Uuid  @map("category_id")
  projectRef    String?  @db.Uuid  @map("project_ref")
  receiptRefs   String[]           @map("receipt_refs")  // SourceAsset IDs
  tags          String[]
  notes         String?
  confirmedAt   DateTime?          @map("confirmed_at")
  confirmedBy   String?  @db.Uuid  @map("confirmed_by")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt      @map("updated_at")

  category      BudgetCategory? @relation(fields: [categoryId], references: [id])
}

model BudgetCategory {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId     String   @db.Uuid  @map("owner_id")
  name        String
  color       String?
  icon        String?
  status      String   @default("ACTIVE")   // ACTIVE, ARCHIVED
  createdAt   DateTime @default(now()) @map("created_at")

  entries     FinanceDraftEntry[]
}
```

---

## Acceptance Criteria

- [x] Draft-only scope defined (no auto-confirm, no bank feed, no tax, TWD-only)
- [x] FinanceDraftEntry and ReceiptCapture flow documented
- [x] FINANCE_DRAFT actionType extension to DATTR-006 pipeline documented
- [x] Data boundary rules (owner-only, no Client Portal, no external agents)
- [x] FOPS shell tab contents for v0.1
- [x] Prisma schema proposal
- [ ] Prisma models added to schema.prisma (follow-on after AUTH-001)
- [ ] Finance server actions implemented (follow-on; human approval required)
- [ ] Receipt OCR extraction wired to FinanceDraftEntry (follow-on after DATTR-024)
