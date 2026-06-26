import type { AITriageType } from "@/types/ingestion"
import type { AgentId, Intent } from "./types"

// ─── Triage Type → Agent/Intent ───────────────────────────────────────────────

export interface IngestionDispatchTarget {
  toAgent: AgentId
  intent: Intent
}

export function triageTypeToDispatch(
  aiType: AITriageType
): IngestionDispatchTarget | null {
  switch (aiType) {
    case "project_context":
      return { toAgent: "work", intent: "task.create" }
    case "research_mapping":
      return { toAgent: "research", intent: "research.note" }
    case "finance_draft":
      return { toAgent: "finance", intent: "finance.record" }
    case "life_care":
      return { toAgent: "life", intent: "event.log" }
    case "memory_capture":
      return { toAgent: "chamber", intent: "contact.update" }
    case "triage":
    default:
      return null
  }
}

// ─── Routing label for UI ─────────────────────────────────────────────────────

const AGENT_LABELS: Record<AgentId, string> = {
  work: "工作管理",
  chamber: "商會 CRM",
  research: "學術研究",
  finance: "財務管理",
  company: "公司管理",
  life: "生活管理",
}

export function formatRoutingLabel(target: IngestionDispatchTarget): string {
  return `→ ${AGENT_LABELS[target.toAgent]}`
}
