const rec=require('../lib/rec.cjs');
(async()=>{
  const r=await rec.open('ch08');const {p}=r;const omni=p.locator('.omni');await r.grab('omni',omni);
  await r.sync();
  await r.shot('s2',async m=>{await r.sleep(500);await r.click(omni);await p.locator('#cmdkInput').waitFor();await r.sleep(400);await r.grab('cmdk',p.locator('#cmdkWrap .cmdk'));await r.type('收工',350);m('typed');await r.sleep(1500);await p.keyboard.press('Enter');m('enter');await p.locator('#modalWrap.on').waitFor();await r.sleep(300);await r.grab('modal',p.locator('#modalWrap.on .modal'))},{pad:0.5});
  const row=p.locator('#modalWrap.on .rq-row');
  await r.shot('s3',async m=>{await r.sleep(500);await r.hover(p.locator('#mTitle'))});
  await r.shot('s4',async m=>{await r.grab('row1',row.nth(0));await r.hover(row.nth(0).locator('.rq-row-t'));await r.sleep(4200);await r.hover(row.nth(0).getByRole('button',{name:'現在回'}));await r.sleep(1500);await r.hover(row.nth(0).locator('input'))});
  await r.shot('s5',async m=>{await row.nth(0).locator('input').click();await r.type('等廠商週一回覆',110);await r.sleep(500);const b=row.nth(0).getByRole('button',{name:'延後'});await r.hover(b);await r.sleep(400);await b.click();m('defer')},{pad:1.0});
  await r.shot('s6',async m=>{const t=p.locator('#modalWrap.on .rq-row').nth(1);await r.grab('row2',t);await r.hover(t.locator('.rq-row-t'));await r.sleep(1700);await r.hover(t.getByRole('button',{name:'完成'}));await r.sleep(1200);await r.hover(t.getByRole('button',{name:'明天'}))});
  await r.shot('s7',async m=>{const c=p.locator('#modalWrap.on .rq-carry');await r.grab('carry',c);await r.sleep(500);await r.hover(c,{dy:12})});
  await r.shot('s8',async m=>{const b=p.locator('#mFoot button').last();await r.grab('confirm',b);await r.sleep(1500);await r.hover(b);await r.sleep(900);await b.click();m('confirm');await r.sleep(500);const tl=p.locator('aside.jc-side .jc-tl');await tl.evaluate(e=>e.scrollIntoView({block:'center'}));await r.sleep(300);await r.grab('ctx',tl);await r.hover(tl,{dy:30});m('ctx')},{pad:1.2});
  r.mark('done');
  console.log('STATE modal open:',await p.locator('#modalWrap.on').count(),'| ctx:',(await p.locator('aside.jc-side .jc-tl').innerText()).replace(/\n+/g,' | ').slice(0,300),'| head:',(await p.locator('.wbtitle').innerText()).replace(/\n+/g,' | '));
  await r.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
