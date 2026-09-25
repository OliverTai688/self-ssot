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
  return (d.agenda ??= { due: '', bornDay: d.day || TODAY, carried: [], doneAt: 0, watcher: '', msgs: [], files: [], fileIds: [], issueId: '' });
}
function agIs(d) { return !!d && d.type === 'agenda'; }
function agFind(id) { const d = (DB.docObjects || []).find(x => x.id === id); return agIs(d) ? d : null; }
function agAll() { return (DB.docObjects || []).filter(agIs); }
function agDone(d) { return !!agState(d).doneAt; }
/** 右欄與收工檢查要看的：自己的、還沒結案、而且到期日沒有排到今天之後。 */
function agOpenToday(who = DB.me) {
  return agAll().filter(d => d.author === who && !agDone(d) && (!agState(d).due || agState(d).due <= TODAY));
}
function agDueLabel(due) {
  if (!due) return '未排期';
  if (due === TODAY) return '今天到期';
  if (due === dadd(TODAY, 1)) return '明天到期';
  if (due < TODAY) return '逾期 · ' + rqShortDay(due);
  return rqShortDay(due) + ' 到期';
}
/** 結論段有沒有內容。結案要求寫結論，沿用 Thread Close 的紀律。 */
function agConclusion(d) {
  const sec = d.secs && d.secs[1];
  if (!sec) return '';
  return ensureSecBlocks(sec).filter(b => TEXTY(b.t) && b.text).map(b => b.text.trim()).join('\n').trim();
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
  const title = (b.text || '').trim();
  if (!title) { toast('先寫下要處理的事，再標成議題'); return null; }
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
      `把這一行${kids.length ? `與底下 ${kids.length} 個子項` : ''}收成議題物件`,
      '可以排到期日、討論、附檔；結案時要寫下結論',
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

function agOwned(d) { return d && d.author === DB.me; }

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

function agPills(d) {
  const st = agState(d), out = [];
  if (st.doneAt) out.push(`<span class="rq-pill done">${svg('check', 11)} 已結案</span>`);
  else if (st.due) out.push(`<span class="ag-pill ${st.due < TODAY ? 'over' : st.due === TODAY ? 'due' : 'set'}">${svg('calendar', 11)} ${esc(agDueLabel(st.due))}</span>`);
  else out.push(`<span class="ag-pill soft">${svg('calendar', 11)} 未排期</span>`);
  if (st.carried.length) out.push(`<span class="ag-pill warn">${svg('refresh', 11)} 帶過 ${st.carried.length} 次</span>`);
  if (st.msgs.length) out.push(`<span class="ag-pill soft">${svg('message', 11)} ${st.msgs.length}</span>`);
  if (st.files.length) out.push(`<span class="ag-pill soft">${svg('paperclip', 11)} ${st.files.length}</span>`);
  return out.join('');
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
  <div class="eb-obj eb-doc-card ag-card ${st.doneAt ? 'ag-done' : ''} ${collapsed ? 'collapsed' : 'expanded'}" data-doc-id="${d.id}">
    <div class="eb-doc-bar">
      <div class="eb-doc-bar-left" onclick="toggleDocCollapse('${d.id}')">
        <span class="chip ${meta.chip}">${svg('flag', 11)} ${meta.nm}</span>
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
    crumb: '日誌 › 議題',
    title: `<span class="doc-page-title ed" contenteditable="true" data-doc-id="${d.id}" data-ph="輸入議題標題...">${esc(docObjectName(d))}</span>`,
    sub: `<span class="doc-page-meta">
        <span class="chip ${meta.chip}">${svg('flag', 11)} ${meta.nm}</span>
        <span class="ag-ref">${esc(d.id)}</span>
        <span>${esc(docObjectTimestamp(d))}</span>
        <span class="doc-page-sync-tag">● 與日誌即時雙向連動</span>
      </span>`,
    body: `
      <div class="ag-fields">
        <div class="ag-f"><span class="k">提出</span><span class="v"><b>${esc(st.bornDay || d.day)}</b> · ${esc(person(d.author))}</span></div>
        <div class="ag-f"><span class="k">到期</span><span class="v">${agDueControls(d)}</span></div>
        <div class="ag-f"><span class="k">帶過</span><span class="v">${st.carried.length ? `<b>${st.carried.length} 次</b> · ${esc(st.carried.join('、'))}` : '沒有延期過'}</span></div>
        <div class="ag-f"><span class="k">狀態</span><span class="v">${st.doneAt ? `<span class="rq-pill done">${svg('check', 11)} 已結案</span>` : `<span class="ag-pill due">${svg('dot', 9)} 處理中</span>`}</span></div>
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
  return `<div class="rq-card today ag-rail"><div class="rq-card-t">${esc(docObjectName(d))}</div>
    <div class="rq-card-m">${agPills(d)}
    <button class="btn sm" onclick="openDocPage('${d.id}')">${svg('goto', 11)} 開啟</button>
    <button class="btn sm" onclick="agComplete('${d.id}')">${svg('check', 12)} 完成</button></div></div>`;
}

/** 右欄今日議題整段的內容：物件排前面（有到期日的先），L1 排後面。 */
function agTodayBody(l1, l2) {
  const objs = l2.slice().sort((a, b) => (agState(a).due || '9999').localeCompare(agState(b).due || '9999'));
  const body = objs.map(agL2Card).join('') + l1.map(agL1Card).join('');
  return body || '<div class="rq-empty">行尾打 !今天 加入；打 !議題 直接建立議題物件</div>';
}

/* ---------- 收工檢查 ---------- */

/** 收工列：沒排期或到期在今天以前的議題物件，收工時要逐件決定。 */
function agCloseRows() {
  return agOpenToday().map(d => `<div class="rq-row"><span class="rq-pill today">${svg('flag', 11)} 議題</span>
    <span class="rq-row-t">${esc(docObjectName(d))}</span>
    <button class="btn sm" onclick="openDocPage('${d.id}')">${svg('goto', 11)} 開啟</button>
    <button class="btn sm" onclick="agComplete('${d.id}');rqOpenClose()">${svg('check', 12)} 完成</button>
    <button class="btn sm pri" onclick="agCarryTo('${d.id}','${dadd(TODAY, 1)}');rqOpenClose()">${svg('goto', 11)} 明天</button></div>`).join('');
}

/** 確認收工時，沒動的議題物件跟 L1 一樣自動延到明天，但會留下 carried 紀錄。 */
function agCarryAllOpen() {
  const open = agOpenToday();
  open.forEach(d => { const st = agState(d); (st.carried ??= []).push(TODAY); st.due = dadd(TODAY, 1); d.updatedAt = Date.now(); });
  return open.length;
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
