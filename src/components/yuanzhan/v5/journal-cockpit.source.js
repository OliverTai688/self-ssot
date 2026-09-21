/* ── 日誌「今天」：提案 C 雙人駕駛艙（journal-ui-proposals.html · C）──────────────
   · 標題列一行：日誌 ‹ 日期 › 📅 [今天｜回顧｜標籤流] …… 「我開始一天了」時間
   · 左欄＝自己（編輯中，唯一可寫的 #doc），右欄＝對方（唯讀，點任一行即可留言）
   · 行內留言掛在該行下方；整頁留言縮成駕駛艙底部一行輸入框
   · 右側駕駛艙：今日統計、回覆追蹤、今天誕生的物件（標出來源行）、今日脈絡
   只作用在圓展空間的「今天」分頁；個人空間與回顧／標籤流沿用原本畫面。
   ───────────────────────────────────────────────────────────────────────── */
DB.lineComments=[];
DB.dayStart={};
DB.dayLog={};
DB.journalEdits={};
let jcRendering=false, jcLineOpen='', jcFocus='';
const jcDrafts=new Map();
const JC_TYPES={issue:['工作','c-p'],txn:['金流','c-w'],project:['專案','c-i'],decision:['決策','c-o'],event:['事件','c-t']};
function jcNow(){return nowts().slice(0,5)}
function jcLog(text,w=DB.me,day=S.jday){(DB.dayLog[day]??=[]).push({t:jcNow(),w,text})}
function jcStart(who=DB.me,day=S.jday){const m=(DB.dayStart[who]??={});if(!m[day]){m[day]=jcNow();jcLog(jcShort(who)+' 開始一天',who,day)}}
if(initialState.mode==='showcase'){
 DB.dayStart={yz:{[TODAY]:'09:12'},lily:{[TODAY]:'09:40'}};
 DB.dayLog={[TODAY]:[{t:'09:12',w:'yz',text:'宇星 開始一天'},{t:'09:40',w:'lily',text:'Lily 開始一天'},{t:'10:05',w:'yz',text:'召喚「工作」'},{t:'10:20',w:'lily',text:'Lily 留言'}]};
 DB.journalEdits={lily:{[TODAY]:Date.now()-3*60e3},yz:{[TODAY]:Date.now()}};
 const first=journals.team.yz[TODAY]?.blocks.find(b=>TEXTY(b.t)&&b.text.trim()&&b.t!=='h2'&&b.t!=='h3');
 if(first)DB.lineComments.push({id:'LC-DEMO-1',author:'yz',day:TODAY,blockId:first.id,w:'lily',x:'這個我有相關資料，我來整理？',ts:'10:20'});
}
function jcPeer(){return Object.keys(DB.people).find(w=>w!==DB.me)}
function jcDoc(who,day=S.jday){return journals.team[who]?.[day]||null}
function jcWeek(d){return '週'+'日一二三四五六'[new Date(d+'T00:00:00Z').getUTCDay()]}
function jcAgo(ms){if(!ms)return '尚未更新';const m=Math.round((Date.now()-ms)/60e3);return m<1?'剛剛':m<60?m+' 分鐘前':Math.floor(m/60)+' 小時前'}
function jcShort(w){const n=person(w);return /[\u4e00-\u9fff]/.test(n)&&n.length>2?n.slice(-2):n}
function jcKFmt(n){n=Math.abs(n);return !n?'—':n>=1000?(Math.round(n/100)/10).toString().replace(/\.0$/,'')+'k':String(n)}

