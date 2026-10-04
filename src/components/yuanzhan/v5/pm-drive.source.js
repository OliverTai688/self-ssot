/* ==================================================================
   專案 · 檔案（PLN-075 S3 Wave 3b · 提案 C 的資源樹）

   左：一棵資料夾樹。右：選到的那一夾 —— 屬性、子資料夾、檔案表。
   樹只在這個分頁內，窄螢幕收到主欄上方，不是模組級的常駐側欄（INTEGRATION-DECISION §3）。

   收件匣是樹上 kind='INBOX' 的**真資料夾**，不是另一個分頁、也不是旗標：
   分散上傳先落這裡，整理＝只改檔案的 folderId／filedAt，R2 上的 bytes 一個都不動。

   寫入路徑（INTEGRATION-DECISION §6）：
     資料夾樹的 CRUD  → commit()，落在 folders 集合，走 diff 佇列
     檔案 bytes 與歸檔 → /api/company/operating/drive 的 route handler（預簽網址）
   ================================================================== */

var PMV = PMV || {};

const PM_FOLDER_KINDS = ['GENERIC', 'PROPOSAL', 'CONTRACT', 'MILESTONE', 'MEETING', 'SHARED', 'INTERNAL', 'REVISION', 'MATERIAL', 'FINANCE'];

/* ---------- 規則（伺服器同樣強制；這裡是為了在送出前就說得出理由） ---------- */
const pmNorm = s => String(s || '').normalize('NFC').trim().toLowerCase();

function pmNameProblem(parentId, name, selfId) {
  const n = String(name || '').trim();
  if (!n) return '請輸入名稱';
  if (n.length > 120) return '名稱最多 120 個字';
  if (/[\\/]/.test(n)) return '名稱不能包含斜線';
  if (pmChildren(parentId).some(f => f.id !== selfId && pmNorm(f.name) === pmNorm(n))) return '這個資料夾裡已經有「' + n + '」';
  return '';
}
/** 祖先鏈裡最嚴的那一級；子資料夾不能比它寬。 */
function pmVisFloor(folder) {
  return pmTrail(folder).reduce((rank, f) => Math.max(rank, (PM_VIS[f.visibility] || PM_VIS.INTERNAL_ONLY).rank), 0);
}
function pmVisOptions(parent, kind) {
  const floor = parent ? pmVisFloor(parent) : 0;
  return Object.keys(PM_VIS)
    .filter(k => PM_VIS[k].rank >= floor)
    .filter(k => !(k === 'CLIENT_VISIBLE' && PM_NO_CLIENT.includes(kind)))
    .map(k => [k, PM_VIS[k].label]);
}
const pmNoIndex = folder => pmTrail(folder).some(f => f.visibility === 'RESTRICTED_NO_INDEX');
const pmFolderIcon = f => (f.kind === 'INBOX' ? 'inbox' : f.kind === 'ROOT' ? 'layers' : f.kind === 'MEETING' ? 'calendar' : f.kind === 'MILESTONE' ? 'flag' : 'folder');
const pmPathLabel = f => pmTrail(f).slice(1).map(x => x.name).join(' / ') || f.name;
/**
 * 「整理到哪裡」的選單：對客戶可見的資料夾排到最後並標出來。
 * 預設選項不能是客戶看得到的地方 —— 手滑一下就把內部檔案放出去了。
 */
function pmFilingOptions(folders) {
  const client = f => pmTrail(f).every(x => x.visibility === 'CLIENT_VISIBLE' || x.kind === 'ROOT') && f.visibility === 'CLIENT_VISIBLE';
  return [...folders.filter(f => !client(f)), ...folders.filter(client)]
    .map(f => [f.id, pmPathLabel(f) + (client(f) ? '　（客戶可見）' : '')]);
}

/* ---------- 啟用 ---------- */

/**
 * 預設樹長成 Owner 已經在用的樣子：[共用]、開案前、專案啟動［正式資料］、
 * 里程碑交付（底下放 YYYYMMDD_Mnn_<名稱>）、會議（底下放 YYYYMMDD <事件>）、
 * 修改需求（下一期的入口）、(僅內部)。
 */
