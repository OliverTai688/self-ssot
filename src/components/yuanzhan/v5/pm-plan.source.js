/* ==================================================================
   專案 · 計劃（PLN-075 S3 Wave 3a）

   四層：期 → 階段 → 里程碑 → 任務。任務有兩種 kind：TODO 與審核
   （同一張表，不是兩張；審核多了審核人、結果、退回原因）。

   「期」是真的一層，不是平面 enum：二期帶著自己的起訖與狀態，執行→驗收在
   每一期各出現一次（PLN-075 §S1 硬性約束 2）。

   階層用縮排與左側髮絲線表示，沒有一層是卡片（ARC-043 §5）。
   所有寫入走 commit()（ARC-042）；期、階段、里程碑、任務分別落在
   phaseCycles／phases／milestones／issues 四個集合。
   ================================================================== */

var PMV = PMV || {};

const PM_REVIEW = {
  PENDING: { label: '未送審', tone: '' },
  IN_REVIEW: { label: '審核中', tone: 'warn' },
  PASSED: { label: '已通過', tone: 'good' },
  CHANGES_REQUESTED: { label: '已退回', tone: 'crit' },
  WAIVED: { label: '免審', tone: '' }
};
const PM_STATE_LABEL = { done: '已完成', now: '進行中', late: '逾期', todo: '未開始' };
const PM_STATE_TONE = { done: 'good', now: 'pri', late: 'crit', todo: '' };

/* ---------- 期 ---------- */

/**
 * 把一期的起訖依比例切給各階段，先排一版日期（之後每個階段都能改）。
 * 階段的狀態是由日期推導的，所以新建的階段不能沒有日期。
 */
const PM_STAGE_PLANS = {
  five: [['PROPOSAL', 0.1], ['CONTRACT', 0.1], ['EXECUTION', 0.5], ['ACCEPTANCE', 0.2], ['CLOSING', 0.1]],
  // 續期不再提案與接案：執行 → 驗收 → 結案
  repeat: [['EXECUTION', 0.65], ['ACCEPTANCE', 0.25], ['CLOSING', 0.1]]
};

function pmSplitStages(plan, startOn, endOn) {
  const total = Math.max(plan.length, ddiff(startOn, endOn) + 1);
  let cursor = 0;
  return plan.map(([kind, share], i) => {
    const rest = plan.length - 1 - i;
    const len = rest === 0 ? total - cursor : Math.max(1, Math.min(total - cursor - rest, Math.round(total * share)));
    const span = { kind, startOn: dadd(startOn, cursor), endOn: dadd(startOn, cursor + len - 1) };
    cursor += len;
    return span;
  });
}

