\
Param([int]$MaxLoops = 8)

$ErrorActionPreference="Stop"
$CODEX_BIN = if ($env:CODEX_BIN) { $env:CODEX_BIN } else { "codex" }
$CLAUDE_BIN = if ($env:CLAUDE_BIN) { $env:CLAUDE_BIN } else { "claude" }
$CODEX_FLAGS = if ($env:CODEX_FLAGS) { $env:CODEX_FLAGS } else { "--full-auto --skip-git-repo-check" }
$CLAUDE_FLAGS = if ($env:CLAUDE_FLAGS) { $env:CLAUDE_FLAGS } else { "--permission-mode acceptEdits -p" }

$SupPromptFile="prompts/SUPERVISOR_PROMPT.txt"
$ImpPromptFile="prompts/IMPLEMENTER_PROMPT.txt"
$SchemaFile="prompts/schemas/supervisor_output.schema.json"
$OutDir=".supervisor"
$OutFile=Join-Path $OutDir "supervisor.json"

function Require-File($p){ if(-not (Test-Path $p)){ throw "Missing required file: $p" } }
function Require-Cmd($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "Required command not found: $n" } }

Require-Cmd $CODEX_BIN
Require-Cmd $CLAUDE_BIN
Require-Cmd "python"
Require-File $SupPromptFile
Require-File $ImpPromptFile
Require-File $SchemaFile

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

for($i=1; $i -le $MaxLoops; $i++){
  Write-Host "#############################################"
  Write-Host "# Loop $i/$MaxLoops — Codex supervisor"
  Write-Host "#############################################"

  $env:CODEX_SANDBOX="1"
  $PromptText = Get-Content -Raw $SupPromptFile
  $codexArgs = @("exec") + ($CODEX_FLAGS -split "\s+") + @("--output-schema",$SchemaFile,"--output-last-message",$OutFile,$PromptText)
  & $CODEX_BIN @codexArgs

  $Status = python -c "import json;print(json.load(open(r'$OutFile')).get('status','FAIL'))"
  Write-Host "==> Supervisor status: $Status"
  if($Status -eq "PASS"){ Write-Host "✅ PASS"; exit 0 }

  Write-Host "#############################################"
  Write-Host "# Loop $i/$MaxLoops — Claude implementer"
  Write-Host "#############################################"

  $ReportJson = Get-Content -Raw $OutFile
  $ImpPrompt = (Get-Content -Raw $ImpPromptFile) + "`n`nSupervisor report JSON:`n" + $ReportJson
  $claudeArgs = @() + ($CLAUDE_FLAGS -split "\s+") + @($ImpPrompt)
  & $CLAUDE_BIN @claudeArgs
  Write-Host ""
}

Write-Host "❌ Reached MAX_LOOPS=$MaxLoops without PASS. See $OutFile"
exit 1
