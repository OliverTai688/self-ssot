/* 檔案物件（ASSET-005）—— 上傳的檔案不是附件，是物件。
 *
 * 差別在哪：附件是黏在某一行上的裝飾，行刪了它就消失，而且只有那一行知道它存在。
 * 物件有唯一的家、有參考碼、進得了物件索引，任何一行打 @ 都引用得到同一份。
 * 系統裡「可以被 @」的定義很硬 —— 要出現在 mentionHits()、objHtml() 畫得出卡片、
 * objJump() 打得開。這個檔案就是把 asset 這個型別補進那三個地方，外加四道上傳的門。
 *
 * 白名單、分級上限、multipart 門檻與錯誤訊息都不在這裡重寫：
 * 直接 import 伺服器用的同一份契約（@/lib/ui-data/yuanzhan/operating-assets），
 * 所以前端擋下來的理由與伺服器擋下來的理由是同一個字串，不會有兩套規則慢慢漂開。
 */

/* ---------- 型別註冊 ---------- */

DB.assets ??= [];

// svg() 對未知 key 會靜默畫一個空 <svg>（同 journal-icon-table-missing-keys-fix 的成因），
// 所以卡片要用的圖示先補進表裡。paperclip／file／download 既有，不重複加。
I.image ??= '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>';
I.audio ??= '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
I.video ??= '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>';
I.play ??= '<path d="M6 4.5v15l12-7.5z"/>';

/** kind → 卡片 chip 與圖示。人話名稱一律走契約的 AST_LABELS，不在這裡再寫一份。 */
const AST_META = {
  image: { chip: 'c-t', ic: 'image' },
  pdf: { chip: 'c-p', ic: 'file' },
  doc: { chip: 'c-p', ic: 'file' },
  sheet: { chip: 'c-i', ic: 'file' },
  slide: { chip: 'c-o', ic: 'file' },
  audio: { chip: 'c-w', ic: 'audio' },
  video: { chip: 'c-i', ic: 'video' }
};
const astMeta = k => AST_META[k] || { chip: 'c-n', ic: 'file' };

/* 重試要原本那個 File 物件。頁面重整之後它就沒了 —— 那時只能請使用者重選，
   而不是假裝還能續傳。 */
const AST_FILES = new Map();

const UPLOAD_ENDPOINT = '/api/company/operating/uploads';

function astOf(rid) { return (DB.assets || []).find(a => a.id === rid) || null; }
function astSize(bytes) { return bytes ? astFmtBytes(bytes) : '—'; }

/* ---------- 一、四道門 ---------- */

/**
 * 四道門（拖放／⌘V／# 附件／行首 ＋）全部收斂到這裡。
 *
 * 一次可以進來多個檔案，每個檔案各自成為一列物件、各自一張卡片 ——
 * 一張卡片裡塞三個檔案的話，@ 就引用不到其中某一個。
 * 回傳最後一個插入的區塊 id，讓下一個檔案接在它後面而不是全部擠在同一行。
 */
async function assetIntake(fileList, blockId) {
  if (!canWriteJournal()) return deny();
  const files = [...(fileList || [])].filter(Boolean);
  if (!files.length) return;
  syncAll();
  snap();
  let anchor = blockId;
  for (const file of files) {
    const verdict = astClassify({ name: file.name, bytes: file.size, mimeType: file.type });
    if (!verdict.ok) { toast(esc(verdict.error)); continue; }
    anchor = await astAdd(file, verdict, anchor);
  }
}

/** 一個檔案：先落地成一列與一張卡片，再跑網路。 */
async function astAdd(file, verdict, anchor) {
  // prototype 模式沒有伺服器，也就沒有參考碼。維持原型行為：留在這一頁的記憶體裡。
  if (!OP_LIVE) {
    const row = {
      id: nid('AST'), name: file.name, kind: verdict.kind, bytes: file.size,
      mime: file.type || '', status: 'ready', space, author: DB.me,
      day: S.jday || TODAY, bornAt: Date.now(), objectKey: '', data: ''
    };
    if (verdict.kind === 'image') row.data = await astDataUrl(file);
    DB.assets.push(row);
    astKeepLocal(row.id, file);
    const bid = astInsert(row.id, anchor);
    audit('檔案', row.name, '上傳', '', 1);
    toast('已加入本頁記憶體 · 重整重置');
    return bid;
  }

  let signed;
  try {
    signed = await astPresign(file);
  } catch (e) {
    toast(esc(e.message));
    return anchor;
  }

  // 列先進 DB、卡片先畫出來，網路才開始跑。使用者不必盯著空白等，
  // 而且上傳到一半關掉分頁時，畫面上那張卡片說得出它是哪一個檔案。
  const row = {
    id: signed.refCode, assetId: signed.assetId, name: file.name, kind: signed.kind || verdict.kind,
    bytes: file.size, mime: signed.contentType || file.type || '', objectKey: signed.objectKey,
    status: 'uploading', pct: 0, space, author: DB.me,
    day: S.jday || TODAY, bornAt: Date.now(), err: ''
  };
  DB.assets.push(row);
  AST_FILES.set(row.id, file);
  astKeepLocal(row.id, file);
  const bid = astInsert(row.id, anchor);

  astUpload(row, file, signed);
  return bid;
}

