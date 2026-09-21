import "./load-local-env"

import { db as prisma } from "../src/lib/db"
import { parseTeamProfilesEnv } from "../src/lib/auth/team-profiles"

async function main() {
  const raw = process.env.PERSONAL_OS_TEAM_PROFILES

  if (!raw) {
    console.error(
      "PERSONAL_OS_TEAM_PROFILES is not set. Set it in .env.local as a comma-separated list of email:ROLE:Full Name entries.",
    )
    console.error(
      'Example: PERSONAL_OS_TEAM_PROFILES="owner@example.com:OWNER:Owner Name,partner@example.com:PARTNER:Partner Name"',
    )
    process.exit(1)
  }

  const entries = parseTeamProfilesEnv(raw)

  if (entries.length === 0) {
    console.error("PERSONAL_OS_TEAM_PROFILES parsed to zero entries.")
    process.exit(1)
  }

  console.log(`Provisioning ${entries.length} team profile(s)...`)

  for (const entry of entries) {
    const profile = await prisma.profile.upsert({
      where: { email: entry.email },
      update: {
        role: entry.role,
        ...(entry.fullName ? { fullName: entry.fullName } : {}),
      },
      create: {
        email: entry.email,
        fullName: entry.fullName,
        role: entry.role,
      },
    })

    console.log(`- ${profile.email} -> role=${profile.role} (id=${profile.id})`)
  }

  console.log("Done.")
  console.log(
    "Reminder: Profile rows alone do not grant magic-link/OTP login. Each email must also exist as a " +
      "Supabase Auth user (Supabase Dashboard -> Authentication -> Users -> Invite user) before magic-link " +
      "sign-in works, since signInWithOtp is called with shouldCreateUser: false. Google OAuth sign-in does " +
      "not need this manual invite: the callback route auto-provisions the Profile for any email listed in " +
      "PERSONAL_OS_TEAM_PROFILES on first Google login and rejects every other Google account.",
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
