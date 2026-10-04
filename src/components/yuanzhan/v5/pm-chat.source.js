/* ==================================================================
   專案 · 對話（PLN-075 S3 Wave 3b）

   每個專案有自己的聊天室：頻道（chatChannels）＋ 一列一訊息（chatMessages，OD-F）。
   既有的 OperatingThread（議題串）不動，留在同一個分頁的「議題串」子視圖。

   附件與其他入口走同一條路落進收件匣：上傳到專案硬碟、不指定資料夾，
   所以它是待整理（filedAt 為空），之後在檔案分頁整理到正確位置。
   訊息只記參考碼（meta.assets），不帶 bytes。

   升級路徑：訊息 → 任務。

   LINE 群導入本階段不做（OD-H）：以停用狀態的入口呈現，不假裝可用。
   ================================================================== */

var PMV = PMV || {};

const PM_CH_KIND = { MAIN: '主頻道', TOPIC: '主題', LINE_MIRROR: 'LINE 鏡射', CLIENT: '客戶' };

function pmChatOpen() {
  const p = P(S.proj);
  if (!p || pmChannels(p.id).length) return;
  const cid = nid('CH');
  commit('create', '聊天室', p.t, () => {
    DB.chatChannels.push({ id: cid, projectId: p.id, kind: 'MAIN', name: '專案主頻道', topic: '', readOnly: false, archived: false, sortOrder: 0, dropFolderId: '', author: DB.me });
    pmSel(p.id).channel = cid;
    return ['這個專案有了自己的聊天室'];
  });
}

function formPmChannel(id) {
  const p = P(S.proj);
  if (!p) return;
  const e = id ? DB.chatChannels.find(c => c.id === id) : null;
  openForm({
    crumb: e ? '頻道 · ' + e.name : '新頻道',
    title: e ? '頻道設定' : '新增主題頻道',
    sub: '主頻道放日常往來；主題頻道把一件事的討論收在一起',
    fields: [
      { k: 'name', label: '名稱', req: true, ph: '例如：驗收' },
      { k: 'topic', label: '這個頻道談什麼', ph: '一句話說明' }
    ],
    values: e ? { name: e.name, topic: e.topic || '' } : { name: '', topic: '' },
    onDelete: e && e.kind !== 'MAIN'
      ? () => confirmDelete('頻道', e.name, '訊息會保留在資料庫裡，但這個頻道不再出現在清單上。', () => {
        commit('delete', '頻道', e.name, () => {
          // 只移除頻道。訊息不跟著刪：伺服器端頻道是軟刪，而一次送出上百列刪除
          // 會撞到單次變更的筆數上限。沒有頻道的訊息本來就不會被畫出來。
          DB.chatChannels = DB.chatChannels.filter(c => c.id !== e.id);
          pmSel(p.id).channel = '';
          return ['頻道清單移除這個頻道'];
        });
        closeDrawer();
      })
      : null,
    onSave: v => {
      const name = v.name.trim();
      if (pmChannels(p.id).some(c => c.id !== (e && e.id) && c.name === name)) throw Error('已經有同名的頻道');
      if (e) {
        commit('update', '頻道', name, () => { Object.assign(e, { name, topic: v.topic }); return ['頻道資訊已更新']; });
        return;
      }
      const cid = nid('CH');
      commit('create', '頻道', name, () => {
        DB.chatChannels.push({
          id: cid, projectId: p.id, kind: 'TOPIC', name, topic: v.topic, readOnly: false, archived: false,
          sortOrder: pmChannels(p.id).reduce((m, c) => Math.max(m, c.sortOrder || 0), 0) + 10, dropFolderId: '', author: DB.me
        });
        pmSel(p.id).channel = cid;
        return ['頻道清單多一個主題頻道'];
      });
    }
  });
}

function pmChannelPick(id) {
  const c = DB.chatChannels.find(x => x.id === id);
  if (!c) return;
  pmSel(c.projectId).channel = id;
  runtime._afterRender = pmChatSettle;
  render();
}

