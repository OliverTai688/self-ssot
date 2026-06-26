import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabasePublicConfig } from "@/lib/supabase/env"

export async function updateSupabaseSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers
) {
  let response = NextResponse.next({ request: { headers: requestHeaders } })
  const config = getSupabasePublicConfig()

  if (!config) {
    return {
      response,
      hasSupabaseConfig: false,
      hasSupabaseSession: false,
    }
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({ request: { headers: requestHeaders } })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
      },
    },
  })

  const { data, error } = await supabase.auth.getClaims()

  return {
    response,
    hasSupabaseConfig: true,
    hasSupabaseSession: !error && Boolean(data?.claims.sub),
  }
}
