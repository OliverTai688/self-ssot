/**
 * 清掉沒有人指得到的 R2 物件（日誌檔案物件 P0）。
 *
 * 孤兒是這樣長出來的：伺服器先建列、再發預簽網址，使用者在 PUT 完成之前關掉分頁。
 * R2 可能已經有 bytes，DB 那一列卻永遠停在 uploading。一列孤兒不痛，
 * 累積一年之後就是一筆算不出來、也刪不掉的儲存費 —— 因為那時已經沒有人知道
 * 哪些 key 是垃圾、哪些是真的檔案。所以這支必須與 P0 一起上，不能延後。
 *
 * 判準只有一條（與 operating-assets.ts 的 isOrphanCandidate 同一條）：
 * status 仍是 uploading，且超過 24 小時沒有更新。ready 與 failed 永遠不動。
 *
 * 預設 dry run：先把要動的列印出來，確認過再加 --apply。
 *
 *   pnpm ops:assets:cleanup             # 只列出
 *   pnpm ops:assets:cleanup -- --apply  # 真的刪 R2 物件並標 failed
 *
 * 必須在本機跑：Cowork 沙箱連不到 Supabase pooler 的 6543 埠，
 * 也連不到 R2（egress 白名單）。
 */
// 這一行必須在 db 之前：src/lib/db 在載入時就讀 DATABASE_URL。
import "./load-local-env"
import { db } from "../src/lib/db"
import { deleteObject, headObject } from "../src/lib/storage/object-head"
import { ORPHAN_AFTER_MS, isOrphanCandidate } from "../src/lib/ui-data/yuanzhan/operating-assets"

const apply = process.argv.includes("--apply")

async function main() {
  const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  console.log(`target: ${target ? target.host + target.pathname : "(DATABASE_URL 未設定)"}`)
  console.log(apply ? "mode:   APPLY（會刪 R2 物件並寫入 DB）\n" : "mode:   dry run（只列出）\n")

  const now = new Date()
  const rows = await db.operatingAsset.findMany({
    where: { status: "uploading", updatedAt: { lt: new Date(now.getTime() - ORPHAN_AFTER_MS) } },
    orderBy: { updatedAt: "asc" },
  })

  const stale = rows.filter((row) => isOrphanCandidate(row, now))
  if (stale.length === 0) {
    console.log("沒有孤兒。")
    return
  }

  let withBytes = 0
  for (const row of stale) {
    const age = Math.floor((now.getTime() - row.updatedAt.getTime()) / 3_600_000)
    // 先問 R2 這個 key 到底有沒有 bytes：沒有的話只要把那一列標 failed 就好，
    // 不必也不該發一次刪除請求。
    const head = await headObject(row.bucket, row.objectKey)
    if (head) withBytes += 1
    console.log(
      `${row.refCode}  ${row.displayName}  ${age}h  ${head ? head.bytes + " bytes 在 R2" : "R2 沒有 bytes"}`
    )

    if (!apply) continue
    if (head) await deleteObject(row.bucket, row.objectKey)
    await db.operatingAsset.update({ where: { id: row.id }, data: { status: "failed" } })
  }

  console.log(
    `\n${stale.length} 列孤兒，其中 ${withBytes} 列在 R2 真的有 bytes。` +
      (apply ? "已刪除並標記 failed。" : "加 --apply 才會實際處理。")
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
