import "server-only"

import { requireUser } from "@/lib/services/auth.service"
import {
  adminAiGovernanceControlPlane,
  adminAuditControlPlane,
  adminRbacControlPlane,
  adminSystemReadinessControlPlane,
  settingsAiSharingControlPlane,
  settingsLanguageControlPlane,
  settingsMembersControlPlane,
  settingsRolesControlPlane,
  type ControlPlanePageModel,
} from "@/lib/owneros/control-plane-pages"

export type OwnerOsControlPlanePageKey =
  | "settings-language"
  | "settings-members"
  | "settings-roles"
  | "settings-ai-sharing"
  | "admin-rbac"
  | "admin-ai-governance"
  | "admin-audit"
  | "admin-system-readiness"

const controlPlaneModels: Record<OwnerOsControlPlanePageKey, ControlPlanePageModel> = {
  "settings-language": settingsLanguageControlPlane,
  "settings-members": settingsMembersControlPlane,
  "settings-roles": settingsRolesControlPlane,
  "settings-ai-sharing": settingsAiSharingControlPlane,
  "admin-rbac": adminRbacControlPlane,
  "admin-ai-governance": adminAiGovernanceControlPlane,
  "admin-audit": adminAuditControlPlane,
  "admin-system-readiness": adminSystemReadinessControlPlane,
}

export async function getOwnerOsControlPlanePage(
  key: OwnerOsControlPlanePageKey
): Promise<ControlPlanePageModel> {
  await requireUser()
  return controlPlaneModels[key]
}
