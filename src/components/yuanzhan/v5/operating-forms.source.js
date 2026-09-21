/* ==================================================================
   三軌 CRUD（PLN-073 T3 · OPS-T11/T12）

   一律走既有的 openForm() + commit()：
     - commit 會回報「連動 N 處」、寫 changelog 與 audit，而且自帶 undo；
     - 不另外造一套表單引擎或 undo stack。

   權限（OPS-T12）：v5 原本規定「由條文推導的事件不可編輯或刪除」。
   遷移後那些紀錄散到三軌，所以三軌的每個入口都要先過 opGuard()。
   ================================================================== */

const MS = id => (DB.milestones || []).find(m => m.id === id);
const OCC = id => (DB.occasions || []).find(o => o.id === id);
const RH = id => (DB.rhythms || []).find(r => r.id === id);
const SESS = (rid, date) => (DB.sessions || []).find(s => s.rhythmId === rid && s.occurrenceDate === date);
const opName = k => (DB.people[k] ? DB.people[k].n : k);

/** 由契約條文或法規推導的紀錄：不可編輯、不可刪除。 */
function opGuard(rec) {
  if (rec && rec.derivedFrom) {
    toast(`這是由 <b>${esc(rec.derivedFrom)}</b> 推導的紀錄，<b>不可編輯或刪除</b>；只能標記已履行或另行協議變更`);
    return false;
  }
  if (rec && rec.author && !editable(rec)) return deny();
  return true;
}
const opRemindOpts = ['前 1 日', '前 3 日', '前 7 日', '前 7/3/1 日', '當日上午', '不提醒'];

/* ------------------------------------------------------------------ */
/* 新增選擇器                                                          */
/* ------------------------------------------------------------------ */
function opNew(date) {
  openForm({
    crumb: '營運',
    title: '新增…',
    sub: '三軌各有合身的表單，入口在同一個地方',
    keepOpen: true,
    fields: [
      {
        k: 'kind',
        label: '要新增什麼',
        type: 'chips',
        req: true,
        opts: [
          ['ms', '專案里程碑'],
          ['rh', '日常節奏'],
          ['oc', '行政／活動']
        ],
        hint: '里程碑＝對外交付的時間點；節奏＝會重複的會議或義務；活動＝一次性事件'
      },
      { k: 'd', label: '日期', type: 'date' }
    ],
    values: { kind: 'oc', d: date || TODAY },
    onSave: v => {
      if (v.kind === 'ms') return formMilestone(null, v.d);
      if (v.kind === 'rh') return formRhythm(null, v.d);
      return formOccasion(null, v.d);
    }
  });
}

