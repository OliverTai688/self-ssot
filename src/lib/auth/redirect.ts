export const DEFAULT_AUTHENTICATED_PATH = "/ai-input"

const PROTECTED_APP_PATH_PREFIXES = [
  "/ai-input",
  "/dashboard",
  "/inbox",
  "/work",
  "/research",
  "/chamber",
  "/finance",
  "/life",
  "/company",
  "/workflow",
  "/settings",
  "/admin",
]

function isUnsafeRedirectPath(path: string) {
  return path.startsWith("//") || path.includes("://")
}

export function normalizeNextPath(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value

  if (typeof raw !== "string" || !raw.startsWith("/") || isUnsafeRedirectPath(raw)) {
    return DEFAULT_AUTHENTICATED_PATH
  }

  if (raw.startsWith("/login") || raw.startsWith("/auth/")) {
    return DEFAULT_AUTHENTICATED_PATH
  }

  return raw
}

export function isProtectedAppPath(pathname: string) {
  return PROTECTED_APP_PATH_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}

export function createLoginPath(nextPath: string, status?: string) {
  const searchParams = new URLSearchParams({ next: normalizeNextPath(nextPath) })

  if (status) {
    searchParams.set("status", status)
  }

  return `/login?${searchParams.toString()}`
}
