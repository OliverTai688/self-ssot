"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

interface AiPanelContextValue {
  isOpen: boolean
  toggle: () => void
  contextLabel: string
}

const AiPanelContext = React.createContext<AiPanelContextValue>({
  isOpen: true,
  toggle: () => {},
  contextLabel: "個人作業系統",
})

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true)
  const pathname = usePathname()

  React.useEffect(() => {
    const stored = localStorage.getItem("ai-panel-open")
    if (stored !== null) setIsOpen(stored === "true")
  }, [])

  const toggle = React.useCallback(() => {
    setIsOpen((v) => {
      const next = !v
      localStorage.setItem("ai-panel-open", String(next))
      return next
    })
  }, [])

  const contextLabel = React.useMemo(() => {
    if (/\/work\/[^/]+/.test(pathname)) return "工作 › 專案詳情"
    if (pathname.startsWith("/work")) return "工作模組"
    if (pathname.startsWith("/dashboard")) return "今日概覽"
    if (pathname.startsWith("/chamber")) return "商會 CRM"
    if (pathname.startsWith("/research")) return "研究主軸"
    if (pathname.startsWith("/finance")) return "財務"
    if (pathname.startsWith("/life")) return "生活"
    return "個人作業系統"
  }, [pathname])

  return (
    <AiPanelContext.Provider value={{ isOpen, toggle, contextLabel }}>
      {children}
    </AiPanelContext.Provider>
  )
}

export function useAiPanel() {
  return React.useContext(AiPanelContext)
}
