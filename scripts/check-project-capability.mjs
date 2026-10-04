#!/usr/bin/env node
/**
 * 專案工作區權限地基的契約檢查（PLN-075 S2 Wave 2a）。
 *
 * 這一支守四件事，三件靜態、一件行為：
 *
 * 1. **`createProjectForProfile()` 沒有「不設 workspaceId 就建立」的路徑。**
 *    這是 Wave 2a 修掉的 P0：原本的實作完全沒寫 `workspaceId`，於是每個新建專案
 *    都是 `workspaceId = null` ＋ `accessMode = PRIVATE` 的私人專案，五大資源一個都接不上。
 *    症狀要到使用者開硬碟時才出現，所以必須有一支檢查釘住它。
 * 2. **沒有任何地方從呼叫端參數取 workspaceId 來建立專案。**
 *    授權範圍由伺服器解析（與 `src/app/api/company/operating/uploads/route.ts`
 *    的 `resolveActor()` 同一條規則）。
 * 3. **能力解析是 deny-by-default。** 這一條不靠讀程式碼下結論：把
 *    `capabilitiesFromAccessFacts()` 這個純函式從 TS 原始碼裡取出來實例化，
 *    直接餵事實、比對集合（與 `check-operating-persistence.mjs` 用 `new Function`
 *    實例化 v5 片段同一個做法）。沒有 membership／grant／ownership 時必須是空集合。
 * 4. **`lifecycleStage` 推導函式對代表性輸入給出正確輸出**，吃回填腳本自己導出的案例表，
 *    所以「規則改了但期望值沒更新」會在這裡爆掉，而不是等到回填當天。
 *
 * 全程不連資料庫、不需要產生 Prisma client。
 */
import fs from "node:fs"
import path from "node:path"

import {
  LIFECYCLE_SELF_TEST_CASES,
  LIFECYCLE_STAGES,
  deriveLifecycleStage,
} from "./backfill-project-lifecycle-stage.mjs"

const CAPABILITY_SERVICE = path.join("src", "lib", "services", "project-capability.service.ts")
const PROJECT_SERVICE = path.join("src", "lib", "services", "project.service.ts")

const EXPECTED_CAPABILITIES = [
  "project:read",
  "project:write",
  "drive:read",
  "drive:write",
  "chat:read",
  "chat:write",
  "plan:write",
  "meeting:write",
]

