/* ==================================================================
   專案 · 會議（PLN-075 S3 Wave 3b）

   時間序清單 ＋ 會議資料夾視圖。一個資料夾＝一場會議（OD-D）：
   資料面是既有的 occasions 集合加上 folderId（1:1）、cautions、guests，
   沒有另開一張會議表。

   四個屬性跟著資料夾走：參與者／產生時間／結論（recap）／注意事項（cautions）。
   結論是「這場會議產出了什麼」，注意事項是「下一次要先知道的前提」，兩者分開。

   夾內的四件套：錄音檔／逐字稿／完整紀錄／摘要。分類依檔案類型與檔名判斷
   （沒有另存欄位），所以照 Owner 既有的檔名慣例命名就會落到對的格子。

   兩條升級路徑在這裡：會議待辦 → 任務、結論 → 決議。
   ================================================================== */

var PMV = PMV || {};

const PM_KIT = [
  ['audio', '錄音檔', a => a.kind === 'audio' || a.kind === 'video' || /錄音|錄影|recording/i.test(a.name)],
  ['transcript', '逐字稿', a => /逐字稿|transcript/i.test(a.name)],
  ['minutes', '完整紀錄', a => /完整紀錄|完整記錄|會議紀錄|會議記錄|minutes/i.test(a.name)],
  ['summary', '摘要', a => /摘要|summary/i.test(a.name)]
];
/** 一個檔只落一格，依四件套的順序判斷；都不像的歸到「其他」。 */
function pmKitOf(a) {
  const hit = PM_KIT.find(k => k[2](a));
  return hit ? hit[0] : 'other';
}
function pmKitState(o) {
  const files = o.folderId ? pmAssetsIn(o.folderId) : [];
  const have = PM_KIT.filter(k => files.some(a => pmKitOf(a) === k[0])).length;
  return { files, have };
}
const pmMeetingPeople = o => [...(o.actorIds || []).map(pmWho), ...String(o.guests || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean)];

function pmMeetingPick(id) {
  const o = OCC(id);
  if (!o) return;
  pmSel(o.projectId).meeting = id;
  render();
}

/** 會議資料夾放在「會議」底下；沒有那個資料夾就放在硬碟最上層。 */
function pmMeetingParent(pid) {
  const top = pmRoot(pid);
  if (!top) return null;
  return pmChildren(top.id).find(f => f.name === '會議') || top;
}

