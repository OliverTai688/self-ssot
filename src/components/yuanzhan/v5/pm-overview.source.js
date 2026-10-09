/* ==================================================================
   專案 · 總覽（PLN-075 S3 Wave 3a）

   上半回答「現在長什麼樣」：期階梯 ＋ 跨資源待辦（提案 A）。
   下半回答「發生了什麼」：時間流（提案 B）。

   版面照 ARC-012 五層、ARC-043 的 primitive：一行數字列、水平軌、扁平列、一條線＋節點。
   沒有任何一個區塊是卡片容器（PLN-075 §S1.5 C 的對照表）。
   ================================================================== */

var PMV = PMV || {};

function pmTrackData(p) {
  return pmCycles(p.id).map(c => ({
    no: 'C' + c.ordinal,
    title: pmCycleName(c) + (c.title ? '｜' + c.title : ''),
    meta: [[c.startOn, c.endOn].filter(Boolean).join(' → '), PM_CYCLE_ST[c.status] || ''].filter(Boolean).join(' · '),
    stages: pmStages(c.id).map(ph => ({ key: ph.id, label: ph.label, meta: pmStageMeta(ph), state: pmStageState(ph) }))
  })).filter(c => c.stages.length);
}

/** 跨資源待辦：各資源裡「現在需要人處理」的東西，收成同一張清單。 */
function pmAttention(p) {
  const out = [];
  const tasks = pmTasks(p.id);
  const soon = dadd(TODAY, 7);

  tasks.filter(t => pmIsReview(t) && t.reviewResult === 'IN_REVIEW').forEach(t => out.push({
    key: 'plan:' + t.id, eyebrow: '計劃 · 審核任務', title: t.t,
    summary: '等 ' + pmWho(t.reviewer) + ' 審核' + (t.due ? '，期限 ' + t.due : ''),
    meta: [{ text: '待審', tone: 'warn' }], go: true
  }));
  tasks.filter(t => pmIsReview(t) && t.reviewResult === 'CHANGES_REQUESTED').forEach(t => out.push({
    key: 'plan:' + t.id, eyebrow: '計劃 · 審核任務', title: t.t,
    summary: '退回原因：' + (t.reviewNote || '未填'),
    meta: [{ text: '已退回', tone: 'crit' }], go: true
  }));
  tasks
    .filter(t => !pmIsReview(t) && t.st !== 'Done' && t.due && t.due <= soon)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5)
    .forEach(t => out.push({
      key: 'plan:' + t.id, eyebrow: '計劃 · TODO', title: t.t,
      summary: pmWho(t.owner) + ' · 期限 ' + t.due,
      meta: [t.due < TODAY ? { text: '逾期 ' + ddiff(t.due, TODAY) + ' 日', tone: 'crit' } : { text: t.due.slice(5), tone: '' }], go: true
    }));
  pmMilestones(p.id)
    .filter(m => m.state !== 'done' && m.dueOn && m.dueOn <= soon)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .forEach(m => out.push({
      key: 'plan:' + m.id, eyebrow: '計劃 · 里程碑', title: m.title,
      summary: m.accept ? '驗收方式：' + m.accept : '尚未寫驗收方式',
      meta: [m.dueOn < TODAY ? { text: '逾期 ' + ddiff(m.dueOn, TODAY) + ' 日', tone: 'crit' } : { text: m.dueOn.slice(5), tone: 'pri' }], go: true
    }));

  const unfiled = pmUnfiled(p.id);
  if (unfiled.length) out.push({
    key: 'drive:inbox', eyebrow: '檔案 · 收件匣', title: unfiled.length + ' 個檔案待整理',
    summary: unfiled.slice(0, 3).map(a => a.name).join('、') + (unfiled.length > 3 ? ' …' : ''),
    meta: [{ text: '待整理', tone: 'warn' }], go: true
  });

  const meetings = pmMeetings(p.id);
  meetings.filter(o => o.onDate <= TODAY && !o.recap).forEach(o => out.push({
    key: 'meeting:' + o.id, eyebrow: '會議 · ' + o.onDate, title: o.title,
    summary: '開完了但還沒寫結論',
    meta: [{ text: '缺結論', tone: 'warn' }], go: true
  }));
  const next = meetings.filter(o => o.onDate > TODAY).sort((a, b) => a.onDate.localeCompare(b.onDate))[0];
  if (next) out.push({
    key: 'meeting:' + next.id, eyebrow: '會議 · 下一場', title: next.title,
    summary: [next.onDate, next.at, next.place].filter(Boolean).join(' · '),
    meta: [{ text: ddiff(TODAY, next.onDate) + ' 日後', tone: 'pri' }], go: true
  });
  return out;
}

