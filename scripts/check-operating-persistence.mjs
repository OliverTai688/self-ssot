/**
 * 寫入管線前端半邊的行為測試（契約見 ARC-042 §5、§7.5）。
 *
 * 這一支測的不是 diff（那在 check-operating-commands），而是「版本號對不上時
 * 會發生什麼」——也就是使用者實際看到的那個「有衝突⋯請重新整理後重做」。
 *
 * operating-persistence.source.js 是被接進 mountV5() 作用域裡的片段，不是模組，
 * 所以這裡用 new Function 把它連同一組替身一起實例化。替身要夠真：版本號由伺服器
 * 替身持有並在每次成功寫入後 +1，POST 時嚴格比對 baseVersion —— 與
 * operating-commands.service.ts 的 `if (baseVersion !== current) throw` 同一條規則。
 */
import fs from 'node:fs'
import path from 'node:path'

// OP_PERSISTENCE_FRAGMENT 讓這一支能對著任意一版的片段跑（例如 git show 出來的舊版），
// 用來確認這些檢查真的抓得到那個回歸，而不是恆真。
const FRAGMENT =
  process.env.OP_PERSISTENCE_FRAGMENT ||
  path.join('src', 'components', 'yuanzhan', 'v5', 'operating-persistence.source.js')
const fragment = fs.readFileSync(FRAGMENT, 'utf8')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param serverVersion 伺服器目前的版本號。刻意不是 0：前端從 0 起算，
 *   所以「沒對齊就送出」與「對齊過了」這兩件事才分得開。
 * @param versionGetOk  依序決定每一次 GET 版本成不成功。用 [false] 模擬
 *   啟動時那一次取不到（部署中、離線一瞬間、或 401 剛好落在那一刻）。
 */
function instantiate({ serverVersion, versionGetOk = [] }) {
  const log = []
  /** 每一次 POST 送出去的列，照送出順序。 */
  const posted = []
  const DB = { requests: [{ id: 'R1', to: 'yz', seenAt: 111 }, { id: 'R2', to: 'yz', seenAt: 111 }] }
  let version = serverVersion
  const gets = [...versionGetOk]

  const snapshotCollections = (db) => JSON.parse(JSON.stringify({ requests: db.requests }))
  const diffCollections = (before, after) =>
    after.requests
      .filter((row) => JSON.stringify(before.requests.find((r) => r.id === row.id)) !== JSON.stringify(row))
      .map((row) => ({ collection: 'requests', id: row.id, op: 'update', after: row }))

  const fetchStub = async (url, init) => {
    if (init) {
      const body = JSON.parse(init.body)
      log.push(`POST base=${body.baseVersion}`)
      if (body.baseVersion === version) posted.push(...body.commands.flatMap((c) => c.changes.map((x) => x.id)))
      if (body.baseVersion !== version) {
        return { status: 409, ok: false, json: async () => ({ code: 'version_conflict', version }) }
      }
      version += 1
      return {
        status: 200,
        ok: true,
        json: async () => ({ version, applied: body.commands.map((c) => c.clientRef), rejected: [] }),
      }
    }
    if (url.includes('/store')) {
      log.push('GET store')
      return { ok: true, json: async () => ({ version, store: { requests: DB.requests } }) }
    }
    const ok = gets.length ? gets.shift() : true
    log.push(`GET version${ok ? '' : ' (fail)'}`)
    return ok ? { ok: true, json: async () => ({ version }) } : { ok: false, json: async () => ({}) }
  }

  const deps = {
    initialState: { dataSource: 'database' },
    DB,
    snapshotCollections,
    diffCollections,
    identifyRow: (_collection, row) => row.id,
    root: { querySelector: () => null, appendChild() {} },
    doc: { createElement: () => ({ setAttribute() {}, style: {}, dataset: {} }), addEventListener() {} },
    controller: { signal: null },
    render: () => {},
    fetch: fetchStub,
    OP_WRITE_ENABLED: ['requests'],
    OP_MAX_COMMANDS: 10,
    OP_MAX_CHANGES: 50,
    OP_MAX_BYTES: 1_000_000,
    OPERATING_COMMANDS_ENDPOINT: '/api/company/operating/commands',
  }

  const body = `${fragment}
    return {
      enqueue: () => opEnqueue('update', '日誌', '自動保存', OP_BASELINE),
      // 與 runtime 的 commit() 同一個形狀：先取快照、再 apply()、再排入佇列。
      commit: (apply) => { const before = opSnapshot(); apply(); opEnqueue('update', '請求回覆', '測試', before); },
      status: () => [OP_STATUS, OP_STATUS_NOTE],
      queued: () => OP_QUEUE.length,
    };`

  const names = Object.keys(deps)
  const api = new Function(...names, body)(...names.map((n) => deps[n]))
  return { api, DB, log, posted, serverVersion: () => version }
}

