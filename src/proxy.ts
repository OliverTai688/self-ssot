import { NextResponse, type NextRequest } from "next/server"

import { createLoginPath, isProtectedAppPath } from "@/lib/auth/redirect"
import { isMockAuthEnabled } from "@/lib/auth/runtime"
import { updateSupabaseSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const nextPath = `${pathname}${request.nextUrl.search}`
  const requestHeaders = new Headers(request.headers)

  requestHeaders.set("x-personal-os-path", nextPath)

  if (isMockAuthEnabled()) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const sessionUpdate = await updateSupabaseSession(request, requestHeaders)

  if (
    isProtectedAppPath(pathname) &&
    !sessionUpdate.hasSupabaseSession &&
    !isMockAuthEnabled()
  ) {
    return NextResponse.redirect(new URL(createLoginPath(nextPath), request.url))
  }

  return sessionUpdate.response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
