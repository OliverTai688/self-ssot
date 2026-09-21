/**
 * time_spine —— 三軌（專案／日常節奏／行政活動）匯流成一條扁平索引的純函式層。
 *
 * 設計依 PLN-072 §2.3 與 PLN-073：
 *   - 已具體化的東西（里程碑、有到期日的任務、活動的每一天、已落地的 session 覆寫）
 *     由呼叫端的 store 提供；
 *   - 節奏的未來／未覆寫實例在「查詢期」由 RRULE 即時展開，不預存資料列。
 *
 * 這一層沒有 DOM、沒有框架、沒有外部相依，因此 v5 runtime 與 node 測試腳本可以共用。
 * T1 階段只餵 legacy 的 events / issues，輸出與舊畫面等價；T2 起三軌集合接進來。
 */

export type SpineTrack = 'project' | 'rhythm' | 'occasion'
export type SpineState = 'planned' | 'done' | 'late' | 'missed' | 'skipped'
export type SpineRefType = 'event' | 'task' | 'milestone' | 'session' | 'occasion'

export interface SpineItem {
  /** 穩定鍵：用於 DOM key 與選取狀態，格式 `<prefix>:<id>[:<date>]`。 */
  key: string
  track: SpineTrack
  refType: SpineRefType
  /** 指回來源紀錄；session 用 `<rhythmId>|<occurrenceDate>`。 */
  refId: string
  /** YYYY-MM-DD。 */
  date: string
  title: string
  sub: string
  actorIds: string[]
  /** 佔用強度，餵 heatmap 與衝期規則。 */
  weight: number
  state: SpineState
  star: boolean
  projectId: string
  /** 由契約條文或法規推導 —— 帶值者不可編輯／刪除（沿用 v5 的 derived 規則）。 */
  derivedFrom: string
  remind: string
}

export interface SpineFilters {
  tracks?: SpineTrack[]
  /** 只要某幾種來源（例如只要 legacy event，用於 T1 的等價改寫）。 */
  refTypes?: SpineRefType[]
  projectIds?: string[]
  scopes?: Array<'company' | 'personal'>
  actorIds?: string[]
  /** kind=admin 的週期性行政義務不算節奏履行，可單獨關掉。 */
  rhythmKinds?: Array<'ritual' | 'admin'>
}

export interface SpineRange {
  from: string
  to: string
}

/* ------------------------------------------------------------------ */
/* 日期工具（天粒度，UTC，避免時區把「哪一天」算歪）                    */
/* ------------------------------------------------------------------ */

const DAY = 86400000
export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}
export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}
export function addDays(iso: string, n: number): string {
  return toIso(new Date(toDate(iso).getTime() + n * DAY))
}
export function diffDays(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY)
}
/** 0 = 週一 */
export function weekdayIndex(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7
}
export function weekdayKey(iso: string): Weekday {
  return WEEKDAYS[weekdayIndex(iso)]
}
export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso))
}
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}
export function isoWeek(iso: string): number {
  const d = toDate(iso)
  const t = new Date(d)
  t.setUTCDate(t.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const week1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  return (
    1 +
    Math.round(
      ((t.getTime() - week1.getTime()) / DAY - 3 + ((week1.getUTCDay() + 6) % 7)) / 7,
    )
  )
}

/* ------------------------------------------------------------------ */
/* RRULE（RFC 5545 子集）                                              */
/* ------------------------------------------------------------------ */

export interface ParsedRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  interval: number
  byday: Weekday[]
  bymonthday: number[]
  count: number | null
  until: string | null
}

/**
 * 支援的子集：FREQ=DAILY|WEEKLY|MONTHLY、INTERVAL、BYDAY、BYMONTHDAY、COUNT、UNTIL。
 * 這是兩人公司實際會用到的全部；要更完整時可換成 rrule / @rrulenet/rrule，
 * 介面（parseRule + expandRule）刻意保持可替換。
 */
