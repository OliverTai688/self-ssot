#!/usr/bin/env node
/**
 * 把 `0_工作區` 的真實專案初始化進圓展工作區（PLN-076 階段 A）。
 *
 * 這一支只做一件事：**建專案**。不建資料夾樹、不傳任何檔案 —— 那是階段 B，
 * 要等 Owner 看過這一批專案在工作台上長得對不對之後才做。
 *
 * 寫出來的列必須與工作台自己建的一模一樣，否則資料庫有資料、介面卻看不到：
 *   - 主鍵＝UUIDv5(workspaceSlug, "projects", 工作台編號)。這與
 *     `operating-commands.service.ts` 的 `rowUuid()` 是同一條規則，所以之後在工作台
 *     編輯這個專案時，寫入管線算出來的主鍵會落在同一列，而不是另開一列。
 *   - `operating_project_profiles.workbench_ref` 一定要寫：讀取路徑（`operating-store.service.ts`
 *     的 `withRef()`）會把沒有它的列整列丟掉。
 *   - `status`／`phase` 用與 `applyProject()` 相同的對照表從工作台狀態字串推導。
 * 乾跑時會拿資料庫裡**已經存在**的專案驗這條主鍵規則：算出來的 UUID 對不上既有主鍵就當場中止。
 *
 * 比工作台多寫的只有四欄：`lifecycle_stage`／`phase_round`／`legacy_folder_no`／`priority_tier`
 * （PLN-075 S2 加的欄位，工作台目前不讀也不寫），外加 `description`／`next_action`。
 *
 * 已經存在的專案（對應表的 `existingRef`）只補上面那四欄，名稱、客戶、狀態一個字都不動。
 * 對應表有給 `nextAction` 時，只在資料庫那一格還是空的時候才寫 —— 使用者在工作台自己寫過的不覆蓋。
 *
 * 安全邊界：
 *   - **預設乾跑**。不加 `--apply` 就只讀資料庫、印出計畫，一個寫入都不發。
 *   - `--apply` 另外要求 `PERSONAL_OS_IMPORT_CONFIRM` 等於確認字串，因為 `DATABASE_URL` 平常指向正式的 Supabase。
 *   - 全部寫入在一個交易裡，任何一列失敗就整批回滾。
 *   - 可重跑：新專案以主鍵 `ON CONFLICT DO NOTHING`，第二次跑只會回報「已存在」。
 *
 * 用法：
 *   node scripts/import-workspace-projects.mjs --self-test          # 不連資料庫的邏輯自測
 *   node scripts/import-workspace-projects.mjs                      # 乾跑：唯讀連線，印出計畫
 *   node scripts/import-workspace-projects.mjs --report <path.md>   # 乾跑並把計畫寫成檔
 *   PERSONAL_OS_IMPORT_CONFIRM=... node scripts/import-workspace-projects.mjs --apply
 */

import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_CREATES_PROJECTS"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DEFAULT_MAP = path.join(ROOT, "docs/2_agent-input/generated/project-migration-plan/projects.json")

/** 與 `operating-commands.service.ts` 的 `UUID_NAMESPACE` 相同。改了這裡，所有既有主鍵都會對不上。 */
const UUID_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"

/** 與 `operating-commands.service.ts` 的 `deterministicUuid()` 逐行相同。 */
export function deterministicUuid(...parts) {
  const hash = createHash("sha1")
  hash.update(Buffer.from(UUID_NAMESPACE.replace(/-/g, ""), "hex"))
  hash.update(Buffer.from(parts.join(":"), "utf8"))
  const bytes = hash.digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function projectRowId(workspaceSlug, ref) {
  return deterministicUuid(workspaceSlug, "projects", ref)
}

/** 工作台表單的四個狀態（`runtime.js` 專案表單的 opts）→ Work 模組的粗分類。與 `PROJECT_STATUS_MAP` 一致。 */
export const STATUS_MAP = {
  商機: { status: "EXPLORING", phase: "DISCOVERY" },
  進行中: { status: "ACTIVE", phase: "EXECUTION" },
  驗收中: { status: "ACTIVE", phase: "REVIEW" },
  已結案: { status: "COMPLETED", phase: "MAINTENANCE" },
}

export const LIFECYCLE_STAGES = ["PROPOSING", "CONTRACTED", "EXECUTING", "ACCEPTANCE", "CLOSED"]

/** 哪些工作台狀態配得上哪些生命週期。配不上的組合多半是對應表填錯了一格。 */
const STATUS_ALLOWS = {
  商機: ["PROPOSING"],
  進行中: ["CONTRACTED", "EXECUTING"],
  驗收中: ["ACCEPTANCE"],
  已結案: ["CLOSED"],
}

const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null)

