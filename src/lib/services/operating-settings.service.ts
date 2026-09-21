import "server-only"

import { getYuanzhanSeats, resolveYuanzhanSeat, type YuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { db } from "@/lib/db"
import {
  OPERATING_SETTING_FIELDS,
  coerceStoredValue,
  defaultSettingValues,
  findSettingField,
  parseSettingValue,
  sectionFields,
  type SettingSection,
  type SettingValue,
} from "@/lib/settings/operating-settings.catalog"
import type { AuthenticatedUser } from "@/lib/services/auth.service"

/** 目前只有一個組織；欄位留著是為了之後真的多租戶。 */
export const DEFAULT_ORG_KEY = "yzedtech"

export type OperatingSettingsSnapshot = {
  basic: Record<string, SettingValue>
  personal: Record<string, SettingValue>
  /** 組織設定全員可讀（它決定員工看得到什麼），但只有負責人席位可寫。 */
  org: Record<string, SettingValue>
  orgEditable: boolean
  orgUpdatedAt: string | null
  /** 席位名單只給負責人看：上面有同事的 email。 */
  seats: YuanzhanSeat[] | null
  /** true = 設定資料表還沒建立或資料庫讀不到，介面顯示的是預設值。 */
  degraded: boolean
}

export class SettingsAuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SettingsAuthorizationError"
  }
}

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SettingsValidationError"
  }
}

export class SettingsUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SettingsUnavailableError"
  }
}

function emptySnapshot(orgEditable: boolean, degraded: boolean): OperatingSettingsSnapshot {
  return {
    basic: defaultSettingValues("basic"),
    personal: defaultSettingValues("personal"),
    org: defaultSettingValues("org"),
    orgEditable,
    orgUpdatedAt: null,
    seats: orgEditable ? getYuanzhanSeats() : null,
    degraded,
  }
}

function scopeOf(section: SettingSection): "BASIC" | "PERSONAL" {
  return section === "basic" ? "BASIC" : "PERSONAL"
}

function canWriteOrg(seat: YuanzhanSeat | null): boolean {
  return seat?.role === "owner"
}

/**
 * 讀出這個人看到的設定。
 *
 * 遷移還沒跑、資料庫暫時連不上時不會擋住工作台：回傳預設值並標記 degraded，
 * 讓介面說明「現在看到的是預設值」而不是假裝存過了。
 */
export async function loadOperatingSettings(
  user: AuthenticatedUser,
  seat?: YuanzhanSeat | null,
): Promise<OperatingSettingsSnapshot> {
  const resolvedSeat = seat === undefined ? resolveYuanzhanSeat(user.email) : seat
  const orgEditable = canWriteOrg(resolvedSeat)

  try {
    const [userRows, orgRows] = await Promise.all([
      db.userSetting.findMany({
        where: { profileId: user.id },
        select: { scope: true, key: true, value: true },
      }),
      db.organizationSetting.findMany({
        where: { orgKey: DEFAULT_ORG_KEY },
        select: { key: true, value: true, updatedAt: true },
      }),
    ])

    const snapshot = emptySnapshot(orgEditable, false)

    for (const row of userRows) {
      const field = findSettingField(row.key)
      if (!field || field.section === "org") continue
      if (scopeOf(field.section) !== row.scope) continue
      snapshot[field.section][field.key] = coerceStoredValue(field, row.value)
    }

    let latest: Date | null = null
    for (const row of orgRows) {
      const field = findSettingField(row.key)
      if (!field || field.section !== "org") continue
      snapshot.org[field.key] = coerceStoredValue(field, row.value)
      if (!latest || row.updatedAt > latest) latest = row.updatedAt
    }
    snapshot.orgUpdatedAt = latest ? latest.toISOString() : null

    return snapshot
  } catch (error) {
    console.warn("[operating-settings] 讀取設定失敗，改用預設值：", error)
    return emptySnapshot(orgEditable, true)
  }
}

/**
 * 寫一個設定。
 *
 * 授權在這一層，不在 route handler：組織設定只有負責人席位寫得動，
 * 基礎／個人設定只能寫到自己的 profile 上——呼叫端無法指定別人。
 */
export async function updateOperatingSetting(
  user: AuthenticatedUser,
  seat: YuanzhanSeat | null,
  key: string,
  rawValue: unknown,
): Promise<OperatingSettingsSnapshot> {
  const field = findSettingField(key)
  if (!field) {
    throw new SettingsValidationError("這個設定不存在。")
  }

  const parsed = parseSettingValue(field, rawValue)
  if (!parsed.ok) {
    throw new SettingsValidationError(parsed.error)
  }

  if (field.section === "org" && !canWriteOrg(seat)) {
    throw new SettingsAuthorizationError("組織設定只有負責人可以修改。")
  }

  try {
    if (field.section === "org") {
      await db.organizationSetting.upsert({
        where: { orgKey_key: { orgKey: DEFAULT_ORG_KEY, key: field.key } },
        create: {
          orgKey: DEFAULT_ORG_KEY,
          key: field.key,
          value: parsed.value,
          updatedById: user.id,
        },
        update: { value: parsed.value, updatedById: user.id },
      })
    } else {
      const scope = scopeOf(field.section)
      await db.userSetting.upsert({
        where: { profileId_scope_key: { profileId: user.id, scope, key: field.key } },
        create: { profileId: user.id, scope, key: field.key, value: parsed.value },
        update: { value: parsed.value },
      })
    }
  } catch (error) {
    console.warn("[operating-settings] 寫入設定失敗：", error)
    throw new SettingsUnavailableError("設定沒有存起來：資料表可能還沒建立，請先執行 pnpm db:migrate。")
  }

  return loadOperatingSettings(user, seat)
}

/** 給介面用的目錄（不含任何值），讓工作台不必自己硬寫一份選項。 */
export function operatingSettingsCatalog() {
  return {
    basic: sectionFields("basic"),
    personal: sectionFields("personal"),
    org: sectionFields("org"),
    all: OPERATING_SETTING_FIELDS,
  }
}
