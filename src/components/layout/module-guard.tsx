"use client"

import * as React from "react"
import { ShieldAlertIcon } from "lucide-react"

import { ModuleKey } from "@/types/module-permission"
import { useModulePermissions } from "@/lib/context/module-permissions-context"

interface ModuleGuardProps {
  moduleKey: ModuleKey
  children: React.ReactNode
}

export function ModuleGuard({ moduleKey, children }: ModuleGuardProps) {
  const { isModuleEnabled, role } = useModulePermissions()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // Guard against hydration mismatch
  }

  const enabled = isModuleEnabled(moduleKey)

  if (!enabled) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 p-8 text-center flex flex-col items-center gap-4">
          <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <ShieldAlertIcon className="size-6" />
          </div>
          <h1 className="font-semibold text-lg text-foreground">模組存取受限</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            目前帳號角色 (<span className="font-semibold text-primary">{role.toUpperCase()}</span>) 尚未配置取用 <span className="font-semibold">[{moduleKey.toUpperCase()}]</span> 模組的權限。
          </p>
          <p className="text-xs text-muted-foreground/60">
            請點擊頂部導航列的「⚙️ 角色模組權限」按鈕以開啟對應權限進行操作演示。
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
