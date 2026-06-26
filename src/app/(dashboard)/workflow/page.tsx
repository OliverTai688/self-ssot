"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"
import { AgentRegistryPanel } from "./components/agent-registry-panel"
import { FlowVisualizer } from "./components/flow-visualizer"
import { RuleList } from "./components/rule-list"
import { AuditTrail } from "./components/audit-trail"
import { RuleBuilderDialog } from "./components/rule-builder-dialog"
import { MOCK_RULES, MOCK_MESSAGES } from "@/lib/workflow/mock-data"
import type { AgentId, WorkflowRule } from "@/lib/workflow/types"

type BottomTab = "rules" | "audit"

export default function WorkflowPage() {
  const [rules, setRules] = React.useState<WorkflowRule[]>(MOCK_RULES)
  const [selectedAgent, setSelectedAgent] = React.useState<AgentId | null>(null)
  const [activeTab, setActiveTab] = React.useState<BottomTab>("rules")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<WorkflowRule | null>(null)

  function handleAddRule() {
    setEditingRule(null)
    setDialogOpen(true)
  }

  function handleEditRule(rule: WorkflowRule) {
    setEditingRule(rule)
    setDialogOpen(true)
  }

  function handleSaveRule(draft: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString()
    if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id ? { ...r, ...draft, updatedAt: now } : r
        )
      )
    } else {
      const newRule: WorkflowRule = {
        ...draft,
        id: `rule-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      }
      setRules((prev) => [...prev, newRule])
    }
  }

  function handleToggleRule(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    )
  }

  function handleDeleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const enabledCount = rules.filter((r) => r.enabled).length
  const totalMessages = MOCK_MESSAGES.length

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Workflow"
        description={`${enabledCount} 條規則啟用 · ${totalMessages} 則訊息`}
      />

      {/* Action bar */}
      <div className="flex items-center justify-end border-b px-4 py-2 bg-card/20">
        <Button size="sm" onClick={handleAddRule} className="gap-1.5 h-7 text-xs">
          <PlusIcon className="size-3" />
          新增規則
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* Left: Agent Registry */}
        <AgentRegistryPanel
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
          messages={MOCK_MESSAGES}
          rules={rules}
        />

        {/* Center + Bottom */}
        <div className="flex flex-col flex-1 min-w-0 gap-4">
          {/* Flow Visualizer */}
          <FlowVisualizer
            rules={rules}
            messages={MOCK_MESSAGES}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />

          {/* Bottom panel with tabs */}
          <div className="flex flex-col rounded-2xl border border-border/50 bg-card/20 overflow-hidden min-h-[280px] max-h-[340px]">
            {/* Tab bar */}
            <div className="flex border-b border-border/40 px-4 gap-1 bg-card/30">
              {(
                [
                  { key: "rules", label: "規則列表" },
                  { key: "audit", label: "事件日誌" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={
                    activeTab === key
                      ? "border-b-2 border-primary px-3 py-2.5 text-sm font-medium text-foreground"
                      : "px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "rules" ? (
                <RuleList
                  rules={rules}
                  filterAgent={selectedAgent}
                  onToggleRule={handleToggleRule}
                  onEditRule={handleEditRule}
                  onDeleteRule={handleDeleteRule}
                  onAddRule={handleAddRule}
                />
              ) : (
                <AuditTrail
                  messages={MOCK_MESSAGES}
                  filterAgent={selectedAgent}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <RuleBuilderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingRule}
        onSave={handleSaveRule}
      />
    </div>
  )
}
