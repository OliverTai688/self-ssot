import "server-only"

import type { Profile, UserRole } from "@prisma/client"
import { cookies } from "next/headers"
import { cache } from "react"

import {
  DEMO_LOGIN_COOKIE_NAME,
  decodeDemoLoginCookieEmail,
  isDemoLoginConfigured,
} from "@/lib/auth/demo-login"
import {
  DEV_OTP_COOKIE_NAME,
  decodeDevOtpCookieEmail,
  isDevOtpRuntimeAllowed,
} from "@/lib/auth/dev-otp"
import { type AuthMode, isMockAuthEnabled } from "@/lib/auth/runtime"
import { findTeamProfileEntry, getConfiguredTeamProfiles } from "@/lib/auth/team-profiles"
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

/**
 * Why a Google sign-in was refused. "not_allowed" is the intended boundary;
 * the other two are misconfiguration or an outage wearing the same costume,
 * and a single boolean made all three indistinguishable from the outside.
 */
export type GoogleAllowlistResult =
  | { ok: true }
  | { ok: false; reason: "not_allowed" | "allowlist_not_configured" | "profile_lookup_failed" }

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
  try {
    const profile = await db.profile.findUnique({
      where: { email: getMockUserEmail() },
      select: { id: true, email: true, role: true },
    })

    return {
      mode: "mock",
      hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
      status: profile ? "authenticated" : "mock_profile_missing",
      user: profile ? toAuthenticatedUser(profile) : null,
      verifiedEmail: profile?.email ?? null,
    }
  } catch (error) {
    console.warn("Database connection or query failed in resolveMockCurrentUser:", error)
    return {
      mode: "mock",
      hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
      status: "mock_profile_missing",
      user: null,
      verifiedEmail: null,
    }
  }
}

async function resolveDevOtpCurrentUser(): Promise<AuthResolution | null> {
  if (!isDevOtpRuntimeAllowed()) {
    return null
  }

  const cookieStore = await cookies()
  const email = decodeDevOtpCookieEmail(cookieStore.get(DEV_OTP_COOKIE_NAME)?.value)

  if (!email) {
    return null
  }

  try {
    const profile = await db.profile.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    })

    return {
      mode: "mock",
      hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
      status: profile ? "authenticated" : "mock_profile_missing",
      user: profile ? toAuthenticatedUser(profile) : null,
      verifiedEmail: profile?.email ?? email,
    }
  } catch (error) {
    console.warn("Database connection or query failed in resolveDevOtpCurrentUser:", error)
    return {
      mode: "mock",
      hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
      status: "mock_profile_missing",
      user: null,
      verifiedEmail: email,
    }
  }
}

/**
 * AUTH-013 demo account resolver. Unlike `resolveDevOtpCurrentUser`, this
 * intentionally runs in every environment — the demo account is meant to
 * work in production — but only when `PERSONAL_OS_DEMO_LOGIN_EMAIL`/
 * `PERSONAL_OS_DEMO_LOGIN_CODE` are configured, and `decodeDemoLoginCookieEmail`
 * re-checks the cookie against that live config on every read.
 */
