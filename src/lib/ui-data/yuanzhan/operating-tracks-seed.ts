/**
 * 把三軌集合掛到 v5 的記憶體 store 上（PLN-073 OPS-T04 / OPS-T06）。
 *
 * `v5-seed.js` 是由 scripts/generate-yuanzhan-v5.mjs 從 owner 的原型 HTML 產生的，
 * 手改會在下次 generate 時被覆蓋。所以三軌不寫進那個檔，而是在
 * createV5State() 取得 seed 之後由這裡接上 —— 生成物與手寫物分開。
 *
 * empty 模式不需要特別處理：createV5State 既有的「清空所有陣列」迴圈會一併清掉，
 * 符合 ARC-040「渲染空日誌不自動建立資料」的契約。
 */
import type { referenceSeed } from './v5-seed'
import {
  deliveriesToMilestones,
  migrateEvents,
  type EventClassification,
} from './operating-events-migration'
import type {
  Milestone,
  Objective,
  Occasion,
  Phase,
  Rhythm,
  RhythmSession,
} from './operating-spine'

export interface OperatingTracks {
  phases: Phase[]
  milestones: Milestone[]
  objectives: Objective[]
  rhythms: Rhythm[]
  sessions: RhythmSession[]
  occasions: Occasion[]
}

/**
 * 支出假設與各燈號門檻，一個工作區一份（PLN-074 契約金流）。
 *
 * 它跟三軌一樣不在 `v5-seed.js` 裡 —— 那個檔是由原型 HTML 產生的，沒有這個概念。
 * 資料來自 `operating-store.service.ts` 的 assumption 列；沒有那一列時是空物件，
 * 所以每個欄位都是選填，讀的一方必須自己處理「還沒設定」。
 */
export interface CashConfig {
  monthlyBurn?: number
  runwayGreen?: number
  runwayAmber?: number
  coverageGreen?: number
  coverageAmber?: number
  overdueAmber?: number
  overdueRed?: number
  probCHALLENGEABLE?: number
  probPROPOSED?: number
}

export type ReferenceSeed = ReturnType<typeof referenceSeed>
export type V5Data = ReferenceSeed & OperatingTracks & { cashConfig: CashConfig }

interface SeedProject {
  id: string
  delivery?: string[]
}

/**
 * 依 operating-events-migration 的判定，把 DB.events 展開成三軌，
 * 並把每個專案的 delivery[] 轉成「日期待補」的里程碑。
 *
 * 原本的 DB.events 保留不刪：T2/T3 期間新舊並存，legacy 模組仍讀得到它，
 * 而三軌只透過 TRACK_REF_TYPES 被新模組讀取，兩邊不會重複計算。
 * 到 T4 舊模組下架時才移除 events。
 */
export function buildOperatingTracks(data: ReferenceSeed): OperatingTracks & {
  report: EventClassification[]
} {
  const events = ((data as unknown as { events?: unknown[] }).events || []) as Parameters<
    typeof migrateEvents
  >[0]
  const projects = ((data as unknown as { projects?: SeedProject[] }).projects ||
    []) as SeedProject[]

  const migrated = migrateEvents(events)
  return {
    phases: [],
    milestones: [...migrated.milestones, ...deliveriesToMilestones(projects)],
    objectives: [],
    rhythms: migrated.rhythms,
    sessions: [],
    occasions: migrated.occasions,
    report: migrated.report,
  }
}

export function attachOperatingTracks(data: ReferenceSeed): V5Data {
  const tracks = buildOperatingTracks(data)
  const target = data as unknown as Record<string, unknown>
  target.phases = tracks.phases
  target.milestones = tracks.milestones
  target.objectives = tracks.objectives
  target.rhythms = tracks.rhythms
  target.sessions = tracks.sessions
  target.occasions = tracks.occasions
  // 預設空物件：prototype／showcase 沒有支出假設，接了資料庫才會被 store 覆蓋。
  // 給 {} 而不是省略，讀的一方才不必分辨 undefined 與「還沒設定」兩種空。
  if (target.cashConfig === undefined) target.cashConfig = {}
  return data as V5Data
}
