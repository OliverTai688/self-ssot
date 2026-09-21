/**
 * AUTH-013 Demo Account Login.
 *
 * A single, explicitly configured email+six-digit-code pair that is allowed
 * to sign in WITHOUT a real Supabase session, in every environment
 * including production. This is intentionally separate from
 * `src/lib/auth/dev-otp.ts`: the dev-otp bridge is a developer convenience
 * that is hard-disabled in production and defaults to localhost only, and
 * that invariant must stay untouched. The demo account below is a
 * deliberate, owner-configured product decision (a public "try the demo"
 * account with fixed data), not a development bypass, so it gets its own
 * env vars, its own cookie, and its own guard function.
 *
 * The feature is off unless BOTH env vars are set to a valid shape:
 *
 *   PERSONAL_OS_DEMO_LOGIN_EMAIL=test@yzedtech.com
 *   PERSONAL_OS_DEMO_LOGIN_CODE=123456
 *
 * Unsetting either one immediately disables new sign-ins AND invalidates
 * any cookie already issued, since every read re-checks the current env
 * value instead of trusting the cookie alone.
 */

export const DEMO_LOGIN_COOKIE_NAME = "personal_os_demo_email"
export const DEMO_LOGIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export type DemoLoginConfig = {
  email: string
  code: string
}

export function getDemoLoginConfig(): DemoLoginConfig | null {
  const email = process.env.PERSONAL_OS_DEMO_LOGIN_EMAIL?.trim().toLowerCase()
  const code = process.env.PERSONAL_OS_DEMO_LOGIN_CODE?.trim()

  if (!email || !isValidEmail(email) || !code || !/^\d{6}$/.test(code)) {
    return null
  }

  return { email, code }
}

export function isDemoLoginConfigured() {
  return getDemoLoginConfig() !== null
}

export function isDemoLoginCredential(email: string, token: string): boolean {
  const config = getDemoLoginConfig()

  if (!config) {
    return false
  }

  return email.trim().toLowerCase() === config.email && token === config.code
}

export function encodeDemoLoginCookieEmail(email: string) {
  return encodeURIComponent(email.trim().toLowerCase())
}

/**
 * Decodes the demo login cookie AND re-validates it against the currently
 * configured demo email, so a stale cookie stops working the moment the
 * owner changes or unsets `PERSONAL_OS_DEMO_LOGIN_EMAIL`.
 */
export function decodeDemoLoginCookieEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const config = getDemoLoginConfig()

  if (!config) {
    return null
  }

  try {
    const email = decodeURIComponent(value).trim().toLowerCase()
    return email === config.email ? email : null
  } catch {
    return null
  }
}
