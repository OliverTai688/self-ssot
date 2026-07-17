"use client"

import { MoreHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FileAssetAction, FileAssetActionId } from "@/lib/file-library/file-asset-status"

export function FileActionsMenu({
  assetTitle,
  actions,
  onAction,
}: {
  assetTitle: string
  actions: FileAssetAction[]
  onAction: (id: FileAssetActionId) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`「${assetTitle}」更多操作`}
            className="text-muted-foreground"
          />
        }
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => {
          const prevDestructive = index > 0 ? actions[index - 1].destructive : false
          const needsSeparator = Boolean(action.destructive) && !prevDestructive && index > 0
          return (
            <div key={action.id}>
              {needsSeparator && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={action.destructive ? "destructive" : "default"}
                onClick={() => onAction(action.id)}
              >
                {action.label}
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
