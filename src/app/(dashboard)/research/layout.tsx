"use client"

import { ModuleGuard } from "@/components/layout/module-guard"

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard moduleKey="research">{children}</ModuleGuard>
}
