/* ── 回覆追蹤（依 journal-reply-flow.html 設計稿實作）──────────────────────────
   ① 24 小時回覆規則：0–16h 藍色倒數 → 16–24h 橘色＋提醒回覆方 → >24h 雙方大紅色橫幅，
      之後每 4h 再提醒一次，直到有人回覆。文字回覆、選決策卡選項、「收到，晚點處理」都算回覆。
   ② 日誌頁（A 為主）：行尾打 ?@人 → ↵ 一般回覆／⇧↵ 決策卡（B 選用）；!今天 標今日議題。
      句子裡打 @人（沒有同名既有物件時）效果等同 ?@人，方便標記「這行想等對方回覆」。
      收到的請求會出現在自己當天的日誌裡；右欄是逾期／等對方回覆／今日議題摘要。
   ③ 訊號頁（C）：逾期區在最上方，下面是待我回覆／等對方回覆／今天已回覆；
      有逾期項目時不能收工，要逐項回覆、追蹤，或寫下延後理由（只能延一次，逾期紀錄保留）。
   與其他 v5 工作台相同，資料只存在頁面記憶體（UI-memory），重整即重置。
   ───────────────────────────────────────────────────────────────────────── */
const REPLY_HOURS=24, WARN_HOURS=16, REPING_HOURS=4, HOUR=3600e3;
/* 請求與今日議題都會被保存（今日議題自 PLN-074 M7 起）。無條件指派成空陣列
   會把剛讀回來的列蓋掉，日誌 block 上的 `today` 參照就指到一個不存在的議題，
   已完成的標籤也跟著不見。seed 沒有這兩個鍵，prototype 模式行為不變。 */
DB.requests=DB.requests||[];
DB.todayIssues=DB.todayIssues||[];
/* 收工時刻本身記在今日脈絡上（kind='close'）；這裡只是查詢索引，由 journal-cockpit 重建。 */
DB.dayClose={};
const rqDrafts=new Map(), rqDeferDrafts=new Map(), rqOpenReply=new Set();
let rqDecision=null;
if(initialState.mode==='showcase'){
 const now=Date.now(),yzDoc=journals.team.yz[TODAY],lilyDoc=journals.team.lily[TODAY];
 if(yzDoc&&lilyDoc){
  lilyDoc.blocks.push({id:'lily-rq1',t:'p',ind:1,text:'週一拍攝要不要多加一台補光燈？',req:'REQ-DEMO-1'});
  lilyDoc.blocks.push({id:'lily-rq2',t:'p',ind:1,text:'秋季展場地要選 A 還是 B？',req:'REQ-DEMO-3'});
  yzDoc.blocks.push({id:'yz-td1',t:'p',ind:0,text:'燈具廠商還沒回，要追',today:'TDY-DEMO-1'});
  yzDoc.blocks.push({id:'yz-rq1',t:'p',ind:0,text:'燈具預算上限可以到 15,000 嗎？',req:'REQ-DEMO-2'});
  DB.requests.push(
   {id:'REQ-DEMO-1',from:'lily',to:'yz',day:TODAY,blockId:'lily-rq1',text:'週一拍攝要不要多加一台補光燈？',kind:'ask',options:[],sentAt:now-26*HOUR,replies:[],nudges:[],pinged:{}},
   {id:'REQ-DEMO-2',from:'yz',to:'lily',day:TODAY,blockId:'yz-rq1',text:'燈具預算上限可以到 15,000 嗎？',kind:'ask',options:[],sentAt:now-20*HOUR,seenAt:now-19*HOUR,replies:[],nudges:[],pinged:{}},
   {id:'REQ-DEMO-3',from:'lily',to:'yz',day:TODAY,blockId:'lily-rq2',text:'秋季展場地要選 A 還是 B？',kind:'decision',options:['A · 松山文創','B · 華山 2 館'],sentAt:now-5*HOUR,replies:[],nudges:[],pinged:{}});
  DB.todayIssues.push({id:'TDY-DEMO-1',author:'yz',day:TODAY,blockId:'yz-td1',text:'燈具廠商還沒回，要追',at:now-3*HOUR});
 }
}

/* ---- 狀態 ---- */
function rqPeers(){return Object.keys(DB.people).filter(w=>w!==DB.me)}
function rqFind(id){return DB.requests.find(r=>r.id===id)}
function rqAge(r,now=Date.now()){return (now-r.sentAt)/HOUR}
function rqState(r,now=Date.now()){
 /* kind:'notice' 是「只是讓你看到」的 @ 提及：沒有 24 小時義務，也不該出現在
    逾期橫幅、回覆追蹤或收工檢查裡。在最上游擋掉，下游三十幾處都不用各自判斷。 */
 if(r.kind==='notice')return 'notice';
 if(r.resolvedAt)return 'resolved';
 if(r.firstReplyAt)return 'replied';
 const h=rqAge(r,now);
 return h>=REPLY_HOURS?'late':h>=WARN_HOURS?'warn':'open';
}
function rqDur(h){h=Math.max(0,h);return h<1?Math.max(1,Math.round(h*60))+'m':Math.floor(h)+'h'}
function rqLeft(r){return rqDur(REPLY_HOURS-rqAge(r))}
function rqOver(r){return rqDur(rqAge(r)-REPLY_HOURS)}
const RQ_DAY=/^\d{4}-\d{2}-\d{2}$/;
function rqDoc(r){return journals.team[r.from]?.[r.day]||null}
/* 請求指向「誰的哪一天的哪一行」。這三件事都可能對不上：
   日期可能沒存成日期（onDate 為 null 時讀回來是空字串）、那一行可能被延後或搬到別天、
   發問的人可能是對方（那一行在右欄那一本，不在自己的日誌裡）。
   先解析出它真正在哪裡，跳轉、行號與來源標籤才會指到同一個地方。 */
