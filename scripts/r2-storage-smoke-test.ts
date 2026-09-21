import "./load-local-env"

import { DeleteObjectCommand } from "@aws-sdk/client-s3"

import { createDownloadUrl, createUploadUrl } from "../src/lib/storage/presigned-url"
import { getR2BucketName, getR2Client } from "../src/lib/storage/r2-client"

const TEST_OBJECT_KEY = `_r2-smoke-test/${Date.now()}.txt`
const TEST_PAYLOAD = `personal-os R2 smoke test ${new Date().toISOString()}`

async function main() {
  const bucket = getR2BucketName()
  console.log(`[r2-smoke-test] bucket=${bucket} objectKey=${TEST_OBJECT_KEY}`)

  const uploadUrl = await createUploadUrl(bucket, TEST_OBJECT_KEY, "text/plain")
  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: TEST_PAYLOAD,
  })
  if (!putResponse.ok) {
    throw new Error(`Upload failed: ${putResponse.status} ${putResponse.statusText}`)
  }
  console.log("[r2-smoke-test] upload PASSED")

  const downloadUrl = await createDownloadUrl(bucket, TEST_OBJECT_KEY)
  const getResponse = await fetch(downloadUrl)
  if (!getResponse.ok) {
    throw new Error(`Download failed: ${getResponse.status} ${getResponse.statusText}`)
  }
  const body = await getResponse.text()
  if (body !== TEST_PAYLOAD) {
    throw new Error("Downloaded content did not match uploaded content")
  }
  console.log("[r2-smoke-test] download PASSED, content matches")

  const client = getR2Client()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: TEST_OBJECT_KEY }))
  console.log("[r2-smoke-test] cleanup PASSED (test object deleted)")

  console.log("[r2-smoke-test] ALL CHECKS PASSED")
}

main().catch((error) => {
  console.error("[r2-smoke-test] FAILED:", error instanceof Error ? error.message : error)
  process.exit(1)
})
