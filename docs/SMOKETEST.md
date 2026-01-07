# SMOKETEST.md — V1 Pipeline Smoke Test — 2026-01-06_215935

## Preconditions
- Core deployed and has WORKER_TOKEN + SIGNING_KEY secrets set
- asset-bundler GH secrets set: CORE_BASE_URL, WORKER_TOKEN, R2 creds
- R2 bucket: pod-poster-assets exists

## Step 1: Upload a test source to R2
```bash
curl -L -o /tmp/dv_test.png "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png"
wrangler r2 object put pod-poster-assets/sources/dv_test/original.png --file=/tmp/dv_test.png --remote
```

## Step 2: Insert/reset test job in D1
```bash
wrangler d1 execute pod-poster-db --remote --command "
INSERT INTO jobs (id,type,status,payload,created_at,updated_at,attempts,max_attempts,scheduled_at,priority)
VALUES (
  'job_test_1','IMAGE_PROCESS','pending',
  json('{"design_version_id":"dv_test","source_key":"sources/dv_test/original.png","upload_prefix":"bundles/dv_test"}'),
  datetime('now'),datetime('now'),0,3,datetime('now'),0
)
ON CONFLICT(id) DO UPDATE SET
  status='pending', error=NULL, result=NULL, locked_by=NULL, locked_at=NULL, started_at=NULL, completed_at=NULL,
  attempts=0, max_attempts=3, scheduled_at=datetime('now'), updated_at=datetime('now');
"
```

## Step 3: Trigger asset-bundler workflow
```bash
gh workflow run -R Pod-Poster/asset-bundler worker.yml --ref main
RUN_ID=$(gh run list -R Pod-Poster/asset-bundler --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch -R Pod-Poster/asset-bundler "$RUN_ID"
```

## Step 4: Verify job completed
```bash
wrangler d1 execute pod-poster-db --remote --command "SELECT id,status,error,completed_at FROM jobs WHERE id='job_test_1';"
```

## Step 5: Verify bundle manifest exists in R2
```bash
wrangler r2 object get pod-poster-assets/bundles/dv_test/manifest.json --file=/tmp/manifest.json --remote
head -n 30 /tmp/manifest.json
```
