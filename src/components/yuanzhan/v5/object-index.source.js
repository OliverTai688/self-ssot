/* ── 物件索引（日誌第三分頁，取代原「標籤流」）────────────────────────────
   形狀的依據見 journal-tagstream-object-index-proposals.html：
   · Teevan 2004：已知目標時仍只有 39% 的搜尋用關鍵字 → 瀏覽與搜尋並重，
     每一列給兩個目的地（開物件 ↗ ／回到來源那一行 ⤵）。
   · Dumais 2003：個人語料偏好「依日期」而非「依相關度」→ 預設與搜尋結果皆依時間。
   · Ringel 2003：時間地標可量化改善找回 → 月份列與來源欄掛上當天的日誌標題。
   · Allen 1989：人回憶內容勝過回憶名稱 → 搜尋含段落內文，命中顯示標亮片段。
   · RES-018：顯示名稱會變、參考碼不會 → 名稱旁常駐等寬可複製參考碼。
   · RES-002 / ARC-030：resource index 必備 search/filter/sort/paginate/detail；
     唯讀，無批次寫入（ARC-030 §8，稽核與核可到位前一律拒絕）。
   · ARC-012：records 不得做成裝飾性活動卡牆 → 密集表格為主、時間軸為輔。
   資料來源以「物件帳本」為準，日誌只降級成來源欄 —— 日誌那一行被刪掉，物件仍在。
   ──────────────────────────────────────────────────────────────────── */

const OI_PER_PAGE = 25;
const OI = { q: '', types: new Set(), jrnlOnly: false, sort: 'born', view: 'table', page: 0 };
const OI_SORTS = [['born', '建立時間 ↓'], ['upd', '最後更新 ↓'], ['type', '型別 · 時間']];

/* 非文件型物件走各自的帳本。名稱欄一律 x.t；日期欄各帳本不同，沒有的留空。 */
const OI_LEDGERS = {
  issue:    { nm: '工作', chip: 'c-p', list: () => DB.issues || [],    day: x => x.created || '' },
  txn:      { nm: '金流', chip: 'c-w', list: () => DB.txns || [],      day: x => x.d || '' },
  project:  { nm: '專案', chip: 'c-i', list: () => DB.projects || [],  day: () => '' },
  decision: { nm: '決策', chip: 'c-o', list: () => DB.decisions || [], day: x => x.date || '' },
  event:    { nm: '事件', chip: 'c-t', list: () => DB.events || [],    day: x => x.d || '' }
};

/* ---------- 小工具 ---------- */
function oiPad2(n) { return String(n).padStart(2, '0'); }
function oiDayMs(d) { const t = Date.parse((d || '') + 'T00:00:00Z'); return Number.isNaN(t) ? 0 : t; }
function oiMonth(d) { return (d || '').slice(0, 7); }
function oiFmtDay(d) { return d ? Number(d.slice(5, 7)) + '/' + d.slice(8, 10) : '—'; }
function oiFmtTime(ms) {
  const d = new Date(ms);
  return (d.getMonth() + 1) + '/' + oiPad2(d.getDate()) + ' ' + oiPad2(d.getHours()) + ':' + oiPad2(d.getMinutes());
}
function oiKey(r) { return r.born || oiDayMs(r.day); }
function oiBooks() { return DB.journalBooks || { team: { yz: DB.journal } }; }

/* 時間地標：那一天的日誌標題。預設 title 等於日期字串時視為沒有標題。 */
function oiDayTitles() {
  const m = Object.create(null), books = oiBooks();
  for (const sp of Object.keys(books)) for (const who of Object.keys(books[sp] || {})) {
    const book = books[sp][who] || {};
    for (const day of Object.keys(book)) {
      const t = book[day] && book[day].title;
      if (t && t !== day && !m[day]) m[day] = t;
    }
  }
  return m;
}

/* 反向索引：rid → 它是從哪一天、第幾行、由誰召喚出來的。
   同時掃每份文件物件的段落（sec.blocks），所以在 Standup 段落裡召喚的物件也查得到來源。 */
