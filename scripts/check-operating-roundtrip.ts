/**
 * 寫進去，再讀回來 —— 營運工作台持久化的整合測試（PLN-074 M7）。
 *
 * 在這之前所有驗證都停在契約層與 schema 層：diff 正確、欄位名存在。
 * 沒有一條測試真的把一筆紀錄寫進資料庫再讀出來比對，而那正是最容易壞的一段：
 * 寫入端的欄位對應與讀取端的欄位對應是兩份分開的程式，任一邊改了名字，
 * 型別檢查不會抱怨，畫面只會安靜地少一塊。
 *
 * 安全護欄沿用 work-refresh-proof 的形狀：預設拒絕執行，要三個環境變數同時到齊，
 * 而且只接受本機／明確標示為可拋棄的目標。正式資料庫不是測試場。
 *
 *   OPERATING_PROOF_DATABASE_URL=postgresql://localhost:5432/operating_proof \
 *   PERSONAL_OS_OPERATING_PROOF_ALLOW_WRITES=1 \
 *   PERSONAL_OS_OPERATING_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA \
 *   pnpm ops:roundtrip
 */
import { createHash } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres", "db"]

function refuse(reasons: string[]): never {
  console.error("operating roundtrip proof refused to run:\n")
  for (const reason of reasons) console.error("  - " + reason)
  console.error("\n請對可拋棄的資料庫執行：")
  console.error("  OPERATING_PROOF_DATABASE_URL=postgresql://localhost:5432/operating_proof \\")
  console.error("  PERSONAL_OS_OPERATING_PROOF_ALLOW_WRITES=1 \\")
  console.error(`  PERSONAL_OS_OPERATING_PROOF_CONFIRM=${CONFIRMATION_TEXT} \\`)
  console.error("  pnpm ops:roundtrip")
  process.exit(1)
}

function resolveTarget(): string {
  const reasons: string[] = []
  const url = process.env.OPERATING_PROOF_DATABASE_URL

  if (!url) reasons.push("OPERATING_PROOF_DATABASE_URL is missing.")
  if (process.env.PERSONAL_OS_OPERATING_PROOF_ALLOW_WRITES !== "1") {
    reasons.push("PERSONAL_OS_OPERATING_PROOF_ALLOW_WRITES=1 is missing.")
  }
  if (process.env.PERSONAL_OS_OPERATING_PROOF_CONFIRM !== CONFIRMATION_TEXT) {
    reasons.push(`PERSONAL_OS_OPERATING_PROOF_CONFIRM=${CONFIRMATION_TEXT} is missing.`)
  }

  if (url) {
    let host = ""
    try {
      host = new URL(url).hostname
    } catch {
      reasons.push("OPERATING_PROOF_DATABASE_URL is not a valid URL.")
    }
    const isLocal = LOCAL_HOSTS.includes(host)
    const allowRemote = process.env.PERSONAL_OS_OPERATING_PROOF_ALLOW_REMOTE === "1"
    if (host && !isLocal && !allowRemote) {
      // 遠端目標幾乎都是正式庫。要打遠端必須再明說一次。
      reasons.push(`target host "${host}" is not local; set PERSONAL_OS_OPERATING_PROOF_ALLOW_REMOTE=1 only for a disposable remote database.`)
    }
    // 比對主機＋資料庫名，而不是整串 URL：同一個資料庫換一個環境變數名
    // （DIRECT_DATABASE_URL 之類）字串就不同，而那正是這道防線第一次被繞過的方式。
    // 這一條刻意不受 ALLOW_REMOTE 影響 —— 「可拋棄的遠端」和「正式庫」是兩回事。
    const identity = (value: string | undefined) => {
      if (!value) return null
      try {
        const parsed = new URL(value)
        return `${parsed.hostname}${parsed.pathname}`
      } catch {
        return null
      }
    }
    const proofIdentity = identity(url)
    for (const name of ["DATABASE_URL", "DIRECT_URL", "DIRECT_DATABASE_URL"]) {
      if (proofIdentity && identity(process.env[name]) === proofIdentity) {
        reasons.push(`OPERATING_PROOF_DATABASE_URL points at the same database as ${name}; the runtime database is not a test target.`)
      }
    }
  }

  if (reasons.length) refuse(reasons)
  return url as string
}

const target = resolveTarget()
process.env.DATABASE_URL = target

// 連線位置靠上面那行 DATABASE_URL 指派決定；服務層的 @/lib/db 是動態 import，
// 在那之後才初始化，所以兩邊指到同一個資料庫。
const _pool = new Pool({ connectionString: target })
const _adapter = new PrismaPg(_pool)
const db = new PrismaClient({ adapter: _adapter })

let checks = 0
let failed = 0

