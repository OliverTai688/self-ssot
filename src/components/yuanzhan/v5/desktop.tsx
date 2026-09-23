'use client'

import { useEffect, useRef } from 'react'
import type { V5State } from '@/lib/ui-data/yuanzhan/v5-state'
import { mountV5 } from './runtime'
import { v5Styles } from './styles'
import { v5ThemeStyles } from './theme-styles'
import { COMPANY_THEME_EVENT, companyThemeBackground } from '@/lib/theme/company-theme'
import { useCompanyTheme } from '@/lib/theme/company-theme-context'
import { CompanyThemeScope } from '@/components/company/company-theme-scope'
import { TriangleAlert } from 'lucide-react'


/** React owns the authenticated page lifecycle; v5 owns only this isolated DOM subtree. */
export function V5Desktop({ initialState }: { initialState: V5State }) {
  const host = useRef<HTMLDivElement>(null)
  const { theme } = useCompanyTheme()

  useEffect(() => {
    const element = host.current
    if (!element) return
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = `${v5Styles}\n${v5ThemeStyles}`
    const root = document.createElement('div')
    root.className = 'v5-root'
    root.dataset.mode = initialState.mode
    shadow.replaceChildren(style, root)
    const workbench = mountV5(root, structuredClone(initialState))
    return () => { workbench.destroy(); shadow.replaceChildren() }
  }, [initialState])

  // 佈景只改 host 屬性，不重掛 v5，工作台裡的編輯狀態才不會流失。
  useEffect(() => {
    const element = host.current
    if (!element) return
    element.dataset.theme = theme
    element.style.background = companyThemeBackground(theme)
    // 讓 Shadow DOM 內以 JS 取色的圖表有機會重繪。
    element.shadowRoot?.dispatchEvent(
      new CustomEvent(COMPANY_THEME_EVENT, { detail: { theme }, bubbles: false })
    )
  }, [theme])

  const isPrototype = initialState.dataSource === 'prototype'

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {isPrototype ? <PrototypeDataBanner /> : null}
      <div
        ref={host}
        data-yuanzhan-v5
        data-mode={initialState.mode}
        data-theme={theme}
        data-data-source={initialState.dataSource}
        style={{ flex: 1, minHeight: 0, background: companyThemeBackground(theme) }}
      />
    </div>
  )
}

/**
 * PLN-074 M0。
 *
 * 工作台看起來像能保存而實際上不能，是目前最大的風險：有人會在裡面輸入真實的營運資料，
 * 然後在下一次重整時失去它。在寫入管線接上之前，這條橫幅是唯一誠實的做法。
 *
 * 刻意不做成可關閉：它描述的是系統狀態而不是一次性通知，關掉之後那個狀態並不會改變。
 */
function PrototypeDataBanner() {
  return (
    <CompanyThemeScope className="shrink-0 border-b border-border/60">
      <div className="company-tone company-tone-warn flex items-center gap-2 px-4 py-2 text-xs">
        <TriangleAlert aria-hidden className="size-4 shrink-0" style={{ color: 'var(--tone)' }} />
        <p className="min-w-0">
          <strong className="font-semibold">預覽模式</strong>
          <span className="text-muted-foreground">
            　這個工作台目前不保存資料。在這裡新增或修改的任何紀錄，重新整理、換裝置或重新部署之後都會回到初始狀態。
          </span>
        </p>
      </div>
    </CompanyThemeScope>
  )
}