export function parseRule(rrule: string): ParsedRule {
  const out: ParsedRule = {
    freq: 'WEEKLY',
    interval: 1,
    byday: [],
    bymonthday: [],
    count: null,
    until: null,
  }
  String(rrule || '')
    .replace(/^RRULE:/i, '')
    .split(';')
    .forEach((part) => {
      const [rawKey, rawValue] = part.split('=')
      if (!rawKey || rawValue == null) return
      const key = rawKey.trim().toUpperCase()
      const value = rawValue.trim()
      if (key === 'FREQ') {
        const f = value.toUpperCase()
        if (f === 'DAILY' || f === 'WEEKLY' || f === 'MONTHLY') out.freq = f
      } else if (key === 'INTERVAL') {
        out.interval = Math.max(1, Number(value) || 1)
      } else if (key === 'BYDAY') {
        out.byday = value
          .toUpperCase()
          .split(',')
          .map((d) => d.trim().slice(-2) as Weekday)
          .filter((d) => (WEEKDAYS as readonly string[]).includes(d))
      } else if (key === 'BYMONTHDAY') {
        out.bymonthday = value
          .split(',')
          .map((n) => Number(n.trim()))
          .filter((n) => n >= 1 && n <= 31)
      } else if (key === 'COUNT') {
        out.count = Number(value) || null
      } else if (key === 'UNTIL') {
        const v = value.replace(/T.*$/, '')
        out.until = v.length === 8 ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v
      }
    })
  return out
}

/** 把規則展開成 [from, to] 區間內的日期（含端點），天粒度、當地日語意。 */
export function expandRule(
  rrule: string,
  dtstart: string,
  range: SpineRange,
  until?: string | null,
): string[] {
  const rule = parseRule(rrule)
  const hardUntil = until || rule.until || null
  const out: string[] = []
  if (!dtstart) return out

  const stop = hardUntil && hardUntil < range.to ? hardUntil : range.to
  if (stop < dtstart) return out

  if (rule.freq === 'MONTHLY') {
    const days = rule.bymonthday.length ? rule.bymonthday : [Number(dtstart.slice(8, 10))]
    let cursor = monthKey(dtstart > range.from ? dtstart : range.from)
    const lastMonth = monthKey(stop)
    let guard = 0
    while (cursor <= lastMonth && guard++ < 600) {
      const [y, m] = cursor.split('-').map(Number)
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
      days
        .map((d) => `${cursor}-${String(Math.min(d, lastDay)).padStart(2, '0')}`)
        .forEach((iso) => {
          if (iso >= dtstart && iso >= range.from && iso <= stop) out.push(iso)
        })
      cursor = monthKey(addDays(`${cursor}-01`, 32))
    }
    out.sort()
    return rule.count ? out.slice(0, rule.count) : out
  }

  const start = dtstart > range.from ? dtstart : range.from
  const anchorWeek = mondayOf(dtstart)
  const byday = rule.byday.length ? rule.byday : [weekdayKey(dtstart)]
  let guard = 0
  for (let iso = start; iso <= stop && guard++ < 4000; iso = addDays(iso, 1)) {
    if (iso < dtstart) continue
    if (rule.freq === 'DAILY') {
      if (rule.interval > 1 && diffDays(dtstart, iso) % rule.interval !== 0) continue
      out.push(iso)
      continue
    }
    if (!byday.includes(weekdayKey(iso))) continue
    if (rule.interval > 1) {
      const weeks = Math.round(diffDays(anchorWeek, mondayOf(iso)) / 7)
      if (weeks % rule.interval !== 0) continue
    }
    out.push(iso)
  }
  return rule.count ? out.slice(0, rule.count) : out
}

/* ------------------------------------------------------------------ */
/* Store 形狀（v5 記憶體 store，欄位皆為選填以相容 T1 → T2 過渡）       */
/* ------------------------------------------------------------------ */