/* ---- 行內留言 ---- */
function jcLineKey(author,id){return author+':'+id}
function jcComments(author,id){return DB.lineComments.filter(c=>c.author===author&&c.blockId===id&&c.day===S.jday)}
function jcOpenLine(author,id){const k=jcLineKey(author,id);jcLineOpen=jcLineOpen===k?'':k;if(jcLineOpen)runtime._afterRender=()=>root.querySelector('[data-jc-input="'+k+'"]')?.focus();render()}
function jcSendLine(author,id){
 const k=jcLineKey(author,id),x=(jcDrafts.get(k)||'').trim();if(!x)return toast('請先輸入留言');
 const allBlocks=jcDoc(author)?.blocks||(author===DB.me?jdoc()?.blocks:[]);
 const b=allBlocks?.find(b=>b.id===id);
 jcDrafts.delete(k);jcLineOpen='';
 commit('create','行內留言',(b?.text||'').slice(0,24),()=>{DB.lineComments.push({id:nid('LC'),author,day:S.jday,blockId:id,w:DB.me,x,ts:jcNow()});return['留言掛在 '+person(author)+' 的這一行下方']});
 render();
}
function jcDeleteLine(cid){const c=DB.lineComments.find(c=>c.id===cid);if(!c||c.w!==DB.me)return deny();DB.lineComments=DB.lineComments.filter(x=>x!==c);render()}
function jcLineHtml(author,b){
 const k=jcLineKey(author,b.id),list=jcComments(author,b.id),open=jcLineOpen===k;
 if(!list.length&&!open)return '';
 const pad=`margin-left:${Math.min(5,b.ind||0)*24+28}px`;
 return `<div class="jc-lcs" contenteditable="false" style="${pad}">${list.map(c=>`
  <div class="jc-lc ${DB.people[c.w]?.cls||''}">
   <span class="av rq-av xs ${DB.people[c.w]?.cls||''}">${DB.people[c.w]?.s||c.w}</span>
   <div class="jc-lc-content">
    <div class="jc-lc-top"><b class="jc-lc-author">${esc(person(c.w))}</b><span class="jc-lc-m">${c.ts}</span>
     <span class="jc-lc-actions"><button class="jc-link" onclick="event.stopPropagation();jcOpenLine('${author}','${b.id}')">回覆</button>${c.w===DB.me?`<button class="jc-link dgr" onclick="event.stopPropagation();jcDeleteLine('${c.id}')">刪除</button>`:''}</span>
    </div>
    <div class="jc-lc-text">${esc(c.x)}</div>
   </div>
  </div>`).join('')}
  ${open?`<div class="jc-lc-in"><span class="av rq-av xs ${DB.people[DB.me]?.cls||''}">${DB.people[DB.me]?.s||'我'}</span><input data-jc-input="${k}" aria-label="行內留言" placeholder="回覆對話串… (Enter 送出, Esc 取消)" value="${esc(jcDrafts.get(k)||'')}" oninput="jcDrafts.set('${k}',this.value)" onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();jcSendLine('${author}','${b.id}')}if(event.key==='Escape'){event.preventDefault();jcOpenLine('${author}','${b.id}')}"><button class="btn sm pri" onclick="event.stopPropagation();jcSendLine('${author}','${b.id}')">送出</button><button class="btn sm" onclick="event.stopPropagation();jcOpenLine('${author}','${b.id}')">取消</button></div>`:(list.length?`<div class="jc-lc-reply-bar"><button class="jc-link" onclick="event.stopPropagation();jcOpenLine('${author}','${b.id}')">${svg('message',11)} 回覆此行對話串</button></div>`:'')}</div>`;
}
const jcBaseEb=ebHtml;
ebHtml=function(b){const html=jcBaseEb(b);return jcRendering&&TEXTY(b.t)?html+jcLineHtml(DB.me,b):html};

