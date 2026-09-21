import type { ActorId, OperatingRecord, OperatingState, Space } from "@/types/yuanzhan-ui"

export function canRead(record: OperatingRecord, actor: ActorId, records: OperatingRecord[], visited = new Set<string>()): boolean {
  if (visited.has(record.id)) return false
  const next = new Set(visited).add(record.id)
  if (record.space === "personal" || record.visibility === "private") return record.author === actor
  if (record.kind === "payroll" && actor !== "yuxing" && record.assignee !== actor) return false
  const project = record.kind === "project" ? record : records.find(r => r.id === record.projectId)
  if (record.projectId && !project) return false
  if ((project?.restricted || record.visibility === "project") && !project?.members?.includes(actor)) return false
  if (record.parentId) {
    const parent = records.find(r => r.id === record.parentId)
    if (!parent || !canRead(parent, actor, records, next)) return false
  }
  return true
}
export function canEdit(record: OperatingRecord, actor: ActorId) {
  if (record.kind === "journal" || record.kind === "comment") return record.author === actor
  if (["payroll", "budget", "bank"].includes(record.kind)) return actor === "yuxing"
  return record.author === actor
}
export function visibleRecords(state: OperatingState, actor: ActorId, space: Space) {
  return state.records.filter(r => r.space === space && canRead(r, actor, state.records))
}
export function validateRecord(record: OperatingRecord, records: OperatingRecord[], actor: ActorId) {
  if (!record.title.trim()) throw new Error("請填寫名稱。")
  for (const date of [record.date, record.due, record.started, record.completed, record.end, ...(record.logs ?? []).map(log => log.date)].filter((v): v is string => v !== undefined)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("日期格式不正確。")
  }
  if (record.completed && record.started && record.completed < record.started) throw new Error("完成日期不能早於開始日期。")
  if (record.end && record.end < record.date) throw new Error("結束日期不能早於開始日期。")
  if (record.space === "personal" && record.visibility !== "private") throw new Error("私人空間的內容只能由本人讀取。")
  if (record.visibility === "project" && record.kind !== "project" && !record.projectId) throw new Error("請先選擇專案。")
  if (record.kind === "project" && !record.members?.includes(record.author)) throw new Error("專案需包含建立者。")
  if (record.kind === "capacity" && (!Number.isFinite(record.allocation) || record.allocation! < 0 || record.allocation! > 100)) throw new Error("容量需介於 0 與 100%。")
  for (const value of [record.quantity, record.unitPrice, record.basePay, record.bonus, record.target, record.actual]) {
    if (value !== undefined && !Number.isFinite(value)) throw new Error("請填寫有效數字。")
  }
  const refs = [...(record.refs ?? []), ...(record.fileIds ?? []), ...[record.parentId, record.projectId, record.goalId, record.commitmentId].filter((id): id is string => !!id)]
  for (const id of refs) {
    const target = records.find(r => r.id === id)
    if (!target || target.space !== record.space || !canRead(target, actor, records)) throw new Error("引用不存在或不在目前可見範圍。")
  }
  const project = records.find(r => r.id === record.projectId)
  if (record.assignee && (record.visibility === "private" ? record.assignee !== record.author : (project?.restricted || record.visibility === "project") && !project?.members?.includes(record.assignee))) throw new Error("負責人需要能讀取這筆工作。")
  if (record.kind === "evidence" && !record.projectId) throw new Error("Evidence Repo 需要先選擇專案。")
}
export function putRecord(state: OperatingState, record: OperatingRecord, actor: ActorId, at: string): OperatingState {
  const old = state.records.find(r => r.id === record.id)
  if (old && (!canRead(old, actor, state.records) || !canEdit(old, actor))) throw new Error("只有作者可以修改這筆內容。")
  if (old?.commitmentId && old.commitmentId !== record.commitmentId) throw new Error("承諾來源需保留。")
  if (old && (old.kind !== record.kind || old.author !== record.author || old.space !== record.space)) throw new Error("不能變更紀錄的作者、類型或空間。")
  if (!old && record.author !== actor) throw new Error("新紀錄的作者必須是目前使用者。")
  if (!old && ["payroll", "budget", "bank"].includes(record.kind) && actor !== "yuxing") throw new Error("此操作限管理者。")
  if (old?.matchedId && ["amount", "quantity", "unitPrice"].some(key => old[key as keyof OperatingRecord] !== record[key as keyof OperatingRecord])) throw new Error("請先解除配對，再修改金額。")
  validateRecord(record, state.records, actor)
  const records = old ? state.records.map(r => r.id === record.id ? record : r) : [...state.records, record]
  if (!canRead(record, actor, records)) throw new Error("無法將內容移到不可存取的範圍。")
  return { ...state, records, activity: [...state.activity, { id: `${record.id}-${state.activity.length}`, actor, recordId: record.id, kind: record.kind, text: `${old ? "更新" : "新增"}「${record.title}」`, at, space: record.space }] }
}
export function updateProgress(state: OperatingState, id: string, actor: ActorId, status: string, date: string): OperatingState {
  const record = state.records.find(r => r.id === id)
  if (!record || !canRead(record, actor, state.records) || record.kind !== "task" || (record.author !== actor && record.assignee !== actor)) throw new Error("只有作者或負責人可以更新進度。")
  if (!["待開始", "進行中", "受阻", "完成"].includes(status)) throw new Error("無效的工作狀態。")
  const changed = { ...record, status, started: status !== "待開始" ? record.started || date : record.started, completed: status === "完成" ? date : undefined }
  return { ...state, records: state.records.map(r => r.id === id ? changed : r), activity: [...state.activity, { id: `${id}-${state.activity.length}`, actor, recordId: id, kind: "task", text: `進度更新：${status}`, at: `${date}T12:00:00`, space: record.space }] }
}
export function removeRecord(state: OperatingState, id: string, actor: ActorId): OperatingState {
  const record = state.records.find(r => r.id === id)
  if (!record || !canRead(record, actor, state.records) || !canEdit(record, actor)) throw new Error("沒有刪除這筆紀錄的權限。")
  if (record.commitmentId) throw new Error("承諾事件需保留，請記錄已履行或協議變更。")
  if (record.kind === "file" && state.records.some(r => r.entries?.some(e => e.fileId === id) || r.snapshots?.some(s => s.entries.some(e => e.fileId === id)))) throw new Error("文件已被 Evidence 引用；請保留來源，或先移除未封存的引用。")
  if (state.records.some(r => r.id !== id && (r.projectId === id || r.commitmentId === id || r.parentId === id || r.goalId === id || r.refs?.includes(id) || r.fileIds?.includes(id) || r.matchedId === id))) throw new Error("這筆紀錄仍有關聯，請先解除引用或整理子項目。")
  return { ...state, records: state.records.filter(r => r.id !== id), activity: state.activity.filter(a => a.recordId !== id) }
}
export function freezeEvidence(record: OperatingRecord, state: OperatingState, date: string) {
  if (!(record.entries?.length) || !record.readme?.trim()) throw new Error("請先加入文件並填寫 README。")
  const entries = record.entries.map(entry => {
    const file = state.records.find(r => r.id === entry.fileId)
    const version = file?.versions?.find(v => v.id === entry.versionId)
    if (!file || !version) throw new Error("來源或指定版本缺失，無法封存。")
    return { ...entry, title: file.title, text: version.text }
  })
  const paths = entries.map(e => e.path.trim())
  if (paths.some(p => !p || p.startsWith("/") || p.split("/").includes("..")) || new Set(paths).size !== paths.length) throw new Error("資料夾路徑需有效且不重複。")
  return { ...record, snapshots: [...(record.snapshots ?? []), { id: `v${(record.snapshots?.length ?? 0) + 1}`, date, readme: record.readme!, entries }] }
}