/** withFolder：從「建立資料夾」按進來時，預設就幫這場既有的會議建資料夾。 */
function formPmMeeting(id, withFolder) {
  const p = P(S.proj);
  if (!p) return;
  const e = id ? OCC(id) : null;
  if (e && !opGuard(e)) return;
  const canFolder = !!pmRoot(p.id) && !(e && e.folderId);
  openForm({
    crumb: e ? '會議 · ' + e.id : '新會議',
    title: e ? '編輯會議' : '新增會議',
    sub: '一場會議＝一個資料夾；參與者、結論與注意事項跟著資料夾走',
    fields: [
      { k: 'title', label: '會議名稱', req: true, ph: '例如：期中檢視' },
      { k: 'onDate', label: '日期', type: 'date', req: true, half: true },
      { k: 'at', label: '時間', half: true, ph: '14:00–15:30' },
      { k: 'actors', label: '內部參與者', type: 'mchips', opts: PEOPLE_OPTS() },
      { k: 'guests', label: '外部參與者', ph: '客戶窗口、顧問…，用頓號分開' },
      { k: 'place', label: '地點', ph: '客戶會議室／線上' },
      { k: 'recap', label: '結論', type: 'textarea', rows: 3, ph: '這場會議決定了什麼、產出了什麼' },
      { k: 'cautions', label: '注意事項', type: 'textarea', rows: 2, ph: '下一次開會前要先知道的前提、對方的禁忌、還沒解的問題' },
      ...(canFolder ? [{ k: 'folder', label: '會議資料夾', type: 'chips', opts: [['yes', '建立資料夾'], ['no', '先不建']], hint: '資料夾名稱會是「YYYYMMDD 會議名稱」，放在硬碟的「會議」底下' }] : [])
    ],
    values: e
      ? { title: e.title, onDate: e.onDate, at: e.at || '', actors: (e.actorIds || []).join(','), guests: e.guests || '', place: e.place || '', recap: e.recap || '', cautions: e.cautions || '', folder: withFolder ? 'yes' : 'no' }
      : { title: '', onDate: TODAY, at: '', actors: DB.me, guests: '', place: '', recap: '', cautions: '', folder: 'yes' },
    effects: ['會議分頁的時間序與總覽的時間流同步', '同時出現在營運 · 日曆'],
    onDelete: e
      ? () => confirmDelete('會議', e.title, e.folderId ? '會議資料夾與裡面的檔案不會被刪除，只解除連結。' : '', () => {
        commit('delete', '會議', e.title, () => {
          DB.occasions = DB.occasions.filter(o => o.id !== e.id);
          return ['時間序與日曆移除這場會議'];
        });
        closeDrawer();
      })
      : null,
    onSave: v => {
      const body = {
        title: v.title, onDate: v.onDate, endOn: v.onDate, at: v.at, place: v.place,
        actorIds: String(v.actors || '').split(',').map(s => s.trim()).filter(Boolean),
        guests: v.guests, recap: v.recap, cautions: v.cautions
      };
      const wantFolder = canFolder && v.folder === 'yes';
      const parent = wantFolder ? pmMeetingParent(p.id) : null;
      const folderName = v.onDate.replace(/-/g, '') + ' ' + v.title.trim();
      if (parent) {
        const bad = pmNameProblem(parent.id, folderName);
        if (bad) throw Error('會議資料夾：' + bad);
      }
      const makeFolder = () => {
        if (!parent) return '';
        const fid = nid('FLD');
        DB.folders.push({
          id: fid, projectId: p.id, parentId: parent.id, kind: 'MEETING', name: folderName,
          visibility: (Object.keys(PM_VIS).find(k => PM_VIS[k].rank === Math.max(1, pmVisFloor(parent)))) || 'INTERNAL_ONLY',
          sortOrder: pmChildren(parent.id).reduce((m, f) => Math.max(m, f.sortOrder || 0), 0) + 10,
          isSystem: false, space: 'team', author: DB.me, note: '', createdAt: Date.now()
        });
        return fid;
      };
      if (e) {
        commit('update', '會議', v.title, () => {
          Object.assign(e, body);
          const fid = makeFolder();
          if (fid) e.folderId = fid;
          return fid ? ['會議資料夾已建立並連結'] : ['會議屬性已更新'];
        });
        return;
      }
      const oid = nid('OC');
      commit('create', '會議', v.title, () => {
        const fid = makeFolder();
        DB.occasions.push({
          id: oid, cat: '客戶會議', projectId: p.id, star: false, prep: [], media: [], derivedFrom: '', remind: '前 1 日',
          author: DB.me, folderId: fid, createdAt: Date.now(), ...body
        });
        pmSel(p.id).meeting = oid;
        return [`時間序 <b>${v.onDate}</b> 新增會議`, ...(fid ? ['會議資料夾已建立'] : [])];
      });
    }
  });
}

/** 把一個既有的資料夾連成這場會議的資料夾（1:1）。 */
function formPmMeetingLink(id) {
  const o = OCC(id);
  if (!o) return;
  const taken = new Set(DB.occasions.filter(x => x.folderId && x.id !== o.id).map(x => x.folderId));
  const options = pmFolders(o.projectId).filter(f => f.kind !== 'ROOT' && f.kind !== 'INBOX' && !taken.has(f.id));
  if (!options.length) return toast('沒有可以連結的資料夾；可以在編輯會議時直接建立一個');
  openForm({
    crumb: o.title,
    title: '連結會議資料夾',
    sub: '一個資料夾只能對一場會議',
    fields: [{ k: 'folderId', label: '資料夾', type: 'select', req: true, opts: options.map(f => [f.id, pmPathLabel(f)]) }],
    values: { folderId: (options.find(f => f.kind === 'MEETING') || options[0]).id },
    onSave: v => commit('update', '會議', o.title, () => {
      o.folderId = v.folderId;
      return ['會議資料夾已連結'];
    })
  });
}