function formPmCycle(id) {
  const p = P(S.proj);
  if (!p) return;
  const e = id ? pmCycle(id) : null;
  const cycles = pmCycles(p.id);
  const nextNo = cycles.reduce((n, c) => Math.max(n, c.ordinal), 0) + 1;
  const prev = cycles[cycles.length - 1];
  const start = prev && prev.endOn ? dadd(prev.endOn, 1) : (/^\d{4}-\d{2}-\d{2}$/.test(p.start || '') && !cycles.length ? p.start : TODAY);
  openForm({
    crumb: e ? pmCycleName(e) : '新的一期',
    title: e ? '編輯' + pmCycleName(e) : '新增一期',
    sub: '一期＝一個交付週期，通常對應一份合約。二期、三期各自有起訖與狀態',
    fields: [
      { k: 'title', label: '名稱（可留空）', ph: '例如：第二次修改需求' },
      { k: 'startOn', label: '開始', type: 'date', req: true, half: true },
      { k: 'endOn', label: '結束', type: 'date', req: true, half: true },
      { k: 'status', label: '狀態', type: 'chips', req: true, opts: Object.keys(PM_CYCLE_ST).map(k => [k, PM_CYCLE_ST[k]]) },
      { k: 'budget', label: '這一期的預算（可留空）', type: 'number', hint: '留空＝還沒編預算，與「預算是 0」不同' },
      ...(e ? [] : [{
        k: 'stages', label: '階段', type: 'chips', req: true,
        opts: [['five', '提案→接案→執行→驗收→結案'], ['repeat', '執行→驗收→結案（續期）'], ['none', '先不建，之後自己加']],
        hint: '日期會依這一期的起訖先排一版，之後每個階段都可以改'
      }]),
      { k: 'note', label: '備註', type: 'textarea', rows: 2 }
    ],
    values: e
      ? { title: e.title || '', startOn: e.startOn || '', endOn: e.endOn || '', status: e.status || 'PLANNED', budget: e.budget == null ? '' : String(e.budget), note: e.note || '' }
      : { title: '', startOn: start, endOn: dadd(start, 89), status: 'ACTIVE', budget: '', stages: cycles.length ? 'repeat' : 'five', note: '' },
    effects: ['計劃分頁多一期，總覽的期階梯同步', '階段同時出現在營運 · 甘特'],
    onDelete: e
      ? () => confirmDelete('期', pmCycleName(e), '底下的階段不會被刪除，會回到「未分期」。', () => {
        commit('delete', '期', pmCycleName(e), () => {
          DB.phaseCycles = DB.phaseCycles.filter(c => c.id !== e.id);
          DB.phases.forEach(ph => { if (ph.cycleId === e.id) ph.cycleId = ''; });
          return ['底下的階段改為未分期'];
        });
        closeDrawer();
      })
      : null,
    onSave: v => {
      if (v.endOn < v.startOn) throw Error('結束日不能早於開始日');
      const budget = v.budget === '' ? null : Math.trunc(Number(v.budget));
      if (e) {
        commit('update', '期', pmCycleName(e), () => {
          Object.assign(e, { title: v.title, startOn: v.startOn, endOn: v.endOn, status: v.status, note: v.note });
          if (budget == null) delete e.budget; else e.budget = budget;
          return ['期階梯已更新'];
        });
        return;
      }
      const cid = nid('CYC');
      const row = { id: cid, projectId: p.id, ordinal: nextNo, title: v.title, contractId: '', startOn: v.startOn, endOn: v.endOn, status: v.status, note: v.note };
      if (budget != null) row.budget = budget;
      commit('create', '期', pmCycleName(row), () => {
        DB.phaseCycles.push(row);
        if (v.stages === 'none') return ['先建了一個沒有階段的期'];
        const spans = pmSplitStages(PM_STAGE_PLANS[v.stages] || PM_STAGE_PLANS.five, v.startOn, v.endOn);
        spans.forEach((s, i) => DB.phases.push({
          id: nid('PH'), projectId: p.id, phase: PM_STAGE_PHASE[s.kind], label: PM_STAGE[s.kind],
          startOn: s.startOn, endOn: s.endOn, cycleId: cid, ordinal: i + 1, stageKind: s.kind
        }));
        return [`建立 <b>${spans.length}</b> 個階段`, '日期依起訖先排了一版，可以逐個調整'];
      });
    }
  });
}

