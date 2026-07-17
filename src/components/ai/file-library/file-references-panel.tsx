"use client"

import { ChevronRightIcon } from "lucide-react"
import type { FileAssetReferences } from "@/types/file-library"

const LABELS: Array<{ key: keyof FileAssetReferences; label: string }> = [
  { key: "chats", label: "對話" },
  { key: "evidence", label: "Evidence" },
  { key: "observationUnits", label: "Observation Unit" },
  { key: "reports", label: "Report" },
  { key: "sprints", label: "Sprint" },
]

export function FileReferencesPanel({
  references,
  onViewReference,
}: {
  references?: FileAssetReferences
  onViewReference: (kind: keyof FileAssetReferences, label: string) => void
}) {
  const total = references
    ? references.chats + references.evidence + references.observationUnits + references.reports + references.sprints
    : 0

  if (!references || total === 0) {
    return <p className="text-xs text-muted-foreground">目前沒有任何引用此檔案的對話、Evidence、Report 或 Sprint。</p>
  }

  return (
    <div className="divide-y divide-border/40 rounded-lg border border-border/50">
      {LABELS.map(({ key, label }) => {
        const count = references[key]
        if (count === 0) return null
        return (
          <button
            key={key}
            onClick={() => onViewReference(key, label)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/40 transition-colors"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              {count} 個
              <ChevronRightIcon className="size-3.5 text-muted-foreground" />
            </span>
          </button>
        )
      })}
    </div>
  )
}
