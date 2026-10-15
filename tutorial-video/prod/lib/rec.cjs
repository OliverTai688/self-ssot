// 錄製共用工具：啟動瀏覽器、假游標、同步閃光、依旁白長度控制每個鏡頭的時間。
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const BASE=process.env.BASE_URL||'http://127.0.0.1:3011';
const CHROME=process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const VW=1920,VH=1080,DSF=1,ZOOM=+(process.env.ZOOM||1.3333);
exports.open=async function(ch,{query='',clock='2026-09-12T10:32:00+08:00',nav=true}={}){
  const dir=path.join(ch,'raw');fs.rmSync(dir,{recursive:true,force:true});
  const spec=JSON.parse(fs.readFileSync(path.join(ch,'shots.json'),'utf8'));
  const dur=JSON.parse(fs.readFileSync(path.join(ch,'durations.json'),'utf8'));
  const browser=await chromium.launch({executablePath:CHROME});
  const ctx=await browser.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:DSF,locale:'zh-TW',timezoneId:'Asia/Taipei',recordVideo:{dir,size:{width:VW*DSF,height:VH*DSF}}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  if(clock)await p.clock.install({time:new Date(clock)});
  await p.addInitScript((ZOOM)=>{
    const boot=()=>{
      const s=document.createElement('style');
      s.textContent='html{zoom:'+ZOOM+'}nextjs-portal{display:none!important}#tutCur{position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;margin:-3px 0 0 -3px;pointer-events:none;transition:transform .05s linear}#tutCur svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}.tutRip{position:fixed;z-index:2147483646;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #7aa2ff;pointer-events:none;animation:tutRip .5s ease-out forwards}@keyframes tutRip{from{transform:scale(.3);opacity:1}to{transform:scale(1.3);opacity:0}}#tutFlash{position:fixed;inset:0;background:#fff;z-index:2147483647;pointer-events:none}';
      document.head.appendChild(s);
      const c=document.createElement('div');c.id='tutCur';c.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-7 1 4 8-3 1.5-4-8-5 5z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      c.style.zoom=1/ZOOM;c.style.transform='translate(960px,540px)';document.body.appendChild(c);
      addEventListener('mousemove',e=>{c.style.transform=`translate(${e.clientX}px,${e.clientY}px)`},true);
      addEventListener('mousedown',e=>{const r=document.createElement('div');r.className='tutRip';r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';document.body.appendChild(r);setTimeout(()=>r.remove(),600)},true);
      window.__tutFlash=()=>{const f=document.createElement('div');f.id='tutFlash';document.body.appendChild(f);setTimeout(()=>f.remove(),500)};
    };
    if(document.body)boot();else document.addEventListener('DOMContentLoaded',boot);
  },ZOOM);
  await p.goto(BASE+'/company/operating'+query,{timeout:120000});
  await p.locator('#wbName').waitFor({timeout:60000});
  await p.evaluate(()=>{for(const el of document.querySelectorAll('strong'))if(el.textContent.trim()==='預覽模式'){el.closest('.company-tone').parentElement.style.display='none'}});
  // html 用 zoom 放大後，100dvh 會超出畫面；把三層容器的高度除回來。
  const fit=await p.evaluate((Z)=>{const h=(100/Z)+'dvh';let n=0;const host=[...document.querySelectorAll('*')].find(e=>e.shadowRoot);const root=host&&host.shadowRoot;
    if(host){const st=document.createElement('style');st.id='tutFit';st.textContent='.app{height:100%!important}';root.appendChild(st);host.style.height=h;n++;const r=root.querySelector('.v5-root');if(r){r.style.height=h;n++}let e=host.parentElement;while(e&&e!==document.body){if(e.style&&e.style.height==='100dvh'){e.style.height=h;n++}e=e.parentElement}}
    document.body.style.minHeight='0';document.body.style.height=h;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';return {n,doc:document.documentElement.scrollHeight,win:innerHeight}},ZOOM);console.log('fit',JSON.stringify(fit));
  const rail=n=>p.locator('.rail-i').filter({has:p.locator('em',{hasText:new RegExp('^'+n+'$')})});
  if(nav){await rail('日誌').click();await p.locator('#jcMine #doc').waitFor();await p.waitForTimeout(600)}
  let t0=0;const marks={};const sleep=ms=>p.waitForTimeout(ms);
  const boxes={};const api={p,spec,dur,errs,sleep,rail,boxes,
    async grab(k,loc,{pad}={}){try{const b=await loc.first().boundingBox();if(b)boxes[k]=b}catch(e){}},
    // 把元素捲到所在捲動容器的固定高度（frac=0 在最上面），讓鏡頭與字幕位置穩定。
    // 把元素捲到左欄的固定高度並鎖住：之後畫面重繪時，捲動位置不會跳回最上面。
    async focus(loc,frac=0.25){await loc.first().evaluate((el,frac)=>{const sc=el.closest('.jc-col-b');if(!sc)return;window.__tutLock=null;const r=el.getBoundingClientRect(),s=sc.getBoundingClientRect(),k=sc.offsetHeight?s.height/sc.offsetHeight:1;sc.scrollTop+=(r.top-s.top)/k-sc.clientHeight*frac;const id=sc.parentElement.id,top=sc.scrollTop;window.__tutLock={id,top};
      if(!window.__tutLockLoop){window.__tutLockLoop=true;const root=sc.getRootNode();const tick=()=>{const L=window.__tutLock;if(L){const c=root.querySelector('#'+L.id+' .jc-col-b');if(c&&Math.abs(c.scrollTop-L.top)>1)c.scrollTop=L.top}requestAnimationFrame(tick)};requestAnimationFrame(tick)}},frac).catch(e=>console.log('focus failed',String(e).slice(0,120)));await sleep(200)},
    async unlock(){await p.evaluate(()=>{window.__tutLock=null})},
    async wheel(dy,steps=6){for(let i=0;i<steps;i++){await p.mouse.wheel(0,dy/steps);await sleep(60)}},
    // 同步點：畫面閃白一下，後製用它對齊影片時間軸的 0。
    async sync(){await p.evaluate(()=>window.__tutFlash());t0=Date.now();await sleep(1000)},
    now:()=>(Date.now()-t0)/1000,
    mark(n){marks[n]=+api.now().toFixed(2)},
    // 一個鏡頭：先記開始時間，做完動作後補足到「旁白長度 + 留白」。
    async shot(id,fn,{pad=0.7,min=0}={}){const s=api.now();marks[id]={start:+s.toFixed(2)};await fn(m=>{marks[id][m]=+(api.now()-s).toFixed(2)});const need=Math.max((dur[id]||0)+pad,min);const left=need-(api.now()-s);if(left>0)await sleep(left*1000);marks[id].end=+api.now().toFixed(2)},
    // 平滑移動游標到某元素（回傳中心座標）。
    async hover(loc,{dx=0,dy=0,steps=10}={}){const b=await loc.first().boundingBox();if(!b)throw new Error('no box for '+loc);const x=b.x+b.width/2+dx,y=b.y+b.height/2+dy;await p.mouse.move(x,y,{steps});return{x,y,box:b}},
    async click(loc,o){const r=await api.hover(loc,o);await sleep(180);if(o&&(o.dx||o.dy)){await p.mouse.down();await p.mouse.up()}else{try{await loc.first().click({timeout:2500})}catch(e){await p.mouse.move(r.x,r.y);await p.mouse.down();await p.mouse.up()}}return r},
    async type(text,delay=110){await p.keyboard.type(text,{delay})},
    async box(loc){return await loc.boundingBox()},
    async close(){await sleep(400);const v=p.video();await ctx.close();const f=await v.path();await browser.close();
      if(Object.keys(boxes).length)fs.writeFileSync(path.join(ch,'boxes.json'),JSON.stringify(boxes));fs.writeFileSync(path.join(ch,'marks.json'),JSON.stringify({vw:VW,vh:VH,zoom:ZOOM,video:path.basename(f),marks,errs},null,1));console.log(JSON.stringify(marks));if(errs.length)console.log('PAGE ERRORS',errs)}
  };
  return api;
};
