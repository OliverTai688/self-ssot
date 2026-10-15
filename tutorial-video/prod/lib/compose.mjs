// 依 shots.json + durations.json + marks.json + boxes.json + edit.json 產生 HyperFrames 合成檔。
// 用法（在 prod/ 下）：node lib/compose.mjs ch02 && (cd ch02/comp && npx hyperframes render -o ../ch02.mp4)
import fs from 'node:fs';import path from 'node:path';import {execSync} from 'node:child_process';
const ch=process.argv[2];const J=f=>JSON.parse(fs.readFileSync(path.join(ch,f),'utf8'));
const spec=J('shots.json'),dur=J('durations.json'),{marks,video}=J('marks.json'),boxes=J('boxes.json'),edit=J('edit.json');
const out=path.join(ch,'comp');fs.mkdirSync(out,{recursive:true});
const W=1920,H=1080,_t=spec.shots.find(s=>s.kind==='title'),_r=spec.shots.find(s=>s.kind==='recap'),TITLE=Math.max(3.2,(_t&&dur[_t.id]||0)+1.3),RECAP=(spec.recap&&spec.recap.length)?Math.max(4.5,(_r&&dur[_r.id]||0)+1.5):0.01,FIRST=spec.shots.find(s=>s.kind!=='title'&&s.kind!=='recap').id;
const f0=marks[FIRST].start,fEnd=marks.done,FOOT=+(fEnd-f0).toFixed(2),TOTAL=+(TITLE+FOOT+RECAP).toFixed(2);
const T=f=>+(TITLE+f-f0).toFixed(2);                       // 錄影時間 → 成片時間
const ev=e=>T(e.split('+').flatMap(a=>a.split(/(?=-)/)).reduce((s,tok)=>{tok=tok.trim();const neg=tok.startsWith('-');if(neg)tok=tok.slice(1);let v;if(/^[\d.]+$/.test(tok))v=+tok;else{const[a,b]=tok.split('.');v=marks[a][b]}return s+(neg?-v:v)},0));
// 素材：從同步閃光之後切出來，轉成每格都能精準定位的 mp4
const precut=path.join(ch,'precut.mp4');let sync=0;
if(fs.existsSync(precut)){fs.copyFileSync(precut,path.join(out,'footage.mp4'))}
else{const raw=path.join(ch,'raw',video);const syncS=execSync(`lib/sync.sh "${raw}"`).toString().trim();if(!syncS)throw new Error(ch+": 錄影裡找不到同步閃光，請重錄");sync=+syncS;
execSync(`ffmpeg -v error -y -ss ${(sync+f0).toFixed(2)} -t ${FOOT} -i "${raw}" -an -c:v libx264 -crf 14 -preset medium -pix_fmt yuv420p -r 30 -g 15 ${out}/footage.mp4`)}
fs.copyFileSync('../node_modules/gsap/dist/gsap.min.js',path.join(out,'gsap.min.js'));
fs.mkdirSync(path.join(out,'audio'),{recursive:true});for(const f of fs.readdirSync(path.join(ch,'audio')))fs.copyFileSync(path.join(ch,'audio',f),path.join(out,'audio',f));
for(const f of ['hyperframes.json','meta.json'])if(!fs.existsSync(path.join(out,f)))fs.copyFileSync(path.join('../sample',f),path.join(out,f));
const cam=c=>{if(c.full)return{x:0,y:0,s:1};const b=boxes[c.box],s=c.scale,cx=b.x+b.width/2,cy=b.y+b.height/2;const cl=(v,lo)=>Math.min(0,Math.max(lo,v));return{x:+cl(W/2-cx*s,W-W*s).toFixed(1),y:+cl(H*(c.fy||0.42)-cy*s,H-H*s).toFixed(1),s}};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
let html='',js='';
// 字幕與旁白
const caps=[];for(const s of spec.shots){if(!s.say)continue;const st=s.kind==='title'?0.5:s.kind==='recap'?+(TITLE+FOOT+0.5).toFixed(2):T(marks[s.id].start)+0.25;caps.push({id:s.id,st,d:dur[s.id],say:s.say,title:s.kind==='title'||s.kind==='recap',top:s.cap==='top'})}
for(const c of caps){html+=`  <audio id="a_${c.id}" src="audio/${c.id}.wav" data-start="${c.st}" data-duration="${c.d}" data-volume="1"></audio>\n`;
  if(!c.title){const d=+(c.d+0.5).toFixed(2);html+=`  <div id="c_${c.id}" class="clip cap${c.top?' top':''}" data-start="${c.st}" data-duration="${d}"><span>${esc(c.say)}</span></div>\n`;js+=`tl.fromTo("#c_${c.id}",{opacity:0,y:14},{opacity:1,y:0,duration:.25},${c.st});\n`}}
