/* ==================================================================
   營運模組（PLN-073 T3 · OPS-T09/T10/T13）

   把時間線與工作台收成一個「營運」模組：左軌道篩選 + 五種檢視。
   資料一律走 time_spine 的三軌（TRACK_REF_TYPES），與尚未下架的
   legacy DB.events 完全隔離，所以舊模組的畫面不受影響。

   開關：org.operatingModule（canvas / legacy），legacy 時整個模組不掛載。
   ================================================================== */

const OP_TRACKS = ['milestone', 'task', 'session', 'occasion'];
const OP_TRACK_META = {
  project: { nm: '專案', cls: 'p', dot: 'var(--pri)' },
  rhythm: { nm: '日常節奏', cls: 'r', dot: 'var(--teal)' },
  occasion: { nm: '行政／活動', cls: 'i', dot: 'var(--info)' }
};

const opEnabled = () => settingValue('org.operatingModule') !== 'legacy';

/* ---------- 狀態 ---------- */
S.opMonth = TODAY.slice(0, 7);
S.opTracks = { project: true, rhythm: true, occasion: true };
S.opScope = { company: true, personal: true };
S.opActors = { yz: true, lily: true };
S.opOverlay = { conflict: true, gap: true };

/* ---------- 日期小工具（與 operating-spine 同語意，避免在模板裡寫長式子） ---------- */
const opAdd = (d, n) => spineAddDays(d, n);
const opMonthFirst = () => S.opMonth + '-01';
const opMonthLast = () => opAdd(opAdd(S.opMonth + '-01', 32).slice(0, 7) + '-01', -1);
const opMonday = d => opAdd(d, -((new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7));
const opMd = d => (d ? d.slice(5).replace('-', '/') : '');
const opShiftMonth = n => {
  S.opMonth = (n > 0 ? opAdd(S.opMonth + '-01', 32) : opAdd(S.opMonth + '-01', -1)).slice(0, 7);
  render();
};
const opToday = () => {
  S.opMonth = TODAY.slice(0, 7);
  render();
};
const opToggle = (bag, key) => {
  S[bag][key] = !S[bag][key];
  render();
};

/* ---------- 查詢 ---------- */
function opFilters() {
  const tracks = Object.keys(S.opTracks).filter(k => S.opTracks[k]);
  const scopes = Object.keys(S.opScope).filter(k => S.opScope[k]);
  const actors = Object.keys(S.opActors).filter(k => S.opActors[k]);
  return {
    refTypes: OP_TRACKS,
    tracks: tracks.length ? tracks : ['__none__'],
    scopes: scopes.length ? scopes : ['__none__'],
    actorIds: actors.length ? actors : ['__none__']
  };
}
function opSpine(from, to) {
  return spine(from, to, opFilters());
}
function opConflicts(items) {
  if (!S.opOverlay.conflict) return {};
  const out = {};
  detectConflicts(items, DB).forEach(c => {
    (out[c.date] = out[c.date] || []).push(c);
  });
  return out;
}

/* ---------- 單一項目的呈現 ---------- */
function opItemClass(i) {
  let cls = 'ev ' + OP_TRACK_META[i.track].cls;
  if (i.track === 'rhythm') {
    if (i.state === 'missed' && S.opOverlay.gap) cls += ' op-miss';
    else if (i.state === 'planned' || i.state === 'skipped') cls += ' op-ghost';
  }
  if (i.state === 'late' && i.track !== 'rhythm') cls += ' op-late';
  return cls;
}
function opItemLabel(i) {
  if (i.track === 'rhythm') {
    if (i.state === 'done') return '✓ ' + i.title;
    if (i.state === 'skipped') return '— ' + i.title;
    if (i.state === 'missed') return '! ' + i.title;
  }
  if (i.state === 'done') return '✓ ' + i.title;
  if (i.state === 'late') return '! ' + i.title;
  return (i.star ? '★ ' : '') + i.title;
}
function opItemChip(i) {
  return `<span class="${opItemClass(i)}" title="${esc(i.title)}${i.sub ? ' · ' + esc(i.sub) : ''}"
    onclick="opOpen('${i.refType}','${esc(i.refId)}')">${esc(opItemLabel(i))}</span>`;
}

/** 點任一項目 → 開它自己的表單（inspector 就是既有的抽屜表單）。 */
function opOpen(refType, refId) {
  if (refType === 'milestone') return formMilestone(refId);
  if (refType === 'occasion') return formOccasion(refId);
  if (refType === 'session') {
    const [rid, date] = String(refId).split('|');
    return formSession(rid, date);
  }
  if (refType === 'task') return openDrawer('issue', refId);
}

/* ---------- 左欄：軌道與疊加層 ---------- */
function opRail() {
  const counts = {
    project: (DB.milestones || []).filter(m => m.dueOn).length,
    rhythm: (DB.rhythms || []).length,
    occasion: (DB.occasions || []).length
  };
  const track = k => `<button class="op-trk ${OP_TRACK_META[k].cls} ${S.opTracks[k] ? 'on' : ''}"
    onclick="opToggle('opTracks','${k}')"><i style="background:${OP_TRACK_META[k].dot}"></i>${OP_TRACK_META[k].nm}
    <b>${counts[k]}</b></button>`;
  const scope = (k, nm) => `<button class="op-sub ${S.opScope[k] ? 'on' : ''}" onclick="opToggle('opScope','${k}')">${nm}
    ${(DB.rhythms || []).filter(r => (r.scope || 'company') === k).length}</button>`;
  const actor = k => `<button class="op-sub ${S.opActors[k] ? 'on' : ''}" onclick="opToggle('opActors','${k}')">${av(k)} ${esc(person(k))}</button>`;
  const overlay = (k, nm) => `<button class="op-sub ${S.opOverlay[k] ? 'on' : ''}" onclick="opToggle('opOverlay','${k}')">${nm}</button>`;
  return `<div class="op-rail">
    <div class="op-rh">軌道</div>${['project', 'rhythm', 'occasion'].map(track).join('')}
    <div class="op-rh">節奏歸屬</div><div class="op-subs">${scope('company', '公司')}${scope('personal', '個人')}</div>
    <div class="op-rh">對象</div><div class="op-subs">${Object.keys(DB.people).map(actor).join('')}</div>
    <div class="op-rh">疊加層</div><div class="op-subs">${overlay('conflict', '⚠ 衝期警示')}${overlay('gap', '◌ 節奏斷層')}</div>
  </div>`;
}
const av = k => (DB.people[k] ? `<span class="av ${DB.people[k].cls}">${DB.people[k].s}</span>` : '');

/* ---------- 工具列 ---------- */
function opBar(label, nav) {
  return `<div class="viewbar">
    ${nav ? `<button class="vb" onclick="opShiftMonth(-1)">‹</button>
      <span class="op-per">${esc(label)}</span>
      <button class="vb" onclick="opShiftMonth(1)">›</button>
      <button class="vb" onclick="opToday()">今天</button>` : `<span class="op-per">${esc(label)}</span>`}
    <span class="sp"></span>
    <button class="btn sm" onclick="opNew()">${svg('plus')} 新增…</button>
  </div>`;
}

/* ================================================================
   分頁 0 · 今天 —— 原工作台三段式時序欄，卡片加上軌道標籤
   ================================================================ */
function opTodayView() {
  const soon = opSpine(TODAY, opAdd(TODAY, 3)).filter(i => i.state !== 'done');
  const overdue = opSpine(opAdd(TODAY, -120), opAdd(TODAY, -1)).filter(
    i => i.state === 'missed' || i.state === 'late'
  );
  const wip = DB.issues.filter(i => i.st === 'Doing' || i.st === 'Review');

  const card = i => `<div class="op-card" onclick="opOpen('${i.refType}','${esc(i.refId)}')">
    <div class="t">${esc(opItemLabel(i))}</div>
    <div class="m"><span class="chip c-${OP_TRACK_META[i.track].cls === 'p' ? 'p' : OP_TRACK_META[i.track].cls === 'r' ? 'o' : 'i'}">${OP_TRACK_META[i.track].nm}</span>
      <span class="op-d">${opMd(i.date)}</span>${(i.actorIds || []).map(av).join('')}
      ${i.derivedFrom ? `<span class="chip c-n">${svg('lock', 10)} ${esc(i.derivedFrom)}</span>` : ''}</div></div>`;
  const issueCard = x => `<div class="op-card" onclick="openDrawer('issue','${x.id}')">
    <div class="t">${esc(x.t)}</div>
    <div class="m"><span class="chip c-p">專案</span>${sizeChip(x.size)}${av(x.owner)}
      ${x.due ? `<span class="op-d">${opMd(x.due)}</span>` : ''}</div></div>`;

  return (
    guide(
      '<b>這一欄不再只是「已完成的工作」。</b>過去欄放的是所有還沒收尾的東西 —— 沒標記的節奏、逾期的里程碑、沒寫回顧的活動。',
      ''
    ) +
    `<div class="g g3">
      ${panel('過去 · 未收尾', overdue.length + ' 件', overdue.length ? overdue.slice(0, 8).map(card).join('') : '<div class="empty">沒有未收尾的項目</div>')}
      ${panel('現在 · WIP ' + wip.length + '/3', '今天', (wip.length ? wip.map(issueCard).join('') : '<div class="empty">目前沒有進行中的工作</div>') + (wip.length > 3 ? '<div class="op-warn">已超過 WIP 上限 3（契約 §2.5）</div>' : ''))}
      ${panel('未來 · 3 日內', soon.length + ' 件', soon.length ? soon.map(card).join('') : '<div class="empty">近三日沒有排定的節點</div>')}
    </div>`
  );
}

/* ================================================================
   分頁 1 · 日曆
   ================================================================ */
function opCalendarView() {
  const gridStart = opMonday(opMonthFirst());
  const gridEnd = opAdd(gridStart, 41);
  const items = opSpine(gridStart, gridEnd);
  const conf = opConflicts(items);
  const byDate = {};
  items.forEach(i => (byDate[i.date] = byDate[i.date] || []).push(i));

  let cells = '';
  for (let k = 0; k < 42; k++) {
    const d = opAdd(gridStart, k);
    const out = d.slice(0, 7) !== S.opMonth;
    const list = byDate[d] || [];
    cells += `<div class="dc ${out ? 'out' : ''} ${d === TODAY ? 'today' : ''} ${conf[d] ? 'op-conf' : ''}">
      <span class="dn">${Number(d.slice(8))}${conf[d] ? ' <b class="op-warnmark" title="' + esc(conf[d][0].message) + '">⚠</b>' : ''}</span>
      ${list.slice(0, 5).map(opItemChip).join('')}
      ${list.length > 5 ? `<span class="op-more">+${list.length - 5}</span>` : ''}
    </div>`;
  }

  const confCount = Object.keys(conf).length;
  return (
    opBar(S.opMonth.replace('-', ' 年 ') + ' 月', true) +
    (confCount
      ? `<div class="op-confbar">${svg('warn', 13)}<div>${esc(Object.values(conf)[0][0].message)}${confCount > 1 ? `　（本月共 ${confCount} 天有衝期）` : ''}</div></div>`
      : '') +
    `<div class="cal">${['一', '二', '三', '四', '五', '六', '日'].map(x => `<div class="dh">${x}</div>`).join('')}${cells}</div>` +
    opLegend()
  );
}
function opLegend() {
  return `<div class="legendrow" style="margin-top:12px">
    <span><i class="dotc" style="background:var(--pri)"></i>專案（★＝里程碑）</span>
    <span><i class="dotc" style="background:var(--teal)"></i>節奏（✓ 已跑／虛線 未來）</span>
    <span><i class="dotc" style="background:var(--st-crit)"></i>節奏斷層</span>
    <span><i class="dotc" style="background:var(--info)"></i>行政／活動</span>
    <span>${svg('lock', 11)} 由條文推導，不可編輯或刪除</span>
  </div>`;
}

/* ================================================================
   分頁 2 · 熱力
   ================================================================ */
function opHeatView() {
  const weeks = weekStarts(opMonday(TODAY), 16);
  const head = `<div class="op-hmrow head"><span></span><div class="op-cells">${weeks
    .map((w, i) => `<i class="op-wk">${i % 3 === 0 ? 'W' + spineIsoWeek(w) : ''}</i>`)
    .join('')}</div><span></span></div>`;

  const ritual = (DB.rhythms || []).filter(r => (r.kind || 'ritual') === 'ritual');
  const rows = ritual
    .filter(r => S.opScope[r.scope || 'company'])
    .map(r => {
      const cells = rhythmAdherence(DB, r, weeks, TODAY);
      let tot = 0,
        dn = 0;
      const html = cells
        .map(c => {
          if (!c.expected) return '<i class="op-hc"></i>';
          if (c.future) return '<i class="op-hc fut"></i>';
          tot += c.expected;
          dn += c.done;
          if (!c.done) return '<i class="op-hc miss"></i>';
          const lv = c.done / c.expected;
          return `<i class="op-hc l${lv >= 1 ? 4 : lv >= 0.75 ? 3 : lv >= 0.5 ? 2 : 1}"></i>`;
        })
        .join('');
      // 這 16 週完全沒有應跑的實例時顯示「—」，不要把「沒資料」畫成 0%。
      return `<div class="op-hmrow"><span class="lb">${esc(r.title)} <em>${r.scope === 'personal' ? '個人' : '公司'}</em></span>
        <div class="op-cells">${html}</div><span class="pct">${tot ? Math.round((dn / tot) * 100) + '%' : '—'}</span></div>`;
    })
    .join('');

  const projRows = DB.projects
    .map(p => {
      let tot = 0;
      const html = weeks
        .map(w => {
          const to = opAdd(w, 6);
          const n =
            DB.issues.filter(t => t.p === p.id && (t.due || t.done) >= w && (t.due || t.done) <= to).length +
            (DB.milestones || []).filter(m => m.projectId === p.id && m.dueOn >= w && m.dueOn <= to).length * 2;
          tot += n;
          return `<i class="op-hc b${n === 0 ? 0 : n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 3 : 4}"></i>`;
        })
        .join('');
      return `<div class="op-hmrow"><span class="lb">${esc(p.t)}</span><div class="op-cells">${html}</div><span class="pct">${tot}</span></div>`;
    })
    .join('');

  const adminRhythms = (DB.rhythms || []).filter(r => r.kind === 'admin');
  const occRow = (label, pick) => {
    let tot = 0;
    const html = weeks
      .map(w => {
        const to = opAdd(w, 6);
        const n = pick(w, to);
        tot += n;
        return `<i class="op-hc v${n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 3 ? 3 : 4}"></i>`;
      })
      .join('');
    return `<div class="op-hmrow"><span class="lb">${label}</span><div class="op-cells">${html}</div><span class="pct">${tot}d</span></div>`;
  };
  const occHtml =
    occRow('活動佔用', (w, to) => {
      let n = 0;
      (DB.occasions || []).forEach(o => {
        for (let d = o.onDate; d <= (o.endOn || o.onDate); d = opAdd(d, 1)) if (d >= w && d <= to) n++;
      });
      return n;
    }) +
    (adminRhythms.length
      ? occRow(
          '行政週期',
          (w, to) => spine(w, to, { refTypes: ['session'], rhythmKinds: ['admin'] }).length
        )
      : '');

  if (!ritual.length && !DB.projects.length && !(DB.occasions || []).length) {
    return emptyPanel('熱力', '', '建立節奏、專案或活動之後，這裡會把三軌疊在同一個時間軸上。');
  }

  return (
    guide(
      '<b>把三軌疊在同一個時間軸上，才看得出因果。</b>節奏列的紅格來自 <code>session.state</code>；行政週期（發薪、勞健保）不算履行率，走下面那一列。',
      ''
    ) +
    opBar('近 16 週', false) +
    `<div class="op-hm">${head}
      ${rows ? `<div class="op-hg" style="color:var(--teal)">日常節奏 · 履行率</div>${rows}` : ''}
      ${projRows ? `<div class="op-hg" style="color:var(--pri)">專案 · 每週到期／完成工作數</div>${projRows}` : ''}
      ${occHtml ? `<div class="op-hg" style="color:var(--info)">行政／活動 · 每週佔用天數</div>${occHtml}` : ''}
      <div class="op-hleg"><span>少</span><i class="op-hc"></i><i class="op-hc l1"></i><i class="op-hc l2"></i><i class="op-hc l3"></i><i class="op-hc l4"></i><span>多</span>
        <span class="sp"></span><i class="op-hc miss"></i><span>該跑但沒跑</span><i class="op-hc fut"></i><span>未來</span></div>
    </div>`
  );
}

/* ================================================================
   分頁 3 · 甘特
   ================================================================ */
function opGanttView() {
  const projects = DB.projects.filter(p => p.start && p.start !== '—');
  if (!projects.length) return emptyPanel('甘特', '', '需要有起始日的專案才畫得出時程。');

  let min = projects[0].start,
    max = projects[0].start;
  const push = d => {
    if (!d || d === '—') return;
    if (d < min) min = d;
    if (d > max) max = d;
  };
  projects.forEach(p => push(p.start));
  (DB.milestones || []).forEach(m => push(m.dueOn));
  DB.issues.forEach(i => push(i.due || i.done));
  min = opMonday(opAdd(min, -7));
  max = opAdd(opMonday(opAdd(max, 7)), 6);
  const span = Math.max(1, Math.round((Date.parse(max) - Date.parse(min)) / 86400000) + 1);
  const nw = Math.ceil(span / 7);
  const pos = d => ((Date.parse(d) - Date.parse(min)) / 86400000 / span) * 100;
  const grid = `<div class="op-gg" style="grid-template-columns:repeat(${nw},1fr)">${Array(nw).fill('<i></i>').join('')}</div>`;

  const rows = projects
    .map(p => {
      const ms = (DB.milestones || []).filter(m => m.projectId === p.id && m.dueOn);
      const ends = ms.map(m => m.dueOn).concat(DB.issues.filter(i => i.p === p.id).map(i => i.due || i.done)).filter(Boolean);
      const end = ends.length ? ends.reduce((a, b) => (b > a ? b : a)) : opAdd(p.start, 30);
      const width = Math.max(2, ((Date.parse(end) - Date.parse(p.start)) / 86400000 / span) * 100);
      return `<div class="op-gr"><div class="lb" onclick="nav('project',0);S.proj='${p.id}';render()">${esc(p.t)}</div>
        <div class="op-gt">${grid}
          <span class="op-now" style="left:${pos(TODAY)}%"></span>
          <span class="op-gbar" style="left:${pos(p.start)}%;width:${width}%">${esc(p.t)}</span>
          ${ms
            .map(
              m => `<span class="op-gms ${m.state === 'done' ? 'done' : ''}" style="left:${pos(m.dueOn)}%"
            title="${esc(m.title)} · ${m.dueOn}" onclick="formMilestone('${m.id}')"></span>`
            )
            .join('')}
          ${(DB.occasions || [])
            .filter(o => o.projectId === p.id)
            .map(
              o => `<span class="op-gocc" style="left:${pos(o.onDate)}%;width:${Math.max(1, ((Date.parse(o.endOn || o.onDate) - Date.parse(o.onDate)) / 86400000 + 1) / span * 100)}%"
            title="${esc(o.title)}" onclick="formOccasion('${o.id}')"></span>`
            )
            .join('')}
        </div></div>`;
    })
    .join('');

  const pending = (DB.milestones || []).filter(m => !m.dueOn);
  return (
    opBar('專案時程', false) +
    `<div class="op-gantt"><div class="op-gr head"><div class="lb">專案 / 里程碑</div><div class="op-gt">${grid}
      ${Array.from({ length: nw }, (_, i) => `<span class="op-gwk" style="left:${(i / nw) * 100}%">W${spineIsoWeek(opAdd(min, i * 7))}</span>`).join('')}
      <span class="op-now" style="left:${pos(TODAY)}%"></span></div></div>${rows}</div>` +
    (pending.length
      ? `<div style="height:12px"></div>` +
        panel(
          '日期待補的里程碑',
          pending.length + ' 筆 · 由專案交付項轉入',
          `<div class="rows" style="margin:-12px -14px">${pending
            .map(
              m => `<div class="row" onclick="formMilestone('${m.id}')"><span class="m" style="width:130px">${esc(m.projectId)}</span>
              <span class="t">${esc(m.title)}</span><span class="chip c-n">待補日期</span></div>`
            )
            .join('')}</div>`,
          '',
          false
        )
      : '') +
    `<div class="note" style="margin-top:12px">填了日期的里程碑才會進 time_spine，也才會出現在日曆上 —— 刻意不猜日期。</div>`
  );
}

/* ================================================================
   分頁 4 · 清單
   ================================================================ */
function opListView() {
  const items = opSpine(opMonthFirst(), opMonthLast());
  const rows = items
    .map(
      i => `<div class="row" onclick="opOpen('${i.refType}','${esc(i.refId)}')">
      <span class="m" style="width:70px">${opMd(i.date)}</span>
      <span class="chip ${OP_TRACK_META[i.track].cls === 'p' ? 'c-p' : OP_TRACK_META[i.track].cls === 'r' ? 'c-o' : 'c-i'}">${OP_TRACK_META[i.track].nm}</span>
      <span class="t">${esc(opItemLabel(i))}</span>
      ${i.derivedFrom ? `<span class="chip c-n">${svg('lock', 10)} ${esc(i.derivedFrom)}</span>` : ''}
      ${i.remind ? `<span class="m">${esc(i.remind)}</span>` : ''}
      <span>${(i.actorIds || []).map(av).join('')}</span></div>`
    )
    .join('');
  return (
    opBar(S.opMonth.replace('-', ' 年 ') + ' 月', true) +
    panel(
      S.opMonth,
      items.length + ' 個節點',
      `<div class="rows" style="margin:-12px -14px">${rows || '<div class="empty">這個月沒有符合篩選的節點</div>'}</div>`,
      '',
      false
    ) +
    opLegend()
  );
}

/* ================================================================
   VIEWS.operating
   ================================================================ */
VIEWS.operating = tab => {
  const body = [opTodayView, opCalendarView, opHeatView, opGanttView, opListView][tab] || opTodayView;
  return `<div class="op-shell">${opRail()}<div class="op-main">${body()}</div></div>`;
};

/* ================================================================
   導覽改寫：插入「營運」，把時間線與工作台移到最後並標「舊版」
   ================================================================ */
if (opEnabled()) {
  const at = WB.findIndex(w => w.id === 'timeline');
  WB.splice(at, 0, {
    id: 'operating',
    nm: '營運',
    ic: 'timeline',
    scn: '這段時間長什麼樣子、有沒有撞在一起',
    rule: '主操作面：左軌道 / 中畫布 / 右抽屜',
    tabs: ['今天', '日曆', '熱力', '甘特', '清單']
  });
  ['timeline', 'desk'].forEach(id => {
    const w = WB.find(x => x.id === id);
    if (!w) return;
    if (!/舊版/.test(w.nm)) w.nm += '（舊版）';
    WB.splice(WB.indexOf(w), 1);
    WB.push(w);
  });
  S.wb = 'journal';
}