let failures = 0
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) {
    failures += 1
    console.log(`      ${JSON.stringify(detail)}`)
  }
}

/** 模擬「看昨天的日誌」時被自動標成已讀的那一列。 */
function touchSeen(t) {
  t.DB.requests[0].seenAt = 222
}

/**
 * 回歸案例。使用者的回報是「返回到昨天的日誌就出現衝突提示」：看過去某一天會把
 * 那天寫給自己的請求標成已讀（replies.source.js 的 enhanceView），那是一筆真的
 * 列變更，於是被排進佇列送出 —— 而如果啟動時那次版本對齊沒成功，這一批會帶著
 * baseVersion=0 過去，伺服器回 409，畫面顯示「另一個裝置先改了」。實際上沒有
 * 另一個裝置，只是本地還不知道版本號。
 */
async function caseStaleVersionRecovers() {
  const t = instantiate({ serverVersion: 57, versionGetOk: [false, true] })
  await sleep(10)
  touchSeen(t)
  t.api.enqueue()
  await sleep(80)

  check('啟動對齊失敗後仍然保存成功', t.api.status()[0] === 'idle' && t.api.queued() === 0, {
    status: t.api.status(),
    queued: t.api.queued(),
    log: t.log,
  })
  check('伺服器版本推進了一格', t.serverVersion() === 58, { version: t.serverVersion() })
  check('不會把落後版本說成別的裝置在改', t.api.status()[1].includes('另一個裝置') === false, {
    note: t.api.status()[1],
  })
}

/** 版本本來就對齊時不該多送、也不該多取。 */
async function caseHappyPath() {
  const t = instantiate({ serverVersion: 57 })
  await sleep(10)
  touchSeen(t)
  t.api.enqueue()
  await sleep(80)

  check('對齊時只送一次', t.log.filter((l) => l.startsWith('POST')).length === 1, { log: t.log })
  check('對齊時不需要合併 store', t.log.includes('GET store') === false, { log: t.log })
  check('狀態回到已保存', t.api.status()[0] === 'idle', { status: t.api.status() })
}

/** 佇列永遠不因衝突而被丟掉：裡面是使用者已經看到的編輯。 */
async function caseQueueNeverDropped() {
  const t = instantiate({ serverVersion: 57, versionGetOk: [false, false, false, false] })
  await sleep(10)
  touchSeen(t)
  t.api.enqueue()
  await sleep(120)

  const [status] = t.api.status()
  check('取不到版本時不會靜默丟掉編輯', status === 'idle' || t.api.queued() >= 1, {
    status,
    queued: t.api.queued(),
    log: t.log,
  })
}

/**
 * 回歸案例（2026-10-07 正式站）：決策卡選了選項，重新整理之後決定不見。
 *
 * 那一列是在 commit() 取「之前」快照之前就改好的，所以不在這筆命令的前後差異裡；
 * 而同一次 commit 另外帶出了別的變更（stampAuthors 補的欄位），佇列一推進，基準線
 * 就被設成現況 —— 先改好的那一列落進基準線，之後的自動保存再也比不出來。
 * 基準線推進到哪裡，送出去的差異就必須涵蓋到哪裡。
 */
async function caseEarlyMutationNotSwallowed() {
  const t = instantiate({ serverVersion: 57 })
  await sleep(10)
  t.DB.requests[0].choice = 'B' // commit() 之前就改好的那一列
  t.api.commit(() => { t.DB.requests[1].seenAt = 222 }) // apply() 裡順手改到的另一列
  await sleep(80)
  t.api.enqueue() // 之後的自動保存
  await sleep(80)

  check('commit 之前就改好的列也會被送出', t.posted.includes('R1'), { posted: t.posted, log: t.log })
  check('apply() 裡改的列照常送出', t.posted.includes('R2'), { posted: t.posted })
  check('同一列不會被送兩次', t.posted.filter((id) => id === 'R1').length === 1, { posted: t.posted })
}

await caseStaleVersionRecovers()
await caseHappyPath()
await caseQueueNeverDropped()
await caseEarlyMutationNotSwallowed()

console.log(failures ? `\n${failures} failing` : '\noperating persistence: all checks passed')
process.exit(failures ? 1 : 0)