/* ---------- 會議待辦 → 任務 ---------- */
function pmMeetingTodoAdd(id) {
  const o = OCC(id);
  const input = getById('pmMtTodo');
  const text = input ? input.value.trim() : '';
  if (!o || !text) return;
  commit('update', '會議待辦', pmCut(text, 24), () => {
    o.prep = [...(Array.isArray(o.prep) ? o.prep : []), { id: nid('PT'), t: text, done: false, issueId: '' }];
    return ['記在這場會議底下；需要追蹤時可以轉成任務'];
  });
}
function pmMeetingTodoKey(event, id) {
  if (event.key !== 'Enter' || event.isComposing) return;
  event.preventDefault();
  pmMeetingTodoAdd(id);
}
function pmMeetingTodoToggle(id, tid) {
  const o = OCC(id);
  const item = o && (o.prep || []).find(x => x.id === tid);
  if (!item) return;
  commit('update', '會議待辦', pmCut(item.t, 24), () => {
    o.prep = o.prep.map(x => (x.id === tid ? { ...x, done: !x.done } : x));
    return [item.done ? '改回未完成' : '標為完成'];
  });
}
function pmMeetingTodoDrop(id, tid) {
  const o = OCC(id);
  const item = o && (o.prep || []).find(x => x.id === tid);
  if (!item) return;
  commit('delete', '會議待辦', pmCut(item.t, 24), () => {
    o.prep = o.prep.filter(x => x.id !== tid);
    return item.issueId ? ['已轉出的任務不受影響'] : [];
  });
}
/** 升級路徑：會議待辦 → 任務。任務建好的同一次 commit 裡，把待辦標上任務編號。 */
function pmMeetingTodoPromote(id, tid) {
  const o = OCC(id);
  const item = o && (o.prep || []).find(x => x.id === tid);
  if (!item) return;
  formPmTask(null, {
    t: item.t,
    exp: '來自會議「' + o.title + '」（' + o.onDate + '）',
    from: '會議待辦 · ' + o.title,
    after: issue => {
      o.prep = o.prep.map(x => (x.id === tid ? { ...x, issueId: issue.id } : x));
      return ['會議待辦已連到這個任務'];
    }
  });
}

/** 升級路徑：結論 → 決議。決議帳本多一列，並在會議上記下決議編號。 */
function pmMeetingDecide(id) {
  const o = OCC(id);
  if (!o) return;
  if (!o.recap) return toast('先寫下這場會議的結論，才有東西可以轉成決議');
  openForm({
    crumb: o.title,
    title: '結論轉成決議',
    sub: '決議會進入決策帳本，之後被推翻也會保留當時的脈絡',
    saveLabel: '建立決議',
    fields: [
      { k: 't', label: '決議', req: true },
      { k: 'ctx', label: '脈絡', type: 'textarea', rows: 2 },
      { k: 'ev', label: '依據', type: 'textarea', rows: 3 }
    ],
    values: { t: pmCut(o.recap, 60), ctx: '會議「' + o.title + '」（' + o.onDate + '）', ev: o.recap },
    effects: ['決策帳本 +1 列', '會議上標記已轉決議'],
    onSave: v => {
      const did = nid('D');
      commit('create', '決策', v.t, () => {
        DB.decisions.unshift({ id: did, t: v.t, st: '現行', ctx: v.ctx, ev: v.ev, body: v.ev, owner: DB.me, date: o.onDate, d: o.onDate, sup: '', author: DB.me });
        // 記在待辦那一包裡：occasions 沒有專屬欄位，而這個標記只給畫面看。
        o.prep = [...(Array.isArray(o.prep) ? o.prep : []).filter(x => x.kind !== 'decision'), { id: nid('PT'), kind: 'decision', t: v.t, decisionId: did, done: true }];
        return ['決策帳本 +1 列', '會議標記為已轉決議'];
      });
    }
  });
}

