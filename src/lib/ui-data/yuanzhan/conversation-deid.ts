/**
 * 對話去識別化 —— 純契約模組（無 DOM、無 Prisma、無 `server-only`）。
 *
 * 用在「對話分析」工作區（RES-036 §6.4、AUT-010 §7）：人選取一段對話之後，
 * 這裡把它轉成「將送出的版本」，人逐處確認後才可能離開本系統。
 *
 * 為什麼是純函式、而且前端與伺服器共用同一份：AUT-010 要求送出內容由伺服器依
 * 「訊息 id ＋ 遮蔽決定」重新組出，並與人確認時的指紋相同。兩邊跑的若不是同一支
 * 函式，指紋永遠對不上，或者更糟 —— 對得上但內容不同。
 *
 * 這裡只用規則與字典，不呼叫任何外部服務：拿外部 AI 來做去識別化，等於先把原文送出去。
 *
 * 已知限制（介面不得宣稱「已完全去識別化」）：規則抓不到字典裡沒有的名字。
 * 帶稱謂的字串會被標成「疑似人名」請人確認，其餘只能靠人看。
 */

export type ConvSide = 'us' | 'client' | 'vendor' | 'other'
export type ConvMessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'system'

export interface ConvMessage {
  id: string
  /** `YYYY-MM-DD HH:mm`；匯入來源沒有時間時為空字串 */
  at: string
  speaker: string
  type: ConvMessageType
  text: string
}

export interface ConvSpeaker {
  name: string
  side: ConvSide
  /** 對話裡提到這個人時會用的其他寫法（暱稱、姓＋稱謂） */
  aliases?: string[]
}

export type DeidTermKind = 'person' | 'company' | 'project' | 'term'
export interface DeidTerm {
  text: string
  kind: DeidTermKind
}

export type MaskKind =
  | 'speaker' | DeidTermKind
  | 'email' | 'url' | 'phone' | 'nid' | 'lineid' | 'taxid' | 'number' | 'address' | 'amount'

export interface DeidOptions {
  speakers?: ConvSpeaker[]
  /** 字典：專案參與者、客戶與公司名、專案名、工作區自訂遮蔽詞、人在覆核時補上的字 */
  terms?: DeidTerm[]
  /** 預設 true：金額是判讀承諾與條件變更的依據 */
  keepAmounts?: boolean
  /** 人按了「還原」的遮蔽（`mask.key`） */
  restored?: string[]
  /** 人整則排除的訊息 id */
  excluded?: string[]
}

export interface DeidMask {
  /** `訊息id:起點:終點`，同一份輸入下穩定，可當還原的鍵 */
  key: string
  kind: MaskKind
  label: string
  original: string
  restored: boolean
}

export interface DeidSegment {
  text: string
  mask?: DeidMask
  /** 疑似人名：沒有遮蔽，等人決定 */
  suspect?: boolean
}

export interface DeidMessage {
  id: string
  /** 送出內容裡的行號（1 起算）；不送出的訊息為 0 */
  index: number
  at: string
  speaker: string
  speakerLabel: string
  type: ConvMessageType
  segments: DeidSegment[]
  excluded: boolean
  /** 會出現在送出內容裡（文字訊息，或非文字訊息的佔位行） */
  sent: boolean
  outText: string
}

export interface DeidStats {
  total: number
  sent: number
  excluded: number
  /** 圖片、影音、語音、檔案：內容不送，只留佔位 */
  placeholders: number
  /** 貼圖與系統訊息：整則略去 */
  skipped: number
  chars: number
  maskTotal: number
  masks: Partial<Record<MaskKind, number>>
  restored: number
  suspects: string[]
}

export interface DeidResult {
  messages: DeidMessage[]
  /** 真實發話者 → 代號。只留在本機／伺服器，永不送出。 */
  speakerLabels: Record<string, string>
  stats: DeidStats
  payload: string
  fingerprint: string
}