// Manager may reconcile existing visible entries without taking over their authorship or body.
export function reconcileRecords(state: OperatingState, bankId: string, transactionId: string, actor: ActorId, status: "已對帳" | "差異待查" | "待對帳", at: string): OperatingState {
  if (actor !== "yuxing") throw new Error("對帳操作限管理者。")
  const bank = state.records.find(r => r.id === bankId && r.kind === "bank")
  const transaction = state.records.find(r => r.id === transactionId && r.kind === "transaction")
  if (!bank || !transaction || bank.space !== transaction.space || !canRead(bank, actor, state.records) || !canRead(transaction, actor, state.records)) throw new Error("對帳來源不存在或不可讀取。")
  const unpair = status === "待對帳"
  if (unpair ? bank.matchedId !== transaction.id || transaction.matchedId !== bank.id : bank.matchedId || transaction.matchedId) throw new Error("配對狀態已變更，請重新選擇。")
  return { ...state, records: state.records.map(r => r.id === bank.id ? { ...r, matchedId: unpair ? undefined : transaction.id, status } : r.id === transaction.id ? { ...r, matchedId: unpair ? undefined : bank.id, status } : r), activity: [...state.activity, ...[bank, transaction].map(r => ({ id: `${r.id}-${state.activity.length}`, actor, recordId: r.id, kind: r.kind, text: `${unpair ? "解除配對" : "對帳"}：${status}`, at, space: r.space }))] }
}