/** 對應表的靜態檢查。回傳錯誤訊息陣列；空陣列＝可以用。 */
export function validateMap(map) {
  const errors = []
  if (!text(map?.workspaceSlug)) errors.push("缺少 workspaceSlug")
  const rows = Array.isArray(map?.projects) ? map.projects : []
  if (rows.length === 0) errors.push("projects 是空的")

  const seenRef = new Set()
  const seenFolder = new Set()
  rows.forEach((row, index) => {
    const at = `projects[${index}]（${row?.sourceFolder ?? "?"}）`
    if (!text(row?.sourceFolder)) errors.push(`${at} 缺少 sourceFolder`)
    else if (seenFolder.has(row.sourceFolder)) errors.push(`${at} sourceFolder 重複`)
    else seenFolder.add(row.sourceFolder)

    const isExisting = Boolean(text(row?.existingRef))
    const isNew = Boolean(text(row?.ref))
    if (isExisting === isNew) errors.push(`${at} 必須恰好有 ref 或 existingRef 其中一個`)

    const key = text(row?.ref) ?? text(row?.existingRef)
    if (key) {
      if (seenRef.has(key)) errors.push(`${at} 編號 ${key} 重複`)
      seenRef.add(key)
    }

    if (!LIFECYCLE_STAGES.includes(row?.lifecycleStage)) errors.push(`${at} lifecycleStage 不在允許值內`)
    if (row?.phaseRound != null && !(Number.isInteger(row.phaseRound) && row.phaseRound >= 1)) {
      errors.push(`${at} phaseRound 必須是 ≥1 的整數或 null`)
    }
    if (row?.priorityTier != null && !(Number.isInteger(row.priorityTier) && row.priorityTier >= 1 && row.priorityTier <= 5)) {
      errors.push(`${at} priorityTier 必須是 1–5 的整數或 null`)
    }
    if (row?.legacyFolderNo != null && !/^\d{2}$/.test(row.legacyFolderNo)) {
      errors.push(`${at} legacyFolderNo 必須是兩位數字或 null`)
    }

    if (isNew) {
      if (!text(row?.name)) errors.push(`${at} 新專案缺少 name`)
      if (!STATUS_MAP[row?.status]) errors.push(`${at} status 必須是 商機／進行中／驗收中／已結案`)
      else if (!STATUS_ALLOWS[row.status].includes(row.lifecycleStage)) {
        errors.push(`${at} status「${row.status}」與 lifecycleStage ${row.lifecycleStage} 對不上`)
      }
    }
  })
  return errors
}

/* ------------------------------------------------------------------ */
/* 自測（不連資料庫）                                                  */
/* ------------------------------------------------------------------ */

