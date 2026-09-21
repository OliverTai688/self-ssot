/**
 * 時間線事件（DB.events）→ 三軌的分流規則（PLN-073 OPS-T05 / OPS-T06）。
 *
 * 舊模型只有一個 `layer` 欄位（專案／日常／行政），但同一個 layer 裡混著三種本質：
 *   - 對外交付點          → Milestone（專案軌）
 *   - 週期性的會議或習慣  → Rhythm(kind=ritual)（節奏軌）
 *   - 週期性的行政義務    → Rhythm(kind=admin)：會重複，但不是「節奏」，
 *                          沒繳勞健保不是節奏斷層，所以不計入履行率
 *   - 一次性事件          → Occasion（行政／活動軌）
 *
 * 這個模組只做「判定」與「轉換」，不碰畫面、不寫檔；
 * dry-run 報告由 scripts/migrate-v5-events-to-tracks.ts 產出交人確認。
 */
import type { LegacyEvent, Milestone, Occasion, Rhythm } from './operating-spine'

export type TrackDecision = 'milestone' | 'rhythm-ritual' | 'rhythm-admin' | 'occasion'

export interface EventClassification {
  id: string
  title: string
  date: string
  layer: string
  decision: TrackDecision
  reason: string
  /** true＝規則判得出來但需要人看一眼（例如重複頻率是推測的）。 */
  needsReview: boolean
  /** rhythm 才有。 */
  rrule?: string
  scope?: 'company' | 'personal'
  /** occasion 才有。 */
  category?: string
}

/* ------------------------------------------------------------------ */
/* 判定規則                                                            */
/* ------------------------------------------------------------------ */

/** 一次性的交付／驗收語彙 —— 帶專案連結時代表對外承諾的時間點。 */
const MILESTONE_WORDS = ['驗收', '交付', '到期', '結案', '定稿', '上線', '發布']
/** 週期性的行政義務語彙。 */
const ADMIN_CYCLE_WORDS = ['發薪', '薪資', '繳費', '勞健保', '報稅', '對帳', '結算', '申報']
/** 週期性的會議／習慣語彙。 */
const RITUAL_WORDS = ['standup', '例會', '週會', '月會', '回顧', '1:1', '一對一', '學習日', '晨會', '營運會議']

const MONTHLY_HINT = ['月', '每月']
const WEEKLY_HINT = ['週', '每週']

function hit(text: string, words: string[]): string | null {
  const hay = text.toLowerCase()
  for (const w of words) if (hay.includes(w.toLowerCase())) return w
  return null
}

function monthlyRule(date: string): string {
  return `FREQ=MONTHLY;BYMONTHDAY=${Number(date.slice(8, 10))}`
}
function weeklyRule(date: string): string {
  const idx = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
  return `FREQ=WEEKLY;BYDAY=${['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][idx]}`
}

export function classifyEvent(event: LegacyEvent): EventClassification {
  const title = event.t || ''
  const base = {
    id: event.id,
    title,
    date: event.d,
    layer: event.layer,
  }

  // 1. 專案層 + 交付語彙 + 有連結專案 → 里程碑
  const msWord = hit(title, MILESTONE_WORDS)
  if (event.link && msWord) {
    return {
      ...base,
      decision: 'milestone',
      reason: `帶專案連結（${event.link}）且標題含「${msWord}」，是對外交付的時間點`,
      needsReview: false,
    }
  }

  // 2. 週期性行政義務 → rhythm(kind=admin)
  const adminWord = hit(title, ADMIN_CYCLE_WORDS)
  if (adminWord) {
    return {
      ...base,
      decision: 'rhythm-admin',
      reason: `標題含「${adminWord}」，是會重複發生的行政義務；不計入節奏履行率`,
      needsReview: false,
      rrule: monthlyRule(event.d),
    }
  }

  // 3. 週期性會議／習慣 → rhythm(kind=ritual)
  const ritualWord = hit(title, RITUAL_WORDS)
  if (ritualWord) {
    const monthly = hit(title, MONTHLY_HINT) && !hit(title, WEEKLY_HINT)
    return {
      ...base,
      decision: 'rhythm-ritual',
      reason: `標題含「${ritualWord}」，是重複發生的節奏；舊模型記不了重複，所以只留下一筆`,
      needsReview: true,
      rrule: monthly ? monthlyRule(event.d) : weeklyRule(event.d),
      scope: 'company',
    }
  }

  // 4. 其餘皆為一次性事件 → occasion
  return {
    ...base,
    decision: 'occasion',
    reason: event.link
      ? '一次性事件，帶專案連結但非交付點'
      : '一次性事件，沒有重複語彙',
    needsReview: false,
    category: occasionCategory(event),
  }
}