/* ------------------------------------------------------------------ */
/* 專案軌 · 里程碑                                                     */
/* ------------------------------------------------------------------ */
function formMilestone(id, presetDate) {
  const e = id ? MS(id) : null;
  if (e && !opGuard(e)) return;
  openForm({
    replace: !!id || !!presetDate,
    crumb: e ? '里程碑 · ' + e.id : '新里程碑',
    title: e ? '編輯里程碑' : '新增里程碑',
    sub: '里程碑是對外承諾的交付點；填了日期才會出現在日曆與甘特上',
    fields: [
      { k: 'title', label: '名稱', req: true },
      { k: 'dueOn', label: '目標日', type: 'date', half: true, hint: '留空＝日期待補，不進日曆' },
      { k: 'accept', label: '驗收方式', half: true },
      { k: 'projectId', label: '所屬專案', type: 'select', req: true, opts: PROJ_OPTS() },
      {
        k: 'state',
        label: '狀態',
        type: 'chips',
        opts: [
          ['open', '進行中'],
          ['done', '已達成']
        ]
      },
      { k: 'remind', label: '提醒', type: 'select', opts: opRemindOpts }
    ],
    values: e
      ? { ...e }
      : {
          title: '',
          dueOn: presetDate || '',
          accept: '',
          projectId: S.proj || (DB.projects[0] || {}).id || '',
          state: 'open',
          remind: '前 3 日'
        },
    effects: [
      'time_spine 寫入一筆 <b>track=project · weight=3</b>',
      '營運 · 日曆與甘特出現 ★ 里程碑',
      '專案模組的關鍵時間同步'
    ],
    onDelete: e
      ? () => {
          if (!opGuard(e)) return;
          commit('delete', '里程碑', e.title, () => {
            DB.milestones = DB.milestones.filter(m => m.id !== id);
            DB.objectives = (DB.objectives || []).filter(o => o.milestoneId !== id);
            return ['日曆與甘特移除該節點', '底下的目標一併移除'];
          });
          closeDrawer();
        }
      : null,
    onSave: v => {
      if (e) {
        commit('update', '里程碑', v.title, () => {
          Object.assign(e, {
            title: v.title,
            dueOn: v.dueOn,
            accept: v.accept,
            projectId: v.projectId,
            state: v.state,
            remind: v.remind
          });
          return [
            v.dueOn ? `日曆 <b>${v.dueOn}</b> 的位置已更新` : '日期待補，暫不進日曆',
            `專案 <b>${esc((P(v.projectId) || {}).t || v.projectId)}</b> 的關鍵時間重排`
          ];
        });
      } else {
        commit('create', '里程碑', v.title, () => {
          DB.milestones.push({
            id: nid('MS'),
            projectId: v.projectId,
            title: v.title,
            dueOn: v.dueOn,
            accept: v.accept,
            state: v.state,
            derivedFrom: '',
            remind: v.remind,
            author: DB.me
          });
          return [
            v.dueOn ? `日曆 <b>${v.dueOn}</b> 新增 ★ 里程碑` : '日期待補，填了才進日曆',
            `專案里程碑數 → <b>${DB.milestones.filter(m => m.projectId === v.projectId).length}</b>`
          ];
        });
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* 節奏軌 · 規則                                                       */
/* ------------------------------------------------------------------ */
const OP_WEEKDAYS = [
  ['MO', '一'],
  ['TU', '二'],
  ['WE', '三'],
  ['TH', '四'],
  ['FR', '五'],
  ['SA', '六'],
  ['SU', '日']
];
function opRuleOf(v, dtstart) {
  if (v.freq === 'monthly') return `FREQ=MONTHLY;BYMONTHDAY=${Number(v.bymonthday) || Number(dtstart.slice(8, 10)) || 1}`;
  const days = String(v.byday || '')
    .toUpperCase()
    .split(/[,\s]+/)
    .filter(d => OP_WEEKDAYS.some(w => w[0] === d));
  const list = days.length ? days.join(',') : OP_WEEKDAYS[(new Date(dtstart + 'T00:00:00Z').getUTCDay() + 6) % 7][0];
  return `FREQ=WEEKLY;INTERVAL=${Math.max(1, Number(v.interval) || 1)};BYDAY=${list}`;
}
function opRuleText(r) {
  const p = parseRule(r.rrule);
  if (p.freq === 'MONTHLY') return `每月 ${p.bymonthday.join('、') || '?'} 號`;
  const days = p.byday.map(d => (OP_WEEKDAYS.find(w => w[0] === d) || [d, d])[1]).join('、');
  return (p.interval > 1 ? `每 ${p.interval} 週 ` : '每週 ') + '週' + days;
}

function formRhythm(id, presetDate) {
  const e = id ? RH(id) : null;
  if (e && !opGuard(e)) return;
  const parsed = e ? parseRule(e.rrule) : null;
  openForm({
    replace: !!id || !!presetDate,
    crumb: e ? '節奏 · ' + e.id : '新節奏',
    title: e ? '編輯節奏' : '新增日常節奏',
    sub: '只存規則，不預先產生實例；每次有沒有跑另外記一筆',
    fields: [
      { k: 'title', label: '名稱', req: true },
      {
        k: 'kind',
        label: '類型',
        type: 'chips',
        req: true,
        opts: [
          ['ritual', '節奏（會議／習慣）'],
          ['admin', '行政週期']
        ],
        hint: '行政週期（發薪、勞健保、報稅）會進日曆與提醒，但<b>不計入履行率</b> —— 沒繳勞健保不是節奏斷層'
      },
      {
        k: 'scope',
        label: '歸屬',
        type: 'chips',
        half: true,
        opts: [
          ['company', '公司節奏'],
          ['personal', '個人節奏']
        ]
      },
      { k: 'owner', label: '參與者', type: 'select', half: true, opts: [['all', '兩人'], ...PEOPLE_OPTS()] },
      {
        k: 'freq',
        label: '重複',
        type: 'chips',
        req: true,
        half: true,
        opts: [
          ['weekly', '每週'],
          ['monthly', '每月']
        ]
      },
      { k: 'interval', label: '間隔（幾週一次）', type: 'number', half: true },
      { k: 'byday', label: '星期（每週時）', ph: 'MO,WE,FR', hint: '用逗號分隔：MO TU WE TH FR SA SU' },
      { k: 'bymonthday', label: '幾號（每月時）', type: 'number', half: true },
      { k: 'timeOfDay', label: '時間', half: true, ph: '09:30' },
      { k: 'dtstart', label: '從哪天開始', type: 'date', req: true, half: true },
      {
        k: 'media',
        label: '每次要記什麼',
        type: 'select',
        half: true,
        opts: [
          ['', '不用記'],
          ['note', '質性紀錄'],
          ['note,audio', '質性紀錄 ＋ 錄音']
        ]
      },
      { k: 'remind', label: '提醒', type: 'select', opts: opRemindOpts }
    ],
    values: e
      ? {
          title: e.title,
          kind: e.kind || 'ritual',
          scope: e.scope || 'company',
          owner: (e.ownerIds || []).length === 1 ? e.ownerIds[0] : 'all',
          freq: parsed.freq === 'MONTHLY' ? 'monthly' : 'weekly',
          interval: parsed.interval,
          byday: parsed.byday.join(','),
          bymonthday: parsed.bymonthday[0] || '',
          timeOfDay: e.timeOfDay || '',
          dtstart: e.dtstart,
          media: (e.expectMedia || []).join(','),
          remind: e.remind || '前 1 日'
        }
      : {
          title: '',
          kind: 'ritual',
          scope: 'company',
          owner: 'all',
          freq: 'weekly',
          interval: 1,
          byday: '',
          bymonthday: '',
          timeOfDay: '',
          dtstart: presetDate || TODAY,
          media: 'note',
          remind: '前 1 日'
        },
    effects: [
      '未來實例由規則即時展開，<b>不預存資料列</b>',
      '日曆上未來以虛線顯示、已履行轉實線',
      '節奏（ritual）進履行率 heatmap；行政週期走「行政佔用」那一列'
    ],
    onDelete: e
      ? () => {
          if (!opGuard(e)) return;
          commit('delete', '節奏', e.title, () => {
            DB.rhythms = DB.rhythms.filter(r => r.id !== id);
            DB.sessions = (DB.sessions || []).filter(s => s.rhythmId !== id);
            return ['日曆移除所有未來實例', '既有的履行紀錄一併移除'];
          });
          closeDrawer();
        }
      : null,
    onSave: v => {
      const owners = v.owner === 'all' ? Object.keys(DB.people) : [v.owner];
      const body = {
        title: v.title,
        kind: v.kind,
        scope: v.scope,
        ownerIds: owners,
        rrule: opRuleOf(v, v.dtstart),
        dtstart: v.dtstart,
        until: null,
        timeOfDay: v.timeOfDay,
        timezone: 'Asia/Taipei',
        expectMedia: v.media ? v.media.split(',') : [],
        remind: v.remind,
        active: true
      };
      if (e) {
        commit('update', '節奏', v.title, () => {
          Object.assign(e, body);
          return [`規則 → <b>${esc(opRuleText(e))}</b>`, '日曆的未來實例重新展開'];
        });
      } else {
        commit('create', '節奏', v.title, () => {
          DB.rhythms.push({ id: nid('RH'), derivedFrom: '', author: DB.me, ...body });
          return [
            `規則 <b>${esc(opRuleText(body))}</b>`,
            v.kind === 'admin' ? '計入行政佔用，不計履行率' : '納入節奏履行率 heatmap'
          ];
        });
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* 節奏軌 · 單次實例                                                   */
/* ------------------------------------------------------------------ */
function formSession(rhythmId, date) {
  const r = RH(rhythmId);
  if (!r) return;
  const s = SESS(rhythmId, date);
  const media = r.expectMedia || [];
  openForm({
    replace: true,
    crumb: '節奏 · ' + esc(r.title),
    title: date + (r.timeOfDay ? ' ' + r.timeOfDay : ''),
    sub: `${opRuleText(r)}　·　${(r.ownerIds || []).map(opName).join('、')}　·　${r.kind === 'admin' ? '行政週期（不計履行率）' : '節奏'}`,
    fields: [
      {
        k: 'state',
        label: '履行狀態',
        type: 'chips',
        req: true,
        opts: [
          ['done', '✓ 已跑'],
          ['skip', '— 跳過'],
          ['moved', '→ 改期']
        ]
      },
      { k: 'movedTo', label: '改到哪天（選改期時）', type: 'date' },
      ...(media.includes('note')
        ? [{ k: 'note', label: '質性紀錄', type: 'textarea', rows: 4, ph: '這次談了什麼、決定了什麼、下次要帶的議題…' }]
        : []),
      ...(media.includes('audio')
        ? [{ k: 'audio', label: '錄音檔名', ph: '1on1-0922.m4a', hint: '原型階段只記檔名；正式版接 R2（SCH-005）並自動轉寫' }]
        : [])
    ],
    values: s
      ? { state: s.state, movedTo: s.movedTo || '', note: s.note || '', audio: s.audio || '' }
      : { state: 'done', movedTo: '', note: '', audio: '' },
    effects: [
      '本週履行數與該節奏的履行率重算',
      '日曆上這一格由虛線轉為實線',
      r.kind === 'admin' ? '行政週期不影響 heatmap 的紅格' : 'heatmap 的紅格只看 ritual 的 missed'
    ],
    onSave: v => {
      if (v.state === 'moved' && !v.movedTo) throw Error('選了「改期」就要填改到哪天');
      commit(s ? 'update' : 'create', '節奏紀錄', r.title + ' · ' + date, () => {
        const body = {
          rhythmId,
          occurrenceDate: date,
          state: v.state,
          movedTo: v.state === 'moved' ? v.movedTo : '',
          note: v.note || '',
          audio: v.audio || '',
          author: DB.me
        };
        if (s) Object.assign(s, body);
        else DB.sessions.push({ id: nid('SE'), ...body });
        return [
          v.state === 'done' ? '標記為已跑' : v.state === 'skip' ? '標記為跳過' : `改期到 <b>${v.movedTo}</b>`,
          r.kind === 'admin' ? '行政週期：不計入履行率' : '履行率 heatmap 已重算'
        ];
      });
    }
  });
}

/* ------------------------------------------------------------------ */
/* 行政／活動軌                                                        */
/* ------------------------------------------------------------------ */
const OP_CATS = ['公司活動', '客戶會議', '旅遊', '慶生', '企業參訪', '行政事務'];

function formOccasion(id, presetDate) {
  const e = id ? OCC(id) : null;
  if (e && !opGuard(e)) return;
  openForm({
    replace: !!id || !!presetDate,
    crumb: e ? '活動 · ' + e.id : '新活動',
    title: e ? '編輯行政／活動' : '新增行政／活動',
    sub: '一次性事件：事前登記與準備，事後留下紀錄與素材',
    fields: [
      { k: 'title', label: '標題', req: true },
      { k: 'cat', label: '類型', type: 'chips', req: true, opts: OP_CATS },
      { k: 'onDate', label: '日期', type: 'date', req: true, half: true },
      { k: 'endOn', label: '到（跨日）', type: 'date', half: true },
      { k: 'at', label: '時間', half: true, ph: '14:00–18:00' },
      { k: 'place', label: '地點', half: true },
      { k: 'actor', label: '參與者', type: 'select', half: true, opts: [['all', '兩人'], ...PEOPLE_OPTS()] },
      {
        k: 'star',
        label: '重要',
        type: 'chips',
        half: true,
        opts: [
          ['否', '一般'],
          ['是', '★ 關鍵']
        ]
      },
      { k: 'projectId', label: '連結專案', type: 'select', opts: [['', '（無）'], ...PROJ_OPTS()] },
      { k: 'recap', label: '事後回顧', type: 'textarea', rows: 3, ph: '當天發生了什麼、哪裡可以更好、留下什麼可對外使用的素材…' },
      { k: 'remind', label: '提醒', type: 'select', opts: opRemindOpts }
    ],
    values: e
      ? {
          title: e.title,
          cat: e.cat,
          onDate: e.onDate,
          endOn: e.endOn || e.onDate,
          at: e.at || '',
          place: e.place || '',
          actor: (e.actorIds || []).length === 1 ? e.actorIds[0] : 'all',
          star: e.star ? '是' : '否',
          projectId: e.projectId || '',
          recap: e.recap || '',
          remind: e.remind || '前 1 日'
        }
      : {
          title: '',
          cat: '公司活動',
          onDate: presetDate || TODAY,
          endOn: presetDate || TODAY,
          at: '',
          place: '',
          actor: 'all',
          star: '否',
          projectId: '',
          recap: '',
          remind: '前 1 日'
        },
    effects: [
      '日曆上依起訖日逐日展開',
      '★ 關鍵活動 weight=5，會參與衝期判定',
      '連結專案者同時出現在該專案的甘特與關鍵時間'
    ],
    onDelete: e
      ? () => {
          if (!opGuard(e)) return;
          commit('delete', '活動', e.title, () => {
            DB.occasions = DB.occasions.filter(o => o.id !== id);
            return ['日曆移除該活動', '若有連結專案，甘特上的紫條一併移除'];
          });
          closeDrawer();
        }
      : null,
    onSave: v => {
      if (v.endOn && v.endOn < v.onDate) throw Error('結束日不能早於開始日');
      const body = {
        title: v.title,
        cat: v.cat,
        onDate: v.onDate,
        endOn: v.endOn || v.onDate,
        at: v.at,
        place: v.place,
        actorIds: v.actor === 'all' ? Object.keys(DB.people) : [v.actor],
        projectId: v.projectId,
        star: v.star === '是',
        recap: v.recap,
        remind: v.remind
      };
      const after = () => {
        const items = spine(body.onDate, body.onDate, { refTypes: OP_TRACKS });
        const c = detectConflicts(items, DB).filter(x => x.date === body.onDate);
        return c.length ? [`<span style="color:var(--warn)">⚠ ${esc(c[0].message)}</span>`] : [];
      };
      if (e) {
        commit('update', '活動', v.title, () => {
          Object.assign(e, body);
          return ['日曆位置已更新', ...after()];
        });
      } else {
        commit('create', '活動', v.title, () => {
          DB.occasions.push({ id: nid('OC'), prep: [], media: [], derivedFrom: '', author: DB.me, ...body });
          return [`日曆 <b>${body.onDate}</b> 新增活動`, ...after()];
        });
      }
    }
  });
}
