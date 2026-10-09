param(
  [Parameter(Mandatory=$true)]
  [string]$IntegrationRepo,

  [Parameter(Mandatory=$true)]
  [string]$TaskId,

  [Parameter(Mandatory=$true)]
  [int]$Attempt,

  [string]$PreviousFailure = ""
)

$ErrorActionPreference = "Stop"

function Get-CodexPath {
  $cmd = Get-Command codex -ErrorAction SilentlyContinue
  if ($cmd) {
    if ($cmd.Source) { return $cmd.Source }
    if ($cmd.Path) { return $cmd.Path }
  }

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
if (-not $task) {
  throw "Task not found: $TaskId"
}

$runtime = Join-Path $IntegrationRepo ".jolcar-runtime"
$logs = Join-Path $runtime "logs"
New-Item -ItemType Directory -Force $logs | Out-Null

$baseHead = ((& git -C $IntegrationRepo rev-parse HEAD).Trim())
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeId = ($TaskId -replace '[^A-Za-z0-9_.-]', '_')

$parent = Split-Path $IntegrationRepo -Parent
$taskRoot = Join-Path $parent "Jolcar-task-worktrees"
New-Item -ItemType Directory -Force $taskRoot | Out-Null

$taskWorktree = Join-Path $taskRoot ($safeId + "-a" + $Attempt + "-" + $stamp)
$branch = "jolcar/task/" + $safeId + "-a" + $Attempt + "-" + $stamp

& git -C $IntegrationRepo worktree add -b $branch $taskWorktree $baseHead | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create isolated task worktree."
}

$resultFile = Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-result.json")
$codexLog = Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-codex.log")
$promptFile = Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-prompt.txt")
$schema = Join-Path $taskWorktree "scripts\jolcar\task-result.schema.json"

# Remove common remote/provider credentials from this process before Codex starts.
$credentialNames = @(
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "VERCEL_TOKEN",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_ACCOUNT_SID",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "CLOUDFLARE_API_TOKEN",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET"
)

foreach ($name in $credentialNames) {
  [Environment]::SetEnvironmentVariable($name, $null, "Process")
}

$taskJson = $task | ConvertTo-Json -Depth 30

if ($PreviousFailure) {
  $previousText = "PREVIOUS ATTEMPT EVIDENCE:`r`n" + $PreviousFailure
} else {
  $previousText = "No previous failed attempt."
}

$promptLines = @(
  "# JOLCAR AUTONOMOUS LOCAL TASK",
  "",
  "You are one fresh Codex process managed by the Jolcar local orchestrator.",
  "",
  ("TASK ID: " + $TaskId),
  ("ATTEMPT: " + $Attempt),
  ("STARTING HEAD: " + $baseHead),
  "",
  "Read before changing anything:",
  "1. repository root AGENTS.md if present;",
  "2. docs/jolcar-control/AGENTS.md;",
  "3. docs/jolcar-control/MASTER_PLAN.md;",
  "4. docs/jolcar-control/DECISIONS.md;",
  "5. only repository documentation relevant to this task.",
  "",
  "Execute EXACTLY ONE task. Do not begin another task.",
  "",
  "TASK DEFINITION:",
  $taskJson,
  "",
  $previousText,
  "",
  "HARD RULES:",
  "- Local-only.",
  "- Do not access or mutate production Supabase.",
  "- Do not apply remote migrations.",
  "- Do not push Git.",
  "- Do not deploy.",
  "- Do not change DNS.",
  "- Do not read, print, create, or change production secrets.",
  "- Do not send real SMS/OTP.",
  "- Do not enable paid AI or live-stream provider calls.",
  "- Do not perform buyer-seller payments or escrow.",
  "- Do not invent product decisions.",
  "- Do not weaken validation, privacy, RLS, auth, or security to pass tests.",
  "- Never edit an already-applied historical migration.",
  "- No reset, rebase, amend, squash, or force-push.",
  "- Keep changes limited to this task.",
  "",
  "WORKFLOW:",
  "1. Verify current HEAD and clean task worktree.",
  "2. Inspect concrete current implementation and relevant docs/tests.",
  "3. If already satisfied, prove it with current Git/test evidence and return PASS with no_change_reason.",
  "4. Otherwise implement the smallest correct change.",
  "5. Run task acceptance verification plus targeted regression/static checks.",
  "6. Review diff and security/privacy/data impact where relevant.",
  "7. DO NOT run git add, git commit, git reset, git checkout, git restore, git stash, or any command that writes Git metadata. The outer orchestrator owns staging and commits.",
  "8. If source changes are needed, leave the reviewed changes uncommitted in the task worktree. This is expected.",
  "9. If the task cannot PASS safely, do not fake success. Return FAIL/BLOCKED and explain exact root cause.",
  "",
  "Your final response MUST be JSON matching scripts/jolcar/task-result.schema.json exactly.",
  "",
  "For PASS:",
  "- production_accessed=false",
  "- push_performed=false",
  "- remote_migrations_applied=false",
  "- deploy_performed=false",
  "- secrets_changed=false",
  "- otp_sms_sent=0",
  "- working_tree_clean=false is allowed when verified task changes remain for the outer orchestrator to commit",
  "- tests_passed=true when the task requires executable verification",
  "- commit MUST be null; the outer orchestrator creates the Git commit after validating your result and diff",
  "- no_change_reason is required only when no repository change is needed.",
  "",
  "Do not include markdown around the JSON."
)

