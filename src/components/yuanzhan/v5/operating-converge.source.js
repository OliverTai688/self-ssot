/* ==================================================================
   收斂（PLN-073 T4 · OPS-T15..T20）

   T3 讓新舊並存；這一層把舊的兩個模組收掉，並把它們的三個分頁各自歸位：
     時間線 · 全部／三層／日曆  → 營運 · 日曆
     工作台 · 時序              → 營運 · 今天
     工作台 · 流程健康          → 容量 · 流量指標（圖表本來就重複，合併後少畫兩張）
     工作台 · 目標對齊          → 專案 · 總覽（收斂成「這個案子對到哪個目標」）
   並在專案模組補上「里程碑」分頁（Phase → Milestone → Objective → Task 四層）。

   OPS-T15 註記：新分頁**附加在最後**（index 5），不插在總覽之後。
   理由是 source-patches.mjs 有一批寫死的 setTab(n) / nav('project',n)，
   插在中間要同時重映射六處索引；附加在最後則零風險。
   之後若要調整顯示順序，再單獨做一次索引重映射並補回歸測試。
   ================================================================== */

const opConverged = () => opEnabled();

/* OPS-T20 · 三軌成為唯一來源的邏輯放在 operating-spine.source.js 的 spine()，
   因為函式宣告會提升，在這裡包一層會變成自我遞迴。 */

/* ---------- OPS-T19 · 舊模組下架 ---------- */
if (opConverged()) {
  ['timeline', 'desk'].forEach(id => {
    const at = WB.findIndex(w => w.id === id);
    if (at >= 0) WB.splice(at, 1);
  });
}

/** 舊連結的去向。nav() 會先過這裡，避免 S.wb 指到已下架的模組而讓 render 爆掉。 */
function opRedirect(wb, tab) {
  if (!opConverged()) return [wb, tab];
  if (wb === 'timeline') return ['operating', 1];
  if (wb === 'desk') {
    if (tab === 1) return ['capacity', 1];
    if (tab === 2) return ['project', 0];
    return ['operating', 0];
  }
  if (!WB.some(w => w.id === wb)) return ['journal', 0];
  return [wb, tab];
}

/* ---------- OPS-T17 · 流程健康 → 容量 · 流量指標 ---------- */
const opLegacyDesk = VIEWS.desk;
const opPrevCapacity = VIEWS.capacity;
VIEWS.capacity = tab => {
  const base = opPrevCapacity(tab);
  if (!opConverged() || tab !== 1) return base;
  return (
    base +
    `<div style="height:14px"></div>` +
    `<div class="op-moved">${svg('arrowin', 13)}<div>以下三張圖原本在<b>工作台 · 流程健康</b>；它們問的問題與這一頁相同（吃得下嗎、何時做完），合併後不再重複維護。</div></div>` +
    opLegacyDesk(1)
  );
};

/* ---------- OPS-T18 · 目標對齊 → 專案 · 總覽 ---------- */
function opGoalAlign(p) {
  const goal = (DB.goals || []).find(g => g.id === p.goal);
  const siblings = DB.projects.filter(x => x.goal === p.goal);
  const mine = DB.issues.filter(i => i.p === p.id);
  const active = mine.filter(i => i.st === 'Doing' || i.st === 'Review').length;
  const done = mine.filter(i => i.st === 'Done').length;
  const ms = (DB.milestones || []).filter(m => m.projectId === p.id);
  if (!goal) {
    return panel(
      '目標對齊',
      '這個案子還沒對到目標',
      `<div class="empty">在專案設定裡選一個目標，這裡才能回答「我今天做的事有沒有推到我說要去的地方」。</div>`
    );
  }
  return panel(
    '目標對齊',
    '原工作台 · 目標對齊',
    `<div class="op-align">
      <div class="op-al-g"><span class="chip c-p">目標</span><b>${esc(goal.t)}</b>
        <span class="m">${esc(goal.period)}</span><span class="sp"></span><span class="op-al-pct">${goal.pct}%</span></div>
      ${goal.warn ? `<div class="op-warn">${svg('warn', 12)} ${esc(goal.warn)}</div>` : ''}
      <div class="op-al-bar"><i style="width:${Math.max(0, Math.min(100, goal.pct))}%"></i></div>
      <div class="op-al-row"><span class="m">同目標的案子</span><span>${siblings
        .map(
          x =>
            `<button class="chip ${x.id === p.id ? 'c-p' : 'c-n'}" onclick="S.proj='${x.id}';render()">${esc(x.t)}</button>`
        )
        .join(' ')}</span></div>
      <div class="op-al-row"><span class="m">本案進行中</span><span><b>${active}</b> 件　·　已完成 ${done} / ${mine.length}</span></div>
      <div class="op-al-row"><span class="m">里程碑</span><span><b>${ms.filter(m => m.state === 'done').length}</b> / ${ms.length}
        ${ms.filter(m => !m.dueOn).length ? `　<span class="chip c-n">${ms.filter(m => !m.dueOn).length} 筆待補日期</span>` : ''}</span></div>
    </div>`,
    `<button class="btn sm" onclick="nav('project',5)">看里程碑</button>`
  );
}

