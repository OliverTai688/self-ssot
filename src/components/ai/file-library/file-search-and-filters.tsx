"use client"

import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  FileLibraryFilters,
  FileProcessingFilter,
  FilePreservationFilter,
  FileSourceFilter,
  FileSyncFilter,
  FileTypeFilter,
} from "@/types/file-library"

const SOURCE_OPTIONS: Array<{ value: FileSourceFilter; label: string }> = [
  { value: "all", label: "來源：全部" },
  { value: "managed", label: "系統上傳" },
  { value: "google_drive", label: "Google Drive" },
]

const PRESERVATION_OPTIONS: Array<{ value: FilePreservationFilter; label: string }> = [
  { value: "all", label: "保存狀態：全部" },
  { value: "external_only", label: "僅外部引用" },
  { value: "has_snapshot", label: "已有快照" },
  { value: "no_snapshot", label: "尚無快照" },
]

const SYNC_OPTIONS: Array<{ value: FileSyncFilter; label: string }> = [
  { value: "all", label: "同步狀態：全部" },
  { value: "synced", label: "同步完成" },
  { value: "outdated", label: "有新版本" },
  { value: "syncing", label: "同步中" },
  { value: "error", label: "同步失敗" },
  { value: "disconnected", label: "來源中斷" },
]

const PROCESSING_OPTIONS: Array<{ value: FileProcessingFilter; label: string }> = [
  { value: "all", label: "AI 處理：全部" },
  { value: "completed", label: "已完成" },
  { value: "processing", label: "處理中" },
  { value: "not_started", label: "未處理" },
  { value: "failed", label: "處理失敗" },
]

const TYPE_OPTIONS: Array<{ value: FileTypeFilter; label: string }> = [
  { value: "all", label: "類型：全部" },
  { value: "pdf", label: "PDF" },
  { value: "md", label: "Markdown" },
  { value: "doc", label: "文件（Doc）" },
  { value: "sheet", label: "試算表" },
  { value: "ppt", label: "簡報" },
  { value: "other", label: "其他" },
]

export function FileSearchAndFilters({
  search,
  filters,
  onSearchChange,
  onFiltersChange,
}: {
  search: string
  filters: FileLibraryFilters
  onSearchChange: (value: string) => void
  onFiltersChange: (filters: FileLibraryFilters) => void
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-56">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜尋檔案"
          aria-label="搜尋檔案"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
        <Select value={filters.type} onValueChange={(v) => onFiltersChange({ ...filters, type: v as FileTypeFilter })}>
          <SelectTrigger size="sm" aria-label="依檔案類型篩選" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.source} onValueChange={(v) => onFiltersChange({ ...filters, source: v as FileSourceFilter })}>
          <SelectTrigger size="sm" aria-label="依來源篩選" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.preservation} onValueChange={(v) => onFiltersChange({ ...filters, preservation: v as FilePreservationFilter })}>
          <SelectTrigger size="sm" aria-label="依保存狀態篩選" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESERVATION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sync} onValueChange={(v) => onFiltersChange({ ...filters, sync: v as FileSyncFilter })}>
          <SelectTrigger size="sm" aria-label="依同步狀態篩選" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SYNC_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.processing} onValueChange={(v) => onFiltersChange({ ...filters, processing: v as FileProcessingFilter })}>
          <SelectTrigger size="sm" aria-label="依 AI 處理狀態篩選" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROCESSING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export const FILE_FILTER_LABELS = {
  source: Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label])) as Record<FileSourceFilter, string>,
  preservation: Object.fromEntries(PRESERVATION_OPTIONS.map((o) => [o.value, o.label])) as Record<FilePreservationFilter, string>,
  sync: Object.fromEntries(SYNC_OPTIONS.map((o) => [o.value, o.label])) as Record<FileSyncFilter, string>,
  processing: Object.fromEntries(PROCESSING_OPTIONS.map((o) => [o.value, o.label])) as Record<FileProcessingFilter, string>,
  type: Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<FileTypeFilter, string>,
}
