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
 * 取基準線之前，先把 runtime 自己會補的欄位補齊。
 *
 * commit() 每次都會跑 stampAuthors() 與 recalcLedger()：前者替沒有作者的列蓋上作者、
 * 替交易編 ledgerRow，後者替有公式的交易寫上 formulaError 並重算金額。伺服器讀回來的列
 * 沒有這些欄位（它們不是資料，是畫面用的衍生值），所以基準線若在補齊之前取，下一次
 * commit 就會把「補上這些欄位」比成一筆變更，跟著那一筆命令一起送出去。
 *
 * 內容其實沒有變，伺服器收到後寫回同樣的值 —— 但命令紀錄上那一筆行內留言就此變成
 * 「動了 txns、高風險」，稽核軌跡裡的帳務變更於是跟留言分不開。2026-10-07 之前有 29 筆
 * 非帳務命令被這樣標成高風險：每一頁載入後的第一筆 commit 帶到有公式的那筆交易，
 * 每一次併回伺服器現況後的第一筆則是所有專案（作者被重蓋）。
 *
 * 兩個函式都是冪等的，重複呼叫不會再改任何東西。
 */
function opSettle() {
  try {
    stampAuthors();
    recalcLedger();
  } catch (err) {
    console.warn('[operating] settle before baseline failed', err);
  }
}

/**
 * commit() 的第一條下游影響，去掉標記後就是稽核軌跡上的「改了什麼」。
 *
 * 那句話是給「資料流」用的 HTML 片段：會有 <b>，使用者打的字是 esc() 過的。存進稽核的
 * 是純文字，所以標記拿掉、實體還原（抽屜顯示時會再 esc 一次，不還原就會出現 &amp;lt;）。
 */
const OP_ENTITY = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&' };
function opDetail(eff) {
  const first = Array.isArray(eff) && eff.length ? String(eff[0] == null ? '' : eff[0]) : '';
  return first
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:lt|gt|quot|#39|amp);/g, m => OP_ENTITY[m])
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
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
      opSettle();
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
function opEnqueue(op, ent, label, before, detail) {
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

  const command = { clientRef: opRef(), op, ent, label, changes };
  // 沒有這句話就不帶欄位（自動保存就是這樣），伺服器存成 NULL 而不是空字串。
  if (detail) command.detail = detail;
  OP_QUEUE.push(command);
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
  // 剛換進來的列是伺服器的原樣，沒有衍生欄位；先補齊再當基準線（見 opSettle）。
  opSettle();
  OP_BASELINE = opSnap();
  render();

  if (quiet) return;
  if (kept) opSetStatus('conflict', '已取得其他裝置的更新；你有 ' + kept + ' 筆尚未保存的編輯被保留');
  else opSetStatus(OP_QUEUE.length ? 'sending' : 'idle', merged ? '已同步其他裝置的更新' : '');
}

// 先取一次伺服器版本，否則第一次送出就會撞 409（本地從 0 起算，伺服器不一定）。
// 取不到就維持 0：那樣第一次送出會收到 409 並顯示衝突，比靜默覆寫安全。
if (OP_LIVE) {
  opSettle();
  OP_BASELINE = opSnapshot();
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') opCheckRemoteVersion();
  }, { signal: controller.signal });
  opSyncVersion();
}

/* ==================================================================
   稽核軌跡抽屜的資料來源

   原型的抽屜讀 DB.audit —— commit() 順手塞進記憶體的一個陣列。那在示例模式夠用，
   在正式模式是錯的：重新整理就清空、看不到另一個席位做了什麼、上限 400 筆，
   而抽屜自己寫著「不可刪除」。伺服器其實每一筆命令都有留（operating_command_logs），
   只是沒有人讀。database 模式下抽屜改讀那一份；示例模式維持原樣，並且照實說它不持久。

   開抽屜才取、每次開都重取：稽核要看的是「現在伺服器上有什麼」，不是這一頁記得什麼。
   ================================================================== */

const OP_AUDIT_ENDPOINT = '/api/company/operating/audit';
/** idle | loading | ready | error */
let OP_AUDIT = { state: 'idle', rows: [], total: 0, autosaveTotal: 0, nextBefore: null, autosave: false, note: '' };
let OP_AUDIT_SEQ = 0;

function opAuditOpen() {
  const top = S.stack[S.stack.length - 1];
  return !!top && top.type === 'audit' && root.querySelector('#drawer.on');
}

