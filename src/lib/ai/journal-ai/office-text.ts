/**
 * docx／xlsx／pptx 抽文字（RES-037 §14）。不加套件：這三種都是 zip 包 XML，
 * 只需要讀 zip 的中央目錄、解 deflate、再從 XML 取出文字節點。
 *
 * 防護（檔案是使用者上傳的，不可信）：
 *   - 只讀需要的那幾個 entry，不解整包；
 *   - 每個 entry 解壓後上限 8MB、總共 24MB（zip bomb）；
 *   - 抽出的文字上限 MAX_TEXT 字，超過截斷並註明。
 */
import { inflateRawSync } from "node:zlib"

export const MAX_TEXT = 200_000
const MAX_ENTRY = 8 * 1024 * 1024
const MAX_TOTAL = 24 * 1024 * 1024

type Entry = { name: string; method: number; compressed: number; size: number; offset: number }

function readEntries(buf: Buffer): Entry[] {
  // End of central directory：從尾端往回找簽章（後面最多 64KB 的註解）
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error("不是有效的 Office 檔（找不到 zip 目錄）")
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const out: Entry[] = []
  for (let i = 0; i < count && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compressed = buf.readUInt32LE(p + 20)
    const size = buf.readUInt32LE(p + 24)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const offset = buf.readUInt32LE(p + 42)
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen)
    out.push({ name, method, compressed, size, offset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

function readEntry(buf: Buffer, e: Entry, budget: { used: number }): string {
  if (e.size > MAX_ENTRY) throw new Error("檔案內容太大，無法讀取")
  if (buf.readUInt32LE(e.offset) !== 0x04034b50) throw new Error("zip 內容損毀")
  const nameLen = buf.readUInt16LE(e.offset + 26)
  const extraLen = buf.readUInt16LE(e.offset + 28)
  const start = e.offset + 30 + nameLen + extraLen
  const raw = buf.subarray(start, start + e.compressed)
  let data: Buffer
  if (e.method === 0) data = Buffer.from(raw)
  else if (e.method === 8) data = inflateRawSync(raw, { maxOutputLength: MAX_ENTRY })
  else throw new Error("不支援的壓縮方式")
  budget.used += data.length
  if (budget.used > MAX_TOTAL) throw new Error("檔案內容太大，無法讀取")
  return data.toString("utf8")
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ""
    }
    return ENTITIES[e.toLowerCase()] ?? ""
  })
}

/** 段落／列為單位：在結束標籤處換行，取出指定文字標籤裡的內容。 */
function xmlText(xml: string, textTag: string, breakTags: string[]): string {
  const breaks = new RegExp(`</(?:${breakTags.join("|")})>`, "g")
  const marked = xml.replace(breaks, "\u0000").replace(/<w:tab\/>|<a:tab\/>/g, "\t").replace(/<w:br\/>|<a:br\/>/g, "\n")
  const text = new RegExp(`<${textTag}(?:\\s[^>]*)?>([^<]*)</${textTag}>|\u0000`, "g")
  let out = ""
  for (const m of marked.matchAll(text)) out += m[0] === "\u0000" ? "\n" : decode(m[1])
  return out.replace(/\n{3,}/g, "\n\n").trim()
}

function byNumber(a: string, b: string): number {
  const n = (s: string) => Number(s.match(/(\d+)\.xml$/)?.[1] ?? 0)
  return n(a) - n(b)
}

function docx(buf: Buffer, entries: Entry[], budget: { used: number }): string {
  const doc = entries.find((e) => e.name === "word/document.xml")
  if (!doc) throw new Error("找不到 Word 內文")
  return xmlText(readEntry(buf, doc, budget), "w:t", ["w:p"])
}

function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A"
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function xlsx(buf: Buffer, entries: Entry[], budget: { used: number }): string {
  const sharedEntry = entries.find((e) => e.name === "xl/sharedStrings.xml")
  const shared: string[] = []
  if (sharedEntry) {
    const xml = readEntry(buf, sharedEntry, budget)
    for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push([...si[1].matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => decode(m[1])).join(""))
    }
  }
  // 工作表名稱：workbook.xml 的順序與 sheetN.xml 一致（多數情況）
  const wb = entries.find((e) => e.name === "xl/workbook.xml")
  const names = wb ? [...readEntry(buf, wb, budget).matchAll(/<sheet [^>]*name="([^"]*)"/g)].map((m) => decode(m[1])) : []
  const sheets = entries.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name)).sort((a, b) => byNumber(a.name, b.name))
  const parts: string[] = []
  sheets.forEach((sheet, i) => {
    const xml = readEntry(buf, sheet, budget)
    const rows: string[] = []
    for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = []
      for (const c of row[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1]
        const body = c[2] ?? ""
        const ref = attrs.match(/r="([A-Z]+)\d+"/)?.[1] ?? ""
        const type = attrs.match(/t="([^"]+)"/)?.[1] ?? ""
        const v = body.match(/<v>([^<]*)<\/v>/)?.[1]
        let value = ""
        if (type === "s" && v != null) value = shared[Number(v)] ?? ""
        else if (type === "inlineStr") value = [...body.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => decode(m[1])).join("")
        else if (v != null) value = decode(v)
        if (!value) continue
        const col = ref ? columnIndex(ref) : cells.length
        while (cells.length < col) cells.push("")
        cells[col] = value.replace(/[\t\n]+/g, " ")
      }
      if (cells.some(Boolean)) rows.push(cells.join("\t"))
    }
    parts.push(`## 工作表：${names[i] ?? `第 ${i + 1} 張`}\n${rows.join("\n")}`)
  })
  return parts.join("\n\n").trim()
}

function pptx(buf: Buffer, entries: Entry[], budget: { used: number }): string {
  const slides = entries.filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name)).sort((a, b) => byNumber(a.name, b.name))
  return slides
    .map((s, i) => `## 第 ${i + 1} 張投影片\n${xmlText(readEntry(buf, s, budget), "a:t", ["a:p"])}`)
    .join("\n\n")
    .trim()
}

/** 回傳抽出的純文字；超過上限會截斷並在尾端註明。 */
export function extractOfficeText(buf: Buffer, extension: string): string {
  const entries = readEntries(buf)
  const budget = { used: 0 }
  const ext = extension.toLowerCase()
  const text = ext === "docx" ? docx(buf, entries, budget) : ext === "xlsx" ? xlsx(buf, entries, budget) : ext === "pptx" ? pptx(buf, entries, budget) : ""
  if (!ext || !["docx", "xlsx", "pptx"].includes(ext)) throw new Error("不支援的格式")
  return capText(text)
}

export function capText(text: string): string {
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + `\n…（內容超過 ${MAX_TEXT} 字，以下省略）` : text
}
