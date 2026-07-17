import type { MediaAsset } from "@/types/media-library"
import { generateReferenceCode } from "@/lib/naming/reference-code"

/** Demo dataset for the media library — prototype data, not a real media store. */
const mockMediaAssetsBase: Omit<MediaAsset, "referenceCode">[] = [
  {
    id: "media-001",
    name: "專案架構時序圖.png",
    kind: "image",
    url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&auto=format&fit=crop&q=60",
    date: "2026-07-12",
  },
  {
    id: "media-002",
    name: "商會活動大合照.jpg",
    kind: "image",
    url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&auto=format&fit=crop&q=60",
    date: "2026-07-10",
  },
  {
    id: "media-003",
    name: "財務支出收據截圖.png",
    kind: "image",
    url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&auto=format&fit=crop&q=60",
    date: "2026-07-13",
  },
  {
    id: "media-004",
    name: "商會年會活動側錄.mp4",
    kind: "video",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=60",
    date: "2026-07-08",
    duration: "12:40",
  },
  {
    id: "media-005",
    name: "客戶提案簡報錄影.mp4",
    kind: "video",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&auto=format&fit=crop&q=60",
    date: "2026-07-05",
    duration: "5:12",
  },
  {
    id: "media-006",
    name: "訪談紀錄_林副理事長.m4a",
    kind: "audio",
    date: "2026-07-06",
    duration: "42:00",
  },
  {
    id: "media-007",
    name: "會議語音備忘.mp3",
    kind: "audio",
    date: "2026-07-14",
    duration: "3:24",
  },
]

export const mockMediaAssets: MediaAsset[] = mockMediaAssetsBase.map((asset) => ({
  ...asset,
  referenceCode: generateReferenceCode("MEDIA", "AIINPUT", asset.date),
}))