async function opAuditLoad(more) {
  if (!OP_LIVE) return;
  const seq = ++OP_AUDIT_SEQ;
  const before = more ? OP_AUDIT.nextBefore : null;
  OP_AUDIT = more
    ? { ...OP_AUDIT, state: 'loading', note: '' }
    : { ...OP_AUDIT, state: 'loading', rows: [], nextBefore: null, note: '' };
  if (opAuditOpen()) paintDrawer();

  let next;
  try {
    const query = [];
    if (OP_AUDIT.autosave) query.push('autosave=1');
    if (before) query.push('before=' + encodeURIComponent(before));
    const res = await fetch(OP_AUDIT_ENDPOINT + (query.length ? '?' + query.join('&') : ''));
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || ('讀取失敗（HTTP ' + res.status + '）'));
    next = {
      ...OP_AUDIT,
      state: 'ready',
      rows: more ? OP_AUDIT.rows.concat(payload.rows || []) : (payload.rows || []),
      total: payload.total || 0,
      autosaveTotal: payload.autosaveTotal || 0,
      nextBefore: payload.nextBefore || null,
      note: ''
    };
  } catch (err) {
    next = { ...OP_AUDIT, state: 'error', note: (err && err.message) || '讀取失敗' };
  }
  // 連按「顯示自動保存」時，較早的那一次回來得比較晚 —— 只認最後發出的那一次。
  if (seq !== OP_AUDIT_SEQ) return;
  OP_AUDIT = next;
  if (opAuditOpen()) paintDrawer();
}

/** 失敗的是「載入更早的」就接著往下取；失敗的是第一頁就從頭來。 */
function opAuditRetry() {
  opAuditLoad(OP_AUDIT.rows.length > 0 && !!OP_AUDIT.nextBefore);
}

function opAuditToggleAutosave() {
  OP_AUDIT.autosave = !OP_AUDIT.autosave;
  opAuditLoad(false);
}

/** 伺服器給的是 UTC；稽核要對得上使用者記得的時刻，所以顯示成這台裝置的當地時間。 */
function opAuditStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

const OP_AUDIT_VERB = { create: '新增', update: '更新', delete: '刪除' };

function opAuditRowHtml(x) {
  // 2026-10-07 之前的列沒有「改了什麼」，退回動作本身，不留一行空白也不編內容。
  const what = x.detail || (OP_AUDIT_VERB[x.op] || x.op);
  return `<div class="aud"><span class="who">${esc(x.actor ? person(x.actor) : '—')}</span>
    <div class="bd"><div>${esc(x.entity)}　<b style="color:var(--text)">${esc(x.label)}</b></div>
      <div class="df"><span class="n">${esc(what)}</span></div></div>
    <span class="ts">${esc(opAuditStamp(x.at))}</span></div>`;
}

const opAuditPrototypeDrawer = DRAWERS.audit;
DRAWERS.audit = () => {
  if (!OP_LIVE) {
    // 示例模式：內容照舊，但不再宣稱它是不可刪除的紀錄。
    const base = opAuditPrototypeDrawer();
    return {
      ...base,
      sub: `${DB.audit.length} 筆 · 僅本頁`,
      foot: `<div class="note" style="padding:0 2px">這是介面示例：稽核紀錄只存在這次瀏覽的記憶體裡，<b>重新整理就會清空</b>。正式模式下每一筆變更都會留在伺服器，不能清空。</div>`
    };
  }

  const a = OP_AUDIT;
  const loading = a.state === 'loading';
  const failed = a.state === 'error'
    ? `<div class="empty">${esc(a.note)}　<button class="btn sm" onclick="opAuditRetry()">重試</button></div>`
    : '';
  const more = a.nextBefore
    ? `<div style="padding:12px 14px;text-align:center"><button class="btn sm" ${loading ? 'disabled' : ''} onclick="opAuditLoad(true)">${loading ? '讀取中…' : '載入更早的紀錄'}</button></div>`
    : '';
  const list = a.rows.length
    ? a.rows.map(opAuditRowHtml).join('') + (failed || more)
    : failed || (a.state === 'ready' ? '<div class="empty">尚無稽核紀錄</div>' : '<div class="empty">讀取中…</div>');
  const autosave = a.autosaveTotal
    ? `<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;color:var(--text-3);font-size:12px">
        <span>${a.autosave ? '含' : '另有'} ${a.autosaveTotal} 筆日誌自動保存</span>
        <button class="btn sm" style="margin-left:auto" onclick="opAuditToggleAutosave()">${a.autosave ? '收起自動保存' : '顯示自動保存'}</button></div>`
    : '';

  return {
    crumb: '稽核',
    title: '稽核軌跡',
    sub: a.state === 'ready' || a.rows.length ? `${a.total} 筆 · 不可刪除` : '不可刪除',
    body: `<div style="margin:-14px -14px 0">${autosave}${list}</div>`,
    foot: `<div class="note" style="padding:0 2px">稽核軌跡與「資料流」不同：資料流說明<b>這次操作串到哪裡</b>，稽核記錄<b>誰在何時改了什麼</b>，存在伺服器上，重新整理、換裝置都在，而且不能清空。契約 §9.6 的獎金明細一旦有爭議，需要的是這一份。<br>「改了什麼」那一行自 2026-10-07 起才有留；更早的紀錄只有動作與對象。</div>`
  };
};

const opAuditPrototypeOpen = openAudit;
openAudit = function () {
  opAuditPrototypeOpen();
  // 沒有權限時原型已經擋下並提示；有權限才去取。每次開都重取。
  if (OP_LIVE && can('audit')) opAuditLoad(false);
};