/** 重繪之後：訊息列捲到最底、輸入框拿回焦點。 */
function pmChatSettle() {
  const box = getById('pmChatLog');
  if (box) box.scrollTop = box.scrollHeight;
  const input = getById('pmChatInput');
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function pmChatDraft(cid, value) { S.pmDraft[cid] = value; }

const PM_CHAT_FILES = {};
function pmChatAttach(cid) {
  const c = DB.chatChannels.find(x => x.id === cid);
  const p = c ? P(c.projectId) : null;
  if (!p) return;
  if (!pmRoot(p.id)) return toast('附件會落進專案硬碟的收件匣；請先到「檔案」分頁啟用專案硬碟');
  // 不指定資料夾 → 落進收件匣（待整理）。
  pmUploadPick('', done => {
    if (!done.length) return;
    PM_CHAT_FILES[cid] = [...(PM_CHAT_FILES[cid] || []), ...done.map(a => a.id)];
    runtime._afterRender = pmChatSettle;
  });
}
function pmChatDetach(cid, rid) {
  PM_CHAT_FILES[cid] = (PM_CHAT_FILES[cid] || []).filter(x => x !== rid);
  runtime._afterRender = pmChatSettle;
  render();
}

function pmChatSend(cid) {
  const c = DB.chatChannels.find(x => x.id === cid);
  if (!c) return;
  if (c.readOnly) return toast('這個頻道是唯讀的');
  const input = getById('pmChatInput');
  const text = (input ? input.value : S.pmDraft[cid] || '').trim();
  const files = PM_CHAT_FILES[cid] || [];
  if (!text && !files.length) return;
  const row = {
    id: nid('MSG'), channelId: cid, w: DB.me, origin: 'APP', text, type: files.length && !text ? 'file' : 'text',
    at: Date.now(), mentions: [], meta: files.length ? { assets: files } : {}
  };
  S.pmDraft[cid] = '';
  PM_CHAT_FILES[cid] = [];
  runtime._afterRender = pmChatSettle;
  // 每送一則就跳一次通知是干擾；寫入仍然走 commit()。
  pmQuiet(() => commit('create', '訊息', pmCut(text || '附件', 24), () => {
    DB.chatMessages.push(row);
    return [];
  }));
}

function pmChatKey(event, cid) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  pmChatSend(cid);
}

function pmChatDrop(mid) {
  const m = DB.chatMessages.find(x => x.id === mid);
  if (!m) return;
  if (m.w !== DB.me) return deny();
  confirmDelete('訊息', pmCut(m.text || '附件', 30), m.meta && m.meta.taskId ? '已轉出的任務不受影響。' : '', () => {
    runtime._afterRender = pmChatSettle;
    commit('delete', '訊息', pmCut(m.text || '附件', 24), () => {
      DB.chatMessages = DB.chatMessages.filter(x => x.id !== mid);
      return [];
    });
  });
}

/** 升級路徑：訊息 → 任務。任務建好的同一次 commit 裡，把訊息標上任務編號。 */
function pmChatPromote(mid) {
  const m = DB.chatMessages.find(x => x.id === mid);
  if (!m) return;
  const c = DB.chatChannels.find(x => x.id === m.channelId);
  formPmTask(null, {
    t: pmCut(m.text, 60),
    exp: m.text,
    from: '對話 · ' + (c ? c.name : '') + ' · ' + pmWho(m.w),
    after: issue => {
      m.meta = { ...(m.meta || {}), taskId: issue.id };
      return ['這則訊息已連到任務'];
    }
  });
}

function pmChatMsg(m) {
  const meta = m.meta || {};
  const files = (meta.assets || []).map(rid => astOf(rid)).filter(Boolean);
  const mine = m.w === DB.me;
  return `<div class="pm-msg ${mine ? 'mine' : ''}">
    <span class="pm-msg-av">${pmAv(m.w) || `<span class="av">${esc(String(m.authorName || m.w || '?').slice(0, 1))}</span>`}</span>
    <div class="pm-msg-b">
      <div class="pm-msg-h"><b>${esc(m.authorName || pmWho(m.w))}</b><span>${pmClock(m.at)}</span>${m.origin && m.origin !== 'APP' ? `<span class="pm-chip">${esc(m.origin)}</span>` : ''}</div>
      ${m.text ? `<div class="pm-msg-t">${esc(m.text)}</div>` : ''}
      ${files.length ? `<div class="pm-msg-f">${files.map(a => `<button type="button" class="pm-chip pm-chip-btn" onclick="pmAssetDrawer('${a.id}')">${svg('paperclip', 10)} ${esc(a.name)}</button>`).join('')}</div>` : ''}
      ${meta.taskId ? `<div class="pm-msg-f"><button type="button" class="pm-chip pri pm-chip-btn" onclick="openDrawer('issue','${meta.taskId}')">${svg('goto', 10)} 已轉任務</button></div>` : ''}
    </div>
    <span class="pm-msg-a">
      ${meta.taskId ? '' : mini('flag', `pmChatPromote('${m.id}')`)}
      ${mine ? mini('trash', `pmChatDrop('${m.id}')`, 'dgr') : ''}
    </span>
  </div>`;
}