/**
 * 上傳本身。不 await —— 使用者可以繼續打字，卡片自己會走完。
 *
 * `signed` 是這一次要用的那張預簽：第一次由 astAdd 帶進來，重試由 astRetry 重新要一張。
 * 這裡自己不再去要 —— 先前這裡多要了一次，每傳一個檔案伺服器就多一列永遠傳不完的孤兒。
 */
async function astUpload(row, file, signed) {
  try {
    await astPut(signed.uploadUrl, file, pct => astPaintProgress(row.id, pct), {
      contentType: signed.contentType, rid: row.id
    });
    await astFinalize(row.assetId, 'uploaded');
    row.status = 'ready';
    row.pct = 100;
    AST_FILES.delete(row.id);
    audit('檔案', row.name, '上傳', '', 1);
  } catch (e) {
    row.status = 'failed';
    row.err = e && e.message ? e.message : '上傳失敗';
    await astFinalize(row.assetId, 'failed').catch(() => {});
  }
  AST_XHR.delete(row.id);
  if (active) render();
}

/** 正在傳的那幾個請求，取消時要找得到。 */
const AST_XHR = new Map();

/**
 * 要一張預簽。`retryOf` 有給就是重試：伺服器沿用同一列、同一個參考碼與 key，
 * 只重新開放上傳 —— 日誌那一行存的是參考碼，換了那張卡片就指向一筆不存在的檔案。
 */
async function astPresign(file, retryOf) {
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: file.name, contentType: file.type, bytes: file.size,
      origin: 'journal', space, bornDay: S.jday || TODAY,
      ...(retryOf ? { retryOf } : {})
    })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(payload.error || '取得上傳網址失敗');
  return payload;
}

/**
 * 用 XHR 而不是 fetch：fetch 沒有上傳進度事件。
 * 假的進度條比沒有進度條更糟 —— 它會在 99% 卡住，而使用者不知道那是不是當掉了。
 *
 * Content-Type 是簽進網址的一部分，送出去的必須與伺服器簽的那一個一字不差，否則 R2 回 403。
 * 所以有 `options.contentType`（伺服器回的）就用它；沒有才退回 `file.type`（專案硬碟那條路）。
 */
function astPut(uploadUrl, file, onPct, options) {
  return new Promise((resolve, reject) => {
    if (!uploadUrl) return reject(Error('上傳網址已失效，請重試'));
    const xhr = new XMLHttpRequest();
    const type = (options && options.contentType) || file.type;
    xhr.open('PUT', uploadUrl, true);
    if (type) xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onPct(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve()
      : reject(Error('上傳失敗（HTTP ' + xhr.status + '）'));
    xhr.onerror = () => reject(Error('連線中斷'));
    xhr.ontimeout = () => reject(Error('上傳逾時'));
    xhr.onabort = () => reject(Error('已取消上傳'));
    if (options && options.rid) AST_XHR.set(options.rid, xhr);
    xhr.send(file);
  });
}

/** 告訴伺服器傳完了，由它回頭問 R2 到底存進去沒、大小對不對。 */
async function astFinalize(assetId, outcome) {
  if (!assetId) return null;
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId, outcome })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(payload.error || '上傳未完成');
  return payload;
}

function astDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** 只改進度條那一個節點。每次 tick 都 render() 會把游標從正在打字的那一行踢走。 */
function astPaintProgress(rid, pct) {
  const row = astOf(rid);
  if (row) row.pct = pct;
  root.querySelectorAll('[data-ast-prog="' + rid + '"]').forEach(el => { el.style.width = pct + '%'; });
  root.querySelectorAll('[data-ast-pct="' + rid + '"]').forEach(el => { el.textContent = pct + '%'; });
}

