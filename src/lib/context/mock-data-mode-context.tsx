"use client"

import * as React from "react"

const MOCK_DATA_STORAGE_KEY = "personal-os:mock-data-enabled"

interface MockDataModeContextValue {
  isMockDataEnabled: boolean
  setMockDataEnabled: (enabled: boolean) => void
  toggleMockData: () => void
}

const MockDataModeContext = React.createContext<MockDataModeContextValue | null>(null)

export function MockDataModeProvider({
  children,
  defaultEnabled = false,
}: {
  children: React.ReactNode
  /**
   * Initial value when the viewer has never explicitly toggled mock data
   * (no localStorage override yet). Pass `true` only for the AUTH-013 demo
   * account; every other account should default to off so it starts blank.
   */
  defaultEnabled?: boolean
}) {
  const [isMockDataEnabled, setIsMockDataEnabled] = React.useState(() => {
    if (typeof window === "undefined") return defaultEnabled
    try {
      const stored = window.localStorage.getItem(MOCK_DATA_STORAGE_KEY)
      if (stored === "true") return true
      if (stored === "false") return false
    } catch (e) {
      console.warn("[MockDataModeProvider] localStorage access denied", e)
    }
    return defaultEnabled
  })

  const setMockDataEnabled = React.useCallback((enabled: boolean) => {
    setIsMockDataEnabled(enabled)
    window.localStorage.setItem(MOCK_DATA_STORAGE_KEY, enabled ? "true" : "false")
  }, [])

  const toggleMockData = React.useCallback(() => {
    setMockDataEnabled(!isMockDataEnabled)
  }, [isMockDataEnabled, setMockDataEnabled])

  return (
    <MockDataModeContext.Provider value={{ isMockDataEnabled, setMockDataEnabled, toggleMockData }}>
      {children}
    </MockDataModeContext.Provider>
  )
}

export function useMockDataMode() {
  const ctx = React.useContext(MockDataModeContext)
  if (!ctx) throw new Error("useMockDataMode must be used within MockDataModeProvider")
  return ctx
}
