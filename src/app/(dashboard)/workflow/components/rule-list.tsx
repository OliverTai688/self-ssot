"use client"

import * as React from "react"
import { EditIcon, GripVerticalIcon, PlusIcon, TrashIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AGENT_MAP } from "@/lib/workflow/agents"
import { INTENT_LABELS } from "@/lib/workflow/types"
import type { WorkflowRule, AgentId } from "@/lib/workflow/types"

interface RuleListProps {
  rules: WorkflowRule[]
  filterAgent: AgentId | null
  onToggleRule: (id: string) => void
  onEditRule: (rule: WorkflowRule) => void
  onDeleteRule: (id: string) => void
  onAddRule: () => void
}

export function RuleList({
  rules,
  filterAgent,
  onToggleRule,
  onEditRule,
  onDeleteRule,
  onAddRule,
}: RuleListProps) {
  const filtered = filterAgent
    ? rules.filter((r) => r.fromAgent === filterAgent || r.toAgent === filterAgent)
    : rules

  const sorted = [...filtered].sort((a, b) => a.priority - b.priority)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {filterAgent ? `${AGENT_MAP[filterAgent]?.displayName} 相關規則` : "全部規則"}
          </p>
          <p className="text-[11px] text-muted-foreground">{sorted.length} 條規則</p>
        </div>
        <Button size="sm" onClick={onAddRule} className="h-7 gap-1.5 text-xs">
          <PlusIcon className="size-3" />
          新增規則
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-10 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">尚無規則</p>
          <Button variant="outline" size="sm" onClick={onAddRule} className="h-7 text-xs">
            新增第一條規則
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => onToggleRule(rule.id)}
              onEdit={() => onEditRule(rule)}
              onDelete={() => onDeleteRule(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: WorkflowRule
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const fromAgent = rule.fromAgent !== "*" ? AGENT_MAP[rule.fromAgent as AgentId] : null
  const toAgent = AGENT_MAP[rule.toAgent]

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-3 transition-all",
        rule.enabled
          ? "border-border/60 bg-card/50 hover:bg-card/80"
          : "border-border/30 bg-muted/20 opacity-60"
      )}
    >
      <GripVerticalIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 cursor-grab" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none mb-2">{rule.name}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* FROM */}
          {fromAgent ? (
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{ background: fromAgent.color + "15", color: fromAgent.color }}
            >
              {fromAgent.displayName}
            </span>
          ) : (
            <span className="rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
              任意
            </span>
          )}

          <span className="text-[11px] text-muted-foreground">
            {INTENT_LABELS[rule.intent]}
          </span>

          <span className="text-muted-foreground/40 text-[11px]">→</span>

          {/* TO */}
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-medium"
            style={{ background: toAgent?.color + "15", color: toAgent?.color }}
          >
            {toAgent?.displayName}
          </span>

          <span className="text-[11px] text-muted-foreground">
            {INTENT_LABELS[rule.targetIntent]}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          {rule.mode === "exclusive" && (
            <span className="text-[10px] rounded-full border border-border/60 px-1.5 py-0.5 text-muted-foreground">
              獨佔
            </span>
          )}
          {rule.requiresApproval && (
            <span className="text-[10px] rounded-full border border-amber-500/40 px-1.5 py-0.5 text-amber-500">
              需批准
            </span>
          )}
          {rule.conditions && (
            <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[140px]">
              if {rule.conditions}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onToggle}
          className={cn(
            "h-5 w-8 rounded-full transition-colors relative",
            rule.enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
              rule.enabled ? "translate-x-3.5" : "translate-x-0.5"
            )}
          />
        </button>
        <button
          onClick={onEdit}
          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <EditIcon className="size-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <TrashIcon className="size-3" />
        </button>
      </div>
    </div>
  )
}
