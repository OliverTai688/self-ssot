/* ==================================================================
   通用就地編輯：可寫的表格就是那筆資料的家
   （Owner 決策 2026-09-28：單擊可編輯欄＝直接編輯；索引與報表維持唯讀）

   一句話：表格看到的那一格，就是那筆資料的那個欄位。
   點下去直接改，不必先開抽屜、也不必先開表單。

   ── 為什麼不是「所有表格都能改」 ──────────────────────────────
   RES-002 / ARC-030 §8：resource index 是唯讀的，沒有批次寫入。
   所以這一層用「註冊制」而不是「掃描所有 <table>」：
   只有在這裡 tcReg() 過的資料種類才會長出可編輯的格子。
   物件索引、對帳建議、洞察、月結、權限表都沒有註冊 ——
   它們是別人的鏡子，改鏡子不會改到人。

   ── 三種格子的長相 ──────────────────────────────────────────
   有值、可寫    .tc-v     平常看不出來，hover 才浮出一個可點的框
   沒值、可寫    .cf-gap   琥珀色虛線空格，本身就是按鈕（沿用收單面的語彙）
   不可寫        原樣輸出，和改版前一模一樣

   ── 寫入一律走 commit() ──────────────────────────────────────
   就地編輯不是「偷偷改資料」：每一次存檔都進 changelog、可以 undo、
   會觸發 recalcLedger 與連動說明。草稿（draft: true）例外 ——
   還沒入帳的預覽列不該在歷史裡留下一堆「更新」。
   ================================================================== */

/** 目前正在編輯的那一格；空字串代表沒有任何格子在編輯中。 */
const TC = { at: '' };
/** 資料種類 → 怎麼找到它、誰能改、怎麼存。 */
const CELL_KINDS = {};

/**
 * 註冊一種可就地編輯的資料。
 * spec: {
 *   nm     人看得懂的名稱（給 aria-label 用）
 *   ent    進 changelog 的實體名稱
 *   find   id → 記錄物件（找不到回 null）
 *   can    (rec, k) → 這個人現在能不能改這一格
 *   why    (rec, k) → 不能改時要說的話（選填，沒給就用 deny()）
 *   label  rec → 進 changelog 的標題
 *   save   (rec, k, value) → 連動說明陣列；自己 commit 過就設 own: true
 *   own    true＝save 自己負責 commit 與錯誤訊息
 *   draft  true＝這是草稿，不進 changelog
 * }
 */
function tcReg(kind, spec) { CELL_KINDS[kind] = spec; }
function tcAt(kind, id, k) { return kind + '·' + id + '·' + k; }
function tcRec(kind, id) { const s = CELL_KINDS[kind]; return s ? s.find(id) : null; }

/** 進入編輯：記下是哪一格，重畫，然後把游標放進去。 */
function tcEdit(kind, id, k) {
  const spec = CELL_KINDS[kind], rec = tcRec(kind, id);
  if (!spec || !rec) return;
  if (!spec.can(rec, k)) return spec.why ? toast(spec.why(rec, k)) : deny();
  closeDrawer(true);
  TC.at = tcAt(kind, id, k);
  runtime._afterRender = () => {
    const el = root.querySelector('[data-tc-in]');
    if (!el) return;
    el.focus();
    if (el.select) el.select();
  };
  render();
}
function tcCancel() { TC.at = ''; render(); }
/** Esc 取消、Enter 收工。stopPropagation 是必要的：表格列上還有別的快捷鍵。 */
function tcKeys(event, element) {
  event.stopPropagation();
  if (event.key === 'Escape') { event.preventDefault(); tcCancel(); return; }
  if (event.key === 'Enter' && element.tagName !== 'SELECT') element.blur();
}

/**
 * 存一格。
 * TC.at 同時是「這一格還在編輯中嗎」的旗標 —— <select> 會先 change 再 blur，
 * 兩個事件都叫 tcSave，第二次進來時 TC.at 已經清掉，就自然被擋住，不會存兩次。
 */
