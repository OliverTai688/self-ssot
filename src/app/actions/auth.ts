"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { normalizeNextPath } from "@/lib/auth/redirect"
import { createServerSupabaseClient } from "@/lib/supabase/server"

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function createLoginRedirect(status: string, nextPath: string, email?: string) {
  const searchParams = new URLSearchParams({
    status,
    next: normalizeNextPath(nextPath),
  })

  if (email) {
    searchParams.set("email", email)
  }

  return `/login?${searchParams.toString()}`
}

async function getRequestOrigin() {
  const headerStore = await headers()
  const origin = headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL

  return origin ?? "http://localhost:3000"
}

export async function requestMagicLink(formData: FormData) {
  const email = getFormString(formData, "email").toLowerCase()
  const nextPath = normalizeNextPath(getFormString(formData, "next"))

  if (!email) {
    redirect(createLoginRedirect("missing-email", nextPath))
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirect(createLoginRedirect("missing-env", nextPath, email))
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
    console.warn("[auth] Magic link request failed", {
      code: error.code,
      status: error.status,
      name: error.name,
    })

    redirect(createLoginRedirect("request-failed", nextPath, email))
  }

  redirect(createLoginRedirect("sent", nextPath, email))
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" })
  }

  redirect("/login?status=signed-out")
}
