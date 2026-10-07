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
 * commit() 與日誌自動保存都是「與基準線比對」，共用同一個 diff 與同一個佇列。
 * commit() 另外傳進來的前後快照只用來判斷有沒有開 database 模式 —— 拿它當比對
 * 起點會漏掉 apply() 之前就改好的列（見 opEnqueue）。
 */
let OP_BASELINE = null;
let OP_TOUCH_TIMER = null;

/**
 * 啟動時的版本對齊。OP_VERSION 從 0 起算而伺服器上的值不會是 0，所以這一步
 * 沒完成就送出，第一批必定撞 409 —— 而那個 409 看起來會像「另一個裝置先改了」，
 * 實際上只是本地還不知道版本號。opFlush() 因此先等這個 promise。
 */
let OP_READY = null;
/** 這一輪撞版本後已經重試過幾次；重試一次就夠，再撞才是真的有人同時在寫。 */
let OP_CONFLICT_RETRY = 0;
let OP_RESYNC_PENDING = false;

/**
 * 比對用的那一本日誌，永遠是登入者自己在圓展空間的那一本。
 *
 * DB.journal 不是欄位，是 getter：它依「目前在哪個空間、正在看誰」回傳不同的本子
 * （個人空間是另一本；回顧頁跳到對方那一天時是對方那一本）。直接拿它去比對，切一次
 * 空間就等於告訴伺服器「原本那幾天全部不見了」—— 2026-10-06 正式站就是這樣被一筆
 * 自動保存刪掉五天的日誌。伺服器那一頭只認登入者（profileId），所以比對也只能認
 * 同一本，與畫面此刻停在哪裡無關。
 *
 * 席位在載入時記下來，不跟著 DB.me 走：切換視角改的是畫面，不是登入的人。
 */
const OP_SEAT = DB.me;

function opOwnJournal() {
  const team = DB.journalBooks && DB.journalBooks.team;
  if (!team) return DB.journal;
  if (!team[OP_SEAT]) team[OP_SEAT] = {};
  return team[OP_SEAT];
}

/** 合併伺服器現況時的讀寫也走同一本，否則人在個人空間時會把團隊日誌併進私人那一本。 */
function opRead(collection) {
  return collection === 'journal' ? opOwnJournal() : DB[collection];
}

function opWrite(collection, value) {
  const team = DB.journalBooks && DB.journalBooks.team;
  if (collection === 'journal' && team) team[OP_SEAT] = value;
  else DB[collection] = value;
}

function opSnap() {
  return snapshotCollections(
    Object.create(DB, { journal: { value: opOwnJournal(), enumerable: true } }),
    OP_WRITE_ENABLED
  );
}

function opSnapshot() {
  return OP_LIVE ? opSnap() : null;
}

/** 一天的日誌有沒有寫東西：有字的行，或嵌了物件。解析不了就當作有，寧可多擋。 */
function opJournalDayHasContent(json) {
  if (typeof json !== 'string') return false;
  try {
    const row = JSON.parse(json);
    return Array.isArray(row && row.blocks)
      && row.blocks.some(b => b && (b.t === 'obj' || String(b.text || '').trim()));
  } catch {
    return true;
  }
}

/** 被攔下的整天刪除。留到重新整理為止，否則下一次成功保存就會把警告蓋成「已保存」。 */
let OP_HELD_NOTE = '';

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

  // 比對的起點是滾動基準線，不是 commit() 傳進來的那份「之前」。
  //
  // 「之前」只涵蓋 apply() 這一段；在它之前就改好的列（先改資料才呼叫 commit、
  // 看過就標已讀、還沒輪到自動保存的打字）不在這段差異裡。而佇列一推進，下面就把
  // 基準線設成現況 —— 那些列於是落進基準線，之後再也比不出來，永遠不會被保存。
  // 2026-10-07 正式站的決策卡就是這樣：選了選項，送出的「請求回覆」命令裡只有
  // stampAuthors() 順手改到的 projects／txns，請求那一列不在裡面，重新整理後決定不見。
  // 從基準線比起，「推進基準線」與「送出差異」涵蓋的就是同一段，不會有列掉在中間。
  const from = OP_BASELINE || before;

  let changes;
  try {
    changes = diffCollections(from, opSnap());
  } catch (err) {
    console.error('[operating] diff failed', err);
    return;
  }

  // 有內容的一天不會被「整天刪除」：畫面上沒有這個操作（唯一的 delete 是復原剛新增的
  // 空白日期）。比對出這種變更，只可能是比對的對象錯了，送出去就是資料遺失 ——
  // 攔下來不送，其餘照常；伺服器端有同一道檢查（applyJournal）。
  const held = changes.filter(c => c.collection === 'journal' && c.op === 'delete'
    && opJournalDayHasContent((from.journal || {})[c.id]));
  if (held.length) {
    changes = changes.filter(c => !held.includes(c));
    console.error('[operating] refused to delete journal days that have content', held.map(c => c.id));
    OP_HELD_NOTE = '日誌有 ' + held.length + ' 天被判定為整天刪除，已攔下未送出，伺服器上的內容沒有變。請重新整理';
    // 只把被攔下的那幾天從基準線拿掉，其餘的差異照常往下走。
    if (OP_BASELINE && OP_BASELINE.journal) for (const c of held) delete OP_BASELINE.journal[c.id];
    if (OP_STATUS === 'idle') opSetStatus('idle');
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
  OP_BASELINE = opSnap();
  opFlush();
}

