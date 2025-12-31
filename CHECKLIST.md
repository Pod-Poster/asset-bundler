# Definition of Done (Repo Checklist)

## Build & Quality
- [x] `npm ci` succeeds
- [x] `npm run lint` passes (or is SKIP with justification)
- [x] `npm run typecheck` passes (or is SKIP with justification) - SKIP: No separate typecheck script; `tsc` runs during build
- [x] `npm test` passes (or is SKIP with justification) - SKIP: No tests required for v1

## Security
- [x] No committed secrets (.env, access keys, tokens)
- [x] Secrets are only referenced via env vars / bindings
- [x] Logs do not print secrets

## Spec compliance
- [x] Meets repo docs/V1_MASTER_SPEC.md (or equivalent spec doc)
- [x] Required endpoints / scripts / workflows exist per prompts/START_BUILD.txt
- [x] Required bindings/env templates exist (wrangler / GitHub / runner env)

## Ops readiness
- [x] `docs/` contains setup instructions and required env var list
- [x] Repo contains a repeatable verification script: `scripts/verify.sh`
