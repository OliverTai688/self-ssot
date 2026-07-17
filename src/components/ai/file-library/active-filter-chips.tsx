"use client"

import { XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_FILE_LIBRARY_FILTERS,
  type FileLibraryFilters,
} from "@/types/file-library"
import { FILE_FILTER_LABELS } from "@/components/ai/file-library/file-search-and-filters"

type FilterKey = keyof FileLibraryFilters

export function ActiveFilterChips({
  filters,
  search,
  onFiltersChange,
  onSearchChange,
}: {
  filters: FileLibraryFilters
  search: string
  onFiltersChange: (filters: FileLibraryFilters) => void
  onSearchChange: (value: string) => void
}) {
  const activeKeys = (Object.keys(filters) as FilterKey[]).filter((key) => filters[key] !== "all")
  const hasSearch = search.trim().length > 0

  if (activeKeys.length === 0 && !hasSearch) return null

  function removeFilter(key: FilterKey) {
    onFiltersChange({ ...filters, [key]: DEFAULT_FILE_LIBRARY_FILTERS[key] })
  }

  function clearAll() {
    onFiltersChange(DEFAULT_FILE_LIBRARY_FILTERS)
    onSearchChange("")
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasSearch && (
        <Badge variant="outline" className="gap-1 rounded-full font-normal">
          搜尋：{search}
          <button aria-label="清除搜尋條件" onClick={() => onSearchChange("")} className="ml-0.5 opacity-60 hover:opacity-100">
            <XIcon className="size-3" />
          </button>
        </Badge>
      )}
      {activeKeys.map((key) => (
        <Badge key={key} variant="outline" className="gap-1 rounded-full font-normal">
          {FILE_FILTER_LABELS[key][filters[key] as never]}
          <button aria-label={`移除「${FILE_FILTER_LABELS[key][filters[key] as never]}」篩選`} onClick={() => removeFilter(key)} className="ml-0.5 opacity-60 hover:opacity-100">
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <Button size="xs" variant="ghost" onClick={clearAll} className="h-6 rounded-full text-[11px] text-muted-foreground">
        清除全部
      </Button>
    </div>
  )
}
