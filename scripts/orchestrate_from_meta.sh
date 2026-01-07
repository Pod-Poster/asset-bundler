#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$0"
REPO_ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> repo: $REPO_ROOT"
echo "==> CODEX_MODEL=${CODEX_MODEL:-unset} CODEX_APPROVAL=${CODEX_APPROVAL:-unset}"

if [[ -x "$REPO_ROOT/scripts/orchestrate_repo.sh" ]]; then
  "$REPO_ROOT/scripts/orchestrate_repo.sh"
elif [[ -x "$REPO_ROOT/scripts/orchestrate_codex_claude.sh" ]]; then
  "$REPO_ROOT/scripts/orchestrate_codex_claude.sh"
else
  echo "ERROR: No repo orchestrator found."
  echo "Expected one of:"
  echo "  $REPO_ROOT/scripts/orchestrate_repo.sh"
  echo "  $REPO_ROOT/scripts/orchestrate_codex_claude.sh"
  exit 1
fi