/* ---------- 階段 ---------- */
function formPmStage(id, cycleId) {
  const p = P(S.proj);
  if (!p) return;
  const e = id ? pmPhase(id) : null;
  const cycles = pmCycles(p.id);
  const cid = e ? (e.cycleId || '') : (cycleId || (cycles[cycles.length - 1] || {}).id || '');
  const cyc = pmCycle(cid);
  const last = cyc ? pmStages(cyc.id).slice(-1)[0] : null;
  const start = last && last.endOn ? dadd(last.endOn, 1) : (cyc && cyc.startOn) || TODAY;
  openForm({
    crumb: e ? '階段 · ' + e.label : '新階段',
    title: e ? '編輯階段' : '新增階段',
    sub: '階段的狀態由起訖日與底下的里程碑推導：過了結束日而里程碑沒達成就是逾期',
    fields: [
      { k: 'stageKind', label: '種類', type: 'chips', req: true, opts: Object.keys(PM_STAGE).map(k => [k, PM_STAGE[k]]) },
      { k: 'label', label: '顯示名稱', req: true, hint: '預設跟種類同名；同一期內執行與驗收可以各出現不只一次' },
      { k: 'cycleId', label: '屬於哪一期', type: 'select', opts: [['', '（未分期）'], ...cycles.map(c => [c.id, pmCycleName(c) + (c.title ? '｜' + c.title : '')])] },
      { k: 'startOn', label: '開始', type: 'date', req: true, half: true },
      { k: 'endOn', label: '結束', type: 'date', req: true, half: true }
    ],
    values: e
      ? { stageKind: e.stageKind || 'CUSTOM', label: e.label || '', cycleId: e.cycleId || '', startOn: e.startOn || '', endOn: e.endOn || '' }
      : { stageKind: 'EXECUTION', label: PM_STAGE.EXECUTION, cycleId: cid, startOn: start, endOn: dadd(start, 13) },
    onChange: () => {
      // 還沒自己改過名稱的話，名稱跟著種類走。
      const kind = fVal('stageKind'), el = getById('f_label');
      if (el && Object.values(PM_STAGE).includes(el.value)) el.value = PM_STAGE[kind] || el.value;
    },
    effects: ['期階梯與營運 · 甘特同步'],
    onDelete: e
      ? () => confirmDelete('階段', e.label, '底下的里程碑不會被刪除，會回到「未分階段」。', () => {
        commit('delete', '階段', e.label, () => {
          DB.phases = DB.phases.filter(ph => ph.id !== e.id);
          DB.milestones.forEach(m => { if (m.phaseId === e.id) m.phaseId = ''; });
          return ['底下的里程碑改為未分階段'];
        });
        closeDrawer();
      })
      : null,
    onSave: v => {
      if (v.endOn < v.startOn) throw Error('結束日不能早於開始日');
      const body = { stageKind: v.stageKind, label: v.label, phase: PM_STAGE_PHASE[v.stageKind] || 'execution', cycleId: v.cycleId, startOn: v.startOn, endOn: v.endOn };
      if (e) {
        commit('update', '階段', v.label, () => {
          const moved = e.cycleId !== v.cycleId;
          Object.assign(e, body);
          if (moved) e.ordinal = pmStages(v.cycleId).length;
          return ['期階梯已更新'];
        });
      } else {
        commit('create', '階段', v.label, () => {
          DB.phases.push({ id: nid('PH'), projectId: p.id, ordinal: pmStages(v.cycleId).length + 1, ...body });
          return ['期階梯多一個階段'];
        });
      }
    }
  });
}

/** 「完成這個階段」：把結束日收在昨天，下一個階段從今天開始。 */
function pmStageClose(id) {
  const ph = pmPhase(id);
  if (!ph) return;
  const open = pmMsOf(ph.id).filter(m => m.state !== 'done');
  if (open.length) return toast(`還有 <b>${open.length}</b> 個里程碑沒達成，先把它們標成已達成或移到別的階段`);
  const next = pmStages(ph.cycleId).find(x => (x.ordinal || 0) > (ph.ordinal || 0));
  commit('update', '階段', ph.label, () => {
    const end = dadd(TODAY, -1);
    ph.endOn = end < ph.startOn ? ph.startOn : end;
    if (ph.startOn > ph.endOn) ph.startOn = ph.endOn;
    const eff = [`<b>${esc(ph.label)}</b> 標為完成`];
    if (next && next.startOn > TODAY) {
      next.startOn = TODAY;
      if (next.endOn < TODAY) next.endOn = TODAY;
      eff.push(`<b>${esc(next.label)}</b> 從今天開始`);
    }
    return eff;
  });
}

/* ---------- 里程碑 ---------- */
function pmStageOptions(pid) {
  const out = [['', '（未分階段）']];
  pmCycles(pid).forEach(c => pmStages(c.id).forEach(ph => out.push([ph.id, pmCycleName(c) + ' › ' + ph.label])));
  DB.phases.filter(ph => ph.projectId === pid && !ph.cycleId).forEach(ph => out.push([ph.id, '未分期 › ' + ph.label]));
  return out;
}

