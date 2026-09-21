"use client"

import * as React from "react"

import { COMPANY_THEME_LIST, type CompanyTheme } from "@/lib/theme/company-theme"
import { useCompanyTheme } from "@/lib/theme/company-theme-context"

/**
 * 四色 segmented control：白 / 橘 / 黑 / 品牌。
 * 鍵盤左右鍵可切換，符合 radiogroup 語意。
 */
export function CompanyThemeSwitcher({
  size = "sm",
  showLabel = false,
}: {
  size?: "sm" | "md"
  showLabel?: boolean
}) {
  const { theme, setTheme } = useCompanyTheme()
  const swatch = size === "md" ? "size-5" : "size-4"

  const move = (direction: -1 | 1) => {
    const index = COMPANY_THEME_LIST.findIndex((item) => item.id === theme)
    const next = COMPANY_THEME_LIST[(index + direction + COMPANY_THEME_LIST.length) % COMPANY_THEME_LIST.length]
    setTheme(next.id)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      move(1)
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      move(-1)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="佈景主題"
      onKeyDown={onKeyDown}
      className="inline-flex items-center gap-1 rounded-md border bg-card p-1"
    >
      {COMPANY_THEME_LIST.map((item) => {
        const selected = item.id === theme
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`佈景主題 ${item.label}`}
            title={`${item.label} · ${item.labelEn}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTheme(item.id as CompanyTheme)}
            className={[
              "flex items-center gap-1.5 rounded px-1.5 py-1 text-xs transition-colors",
              selected ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={`${swatch} relative rounded-full border border-border`}
              style={{ background: item.swatch.base }}
            >
              <span
                className="absolute bottom-0 right-0 size-1.5 rounded-full"
                style={{ background: item.swatch.accent }}
              />
            </span>
            {showLabel ? <span className="font-medium">{item.label}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
