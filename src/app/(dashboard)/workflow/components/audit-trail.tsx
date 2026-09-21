"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { cn } from "@/lib/utils"
import { AGENT_MAP } from "@/lib/workflow/agents"
import { groupByTrace } from "@/lib/workflow/mock-data"
import type { AgentMessage, AgentId, TraceGroup } from "@/lib/workflow/types"

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-500",
  pending: "bg-amber-500/15 text-amber-500",
  accepted: "bg-blue-500/15 text-blue-500",
  rejected: "bg-red-500/15 text-red-500",
}

function formatTime(iso: string, locale: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

function formatRelative(
  iso: string,
  labels: ReturnType<typeof useProductLanguage>["copy"]["workflow"]["audit"]
) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60_000
  if (diff < 1) return labels.justNow
  if (diff < 60) {
    return formatCopy(labels.minutesAgoTemplate, { count: Math.floor(diff) })
  }
  return formatCopy(labels.hoursAgoTemplate, { count: Math.floor(diff / 60) })
}

interface AuditTrailProps {
  messages: AgentMessage[]
  filterAgent: AgentId | null
}

export function AuditTrail({ messages, filterAgent }: AuditTrailProps) {
  const { locale, copy } = useProductLanguage()
  const workflowCopy = copy.workflow
  const [expandedTraces, setExpandedTraces] = React.useState<Set<string>>(new Set(["trace-d"]))

  const groups = React.useMemo(() => {
    const filtered = filterAgent
      ? messages.filter((m) => m.fromAgent === filterAgent || m.toAgent === filterAgent)
      : messages
    return groupByTrace(filtered)
  }, [messages, filterAgent])

  function toggleTrace(id: string) {
    setExpandedTraces((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-1">
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {workflowCopy.audit.noMessages}
        </p>
      ) : (
        groups.map((group) => (
          <TraceRow
            key={group.traceId}
            group={group}
            expanded={expandedTraces.has(group.traceId)}
            onToggle={() => toggleTrace(group.traceId)}
            labels={workflowCopy}
            locale={locale}
          />
        ))
      )}
    </div>
  )
}

function TraceRow({
  group,
  expanded,
  onToggle,
  labels,
  locale,
}: {
  group: TraceGroup
  expanded: boolean
  onToggle: () => void
  labels: ReturnType<typeof useProductLanguage>["copy"]["workflow"]
  locale: string
}) {
  const latestStatus = group.messages[group.messages.length - 1]?.status ?? "pending"

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="text-muted-foreground/50 shrink-0">
          {expanded ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">
          {formatTime(group.startedAt, locale)}
        </span>
        <span className="text-sm font-medium flex-1 truncate">{group.inputSummary}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {formatCopy(labels.audit.messageCountTemplate, { count: group.messages.length })}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              STATUS_STYLE[latestStatus]
            )}
          >
            {labels.audit.status[latestStatus]}
          </span>
          <span className="text-[11px] text-muted-foreground/50">
            {formatRelative(group.startedAt, labels.audit)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 px-3 py-2 flex flex-col gap-1.5 bg-muted/10">
          {group.messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} labels={labels} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

function MessageRow({
  msg,
  labels,
  locale,
}: {
  msg: AgentMessage
  labels: ReturnType<typeof useProductLanguage>["copy"]["workflow"]
  locale: string
}) {
  const fromAgent = msg.fromAgent !== "user" ? AGENT_MAP[msg.fromAgent as AgentId] : null
  const toAgent = AGENT_MAP[msg.toAgent as AgentId]
  const isChild = !!msg.parentMessageId
  const fromAgentLabel =
    msg.fromAgent !== "user" ? labels.agents[msg.fromAgent as AgentId] : labels.audit.user
  const toAgentLabel = labels.agents[msg.toAgent as AgentId]

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-2 py-1.5",
        isChild ? "ml-5 border-l-2 border-border/40 pl-3 rounded-l-none" : ""
      )}
    >
      <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0 mt-0.5 w-14 text-right">
        {formatTime(msg.createdAt, locale)}
      </span>

      {fromAgent ? (
        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{ background: fromAgent.color + "15", color: fromAgent.color }}
        >
          {fromAgentLabel}
        </span>
      ) : (
        <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
          {labels.audit.user}
        </span>
      )}

      <span className="text-muted-foreground/40 text-[11px] shrink-0">→</span>

      {toAgent && (
        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{ background: toAgent.color + "15", color: toAgent.color }}
        >
          {toAgentLabel}
        </span>
      )}

      <span className="text-[11px] text-muted-foreground shrink-0">
        {labels.intents[msg.intent]}
      </span>

      <span className="flex-1 text-[11px] text-muted-foreground/70 truncate min-w-0">
        {msg.summary}
      </span>

      <span
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          STATUS_STYLE[msg.status]
        )}
      >
        {labels.audit.status[msg.status]}
      </span>
    </div>
  )
}
