import type { UserRole } from "@prisma/client"

export const TEAM_PROFILE_ALLOWED_ROLES: UserRole[] = ["OWNER", "PARTNER", "CLIENT"]

export type TeamProfileEntry = {
  email: string
  role: UserRole
  fullName: string | null
}

/**
 * Env managers disagree about quoting. dotenv strips one wrapping pair of
 * quotes when reading `.env.local`; the Vercel dashboard stores whatever was
 * pasted, quotes included. Without this, a pasted
 * `"a@x.com:OWNER:A,b@y.com:OWNER:B"` parses into a first email of
 * `"a@x.com` that matches nobody and never throws — a login that fails with
 * no visible misconfiguration.
 */
function stripWrappingQuotes(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim()

  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]

    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim()
    }
  }

  return trimmed
}

/**
 * Parses `PERSONAL_OS_TEAM_PROFILES` (`email:ROLE:Full Name` entries, comma
 * separated). Shared by `scripts/provision-team-profiles.ts` and the runtime
 * Google OAuth allowlist so both read one source of truth. Throws on a
 * malformed entry so misconfiguration fails loudly during provisioning.
 */
export function parseTeamProfilesEnv(raw: string | undefined | null): TeamProfileEntry[] {
  const normalized = stripWrappingQuotes(raw)

  if (!normalized) {
    return []
  }

  return normalized
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [email, role, ...nameParts] = entry.split(":").map((part) => part.trim())

      if (!email || !email.includes("@")) {
        throw new Error(`Invalid email in PERSONAL_OS_TEAM_PROFILES entry: "${entry}"`)
      }

      const upperRole = (role ?? "").toUpperCase() as UserRole
      if (!TEAM_PROFILE_ALLOWED_ROLES.includes(upperRole)) {
        throw new Error(
          `Invalid role "${role}" for ${email}. Must be one of: ${TEAM_PROFILE_ALLOWED_ROLES.join(", ")}`,
        )
      }

      const fullName = nameParts.join(":").trim() || null

      return { email: email.toLowerCase(), role: upperRole, fullName }
    })
}

/**
 * Best-effort runtime read of `PERSONAL_OS_TEAM_PROFILES`. Unlike
 * `parseTeamProfilesEnv`, this never throws — a malformed env value must not
 * take down login for every user, so it logs and treats the list as empty.
 */
export function getConfiguredTeamProfiles(): TeamProfileEntry[] {
  try {
    return parseTeamProfilesEnv(process.env.PERSONAL_OS_TEAM_PROFILES)
  } catch (error) {
    console.warn("[auth] Failed to parse PERSONAL_OS_TEAM_PROFILES:", error)
    return []
  }
}

export function findTeamProfileEntry(email: string | null | undefined): TeamProfileEntry | null {
  if (!email) {
    return null
  }

  const normalized = email.trim().toLowerCase()
  return getConfiguredTeamProfiles().find((entry) => entry.email === normalized) ?? null
}
