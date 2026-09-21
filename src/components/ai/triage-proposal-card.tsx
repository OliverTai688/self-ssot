"use client"

import * as React from "react"
import {
  CheckIcon,
  ClockIcon,
  InfoIcon,
  LinkIcon,
  PencilIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DetailDrawer } from "@/components/owneros/detail-drawer"
import { EvidenceList } from "@/components/ingestion/evidence-list"
import { SourceTypeBadge } from "@/components/ingestion/source-type-badge"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { AITriageProposal, DecisionType, Evidence, RawSourceItem } from "@/types/ingestion"
import type { Confidence } from "@/types/ai"

// ─── AI type labels ────────────────────────────────────────────────────────────

const AI_TYPE_CLASSES: Record<AITriageProposal["aiType"], string> = {
  triage: "bg-muted text-muted-foreground",
  project_context: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  research_mapping: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  finance_draft: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  life_care: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  memory_capture: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

function getConfidenceBarClass(confidence: Confidence) {
  const map: Record<Confidence, { width: string; className: string }> = {
    high: { width: "w-full", className: "bg-emerald-500" },
    medium: { width: "w-2/3", className: "bg-amber-400" },
    low: { width: "w-1/3", className: "bg-muted-foreground/30" },
  }
  return map[confidence]
}

// ─── Confidence indicator ──────────────────────────────────────────────────────

function ConfidenceBar({ confidence }: { confidence: Confidence }) {
  const { copy } = useProductLanguage()
  const { width, className } = getConfidenceBarClass(confidence)
  const label = copy.inbox.proposalCard.confidenceLabels[confidence]
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", width, className)} />
      </div>
      <span className="text-xs text-muted-foreground">
        {formatCopy(copy.inbox.proposalCard.confidenceLabelTemplate, { label })}
      </span>
    </div>
  )
}

// ─── Inline edit ───────────────────────────────────────────────────────────────

function InlineEdit({
  initialValue,
  onSave,
  onCancel,
  cancelLabel,
  saveLabel,
}: {
  initialValue: string
  onSave: (value: string) => void
  onCancel: () => void
  cancelLabel: string
  saveLabel: string
}) {
  const [value, setValue] = React.useState(initialValue)
  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full resize-none rounded-lg border border-border bg-muted/30 p-2.5 text-sm leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>{cancelLabel}</Button>
        <Button size="sm" onClick={() => onSave(value)}>{saveLabel}</Button>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface TriageProposalCardProps {
  proposal: AITriageProposal
  linkedSources: RawSourceItem[]
  evidences: Evidence[]
  onDecision: (id: string, decision: DecisionType, editedSummary?: string) => void
  className?: string
}

export function TriageProposalCard({
  proposal,
  linkedSources,
  evidences,
  onDecision,
  className,
}: TriageProposalCardProps) {
  const [editing, setEditing] = React.useState(false)
  const { copy } = useProductLanguage()
  const proposalCopy = copy.inbox.proposalCard

  const typeClassName = AI_TYPE_CLASSES[proposal.aiType]
  const isResolved = proposal.status !== "pending" && proposal.status !== "deferred"

  function handleDecision(decision: DecisionType, editedSummary?: string) {
    onDecision(proposal.id, decision, editedSummary)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card ring-1 ring-foreground/5 overflow-hidden transition-opacity",
        isResolved && "opacity-55",
        proposal.status === "dismissed" && "opacity-35",
        className
      )}
    >
      {/* AI origin header */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-2 flex-wrap">
        <SparklesIcon className="size-3 text-muted-foreground flex-shrink-0" />
        <span className="text-[11px] text-muted-foreground flex-shrink-0">{proposalCopy.aiOrigin}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {linkedSources.map((src) => {
            const groupName  = src.metadata?.lineGroupName  as string | undefined
            const fileName   = src.metadata?.driveFileName  as string | undefined
            const folderName = src.metadata?.driveFolderName as string | undefined
            const sourceName = groupName ?? fileName
            return (
              <div key={src.id} className="flex items-center gap-1">
                <SourceTypeBadge sourceType={src.sourceType} className="text-[10px]" />
                {sourceName && (
                  <span className="text-[10px] text-muted-foreground/80 bg-muted/60 rounded px-1.5 py-0.5 max-w-[160px] truncate" title={folderName ? `${folderName} / ${sourceName}` : sourceName}>
                    {folderName ? `${folderName} / ${sourceName}` : sourceName}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {/* Type badge + confidence */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              typeClassName
            )}
          >
            {proposalCopy.aiTypeLabels[proposal.aiType]}
          </span>
          <ConfidenceBar confidence={proposal.confidence} />
        </div>

        {/* Detected type */}
        <p className="text-[11px] text-muted-foreground">{proposal.detectedType}</p>

        {/* Summary */}
        {editing ? (
          <InlineEdit
            initialValue={proposal.summary}
            onSave={(val) => handleDecision("edit", val)}
            onCancel={() => setEditing(false)}
            cancelLabel={proposalCopy.cancel}
            saveLabel={proposalCopy.saveAndConfirm}
          />
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90">{proposal.summary}</p>
        )}

        {/* Extracted entities */}
        {proposal.extractedEntities.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1.5">
            {proposal.extractedEntities.map((entity) => (
              <span
                key={entity}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                <LinkIcon className="size-2.5" />
                {entity}
              </span>
            ))}
          </div>
        )}

        {/* Suggested placement */}
        {proposal.suggestedPlacement && !editing && (
          <p className="text-xs text-muted-foreground">
            {proposalCopy.suggestedPlacement}<span className="text-foreground">{proposal.suggestedPlacement}</span>
          </p>
        )}

        {/* Recommendation */}
        {!editing && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            {proposal.recommendation}
          </div>
        )}

        {/* Reasoning + evidence, collapsed behind one drawer */}
        {!editing && (proposal.reasoning || evidences.length > 0) && (
          <DetailDrawer
            title={proposalCopy.reasoning}
            trigger={
              <button
                type="button"
                className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <InfoIcon className="size-3" />
                {evidences.length > 0
                  ? formatCopy(proposalCopy.evidenceToggleTemplate, { count: evidences.length })
                  : proposalCopy.reasoning}
              </button>
            }
          >
            <div className="space-y-4">
              {proposal.reasoning && (
                <p className="text-xs leading-relaxed text-muted-foreground">{proposal.reasoning}</p>
              )}
              {evidences.length > 0 && <EvidenceList evidences={evidences} />}
            </div>
          </DetailDrawer>
        )}
      </div>

      {/* Action footer */}
      {!isResolved && !editing && (
        <div className="flex items-center gap-1 border-t border-border/50 bg-muted/10 px-4 py-2.5">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-emerald-700 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
            onClick={() => handleDecision("confirm")}
          >
            <CheckIcon className="size-3.5" />
            {proposalCopy.confirm}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-3.5" />
            {proposalCopy.edit}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={() => handleDecision("defer")}
          >
            <ClockIcon className="size-3.5" />
            {proposalCopy.defer}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-destructive ml-auto"
            onClick={() => handleDecision("dismiss")}
          >
            <XIcon className="size-3.5" />
            {proposalCopy.dismiss}
          </Button>
        </div>
      )}

      {isResolved && (
        <div className="border-t border-border/50 px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {proposal.status === "confirmed" && proposalCopy.status.confirmed}
            {proposal.status === "edited" && proposalCopy.status.edited}
            {proposal.status === "dismissed" && proposalCopy.status.dismissed}
          </p>
        </div>
      )}
    </div>
  )
}
