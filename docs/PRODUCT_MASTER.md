# PRODUCT_MASTER.md — Pod Poster (Authoritative) — 2026-01-06_215935

## 0) One-sentence definition
**Pod Poster is a private, invite-only POD operations system that lets a small team manage designs, generate compliant assets, publish/retire listings across marketplaces, and ingest sales data—using workers for automation and keeping assets private via signed URLs.**

This file is the top-level source of truth across all repos.

## 1) Repos and responsibilities (hard boundaries)
### pod-poster-core
Owns: auth, D1 system-of-record, jobs/locking, signed downloads, admin UI, reporting ingestion.
Must not: browser automation, heavy image processing.

### asset-bundler
Owns: IMAGE_PROCESS jobs only (download signed URL → generate assets → upload bundles → callback complete).
Must not: write to D1 directly.

### pod-poster-runner
Owns: Playwright browser automation jobs + connect UI + encrypted profiles.
Must not: image processing.

## 2) V1 scope (internal launch)
Must: TeePublic publish/retire/report sync (scaffold ok), asset generation pipeline, signed URLs, job observability, minimal onboarding.
Not required: Redbubble full automation, public SaaS, advanced analytics.

## 3) End-to-end UX (V1)
Invite → login → create design/version → upload source → enqueue IMAGE_PROCESS → bundle complete → create drop → enqueue publish jobs → runner publishes → import reports → dashboards → retire everywhere.

## 4) Core contracts (must not drift)
- Worker auth: X-WORKER-TOKEN; Runner auth: X-RUNNER-TOKEN.
- /jobs/next returns {success:true,data:[]} when empty; worker-friendly jobs return data as an array of job objects.
- /jobs/next CLAIMS/LOCKS a job (pending→running).
- Job eligibility: status=pending AND scheduled_at<=now AND attempts<max_attempts.
- /jobs/:id/complete expects {success, result|error}.

## 5) Signed URLs (security invariant)
- R2 is private (no public reads).
- Signed endpoint: GET /assets/download?key&exp&sig
- canonical: key=<key>&exp=<exp>
- sig: base64url(HMAC_SHA256(SIGNING_KEY, canonical))
- enforce max TTL (recommend 900s)
- restrict prefixes: sources/ (required), bundles/ (optional for runner)

## 6) V1 launch definition
Launchable when SMOKETEST passes and CODING_TASKS Task Groups A–F are DONE with evidence.
