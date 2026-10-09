/* ==================================================================
   專案模組：狀態變更、狀態紀錄、行內新增、範本初始化（RES-035 · PROJUI-002）

   一條規則貫穿整個專案模組：**看得到狀態的地方就改得到，改的時候可以留理由。**

   - pmStatusChip(ent, id)   畫一顆可點的狀態籤。
   - 點下去是就地的小視窗：選狀態 → 寫理由 → Enter。往前推進理由可略過；
     往回走、結案、取消、退回一律必填 —— 往前是例行，往回才需要解釋。
   - 每一筆變更寫成專案主頻道的一則系統訊息（origin: SYSTEM、type: status）。
     訊息表本來就為「階段完成、里程碑達成」留了這個來源；用它，兩個席位都看得到、
     重新整理後還在、總覽的時間流與對話分頁都讀同一列，不必另開一張紀錄表。
   - 所有寫入走 commit()（ARC-042）。效果的第一行是「狀態 A → B｜理由」，
     稽核軌跡的 detail 讀的就是那一行。

   階段沒有狀態欄，狀態由起訖日與里程碑推導（pm-shell 的 pmStageState）。
   所以「把階段改成進行中」實際上是改日期，效果裡會明說改了哪一天。
   ================================================================== */

var PMV = PMV || {};

const PM_TASK_ST = { Todo: '待辦', Doing: '進行中', Review: '審核中', Done: '完成' };
const PM_TASK_TONE = { Todo: '', Doing: 'pri', Review: 'warn', Done: 'good' };

/**
 * 每一種可改狀態的東西一筆設定。
 *   opts(e)        [[值, 顯示, 色調], …]，順序就是「往前」的方向
 *   cur(e)         目前的值
 *   set(e, to, r)  實際改資料，回傳下游影響
 *   guard(e)       回傳 false 表示不能改（自己負責跳提示）
 *   block(e, to)   這個選項現在不能選的原因；可以選就回空字串
 *   mustTo         改成這些值一定要寫理由
 */
