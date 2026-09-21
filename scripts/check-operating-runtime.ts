/**
 * 轉移期間的無瀏覽器回歸檢查（PLN-073）。
 *
 *   npx tsx scripts/check-operating-runtime.ts
 *     → 兩種資料模式各走訪全部模組分頁，斷言沒有 runtime 錯誤、沒有 NaN/Infinity。
 *
 *   npx tsx scripts/check-operating-runtime.ts --baseline <path-to-runtime.js>
 *     → 額外與一份基準 runtime 逐頁比對純文字。T1/T2 的完成條件就是這裡 0 diff。
 *
 * 基準檔放在 docs/2_agent-input/generated/operating-transfer/runtime.baseline.js。
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { diffSnapshots, mountAll, type PageSnapshot } from './operating-runtime-harness'

const args = process.argv.slice(2)
const baselineFlag = args.indexOf('--baseline')
const baselinePath = baselineFlag >= 0 ? args[baselineFlag + 1] : ''
const writeSnapshots = args.includes('--write-snapshots')
const outDir = 'docs/2_agent-input/generated/operating-transfer'

const modes: Array<'showcase' | 'empty'> = ['showcase', 'empty']
let failed = 0

for (const mode of modes) {
  const current = await mountAll(mode)
  const suspicious = current.pages.filter((p) => /\bNaN\b|\bInfinity\b/.test(p.text))

  const parts = [
    `${mode}: 模組 ${new Set(current.pages.map((p) => p.wb)).size}`,
    `分頁 ${current.pages.length}`,
    `錯誤 ${current.errors.length}`,
    `可疑數值 ${suspicious.length}`,
  ]

  if (baselinePath) {
    const abs = pathToFileURL(path.resolve(baselinePath)).href
    const base = await mountAll(mode, abs)
    const diffs = diffSnapshots(base.pages, current.pages)
    parts.push(`與基準差異 ${diffs.length}`)
    if (diffs.length) {
      failed++
      diffs.slice(0, 8).forEach((d) => {
        console.log(`  ✗ ${d.key} ${d.reason}`)
        if (d.base != null) {
          console.log(`     基準 …${d.base}…`)
          console.log(`     現況 …${d.next}…`)
        }
      })
    }
  }

  console.log(parts.join(' · '))
  current.errors.slice(0, 5).forEach((e) => console.log('  ERR', e.slice(0, 200)))
  if (current.errors.length || suspicious.length) failed++
  suspicious.slice(0, 5).forEach((p) => console.log('  ?? ', p.wb, p.tab, p.text.slice(0, 100)))

  if (writeSnapshots) {
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(
      path.join(outDir, `snapshot-${mode}.json`),
      JSON.stringify(current.pages satisfies PageSnapshot[], null, 1),
    )
  }
}

if (failed) {
  console.error('FAIL operating runtime regression')
  process.exit(1)
}
console.log('PASS operating runtime · 雙模式全分頁可渲染、無 runtime 錯誤' + (baselinePath ? '、與基準逐頁一致' : ''))
process.exit(0)
