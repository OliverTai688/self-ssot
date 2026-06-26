"use client"

import * as React from "react"

const MOCK_DATA_STORAGE_KEY = "personal-os:mock-data-enabled"

interface MockDataModeContextValue {
  isMockDataEnabled: boolean
  setMockDataEnabled: (enabled: boolean) => void
  toggleMockData: () => void
}

const MockDataModeContext = React.createContext<MockDataModeContextValue | null>(null)

export function MockDataModeProvider({ children }: { children: React.ReactNode }) {
  const [isMockDataEnabled, setIsMockDataEnabled] = React.useState(() => {
    if (typeof window === "undefined") return true
    const stored = window.localStorage.getItem(MOCK_DATA_STORAGE_KEY)
    return stored !== "false"
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
