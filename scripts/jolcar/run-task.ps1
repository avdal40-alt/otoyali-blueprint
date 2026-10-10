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

# Git worktrees intentionally do not copy ignored dependency directories such as
# node_modules. Reuse the already-installed LOCAL dependencies from the clean
# integration worktree by creating directory junctions inside the isolated task
# worktree. This performs no network install and does not change package state.
#
# Codex still receives the task worktree as its workspace-write root; the shared
# dependency directories are only runtime inputs for typecheck/tests.
$dependencyLinks = @(
  [pscustomobject]@{
    Source = (Join-Path $IntegrationRepo "node_modules")
    Target = (Join-Path $taskWorktree "node_modules")
    Label = "root node_modules"
  },
  [pscustomobject]@{
    Source = (Join-Path $IntegrationRepo "apps\web\node_modules")
    Target = (Join-Path $taskWorktree "apps\web\node_modules")
    Label = "apps/web node_modules"
  }
)

foreach ($link in $dependencyLinks) {
  if ((Test-Path $link.Source) -and (-not (Test-Path $link.Target))) {
    $effectiveSource = $link.Source

    # If the integration repo itself uses a junction (for example Jolcar reusing
    # the identical YOLMOD node_modules), point the task worktree directly at the
    # final local target to avoid fragile junction chains.
    try {
      $sourceItem = Get-Item $link.Source -Force
      if (
        $sourceItem.LinkType -eq "Junction" -and
        $sourceItem.Target -and
        $sourceItem.Target.Count -gt 0 -and
        (Test-Path ([string]$sourceItem.Target[0]))
      ) {
        $effectiveSource = [string]$sourceItem.Target[0]
      }
    } catch {
      # Keep the original source if metadata inspection is unavailable.
    }

    $parentDir = Split-Path $link.Target -Parent
    New-Item -ItemType Directory -Force $parentDir | Out-Null

    try {
      New-Item -ItemType Junction -Path $link.Target -Target $effectiveSource -ErrorAction Stop | Out-Null
      Write-Host ("Shared local dependency junction: " + $link.Label)
    } catch {
      throw (
        "Failed to share existing local dependencies into task worktree: " +
        $link.Label + ". " + $_.Exception.Message
      )
    }
  }
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

# The local Supabase CLI otherwise tries to write telemetry state under the
# user's profile, which can be denied by the Codex workspace sandbox.
[Environment]::SetEnvironmentVariable("SUPABASE_TELEMETRY_DISABLED", "1", "Process")

# ECONOMY MODE:
# Send only the task fields needed to implement/verify this task. Decision/manual
# gates are handled by the outer orchestrator and do not need to consume model
# context on ordinary tasks.
$compactTask = [ordered]@{
  id = [string]$task.id
  phase = [string]$task.phase
  title = [string]$task.title
  priority = [string]$task.priority
  type = [string]$task.type
  description = [string]$task.description
  acceptance_criteria = @($task.acceptance_criteria)
  verification = @($task.verification)
  dependencies = @($task.dependencies)
}
$taskJson = $compactTask | ConvertTo-Json -Depth 12 -Compress

# Repair context is intentionally capped. The previous runner used to feed large
# failure transcripts back into every retry, multiplying token consumption.
if ($PreviousFailure) {
  $failureCap = 1600
  $failureText = [string]$PreviousFailure
  if ($failureText.Length -gt $failureCap) {
    $failureText = $failureText.Substring(0, $failureCap) + "...[truncated by economy mode]"
  }
  $previousText = "PREVIOUS FAILURE (compact): " + $failureText
} else {
  $previousText = "PREVIOUS FAILURE: none"
}

# Only inject local-Supabase readiness when this task actually appears to need a
# DB/Auth/API runtime. Frontend/docs tasks should not pay this context cost.
$taskSignal = (
  ([string]$task.title) + " " +
  ([string]$task.description) + " " +
  (@($task.acceptance_criteria) -join " ") + " " +
  (@($task.verification) -join " ")
)
$needsLocalSupabase = $taskSignal -match "(?i)\b(supabase|postgres|database|db|auth|rls|migration|storage|postgrest|rest api|runtime database)\b"

$runtimeEvidenceText = $null
if ($needsLocalSupabase) {
  $runtimeEvidencePath = Join-Path $runtime "local-supabase-readiness.json"
  if (Test-Path $runtimeEvidencePath) {
    try {
      $runtimeEvidence = Get-Content $runtimeEvidencePath -Raw -Encoding UTF8 | ConvertFrom-Json
      $runtimeEvidenceText = (
        "LOCAL_RUNTIME: Supabase running=" + [string]$runtimeEvidence.running +
        "; api=" + [string]$runtimeEvidence.api_url +
        "; auth_health=" + [string]$runtimeEvidence.auth_health_status +
        "; db_port=" + [string]$runtimeEvidence.db_port +
        "; db_reachable=" + [string]$runtimeEvidence.db_port_reachable +
        "; config_unchanged=" + [string]$runtimeEvidence.config_unchanged +
        ". Local-only; do not link/reset/stop or print keys."
      )
    } catch {
      $runtimeEvidenceText = "LOCAL_RUNTIME: readiness file exists but is unreadable; verify locally if required."
    }
  }
}

$hostPrecheckText = "HOST_PRECHECK: none"
$precheckPath = Join-Path (Join-Path $runtime "precheck") ($TaskId + ".json")
if (Test-Path -LiteralPath $precheckPath -PathType Leaf) {
  try {
    $precheck = Get-Content -LiteralPath $precheckPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ([string]$precheck.head -eq $baseHead) {
      $fileHints = @($precheck.candidate_files | Select-Object -First 10)
      $checkHints = @()

      foreach ($check in @($precheck.checks | Select-Object -First 4)) {
        if ($check.script) {
          $piece = [string]$check.script + "=" + [string]$check.status
          if ($check.tail) {
            $tail = [string]$check.tail
            if ($tail.Length -gt 500) {
              $tail = $tail.Substring(0,500) + "...[truncated]"
            }
            $piece += "(" + ($tail -replace '[\r\n]+',' ') + ")"
          }
          $checkHints += $piece
        } elseif ($check.status) {
          $checkHints += ([string]$check.status)
        }
      }

      $hostPrecheckText = (
        "HOST_PRECHECK: files=[" + ($fileHints -join ", ") + "]; " +
        "checks=[" + ($checkHints -join "; ") + "]. " +
        "Use these hints first. Do not repeat a PASS host check unless your edits can affect it."
      )
    }
  } catch {
    $hostPrecheckText = "HOST_PRECHECK: unavailable (nonfatal parse issue)."
  }
}

$promptLines = @(
  "JOLCAR TASK " + $TaskId + " | attempt " + $Attempt + " | head " + $baseHead,
  "",
  "Do exactly ONE task. Work local-only.",
  "Honor repository AGENTS instructions if Codex loads them automatically. Do not re-read broad project docs unless a concrete ambiguity remains.",
  "Do NOT read MASTER_PLAN.md, DECISIONS.md, ROADMAP, or perform a repository inventory by default. The queue definition below is authoritative for this task.",
  $hostPrecheckText,
  "READ BUDGET BEFORE FIRST EDIT: use HOST_PRECHECK files first; at most 2 repo-wide searches and at most 8 file reads. Prefer targeted line ranges/grep over whole-file reads. Exceed only when the task cannot be solved safely otherwise, and state why in evidence.",
  "For likely no-change tasks: run/inspect the narrowest proof first. If HOST_PRECHECK already passed a relevant check and you make no affecting edits, reuse that evidence instead of repeating it.",
  "Do not narrate your work.",
  "",
  "TASK=" + $taskJson,
  "",
  $previousText
)

if ($runtimeEvidenceText) {
  $promptLines += ""
  $promptLines += $runtimeEvidenceText
}

$promptLines += @(
  "",
  "SAFETY: no production/remote Supabase; no remote migrations; no push/deploy/DNS; no production secrets; no real SMS/OTP; no paid AI/live provider calls; no payments/escrow; no weakening auth/privacy/RLS/validation; never edit applied historical migrations; no reset/rebase/amend/squash/force-push.",
  "Git metadata is owned by the outer orchestrator: DO NOT git add/commit/reset/checkout/restore/stash.",
  "",
  "METHOD: inspect narrowly -> make smallest correct change -> run acceptance verification and targeted regressions only -> review diff/security impact. Do not run broad suites unless explicitly required.",
  "If already satisfied, prove it and PASS with no_change_reason. If unsafe/impossible, return BLOCKED rather than retrying the same infrastructure problem.",
  "",
  "FINAL: JSON only, exactly matching scripts/jolcar/task-result.schema.json. Keep summary/evidence concise (max 8 evidence entries).",
  "PASS invariants: production_accessed=false; push_performed=false; remote_migrations_applied=false; deploy_performed=false; secrets_changed=false; otp_sms_sent=0; commit=null; tests_passed=true when executable verification is required. working_tree_clean=false is allowed for verified source changes."
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

# Maximum-economy routing:
# - attempts 1-2 use GPT-5.6 Luna + low reasoning;
# - only the final repair attempt escalates to Terra + low reasoning.
# Luna is intentionally tried twice because it is substantially cheaper than
# Terra, while the final Terra fallback preserves an escape hatch for genuinely
# difficult implementation failures.
if ($Attempt -ge 3) {
  $codexModel = "gpt-5.6-terra"
  $reasoningEffort = "low"
} else {
  $codexModel = "gpt-5.6-luna"
  $reasoningEffort = "low"
}

Write-Host ("Codex economy profile: model=" + $codexModel + "; reasoning=" + $reasoningEffort)

$arguments = @(
  "exec",
  "--model", $codexModel,
  "--config", ("model_reasoning_effort=" + $reasoningEffort),
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
