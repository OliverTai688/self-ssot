/* ==================================================================
   pm-* 扁平操作面 primitive（規格：ARC-043、PLN-075 §S1.5 D）

   為什麼需要這一層：
     v5 工作台是 Shadow DOM ＋ vanilla JS，**無法 import React 元件**。
     既有的 src/components/owneros/insight-rail.tsx、detail-drawer.tsx 與死程式碼
     src/components/yuanzhan/primitives.tsx 的 RecordRows／.yz-row，只能移植「形狀
     與互動慣例」，不能複用程式碼；react-aria／motion／cmdk／vaul 在 v5 內同樣用不上
     （claude/nested-card-decoupling-research.md §1.1）。所以這裡是手寫的 vanilla 版。

   六個 primitive 與它們取代的東西（PLN-075 §S1.5 C 對照表）：
     pmRail     一行數字列          ← 統計卡牆
     pmRow(s)   扁平列              ← 清單卡
     pmTable    可排序／篩選／鍵盤導覽 ← 資料卡牆（ARC-012 primary surface 首選）
     pmTrack    期／階段水平軌       ← 階段卡
     pmTimeline 一條線＋節點         ← 活動卡牆（容器不得是卡）
     pmDrawer   細節抽屜            ← 把細節攤平在長卡裡

   硬規定（AGENTS.md §12.1）：
     - 圖示一律 svg(name, size)，不用 emoji、不寫字面 <svg>。
     - 顏色一律 var(--token, fallback)，token 在 company-theme.ts 的 V5_PALETTES。
     - 樣式全在 pm-primitives.css；這裡不寫 inline style 的色值。

   互動回呼的慣例：
     Shadow DOM 的 inline handler 會被 generator 編成閉包，但「把一段 JS 字串塞進
     attribute」不可行（會被當成識別字編譯）。所以每個有互動的 primitive 都吃一個
     穩定的 opts.id，回呼函式存在 PM 登記表裡，markup 只帶 id 與 row key。
     id 必須在同一個檢視內穩定，重繪後排序／摺疊狀態才留得住。
   ================================================================== */

const PM = { t: {}, tr: {}, tl: {}, rows: {}, drawer: null };

const pmArr = v => (Array.isArray(v) ? v : []);
const pmTone = t => (['good', 'warn', 'crit', 'pri'].includes(t) ? t : '');

/* ------------------------------------------------------------------
   1) pmRail(items, opts) —— 一行數字列，無外框，取代統計卡牆
   items: [{ label, value, unit?, tone?: good|warn|crit, note? }]
   opts:  { bare?: 底線也不要 }
   ------------------------------------------------------------------ */
function pmRail(items, opts) {
  const o = opts || {};
  const body = pmArr(items).map(i => `<div class="pm-rail-i ${pmTone(i.tone)}">
   <span class="pm-rail-k">${esc(i.label == null ? '' : i.label)}</span>
   <span class="pm-rail-v">${esc(i.value == null ? '—' : i.value)}${i.unit ? `<span class="pm-rail-u">${esc(i.unit)}</span>` : ''}</span>
   ${i.note ? `<span class="pm-rail-n">${esc(i.note)}</span>` : ''}
  </div>`).join('');
  return `<div class="pm-rail ${o.bare ? 'bare' : ''}" role="group" aria-label="${esc(o.label || '重點數字')}">${body}</div>`;
}

/* ------------------------------------------------------------------
   2) pmRow / pmRows —— 扁平列，取代清單卡
   item: { key?, eyebrow?, title, summary?, meta?: [{text, tone?}], go?: 顯示跳轉箭頭 }
   pmRows(items, { id, onPick }) 整段可點；單獨用 pmRow(item) 則是靜態一列。
   ------------------------------------------------------------------ */
function pmRowMeta(meta) {
  return pmArr(meta).map(m => {
    if (m == null) return '';
    const t = typeof m === 'string' ? { text: m } : m;
    return t.chip === false
      ? `<span>${esc(t.text)}</span>`
      : `<span class="pm-chip ${pmTone(t.tone)}">${esc(t.text)}</span>`;
  }).join('');
}

function pmRow(item, pick) {
  const it = item || {};
  const inner = `${it.eyebrow ? `<span class="pm-eyebrow">${esc(it.eyebrow)}</span>` : ''}
   <span class="pm-row-t">${esc(it.title == null ? '' : it.title)}</span>
   ${it.summary ? `<span class="pm-row-s">${esc(it.summary)}</span>` : ''}`;
  const main = pick
    ? `<button type="button" class="pm-row-main" onclick="pmRowsPick('${pick.id}','${esc(pick.key)}')">${inner}</button>`
    : `<div class="pm-row-main pm-row-static">${inner}</div>`;
  return `<div class="pm-row">${main}
   <div class="pm-row-meta">${pmRowMeta(it.meta)}${it.go ? `<span class="pm-row-go">${svg('chevronRight')}</span>` : ''}</div>
  </div>`;
}

