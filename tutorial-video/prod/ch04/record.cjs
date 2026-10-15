const rec=require('../lib/rec.cjs');
(async()=>{
  const r=await rec.open('ch04');const {p}=r;
  const empty=p.locator('#jcMine #doc .eb-tx[data-id="b22"]');await r.focus(empty,0.04);
  await r.grab('line',empty);await r.grab('bell',p.locator('#noticeBtn'));
  await r.sync();
  await r.shot('s2',async m=>{await r.sleep(300);await r.click(empty,{dx:-200});await r.sleep(300);await r.type('背板設計參考 ',95);await p.keyboard.type('@');m('at');await p.locator('#summon.on').waitFor();await r.sleep(300);await r.grab('menu',p.locator('#summon'));await r.hover(p.locator('#summon .summon-i').nth(1))});
  await r.shot('s3',async m=>{await r.sleep(500);await r.type('海報',250);await r.sleep(1400);await p.keyboard.press('Enter');m('enter');await r.sleep(150);const c=p.locator('#jcMine #doc .eb-obj:not(.eb-doc-card)').last();await r.focus(c,0.3);await r.grab('card',c);await r.hover(c)},{pad:1.0});
  await r.shot('s4',async m=>{await r.sleep(800);await r.hover(p.locator('#jcMine #doc .eb-obj:not(.eb-doc-card)').last(),{dx:80,dy:6})});
  await r.shot('s5',async m=>{await r.focus(empty,0.04);await r.grab('line5',empty);await r.click(empty,{dx:100});await p.keyboard.press('End');await p.keyboard.press('Enter');await r.sleep(300);await r.type('進場時間改到早上八點 ',95);await p.keyboard.type('?@',{delay:200});m('ask');await p.locator('#summon.on').waitFor();await r.sleep(300);await r.grab('menu2',p.locator('#summon'));await r.sleep(900);const it=p.locator('#summon .summon-i').nth(2);await r.grab('notify',it);await p.keyboard.press('ArrowDown');await r.sleep(500);await p.keyboard.press('ArrowDown');m('sel');await r.sleep(1400);await p.keyboard.press('Enter');m('pick')},{pad:0.4});
  await r.shot('s6',async m=>{const pill=p.locator('#jcMine .rq-pill.note').last();await r.focus(pill,0.3);await r.grab('pill',pill);await r.hover(pill,{dy:26})});
  await r.shot('s7',async m=>{await r.sleep(600);await r.hover(p.locator('#noticeBtn'),{dy:4});await r.sleep(1800);await r.click(p.locator('#noticeBtn'));m('open');await p.locator('#drawer.on').waitFor();await r.sleep(300);await r.grab('drawer',p.locator('#drawer.on .nt-list'))});
  await r.shot('s8',async m=>{const c=p.locator('#drawer.on .nt-card');const n=await c.count();await r.sleep(1200);for(let i=0;i<n;i++){await r.hover(c.nth(i));await r.sleep(1900)}});
  r.mark('done');await r.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
