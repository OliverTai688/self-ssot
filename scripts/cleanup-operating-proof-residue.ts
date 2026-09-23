/**
 * 清掉早期整合測試留在正式資料庫裡的列（PLN-074 M7）。
 *
 * 那幾輪測試是對正式庫跑的 —— 護欄當時比對整串 URL，換一個變數名（DIRECT_DATABASE_URL）
 * 就繞過去了。護欄已經改成比對主機＋資料庫名，但已經寫進去的列要自己清。
 *
 * 預設是 dry run：先把要刪的列印出來，確認過再加 --apply。
 * 刪除條件寫死成一份明確的 id 清單，不用任何萬用字元 —— 正式資料庫不是用 LIKE 的地方。
 *
 *   pnpm ops:cleanup-residue            # 只列出
 *   pnpm ops:cleanup-residue -- --apply # 真的刪
 */
// 這一行必須在 db 之前：src/lib/db 在載入時就讀 DATABASE_URL，
// 順序反過來的話它會拿到 undefined，然後對「沒有位址」發連線。
import "./load-local-env"

// 用 app 自己的 client，不自己 new 一個：Prisma 7 需要 adapter（PrismaPg + pg Pool），
// 而那份設定已經在 src/lib/db 裡。重造一個只會多一份會走樣的設定。
import { db } from "../src/lib/db"

const apply = process.argv.includes("--apply")

/** 由驗收當下實際讀到的 store 逐筆確認過，不是推測。 */
const RESIDUE = {
  txns: ["T-RT", "T-RT-1790169880300", "TXN-001"],
  goals: ["G-RT-1790169880300"],
  occasions: ["OCC-RT", "OCC-RT-1790169880300"],
  /** 整合測試寫的兩天；2026-09-12 是驗收時打字那天，只清內容不刪列。 */
  journalDays: ["2026-10-02", "2026-10-18"],
  journalToClear: ["2026-09-12"],
}

async function main() {
  // 這支會刪正式資料。打到哪個資料庫必須是看得見的事，而不是從環境變數推測出來的。
  const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  console.log(`target: ${target ? target.host + target.pathname : "(DATABASE_URL 未設定)"}\n`)

  const { OPERATING_WORKSPACE_SLUG } = await import("../src/lib/services/operating-commands.service")
  const ws = await db.workspace.findUnique({ where: { slug: OPERATING_WORKSPACE_SLUG }, select: { id: true } })
  if (!ws) {
    console.error(`workspace "${OPERATING_WORKSPACE_SLUG}" not found`)
    process.exit(1)
  }
  const workspaceId = ws.id

  const found = {
    txns: await db.operatingTransaction.findMany({
      where: { workspaceId, workbenchRef: { in: RESIDUE.txns } },
      select: { workbenchRef: true, title: true, amount: true },
    }),
    goals: await db.operatingGoal.findMany({
      where: { workspaceId, workbenchRef: { in: RESIDUE.goals } },
      select: { workbenchRef: true, title: true },
    }),
    occasions: await db.occasion.findMany({
      where: { workspaceId, workbenchRef: { in: RESIDUE.occasions } },
      select: { workbenchRef: true, title: true },
    }),
    journal: await db.operatingJournalEntry.findMany({
      where: { workspaceId, onDate: { in: RESIDUE.journalDays.map((d) => new Date(`${d}T00:00:00.000Z`)) } },
      select: { onDate: true, title: true },
    }),
  }

  console.log(apply ? "deleting:" : "would delete (dry run):")
  for (const t of found.txns) console.log(`  txn       ${t.workbenchRef}  ${t.title}  ${t.amount}`)
  for (const g of found.goals) console.log(`  goal      ${g.workbenchRef}  ${g.title}`)
  for (const o of found.occasions) console.log(`  occasion  ${o.workbenchRef}  ${o.title}`)
  for (const j of found.journal) console.log(`  journal   ${j.onDate.toISOString().slice(0, 10)}  ${j.title ?? ""}`)
  for (const d of RESIDUE.journalToClear) console.log(`  journal   ${d}  (blocks cleared, row kept)`)

  if (!apply) {
    console.log("\n確認無誤後加 --apply 真的執行。")
    return
  }

  await db.operatingTransaction.deleteMany({ where: { workspaceId, workbenchRef: { in: RESIDUE.txns } } })
  await db.operatingGoal.deleteMany({ where: { workspaceId, workbenchRef: { in: RESIDUE.goals } } })
  await db.occasion.deleteMany({ where: { workspaceId, workbenchRef: { in: RESIDUE.occasions } } })
  await db.operatingJournalEntry.deleteMany({
    where: { workspaceId, onDate: { in: RESIDUE.journalDays.map((d) => new Date(`${d}T00:00:00.000Z`)) } },
  })
  // 驗收那天的日誌是真的一天，只把測試留下的文字清掉，不刪整列。
  await db.operatingJournalEntry.updateMany({
    where: { workspaceId, onDate: { in: RESIDUE.journalToClear.map((d) => new Date(`${d}T00:00:00.000Z`)) } },
    data: { blocks: [] },
  })

  console.log("\ndone.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
    // PrismaPg 拿的是外部的 pg Pool，$disconnect 不會把 socket 全關掉，
    // 所以這裡明確結束行程，否則腳本跑完會掛著不退。
    process.exit(process.exitCode ?? 0)
  })
