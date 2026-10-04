/**
 * 專案雲端硬碟（`PLN-075` S2 第 5 項）的驗收 harness。
 *
 *   node scripts/verify-project-drive.mjs
 *
 * **不連資料庫、不連 R2。** 做法與 `scripts/check-operating-persistence.mjs` 一樣：
 * 把 `project-drive.service.ts` 的純函式區**原文抽出來實際執行** —— 不抄第二份邏輯，
 * 測的就是會被跑到的那一份。抽法是找 `PROJECT-DRIVE-PURE:BEGIN/END` 這對哨兵，
 * 寫進暫存 `.ts` 再 import（Node 22 的型別剝離預設開啟；哨兵區刻意不含 import，
 * 所以 `@/` 別名與 `server-only` 都不會被牽進來）。
 *
 * 哨兵不見了就當場失敗，而不是靜靜地少測幾條 —— 恆真的檢查比沒有檢查更糟。
 *
 * 這一支驗不到的（必須 Owner 在 macOS／瀏覽器實測）：
 *   真實 R2 round trip、預簽網址的 403、Prisma 的子樹 UPDATE 真的跑過、
 *   `(parent_id, name_normalized)` UNIQUE 在併發下的行為。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE = path.join(ROOT, 'src/lib/services/project-drive.service.ts')
const ROUTE_TREE = path.join(ROOT, 'src/app/api/company/operating/drive/route.ts')
const ROUTE_UPLOADS = path.join(ROOT, 'src/app/api/company/operating/drive/uploads/route.ts')

let failures = 0
let total = 0
function check(name, cond, detail) {
  total += 1
  const okFlag = Boolean(cond)
  console.log(`${okFlag ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!okFlag) {
    failures += 1
    if (detail !== undefined) console.log('      ' + JSON.stringify(detail))
  }
}

/* ------------------------------------------------------------------ */
/* 抽出純函式區並實際載入                                              */
/* ------------------------------------------------------------------ */

const serviceSource = fs.readFileSync(SERVICE, 'utf8')
const BEGIN = 'PROJECT-DRIVE-PURE:BEGIN'
const END = 'PROJECT-DRIVE-PURE:END'
const beginAt = serviceSource.indexOf(BEGIN)
const endAt = serviceSource.indexOf(END)
if (beginAt < 0 || endAt < 0 || endAt < beginAt) {
  console.error(`FAIL  找不到 ${BEGIN} / ${END} 哨兵 — 純函式區被改動或搬走了，這一支不能宣稱驗過。`)
  process.exit(1)
}
// 哨兵本身寫在註解裡，所以起點要跳過那段註解的 `*/`，終點要停在 END 註解的 `/*` 之前。
const regionStart = serviceSource.indexOf('*/', beginAt) + 2
const regionEnd = serviceSource.lastIndexOf('/*', endAt)
const region = serviceSource.slice(regionStart, regionEnd)

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-drive-verify-'))
const tmpFile = path.join(tmpDir, 'pure.ts')
fs.writeFileSync(tmpFile, region, 'utf8')
const P = await import(pathToFileURL(tmpFile).href)

check('純函式區自給自足（不含 import）', !/^\s*import\s/m.test(region), {
  firstImport: (region.match(/^\s*import\s.*/m) || [null])[0],
})
check('純函式區不含 db 查詢', !/\bdb\./.test(region) && !/prisma/i.test(region))

/* ------------------------------------------------------------------ */
/* 假資料：一棵真的有深度的樹                                           */
/* ------------------------------------------------------------------ */

const id = {
  ws: '11111111-1111-4111-8111-111111111111',
  proj: '22222222-2222-4222-8222-222222222222',
  otherProj: '33333333-3333-4333-8333-333333333333',
  root: 'aaaaaaaa-0000-4000-8000-000000000001',
  inbox: 'aaaaaaaa-0000-4000-8000-000000000002',
  m05: 'aaaaaaaa-0000-4000-8000-000000000005',
  m05sub: 'aaaaaaaa-0000-4000-8000-000000000006',
  m05leaf: 'aaaaaaaa-0000-4000-8000-000000000007',
  shared: 'aaaaaaaa-0000-4000-8000-000000000008',
  material: 'aaaaaaaa-0000-4000-8000-000000000009',
  contract: 'aaaaaaaa-0000-4000-8000-00000000000a',
  foreignRoot: 'bbbbbbbb-0000-4000-8000-000000000001',
  asset: 'cccccccc-0000-4000-8000-000000000001',
}

function folder(over) {
  return {
    id: over.id,
    projectId: over.projectId ?? id.proj,
    parentId: over.parentId ?? null,
    kind: over.kind ?? 'GENERIC',
    visibility: over.visibility ?? 'INTERNAL_ONLY',
    name: over.name ?? 'folder',
    nameNormalized: P.normalizeFolderName(over.name ?? 'folder'),
    path: over.path,
    depth: over.depth ?? P.depthForPath(over.path),
    sortOrder: over.sortOrder ?? 0,
    isSystem: over.isSystem ?? false,
    deletedAt: over.deletedAt ?? null,
  }
}

