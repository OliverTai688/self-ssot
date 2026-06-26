"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, XIcon, ClockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { CATEGORY_LABELS } from "@/lib/ai/triage"
import type { AICard as AICardType, Confidence, DecisionType, TriageCategory } from "@/types/ai"

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const map = {
    high: { label: "高置信度", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    medium: { label: "中置信度", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
    low: { label: "低置信度", className: "bg-muted text-muted-foreground" },
  }
  const { label, className } = map[confidence]
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  )
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: TriageCategory }) {
  return (
    <Badge variant="outline" className="text-xs">
      {CATEGORY_LABELS[category]}
    </Badge>
  )
}

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AICardType["status"] }) {
  if (status === "pending") return null
  const map = {
    confirmed: "bg-emerald-500",
    edited: "bg-blue-500",
    dismissed: "bg-muted-foreground",
  }
  return (
    <span className={cn("inline-block size-1.5 rounded-full", map[status as keyof typeof map])} />
  )
}

// ─── Edit modal (inline) ──────────────────────────────────────────────────────

function InlineEdit({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = React.useState(initialValue)
  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full resize-none rounded-lg border border-border bg-muted/30 p-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>取消</Button>
        <Button size="sm" onClick={() => onSave(value)}>儲存修改</Button>
      </div>
    </div>
  )
}

// ─── AICard props ─────────────────────────────────────────────────────────────

interface AICardProps {
  card: AICardType
  onDecision?: (id: string, decision: DecisionType, editedContent?: string) => void
  className?: string
  showActions?: boolean
}

// ─── Main AICard component ────────────────────────────────────────────────────

export function AICard({ card, onDecision, className, showActions = true }: AICardProps) {
  const [reasoningOpen, setReasoningOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)

  const isResolved = card.status !== "pending"

  function handleDecision(decision: DecisionType, editedContent?: string) {
    onDecision?.(card.id, decision, editedContent)
    setEditing(false)
  }

  return (
    <Card
      className={cn(
        "transition-opacity",
        isResolved && "opacity-60",
        card.status === "dismissed" && "opacity-40",
        className
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {card.triageCategory && <CategoryBadge category={card.triageCategory} />}
              <ConfidenceBadge confidence={card.confidence} />
              {isResolved && <StatusDot status={card.status} />}
            </div>
            <p className="font-medium text-sm leading-snug">{card.title}</p>
          </div>
          <time className="shrink-0 text-xs text-muted-foreground pt-0.5">
            {new Date(card.createdAt).toLocaleDateString("zh-TW", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>

        {card.relatedEntityName && (
          <p className="text-xs text-muted-foreground">
            關聯：{card.relatedEntityName}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {editing ? (
          <InlineEdit
            initialValue={card.summary}
            onSave={(val) => handleDecision("edit", val)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90">{card.summary}</p>
        )}

        {card.suggestedPlacement && !editing && (
          <p className="text-xs text-muted-foreground">
            建議放置：<span className="text-foreground">{card.suggestedPlacement}</span>
          </p>
        )}

        {card.recommendation && !editing && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            {card.recommendation}
          </div>
        )}

        {/* Reasoning toggle */}
        {!editing && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
            onClick={() => setReasoningOpen((v) => !v)}
          >
            {reasoningOpen ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
            AI 的判斷依據
          </button>
        )}

        {reasoningOpen && !editing && (
          <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
            {card.reasoning}
          </p>
        )}
      </CardContent>

      {showActions && !isResolved && !editing && (
        <CardFooter className="gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-emerald-700 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
            onClick={() => handleDecision("confirm")}
          >
            <CheckIcon className="size-3.5" />
            確認
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-3.5" />
            編輯
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={() => handleDecision("defer")}
          >
            <ClockIcon className="size-3.5" />
            稍後
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-destructive ml-auto"
            onClick={() => handleDecision("dismiss")}
          >
            <XIcon className="size-3.5" />
            略過
          </Button>
        </CardFooter>
      )}

      {showActions && isResolved && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            {card.status === "confirmed" && "✓ 已確認"}
            {card.status === "edited" && "✓ 已編輯並確認"}
            {card.status === "dismissed" && "已略過"}
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
