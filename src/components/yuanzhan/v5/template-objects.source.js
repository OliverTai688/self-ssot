// Document Objects & Canvas Page Integration
// Standup, 1:1, Meeting, Research, Retro as first-class objects
// In Journal: Compact rectangular component bar with collapse/expand toggle, directly editable inline!
// In Independent Page: Authentic .doc outline document editor unified with journal writing experience (NO form fields/textareas).
//
// 元件內文採用跟主日誌完全相同的區塊模型（sec.blocks，元素同 journal.blocks），
// 直接重用 ebHtml/docClick/docKey/docInput/checkTrigger/applySummon 這整套既有引擎——
// 見 source-patches.mjs 對 `blks()` 的最小擴充點（BLKS_OVERRIDE），
// 讓同一套「書寫、Tab 縮排、# 召喚、@ 引用既有物件、?@ 請對方回覆」在元件內文裡原樣可用。

DB.docObjects = DB.docObjects || [];

const DOC_METAS = {
  standup: {
    k: 'standup',
    nm: 'Standup',
    chip: 'c-p',
    color: 'var(--pri)',
    secs: ['Yesterday', 'Today', 'Blocker', 'Need Decision'],
    placeholders: [
      '昨日完成進展、重要產出與佐證依據...',
      '今日聚焦事項、預計推進之工作項目...',
      '目前遇到的阻礙、相依性或外部等待...',
      '需要決策、討論或團隊支援之事項...'
    ]
  },
  '1on1': {
    k: '1on1',
    nm: '1:1 檢核',
    chip: 'c-teal',
    color: 'var(--teal)',
    secs: ['近況', '進展與證據', '阻礙', '需要公司支持', '下次檢核前要做的'],
    placeholders: [
      '近期工作節奏、身心狀態與整體反思...',
      '具體里程碑進展、完成產出與 Evidence...',
      '目前受阻之處、瓶頸或需要排除之痛點...',
      '需要公司層級資源、授權或支持...',
      '下次檢核前承諾交付之具體行動項目...'
    ]
  },
  meeting: {
    k: 'meeting',
    nm: '會議紀錄',
    chip: 'c-i',
    color: 'var(--info)',
    secs: ['出席', '議題', '決議', '待辦', '未解問題'],
    placeholders: [
      '出席成員、紀錄人員、會議時間與地點...',
      '本次會議核心探討之主題與背景...',
      '會議達成之共識與正式定案決議...',
      'Action Items（負責人、具體行動、截止時間）...',
      '會中未有定論、需要後續跟進之事項...'
    ]
  },
  retro: {
    k: 'retro',
    nm: '回顧',
    chip: 'c-w',
    color: 'var(--warn)',
    secs: ['做得好', '做不好', '下次改什麼'],
    placeholders: [
      'Keep：本次迭代中成效良好、值得保持的實踐...',
      'Problem：發現的問題、摩擦點或交付延遲原因...',
      'Try：下個週期具體可實施的改進方案與實驗...'
    ]
  },
  research: {
    k: 'research',
    nm: '研究筆記',
    chip: 'c-o',
    color: 'var(--ok)',
    secs: ['問題', '來源', '發現', '對我們的意義'],
    placeholders: [
      '想要探究或驗證的核心研究問題...',
      '參考文件、文獻、競品或調研資料來源...',
      '關鍵研究洞察、實驗數據與核心發現...',
      '對本系統或產品策略的具體啟示與後續行動...'
    ]
  }
};

function metaOf(doc) {
  return DOC_METAS[doc.type] || { nm: doc.title || '文件', chip: 'c-p', color: 'var(--pri)', placeholders: [] };
}

function blankSecBlocks() { return [{ id: newBid(), t: 'p', ind: 0, text: '' }]; }

/* RES-018 參考碼。序號走 DB.seq（與 nid() 同一個計數來源），日期用物件誕生那天。
 *
 * DB.seq 是每次載入才建的記憶體計數器，資料庫沒有存，也沒有從既有物件回填。只靠它
 * 遞增的話，任何一次重新整理、任何第二個席位，同一天建立的第一個同型別物件都會拿到
 * 000001：兩筆在 upsert 時互相覆蓋；更糟的是，如果新物件正好誕生在同 id 那個物件的
 * section 裡，那張卡片就指向包著它自己的容器，渲染時無限遞迴（YZUI-020）。
 *
 * 修法維持 RES-018 的四段格式不變，只讓序號真的不重複：
 *   1. 第一次用到時，序號從既有物件的最大值續號，而不是從 0 重來。
 *   2. 產生後再比對一次既有 id，撞到就往下跳，直到空號為止。
 * 舊物件的 id 原樣保留、不回填（回填等於重寫歷史引用）。
 *
 * 殘留缺口：兩個席位在各自載入之後、都還沒看到對方新列時同時建立，仍可能撞號。
 * 要根治得把號碼改由伺服器指派；在那之前由 renderDocSectionBody 的循環保護兜底，
 * 讓撞號最多變成資料錯亂，不會再讓整頁掛掉。
 */
