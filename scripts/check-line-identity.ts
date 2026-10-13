/**
 * LINE webhook 收件匣與成員綁定的整合測試（AUT-010 §11 的 S1 · LINESIG-S1）。
 *
 * 真的寫進資料庫再讀出來；LINE 那一頭換成假的（測試不該真的打 LINE）。
 * 護欄與 check-operating-roundtrip 相同：三個環境變數同時到齊、只接受本機目標、
 * 而且不能與執行期的資料庫是同一個。
 *
 *   OPERATING_PROOF_DATABASE_URL=postgresql://postgres@127.0.0.1:5544/operating_proof pnpm ops:proof:migrate
 *   OPERATING_PROOF_DATABASE_URL=postgresql://postgres@127.0.0.1:5544/operating_proof \
 *   PERSONAL_OS_OPERATING_PROOF_ALLOW_WRITES=1 \
 *   PERSONAL_OS_OPERATING_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA \
 *   pnpm ops:line:proof
 */
import "./load-local-env"

import { createHmac, randomUUID } from "node:crypto"

const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"]

function resolveTarget(): string {
  const reasons: string[] = []
  const url = process.env.OPERATING_PROOF_DATABASE_URL
  if (!url) reasons.push("OPERATING_PROOF_DATABASE_URL is missing.")
  if (process.env.PERSONAL_OS_OPERATING_PROOF_ALLOW_WRITES !== "1") reasons.push("PERSONAL_OS_OPERATING_PROOF_ALLOW_WRITES=1 is missing.")
  if (process.env.PERSONAL_OS_OPERATING_PROOF_CONFIRM !== CONFIRMATION_TEXT) reasons.push(`PERSONAL_OS_OPERATING_PROOF_CONFIRM=${CONFIRMATION_TEXT} is missing.`)
  const identity = (value: string | undefined) => {
    if (!value) return null
    try {
      const parsed = new URL(value)
      return `${parsed.hostname}${parsed.pathname}`
    } catch {
      return null
    }
  }
  if (url) {
    let host = ""
    try {
      host = new URL(url).hostname
    } catch {
      reasons.push("OPERATING_PROOF_DATABASE_URL is not a valid URL.")
    }
    // 這支會清空三張 LINE 表，所以只接受本機，沒有「可拋棄的遠端」這個選項。
    if (host && !LOCAL_HOSTS.includes(host)) reasons.push(`target host "${host}" is not local.`)
    for (const name of ["DATABASE_URL", "DIRECT_URL", "DIRECT_DATABASE_URL"]) {
      if (identity(process.env[name]) === identity(url)) reasons.push(`OPERATING_PROOF_DATABASE_URL points at the same database as ${name}.`)
    }
  }
  if (reasons.length) {
    console.error("line identity proof refused to run:\n" + reasons.map((r) => "  - " + r).join("\n"))
    process.exit(1)
  }
  return url as string
}

const target = resolveTarget()
process.env.DATABASE_URL = target
process.env.DIRECT_DATABASE_URL = target
process.env.DIRECT_URL = target
const SECRET = "proof-channel-secret-" + randomUUID()
process.env.LINE_CHANNEL_SECRET = SECRET
process.env.LINE_CHANNEL_ACCESS_TOKEN = "proof-access-token"
process.env.YUANZHAN_SEATS = "line-proof-yz@example.test:yz,line-proof-lily@example.test:lily,line-proof-shared@example.test:yz:switch"

