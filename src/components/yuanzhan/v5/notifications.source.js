/* ── 通知匣（右上角鈴鐺）─────────────────────────────────────────────────────
   @人名 之後多了一種「只是讓他看到」的路徑（replies.source.js 的 kind:'notice'）。
   那種東西不佔回覆追蹤、不計時，所以它必須有另一個落點，否則送出去就消失了。

   這裡是那個落點：一個站內收件匣，把「跟我有關、但不一定要我做事」的四件事收在一起 ——
     · 有人 @ 我（只通知）
     · 有人請我回覆／做決定（還沒回）
     · 我發出的請求有人回了
     · 有人在我的日誌行上或整頁留言
   徽章只數「還沒讀」的前兩類：那兩類背後是 requests 這張表，seenAt 會被保存下來；
   留言沒有逐人已讀狀態，列出來但不計數，比造一個重整就歸零的紅點誠實。

   同時移除頂欄的密度切換 icon（⌘K 的「切換密度」仍在，設定頁的 ui.density 也還在）。
   ───────────────────────────────────────────────────────────────────────── */

/* 密度切換：留著行為，收掉頂欄那顆 icon —— extensions.source.js 對 #densBtn 的兩處
   讀取都有 if(b) 防護，移除之後是 no-op。 */
root.querySelector('#densBtn')?.remove();

/* 鈴鐺放在資料流右邊、稽核軌跡左邊，沿用 .iconbtn 與 .n 徽章，不自創一套。 */
(function mountNoticeButton(){
 if(root.querySelector('#noticeBtn'))return;
 const audit=root.querySelector('#auditBtn');
 if(!audit)return;
 const btn=doc.createElement('button');
 btn.className='iconbtn';btn.id='noticeBtn';btn.type='button';
 btn.title='通知：有人 @ 我、請我回覆，或在我的日誌留言';
 btn.setAttribute('aria-label','通知');
 btn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:16px;height:16px"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg><i class="n" id="noticeN">0</i>`;
 btn.addEventListener('click',()=>openNotices());
 audit.before(btn);
})();

function ntTime(ms){
 if(!ms)return '';
 const d=new Date(ms), day=rqLocalDay(ms), hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
 return day===rqLocalDay(Date.now())?hm:rqShortDay(day)+' '+hm;
}

/* 一則通知＝{kind, ref, at, seen, title, text, tone}。ref 是可以跳回去的那筆資料的 id，
   ntOpen() 用 kind 決定怎麼跳；HTML 只帶字串，不帶閉包。 */
function ntItems(){
 const out=[];
 for(const r of DB.requests){
  if(r.kind==='notice'){
   if(r.to!==DB.me)continue;
   out.push({kind:'notice',ref:r.id,at:r.sentAt,seen:!!r.seenAt,tone:'notice',
    title:`${person(r.from)} 提到你`,text:rqText(r)});
   continue;
  }
  if(r.to===DB.me&&rqPending(r))
   out.push({kind:'ask',ref:r.id,at:r.sentAt,seen:!!r.seenAt,tone:rqState(r)==='late'?'late':'ask',
    title:`${person(r.from)} 請你${r.kind==='decision'?'做決定':'回覆'}`,text:rqText(r)});
  else if(r.from===DB.me&&r.firstReplyAt&&!r.resolvedAt)
   out.push({kind:'reply',ref:r.id,at:r.firstReplyAt,seen:true,tone:'replied',
    title:`${person(r.to)} 回覆了你`,text:rqText(r)});
 }
 for(const c of DB.lineComments){
  if(c.author!==DB.me||c.w===DB.me)continue;
  out.push({kind:'line',ref:c.id,at:Date.parse(c.day+'T'+(c.ts||'00:00')+':00')||0,seen:true,tone:'',
   title:`${person(c.w)} 在你 ${rqShortDay(c.day)} 的日誌留言`,text:c.x});
 }
 for(const c of DB.journalComments){
  if(c.w===DB.me)continue;
  const day=String(c.parent||'').split(':').pop();
  out.push({kind:'page',ref:c.id,at:Date.parse(day+'T'+(c.ts||'00:00')+':00')||0,seen:true,tone:'',
   title:`${person(c.w)} 在 ${rqShortDay(day)} 的日誌留言`,text:c.x});
 }
 return out.sort((a,b)=>(b.at||0)-(a.at||0));
}

