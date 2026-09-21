export type UiDataMode = "showcase" | "empty"
export type Space = "team" | "personal"
export type ActorId = "yuxing" | "lily"
export type Kind = "journal" | "project" | "task" | "thread" | "comment" | "event" | "goal" | "file" | "evidence" | "transaction" | "bank" | "reimbursement" | "payroll" | "budget" | "capacity" | "commitment"
export type Visibility = "team" | "project" | "private"
export type WorkStatus = "待開始" | "進行中" | "受阻" | "完成"
export type View = "journal" | "today" | "projects" | "timeline" | "files" | "finance" | "capacity" | "commitments" | "signals"
export type RichDoc = { type: string; content?: RichDoc[]; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[] }

// UI-only, serializable objects. These are not database models.
export type OperatingRecord = {
  id: string; kind: Kind; space: Space; author: ActorId; title: string; date: string
  visibility: Visibility; projectId?: string; parentId?: string; status?: string
  body?: string; document?: RichDoc; tags?: string[]; refs?: string[]
  assignee?: ActorId; size?: "S" | "M" | "L"; started?: string; completed?: string; due?: string
  members?: ActorId[]; restricted?: boolean; goalId?: string
  layer?: "專案" | "日常" | "行政"; starred?: boolean; end?: string; commitmentId?: string
  category?: string; amount?: string; quantity?: number; unitPrice?: number; ledgerRow?: number
  fileIds?: string[]; versions?: FileVersion[]; folder?: string; readme?: string
  snapshots?: EvidenceSnapshot[]; entries?: EvidenceEntry[]
  matchedId?: string; basePay?: number; bonus?: number; allocation?: number
  direction?: "內部" | "外部"; target?: number; actual?: number; unit?: string; logs?: ConfirmationLog[]
}
export type FileVersion = { id: string; name: string; text: string; date: string; mime?: string; dataUrl?: string }
export type EvidenceEntry = { path: string; fileId: string; versionId: string }
export type EvidenceSnapshot = { id: string; date: string; readme: string; entries: (EvidenceEntry & { title: string; text: string })[] }
export type ConfirmationLog = { id: string; author: ActorId; date: string; actual: number; text: string }
export type Activity = { id: string; actor: ActorId; recordId: string; kind: Kind; text: string; at: string; space: Space }
export type OperatingState = { mode: UiDataMode; fixtureVersion: string; referenceDate: string; records: OperatingRecord[]; activity: Activity[]; dismissedSignals: string[] }
export const ACTORS = [{ id: "yuxing" as const, name: "宇星", role: "管理者" }, { id: "lily" as const, name: "Lily", role: "成員" }]
export const KINDS: Record<Kind, string> = { journal: "日誌", project: "專案", task: "工作", thread: "對話", comment: "留言", event: "事件", goal: "目標", file: "文件", evidence: "Evidence Repo", transaction: "帳目", bank: "銀行明細", reimbursement: "報帳", payroll: "人事試算", budget: "預算", capacity: "容量配置", commitment: "承諾" }
export const WORK_STATUSES: WorkStatus[] = ["待開始", "進行中", "受阻", "完成"]
