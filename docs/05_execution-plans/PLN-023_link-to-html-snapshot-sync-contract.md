# D-PLAN-014: Link-to-Static-HTML Snapshot Sync Contract

**Task:** DATTR-007
**Date:** 2026-06-09
**Status:** DONE — contract reference; no fetch runtime in this pass

---

## Purpose

Define how a captured `LINK` asset becomes a fetched `WEB_PAGE` asset through an audited `SourceFetchRun`. The contract covers: when fetching is triggered, what is stored, how snapshots are versioned, what robots/TOS constraints apply, and how the fetch pipeline interacts with the `SourceAsset`, `SourceAssetSnapshot`, and `AssetExtraction` tables.

No JS rendering, no headless browser, and no crawling runtime are in scope for v0.1.

---

## 1. Trigger Conditions

A `LINK` asset enters the fetch pipeline when **all** of the following are true:

| Condition | Description |
|---|---|
| `snapshotIntent != "MANUAL"` | Asset owner has not explicitly opted out of auto-fetch |
| `fetchStatus = "pending"` | Has not been fetched yet (or needs re-fetch after TTL expiry) |
| `scheme = "https"` | HTTP-only URLs require manual override |
| `robotsAllowed = true` | robots.txt check passed (see Section 3) |
| `isKnownShortUrl = false` | Short URLs must be expanded first (see Section 4) |
| `payloadSize < 10MB` | Response body does not exceed the raw HTML storage limit |

Fetch is **not** triggered for:

- URLs with scheme `ftp`, `mailto`, `tel`, `javascript`, `data`
- Localhost, RFC1918 private IP ranges, or `.local` hostnames (SSRF prevention — see D-POLICY-001)
- URLs that previously returned `BLOCKED_BY_ROBOTS` or `FAILED` without retry policy
- URLs in the user's explicit denylist

---

## 2. Fetch Run Record (SourceFetchRun)

Each fetch attempt is recorded as a `SourceFetchRun`. This is the audit trail for every HTTP request made by the system.

```prisma
// Proposed — do not migrate until AUTH-001 + DATTR-002 Prisma addition approved
model SourceFetchRun {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sourceAssetId     String   @db.Uuid  @map("source_asset_id")   // LINK SourceAsset
  ownerId           String   @db.Uuid  @map("owner_id")
  requestedUrl      String             @map("requested_url")
  finalUrl          String?            @map("final_url")          // after redirects
  httpStatus        Int?               @map("http_status")
  contentType       String?            @map("content_type")
  contentLengthBytes Int?              @map("content_length_bytes")
  robotsStatus      String             @map("robots_status")
  // STATUSES: "allowed", "disallowed", "no_robots_txt", "fetch_error", "skipped"
  fetchStatus       String             @map("fetch_status")
  // STATUSES: "pending", "running", "completed", "failed", "blocked_by_robots",
  //           "skipped", "timeout", "size_exceeded"
  errorSummary      String?            @map("error_summary")
  snapshotCreated   Boolean @default(false) @map("snapshot_created")
  webPageAssetId    String?  @db.Uuid  @map("web_page_asset_id") // created WEB_PAGE SourceAsset
  fetchedAt         DateTime?          @map("fetched_at")
  createdAt         DateTime @default(now()) @map("created_at")
}
```

---

## 3. robots.txt Enforcement

Before sending any HTTP request, the fetch runner must check the robots.txt for the target host:

```txt
1. Parse host from the requested URL
2. Fetch https://{host}/robots.txt with a 5-second timeout
3. Check whether the user-agent ("*" or our agent name) is allowed to access the path
4. If disallowed: set robotsStatus = "disallowed", fetchStatus = "blocked_by_robots", stop
5. If robots.txt fetch fails (network error, 404, 5xx): set robotsStatus = "no_robots_txt", proceed
6. Cache robots.txt result per host for 24 hours to avoid repeated HEAD requests
```

Additionally check `<meta name="robots">` in the fetched HTML for `noarchive` — if present, store the HTML snapshot only in user-local storage (not in shared or cloud-synced storage).

---

## 4. Short URL Expansion

Before fetching, check whether the host is a known URL shortener:

**Known shorteners:** `bit.ly`, `t.co`, `tinyurl.com`, `ow.ly`, `buff.ly`, `rebrand.ly`, `short.io`, `tiny.cc`, `is.gd`, `goo.gl`, `youtu.be`

If the host matches:
1. Send a HEAD request to the short URL
2. Follow all redirects (up to 5 hops)
3. Record the final expanded URL as `finalUrl`
4. Update `LINK.stableId` if it was set to the short URL
5. Proceed with fetching `finalUrl`

If redirect depth exceeds 5, set `fetchStatus = "failed"`, `errorSummary = "redirect loop"`.

---

## 5. Fetch Execution

