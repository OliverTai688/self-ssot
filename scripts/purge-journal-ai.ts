/**
 * 日誌 AI：清掉軟刪除超過 30 天的對話（RES-037 D6）。正式環境由 Vercel Cron 每天跑
 * `/api/cron/journal-ai-purge`；這支給本機或手動補跑用。
 *
 * 預設 dry run：只列出有幾個到期。確認過再加 --apply。
 *
 *   pnpm ops:ai:purge             # 只列出
 *   pnpm ops:ai:purge -- --apply  # 真的刪（訊息跟著刪；附件檔案不動）
 */
// 這一行必須在 db 之前：src/lib/db 在載入時就讀 DATABASE_URL。
import "./load-local-env"
import { purgeDeletedSessions } from "../src/lib/services/operating-ai.service"

const apply = process.argv.includes("--apply")

async function main() {
  const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  console.log(`target: ${target ? target.host + target.pathname : "(DATABASE_URL 未設定)"}`)
  const result = await purgeDeletedSessions({ apply })
  console.log(`刪除時間早於 ${result.before} 的對話：${result.due} 個${apply ? `，已刪除 ${result.deleted} 個` : "（dry run，加 --apply 才會刪）"}`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
