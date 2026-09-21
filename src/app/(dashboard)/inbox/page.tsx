"use client"

import * as React from "react"
import {
  AudioLinesIcon,
  FileTextIcon,
  InboxIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"
import { SourceItemCard } from "@/components/ingestion/source-item-card"
import { NormalizedContentPreview } from "@/components/ingestion/normalized-content-preview"
import { TriageProposalCard } from "@/components/ai/triage-proposal-card"
import { useIngestion } from "@/lib/context/ingestion-context"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProductCopy } from "@/lib/i18n/product-copy"

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type InboxTab = "raw" | "processing" | "review" | "confirmed"
type InboxCopy = ProductCopy["inbox"]

const TABS: Array<{ id: InboxTab }> = [
  { id: "raw" },
  { id: "processing" },
  { id: "review" },
  { id: "confirmed" },
]

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

// ─── Toast notification ───────────────────────────────────────────────────────

function ToastBar() {
  const { toasts, dismissToast } = useIngestion()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg max-w-sm"
        >
          <SparklesIcon className="size-4 shrink-0" />
          <span className="flex-1 leading-snug">{t.text}</span>
          <button
            type="button"
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            onClick={() => dismissToast(t.id)}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Mock action bar ──────────────────────────────────────────────────────────

function MockActionBar({ copy }: { copy: InboxCopy }) {
  const { mockSyncLINE, mockImportGoogleDoc, mockUploadMarkdown, mockUploadMedia } = useIngestion()
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground/60 mr-1">{copy.mockImportLabel}</span>
      <Button variant="outline" size="xs" className="gap-1.5" onClick={() => mockSyncLINE()}>
        <MessageSquareIcon className="size-3" />
        {copy.actions.lineSync}
      </Button>
      <Button variant="outline" size="xs" className="gap-1.5" onClick={() => mockImportGoogleDoc()}>
        <FileTextIcon className="size-3" />
        {copy.actions.googleDoc}
      </Button>
      <Button variant="outline" size="xs" className="gap-1.5" onClick={() => mockUploadMarkdown()}>
        <FileTextIcon className="size-3" />
        {copy.actions.markdown}
      </Button>
      <Button variant="outline" size="xs" className="gap-1.5" onClick={() => mockUploadMedia("image")}>
        <UploadIcon className="size-3" />
        {copy.actions.image}
      </Button>
      <Button variant="outline" size="xs" className="gap-1.5" onClick={() => mockUploadMedia("audio")}>
        <AudioLinesIcon className="size-3" />
        {copy.actions.audio}
      </Button>
    </div>
  )
}

// ─── Tab: Raw Sources ─────────────────────────────────────────────────────────

function RawSourcesTab({ copy }: { copy: InboxCopy }) {
  const { rawSourceItems, getNormalizedForItem, getProposalsForItem, runMockAnalysis } = useIngestion()
  const sorted = [...rawSourceItems].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  )

  if (sorted.length === 0) {
    return <EmptyState icon={<InboxIcon />} title={copy.empty.raw.title} hint={copy.empty.raw.hint} />
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((item) => (
        <SourceItemCard
          key={item.id}
          item={item}
          normalizedContents={getNormalizedForItem(item.id)}
          proposalCount={getProposalsForItem(item.id).length}
          onRunAnalysis={runMockAnalysis}
        />
      ))}
    </div>
  )
}

// ─── Tab: Processing ──────────────────────────────────────────────────────────