function check(name: string, condition: boolean, detail = "") {
  checks += 1
  if (!condition) {
    failed += 1
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
}

const SLUG = `operating-roundtrip-proof-${Date.now()}`

// 這裡刻意沒有一個「清空 workspace」的函式。
//
// 這支測試跑在正式的 yzedtech workspace 上（服務用固定 slug，不接受注入），
// 所以任何以 workspaceId 為條件的 deleteMany 都等於清空正式資料。
// 收尾只刪本次寫入的那幾列，用 workbenchRef 精確定位 —— 見 main() 的 finally。

async function main() {
  const { applyOperatingCommands, OPERATING_WORKSPACE_SLUG } = await import(
    "../src/lib/services/operating-commands.service"
  )
  const { loadOperatingStore } = await import("../src/lib/services/operating-store.service")
  const { DEFAULT_ORG_KEY } = await import("../src/lib/services/operating-settings.service")

  // 找到服務真正使用的 workspace（yzedtech）
  const ws = await db.workspace.findUnique({
    where: { slug: OPERATING_WORKSPACE_SLUG },
    select: { id: true },
  })
  if (!ws) {
    console.error(`operating workspace "${OPERATING_WORKSPACE_SLUG}" not found — run the app first to initialize it.`)
    process.exit(1)
  }
  const workspaceId = ws.id

  // 找到 yz 這個 actor 對應的 profile（服務的 buildActorMap 也是這樣做）
  const { getYuanzhanSeats } = await import("../src/lib/auth/yuanzhan-actor")
  const seats = getYuanzhanSeats()
  const yzSeat = seats.find((s) => s.actor === "yz")
  if (!yzSeat) {
    console.error('yuanzhan seat "yz" not found in getYuanzhanSeats()')
    process.exit(1)
  }
  const yzProfile = await db.profile.findFirst({
    where: { email: yzSeat.email },
    select: { id: true, email: true },
  })
  if (!yzProfile) {
    console.error(`profile for yz seat (${yzSeat.email}) not found in DB — seed data needed.`)
    process.exit(1)
  }

  // 讀取當前真實版本，避免 version conflict
  const versionRow = await db.organizationSetting.findUnique({
    where: { orgKey_key: { orgKey: DEFAULT_ORG_KEY, key: "operating.version" } },
    select: { value: true },
  })
  const baseVersion = typeof versionRow?.value === "number" ? versionRow.value : 0

  // 時間戳後綴 → clientRef 唯一（audit_events unique: actorRef + action + requestRef）
  const ts = Date.now()
  const REF_GOAL = `rt-goal-${ts}`
  const REF_OCC = `rt-occasion-${ts}`
  const REF_TXN = `rt-txn-${ts}`
  const REF_JOURNAL = `rt-journal-${ts}`
  const REF_REPLAY = `rt-replay-${ts}`
  const REF_DELETE = `rt-delete-${ts}`
  // 資料 ID 也加時間戳，避免已存在的同名 row 干擾斷言
  const GOAL_ID = `G-RT-${ts}`
  const OCC_ID = `OCC-RT-${ts}`
  const TXN_ID = `T-RT-${ts}`
  const JOURNAL_DATE = `2026-10-18` // 日誌 key 固定；只驗資料，不驗 count

  const user = { id: yzProfile.id, email: yzProfile.email, role: "OWNER" as const }
  const seat = { email: yzProfile.email, actor: "yz" as const, role: "owner" as const, canSwitchActor: false }

  try {
    const result = await applyOperatingCommands(user, seat, baseVersion, [
      {
        clientRef: REF_GOAL,
        op: "create",
        ent: "目標",
        label: GOAL_ID,
        changes: [
          {
            collection: "goals",
            id: GOAL_ID,
            op: "create",
            after: { id: GOAL_ID, t: "整合測試目標", period: "2026 Q4", pct: 42 },
          },
        ],
      },
      {
        clientRef: REF_OCC,
        op: "create",
        ent: "活動",
        label: OCC_ID,
        changes: [
          {
            collection: "occasions",
            id: OCC_ID,
            op: "create",
            after: { id: OCC_ID, title: "月營運會議", cat: "公司活動", onDate: "2026-10-18", star: true },
          },
        ],
      },
      {
        clientRef: REF_TXN,
        op: "create",
        ent: "交易",
        label: TXN_ID,
        changes: [
          {
            collection: "txns",
            id: TXN_ID,
            op: "create",
            after: {
              id: TXN_ID,
              d: "2026-10-02",
              t: "雲端主機",
              p: "PRJ-RT",
              cat: "工具",
              amt: -4200,
              pass: false,
              v: ["發票"],
              note: "月費",
            },
          },
        ],
      },
      {
        clientRef: REF_JOURNAL,
        op: "update",
        ent: "日誌",
        label: JOURNAL_DATE,
        changes: [
          {
            collection: "journal",
            id: JOURNAL_DATE,
            op: "create",
            after: {
              title: "整合測試日誌",
              blocks: [{ id: `b-${ts}`, t: "p", text: "整合測試" }],
              visibility: "company",
            },
          },
        ],
      },
    ])

    eq("all four commands applied", result.applied.length, 4)
    eq("nothing was rejected", result.rejected, [])
    check("version advanced", result.version > baseVersion, `version=${result.version}`)

    // ── store 讀取驗證（在 replay 之前，goal 仍是初始寫入的值）──────────────
    type Row = Record<string, unknown>
    const store = (await loadOperatingStore(workspaceId, yzProfile.id)) as Record<
      string,
      Row[] | Record<string, Row>
    >
    const rows = (key: string): Row[] => (Array.isArray(store[key]) ? (store[key] as Row[]) : [])

    const goal = rows("goals").find((g) => g.id === GOAL_ID)
    check("goal survives the round trip", Boolean(goal))
    eq("goal title is unchanged", goal?.t, "整合測試目標")
    eq("goal progress is unchanged", goal?.pct, 42)

    const occasion = rows("occasions").find((o) => o.id === OCC_ID)
    check("occasion survives the round trip", Boolean(occasion))
    eq("occasion date is unchanged", occasion?.onDate, "2026-10-18")
    eq("occasion category maps back to its label", occasion?.cat, "公司活動")
    eq("occasion star is unchanged", occasion?.star, true)

    const txn = rows("txns").find((t) => t.id === TXN_ID)
    check("transaction survives the round trip", Boolean(txn))
    eq("amount keeps its sign", txn?.amt, -4200)
    eq("vouchers survive", txn?.v, ["發票"])
    eq("pass-through flag survives", txn?.pass, false)

    const journal = (store.journal ?? {}) as Record<string, Row>
    const entry = journal[JOURNAL_DATE]
    check("journal day survives the round trip", Boolean(entry))

    // ── upsert 冪等：同一個 workbenchRef 再送一次不該新增第二 row ──────────
    const replay = await applyOperatingCommands(user, seat, result.version, [
      {
        clientRef: REF_GOAL,
        op: "create",
        ent: "目標",
        label: GOAL_ID,
        changes: [
          {
            collection: "goals",
            id: GOAL_ID,
            op: "create",
            after: { id: GOAL_ID, t: "不該新增 row", period: "x", pct: 0 },
          },
        ],
      },
    ])
    check("replaying a command is accepted", replay.applied.length >= 1)
    eq(
      "goal row count stays at one for this id",
      await db.operatingGoal.count({ where: { workspaceId, workbenchRef: GOAL_ID } }),
      1,
    )
    // ARC-042 §5 承諾「重送同一個 clientRef 不會產生第二列」，而那句話的實質內容是
    // 「不會被重放」。上面只驗了列數，upsert 本來就不會多一列 —— 真正要驗的是
    // 重送的內容沒有蓋掉原本的值。
    const replayedGoal = await db.operatingGoal.findFirst({ where: { workspaceId, workbenchRef: GOAL_ID } })
    eq("a replayed command does not overwrite the original", replayedGoal?.title, "整合測試目標")
    eq(
      "a replayed command is logged only once",
      await db.operatingCommandLog.count({
        where: { workspaceId, clientRefHash: createHash("sha256").update(REF_GOAL).digest("hex") },
      }),
      1,
    )

    // 刪除也要能往返
    const deleted = await applyOperatingCommands(user, seat, replay.version, [
      {
        clientRef: REF_DELETE,
        op: "delete",
        ent: "目標",
        label: GOAL_ID,
        changes: [{ collection: "goals", id: GOAL_ID, op: "delete" }],
      },
    ])
    eq("delete command applied", deleted.applied, [REF_DELETE])
    const afterDelete = (await loadOperatingStore(workspaceId, yzProfile.id)) as Record<string, Row[]>
    check("deleted goal is gone on read", !(afterDelete.goals ?? []).some((g) => g.id === GOAL_ID))
  } finally {
    // cleanup：只刪本次測試寫入的 goal/occasion/txn/journal 資料行
    await db.operatingGoal.deleteMany({
      where: { workspaceId, workbenchRef: GOAL_ID },
    }).catch(() => {})
    await db.occasion.deleteMany({
      where: { workspaceId, workbenchRef: OCC_ID },
    }).catch(() => {})
    await db.operatingCommandLog.deleteMany({
      where: {
        workspaceId,
        clientRefHash: {
          in: [REF_GOAL, REF_OCC, REF_TXN, REF_JOURNAL, REF_REPLAY, REF_DELETE].map((ref) =>
            createHash("sha256").update(ref).digest("hex"),
          ),
        },
      },
    }).catch(() => {})
    await db.operatingTransaction.deleteMany({
      where: { workspaceId, workbenchRef: TXN_ID },
    }).catch(() => {})
    await db.$disconnect()
    await _pool.end().catch(() => {})
  }

  if (failed > 0) {
    console.error(`\noperating roundtrip: ${failed} of ${checks} checks FAILED`)
    process.exit(1)
  }
  console.log(`operating roundtrip: ${checks} checks PASS against ${new URL(target).hostname}`)
}

main().catch(async (error) => {
  console.error("operating roundtrip crashed:", error)
  await db.$disconnect().catch(() => {})
  await _pool.end().catch(() => {})
  process.exit(1)
})
