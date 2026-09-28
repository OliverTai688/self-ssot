/**
 * 日誌檔案物件 P0 契約層的驗收 harness。
 *
 *   node scripts/verify-asset-pipeline.mjs
 *
 * 為什麼是這種形狀：上傳是 I/O 行為，真正的 round trip 需要瀏覽器與真實 bucket，
 * 兩者在沙箱都沒有。但**決定行為的那一層全是純函式** —— 白名單、分級上限、
 * object key 的形狀、參考碼、狀態機、可見性判斷。這支把那一層原封不動地執行
 * （node 22 原生 type stripping，直接 import 那支 .ts，不抄第二份邏輯），
 * 逐條對應提案第十三節的驗收清單。
 *
 * 另外補一段 schema 依賴檢查：`prisma generate` 需要下載 engine，而 binaries.prisma.sh
 * 在這個環境被擋（403），所以 tsc 看到的 PrismaClient 型別是舊的，欄位名拼錯抓不到。
 * 與 check-operating-command-fields.mjs 同一個理由、同一個做法。
 */
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const MODULE_PATH = 'src/lib/ui-data/yuanzhan/operating-assets.ts'
const A = await import(pathToFileURL(MODULE_PATH).href)

const results = []
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, extra || ''])

/* ── 1. 白名單與分級上限 ─────────────────────────────────────────── */

const MB = 1024 * 1024

ok('舊白名單全數保留（文件庫既有上傳不會壞）',
  ['a.md', 'a.txt', 'a.csv', 'a.json', 'a.png', 'a.jpg', 'a.jpeg', 'a.webp', 'a.pdf']
    .every(n => A.classifyAsset({ name: n, bytes: 1024 }).ok))

ok('新格式收得進來：docx／xlsx／pptx／音訊／影片',
  ['a.docx', 'a.xlsx', 'a.pptx', 'a.mp3', 'a.m4a', 'a.mp4', 'a.mov'].every(
    n => A.classifyAsset({ name: n, bytes: 1024 }).ok))

ok('kind 判定正確',
  A.classifyAsset({ name: 'x.pptx', bytes: 1 }).kind === 'slide' &&
  A.classifyAsset({ name: 'x.xlsx', bytes: 1 }).kind === 'sheet' &&
  A.classifyAsset({ name: 'x.csv', bytes: 1 }).kind === 'sheet' &&
  A.classifyAsset({ name: 'x.HEIC', bytes: 1 }).kind === 'image' &&
  A.classifyAsset({ name: 'x.mov', bytes: 1 }).kind === 'video')

// 驗收 13：.docm 被拒，而且錯誤訊息說得出原因（不是「不支援此格式」了事）。
const docm = A.classifyAsset({ name: '報告.docm', bytes: 1024 })
ok('驗收13 · .docm 被拒且理由具體', !docm.ok && docm.code === 'unsupported_type' && /巨集/.test(docm.error), docm.error)

const svg = A.classifyAsset({ name: 'logo.svg', bytes: 512 })
ok('svg 被拒（可內嵌腳本）', !svg.ok && /腳本/.test(svg.error), svg.error)

ok('舊版 .doc/.xls/.ppt 被拒且指出替代格式',
  ['a.doc', 'a.xls', 'a.ppt'].every(n => {
    const v = A.classifyAsset({ name: n, bytes: 1024 })
    return !v.ok && /另存成/.test(v.error)
  }))

ok('不在白名單上的一律拒絕',
  ['a.exe', 'a.sh', 'a.zip', 'a.dmg'].every(n => !A.classifyAsset({ name: n, bytes: 10 }).ok))

ok('沒有副檔名的檔案被拒且說得出原因',
  (() => { const v = A.classifyAsset({ name: 'README', bytes: 10 }); return !v.ok && /副檔名/.test(v.error) })())

// 上限是分級的：同一個位元組數，對圖片超標、對影片還早。
const bigImage = A.classifyAsset({ name: 'a.png', bytes: 30 * MB })
const sameAsVideo = A.classifyAsset({ name: 'a.mp4', bytes: 30 * MB })
ok('分級上限：30 MB 的圖超標、30 MB 的影片沒事',
  !bigImage.ok && bigImage.code === 'too_large' && sameAsVideo.ok, bigImage.error)

ok('各 kind 的上限恰好落在宣告值上',
  Object.entries(A.ASSET_SIZE_LIMITS).every(([kind, limit]) => {
    const name = { image: 'a.png', pdf: 'a.pdf', doc: 'a.docx', sheet: 'a.xlsx', slide: 'a.pptx', audio: 'a.mp3', video: 'a.mp4' }[kind]
    return A.classifyAsset({ name, bytes: limit }).ok && !A.classifyAsset({ name, bytes: limit + 1 }).ok
  }))

