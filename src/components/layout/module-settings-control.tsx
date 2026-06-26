"use client"

import * as React from "react"
import { SettingsIcon, CheckIcon, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useModulePermissions } from "@/lib/context/module-permissions-context"
import { ALL_MODULES, UserRole } from "@/types/module-permission"
import { cn } from "@/lib/utils"

export function ModuleSettingsControl() {
  const [isOpen, setIsOpen] = React.useState(false)
  const { role, setRole, enabledModules, toggleModule } = useModulePermissions()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 border-dashed hover:border-solid text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <SettingsIcon className="size-3.5" />
            <span>帳戶權限管理</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheckIcon className="size-4 text-primary" />
            全域角色與獨立模組授權
          </DialogTitle>
          <DialogDescription className="text-xs">
            在這裡一鍵模擬不同帳戶角色，或手動啟用/關閉特定的獨立模組，即時展示微服務權限控制。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Role selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              1. 選擇模擬帳戶角色 (預設授權)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["owner", "partner", "client"] as UserRole[]).map((r) => {
                const active = role === r
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-lg border py-2.5 text-center transition-all cursor-pointer",
                      active
                        ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/20"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="text-xs uppercase font-bold tracking-tight">{r}</span>
                    <span className="text-[9px] text-muted-foreground/60 leading-none">
                      {r === "owner" ? "系統擁有者" : r === "partner" ? "商會夥伴" : "外部客戶"}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Module checklist */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              2. 自由增刪獨立模組 (功能開關)
            </label>
            <div className="rounded-lg border border-border divide-y divide-border/60 overflow-hidden bg-muted/20">
              {ALL_MODULES.map((m) => {
                const isEnabled = enabledModules.includes(m.key)
                return (
                  <button
                    key={m.key}
                    onClick={() => toggleModule(m.key)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5 max-w-[85%]">
                      <span className="text-xs font-medium text-foreground">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground/70 truncate">
                        {m.description}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "size-4 rounded border flex items-center justify-center transition-all shrink-0",
                        isEnabled
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-transparent"
                      )}
                    >
                      {isEnabled && <CheckIcon className="size-3 stroke-[3]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border/40 flex justify-end">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => setIsOpen(false)}
          >
            完成設定並套用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