function docObjectSeqFloor() {
  let max = 0;
  for (const d of DB.docObjects || []) {
    const m = /^[A-Z0-9]+-JRNL-(\d{6})-/.exec(String(d.id || ''));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
function docObjectRefCode(typeKey, day) {
  const type = String(typeKey || 'DOC').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (DB.seq.DOCREF == null) DB.seq.DOCREF = docObjectSeqFloor();
  const taken = new Set((DB.docObjects || []).map(d => String(d.id)));
  const date = String(day || '').replace(/-/g, '');
  let id = '';
  do {
    DB.seq.DOCREF = (DB.seq.DOCREF || 0) + 1;
    id = (type || 'DOC') + '-JRNL-' + String(DB.seq.DOCREF).padStart(6, '0') + '-' + date;
  } while (taken.has(id));
  return id;
}

function createDocObject(typeKey, day, tpl) {
  const meta = DOC_METAS[typeKey] || {
    k: typeKey,
    nm: (tpl && tpl.h) || typeKey,
    chip: 'c-p',
    color: 'var(--pri)',
    secs: (tpl && tpl.secs) || ['內容'],
    placeholders: ['寫點什麼...']
  };
  // RES-018 參考碼：{OBJECT_TYPE}-{ORIGIN}-{SEQUENCE:6}-{DATE:YYYYMMDD}。
  // 建立時指派一次、永不重生成、改顯示名稱不得更動 —— 因為 docObjectName() 會隨內容
  // 重算標題，標題不能當引用鍵。舊物件的 id 保留原樣，不回填（回填等於重寫歷史引用）。
  const bornDay = day || S.jday || TODAY;
  const id = docObjectRefCode(typeKey, bornDay);
  const docObj = {
    id,
    type: typeKey,
    subType: typeKey,
    title: meta.nm,
    titleAuto: true, // 系統自動命名；使用者手動改過標題後會關閉，見 DRAWERS.doc_object 的 oninput
    day: bornDay,
    author: DB.me,
    collapsed: false, // Default expanded so user can edit right away
    createdAt: Date.now(),
    updatedAt: Date.now(),
    secs: meta.secs.map(s => ({
      title: s,
      blocks: blankSecBlocks()
    }))
  };
  DB.docObjects.push(docObj);
  return docObj;
}

// 舊資料相容：sec.blocks 還沒建立時（既有物件、或舊版留下的 sec.text 純文字），
// 用現有文字補出一個段落區塊陣列，之後就跟主日誌走同一套區塊模型。
function ensureSecBlocks(sec) {
  if (Array.isArray(sec.blocks) && sec.blocks.length) return sec.blocks;
  const lines = String(sec.text || '').split('\n').filter(line => line.trim());
  sec.blocks = lines.length ? lines.map(line => ({ id: newBid(), t: 'p', ind: 0, text: line })) : blankSecBlocks();
  return sec.blocks;
}

function secWordCount(sec) {
  return ensureSecBlocks(sec).reduce((acc, b) => acc + (TEXTY(b.t) && b.text ? b.text.length : 0), 0);
}

// 自動命名：抓各段落第一個有內容的區塊當名稱依據；使用者若在獨立頁面手動改過標題（titleAuto=false），尊重手動命名。
function docObjectAutoName(doc, meta) {
  for (const sec of doc.secs) {
    const first = ensureSecBlocks(sec).find(b => TEXTY(b.t) && b.text && b.text.trim());
    if (first) {
      const clean = first.text.trim().replace(/\s+/g, ' ');
      return `${meta.nm}：${clean.length > 20 ? clean.slice(0, 20) + '…' : clean}`;
    }
  }
  return `${meta.nm} · ${doc.day}`;
}
function docObjectName(doc) {
  const meta = metaOf(doc);
  if (doc.titleAuto === false) return doc.title || meta.nm;
  const auto = docObjectAutoName(doc, meta);
  doc.title = auto;
  return auto;
}
function docObjectTimestamp(doc) {
  if (!doc.updatedAt) return '尚未編輯';
  const d = new Date(doc.updatedAt), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  const sameDay = new Date().toDateString() === d.toDateString();
  return (sameDay ? '' : `${d.getMonth() + 1}/${d.getDate()} `) + `${hh}:${mm} 更新`;
}

function migrateLegacyTemplateBlocks(journal) {
  if (!journal || !Array.isArray(journal.blocks)) return false;
  const arr = journal.blocks;
  let modified = false;

  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (b.t === 'h2') {
      const bTitle = (b.text || '').trim().toLowerCase();
      const tplEntry = Object.entries(DOC_METAS).find(([k, m]) => m.nm.toLowerCase() === bTitle || k.toLowerCase() === bTitle);
      if (tplEntry) {
        const [typeKey, meta] = tplEntry;
        let j = i + 1;
        const secsMap = new Map();
        meta.secs.forEach(s => secsMap.set(s, []));
        let curSec = null;
        const preservedBlocks = [];
        while (j < arr.length && arr[j].t !== 'h1' && arr[j].t !== 'h2') {
          if (arr[j].t === 'h3') {
            const h3Text = (arr[j].text || '').trim();
            const matchedSec = meta.secs.find(s => s.toLowerCase() === h3Text.toLowerCase()) || h3Text;
            curSec = matchedSec;
            if (!secsMap.has(curSec)) secsMap.set(curSec, []);
          } else if (arr[j].t === 'p' && curSec) {
            if (arr[j].text && arr[j].text.trim()) {
              secsMap.get(curSec).push(arr[j].text.trim());
            }
          } else if (arr[j].t === 'obj') {
            preservedBlocks.push(arr[j]);
          }
          j++;
        }

        const secs = meta.secs.map(s => {
          const lines = secsMap.get(s) || [];
          return {
            title: s,
            blocks: lines.length ? lines.map(line => ({ id: newBid(), t: 'p', ind: 0, text: line })) : blankSecBlocks()
          };
        });

        const docId = 'DOC-' + typeKey.toUpperCase() + '-' + b.id;
        let existing = DB.docObjects.find(d => d.id === docId);
        if (!existing) {
          existing = {
            id: docId,
            type: typeKey,
            subType: typeKey,
            title: meta.nm,
            titleAuto: true,
            day: journal.title || S.jday || TODAY,
            author: journalAuthor || DB.me,
            collapsed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            secs
          };
          DB.docObjects.push(existing);
        }

        const replacement = [
          {
            id: b.id,
            t: 'obj',
            ind: b.ind || 0,
            obj: {
              ty: 'doc_object',
              rid: existing.id
            }
          },
          ...preservedBlocks
        ];

        arr.splice(i, j - i, ...replacement);
        i += replacement.length - 1;
        modified = true;
      }
    }
  }
  return modified;
}

// 每個 section 的書寫區塊：跟主日誌的 #doc 用同一套 .doc/.eb 標記與事件（docClick/docKey/docInput），
// 唯一差別是容器帶 data-doc-sec，讓 blks()（見 source-patches.mjs 的 BLKS_OVERRIDE）改指到這個 section 的 blocks 陣列。
// 這樣 Enter/Tab/Backspace、# 召喚、@ 引用既有物件、?@ 請對方回覆／!今天 全部原封不動可用，不必另外重寫一套引擎。
/* 展開路徑上已經出現過的物件，不再往下展開。
 *
 * renderDocSectionBody → ebHtml → renderDocObjectCard → renderDocSectionBody 這條環
 * 沒有任何其他終止條件，所以只要資料裡有一張卡片指向包著它的物件（撞號的後果），
 * 或兩個物件互相引用，整頁就會 RangeError: Maximum call stack size exceeded ——
 * 在事件裡是「操作未完成」，在掛載時就是「工作台暫時無法載入」。
 *
 * 擋在 section 這一層而不是卡片那一層：每一條環都必經這裡，而 renderDocObjectCard
 * 會被 agenda 之類的擴充覆寫，擋在那裡會被繞過。 */
const DOC_SEC_STACK = [];
function renderDocSectionBody(doc, sec, idx, meta) {
  if (DOC_SEC_STACK.includes(doc.id)) {
    return `<div class="eb-doc-inline-sec"><div class="eb-doc-inline-sec-title">${esc(sec.title)}</div>
      <div class="eb-doc-cycle">這個物件已經在上層展開了，不再往下展開（循環引用：${esc(doc.id)}）</div></div>`;
  }
  DOC_SEC_STACK.push(doc.id);
  try {
    return renderDocSectionBodyInner(doc, sec, idx, meta);
  } finally {
    DOC_SEC_STACK.pop();
  }
}
function renderDocSectionBodyInner(doc, sec, idx, meta) {
  const blocks = ensureSecBlocks(sec);
  let html = blocks.map(ebHtml).join('');
  if (blocks.length === 1 && !blocks[0].text) {
    const ph = meta.placeholders[idx] || '寫點什麼：# 召喚 component、@ 引用既有物件或請對方回覆、?@ 直接發送請求';
    html = html.replace(/data-ph="[^"]*"/, `data-ph="${esc(ph)}"`);
  }
  return `<div class="eb-doc-inline-sec">
    <div class="eb-doc-inline-sec-title">${esc(sec.title)}</div>
    <div class="doc eb-doc-secbody" id="secdoc-${doc.id}-${idx}" data-doc-sec="1" data-doc-id="${doc.id}" data-sec-idx="${idx}"
         onclick="docClick(event)" onkeydown="docKey(event)" oninput="docInput(event)"
         oncompositionstart="docComposeStart()" oncompositionend="docComposeEnd(event)">${html}</div>
  </div>`;
}

// Render the component card in the Journal
// 1. One compact rectangular component bar ("一行component長方形")
// 2. Clickable toggle button to collapse/expand ("底下有可點選的按鈕收合展開")
// 3. Directly editable inline in the journal, same writing engine as the main journal
// 4. 收合時只顯示名稱和時間戳記
function renderDocObjectCard(b) {
  const o = b.obj || {};
  const doc = (DB.docObjects || []).find(d => d.id === o.rid);
  if (!doc) return `<div class="eb-obj">找不到物件 (${esc(o.rid || '')})</div>`;

  const meta = metaOf(doc);
  const isCollapsed = doc.collapsed == null ? false : !!doc.collapsed;
  const name = docObjectName(doc);

  return `
  <div class="eb-obj eb-doc-card ${isCollapsed ? 'collapsed' : 'expanded'}" data-doc-id="${doc.id}">
    <!-- 一行 component 長方形：收合時只留名稱和時間戳記 -->
    <div class="eb-doc-bar">
      <div class="eb-doc-bar-left" onclick="toggleDocCollapse('${doc.id}')">
        <span class="chip ${meta.chip}">${meta.nm}</span>
        <span class="eb-doc-bar-title">${esc(name)}</span>
        <span class="eb-doc-bar-meta">${isCollapsed ? esc(docObjectTimestamp(doc)) : `${doc.day} · ${person(doc.author)}${doc.secs.reduce((a,sec)=>a+secWordCount(sec),0) ? ' · '+doc.secs.reduce((a,sec)=>a+secWordCount(sec),0)+' 字' : ''}`}</span>
      </div>
      <div class="eb-doc-bar-right">
        <!-- 收合展開按鈕 -->
        <button type="button" class="eb-doc-toggle-btn" title="${isCollapsed ? '展開編輯' : '收合長方形'}" onclick="event.stopPropagation();toggleDocCollapse('${doc.id}')">
          <span class="eb-doc-btn-lbl">${isCollapsed ? '展開' : '收合'}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="eb-doc-arr ${isCollapsed ? 'down' : 'up'}"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <!-- 小 icon 點選進到獨立頁面寫 -->
        <button type="button" class="eb-doc-icon-btn" title="進到獨立頁面撰寫" onclick="event.stopPropagation();openDocPage('${doc.id}')">
          ${svg('goto', 13)}
        </button>
      </div>
    </div>

    <!-- 展開時直接在日誌上書寫，與主日誌同一套區塊引擎（# 召喚、@ 引用、?@ 請回覆都能用） -->
    ${!isCollapsed ? `
      <div class="eb-doc-inline-body">
        ${doc.secs.map((sec, idx) => renderDocSectionBody(doc, sec, idx, meta)).join('')}
      </div>
    ` : ''}
  </div>
  `;
}

function toggleDocCollapse(docId) {
  const doc = (DB.docObjects || []).find(d => d.id === docId);
  if (!doc) return;
  doc.collapsed = !doc.collapsed;
  render();
}

function openDocPage(docId) {
  openDrawer('doc_object', docId);
}

// Independent Document Page (NOT a form! Unified .doc block outline writing style, same engine as inline card)
DRAWERS.doc_object = id => {
  const doc = (DB.docObjects || []).find(d => d.id === id);
  if (!doc) return {
    crumb: '—',
    title: '找不到文件',
    sub: '',
    body: '<div class="empty">此物件已刪除或不存在</div>',
    foot: ''
  };

  const meta = metaOf(doc);

  return {
    crumb: `日誌 › ${meta.nm} 獨立頁面`,
    title: `<span class="doc-page-title ed" contenteditable="true" data-doc-id="${doc.id}" data-ph="輸入標題...">${esc(docObjectName(doc))}</span>`,
    sub: `<span class="doc-page-meta">
        <span class="chip ${meta.chip}">${meta.nm}</span>
        <span>${doc.day}</span>
        <span>由 ${person(doc.author)} 撰寫</span>
        <span>${esc(docObjectTimestamp(doc))}</span>
        <span class="doc-page-sync-tag">● 與日誌即時雙向連動</span>
      </span>`,
    body: `
      <!-- 統一的大綱式文件編輯器，與日誌完全相同的書寫體驗（同一套 docClick/docKey/docInput 引擎） -->
      <div class="doc-page-workspace">
        ${doc.secs.map((sec, idx) => renderDocSectionBody(doc, sec, idx, meta)).join('')}
      </div>
    `,
    foot: `
      <button class="btn pri" onclick="closeDrawer()">${svg('commit', 12)} 完成並返回日誌</button>
      <button class="btn" onclick="copyDocMarkdown('${doc.id}')">${svg('copy', 12)} 複製全文</button>
      <button class="btn dgr" style="margin-left:auto" onclick="deleteDocObject('${doc.id}')">${svg('trash', 12)} 刪除物件</button>
    `,
    after: () => {
      // Setup title sync — 手動改標題後關閉自動命名，尊重使用者的命名。
      const titleEl = root.querySelector('.doc-page-title');
      if (titleEl) {
        titleEl.oninput = () => {
          doc.title = titleEl.innerText.replace(/\n$/, '');
          doc.titleAuto = false;
          doc.updatedAt = Date.now();
          render();
        };
      }
    }
  };
};

function copyDocMarkdown(id) {
  const doc = (DB.docObjects || []).find(d => d.id === id);
  if (!doc) return;
  let md = `# ${docObjectName(doc)}\n\n`;
  md += `> 日期：${doc.day} | 作者：${person(doc.author)}\n\n`;
  doc.secs.forEach(s => {
    const text = ensureSecBlocks(s).filter(b => TEXTY(b.t) && b.text).map(b => b.text).join('\n');
    md += `## ${s.title}\n\n${text || '（無）'}\n\n`;
  });
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(md).then(() => {
      toast('已複製全文 Markdown 至剪貼簿');
    }).catch(() => {
      toast('已產出全文內容');
    });
  } else {
    toast('已產出全文內容');
  }
}

