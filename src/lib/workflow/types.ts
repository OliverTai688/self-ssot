export type AgentId =
  | "work"
  | "chamber"
  | "company"
  | "finance"
  | "research"
  | "life"

export type Intent =
  | "task.create"
  | "task.update"
  | "contact.create"
  | "contact.update"
  | "finance.record"
  | "finance.invoice"
  | "research.note"
  | "research.source"
  | "event.log"
  | "reminder.set"
  | "company.update"
  | "chamber.meeting"

export type AgentMessageStatus = "pending" | "accepted" | "rejected" | "completed"

export type WorkflowMode = "broadcast" | "exclusive"

export interface AgentTrigger {
  condition: string
  toAgent: AgentId
  intent: Intent
  description: string
}

export interface AgentFacts {
  agentId: AgentId
  displayName: string
  icon: string
  color: string
  bgColor: string
  capabilities: Intent[]
  triggers: AgentTrigger[]
  priority: number
}

export interface AgentMessage {
  id: string
  traceId: string
  parentMessageId?: string
  fromAgent: AgentId | "user"
  toAgent: AgentId
  intent: Intent
  payload: Record<string, unknown>
  status: AgentMessageStatus
  ruleId?: string
  errorMessage?: string
  createdAt: string
  completedAt?: string
  summary?: string
}

export interface WorkflowRule {
  id: string
  name: string
  fromAgent: AgentId | "*"
  intent: Intent
  conditions?: string
  toAgent: AgentId
  targetIntent: Intent
  mode: WorkflowMode
  delaySeconds: number
  requiresApproval: boolean
  enabled: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

export interface TraceGroup {
  traceId: string
  messages: AgentMessage[]
  startedAt: string
  inputSummary: string
}

export const INTENT_LABELS: Record<Intent, string> = {
  "task.create": "建立任務",
  "task.update": "更新任務",
  "contact.create": "建立聯繫人",
  "contact.update": "更新聯繫人",
  "finance.record": "財務記錄",
  "finance.invoice": "開立發票",
  "research.note": "研究筆記",
  "research.source": "文獻來源",
  "event.log": "生活事件",
  "reminder.set": "設定提醒",
  "company.update": "公司資訊更新",
  "chamber.meeting": "商會會議記錄",
}