function rqFindLine(r){
 const book=journals.team[r.from]||{},day=RQ_DAY.test(r.day||'')?r.day:'';
 if(r.blockId){
  const here=day&&(book[day]?.blocks||[]).find(b=>b.id===r.blockId);
  if(here)return{day,block:here,idx:book[day].blocks.indexOf(here)};
  for(const k of Object.keys(book)){
   const blocks=book[k]?.blocks||[],i=blocks.findIndex(b=>b.id===r.blockId);
   if(i>=0)return{day:k,block:blocks[i],idx:i};
  }
 }
 return{day,block:null,idx:-1};
}
function rqBlock(r){return rqFindLine(r).block}
function rqText(r){return rqBlock(r)?.text?.trim()||r.text}
function rqLine(r){const s=rqFindLine(r);return s.idx<0?'原行已刪除':'L'+(s.idx+1)}
function rqShortDay(d){return RQ_DAY.test(d||'')?String(+d.slice(5,7))+'/'+String(+d.slice(8,10)):'日期不明'}
function rqSource(r){const s=rqFindLine(r);return `↩ ${person(r.from)} ${rqShortDay(s.day||r.day)} · ${rqLine(r)}`}
function rqInvolves(r,who=DB.me){return r.to===who||r.from===who}
function rqPending(r){return r.kind!=='notice'&&!r.firstReplyAt&&!r.resolvedAt}
function rqLate(who=DB.me){return DB.requests.filter(r=>rqInvolves(r,who)&&rqState(r)==='late').sort((a,b)=>a.sentAt-b.sentAt)}
function rqToMe(who=DB.me){return DB.requests.filter(r=>r.to===who&&rqPending(r)).sort((a,b)=>a.sentAt-b.sentAt)}
function rqFromMe(who=DB.me){return DB.requests.filter(r=>r.from===who&&rqPending(r)).sort((a,b)=>a.sentAt-b.sentAt)}
function rqLocalDay(ms){const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function rqRepliedToday(who=DB.me){const today=rqLocalDay(Date.now());return DB.requests.filter(r=>rqInvolves(r,who)&&r.firstReplyAt&&rqLocalDay(r.firstReplyAt)===today).sort((a,b)=>b.firstReplyAt-a.firstReplyAt)}
function rqTodayOpen(who=DB.me){return DB.todayIssues.filter(t=>t.author===who&&!t.doneAt&&t.day<=TODAY)}
/* 議題的文字以日誌那一行為準。t.text 是標記當下的快照，之後改寫那一行，右欄仍顯示舊句子而且
   沒有任何提示（today-agenda 研究的發現 A）。延後會改寫 t.day，所以要掃作者的所有日子，
   不能只查 t.day 那一天；原行真的被刪掉時才退回快照。 */
function rqTodayBlock(t){const days=journals.team[t.author]||{};for(const k of Object.keys(days)){const b=(days[k].blocks||[]).find(x=>x.id===t.blockId);if(b)return b}return null}
function rqTodayText(t){const b=rqTodayBlock(t);return (b&&b.text.trim())||t.text}
function rqSeen(r){if(r.to===DB.me&&!r.seenAt)r.seenAt=Date.now()}
function rqAv(w,cls='xs'){const p=DB.people[w];return `<span class="av rq-av ${cls} ${p.cls}">${p.s}</span>`}
function rqClock(r,suffix=''){
 const s=rqState(r),tail=suffix?' · '+suffix:'';
 if(s==='late')return `<span class="rq-pill late">${svg('warn',12)} 逾期 ${rqOver(r)}${tail}</span>`;
 if(s==='warn')return `<span class="rq-pill warn">${svg('clock',11)} 剩 ${rqLeft(r)}${tail}</span>`;
 if(s==='open')return `<span class="rq-pill ok">${svg('clock',11)} 剩 ${rqLeft(r)}${tail}</span>`;
 return '';
}
function rqReplyWord(r){const last=r.replies.find(m=>m.w===r.to);return r.choice!=null?`${person(r.to)}：${r.choice}`:last?.ack?`${person(r.to)}：收到，晚點處理`:`${person(r.to)} 已回覆`}

/* ---- ② 行內觸發：?@人（↵ 一般／⇧↵ 決策卡）、!今天；句子裡 @人（無同名物件時）等同 ?@人 ---- */
const RQ_ASK=/(?:^|\s)[?？][@＠]([^\s#@＠]{0,12})$/, RQ_FLAG=/(?:^|\s)[!！]([^\s#@!！]{0,6})$/, RQ_MENTION=/(?:^|\s)[@＠]([^\s#@＠]{0,12})$/;
/* @人名 與 ?@人名 給的是同三個選項，差別只在誰排第一、誰是 ↵ 的預設：
   單純 @ 是「讓他看到」，要求回覆是刻意的動作（?@）。 */
function rqAskHits(q,mode){
 q=(q||'').toLowerCase();const out=[];
 const plain=mode==='mention';
 for(const w of rqPeers()){const p=DB.people[w];if(q&&!(w+p.n).toLowerCase().includes(q))continue;
  const notice={ask:'notice',to:w,g:'通知 '+p.n,ic:'@',nm:'只是讓他看到（不用回覆）',ds:'對方收到站內通知；不計時、不進回覆追蹤',k:plain?'↵':'',mention:true,rid:w};
  const ask={ask:'ask',to:w,g:'發給 '+p.n,ic:'?',nm:'請回覆（一般）',ds:'回覆掛在這行下面 · 24 小時內提醒',k:plain?'':'↵',mention:true,rid:w};
  const dec={ask:'decision',to:w,g:'發給 '+p.n,ic:'◆',nm:'做決定（決策卡）',ds:'加選項，對方點選即回覆',k:'⇧↵',mention:true,rid:w};
  if(plain)out.push(notice,ask,dec);else out.push(ask,dec,notice);}
 return out;
}
const RQ_FLAG_HITS=[{flag:'today',g:'標記',ic:'!',nm:'今天要處理',ds:'加入今日議題，收工前檢查',k:'↵'},
 {flag:'agenda',g:'標記',ic:'!',nm:'建立議題物件',ds:'這一行與底下的子項收成一個議題 · 可排期、討論、附檔、結案',k:'↵'}];
function rqOpenMenu(tx,b,start,q,mode){
 const hits=mode==='ask'||mode==='mention'?rqAskHits(q,mode):RQ_FLAG_HITS;
 if(!SM.open||SM.blockId!==b.id||SM.mode!==mode)openSummon(b.id,start,q,caretRect(tx),mode);
 SM.q=q;SM.start=start;SM.hits=hits;SM.sel=Math.min(SM.sel,Math.max(0,hits.length-1));paintSummon();
}
const rqBasePaint=paintSummon;
paintSummon=function(){
 rqBasePaint();
 if(SM.mode!=='ask'&&SM.mode!=='flag'&&SM.mode!=='mention')return;
 root.querySelectorAll('#summonList .summon-i .kb').forEach((el,i)=>{el.textContent=SM.hits[i]?.k||''});
 if((SM.mode==='ask'||SM.mode==='mention')&&SM.hits.length)$('#summonList').insertAdjacentHTML('beforeend','<div class="summon-g">'+(SM.mode==='mention'?'@ 只通知，不計時；要求回覆才會在 24 小時內提醒':'請回覆與決策卡都會在 24 小時內提醒')+'</div>');
};
const rqBaseTrigger=checkTrigger;
checkTrigger=function(tx,b){
 if(b&&!COMPOSING&&space==='team'){
  const upto=b.text.slice(0,caretOff(tx));
  let m=upto.match(RQ_ASK);
  if(m)return rqOpenMenu(tx,b,upto.length-m[1].length-2,m[1],'ask');
  m=upto.match(RQ_FLAG);
  if(m&&['今天','今日','today','議題','agenda'].some(w=>w.startsWith(m[1].toLowerCase())))return rqOpenMenu(tx,b,upto.length-m[1].length-1,m[1],'flag');
  m=upto.match(RQ_MENTION);
  if(m){const askHits=rqAskHits(m[1],'mention');if(askHits.length&&!mentionHits(m[1]).length)return rqOpenMenu(tx,b,upto.length-m[1].length-1,m[1],'mention')}
 }
 if(SM.open&&(SM.mode==='ask'||SM.mode==='flag'||SM.mode==='mention'))closeSummon();
 return rqBaseTrigger(tx,b);
};
// ⇧↵ 直接選「做決定」；在原本的 docKey 之前攔截。
root.addEventListener('keydown',e=>{
 if(!SM.open||(SM.mode!=='ask'&&SM.mode!=='mention')||e.key!=='Enter'||!e.shiftKey||e.isComposing)return;
 e.preventDefault();e.stopPropagation();
 const to=SM.hits[SM.sel]?.to,i=SM.hits.findIndex(h=>h.to===to&&h.ask==='decision');
 if(i>=0)applySummon(i);
},{capture:true,signal:controller.signal});
const rqBaseApply=applySummon;
applySummon=function(n){
 if(SM.mode!=='ask'&&SM.mode!=='flag'&&SM.mode!=='mention')return rqBaseApply(n);
 if(!canWriteJournal())return;
 const h=SM.hits[n],b=bOf(SM.blockId);if(!h||!b)return closeSummon();
 syncAll();
 const len=(SM.mode==='ask'?2:1)+SM.q.length,via=SM.mode;
 const text=(b.text.slice(0,SM.start)+b.text.slice(SM.start+len)).replace(/\s+$/,'');
 closeSummon();snap();b.text=text;focusB(b.id,text.length);
 if(!text.trim()){render();return toast('先寫下要問或要處理的內容，再加上 '+(h.flag?'!今天':(via==='mention'?'@':'?@')+esc(person(h.to))))}
 if(h.flag)return h.flag==='agenda'?agCreate(b):rqFlagToday(b);
 // 只通知不佔用這一行的 b.req：同一行可以通知多個人，也可以之後再改成請求。
 if(h.ask==='notice')return rqNotify(b,h.to,via);
 const current=b.req&&rqFind(b.req);
 if(current&&!current.resolvedAt){render();return toast('這一行已經有進行中的請求')}
 if(h.ask==='decision'){
  rqDecision={blockId:b.id,to:h.to,opts:['',''],via};
  runtime._afterRender=()=>root.querySelector('[data-rq-opt="0"]')?.focus();
  return render();
 }
 rqSend(b,h.to,'ask',[],via);
};
function rqSend(b,to,kind,options,via='ask'){
 const r={id:nid('REQ'),from:DB.me,to,day:S.jday,blockId:b.id,text:b.text.trim(),kind,options,via,sentAt:Date.now(),replies:[],nudges:[],pinged:{}};
 commit('create',kind==='decision'?'決策卡':'請求',r.text,()=>{DB.requests.push(r);b.req=r.id;
  return[`已通知 <b>${esc(person(to))}</b>，24 小時內要回覆`,'16 小時起轉橘色；超過 24 小時雙方畫面亮紅色提醒','訊號頁同步出現']});
}
/* 只通知：與請求同一張表（kind 區分），所以會跟著保存、也會出現在對方的通知匣，
   但不掛 b.req、不計時、不進回覆追蹤，收工檢查也不會攔它。 */
function rqNotify(b,to,via='mention'){
 const r={id:nid('REQ'),from:DB.me,to,day:S.jday,blockId:b.id,text:b.text.trim(),kind:'notice',options:[],via,sentAt:Date.now(),replies:[],nudges:[],pinged:{}};
 commit('create','通知',r.text,()=>{DB.requests.push(r);
  return[`已通知 <b>${esc(person(to))}</b>，不需要回覆`,'對方右上角的通知匣會出現這一行，點一下就跳到這裡','沒有 24 小時計時，也不會進回覆追蹤']});
}
function rqAddOption(){if(!rqDecision)return;if(rqDecision.opts.length>=6)return toast('最多 6 個選項');rqDecision.opts.push('');const i=rqDecision.opts.length-1;runtime._afterRender=()=>root.querySelector('[data-rq-opt="'+i+'"]')?.focus();render()}
function rqOptionKey(e,i){if(e.key!=='Enter'||e.isComposing)return;e.preventDefault();const next=root.querySelector('[data-rq-opt="'+(i+1)+'"]');if(next)next.focus();else rqSendDecision()}
function rqCancelDecision(){rqDecision=null;render()}
function rqDecisionToAsk(){const d=rqDecision,b=d&&bOf(d.blockId);rqDecision=null;if(!b)return render();rqSend(b,d.to,'ask',[],d.via)}
function rqSendDecision(){
 const d=rqDecision,b=d&&bOf(d.blockId);if(!b){rqDecision=null;return render()}
 syncAll();
 const options=d.opts.map(s=>s.trim()).filter(Boolean);
 if(!b.text.trim())return toast('先寫下要決定的事');
 if(options.length<2)return toast('決策卡至少要兩個選項');
 if(new Set(options).size!==options.length)return toast('選項不能重複');
 rqDecision=null;rqSend(b,d.to,'decision',options,d.via);
}
function rqFlagToday(b){
 const current=b.today&&DB.todayIssues.find(t=>t.id===b.today);
 if(current&&!current.doneAt){render();return toast('這一行已經是今日議題')}
 const t={id:nid('TDY'),author:DB.me,day:S.jday,blockId:b.id,text:b.text.trim(),at:Date.now()};
 commit('create','今日議題',t.text,()=>{DB.todayIssues.push(t);b.today=t.id;return['加入今日議題','收工前會提醒處理']});
}

/* ---- 回覆、收到、追蹤、結案、延後 ---- */
function rqToggleReply(id){if(rqOpenReply.has(id))rqOpenReply.delete(id);else{rqOpenReply.add(id);runtime._afterRender=()=>root.querySelector('[data-rq-input="'+id+'"]')?.focus()}render()}
function rqReply(id,choice){
 const r=rqFind(id);if(!r)return;if(!rqInvolves(r))return deny();if(r.resolvedAt)return toast('這個請求已結案');
 const x=(rqDrafts.get(id)||'').trim();
 if(choice==null&&!x)return toast('請先輸入回覆');
 if(choice!=null&&(r.to!==DB.me||r.kind!=='decision'))return deny();
 const now=Date.now();
 r.replies.push({w:DB.me,x:choice==null?x:'',choice,at:now,ts:nowts()});
 if(choice!=null)r.choice=choice;
 if(r.to===DB.me){r.firstReplyAt??=now;r.seenAt??=now}
 rqDrafts.delete(id);rqOpenReply.delete(id);
 commit('update','請求回覆',rqText(r),()=>[choice!=null?`決定：<b>${esc(choice)}</b>，已標回原本那一行`:'回覆已掛在原本那一行下面',r.to===DB.me?'計時停止，紅色提醒解除':'對方會在同一串看到']);
}
function rqChoose(id,i){const r=rqFind(id);if(r)rqReply(id,r.options[i])}
function rqAck(id){
 const r=rqFind(id);if(!r||r.to!==DB.me)return deny();
 const now=Date.now();r.replies.push({w:DB.me,x:'收到，晚點處理',ack:true,at:now,ts:nowts()});r.firstReplyAt??=now;r.seenAt??=now;
 commit('update','請求回覆','收到：'+rqText(r),()=>['計時停止，紅色提醒解除','議題仍待解決']);
}
function rqNudge(id){
 const r=rqFind(id);if(!r||r.from!==DB.me)return deny();
 r.nudges.push({at:Date.now(),ts:nowts()});
 toast(`${rqState(r)==='late'?'已追蹤':'已輕推'} <b>${esc(person(r.to))}</b>：${esc(rqText(r))}`);render();
}
function rqResolve(id){
 const r=rqFind(id);if(!r||!rqInvolves(r))return deny();
 const now=Date.now();r.resolvedAt=now;if(r.to===DB.me)r.firstReplyAt??=now;rqOpenReply.delete(id);
 commit('update','請求結案',rqText(r),()=>['標記已解決，不再計時']);
}
function rqCompleteToday(id){
 const t=DB.todayIssues.find(x=>x.id===id);if(!t||t.author!==DB.me)return deny();
 commit('update','今日議題',t.text+' 完成',()=>{t.doneAt=Date.now();return['從收工檢查移除']});
}
function rqDeferToday(id){
 const t=DB.todayIssues.find(x=>x.id===id);if(!t||t.author!==DB.me)return deny();
 t.day=dadd(TODAY,1);t.deferred=(t.deferred||0)+1;toast('延到明天：'+esc(t.text));render();
}
function rqDefer(id){
 const r=rqFind(id);if(!r||r.to!==DB.me)return deny();if(r.deferReason)return toast('每個請求只能延後一次');
 const why=(rqDeferDrafts.get(id)||'').trim();if(!why)return toast('請寫下延後的理由');
 r.deferReason=why;r.deferredAt=Date.now();r.replies.push({w:DB.me,x:'延後：'+why,defer:true,at:r.deferredAt,ts:nowts()});
 rqDeferDrafts.delete(id);toast('已記錄延後理由；逾期紀錄保留，仍需回覆');render();rqOpenClose();
}
/* 兩顆按鈕、兩個去處，不要混在一起：
     「現在回覆」要落在能打字的地方 —— 收到的請求收在自己「今天」的日誌裡；
     「跳到那一行」與「↩ 來源」要落在問題被寫下來的那一天，不管那一行是誰寫的。
   原本兩者共用 `incoming` 一個判斷，於是只要請求還沒回，來源連結就永遠被拉回今天：
   按鈕上明明寫著「↩ Lily 9/24 · L1」，按下去卻停在今天，跨日之後等於整顆失效。 */
function rqJump(id,reply){
 const r=rqFind(id);if(!r)return;
 rqSeen(r);
 closeModal();if(space!=='team')switchSpace('team');
 saveJournalDraft();UNDO=[];REDO=[];
 const incoming=r.to===DB.me&&rqPending(r),toReply=!!reply&&incoming;
 if(reply&&r.to===DB.me&&!r.resolvedAt)rqOpenReply.add(r.id);
 const src=rqFindLine(r);
 // S.jday 一定是合法日期。沒解析出來就停在今天：寫進 DB.journal[''] 會產生一本存不回去的日誌。
 const day=toReply?TODAY:(src.day||TODAY);
 // 雙人駕駛艙：自己的日誌在左欄，對方的在右欄；兩邊同一天。
 journalAuthor=DB.me;S.jday=day;
 nav('journal',0);
 // nav() 在 render() 之後才把 #surface 捲回頂端，排在 _afterRender 之前定位會被它蓋掉。
 const el=toReply?root.querySelector('[data-rq-in="'+r.id+'"]')
  :r.from===DB.me?root.querySelector('#doc .eb[data-id="'+r.blockId+'"]')
  :root.querySelector('#jcPeer [data-jc-bid="'+r.blockId+'"]');
 if(el){el.scrollIntoView({block:'center'});el.classList.add('rq-flash')}
 if(reply)root.querySelector('[data-rq-input="'+r.id+'"]')?.focus();
 if(el||toReply)return;
 // 找不到的原因不只一種，講清楚是哪一種；否則「原本那一行已刪除」會蓋掉「沒記到日期」。
 toast(src.day?`已跳到 ${src.day}，但原本那一行已不在；請求仍保留在訊號頁`
  :'這個請求沒有記下是哪一天發出的，無法跳到那一天；完整清單在訊號頁');
}

/* ---- 共用：訊息串與動作列 ---- */
function rqMsgs(r){
 return r.replies.map(m=>`<div class="rq-msg">${rqAv(m.w)}<div><b>${esc(person(m.w))}</b> <span class="rq-meta">${m.ts}</span>${m.choice!=null?` <span class="rq-pill done">${svg('diamond',11)} ${esc(m.choice)}</span>`:''}${m.x?`<div class="rq-msg-x">${esc(m.x)}</div>`:''}</div></div>`).join('');
}
function rqReplyBox(r){
 if(!rqOpenReply.has(r.id))return '';
 return `<div class="rq-compose"><input data-rq-input="${r.id}" aria-label="回覆：${esc(rqText(r))}" placeholder="回覆 ${esc(person(r.to===DB.me?r.from:r.to))}…" value="${esc(rqDrafts.get(r.id)||'')}" oninput="rqDrafts.set('${r.id}',this.value)" onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();rqReply('${r.id}')}"><button class="btn sm pri" onclick="rqReply('${r.id}')">送出</button><button class="btn sm" onclick="rqToggleReply('${r.id}')">取消</button></div>`;
}
function rqOptions(r){
 if(r.kind!=='decision'||r.to!==DB.me||r.choice!=null||r.resolvedAt)return '';
 return `<div class="opts rq-opts">${r.options.map((o,i)=>`<button class="rq-optbtn" onclick="rqChoose('${r.id}',${i})">${esc(o)}</button>`).join('')}</div>`;
}
function rqActions(r,{incoming}={}){
 const st=rqState(r),late=st==='late';
 if(r.resolvedAt)return '';
 if(r.to===DB.me){
  if(r.kind==='decision'&&r.choice==null)return rqOptions(r)+`<div class="rq-acts">${r.firstReplyAt?'':`<button class="btn sm" onclick="rqAck('${r.id}')">收到，晚點處理${incoming?'（停止計時）':''}</button>`}</div>`;
  return `<div class="rq-acts"><button class="btn sm ${late&&!r.firstReplyAt?'red':''}" onclick="rqToggleReply('${r.id}')">回覆</button>${r.firstReplyAt?`<button class="btn sm" onclick="rqResolve('${r.id}')">${svg('check',12)} 標記已解決</button>`:`<button class="btn sm" onclick="rqAck('${r.id}')">收到，晚點處理${incoming?'（停止計時）':''}</button>`}</div>`;
 }
 if(r.from===DB.me){
  if(r.firstReplyAt)return `<div class="rq-acts"><button class="btn sm" onclick="rqToggleReply('${r.id}')">回覆…</button><button class="btn sm" onclick="rqResolve('${r.id}')">${svg('check',12)} 標記已解決</button></div>`;
  return `<div class="rq-acts"><button class="btn sm ${late?'red':''}" onclick="rqNudge('${r.id}')">${late?svg('dot',10)+' 追蹤回覆':svg('bell',12)+' 輕推'}</button><span class="rq-meta">${r.seenAt?'已讀':'未讀'}${r.nudges.length?` · 已提醒 ${r.nudges.length} 次`:''}</span><button class="btn sm" onclick="rqResolve('${r.id}')">${svg('check',12)} 標記已解決</button></div>`;
 }
 return '';
}

/* ---- ② 日誌：行內標籤、訊息串、決策卡、收到的請求、右欄 ---- */
function rqNoticesOn(b){return b&&b.id?DB.requests.filter(r=>r.kind==='notice'&&r.blockId===b.id):[]}
function rqLinePills(b){
 const r=b.req&&rqFind(b.req),t=b.today&&DB.todayIssues.find(x=>x.id===b.today),pills=[];
 for(const n of rqNoticesOn(b))pills.push(`<span class="rq-pill note">${svg('at',10)} 已通知 ${esc(person(n.to===DB.me?n.from:n.to))}${n.seenAt?' · 已讀':''}</span>`);
 if(t)pills.push(t.doneAt?'<span class="rq-pill done">'+svg('check',11)+' 今日議題</span>':t.author===DB.me?`<button class="rq-pill today" title="點一下標記完成" onclick="rqCompleteToday('${t.id}')">${svg('dot',9)} 今日議題</button>`:'<span class="rq-pill today">'+svg('dot',9)+' 今日議題</span>');
 if(r){
  if(r.kind==='decision')pills.push('<span class="rq-pill dec">'+svg('diamond',11)+' 決策</span>');
  else pills.push(`<span class="rq-pill ask">? 請 ${esc(person(r.to))} 回覆</span>`);
  if(r.firstReplyAt||r.resolvedAt)pills.push(`<span class="rq-pill done">${svg('check',11)} ${esc(r.firstReplyAt?rqReplyWord(r):'已解決')}</span>`);
  else pills.push(rqClock(r,r.from===DB.me&&r.seenAt?'已讀':''));
 }
 if(rqDecision?.blockId===b.id)pills.push(`<span class="rq-pill dec">${svg('diamond',11)} 決策卡 · 給 ${esc(person(rqDecision.to))}</span>`);
 return pills.join('');
}
function rqDecisionCard(){
 const d=rqDecision;
 return `<div class="rq-deccard"><div class="rq-dec-h"><span><span class="rq-pill dec">${svg('diamond',11)} 決策卡</span> 給 <b class="rq-pink">${esc(person(d.to))}</b></span><span class="rq-meta">24h 回覆</span></div>
  <div class="opts rq-opts">${d.opts.map((o,i)=>`<input class="rq-optin" data-rq-opt="${i}" aria-label="選項 ${i+1}" placeholder="選項 ${i+1}" value="${esc(o)}" oninput="rqDecision.opts[${i}]=this.value" onkeydown="rqOptionKey(event,${i})">`).join('')}<button class="rq-optbtn add" onclick="rqAddOption()">＋ 選項</button></div>
  <div class="rq-dec-f"><button class="btn sm" onclick="rqCancelDecision()">取消</button><button class="btn sm" onclick="rqDecisionToAsk()">改回一般回覆</button><button class="btn sm pri" onclick="rqSendDecision()">送出</button></div></div>`;
}
const rqBaseEb=ebHtml;
ebHtml=function(b){
 const html=rqBaseEb(b);
 if(space!=='team'||!TEXTY(b.t)||(!b.req&&!b.today&&rqDecision?.blockId!==b.id&&!rqNoticesOn(b).length))return html;
 const r=b.req&&rqFind(b.req),t=b.today&&DB.todayIssues.find(x=>x.id===b.today);
 const st=r&&!r.resolvedAt?(r.firstReplyAt?'replied':rqState(r)==='late'?'late':'ask'):t&&!t.doneAt?'today':rqDecision?.blockId===b.id?'ask':'';
 const end=html.lastIndexOf('</div>');
 let out=html.slice(0,end)+`<span class="rq-pills" contenteditable="false">${rqLinePills(b)}</span>`+html.slice(end);
 if(st)out=out.replace('class="eb ','class="eb rq-line rq-'+st+' ');
 const indent=`margin-left:${Math.min(5,b.ind||0)*24+28}px`;
 if(rqDecision?.blockId===b.id)out+=`<div class="rq-wrap" contenteditable="false" style="${indent}">${rqDecisionCard()}</div>`;
 // 發問方在快到期前只看標籤；有回覆、快到期或逾期時才展開追蹤列。
 const show=r&&(r.replies.length||rqOpenReply.has(r.id)||r.to===DB.me&&!r.resolvedAt||r.from===DB.me&&rqPending(r)&&rqState(r)!=='open');
 if(show)out+=`<div class="rq-wrap" contenteditable="false" style="${indent}"><div class="rq-thread ${rqState(r)}">${rqMsgs(r)}${rqReplyBox(r)}${rqActions(r)}</div></div>`;
 return out;
};
function rqIncomingHtml(){
 if(space!=='team'||journalAuthor!==DB.me||S.jday!==TODAY)return '';
 return rqToMe().map(r=>{
  const late=rqState(r)==='late';
  return `<div class="rq-in ${late?'late':'ask'}" data-rq-in="${r.id}" contenteditable="false"><div class="rq-in-line"><span class="rq-in-ic">${svg('arrowin',12)}</span>${rqAv(r.from)}<span class="rq-in-t">${esc(person(r.from))} 問：${esc(rqText(r))}</span>${r.kind==='decision'?'<span class="rq-pill dec">'+svg('diamond',11)+' 決策</span>':''}${rqClock(r,'需要你回覆')}<button class="rq-src" onclick="rqJump('${r.id}')">${esc(rqSource(r))}</button></div>
   <div class="rq-thread ${late?'late':rqState(r)}">${rqMsgs(r)}${rqReplyBox(r)}${rqActions(r,{incoming:true})}</div></div>`;
 }).join('');
}
function rqSideCard(r){
 const late=rqState(r)==='late',mine=r.to===DB.me;
 const who=mine?`${rqAv(r.from)} ${esc(person(r.from))} → 你`:`你 → ${rqAv(r.to)} ${esc(person(r.to))}`;
 const act=mine?`<button class="btn sm ${late?'red':''}" onclick="rqJump('${r.id}',true)">回覆</button>`:`<span class="rq-meta">${r.seenAt?'已讀':'未讀'}</span><button class="btn sm ${late?'red':''}" onclick="rqNudge('${r.id}')">${late?svg('dot',10)+' 追蹤':svg('bell',12)+' 輕推'}</button>`;
 return `<div class="rq-card ${late?'late':rqState(r)}"><div class="rq-card-m">${who}</div><div class="rq-card-t">${esc(rqText(r))}</div><div class="rq-card-m">${rqClock(r)}${act}</div></div>`;
}
function rqSidePanel(){return panel('回覆追蹤','24 小時內回覆',rqSideBody())}
function rqSideBody(){
 const late=rqLate(),wait=rqFromMe().filter(r=>rqState(r)!=='late'),mine=rqToMe().filter(r=>rqState(r)!=='late'),today=rqTodayOpen(),agendas=agOpenToday();
 const peers=[...new Set(wait.map(r=>person(r.to)))].join('、')||'對方';
 const sec=(title,cls,n,body)=>`<div class="rq-side-sec"><div class="rq-side-t ${cls}"><span>${title}</span><span>${n}</span></div>${body}</div>`;
 const body=(late.length?sec(svg('warn',12)+' 逾期','late',late.length,late.map(rqSideCard).join('')):'')
  +(mine.length?sec('? 待我回覆','ask',mine.length,mine.map(rqSideCard).join('')):'')
  +sec(`等 ${esc(peers)} 回覆`,'',wait.length,wait.map(rqSideCard).join('')||'<div class="rq-empty">行尾打 ?@人名 請對方回覆；單純 @人名 只是通知</div>')
  // 兩層一起列：議題物件（L2）排前面，輕量標記（L1）排後面，見 agenda-object.source.js。
  +sec('今日議題','today',today.length+agendas.length,agTodayBody(today,agendas))
  +`<button class="rq-more" onclick="nav('signal',0)">完整清單在訊號頁 ${svg('goto',11)}</button>`;
 return `<div class="rq-side">${body}</div>`;
}
const rqBaseJournal=VIEWS.journal;
VIEWS.journal=function(tab){
 let html=rqBaseJournal(tab);
 if(tab!==0||space!=='team')return html;
 // 收到的請求放在正文最後、仍在同一個 #doc 內；不是 .eb，所以不會進入區塊排序與復原。
 const incoming=rqIncomingHtml(),docEnd=incoming?rqDocEnd(html):-1;
 if(docEnd>0)html=html.slice(0,docEnd)+incoming+html.slice(docEnd);
 return html.replace('<div class="g" style="align-content:start">','<div class="g" style="align-content:start">'+rqSidePanel());
};
// 找到 #doc 的結束位置（計算 div 深度，不依賴空白格式）。
function rqDocEnd(html){
 const start=html.indexOf('id="doc"');if(start<0)return -1;
 let i=html.indexOf('>',start)+1,depth=1;
 const re=/<\/?div\b[^>]*>/g;re.lastIndex=i;let m;
 while((m=re.exec(html))){if(m[0][1]==='/'){depth--;if(depth===0)return m.index}else if(!m[0].endsWith('/>'))depth++}
 return -1;
}

/* ---- ① 全域紅色橫幅＋側欄 ---- */
function rqAlarmHtml(){
 const late=rqLate();if(!late.length)return '';
 const mine=late.filter(r=>r.to===DB.me),theirs=late.filter(r=>r.from===DB.me);
 const peers=[...new Set(theirs.map(r=>person(r.to)))].join('、');
 let text,acts;
 if(S.wb==='signal'){
  text=`${late.length} 件請求已逾期：${[mine.length?`${mine.length} 件要你回覆`:'',theirs.length?`${theirs.length} 件要追蹤 ${peers}`:''].filter(Boolean).join('，')}`;
  acts=`<button class="btn" onclick="rqScrollLate()">全部處理</button>`;
 }else{
  const f=mine[0]||theirs[0],h=Math.floor(rqAge(f));
  text=f.to===DB.me?`${late.length} 件請求已逾期：${person(f.from)} 問「${rqText(f)}」你已經超過 ${h} 小時沒回`
   :`${late.length} 件請求已逾期：你問 ${person(f.to)}「${rqText(f)}」已經超過 ${h} 小時沒有回覆，要追蹤回覆`;
  acts=`<button class="btn" onclick="rqJump('${f.id}')">跳到那一行</button>${f.to===DB.me?`<button class="btn" onclick="rqJump('${f.id}',true)">現在回覆</button>`:`<button class="btn" onclick="rqNudge('${f.id}')">追蹤回覆</button>`}${late.length>1?`<button class="btn" onclick="nav('signal',0)">全部處理</button>`:''}`;
 }
 return `<div class="rq-alarm" role="alert"><span class="rq-alarm-ic">${svg('warn',16)}</span><span class="rq-alarm-t">${esc(text)}</span><span class="rq-alarm-a">${acts}</span></div>`;
}
function rqScrollLate(){const z=root.querySelector('#rqLate');if(z)z.scrollIntoView({block:'start'});else nav('signal',0)}
let rqAlarmEl=null;
const rqBaseEnhance=enhanceView;
enhanceView=function(){
 rqBaseEnhance();
 if(space==='team'&&S.tab===0){
  // 通知（kind:'notice'）不在這裡自動標已讀：它的去處是右上角的通知匣，
  // 在這裡清掉的話，走過一次那天的日誌就等於整匣被讀完了。
  if(S.wb==='journal')DB.requests.forEach(r=>{if(r.to===DB.me&&r.kind!=='notice'&&(r.from===journalAuthor&&r.day===S.jday||journalAuthor===DB.me&&S.jday===TODAY))rqSeen(r)});
  if(S.wb==='signal')rqToMe().forEach(rqSeen);
 }
 if(!rqAlarmEl||!rqAlarmEl.isConnected){rqAlarmEl=doc.createElement('div');rqAlarmEl.id='rqAlarm';$('.main').prepend(rqAlarmEl)}
 rqAlarmEl.innerHTML=rqAlarmHtml();
 const late=rqLate().length,count=late+rqToMe().filter(r=>rqState(r)!=='late').length+rqFromMe().filter(r=>rqState(r)!=='late').length;
 const rail=[...root.querySelectorAll('#rail .rail-i')].find(e=>e.querySelector('em')?.textContent==='訊號');
 if(rail&&count){rail.classList.toggle('rq-late',!!late);rail.querySelector('.bdg')?.remove();rail.insertAdjacentHTML('beforeend',`<i class="bdg ${late?'rq-bdg':''}" title="${late} 件逾期，${count} 件回覆追蹤">${count}</i>`)}
};

/* ---- ③ 訊號頁 ---- */
function rqBoardCard(r){
 const st=rqState(r),mine=r.to===DB.me;
 const who=mine?`${rqAv(r.from)} ${esc(person(r.from))} → 你`:`你 → ${rqAv(r.to)} ${esc(person(r.to))}`;
 return `<div class="rq-card ${st}"><div class="rq-card-m">${who}${r.kind==='decision'?'<span class="rq-pill dec">'+svg('diamond',11)+' 決策</span>':''}${rqClock(r)}</div>
  <div class="rq-card-t">${esc(rqText(r))}</div>${rqMsgs(r)}${rqReplyBox(r)}${rqActions(r)}
  <button class="rq-src" onclick="rqJump('${r.id}')">${esc(rqSource(r))}</button></div>`;
}
function rqDoneCard(r){
 const spent=rqDur((r.firstReplyAt-r.sentAt)/HOUR);
 const who=r.to===DB.me?`${person(r.to)}回覆`:rqReplyWord(r);
 return `<div class="rq-card done"><div class="rq-card-t rq-strike">${esc(rqText(r))}</div><div class="rq-card-m">${r.kind==='decision'?'<span class="rq-pill dec">'+svg('diamond',11)+'</span>':''}${esc(r.to===DB.me&&r.choice!=null?rqReplyWord(r):who)} · 花了 ${spent}${r.resolvedAt?' · 已解決':''}</div>${r.resolvedAt?'':`<div class="rq-acts"><button class="btn sm" onclick="rqResolve('${r.id}')">${svg('check',12)} 標記已解決</button><button class="rq-src" onclick="rqJump('${r.id}')">${esc(rqSource(r))}</button></div>`}</div>`;
}
function rqCol(title,cls,list,card,empty){
 return `<div class="rq-col"><div class="rq-col-h ${cls}"><span>${title}</span><span class="rq-meta">${list.length}</span></div>${list.map(card).join('')||`<div class="rq-empty">${empty}</div>`}</div>`;
}
function rqNowLabel(){const d=new Date();return '今天 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function rqBoard(){
 const late=rqLate(),notLate=r=>rqState(r)!=='late',closed=DB.dayClose[DB.me]?.[TODAY];
 const mine=rqToMe().filter(notLate),wait=rqFromMe().filter(notLate),done=rqRepliedToday();
 const zone=late.length
  ?`<section class="rq-zone late" id="rqLate"><h4>${svg('warn',14)} 逾期 ${late.length} 件，超過 24 小時沒有回覆</h4><div class="rq-grid">${late.map(rqBoardCard).join('')}</div></section>`
  :'<section class="rq-zone clear" id="rqLate"><h4>'+svg('check',14)+' 沒有逾期的請求</h4></section>';
 const eod=closed&&!late.length?`<div class="rq-eod"><span>${svg('moon',12)} 已於 ${closed} 收工</span><button class="btn sm" onclick="rqOpenClose()">再檢查一次</button></div>`
  :late.length?`<div class="rq-eod block"><b>${svg('lock',12)} 還不能收工</b><span>必須先處理 ${late.length} 件逾期項目（回覆、追蹤，或寫下延後理由）</span><button class="btn red" onclick="rqOpenClose()">處理逾期 ${svg('goto',11)}</button></div>`
  :`<div class="rq-eod"><span>還有 ${mine.length} 件待我回覆，都還在 24 小時內${rqTodayOpen().length?` · 今日議題 ${rqTodayOpen().length} 件`:''}</span><button class="btn pri" onclick="rqOpenClose()">${svg('moon',12)} 我收工了</button></div>`;
 return `<div class="rq-board-wrap"><div class="rq-head"><b>回覆追蹤</b><span class="rq-clock">${svg('clock',12)} ${rqNowLabel()}</span><span class="rq-meta">下班前還要回覆的所有事</span></div>${zone}
  <div class="rq-cols">${rqCol('? 待我回覆','ask',mine,rqBoardCard,'沒有了')}${rqCol(svg('clock',12)+' 等對方回覆','wait',wait,rqBoardCard,'沒有了')}${rqCol(svg('check',12)+' 今天已回覆','done',done,rqDoneCard,'今天還沒有回覆')}</div>${eod}</div>`;
}
const rqBaseSignal=VIEWS.signal;
VIEWS.signal=tab=>{const out=rqBaseSignal(tab);return tab===0&&space==='team'?rqBoard()+'<div style="height:14px"></div>'+out:out};

/* ---- 收工檢查 ---- */
function rqNudgedAfterLate(r){return r.nudges.some(n=>n.at>=r.sentAt+REPLY_HOURS*HOUR)}
function rqBlockers(){return rqLate().filter(r=>r.to===DB.me?!r.deferReason:!rqNudgedAfterLate(r))}
function rqOpenClose(){
 const late=rqLate(),today=rqTodayOpen(),agendas=agOpenToday(),blockers=rqBlockers();
 const lateRows=late.map(r=>{const mine=r.to===DB.me;return `<div class="rq-row"><span class="rq-pill late">${mine?'待我':'等 '+esc(person(r.to))}</span><span class="rq-row-t">${esc(rqText(r))}</span>
  ${mine?`<button class="btn sm red" onclick="rqJump('${r.id}',true)">現在回</button>${r.deferReason?`<span class="rq-meta">已延後：${esc(r.deferReason)}</span>`:`<input data-rq-defer="${r.id}" aria-label="延後理由" placeholder="延後理由（只能一次）" value="${esc(rqDeferDrafts.get(r.id)||'')}" oninput="rqDeferDrafts.set('${r.id}',this.value)"><button class="btn sm" onclick="rqDefer('${r.id}')">延後</button>`}`
   :rqNudgedAfterLate(r)?'<span class="rq-meta">'+svg('check',11)+' 已追蹤</span>':`<button class="btn sm red" onclick="rqNudge('${r.id}');rqOpenClose()">${svg('bell',12)} 提醒他</button>`}</div>`}).join('');
 const todayRows=agCloseRows()+today.map(t=>`<div class="rq-row"><span class="rq-pill today">今日</span><span class="rq-row-t">${esc(rqTodayText(t))}</span><button class="btn sm" onclick="rqCompleteToday('${t.id}');rqOpenClose()">${svg('check',12)} 完成</button><button class="btn sm pri" onclick="rqDeferToday('${t.id}');rqOpenClose()">${svg('goto',11)} 明天</button></div>`).join('');
 const moved=today[0];
 openModal(late.length||today.length||agendas.length?`收工前，還有 ${late.length+today.length+agendas.length} 件事沒結束`:'收工檢查',
  blockers.length?'逾期項目必須先回覆、追蹤，或寫下延後理由才能收工；今日議題沒動的會自動延到明天。':'逐項決定怎麼處理，沒動的今日議題會自動延到明天。',
  `<div class="rq-close">${lateRows}${todayRows}${!lateRows&&!todayRows?'<div class="rq-empty">都處理完了</div>':''}${moved?`<div class="rq-carry">明天 ${rqShortDay(dadd(TODAY,1))} 日誌的開頭會出現：<br><span class="rq-pill today">${svg('refresh',11)} 從昨天帶來 · ${esc(moved.text)}</span></div>`:''}</div>`,
  `<button class="btn" onclick="closeModal()">返回</button><button class="btn ${blockers.length?'':'pri'}" ${blockers.length?'disabled title="先處理逾期項目"':''} onclick="rqConfirmClose()">確認收工</button>`);
}
function rqConfirmClose(){
 if(rqBlockers().length)return rqOpenClose();
 const moved=rqTodayOpen();
 closeModal();
 commit('update','收工',person(DB.me)+' '+TODAY,()=>{moved.forEach(t=>{t.day=dadd(TODAY,1);t.deferred=(t.deferred||0)+1});
  // 議題物件也一起帶到明天，但改到期日之前先把今天記進 carried，原本是哪天提出的才留得下來。
  const movedAg=agCarryAllOpen();(DB.dayClose[DB.me]??={})[TODAY]=nowts().slice(0,5);
  return[moved.length?`${moved.length} 件今日議題延到明天`:'今日議題已清空',movedAg?`${movedAg} 件議題物件延到明天，並記下帶過次數`:'議題物件都已處理',`待我回覆 ${rqToMe().length} 件`]});
}
// 隔天日誌開頭顯示從昨天帶來的今日議題。
const rqCarryJournal=VIEWS.journal;
VIEWS.journal=function(tab){
 const html=rqCarryJournal(tab);
 if(tab!==0||space!=='team'||journalAuthor!==DB.me)return html;
 const carried=DB.todayIssues.filter(t=>t.author===DB.me&&t.deferred&&!t.doneAt&&t.day===S.jday);
 if(!carried.length)return html;
 const bar=`<div class="rq-carrybar" contenteditable="false">${carried.map(t=>`<button class="rq-pill today" onclick="rqCompleteToday('${t.id}')" title="點一下標記完成">${svg('refresh',11)} 從昨天帶來 · ${esc(t.text)}</button>`).join('')}</div>`;
 const at=html.indexOf('<div class="doc" id="doc"');
 return at<0?html:html.slice(0,at)+bar+html.slice(at);
};
const rqBaseCmdk=buildCmdk;
buildCmdk=()=>{const items=rqBaseCmdk();if(space!=='team')return items;return [...items,{g:'訊號',t:'回覆追蹤',s:'逾期、待我回覆、等對方回覆',h:'逾期、待我回覆、等對方回覆',ic:'goto',run:()=>nav('signal',0)},{g:'訊號',t:'我收工了',s:'收工檢查',h:'收工檢查',ic:'goto',run:rqOpenClose}]};

/* ---- ① 提醒節奏：16h 提醒回覆方；逾期後每 4h 提醒雙方。每分鐘重新判定。 ---- */
function rqPing(){
 const now=Date.now();
 for(const r of DB.requests){
  if(!rqPending(r)||!rqInvolves(r))continue;
  const h=rqAge(r,now);r.pinged??={};
  if(h>=WARN_HOURS&&h<REPLY_HOURS&&r.to===DB.me&&!r.pinged.warn){r.pinged.warn=true;toast(`${svg('clock',12)} 還有 ${rqLeft(r)} 要回覆 ${esc(person(r.from))}：${esc(rqText(r))}`)}
  if(h>=REPLY_HOURS){const slot=Math.floor((h-REPLY_HOURS)/REPING_HOURS),key='late:'+DB.me;
   if(r.pinged[key]!==slot){r.pinged[key]=slot;toast(r.to===DB.me?`${svg('warn',12)} 已逾期 ${rqOver(r)}：${esc(person(r.from))} 問「${esc(rqText(r))}」`:`${svg('warn',12)} ${esc(person(r.to))} 已逾期 ${rqOver(r)} 沒回：${esc(rqText(r))}`)}}
 }
}
function rqSignature(){return DB.me+'|'+DB.requests.map(r=>r.id+':'+rqState(r)+':'+Math.floor(rqAge(r))).join('|')}
let rqSig='';
function rqTick(){
 if(!active)return;
 rqPing();
 const next=rqSignature();
 if(next!==rqSig){const focus=shadow.activeElement;const busy=focus&&(focus.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName));
  if(!busy&&!$('#modalWrap.on')&&!S.stack.length){rqSig=next;render()}}
 setTimeout(rqTick,60e3);
}
rqSig=rqSignature();setTimeout(rqTick,1500);
