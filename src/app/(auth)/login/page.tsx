import { CheckCircle2Icon, KeyRoundIcon, MailIcon, ShieldCheckIcon } from "lucide-react"
import { redirect } from "next/navigation"

import { requestMagicLink } from "@/app/actions/auth"
import { DEFAULT_AUTHENTICATED_PATH, normalizeNextPath } from "@/lib/auth/redirect"
import { isMockAuthEnabled } from "@/lib/auth/runtime"
import { buildOwnerAccessReadinessContract } from "@/lib/contracts/owner-access-readiness.contract"
import { getCurrentUser } from "@/lib/services/auth.service"
import { getSupabasePublicConfig } from "@/lib/supabase/env"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoginSearchParams = Promise<{
  next?: string | string[]
  status?: string | string[]
  email?: string | string[]
}>

export const dynamic = "force-dynamic"

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getStatusMessage(status: string | undefined, email: string | undefined) {
  if (status === "sent") {
    return `已送出登入連結${email ? `到 ${email}` : ""}。`
  }

  if (status === "request-failed") {
    return "登入連結沒有成功送出。請確認信箱已存在於 Supabase Auth Users、redirect URL 已允許，並等待 60 秒後重試。"
  }

  if (status === "missing-email") {
    return "請輸入被允許的登入信箱。"
  }

  if (status === "missing-env") {
    return "Supabase Auth 環境變數尚未設定。"
  }

  if (status === "invalid-callback") {
    return "登入連結已失效，請重新取得。"
  }

  if (status === "supabase_session_missing") {
    return "尚未取得有效 Supabase session。請從同一個瀏覽器重新送出並開啟登入連結。"
  }

  if (status === "supabase_profile_missing") {
    return "Supabase session 已建立，但這個信箱還沒有對應的 Profile。請先建立同 email 的 Profile 後再登入。"
  }

  if (status === "mock_profile_missing") {
    return "開發 mock user 找不到對應 Profile，請先 seed 或調整 PERSONAL_OS_DEV_USER_EMAIL。"
  }

  if (status === "signed-out") {
    return "你已登出。"
  }

  return null
}

function getReadinessBadgeLabel(state: "ready" | "blocked" | "dev_only" | "owner_run") {
  if (state === "ready") return "Ready"
  if (state === "blocked") return "Blocked"
  if (state === "owner_run") return "Owner-run"
  return "Dev only"
}

function getReadinessBadgeClass(state: "ready" | "blocked" | "dev_only" | "owner_run") {
  if (state === "ready") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200"
  }

  if (state === "blocked") {
    return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200"
  }

  if (state === "owner_run") {
    return "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200"
  }

  return "border-border bg-muted/40 text-muted-foreground"
}

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const resolvedSearchParams = await searchParams
  const nextPath = normalizeNextPath(firstParam(resolvedSearchParams.next) ?? DEFAULT_AUTHENTICATED_PATH)
  const status = firstParam(resolvedSearchParams.status)
  const email = firstParam(resolvedSearchParams.email)
  const currentUser = await getCurrentUser()
  const hasSupabaseConfig = Boolean(getSupabasePublicConfig())
  const mockAuthEnabled = isMockAuthEnabled()
  const ownerAccessReadinessContract = buildOwnerAccessReadinessContract({
    hasSupabaseConfig,
    isMockAuthEnabled: mockAuthEnabled,
    requestedNextPath: nextPath,
  })
  const statusMessage = getStatusMessage(status, email)

  if (currentUser) {
    redirect(nextPath)
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col justify-center gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
            <ShieldCheckIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Personal OS</h1>
            <p className="text-sm text-muted-foreground">登入後進入你的私人工作系統。</p>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form action={requestMagicLink} className="rounded-lg border bg-card p-4 shadow-sm">
            <input type="hidden" name="next" defaultValue={nextPath} />

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">Magic link</h2>
                  <p className="mt-1 text-xs text-muted-foreground">只允許既有 Supabase 使用者登入。</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {mockAuthEnabled ? "Dev mock" : "Supabase"}
                </Badge>
              </div>

              {statusMessage && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {statusMessage}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  defaultValue={email}
                  disabled={!hasSupabaseConfig}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={!hasSupabaseConfig}>
                <MailIcon className="size-4" />
                送出登入連結
              </Button>
            </div>
          </form>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRoundIcon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium">Owner access readiness</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  目前入口：{ownerAccessReadinessContract.summary.primaryPath === "supabase" ? "Supabase" : "Explicit dev mock"}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${getReadinessBadgeClass(
                  ownerAccessReadinessContract.summary.blockedCount > 0 ? "blocked" : "ready"
                )}`}
              >
                {ownerAccessReadinessContract.summary.blockedCount > 0 ? "Blocked" : "Ready"}
              </Badge>
            </div>

            <div className="mt-4 divide-y">
              {ownerAccessReadinessContract.rows.map((row) => (
                <div key={row.id} className="grid gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {row.state === "ready" && <CheckCircle2Icon className="size-4 text-emerald-600" />}
                        <span>{row.label}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.signal}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${getReadinessBadgeClass(row.state)}`}
                    >
                      {getReadinessBadgeLabel(row.state)}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{row.status}</span>
                    <span>{row.nextAction}</span>
                    <code className="block break-all rounded-md bg-muted/50 px-2 py-1 font-mono text-[11px] text-foreground">
                      {row.command}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        {!hasSupabaseConfig && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
            需要設定 `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 後才能寄送登入連結。
          </div>
        )}
      </div>
    </main>
  )
}
