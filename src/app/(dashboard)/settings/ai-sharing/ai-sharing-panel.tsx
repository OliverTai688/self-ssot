"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DetailList, DetailListRow, PanelHeader } from "@/components/owneros/control-plane-shell"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"
import { ALL_MODULES } from "@/types/module-permission"

type SharingScope = "off" | "summary" | "full"

interface ModuleSharingSetting {
  id: string
  scope: SharingScope
}

const scopeLabel: Record<SharingScope, string> = {
  off: "不分享",
  summary: "僅摘要",
  full: "完整 context",
}

const scopeTone: Record<SharingScope, "neutral" | "review" | "proposal"> = {
  off: "neutral",
  summary: "review",
  full: "proposal",
}

const seedSharing: ModuleSharingSetting[] = ALL_MODULES.map((module) => ({
  id: module.key,
  scope: module.key === "dashboard" || module.key === "work" ? "summary" : "off",
}))

/**
 * Per-module "what can Core AI see" control. This is inherently an update
 * action on a fixed module list (there's nothing to add/delete — the module
 * set comes from `ALL_MODULES`), so the CRUD surface here is a real,
 * immediately-effective Select per row rather than a contrived add/remove
 * flow. Local-only until a Profile-backed sharing policy exists.
 */
export function AiSharingPanel() {
  const sharing = useLocalEntities<ModuleSharingSetting>(seedSharing, { storageKey: "settings-ai-sharing" })
  const scopeMap = React.useMemo(() => new Map(sharing.items.map((row) => [row.id, row.scope])), [sharing.items])

  return (
    <section className="rounded-lg border bg-background">
      <PanelHeader
        title="模組分享範圍"
        description="改動立即套用到本機狀態；正式生效需要 Profile-backed 分享政策與 audit。"
        count={sharing.items.filter((row) => row.scope !== "off").length}
      />
      <DetailList className="border-none">
        {ALL_MODULES.map((module) => {
          const scope = scopeMap.get(module.key) ?? "off"
          return (
            <DetailListRow
              key={module.key}
              label={module.name}
              status={scopeLabel[scope]}
              tone={scopeTone[scope]}
              summary={module.description}
              trailing={
                <Select
                  value={scope}
                  onValueChange={(value) => void sharing.update(module.key, { scope: value as SharingScope })}
                >
                  <SelectTrigger size="sm" className="w-[132px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">{scopeLabel.off}</SelectItem>
                    <SelectItem value="summary">{scopeLabel.summary}</SelectItem>
                    <SelectItem value="full">{scopeLabel.full}</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          )
        })}
      </DetailList>
    </section>
  )
}
