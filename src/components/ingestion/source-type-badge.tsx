"use client"

import {
  AudioLinesIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  MessageCircleIcon,
  ReceiptIcon,
  SmartphoneIcon,
  FileIcon,
  MailIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { RawSourceType } from "@/types/ingestion"

interface SourceTypeConfig {
  icon: React.ReactNode
  className: string
}

const SOURCE_TYPE_CONFIG: Record<RawSourceType, SourceTypeConfig> = {
  gmail_email: {
    icon: <MailIcon className="size-3" />,
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  manual_message: {
    icon: <MessageCircleIcon className="size-3" />,
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  line_message: {
    icon: <SmartphoneIcon className="size-3" />,
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  google_doc: {
    icon: <FileTextIcon className="size-3" />,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  markdown_document: {
    icon: <FileTextIcon className="size-3" />,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  image: {
    icon: <ImageIcon className="size-3" />,
    className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  audio: {
    icon: <AudioLinesIcon className="size-3" />,
    className: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  },
  receipt: {
    icon: <ReceiptIcon className="size-3" />,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  url: {
    icon: <GlobeIcon className="size-3" />,
    className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  },
  file: {
    icon: <FileIcon className="size-3" />,
    className: "bg-muted text-muted-foreground",
  },
}

export function getSourceTypeConfig(sourceType: RawSourceType): SourceTypeConfig {
  return SOURCE_TYPE_CONFIG[sourceType]
}

interface SourceTypeBadgeProps {
  sourceType: RawSourceType
  className?: string
}

export function SourceTypeBadge({ sourceType, className }: SourceTypeBadgeProps) {
  const config = SOURCE_TYPE_CONFIG[sourceType]
  const { copy } = useProductLanguage()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.icon}
      {copy.inbox.badges.sourceTypes[sourceType]}
    </span>
  )
}
