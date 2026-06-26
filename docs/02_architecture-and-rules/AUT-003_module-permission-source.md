# Module Permission Source

**Document ID:** `AUT-003`
**Status:** Active for v0.1 launch hardening
**Last updated:** 2026-06-20

## Purpose

Define the v0.1 module permission read model so Personal OS can move away from silent browser-only module visibility while avoiding a risky permission write surface before audit and authorization rules are ready.

## Current Decision

Module visibility now uses a hybrid server snapshot:

```txt
authenticated Profile
  -> UserModulePermission rows for that profile
  -> role default baseline
  -> DB rows overlay enabled/disabled module keys
  -> UI-safe ModulePermissionSnapshot
  -> ModulePermissionsProvider initial state
```

The server snapshot is a launch-readiness and navigation/display contract. It is not a substitute for service-layer authorization on protected data.

## Source Precedence

| Source | Meaning | Behavior |
|---|---|---|
| `database` | The profile has one or more `UserModulePermission` rows | Start from role defaults, then overlay persisted enabled/disabled rows. |
| `role_default` | The profile has no permission rows | Use the default module list for the profile role. |
| `browser_override` | The browser changed role/modules in the rehearsal UI | Affects local navigation/module guard rehearsal only; does not persist or authorize data. |
| `unauthenticated` | No profile is mapped | Use the minimal client-role snapshot for safe settings fallback. |

Unknown persisted module keys are counted and ignored. They must be reviewed before treating persisted rows as production policy.

## Runtime Files

- `src/lib/services/module-permission.service.ts` is the server-only read model.
- `src/types/module-permission.ts` defines `ModulePermissionSnapshot` and source labels.
- `src/app/(dashboard)/layout.tsx` loads the snapshot after the authenticated profile is resolved.
- `src/lib/context/module-permissions-context.tsx` receives the server snapshot and allows browser-only rehearsal overrides.
- `src/app/(dashboard)/settings/page.tsx` and `settings-client.tsx` show the snapshot source, row counts, and override state.
- `src/lib/services/admin-readiness.service.ts` reports the same snapshot in the operator console.

## Database Contract

The existing Prisma model is sufficient for the read-model slice:

```txt
UserModulePermission
  profileId
  moduleKey
  isEnabled
  unique(profileId, moduleKey)
```

No Prisma schema change or migration is required for `AUTH-002`.

## UI Boundary

The settings and header controls may still rehearse role/module visibility in the browser. These controls are useful for operating-surface development, but they are explicitly not security controls.

Protected records still require:

```txt
server component / server action
  -> requireUser()
  -> service-layer authorization
  -> Prisma service
  -> UI-safe DTO
```

## Research Basis

- Local Next.js 16 authentication guide: authorization should be implemented near the data access layer; Proxy checks are optimistic only.
- Local Next.js 16 data security guide: new applications should prefer a data access layer that runs only on the server, performs authorization checks, and returns minimal DTOs.
- Local Next.js 16 backend-for-frontend guide: public endpoints must implement authentication and authorization and avoid sensitive error output.
- `AUT-002_auth-runtime-strategy.md`: `requireUser()` and service authorization remain the protected data boundary.
- `DBS-001_database-contract.md`: `Profile` and `UserModulePermission` already exist in the v0.1 schema.

## Rejected Alternatives

- Keep module visibility as localStorage-only: rejected because settings/admin would drift from the authenticated profile and hide launch risks.
- Treat Client Component module guards as security boundaries: rejected because browser state can be changed by the user.
- Add permission writes in the same loop: rejected because writes need input validation, audit records, and a clearer admin/member permission policy.
- Change Prisma schema: rejected because the existing model supports the needed read-model slice.

## Acceptance

- A server-only service returns a UI-safe `ModulePermissionSnapshot`.
- Dashboard layout initializes the module permission context from the authenticated profile.
- Settings shows the server source, DB row count, unknown row count, enabled count, and hidden count.
- Admin readiness reports the same module permission source.
- Browser rehearsal overrides are labeled `browser_override` and can be reset to the server snapshot.
- No permission write action, Prisma migration, seed change, public exposure, or high-risk module write is added in this slice.

## Follow-Up

- Add a reviewed permission write server action only after audit requirements and role policy are explicit.
- Seed owner permission rows once the desired production module matrix is approved.
- Add service-level module authorization checks for any future module that becomes DB-backed beyond Work.
