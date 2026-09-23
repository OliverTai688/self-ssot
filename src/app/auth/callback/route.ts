import { NextResponse, type NextRequest } from "next/server"

import { normalizeNextPath } from "@/lib/auth/redirect"
import {
  ensureGoogleAllowlistedProfile,
  type GoogleAllowlistResult,
} from "@/lib/services/auth.service"
import { createServerSupabaseClient } from "@/lib/supabase/server"

import type { User } from "@supabase/supabase-js"

/**
 * Three different problems used to share one status. Keeping them apart means
 * the login page can tell an owner "the server has no allowlist configured"
 * instead of telling a legitimate account it is not welcome.
 */
const GOOGLE_REFUSAL_STATUS = {
  not_allowed: "google_not_allowed",
  allowlist_not_configured: "google_allowlist_unconfigured",
  profile_lookup_failed: "google_profile_lookup_failed",
} as const

function createLoginUrl(request: NextRequest, status: string, nextPath: string) {
  const url = new URL("/login", request.url)
  url.searchParams.set("status", status)
  url.searchParams.set("next", normalizeNextPath(nextPath))
  return url
}

function wasGoogleUsedForThisSignIn(user: User | null | undefined): boolean {
  const appMetadata = user?.app_metadata
  if (!appMetadata) {
    return false
  }

  return (
    appMetadata.provider === "google" ||
    (Array.isArray(appMetadata.providers) && appMetadata.providers.includes("google"))
  )
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"))

  if (!code) {
    // Debug-only: helps distinguish "provider/Supabase sent an error back"
    // from "the code param was simply missing" without logging secrets.
    console.warn("[auth] /auth/callback reached with no code param", {
      error: request.nextUrl.searchParams.get("error"),
      errorCode: request.nextUrl.searchParams.get("error_code"),
      errorDescription: request.nextUrl.searchParams.get("error_description"),
    })
    return NextResponse.redirect(createLoginUrl(request, "invalid-callback", nextPath))
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return NextResponse.redirect(createLoginUrl(request, "missing-env", nextPath))
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.warn("[auth] exchangeCodeForSession failed", {
      code: error.code,
      status: error.status,
      name: error.name,
      message: error.message,
    })
    return NextResponse.redirect(createLoginUrl(request, "invalid-callback", nextPath))
  }

  // AUTH-012: Google OAuth always creates a Supabase Auth user on first
  // consent, so this is the fail-closed gate that keeps Google sign-in
  // restricted to PERSONAL_OS_TEAM_PROFILES. Magic-link/OTP sign-in is
  // untouched here; it is already gated by shouldCreateUser: false plus the
  // existing Profile-mapping check.
  if (wasGoogleUsedForThisSignIn(data.user)) {
    const email = data.user?.email ?? null
    const allowlist: GoogleAllowlistResult = email
      ? await ensureGoogleAllowlistedProfile(email)
      : { ok: false, reason: "not_allowed" }

    if (!allowlist.ok) {
      await supabase.auth.signOut({ scope: "local" })
      return NextResponse.redirect(
        createLoginUrl(request, GOOGLE_REFUSAL_STATUS[allowlist.reason], nextPath),
      )
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url))
}
