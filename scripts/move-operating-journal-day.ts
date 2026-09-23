/**
 * 把某一天的日誌內容整天搬到另一天（YZUI-016 的一次性收尾）。
 *
 * 為什麼需要這支：工作台的「今天」原本固定是 fixture 的 `2026-09-12`
 * （`v5-seed` 的 `today` 在 database 模式沒有被換掉）。所以在修好之前寫的所有東西
 * ——日誌、今日脈絡、今日議題、當天誕生的文件物件、請求、留言——不管實際是哪一天寫的，
 * 全部被歸在那一天。日期修好之後，那些內容會停在 2026-09-12，今天則是空白的。
 *
 * 這支把那一天整批改掛到指定的日期。只動「日期來自工作台的今天」的那幾張表；
 * 交易、場合、節奏那些日期是使用者自己填的，一律不碰。
 *
 *   pnpm ops:move-day                                  # dry run，印出會動到什麼
 *   pnpm ops:move-day -- --apply                       # 真的搬
 *   pnpm ops:move-day -- --from 2026-09-12 --to 2026-09-24 --apply
 *
 * 預設 from 是 2026-09-12（fixture 的那一天），to 是台北時間的今天。
 */
// 這一行必須在 db 之前：src/lib/db 在載入時就讀 DATABASE_URL。
import "./load-local-env"

import { db } from "../src/lib/db"
import { operatingToday } from "../src/lib/ui-data/yuanzhan/v5-state"

const argv = process.argv.slice(2)
const apply = argv.includes("--apply")

function arg(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`)
  const value = at >= 0 ? argv[at + 1] : undefined
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
}

const FROM = arg("from", "2026-09-12")
const TO = arg("to", operatingToday())

/** `@db.Date` 欄位一律用當天的 UTC 零點，與寫入端 `toDateOnly()` 同一個約定。 */
function dateOnly(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

async function main() {
  if (FROM === TO) {
    console.error(`from 與 to 是同一天（${FROM}），沒有東西要搬。`)
    process.exit(1)
  }

  // 這支會改正式資料。打到哪個資料庫必須是看得見的事，不是從環境變數推測出來的。
  const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  console.log(`target: ${target ? target.host + target.pathname : "(DATABASE_URL 未設定)"}`)
  console.log(`move:   ${FROM}  →  ${TO}${apply ? "" : "   (dry run，加 --apply 才會真的寫)"}\n`)

  const { OPERATING_WORKSPACE_SLUG } = await import("../src/lib/services/operating-commands.service")
  const ws = await db.workspace.findUnique({ where: { slug: OPERATING_WORKSPACE_SLUG }, select: { id: true } })
  if (!ws) {
    console.error(`workspace "${OPERATING_WORKSPACE_SLUG}" not found`)
    process.exit(1)
  }
  const workspaceId = ws.id
  const from = dateOnly(FROM)
  const to = dateOnly(TO)

  /* ── 日誌：一個作者一天一列，所以目標日已經有列時要合併，不能直接改日期 ── */
  const journalRows = await db.operatingJournalEntry.findMany({ where: { workspaceId, onDate: from } })
  const journalTargets = await db.operatingJournalEntry.findMany({ where: { workspaceId, onDate: to } })
  const targetByAuthor = new Map(journalTargets.map((row) => [row.authorId, row]))

  const merges: Array<{ authorId: string; sourceBlocks: number; targetBlocks: number }> = []
  const moves: string[] = []
  for (const row of journalRows) {
    const existing = targetByAuthor.get(row.authorId)
    const blocks = Array.isArray(row.blocks) ? row.blocks : []
    if (existing) {
      const targetBlocks = Array.isArray(existing.blocks) ? existing.blocks : []
      merges.push({ authorId: row.authorId, sourceBlocks: blocks.length, targetBlocks: targetBlocks.length })
    } else {
      moves.push(row.authorId)
    }
  }
  console.log(`日誌      搬 ${moves.length} 列、合併 ${merges.length} 列`)
  for (const m of merges) {
    console.log(`          合併：作者 ${m.authorId.slice(0, 8)}… 的 ${m.sourceBlocks} 段接在目標日既有的 ${m.targetBlocks} 段後面`)
  }

  /* ── 其餘都是一天多列，直接改日期 ── */
  const counts = {
    dayLogs: await db.operatingDayLog.count({ where: { workspaceId, onDate: from } }),
    todayIssues: await db.operatingTodayIssue.count({ where: { workspaceId, onDate: from } }),
    docObjects: await db.operatingDocObject.count({ where: { workspaceId, onDate: from } }),
    requests: await db.operatingRequest.count({ where: { workspaceId, onDate: from } }),
  }
  console.log(`今日脈絡  ${counts.dayLogs} 列`)
  console.log(`今日議題  ${counts.todayIssues} 列`)
  console.log(`文件物件  ${counts.docObjects} 列`)
  console.log(`請求      ${counts.requests} 列`)

  /* ── 留言：日期藏在 meta.day 與整頁留言的 target_ref 裡 ── */
  const comments = await db.operatingComment.findMany({ where: { workspaceId, deletedAt: null } })
  const pageRef = (day: string) => `team:page:${day}`
  const commentsToTouch = comments.filter((row) => {
    const meta = (row.meta ?? {}) as Record<string, unknown>
    return meta.day === FROM || row.targetRef === pageRef(FROM)
  })
  console.log(`留言      ${commentsToTouch.length} 列（meta.day 與整頁留言的 target_ref）\n`)

  if (!apply) {
    console.log("dry run 結束。確認以上數字之後，加 --apply 再跑一次。")
    await db.$disconnect()
    return
  }

  // 一個交易包住全部：搬到一半失敗的話，資料會散在兩天上，比沒搬還難處理。
  await db.$transaction(async (tx) => {
    for (const row of journalRows) {
      const existing = targetByAuthor.get(row.authorId)
      if (!existing) {
        await tx.operatingJournalEntry.update({ where: { id: row.id }, data: { onDate: to } })
        continue
      }
      const targetBlocks = Array.isArray(existing.blocks) ? existing.blocks : []
      const sourceBlocks = Array.isArray(row.blocks) ? row.blocks : []
      await tx.operatingJournalEntry.update({
        where: { id: existing.id },
        data: { blocks: [...targetBlocks, ...sourceBlocks] },
      })
      await tx.operatingJournalEntry.delete({ where: { id: row.id } })
    }

    await tx.operatingDayLog.updateMany({ where: { workspaceId, onDate: from }, data: { onDate: to } })
    await tx.operatingTodayIssue.updateMany({ where: { workspaceId, onDate: from }, data: { onDate: to } })
    await tx.operatingDocObject.updateMany({ where: { workspaceId, onDate: from }, data: { onDate: to } })
    await tx.operatingRequest.updateMany({ where: { workspaceId, onDate: from }, data: { onDate: to } })

    for (const row of commentsToTouch) {
      const meta = (row.meta ?? {}) as Record<string, unknown>
      await tx.operatingComment.update({
        where: { id: row.id },
        data: {
          meta: { ...meta, ...(meta.day === FROM ? { day: TO } : {}) },
          ...(row.targetRef === pageRef(FROM) ? { targetRef: pageRef(TO) } : {}),
        },
      })
    }
  })

  console.log(`已搬完 ${FROM} → ${TO}。重新整理工作台就會看到內容掛在 ${TO}。`)
  await db.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await db.$disconnect()
  process.exit(1)
})
