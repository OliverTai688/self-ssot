/**
 * 營運模組的瀏覽器級驗證（PLN-073 OPS-T14）。
 *
 * verify-yuanzhan-v5.cjs 驗的是「v5 忠實移植」的視覺基準；轉移之後那份基準只在
 * org.operatingModule=legacy 時成立。這支腳本是它的分叉，驗收斂後的 7 模組 29 分頁，
 * 並針對營運模組做互動驗證（新增活動、衝期警示、條文推導不可編輯）。
 *
 * 需求與 verify-yuanzhan-v5 相同：兩個 preview server 與一顆真實 Chrome。
 *   pnpm ui:yuanzhan:showcase   # 3011
 *   pnpm ui:yuanzhan:empty      # 3012
 *   node scripts/verify-operating-canvas.cjs
 *
 * 無瀏覽器的快速回歸請跑 `pnpm ops:check`（jsdom，CI 友善）。
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const out = path.join(process.cwd(), 'docs/2_agent-input/generated/operating-canvas-fidelity')
const workspaces = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'docs/2_agent-input/generated/yuanzhan-v5-fidelity/reference/workspaces.json',
    ),
  ),
)
const results = []
const errors = []
const mutations = []

const navigate = async (page, id, tab = 0) => {
  const ws = workspaces.find((w) => w.id === id)
  await page
    .locator('.rail-i')
    .filter({ has: page.locator('em', { hasText: new RegExp('^' + ws.nm + '$') }) })
    .click()
  await page.locator('#tabs .tab').nth(tab).click()
}
const innerText = (page) => page.locator('#inner').innerText()

;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
  try {
    for (const mode of ['showcase', 'empty']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
      const page = await context.newPage()
      page.on('pageerror', (e) => errors.push({ mode, error: e.message }))
      page.on('console', (m) => {
        if (m.type() === 'error' && !m.text().includes('404')) errors.push({ mode, error: m.text() })
      })
      page.on('request', (r) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) mutations.push({ mode, method: r.method(), url: r.url() })
      })

      await page.goto('http://127.0.0.1:' + (mode === 'showcase' ? 3011 : 3012) + '/company/operating')
      await page.locator('#wbName').waitFor()
      await page.waitForTimeout(400)

      /* 1. 收斂後的導覽 */
      const rails = await page.locator('.rail-i em').allInnerTexts()
      assert(rails.includes('營運'), '側欄應該有「營運」')
      assert(!rails.includes('時間線'), '時間線應該已經下架')
      assert(!rails.includes('工作台'), '工作台應該已經下架')
      results.push({ mode, test: '導覽收斂成 7 模組', rails })

      /* 2. 全部分頁可渲染、無 NaN */
      for (const ws of workspaces) {
        for (let i = 0; i < ws.tabs.length; i++) {
          await navigate(page, ws.id, i)
          await page.waitForTimeout(40)
          const text = await innerText(page)
          assert(!/\bNaN\b|\bInfinity\b/.test(text), `${ws.nm}/${i} 出現 NaN 或 Infinity`)
          await page.screenshot({ path: path.join(out, `${mode}-${ws.id}-${i}.png`) })
        }
      }
      const shell = await page.locator('.v5-root').evaluate((root) => ({
        handlers: root.querySelectorAll('[onclick],[oninput],[onchange]').length,
        topbar: root.querySelector('.topbar').getBoundingClientRect().height,
        rail: root.querySelector('.rail').getBoundingClientRect().width,
      }))
      assert.equal(shell.handlers, 0, '不得有 inline handler')
      assert.equal(shell.topbar, 48)
      assert.equal(shell.rail, 78)
      results.push({ mode, test: `${workspaces.reduce((n, w) => n + w.tabs.length, 0)} 個分頁渲染、shell 度量不變`, shell })

      /* 3. 營運模組：左軌道與五種檢視 */
      await navigate(page, 'operating', 1)
      assert.equal(await page.locator('.op-rail .op-trk').count(), 3, '左欄應該有三個軌道')
      assert(await page.locator('.cal .dc').count() >= 42, '日曆應該有 42 格')
      await navigate(page, 'operating', 2)
      assert(await page.locator('.op-hm .op-hc').count() > 0, '熱力圖應該有格子')
      await navigate(page, 'operating', 3)
      assert(await page.locator('.op-gantt').count() > 0, '甘特應該渲染')
      results.push({ mode, test: '營運五檢視：日曆 42 格、熱力有格、甘特可畫' })

      if (mode === 'showcase') {
        /* 4. 新增活動 → 日曆同步 */
        await navigate(page, 'operating', 1)
        await page.locator('#inner .btn', { hasText: '新增' }).first().click()
        await page.locator('#drawer.on').waitFor()
        await page.locator('#f_kind button[data-value="oc"]').click()
        await page.locator('#drFoot button', { hasText: '儲存' }).click()
        await page.locator('#f_title').fill('瀏覽器驗證活動')
        await page.locator('#f_onDate').fill('2026-09-24')
        await page.locator('#f_endOn').fill('2026-09-24')
        await page.locator('#drFoot button', { hasText: '儲存' }).click()
        await page.waitForTimeout(200)
        assert((await innerText(page)).includes('瀏覽器驗證活動'), '新活動沒有出現在日曆')
        await page.screenshot({ path: path.join(out, 'showcase-operating-created.png') })

        /* 5. 條文推導的紀錄不可編輯 */
        await navigate(page, 'operating', 4)
        const locked = page.locator('#inner .row', { hasText: '契約' }).first()
        if (await locked.count()) {
          await locked.click()
          await page.waitForTimeout(150)
          assert.equal(await page.locator('#drawer.on').count(), 0, '條文推導的紀錄不該開啟編輯表單')
          assert((await page.locator('#toasts').innerText()).includes('不可編輯或刪除'))
          await page.screenshot({ path: path.join(out, 'showcase-operating-locked.png') })
        }
        results.push({ mode, test: '新增活動同步日曆；條文推導的紀錄擋下編輯' })

        /* 6. 專案的里程碑分頁 */
        await navigate(page, 'project', 5)
        assert((await innerText(page)).includes('里程碑'), '專案應該有里程碑分頁')
        await page.screenshot({ path: path.join(out, 'showcase-project-milestones.png') })
        results.push({ mode, test: '專案 · 里程碑四層樹' })
      }

      await context.close()
    }

    assert.equal(errors.length, 0, 'runtime 錯誤：' + JSON.stringify(errors.slice(0, 5)))
    assert.equal(mutations.length, 0, '不應該有寫入請求：' + JSON.stringify(mutations.slice(0, 3)))
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, errors, mutations }, null, 1))
    console.log('PASS operating-canvas fidelity ·', results.length, 'checks · 截圖寫入', out)
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
