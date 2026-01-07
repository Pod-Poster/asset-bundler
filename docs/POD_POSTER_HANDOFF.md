# POD_POSTER_HANDOFF.md — Status & History — 2026-01-06_215935

## Task Group A: Signed URLs — Evidence Tracker

### A1: Signing helper in pod-poster-core
**Status:** BLOCKED — needs verification in pod-poster-core
**Evidence required:**
- [ ] File path in core repo implementing `signUrl()` or similar
- [ ] Uses HMAC-SHA256 with SIGNING_KEY secret
- [ ] Commit SHA or link confirming implementation

### A2: /assets/download validates signed URLs
**Status:** BLOCKED — needs verification in pod-poster-core
**Evidence required:**
- [ ] /assets/download route handler file path in core
- [ ] Rejects missing key/exp/sig with 400
- [ ] Rejects expired exp with 403
- [ ] Rejects invalid signature with 403
- [ ] Returns R2 object on valid signed URL

**Partial evidence from this repo:**
- Manual test confirmed `/assets/download` returns 400 on missing params (see "Verified working" below)

### A3: /jobs/next emits signed URL for IMAGE_PROCESS
**Status:** BLOCKED — needs verification in pod-poster-core
**Evidence required:**
- [ ] /jobs/next handler calls signing helper
- [ ] Response includes `source_download_url` with `?key=...&exp=...&sig=...`

**Evidence from this repo (asset-bundler consumer):**
- `src/worker.ts:40-59` — `assertSignedDownloadUrl()` validates signed URL format
- `src/worker.ts:118` — Worker calls assertion before downloading
- Worker successfully processes jobs (implies signed URLs are valid)

### A4: Legacy unsigned routes removed
**Status:** BLOCKED — needs verification in pod-poster-core
**Evidence required:**
- [ ] No direct R2 public URLs exposed
- [ ] No /assets/* routes that bypass signature validation
- [ ] Commit SHA or diff showing removal

---

## Verified working (from real runs)
- Core deployed at https://pod-poster-api.matt-87e.workers.dev
- /assets/download exists and enforces missing params (400)
- /jobs/next emits signed URLs for IMAGE_PROCESS (as implemented)
- asset-bundler can process IMAGE_PROCESS jobs end-to-end
- D1 job lifecycle: pending → running → completed
- R2 bundles manifest exists and includes expected files

## Common pitfall
- /jobs/next CLAIMS jobs; curling it for debugging can lock jobs and make GH worker say "No jobs".
- Plan: add /jobs/peek for non-locking inspection.

## Immediate next steps
- **PRIORITY:** Gather evidence for A1–A4 from pod-poster-core repo:
  1. Run in core: `grep -rn "signUrl\|SIGNING_KEY\|hmac" src/`
  2. Run in core: `grep -rn "assets/download" src/`
  3. Run in core: `grep -rn "source_download_url" src/`
  4. Document file paths and commit refs in this file under A1–A4
  5. Run smoke test and record pass in SMOKETEST_LOG.md
- Proceed to Task Group B (job observability) and Task Group D (runner)

---

## Manual Evidence Collection Required (2026-01-06)

**BLOCKED:** Cannot access pod-poster-core from this session (permission denied).

To unblock Task Group A, run the following commands in the **pod-poster-core** repo and record results above:

```bash
# A1: Find signing helper
grep -rn "signUrl\|SIGNING_KEY\|hmac\|crypto.subtle" src/

# A2: Find /assets/download handler
grep -rn "assets/download\|validateSignature\|exp.*sig" src/

# A3: Find source_download_url emission in /jobs/next
grep -rn "source_download_url\|jobs/next" src/

# A4: Confirm no legacy unsigned routes
grep -rn "assets/" src/routes/ 2>/dev/null || echo "Check routes manually"

# Get recent commits touching signed URL files
git log --oneline -5 -- src/
```

Once evidence is gathered, update the checkboxes in A1–A4 sections above and re-run:
```bash
CODEX_SANDBOX=1 ./scripts/verify.sh
```
