"use client"

import {
  AudioLinesIcon,
  FileTextIcon,
  ImageIcon,
  MessageSquareIcon,
  ReceiptIcon,
  GlobeIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { NormalizedContent, NormalizedContentType } from "@/types/ingestion"

const CONTENT_TYPE_CONFIG: Record<
  NormalizedContentType,
  { icon: React.ReactNode }
> = {
  message_text: { icon: <MessageSquareIcon className="size-3" /> },
  document_text: { icon: <FileTextIcon className="size-3" /> },
  document_chunk: { icon: <FileTextIcon className="size-3" /> },
  transcript: { icon: <AudioLinesIcon className="size-3" /> },
  image_summary: { icon: <ImageIcon className="size-3" /> },
  receipt_extraction: { icon: <ReceiptIcon className="size-3" /> },
  url_excerpt: { icon: <GlobeIcon className="size-3" /> },
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
  const { copy } = useProductLanguage()

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
                {copy.inbox.normalizedPreview.contentTypes[nc.contentType]}
              </span>
              {nc.heading && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-[11px] text-muted-foreground">{nc.heading}</span>
                </>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground/50">
                {copy.inbox.normalizedPreview.tokenEstimateTemplate.replace(
                  "{tokens}",
                  String(nc.tokenEstimate)
                )}
              </span>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">{nc.text}</p>
          </div>
        )
      })}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground/60 text-center">
          {copy.inbox.normalizedPreview.remainingTemplate.replace("{count}", String(remaining))}
        </p>
      )}
    </div>
  )
}
