/**
 * time_spine 對帳（ARC-041 §3 · PLN-073 OPS-T22）。
 *
 *   npx tsx scripts/reconcile-time-spine.ts              # dry-run，只報告差異
 *   npx tsx scripts/reconcile-time-spine.ts --apply      # 一併修好
 *   npx tsx scripts/reconcile-time-spine.ts --workspace <id>
 *
 * 骨幹是衍生資料，由服務層單一 writer 維護。單一 writer 的代價是「漏寫」的可能，
 * 這支腳本就是那道防線：重算一次、與現況 diff，有差異就寫進 RPT 讓人看見。
 * 建議排程每晚一次，以及每次部署後跑一次。
 */
import fs from "node:fs"
import path from "node:path"

import { db } from "../src/lib/db"
import { reconcileWorkspace, type ReconcileDiff } from "../src/lib/services/operating-spine.service"

const apply = process.argv.includes("--apply")
const wsFlag = process.argv.indexOf("--workspace")
const only = wsFlag >= 0 ? process.argv[wsFlag + 1] : null

const workspaces = only
  ? [{ id: only, name: only }]
  : await db.workspace.findMany({ select: { id: true, name: true } })

const report: Array<{ workspace: string; name: string; diff: ReconcileDiff }> = []
let drift = 0

for (const ws of workspaces) {
  const diff = await reconcileWorkspace(ws.id, apply)
  const n = diff.missing.length + diff.stale.length + diff.wrong.length
  drift += n
  report.push({ workspace: ws.id, name: ws.name, diff })
  console.log(
    `${ws.name}: 缺 ${diff.missing.length} · 多 ${diff.stale.length} · 欄位不符 ${diff.wrong.length}` +
      (apply && n ? "（已修正）" : ""),
  )
  diff.missing.slice(0, 5).forEach((d) => console.log(`   缺 ${d.refTable} ${d.refId} ${d.onDate}`))
  diff.stale.slice(0, 5).forEach((d) => console.log(`   多 ${d.refTable} ${d.refId} ${d.onDate}`))
  diff.wrong.slice(0, 5).forEach((d) => console.log(`   ≠ ${d.refTable} ${d.refId} ${d.onDate} · ${d.field}`))
}

const out = "docs/2_agent-input/generated/operating-transfer"
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(
  path.join(out, "time-spine-reconcile.json"),
  JSON.stringify({ at: new Date().toISOString(), apply, drift, report }, null, 1),
)

await db.$disconnect()

if (drift && !apply) {
  console.error(`FAIL time_spine 與來源漂移 ${drift} 筆 —— 用 --apply 修正，並查為什麼 writer 漏寫`)
  process.exit(1)
}
console.log(apply ? `PASS time_spine 已對齊（修正 ${drift} 筆）` : "PASS time_spine 與來源一致")