const PM_ST = {
  project: {
    name: '專案', get: id => P(id), label: p => p.t, pid: p => p.id,
    opts: () => [['商機', '商機', ''], ['進行中', '進行中', 'pri'], ['驗收中', '驗收中', 'warn'], ['已結案', '已結案', 'off']],
    cur: p => p.status || '商機',
    mustTo: ['已結案'],
    guard: p => (editable(p) || isOwner() ? true : (deny(), false)),
    set: (p, to) => { p.status = to; return effProject(p.id); }
  },
  cycle: {
    name: '期', get: id => pmCycle(id), label: c => pmCycleName(c) + (c.title ? '｜' + c.title : ''), pid: c => c.projectId,
    opts: () => [['PLANNED', '規劃中', ''], ['ACTIVE', '進行中', 'pri'], ['ACCEPTED', '已驗收', 'good'], ['CLOSED', '已結案', 'off'], ['CANCELLED', '已取消', 'crit']],
    cur: c => c.status || 'PLANNED',
    mustTo: ['CANCELLED'],
    set: (c, to) => { c.status = to; return ['期階梯已更新']; }
  },
  stage: {
    name: '階段', get: id => pmPhase(id), label: ph => ph.label, pid: ph => ph.projectId,
    opts: () => [['todo', '未開始', ''], ['now', '進行中', 'pri'], ['done', '已完成', 'good']],
    // 逾期是「進行中但過了結束日」，不是第四個可以選的狀態。
    cur: ph => (pmStageState(ph) === 'late' ? 'now' : pmStageState(ph)),
    show: ph => { const st = pmStageState(ph); return [PM_STATE_LABEL[st], PM_STATE_TONE[st]]; },
    same: (ph, to) => pmStageState(ph) === to,
    block: (ph, to) => {
      if (to !== 'done') return '';
      const open = pmMsOf(ph.id).filter(m => m.state !== 'done').length;
      return open ? '還有 ' + open + ' 個里程碑沒達成' : '';
    },
    set: (ph, to) => {
      if (to === 'done') {
        const end = dadd(TODAY, -1);
        ph.endOn = end < ph.startOn ? ph.startOn : end;
        const eff = ['結束日收在 ' + ph.endOn];
        const next = pmStages(ph.cycleId).find(x => (x.ordinal || 0) > (ph.ordinal || 0));
        if (next && next.startOn > TODAY) {
          next.startOn = TODAY;
          if (next.endOn < TODAY) next.endOn = TODAY;
          eff.push(`<b>${esc(next.label)}</b> 從今天開始`);
        }
        return eff;
      }
      if (to === 'now') {
        const eff = [];
        if (!ph.startOn || ph.startOn > TODAY) { ph.startOn = TODAY; eff.push('開始日改為今天'); }
        if (!ph.endOn || ph.endOn < TODAY) { ph.endOn = dadd(TODAY, 7); eff.push('結束日延到 ' + ph.endOn + '，可以再調整'); }
        return eff;
      }
      ph.startOn = dadd(TODAY, 1);
      if (!ph.endOn || ph.endOn < ph.startOn) ph.endOn = dadd(ph.startOn, 6);
      return ['開始日改為明天（' + ph.startOn + '）'];
    }
  },
  milestone: {
    name: '里程碑', get: id => MS(id), label: m => m.title, pid: m => m.projectId,
    // 還沒輪到的階段底下也有里程碑；叫它「進行中」會讓整頁都是藍色的。
    opts: () => [['open', '未達成', ''], ['done', '已達成', 'good']],
    cur: m => (m.state === 'done' ? 'done' : 'open'),
    guard: m => opGuard(m),
    set: (m, to) => { m.state = to; return [to === 'done' ? '日曆與甘特標為已達成' : '改回未達成']; }
  },
  task: {
    name: '任務', get: id => ISS(id), label: t => t.t, pid: t => t.p,
    // 「審核中」只屬於審核任務；一般 TODO 只有三格，除非它本來就停在 Review。
    opts: t => ['Todo', 'Doing', ...(t.st === 'Review' ? ['Review'] : []), 'Done'].map(k => [k, PM_TASK_ST[k], PM_TASK_TONE[k]]),
    cur: t => (PM_TASK_ST[t.st] ? t.st : 'Todo'),
    guard: t => (progressable(t) || isOwner() ? true : (deny(), false)),
    set: (t, to) => {
      t.st = to;
      if (to !== 'Todo' && !t.started) t.started = TODAY;
      if (to === 'Done') { t.done = TODAY; return effFlow(); }
      t.done = '';
      return [];
    }
  },
  review: {
    name: '審核任務', get: id => ISS(id), label: t => t.t, pid: t => t.p,
    opts: () => [['PENDING', '未送審', ''], ['IN_REVIEW', '審核中', 'warn'], ['CHANGES_REQUESTED', '已退回', 'crit'], ['PASSED', '已通過', 'good']],
    cur: t => (PM_REVIEW[t.reviewResult] && t.reviewResult !== 'WAIVED' ? t.reviewResult : 'PENDING'),
    mustTo: ['CHANGES_REQUESTED'],
    // 退回 → 重新送審 是流程的下一步，不算往回走。
    forward: (from, to) => from === 'CHANGES_REQUESTED' && to === 'IN_REVIEW',
    block: (t, to) => {
      const mine = t.owner === DB.me || isOwner();
      const reviewer = t.reviewer === DB.me || isOwner();
      if ((to === 'PASSED' || to === 'CHANGES_REQUESTED') && !reviewer) return '只有審核人 ' + pmWho(t.reviewer) + ' 可以決定';
      if ((to === 'IN_REVIEW' || to === 'PENDING') && !mine) return '只有負責人可以送審或撤回';
      return '';
    },
    set: (t, to, reason) => {
      t.reviewResult = to;
      if (to === 'IN_REVIEW') { t.st = 'Review'; if (!t.started) t.started = TODAY; return [`送給 <b>${esc(pmWho(t.reviewer))}</b> 審核`]; }
      if (to === 'PASSED') { t.reviewedAt = Date.now(); t.reviewNote = ''; t.st = 'Done'; t.done = TODAY; return ['審核通過，任務完成', ...effFlow()]; }
      if (to === 'CHANGES_REQUESTED') { t.reviewedAt = Date.now(); t.reviewNote = reason; t.st = 'Doing'; t.done = ''; return [`退回給 <b>${esc(pmWho(t.owner))}</b>`]; }
      t.st = t.started ? 'Doing' : 'Todo';
      t.done = '';
      return ['撤回送審'];
    }
  },
  // 負責人不是狀態，但「點一下就換人」是同一個互動；不問理由、不進狀態紀錄。
  owner: {
    name: '負責人', get: id => ISS(id), label: t => t.t, pid: t => t.p, plain: true,
    opts: () => [...Object.keys(DB.people).map(k => [k, DB.people[k].n, '']), ['', '未指派', '']],
    cur: t => (DB.people[t.owner] ? t.owner : ''),
    guard: t => (progressable(t) || isOwner() || !t.owner ? true : (deny(), false)),
    set: (t, to) => { t.owner = to; return [to ? `交給 <b>${esc(pmWho(to))}</b>` : '改為未指派']; }
  }
};

