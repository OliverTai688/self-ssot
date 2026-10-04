/* 連結物件 —— 日誌裡的網址不只是一串字。
 *
 * 三件事：
 *   一、可點：任何一行裡的網址，底下都會多一顆可以點開的連結。它是一般的 <a>，
 *       放在那一行的書寫區**外面**，所以不影響游標、選取與同步回資料的純文字。
 *   二、貼上變元件：在空行貼上一個網址，那一行直接變成一張連結卡片。
 *       在有字的行裡貼上，照常貼成文字（句子不會被拆開），底下出現連結，
 *       需要時再按「存成物件」。
 *   三、是物件：有參考碼、進得了物件索引、任何一行打 @ 都引用得到同一筆。
 *       「可以被 @」的定義與檔案物件相同 —— mentionHits()、objHtml()、objJump() 三處都要有。
 *
 * 標題不去抓對方網頁：瀏覽器跨網域抓不到，而讓伺服器代抓任意網址是一個 SSRF 的洞。
 * 先依網域給一個看得懂的預設名稱，之後可以自己改。
 *
 * 資料：DB.links（database 模式存進 operating_doc_objects，kind = 'link'）。
 */

DB.links ??= [];

const LK_URL = /https?:\/\/[^\s<>"'`，。；、！？（）【】「」『』]+/g;
/** 句尾的標點不算網址的一部分；右括號只有在網址裡沒有對應的左括號時才切掉。 */
function lkTrim(raw) {
  let u = raw.replace(/[.,;:!?]+$/, '');
  while (/[)\]]$/.test(u)) {
    const close = u.slice(-1), open = close === ')' ? '(' : '[';
    if (u.split(open).length > u.split(close).length - 1) break;
    u = u.slice(0, -1);
  }
  return u;
}
function lkParse(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
/** 一段文字裡的網址，去重、保留順序。 */
function lkFind(text) {
  const out = [];
  (String(text || '').match(LK_URL) || []).forEach(raw => {
    const u = lkTrim(raw);
    if (lkParse(u) && !out.includes(u)) out.push(u);
  });
  return out;
}
/** 整段文字就是一個網址（貼上時用）。 */
function lkSingle(text) {
  const t = String(text || '').trim();
  if (!t || /\s/.test(t)) return '';
  const found = lkFind(t);
  return found.length === 1 && found[0] === t ? t : '';
}

const lkOf = rid => (DB.links || []).find(l => l.id === rid) || null;
const lkHost = url => { const u = lkParse(url); return u ? u.host.replace(/^www\./, '') : ''; };
/** 顯示用的短網址：不帶協定，太長就截掉中段以後。 */
function lkShort(url, max) {
  const s = String(url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return s.length > (max || 60) ? s.slice(0, (max || 60) - 1) + '…' : s;
}

/** 依網域給預設名稱。對不到的就用「網域 · 最後一段路徑」。 */
function lkDefaultTitle(url) {
  const u = lkParse(url);
  if (!u) return String(url || '');
  const host = u.host.replace(/^www\./, ''), path = u.pathname;
  const seg = path.split('/').filter(Boolean);
  if (host === 'drive.google.com') return path.includes('/folders/') ? 'Google Drive 資料夾' : 'Google Drive 檔案';
  if (host === 'docs.google.com') {
    if (path.startsWith('/document')) return 'Google 文件';
    if (path.startsWith('/spreadsheets')) return 'Google 試算表';
    if (path.startsWith('/presentation')) return 'Google 簡報';
    if (path.startsWith('/forms')) return 'Google 表單';
  }
  if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'YouTube 影片';
  if (host === 'github.com' && seg.length >= 2) return 'GitHub · ' + seg[0] + '/' + seg[1];
  if (host.endsWith('figma.com')) return 'Figma 設計稿';
  if (host.endsWith('notion.so') || host.endsWith('notion.site')) return 'Notion 頁面';
  if (host === 'meet.google.com') return 'Google Meet 會議';
  let last = seg[seg.length - 1] || '';
  try { last = decodeURIComponent(last); } catch { /* 編碼壞掉就用原樣 */ }
  return last && last.length <= 40 ? host + ' · ' + last : host;
}

/* ---------- 建立 ---------- */
function lkCreate(url, title) {
  const row = {
    id: nid('LNK'), url, title: (title || '').trim() || lkDefaultTitle(url), titleAuto: !(title || '').trim(),
    note: '', space, author: DB.me, day: S.jday || TODAY, bornAt: Date.now()
  };
  DB.links.push(row);
  return row;
}

/** 把連結卡片放進日誌。空行就地換掉，有字就接在它下面，後面一定留一行可以繼續打字。 */
function lkInsert(rid, anchorId) {
  const arr = blks();
  const b = anchorId ? bOf(anchorId) : null;
  const nb = { id: newBid(), t: 'obj', ind: b ? b.ind : 0, text: '', obj: { ty: 'link', rid, bornAt: Date.now() } };
  if (b && TEXTY(b.t) && !b.text.trim()) arr.splice(bIdx(anchorId), 1, nb);
  else if (b) arr.splice(bIdx(anchorId) + 1, 0, nb);
  else arr.push(nb);
  const j = arr.indexOf(nb), next = arr[j + 1];
  if (!next || !TEXTY(next.t) || next.text.trim()) {
    const tail = { id: newBid(), t: 'p', ind: nb.ind, text: '' };
    arr.splice(j + 1, 0, tail);
    focusB(tail.id, 0);
  } else {
    focusB(next.id, 0);
  }
  return nb.id;
}

/** 貼上網址（或 # 召喚）→ 一張卡片。 */
function lkAdd(url, anchorId, title) {
  if (!canWriteJournal()) return deny();
  if (!lkParse(url)) return toast('這不是一個可以開啟的網址（只接受 http 與 https）');
  syncAll();
  snap();
  const row = lkCreate(url, title);
  lkInsert(row.id, anchorId);
  audit('連結', row.title, '建立', '', row.url);
  render();
  toast(`已存成連結物件 <b>${esc(row.title)}</b>　<span class="lk-toast-m">${esc(row.id)}</span>`);
  return row;
}

/** 行內的網址 →「存成物件」：把網址從那一行拿掉，換成一張卡片。 */
function lkPromote(blockId, url) {
  if (!canWriteJournal()) return deny();
  syncAll();
  const b = bOf(blockId);
  if (!b || !TEXTY(b.t)) return;
  snap();
  b.text = b.text.split(url).join('').replace(/[ \t]{2,}/g, ' ').replace(/\s+$/, '');
  const row = lkCreate(url);
  lkInsert(row.id, blockId);
  audit('連結', row.title, '建立', '', row.url);
  render();
  toast(`已存成連結物件 <b>${esc(row.title)}</b>　<span class="lk-toast-m">${esc(row.id)}</span>`);
}

/* ---------- 一、可點：行內網址底下的連結 ---------- */
function lkChips(blockId, urls, promote) {
  // 點連結不該觸發那一行自己的點擊（對方日誌的行點一下是留言）。
  return `<div class="eb-links" contenteditable="false" onclick="event.stopPropagation()">${urls.map(u =>
    `<span class="eb-lk"><a href="${esc(u)}" target="_blank" rel="noopener noreferrer" title="${esc(u)}">${svg('goto', 11)}<span>${esc(lkShort(u, 48))}</span></a>${promote
      ? `<button type="button" title="存成連結物件：有參考碼、進物件索引、可以用 @ 引用" onclick="lkPromote('${blockId}','${u}')">存成物件</button>` : ''}</span>`
  ).join('')}</div>`;
}
const lkHas = b => !!b && TEXTY(b.t) && !!b.text && lkFind(b.text).length > 0;
/** 唯讀的行（對方的日誌、回顧）：只有可點的連結，沒有「存成物件」。 */
function lkRoChips(b) {
  return lkHas(b) ? lkChips(b.id, lkFind(b.text), false) : '';
}

const lkBaseEbHtml = ebHtml;
ebHtml = function (b) {
  const html = lkBaseEbHtml(b);
  if (!b || !TEXTY(b.t) || !b.text) return html;
  const urls = lkFind(b.text);
  if (!urls.length) return html;
  const cut = html.lastIndexOf('</div>');
  return html.slice(0, cut).replace('class="eb ', 'class="eb has-links ') + lkChips(b.id, urls, canWriteJournal()) + html.slice(cut);
};

/** 打字或貼上之後只重畫那一行底下的連結，不整頁重繪 —— 整頁重繪會把游標踢走。 */
function lkRepaint(tx) {
  const eb = tx && tx.closest ? tx.closest('.eb') : null;
  if (!eb) return;
  const urls = lkFind(tx.innerText);
  const cur = eb.querySelector(':scope > .eb-links');
  const key = urls.join('\n');
  if (cur && cur.dataset.key === key) return;
  if (cur) cur.remove();
  eb.classList.toggle('has-links', urls.length > 0);
  if (!urls.length) return;
  eb.insertAdjacentHTML('beforeend', lkChips(tx.dataset.id, urls, canWriteJournal()));
  eb.querySelector(':scope > .eb-links').dataset.key = key;
}

const lkBaseDocInput = docInput;
docInput = function (e) {
  lkBaseDocInput(e);
  const tx = e && e.target && e.target.closest ? e.target.closest('.eb-tx') : null;
  if (tx && tx.isConnected) lkRepaint(tx);
};

/* ---------- 二、貼上變元件 ---------- */
/* capture 階段，在既有的純文字 paste 監聽之前。
   只接管「空行上貼一個網址」：有字的行照常貼成文字，句子不會被拆成兩段。 */
root.addEventListener('paste', e => {
  if (!canWriteJournal()) return;
  const cd = e.clipboardData;
  if (!cd || (cd.files && cd.files.length)) return;
  const tx = e.target && e.target.closest ? e.target.closest('.eb-tx') : null;
  if (!tx) return;
  const url = lkSingle(cd.getData('text/plain'));
  if (!url) return;
  if (tx.innerText.trim()) return;
  e.preventDefault();
  e.stopPropagation();
  lkAdd(url, tx.dataset.id);
}, { capture: true, signal: controller.signal });

/* ---------- 三、卡片與抽屜 ---------- */
function lkOpen(rid) {
  const l = lkOf(rid);
  if (!l || !lkParse(l.url)) return toast('這個連結已經不存在');
  window.open(l.url, '_blank', 'noopener,noreferrer');
}
function lkCopy(rid) {
  const l = lkOf(rid);
  if (!l) return;
  navigator.clipboard?.writeText(l.url).then(() => toast('已複製網址'), () => toast('複製失敗'));
}
function lkCopyCode(rid) {
  navigator.clipboard?.writeText(rid).then(() => toast('已複製參考碼'), () => toast('複製失敗'));
}

/** 這個連結在所有日誌與文件段落裡被嵌入幾次。 */
function lkRefCount(rid) {
  let n = 0;
  const hit = b => { if (b.t === 'obj' && b.obj && b.obj.ty === 'link' && b.obj.rid === rid) n += 1; };
  const books = DB.journalBooks || { team: { yz: DB.journal } };
  for (const sp of Object.keys(books)) for (const who of Object.keys(books[sp] || {})) {
    const book = books[sp][who] || {};
    for (const day of Object.keys(book)) ((book[day] && book[day].blocks) || []).forEach(hit);
  }
  (DB.docObjects || []).forEach(d => (d.secs || []).forEach(sec => ensureSecBlocks(sec).forEach(hit)));
  return n;
}

function lkCard(b) {
  const l = lkOf(b.obj.rid);
  if (!l) return '<div class="eb-obj">連結已刪除</div>';
  const refs = lkRefCount(l.id);
  return `<div class="eb-obj lk-card" onclick="lkOpen('${l.id}')" title="開啟 ${esc(l.url)}">
    <div class="eb-obj-h"><span class="chip c-t">連結</span><span class="ti">${esc(l.title)}</span>
      <span class="m lk-code">${esc(l.id)}</span></div>
    <div class="lk-url">${svg('goto', 11)}<span>${esc(lkShort(l.url, 90))}</span></div>
    ${l.note ? `<div class="lk-note">${esc(l.note)}</div>` : ''}
    <div class="eb-obj-p">
      <span class="pf" role="button" tabindex="0" onclick="event.stopPropagation();lkCopy('${l.id}')">複製網址</span>
      <span class="pf" role="button" tabindex="0" onclick="event.stopPropagation();formLink('${l.id}')">改名稱</span>
      <span class="pf" role="button" tabindex="0" onclick="event.stopPropagation();openDrawer('link','${l.id}')">詳情</span>
      ${refs > 1 ? `<span class="pf">被引用 <b>${refs}</b> 次</span>` : ''}
      ${l.space === 'personal' ? '<span class="pf"><b>私人</b></span>' : ''}
    </div></div>`;
}

function formLink(id, blockId) {
  const e = id ? lkOf(id) : null;
  if (e && e.author && e.author !== DB.me && !isOwner()) return deny();
  openForm({
    crumb: e ? '連結 · ' + e.id : '#連結',
    title: e ? '編輯連結' : '召喚：連結',
    sub: e ? '改名稱不會改變參考碼；引用它的地方會一起更新' : '貼上網址，存成一個可以被 @ 引用的物件',
    fields: [
      { k: 'url', label: '網址', req: true, ph: 'https://…' },
      { k: 'title', label: '名稱', ph: '留空＝依網域自動命名' },
      { k: 'note', label: '備註', type: 'textarea', rows: 2, ph: '這個連結是什麼、為什麼留著' }
    ],
    values: e ? { url: e.url, title: e.titleAuto ? '' : e.title, note: e.note || '' } : { url: '', title: '', note: '' },
    effects: e ? ['日誌卡片、物件索引與 @ 引用同步更新'] : ['日誌多一張連結卡片', '進入物件索引，可以用 @ 引用'],
    onDelete: e
      ? () => confirmDelete('連結', e.title, `日誌裡引用它的 <b>${lkRefCount(e.id)}</b> 張卡片會顯示「連結已刪除」；那幾行不會被刪掉。`, () => {
        const at = DB.links.indexOf(e);
        commit('delete', '連結', e.title, () => {
          DB.links = DB.links.filter(l => l.id !== e.id);
          return ['物件索引移除這一筆'];
        }, () => { DB.links.splice(at, 0, e); });
        closeDrawer();
      })
      : null,
    onSave: v => {
      const url = String(v.url || '').trim();
      if (!lkParse(url)) throw Error('請輸入 http 或 https 開頭的網址');
      const title = String(v.title || '').trim();
      if (!e) {
        const row = lkAdd(url, blockId, title);
        if (row && v.note) row.note = v.note;
        return;
      }
      const before = { ...e };
      commit('update', '連結', title || e.title, () => {
        Object.assign(e, { url, title: title || lkDefaultTitle(url), titleAuto: !title, note: v.note || '' });
        return ['卡片、索引與引用處同步更新'];
      }, () => Object.assign(e, before));
    }
  });
}

DRAWERS.link = rid => {
  const l = lkOf(rid);
  if (!l) return { crumb: '連結', title: '找不到連結', body: '', foot: '' };
  return {
    crumb: '連結',
    title: esc(l.title),
    sub: esc(lkHost(l.url)) + (l.day ? ' · ' + l.day : ''),
    body: `<div class="ast-meta">
        <span>參考碼 <button class="ast-code" onclick="lkCopyCode('${l.id}')" title="複製">${esc(l.id)}</button></span>
        <span>建立者 <b>${esc(person(l.author))}</b></span>
        <span>可見範圍 <b>${l.space === 'personal' ? '只有我' : '全員'}</b></span>
        <span>被引用 <b>${lkRefCount(l.id)}</b> 次</span>
      </div>
      <a class="lk-full" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${svg('goto', 12)}<span>${esc(l.url)}</span></a>
      ${l.note ? `<div class="lk-note">${esc(l.note)}</div>` : ''}`,
    foot: `<button class="btn pri" onclick="lkOpen('${l.id}')">${svg('goto', 13)} 開啟連結</button>
      <button class="btn" onclick="lkCopy('${l.id}')">${svg('copy', 13)} 複製網址</button>
      <button class="btn" onclick="formLink('${l.id}')">${svg('pen', 13)} 編輯</button>`
  };
};

/* ---------- 接進既有的物件機制 ---------- */
const lkBaseObjHtml = objHtml;
objHtml = function (b) {
  if (b && b.obj && b.obj.ty === 'link') return lkCard(b);
  return lkBaseObjHtml(b);
};

const lkBaseMentionHits = mentionHits;
mentionHits = function (q) {
  const out = lkBaseMentionHits(q);
  const s = (q || '').toLowerCase();
  (DB.links || []).forEach(l => {
    if (l.space === 'personal' && l.author !== DB.me) return;
    if (s && !(l.title + l.id + l.url).toLowerCase().includes(s)) return;
    out.push({ mention: true, ty: 'link', rid: l.id, k: l.id, nm: l.title, ds: lkShort(l.url, 44) + (l.day ? ' · ' + l.day : ''), ic: 'goto', g: '連結' });
  });
  return out.slice(0, 40);
};

const lkBaseObjJump = objJump;
objJump = function (ty, rid) {
  if (ty === 'link') return openDrawer('link', rid);
  return lkBaseObjJump(ty, rid);
};

SUMMON[1].items.push({ k: 'link', nm: '連結', ds: '貼上網址，存成可以被 @ 引用的物件', ic: 'goto' });
const lkBaseSummonObject = summonObject;
summonObject = function (ty, blockId, seed) {
  if (ty === 'link') return formLink(null, blockId);
  return lkBaseSummonObject(ty, blockId, seed);
};

/* 物件索引：連結有自己的帳本。搜尋語料含網址與備註 —— 人記得的常常是網域，不是名稱。 */
OI_LEDGERS.link = {
  nm: '連結', chip: 'c-t',
  list: () => (DB.links || []).filter(l => l.space !== 'personal' || l.author === DB.me),
  day: x => x.day || '',
  nameOf: x => x.title || x.url,
  bodyOf: x => [x.title, x.url, x.note || ''].filter(Boolean).join(' ')
};
