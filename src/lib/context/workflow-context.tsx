"use client"

import * as React from "react"
import { MOCK_RULES } from "@/lib/workflow/mock-data"
import { dispatchIntent } from "@/lib/workflow/engine"
import { describeRouting } from "@/lib/workflow/engine"
import type { WorkflowRule, AgentMessage, AgentId, Intent } from "@/lib/workflow/types"

// ─── Context Shape ────────────────────────────────────────────────────────────

interface WorkflowContextValue {
  // Rules (shared with Workflow page)
  rules: WorkflowRule[]
  setRules: React.Dispatch<React.SetStateAction<WorkflowRule[]>>

  // Live messages accumulated this session (newest first)
  liveMessages: AgentMessage[]

  // Dispatch an intent through the engine; returns generated messages
  dispatch: (
    fromAgent: AgentId | "user",
    toAgent: AgentId,
    intent: Intent,
    payload: Record<string, unknown>,
    summary?: string
  ) => AgentMessage[]

  // Preview routing without dispatching (for UI hints)
  previewRouting: (
    toAgent: AgentId,
    intent: Intent
  ) => ReturnType<typeof describeRouting>

  // Latest dispatch trace (for toast / inline feedback)
  lastTrace: AgentMessage[] | null
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WorkflowContext = React.createContext<WorkflowContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = React.useState<WorkflowRule[]>(MOCK_RULES)
  const [liveMessages, setLiveMessages] = React.useState<AgentMessage[]>([])
  const [lastTrace, setLastTrace] = React.useState<AgentMessage[] | null>(null)

  const dispatch = React.useCallback(
    (
      fromAgent: AgentId | "user",
      toAgent: AgentId,
      intent: Intent,
      payload: Record<string, unknown>,
      summary?: string
    ): AgentMessage[] => {
      const msgs = dispatchIntent(fromAgent, toAgent, intent, payload, rules, { summary })
      setLiveMessages((prev) => [...msgs, ...prev])
      setLastTrace(msgs)
      return msgs
    },
    [rules]
  )

  const previewRouting = React.useCallback(
    (toAgent: AgentId, intent: Intent) => describeRouting(toAgent, intent, rules),
    [rules]
  )

  return (
    <WorkflowContext.Provider
      value={{ rules, setRules, liveMessages, dispatch, previewRouting, lastTrace }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkflow() {
  const ctx = React.useContext(WorkflowContext)
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider")
  return ctx
}
