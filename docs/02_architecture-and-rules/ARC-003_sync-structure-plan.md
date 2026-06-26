# LINE & Google Doc 同步結構化設計方案

## 目前問題

現有的 `mockSyncLINE` 和 `mockImportGoogleDoc` 只做「平面資料匯入」：
- LINE 同步：每次固定匯入 3 則假訊息，無群組概念
- Google Doc 匯入：每次匯入 1 份固定文件，無資料夾/Drive 結構概念

使用者無法知道：同步的範圍是哪些群組？哪些文件？共有多少？

---

## 需要的能力

1. **辨認結構** — LINE 群組/私聊層級；Google Drive 資料夾/文件層級
2. **顯示範圍摘要** — 已選 X 個群組、約 Y 則訊息；已選 Z 份文件
3. **Tree 展開預覽** — 展開群組可看近期訊息；展開資料夾可看文件列表與內容片段
4. **可選擇性同步** — 可以 checkbox 選擇哪些群組/資料夾要納入同步範圍

---

## 新增類型 (`src/types/sync-scope.ts`) — 全新檔案

```ts
// ─── LINE ─────────────────────────────────────────────────────────────────────

export interface LINEParticipant {
  id: string
  displayName: string
}

export interface LINEMessage {
  id: string
  authorName: string
  text: string
  sentAt: string
}

export type LINEChatType = "direct" | "group" | "room"

export interface LINEChat {
  id: string
  type: LINEChatType
  name: string
  memberCount: number
  unreadSinceLastSync: number   // 距上次同步的訊息數
  lastMessageAt: string
  previewMessage: string
  recentMessages?: LINEMessage[]  // 展開時顯示的最近訊息
  isSelected: boolean
}

// ─── Google Drive ─────────────────────────────────────────────────────────────

export type DriveItemType = "folder" | "document" | "spreadsheet" | "presentation" | "other"

export interface DriveItem {
  id: string
  type: DriveItemType
  name: string
  modifiedAt: string
  ownerName: string
  wordCount?: number          // 文件才有
  previewChunk?: string       // 展開時顯示的內容片段
  children?: DriveItem[]      // 資料夾才有
  isSelected: boolean
}

// ─── Sync Scope (選擇結果) ────────────────────────────────────────────────────

export interface SyncScope {
  lineChats: string[]         // selected LINEChat IDs
  driveItems: string[]        // selected DriveItem IDs (含遞迴子項)
}

export interface LineSyncStats {
  groupCount: number
  directCount: number
  estimatedMessages: number
}

export interface DriveSyncStats {
  folderCount: number
  fileCount: number
  estimatedTokens: number
}
```

---

## 新增 Mock 資料

### `src/lib/mock/ingestion/mock-line-structure.ts` — 全新檔案

