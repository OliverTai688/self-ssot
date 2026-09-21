/**
 * 事件分流的 dry-run 報告（PLN-073 OPS-T05）。
 *
 *   npx tsx scripts/migrate-v5-events-to-tracks.ts            # 印出報告
 *   npx tsx scripts/migrate-v5-events-to-tracks.ts --write    # 另存 markdown 供確認
 *
 * 這個腳本**不寫入任何資料**。三軌是在 createV5State() 時由 operating-tracks-seed
 * 依同一套規則即時產生的，所以「確認」的意思是：看過這張表、同意這些判定，
 * 不同意的就去改 operating-events-migration.ts 的規則，而不是手改資料。
 */
import fs from 'node:fs'
import path from 'node:path'
import { createV5State } from '../src/lib/ui-data/yuanzhan/v5-state'
import { buildOperatingTracks } from '../src/lib/ui-data/yuanzhan/operating-tracks-seed'
import { summarize, type TrackDecision } from '../src/lib/ui-data/yuanzhan/operating-events-migration'

const LABEL: Record<TrackDecision, string> = {
  milestone: '專案軌 · 里程碑',
  'rhythm-ritual': '節奏軌 · 節奏（ritual）',
  'rhythm-admin': '節奏軌 · 行政週期（admin）',
  occasion: '行政／活動軌 · 一次性',
}

const data = createV5State('showcase').data
const tracks = buildOperatingTracks(data)
const counts = summarize(tracks.report)

const lines: string[] = []
lines.push('# 時間線事件分流報告（dry-run）')
lines.push('')
lines.push(`來源：showcase seed · ${tracks.report.length} 筆事件`)
lines.push('')
lines.push('## 判定總覽')
lines.push('')
lines.push('| 去向 | 筆數 |')
lines.push('|---|---|')
;(Object.keys(counts) as TrackDecision[]).forEach((k) => lines.push(`| ${LABEL[k]} | ${counts[k]} |`))
lines.push('')
lines.push('## 逐筆判定')
lines.push('')
lines.push('| # | 事件 | 日期 | layer | 去向 | 理由 | 待確認 |')
lines.push('|---|---|---|---|---|---|---|')
tracks.report.forEach((r, i) => {
  lines.push(
    `| ${i + 1} | ${r.title} | ${r.date} | ${r.layer} | ${LABEL[r.decision]}${r.rrule ? ` \`${r.rrule}\`` : ''} | ${r.reason} | ${r.needsReview ? '**是**' : '—'} |`,
  )
})
lines.push('')
lines.push('## 由 delivery[] 轉成的里程碑（日期待補）')
lines.push('')
lines.push('| 專案 | 里程碑 | 日期 |')
lines.push('|---|---|---|')
tracks.milestones
  .filter((m) => !m.dueOn)
  .forEach((m) => lines.push(`| ${m.projectId} | ${m.title} | _待補_ |`))
lines.push('')
lines.push('> 日期留空的里程碑**不會**出現在日曆上。填了日期才進 time_spine —— 刻意不猜。')
lines.push('')
lines.push('## 產出的三軌集合')
lines.push('')
lines.push(
  `- 里程碑 ${tracks.milestones.length}（其中 ${tracks.milestones.filter((m) => !m.dueOn).length} 筆日期待補）`,
)
lines.push(`- 節奏 ${tracks.rhythms.length}（ritual ${tracks.rhythms.filter((r) => r.kind === 'ritual').length} / admin ${tracks.rhythms.filter((r) => r.kind === 'admin').length}）`)
lines.push(`- 活動 ${tracks.occasions.length}`)
lines.push(`- 節奏實例 ${tracks.sessions.length}（不預先產生，由 RRULE 查詢期展開）`)
lines.push('')
lines.push('## 帶 derivedFrom 的紀錄（不可編輯／刪除）')
lines.push('')
lines.push('| 去向 | 標題 | 來源 |')
lines.push('|---|---|---|')
;[
  ...tracks.milestones.map((m) => ['里程碑', m.title, m.derivedFrom] as const),
  ...tracks.rhythms.map((r) => ['節奏', r.title, r.derivedFrom] as const),
  ...tracks.occasions.map((o) => ['活動', o.title, o.derivedFrom] as const),
]
  .filter(([, , d]) => !!d)
  .forEach(([kind, title, d]) => lines.push(`| ${kind} | ${title} | ${d} |`))

const report = lines.join('\n') + '\n'
console.log(report)

if (process.argv.includes('--write')) {
  const out = 'docs/2_agent-input/generated/operating-transfer'
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'event-migration-dry-run.md'), report)
  console.log(`\n→ 已寫入 ${out}/event-migration-dry-run.md`)
}