function pmDriveEnable(mode) {
  const p = P(S.proj);
  if (!p || pmRoot(p.id)) return;
  commit('create', '專案硬碟', p.t, () => {
    let order = 0;
    const mk = (parentId, kind, name, visibility) => {
      const f = {
        id: nid('FLD'), projectId: p.id, parentId, kind, name, visibility: visibility || 'INTERNAL_ONLY',
        sortOrder: kind === 'INBOX' || kind === 'ROOT' ? 0 : (order += 10), isSystem: kind === 'ROOT' || kind === 'INBOX',
        space: 'team', author: DB.me, note: '', createdAt: Date.now()
      };
      DB.folders.push(f);
      return f.id;
    };
    const top = mk('', 'ROOT', '專案硬碟');
    const inbox = mk(top, 'INBOX', '收件匣');
    pmSel(p.id).folder = inbox;
    if (mode !== 'full') return ['建立專案硬碟與收件匣'];
    mk(top, 'SHARED', '[共用] 共用資料夾', 'CLIENT_VISIBLE');
    mk(top, 'PROPOSAL', '開案前');
    const start = mk(top, 'GENERIC', '專案啟動［正式資料］');
    mk(start, 'CONTRACT', '合約與報價');
    mk(top, 'GENERIC', '里程碑交付');
    mk(top, 'GENERIC', '會議');
    mk(top, 'REVISION', '修改需求');
    mk(top, 'MATERIAL', '素材');
    mk(top, 'INTERNAL', '(僅內部)');
    pmSel(p.id).folder = top;
    return ['建立專案硬碟、收件匣與預設資料夾', '只有「[共用]」對客戶可見，其餘一律僅內部'];
  });
}

/* ---------- 資料夾 CRUD ---------- */
function pmFolderPick(id) {
  const f = pmFolder(id);
  if (!f) return;
  pmSel(f.projectId).folder = id;
  S.pmFold['fld:' + id] = true;
  render();
}
function pmTreeToggle(id, open) {
  S.pmFold['fld:' + id] = !open;
  render();
}

function formPmFolder(parentId, preset) {
  const parent = pmFolder(parentId);
  if (!parent) return;
  if (parent.kind === 'INBOX') return toast('收件匣底下不放資料夾；請在別的位置建立，再把檔案整理過去');
  if (pmTrail(parent).length >= 12) return toast('資料夾最多 12 層');
  const pre = preset || {};
  openForm({
    crumb: pmPathLabel(parent),
    title: '新增資料夾',
    sub: '建立在「' + esc(parent.name) + '」底下',
    fields: [
      { k: 'name', label: '名稱', req: true, ph: '例如：20261015 期中會議' },
      { k: 'kind', label: '用途', type: 'select', opts: PM_FOLDER_KINDS.map(k => [k, PM_KIND[k]]), hint: '合約與「僅內部」兩種用途永遠不能設為客戶可見' },
      { k: 'visibility', label: '可見性', type: 'chips', req: true, opts: pmVisOptions(parent, pre.kind || 'GENERIC'), hint: '不能比上層更寬。最高敏感＝不建立全文索引，搜尋也找不到內容' }
    ],
    values: { name: pre.name || '', kind: pre.kind || 'GENERIC', visibility: parent.visibility === 'CLIENT_VISIBLE' ? 'INTERNAL_ONLY' : parent.visibility },
    effects: ['資料夾樹多一個節點', '上傳可以直接指定到這裡'],
    onSave: v => {
      const bad = pmNameProblem(parent.id, v.name);
      if (bad) throw Error(bad);
      if (v.visibility === 'CLIENT_VISIBLE' && PM_NO_CLIENT.includes(v.kind)) throw Error('這種用途的資料夾不能設為客戶可見');
      if ((PM_VIS[v.visibility] || PM_VIS.INTERNAL_ONLY).rank < pmVisFloor(parent)) throw Error('可見性不能比上層資料夾更寬');
      const id = nid('FLD');
      commit('create', '資料夾', v.name.trim(), () => {
        DB.folders.push({
          id, projectId: parent.projectId, parentId: parent.id, kind: v.kind, name: v.name.trim(), visibility: v.visibility,
          sortOrder: pmChildren(parent.id).reduce((m, f) => Math.max(m, f.sortOrder || 0), 0) + 10,
          isSystem: false, space: 'team', author: DB.me, note: '', createdAt: Date.now()
        });
        pmSel(parent.projectId).folder = id;
        S.pmFold['fld:' + parent.id] = true;
        return ['建立在 <b>' + esc(pmPathLabel(parent)) + '</b> 底下'];
      });
      if (pre.after) pre.after(id);
    }
  });
}

