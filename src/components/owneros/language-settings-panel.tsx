"use client"

import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProductLocale } from "@/lib/i18n/product-copy"

const localeOptions: Array<{
  locale: ProductLocale
  label: Record<ProductLocale, string>
  description: Record<ProductLocale, string>
}> = [
  {
    locale: "zh-TW",
    label: {
      "zh-TW": "繁體中文",
      "en-US": "Traditional Chinese",
    },
    description: {
      "zh-TW": "預設正式操作語言，適合日常使用與 owner review。",
      "en-US": "Default formal operating language for daily use and owner review.",
    },
  },
  {
    locale: "en-US",
    label: {
      "zh-TW": "English",
      "en-US": "English",
    },
    description: {
      "zh-TW": "保留海外協作、文件化與 team pilot 的英文 fallback。",
      "en-US": "English fallback for collaboration, documentation, and team pilots.",
    },
  },
]

export function LanguageSettingsPanel() {
  const { locale, setLocale } = useProductLanguage()
  const isEnglish = locale === "en-US"

  return (
    <section className="rounded-lg border bg-background" data-owneros-surface="OWNEROS-I18N-002-LANGUAGE-CONTROL">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{isEnglish ? "Language switcher" : "語言切換"}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {isEnglish
            ? "This currently uses local preference and affects the app shell, sidebar, quick capture, and control-plane pages. Profile-backed BFF settings come later."
            : "目前先用本機偏好保存，立即影響全站 shell、sidebar、快速擷取與控制面文案；後續再升級為 Profile-backed BFF 設定。"}
        </p>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2">
        {localeOptions.map((option) => {
          const selected = option.locale === locale

          return (
            <Button
              key={option.locale}
              type="button"
              variant={selected ? "secondary" : "outline"}
              className={cn(
                "h-auto justify-start px-4 py-3 text-left",
                selected ? "border-foreground/20" : "bg-background"
              )}
              onClick={() => setLocale(option.locale)}
            >
              <span className="grid min-w-0 flex-1 gap-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {selected && <CheckIcon className="size-3.5" />}
                  {option.label[locale]}
                </span>
                <span className="whitespace-normal text-xs leading-relaxed text-muted-foreground">
                  {option.description[locale]}
                </span>
              </span>
            </Button>
          )
        })}
      </div>
    </section>
  )
}