function pmStOpt(cfg, e, value) {
  return cfg.opts(e).find(o => o[0] === value) || [value, value, ''];
}

/** 可點的狀態籤。找不到那一筆就什麼都不畫。 */
function pmStatusChip(ent, id) {
  const cfg = PM_ST[ent];
  const e = cfg && cfg.get(id);
  if (!e) return '';
  const shown = cfg.show ? cfg.show(e) : pmStOpt(cfg, e, cfg.cur(e)).slice(1);
  return `<button type="button" class="pm-stc ${shown[1] || ''}" aria-haspopup="dialog" title="變更${cfg.name}狀態" onclick="pmStatusOpen(this,'${ent}','${id}')"><span>${esc(shown[0])}</span>${svg('chevronRight', 10)}</button>`;
}

/** 任務有兩種：審核任務改的是審核結果，一般 TODO 改的是狀態。 */
function pmTaskChip(t) {
  return pmIsReview(t) ? pmStatusChip('review', t.id) : pmStatusChip('task', t.id);
}

function pmOwnerBtn(t) {
  const who = DB.people[t.owner];
  return `<button type="button" class="pm-own" aria-haspopup="dialog" title="負責人：${esc(who ? who.n : '未指派')}（點一下換人）" onclick="pmStatusOpen(this,'owner','${t.id}')">${who ? `<span class="av ${who.cls}">${esc(who.s)}</span>` : '<span class="av pm-own-none">?</span>'}</button>`;
}

/* ---------- 狀態紀錄 ---------- */
const pmIsStatusMsg = m => m.type === 'status';