function formPmFolderEdit(id) {
  const f = pmFolder(id);
  if (!f) return;
  if (f.isSystem) return toast('系統資料夾不能改名或刪除');
  const parent = pmFolder(f.parentId);
  openForm({
    crumb: pmPathLabel(f),
    title: '資料夾設定',
    sub: '改名與可見性。搬移位置請用「搬移」',
    fields: [
      { k: 'name', label: '名稱', req: true },
      { k: 'visibility', label: '可見性', type: 'chips', req: true, opts: pmVisOptions(parent, f.kind), hint: '調得更嚴時，底下比它寬的資料夾會一起收緊' },
      { k: 'note', label: '備註', type: 'textarea', rows: 2 }
    ],
    values: { name: f.name, visibility: f.visibility, note: f.note || '' },
    effects: ['檔案本體不會被移動或重新命名', '改成最高敏感後，夾內檔案不再建立全文索引'],
    onDelete: () => pmFolderDelete(f.id),
    onSave: v => {
      const bad = pmNameProblem(f.parentId, v.name, f.id);
      if (bad) throw Error(bad);
      commit('update', '資料夾', v.name.trim(), () => {
        const eff = [];
        if (f.name !== v.name.trim()) { eff.push(`改名為 <b>${esc(v.name.trim())}</b>`); f.name = v.name.trim(); }
        f.note = v.note;
        if (f.visibility !== v.visibility) {
          f.visibility = v.visibility;
          const rank = PM_VIS[v.visibility].rank;
          const tightened = pmDescendants(f.id).filter(c => (PM_VIS[c.visibility] || PM_VIS.INTERNAL_ONLY).rank < rank);
          tightened.forEach(c => { c.visibility = v.visibility; });
          eff.push(`可見性 → <b>${PM_VIS[v.visibility].label}</b>` + (tightened.length ? `，底下 ${tightened.length} 個資料夾一起收緊` : ''));
        }
        return eff.length ? eff : ['備註已更新'];
      });
    }
  });
}

function formPmFolderMove(id) {
  const f = pmFolder(id);
  if (!f) return;
  if (f.isSystem) return toast('系統資料夾不能搬移');
  const banned = new Set([f.id, ...pmDescendants(f.id).map(x => x.id)]);
  const targets = pmFolders(f.projectId).filter(x => !banned.has(x.id) && x.kind !== 'INBOX' && x.id !== f.parentId);
  if (!targets.length) return toast('沒有可以搬過去的位置');
  openForm({
    crumb: pmPathLabel(f),
    title: '搬移資料夾',
    sub: '整棵子樹一起搬；檔案本體不動',
    fields: [{ k: 'parentId', label: '搬到哪裡', type: 'select', req: true, opts: targets.map(x => [x.id, x.kind === 'ROOT' ? '專案硬碟（最上層）' : pmPathLabel(x)]) }],
    values: { parentId: targets[0].id },
    effects: ['只改資料夾的位置，R2 上的檔案不會被複製或刪除', '可見性不會因為搬移而變寬'],
    onSave: v => {
      const target = pmFolder(v.parentId);
      if (!target) throw Error('找不到目標資料夾');
      const bad = pmNameProblem(target.id, f.name, f.id);
      if (bad) throw Error(bad);
      const depth = pmTrail(target).length + 1 + pmDescendants(f.id).reduce((m, x) => Math.max(m, pmTrail(x).length - pmTrail(f).length), 0);
      if (depth > 13) throw Error('搬過去會超過 12 層');
      commit('update', '資料夾', f.name, () => {
        f.parentId = target.id;
        f.sortOrder = pmChildren(target.id).reduce((m, x) => Math.max(m, x.sortOrder || 0), 0) + 10;
        const floor = pmVisFloor(target);
        const key = Object.keys(PM_VIS).find(k => PM_VIS[k].rank === floor);
        const tightened = [f, ...pmDescendants(f.id)].filter(x => (PM_VIS[x.visibility] || PM_VIS.INTERNAL_ONLY).rank < floor);
        tightened.forEach(x => { x.visibility = key; });
        S.pmFold['fld:' + target.id] = true;
        return ['搬到 <b>' + esc(target.kind === 'ROOT' ? '專案硬碟' : pmPathLabel(target)) + '</b>', ...(tightened.length ? [`${tightened.length} 個資料夾的可見性跟著新位置收緊`] : [])];
      });
    }
  });
}

