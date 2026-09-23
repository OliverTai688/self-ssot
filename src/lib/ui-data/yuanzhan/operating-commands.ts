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
 * 刻意不含 `journal`／`repos`（以 key 索引的物件）、`weekly`／`capacity`／`timesheet`
 * （陣列的陣列）、`changelog`／`history`（前端 undo 暫存）。它們各自需要不同的比對策略，
 * 在能處理之前列進來只會產生假的變更。
 */
export const PERSISTED_COLLECTIONS = [
  'phases',
  'milestones',
  'objectives',
  'rhythms',
  'sessions',
  'occasions',
  'projects',
  'issues',
  'goals',
  'commitments',
  'decisions',
  'threads',
  'signals',
  'txns',
  'reimb',
  'bank',
  'payroll',
] as const

export type PersistedCollection = (typeof PERSISTED_COLLECTIONS)[number]

/**
 * PLN-074 M1 開放寫入的集合。
 *
 * 選它們先行不是因為重要，是因為 Prisma 表已經存在且形狀正確（PLN-073 T1–T5），
 * 接錯了可以 drop 重來，沒有既有資料受影響。等於用零風險的集合把整條管線跑通一次。
 *
 * `phases`／`milestones`／`objectives` 原本也列在 M1，實作時退出來了：三者都掛在
 * `Project` 上，而 v5 的 `PRJ-2026-004` 在 Prisma 裡沒有對應列。要接它們得先回答
 * SCH-008 §3 的專案模型問題，那是 M2 的前置，不該在 M1 偷渡。
 * `occasions.projectId` 是 optional，所以它可以先行 —— 帶不到專案時存 null。
 */
export const WRITE_ENABLED_COLLECTIONS: readonly PersistedCollection[] = [
  'rhythms',
  'sessions',
  'occasions',
]

/**
 * 高風險集合（AGENTS.md §11 的 Finance／Company Strategy）。
 *
 * 即使 diff 產生了變更也一律拒絕，直到 YZLIVE-007 的帳務契約確認。原型裡的獎金率、
 * 上限與薪酬級距是合成示例，不是圓展的實際條款；先接線等於把示例變成帳實。
 */
export const HIGH_RISK_COLLECTIONS: readonly PersistedCollection[] = [
  'txns',
  'reimb',
  'bank',
  'payroll',
  'commitments',
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
    const rows = db[collection]
    if (!Array.isArray(rows)) continue

    const byId: Record<string, string> = {}
    for (const row of rows) {
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
  code: 'write_not_enabled' | 'unknown_collection' | 'invalid_payload' | 'apply_failed'
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