export const MASK_KIND_LABELS: Record<MaskKind, string> = {
  speaker: '發話者',
  person: '人名',
  company: '公司',
  project: '專案',
  term: '自訂',
  email: 'Email',
  url: '網址',
  phone: '電話',
  nid: '證號',
  lineid: 'LINE ID',
  taxid: '統編',
  number: '號碼',
  address: '地址',
  amount: '金額',
}

export const SIDE_PREFIX: Record<ConvSide, string> = { us: '我方', client: '客戶', vendor: '廠商', other: '成員' }

export const PLACEHOLDER_LABELS: Partial<Record<ConvMessageType, string>> = {
  image: '〔圖片〕',
  video: '〔影片〕',
  audio: '〔語音〕',
  file: '〔檔案〕',
}

/** 單次分析的上限（AUT-010 §7.7）。 */
export const MAX_ANALYSIS_MESSAGES = 500
export const MAX_ANALYSIS_DAYS = 31

const FIXED_LABELS: Partial<Record<MaskKind, string>> = {
  email: '〔Email〕',
  url: '〔網址〕',
  phone: '〔電話〕',
  nid: '〔證號〕',
  lineid: '〔LINE ID〕',
  taxid: '〔統編〕',
  number: '〔號碼〕',
  address: '〔地址〕',
  amount: '〔金額〕',
}

const CITY =
  '(?:台北市|臺北市|新北市|桃園市|台中市|臺中市|台南市|臺南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|臺東縣|澎湖縣|金門縣|連江縣)'
const HAN = '\\u4e00-\\u9fa5'
const ADDR_TAIL = `(?:[一二三四五六七八九十\\d]+段)?(?:\\d+巷)?(?:\\d+弄)?\\d+(?:之\\d+)?號(?:\\d+樓)?(?:之\\d+)?`

