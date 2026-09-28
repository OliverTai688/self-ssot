/**
 * 日誌檔案物件的共用契約（提案：journal-asset-upload-proposals.html）。
 *
 * 這個檔案同時被三個地方讀：
 *   - `/api/company/operating/uploads` 的 route handler（伺服器）
 *   - `src/lib/services/operating-assets.service.ts`（伺服器）
 *   - `scripts/verify-asset-pipeline.mjs` 的驗收 harness（node，不需 DB、不需瀏覽器）
 *
 * 所以它必須是純的：沒有 DOM、沒有 Prisma、沒有 "server-only"。
 * 與 `operating-commands.ts` 同一個理由 —— 唯一能在沙箱裡真的跑起來的那一層，
 * 就是不依賴 I/O 的那一層。
 */

/* ------------------------------------------------------------------ */
/* kind 與白名單                                                       */
/* ------------------------------------------------------------------ */

/** 卡片依 kind 換主體；索引依 kind 分 facet。順序即 facet 的顯示順序。 */
export const ASSET_KINDS = ['image', 'pdf', 'doc', 'sheet', 'slide', 'audio', 'video'] as const

export type AssetKind = (typeof ASSET_KINDS)[number]

export type AssetOrigin = 'journal' | 'library' | 'cashflow'

export type AssetStatus = 'uploading' | 'ready' | 'failed'

/**
 * 副檔名 → kind。這份表就是白名單本身：不在表上的一律拒絕。
 *
 * 舊白名單（md|txt|csv|json|png|jpe?g|webp|pdf）全數保留，否則文件庫既有的上傳會壞掉。
 * heic 收得進來但多數瀏覽器顯示不了，所以歸 image 之後在卡片那一層退回檔案圖示，
 * 不是在這裡擋掉 —— 使用者手機拍的就是 heic，擋掉等於叫他自己先轉檔。
 */
const EXTENSION_KINDS: Record<string, AssetKind> = {
  // image
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', heic: 'image',
  // pdf
  pdf: 'pdf',
  // doc（json 沒有自己的卡片樣貌，歸 doc）
  docx: 'doc', md: 'doc', txt: 'doc', json: 'doc',
  // sheet
  xlsx: 'sheet', csv: 'sheet',
  // slide
  pptx: 'slide',
  // audio
  mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio', ogg: 'audio',
  // video
  mp4: 'video', mov: 'video', webm: 'video', m4v: 'video',
}

/**
 * 明確拒絕、且要給得出理由的副檔名。
 *
 * 落在白名單外的東西本來就會被拒；這張表的意義是「看起來很像可以，其實不行」——
 * 使用者拿到的不能只是「不支援此格式」，而要知道為什麼 .docm 不行而 .docx 行。
 */
const EXPLICIT_DENY: Record<string, string> = {
  docm: '這是含巨集的 Word 檔，請另存成 .docx 再上傳。',
  xlsm: '這是含巨集的 Excel 檔，請另存成 .xlsx 再上傳。',
  pptm: '這是含巨集的 PowerPoint 檔，請另存成 .pptx 再上傳。',
  svg: 'SVG 可以內嵌腳本，請改上傳 PNG 或 JPG。',
  doc: '舊版 .doc 無法預覽也無法抽出內容，請另存成 .docx。',
  xls: '舊版 .xls 無法預覽也無法抽出內容，請另存成 .xlsx。',
  ppt: '舊版 .ppt 無法預覽也無法抽出內容，請另存成 .pptx。',
}

/**
 * 各 kind 的單檔上限（D1 保守版）。
 *
 * 訂在這裡而不是一個全域數字：一張 25 MB 的圖是相機原圖，一支 25 MB 的影片是 1 分鐘。
 * 同一個數字套在兩者身上，對圖太鬆、對影片太緊。
 */
export const ASSET_SIZE_LIMITS: Record<AssetKind, number> = {
  image: 25 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  doc: 50 * 1024 * 1024,
  sheet: 50 * 1024 * 1024,
  slide: 50 * 1024 * 1024,
  audio: 200 * 1024 * 1024,
  video: 500 * 1024 * 1024,
}

