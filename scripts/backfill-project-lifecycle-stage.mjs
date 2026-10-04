#!/usr/bin/env node
/**
 * 回填 `Project.lifecycleStage`（PLN-075 S2 Wave 2a）。
 *
 * 為什麼需要這一支：Wave 1 的 migration 讓 `lifecycle_stage` 預設 `PROPOSING`，
 * 而且刻意不回填。對一個正在執行的專案，「提案中」是錯的——
 * `01.共好玟化` 實際在驗收、`03.幸福文齡` 在執行二期。在這一欄被算對之前，
 * 介面不得把它當權威顯示（見 Wave 1 證據報告「已知設計落差 1」）。
 *
 * 推導規則不自己發明新的事實來源，只讀既有的四個欄位：
 *   - `operating_project_profiles.deal_stage`（對外四狀態，金流推演讀它）
 *   - `operating_project_profiles.operating_status`（工作台原始狀態字串：商機／進行中／驗收中）
 *   - `projects.phase`（Work 模組的階段）
 *   - `projects.status`（Work 模組的粗分類）
 * 這四個欄位**一個都不會被這支腳本寫到**。只寫 `projects.lifecycle_stage`。
 *
 * 安全邊界：
 *   - **預設 dry-run**。不加 `--apply` 就只印出會改哪些列與前後值，一個 UPDATE 都不發。
 *   - `--apply` 另外要求環境變數 `PERSONAL_OS_BACKFILL_CONFIRM` 等於確認字串，
 *     因為 `DATABASE_URL` 平常指向正式的 Supabase。
 *   - 預設只動 `lifecycle_stage = 'PROPOSING'` 的列（那是未回填的預設值）；
 *     人工改對過的列不碰。要重新評估每一列才加 `--all`。
 *
 * 用法：
 *   node scripts/backfill-project-lifecycle-stage.mjs --dry-run --self-test   # 不連 DB 的邏輯自測
 *   node scripts/backfill-project-lifecycle-stage.mjs --dry-run               # 連 DB 唯讀，印出差異
 *   PERSONAL_OS_BACKFILL_CONFIRM=... node scripts/backfill-project-lifecycle-stage.mjs --apply
 */

import { pathToFileURL } from "node:url"

export const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_PROJECT_LIFECYCLE_STAGE"

export const LIFECYCLE_STAGES = ["PROPOSING", "CONTRACTED", "EXECUTING", "ACCEPTANCE", "CLOSED"]

/**
 * 推導規則表。**順序即優先序**：先命中的規則決定結果，後面的規則不會再放寬。
 *
 * | # | rule | 條件 | 結果 |
 * |---|---|---|---|
 * | 1 | `closed-by-project-status` | `status ∈ {COMPLETED, ARCHIVED}` | `CLOSED` |
 * | 2 | `closed-by-deal-stage` | `deal_stage = CLOSED` | `CLOSED` |
 * | 3 | `acceptance-by-operating-status` | `operating_status` 含「驗收」 | `ACCEPTANCE` |
 * | 4 | `acceptance-by-phase` | `phase = REVIEW` | `ACCEPTANCE` |
 * | 5 | `executing-by-operating-status` | `operating_status` 含「進行」 | `EXECUTING` |
 * | 6 | `executing-by-phase` | `phase ∈ {EXECUTION, MAINTENANCE}` | `EXECUTING` |
 * | 7 | `contracted-by-deal-stage` | `deal_stage = WON` | `CONTRACTED` |
 * | 8 | `proposing-by-deal-stage` | `deal_stage ∈ {PROPOSED, CHALLENGEABLE}` | `PROPOSING` |
 * | 9 | `proposing-by-operating-status` | `operating_status` 含「商機」 | `PROPOSING` |
 * | 10 | `proposing-fallback` | 其餘 | `PROPOSING` |
 *
 * 幾個刻意的選擇：
 * - 規則 3／5 用「包含」而不是等值比對：`operating_status` 是自由字串，
 *   實際資料裡出現過「驗收中」「進行中」這類帶後綴的寫法。
 * - 規則 5／6 排在規則 7 之前，所以 `deal_stage = WON` ＋「進行中」會得到 `EXECUTING`
 *   而不是停在 `CONTRACTED`：已接案只是必要條件，執行中才是更強的事實。
 * - 沒有任何規則會推出「比既有欄位更前面」的結論：這支只是把既有事實翻譯過來，
 *   不做狀態機轉移。
 */