/** 把一列物件插進日誌。空行就地換掉，有字就接在它下面，後面一定留一行可以繼續打字。 */
function astInsert(rid, anchorId) {
  const arr = blks();
  const b = anchorId ? bOf(anchorId) : null;
  const nb = { id: newBid(), t: 'obj', ind: b ? b.ind : 0, text: '', obj: { ty: 'asset', rid, bornAt: Date.now() } };
  if (b && TEXTY(b.t) && !b.text.trim()) arr.splice(bIdx(anchorId), 1, nb);
  else if (b) arr.splice(bIdx(anchorId) + 1, 0, nb);
  else arr.push(nb);
  const j = arr.indexOf(nb), next = arr[j + 1];
  if (!next || !TEXTY(next.t) || next.text.trim()) {
    arr.splice(j + 1, 0, { id: newBid(), t: 'p', ind: nb.ind, text: '' });
  }
  render();
  return nb.id;
}

/* ---------- 二、選檔器（# 圖片／影片／音訊／附件、欄頭按鈕） ---------- */

/** 每一種選法對應一個原生 input。accept 用型別萬用字元：實際收不收仍由 astClassify 決定。 */
const AST_PICK = {
  image: { accept: 'image/*' },
  video: { accept: 'video/*' },
  audio: { accept: 'audio/*' },
  // 手機：capture 會直接叫出相機，而不是先進相簿。桌機瀏覽器忽略這個屬性。
  camera: { accept: 'image/*', capture: 'environment', single: true },
  record: { accept: 'video/*', capture: 'environment', single: true },
  gallery: { accept: 'image/*,video/*' },
  file: { accept: '' }
};

/**
 * 系統的選檔視窗由瀏覽器叫出來，我們不自己畫 —— 自己畫的一定比系統的難用。
 * input 用完就拿掉；同一個檔案連選兩次也要觸發 change，所以每次都建新的。
 */
function astPick(mode, blockId) {
  if (!canWriteJournal()) return deny();
  const cfg = AST_PICK[mode] || AST_PICK.file;
  const input = doc.createElement('input');
  input.type = 'file';
  input.multiple = !cfg.single;
  if (cfg.accept) input.accept = cfg.accept;
  if (cfg.capture) input.setAttribute('capture', cfg.capture);
  input.setAttribute('aria-label', '選擇檔案');
  input.style.display = 'none';
  root.append(input);
  input.onchange = () => {
    const files = input.files;
    input.remove();
    if (files && files.length) assetIntake(files, blockId || null);
  };
  // 使用者按了取消：瀏覽器支援 cancel 事件就收掉，不支援的話下一次開啟時清。
  input.addEventListener('cancel', () => input.remove());
  root.querySelectorAll('input[type="file"][aria-label="選擇檔案"]').forEach(el => { if (el !== input) el.remove(); });
  input.click();
}

/** 欄頭「附件」與 # 附件：把幾種選法攤開。手機沒有拖放、⌘V 不好按，這裡是它唯一可靠的門。 */
function astOpenPicker(blockId) {
  if (!canWriteJournal()) return deny();
  const id = blockId || '';
  const opt = (mode, ic, nm, ds) => `<button class="ast-opt" onclick="closeModal();astPick('${mode}','${id}')">
      <span class="ast-opt-ic">${svg(ic, 18)}</span><span class="ast-opt-nm">${nm}</span><span class="ast-opt-ds">${ds}</span></button>`;
  // 有鏡頭可以直接拍的裝置才給「拍照／錄影」；桌機上那兩顆按了只是再開一次選檔視窗。
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  openModal(
    '加入檔案',
    '上傳之後是一個物件：有參考碼、進物件索引，任何一行都可以用 @ 引用同一份。',
    `<div class="ast-opts">
      ${opt('image', 'image', '圖片', 'PNG、JPG、WebP、GIF、HEIC · 25 MB')}
      ${opt('video', 'video', '影片', 'MP4、MOV、WebM · 500 MB')}
      ${opt('audio', 'audio', '音訊', 'MP3、M4A、WAV、AAC、OGG · 200 MB')}
      ${touch ? opt('camera', 'image', '拍照', '開啟相機拍一張') + opt('record', 'video', '錄影', '開啟相機錄一段') : ''}
      ${opt('file', 'paperclip', '其他檔案', 'PDF、Word、Excel、PowerPoint · 50 MB')}
    </div>
    ${touch ? '' : '<div class="note" style="margin-top:10px">也可以把檔案直接拖到日誌的某一行，或在行內按 ⌘V 貼上截圖。</div>'}`,
    '<button class="btn" onclick="closeModal()">取消</button>'
  );
}

/* ---------- 三、卡片 ---------- */

