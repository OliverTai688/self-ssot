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

  const payloadBytes = JSON.stringify(changes).length;
  if (payloadBytes > OP_MAX_BYTES) {
    // 幾乎一定是有 bytes 混進了某個欄位。檔案要走 R2，不是走這條。
    opSetStatus('error', '這次變更過大（' + Math.round(payloadBytes / 1024) + ' KB），未送出');
    return;
  }

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
      // 佇列刻意不清空：裡面是還沒被接受的編輯，丟掉等於替使用者放棄他剛打的字。
      opSetStatus('conflict', '另一個裝置先改了同一批紀錄。這裡有 ' + OP_QUEUE.length + ' 筆尚未保存，請重新整理後重做');
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

/**
 * 保存狀態要看得見，否則「沒存到」只能等下次重整才發現。
 *
 * 徽章由這裡自己建立而不是改原型的 shell：shell 是凍結的生成物，
 * 為了一個狀態指示去加一條 source patch 不划算，而且那條 patch 會在原型更新時斷掉。
 */
function opStatusBadge() {
  let el = root.querySelector('#opSaveState');
  if (el) return el;

  el = doc.createElement('div');
  el.id = 'opSaveState';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = [
    'position:absolute', 'right:14px', 'bottom:14px', 'z-index:60',
    'display:none', 'align-items:center', 'gap:6px',
    'padding:6px 10px', 'border-radius:8px',
    'font-size:12px', 'line-height:1.4',
    'border:1px solid var(--line, #2a313b)',
    'background:var(--surface-2, #161a20)',
    'color:var(--text-2, #99a2af)',
    'box-shadow:0 2px 8px rgba(0,0,0,.25)'
  ].join(';');
  root.appendChild(el);
  return el;
}

function opPaintStatus() {
  if (!OP_LIVE) return;
  const el = opStatusBadge();

  const text = {
    idle: '已保存',
    sending: '保存中…',
    error: '未保存',
    conflict: '有衝突',
    stale: '有新變更'
  }[OP_STATUS] || '';

  el.textContent = OP_STATUS_NOTE ? text + '：' + OP_STATUS_NOTE : text;
  el.dataset.state = OP_STATUS;
  el.style.color =
    OP_STATUS === 'error' ? 'var(--st-crit, #d03b3b)' :
    OP_STATUS === 'conflict' || OP_STATUS === 'stale' ? 'var(--st-warn, #fab219)' :
    'var(--text-2, #99a2af)';
  el.style.display = OP_STATUS === 'idle' && !OP_QUEUE.length ? 'none' : 'inline-flex';
}

/**
 * 另一個席位改了東西時，這一頁不會自己知道。
 *
 * 完整的 refetch-and-merge 還沒做（會動到整個 store 的替換與未送出內容的保護），
 * 所以先做到「看得出來」：回到這個分頁時比對伺服器版本，落後就提示。
 * 這比靜靜地讓兩份資料分岔好，也比自動覆蓋安全。
 */
async function opCheckRemoteVersion() {
  if (!OP_LIVE || OP_SENDING) return;
  try {
    const res = await fetch(OPERATING_COMMANDS_ENDPOINT);
    if (!res.ok) return;
    const payload = await res.json();
    if (typeof payload.version === 'number' && payload.version > OP_VERSION) {
      await opMergeRemote();
    }
  } catch {
    /* 離線時不打擾；下一次回到分頁再看 */
  }
}

/** 佇列裡還沒被接受的列：合併時這些一律以本地為準。 */
function opPendingKeys() {
  const pending = new Set();
  for (const command of OP_QUEUE) {
    for (const change of command.changes) pending.add(change.collection + '\u0000' + change.id);
  }
  return pending;
}

/**
 * 逐列合併，而不是整份替換。
 *
 * 整份替換會把「已經打了但還沒送出」的編輯連同舊資料一起蓋掉 —— 那是使用者
 * 最無法接受的一種資料遺失，因為他明明看著畫面上有。所以：佇列裡有的那幾列
 * 保留本地版本，其餘採用伺服器版本。粒度是列，不是集合，也不是整個 store。
 */
async function opMergeRemote() {
  const pending = opPendingKeys();
  let payload;
  try {
    const res = await fetch('/api/company/operating/store');
    if (!res.ok) return;
    payload = await res.json();
  } catch {
    return;
  }
  if (!payload || !payload.store) return;

  let merged = 0;
  let kept = 0;

  for (const [collection, incoming] of Object.entries(payload.store)) {
    if (!OP_WRITE_ENABLED.includes(collection)) continue;

    if (Array.isArray(incoming)) {
      const local = Array.isArray(DB[collection]) ? DB[collection] : [];
      const localById = new Map();
      for (const row of local) {
        const id = identifyRow(collection, row);
        if (id) localById.set(id, row);
      }
      const next = [];
      for (const row of incoming) {
        const id = identifyRow(collection, row);
        const key = collection + '\u0000' + id;
        if (id && pending.has(key)) { next.push(localById.get(id) ?? row); kept += 1; }
        else { next.push(row); merged += 1; }
      }
      // 伺服器沒有、但本地還沒送出的列要留著，否則它會在眼前消失。
      for (const [id, row] of localById) {
        const key = collection + '\u0000' + id;
        if (pending.has(key) && !incoming.some(r => identifyRow(collection, r) === id)) {
          next.push(row); kept += 1;
        }
      }
      DB[collection] = next;
      continue;
    }

    if (incoming && typeof incoming === 'object') {
      const local = DB[collection] && typeof DB[collection] === 'object' ? DB[collection] : {};
      const next = {};
      for (const [key, row] of Object.entries(incoming)) {
        const pendingKey = collection + '\u0000' + key;
        if (pending.has(pendingKey) && local[key] !== undefined) { next[key] = local[key]; kept += 1; }
        else { next[key] = row; merged += 1; }
      }
      for (const [key, row] of Object.entries(local)) {
        if (pending.has(collection + '\u0000' + key) && next[key] === undefined) { next[key] = row; kept += 1; }
      }
      DB[collection] = next;
    }
  }

  OP_VERSION = typeof payload.version === 'number' ? payload.version : OP_VERSION;
  OP_BASELINE = snapshotCollections(DB, OP_WRITE_ENABLED);
  render();

  if (kept) opSetStatus('conflict', '已取得其他裝置的更新；你有 ' + kept + ' 筆尚未保存的編輯被保留');
  else opSetStatus(OP_QUEUE.length ? 'sending' : 'idle', merged ? '已同步其他裝置的更新' : '');
}

// 先取一次伺服器版本，否則第一次送出就會撞 409（本地從 0 起算，伺服器不一定）。
// 取不到就維持 0：那樣第一次送出會收到 409 並顯示衝突，比靜默覆寫安全。
if (OP_LIVE) {
  OP_BASELINE = opSnapshot();
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') opCheckRemoteVersion();
  }, { signal: controller.signal });
  fetch(OPERATING_COMMANDS_ENDPOINT)
    .then(res => (res.ok ? res.json() : null))
    .then(payload => {
      if (payload && typeof payload.version === 'number') OP_VERSION = payload.version;
    })
    .catch(() => {});
}
