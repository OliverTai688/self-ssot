import "server-only"

import type Anthropic from "@anthropic-ai/sdk"

import { db } from "@/lib/db"
import { getObjectBytes } from "@/lib/storage/object-get"
import { canSeatReadAsset } from "@/lib/ui-data/yuanzhan/operating-assets"

import { capText, extractOfficeText } from "./office-text"

/**
 * 附件：資料庫裡只存記號，送出前才換成真的區塊（RES-037 §14、D4）。
 *
 *   存的：{ type: "asset_ref", ref: "AST-…", title: "報價單.pdf" }
 *   送的：圖片 → 說明文字＋image；PDF → document（citations）；文字類 → 純文字 document（citations）
 *
 * 為什麼每次都重新換：
 *   - base64 不進資料庫；
 *   - 每次換都重新查權限 —— 檔案被改成私人、被刪除之後，舊對話不能再把它送出去；
 *   - 同一份檔案換出來的位元組一樣，所以快取與 preserved thinking 不受影響。
 */

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam
type Block = Record<string, unknown>

export type AssetRefBlock = { type: "asset_ref"; ref: string; title: string }

export function assetRef(ref: string, title: string): AssetRefBlock {
  return { type: "asset_ref", ref, title }
}

function isAssetRef(b: unknown): b is AssetRefBlock {
  return !!b && typeof b === "object" && (b as Block).type === "asset_ref" && typeof (b as Block).ref === "string"
}

/** 一個對話送出的檔案總量上限（base64 位元組）。API 單次請求 32MB，每一輪都會把歷史連同附件再送一次。 */
export const CONVERSATION_FILE_BUDGET = 24 * 1024 * 1024
const IMAGE_MAX = 5 * 1024 * 1024
const PDF_MAX = 20 * 1024 * 1024
const TEXT_FILE_MAX = 8 * 1024 * 1024
const OFFICE_MAX = 20 * 1024 * 1024
const MODEL_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])
const PLAIN_TEXT_EXT = new Set(["txt", "md", "csv", "json"])
const OFFICE_EXT = new Set(["docx", "xlsx", "pptx"])

export type HydrateContext = {
  workspaceId: string
  seatKeys: string[]
  budget: { used: number; limit: number }
  /** ref → 換好的區塊（不含預算判斷），同一輪重複出現的檔案只讀一次 R2 */
  cache: Map<string, Block[] | { size: number; blocks: Block[] }>
}

export function newHydrateContext(workspaceId: string, seatKeys: string[]): HydrateContext {
  return { workspaceId, seatKeys, budget: { used: 0, limit: CONVERSATION_FILE_BUDGET }, cache: new Map() }
}

const note = (text: string): Block[] => [{ type: "text", text }]
const label = (ref: string, title: string, what: string) => `附件 ⟦asset:${ref}⟧「${title}」（${what}）`