function pmRows(items, opts) {
  const o = opts || {};
  const id = o.id || 'pmrows';
  PM.rows[id] = { onPick: o.onPick };
  const list = pmArr(items);
  if (!list.length) return `<div class="pm-tempty">${esc(o.empty || '目前沒有項目')}</div>`;
  return `<div class="pm-rows" id="${id}">${list.map((it, n) =>
    pmRow(it, o.onPick ? { id, key: it.key == null ? String(n) : String(it.key) } : null)
  ).join('')}</div>`;
}

function pmRowsPick(id, key) {
  const st = PM.rows[id];
  if (st && st.onPick) st.onPick(key);
}

/* ------------------------------------------------------------------
   3) pmTable(cols, rows, opts) —— 可排序／可篩選／鍵盤可導覽的表格
   cols: [{ k, label, align?: 'num'|'mono', get?(row), sortBy?(row), w? }]
   opts: { id, onPick?(key), rowKey?(row), segments?: [{label, test?(row)}],
           search?: boolean, searchIn?(row) -> string, empty?, foot? }
   ------------------------------------------------------------------ */
function pmTable(cols, rows, opts) {
  const o = opts || {};
  const id = o.id || ('pmt-' + pmArr(cols).map(c => c.k).join('_'));
  const prev = PM.t[id] || {};
  const st = PM.t[id] = {
    id, cols: pmArr(cols), rows: pmArr(rows), opts: o,
    sort: prev.sort || (o.sort ? { k: o.sort.k, dir: o.sort.dir || 'asc' } : null),
    seg: prev.seg == null ? (o.seg || 0) : prev.seg,
    q: prev.q || '',
    cur: prev.cur || null,
  };
  return `<div class="pm-table" id="${id}" onkeydown="pmTableKey(event,'${id}')">${pmTableInner(st)}</div>`;
}

function pmCell(c, row) {
  const v = c.get ? c.get(row) : row[c.k];
  return v == null ? '' : String(v);
}

function pmSortVal(c, row) {
  if (c.sortBy) return c.sortBy(row);
  const v = c.get ? c.get(row) : row[c.k];
  return v == null ? '' : v;
}

function pmTableView(st) {
  const o = st.opts;
  let list = st.rows.slice();
  const seg = pmArr(o.segments)[st.seg];
  if (seg && seg.test) list = list.filter(seg.test);
  const q = String(st.q || '').trim().toLowerCase();
  if (q) {
    list = list.filter(r => {
      const hay = o.searchIn ? o.searchIn(r) : st.cols.map(c => pmCell(c, r)).join(' ');
      return String(hay).toLowerCase().includes(q);
    });
  }
  if (st.sort) {
    const c = st.cols.find(x => x.k === st.sort.k);
    if (c) {
      const num = c.align === 'num';
      const sign = st.sort.dir === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        const x = pmSortVal(c, a), y = pmSortVal(c, b);
        if (num) return sign * ((Number(x) || 0) - (Number(y) || 0));
        return sign * String(x).localeCompare(String(y), 'zh-Hant');
      });
    }
  }
  return list;
}