/* ---------- 版面 ---------- */
function pmMeetingDetail(p, o) {
  const kit = pmKitState(o);
  const folder = o.folderId ? pmFolder(o.folderId) : null;
  const people = pmMeetingPeople(o);
  const todos = (Array.isArray(o.prep) ? o.prep : []).filter(x => x.kind !== 'decision');
  const decided = (Array.isArray(o.prep) ? o.prep : []).find(x => x.kind === 'decision');
  const born = o.createdAt ? pmDay(o.createdAt) + ' ' + pmClock(o.createdAt) : '—';

  const head = `<div class="pm-dv-h">
      <h3>${svg('calendar', 15)}<span>${esc(o.title)}</span></h3>
      <span class="pm-chip">${esc(o.onDate)}${o.at ? ' · ' + esc(o.at) : ''}</span>
      <span class="pm-sp"></span>
      <div class="pm-bar tight">
        <button class="btn" onclick="formPmMeeting('${o.id}')">${svg('pen')} 編輯</button>
        ${folder ? `<button class="btn" onclick="pmJump('drive','tree','會議',{folder:'${folder.id}'})">${svg('folder')} 開資料夾</button>` : ''}
      </div>
    </div>`;

  const attrs = `<dl class="pm-attr">
      <div><dt>參與者</dt><dd>${people.length ? people.map(n => `<span class="pm-chip">${esc(n)}</span>`).join(' ') : '<span class="pm-dim">未填</span>'}</dd></div>
      <div><dt>產生時間</dt><dd class="mono">${esc(born)}</dd></div>
      <div><dt>結論</dt><dd>${o.recap ? esc(o.recap) : `<button type="button" class="pm-link pm-link-lead" onclick="formPmMeeting('${o.id}')">${o.onDate > TODAY ? '還沒開，先寫預期的結論' : '還沒寫結論，現在寫'}</button>`}
        ${o.recap ? (decided
          ? `<span class="pm-chip good">${svg('check', 10)} 已轉決議 ${esc(decided.decisionId || '')}</span>`
          : `<button type="button" class="pm-link" onclick="pmMeetingDecide('${o.id}')">轉成決議</button>`) : ''}</dd></div>
      <div><dt>注意事項</dt><dd>${o.cautions ? esc(o.cautions) : '<span class="pm-dim">沒有特別要注意的事</span>'}</dd></div>
    </dl>`;

  const kitBody = folder
    ? `<div class="pm-kit">${PM_KIT.map(k => {
      const list = kit.files.filter(a => pmKitOf(a) === k[0]);
      return `<div class="pm-kit-i ${list.length ? 'has' : ''}">
          <span class="pm-kit-k">${svg(list.length ? 'check' : 'clock', 12)}${k[1]}</span>
          ${list.length
            ? list.map(a => `<button type="button" class="pm-kit-f" onclick="pmAssetDrawer('${a.id}')">${esc(a.name)}</button>`).join('')
            : '<span class="pm-dim">還沒有</span>'}
        </div>`;
    }).join('')}</div>
      ${kit.files.filter(a => pmKitOf(a) === 'other').length
        ? `<p class="pm-dim">其他 ${kit.files.filter(a => pmKitOf(a) === 'other').length} 個檔案在資料夾裡。</p>` : ''}`
    : pmEmpty('這場會議還沒有資料夾。', pmRoot(p.id)
      ? `<button class="btn pri" onclick="formPmMeeting('${o.id}',true)">${svg('plus')} 建立資料夾</button><button class="btn" onclick="formPmMeetingLink('${o.id}')">連結既有資料夾</button>`
      : `<button class="btn" onclick="pmJump('drive','tree','會議')">先到檔案分頁啟用專案硬碟</button>`);

  const todoBody = `<div class="pm-todo">
      ${todos.map(x => `<div class="pm-todo-i ${x.done ? 'done' : ''}">
        <button type="button" class="pm-pl-check ${x.done ? 'on' : ''}" aria-pressed="${!!x.done}" title="${x.done ? '改回未完成' : '標為完成'}" onclick="pmMeetingTodoToggle('${o.id}','${x.id}')">${x.done ? svg('check', 11) : ''}</button>
        <span class="pm-todo-t">${esc(x.t)}</span>
        ${x.issueId
          ? `<button type="button" class="pm-chip pri pm-chip-btn" onclick="openDrawer('issue','${x.issueId}')">${svg('goto', 10)} 已轉任務</button>`
          : `<button class="btn sm" onclick="pmMeetingTodoPromote('${o.id}','${x.id}')">${svg('arrowRight')} 轉任務</button>`}
        ${mini('trash', `pmMeetingTodoDrop('${o.id}','${x.id}')`, 'dgr')}
      </div>`).join('')}
      <div class="pm-todo-add">
        <input id="pmMtTodo" type="text" aria-label="新增會議待辦" placeholder="記下這場會議的待辦，按 Enter 新增" onkeydown="pmMeetingTodoKey(event,'${o.id}')">
        <button class="btn sm" onclick="pmMeetingTodoAdd('${o.id}')">${svg('plus')} 新增</button>
      </div>
    </div>`;

  return head + attrs +
    pmBlock('會議四件套', folder ? kit.have + ' / 4' : '', kitBody,
      folder ? `<button class="btn sm" onclick="pmUploadPick('${folder.id}')">${svg('plus')} 上傳到這場會議</button>` : '') +
    pmBlock('會議待辦', todos.length ? todos.filter(x => !x.done).length + ' 件未完成' : '', todoBody);
}

