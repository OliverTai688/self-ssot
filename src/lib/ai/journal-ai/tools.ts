/**
 * 日誌 AI 的工具（RES-037 §4.1）。全部只讀，全部只在 viewer 的語料上跑。
 *
 * 每個工具回三樣東西：
 *   content  給模型看的 JSON 字串
 *   refs     這次回傳了哪些 cite（引用驗證的允許集合，也是右欄「送出了什麼」的來源）
 *   step     給人看的步驟列：搜了什麼、幾筆
 *
 * 純函式，不碰資料庫與網路，所以 mock 模式與驗收腳本可以直接呼叫。
 */
import { z } from "zod"

import {
  getObject,
  lineCite,
  listActivity,
  OBJECT_TYPE_LABEL,
  OBJECT_TYPES,
  readJournalDay,
  searchJournal,
  searchObjects,
  type JournalCorpus,
} from "./corpus"

export type SentRef = { cite: string; label: string; chars: number }
export type ToolStep = { tool: string; label: string; hits: number }
/** 檔案記號：資料庫裡只存這個，送出前才由 attachments.ts 換成真的檔案區塊。 */
export type AssetRefBlock = { type: "asset_ref"; ref: string; title: string }
export type ToolOutcome = { content: string; isError: boolean; refs: SentRef[]; step: ToolStep; blocks?: AssetRefBlock[] }

/** 送得出內容的檔案種類（影音不讀）。 */
const READABLE_FILE = /\.(png|jpe?g|webp|gif|heic|pdf|txt|md|csv|json|docx|xlsx|pptx)$/i

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const NULLABLE_DAY = DAY.nullable()

const INPUTS = {
  search_journal: z.object({ query: z.string().min(1).max(200), from: NULLABLE_DAY, to: NULLABLE_DAY, author: z.string().max(40).nullable() }).strict(),
  read_journal_day: z.object({ day: DAY, author: z.string().max(40).nullable() }).strict(),
  search_objects: z.object({ query: z.string().min(1).max(200), types: z.array(z.enum(OBJECT_TYPES)).nullable() }).strict(),
  get_object: z.object({ cite: z.string().min(3).max(200) }).strict(),
  list_activity: z.object({ from: DAY, to: DAY }).strict(),
  read_file: z.object({ cite: z.string().min(7).max(200) }).strict(),
}
export type ToolName = keyof typeof INPUTS
export const TOOL_NAMES = Object.keys(INPUTS) as ToolName[]

const nullableString = (description: string) => ({ type: ["string", "null"], description })

/**
 * 工具定義。順序與內容固定不變 —— tools 在快取前綴的最前面，任何一個字變了，整段快取就失效。
 * strict：模型送來的參數一定合 schema；eager_input_streaming：參數邊產生邊送（skill 預設），
 * 所以伺服器不再替我們驗，執行前一律再用 zod 驗一次。
 */
