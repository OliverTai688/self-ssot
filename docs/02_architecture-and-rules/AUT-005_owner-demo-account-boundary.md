# Owner / Demo Account Boundary

**Document ID:** `AUT-005`
**Status:** Active for `AUTH-MATURITY-001`
**Last updated:** 2026-06-21

## Purpose

Define the boundary between the seeded local demo account, development mock auth, and the real owner Supabase account required for private online use.

This document is a maturity artifact for `RES-001`. It does not change auth runtime behavior. It makes the current boundary testable through `pnpm auth:boundary` so future loops can prove what is demo-only, what is ready for signed-in proof, and what still blocks `AUTH-005`.

## Account Classes

| Account class | Purpose | Allowed environment | Proof |
|---|---|---|---|
| Seeded demo profile | Local/disposable Work demo data and local UI rehearsals | Local or disposable DB only | `prisma/seed.ts` plus `pnpm auth:boundary` |
| Development mock user | Explicit local mock auth path using `PERSONAL_OS_AUTH_MODE=mock` | Non-production only | `pnpm auth:boundary` reports effective auth mode `mock` and production guard present |
| Real owner account | Private online owner login and Work access | Preview/production-like Supabase target | `pnpm launch:proof`, signed-in `/auth/status`, and `pnpm auth:proof -- --status-json <file>` |

## Runtime Boundary

Current auth runtime remains:

```txt
request
  -> Supabase mode unless PERSONAL_OS_AUTH_MODE=mock and NODE_ENV is not production
  -> verified Supabase claims or explicit development mock profile
  -> Profile lookup by exact email
  -> requireUser()
  -> service-layer authorization
```

Rules:

- The demo profile is a seed contract, not a production owner proof.
- Mock auth is explicit and development-only.
- Production-like owner proof must use Supabase mode.
- `AUTH-005` must not run from this boundary proof alone. It requires signed-in `/auth/status` evidence summarized by `pnpm auth:proof`.
- The proof artifacts must not print Supabase URLs, keys, database URLs or hosts, cookies, tokens, raw auth claims, provider payloads, profile IDs, or actual profile email values.

## Command

Run a no-secret boundary proof:

```bash
pnpm auth:boundary
```

Write proof to a loop evidence path:

```bash
pnpm auth:boundary -- --out docs/2_agent-input/generated/agent-loop/reports/<proof-file>.json
```

Print the proof JSON while also writing the default output:

```bash
pnpm auth:boundary -- --json
```

## Proof Contract

`pnpm auth:boundary` writes JSON with:

| Field | Meaning |
|---|---|
| `sourceFiles` | Local files inspected for the boundary contract |
| `secretPolicy` | Values the proof must not print |
| `environmentSummary` | Safe auth/env mode classes and booleans |
| `contractChecks` | Static source-contract checks for seed, runtime mode, and production guard |
| `rows` | Human-readable check rows with status, signal, and next action |
| `proofSummary.boundaryStatus` | Whether the demo/mock boundary contract itself is coherent |
| `proofSummary.canUseLocalDemo` | Whether the current environment can safely use explicit local demo mode |
| `proofSummary.canCollectSignedInAuthProof` | Whether Supabase public env is present and signed-in `/auth/status` proof can be collected |
| `proofSummary.canRunAuth005` | Always false in this command because signed-in status proof is delegated to `pnpm auth:proof` |

## Acceptance

`AUTH-MATURITY-001` is complete when:

- `AUT-005` defines the owner/demo account classes.
- `pnpm auth:boundary` exists and writes no-secret JSON proof.
- The proof confirms mock auth requires explicit mode and is production-disabled.
- The proof confirms the seed demo profile and auth default dev user contract are aligned without printing the email value.
- The proof reports whether Supabase public env is present enough to collect signed-in auth evidence.
- `AUTH-005` remains blocked until `pnpm auth:proof -- --status-json <file>` reports `canRunAuth005=true`.

## Rejected Alternatives

- Treating the seeded demo profile as the owner account. Rejected because demo seed data and real owner auth proof have different safety meanings.
- Printing the profile email in generated proof. Rejected because loop evidence should avoid actual profile email values.
- Making `pnpm auth:boundary` read cookies or status endpoint payloads. Rejected because `pnpm auth:proof` already owns signed-in `/auth/status` evidence and sanitization.
- Auto-provisioning a `Profile` from Supabase claims. Rejected until real mapping proof and owner policy are reviewed.

## Related Files

- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `scripts/check-owner-account-boundary.mjs`
- `scripts/collect-auth-session-proof.mjs`
- `src/lib/services/auth.service.ts`
- `src/lib/auth/runtime.ts`
- `prisma/seed.ts`