function ProcessingTab({ copy }: { copy: InboxCopy }) {
  const { rawSourceItems, getNormalizedForItem } = useIngestion()
  const processedItems = rawSourceItems.filter(
    (item) => item.processingStatus === "processed"
  )

  if (processedItems.length === 0) {
    return <EmptyState icon={<RefreshCwIcon />} title={copy.empty.processing.title} hint={copy.empty.processing.hint} />
  }

  return (
    <div className="flex flex-col gap-4">
      {processedItems.map((item) => {
        const ncs = getNormalizedForItem(item.id)
        if (ncs.length === 0) return null
        const title =
          item.title ??
          item.previewText?.slice(0, 50) ??
          item.rawText?.slice(0, 50) ??
          copy.processing.unnamedSource
        return (
          <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border/50 bg-muted/20 px-4 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                {copy.processing.sourcePrefix}{title}
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                {formatCopy(copy.processing.summaryTemplate, {
                  count: ncs.length,
                  tokens: ncs.reduce((s, nc) => s + nc.tokenEstimate, 0),
                })}
              </p>
            </div>
            <div className="px-4 py-3">
              <NormalizedContentPreview contents={ncs} maxItems={5} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: AI Review ───────────────────────────────────────────────────────────

function AIReviewTab({ copy }: { copy: InboxCopy }) {
  const { proposals, rawSourceItems, getEvidenceForProposal, resolveProposal } = useIngestion()
  const pending = proposals.filter((p) => p.status === "pending" || p.status === "deferred")
  const highConfidence = pending.filter((p) => p.confidence === "high")

  function batchConfirmHighConfidence() {
    for (const p of highConfidence) {
      resolveProposal(p.id, "confirm")
    }
  }

  if (pending.length === 0) {
    return <EmptyState icon={<SparklesIcon />} title={copy.empty.review.title} hint={copy.empty.review.hint} />
  }

  return (
    <div className="flex flex-col gap-4">
      {highConfidence.length > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/50">
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {formatCopy(copy.review.highConfidenceTitleTemplate, { count: highConfidence.length })}
            </p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
              {copy.review.highConfidenceHint}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900"
            onClick={batchConfirmHighConfidence}
          >
            {copy.review.confirmAll}
          </Button>
        </div>
      )}

      {pending.map((proposal) => {
        const linkedSources = rawSourceItems.filter((item) =>
          proposal.rawSourceItemIds.includes(item.id)
        )
        const evidences = getEvidenceForProposal(proposal.id)
        return (
          <TriageProposalCard
            key={proposal.id}
            proposal={proposal}
            linkedSources={linkedSources}
            evidences={evidences}
            onDecision={resolveProposal}
          />
        )
      })}
    </div>
  )
}

// ─── Tab: Confirmed ───────────────────────────────────────────────────────────

function ConfirmedTab({ copy }: { copy: InboxCopy }) {
  const { proposals, rawSourceItems, getEvidenceForProposal, resolveProposal } = useIngestion()
  const confirmed = proposals.filter(
    (p) => p.status === "confirmed" || p.status === "edited" || p.status === "dismissed"
  )

  if (confirmed.length === 0) {
    return <EmptyState icon={<SparklesIcon />} title={copy.empty.confirmed.title} hint={copy.empty.confirmed.hint} />
  }

  return (
    <div className="flex flex-col gap-3">
      {confirmed.map((proposal) => {
        const linkedSources = rawSourceItems.filter((item) =>
          proposal.rawSourceItemIds.includes(item.id)
        )
        const evidences = getEvidenceForProposal(proposal.id)
        return (
          <TriageProposalCard
            key={proposal.id}
            proposal={proposal}
            linkedSources={linkedSources}
            evidences={evidences}
            onDecision={resolveProposal}
          />
        )
      })}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <span className="[&_svg]:size-8 text-muted-foreground/30">{icon}</span>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/60">{hint}</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [activeTab, setActiveTab] = React.useState<InboxTab>("review")
  const { rawSourceItems, proposals } = useIngestion()
  const { copy } = useProductLanguage()
  const inboxCopy = copy.inbox

  const tabCounts: Record<InboxTab, number> = {
    raw: rawSourceItems.length,
    processing: rawSourceItems.filter((i) => i.processingStatus === "processed").length,
    review: proposals.filter((p) => p.status === "pending" || p.status === "deferred").length,
    confirmed: proposals.filter((p) =>
      p.status === "confirmed" || p.status === "edited" || p.status === "dismissed"
    ).length,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title={inboxCopy.title} description={inboxCopy.description} />

      <div className="flex-1 overflow-y-auto">
        {/* Sub-header: mock actions */}
        <div className="border-b border-border/50 bg-muted/20 px-6 py-3">
          <MockActionBar copy={inboxCopy} />
        </div>

        <div className="px-6 py-6">
          <div className="mx-auto max-w-2xl flex flex-col gap-5">
            {/* Tabs */}
            <div className="flex gap-0.5 rounded-lg bg-muted p-1 w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {inboxCopy.tabs[tab.id]}
                  {tabCounts[tab.id] > 0 && (
                    <span className="ml-1.5 tabular-nums opacity-60">
                      ({tabCounts[tab.id]})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab description */}
            <div className="text-xs text-muted-foreground/70">
              {inboxCopy.tabDescriptions[activeTab]}
            </div>

            {/* Tab content */}
            {activeTab === "raw" && <RawSourcesTab copy={inboxCopy} />}
            {activeTab === "processing" && <ProcessingTab copy={inboxCopy} />}
            {activeTab === "review" && <AIReviewTab copy={inboxCopy} />}
            {activeTab === "confirmed" && <ConfirmedTab copy={inboxCopy} />}
          </div>
        </div>
      </div>

      <ToastBar />
    </div>
  )
}
