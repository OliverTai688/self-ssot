import type { WorkflowRule, AgentMessage, TraceGroup } from "./types"

export const MOCK_RULES: WorkflowRule[] = [
  {
    id: "rule-1",
    name: "任務含金額 → 財務記錄",
    fromAgent: "work",
    intent: "task.create",
    conditions: "payload.amount > 0",
    toAgent: "finance",
    targetIntent: "finance.record",
    mode: "broadcast",
    delaySeconds: 0,
    requiresApproval: false,
    enabled: true,
    priority: 10,
    createdAt: "2026-05-15T08:00:00Z",
    updatedAt: "2026-05-15T08:00:00Z",
  },
  {
    id: "rule-2",
    name: "任務含聯繫人 → CRM 更新",
    fromAgent: "work",
    intent: "task.create",
    conditions: "payload.contactId != null",
    toAgent: "chamber",
    targetIntent: "contact.update",
    mode: "broadcast",
    delaySeconds: 0,
    requiresApproval: false,
    enabled: true,
    priority: 20,
    createdAt: "2026-05-15T08:00:00Z",
    updatedAt: "2026-05-15T08:00:00Z",
  },
  {
    id: "rule-3",
    name: "商會會議 → 建立工作任務",
    fromAgent: "chamber",
    intent: "chamber.meeting",
    conditions: "payload.tasks.length > 0",
    toAgent: "work",
    targetIntent: "task.create",
    mode: "broadcast",
    delaySeconds: 0,
    requiresApproval: false,
    enabled: true,
    priority: 10,
    createdAt: "2026-05-16T09:00:00Z",
    updatedAt: "2026-05-16T09:00:00Z",
  },
  {
    id: "rule-4",
    name: "新增聯繫人 → 公司資訊同步",
    fromAgent: "chamber",
    intent: "contact.create",
    conditions: "payload.company != null",
    toAgent: "company",
    targetIntent: "company.update",
    mode: "broadcast",
    delaySeconds: 0,
    requiresApproval: false,
    enabled: true,
    priority: 20,
    createdAt: "2026-05-16T09:00:00Z",
    updatedAt: "2026-05-16T09:00:00Z",
  },
  {
    id: "rule-5",
    name: "研究筆記有行動項目 → 建立任務",
    fromAgent: "research",
    intent: "research.note",
    conditions: "payload.hasActionItems == true",
    toAgent: "work",
    targetIntent: "task.create",
    mode: "broadcast",
    delaySeconds: 0,
    requiresApproval: false,
    enabled: true,
    priority: 10,
    createdAt: "2026-05-17T10:00:00Z",
    updatedAt: "2026-05-17T10:00:00Z",
  },
  {
    id: "rule-6",
    name: "逾期發票 → 設定提醒",
    fromAgent: "finance",
    intent: "finance.invoice",
    conditions: "payload.daysOverdue > 30",
    toAgent: "work",
    targetIntent: "reminder.set",
    mode: "exclusive",
    delaySeconds: 0,
    requiresApproval: true,
    enabled: false,
    priority: 10,
    createdAt: "2026-05-18T11:00:00Z",
    updatedAt: "2026-05-18T11:00:00Z",
  },
]

const now = new Date("2026-05-20T10:32:00Z")
function minsAgo(m: number) {
  return new Date(now.getTime() - m * 60_000).toISOString()
}

