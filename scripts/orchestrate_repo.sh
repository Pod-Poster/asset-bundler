#!/usr/bin/env bash
set -euo pipefail

MAX_LOOPS="${MAX_LOOPS:-8}"
CODEX_BIN="${CODEX_BIN:-codex}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"

CODEX_FLAGS="${CODEX_FLAGS:---full-auto --skip-git-repo-check}"
CLAUDE_FLAGS="${CLAUDE_FLAGS:---permission-mode acceptEdits -p}"

SUP_PROMPT_FILE="prompts/SUPERVISOR_PROMPT.txt"
IMP_PROMPT_FILE="prompts/IMPLEMENTER_PROMPT.txt"
SCHEMA_FILE="prompts/schemas/supervisor_output.schema.json"
OUT_DIR=".supervisor"
OUT_FILE="$OUT_DIR/supervisor.json"

command -v "$CODEX_BIN" >/dev/null 2>&1 || { echo "❌ codex CLI not found"; exit 1; }
command -v "$CLAUDE_BIN" >/dev/null 2>&1 || { echo "❌ claude CLI not found"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ python3 not found"; exit 1; }

[[ -f "$SUP_PROMPT_FILE" ]] || { echo "❌ Missing $SUP_PROMPT_FILE"; exit 1; }
[[ -f "$IMP_PROMPT_FILE" ]] || { echo "❌ Missing $IMP_PROMPT_FILE"; exit 1; }
[[ -f "$SCHEMA_FILE" ]] || { echo "❌ Missing $SCHEMA_FILE"; exit 1; }

mkdir -p "$OUT_DIR"

for i in $(seq 1 "$MAX_LOOPS"); do
  echo "#############################################"
  echo "# Loop $i/$MAX_LOOPS — Codex supervisor"
  echo "#############################################"

  export CODEX_SANDBOX=1
  PROMPT_TEXT="$(cat "$SUP_PROMPT_FILE")"

  "$CODEX_BIN" exec $CODEX_FLAGS     --output-schema "$SCHEMA_FILE"     --output-last-message "$OUT_FILE"     "$PROMPT_TEXT"

  STATUS="$(python3 -c "import json;print(json.load(open('$OUT_FILE')).get('status','FAIL'))")"
  echo "==> Supervisor status: $STATUS"

  if [[ "$STATUS" == "PASS" ]]; then
    echo "✅ PASS"
    exit 0
  fi

  echo "#############################################"
  echo "# Loop $i/$MAX_LOOPS — Claude implementer"
  echo "#############################################"

  REPORT_JSON="$(cat "$OUT_FILE")"
  CLAUDE_PROMPT="$(cat "$IMP_PROMPT_FILE")"$'\n\n'"Supervisor report JSON:\n$REPORT_JSON"
  "$CLAUDE_BIN" $CLAUDE_FLAGS "$CLAUDE_PROMPT"
  echo
done

echo "❌ Reached MAX_LOOPS=$MAX_LOOPS without PASS. See $OUT_FILE"
exit 1
