// Integration layer: preserve v5 markup; supply data boundaries and complete empty-state actions.
let space='team', journalAuthor=DB.me;
const journals={team:{yz:DB.journal,lily:{}},personal:{yz:{},lily:{}}};
DB.journalBooks=journals;
DB.journalComments=[];
DB.files=[];
DB.payroll=initialState.mode==='showcase'?[{who:'yz',base:0,overtime:0,milestone:0,separate:true},{who:'lily',base:30000,overtime:1846,milestone:5000}]:[];
DB.policy=initialState.mode==='showcase'?{normalHours:130,warningHours:143}:{};
if(initialState.mode==='showcase') journals.team.lily[TODAY]={title:'20260912　週六 · Lily',blocks:[{id:'lily-1',t:'h2',ind:0,text:'Standup'},{id:'lily-2',t:'h3',ind:0,text:'Today'},{id:'lily-3',t:'p',ind:1,text:'整理柏翰成效報告與驗收資料，準備下週交付。'}]};
Object.defineProperty(DB,'journal',{enumerable:false,configurable:true,get:()=>journals[space][space==='personal'?DB.me:journalAuthor],set:v=>{journals[space][space==='personal'?DB.me:journalAuthor]=v}});
const journalDrafts=new Map();
let journalDirty=false;
function canWriteJournal(){return space==='personal'||journalAuthor===DB.me}
function journalKey(){return space+':'+(space==='personal'?DB.me:journalAuthor)+':'+S.jday}
function currentJournal(){
 const existing=DB.journal[S.jday];if(existing)return existing;
 const key=journalKey();if(!journalDrafts.has(key))journalDrafts.set(key,{title:S.jday,blocks:[{id:newBid(),t:'p',ind:0,text:''}]});
 return journalDrafts.get(key);
}
function saveJournalDraft(){
 if(!canWriteJournal())return;
 const d=journalDrafts.get(journalKey());if(d&&(d.title!==S.jday||d.blocks.some(b=>b.text?.trim()||b.t==='obj'))){DB.journal[S.jday]=d;journalDrafts.delete(journalKey());}
}
function deny(){toast('此操作僅由作者或指定負責人進行；其他成員可留言協作。');return false}
function editable(x){return !!x&&(x.author||x.owner||'yz')===DB.me}
function progressable(x){return !!x&&(editable(x)||x.owner===DB.me)}
function stampAuthors(){for(const key of ['issues','projects','events','txns','threads','decisions'])DB[key].forEach(x=>{if(!x.author)x.author=DB.me});DB.txns.forEach(t=>{if(!t.ledgerRow)t.ledgerRow=++DB.seq.ledger})}
DB.seq.ledger=0;
for(const key of ['issues','projects','events','txns','threads','decisions'])DB[key].forEach(x=>{x.author=x.owner||'yz'});
stampAuthors();
S.proj=DB.projects[0]?.id||'';S.jday=TODAY;S.doc=DB.docs[0]?.id||'';S.clause=DB.docs[0]?.clauses[0]?.id||'';
function normalizeSelection(){
 if(!P(S.proj))S.proj=DB.projects[0]?.id||'';
 if(!DB.docs.some(d=>d.id===S.doc))S.doc=DB.docs[0]?.id||'';
}
function switchJournalAuthor(who){saveJournalDraft();journalAuthor=who;UNDO=[];REDO=[];closeSummon();closeDrawer(true);render()}
const originalSwitchUser=switchUser;
switchUser=function(){saveJournalDraft();closeDrawer(true);closeModal();closeCmdk();closeSummon();UNDO=[];REDO=[];DB.me=DB.me==='yz'?'lily':'yz';journalAuthor=DB.me;S.proj=myProjects()[0]||DB.projects[0]?.id||'';paintUser();render();toast('介面示例視角：'+person(DB.me))};
function openSpaces(){openModal('切換空間','個人日誌僅自己可見；圓展工作日誌輸入即讓團隊看見。','',`<button class="btn ${space==='personal'?'pri':''}" onclick="switchSpace('personal')">個人空間</button><button class="btn ${space==='team'?'pri':''}" onclick="switchSpace('team')">圓展空間</button>`)}
function switchSpace(next){saveJournalDraft();space=next;journalAuthor=DB.me;UNDO=[];REDO=[];closeModal();closeDrawer(true);closeCmdk();closeSummon();S.wb='journal';S.tab=0;render()}
const originalRenderRail=renderRail;
renderRail=function(){
 if(space==='team')originalRenderRail();else $('#rail').innerHTML=`<button class="rail-i on" onclick="nav('journal',0)">${svg('journal')}<em>私人日誌</em></button><a class="rail-i" href="/research">${svg('file')}<em>研究</em></a><a class="rail-i" href="/self">${svg('desk')}<em>生活</em></a><a class="rail-i" href="/finance">${svg('money')}<em>個人財務</em></a><div class="rail-sp"></div>`;
 $('#rail').insertAdjacentHTML('beforeend',`<div class="rail-sp"></div><button class="rail-i" onclick="openSpaces()" title="切換個人／圓展空間">${svg('copy')}<em>${space==='team'?'圓展':'個人'}</em></button><button class="rail-i" onclick="openFiles()" title="公司文件庫">${svg('file')}<em>文件</em></button><span class="mode-label" title="僅儲存在此頁記憶體；重新整理會重置">介面示例</span>`);
 root.dataset.space=space;root.dataset.actor=DB.me;
};
const originalJView=VIEWS.journal;
VIEWS.journal=function(tab){
 let html=originalJView(tab);
 if(tab===0){html=html.replace('<h3>日期</h3>',`<h3>日期</h3><span class="sp"></span>${space==='team'?`<div class="seg authors"><button class="${journalAuthor==='yz'?'on':''}" onclick="switchJournalAuthor('yz')">宇星</button><button class="${journalAuthor==='lily'?'on':''}" onclick="switchJournalAuthor('lily')">Lily</button></div>`:'<span class="chip c-i">僅自己</span>'}`);
  // Append collaboration below the exact reference's main writing area, preserving first-viewport layout.
  html+=`<div style="height:14px"></div>`+panel(space==='team'?'日誌留言':'私人備註',person(journalAuthor)+' · '+S.jday,journalCommentsHtml(),'',false);
 }
 return html;
};
const textDrafts=new Map();
function journalCommentsHtml(){const key=journalKey();const cs=DB.journalComments.filter(c=>c.parent===key);return `<div class="thr">${cs.map(c=>`<div class="msg"><span class="av ${DB.people[c.w].cls}">${DB.people[c.w].s}</span><div class="bd"><div class="hd"><span class="nm">${person(c.w)}</span><span class="ts">${c.ts}</span></div><div class="tx">${esc(c.x)}</div></div>${c.w===DB.me?`<button class="btn sm" onclick="deleteJournalComment('${c.id}')">刪除</button>`:''}</div>`).join('')||'<div class="note">尚無留言</div>'}</div><div class="composer"><textarea id="journalReply" aria-label="日誌留言" placeholder="留言協作…" oninput="textDrafts.set(journalKey()+':'+DB.me,this.value)">${esc(textDrafts.get(key+':'+DB.me)||'')}</textarea><button class="btn pri" onclick="sendJournalComment()">送出</button></div>`}
function sendJournalComment(){const text=$('#journalReply').value.trim();if(!text)return toast('請先輸入留言');DB.journalComments.push({id:nid('JC'),parent:journalKey(),w:DB.me,ts:nowts(),x:text});textDrafts.delete(journalKey()+':'+DB.me);render()}
function deleteJournalComment(id){DB.journalComments=DB.journalComments.filter(c=>c.id!==id||c.w!==DB.me);render()}
const originalMentionHits=mentionHits;
mentionHits=q=>space==='team'?originalMentionHits(q):[];
const originalSummonHits=summonHits;
summonHits=q=>originalSummonHits(q).filter(x=>space==='team'||!['issue','txn','event','decision','project'].includes(x.k));
const originalCmdk=buildCmdk;
buildCmdk=function(){if(space==='personal')return[{g:'個人空間',t:'私人日誌',s:'僅自己',run:()=>nav('journal',0)},{g:'空間',t:'切換至圓展空間',s:'團隊工作',run:()=>switchSpace('team')}];return [...originalCmdk(),{g:'文件',t:'公司文件庫',s:'檔案、版本與引用',run:openFiles},{g:'空間',t:'切換空間',s:'個人／圓展',run:openSpaces}]};
function enhanceView(){
 const title=$('.brand b');title.textContent=space==='team'?'圓展 Operating System':'個人 Operating System';title.setAttribute('role','button');title.tabIndex=0;title.onclick=openSpaces;title.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSpaces()}};
 $('.brand span').title='UI-memory 示範；重整重置，尚未連接正式多人同步。';
 if(S.wb==='journal'&&!canWriteJournal()){root.querySelectorAll('[contenteditable]').forEach(e=>e.contentEditable='false');root.querySelectorAll('.eb-h,.doc-bar button,.eb-ck').forEach(e=>{e.setAttribute('aria-disabled','true');e.tabIndex=-1});}
 if(S.wb==='journal'){$('#wbName').textContent=space==='personal'?'私人日誌':'日誌';$('#wbRule').textContent=canWriteJournal()?(space==='team'?'主操作面：大綱編輯器 · 即時共享':'主操作面：大綱編輯器 · 僅自己'):'正文由作者編輯 · 可留言協作';}
 root.querySelectorAll('.rail-i').forEach(e=>{if(!e.getAttribute('aria-label'))e.setAttribute('aria-label',e.querySelector('em')?.textContent||e.title)});
 if(S.wb==='money'&&S.tab===0&&S.ledgerView==='表格')enhanceLedger();
 if(S.wb==='capacity'&&S.tab===3)enhanceTimesheet();
 if(S.wb==='project'&&S.tab===2)enhanceThread();
 root.querySelectorAll('.row,.rline,.sig,.blk-i,.cmdk-i,.tree .f,.rel .tt,.clause').forEach(e=>{if(e.querySelector('input,textarea,select'))return;if(e.tabIndex<0){e.tabIndex=0;e.setAttribute('role','button');e.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();e.click()}})}});
 $('#tabs').setAttribute('role','tablist');root.querySelectorAll('#tabs .tab').forEach((el,i)=>{el.setAttribute('role','tab');el.setAttribute('aria-selected',String(S.tab===i));el.tabIndex=S.tab===i?0:-1;el.onkeydown=e=>{const n=WB.find(w=>w.id===S.wb).tabs.length;let next;if(e.key==='ArrowRight')next=(i+1)%n;if(e.key==='ArrowLeft')next=(i+n-1)%n;if(e.key==='Home')next=0;if(e.key==='End')next=n-1;if(next!=null){e.preventDefault();setTab(next);$('#tabs').children[next].focus()}}});
}
// Empty states use the same panels, tabs, forms and live store as the reference.
const emptyPanel=(title,action,body='尚無資料')=>panel(title,'',`<div class="empty">${body}${action?'<br><br>'+action:''}</div>`);
const newProjectAction=()=>`<button class="btn pri" onclick="formProject()">${svg('plus')} 新專案</button>`;
const originalProjectView=VIEWS.project;
VIEWS.project=tab=>!DB.projects.length?emptyPanel(['專案總覽','專案工作','對話','Evidence Repo','專案財務'][tab],newProjectAction(),'建立第一個專案後，從同一處推進工作、討論與整理 Evidence。'):originalProjectView(tab);
const originalCommitView=VIEWS.commit;
VIEWS.commit=tab=>{const dir=tab?'外部':'內部';if(!DB.docs.some(d=>d.dir===dir))return `<div class="g g12">${emptyPanel('文件',`<button class="btn pri" onclick="formSourceDoc('${dir}')">${svg('plus')} 新增文件</button>`)}${emptyPanel('條文 ↔ 承諾','', '先加入來源文件，再選取條文建立承諾。')}</div>`;return `<div class="source-actions"><button class="btn sm" onclick="formSourceDoc('${dir}')">${svg('plus')} 新增文件</button></div>`+originalCommitView(tab)};
function formSourceDoc(dir){openForm({crumb:'文件',title:'新增承諾來源文件',fields:[{k:'t',label:'文件名稱',req:true},{k:'ref',label:'條文編號',req:true},{k:'text',label:'條文內容',type:'textarea',req:true}],values:{t:'',ref:'',text:''},onSave:v=>commit('create','文件',v.t,()=>{const id=nid('DOC'),cid=nid('CLAUSE');DB.docs.push({id,dir,t:v.t,clauses:[{id:cid,ref:v.ref,text:v.text}]});S.doc=id;S.clause=cid;return['文件與承諾可雙向對照']})})}
const originalMoneyView=VIEWS.money;
VIEWS.money=tab=>{
 if(tab===1&&!DB.txns.length)return `<div class="kpis">${['9 月淨額','現金水位','Runway','應收未收'].map(t=>`<div class="kpi"><div class="lb">${t}</div><div class="v">—</div><div class="s">尚無資料</div></div>`).join('')}</div><div style="height:12px"></div>${emptyPanel('可分配毛利',`<button class="btn pri" onclick="formTxn()">新增交易</button>`,'建立交易後計算；沒有現金資料時不推測 Runway。')}`;
 if(tab===4&&!DB.payroll.length)return emptyPanel('薪資與獎金試算',isOwner()?`<button class="btn pri" onclick="formPayroll()">新增薪資試算</button>`:'','尚無薪資資料');
 if(tab===4)return payrollView();
 if(tab===5&&!DB.projects.length)return emptyPanel('專案預算',newProjectAction(),'尚無專案與預算');
 if(tab===1&&!DB.cash.length){const p=DB.projects[0];return panel('本月淨額','',`<div class="kpi"><div class="v">${nt(monthTxnSum())}</div></div>`)+(p?vWaterfall(p.id):'')+emptyPanel('現金水位／Runway','','未提供現金餘額與支出基準');}
 return originalMoneyView(tab);
};
const originalDesk=VIEWS.desk;
VIEWS.desk=tab=>{let out=originalDesk(tab);if(tab===0&&!DB.timesheet.lily.length)out=out.replace(/距 143h 警戒線尚遠/g,'尚無出勤紀錄').replace(/0<span style="font-size:12px;color:var\(--text-3\)"> \/ 130 h<\/span>/,'—');if(tab===0&&!DB.projects.some(p=>p.id==='PRJ-2026-004'))out=out.replace('柏翰案 · 卡在閘門③ 驗收','尚無獎金資料');if(tab===2)out=`<div class="source-actions"><button class="btn sm" onclick="formGoal()">新增目標</button></div>`+out;return out};
function formGoal(){openForm({crumb:'目標',title:'新增公司目標',fields:[{k:'t',label:'目標',req:true},{k:'period',label:'期間',req:true}],values:{t:'',period:''},onSave:v=>commit('create','目標',v.t,()=>{DB.goals.push({id:nid('GOAL'),t:v.t,period:v.period,pct:0});return['目標可與專案對齊']})})}
const originalCapacity=VIEWS.capacity;
VIEWS.capacity=tab=>{
 if(tab===1&&!DB.weekly.length)return `<div class="kpis">${['Throughput','目前 WIP','平均 Cycle Time','停滯中'].map((t,i)=>`<div class="kpi"><div class="lb">${t}</div><div class="v">${i===1?wip():'—'}</div><div class="s">尚無足夠樣本</div></div>`).join('')}</div><div style="height:12px"></div>${emptyPanel('每週 Throughput','','完成工作後累積週資料')}${vScatter()}${vAging()}`;
 if(tab===2&&DB.weekly.length<8)return emptyPanel('Monte Carlo 完成預測','','樣本不足：需至少 8 週完成資料，再提供機率分布。');
 let out=originalCapacity(tab);if(tab===0&&!DB.policy.normalHours)out=out.replace(/0 \/ 130 h/g,'—').replace(/距 143h（110%）警戒線尚遠/g,'尚未設定工時基準');return out;
};
const originalWeekly=vWeekly;vWeekly=()=>DB.weekly.length?originalWeekly():emptyPanel('每週 Throughput','','尚無完成樣本');
const originalCFD=vCFD;vCFD=()=>DB.history.length||DB.issues.length?originalCFD():emptyPanel('Cumulative Flow Diagram','','尚無工作狀態資料');
const originalAlloc=formAlloc;
formAlloc=who=>{if(who!==DB.me)return deny();if(DB.capacity[who].length)return originalAlloc(who);openForm({crumb:'週配置',title:'設定週容量 · '+person(who),fields:[{k:'category',label:'投入類別',req:true},{k:'pct',label:'比例 %',type:'number',req:true}],values:{category:'',pct:''},onSave:v=>{if(+v.pct<0||+v.pct>100)throw Error('比例須介於 0–100');commit('create','容量',v.category,()=>{DB.capacity[who].push([v.category,+v.pct,null]);return['週容量配置已新增']})}})};
function formPayroll(who){if(!isOwner())return deny();const e=DB.payroll.find(p=>p.who===who);openForm({crumb:'薪资試算',title:e?'調整薪資試算':'新增薪資試算',fields:[{k:'who',label:'人員',type:'select',opts:PEOPLE_OPTS(),req:true},{k:'base',label:'固定薪資',type:'number',req:true},{k:'overtime',label:'加班試算',type:'number'},{k:'milestone',label:'里程碑獎金',type:'number'}],values:e||{who:DB.me,base:'',overtime:0,milestone:0},onSave:v=>commit('update','薪資試算',person(v.who),()=>{const item={who:v.who,base:+v.base,overtime:+v.overtime||0,milestone:+v.milestone||0,separate:false};const old=DB.payroll.find(p=>p.who===v.who);if(old)Object.assign(old,item);else DB.payroll.push(item);return['只更新本頁示例試算，不付款']})})}
function payrollView(){const g=GATE();return `<div class="g g21">${panel('2026-10 薪資','發放日 10/01',`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>人員</th><th class="num">固定</th><th class="num">加班</th><th class="num">專案獎金</th><th class="num">里程碑</th><th class="num">應付</th></tr></thead><tbody>${DB.payroll.filter(p=>isOwner()||p.who===DB.me).map(p=>{if(p.separate)return `<tr onclick="formPayroll('${p.who}')"><td class="k">${person(p.who)}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num" style="color:var(--text-3)">另計</td></tr>`;const b=DB.projects.filter(x=>x.owner===p.who).reduce((a,x)=>a+bonus(x.id),0);return `<tr onclick="${isOwner()?`formPayroll('${p.who}')`:`toast('本人薪資唯讀；由管理者調整試算')`}"><td class="k">${person(p.who)}</td><td class="num">${nt(p.base)}</td><td class="num">${nt(p.overtime)}</td><td class="num" style="color:var(--pri)">${nt(b)}</td><td class="num">${nt(p.milestone)}</td><td class="num" style="color:var(--ok)">${nt(p.base+p.overtime+b+p.milestone)}</td></tr>`}).join('')}</tbody><tfoot><tr><td colspan="6">示例試算 · 固定＋加班＋專案獎金＋里程碑；尚未連接正式薪酬</td></tr></tfoot></table></div>`,isOwner()?`<button class="btn sm" onclick="formPayroll()">新增／調整</button>`:'',true)}${panel('獎金結算閘門','§13.1 五項全數成立',DB.projects.some(p=>p.id==='PRJ-2026-004')?g.map(([t,ok,m])=>`<div class="gate"><span class="ix ${ok?'y':'n'}">${ok?svg('check',12):'…'}</span><span class="tt">${esc(t)}</span><span class="mm">${esc(m)}</span></div>`).join(''):'<div class="empty">尚無專案結算資料</div>')}</div>`}
function validateForm(c,v){
 for(const f of c.fields){if(f.type==='number'&&v[f.k]!==''&&!Number.isFinite(Number(v[f.k])))throw Error(f.label+'須為有效數字');if(f.type==='date'&&v[f.k]&&!/^\d{4}-\d{2}-\d{2}$/.test(v[f.k]))throw Error('日期格式錯誤');}
 if(v.started&&v.done&&v.done<v.started)throw Error('完成日期不能早於開始日期');
 if(v.p&&v.p!=='公司層級'&&!P(v.p))throw Error('請先建立並選擇專案');
}
// The exact ledger stays the primary surface; editing controls appear on interaction.
function ledgerCells(){const cells={};DB.txns.forEach(t=>{cells['B'+t.ledgerRow]=t.quantity??1;cells['C'+t.ledgerRow]=t.unitPrice??t.amt;cells['D'+t.ledgerRow]=t.formula??t.amt});return cells}
function recalcLedger(){const cells=ledgerCells();DB.txns.forEach(t=>{if(t.formula){const r=evaluateFormula(t.formula,cells);t.formulaError=r.error;t.amt=r.value??0}})}
function editLedgerCell(id,field,value){const t=TX(id);if(!editable(t))return deny();if(field==='amt'&&DB.bank.some(b=>b.m===id))return toast('已配對的金額請先解除對帳');const old={...t};if(field==='amt'){const r=evaluateFormula(value,ledgerCells());if(r.error)return toast(r.error);t.formula=value;t.amt=r.value??0;}else if(field==='quantity'||field==='unitPrice'){if(!Number.isFinite(+value))return toast('請填數字');t[field]=+value;}else t[field]=value.trim();commit('update','交易',t.t,()=>['表格、憑證、專案毛利與獎金同步更新'],()=>Object.assign(t,old));}
function enhanceLedger(){
 const table=$('table.tbl');if(!table)return;
 for(const row of table.querySelectorAll('tbody tr[data-tx]')){const record=TX(row.dataset.tx);if(!record)continue;row.dataset.row=record.ledgerRow;row.title='固定列號 '+record.ledgerRow+' · 雙擊摘要、類別或金額編輯';
  for(const [index,field] of [[1,'t'],[3,'cat'],[4,'amt']]){const cell=row.children[index];if(!editable(record))continue;cell.tabIndex=0;cell.setAttribute('aria-label','編輯 '+record.t+' '+(field==='amt'?'金額':field==='cat'?'類別':'摘要'));const edit=e=>{e.stopPropagation();closeDrawer(true);const input=doc.createElement('input');input.className='cell-editor';input.value=String(field==='amt'?(record.formula??record.amt):record[field]);input.setAttribute('aria-label',cell.getAttribute('aria-label'));cell.replaceChildren(input);input.focus();input.select();let cancelled=false;input.onclick=ev=>ev.stopPropagation();input.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Escape'){cancelled=true;render()}if(ev.key==='Enter')input.blur()};input.onblur=()=>{if(!cancelled)editLedgerCell(record.id,field,input.value)}};cell.ondblclick=edit;cell.onkeydown=e=>{if(e.key==='Enter'||e.key==='F2'){e.preventDefault();edit(e)}};}
 }
 const h=table.closest('.panel').querySelector('.panel-h');h.insertAdjacentHTML('beforeend',`<button class="btn sm" onclick="openLedgerTools()" title="貼上、篩選、排序與批次">表格操作</button>`);
}
function openLedgerTools(){openModal('表格操作','日期／摘要／金額／專案／類別，以 Tab 分隔；金額支援公式。固定列號 D 不受排序影響。',`<div class="frow"><label class="flab" for="ledgerFilter">篩選摘要／類別</label><input id="ledgerFilter" value="${esc(S.ledgerFilter||'')}" oninput="S.ledgerFilter=this.value"></div><div class="frow"><label class="flab" for="ledgerPaste">貼上多列</label><textarea id="ledgerPaste" rows="5" placeholder="2026-09-12&#9;摘要&#9;-1200&#9;公司層級&#9;工具"></textarea></div><div class="note">B＝數量、C＝單價、D＝金額。支援算術、SUM／AVERAGE／MIN／MAX，最多 200 列。</div>`,`<button class="btn pri" onclick="pasteLedger()">貼上新增</button><button class="btn" onclick="closeModal();render();applyLedgerFilter()">套用篩選</button><button class="btn" onclick="S.ledgerSort=!S.ledgerSort;closeModal();render();applyLedgerFilter()">金額排序 ↑↓</button><button class="btn" onclick="closeModal();batchLedger()">批次類別</button>`)}
function applyLedgerFilter(){const q=(S.ledgerFilter||'').toLowerCase(),body=$('table.tbl tbody');if(!body)return;let sum=0;for(const row of [...body.querySelectorAll('[data-tx]')]){const t=TX(row.dataset.tx);row.hidden=!!q&&!((t.t+' '+t.cat).toLowerCase().includes(q));if(!row.hidden&&!t.pass)sum+=t.amt;}if(q){const foot=$('table.tbl tfoot tr');foot.children[0].textContent='篩選合計（不含代收代付）';foot.children[1].textContent=nt(sum);}if(S.ledgerSort!=null)[...body.querySelectorAll('[data-tx]')].sort((a,b)=>(TX(a.dataset.tx).amt-TX(b.dataset.tx).amt)*(S.ledgerSort?1:-1)).forEach(e=>body.append(e));}
function pasteLedger(){const raw=$('#ledgerPaste').value.trim();if(!raw)return toast('請貼上資料');const lines=raw.split(/\r?\n/);if(lines.length>200)return toast('每次最多 200 列');const created=[];const cells=ledgerCells();let seq=DB.seq.ledger;for(const line of lines){const[d,t,formula,p='公司層級',cat='其他']=line.split('\t');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!t?.trim()||!formula||(p!=='公司層級'&&!P(p)))return toast('日期、摘要、金額或專案無效，整批未新增');const row=++seq;cells['B'+row]=1;cells['C'+row]=0;cells['D'+row]=formula;created.push({d,t,formula,p,cat,ledgerRow:row});}for(const t of created){const r=evaluateFormula(t.formula,cells,new Set(['D'+t.ledgerRow]));if(r.error)return toast(r.error+'，整批未新增');t.amt=r.value??0;t.id=nid('TXN');t.author=DB.me;t.pass=false;t.v=[];t.note='';}closeModal();commit('create','交易',created.length+' 筆',()=>{DB.seq.ledger=seq;DB.txns.push(...created);return['表格與專案財務連動']},()=>DB.txns=DB.txns.filter(t=>!created.some(c=>c.id===t.id)));}
function batchLedger(){openForm({crumb:'批次',title:'批次更新篩選結果',sub:'僅更新你可編輯、且符合目前篩選的列。',fields:[{k:'cat',label:'類別',req:true}],values:{cat:''},onSave:v=>{const q=(S.ledgerFilter||'').toLowerCase();const list=DB.txns.filter(t=>editable(t)&&(!q||(t.t+' '+t.cat).toLowerCase().includes(q)));const before=list.map(t=>t.cat);commit('update','交易',list.length+' 筆類別',()=>{list.forEach(t=>t.cat=v.cat);return['批次更新類別']},()=>list.forEach((t,i)=>t.cat=before[i]));}})}
const originalReconcile=reconView;
reconView=function(){let out=originalReconcile();if(!isOwner())return out;return out+`<div class="source-actions" style="margin-top:12px"><button class="btn sm" onclick="formBank()">新增銀行明細</button><button class="btn sm" onclick="openMatching()">配對／解除</button></div>`};
function formBank(){if(!isOwner())return deny();openForm({crumb:'銀行',title:'新增銀行明細',fields:[{k:'d',label:'日期',type:'date',req:true},{k:'t',label:'摘要',req:true},{k:'amt',label:'金額',type:'number',req:true}],values:{d:TODAY,t:'',amt:''},onSave:v=>commit('create','銀行明細',v.t,()=>{DB.bank.push({id:nid('BK'),d:v.d,t:v.t,amt:+v.amt,m:''});return['加入差異清單']})})}
function openMatching(){if(!isOwner())return deny();openForm({crumb:'對帳',title:'銀行與內帳配對',fields:[{k:'bank',label:'銀行明細',type:'select',opts:DB.bank.map(b=>[b.id,b.t+' '+nt(b.amt)+(b.m?' · 已配對':'')]),req:true},{k:'txn',label:'內帳交易',type:'select',opts:[['','解除目前配對'],...DB.txns.map(t=>[t.id,t.t+' '+nt(t.amt)])]}],values:{bank:DB.bank[0]?.id||'',txn:''},onSave:v=>{const b=DB.bank.find(x=>x.id===v.bank),t=TX(v.txn);if(!b)throw Error('請先新增銀行明細');if(t&&t.amt!==b.amt)throw Error('金額不同，請先釐清差異');if(t&&DB.bank.some(x=>x.id!==b.id&&x.m===t.id))throw Error('交易已有配對');const old=b.m;commit('update','對帳',b.t,()=>{b.m=t?.id||'';return[t?'已配對':'已解除配對']},()=>b.m=old);}})}
// Attendance has its own source; no synthetic duration is inferred from task status.
function enhanceTimesheet(){const table=$('table.ts');if(!table)return;const who=isOwner()?S.tsWho:DB.me;const header=table.closest('.panel').querySelector('.panel-h');header.insertAdjacentHTML('beforeend',`<button class="btn sm" onclick="newAttendanceWeek('${who}')">新增週次</button>`);if(who!==DB.me)table.querySelectorAll('input,button').forEach(e=>{e.disabled=true;e.title='須由本人填寫與確認'});if(!DB.policy.normalHours)root.querySelectorAll('.kpi').forEach(e=>{if(e.textContent.includes('143h')||e.textContent.includes('保存期限'))e.querySelector('.v').textContent='—'});}
function newAttendanceWeek(who){if(who!==DB.me)return deny();openForm({crumb:'出勤',title:'新增出勤週次',fields:[{k:'from',label:'週一日期',type:'date',req:true}],values:{from:TODAY},onSave:v=>{const date=new Date(v.from+'T00:00:00Z');if(date.getUTCDay()!==1)throw Error('請選擇週一');if(tsWeeks(who).some(w=>w.from===v.from))throw Error('此週已存在');commit('create','出勤週次',v.from,()=>{DB.timesheet[who].push({wk:v.from,from:v.from,days:Array(7).fill(0),est:Array(7).fill(0),st:'draft',conf:''});return['逐日填寫後由本人確認']})}})}
const originalSetDay=setDay;
setDay=function(who,wi,di,value){if(who!==DB.me)return deny();if(value&&!/^(?:\d{1,2}:[0-5]\d|\d+(?:\.\d+)?)$/.test(value)){toast('請填 H:MM 或小時數');render();return}const parts=value.split(':');const minutes=parts.length===2?+parts[0]*60+(+parts[1]):+value*60;if(minutes>1440||minutes<0){toast('每日時間須在 0–24 小時');render();return}originalSetDay(who,wi,di,value);render()};
// 文件庫：文字內容留在紀錄裡，二進位 bytes 走 R2 預簽網址（PLN-074 M6）。
// prototype 模式維持原本的 data URL 行為，那時本來就沒有要保存。
function openFiles(){openDrawer('files','all',true)}
function fileList(){return DB.files.filter(f=>f.space===space&&(space==='team'||f.author===DB.me))}
DRAWERS.files=()=>({crumb:'文件',title:space==='team'?'公司文件庫':'私人文件',sub:'分類、標籤、版本與引用',body:`<div class="frow"><input id="fileSearch" aria-label="搜尋文件" placeholder="搜尋名稱或標籤…" oninput="filterFiles(this.value)"></div><div class="rows" id="fileList">${fileRows()}</div>`,foot:`<button class="btn pri" onclick="uploadFile()">${svg('plus')} 上傳文件</button><span class="note">${OP_LIVE?'已連線保存':'本頁記憶體 · 重整重置'}</span>`});
function fileRows(q=''){return fileList().filter(f=>(f.name+' '+f.tags).toLowerCase().includes(q.toLowerCase())).map(f=>`<div class="row" onclick="openDrawer('file','${f.id}')"><span class="chip c-i">${esc(f.category)}</span><span class="t">${esc(f.name)}</span><span class="m">v${f.versions.length}</span></div>`).join('')||'<div class="empty">尚無符合的文件</div>'}
function filterFiles(q){$('#fileList').innerHTML=fileRows(q)}
async function presignUpload(file){
 const res=await fetch('/api/company/operating/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,contentType:file.type,bytes:file.size})});
 if(!res.ok){const p=await res.json().catch(()=>({}));throw Error(p.error||'取得上傳網址失敗')}
 return res.json()
}
/** bytes 直接送 R2，不經過應用伺服器，也不進 diff。 */
async function putToR2(uploadUrl,file){
 const res=await fetch(uploadUrl,{method:'PUT',headers:file.type?{'Content-Type':file.type}:undefined,body:file});
 if(!res.ok)throw Error('上傳失敗（HTTP '+res.status+'）')
}
function uploadFile(existingId,after){const input=doc.createElement('input');input.type='file';input.accept='.md,.txt,.csv,.json,.png,.jpg,.jpeg,.webp,.pdf';input.setAttribute('aria-label','選擇本機文件');input.style.display='none';root.append(input);input.onchange=async()=>{const file=input.files?.[0];if(!file){input.remove();return}try{if(file.size>5*1024*1024)throw Error('檔案上限 5 MB');if(!/\.(md|txt|csv|json|png|jpe?g|webp|pdf)$/i.test(file.name))throw Error('不支援此格式');const isText=/\.(md|txt|csv|json)$/i.test(file.name);
 let text='',data='',objectKey='';
 if(isText){text=await file.text()}
 else if(OP_LIVE){toast('上傳中…');const signed=await presignUpload(file);await putToR2(signed.uploadUrl,file);objectKey=signed.objectKey}
 else{data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
 if(!active)return;let record=DB.files.find(f=>f.id===existingId);if(record&&record.author!==DB.me)throw Error('僅作者可新增版本');if(!record){record={id:nid('FILE'),name:file.name,category:'material',tags:'',space,author:DB.me,versions:[]};DB.files.push(record)}
 record.versions.push({id:nid('FV'),name:file.name,type:file.type,text,data,objectKey,bytes:file.size,at:nowts()});
 audit('文件',record.name,'版本','',record.versions.length);if(after)after(record);else openDrawer('file',record.id,true);toast(OP_LIVE?'文件已上傳':'文件已加入本頁記憶體')}catch(e){toast(esc(e.message))}finally{input.remove()}};input.click()}
/** 下載網址只有 5 分鐘，所以是要看的時候才換一張，不存進紀錄。 */
async function paintFilePreview(elementId,objectKey){
 try{const res=await fetch('/api/company/operating/uploads?key='+encodeURIComponent(objectKey));if(!res.ok)return;const {downloadUrl}=await res.json();const el=root.querySelector('#'+elementId);if(!el)return;
  if(el.tagName==='IMG')el.src=downloadUrl;else el.data=downloadUrl}
 catch{/* 離線或網址過期：維持佔位，不擋住抽屜其餘內容 */}
}

/** 預覽有三種來源：R2 物件、舊的 data URL、純文字。 */
function filePreviewHtml(f,v,index){
 if(v?.objectKey){
  const pid='filePrev-'+f.id+'-'+index;
  const isImage=/^image\//.test(v.type||'');
  setTimeout(()=>paintFilePreview(pid,v.objectKey),0);
  return isImage
   ? `<img id="${pid}" class="file-preview" alt="${esc(f.name)}">`
   : `<object id="${pid}" class="file-pdf" type="${esc(v.type||'application/pdf')}"><p>載入中…若未顯示，請重新開啟此文件</p></object>`;
 }
 if(v?.data?.startsWith('data:image/'))return `<img class="file-preview" src="${v.data}" alt="${esc(f.name)}">`;
 if(v?.data?.startsWith('data:application/pdf'))return `<object class="file-pdf" data="${v.data}" type="application/pdf"><p>此瀏覽器不支援 PDF 內嵌預覽</p></object>`;
 return `<pre class="file-text">${esc(v?.text||'')}</pre>`;
}
DRAWERS.file=id=>{const f=fileList().find(f=>f.id===id);if(!f)return{crumb:'文件',title:'找不到文件',body:'',foot:''};const index=S.fileVersion?.id===id?S.fileVersion.index:f.versions.length-1;const v=f.versions[index];return{crumb:f.name,title:esc(f.name),sub:'v'+(index+1)+' · '+v.at,body:`<div class="seg">${f.versions.map((v,i)=>`<button class="${index===i?'on':''}" onclick="S.fileVersion={id:'${id}',index:${i}};paintDrawer()">v${i+1}</button>`).join('')}</div><div class="frow" style="margin-top:12px"><label class="flab" for="fileTags">標籤</label><input id="fileTags" value="${esc(f.tags)}" ${f.author===DB.me?'':'disabled'} onchange="setFileTags('${id}',this.value)"></div><div class="frow"><label class="flab" for="fileCategory">分類</label><select id="fileCategory" ${f.author===DB.me?'':'disabled'} onchange="setFileCategory('${id}',this.value)">${['contract','proposal','material','yzedtech_brand'].map(c=>`<option ${c===f.category?'selected':''}>${c}</option>`).join('')}</select></div>${filePreviewHtml(f,v,index)}<div class="flab">反向引用</div>${DB.txns.filter(t=>(t.fileIds||[]).includes(id)).map(t=>`<div class="row" onclick="selectTxn('${t.id}',true)">${esc(t.t)}</div>`).join('')||'<div class="note">無交易引用</div>'}`,foot:f.author===DB.me?`<button class="btn pri" onclick="S.fileVersion=null;uploadFile('${id}')">上傳新版本</button>`:''}};
function setFileTags(id,tags){const f=fileList().find(f=>f.id===id);if(f?.author===DB.me)f.tags=tags}
function setFileCategory(id,category){const f=fileList().find(f=>f.id===id);if(f?.author===DB.me)f.category=category}
const originalVoucher=pickVoucher;
pickVoucher=id=>{if(!editable(TX(id)))return deny();openModal('加入原始憑證','可上傳本機影像／PDF／文件，或標記示例憑證類型。','',`<button class="btn pri" onclick="attachVoucher('${id}')">上傳憑證檔案</button>${['發票','收據','合約','匯款單','對帳單'].map(k=>`<button class="btn" onclick="closeModal();addVoucher('${id}','${k}')">${k}</button>`).join('')}`)};
function attachVoucher(id){closeModal();uploadFile(null,f=>{const t=TX(id);(t.fileIds??=[]).push(f.id);t.v.push('發票');render();openDrawer('txn',id,true)})}
function enhanceThread(){const t=DB.threads.find(t=>t.id===S.thread);if(!t)return;const composer=$('.composer');if(!composer)return;composer.insertAdjacentHTML('beforeend',`<button class="btn sm" onclick="uploadThreadFile('${t.id}')">附檔</button>`);const input=composer.querySelector('textarea');if(input){const key='thread:'+DB.me+':'+t.id;input.value=textDrafts.get(key)||'';input.addEventListener('input',()=>textDrafts.set(key,input.value));}}
function uploadThreadFile(id){uploadFile(null,f=>{const thread=DB.threads.find(t=>t.id===id);thread.files.push(f.name);(thread.fileIds??=[]).push(f.id);render()})}
const originalSendMsg=sendMsg;
sendMsg=id=>{originalSendMsg(id);textDrafts.delete('thread:'+DB.me+':'+id)};
const originalFreeze=freezeRepo;
freezeRepo=pid=>{const r=DB.repos[pid];if(!r)return;const snap=structuredClone({readme:r.readme,tree:r.tree,files:DB.files.filter(f=>(r.fileIds||[]).includes(f.id)).map(f=>({...f,versions:[f.versions.at(-1)]}))});originalFreeze(pid);const pending=_pendingOk;if(pending)_pendingOk=()=>{pending();if(r.frozen)(r.snapshots??=[]).push(snap)}};
function enhanceDrawer(){
 if(!S.stack.length)return;const cur=S.stack.at(-1);
 $('#drawer').setAttribute('aria-modal','true');
 if(cur.type==='txn'){const t=TX(cur.id);if(t?.fileIds?.length)$('#drBody').insertAdjacentHTML('beforeend',`<div class="flab" style="margin-top:12px">憑證檔案</div>${t.fileIds.map(id=>{const f=fileList().find(f=>f.id===id);return f?`<div class="row" onclick="openDrawer('file','${id}')">${esc(f.name)}<span class="m">v${f.versions.length}</span></div>`:''}).join('')}`);}
 if(cur.type==='issue')$('#drBody').insertAdjacentHTML('beforeend',panel('留言協作','',objectComments(cur.id)));
}
DB.objectComments=[];
function objectComments(id){const list=DB.objectComments.filter(x=>x.parent===id);return `${list.map(c=>`<div class="msg"><div class="bd"><div class="hd"><span class="nm">${person(c.w)}</span><span class="ts">${c.ts}</span></div><div class="tx">${esc(c.x)}</div></div></div>`).join('')}<div class="composer"><textarea id="objectReply" aria-label="物件留言" placeholder="留言…" oninput="textDrafts.set('object:'+DB.me+':${id}',this.value)">${esc(textDrafts.get('object:'+DB.me+':'+id)||'')}</textarea><button class="btn pri" onclick="sendObjectReply('${id}')">送出</button></div>`}
function sendObjectReply(id){const x=$('#objectReply').value.trim();if(!x)return;DB.objectComments.push({parent:id,w:DB.me,x,ts:nowts()});textDrafts.delete('object:'+DB.me+':'+id);paintDrawer()}
// Modal focus trapping and restoration use the same visual shell as the reference.
let overlayReturn=null;
const originalOpenDrawer=openDrawer,originalCloseDrawer=closeDrawer;
openDrawer=function(...args){overlayReturn=shadow.activeElement||overlayReturn;originalOpenDrawer(...args);wire();setTimeout(()=>$('#drawer').querySelector('input,textarea,select,button,[tabindex="0"]')?.focus(),0)};
closeDrawer=function(...args){originalCloseDrawer(...args);if(overlayReturn?.isConnected)overlayReturn.focus()};
const originalOpenModal=openModal,originalCloseModal=closeModal;
openModal=function(...args){overlayReturn=shadow.activeElement||overlayReturn;originalOpenModal(...args);$('#modalWrap .modal').setAttribute('role','dialog');$('#modalWrap .modal').setAttribute('aria-modal','true');$('#modalWrap .modal').setAttribute('aria-labelledby','mTitle');wire();setTimeout(()=>$('#modalWrap').querySelector('input,textarea,button')?.focus(),0)};
closeModal=function(){originalCloseModal();if(overlayReturn?.isConnected)overlayReturn.focus()};
const originalOpenCmdk=openCmdk,originalCloseCmdk=closeCmdk;
openCmdk=function(){overlayReturn=shadow.activeElement||overlayReturn;originalOpenCmdk()};closeCmdk=function(){originalCloseCmdk();if(overlayReturn?.isConnected)overlayReturn.focus()};
listen('keydown',event=>{if(event.key!=='Tab')return;const active=$('#modalWrap.on')||$('#cmdkWrap.on')||$('#drawer.on');if(!active)return;const els=[...active.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,select,[tabindex="0"]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');if(!els.length)return;const index=els.indexOf(shadow.activeElement);if(event.shiftKey&&(index<=0)){event.preventDefault();els.at(-1).focus()}else if(!event.shiftKey&&(index===els.length-1||index<0)){event.preventDefault();els[0].focus()}});
const originalSpark=vSpark;vSpark=(series,...args)=>series.length?originalSpark(series,...args):'';
const originalNewDay=newDay;newDay=()=>canWriteJournal()?originalNewDay():deny();
const originalStar=toggleStar;toggleStar=(id,event)=>editable(EVT(id))?originalStar(id,event):(event.stopPropagation(),deny());
const originalFormTxn=formTxn;
formTxn=id=>{originalFormTxn(id);if(id&&FORM&&DB.bank.some(b=>b.m===id)){const input=$('#f_amt');if(input){input.disabled=true;input.title='解除配對後可修改金額'}}};
const originalDelTxn=delTxn;delTxn=id=>DB.bank.some(b=>b.m===id)?toast('請先解除銀行配對，再刪除交易'):originalDelTxn(id);
// Contract-origin events retain their source and an explicit resolution log.
fulfilEvent=id=>{const e=EVT(id);if(!editable(e))return deny();openForm({crumb:'承諾事件',title:'記錄履行／協議變更',fields:[{k:'status',label:'處理方式',type:'chips',opts:['已履行','已協議變更'],req:true},{k:'why',label:'理由與證據',type:'textarea',req:true}],values:{status:'已履行',why:''},onSave:v=>commit('update','承諾事件',e.t,()=>{e.done=true;(e.logs??=[]).push({actor:DB.me,at:nowts(),status:v.status,text:v.why});return['原事件與條文來源保留',v.status+'：'+esc(v.why)]})})};
const originalEventDrawer=DRAWERS.event;DRAWERS.event=id=>{const out=originalEventDrawer(id),e=EVT(id);if(e?.logs?.length)out.body+=panel('履行紀錄','',e.logs.map(l=>`<div class="aud"><span class="who">${person(l.actor)}</span><div class="bd">${esc(l.status)} · ${esc(l.text)}</div><span class="ts">${l.at}</span></div>`).join(''));return out};
const originalRepoFile=formRepoFile;
formRepoFile=pid=>{const r=DB.repos[pid];if(r.frozen)return toast('此版本已凍結；請建立新版本');originalRepoFile(pid);FORM.fields.unshift({k:'fileId',label:'文件庫檔案',type:'select',opts:[['','（規劃中，尚未加入實際檔案）'],...fileList().map(f=>[f.id,f.name])]}, {k:'version',label:'固定檔案版本',type:'number'});FORM.values.fileId='';FORM.values.version=1;const save=FORM.onSave;FORM.onSave=v=>{const file=fileList().find(f=>f.id===v.fileId);if(file&&!file.versions[Number(v.version)-1])throw Error('不存在的文件版本');if(!v.f&&file)v.f=file.name;save(v);const entry=r.tree.at(-1);if(file){entry.fileId=file.id;entry.version=Number(v.version);entry.versionData=structuredClone(file.versions[entry.version-1]);entry.ok=true;(r.fileIds??=[]).push(file.id);}else entry.ok=false;render()};paintDrawer()};
const originalReadme=formReadme;formReadme=pid=>DB.repos[pid]?.frozen?toast('已凍結版本不能修改；可開始新版本'):originalReadme(pid);
const originalRepoChecks=repoChecks;repoChecks=pid=>{const checks=originalRepoChecks(pid),r=DB.repos[pid];for(const [i,dir]of[[1,'04_evidence'],[2,'05_finance'],[3,'06_retro']])checks[i][1]=r.tree.some(f=>f.dir===dir&&f.ok!==false);return checks};
const previousProjectView=VIEWS.project;
VIEWS.project=tab=>{let out=previousProjectView(tab);if(tab===3&&P(S.proj)&&DB.repos[S.proj]){const r=DB.repos[S.proj];out+=`<div class="source-actions" style="position:static;margin-top:12px"><button class="btn sm" onclick="openFiles()">文件庫與版本</button>${r.frozen?`<button class="btn sm" onclick="branchRepo('${S.proj}')">開始新版本</button>`:''}${r.snapshots?.length?`<button class="btn sm" onclick="viewRepoSnapshot('${S.proj}')">檢視凍結快照</button>`:''}</div>`;}return out};
function branchRepo(pid){const r=DB.repos[pid];if(!r?.frozen)return;commit('update','Evidence Repo',P(pid).t+' 新版本',()=>{r.frozen=false;r.version='v1.'+(r.snapshots?.length||1);r.versions.forEach(v=>v.st='past');r.versions.push({v:r.version,t:'新的整理版本',st:'now'});P(pid).repo=r.version;return['舊版本快照保持不變']})}
function viewRepoSnapshot(pid){const r=DB.repos[pid],snap=r.snapshots?.at(-1);if(!snap)return;openModal('凍結快照','已固定的 README 與檔案內容',`<pre class="file-text">${esc(snap.readme)}</pre><div class="tree">${snap.tree.map(f=>`<div class="ln"><span>${esc(f.dir+'/'+f.f)}</span><span class="cm">${f.version?'v'+f.version:''}</span></div>${f.versionData?.text?`<pre class="file-text">${esc(f.versionData.text)}</pre>`:''}`).join('')}</div>`,`<button class="btn" onclick="closeModal()">關閉</button>`)}
// Avoid moving the original body to accommodate additive tools.
const baseEnhanceView=enhanceView;
enhanceView=function(){baseEnhanceView();
 if(S.wb==='money'&&S.tab===0&&S.ledgerView==='表格')applyLedgerFilter();
 if(S.wb==='desk'&&S.tab===2||S.wb==='commit'){const a=$('#inner > .source-actions');if(a){a.classList.add('header-extra');$('#wbRule').replaceChildren(a)}}
 if(S.wb==='capacity'&&S.tab===3&&!DB.policy.normalHours){const first=$('.kpi');first.querySelector('.v').textContent=tsWeeks(isOwner()?S.tsWho:DB.me).length?first.querySelector('.v').textContent.split('/')[0]+' h':'—';first.querySelector('.s').textContent='尚未設定約定工時';}
 if(S.wb==='project'&&S.tab===3){const r=DB.repos[S.proj];if(r)root.querySelectorAll('.tree .f').forEach(el=>{const entry=r.tree.find(f=>f.f===el.textContent);if(entry?.fileId){el.onclick=()=>{S.fileVersion={id:entry.fileId,index:entry.version-1};openDrawer('file',entry.fileId)};}});}
};
// Keep command palette entries consistent with the original {t,h,ic,run} contract.
const completeCmdk=buildCmdk;buildCmdk=()=>completeCmdk().map(item=>({...item,h:item.h||item.s||'',ic:item.ic||'goto'}));
const originalStatus=setIssueStatus;
const initialCompleted=DB.issues.filter(i=>i.done&&i.done>=dadd(TODAY,-6)).length;
const initialWeekValue=DB.weekly.at(-1)?.[1]||0;
setIssueStatus=(id,status)=>{originalStatus(id,status);const n=DB.issues.filter(i=>i.done&&i.done>=dadd(TODAY,-6)).length;if(DB.weekly.length)DB.weekly.at(-1)[1]=Math.max(0,initialWeekValue+n-initialCompleted);else if(n)DB.weekly.push([TODAY,n]);render()};
const lastSwitchUser=switchUser;switchUser=()=>{lastSwitchUser();$('#toasts').replaceChildren();textDrafts.forEach((v,k)=>{if(k.startsWith('object:'))textDrafts.delete(k)})};
const previousEnhanceDrawer=enhanceDrawer;
enhanceDrawer=function(){previousEnhanceDrawer();const cur=S.stack.at(-1);if(!cur)return;const item=cur.type==='issue'?ISS(cur.id):cur.type==='txn'?TX(cur.id):cur.type==='project'?P(cur.id):cur.type==='event'?EVT(cur.id):null;if(item&&!editable(item)){
 for(const btn of $('#drBody').querySelectorAll('.miniact,.cfs button,.flab button')){btn.disabled=true;btn.title='僅作者可編輯'}
 for(const btn of $('#drFoot').querySelectorAll('button')){if(btn.textContent.includes('編輯')||btn.classList.contains('dgr')){btn.disabled=true;btn.title='僅作者可編輯'}if(btn.textContent.includes('推進')&&!progressable(item)){btn.disabled=true;btn.title='僅作者或負責人更新進度'}}
 }};
// Sensitive finance is shown only for the actor's participating projects, including search/drawers.
function canSeeTxn(t){return isOwner()||t.author===DB.me||myProjects().includes(t.p)}
const financialView=VIEWS.money;
VIEWS.money=tab=>{if(isOwner())return financialView(tab);const all=DB.txns;DB.txns=all.filter(canSeeTxn);try{return financialView(tab)}finally{DB.txns=all}};
const financialSearch=buildCmdk;buildCmdk=()=>{const all=DB.txns;DB.txns=all.filter(canSeeTxn);try{return financialSearch()}finally{DB.txns=all}};
const transactionDrawer=DRAWERS.txn;DRAWERS.txn=id=>{const t=TX(id);return t&&!canSeeTxn(t)?{crumb:'交易',title:'此明細限參與者查看',sub:'',body:'',foot:''}:transactionDrawer(id)};
// Keyboard shortcuts also work before focus has entered the shadow workbench.
doc.addEventListener('keydown',e=>{if(!e.defaultPrevented&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCmdk()}},{signal:controller.signal});
doc.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.composedPath().includes(root))return;if($('#cmdkWrap.on'))closeCmdk();else if($('#modalWrap.on'))closeModal();else if(S.stack.length)closeDrawer()},{signal:controller.signal});
const originalLedgerEnhance=enhanceLedger;
enhanceLedger=function(){originalLedgerEnhance();for(const cell of root.querySelectorAll('td[aria-label^="編輯 "]')){const edit=cell.ondblclick;let timer;cell.onclick=e=>{if(e.target.tagName==='INPUT')return;e.stopPropagation();clearTimeout(timer);const id=cell.closest('tr').dataset.tx;timer=setTimeout(()=>selectTxn(id),240)};cell.ondblclick=e=>{clearTimeout(timer);edit(e)}}};
const currentReconcile=reconView;reconView=()=>{const out=currentReconcile();return !DB.bank.length&&!DB.txns.length?out.replace('三本帳已對平','尚無內帳與銀行明細'):out};
const openedDrawer=openDrawer,closedDrawer=closeDrawer;
openDrawer=(...args)=>{$('#drawer').inert=false;openedDrawer(...args)};closeDrawer=(...args)=>{closedDrawer(...args);$('#drawer').inert=true};
$('#drawer').inert=true;
const allocationForm=formAlloc;
formAlloc=who=>{if(DB.capacity[who].length)return allocationForm(who);if(who!==DB.me)return deny();const categories=who==='lily'?['Client Delivery','Marketing 方法資產','Internal 試驗','Buffer']:['Client Delivery','Product','Research','Management','Buffer'];openForm({crumb:'週容量',title:'Weekly Capacity · '+person(who),fields:categories.map((c,i)=>({k:'a'+i,label:c+' %',type:'number',req:true})),values:Object.fromEntries(categories.map((c,i)=>['a'+i,0])),onSave:v=>{const values=categories.map((c,i)=>+v['a'+i]);if(values.some(n=>n<0||n>100)||values.reduce((a,b)=>a+b,0)!==100)throw Error('每項 0–100%，合計須為 100%');commit('create','週配置',person(who),()=>{DB.capacity[who]=categories.map((c,i)=>[c,values[i],null]);return['週配置合計 100%']})}})};
const spaceSwitch=switchSpace;switchSpace=next=>{spaceSwitch(next);$('#toasts').replaceChildren()};
const originalStamp=stampAuthors;
stampAuthors=function(){originalStamp();DB.txns.forEach(t=>{t.quantity??=1;t.unitPrice??=t.amt})};stampAuthors();
const formulaForm=formTxn;
formTxn=id=>{formulaForm(id);if(!FORM||!$('#drawer.on'))return;FORM.fields.splice(4,0,{k:'quantity',label:'數量（B）',type:'number',half:true},{k:'unitPrice',label:'單價（C）',type:'number',half:true});const row=TX(id);FORM.values.quantity=row?.quantity??1;FORM.values.unitPrice=row?.unitPrice??0;const save=FORM.onSave;FORM.onSave=v=>{const number=row?.ledgerRow||DB.seq.ledger+1,cells=ledgerCells();cells['D'+number]=v.amt;cells['B'+number]=+v.quantity;cells['C'+number]=+v.unitPrice;const result=evaluateFormula(String(v.amt),cells,new Set(['D'+number]));if(result.error)throw Error(result.error);if(row&&DB.bank.some(b=>b.m===id)&&(String(v.amt)!==String(row.formula??row.amt)||+v.quantity!==row.quantity||+v.unitPrice!==row.unitPrice))throw Error('請先解除銀行配對');if(row){row.quantity=+v.quantity;row.unitPrice=+v.unitPrice;}save(v);const target=row||TX(S.selTxn);if(target){target.quantity=+v.quantity;target.unitPrice=+v.unitPrice;recalcLedger();render()}};paintDrawer();if(row&&DB.bank.some(b=>b.m===id))for(const k of ['amt','quantity','unitPrice'])$('#f_'+k).disabled=true;};
const inlineEdit=editLedgerCell;
editLedgerCell=(id,field,value)=>{if(field==='amt'){const t=TX(id),cells=ledgerCells();cells['D'+t.ledgerRow]=value;const r=evaluateFormula(value,cells,new Set(['D'+t.ledgerRow]));if(r.error)return toast(r.error)}return inlineEdit(id,field,value)};
const originalScatter=vScatter;
vScatter=()=>DB.history.length||DB.issues.some(i=>i.started&&i.done)?originalScatter():emptyPanel('Cycle Time 散布圖','','尚無完成樣本，P50／P85 暫不計算');
freezeRepo=pid=>{const r=DB.repos[pid];if(!r||r.frozen)return;const checks=repoChecks(pid);if(checks.some(c=>!c[1]))return toast('請先完成全部結案檢查');const version=r.snapshots?.length?r.version:'v1.0';typeToConfirm('標記 '+version+' 並凍結？','此版本保留固定 README、檔案版本與內容。後續修改請建立新版本。',version,()=>{const snapshot=structuredClone({version,readme:r.readme,tree:r.tree});commit('update','Evidence Repo',P(pid).t+' → '+version,()=>{(r.snapshots??=[]).push(snapshot);r.frozen=true;r.version=version;r.versions.forEach(v=>v.st='past');r.versions.push({v:version,t:'驗收通過 · 凍結 '+TODAY,st:'now'});P(pid).repo=version;P(pid).status='已結案';return['固定版本快照已保留於本頁記憶體','專案狀態已更新']})})};
const archive=archivePending;archivePending=(pid,index)=>DB.repos[pid]?.frozen?toast('已凍結版本不能修改'):archive(pid,index);
const projectVersionView=VIEWS.project;VIEWS.project=tab=>{const out=projectVersionView(tab),r=DB.repos[S.proj];return tab===3&&r?.version?.startsWith('v1.')&&r.version!=='v1.0'?out.replaceAll('v1.0',r.version):out};
const deleteCommitLog=delLog;delLog=(id,index)=>{const c=CMT(id),l=c?.logs[index];if(!l||(l.author||c.owner)!==DB.me)return deny();deleteCommitLog(id,index)};
listen('paste',event=>{const editableElement=event.target.closest('[contenteditable="true"]');if(!editableElement)return;event.preventDefault();const text=event.clipboardData.getData('text/plain');const selected=selection();if(!selected?.rangeCount)return;const range=selected.getRangeAt(0);if(!editableElement.contains(range.commonAncestorContainer))return;range.deleteContents();const node=doc.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selected.removeAllRanges();selected.addRange(range);editableElement.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:text}));});
function highlightSummon(){root.querySelectorAll('.summon-i').forEach((el,i)=>el.classList.toggle('on',i===SM.sel))}
function highlightCommand(){root.querySelectorAll('.cmdk-i').forEach((el,i)=>el.classList.toggle('on',i===cmdkSel))}
const scopeEnhance=enhanceView;
enhanceView=function(){scopeEnhance();if(isOwner())return;
 if(S.wb==='project'&&S.tab===0&&!can('projectFinance',S.proj)){const panel=[...root.querySelectorAll('.panel')].find(p=>p.querySelector('h3')?.textContent==='錢');if(panel)panel.querySelector('.panel-b').innerHTML=MASK('專案財務限參與者查看');}
 if(S.wb==='money'&&S.tab===5)root.querySelectorAll('table.tbl tbody tr').forEach(row=>{const p=DB.projects.find(p=>p.t===row.firstElementChild?.textContent);if(p&&!can('budget',p.id))row.remove()});
};
const scopeDrawer=enhanceDrawer;
enhanceDrawer=function(){scopeDrawer();const cur=S.stack.at(-1);if(cur?.type==='project'&&!can('projectFinance',cur.id))$('#drBody').querySelectorAll('.fld').forEach(field=>{if(['未稅收入','可分配毛利'].includes(field.querySelector('.k')?.textContent))field.querySelector('.v').innerHTML=MASK('專案財務限參與者查看')});};
// Team backlinks include both authors while private backlinks stay inside the private journal.
const authorBacklinks=backlinks;
backlinks=function(type,id){const originalAuthor=journalAuthor;if(space==='personal')return authorBacklinks(type,id).filter(b=>b.kind==='journal');const out=[];try{for(const who of Object.keys(DB.people)){journalAuthor=who;const links=authorBacklinks(type,id);out.push(...links.filter(b=>b.kind==='journal').map(b=>({...b,jump:()=>{switchJournalAuthor(who);b.jump()}})));if(who==='yz')out.push(...links.filter(b=>b.kind==='thread'));}}finally{journalAuthor=originalAuthor}return out};
/* ── 多租戶身分邊界 ───────────────────────────────────────────────────────────
   DB.me 已由伺服器依登入 email 決定（src/lib/auth/yuanzhan-actor.ts）。
   這一層只做兩件事：不讓介面把身分換掉，以及讓人看得到「我是誰、邊界在哪」。
   initialState.viewer 為 null 時（ui:yuanzhan:showcase、驗證腳本）維持原型行為。
   ───────────────────────────────────────────────────────────────────────── */
