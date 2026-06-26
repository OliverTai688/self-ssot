"use client"

import * as React from "react"
import {
  ALL_MODULES,
  ModuleKey,
  ModulePermissionSnapshot,
  UserRole,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/types/module-permission"

interface ModulePermissionsContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  enabledModules: ModuleKey[]
  toggleModule: (key: ModuleKey) => void
  isModuleEnabled: (key: ModuleKey) => boolean
  permissionSource: ModulePermissionSnapshot["source"]
  dbPermissionRows: number
  unknownModuleRows: number
  resetToServerPermissions: () => void
}

const ModulePermissionsContext = React.createContext<ModulePermissionsContextType | undefined>(undefined)

const allModuleKeys = ALL_MODULES.map((module) => module.key)
const knownModuleKeys = new Set<ModuleKey>(allModuleKeys)

const fallbackSnapshot: ModulePermissionSnapshot = {
  role: "owner",
  enabledModules: DEFAULT_ROLE_PERMISSIONS.owner,
  source: "role_default",
  dbPermissionRows: 0,
  unknownModuleRows: 0,
  disabledModules: [],
  generatedAt: "client-fallback",
}

function isUserRole(value: string | null): value is UserRole {
  return value === "owner" || value === "partner" || value === "client"
}

function toSnapshot(
  base: ModulePermissionSnapshot,
  role: UserRole,
  enabledModules: ModuleKey[],
  source: ModulePermissionSnapshot["source"]
): ModulePermissionSnapshot {
  const enabled = new Set(enabledModules)

  return {
    ...base,
    role,
    enabledModules: allModuleKeys.filter((key) => enabled.has(key)),
    disabledModules: allModuleKeys.filter((key) => !enabled.has(key)),
    source,
  }
}

function parseSavedModules(value: string | null): ModuleKey[] | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null

    const modules = parsed.filter((item): item is ModuleKey => {
      return typeof item === "string" && knownModuleKeys.has(item as ModuleKey)
    })

    return Array.from(new Set(modules))
  } catch {
    return null
  }
}

export function ModulePermissionsProvider({
  children,
  initialSnapshot = fallbackSnapshot,
}: {
  children: React.ReactNode
  initialSnapshot?: ModulePermissionSnapshot
}) {
  const [snapshot, setSnapshot] = React.useState<ModulePermissionSnapshot>(initialSnapshot)

  React.useEffect(() => {
    const savedRole = localStorage.getItem("pos_role")
    const savedModules = localStorage.getItem("pos_enabled_modules")

    if (isUserRole(savedRole)) {
      setSnapshot((current) =>
        toSnapshot(
          current,
          savedRole,
          parseSavedModules(savedModules) ?? DEFAULT_ROLE_PERMISSIONS[savedRole],
          "browser_override"
        )
      )
    }
  }, [])

  const setRole = React.useCallback((newRole: UserRole) => {
    const defaults = DEFAULT_ROLE_PERMISSIONS[newRole]
    setSnapshot((current) => toSnapshot(current, newRole, defaults, "browser_override"))
    localStorage.setItem("pos_role", newRole)
    localStorage.setItem("pos_enabled_modules", JSON.stringify(defaults))
  }, [])

  const toggleModule = React.useCallback((key: ModuleKey) => {
    setSnapshot((current) => {
      const prev = current.enabledModules
      const next = prev.includes(key)
        ? prev.filter((m) => m !== key)
        : [...prev, key]
      localStorage.setItem("pos_enabled_modules", JSON.stringify(next))
      localStorage.setItem("pos_role", current.role)
      return toSnapshot(current, current.role, next, "browser_override")
    })
  }, [])

  const isModuleEnabled = React.useCallback((key: ModuleKey) => {
    return snapshot.enabledModules.includes(key)
  }, [snapshot.enabledModules])

  const resetToServerPermissions = React.useCallback(() => {
    localStorage.removeItem("pos_role")
    localStorage.removeItem("pos_enabled_modules")
    setSnapshot(initialSnapshot)
  }, [initialSnapshot])

  return (
    <ModulePermissionsContext.Provider
      value={{
        role: snapshot.role,
        setRole,
        enabledModules: snapshot.enabledModules,
        toggleModule,
        isModuleEnabled,
        permissionSource: snapshot.source,
        dbPermissionRows: snapshot.dbPermissionRows,
        unknownModuleRows: snapshot.unknownModuleRows,
        resetToServerPermissions,
      }}
    >
      {children}
    </ModulePermissionsContext.Provider>
  )
}

export function useModulePermissions() {
  const context = React.useContext(ModulePermissionsContext)
  if (context === undefined) {
    throw new Error("useModulePermissions must be used within a ModulePermissionsProvider")
  }
  return context
}