export interface LegacyEvent {
  id: string
  d: string
  t: string
  layer: string
  star?: boolean
  derived?: string
  link?: string
  remind?: string
  note?: string
  done?: boolean
  participants?: string[]
}
export interface LegacyIssue {
  id: string
  t: string
  p: string
  owner: string
  st: string
  due?: string
  done?: string
  size?: string
}
export interface Phase {
  id: string
  projectId: string
  /** discovery | planning | execution | review | maintenance，對齊 Prisma 的 ProjectPhase。 */
  phase: string
  label: string
  startOn: string
  endOn: string
  state?: string
}
export interface Milestone {
  id: string
  projectId: string
  phaseId?: string
  title: string
  /** 空字串＝日期待補（例如由 delivery[] 轉來的），不進日曆。 */
  dueOn: string
  accept?: string
  state?: string
  derivedFrom?: string
  remind?: string
}
export interface Objective {
  id: string
  milestoneId: string
  title: string
}
export interface Rhythm {
  id: string
  title: string
  kind?: 'ritual' | 'admin'
  scope?: 'company' | 'personal'
  ownerIds?: string[]
  rrule: string
  dtstart: string
  until?: string | null
  timeOfDay?: string
  timezone?: string
  expectMedia?: string[]
  derivedFrom?: string
  remind?: string
  active?: boolean
}
export interface RhythmSession {
  id?: string
  rhythmId: string
  occurrenceDate: string
  state: 'done' | 'skip' | 'moved'
  movedTo?: string
  note?: string
  media?: unknown[]
}
export interface Occasion {
  id: string
  title: string
  cat: string
  onDate: string
  endOn?: string
  at?: string
  place?: string
  actorIds?: string[]
  projectId?: string
  star?: boolean
  prep?: Array<{ t: string; done: boolean }>
  recap?: string
  media?: unknown[]
  derivedFrom?: string
  remind?: string
}

export interface SpineStore {
  today?: string
  events?: LegacyEvent[]
  issues?: LegacyIssue[]
  phases?: Phase[]
  milestones?: Milestone[]
  objectives?: Objective[]
  rhythms?: Rhythm[]
  sessions?: RhythmSession[]
  occasions?: Occasion[]
}

/**
 * 三軌的來源型別。T2 起新模組只讀這四種，
 * 藉此與尚未下架的 legacy `event` 完全隔離（不會重複計算）。
 */
export const TRACK_REF_TYPES: SpineRefType[] = ['milestone', 'task', 'session', 'occasion']

const LAYER_TRACK: Record<string, SpineTrack> = {
  專案: 'project',
  日常: 'rhythm',
  行政: 'occasion',
}

function stateFor(date: string, today: string, done: boolean): SpineState {
  if (done) return 'done'
  return date < today ? 'late' : 'planned'
}

/* ------------------------------------------------------------------ */
/* 主查詢                                                              */
/* ------------------------------------------------------------------ */