export function deriveLifecycleStage(row) {
  const status = typeof row?.status === "string" ? row.status : null
  const phase = typeof row?.phase === "string" ? row.phase : null
  const dealStage = typeof row?.dealStage === "string" ? row.dealStage : null
  const operatingStatus = typeof row?.operatingStatus === "string" ? row.operatingStatus : ""

  if (status === "COMPLETED" || status === "ARCHIVED") {
    return { stage: "CLOSED", rule: "closed-by-project-status" }
  }
  if (dealStage === "CLOSED") {
    return { stage: "CLOSED", rule: "closed-by-deal-stage" }
  }
  if (operatingStatus.includes("驗收")) {
    return { stage: "ACCEPTANCE", rule: "acceptance-by-operating-status" }
  }
  if (phase === "REVIEW") {
    return { stage: "ACCEPTANCE", rule: "acceptance-by-phase" }
  }
  if (operatingStatus.includes("進行")) {
    return { stage: "EXECUTING", rule: "executing-by-operating-status" }
  }
  if (phase === "EXECUTION" || phase === "MAINTENANCE") {
    return { stage: "EXECUTING", rule: "executing-by-phase" }
  }
  if (dealStage === "WON") {
    return { stage: "CONTRACTED", rule: "contracted-by-deal-stage" }
  }
  if (dealStage === "PROPOSED" || dealStage === "CHALLENGEABLE") {
    return { stage: "PROPOSING", rule: "proposing-by-deal-stage" }
  }
  if (operatingStatus.includes("商機")) {
    return { stage: "PROPOSING", rule: "proposing-by-operating-status" }
  }
  return { stage: "PROPOSING", rule: "proposing-fallback" }
}

/**
 * 自測用的代表性輸入。`check-project-capability.mjs` 也吃這一組，
 * 所以「規則改了但沒更新期望值」會在 checker 裡當場爆掉，而不是等到回填當天。
 */
export const LIFECYCLE_SELF_TEST_CASES = [
  {
    label: "01.共好玟化：工作台寫驗收中 → ACCEPTANCE",
    row: { status: "ACTIVE", phase: "EXECUTION", dealStage: "WON", operatingStatus: "驗收中" },
    expected: { stage: "ACCEPTANCE", rule: "acceptance-by-operating-status" },
  },
  {
    label: "03.幸福文齡：執行二期 → EXECUTING",
    row: { status: "ACTIVE", phase: "EXECUTION", dealStage: "WON", operatingStatus: "進行中" },
    expected: { stage: "EXECUTING", rule: "executing-by-operating-status" },
  },
  {
    label: "已接案但還在規劃 → CONTRACTED",
    row: { status: "ACTIVE", phase: "PLANNING", dealStage: "WON", operatingStatus: null },
    expected: { stage: "CONTRACTED", rule: "contracted-by-deal-stage" },
  },
  {
    label: "商機 → PROPOSING",
    row: { status: "EXPLORING", phase: "DISCOVERY", dealStage: "CHALLENGEABLE", operatingStatus: "商機" },
    expected: { stage: "PROPOSING", rule: "proposing-by-deal-stage" },
  },
  {
    label: "已提案但未接 → PROPOSING",
    row: { status: "ACTIVE", phase: "PLANNING", dealStage: "PROPOSED", operatingStatus: "商機" },
    expected: { stage: "PROPOSING", rule: "proposing-by-deal-stage" },
  },
  {
    label: "Work 模組標 COMPLETED → CLOSED（最高優先）",
    row: { status: "COMPLETED", phase: "EXECUTION", dealStage: "WON", operatingStatus: "進行中" },
    expected: { stage: "CLOSED", rule: "closed-by-project-status" },
  },
  {
    label: "ARCHIVED → CLOSED",
    row: { status: "ARCHIVED", phase: "MAINTENANCE", dealStage: "WON", operatingStatus: "驗收中" },
    expected: { stage: "CLOSED", rule: "closed-by-project-status" },
  },
  {
    label: "deal_stage CLOSED → CLOSED",
    row: { status: "ACTIVE", phase: "REVIEW", dealStage: "CLOSED", operatingStatus: "驗收中" },
    expected: { stage: "CLOSED", rule: "closed-by-deal-stage" },
  },
  {
    label: "phase REVIEW 無工作台側表 → ACCEPTANCE",
    row: { status: "ACTIVE", phase: "REVIEW", dealStage: null, operatingStatus: null },
    expected: { stage: "ACCEPTANCE", rule: "acceptance-by-phase" },
  },
  {
    label: "phase MAINTENANCE 無工作台側表 → EXECUTING",
    row: { status: "ACTIVE", phase: "MAINTENANCE", dealStage: null, operatingStatus: null },
    expected: { stage: "EXECUTING", rule: "executing-by-phase" },
  },
  {
    label: "PAUSED 但在執行 → EXECUTING（暫停不是結案）",
    row: { status: "PAUSED", phase: "EXECUTION", dealStage: "WON", operatingStatus: null },
    expected: { stage: "EXECUTING", rule: "executing-by-phase" },
  },
  {
    label: "全空 → PROPOSING（fallback，不猜）",
    row: {},
    expected: { stage: "PROPOSING", rule: "proposing-fallback" },
  },
]