function astCard(b) {
  const a = astOf(b.obj.rid);
  if (!a) return '<div class="eb-obj">檔案已刪除</div>';
  const meta = astMeta(a.kind);
  const head = `<div class="eb-obj-h"><span class="chip ${meta.chip}">${esc(AST_LABELS[a.kind] || '檔案')}</span>
    <span class="ti">${esc(a.name)}</span>
    <span class="m" style="font-family:var(--mono);font-size:10.5px;color:var(--text-3)">${esc(a.id)}</span></div>`;

  if (a.status === 'uploading') {
    // 還在傳的時候就看得到是哪一張圖：本機那一份已經在手上，不必等網路。
    const peek = a.kind === 'image' && AST_LOCAL.has(a.id) ? astThumb(a, '') : '';
    return `<div class="eb-obj ast-card">${head}${peek}
      <div class="eb-obj-p"><span class="pf">上傳中 <b data-ast-pct="${esc(a.id)}">${a.pct || 0}%</b></span><span class="pf">大小 <b>${astSize(a.bytes)}</b></span>
        <span class="pf" onclick="astCancel('${a.id}')" role="button" tabindex="0">取消 ×</span></div>
      <div class="ast-prog"><i data-ast-prog="${esc(a.id)}" style="width:${a.pct || 0}%"></i></div></div>`;
  }

  if (a.status === 'failed') {
    // 失敗的檔案留在原地，不默默消失 —— 那一行的上下文就是它為什麼被上傳。
    const canRetry = AST_FILES.has(a.id);
    return `<div class="eb-obj ast-card ast-failed">${head}
      <div class="eb-obj-p"><span class="pf ast-err">${esc(a.err || '上傳失敗')}</span>
        ${canRetry ? `<span class="pf" onclick="astRetry('${a.id}')" role="button" tabindex="0">重試 ↻</span>`
      : `<span class="pf" onclick="astPick('file','${b.id}')" role="button" tabindex="0">重新選擇檔案</span>`}
        <span class="pf" onclick="astDrop('${b.id}')" role="button" tabindex="0">移除 ×</span></div></div>`;
  }

  // 圖片、影片、音訊要看得到內容，所以是整張卡片；其餘檔案維持雙欄裡的精簡膠囊，細節點開抽屜。
  const body = astBody(a, b.id);
  return `<div class="eb-obj ${body ? 'ast-card' : ''}" onclick="objJump('asset','${a.id}')">${head}${body}
    <div class="eb-obj-p">${astFacts(a).map(f => '<span class="pf">' + f + '</span>').join('')}</div></div>`;
}

/**
 * 卡片主體依 kind 換：圖片是縮圖，影片與音訊是可以直接按播放的播放器，其餘只有圖示與下載。
 *
 * 這裡只畫「位置」。真正的 <img src>／<video> 由 astHydrate() 在畫完之後補上 ——
 * 網址要向伺服器換，是非同步的；而且播放器是活的節點，不能跟著每一次 render() 重建
 * （那樣正在播的影片會被切斷、從頭來過）。`where` 讓同一份檔案嵌在兩個地方時各有各的播放器。
 */
function astBody(a, where) {
  if (a.kind === 'image') return astThumb(a, '');
  if ((a.kind === 'video' || a.kind === 'audio') && astPlayable(a)) return astMediaSlot(a, where || 'card');
  return '';
}

/** 有東西可以播：這一頁剛傳的本機那一份，或伺服器上的那一份。 */
const astPlayable = a => AST_LOCAL.has(a.id) || !!a.objectKey;

function astThumb(a, cls) {
  astQueueHydrate();
  return `<div class="ast-hold ${cls}" data-ast-thumb="${esc(a.id)}" style="margin-top:8px"><span class="ast-ph">載入中…</span><img alt="${esc(a.name)}"></div>`;
}

function astMediaSlot(a, where) {
  astQueueHydrate();
  return `<div class="ast-media ast-${a.kind}" data-ast-media="${esc(a.id)}" data-ast-where="${esc(where)}"><div class="ast-media-ph">${svg(a.kind, 14)} 載入播放器…</div></div>`;
}

function astFacts(a) {
  const out = ['大小 <b>' + astSize(a.bytes) + '</b>'];
  if (a.day) out.push('誕生 <b>' + esc(String(a.day).slice(5)) + '</b>');
  const refs = astRefCount(a.id);
  if (refs > 1) out.push('被引用 <b>' + refs + '</b> 次');
  if (a.space === 'personal') out.push('<b>私人</b>');
  return out;
}