```ts
import type { LINEChat } from "@/types/sync-scope"

export const mockLINEChats: LINEChat[] = [
  {
    id: "lc-001",
    type: "group",
    name: "商會核心幹部群",
    memberCount: 12,
    unreadSinceLastSync: 34,
    lastMessageAt: "2026-05-09T10:22:00Z",
    previewMessage: "Mark：下週四的聚餐確定了，記得帶名片",
    isSelected: true,
    recentMessages: [
      { id: "m1", authorName: "Mark Wu", text: "下週四的聚餐確定了，記得帶名片", sentAt: "2026-05-09T10:22:00Z" },
      { id: "m2", authorName: "Allen Huang", text: "收到，我會帶提案資料", sentAt: "2026-05-09T09:15:00Z" },
      { id: "m3", authorName: "Oliver", text: "好的，我先確認場地容量", sentAt: "2026-05-09T08:50:00Z" },
    ],
  },
  {
    id: "lc-002",
    type: "direct",
    name: "Cathy Chen",
    memberCount: 2,
    unreadSinceLastSync: 5,
    lastMessageAt: "2026-05-08T22:10:00Z",
    previewMessage: "Cathy：那篇碳揭露的 paper 很值得看，我傳連結給你",
    isSelected: true,
    recentMessages: [
      { id: "m4", authorName: "Cathy Chen", text: "那篇碳揭露的 paper 很值得看，我傳連結給你", sentAt: "2026-05-08T22:10:00Z" },
    ],
  },
  {
    id: "lc-003",
    type: "group",
    name: "nuva藍設計討論",
    memberCount: 5,
    unreadSinceLastSync: 18,
    lastMessageAt: "2026-05-08T16:30:00Z",
    previewMessage: "設計師 Amy：第三版 logo 出來了，請 Oliver 確認方向",
    isSelected: false,
    recentMessages: [
      { id: "m5", authorName: "Amy Lin", text: "第三版 logo 出來了，請 Oliver 確認方向", sentAt: "2026-05-08T16:30:00Z" },
    ],
  },
  {
    id: "lc-004",
    type: "direct",
    name: "Allen Huang",
    memberCount: 2,
    unreadSinceLastSync: 2,
    lastMessageAt: "2026-05-07T14:00:00Z",
    previewMessage: "Allen：我有一份舊的財務表格可以提供參考",
    isSelected: false,
  },
  {
    id: "lc-005",
    type: "group",
    name: "演藝經紀 AI 專案",
    memberCount: 4,
    unreadSinceLastSync: 11,
    lastMessageAt: "2026-05-09T11:00:00Z",
    previewMessage: "PM：需求書第三版已更新到 Google Drive",
    isSelected: true,
  },
]
```

### `src/lib/mock/ingestion/mock-drive-structure.ts` — 全新檔案

```ts
import type { DriveItem } from "@/types/sync-scope"

export const mockDriveRoot: DriveItem[] = [
  {
    id: "dr-001",
    type: "folder",
    name: "Personal OS 研究",
    modifiedAt: "2026-05-09T10:00:00Z",
    ownerName: "Oliver Tai",
    isSelected: true,
    children: [
      {
        id: "dr-002",
        type: "document",
        name: "台灣中小企業資料治理與 AI 導入研究草稿",
        modifiedAt: "2026-05-09T09:30:00Z",
        ownerName: "Oliver Tai",
        wordCount: 1240,
        previewChunk: "本文件探討台灣中小企業在數位轉型過程中面臨的資料治理挑戰，特別是 AI 導入後的資料品質問題…",
        isSelected: true,
      },
      {
        id: "dr-003",
        type: "document",
        name: "CDR 碳捕捉技術比較分析",
        modifiedAt: "2026-05-07T15:00:00Z",
        ownerName: "Oliver Tai",
        wordCount: 890,
        isSelected: false,
      },
    ],
  },
  {
    id: "dr-004",
    type: "folder",
    name: "演藝經紀專案",
    modifiedAt: "2026-05-09T11:00:00Z",
    ownerName: "Oliver Tai",
    isSelected: false,
    children: [
      {
        id: "dr-005",
        type: "document",
        name: "AI 網站需求書 v3",
        modifiedAt: "2026-05-09T11:00:00Z",
        ownerName: "Oliver Tai",
        wordCount: 2100,
        isSelected: false,
      },
      {
        id: "dr-006",
        type: "spreadsheet",
        name: "預算規劃表 2026",
        modifiedAt: "2026-05-06T09:00:00Z",
        ownerName: "Oliver Tai",
        isSelected: false,
      },
    ],
  },
  {
    id: "dr-007",
    type: "document",
    name: "2026-05-06 商業計畫討論記錄",
    modifiedAt: "2026-05-06T18:00:00Z",
    ownerName: "Oliver Tai",
    wordCount: 420,
    isSelected: false,
  },
]
```

---

## 新增元件 (`src/components/ai/sync-scope-picker.tsx`) — 全新檔案

這是一個 modal/sheet，點擊 LINE 或 Google Doc 按鈕後彈出。

