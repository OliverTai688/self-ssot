/**
 * time_spine 純函式層的回歸測試（PLN-073 OPS-T01 / OPS-T07）。
 *
 * 兩個角色：
 *   1. 驗證 RRULE 展開、覆寫語意、衝期規則本身正確；
 *   2. T2 的關鍵斷言 —— 三軌版 spine 對同一區間的輸出，必須與 legacy events/issues 版
 *      在「日期／標題／連結專案」三欄上一致。不一致就表示遷移漏掉了語意，不得進 T3。
 *
 * 跑法：npx tsx scripts/check-operating-spine.ts
 */
import assert from 'node:assert/strict'
import { createV5State } from '../src/lib/ui-data/yuanzhan/v5-state'
import {
  addDays,
  buildSpine,
  detectConflicts,
  expandRule,
  isoWeek,
  mondayOf,
  parseRule,
  rhythmAdherence,
  weekStarts,
  type SpineStore,
} from '../src/lib/ui-data/yuanzhan/operating-spine'

let checks = 0
const ok = (label: string, fn: () => void) => {
  fn()
  checks++
  if (process.env.SPINE_VERBOSE) console.log('  ✓', label)
}

/* ------------------------------------------------------------------ */
/* 1. RRULE 解析與展開                                                 */
/* ------------------------------------------------------------------ */

ok('parseRule 讀得懂 RFC 5545 子集', () => {
  const r = parseRule('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;UNTIL=20261231')
  assert.equal(r.freq, 'WEEKLY')
  assert.equal(r.interval, 2)
  assert.deepEqual(r.byday, ['TU', 'TH'])
  assert.equal(r.until, '2026-12-31')
})

ok('每週一到五（standup）', () => {
  const days = expandRule('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-09-01', {
    from: '2026-09-07',
    to: '2026-09-13',
  })
  assert.deepEqual(days, [
    '2026-09-07',
    '2026-09-08',
    '2026-09-09',
    '2026-09-10',
    '2026-09-11',
  ])
})

ok('雙週週二（1:1）只落在偶數週', () => {
  const days = expandRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU', '2026-09-01', {
    from: '2026-09-01',
    to: '2026-10-31',
  })
  assert.deepEqual(days, ['2026-09-01', '2026-09-15', '2026-09-29', '2026-10-13', '2026-10-27'])
})

ok('每月 31 號在短月自動退到當月最後一天', () => {
  const days = expandRule('FREQ=MONTHLY;BYMONTHDAY=31', '2026-01-31', {
    from: '2026-01-01',
    to: '2026-04-30',
  })
  assert.deepEqual(days, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
})

ok('dtstart 之前不展開、UNTIL 之後不展開', () => {
  const days = expandRule('FREQ=WEEKLY;BYDAY=MO', '2026-09-14', {
    from: '2026-09-01',
    to: '2026-10-31',
  }, '2026-09-28')
  assert.deepEqual(days, ['2026-09-14', '2026-09-21', '2026-09-28'])
})

ok('COUNT 生效', () => {
  const days = expandRule('FREQ=DAILY;COUNT=3', '2026-09-01', { from: '2026-09-01', to: '2026-12-31' })
  assert.equal(days.length, 3)
})

ok('日期工具', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01')
  assert.equal(mondayOf('2026-09-20'), '2026-09-14') // 週日 → 該週週一
  assert.equal(isoWeek('2026-09-21'), 39)
  assert.equal(weekStarts('2026-09-21', 3).length, 3)
})

/* ------------------------------------------------------------------ */
/* 2. 節奏覆寫語意                                                     */
/* ------------------------------------------------------------------ */

const TODAY = '2026-09-21'
const rhythmStore: SpineStore = {
  rhythms: [
    {
      id: 'RH1',
      title: '每日 Standup',
      kind: 'ritual',
      scope: 'company',
      ownerIds: ['yz', 'lily'],
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      dtstart: '2026-09-07',
      timeOfDay: '09:30',
    },
    {
      id: 'RH2',
      title: '勞健保繳費',
      kind: 'admin',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
      dtstart: '2026-09-15',
      derivedFrom: '法定',
    },
  ],
  sessions: [
    { rhythmId: 'RH1', occurrenceDate: '2026-09-07', state: 'done' },
    { rhythmId: 'RH1', occurrenceDate: '2026-09-08', state: 'skip' },
    { rhythmId: 'RH1', occurrenceDate: '2026-09-09', state: 'moved', movedTo: '2026-09-12' },
    // 2026-09-10 刻意沒有 session → 該跑沒跑 = missed（heatmap 紅格的來源）
  ],
}

ok('session 覆寫：done / skip / moved / missed 四種狀態', () => {
  const items = buildSpine(rhythmStore, { from: '2026-09-07', to: '2026-09-12' }, TODAY, {
    tracks: ['rhythm'],
  })
  const byDate = Object.fromEntries(items.map((i) => [i.date, i.state]))
  assert.equal(byDate['2026-09-07'], 'done')
  assert.equal(byDate['2026-09-08'], 'skipped')
  assert.equal(byDate['2026-09-10'], 'missed', '沒有 session 的過去實例必須是 missed')
  assert.equal(byDate['2026-09-12'], 'missed', '改期後的實例落在新日期')
  assert.equal(
    items.filter((i) => i.date === '2026-09-09').length,
    0,
    'moved 的原始日期不應再出現',
  )
})

