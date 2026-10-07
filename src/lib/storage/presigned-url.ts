import "server-only"

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { getR2Client } from "@/lib/storage/r2-client"

// TTLs per AUT-004's storage rules: short-lived, server-generated, never persisted.
const UPLOAD_URL_TTL_SECONDS = 900 // 15 minutes
const DOWNLOAD_URL_TTL_SECONDS = 300 // 5 minutes

export async function createUploadUrl(
  bucket: string,
  objectKey: string,
  contentType?: string | null
): Promise<string> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType ?? undefined,
  })
  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS })
}

/**
 * `downloadName` 有給就簽成附件下載。
 *
 * 預簽網址與工作台不同源，而 `<a download>` 對跨來源網址無效 —— 瀏覽器會直接在
 * 同一個分頁把圖片或影片打開，等於把使用者帶離工作台。要它真的下載，
 * 只能由回應自己帶 Content-Disposition，而那必須在簽名時就定下來。
 */
export async function createDownloadUrl(
  bucket: string,
  objectKey: string,
  options?: { downloadName?: string | null }
): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ...(options?.downloadName
      ? { ResponseContentDisposition: attachmentDisposition(options.downloadName) }
      : {}),
  })
  return getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS })
}

/** 中文檔名走 RFC 5987 的 filename*；舊瀏覽器讀前面那個只有 ASCII 的後備名稱。 */
function attachmentDisposition(name: string): string {
  const clean = name.replace(/[\r\n"\\/]/g, "_").slice(0, 180)
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`
}
