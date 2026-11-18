import "server-only"

import { GetObjectCommand } from "@aws-sdk/client-s3"

import { getR2Client } from "@/lib/storage/r2-client"

/**
 * 伺服器讀回一個物件的 bytes（日誌 AI 把附件送給模型時用，RES-037 §14）。
 *
 * 一定要給上限：資產列記的大小是 finalize 時的值，但這裡讀的是 R2 現在的內容。
 * 超過上限直接丟錯，不讀進記憶體。
 */
export async function getObjectBytes(bucket: string, objectKey: string, maxBytes: number): Promise<Buffer> {
  const result = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }))
  const length = Number(result.ContentLength ?? 0)
  if (length > maxBytes) throw new Error("檔案超過可讀取的大小")
  if (!result.Body) throw new Error("讀不到檔案內容")
  const bytes = Buffer.from(await result.Body.transformToByteArray())
  if (bytes.length > maxBytes) throw new Error("檔案超過可讀取的大小")
  return bytes
}