// 鏡頭
let prev={x:0,y:0,s:1};js+=`tl.set("#stage",{x:0,y:0,scale:1},0);\n`;
for(const c of edit.cams||[]){const k=cam(c),at=Math.max(TITLE,ev(c.at));js+=`tl.to("#stage",{x:${k.x},y:${k.y},scale:${k.s},duration:.9,ease:"power2.inOut"},${at});\n`;prev=k}
js+=`tl.to("#stage",{x:0,y:0,scale:1,duration:.6,ease:"power2.inOut"},${(TITLE+FOOT-0.7).toFixed(2)});\n`;
// 框線（放在 #stage 裡，跟著鏡頭一起縮放）
let rings='';(edit.rings||[]).forEach((r,i)=>{const b=boxes[r.box],p=r.pad||0,a=ev(r.from),z=ev(r.to);const w=((r.w||b.width)+p*2+(r.wide||0)),h=(r.h||b.height)+p*2;b.x+=(r.dx||0);b.y+=(r.dy||0);
  rings+=`    <div id="r${i}" class="ring" style="left:${(b.x-p).toFixed(0)}px;top:${(b.y-p).toFixed(0)}px;width:${w.toFixed(0)}px;height:${h.toFixed(0)}px"></div>\n`;
  js+=`tl.fromTo("#r${i}",{opacity:0,scale:1.08},{opacity:1,scale:1,duration:.3},${a});tl.to("#r${i}",{opacity:0,duration:.3},${z});\n`});
// 按鍵提示
(edit.keys||[]).forEach((k,i)=>{const a=+(ev(k.at)-0.1).toFixed(2);html+=`  <div id="k${i}" class="clip key" data-start="${a}" data-duration="1.7"><span>${esc(k.label)}</span></div>\n`;
  js+=`tl.fromTo("#k${i} span",{opacity:0,scale:.7,y:10},{opacity:1,scale:1,y:0,duration:.18,ease:"back.out(2)"},${a});tl.to("#k${i} span",{opacity:0,duration:.25},${(a+1.4).toFixed(2)});\n`});
// 圖解卡：蓋在錄影上面，持續該鏡頭的長度
let cards='';for(const s of spec.shots){if(s.kind!=='card')continue;const a=T(marks[s.id].start),d=+(marks[s.id].end-marks[s.id].start).toFixed(2),c=s.card,id='cd_'+s.id;let inner='';
  if(c.atFrac)c.at=c.atFrac.map(f=>f*dur[s.id]+0.25);if(c.type==='timeline24'){inner=`<div class="k">${esc(c.title)}</div><div class="tl24"><div class="seg sA"><b>0–16 小時</b><span>藍色倒數</span></div><div class="seg sB"><b>16–24 小時</b><span>橘色，提醒對方</span></div><div class="seg sC"><b>超過 24 小時</b><span>紅色橫幅，每 4 小時再提醒</span></div></div><div class="tlaxis"><i style="left:0">0h</i><i style="left:50%">16h</i><i style="left:75%">24h</i></div>`;
    js+=`tl.fromTo("#${id} .sA",{scaleX:0},{scaleX:1,duration:.7,ease:"power2.out"},${(a+c.at[0]).toFixed(2)});tl.fromTo("#${id} .sB",{scaleX:0},{scaleX:1,duration:.7,ease:"power2.out"},${(a+c.at[1]).toFixed(2)});tl.fromTo("#${id} .sC",{scaleX:0},{scaleX:1,duration:.7,ease:"power2.out"},${(a+c.at[2]).toFixed(2)});\n`}
  else{inner=`<div class="k">${esc(c.title)}</div><ul${c.type==='grid'?' class="grid"':''}>${c.items.map(x=>`<li><i></i>${esc(x)}</li>`).join('')}</ul>`;js+=`tl.fromTo("#${id} li",{opacity:0,x:-30},{opacity:1,x:0,duration:.4,stagger:${c.stagger||1.2}},${(a+(c.delay||0.8)).toFixed(2)});\n`}
  cards+=`  <div id="${id}" class="clip card" data-start="${a}" data-duration="${d}">${inner}</div>\n`;js+=`tl.set("#${id}",{opacity:0},0);tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:.3},${a});tl.to("#${id}",{opacity:0,duration:.3},${(a+d-0.3).toFixed(2)});\n`}
