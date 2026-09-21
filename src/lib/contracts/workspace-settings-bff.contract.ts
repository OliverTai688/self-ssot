import "server-only"

export type WorkspaceSettingsBffContract = {
  id: "WORKSPACE-SETTINGS-001"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"settings">
  workspace: {
    id: string
    name: string
    type: "PERSONAL" | "TEAM"
    myRole: "OWNER" | "ADMIN" | "MEMBER" | "GUEST"
  }
  members: Array<{
    profileId: string
    email: string
    role: string
    status: string
  }>
  workspaceSkills: Array<{
    id: string
    name: string
    status: string
  }>
  sharedModules: string[]
  prohibitedWrites: string[]
}
