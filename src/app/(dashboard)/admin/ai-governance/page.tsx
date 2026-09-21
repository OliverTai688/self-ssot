import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"
import { AiGovernancePanel } from "./ai-governance-panel"

export const dynamic = "force-dynamic"

export default async function AdminAiGovernancePage() {
  const model = await getOwnerOsControlPlanePage("admin-ai-governance")

  return (
    <ControlPlanePage model={model}>
      <AiGovernancePanel />
    </ControlPlanePage>
  )
}