let pass = 0
let fail = 0
function check(label: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else fail++
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || detail === undefined ? "" : "   → " + (typeof detail === "string" ? detail : JSON.stringify(detail))}`)
}

async function main() {
  const { db } = await import("../src/lib/db")
  const svc = await import("../src/lib/services/line-identity.service")
  const { resolveYuanzhanSeat } = await import("../src/lib/auth/yuanzhan-actor")
  const { LINE_TEXT } = await import("../src/lib/line/line-webhook-contract")

  await db.lineWebhookEvent.deleteMany({})
  await db.lineBindCode.deleteMany({})
  await db.lineIdentity.deleteMany({})

  const profile = async (email: string) => {
    const row = await db.profile.upsert({ where: { email }, create: { email }, update: {}, select: { id: true, email: true, role: true } })
    return row
  }
  const yzUser = await profile("line-proof-yz@example.test")
  const lilyUser = await profile("line-proof-lily@example.test")
  const yz = resolveYuanzhanSeat(yzUser.email)!
  const lily = resolveYuanzhanSeat(lilyUser.email)!
  const shared = resolveYuanzhanSeat("line-proof-shared@example.test")!

  // 假的 LINE：記下系統說了什麼、對誰說。
  const calls: Array<{ fn: string; to: string; text?: string }> = []
  let pushOk = true
  const api = {
    replyText: async (to: string, text: string) => (calls.push({ fn: "reply", to, text }), true),
    pushText: async (to: string, text: string) => (calls.push({ fn: "push", to, text }), pushOk),
    getProfile: async (userId: string) => ({ displayName: userId === "U_A" ? "王小明" : "另一個人", pictureUrl: "https://profile.line-scdn.net/pic" }),
    getBotInfo: async () => ({ basicId: "@proofbot", displayName: "圓展 OS" }),
    getQuota: async () => ({ limit: 200, used: 46 }),
    leaveGroup: async (kind: "group" | "room", id: string) => (calls.push({ fn: "leave", to: `${kind}:${id}` }), true),
  }

  let seq = 0
  const event = (type: string, source: Record<string, string>, extra: Record<string, unknown> = {}) => ({
    type, mode: "active", timestamp: Date.now(), webhookEventId: `proof-${++seq}-${randomUUID()}`,
    deliveryContext: { isRedelivery: false }, source, replyToken: `rt-${seq}`, ...extra,
  })
  const text = (userId: string, value: string) => event("message", { type: "user", userId }, { message: { type: "text", id: `m${seq}`, text: value } })
  const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("base64")
  const deliver = async (events: unknown[], signature?: string | null) => {
    const body = JSON.stringify({ destination: "Ubot", events })
    const receipt = await svc.receiveLineWebhook(body, signature === undefined ? sign(body) : signature)
    const done = await svc.processLineInbox({ api })
    return { ...receipt, processed: done.processed, body }
  }
  const outcomeOf = async (e: { webhookEventId: string }) => (await db.lineWebhookEvent.findUnique({ where: { webhookEventId: e.webhookEventId } }))?.outcome
  const recipients = async () => (await svc.listPushRecipients()).map((r) => r.actorKey).sort().join()
  const fails = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      return "no error"
    } catch (error) {
      return error instanceof svc.LineActionError ? error.code : "unexpected:" + String(error)
    }
  }

  /* ── 1. 簽章 ─────────────────────────────────────────── */
  const bad = await deliver([text("U_A", "哈囉")], "AAAA")
  const missing = await deliver([text("U_A", "哈囉")], null)
  check("簽章錯誤或缺少：不接受、不寫入任何列", !bad.accepted && !missing.accepted && (await db.lineWebhookEvent.count()) === 0)
  check("簽章錯誤：系統沒有對任何人說話", calls.length === 0)

  const verify = await deliver([])
  check("LINE 後台的 Verify（空事件）：接受並留一列 verify", verify.accepted && (await db.lineWebhookEvent.count({ where: { eventType: "verify" } })) === 1)
  check("狀態：webhook 通了、看得到官方帳號", await svc.getLineStatus(yz, { api }).then((s) => s.configured && !!s.lastWebhookAt && s.bot?.basicId === "@proofbot" && s.me.state === "none"))

  /* ── 2. 代碼 ─────────────────────────────────────────── */
  check("共用帳號不能產生代碼", (await fails(() => svc.createBindCode(shared, yzUser))) === "shared_seat")
  const first = await svc.createBindCode(yz, yzUser)
  const stored = await db.lineBindCode.findMany()
  check("代碼：資料庫只有雜湊，沒有原值", stored.length === 1 && !JSON.stringify(stored).toUpperCase().includes(first.code.slice(3).replace("-", "")) && !JSON.stringify(stored).includes(first.code))
  check("狀態：等待代碼", await svc.getLineStatus(yz, { api }).then((s) => s.me.state === "code" && !!s.me.codeExpiresAt))

  const groupTry = event("message", { type: "group", groupId: "C_1", userId: "U_A" }, { message: { type: "text", id: "g1", text: first.code } })
  await deliver([groupTry])
  check("在群組裡傳代碼：無效，代碼沒有被用掉", (await outcomeOf(groupTry)) === "group_ignored" && (await db.lineIdentity.count()) === 0 && (await db.lineBindCode.count({ where: { usedAt: null } })) === 1)

  const wrong = text("U_A", "YZ-AAAA-BBBB")
  await deliver([wrong])
  check("錯的代碼：不產生綁定，回覆固定文字", (await outcomeOf(wrong)) === "code_bad" && (await db.lineIdentity.count()) === 0 && calls.at(-1)?.text === LINE_TEXT.codeInvalid)

  const chat = text("U_A", "今天天氣不錯")
  await deliver([chat])
  check("一般聊天：不算嘗試、bot 不回話", (await outcomeOf(chat)) === "ignored" && calls.filter((c) => c.fn === "reply").length === 1)

  const right = text("U_A", " " + first.code.toLowerCase() + " ")
  const before = calls.length
  const d1 = await deliver([right])
  check("對的代碼（小寫、帶空白）：進到等待確認", (await outcomeOf(right)) === "code_ok" && d1.stored === 1 && calls.at(-1)?.text === LINE_TEXT.codeAccepted)
  const pending = await svc.getLineStatus(yz, { api })
  check("狀態：等待確認，帶出 LINE 的名字與頭像", pending.me.state === "pending" && pending.me.displayName === "王小明" && !!pending.me.pictureUrl)
  check("代碼正確但網站未確認：推播名單沒有這個人", (await recipients()) === "")
  check("回應裡沒有 LINE userId", !JSON.stringify(pending).includes("U_A"))

  const again = await svc.receiveLineWebhook(d1.body, sign(d1.body))
  await svc.processLineInbox({ api })
  check("同一個 webhookEventId 重送：不新增列、只處理一次", again.accepted && again.stored === 0 && calls.length === before + 1)

  const row = await db.lineWebhookEvent.findUnique({ where: { webhookEventId: right.webhookEventId } })
  check("收件匣：沒有訊息內文、沒有代碼原值，處理後 replyToken 已拿掉", !!row && !JSON.stringify(row.payload).toUpperCase().includes(first.code.slice(3).replace("-", "")) && !("replyToken" in (row.payload as object)) && !("text" in ((row.payload as { message?: object }).message ?? {})))

  const reuse = text("U_B", first.code)
  await deliver([reuse])
  check("用過的代碼：別人再用無效", (await outcomeOf(reuse)) === "code_bad" && (await db.lineIdentity.count()) === 1)

  /* ── 3. 網站確認 ─────────────────────────────────────── */
  check("別人不能替你按「是我」", (await fails(() => svc.confirmBinding(lily, lilyUser, { api }))) === "nothing_pending" && (await recipients()) === "")
  const confirmed = await svc.confirmBinding(yz, yzUser, { api })
  check("本人確認：綁定成立、進入推播名單、送一則固定文字", confirmed.notified && (await recipients()) === "yz" && calls.at(-1)?.fn === "push" && calls.at(-1)?.to === "U_A" && calls.at(-1)?.text === LINE_TEXT.linked)
  check("稽核：留下「連結成立」，不含 userId", await db.operatingCommandLog.findFirst({ where: { entity: "LINE 連結", op: "create" }, orderBy: { createdAt: "desc" } }).then((a) => !!a && a.actorKey === "yz" && !JSON.stringify(a).includes("U_A")))
  check("已連結時不能再產生代碼（要先解除）", (await fails(() => svc.createBindCode(yz, yzUser))) === "already_linked")
  check("重複確認無效", (await fails(() => svc.confirmBinding(yz, yzUser, { api }))) === "nothing_pending")

  /* ── 4. 過期、搶帳號 ─────────────────────────────────── */
  const expired = await svc.createBindCode(lily, lilyUser)
  await db.lineBindCode.updateMany({ where: { actorKey: "lily", usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } })
  const late = text("U_B", expired.code)
  await deliver([late])
  check("過期的代碼：不產生綁定", (await outcomeOf(late)) === "code_bad" && (await db.lineIdentity.count({ where: { actorKey: "lily" } })) === 0)

  const lilyCode = await svc.createBindCode(lily, lilyUser)
  const steal = text("U_A", lilyCode.code)
  await deliver([steal])
  check("已連結到別人的 LINE 帳號：不能再綁到第二個席位", (await outcomeOf(steal)) === "code_conflict" && calls.at(-1)?.text === LINE_TEXT.codeConflict && (await db.lineIdentity.count({ where: { actorKey: "lily" } })) === 0)

  const lilyCode2 = await svc.createBindCode(lily, lilyUser)
  await deliver([text("U_B", lilyCode2.code)])
  await db.lineIdentity.updateMany({ where: { actorKey: "lily" }, data: { pendingExpiresAt: new Date(Date.now() - 1000) } })
  check("等待確認超過 10 分鐘：確認無效，狀態回到未連結", (await fails(() => svc.confirmBinding(lily, lilyUser, { api }))) === "nothing_pending" && (await svc.getLineStatus(lily, { api })).me.state === "none" && (await recipients()) === "yz")

  /* ── 5. 封鎖與測試推播 ───────────────────────────────── */
  await deliver([event("unfollow", { type: "user", userId: "U_A" })])
  check("封鎖官方帳號：不在推播名單裡，狀態顯示推播失效", (await recipients()) === "" && (await svc.getLineStatus(yz, { api })).me.pushEnabled === false && (await svc.getLineStatus(yz, { api })).me.state === "linked")
  const pushesBefore = calls.filter((c) => c.fn === "push").length
  check("封鎖後按測試推播：擋下，不呼叫 LINE", (await fails(() => svc.sendTestPush(yz, { api }))) === "push_disabled" && calls.filter((c) => c.fn === "push").length === pushesBefore)
  await deliver([event("follow", { type: "user", userId: "U_A" })])
  await svc.sendTestPush(yz, { api })
  check("解除封鎖後：回到名單，測試推播送出固定文字", (await recipients()) === "yz" && calls.at(-1)?.text === LINE_TEXT.testPush && calls.at(-1)?.to === "U_A")
  pushOk = false
  check("LINE 不收（額度用完等）：回報失敗，不假裝成功", (await fails(() => svc.sendTestPush(yz, { api }))) === "push_failed")
  pushOk = true
  check("沒連結的人按測試推播：擋下", (await fails(() => svc.sendTestPush(lily, { api }))) === "not_linked")
  check("狀態：負責人看得到誰連了，成員看不到別人", await Promise.all([svc.getLineStatus(yz, { api, withQuota: true }), svc.getLineStatus(lily, { api })]).then(([o, m]) => o.team.find((t) => t.actor === "yz")?.state === "linked" && o.team.find((t) => t.actor === "lily")?.state === "none" && o.quota?.used === 46 && m.team.length === 0))

  /* ── 6. 嘗試次數、群組 ───────────────────────────────── */
  for (let i = 0; i < 5; i++) await deliver([text("U_C", "YZ-AAAA-BBB" + "CDEFG"[i])])
  const fresh = await svc.createBindCode(lily, lilyUser)
  const sixth = text("U_C", fresh.code)
  await deliver([sixth])
  check("一小時內錯五次：第六次即使代碼正確也不受理", (await outcomeOf(sixth)) === "code_limited" && calls.at(-1)?.text === LINE_TEXT.codeLimited && (await db.lineBindCode.count({ where: { actorKey: "lily", usedAt: null, expiresAt: { gt: new Date() } } })) === 1)

  const join = event("join", { type: "group", groupId: "C_9" })
  await deliver([join])
  check("被拉進群組：立刻離開（這一段不碰群組）", (await outcomeOf(join)) === "group_left" && calls.at(-1)?.fn === "leave" && calls.at(-1)?.to === "group:C_9")
  const groupMsg = event("message", { type: "group", groupId: "C_9", userId: "U_X" }, { message: { type: "text", id: "g9", text: "客戶說的話" } })
  await deliver([groupMsg])
  check("群組訊息：不看、不存內文", (await outcomeOf(groupMsg)) === "group_ignored" && !JSON.stringify(await db.lineWebhookEvent.findMany()).includes("客戶說的話"))

  /* ── 7. 解除 ─────────────────────────────────────────── */
  check("沒連結的人不能解除", (await fails(() => svc.unlinkLine(lily, lilyUser))) === "not_linked")
  await svc.unlinkLine(yz, yzUser)
  check("解除連結：離開推播名單、userId 清掉、留下稽核", (await recipients()) === "" && (await db.lineIdentity.findFirst({ where: { actorKey: "yz" } }))?.lineUserId === null && (await db.operatingCommandLog.count({ where: { entity: "LINE 連結", op: "delete" } })) >= 1)
  const rebind = await svc.createBindCode(lily, lilyUser)
  await deliver([text("U_A", rebind.code)])
  await svc.confirmBinding(lily, lilyUser, { api })
  check("解除後同一個 LINE 帳號可以綁到別的席位", (await recipients()) === "lily")
  await svc.rejectBinding(lily)
  check("「不是我」只放掉等待確認的，不影響已連結的", (await recipients()) === "lily")

  /* ── 8. 保留期限、未設定 ─────────────────────────────── */
  await db.lineWebhookEvent.updateMany({ where: { eventType: "verify" }, data: { processedAt: new Date(Date.now() - 31 * 864e5) } })
  await db.lineBindCode.updateMany({ where: { usedAt: { not: null } }, data: { usedAt: new Date(Date.now() - 25 * 36e5) } })
  await svc.processLineInbox({ api })
  check("保留期限：處理完 30 天的事件、用過 24 小時的代碼被清掉", (await db.lineWebhookEvent.count({ where: { eventType: "verify" } })) === 0 && (await db.lineBindCode.count({ where: { usedAt: { not: null } } })) === 0)
  check("收件匣沒有卡住的事件", (await db.lineWebhookEvent.count({ where: { processedAt: null } })) === 0)

  delete process.env.LINE_CHANNEL_SECRET
  const count = await db.lineWebhookEvent.count()
  const body = JSON.stringify({ destination: "Ubot", events: [text("U_A", "哈囉")] })
  const off = await svc.receiveLineWebhook(body, sign(body))
  check("沒有設定密鑰：webhook 什麼都不收", !off.accepted && (await db.lineWebhookEvent.count()) === count)
  check("沒有設定密鑰：狀態是未開通，動作被擋", (await svc.getLineStatus(yz, { api })).configured === false && (await fails(() => svc.createBindCode(yz, yzUser))) === "line_not_configured")

  await db.lineWebhookEvent.deleteMany({})
  await db.lineBindCode.deleteMany({})
  await db.lineIdentity.deleteMany({})
  await db.operatingCommandLog.deleteMany({ where: { entity: "LINE 連結" } })
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