function extOf(name: string): string {
  return (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase()
}

/** 讀一個檔案、換成區塊。回傳 size 給預算用（base64 或文字長度）。 */
async function load(ref: string, title: string, ctx: HydrateContext): Promise<{ size: number; blocks: Block[] }> {
  const gone = { size: 0, blocks: note(`（附件 ⟦asset:${ref}⟧「${title}」已不存在，或你沒有權限讀。）`) }
  const asset = await db.operatingAsset.findFirst({
    where: { workspaceId: ctx.workspaceId, refCode: ref, deletedAt: null, status: "ready" },
  })
  if (!asset || !canSeatReadAsset(asset, { workspaceId: ctx.workspaceId, seatKeys: ctx.seatKeys })) return gone
  const name = asset.displayName || title
  const mime = (asset.mimeType ?? "").toLowerCase()
  const ext = extOf(name) || extOf(asset.objectKey)
  const docTitle = `${name}（asset:${ref}）`

  try {
    if (asset.kind === "image") {
      if (!MODEL_IMAGE_TYPES.has(mime)) return { size: 0, blocks: note(`${label(ref, name, "圖片")}：這個格式模型讀不了，請轉成 JPEG 或 PNG 再傳。`) }
      if ((asset.sizeBytes ?? 0) > IMAGE_MAX) return { size: 0, blocks: note(`${label(ref, name, "圖片")}：超過 5MB，模型讀不了。`) }
      const data = (await getObjectBytes(asset.bucket, asset.objectKey, IMAGE_MAX)).toString("base64")
      return {
        size: data.length,
        blocks: [{ type: "text", text: label(ref, name, "圖片") }, { type: "image", source: { type: "base64", media_type: mime, data } }],
      }
    }
    if (asset.kind === "pdf") {
      if ((asset.sizeBytes ?? 0) > PDF_MAX) return { size: 0, blocks: note(`${label(ref, name, "PDF")}：超過 20MB，請拆小再傳。`) }
      const data = (await getObjectBytes(asset.bucket, asset.objectKey, PDF_MAX)).toString("base64")
      return {
        size: data.length,
        blocks: [
          { type: "text", text: label(ref, name, "PDF") },
          { type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: docTitle, citations: { enabled: true } },
        ],
      }
    }
    let text: string | null = null
    if (PLAIN_TEXT_EXT.has(ext)) {
      text = capText((await getObjectBytes(asset.bucket, asset.objectKey, TEXT_FILE_MAX)).toString("utf8"))
    } else if (OFFICE_EXT.has(ext)) {
      text = asset.extractedText
      if (text == null) {
        text = extractOfficeText(await getObjectBytes(asset.bucket, asset.objectKey, OFFICE_MAX), ext)
        // 抽一次就留著：下一輪不必再解一次 zip，而且保證每一輪送出的文字一字不差
        await db.operatingAsset.update({ where: { id: asset.id }, data: { extractedText: text } }).catch(() => {})
      }
    }
    if (text == null) return { size: 0, blocks: note(`${label(ref, name, "檔案")}：這種檔案還讀不了內容（影音與其他格式）。`) }
    if (!text.trim()) return { size: 0, blocks: note(`${label(ref, name, "文件")}：裡面沒有文字。`) }
    return {
      size: text.length,
      blocks: [
        { type: "text", text: label(ref, name, "文件") },
        { type: "document", source: { type: "text", media_type: "text/plain", data: text }, title: docTitle, citations: { enabled: true } },
      ],
    }
  } catch (error) {
    console.warn("[journal-ai] attachment read failed", ref, error instanceof Error ? error.message : error)
    return { size: 0, blocks: note(`${label(ref, name, "檔案")}：這次讀取失敗。`) }
  }
}

async function blocksFor(b: AssetRefBlock, ctx: HydrateContext): Promise<Block[]> {
  let hit = ctx.cache.get(b.ref) as { size: number; blocks: Block[] } | undefined
  if (!hit) {
    hit = await load(b.ref, b.title, ctx)
    ctx.cache.set(b.ref, hit)
  }
  if (hit.size && ctx.budget.used + hit.size > ctx.budget.limit) {
    return note(`${label(b.ref, b.title, "檔案")}：這個對話送出的檔案已達上限，這一份沒有送出。開一個新對話再問。`)
  }
  ctx.budget.used += hit.size
  return hit.blocks
}

async function hydrateBlocks(content: unknown[], ctx: HydrateContext): Promise<unknown[]> {
  const out: unknown[] = []
  for (const block of content) {
    if (isAssetRef(block)) out.push(...(await blocksFor(block, ctx)))
    else if (block && typeof block === "object" && (block as Block).type === "tool_result" && Array.isArray((block as Block).content)) {
      out.push({ ...(block as Block), content: await hydrateBlocks((block as Block).content as unknown[], ctx) })
    } else out.push(block)
  }
  return out
}

/** 依序換掉每一則訊息裡的記號。預算依出現順序計算，所以同一段歷史每次換出來都一樣。 */
export async function hydrateMessages(messages: MessageParam[], ctx: HydrateContext): Promise<MessageParam[]> {
  ctx.budget.used = 0
  const out: MessageParam[] = []
  for (const m of messages) {
    if (!Array.isArray(m.content)) { out.push(m); continue }
    out.push({ ...m, content: await hydrateBlocks(m.content, ctx) } as unknown as MessageParam)
  }
  return out
}
