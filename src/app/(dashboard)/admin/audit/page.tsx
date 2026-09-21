import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"
import { AuditPanel } from "./audit-panel"

export const dynamic = "force-dynamic"

export default async function AdminAuditPage() {
  const model = await getOwnerOsControlPlanePage("admin-audit")

  return (
    <ControlPlanePage model={model}>
      <AuditPanel />
    </ControlPlanePage>
  )
}
