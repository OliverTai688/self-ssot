"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, LayersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/lib/context/workspace-context"

export function WorkspaceSwitcher() {
  const router = useRouter()
  const { activeWorkspace, allWorkspaces } = useWorkspace()

  function switchWorkspace(id: string) {
    document.cookie = `active_workspace_id=${id}; path=/; max-age=31536000`
    router.refresh()
  }

  // Only show the switcher when there's something to switch between
  if (allWorkspaces.length <= 1) return null

  const personalWorkspaces = allWorkspaces.filter((w) => w.type === "PERSONAL")
  const teamWorkspaces = allWorkspaces.filter((w) => w.type === "TEAM")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 shrink-0 px-3 border-dashed hover:border-solid text-xs text-muted-foreground hover:text-foreground"
          >
            <LayersIcon className="size-3.5" />
            <span className="truncate max-w-[120px]">{activeWorkspace?.name ?? "Workspace"}</span>
            <ChevronDownIcon className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {personalWorkspaces.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Personal</DropdownMenuLabel>
            {personalWorkspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onClick={() => switchWorkspace(w.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">{w.name}</span>
                {activeWorkspace?.id === w.id && <CheckIcon className="size-3.5 text-emerald-500" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {teamWorkspaces.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Teams</DropdownMenuLabel>
            {teamWorkspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onClick={() => switchWorkspace(w.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">{w.name}</span>
                {activeWorkspace?.id === w.id && <CheckIcon className="size-3.5 text-emerald-500" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
