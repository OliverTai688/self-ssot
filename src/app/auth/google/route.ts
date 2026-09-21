import { NextResponse, type NextRequest } from "next/server"

import { normalizeNextPath } from "@/lib/auth/redirect"
import { createServerSupabaseClient } from "@/lib/supabase/server"

function createLoginUrl(request: NextRequest, status: string, nextPath: string) {
  const url = new URL("/login", request.url)
  url.searchParams.set("status", status)
  url.searchParams.set("next", normalizeNextPath(nextPath))
  return url
}

/**
 * AUTH-012 Google OAuth kickoff. This is a Route Handler rather than a
 * Server Action so `signInWithOAuth`'s PKCE code-verifier cookie write and
 * the resulting 302 to Google happen on one plain HTTP response — the same
 * primitive `/auth/callback` already relies on for `exchangeCodeForSession`,
 * and the pattern Supabase's own Next.js SSR OAuth guide uses.
 */
export async function GET(request: NextRequest) {
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"))
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return NextResponse.redirect(createLoginUrl(request, "missing-env", nextPath))
  }

  const redirectTo = `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  })

  if (error || !data?.url) {
    console.warn("[auth] Google sign-in request failed", {
      code: error?.code,
      status: error?.status,
      name: error?.name,
      message: error?.message,
    })
    return NextResponse.redirect(createLoginUrl(request, "google-request-failed", nextPath))
  }

  return NextResponse.redirect(data.url)
}
