// ─── Media Library: photo / video / music assets ─────────────────────────
//
// Distinct from the File Library (documents, spreadsheets, presentations),
// the Media Library holds visual and audio assets that can be referenced
// into an AI conversation for multimodal analysis (image OCR, video frame
// review, audio transcription).

export type MediaKind = "image" | "video" | "audio"

export interface MediaAsset {
  id: string
  name: string
  /** AI-facing stable reference code, assign-once. See RES-018 §4. */
  referenceCode: string
  kind: MediaKind
  /** Thumbnail/poster URL for image and video kinds. Audio kinds have none. */
  url?: string
  date: string
  /** Formatted duration for video/audio kinds, e.g. "3:24". */
  duration?: string
  /** R2 object key for real uploads. Absent on mock/seed rows. See RES-022. */
  objectKey?: string
}

export type MediaLibraryTab = "all" | MediaKind

export const MEDIA_TAB_LABELS: Record<MediaLibraryTab, string> = {
  all: "全部",
  image: "圖片",
  video: "影片",
  audio: "音樂",
}