function occasionCategory(event: LegacyEvent): string {
  const t = event.t || ''
  if (/會面|會議|洽談|提案|簡報/.test(t) && event.link) return '客戶會議'
  if (/旅遊|出遊/.test(t)) return '旅遊'
  if (/生日|慶生/.test(t)) return '慶生'
  if (/參訪|拜訪/.test(t)) return '企業參訪'
  if (/發表|品牌日|開幕/.test(t)) return '公司活動'
  if (event.layer === '行政') return '行政事務'
  if (event.layer === '專案') return '客戶會議'
  return '行政事務'
}

/* ------------------------------------------------------------------ */
/* 轉換                                                                */
/* ------------------------------------------------------------------ */

export interface MigrationResult {
  milestones: Milestone[]
  rhythms: Rhythm[]
  occasions: Occasion[]
  report: EventClassification[]
}

export function migrateEvents(events: LegacyEvent[]): MigrationResult {
  const milestones: Milestone[] = []
  const rhythms: Rhythm[] = []
  const occasions: Occasion[] = []
  const report: EventClassification[] = []

  for (const event of events) {
    const decision = classifyEvent(event)
    report.push(decision)

    if (decision.decision === 'milestone') {
      milestones.push({
        id: `MS-${event.id}`,
        projectId: event.link || '',
        title: event.t,
        dueOn: event.d,
        accept: event.note || '',
        state: event.done ? 'done' : 'open',
        derivedFrom: event.derived || '',
        remind: event.remind || '',
      })
      continue
    }

    if (decision.decision === 'rhythm-ritual' || decision.decision === 'rhythm-admin') {
      rhythms.push({
        id: `RH-${event.id}`,
        title: event.t,
        kind: decision.decision === 'rhythm-admin' ? 'admin' : 'ritual',
        scope: decision.scope || 'company',
        ownerIds: event.participants && event.participants.length ? event.participants.slice() : [],
        rrule: decision.rrule || monthlyRule(event.d),
        dtstart: event.d,
        until: null,
        timeOfDay: '',
        timezone: 'Asia/Taipei',
        expectMedia: /紀錄|對話|回顧/.test(event.t) ? ['note'] : [],
        derivedFrom: event.derived || '',
        remind: event.remind || '',
        active: true,
      })
      continue
    }

    occasions.push({
      id: `OC-${event.id}`,
      title: event.t,
      cat: decision.category || '行政事務',
      onDate: event.d,
      endOn: event.d,
      at: '',
      place: '',
      actorIds: event.participants && event.participants.length ? event.participants.slice() : [],
      projectId: event.link || '',
      star: !!event.star,
      prep: [],
      recap: '',
      media: [],
      derivedFrom: event.derived || '',
      remind: event.remind || '',
    })
  }

  return { milestones, rhythms, occasions, report }
}

/**
 * 專案的 delivery[]（字串陣列，例如「全公司 28 帳號導入完成」）是里程碑的前身。
 * 轉成里程碑但**不猜日期** —— 日期留空、標記待補，填了日期才會出現在日曆上。
 */
export function deliveriesToMilestones(
  projects: Array<{ id: string; delivery?: string[] }>,
): Milestone[] {
  const out: Milestone[] = []
  for (const project of projects) {
    ;(project.delivery || []).forEach((text, index) => {
      out.push({
        id: `MS-${project.id}-D${index + 1}`,
        projectId: project.id,
        title: text,
        dueOn: '',
        accept: '',
        state: 'open',
        derivedFrom: '',
        remind: '',
      })
    })
  }
  return out
}

export function summarize(report: EventClassification[]): Record<TrackDecision, number> {
  const out: Record<TrackDecision, number> = {
    milestone: 0,
    'rhythm-ritual': 0,
    'rhythm-admin': 0,
    occasion: 0,
  }
  report.forEach((r) => {
    out[r.decision]++
  })
  return out
}
