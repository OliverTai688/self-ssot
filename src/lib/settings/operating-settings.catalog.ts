/**
 * 營運工作台設定目錄。
 *
 * 這是設定的單一事實來源：有哪些 key、屬於哪一面、預設值、怎麼驗證、誰能寫。
 * 伺服器（service／route handler）與工作台介面都讀這一份，避免介面列了一個
 * 後端不認得的開關。
 *
 * 分三面，對應右上角帳號選單：
 *   basic    基礎設定 —— 這台工作台怎麼呈現（每個人各自一份）
 *   personal 個人設定 —— 這個人的工作習慣（每個人各自一份）
 *   org      組織設定 —— 全公司共用一份，只有負責人席位寫得動
 */

export const SETTING_SECTIONS = ["basic", "personal", "org"] as const
export type SettingSection = (typeof SETTING_SECTIONS)[number]

export type SettingValue = string | boolean

type BaseField = {
  key: string
  section: SettingSection
  label: string
  help?: string
  /** 對應的契約條款，會顯示在設定旁邊，讓限制看得見來源。 */
  clause?: string
}

export type SettingField = BaseField &
  (
    | { kind: "enum"; options: Array<{ value: string; label: string; help?: string }>; defaultValue: string }
    | { kind: "boolean"; defaultValue: boolean }
    | { kind: "text"; defaultValue: string; maxLength: number; placeholder?: string }
  )

export const OPERATING_SETTING_FIELDS: SettingField[] = [
  {
    key: "ui.theme",
    section: "basic",
    kind: "enum",
    label: "佈景主題",
    help: "工作台視覺主題。白色為清爽中性亮色，橘色為暖米亮色，黑色為經典深色，品牌為圓展企業 CI。",
    defaultValue: "black",
    options: [
      { value: "white", label: "白" },
      { value: "orange", label: "橘" },
      { value: "black", label: "黑" },
      { value: "brand", label: "品牌" },
    ],
  },
  {
    key: "ui.density",
    section: "basic",
    kind: "enum",
    label: "介面密度",
    help: "同一畫面要放多少資訊。密集適合對帳與表格，寬鬆適合長時間書寫。",
    defaultValue: "comfortable",
    options: [
      { value: "comfortable", label: "寬鬆" },
      { value: "compact", label: "密集" },
    ],
  },
  {
    key: "ui.landingWorkbench",
    section: "basic",
    kind: "enum",
    label: "登入後先到哪裡",
    help: "每天打開系統時的第一個畫面。",
    defaultValue: "journal",
    options: [
      { value: "journal", label: "日誌" },
      { value: "desk", label: "工作台" },
      { value: "project", label: "專案" },
      { value: "money", label: "金流" },
      { value: "capacity", label: "容量" },
      { value: "commit", label: "承諾" },
    ],
  },
  {
    key: "profile.displayName",
    section: "personal",
    kind: "text",
    label: "工作台顯示名稱",
    help: "留空就用預設名稱。這個名字會出現在右上角、留言與稽核軌跡上。",
    defaultValue: "",
    maxLength: 40,
    placeholder: "例如：宇星",
  },
  {
    key: "journal.defaultSpace",
    section: "personal",
    kind: "enum",
    label: "日誌預設空間",
    help: "個人空間只有自己看得到；圓展空間是輸入即讓團隊看見。",
    defaultValue: "team",
    options: [
      { value: "team", label: "圓展空間" },
      { value: "personal", label: "個人空間" },
    ],
  },
  {
    key: "calendar.googleSyncScope",
    section: "personal",
    kind: "enum",
    label: "Google 行事曆同步範圍",
    help: "之後接上 Google 行事曆時，只同步標題或說明裡 @提及你、或完全沒有標記任何人（全體）的事件；對方專屬的事件不會帶出去。",
    defaultValue: "mine",
    options: [
      { value: "mine", label: "只同步與我相關" },
      { value: "all", label: "同步全部事件" },
    ],
  },
  {
    key: "org.displayName",
    section: "org",
    kind: "text",
    label: "組織名稱",
    help: "顯示在左上角與對外輸出上。",
    defaultValue: "圓展 Operating System",
    maxLength: 40,
  },
  {
    key: "org.memberSeesOwnerCapacity",
    section: "org",
    kind: "boolean",
    label: "員工看得到負責人的週配置",
    help: "兩人公司預設互相看得見工作節奏。關閉後，員工的容量頁只會顯示自己那一欄。無論開關如何，員工都不能修改負責人的配置。",
    clause: "§20.4",
    defaultValue: true,
  },
  {
    key: "org.operatingModule",
    section: "org",
    kind: "enum",
    label: "營運模組版本",
    help: "canvas＝新的營運畫布（今天／日曆／熱力／甘特／清單）；legacy＝舊的時間線與工作台。切換後重新整理才會生效。",
    defaultValue: "canvas",
    options: [
      { value: "canvas", label: "營運畫布（新）" },
      { value: "legacy", label: "時間線＋工作台（舊）" },
    ],
  },
  {
    key: "org.dataMode",
    section: "org",
    kind: "enum",
    label: "工作台資料來源",
    help: "沿用環境變數，或強制切成示例／空白資料。改了要重新整理才會生效。",
    defaultValue: "inherit",
    options: [
      { value: "inherit", label: "沿用環境設定" },
      { value: "showcase", label: "示例資料" },
      { value: "empty", label: "空白開始" },
    ],
  },
]

const FIELDS_BY_KEY = new Map(OPERATING_SETTING_FIELDS.map((field) => [field.key, field]))

export function findSettingField(key: string): SettingField | null {
  return FIELDS_BY_KEY.get(key) ?? null
}

export function sectionFields(section: SettingSection): SettingField[] {
  return OPERATING_SETTING_FIELDS.filter((field) => field.section === section)
}

export function defaultSettingValues(section: SettingSection): Record<string, SettingValue> {
  const values: Record<string, SettingValue> = {}
  for (const field of sectionFields(section)) values[field.key] = field.defaultValue
  return values
}

export type ParsedSettingValue =
  | { ok: true; value: SettingValue }
  | { ok: false; error: string }

/** 驗證一個送進來的值。錯誤訊息是給人看的，不含內部細節。 */
export function parseSettingValue(field: SettingField, raw: unknown): ParsedSettingValue {
  if (field.kind === "boolean") {
    if (typeof raw !== "boolean") return { ok: false, error: `${field.label}只能是開或關。` }
    return { ok: true, value: raw }
  }

  if (field.kind === "enum") {
    if (typeof raw !== "string" || !field.options.some((option) => option.value === raw)) {
      return { ok: false, error: `${field.label}不是可選的值。` }
    }
    return { ok: true, value: raw }
  }

  if (typeof raw !== "string") return { ok: false, error: `${field.label}必須是文字。` }
  const trimmed = raw.trim()
  if (trimmed.length > field.maxLength) {
    return { ok: false, error: `${field.label}最多 ${field.maxLength} 個字。` }
  }
  return { ok: true, value: trimmed }
}

/** 把資料庫讀回來的值收斂回目錄允許的形狀；壞掉的值退回預設，不讓介面爆掉。 */
export function coerceStoredValue(field: SettingField, stored: unknown): SettingValue {
  const parsed = parseSettingValue(field, stored)
  return parsed.ok ? parsed.value : field.defaultValue
}