export function buildSpine(
  store: SpineStore,
  range: SpineRange,
  today: string,
  filters?: SpineFilters,
): SpineItem[] {
  const out: SpineItem[] = []
  const inRange = (iso: string) => !!iso && iso >= range.from && iso <= range.to
  // 先剪枝再展開：節奏展開是這裡最貴的一段，不該為了取幾筆 event 而全跑一遍。
  const wantsRef = (t: SpineRefType) => !filters?.refTypes || filters.refTypes.includes(t)
  const wantsTrack = (t: SpineTrack) => !filters?.tracks || filters.tracks.includes(t)
  const wantsScope = (s?: string) =>
    !filters?.scopes || !s || filters.scopes.includes(s as 'company' | 'personal')
  const wantsKind = (k?: string) =>
    !filters?.rhythmKinds || filters.rhythmKinds.includes((k || 'ritual') as 'ritual' | 'admin')

  /* --- legacy events：T2 遷移完成後這個集合會空掉，屆時此段自然停用 --- */
  for (const e of wantsRef('event') ? store.events || [] : []) {
    if (!inRange(e.d)) continue
    const track = LAYER_TRACK[e.layer] || 'occasion'
    if (!wantsTrack(track)) continue
    out.push({
      key: `ev:${e.id}`,
      track,
      refType: 'event',
      refId: e.id,
      date: e.d,
      title: e.t,
      sub: e.layer,
      actorIds: e.participants && e.participants.length ? e.participants.slice() : [],
      weight: e.star ? 3 : 2,
      state: stateFor(e.d, today, !!e.done),
      star: !!e.star,
      projectId: e.link || '',
      derivedFrom: e.derived || '',
      remind: e.remind || '',
    })
  }

  /* --- 專案軌 · 里程碑 --- */
  for (const m of wantsTrack('project') && wantsRef('milestone') ? store.milestones || [] : []) {
    if (!inRange(m.dueOn)) continue
    out.push({
      key: `ms:${m.id}`,
      track: 'project',
      refType: 'milestone',
      refId: m.id,
      date: m.dueOn,
      title: m.title,
      sub: m.accept || '',
      actorIds: [],
      weight: 3,
      state: stateFor(m.dueOn, today, m.state === 'done'),
      star: true,
      projectId: m.projectId,
      derivedFrom: m.derivedFrom || '',
      remind: m.remind || '',
    })
  }

  /* --- 專案軌 · 有到期日的工作（沒有到期日的工作只活在看板與樹狀圖） --- */
  for (const i of wantsTrack('project') && wantsRef('task') ? store.issues || [] : []) {
    const date = i.due || i.done || ''
    if (!inRange(date)) continue
    out.push({
      key: `tk:${i.id}`,
      track: 'project',
      refType: 'task',
      refId: i.id,
      date,
      title: i.t,
      sub: i.size || '',
      actorIds: i.owner ? [i.owner] : [],
      weight: 1,
      state: stateFor(date, today, i.st === 'Done'),
      star: false,
      projectId: i.p || '',
      derivedFrom: '',
      remind: '',
    })
  }

  /* --- 節奏軌 · 規則展開 + session 覆寫 --- */
  const sessions = store.sessions || []
  for (const r of wantsTrack('rhythm') && wantsRef('session') ? store.rhythms || [] : []) {
    if (r.active === false) continue
    if (!wantsScope(r.scope) || !wantsKind(r.kind)) continue
    const overrides = new Map<string, RhythmSession>()
    sessions
      .filter((s) => s.rhythmId === r.id)
      .forEach((s) => overrides.set(s.occurrenceDate, s))

    for (const date of expandRule(r.rrule, r.dtstart, range, r.until)) {
      const s = overrides.get(date)
      if (s && s.state === 'moved' && s.movedTo) continue // 本體移走，下面補
      let state: SpineState = 'planned'
      if (s) state = s.state === 'done' ? 'done' : 'skipped'
      else if (date < today) state = r.kind === 'admin' ? 'late' : 'missed'
      out.push(rhythmItem(r, date, date, state))
    }
    // 被改期的實例落在新日期上
    for (const s of sessions) {
      if (s.rhythmId !== r.id || s.state !== 'moved' || !s.movedTo) continue
      if (!inRange(s.movedTo)) continue
      out.push(
        rhythmItem(
          r,
          s.occurrenceDate,
          s.movedTo,
          s.movedTo < today ? (r.kind === 'admin' ? 'late' : 'missed') : 'planned',
        ),
      )
    }
  }

  /* --- 行政／活動軌 · 跨日展開 --- */
  for (const o of wantsTrack('occasion') && wantsRef('occasion') ? store.occasions || [] : []) {
    const end = o.endOn || o.onDate
    for (let d = o.onDate; d <= end; d = addDays(d, 1)) {
      if (!inRange(d)) continue
      out.push({
        key: `oc:${o.id}:${d}`,
        track: 'occasion',
        refType: 'occasion',
        refId: o.id,
        date: d,
        title: o.title,
        sub: o.cat,
        actorIds: (o.actorIds || []).slice(),
        weight: o.star ? 5 : 2,
        state: d < today ? 'done' : 'planned',
        star: !!o.star,
        projectId: o.projectId || '',
        derivedFrom: o.derivedFrom || '',
        remind: o.remind || '',
      })
    }
  }

  return applyFilters(out, filters).sort(
    (a, b) => a.date.localeCompare(b.date) || b.weight - a.weight || a.key.localeCompare(b.key),
  )
}

function rhythmItem(r: Rhythm, occurrenceDate: string, date: string, state: SpineState): SpineItem {
  return {
    key: `rh:${r.id}:${occurrenceDate}`,
    track: 'rhythm',
    refType: 'session',
    refId: `${r.id}|${occurrenceDate}`,
    date,
    title: occurrenceDate === date ? r.title : `${r.title}（改期）`,
    sub: r.timeOfDay || '',
    actorIds: (r.ownerIds || []).slice(),
    weight: r.kind === 'admin' ? 2 : 1,
    state,
    star: false,
    projectId: '',
    derivedFrom: r.derivedFrom || '',
    remind: r.remind || '',
  }
}