/** 這個專案的狀態變更，新的在前。ref 有給就只看那一筆的。 */
function pmStatusLog(pid, ref) {
  const channels = new Set(DB.chatChannels.filter(c => c.projectId === pid).map(c => c.id));
  return DB.chatMessages
    .filter(m => pmIsStatusMsg(m) && channels.has(m.channelId) && (!ref || (m.meta || {}).ref === ref))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

/** 寫一筆狀態紀錄。必須在 commit() 的 apply 裡呼叫，才會跟狀態本身同一筆命令送出。 */
function pmStatusRecord(pid, rec) {
  let ch = DB.chatChannels.find(c => c.projectId === pid && c.kind === 'MAIN' && !c.archived);
  if (!ch) {
    ch = { id: nid('CH'), projectId: pid, kind: 'MAIN', name: '專案主頻道', topic: '', readOnly: false, archived: false, sortOrder: 0, dropFolderId: '', author: DB.me };
    DB.chatChannels.push(ch);
  }
  DB.chatMessages.push({
    id: nid('MSG'), channelId: ch.id, w: DB.me, origin: 'SYSTEM', type: 'status',
    text: `${rec.kind}「${rec.name}」 ${rec.from} → ${rec.to}` + (rec.reason ? '　' + rec.reason : ''),
    at: Date.now(), mentions: [], meta: rec
  });
}

function pmStatusLine(m) {
  const x = m.meta || {};
  return `<div class="pm-sysline">
    <span class="pm-sysline-d">${pmDay(m.at).slice(5)} ${pmClock(m.at)}</span>
    <span class="pm-sysline-t"><b>${esc(pmWho(m.w))}</b> 把${esc(x.kind || '')}「${esc(x.name || '')}」 ${esc(x.from || '')} → <b>${esc(x.to || '')}</b>${x.reason ? `<em>${esc(x.reason)}</em>` : ''}</span>
  </div>`;
}

/* ---------- 小視窗 ---------- */
root.insertAdjacentHTML('beforeend', `<div class="pm-pop-wrap" id="pmPopWrap" onclick="if(event.target===this)pmPopClose()">
 <div class="pm-pop" id="pmPop" role="dialog" aria-modal="true" aria-label="變更狀態"></div>
</div>`);
getById('pmPopWrap').inert = true;
PM.pop = null;

function pmPopOpen() {
  const w = getById('pmPopWrap');
  return !!w && w.classList.contains('on');
}

function pmPopClose() {
  const w = getById('pmPopWrap');
  if (!w || !w.classList.contains('on')) return;
  w.classList.remove('on');
  w.inert = true;
  getById('pmPop').innerHTML = '';
  const back = PM.pop && PM.pop.anchorKey ? root.querySelector(`[data-pm-anchor="${PM.pop.anchorKey}"]`) : null;
  PM.pop = null;
  if (back && back.isConnected) back.focus();
}

/** 往回走或落在 mustTo 上的變更要寫理由。 */
function pmStatusMust(cfg, e, to) {
  if (cfg.plain) return false;
  if ((cfg.mustTo || []).includes(to)) return true;
  const from = cfg.cur(e);
  if (cfg.forward && cfg.forward(from, to)) return false;
  const order = cfg.opts(e).map(o => o[0]);
  return order.indexOf(to) < order.indexOf(from);
}

function pmPopPaint() {
  const st = PM.pop;
  const cfg = PM_ST[st.ent];
  const e = cfg.get(st.id);
  if (!e) return pmPopClose();
  const cur = cfg.cur(e);
  const must = pmStatusMust(cfg, e, st.to);
  const keep = getById('pmPopReason') ? getById('pmPopReason').value : '';
  const opts = cfg.opts(e).map(o => {
    const why = o[0] === cur ? '' : (cfg.block ? cfg.block(e, o[0]) : '');
    return `<button type="button" role="radio" aria-checked="${o[0] === st.to}" class="pm-pop-o ${o[0] === st.to ? 'on' : ''}" ${why ? 'disabled' : ''} onclick="pmStatusPick('${o[0]}')">
      <i class="pm-pop-dot ${o[2] || ''}"></i><span>${esc(o[1])}</span>${o[0] === cur ? '<em>目前</em>' : why ? `<em>${esc(why)}</em>` : ''}
    </button>`;
  }).join('');
  const log = cfg.plain ? [] : pmStatusLog(cfg.pid(e), st.id).slice(0, 3);
  getById('pmPop').innerHTML = `
    <div class="pm-pop-h"><span class="pm-eyebrow">${cfg.plain ? '指定' + cfg.name : '變更' + cfg.name + '狀態'}</span><b>${esc(pmCut(cfg.label(e), 40))}</b></div>
    <div class="pm-pop-os" role="radiogroup" aria-label="${cfg.name}">${opts}</div>
    ${cfg.plain ? '' : `<label class="pm-pop-r"><span>理由<i class="${must ? 'must' : ''}">${must ? '必填' : '可略過'}</i></span>
      <textarea id="pmPopReason" rows="2" placeholder="${must ? '往回走或結束時，寫一句為什麼' : '寫一句為什麼（可略過），Enter 送出'}" onkeydown="pmPopKey(event)">${esc(keep)}</textarea></label>`}
    <div class="pm-pop-f"><span class="pm-pop-err" id="pmPopErr" role="alert"></span>
      <button type="button" class="btn sm" onclick="pmPopClose()">取消</button>
      ${cfg.plain ? '' : `<button type="button" class="btn sm pri" id="pmPopSave" onclick="pmStatusSave()">更新</button>`}</div>
    ${log.length ? `<div class="pm-pop-log"><span class="pm-eyebrow">最近的變更</span>${log.map(pmStatusLine).join('')}</div>` : ''}`;
}

function pmStatusOpen(el, ent, id) {
  const cfg = PM_ST[ent];
  const e = cfg && cfg.get(id);
  if (!e) return;
  if (cfg.guard && !cfg.guard(e)) return;
  const anchorKey = ent + ':' + id + ':' + Date.now();
  if (el && el.setAttribute) el.setAttribute('data-pm-anchor', anchorKey);
  PM.pop = { ent, id, to: cfg.cur(e), anchorKey };
  const w = getById('pmPopWrap');
  const pop = getById('pmPop');
  w.inert = false;
  w.classList.add('on');
  pmPopPaint();
  // 貼著那顆狀態籤開；右邊或下面放不下就往回收。窄螢幕由 CSS 改成底部抽屜。
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 80, bottom: 120, top: 100 };
  const vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
  const width = 320, height = pop.offsetHeight || 300;
  pop.style.left = Math.max(12, Math.min(r.left, vw - width - 12)) + 'px';
  pop.style.top = (r.bottom + 6 + height > vh - 12 ? Math.max(12, r.top - height - 6) : r.bottom + 6) + 'px';
  setTimeout(() => {
    const first = pop.querySelector('.pm-pop-o.on') || pop.querySelector('.pm-pop-o');
    if (first) first.focus();
  }, 0);
}