function selfTest(map) {
  let failures = 0
  const check = (name, cond, detail) => {
    console.log(`${cond ? "ok  " : "FAIL"}  ${name}`)
    if (!cond) {
      failures += 1
      if (detail !== undefined) console.log("      " + JSON.stringify(detail))
    }
  }

  // 2026-10-07 從正式資料庫唯讀讀出的兩列（workbench_ref → projects.id）。
  // 這兩條守的是「主鍵規則與寫入管線一致」——對不上就代表匯入的專案在工作台上會變成第二列。
  check(
    "主鍵規則重現既有專案 PRJ-8smkzbc2-003",
    projectRowId("yzedtech", "PRJ-8smkzbc2-003") === "3b60d0dc-28f3-5eb7-8d30-55ece1dcc5f8",
    projectRowId("yzedtech", "PRJ-8smkzbc2-003")
  )
  check(
    "主鍵規則重現既有專案 PRJ-5xesqva2-001",
    projectRowId("yzedtech", "PRJ-5xesqva2-001") === "eda6343a-0620-5fbe-b611-884a6452ddba",
    projectRowId("yzedtech", "PRJ-5xesqva2-001")
  )

  const serviceSource = fs.readFileSync(path.join(ROOT, "src/lib/services/operating-commands.service.ts"), "utf8")
  check("UUID namespace 與寫入管線相同", serviceSource.includes(`const UUID_NAMESPACE = "${UUID_NAMESPACE}"`))
  for (const [label, mapped] of Object.entries(STATUS_MAP)) {
    check(
      `狀態對照「${label}」與 PROJECT_STATUS_MAP 相同`,
      serviceSource.includes(`${label}: { status: "${mapped.status}", phase: "${mapped.phase}" }`)
    )
  }

  const runtimeSource = fs.readFileSync(path.join(ROOT, "src/components/yuanzhan/v5/runtime.js"), "utf8")
  check(
    "四個狀態就是工作台專案表單的選項",
    runtimeSource.includes(`opts: [${Object.keys(STATUS_MAP).map((s) => `'${s}'`).join(", ")}]`)
  )

  const errors = validateMap(map)
  check("對應表通過靜態檢查", errors.length === 0, errors)

  const bad = structuredClone(map)
  bad.projects[0].lifecycleStage = "CLOSED"
  check("狀態與生命週期對不上會被擋下", validateMap(bad).some((e) => e.includes("對不上")))
  const dup = structuredClone(map)
  dup.projects.push({ ...dup.projects[0] })
  check("重複的編號會被擋下", validateMap(dup).some((e) => e.includes("重複")))
  const both = structuredClone(map)
  both.projects[0].existingRef = "PRJ-x-001"
  check("同時給 ref 與 existingRef 會被擋下", validateMap(both).some((e) => e.includes("恰好")))

  console.log(failures ? `\n${failures} failing` : "\nimport-workspace-projects self-test: all checks passed")
  return failures
}

/* ------------------------------------------------------------------ */
/* 計畫                                                                */
/* ------------------------------------------------------------------ */

/**
 * 把對應表與資料庫現況比成一份計畫。**不寫任何東西。**
 *
 * `state`：
 *   - workspaceId
 *   - ownerIds：這個工作區現有專案的擁有者（去重）
 *   - byRef：Map<workbench_ref, { id, name, lifecycleStage, phaseRound, legacyFolderNo, priorityTier }>
 *   - idsTaken：Set<projects.id>（整張表，不限工作區）
 */
export function buildPlan(map, state) {
  const blockers = []
  const actions = []

  if (!state.workspaceId) blockers.push(`找不到 slug 為 ${map.workspaceSlug} 的工作區`)
  if (state.ownerIds.length !== 1) {
    blockers.push(`工作區現有專案的擁有者不是恰好一位（${state.ownerIds.length} 位），無法決定新專案的擁有者`)
  }

  for (const row of map.projects) {
    if (row.import === false) {
      actions.push({ kind: "skip", row, reason: "對應表標了 import: false" })
      continue
    }

    if (row.existingRef) {
      const found = state.byRef.get(row.existingRef)
      if (!found) {
        blockers.push(`existingRef ${row.existingRef}（${row.sourceFolder}）在資料庫裡找不到`)
        continue
      }
      const derived = projectRowId(map.workspaceSlug, row.existingRef)
      if (derived !== found.id) {
        blockers.push(`主鍵規則對不上既有專案 ${row.existingRef}：算出 ${derived}，資料庫是 ${found.id}`)
        continue
      }
      const next = {
        lifecycleStage: row.lifecycleStage,
        phaseRound: row.phaseRound ?? null,
        legacyFolderNo: row.legacyFolderNo ?? null,
        priorityTier: row.priorityTier ?? null,
        // 已經有人寫過下一步就保留原樣。
        nextAction: found.nextAction || text(row.nextAction),
      }
      const diff = Object.keys(next).filter((key) => found[key] !== next[key])
      actions.push(
        diff.length
          ? { kind: "update", row, id: found.id, name: found.name, before: found, next, diff }
          : { kind: "unchanged", row, id: found.id, name: found.name }
      )
      continue
    }

    const id = projectRowId(map.workspaceSlug, row.ref)
    if (state.byRef.has(row.ref) || state.idsTaken.has(id)) {
      actions.push({ kind: "exists", row, id, name: row.name })
      continue
    }
    actions.push({ kind: "create", row, id, name: row.name, mapped: STATUS_MAP[row.status] })
  }

  return { blockers, actions }
}