export function applyFilters(items: SpineItem[], filters?: SpineFilters): SpineItem[] {
  if (!filters) return items
  return items.filter((i) => {
    if (filters.tracks && !filters.tracks.includes(i.track)) return false
    if (filters.refTypes && !filters.refTypes.includes(i.refType)) return false
    if (filters.projectIds && i.projectId && !filters.projectIds.includes(i.projectId)) return false
    if (filters.actorIds && i.actorIds.length && !i.actorIds.some((a) => filters.actorIds!.includes(a)))
      return false
    return true
  })
}

/* ------------------------------------------------------------------ */
/* 衝期偵測（警示，不是禁止 —— 見 PLN-072 §2.4）                        */
/* ------------------------------------------------------------------ */

export interface Conflict {
  date: string
  kind: 'key-node-collision' | 'work-overload' | 'milestone-inside-occasion'
  message: string
  refs: string[]
}

export function detectConflicts(items: SpineItem[], store?: SpineStore): Conflict[] {
  const byDate = new Map<string, SpineItem[]>()
  items.forEach((i) => {
    const list = byDate.get(i.date) || []
    list.push(i)
    byDate.set(i.date, list)
  })

  const out: Conflict[] = []
  for (const [date, list] of [...byDate.entries()].sort()) {
    const keyNodes = list.filter(
      (i) => i.star && (i.refType === 'milestone' || i.refType === 'occasion' || i.refType === 'event'),
    )
    if (keyNodes.length > 1) {
      out.push({
        date,
        kind: 'key-node-collision',
        message: `同日有 ${keyNodes.length} 個關鍵節點：${keyNodes.map((i) => i.title).join('、')}。建議至少錯開一天。`,
        refs: keyNodes.map((i) => i.key),
      })
      continue
    }
    const openWork = list.filter((i) => i.track === 'project' && i.state !== 'done')
    if (openWork.length >= 4) {
      out.push({
        date,
        kind: 'work-overload',
        message: `同日堆了 ${openWork.length} 件未完成的專案工作，超過兩人一天能吃的量。`,
        refs: openWork.map((i) => i.key),
      })
    }
  }

  // 里程碑落在跨日活動（旅遊等）區間內
  for (const o of (store && store.occasions) || []) {
    const end = o.endOn || o.onDate
    if (end <= o.onDate) continue
    const inside = items.filter(
      (i) => i.refType === 'milestone' && i.date >= o.onDate && i.date <= end,
    )
    inside.forEach((m) =>
      out.push({
        date: m.date,
        kind: 'milestone-inside-occasion',
        message: `里程碑「${m.title}」落在「${o.title}」（${o.onDate} – ${end}）期間內。`,
        refs: [m.key, `oc:${o.id}:${o.onDate}`],
      }),
    )
  }

  return out
}

export function conflictsByDate(conflicts: Conflict[]): Record<string, Conflict[]> {
  const out: Record<string, Conflict[]> = {}
  conflicts.forEach((c) => {
    out[c.date] = out[c.date] || []
    out[c.date].push(c)
  })
  return out
}

/* ------------------------------------------------------------------ */
/* 聚合：heatmap 用                                                    */
/* ------------------------------------------------------------------ */

export interface AdherenceCell {
  weekStart: string
  expected: number
  done: number
  future: boolean
}

/** 節奏履行率 —— kind=admin 不計入（沒繳勞健保不是「節奏斷層」）。 */
export function rhythmAdherence(
  store: SpineStore,
  rhythm: Rhythm,
  weeks: string[],
  today: string,
): AdherenceCell[] {
  const sessions = (store.sessions || []).filter((s) => s.rhythmId === rhythm.id)
  return weeks.map((weekStart) => {
    const range = { from: weekStart, to: addDays(weekStart, 6) }
    const occ = expandRule(rhythm.rrule, rhythm.dtstart, range, rhythm.until)
    const done = occ.filter((d) =>
      sessions.some((s) => s.occurrenceDate === d && s.state === 'done'),
    ).length
    return {
      weekStart,
      expected: occ.length,
      done,
      future: occ.length > 0 && occ.every((d) => d >= today),
    }
  })
}

export function weekStarts(endWeekStart: string, count: number): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i--) out.push(addDays(endWeekStart, -7 * i))
  return out
}