ok('kind=admin 的過去實例是 late，不是節奏斷層', () => {
  const items = buildSpine(rhythmStore, { from: '2026-09-15', to: '2026-09-15' }, TODAY, {
    tracks: ['rhythm'],
  })
  const admin = items.find((i) => i.refId.startsWith('RH2|'))
  assert(admin, '每月 15 號的行政義務應該展開出來')
  assert.equal(admin!.state, 'late')
  assert.equal(admin!.derivedFrom, '法定')
})

ok('rhythmAdherence 不把未來週算成斷層', () => {
  const weeks = weekStarts(mondayOf(TODAY), 3)
  const cells = rhythmAdherence(rhythmStore, rhythmStore.rhythms![0], weeks, TODAY)
  assert.equal(cells.length, 3)
  assert(cells.every((c) => c.done <= c.expected))
})

/* ------------------------------------------------------------------ */
/* 3. 衝期偵測                                                         */
/* ------------------------------------------------------------------ */

ok('同日兩個關鍵節點會被警示', () => {
  const store: SpineStore = {
    milestones: [
      { id: 'MS1', projectId: 'P1', title: '主視覺定稿', dueOn: '2026-09-24', state: 'open' },
    ],
    occasions: [
      { id: 'OC1', title: '品牌日發表', cat: '公司活動', onDate: '2026-09-24', star: true },
    ],
  }
  const items = buildSpine(store, { from: '2026-09-01', to: '2026-09-30' }, TODAY)
  const conflicts = detectConflicts(items, store)
  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].kind, 'key-node-collision')
  assert.equal(conflicts[0].date, '2026-09-24')
})

ok('里程碑落在跨日活動區間內會被警示', () => {
  const store: SpineStore = {
    milestones: [{ id: 'MS2', projectId: 'P1', title: '交付', dueOn: '2026-09-27', state: 'open' }],
    occasions: [
      { id: 'OC2', title: '員工旅遊', cat: '旅遊', onDate: '2026-09-26', endOn: '2026-09-28' },
    ],
  }
  const items = buildSpine(store, { from: '2026-09-01', to: '2026-09-30' }, TODAY)
  const kinds = detectConflicts(items, store).map((c) => c.kind)
  assert(kinds.includes('milestone-inside-occasion'))
})

/* ------------------------------------------------------------------ */
/* 4. 與 showcase seed 的等價性（T1 的核心斷言）                        */
/* ------------------------------------------------------------------ */

const showcase = createV5State('showcase').data as unknown as SpineStore
const empty = createV5State('empty').data as unknown as SpineStore
const WIDE = { from: '2020-01-01', to: '2030-12-31' }

ok('legacy events 一筆不漏地進 spine', () => {
  const items = buildSpine(showcase, WIDE, showcase.today || TODAY, { refTypes: ['event'] })
  assert.equal(items.length, (showcase.events || []).length)
  const titles = items.map((i) => i.title).sort()
  const expected = (showcase.events || []).map((e) => e.t).sort()
  assert.deepEqual(titles, expected)
})

ok('spineEvents 等價：依層級取事件的順序與舊寫法相同', () => {
  for (const layer of ['專案', '日常', '行政']) {
    const legacy = (showcase.events || []).filter((e) => e.layer === layer).map((e) => e.id)
    const viaSpine = buildSpine(showcase, WIDE, showcase.today || TODAY, { refTypes: ['event'] })
      .filter((i) => (showcase.events || []).find((e) => e.id === i.refId)!.layer === layer)
      .map((i) => i.refId)
    assert.deepEqual(viaSpine, legacy, `層級 ${layer} 的清單順序必須逐筆相同`)
  }
})

ok('spineForProject 等價：專案關鍵時間與舊寫法相同', () => {
  for (const p of (createV5State('showcase').data as { projects: Array<{ id: string }> }).projects) {
    const legacy = (showcase.events || []).filter((e) => e.link === p.id).map((e) => e.id)
    const viaSpine = buildSpine(showcase, WIDE, showcase.today || TODAY, {
      refTypes: ['event'],
      projectIds: [p.id],
    })
      .map((i) => i.refId)
      .filter((id) => (showcase.events || []).find((e) => e.id === id)!.link === p.id)
    assert.deepEqual(viaSpine.sort(), legacy.sort(), `專案 ${p.id} 的關鍵時間不一致`)
  }
})

ok('spineTasksOn 等價：某日到期／完成的工作與舊寫法相同', () => {
  const dates = new Set<string>()
  ;(showcase.issues || []).forEach((i) => {
    if (i.due) dates.add(i.due)
    if (i.done) dates.add(i.done)
  })
  for (const ds of dates) {
    const legacy = (showcase.issues || [])
      .filter((x) => (x.due || x.done) === ds)
      .map((x) => x.id)
      .sort()
    const viaSpine = buildSpine(showcase, { from: ds, to: ds }, showcase.today || TODAY, {
      refTypes: ['task'],
    })
      .map((i) => i.refId)
      .sort()
    assert.deepEqual(viaSpine, legacy, `${ds} 的工作到期清單不一致`)
  }
})

