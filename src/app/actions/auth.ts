"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  DEMO_LOGIN_COOKIE_MAX_AGE_SECONDS,
  DEMO_LOGIN_COOKIE_NAME,
  encodeDemoLoginCookieEmail,
  isDemoLoginCredential,
} from "@/lib/auth/demo-login"
import {
  DEV_OTP_COOKIE_MAX_AGE_SECONDS,
  DEV_OTP_COOKIE_NAME,
  encodeDevOtpCookieEmail,
  getDevOtpFallbackEmail,
  isDevOtpLoginAllowedForUrl,
  isDevOtpLoginCode,
} from "@/lib/auth/dev-otp"
import { normalizeNextPath } from "@/lib/auth/redirect"
import { createServerSupabaseClient } from "@/lib/supabase/server"

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function createLoginRedirect(
  status: string,
  nextPath: string,
  email?: string,
  method?: "magic-link" | "otp"
) {
  const searchParams = new URLSearchParams({
    status,
    next: normalizeNextPath(nextPath),
  })

  if (email) {
    searchParams.set("email", email)
  }

  if (method) {
    searchParams.set("method", method)
  }

  return `/login?${searchParams.toString()}`
}

async function getRequestOrigin() {
  const headerStore = await headers()
  const origin = headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL

  return origin ?? "http://localhost:3000"
}

async function requestPasswordlessEmail({
  email,
  nextPath,
  method,
}: {
  email: string
  nextPath: string
  method: "magic-link" | "otp"
}) {
  const missingEmailStatus = method === "otp" ? "otp-missing-email" : "missing-email"
  const requestFailedStatus = method === "otp" ? "otp-request-failed" : "request-failed"
  const sentStatus = method === "otp" ? "otp-sent" : "sent"

  if (!isValidEmail(email)) {
    redirect(createLoginRedirect(missingEmailStatus, nextPath, undefined, method))
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirect(createLoginRedirect("missing-env", nextPath, email, method))
  }

  const origin = await getRequestOrigin()
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  })

  if (error) {
    console.warn("[auth] Passwordless email request failed", {
      code: error.code,
      status: error.status,
      name: error.name,
      method,
    })

    redirect(createLoginRedirect(requestFailedStatus, nextPath, email, method))
  }

  redirect(createLoginRedirect(sentStatus, nextPath, email, method))
}

export async function requestMagicLink(formData: FormData) {
  const email = getFormString(formData, "email").toLowerCase()
  const nextPath = normalizeNextPath(getFormString(formData, "next"))

  await requestPasswordlessEmail({
    email,
    nextPath,
    method: "magic-link",
  })
}

export async function requestEmailOtp(formData: FormData) {
  const email = getFormString(formData, "email").toLowerCase()
  const nextPath = normalizeNextPath(getFormString(formData, "next"))

  await requestPasswordlessEmail({
    email,
    nextPath,
    method: "otp",
  })
}

export async function verifyEmailOtp(formData: FormData) {
  let email = getFormString(formData, "email").toLowerCase()
  const token = getFormString(formData, "token").replace(/\s/g, "")
  const nextPath = normalizeNextPath(getFormString(formData, "next"))

  if (!isValidEmail(email) && isDevOtpLoginCode(token)) {
    email = getDevOtpFallbackEmail() ?? email
  }

  if (!isValidEmail(email)) {
    redirect(createLoginRedirect("otp-missing-email", nextPath, undefined, "otp"))
  }

  if (!/^\d{6}$/.test(token)) {
    redirect(createLoginRedirect("otp-format-invalid", nextPath, email, "otp"))
  }

  if (isDevOtpLoginCode(token)) {
    const origin = await getRequestOrigin()

    if (isDevOtpLoginAllowedForUrl(origin)) {
      const cookieStore = await cookies()

      cookieStore.set({
        name: DEV_OTP_COOKIE_NAME,
        value: encodeDevOtpCookieEmail(email),
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: DEV_OTP_COOKIE_MAX_AGE_SECONDS,
      })

      redirect(nextPath)
    }
  }

  // AUTH-013: fixed-code demo account login, allowed in every environment
  // (unlike the dev-otp bridge above) but only for the exact email+code
  // pair the owner configured. See src/lib/auth/demo-login.ts.
  if (isDemoLoginCredential(email, token)) {
    const cookieStore = await cookies()

    cookieStore.set({
      name: DEMO_LOGIN_COOKIE_NAME,
      value: encodeDemoLoginCookieEmail(email),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEMO_LOGIN_COOKIE_MAX_AGE_SECONDS,
    })

    redirect(nextPath)
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirect(createLoginRedirect("missing-env", nextPath, email, "otp"))
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  })

  if (error || !data.session) {
    console.warn("[auth] Email OTP verification failed", {
      code: error?.code,
      status: error?.status,
      name: error?.name,
    })

    redirect(createLoginRedirect("otp-invalid", nextPath, email, "otp"))
  }

  redirect(nextPath)
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete(DEV_OTP_COOKIE_NAME)
  cookieStore.delete(DEMO_LOGIN_COOKIE_NAME)

  const supabase = await createServerSupabaseClient()

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" })
  }

  redirect("/login?status=signed-out")
}
