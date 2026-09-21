/* ==================================================================
   時間線參與者（提案 C · 延續 @提及慣例，claude/timeline-participants-sync-proposals.md）
   標題或說明打 @人名（例如 @Lily）存檔時會自動標成參與者；沒有標記＝全體可見。
   清單另外用小標記標出「這筆會不會同步到 Google」，範圍依個人設定
   calendar.googleSyncScope（只同步與我相關 ／ 同步全部）決定。
   ================================================================== */
function parseMentions(text) {
  const hay = String(text || '');
  if (hay.indexOf('@') < 0) return [];
  const hit = new Set();
  PEOPLE_OPTS().forEach(([key, name]) => {
    const n = String(name || '').trim();
    if (!n) return;
    const re = new RegExp('@' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(hay)) hit.add(key);
  });
  return [...hit];
}
function eventParticipants(e) {
  return e && e.participants && e.participants.length ? e.participants : null;
}
function willSyncToGoogle(e) {
  if (settingValue('calendar.googleSyncScope') !== 'mine') return true;
  const p = eventParticipants(e);
  return !p || p.includes(DB.me);
}
function tlAvatars(ids) {
  return `<span class="tl-avs">${ids.map(w => DB.people[w] ? `<span class="av ${DB.people[w].cls}" title="${esc(person(w))}">${DB.people[w].s}</span>` : '').join('')}</span>`;
}

/* ---- chips 欄位擴充：type:'mchips' 支援多選（參與者用），沿用既有 .chipset 樣式 ---- */
const tpBaseFInput = fInput;
fInput = function (f, v) {
  if (f.type === 'mchips') {
    const id = 'f_' + f.k,
      val = v == null ? '' : v,
      sel = String(val).split(',').map(s => s.trim()).filter(Boolean);
    return `<div class="chipset mchipset" id="${id}" data-val="${esc(val)}">${f.opts.map(o => {
      const [ov, ol] = Array.isArray(o) ? o : [o, o];
      return `<button type="button" class="${sel.includes(String(ov)) ? 'on' : ''}" data-value="${esc(ov)}" onclick="toggleChip('${id}','${esc(ov)}')">${esc(ol)}</button>`;
    }).join('')}</div>`;
  }
  return tpBaseFInput(f, v);
};
function toggleChip(id, v) {
  const el = getById(id);
  const sel = new Set(String(el.dataset.val || '').split(',').map(s => s.trim()).filter(Boolean));
  if (sel.has(v)) sel.delete(v); else sel.add(v);
  el.dataset.val = [...sel].join(',');
  [...el.children].forEach(b => b.classList.toggle('on', sel.has(b.dataset.value)));
  if (FORM && FORM.onChange) FORM.onChange();
}

/* ---- 新增／編輯時間線事件：加「參與者」欄位，存檔時解析 @提及並跟手動選擇合併 ---- */
formEvent = function (id) {
  if (id && !editable(EVT(id))) return deny();
  const e = id ? EVT(id) : null;
  if (e && e.derived) {
    toast('這是由條文推導的承諾事件，<b>不可編輯或刪除</b>，只能標記已履行或已協議變更');
    return;
  }
  openForm({
    crumb: e ? '事件' : '新事件',
    title: e ? '編輯事件' : '新增時間線事件',
    sub: '手動建立的事件可自由編輯與刪除',
    fields: [{
      k: 'd',
      label: '日期',
      type: 'date',
      req: true,
      half: true
    }, {
      k: 'layer',
      label: '層級',
      type: 'chips',
      opts: ['專案', '日常', '行政'],
      req: true,
      half: true
    }, {
      k: 't',
      label: '標題',
      req: true,
      hint: '打 @人名（例如 @Lily）會自動標記參與者'
    }, {
      k: 'star',
      label: '重要',
      type: 'chips',
      opts: [['否', '否'], ['是', '★ 是']],
      hint: '標星的事件會被工作台「未來」欄優先撈出'
    }, {
      k: 'link',
      label: '連結專案',
      type: 'select',
      opts: [['', '（無）'], ...PROJ_OPTS()]
    }, {
      k: 'remind',
      label: '提醒',
      type: 'select',
      opts: ['前 1 日', '前 3 日', '前 7 日', '前 7/3/1 日', '當日上午']
    }, {
      k: 'note',
      label: '說明',
      type: 'textarea',
      rows: 3,
      hint: '說明裡的 @人名 也算標記'
    }, {
      k: 'participants',
      label: '參與者',
      type: 'mchips',
      opts: PEOPLE_OPTS(),
      hint: '沒有標記任何人＝全體可見。這裡的選取會跟標題／說明解析出的 @人名合併，不會互相覆蓋。'
    }],
    values: e ? {
      ...e,
      star: e.star ? '是' : '否',
      participants: (eventParticipants(e) || []).join(',')
    } : {
      d: TODAY,
      layer: '日常',
      t: '',
      star: '否',
      link: '',
      remind: '前 1 日',
      note: '',
      participants: ''
    },
    effects: ['時間線清單與層級篩選', '標星者進入工作台「未來」欄', '有連結專案者出現在該專案總覽', '參與者決定 Google 同步範圍（個人設定 → calendar.googleSyncScope）'],
    onDelete: e ? () => delEvent(id) : null,
    onSave: v => {
      const mentioned = parseMentions((v.t || '') + ' ' + (v.note || ''));
      const manual = String(v.participants || '').split(',').map(s => s.trim()).filter(Boolean);
      const participants = [...new Set([...mentioned, ...manual])];
      const participantsSummary = participants.length ? `參與者：${participants.map(person).join('、')}` : '參與者：全體';
      if (e) {
        const b = { ...e };
        commit('update', '事件', v.t, () => {
          Object.assign(e, {
            d: v.d,
            layer: v.layer,
            t: v.t,
            star: v.star === '是',
            link: v.link,
            remind: v.remind,
            note: v.note,
            participants: participants.length ? participants : null
          });
          return ['時間線重新排序', v.star === '是' ? '已進入工作台「未來」欄' : '已移出「未來」欄', participantsSummary];
        }, () => Object.assign(e, b));
      } else {
        const ev = {
          id: nid('EVT'),
          d: v.d,
          t: v.t,
          layer: v.layer,
          star: v.star === '是',
          derived: '',
          link: v.link,
          remind: v.remind,
          note: v.note,
          participants: participants.length ? participants : null
        };
        commit('create', '事件', v.t, () => {
          DB.events.push(ev);
          DB.events.sort((a, b) => a.d < b.d ? -1 : 1);
          const ef = [`${v.layer}層 +1 筆`];
          if (ev.star) ef.push('已加入工作台「未來」欄');
          if (ev.link) ef.push(`出現在專案 <b>${esc(P(ev.link).t)}</b> 的關鍵時間`);
          ef.push(participantsSummary);
          return ef;
        }, () => {
          DB.events = DB.events.filter(x => x.id !== ev.id);
        });
      }
    }
  });
};