let failures = 0
function check(name, ok, detail) {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}`)
  if (!ok) {
    failures += 1
    console.log(`      ${typeof detail === "string" ? detail : JSON.stringify(detail)}`)
  }
}

function read(file) {
  return fs.readFileSync(file, "utf8")
}

/** 取一個函式的主體。終止符是第 0 欄的 `}`，所以巢狀區塊不會提早結束比對。 */
function functionBody(source, signature, label) {
  const start = source.indexOf(signature)
  if (start < 0) return null
  const open = source.indexOf("{", start + signature.length - 1)
  if (open < 0) return null
  const end = source.indexOf("\n}", open)
  if (end < 0) return null
  void label
  return source.slice(open + 1, end)
}

/* ------------------------------------------------------------------ */
/* 1. createProjectForProfile 不存在「不設 workspaceId 就建立」的路徑     */
/* ------------------------------------------------------------------ */

function caseCreateAlwaysBinds() {
  const source = read(PROJECT_SERVICE)
  const body = functionBody(
    source,
    "export async function createProjectForProfile(",
    "createProjectForProfile"
  )

  check("找得到 createProjectForProfile 的主體", Boolean(body), { file: PROJECT_SERVICE })
  if (!body) return

  check(
    "createProjectForProfile 由伺服器解析 workspaceId",
    body.includes("await resolveOwnerWorkspaceId(profileId)"),
    { body }
  )
  check(
    "createProjectForProfile 把 workspaceId 寫進 data",
    /data:\s*\{[\s\S]*\bworkspaceId,/.test(body),
    { body }
  )
  check(
    "createProjectForProfile 設 accessMode: WORKSPACE_VISIBLE",
    body.includes('accessMode: "WORKSPACE_VISIBLE"'),
    { body }
  )
  check(
    "解析不到 workspace 時丟錯而不是建私人專案",
    /if\s*\(!workspaceId\)\s*\{[\s\S]*?throw new ProjectWorkspaceBindingError\(\s*"no_workspace_membership"/.test(
      body
    ),
    { body }
  )

  // throw 必須排在 create 之前，否則「先建好再抱怨」等於沒擋。
  const throwAt = body.indexOf("no_workspace_membership")
  const createAt = body.indexOf("db.project.create(")
  check("workspace 解析失敗的 throw 排在 db.project.create 之前", throwAt >= 0 && throwAt < createAt, {
    throwAt,
    createAt,
  })

  // 全 src 掃一遍：任何 project.create 的 data 都必須帶 workspaceId。
  const offenders = []
  for (const file of walk("src")) {
    const text = read(file)
    let from = 0
    for (;;) {
      const at = text.indexOf("db.project.create(", from)
      if (at < 0) break
      const window = text.slice(at, at + 1200)
      if (!window.includes("workspaceId")) offenders.push(`${file}@${at}`)
      from = at + 1
    }
  }
  check("src 內每一處 db.project.create 都帶 workspaceId", offenders.length === 0, { offenders })
}

/* ------------------------------------------------------------------ */
/* 2. 沒有任何地方從呼叫端參數取 workspaceId 來建立專案                   */
/* ------------------------------------------------------------------ */

function caseNoClientSuppliedWorkspace() {
  const source = read(PROJECT_SERVICE)

  const inputType = functionBody(
    source,
    "export interface CreateProjectForProfileInput",
    "CreateProjectForProfileInput"
  )
  check("找得到 CreateProjectForProfileInput", Boolean(inputType), { file: PROJECT_SERVICE })
  check(
    "CreateProjectForProfileInput 沒有 workspaceId／accessMode／ownerId 欄位",
    Boolean(inputType) &&
      !/\bworkspaceId\b/.test(inputType) &&
      !/\baccessMode\b/.test(inputType) &&
      !/\bownerId\b/.test(inputType),
    { inputType }
  )

  const guard = functionBody(source, "function assertNoClientSuppliedScope(", "guard")
  check("有執行期守門：assertNoClientSuppliedScope", Boolean(guard), { file: PROJECT_SERVICE })
  check(
    "守門涵蓋 workspaceId／accessMode／ownerId 三個欄位",
    source.includes('const SERVER_RESOLVED_PROJECT_KEYS = ["workspaceId", "accessMode", "ownerId"]'),
    { file: PROJECT_SERVICE }
  )

  const createBody = functionBody(
    source,
    "export async function createProjectForProfile(",
    "createProjectForProfile"
  )
  check(
    "createProjectForProfile 第一件事就是守門",
    Boolean(createBody) && createBody.trimStart().startsWith("assertNoClientSuppliedScope(input)"),
    { createBody }
  )

  // 呼叫端（server action／route）不得把 workspaceId 塞進建立參數。
  const callSites = []
  for (const file of walk("src")) {
    if (path.resolve(file) === path.resolve(PROJECT_SERVICE)) continue
    const text = read(file)
    let from = 0
    for (;;) {
      const at = text.indexOf("createProjectForProfile(", from)
      if (at < 0) break
      const window = text.slice(at, at + 900)
      if (/\bworkspaceId\b/.test(window)) callSites.push(`${file}@${at}`)
      from = at + 1
    }
  }
  check("createProjectForProfile 的呼叫端都沒有傳 workspaceId", callSites.length === 0, { callSites })

  // 入口 zod schema 也不得收 workspaceId。
  const actions = path.join("src", "app", "actions", "work.ts")
  if (fs.existsSync(actions)) {
    const text = read(actions)
    const schema = functionBody(text, "const CreateProjectSchema = z.object(", "CreateProjectSchema")
    check(
      "CreateProjectSchema 不收 workspaceId／accessMode",
      Boolean(schema) && !/\bworkspaceId\b/.test(schema) && !/\baccessMode\b/.test(schema),
      { schema }
    )
  }

  // resolveOwnerWorkspaceId 必須走 membership，不得用公司名稱／slug 比對。
  const resolver = functionBody(
    read(CAPABILITY_SERVICE),
    "export async function resolveOwnerWorkspaceId(",
    "resolveOwnerWorkspaceId"
  )
  check("找得到 resolveOwnerWorkspaceId 的主體", Boolean(resolver), { file: CAPABILITY_SERVICE })
  check(
    "resolveOwnerWorkspaceId 走 WorkspaceMembership 關聯",
    Boolean(resolver) && resolver.includes("db.workspaceMembership.findMany("),
    { resolver }
  )
  check(
    "resolveOwnerWorkspaceId 沒有用名稱／slug 字串比對",
    Boolean(resolver) && !/\bname:/.test(resolver) && !/\bslug:/.test(resolver),
    { resolver }
  )
  check(
    "resolveOwnerWorkspaceId 只看 ACTIVE 的 membership 與 workspace",
    Boolean(resolver) &&
      resolver.includes('status: "ACTIVE"') &&
      resolver.includes('workspace: { status: "ACTIVE" }'),
    { resolver }
  )
  check(
    "resolveOwnerWorkspaceId 不把 GUEST 當成公司工作區的歸屬",
    Boolean(resolver) && resolver.includes('role: { in: ["OWNER", "ADMIN", "MEMBER"] }'),
    { resolver }
  )
}

/* ------------------------------------------------------------------ */
/* 3. ensureProjectWorkspaceBinding 冪等                               */
/* ------------------------------------------------------------------ */

function caseBindingIsIdempotent() {
  const source = read(PROJECT_SERVICE)
  const body = functionBody(
    source,
    "export async function ensureProjectWorkspaceBinding(",
    "ensureProjectWorkspaceBinding"
  )

  check("找得到 ensureProjectWorkspaceBinding 的主體", Boolean(body), { file: PROJECT_SERVICE })
  if (!body) return

  check(
    "綁定前先做擁有者精確比對",
    body.trimStart().startsWith("await assertCanAccessProject(profileId, projectId)"),
    { body }
  )
  check(
    "已綁定就原樣回傳，不重寫",
    /if\s*\(existing\.workspaceId\)\s*\{\s*return existing\.workspaceId/.test(body),
    { body }
  )
  check(
    "寫入條件限定 workspaceId IS NULL",
    /updateMany\(\{[\s\S]*?where:\s*\{\s*id:\s*projectId,\s*workspaceId:\s*null\s*\}/.test(body),
    { body }
  )
  check(
    "併發落敗時以資料庫現值為準，不覆寫",
    body.includes("if (bound.count === 1)") && body.includes("return current.workspaceId"),
    { body }
  )
}

/* ------------------------------------------------------------------ */
/* 4. 能力解析 deny-by-default（行為測試）                              */
/* ------------------------------------------------------------------ */

/**
 * 把純函式從 TS 原始碼裡取出來實例化。
 *
 * 三處型別標註用窄比對去掉，任何一處對不上就整支失敗 —— 與 v5
 * `source-patches.mjs` 的 `rep()` 同一個習慣：寧願吵鬧地壞掉，不要安靜地驗了個空。
 */
function instantiateCapabilityResolver() {
  const source = read(CAPABILITY_SERVICE)

  const allMatch = source.match(/export const ALL_PROJECT_CAPABILITIES[^=]*=\s*(\[[\s\S]*?\n\])/)
  const tableMatch = source.match(/export const PROJECT_CAPABILITY_BY_ROLE[^=]*=\s*(\{[\s\S]*?\n\})/)

  if (!allMatch || !tableMatch) {
    return { error: "取不到 ALL_PROJECT_CAPABILITIES / PROJECT_CAPABILITY_BY_ROLE 的字面值" }
  }

  const all = new Function(`return ${allMatch[1]}`)()
  const table = new Function(`return ${tableMatch[1]}`)()

  const signature =
    "export function capabilitiesFromAccessFacts(facts: ProjectAccessFacts): Set<ProjectCapability> {"
  if (!source.includes(signature)) {
    return { error: "capabilitiesFromAccessFacts 的簽章變了，純函式取不出來" }
  }

  let body = functionBody(source, signature, "capabilitiesFromAccessFacts")
  if (!body) return { error: "取不到 capabilitiesFromAccessFacts 的主體" }

  if (!body.includes("new Set<ProjectCapability>()")) {
    return { error: "主體裡找不到 new Set<ProjectCapability>()，型別剝除的假設不成立" }
  }
  body = body.replaceAll("new Set<ProjectCapability>()", "new Set()")

  const leftovers = body.match(/<ProjectCapability>|: ProjectAccessFacts/g)
  if (leftovers) {
    return { error: `主體裡還有剝不掉的型別語法：${leftovers.join(", ")}` }
  }

  const fn = new Function(
    "ALL_PROJECT_CAPABILITIES",
    "PROJECT_CAPABILITY_BY_ROLE",
    "facts",
    body
  )

  return {
    all,
    table,
    resolve: (facts) => fn(all, table, facts),
    initialisesEmpty: /^\s*const granted = new Set\(\)/m.test(body),
    body,
  }
}

const BASE_FACTS = {
  isOwner: false,
  hasWorkspace: true,
  accessMode: "WORKSPACE_VISIBLE",
  workspaceDefaultRole: "VIEWER",
  membershipRole: null,
  grantRole: null,
}

function sorted(set) {
  return [...set].sort()
}

function caseCapabilityResolver() {
  const harness = instantiateCapabilityResolver()
  if (harness.error) {
    check("能力解析純函式可實例化", false, harness.error)
    return
  }
  check("能力解析純函式可實例化", true)

  const { resolve, all, table } = harness

  check("granted 從空集合起算（deny-by-default 的起點）", harness.initialisesEmpty, {
    head: harness.body.slice(0, 120),
  })

  check(
    "ALL_PROJECT_CAPABILITIES 就是契約上那八條",
    JSON.stringify([...all].sort()) === JSON.stringify([...EXPECTED_CAPABILITIES].sort()),
    { all }
  )

  // 核心：沒有 ownership／membership／grant 時必須是空集合。
  check(
    "沒有 ownership／membership／grant → 空集合",
    resolve({ ...BASE_FACTS }).size === 0,
    sorted(resolve({ ...BASE_FACTS }))
  )
  check(
    "沒綁 workspace 的專案，非擁有者拿不到任何能力",
    resolve({ ...BASE_FACTS, hasWorkspace: false, membershipRole: "ADMIN" }).size === 0,
    sorted(resolve({ ...BASE_FACTS, hasWorkspace: false, membershipRole: "ADMIN" }))
  )
  check(
    "PRIVATE 專案沒有 grant → 空集合（成員身分不構成隱含可見性）",
    resolve({ ...BASE_FACTS, accessMode: "PRIVATE", membershipRole: "MEMBER" }).size === 0,
    sorted(resolve({ ...BASE_FACTS, accessMode: "PRIVATE", membershipRole: "MEMBER" }))
  )
  check(
    "GUEST 沒有明確 grant → 空集合",
    resolve({ ...BASE_FACTS, membershipRole: "GUEST" }).size === 0,
    sorted(resolve({ ...BASE_FACTS, membershipRole: "GUEST" }))
  )
  check(
    "角色對照表查不到的角色 → 空集合，不是整包放行",
    resolve({ ...BASE_FACTS, membershipRole: "MEMBER", grantRole: "SOMETHING_NEW" }).size === 0,
    sorted(resolve({ ...BASE_FACTS, membershipRole: "MEMBER", grantRole: "SOMETHING_NEW" }))
  )

  // 擁有者精確比對：第一條規則，八條全開，且不依賴 workspace／membership。
  const ownerNoWorkspace = resolve({
    ...BASE_FACTS,
    isOwner: true,
    hasWorkspace: false,
    accessMode: "PRIVATE",
  })
  check(
    "擁有者八條全開，且不因為沒綁 workspace 而變窄（既有行為不得被收緊）",
    JSON.stringify(sorted(ownerNoWorkspace)) === JSON.stringify([...EXPECTED_CAPABILITIES].sort()),
    sorted(ownerNoWorkspace)
  )

  // 逐條放行的形狀。
  const viewer = resolve({ ...BASE_FACTS, membershipRole: "MEMBER", workspaceDefaultRole: "VIEWER" })
  check(
    "WORKSPACE_VISIBLE ＋ 預設 VIEWER → 只有讀，沒有任何 write",
    sorted(viewer).join(",") === "chat:read,drive:read,project:read",
    sorted(viewer)
  )

  const commenter = resolve({
    ...BASE_FACTS,
    membershipRole: "MEMBER",
    grantRole: "COMMENTER",
  })
  check(
    "COMMENTER 只多一條 chat:write",
    sorted(commenter).join(",") === "chat:read,chat:write,drive:read,project:read",
    sorted(commenter)
  )

  const editor = resolve({ ...BASE_FACTS, accessMode: "PRIVATE", membershipRole: "MEMBER", grantRole: "EDITOR" })
  check(
    "PRIVATE 專案的明確 EDITOR grant 進得來，且八條全開",
    JSON.stringify(sorted(editor)) === JSON.stringify([...EXPECTED_CAPABILITIES].sort()),
    sorted(editor)
  )

  const admin = resolve({ ...BASE_FACTS, membershipRole: "ADMIN" })
  check(
    "工作區 ADMIN 在 WORKSPACE_VISIBLE 專案上視為 MANAGER",
    JSON.stringify(sorted(admin)) === JSON.stringify([...sorted(new Set(table.MANAGER))]),
    sorted(admin)
  )

  const narrowedAdmin = resolve({ ...BASE_FACTS, membershipRole: "ADMIN", grantRole: "VIEWER" })
  check(
    "明確 grant 勝過隱含放行（ADMIN 被發 VIEWER 就只有 VIEWER）",
    sorted(narrowedAdmin).join(",") === "chat:read,drive:read,project:read",
    sorted(narrowedAdmin)
  )

  // 對照表本身的衛生檢查。
  check(
    "VIEWER 不含任何 write 能力",
    table.VIEWER.every((capability) => !capability.endsWith(":write")),
    table.VIEWER
  )
  const unknown = Object.entries(table).flatMap(([role, caps]) =>
    caps.filter((capability) => !EXPECTED_CAPABILITIES.includes(capability)).map((c) => `${role}:${c}`)
  )
  check("對照表沒有契約外的能力字串", unknown.length === 0, { unknown })

  // 契約簽章必須在（另一個 agent 的 drive route 直接 import 它們）。
  const source = read(CAPABILITY_SERVICE)
  for (const signature of [
    "export async function assertProjectCapability(",
    "export async function resolveProjectCapabilities(",
    "export async function resolveOwnerWorkspaceId(",
  ]) {
    check(`契約簽章存在：${signature.replace("export async function ", "").replace("(", "")}`,
      source.includes(signature), { file: CAPABILITY_SERVICE })
  }
  check(
    "assert 失敗時丟帶 code 的錯誤，不是字串",
    source.includes("export class ProjectCapabilityError extends Error") &&
      source.includes("readonly code: ProjectCapabilityErrorCode"),
    { file: CAPABILITY_SERVICE }
  )
  check(
    "membership／grant 查詢都只認 ACTIVE",
    (read(CAPABILITY_SERVICE).match(/status: "ACTIVE"/g) || []).length >= 3,
    { count: (read(CAPABILITY_SERVICE).match(/status: "ACTIVE"/g) || []).length }
  )
}

/* ------------------------------------------------------------------ */
/* 5. lifecycleStage 推導                                              */
/* ------------------------------------------------------------------ */

function caseLifecycleDerivation() {
  for (const testCase of LIFECYCLE_SELF_TEST_CASES) {
    const actual = deriveLifecycleStage(testCase.row)
    check(
      `lifecycleStage：${testCase.label}`,
      actual.stage === testCase.expected.stage && actual.rule === testCase.expected.rule,
      { expected: testCase.expected, actual }
    )
  }

  const stages = new Set(LIFECYCLE_STAGES)
  const offenders = LIFECYCLE_SELF_TEST_CASES.map((c) => deriveLifecycleStage(c.row).stage).filter(
    (stage) => !stages.has(stage)
  )
  check("推導結果都在 ProjectLifecycleStage 的五個值之內", offenders.length === 0, { offenders })

  // 回填腳本不得預設寫入。
  const backfill = read(path.join("scripts", "backfill-project-lifecycle-stage.mjs"))
  check(
    "回填腳本預設 dry-run：沒有 --apply 不會寫",
    /if\s*\(!apply\)\s*\{[\s\S]*?dry-run：沒有發出任何 UPDATE/.test(backfill),
    { file: "scripts/backfill-project-lifecycle-stage.mjs" }
  )
  check(
    "--apply 另外要求確認字串才會動正式資料庫",
    backfill.includes("PERSONAL_OS_BACKFILL_CONFIRM !== CONFIRMATION_TEXT"),
    { file: "scripts/backfill-project-lifecycle-stage.mjs" }
  )
  check(
    "回填只寫 projects.lifecycle_stage，不碰 deal_stage／operating_status",
    /update projects\s*\n\s*set lifecycle_stage/.test(backfill) &&
      !/set\s+deal_stage|set\s+operating_status|update operating_project_profiles/.test(backfill),
    { file: "scripts/backfill-project-lifecycle-stage.mjs" }
  )
}

/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
      walk(full, out)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

caseCreateAlwaysBinds()
caseNoClientSuppliedWorkspace()
caseBindingIsIdempotent()
caseCapabilityResolver()
caseLifecycleDerivation()

console.log(failures ? `\n${failures} failing` : "\nproject capability: all checks passed")
process.exit(failures ? 1 : 0)