/**
 * 取一次伺服器目前的版本號。回傳有沒有取到 —— 取不到就不能當作「對齊過了」，
 * 否則第一批送出時帶著 0 過去，使用者看到的是衝突而不是「還沒連上」。
 */
function opSyncVersion() {
  OP_READY = fetch(OPERATING_COMMANDS_ENDPOINT)
    .then(res => (res.ok ? res.json() : null))
    .then(payload => {
      if (payload && typeof payload.version === 'number') {
        OP_VERSION = payload.version;
        return true;
      }
      return false;
    })
    .catch(() => false);
  return OP_READY;
}

async function opFlush() {
  if (!OP_LIVE || OP_SENDING || !OP_QUEUE.length) return;
  OP_SENDING = true;
  opSetStatus('sending');

  // 版本沒對齊就送出必定撞 409。等啟動那次，失敗就在這裡再取一次。
  if (OP_READY && (await OP_READY) === false) await opSyncVersion();

  const batch = OP_QUEUE.slice(0, OP_MAX_COMMANDS);

  try {
    const res = await fetch(OPERATING_COMMANDS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseVersion: OP_VERSION, commands: batch })
    });

    if (res.status === 409) {
      const payload = await res.json().catch(() => ({}));
      OP_VERSION = typeof payload.version === 'number' ? payload.version : OP_VERSION;
      // 佇列刻意不清空：裡面是還沒被接受的編輯，丟掉等於替使用者放棄他剛打的字。
      //
      // 版本不合不等於有人在改同一批紀錄：本地的版本號也可能只是落後（啟動時那次
      // GET 失敗、或這一頁重掛過）。所以先把伺服器現況併回來 —— 佇列裡的列保留
      // 本地版本 —— 再用修正後的版本重送一次。只有第二次還撞才是真的並發寫入，
      // 那時才值得停下來問人；先前這裡一撞就停，等於把一筆編輯永久卡在佇列裡，
      // 而畫面只叫人重新整理（重整就是丟掉它）。
      if (OP_CONFLICT_RETRY < 1) {
        OP_CONFLICT_RETRY += 1;
        OP_RESYNC_PENDING = true;
        opSetStatus('sending', '版本落後，正在重新對齊');
        return;
      }
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
    OP_CONFLICT_RETRY = 0;

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
    if (OP_RESYNC_PENDING) {
      OP_RESYNC_PENDING = false;
      // 合併會動到 DB 與基準線，所以要等這一輪的 OP_SENDING 放掉之後才跑。
      opResyncAndFlush();
    } else if (OP_QUEUE.length && OP_STATUS !== 'conflict' && OP_STATUS !== 'error') opFlush();
  }
}

/** 撞到版本衝突之後的復原：併回伺服器現況，再用修正後的版本重送佇列。 */
async function opResyncAndFlush() {
  await opMergeRemote({ quiet: true });
  if (OP_QUEUE.length) opFlush();
}

function opSetStatus(status, note) {
  if (status === 'idle' && OP_HELD_NOTE) {
    status = 'error';
    note = OP_HELD_NOTE;
  }
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
async function opMergeRemote(options) {
  // 重送前的那次合併不畫狀態：這一刻「有未送出的列」是正常的中間狀態，
  // 畫成衝突會讓使用者看到一個下一秒就會消失的警告。
  const quiet = !!(options && options.quiet);
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
      const local = Array.isArray(opRead(collection)) ? opRead(collection) : [];
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
      opWrite(collection, next);
      continue;
    }

    if (incoming && typeof incoming === 'object') {
      const own = opRead(collection);
      const local = own && typeof own === 'object' ? own : {};
      const next = {};
      for (const [key, row] of Object.entries(incoming)) {
        const pendingKey = collection + '\u0000' + key;
        if (pending.has(pendingKey) && local[key] !== undefined) { next[key] = local[key]; kept += 1; }
        else { next[key] = row; merged += 1; }
      }
      for (const [key, row] of Object.entries(local)) {
        if (pending.has(collection + '\u0000' + key) && next[key] === undefined) { next[key] = row; kept += 1; }
      }
      opWrite(collection, next);
    }
  }

  OP_VERSION = typeof payload.version === 'number' ? payload.version : OP_VERSION;
  OP_BASELINE = opSnap();
  render();

  if (quiet) return;
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
  opSyncVersion();
}
