"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Button as AriaButton,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  Heading,
} from "react-aria-components"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * "主軸歷程"：把記錄／稽核頁常見的「活動卡牆」換成一條時間軸——每個分群（例如
 * 同一天）是一個可摺疊的 Disclosure，展開後沿著一條直線列出扁平的事件列，不是
 * 一張一張的卡片。互動與鍵盤導覽交給 react-aria-components 的
 * DisclosureGroup／Disclosure（展開狀態、focus、aria-expanded 都是內建行為），
 * 展開動畫與節點依序浮現交給 framer-motion。
 *
 * 對應 `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md` §5
 * 「filterable table + timeline drilldown」與「avoid decorative activity card
 * wall」，技術選型見專案文件 `claude/nested-card-decoupling-research.md` §3-4。
 *
 * 用法：把同一天／同一類事件的 id 分到同一個 group，UI 只認 groupId，資料模型
 * 怎麼分群由呼叫端決定（例如日誌可以用日期分群，稽核頁可以用事件類型分群）。
 */

export interface JourneyTimelineNode {
  id: string
  groupId: string
  /** 節點旁的時間字串，例如 "09:20"。可留空。 */
  time?: string
  title: string
  summary?: string
  tone?: "default" | "warn" | "good"
  /** 節點右側的額外標記（例如負責人、來源標籤），維持一行不換行。 */
  meta?: React.ReactNode
}

export interface JourneyTimelineGroup {
  id: string
  label: string
  /** 分群標題右側的摘要文字，預設顯示「N 件」。 */
  meta?: string
}

const toneDot: Record<NonNullable<JourneyTimelineNode["tone"]>, string> = {
  default: "bg-muted-foreground/50",
  warn: "bg-amber-500",
  good: "bg-emerald-500",
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}

const nodeVariants = {
  hidden: { opacity: 0, x: -4 },
  show: { opacity: 1, x: 0 },
}

export function JourneyTimeline({
  groups,
  nodes,
  defaultExpandedGroupIds,
  onOpenNode,
  emptyLabel = "這段時間還沒有紀錄。",
  className,
}: {
  groups: JourneyTimelineGroup[]
  nodes: JourneyTimelineNode[]
  /** 預設展開的分群 id；未指定時只展開第一個分群，其餘摺疊。 */
  defaultExpandedGroupIds?: Iterable<string>
  onOpenNode?: (node: JourneyTimelineNode) => void
  emptyLabel?: string
  className?: string
}) {
  if (!groups.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <DisclosureGroup
      allowsMultipleExpanded
      defaultExpandedKeys={
        defaultExpandedGroupIds
          ? new Set(defaultExpandedGroupIds)
          : new Set(groups.slice(0, 1).map((g) => g.id))
      }
      className={cn("flex flex-col divide-y divide-border/60", className)}
    >
      {groups.map((group) => {
        const groupNodes = nodes.filter((n) => n.groupId === group.id)
        return (
          <Disclosure key={group.id} id={group.id} className="py-1">
            {({ isExpanded }) => (
              <>
                <Heading className="flex">
                  <AriaButton
                    slot="trigger"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRightIcon
                      className={cn(
                        "size-3.5 shrink-0 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                    <span className="text-sm font-medium">{group.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.meta ?? `${groupNodes.length} 件`}
                    </span>
                  </AriaButton>
                </Heading>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <DisclosurePanel>
                      <motion.ul
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        variants={listVariants}
                        className="relative ml-4 flex flex-col gap-0.5 border-l border-border/60 pb-2"
                      >
                        {groupNodes.length === 0 && (
                          <li className="py-2 pl-4 text-xs text-muted-foreground">
                            這一群還沒有事件。
                          </li>
                        )}
                        {groupNodes.map((node) => (
                          <motion.li key={node.id} variants={nodeVariants} className="relative pl-4">
                            <span
                              aria-hidden
                              className={cn(
                                "absolute left-[-3.5px] top-2.5 size-[7px] rounded-full ring-2 ring-background",
                                toneDot[node.tone ?? "default"]
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => onOpenNode?.(node)}
                              className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                {node.time && <span>{node.time}</span>}
                                {node.meta}
                              </span>
                              <span className="text-sm font-medium">{node.title}</span>
                              {node.summary && (
                                <span className="line-clamp-1 text-sm text-muted-foreground">
                                  {node.summary}
                                </span>
                              )}
                            </button>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </DisclosurePanel>
                  )}
                </AnimatePresence>
              </>
            )}
          </Disclosure>
        )
      })}
    </DisclosureGroup>
  )
}