const pRoot = `/${id.root}/`
const pInbox = `${pRoot}${id.inbox}/`
const pM05 = `${pRoot}${id.m05}/`
const pM05Sub = `${pM05}${id.m05sub}/`
const pM05Leaf = `${pM05Sub}${id.m05leaf}/`
const pShared = `${pRoot}${id.shared}/`
const pMaterial = `${pRoot}${id.material}/`
const pContract = `${pRoot}${id.contract}/`

const tree = [
  folder({ id: id.root, kind: 'ROOT', name: '專案硬碟', path: pRoot, isSystem: true }),
  folder({ id: id.inbox, kind: 'INBOX', name: '收件匣', path: pInbox, parentId: id.root, isSystem: true }),
  // 05 是 Owner 既有的敏感夾（`商城專案資訊.docx` 含明文密碼）
  folder({ id: id.m05, name: '05 商城', path: pM05, parentId: id.root, visibility: 'RESTRICTED_NO_INDEX' }),
  folder({ id: id.m05sub, name: '需求書', path: pM05Sub, parentId: id.m05, visibility: 'INTERNAL_ONLY' }),
  folder({ id: id.m05leaf, name: '附件', path: pM05Leaf, parentId: id.m05sub, visibility: 'INTERNAL_ONLY' }),
  folder({ id: id.shared, name: '[共用]', path: pShared, parentId: id.root, kind: 'SHARED', visibility: 'CLIENT_VISIBLE' }),
  folder({ id: id.material, name: '素材庫', path: pMaterial, parentId: id.root, kind: 'MATERIAL' }),
  folder({ id: id.contract, name: '回簽合約', path: pContract, parentId: id.root, kind: 'CONTRACT' }),
]
const byId = k => tree.find(f => f.id === k)
const subtreeOf = f => tree.filter(r => P.isWithinSubtree(r.path, f.path))
const childrenOf = f => tree.filter(r => r.parentId === f.id)
const ancestorsOf = f => P.ancestorsFromPath(f, tree)

/* ================================================================== */
/* 一、樹的 CRUD 不變式                                                */
/* ================================================================== */

console.log('\n— 樹的 CRUD 不變式 —')

{
  const counts = { [id.inbox]: 3, [id.m05]: 1, [id.m05sub]: 2, [id.m05leaf]: 4, [id.shared]: 0 }
  const nodes = P.buildFolderTree(tree, counts)
  check('樹只有一個根', nodes.length === 1 && nodes[0].id === id.root, { roots: nodes.map(n => n.id) })
  const find = (ns, target) => {
    for (const n of ns) {
      if (n.id === target) return n
      const hit = find(n.children, target)
      if (hit) return hit
    }
    return null
  }
  const m05 = find(nodes, id.m05)
  check('每夾帶直接檔案計數', m05.fileCount === 1, { fileCount: m05.fileCount })
  check('子樹檔案計數捲起來（1+2+4=7）', m05.fileCountDeep === 7, { deep: m05.fileCountDeep })
  check('根的深層計數涵蓋整棵樹（3+7+0=10）', find(nodes, id.root).fileCountDeep === 10, {
    deep: find(nodes, id.root).fileCountDeep,
  })

  // 父夾被軟刪時子夾不該憑空消失：列成根層孤兒，看得見才查得到。
  const broken = tree.map(r => (r.id === id.m05 ? { ...r, deletedAt: new Date() } : r))
  const brokenNodes = P.buildFolderTree(broken, {})
  check('父夾軟刪後子夾成為可見的孤兒（不靜默消失）',
    brokenNodes.some(n => n.id === id.m05sub),
    { roots: brokenNodes.map(n => n.id) })
}

{
  const siblings = childrenOf(byId(id.root))
  check('同層撞名擋下（完全同名）',
    P.findSiblingNameConflict(siblings, P.normalizeFolderName('素材庫')) !== null)
  check('同層撞名擋下（只差大小寫）',
    P.findSiblingNameConflict(siblings, P.normalizeFolderName('[共用]')) !== null)
  check('同層撞名擋下（只差多餘空白）',
    P.findSiblingNameConflict(siblings, P.normalizeFolderName('  素材庫  ')) !== null)
  check('改名時不會和自己撞',
    P.findSiblingNameConflict(siblings, P.normalizeFolderName('素材庫'), id.material) === null)
  check('不同層同名是合法的',
    P.findSiblingNameConflict(childrenOf(byId(id.m05)), P.normalizeFolderName('素材庫')) === null)
  check('軟刪的同名夾不算撞名',
    P.findSiblingNameConflict(
      [{ id: 'x', name: '素材庫', nameNormalized: P.normalizeFolderName('素材庫'), deletedAt: new Date() }],
      P.normalizeFolderName('素材庫')
    ) === null)
  check('全形與半形括號**不**折成同一個（NFC 而非 NFKC）',
    P.normalizeFolderName('［共用］') !== P.normalizeFolderName('[共用]'))
}