function formPmMilestone(id, phaseId) {
  const p = P(S.proj);
  if (!p) return;
  const e = id ? MS(id) : null;
  if (e && !opGuard(e)) return;
  const folders = pmFolders(p.id).filter(f => f.kind !== 'ROOT' && f.kind !== 'INBOX');
  openForm({
    crumb: e ? '里程碑 · ' + e.id : '新里程碑',
    title: e ? '編輯里程碑' : '新增里程碑',
    sub: '里程碑是對外承諾的交付點；填了日期才會出現在日曆與甘特上',
    fields: [
      { k: 'title', label: '名稱', req: true, ph: '例如：M04 網站資源一版' },
      { k: 'dueOn', label: '目標日', type: 'date', half: true, hint: '留空＝日期待補，不進日曆' },
      { k: 'accept', label: '驗收方式', half: true },
      { k: 'phaseId', label: '屬於哪個階段', type: 'select', opts: pmStageOptions(p.id) },
      { k: 'state', label: '狀態', type: 'chips', opts: [['open', '進行中'], ['done', '已達成']] },
      {
        k: 'folderId', label: '交付夾', type: 'select',
        opts: [['', '（不連結）'], ...folders.map(f => [f.id, pmTrail(f).slice(1).map(x => x.name).join(' / ')])],
        hint: '這是連結不是搬移：資料夾留在硬碟原本的位置'
      },
      { k: 'remind', label: '提醒', type: 'select', opts: opRemindOpts }
    ],
    values: e
      ? { title: e.title, dueOn: e.dueOn || '', accept: e.accept || '', phaseId: e.phaseId || '', state: e.state || 'open', folderId: e.folderId || '', remind: e.remind || '前 3 日' }
      : { title: '', dueOn: '', accept: '', phaseId: phaseId || '', state: 'open', folderId: '', remind: '前 3 日' },
    effects: ['計劃的階層與總覽的時間流同步', '有日期的里程碑會出現在營運 · 日曆與甘特'],
    onDelete: e
      ? () => confirmDelete('里程碑', e.title, '底下的任務不會被刪除，會回到「未掛里程碑」。', () => {
        commit('delete', '里程碑', e.title, () => {
          DB.milestones = DB.milestones.filter(m => m.id !== e.id);
          DB.objectives = (DB.objectives || []).filter(o => o.milestoneId !== e.id);
          DB.issues.forEach(i => { if (i.msId === e.id) i.msId = ''; });
          return ['底下的任務改為未掛里程碑', '日曆與甘特移除該節點'];
        });
        closeDrawer();
      })
      : null,
    onSave: v => {
      const body = { title: v.title, dueOn: v.dueOn, accept: v.accept, phaseId: v.phaseId, state: v.state, folderId: v.folderId, remind: v.remind };
      if (e) {
        commit('update', '里程碑', v.title, () => {
          Object.assign(e, body);
          return [v.dueOn ? `日曆 <b>${v.dueOn}</b> 的位置已更新` : '日期待補，暫不進日曆'];
        });
      } else {
        commit('create', '里程碑', v.title, () => {
          DB.milestones.push({ id: nid('MS'), projectId: p.id, derivedFrom: '', author: DB.me, ...body });
          return [v.dueOn ? `日曆 <b>${v.dueOn}</b> 新增里程碑` : '日期待補，暫不進日曆'];
        });
      }
    }
  });
}

function pmMsToggle(id) {
  const m = MS(id);
  if (!m || !opGuard(m)) return;
  commit('update', '里程碑', m.title, () => {
    m.state = m.state === 'done' ? 'open' : 'done';
    return [m.state === 'done' ? '標為已達成' : '改回進行中'];
  });
}

/* ---------- 任務（TODO ／ 審核） ---------- */

/**
 * preset: { kind?, msId?, t?, exp?, after?(issue) }
 * after 讓「訊息→任務」「會議待辦→任務」在同一次 commit 裡把來源那一頭也標上。
 */
