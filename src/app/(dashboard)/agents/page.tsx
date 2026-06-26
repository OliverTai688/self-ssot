import { AppHeader } from "@/components/layout/app-header"
import { Badge } from "@/components/ui/badge"
import { buildOwnerAgentCommandCenterContract } from "@/lib/services/agent-command-center.service"
import { getCurrentUser } from "@/lib/services/auth.service"

import { AgentCommandCenterClient } from "./agent-command-center-client"

export const dynamic = "force-dynamic"

export default async function AgentsPage() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== "OWNER") {
    return (
      <div className="flex flex-col gap-6">
        <AppHeader
          title="AI 指令中心"
          description="Owner-only proposal workspace for bounded single-agent and group-agent commands."
        />
        <section className="rounded-lg border bg-background p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Owner approval required</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This command surface is limited to OWNER role accounts.
              </p>
            </div>
            <Badge variant="outline">blocked</Badge>
          </div>
        </section>
      </div>
    )
  }

  const contract = buildOwnerAgentCommandCenterContract()

  return (
    <div className="flex flex-col gap-6">
      <AppHeader
        title="AI 指令中心"
        description="Owner-only proposal workspace for bounded single-agent and group-agent commands."
      />
      <AgentCommandCenterClient contract={contract} />
    </div>
  )
}
