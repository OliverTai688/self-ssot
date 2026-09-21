/* ==================================================================
   time_spine 接點（PLN-073 T1 · 契約見 ARC-041）

   這個檔案不新增畫面，只把原本散在三個模組裡的三條關聯收成一個入口：
     1. 專案總覽「本專案的關鍵時間」   原本 DB.events.filter(e=>e.link===p.id)
     2. 時間線日曆的工作到期日         原本 DB.issues.filter(x=>(x.due||x.done)===ds)
     3. 時間線清單的層級篩選           原本 DB.events.filter(e=>!filt||e.layer===filt)

   純邏輯在 @/lib/ui-data/yuanzhan/operating-spine（可被 node 測試腳本單獨跑），
   這裡只做 DB ↔ 純函式的接線，以及回傳「原始紀錄」給既有的渲染碼，
   確保 T1 的畫面輸出與改寫前逐字相同。
   ================================================================== */

const SPINE_LAYER_TRACK = { 專案: 'project', 日常: 'rhythm', 行政: 'occasion' };

/** 涵蓋整個 store 的查詢區間；節奏展開有成本，所以呼叫端都會再帶 refTypes 剪枝。 */
function spineBounds() {
  let lo = TODAY,
    hi = TODAY;
  const push = d => {
    if (!d || typeof d !== 'string' || d.length < 10) return;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  };
  (DB.events || []).forEach(e => push(e.d));
  (DB.issues || []).forEach(i => {
    push(i.due);
    push(i.done);
  });
  (DB.milestones || []).forEach(m => push(m.dueOn));
  (DB.occasions || []).forEach(o => {
    push(o.onDate);
    push(o.endOn);
  });
  (DB.rhythms || []).forEach(r => push(r.dtstart));
  (DB.sessions || []).forEach(s => {
    push(s.occurrenceDate);
    push(s.movedTo);
  });
  return { from: spineAddDays(lo, -400), to: spineAddDays(hi, 400) };
}

/** 三軌是否已經有資料（遷移完成）。 */
function opTracksReady() {
  return (
    (DB.milestones || []).length + (DB.rhythms || []).length + (DB.occasions || []).length > 0
  );
}

/**
 * 主查詢。
 * 沒有指定 refTypes 且三軌已經有資料時，**只讀三軌** —— legacy DB.events 仍保留
 * 給 legacy 模式渲染，但不再被算進同一份結果，避免同一件事被數兩次（OPS-T20）。
 * 需要 legacy 視角的呼叫端（spineEvents / spineForProject）一律明確帶 refTypes。
 */
function spine(from, to, filters) {
  const f = filters || {};
  const scoped = !f.refTypes && opTracksReady() ? { ...f, refTypes: TRACK_REF_TYPES } : f;
  return buildSpine(DB, { from, to }, TODAY, scoped);
}

function spineAll(filters) {
  const b = spineBounds();
  return buildSpine(DB, b, TODAY, filters);
}

/** 時間線清單：依層級取事件，回傳原始 event 物件（渲染碼不必改）。 */
function spineEvents(layer) {
  const byId = new Map((DB.events || []).map(e => [e.id, e]));
  const tracks = layer ? [SPINE_LAYER_TRACK[layer]] : undefined;
  return spineAll({ refTypes: ['event'], tracks })
    .filter(i => !layer || (byId.get(i.refId) || {}).layer === layer)
    .map(i => byId.get(i.refId))
    .filter(Boolean);
}

/** 日曆格：某一天到期或完成的工作，回傳原始 issue 物件。 */
function spineTasksOn(ds) {
  const byId = new Map((DB.issues || []).map(i => [i.id, i]));
  return spine(ds, ds, { refTypes: ['task'] })
    .map(i => byId.get(i.refId))
    .filter(Boolean);
}

/** 專案總覽「本專案的關鍵時間」：屬於這個專案的時間節點，回傳原始 event 物件。 */
function spineForProject(pid) {
  const byId = new Map((DB.events || []).map(e => [e.id, e]));
  return spineAll({ refTypes: ['event'], projectIds: [pid] })
    .map(i => byId.get(i.refId))
    .filter(Boolean)
    .filter(e => e.link === pid);
}