ok('empty 模式的 spine 是空的，不自動生成任何資料', () => {
  assert.equal(buildSpine(empty, WIDE, TODAY).length, 0)
  assert.equal(detectConflicts(buildSpine(empty, WIDE, TODAY), empty).length, 0)
})

ok('buildSpine 不改動輸入 store', () => {
  const before = JSON.stringify(showcase)
  buildSpine(showcase, WIDE, showcase.today || TODAY)
  assert.equal(JSON.stringify(showcase), before)
})


/* ------------------------------------------------------------------ */
/* 5. T2 的關鍵斷言：三軌遷移沒有弄丟任何語意                           */
/* ------------------------------------------------------------------ */

const tracksData = createV5State('showcase').data as unknown as SpineStore & {
  events: NonNullable<SpineStore['events']>
  projects: Array<{ id: string; delivery?: string[] }>
}
const TRACK_ONLY = ['milestone', 'task', 'session', 'occasion'] as const

ok('每一筆 legacy event 都在三軌裡找得到對應（同日期、同標題）', () => {
  const trackItems = buildSpine(tracksData, WIDE, tracksData.today || TODAY, {
    refTypes: [...TRACK_ONLY],
  })
  for (const e of tracksData.events) {
    const match = trackItems.filter((i) => i.date === e.d && i.title === e.t)
    assert(
      match.length > 0,
      `事件「${e.t}」（${e.d}）遷移後在三軌裡找不到對應 —— 遷移漏掉了語意，不得進 T3`,
    )
    if (e.link) {
      const withProject = match.find((i) => i.projectId === e.link)
      const isRhythm = match.every((i) => i.track === 'rhythm')
      assert(
        withProject || isRhythm,
        `事件「${e.t}」原本連結專案 ${e.link}，遷移後沒有保留`,
      )
    }
  }
})

ok('derivedFrom 跨三軌保留（合約推導的紀錄不可被誤判成可刪）', () => {
  const derived = tracksData.events.filter((e) => e.derived)
  assert(derived.length > 0, 'showcase 應該有帶 derived 的事件')
  const trackItems = buildSpine(tracksData, WIDE, tracksData.today || TODAY, {
    refTypes: [...TRACK_ONLY],
  })
  for (const e of derived) {
    const match = trackItems.find((i) => i.date === e.d && i.title === e.t)
    assert(match, `帶 derived 的事件「${e.t}」遷移後不見了`)
    assert.equal(match!.derivedFrom, e.derived, `「${e.t}」的 derivedFrom 沒有帶過去`)
  }
})

ok('kind=admin 的行政週期不算節奏斷層', () => {
  const rhythms = tracksData.rhythms || []
  const admin = rhythms.filter((r) => r.kind === 'admin')
  assert(admin.length > 0, '發薪日與勞健保應該被判為 admin')
  const past = { from: '2026-01-01', to: '2026-08-31' }
  for (const r of admin) {
    const items = buildSpine({ rhythms: [r] }, past, '2026-09-21', { tracks: ['rhythm'] })
    assert(
      items.every((i) => i.state !== 'missed'),
      `${r.title} 的過去實例不應該是 missed（那是節奏斷層的語意）`,
    )
  }
})

ok('日期待補的里程碑不進日曆', () => {
  const pending = (tracksData.milestones || []).filter((m) => !m.dueOn)
  assert(pending.length > 0, 'delivery[] 應該轉出幾筆待補里程碑')
  const items = buildSpine(tracksData, WIDE, tracksData.today || TODAY, {
    refTypes: ['milestone'],
  })
  pending.forEach((m) =>
    assert(
      !items.some((i) => i.refId === m.id),
      `里程碑「${m.title}」沒有日期，不應該出現在 spine`,
    ),
  )
})

ok('legacy 與三軌不會重複計算（refTypes 隔離）', () => {
  const legacyOnly = buildSpine(tracksData, WIDE, tracksData.today || TODAY, {
    refTypes: ['event'],
  })
  const trackOnly = buildSpine(tracksData, WIDE, tracksData.today || TODAY, {
    refTypes: [...TRACK_ONLY],
  })
  assert.equal(legacyOnly.length, tracksData.events.length)
  assert(trackOnly.every((i) => i.refType !== 'event'))
})

ok('empty 模式下三軌也是空的', () => {
  const e = createV5State('empty').data as unknown as SpineStore
  assert.equal((e.rhythms || []).length, 0)
  assert.equal((e.occasions || []).length, 0)
  assert.equal((e.milestones || []).length, 0)
  assert.equal(buildSpine(e, WIDE, TODAY).length, 0)
})

console.log(
  `PASS operating-spine · ${checks} checks · RRULE 子集、覆寫語意、衝期規則、legacy 等價、三軌遷移不失真`,
)
