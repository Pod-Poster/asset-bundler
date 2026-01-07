# SMOKETEST_LOG.md — Evidence Log — 2026-01-06_215935

## Latest run
- Date: 2026-01-07
- Status: PASS
- Ran by: Matt (local terminal, network enabled)

## Evidence summary
- Workflow run URL: https://github.com/Pod-Poster/asset-bundler/actions/runs/20771051383
- Workflow result: success (Image Processing Worker)
  - Run ID: 20771051383
  - Job: process-images (Job ID 59647211713)
- D1 job completion proof:
  ```
  id         | status    | error | completed_at
  job_test_1 | completed | null  | 2026-01-07 04:55:27
  ```
- R2 manifest download proof:
  ```
  wrangler r2 object get pod-poster-assets/bundles/dv_test/manifest.json --file=/tmp/manifest.json --remote
  Download complete.
  ```
- Manifest preview confirms expected outputs (shirt/sticker/hat):
  - generated_at: 2026-01-07T04:55:25.337Z
  - files: print/shirt.png, print/sticker.png, print/hat.png
- Signed URL download outcome: SUCCESS (workflow success + job completed with error=null)

---

## Full operator command log + outputs (verbatim excerpts)

### 1) Download test source image
Command:
```bash
curl -L -o /tmp/dv_test.png "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
```

Output:
```
100  219k  100  219k    0     0  2389k      0 --:--:-- --:--:-- --:--:-- 2383k
```

### 2) Upload test source to R2 (remote)

Initial attempt (failed due to wrong Cloudflare account):
```bash
wrangler r2 object put pod-poster-assets/sources/dv_test/original.png --file=/tmp/dv_test.png --remote
```

Output:
```
✘ [ERROR] Failed to fetch ... - 403: Forbidden)
```

Account check:
```bash
wrangler whoami
```

Output at the time:
- Logged in with OAuth token associated with `admin@browsium.com`

Re-auth:
```bash
wrangler logout
wrangler login
```

Final attempt (success):
```bash
wrangler r2 object put pod-poster-assets/sources/dv_test/original.png --file=/tmp/dv_test.png --remote
```

Output:
```
Upload complete.
```

### 3) Insert/reset test job in D1 (remote)

Attempts using `json('...')` failed with:
```
malformed JSON: SQLITE_ERROR [code: 7500]
```

Working insert (success — json_object(...)):
```bash
wrangler d1 execute pod-poster-db --remote --command "
INSERT INTO jobs (id,type,status,payload,created_at,updated_at,attempts,max_attempts,scheduled_at,priority)
VALUES (
  'job_test_1','IMAGE_PROCESS','pending',
  json_object(
    'design_version_id','dv_test',
    'source_key','sources/dv_test/original.png',
    'upload_prefix','bundles/dv_test'
  ),
  datetime('now'),datetime('now'),0,3,datetime('now'),0
)
ON CONFLICT(id) DO UPDATE SET
  status='pending',
  payload=excluded.payload,
  error=NULL,
  result=NULL,
  locked_by=NULL,
  locked_at=NULL,
  started_at=NULL,
  completed_at=NULL,
  attempts=0,
  max_attempts=3,
  scheduled_at=datetime('now'),
  updated_at=datetime('now');
"
```

Output:
```
🚣 Executed 1 command in 1.92ms
```

Verify job row:
```bash
wrangler d1 execute pod-poster-db --remote --command "SELECT id,type,status,payload FROM jobs WHERE id='job_test_1';"
```

Output:
```
┌────────────┬───────────────┬─────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ id         │ type          │ status  │ payload                                                                                                       │
├────────────┼───────────────┼─────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ job_test_1 │ IMAGE_PROCESS │ pending │ {"design_version_id":"dv_test","source_key":"sources/dv_test/original.png","upload_prefix":"bundles/dv_test"} │
└────────────┴───────────────┴─────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4) Trigger asset-bundler GitHub Actions workflow + wait for completion
Commands:
```bash
gh workflow run -R Pod-Poster/asset-bundler worker.yml --ref main
RUN_ID=$(gh run list -R Pod-Poster/asset-bundler --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch -R Pod-Poster/asset-bundler "$RUN_ID"
```

Output (success):
```
✓ Created workflow_dispatch event for worker.yml at main
✓ main Image Processing Worker · 20771051383
JOBS
✓ process-images in 17s (ID 59647211713)
✓ Run Image Processing Worker (20771051383) completed with 'success'
```

### 5) Confirm job completed in D1
Command:
```bash
wrangler d1 execute pod-poster-db --remote --command "SELECT id,status,error,completed_at FROM jobs WHERE id='job_test_1';"
```

Output:
```
┌────────────┬───────────┬───────┬─────────────────────┐
│ id         │ status    │ error │ completed_at        │
├────────────┼───────────┼───────┼─────────────────────┤
│ job_test_1 │ completed │ null  │ 2026-01-07 04:55:27 │
└────────────┴───────────┴───────┴─────────────────────┘
```

### 6) Download manifest from R2 and inspect it
Commands:
```bash
wrangler r2 object get pod-poster-assets/bundles/dv_test/manifest.json --file=/tmp/manifest.json --remote
head -n 30 /tmp/manifest.json
```

Output:
```
Download complete.
{
  "generated_at": "2026-01-07T04:55:25.337Z",
  "files": [
    {
      "file": "print/shirt.png",
      "width": 4500,
      "height": 5400,
      "size": 13373560
    },
    {
      "file": "print/sticker.png",
      "width": 2800,
      "height": 2800,
      "size": 6209410
    },
    {
      "file": "print/hat.png",
      "width": 2400,
      "height": 2400,
      "size": 4813693
    }
  ]
}
```

---

## Notes
- This smoke test requires real network access (wrangler + gh authenticated).
- Known pitfalls observed in this run:
  - R2 upload 403 when logged into the wrong Cloudflare account → fixed by re-auth (`wrangler logout` / `wrangler login`).
  - D1 insert failed with `json('...')` malformed JSON → fixed by using `json_object(...)`.
- With the evidence above recorded, **Task Group F is DONE** for asset-bundler.