/** 這份檔案在所有日誌與文件段落裡被嵌入幾次。1 次就是只有誕生的那一行。 */
function astRefCount(rid) {
  let n = 0;
  const books = DB.journalBooks || { team: { yz: DB.journal } };
  for (const sp of Object.keys(books)) for (const who of Object.keys(books[sp] || {})) {
    const book = books[sp][who] || {};
    for (const day of Object.keys(book)) {
      for (const b of (book[day] && book[day].blocks) || []) {
        if (b.t === 'obj' && b.obj && b.obj.ty === 'asset' && b.obj.rid === rid) n += 1;
      }
    }
  }
  (DB.docObjects || []).forEach(d => (d.secs || []).forEach(sec =>
    ensureSecBlocks(sec).forEach(b => {
      if (b.t === 'obj' && b.obj && b.obj.ty === 'asset' && b.obj.rid === rid) n += 1;
    })));
  return n;
}

/* ---------- 三之二、看得到的那一份 ---------- */

/* 這一頁剛傳上去的檔案，直接用本機那一份看與播：不必為了看自己剛選的檔再下載一次。
   blob 網址只活在這一頁，重新整理後改由伺服器換短效網址。 */
const AST_LOCAL = new Map();
function astKeepLocal(rid, file) {
  try { AST_LOCAL.set(rid, URL.createObjectURL(file)); } catch { /* 沒有 createObjectURL 就退回伺服器那一份 */ }
}
controller.signal.addEventListener('abort', () => {
  AST_LOCAL.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* 已經失效 */ } });
  AST_LOCAL.clear();
  AST_PLAYERS.forEach(el => { try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* 節點已釋放 */ } });
  AST_PLAYERS.clear();
});

/**
 * 短效下載網址（伺服器簽 5 分鐘）。同一個 key 在 4 分鐘內重用同一張：
 * 每次 render() 都重換一張的話，縮圖會跟著每個動作重新下載、閃一次。
 * 存的是 promise，同一輪裡十張卡片指向同一個檔也只問伺服器一次。
 */
const AST_SIGNED = new Map();
const AST_SIGNED_TTL = 4 * 60 * 1000;

function astSignedUrl(objectKey, fresh) {
  const hit = AST_SIGNED.get(objectKey);
  if (!fresh && hit && Date.now() - hit.at < AST_SIGNED_TTL) return hit.url;
  const url = fetch(UPLOAD_ENDPOINT + '?key=' + encodeURIComponent(objectKey))
    .then(res => { if (!res.ok) throw Error('取得檔案失敗'); return res.json(); })
    .then(payload => payload.downloadUrl);
  AST_SIGNED.set(objectKey, { url, at: Date.now() });
  url.catch(() => { if (AST_SIGNED.get(objectKey)?.url === url) AST_SIGNED.delete(objectKey); });
  return url;
}

/** `fresh`：手上的那一張不能用了（過期，或本機那一份瀏覽器解不開），向伺服器換新的。 */
async function astViewUrl(a, fresh) {
  if (!fresh) {
    if (a.data) return a.data;
    if (AST_LOCAL.has(a.id)) return AST_LOCAL.get(a.id);
  }
  if (!a.objectKey) throw Error('這一份只在本頁記憶體裡');
  return astSignedUrl(a.objectKey, fresh);
}

/* render() 之後補上縮圖與播放器。同一輪裡畫了幾張卡片都只排一次。 */
let AST_HYDRATE_QUEUED = false;
function astQueueHydrate() {
  if (AST_HYDRATE_QUEUED) return;
  AST_HYDRATE_QUEUED = true;
  setTimeout(() => { AST_HYDRATE_QUEUED = false; if (active) astHydrate(); }, 0);
}

function astHydrate(prune) {
  root.querySelectorAll('[data-ast-thumb]:not([data-ast-on])').forEach(astMountThumb);
  root.querySelectorAll('[data-ast-media]:not([data-ast-on])').forEach(astMountMedia);
  if (!prune) return;
  // 畫面上已經沒有的播放器放掉，否則翻過的每一天都留著一支載好的影片。
  AST_PLAYERS.forEach((el, key) => {
    if (el.isConnected) return;
    try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* 節點已釋放 */ }
    AST_PLAYERS.delete(key);
  });
}

/* 整頁重畫之後立刻把播放器接回去 —— 同一個 task 裡拿下來又放回去，瀏覽器不會把它暫停，
   正在播的影片不會因為旁邊按了一顆按鈕而中斷。抽屜不走 render()，由 astQueueHydrate() 補。 */
const astBaseRender = render;
render = function (...args) {
  const out = astBaseRender(...args);
  if (active) astHydrate(true);
  return out;
};

