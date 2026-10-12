/**
 * 日誌書寫與議題頁，在真的瀏覽器引擎上跑一遍 —— 特別是 WebKit（iPhone／iPad 上所有瀏覽器）。
 *
 *   node scripts/start-yuanzhan-ui-preview.mjs showcase 3011      # 另一個終端機
 *   pnpm ops:engines:verify                                       # webkit + chromium，桌面與手機尺寸
 *   pnpm ops:engines:verify webkit --mobile                       # 只跑一種
 *
 * 為什麼要有這一支：jsdom 的回歸檢查（ops:*:check）不在 Shadow DOM 裡跑，也沒有真的游標。
 * 2026-10-12 之前，WebKit 上 document.getSelection() 讀不到 shadow 內的游標、addRange() 也寫不進去，
 * 於是按 Enter 把整行推到下一行、之後打字沒有反應、貼上被吃掉 —— 所有 jsdom 檢查照樣全綠。
 *
 * 環境變數：
 *   ENGINES_URL          預設 http://127.0.0.1:3011/company/operating（showcase 預覽，不寫任何資料）
 *   PLAYWRIGHT_MODULE    playwright-core 的路徑；預設用這個 repo 裝的那一份
 *                        （引擎沒下載過的話先跑 pnpm exec playwright install webkit chromium）
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const URL = process.env.ENGINES_URL || 'http://127.0.0.1:3011/company/operating';
const args = process.argv.slice(2);
const only = args.find(a => a === 'webkit' || a === 'chromium');
const RUNS = [];
for (const engine of only ? [only] : ['webkit', 'chromium']) {
  for (const mobile of args.includes('--mobile') ? [true] : args.includes('--desktop') ? [false] : [false, true]) RUNS.push({ engine, mobile });
}

async function run({ engine, mobile }) {
  const fails = [];
  const tag = engine + (mobile ? ' · 手機' : ' · 桌面');
  const check = (name, ok, detail) => {
    console.log((ok ? 'PASS  ' : 'FAIL  ') + tag + ' · ' + name + (ok ? '' : '   → ' + JSON.stringify(detail)));
    if (!ok) fails.push(name);
  };
  const browser = await pw[engine].launch();
  try {
    const ctx = await browser.newContext(mobile ? { ...pw.devices[engine === 'webkit' ? 'iPhone 14' : 'Pixel 7'] } : { viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.shadowRoot && e.shadowRoot.querySelector('#doc .eb-tx')), null, { timeout: 60000 });
    // 在 shadow root 裡執行一段函式。
    const q = (fn, arg) => page.evaluate(([src, a]) => {
      const r = [...document.querySelectorAll('div')].find(e => e.shadowRoot).shadowRoot;
      return (0, eval)('(' + src + ')')(r, a);
    }, [fn.toString(), arg]);
    // 貼上：對游標所在的那一行送一個帶純文字的 paste 事件（自動化環境拿不到系統剪貼簿）。
    const paste = text => q((r, t) => {
      const el = r.activeElement;
      const dt = new DataTransfer();
      dt.setData('text/plain', t);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true, composed: true }));
    }, text);
    const journal = () => q(r => [...r.querySelectorAll('#doc > .eb > .eb-tx')].map(e => e.innerText));

    // 建一張任務
    const empty = page.locator('#doc > .eb > .eb-tx:empty').first();
    await empty.scrollIntoViewIfNeeded();
    await empty.click();
    await page.keyboard.type('engine task !');
    // 選單是打完字之後才開的；等它開好再點，不要靠方向鍵去賭時序。
    await page.locator('#summon.on #summonList .summon-i', { hasText: '建立任務' }).click();
    await page.locator('.ag-card').first().waitFor();
    check('「!」選單建得出任務卡片', !!(await q(r => r.querySelector('.ag-card')?.dataset.docId)));

    // 日誌：Enter、貼上、Backspace 都以游標位置為準
    await page.locator('#doc > .eb > .eb-tx:empty').first().click();
    await page.keyboard.type('alpha');
    await page.keyboard.press('Enter');
    await page.keyboard.type('beta');
    let lines = await journal();
    check('行尾按 Enter：原本那一行留著，游標到新的一行，接著打得進去', lines.includes('alpha') && lines.includes('beta'), lines.slice(-6));
    await page.keyboard.press('Enter');
    await paste('pasted on phone');
    await page.keyboard.press('Enter');
    await page.keyboard.type('after');
    lines = await journal();
    check('貼上再按 Enter：貼上的那一行還在', lines.includes('pasted on phone') && lines.includes('after'), lines.slice(-6));
    await page.keyboard.press('Backspace');
    lines = await journal();
    check('Backspace 刪一個字，不會把兩行併起來', lines.includes('afte') && lines.includes('pasted on phone'), lines.slice(-6));

    // 議題頁：討論
    await page.locator('.ag-card .eb-doc-icon-btn').first().click();
    await page.waitForTimeout(250);
    const input = page.locator('#drBody [data-ag-input]');
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await page.keyboard.type('first message');
    await page.locator('#drBody .ag-compose .btn.pri').click();
    await page.waitForTimeout(200);
    const thread = () => q(r => ({
      head: r.querySelector('#drBody .ag-thread .ag-sec-t')?.innerText,
      msgs: [...r.querySelectorAll('#drBody .ag-thread .rq-msg-x')].map(e => e.innerText),
      input: r.querySelector('#drBody [data-ag-input]')?.value,
      pill: r.querySelector('#drBody .ag-fields .ag-f:last-child .ag-pill')?.innerText.trim(),
      focus: !!r.activeElement?.closest('#drBody') && r.activeElement.matches('[data-ag-input]')
    }));
    let st = await thread();
    check('議題頁按送出：那一則出現在這一頁', st.head === '討論 · 1' && st.msgs[0] === 'first message', st);
    check('輸入框清空、游標留著、狀態變成進行中', st.input === '' && st.focus && st.pill === '進行中', st);
    await page.keyboard.type('second message');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    st = await thread();
    check('議題頁按 Enter 也送得出去', st.head === '討論 · 2' && st.msgs[1] === 'second message' && st.input === '', st);
    // 手機在 <input> 裡貼上，走的是瀏覽器原生的插入（input 事件），不是日誌那支 paste 處理。
    await q(r => { r.querySelector('#drBody [data-ag-input]').focus(); document.execCommand('insertText', false, 'pasted into input'); });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    st = await thread();
    check('輸入框裡貼上再按 Enter：變成一則討論', st.head === '討論 · 3' && st.msgs[2] === 'pasted into input' && st.input === '', st);

    // 議題頁：欄位
    await page.locator('#drBody .ag-due .btn', { hasText: '明天' }).click();
    await page.waitForTimeout(150);
    st = await q(r => ({ due: r.querySelector('#drBody .ag-date')?.value, clear: [...r.querySelectorAll('#drBody .ag-due .btn')].some(b => b.innerText.trim() === '清除') }));
    check('按「明天」：到期日那一列跟著換', !!st.due && st.clear, st);
    await page.locator('#drFoot .btn', { hasText: '延到明天' }).click();
    await page.waitForTimeout(150);
    st = await q(r => r.querySelector('#drBody .ag-fields .ag-f:nth-child(4) .v')?.innerText);
    check('按「延到明天」：帶過變成 1 次', /1 次/.test(st || ''), st);
    await page.locator('#drBody .ag-due .btn', { hasText: '收回指派' }).click();
    await page.waitForTimeout(150);
    st = await q(r => ({ crumb: r.querySelector('#crumb')?.innerText, head: r.querySelector('#drBody .ag-thread .ag-sec-t')?.innerText }));
    check('收回指派：這一頁改叫議題，討論還在', /議題/.test(st.crumb || '') && st.head === '討論 · 3', st);

    // 議題頁：段落
    const concl = page.locator('#drBody [data-doc-sec][data-sec-idx="1"] .eb-tx').first();
    await concl.scrollIntoViewIfNeeded();
    await concl.click();
    await page.keyboard.type('decided');
    await page.keyboard.press('Enter');
    await paste('pasted conclusion');
    await page.keyboard.press('Enter');
    await page.keyboard.type('next step');
    st = await q(r => [...r.querySelectorAll('#drBody [data-doc-sec][data-sec-idx="1"] .eb-tx')].map(e => e.innerText));
    check('「結論」裡打字、貼上、換行，三行都在', JSON.stringify(st) === JSON.stringify(['decided', 'pasted conclusion', 'next step']), st);

    check('沒有頁面錯誤', errors.length === 0, errors.slice(0, 5));
  } finally {
    await browser.close();
  }
  return fails;
}

(async () => {
  let failed = 0;
  for (const r of RUNS) failed += (await run(r)).length;
  console.log(failed ? `\n${failed} 項沒過` : `\n全部通過（${RUNS.map(r => r.engine + (r.mobile ? '·手機' : '·桌面')).join('、')}）`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
