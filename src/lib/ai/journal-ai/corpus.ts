/**
 * 日誌 AI 的語料與搜尋（RES-037 §4）。
 *
 * 這一檔是純函式，不碰資料庫：語料由 corpus-loader.ts 用 viewer 的權限載入之後交給這裡。
 * 所以「AI 看得到的 ＝ 你看得到的」只在載入那一處成立，這裡不需要、也不應該再判斷權限。
 *
 * 引用標記（cite）是答案與資料之間唯一的對應：
 *   日誌行  line:<day>:<author>:<blockId>     例：line:2026-10-20:yz:b3
 *   物件    <ty>:<rid>                         例：issue:ISS-12、asset:AST-JRNL-000124-20260928
 * 模型在答案裡寫 ⟦cite⟧；伺服器只承認這個對話裡工具真的回傳過的 cite（citations.ts）。
 */

export type ObjRef = { ty: string; rid: string }

export type JournalLine = {
  day: string
  author: string
  blockId: string
  /** 第幾行（1 起算），給人看的 */
  line: number
  text: string
  /** 這一行掛的物件：召喚出來的（obj 區塊）與引用的（refs） */
  refs: ObjRef[]
}

export type CorpusObject = {
  ty: string
  rid: string
  /** 型別名稱：議題、工作、檔案… */
  label: string
  name: string
  day: string
  /** 搜尋與閱讀用的全文 */
  body: string
  /** 物件上的留言（已是 viewer 讀得到的） */
  comments: Array<{ who: string; text: string; day: string }>
}

export type ActivityEvent = { day: string; at: string; who: string; text: string }

export type JournalCorpus = {
  viewer: string
  /** 公司的席位代號（yz、lily…）：提案的負責人只能是其中之一 */
  seats: string[]
  lines: JournalLine[]
  /** day → 那一天的日誌標題（沒取標題的不在這裡） */
  dayTitles: Record<string, string>
  objects: CorpusObject[]
  activity: ActivityEvent[]
}

/* ---------- cite ---------- */

export function lineCite(l: Pick<JournalLine, "day" | "author" | "blockId">): string {
  return `line:${l.day}:${l.author}:${l.blockId}`
}
export function objectCite(o: ObjRef): string {
  return `${o.ty}:${o.rid}`
}

export const OBJECT_TYPES = ["doc_object", "issue", "project", "decision", "txn", "asset", "link"] as const
export type ObjectType = (typeof OBJECT_TYPES)[number]

export const OBJECT_TYPE_LABEL: Record<ObjectType, string> = {
  doc_object: "文件物件",
  issue: "工作",
  project: "專案",
  decision: "決策",
  txn: "交易",
  asset: "檔案",
  link: "連結",
}

/* ---------- 搜尋 ---------- */

const MAX_TERMS = 8

/**
 * 查詢字串 → 關鍵字。空白與標點分詞；中文沒有空白，所以模型被要求送「多個短關鍵字、空白分隔」，
 * 不靠這裡斷詞。太長的一整串中文仍然當一個詞，找不到時模型會自己換短一點的詞再查。
 */
