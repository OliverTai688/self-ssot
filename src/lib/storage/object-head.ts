import "server-only"

import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"

import { getR2Client } from "@/lib/storage/r2-client"

export type ObjectHead = {
  bytes: number
  etag: string | null
  contentType: string | null
}

/**
 * 上傳完成與否，由伺服器問 R2，不由前端宣告。
 *
 * 前端說「我傳好了」只代表它的 fetch 沒有丟例外。網路中斷在某些瀏覽器上會讓
 * PUT 以看似成功的形式結束，代理也可能截斷 body。所以 finalize 一定要回頭
 * HeadObject 對一次大小 —— 這是「ready」這個狀態唯一的依據。
 *
 * 物件不存在回 null（而不是丟例外）：那是預期中的結果之一，代表這次上傳沒有成功。
 */
export async function headObject(bucket: string, objectKey: string): Promise<ObjectHead | null> {
  try {
    const result = await getR2Client().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }))
    return {
      bytes: Number(result.ContentLength ?? 0),
      etag: result.ETag ? result.ETag.replace(/"/g, "") : null,
      contentType: result.ContentType ?? null,
    }
  } catch (error) {
    const name = (error as { name?: string })?.name
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
    if (name === "NotFound" || name === "NoSuchKey" || status === 404) return null
    throw error
  }
}

/** 只給孤兒清理用。刪不存在的物件在 S3 語意下是成功，不需要特別處理。 */
export async function deleteObject(bucket: string, objectKey: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }))
}