ok('錯誤訊息帶得出上限與實際大小',
  /50 MB/.test(A.classifyAsset({ name: 'a.pptx', bytes: 60 * MB }).error))

ok('壞檔名被拒（路徑穿越的入口）',
  ['../etc/passwd.png', 'a/b.png', 'a\\b.png'].every(n => {
    const v = A.classifyAsset({ name: n, bytes: 10 })
    return !v.ok && v.code === 'invalid_name'
  }))

/* ── 2. multipart 門檻 ───────────────────────────────────────────── */

ok('64 MB 以下走單次 PUT', A.classifyAsset({ name: 'a.mp4', bytes: 64 * MB }).multipart === false)
ok('超過 64 MB 走 multipart', A.classifyAsset({ name: 'a.mp4', bytes: 64 * MB + 1 }).multipart === true)
ok('門檻常數就是 64 MB', A.MULTIPART_THRESHOLD_BYTES === 64 * MB)

/* ── 3. object key ──────────────────────────────────────────────── */

const WS = '11111111-2222-3333-4444-555555555555'
const key = A.buildAssetObjectKey({ workspaceId: WS, extension: 'pptx', uuid: 'abc-123', now: new Date('2026-09-28T04:00:00Z') })
ok('key 帶 workspaceId（ARC-033 租戶隔離在 key 本身成立）', key === `operating/${WS}/asset/2026-09/abc-123.pptx`, key)
ok('key 不含使用者送來的檔名', !key.includes('簡報') && !/[^\x20-\x7e]/.test(key))
ok('副檔名被正規化（擋掉夾帶）',
  A.buildAssetObjectKey({ workspaceId: WS, extension: '../PNG', uuid: 'u', now: new Date() }).endsWith('/u.png'))

ok('舊 key 仍視為合法（文件庫既有檔案讀得到）', A.isWellFormedAssetKey('operating/2026-07/abc.pdf'))
ok('目錄穿越與越過前綴一律不合法',
  !A.isWellFormedAssetKey('operating/../secret.pdf') &&
  !A.isWellFormedAssetKey('other/thing.pdf') &&
  !A.isWellFormedAssetKey('operating//thing.pdf'))

/* ── 4. 參考碼（RES-018） ───────────────────────────────────────── */

const ref = A.formatAssetRefCode({ origin: 'journal', seq: 124, now: new Date('2026-09-28T00:00:00Z') })
ok('參考碼是 RES-018 的四段格式', ref === 'AST-JRNL-000124-20260928' && A.ASSET_REF_CODE_PATTERN.test(ref), ref)
ok('三種來源各有 token',
  A.formatAssetRefCode({ origin: 'library', seq: 1, now: new Date('2026-09-28') }).startsWith('AST-LIB-') &&
  A.formatAssetRefCode({ origin: 'cashflow', seq: 1, now: new Date('2026-09-28') }).startsWith('AST-CASH-'))
ok('序號回讀得到（續號的依據）', A.parseAssetRefSeq(ref) === 124)
ok('看不懂的參考碼回 0，不猜',
  A.parseAssetRefSeq('DOC-JRNL-1-2026') === 0 && A.parseAssetRefSeq(null) === 0 && A.parseAssetRefSeq('') === 0)

// YZUI-020 的教訓：前端計數器每次重整都從 000001 重來 → 撞號 → 寫入佇列卡死 + 渲染無限遞迴。
// 續號必須從既有最大值往上，而不是從 0。
const existing = ['AST-JRNL-000001-20260901', 'AST-LIB-000007-20260915', 'AST-JRNL-000003-20260920']
const floor = Math.max(...existing.map(A.parseAssetRefSeq))
ok('續號取既有最大值（跨 origin 也要算進去）', floor === 7)

/* ── 5. 狀態機 ──────────────────────────────────────────────────── */

ok('uploading 可以走到 ready 或 failed',
  A.canTransitionAsset('uploading', 'ready') && A.canTransitionAsset('uploading', 'failed'))
ok('failed 可以重試回 uploading', A.canTransitionAsset('failed', 'uploading'))
ok('ready 是終點，不能回頭',
  !A.canTransitionAsset('ready', 'uploading') && !A.canTransitionAsset('ready', 'failed'))
// 驗收 8：只有 ready 進得了 @ 選單。
ok('驗收8 · 只有 ready 可被引用',
  A.isAssetReferenceable('ready') &&
  !A.isAssetReferenceable('uploading') &&
  !A.isAssetReferenceable('failed'))

/* ── 6. 可見性（本次補的既有漏洞） ──────────────────────────────── */

const teamFile = { workspaceId: WS, space: 'team', authorKey: 'yz' }
const lilyPrivate = { workspaceId: WS, space: 'personal', authorKey: 'lily' }
const asLily = { workspaceId: WS, seatKeys: ['lily'] }
const asYz = { workspaceId: WS, seatKeys: ['yz'] }