/** 由上而下是優先序：重疊時前面的贏。 */
const PATTERNS: { kind: MaskKind; re: RegExp; group?: number; accept?: (m: RegExpExecArray, text: string) => boolean }[] = [
  { kind: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: 'url', re: /(?:https?:\/\/|www\.)[^\s，。、；！？）)】」』]+/g },
  { kind: 'phone', re: /(?<![\d-])(?:\+?886[-\s]?9|09)\d{2}[-\s]?\d{3}[-\s]?\d{3}(?!\d)/g },
  { kind: 'phone', re: /(?<![\d-])\(?0\d{1,2}\)?[-\s]?\d{3,4}[-\s]?\d{4}(?:\s?(?:#|分機|ext\.?)\s?\d{1,5})?(?!\d)/gi },
  { kind: 'nid', re: /(?<![A-Za-z0-9])[A-Z][12]\d{8}(?!\d)/g },
  { kind: 'lineid', re: /(?:LINE\s?ID|賴\s?ID|賴)\s*[:：]?\s*(@?[A-Za-z0-9][A-Za-z0-9._-]{3,19})/gi, group: 1 },
  { kind: 'taxid', re: /(?:統一編號|統編|稅籍編號)\s*[:：]?\s*(\d{8})(?!\d)/g, group: 1 },
  {
    kind: 'number',
    re: /(?<![\d-])\d{2,6}(?:[-\s]\d{2,8}){1,4}(?![\d-])/g,
    accept: m => m[0].replace(/\D/g, '').length >= 10 && !looksLikeDate(m[0]),
  },
  { kind: 'number', re: /(?<!\d)\d{10,19}(?!\d)/g },
  {
    kind: 'number',
    re: /(?<![\d.,$＄])\d{8}(?![\d.,])/g,
    accept: (m, text) => !isYmd(m[0]) && !/^\s?(?:萬|千|元|塊|億|%|％)/.test(text.slice(m.index + 8)),
  },
  { kind: 'address', re: new RegExp(`${CITY}[${HAN}]{1,3}[區鄉鎮市][${HAN}\\d]{1,8}(?:路|街|大道)${ADDR_TAIL}`, 'g') },
  { kind: 'address', re: new RegExp(`[${HAN}]{1,3}[區鄉鎮][${HAN}\\d]{1,8}(?:路|街|大道)${ADDR_TAIL}`, 'g') },
  { kind: 'address', re: new RegExp(`[${HAN}]{2,6}(?:路|街|大道)${ADDR_TAIL}`, 'g') },
]

const AMOUNT_PATTERNS: RegExp[] = [
  /(?:NT\$?|\$|＄)\s?\d[\d,]*(?:\.\d+)?(?:\s?[萬千百億]+)?(?:元|塊)?/gi,
  /\d[\d,]*(?:\.\d+)?\s?(?:萬元|萬|千元|億元|億|元|塊錢|塊)/g,
]

const SURNAMES =
  '陳林黃張李王吳劉蔡楊許鄭謝洪郭邱曾廖賴徐周葉蘇莊呂江何蕭羅高潘簡朱鍾游彭詹胡施沈余盧梁趙顏柯翁魏孫戴范方宋鄧杜傅侯曹薛丁卓阮馬董温溫唐藍石蔣古紀姚連馮歐程湯田康姜白汪鄒尤巫鐘黎涂龔嚴韓袁金童陸夏柳凃邵錢伍倪葛'
const TITLES =
  '(?:先生|小姐|太太|女士|老師|會計師|律師|代書|地政士|醫師|建築師|經理|副理|主任|組長|課長|處長|總監|董事長|總經理|執行長|老闆娘|老闆|董|總|哥|姐|姊)'
const SUSPECT_RE = new RegExp(`[${SURNAMES}][${HAN}]{0,2}?${TITLES}`, 'g')

function isYmd(s: string): boolean {
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8)
  return y >= 1990 && y <= 2099 && m >= 1 && m <= 12 && d >= 1 && d <= 31
}
function looksLikeDate(s: string): boolean {
  return /^\d{4}[-\s]\d{1,2}[-\s]\d{1,2}$/.test(s.trim())
}

interface Span { start: number; end: number; kind: MaskKind; rank: number; label?: string }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const letters = (n: number) => {
  let s = ''
  for (let i = n; i >= 0; i = Math.floor(i / 26) - 1) s = String.fromCharCode(65 + (i % 26)) + s
  return s
}

/**
 * 同一份輸入一定得到同一份輸出：沒有時間、亂數或環境相依。
 * 代號依「第一次出現的順序」指派，所以同一次分析裡同一個人、同一家公司永遠是同一個代號。
 */
export function deidentify(messages: ConvMessage[], options: DeidOptions = {}): DeidResult {
  const keepAmounts = options.keepAmounts !== false
  const restored = new Set(options.restored ?? [])
  const excluded = new Set(options.excluded ?? [])
  const speakers = options.speakers ?? []
  const sideOf = new Map(speakers.map(s => [s.name, s.side]))

  // 發話者代號：依出現順序，每一邊各自編號。我方用數字、外部用字母，一眼分得出內外。
  const speakerLabels: Record<string, string> = {}
  const sideCount: Record<ConvSide, number> = { us: 0, client: 0, vendor: 0, other: 0 }
  const labelSpeaker = (name: string) => {
    if (speakerLabels[name]) return speakerLabels[name]
    const side = sideOf.get(name) ?? 'other'
    const n = sideCount[side]++
    return (speakerLabels[name] = `${SIDE_PREFIX[side]}-${side === 'us' ? n + 1 : letters(n)}`)
  }
  // 被排除的訊息、以及這段對話裡沒開口的已知參與者也要有代號：他們的名字仍可能被別人提到。
  for (const m of messages) if (m.type !== 'system' && m.type !== 'sticker' && m.speaker) labelSpeaker(m.speaker)
  for (const s of speakers) labelSpeaker(s.name)

  // 字典：發話者本名與別名 → 該發話者的代號；其餘依種類編號。長的先比，避免「王志明」被「王」切開。
  const dict: { text: string; kind: MaskKind; fixed?: string }[] = []
  const seen = new Set<string>()
  const push = (text: string, kind: MaskKind, fixed?: string) => {
    const t = text.trim()
    if (t.length < 2 || seen.has(t)) return
    seen.add(t)
    dict.push({ text: t, kind, fixed })
  }
  for (const s of speakers) {
    push(s.name, 'speaker', speakerLabels[s.name])
    for (const a of s.aliases ?? []) push(a, 'speaker', speakerLabels[s.name])
  }
  for (const name of Object.keys(speakerLabels)) push(name, 'speaker', speakerLabels[name])
  for (const t of options.terms ?? []) push(t.text, t.kind)
  dict.sort((a, b) => b.text.length - a.text.length)

  const numbered: Record<string, Map<string, string>> = {}
  const labelTerm = (kind: MaskKind, original: string) => {
    const map = (numbered[kind] ??= new Map())
    const hit = map.get(original)
    if (hit) return hit
    const label =
      kind === 'person' ? `〔人名${map.size + 1}〕`
      : kind === 'company' ? `〔公司${letters(map.size)}〕`
      : kind === 'project' ? `〔專案${letters(map.size)}〕`
      : `〔遮蔽${map.size + 1}〕`
    map.set(original, label)
    return label
  }

  const stats: DeidStats = {
    total: messages.length, sent: 0, excluded: 0, placeholders: 0, skipped: 0,
    chars: 0, maskTotal: 0, masks: {}, restored: 0, suspects: [],
  }
  const suspectSet = new Set<string>()
  const out: DeidMessage[] = []
  let index = 0

  for (const m of messages) {
    const base = { id: m.id, at: m.at, speaker: m.speaker, type: m.type }
    if (m.type === 'system' || m.type === 'sticker') {
      stats.skipped++
      out.push({ ...base, index: 0, speakerLabel: '', segments: [{ text: m.text }], excluded: false, sent: false, outText: '' })
      continue
    }
    const speakerLabel = speakerLabels[m.speaker] ?? ''
    if (excluded.has(m.id)) {
      stats.excluded++
      out.push({ ...base, index: 0, speakerLabel, segments: [{ text: m.text }], excluded: true, sent: false, outText: '' })
      continue
    }
    if (m.type !== 'text') {
      const ph = PLACEHOLDER_LABELS[m.type] ?? '〔附件〕'
      stats.placeholders++
      stats.sent++
      out.push({ ...base, index: ++index, speakerLabel, segments: [{ text: ph }], excluded: false, sent: true, outText: ph })
      continue
    }

    const text = m.text
    const spans: Span[] = []
    PATTERNS.forEach((p, rank) => {
      p.re.lastIndex = 0
      let hit: RegExpExecArray | null
      while ((hit = p.re.exec(text))) {
        if (!hit[0]) { p.re.lastIndex++; continue }
        if (p.accept && !p.accept(hit, text)) continue
        const body = p.group ? hit[p.group] : hit[0]
        const start = p.group ? hit.index + hit[0].lastIndexOf(body) : hit.index
        spans.push({ start, end: start + body.length, kind: p.kind, rank })
      }
    })
    dict.forEach(d => {
      const re = new RegExp(escapeRe(d.text), 'g')
      let hit: RegExpExecArray | null
      while ((hit = re.exec(text))) spans.push({ start: hit.index, end: hit.index + d.text.length, kind: d.kind, rank: 100, label: d.fixed })
    })
    if (!keepAmounts)
      for (const re of AMOUNT_PATTERNS) {
        re.lastIndex = 0
        let hit: RegExpExecArray | null
        while ((hit = re.exec(text))) spans.push({ start: hit.index, end: hit.index + hit[0].length, kind: 'amount', rank: 200 })
      }

    // 重疊時：優先序在前的贏；同序取長的。贏的那一段把輸的整段蓋住，不留半截原文。
    spans.sort((a, b) => a.rank - b.rank || (b.end - b.start) - (a.end - a.start) || a.start - b.start)
    const taken: Span[] = []
    for (const s of spans) if (!taken.some(t => s.start < t.end && t.start < s.end)) taken.push(s)
    taken.sort((a, b) => a.start - b.start)

    // 疑似人名：只標不遮。已經被遮住的範圍不重複提示。
    const suspects: { start: number; end: number }[] = []
    SUSPECT_RE.lastIndex = 0
    let sh: RegExpExecArray | null
    while ((sh = SUSPECT_RE.exec(text))) {
      const s = sh.index, e = s + sh[0].length
      if (taken.some(t => s < t.end && t.start < e)) continue
      suspects.push({ start: s, end: e })
      suspectSet.add(sh[0])
    }

    const marks = [
      ...taken.map(t => ({ ...t, suspect: false })),
      ...suspects.map(s => ({ ...s, kind: 'person' as MaskKind, rank: 0, label: undefined, suspect: true })),
    ].sort((a, b) => a.start - b.start)

    const segments: DeidSegment[] = []
    let cursor = 0
    for (const k of marks) {
      if (k.start > cursor) segments.push({ text: text.slice(cursor, k.start) })
      const original = text.slice(k.start, k.end)
      if (k.suspect) segments.push({ text: original, suspect: true })
      else {
        const key = `${m.id}:${k.start}:${k.end}`
        const label = k.label ?? FIXED_LABELS[k.kind] ?? labelTerm(k.kind, original)
        const isRestored = restored.has(key)
        segments.push({ text: isRestored ? original : label, mask: { key, kind: k.kind, label, original, restored: isRestored } })
        if (isRestored) stats.restored++
        else { stats.maskTotal++; stats.masks[k.kind] = (stats.masks[k.kind] ?? 0) + 1 }
      }
      cursor = k.end
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor) })

    const outText = segments.map(s => s.text).join('')
    stats.sent++
    stats.chars += outText.length
    out.push({ ...base, index: ++index, speakerLabel, segments, excluded: false, sent: true, outText })
  }

  stats.suspects = [...suspectSet]
  const payload = out.filter(m => m.sent).map(m => `${m.index}. ${m.at ? `[${m.at.slice(5)}] ` : ''}${m.speakerLabel}：${m.outText}`).join('\n')
  return { messages: out, speakerLabels, stats, payload, fingerprint: payloadFingerprint(payload) }
}

