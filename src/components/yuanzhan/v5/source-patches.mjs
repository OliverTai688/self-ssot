/** Narrow, reviewable corrections to the archived v5 source. Original file never changes. */
export function patchSource(source) {
 const rep=(a,b)=>{if(!source.includes(a))throw Error('v5 patch no longer matches: '+a.slice(0,100));source=source.replace(a,b)};
 rep('function bonus(pid){const p=P(pid);return','function bonus(pid){const p=P(pid);if(!p)return 0;return');
 rep('function throughputAvg(){const w=DB.weekly.map(x=>x[1]);return (w.reduce((a,b)=>a+b,0)/w.length)}','function throughputAvg(){const w=DB.weekly.map(x=>x[1]);return w.length?w.reduce((a,b)=>a+b,0)/w.length:0}');
 rep("function jdoc(){\n  if(!DB.journal[S.jday])DB.journal[S.jday]={title:S.jday,blocks:[{id:newBid(),t:'p',ind:0,text:''}]};\n  const d=DB.journal[S.jday]; if(!d.blocks.length)d.blocks.push({id:newBid(),t:'p',ind:0,text:''});\n  return d;\n}","function jdoc(){return currentJournal()}");
 // ARC-042：commit() 是唯一的寫入入口，所以持久化只接這一個點，不是 97 個呼叫點。
 // 快照在 apply() 之前取，比對在之後做；prototype 模式下 opSnapshot() 回 null，整段等於 no-op。
 rep('const eff=apply()||[];','const __opBefore=opSnapshot(); const eff=apply()||[]; stampAuthors(); saveJournalDraft(); recalcLedger(); opEnqueue(op,ent,label,__opBefore);');
 rep('function render(){','function render(){\n  saveJournalDraft(); normalizeSelection();');
 rep('renderRail();\n  if(runtime._afterRender)','renderRail(); enhanceView();\n  if(runtime._afterRender)');
 rep('function nav(wb,tab){S.wb=wb;','function nav(wb,tab){saveJournalDraft();S.wb=wb;');
 // PLN-073 T4：舊模組下架後，指向它們的既有連結要先重導，否則 S.wb 會指到不存在的模組。
 rep('function nav(wb,tab){saveJournalDraft();S.wb=wb;','function nav(wb,tab){saveJournalDraft();const _r=opRedirect(wb,tab);wb=_r[0];tab=_r[1];S.wb=wb;');
 rep("owner:'yz',size:'M',pri:'3'","owner:DB.me,size:'M',pri:'3'");
 rep("p:S.proj,pass:'否'","p:P(S.proj)?S.proj:'公司層級',pass:'否'");
 rep("const PH={p:'寫點什麼：# 召喚 component、@ 引用既有物件'","const PH={p:'寫點什麼：# 召喚 component、@ 引用既有物件或請對方回覆、?@ 直接發送請求'");
 rep("{k:'amt',label:'金額（未稅）',type:'number',req:true,step:'1',hint:'支出請填負數，例如 −28000'}","{k:'amt',label:'金額（未稅）',type:'text',req:true,hint:'支出負數；支援 =SUM(D1:D3)、算術及固定列號公式'}");
 rep("values:e?{...e,pass:e.pass?'是':'否'}","values:e?{...e,amt:e.formula??e.amt,pass:e.pass?'是':'否'}");
 rep('const amt=Number(v.amt)||0;','const formula=String(v.amt), result=evaluateFormula(formula,ledgerCells()); if(result.error)throw Error(result.error); const amt=result.value??0;');
 rep('Object.assign(e,{d:v.d,cat:v.cat,t:v.t,amt,p:v.p','Object.assign(e,{d:v.d,cat:v.cat,t:v.t,amt,formula,p:v.p');
 rep("const t={id:nid('TXN'),d:v.d,t:v.t,p:v.p,cat:v.cat,amt,pass:","const t={id:nid('TXN'),d:v.d,t:v.t,p:v.p,cat:v.cat,amt,formula,pass:");
 // Correct stale v4 tab indexes in v5 links.
 source=source.replaceAll('onclick="setTab(2)\">尚未建立','onclick="setTab(3)\">尚未建立').replaceAll('onclick="setTab(2)\">${p.repo}','onclick="setTab(3)\">${p.repo}').replaceAll('onclick="setTab(3)\">明細','onclick="setTab(4)\">明細').replaceAll("nav('project',3)","nav('project',4)");
 rep("const who=isOwner()?S.tsWho:DB.me;","const who=isOwner()?S.tsWho:DB.me;");
 // Retain the reference control, but do not fabricate legal attendance from task cycle time.
 rep("function estimateAll(who){", "function estimateAll(who){toast('尚無出勤來源可推估；請填寫實際每日時間，再由本人確認。');return;\n");
 rep("function estimateWeek(who,w){", "function estimateWeek(who,w){return 0;\n");
 rep('S.filter===\'mine\'?all.filter(i=>i.owner===\'yz\')',"S.filter==='mine'?all.filter(i=>i.owner===DB.me)");
 // Extend the shared icon table with lucide-equivalent glyphs used by the reply-flow /
 // journal-cockpit extensions, so those features stop drawing emoji as icons.
 rep("clock:'<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>'\n};", "clock:'<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>',\n  check:'<path d=\"M20 6 9 17l-5-5\"/>',\n  moon:'<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/>',\n  warn:'<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>',\n  refresh:'<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/>',\n  dot:'<circle cx=\"12\" cy=\"12\" r=\"8\" fill=\"currentColor\" stroke=\"none\"/>',\n  diamond:'<path d=\"M12 3 3 12l9 9 9-9Z\"/>',\n  arrowin:'<path d=\"m7 7 10 10\"/><path d=\"M17 7v10H7\"/>'\n};");
 // journal-cockpit's date nav / #-summon / @-cite buttons, and the timeline-participants
 // list/calendar view toggle + reply "message"/"carried over" icons, reference glyphs
 // that were still missing from the shared icon table (svg(k) silently draws an empty
 // <svg> for an unknown key) -- add the missing lucide-equivalent entries.
 rep("arrowin:'<path d=\"m7 7 10 10\"/><path d=\"M17 7v10H7\"/>'\n};", "arrowin:'<path d=\"m7 7 10 10\"/><path d=\"M17 7v10H7\"/>',\n  chevronLeft:'<path d=\"m15 6-6 6 6 6\"/>',\n  chevronRight:'<path d=\"m9 6 6 6-6 6\"/>',\n  calendar:'<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>',\n  cal:'<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>',\n  hash:'<path d=\"M4 9h16M4 15h16M10 3 8 21M16 3l-2 18\"/>',\n  at:'<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94\"/>',\n  list:'<path d=\"M8 6h13M8 12h13M8 18h13\"/><path d=\"M3 6h.01M3 12h.01M3 18h.01\"/>',\n  message:'<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/>',\n  rotate:'<path d=\"M3 12a9 9 0 1 0 2.6-6.4L3 8\"/><path d=\"M3 3v5h5\"/>'\n};");
 // Chart/heatmap colors were hardcoded to the black theme's palette; read the active
 // theme's CSS custom properties instead so charts redraw correctly in all 4 themes.
 rep("const VC={v1:'#3987e5',v2:'#d95926',v3:'#199e70',v4:'#c98500',\n          good:'#0ca30c',warn:'#fab219',serious:'#ec835a',crit:'#d03b3b',\n          seq:['#184f95','#256abf','#3987e5','#6da7ec','#9ec5f4'],\n          grid:'#252c35',axis:'#39414c',ink:'#99a2af',ink2:'#626b77',surf:'#161a20'};", "const VC={v1:'var(--v1)',v2:'var(--v2)',v3:'var(--v3)',v4:'var(--v4)',\n          good:'var(--st-good)',warn:'var(--st-warn)',serious:'var(--st-serious)',crit:'var(--st-crit)',\n          seq:['var(--seq-1)','var(--seq-2)','var(--seq-3)','var(--seq-4)','var(--seq-5)'],\n          grid:'var(--grid)',axis:'var(--axis)',ink:'var(--text-2)',ink2:'var(--text-3)',surf:'var(--surface-2)'};");
 rep("const GRPCOL={Todo:'#626b77',Doing:'#3987e5',Review:'#a78bf5',Done:'#199e70'};", "const GRPCOL={Todo:'var(--text-3)',Doing:'var(--pri)',Review:'var(--info)',Done:'var(--ok)'};");
 rep("const col=bad?VC.crit:n===0?'#1b2029':VC.seq[Math.max(0,3-Math.min(n,", "const col=bad?VC.crit:n===0?'var(--surface-3)':VC.seq[Math.max(0,3-Math.min(n,");

 rep('function saveForm(){','function saveForm(){\n  if(!FORM)return;');
 rep('c.onSave(vals);','validateForm(c,vals); c.onSave(vals);');
 rep('if(d.after)d.after();','if(d.after)d.after(); enhanceDrawer();');
 for(const name of ['docKey','docInput','docClick','docComposeStart','docComposeEnd','syncAll','toggleTodo','snap','undo','redo','dragBlk','dropBlk','applySummon','replaceWithObj','summonObject','blockMenu','turnInto','dupBlock','delBlock','insertAt']){
  const re=new RegExp('function '+name+'\\(([^)]*)\\)\\{');
  if(!re.test(source))throw Error('Missing journal handler '+name);
  source=source.replace(re,`function ${name}($1){if(!canWriteJournal())return;`);
 }
 const guard=(name,code)=>{const re=new RegExp('function '+name+'\\(([^)]*)\\)\\{');if(!re.test(source))throw Error(name);source=source.replace(re,`function ${name}($1){${code}`)};
 for(const n of ['formIssue','delIssue','formRel','delRel','addSub','delSub','formCF'])guard(n,"if(id&&!editable(ISS(id)))return deny();");
 guard('setIssueStatus',"if(!progressable(ISS(id)))return deny();");
 guard('dropCard',"if(_drag&&!(S.groupBy==='st'?progressable(ISS(_drag)):editable(ISS(_drag))))return deny();");
 for(const n of ['formTxn','delTxn','addVoucher','delVoucher'])guard(n,"if(id&&!editable(TX(id)))return deny();");
 guard('formProject',"if(id&&!editable(P(id)))return deny();");
 guard('formEvent',"if(id&&!editable(EVT(id)))return deny();");
 guard('delEvent',"if(!editable(EVT(id)))return deny();");
 guard('formAlloc',"if(who!==DB.me)return deny();");
 for(const n of ['setDay','confirmWeek','doConfirmWeek','amendWeek'])guard(n,"if(who!==DB.me)return deny();if(tsWeeks(who)[wi]?.st==='locked')return deny();");
 guard('adoptBank',"if(!isOwner())return deny();");
 guard('advReimb',"const target=DB.reimb.find(r=>r.id===id);if(target&&(target.st==='待送'?target.who!==DB.me:!isOwner()))return deny();");
 guard('formReimb',"if(id&&DB.reimb.find(r=>r.id===id)?.who!==DB.me)return deny();");
 guard('formThreadClose',"if(!editable(DB.threads.find(t=>t.id===tid)))return deny();");
 // Dates remain the same in the showcase; calendar rows represent deadlines, not another task record.
 rep('const dues=DB.issues.filter(x=>x.done===ds);','const dues=DB.issues.filter(x=>(x.due||x.done)===ds);');
 // Prototype output must not claim that external links, hashes, or notifications were created.
 source=source.replaceAll("'產生外部報帳連結 yz.app/r/'+Math.random().toString(36).slice(2,8)","'本機報帳預覽已建立，未發布外部連結'");
 source=source.replaceAll('產生外部報帳連結','本機報帳預覽').replaceAll('送出後會產生一個外部連結，對方免帳號即可上傳收據','本階段在本頁示範報帳流程，可附本機憑證，尚未發布外部連結');
 source=source.replaceAll('內容雜湊寫入稽核軌跡','版本快照保留於本頁記憶體').replaceAll('內容雜湊會寫入稽核軌跡','版本快照會保留於本頁記憶體');
 source=source.replaceAll('外部承諾「交付標準」標記完成','外部承諾仍須依證據確認履行');

 source=source.replace("else if(e.key==='Enter')runCmdk(cmdkSel);", "else if(e.key==='Enter'){e.preventDefault();runCmdk(cmdkSel);}");
 source=source.replace("const log={d:v.d,t:v.t,src:v.src,ok:v.ok==='是'};", "const log={d:v.d,t:v.t,src:v.src+' · '+person(DB.me),ok:v.ok==='是',author:DB.me,at:nowts()};");
 source=source.replace('onmousedown="event.preventDefault();applySummon(${i})" onmouseenter="SM.sel=${i};paintSummon()"','onmousedown="event.preventDefault()" onclick="applySummon(${i})" onmouseenter="SM.sel=${i};highlightSummon()"');
 source=source.replace("cmdkSel=${n};filterCmdk(getById('cmdkInput').value)","cmdkSel=${n};highlightCommand()");
 source=source.replaceAll('0 項 · 無 Evidence 不得標記 Done','0 項 · 完成後仍會提醒補 Evidence');

 // Template objects: Standup, 1:1, Meeting, Research, Retro as unified objects with canvas & live preview
 rep("function objHtml(b){\n  const o=b.obj||{};", "function objHtml(b){\n  const o=b.obj||{};\n  if(o.ty==='doc_object'||o.ty==='doc')return renderDocObjectCard(b);");

 const oldTplBlock = "if(TPL[k]){\n    const t=TPL[k];\n    b.text=keep; if(!keep.trim()){arr.splice(i,1)}\n    const at=keep.trim()?i+1:i;\n    const nb=[{id:newBid(),t:'h2',ind:b.ind,text:t.h}];\n    t.secs.forEach(sx=>{nb.push({id:newBid(),t:'h3',ind:b.ind,text:sx});\n                        nb.push({id:newBid(),t:'p',ind:b.ind+1,text:''})});\n    arr.splice(at,0,...nb);\n    commit('create','日誌模板',t.h,()=>[`展開成 <b>${t.secs.length}</b> 個小標題 + 縮排內文`,'每一行都可直接編輯、Tab 再縮排','標題可以自己增減，這就是一般 Template 的長法']);\n    focusB(nb[2].id,0); render(); return;\n  }";
 const newTplBlock = "if(TPL[k]){\n    const docObj=createDocObject(k,S.jday||TODAY,TPL[k]);\n    b.text=keep; if(!keep.trim()){arr.splice(i,1)}\n    const at=keep.trim()?i+1:i;\n    const newBlock={id:newBid(),t:'obj',ind:b.ind,obj:{ty:'doc_object',rid:docObj.id}};\n    arr.splice(at,0,newBlock);\n    commit('create','日誌物件',TPL[k].h,()=>[`建立 <b>${TPL[k].h}</b> 獨立物件卡片`,'具備獨立空白畫布專注撰寫，日誌同步即時預覽','點選卡片右上 ↗ 可隨時進入畫布編輯']);\n    render();\n    openDrawer('doc_object',docObj.id);\n    return;\n  }";
 rep(oldTplBlock, newTplBlock);

 rep("DB.events.forEach(e=>push('event',e.id,e.t,`${e.d} · ${e.layer}層`,'timeline'));\n  return out.slice(0,40);", "DB.events.forEach(e=>push('event',e.id,e.t,`${e.d} · ${e.layer}層`,'timeline'));\n  (DB.docObjects||[]).forEach(d=>push('doc_object',d.id,d.title||d.type,`${d.day} · ${person(d.author)}`,'journal'));\n  return out.slice(0,40);");

 source=source.replace("g:'模板 · 展開成標題與縮排內文'","g:'物件模板 · 獨立物件與專屬畫布'");
 source=source.replaceAll("ds:'Yesterday / Today / Blocker / Need Decision'","ds:'獨立畫布專注撰寫 · 日誌同步預覽'");
 source=source.replaceAll("ds:'近況 / 進展與證據 / 阻礙 / 需要公司支持 / 下次要做的'","ds:'獨立畫布專注撰寫 · 日誌同步預覽'");
 source=source.replaceAll("ds:'出席 / 議題 / 決議 / 待辦 / 未解問題'","ds:'獨立畫布專注撰寫 · 日誌同步預覽'");
 source=source.replaceAll("ds:'做得好 / 做不好 / 下次改什麼'","ds:'獨立畫布專注撰寫 · 日誌同步預覽'");
 source=source.replaceAll("ds:'問題 / 來源 / 發現 / 對我們的意義'","ds:'獨立畫布專注撰寫 · 日誌同步預覽'");


 // Doc-object sections (Standup/1:1/會議紀錄/回顧/研究筆記) reuse the main journal's block-editing
 // engine unchanged (docKey/docInput/docClick/checkTrigger/applySummon all resolve blocks via
 // blks()). This adds the one extension point they need: an override so blks() can point at a
 // section's own block array while it has focus. See template-objects.source.js for where it's set.
 rep("const blks=()=>jdoc().blocks;", "let BLKS_OVERRIDE=null;\nconst blks=()=>BLKS_OVERRIDE?BLKS_OVERRIDE():jdoc().blocks;");
 rep("function docClick(e){if(!canWriteJournal())return;\n  if(e.target.id!=='doc')return;\n  syncAll();", "function docClick(e){if(!canWriteJournal())return;\n  if(e.target.id!=='doc'&&!(e.target.dataset&&e.target.dataset.docSec))return;\n  syncAll();");

 // ---- PLN-073 T1 · 三處既有的跨模組關聯改讀 time_spine（畫面輸出不變） ----
 // 1. 時間線清單的層級篩選
 rep('const list=DB.events.filter(e=>!filt||e.layer===filt);','const list=spineEvents(filt);');
 // 2. 時間線日曆格的工作到期日（此行已被上面的 dues patch 改寫過一次）
 rep('const dues=DB.issues.filter(x=>(x.due||x.done)===ds);','const dues=spineTasksOn(ds);');
 // 3. 專案總覽「本專案的關鍵時間」
 rep('DB.events.filter(e=>e.link===p.id).map','spineForProject(p.id).map');

 return source;
}
