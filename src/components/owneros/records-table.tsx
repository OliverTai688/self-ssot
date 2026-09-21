"use client"

import * as React from "react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * ARC-012 §5 定義的「records/audit 頁」預設版面：filterable table，取代
 * decorative activity card wall。排序／全文篩選交給已安裝但先前沒有明顯用量
 * 的 @tanstack/react-table，render 沿用既有的 shadcn Table 元件，維持全站表格
 * 視覺一致，不是另外設計一套表格外觀。
 *
 * 技術選型見專案文件 `claude/nested-card-decoupling-research.md` §3、
 * `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` §5。
 */
export interface RecordsTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  searchPlaceholder?: string
  emptyLabel?: string
  onRowClick?: (row: TData) => void
  className?: string
}

export function RecordsTable<TData>({
  data,
  columns,
  searchPlaceholder = "搜尋紀錄",
  emptyLabel = "尚未有紀錄。",
  onRowClick,
  className,
}: RecordsTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 pl-7 text-sm"
        />
      </div>
      <div className="overflow-hidden rounded-md border border-border/60">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(header.column.getCanSort() && "cursor-pointer select-none")}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === "asc" && <ArrowUpIcon className="size-3" />}
                          {sortDir === "desc" && <ArrowDownIcon className="size-3" />}
                        </span>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
