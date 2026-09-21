"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useRef } from "react"

import {
  WORKSPACE_LANDING,
  WORKSPACE_META,
  WORKSPACE_MODES,
  type WorkspaceMode,
} from "@/lib/auth/workspace"

const SHELL_ID = "login-shell"
const GOOGLE_LINK_ID = "workspace-google-login"

/**
 * 登入頁上方的工作區切換。
 *
 * 伺服器仍然是唯一的真實來源（?ws= 由 page.tsx 解析），
 * 但 RSC 往返會有幾十毫秒的延遲，所以這裡先做兩件樂觀更新：
 *   1. 直接改 #login-shell 的 data-workspace → 背景色立刻變，作為選擇的提示
 *   2. 同步表單裡的 next 欄位與 Google 登入連結 → 在 RSC 回來之前按下送出也會落到正確的頁面
 */
export function WorkspaceTabs({ value }: { value: WorkspaceMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabsRef = useRef<HTMLDivElement | null>(null)

  const select = useCallback(
    (workspace: WorkspaceMode) => {
      if (workspace === value) return

      const landing = WORKSPACE_LANDING[workspace]

      if (typeof document !== "undefined") {
        document.getElementById(SHELL_ID)?.setAttribute("data-workspace", workspace)
        const shell = document.getElementById(SHELL_ID)
        shell?.querySelectorAll<HTMLInputElement>('input[name="next"]').forEach((input) => {
          input.value = landing
        })
        const google = document.getElementById(GOOGLE_LINK_ID) as HTMLAnchorElement | null
        if (google) {
          google.href = `/auth/google?next=${encodeURIComponent(landing)}`
        }
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "")
      params.set("ws", workspace)
      // next 由伺服器依 ws 重新推導，留著舊值只會互相打架。
      params.delete("next")
      router.replace(`/login?${params.toString()}`, { scroll: false })
    },
    [router, searchParams, value],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const index = WORKSPACE_MODES.indexOf(value)
      const delta = event.key === "ArrowRight" ? 1 : -1
      const next = WORKSPACE_MODES[(index + delta + WORKSPACE_MODES.length) % WORKSPACE_MODES.length]
      select(next)
      const buttons = tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      buttons?.[WORKSPACE_MODES.indexOf(next)]?.focus()
    },
    [select, value],
  )

  return (
    <div
      ref={tabsRef}
      role="tablist"
      aria-label="選擇登入後要進入的工作區"
      onKeyDown={onKeyDown}
      className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-background/60 p-1 backdrop-blur"
    >
      {WORKSPACE_MODES.map((mode) => {
        const active = mode === value
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => select(mode)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--workspace-accent)] text-[var(--workspace-accent-foreground)] shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            ].join(" ")}
          >
            {WORKSPACE_META[mode].label}
          </button>
        )
      })}
    </div>
  )
}
