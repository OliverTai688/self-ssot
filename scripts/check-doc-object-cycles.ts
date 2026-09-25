/**
 * 掃出文件物件之間的循環引用（YZUI-020 的資料面）。
 *
 * 程式面的成因與修法寫在同一輪的 commit：docObjectRefCode() 的序號跨載入重來，
 * 撞號之後新物件可能拿到「包著它的那個物件」的 id，於是 section 裡出現一張指向
 * 自己的卡片。runtime 現在有循環保護，這種資料不會再讓頁面掛掉，但它仍然是錯的
 * ——卡片指向的不是使用者當初建立的那個東西。這支負責把它們找出來、清掉。
 *
 * 預設 dry run：先把要動的列印出來，確認過再加 --apply。
 *
 *   pnpm ops:doc-cycles:check             # 只列出
 *   pnpm ops:doc-cycles:check -- --apply  # 真的改
 */
// 這一行必須在 db 之前：src/lib/db 在載入時就讀 DATABASE_URL。
import "./load-local-env"
import { db } from "../src/lib/db"

const apply = process.argv.includes("--apply")

type Block = { id?: string; t?: string; ind?: number; text?: string; obj?: { ty?: string; rid?: string } }
type Sec = { title?: string; blocks?: Block[] }

const REMOVED_TEXT = "（已移除一張指向自己的物件卡片 · YZUI-020）"

/** 這個 section 裡指向 doc_object 的卡片。 */
function objRefs(secs: Sec[]): string[] {
  const out: string[] = []
  for (const sec of secs || []) {
    for (const b of sec.blocks || []) {
      if (b.t === "obj" && b.obj?.ty === "doc_object" && b.obj.rid) out.push(b.obj.rid)
    }
  }
  return out
}

async function main() {
  const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  console.log(`target: ${target ? target.host + target.pathname : "(DATABASE_URL 未設定)"}`)
  console.log(apply ? "mode:   APPLY（會寫入）\n" : "mode:   dry run（只列出）\n")

  const { OPERATING_WORKSPACE_SLUG } = await import("../src/lib/services/operating-commands.service")
  const ws = await db.workspace.findUnique({ where: { slug: OPERATING_WORKSPACE_SLUG }, select: { id: true } })
  if (!ws) {
    console.log("找不到營運 workspace，結束。")
    return
  }

  const rows = await db.operatingDocObject.findMany({
    where: { workspaceId: ws.id },
    select: { id: true, workbenchRef: true, kind: true, title: true, onDate: true, authorKey: true, payload: true },
  })
  // workbenchRef 才是工作台看到的參考碼；沒有的列不會被卡片指到，直接跳過。
  const docs = rows.flatMap((row) => (row.workbenchRef ? [{ ...row, workbenchRef: row.workbenchRef }] : []))
  console.log(`文件物件 ${rows.length} 筆（其中 ${docs.length} 筆有參考碼）`)

  // 一、撞號：同一個 workbenchRef 出現多次，代表序號重來過。
  const byRef = new Map<string, (typeof docs)[number][]>()
  for (const d of docs) {
    const list: (typeof docs)[number][] = byRef.get(d.workbenchRef) ?? []
    list.push(d)
    byRef.set(d.workbenchRef, list)
  }
  const dupes = [...byRef.entries()].filter(([, list]) => list.length > 1)
  if (dupes.length) {
    console.log(`\n撞號的參考碼 ${dupes.length} 組：`)
    for (const [ref, list] of dupes) console.log(`  ${ref} × ${list.length}（${list.map((d) => d.id).join(", ")}）`)
  } else {
    console.log("撞號的參考碼：無")
  }

  // 二、循環：自我引用，或 A→B→…→A。
  const edges = new Map<string, string[]>()
  for (const d of docs) {
    const payload = (d.payload ?? {}) as { secs?: Sec[] }
    edges.set(d.workbenchRef, objRefs(payload.secs ?? []))
  }

  const selfRefs = docs.filter((d) => (edges.get(d.workbenchRef) ?? []).includes(d.workbenchRef))
  const cycles: string[][] = []
  const state = new Map<string, number>() // 0 = 走過, 1 = 在堆疊上
  const stack: string[] = []
  const walk = (ref: string) => {
    if (state.get(ref) === 1) {
      const at = stack.indexOf(ref)
      if (at >= 0) cycles.push([...stack.slice(at), ref])
      return
    }
    if (state.has(ref)) return
    state.set(ref, 1)
    stack.push(ref)
    for (const next of edges.get(ref) ?? []) if (edges.has(next)) walk(next)
    stack.pop()
    state.set(ref, 0)
  }
  for (const ref of edges.keys()) walk(ref)

  const multi = cycles.filter((c) => c.length > 2)
  console.log(`\n自我引用（卡片指向包著它的物件）：${selfRefs.length} 筆`)
  for (const d of selfRefs) {
    console.log(`  ${d.workbenchRef} · ${d.kind} · ${d.title} · ${d.onDate ? d.onDate.toISOString().slice(0, 10) : "?"} · ${d.authorKey ?? "?"}`)
  }
  console.log(`多個物件互相引用：${multi.length} 組`)
  for (const c of multi) console.log(`  ${c.join(" → ")}`)

  if (!selfRefs.length) {
    console.log("\n沒有要改的列。")
    return
  }
  if (!apply) {
    console.log("\n要清掉上面那些自我引用的卡片，重跑一次並加 --apply。")
    return
  }

  for (const d of selfRefs) {
    const payload = (d.payload ?? {}) as { secs?: Sec[]; [k: string]: unknown }
    let removed = 0
    for (const sec of payload.secs ?? []) {
      sec.blocks = (sec.blocks ?? []).map((b) => {
        if (b.t === "obj" && b.obj?.ty === "doc_object" && b.obj.rid === d.workbenchRef) {
          removed++
          return { id: b.id, t: "p", ind: b.ind ?? 0, text: REMOVED_TEXT }
        }
        return b
      })
    }
    await db.operatingDocObject.update({ where: { id: d.id }, data: { payload: payload as never } })
    console.log(`  已清 ${d.workbenchRef}：移除 ${removed} 張自我引用卡片`)
  }
  console.log("\n完成。請重新整理工作台確認。")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
