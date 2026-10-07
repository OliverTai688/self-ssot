/**
 * 專案模組五大資源的無瀏覽器回歸檢查（PLN-075 S3）。
 *
 *   pnpm project:ui:check
 *
 * 四段：
 *   A. 兩種資料模式下六個分頁都畫得出來、沒有 runtime 錯誤
 *   B. 舊分頁 index 的重導表（nav('project', n) 仍然走得到原本那一面）
 *   C. 主要操作：審核流程、分期、資料夾 CRUD、收件匣整理、會議、對話、三條升級路徑
 *   D. database 模式的寫入契約：攔下送往 BFF 的命令，核對集合、欄位與順序
 *      （不連資料庫；伺服器那一頭由 check-operating-command-fields.mjs 對 schema 核對）
 *
 * 副檔名是 .mts：這支腳本用 top-level await，而 tsx 對 .ts 會照 package.json 的型別
 * 編成 CJS，那裡不支援 top-level await。
 */
import { mountAll } from './operating-runtime-harness'

let pass = 0
let fail = 0
function check(label: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '   → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))}`)
}
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))
const text = (el: Element | null | undefined) => (el?.textContent || '').replace(/\s+/g, ' ').trim()

type Root = HTMLElement
function tools(root: Root) {
  const all = (sel: string, from: ParentNode = root) => Array.from(from.querySelectorAll(sel)) as HTMLElement[]
  const one = (sel: string, from: ParentNode = root) => from.querySelector(sel) as HTMLElement | null
  const byText = (sel: string, needle: string, from: ParentNode = root) => all(sel, from).find((el) => text(el).includes(needle))
  const click = async (el: HTMLElement | null | undefined) => {
    if (!el) throw new Error('找不到要點的元素')
    el.click()
    await tick(5)
  }
  const tab = async (name: string) => click(byText('#tabs .tab', name))
  const field = (key: string) => root.querySelector(`[id="f_${key}"]`) as HTMLInputElement | null
  const set = (key: string, value: string) => {
    const el = field(key)
    if (!el) throw new Error('表單沒有欄位 ' + key)
    el.value = value
  }
  const chip = async (key: string, value: string) => click(all('button', field(key)!).find((b) => b.dataset.value === value))
  const save = async () => {
    await click(one('#fmFoot .btn.pri'))
    const err = one('#fErr.on')
    return err ? text(err) : 'saved'
  }
  return { all, one, byText, click, tab, field, set, chip, save }
}