function pmAttentionPick(key) {
  const at = String(key).indexOf(':');
  const tab = key.slice(0, at), id = key.slice(at + 1);
  if (tab === 'drive') {
    const inbox = pmInbox(S.proj);
    return pmJump('drive', 'tree', '總覽', inbox ? { folder: inbox.id } : null);
  }
  if (tab === 'meeting') return pmJump('meeting', null, '總覽', { meeting: id });
  return pmJump('plan', 'tree', '總覽');
}

/** 五大資源的入口。LINE 本階段不做（OD-H），以停用狀態呈現，不假裝可用。 */
function pmResources(p) {
  const files = pmAssets(p.id).length, unfiled = pmUnfiled(p.id).length;
  const msgs = pmChannels(p.id).reduce((n, c) => n + pmMessages(c.id).length, 0);
  const ms = pmMilestones(p.id);
  const items = [
    ['chat', 'room', 'message', '專案聊天室', msgs ? msgs + ' 則訊息' : '尚未開啟'],
    ['drive', 'tree', 'folder', '雲端硬碟', pmRoot(p.id) ? files + ' 個檔案' + (unfiled ? ' · ' + unfiled + ' 待整理' : '') : '尚未啟用'],
    ['plan', 'tree', 'flag', '專案工作區', pmCycles(p.id).length ? pmCycles(p.id).length + ' 期 · ' + ms.length + ' 里程碑' : '尚未分期'],
    ['meeting', '', 'calendar', '會議資料區', pmMeetings(p.id).length ? pmMeetings(p.id).length + ' 場會議' : '尚無會議']
  ];
  return `<div class="pm-res" role="list">${items.map(i =>
    `<button type="button" role="listitem" class="pm-res-i" onclick="pmJump('${i[0]}','${i[1]}','總覽')">${svg(i[2], 14)}<span class="pm-res-t">${i[3]}</span><span class="pm-res-m">${esc(i[4])}</span></button>`
  ).join('')}<div role="listitem" class="pm-res-i off" aria-disabled="true">${svg('lock', 14)}<span class="pm-res-t">LINE 群導入</span><span class="pm-res-m">本階段未開放</span></div></div>`;
}

/**
 * 時間流。入流規則（提案 B）：一則＝一個對外看得見的事。
 * 單則聊天訊息不進流，對話一天收成一則；同一天的多個上傳收成一組。
 */
