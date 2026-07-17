"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FileLibraryTab } from "@/types/file-library"

export function FileLibraryTabs({
  active,
  needsAttentionCount,
  onChange,
}: {
  active: FileLibraryTab
  needsAttentionCount: number
  onChange: (tab: FileLibraryTab) => void
}) {
  return (
    <Tabs value={active} onValueChange={(v) => onChange(v as FileLibraryTab)}>
      <TabsList variant="line">
        <TabsTrigger value="all">所有檔案</TabsTrigger>
        <TabsTrigger value="recent">最近使用</TabsTrigger>
        <TabsTrigger value="needs_attention">
          需要處理{needsAttentionCount > 0 ? ` ${needsAttentionCount}` : ""}
        </TabsTrigger>
        <TabsTrigger value="archived">已封存</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
