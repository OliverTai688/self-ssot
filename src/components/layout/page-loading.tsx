import { LoaderCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type PageLoadingProps = {
  className?: string
}

export function PageLoading({ className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[520px] w-full items-center justify-center",
        className
      )}
    >
      <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
