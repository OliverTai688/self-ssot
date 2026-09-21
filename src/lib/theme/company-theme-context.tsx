"use client"

import * as React from "react"

import {
  COMPANY_THEME_ATTRIBUTE,
  COMPANY_THEME_EVENT,
  COMPANY_THEME_STORAGE_KEY,
  DEFAULT_COMPANY_THEME,
  normalizeCompanyTheme,
  type CompanyTheme,
} from "./company-theme"

interface CompanyThemeContextValue {
  theme: CompanyTheme
  setTheme: (theme: CompanyTheme) => void
}

const CompanyThemeContext = React.createContext<CompanyThemeContextValue>({
  theme: DEFAULT_COMPANY_THEME,
  setTheme: () => {},
})

export function useCompanyTheme() {
  return React.useContext(CompanyThemeContext)
}

/**
 * 佈景狀態存在 localStorage，屬於 React 之外的系統，
 * 因此用 useSyncExternalStore 訂閱，避免在 effect 裡 setState 造成連鎖渲染。
 */
const listeners = new Set<() => void>()
let snapshot: CompanyTheme = DEFAULT_COMPANY_THEME

function readStoredTheme(): CompanyTheme {
  try {
    return normalizeCompanyTheme(localStorage.getItem(COMPANY_THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_COMPANY_THEME
  }
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) snapshot = readStoredTheme()
  listeners.add(listener)

  const onStorage = (event: StorageEvent) => {
    if (event.key !== COMPANY_THEME_STORAGE_KEY) return
    snapshot = normalizeCompanyTheme(event.newValue)
    emit()
  }
  window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot(): CompanyTheme {
  return snapshot
}

function getServerSnapshot(): CompanyTheme {
  return DEFAULT_COMPANY_THEME
}

export function setCompanyTheme(next: CompanyTheme) {
  snapshot = next
  try {
    localStorage.setItem(COMPANY_THEME_STORAGE_KEY, next)
  } catch {
    // 私密視窗或封鎖 storage 時，就只維持這次 session。
  }
  emit()
}

export function CompanyThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  React.useEffect(() => {
    document.documentElement.setAttribute(COMPANY_THEME_ATTRIBUTE, theme)
    window.dispatchEvent(new CustomEvent(COMPANY_THEME_EVENT, { detail: { theme } }))
  }, [theme])

  const value = React.useMemo(() => ({ theme, setTheme: setCompanyTheme }), [theme])

  return <CompanyThemeContext.Provider value={value}>{children}</CompanyThemeContext.Provider>
}
