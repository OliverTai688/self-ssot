/* ==================================================================
   表單 = 彈跳視窗（modal）；抽屜 = 檢視詳情

   v5 原型把表單引擎掛在右側抽屜上（openForm -> openDrawer('form')），
   於是「看一筆交易」跟「填一張表」共用同一個面，兩者互相覆蓋：
   從詳情按編輯，詳情就不見了；存檔後抽屜整個關掉，回不到原本的脈絡。

   這一層把表單搬到置中彈跳視窗，抽屜留給詳情：
     - 填表時背後的詳情還在，存檔後直接重繪，不必重新打開；
     - 破壞性確認（confirmDelete / typeToConfirm）仍走 #modalWrap，
       z-index 疊在表單視窗之上，兩者不搶同一個容器。

   只改「表單開在哪裡」。驗證、connective effects、commit/undo、
   權限守衛（opGuard / editable）全部沿用既有引擎，沒有第二套表單邏輯。
   ================================================================== */

let fmReturn = null;

root.insertAdjacentHTML('beforeend', `<div class="fm-wrap" id="formModalWrap" onclick="if(event.target===this)cancelFormModal()">
 <div class="fm" role="dialog" aria-modal="true" aria-labelledby="fmTitle">
  <div class="fm-h">
   <div class="fm-ht">
    <div class="fm-crumb" id="fmCrumb"></div>
    <h3 id="fmTitle"></h3>
    <p id="fmSub"></p>
   </div>
   <button class="iconbtn" type="button" id="fmClose" title="關閉（Esc）" aria-label="關閉表單" onclick="cancelFormModal()">${svg('x', 15)}</button>
  </div>
  <div class="fm-b" id="fmBody"></div>
  <div class="fm-f" id="fmFoot"></div>
 </div>
</div>`);
$('#formModalWrap').inert = true;

function formModalOpen() {
  const w = $('#formModalWrap');
  return !!w && w.classList.contains('on');
}

function paintFormModal() {
  if (!FORM) return;
  const crumb = $('#fmCrumb'), sub = $('#fmSub');
  crumb.textContent = FORM.crumb || '表單';
  $('#fmTitle').innerHTML = esc(FORM.title || '');
  sub.innerHTML = FORM.sub || '';
  sub.style.display = FORM.sub ? '' : 'none';
  $('#fmBody').innerHTML = formBody();
  const del = FORM.onDelete ? `<button class="btn dgr" type="button" onclick="FORM.onDelete()">${svg('trash')} 刪除</button>` : '';
  $('#fmFoot').innerHTML = `${del}<span class="fm-sp"></span>
    <button class="btn" type="button" onclick="cancelFormModal()">取消</button>
    <button class="btn pri" type="button" onclick="saveForm()">${esc(FORM.saveLabel || '儲存')}</button>`;
}

function openFormModal() {
  const w = $('#formModalWrap');
  if (!formModalOpen()) fmReturn = shadow.activeElement || fmReturn;
  paintFormModal();
  w.inert = false;
  w.classList.add('on');
  setTimeout(() => $('#fmBody').querySelector('input,textarea,select,[tabindex="0"],button')?.focus(), 0);
}

function closeFormModal() {
  const w = $('#formModalWrap');
  if (!w.classList.contains('on')) return;
  w.classList.remove('on');
  w.inert = true;
  FORM = null;
  if (fmReturn?.isConnected) fmReturn.focus();
  fmReturn = null;
}

/** 取消＝放棄這張表；背後的詳情抽屜保持原狀。 */
function cancelFormModal() {
  const c = FORM;
  closeFormModal();
  if (c && c.onCancel) c.onCancel();
}

/* 表單一律開在彈跳視窗。cfg.replace 原本是抽屜堆疊語意，現在無意義：
   詳情本來就留在背後，不需要被表單取代。 */
openForm = function (cfg) {
  FORM = cfg;
  openFormModal();
};

/* 與原引擎同一套驗證與存檔順序，只有「存完關哪一層」不同：
   關表單視窗，然後重繪背後的詳情，而不是把詳情一起關掉。 */
saveForm = function () {
  const c = FORM;
  if (!c) return;
  const vals = {};
  let bad = null;
  c.fields.forEach(f => {
    const v = fVal(f.k);
    vals[f.k] = v;
    const el = getById('f_' + f.k);
    const empty = v == null || String(v).trim() === '';
    if (el) el.classList.toggle('err', !!(f.req && empty));
    if (f.req && empty && !bad) bad = f.label;
  });
  const err = getById('fErr');
  if (bad) {
    err.textContent = '「' + bad + '」為必填';
    err.classList.add('on');
    err.setAttribute('role', 'alert');
    return;
  }
  err.classList.remove('on');
  validateForm(c, vals);
  c.onSave(vals);
  if (FORM !== c) return;
  if (!c.keepOpen) {
    closeFormModal();
    if (S.stack.length) paintDrawer();
  }
};

/* 表單欄位在存檔前被改寫（formTxn 加數量／單價、formRepoFile 綁文件版本）
   時會呼叫 paintDrawer() 重畫。表單已不在抽屜裡，改為重畫視窗；
   抽屜空堆疊時不得呼叫原函式，否則 S.stack[-1] 為 undefined 會丟例外。 */
const fmBasePaintDrawer = paintDrawer;
paintDrawer = function () {
  if (formModalOpen()) paintFormModal();
  if (S.stack.length) fmBasePaintDrawer();
};

/* onDelete 一律走 confirmDelete -> closeDrawer()：在原型時代，那一行關掉的就是
   「裝著表單的抽屜」。表單搬進視窗後，同一行只會關掉背後的詳情，表單會停在
   一筆已經刪掉的紀錄上。所以 closeDrawer 一併收掉表單視窗——刪除本來就該把
   兩層都收掉。存檔則相反：saveForm 不碰抽屜，讓使用者回到更新後的詳情。 */
const fmBaseCloseDrawer = closeDrawer;
closeDrawer = function (...args) {
  if (formModalOpen()) closeFormModal();
  return fmBaseCloseDrawer(...args);
};

/* 原型把 'form' 當成一種抽屜型別。保留回退路徑，但導向視窗，
   避免任何殘留的 openDrawer('form') 又把表單畫回抽屜。 */
const fmBaseOpenDrawer = openDrawer;
openDrawer = function (type, id, replace) {
  if (type === 'form') {
    if (FORM) openFormModal();
    return;
  }
  return fmBaseOpenDrawer(type, id, replace);
};

/* Esc 先關表單視窗。用 document 的捕獲階段攔截，因為原型與 extensions
   都在冒泡階段掛了 Escape -> closeDrawer()，那會把背後的詳情一起關掉。 */
doc.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !formModalOpen()) return;
  if ($('#modalWrap.on') || $('#cmdkWrap.on') || $('#summon.on')) return;
  e.preventDefault();
  e.stopPropagation();
  cancelFormModal();
}, { capture: true, signal: controller.signal });