```txt
1. Send GET request with:
   - User-Agent: "PersonalOS-Fetch/1.0 (+https://personalos.internal/botpolicy)"
   - Accept: text/html,application/xhtml+xml,*/*
   - Accept-Language: zh-TW,zh;q=0.9,en;q=0.8
   - Max redirects: 5
   - Timeout: 15 seconds
2. Record: requestedUrl, finalUrl, httpStatus, contentType, contentLengthBytes
3. If httpStatus >= 400: set fetchStatus = "failed", errorSummary = "HTTP {status}"
4. If contentLengthBytes > 10MB: set fetchStatus = "size_exceeded", stop
5. If contentType does not start with "text/html" or "application/xhtml": 
   - Store as binary asset instead (treat as LINK with unresolved WEB_PAGE; flag for manual review)
6. Read body up to 10MB (truncate if streaming source exceeds limit)
7. Compute SHA-256 of body → contentHash
```

---

## 6. Snapshot Storage

If the fetch succeeds (httpStatus 2xx, valid HTML):

1. Create a `SourceAsset` of `assetKind = "WEB_PAGE"` with all fields from D-PLAN-013 Section 4.
2. Create a `SourceAssetSnapshot`:
   ```
   SourceAssetSnapshot {
     sourceAssetId: <WEB_PAGE asset id>,
     revisionId: ETag header if present,
     contentHash: SHA-256 of raw body,
     snapshotRef: storage path or null (in-DB for small pages, object store for large),
     fetchedUrl: finalUrl,
     httpStatus: httpStatus,
     snapshotAt: fetched_at timestamp
   }
   ```
3. Update the original `LINK` asset:
   ```
   LINK.fetchStatus = "fetched"
   LINK.relatedWebPageAssetId = <WEB_PAGE asset id>
   ```
4. Update the `SourceFetchRun`:
   ```
   fetchRun.snapshotCreated = true
   fetchRun.webPageAssetId = <WEB_PAGE asset id>
   ```
5. Queue a `READABILITY` extraction run on the new `WEB_PAGE` asset.

---

## 7. Change Detection and Re-fetch

For links with `snapshotIntent = "PERIODIC"`, re-fetch is scheduled based on the last snapshot:

| Domain type | Re-fetch cadence |
|---|---|
| News / blog | Daily |
| Research / academic | Weekly |
| Reference / wiki | Weekly |
| Unknown | Weekly |
| noarchive pages | Never (manual only) |

Change detection:
1. Compare new `contentHash` with the previous `SourceAssetSnapshot.contentHash`
2. If different: create a new `SourceAssetSnapshot`; trigger a fresh `READABILITY` extraction
3. If same: update `lastCheckedAt` only; do not create a new snapshot

---

## 8. WEB_PAGE Asset Lifecycle

```txt
LINK asset (fetchStatus: "pending")
  -> SourceFetchRun (fetchStatus: "running")
  -> [robots check]
  -> [short URL expansion]
  -> [GET request]
  -> WEB_PAGE SourceAsset (workflowState: "INBOX")
  -> SourceAssetSnapshot (first snapshot)
  -> AssetExtraction (READABILITY)
  -> NormalizedContent (readability text → normalized body)
  -> Evidence (keyed passages)
  -> Proposal (module write intent candidate)
```

---

## 9. Storage and Privacy

- Raw HTML bodies are stored only in user-controlled storage (no third-party cloud sync of raw content).
- `noarchive` pages: do not store raw HTML; store only extracted readability text if user consents.
- EXIF or embedded PII in HTML pages (e.g., `<meta name="author">` with full name): record in attributes, but do not index for external search.
- `SourceFetchRun` logs are visible to the user in the Records / Audit view; agents may not access them directly.
- Fetch runner must never follow redirects to RFC1918 addresses (SSRF prevention).

---

## 10. Error Handling

| Condition | fetchStatus | Retry |
|---|---|---|
| DNS resolution failure | `failed` | Retry once after 1 hour |
| TCP timeout | `timeout` | Retry once immediately |
| HTTP 429 Too Many Requests | `failed` | Retry after `Retry-After` header; max 3 attempts |
| HTTP 5xx | `failed` | Retry once after 30 min |
| HTTP 4xx (not 429) | `failed` | No retry |
| Redirect loop (> 5 hops) | `failed` | No retry |
| Body > 10MB | `size_exceeded` | No retry (flag for manual review) |
| robots disallowed | `blocked_by_robots` | No retry unless user overrides |

---

## Acceptance Criteria

- [x] Trigger conditions documented (fetch guard rules)
- [x] SourceFetchRun Prisma model proposed
- [x] robots.txt enforcement procedure (check, cache, noarchive handling)
- [x] Short URL expansion procedure (known shorteners list, redirect cap)
- [x] Fetch execution spec (User-Agent, redirect limit, timeout, size limit)
- [x] Snapshot storage procedure (WEB_PAGE asset + SourceAssetSnapshot creation)
- [x] Change detection and re-fetch cadence
- [x] WEB_PAGE asset lifecycle pipeline
- [x] Storage and privacy constraints
- [x] Error handling table with retry policies
- [ ] SourceFetchRun added to schema.prisma (follow-on after DATTR-002 Prisma addition)
- [ ] Fetch runner service implemented (follow-on after AUTH-001 + Supabase connectivity)
