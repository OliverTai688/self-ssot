const rec=require('../lib/rec.cjs');
(async()=>{
  const r=await rec.open('ch09');const {p}=r;const tabs=p.locator('#tabs .tab');await r.grab('tabs',p.locator('#tabs'));
  await r.sync();
  await r.shot('s2',async m=>{await r.sleep(900);await r.hover(tabs.nth(1));await r.sleep(600);await tabs.nth(1).click();m('review');await r.sleep(500);await r.grab('filters',p.locator('#inner .jr-filters'))});
  await r.shot('s3',async m=>{const fg=p.locator('#inner .jr-fg');await r.sleep(400);await r.hover(fg.nth(0));await r.sleep(1500);await r.hover(fg.nth(1))});
  await r.shot('s4',async m=>{await r.hover(p.locator('#inner .panel').first(),{dy:-100});await r.sleep(600);await r.wheel(500,10);await r.sleep(900);await r.wheel(600,10);await r.sleep(600)});
  await r.shot('s5',async m=>{await r.sleep(400);await r.hover(tabs.nth(2));await r.sleep(600);await tabs.nth(2).click();m('index');await r.sleep(500);await r.grab('search',p.locator('#inner .oi-search'));await r.grab('facets',p.locator('#inner .oi-facets'));await r.hover(p.locator('#inner table thead'))});
  await r.shot('s6',async m=>{await r.click(p.locator('#oiQ'));await r.sleep(300);await r.type('海報',350);m('typed');await r.sleep(1200);await r.grab('hit',p.locator('#inner table tbody tr:has(.oi-nm)').first())},{pad:1.2});
  await r.shot('s7',async m=>{await p.locator('#oiQ').fill('');await r.sleep(500);const f=p.locator('#inner .oi-fchip',{hasText:'Standup'});await r.hover(f);await r.sleep(800);await f.click();m('facet');await r.sleep(500);await r.grab('row',p.locator('#inner table tbody tr:has(.oi-nm)').first());await r.grab('acts',p.locator('#inner table tbody tr:has(.oi-nm) .oi-acts').first())});
  await r.shot('s8',async m=>{const a=p.locator('#inner table tbody tr:has(.oi-nm) .oi-acts button');await r.sleep(1500);await r.hover(a.nth(0));await r.sleep(2400);await r.hover(a.nth(1))},{pad:0.9});
  await r.shot('s9',async m=>{const a=p.locator('#inner table tbody tr:has(.oi-nm) .oi-acts button');await r.sleep(500);await a.nth(1).click();m('jump');await r.sleep(900);await r.grab('mine',p.locator('#jcMine'))},{pad:1.5});
  r.mark('done');await p.screenshot({path:'ch09/end.png'});await r.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
