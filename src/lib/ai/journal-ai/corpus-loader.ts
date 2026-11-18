import "server-only"

import { getYuanzhanSeats } from "@/lib/auth/yuanzhan-actor"
import { db } from "@/lib/db"
import { loadOperatingStore } from "@/lib/services/operating-store.service"

import {
  blockRefs,
  flattenObject,
  OBJECT_TYPE_LABEL,
  type ActivityEvent,
  type CorpusObject,
  type JournalCorpus,
  type JournalLine,
  type ObjectType,
  type RawBlock,
} from "./corpus"

/**
 * 用 viewer 的權限載入日誌 AI 的語料（RES-037 §1「AI 看得到的 ＝ 你看得到的」）。
 *
 * 物件一律取自 loadOperatingStore(workspaceId, viewerProfileId) —— 也就是畫面上那一份。
 * 可見性因此只有一個真相：私人檔、私人連結、只有負責人看得到的收件，這裡全部沿用，不另外判斷。
 *
 * 日誌另外查：store 把別人的日誌依日期收成一份 journalPeer，同一天有兩位以上同事時會互相蓋掉，
 * 給 AI 讀會漏行。查詢條件與 store 一字不差（company，或作者本人）。
 *
 * 刻意不載入（RES-037 D2）：薪資（payroll）、銀行對帳（bank）、報帳、收件匣。
 */

const TEXTY = (t: unknown) => t !== "divider" && t !== "obj"

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : ""
}

type Row = Record<string, unknown>
const list = (store: Record<string, unknown>, key: string): Row[] => (Array.isArray(store[key]) ? (store[key] as Row[]) : [])
const str = (v: unknown) => (typeof v === "string" ? v : "")

function docObjectText(d: Row): string {
  const parts: string[] = []
  const secs = Array.isArray(d.secs) ? (d.secs as Row[]) : []
  for (const sec of secs) {
    if (str(sec.title)) parts.push(`## ${str(sec.title)}`)
    const blocks = Array.isArray(sec.blocks) ? (sec.blocks as RawBlock[]) : []
    if (blocks.length) for (const b of blocks) { if (TEXTY(b.t) && typeof b.text === "string" && b.text.trim()) parts.push(b.text) }
    else if (str(sec.text)) parts.push(str(sec.text))
  }
  if (d.agenda) parts.push(flattenObject(d.agenda, 4000))
  return parts.join("\n")
}

const DOC_SUBTYPE_LABEL: Record<string, string> = { agenda: "議題", meeting: "會議紀錄", interview: "訪談稿", standup: "Standup", review: "回顧" }

export async function loadJournalCorpus(params: { workspaceId: string; viewerProfileId: string; viewerKey: string }): Promise<JournalCorpus> {
  const { workspaceId, viewerProfileId, viewerKey } = params
  const seats = getYuanzhanSeats()
  const [store, journalRows, profiles] = await Promise.all([
    loadOperatingStore(workspaceId, viewerProfileId),
    db.operatingJournalEntry.findMany({
      where: { workspaceId, OR: [{ visibility: "company" }, { authorId: viewerProfileId }] },
      orderBy: { onDate: "asc" },
    }),
    db.profile.findMany({ where: { email: { in: seats.map((s) => s.email) } }, select: { id: true, email: true } }),
  ])
  const seatByProfile = new Map<string, string>()
  for (const p of profiles) {
    const seat = seats.find((s) => s.email.toLowerCase() === p.email.toLowerCase())
    if (seat) seatByProfile.set(p.id, seat.actor)
  }

  const lines: JournalLine[] = []
  const dayTitles: Record<string, string> = {}
  for (const row of journalRows) {
    const day = iso(row.onDate)
    const author = seatByProfile.get(row.authorId) ?? (row.authorId === viewerProfileId ? viewerKey : "member")
    if (row.title && row.title !== day && !dayTitles[day]) dayTitles[day] = row.title
    const blocks = Array.isArray(row.blocks) ? (row.blocks as RawBlock[]) : []
    blocks.forEach((b, i) => {
      if (!b || typeof b.id !== "string") return
      const text = TEXTY(b.t) && typeof b.text === "string" ? b.text.trim() : ""
      const refs = blockRefs(b)
      if (!text && !refs.length) return
      lines.push({ day, author, blockId: b.id, line: i + 1, text, refs })
    })
  }

  const commentsByParent = new Map<string, CorpusObject["comments"]>()
  for (const c of list(store, "objectComments")) {
    const parent = str(c.parent)
    if (!parent) continue
    const bucket = commentsByParent.get(parent) ?? []
    bucket.push({ who: str(c.w), text: str(c.x), day: str(c.day) })
    commentsByParent.set(parent, bucket)
  }

  const objects: CorpusObject[] = []
  const add = (ty: ObjectType, rid: string, name: string, day: string, body: string, label?: string) => {
    if (!rid) return
    objects.push({ ty, rid, label: label ?? OBJECT_TYPE_LABEL[ty], name: name || rid, day, body, comments: commentsByParent.get(rid) ?? [] })
  }
  for (const d of list(store, "docObjects")) {
    add("doc_object", str(d.id), str(d.title), str(d.day), docObjectText(d), DOC_SUBTYPE_LABEL[str(d.type)] ?? OBJECT_TYPE_LABEL.doc_object)
  }
  for (const x of list(store, "issues")) add("issue", str(x.id), str(x.t), str(x.created), flattenObject(x))
  for (const x of list(store, "projects")) add("project", str(x.id), str(x.t), "", flattenObject(x))
  for (const x of list(store, "decisions")) add("decision", str(x.id), str(x.t), str(x.d), flattenObject(x))
  for (const x of list(store, "txns")) add("txn", str(x.id), str(x.t), str(x.d), flattenObject(x))
  for (const x of list(store, "assets")) add("asset", str(x.id), str(x.name), str(x.day), [str(x.name), `kind: ${str(x.kind)}`, str(x.text)].filter(Boolean).join("\n"))
  for (const x of list(store, "links")) add("link", str(x.id), str(x.title), str(x.day), [str(x.title), str(x.url), str(x.note)].filter(Boolean).join("\n"))

  const activity: ActivityEvent[] = list(store, "dayLogs").map((e) => ({ day: str(e.day), at: str(e.t), who: str(e.w), text: str(e.text) }))

  return { viewer: viewerKey, lines, dayTitles, objects, activity }
}