function pmTableInner(st) {
  const o = st.opts;
  const list = pmTableView(st);
  const rowKey = r => String(o.rowKey ? o.rowKey(r) : (r.id == null ? '' : r.id));
  const segs = pmArr(o.segments);
  const bar = (segs.length || o.search)
    ? `<div class="pm-table-bar">
      ${segs.length ? `<div class="pm-tseg" role="tablist">${segs.map((s, i) =>
        `<button type="button" role="tab" aria-selected="${i === st.seg}" class="${i === st.seg ? 'on' : ''}" onclick="pmTableSeg('${st.id}',${i})">${esc(s.label)}</button>`
      ).join('')}</div>` : ''}
      ${o.search ? `<label class="pm-tsearch">${svg('search')}<input type="search" value="${esc(st.q)}" placeholder="${esc(o.searchLabel || '篩選')}" aria-label="${esc(o.searchLabel || '篩選表格')}" oninput="pmTableQuery('${st.id}',this.value)"></label>` : ''}
      <span class="pm-sp"></span>
      <span class="pm-tcount">${list.length} / ${st.rows.length}</span>
     </div>`
    : '';
  const head = st.cols.map(c => {
    const sorted = st.sort && st.sort.k === c.k;
    const aria = sorted ? ` aria-sort="${st.sort.dir === 'desc' ? 'descending' : 'ascending'}"` : '';
    // 排序方向用同一顆 chevron 轉向表示（CSS rotate），不另外塞箭頭字形。
    const dir = sorted ? (st.sort.dir === 'desc' ? ' down' : ' up') : '';
    const mark = sorted ? svg('chevronRight') : svg('sort');
    return c.sortable === false
      ? `<th class="plain ${c.align || ''}" scope="col">${esc(c.label)}</th>`
      : `<th class="${c.align || ''}"${aria} scope="col"><button type="button" onclick="pmTableSort('${st.id}','${c.k}')">${esc(c.label)}<span class="pm-sort${dir}">${mark}</span></button></th>`;
  }).join('');
  const body = list.length
    ? list.map((r, i) => {
      const k = rowKey(r);
      const sel = st.cur != null && st.cur === k;
      const tab = i === 0 ? 0 : -1;
      const click = o.onPick ? ` onclick="pmTablePick('${st.id}','${esc(k)}')"` : '';
      return `<tr data-k="${esc(k)}" tabindex="${tab}" aria-selected="${sel}"${click}>${st.cols.map(c =>
        `<td class="${c.align || ''} ${c.dim ? 'dim' : ''}">${esc(pmCell(c, r))}</td>`
      ).join('')}</tr>`;
    }).join('')
    : `<tr><td class="pm-tempty" colspan="${st.cols.length}">${esc(o.empty || '沒有符合條件的資料')}</td></tr>`;
  return `${bar}<div class="pm-tscroll"><table class="pm-t"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${o.foot ? `<div class="pm-tfoot">${esc(o.foot)}</div>` : ''}`;
}

