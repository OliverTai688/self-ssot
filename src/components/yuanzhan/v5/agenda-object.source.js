/* 議題物件（提案 B）—— 把「今日議題」從一行上的旗標，升格成系統裡的一個物件。
 *
 * 為什麼是物件而不是把欄位長在 todayIssues 上：
 *   todayIssues 在 Prisma 是型別化欄位（blockId/text/onDate/flaggedAt/doneAt/deferred），
 *   多加一個到期日或討論串都要改 schema 與遷移。docObjects 則帶一個 payload JSON 欄位，
 *   議題需要的到期日、帶過紀錄、討論、附件全部塞得進去，不動 schema。
 *   而且召喚、參考碼（RES-018）、物件索引、獨立頁面、回到來源行這幾套都已經寫好，
 *   議題本來就是唯一沒被物件化的標記 —— 補上它是讓系統一致，不是長出新機制。
 *
 * 兩層（研究依據：GitHub sub-issues 的「升格是明確動作」）：
 *   L1 = 既有的 `!今天`，一行、一天、標記與完成，什麼都不用填。
 *   L2 = 這裡的議題物件。`!議題`／`#議題` 直接建立，或從右欄把 L1 升格上來。
 *
 * 範圍取「節點＋子樹」（研究依據：Workflowy／Tana 的節點語意）：
 *   標在母行上，底下縮排的子項自動屬於同一個議題，不需要多選手勢。
 */

/* ---------- 型別註冊 ---------- */

// DOC_METAS 一註冊，物件索引的型別 facet（Object.keys(DOC_METAS)）就自動多一格，不必另外接線。
DOC_METAS.agenda = {
  k: 'agenda', nm: '議題', chip: 'c-w', color: 'var(--rq-warn,#f0924f)',
  secs: ['內文', '結論'],
  placeholders: [
    '今天要處理掉的是什麼；# 召喚、@ 引用在這裡照常可用...',
    '結論、決定與下一步 —— 結案前一定要寫...'
  ]
};
// TPL 是 applySummon 判斷「這是文件模板」的依據；SUMMON 是 # 選單的來源。
TPL.agenda = { h: '議題', secs: ['內文', '結論'] };
SUMMON[0].items.push({ k: 'agenda', nm: '議題', ds: '今天要處理的一件事 · 可排期、討論、附檔、結案', ic: 'flag' });

/* ---------- 狀態存取 ---------- */

const agDrafts = new Map();

/** 議題專屬狀態全部收在 doc.agenda 一個物件裡，保存時原樣進 payload.agenda。 */
function agState(d) {
  const st = (d.agenda ??= { due: '', bornDay: d.day || TODAY, carried: [], doneAt: 0, watcher: '', msgs: [], files: [], fileIds: [], issueId: '' });
  // 讀回舊資料時 payload 裡沒有這三個欄位。payload.agenda 沒有 schema 層驗證，
  // 缺欄位一律在這裡補預設，不要散在各個讀取點。
  if (st.owner === undefined) st.owner = '';
  if (st.assigner === undefined) st.assigner = '';
  // 指派通知：assignedAt 是被指派的時刻，assignSeenAt 是對方看過的時刻。
  // 通知匣本來就是從既有資料推導的（沒有自己的表），這兩個時間戳讓任務也能這樣推導。
  if (st.assignedAt === undefined) st.assignedAt = 0;
  if (st.assignSeenAt === undefined) st.assignSeenAt = 0;
  return st;
}
function agIs(d) { return !!d && d.type === 'agenda'; }
/** 有負責人就是任務，沒有就是議題 —— 同一個物件的兩種狀態，不是兩個型別。 */
function agIsTask(d) { return !!agState(d).owner; }
/** 實際扛著這件事的人：指派了就是負責人，沒指派就回到作者。 */
function agResponsible(d) { return agState(d).owner || d.author; }
/**
 * 狀態一律推導，不存 status 欄位 —— 存了就會出現「已完成但到期日還在未來」這種
 * 自己跟自己打架的資料。順序有意義：結案 > 沒負責人 > 逾期 > 有討論 > 待辦。
 */
