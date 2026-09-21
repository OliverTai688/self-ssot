import { NextResponse, type NextRequest } from "next/server"

import { DEMO_LOGIN_COOKIE_NAME, decodeDemoLoginCookieEmail } from "@/lib/auth/demo-login"
import {
  DEV_OTP_COOKIE_NAME,
  decodeDevOtpCookieEmail,
  isDevOtpLoginAllowedForUrl,
} from "@/lib/auth/dev-otp"
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

  const hasLocalDevOtpSession =
    isDevOtpLoginAllowedForUrl(request.url) &&
    Boolean(decodeDevOtpCookieEmail(request.cookies.get(DEV_OTP_COOKIE_NAME)?.value))

  if (hasLocalDevOtpSession) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // AUTH-013: demo account cookie, allowed in every environment (not just
  // localhost) but only while PERSONAL_OS_DEMO_LOGIN_EMAIL/_CODE are set —
  // decodeDemoLoginCookieEmail re-checks that live config on every request.
  const hasDemoLoginSession = Boolean(
    decodeDemoLoginCookieEmail(request.cookies.get(DEMO_LOGIN_COOKIE_NAME)?.value),
  )

  if (hasDemoLoginSession) {
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
