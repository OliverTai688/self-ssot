import { buildAgentProtocolReadinessContract } from "@/lib/services/agent-protocol-readiness.service"
import {
  buildAIInputSourceWorkflowOpsReadinessContract,
  getOwnerAuthBoundaryContract,
  getOwnerEvidenceConsoleContract,
} from "@/lib/services/admin-readiness.service"
import { resolveCurrentUser } from "@/lib/services/auth.service"
import {
  getModulePermissionSnapshotForProfile,
  getUnauthenticatedModulePermissionSnapshot,
} from "@/lib/services/module-permission.service"
import { getProjectCountForProfile } from "@/lib/services/project.service"
import { SettingsHubClient, type SettingsHubModel } from "./settings-hub-client"

export const dynamic = "force-dynamic"

const statusLabels = {
  authenticated: "Authenticated",
  mock_profile_missing: "Mock profile missing",
  supabase_config_missing: "Supabase env missing",
  supabase_session_missing: "Session missing",
  supabase_profile_missing: "Profile missing",
}

function formatAuthMode(mode: "mock" | "supabase") {
  return mode === "mock" ? "Development mock" : "Supabase SSR"
}

export default async function SettingsPage() {
  const auth = await resolveCurrentUser()
  const [projectCount, modulePermissionSnapshot] = auth.user
    ? await Promise.all([
        getProjectCountForProfile(auth.user.id),
        getModulePermissionSnapshotForProfile({
          profileId: auth.user.id,
          role: auth.user.role,
        }),
      ])
    : [null, getUnauthenticatedModulePermissionSnapshot()]

  const [agentProtocolContract, ownerAuthBoundaryContract, ownerEvidenceConsoleContract] = await Promise.all([
    buildAgentProtocolReadinessContract(),
    getOwnerAuthBoundaryContract(),
    getOwnerEvidenceConsoleContract(),
  ])
  const aiInputSourceWorkflowOpsReadinessContract = await buildAIInputSourceWorkflowOpsReadinessContract({
    canRunAuth005: ownerAuthBoundaryContract.proof.canRunAuth005,
  })

  const enabledModulePreview =
    modulePermissionSnapshot.enabledModules.slice(0, 5).join(" / ") || "No modules enabled"
  const isAuthenticated = auth.status === "authenticated" && auth.user

  const model: SettingsHubModel = {
    authMode: formatAuthMode(auth.mode),
    authStatus: statusLabels[auth.status],
    authTone: isAuthenticated ? "good" : auth.hasSupabaseConfig ? "warn" : "blocked",
    email: auth.user?.email ?? auth.verifiedEmail ?? "Unavailable",
    role: auth.user?.role ?? "Unavailable",
    workProjects: projectCount === null ? "Not available" : String(projectCount),
    enabledModuleCount: modulePermissionSnapshot.enabledModules.length,
    disabledModuleCount: modulePermissionSnapshot.disabledModules.length,
    enabledModulePreview: `Enabled modules: ${enabledModulePreview}`,
    modulePermissionSource: modulePermissionSnapshot.source.replace(/_/g, " "),
    sourceConnectionSummary: `${aiInputSourceWorkflowOpsReadinessContract.summary.completeCount} complete / ${aiInputSourceWorkflowOpsReadinessContract.summary.blockedCount} blocked`,
    sourceConnectionTone: aiInputSourceWorkflowOpsReadinessContract.summary.blockedCount > 0 ? "warn" : "good",
    agentManifestCount: agentProtocolContract.summary.manifestCount,
    sourceAgentCount: agentProtocolContract.summary.sourceAgentCount,
    manualOpsCount: ownerEvidenceConsoleContract.summary.ownerRunCount,
    primaryOwnerAction: ownerEvidenceConsoleContract.summary.primaryOwnerAction,
    authBoundaryStatus: ownerAuthBoundaryContract.proof.boundaryStatus,
    proofHandoff:
      ownerEvidenceConsoleContract.summary.ownerRunCount > 0
        ? ownerEvidenceConsoleContract.summary.primaryOwnerAction
        : ownerAuthBoundaryContract.proof.boundaryStatus,
  }

  return <SettingsHubClient model={model} permissionSnapshot={modulePermissionSnapshot} />
}