function astMountThumb(hold) {
  hold.dataset.astOn = '1';
  const a = astOf(hold.dataset.astThumb);
  const img = hold.querySelector('img');
  if (!a || !img) return;
  const fail = text => {
    hold.classList.add('failed');
    const ph = hold.querySelector('.ast-ph');
    if (ph) ph.textContent = text;
  };
  let healed = false;
  // 先畫骨架、圖真的解碼完才淡入 —— 直接給一個還沒有 src 的 <img> 會先閃一次破圖。
  img.onload = () => hold.classList.add('ready');
  img.onerror = () => {
    if (healed) return fail('無法顯示');
    healed = true;
    astViewUrl(a, true).then(url => { img.src = url; }, () => fail('無法顯示'));
  };
  astViewUrl(a).then(url => { img.src = url; }, () => fail('無法載入'));
}

/* 活著的播放器，鍵是「檔案｜嵌在哪裡」。 */
const AST_PLAYERS = new Map();

function astMountMedia(slot) {
  slot.dataset.astOn = '1';
  const a = astOf(slot.dataset.astMedia);
  if (!a) return;
  const key = a.id + '|' + (slot.dataset.astWhere || 'card');
  const kept = AST_PLAYERS.get(key);
  if (kept && !kept.isConnected) {
    slot.replaceChildren(kept);
    if (kept._astPlaying) kept.play().catch(() => {});
    return;
  }
  const el = astBuildPlayer(a, slot);
  if (!kept) AST_PLAYERS.set(key, el);
  slot.replaceChildren(el);
}

function astBuildPlayer(a) {
  const el = doc.createElement(a.kind === 'video' ? 'video' : 'audio');
  el.controls = true;
  el.preload = 'metadata';
  el.setAttribute('playsinline', '');
  el.setAttribute('aria-label', a.name);
  // 按播放器不是「打開這個檔案」：不要讓外層卡片的點擊一起觸發、把抽屜叫出來。
  el.addEventListener('click', e => e.stopPropagation());
  el.addEventListener('playing', () => { el._astPlaying = true; el._astHeals = 0; });
  el.addEventListener('pause', () => { if (el.isConnected) el._astPlaying = false; });
  el.addEventListener('ended', () => { el._astPlaying = false; });

  const use = (url, resumeAt, resume) => {
    el._astUrlAt = Date.now();
    el._astLocal = /^blob:|^data:/.test(url);
    // #t：手機 Safari 不先定位就不畫第一格，影片卡片會是一塊黑。片段不會送到伺服器，不影響簽名。
    el.src = a.kind === 'video' && !resumeAt ? url + '#t=0.001' : url;
    if (resumeAt || resume) {
      el.addEventListener('loadedmetadata', () => {
        if (resumeAt) el.currentTime = resumeAt;
        if (resume) el.play().catch(() => {});
      }, { once: true });
    }
  };

  el.addEventListener('error', () => {
    // 兩種會在這裡的情況要分開：網址過期（換一張就好），或這個格式瀏覽器解不開（換幾張都一樣）。
    // 剛換到手的網址還出錯就是後者；本機那一份出錯則先退回伺服器那一份試一次。
    const stale = el._astLocal || Date.now() - (el._astUrlAt || 0) > 60 * 1000;
    el._astHeals = (el._astHeals || 0) + 1;
    if (!stale || el._astHeals > 3 || !a.objectKey) return astPlayerFailed(el, a);
    const at = el.currentTime || 0, was = !!el._astPlaying;
    astViewUrl(a, true).then(url => use(url, at, was), () => astPlayerFailed(el, a));
  });

  astViewUrl(a).then(url => use(url, 0, false), () => astPlayerFailed(el, a));
  return el;
}

function astPlayerFailed(el, a) {
  AST_PLAYERS.forEach((node, key) => { if (node === el) AST_PLAYERS.delete(key); });
  const slot = el.parentNode;
  if (!slot || !slot.isConnected) return;
  slot.innerHTML = `<div class="ast-media-ph">這個瀏覽器播不了這個格式${a.objectKey
    ? `　<span class="pf" role="button" tabindex="0" onclick="event.stopPropagation();astDownload('${a.id}')">下載後開啟</span>` : ''}</div>`;
  wire();
}

/* ---------- 四、動作 ---------- */

function astRetry(rid) {
  const row = astOf(rid), file = AST_FILES.get(rid);
  if (!row || !file) return toast('原始檔案已不在這一頁，請重新選擇');
  row.status = 'uploading';
  row.pct = 0;
  row.err = '';
  render();
  // 同一列、同一個參考碼（RES-018）：伺服器只重新開放上傳，日誌那一行不必改。
  astPresign(file, row.assetId).then(signed => astUpload(row, file, signed)).catch(e => {
    row.status = 'failed';
    row.err = e.message || '重試失敗';
    if (active) render();
  });
}

