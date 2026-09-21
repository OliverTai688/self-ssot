"use server"

import { resolveCurrentUser } from "@/lib/services/auth.service"
import { db } from "@/lib/db"

export type WorkspaceInfo = {
  id: string
  name: string
  type: "PERSONAL" | "TEAM"
  role: string
}

export async function getMyWorkspacesAction(): Promise<WorkspaceInfo[]> {
  const auth = await resolveCurrentUser()
  if (!auth.user) return []

  const memberships = await db.workspaceMembership.findMany({
    where: { profileId: auth.user.id, status: "ACTIVE" },
    include: { workspace: true },
    orderBy: [
      { workspace: { type: "asc" } }, // PERSONAL first
      { workspace: { createdAt: "asc" } },
    ],
  })

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    type: m.workspace.type,
    role: m.role,
  }))
}