function pmChatRoom(p, c) {
  const msgs = pmMessages(c.id);
  let day = '';
  const log = msgs.map(m => {
    const d = pmDay(m.at);
    const sep = d !== day ? `<div class="pm-msg-day"><span>${d}</span></div>` : '';
    day = d;
    return sep + pmChatMsg(m);
  }).join('');
  const pending = (PM_CHAT_FILES[c.id] || []).map(rid => astOf(rid)).filter(Boolean);

  return `<div class="pm-dv-h">
      <h3>${svg('hash', 15)}<span>${esc(c.name)}</span></h3>
      <span class="pm-chip">${PM_CH_KIND[c.kind] || c.kind}</span>
      ${c.topic ? `<span class="pm-dim">${esc(c.topic)}</span>` : ''}
      <span class="pm-sp"></span>
      <div class="pm-bar tight"><button class="btn" onclick="formPmChannel('${c.id}')">${svg('pen')} 設定</button></div>
    </div>
    <div class="pm-chat-log" id="pmChatLog" data-pm-surface="primary" role="log" aria-label="訊息">
      ${log || pmEmpty('這個頻道還沒有訊息。')}
    </div>
    <div class="pm-up" id="pmUpState" role="status" aria-live="polite" hidden></div>
    ${c.readOnly ? '<p class="pm-hint">這個頻道是唯讀的，不能從這裡發訊息。</p>' : `<div class="pm-chat-in">
      ${pending.length ? `<div class="pm-msg-f">${pending.map(a => `<span class="pm-chip">${svg('paperclip', 10)} ${esc(a.name)}<button type="button" class="pm-chip-x" aria-label="移除附件" onclick="pmChatDetach('${c.id}','${a.id}')">${svg('x', 10)}</button></span>`).join('')}</div>` : ''}
      <div class="pm-chat-row">
        <button type="button" class="pm-chat-ic" title="附件（先進收件匣）" aria-label="加入附件" onclick="pmChatAttach('${c.id}')">${svg('paperclip', 15)}</button>
        <textarea id="pmChatInput" rows="2" aria-label="輸入訊息" placeholder="輸入訊息　Enter 送出 · Shift+Enter 換行" oninput="pmChatDraft('${c.id}',this.value)" onkeydown="pmChatKey(event,'${c.id}')">${esc(S.pmDraft[c.id] || '')}</textarea>
        <button class="btn pri" onclick="pmChatSend('${c.id}')">${svg('send')} 送出</button>
      </div>
    </div>`}`;
}

PMV.chat = function (p) {
  if (!p) return '';
  const channels = pmChannels(p.id);
  if (!channels.length) {
    return pmEmpty(
      '這個專案還沒有聊天室。開啟之後會有一個主頻道，之後可以再加主題頻道。',
      `<button class="btn pri" onclick="pmChatOpen()">${svg('message')} 開啟專案聊天室</button>`
    );
  }
  const sel = pmSel(p.id);
  const cur = channels.find(c => c.id === sel.channel) || channels[0];
  const list = channels.map(c => {
    const msgs = pmMessages(c.id);
    const last = msgs[msgs.length - 1];
    return `<button type="button" class="pm-mt-i ${c.id === cur.id ? 'on' : ''}" aria-current="${c.id === cur.id}" onclick="pmChannelPick('${c.id}')">
        <span class="pm-mt-d">${svg('hash', 12)}</span>
        <span class="pm-mt-t">${esc(c.name)}<small>${last ? esc(pmWho(last.w) + '：' + pmCut(last.text || '附件', 22)) : '還沒有訊息'}</small></span>
        <span class="pm-mt-m"><span class="pm-mt-k">${msgs.length}</span></span>
      </button>`;
  }).join('');

  return `<div class="pm-dv pm-chat">
    <nav class="pm-dv-tree pm-mt-list" aria-label="頻道">
      ${list}
      <button type="button" class="pm-mt-i add" onclick="formPmChannel()"><span class="pm-mt-d">${svg('plus', 12)}</span><span class="pm-mt-t">新增主題頻道</span></button>
      <div class="pm-mt-i off" aria-disabled="true"><span class="pm-mt-d">${svg('lock', 12)}</span><span class="pm-mt-t">LINE 群導入<small>本階段未開放</small></span></div>
    </nav>
    <div class="pm-dv-main">${pmChatRoom(p, cur)}</div>
  </div>`;
};