function pmStatusPick(value) {
  const st = PM.pop;
  if (!st) return;
  const cfg = PM_ST[st.ent];
  // 換負責人不需要理由，點了就是。
  if (cfg.plain) return pmStatusApply(st.ent, st.id, value, '');
  st.to = value;
  pmPopPaint();
  const input = getById('pmPopReason');
  if (input) input.focus();
}

function pmPopKey(e) {
  // 注音／倉頡選字用的 Enter 不是送出。
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  pmStatusSave();
}

function pmStatusSave() {
  const st = PM.pop;
  if (!st) return;
  const cfg = PM_ST[st.ent];
  const e = cfg.get(st.id);
  if (!e) return pmPopClose();
  const reason = (getById('pmPopReason') ? getById('pmPopReason').value : '').trim();
  const same = cfg.same ? cfg.same(e, st.to) : cfg.cur(e) === st.to;
  if (same) return pmPopClose();
  if (pmStatusMust(cfg, e, st.to) && !reason) {
    getById('pmPopErr').textContent = '這個變更要寫理由';
    const input = getById('pmPopReason');
    if (input) input.focus();
    return;
  }
  pmStatusApply(st.ent, st.id, st.to, reason);
}

/** 真的去改。其他地方的快捷鈕（通過、送審、完成這個階段、勾選框）也走這裡，紀錄才不會漏。 */
function pmStatusApply(ent, id, to, reason) {
  const cfg = PM_ST[ent];
  const e = cfg && cfg.get(id);
  if (!e) return;
  const why = cfg.block ? cfg.block(e, to) : '';
  if (why) return toast(esc(why));
  const from = cfg.show ? cfg.show(e)[0] : pmStOpt(cfg, e, cfg.cur(e))[1];
  const toLabel = pmStOpt(cfg, e, to)[1];
  const name = cfg.label(e);
  const pid = cfg.pid(e);
  pmPopClose();
  commit('update', cfg.name, name, () => {
    const eff = cfg.set(e, to, reason) || [];
    if (cfg.plain) return eff;
    pmStatusRecord(pid, { kind: cfg.name, ent, ref: id, name, from, to: toLabel, reason: reason || '' });
    return [`狀態 <b>${esc(from)}</b> → <b>${esc(toLabel)}</b>${reason ? '｜' + esc(pmCut(reason, 60)) : ''}`, ...eff];
  });
}

doc.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !pmPopOpen()) return;
  e.preventDefault();
  e.stopPropagation();
  pmPopClose();
}, { capture: true, signal: controller.signal });

/* ---------- 行內新增 ---------- */

/** 打一行字、按 Enter 就建立；建完游標留在原地，可以連續加。 */
function pmQuickInput(kind, parentId, placeholder) {
  const key = kind + ':' + (parentId || 'root');
  return `<div class="pm-quick">${svg('plus', 12)}<input type="text" data-pmq="${key}" aria-label="${esc(placeholder)}" placeholder="${esc(placeholder)}" onkeydown="pmQuickKey(event,'${kind}','${parentId || ''}')"></div>`;
}

function pmQuickKey(e, kind, parentId) {
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  const title = String(e.target.value || '').trim();
  if (!title) return;
  const p = P(S.proj);
  if (!p) return;
  const key = kind + ':' + (parentId || 'root');
  runtime._afterRender = () => {
    const again = root.querySelector(`[data-pmq="${key}"]`);
    if (again) again.focus();
  };
  if (kind === 'ms') {
    return commit('create', '里程碑', title, () => {
      DB.milestones.push({ id: nid('MS'), projectId: p.id, derivedFrom: '', author: DB.me, title, dueOn: '', accept: '', phaseId: parentId || '', state: 'open', folderId: '', remind: '前 3 日' });
      return ['日期待補，暫不進日曆'];
    });
  }
  commit('create', 'TODO', title, () => {
    DB.issues.unshift({
      id: nid('ISS'), t: title, p: p.id, owner: DB.me, size: 'M', pri: 3, st: 'Todo', created: TODAY, started: '', done: '',
      blocker: '', exp: '', ev: 0, rel: [], cf: {}, sub: [], due: '', kind: 'TODO', msId: parentId || '', reviewer: '',
      reviewResult: '', reviewNote: '', reviewedAt: 0
    });
    return [`專案工作數 → <b>${pmTasks(p.id).length}</b>`];
  });
}

