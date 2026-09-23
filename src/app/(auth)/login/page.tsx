import { FlaskConicalIcon, KeyRoundIcon, MailIcon, RotateCcwIcon, ShieldCheckIcon } from "lucide-react"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import { requestEmailOtp, requestMagicLink, verifyEmailOtp } from "@/app/actions/auth"
import { isDemoLoginConfigured } from "@/lib/auth/demo-login"
import { DEFAULT_DEV_OTP_LOGIN_CODE, isDevOtpLoginAllowedForUrl } from "@/lib/auth/dev-otp"
import { WORKSPACE_META, resolveWorkspaceSelection } from "@/lib/auth/workspace"
import { isMockAuthEnabled } from "@/lib/auth/runtime"
import { getCurrentUser } from "@/lib/services/auth.service"
import { getSupabasePublicConfig } from "@/lib/supabase/env"
import { AuthSubmitButton } from "@/components/auth/auth-submit-button"
import { WorkspaceTabs } from "@/components/auth/workspace-tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoginSearchParams = Promise<{
  next?: string | string[]
  ws?: string | string[]
  status?: string | string[]
  email?: string | string[]
  method?: string | string[]
}>

export const dynamic = "force-dynamic"

const tokenInputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 font-mono text-lg tracking-[0.35em]"

function GoogleLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28A7.19 7.19 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.28A11.96 11.96 0 0 0 0 12c0 1.94.47 3.77 1.28 5.38l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.62l4.01 3.1c.94-2.83 3.59-4.95 6.71-4.95Z"
      />
    </svg>
  )
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

async function getLoginRequestUrl() {
  const headerStore = await headers()
  const host = headerStore.get("host")

  if (!host) {
    return null
  }

  const protocol = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")

  return `${protocol}://${host}`
}

