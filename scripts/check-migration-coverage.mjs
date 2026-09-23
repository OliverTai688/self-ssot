/**
 * migration 歷史能不能重建出 schema（PLN-074 M7）。
 *
 * 四張表（project_phase_nodes / project_milestones / skills / agent_commands）曾經
 * 只存在於正式資料庫，migration 裡一行都沒有 —— 是某次 prisma db push 直接推的。
 * 沒人發現，因為正式庫一直好好的；直到第一次對乾淨資料庫重播才炸。
 *
 * 那不只是測試環境的不便：無法從 migration 重建，就等於沒有可驗證的災難復原路徑。
 * 這支把「能不能重建」變成每次都會被問到的問題。
 */
import fs from "node:fs"
import path from "node:path"

const schema = fs.readFileSync("prisma/schema.prisma", "utf8")

const tables = new Map()
for (const [, model, body] of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const mapped = body.match(/@@map\("([a-z_0-9]+)"\)/)
  tables.set(mapped ? mapped[1] : model, model)
}

const enums = new Map()
for (const [, name, body] of schema.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const mapped = body.match(/@@map\("([a-z_0-9]+)"\)/)
  enums.set(mapped ? mapped[1] : name, name)
}

const createdTables = new Set()
const createdEnums = new Set()
const dir = "prisma/migrations"
for (const entry of fs.readdirSync(dir).sort()) {
  const file = path.join(dir, entry, "migration.sql")
  if (!fs.existsSync(file)) continue
  const sql = fs.readFileSync(file, "utf8")
  for (const [, t] of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"([a-z_0-9]+)"/g)) createdTables.add(t)
  for (const [, e] of sql.matchAll(/CREATE TYPE "([a-z_0-9]+)"/g)) createdEnums.add(e)
}

const missingTables = [...tables.keys()].filter((t) => !createdTables.has(t)).sort()
const missingEnums = [...enums.keys()].filter((e) => !createdEnums.has(e)).sort()

for (const t of missingTables) {
  console.error(`FAIL  table "${t}" (model ${tables.get(t)}) is in the schema but no migration creates it`)
}
for (const e of missingEnums) {
  console.error(`FAIL  enum "${e}" (${enums.get(e)}) is in the schema but no migration creates it`)
}

if (missingTables.length || missingEnums.length) {
  console.error("\nThe migration history cannot rebuild this schema from empty.")
  console.error("Anything created by `prisma db push` needs a migration written for it.")
  process.exit(1)
}

console.log(`migration coverage: ${tables.size} tables, ${enums.size} enums, all created by migrations`)