const KIND_LABEL = { create: "新建", update: "補欄位", unchanged: "不需變更", exists: "已存在", skip: "略過" }

function renderPlan(map, plan, meta) {
  const lines = []
  const count = (kind) => plan.actions.filter((a) => a.kind === kind).length
  lines.push(`# 0_工作區 專案匯入 —— ${meta.apply ? "執行結果" : "乾跑計畫"}`)
  lines.push("")
  lines.push(`- 產生時間：${meta.at}`)
  lines.push(`- 目標資料庫：\`${meta.target}\``)
  lines.push(`- 工作區：\`${map.workspaceSlug}\``)
  lines.push(`- 模式：${meta.apply ? "APPLY（已寫入）" : "DRY-RUN（唯讀，沒有發出任何寫入）"}`)
  lines.push(
    `- 合計：新建 ${count("create")}　補欄位 ${count("update")}　不需變更 ${count("unchanged")}　已存在 ${count("exists")}　略過 ${count("skip")}`
  )
  lines.push("")

  if (plan.blockers.length) {
    lines.push("## 阻斷（有任何一條就不會寫入）")
    lines.push("")
    for (const blocker of plan.blockers) lines.push(`- ${blocker}`)
    lines.push("")
  }

  lines.push("## 新建的專案")
  lines.push("")
  lines.push("| 原資料夾 | 工作台編號 | 專案名稱 | 客戶 | 狀態 | 生命週期 | 重要度 | 下一步 |")
  lines.push("|---|---|---|---|---|---|---|---|")
  for (const action of plan.actions.filter((a) => a.kind === "create" || a.kind === "exists")) {
    const r = action.row
    lines.push(
      `| ${r.sourceFolder} | \`${r.ref}\`${action.kind === "exists" ? "（已存在）" : ""} | ${r.name} | ${r.client ?? "—"} | ${r.status} | ${r.lifecycleStage} | ${r.priorityTier ?? "—"} | ${r.nextAction ?? "—"} |`
    )
  }
  lines.push("")

  lines.push("## 已存在、只補欄位的專案")
  lines.push("")
  lines.push("| 原資料夾 | 工作台編號 | 資料庫裡的名稱 | 生命週期 | 第幾期 | 資料夾序號 | 重要度 | 下一步 |")
  lines.push("|---|---|---|---|---|---|---|---|")
  const show = (before, after) => (before === after ? `${after ?? "—"}` : `${before ?? "—"} → **${after ?? "—"}**`)
  for (const action of plan.actions.filter((a) => a.kind === "update" || a.kind === "unchanged")) {
    const r = action.row
    const b = action.before ?? {
      lifecycleStage: r.lifecycleStage,
      phaseRound: r.phaseRound ?? null,
      legacyFolderNo: r.legacyFolderNo ?? null,
      priorityTier: r.priorityTier ?? null,
      nextAction: null,
    }
    const after = action.next ?? b
    lines.push(
      `| ${r.sourceFolder} | \`${r.existingRef}\` | ${action.name} | ${show(b.lifecycleStage, r.lifecycleStage)} | ${show(b.phaseRound, r.phaseRound ?? null)} | ${show(b.legacyFolderNo, r.legacyFolderNo ?? null)} | ${show(b.priorityTier, r.priorityTier ?? null)} | ${show(b.nextAction ?? null, after.nextAction ?? null)} |`
    )
  }
  lines.push("")

  const skipped = plan.actions.filter((a) => a.kind === "skip")
  if (skipped.length) {
    lines.push("## 略過")
    lines.push("")
    for (const action of skipped) lines.push(`- ${action.row.sourceFolder}：${action.reason}`)
    lines.push("")
  }

  if (Array.isArray(map.notProjects) && map.notProjects.length) {
    lines.push("## 不建成專案的資料夾")
    lines.push("")
    for (const entry of map.notProjects) lines.push(`- ${entry.sourceFolder}：${entry.reason}`)
    lines.push("")
  }

  return lines.join("\n")
}

