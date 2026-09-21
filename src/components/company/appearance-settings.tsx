"use client"

import { COMPANY_THEME_LIST, type CompanyTheme } from "@/lib/theme/company-theme"
import { useCompanyTheme } from "@/lib/theme/company-theme-context"

const descriptions: Record<CompanyTheme, string> = {
  white: "中性亮色，適合白天與投影。",
  orange: "暖米底加橘色強調，長時間閱讀不刺眼。",
  black: "現行深色工作台樣貌（預設）。",
  brand: "圓展教育科技 CI：深藍底＋橘色強調。",
}

/**
 * 個人設定裡的外觀區塊：選擇 company / operating 系列頁面的佈景主題。
 * 設定存在這台裝置上，立即套用到 /company 與 /company/operating。
 */
export function CompanyAppearanceSettings() {
  const { theme, setTheme } = useCompanyTheme()

  return (
    <div className="p-4">
      <p className="text-xs text-muted-foreground">
        套用於公司與營運工作台（/company、/company/operating）。設定只存在這台裝置。
      </p>
      <div
        role="radiogroup"
        aria-label="佈景主題"
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {COMPANY_THEME_LIST.map((item) => {
          const selected = item.id === theme
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(item.id)}
              className={[
                "rounded-lg border p-3 text-left transition-colors",
                selected ? "border-primary ring-1 ring-primary" : "hover:bg-accent/40",
              ].join(" ")}
            >
              <span
                aria-hidden
                className="flex h-12 w-full items-end justify-end rounded-md border p-1.5"
                style={{ background: item.swatch.base }}
              >
                <span
                  className="size-4 rounded-full"
                  style={{ background: item.swatch.accent }}
                />
              </span>
              <span className="mt-2 flex items-center gap-2">
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-[11px] text-muted-foreground">{item.labelEn}</span>
                {selected ? (
                  <span className="ml-auto text-[11px] font-medium text-primary">使用中</span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {descriptions[item.id]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