export const JOURNAL_AI_TOOLS = [
  {
    name: "search_journal",
    description:
      "在日誌正文裡找行。query 用空白分隔的短關鍵字（中文請拆成 2–4 字的詞，例如「報價 分期」而不是一整句）。回傳命中的行，每行附 cite。找不到時換同義詞或更短的詞再找。",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["query", "from", "to", "author"],
      properties: {
        query: { type: "string", description: "空白分隔的關鍵字" },
        from: nullableString("起始日 YYYY-MM-DD，不限則 null"),
        to: nullableString("結束日 YYYY-MM-DD，不限則 null"),
        author: nullableString("只看某位作者（席位代號，例如 yz），不限則 null"),
      },
    },
  },
  {
    name: "read_journal_day",
    description: "讀某一天的整份日誌（依行序），每行附 cite。問「那天發生什麼」、或搜尋命中後要看上下文時用。",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["day", "author"],
      properties: {
        day: { type: "string", description: "YYYY-MM-DD" },
        author: nullableString("只看某位作者，不限則 null"),
      },
    },
  },
  {
    name: "search_objects",
    description:
      "找日誌裡的物件：文件物件（會議紀錄、議題…）、工作、專案、決策、交易、檔案、連結。名稱與內文都會比對。回傳每個物件的 cite，要看全文再用 get_object。",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["query", "types"],
      properties: {
        query: { type: "string", description: "空白分隔的關鍵字" },
        types: {
          type: ["array", "null"],
          items: { type: "string", enum: [...OBJECT_TYPES] },
          description: "只找這些型別，不限則 null",
        },
      },
    },
  },
  {
    name: "get_object",
    description: "用 cite 讀一個物件的全文、留言，以及它在日誌哪幾行出現過。",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["cite"],
      properties: { cite: { type: "string", description: "search_objects 或日誌行回傳的物件 cite，例如 issue:ISS-12" } },
    },
  },
  {
    name: "list_activity",
    description: "列出一段期間的日誌標題與今日脈絡事件（開始一天、收工、召喚物件、留言…）。問「這週做了什麼」時先用這個看全貌。",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["from", "to"],
      properties: { from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD" } },
    },
  },
  {
    name: "read_file",
    description:
      "讀一個檔案的內容（圖片、PDF、Word、Excel、PowerPoint、文字檔）。cite 是 search_objects 或日誌行回傳的檔案 cite，例如 asset:AST-JRNL-000124-20260928。問題跟檔案內容有關時才讀；檔案很大，不要為了確認名稱而讀。",
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["cite"],
      properties: { cite: { type: "string", description: "檔案的 cite，asset: 開頭" } },
    },
  },
] as const

function json(value: unknown): string {
  return JSON.stringify(value)
}

/** 單一工具結果的上限。超過就截斷並告訴模型，讓它收窄條件再查。 */
const RESULT_CAP = 24000

function capped(content: string): string {
  return content.length > RESULT_CAP ? content.slice(0, RESULT_CAP) + "\n…（結果太長已截斷，請收窄條件再查）" : content
}

function error(tool: string, message: string): ToolOutcome {
  return { content: json({ error: message }), isError: true, refs: [], step: { tool, label: message, hits: 0 } }
}

function objectLabel(corpus: JournalCorpus, cite: string): string {
  const o = corpus.objects.find((x) => `${x.ty}:${x.rid}` === cite)
  return o ? `${o.label} · ${o.name}` : cite
}

function lineLabel(day: string, line: number): string {
  return `${Number(day.slice(5, 7))}/${day.slice(8, 10)} 日誌 · 第 ${line} 行`
}

