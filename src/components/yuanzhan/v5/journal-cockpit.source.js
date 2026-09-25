/* ── 日誌「今天」：提案 C 雙人駕駛艙（journal-ui-proposals.html · C）──────────────
   · 標題列一行：日誌 ‹ 日期 › 📅 [今天｜回顧｜標籤流] …… 「我開始一天了」時間
   · 左欄＝自己（編輯中，唯一可寫的 #doc），右欄＝對方（唯讀，點任一行即可留言）
   · 行內留言掛在該行下方；整頁留言縮成駕駛艙底部一行輸入框
   · 右側駕駛艙：今日統計、回覆追蹤、今天誕生的物件（標出來源行）、今日脈絡
   只作用在圓展空間的「今天」分頁；個人空間與回顧／標籤流沿用原本畫面。
   ───────────────────────────────────────────────────────────────────────── */
/* 這幾個集合是從伺服器讀回來的（database 模式）。無條件指派會把剛讀回來的內容
   蓋成空的，看起來就像「重新整理就消失」—— 其實是存進去了、載入後又被清掉。 */
DB.lineComments=DB.lineComments||[];
/* 今日脈絡：一筆事件一列（kind：start 開始一天／close 收工／act 其他動作），
   宇星與 Lily 的動作合流成同一條時間軸。原本是只活在記憶體裡的 {日期:[...]}，
   重新整理就回到空白；改成可逐列比對的陣列之後，它跟日誌走同一條寫入管線，
   會被保存、也會在另一個席位寫入時合併進來。 */
