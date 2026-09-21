import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"
import { SystemReadinessPanel } from "./system-readiness-panel"

export const dynamic = "force-dynamic"

export default async function AdminSystemReadinessPage() {
  const model = await getOwnerOsControlPlanePage("admin-system-readiness")

  return (
    <ControlPlanePage model={model}>
      <SystemReadinessPanel />
    </ControlPlanePage>
  )
}