/* ---------- OPS-T16 · 專案 · 里程碑分頁 ---------- */
const OBJ = id => (DB.objectives || []).find(o => o.id === id);

function opMilestoneTree(p) {
  const list = (DB.milestones || [])
    .filter(m => m.projectId === p.id)
    .sort((a, b) => (a.dueOn || '9999').localeCompare(b.dueOn || '9999'));
  if (!list.length) {
    return emptyPanel(
      '里程碑',
      `<button class="btn pri" onclick="formMilestone(null,'')">${svg('plus')} 新增里程碑</button>`,
      '里程碑是對外承諾的交付點；底下掛目標（怎樣才算做到）與工作。'
    );
  }
  const unlinked = DB.issues.filter(i => i.p === p.id && !i.objectiveId);
  const body = list
    .map(m => {
      const objs = (DB.objectives || []).filter(o => o.milestoneId === m.id);
      const all = DB.issues.filter(i => objs.some(o => o.id === i.objectiveId));
      const done = all.filter(i => i.st === 'Done').length;
      return `<div class="op-ms">
        <div class="op-ms-h" onclick="formMilestone('${m.id}')">
          <i class="op-dia ${m.state === 'done' ? 'done' : ''}"></i>
          <b>${esc(m.title)}</b>
          <span class="m">${m.dueOn || '日期待補'}</span>
          ${m.derivedFrom ? `<span class="chip c-n">${svg('lock', 10)} ${esc(m.derivedFrom)}</span>` : ''}
          ${!m.dueOn ? '<span class="chip c-n">不進日曆</span>' : ''}
          ${m.state !== 'done' && m.dueOn && m.dueOn < TODAY ? '<span class="chip c-w">逾期</span>' : ''}
          <span class="sp"></span>
          <span class="m">${done}/${all.length}${m.accept ? ' · ' + esc(m.accept) : ''}</span>
        </div>
        ${objs
          .map(o => {
            const ts = DB.issues.filter(i => i.objectiveId === o.id);
            return `<div class="op-obj">
              <div class="op-obj-h" onclick="formObjective('${o.id}')">◇ ${esc(o.title)}
                <span class="m">${ts.filter(t => t.st === 'Done').length}/${ts.length}</span></div>
              ${ts
                .map(
                  t => `<div class="op-tk" onclick="openDrawer('issue','${t.id}')">
                    <i class="op-st ${t.st.toLowerCase()}"></i><span class="t">${esc(t.t)}</span>
                    ${sizeChip(t.size)}${t.due ? `<span class="m">${t.due.slice(5)}</span>` : ''}
                    <span class="av ${DB.people[t.owner] ? DB.people[t.owner].cls : ''}">${DB.people[t.owner] ? DB.people[t.owner].s : '?'}</span></div>`
                )
                .join('') || '<div class="op-tk empty">還沒有掛上工作</div>'}
            </div>`;
          })
          .join('')}
        <div class="op-obj"><button class="btn sm" onclick="formObjective(null,'${m.id}')">${svg('plus')} 目標</button></div>
      </div>`;
    })
    .join('');

  return (
    guide(
      '<b>四層結構：階段 → 里程碑 → 目標 → 工作。</b>目標是「怎樣才算做到」的判準，達成率由底下工作推算。工作可以先不掛目標，之後再補。',
      ''
    ) +
    panel(
      '里程碑 · 目標 · 工作',
      list.length + ' 個里程碑',
      `<div class="op-tree">${body}</div>`,
      `<button class="btn sm" onclick="formMilestone(null,'')">${svg('plus')} 新增里程碑</button>`,
      false
    ) +
    (unlinked.length
      ? `<div style="height:12px"></div>` +
        panel(
          '尚未掛到目標的工作',
          unlinked.length + ' 件',
          `<div class="rows" style="margin:-12px -14px">${unlinked
            .map(
              t => `<div class="row"><span class="t">${esc(t.t)}</span>${stChip(t.st)}
                <button class="btn sm" onclick="formAttachTask('${t.id}')">補掛目標</button></div>`
            )
            .join('')}</div>`,
          '',
          false
        ) +
        `<div class="note" style="margin-top:10px">遷移時刻意<b>不自動生成假目標</b>來填滿階層；工作先留在這裡，由人決定掛到哪個判準下。</div>`
      : '')
  );
}

