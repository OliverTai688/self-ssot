import "server-only"

import type { UserRole as DbUserRole } from "@prisma/client"
import { cache } from "react"

import { db } from "@/lib/db"
import {
  ALL_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  type ModuleKey,
  type ModulePermissionSnapshot,
  type UserRole,
} from "@/types/module-permission"

type PermissionRow = {
  moduleKey: string
  isEnabled: boolean
}

const knownModuleKeys = new Set<ModuleKey>(ALL_MODULES.map((module) => module.key))

function toClientRole(role: DbUserRole | string | null | undefined): UserRole {
  switch (role) {
    case "OWNER":
    case "owner":
      return "owner"
    case "PARTNER":
    case "partner":
      return "partner"
    case "CLIENT":
    case "client":
    default:
      return "client"
  }
}

function isModuleKey(value: string): value is ModuleKey {
  return knownModuleKeys.has(value as ModuleKey)
}

function buildSnapshot({
  role,
  rows,
  source,
}: {
  role: UserRole
  rows: PermissionRow[]
  source: ModulePermissionSnapshot["source"]
}): ModulePermissionSnapshot {
  const enabled = new Set<ModuleKey>(DEFAULT_ROLE_PERMISSIONS[role])
  let unknownModuleRows = 0

  rows.forEach((row) => {
    if (!isModuleKey(row.moduleKey)) {
      unknownModuleRows += 1
      return
    }

    if (row.isEnabled) {
      enabled.add(row.moduleKey)
    } else {
      enabled.delete(row.moduleKey)
    }
  })

  const enabledModules = ALL_MODULES
    .map((module) => module.key)
    .filter((key) => enabled.has(key))

  return {
    role,
    enabledModules,
    source,
    dbPermissionRows: rows.length,
    unknownModuleRows,
    disabledModules: ALL_MODULES
      .map((module) => module.key)
      .filter((key) => !enabled.has(key)),
    generatedAt: new Date().toISOString(),
  }
}

const getPermissionRowsForProfile = cache(async (profileId: string): Promise<PermissionRow[]> => {
  return db.userModulePermission.findMany({
    where: { profileId },
    select: {
      moduleKey: true,
      isEnabled: true,
    },
    orderBy: {
      moduleKey: "asc",
    },
  })
})

export function getDefaultModulePermissionSnapshot(role: DbUserRole | string): ModulePermissionSnapshot {
  return buildSnapshot({
    role: toClientRole(role),
    rows: [],
    source: "role_default",
  })
}

export function getUnauthenticatedModulePermissionSnapshot(): ModulePermissionSnapshot {
  return buildSnapshot({
    role: "client",
    rows: [],
    source: "unauthenticated",
  })
}

export async function getModulePermissionSnapshotForProfile(input: {
  profileId: string
  role: DbUserRole | string
}): Promise<ModulePermissionSnapshot> {
  const rows = await getPermissionRowsForProfile(input.profileId)

  return buildSnapshot({
    role: toClientRole(input.role),
    rows,
    source: rows.length > 0 ? "database" : "role_default",
  })
}