{
  check('空名稱被拒', P.validateFolderName('   ').ok === false)
  check('名稱含 / 被拒', P.validateFolderName('a/b').ok === false)
  check('名稱含 \\ 被拒', P.validateFolderName('a\\b').ok === false)
  check('名稱含控制字元被拒', P.validateFolderName('a\u0007b').ok === false)
  check('名稱 .. 被拒', P.validateFolderName('..').ok === false)
  check('超長名稱被拒', P.validateFolderName('中'.repeat(200)).ok === false)
  const okName = P.validateFolderName('  20260411_M04_網站資源一版  ')
  check('合法中文名稱通過且前後空白被修掉',
    okName.ok === true && okName.name === '20260411_M04_網站資源一版', okName)
}

{
  const self = P.planFolderMove({
    folder: byId(id.m05), newParent: byId(id.m05),
    subtree: subtreeOf(byId(id.m05)), siblings: [], newAncestors: [],
  })
  check('不得搬進自己 → cycle', self.ok === false && self.code === 'cycle', self)

  const intoChild = P.planFolderMove({
    folder: byId(id.m05), newParent: byId(id.m05leaf),
    subtree: subtreeOf(byId(id.m05)), siblings: [], newAncestors: ancestorsOf(byId(id.m05leaf)),
  })
  check('不得搬進自己的子孫 → cycle', intoChild.ok === false && intoChild.code === 'cycle', intoChild)

  const foreign = folder({ id: id.foreignRoot, projectId: id.otherProj, kind: 'ROOT', path: `/${id.foreignRoot}/`, isSystem: true })
  const cross = P.planFolderMove({
    folder: byId(id.material), newParent: foreign,
    subtree: subtreeOf(byId(id.material)), siblings: [], newAncestors: [foreign],
  })
  check('不得跨專案搬移 → cross_project_move',
    cross.ok === false && cross.code === 'cross_project_move', cross)

  const sys = P.planFolderMove({
    folder: byId(id.inbox), newParent: byId(id.m05),
    subtree: subtreeOf(byId(id.inbox)), siblings: [], newAncestors: ancestorsOf(byId(id.m05)),
  })
  check('系統資料夾（收件匣）不得搬移',
    sys.ok === false && sys.code === 'system_folder_immutable', sys)

  const dupe = P.planFolderMove({
    folder: byId(id.material), newParent: byId(id.m05sub),
    subtree: subtreeOf(byId(id.material)),
    siblings: [{ id: 'other', name: '素材庫', nameNormalized: P.normalizeFolderName('素材庫'), deletedAt: null }],
    newAncestors: ancestorsOf(byId(id.m05sub)).concat([byId(id.m05sub)]),
  })
  check('目標夾同層撞名 → duplicate_name', dupe.ok === false && dupe.code === 'duplicate_name', dupe)

  const noop = P.planFolderMove({
    folder: byId(id.material), newParent: byId(id.root),
    subtree: subtreeOf(byId(id.material)), siblings: childrenOf(byId(id.root)), newAncestors: [byId(id.root)],
  })
  check('搬到原本的父夾 → noop（不產生空的子樹 UPDATE）',
    noop.ok === false && noop.code === 'noop', noop)

  const noParent = P.planFolderMove({
    folder: byId(id.material), newParent: null, subtree: [], siblings: [], newAncestors: [],
  })
  check('沒有目標夾 → parent_required（不把它當「搬到根」的簡寫）',
    noParent.ok === false && noParent.code === 'parent_required', noParent)

  check('isWithinSubtree 不把兄弟夾當子樹',
    P.isWithinSubtree(pShared, pM05) === false)
  // path 頭尾都有 `/`，所以前綴比對不會把 `…0005/` 當成 `…00055/` 的祖先。
  check('前綴比對不會把 id 當成另一個 id 的前綴',
    P.isWithinSubtree(pM05.slice(0, -1) + '5/', pM05) === false,
    { candidate: pM05.slice(0, -1) + '5/', ancestor: pM05 })
}

/* ================================================================== */
/* 二、搬移：子樹 path 前綴全部跟著更新（Wave 1 落差②）                  */
/* ================================================================== */

console.log('\n— 子樹 path 重算 —')