function formObjective(id, milestoneId) {
  const e = id ? OBJ(id) : null;
  const msOpts = (DB.milestones || []).map(m => {
    const p = P(m.projectId);
    return [m.id, (p ? p.t + ' › ' : '') + m.title];
  });
  if (!msOpts.length) return toast('先建立一個里程碑，才能在底下放目標');
  openForm({
    replace: !!id,
    crumb: e ? '目標 · ' + e.id : '新目標',
    title: e ? '編輯目標' : '新增目標',
    sub: '目標是里程碑底下「怎樣才算做到」的判準，達成率由底下工作推算',
    fields: [
      { k: 'title', label: '目標 / KR', req: true },
      { k: 'milestoneId', label: '所屬里程碑', type: 'select', req: true, opts: msOpts }
    ],
    values: e ? { title: e.title, milestoneId: e.milestoneId } : { title: '', milestoneId: milestoneId || msOpts[0][0] },
    effects: ['里程碑的達成率改由底下目標與工作推算', '目標本身沒有日期，不進 time_spine'],
    onDelete: e
      ? () => {
          commit('delete', '目標', e.title, () => {
            DB.objectives = DB.objectives.filter(o => o.id !== id);
            DB.issues.forEach(i => {
              if (i.objectiveId === id) i.objectiveId = '';
            });
            return ['底下的工作改為「尚未掛到目標」，不會被刪除'];
          });
          closeDrawer();
        }
      : null,
    onSave: v => {
      if (e) {
        commit('update', '目標', v.title, () => {
          Object.assign(e, { title: v.title, milestoneId: v.milestoneId });
          return ['里程碑樹狀圖已更新'];
        });
      } else {
        commit('create', '目標', v.title, () => {
          DB.objectives.push({ id: nid('OB'), milestoneId: v.milestoneId, title: v.title, author: DB.me });
          return ['里程碑底下新增一個判準', '可以把工作補掛到這個目標下'];
        });
      }
    }
  });
}

function formAttachTask(issueId) {
  const t = ISS(issueId);
  if (!t) return;
  if (!progressable(t)) return deny();
  const objs = (DB.objectives || [])
    .filter(o => {
      const m = (DB.milestones || []).find(x => x.id === o.milestoneId);
      return m && m.projectId === t.p;
    })
    .map(o => {
      const m = (DB.milestones || []).find(x => x.id === o.milestoneId);
      return [o.id, (m ? m.title + ' › ' : '') + o.title];
    });
  if (!objs.length) return toast('這個專案底下還沒有目標，先建立一個');
  openForm({
    crumb: t.id,
    title: '補掛目標',
    sub: esc(t.t),
    fields: [{ k: 'objectiveId', label: '掛到哪個目標', type: 'select', req: true, opts: [['', '（不掛）'], ...objs] }],
    values: { objectiveId: t.objectiveId || objs[0][0] },
    effects: ['里程碑樹狀圖的完成度重算', '工作本身的到期日與狀態不變'],
    onSave: v => {
      commit('update', '工作', t.t, () => {
        t.objectiveId = v.objectiveId;
        return v.objectiveId ? ['已掛到目標底下'] : ['已取消掛載'];
      });
    }
  });
}

/* ---------- 專案模組：加分頁 + 總覽加目標對齊 ---------- */
if (opConverged()) {
  const proj = WB.find(w => w.id === 'project');
  if (proj && !proj.tabs.includes('里程碑')) proj.tabs = [...proj.tabs, '里程碑'];
}
const opPrevProject = VIEWS.project;
VIEWS.project = tab => {
  if (!opConverged()) return opPrevProject(tab);
  const p = P(S.proj);
  if (tab === 5) return p ? opMilestoneTree(p) : opPrevProject(0);
  if (tab === 0 && p) return opGoalAlign(p) + `<div style="height:12px"></div>` + opPrevProject(0);
  return opPrevProject(tab);
};