/* ---- 時間線清單：顯示參與者頭像／全體標記／不會同步標記 ---- */
VIEWS.timeline = tab => {
  const filt = ['', '專案', '日常', '行政'][tab];
  const list = DB.events.filter(e => !filt || e.layer === filt);
  const scope = settingValue('calendar.googleSyncScope');
  const rows = list.map(e => {
    const p = eventParticipants(e);
    const nosync = scope === 'mine' && !willSyncToGoogle(e);
    return `
    <div class="row" onclick="openDrawer('event','${e.id}')">
      <button class="star ${e.star ? 'on' : ''}" onclick="toggleStar('${e.id}',event)" title="標記重要">${svg('star')}</button>
      <span class="m" style="width:88px">${e.d}</span>
      <span class="chip ${LAYER[e.layer]}">${e.layer}</span>
      <span class="t">${esc(e.t)}${e.done ? ' <span class="chip c-o">已履行</span>' : ''}</span>
      ${p ? tlAvatars(p) : '<span class="tl-all">全體</span>'}
      ${nosync ? '<span class="tl-nosync" title="個人設定：只同步與我相關">不會同步</span>' : ''}
      ${e.derived ? `<span class="chip c-n">${svg('lock', 10)} ${esc(e.derived)}</span>` : ''}
      <span class="m">${e.remind}</span>
      <span class="rowacts">${e.derived ? mini('lock', (event, element) => {
      toast('由 ' + esc(e.derived) + ' 推導，不可編輯或刪除');
    }, '', '受條文保護') : mini('pen', (event, element) => {
      formEvent(e.id);
    }) + mini('trash', (event, element) => {
      delEvent(e.id);
    }, 'dgr')}</span></div>`;
  }).join('');
  return guide('<b>可逆的動作用 undo toast，不可逆的用確認對話框。</b>帶鎖的事件由合約條文推導，刪除鍵直接不存在。標題或說明打 <b>@人名</b> 會自動標成參與者，沒標記就是全體可見。', 'w') + `<div class="viewbar">
      <button class="vb ${S.view === 'list' ? 'on' : ''}" onclick="S.view='list';render();">${svg('list')} 清單</button>
      <button class="vb ${S.view === 'cal' ? 'on' : ''}" onclick="S.view='cal';render();">${svg('cal')} 日曆</button>
      <span class="sp"></span>
      <button class="btn sm pri" onclick="formEvent()">${svg('plus')} 新增事件</button></div>` + (S.view === 'cal' ? calendarView(list) : panel('2026 Q3–Q4', list.length + ' 個事件', `<div class="rows" style="margin:-12px -14px">${rows || '<div class="empty">此層級尚無事件</div>'}</div>`, '', false)) + `<div style="height:14px"></div>
      <div class="legendrow"><span><i class="dotc" style="background:var(--pri)"></i>專案層</span>
        <span><i class="dotc" style="background:var(--teal)"></i>日常層</span>
        <span><i class="dotc" style="background:var(--info)"></i>行政層</span>
        <span>${svg('lock', 11)} 由條文推導，不可刪除</span>
        <span>${scope === 'mine' ? 'Google 同步：只同步與我相關（個人設定可改）' : 'Google 同步：同步全部事件（個人設定可改）'}</span></div>`;
};
