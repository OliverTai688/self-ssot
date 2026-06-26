"use client"

import * as React from "react"
import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ShareLinkButtonProps {
  token?: string
}

export function ShareLinkButton({ token }: ShareLinkButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/client/${token}` : null

  function handleCopy() {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!url) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <LinkIcon className="size-3.5" />
        未設定分享連結
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground font-mono">
        {url}
      </code>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={handleCopy}
      >
        {copied ? (
          <><CheckIcon className="size-3.5 text-emerald-500" />已複製</>
        ) : (
          <><CopyIcon className="size-3.5" />複製連結</>
        )}
      </Button>
    </div>
  )
}
