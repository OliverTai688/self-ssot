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
  // 有負責人就叫任務，沒有才叫議題。掛在 meta 上，docObjectLabel() 一處決定，
  // 標題、卡片、抽屜、側欄就不會各自寫死一個詞。
  label: d => (agIsTask(d) ? '任務' : '議題'),
  secs: ['內文', '結論'],
  placeholders: [
    '今天要處理掉的是什麼；# 召喚、@ 引用在這裡照常可用...',
    '結論、決定與下一步 —— 結案前一定要寫...'
  ]
};
// TPL 是 applySummon 判斷「這是文件模板」的依據；SUMMON 是 # 選單的來源。
TPL.agenda = { h: '議題', secs: ['內文', '結論'] };
// # 建立的是空白物件，當下還不知道要不要指派，所以只有一個入口；
// 指派了負責人它就叫任務（見 meta.label）。ds 帶上「任務」兩字，打 #任務 才找得到這一項。
SUMMON[0].items.push({ k: 'agenda', nm: '議題／任務', ds: '今天要處理的一件事 · 可排期、討論、附檔、結案；指派負責人後就是任務（行內打 !任務 可直接建任務）', ic: 'flag' });

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
  // 結論與結案的責任紀錄：誰寫的結論、誰同意結案。
  // proposal＝非建立者送出、等建立者決定的結論；verdict＝建立者的決定，用來通知提出的人。
  if (st.concBy === undefined) st.concBy = '';
  if (st.concAt === undefined) st.concAt = 0;
  if (st.closedBy === undefined) st.closedBy = '';
  if (st.proposal === undefined) st.proposal = null;
  if (st.verdict === undefined) st.verdict = null;
  if (!Array.isArray(st.concLog)) st.concLog = [];
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
  if (st.proposal) return 'review';        // 有人寫了結論、等建立者決定 —— 議題與任務都適用
  if (!st.owner) return 'issue';           // 議題不進逾期計算
  if (st.due && st.due < TODAY) return 'over';
  if (st.msgs.length) return 'doing';
  return 'todo';
}
const AG_STATE_LABEL = { done: '已完成', review: '待確認結案', issue: '議題', over: '逾期', doing: '進行中', todo: '待辦' };
/**
 * 給「看得到狀態」的地方用（物件索引、議題卡、議題頁）：議題也要有狀態。
 * agTaskState 的 'issue' 只說「沒有負責人」，不說進度；這裡把它再分成開放／討論中。
 * pill class 沿用既有的四色三階（todo/doing/over/done），待確認結案另走 review。
 */