export function runLifecycleSelfTest(log = console.log) {
  let failures = 0
  for (const testCase of LIFECYCLE_SELF_TEST_CASES) {
    const actual = deriveLifecycleStage(testCase.row)
    const ok = actual.stage === testCase.expected.stage && actual.rule === testCase.expected.rule
    log(`${ok ? "ok  " : "FAIL"}  ${testCase.label}`)
    if (!ok) {
      failures += 1
      log(`      expected ${JSON.stringify(testCase.expected)} got ${JSON.stringify(actual)}`)
    }
  }
  return failures
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { apply: false, dryRun: false, selfTest: false, all: false, unknown: [] }
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true
    else if (arg === "--dry-run") args.dryRun = true
    else if (arg === "--self-test") args.selfTest = true
    else if (arg === "--all") args.all = true
    else if (arg === "--") continue
    else args.unknown.push(arg)
  }
  return args
}

const QUERY = `
  select
    p.id,
    p.name,
    p.status::text          as status,
    p.phase::text           as phase,
    p.lifecycle_stage::text as lifecycle_stage,
    opp.deal_stage::text    as deal_stage,
    opp.operating_status    as operating_status
  from projects p
  left join operating_project_profiles opp on opp.project_id = p.id
  order by p.name asc, p.id asc
`

function planRow(row, { all }) {
  const current = row.lifecycle_stage
  const derived = deriveLifecycleStage({
    status: row.status,
    phase: row.phase,
    dealStage: row.deal_stage,
    operatingStatus: row.operating_status,
  })

  // 預設只修未回填的預設值。人工改對過的列不碰，除非 --all。
  const inScope = all || current === "PROPOSING"
  const changed = inScope && derived.stage !== current

  return { id: row.id, name: row.name, current, next: derived.stage, rule: derived.rule, changed, inScope }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.unknown.length > 0) {
    console.error(`未知參數：${args.unknown.join(" ")}`)
    process.exit(2)
  }

  if (args.selfTest) {
    console.log("lifecycleStage 推導邏輯自測（不連資料庫）\n")
    const failures = runLifecycleSelfTest()
    console.log(
      failures
        ? `\n${failures} failing`
        : `\nlifecycle derivation self-test: all ${LIFECYCLE_SELF_TEST_CASES.length} checks passed`
    )
    process.exit(failures ? 1 : 0)
  }

  const apply = args.apply
  if (!apply && !args.dryRun) {
    console.log("（沒給 --apply，視為 --dry-run）")
  }

  if (apply && process.env.PERSONAL_OS_BACKFILL_CONFIRM !== CONFIRMATION_TEXT) {
    console.error("拒絕執行 --apply：DATABASE_URL 平常指向正式資料庫。")
    console.error(`要實際寫入請同時給：PERSONAL_OS_BACKFILL_CONFIRM=${CONFIRMATION_TEXT}`)
    process.exit(1)
  }

  const { config } = await import("dotenv")
  config({ path: ".env.local", quiet: true })
  config({ path: ".env", quiet: true })

  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error("DATABASE_URL / DIRECT_DATABASE_URL 都沒有設定，無法連線。")
    process.exit(1)
  }

  const pg = (await import("pg")).default
  const client = new pg.Client({ connectionString })
  await client.connect()

  try {
    const target = new URL(connectionString)
    console.log(`target  ${target.host}${target.pathname}`)
    console.log(`mode    ${apply ? "APPLY（會寫入）" : "DRY-RUN（唯讀）"}`)
    console.log(`scope   ${args.all ? "全部列" : "只有 lifecycle_stage = PROPOSING 的列"}\n`)

    const { rows } = await client.query(QUERY)
    const planned = rows.map((row) => planRow(row, { all: args.all }))
    const changes = planned.filter((row) => row.changed)

    console.log(`掃描 ${planned.length} 列，其中 ${changes.length} 列需要改：\n`)
    for (const row of changes) {
      console.log(`  ${row.id}  ${row.name}`)
      console.log(`      ${row.current} → ${row.next}   (${row.rule})`)
    }
    if (changes.length === 0) {
      console.log("  （無）")
    }

    if (!apply) {
      console.log("\ndry-run：沒有發出任何 UPDATE。")
      return
    }

    let updated = 0
    for (const row of changes) {
      const result = await client.query(
        `update projects
            set lifecycle_stage = $2::project_lifecycle_stage
          where id = $1
            and lifecycle_stage = $3::project_lifecycle_stage`,
        [row.id, row.next, row.current]
      )
      updated += result.rowCount
    }
    console.log(`\napplied：${updated} 列已更新（其餘列在掃描後被別人改過，略過）。`)
  } finally {
    await client.end()
  }
}

// 被 import 當模組時（checker）不要執行 CLI。
const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  await main()
}