function pmFolderDelete(id) {
  const f = pmFolder(id);
  if (!f) return;
  if (f.isSystem) return toast('系統資料夾不能刪除');
  if (pmChildren(f.id).length || pmAssetsIn(f.id).length) return toast('資料夾裡還有東西；先把檔案與子資料夾搬走再刪');
  const meeting = DB.occasions.find(o => o.folderId === f.id);
  const linkedMs = DB.milestones.filter(m => m.folderId === f.id);
  const ripple = [meeting ? `會議「${esc(meeting.title)}」的資料夾連結會被解除` : '', linkedMs.length ? `${linkedMs.length} 個里程碑的交付夾連結會被解除` : ''].filter(Boolean).join('<br>');
  confirmDelete('資料夾', f.name, ripple, () => {
    commit('delete', '資料夾', f.name, () => {
      DB.folders = DB.folders.filter(x => x.id !== f.id);
      if (meeting) meeting.folderId = '';
      linkedMs.forEach(m => { m.folderId = ''; });
      pmSel(f.projectId).folder = f.parentId;
      return ['資料夾樹移除該節點'];
    });
    closeDrawer();
  });
}

/* ---------- 檔案：上傳、歸檔、下載 ---------- */
const PM_UP = { name: '', pct: 0, left: 0 };
function pmUpPaint() {
  const el = getById('pmUpState');
  if (!el) return;
  el.textContent = PM_UP.name ? '上傳中　' + PM_UP.name + '　' + PM_UP.pct + '%' + (PM_UP.left > 1 ? '　（還有 ' + (PM_UP.left - 1) + ' 個）' : '') : '';
  el.hidden = !PM_UP.name;
}

async function pmUploadOne(p, folderId, file) {
  const verdict = astClassify({ name: file.name, bytes: file.size, mimeType: file.type });
  if (!verdict.ok) throw Error(verdict.error);
  const target = pmFolder(folderId) || pmInbox(p.id);
  if (!target) throw Error('這個專案還沒有啟用專案硬碟');
  // 直接丟進指定資料夾＝已整理；落進收件匣＝待整理。
  const filed = target.kind !== 'INBOX';
  const now = Date.now();
  const row = {
    id: '', assetId: '', name: file.name, kind: verdict.kind, objectKey: '', bytes: file.size, mime: file.type || '',
    status: 'ready', space: 'team', author: DB.me, day: pmDay(now), bornAt: now, text: '',
    projectId: p.id, folderId: target.id, filedAt: filed ? now : 0
  };
  if (OP_LIVE) {
    // 目標資料夾可能才剛建、還在佇列裡；伺服器找不到它就會拒絕這次上傳。
    await pmSaved();
    const endpoint = '/api/company/operating/drive/uploads';
    const signed = await pmApi(endpoint, {
      method: 'POST',
      body: { projectId: p.id, name: file.name, contentType: file.type || null, bytes: file.size, ...(filed ? { folderId: target.id } : {}) }
    });
    try {
      await astPut(signed.uploadUrl, file, pct => { PM_UP.pct = pct; pmUpPaint(); });
      await pmApi(endpoint, { method: 'PATCH', body: { projectId: p.id, assetId: signed.assetId } });
    } catch (e) {
      // 沒 finalize 的列會停在 uploading，24 小時後才被孤兒清理收走；失敗就直接回報。
      await pmApi(endpoint, { method: 'PATCH', body: { projectId: p.id, assetId: signed.assetId, outcome: 'failed' } }).catch(() => {});
      throw e;
    }
    Object.assign(row, { id: signed.refCode, assetId: signed.assetId, objectKey: signed.objectKey, kind: signed.kind || verdict.kind });
  } else {
    row.id = nid('AST');
    row.local = true;
  }
  DB.assets.unshift(row);
  audit('檔案', row.name, '上傳', '', 1);
  return row;
}

