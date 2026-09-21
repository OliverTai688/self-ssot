import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"
import { AiSharingPanel } from "./ai-sharing-panel"

export const dynamic = "force-dynamic"

export default async function SettingsAiSharingPage() {
  const model = await getOwnerOsControlPlanePage("settings-ai-sharing")

  return (
    <ControlPlanePage model={model}>
      <AiSharingPanel />
    </ControlPlanePage>
  )
}
