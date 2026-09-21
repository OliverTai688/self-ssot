"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProjectStatus } from "@/types/work"

export type StatusFilter = ProjectStatus | "all"
export type SortKey = "updatedAt" | "dueAt" | "name"

interface ProjectFilterBarProps {
  statusFilter: StatusFilter
  sortKey: SortKey
  onStatusChange: (v: StatusFilter) => void
  onSortChange: (v: SortKey) => void
}

export function ProjectFilterBar({
  statusFilter,
  sortKey,
  onStatusChange,
  onSortChange,
}: ProjectFilterBarProps) {
  const { copy } = useProductLanguage()
  const workCopy = copy.work
  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: workCopy.projectFilter.status.all },
    { value: "active", label: workCopy.projectFilter.status.active },
    { value: "paused", label: workCopy.projectFilter.status.paused },
    { value: "completed", label: workCopy.projectFilter.status.completed },
    { value: "archived", label: workCopy.projectFilter.status.archived },
  ]

  return (
    <div className="flex items-center justify-between gap-4">
      <Tabs value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <TabsList variant="line">
          {statusTabs.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select value={sortKey} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updatedAt">{workCopy.projectFilter.sort.updatedAt}</SelectItem>
          <SelectItem value="dueAt">{workCopy.projectFilter.sort.dueAt}</SelectItem>
          <SelectItem value="name">{workCopy.projectFilter.sort.name}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