const VIEWER=initialState.viewer||null;
function canSwitchActor(){return !VIEWER||VIEWER.canSwitchActor===true}
if(VIEWER&&!isOwner())S.proj=myProjects()[0]||S.proj;
const seatSwitchUser=switchUser;
/* 右上角現在是帳號選單；真正換視角只從選單裡的「切換視角」進入（共用帳號限定）。 */
switchUser=function(){openAccountMenu()};
function switchActorView(){closeAccountMenu();if(!canSwitchActor())return openAccountCard();return seatSwitchUser()}
function openAccountCard(){
 const owner=isOwner();
 openModal('登入身分',esc(VIEWER.email),
  `<div class="fld"><div class="k">工作台身分</div><div class="v"><span class="av ${ME().cls}">${ME().s}</span> ${esc(person(DB.me))}　<span class="chip ${owner?'c-o':'c-i'}">${owner?'負責人':'員工'}</span></div></div>
   <div class="fld"><div class="k">看得到什麼</div><div class="v">${owner?'公司全部資料，含現金部位、他人薪資與稽核軌跡。':'自己參與的專案、自己的薪資與出勤；其餘依契約 §18 保密、§20.4 資安遮蔽並標示原因。'}</div></div>
   <div class="fld"><div class="k">視角切換</div><div class="v">已關閉：身分由登入帳號決定。要看另一個人的視角，請用那個帳號登入。</div></div>`,
  `<form method="post" action="/auth/signout" style="display:inline"><button class="btn" type="submit">登出並換帳號</button></form><button class="btn pri" onclick="closeModal()">知道了</button>`);
}
const seatPaintUser=paintUser;
paintUser=function(){seatPaintUser();const btn=$('#userBtn');if(!btn)return;
 btn.title=VIEWER?`帳號與設定 · ${person(DB.me)}（${isOwner()?'負責人':'員工'}）· ${VIEWER.email}`:'帳號與設定（介面示例）';
 btn.dataset.seat=VIEWER?(canSwitchActor()?'shared':'bound'):'demo';
};
/* ── 帳號選單與設定 ──────────────────────────────────────────────────────────
   右上角從「我是誰」長成 SaaS 常見的帳號選單：基礎設定、個人設定、
   組織設定（只有負責人席位看得到）。值存在 Postgres，走 /api/company/settings；
   initialState.settings 為 null 時（介面示例）只顯示唯讀說明，不假裝存得住。
   ─────────────────────────────────────────────────────────────────────────── */
