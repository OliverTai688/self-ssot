export type AuthMode = "mock" | "supabase"

export function getRequestedAuthMode(): AuthMode {
  return process.env.PERSONAL_OS_AUTH_MODE === "mock" ? "mock" : "supabase"
}

export function getAuthRuntimeMode(): AuthMode {
  if (getRequestedAuthMode() === "mock" && process.env.NODE_ENV !== "production") {
    return "mock"
  }

  return "supabase"
}

export function isMockAuthEnabled() {
  return getAuthRuntimeMode() === "mock"
}