function formPmTask(id, preset) {
  const p = P(S.proj);
  if (!p) return;
  const e = id ? ISS(id) : null;
  if (e && !editable(e) && !isOwner()) return deny();
  const pre = preset || {};
  const msOpts = [['', '（不掛里程碑）'], ...pmMilestones(p.id).map(m => [m.id, m.title])];
  openForm({
    crumb: e ? e.id : '新任務',
    title: e ? '編輯任務' : '新增任務',
    sub: pre.from ? '來源：' + pre.from : 'TODO 是要做的事；審核任務多一個審核人，要通過才算完成',
    fields: [
      { k: 't', label: '標題', req: true, ph: '這件事要完成什麼' },
      { k: 'kind', label: '種類', type: 'chips', req: true, opts: [['TODO', 'TODO'], ['REVIEW', '審核任務']] },
      { k: 'msId', label: '掛在哪個里程碑', type: 'select', opts: msOpts },
      { k: 'owner', label: '負責人', type: 'select', req: true, half: true, opts: PEOPLE_OPTS() },
      { k: 'reviewer', label: '審核人', type: 'select', half: true, opts: [['', '（TODO 不需要）'], ...PEOPLE_OPTS()], hint: '審核任務才需要' },
      { k: 'due', label: '期限', type: 'date', half: true },
      { k: 'size', label: 'Size', type: 'chips', half: true, opts: ['S', 'M', 'L'] },
      { k: 'exp', label: '完成的樣子', type: 'textarea', rows: 2, ph: '另一個人看到什麼，算完成' }
    ],
    values: e
      ? { t: e.t, kind: pmIsReview(e) ? 'REVIEW' : 'TODO', msId: e.msId || '', owner: e.owner || DB.me, reviewer: e.reviewer || '', due: e.due || '', size: e.size || 'M', exp: e.exp || '' }
      : { t: pre.t || '', kind: pre.kind || 'TODO', msId: pre.msId || '', owner: DB.me, reviewer: '', due: '', size: 'M', exp: pre.exp || '' },
    effects: ['計劃的階層與「工作」子視圖同步', '同時計入工作台與容量統計'],
    onDelete: e ? () => delIssue(e.id) : null,
    onSave: v => {
      if (v.kind === 'REVIEW' && !v.reviewer) throw Error('審核任務需要指定審核人');
      if (e) {
        commit('update', '任務', v.t, () => {
          const wasReview = pmIsReview(e);
          Object.assign(e, { t: v.t, kind: v.kind, msId: v.msId, owner: v.owner, reviewer: v.kind === 'REVIEW' ? v.reviewer : '', due: v.due, size: v.size, exp: v.exp });
          if (v.kind === 'REVIEW' && !wasReview) e.reviewResult = 'PENDING';
          if (v.kind !== 'REVIEW') { e.reviewResult = ''; e.reviewNote = ''; e.reviewedAt = 0; }
          return ['計劃階層已更新'];
        });
        return;
      }
      const it = {
        id: nid('ISS'), t: v.t, p: p.id, owner: v.owner, size: v.size, pri: 3, st: 'Todo', created: TODAY, started: '', done: '',
        blocker: '', exp: v.exp, ev: 0, rel: [], cf: {}, sub: [], due: v.due,
        kind: v.kind, msId: v.msId, reviewer: v.kind === 'REVIEW' ? v.reviewer : '',
        reviewResult: v.kind === 'REVIEW' ? 'PENDING' : '', reviewNote: '', reviewedAt: 0
      };
      commit('create', v.kind === 'REVIEW' ? '審核任務' : 'TODO', v.t, () => {
        DB.issues.unshift(it);
        const eff = [`專案工作數 → <b>${pmTasks(p.id).length}</b>`];
        if (pre.after) eff.push(...(pre.after(it) || []));
        return eff;
      });
    }
  });
}

/** 勾掉一個 TODO，或把它拉回來。 */
function pmTaskToggle(id) {
  const t = ISS(id);
  if (!t) return;
  if (!progressable(t)) return deny();
  commit('update', 'TODO', t.t, () => {
    if (t.st === 'Done') { t.st = 'Doing'; t.done = ''; return ['改回進行中']; }
    t.st = 'Done';
    if (!t.started) t.started = TODAY;
    t.done = TODAY;
    return ['標為完成', ...effFlow()];
  });
}

