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
    bytes: file.size, mime: file.type || '', objectKey: signed.objectKey,
    status: 'uploading', pct: 0, space, author: DB.me,
    day: S.jday || TODAY, bornAt: Date.now(), err: ''
  };
  DB.assets.push(row);
  AST_FILES.set(row.id, file);
  const bid = astInsert(row.id, anchor);

  astUpload(row, file);
  return bid;
}

/** 上傳本身。不 await —— 使用者可以繼續打字，卡片自己會走完。 */
async function astUpload(row, file) {
  try {
    const signed = await astPresign(file, row.assetId ? null : undefined);
    void signed;
  } catch { /* astUpload 只在 astAdd 之後被呼叫，預簽已經拿到了 */ }
  try {
    await astPut(row.uploadUrl || AST_URLS.get(row.id), file, pct => astPaintProgress(row.id, pct));
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
  if (active) render();
}

/* 預簽網址不放進 DB.assets（它會進 structuredClone 的快照，而且 15 分鐘就過期）。 */
const AST_URLS = new Map();

async function astPresign(file) {
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: file.name, contentType: file.type, bytes: file.size,
      origin: 'journal', space, bornDay: S.jday || TODAY
    })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(payload.error || '取得上傳網址失敗');
  AST_URLS.set(payload.refCode, payload.uploadUrl);
  return payload;
}

/**
 * 用 XHR 而不是 fetch：fetch 沒有上傳進度事件。
 * 假的進度條比沒有進度條更糟 —— 它會在 99% 卡住，而使用者不知道那是不是當掉了。
 */
