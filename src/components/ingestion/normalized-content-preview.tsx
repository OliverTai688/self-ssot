import {
  AudioLinesIcon,
  FileTextIcon,
  ImageIcon,
  MessageSquareIcon,
  ReceiptIcon,
  GlobeIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NormalizedContent, NormalizedContentType } from "@/types/ingestion"

const CONTENT_TYPE_CONFIG: Record<
  NormalizedContentType,
  { label: string; icon: React.ReactNode }
> = {
  message_text: { label: "訊息文字", icon: <MessageSquareIcon className="size-3" /> },
  document_text: { label: "文件全文", icon: <FileTextIcon className="size-3" /> },
  document_chunk: { label: "文件段落", icon: <FileTextIcon className="size-3" /> },
  transcript: { label: "語音轉錄", icon: <AudioLinesIcon className="size-3" /> },
  image_summary: { label: "圖片摘要", icon: <ImageIcon className="size-3" /> },
  receipt_extraction: { label: "收據提取", icon: <ReceiptIcon className="size-3" /> },
  url_excerpt: { label: "URL 摘要", icon: <GlobeIcon className="size-3" /> },
}

interface NormalizedContentPreviewProps {
  contents: NormalizedContent[]
  className?: string
  maxItems?: number
}

export function NormalizedContentPreview({
  contents,
  className,
  maxItems = 3,
}: NormalizedContentPreviewProps) {
  if (contents.length === 0) return null

  const visible = contents.slice(0, maxItems)
  const remaining = contents.length - visible.length

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {visible.map((nc) => {
        const config = CONTENT_TYPE_CONFIG[nc.contentType]
        return (
          <div key={nc.id} className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-muted-foreground">{config.icon}</span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {config.label}
              </span>
              {nc.heading && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-[11px] text-muted-foreground">{nc.heading}</span>
                </>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground/50">
                ~{nc.tokenEstimate} tokens
              </span>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">{nc.text}</p>
          </div>
        )
      })}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground/60 text-center">
          +{remaining} 個段落
        </p>
      )}
    </div>
  )
}
