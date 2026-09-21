import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"
import { MembersPanel } from "./members-panel"

export const dynamic = "force-dynamic"

export default async function SettingsMembersPage() {
  const model = await getOwnerOsControlPlanePage("settings-members")

  return (
    <ControlPlanePage model={model}>
      <MembersPanel />
    </ControlPlanePage>
  )
}