function astPut(uploadUrl, file, onPct) {
  return new Promise((resolve, reject) => {
    if (!uploadUrl) return reject(Error('上傳網址已失效，請重試'));
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onPct(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve()
      : reject(Error('上傳失敗（HTTP ' + xhr.status + '）'));
    xhr.onerror = () => reject(Error('連線中斷'));
    xhr.ontimeout = () => reject(Error('上傳逾時'));
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
  const el = root.querySelector('[data-ast-prog="' + rid + '"]');
  if (el) el.style.width = pct + '%';
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

/* ---------- 二、選檔器（# 附件、行首 ＋、手機三選一） ---------- */

/**
 * 手機沒有拖放、⌘V 不好按、# 要切輸入法，所以那道門是三個原生 input。
 * accept 與 capture 由瀏覽器解讀成「相機／相簿／檔案」三種系統選單，
 * 我們不自己畫選單 —— 自己畫的一定比系統的難用。
 */
function astPick(mode, blockId) {
  const input = doc.createElement('input');
  input.type = 'file';
  input.multiple = mode !== 'camera';
  if (mode === 'camera') { input.accept = 'image/*'; input.setAttribute('capture', 'environment'); }
  else if (mode === 'gallery') input.accept = 'image/*,video/*';
  input.setAttribute('aria-label', '選擇檔案');
  input.style.display = 'none';
  root.append(input);
  input.onchange = () => {
    const files = input.files;
    input.remove();
    if (files && files.length) assetIntake(files, blockId);
  };
  input.click();
}

/** 行首 ＋：手機上唯一可靠的那道門。桌機按了也一樣，只是多一個選項而已。 */
function astOpenPicker(blockId) {
  openModal({
    title: '加入檔案',
    sub: '圖片、文件、音訊或影片 · 之後可以用 @ 引用',
    body: `<div class="frow" style="gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="closeModal();astPick('camera','${blockId || ''}')">${svg('image', 14)} 拍照</button>
      <button class="btn" onclick="closeModal();astPick('gallery','${blockId || ''}')">${svg('video', 14)} 相簿</button>
      <button class="btn pri" onclick="closeModal();astPick('file','${blockId || ''}')">${svg('paperclip', 14)} 選擇檔案</button>
    </div>
    <div class="note" style="margin-top:10px">圖片 25 MB · 文件 50 MB · 音訊 200 MB · 影片 500 MB</div>`
  });
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
    return `<div class="eb-obj">${head}
      <div class="eb-obj-p"><span class="pf">上傳中 <b>${a.pct || 0}%</b></span><span class="pf">大小 <b>${astSize(a.bytes)}</b></span></div>
      <div class="ast-prog"><i data-ast-prog="${esc(a.id)}" style="width:${a.pct || 0}%"></i></div></div>`;
  }

  if (a.status === 'failed') {
    // 失敗的檔案留在原地，不默默消失 —— 那一行的上下文就是它為什麼被上傳。
    const canRetry = AST_FILES.has(a.id);
    return `<div class="eb-obj ast-failed">${head}
      <div class="eb-obj-p"><span class="pf ast-err">${esc(a.err || '上傳失敗')}</span>
        ${canRetry ? `<span class="pf" onclick="astRetry('${a.id}')" role="button" tabindex="0">重試 ↻</span>`
      : `<span class="pf" onclick="astPick('file','${b.id}')" role="button" tabindex="0">重新選擇檔案</span>`}
        <span class="pf" onclick="astDrop('${b.id}')" role="button" tabindex="0">移除 ×</span></div></div>`;
  }

  return `<div class="eb-obj" onclick="objJump('asset','${a.id}')">${head}${astBody(a)}
    <div class="eb-obj-p">${astFacts(a).map(f => '<span class="pf">' + f + '</span>').join('')}</div></div>`;
}

/** 卡片主體依 kind 換。P1 只給圖片真的預覽，其餘是圖示與下載 —— 見提案第七節的分級。 */
function astBody(a) {
  if (a.kind !== 'image') return '';
  const pid = 'astH-' + a.id.replace(/[^A-Za-z0-9-]/g, '');
  if (a.data) return `<div class="ast-hold ready" style="margin-top:8px"><img src="${a.data}" alt="${esc(a.name)}"></div>`;
  setTimeout(() => astPaintImg(pid, a.objectKey), 0);
  return `<div class="ast-hold" id="${pid}" style="margin-top:8px"><span class="ast-ph">載入中…</span><img alt="${esc(a.name)}"></div>`;
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

/**
 * 下載網址只有 5 分鐘，所以是要看的時候才換一張，不存進紀錄。
 * 先畫骨架、圖真的解碼完才淡入 —— 直接給一個還沒有 src 的 <img> 會先閃一次破圖。
 */
async function astPaintImg(elementId, objectKey) {
  if (!objectKey) return;
  try {
    const res = await fetch(UPLOAD_ENDPOINT + '?key=' + encodeURIComponent(objectKey));
    if (!res.ok) throw Error('取得檔案失敗');
    const { downloadUrl } = await res.json();
    const hold = root.querySelector('#' + elementId);
    if (!hold) return;
    const img = hold.querySelector('img');
    if (!img) return;
    img.onload = () => hold.classList.add('ready');
    img.onerror = () => { hold.classList.add('failed'); hold.querySelector('.ast-ph').textContent = '無法顯示'; };
    img.src = downloadUrl;
  } catch {
    const hold = root.querySelector('#' + elementId);
    if (hold) { hold.classList.add('failed'); hold.querySelector('.ast-ph').textContent = '無法載入'; }
  }
}

/* ---------- 四、動作 ---------- */

function astRetry(rid) {
  const row = astOf(rid), file = AST_FILES.get(rid);
  if (!row || !file) return toast('原始檔案已不在這一頁，請重新選擇');
  row.status = 'uploading';
  row.pct = 0;
  row.err = '';
  render();
  // 重試換一個新的 key：R2 對同一個 key 的寫入限制是每秒一次，而且半份舊 bytes
  // 留在原地會讓 finalize 的大小比對變得沒有意義。參考碼不變（RES-018）。
  astPresign(file).then(signed => {
    row.assetId = signed.assetId;
    row.objectKey = signed.objectKey;
    return astUpload(row, file);
  }).catch(e => {
    row.status = 'failed';
    row.err = e.message || '重試失敗';
    if (active) render();
  });
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
  if (a.data) return toast('這一份只在本頁記憶體裡');
  try {
    const res = await fetch(UPLOAD_ENDPOINT + '?key=' + encodeURIComponent(a.objectKey));
    if (!res.ok) throw Error('取得下載網址失敗');
    const { downloadUrl } = await res.json();
    const link = doc.createElement('a');
    link.href = downloadUrl;
    link.download = a.name;
    link.rel = 'noopener';
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
  const pid = 'astD-' + rid.replace(/[^A-Za-z0-9-]/g, '');
  let preview = '';
  if (a.kind === 'image') {
    if (a.data) preview = `<img class="ast-lb-img" src="${a.data}" alt="${esc(a.name)}">`;
    else { setTimeout(() => astPaintImg(pid, a.objectKey), 0); preview = `<div class="ast-hold" id="${pid}" style="max-width:100%;height:280px"><span class="ast-ph">載入中…</span><img alt="${esc(a.name)}"></div>`; }
  } else if (a.kind === 'pdf' && a.objectKey) {
    setTimeout(() => astPaintFrame(pid, a.objectKey), 0);
    // 手機 Safari 的 iframe PDF 幾乎不能用，所以底下一定要留「用新分頁開啟」。
    preview = `<iframe class="ast-frame" id="${pid}" title="${esc(a.name)}"></iframe>`;
  } else if ((a.kind === 'audio' || a.kind === 'video') && a.objectKey) {
    setTimeout(() => astPaintMedia(pid, a.objectKey), 0);
    preview = `<div class="ast-media" id="${pid}"><div class="note">載入中…</div></div>`;
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
      <span class="note">下載網址每次重新產生，只有 5 分鐘有效</span>`
  };
};

async function astSignedUrl(objectKey) {
  const res = await fetch(UPLOAD_ENDPOINT + '?key=' + encodeURIComponent(objectKey));
  if (!res.ok) throw Error('取得檔案失敗');
  return (await res.json()).downloadUrl;
}
async function astPaintFrame(elementId, objectKey) {
  try {
    const url = await astSignedUrl(objectKey);
    const el = root.querySelector('#' + elementId);
    if (el) el.src = url;
  } catch { /* 預覽失敗不影響下載按鈕 */ }
}
async function astPaintMedia(elementId, objectKey) {
  const el = root.querySelector('#' + elementId);
  if (!el) return;
  try {
    const url = await astSignedUrl(objectKey);
    const a = (DB.assets || []).find(x => x.objectKey === objectKey);
    const tag = a && a.kind === 'video' ? 'video' : 'audio';
    el.innerHTML = '<' + tag + ' controls preload="metadata" src="' + url + '"></' + tag + '>';
  } catch {
    el.innerHTML = '<div class="note">無法載入，請改用下載</div>';
  }
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

/* # 召喚選單多一項「附件」。走 summonObject 而不是 TPL —— 它不是文件模板，
   選了之後開的是檔案選擇器，不是表單。 */
SUMMON[1].items.push({
  k: 'asset', nm: '附件', ds: '上傳圖片、文件、音訊或影片 · 之後可用 @ 引用', ic: 'paperclip'
});
const astBaseSummonObject = summonObject;
summonObject = function (ty, blockId, seed) {
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