async function resolveDemoLoginCurrentUser(): Promise<AuthResolution | null> {
  if (!isDemoLoginConfigured()) {
    return null
  }

  const cookieStore = await cookies()
  const email = decodeDemoLoginCookieEmail(cookieStore.get(DEMO_LOGIN_COOKIE_NAME)?.value)

  if (!email) {
    return null
  }

  try {
    const profile = await db.profile.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    })

    return {
      mode: "mock",
      hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
      status: profile ? "authenticated" : "mock_profile_missing",
      user: profile ? toAuthenticatedUser(profile) : null,
      verifiedEmail: profile?.email ?? email,
    }
  } catch (error) {
    console.warn("Database connection or query failed in resolveDemoLoginCurrentUser:", error)
    return {
      mode: "mock",
      hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
      status: "mock_profile_missing",
      user: null,
      verifiedEmail: email,
    }
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

  // YZLIVE-003：身分由已驗證的 Auth UID 決定，email 只是登入地址。
  // 先用 UID 找；找不到才退回 email，並在那時把 UID 綁上去。這樣使用者日後
  // 改了登入信箱，Profile 不會變成孤兒，也不會有人用同名信箱接收既有身分。
  const authUserId = typeof data.claims.sub === "string" ? data.claims.sub : null

  try {
    let profile = authUserId
      ? await db.profile.findUnique({ where: { authUserId }, select: { id: true, email: true, role: true } })
      : null

    if (!profile) {
      profile = await db.profile.findUnique({
        where: { email: data.claims.email },
        select: { id: true, email: true, role: true },
      })

      if (profile && authUserId) {
        // 一次性綁定。只在尚未綁定時寫，已綁定的不動 —— 兩個 UID 搶同一個 Profile
        // 應該失敗（authUserId 是 unique），而不是悄悄改掉。
        await db.profile
          .updateMany({ where: { id: profile.id, authUserId: null }, data: { authUserId } })
          .catch((bindError) => {
            console.warn("[auth] could not bind authUserId to the profile", bindError)
          })
      }
    }

    return {
      mode: "supabase",
      hasSupabaseConfig,
      status: profile ? "authenticated" : "supabase_profile_missing",
      user: profile ? toAuthenticatedUser(profile) : null,
      verifiedEmail: data.claims.email,
    }
  } catch (error) {
    console.warn("Database connection or query failed in resolveSupabaseCurrentUser:", error)
    return {
      mode: "supabase",
      hasSupabaseConfig,
      status: "supabase_profile_missing",
      user: null,
      verifiedEmail: data.claims.email,
    }
  }
}

async function resolveCurrentUserUncached(): Promise<AuthResolution> {
  if (isMockAuthEnabled()) {
    return resolveMockCurrentUser()
  }

  const devOtpResolution = await resolveDevOtpCurrentUser()

  if (devOtpResolution) {
    return devOtpResolution
  }

  const demoLoginResolution = await resolveDemoLoginCurrentUser()

  if (demoLoginResolution) {
    return demoLoginResolution
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

/**
 * AUTH-012 Google OAuth allowlist gate. Google sign-in always creates a
 * Supabase Auth user on first consent (there is no `shouldCreateUser: false`
 * equivalent for OAuth providers), so this is the boundary that keeps Google
 * login restricted to `PERSONAL_OS_TEAM_PROFILES` instead of any Google
 * account. Returns false for any email not on that list; the caller
 * (`/auth/callback`) must sign the session out when this returns false.
 *
 * On first login for an allowlisted email, this creates the matching
 * `Profile` using the role from `PERSONAL_OS_TEAM_PROFILES`. It never
 * updates an existing Profile's role/name so a manually curated Profile is
 * never silently overwritten by a stale env value.
 */
export async function ensureGoogleAllowlistedProfile(
  email: string,
  authUserId?: string | null,
): Promise<GoogleAllowlistResult> {
  // An unset PERSONAL_OS_TEAM_PROFILES rejects every account, which on a fresh
  // deployment looks exactly like "my Google account is not allowed". Separate
  // it so the login page can say which one it is.
  if (getConfiguredTeamProfiles().length === 0) {
    console.warn(
      "[auth] PERSONAL_OS_TEAM_PROFILES is unset or empty; every Google sign-in will be refused",
    )
    return { ok: false, reason: "allowlist_not_configured" }
  }

  const entry = findTeamProfileEntry(email)

  if (!entry) {
    return { ok: false, reason: "not_allowed" }
  }

  try {
    const existing = await db.profile.findUnique({
      where: { email: entry.email },
      select: { id: true, authUserId: true },
    })

    if (!existing) {
      await db.profile.create({
        data: {
          email: entry.email,
          fullName: entry.fullName,
          role: entry.role,
          authUserId: authUserId ?? null,
        },
      })
    } else if (authUserId && !existing.authUserId) {
      // 既有 Profile 第一次用這個 Auth 身分登入時綁上去。角色與姓名不動：
      // 手工整理過的 Profile 不該被 env 的舊值悄悄覆寫。
      await db.profile.updateMany({ where: { id: existing.id, authUserId: null }, data: { authUserId } })
    }

    return { ok: true }
  } catch (error) {
    console.warn("Database connection or query failed in ensureGoogleAllowlistedProfile:", error)
    return { ok: false, reason: "profile_lookup_failed" }
  }
}