function deleteDocObject(id) {
  if (!confirm('確定要刪除此物件嗎？日誌中的卡片也將一併移除。')) return;
  const docIdx = (DB.docObjects || []).findIndex(d => d.id === id);
  if (docIdx >= 0) DB.docObjects.splice(docIdx, 1);
  const arr = blks();
  const bIdx2 = arr.findIndex(b => b.t === 'obj' && b.obj && b.obj.rid === id);
  if (bIdx2 >= 0) arr.splice(bIdx2, 1);
  closeDrawer();
  render();
  toast('已刪除物件');
}

// ---- 讓元件內文用回主日誌那一套引擎：追蹤目前 focus 在哪個 section，
// blks()（見 source-patches.mjs 的 BLKS_OVERRIDE 擴充點）就切去對應的 sec.blocks。
// 只影響「編輯中」這件事，跟畫面渲染（jcMyColumn/VIEWS.journal 等直接讀 .blocks 屬性）完全無關，不會互相干擾。
root.addEventListener('focusin', e => {
  const secEl = e.target && e.target.closest && e.target.closest('[data-doc-sec]');
  if (secEl) {
    const doc = (DB.docObjects || []).find(d => d.id === secEl.dataset.docId);
    const sec = doc && doc.secs[Number(secEl.dataset.secIdx)];
    if (sec) {
      ensureSecBlocks(sec);
      BLKS_OVERRIDE = () => { doc.updatedAt = Date.now(); return sec.blocks; };
      return;
    }
  }
  BLKS_OVERRIDE = null;
}, true);

// Ensure legacy journal entries are automatically migrated on currentJournal()
const prevCurrentJournal = currentJournal;
currentJournal = function() {
  const j = prevCurrentJournal();
  if (j) migrateLegacyTemplateBlocks(j);
  return j;
};