function getStatusMessage(status: string | undefined, email: string | undefined) {
  if (status === "sent") {
    return `已送出登入連結${email ? `到 ${email}` : ""}。`
  }

  if (status === "otp-sent") {
    return `六碼驗證碼已寄到 ${email ?? "你的信箱"}。請輸入信件中的驗證碼。`
  }

  if (status === "otp-request-failed") {
    return "驗證碼沒有成功寄出。請確認這是已允許的登入信箱，並等待 60 秒後重試。"
  }

  if (status === "otp-missing-email") {
    return "請輸入有效的登入信箱。"
  }

  if (status === "otp-format-invalid") {
    return "請輸入信件中的六位數字驗證碼。"
  }

  if (status === "otp-invalid") {
    return "驗證碼不正確或已失效。請重新確認，必要時寄送新驗證碼。"
  }

  if (status === "dev-otp-unavailable") {
    return "本機固定六碼只允許在非 production 的 localhost 使用。"
  }

  if (status === "google-request-failed") {
    return "Google 登入沒有成功啟動。請確認 Supabase 已啟用 Google provider 後再試一次。"
  }

  if (status === "google_not_allowed") {
    return "這個 Google 帳號沒有被允許登入 Personal OS。請改用被允許的信箱，或聯絡系統擁有者加入允許清單。"
  }

  if (status === "google_allowlist_unconfigured") {
    return "這個環境還沒有設定登入允許清單（PERSONAL_OS_TEAM_PROFILES），目前任何 Google 帳號都會被拒絕。請系統擁有者在部署環境補上該變數後重新部署。"
  }

  if (status === "google_profile_lookup_failed") {
    return "Google 驗證成功，但查詢 Profile 時資料庫沒有回應。請確認 DATABASE_URL 與資料庫連線後再試一次。"
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

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const resolvedSearchParams = await searchParams
  const { workspace, nextPath } = resolveWorkspaceSelection({
    workspaceParam: firstParam(resolvedSearchParams.ws),
    nextParam: firstParam(resolvedSearchParams.next),
  })
  const workspaceMeta = WORKSPACE_META[workspace]
  const status = firstParam(resolvedSearchParams.status)
  const email = firstParam(resolvedSearchParams.email)
  const method = firstParam(resolvedSearchParams.method)
  const devOtpAvailable = isDevOtpLoginAllowedForUrl(await getLoginRequestUrl())
  const demoLoginAvailable = isDemoLoginConfigured()
  const currentUser = await getCurrentUser()
  const hasSupabaseConfig = Boolean(getSupabasePublicConfig())
  const mockAuthEnabled = isMockAuthEnabled()
  const statusMessage = getStatusMessage(status, email)
  const canVerifyEmailOtp = hasSupabaseConfig || devOtpAvailable
  const isOtpVerificationStep =
    Boolean(email) &&
    (devOtpAvailable ||
      (method === "otp" && ["otp-sent", "otp-format-invalid", "otp-invalid"].includes(status ?? "")))

  if (currentUser) {
    redirect(nextPath)
  }

  return (
    <main
      id="login-shell"
      data-workspace={workspace}
      className="login-shell min-h-screen px-6 py-10 text-foreground transition-colors duration-300"
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
            <ShieldCheckIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{workspaceMeta.title}</h1>
            <p className="text-sm text-muted-foreground">{workspaceMeta.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <WorkspaceTabs value={workspace} />
          <p className="text-xs text-muted-foreground">{workspaceMeta.hint}</p>
        </div>

        {statusMessage && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {statusMessage}
          </div>
        )}

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-2">
            {hasSupabaseConfig ? (
              <Button
                variant="outline"
                className="w-full"
                render={
                  <Link
                    id="workspace-google-login"
                    href={`/auth/google?next=${encodeURIComponent(nextPath)}`}
                    prefetch={false}
                  />
                }
              >
                <GoogleLogoIcon className="size-4" />
                使用 Google 登入
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                <GoogleLogoIcon className="size-4" />
                使用 Google 登入
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              僅限被允許的信箱；每個帳號登入後會有各自獨立的 Personal OS 資料。
            </p>
          </div>
        </section>

        {demoLoginAvailable && (
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <form action={verifyEmailOtp} className="grid gap-3">
              <input type="hidden" name="next" value={nextPath} />
              <div className="flex items-center gap-2">
                <FlaskConicalIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">示範帳號</h2>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="demo-email">Email</Label>
                <Input id="demo-email" name="email" type="email" autoComplete="email" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="demo-token">六碼驗證碼</Label>
                <input
                  id="demo-token"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  placeholder="000000"
                  className={tokenInputClassName}
                  required
                />
              </div>

              <AuthSubmitButton variant="outline" className="w-full" pendingLabel="登入中...">
                <FlaskConicalIcon className="size-4" />
                以示範帳號登入
              </AuthSubmitButton>
              <p className="text-xs text-muted-foreground">
                只能用於指定的示範信箱與固定驗證碼；示範資料與其他帳號完全隔離。
              </p>
            </form>
          </section>
        )}

        <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KeyRoundIcon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium">Email 驗證</h2>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {mockAuthEnabled ? "Dev mock" : devOtpAvailable ? "Local code" : "Supabase"}
                </Badge>
              </div>

              {isOtpVerificationStep ? (
                <div className="grid gap-3">
                  <form action={verifyEmailOtp} className="grid gap-3">
                    <input type="hidden" name="next" value={nextPath} />
                    <input type="hidden" name="email" value={email} />

                    <div className="grid gap-2">
                      <Label htmlFor="token">六碼驗證碼</Label>
                      {devOtpAvailable ? (
                        <>
                          <input type="hidden" name="token" value={DEFAULT_DEV_OTP_LOGIN_CODE} />
                          <div
                            id="token"
                            aria-label="六碼驗證碼"
                            className={`${tokenInputClassName} flex items-center`}
                          >
                            {DEFAULT_DEV_OTP_LOGIN_CODE}
                          </div>
                        </>
                      ) : (
                        <input
                          id="token"
                          name="token"
                          type="text"
                          data-slot="input"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          minLength={6}
                          maxLength={6}
                          placeholder="000000"
                          className={tokenInputClassName}
                          autoFocus
                          required
                        />
                      )}
                      {devOtpAvailable && (
                        <p className="text-xs text-muted-foreground">
                          本機固定驗證碼已預填；送出後會用這個 email 對應既有 Profile。
                        </p>
                      )}
                    </div>

                    <AuthSubmitButton
                      className="w-full"
                      disabled={!canVerifyEmailOtp}
                      pendingLabel="驗證中..."
                    >
                      <KeyRoundIcon className="size-4" />
                      驗證並登入
                    </AuthSubmitButton>
                  </form>

                  <form action={requestEmailOtp}>
                    <input type="hidden" name="next" value={nextPath} />
                    <input type="hidden" name="email" value={email} />
                    <AuthSubmitButton
                      variant="outline"
                      className="w-full"
                      disabled={!hasSupabaseConfig}
                      pendingLabel="重新寄送中..."
                    >
                      <RotateCcwIcon className="size-4" />
                      重新寄送驗證碼
                    </AuthSubmitButton>
                  </form>
                </div>
              ) : devOtpAvailable ? (
                <form action={verifyEmailOtp} className="grid gap-3">
                  <input type="hidden" name="next" value={nextPath} />

                  <div className="grid gap-2">
                    <Label htmlFor="dev-otp-email">Email</Label>
                    <Input
                      id="dev-otp-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      defaultValue={email}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dev-token">本機六碼驗證</Label>
                    <input type="hidden" name="token" value={DEFAULT_DEV_OTP_LOGIN_CODE} />
                    <div
                      id="dev-token"
                      aria-label="本機六碼驗證"
                      className={`${tokenInputClassName} flex items-center`}
                    >
                      {DEFAULT_DEV_OTP_LOGIN_CODE}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      只在 localhost 非 production 可用；不寄信、不建立 Supabase session。
                    </p>
                  </div>

                  <AuthSubmitButton className="w-full" pendingLabel="登入中...">
                    <KeyRoundIcon className="size-4" />
                    用本機六碼登入
                  </AuthSubmitButton>
                </form>
              ) : (
                <form action={requestEmailOtp} className="grid gap-3">
                  <input type="hidden" name="next" value={nextPath} />

                  <div className="grid gap-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input
                      id="otp-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      defaultValue={email}
                      disabled={!hasSupabaseConfig}
                      required
                    />
                  </div>

                  <AuthSubmitButton
                    className="w-full"
                    disabled={!hasSupabaseConfig}
                    pendingLabel="寄送中..."
                  >
                    <MailIcon className="size-4" />
                    寄送六碼驗證碼
                  </AuthSubmitButton>
                </form>
              )}

              <div className="border-t pt-4">
                <form action={requestMagicLink} className="grid gap-3">
                  <input type="hidden" name="next" value={nextPath} />

                  <div className="grid gap-2">
                    <Label htmlFor="magic-link-email">或使用 Magic link</Label>
                    <Input
                      id="magic-link-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      defaultValue={email}
                      disabled={!hasSupabaseConfig}
                      required
                    />
                  </div>

                  <AuthSubmitButton
                    variant="outline"
                    className="w-full"
                    disabled={!hasSupabaseConfig}
                    pendingLabel="寄送中..."
                  >
                    <MailIcon className="size-4" />
                    寄送登入連結
                  </AuthSubmitButton>
                </form>
              </div>
            </div>
        </section>

        {!hasSupabaseConfig && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
            尚未設定登入服務。
            {devOtpAvailable ? ` 本機開發可使用 ${DEFAULT_DEV_OTP_LOGIN_CODE} 登入。` : ""}
          </div>
        )}
      </div>
    </main>
  )
}
