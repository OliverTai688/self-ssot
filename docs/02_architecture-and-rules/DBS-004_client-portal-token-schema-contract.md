# Client Portal Token Schema Contract

**Document ID:** `DBS-004`
**Last updated:** 2026-06-21
**Status:** Proposal only
**Related task:** `CLIENT-004`

## Purpose

Client Portal share links are public capability URLs. The current gated loader is public-safe because it fails closed by default, filters persisted Work records by visibility, and does not render mock data. The remaining launch risk is token storage and lifecycle: `Project.clientToken` is nullable plain text and has no reviewed hash, selector, key id, revoke/rotate metadata, access audit relation, or migration plan.

This contract defines the schema and hashing pattern that must be approved before `CLIENT-005` implements token generation, rotation, revoke, or owner share-link actions.

## Current State

- Public route: `/client/[token]`.
- Public rendering gate: `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB === "1"`.
- Current lookup: `Project.clientToken` plus `Project.visibility = CLIENT_VISIBLE`.
- Current storage risk: token value is stored as plain text in `projects.client_token`.
- Current fail-closed guard: disabled, invalid, missing, duplicate, and unavailable states render the same noindex unavailable boundary.
- Current public DTO excludes internal IDs, notes, file URLs, raw Prisma rows, owner/profile IDs, and `clientToken`.

## Research Basis

Local sources reviewed:

- `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `src/lib/services/client-portal.service.ts`
- `src/lib/services/client-portal-readiness.service.ts`
- `prisma/schema.prisma`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-13-20260620-client-portal-bff.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-17-20260620-client-portal-readiness-contract.md`

External primary/security references reviewed:

- OWASP Forgot Password Cheat Sheet: URL token guidance says generated tokens should be cryptographically random, long enough, stored securely, single-use where appropriate, and expire after an appropriate period.
- OWASP Web Security Testing Guide, weak password reset testing: plaintext reset tokens in a database can be replayed after DB compromise; a safer pattern stores a hashed token and compares the hash during validation.
- OWASP Session Management Cheat Sheet: identifiers need high entropy, cryptographically secure randomness, and meaningless values that do not reveal application data.
- Node.js `node:crypto` docs: use `randomBytes` for random bytes, `createHmac` for HMAC digests, and `timingSafeEqual` for constant-time byte comparison where surrounding code is also designed carefully.
- Prisma and PostgreSQL docs: unique constraints/indexes enforce uniqueness; PostgreSQL allows multiple `NULL` values in a unique column by default, which matters when replacing nullable `Project.clientToken`.

Source links:

- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/09-Testing_for_Weak_Password_Change_or_Reset_Functionalities
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://nodejs.org/api/crypto.html
- https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes
- https://www.prisma.io/docs/orm/reference/prisma-schema-reference
- https://www.postgresql.org/docs/current/indexes-unique.html

## Selected Pattern

Use a selector/verifier token with keyed hashing:

```txt
public token = posc_<selector>_<verifier>

selector = random non-secret lookup handle
verifier = high-entropy random secret shown only in the URL once
stored digest = HMAC-SHA256("client-portal:v1:" + selector + ":" + verifier, active key)
```

The public route must parse the token, query by selector only, compute the HMAC digest with the row's `hashKeyId`, and compare stored and computed digests using a constant-time byte comparison. The raw verifier must never be stored, logged, rendered, added to evidence reports, or returned in admin/settings readiness contracts.

Recommended v0.1 token shape:

| Piece | Contract |
|---|---|
| Prefix | Literal `posc` for Personal OS Client Portal tokens. |
| Selector | 12 to 18 base64url chars from CSPRNG bytes; used for indexed DB lookup; not treated as secret. |
| Verifier | 32 random bytes encoded base64url, usually 43 chars; treated as secret. |
| Full URL token | `posc_<selector>_<verifier>`. |
| Token validator | Strict allowlist for prefix, separator, selector length/chars, verifier length/chars. |
| Hash | HMAC-SHA256 over a versioned context string, selector, and verifier. |
| Key id | Stored with each row so future key rotation can verify old active rows during a controlled rotation window. |

Rejected alternatives:

- Keep storing `Project.clientToken` as plain text.
- Use a predictable or human-readable project/client slug as token material.
- Store only a hash without a selector, forcing full-table scans or leaking lookup timing.
- Use reversible encryption for the token value.
- Put project IDs, owner IDs, client names, or visibility state inside the token.
- Use self-contained signed tokens that remain valid after DB revoke unless extra state is checked.
- Enable public file URL rendering in the same migration.

## Proposed Prisma Shape

This is a proposal. Do not apply it to a valuable database without migration review and explicit approval.

```prisma
enum ClientPortalShareTokenStatus {
  ACTIVE
  ROTATED
  REVOKED
  EXPIRED

  @@map("client_portal_share_token_status")
}

enum ClientPortalAccessEventType {
  TOKEN_ACCEPTED
  TOKEN_REJECTED
  TOKEN_REVOKED
  TOKEN_ROTATED

  @@map("client_portal_access_event_type")
}

model ClientPortalShareToken {
  id              String                       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId       String                       @map("project_id") @db.Uuid
  project         Project                      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  selector        String                       @unique @db.VarChar(24)
  verifierHash    String                       @map("verifier_hash") @db.VarChar(64)
  hashKeyId       String                       @map("hash_key_id") @db.VarChar(32)
  status          ClientPortalShareTokenStatus @default(ACTIVE)
  label           String?
  createdById     String?                      @map("created_by_id") @db.Uuid
  revokedById     String?                      @map("revoked_by_id") @db.Uuid
  rotatedFromId   String?                      @map("rotated_from_id") @db.Uuid
  expiresAt       DateTime?                    @map("expires_at")
  lastAccessedAt  DateTime?                    @map("last_accessed_at")
  rotatedAt       DateTime?                    @map("rotated_at")
  revokedAt       DateTime?                    @map("revoked_at")
  createdAt       DateTime                     @default(now()) @map("created_at")
  updatedAt       DateTime                     @updatedAt @map("updated_at")

  accessEvents    ClientPortalAccessEvent[]

  @@index([projectId, status], map: "client_portal_share_tokens_project_status_idx")
  @@index([projectId, createdAt], map: "client_portal_share_tokens_project_created_idx")
  @@index([selector, status], map: "client_portal_share_tokens_selector_status_idx")
  @@map("client_portal_share_tokens")
}

model ClientPortalAccessEvent {
  id            String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String                    @map("project_id") @db.Uuid
  project       Project                   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  shareTokenId  String?                   @map("share_token_id") @db.Uuid
  shareToken    ClientPortalShareToken?   @relation(fields: [shareTokenId], references: [id], onDelete: SetNull)
  eventType     ClientPortalAccessEventType @map("event_type")
  selector      String?                   @db.VarChar(24)
  result        String                    @db.VarChar(32)
  ipHash        String?                   @map("ip_hash") @db.VarChar(64)
  userAgentHash String?                   @map("user_agent_hash") @db.VarChar(64)
  occurredAt    DateTime                  @default(now()) @map("occurred_at")

  @@index([projectId, occurredAt], map: "client_portal_access_events_project_time_idx")
  @@index([shareTokenId, occurredAt], map: "client_portal_access_events_token_time_idx")
  @@map("client_portal_access_events")
}
```

The `Project` relation would need matching relation fields:

```prisma
clientPortalShareTokens ClientPortalShareToken[]
clientPortalAccessEvents ClientPortalAccessEvent[]
```

`Project.clientToken` should become legacy-only during migration and then be removed or left unused after all owners rotate to hashed token rows.

## Unique And Index Behavior

Required:

- `ClientPortalShareToken.selector` is unique and required.
- `ClientPortalShareToken.verifierHash` should be unique if the generated digest is stored as a standalone column; collisions are operationally impossible with CSPRNG plus HMAC, but a unique constraint catches bugs and duplicate seeding.
- Lookup path uses `selector` first, then constant-time digest comparison.
- Public render still checks `Project.visibility = CLIENT_VISIBLE` and nested task/deliverable visibility before DTO mapping.
- Public render still treats duplicate, missing, revoked, expired, rotated, invalid, disabled, and unavailable states as one fail-closed unavailable/noindex response.

Optional but recommended:

- Add a PostgreSQL partial unique index to enforce one active token per project:

```sql
CREATE UNIQUE INDEX client_portal_share_tokens_one_active_per_project_idx
ON client_portal_share_tokens (project_id)
WHERE status = 'ACTIVE';
```

Because project tooling has not yet adopted partial-index schema conventions, this should be reviewed as migration SQL rather than silently added in a normal loop.

## Validation Flow

```txt
/client/[token]
  -> connection()
  -> parse token as posc_<selector>_<verifier>
  -> if invalid shape: fail closed
  -> find token row by selector with project visibility data
  -> if not exactly one active row: fail closed
  -> if revokedAt/rotatedAt/expiresAt make token inactive: fail closed
  -> compute HMAC using row.hashKeyId
  -> timing-safe compare computed digest to verifierHash
  -> if mismatch: fail closed
  -> project visibility must be CLIENT_VISIBLE
  -> tasks/deliverables filtered to CLIENT_VISIBLE
  -> map narrow public DTO
  -> append access event without raw token, verifier, URL, internal IDs, or private content
```

The append-only access event can be delayed until `CLIENT-005` or a dedicated audit task. If access logging is not implemented in the first runtime pass, the protected readiness contract must continue to label audit persistence incomplete.

## Lifecycle Rules

- Generate: owner action only, behind `requireUser()` and project ownership checks.
- Display: show the full raw token only once immediately after generation or rotation.
- Store: never store raw verifier; store selector, HMAC digest, key id, status, metadata.
- Rotate: create a new token row and mark previous active token rows as `ROTATED` in one service-layer transaction.
- Revoke: mark active token row as `REVOKED`; public route must fail closed immediately after revoke.
- Expire: optional for v0.1 private launch; if added, expiration must be checked server-side and hidden from public failure output.
- Last access: update `lastAccessedAt` only after successful validation, without storing request secrets.
- Audit: store event type, project relation, optional token relation, selector, result, and hashed IP/user-agent only if retention policy is approved.

## Migration And Backfill Plan

Phase A: reviewed migration proposal

- Add enum(s), `ClientPortalShareToken`, `ClientPortalAccessEvent`, relation fields, and indexes.
- Keep `Project.clientToken` in place but mark it legacy in docs/code comments.
- Do not enable public rendering solely because the schema exists.

Phase B: application write path

- Add owner-only generate/rotate/revoke actions in `CLIENT-005`.
- Require `requireUser()` and project ownership checks.
- Add confirmation copy that public output is still limited to client-visible project/task/deliverable DTOs.
- Continue to hide raw tokens from admin/settings readiness reports.

Phase C: legacy token handling

- Do not keep low-entropy legacy values such as human-readable `tok-*` examples as production tokens.
- Preferred path: force rotation and generate new high-entropy hashed token rows.
- If a valuable environment contains real high-entropy legacy tokens, any one-time conversion must run as a reviewed script that hashes existing values, stores key id/selector safely, and deletes or nulls legacy `Project.clientToken` afterward.

Phase D: public loader switch

- Update `getClientPortalViewByToken()` from `Project.clientToken` lookup to selector/hash lookup.
- Keep `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB` gate.
- Keep fail-closed noindex output for all non-ready states.
- Run `CLIENT-007` against a reachable Supabase/disposable DB before sharing any real client link.

## Acceptance For CLIENT-004

- This contract exists as `DBS-004`.
- `ARC-025` points to `DBS-004` as the token schema/hash source of truth.
- Protected admin/settings readiness can report that token hash/index/audit strategy has a proposal, while implementation is still pending.
- No Prisma schema change, migration apply, seed change, token lifecycle write action, public output expansion, public storage rendering, or production DB mutation is performed.
- `CLIENT-005` remains blocked until this proposal is accepted and a safe DB/migration target is available.

## Remaining Decisions

- Whether v0.1 should allow one active client token per project or multiple labeled active links per project.
- Whether token expiration is mandatory for private launch or optional with manual revoke.
- Which secret manager owns `CLIENT_PORTAL_TOKEN_HASH_KEY_<id>` and the active `CLIENT_PORTAL_TOKEN_HASH_KEY_ID`.
- Retention period for access events and whether IP/user-agent hashes are necessary for private launch.