const RS=+(TITLE+FOOT).toFixed(2);
const page=`<!doctype html>
<html lang="zh-Hant"><head><meta charset="UTF-8" /><meta name="viewport" content="width=${W}, height=${H}" />
<script src="gsap.min.js"></script>
<style>
@font-face{font-family:"TutSans";src:local("Noto Sans CJK TC"),local("Noto Sans TC"),local("PingFang TC")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0a0c0f}
#root{position:relative;width:${W}px;height:${H}px;font-family:"TutSans",sans-serif;color:#eef1f6;overflow:hidden}
.clip{position:absolute}
#stagewrap{position:absolute;inset:0;overflow:hidden}
#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#stage video{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
.ring{position:absolute;border:3px solid #ffcc55;border-radius:12px;box-shadow:0 0 0 4px rgba(255,204,85,.18),0 0 28px rgba(255,204,85,.35);opacity:0}
.card{inset:0;background:radial-gradient(1300px 760px at 28% 18%,#1a2440 0%,#0a0c0f 70%);display:flex;flex-direction:column;justify-content:center;padding-left:190px}
.card .k{font-size:30px;letter-spacing:.3em;color:#7aa2ff;font-weight:500}
.card h1{font-size:128px;font-weight:700;margin:20px 0 26px}
.card p{font-size:42px;color:#a8b1c2}
.card ul{list-style:none;margin-top:10px}
.card li{font-size:54px;font-weight:500;margin:26px 0;display:flex;align-items:center;gap:26px}
.card li i{width:14px;height:14px;border-radius:50%;background:#7aa2ff;flex:none}
.cap{left:0;right:0;bottom:46px;display:flex;justify-content:center;pointer-events:none}
.cap.top{bottom:auto;top:46px}
.cap span{max-width:1560px;background:rgba(8,10,16,.9);border:1px solid #343d54;padding:16px 36px;border-radius:14px;font-size:38px;font-weight:500;line-height:1.4;text-align:center}
.key{left:0;right:0;top:64px;display:flex;justify-content:center;pointer-events:none}
.key span{background:#f4f6fb;color:#0a0c0f;border-radius:14px;padding:10px 34px;font-size:44px;font-weight:700;box-shadow:0 6px 0 #9aa3b8,0 14px 34px rgba(0,0,0,.5)}

.tl24{display:flex;width:1500px;height:150px;margin-top:60px;border-radius:18px;overflow:hidden}
.tl24 .seg{transform-origin:0 50%;display:flex;flex-direction:column;justify-content:center;padding-left:28px;color:#0a0c0f}
.tl24 .seg b{font-size:36px}.tl24 .seg span{font-size:26px;font-weight:500}
.tl24 .sA{width:50%;background:#6aa8ff}.tl24 .sB{width:25%;background:#ffa64d}.tl24 .sC{width:25%;background:#ff5a5f;color:#fff}
.tl24 .sB span,.tl24 .sC span{font-size:21px}
.tlaxis{position:relative;width:1500px;height:50px;margin-top:14px;color:#a8b1c2;font-size:28px}.tlaxis i{position:absolute;font-style:normal}
.card ul.grid{display:grid;grid-template-columns:repeat(3,auto);column-gap:90px;justify-content:start;margin-top:30px}.card ul.grid li{font-size:44px;margin:20px 0}
#chip{left:0;top:0;padding:14px 22px;font-size:22px;color:#cfd6e6;background:rgba(8,10,16,.72);border-bottom-right-radius:12px;letter-spacing:.08em}
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
  <div id="stagewrap">
   <div id="stage">
    <video id="v" src="footage.mp4" muted playsinline data-start="${TITLE}" data-duration="${FOOT}"></video>
${rings}   </div>
  </div>
${cards}  <div id="title" class="clip card" data-start="0" data-duration="${TITLE}">
    <div class="k">${esc(spec.kicker||("日誌教學 · 第 "+(+spec.no)+" 章"))}</div><h1>${esc(spec.title)}</h1><p>${esc(spec.subtitle)}</p>
  </div>
  <div id="recap" class="clip card" data-start="${RS}" data-duration="${RECAP}">
    <div class="k">第 ${+spec.no} 章 · 重點</div><ul>${spec.recap.map(r=>`<li><i></i>${esc(r)}</li>`).join('')}</ul>
  </div>
${html}</div>
<script>
const tl=gsap.timeline({paused:true});
tl.fromTo("#title .k",{opacity:0,y:20},{opacity:1,y:0,duration:.5},.1).fromTo("#title h1",{opacity:0,y:40},{opacity:1,y:0,duration:.6},.25).fromTo("#title p",{opacity:0,y:20},{opacity:1,y:0,duration:.5},.5).to("#title",{opacity:0,duration:.3},${(TITLE-0.3).toFixed(2)});

tl.fromTo("#recap",{opacity:0},{opacity:1,duration:.35},${RS}).fromTo("#recap li",{opacity:0,x:-30},{opacity:1,x:0,duration:.45,stagger:.3},${(RS+0.3).toFixed(2)});
${js}window.__timelines["main"]=tl;tl.seek(0);
</script>
</body></html>`;
fs.writeFileSync(path.join(out,'index.html'),page);console.log(`${ch}: total ${TOTAL}s, footage ${FOOT}s, sync ${sync}`);