/**
 * 超過這個大小改走 multipart。
 *
 * 門檻不是 R2 的能力上限（單次 PUT 吃得到 5 GiB），而是「重傳一次會不會讓人想砸手機」。
 * 單次 PUT 沒有中繼點，掉訊號就整份重來。
 */
export const MULTIPART_THRESHOLD_BYTES = 64 * 1024 * 1024

/** 人話的 kind 名稱。facet chip 與錯誤訊息共用，不讓 'slide' 這種字出現在畫面上。 */
export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  image: '圖片',
  pdf: 'PDF',
  doc: '文件',
  sheet: '試算表',
  slide: '簡報',
  audio: '音訊',
  video: '影片',
}

export function assetExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0 || dot === fileName.length - 1) return ''
  return fileName.slice(dot + 1).toLowerCase()
}

export function assetKindForExtension(extension: string): AssetKind | null {
  return EXTENSION_KINDS[extension.toLowerCase()] ?? null
}

/** 給人看的大小，錯誤訊息用。整數就不帶小數點，免得出現「上限 50.0 MB」。 */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return (Number.isInteger(mb) ? String(mb) : mb.toFixed(1)) + ' MB'
  return Math.max(1, Math.round(bytes / 1024)) + ' KB'
}

export type AssetClassification =
  | { ok: true; kind: AssetKind; extension: string; multipart: boolean }
  | { ok: false; code: 'unsupported_type' | 'too_large' | 'invalid_name'; error: string }

/**
 * 單一的判定點：副檔名決定 kind，kind 決定上限。
 *
 * 前端與伺服器呼叫的是同一個函式，所以前端擋下來的理由與伺服器擋下來的理由一字不差。
 * 前端那一道是為了不要白跑一趟網路，伺服器這一道才是真正的那一道。
 */
export function classifyAsset(input: {
  name: string
  bytes: number
  mimeType?: string | null
}): AssetClassification {
  const name = (input.name || '').trim()
  if (!name || name.includes('/') || name.includes('\\') || name.includes('\u0000')) {
    return { ok: false, code: 'invalid_name', error: '檔名無效。' }
  }

  const extension = assetExtension(name)
  const denied = EXPLICIT_DENY[extension]
  if (denied) return { ok: false, code: 'unsupported_type', error: denied }

  const kind = assetKindForExtension(extension)
  if (!kind) {
    return {
      ok: false,
      code: 'unsupported_type',
      error: extension ? '不支援 .' + extension + ' 格式。' : '這個檔案沒有副檔名，無法判斷格式。',
    }
  }

  const bytes = Number(input.bytes)
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return { ok: false, code: 'too_large', error: '讀不到檔案大小。' }
  }

  const limit = ASSET_SIZE_LIMITS[kind]
  if (bytes > limit) {
    return {
      ok: false,
      code: 'too_large',
      error: ASSET_KIND_LABELS[kind] + '上限 ' + formatBytes(limit) + '，這個檔案 ' + formatBytes(bytes) + '。',
    }
  }

  return { ok: true, kind, extension, multipart: bytes > MULTIPART_THRESHOLD_BYTES }
}

/* ------------------------------------------------------------------ */
/* object key                                                          */
/* ------------------------------------------------------------------ */

/** 所有營運附件的共同前綴。越權存取別的模組的 key 才擋得住。 */
export const ASSET_KEY_ROOT = 'operating/'

/**
 * key 由伺服器決定，而且帶 workspaceId。
 *
 * 舊形狀是 `operating/{yyyy-mm}/{uuid}{ext}`，沒有租戶維度 —— 一個 key 看不出它屬於誰，
 * 授權只能靠「有沒有席位」。加上 workspaceId 之後，ARC-033 的隔離不變量在 key 本身就成立。
 * 檔名不進 key：使用者送來的路徑是目錄穿越最常見的入口，而顯示名稱本來就存在 DB。
 */
export function buildAssetObjectKey(input: {
  workspaceId: string
  extension: string
  uuid: string
  now?: Date
}): string {
  const month = (input.now ?? new Date()).toISOString().slice(0, 7)
  const ext = input.extension ? '.' + input.extension.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  return ASSET_KEY_ROOT + input.workspaceId + '/asset/' + month + '/' + input.uuid + ext
}

