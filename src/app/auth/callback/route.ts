import { NextResponse, type NextRequest } from "next/server"

import { normalizeNextPath } from "@/lib/auth/redirect"
import { createServerSupabaseClient } from "@/lib/supabase/server"

function createLoginUrl(request: NextRequest, status: string, nextPath: string) {
  const url = new URL("/login", request.url)
  url.searchParams.set("status", status)
  url.searchParams.set("next", normalizeNextPath(nextPath))
  return url
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(createLoginUrl(request, "invalid-callback", nextPath))
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return NextResponse.redirect(createLoginUrl(request, "missing-env", nextPath))
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(createLoginUrl(request, "invalid-callback", nextPath))
  }

  return NextResponse.redirect(new URL(nextPath, request.url))
}