/** 取消正在傳的那一個。卡片留著並變成「已取消」，可以重試或移除 —— 大影片選錯了不必等它傳完。 */
function astCancel(rid) {
  const xhr = AST_XHR.get(rid);
  if (xhr) xhr.abort();
}

/** 只從日誌移除這一行；物件本身不動 —— 與既有「刪除區塊」的語意一致。 */
function astDrop(blockId) {
  const arr = blks(), i = bIdx(blockId);
  if (i < 0) return;
  syncAll();
  snap();
  arr.splice(i, 1);
  if (!arr.length) arr.push({ id: newBid(), t: 'p', ind: 0, text: '' });
  render();
}

async function astDownload(rid) {
  const a = astOf(rid);
  if (!a) return;
  const link = doc.createElement('a');
  link.rel = 'noopener';
  link.download = a.name;
  try {
    if (a.objectKey) {
      // download=1：伺服器把網址簽成附件。預簽網址與工作台不同源，<a download> 對它無效，
      // 不這樣做的話瀏覽器會在同一個分頁把圖片或影片打開，等於把人帶離工作台。
      const res = await fetch(UPLOAD_ENDPOINT + '?download=1&key=' + encodeURIComponent(a.objectKey));
      if (!res.ok) throw Error('取得下載網址失敗');
      link.href = (await res.json()).downloadUrl;
    } else {
      // 只在這一頁記憶體裡的那一份（prototype 模式）：同源的 blob，可以直接存。
      link.href = await astViewUrl(a);
    }
    root.append(link);
    link.click();
    link.remove();
  } catch (e) {
    toast(esc(e.message));
  }
}

function astCopyCode(rid) {
  navigator.clipboard?.writeText(rid).then(() => toast('已複製參考碼'), () => toast('複製失敗'));
}

/* ---------- 五、抽屜 ---------- */

DRAWERS.asset = rid => {
  const a = astOf(rid);
  if (!a) return { crumb: '檔案', title: '找不到檔案', body: '', foot: '' };
  let preview = '';
  if (a.kind === 'image') {
    preview = astThumb(a, 'big');
  } else if (a.kind === 'pdf' && a.objectKey) {
    const pid = 'astD-' + rid.replace(/[^A-Za-z0-9-]/g, '');
    setTimeout(() => astPaintFrame(pid, a.objectKey), 0);
    // 手機 Safari 的 iframe PDF 幾乎不能用，所以底下一定要留下載。
    preview = `<iframe class="ast-frame" id="${pid}" title="${esc(a.name)}"></iframe>`;
  } else if ((a.kind === 'audio' || a.kind === 'video') && astPlayable(a)) {
    preview = astMediaSlot(a, 'drawer');
  }

  return {
    crumb: AST_LABELS[a.kind] || '檔案',
    title: esc(a.name),
    sub: astSize(a.bytes) + ' · ' + (a.day || ''),
    body: `<div class="ast-meta">
        <span>參考碼 <button class="ast-code" onclick="astCopyCode('${a.id}')" title="複製">${esc(a.id)}</button></span>
        <span>上傳者 <b>${esc(person(a.author))}</b></span>
        <span>可見範圍 <b>${a.space === 'personal' ? '只有我' : '全員'}</b></span>
        <span>被引用 <b>${astRefCount(a.id)}</b> 次</span>
      </div>${preview}`,
    foot: `<button class="btn pri" onclick="astDownload('${a.id}')">${svg('download', 13)} 下載</button>
      <span class="note">${a.objectKey ? '存放在 Cloudflare R2 · 網址每次重新產生，短時間內有效' : '這一份只在本頁記憶體裡'}</span>`
  };
};

async function astPaintFrame(elementId, objectKey) {
  try {
    const url = await astSignedUrl(objectKey);
    const el = root.querySelector('#' + elementId);
    if (el) el.src = url;
  } catch { /* 預覽失敗不影響下載按鈕 */ }
}

/* ---------- 六、接進既有的物件機制 ---------- */

/* 卡片：骨架沿用 .eb-obj，所以在日誌、文件段落、索引時間軸長得一樣。 */
const astBaseObjHtml = objHtml;
objHtml = function (b) {
  if (b && b.obj && b.obj.ty === 'asset') return astCard(b);
  return astBaseObjHtml(b);
};

