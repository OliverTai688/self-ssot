"use client"

import * as React from "react"
import { InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * Shared "progressive disclosure" popup.
 *
 * Normal pages should show a one-line summary plus a small trigger; the full
 * detail (proof, governance flags, tables, raw state) lives behind this
 * drawer instead of always being on screen. See ARC-036 / RPT-066.
 */
export function DetailDrawer({
  trigger,
  title,
  description,
  children,
  wide = false,
}: {
  trigger?: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
              <InfoIcon className="size-3.5" />
              查看詳細
            </Button>
          )
        }
      />
      <DialogContent className={wide ? "sm:max-w-xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto text-sm">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