/* ------------------------------------------------------------------ */
/* 資料庫                                                              */
/* ------------------------------------------------------------------ */

async function readState(client, map) {
  const workspace = await client.query("select id from workspaces where slug = $1", [map.workspaceSlug])
  const workspaceId = workspace.rows[0]?.id ?? null

  const existing = workspaceId
    ? await client.query(
        `select p.id, p.name, p.owner_id, p.lifecycle_stage, p.phase_round, p.legacy_folder_no, p.priority_tier,
                p.next_action, opp.workbench_ref
           from projects p
           left join operating_project_profiles opp on opp.project_id = p.id
          where p.workspace_id = $1`,
        [workspaceId]
      )
    : { rows: [] }

  const byRef = new Map()
  for (const row of existing.rows) {
    if (!row.workbench_ref) continue
    byRef.set(row.workbench_ref, {
      id: row.id,
      name: row.name,
      lifecycleStage: row.lifecycle_stage,
      phaseRound: row.phase_round,
      legacyFolderNo: row.legacy_folder_no,
      priorityTier: row.priority_tier,
      nextAction: text(row.next_action),
    })
  }

  const candidateIds = map.projects.filter((row) => row.ref).map((row) => projectRowId(map.workspaceSlug, row.ref))
  const taken = candidateIds.length
    ? await client.query("select id from projects where id = any($1::uuid[])", [candidateIds])
    : { rows: [] }

  return {
    workspaceId,
    ownerIds: [...new Set(existing.rows.map((row) => row.owner_id))],
    byRef,
    idsTaken: new Set(taken.rows.map((row) => row.id)),
  }
}

