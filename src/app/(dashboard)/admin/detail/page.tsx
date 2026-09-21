import { getAdminLaunchOverview } from "@/lib/services/admin-readiness.service"
import { AdminDetailClient } from "./admin-detail-client"

export const dynamic = "force-dynamic"

export default async function AdminDetailPage() {
  const consoleState = await getAdminLaunchOverview()

  return <AdminDetailClient consoleState={consoleState} />
}