/** 舊 key（`operating/{yyyy-mm}/…`）仍然合法：文件庫既有的檔案都長那樣，不能讀不到。 */
export function isWellFormedAssetKey(objectKey: string): boolean {
  if (!objectKey.startsWith(ASSET_KEY_ROOT)) return false
  if (objectKey.includes('..')) return false
  if (objectKey.includes('//')) return false
  return objectKey.length <= 1024
}

/* ------------------------------------------------------------------ */
/* 參考碼（RES-018）                                                    */
/* ------------------------------------------------------------------ */

const ORIGIN_TOKENS: Record<AssetOrigin, string> = {
  journal: 'JRNL',
  library: 'LIB',
  cashflow: 'CASH',
}

export const ASSET_REF_CODE_PATTERN = /^AST-(JRNL|LIB|CASH)-\d{6}-\d{8}$/

/**
 * `AST-JRNL-000124-20260928` —— RES-018 的四段格式。
 *
 * 序號由**伺服器**指派，這是刻意的：`docObjectRefCode()` 把計數器放在前端記憶體裡，
 * 結果每次重新整理、每個席位都從 000001 重來，撞號讓寫入佇列卡死、還撞出一條渲染無限遞迴
 * （YZUI-020）。那份修法自己寫了結論「要根治得把號碼改由伺服器指派」——
 * 檔案物件從第一天就這樣做。
 */
export function formatAssetRefCode(input: { origin: AssetOrigin; seq: number; now?: Date }): string {
  const date = (input.now ?? new Date()).toISOString().slice(0, 10).replace(/-/g, '')
  return 'AST-' + ORIGIN_TOKENS[input.origin] + '-' + String(input.seq).padStart(6, '0') + '-' + date
}

/** 從既有參考碼取回序號，用來續號。看不懂的格式回 0，不猜。 */
export function parseAssetRefSeq(refCode: string | null | undefined): number {
  if (!refCode || !ASSET_REF_CODE_PATTERN.test(refCode)) return 0
  return Number(refCode.split('-')[2])
}

/* ------------------------------------------------------------------ */
/* 狀態機                                                              */
/* ------------------------------------------------------------------ */

const TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  // 重試沿用同一列與同一個 refCode（RES-018：參考碼永不重生成），只換新的 objectKey。
  uploading: ['ready', 'failed'],
  failed: ['uploading'],
  // ready 是終點。要換內容就是新的一份檔案、新的一列。
  ready: [],
}

export function canTransitionAsset(from: AssetStatus, to: AssetStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to)
}

/** 只有 ready 的檔案進得了 @ 選單與物件索引：傳到一半的東西不該被別人引用。 */
export function isAssetReferenceable(status: AssetStatus): boolean {
  return status === 'ready'
}

/* ------------------------------------------------------------------ */
/* 可見性                                                              */
/* ------------------------------------------------------------------ */

/**
 * 私人文件只有作者讀得到 —— 與 `operating-store.service.ts` 讀文件庫時的那條
 * `OR: [{ space:'team' }, { authorKey: { in: viewerSeatKeys } }]` 同一個規則。
 *
 * 之所以要有這個純函式：下載路由原本只檢查 key 開頭是 `operating/`，
 * 任何有席位的人拿到 key 就能換到下載網址，包含別人 space:'personal' 的檔案。
 * 把規則抽出來，harness 才驗得到它，而不是只能靠讀程式碼確認。
 */
export function canSeatReadAsset(
  asset: { workspaceId: string; space: string; authorKey: string | null },
  viewer: { workspaceId: string; seatKeys: string[] }
): boolean {
  if (asset.workspaceId !== viewer.workspaceId) return false
  if (asset.space === 'team') return true
  return Boolean(asset.authorKey) && viewer.seatKeys.includes(asset.authorKey as string)
}

/* ------------------------------------------------------------------ */
/* 孤兒                                                                */
/* ------------------------------------------------------------------ */

/** 預簽發出去但使用者關掉分頁：R2 可能已有 bytes 而 DB 還停在 uploading。 */
export const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000

export function isOrphanCandidate(
  asset: { status: string; updatedAt: Date },
  now: Date = new Date()
): boolean {
  if (asset.status !== 'uploading') return false
  return now.getTime() - asset.updatedAt.getTime() > ORPHAN_AFTER_MS
}