function pmTablePaint(st, focusSearch) {
  const box = getById(st.id);
  if (!box) return;
  box.innerHTML = pmTableInner(st);
  if (!focusSearch) return;
  const input = box.querySelector('.pm-tsearch input');
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function pmTableSort(id, k) {
  const st = PM.t[id];
  if (!st) return;
  st.sort = st.sort && st.sort.k === k
    ? (st.sort.dir === 'asc' ? { k, dir: 'desc' } : null)
    : { k, dir: 'asc' };
  pmTablePaint(st);
}

function pmTableSeg(id, i) {
  const st = PM.t[id];
  if (!st) return;
  st.seg = i;
  pmTablePaint(st);
}

function pmTableQuery(id, v) {
  const st = PM.t[id];
  if (!st) return;
  st.q = v;
  pmTablePaint(st, true);
}

function pmTablePick(id, key) {
  const st = PM.t[id];
  if (!st) return;
  st.cur = key;
  const row = st.rows.find(r => String(st.opts.rowKey ? st.opts.rowKey(r) : r.id) === String(key));
  if (st.opts.onPick) st.opts.onPick(key, row);
  const box = getById(id);
  if (box) box.querySelectorAll('tbody tr[data-k]').forEach(tr =>
    tr.setAttribute('aria-selected', String(tr.dataset.k === String(key))));
}

/** 鍵盤導覽：↑↓ 移動焦點（roving tabindex）、Home/End 跳頭尾、Enter／空白鍵開啟。 */
function pmTableKey(e, id) {
  const box = getById(id);
  if (!box) return;
  const rows = [...box.querySelectorAll('tbody tr[data-k]')];
  if (!rows.length) return;
  const at = rows.indexOf(shadow.activeElement);
  const go = n => {
    const t = rows[Math.max(0, Math.min(rows.length - 1, n))];
    if (!t) return;
    rows.forEach(r => { r.tabIndex = -1; });
    t.tabIndex = 0;
    t.focus();
    e.preventDefault();
  };
  if (e.key === 'ArrowDown') return go(at < 0 ? 0 : at + 1);
  if (e.key === 'ArrowUp') return go(at < 0 ? 0 : at - 1);
  if (e.key === 'Home') return go(0);
  if (e.key === 'End') return go(rows.length - 1);
  if ((e.key === 'Enter' || e.key === ' ') && at >= 0) {
    e.preventDefault();
    pmTablePick(id, rows[at].dataset.k);
  }
}

/* ------------------------------------------------------------------
   4) pmTrack(cycles, opts) —— 期／階段水平軌，取代階段卡
   cycles: [{ no?, title, meta?, stages: [{ key?, label, meta?, state? }] }]
   state: done | now | late | todo（預設 todo）；支援多期與「執行→驗收」重複。
   opts: { id, onPick?(stageKey, cycleIndex) }
   ------------------------------------------------------------------ */
const PM_STAGE_ICON = { done: 'check', now: 'dot', late: 'warn', todo: 'clock' };

function pmTrack(cycles, opts) {
  const o = opts || {};
  const id = o.id || 'pmtrack';
  PM.tr[id] = { onPick: o.onPick, cycles: pmArr(cycles) };
  const body = pmArr(cycles).map((c, ci) => {
    const stages = pmArr(c.stages).map((s, si) => {
      const state = PM_STAGE_ICON[s.state] ? s.state : 'todo';
      const key = s.key == null ? ci + '.' + si : s.key;
      const inner = `<span class="pm-stage-k">${svg(PM_STAGE_ICON[state])}${esc(s.label == null ? '' : s.label)}</span>
       ${s.meta ? `<span class="pm-stage-m">${esc(s.meta)}</span>` : ''}`;
      return o.onPick
        ? `<button type="button" class="pm-stage ${state}" onclick="pmTrackPick('${id}','${esc(key)}',${ci})">${inner}</button>`
        : `<div class="pm-stage ${state}">${inner}</div>`;
    }).join('');
    return `<div class="pm-cycle">
     <div class="pm-cycle-h">
      ${c.no ? `<span class="pm-cycle-n">${esc(c.no)}</span>` : ''}
      <span class="pm-cycle-t">${esc(c.title == null ? '' : c.title)}</span>
      ${c.meta ? `<span class="pm-cycle-m">${esc(c.meta)}</span>` : ''}
     </div>
     <div class="pm-stages">${stages}</div>
    </div>`;
  }).join('');
  return `<div class="pm-track" id="${id}">${body}</div>`;
}

function pmTrackPick(id, key, ci) {
  const st = PM.tr[id];
  if (st && st.onPick) st.onPick(key, ci);
}

/* ------------------------------------------------------------------
   5) pmTimeline(events, opts) —— 一條線＋節點（Primer Timeline 形狀）
   events: [{ key?, d, time?, title, summary?, tone?, fold? }]
     fold 相同且相鄰的事件會摺疊成一行（同群事件），點一下展開。
   opts: { id, onPick?(key), dayLabel?(d) -> [大字, 小字] }
   容器只有一條左側髮絲線，沒有外框，也不是卡（PLN-075 §S1.5 C）。
   ------------------------------------------------------------------ */
function pmTimeline(events, opts) {
  const o = opts || {};
  const id = o.id || 'pmtl';
  const prev = PM.tl[id] || {};
  const st = PM.tl[id] = { id, events: pmArr(events), opts: o, open: prev.open || {} };
  return `<div class="pm-timeline" id="${id}">${pmTimelineInner(st)}</div>`;
}

function pmTlNode(st, e, n) {
  const key = e.key == null ? 'e' + n : String(e.key);
  const inner = `<span class="pm-tl-t">${esc(e.title == null ? '' : e.title)}</span>
   ${e.summary ? `<span class="pm-tl-s">${esc(e.summary)}</span>` : ''}`;
  const main = st.opts.onPick
    ? `<button type="button" class="pm-tl-main" onclick="pmTimelinePick('${st.id}','${esc(key)}')">${inner}</button>`
    : `<div class="pm-tl-main">${inner}</div>`;
  return `<div class="pm-tl-ev ${pmTone(e.tone)}">
   <span class="pm-tl-dot" aria-hidden="true">${svg('dot')}</span>
   ${main}
   ${e.time ? `<span class="pm-tl-time">${esc(e.time)}</span>` : ''}
  </div>`;
}

function pmTimelineInner(st) {
  const days = [];
  st.events.forEach(e => {
    const d = String(e.d == null ? '' : e.d);
    const last = days[days.length - 1];
    if (last && last.d === d) last.items.push(e); else days.push({ d, items: [e] });
  });
  let seq = 0;
  return days.map((day, di) => {
    const label = st.opts.dayLabel ? st.opts.dayLabel(day.d) : [day.d.slice(5), day.d.slice(0, 4)];
    // 相鄰同 fold 值的事件收成一組；單筆的 fold 不摺疊。
    const groups = [];
    day.items.forEach(e => {
      const g = e.fold == null ? null : String(e.fold);
      const last = groups[groups.length - 1];
      if (g && last && last.fold === g) last.items.push(e); else groups.push({ fold: g, items: [e] });
    });
    const body = groups.map((g, gi) => {
      if (!g.fold || g.items.length < 2) return g.items.map(e => pmTlNode(st, e, seq++)).join('');
      const fkey = di + '_' + gi;
      const open = !!st.open[fkey];
      return `<div class="pm-tl-fold ${open ? 'open' : ''}">
       <button type="button" aria-expanded="${open}" onclick="pmTimelineFold('${st.id}','${fkey}')">${svg('chevronRight')}${esc(g.fold)}　${g.items.length} 筆</button>
       <div class="pm-tl-sub">${g.items.map(e => pmTlNode(st, e, seq++)).join('')}</div>
      </div>`;
    }).join('');
    return `<div class="pm-tl-day">
     <div class="pm-tl-date"><strong>${esc(label[0])}</strong><span>${esc(label[1])}</span></div>
     <div class="pm-tl-line">${body}</div>
    </div>`;
  }).join('');
}

function pmTimelineFold(id, fkey) {
  const st = PM.tl[id];
  if (!st) return;
  st.open[fkey] = !st.open[fkey];
  const box = getById(id);
  if (box) box.innerHTML = pmTimelineInner(st);
}

function pmTimelinePick(id, key) {
  const st = PM.tl[id];
  if (!st) return;
  const e = st.events.find((x, n) => String(x.key == null ? 'e' + n : x.key) === String(key));
  if (st.opts.onPick) st.opts.onPick(key, e);
}

/* ------------------------------------------------------------------
   6) pmDrawer(cfg) —— 細節抽屜，取代「把細節攤平在長卡裡」
   cfg: { crumb?, title, sub?, body: HTML 字串, actions?: HTML 字串, wide? }
   三種關閉方式（移植 detail-drawer.tsx 的互動慣例）：Esc／點外面／✕。
   抽屜是 position:fixed 的覆蓋層，不是頁面層級的卡片（ARC-012 §7 允許 drilldown）。
   ------------------------------------------------------------------ */
root.insertAdjacentHTML('beforeend', `<div class="pm-drawer-wrap" id="pmDrawerWrap" onclick="if(event.target===this)pmDrawerClose()">
 <div class="pm-drawer" role="dialog" aria-modal="true" aria-labelledby="pmDrTitle">
  <div class="pm-dr-h">
   <div class="pm-dr-ht">
    <div class="pm-dr-crumb" id="pmDrCrumb"></div>
    <h3 id="pmDrTitle"></h3>
    <p id="pmDrSub"></p>
   </div>
   <button class="pm-dr-x" type="button" id="pmDrClose" title="關閉（Esc）" aria-label="關閉詳情" onclick="pmDrawerClose()">${svg('x', 15)}</button>
  </div>
  <div class="pm-dr-b" id="pmDrBody"></div>
  <div class="pm-dr-f" id="pmDrFoot"></div>
 </div>
</div>`);
getById('pmDrawerWrap').inert = true;

function pmDrawerOpen() {
  const w = getById('pmDrawerWrap');
  return !!w && w.classList.contains('on');
}

function pmDrawer(cfg) {
  const c = cfg || {};
  const w = getById('pmDrawerWrap');
  if (!w) return;
  if (!pmDrawerOpen()) PM.drawer = shadow.activeElement || PM.drawer;
  getById('pmDrCrumb').textContent = c.crumb || '詳情';
  getById('pmDrTitle').textContent = c.title || '';
  const sub = getById('pmDrSub');
  sub.textContent = c.sub || '';
  sub.style.display = c.sub ? '' : 'none';
  getById('pmDrBody').innerHTML = c.body || '';
  const foot = getById('pmDrFoot');
  foot.innerHTML = c.actions || '';
  foot.style.display = c.actions ? '' : 'none';
  w.querySelector('.pm-drawer').classList.toggle('wide', !!c.wide);
  w.inert = false;
  w.classList.add('on');
  setTimeout(() => getById('pmDrClose')?.focus(), 0);
}

function pmDrawerClose() {
  const w = getById('pmDrawerWrap');
  if (!w || !w.classList.contains('on')) return;
  w.classList.remove('on');
  w.inert = true;
  getById('pmDrBody').innerHTML = '';
  if (PM.drawer && PM.drawer.isConnected) PM.drawer.focus();
  PM.drawer = null;
}

/* Esc 在捕獲階段處理，但讓位給更上層的覆蓋層（表單視窗、破壞性確認、⌘K）：
   那些疊在抽屜之上，Esc 應該先收掉最上面那一層。 */
doc.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !pmDrawerOpen()) return;
  if (getById('formModalWrap')?.classList.contains('on')) return;
  if (root.querySelector('#modalWrap.on') || root.querySelector('#cmdkWrap.on') || root.querySelector('#summon.on')) return;
  e.preventDefault();
  e.stopPropagation();
  pmDrawerClose();
}, { capture: true, signal: controller.signal });
