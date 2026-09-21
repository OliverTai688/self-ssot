'use client'

import { useEffect, useRef } from 'react'
import type { V5State } from '@/lib/ui-data/yuanzhan/v5-state'
import { mountV5 } from './runtime'
import { v5Styles } from './styles'
import { v5ThemeStyles } from './theme-styles'
import { COMPANY_THEME_EVENT, companyThemeBackground } from '@/lib/theme/company-theme'
import { useCompanyTheme } from '@/lib/theme/company-theme-context'


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

  return (
    <div className="relative" style={{ height: '100dvh' }}>
      <div
        ref={host}
        data-yuanzhan-v5
        data-mode={initialState.mode}
        data-theme={theme}
        style={{ height: '100dvh', background: companyThemeBackground(theme) }}
      />

    </div>
  )
}
