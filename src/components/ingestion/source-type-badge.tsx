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
import type { RawSourceType } from "@/types/ingestion"

interface SourceTypeConfig {
  label: string
  icon: React.ReactNode
  className: string
}

const SOURCE_TYPE_CONFIG: Record<RawSourceType, SourceTypeConfig> = {
  gmail_email: {
    label: "Gmail",
    icon: <MailIcon className="size-3" />,
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  manual_message: {
    label: "手動輸入",
    icon: <MessageCircleIcon className="size-3" />,
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  line_message: {
    label: "LINE",
    icon: <SmartphoneIcon className="size-3" />,
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  google_doc: {
    label: "Google Docs",
    icon: <FileTextIcon className="size-3" />,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  markdown_document: {
    label: "Markdown",
    icon: <FileTextIcon className="size-3" />,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  image: {
    label: "圖片",
    icon: <ImageIcon className="size-3" />,
    className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  audio: {
    label: "語音",
    icon: <AudioLinesIcon className="size-3" />,
    className: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  },
  receipt: {
    label: "收據",
    icon: <ReceiptIcon className="size-3" />,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  url: {
    label: "URL",
    icon: <GlobeIcon className="size-3" />,
    className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  },
  file: {
    label: "檔案",
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  )
}
