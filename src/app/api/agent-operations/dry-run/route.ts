import { NextResponse, type NextRequest } from "next/server"

import { buildAgentOperationDryRun } from "@/lib/services/agent-operation.service"
import { requireUser } from "@/lib/services/auth.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
}

function errorResponse(
  status: 401 | 403 | 405 | 503,
  body: {
    error: string
    code: "unauthenticated" | "not_owner_or_admin" | "method_not_allowed" | "agent_operation_route_failed"
    nextAction?: string
    allowedMethods?: string[]
  }
) {
  return NextResponse.json(body, { status, headers: noStoreHeaders })
}

export function GET() {
  return errorResponse(405, {
    error: "Use POST with mode: dry_run.",
    code: "method_not_allowed",
    allowedMethods: ["POST"],
  })
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    if (user.role !== "OWNER") {
      return errorResponse(403, {
        error: "Agent operation dry-run is owner-only.",
        code: "not_owner_or_admin",
        nextAction: "Use an OWNER profile before calling the protected agent operation API.",
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: "Request body must be valid JSON.",
          code: "invalid_operation_or_input",
          nextAction: "Send application/json with operationId and mode: dry_run.",
        },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const result = await buildAgentOperationDryRun(body)
    return NextResponse.json(result.body, { status: result.status, headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, {
        error: "Authentication is required.",
        code: "unauthenticated",
        nextAction: "Sign in, or use explicit non-production mock auth for local owner dry-run.",
      })
    }

    return errorResponse(503, {
      error: "Agent operation route failed before dry-run proof could be built.",
      code: "agent_operation_route_failed",
      nextAction: "Check auth/database connectivity and rerun pnpm agent:api:check.",
    })
  }
}
