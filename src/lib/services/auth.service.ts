import "server-only"

import type { Profile, UserRole } from "@prisma/client"
import { cache } from "react"

import { type AuthMode, isMockAuthEnabled } from "@/lib/auth/runtime"
import { db } from "@/lib/db"
import { getSupabasePublicConfig } from "@/lib/supabase/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const DEFAULT_DEV_USER_EMAIL = "admin@example.com"

export type AuthenticatedUser = {
  id: string
  email: string
  role: UserRole
}

export type AuthResolutionStatus =
  | "authenticated"
  | "mock_profile_missing"
  | "supabase_config_missing"
  | "supabase_session_missing"
  | "supabase_profile_missing"

export type AuthResolution = {
  mode: AuthMode
  hasSupabaseConfig: boolean
  status: AuthResolutionStatus
  user: AuthenticatedUser | null
  verifiedEmail: string | null
}

function getMockUserEmail() {
  return process.env.PERSONAL_OS_DEV_USER_EMAIL ?? DEFAULT_DEV_USER_EMAIL
}

function toAuthenticatedUser(profile: Pick<Profile, "id" | "email" | "role">): AuthenticatedUser {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
  }
}

async function resolveMockCurrentUser(): Promise<AuthResolution> {
  const profile = await db.profile.findUnique({
    where: { email: getMockUserEmail() },
  })

  return {
    mode: "mock",
    hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
    status: profile ? "authenticated" : "mock_profile_missing",
    user: profile ? toAuthenticatedUser(profile) : null,
    verifiedEmail: profile?.email ?? null,
  }
}

async function resolveSupabaseCurrentUser(): Promise<AuthResolution> {
  const hasSupabaseConfig = Boolean(getSupabasePublicConfig())

  if (!hasSupabaseConfig) {
    return {
      mode: "supabase",
      hasSupabaseConfig,
      status: "supabase_config_missing",
      user: null,
      verifiedEmail: null,
    }
  }

  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return {
      mode: "supabase",
      hasSupabaseConfig,
      status: "supabase_config_missing",
      user: null,
      verifiedEmail: null,
    }
  }

  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims.email) {
    return {
      mode: "supabase",
      hasSupabaseConfig,
      status: "supabase_session_missing",
      user: null,
      verifiedEmail: null,
    }
  }

  const profile = await db.profile.findUnique({
    where: { email: data.claims.email },
  })

  return {
    mode: "supabase",
    hasSupabaseConfig,
    status: profile ? "authenticated" : "supabase_profile_missing",
    user: profile ? toAuthenticatedUser(profile) : null,
    verifiedEmail: data.claims.email,
  }
}

async function resolveCurrentUserUncached(): Promise<AuthResolution> {
  if (isMockAuthEnabled()) {
    return resolveMockCurrentUser()
  }

  return resolveSupabaseCurrentUser()
}

export const resolveCurrentUser = cache(resolveCurrentUserUncached)

export async function getCurrentUser() {
  const resolution = await resolveCurrentUser()
  return resolution.user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}
