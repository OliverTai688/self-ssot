import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { createLoginPath } from "@/lib/auth/redirect"
import { resolveCurrentUser } from "@/lib/services/auth.service"
import { getModulePermissionSnapshotForProfile } from "@/lib/services/module-permission.service"
import { IngestionProvider } from "@/lib/context/ingestion-context"
import { AiPanelProvider } from "@/lib/context/ai-panel-context"
import { ModulePermissionsProvider } from "@/lib/context/module-permissions-context"
import { ResearchProvider } from "@/lib/context/research-context"
import { WorkflowProvider } from "@/lib/context/workflow-context"
import { LifeProvider } from "@/lib/context/life-context"
import { MockDataModeProvider } from "@/lib/context/mock-data-mode-context"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AiContextPanel } from "@/components/ai/ai-context-panel"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await resolveCurrentUser()
  const currentUser = auth.user

  if (!currentUser) {
    const requestPath = (await headers()).get("x-personal-os-path") ?? "/ai-input"
    redirect(createLoginPath(requestPath, auth.status))
  }

  const modulePermissionSnapshot = await getModulePermissionSnapshotForProfile({
    profileId: currentUser.id,
    role: currentUser.role,
  })

  return (
    <MockDataModeProvider>
      <ModulePermissionsProvider initialSnapshot={modulePermissionSnapshot}>
        <ResearchProvider>
          <WorkflowProvider>
            <IngestionProvider>
              <AiPanelProvider>
                <LifeProvider>
                  <div className="flex h-screen overflow-hidden">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col overflow-hidden">
                      {children}
                    </div>
                    <AiContextPanel />
                  </div>
                </LifeProvider>
              </AiPanelProvider>
            </IngestionProvider>
          </WorkflowProvider>
        </ResearchProvider>
      </ModulePermissionsProvider>
    </MockDataModeProvider>
  )
}
