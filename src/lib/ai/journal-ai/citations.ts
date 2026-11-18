/**
 * 引用驗證（RES-037 §4.4）。
 *
 * 模型在答案裡寫 ⟦cite⟧。這裡只承認「這個對話裡工具真的回傳過、或使用者自己釘選的」cite；
 * 對不上的一律拿掉，原處留一個「未驗證」記號 —— 寧可少一個依據，也不要一個指向空白的膠囊。
 */

export type Citation =
  | { kind: "line"; cite: string; day: string; author: string; blockId: string; label: string }
  | { kind: "object"; cite: string; ty: string; rid: string; label: string; page?: number }

export type CiteInfo = { label: string }

const CITE_RE = /⟦([^⟦⟧\n]{1,200})⟧/g
export const UNVERIFIED_MARK = "⟦?⟧"

export function parseCite(cite: string, info: CiteInfo): Citation | null {
  const line = cite.match(/^line:(\d{4}-\d{2}-\d{2}):([^:]+):(.+)$/)
  if (line) return { kind: "line", cite, day: line[1], author: line[2], blockId: line[3], label: info.label }
  // 檔案的頁碼引用：asset:<ref>#p<頁>（由 API 原生 citations 轉來，RES-037 §14）
  const page = cite.match(/^([a-z_]+):(.+)#p(\d{1,4})$/)
  if (page) return { kind: "object", cite, ty: page[1], rid: page[2], label: info.label, page: Number(page[3]) }
  const obj = cite.match(/^([a-z_]+):(.+)$/)
  if (obj) return { kind: "object", cite, ty: obj[1], rid: obj[2], label: info.label }
  return null
}

/**
 * 把答案裡的 ⟦cite⟧ 對照允許的集合：
 *   - 認得的：留著標記（前端把它換成膠囊），收進 citations（依第一次出現的順序、不重複）；
 *   - 不認得的：換成 ⟦?⟧，記進 dropped。
 */
export function verifyCitations(
  text: string,
  allowed: Map<string, CiteInfo>,
): { text: string; citations: Citation[]; dropped: string[] } {
  const citations: Citation[] = []
  const seen = new Set<string>()
  const dropped: string[] = []
  const out = text.replace(CITE_RE, (_all, raw: string) => {
    const cite = raw.trim()
    // 頁碼引用只要那份檔案讀過就承認；頁碼本身由 API 給，不是模型自己寫的
    const info = allowed.get(cite) ?? allowed.get(cite.replace(/#p\d{1,4}$/, ""))
    const parsed = info ? parseCite(cite, info) : null
    if (!parsed) {
      dropped.push(cite)
      return UNVERIFIED_MARK
    }
    if (!seen.has(cite)) {
      seen.add(cite)
      citations.push(parsed)
    }
    return `⟦${cite}⟧`
  })
  return { text: out, citations, dropped }
}

/**
 * API 原生 citations → 我們的引用記號。
 * 文件的 title 帶著「（asset:<ref>）」，引用回來的 document_title 就認得出是哪一份檔案。
 * PDF 給頁碼（page_location），文字檔沒有頁碼（char_location）。
 */
export function nativeCiteMarkers(citations: unknown): string {
  if (!Array.isArray(citations)) return ""
  const marks: string[] = []
  for (const c of citations as Array<Record<string, unknown>>) {
    const title = typeof c.document_title === "string" ? c.document_title : ""
    const ref = title.match(/asset:([A-Za-z0-9-]+)/)?.[1]
    if (!ref) continue
    const page = c.type === "page_location" && typeof c.start_page_number === "number" ? `#p${c.start_page_number}` : ""
    const mark = `⟦asset:${ref}${page}⟧`
    if (!marks.includes(mark)) marks.push(mark)
  }
  return marks.join("")
}

