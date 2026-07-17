import { ArchiveIcon, CheckCircle2Icon, ClockIcon, FileSearchIcon, FilterXIcon, FolderOpenIcon } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

export type FileLibraryEmptyVariant =
  | "no_files"
  | "search_no_results"
  | "filter_no_results"
  | "recent_empty"
  | "needs_attention_empty"
  | "archived_empty"

const VARIANTS: Record<
  FileLibraryEmptyVariant,
  { title: string; description?: string; icon: typeof FolderOpenIcon }
> = {
  no_files: {
    title: "尚無任何檔案",
    description: "上傳檔案，或從 Google Drive 引用文件，開始建立系統檔案庫。",
    icon: FolderOpenIcon,
  },
  search_no_results: {
    title: "搜尋無結果",
    description: "換個關鍵字再試一次，或清除搜尋條件查看所有檔案。",
    icon: FileSearchIcon,
  },
  filter_no_results: {
    title: "此篩選條件無結果",
    description: "目前疊加的篩選條件沒有符合的檔案，試著移除部分條件。",
    icon: FilterXIcon,
  },
  recent_empty: {
    title: "最近尚未使用任何檔案",
    description: "引用至對話、開啟檔案或建立快照後，會顯示在這裡。",
    icon: ClockIcon,
  },
  needs_attention_empty: {
    title: "目前所有檔案狀態正常，沒有需要處理的項目。",
    icon: CheckCircle2Icon,
  },
  archived_empty: {
    title: "尚無封存檔案",
    description: "封存的檔案會保留在這裡，且不會影響既有引用。",
    icon: ArchiveIcon,
  },
}

export function FileLibraryEmptyState({
  variant,
  action,
}: {
  variant: FileLibraryEmptyVariant
  action?: { label: string; onClick: () => void }
}) {
  const config = VARIANTS[variant]
  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      action={action}
      className="min-h-[280px] border-border/50"
    />
  )
}
