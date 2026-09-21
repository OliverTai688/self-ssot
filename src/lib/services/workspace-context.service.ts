import "server-only"

import { cookies } from "next/headers"
import { db } from "@/lib/db"
import type { WorkspaceInfo } from "@/lib/context/workspace-context"

/**
 * Resolve the current workspace context for a given profile.
 *
 * - Reads `active_workspace_id` from the request cookie jar.
 * - Falls back to the user's PERSONAL workspace if the cookie is absent or
 *   points to a workspace the user is no longer a member of.
 * - Returns all active memberships for the WorkspaceSwitcher dropdown.
 */
export async function resolveActiveWorkspaceContext(profileId: string): Promise<{
  activeWorkspace: WorkspaceInfo | null
  allWorkspaces: WorkspaceInfo[]
}> {
  const memberships = await db.workspaceMembership.findMany({
    where: { profileId, status: "ACTIVE" },
    include: { workspace: true },
    orderBy: [
      { workspace: { type: "asc" } }, // PERSONAL before TEAM
      { workspace: { createdAt: "asc" } },
    ],
  })

  const allWorkspaces: WorkspaceInfo[] = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    type: m.workspace.type,
    role: m.role,
  }))

  if (allWorkspaces.length === 0) {
    return { activeWorkspace: null, allWorkspaces: [] }
  }

  const cookieStore = await cookies()
  const cookieWorkspaceId = cookieStore.get("active_workspace_id")?.value ?? null

  // Validate cookie value is a workspace the user actually belongs to
  const fromCookie = cookieWorkspaceId
    ? allWorkspaces.find((w) => w.id === cookieWorkspaceId) ?? null
    : null

  // Default to the first PERSONAL workspace, or just the first one
  const personalFirst =
    allWorkspaces.find((w) => w.type === "PERSONAL") ?? allWorkspaces[0]

  return {
    activeWorkspace: fromCookie ?? personalFirst,
    allWorkspaces,
  }
}
