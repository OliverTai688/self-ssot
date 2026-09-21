"use client"

import * as React from "react"

export type WorkspaceInfo = {
  id: string
  name: string
  type: "PERSONAL" | "TEAM"
  role: string
}

interface WorkspaceContextType {
  activeWorkspace: WorkspaceInfo | null
  allWorkspaces: WorkspaceInfo[]
  /** True when user is currently in a PERSONAL workspace context. */
  isPersonalContext: boolean
  /** True when user is currently in a TEAM workspace context. */
  isTeamContext: boolean
}

const WorkspaceContext = React.createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({
  children,
  initialActiveWorkspace,
  allWorkspaces,
}: {
  children: React.ReactNode
  initialActiveWorkspace: WorkspaceInfo | null
  allWorkspaces: WorkspaceInfo[]
}) {
  // Server-resolved active workspace passed as prop. No client-side mutation needed
  // here — switching is done via cookie+router.refresh() in WorkspaceSwitcher.
  const activeWorkspace = initialActiveWorkspace

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        allWorkspaces,
        isPersonalContext: activeWorkspace?.type === "PERSONAL",
        isTeamContext: activeWorkspace?.type === "TEAM",
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextType {
  const context = React.useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
