# Definition of Done (Repo Checklist)

## Build & Quality
- [ ] `npm ci` succeeds
- [ ] `npm run lint` passes (or is SKIP with justification)
- [ ] `npm run typecheck` passes (or is SKIP with justification)
- [ ] `npm test` passes (or is SKIP with justification)

## Security
- [ ] No committed secrets (.env, access keys, tokens)
- [ ] Secrets are only referenced via env vars / bindings
- [ ] Logs do not print secrets

## Spec compliance
- [ ] Meets repo docs/V1_MASTER_SPEC.md (or equivalent spec doc)
- [ ] Required endpoints / scripts / workflows exist per prompts/START_BUILD.txt
- [ ] Required bindings/env templates exist (wrangler / GitHub / runner env)

## Ops readiness
- [ ] `docs/` contains setup instructions and required env var list
- [ ] Repo contains a repeatable verification script: `scripts/verify.sh`
