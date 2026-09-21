import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"
import { RolesPanel } from "./roles-panel"

export const dynamic = "force-dynamic"

export default async function SettingsRolesPage() {
  const model = await getOwnerOsControlPlanePage("settings-roles")

  return (
    <ControlPlanePage model={model}>
      <RolesPanel />
    </ControlPlanePage>
  )
}