function pmFlow(p) {
  const ev = [];
  pmCycles(p.id).forEach(c => {
    if (c.startOn) ev.push({ key: 'plan:' + c.id, d: c.startOn, title: pmCycleName(c) + '啟動' + (c.title ? '｜' + c.title : ''), tone: 'pri' });
  });
  pmMilestones(p.id).filter(m => m.dueOn).forEach(m => ev.push({
    key: 'plan:' + m.id, d: m.dueOn, title: '里程碑 · ' + m.title,
    summary: m.accept || '',
    tone: m.state === 'done' ? 'good' : m.dueOn < TODAY ? 'crit' : 'pri'
  }));
  pmMeetings(p.id).forEach(o => ev.push({
    key: 'meeting:' + o.id, d: o.onDate, title: '會議 · ' + o.title, time: o.at || '',
    summary: o.recap ? '結論：' + pmCut(o.recap, 80) : (o.onDate <= TODAY ? '尚未寫結論' : ''),
    tone: o.onDate <= TODAY && !o.recap ? 'warn' : ''
  }));
  pmTasks(p.id).filter(t => t.st === 'Done' && t.done).forEach(t => ev.push({
    key: 'plan:' + t.id, d: t.done, title: t.t, fold: '完成的工作', tone: 'good'
  }));
  pmAssets(p.id).forEach(a => ev.push({
    key: 'drive:' + (a.folderId || ''), d: a.day || pmDay(a.bornAt), title: a.name, fold: '檔案上傳'
  }));
  pmChannels(p.id).forEach(c => {
    const byDay = {};
    // 狀態變更是一則一件事，不併進「對話 N 則」。
    pmMessages(c.id).filter(m => !pmIsStatusMsg(m)).forEach(m => { const d = pmDay(m.at); (byDay[d] = byDay[d] || []).push(m); });
    Object.keys(byDay).forEach(d => {
      const list = byDay[d], last = list[list.length - 1];
      ev.push({ key: 'chat:' + c.id, d, title: '對話 · ' + c.name + '　' + list.length + ' 則', summary: pmWho(last.w) + '：' + pmCut(last.text, 60) });
    });
  });
  pmStatusLog(p.id).forEach(m => {
    const x = m.meta || {};
    ev.push({
      key: 'chat:' + m.channelId, d: pmDay(m.at), time: pmClock(m.at),
      title: `狀態 · ${x.kind || ''}「${x.name || ''}」 ${x.from || ''} → ${x.to || ''}`,
      summary: [pmWho(m.w), x.reason].filter(Boolean).join('：')
    });
  });
  // 既有的關鍵時間。已經遷成里程碑的那幾筆（同一天、同名）不重複列一次。
  const msKeys = new Set(pmMilestones(p.id).map(m => m.dueOn + '|' + m.title));
  spineForProject(p.id)
    .filter(e => !msKeys.has(e.d + '|' + e.t))
    .forEach(e => ev.push({ key: 'event:' + e.id, d: e.d, title: e.t, summary: e.derived || '' }));
  return ev
    .filter(e => e.d)
    .sort((a, b) => b.d.localeCompare(a.d) || String(a.fold || '').localeCompare(String(b.fold || '')))
    .slice(0, 80);
}

function pmFlowPick(key) {
  const at = String(key).indexOf(':');
  const tab = key.slice(0, at), id = key.slice(at + 1);
  if (tab === 'event') return openDrawer('event', id);
  if (tab === 'drive') return pmJump('drive', 'tree', '總覽', id ? { folder: id } : null);
  if (tab === 'meeting') return pmJump('meeting', null, '總覽', { meeting: id });
  if (tab === 'chat') return pmJump('chat', 'room', '總覽', { channel: id });
  return pmJump('plan', 'tree', '總覽');
}