/** 審核流程：送審 → 通過／退回 → （退回後）重新送審。 */
function pmReview(id, action) {
  const t = ISS(id);
  if (!t) return;
  const mine = t.owner === DB.me || isOwner();
  const reviewer = t.reviewer === DB.me || isOwner();
  if (action === 'submit') {
    if (!mine) return deny();
    return commit('update', '審核任務', t.t, () => {
      t.reviewResult = 'IN_REVIEW';
      t.st = 'Review';
      if (!t.started) t.started = TODAY;
      return [`送給 <b>${esc(pmWho(t.reviewer))}</b> 審核`];
    });
  }
  if (!reviewer) return deny();
  if (action === 'pass') {
    return commit('update', '審核任務', t.t, () => {
      t.reviewResult = 'PASSED';
      t.reviewedAt = Date.now();
      t.reviewNote = '';
      t.st = 'Done';
      t.done = TODAY;
      return ['審核通過，任務完成', ...effFlow()];
    });
  }
  if (action === 'reject') {
    openForm({
      crumb: t.id,
      title: '退回',
      sub: esc(t.t),
      saveLabel: '退回',
      fields: [{ k: 'note', label: '退回原因', type: 'textarea', rows: 3, req: true, ph: '要改什麼、改到什麼程度才會通過' }],
      values: { note: '' },
      effects: ['任務回到負責人手上，狀態改為進行中', '退回原因會顯示在這一列，直到重新送審'],
      onSave: v => {
        commit('update', '審核任務', t.t, () => {
          t.reviewResult = 'CHANGES_REQUESTED';
          t.reviewedAt = Date.now();
          t.reviewNote = v.note;
          t.st = 'Doing';
          t.done = '';
          return [`退回給 <b>${esc(pmWho(t.owner))}</b>`];
        });
      }
    });
  }
}

/* ---------- 版面 ---------- */
function pmTaskRow(t) {
  const review = pmIsReview(t);
  const done = t.st === 'Done';
  const late = !done && t.due && t.due < TODAY;
  const rv = PM_REVIEW[t.reviewResult] || PM_REVIEW.PENDING;
  const acts = [];
  if (review) {
    if (t.reviewResult === 'IN_REVIEW') {
      acts.push(`<button class="btn sm" onclick="pmReview('${t.id}','pass')">${svg('check')} 通過</button>`);
      acts.push(`<button class="btn sm" onclick="pmReview('${t.id}','reject')">${svg('undo')} 退回</button>`);
    } else if (t.reviewResult !== 'PASSED') {
      acts.push(`<button class="btn sm" onclick="pmReview('${t.id}','submit')">${svg('send')} ${t.reviewResult === 'CHANGES_REQUESTED' ? '重新送審' : '送審'}</button>`);
    }
  }
  return `<div class="pm-pl-task ${done ? 'done' : ''}">
    ${review
      ? `<span class="pm-pl-kind" title="審核任務">${svg('checkCircle', 14)}</span>`
      : `<button type="button" class="pm-pl-check ${done ? 'on' : ''}" aria-pressed="${done}" title="${done ? '改回進行中' : '標為完成'}" onclick="pmTaskToggle('${t.id}')">${done ? svg('check', 11) : ''}</button>`}
    <button type="button" class="pm-pl-t" onclick="openDrawer('issue','${t.id}')">${esc(t.t)}</button>
    <span class="pm-pl-m">
      ${review ? `<span class="pm-chip ${rv.tone}">${rv.label}</span><span class="pm-pl-who">審核人 ${esc(pmWho(t.reviewer))}</span>` : stChip(t.st)}
      ${t.due ? `<span class="pm-pl-due ${late ? 'late' : ''}">${t.due.slice(5)}</span>` : ''}
      ${pmAv(t.owner)}
      ${acts.join('')}
      ${mini('pen', `formPmTask('${t.id}')`)}
    </span>
    ${review && t.reviewResult === 'CHANGES_REQUESTED' && t.reviewNote ? `<div class="pm-pl-note">${svg('undo', 11)}<span>${esc(t.reviewNote)}</span></div>` : ''}
    ${review && t.reviewResult === 'PASSED' && t.reviewedAt ? `<div class="pm-pl-note ok">${svg('check', 11)}<span>${pmDay(t.reviewedAt)} 通過</span></div>` : ''}
  </div>`;
}

