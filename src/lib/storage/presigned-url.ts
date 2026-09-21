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

export async function createDownloadUrl(bucket: string, objectKey: string): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
  return getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS })
}
