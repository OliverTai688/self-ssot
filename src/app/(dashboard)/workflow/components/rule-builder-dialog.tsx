"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AGENTS } from "@/lib/workflow/agents"
import { INTENT_LABELS } from "@/lib/workflow/types"
import type { WorkflowRule, AgentId, Intent, WorkflowMode } from "@/lib/workflow/types"

interface RuleBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: WorkflowRule | null
  onSave: (rule: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">) => void
}

const ALL_INTENTS = Object.keys(INTENT_LABELS) as Intent[]

export function RuleBuilderDialog({ open, onOpenChange, initial, onSave }: RuleBuilderDialogProps) {
  const [name, setName] = React.useState(initial?.name ?? "")
  const [fromAgent, setFromAgent] = React.useState<AgentId | "*">(initial?.fromAgent ?? "work")
  const [intent, setIntent] = React.useState<Intent>(initial?.intent ?? "task.create")
  const [conditions, setConditions] = React.useState(initial?.conditions ?? "")
  const [toAgent, setToAgent] = React.useState<AgentId>(initial?.toAgent ?? "finance")
  const [targetIntent, setTargetIntent] = React.useState<Intent>(initial?.targetIntent ?? "finance.record")
  const [mode, setMode] = React.useState<WorkflowMode>(initial?.mode ?? "broadcast")
  const [requiresApproval, setRequiresApproval] = React.useState(initial?.requiresApproval ?? false)
  const [priority, setPriority] = React.useState(initial?.priority ?? 100)

  React.useEffect(() => {
    if (open && initial) {
      setName(initial.name)
      setFromAgent(initial.fromAgent)
      setIntent(initial.intent)
      setConditions(initial.conditions ?? "")
      setToAgent(initial.toAgent)
      setTargetIntent(initial.targetIntent)
      setMode(initial.mode)
      setRequiresApproval(initial.requiresApproval)
      setPriority(initial.priority)
    } else if (open && !initial) {
      setName("")
      setFromAgent("work")
      setIntent("task.create")
      setConditions("")
      setToAgent("finance")
      setTargetIntent("finance.record")
      setMode("broadcast")
      setRequiresApproval(false)
      setPriority(100)
    }
  }, [open, initial])

  function handleSave() {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      fromAgent,
      intent,
      conditions: conditions.trim() || undefined,
      toAgent,
      targetIntent,
      mode,
      delaySeconds: 0,
      requiresApproval,
      enabled: true,
      priority,
    })
    onOpenChange(false)
  }

  // Filter intents by fromAgent capabilities
  const fromCapabilities = fromAgent === "*"
    ? ALL_INTENTS
    : (AGENTS.find(a => a.agentId === fromAgent)?.capabilities ?? ALL_INTENTS)

  const toCapabilities = AGENTS.find(a => a.agentId === toAgent)?.capabilities ?? ALL_INTENTS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "編輯規則" : "新增 Workflow 規則"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Rule name */}
          <div className="grid gap-1.5">
            <Label>規則名稱</Label>
            <Input
              placeholder="例：任務含金額 → 財務記錄"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* WHEN block */}
          <div className="rounded-xl border border-border/60 p-4 flex flex-col gap-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              WHEN（觸發條件）
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">來源 Agent</Label>
                <Select value={fromAgent} onValueChange={(v) => setFromAgent(v as AgentId | "*")}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">任意 Agent</SelectItem>
                    {AGENTS.map((a) => (
                      <SelectItem key={a.agentId} value={a.agentId}>
                        {a.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">觸發 Intent</Label>
                <Select value={intent} onValueChange={(v) => setIntent(v as Intent)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fromCapabilities.map((i) => (
                      <SelectItem key={i} value={i}>
                        {INTENT_LABELS[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">額外條件（選填）</Label>
              <Input
                placeholder="例：payload.amount > 0"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>

          {/* THEN block */}
          <div className="rounded-xl border border-border/60 p-4 flex flex-col gap-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              THEN（執行動作）
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">目標 Agent</Label>
                <Select value={toAgent} onValueChange={(v) => setToAgent(v as AgentId)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENTS.map((a) => (
                      <SelectItem key={a.agentId} value={a.agentId}>
                        {a.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">目標 Intent</Label>
                <Select value={targetIntent} onValueChange={(v) => setTargetIntent(v as Intent)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toCapabilities.map((i) => (
                      <SelectItem key={i} value={i}>
                        {INTENT_LABELS[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">模式</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as WorkflowMode)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">廣播</SelectItem>
                  <SelectItem value="exclusive">獨佔</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">需要批准</Label>
              <Select
                value={requiresApproval ? "yes" : "no"}
                onValueChange={(v) => setRequiresApproval(v === "yes")}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">即時執行</SelectItem>
                  <SelectItem value="yes">需人工批准</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">優先權</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {initial ? "儲存" : "新增規則"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
