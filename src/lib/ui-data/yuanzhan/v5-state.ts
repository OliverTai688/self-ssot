import { referenceSeed } from './v5-seed'
import { parseUiDataMode } from './mode'
import { attachOperatingTracks, type V5Data } from './operating-tracks-seed'
import type { YuanzhanSeat } from '@/lib/auth/yuanzhan-actor'
import type { SettingField, SettingValue } from '@/lib/settings/operating-settings.catalog'
import type { OperatingSettingsSnapshot } from '@/lib/services/operating-settings.service'
import { DEFAULT_OPERATING_DATA_SOURCE, type OperatingDataSource } from './data-source'
import type { UiDataMode } from '@/types/yuanzhan-ui'

/**
 * 工作台的「今天」屬於哪個時區。
 *
 * 與 `Rhythm.timezone` 的預設值同一個，理由也一樣：這是一間在台灣的兩人公司，
 * 「今天」對他們而言就是台北的今天。目前沒有把它做成可設定項。
 */
const OPERATING_TIMEZONE = "Asia/Taipei"

/**
 * database 模式的「今天」。
 *
 * prototype／showcase 的 fixture 全部掛在 seed 的 2026-09-12 上 —— 那個日期是展示
 * 資料的一部分，動了展示資料就對不起來。但 database 模式根本不載入 fixture，
 * `today` 還留著那個常數的話，工作台會一直以為今天是 2026-09-12：日誌寫進去的是
 * 那一天，今日脈絡與今日議題也掛在那一天，畫面上的日期跟真實時間對不起來。
 *
 * 用 Asia/Taipei 算而不是伺服器的時區：這一頁是 Server Component，部署環境跑在
 * UTC，台北時間 00:13 在 UTC 還是前一天，直接 `toISOString().slice(0,10)` 會整段
 * 凌晨都差一天。`en-CA` 的日期格式正好就是 YYYY-MM-DD。
 */
export function operatingToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** 誰在看這個工作台。由登入身分決定，序列化後交給 v5 runtime。 */
export interface V5Viewer {
  email: string
  actor: 'yz' | 'lily'
  /** 工作台裡的顯示名稱（個人設定可覆寫，否則用 fixtures 的 people）。 */
  name: string
  /** fixtures 裡的原始名稱：個人設定清空時要還原成這個。 */
  defaultName: string
  role: 'owner' | 'member'
  canSwitchActor: boolean
}

/** 設定的初始快照＋目錄，讓設定抽屜開啟時就是已存的值，不用先打一次 API。 */
export interface V5Settings {
  basic: Record<string, SettingValue>
  personal: Record<string, SettingValue>
  org: Record<string, SettingValue>
  orgEditable: boolean
  orgUpdatedAt: string | null
  seats: Array<{ email: string; actor: string; role: string; canSwitchActor: boolean }> | null
  degraded: boolean
  catalog: SettingField[]
}

/** Serializable, synthetic-only contract for the faithfully ported v5 workbench. */
export interface V5State {
  mode: UiDataMode
  /**
   * 資料來源（ARC-042 §8）。prototype 代表這一份 store 只活在記憶體裡，
   * 工作台必須把這件事顯示出來，而不是讓人以為輸入的東西被保存了。
   */
  dataSource: OperatingDataSource
  fixtureVersion: string
  referenceDate: string
  /** null = 預覽／展示模式，沒有登入身分，維持原型的自由切換行為。 */
  viewer: V5Viewer | null
  /** null = 預覽／展示模式，設定面板改為唯讀說明。 */
  settings: V5Settings | null
  /** 三軌（phases/milestones/objectives/rhythms/sessions/occasions）由 operating-tracks-seed 掛上。 */
  data: V5Data
}

export function createV5State(
  mode: UiDataMode,
  seat?: YuanzhanSeat | null,
  settings?: (OperatingSettingsSnapshot & { catalog: SettingField[] }) | null,
  dataSource: OperatingDataSource = DEFAULT_OPERATING_DATA_SOURCE,
  /** database 模式下由 operating-store.service 讀回來的實際資料。 */
  store?: Record<string, unknown> | null,
): V5State {
  parseUiDataMode(mode)
  // 三軌在清空迴圈之前掛上，empty 模式才會一併被清成空陣列（ARC-040）。
  const data = attachOperatingTracks(referenceSeed())
  // database 模式一律先清空再覆蓋：UI_DATA_MODE 不得把 fixture 注入正式資料（ARC-042 §8）。
  // 沒清空的話，資料庫裡沒有的那些集合會保留 showcase 的假資料，看起來像真的。
  if (mode === 'empty' || dataSource === 'database') {
    for (const key of Object.keys(data)) {
      const k = key as keyof typeof data
      if (Array.isArray(data[k])) (data as unknown as Record<string, unknown>)[key] = []
    }
    data.journal = {} as typeof data.journal
    data.repos = {} as typeof data.repos
    data.capacity = { yz: [], lily: [] }
    data.timesheet = { yz: [], lily: [] }
  }

  // fixture 的 2026-09-12 只對 prototype／showcase 有意義；接了資料庫就得用真的今天。
  if (dataSource === 'database') data.today = operatingToday()

  if (dataSource === 'database' && store) {
    Object.assign(data as unknown as Record<string, unknown>, store)
  }

  let viewer: V5Viewer | null = null
  if (seat) {
    const preferredName = typeof settings?.personal['profile.displayName'] === 'string'
      ? (settings.personal['profile.displayName'] as string).trim()
      : ''
    // 身分在伺服器就決定好：runtime 讀到的 DB.me 已經是登入者本人。
    data.me = seat.actor
    const seedPerson = data.people[seat.actor]
    const defaultName = seedPerson?.n ?? seat.email
    if (preferredName && seedPerson) seedPerson.n = preferredName

    viewer = {
      email: seat.email,
      actor: seat.actor,
      name: seedPerson?.n ?? seat.email,
      defaultName,
      role: seat.role,
      canSwitchActor: seat.canSwitchActor,
    }
  }

  return {
    mode,
    dataSource,
    fixtureVersion: 'yz-v5-20260913.1',
    referenceDate: data.today,
    viewer,
    settings: settings ?? null,
    data,
  }
}