/* ---- 對方欄（唯讀） ---- */
function jcPeerBlock(author,b){
 const ind=`ind${Math.min(5,b.ind||0)}`;
 if(b.t==='divider')return `<div class="eb ${ind}"><div class="eb-div"></div></div>`;
 if(b.t==='obj')return `<div class="eb ${ind} jc-ro" data-t="obj" data-jc-bid="${b.id}">${objHtml(b)}</div>`;
 if(!b.text.trim())return '';
 const bul=(b.t==='bullet'||(b.t==='p'&&b.ind>0))?'<span class="eb-bul">•</span>':'';
 const ck=b.t==='todo'?`<span class="eb-ck ${b.done?'on':''}">${svg('check')}</span>`:'';
 const r=b.req&&rqFind(b.req),st=r&&!r.resolvedAt?(r.firstReplyAt?'replied':rqState(r)==='late'?'late':'ask'):b.today?'today':'';
 const pills=b.req||b.today?`<span class="rq-pills">${rqLinePills(b)}</span>`:'';
 return `<div class="eb ${ind} jc-ro ${st?'rq-line rq-'+st:''}" data-t="${b.t}" data-jc-bid="${b.id}" title="點一下留言" onclick="jcOpenLine('${author}','${b.id}')">${bul}${ck}<div class="eb-tx ${b.t==='todo'&&b.done?'done':''}">${esc(b.text)}</div>${pills}</div>${jcLineHtml(author,b)}`;
}
function jcPeerColumn(peer){
 const d=jcDoc(peer),blocks=(d?.blocks||[]).map(b=>jcPeerBlock(peer,b)).join('');
 return `<section class="jc-col" id="jcPeer" data-author="${peer}">
  <div class="jc-col-h">${rqAv(peer,'md')}<b>${esc(jcShort(peer))}</b><span class="jc-col-m">· 唯讀 · ${jcAgo(DB.journalEdits[peer]?.[S.jday])}</span><span class="sp"></span></div>
  <div class="jc-col-b"><div class="doc jc-doc">${blocks}</div>
  <div class="jc-hint">${blocks?`${esc(person(peer))} 今天還在寫…<br>選取任一行或右鍵選單可展開對話串留言`:`${esc(person(peer))} 今天還沒開始寫<br>寫了之後會即時出現在這裡`}</div></div></section>`;
}
function jcFocusPage(){const el=root.querySelector('#journalReply');if(el){el.focus();el.scrollIntoView({block:'nearest'})}}

/* ---- 自己的欄（可編輯） ---- */
function jcMyColumn(){
 const d=jdoc();
 jcRendering=true;
 let blocks;try{blocks=d.blocks.map(ebHtml).join('')}finally{jcRendering=false}
 const carried=DB.todayIssues.filter(t=>t.author===DB.me&&t.deferred&&!t.doneAt&&t.day===S.jday);
 const carry=carried.length?`<div class="rq-carrybar">${carried.map(t=>`<button class="rq-pill today" onclick="rqCompleteToday('${t.id}')" title="點一下標記完成">${svg('rotate', 11)} 從昨天帶來 · ${esc(t.text)}</button>`).join('')}</div>`:'';
 return `<section class="jc-col" id="jcMine" data-author="${DB.me}">
  <div class="jc-col-h doc-bar">${rqAv(DB.me,'md')}<b>${esc(jcShort(DB.me))}</b><span class="jc-col-m">· 你 · 編輯中</span><span class="sp"></span>
   <button class="btn sm" aria-label="召喚" title="# 召喚 component" onclick="insertAt('#')">${svg('hash', 13)} 召喚</button><button class="btn sm" aria-label="引用" title="@ 引用既有物件" onclick="insertAt('@')">${svg('at', 13)} 引用</button></div>
  <div class="jc-col-b">${carry}<div class="doc" id="doc" onclick="docClick(event)" onkeydown="docKey(event)" oninput="docInput(event)" oncompositionstart="docComposeStart()" oncompositionend="docComposeEnd(event)">${blocks}${rqIncomingHtml()}</div></div></section>`;
}

