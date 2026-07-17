"use client"

import * as React from "react"
import Link from "next/link"
import { ImageIcon, LinkIcon, Music2Icon, PenLineIcon, PlayIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { MediaAsset, MediaKind, MediaLibraryTab } from "@/types/media-library"
import { MEDIA_TAB_LABELS } from "@/types/media-library"
import { generateReferenceCode } from "@/lib/naming/reference-code"
import { useLibraryClassification } from "@/lib/context/library-classification-context"
import { ModuleClassificationDialog } from "@/components/ai/library/module-classification-dialog"
import { MediaRenameDialog } from "@/components/ai/media-library/media-quick-edit-dialogs"
import { ALL_MODULES, type ModuleKey } from "@/types/module-permission"

const MODULE_LABELS: Record<ModuleKey, string> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m.name])
) as Record<ModuleKey, string>

let uploadCounter = 0

function makeMediaId(): string {
  uploadCounter += 1
  return `media-uploaded-${Date.now()}-${uploadCounter}`
}

const MOCK_UPLOADS: Record<MediaKind, Array<{ name: string; url?: string; duration?: string }>> = {
  image: [
    { name: "會議白板記錄.jpg", url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=60" },
    { name: "競品分析雷達圖.png", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&auto=format&fit=crop&q=60" },
    { name: "系統流程時序圖.png", url: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=300&auto=format&fit=crop&q=60" },
  ],
  video: [
    { name: "客戶訪談側錄.mp4", url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=60", duration: "8:15" },
    { name: "產品Demo錄影.mp4", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&auto=format&fit=crop&q=60", duration: "4:02" },
  ],
  audio: [
    { name: "電話會議錄音.mp3", duration: "15:30" },
    { name: "現場採訪語音.m4a", duration: "6:47" },
  ],
}

const KIND_LABEL: Record<MediaKind, string> = { image: "圖片", video: "影片", audio: "音樂" }

function pickUploadKind(activeTab: MediaLibraryTab): MediaKind {
  if (activeTab !== "all") return activeTab
  const kinds: MediaKind[] = ["image", "video", "audio"]
  return kinds[Math.floor(Math.random() * kinds.length)]
}

function MediaThumbnail({ asset }: { asset: MediaAsset }) {
  if (asset.kind === "audio") {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-violet-500/10 text-violet-500">
        <Music2Icon className="size-6" />
        {asset.duration && <span className="text-[10px] font-medium">{asset.duration}</span>}
      </div>
    )
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset.url} alt={asset.name} className="object-cover w-full h-full" />
      {asset.kind === "video" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex size-9 items-center justify-center rounded-full bg-black/50">
            <PlayIcon className="size-4 fill-white text-white" />
          </div>
          {asset.duration && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
              {asset.duration}
            </span>
          )}
        </div>
      )}
    </>
  )
}

export function MediaLibraryPage({
  referencedTitles,
  onReferenceAsset,
  mode = "full",
  filterModuleKey,
}: {
  referencedTitles: Set<string>
  onReferenceAsset: (name: string) => void
  /** RES-016 §6.5: "module_readonly" hides upload and mutating actions, filtered to one module's classified assets. */
  mode?: "full" | "module_readonly"
  filterModuleKey?: ModuleKey
}) {
  const readOnly = mode === "module_readonly"
  const {
    getModuleKeysForAsset,
    getOriginContextForAsset,
    getAssetIdsForModule,
    setAssetModuleKeys,
    mediaAssets: assets,
    setMediaAssets: setAssets,
  } = useLibraryClassification()
  const [tab, setTab] = React.useState<MediaLibraryTab>("all")
  const [classifyAssetId, setClassifyAssetId] = React.useState<string | null>(null)
  const [renameAssetId, setRenameAssetId] = React.useState<string | null>(null)

  const scopedAssets = React.useMemo(() => {
    if (!readOnly || !filterModuleKey) return assets
    const moduleAssetIds = getAssetIdsForModule(filterModuleKey, "media")
    return assets.filter((a) => moduleAssetIds.has(a.id))
  }, [assets, readOnly, filterModuleKey, getAssetIdsForModule])

  const filteredAssets = React.useMemo(
    () => (tab === "all" ? scopedAssets : scopedAssets.filter((a) => a.kind === tab)),
    [scopedAssets, tab]
  )

  const classifyAsset = assets.find((a) => a.id === classifyAssetId) ?? null
  const renameAsset = assets.find((a) => a.id === renameAssetId) ?? null

  const countsByKind = React.useMemo(() => {
    const counts: Record<MediaKind, number> = { image: 0, video: 0, audio: 0 }
    scopedAssets.forEach((a) => { counts[a.kind] += 1 })
    return counts
  }, [scopedAssets])

  function handleUpload() {
    const kind = pickUploadKind(tab)
    const options = MOCK_UPLOADS[kind]
    const pick = options[Math.floor(Math.random() * options.length)]
    const date = new Date().toISOString().slice(0, 10)
    const newAsset: MediaAsset = {
      id: makeMediaId(),
      name: pick.name,
      referenceCode: generateReferenceCode("MEDIA", "AIINPUT", date),
      kind,
      url: pick.url,
      duration: pick.duration,
      date,
    }
    setAssets((prev) => [newAsset, ...prev])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as MediaLibraryTab)}>
            <TabsList variant="line">
              <TabsTrigger value="all">{MEDIA_TAB_LABELS.all}</TabsTrigger>
              <TabsTrigger value="image">{MEDIA_TAB_LABELS.image}（{countsByKind.image}）</TabsTrigger>
              <TabsTrigger value="video">{MEDIA_TAB_LABELS.video}（{countsByKind.video}）</TabsTrigger>
              <TabsTrigger value="audio">{MEDIA_TAB_LABELS.audio}（{countsByKind.audio}）</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-2">
            {readOnly
              ? `共有 ${filteredAssets.length} 項媒體資產已分類至此模組（唯讀 — 上傳請至 AI 匯入）`
              : `共有 ${filteredAssets.length} 項媒體資產已歸檔`}
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={handleUpload} className="rounded-full shadow-sm text-xs gap-1.5 px-4 h-8">
            <PlusIcon className="size-4" />
            <span>上傳新媒體</span>
          </Button>
        )}
      </div>

      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <ImageIcon className="size-6 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">此分類尚無媒體資產</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const isReferenced = referencedTitles.has(asset.name)
            const moduleKeys = getModuleKeysForAsset(asset.id)
            const originContext = getOriginContextForAsset(asset.id)
            return (
              <div key={asset.id} className="group relative rounded-xl border border-border/50 bg-background/50 overflow-hidden flex flex-col p-2 hover:shadow-md transition-all">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted flex items-center justify-center relative">
                  <MediaThumbnail asset={asset} />
                </div>
                <div className="mt-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground truncate">{asset.name}</p>
                    <p className="text-[10px] text-muted-foreground">{KIND_LABEL[asset.kind]} · {asset.date}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(asset.referenceCode)}
                      title={`複製 AI 參考代碼：${asset.referenceCode}`}
                      className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground/70 hover:text-foreground"
                    >
                      {asset.referenceCode}
                    </button>
                    {moduleKeys.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {moduleKeys.map((key) => (
                          <Badge key={key} variant="outline" className="rounded-full font-normal text-[10px] px-1.5 py-0">
                            {MODULE_LABELS[key]}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {originContext && (
                      <Link
                        href={originContext.href}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <LinkIcon className="size-2.5" />
                        使用於：{originContext.contextLabel}
                      </Link>
                    )}
                  </div>
                  {readOnly ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {}}
                      className="w-full rounded-full text-[10px] h-6 mt-1 border-border/60 hover:bg-muted"
                    >
                      下載
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant={isReferenced ? "ghost" : "outline"}
                        onClick={() => onReferenceAsset(asset.name)}
                        className={cn(
                          "flex-1 rounded-full text-[10px] h-6 mt-1",
                          isReferenced ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" : "border-border/60 hover:bg-muted"
                        )}
                      >
                        {isReferenced ? "已引用" : "引用至對話"}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setClassifyAssetId(asset.id)}
                        className="rounded-full text-[10px] h-6 mt-1 px-2 border-border/60 hover:bg-muted"
                      >
                        分類
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="outline"
                        title="重新命名"
                        onClick={() => setRenameAssetId(asset.id)}
                        className="rounded-full h-6 w-6 mt-1 border-border/60 hover:bg-muted"
                      >
                        <PenLineIcon className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ModuleClassificationDialog
        key={`classify-${classifyAssetId ?? "none"}`}
        assetName={classifyAsset?.name ?? ""}
        initialModuleKeys={classifyAsset ? getModuleKeysForAsset(classifyAsset.id) : []}
        open={classifyAssetId !== null}
        onOpenChange={(open) => !open && setClassifyAssetId(null)}
        onSubmit={(moduleKeys) => {
          if (classifyAsset) setAssetModuleKeys(classifyAsset.id, "media", moduleKeys, "human_confirmed")
          setClassifyAssetId(null)
        }}
      />

      <MediaRenameDialog
        key={`rename-${renameAssetId ?? "none"}`}
        asset={renameAsset}
        open={renameAssetId !== null}
        onOpenChange={(open) => !open && setRenameAssetId(null)}
        onSubmit={(asset, newName) => {
          setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, name: newName } : a))
          setRenameAssetId(null)
        }}
      />
    </div>
  )
}