function agStatusInfo(d) {
  const k = agTaskState(d), st = agState(d);
  if (k === 'done') return { k: 'done', cls: 'done', label: agIsTask(d) ? '已完成' : '已結案' };
  if (k === 'review') return { k: 'review', cls: 'review', label: '待確認結案' };
  if (k === 'issue') return st.msgs.length ? { k: 'discuss', cls: 'doing', label: '討論中' } : { k: 'open', cls: 'todo', label: '開放' };
  return { k, cls: k, label: AG_STATE_LABEL[k] };
}
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
  // opts.parse 只有 !任務 這個入口會給 —— 它同時是「使用者要的是任務」的意圖旗標。
  const asTask = !!opts.parse || !!opts.owner;
  // 任務模式：先把 @指派 與 ~到期 從行文字裡解析掉，標題才不會殘留語法符號。
  if (opts.parse) {
    const got = agParseTask(b.text || '');
    b.text = got.text;
    if (got.owner) opts.owner = got.owner;
    if (got.due) opts.due = got.due;
  }
  // 任務＝有負責人的議題。使用者明講要建任務卻沒寫 @某人 時，負責人就是自己 ——
  // 以前這裡留空，結果選了「建立任務」卻拿到一張議題卡，意圖被默默吃掉。
  // 不是自己要做的，在卡片或議題頁的「負責」欄位改指派即可。
  if (asTask && !opts.owner) opts.owner = DB.me;
  const title = (b.text || '').trim();
  if (!title) { toast('先寫下要處理的事，再標成' + (asTask ? '任務' : '議題')); return null; }
  const { arr, i, kids } = agSubtree(b);
  if (i < 0) { toast('找不到這一行'); return null; }
  syncAll();
  let made = null;
  commit('create', asTask ? '任務物件' : '議題物件', title, () => {
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
 * 誰能結案：建立者，以及公司負責人（OWNER 席位，isOwner()）。
 * 負責人可以直接結案任何議題 —— 包含別人建立的、包含自己提出的結論 ——
 * 不必等建立者同意；結案後通知建立者，紀錄裡寫明是誰結的。其他人走「提出結論」。
 */
function agCanClose(d) { return !!d && (d.author === DB.me || isOwner()); }
/** 結案通知要給誰：不是自己結的，就通知建立者；自己的提案被別人同意，就通知提案者。 */
function agNotifyTo(d, proposer) {
  if (proposer && proposer !== DB.me) return proposer;
  return d.author !== DB.me ? d.author : '';
}

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
  commit('update', next ? '任務物件' : '議題物件', docObjectName(d), () => {
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
  // 指派與否決定它叫議題還是任務：麵包屑、標籤、欄位都要跟著換，整頁重畫。
  agRepaintPage(id);
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
  agRepaintPageState(id);
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
  agRepaintPageState(id);
}

/* 結案與重新開啟都改變了頁尾該出現哪幾顆按鈕，但 commit() 的 render() 只重畫工作台，
 * 抽屜的頁尾不在它的範圍裡 —— 不補這一下，結案成功之後畫面仍停在「完成並結案」，
 * 看起來就像沒反應。 */
function agPageOpen(id) {
  const stack = S.stack || [];
  const top = stack[stack.length - 1];
  return !!top && top.type === 'doc_object' && top.id === id;
}
function agRepaintPage(id) {
  if (agPageOpen(id)) paintDrawer();
}

/* 議題頁上的欄位與討論也不在 render() 的範圍裡：render() 重畫工作台，獨立頁面只補段落正文
 * （repaintDocPageBody）。在議題頁按「送出」，那一則其實已經寫進資料、背後的日誌卡片也更新了，
 * 但眼前這一頁仍然是「討論 · 0」、輸入框裡的字也還在 —— 看起來就是送不出去。
 * 改到期日、延期也是同一回事：狀態 pill 與「帶過」停在舊的。
 *
 * 只換這兩塊而不整頁重畫，是為了不動到同一頁上正在寫的標題與段落。
 * 欄位逐列換，而且跳過正在輸入日期的那一列：到期日是 <input type="date">，用鍵盤逐段輸入時
 * 每湊成一個合法日期就觸發一次 change，整塊換掉會把輸入打斷。只認輸入框本身 ——
 * Chromium 點按鈕會把焦點給按鈕，連按鈕也算的話，按「明天」那一列反而不會更新。 */
function agRepaintPageState(id) {
  if (!agPageOpen(id)) return;
  const d = agFind(id), body = root.querySelector('#drBody');
  if (!d || !body) return;
  const fresh = doc.createElement('div');
  fresh.innerHTML = agFieldsHtml(d) + agThreadHtml(d, 'page');
  const rows = body.querySelectorAll('.ag-fields > .ag-f'), next = fresh.querySelectorAll('.ag-fields > .ag-f');
  const focused = shadow.activeElement;
  const typing = focused && focused.matches('input.ag-date') ? focused : null;
  rows.forEach((row, i) => { if (next[i] && !(typing && row.contains(typing))) row.replaceWith(next[i]); });
  const thread = body.querySelector('.ag-thread.page'), thread2 = fresh.querySelector('.ag-thread.page');
  if (thread && thread2) thread.replaceWith(thread2);
}

function agComplete(id) {
  const d = agFind(id);
  if (!d) return;
  // 結案是建立者（或公司負責人）的決定。其他人（含被指派的負責人）寫結論走「提出結論」。
  if (!agCanClose(d)) {
    openDocPage(id);
    return toast(`在「提出結論」寫下結論後送出，${person(d.author)} 會收到通知並決定是否結案`);
  }
  // 已經有人提出結論在等：按結案＝同意那一份。
  if (agState(d).proposal) return agAccept(id);
  // 負責人結別人的議題：結論段是建立者的正文、負責人改不到，所以結論從下方輸入框來。
  if (d.author !== DB.me && !agConclusion(d)) {
    if ((agConcDrafts.get(id) || '').trim()) return agOwnerClose(id);
    openDocPage(id);
    return toast('在下方「結論」寫下決定，按「寫下並結案」');
  }
  /* 按鈕是 mousedown 才讓焦點離開可編輯區的，最後一段文字（尤其注音組字剛結束那一下）
   * 有機會還沒回寫到 model。讀結論之前先回寫一次，否則「剛打完就按結案」會被誤判成沒有結論，
   * 而那一次誤判還會重畫獨立頁面，把畫面上看得到的字一起洗掉。 */
  syncAll();
  if (!agConclusion(d)) {
    openDocPage(id);
    return toast('結案前先在「結論」寫下決定或下一步');
  }
  const st = agState(d);
  commit('update', '議題物件', docObjectName(d), () => {
    const now = Date.now();
    st.doneAt = now;
    // 結論段是建立者寫的；負責人替別人的議題按結案時，撰寫人仍是建立者。
    st.concBy = d.author;
    st.concAt = now;
    st.closedBy = DB.me;
    st.concLog.push({ act: 'close', by: DB.me, at: now });
    const to = agNotifyTo(d);
    st.verdict = to ? { act: 'close', to, by: DB.me, at: now, seenAt: 0 } : null;
    d.updatedAt = now;
    return ['議題結案，結論留在物件裡', `結論由 ${person(d.author)} 撰寫`, ...(to ? [`已通知 ${person(to)}`] : []), '從收工檢查與右欄移除'];
  });
  agRepaintPage(id);
}

function agReopen(id) {
  const d = agFind(id);
  if (!d) return;
  if (!agOwned(d) && !isOwner()) return deny();
  const st = agState(d);
  commit('update', '議題物件', docObjectName(d), () => {
    st.doneAt = 0;
    st.concLog.push({ act: 'reopen', by: DB.me, at: Date.now() });
    d.updatedAt = Date.now();
    return ['重新開啟這個議題', st.concBy ? `上一次的結論（${person(st.concBy)} 撰寫）仍留在結論段` : ''].filter(Boolean);
  });
  agRepaintPage(id);
}

/* ---------- 結論：誰都能寫，建立者決定要不要結案 ----------
 *
 * 結論段是建立者的正文（docWritable 只給作者編輯），所以其他人寫結論走另一條路：
 * 送出一份「結論提案」，記下是誰寫的，並通知建立者。建立者兩個選擇：
 *   · 同意並結案 —— 提案寫進結論段，記錄撰寫人與確認人，議題結案。
 *   · 繼續討論 —— 提案原文移進討論串（不丟字），議題維持開啟。
 * 不論哪一種，提出的人都會收到結果通知。 */

const agConcDrafts = new Map();

function agPropose(id) {
  const d = agFind(id);
  if (!d) return;
  const st = agState(d);
  if (st.doneAt) return toast('這個議題已經結案');
  if (d.author === DB.me) return toast('你是建立者：直接在「結論」段寫下決定，再按「完成並結案」');
  if (st.proposal && st.proposal.by !== DB.me) return toast(`${person(st.proposal.by)} 已經提出結論，等 ${person(d.author)} 決定中`);
  const x = (agConcDrafts.get(id) || '').trim();
  if (!x) return toast('先寫下結論、決定或下一步，再送出');
  commit('update', '議題物件', docObjectName(d), () => {
    const now = Date.now();
    st.proposal = { by: DB.me, at: now, text: x, seenAt: 0 };
    st.verdict = null;
    st.concLog.push({ act: 'propose', by: DB.me, at: now, text: x });
    agConcDrafts.delete(id);
    d.updatedAt = now;
    return [`${person(DB.me)} 提出結論`, `已通知 ${person(d.author)} 決定是否結案`];
  });
  agRepaintPage(id);
}

/** 提案者自己撤回（例如發現寫錯了）。撤回不通知建立者 —— 通知本來就是從 proposal 推導的，它消失就不再出現。 */
function agWithdraw(id) {
  const d = agFind(id);
  if (!d) return;
  const st = agState(d);
  if (!st.proposal || st.proposal.by !== DB.me) return deny();
  commit('update', '議題物件', docObjectName(d), () => {
    agConcDrafts.set(id, st.proposal.text);   // 撤回的字放回輸入框，改一改可以再送
    st.concLog.push({ act: 'withdraw', by: DB.me, at: Date.now() });
    st.proposal = null;
    d.updatedAt = Date.now();
    return ['撤回結論提案'];
  });
  agRepaintPage(id);
}

/** 建立者同意：提案寫進結論段（結論段原本有字就接在後面），記下撰寫人與確認人，結案。 */
function agAccept(id) {
  const d = agFind(id);
  if (!d) return;
  const st = agState(d), pr = st.proposal;
  if (!pr) return;
  if (!agCanClose(d)) return deny();
  syncAll();
  commit('update', '議題物件', docObjectName(d), () => {
    const now = Date.now();
    const blocks = ensureSecBlocks(d.secs[1]);
    const lines = pr.text.split(/\n+/).map(t => t.trim()).filter(Boolean)
      .map(text => ({ id: newBid(), t: 'p', ind: 0, text }));
    if (!agConclusion(d)) blocks.length = 0;
    blocks.push(...lines);
    st.doneAt = now;
    st.concBy = pr.by;
    st.concAt = pr.at;
    st.closedBy = DB.me;
    st.concLog.push({ act: 'accept', by: DB.me, at: now, of: pr.by });
    const to = agNotifyTo(d, pr.by);
    st.verdict = to ? { act: pr.by === DB.me ? 'close' : 'accept', to, by: DB.me, at: now, seenAt: 0 } : null;
    st.proposal = null;
    d.updatedAt = now;
    return [pr.by === DB.me ? '以自己的結論結案' : `同意 ${person(pr.by)} 的結論並結案`,
      `結論由 ${person(pr.by)} 撰寫，${person(DB.me)} 確認`, ...(to ? [`已通知 ${person(to)}`] : [])];
  });
  agRepaintPage(id);
}

/** 建立者選擇繼續討論：提案原文移進討論串（不丟字），可附一句理由，議題維持開啟。 */
function agContinue(id) {
  const d = agFind(id);
  if (!d) return;
  const st = agState(d), pr = st.proposal;
  if (!pr) return;
  if (!agCanClose(d) || pr.by === DB.me) return deny();
  const note = (agConcDrafts.get(id + ':note') || '').trim();
  commit('update', '議題物件', docObjectName(d), () => {
    const now = Date.now(), ts = nowts().slice(0, 5);
    st.msgs.push({ w: pr.by, x: '結論提案（未結案）：' + pr.text, ts, at: pr.at, kind: 'proposal' });
    if (note) st.msgs.push({ w: DB.me, x: note, ts, at: now });
    st.concLog.push({ act: 'continue', by: DB.me, at: now, of: pr.by, note });
    st.verdict = { act: 'continue', to: pr.by, by: DB.me, at: now, seenAt: 0, note };
    st.proposal = null;
    agConcDrafts.delete(id + ':note');
    d.updatedAt = now;
    return [`${person(DB.me)} 選擇繼續討論`, '提案原文已移進討論串', `已通知 ${person(pr.by)}`];
  });
  agRepaintPage(id);
}

/** 公司負責人直接結別人的議題：結論從輸入框來，寫進結論段，結案並通知建立者。 */
function agOwnerClose(id) {
  const d = agFind(id);
  if (!d) return;
  const st = agState(d);
  if (st.doneAt) return;
  if (!agCanClose(d)) return deny();
  if (st.proposal) return agAccept(id);
  const x = (agConcDrafts.get(id) || '').trim();
  if (!x) return toast('先寫下結論、決定或下一步，再結案');
  syncAll();
  commit('update', '議題物件', docObjectName(d), () => {
    const now = Date.now();
    const blocks = ensureSecBlocks(d.secs[1]);
    const lines = x.split(/\n+/).map(t => t.trim()).filter(Boolean).map(text => ({ id: newBid(), t: 'p', ind: 0, text }));
    if (!agConclusion(d)) blocks.length = 0;
    blocks.push(...lines);
    st.doneAt = now;
    st.concBy = DB.me;
    st.concAt = now;
    st.closedBy = DB.me;
    st.concLog.push({ act: 'close', by: DB.me, at: now, text: x });
    const to = agNotifyTo(d);
    st.verdict = to ? { act: 'close', to, by: DB.me, at: now, seenAt: 0 } : null;
    agConcDrafts.delete(id);
    d.updatedAt = now;
    return ['寫下結論並結案', `結論由 ${person(DB.me)} 撰寫`, ...(to ? [`已通知 ${person(to)}`] : [])];
  });
  agRepaintPage(id);
}

/** 「結論由誰寫、誰確認」一行字。議題頁欄位、物件索引共用。 */
function agConcCredit(d) {
  const st = agState(d);
  if (st.proposal) return `${person(st.proposal.by)} 提出結論 · 等 ${person(d.author)} 決定`;
  if (!st.concBy) return '';
  const by = person(st.concBy);
  if (!st.doneAt) return `上次結論 ${by} 撰寫 · 已重新開啟`;
  return st.closedBy && st.closedBy !== st.concBy ? `結論 ${by} 撰寫 · ${person(st.closedBy)} 確認結案` : `結論 ${by} 撰寫並結案`;
}

/** 結論區塊：卡片與議題頁共用。依「我是誰」與「目前有沒有提案」決定長相。 */
function agConcHtml(d, where) {
  const st = agState(d), pr = st.proposal, mine = d.author === DB.me, canClose = agCanClose(d);
  let inner = '';
  if (st.doneAt) {
    if (!st.concBy) return '';
    inner = `<div class="ag-conc-h">${svg('check', 12)} ${esc(agConcCredit(d))}</div>`;
  } else if (pr) {
    const head = `<div class="ag-conc-h">${rqAv(pr.by)} <b>${esc(person(pr.by))}</b> 提出結論 <span class="rq-meta">${esc(ntTimeSafe(pr.at))}</span></div>
      <div class="ag-conc-x">${esc(pr.text)}</div>`;
    if (canClose && pr.by !== DB.me) {
      inner = head + `<div class="rq-compose ag-compose">
        <input data-ag-note="${d.id}" aria-label="繼續討論的理由（選填）" placeholder="繼續討論的理由（選填）…" value="${esc(agConcDrafts.get(d.id + ':note') || '')}"
          oninput="event.stopPropagation();agConcDrafts.set('${d.id}:note',this.value)" onkeydown="event.stopPropagation()">
        <button class="btn sm" onclick="agContinue('${d.id}')">${svg('message', 12)} 繼續討論</button>
        <button class="btn sm pri" onclick="agAccept('${d.id}')">${svg('check', 12)} 同意並結案</button></div>`;
    } else if (pr.by === DB.me) {
      inner = head + `<div class="ag-conc-foot"><span class="rq-meta">${canClose
        ? `你是負責人，可以直接用這份結論結案（會通知 ${esc(person(d.author))}）`
        : `已通知 ${esc(person(d.author))}，等他決定結案或繼續討論`}</span>
        <span class="ag-due"><button class="btn sm" onclick="agWithdraw('${d.id}')">撤回</button>
        ${canClose ? `<button class="btn sm pri" onclick="agAccept('${d.id}')">${svg('check', 12)} 直接結案</button>` : ''}</span></div>`;
    } else {
      inner = head + `<div class="ag-conc-foot"><span class="rq-meta">等 ${esc(person(d.author))} 決定</span></div>`;
    }
  } else if (!mine) {
    const v = st.verdict && st.verdict.to === DB.me && st.verdict.act === 'continue'
      ? `<div class="ag-conc-h">${svg('message', 12)} ${esc(person(st.verdict.by))} 選擇繼續討論${st.verdict.note ? '：' + esc(st.verdict.note) : ''}</div>` : '';
    inner = v + `<div class="ag-conc-h">${svg('flag', 12)} ${canClose ? '結論' : '提出結論'} <span class="rq-meta">${canClose
        ? `你是負責人：可以直接寫下並結案（通知 ${esc(person(d.author))}），或送出請 ${esc(person(d.author))} 決定`
        : `送出後通知 ${esc(person(d.author))}，由他決定結案或繼續討論`}</span></div>
      <div class="rq-compose ag-compose ag-conc-compose">
        <textarea data-ag-conc="${d.id}" rows="2" aria-label="結論：${esc(docObjectName(d))}" placeholder="結論、決定與下一步…"
          oninput="event.stopPropagation();agConcDrafts.set('${d.id}',this.value)" onkeydown="event.stopPropagation()">${esc(agConcDrafts.get(d.id) || '')}</textarea>
        <button class="btn sm ${canClose ? '' : 'pri'}" onclick="agPropose('${d.id}')">${svg('send', 12)} 送出結論</button>
        ${canClose ? `<button class="btn sm pri" onclick="agOwnerClose('${d.id}')">${svg('check', 12)} 寫下並結案</button>` : ''}</div>`;
  } else {
    return '';
  }
  return `<div class="ag-conc ${where} ${pr ? 'pending' : ''}" contenteditable="false">${inner}</div>`;
}
/** 通知匣的 ntTime 住在 notifications.source.js（載入順序在後），這裡呼叫時才解析。 */
function ntTimeSafe(ms) { return typeof ntTime === 'function' ? ntTime(ms) : ''; }

/* ---------- 討論與附件 ---------- */

/** 議題討論的引用 key（obj-names.source.js 的共用引用輸入）。harness 單獨跑這支檔案時沒有那一支，退回空。 */
const agRefKey = id => 'ag:' + id;
const agHasRefs = typeof orRefsOf === 'function';

function agSay(id) {
  const d = agFind(id);
  if (!d) return;
  const x = (agDrafts.get(id) || '').trim();
  const refs = agHasRefs ? orRefsOf(agRefKey(id)) : [];
  if (!x && !refs.length) return toast('先寫點什麼再送出');
  const st = agState(d);
  // 同一個議題的輸入框會同時長在兩處：日誌卡片，和打開的議題頁。回焦點要回到使用者正在用的那一個。
  const inPage = agPageOpen(id);
  // commit() 自己會 render()，所以要在 commit 之前排好回焦點，否則這一次渲染會吃不到。
  if (!inPage) runtime._afterRender = () => root.querySelector('[data-ag-input="' + id + '"]')?.focus();
  commit('update', '議題物件', docObjectName(d), () => {
    st.msgs.push({ w: DB.me, x, ts: nowts().slice(0, 5), at: Date.now(), ...(refs.length ? { refs } : {}) });
    agDrafts.delete(id);
    if (agHasRefs) orClear(agRefKey(id));
    d.updatedAt = Date.now();
    return [`討論累積 ${st.msgs.length} 則`];
  });
  if (inPage) {
    agRepaintPageState(id);
    root.querySelector('#drBody [data-ag-input="' + id + '"]')?.focus();
  }
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
    agRepaintPageState(id);
  });
}

/* ---------- 畫面：日誌裡的卡片 ---------- */

/** 狀態 pill：顏色只在這裡出現。四個狀態各自走 --ag-<state>-{bg,br,ink} 三階。 */
function agStatePill(d) {
  // 議題也宣告狀態（開放／討論中／待確認結案／已結案）—— 物件索引與卡片要即時看得出進度。
  // 用字刻意跟任務的「待辦／進行中」分開，兩者不會混淆。
  const i = agStatusInfo(d);
  const ic = i.k === 'done' ? 'check' : i.k === 'over' ? 'refresh' : i.k === 'review' ? 'flag' : 'dot';
  return `<span class="ag-pill ${i.cls}">${svg(ic, i.k === 'done' ? 11 : 9)} ${i.label}</span>`;
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
    ? st.msgs.map(m => `<div class="rq-msg">${rqAv(m.w)}<div><b>${esc(person(m.w))}</b> <span class="rq-meta">${esc(m.ts || '')}</span>${m.x ? `<div class="rq-msg-x">${esc(m.x)}</div>` : ''}${agHasRefs ? orChips(m.refs) : ''}</div></div>`).join('')
    : '<div class="rq-empty">還沒有討論</div>';
  const key = agRefKey(d.id);
  // 卡片與議題頁各有一個輸入框、共用同一份草稿與引用；焦點與重畫以使用者正在用的那一個為準。
  if (agHasRefs && !st.doneAt) orBind(key, {
    get: () => agDrafts.get(d.id) || '',
    set: v => agDrafts.set(d.id, v),
    focus: () => (agPageOpen(d.id) ? root.querySelector('#drBody [data-ag-input="' + d.id + '"]') : null) || root.querySelector('[data-ag-input="' + d.id + '"]')
  });
  const box = st.doneAt ? '' : `<div class="rq-compose ag-compose">
    <textarea rows="1" class="rq-ta" data-ag-input="${d.id}" aria-label="討論：${esc(docObjectName(d))}" placeholder="寫下討論…（Enter 送出 · Shift+Enter 換行 · @ 引用物件）" oninput="agDrafts.set('${d.id}',this.value);if(agHasRefs)orInput('${key}',this.value);this.style.height='auto';this.style.height=Math.min(this.scrollHeight,160)+'px';" onkeydown="if(agHasRefs&&orKey(event,'${key}'))return;if(event.key==='Enter'){event.stopPropagation();if(!event.shiftKey&&!event.isComposing){event.preventDefault();agSay('${d.id}')}}">${esc(agDrafts.get(d.id) || '')}</textarea>
    ${agHasRefs ? orButton(key) : ''}
    <button class="btn sm" onclick="agAttach('${d.id}')">${svg('paperclip', 12)} 附檔</button>
    <button class="btn sm pri" onclick="agSay('${d.id}')">${svg('send', 12)} 送出</button></div>
    ${agHasRefs ? orTray(key) : ''}`;
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
        <span class="chip ${meta.chip}">${svg('flag', 11)} ${docObjectLabel(d, meta)}</span>
        <span class="eb-doc-bar-title" ${typeof objRenAttr === 'function' ? objRenAttr('doc_object', d.id) : ''}>${esc(docObjectName(d))}</span>
        <span class="ag-pills">${agPills(d)}</span>
        ${stkDocChip(d)}
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
      ${agConcHtml(d, 'card')}
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

/** 議題頁上方的欄位。抽屜第一次畫與之後的局部重畫（agRepaintPageState）共用這一份。 */
function agFieldsHtml(d) {
  const st = agState(d);
  return `<div class="ag-fields">
        <div class="ag-f"><span class="k">提出</span><span class="v"><b>${esc(st.bornDay || d.day)}</b> · ${esc(person(d.author))}</span></div>
        <div class="ag-f"><span class="k">負責</span><span class="v">${agOwnerControls(d)}</span></div>
        <div class="ag-f"><span class="k">到期</span><span class="v">${agDueControls(d)}</span></div>
        <div class="ag-f"><span class="k">帶過</span><span class="v">${st.carried.length ? `<b>${st.carried.length} 次</b> · ${esc(st.carried.join('、'))}` : '沒有延期過'}</span></div>
        <div class="ag-f"><span class="k">狀態</span><span class="v">${agStatePill(d)}${agIsTask(d) ? '' : ' <span class="ag-pill soft">議題 · 尚未指派負責人</span>'}</span></div>
        <div class="ag-f"><span class="k">結論</span><span class="v">${esc(agConcCredit(d) || (d.author === DB.me ? '還沒有結論' : agCanClose(d) ? `還沒有結論 · 你是負責人，可以直接結案` : `還沒有結論 · 任何人都可以提出，由 ${person(d.author)} 決定結案`))}</span></div>
      </div>`;
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
        <span class="chip ${meta.chip}">${svg('flag', 11)} ${docObjectLabel(d, meta)}</span>
        <span class="ag-ref">${esc(d.id)}</span>
        <span>${esc(docObjectTimestamp(d))}</span>
        <span class="doc-page-sync-tag">● 與日誌即時雙向連動</span>
      </span>`,
    body: `
      ${agFieldsHtml(d)}
      <div class="doc-page-workspace">
        ${d.secs.map((sec, idx) => renderDocSectionBody(d, sec, idx, meta)).join('')}
      </div>
      ${agConcHtml(d, 'page')}
      ${agThreadHtml(d, 'page')}
    `,
    foot: `
      ${st.doneAt
        ? (agOwned(d) || isOwner() ? `<button class="btn" onclick="agReopen('${d.id}')">${svg('refresh', 12)} 重新開啟</button>` : '')
        : `${agOwned(d) ? `<button class="btn" onclick="agCarryTo('${d.id}','${dadd(TODAY, 1)}')">${svg('goto', 12)} 延到明天</button>` : ''}
           ${agCanClose(d) ? `<button class="btn pri" onclick="agComplete('${d.id}')">${svg('check', 12)} ${st.proposal ? '同意並結案' : '完成並結案'}</button>` : ''}`}
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
/**
 * 結論通知：
 *   · 給建立者：有人提出結論，等你決定（同意結案／繼續討論）。
 *   · 給提出的人：建立者的決定。
 * 一樣從物件本身推導，不另開表；已讀記在 proposal.seenAt／verdict.seenAt。
 */
function agCloseNotices(who = DB.me) {
  const out = [];
  agAll().forEach(d => {
    const st = agState(d);
    if (st.proposal && d.author === who && st.proposal.by !== who) {
      out.push({
        kind: 'agclose', ref: d.id, at: st.proposal.at, seen: !!st.proposal.seenAt, tone: 'ask',
        title: `${person(st.proposal.by)} 寫了結論，請你決定是否結案`,
        text: docObjectName(d) + ' · ' + st.proposal.text
      });
    }
    const v = st.verdict;
    if (v && v.to === who && v.by !== who) {
      out.push({
        kind: 'agverdict', ref: d.id, at: v.at, seen: !!v.seenAt, tone: v.act === 'continue' ? 'ask' : 'replied',
        title: v.act === 'accept' ? `${person(v.by)} 同意你的結論並結案`
          : v.act === 'close' ? `${person(v.by)} 結案了你建立的議題` : `${person(v.by)} 選擇繼續討論`,
        text: docObjectName(d) + (v.note ? ' · ' + v.note : '')
      });
    }
  });
  return out;
}
function agMarkCloseSeen(who = DB.me) {
  let n = 0;
  agAll().forEach(d => {
    const st = agState(d);
    if (st.proposal && d.author === who && st.proposal.by !== who && !st.proposal.seenAt) { st.proposal.seenAt = Date.now(); n++; }
    if (st.verdict && st.verdict.to === who && !st.verdict.seenAt) { st.verdict.seenAt = Date.now(); n++; }
  });
  return n;
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

// 回顧分頁由 journal-review.source.js 統一擁有（同步列／篩選／三種檢視），
// 這裡只負責提供任務那一段的內容，不自己掛 VIEWS.journal —— 兩邊都包會疊出兩份。

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

/* ---------- 即時：別的席位改了議題，打開的議題頁跟著換 ----------
 * operating-persistence 的輪詢合併了遠端資料之後呼叫這裡。render() 只重畫工作台，
 * 抽屜不在範圍內 —— 不補這一下，建立者開著議題頁時對方送來的結論提案看不到。
 * 正在輸入（標題、段落、輸入框）時不重畫，避免把打到一半的字洗掉。 */
function agLiveRepaint() {
  const stack = S.stack || [], top = stack[stack.length - 1];
  if (!top || !root.querySelector('#drawer.on')) return;
  const a = shadow.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
  if ((top.type === 'doc_object' && agFind(top.id)) || top.type === 'notice') paintDrawer();
}
