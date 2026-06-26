// ─── LINE ─────────────────────────────────────────────────────────────────────

export interface LINEMessage {
  id: string
  authorName: string
  text: string
  sentAt: string
}

export type LINEChatType = "direct" | "group"

export interface LINEChat {
  id: string
  type: LINEChatType
  name: string
  memberCount: number
  unreadSinceLastSync: number
  lastMessageAt: string
  previewMessage: string
  recentMessages: LINEMessage[]
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
  wordCount?: number
  previewChunk?: string
  children?: DriveItem[]
  isSelected: boolean
}

// ─── Gmail ────────────────────────────────────────────────────────────────────

export type GmailLabel = "inbox" | "sent" | "important" | "work" | "personal"

export interface GmailMessage {
  id: string
  from: string
  to: string
  snippet: string
  sentAt: string
}

export interface GmailThread {
  id: string
  subject: string
  from: string
  fromEmail: string
  snippet: string
  date: string
  labels: GmailLabel[]
  messageCount: number
  isUnread: boolean
  isSelected: boolean
  messages: GmailMessage[]
}

export interface GmailSyncStats {
  threadCount: number
  unreadCount: number
}

export function computeGmailSyncStats(threads: GmailThread[]): GmailSyncStats {
  const selected = threads.filter((t) => t.isSelected)
  return {
    threadCount: selected.length,
    unreadCount: selected.filter((t) => t.isUnread).length,
  }
}

// ─── @ Mention ────────────────────────────────────────────────────────────────

export type MentionKind =
  | "line"
  | "drive"
  | "gmail"
  | "source_asset"
  | "data_unit_proposal"
  | "ai_workflow_run"
  | "ai_work_item"
  | "morning_brief"
  | "module_record"

export interface MentionRef {
  kind: MentionKind
  id: string
  name: string
  /** Optional short description shown in the picker dropdown */
  description?: string
}

// ─── Derived stats ────────────────────────────────────────────────────────────

export interface LineSyncStats {
  groupCount: number
  directCount: number
  estimatedMessages: number
}

export interface DriveSyncStats {
  folderCount: number
  fileCount: number
  estimatedWordCount: number
}

// ─── Tree utils ───────────────────────────────────────────────────────────────

export function flattenDriveItems(items: DriveItem[]): DriveItem[] {
  const result: DriveItem[] = []
  for (const item of items) {
    result.push(item)
    if (item.children) result.push(...flattenDriveItems(item.children))
  }
  return result
}

export function toggleDriveItemInTree(items: DriveItem[], id: string): DriveItem[] {
  return items.map((item) => {
    if (item.id === id) {
      const next = !item.isSelected
      return {
        ...item,
        isSelected: next,
        children: item.children?.map((c) => ({ ...c, isSelected: next })),
      }
    }
    if (item.children) {
      return { ...item, children: toggleDriveItemInTree(item.children, id) }
    }
    return item
  })
}

export function computeLineSyncStats(chats: LINEChat[]): LineSyncStats {
  const selected = chats.filter((c) => c.isSelected)
  return {
    groupCount: selected.filter((c) => c.type === "group").length,
    directCount: selected.filter((c) => c.type === "direct").length,
    estimatedMessages: selected.reduce((sum, c) => sum + c.unreadSinceLastSync, 0),
  }
}

export function computeDriveSyncStats(items: DriveItem[]): DriveSyncStats {
  const flat = flattenDriveItems(items).filter((i) => i.isSelected)
  return {
    folderCount: flat.filter((i) => i.type === "folder").length,
    fileCount: flat.filter((i) => i.type !== "folder").length,
    estimatedWordCount: flat.reduce((sum, i) => sum + (i.wordCount ?? 0), 0),
  }
}
