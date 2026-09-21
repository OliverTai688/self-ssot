/** Narrow, reviewable color-token fixes for the archived v5 reference CSS.
 * Original prototype file never changes; this only transforms the extracted
 * <style> text before it is written to styles.ts, so these selectors read
 * the active company-theme's CSS variables instead of a black-theme-only hex.
 * Keeps the literal as a var() fallback so nothing regresses if a name typos.
 */
export function patchCss(css) {
  const rep = (a, b) => {
    if (!css.includes(a)) throw new Error('v5 css patch no longer matches: ' + a.slice(0, 140))
    css = css.replace(a, b)
  }
  rep(
    '.iconbtn .n{position:absolute;top:1px;right:1px;min-width:13px;height:13px;padding:0 3px;border-radius:7px;background:var(--pri);color:#07121b;',
    '.iconbtn .n{position:absolute;top:1px;right:1px;min-width:13px;height:13px;padding:0 3px;border-radius:7px;background:var(--pri);color:var(--on-pri,#07121b);'
  )
  rep(
    '.rail-i .bdg{position:absolute;top:5px;right:10px;min-width:15px;height:15px;padding:0 4px;border-radius:8px;background:var(--danger);color:#1a0e0d;',
    '.rail-i .bdg{position:absolute;top:5px;right:10px;min-width:15px;height:15px;padding:0 4px;border-radius:8px;background:var(--danger);color:var(--on-danger,#1a0e0d);'
  )
  rep(
    '.btn.dgr{background:var(--danger-bg);border-color:#5d2b26;color:var(--danger)}',
    '.btn.dgr{background:var(--danger-bg);border-color:var(--danger-br,#5d2b26);color:var(--danger)}'
  )
  rep(
    '.masked{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text-3);background:repeating-linear-gradient(45deg,#191d24,#191d24 5px,#1d222a 5px,#1d222a 10px);',
    '.masked{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text-3);background:repeating-linear-gradient(45deg,var(--surface,#191d24),var(--surface,#191d24) 5px,var(--surface-3,#1d222a) 5px,var(--surface-3,#1d222a) 10px);'
  )
  rep('.col.now{background:#0e1319}', '.col.now{background:var(--surface,#0e1319)}')
  rep('.toast .undo:hover{background:#2e3742}', '.toast .undo:hover{background:var(--surface-4,#2e3742)}')
  rep(
    '.tmpl-h{display:flex;align-items:center;gap:8px;padding:8px 11px;border-bottom:1px solid var(--border);background:#12161c}',
    '.tmpl-h{display:flex;align-items:center;gap:8px;padding:8px 11px;border-bottom:1px solid var(--border);background:var(--surface-2,#12161c)}'
  )
  rep(
    '.vch .ph{height:34px;border-radius:4px;background:linear-gradient(135deg,#1c222a,#252d38);',
    '.vch .ph{height:34px;border-radius:4px;background:linear-gradient(135deg,var(--surface-2,#1c222a),var(--surface-3,#252d38));'
  )
  rep(
    '.vtip{position:fixed;z-index:80;pointer-events:none;background:#20262e;',
    '.vtip{position:fixed;z-index:80;pointer-events:none;background:var(--surface-3,#20262e);'
  )
  rep('svg.chart .dot:hover{stroke:#fff;stroke-width:2}', 'svg.chart .dot:hover{stroke:var(--text,#fff);stroke-width:2}')
  rep('.cal .dc.out{background:#0d1014}', '.cal .dc.out{background:var(--bg,#0d1014)}')
  rep(
    '.permbar{display:flex;align-items:center;gap:9px;background:var(--info-bg);border:1px solid #2f2748;',
    '.permbar{display:flex;align-items:center;gap:9px;background:var(--info-bg);border:1px solid var(--border-3,#2f2748);'
  )
  rep(
    '.tg{background:#1b2b38;border:1px solid #27455c;',
    '.tg{background:var(--surface-3,#1b2b38);border:1px solid var(--border-3,#27455c);'
  )
  return css
}
