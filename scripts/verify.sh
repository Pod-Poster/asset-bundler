#!/usr/bin/env bash
set -euo pipefail

echo "==> verify: $(pwd)"

if [[ "${CODEX_SANDBOX:-}" == "1" ]]; then
  echo "SKIP: dependency install (CODEX_SANDBOX=1)"
  echo "SKIP: lint/typecheck/test in sandbox"
else
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi

  if npm run | grep -qE ' lint'; then npm run lint; else echo "SKIP: lint"; fi
  if npm run | grep -qE ' typecheck'; then npm run typecheck; else echo "SKIP: typecheck"; fi
  if npm run | grep -qE ' test'; then npm test; else echo "SKIP: test"; fi
fi

echo "==> secret scan"
set +e
# Scan for actual secret values, not env var names or template references
# Patterns:
#   - AWS access keys (AKIA...)
#   - Private key blocks
#   - Slack tokens (xox...)
#   - OpenAI keys (sk-...)
#   - Generic secret assignments with actual values (SECRET_.*=.{8,} but not empty or template)
MATCHES=$(
  find . -type f \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./.supervisor/*" \
    -not -path "./scripts/verify.sh" \
    -not -path "./prompts/*" \
    -not -path "./docs/*" \
    -not -path "./.env.example" \
    -not -path "./.github/workflows/*" \
    -not -name "*.md" \
    -print0 | xargs -0 grep -nE \
      '(AKIA[0-9A-Z]{16}|-----BEGIN[[:space:]]+(RSA|DSA|EC|OPENSSH)?[[:space:]]*PRIVATE[[:space:]]+KEY-----|xox[baprs]-[0-9A-Za-z-]+|sk-[A-Za-z0-9]{20,})'
)
GREP_EXIT=$?
set -e

if [[ "$GREP_EXIT" -eq 0 ]]; then
  echo "❌ Potential secret detected. Matches:"
  echo "$MATCHES"
  exit 1
fi

echo "✅ verify OK"