function tcSave(kind, id, k, value) {
  if (TC.at !== tcAt(kind, id, k)) return;
  TC.at = '';
  const spec = CELL_KINDS[kind], rec = tcRec(kind, id);
  if (!spec || !rec) return render();
  if (!spec.can(rec, k)) { render(); return deny(); }
  const v = typeof value === 'string' ? value.trim() : value;
  if (spec.draft) { spec.save(rec, k, v); return render(); }
  if (spec.own) { spec.save(rec, k, v); return render(); }
  const before = { ...rec };
  let eff;
  try { eff = spec.save(rec, k, v); } catch (e) { render(); return toast(esc(e.message)); }
  if (eff === false) return render();
  commit('update', spec.ent, spec.label(rec), () => eff || ['已更新'], () => Object.assign(rec, before));
}
/** 開關型欄位不需要編輯器：點一下就是換一個值。 */
function tcToggle(kind, id, k) {
  const spec = CELL_KINDS[kind], rec = tcRec(kind, id);
  if (!spec || !rec) return;
  if (!spec.can(rec, k)) return spec.why ? toast(spec.why(rec, k)) : deny();
  TC.at = tcAt(kind, id, k);
  tcSave(kind, id, k, !rec[k]);
}

/**
 * 一個可就地編輯的儲存格內容，回傳的 HTML 直接塞進 <td>。
 * o: {
 *   kind, id, k   指到「哪一筆資料的哪個欄位」
 *   type          text | num | date | select | toggle
 *   lb            欄位名稱，給 aria-label 與空格按鈕用
 *   val           放進輸入框的原始值
 *   text          顯示值（沒給就用 val）
 *   html          true＝text 已經是 HTML，不要再逃逸
 *   opts          select 的選項 [[value, label], …]
 *   gap           沒值時空格上的字（沒給就用 lb）
 *   cls / style   顯示狀態要多帶的 class 與 inline style
 * }
 */