/**
 * 送出內容的指紋。確認時記一次、送出前再算一次，不同就中止。
 * 這是比對用的雜湊（FNV-1a 兩輪），不是密碼學保證；伺服器端的稽核紀錄另存 SHA-256。
 */
export function payloadFingerprint(payload: string): string {
  const run = (seed: number) => {
    let h = seed >>> 0
    for (let i = 0; i < payload.length; i++) {
      h ^= payload.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h.toString(16).padStart(8, '0')
  }
  return run(0x811c9dc5) + run(0x9747b28c)
}

/**
 * 最後一道檢查：任何「目前是遮蔽狀態」的原字串，都不應該出現在送出內容裡。
 * 正常情況下回傳空陣列；不為空表示遮蔽邏輯有漏，介面必須擋下送出。
 */
export function findLeaks(result: DeidResult): string[] {
  const leaks = new Set<string>()
  const restoredOriginals = new Set<string>()
  for (const m of result.messages) for (const s of m.segments) if (s.mask?.restored) restoredOriginals.add(s.mask.original)
  for (const m of result.messages)
    for (const s of m.segments)
      if (s.mask && !s.mask.restored && !restoredOriginals.has(s.mask.original) && result.payload.includes(s.mask.original)) leaks.add(s.mask.original)
  for (const name of Object.keys(result.speakerLabels)) if (name.length >= 2 && !restoredOriginals.has(name) && result.payload.includes(name)) leaks.add(name)
  return [...leaks]
}

/** 依日期（含頭含尾，`YYYY-MM-DD`）切出一段。沒有時間的訊息一律保留。 */
export function sliceByDate(messages: ConvMessage[], from: string, to: string): ConvMessage[] {
  return messages.filter(m => !m.at || ((!from || m.at.slice(0, 10) >= from) && (!to || m.at.slice(0, 10) <= to)))
}

const EXPORT_PLACEHOLDERS: [RegExp, ConvMessageType][] = [
  [/^\[(?:照片|圖片|相片|Photo)\]$/i, 'image'],
  [/^\[(?:影片|Video)\]$/i, 'video'],
  [/^\[(?:語音訊息|語音|Voice message|Audio)\]$/i, 'audio'],
  [/^\[(?:檔案|File)\]/i, 'file'],
  [/^\[(?:貼圖|Sticker)\]$/i, 'sticker'],
]

export interface ParsedExport {
  title: string
  messages: ConvMessage[]
  speakers: string[]
}

/**
 * 解析 LINE App「傳送聊天記錄」匯出的 .txt（或直接貼上的文字）。
 *
 *   2026/10/12（一）
 *   09:14<TAB>王志明<TAB>報價單可以分兩期付嗎？
 *   下午02:05<TAB>戴宇星<TAB>可以
 *
 * 匯出檔只有文字：圖片是 `[照片]` 佔位，bytes 永遠拿不回來（RES-033 §5）。
 * 不是這個格式時退而求其次，接受「名字：內容」一行一則，沒有時間。
 */
export function parseLineExport(raw: string): ParsedExport {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n')
  const messages: ConvMessage[] = []
  const speakers: string[] = []
  let title = ''
  let day = ''
  let seq = 0
  const note = (name: string) => { if (!speakers.includes(name)) speakers.push(name) }
  const classify = (text: string): ConvMessageType => {
    for (const [re, type] of EXPORT_PLACEHOLDERS) if (re.test(text.trim())) return type
    return 'text'
  }
  const dateRe = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})(?:\s*[（(][^）)]*[）)])?\s*$/
  const msgRe = /^(上午|下午|AM|PM)?\s?(\d{1,2}):(\d{2})\s?(AM|PM)?\t([^\t]*)(?:\t([\s\S]*))?$/i
  const hasTabs = lines.some(l => msgRe.test(l))

  for (const line of lines) {
    if (!title && /^\[LINE\]/.test(line)) { title = line.replace(/^\[LINE\]\s*/, '').replace(/的聊天記錄$|的聊天$/, '').trim(); continue }
    if (/^儲存日期[:：]/.test(line)) continue
    const d = dateRe.exec(line)
    if (d) { day = `${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}`; continue }

    if (hasTabs) {
      const m = msgRe.exec(line)
      if (m) {
        const half = (m[1] || m[4] || '').toUpperCase()
        let hour = +m[2]
        if ((half === '下午' || half === 'PM') && hour < 12) hour += 12
        if ((half === '上午' || half === 'AM') && hour === 12) hour = 0
        const at = day ? `${day} ${String(hour).padStart(2, '0')}:${m[3]}` : ''
        const id = `m${++seq}`
        if (m[6] === undefined) { messages.push({ id, at, speaker: '', type: 'system', text: m[5] }); continue }
        let text = m[6]
        if (text.startsWith('"') && !text.endsWith('"')) text = text.slice(1)
        const speaker = m[5].trim()
        note(speaker)
        messages.push({ id, at, speaker, type: classify(text), text })
        continue
      }
      // 多行訊息的後續行：接在上一則後面。
      const last = messages[messages.length - 1]
      if (last && last.type === 'text' && line.trim()) last.text += '\n' + line.replace(/"$/, '')
      continue
    }

    const plain = /^([^：:\s][^：:]{0,19})[：:]\s?(.+)$/.exec(line)
    if (plain) {
      const speaker = plain[1].trim()
      note(speaker)
      messages.push({ id: `m${++seq}`, at: '', speaker, type: classify(plain[2]), text: plain[2] })
    } else {
      const last = messages[messages.length - 1]
      if (last && last.type === 'text' && line.trim()) last.text += '\n' + line
    }
  }
  return { title, messages, speakers }
}
