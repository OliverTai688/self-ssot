/**
 * 把「日誌列不見了、但當天的物件還在」的那幾天補回來（2026-10-06 事故的收尾）。
 *
 * 為什麼需要這支：2026-10-06 00:21 正式站一筆自動保存刪掉了 Lily 的五天日誌
 * （切到個人空間時，前端拿空的那一本去比對，見 scripts/check-journal-space-switch.ts）。
 * 被刪的是 operating_journal_entries 的列；她寫在 Standup／會議物件裡的字存在
 * operating_doc_objects，一個字都沒少 —— 只是日誌裡嵌著它們的那一行跟著列一起消失，
 * 所以那幾天看起來是空的。
 *
 * 這支只做一件事：某位作者在某一天有物件、卻沒有日誌列時，補一列回去，
 * 內容是依建立順序嵌回那幾個物件，後面留一行空白可以繼續寫。
 *
 * 它**救不回**直接打在日誌上、不在物件裡的字：那些只存在被刪掉的列裡。
 * 它**不會動**任何已經存在的日誌列 —— 有列的那一天整天跳過，不合併、不覆寫。
 *
 *   pnpm ops:restore-journal-shells -- --author lily           # dry run，印出會補什麼
 *   pnpm ops:restore-journal-shells -- --author lily --apply   # 真的寫
 *
 * 可以重跑：補過的那一天已經有列，第二次就會跳過。
 */
// 這一行必須在 db 之前：src/lib/db 在載入時就讀 DATABASE_URL。
import "./load-local-env"

import { db } from "../src/lib/db"

const argv = process.argv.slice(2)
const apply = argv.includes("--apply")
const authorAt = argv.indexOf("--author")
const AUTHOR = authorAt >= 0 ? argv[authorAt + 1] : undefined

const iso = (date: Date) => date.toISOString().slice(0, 10)

async function main() {
  if (!AUTHOR || AUTHOR.startsWith("--")) {
    console.error("請指定席位：--author lily（或 yz）")
    process.exit(1)
  }

  // 這支會改正式資料。打到哪個資料庫必須是看得見的事，不是從環境變數推測出來的。
  const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  console.log(`target: ${target ? target.host + target.pathname : "(DATABASE_URL 未設定)"}`)
  console.log(`author: ${AUTHOR}${apply ? "" : "   (dry run，加 --apply 才會真的寫)"}\n`)

  const { OPERATING_WORKSPACE_SLUG } = await import("../src/lib/services/operating-commands.service")
  const ws = await db.workspace.findUnique({ where: { slug: OPERATING_WORKSPACE_SLUG }, select: { id: true } })
  if (!ws) {
    console.error(`workspace "${OPERATING_WORKSPACE_SLUG}" not found`)
    process.exit(1)
  }
  const workspaceId = ws.id

  // 席位 → Profile：用「一直以這個席位寫入的那個帳號」來認，而不是另外推導一次。
  // 日誌列的 author_id 就是當初這些命令帶進來的 profileId，兩邊一定對得上。
  const writers = await db.operatingCommandLog.groupBy({
    by: ["actorProfileId"],
    where: { workspaceId, actorKey: AUTHOR, actorProfileId: { not: null } },
    _count: true,
  })
  if (writers.length !== 1 || !writers[0].actorProfileId) {
    console.error(`席位 ${AUTHOR} 對到 ${writers.length} 個帳號，無法確定是誰的日誌，不動。`)
    process.exit(1)
  }
  const authorId = writers[0].actorProfileId
  console.log(`profile: ${authorId.slice(0, 8)}…（${writers[0]._count} 筆命令紀錄）\n`)

  // 連結物件與文件物件同一張表（kind = 'link'），但嵌進日誌的型別不同，這裡不處理。
  const objects = await db.operatingDocObject.findMany({
    where: { workspaceId, authorKey: AUTHOR, onDate: { not: null }, kind: { not: "link" }, workbenchRef: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { workbenchRef: true, kind: true, title: true, onDate: true, createdAt: true },
  })
  const byDay = new Map<string, typeof objects>()
  for (const object of objects) {
    const day = iso(object.onDate!)
    byDay.set(day, [...(byDay.get(day) ?? []), object])
  }

  const existing = await db.operatingJournalEntry.findMany({
    where: { workspaceId, authorId },
    select: { onDate: true },
  })
  const hasEntry = new Set(existing.map((row) => iso(row.onDate)))

  const plan: Array<{ day: string; blocks: Array<Record<string, unknown>> }> = []
  for (const [day, list] of [...byDay].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (hasEntry.has(day)) {
      console.log(`${day}  已有日誌列，跳過（${list.length} 個物件）`)
      continue
    }
    const tag = day.slice(5).replace("-", "")
    const blocks: Array<Record<string, unknown>> = list.map((object, index) => ({
      id: `blkr${index + 1}_${tag}`,
      t: "obj",
      ind: 0,
      obj: { ty: "doc_object", rid: object.workbenchRef, bornAt: object.createdAt.getTime() },
    }))
    // 後面留一行空白：日誌的最後一段是物件時，游標沒有地方可以落。
    blocks.push({ id: `blkr${list.length + 1}_${tag}`, t: "p", ind: 0, text: "" })
    plan.push({ day, blocks })
    console.log(`${day}  補一列，嵌回 ${list.length} 個物件：${list.map((o) => `${o.workbenchRef}（${o.kind}）`).join("、")}`)
  }

  console.log(`\n要補 ${plan.length} 天。`)
  if (!plan.length) return

  if (!apply) {
    console.log("dry run 結束。確認以上內容之後，加 --apply 再跑一次。")
    return
  }

  // 一個交易包住全部；用 createMany + skipDuplicates，跑的同時有人剛好寫了那一天也不會被蓋掉。
  const result = await db.$transaction((tx) =>
    tx.operatingJournalEntry.createMany({
      data: plan.map(({ day, blocks }) => ({
        workspaceId,
        authorId,
        onDate: new Date(`${day}T00:00:00.000Z`),
        title: day,
        blocks: blocks as never,
        visibility: "company",
      })),
      skipDuplicates: true,
    }),
  )
  console.log(`已補 ${result.count} 列。`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
