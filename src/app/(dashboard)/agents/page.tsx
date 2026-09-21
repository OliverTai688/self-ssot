import { buildOwnerAgentCommandCenterContract } from "@/lib/services/agent-command-center.service"
import { getCurrentUser } from "@/lib/services/auth.service"
import { AppHeader } from "@/components/layout/app-header"

import {
  AgentCommandCenterBlocked,
  AgentCommandCenterClient,
} from "./agent-command-center-client"

export const dynamic = "force-dynamic"

export default async function AgentsPage() {
  const currentUser = await getCurrentUser()

  if (currentUser?.role !== "OWNER") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <AppHeader 
          title="AI 指令中心 (Skill Library)" 
          description="擁有者專用的受控 AI 指令、提案與預演工作區。" 
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <AgentCommandCenterBlocked />
        </main>
      </div>
    )
  }

  const contract = await buildOwnerAgentCommandCenterContract()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader 
        title="AI 指令中心 (Skill Library)" 
        description="擁有者專用的受控 AI 指令、提案與預演工作區。" 
      />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <AgentCommandCenterClient contract={contract} />
      </main>
    </div>
  )
}
