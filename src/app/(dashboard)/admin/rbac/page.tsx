import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"
import { RbacPanel } from "./rbac-panel"

export const dynamic = "force-dynamic"

export default async function AdminRbacPage() {
  const model = await getOwnerOsControlPlanePage("admin-rbac")

  return (
    <ControlPlanePage model={model}>
      <RbacPanel />
    </ControlPlanePage>
  )
}
