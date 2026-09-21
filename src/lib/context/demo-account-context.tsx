"use client"

import * as React from "react"

/**
 * Whether the signed-in account is the AUTH-013 fixed-code demo account
 * (see src/lib/auth/demo-login.ts). Computed once, server-side, in
 * src/app/(dashboard)/layout.tsx (the only place with access to the current
 * user) and handed down so deeply nested prototype pages/components can
 * decide whether to render their illustrative mock content or a genuinely
 * blank state — every other signed-in account should see the latter.
 *
 * Defaults to `false` so a component rendered outside the provider (or
 * before hydration) fails closed to "no mock content" rather than leaking
 * demo/example content.
 */
const DemoAccountContext = React.createContext<boolean>(false)

export function DemoAccountProvider({
  isDemoAccount,
  children,
}: {
  isDemoAccount: boolean
  children: React.ReactNode
}) {
  return (
    <DemoAccountContext.Provider value={isDemoAccount}>{children}</DemoAccountContext.Provider>
  )
}

export function useIsDemoAccount() {
  return React.useContext(DemoAccountContext)
}
