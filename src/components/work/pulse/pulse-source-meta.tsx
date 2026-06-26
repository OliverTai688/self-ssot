import type { PulseSourceMeta } from "@/types/work"

interface PulseSourceMetaProps {
  meta: PulseSourceMeta
}

export function PulseSourceMetaDisplay({ meta }: PulseSourceMetaProps) {
  const generatedAt = new Date(meta.generatedAt).toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <p className="text-xs text-muted-foreground/60 leading-relaxed">
      此分析基於{" "}
      <span className="text-muted-foreground">{meta.basedOnTaskIds.length} 個任務</span>
      、
      <span className="text-muted-foreground">{meta.basedOnNoteIds.length} 個紀錄</span>
      、
      <span className="text-muted-foreground">{meta.basedOnDeliverableIds.length} 個交付物</span>
      {" "}· {generatedAt} 生成
    </p>
  )
}