{
  const moving = byId(id.m05)           // 帶兩層子孫
  const target = byId(id.shared)        // 搬到 [共用] 底下
  // [共用] 是 CLIENT_VISIBLE，比 RESTRICTED_NO_INDEX 寬，所以不構成放寬，應允許
  const plan = P.planFolderMove({
    folder: moving, newParent: target,
    subtree: subtreeOf(moving), siblings: childrenOf(target),
    newAncestors: ancestorsOf(target).concat([target]),
  })
  check('帶子樹的搬移成立', plan.ok === true, plan)

  if (plan.ok) {
    const expectedPrefix = `${pShared}${id.m05}/`
    check('新前綴 = 目標夾 path ＋ 自己的 id', plan.newPrefix === expectedPrefix, {
      got: plan.newPrefix, want: expectedPrefix,
    })
    check('子樹三列全部被重算（自己＋兩層子孫）', plan.rows.length === 3, { rows: plan.rows.length })
    check('**沒有任何一列留在舊前綴**',
      plan.rows.every(r => !r.path.startsWith(plan.oldPrefix)),
      plan.rows)
    check('每一列的新 path 都以新前綴開頭',
      plan.rows.every(r => r.path.startsWith(plan.newPrefix)),
      plan.rows)

    const leaf = plan.rows.find(r => r.id === id.m05leaf)
    check('最深的那一列 path 正確', leaf.path === `${expectedPrefix}${id.m05sub}/${id.m05leaf}/`, leaf)
    check('最深的那一列 depth 跟著 +1（3 → 4）', leaf.depth === 4, leaf)
    check('depth 一律由 path 重算，不是靠 delta 猜',
      plan.rows.every(r => r.depth === P.depthForPath(r.path)), plan.rows)
    check('depthDelta 與實際位移一致（1 層）', plan.depthDelta === 1, { delta: plan.depthDelta })

    // SQL 做的事：newPrefix || substr(path, length(oldPrefix)+1)。這裡驗同一條算式。
    check('rewriteSubtreePath 與 SQL 的前綴替換等價',
      plan.rows.every(r => {
        const before = subtreeOf(moving).find(x => x.id === r.id).path
        return P.rewriteSubtreePath(before, plan.oldPrefix, plan.newPrefix) === r.path
      }), plan.rows)
    check('前綴對不上的列原封不動（SQL 的 LIKE 不會選到它）',
      P.rewriteSubtreePath(pMaterial, plan.oldPrefix, plan.newPrefix) === pMaterial)
  }
}

{
  // 深度上限：把一條很深的鏈往下再推，應被 too_deep 擋下而不是寫出一條超長 path
  let pp = pRoot
  const deep = [folder({ id: id.root, kind: 'ROOT', path: pRoot, isSystem: true })]
  for (let i = 0; i < 12; i += 1) {
    const fid = `dddddddd-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`
    pp = `${pp}${fid}/`
    deep.push(folder({ id: fid, parentId: deep[deep.length - 1].id, path: pp, name: 'd' + i }))
  }
  const movingDeep = deep[1]
  const targetDeep = deep[deep.length - 1]
  const plan = P.planFolderMove({
    folder: movingDeep, newParent: targetDeep,
    subtree: deep.filter(r => P.isWithinSubtree(r.path, movingDeep.path)),
    siblings: [], newAncestors: [],
  })
  check('超過深度上限 → 被擋下（不寫出一條長到寫不進去的 path）',
    plan.ok === false && (plan.code === 'too_deep' || plan.code === 'cycle'), plan)
}

/* ================================================================== */
/* 三、可見性三級：繼承 ＋ 祖先較嚴時不得放寬                            */
/* ================================================================== */

console.log('\n— 可見性三級 —')

