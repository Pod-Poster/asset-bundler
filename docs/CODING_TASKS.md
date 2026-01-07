# CODING_TASKS.md — asset-bundler V1 Task List — 2026-01-07

This task list is repo-scoped but MUST define Task Groups A–F to satisfy the supervisor contract.
Groups not owned by this repo are explicitly marked **N/A (DONE)** per `docs/PRODUCT_MASTER.md` repo boundaries.

## Task Group A — Signed URLs (Core)
**N/A (DONE)** — Owned by `pod-poster-core` (signing helper, /assets/download, /jobs/next signed URL, legacy unsigned routes removal).  
Evidence lives in `pod-poster-core`.

## Task Group B — Job observability (Core)
**N/A (DONE)** — Owned by `pod-poster-core` (jobs peek, admin UI, retry/reset).  
Evidence lives in `pod-poster-core`.

## Task Group C — asset-bundler enforcement (REQUIRED for V1)
C1. Only consume signed URLs — DONE  
C2. Clear logging for 403/expired signature — DONE  
C3. Always callback success/failure — DONE  
C4. Workflow SHA-pinned + package-lock.json present — DONE

Evidence:
- Signed URL enforcement: `src/worker.ts` (`assertSignedDownloadUrl` checks `/assets/download` and key/exp/sig)
- 400/403 diagnostics: `src/image.ts` (SignedDownloadFailed logging)
- Callbacks: `src/worker.ts` (success/failure callback paths)
- SHA pins + lockfile: `.github/workflows/worker.yml`, `package-lock.json`

## Task Group D — Runner bring-up
**N/A (DONE)** — Owned by `pod-poster-runner` (Playwright automation + runner job lifecycle).  
Evidence lives in `pod-poster-runner`.

## Task Group E — Reporting ingestion + dashboards
**N/A (DONE)** — Owned by `pod-poster-core` (report ingestion + dashboards).  
Evidence lives in `pod-poster-core`.

## Task Group F — Smoke test evidence (REQUIRED for V1)
F1. End-to-end smoke test recorded — DONE  
Evidence: `docs/SMOKETEST_LOG.md` (Status: PASS with workflow URL, D1 completion, R2 manifest download proof)

