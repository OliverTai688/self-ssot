"use server"

import { z } from "zod"

import { requireUser } from "@/lib/services/auth.service"
import {
  createFileAssetForProfile,
  createMediaAssetForProfile,
  getFileAssetByObjectKeyForProfile,
  getFileAssetForProfile,
  getMediaAssetByObjectKeyForProfile,
  getMediaAssetForProfile,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/services/storage.service"
import { createDownloadUrl, createUploadUrl } from "@/lib/storage/presigned-url"
import {
  mapStoredFileAsset,
  mapStoredMediaAsset,
} from "@/lib/mappers/library-asset.mapper"
import type { FileAsset } from "@/types/file-library"
import type { MediaAsset } from "@/types/media-library"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

const RequestUploadSchema = z.object({
  displayName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(255).optional().nullable(),
  sizeBytes: z.number().int().positive().optional().nullable(),
})

const AssetIdSchema = z.string().uuid()
const ObjectKeySchema = z.string().trim().min(1)

function toErrorMessage(error: unknown): string {
  if (error instanceof UnauthorizedError) return error.message
  if (error instanceof NotFoundError) return error.message
  if (error instanceof Error) return error.message
  return "Unknown error"
}

export async function requestFileUpload(
  input: z.infer<typeof RequestUploadSchema>
): Promise<ActionResult<{
  assetId: string
  objectKey: string
  uploadUrl: string
  asset: FileAsset
}>> {
  try {
    const parsed = RequestUploadSchema.parse(input)
    const user = await requireUser()

    const asset = await createFileAssetForProfile(user.id, parsed)
    const uploadUrl = await createUploadUrl(asset.bucket, asset.objectKey, parsed.mimeType)

    return {
      success: true,
      data: {
        assetId: asset.id,
        objectKey: asset.objectKey,
        uploadUrl,
        asset: mapStoredFileAsset(asset),
      },
    }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function requestFileDownload(
  assetId: string
): Promise<ActionResult<{ downloadUrl: string }>> {
  try {
    const id = AssetIdSchema.parse(assetId)
    const user = await requireUser()

    const asset = await getFileAssetForProfile(user.id, id)
    const downloadUrl = await createDownloadUrl(asset.bucket, asset.objectKey)

    return { success: true, data: { downloadUrl } }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function requestFileDownloadByObjectKey(
  objectKey: string
): Promise<ActionResult<{ downloadUrl: string }>> {
  try {
    const key = ObjectKeySchema.parse(objectKey)
    const user = await requireUser()

    const asset = await getFileAssetByObjectKeyForProfile(user.id, key)
    const downloadUrl = await createDownloadUrl(asset.bucket, asset.objectKey)

    return { success: true, data: { downloadUrl } }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function requestMediaUpload(
  input: z.infer<typeof RequestUploadSchema>
): Promise<ActionResult<{
  assetId: string
  objectKey: string
  uploadUrl: string
  asset: MediaAsset
}>> {
  try {
    const parsed = RequestUploadSchema.parse(input)
    const user = await requireUser()

    const asset = await createMediaAssetForProfile(user.id, parsed)
    const uploadUrl = await createUploadUrl(asset.bucket, asset.objectKey, parsed.mimeType)

    return {
      success: true,
      data: {
        assetId: asset.id,
        objectKey: asset.objectKey,
        uploadUrl,
        asset: mapStoredMediaAsset(asset),
      },
    }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function requestMediaDownload(
  assetId: string
): Promise<ActionResult<{ downloadUrl: string }>> {
  try {
    const id = AssetIdSchema.parse(assetId)
    const user = await requireUser()

    const asset = await getMediaAssetForProfile(user.id, id)
    const downloadUrl = await createDownloadUrl(asset.bucket, asset.objectKey)

    return { success: true, data: { downloadUrl } }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function requestMediaDownloadByObjectKey(
  objectKey: string
): Promise<ActionResult<{ downloadUrl: string }>> {
  try {
    const key = ObjectKeySchema.parse(objectKey)
    const user = await requireUser()

    const asset = await getMediaAssetByObjectKeyForProfile(user.id, key)
    const downloadUrl = await createDownloadUrl(asset.bucket, asset.objectKey)

    return { success: true, data: { downloadUrl } }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}
