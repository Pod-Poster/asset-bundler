# Smoke Test Runbook - asset-bundler IMAGE_PROCESS

## Reset job_test_1 to pending
Run:
wrangler d1 execute pod-poster-db --remote --command "
UPDATE jobs
SET status='pending',
    error=NULL,
    result=NULL,
    locked_by=NULL,
    locked_at=NULL,
    started_at=NULL,
    completed_at=NULL,
    attempts=0,
    updated_at=datetime('now')
WHERE id='job_test_1';
"

## Trigger GitHub workflow
gh workflow run -R Pod-Poster/asset-bundler worker.yml

## View latest run log
RUN_ID=$(gh run list -R Pod-Poster/asset-bundler --limit 1 --json databaseId -q '.[0].databaseId')
gh run view -R Pod-Poster/asset-bundler "$RUN_ID" --log

## Verify job completed
wrangler d1 execute pod-poster-db --remote --command "
SELECT id, status, error, result
FROM jobs
WHERE id='job_test_1';
"

Expected:
- status = completed
- result JSON includes bundle_prefix and manifest

