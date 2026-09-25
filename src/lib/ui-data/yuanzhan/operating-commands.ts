/**
 * 營運工作台寫入管線的共用契約（ARC-042）。
 *
 * 這個檔案同時被三個地方讀：
 *   - v5 runtime 的 `operating-persistence.source.js`（瀏覽器，Shadow DOM 內）
 *   - `/api/company/operating/commands` 的 route handler（伺服器）
 *   - `scripts/check-operating-commands.mjs` 的契約測試（node，不需 DB）
 *
 * 所以它必須是純的：沒有 DOM、沒有 Prisma、沒有 "server-only"。
 */

/* ------------------------------------------------------------------ */
/* 集合                                                                */
/* ------------------------------------------------------------------ */

/**
 * 有穩定業務 id、可以逐列比對的集合。
 *
 * `dayLogs`（今日脈絡）與 `todayIssues`（今日議題）在這裡是**一筆事件一列**，不是「一天一列」：
 * 一天一列的話，兩個席位同一天各寫一筆就會互相覆蓋整天的內容，最後只剩後寫的那個人的脈絡。
 *
 * 刻意不含 `journal`／`repos`（以 key 索引的物件）、`weekly`／`capacity`／`timesheet`
 * （陣列的陣列）、`changelog`／`history`（前端 undo 暫存）。它們各自需要不同的比對策略，
 * 在能處理之前列進來只會產生假的變更。
 */
export const PERSISTED_COLLECTIONS = [
  'journal',
  'dayLogs',
  'todayIssues',
  'phases',
  'milestones',
  'objectives',
  'rhythms',
  'sessions',
  'occasions',
  'projects',
  'issues',
  'goals',
  'decisions',
  'threads',
  'docs',
  'commitments',
  'repos',
  'capacity',
  'timesheet',
  'lineComments',
  'journalComments',
  'objectComments',
  'requests',
  'files',
  'docObjects',
  'txns',
  'reimb',
  'bank',
  'payroll',
  'intake',
  'periods',
] as const

export type PersistedCollection = (typeof PERSISTED_COLLECTIONS)[number]

/**
 * 以 key 索引的集合：`DB.journal` 是 `{ '2026-09-22': { title, blocks } }` 而不是陣列。
 * 比對時把 key 當作列的 id，其餘與陣列集合完全相同。
 */
export const KEYED_COLLECTIONS: readonly PersistedCollection[] = [
  'journal',
  'repos',
  'capacity',
  'timesheet',
]

/**
 * PLN-074 M1 開放寫入的集合。
 *
 * 選它們先行不是因為重要，是因為 Prisma 表已經存在且形狀正確（PLN-073 T1–T5），
 * 接錯了可以 drop 重來，沒有既有資料受影響。等於用零風險的集合把整條管線跑通一次。
 *
 * `phases`／`milestones`／`objectives` 原本列在 M1，當時退了出來：三者都掛在 `Project`
 * 上，而 v5 的 `PRJ-2026-004` 在 Prisma 裡還沒有對應列。M2 把專案接上之後它們才回來，
 * 而且各自會在專案尚未存下時拒絕，而不是造一個空殼專案。
 */
export const WRITE_ENABLED_COLLECTIONS: readonly PersistedCollection[] = [
  // M1：節奏／場合（專案無關）
  'rhythms',
  'sessions',
  'occasions',
  // M2 之後才接得上：三者都掛在 Project 上，專案側表定案後才有對應列
  'phases',
  'milestones',
  'objectives',
  // M2：日常協作
  'journal',
  'projects',
  'issues',
  'goals',
  'decisions',
  // M3：Evidence、承諾、容量
  'docs',
  'commitments',
  'threads',
  'repos',
  'capacity',
  'timesheet',
  // M7：日誌右欄的兩人共用狀態（今日脈絡、今日議題）
  'dayLogs',
  'todayIssues',
  // M5：留言與請求
  'lineComments',
  'journalComments',
  'objectComments',
  'requests',
  // M6：文件庫與文件物件
  'files',
  'docObjects',
  // M4：帳務
  'txns',
  'reimb',
  'bank',
  'payroll',
  // RES-032：金流三面的收件匣與月結
  'intake',
  'periods',
]

/**
 * 高風險集合（AGENTS.md §11 的 Finance）。
 *
 * M4 之前這份名單是硬性拒絕；現在它改為**提高稽核層級**——寫入照走，但稽核列
 * 標記 riskLevel=high，讓這些變更在紀錄裡與一般編輯分得開。
 *
 * 改變的理由是原本的顧慮已經不成立：擋住寫入是為了避免把原型的合成費率變成帳實，
 * 而 database 模式根本不載入 fixture，這些表只會收到使用者自己輸入的數字。
 * 獎金公式、稅務與薪資級距仍然不在系統裡 —— 工作台是在前端試算，
 * runtime 自己對薪資的說明就是「只更新本頁示例試算，不付款」。
 */
export const HIGH_RISK_COLLECTIONS: readonly PersistedCollection[] = [
  'txns',
  'reimb',
  'bank',
  'payroll',
  'intake',
  'periods',
]

export function isPersistedCollection(value: unknown): value is PersistedCollection {
  return typeof value === 'string' && (PERSISTED_COLLECTIONS as readonly string[]).includes(value)
}

/* ------------------------------------------------------------------ */
/* 列的身分                                                            */
/* ------------------------------------------------------------------ */

/**
 * 大部分集合用 `row.id`。`sessions` 是例外：它是節奏的單次覆寫，
 * 業務鍵是 (rhythmId, occurrenceDate)，Prisma 的 `rhythm_sessions_occurrence_key` 同樣以此為唯一鍵。
 */