async function pmUploadFiles(p, folderId, files) {
  const done = [];
  PM_UP.left = files.length;
  for (const file of files) {
    PM_UP.name = file.name;
    PM_UP.pct = 0;
    pmUpPaint();
    try {
      done.push(await pmUploadOne(p, folderId, file));
    } catch (e) {
      toast(`<b>${esc(file.name)}</b> 沒有上傳：${esc(e && e.message ? e.message : '上傳失敗')}`);
    }
    PM_UP.left -= 1;
  }
  PM_UP.name = '';
  pmUpPaint();
  return done;
}

function pmUploadPick(folderId, after) {
  const p = P(S.proj);
  if (!p) return;
  const input = doc.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.setAttribute('aria-label', '選擇要上傳的檔案');
  input.style.display = 'none';
  root.append(input);
  input.onchange = async () => {
    const files = [...(input.files || [])];
    input.remove();
    if (!files.length) return;
    const done = await pmUploadFiles(p, folderId, files);
    if (!active) return;
    if (done.length) {
      const target = pmFolder(folderId) || pmInbox(p.id);
      toast(`已上傳 <b>${done.length}</b> 個檔案到「${esc(target ? target.name : '收件匣')}」` + (OP_LIVE ? '' : '　<span style="color:var(--text-3)">· 預覽模式不保存</span>'));
    }
    if (after) after(done);
    render();
  };
  input.click();
}

/** 歸檔＝只改 folderId／filedAt。R2 上的 bytes 不動，所以搬一萬個檔也只是資料列的更新。 */
async function pmFileAsset(rid, folderId) {
  const a = astOf(rid), target = pmFolder(folderId);
  if (!a || !target) throw Error('找不到檔案或資料夾');
  if (a.folderId === target.id) return a;
  if (OP_LIVE && a.assetId) {
    await pmSaved();
    await pmApi('/api/company/operating/drive', { method: 'PATCH', body: { action: 'file', assetId: a.assetId, folderId: target.id } });
  }
  a.folderId = target.id;
  a.projectId = target.projectId;
  a.filedAt = target.kind === 'INBOX' ? 0 : Date.now();
  audit('檔案', a.name, '歸檔', '', target.name);
  return a;
}

async function pmAssetMove(rid) {
  const sel = getById('pmMoveTo');
  const target = sel ? pmFolder(sel.value) : null;
  if (!target) return toast('先選一個資料夾');
  try {
    await pmFileAsset(rid, target.id);
    pmDrawerClose();
    render();
    toast(`已整理到「<b>${esc(pmPathLabel(target))}</b>」　<span style="color:var(--text-3)">· 檔案本體沒有移動</span>`);
  } catch (e) {
    toast(esc(e && e.message ? e.message : '整理失敗'));
  }
}

function formPmFileAll(fromId) {
  const from = pmFolder(fromId);
  if (!from) return;
  const list = pmAssetsIn(from.id);
  if (!list.length) return toast('這裡沒有檔案');
  const targets = pmFolders(from.projectId).filter(f => f.id !== from.id && f.kind !== 'ROOT' && f.kind !== 'INBOX');
  if (!targets.length) return toast('先建立一個資料夾，才有地方可以整理過去');
  openForm({
    crumb: pmPathLabel(from),
    title: '整理全部 ' + list.length + ' 個檔案',
    sub: '一次搬到同一個資料夾；要分開放的話，請逐個點開檔案整理',
    saveLabel: '整理',
    fields: [{ k: 'folderId', label: '搬到哪裡', type: 'select', req: true, opts: pmFilingOptions(targets) }],
    values: { folderId: pmFilingOptions(targets)[0][0] },
    effects: ['只改檔案的位置紀錄，R2 上的檔案本體不動'],
    onSave: v => {
      (async () => {
        let ok = 0;
        for (const a of list) {
          try { await pmFileAsset(a.id, v.folderId); ok += 1; } catch (e) { toast(`<b>${esc(a.name)}</b>：${esc(e && e.message ? e.message : '整理失敗')}`); }
        }
        if (!active) return;
        render();
        const target = pmFolder(v.folderId);
        if (ok) toast(`已整理 <b>${ok}</b> 個檔案到「${esc(target ? pmPathLabel(target) : '')}」`);
      })();
    }
  });
}