function pmMsBlock(m) {
  const tasks = pmTasksOf(m.id);
  const done = tasks.filter(t => t.st === 'Done').length;
  const late = m.state !== 'done' && m.dueOn && m.dueOn < TODAY;
  const folder = m.folderId ? pmFolder(m.folderId) : null;
  return `<div class="pm-pl-ms">
    <div class="pm-pl-ms-h">
      <button type="button" class="pm-pl-dia ${m.state === 'done' ? 'done' : ''}" aria-pressed="${m.state === 'done'}" title="${m.state === 'done' ? '改回進行中' : '標為已達成'}" onclick="pmMsToggle('${m.id}')">${svg('diamond', 12)}</button>
      <button type="button" class="pm-pl-t strong" onclick="formPmMilestone('${m.id}')">${esc(m.title)}</button>
      <span class="pm-pl-m">
        <span class="pm-pl-due ${late ? 'late' : ''}">${m.dueOn || '日期待補'}</span>
        ${late ? '<span class="pm-chip crit">逾期</span>' : ''}
        ${m.derivedFrom ? `<span class="pm-chip">${svg('lock', 10)} ${esc(m.derivedFrom)}</span>` : ''}
        ${folder ? `<button type="button" class="pm-chip pri pm-chip-btn" onclick="pmJump('drive','tree','計劃',{folder:'${folder.id}'})">${svg('folder', 10)} 交付夾</button>` : ''}
        <span class="pm-pl-cnt">${done}/${tasks.length}</span>
        <button class="btn sm" onclick="formPmTask(null,{msId:'${m.id}'})">${svg('plus')} 任務</button>
      </span>
    </div>
    ${m.accept ? `<div class="pm-pl-accept">驗收方式：${esc(m.accept)}</div>` : ''}
    ${tasks.length ? tasks.map(pmTaskRow).join('') : '<div class="pm-pl-none">還沒有任務</div>'}
  </div>`;
}

function pmStageBlock(ph) {
  const st = pmStageState(ph);
  const ms = pmMsOf(ph.id);
  return `<div class="pm-pl-stage ${st}">
    <div class="pm-pl-stage-h">
      <span class="pm-pl-st">${svg(PM_STAGE_ICON[st])}</span>
      <button type="button" class="pm-pl-t strong" onclick="formPmStage('${ph.id}')">${esc(ph.label)}</button>
      <span class="pm-chip ${PM_STATE_TONE[st]}">${PM_STATE_LABEL[st]}</span>
      <span class="pm-pl-m">
        <span class="pm-pl-due">${[ph.startOn, ph.endOn].filter(Boolean).map(d => d.slice(5)).join(' → ')}</span>
        ${st === 'now' || st === 'late' ? `<button class="btn sm" onclick="pmStageClose('${ph.id}')">${svg('check')} 完成這個階段</button>` : ''}
        <button class="btn sm" onclick="formPmMilestone(null,'${ph.id}')">${svg('plus')} 里程碑</button>
      </span>
    </div>
    ${ms.length ? ms.map(pmMsBlock).join('') : '<div class="pm-pl-none">這個階段還沒有里程碑</div>'}
  </div>`;
}

function pmCycleBlock(c) {
  const stages = pmStages(c.id);
  const open = S.pmFold['cyc:' + c.id] !== true;
  const tone = c.status === 'ACTIVE' ? 'pri' : c.status === 'ACCEPTED' || c.status === 'CLOSED' ? 'good' : '';
  return `<section class="pm-pl-cycle">
    <div class="pm-pl-cycle-h">
      <button type="button" class="pm-pl-fold ${open ? 'open' : ''}" aria-expanded="${open}" aria-label="收合或展開這一期" onclick="pmFoldToggle('cyc:${c.id}')">${svg('chevronRight', 13)}</button>
      <span class="pm-cycle-n">C${c.ordinal}</span>
      <button type="button" class="pm-pl-t strong" onclick="formPmCycle('${c.id}')">${esc(pmCycleName(c) + (c.title ? '｜' + c.title : ''))}</button>
      <span class="pm-chip ${tone}">${PM_CYCLE_ST[c.status] || c.status}</span>
      <span class="pm-pl-m">
        <span class="pm-pl-due">${[c.startOn, c.endOn].filter(Boolean).join(' → ')}</span>
        ${c.budget != null ? `<span class="pm-pl-who">預算 ${nt(c.budget)}</span>` : ''}
        <button class="btn sm" onclick="formPmStage(null,'${c.id}')">${svg('plus')} 階段</button>
      </span>
    </div>
    ${open ? (stages.length ? stages.map(pmStageBlock).join('') : '<div class="pm-pl-none">這一期還沒有階段</div>') : ''}
  </section>`;
}