export const MOCK_MESSAGES: AgentMessage[] = [
  // Trace A: 工作任務含金額 → 財務
  {
    id: "msg-a1",
    traceId: "trace-a",
    fromAgent: "user",
    toAgent: "work",
    intent: "task.create",
    payload: { title: "與 Kevin 開會確認報價", amount: 15000, contactId: "contact-kevin" },
    status: "completed",
    createdAt: minsAgo(32),
    completedAt: minsAgo(31),
    summary: "建立任務：與 Kevin 開會確認報價",
  },
  {
    id: "msg-a2",
    traceId: "trace-a",
    parentMessageId: "msg-a1",
    fromAgent: "work",
    toAgent: "finance",
    intent: "finance.record",
    payload: { title: "與 Kevin 開會確認報價", amount: 15000, type: "income" },
    status: "completed",
    ruleId: "rule-1",
    createdAt: minsAgo(31),
    completedAt: minsAgo(31),
    summary: "財務記錄：專案收入 $15,000",
  },
  {
    id: "msg-a3",
    traceId: "trace-a",
    parentMessageId: "msg-a1",
    fromAgent: "work",
    toAgent: "chamber",
    intent: "contact.update",
    payload: { contactId: "contact-kevin", lastInteraction: minsAgo(32), note: "報價討論" },
    status: "completed",
    ruleId: "rule-2",
    createdAt: minsAgo(31),
    completedAt: minsAgo(31),
    summary: "更新聯繫人：Kevin Chen 最近互動紀錄",
  },

  // Trace B: 商會會議 → 工作任務
  {
    id: "msg-b1",
    traceId: "trace-b",
    fromAgent: "user",
    toAgent: "chamber",
    intent: "chamber.meeting",
    payload: { title: "理事會月會", attendees: ["王大明", "林小芬"], tasks: ["準備年度報告", "聯繫贊助商"] },
    status: "completed",
    createdAt: minsAgo(58),
    completedAt: minsAgo(57),
    summary: "商會會議記錄：理事會月會",
  },
  {
    id: "msg-b2",
    traceId: "trace-b",
    parentMessageId: "msg-b1",
    fromAgent: "chamber",
    toAgent: "work",
    intent: "task.create",
    payload: { titles: ["準備年度報告", "聯繫贊助商"], projectRef: "chamber-board" },
    status: "completed",
    ruleId: "rule-3",
    createdAt: minsAgo(57),
    completedAt: minsAgo(57),
    summary: "建立 2 項任務：準備年度報告、聯繫贊助商",
  },

  // Trace C: 研究筆記 → 任務
  {
    id: "msg-c1",
    traceId: "trace-c",
    fromAgent: "user",
    toAgent: "research",
    intent: "research.note",
    payload: { title: "NANDA 架構筆記", hasActionItems: true, actionItems: ["閱讀 arXiv 2507.14263", "整理架構圖"] },
    status: "completed",
    createdAt: minsAgo(120),
    completedAt: minsAgo(119),
    summary: "研究筆記：NANDA 架構分析",
  },
  {
    id: "msg-c2",
    traceId: "trace-c",
    parentMessageId: "msg-c1",
    fromAgent: "research",
    toAgent: "work",
    intent: "task.create",
    payload: { titles: ["閱讀 arXiv 2507.14263", "整理 NANDA 架構圖"], threadRef: "research-nanda" },
    status: "completed",
    ruleId: "rule-5",
    createdAt: minsAgo(119),
    completedAt: minsAgo(119),
    summary: "建立 2 項研究任務",
  },

  // Trace D: 新增聯繫人 → 公司同步（進行中）
  {
    id: "msg-d1",
    traceId: "trace-d",
    fromAgent: "user",
    toAgent: "chamber",
    intent: "contact.create",
    payload: { name: "陳家豪", company: "台灣數位科技股份有限公司", title: "業務總監" },
    status: "completed",
    createdAt: minsAgo(5),
    completedAt: minsAgo(5),
    summary: "新增聯繫人：陳家豪（台灣數位科技）",
  },
  {
    id: "msg-d2",
    traceId: "trace-d",
    parentMessageId: "msg-d1",
    fromAgent: "chamber",
    toAgent: "company",
    intent: "company.update",
    payload: { name: "台灣數位科技股份有限公司", contactIds: ["contact-chenjhh"] },
    status: "pending",
    ruleId: "rule-4",
    createdAt: minsAgo(4),
    summary: "同步公司資訊：台灣數位科技",
  },
]

export function groupByTrace(messages: AgentMessage[]): TraceGroup[] {
  const grouped = new Map<string, AgentMessage[]>()
  for (const msg of messages) {
    if (!grouped.has(msg.traceId)) grouped.set(msg.traceId, [])
    grouped.get(msg.traceId)!.push(msg)
  }

  return Array.from(grouped.entries())
    .map(([traceId, msgs]) => {
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      const root = sorted.find((m) => !m.parentMessageId)
      return {
        traceId,
        messages: sorted,
        startedAt: sorted[0].createdAt,
        inputSummary: root?.summary ?? "使用者輸入",
      }
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export function countMessagesByRoute(messages: AgentMessage[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const msg of messages) {
    if (msg.fromAgent === "user") continue
    const key = `${msg.fromAgent}->${msg.toAgent}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}