function tcCell(o) {
  const spec = CELL_KINDS[o.kind], rec = tcRec(o.kind, o.id);
  const raw = o.val == null ? '' : String(o.val);
  const shown = o.text != null ? String(o.text) : raw;
  const disp = o.html ? shown : esc(shown);
  if (!spec || !rec || !spec.can(rec, o.k)) return disp;
  const aria = esc((spec.nm ? spec.nm + ' · ' : '') + (o.lb || o.k));

  if (o.type === 'toggle')
    return `<button class="tc-v tc-sw ${o.cls || ''}" aria-label="${aria}" title="點一下切換" onclick="event.stopPropagation();tcToggle('${o.kind}','${o.id}','${o.k}')">${disp || '—'}</button>`;
  if (TC.at === tcAt(o.kind, o.id, o.k)) {
    const common = `class="tc-in" data-tc-in="1" aria-label="${aria}" onclick="event.stopPropagation()" onkeydown="tcKeys(event,this)"`;
    if (o.type === 'select') {
      const opts = (raw === '' ? [['', '選擇…']] : []).concat(o.opts || []);
      return `<select ${common} onchange="tcSave('${o.kind}','${o.id}','${o.k}',this.value)">${opts.map(x => `<option value="${esc(x[0])}" ${String(x[0]) === raw ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select>`;
    }
    const t = o.type === 'date' ? 'date' : 'text';
    const im = o.type === 'num' ? ' inputmode="decimal"' : '';
    return `<input type="${t}"${im} ${common} value="${esc(raw)}" onblur="tcSave('${o.kind}','${o.id}','${o.k}',this.value)">`;
  }
  if (raw === '')
    return `<button class="cf-gap" aria-label="${aria}" onclick="event.stopPropagation();tcEdit('${o.kind}','${o.id}','${o.k}')">${svg('plus', 11)} ${esc(o.gap || o.lb || '')}</button>`;
  const cls = 'tc-v' + (o.type === 'num' ? ' n' : '') + (o.type === 'select' || o.type === 'date' ? ' tc-pick' : '') + (o.cls ? ' ' + o.cls : '');
  return `<button class="${cls}" aria-label="${aria}" title="點一下改" ${o.style ? `style="${o.style}"` : ''} onclick="event.stopPropagation();tcEdit('${o.kind}','${o.id}','${o.k}')">${disp}</button>`;
}

/* ---------- 帳本的交易 ----------
   寫入仍然走既有的 editLedgerCell()：公式、已配對金額的擋，都在那裡，
   這一層只負責「哪一格、什麼型別」。 */
tcReg('txn', {
  nm: '交易', ent: '交易', own: true,
  find: id => TX(id),
  can: t => !!t && editable(t),
  why: t => cfTxLocked(t) ? cfMonthLabel(t.d.slice(0, 7)) + ' 已結帳：可以加註與補憑證，金額、日期與歸屬要先解鎖' : '此交易由作者維護',
  label: t => t.t,
  save: (t, k, v) => editLedgerCell(t.id, k, v)
});

/* ---------- 合約期款 ----------
   條件與金額是人寫的，狀態（未開票／已開票／已收／逾期）是算出來的，
   所以狀態那一欄沒有掛編輯 —— 要改狀態請走「標記收款」。 */
tcReg('ccterm', {
  nm: '期款', ent: '期款',
  find: id => DB.terms.find(x => x.id === id),
  can: t => !!t && isOwner() && !t.settledOn,
  why: t => t.settledOn ? '已收款的期款不改條件與金額；要更正請先解除勾稽' : '期款由負責人維護',
  label: t => { const p = ccProjectOfTerm(t); return `${p ? p.t : ''} 第 ${t.seq} 期`; },
  save: (t, k, v) => {
    if (k === 'amount') {
      const n = Number(String(v).replace(/[,\s]/g, ''));
      if (!Number.isFinite(n) || n <= 0) throw Error('金額須為大於 0 的數字');
      t.amount = n;
      return ['推演與兩顆燈已重算', '占比只是輔助值，不回算'];
    }
    if (k === 'expectedOn') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw Error('日期格式錯誤');
      t.expectedOn = v;
      return ['推演會再用這個客戶的付款落差平移它', '逾期燈重算'];
    }
    if (!String(v).trim()) throw Error('收款條件不能空白');
    t.label = String(v).trim();
    return ['期款條件已更新'];
  }
});

/* ---------- 薪資試算 ----------
   這是試算，不是付款：改這裡不會發錢，專案獎金仍然由帳本算出來，不給改。 */
tcReg('payroll', {
  nm: '薪資試算', ent: '薪資試算',
  find: who => DB.payroll.find(p => p.who === who),
  can: p => !!p && isOwner() && !p.separate,
  why: () => '薪資試算由管理者調整；另計的人員不在這張表裡改',
  label: p => person(p.who),
  save: (p, k, v) => {
    const n = Number(String(v).replace(/[,\s]/g, ''));
    if (!Number.isFinite(n) || n < 0) throw Error('金額須為 0 以上的數字');
    p[k] = n;
    return ['只更新本頁示例試算，不付款'];
  }
});

/* ---------- 歸帳預覽列 ----------
   還沒入帳的那一列。它長得和帳本的列一模一樣，因為它就是「等一下會變成那一列」的東西。
   draft: true —— 在預覽列上打字不該在 changelog 留下一堆「更新」，
   歷史只記真正入帳的那一次。 */
tcReg('filing', {
  nm: '歸帳預覽', ent: '歸帳', draft: true,
  find: id => cfFilingDraft(id),
  can: () => isOwner(),
  why: () => '歸帳是記帳者的工作',
  label: dr => dr.t,
  save: (dr, k, v) => cfDraftSet(dr.id, k, v)
});