/* ---- 右側駕駛艙 ---- */
function jcObjects(){
 const out=[];
 for(const who of Object.keys(DB.people)){const d=jcDoc(who);(d?.blocks||[]).forEach((b,i)=>{if(b.t==='obj'&&b.obj)out.push({who,line:i+1,o:b.obj})})}
 return out;
}
function jcObjName(o){if(o.ty==='doc_object'){const d=(DB.docObjects||[]).find(x=>x.id===o.rid);return d?docObjectName(d):'已刪除'}const x=o.ty==='issue'?ISS(o.rid):o.ty==='txn'?TX(o.rid):o.ty==='project'?P(o.rid):o.ty==='decision'?DB.decisions.find(y=>y.id===o.rid):EVT(o.rid);return x?.t||'已刪除'}
function jcStats(objs){
 let done=0,total=0,money=0;
 for(const who of Object.keys(DB.people))(jcDoc(who)?.blocks||[]).forEach(b=>{if(b.t==='todo'&&b.text.trim()){total++;if(b.done)done++}});
 objs.forEach(({o})=>{if(o.ty==='issue'){const i=ISS(o.rid);if(i){total++;if(i.st==='Done')done++}}if(o.ty==='txn'){const t=TX(o.rid);if(t&&canSeeTxn(t))money+=Math.abs(t.amt)}});
 return `<div class="jc-stats"><div><b>${objs.length}</b><span>今日物件</span></div><div><b class="ok">${total?done+'/'+total:'—'}</b><span>承諾完成</span></div><div><b class="gold">${jcKFmt(money)}</b><span>金流</span></div></div>`;
}
function jcTimeline(){
 const list=(DB.dayLog[S.jday]||[]).slice().sort((a,b)=>a.t.localeCompare(b.t)).slice(-12);
 return list.length?`<div class="jc-tl">${list.map(e=>`<div class="${e.w}"><span class="jc-tl-t">${e.t}</span> ${esc(e.text)}</div>`).join('')}</div>`:'<div class="rq-empty">今天還沒有動靜</div>';
}
function jcPageKey(){return 'team:page:'+S.jday}
function jcPageComments(){
 const list=DB.journalComments.filter(c=>c.parent===jcPageKey());
 return list.map(c=>`<div class="jc-pc"><span class="av rq-av xs ${DB.people[c.w].cls}">${DB.people[c.w].s}</span><div><b>${esc(person(c.w))}</b> <span class="rq-meta">${c.ts}</span><div class="jc-pc-x">${esc(c.x)}</div></div>${c.w===DB.me?`<button class="jc-link" onclick="deleteJournalComment('${c.id}')">刪除</button>`:''}</div>`).join('');
}
function jcSendPage(){
 const el=root.querySelector('#journalReply'),x=(el?.value||'').trim();if(!x)return toast('請先輸入留言');
 textDrafts.delete(jcPageKey());
 commit('create','日誌留言',x.slice(0,24),()=>{DB.journalComments.push({id:nid('JC'),parent:jcPageKey(),w:DB.me,ts:nowts(),x});return['整頁留言，雙方都看得到']});
}
function jcCockpit(){
 const objs=jcObjects();
 const objRows=objs.map(({who,line,o})=>{const [nm,cls]=JC_TYPES[o.ty]||[o.ty,'c-n'];return `<button class="jc-obj" onclick="objJump('${o.ty}','${o.rid}')"><span class="chip ${cls}">${nm}</span><span class="jc-obj-t">${esc(jcObjName(o))}</span><span class="jc-obj-s">${esc(jcShort(who))} L${line}</span></button>`}).join('');
 return `<aside class="jc-side">
  <div class="jc-side-b">${jcStats(objs)}
   <div class="jc-sec"><div class="jc-sec-t">回覆追蹤</div>${rqSideBody()}</div>
   <div class="jc-sec"><div class="jc-sec-t">今天誕生的物件</div>${objRows||'<div class="rq-empty">在日誌打 # 召喚物件</div>'}</div>
   <div class="jc-sec"><div class="jc-sec-t">今日脈絡</div>${jcTimeline()}</div>
   ${S.jday===TODAY?'':'<div class="rq-empty">回覆追蹤與今日議題依今天計算</div>'}
  </div>
 </aside>`;
}

