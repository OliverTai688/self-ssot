"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProductLanguage } from "@/lib/context/product-language-context"
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
  const { copy } = useProductLanguage()
  const workflowCopy = copy.workflow
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
    if (!open) return

    let cancelled = false
    window.queueMicrotask(() => {
      if (cancelled) return

      if (initial) {
        setName(initial.name)
        setFromAgent(initial.fromAgent)
        setIntent(initial.intent)
        setConditions(initial.conditions ?? "")
        setToAgent(initial.toAgent)
        setTargetIntent(initial.targetIntent)
        setMode(initial.mode)
        setRequiresApproval(initial.requiresApproval)
        setPriority(initial.priority)
        return
      }

      setName("")
      setFromAgent("work")
      setIntent("task.create")
      setConditions("")
      setToAgent("finance")
      setTargetIntent("finance.record")
      setMode("broadcast")
      setRequiresApproval(false)
      setPriority(100)
    })

    return () => {
      cancelled = true
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
          <DialogTitle>
            {initial ? workflowCopy.dialog.editTitle : workflowCopy.dialog.addTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="grid gap-1.5">
            <Label>{workflowCopy.dialog.name}</Label>
            <Input
              placeholder={workflowCopy.dialog.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-border/60 p-4 flex flex-col gap-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {workflowCopy.dialog.when}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">{workflowCopy.dialog.fromAgent}</Label>
                <Select value={fromAgent} onValueChange={(v) => setFromAgent(v as AgentId | "*")}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">{workflowCopy.dialog.anyAgent}</SelectItem>
                    {AGENTS.map((a) => (
                      <SelectItem key={a.agentId} value={a.agentId}>
                        {workflowCopy.agents[a.agentId]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{workflowCopy.dialog.triggerIntent}</Label>
                <Select value={intent} onValueChange={(v) => setIntent(v as Intent)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fromCapabilities.map((i) => (
                      <SelectItem key={i} value={i}>
                        {workflowCopy.intents[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{workflowCopy.dialog.conditions}</Label>
              <Input
                placeholder={workflowCopy.dialog.conditionsPlaceholder}
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4 flex flex-col gap-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {workflowCopy.dialog.then}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">{workflowCopy.dialog.toAgent}</Label>
                <Select value={toAgent} onValueChange={(v) => setToAgent(v as AgentId)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENTS.map((a) => (
                      <SelectItem key={a.agentId} value={a.agentId}>
                        {workflowCopy.agents[a.agentId]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{workflowCopy.dialog.targetIntent}</Label>
                <Select value={targetIntent} onValueChange={(v) => setTargetIntent(v as Intent)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toCapabilities.map((i) => (
                      <SelectItem key={i} value={i}>
                        {workflowCopy.intents[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">{workflowCopy.dialog.mode}</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as WorkflowMode)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">{workflowCopy.dialog.broadcast}</SelectItem>
                  <SelectItem value="exclusive">{workflowCopy.dialog.exclusive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{workflowCopy.dialog.approval}</Label>
              <Select
                value={requiresApproval ? "yes" : "no"}
                onValueChange={(v) => setRequiresApproval(v === "yes")}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">{workflowCopy.dialog.immediate}</SelectItem>
                  <SelectItem value="yes">{workflowCopy.dialog.humanApproval}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{workflowCopy.dialog.priority}</Label>
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
            {workflowCopy.dialog.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {initial ? workflowCopy.dialog.save : workflowCopy.dialog.addRule}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