/* @ 引用：只有 ready 的檔案進得了選單 —— 傳到一半的東西不該被別人引用。 */
const astBaseMentionHits = mentionHits;
mentionHits = function (q) {
  const out = astBaseMentionHits(q);
  const s = (q || '').toLowerCase();
  (DB.assets || []).forEach(a => {
    if (!astReferenceable(a.status)) return;
    if (a.space === 'personal' && a.author !== DB.me) return;
    if (s && !(a.name + a.id).toLowerCase().includes(s)) return;
    out.push({
      mention: true, ty: 'asset', rid: a.id, k: a.id, nm: a.name,
      ds: (AST_LABELS[a.kind] || '檔案') + ' · ' + astSize(a.bytes) + ' · ' + (a.day || ''),
      ic: astMeta(a.kind).ic, g: '檔案'
    });
  });
  return out.slice(0, 40);
};

/* 點卡片打開抽屜。 */
const astBaseObjJump = objJump;
objJump = function (ty, rid) {
  if (ty === 'asset') return openDrawer('asset', rid);
  return astBaseObjJump(ty, rid);
};

/* # 召喚：圖片、影片、音訊各一項，選了直接開系統的選檔視窗 —— 少一層選單。
   「附件」留著給其他檔案與手機的拍照／錄影，它開的是把幾種選法攤開的那個視窗。
   走 summonObject 而不是 TPL：它們不是文件模板，選了之後開的是選檔視窗，不是表單。 */
const AST_SUMMON = { image: 'image', video: 'video', audio: 'audio' };
SUMMON[1].items.push(
  { k: 'image', nm: '圖片', ds: '上傳圖片或截圖 · 日誌裡直接看得到', ic: 'image' },
  { k: 'video', nm: '影片', ds: '上傳影片 · 日誌裡直接播放', ic: 'video' },
  { k: 'audio', nm: '音訊', ds: '上傳錄音或音檔 · 日誌裡直接播放', ic: 'audio' },
  { k: 'asset', nm: '附件', ds: 'PDF、Office 文件與其他檔案 · 手機可拍照或錄影', ic: 'paperclip' }
);
const astBaseSummonObject = summonObject;
summonObject = function (ty, blockId, seed) {
  if (AST_SUMMON[ty]) return astPick(AST_SUMMON[ty], blockId);
  if (ty === 'asset') return astOpenPicker(blockId);
  return astBaseSummonObject(ty, blockId, seed);
};

/* ---------- 七、拖放與貼上 ---------- */

/* 區塊排序本來就佔用了 dragover／drop。先判斷拖進來的是不是檔案，
   是的話走上傳、並且不要讓排序邏輯看到這個事件。 */
const astHasFiles = e => {
  const t = e && e.dataTransfer;
  return !!t && ((t.files && t.files.length > 0) || (t.types && [...t.types].includes('Files')));
};

const astBaseDragOver = dragOver;
dragOver = function (e, id) {
  if (astHasFiles(e)) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const el = e.currentTarget || (e.target && e.target.closest && e.target.closest('.eb'));
    if (el && el.classList) el.classList.add('ast-drop');
    return;
  }
  return astBaseDragOver(e, id);
};

const astBaseDropBlk = dropBlk;
dropBlk = function (e, id) {
  if (astHasFiles(e)) {
    e.preventDefault();
    e.stopPropagation();
    root.querySelectorAll('.eb.ast-drop').forEach(el => el.classList.remove('ast-drop'));
    assetIntake(e.dataTransfer.files, id);
    return;
  }
  return astBaseDropBlk(e, id);
};

listen('dragleave', e => {
  const el = e.target && e.target.closest && e.target.closest('.eb.ast-drop');
  if (el) el.classList.remove('ast-drop');
});

/**
 * 貼上：截圖是最高頻的一種「檔案」，而它沒有檔名。
 *
 * 用 capture 階段是刻意的 —— runtime 既有的 paste 監聽會 preventDefault 並插入
 * clipboardData 的純文字。剪貼簿裡是圖片時那段文字是空字串，插一個空節點雖然無害，
 * 但仍會送出一次 input 事件、把這一行標成已修改。在它之前就攔下來比較乾淨。
 */
root.addEventListener('paste', e => {
  if (!canWriteJournal()) return;
  const cd = e.clipboardData;
  if (!cd) return;
  const files = [...(cd.files || [])];
  if (!files.length) return;
  const tx = e.target && e.target.closest ? e.target.closest('.eb-tx') : null;
  e.preventDefault();
  e.stopPropagation();
  // 截圖沒有檔名，瀏覽器給的是 image.png。補上時間，三個月後才分得出是哪一張。
  const stamped = files.map(f => (/^image\.(png|jpe?g|webp)$/i.test(f.name || '')
    ? new File([f], '截圖 ' + (S.jday || TODAY).slice(5) + ' ' + nowts() + '.png', { type: f.type })
    : f));
  assetIntake(stamped, tx ? tx.dataset.id : null);
}, { capture: true, signal: controller.signal });
