import type { Kind, OperatingRecord, OperatingState, UiDataMode } from "@/types/yuanzhan-ui"

export function createOperatingState(mode: UiDataMode): OperatingState {
  const state: OperatingState = { mode, fixtureVersion: "yz-ui-20260913.2", referenceDate: "2026-09-13", records: [], activity: [], dismissedSignals: [] }
  if (mode === "empty") return state
  const add = (id: string, kind: Kind, title: string, fields: Partial<OperatingRecord> = {}) => {
    state.records.push({ id, kind, title, space: "team", author: "yuxing", date: "2026-09-13", visibility: "team", ...fields })
  }
  add("goal-1", "goal", "把每一次交付，累積成可引用的公司知識", { target: 3, actual: 1, unit: "專案", due: "2026-09-30" })
  add("project-1", "project", "企業 QA 知識服務", { body: "讓客戶能從可靠資料找到答案。這週交付：完成訪談整理與第一版 Landing Page。", status: "進行中", members: ["yuxing", "lily"], goalId: "goal-1", due: "2026-09-25" })
  add("project-2", "project", "學習日與品牌素材", { body: "整理工作方法，在週五的學習日一起分享。", status: "待開始", members: ["yuxing", "lily"], goalId: "goal-1", due: "2026-09-18" })
  add("project-3", "project", "內部策略草案", { restricted: true, visibility: "project", members: ["yuxing"], body: "受限專案的示例內容。", status: "待開始" })
  add("task-1", "task", "建立企業 QA Landing Page", { projectId: "project-1", assignee: "lily", size: "M", started: "2026-09-11", due: "2026-09-16", status: "進行中", category: "Todo", body: "完成資訊架構、案例區塊與聯絡表單的介面。" })
  add("task-2", "task", "釐清訪談資料的引用範圍", { projectId: "project-1", assignee: "yuxing", size: "S", status: "受阻", due: "2026-09-12", category: "Issue", body: "需要補齊受訪者的確認紀錄。", refs: ["file-1"] })
  add("task-3", "task", "學習日採用分享與實作各半", { projectId: "project-2", assignee: "lily", size: "S", status: "完成", started: "2026-09-10", completed: "2026-09-11", category: "Decision" })
  for (let i = 0; i < 24; i++) {
    const startDate = new Date(Date.UTC(2026, 7, 3 + Math.floor(i / 4) * 7 + i % 2))
    const endDate = new Date(startDate.getTime() + (2 + i % 3) * 86400000)
    const day = startDate.toISOString().slice(0, 10)
    const done = endDate.toISOString().slice(0, 10)
    add(`history-${i}`, "task", `訪談與設計工作 ${i + 1}`, { projectId: "project-1", assignee: i % 2 ? "lily" : "yuxing", size: "M", date: day, started: day, completed: done, status: "完成", category: "Todo" })
  }
  const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] })
  add("journal-1", "journal", "今天的工作", { body: "從訪談裡找出真正需要回答的問題。今天先整理知識來源，再和 Lily 對齊 Landing Page。 #研究 #交付", document: doc("從訪談裡找出真正需要回答的問題。今天先整理知識來源，再和 Lily 對齊 Landing Page。 #研究 #交付"), refs: ["task-1", "task-2"], tags: ["研究", "交付"] })
  add("journal-2", "journal", "Lily 的 Standup", { author: "lily", body: "昨天：完成需求整理。今天：建立 Landing Page。阻礙：等待訪談引用確認。", document: doc("昨天：完成需求整理。今天：建立 Landing Page。阻礙：等待訪談引用確認。"), refs: ["task-1"], projectId: "project-1" })
  add("journal-3", "journal", "週五回顧", { date: "2026-09-11", body: "把各自的工作放回專案脈絡，就能看出下一步。", document: doc("把各自的工作放回專案脈絡，就能看出下一步。"), tags: ["回顧"] })
  add("journal-private", "journal", "我的私人日誌", { space: "personal", visibility: "private", body: "週末留一些時間散步和閱讀。", document: doc("週末留一些時間散步和閱讀。") })
  add("thread-1", "thread", "訪談整理與交付討論", { projectId: "project-1", body: "把決策留下來，讓後續工作有跡可循。" })
  add("comment-1", "comment", "我已整理第一版問題清單，接下來補來源連結。", { author: "lily", parentId: "thread-1", projectId: "project-1", refs: ["task-1", "file-1"] })
  add("event-1", "event", "QA 第一版交付", { projectId: "project-1", date: "2026-09-16", end: "2026-09-16", layer: "專案", starred: true, refs: ["task-1", "commitment-1"], commitmentId: "commitment-1", logs: [] })
  add("event-2", "event", "週五學習日", { projectId: "project-2", date: "2026-09-18", layer: "日常", end: "2026-09-18" })
  add("event-3", "event", "月度對帳與人事確認", { date: "2026-09-25", layer: "行政", end: "2026-09-25", starred: true })
  add("file-1", "file", "QA 訪談整理.md", { projectId: "project-1", category: "material", tags: ["研究", "訪談"], versions: [{ id: "version-1", name: "v1", date: "2026-09-10", text: "# 訪談整理\n\n核心問題：找到可信的公司知識來源。\n待確認：引用範圍。" }, { id: "version-2", name: "v2", date: "2026-09-13", text: "# 訪談整理 v2\n\n補充：將問題分為資料來源、更新責任與可見範圍。" }] })
  add("file-2", "file", "服務承諾示例.md", { projectId: "project-1", category: "contract", versions: [{ id: "version-contract", name: "v1", date: "2026-09-01", text: "# 合成範例\n\n9 月 16 日交付第一版；每週一次進度回顧。所有內容為介面展示資料。" }] })
  add("file-3", "file", "設計素材憑證.txt", { category: "voucher", versions: [{ id: "version-voucher", name: "v1", date: "2026-09-11", text: "介面示例憑證\n設計素材 1,200 元\n非真實發票" }] })
  add("file-4", "file", "素材採購用途.md", { projectId: "project-1", category: "material", versions: [{ id: "version-purpose", name: "v1", date: "2026-09-11", text: "# 採購用途\n\n本次設計素材用於 QA Landing Page。合成附件，供帳目交叉核對。" }] })
  add("file-5", "file", "工作坊材料收據.txt", { projectId: "project-2", category: "voucher", versions: [{ id: "version-workshop", name: "v1", date: "2026-09-12", text: "介面示例收據\n工作坊材料 3 × 350 = 1,050 元\n非真實發票" }] })
  add("evidence-1", "evidence", "QA 交付資料庫", { projectId: "project-1", readme: "# 企業 QA\n\n## 交付內容\n訪談整理、介面方案與引用說明。\n\n## 尚待完成\n確認引用範圍。", entries: [{ path: "docs/訪談整理.md", fileId: "file-1", versionId: "version-1" }], snapshots: [] })
  add("transaction-1", "transaction", "設計素材", { projectId: "project-1", category: "設計", date: "2026-09-11", ledgerRow: 1, quantity: 2, unitPrice: 600, amount: "=B1*C1", fileIds: ["file-3", "file-4"], matchedId: "bank-1", status: "已對帳" })
  add("transaction-2", "transaction", "工作坊材料", { projectId: "project-2", category: "活動", date: "2026-09-12", ledgerRow: 2, quantity: 3, unitPrice: 350, amount: "=B2*C2", status: "待對帳" })
  add("bank-1", "bank", "素材扣款", { date: "2026-09-11", amount: "1200", matchedId: "transaction-1", status: "已對帳" })
  add("bank-2", "bank", "待確認扣款", { date: "2026-09-12", amount: "900" })
  add("reimbursement-1", "reimbursement", "工作坊材料報帳", { author: "lily", projectId: "project-2", amount: "1050", status: "待確認", fileIds: ["file-5"] })
  add("payroll-1", "payroll", "宇星 9 月試算", { assignee: "yuxing", basePay: 45000, bonus: 3000, status: "草稿" })
  add("payroll-2", "payroll", "Lily 9 月試算", { assignee: "lily", basePay: 36000, bonus: 2000, status: "草稿" })
  add("budget-1", "budget", "QA 設計預算", { projectId: "project-1", category: "設計", amount: "8000" })
  add("budget-2", "budget", "學習日預算", { projectId: "project-2", category: "活動", amount: "3000" })
  for (const who of ["yuxing", "lily"] as const) {
    for (const [category, allocation] of [["交付", who === "lily" ? 60 : 30], ["產品", who === "lily" ? 20 : 30], ["研究", who === "lily" ? 0 : 20], ["管理", 10], ["緩衝", 10]] as const) {
      add(`capacity-${who}-${category}`, "capacity", category, { author: who, assignee: who, category, allocation, date: "2026-09-07" })
    }
  }
  add("commitment-1", "commitment", "第一版交付", { projectId: "project-1", direction: "外部", due: "2026-09-16", target: 1, actual: 0, unit: "版", refs: ["file-2", "task-1"], body: "9 月 16 日交付第一版介面。", status: "進行中", logs: [] })
  add("commitment-2", "commitment", "每週一次團隊回顧", { direction: "內部", due: "2026-09-30", target: 4, actual: 1, unit: "次", body: "每週一起檢查承諾與工作進度。", status: "進行中", logs: [{ id: "log-1", author: "yuxing", date: "2026-09-11", actual: 1, text: "本週回顧已完成，待辦與時間線已對齊。" }] })
  const repo = state.records.find(record => record.id === "evidence-1")!
  repo.snapshots = [{ id: "v1", date: "2026-09-11", readme: "# QA 初步訪談交付\n保留第一版來源，後續持續補充。", entries: [{ path: "docs/訪談整理.md", fileId: "file-1", versionId: "version-1", title: "QA 訪談整理.md", text: state.records.find(record => record.id === "file-1")!.versions![0].text }] }]
  add("evidence-2", "evidence", "學習日待整理交付", { projectId: "project-2", readme: "", entries: [], snapshots: [] })
  return state
}
