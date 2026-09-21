import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { createLoginPath } from "@/lib/auth/redirect"
import { getDemoLoginConfig } from "@/lib/auth/demo-login"
import { resolveCurrentUser } from "@/lib/services/auth.service"
import { buildFormalLibraryAssetIndex } from "@/lib/services/library-asset-index.service"
import { getModulePermissionSnapshotForProfile } from "@/lib/services/module-permission.service"
import { resolveActiveWorkspaceContext } from "@/lib/services/workspace-context.service"
import { IngestionProvider } from "@/lib/context/ingestion-context"
import { AiPanelProvider } from "@/lib/context/ai-panel-context"
import { DemoAccountProvider } from "@/lib/context/demo-account-context"
import { ModulePermissionsProvider } from "@/lib/context/module-permissions-context"
import { ResearchProvider } from "@/lib/context/research-context"
import { WorkflowProvider } from "@/lib/context/workflow-context"
import { LifeProvider } from "@/lib/context/life-context"
import { MockDataModeProvider } from "@/lib/context/mock-data-mode-context"
import { ProductLanguageProvider } from "@/lib/context/product-language-context"
import { LibraryClassificationProvider } from "@/lib/context/library-classification-context"
import { WorkspaceProvider } from "@/lib/context/workspace-context"
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

  // AUTH-013: only the fixed-code demo account should see the illustrative
  // mock/example content baked into prototype modules (Research, AI Input,
  // Workflow, Life, Finance, Chamber, Company). Every other signed-in
  // account — including the real Google-allowlisted owners — starts blank.
  const isDemoAccount = currentUser.email === getDemoLoginConfig()?.email

  const [modulePermissionSnapshot, formalLibraryAssetIndex, workspaceContext] = await Promise.all([
    getModulePermissionSnapshotForProfile({
      profileId: currentUser.id,
      role: currentUser.role,
    }),
    buildFormalLibraryAssetIndex(currentUser.id),
    resolveActiveWorkspaceContext(currentUser.id),
  ])

  return (
    <DemoAccountProvider isDemoAccount={isDemoAccount}>
      <MockDataModeProvider defaultEnabled={isDemoAccount}>
        <ProductLanguageProvider>
          <ModulePermissionsProvider initialSnapshot={modulePermissionSnapshot}>
            <WorkspaceProvider
              initialActiveWorkspace={workspaceContext.activeWorkspace}
              allWorkspaces={workspaceContext.allWorkspaces}
            >
              <ResearchProvider allowMockSeed={isDemoAccount} scopeId={currentUser.email}>
                <WorkflowProvider allowMockSeed={isDemoAccount}>
                  <IngestionProvider>
                    <AiPanelProvider>
                      <LifeProvider allowMockSeed={isDemoAccount}>
                        <LibraryClassificationProvider initialFormalLibrary={formalLibraryAssetIndex}>
                          <div className="flex h-screen overflow-hidden">
                            <AppSidebar currentUser={{ email: currentUser.email, role: currentUser.role }} />
                            <div className="flex flex-1 flex-col overflow-hidden">
                              {children}
                            </div>
                            <AiContextPanel />
                          </div>
                        </LibraryClassificationProvider>
                      </LifeProvider>
                    </AiPanelProvider>
                  </IngestionProvider>
                </WorkflowProvider>
              </ResearchProvider>
            </WorkspaceProvider>
          </ModulePermissionsProvider>
        </ProductLanguageProvider>
      </MockDataModeProvider>
    </DemoAccountProvider>
  )
}
