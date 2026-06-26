"use client"

import { ResearchLink, ResearchEntityType } from "@/types/research"

const relationLabels: Record<string, string> = {
  supports: "支持",
  contradicts: "反駁",
  defines: "定義",
  mentions: "提及",
  inspired_by: "受到啟發",
  used_in: "用於",
  related_to: "相關",
  submitted_to: "投稿至",
  authored_by: "作者為",
  affiliated_with: "隸屬於",
  participates_in: "參與",
  chaired_by: "主持人為",
  belongs_to: "屬於",
  clarifies: "釐清",
  extends: "延伸",
}

const entityLabels: Record<string, string> = {
  issue: "研究議題",
  question: "研究問題",
  concept: "概念",
  source: "資料來源",
  idea: "想法",
  writing_project: "寫作專案",
  writing_section: "寫作章節",
  event: "研討會",
  person: "學者",
  institution: "機構",
  region: "地區",
}

interface ResearchObjectLinkListProps {
  links: ResearchLink[]
  entityType: ResearchEntityType
  entityId: string
}

export function ResearchObjectLinkList({ links, entityType, entityId }: ResearchObjectLinkListProps) {
  const outgoing = links.filter((l) => l.fromType === entityType && l.fromId === entityId)
  const incoming = links.filter((l) => l.toType === entityType && l.toId === entityId)

  if (outgoing.length === 0 && incoming.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
        尚無關聯關係
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {outgoing.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">此物件指向</p>
          {outgoing.map((link) => (
            <LinkRow key={link.id} link={link} direction="outgoing" targetType={link.toType} targetId={link.toId} />
          ))}
        </div>
      )}
      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">被以下指向</p>
          {incoming.map((link) => (
            <LinkRow key={link.id} link={link} direction="incoming" targetType={link.fromType} targetId={link.fromId} />
          ))}
        </div>
      )}
    </div>
  )
}

function LinkRow({ link, direction, targetType, targetId }: {
  link: ResearchLink
  direction: "outgoing" | "incoming"
  targetType: ResearchEntityType
  targetId: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
          {entityLabels[targetType] || targetType}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
          {direction === "outgoing" ? "→" : "←"}
        </span>
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
          {relationLabels[link.relationType] || link.relationType}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">{targetId}</span>
      </div>
      {link.confidence && (
        <span className={`text-[10px] shrink-0 ${link.confidence === "high" ? "text-emerald-500" : link.confidence === "medium" ? "text-amber-500" : "text-muted-foreground"}`}>
          {link.confidence === "high" ? "高" : link.confidence === "medium" ? "中" : "低"}
        </span>
      )}
    </div>
  )
}