/* ---------- 範本初始化 ---------- */

/** 里程碑序列來自 0_工作區 裡真的出現過的專案（MIG 盤點 §3.2），不是憑空設計。 */
const PM_TEMPLATES = {
  website: ['網站建置', [['CONTRACT', 'M01 需求書確認'], ['CONTRACT', 'M02 需求書回簽／首期款'], ['EXECUTION', 'M03 訪談對焦'], ['EXECUTION', 'M04 文案與素材到齊'], ['EXECUTION', 'M05 設計稿'], ['EXECUTION', 'M06 前端開發'], ['EXECUTION', 'M07 部署與 SEO'], ['ACCEPTANCE', 'M08 驗收／尾款'], ['CLOSING', 'M09 一年維護起算']]],
  ai: ['AI 系統導入', [['PROPOSAL', 'M01 需求訪談'], ['PROPOSAL', 'M02 範圍與邊界文件'], ['CONTRACT', 'M03 報價／合約'], ['EXECUTION', 'M04 原型'], ['EXECUTION', 'M05 單流程跑通'], ['EXECUTION', 'M06 教育訓練與導入'], ['ACCEPTANCE', 'M07 驗收'], ['CLOSING', 'M08 保固期滿'], ['CLOSING', 'M09 維護綁約期滿']]],
  marketing: ['行銷服務', [['CONTRACT', 'M01 追蹤校正'], ['EXECUTION', 'M02 第一月報告'], ['EXECUTION', 'M03 第二月報告'], ['ACCEPTANCE', 'M04 第三月報告與期末檢視'], ['CLOSING', 'M05 續期決策']]],
  consulting: ['顧問／規格交付', [['PROPOSAL', 'M01 訪談'], ['EXECUTION', 'M02 規格書草稿'], ['EXECUTION', 'M03 說明會'], ['EXECUTION', 'M04 一次修訂'], ['ACCEPTANCE', 'M05 驗收']]],
  grant: ['補助／合規申請', [['PROPOSAL', 'M01 需求盤點'], ['EXECUTION', 'M02 文件清單建立'], ['EXECUTION', 'M03 文件備齊'], ['EXECUTION', 'M04 送件'], ['ACCEPTANCE', 'M05 審查回覆'], ['CLOSING', 'M06 核定']]],
  internal: ['內部產品線', [['EXECUTION', 'Phase 1 驗證期'], ['EXECUTION', 'Phase 2 MVP 上線'], ['EXECUTION', 'Phase 3 成長期']]],
  blank: ['空白（只建五個階段）', []]
};

function pmInitForm() {
  const p = P(S.proj);
  if (!p) return;
  if (pmCycles(p.id).length) return formPmCycle();
  const start = /^\d{4}-\d{2}-\d{2}$/.test(p.start || '') ? p.start : TODAY;
  openForm({
    crumb: p.id,
    title: '用範本初始化',
    sub: '一次建好第一期、五個階段與這類案子常見的里程碑；建完每一項都可以改、可以刪',
    fields: [
      { k: 'tpl', label: '範本', type: 'chips', req: true, opts: Object.keys(PM_TEMPLATES).map(k => [k, PM_TEMPLATES[k][0]]), hint: '里程碑先不排日期（日期待補），不會出現在日曆上' },
      { k: 'startOn', label: '這一期開始', type: 'date', req: true, half: true },
      { k: 'endOn', label: '這一期結束', type: 'date', req: true, half: true }
    ],
    values: { tpl: 'website', startOn: start, endOn: dadd(start, 89) },
    effects: ['計劃分頁出現第一期、五個階段與里程碑', '階段同時出現在營運 · 甘特'],
    onSave: v => {
      if (v.endOn < v.startOn) throw Error('結束日不能早於開始日');
      const tpl = PM_TEMPLATES[v.tpl] || PM_TEMPLATES.blank;
      const cid = nid('CYC');
      commit('create', '期', '一期（' + tpl[0] + '）', () => {
        DB.phaseCycles.push({ id: cid, projectId: p.id, ordinal: 1, title: '', contractId: '', startOn: v.startOn, endOn: v.endOn, status: p.status === '商機' ? 'PLANNED' : 'ACTIVE', note: '' });
        const byKind = {};
        pmSplitStages(PM_STAGE_PLANS.five, v.startOn, v.endOn).forEach((s, i) => {
          const id = nid('PH');
          byKind[s.kind] = id;
          DB.phases.push({ id, projectId: p.id, phase: PM_STAGE_PHASE[s.kind], label: PM_STAGE[s.kind], startOn: s.startOn, endOn: s.endOn, cycleId: cid, ordinal: i + 1, stageKind: s.kind });
        });
        tpl[1].forEach(([kind, title]) => DB.milestones.push({
          id: nid('MS'), projectId: p.id, derivedFrom: '', author: DB.me, title, dueOn: '', accept: '', phaseId: byKind[kind] || '', state: 'open', folderId: '', remind: '前 3 日'
        }));
        return [`建立一期、<b>5</b> 個階段、<b>${tpl[1].length}</b> 個里程碑`, '日期依起訖先排了一版，里程碑日期待補'];
      });
      pmGo('plan', 'tree');
    }
  });
}