function oiNoteSource(map, b, line, day, who, docId) {
  if (!b || b.t !== 'obj' || !b.obj || !b.obj.rid) return;
  const born = b.obj.bornAt || 0, cur = map[b.obj.rid];
  if (cur && !(born && !cur.bornAt)) return;
  map[b.obj.rid] = { day, line, who, bid: b.id, bornAt: born, docId: docId || '' };
}
function oiSourceIndex() {
  const map = Object.create(null), books = oiBooks();
  for (const sp of Object.keys(books)) for (const who of Object.keys(books[sp] || {})) {
    const book = books[sp][who] || {};
    for (const day of Object.keys(book)) {
      const blocks = (book[day] && book[day].blocks) || [];
      blocks.forEach((b, i) => oiNoteSource(map, b, i + 1, day, who, ''));
    }
  }
  (DB.docObjects || []).forEach(d => (d.secs || []).forEach(sec =>
    ensureSecBlocks(sec).forEach((b, i) => oiNoteSource(map, b, i + 1, d.day, d.author, d.id))));
  return map;
}

/* 搜尋語料：文件物件把每一段的文字都攤平，因為人記得的是內容不是標題。 */
function oiDocText(d) {
  let out = '';
  (d.secs || []).forEach(sec => ensureSecBlocks(sec).forEach(b => {
    if (TEXTY(b.t) && b.text) out += b.text + ' ';
  }));
  return out;
}

function oiRows() {
  const src = oiSourceIndex(), titles = oiDayTitles(), rows = [];
  (DB.docObjects || []).forEach(d => {
    const meta = metaOf(d), s = src[d.id] || null, day = d.day || (s && s.day) || '';
    rows.push({
      id: d.id, ty: 'doc_object', tyKey: d.type, tyNm: meta.nm, chip: meta.chip,
      name: docObjectName(d), code: d.id,
      born: d.createdAt || (s && s.bornAt) || 0, day,
      updated: d.updatedAt || 0, body: oiDocText(d), src: s,
      landmark: (s && titles[s.day]) || titles[day] || '', snip: ''
    });
  });
  Object.keys(OI_LEDGERS).forEach(ty => {
    const L = OI_LEDGERS[ty];
    L.list().forEach(x => {
      const s = src[x.id] || null, day = (s && s.day) || L.day(x) || '';
      rows.push({
        id: x.id, ty, tyKey: ty, tyNm: L.nm, chip: L.chip,
        name: x.t || x.id, code: x.id,
        born: (s && s.bornAt) || 0, day,
        updated: 0, body: x.t || '', src: s,
        landmark: (s && titles[s.day]) || titles[day] || '', snip: ''
      });
    });
  });
  return rows;
}

function oiSnippet(text, q) {
  const i = String(text).toLowerCase().indexOf(q);
  if (i < 0) return '';
  const a = Math.max(0, i - 26), b = Math.min(text.length, i + q.length + 42);
  return (a > 0 ? '…' : '') + esc(text.slice(a, i)) + '<mark>' + esc(text.slice(i, i + q.length)) +
    '</mark>' + esc(text.slice(i + q.length, b)) + (b < text.length ? '…' : '');
}

/* facet 數字算在「型別以外的條件都套用完」的集合上，這樣數字才等於按下去會看到的列數。 */
function oiCompute() {
  const q = OI.q.trim().toLowerCase();
  let base = oiRows();
  if (OI.jrnlOnly) base = base.filter(r => r.src);
  if (q) base = base.filter(r => {
    const inBody = (r.body || '').toLowerCase().includes(q);
    const ok = inBody || (r.name || '').toLowerCase().includes(q) || (r.code || '').toLowerCase().includes(q);
    if (ok) r.snip = inBody ? oiSnippet(r.body, q) : '';
    return ok;
  });
  const rows = OI.types.size ? base.filter(r => OI.types.has(r.tyKey)) : base.slice();
  if (OI.sort === 'upd') rows.sort((a, b) => (b.updated || oiKey(b)) - (a.updated || oiKey(a)));
  else if (OI.sort === 'type') rows.sort((a, b) => String(a.tyNm).localeCompare(String(b.tyNm), 'zh-Hant') || oiKey(b) - oiKey(a));
  else rows.sort((a, b) => oiKey(b) - oiKey(a));
  return { base, rows };
}