**結構：**
```
┌─────────────────────────────────────────────────────┐
│  LINE 同步範圍                         [關閉]       │
├──────────────────┬──────────────────────────────────┤
│  [LINE] [Drive]  │                                   │
├──────────────────┴──────────────────────────────────┤
│  ☑ 商會核心幹部群 (群組・12人)        34則新訊息   │
│    ▶ 展開最近訊息                                   │
│      Mark：下週四的聚餐確定了…                      │
│  ☑ Cathy Chen (私聊)                  5則新訊息    │
│  ☐ nuva藍設計討論 (群組・5人)         18則新訊息   │
│  ☐ Allen Huang (私聊)                  2則新訊息   │
├─────────────────────────────────────────────────────┤
│  已選 2 個群組・1 個私聊・約 39 則訊息              │
│                               [取消] [開始同步]     │
└─────────────────────────────────────────────────────┘
```

**Props：**
```ts
interface SyncScopePickerProps {
  open: boolean
  defaultTab: "line" | "drive"
  onClose: () => void
  onConfirm: (scope: SyncScope) => void
}
```

---

## 需要更新的現有檔案

### `src/types/ingestion.ts` — 小幅更新

`RawSourceItem.metadata` 已經是 `Record<string, string | number | boolean>`，不需改型別。  
只需在使用時寫入約定欄位：

```ts
// LINE 訊息的 metadata 約定
metadata: {
  lineGroupId: "lc-001",
  lineGroupName: "商會核心幹部群",
  lineGroupType: "group",     // "direct" | "group" | "room"
}

// Drive 文件的 metadata 約定
metadata: {
  driveFolderId: "dr-001",
  driveFolderName: "Personal OS 研究",
  driveFileId: "dr-002",
}
```

### `src/lib/context/ingestion-context.tsx` — 更新同步函式簽章

```ts
// 舊
mockSyncLINE: () => void
mockImportGoogleDoc: () => void

// 新
mockSyncLINE: (scope?: { chatIds: string[]; chats: LINEChat[] }) => void
mockImportGoogleDoc: (scope?: { fileIds: string[]; files: DriveItem[] }) => void
```

- 有傳入 scope → 根據選擇的群組/檔案生成對應的 `RawSourceItem`（含 metadata）
- 未傳入 scope（維持向後相容）→ 繼續使用舊的假資料行為

### `src/app/(dashboard)/ai-input/page.tsx` — 更新按鈕行為

```ts
// 舊：點擊直接觸發
<ActionButton label="LINE" onClick={() => handleAction("LINE 同步", mockSyncLINE)} />

// 新：點擊開啟 SyncScopePicker
<ActionButton label="LINE" onClick={() => setScopePickerTab("line")} />
<ActionButton label="Google Doc" onClick={() => setScopePickerTab("drive")} />

// SyncScopePicker modal
<SyncScopePicker
  open={scopePickerTab !== null}
  defaultTab={scopePickerTab ?? "line"}
  onClose={() => setScopePickerTab(null)}
  onConfirm={(scope) => {
    setScopePickerTab(null)
    handleSyncWithScope(scope)
  }}
/>
```

---

## 實作順序

| 步驟 | 動作 | 難度 |
|------|------|------|
| 1 | 建立 `src/types/sync-scope.ts` | 低 |
| 2 | 建立 `src/lib/mock/ingestion/mock-line-structure.ts` | 低 |
| 3 | 建立 `src/lib/mock/ingestion/mock-drive-structure.ts` | 低 |
| 4 | 建立 `src/components/ai/sync-scope-picker.tsx`（UI） | 中 |
| 5 | 更新 `ingestion-context.tsx` 同步函式（接收 scope 參數） | 中 |
| 6 | 更新 `ai-input/page.tsx` 串接 SyncScopePicker | 低 |

步驟 4 是核心工作量，包含：
- Tab 切換（LINE / Google Drive）
- Checkbox 選擇與全選/取消
- Tree 展開/收合（每個群組/資料夾可展開）
- 底部統計摘要（實時更新）
- Confirm 觸發同步

---

## 不需要改動的部分

- `mockRawSourceItems` / `mockNormalizedContent` / `mockEvidence` / `mockTriageProposals` — 這些是靜態假資料，與同步結構無關
- `IngestionContextValue` 的 interface — 只改函式參數，不改整體 context 形狀
- `resolveProposal` / `runMockAnalysis` — 與同步結構無關