{
  const inheritFromInternal = P.evaluateVisibility({
    requested: null, kind: 'GENERIC', ancestors: [byId(id.m05sub)], parentVisibility: 'INTERNAL_ONLY',
  })
  check('未指定時子夾繼承父夾可見性',
    inheritFromInternal.ok && inheritFromInternal.visibility === 'INTERNAL_ONLY', inheritFromInternal)

  const inheritFromClient = P.evaluateVisibility({
    requested: null, kind: 'GENERIC', ancestors: [byId(id.shared)], parentVisibility: 'CLIENT_VISIBLE',
  })
  check('父夾是 CLIENT_VISIBLE 時子夾也繼承到 CLIENT_VISIBLE',
    inheritFromClient.ok && inheritFromClient.visibility === 'CLIENT_VISIBLE', inheritFromClient)

  check('沒有父夾時落到最保守的 INTERNAL_ONLY',
    P.inheritVisibility(null) === 'INTERNAL_ONLY')

  const relax1 = P.evaluateVisibility({
    requested: 'CLIENT_VISIBLE', kind: 'GENERIC', ancestors: [byId(id.m05sub)],
  })
  check('祖先 INTERNAL_ONLY → 不得調成 CLIENT_VISIBLE',
    relax1.ok === false && relax1.code === 'ancestor_visibility_floor', relax1)

  const relax2 = P.evaluateVisibility({
    requested: 'CLIENT_VISIBLE', kind: 'GENERIC', ancestors: ancestorsOf(byId(id.m05leaf)),
  })
  check('祖先 RESTRICTED_NO_INDEX → 不得調成 CLIENT_VISIBLE',
    relax2.ok === false && relax2.code === 'ancestor_visibility_floor', relax2)

  const relax3 = P.evaluateVisibility({
    requested: 'INTERNAL_ONLY', kind: 'GENERIC', ancestors: [byId(id.m05)],
  })
  check('祖先 RESTRICTED_NO_INDEX → 連半放寬到 INTERNAL_ONLY 也拒絕',
    relax3.ok === false && relax3.code === 'ancestor_visibility_floor', relax3)

  const tighten = P.evaluateVisibility({
    requested: 'RESTRICTED_NO_INDEX', kind: 'GENERIC', ancestors: [byId(id.m05sub)],
  })
  check('收緊的方向允許（INTERNAL_ONLY 底下可以更嚴）',
    tighten.ok === true && tighten.visibility === 'RESTRICTED_NO_INDEX', tighten)

  for (const kind of ['CONTRACT', 'INTERNAL', 'FINANCE']) {
    const verdict = P.evaluateVisibility({ requested: 'CLIENT_VISIBLE', kind, ancestors: [] })
    check(`${kind} 類資料夾永遠不得 CLIENT_VISIBLE`,
      verdict.ok === false && verdict.code === 'kind_forbids_client_visible', verdict)
  }

  const bogus = P.evaluateVisibility({ requested: 'PUBLIC', kind: 'GENERIC', ancestors: [] })
  check('不認得的可見性等級被拒（deny-by-default）',
    bogus.ok === false && bogus.code === 'invalid_visibility', bogus)

  // 搬移走同一條規則：把 CLIENT_VISIBLE 的夾搬進 INTERNAL_ONLY 底下 = 放寬祖先
  const movedUnderInternal = P.planFolderMove({
    folder: byId(id.shared), newParent: byId(id.m05sub),
    subtree: subtreeOf(byId(id.shared)), siblings: childrenOf(byId(id.m05sub)),
    newAncestors: ancestorsOf(byId(id.m05sub)).concat([byId(id.m05sub)]),
  })
  check('搬移也走同一條可見性規則（CLIENT_VISIBLE 不得搬進 INTERNAL_ONLY 底下）',
    movedUnderInternal.ok === false && movedUnderInternal.code === 'ancestor_visibility_floor',
    movedUnderInternal)

  check('可見性 rank 的方向：CLIENT < INTERNAL < RESTRICTED',
    P.DRIVE_VISIBILITY_RANK.CLIENT_VISIBLE < P.DRIVE_VISIBILITY_RANK.INTERNAL_ONLY &&
      P.DRIVE_VISIBILITY_RANK.INTERNAL_ONLY < P.DRIVE_VISIBILITY_RANK.RESTRICTED_NO_INDEX)
  check('祖先鏈取最嚴的那一級',
    P.strictestAncestorVisibility([byId(id.shared), byId(id.m05), byId(id.m05sub)]) === 'RESTRICTED_NO_INDEX')
}

/* ================================================================== */
/* 四、RESTRICTED_NO_INDEX 不會被建索引                                 */
/* ================================================================== */

console.log('\n— 不建索引的守門 —')

{
  const selfPolicy = P.resolveIndexingPolicy({ folder: byId(id.m05), ancestors: [] })
  check('RESTRICTED_NO_INDEX 的夾本身不可索引',
    selfPolicy.indexable === false && selfPolicy.blockedBy === 'self', selfPolicy)

  // 這是整條規則存在的理由：子夾自己是 INTERNAL_ONLY，但祖先是最高敏感
  const inherited = P.resolveIndexingPolicy({
    folder: byId(id.m05leaf), ancestors: ancestorsOf(byId(id.m05leaf)),
  })
  check('祖先是 RESTRICTED_NO_INDEX 時整個子樹都不可索引（即使子夾自己是 INTERNAL_ONLY）',
    inherited.indexable === false && inherited.blockedBy === id.m05, inherited)

  const normal = P.resolveIndexingPolicy({ folder: byId(id.shared), ancestors: [byId(id.root)] })
  check('一般夾可索引', normal.indexable === true && normal.blockedBy === null, normal)

  check('守門回傳的是人看得懂的理由（不是靜靜地不寫）',
    typeof P.indexingRefusalReason(inherited) === 'string' &&
      P.indexingRefusalReason(inherited).length > 0, P.indexingRefusalReason(inherited))
  check('可索引時守門回 null', P.indexingRefusalReason(normal) === null)

  const nodes = P.buildFolderTree(tree, {})
  const flat = []
  const walk = ns => ns.forEach(n => { flat.push(n); walk(n.children) })
  walk(nodes)
  const noIndexIds = flat.filter(n => !n.indexable).map(n => n.id).sort()
  check('樹上整個敏感子樹都被標成不可索引',
    JSON.stringify(noIndexIds) === JSON.stringify([id.m05, id.m05sub, id.m05leaf].sort()),
    { noIndexIds })
  check('樹上其他夾仍可索引',
    flat.filter(n => n.indexable).map(n => n.id).includes(id.shared))
}