export function identifyRow(collection: PersistedCollection, row: Record<string, unknown>): string | null {
  // 薪資試算一人一列，沒有 id；席位字串就是它的身分。
  if (collection === 'payroll') {
    return typeof row.who === 'string' && row.who.length > 0 ? row.who : null
  }

  // 物件留言沒有 id：它的身分是「誰、在哪個物件上、什麼時候說的」。
  if (collection === 'objectComments') {
    const { parent, w, ts } = row
    if (typeof parent !== 'string' || typeof w !== 'string' || typeof ts !== 'string') return null
    return `${parent}|${w}|${ts}`
  }

  if (collection === 'sessions') {
    const rhythmId = row.rhythmId
    const occurrenceDate = row.occurrenceDate
    if (typeof rhythmId !== 'string' || typeof occurrenceDate !== 'string') return null
    return `${rhythmId}|${occurrenceDate}`
  }

  return typeof row.id === 'string' && row.id.length > 0 ? row.id : null
}

/* ------------------------------------------------------------------ */
/* 快照與比對                                                          */
/* ------------------------------------------------------------------ */

export type CollectionSnapshot = Record<string, Record<string, string>>

export type RowChange = {
  collection: PersistedCollection
  id: string
  op: 'create' | 'update' | 'delete'
  /** delete 時省略。 */
  after?: unknown
}

/**
 * 穩定序列化：鍵依字典序輸出，讓「同樣的內容」永遠得到同一個字串。
 * 沒有這個，物件屬性的插入順序改變就會被誤判成 update。
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

/** 只快照可比對的集合；其餘一律略過，不產生噪音。 */
export function snapshotCollections(
  db: Record<string, unknown>,
  collections: readonly PersistedCollection[] = PERSISTED_COLLECTIONS,
): CollectionSnapshot {
  const out: CollectionSnapshot = {}

  for (const collection of collections) {
    const source = db[collection]

    if (KEYED_COLLECTIONS.includes(collection)) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) continue
      const byKey: Record<string, string> = {}
      for (const [key, row] of Object.entries(source as Record<string, unknown>)) {
        if (!row || typeof row !== 'object') continue
        byKey[key] = stableStringify(row)
      }
      out[collection] = byKey
      continue
    }

    if (!Array.isArray(source)) continue

    const byId: Record<string, string> = {}
    for (const row of source) {
      if (!row || typeof row !== 'object') continue
      const id = identifyRow(collection, row as Record<string, unknown>)
      if (!id) continue
      byId[id] = stableStringify(row)
    }
    out[collection] = byId
  }

  return out
}

/**
 * 比對兩份快照，回傳被改動的列。
 *
 * 未變動的集合完全不出現在輸出裡 —— 這是「只送改動的列，不送整包 store」
 * （PLN-071 YZLIVE-005 的停止條件）在程式上的落點。
 */
export function diffCollections(before: CollectionSnapshot, after: CollectionSnapshot): RowChange[] {
  const changes: RowChange[] = []
  const collections = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of collections) {
    if (!isPersistedCollection(key)) continue
    const prev = before[key] ?? {}
    const next = after[key] ?? {}

    for (const [id, json] of Object.entries(next)) {
      const had = Object.prototype.hasOwnProperty.call(prev, id)
      if (!had) changes.push({ collection: key, id, op: 'create', after: JSON.parse(json) })
      else if (prev[id] !== json) changes.push({ collection: key, id, op: 'update', after: JSON.parse(json) })
    }

    for (const id of Object.keys(prev)) {
      if (!Object.prototype.hasOwnProperty.call(next, id)) {
        changes.push({ collection: key, id, op: 'delete' })
      }
    }
  }

  return changes
}

/* ------------------------------------------------------------------ */
/* 線上契約                                                            */
/* ------------------------------------------------------------------ */

export const OPERATING_COMMANDS_ENDPOINT = '/api/company/operating/commands'

export type OperatingCommand = {
  /** 前端生成的冪等鍵：重送同一個 clientRef 不會產生第二列。 */
  clientRef: string
  op: 'create' | 'update' | 'delete'
  /** 稽核顯示用的中文物種名，不參與路由判斷。 */
  ent: string
  /** 稽核顯示用的這一筆名字。 */
  label: string
  changes: RowChange[]
}

export type CommandBatchRequest = {
  baseVersion: number
  commands: OperatingCommand[]
}

export type CommandRejection = {
  clientRef: string
  code:
    | 'write_not_enabled'
    | 'unknown_collection'
    | 'invalid_payload'
    | 'apply_failed'
    /** 該月已結帳：金額、日期、歸屬唯讀（RES-032 §5.4 B-3） */
    | 'period_closed'
    /** 席位沒有這個動作的權限（例如非負責人鎖帳） */
    | 'forbidden'
  message: string
  collection?: string
}

export type CommandBatchResponse = {
  version: number
  applied: string[]
  rejected: CommandRejection[]
}

/** 單次 commit 通常只動 1–3 列；超過這個數量代表比對出了問題，寧可擋下來。 */
export const MAX_CHANGES_PER_COMMAND = 200
export const MAX_COMMANDS_PER_BATCH = 50

/**
 * 單次 commit 的變更量上限（位元組）。
 *
 * 守的是「bytes 不該走這條路」：檔案內容應該走 R2 預簽網址，而不是以 base64
 * 夾在某個欄位裡被 diff 一起送上來。真的有那種東西時，寧可擋下來並說清楚，
 * 也不要讓一張 5 MB 的圖變成 7 MB 的 JSON 悄悄送出去。
 */
export const MAX_COMMAND_BYTES = 512 * 1024