function ntUnread(){return ntItems().filter(i=>!i.seen).length}

function openNotices(){openDrawer('notice','x',true)}

/* 跳到通知指的那個地方。請求類交給 rqJump（它會處理跨日、找不到那一行等情況）；
   留言類就停在那一天的日誌。 */
function ntOpen(kind,ref){
 if(kind==='notice'||kind==='reply')return rqJump(ref);
 if(kind==='ask')return rqJump(ref,true);
 const c=kind==='line'?DB.lineComments.find(x=>x.id===ref)
  :DB.journalComments.find(x=>x.id===ref);
 if(!c)return toast('這則留言已不存在');
 const day=kind==='line'?c.day:String(c.parent||'').split(':').pop();
 closeDrawer();
 if(space!=='team')switchSpace('team');
 saveJournalDraft();
 if(RQ_DAY.test(day||''))S.jday=day;
 journalAuthor=DB.me;nav('journal',0);
}

/* 讀過就是讀過：只標記背後有 seenAt 可存的那兩類，留言沒有逐人已讀欄位，不假裝有。 */
function ntMarkAllSeen(){
 let n=0;
 for(const r of DB.requests)if(r.to===DB.me&&!r.seenAt&&(r.kind==='notice'||rqPending(r))){r.seenAt=Date.now();n++}
 if(n)opTouch();
 return n;
}

/* 打開就算讀過（徽章歸零），但這一次瀏覽仍要看得出哪幾則是新的 ——
   所以在標記之前先記下當下的未讀集合，畫面用它來畫圓點。 */
let ntFresh=new Set();
const ntKey=i=>i.kind+':'+i.ref;

DRAWERS.notice=()=>{
 const items=ntItems(), fresh=items.filter(i=>ntFresh.has(ntKey(i))).length;
 const row=i=>{const isNew=ntFresh.has(ntKey(i));
  return `<button class="rq-card nt-card ${i.tone} ${isNew?'':'seen'}" onclick="ntOpen('${i.kind}','${i.ref}')">
   <div class="nt-top"><span class="nt-title">${esc(i.title)}</span><span class="nt-at">${esc(ntTime(i.at))}</span></div>
   <div class="rq-card-t nt-text">${esc(i.text||'')}</div>
   <div class="rq-card-m">${isNew?'<span class="nt-dot" aria-label="新的"></span>':''}<span>${esc(NT_LABEL[i.kind]||'')}</span></div>
  </button>`};
 return {
  crumb:'通知',
  title:'通知',
  sub:items.length?`${items.length} 則${fresh?' · '+fresh+' 則新的':' · 都讀過了'}`:'目前沒有通知',
  body:items.length?`<div class="nt-list">${items.map(row).join('')}</div>`
   :`<div class="empty">還沒有通知。<br><br>在日誌行尾打 <b>@人名</b> 只通知對方（不用回覆）；打 <b>?@人名</b> 才會要求 24 小時內回覆。</div>`,
  foot:`<button class="btn" onclick="closeDrawer()">關閉</button>`
 };
};

const NT_LABEL={notice:'只通知 · 不用回覆',ask:'需要你回覆',reply:'你的請求有回覆',line:'行內留言',page:'整頁留言'};

function paintNoticeBadge(){
 const el=root.querySelector('#noticeN');if(!el)return;
 const n=space==='team'?ntUnread():0;
 el.textContent=n>99?'99+':String(n);
 el.style.display=n?'grid':'none';
 root.querySelector('#noticeBtn')?.classList.toggle('has-unread',!!n);
}

const ntBaseEnhance=enhanceView;
enhanceView=function(){ntBaseEnhance();paintNoticeBadge()};

/* 打開抽屜＝讀過，跟一般收件匣一樣：先記下哪幾則是新的，再標記，最後才畫。 */
const ntBaseOpenDrawer=openDrawer;
openDrawer=function(type,id,replace){
 if(type==='notice'){ntFresh=new Set(ntItems().filter(i=>!i.seen).map(ntKey));ntMarkAllSeen()}
 const out=ntBaseOpenDrawer(type,id,replace);
 if(type==='notice')paintNoticeBadge();
 return out;
};

buildCmdk=(base=>()=>[...base(),{g:'訊號',t:'通知',s:'誰 @ 了我、誰請我回覆',h:'誰 @ 了我、誰請我回覆',ic:'goto',run:openNotices}])(buildCmdk);