/* ================================================================== */
/* 五、歸檔：只改 folderId / filedAt，不產生任何 R2 操作                  */
/* ================================================================== */

console.log('\n— 歸檔只改 DB —')

const NOW = new Date('2026-10-03T04:05:06.000Z')

{
  const asset = {
    id: id.asset, projectId: id.proj, folderId: id.inbox,
    status: 'ready', deletedAt: null, extractedText: null,
  }
  const plan = P.planAssetFiling({
    asset, folder: byId(id.material), ancestors: ancestorsOf(byId(id.material)), now: NOW,
  })
  check('歸檔成立', plan.ok === true, plan)
  if (plan.ok) {
    check('**不產生任何 R2 操作**', Array.isArray(plan.r2Operations) && plan.r2Operations.length === 0, plan.r2Operations)
    const keys = Object.keys(plan.data).sort()
    check('只寫 folderId / filedAt', JSON.stringify(keys) === JSON.stringify(['filedAt', 'folderId']), keys)
    check('objectKey / bucket / sizeBytes / status 一個字都不動',
      !('objectKey' in plan.data) && !('bucket' in plan.data) &&
        !('sizeBytes' in plan.data) && !('status' in plan.data), plan.data)
    check('寫入欄位全在白名單內',
      keys.every(k => P.ASSET_FILING_WRITABLE_FIELDS.includes(k)),
      { keys, whitelist: P.ASSET_FILING_WRITABLE_FIELDS })
    check('filedAt 用傳入的時刻（不偷讀時鐘）', plan.data.filedAt === NOW)
  }

  const unlinked = P.planAssetFiling({
    asset: { ...asset, projectId: null, folderId: null },
    folder: byId(id.material), ancestors: ancestorsOf(byId(id.material)), now: NOW,
  })
  check('既有未綁專案的檔案歸檔時補上 projectId',
    unlinked.ok === true && unlinked.data.projectId === id.proj, unlinked)

  const crossProject = P.planAssetFiling({
    asset: { ...asset, projectId: id.otherProj },
    folder: byId(id.material), ancestors: [], now: NOW,
  })
  check('不得把檔案歸到別的專案的資料夾',
    crossProject.ok === false && crossProject.code === 'cross_project_filing', crossProject)

  const notReady = P.planAssetFiling({
    asset: { ...asset, status: 'uploading' },
    folder: byId(id.material), ancestors: [], now: NOW,
  })
  check('傳到一半的檔案不得歸檔', notReady.ok === false && notReady.code === 'asset_not_ready', notReady)

  const deletedAsset = P.planAssetFiling({
    asset: { ...asset, deletedAt: NOW }, folder: byId(id.material), ancestors: [], now: NOW,
  })
  check('已刪除的檔案不得歸檔', deletedAsset.ok === false && deletedAsset.code === 'asset_deleted', deletedAsset)

  const deletedFolder = P.planAssetFiling({
    asset, folder: { ...byId(id.material), deletedAt: NOW }, ancestors: [], now: NOW,
  })
  check('不得歸進已刪除的資料夾', deletedFolder.ok === false && deletedFolder.code === 'folder_deleted', deletedFolder)

  // 落進不得索引的子樹：先前抽好的明文必須被清掉，不是「以後不要再抽」
  const intoNoIndex = P.planAssetFiling({
    asset: { ...asset, extractedText: '登入密碼 abc123' },
    folder: byId(id.m05leaf), ancestors: ancestorsOf(byId(id.m05leaf)), now: NOW,
  })
  check('歸進不得索引的子樹時把既有抽文字清掉',
    intoNoIndex.ok === true && intoNoIndex.data.extractedText === null, intoNoIndex)
  check('歸進不得索引的子樹時回報 indexable=false',
    intoNoIndex.ok === true && intoNoIndex.indexing.indexable === false, intoNoIndex)
  check('清抽文字也不產生 R2 操作',
    intoNoIndex.ok === true && intoNoIndex.r2Operations.length === 0)
}

/* ================================================================== */
/* 六、軟刪                                                            */
/* ================================================================== */

console.log('\n— 軟刪 —')

