import type { UserRole } from "@prisma/client"

export const TEAM_PROFILE_ALLOWED_ROLES: UserRole[] = ["OWNER", "PARTNER", "CLIENT"]

export type TeamProfileEntry = {
  email: string
  role: UserRole
  fullName: string | null
}

/**
 * Parses `PERSONAL_OS_TEAM_PROFILES` (`email:ROLE:Full Name` entries, comma
 * separated). Shared by `scripts/provision-team-profiles.ts` and the runtime
 * Google OAuth allowlist so both read one source of truth. Throws on a
 * malformed entry so misconfiguration fails loudly during provisioning.
 */
export function parseTeamProfilesEnv(raw: string | undefined | null): TeamProfileEntry[] {
  if (!raw) {
    return []
  }

  return raw
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
