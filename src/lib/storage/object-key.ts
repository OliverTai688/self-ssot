import "server-only"

import { randomUUID } from "crypto"

/**
 * Object keys are always server-generated, never client-supplied, to prevent
 * path traversal or overwrite of another owner's object. See RES-022 §6.
 */
export function generateObjectKey(ownerId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180)
  return `owner/${ownerId}/${randomUUID()}/${safeName || "file"}`
}
