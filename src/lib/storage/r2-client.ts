import "server-only"

import { S3Client } from "@aws-sdk/client-s3"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getR2Client(): S3Client {
  const accountId = requireEnv("R2_ACCOUNT_ID")

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  })
}

export function getR2BucketName(): string {
  return requireEnv("R2_BUCKET_NAME")
}