/* ---------- 計劃 › 工作：一張清單，可換分組 ---------- */
const PM_WORK_GROUPS = [['owner', '負責人'], ['status', '狀態'], ['ms', '里程碑']];

function pmWorkState() {
  if (!S.pmWork) S.pmWork = { group: 'owner', scope: 'open' };
  return S.pmWork;
}
function pmWorkSet(key, value) {
  pmWorkState()[key] = value;
  render();
}

PMV.work = function (p) {
  if (!p) return '';
  const st = pmWorkState();
  const all = pmTasks(p.id);
  const list = st.scope === 'all' ? all : all.filter(t => t.st !== 'Done');
  const seg = (key, opts) => `<div class="pm-tseg" role="tablist">${opts.map(o =>
    `<button type="button" role="tab" aria-selected="${st[key] === o[0]}" class="${st[key] === o[0] ? 'on' : ''}" onclick="pmWorkSet('${key}','${o[0]}')">${o[1]}</button>`).join('')}</div>`;

  let groups;
  if (st.group === 'status') {
    groups = ['Doing', 'Review', 'Todo', 'Done'].map(k => ({ head: `<span class="pm-st ${PM_TASK_TONE[k] === 'good' ? 'off' : PM_TASK_TONE[k]}">${PM_TASK_ST[k]}</span>`, rows: list.filter(t => (PM_TASK_ST[t.st] ? t.st : 'Todo') === k) }));
  } else if (st.group === 'ms') {
    const ms = pmMilestones(p.id);
    groups = [
      ...ms.map(m => ({ head: `<b>${esc(m.title)}</b>`, rows: list.filter(t => t.msId === m.id) })),
      { head: '<b>未掛里程碑</b>', rows: list.filter(t => !t.msId || !ms.some(m => m.id === t.msId)) }
    ];
  } else {
    groups = [
      ...Object.keys(DB.people).map(k => ({ head: `${pmAv(k)}<b>${esc(DB.people[k].n)}</b>`, rows: list.filter(t => t.owner === k), keep: true })),
      { head: '<b>未指派</b>', rows: list.filter(t => !DB.people[t.owner]) }
    ];
  }
  const body = groups.filter(g => g.rows.length || g.keep).map(g => `<section class="pm-wk-g">
      <h3 class="pm-wk-h">${g.head}<i>${g.rows.length}</i></h3>
      ${g.rows.length ? g.rows.map(t => pmTaskRow(t, { ms: st.group !== 'ms' })).join('') : '<div class="pm-pl-none">沒有' + (st.scope === 'all' ? '' : '未完成的') + '任務</div>'}
    </section>`).join('');

  return `<div class="pm-bar pm-wk-bar">
      <span class="pm-dim">分組</span>${seg('group', PM_WORK_GROUPS)}
      <span class="pm-sp"></span>
      ${seg('scope', [['open', '未完成'], ['all', '全部']])}
      <span class="pm-tcount">${list.length} / ${all.length}</span>
    </div>
    ${pmQuickInput('task', '', '新增任務，Enter 建立（負責人是你）')}
    <div data-pm-surface="primary">${body || pmEmpty('這個專案還沒有任務。在上面打一行字、按 Enter 就建立一件。')}</div>`;
};
