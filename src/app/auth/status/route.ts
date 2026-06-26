import { NextResponse } from "next/server"

import { getAuthRuntimeMode } from "@/lib/auth/runtime"
import { getSupabasePublicConfig } from "@/lib/supabase/env"
import { resolveCurrentUser, type AuthResolutionStatus } from "@/lib/services/auth.service"
import { getProjectCountForProfile } from "@/lib/services/project.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
}

function getNextAction(status: AuthResolutionStatus | "auth_check_failed") {
  switch (status) {
    case "authenticated":
      return "Open /work with the same browser session and verify the project list/detail owner path."
    case "mock_profile_missing":
      return "Seed or select the development profile configured by PERSONAL_OS_DEV_USER_EMAIL."
    case "supabase_config_missing":
      return "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before real-session smoke."
    case "supabase_session_missing":
      return "Sign in through /login, then revisit /auth/status with the same browser session."
    case "supabase_profile_missing":
      return "Create or link a Profile row with the verified Supabase email before Work access."
    case "auth_check_failed":
      return "Check database connectivity and auth runtime logs, then rerun /auth/status."
  }
}

function isRedactedProofRequest(request: Request) {
  const proof = new URL(request.url).searchParams.get("proof")?.toLowerCase()
  return proof === "1" || proof === "true" || proof === "redacted"
}

function getProofModePayload(redactedProofMode: boolean) {
  return redactedProofMode ? { proofMode: "redacted" } : {}
}

export async function GET(request: Request) {
  const redactedProofMode = isRedactedProofRequest(request)

  try {
    const auth = await resolveCurrentUser()

    if (!auth.user) {
      return NextResponse.json(
        {
          ...getProofModePayload(redactedProofMode),
          authenticated: false,
          authMode: auth.mode,
          supabasePublicConfig: auth.hasSupabaseConfig ? "configured" : "missing",
          authStatus: auth.status,
          profile: null,
          work: null,
          nextAction: getNextAction(auth.status),
        },
        {
          status: auth.status === "supabase_profile_missing" ? 403 : 401,
          headers: noStoreHeaders,
        }
      )
    }

    const projectCount = await getProjectCountForProfile(auth.user.id)

    return NextResponse.json(
      {
        ...getProofModePayload(redactedProofMode),
        authenticated: true,
        authMode: auth.mode,
        supabasePublicConfig: auth.hasSupabaseConfig ? "configured" : "missing",
        authStatus: auth.status,
        profile: redactedProofMode
          ? {
              emailPresent: true,
              role: auth.user.role,
            }
          : {
              email: auth.user.email,
              role: auth.user.role,
            },
        work: {
          ownerScopedProjectCount: projectCount,
          ownerScope: "profile",
        },
        nextAction: getNextAction(auth.status),
      },
      { headers: noStoreHeaders }
    )
  } catch {
    return NextResponse.json(
      {
        ...getProofModePayload(redactedProofMode),
        authenticated: false,
        authMode: getAuthRuntimeMode(),
        supabasePublicConfig: getSupabasePublicConfig() ? "configured" : "missing",
        authStatus: "auth_check_failed",
        profile: null,
        work: null,
        nextAction: getNextAction("auth_check_failed"),
      },
      {
        status: 503,
        headers: noStoreHeaders,
      }
    )
  }
}