DB.dayLogs=DB.dayLogs||[];
/* 收工時刻是脈絡上的一個事件；replies 的 DB.dayClose 只是它的查詢索引，開頁時重建。 */
for(const r of DB.dayLogs)if(r.kind==='close')(DB.dayClose[r.w]??={})[r.day]=r.t;
/* 「幾分鐘前更新」只在這一次瀏覽期間有意義；沒有 live 值時改由脈絡的最後一筆推回來。 */
DB.journalEdits={};
let jcRendering=false, jcLineOpen='', jcFocus='';
const jcDrafts=new Map();
const JC_TYPES={issue:['工作','c-p'],txn:['金流','c-w'],project:['專案','c-i'],decision:['決策','c-o'],event:['事件','c-t']};
function jcNow(){return nowts().slice(0,5)}
function jcDayRows(day=S.jday){return DB.dayLogs.filter(r=>r.day===day)}
/* 回傳有沒有真的新增一列：呼叫端要據此決定重畫與排保存。 */
function jcLog(text,w=DB.me,day=S.jday,kind='act'){
 const t=jcNow();
 // 同一分鐘的同一句話只留一筆：連續存檔會重複觸發，脈絡不該被同一件事洗版。
 if(DB.dayLogs.some(r=>r.day===day&&r.w===w&&r.t===t&&r.text===text))return false;
 DB.dayLogs.push({id:nid('DL'),day,w,t,kind,text});
 return true;
}
function jcStartAt(who,day=S.jday){return DB.dayLogs.find(r=>r.day===day&&r.w===who&&r.kind==='start')?.t||''}
function jcStart(who=DB.me,day=S.jday){return jcStartAt(who,day)?false:jcLog('開始一天',who,day,'start')}
/* 對方最後一次有動靜的時刻。重整之後沒有 live 值，但脈絡上還留著那一筆。 */
function jcTouched(who,day=S.jday){
 const live=DB.journalEdits[who]?.[day];
 if(live)return live;
 const rows=jcDayRows(day).filter(r=>r.w===who);
 if(!rows.length)return 0;
 return Date.parse(day+'T'+rows[rows.length-1].t+':00')||0;
}
if(initialState.mode==='showcase'){
 DB.dayLogs=[
  {id:'DL-DEMO-1',day:TODAY,w:'yz',t:'09:12',kind:'start',text:'開始一天'},
  {id:'DL-DEMO-2',day:TODAY,w:'lily',t:'09:40',kind:'start',text:'開始一天'},
  {id:'DL-DEMO-3',day:TODAY,w:'yz',t:'10:05',kind:'act',text:'召喚「工作」'},
  {id:'DL-DEMO-4',day:TODAY,w:'lily',t:'10:20',kind:'act',text:'留言'}];
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
  <div class="jc-col-h">${rqAv(peer,'md')}<b>${esc(jcShort(peer))}</b><span class="jc-col-m">· 唯讀 · ${jcAgo(jcTouched(peer))}</span><span class="sp"></span></div>
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
   <button class="btn sm" aria-label="召喚" title="# 召喚 component" onclick="insertAt('#')">${svg('hash', 13)} 召喚</button><button class="btn sm" aria-label="引用" title="@ 引用既有物件或通知對方" onclick="insertAt('@')">${svg('at', 13)} 引用</button></div>
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
 const list=jcDayRows(S.jday).slice().sort((a,b)=>(a.t||'').localeCompare(b.t||'')).slice(-14);
 // 名字從 e.w 印出來，不寫進 text：這樣同一條時間軸上看得出哪一筆是誰的。
 return list.length?`<div class="jc-tl">${list.map(e=>`<div class="${e.w}"><span class="jc-tl-t">${esc(e.t)}</span> <span class="jc-tl-w">${esc(jcShort(e.w))}</span> ${esc(e.text)}</div>`).join('')}</div>`:'<div class="rq-empty">今天還沒有動靜</div>';
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
/* ---- 日期選擇器：日曆 icon 展開月曆，點一下就跳到那天的日誌 ---- */
let jcPickerOn=false,jcPickerMonth='';
const JC_WEEKDAYS='日一二三四五六';
function jcMonthOf(d){return d.slice(0,7)}
function jcMonthShift(m,n){const d=new Date(m+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7)}
/* 有內容的日子在月曆上點一個點，讓人一眼看出哪幾天寫過。 */
function jcWrittenDays(){
 const s=new Set();
 for(const who of Object.keys(DB.people)){
  const book=journals.team[who]||{};
  for(const day of Object.keys(book)){
   const blocks=book[day]?.blocks||[];
   if(blocks.some(b=>b.t==='obj'||(b.text||'').trim()))s.add(day);
  }
 }
 for(const r of DB.dayLogs)s.add(r.day);
 for(const c of DB.lineComments)s.add(c.day);
 return s;
}
function jcTogglePicker(){jcPickerOn=!jcPickerOn;jcPickerMonth=jcMonthOf(S.jday);render()}
function jcClosePicker(){if(!jcPickerOn)return;jcPickerOn=false;render()}
function jcPickerShift(n){jcPickerMonth=jcMonthShift(jcPickerMonth||jcMonthOf(S.jday),n);render()}
function jcPickDay(d){jcPickerOn=false;if(d===S.jday)return render();saveJournalDraft();S.jday=d;jcLineOpen='';render()}
function jcPickerHtml(){
 if(!jcPickerOn)return '';
 const m=jcPickerMonth||jcMonthOf(S.jday);
 const first=new Date(m+'-01T00:00:00Z');
 const lead=first.getUTCDay();
 const total=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 const written=jcWrittenDays();
 let cells='';
 for(let i=0;i<lead;i++)cells+='<span class="jc-dp-pad"></span>';
 for(let i=1;i<=total;i++){
  const d=m+'-'+String(i).padStart(2,'0');
  const cls='jc-dp-d'+(d===S.jday?' on':'')+(d===TODAY?' today':'')+(written.has(d)?' has':'');
  cells+=`<button class="${cls}" title="${d} ${jcWeek(d)}" onclick="jcPickDay('${d}')">${i}</button>`;
 }
 return `<div class="jc-dp-bd" aria-hidden="true" onclick="jcClosePicker()"></div>
 <div class="jc-dp" id="jcPicker" role="dialog" aria-label="選擇日誌日期">
  <div class="jc-dp-h"><button class="btn sm" aria-label="上個月" onclick="jcPickerShift(-1)">${svg('chevronLeft',13)}</button><b>${m.slice(0,4)} 年 ${m.slice(5)} 月</b><button class="btn sm" aria-label="下個月" onclick="jcPickerShift(1)">${svg('chevronRight',13)}</button></div>
  <div class="jc-dp-w">${JC_WEEKDAYS.split('').map(w=>`<span>${w}</span>`).join('')}</div>
  <div class="jc-dp-g">${cells}</div>
  <div class="jc-dp-f"><button class="btn sm" onclick="jcPickDay('${TODAY}')">${svg('rotate',12)} 今天</button><button class="btn sm" onclick="jcClosePicker()">關閉</button></div>
 </div>`;
}
function jcShift(n){jcPickerOn=false;saveJournalDraft();S.jday=dadd(S.jday,n);jcLineOpen='';render()}
function jcToday(){jcPickerOn=false;saveJournalDraft();S.jday=TODAY;render()}
// 其他地方要「看對方的日誌」時，改為停在同一個畫面、捲到對方欄。
switchJournalAuthor=function(who){saveJournalDraft();closeSummon();closeDrawer(true);if(space==='team'&&who!==DB.me){jcFocus=who;journalAuthor=DB.me}else journalAuthor=who;UNDO=[];REDO=[];render()};
const jcBaseInput=docInput;
docInput=function(e){
 jcBaseInput(e);
 if(space!=='team'||COMPOSING)return;
 (DB.journalEdits[DB.me]??={})[S.jday]=Date.now();
 // 打字中不能 render()（游標會被重建掉），所以直接排一次保存，讓「開始一天」存得下去。
 if(jcStart())opTouch();
};
const jcBaseCommit=commit;
const JC_SHARED_LOG={'請求':'發出請求','決策卡':'發出決策卡','今日議題':'標記今日議題','請求回覆':'回覆請求','請求結案':'結案請求','行內留言':'留言','日誌留言':'留言'};
function jcCommitLog(op,ent){
 if(ent==='收工')return jcLog('收工',DB.me,TODAY,'close');
 // 標記與完成走同一個 ent，靠 op 分開；否則脈絡上兩件事會長得一模一樣。
 if(ent==='今日議題')return jcLog(op==='create'?'標記今日議題':'完成今日議題',DB.me,TODAY);
 if(JC_SHARED_LOG[ent])return jcLog(JC_SHARED_LOG[ent],DB.me,ent==='行內留言'||ent==='日誌留言'?S.jday:TODAY);
 if(S.wb==='journal')return jcLog(`${op==='create'?'召喚':'更新'}「${ent}」`);
 return false;
}
/* 記在 base commit 之後，不是之前。
   commit() 是先取快照再 apply()，在那之前寫進去的脈絡列會一起落進基準線裡，
   於是永遠比不出差異、也就永遠不會被保存 —— 正是「重新整理就消失」的那個成因。
   之後補一次 render()，讓新的一列立刻出現在右欄。 */
commit=function(op,ent,label,apply,undo){
 const out=jcBaseCommit(op,ent,label,apply,undo);
 if(space==='team'&&jcCommitLog(op,ent))render();
 return out;
};
const jcBaseSummonObject=summonObject;
summonObject=function(...args){if(jcStart())opTouch();return jcBaseSummonObject(...args)};

/* ---- 標題列：日誌 ‹ 日期 › 📅 [分頁] …「我開始一天了」時間 ---- */
const jcBaseEnhance=enhanceView;
enhanceView=function(){
 jcBaseEnhance();
 const on=S.wb==='journal'&&space==='team';
 root.querySelector('.wbhead')?.classList.toggle('jc-head',on);
 root.querySelector('#jcDate')?.remove();
 if(!on){jcPickerOn=false;return}
 if(S.tab===0)$('#wbName').insertAdjacentHTML('afterend',`<div class="jc-date" id="jcDate"><button class="btn sm jc-ico" aria-label="前一天" onclick="jcShift(-1)">${svg('chevronLeft', 13)}</button><b>${S.jday} ${jcWeek(S.jday)}</b><button class="btn sm jc-ico" aria-label="後一天" onclick="jcShift(1)">${svg('chevronRight', 13)}</button><button class="btn sm jc-ico jc-dp-btn${jcPickerOn?' on':''}" aria-label="選擇日期" aria-expanded="${jcPickerOn?'true':'false'}" title="選擇日期 · 跳到那天的日誌" onclick="jcTogglePicker()">${svg('calendar', 13)}</button>${S.jday!==TODAY?`<button class="btn sm jc-today" aria-label="回到今天" onclick="jcToday()">${svg('rotate', 12)} 回到今天</button>`:''}${jcPickerHtml()}</div>`);
 const start=jcStartAt(DB.me,S.jday);
 $('#wbRule').textContent=start||'尚未開始';
 $('#wbRule').classList.toggle('jc-started',!!start);
 if(jcFocus){const who=jcFocus;jcFocus='';const col=root.querySelector('#jcPeer');if(col&&col.dataset.author===who){col.scrollIntoView({block:'nearest',inline:'center'});col.classList.add('rq-flash')}}
};
// 換人時收起尚未送出的行內留言與決策卡，避免殘留在另一個人的畫面。
const jcSwitchUser=switchUser;
switchUser=function(){jcLineOpen='';jcPickerOn=false;rqDecision=null;rqOpenReply.clear();return jcSwitchUser()};
