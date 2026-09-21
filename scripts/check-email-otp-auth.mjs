#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  actions: "src/app/actions/auth.ts",
  login: "src/app/(auth)/login/page.tsx",
  submitButton: "src/components/auth/auth-submit-button.tsx",
  devOtp: "src/lib/auth/dev-otp.ts",
  proxy: "src/proxy.ts",
  authService: "src/lib/services/auth.service.ts",
  redirect: "src/lib/auth/redirect.ts",
  authStrategy: "docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
}

const ACTION_MARKERS = [
  "requestEmailOtp",
  "verifyEmailOtp",
  "signInWithOtp",
  "shouldCreateUser: false",
  "verifyOtp",
  'type: "email"',
  "/^\\d{6}$/",
  "isDevOtpLoginCode",
  "DEV_OTP_COOKIE_NAME",
  "encodeDevOtpCookieEmail",
  "getDevOtpFallbackEmail",
  "normalizeNextPath",
  'method: "otp"',
]

const LOGIN_MARKERS = [
  "Email 六碼驗證",
  "寄送六碼驗證碼",
  "六碼驗證碼",
  'inputMode="numeric"',
  'autoComplete="one-time-code"',
  'pattern="[0-9]{6}"',
  "驗證並登入",
  "重新寄送驗證碼",
  "DEFAULT_DEV_OTP_LOGIN_CODE",
  "Local code",
  "用本機六碼登入",
  "Magic link",
  "AuthSubmitButton",
]

const SUBMIT_BUTTON_MARKERS = ["useFormStatus", "pendingLabel", "animate-spin", 'type="submit"']

const DEV_OTP_MARKERS = [
  "DEFAULT_DEV_OTP_LOGIN_CODE",
  '"123456"',
  "DEV_OTP_COOKIE_NAME",
  "personal_os_dev_otp_email",
  'process.env.NODE_ENV !== "production"',
  "localhost",
  "127.0.0.1",
  "PERSONAL_OS_DEV_OTP_ENABLED",
  "PERSONAL_OS_DEV_USER_EMAIL",
  "PERSONAL_OS_TEAM_PROFILES",
  "getDevOtpFallbackEmail",
  "encodeURIComponent",
  "decodeURIComponent",
]

const PROXY_MARKERS = [
  "hasLocalDevOtpSession",
  "DEV_OTP_COOKIE_NAME",
  "decodeDevOtpCookieEmail",
  "isDevOtpLoginAllowedForUrl",
  "updateSupabaseSession",
]

const AUTH_SERVICE_MARKERS = [
  "resolveDevOtpCurrentUser",
  "cookies",
  "DEV_OTP_COOKIE_NAME",
  "decodeDevOtpCookieEmail",
  "status: profile ? \"authenticated\" : \"mock_profile_missing\"",
  "resolveSupabaseCurrentUser",
]

const DOC_MARKERS = [
  "AUTH-010",
  "AUTH-011",
  "{{ .Token }}",
  "{{ .ConfirmationURL }}",
  "123456",
  "localhost",
  "shouldCreateUser: false",
  "verifyOtp",
  "Supabase",
]

function read(filePath) {
  const absolutePath = path.join(ROOT, filePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function validateMarkers({ label, text, markers, errors }) {
  if (text === null) {
    errors.push(`${label} is missing.`)
    return
  }

  const missing = markers.filter((marker) => !text.includes(marker))
  if (missing.length > 0) {
    errors.push(`${label} missing markers: ${missing.join(", ")}`)
  }
}

const errors = []
const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))

validateMarkers({ label: FILES.actions, text: texts.actions, markers: ACTION_MARKERS, errors })
validateMarkers({ label: FILES.login, text: texts.login, markers: LOGIN_MARKERS, errors })
validateMarkers({ label: FILES.devOtp, text: texts.devOtp, markers: DEV_OTP_MARKERS, errors })
validateMarkers({ label: FILES.proxy, text: texts.proxy, markers: PROXY_MARKERS, errors })
validateMarkers({ label: FILES.authService, text: texts.authService, markers: AUTH_SERVICE_MARKERS, errors })
validateMarkers({
  label: FILES.submitButton,
  text: texts.submitButton,
  markers: SUBMIT_BUTTON_MARKERS,
  errors,
})
validateMarkers({
  label: "AUTH-010 docs and task memory",
  text: [texts.authStrategy, texts.acceptance, texts.backlog, texts.sprint, texts.completedLog, texts.tasks]
    .filter(Boolean)
    .join("\n"),
  markers: DOC_MARKERS,
  errors,
})

const forbiddenActionPatterns = [
  /shouldCreateUser:\s*true/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /createAdminClient/,
  /@prisma\/client/,
  /@\/lib\/db/,
  /redirect\(\s*(?:email|token)/,
]

for (const pattern of forbiddenActionPatterns) {
  if (pattern.test(texts.actions ?? "")) {
    errors.push(`${FILES.actions} contains forbidden pattern ${pattern}.`)
  }
}

if (!(texts.redirect ?? "").includes("isUnsafeRedirectPath")) {
  errors.push(`${FILES.redirect} must keep the open-redirect guard.`)
}

if ((texts.devOtp ?? "").includes('process.env.NODE_ENV === "production"')) {
  errors.push(`${FILES.devOtp} must not enable fixed-code login in production.`)
}

const payload = {
  id: "AUTH-010-AUTH-011",
  status: errors.length === 0 ? "ready_for_email_otp_auth_use" : "failed",
  generatedAt: new Date().toISOString(),
  flow: {
    request: "Supabase signInWithOtp for an existing user",
    verify: "Supabase verifyOtp with email plus six-digit token",
    localDevFallback: "localhost-only fixed 123456 code sets an HTTP-only dev OTP cookie for an existing Profile",
    session: "cookie-backed Supabase SSR session",
    redirect: "normalized internal next path",
  },
  boundaries: {
    createsUsers: false,
    writesApplicationDatabase: false,
    usesServiceRole: false,
    keepsMagicLink: true,
    requiresHostedTemplateTokenVariable: true,
    fixedCodeProductionAllowed: false,
  },
  files: FILES,
  errors,
}

console.log(JSON.stringify(payload, null, 2))
process.exit(errors.length === 0 ? 0 : 1)
