"use client"

import {
  BriefcaseIcon,
  BuildingIcon,
  FlaskConicalIcon,
  HeartPulseIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AGENTS } from "@/lib/workflow/agents"
import type { AgentFacts, AgentId, AgentMessage, WorkflowRule } from "@/lib/workflow/types"

const ICON_MAP: Record<string, React.ReactNode> = {
  Briefcase: <BriefcaseIcon className="size-4" />,
  Users: <UsersIcon className="size-4" />,
  FlaskConical: <FlaskConicalIcon className="size-4" />,
  Wallet: <WalletIcon className="size-4" />,
  Building: <BuildingIcon className="size-4" />,
  HeartPulse: <HeartPulseIcon className="size-4" />,
}

interface AgentRegistryPanelProps {
  selectedAgent: AgentId | null
  onSelectAgent: (id: AgentId | null) => void
  messages: AgentMessage[]
  rules: WorkflowRule[]
}

function countForAgent(agent: AgentFacts, messages: AgentMessage[]) {
  return messages.filter(
    (m) => m.toAgent === agent.agentId || m.fromAgent === agent.agentId
  ).length
}

function rulesForAgent(agent: AgentFacts, rules: WorkflowRule[]) {
  return rules.filter(
    (r) => r.fromAgent === agent.agentId || r.toAgent === agent.agentId
  ).length
}

export function AgentRegistryPanel({
  selectedAgent,
  onSelectAgent,
  messages,
  rules,
}: AgentRegistryPanelProps) {
  return (
    <div className="flex flex-col gap-1.5 w-52 shrink-0">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">
        Agent 狀態
      </p>
      {AGENTS.map((agent) => {
        const isSelected = selectedAgent === agent.agentId
        const msgCount = countForAgent(agent, messages)
        const ruleCount = rulesForAgent(agent, rules)

        return (
          <button
            key={agent.agentId}
            onClick={() => onSelectAgent(isSelected ? null : agent.agentId)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
              isSelected
                ? "border-transparent shadow-md"
                : "border-border/50 hover:border-border bg-card/40 hover:bg-card/70"
            )}
            style={
              isSelected
                ? { background: agent.bgColor, borderColor: agent.color + "40" }
                : {}
            }
          >
            <div
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: agent.color + "20", color: agent.color }}
            >
              {ICON_MAP[agent.icon]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none mb-1.5">{agent.displayName}</p>
              <div className="flex gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {msgCount} 訊息
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {ruleCount} 規則
                </span>
              </div>
            </div>
            <div
              className="mt-1 size-2 shrink-0 rounded-full"
              style={{ background: agent.color }}
            />
          </button>
        )
      })}
    </div>
  )
}
