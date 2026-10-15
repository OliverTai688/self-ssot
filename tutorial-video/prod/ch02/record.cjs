// 第 2 章「開始寫」錄製腳本。用法（在 prod/ 下）：node ch02/record.cjs
const rec=require('../lib/rec.cjs');
(async()=>{
  const r=await rec.open('ch02',{query:'?tutFresh=1',clock:'2026-09-12T10:32:00+08:00'});const {p}=r;
  const cur=()=>p.locator('#jcMine #doc .eb-tx:focus');const empty=p.locator('#jcMine #doc .eb-tx[data-id="b22"]');
  await empty.evaluate(el=>{el.scrollIntoView({block:'center'});scrollTo(0,0);document.documentElement.scrollTop=0});await r.sleep(500);
  const boxes={};const grab=async(k,loc)=>{try{boxes[k]=await loc.first().boundingBox()}catch(e){}};
  await grab('line',empty);await grab('start',p.getByText('我開始一天了'));await grab('mine',p.locator('#jcMine'));await grab('peer',p.locator('#jcPeer'));
  await r.sync();
  await r.shot('s2',async m=>{
    await r.sleep(500);await r.click(empty,{dx:-200});m('click');await r.sleep(500);
    await r.type('回覆印刷廠報價');m('typed');await r.sleep(700);await p.keyboard.press('Enter');m('enter');
  });
  await r.shot('s3',async m=>{await r.sleep(900);await r.hover(p.getByText('我開始一天了').first(),{dx:10,dy:26});m('hover')});
  await r.shot('s4',async m=>{
    await r.hover(cur(),{dx:-150,dy:14});await r.sleep(300);await r.type('下午跟場地方確認進場時間',95);await r.sleep(500);
    await p.keyboard.press('Enter');m('enter');await r.sleep(1300);
    await p.keyboard.press('Tab');m('tab');await r.sleep(700);await r.type('卸貨區要先申請',95);m('typed');
  },{pad:1.0});
  await r.shot('s5',async m=>{
    await r.sleep(300);await p.keyboard.press('Enter');await r.sleep(300);await r.type('停車證兩張',95);await r.sleep(600);
    await p.keyboard.press('Enter');await r.sleep(700);await p.keyboard.press('Shift+Tab');m('shifttab');await r.sleep(700);await r.type('寄邀請函給參展廠商',95);m('typed');
  });
  await r.shot('s6',async m=>{await r.sleep(1200);await r.hover(p.locator('#jcPeer').first(),{dy:-150});m('peer')});
  await grab('lineEnd',cur());r.mark('done');require('fs').writeFileSync('ch02/boxes.json',JSON.stringify(boxes));
  await r.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