function agTaskState(d) {
  const st = agState(d);
  if (st.doneAt) return 'done';
  if (!st.owner) return 'issue';           // 議題不進逾期計算
  if (st.due && st.due < TODAY) return 'over';
  if (st.msgs.length) return 'doing';
  return 'todo';
}
const AG_STATE_LABEL = { done: '已完成', issue: '議題', over: '逾期', doing: '進行中', todo: '待辦' };
function agFind(id) { const d = (DB.docObjects || []).find(x => x.id === id); return agIs(d) ? d : null; }
function agAll() { return (DB.docObjects || []).filter(agIs); }
function agDone(d) { return !!agState(d).doneAt; }
/** 右欄與收工檢查要看的：自己的、還沒結案、而且到期日沒有排到今天之後。 */
function agOpenToday(who = DB.me) {
  return agAll().filter(d => agResponsible(d) === who && !agDone(d) && (!agState(d).due || agState(d).due <= TODAY));
}
/** 回顧的任務區塊要看的：所有有負責人的，含別人的與已完成的，分組交給呼叫端。 */
function agTasks() { return agAll().filter(agIsTask); }
function agOverdue(d) { return agTaskState(d) === 'over'; }
/**
 * 到期日的文字只講日期，不講狀態 —— 「逾期」由狀態 pill 負責，
 * 兩邊都講會讓同一件事在一張卡上出現兩次（而且議題沒有逾期概念，講了是錯的）。
 */
function agDueLabel(due) {
  if (!due) return '未排期';
  if (due === TODAY) return '今天到期';
  if (due === dadd(TODAY, 1)) return '明天到期';
  return rqShortDay(due) + ' 到期';
}
/** 結論段有沒有內容。結案要求寫結論，沿用 Thread Close 的紀律。 */
function agConclusion(d) {
  const sec = d.secs && d.secs[1];
  if (!sec) return '';
  return ensureSecBlocks(sec).filter(b => TEXTY(b.t) && b.text).map(b => b.text.trim()).join('\n').trim();
}

/* ---------- 行內語法：@指派 與 ~到期 ---------- */

