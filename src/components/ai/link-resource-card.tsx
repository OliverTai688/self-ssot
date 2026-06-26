"use client"

import * as React from "react"
import { GlobeIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LinkMeta {
  title: string
  description: string
  domain: string
  favicon?: string
}

interface LinkResourceCardProps {
  url: string
  meta?: LinkMeta
  isLoading?: boolean
  onRemove?: () => void
  className?: string
}

export function LinkResourceCard({
  url,
  meta,
  isLoading,
  onRemove,
  className,
}: LinkResourceCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-sm dark:bg-muted/20 dark:border-border/30",
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-start gap-3 p-3">
          <div className="size-8 rounded-lg bg-muted/70 animate-pulse shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3 bg-muted/70 rounded-md animate-pulse w-2/3" />
            <div className="h-2.5 bg-muted/50 rounded-md animate-pulse w-full" />
            <div className="h-2 bg-muted/30 rounded-md animate-pulse w-1/3" />
          </div>
        </div>
      ) : meta ? (
        <div className="flex items-start gap-3 p-3">
          <div className="size-8 rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
            {meta.favicon ? (
              <img
                src={meta.favicon}
                alt=""
                className="size-5 object-contain"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <GlobeIcon className="size-3.5 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground leading-snug truncate">
              {meta.title}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
              {meta.description}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">{meta.domain}</p>
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="mt-0.5 size-5 flex items-center justify-center rounded-full text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3">
          <div className="size-8 rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center shrink-0">
            <GlobeIcon className="size-3.5 text-muted-foreground/40" />
          </div>
          <p className="flex-1 text-[11px] text-muted-foreground/60 truncate">{url}</p>
          {onRemove && (
            <button
              onClick={onRemove}
              className="size-5 flex items-center justify-center rounded-full text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
