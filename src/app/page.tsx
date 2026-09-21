import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, LockIcon, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createLoginPath } from "@/lib/auth/redirect"

export const metadata: Metadata = {
  title: "Personal OS",
  description: "A private operating surface for work, research, and life context.",
}

const ownerLoginPath = createLoginPath("/company")

export default function RootPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b bg-background/95 px-5 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-muted/40">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
            </div>
            <p className="truncate text-sm font-semibold">Personal OS</p>
          </div>
          <Button variant="outline" size="sm" render={<Link href={ownerLoginPath} prefetch={false} />}>
            <LockIcon className="size-3.5" />
            登入
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-6 px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-normal text-balance sm:text-5xl">Personal OS</h1>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          管理工作、研究與生活資訊的私人系統。
        </p>
        <Button size="lg" render={<Link href={ownerLoginPath} prefetch={false} />}>
          <LockIcon className="size-4" />
          登入使用
          <ArrowRightIcon className="size-4" />
        </Button>
      </section>
    </main>
  )
}
