"use client"

import * as React from "react"
import Link from "next/link"
import { DownloadIcon, ImageIcon, LinkIcon, Music2Icon, PenLineIcon, PlayIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { requestMediaDownloadByObjectKey, requestMediaUpload } from "@/app/actions/storage"
import type { MediaAsset, MediaKind, MediaLibraryTab } from "@/types/media-library"
import { MEDIA_TAB_LABELS } from "@/types/media-library"
import { useLibraryClassification } from "@/lib/context/library-classification-context"
import { ModuleClassificationDialog } from "@/components/ai/library/module-classification-dialog"
import { MediaRenameDialog } from "@/components/ai/media-library/media-quick-edit-dialogs"
import { ALL_MODULES, type ModuleKey } from "@/types/module-permission"

const MODULE_LABELS: Record<ModuleKey, string> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m.name])
) as Record<ModuleKey, string>

const KIND_LABEL: Record<MediaKind, string> = { image: "圖片", video: "影片", audio: "音樂" }

function kindFromMimeType(mimeType: string): MediaKind | null {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  return null
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
  if (!asset.url) {
    return (
      <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
        {asset.kind === "video" ? <PlayIcon className="size-6" /> : <ImageIcon className="size-6" />}
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
    dataMode,
    formalDataStatus,
    formalDataMessage,
    mediaAssets: assets,
    setMediaAssets: setAssets,
  } = useLibraryClassification()
  const [tab, setTab] = React.useState<MediaLibraryTab>("all")
  const [classifyAssetId, setClassifyAssetId] = React.useState<string | null>(null)
  const [renameAssetId, setRenameAssetId] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [toast, setToast] = React.useState<string | null>(null)
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pushToast = React.useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])
  React.useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

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

  function triggerUpload() {
    if (dataMode === "mock") {
      pushToast("Mock 模式不會寫入正式資料；請先切換到正式模式再上傳。")
      return
    }
    fileInputRef.current?.click()
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const kind = kindFromMimeType(file.type)
    if (!kind) {
      pushToast("僅支援圖片、影片、音樂檔案。")
      return
    }

    setUploading(true)
    try {
      const requested = await requestMediaUpload({
        displayName: file.name,
        mimeType: file.type || undefined,
        sizeBytes: file.size,
      })
      if (!requested.success) {
        pushToast(`上傳失敗：${requested.error}`)
        return
      }

      const putResponse = await fetch(requested.data.uploadUrl, {
        method: "PUT",
        headers: file.type ? { "Content-Type": file.type } : undefined,
        body: file,
      })
      if (!putResponse.ok) {
        pushToast(`上傳失敗：${putResponse.status} ${putResponse.statusText}`)
        return
      }

      const newAsset: MediaAsset = {
        ...requested.data.asset,
        url: kind === "image" ? URL.createObjectURL(file) : undefined,
      }
      setAssets((prev) => [newAsset, ...prev])
      pushToast(`「${file.name}」已上傳並保存至正式資料。`)
    } finally {
      setUploading(false)
    }
  }

  function handleDownload(asset: MediaAsset) {
    if (!asset.objectKey) {
      pushToast("尚未接上真實檔案內容（示範資料），暫時無法下載。")
      return
    }
    requestMediaDownloadByObjectKey(asset.objectKey).then((result) => {
      if (result.success) {
        window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer")
      } else {
        pushToast(`下載失敗：${result.error}`)
      }
    })
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
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button
              size="sm"
              onClick={triggerUpload}
              disabled={uploading}
              className="rounded-full shadow-sm text-xs gap-1.5 px-4 h-8"
            >
              <PlusIcon className="size-4" />
              <span>{uploading ? "上傳中…" : "上傳新媒體"}</span>
            </Button>
          </>
        )}
      </div>

      {filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <ImageIcon className="size-6 text-muted-foreground/60" />
          <p className="text-xs font-medium text-foreground">
            {dataMode === "formal" && formalDataStatus === "unavailable"
              ? "正式媒體資料暫時無法載入"
              : dataMode === "formal"
                ? "尚無正式媒體"
                : "此分類尚無媒體資產"}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {dataMode === "formal" && formalDataStatus === "unavailable"
              ? formalDataMessage ?? "系統沒有改用示範資料，請稍後重新整理。"
              : dataMode === "formal"
                ? "上傳第一個圖片、影片或音訊後，媒體會保存至 R2 並在重新整理後保留。"
                : "Mock 資料只會顯示在示範模式。"}
          </p>
          {!readOnly && dataMode === "formal" && formalDataStatus === "ready" && (
            <Button size="sm" variant="outline" onClick={triggerUpload} className="mt-2 rounded-full">
              <PlusIcon className="size-4" />
              上傳第一個媒體
            </Button>
          )}
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
                      onClick={() => handleDownload(asset)}
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
                      <Button
                        size="icon-xs"
                        variant="outline"
                        title="下載"
                        onClick={() => handleDownload(asset)}
                        className="rounded-full h-6 w-6 mt-1 border-border/60 hover:bg-muted"
                      >
                        <DownloadIcon className="size-3" />
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

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4"
        >
          <div className="pointer-events-auto rounded-full border border-border/60 bg-foreground text-background px-4 py-2 text-xs shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
