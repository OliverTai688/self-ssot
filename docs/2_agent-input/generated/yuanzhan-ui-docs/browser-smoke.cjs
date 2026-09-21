// Archive smoke only. This does not verify the future app or env-driven modes.
const {chromium} = require('/Users/pzps0964713/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../../../..');
const asset = path.join(root, 'docs/03_feature-reference/REF-004_yuanzhan-operating-interface');
(async () => {
  const browser = await chromium.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
  const errors = [], pages = [], checks = [];
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(asset, 'source-manifest.json'), 'utf8'));
    for (const item of manifest.files.filter(x => x.archived.endsWith('.html'))) {
      const page = await browser.newPage();
      page.on('pageerror', e => errors.push({file: item.archived, error: e.message}));
      await page.goto(pathToFileURL(path.join(asset, item.archived)).href, {waitUntil: 'domcontentloaded'});
      const title = await page.title(); assert(title.trim());
      pages.push({file: item.archived, title}); await page.close();
    }
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    page.on('pageerror', e => errors.push({file: 'proposal-b interaction', error: e.message}));
    await page.goto(pathToFileURL(path.join(asset, 'integration-v2/index.html')).href);
    await page.getByRole('tab', {name: '整合邏輯'}).click();
    await page.getByRole('tab', {name: '整合邏輯'}).press('ArrowRight');
    assert(await page.locator('#panel-delivery').isVisible()); checks.push('Archived overview tabs and keyboard navigation');
    await page.goto(pathToFileURL(path.join(asset, 'integration-v2/proposal-b.html')).href);
    assert.equal(await page.locator('#app').getAttribute('data-scope'), 'team');
    await page.getByRole('button', {name: '記錄並建立待辦'}).click();
    assert(await page.locator('#journalRows [data-record="YZ-024"]').isVisible());
    await page.locator('[data-view="work"]').click();
    assert(await page.locator('[data-record="YZ-024"]').isVisible());
    await page.locator('button[data-scope="personal"]').click();
    assert(await page.getByRole('heading', {name: '我的私人日誌'}).isVisible());
    assert(!(await page.locator('#app').innerText()).includes('YZ-024'));
    checks.push('Archived company entry, shared ID across work views, separate private surface');
    await page.setViewportSize({width: 390, height: 844});
    await page.locator('button[data-scope="team"]').click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: path.join(__dirname, 'archive-journal-mobile.png'), fullPage: true});
    checks.push('390px archived journal has no document overflow');
    assert.equal(errors.length, 0);
  } finally {
    await browser.close();
    const result = {date: '2026-09-13', scope: 'archived HTML only; no app/env runtime coverage', pages, checks, errors};
    fs.writeFileSync(path.join(__dirname, 'browser-verification.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({pages: pages.length, checks, errors}, null, 2));
  }
})().catch(e => {console.error(e); process.exitCode = 1;});
