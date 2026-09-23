/* ==================================================================
   寫入管線的前端半邊（契約見 ARC-042）

   commit() 是 runtime 唯一的寫入入口，但它改的是記憶體。這裡在它前後各取一次
   快照，比出被改動的「列」，排進佇列送去 BFF —— 送出的是 1–3 列差異，
   不是整包 store（PLN-071 YZLIVE-005 的停止條件）。

   純比對邏輯在 @/lib/ui-data/yuanzhan/operating-commands（node 測試腳本單獨跑），
   這裡只做 DB ↔ 純函式的接線，以及佇列與狀態顯示。
   ================================================================== */

const OP_SOURCE = initialState.dataSource || 'prototype';
const OP_LIVE = OP_SOURCE === 'database';

let OP_VERSION = 0;
let OP_QUEUE = [];
let OP_SENDING = false;
/** idle | sending | error | conflict */
let OP_STATUS = 'idle';
let OP_STATUS_NOTE = '';

/**
 * 滾動基準線：最後一次成功排入佇列時的樣子。
 *
 * commit() 走的是明確的前後快照，日誌自動保存走的是「與基準線比對」——
 * 兩條路徑共用同一個 diff 與同一個佇列，差別只在快照從哪裡來。
 */
let OP_BASELINE = null;
let OP_TOUCH_TIMER = null;

function opSnapshot() {
  return OP_LIVE ? snapshotCollections(DB, OP_WRITE_ENABLED) : null;
}

/**
 * 日誌是連續輸入，不會每個字都觸發 commit()。render() 之後排一個延遲比對，
 * 讓打完字停下來就保存，而不是等到下一次 commit 才順便被帶上去。
 */
function opTouch() {
  if (!OP_LIVE) return;
  if (OP_TOUCH_TIMER) clearTimeout(OP_TOUCH_TIMER);
  OP_TOUCH_TIMER = setTimeout(() => {
    OP_TOUCH_TIMER = null;
    if (!OP_BASELINE) {
      OP_BASELINE = opSnapshot();
      return;
    }
    opEnqueue('update', '日誌', '自動保存', OP_BASELINE);
  }, 1500);
}

function opRef() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * apply() 之後呼叫。沒開 database 就什麼都不做 —— prototype 模式一個網路請求都不發，
 * 那是 ARC-042 §10 的一條驗收。
 */
function opEnqueue(op, ent, label, before) {
  if (!OP_LIVE || !before) return;

  let changes;
  try {
    changes = diffCollections(before, snapshotCollections(DB, OP_WRITE_ENABLED));
  } catch (err) {
    console.error('[operating] diff failed', err);
    return;
  }
  if (!changes.length) return;

  if (changes.length > OP_MAX_CHANGES) {
    // 單次 commit 動了這麼多列，比較可能是比對出錯而不是真的批次操作。
    // 寧可擋下來，也不要把一堆可疑的列送上伺服器。
    opSetStatus('error', '變更筆數異常（' + changes.length + '），未送出');
    return;
  }

  OP_QUEUE.push({ clientRef: opRef(), op, ent, label, changes });
  // 已經排進佇列的內容就是新的基準線，否則下一次比對會把同樣的變更再送一次。
  OP_BASELINE = snapshotCollections(DB, OP_WRITE_ENABLED);
  opFlush();
}

async function opFlush() {
  if (!OP_LIVE || OP_SENDING || !OP_QUEUE.length) return;
  OP_SENDING = true;
  opSetStatus('sending');

  const batch = OP_QUEUE.slice(0, OP_MAX_COMMANDS);

  try {
    const res = await fetch(OPERATING_COMMANDS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseVersion: OP_VERSION, commands: batch })
    });

    if (res.status === 409) {
      // 另一個席位先寫了。保留佇列裡尚未送出的內容，讓人決定，不靜默覆寫。
      const payload = await res.json().catch(() => ({}));
      OP_VERSION = typeof payload.version === 'number' ? payload.version : OP_VERSION;
      opSetStatus('conflict', '另一個裝置已更新這些紀錄，請重新整理後確認');
      return;
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      opSetStatus('error', payload.error || ('保存失敗（HTTP ' + res.status + '）'));
      return;
    }

    const payload = await res.json();
    OP_VERSION = payload.version;
    OP_QUEUE = OP_QUEUE.slice(batch.length);

    if (payload.rejected && payload.rejected.length) {
      const first = payload.rejected[0];
      opSetStatus('error', first.message || '部分變更未被接受');
      return;
    }

    opSetStatus(OP_QUEUE.length ? 'sending' : 'idle');
  } catch (err) {
    // 斷線不丟掉佇列：clientRef 是冪等鍵，重送不會產生第二列。
    opSetStatus('error', '連線中斷，稍後重試');
    console.warn('[operating] command flush failed', err);
  } finally {
    OP_SENDING = false;
    if (OP_QUEUE.length && OP_STATUS !== 'conflict' && OP_STATUS !== 'error') opFlush();
  }
}

function opSetStatus(status, note) {
  OP_STATUS = status;
  OP_STATUS_NOTE = note || '';
  opPaintStatus();
}

/** 保存狀態要看得見，否則「沒存到」只能等下次重整才發現。 */
function opPaintStatus() {
  if (!OP_LIVE) return;
  const el = getById('opSaveState');
  if (!el) return;

  const text = {
    idle: '已保存',
    sending: '保存中…',
    error: '未保存',
    conflict: '有衝突'
  }[OP_STATUS] || '';

  el.textContent = OP_STATUS_NOTE ? text + '：' + OP_STATUS_NOTE : text;
  el.dataset.state = OP_STATUS;
  el.style.display = OP_STATUS === 'idle' && !OP_QUEUE.length ? 'none' : 'inline-flex';
}

// 先取一次伺服器版本，否則第一次送出就會撞 409（本地從 0 起算，伺服器不一定）。
// 取不到就維持 0：那樣第一次送出會收到 409 並顯示衝突，比靜默覆寫安全。
if (OP_LIVE) {
  OP_BASELINE = opSnapshot();
  fetch(OPERATING_COMMANDS_ENDPOINT)
    .then(res => (res.ok ? res.json() : null))
    .then(payload => {
      if (payload && typeof payload.version === 'number') OP_VERSION = payload.version;
    })
    .catch(() => {});
}