ok('團隊檔案兩個席位都讀得到',
  A.canSeatReadAsset(teamFile, asYz) && A.canSeatReadAsset(teamFile, asLily))
// 驗收 12：拿別人 personal 檔的 key 打 GET 應該是 403，而不是拿到下載網址。
ok('驗收12 · 私人檔案只有作者讀得到（Owner 也不行）',
  A.canSeatReadAsset(lilyPrivate, asLily) && !A.canSeatReadAsset(lilyPrivate, asYz))
ok('跨工作區一律不可讀',
  !A.canSeatReadAsset(teamFile, { workspaceId: 'other-workspace', seatKeys: ['yz'] }))
ok('personal 但沒有作者的檔案不可讀（不預設放行）',
  !A.canSeatReadAsset({ workspaceId: WS, space: 'personal', authorKey: null }, asYz))

/* ── 7. 孤兒 ────────────────────────────────────────────────────── */

const now = new Date('2026-09-28T12:00:00Z')
ok('uploading 超過 24 小時才算孤兒',
  A.isOrphanCandidate({ status: 'uploading', updatedAt: new Date('2026-09-27T11:00:00Z') }, now) &&
  !A.isOrphanCandidate({ status: 'uploading', updatedAt: new Date('2026-09-28T11:00:00Z') }, now))
ok('ready 與 failed 永遠不是孤兒候選',
  !A.isOrphanCandidate({ status: 'ready', updatedAt: new Date('2026-01-01') }, now) &&
  !A.isOrphanCandidate({ status: 'failed', updatedAt: new Date('2026-01-01') }, now))

/* ── 8. schema 依賴（補 prisma generate 跑不了的那一段） ────────── */

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
const modelBody = schema.match(/^model\s+OperatingAsset\s*\{([\s\S]*?)^\}/m)?.[1] ?? ''
const fields = new Set()
for (const raw of modelBody.split('\n')) {
  const line = raw.trim()
  if (!line || line.startsWith('//') || line.startsWith('@@')) continue
  const m = line.match(/^(\w+)\s+\S/)
  if (m) fields.add(m[1])
}
// 服務層實際讀寫的欄位。改 service 就要同步改這裡 —— 那是刻意的。
const NEEDED = ['id', 'workspaceId', 'workbenchRef', 'refCode', 'kind', 'displayName', 'bucket',
  'objectKey', 'mimeType', 'sizeBytes', 'contentHash', 'status', 'uploadId', 'space',
  'authorKey', 'origin', 'bornDay', 'bornAt', 'extractedText', 'durationSec', 'transcript',
  'deletedAt', 'createdAt', 'updatedAt']
const missing = NEEDED.filter(f => !fields.has(f))
ok('OperatingAsset 欄位齊全（服務層依賴的每一個都在）', missing.length === 0, missing.join(', '))
ok('refCode 有 UNIQUE（併發撞號的唯一防線）', /refCode\s+String\s+@unique/.test(modelBody))
ok('(bucket, objectKey) 有 UNIQUE', /@@unique\(\[bucket,\s*objectKey\]/.test(modelBody))

const migration = fs.readFileSync('prisma/migrations/20260928120000_operating_assets/migration.sql', 'utf8')
ok('migration 建的是同一張表', /CREATE TABLE "operating_assets"/.test(migration))
// 先剝掉 -- 註解再判：回滾說明裡本來就會寫到 DROP TABLE，那不是一句會執行的 SQL。
const migrationSql = migration.replace(/--[^\n]*/g, '')
ok('migration 沒有改動任何既有表（純新增）', !/\bALTER\s+TABLE\b|\bDROP\b/i.test(migrationSql))
ok('migration 帶上兩條 UNIQUE',
  /CREATE UNIQUE INDEX "operating_assets_ref_code_key"/.test(migration) &&
  /CREATE UNIQUE INDEX "operating_assets_object_key_unique"/.test(migration))

// snake_case 對照：Prisma @map 的每一個欄名都要真的出現在 migration 裡。
const mapped = [...modelBody.matchAll(/@map\("(\w+)"\)/g)].map(m => m[1])
const notInSql = mapped.filter(col => !new RegExp('"' + col + '"').test(migration))
ok('每個 @map 欄名都出現在 migration SQL', notInSql.length === 0, notInSql.join(', '))

/* ── 收尾 ───────────────────────────────────────────────────────── */

let failed = 0
for (const [status, name, extra] of results) {
  if (status === 'FAIL') failed += 1
  console.log(status.padEnd(5), name, extra ? '— ' + extra : '')
}
console.log('\n' + (results.length - failed) + '/' + results.length + (failed ? ' — FAILED' : ' PASS'))
process.exit(failed ? 1 : 0)