const AG_WD = '日一二三四五六';
/** 最近一個（含今天）落在該星期幾的日子。「~週五」在週五當天就是今天，不是下週。 */
function agNextWeekday(idx) {
  const cur = new Date(TODAY + 'T00:00:00Z').getUTCDay();
  return dadd(TODAY, (idx - cur + 7) % 7);
}
/** 把 ~後面那一段解析成 YYYY-MM-DD；認不得就回空字串，讓那段文字留在標題裡。 */
function agParseDue(tok) {
  const t = (tok || '').trim();
  if (!t) return '';
  if (t === '今天' || t === '今日') return TODAY;
  if (t === '明天' || t === '明日') return dadd(TODAY, 1);
  if (t === '後天') return dadd(TODAY, 2);
  const wd = t.match(/^(?:本|下)?(?:週|周|星期)([日一二三四五六天])$/);
  if (wd) {
    const idx = AG_WD.indexOf(wd[1] === '天' ? '日' : wd[1]);
    if (idx >= 0) return t.startsWith('下') ? dadd(agNextWeekday(idx), 7) : agNextWeekday(idx);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const md = t.match(/^(\d{1,2})[-\/]?(\d{2})$/);
  if (md) {
    const y = TODAY.slice(0, 4), cand = `${y}-${String(+md[1]).padStart(2, '0')}-${md[2]}`;
    // 只寫月日而且已經過去的，視為明年（12/28 寫「~0103」指的是下個月，不是十一個月前）。
    return cand < TODAY ? `${+y + 1}-${cand.slice(5)}` : cand;
  }
  return '';
}
/** 認得出來的 @人 與 ~日期 從標題裡拿掉；認不得的原樣留著，不要默默吃掉使用者寫的字。 */
function agParseTask(text) {
  let out = text || '', owner = '', due = '';
  out = out.replace(/(?:^|\s)[@＠]([^\s@＠~～]{1,12})/g, (hit, name) => {
    if (owner) return hit;
    const w = Object.keys(DB.people).find(k => k === name || person(k) === name || DB.people[k].s === name);
    if (!w) return hit;
    owner = w;
    return ' ';
  });
  out = out.replace(/(?:^|\s)[~～]([^\s@＠~～]{1,12})/g, (hit, tok) => {
    if (due) return hit;
    const d = agParseDue(tok);
    if (!d) return hit;
    due = d;
    return ' ';
  });
  return { text: out.replace(/\s+/g, ' ').trim(), owner, due };
}

/* ---------- 建立與升格 ---------- */

/** 母行底下縮排更深的連續文字行＝同一件事。碰到非文字區塊（例如另一張卡）就停。 */
function agSubtree(b) {
  const arr = blks(), i = bIdx(b.id), kids = [];
  if (i < 0) return { arr, i: -1, kids };
  for (let j = i + 1; j < arr.length; j++) {
    const x = arr[j];
    if (!TEXTY(x.t) || (x.ind || 0) <= (b.ind || 0)) break;
    kids.push(x);
  }
  return { arr, i, kids };
}

/**
 * 把一行（＋子樹）收成一個議題物件，原本那幾行搬進物件的「內文」段。
 * opts.apply 在同一個 commit 裡執行，讓升格時 L1 的收尾跟物件的建立是同一筆變更。
 */
function agCreate(b, opts = {}) {
  if (!canWriteJournal()) return null;
  // 任務模式：先把 @指派 與 ~到期 從行文字裡解析掉，標題才不會殘留語法符號。
  if (opts.parse) {
    const got = agParseTask(b.text || '');
    b.text = got.text;
    if (got.owner) opts.owner = got.owner;
    if (got.due) opts.due = got.due;
  }
  const title = (b.text || '').trim();
  if (!title) { toast('先寫下要處理的事，再標成' + (opts.owner || opts.parse ? '任務' : '議題')); return null; }
  const { arr, i, kids } = agSubtree(b);
  if (i < 0) { toast('找不到這一行'); return null; }
  syncAll();
  let made = null;
  commit('create', '議題物件', title, () => {
    const d = createDocObject('agenda', S.jday || TODAY, TPL.agenda);
    const st = agState(d);
    st.bornDay = opts.bornDay || S.jday || TODAY;
    st.due = opts.due || '';
    st.carried = opts.carried || [];
    st.issueId = opts.issueId || '';
    st.owner = opts.owner || '';
    st.assigner = opts.owner ? DB.me : '';
    st.assignedAt = st.owner && st.owner !== DB.me ? Date.now() : 0;
    // 內文＝母行＋子樹，縮排改成以母行為基準，物件內看起來才是完整的一段。
    const body = ensureSecBlocks(d.secs[0]);
    body.length = 0;
    body.push({ id: newBid(), t: 'p', ind: 0, text: title });
    kids.forEach(k => body.push({ id: newBid(), t: k.t, ind: Math.max(0, (k.ind || 0) - (b.ind || 0)), text: k.text, ...(k.done != null ? { done: k.done } : {}) }));
    // 日誌那幾行換成一張卡；後面補一個空行，維持 replaceWithObj 一樣的書寫節奏。
    const card = { id: newBid(), t: 'obj', ind: b.ind || 0, obj: { ty: 'doc_object', rid: d.id, bornAt: Date.now() } };
    const after = { id: newBid(), t: 'p', ind: b.ind || 0, text: '' };
    arr.splice(i, 1 + kids.length, card, after);
    focusB(after.id, 0);
    if (opts.apply) opts.apply(d);
    made = d;
    return [
      `把這一行${kids.length ? `與底下 ${kids.length} 個子項` : ''}收成${st.owner ? '任務' : '議題物件'}`,
      st.owner ? `負責人 ${person(st.owner)}${st.due ? ` · 到期 ${st.due}` : ' · 還沒有到期日'}` : '可以排到期日、討論、附檔；結案時要寫下結論',
      '同時進入物件索引，之後查得到'
    ];
  });
  return made;
}

/** 右欄的 L1 議題升格成物件。原行找不到就明說，不要偷偷造一個空物件。 */
function agPromote(issueId) {
  const t = DB.todayIssues.find(x => x.id === issueId);
  if (!t) return;
  if (t.author !== DB.me) return deny();
  const b = bOf(t.blockId);
  if (!b) return toast('這個議題的來源那一行不在目前開著的日誌裡，先切到那一天再升格');
  agCreate(b, {
    issueId: t.id,
    bornDay: t.day,
    carried: t.deferred ? Array.from({ length: t.deferred }, () => t.day) : [],
    // L1 收掉，右欄才不會同一件事出現兩筆。doneAt 表示「這一層結束了」，實際狀態改看物件。
    apply: () => { t.doneAt = Date.now(); }
  });
}

/* ---------- 到期日、延期、結案 ---------- */

/** 作者或被指派的負責人都動得了 —— deny() 的文案本來就是這樣寫的。 */
function agOwned(d) { return !!d && (d.author === DB.me || agState(d).owner === DB.me); }

/**
 * 指派。空字串＝收回指派，物件退回議題（不再進逾期計算，這是刻意的：
 * 沒有人扛的事不該一直對著你閃紅字）。
 */
function agSetOwner(id, who) {
  const d = agFind(id);
  if (!d) return;
  if (!agOwned(d)) return deny();
  const st = agState(d);
  const next = who || '';
  if (next === st.owner) return;
  commit('update', '議題物件', docObjectName(d), () => {
    st.owner = next;
    st.assigner = next ? DB.me : '';
    // 指給別人才發通知；指給自己不用通知自己。
    st.assignedAt = next && next !== DB.me ? Date.now() : 0;
    st.assignSeenAt = 0;
    d.updatedAt = Date.now();
    return next
      ? [`指派給 ${person(next)}`,
         st.due ? `到期日 ${st.due}` : '還沒有到期日，記得補上',
         ...(st.assignedAt ? ['對方右上角的通知匣會出現這一筆'] : [])]
      : ['收回指派，退回議題', '不再計算逾期'];
  });
}

function agSetDue(id, due) {
  const d = agFind(id);
  if (!d) return;
  if (!agOwned(d)) return deny();
  const st = agState(d);
  const next = (due || '').slice(0, 10);
  commit('update', '議題物件', docObjectName(d), () => {
    st.due = next;
    d.updatedAt = Date.now();
    return [next ? `到期日設為 ${next}` : '清除到期日，回到未排期'];
  });
}

/**
 * 延期。把「今天」記進 carried 再改到期日 —— 舊的 rqDeferToday 是直接覆寫 t.day，
 * 於是一件被延三次的事看不出它其實是週一提出的（今日議題研究的發現 B）。
 */
function agCarryTo(id, day) {
  const d = agFind(id);
  if (!d) return;
  if (!agOwned(d)) return deny();
  const st = agState(d);
  const to = day || dadd(TODAY, 1);
  commit('update', '議題物件', docObjectName(d), () => {
    (st.carried ??= []).push(TODAY);
    st.due = to;
    d.updatedAt = Date.now();
    return [`延到 ${to}`, `提出於 ${st.bornDay}，已經帶過 ${st.carried.length} 次`];
  });
}

function agComplete(id) {
  const d = agFind(id);
  if (!d) return;
  if (!agOwned(d)) return deny();
  if (!agConclusion(d)) {
    openDocPage(id);
    return toast('結案前先在「結論」寫下決定或下一步');
  }
  const st = agState(d);
  commit('update', '議題物件', docObjectName(d), () => {
    st.doneAt = Date.now();
    d.updatedAt = Date.now();
    return ['議題結案，結論留在物件裡', '從收工檢查與右欄移除'];
  });
}

function agReopen(id) {
  const d = agFind(id);
  if (!d) return;
  if (!agOwned(d)) return deny();
  const st = agState(d);
  commit('update', '議題物件', docObjectName(d), () => {
    st.doneAt = 0;
    d.updatedAt = Date.now();
    return ['重新開啟這個議題'];
  });
}

/* ---------- 討論與附件 ---------- */

function agSay(id) {
  const d = agFind(id);
  if (!d) return;
  const x = (agDrafts.get(id) || '').trim();
  if (!x) return toast('先寫點什麼再送出');
  const st = agState(d);
  // commit() 自己會 render()，所以要在 commit 之前排好回焦點，否則這一次渲染會吃不到。
  runtime._afterRender = () => root.querySelector('[data-ag-input="' + id + '"]')?.focus();
  commit('update', '議題物件', docObjectName(d), () => {
    st.msgs.push({ w: DB.me, x, ts: nowts().slice(0, 5), at: Date.now() });
    agDrafts.delete(id);
    d.updatedAt = Date.now();
    return [`討論累積 ${st.msgs.length} 則`];
  });
}

/** 附件沿用既有的上傳管線（DB.files → R2 或本頁記憶體），議題這邊只記 id 與檔名。 */
function agAttach(id) {
  const d = agFind(id);
  if (!d) return;
  uploadFile(null, f => {
    const st = agState(d);
    commit('update', '議題物件', docObjectName(d), () => {
      st.files.push(f.name);
      st.fileIds.push(f.id);
      d.updatedAt = Date.now();
      return [`附件 ${st.files.length} 個`, '檔案同時進入文件庫'];
    });
  });
}

/* ---------- 畫面：日誌裡的卡片 ---------- */

/** 狀態 pill：顏色只在這裡出現。四個狀態各自走 --ag-<state>-{bg,br,ink} 三階。 */
function agStatePill(d) {
  const k = agTaskState(d);
  if (k === 'issue') return '';                       // 議題不宣告狀態，避免與「待辦」混淆
  const ic = k === 'done' ? 'check' : k === 'over' ? 'refresh' : 'dot';
  return `<span class="ag-pill ${k}">${svg(ic, k === 'done' ? 11 : 9)} ${AG_STATE_LABEL[k]}</span>`;
}
/** 負責人 pill：頭像已經帶顏色，外框保持中性，不再多開一組色。 */
function agOwnerPill(d) {
  const st = agState(d);
  if (!st.owner) return '';
  const by = st.assigner && st.assigner !== st.owner ? ` <span class="ag-by">${esc(person(st.assigner))} →</span>` : '';
  return `<span class="ag-pill own">${by} ${rqAv(st.owner)} ${esc(person(st.owner))}</span>`;
}
function agPills(d) {
  const st = agState(d), out = [];
  out.push(agStatePill(d));
  out.push(agOwnerPill(d));
  if (!st.doneAt) {
    // 到期 pill 一律中性色：顏色只出現在狀態 pill，一張卡不要有兩個紅的東西。
    out.push(`<span class="ag-pill soft">${svg('calendar', 11)} ${esc(agDueLabel(st.due))}</span>`);
  }
  if (st.carried.length) out.push(`<span class="ag-pill warn">${svg('refresh', 11)} 帶過 ${st.carried.length} 次</span>`);
  if (st.msgs.length) out.push(`<span class="ag-pill soft">${svg('message', 11)} ${st.msgs.length}</span>`);
  if (st.files.length) out.push(`<span class="ag-pill soft">${svg('paperclip', 11)} ${st.files.length}</span>`);
  return out.filter(Boolean).join('');
}

function agFilesHtml(d) {
  const st = agState(d);
  if (!st.files.length) return '';
  return `<div class="ag-files">${st.files.map((f, i) => st.fileIds[i]
    ? `<button type="button" class="ag-file" onclick="openDrawer('file','${st.fileIds[i]}')">${svg('paperclip', 11)} ${esc(f)}</button>`
    : `<span class="ag-file">${svg('paperclip', 11)} ${esc(f)}</span>`).join('')}</div>`;
}

/** 討論串：卡片與議題頁共用同一段，只有容器 class 不同。 */
function agThreadHtml(d, where) {
  const st = agState(d);
  const msgs = st.msgs.length
    ? st.msgs.map(m => `<div class="rq-msg">${rqAv(m.w)}<div><b>${esc(person(m.w))}</b> <span class="rq-meta">${esc(m.ts || '')}</span><div class="rq-msg-x">${esc(m.x)}</div></div></div>`).join('')
    : '<div class="rq-empty">還沒有討論</div>';
  const box = st.doneAt ? '' : `<div class="rq-compose ag-compose">
    <input data-ag-input="${d.id}" aria-label="討論：${esc(docObjectName(d))}" placeholder="寫下討論…" value="${esc(agDrafts.get(d.id) || '')}" oninput="agDrafts.set('${d.id}',this.value)" onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();agSay('${d.id}')}">
    <button class="btn sm" onclick="agAttach('${d.id}')">${svg('paperclip', 12)} 附檔</button>
    <button class="btn sm pri" onclick="agSay('${d.id}')">${svg('send', 12)} 送出</button></div>`;
  // contenteditable="false"：這一段在日誌卡片裡是長在 #doc 內的，不加的話輸入框的
  // Enter 會冒泡到 docKey()，被當成「在日誌裡換行」處理（同 rq-wrap 的作法）。
  return `<div class="ag-thread ${where}" contenteditable="false">
    <div class="ag-sec-t">討論 · ${st.msgs.length}${st.files.length ? ` · 附件 ${st.files.length}` : ''}</div>
    ${msgs}${agFilesHtml(d)}${box}</div>`;
}

// 議題卡跟文件物件卡是同一個容器，只換掉頭部的資訊列與底下多一段討論。
const agBaseCard = renderDocObjectCard;
renderDocObjectCard = function (b) {
  const o = b.obj || {}, d = (DB.docObjects || []).find(x => x.id === o.rid);
  if (!agIs(d)) return agBaseCard(b);
  const meta = metaOf(d), collapsed = !!d.collapsed, st = agState(d);
  return `
  <div class="eb-obj eb-doc-card ag-card ${st.doneAt ? 'ag-done' : ''} ${agOverdue(d) ? 'ag-over' : ''} ${collapsed ? 'collapsed' : 'expanded'}" data-doc-id="${d.id}">
    <div class="eb-doc-bar">
      <div class="eb-doc-bar-left" onclick="toggleDocCollapse('${d.id}')">
        <span class="chip ${meta.chip}">${svg('flag', 11)} ${agIsTask(d) ? '任務' : meta.nm}</span>
        <span class="eb-doc-bar-title">${esc(docObjectName(d))}</span>
        <span class="ag-pills">${agPills(d)}</span>
      </div>
      <div class="eb-doc-bar-right">
        <button type="button" class="eb-doc-toggle-btn" title="${collapsed ? '展開議題' : '收合議題'}" onclick="event.stopPropagation();toggleDocCollapse('${d.id}')">
          <span class="eb-doc-btn-lbl">${collapsed ? '展開' : '收合'}</span>
        </button>
        <button type="button" class="eb-doc-icon-btn" title="開啟議題頁" onclick="event.stopPropagation();openDocPage('${d.id}')">${svg('goto', 13)}</button>
      </div>
    </div>
    ${collapsed ? '' : `<div class="eb-doc-inline-body">
      ${d.secs.map((sec, idx) => renderDocSectionBody(d, sec, idx, meta)).join('')}
      ${agThreadHtml(d, 'card')}
    </div>`}
  </div>`;
};

/* ---------- 畫面：議題頁（抽屜） ---------- */

/** 指派控制：兩人制就是兩顆按鈕加一顆「不指派」，不值得做成下拉。 */
function agOwnerControls(d) {
  const st = agState(d);
  if (st.doneAt) return st.owner ? `<b>${esc(person(st.owner))}</b>` : '<span class="ag-pill soft">未指派</span>';
  const who = Object.keys(DB.people);
  return `<span class="ag-due">${who.map(w => `
    <button class="btn sm ${st.owner === w ? 'pri' : ''}" onclick="agSetOwner('${d.id}','${w}')">${rqAv(w)} ${esc(person(w))}</button>`).join('')}
    ${st.owner ? `<button class="btn sm" onclick="agSetOwner('${d.id}','')">收回指派</button>` : '<span class="ag-pill soft">未指派 · 目前是議題</span>'}
  </span>`;
}

function agDueControls(d) {
  const st = agState(d);
  if (st.doneAt) return `<b>${esc(st.due ? agDueLabel(st.due) : '未排期')}</b>`;
  return `<span class="ag-due">
    <input type="date" class="ag-date" aria-label="到期日" value="${esc(st.due)}" onchange="agSetDue('${d.id}',this.value)">
    <button class="btn sm" onclick="agSetDue('${d.id}','${TODAY}')">今天</button>
    <button class="btn sm" onclick="agSetDue('${d.id}','${dadd(TODAY, 1)}')">明天</button>
    <button class="btn sm" onclick="agSetDue('${d.id}','${dadd(TODAY, 3)}')">+3 天</button>
    ${st.due ? `<button class="btn sm" onclick="agSetDue('${d.id}','')">清除</button>` : ''}
  </span>`;
}

const agBaseDrawer = DRAWERS.doc_object;
DRAWERS.doc_object = id => {
  const d = agFind(id);
  if (!d) return agBaseDrawer(id);
  const meta = metaOf(d), st = agState(d);
  return {
    crumb: agIsTask(d) ? '日誌 › 任務' : '日誌 › 議題',
    title: `<span class="doc-page-title ed" contenteditable="true" data-doc-id="${d.id}" data-ph="輸入議題標題...">${esc(docObjectName(d))}</span>`,
    sub: `<span class="doc-page-meta">
        <span class="chip ${meta.chip}">${svg('flag', 11)} ${agIsTask(d) ? '任務' : meta.nm}</span>
        <span class="ag-ref">${esc(d.id)}</span>
        <span>${esc(docObjectTimestamp(d))}</span>
        <span class="doc-page-sync-tag">● 與日誌即時雙向連動</span>
      </span>`,
    body: `
      <div class="ag-fields">
        <div class="ag-f"><span class="k">提出</span><span class="v"><b>${esc(st.bornDay || d.day)}</b> · ${esc(person(d.author))}</span></div>
        <div class="ag-f"><span class="k">負責</span><span class="v">${agOwnerControls(d)}</span></div>
        <div class="ag-f"><span class="k">到期</span><span class="v">${agDueControls(d)}</span></div>
        <div class="ag-f"><span class="k">帶過</span><span class="v">${st.carried.length ? `<b>${st.carried.length} 次</b> · ${esc(st.carried.join('、'))}` : '沒有延期過'}</span></div>
        <div class="ag-f"><span class="k">狀態</span><span class="v">${agStatePill(d) || '<span class="ag-pill soft">議題 · 尚未指派負責人</span>'}</span></div>
      </div>
      <div class="doc-page-workspace">
        ${d.secs.map((sec, idx) => renderDocSectionBody(d, sec, idx, meta)).join('')}
      </div>
      ${agThreadHtml(d, 'page')}
    `,
    foot: `
      ${st.doneAt
        ? `<button class="btn" onclick="agReopen('${d.id}')">${svg('refresh', 12)} 重新開啟</button>`
        : `<button class="btn" onclick="agCarryTo('${d.id}','${dadd(TODAY, 1)}')">${svg('goto', 12)} 延到明天</button>
           <button class="btn pri" onclick="agComplete('${d.id}')">${svg('check', 12)} 完成並結案</button>`}
      <button class="btn" onclick="copyDocMarkdown('${d.id}')">${svg('copy', 12)} 複製全文</button>
      <button class="btn dgr" style="margin-left:auto" onclick="deleteDocObject('${d.id}')">${svg('trash', 12)} 刪除議題</button>
    `,
    after: () => {
      const titleEl = root.querySelector('.doc-page-title');
      if (titleEl) titleEl.oninput = () => {
        d.title = titleEl.innerText.replace(/\n$/, '');
        d.titleAuto = false;
        d.updatedAt = Date.now();
        render();
      };
    }
  };
};

/* ---------- 畫面：右欄「今日議題」 ---------- */

/** L1 輕量議題的卡：多一顆升格按鈕。文字讀日誌那一行，不用建立當下的快照。 */
function agL1Card(t) {
  return `<div class="rq-card today"><div class="rq-card-t">${esc(rqTodayText(t))}</div>
    <div class="rq-card-m"><span class="ag-pill soft">L1 輕量</span>${t.deferred ? `<span class="rq-pill warn">${svg('refresh', 11)} 從昨天帶來</span>` : ''}
    <button class="btn sm" onclick="agPromote('${t.id}')">${svg('flag', 11)} 升格</button>
    <button class="btn sm" onclick="rqCompleteToday('${t.id}')">${svg('check', 12)} 完成</button></div></div>`;
}

function agL2Card(d) {
  const st = agState(d);
  return `<div class="rq-card today ag-rail ${agOverdue(d) ? 'ag-over' : ''}"><div class="rq-card-t">${esc(docObjectName(d))}</div>
    <div class="rq-card-m">${agPills(d)}
    <button class="btn sm" onclick="openDocPage('${d.id}')">${svg('goto', 11)} 開啟</button>
    <button class="btn sm" onclick="agComplete('${d.id}')">${svg('check', 12)} 完成</button></div></div>`;
}

/** 右欄今日議題整段的內容：物件排前面（有到期日的先），L1 排後面。 */
function agTodayBody(l1, l2) {
  const objs = l2.slice().sort((a, b) => (agState(a).due || '9999').localeCompare(agState(b).due || '9999'));
  const body = objs.map(agL2Card).join('') + l1.map(agL1Card).join('');
  return body || '<div class="rq-empty">行尾打 !今天 加入；!議題 建立議題；!任務 @某人 ~週五 直接指派</div>';
}

/* ---------- 指派通知（資料形狀；呈現在 notifications.source.js）---------- */

/** 別人指派給我、還沒結案的任務。通知匣用這個推導，不另外存一張表。 */
function agAssignedToMe(who = DB.me) {
  return agTasks().filter(d => {
    const st = agState(d);
    return st.owner === who && st.assignedAt && st.assigner && st.assigner !== who && !st.doneAt;
  });
}
/** 給通知匣的 item：欄位與 ntItems() 其他來源同形。 */
function agAssignNotices(who = DB.me) {
  return agAssignedToMe(who).map(d => {
    const st = agState(d);
    return {
      kind: 'task', ref: d.id, at: st.assignedAt, seen: !!st.assignSeenAt,
      tone: agTaskState(d) === 'over' ? 'late' : 'ask',
      title: `${person(st.assigner)} 指派給你`,
      text: docObjectName(d) + (st.due ? ` · ${agDueLabel(st.due)}` : ' · 未排期')
    };
  });
}
/** 打開通知匣＝讀過。回傳這次標掉幾筆，讓呼叫端算總數。 */
function agMarkAssignSeen(who = DB.me) {
  let n = 0;
  agAssignedToMe(who).forEach(d => { const st = agState(d); if (!st.assignSeenAt) { st.assignSeenAt = Date.now(); n++; } });
  return n;
}

/* ---------- 畫面：回顧分頁的任務區塊 ---------- */

/**
 * 回顧本來只有「連續敘事」—— 一條可以往下讀的線，但讀不出結論。
 * 任務區塊補的就是這件事：這段期間誰欠誰什麼、哪些逾期了、哪些根本沒排期。
 * 分組順序刻意把「逾期」與「無到期日」放在「已完成」前面 —— 卡住的比做完的值得看。
 */
function agReviewGroups() {
  const all = agTasks().slice().sort((a, b) => (agState(a).due || '9999').localeCompare(agState(b).due || '9999'));
  const wk = dadd(TODAY, 7);
  return [
    { k: 'over', nm: '逾期', ds: all.filter(d => agTaskState(d) === 'over') },
    { k: 'doing', nm: '本週到期', ds: all.filter(d => { const st = agState(d); return !st.doneAt && agTaskState(d) !== 'over' && st.due && st.due <= wk; }) },
    { k: 'todo', nm: '無到期日', ds: all.filter(d => !agState(d).doneAt && !agState(d).due) },
    { k: 'done', nm: '已完成', ds: all.filter(d => !!agState(d).doneAt) }
  ].filter(g => g.ds.length);
}

function agReviewRow(d) {
  const st = agState(d), k = agTaskState(d);
  const meta = [
    `${esc(st.bornDay || d.day)} 提出`,
    st.doneAt ? '已結案' : st.due ? esc(agDueLabel(st.due)) : '未排期',
    st.carried.length ? `帶過 ${st.carried.length} 次` : ''
  ].filter(Boolean);
  return `<div class="ag-rv-row ${k === 'over' ? 'ag-over' : ''}">
    <button class="ag-rv-ck ${st.doneAt ? 'on' : ''}" title="${st.doneAt ? '重新開啟' : '完成並結案'}"
      onclick="${st.doneAt ? `agReopen('${d.id}')` : `agComplete('${d.id}')`}">${svg('check', 11)}</button>
    <div class="ag-rv-b">
      <div class="ag-rv-t ${st.doneAt ? 'done' : ''}">${esc(docObjectName(d))}</div>
      <div class="ag-rv-m">${meta.map(x => `<span>${x}</span>`).join('')}</div>
    </div>
    <div class="ag-rv-r">${agOwnerPill(d)}${agStatePill(d)}
      <button class="btn sm" onclick="openDocPage('${d.id}')">${svg('goto', 11)} 開啟</button></div>
  </div>`;
}

/** 指標只算「有負責人」的，議題不進統計 —— 沒有人扛的事不該被算成欠款。 */
function agReviewStats() {
  const t = agTasks(), open = t.filter(d => !agState(d).doneAt);
  const over = t.filter(d => agTaskState(d) === 'over');
  const nodue = open.filter(d => !agState(d).due);
  const mine = open.filter(d => agResponsible(d) === DB.me);
  return `<div class="ag-rv-kpi">
    <div><b>${open.length}</b><span>未完成</span></div>
    <div><b class="${over.length ? 'ag-k-over' : ''}">${over.length}</b><span>逾期</span></div>
    <div><b>${nodue.length}</b><span>無到期日</span></div>
    <div><b>${mine.length}</b><span>指給我的</span></div>
    <div><b>${t.length - open.length}</b><span>本期完成</span></div>
  </div>`;
}

function agReviewHtml() {
  const groups = agReviewGroups();
  if (!agTasks().length) {
    return panel('任務', '0 項', `<div class="rq-empty">回顧讀不出結論，通常是因為沒有人被指名。<br>
      在日誌行尾打 <b>!任務 @某人 ~週五</b>，這裡就會長出可以追的清單。</div>`);
  }
  const body = agReviewStats() + groups.map(g =>
    `<div class="ag-rv-g"><span class="ag-pill ${g.k}">${g.nm}</span><span class="ag-rv-n">${g.ds.length} 項</span></div>
     ${g.ds.map(agReviewRow).join('')}`).join('');
  return panel('任務', `${agTasks().filter(d => !agState(d).doneAt).length} 項未完成 · 依到期日`, body, '', true);
}

// 回顧分頁＝連續敘事（讀）＋任務（追）。敘事留在原位，任務接在前面。
const agBaseJournalView = VIEWS.journal;
VIEWS.journal = function (tab) {
  const base = agBaseJournalView(tab);
  if (tab !== 1 || space !== 'team') return base;
  return agReviewHtml() + base;
};

/* ---------- 收工檢查 ---------- */

/** 收工列：沒排期或到期在今天以前的議題物件，收工時要逐件決定。 */
function agCloseRows() {
  return agOpenToday().map(d => {
    const over = agOverdue(d);
    return `<div class="rq-row ${over ? 'ag-over' : ''}">
    <span class="rq-pill ${over ? 'warn' : 'today'}">${svg('flag', 11)} ${agIsTask(d) ? '任務' : '議題'}</span>
    <span class="rq-row-t">${esc(docObjectName(d))}</span>
    ${over ? `<span class="ag-pill over">${svg('refresh', 9)} 逾期</span>` : ''}
    <button class="btn sm" onclick="openDocPage('${d.id}')">${svg('goto', 11)} 開啟</button>
    <button class="btn sm" onclick="agComplete('${d.id}');rqOpenClose()">${svg('check', 12)} 完成</button>
    <button class="btn sm ${over ? '' : 'pri'}" onclick="agCarryTo('${d.id}','${dadd(TODAY, 1)}');rqOpenClose()">${svg('goto', 11)} 明天</button></div>`;
  }).join('');
}

/**
 * 收工時自動延期 —— 但**逾期的任務不延**。
 *
 * 舊行為是全部往後推一天。對還沒到期的議題那是對的（今日議題的語意就是「今天沒動就明天再說」），
 * 對已經逾期的任務卻是把證據抹掉：一件週一就該交的事，被自動延五次之後看起來永遠只是「明天到期」。
 * 逾期要留在原地，讓它一直刺眼，直到有人真的處理它或明確改期。
 * 手動的「明天」按鈕仍在，改期是可以的，但必須是人按的。
 */
function agCarryAllOpen() {
  const open = agOpenToday();
  const carried = open.filter(d => !agOverdue(d));
  carried.forEach(d => { const st = agState(d); (st.carried ??= []).push(TODAY); st.due = dadd(TODAY, 1); d.updatedAt = Date.now(); });
  return { carried: carried.length, stuck: open.length - carried.length };
}

/* ---------- 命令面板 ---------- */

const agBaseCmdk = buildCmdk;
buildCmdk = () => {
  const items = agBaseCmdk();
  if (space !== 'team') return items;
  const open = agOpenToday();
  return [...items, {
    g: '日誌', t: '今日議題（物件）', s: `${open.length} 件未結案`, h: '議題 agenda 到期 討論 附件',
    ic: 'flag', run: () => { if (open[0]) openDocPage(open[0].id); else nav('journal', 0); }
  }];
};
