const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/pzps0964713/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(process.cwd(),'docs/2_agent-input/generated/yuanzhan-v5-fidelity');
const workspaces=JSON.parse(fs.readFileSync(path.join(out,'reference/workspaces.json')));
const results=[],errors=[],mutations=[]; const record=results.push.bind(results);results.push=(item)=>{console.log(item.mode,item.test);return record(item)};
const assertText=async(p,selector,text)=>{await p.locator(selector).filter({hasText:text}).first().waitFor({state:'visible',timeout:15000});assert((await p.locator(selector).innerText()).includes(text),`Missing ${text}`)};
const navigate=async(p,id,tab=0)=>{await p.locator('.rail-i').filter({has:p.locator('em',{hasText:new RegExp('^'+workspaces.find(w=>w.id===id).nm+'$')})}).click();await p.locator('#tabs .tab').nth(tab).click();};
const save=async p=>{await p.locator('#fmFoot').getByRole('button',{name:'儲存',exact:true}).click();await p.locator('#formModalWrap').evaluate(e=>{if(e.classList.contains('on'))throw Error('Form modal did not close')})};
const fill=async(p,id,value)=>p.locator('#f_'+id).fill(value);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{for(const mode of ['showcase','empty']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const p=await context.newPage();
  p.on('pageerror',e=>errors.push({mode,error:e.message}));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push({mode,error:m.text()})});p.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method()))mutations.push({mode,method:r.method(),url:r.url()})});
  const url='http://127.0.0.1:'+(mode==='showcase'?3011:3012)+'/company/operating';
  await p.goto(url);await p.locator('#wbName').waitFor();await p.waitForTimeout(400);
  const shell=await p.locator('.v5-root').evaluate(root=>{const c=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:r.x,y:r.y,w:r.width,h:r.height,bg:s.backgroundColor,font:s.fontFamily,size:s.fontSize}};return{topbar:c(root.querySelector('.topbar')),rail:c(root.querySelector('.rail')),head:c(root.querySelector('.wbhead')),surface:c(root.querySelector('.surface')),handlers:root.querySelectorAll('[onclick],[oninput],[onchange]').length}});
  assert.equal(shell.topbar.h,48);assert.equal(shell.rail.w,78);assert.equal(shell.handlers,0);results.push({mode,test:'v5 shell metrics / no inline handlers',shell});
  for(const w of workspaces){for(let i=0;i<w.tabs.length;i++){
    await navigate(p,w.id,i);await p.waitForTimeout(30);await assertText(p,'#wbName',w.nm);
    const text=await p.locator('#inner').innerText();assert(!/\bNaN\b|\bInfinity\b/.test(text));
    await p.screenshot({path:path.join(out,mode+'-'+w.id+'-'+i+'.png')});
  }}results.push({mode,test:'30 subpages rendered, no NaN or Infinity'});
  if(mode==='showcase'){
    await p.locator('.omni').click();await p.locator('#cmdkInput').fill('LAND-012');await p.keyboard.press('Enter');await p.waitForTimeout(300);
    await p.screenshot({path:path.join(out,'showcase-issue-drawer.png')});await p.keyboard.press('Escape');
    await p.setViewportSize({width:1280,height:720});await p.locator('#userBtn').click();await p.locator('.omni').click();await p.locator('#cmdkInput').fill('LAND-012');await p.keyboard.press('Enter');await p.waitForTimeout(300);
    const drawer=await p.locator('#drBody').evaluate(e=>({bottom:e.getBoundingClientRect().bottom,height:e.clientHeight,scroll:e.scrollHeight,overflow:getComputedStyle(e).overflowY,padding:getComputedStyle(e).padding}));
    assert(drawer.bottom<=720&&drawer.scroll>drawer.height);assert.equal(drawer.overflow,'auto');assert.equal(drawer.padding,'14px');
    await p.locator('#drBody .blk-i').filter({hasText:'日誌'}).first().click();await assertText(p,'#jcPeer','tenant 測試資料未備齊');assert.equal(await p.locator('#jcPeer [contenteditable="true"]').count(),0);
    await p.screenshot({path:path.join(out,'showcase-shared-journal-backlink.png')});await p.locator('#userBtn').click();await p.setViewportSize({width:1440,height:1000});
    results.push({mode,test:'long drawer scrolls; shared Issue backlink shows other author column read-only',drawer});
  }
  await navigate(p,'journal');
  if(mode==='empty'){assert.equal(await p.locator('#jcDate').count(),1);assert.equal(await p.locator('#jcMine #doc').count(),1);await navigate(p,'journal',1);assert.equal((await p.locator('#inner .doc').count()),0);await navigate(p,'journal');}
  // Continuous writing, actor ownership and team comments.
  const editor=p.locator('#doc .eb-tx[data-id]').last();await editor.fill('v5 即時團隊日誌');
  await p.locator('#userBtn').click();
  await assertText(p,'#jcPeer','v5 即時團隊日誌');assert.equal(await p.locator('#jcPeer [contenteditable="true"]').count(),0);
  await p.locator('#journalReply').fill('Lily 已看見');await p.locator('#inner .composer').getByRole('button',{name:'送出',exact:true}).click();await assertText(p,'#inner','Lily 已看見');
  await p.locator('#userBtn').click();await assertText(p,'#doc','v5 即時團隊日誌');results.push({mode,test:'two-person cockpit: typing shared immediately, peer column read-only, page comment'});
  // Private journals stay with their author and never appear in team search.
  await p.locator('.brand b').click();await p.locator('#mFoot').getByRole('button',{name:'個人空間',exact:true}).click();await p.locator('#doc .eb-tx[data-id]').last().fill('OWNER_PRIVATE_SENTINEL');await p.locator('#userBtn').click();assert(!(await p.locator('#doc').innerText()).includes('OWNER_PRIVATE_SENTINEL'));
  await p.locator('#userBtn').click();await assertText(p,'#doc','OWNER_PRIVATE_SENTINEL');await p.locator('.brand b').click();await p.locator('#mFoot').getByRole('button',{name:'圓展空間',exact:true}).click();assert(!(await p.locator('#doc').innerText()).includes('OWNER_PRIVATE_SENTINEL'));results.push({mode,test:'personal/team and personal actor isolation'});
  // Create project, Issue, and edit through same original drawer.
  await navigate(p,'project');await p.getByRole('button',{name:'新專案',exact:true}).click();await fill(p,'t','V5 驗證專案');await p.locator('#f_owner').selectOption('yz');await save(p);await assertText(p,'#inner','V5 驗證專案');
  await p.locator('#tabs .tab').nth(1).click();await p.getByRole('button',{name:'新增工作',exact:true}).click();await fill(p,'t','V5 驗證工作');await p.locator('#f_owner').selectOption('lily');await save(p);await assertText(p,'#inner','V5 驗證工作');
  for(const view of['看板','表格','日曆','清單'])await p.locator('.viewbar').getByRole('button',{name:view,exact:true}).click();
  await p.locator('#inner').getByText('V5 驗證工作',{exact:true}).first().click();await assertText(p,'#drBody','V5 驗證工作');await p.locator('#drBody #objectReply').fill('工作留言');await p.locator('#drBody').getByRole('button',{name:'送出',exact:true}).click();await assertText(p,'#drBody','工作留言');await p.keyboard.press('Escape');results.push({mode,test:'project/Issue CRUD and four views, object comments'});
  // 表單開在置中彈跳視窗；詳情抽屜留在背後不被取代，Esc 只收表單那一層。
  await p.locator('#inner').getByText('V5 驗證工作',{exact:true}).first().click();await p.locator('#drFoot').getByRole('button',{name:'編輯',exact:true}).click();
  await p.locator('#formModalWrap.on').waitFor({state:'visible'});await p.locator('#fmBody #f_t').waitFor({state:'visible'});
  assert.equal(await p.locator('#fmFoot').getByRole('button',{name:'儲存',exact:true}).count(),1,'Save belongs to the form modal footer');
  assert(await p.locator('#drawer').evaluate(e=>e.classList.contains('on')),'Detail drawer must stay open behind the form modal');
  await p.keyboard.press('Escape');await p.locator('#formModalWrap.on').waitFor({state:'hidden'});
  assert(await p.locator('#drawer').evaluate(e=>e.classList.contains('on')),'Escape closes only the form modal, not the detail behind it');
  await p.keyboard.press('Escape');await p.locator('#drawer.on').waitFor({state:'hidden'});
  results.push({mode,test:'forms open in a centred modal; the detail drawer keeps context behind it'});
  // Event CRUD and correct native chip values.
  await navigate(p,'timeline');await p.getByRole('button',{name:'新增事件',exact:true}).click();await fill(p,'t','V5 行事曆');await p.locator('#f_layer').getByRole('button',{name:'專案',exact:true}).click();await p.locator('#f_star').getByRole('button',{name:'★ 是',exact:true}).click();await save(p);
  const eventRow=p.locator('.row').filter({hasText:'V5 行事曆'});assert.equal(await eventRow.locator('.star.on').count(),1);await eventRow.locator('.star').click();assert.equal(await p.locator('.row').filter({hasText:'V5 行事曆'}).locator('.star.on').count(),0);await p.getByRole('button',{name:'日曆',exact:true}).click();await assertText(p,'.cal','V5 行事曆');results.push({mode,test:'event creation / date / layer / star and calendar'});
  // Formula form + editing, paste, and bidirectional voucher library.
  await navigate(p,'money');await p.getByRole('button',{name:'新增交易',exact:true}).click();await fill(p,'t','V5 公式');await fill(p,'amt','=-20*3');await p.locator('#f_p').selectOption('公司層級');await save(p);await assertText(p,'table.tbl','−60');
  await p.getByRole('button',{name:'表格操作',exact:true}).click();await p.locator('#ledgerPaste').fill('2026-09-12\tV5 貼上\t=-100*2\t公司層級\t工具');await p.locator('#mFoot').getByRole('button',{name:'貼上新增',exact:true}).click();await assertText(p,'table.tbl','V5 貼上');
  const row=p.locator('tr[data-tx]').filter({hasText:'V5 公式'});await row.locator('td').nth(4).dblclick();await row.locator('input').fill('=-40*3');await row.locator('input').press('Enter');await assertText(p,'table.tbl','−120');results.push({mode,test:'formula preserved, inline edit and atomic TSV paste'});
  // File upload, safe quoted filename, versions.
  await p.locator('.rail-i').filter({has:p.locator('em',{hasText:'文件'})}).click();
  const choose=p.waitForEvent('filechooser');await p.locator('#drFoot').getByRole('button',{name:'上傳文件',exact:true}).click();await (await choose).setFiles({name:"note's-v5.md",mimeType:'text/markdown',buffer:Buffer.from('第一版證據')});await assertText(p,'#drBody','第一版證據');
  const choose2=p.waitForEvent('filechooser');await p.locator('#drFoot').getByRole('button',{name:'上傳新版本',exact:true}).click();await (await choose2).setFiles({name:"note's-v5.md",mimeType:'text/markdown',buffer:Buffer.from('第二版證據')});await assertText(p,'#drBody','第二版證據');await p.locator('#drBody .seg').getByRole('button',{name:'v1',exact:true}).click();await assertText(p,'#drBody','第一版證據');await p.keyboard.press('Escape');results.push({mode,test:'file bytes and immutable versions with apostrophe-safe handlers'});
  // Commands and focus.
  await p.locator('.omni').click();await p.locator('#cmdkInput').fill('V5 驗證工作');await p.keyboard.press('Enter');await assertText(p,'#drBody','V5 驗證工作');await p.keyboard.press('Escape');
  await p.setViewportSize({width:390,height:844});await navigate(p,'journal');await p.screenshot({path:path.join(out,mode+'-mobile-journal.png')});const overflow=await p.locator('.v5-root').evaluate(e=>({root:e.scrollWidth-e.clientWidth,main:e.querySelector('.main').scrollWidth-e.querySelector('.main').clientWidth}));assert(overflow.root<=1&&overflow.main<=1,JSON.stringify(overflow));results.push({mode,test:'command jump and 390px daily collaboration layout'});
  await p.reload();await p.locator('#doc').waitFor();assert(!(await p.locator('#doc').innerText()).includes('v5 即時團隊日誌'));results.push({mode,test:'reload resets UI-memory to env seed'});
  await context.close();
 }
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(mutations.length,0,JSON.stringify(mutations));
 }finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({results,errors,mutations},null,2));await browser.close();}
 console.log('PASS',results.length,'groups; 60 tab captures; 0 runtime errors; 0 business mutation requests');
})().catch(e=>{console.error(e);process.exit(1)});