async function applyPlan(client, plan, state) {
  const ownerId = state.ownerIds[0]
  let created = 0
  let updated = 0

  for (const action of plan.actions) {
    if (action.kind === "create") {
      const r = action.row
      const inserted = await client.query(
        `insert into projects
           (id, owner_id, workspace_id, name, client_name, description, status, phase,
            lifecycle_stage, phase_round, legacy_folder_no, priority_tier, next_action, updated_at)
         values
           ($1, $2, $3, $4, $5, $6, $7::project_status, $8::project_phase,
            $9::project_lifecycle_stage, $10, $11, $12, $13, now())
         on conflict (id) do nothing`,
        [
          action.id,
          ownerId,
          state.workspaceId,
          r.name,
          text(r.client),
          text(r.description),
          action.mapped.status,
          action.mapped.phase,
          r.lifecycleStage,
          r.phaseRound ?? null,
          r.legacyFolderNo ?? null,
          r.priorityTier ?? null,
          text(r.nextAction),
        ]
      )
      if (inserted.rowCount === 0) continue
      // 與工作台新增專案時寫出的 profile 相同：類型一律「未確認」（契約 §8.3 要 Owner 在啟動前確認），
      // 獎金率、上限、預算維持資料庫預設的 0。
      await client.query(
        `insert into operating_project_profiles
           (project_id, client, workbench_ref, engagement_type, operating_status, updated_at)
         values ($1, $2, $3, '未確認', $4, now())
         on conflict (project_id) do nothing`,
        [action.id, text(r.client), r.ref, r.status]
      )
      created += 1
    }

    if (action.kind === "update") {
      const b = action.before
      // where 帶著讀到時的舊值：掃描之後被別人改過的列不覆寫。
      const result = await client.query(
        `update projects
            set lifecycle_stage = $2::project_lifecycle_stage,
                phase_round = $3,
                legacy_folder_no = $4,
                priority_tier = $5,
                next_action = $10
          where id = $1
            and lifecycle_stage = $6::project_lifecycle_stage
            and phase_round is not distinct from $7
            and legacy_folder_no is not distinct from $8
            and priority_tier is not distinct from $9
            and coalesce(nullif(btrim(next_action), ''), '') = coalesce($11, '')`,
        [
          action.id,
          action.next.lifecycleStage,
          action.next.phaseRound,
          action.next.legacyFolderNo,
          action.next.priorityTier,
          b.lifecycleStage,
          b.phaseRound,
          b.legacyFolderNo,
          b.priorityTier,
          action.next.nextAction,
          b.nextAction,
        ]
      )
      updated += result.rowCount
    }
  }

  return { created, updated }
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { apply: false, selfTest: false, map: DEFAULT_MAP, report: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--apply") args.apply = true
    else if (arg === "--self-test") args.selfTest = true
    else if (arg === "--dry-run") args.apply = false
    else if (arg === "--map") args.map = path.resolve(argv[(i += 1)])
    else if (arg === "--report") args.report = path.resolve(argv[(i += 1)])
    else {
      console.error(`不認得的參數：${arg}`)
      process.exit(1)
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const map = JSON.parse(fs.readFileSync(args.map, "utf8"))

  if (args.selfTest) process.exit(selfTest(map) ? 1 : 0)

  const errors = validateMap(map)
  if (errors.length) {
    console.error("對應表有問題，沒有連線資料庫：")
    for (const error of errors) console.error(`  - ${error}`)
    process.exit(1)
  }

  if (args.apply && process.env.PERSONAL_OS_IMPORT_CONFIRM !== CONFIRMATION_TEXT) {
    console.error("拒絕執行 --apply：DATABASE_URL 平常指向正式資料庫。")
    console.error(`要實際寫入請同時給：PERSONAL_OS_IMPORT_CONFIRM=${CONFIRMATION_TEXT}`)
    process.exit(1)
  }

  const { config } = await import("dotenv")
  config({ path: path.join(ROOT, ".env.local"), quiet: true })
  config({ path: path.join(ROOT, ".env"), quiet: true })

  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error("DATABASE_URL / DIRECT_URL 都沒有設定，無法連線。")
    process.exit(1)
  }

  const pg = (await import("pg")).default
  const client = new pg.Client({ connectionString })
  await client.connect()

  const target = new URL(connectionString)
  const meta = { apply: args.apply, at: new Date().toISOString(), target: `${target.host}${target.pathname}` }

  try {
    await client.query(args.apply ? "BEGIN" : "BEGIN READ ONLY")
    const state = await readState(client, map)
    const plan = buildPlan(map, state)

    if (plan.blockers.length) {
      console.log(renderPlan(map, plan, { ...meta, apply: false }))
      await client.query("ROLLBACK")
      console.error("\n有阻斷項目，沒有寫入任何東西。")
      process.exit(1)
    }

    if (!args.apply) {
      const rendered = renderPlan(map, plan, meta)
      console.log(rendered)
      await client.query("ROLLBACK")
      if (args.report) {
        fs.writeFileSync(args.report, rendered + "\n")
        console.log(`\n計畫已寫到 ${path.relative(ROOT, args.report)}`)
      }
      console.log("\ndry-run：沒有發出任何寫入。")
      return
    }

    const result = await applyPlan(client, plan, state)
    const expected = {
      created: plan.actions.filter((a) => a.kind === "create").length,
      updated: plan.actions.filter((a) => a.kind === "update").length,
    }
    if (result.created !== expected.created || result.updated !== expected.updated) {
      await client.query("ROLLBACK")
      console.error(
        `寫入數量與計畫不符（新建 ${result.created}/${expected.created}、補欄位 ${result.updated}/${expected.updated}）—— 資料在掃描後被改過，整批已回滾，請重跑乾跑。`
      )
      process.exit(1)
    }
    await client.query("COMMIT")

    const rendered = renderPlan(map, plan, meta)
    console.log(rendered)
    if (args.report) fs.writeFileSync(args.report, rendered + "\n")
    console.log(`\napplied：新建 ${result.created} 個專案，補欄位 ${result.updated} 個專案。`)
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}

// 被 import 當模組時不要執行 CLI。
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error?.message ?? error)
    process.exit(1)
  })
}