PMV.overview = function (p) {
  if (!p) return '';
  const tasks = pmTasks(p.id);
  const todo = tasks.filter(t => !pmIsReview(t) && t.st !== 'Done');
  const late = todo.filter(t => t.due && t.due < TODAY).length;
  const reviewing = tasks.filter(t => pmIsReview(t) && t.reviewResult === 'IN_REVIEW').length;
  const ms = pmMilestones(p.id);
  const unfiled = pmUnfiled(p.id).length;
  const cur = pmCurrentStage(p.id);
  const goal = (DB.goals || []).find(g => g.id === p.goal);

  // 剛建好的專案什麼都還沒有：一張設定清單，不排五個各自說「還沒有」的區塊。
  if (pmIsFresh(p)) return pmBrief(p) + pmSetup(p);

  const rail = pmRail([
    { label: '目前階段', value: cur ? pmCycleName(cur.cycle) + ' · ' + cur.stage.label : '未分期', tone: cur && cur.state === 'late' ? 'crit' : '', note: cur && cur.state === 'late' ? '階段已過期，仍有里程碑未達成' : '' },
    { label: '里程碑', value: ms.filter(m => m.state === 'done').length + ' / ' + ms.length },
    { label: '待辦', value: todo.length, tone: late ? 'crit' : '', note: late ? late + ' 件逾期' : '' },
    { label: '待審', value: reviewing, tone: reviewing ? 'warn' : '' },
    { label: '待整理檔案', value: unfiled, tone: unfiled ? 'warn' : '' },
    // 專案財務只有負責人與參與者看得到（與既有總覽、財務分頁同一條規則）。
    isOwner() || can('projectFinance', p.id)
      ? { label: '可分配毛利', value: nt(gross(p.id)), unit: 'NT$' }
      : { label: '可分配毛利', value: '—', note: '限參與者查看' },
    ...(goal ? [{ label: '對齊目標', value: goal.pct + '%', note: goal.t }] : [])
  ], { label: '專案重點數字' });

  const track = pmTrackData(p);
  const trackBlock = pmBlock(
    '期階梯', track.length ? '提案 → 接案 → 執行 → 驗收 → 結案；二期之後執行與驗收各再出現一次' : '',
    track.length
      ? pmTrack(track, { id: 'pmOvTrack', onPick: () => pmJump('plan', 'tree', '總覽') })
      : pmEmpty('這個專案還沒有分期。分期之後，這裡會畫出每一期走到哪個階段。', `<button class="btn pri" onclick="pmJump('plan','tree','總覽')">${svg('plus')} 到計劃建立第一期</button>`),
    track.length ? `<button class="btn sm" onclick="pmJump('plan','tree','總覽')">計劃</button>` : ''
  );

  const attention = pmAttention(p);
  const attentionBlock = pmBlock(
    '跨資源待辦', attention.length ? attention.length + ' 件需要處理' : '',
    pmRows(attention, { id: 'pmOvTodo', onPick: pmAttentionPick, empty: '目前沒有需要處理的事：沒有待審、逾期、待整理或缺結論的項目。' })
  );

  const delivery = p.delivery || [];
  const deliveryBlock = pmBlock(
    '交付標準', delivery.length ? delivery.length + ' 項' : '',
    delivery.length
      ? `<div class="pm-rows">${delivery.map((d, i) => `<div class="pm-row"><div class="pm-row-main pm-row-static"><span class="pm-row-t">${esc(d)}</span></div><div class="pm-row-meta">${mini('trash', `delDelivery('${p.id}',${i})`, 'dgr')}</div></div>`).join('')}</div>`
      : pmEmpty('尚未確認交付標準。沒有交付標準，驗收時就沒有對照的依據。'),
    `<button class="btn sm" onclick="addDelivery('${p.id}')">${svg('plus')} 交付標準</button>`
  );

  const flow = pmFlow(p);
  const flowBlock = pmBlock(
    '時間流', '這個案子到今天為止發生了什麼',
    flow.length
      ? `<div data-pm-surface="primary">${pmTimeline(flow, { id: 'pmOvFlow', onPick: pmFlowPick })}</div>`
      : pmEmpty('還沒有任何事件。里程碑、會議、檔案上傳與對話都會依日期出現在這裡。')
  );

  const log = pmStatusLog(p.id);
  const logBlock = log.length
    ? pmBlock('狀態紀錄', '誰在什麼時候把什麼改成什麼、為什麼',
      `<div class="pm-syslog">${log.slice(0, 6).map(pmStatusLine).join('')}</div>`,
      log.length > 6 ? `<button class="btn sm" onclick="pmJump('chat','room','總覽')">看全部 ${log.length} 筆</button>` : '')
    : '';

  return pmBrief(p) + rail + trackBlock + attentionBlock + logBlock + pmBlock('五大資源', '', pmResources(p)) + deliveryBlock + flowBlock;
};
