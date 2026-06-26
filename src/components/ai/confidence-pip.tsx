import { cn } from "@/lib/utils"
import type { Confidence } from "@/types/ai"

interface ConfidencePipProps {
  confidence: Confidence
  className?: string
}

export function ConfidencePip({ confidence, className }: ConfidencePipProps) {
  const map = {
    high: { label: "高", className: "bg-emerald-500" },
    medium: { label: "中", className: "bg-amber-400" },
    low: { label: "低", className: "bg-muted-foreground/40" },
  }
  const { label, className: colorClass } = map[confidence]
  return (
    <span
      title={`AI 置信度：${label}`}
      className={cn("inline-block size-2 rounded-full shrink-0 mt-1.5", colorClass, className)}
    />
  )
}