/* ---------- 互動（全部唯讀：開啟、跳回來源、複製參考碼） ---------- */
function oiSetQ(event) {
  OI.q = event.target.value; OI.page = 0;
  runtime._afterRender = () => {
    const el = root.querySelector('#oiQ');
    if (!el) return;
    el.focus();
    const v = el.value;
    try { el.setSelectionRange(v.length, v.length); } catch { /* 某些輸入型別不支援 setSelectionRange */ }
  };
  render();
}
function oiClearQ() { OI.q = ''; OI.page = 0; render(); }
function oiToggleType(k) { if (OI.types.has(k)) OI.types.delete(k); else OI.types.add(k); OI.page = 0; render(); }
function oiClearTypes() { OI.types.clear(); OI.page = 0; render(); }
function oiToggleJrnl() { OI.jrnlOnly = !OI.jrnlOnly; OI.page = 0; render(); }
function oiCycleSort() {
  const i = OI_SORTS.findIndex(s => s[0] === OI.sort);
  OI.sort = OI_SORTS[(i + 1) % OI_SORTS.length][0];
  OI.page = 0; render();
}
function oiSetView(v) { OI.view = v; OI.page = 0; render(); }
function oiGoPage(n) { OI.page = n; render(); }
function oiReset() { OI.q = ''; OI.types.clear(); OI.jrnlOnly = false; OI.page = 0; render(); }
function oiToToday() { saveJournalDraft(); S.wb = 'journal'; S.tab = 0; S.jday = TODAY; render(); }

function oiOpen(ty, rid) { if (ty === 'doc_object') return openDocPage(rid); objJump(ty, rid); }

/* 第二條路：回到物件誕生的那一行。段落內召喚的物件回到它所在的文件。 */
function oiJump(rid) {
  const s = oiSourceIndex()[rid];
  if (!s) return toast('這個物件沒有日誌來源');
  if (s.docId) return openDocPage(s.docId);
  saveJournalDraft();
  S.wb = 'journal'; S.tab = 0; S.jday = s.day;
  runtime._afterRender = () => {
    const el = root.querySelector('.eb[data-id="' + s.bid + '"]');
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('rq-flash');
    setTimeout(() => el.classList.remove('rq-flash'), 2900);
  };
  render();
}
function oiCopyCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(code).then(() => toast('已複製 ' + code), () => toast('複製失敗'));
  else toast('此瀏覽器不支援複製');
}

/* ---------- 渲染 ---------- */
function oiFacetChip(k, nm, color, n) {
  const on = OI.types.has(k);
  return `<button class="oi-fchip${on ? ' on' : ''}${n ? '' : ' zero'}" onclick="oiToggleType('${k}')"
    aria-pressed="${on}"><i class="oi-dot" style="background:${color}"></i>${esc(nm)}<span class="n">${n}</span></button>`;
}
function oiFacets(base) {
  const count = k => base.filter(r => r.tyKey === k).length;
  const docs = Object.keys(DOC_METAS).map(k => oiFacetChip(k, DOC_METAS[k].nm, DOC_METAS[k].color, count(k))).join('');
  const led = Object.keys(OI_LEDGERS).map(k => oiFacetChip(k, OI_LEDGERS[k].nm, 'var(--text-3)', count(k))).join('');
  return `<div class="oi-facets">
    <button class="oi-fchip${OI.types.size ? '' : ' on'}" onclick="oiClearTypes()">全部<span class="n">${base.length}</span></button>
    <i class="oi-fdiv"></i>${docs}<i class="oi-fdiv"></i>${led}
    <span class="oi-sp"></span>
    <button class="oi-fchip${OI.jrnlOnly ? ' on' : ''}" onclick="oiToggleJrnl()"
      title="只看從日誌召喚出來的物件">僅日誌誕生</button>
  </div>`;
}

function oiCmdBar() {
  const sort = (OI_SORTS.find(s => s[0] === OI.sort) || OI_SORTS[0])[1];
  return `<div class="oi-cmd">
    <div class="oi-search${OI.q ? ' on' : ''}">${svg('search', 14)}
      <input id="oiQ" class="oi-q" type="text" placeholder="搜尋名稱與內文…" value="${esc(OI.q)}" oninput="oiSetQ(event)">
      ${OI.q ? `<button class="oi-x" title="清除搜尋" onclick="oiClearQ()">${svg('x', 12)}</button>` : ''}
    </div>
    <span class="oi-sp"></span>
    <button class="btn sm" title="切換排序" onclick="oiCycleSort()">${svg('sort', 13)} ${esc(sort)}</button>
    <div class="oi-seg">
      <button class="${OI.view === 'table' ? 'on' : ''}" onclick="oiSetView('table')">${svg('list', 13)} 表格</button>
      <button class="${OI.view === 'timeline' ? 'on' : ''}" onclick="oiSetView('timeline')">${svg('cal', 13)} 時間軸</button>
    </div>
  </div>`;
}

