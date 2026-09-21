"use client"

import * as React from "react"

import { COMPANY_THEME_META } from "@/lib/theme/company-theme"
import { useCompanyTheme } from "@/lib/theme/company-theme-context"

/**
 * 包住 company 系列頁面的容器：帶上 .company-scope 讓 globals.css 的
 * 佈景覆蓋層生效，暗底佈景另外加 .dark 讓 Tailwind 的 dark: variant 正確。
 */
export function CompanyThemeScope({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { theme } = useCompanyTheme()
  const isDark = COMPANY_THEME_META[theme].scheme === "dark"

  return (
    <div
      className={[
        "company-scope bg-background text-foreground",
        isDark ? "dark" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-company-theme={theme}
    >
      {children}
    </div>
  )
}
