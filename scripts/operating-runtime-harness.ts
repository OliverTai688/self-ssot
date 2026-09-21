/**
 * v5 runtime 的無瀏覽器回歸夾具（PLN-073）。
 *
 * `scripts/verify-yuanzhan-v5.cjs` 需要 dev server + 真實 Chrome，只能在開發機上跑；
 * 轉移期間需要一個能在任何環境快速重跑的檢查，用來回答唯一重要的問題：
 *   「這次改動有沒有讓任何一頁的輸出變得不一樣？」
 *
 * 作法：用 jsdom 掛起 mountV5，走訪每個模組的每個分頁，取 #inner 的純文字，
 * 與另一份 runtime（基準）逐頁比對。它不驗視覺，只驗內容與錯誤 —— 視覺仍由
 * verify-yuanzhan-v5 的截圖比對負責。
 *
 * 需要 devDependency：jsdom
 */
import { JSDOM } from 'jsdom'

export interface PageSnapshot {
  wb: string
  tab: number
  tabName: string
  text: string
  len: number
}

export interface MountResult {
  pages: PageSnapshot[]
  errors: string[]
  root: HTMLElement
  workbench: { destroy(): void; snapshot(): unknown; navigate(wb: string, tab?: number): void }
}

/** jsdom 沒有的瀏覽器全域，補到剛好夠 runtime 跑起來為止。 */
function installGlobals(dom: JSDOM) {
  const g = globalThis as unknown as Record<string, unknown>
  g.window = dom.window
  g.document = dom.window.document
  try {
    Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true })
  } catch {
    /* 某些 node 版本的 navigator 是唯讀的 getter，忽略即可 */
  }
  const win = dom.window as unknown as Record<string, unknown>
  for (const key of [
    'Node',
    'Element',
    'HTMLElement',
    'CustomEvent',
    'Event',
    'MutationObserver',
    'AbortController',
    'AbortSignal',
    'DataTransfer',
    'CSS',
    'DOMParser',
    'XMLSerializer',
  ]) {
    if (win[key]) g[key] = win[key]
  }
  const css = g.CSS as { escape?: (v: string) => string } | undefined
  if (!css || !css.escape) {
    g.CSS = { escape: (v: string) => String(v).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c) }
  }
  g.getComputedStyle = dom.window.getComputedStyle
  g.requestAnimationFrame = (fn: () => void) => setTimeout(fn, 0)
  g.cancelAnimationFrame = (id: number) => clearTimeout(id)
  g.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  g.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

/**
 * runtime 的事件處理器由 MutationObserver 驅動（microtask），
 * 所以每次改動 DOM 之後都要讓事件迴圈轉一圈，否則 click 會靜默無效。
 */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

export async function mountAll(
  mode: 'showcase' | 'empty',
  runtimeModule?: string,
): Promise<MountResult> {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  installGlobals(dom)

  const errors: string[] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => errors.push(args.map(String).join(' '))

  const { createV5State } = await import('../src/lib/ui-data/yuanzhan/v5-state')
  const mod = await import(runtimeModule || '../src/components/yuanzhan/v5/runtime.js')
  const mountV5 = mod.mountV5 as (root: unknown, state: unknown) => MountResult['workbench']

  const root = dom.window.document.createElement('div')
  root.className = 'v5-root'
  dom.window.document.body.appendChild(root)
  const workbench = mountV5(root, JSON.parse(JSON.stringify(createV5State(mode))))
  await tick()

  const pages: PageSnapshot[] = []
  const seen = new Set<string>()
  const railCount = root.querySelectorAll('.rail-i').length
  for (let r = 0; r < railCount; r++) {
    const rail = root.querySelectorAll('.rail-i')[r] as HTMLElement | undefined
    if (!rail) continue
    try {
      rail.click()
    } catch (error) {
      errors.push(`rail ${r}: ${String(error)}`)
    }
    await tick()
    const wb = (root.querySelector('#wbName') as HTMLElement | null)?.textContent || ''
    const tabCount = root.querySelectorAll('#tabs .tab').length
    for (let i = 0; i < tabCount; i++) {
      const tab = root.querySelectorAll('#tabs .tab')[i] as HTMLElement | undefined
      const tabName = tab?.textContent || ''
      try {
        tab?.click()
      } catch (error) {
        errors.push(`${wb}/${i}: ${String(error)}`)
      }
      await tick()
      const key = `${wb}|${i}`
      if (seen.has(key)) continue
      seen.add(key)
      const inner = root.querySelector('#inner') as HTMLElement | null
      pages.push({
        wb,
        tab: i,
        tabName,
        text: (inner?.textContent || '').replace(/\s+/g, ' ').trim(),
        len: (inner?.innerHTML || '').length,
      })
    }
  }

  console.error = originalError
  return { pages, errors, root: root as unknown as HTMLElement, workbench }
}

export function diffSnapshots(
  base: PageSnapshot[],
  next: PageSnapshot[],
): Array<{ key: string; reason: string; at?: number; base?: string; next?: string }> {
  const index = (pages: PageSnapshot[]) =>
    new Map(pages.map((p) => [`${p.wb}|${p.tab}`, p] as const))
  const a = index(base)
  const b = index(next)
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort()
  const out: Array<{ key: string; reason: string; at?: number; base?: string; next?: string }> = []
  for (const key of keys) {
    const x = a.get(key)
    const y = b.get(key)
    if (!x) {
      out.push({ key, reason: '只存在於新版' })
      continue
    }
    if (!y) {
      out.push({ key, reason: '只存在於基準' })
      continue
    }
    if (x.text === y.text) continue
    let at = 0
    while (at < x.text.length && at < y.text.length && x.text[at] === y.text[at]) at++
    out.push({
      key,
      reason: '內容不同',
      at,
      base: x.text.slice(Math.max(0, at - 60), at + 60),
      next: y.text.slice(Math.max(0, at - 60), at + 60),
    })
  }
  return out
}
