import "server-only"

import { db } from "@/lib/db"
import { generateObjectKey } from "@/lib/storage/object-key"
import { getR2BucketName } from "@/lib/storage/r2-client"

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized to access this asset") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class NotFoundError extends Error {
  constructor(message = "Asset not found") {
    super(message)
    this.name = "NotFoundError"
  }
}

type CreateAssetInput = {
  displayName: string
  mimeType?: string | null
  sizeBytes?: number | null
}

// FileAsset

export async function assertCanAccessFileAsset(profileId: string, assetId: string) {
  const asset = await db.fileAsset.findUnique({
    where: { id: assetId },
    select: { ownerId: true },
  })

  if (!asset) throw new NotFoundError()
  if (asset.ownerId !== profileId) throw new UnauthorizedError()

  return true
}

export async function getFileAssetsForProfile(profileId: string) {
  return db.fileAsset.findMany({
    where: { ownerId: profileId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
}

export async function createFileAssetForProfile(profileId: string, input: CreateAssetInput) {
  const bucket = getR2BucketName()
  const objectKey = generateObjectKey(profileId, input.displayName)

  return db.fileAsset.create({
    data: {
      ownerId: profileId,
      displayName: input.displayName,
      bucket,
      objectKey,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
    },
  })
}

export async function getFileAssetForProfile(profileId: string, assetId: string) {
  await assertCanAccessFileAsset(profileId, assetId)
  const asset = await db.fileAsset.findUnique({ where: { id: assetId } })
  if (!asset) throw new NotFoundError()
  return asset
}

export async function getFileAssetByObjectKeyForProfile(profileId: string, objectKey: string) {
  const asset = await db.fileAsset.findFirst({ where: { objectKey, ownerId: profileId } })
  if (!asset) throw new NotFoundError()
  return asset
}

// MediaAsset

export async function assertCanAccessMediaAsset(profileId: string, assetId: string) {
  const asset = await db.mediaAsset.findUnique({
    where: { id: assetId },
    select: { ownerId: true },
  })

  if (!asset) throw new NotFoundError()
  if (asset.ownerId !== profileId) throw new UnauthorizedError()

  return true
}

export async function getMediaAssetsForProfile(profileId: string) {
  return db.mediaAsset.findMany({
    where: { ownerId: profileId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
}

export async function createMediaAssetForProfile(profileId: string, input: CreateAssetInput) {
  const bucket = getR2BucketName()
  const objectKey = generateObjectKey(profileId, input.displayName)

  return db.mediaAsset.create({
    data: {
      ownerId: profileId,
      displayName: input.displayName,
      bucket,
      objectKey,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
    },
  })
}

export async function getMediaAssetForProfile(profileId: string, assetId: string) {
  await assertCanAccessMediaAsset(profileId, assetId)
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } })
  if (!asset) throw new NotFoundError()
  return asset
}

export async function getMediaAssetByObjectKeyForProfile(profileId: string, objectKey: string) {
  const asset = await db.mediaAsset.findFirst({ where: { objectKey, ownerId: profileId } })
  if (!asset) throw new NotFoundError()
  return asset
}
