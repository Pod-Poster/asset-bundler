#!/usr/bin/env bash
set -euo pipefail

echo "==> verify: $(pwd)"

# If running in Codex sandbox or CI without network, skip dependency install.
if [[ "${CODEX_SANDBOX:-}" == "1" ]]; then
  echo "SKIP: dependency install (CODEX_SANDBOX=1)"
else
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  elif [[ -f pnpm-lock.yaml ]]; then
    corepack enable || true
    pnpm install --frozen-lockfile
  else
    npm install --no-audit --no-fund
  fi
fi

if [[ "${CODEX_SANDBOX:-}" == "1" ]]; then
  echo "SKIP: lint/typecheck/test in sandbox (deps not installed)"
else
  if npm run | grep -qE ' lint'; then npm run lint; else echo "SKIP: lint"; fi
  if npm run | grep -qE ' typecheck'; then npm run typecheck; else echo "SKIP: typecheck"; fi
  if npm run | grep -qE ' test'; then npm test; else echo "SKIP: test"; fi
fi

echo "==> secret scan"
set +e
MATCHES=$(
  find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./scripts/verify.sh" \
    -not -path "./prompts/*" \
    -not -path "./docs/*" \
    -print0 | xargs -0 grep -nE \
      '(R2_SECRET|SECRET_ACCESS_KEY|ACCESS_KEY_ID|BEGIN[[:space:]]+PRIVATE[[:space:]]+KEY|xox[baprs]-|sk-[A-Za-z0-9]{20,}|-----BEGIN)'
)
GREP_EXIT=$?
set -e

if [[ "$GREP_EXIT" -eq 0 ]]; then
  echo "❌ Potential secret detected. Matches:"
  echo "$MATCHES"
  exit 1
fi

echo "✅ verify OK"
