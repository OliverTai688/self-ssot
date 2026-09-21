"use client"

import * as React from "react"

import {
  DEFAULT_PRODUCT_LOCALE,
  getProductCopy,
  type ProductCopy,
  type ProductLocale,
} from "@/lib/i18n/product-copy"

const PRODUCT_LOCALE_STORAGE_KEY = "personal-os:product-locale"

interface ProductLanguageContextValue {
  locale: ProductLocale
  copy: ProductCopy
  setLocale: (locale: ProductLocale) => void
}

const ProductLanguageContext = React.createContext<ProductLanguageContextValue | null>(null)

function isProductLocale(value: string | null): value is ProductLocale {
  return value === "zh-TW" || value === "en-US"
}

function getDocumentLang(locale: ProductLocale) {
  return locale === "zh-TW" ? "zh-Hant-TW" : "en-US"
}

export function ProductLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<ProductLocale>(DEFAULT_PRODUCT_LOCALE)

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PRODUCT_LOCALE_STORAGE_KEY)
      if (isProductLocale(saved)) setLocaleState(saved)
    } catch {
      setLocaleState(DEFAULT_PRODUCT_LOCALE)
    }
  }, [])

  const setLocale = React.useCallback((nextLocale: ProductLocale) => {
    setLocaleState(nextLocale)
    try {
      window.localStorage.setItem(PRODUCT_LOCALE_STORAGE_KEY, nextLocale)
    } catch {
      // Keep the in-memory preference even when browser storage is unavailable.
    }
  }, [])

  React.useEffect(() => {
    document.documentElement.lang = getDocumentLang(locale)
  }, [locale])

  const value = React.useMemo<ProductLanguageContextValue>(
    () => ({
      locale,
      copy: getProductCopy(locale),
      setLocale,
    }),
    [locale, setLocale]
  )

  return <ProductLanguageContext.Provider value={value}>{children}</ProductLanguageContext.Provider>
}

export function useProductLanguage() {
  const context = React.useContext(ProductLanguageContext)
  if (!context) throw new Error("useProductLanguage must be used within ProductLanguageProvider")
  return context
}