export function queryTerms(query: string): string[] {
  const terms = String(query || "")
    .toLowerCase()
    .split(/[\s,，、。；;：:「」『』（）()【】[\]"'!?！？/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  return [...new Set(terms)].slice(0, MAX_TERMS)
}

function scoreText(text: string, terms: string[]): number {
  if (!terms.length) return 0
  const hay = text.toLowerCase()
  let score = 0
  for (const term of terms) if (hay.includes(term)) score += 1
  return score
}

/** 命中處前後各一段。找不到命中就取開頭。 */
export function snippet(text: string, terms: string[], width = 120): string {
  const flat = String(text || "").replace(/\s+/g, " ").trim()
  if (flat.length <= width) return flat
  const hay = flat.toLowerCase()
  let at = -1
  for (const term of terms) {
    const i = hay.indexOf(term)
    if (i >= 0 && (at < 0 || i < at)) at = i
  }
  if (at < 0) return flat.slice(0, width) + "…"
  const start = Math.max(0, at - Math.floor(width / 3))
  const end = Math.min(flat.length, start + width)
  return (start > 0 ? "…" : "") + flat.slice(start, end) + (end < flat.length ? "…" : "")
}

function inRange(day: string, from?: string | null, to?: string | null): boolean {
  if (from && day && day < from) return false
  if (to && day && day > to) return false
  return true
}

export type LineHit = { cite: string; day: string; author: string; line: number; dayTitle: string; text: string }

export function searchJournal(
  corpus: JournalCorpus,
  opts: { query: string; from?: string | null; to?: string | null; author?: string | null },
  limit = 20,
): { hits: LineHit[]; total: number } {
  const terms = queryTerms(opts.query)
  const scored = corpus.lines
    .filter((l) => inRange(l.day, opts.from, opts.to) && (!opts.author || l.author === opts.author))
    .map((l) => ({ l, s: terms.length ? scoreText(l.text, terms) : 1 }))
    .filter((x) => x.s > 0)
    // 命中的詞多的在前；一樣多的新的在前（人找日誌多半是依時間，Dumais 2003）
    .sort((a, b) => b.s - a.s || b.l.day.localeCompare(a.l.day) || a.l.line - b.l.line)
  return {
    total: scored.length,
    hits: scored.slice(0, limit).map(({ l }) => ({
      cite: lineCite(l),
      day: l.day,
      author: l.author,
      line: l.line,
      dayTitle: corpus.dayTitles[l.day] ?? "",
      text: snippet(l.text, terms, 240),
    })),
  }
}

export function readJournalDay(
  corpus: JournalCorpus,
  opts: { day: string; author?: string | null },
): Array<{ author: string; title: string; lines: Array<{ cite: string; line: number; text: string; refs: string[] }> }> {
  const byAuthor = new Map<string, JournalLine[]>()
  for (const l of corpus.lines) {
    if (l.day !== opts.day) continue
    if (opts.author && l.author !== opts.author) continue
    const list = byAuthor.get(l.author) ?? []
    list.push(l)
    byAuthor.set(l.author, list)
  }
  return [...byAuthor.entries()].map(([author, lines]) => ({
    author,
    title: corpus.dayTitles[opts.day] ?? "",
    lines: lines
      .sort((a, b) => a.line - b.line)
      .map((l) => ({ cite: lineCite(l), line: l.line, text: l.text, refs: l.refs.map(objectCite) })),
  }))
}

export type ObjectHit = { cite: string; type: string; name: string; day: string; snippet: string }

export function searchObjects(
  corpus: JournalCorpus,
  opts: { query: string; types?: string[] | null },
  limit = 20,
): { hits: ObjectHit[]; total: number } {
  const terms = queryTerms(opts.query)
  const types = opts.types && opts.types.length ? new Set(opts.types) : null
  const scored = corpus.objects
    .filter((o) => !types || types.has(o.ty))
    .map((o) => {
      const nameScore = scoreText(o.name + " " + o.rid, terms)
      const bodyScore = scoreText(o.body, terms)
      // 名稱命中比內文命中重要，但人常常記得的是內容（Allen 1989），所以兩者都算
      return { o, s: terms.length ? nameScore * 2 + bodyScore : 1 }
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.o.day.localeCompare(a.o.day))
  return {
    total: scored.length,
    hits: scored.slice(0, limit).map(({ o }) => ({
      cite: objectCite(o),
      type: o.label,
      name: o.name,
      day: o.day,
      snippet: snippet(o.body, terms, 200),
    })),
  }
}

const OBJECT_BODY_CAP = 6000

export function getObject(corpus: JournalCorpus, cite: string) {
  const o = corpus.objects.find((x) => objectCite(x) === cite)
  if (!o) return null
  const bornIn = corpus.lines.filter((l) => l.refs.some((r) => r.ty === o.ty && r.rid === o.rid)).slice(0, 10)
  return {
    cite,
    type: o.label,
    name: o.name,
    day: o.day,
    body: o.body.length > OBJECT_BODY_CAP ? o.body.slice(0, OBJECT_BODY_CAP) + "…（以下省略）" : o.body,
    comments: o.comments.slice(-20),
    mentionedIn: bornIn.map((l) => ({ cite: lineCite(l), day: l.day, author: l.author, line: l.line, text: snippet(l.text, [], 120) })),
  }
}

export function listActivity(corpus: JournalCorpus, opts: { from: string; to: string }, limit = 60) {
  const events = corpus.activity.filter((e) => inRange(e.day, opts.from, opts.to)).slice(-limit)
  const days = Object.entries(corpus.dayTitles)
    .filter(([day]) => inRange(day, opts.from, opts.to))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, title]) => ({ day, title }))
  return { days, events }
}

/* ---------- 從工作台資料攤平 ---------- */

/** 日誌區塊 → 文字。obj 區塊沒有文字，以物件名稱代替，否則「上傳了一張截圖」那一行會是空的。 */
export type RawBlock = { id?: unknown; t?: unknown; text?: unknown; obj?: unknown; refs?: unknown }

export function blockRefs(b: RawBlock): ObjRef[] {
  const out: ObjRef[] = []
  const obj = b.obj as { ty?: unknown; rid?: unknown } | null | undefined
  if (b.t === "obj" && obj && typeof obj.rid === "string") out.push({ ty: typeof obj.ty === "string" ? obj.ty : "doc_object", rid: obj.rid })
  if (Array.isArray(b.refs)) {
    for (const r of b.refs as Array<{ ty?: unknown; rid?: unknown }>) {
      if (r && typeof r.ty === "string" && typeof r.rid === "string") out.push({ ty: r.ty, rid: r.rid })
    }
  }
  return out
}

const SKIP_KEYS = new Set(["id", "rid", "bid", "objectKey", "assetId", "folderId", "projectId", "parentId", "msId", "objectiveId", "contractId", "channelId", "collapsed", "titleAuto"])

/** 物件裡所有字串與數字攤平成一段文字；鍵名一起留著，模型才知道「12000」是金額不是日期。 */
export function flattenObject(value: unknown, cap = 8000): string {
  const parts: string[] = []
  let size = 0
  const walk = (v: unknown, key: string, depth: number) => {
    if (size > cap || depth > 6 || v == null) return
    if (typeof v === "string") {
      const s = v.trim()
      if (!s) return
      const piece = key ? `${key}: ${s}` : s
      parts.push(piece)
      size += piece.length
    } else if (typeof v === "number" || typeof v === "boolean") {
      if (key) {
        parts.push(`${key}: ${v}`)
        size += key.length + 8
      }
    } else if (Array.isArray(v)) {
      for (const item of v) walk(item, key, depth + 1)
    } else if (typeof v === "object") {
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
        if (SKIP_KEYS.has(k)) continue
        walk(child, k, depth + 1)
      }
    }
  }
  walk(value, "", 0)
  const text = parts.join("\n")
  return text.length > cap ? text.slice(0, cap) : text
}