function oiCodeBadge(code) {
  return `<button class="oi-code" title="複製參考碼（建立時指派，永不變動）" onclick="oiCopyCode('${esc(code)}')">${esc(code)}</button>`;
}
function oiSrcCell(r) {
  if (!r.src) return `<span class="oi-dim">${r.ty === 'doc_object' ? '來源日誌那一行已刪除' : '非日誌召喚'}</span>`;
  const where = r.src.docId ? '內嵌' : 'L' + r.src.line;
  return `<button class="oi-src" title="回到來源日誌那一行" onclick="oiJump('${esc(r.id)}')">
    <span class="oi-src-d">${esc(oiFmtDay(r.src.day))}</span>
    ${r.landmark ? `<span class="oi-src-l">${esc(r.landmark)}</span>` : ''}
    <span class="oi-src-n">${esc(where)}</span></button>`;
}
function oiBornCell(r) {
  if (r.born) return `<td class="oi-mono">${esc(oiFmtTime(r.born))}</td>`;
  return `<td class="oi-mono oi-dim" title="這個物件沒有建立時刻，顯示的是來源日">${esc(oiFmtDay(r.day))}</td>`;
}
function oiRowHtml(r) {
  return `<tr>
    <td><span class="chip ${r.chip}">${esc(r.tyNm)}</span></td>
    <td><span class="oi-nm">${esc(r.name)}</span>${oiCodeBadge(r.code)}${r.snip ? `<span class="oi-snip">${r.snip}</span>` : ''}</td>
    ${oiBornCell(r)}
    <td>${oiSrcCell(r)}</td>
    <td class="oi-mono oi-dim">${r.updated ? esc(oiFmtTime(r.updated)) : '—'}</td>
    <td><span class="oi-acts">
      <button title="開啟物件" onclick="oiOpen('${esc(r.ty)}','${esc(r.id)}')">${svg('arrowin', 12)}</button>
      ${r.src ? `<button title="回到來源日誌那一行" onclick="oiJump('${esc(r.id)}')">${svg('goto', 12)}</button>` : ''}
    </span></td></tr>`;
}
function oiGroupRow(m, all) {
  const inM = all.filter(r => oiMonth(r.day) === m), marks = [];
  inM.forEach(r => { if (r.landmark && marks.indexOf(r.landmark) < 0 && marks.length < 2) marks.push(r.landmark); });
  const label = m ? m.slice(0, 4) + ' 年 ' + Number(m.slice(5, 7)) + ' 月' : '無日期';
  return `<tr class="oi-grp"><td colspan="6">${esc(label)}<span class="n">${inM.length}</span>${marks.length ? `<span class="lmk">${esc(marks.join(' · '))}</span>` : ''}</td></tr>`;
}

function oiEmpty() {
  if (OI.q || OI.types.size || OI.jrnlOnly)
    return `<div class="oi-empty"><b>沒有符合的物件</b>
      <p>換個關鍵字，或把型別篩選清掉。</p>
      <button class="btn sm" onclick="oiReset()">清除所有條件</button></div>`;
  return `<div class="oi-empty"><b>還沒有任何物件</b>
    <p>在日誌裡打 <code>#</code> 召喚 Standup、會議紀錄、回顧，<br>
      它們會自動出現在這裡，並記下建立時間與來源日誌。</p>
    <button class="btn pri sm" onclick="oiToToday()">前往今天的日誌</button></div>`;
}

function oiTable(page, all) {
  let body = '', month = '\u0000';
  page.forEach(r => {
    if (OI.sort === 'born') {
      const m = oiMonth(r.day);
      if (m !== month) { month = m; body += oiGroupRow(m, all); }
    }
    body += oiRowHtml(r);
  });
  return `<div class="tbl-wrap"><table class="tbl oi-tbl">
    <thead><tr><th class="oi-w1">型別</th><th>物件</th><th class="oi-w2">建立時間</th>
      <th class="oi-w3">來源日誌</th><th class="oi-w4">最後更新</th><th class="oi-w5"></th></tr></thead>
    <tbody>${body || `<tr><td colspan="6">${oiEmpty()}</td></tr>`}</tbody></table></div>`;
}

