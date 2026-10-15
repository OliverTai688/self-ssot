const rec=require('../lib/rec.cjs');
(async()=>{
  const r=await rec.open('ch07');const {p}=r;
  const empty=p.locator('#jcMine #doc .eb-tx[data-id="b22"]');await r.focus(empty,0.04);await r.grab('line',empty);const btn=p.locator('#jcMine .jc-col-h button',{hasText:'附件'});await r.grab('btn',btn);
  await r.sync();
  await r.shot('s2',async m=>{await r.sleep(900);await r.hover(btn)});
  await r.shot('s3',async m=>{await r.sleep(300)},{pad:1.0});
  await r.shot('s4',async m=>{await r.click(empty,{dx:-200});await r.sleep(400);await p.keyboard.type('#');m('hash');await p.locator('#summon.on').waitFor();await r.sleep(700);await r.type('附',300);await r.sleep(500);const it=p.locator('#summon .summon-i',{hasText:'附件'}).first();await r.grab('item',it);await r.grab('menu',p.locator('#summon'));await r.hover(it);m('item')});
  await r.shot('s5',async m=>{await r.sleep(300)},{pad:1.0});
  r.mark('done');await r.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