export function runTool(corpus: JournalCorpus, name: string, rawInput: unknown): ToolOutcome {
  if (!(name in INPUTS)) return error(name, `沒有這個工具：${name}`)
  const parsed = INPUTS[name as ToolName].safeParse(rawInput)
  if (!parsed.success) return error(name, "參數不合格式：" + parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("；"))

  switch (name as ToolName) {
    case "search_journal": {
      const input = parsed.data as z.infer<typeof INPUTS.search_journal>
      const { hits, total } = searchJournal(corpus, input)
      const content = capped(json({ total, shown: hits.length, lines: hits }))
      return {
        content,
        isError: false,
        refs: hits.map((h) => ({ cite: h.cite, label: lineLabel(h.day, h.line), chars: h.text.length })),
        step: { tool: name, label: `搜尋日誌「${input.query}」`, hits: total },
      }
    }
    case "read_journal_day": {
      const input = parsed.data as z.infer<typeof INPUTS.read_journal_day>
      const books = readJournalDay(corpus, input)
      const refs: SentRef[] = []
      for (const book of books) for (const l of book.lines) refs.push({ cite: l.cite, label: lineLabel(input.day, l.line), chars: l.text.length })
      return {
        content: capped(json({ day: input.day, books })),
        isError: false,
        refs,
        step: { tool: name, label: `讀 ${Number(input.day.slice(5, 7))}/${input.day.slice(8, 10)} 的日誌`, hits: refs.length },
      }
    }
    case "search_objects": {
      const input = parsed.data as z.infer<typeof INPUTS.search_objects>
      const { hits, total } = searchObjects(corpus, input)
      const types = input.types?.length ? "（" + input.types.map((t) => OBJECT_TYPE_LABEL[t]).join("、") + "）" : ""
      return {
        content: capped(json({ total, shown: hits.length, objects: hits })),
        isError: false,
        refs: hits.map((h) => ({ cite: h.cite, label: `${h.type} · ${h.name}`, chars: h.snippet.length + h.name.length })),
        step: { tool: name, label: `搜尋物件「${input.query}」${types}`, hits: total },
      }
    }
    case "get_object": {
      const input = parsed.data as z.infer<typeof INPUTS.get_object>
      const o = getObject(corpus, input.cite)
      if (!o) return error(name, `找不到這個物件（或你沒有權限）：${input.cite}`)
      const content = capped(json(o))
      const refs: SentRef[] = [{ cite: o.cite, label: objectLabel(corpus, o.cite), chars: content.length }]
      for (const m of o.mentionedIn) refs.push({ cite: m.cite, label: lineLabel(m.day, m.line), chars: m.text.length })
      return { content, isError: false, refs, step: { tool: name, label: `讀物件「${o.name}」`, hits: 1 } }
    }
    case "read_file": {
      const input = parsed.data as z.infer<typeof INPUTS.read_file>
      const o = input.cite.startsWith("asset:") ? corpus.objects.find((x) => `${x.ty}:${x.rid}` === input.cite) : null
      if (!o) return error(name, `找不到這個檔案（或你沒有權限）：${input.cite}`)
      if (!READABLE_FILE.test(o.name)) return error(name, `「${o.name}」這種檔案還讀不了內容。`)
      return {
        content: json({ cite: input.cite, name: o.name, note: "檔案內容附在這則結果裡。引用時用這個 cite。" }),
        isError: false,
        refs: [{ cite: input.cite, label: `檔案 · ${o.name}`, chars: 0 }],
        step: { tool: name, label: `讀檔案「${o.name}」`, hits: 1 },
        blocks: [{ type: "asset_ref", ref: o.rid, title: o.name }],
      }
    }
    case "list_activity": {
      const input = parsed.data as z.infer<typeof INPUTS.list_activity>
      const out = listActivity(corpus, input)
      return {
        content: capped(json(out)),
        isError: false,
        refs: [],
        step: { tool: name, label: `看 ${input.from.slice(5)}～${input.to.slice(5)} 的脈絡`, hits: out.days.length + out.events.length },
      }
    }
  }
}

/** 使用者釘選的物件與行，事先解析成一段文字放進那一則訊息（不等模型去搜）。 */
export function resolvePins(
  corpus: JournalCorpus,
  pins: Array<{ ty: string; rid: string }>,
): { text: string; refs: SentRef[]; files: AssetRefBlock[] } {
  const parts: string[] = []
  const refs: SentRef[] = []
  const files: AssetRefBlock[] = []
  for (const pin of pins.slice(0, 10)) {
    const cite = `${pin.ty}:${pin.rid}`
    const o = getObject(corpus, cite)
    if (!o) continue
    const body = json(o)
    parts.push(body)
    refs.push({ cite, label: objectLabel(corpus, cite), chars: body.length })
    // 釘選的是檔案：連同內容一起附上（最多 5 份），不必等模型再呼叫 read_file
    if (pin.ty === "asset" && READABLE_FILE.test(o.name) && files.length < 5) files.push({ type: "asset_ref", ref: pin.rid, title: o.name })
    for (const m of o.mentionedIn) refs.push({ cite: m.cite, label: lineLabel(m.day, m.line), chars: m.text.length })
  }
  return { text: parts.join("\n"), refs, files }
}

/** 給 citations.ts 的允許集合用：從 sentRefs 取 cite → 顯示名稱。 */
export function citeLabels(refs: SentRef[]): Map<string, { label: string }> {
  const map = new Map<string, { label: string }>()
  for (const r of refs) if (!map.has(r.cite)) map.set(r.cite, { label: r.label })
  return map
}

export { lineCite }