$prompt = $promptLines -join "`r`n"

# IMPORTANT: Do not pass the multiline prompt as a positional PowerShell argument.
# Windows PowerShell/native-argument marshalling can split it into multiple argv items.
# Codex supports an explicit "-" positional sentinel, which forces prompt input from stdin.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($promptFile, $prompt, $utf8NoBom)

$codex = Get-CodexPath

# Windows PowerShell 5.1 can wrap native stderr as ErrorRecord and abort the
# orchestrator even when codex.exe itself is healthy. Avoid the PowerShell native
# pipeline entirely: Start-Process redirects stdin/stdout/stderr to files, waits
# for the real process exit code, then we display the captured output ourselves.
$stdoutFile = Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-stdout.log")
$stderrFile = Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-stderr.log")

$arguments = @(
  "exec",
  "--sandbox", "workspace-write",
  "--cd", $taskWorktree,
  "--output-schema", $schema,
  "--output-last-message", $resultFile,
  "-"
)

$process = Start-Process `
  -FilePath $codex `
  -ArgumentList $arguments `
  -RedirectStandardInput $promptFile `
  -RedirectStandardOutput $stdoutFile `
  -RedirectStandardError $stderrFile `
  -NoNewWindow `
  -Wait `
  -PassThru

$codexExitCode = $process.ExitCode

if (Test-Path $stderrFile) {
  Get-Content $stderrFile -Encoding UTF8 | Tee-Object -FilePath $codexLog | Out-Host
}
if (Test-Path $stdoutFile) {
  Get-Content $stdoutFile -Encoding UTF8 | Tee-Object -FilePath $codexLog -Append | Out-Host
}

Write-Host ("Codex exit code: " + $codexExitCode)

if (-not (Test-Path $resultFile)) {
  $fallback = [ordered]@{
    task_id = $TaskId
    status = "FAIL"
    starting_head = $baseHead
    ending_head = ((& git -C $taskWorktree rev-parse HEAD).Trim())
    commit = $null
    working_tree_clean = $false
    tests_passed = $false
    tests = @()
    production_accessed = $false
    push_performed = $false
    remote_migrations_applied = $false
    deploy_performed = $false
    secrets_changed = $false
    otp_sms_sent = 0
    user_decision_required = $false
    stop_reason = "Codex produced no structured result; exit code " + $codexExitCode
    summary = "No structured task result was produced."
    evidence = @($codexLog)
    no_change_reason = $null
  }

  $fallback | ConvertTo-Json -Depth 20 | Set-Content $resultFile -Encoding UTF8
}

$statusText = & git -C $taskWorktree status --porcelain=v1
$statusText | Set-Content (Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-git-status.txt")) -Encoding UTF8

& git -C $taskWorktree diff |
  Set-Content (Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-working.diff")) -Encoding UTF8

& git -C $taskWorktree diff --cached |
  Set-Content (Join-Path $logs ($safeId + "-a" + $Attempt + "-" + $stamp + "-staged.diff")) -Encoding UTF8

$metadata = [ordered]@{
  ResultFile = $resultFile
  TaskWorktree = $taskWorktree
  TaskBranch = $branch
  BaseHead = $baseHead
  CodexExitCode = $codexExitCode
}

$metadata | ConvertTo-Json -Depth 10
