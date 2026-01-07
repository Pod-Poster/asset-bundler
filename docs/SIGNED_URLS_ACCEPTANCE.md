# SIGNED_URLS_ACCEPTANCE.md — Acceptance Criteria — 2026-01-06_215935

## Security checks
- SIGNING_KEY is a Wrangler secret (not committed)
- /assets/download rejects:
  - missing key/exp/sig (400)
  - invalid exp format (400)
  - expired exp (403)
  - invalid signature (403)
  - disallowed prefix (403)
- canonical string: key=<key>&exp=<exp>
- signature: base64url(HMAC_SHA256(SIGNING_KEY, canonical))
- max TTL enforced (<= 900s recommended)

## Functional checks
- /jobs/next emits signed URL for IMAGE_PROCESS
- signed URL downloads successfully (200)
- asset-bundler processes job using signed URL and completes it
- job result includes bundle_prefix and manifest; manifest exists in R2