/* ---- 組合 ---- */
const jcBaseJournal=VIEWS.journal;
VIEWS.journal=function(tab){
 if(tab!==0||space!=='team')return jcBaseJournal(tab);
 if(journalAuthor!==DB.me){saveJournalDraft();journalAuthor=DB.me}
 const peer=jcPeer();
 return guide('<b>雙人駕駛艙。</b>左邊是你（可編輯），右邊是對方（唯讀、點任一行留言）；右側是今天的統計、回覆追蹤、誕生的物件與脈絡。','i')
  +`<div class="jc">${jcMyColumn()}${peer?jcPeerColumn(peer):''}${jcCockpit()}</div>`;
};
function jcShift(n){saveJournalDraft();S.jday=dadd(S.jday,n);jcLineOpen='';render()}
function jcToday(){saveJournalDraft();S.jday=TODAY;render()}
// 其他地方要「看對方的日誌」時，改為停在同一個畫面、捲到對方欄。
switchJournalAuthor=function(who){saveJournalDraft();closeSummon();closeDrawer(true);if(space==='team'&&who!==DB.me){jcFocus=who;journalAuthor=DB.me}else journalAuthor=who;UNDO=[];REDO=[];render()};
const jcBaseInput=docInput;
docInput=function(e){jcBaseInput(e);if(space!=='team'||COMPOSING)return;(DB.journalEdits[DB.me]??={})[S.jday]=Date.now();jcStart()};
const jcBaseCommit=commit;
const JC_SHARED_LOG={'請求':'發出請求','決策卡':'發出決策卡','今日議題':'標記今日議題','請求回覆':'回覆請求','請求結案':'結案請求','行內留言':'留言','日誌留言':'留言'};
commit=function(op,ent,label,apply,undo){
 if(space==='team'&&JC_SHARED_LOG[ent])jcLog(jcShort(DB.me)+' '+JC_SHARED_LOG[ent],DB.me,ent==='行內留言'||ent==='日誌留言'?S.jday:TODAY);
 else if(space==='team'&&S.wb==='journal'&&ent!=='收工')jcLog(`${op==='create'?'召喚':'更新'}「${ent}」`);
 return jcBaseCommit(op,ent,label,apply,undo);
};
const jcBaseSummonObject=summonObject;
summonObject=function(...args){jcStart();return jcBaseSummonObject(...args)};

/* ---- 標題列：日誌 ‹ 日期 › 📅 [分頁] …「我開始一天了」時間 ---- */
const jcBaseEnhance=enhanceView;
enhanceView=function(){
 jcBaseEnhance();
 const on=S.wb==='journal'&&space==='team';
 root.querySelector('.wbhead')?.classList.toggle('jc-head',on);
 root.querySelector('#jcDate')?.remove();
 if(!on)return;
 if(S.tab===0)$('#wbName').insertAdjacentHTML('afterend',`<div class="jc-date" id="jcDate"><button class="btn sm" aria-label="前一天" onclick="jcShift(-1)">${svg('chevronLeft', 13)}</button><b>${S.jday} ${jcWeek(S.jday)}</b><button class="btn sm" aria-label="後一天" onclick="jcShift(1)">${svg('chevronRight', 13)}</button><button class="btn sm" aria-label="選擇日期" title="選擇或新增日期" onclick="newDay()">${svg('calendar', 13)}</button>${S.jday!==TODAY?'<button class="btn sm" onclick="jcToday()">回到今天</button>':''}</div>`);
 const start=DB.dayStart[DB.me]?.[S.jday];
 $('#wbRule').textContent=start||'尚未開始';
 $('#wbRule').classList.toggle('jc-started',!!start);
 if(jcFocus){const who=jcFocus;jcFocus='';const col=root.querySelector('#jcPeer');if(col&&col.dataset.author===who){col.scrollIntoView({block:'nearest',inline:'center'});col.classList.add('rq-flash')}}
};
// 換人時收起尚未送出的行內留言與決策卡，避免殘留在另一個人的畫面。
const jcSwitchUser=switchUser;
switchUser=function(){jcLineOpen='';rqDecision=null;rqOpenReply.clear();return jcSwitchUser()};
