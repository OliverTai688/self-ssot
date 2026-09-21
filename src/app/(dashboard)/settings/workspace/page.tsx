import { resolveCurrentUser } from "@/lib/services/auth.service"
import { db as prisma } from "@/lib/db"
import { WorkspaceSettingsClient } from "./workspace-settings-client"
import { buildWorkspaceSettingsBffContract } from "@/lib/services/workspace-settings.service"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function WorkspaceSettingsPage() {
  const auth = await resolveCurrentUser()
  
  if (!auth.user) {
    redirect("/auth/login")
  }

  // Fetch all workspaces the user is a member of
  const memberships = await prisma.workspaceMembership.findMany({
    where: { profileId: auth.user.id },
    include: { workspace: true },
  })

  // Build the BFF contracts for all available workspaces
  const workspaceContracts = await Promise.all(
    memberships.map((m: any) => buildWorkspaceSettingsBffContract(m.workspaceId))
  )

  return <WorkspaceSettingsClient contracts={workspaceContracts} />
}