/* ------------------------------------------------------------------ */
/* A. 六個分頁                                                         */
/* ------------------------------------------------------------------ */
const TABS = ['總覽', '計劃', '檔案', '會議', '對話', '財務']
for (const mode of ['showcase', 'empty'] as const) {
  const r = await mountAll(mode)
  const pages = r.pages.filter((p) => p.wb === '專案')
  if (mode === 'showcase') {
    // 從側欄進專案＝專案總表（RES-034）；六個分頁要進了某一個專案才有。
    const t = tools(r.root)
    check('showcase · 從側欄進來先看到專案總表', pages.length === 1 && pages[0].tabName === '所有專案', pages.map((p) => p.tabName).join(' / '))
    await t.click(t.all('.rail-i').find((b) => text(b).includes('專案')))
    const projects = t.all('.pm-ix-row').length
    check('showcase · 總表列出示範專案', projects >= 3, String(projects))
    check('showcase · 總表沒有那排專案按鈕', !t.one('#inner .seg'))
    await t.click(t.all('.pm-ix-row')[0])
    const names = t.all('#tabs .tab').map((b) => text(b).replace(/\d+$/, ''))
    check('showcase · 專案模組有六個分頁', names.length === 6, names.join(' / '))
    check('showcase · 分頁名稱與順序', names.every((n, i) => n === TABS[i]))
    check('showcase · 專案標題列有名稱、狀態與切換選單', Boolean(t.one('.pm-ph h2') && t.one('.pm-ph .pm-st') && t.one('.pm-ph-switch select')))
    check('showcase · 切換選單列出全部專案', t.all('.pm-ph-switch option').length === projects)
    await t.click(t.one('.pm-ph-back'))
    check('showcase · 「所有專案」回到總表', t.all('.pm-ix-row').length === projects)
    // 其他模組跳進來是要看某一個專案，不落在總表。
    r.workbench.navigate('project', 0)
    await tick(5)
    check('showcase · 深連結直接落在專案上', Boolean(t.one('.pm-ph h2')) && !t.one('.pm-ix-row'))
  } else {
    check(`${mode} · 專案模組有六個分頁`, pages.length === 6, pages.map((p) => p.tabName.replace(/\d+$/, '')).join(' / '))
    check(`${mode} · 分頁名稱與順序`, pages.every((p, i) => p.tabName.replace(/\d+$/, '') === TABS[i]))
  }
  check(`${mode} · 沒有 runtime 錯誤`, r.errors.length === 0, r.errors.slice(0, 2))
  check(`${mode} · 沒有 NaN／undefined`, !pages.some((p) => /\bNaN\b|\bundefined\b/.test(p.text)))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* B. 舊 index 重導                                                    */
/* ------------------------------------------------------------------ */
{
  const r = await mountAll('showcase')
  const t = tools(r.root)
  const expected: Record<number, [string, string]> = {
    0: ['總覽', ''], 1: ['計劃', '工作'], 2: ['對話', '議題串'],
    3: ['檔案', 'Evidence Repo'], 4: ['財務', ''], 5: ['計劃', '里程碑 · 目標'],
  }
  for (const old of [0, 1, 2, 3, 4, 5]) {
    r.workbench.navigate('project', old)
    await tick(5)
    const tab = text(t.one('#tabs .tab.on')).replace(/\d+$/, '')
    const sub = text(t.one('.pm-subnav .on'))
    const [wantTab, wantSub] = expected[old]
    check(`舊 index ${old} → ${wantTab}${wantSub ? ' / ' + wantSub : ''}`, tab === wantTab && (!wantSub || sub === wantSub), tab + (sub ? ' / ' + sub : ''))
    check(`舊 index ${old} 那一面有內容`, text(t.one('#inner')).length > 200)
  }
  await t.tab('對話')
  check('從分頁列進來落在主視圖', text(t.one('.pm-subnav .on')) === '聊天室', text(t.one('.pm-subnav .on')))
  check('重導後沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 2))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* C. 主要操作（showcase）                                             */
/* ------------------------------------------------------------------ */
{
  const r = await mountAll('showcase')
  const t = tools(r.root)
  r.workbench.navigate('project', 0)
  await tick(5)

  // 總覽
  check('總覽 · 一行數字列', !!t.one('.pm-rail'))
  check('總覽 · 期階梯', t.all('.pm-stage').length >= 5, t.all('.pm-stage').length + ' 個階段')
  check('總覽 · 跨資源待辦', t.all('#pmOvTodo .pm-row').length > 0)
  check('總覽 · 時間流', t.all('.pm-tl-ev').length > 5)
  check('總覽 · LINE 是停用的入口', !!t.byText('.pm-res-i.off', 'LINE'))

  // 計劃：審核流程
  await t.tab('計劃')
  const task = (name: string) => t.all('.pm-pl-task').find((row) => text(row).includes(name))
  await t.click(t.byText('button', '通過', task('驗收報告送審')))
  check('審核 · 通過', /已通過/.test(text(task('驗收報告送審'))))
  await t.click(t.byText('button', '重新送審', task('教育訓練簡報定稿')))
  check('審核 · 重新送審', /審核中/.test(text(task('教育訓練簡報定稿'))))
  await t.click(t.byText('button', '退回', task('教育訓練簡報定稿')))
  check('審核 · 退回要寫原因', (await t.save()) !== 'saved')
  t.set('note', '封面日期錯了')
  check('審核 · 退回', (await t.save()) === 'saved' && /已退回.*封面日期錯了/.test(text(task('教育訓練簡報定稿'))))

  // 計劃：新增一期（續期：執行→驗收→結案）
  await t.click(t.byText('.pm-bar .btn', '新增一期'))
  check('分期 · 第二期預設是續期', t.field('stages')?.dataset.val === 'repeat')
  check('分期 · 存檔', (await t.save()) === 'saved')
  const cycles = t.all('.pm-pl-cycle')
  check('分期 · 出現二期', cycles.length === 2 && /二期/.test(text(cycles[1])))
  check('分期 · 二期重複執行→驗收', /執行/.test(text(cycles[1])) && /驗收/.test(text(cycles[1])))

  // 計劃：審核任務要有審核人
  await t.click(t.byText('.pm-bar .btn', '審核任務'))
  t.set('t', '結案報告審核')
  check('任務 · 審核任務沒有審核人不能存', (await t.save()) !== 'saved')
  t.set('reviewer', 'lily')
  check('任務 · 建立審核任務', (await t.save()) === 'saved' && !!task('結案報告審核'))

  // 檔案
  await t.tab('檔案')
  check('檔案 · 收件匣是樹上的節點', !!t.byText('.pm-tr-name', '收件匣'))
  await t.click(t.byText('.pm-tr-name', '會議'))
  await t.click(t.byText('.pm-dv-h .btn', '資料夾'))
  t.set('name', '20260806 啟動會議')
  check('資料夾 · 同層不能同名', (await t.save()) !== 'saved')
  t.set('name', '20261015 期中會議')
  check('資料夾 · 新增', (await t.save()) === 'saved' && /20261015 期中會議/.test(text(t.one('.pm-dv-h'))))
  await t.click(t.byText('.pm-dv-h .btn', '設定'))
  t.set('name', '20261015 期中檢視')
  await t.chip('visibility', 'RESTRICTED_NO_INDEX')
  check('資料夾 · 重新命名與收緊可見性', (await t.save()) === 'saved' && /20261015 期中檢視.*不建索引/.test(text(t.one('.pm-dv-h'))))
  await t.click(t.byText('.pm-dv-h .btn', '搬移'))
  const moveTo = Array.from((t.field('parentId') as unknown as HTMLSelectElement).options).find((o) => o.textContent?.includes('修改需求'))
  t.set('parentId', moveTo?.value || '')
  check('資料夾 · 搬移', (await t.save()) === 'saved' && /修改需求/.test(text(t.one('.pm-crumb'))))

  await t.click(t.byText('.pm-tr-name', '收件匣'))
  const before = t.all('.pm-t tbody tr[data-k]').length
  await t.click(t.all('.pm-t tbody tr[data-k]')[0])
  const select = r.root.querySelector('[id="pmMoveTo"]') as HTMLSelectElement | null
  check('整理 · 預設目的地不是客戶可見的資料夾', !!select && !/客戶可見/.test(select.options[0]?.textContent || ''), select?.options[0]?.textContent)
  await t.click(t.byText('#pmDrBody .btn', '搬到這裡'))
  await tick(20)
  check('整理 · 收件匣少一個檔', t.all('.pm-t tbody tr[data-k]').length === before - 1, `${before} → ${t.all('.pm-t tbody tr[data-k]').length}`)

  // 會議
  await t.tab('會議')
  check('會議 · 四個屬性', ['參與者', '產生時間', '結論', '注意事項'].every((k) => t.all('.pm-attr dt').some((dt) => text(dt) === k)))
  check('會議 · 四件套', t.all('.pm-kit-i').length === 4)
  await t.click(t.byText('.pm-todo-i .btn', '轉任務'))
  check('升級路徑 · 會議待辦→任務', (await t.save()) === 'saved' && !!t.byText('.pm-todo-i', '已轉任務'))
  await t.click(t.byText('.pm-mt-i', '啟動會議'))
  await t.click(t.byText('.pm-attr .pm-link', '轉成決議'))
  check('升級路徑 · 結論→決議', (await t.save()) === 'saved' && !!t.byText('.pm-attr', '已轉決議'))
  await t.click(t.byText('.pm-bar .btn', '新增會議'))
  t.set('title', '期中檢視')
  t.set('onDate', '2026-10-20')
  check('會議 · 新增並建立資料夾', (await t.save()) === 'saved' && /0 \/ 4/.test(text(t.one('.pm-view'))))

  // 對話
  await t.tab('對話')
  const count = t.all('.pm-msg').length
  const input = r.root.querySelector('[id="pmChatInput"]') as HTMLTextAreaElement
  input.value = '第 3 節要補一張截圖'
  await t.click(t.byText('.pm-chat-row .btn', '送出'))
  check('對話 · 送出一則訊息', t.all('.pm-msg').length === count + 1)
  await t.click(t.all('.pm-msg').pop()!.querySelector('.pm-msg-a button') as HTMLElement)
  check('升級路徑 · 訊息→任務', (await t.save()) === 'saved' && /已轉任務/.test(text(t.all('.pm-msg').pop())))
  check('對話 · LINE 是停用的入口', !!t.byText('.pm-mt-i.off', 'LINE'))

  // 既有的 enhance 掛勾認舊分頁 index：議題串那一面要掛得到「附檔」，別的分頁不能被誤掛。
  await t.click(t.byText('.pm-subnav button', '議題串'))
  check('舊掛勾 · 議題串子視圖掛得到附檔按鈕', !!t.byText('.composer .btn', '附檔'))
  await t.tab('檔案')
  check('舊掛勾 · 檔案分頁沒有被誤掛', !t.byText('.composer .btn', '附檔'))

  check('操作全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* C2. 成員視角：專案財務的遮罩                                        */
/* ------------------------------------------------------------------ */
{
  // 夾具沒有登入者，切換視角的按鈕不會動；直接以成員身分掛載。
  const r = await mountAll('showcase', undefined, (state) => {
    ;(state.data as Record<string, unknown>).me = 'lily'
  })
  const t = tools(r.root)
  r.workbench.navigate('project', 0)
  await tick(5)
  const rails: string[] = []
  const ids = t.all('.pm-ph-switch option').map((o) => (o as unknown as HTMLOptionElement).value)
  for (const id of ids) {
    const select = t.one('.pm-ph-switch select') as unknown as HTMLSelectElement
    select.value = id
    select.dispatchEvent(new (r.root.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event('change', { bubbles: true }))
    await tick(5)
    rails.push(text(t.one('.pm-rail')))
  }
  check('成員視角 · 參與的專案看得到可分配毛利', rails.some((x) => /可分配毛利 [\d,−-]+NT\$/.test(x)))
  check('成員視角 · 沒參與的專案看不到可分配毛利', rails.some((x) => /可分配毛利 — 限參與者查看/.test(x)), rails.map((x) => (x.match(/可分配毛利.{0,12}/) || [''])[0]))
  check('成員視角 · 沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* D. database 模式的寫入契約                                          */
/* ------------------------------------------------------------------ */
{
  type Change = { collection: string; id: string; op: string; after?: Record<string, unknown> }
  const sent: Change[][] = []
  let version = 7
  const g = globalThis as unknown as Record<string, unknown>
  const realFetch = g.fetch
  g.fetch = async (_url: unknown, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST' && init.body) {
      const body = JSON.parse(init.body) as { commands: Array<{ clientRef: string; changes: Change[] }> }
      body.commands.forEach((c) => sent.push(c.changes))
      version += 1
      return { ok: true, status: 200, json: async () => ({ version, applied: body.commands.map((c) => c.clientRef), rejected: [] }) }
    }
    return { ok: true, status: 200, json: async () => ({ version }) }
  }

  const project = { id: 'PRJ-T-1', t: '契約測試專案', client: '', goal: '', type: '', owner: 'yz', status: '進行中', rate: 0, cap: 0, budget: 0, repo: '—', start: '2026-09-01', delivery: [] }
  const r = await mountAll('empty', undefined, (state) => {
    state.dataSource = 'database'
    ;(state.data as Record<string, unknown>).projects = [project]
  })
  const t = tools(r.root)
  r.workbench.navigate('project', 0)
  await tick(30)
  const flush = async () => { await tick(60) }
  const last = () => sent[sent.length - 1] || []
  const rows = (changes: Change[], collection: string) => changes.filter((c) => c.collection === collection)

  check('database · 空專案的總覽是設定清單，不是一排空白區塊', t.all('.pm-setup-i').length === 4 && t.all('.pm-empty').length === 0, t.all('.pm-setup-i').length + ' 項 / ' + t.all('.pm-empty').length + ' 個空白區塊')
  check('database · 空專案的總覽請使用者寫下一步', /還沒寫下一步/.test(text(t.one('.pm-next'))))
  check('database · 沒有示範資料', t.all('.pm-tl-ev').length === 0 && !t.one('.pm-stage'))

  // 下一步與重要度：從總覽填寫，寫入管線要帶著這三欄送出去。
  await t.click(t.byText('.pm-next .btn', '填寫'))
  t.set('next', '追對方選方案')
  t.set('tier', '4')
  t.set('desc', '首期三個月')
  check('database · 下一步表單存得下去', (await t.save()) === 'saved')
  await flush()
  const brief = rows(last(), 'projects')[0]?.after as Record<string, unknown> | undefined
  check('database · 下一步／重要度／說明進了寫入管線', brief?.next === '追對方選方案' && brief?.tier === 4 && brief?.desc === '首期三個月', JSON.stringify(brief && { next: brief.next, tier: brief.tier, desc: brief.desc }))
  check('database · 總覽顯示剛寫的下一步', /追對方選方案/.test(text(t.one('.pm-next-t'))))
  check('database · 設定清單把「寫下一步」打勾', t.all('.pm-setup-i.done').length === 1)

  // 啟用硬碟
  await t.tab('檔案')
  await t.click(t.byText('.pm-empty .btn', '啟用並建立預設資料夾'))
  await flush()
  const folders = rows(last(), 'folders')
  check('folders · 一次 commit 送出整棵預設樹', folders.length === 11, folders.length + ' 列')
  check('folders · ROOT 與 INBOX 各一', folders.filter((f) => f.after?.kind === 'ROOT').length === 1 && folders.filter((f) => f.after?.kind === 'INBOX').length === 1)
  const seen = new Set<string>()
  const ordered = folders.every((f) => {
    const parent = String(f.after?.parentId || '')
    const ok = !parent || seen.has(parent)
    seen.add(f.id)
    return ok
  })
  check('folders · 父資料夾一定排在子資料夾之前', ordered)
  check('folders · 帶著伺服器要的欄位', folders.every((f) => ['projectId', 'kind', 'name', 'visibility', 'sortOrder'].every((k) => k in (f.after || {}))))
  check('folders · 只有 [共用] 對客戶可見', folders.filter((f) => f.after?.visibility === 'CLIENT_VISIBLE').length === 1)

  // 分期
  await t.tab('計劃')
  await t.click(t.byText('.pm-empty .btn', '建立第一期'))
  check('database · 第一期預設五階段', t.field('stages')?.dataset.val === 'five')
  await t.save()
  await flush()
  const cycle = rows(last(), 'phaseCycles')
  const phases = rows(last(), 'phases')
  check('phaseCycles · 一列，ordinal=1', cycle.length === 1 && cycle[0].after?.ordinal === 1)
  check('phases · 五個階段都指向那一期', phases.length === 5 && phases.every((p) => p.after?.cycleId === cycle[0].id))
  check('phases · 帶 stageKind／ordinal／起訖', phases.every((p) => p.after?.stageKind && Number(p.after?.ordinal) > 0 && p.after?.startOn && p.after?.endOn))
  check('phases · 五格依序是提案→接案→執行→驗收→結案', phases.map((p) => p.after?.stageKind).join('>') === 'PROPOSAL>CONTRACT>EXECUTION>ACCEPTANCE>CLOSING')

  // 里程碑 ＋ 審核任務
  await t.click(t.byText('.pm-bar .btn', '里程碑'))
  t.set('title', 'M01 測試交付')
  t.set('dueOn', '2026-11-01')
  const stageOpt = Array.from((t.field('phaseId') as unknown as HTMLSelectElement).options).find((o) => o.textContent?.includes('執行'))
  t.set('phaseId', stageOpt?.value || '')
  await t.save()
  await flush()
  const ms = rows(last(), 'milestones')
  check('milestones · 帶 phaseId／state', ms.length === 1 && !!ms[0].after?.phaseId && ms[0].after?.state === 'open')

  await t.click(t.byText('.pm-bar .btn', '審核任務'))
  t.set('t', '交付物審核')
  t.set('reviewer', 'lily')
  t.set('msId', ms[0].id)
  await t.save()
  await flush()
  const issue = rows(last(), 'issues')
  check('issues · 審核任務帶 kind／reviewer／reviewResult／msId', issue.length === 1 && issue[0].after?.kind === 'REVIEW' && issue[0].after?.reviewer === 'lily' && issue[0].after?.reviewResult === 'PENDING' && issue[0].after?.msId === ms[0].id)

  // 會議 ＋ 資料夾
  await t.tab('會議')
  await t.click(t.byText('.pm-empty .btn', '新增會議'))
  t.set('title', '啟動會議')
  t.set('onDate', '2026-10-06')
  t.set('guests', '客戶窗口')
  t.set('cautions', '週五不開會')
  await t.save()
  await flush()
  const occ = rows(last(), 'occasions')
  const occFolder = rows(last(), 'folders')
  check('occasions · 帶 projectId／folderId／guests／cautions', occ.length === 1 && occ[0].after?.projectId === project.id && !!occ[0].after?.folderId && occ[0].after?.guests === '客戶窗口' && occ[0].after?.cautions === '週五不開會')
  check('occasions · 會議資料夾在同一次 commit 建立，kind=MEETING', occFolder.length === 1 && occFolder[0].after?.kind === 'MEETING' && occFolder[0].id === occ[0].after?.folderId)
  check('occasions · 資料夾名稱是 YYYYMMDD 會議名稱', occFolder[0]?.after?.name === '20261006 啟動會議', occFolder[0]?.after?.name)

  // 對話
  await t.tab('對話')
  await t.click(t.byText('.pm-empty .btn', '開啟專案聊天室'))
  await flush()
  const channel = rows(last(), 'chatChannels')
  check('chatChannels · 主頻道', channel.length === 1 && channel[0].after?.kind === 'MAIN' && channel[0].after?.projectId === project.id)
  const input = r.root.querySelector('[id="pmChatInput"]') as HTMLTextAreaElement
  input.value = '第一則訊息'
  await t.click(t.byText('.pm-chat-row .btn', '送出'))
  await flush()
  const msg = rows(last(), 'chatMessages')
  check('chatMessages · 一列一訊息', msg.length === 1 && msg[0].after?.channelId === channel[0].id && msg[0].after?.text === '第一則訊息' && typeof msg[0].after?.at === 'number' && msg[0].after?.w === 'yz')

  const collections = new Set(sent.flat().map((c) => c.collection))
  check('database · 只動到預期的集合', [...collections].every((c) => ['projects', 'folders', 'phaseCycles', 'phases', 'milestones', 'issues', 'occasions', 'chatChannels', 'chatMessages'].includes(c)), [...collections].join(', '))
  check('database · 全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
  g.fetch = realFetch
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
