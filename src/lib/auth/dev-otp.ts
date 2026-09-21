export const DEV_OTP_COOKIE_NAME = "personal_os_dev_otp_email"
export const DEV_OTP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8
export const DEFAULT_DEV_OTP_LOGIN_CODE = "123456"

const LOCAL_DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

export function getDevOtpLoginCode() {
  return process.env.PERSONAL_OS_DEV_OTP_CODE?.trim() || DEFAULT_DEV_OTP_LOGIN_CODE
}

export function isDevOtpRuntimeAllowed() {
  return process.env.NODE_ENV !== "production"
}

export function isDevOtpLoginAllowedForUrl(url: string | null | undefined) {
  if (!isDevOtpRuntimeAllowed()) {
    return false
  }

  if (process.env.PERSONAL_OS_DEV_OTP_ENABLED === "1") {
    return true
  }

  if (!url) {
    return false
  }

  try {
    return LOCAL_DEV_HOSTNAMES.has(new URL(url).hostname)
  } catch {
    return false
  }
}

export function isDevOtpLoginCode(token: string) {
  return token === getDevOtpLoginCode()
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getDevOtpFallbackEmail() {
  const configuredDevEmail = process.env.PERSONAL_OS_DEV_USER_EMAIL?.trim().toLowerCase()

  if (configuredDevEmail && isValidEmail(configuredDevEmail)) {
    return configuredDevEmail
  }

  const teamProfiles = process.env.PERSONAL_OS_TEAM_PROFILES?.split(",") ?? []

  for (const profile of teamProfiles) {
    const email = profile.split(":")[0]?.trim().toLowerCase()

    if (email && isValidEmail(email)) {
      return email
    }
  }

  return null
}

export function encodeDevOtpCookieEmail(email: string) {
  return encodeURIComponent(email.trim().toLowerCase())
}

export function decodeDevOtpCookieEmail(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    const email = decodeURIComponent(value).trim().toLowerCase()
    return isValidEmail(email) ? email : null
  } catch {
    return null
  }
}