{
  const sys = P.planFolderSoftDelete({ folder: byId(id.inbox), subtree: subtreeOf(byId(id.inbox)), liveAssetCount: 0 })
  check('系統資料夾不得刪除', sys.ok === false && sys.code === 'system_folder_immutable', sys)

  const notEmpty = P.planFolderSoftDelete({ folder: byId(id.m05), subtree: subtreeOf(byId(id.m05)), liveAssetCount: 7 })
  check('子樹裡還有檔案 → 拒絕（不讓 bytes 變成查不清的孤兒）',
    notEmpty.ok === false && notEmpty.code === 'folder_not_empty', notEmpty)

  const okDelete = P.planFolderSoftDelete({ folder: byId(id.m05), subtree: subtreeOf(byId(id.m05)), liveAssetCount: 0 })
  check('空的子樹整串軟刪（3 列）', okDelete.ok === true && okDelete.ids.length === 3, okDelete)
  check('軟刪用 path 前綴，與搬移同一把尺',
    okDelete.ok === true && okDelete.prefix === pM05, okDelete)
}

/* ================================================================== */
/* 七、R2 key：路徑與中文檔名一律不進 key                                */
/* ================================================================== */

console.log('\n— R2 key —')

{
  const uuid = 'eeeeeeee-0000-4000-8000-000000000001'
  const mk = fileName => P.buildProjectDriveObjectKey({
    workspaceId: id.ws, projectId: id.proj, uuid, fileName, now: NOW,
  })
  const asciiOnly = k => /^[A-Za-z0-9/_.-]+$/.test(k)
  const hasNonAscii = k => /[^\x00-\x7F]/.test(k)

  const key = mk('商城專案資訊.docx')
  check('key 形狀 = operating/{ws}/project/{projectId}/{yyyy-mm}/{uuid}{ext}',
    key === `operating/${id.ws}/project/${id.proj}/2026-10/${uuid}.docx`, key)
  check('中文檔名 → key 仍是純 ASCII', asciiOnly(key), key)
  check('中文檔名的中文完全不進 key', !key.includes('商城') && !hasNonAscii(key), key)

  const fullwidth = mk('報價單．ＰＮＧ')
  check('全形副檔名 → 濾成安全 ASCII', asciiOnly(fullwidth), fullwidth)
  check('全形字元不進 key', !hasNonAscii(fullwidth), fullwidth)

  const upper = mk('REPORT.PDF')
  check('大寫副檔名 → 小寫', upper.endsWith('.pdf'), upper)

  const traversal = mk('../../etc/passwd.png')
  check('檔名裡的路徑不進 key（只取副檔名）',
    traversal === `operating/${id.ws}/project/${id.proj}/2026-10/${uuid}.png`, traversal)
  check('key 不含 ..', !traversal.includes('..'), traversal)

  const spaced = mk('我的 報告 v2.final.XLSX')
  check('多個點只取最後一段副檔名', spaced.endsWith('.xlsx'), spaced)
  check('檔名裡的空白不進 key', !spaced.includes(' '), spaced)

  const noExt = mk('備份')
  check('沒有副檔名時不補假的副檔名',
    noExt === `operating/${id.ws}/project/${id.proj}/2026-10/${uuid}`, noExt)

  check('sanitizeKeyExtension 砍掉非 ASCII 與符號',
    P.sanitizeKeyExtension('檔案.ｐｎｇ') === '' && P.sanitizeKeyExtension('a.Tar-Gz') === 'targz')
  check('sanitizeKeyExtension 有長度上限',
    P.sanitizeKeyExtension('a.' + 'x'.repeat(40)).length <= 8)

  let threw = null
  try { P.buildProjectDriveObjectKey({ workspaceId: id.ws, projectId: id.proj, uuid: '../../evil', now: NOW }) }
  catch (e) { threw = e }
  check('前端送來的假 uuid 被擋（key 必須由伺服器產生）', threw !== null,
    threw && threw.message)

  let threw2 = null
  try { P.buildProjectDriveObjectKey({ workspaceId: 'not-a-uuid', projectId: id.proj, uuid, now: NOW }) }
  catch (e) { threw2 = e }
  check('workspaceId 形狀不對就丟（不默默產生怪 key）', threw2 !== null)

  check('合法 key 通過 isWellFormedProjectDriveKey', P.isWellFormedProjectDriveKey(key) === true)
  check('含 .. 的 key 被拒',
    P.isWellFormedProjectDriveKey(`operating/${id.ws}/project/../x/2026-10/${uuid}`) === false)
  check('含 // 的 key 被拒',
    P.isWellFormedProjectDriveKey(`operating/${id.ws}//project/${id.proj}/2026-10/${uuid}`) === false)
  check('含非 ASCII 的 key 被拒',
    P.isWellFormedProjectDriveKey(`operating/${id.ws}/project/${id.proj}/2026-10/報告.docx`) === false)
  check('別的模組前綴的 key 被拒',
    P.isWellFormedProjectDriveKey(`other/${id.ws}/project/${id.proj}/2026-10/${uuid}`) === false)
  check('資料夾路徑不在 key 的形狀裡（key 永遠只有五段 ＋ 檔名）',
    key.split('/').length === 6, key.split('/'))
}

