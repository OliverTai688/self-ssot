#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const WRONG_LOCAL_APP_MARKERS = [
  "\u8aa0\u554f AI",
  "\u8a66\u7528\u8a2d\u5b9a",
  "asai-rag",
]

const PROFILES = {
  "admin-overview": {
    path: "/admin",
    requiredMarkers: ["Personal OS", "Overview mode", "Admin write boundary", "Full details"],
    forbiddenMarkers: WRONG_LOCAL_APP_MARKERS,
    allowRedirect: false,
  },
  "admin-detail": {
    path: "/admin/detail",
    requiredMarkers: ["Personal OS", "Admin write boundary", "Full launch console detail", "Overview"],
    forbiddenMarkers: WRONG_LOCAL_APP_MARKERS,
    allowRedirect: false,
  },
  frontstage: {
    path: "/",
    requiredMarkers: ["Personal OS"],
    forbiddenMarkers: WRONG_LOCAL_APP_MARKERS,
    allowRedirect: false,
  },
}

function parseArgs(argv) {
  const args = {
    profile: "admin-overview",
    url: null,
    json: false,
    out: null,
    timeoutMs: 120000,
    requiredMarkers: [],
    forbiddenMarkers: [],
    allowRedirect: false,
  }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--allow-redirect") {
      args.allowRedirect = true
      continue
    }
    if (arg === "--profile") {
      args.profile = readValue(filtered, index, arg)
      index += 1
      continue
    }
    if (arg === "--url") {
      args.url = readValue(filtered, index, arg)
      index += 1
      continue
    }
    if (arg === "--out") {
      args.out = readValue(filtered, index, arg)
      index += 1
      continue
    }
    if (arg === "--timeout-ms") {
      args.timeoutMs = Number.parseInt(readValue(filtered, index, arg), 10)
      index += 1
      continue
    }
    if (arg === "--require") {
      args.requiredMarkers.push(readValue(filtered, index, arg))
      index += 1
      continue
    }
    if (arg === "--forbid") {
      args.forbiddenMarkers.push(readValue(filtered, index, arg))
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: pnpm route:identity:check [--url <url>] [--profile admin-overview|admin-detail|frontstage] [--require <marker>] [--forbid <marker>] [--allow-redirect] [--timeout-ms <ms>] [--json] [--out <path>]",
      )
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function readValue(argv, index, label) {
  const value = argv[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${label} requires a value`)
  }
  return value
}

function safeUrlLabel(input) {
  try {
    const url = new URL(input)
    const allowedQuery = []
    if (url.searchParams.get("detail") === "all") {
      allowedQuery.push("detail=all")
    }
    const query = allowedQuery.length > 0 ? `?${allowedQuery.join("&")}` : ""
    const redactedQuery = url.search && allowedQuery.length === 0 ? "?[redacted-query]" : query
    return `${url.origin}${url.pathname}${redactedQuery}`
  } catch {
    return "[invalid-url]"
  }
}

function markerResults(markers, body) {
  return markers.map((marker) => ({
    marker,
    present: body.includes(marker),
  }))
}

function classify({ response, requiredResults, forbiddenResults, allowRedirect }) {
  const missingRequired = requiredResults.filter((result) => !result.present)
  const presentForbidden = forbiddenResults.filter((result) => result.present)
  const redirected = response.status >= 300 && response.status < 400

  if (presentForbidden.length > 0) {
    return {
      status: "route_identity_mismatch",
      exitCode: 1,
      nextAction: "Use the correct Personal OS dev server/port before interpreting route, auth, admin, or Work proof output.",
    }
  }

  if (redirected && !allowRedirect) {
    return {
      status: "route_redirected_not_verified",
      exitCode: 1,
      nextAction:
        "Run this check against an authenticated or explicit mock-auth dev server, or use --allow-redirect only for auth-boundary checks.",
    }
  }

  if (!response.ok && !(redirected && allowRedirect)) {
    return {
      status: "route_unavailable",
      exitCode: 1,
      nextAction: "Start the Personal OS dev server on the expected port, then rerun the route identity check.",
    }
  }

  if (missingRequired.length > 0) {
    return {
      status: "route_identity_unverified",
      exitCode: 1,
      nextAction: "Check the route profile, auth mode, and port; required Personal OS markers were missing.",
    }
  }

  return {
    status: redirected ? "route_redirect_allowed" : "personal_os_route_verified",
    exitCode: 0,
    nextAction: "Route identity verified. It is safe to interpret this route smoke output as Personal OS evidence.",
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const profile = PROFILES[args.profile]
  if (!profile) {
    throw new Error(`Unknown profile: ${args.profile}`)
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer")
  }

  const requiredMarkers = [...profile.requiredMarkers, ...args.requiredMarkers]
  const forbiddenMarkers = [...profile.forbiddenMarkers, ...args.forbiddenMarkers]
  const allowRedirect = args.allowRedirect || profile.allowRedirect
  const targetUrl = args.url ?? `http://localhost:3100${profile.path}`
  let response = null
  let body = ""
  let fetchError = null
  let bodyError = null

  try {
    response = await fetch(targetUrl, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(args.timeoutMs),
    })
  } catch (error) {
    fetchError = error
  }

  if (response) {
    try {
    body = await response.text()
  } catch (error) {
      bodyError = error
    }
  }

  const requiredResults = markerResults(requiredMarkers, body)
  const forbiddenResults = markerResults(forbiddenMarkers, body)
  const classification = fetchError
    ? {
        status: "route_unreachable",
        exitCode: 1,
        nextAction: "Start the Personal OS dev server on the expected port, then rerun the route identity check.",
      }
    : bodyError
      ? {
          status: "route_body_timeout",
          exitCode: 1,
          nextAction:
            "The route returned a status but the response body was not fully readable before timeout; warm the route or increase --timeout-ms before trusting marker evidence.",
        }
    : classify({ response, requiredResults, forbiddenResults, allowRedirect })

  const payload = {
    id: "ENV-005-LOCAL-ROUTE-IDENTITY-SMOKE",
    status: classification.status,
    generatedAt: new Date().toISOString(),
    profile: args.profile,
    url: safeUrlLabel(targetUrl),
    expectedPath: profile.path,
    httpStatus: response?.status ?? null,
    redirected: response ? response.status >= 300 && response.status < 400 : false,
    requiredMarkers: requiredResults,
    forbiddenMarkers: forbiddenResults,
    responseBodyBytes: Buffer.byteLength(body, "utf8"),
    timeoutMs: args.timeoutMs,
    safety: {
      printsSecrets: false,
      sendsCookies: false,
      followsRedirects: false,
      writesDatabase: false,
      mutatesAuthProvider: false,
      mutatesDeploymentProvider: false,
      exposesRawHtml: false,
      launchLevelUpgradeClaimed: false,
    },
    blockedClaims: [
      "AUTH-005 success",
      "WORK-009 success",
      "WORK-007 success",
      "DEPLOY-002 success",
      "L1 launch upgrade",
      "L3 launch upgrade",
      "L4 launch upgrade",
    ],
    nextAction: classification.nextAction,
    errors: fetchError
      ? [`Fetch failed for ${safeUrlLabel(targetUrl)}: ${fetchError.name ?? "Error"}`]
      : bodyError
        ? [`Body read failed for ${safeUrlLabel(targetUrl)}: ${bodyError.name ?? "Error"}`]
        : requiredResults.filter((result) => !result.present).map((result) => `Missing required marker: ${result.marker}`),
    warnings: forbiddenResults.filter((result) => result.present).map((result) => `Forbidden marker present: ${result.marker}`),
  }

  if (args.out) {
    const outPath = path.join(ROOT, args.out)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    console.log(`ENV-005 local route identity: ${payload.status}`)
    console.log(`URL: ${payload.url}`)
    console.log(`HTTP status: ${payload.httpStatus ?? "unreachable"}`)
    for (const error of payload.errors) {
      console.error(`- ${error}`)
    }
    for (const warning of payload.warnings) {
      console.error(`- ${warning}`)
    }
  }

  process.exit(classification.exitCode)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