let SETTINGS=initialState.settings?structuredClone(initialState.settings):null;
const SECTION_META={basic:{t:'基礎設定',s:'這台工作台怎麼呈現。只影響你自己。',i:'bolt'},personal:{t:'個人設定',s:'你的工作習慣。只影響你自己。',i:'journal'},org:{t:'組織設定',s:'全公司共用一份，只有負責人改得動。',i:'lock'}};
const DEFAULT_CATALOG=[
 {key:'ui.theme',section:'basic',kind:'enum',label:'佈景主題',help:'工作台視覺主題。白色為清爽中性亮色，橘色為暖米亮色，黑色為經典深色，品牌為圓展企業 CI。',defaultValue:'black',options:[{value:'white',label:'白'},{value:'orange',label:'橘'},{value:'black',label:'黑'},{value:'brand',label:'品牌'}]},
 {key:'ui.density',section:'basic',kind:'enum',label:'介面密度',help:'同一畫面要放多少資訊。密集適合對帳與表格，寬鬆適合長時間書寫。',defaultValue:'comfortable',options:[{value:'comfortable',label:'寬鬆'},{value:'compact',label:'密集'}]},
 {key:'ui.landingWorkbench',section:'basic',kind:'enum',label:'登入後先到哪裡',help:'每天打開系統時的第一個畫面。',defaultValue:'journal',options:[{value:'journal',label:'日誌'},{value:'desk',label:'工作台'},{value:'project',label:'專案'},{value:'money',label:'金流'},{value:'capacity',label:'容量'},{value:'commit',label:'承諾'}]},
 {key:'profile.displayName',section:'personal',kind:'text',label:'工作台顯示名稱',help:'留空就用預設名稱。這個名字會出現在右上角、留言與稽核軌跡上。',defaultValue:'',maxLength:40,placeholder:'例如：宇星'},
 {key:'journal.defaultSpace',section:'personal',kind:'enum',label:'日誌預設空間',help:'個人空間只有自己看得到；圓展空間是輸入即讓團隊看見。',defaultValue:'team',options:[{value:'team',label:'圓展空間'},{value:'personal',label:'個人空間'}]},
 {key:'calendar.googleSyncScope',section:'personal',kind:'enum',label:'Google 行事曆同步範圍',help:'之後接上 Google 行事曆時，只同步標題或說明裡 @提及你、或完全沒有標記任何人（全體）的事件；對方專屬的事件不會帶出去。',defaultValue:'mine',options:[{value:'mine',label:'只同步與我相關'},{value:'all',label:'同步全部事件'}]}
];
const settingsCatalog=()=>(SETTINGS&&SETTINGS.catalog&&SETTINGS.catalog.length)?SETTINGS.catalog:DEFAULT_CATALOG;
const settingField=key=>settingsCatalog().find(f=>f.key===key)||null;
function settingValue(key){
 if(key==='ui.theme'){
  try{const t=localStorage.getItem('company-theme');if(t)return t}catch(e){}
 }
 const f=settingField(key);if(!f)return undefined;
 const bag=SETTINGS?SETTINGS[f.section]:null;
 return bag&&key in bag?bag[key]:f.defaultValue;
}
const canSeeOrgSettings=()=>!!(SETTINGS&&SETTINGS.orgEditable);
const settingsSections=()=>['basic','personal'].concat(canSeeOrgSettings()?['org']:[]);
function accountMenuHtml(){
 const owner=isOwner(),who=VIEWER?VIEWER.email:'介面示例（未登入）';
 const curTheme=settingValue('ui.theme')||'black';
 const themeItem=`<div class="acct-theme-row" style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text-2);font-weight:500">佈景主題</span><div class="seg">${[['white','白'],['orange','橘'],['black','黑'],['brand','品牌']].map(([t,l])=>`<button class="${curTheme===t?'on':''}" onclick="saveSetting('ui.theme','${t}')">${l}</button>`).join('')}</div></div>`;
 const item=(sec)=>`<button class="acct-i" onclick="openSettings('${sec}')">${svg(SECTION_META[sec].i,15)}<span><b>${SECTION_META[sec].t}</b><em>${esc(SECTION_META[sec].s)}</em></span></button>`;
 return `<div class="acct-h"><span class="av ${ME().cls}">${ME().s}</span><span class="acct-id"><b>${esc(person(DB.me))}</b><em>${esc(who)}</em></span><span class="chip ${owner?'c-o':'c-i'}">${owner?'負責人':'員工'}</span></div>
 ${themeItem}
 ${settingsSections().map(item).join('')}
 <button class="acct-i" onclick="closeAccountMenu();openAccountCard()">${svg('lock',15)}<span><b>登入身分與可見性</b><em>我是誰、看得到什麼、為什麼</em></span></button>
 ${VIEWER&&canSwitchActor()?`<div class="acct-sep"></div><button class="acct-i" onclick="switchActorView()">${svg('copy',15)}<span><b>切換視角</b><em>共用帳號限定：看員工實際看得到什麼</em></span></button>`:''}
 <div class="acct-sep"></div>
 <form method="post" action="/auth/signout"><button class="acct-i" type="submit">${svg('goto',15)}<span><b>登出</b><em>${VIEWER?'回到登入頁，可換另一個帳號':'展示模式'}</em></span></button></form>`;
}
function openAccountMenu(){
 if($('#acctMenu'))return closeAccountMenu();
 const btn=$('#userBtn');if(!btn)return;
 const r=btn.getBoundingClientRect();
 const scrim=document.createElement('div');scrim.className='acctscrim';scrim.id='acctScrim';
 scrim.addEventListener('click',()=>closeAccountMenu());
 const el=document.createElement('div');el.className='acctmenu';el.id='acctMenu';
 el.style.top=(r.bottom+8)+'px';el.style.right=Math.max(8,window.innerWidth-r.right)+'px';
 el.innerHTML=accountMenuHtml();
 root.appendChild(scrim);root.appendChild(el);
}
function closeAccountMenu(){const m=$('#acctMenu'),s=$('#acctScrim');if(m)m.remove();if(s)s.remove()}
function openSettings(sec){closeAccountMenu();openDrawer('settings',settingsSections().includes(sec)?sec:'basic',true)}
const cssKey=key=>key.replace(/[^a-zA-Z0-9]/g,'_');
function settingRow(field){
 const v=settingValue(field.key),locked=field.section==='org'&&!canSeeOrgSettings();
 let control;
 if(locked)control=MASK('僅負責人可調整');
 else if(field.kind==='enum')control=`<div class="seg">${field.options.map(o=>`<button class="${v===o.value?'on':''}" onclick="saveSetting('${field.key}','${o.value}')">${esc(o.label)}</button>`).join('')}</div>`;
 else if(field.kind==='boolean')control=`<div class="seg"><button class="${v===true?'on':''}" onclick="saveSetting('${field.key}',true)">開</button><button class="${v===false?'on':''}" onclick="saveSetting('${field.key}',false)">關</button></div>`;
 else control=`<div class="setrow-edit"><input id="set_${cssKey(field.key)}" class="cell-editor" maxlength="${field.maxLength}" placeholder="${esc(field.placeholder||'')}" value="${esc(String(v==null?'':v))}"><button class="btn sm" onclick="saveSettingFromInput('${field.key}')">儲存</button></div>`;
 return `<div class="setrow"><div class="setrow-k"><b>${esc(field.label)}</b>${field.clause?`<span class="chip c-i">${esc(field.clause)}</span>`:''}${field.help?`<em>${esc(field.help)}</em>`:''}</div><div class="setrow-v">${control}</div></div>`;
}
function saveSettingFromInput(key){const el=$('#set_'+cssKey(key));if(el)saveSetting(key,el.value)}
function applySetting(key,value){
 if(key==='ui.theme'){
  try{localStorage.setItem('company-theme',value)}catch(e){}
  const host=root.getRootNode()?.host;
  if(host){
   host.dataset.theme=value;
   host.style.background=value==='white'?'#ffffff':value==='orange'?'#fff8f1':value==='brand'?'#0b1f3a':'#0a0c0f';
  }
  window.dispatchEvent(new StorageEvent('storage',{key:'company-theme',newValue:value}));
  window.dispatchEvent(new CustomEvent('yz:themechange',{detail:{theme:value}}));
 }
 if(key==='ui.density'){S.compact=value==='compact';root.classList.toggle('compact',S.compact);const b=$('#densBtn');if(b)b.classList.toggle('on',S.compact)}
 if(key==='profile.displayName'&&VIEWER){DB.people[DB.me].n=String(value||'').trim()||VIEWER.defaultName||DB.people[DB.me].n;paintUser()}
 if(key==='journal.defaultSpace'&&value!==space){saveJournalDraft();space=value;journalAuthor=DB.me;UNDO=[];REDO=[];renderRail()}
 if(key==='org.displayName'){const b=root.querySelector('.brand b');if(b)b.textContent=String(value||'圓展 Operating System')}
}
async function saveSetting(key,value){
 const field=settingField(key);if(!field)return;
 if(key==='ui.theme')applySetting(key,value);
 if(!SETTINGS){
  repaintSettings();render();
  return toast(`展示模式：已套用 <b>${esc(field.label)}</b>`);
 }
 if(field.section==='org'&&!canSeeOrgSettings())return deny();
 const previous=settingValue(key);
 if(previous===value)return;
 SETTINGS[field.section][key]=value;applySetting(key,value);repaintSettings();
 try{
  const res=await fetch('/api/company/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value})});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(payload.error||'設定沒有存起來。');
  if(payload.settings)SETTINGS=Object.assign({},payload.settings,{catalog:SETTINGS.catalog});
  toast(`已儲存：<b>${esc(field.label)}</b>`+(key==='org.dataMode'?'　重新整理後生效':key==='ui.landingWorkbench'?'　下次登入生效':''));
 }catch(err){
  SETTINGS[field.section][key]=previous;applySetting(key,previous);
  toast(esc(err.message||'設定沒有存起來。'));
 }
 repaintSettings();render();
}
function repaintSettings(){if(S.stack.length&&S.stack[S.stack.length-1].type==='settings')paintDrawer()}
function visibilityRulesHtml(){
 const rows=[['公司現金部位與 runway','僅負責人','§18'],['其他客戶的專案與金額','僅負責人','§18'],['自己參與專案的收入與成本','負責人＋該專案參與者','§9.6'],['他人薪資與獎金','僅負責人','§18'],['自己的薪資、出勤與報帳','本人（發薪後鎖定）','勞基 §30'],['銀行對帳','僅負責人','§18'],['稽核軌跡','僅負責人','§18'],['工作負荷資料作為考核依據','禁止，任何人都不行','§20.4']];
 return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>資料</th><th>誰看得到</th><th>依據</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="k">${esc(r[0])}</td><td>${esc(r[1])}</td><td><span class="chip c-i">${esc(r[2])}</span></td></tr>`).join('')}</tbody></table></div><div class="note" style="margin-top:8px">這些規則寫在 runtime 的 <b>can()</b> 裡，依登入身分生效；看不到的東西會標示原因，而不是把選單藏起來。</div>`;
}
function orgSeatsHtml(){
 const seats=SETTINGS&&SETTINGS.seats||[];
 return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>登入 email</th><th>工作台身分</th><th>角色</th></tr></thead><tbody>${seats.map(s=>`<tr><td class="k">${esc(s.email)}</td><td>${esc(DB.people[s.actor]?DB.people[s.actor].n:s.actor)}</td><td><span class="chip ${s.role==='owner'?'c-o':'c-i'}">${s.role==='owner'?'負責人':'員工'}</span>${s.canSwitchActor?'<span class="chip c-n">共用帳號</span>':''}</td></tr>`).join('')||'<tr><td colspan="3">尚無席位</td></tr>'}</tbody></table></div><div class="note" style="margin-top:8px">席位目前來自環境變數 <b>YUANZHAN_SEATS</b>（<code>email:actor[:switch]</code>）。新增一個人＝加一列並重啟，之後這張表會變成可直接編輯的成員管理。</div>`;
}
function orgAuditHtml(){
 return fld('稽核筆數（本頁）',`${DB.audit.length} 筆`)+fld('你的登入方式',esc(VIEWER?VIEWER.email:'介面示例'))+fld('組織設定最後更新',SETTINGS&&SETTINGS.orgUpdatedAt?esc(SETTINGS.orgUpdatedAt.slice(0,19).replace('T',' ')):'尚未有人改過')+
 `<div class="note" style="margin-top:8px">設定的變更會記在 <b>organization_settings.updated_by_id / updated_at</b>，查得到是誰改的。工作台內的稽核軌跡目前只存在這次瀏覽的記憶體裡，尚未落資料庫。</div>
 <div style="margin-top:10px"><button class="btn sm" onclick="closeDrawer();openAudit()">${svg('clock',13)} 開啟稽核軌跡</button></div>`;
}
function orgSourcesHtml(){
 return fld('資料模式',esc(initialState.mode))+fld('fixture 版本',esc(initialState.fixtureVersion))+fld('契約與文件',`${DB.docs.length} 份：${esc(DB.docs.map(d=>d.t).join('、'))||'—'}`)+fld('專案／工作／帳本',`${DB.projects.length} ／ ${DB.issues.length} ／ ${DB.txns.length} 筆`)+
 `<div class="note" style="margin-top:8px">這些營運資料目前仍是合成 fixtures，只活在這次瀏覽中；設定本身才是已經落 Postgres 的部分。</div>`;
}
DRAWERS.settings=section=>{
 const sec=settingsSections().includes(section)?section:'basic';
 const meta=SECTION_META[sec];
 const fields=settingsCatalog().filter(f=>f.section===sec);
 const tabs=`<div class="seg" style="margin-bottom:12px">${settingsSections().map(s=>`<button class="${s===sec?'on':''}" onclick="openSettings('${s}')">${SECTION_META[s].t}</button>`).join('')}</div>`;
 const warn=!SETTINGS?`<div class="permbar">${svg('lock',13)}<div>介面示例沒有登入帳號，這裡的設定只是唯讀展示。</div></div>`:SETTINGS.degraded?`<div class="permbar">${svg('lock',13)}<div>現在顯示的是預設值：設定資料表還沒建立或資料庫讀不到。在專案根目錄執行 <b>pnpm db:migrate</b> 之後就會存得住。</div></div>`:'';
 const body=tabs+warn+`<div class="setlist">${fields.map(settingRow).join('')}</div>`+
  (sec==='org'?`<div style="height:14px"></div>${panel('成員與席位','登入 email 決定工作台身分',orgSeatsHtml())}<div style="height:12px"></div>${panel('可見性規則','契約 §18／§20 實際生效的樣子',visibilityRulesHtml())}<div style="height:12px"></div>${panel('稽核軌跡與安全','誰在何時改了什麼',orgAuditHtml())}<div style="height:12px"></div>${panel('公司資料來源','工作台現在讀的是什麼',orgSourcesHtml())}`:'');
 return{crumb:'設定',title:meta.t,sub:meta.s,body,
  foot:`<div class="note" style="padding:0 2px">基礎與個人設定存在你自己的帳號下；組織設定全公司共用一份，只有負責人席位寫得動——這個邊界在伺服器的 service 層，不是只把按鈕變灰。</div>`};
};
/* 組織設定可以關掉「員工看得到負責人的週配置」；關掉時容量頁只留自己那一欄。 */
const settingsEnhance=enhanceView;
enhanceView=function(){settingsEnhance();
 if(isOwner()||settingValue('org.memberSeesOwnerCapacity')!==false)return;
 root.querySelectorAll('.panel').forEach(p=>{const h=p.querySelector('h3');if(h&&h.textContent.indexOf('Weekly Capacity')===0&&h.textContent.indexOf(person(DB.me))<0)p.remove()});
};
/* 已存的設定在第一次繪製前就套用，避免畫面先閃一下預設值。 */
function applyStoredSettings(){
 const th=settingValue('ui.theme');
 if(th&&['white','orange','black','brand'].includes(th)){
  try{localStorage.setItem('company-theme',th)}catch(e){}
  const host=root.getRootNode()?.host;
  if(host){
   host.dataset.theme=th;
   host.style.background=th==='white'?'#ffffff':th==='orange'?'#fff8f1':th==='brand'?'#0b1f3a':'#0a0c0f';
  }
 }
 if(!SETTINGS)return;
 if(settingValue('ui.density')==='compact'){S.compact=true;root.classList.add('compact');const b=$('#densBtn');if(b)b.classList.add('on')}
 const wb=settingValue('ui.landingWorkbench');if(wb&&VIEWS[wb]){S.wb=wb;S.tab=0}
 if(settingValue('journal.defaultSpace')==='personal'){space='personal';journalAuthor=DB.me}
 const orgName=settingValue('org.displayName');const brand=root.querySelector('.brand b');
 if(brand&&orgName)brand.textContent=String(orgName);
}
applyStoredSettings();