function pmFoldToggle(key) {
  S.pmFold[key] = S.pmFold[key] !== true;
  render();
}

PMV.plan = function (p) {
  if (!p) return '';
  const cycles = pmCycles(p.id);
  const tasks = pmTasks(p.id);
  const ms = pmMilestones(p.id);
  const stageIds = new Set(DB.phases.filter(ph => ph.projectId === p.id).map(ph => ph.id));
  const looseStages = DB.phases.filter(ph => ph.projectId === p.id && !ph.cycleId);
  const looseMs = ms.filter(m => !m.phaseId || !stageIds.has(m.phaseId));
  const msIds = new Set(ms.map(m => m.id));
  const looseTasks = tasks.filter(t => !t.msId || !msIds.has(t.msId));
  const reviews = tasks.filter(pmIsReview);

  const rail = pmRail([
    { label: '期', value: cycles.length },
    { label: '階段', value: cycles.reduce((n, c) => n + pmStages(c.id).length, 0) + looseStages.length },
    { label: '里程碑', value: ms.filter(m => m.state === 'done').length + ' / ' + ms.length },
    { label: 'TODO', value: tasks.filter(t => !pmIsReview(t) && t.st !== 'Done').length, note: '未完成' },
    { label: '審核中', value: reviews.filter(t => t.reviewResult === 'IN_REVIEW').length, tone: reviews.some(t => t.reviewResult === 'IN_REVIEW') ? 'warn' : '' },
    { label: '已退回', value: reviews.filter(t => t.reviewResult === 'CHANGES_REQUESTED').length, tone: reviews.some(t => t.reviewResult === 'CHANGES_REQUESTED') ? 'crit' : '' }
  ], { label: '計劃重點數字' });

  const bar = `<div class="pm-bar">
    <button class="btn pri" onclick="formPmCycle()">${svg('plus')} 新增一期</button>
    <button class="btn" onclick="formPmStage()">${svg('plus')} 階段</button>
    <button class="btn" onclick="formPmMilestone()">${svg('plus')} 里程碑</button>
    <button class="btn" onclick="formPmTask(null,{kind:'TODO'})">${svg('plus')} TODO</button>
    <button class="btn" onclick="formPmTask(null,{kind:'REVIEW'})">${svg('plus')} 審核任務</button>
  </div>`;

  const tree = cycles.length
    ? cycles.map(pmCycleBlock).join('')
    : pmEmpty('還沒有分期。建立第一期時可以一次帶出「提案 → 接案 → 執行 → 驗收 → 結案」五個階段。', `<button class="btn pri" onclick="formPmCycle()">${svg('plus')} 建立第一期</button>`);

  const loose = [];
  if (looseStages.length) {
    loose.push(pmBlock('未分期的階段', looseStages.length + ' 個', looseStages.map(pmStageBlock).join('')));
  }
  if (looseMs.length) {
    loose.push(pmBlock('未分階段的里程碑', looseMs.length + ' 個', looseMs.map(pmMsBlock).join('')));
  }
  if (looseTasks.length) {
    loose.push(pmBlock(
      '未掛里程碑的任務', looseTasks.length + ' 件',
      looseTasks.slice(0, 12).map(pmTaskRow).join('') + (looseTasks.length > 12 ? `<div class="pm-pl-none">還有 ${looseTasks.length - 12} 件，在「工作」子視圖看全部</div>` : ''),
      `<button class="btn sm" onclick="pmGo('plan','work')">看全部工作</button>`
    ));
  }

  return rail + bar + `<div class="pm-pl" data-pm-surface="primary">${tree}</div>` + loose.join('');
};
