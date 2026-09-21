"use client"

import { LayersIcon, ShieldCheckIcon, UserRoundIcon, SparklesIcon } from "lucide-react"
import type { WorkspaceSettingsBffContract } from "@/lib/contracts/workspace-settings-bff.contract"
import { useWorkspace } from "@/lib/context/workspace-context"
import { Badge } from "@/components/ui/badge"

export function WorkspaceSettingsClient({ contracts }: { contracts: WorkspaceSettingsBffContract[] }) {
  const { activeWorkspace } = useWorkspace()

  if (contracts.length === 0) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-lg font-semibold mb-2">Workspace / Org Settings</h1>
        <p className="text-sm text-muted-foreground">You do not belong to any workspaces yet.</p>
      </div>
    )
  }

  // Surface the active workspace first for orientation
  const sorted = [...contracts].sort((a, b) => {
    if (a.workspace.id === activeWorkspace?.id) return -1
    if (b.workspace.id === activeWorkspace?.id) return 1
    return 0
  })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Workspace / Org Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage team members, roles, and workspace-scoped skills.
          {activeWorkspace && (
            <span className="ml-2 text-xs text-muted-foreground/60">
              Active: <span className="font-medium text-foreground">{activeWorkspace.name}</span>
            </span>
          )}
        </p>
      </div>

      {sorted.map((contract) => {
        const isActive = contract.workspace.id === activeWorkspace?.id
        return (
          <div
            key={contract.workspace.id}
            className={`rounded-lg border bg-background ${isActive ? "ring-2 ring-primary/20 border-primary/30" : ""}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <LayersIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{contract.workspace.name}</h2>
                <Badge variant="outline" className="text-[10px]">{contract.workspace.type}</Badge>
                {isActive && (
                  <Badge variant="secondary" className="text-[10px]">Active</Badge>
                )}
              </div>
              <Badge variant="outline" className="text-[10px]">
                <ShieldCheckIcon className="size-3 mr-1" />
                {contract.workspace.myRole}
              </Badge>
            </div>

            <div className="divide-y">
              {/* Members section */}
              <div className="p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <UserRoundIcon className="size-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Members</h3>
                  <Badge variant="outline" className="text-[10px]">{contract.members.length}</Badge>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <table className="min-w-full divide-y text-sm">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="py-2.5 pl-4 pr-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Role</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-background">
                      {contract.members.map((member) => (
                        <tr key={member.profileId}>
                          <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium">{member.email}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{member.role}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{member.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Skills section */}
              <div className="p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <SparklesIcon className="size-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace Skills</h3>
                  <Badge variant="outline" className="text-[10px]">{contract.workspaceSkills.length}</Badge>
                </div>
                {contract.workspaceSkills.length > 0 ? (
                  <ul className="divide-y rounded-lg border bg-background overflow-hidden">
                    {contract.workspaceSkills.map((skill) => (
                      <li key={skill.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="font-medium">{skill.name}</span>
                        <Badge variant="outline" className="text-[10px]">{skill.status}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No workspace-scoped skills yet. Skills created in this workspace will appear here.
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
