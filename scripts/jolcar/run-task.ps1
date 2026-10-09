param(
  [Parameter(Mandatory=$true)][string]$IntegrationRepo,
  [Parameter(Mandatory=$true)][string]$TaskId,
  [Parameter(Mandatory=$true)][int]$Attempt,
  [string]$PreviousFailure = ""
)

$ErrorActionPreference = "Stop"

function Get-CodexPath {
  $c = Get-Command codex -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $root = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin"
  if (Test-Path $root) {
    $candidate = Get-ChildItem $root -Recurse -Filter codex.exe -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($candidate) { return $candidate.FullName }
  }
  throw "Codex CLI not found."
}

$queuePath = Join-Path $IntegrationRepo "docs\jolcar-control\TASK_QUEUE.json"
$queue = Get-Content $queuePath -Raw -Encoding UTF8 | ConvertFrom-Json
$task = @($queue.tasks | Where-Object { $_.id -eq $TaskId }) | Select-Object -First 1
if (-not $task) { throw "Task not found: $TaskId" }

$runtime = Join-Path $IntegrationRepo ".jolcar-runtime"
$logs = Join-Path $runtime "logs"
New-Item -ItemType Directory -Force $logs | Out-Null

$baseHead = (& git -C $IntegrationRepo rev-parse HEAD).Trim()
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeId = ($TaskId -replace '[^A-Za-z0-9_.-]','_')
$parent = Split-Path $IntegrationRepo -Parent
$taskRoot = Join-Path $parent "Jolcar-task-worktrees"
New-Item -ItemType Directory -Force $taskRoot | Out-Null
$taskWorktree = Join-Path $taskRoot "$safeId-a$Attempt-$stamp"
$branch = "jolcar/task/$safeId-a$Attempt-$stamp"

& git -C $IntegrationRepo worktree add -b $branch $taskWorktree $baseHead | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Failed to create isolated task worktree." }

$resultFile = Join-Path $logs "$safeId-a$Attempt-$stamp-result.json"
$stderrFile = Join-Path $logs "$safeId-a$Attempt-$stamp-codex.log"
$schema = Join-Path $taskWorktree "scripts\jolcar\task-result.schema.json"

# Remove common remote/provider credentials from the runner process.
$names = @(
  "SUPABASE_SERVICE_ROLE_KEY","SUPABASE_ACCESS_TOKEN","VERCEL_TOKEN",
  "TWILIO_AUTH_TOKEN","TWILIO_ACCOUNT_SID","OPENAI_API_KEY",
  "ANTHROPIC_API_KEY","AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY",
  "CLOUDFLARE_API_TOKEN","MUX_TOKEN_ID","MUX_TOKEN_SECRET"
)
foreach ($n in $names) {
  [Environment]::SetEnvironmentVariable($n, $null, "Process")
}

$taskJson = $task | ConvertTo-Json -Depth 20
$previous = if ($PreviousFailure) {
  "PREVIOUS ATTEMPT EVIDENCE:`n$PreviousFailure"
} else { "No previous failed attempt." }

$prompt = @"
# JOLCAR AUTONOMOUS LOCAL TASK

You are one fresh Codex process managed by the Jolcar local orchestrator.

TASK ID: $TaskId
ATTEMPT: $Attempt
STARTING HEAD: $baseHead

Read before changing anything:
1. repository root AGENTS.md if present;
2. docs/jolcar-control/AGENTS.md;
3. docs/jolcar-control/MASTER_PLAN.md;
4. docs/jolcar-control/DECISIONS.md;
5. only repository documentation relevant to this task.

Execute EXACTLY ONE task. Do not begin another task.

TASK DEFINITION:
$taskJson

$previous

HARD RULES:
- Local-only.
- Do not access or mutate production Supabase.
- Do not apply remote migrations.
- Do not push Git.
- Do not deploy.
- Do not change DNS.
- Do not read, print, create, or change production secrets.
- Do not send real SMS/OTP.
- Do not enable paid AI or live-stream provider calls.
- Do not perform buyer-seller payments/escrow.
- Do not invent product decisions.
- Do not weaken validation, privacy, RLS, auth, or security to pass tests.
- Never edit an already-applied historical migration.
- No reset/rebase/amend/squash/force-push.
- Keep changes limited to this task.

WORKFLOW:
1. Verify current HEAD and clean task worktree.
2. Inspect concrete current implementation and relevant docs/tests.
3. If already satisfied, prove it with current Git/test evidence and return PASS with no_change_reason.
4. Otherwise implement the smallest correct change.
5. Run task acceptance verification plus targeted regression/static checks.
6. Review diff and security/privacy/data impact where relevant.
7. If changes were needed and task PASSes, create exactly one focused ordinary commit.
8. End with a clean worktree on PASS.
9. If the task cannot PASS safely, do not fake success. Return FAIL/BLOCKED and explain exact root cause. Do not start another task.

Your final response MUST be JSON matching scripts/jolcar/task-result.schema.json exactly.

For PASS:
- production_accessed=false
- push_performed=false
- remote_migrations_applied=false
- deploy_performed=false
- secrets_changed=false
- otp_sms_sent=0
- working_tree_clean=true
- tests_passed=true when the task requires executable verification
- commit is the new commit SHA if repository changes were made; otherwise null with no_change_reason.

Do not include markdown around the JSON.
"@

$codex = Get-CodexPath

# Codex writes the structured final message here.
& $codex exec --sandbox workspace-write --cd $taskWorktree `
  --output-schema $schema `
  --output-last-message $resultFile `
  $prompt 2>&1 | Tee-Object -FilePath $stderrFile | Out-Host

$exitCode = $LASTEXITCODE

if (-not (Test-Path $resultFile)) {
  $fallback = [ordered]@{
    task_id=$TaskId; status="FAIL"; starting_head=$baseHead;
    ending_head=((& git -C $taskWorktree rev-parse HEAD).Trim());
    commit=$null; working_tree_clean=$false; tests_passed=$false; tests=@();
    production_accessed=$false; push_performed=$false; remote_migrations_applied=$false;
    deploy_performed=$false; secrets_changed=$false; otp_sms_sent=0;
    user_decision_required=$false;
    stop_reason="Codex produced no structured result; exit code $exitCode";
    summary="No structured task result was produced.";
    evidence=@($stderrFile); no_change_reason=$null
  }
  $fallback | ConvertTo-Json -Depth 10 | Set-Content $resultFile -Encoding UTF8
}

# Record forensic information outside the task worktree.
$statusText = & git -C $taskWorktree status --porcelain=v1
$statusText | Set-Content (Join-Path $logs "$safeId-a$Attempt-$stamp-git-status.txt") -Encoding UTF8
& git -C $taskWorktree diff | Set-Content (Join-Path $logs "$safeId-a$Attempt-$stamp-working.diff") -Encoding UTF8
& git -C $taskWorktree diff --cached | Set-Content (Join-Path $logs "$safeId-a$Attempt-$stamp-staged.diff") -Encoding UTF8

[pscustomobject]@{
  ResultFile = $resultFile
  TaskWorktree = $taskWorktree
  TaskBranch = $branch
  BaseHead = $baseHead
  CodexExitCode = $exitCode
} | ConvertTo-Json -Depth 5
