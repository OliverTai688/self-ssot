import type { AgentFacts, AgentId } from "./types"

export const AGENTS: AgentFacts[] = [
  {
    agentId: "work",
    displayName: "工作管理",
    icon: "Briefcase",
    color: "#3b82f6",
    bgColor: "rgba(59,130,246,0.08)",
    capabilities: ["task.create", "task.update", "reminder.set"],
    triggers: [
      {
        condition: "payload.amount > 0",
        toAgent: "finance",
        intent: "finance.record",
        description: "任務含金額時通知財務模組",
      },
      {
        condition: "payload.contactId != null",
        toAgent: "chamber",
        intent: "contact.update",
        description: "任務涉及聯繫人時更新商會 CRM",
      },
    ],
    priority: 1,
  },
  {
    agentId: "chamber",
    displayName: "商會 CRM",
    icon: "Users",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.08)",
    capabilities: ["contact.create", "contact.update", "chamber.meeting"],
    triggers: [
      {
        condition: "payload.company != null",
        toAgent: "company",
        intent: "company.update",
        description: "新增聯繫人有公司資訊時更新公司模組",
      },
      {
        condition: "payload.tasks.length > 0",
        toAgent: "work",
        intent: "task.create",
        description: "會議記錄含任務事項時通知工作模組",
      },
    ],
    priority: 2,
  },
  {
    agentId: "research",
    displayName: "學術研究",
    icon: "FlaskConical",
    color: "#8b5cf6",
    bgColor: "rgba(139,92,246,0.08)",
    capabilities: ["research.note", "research.source"],
    triggers: [
      {
        condition: "payload.hasActionItems == true",
        toAgent: "work",
        intent: "task.create",
        description: "研究筆記有待辦事項時通知工作模組",
      },
    ],
    priority: 3,
  },
  {
    agentId: "finance",
    displayName: "財務管理",
    icon: "Wallet",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.08)",
    capabilities: ["finance.record", "finance.invoice"],
    triggers: [
      {
        condition: "payload.daysOverdue > 30",
        toAgent: "work",
        intent: "reminder.set",
        description: "逾期發票超過 30 天時設定提醒",
      },
    ],
    priority: 4,
  },
  {
    agentId: "company",
    displayName: "公司管理",
    icon: "Building",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.08)",
    capabilities: ["company.update"],
    triggers: [
      {
        condition: "payload.hasTransaction == true",
        toAgent: "finance",
        intent: "finance.record",
        description: "公司有財務往來記錄時通知財務模組",
      },
    ],
    priority: 5,
  },
  {
    agentId: "life",
    displayName: "生活管理",
    icon: "HeartPulse",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.08)",
    capabilities: ["event.log", "reminder.set"],
    triggers: [],
    priority: 6,
  },
]

export function getAgent(agentId: string): AgentFacts | undefined {
  return AGENTS.find((a) => a.agentId === agentId)
}

export const AGENT_MAP: Record<AgentId, AgentFacts> = Object.fromEntries(
  AGENTS.map((a) => [a.agentId, a])
) as Record<AgentId, AgentFacts>