async function pmAssetOpen(rid) {
  const a = astOf(rid);
  if (!a) return;
  if (!OP_LIVE || !a.objectKey) return toast('預覽模式的示範檔案沒有實體內容');
  try {
    const out = await pmApi('/api/company/operating/drive/uploads?projectId=' + encodeURIComponent(a.projectId) + '&key=' + encodeURIComponent(a.objectKey));
    window.open(out.downloadUrl, '_blank', 'noopener');
  } catch (e) {
    toast(esc(e && e.message ? e.message : '取得檔案失敗'));
  }
}

function pmAssetCopy(rid) {
  if (navigator.clipboard) navigator.clipboard.writeText(rid).then(() => toast('已複製參考碼 <b>' + esc(rid) + '</b>'), () => toast('無法複製'));
}

function pmAssetDrawer(rid) {
  const a = astOf(rid);
  if (!a) return;
  const here = pmFolder(a.folderId);
  const targets = pmFolders(a.projectId).filter(f => f.kind !== 'ROOT' && f.id !== a.folderId);
  const noIndex = here ? pmNoIndex(here) : false;
  pmDrawer({
    crumb: (here ? pmPathLabel(here) : '專案硬碟') + ' / ' + a.id,
    title: a.name,
    sub: a.filedAt ? '已整理' : '待整理 · 還在收件匣',
    body: `<div class="pm-sec"><h4>檔案</h4><dl class="pm-kv">
        <dt>參考碼</dt><dd>${esc(a.id)}</dd>
        <dt>類型</dt><dd>${esc(AST_LABELS[a.kind] || a.kind || '—')}</dd>
        <dt>大小</dt><dd>${astSize(a.bytes)}</dd>
        <dt>上傳者</dt><dd>${esc(pmWho(a.author))}</dd>
        <dt>上傳時間</dt><dd>${esc(a.day || pmDay(a.bornAt))} ${pmClock(a.bornAt)}</dd>
        <dt>位置</dt><dd>${esc(here ? pmPathLabel(here) : '—')}</dd>
        <dt>全文索引</dt><dd>${noIndex ? '不建立（最高敏感）' : '可建立'}</dd>
      </dl></div>
      <div class="pm-sec"><h4>整理到別的資料夾</h4>
        ${targets.length
          ? `<div class="pm-move"><select id="pmMoveTo" aria-label="目標資料夾">${pmFilingOptions(targets).map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>
             <button class="btn pri" onclick="pmAssetMove('${a.id}')">搬到這裡</button></div>
             <p class="pm-dim">只改位置紀錄；檔案本體不會被複製、移動或重新命名。</p>`
          : '<p class="pm-dim">還沒有別的資料夾可以整理過去。</p>'}
      </div>`,
    actions: `<button class="btn pri" onclick="pmAssetOpen('${a.id}')">${svg('download', 13)} 下載</button>
      <button class="btn" onclick="pmAssetCopy('${a.id}')">${svg('copy', 13)} 複製參考碼</button>`
  });
}

/* ---------- 版面 ---------- */
function pmTreeNode(f, depth, curId, trail) {
  const kids = pmChildren(f.id);
  const explicit = S.pmFold['fld:' + f.id];
  const open = explicit === undefined ? (depth === 0 || trail.has(f.id)) : explicit;
  const n = pmAssetsIn(f.id).length;
  const vis = f.visibility === 'CLIENT_VISIBLE'
    ? `<span class="pm-tr-v pri" title="客戶可見">${svg('goto', 10)}</span>`
    : f.visibility === 'RESTRICTED_NO_INDEX' ? `<span class="pm-tr-v crit" title="最高敏感 · 不建索引">${svg('lock', 10)}</span>` : '';
  return `<div class="pm-tr-row ${f.id === curId ? 'on' : ''}" style="--d:${depth}">
      ${kids.length
        ? `<button type="button" class="pm-tr-tw ${open ? 'open' : ''}" aria-expanded="${open}" aria-label="展開或收合" onclick="pmTreeToggle('${f.id}',${open})">${svg('chevronRight', 11)}</button>`
        : '<span class="pm-tr-tw"></span>'}
      <button type="button" class="pm-tr-name" aria-current="${f.id === curId}" onclick="pmFolderPick('${f.id}')">${svg(pmFolderIcon(f), 13)}<span>${esc(f.name)}</span></button>
      ${vis}${n ? `<span class="pm-tr-n ${f.kind === 'INBOX' ? 'warn' : ''}">${n}</span>` : ''}
    </div>${open ? kids.map(k => pmTreeNode(k, depth + 1, curId, trail)).join('') : ''}`;
}

function pmFolderMain(p, f) {
  const trail = pmTrail(f);
  const kids = pmChildren(f.id);
  const files = pmAssetsIn(f.id);
  const vis = PM_VIS[f.visibility] || PM_VIS.INTERNAL_ONLY;
  const meeting = DB.occasions.find(o => o.folderId === f.id);
  const linkedMs = DB.milestones.filter(m => m.folderId === f.id);
  const inbox = f.kind === 'INBOX';

  const crumb = `<nav class="pm-crumb" aria-label="位置">${trail.map((x, i) =>
    i === trail.length - 1
      ? `<span aria-current="page">${esc(x.name)}</span>`
      : `<button type="button" onclick="pmFolderPick('${x.id}')">${esc(x.name)}</button>${svg('chevronRight', 10)}`
  ).join('')}</nav>`;

  const acts = [];
  if (!inbox) acts.push(`<button class="btn" onclick="formPmFolder('${f.id}')">${svg('plus')} 資料夾</button>`);
  acts.push(`<button class="btn pri" onclick="pmUploadPick('${f.id}')">${svg('plus')} 上傳</button>`);
  if (inbox && files.length) acts.push(`<button class="btn" onclick="formPmFileAll('${f.id}')">${svg('arrowRight')} 整理全部</button>`);
  if (!f.isSystem) {
    acts.push(`<button class="btn" onclick="formPmFolderEdit('${f.id}')">${svg('pen')} 設定</button>`);
    acts.push(`<button class="btn" onclick="formPmFolderMove('${f.id}')">${svg('arrowin')} 搬移</button>`);
  }

  const head = `<div class="pm-dv-h">
      <h3>${svg(pmFolderIcon(f), 15)}<span>${esc(f.name)}</span></h3>
      <span class="pm-chip">${PM_KIND[f.kind] || f.kind}</span>
      <span class="pm-chip ${vis.tone}">${f.visibility === 'RESTRICTED_NO_INDEX' ? svg('lock', 10) + ' ' : ''}${vis.label}</span>
      <span class="pm-sp"></span>
      <div class="pm-bar tight">${acts.join('')}</div>
    </div>
    <div class="pm-up" id="pmUpState" role="status" aria-live="polite" hidden></div>`;

  const notes = [];
  if (inbox) notes.push(`<p class="pm-hint">${svg('inbox', 12)}<span>分散上傳的檔案先落在這裡。整理＝把它指到正確的資料夾；檔案本體不會被移動。</span></p>`);
  if (pmNoIndex(f)) notes.push(`<p class="pm-hint crit">${svg('lock', 12)}<span>這裡的檔案不建立全文索引：資料夾權限擋不住全文搜尋，所以敏感內容連索引都不留。</span></p>`);
  if (meeting) notes.push(`<p class="pm-hint">${svg('calendar', 12)}<span>這是會議「${esc(meeting.title)}」（${meeting.onDate}）的資料夾。</span><button type="button" class="pm-link" onclick="pmJump('meeting',null,'檔案',{meeting:'${meeting.id}'})">看會議屬性</button></p>`);
  linkedMs.forEach(m => notes.push(`<p class="pm-hint">${svg('flag', 12)}<span>里程碑「${esc(m.title)}」的交付夾。</span><button type="button" class="pm-link" onclick="pmJump('plan','tree','檔案')">看計劃</button></p>`));

  const sub = kids.length
    ? pmBlock('資料夾', kids.length + ' 個', pmRows(kids.map(k => ({
      key: k.id, title: k.name, eyebrow: PM_KIND[k.kind] || '',
      meta: [
        ...(k.visibility === 'CLIENT_VISIBLE' ? [{ text: '客戶可見', tone: 'pri' }] : k.visibility === 'RESTRICTED_NO_INDEX' ? [{ text: '不建索引', tone: 'crit' }] : []),
        { text: pmAssetsIn(k.id).length + ' 檔', chip: false }
      ], go: true
    })), { id: 'pmDvKids', onPick: pmFolderPick }))
    : '';

  const table = pmTable(
    [
      { k: 'name', label: '名稱' },
      { k: 'kind', label: '類型', get: r => AST_LABELS[r.kind] || r.kind || '—', dim: true },
      { k: 'bytes', label: '大小', align: 'num', get: r => astSize(r.bytes), sortBy: r => r.bytes || 0 },
      { k: 'author', label: '上傳者', get: r => pmWho(r.author), dim: true },
      { k: 'day', label: '日期', align: 'mono', get: r => r.day || pmDay(r.bornAt) },
      { k: 'id', label: '參考碼', align: 'mono', dim: true }
    ],
    files,
    {
      id: 'pmDvFiles:' + f.id, search: files.length > 6, searchLabel: '篩選檔名', sort: { k: 'day', dir: 'desc' },
      rowKey: r => r.id, onPick: key => pmAssetDrawer(key),
      empty: inbox ? '收件匣是空的 —— 沒有待整理的檔案。' : '這個資料夾還沒有檔案。',
      foot: files.length ? '↑↓ 移動焦點 · Enter 開啟檔案' + (inbox ? ' · 點開後可以整理到別的資料夾' : '') : ''
    }
  );

  return crumb + head + notes.join('') + sub +
    pmBlock(inbox ? '待整理' : '檔案', files.length ? files.length + ' 個' : '', `<div data-pm-surface="primary">${table}</div>`);
}

PMV.drive = function (p) {
  if (!p) return '';
  const top = pmRoot(p.id);
  if (!top) {
    return pmEmpty(
      '這個專案還沒有專案硬碟。啟用之後會有一個收件匣（分散上傳先落這裡）與一棵可以自己整理的資料夾樹。',
      `<button class="btn pri" onclick="pmDriveEnable('full')">${svg('plus')} 啟用並建立預設資料夾</button>
       <button class="btn" onclick="pmDriveEnable('min')">只建立收件匣</button>`
    ) + `<p class="pm-dim pm-center">預設資料夾：[共用] 共用資料夾 · 開案前 · 專案啟動［正式資料］· 里程碑交付 · 會議 · 修改需求 · 素材 · (僅內部)</p>`;
  }
  const sel = pmSel(p.id);
  let cur = pmFolder(sel.folder);
  if (!cur || cur.projectId !== p.id) cur = top;
  const folders = pmFolders(p.id);
  const assets = pmAssets(p.id);
  const unfiled = pmUnfiled(p.id).length;

  const rail = pmRail([
    { label: '檔案', value: assets.length },
    { label: '待整理', value: unfiled, tone: unfiled ? 'warn' : '', note: unfiled ? '在收件匣' : '' },
    { label: '資料夾', value: folders.length - 1 },
    { label: '客戶可見', value: folders.filter(f => f.visibility === 'CLIENT_VISIBLE').length, unit: '夾' },
    { label: '最高敏感', value: folders.filter(f => f.visibility === 'RESTRICTED_NO_INDEX').length, unit: '夾' },
    { label: '容量', value: astSize(assets.reduce((n, a) => n + (a.bytes || 0), 0)) }
  ], { label: '專案硬碟重點數字' });

  const trail = new Set(pmTrail(cur).map(f => f.id));
  return rail + `<div class="pm-dv">
    <nav class="pm-dv-tree" aria-label="資料夾樹">${pmTreeNode(top, 0, cur.id, trail)}</nav>
    <div class="pm-dv-main">${pmFolderMain(p, cur)}</div>
  </div>`;
};
