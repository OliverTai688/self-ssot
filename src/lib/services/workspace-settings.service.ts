import "server-only"

import type { WorkspaceSettingsBffContract } from "@/lib/contracts/workspace-settings-bff.contract"
import { resolveCurrentUser } from "@/lib/services/auth.service"
import { db as prisma } from "@/lib/db"

export async function buildWorkspaceSettingsBffContract(workspaceId: string): Promise<WorkspaceSettingsBffContract> {
  const auth = await resolveCurrentUser()
  
  if (!auth.user) {
    throw new Error("Unauthorized")
  }
  
  const [workspace, skills] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: {
          include: { profile: true }
        }
      }
    }),
    prisma.skill.findMany({
      where: { workspaceId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    }),
  ])

  if (!workspace) {
    throw new Error("Workspace not found")
  }

  const myMembership = workspace.memberships.find(m => m.profileId === auth.user!.id)
  
  if (!myMembership) {
    throw new Error("Forbidden: Not a member of this workspace")
  }

  return {
    id: "WORKSPACE-SETTINGS-001",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["settings"],
    workspace: {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      myRole: myMembership.role,
    },
    members: workspace.memberships.map((m) => ({
      profileId: m.profileId,
      email: m.profile.email,
      role: m.role,
      status: m.status,
    })),
    workspaceSkills: skills.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
    })),
    sharedModules: ["work", "company", "chamber"], // Shared modules available for Team workspaces
    prohibitedWrites: ["externalRegisterable", "life_module", "finance_module"],
  }
}
