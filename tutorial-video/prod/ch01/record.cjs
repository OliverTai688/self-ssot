const rec=require('../lib/rec.cjs');
(async()=>{
  const r=await rec.open('ch01',{nav:false});const {p}=r;
  await r.rail('營運').click();await r.sleep(900);await p.mouse.move(700,500);
  await r.sync();
  await r.shot('s2',async m=>{await r.sleep(700);await r.grab('rail',r.rail('日誌'));await r.click(r.rail('日誌'));m('click');await p.locator('#jcMine #doc').waitFor()});
  await r.grab('date',p.locator('#jcDate'));await r.grab('tabs',p.locator('#tabs'));await r.grab('mine',p.locator('#jcMine'));await r.grab('peer',p.locator('#jcPeer'));await r.grab('side',p.locator('aside.jc-side'));await r.grab('start',p.locator('#wbScn'));
  await r.shot('s3',async m=>{const bs=p.locator('#jcDate button');await r.sleep(400);await r.hover(p.locator('#jcDate b'));await r.sleep(1200);await r.hover(bs.nth(0));await r.sleep(700);await r.hover(bs.nth(1));await r.sleep(1200);await r.hover(bs.nth(2));m('cal')});
  await r.shot('s4',async m=>{const t=p.locator('#tabs .tab');await r.sleep(900);await r.hover(t.nth(0));await r.sleep(500);await r.hover(t.nth(1));await r.sleep(500);await r.hover(t.nth(2));await r.sleep(1000);await r.hover(t.nth(0))});
  await r.shot('s5',async m=>{await r.sleep(400);await r.hover(p.locator('#jcMine .jc-col-h b'));await r.sleep(1000);await r.hover(p.locator('#jcMine #doc'),{dy:-80})});
  await r.shot('s6',async m=>{await r.sleep(400);await r.hover(p.locator('#jcPeer .jc-col-m'));await r.sleep(1200);await r.hover(p.locator('#jcPeer .jc-doc'),{dy:-60})});
  await r.shot('s7',async m=>{const side=p.locator('aside.jc-side');await r.sleep(600);await r.hover(side.locator('.jc-stats'));m('stats');await r.sleep(1000);await r.hover(side.locator('.jc-sec-t',{hasText:'回覆追蹤'}),{dy:80});m('reply');await r.sleep(1300);
    await r.wheel(330,4);await r.hover(side.getByText('今日議題').first(),{dy:40});m('agenda');await r.sleep(1200);await r.wheel(420,4);await r.hover(side.locator('.jc-sec-t',{hasText:'今天誕生的物件'}),{dy:40});m('born');await r.sleep(1300);await r.hover(side.locator('.jc-sec-t',{hasText:'今日脈絡'}),{dy:50});m('ctx')},{pad:1.0});
  await r.shot('s8',async m=>{await p.locator('aside.jc-side .jc-side-b').evaluate(e=>e.scrollTo({top:0,behavior:'smooth'})).catch(()=>{});await r.sleep(500);await r.hover(p.locator('#wbRule'),{dy:22})});
  r.mark('done');await r.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
