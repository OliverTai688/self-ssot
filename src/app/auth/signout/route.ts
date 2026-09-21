import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { DEMO_LOGIN_COOKIE_NAME } from "@/lib/auth/demo-login"
import { DEV_OTP_COOKIE_NAME } from "@/lib/auth/dev-otp"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * 登出用的 POST 端點。
 *
 * `signOut()` server action 只能從 React 樹裡呼叫；v5 營運工作台跑在 shadow DOM 的
 * vanilla JS 裡，需要一個可以用 <form method="post"> 送出的網址。維持 POST 是為了
 * 不讓一個 <img src>／預抓連結就把人登出。
 */
export async function POST(request: Request) {
  const cookieStore = await cookies()
  cookieStore.delete(DEV_OTP_COOKIE_NAME)
  cookieStore.delete(DEMO_LOGIN_COOKIE_NAME)

  const supabase = await createServerSupabaseClient()
  if (supabase) {
    await supabase.auth.signOut({ scope: "local" })
  }

  return NextResponse.redirect(new URL("/login?status=signed-out&ws=company", request.url), {
    status: 303,
  })
}
