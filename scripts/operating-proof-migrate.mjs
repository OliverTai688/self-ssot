/**
 * 把 schema 推上 proof 資料庫（PLN-074 M7）。
 *
 * 為什麼需要一支包裝而不是直接寫在文件裡：`prisma.config.ts` 的 datasource 是
 *
 *   url: process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"]
 *
 * 也就是 DIRECT_DATABASE_URL 優先。只覆蓋 DATABASE_URL 的指令會被 .env.local 裡
 * 那個指向正式庫的 DIRECT_DATABASE_URL 蓋過去，然後安靜地對正式庫執行並回報
 * 「No pending migrations」—— 看起來像成功，實際上 proof 庫一張表都沒建。
 *
 * 這支把兩個變數一起換掉，並在執行前把目標印出來，讓「打到哪裡」變成看得見的事。
 */
import { spawnSync } from "node:child_process"

// 同一個理由：不載入 .env.local，底下那個「是不是指向正式庫」的比對就沒有東西可比。
import { config } from "dotenv"
config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

const url = process.env.OPERATING_PROOF_DATABASE_URL

if (!url) {
  console.error("OPERATING_PROOF_DATABASE_URL is missing.\n")
  console.error("先起一個可拋棄的資料庫，再指向它：")
  console.error("  docker run -d --name operating-proof -e POSTGRES_PASSWORD=proof -p 5433:5432 postgres:16")
  console.error("  OPERATING_PROOF_DATABASE_URL=postgresql://postgres:proof@localhost:5433/postgres pnpm ops:proof:migrate")
  process.exit(1)
}

let target
try {
  target = new URL(url)
} catch {
  console.error("OPERATING_PROOF_DATABASE_URL is not a valid URL.")
  process.exit(1)
}

// 同一個資料庫換個變數名就繞過，是這道防線第一次被穿過的方式；這裡與
// check-operating-roundtrip 用同一個判準：比對主機＋資料庫名。
const identity = (value) => {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return `${parsed.hostname}${parsed.pathname}`
  } catch {
    return null
  }
}

for (const name of ["DATABASE_URL", "DIRECT_URL", "DIRECT_DATABASE_URL"]) {
  if (identity(process.env[name]) === identity(url)) {
    console.error(`拒絕執行：OPERATING_PROOF_DATABASE_URL 與 ${name} 指向同一個資料庫。`)
    console.error("proof 資料庫必須是可拋棄的，不能是執行期那一個。")
    process.exit(1)
  }
}

console.log(`pushing schema to ${target.host}${target.pathname}`)

const result = spawnSync("pnpm", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: {
    ...process.env,
    // 兩個都換：config 讀 DIRECT_DATABASE_URL 優先，漏掉它就等於沒換。
    DATABASE_URL: url,
    DIRECT_URL: url,
    DIRECT_DATABASE_URL: url,
  },
})

process.exit(result.status ?? 1)