/* ================================================================== */
/* 八、靜態來源檢查：workspaceId 與 R2 的邊界                            */
/* ================================================================== */

console.log('\n— 來源靜態檢查 —')

{
  const routeTree = fs.readFileSync(ROUTE_TREE, 'utf8')
  const routeUploads = fs.readFileSync(ROUTE_UPLOADS, 'utf8')

  for (const [label, src] of [['樹 route', routeTree], ['uploads route', routeUploads]]) {
    check(`${label} 不從 body 讀 workspaceId`,
      !/body\??\.\s*workspaceId/.test(src) &&
        !/readString\(\s*body\s*,\s*["']workspaceId/.test(src), label)
    check(`${label} 不從 query 讀 workspaceId 當值用`,
      !/searchParams\.get\(\s*["']workspaceId/.test(src), label)
    check(`${label} 前端送 workspaceId 時當場退 400`,
      src.includes('workspace_id_not_accepted'), label)
    check(`${label} 走 requireUser()`, src.includes('requireUser()'), label)
    check(`${label} 回應帶 no-store`, src.includes('private, no-store'), label)
    check(`${label} 把 capability 的 404 與 403 分開對映`,
      /ProjectCapabilityError[\s\S]{0,300}project_not_found[\s\S]{0,200}403/.test(src), label)
    check(`${label} capability 型別換掉時仍預設拒絕（名稱比對 fallback）`,
      /Capability\|Forbidden\|Unauthorized\|Permission/.test(src), label)
  }
  check('uploads route 不接受前端送來的 objectKey',
    routeUploads.includes('object_key_not_accepted'))
}

{
  // 歸檔與資料夾 CRUD 不得碰 R2：服務層不得 import 會動 bytes 的 command。
  check('服務層沒有 import 任何會搬／刪／寫 bytes 的 R2 command',
    !/CopyObjectCommand|DeleteObjectCommand|PutObjectCommand/.test(serviceSource))
  check('服務層沿用既有 headObject() finalize 形狀',
    serviceSource.includes('from "@/lib/storage/object-head"') && serviceSource.includes('headObject('))
  check('服務層沿用既有 presigned URL 形狀',
    serviceSource.includes('from "@/lib/storage/presigned-url"'))
  check('服務層沿用共用白名單契約 classifyAsset()', serviceSource.includes('classifyAsset('))

  const writeEntries = [
    'createProjectFolder', 'renameProjectFolder', 'moveProjectFolder',
    'softDeleteProjectFolder', 'setProjectFolderVisibility', 'fileAssetIntoFolder',
    'writeAssetExtractedText', 'createProjectDriveUpload', 'finalizeProjectDriveAsset',
    'failProjectDriveAsset',
  ]
  const bodyOf = name => {
    const at = serviceSource.indexOf(`export async function ${name}(`)
    if (at < 0) return null
    const next = serviceSource.indexOf('\nexport ', at + 1)
    return serviceSource.slice(at, next < 0 ? undefined : next)
  }
  for (const name of writeEntries) {
    const body = bodyOf(name)
    check(`${name}() 先過 assertProjectCapability`,
      body !== null && body.includes('assertProjectCapability('), { found: body !== null })
  }
  for (const name of ['listProjectFolderTree', 'listFolderContents', 'resolveProjectDriveDownloadUrl']) {
    const body = bodyOf(name)
    check(`${name}() 先過 drive:read capability`,
      body !== null && body.includes('assertProjectCapability(') && body.includes('"drive:read"'),
      { found: body !== null })
  }

  check('capability 服務只被 import，不在本檔實作',
    serviceSource.includes('from "@/lib/services/project-capability.service"') &&
      !serviceSource.includes('export async function assertProjectCapability'))
  check('搬移用一條子樹 UPDATE（不是 N 次逐列更新）',
    /UPDATE project_folders[\s\S]{0,500}substr\(path/.test(serviceSource))
  check('子樹 UPDATE 同時修 path 與 depth',
    /substr\(path[\s\S]{0,200}depth = depth \+/.test(serviceSource))
  check('軟刪也是一條子樹 UPDATE',
    /SET deleted_at = now\(\)[\s\S]{0,300}path LIKE/.test(serviceSource))
  check('不開 Server Action 旁路（ARC-042）', !/['"]use server['"]/.test(serviceSource))
  check('workspaceId 由服務層自己解析（resolveProjectWorkspaceId）',
    serviceSource.includes('export async function resolveProjectWorkspaceId('))
}

fs.rmSync(tmpDir, { recursive: true, force: true })

console.log(
  failures
    ? `\n${total - failures}/${total} — FAILED (${failures} failing)`
    : `\nproject drive: ${total}/${total} checks passed`
)
process.exit(failures ? 1 : 0)
