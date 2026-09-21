import { getAdminLaunchOverview } from "@/lib/services/admin-readiness.service"
import { AdminHubClient, type AdminHubModel } from "./admin-hub-client"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const overview = await getAdminLaunchOverview()

  const model: AdminHubModel = {
    generatedAt: overview.generatedAt,
    currentLevel: overview.loop.currentLevel,
    targetNextLevel: overview.loop.targetNextLevel,
    currentLoop: overview.loop.currentLoop,
    nextRecommendedTask: overview.loop.nextRecommendedTask,
    summaryItems: overview.summaryItems,
    launchBlockers: overview.launchBlockers,
  }

  return <AdminHubClient model={model} />
}