function oiTimeline(page) {
  if (!page.length) return oiEmpty();
  const months = [];
  page.forEach(r => {
    const m = oiMonth(r.day), d = r.day || '';
    let mo = months.find(x => x.m === m);
    if (!mo) months.push(mo = { m, days: [] });
    let dy = mo.days.find(x => x.d === d);
    if (!dy) mo.days.push(dy = { d, rows: [] });
    dy.rows.push(r);
  });
  return `<div class="oi-tl">${months.map(mo => `
    <div class="oi-tl-m"><div class="oi-tl-mh">
      <b>${esc(mo.m ? mo.m.slice(0, 4) + ' 年 ' + Number(mo.m.slice(5, 7)) + ' 月' : '無日期')}</b>
      <span class="n">${mo.days.reduce((a, x) => a + x.rows.length, 0)} 個</span><i></i></div>
    ${mo.days.map(dy => `<div class="oi-tl-d">
      <div class="oi-tl-dl"><b>${esc(dy.d ? oiFmtDay(dy.d) : '—')}</b>
        <s>${esc((dy.rows.find(r => r.landmark) || {}).landmark || '')}</s></div>
      <div class="oi-tl-items">${dy.rows.map(r => `<div class="oi-tl-row">
        <span class="chip ${r.chip}">${esc(r.tyNm)}</span>
        <span class="oi-tl-nm"><button class="oi-linkbtn" onclick="oiOpen('${esc(r.ty)}','${esc(r.id)}')">${esc(r.name)}</button>
          ${r.snip ? `<span class="oi-snip">${r.snip}</span>` : ''}</span>
        ${r.src ? `<button class="oi-src sm" title="回到來源日誌那一行" onclick="oiJump('${esc(r.id)}')"><span class="oi-src-n">${esc(r.src.docId ? '內嵌' : 'L' + r.src.line)}</span></button>` : ''}
        <span class="oi-tl-tm">${esc(r.born ? oiFmtTime(r.born).slice(-5) : '')}</span>
      </div>`).join('')}</div></div>`).join('')}</div>`).join('')}</div>`;
}

function oiPager(total, from, to) {
  const pages = Math.max(1, Math.ceil(total / OI_PER_PAGE));
  if (pages <= 1) return `<div class="oi-foot">共 ${total} 個物件</div>`;
  const nums = [];
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - OI.page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return `<div class="oi-foot">顯示 ${from}–${to}，共 ${total} 個物件
    <span class="oi-pg">${nums.map(n => n === '…' ? '<span class="dots">…</span>' :
      `<button class="${n === OI.page ? 'on' : ''}" onclick="oiGoPage(${n})">${n + 1}</button>`).join('')}</span></div>`;
}

function oiView() {
  const { base, rows } = oiCompute();
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / OI_PER_PAGE));
  if (OI.page > pages - 1) OI.page = pages - 1;
  const from = OI.page * OI_PER_PAGE, page = rows.slice(from, from + OI_PER_PAGE);
  const body = oiCmdBar() + oiFacets(base) +
    (OI.view === 'timeline' ? oiTimeline(page) : oiTable(page, rows)) +
    (total ? oiPager(total, from + 1, from + page.length) : '');
  return guide('<b>物件索引。</b>所有從書寫裡誕生的物件都留在這裡，以物件本身為準 —— ' +
    '刪掉日誌那一行不會讓它消失。每一列給兩個目的地：開啟物件，或回到它誕生的那一行。', 'i') +
    panel('物件索引', `${total} 個物件`,
      `<span class="oi-mode" title="原型：資料只存在頁面記憶體，重整就重置">Prototype · 記憶體資料</span>` + body,
      '', true);
}

/* 分頁改名：標籤流 → 物件索引（REF-003：標籤流是 UI-088 的分頁，不另立 UI ID） */
const oiJournalWb = WB.find(x => x.id === 'journal');
if (oiJournalWb) oiJournalWb.tabs[2] = '物件索引';

const oiBaseJournalView = VIEWS.journal;
VIEWS.journal = function (tab) {
  if (tab !== 2) return oiBaseJournalView(tab);
  return oiView();
};