PMV.meeting = function (p) {
  if (!p) return '';
  const meetings = pmMeetings(p.id);
  const add = `<button class="btn pri" onclick="formPmMeeting()">${svg('plus')} 新增會議</button>`;
  if (!meetings.length) {
    return pmEmpty('這個專案還沒有會議紀錄。每場會議是一個資料夾，帶著參與者、產生時間、結論與注意事項。', add);
  }
  const sel = pmSel(p.id);
  const cur = meetings.find(o => o.id === sel.meeting) || meetings[0];
  const past = meetings.filter(o => o.onDate <= TODAY);

  const rail = pmRail([
    { label: '會議', value: meetings.length, unit: '場' },
    { label: '缺結論', value: past.filter(o => !o.recap).length, tone: past.some(o => !o.recap) ? 'warn' : '' },
    { label: '四件套齊全', value: meetings.filter(o => pmKitState(o).have === 4).length + ' / ' + meetings.length },
    { label: '未完成待辦', value: meetings.reduce((n, o) => n + (Array.isArray(o.prep) ? o.prep : []).filter(x => x.kind !== 'decision' && !x.done).length, 0) },
    { label: '下一場', value: (meetings.filter(o => o.onDate > TODAY).sort((a, b) => a.onDate.localeCompare(b.onDate))[0] || {}).onDate || '—' }
  ], { label: '會議重點數字' });

  let month = '';
  const list = meetings.map(o => {
    const m = o.onDate.slice(0, 7);
    const sep = m !== month ? `<div class="pm-mt-month">${m.slice(0, 4)} 年 ${Number(m.slice(5))} 月</div>` : '';
    month = m;
    const kit = pmKitState(o);
    return sep + `<button type="button" class="pm-mt-i ${o.id === cur.id ? 'on' : ''}" aria-current="${o.id === cur.id}" onclick="pmMeetingPick('${o.id}')">
        <span class="pm-mt-d">${o.onDate.slice(5)}</span>
        <span class="pm-mt-t">${esc(o.title)}</span>
        <span class="pm-mt-m">
          ${o.onDate > TODAY ? '<span class="pm-chip pri">未開</span>' : o.recap ? '' : '<span class="pm-chip warn">缺結論</span>'}
          ${o.folderId ? `<span class="pm-mt-k">${kit.have}/4</span>` : ''}
        </span>
      </button>`;
  }).join('');

  return rail + `<div class="pm-bar">${add}</div><div class="pm-dv">
    <nav class="pm-dv-tree pm-mt-list" aria-label="會議時間序">${list}</nav>
    <div class="pm-dv-main">${pmMeetingDetail(p, cur)}</div>
  </div>`;
};
