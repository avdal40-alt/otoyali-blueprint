param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [int]$MaxRepairAttempts = 3,
  [int]$MaxTasks = 0
)

$ErrorActionPreference = "Stop"

function Save-Json($obj, [string]$path) {
  $obj | ConvertTo-Json -Depth 50 | Set-Content $path -Encoding UTF8
}

function Load-State([string]$path) {
  if (Test-Path $path) {
    return Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  }
  return [pscustomobject]@{
    schema_version = 1
    started_at = (Get-Date).ToString("o")
    updated_at = (Get-Date).ToString("o")
    completed = @()
    deferred = @()
    blocked = @()
    attempts = [pscustomobject]@{}
    last_integrated_head = ((& git -C $RepoRoot rev-parse HEAD).Trim())
  }
}

function Contains-Id($arr, [string]$id) {
  return @($arr | Where-Object { $_ -eq $id }).Count -gt 0
}

& (Join-Path $PSScriptRoot "preflight.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { exit 1 }

$runtime = Join-Path $RepoRoot ".jolcar-runtime"
$logs = Join-Path $runtime "logs"
New-Item -ItemType Directory -Force $logs | Out-Null
$statePath = Join-Path $runtime "state.json"
$summaryPath = Join-Path $runtime "summary.json"

$queue = Get-Content (Join-Path $RepoRoot "docs\jolcar-control\TASK_QUEUE.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$tasks = @($queue.tasks | Sort-Object order)
$state = Load-State $statePath

# Normalize arrays after JSON round-trips.
$completed = [System.Collections.Generic.List[string]]::new()
@($state.completed) | ForEach-Object { if ($_){ [void]$completed.Add([string]$_) } }
$deferred = [System.Collections.Generic.List[object]]::new()
@($state.deferred) | ForEach-Object { if ($_){ [void]$deferred.Add($_) } }
$blocked = [System.Collections.Generic.List[object]]::new()
@($state.blocked) | ForEach-Object { if ($_){ [void]$blocked.Add($_) } }

$integratedThisRun = 0
$attemptedThisRun = 0

while ($true) {
  # Integration worktree must remain clean between tasks.
  $dirty = & git -C $RepoRoot status --porcelain=v1
  if ($dirty) { throw "Integration worktree unexpectedly dirty. Safety stop.`n$dirty" }

  # Record decision/manual gates as deferred once their dependencies are complete.
  foreach ($t in $tasks) {
    if (Contains-Id $completed $t.id) { continue }
    $alreadyDeferred = @($deferred | Where-Object { $_.task_id -eq $t.id }).Count -gt 0
    $depsReady = $true
    foreach ($d in @($t.dependencies)) {
      if (-not (Contains-Id $completed $d)) { $depsReady = $false; break }
    }
    if (-not $depsReady) { continue }

    if (($t.requires_user_authorization -eq $true) -and -not $alreadyDeferred) {
      [void]$deferred.Add([pscustomobject]@{
        task_id=$t.id; kind="MANUAL_AUTHORIZATION"; at=(Get-Date).ToString("o");
        reason="Explicit user authorization required; autonomous runner will not execute it."
      })
    } elseif (($t.requires_user_decision -eq $true) -and -not $alreadyDeferred) {
      [void]$deferred.Add([pscustomobject]@{
        task_id=$t.id; kind="USER_DECISION"; at=(Get-Date).ToString("o");
        decision_ref=$t.decision_ref;
        reason="Unresolved decision gate. Runner continues independent tasks."
      })
    }
  }

  # Choose first dependency-ready ordinary task not completed or permanently blocked.
  $next = $null
  foreach ($t in $tasks) {
    if (Contains-Id $completed $t.id) { continue }
    if ($t.requires_user_authorization -eq $true -or $t.requires_user_decision -eq $true) { continue }
    if (@($blocked | Where-Object { $_.task_id -eq $t.id -and $_.permanent -eq $true }).Count -gt 0) { continue }

    $depsReady = $true
    foreach ($d in @($t.dependencies)) {
      if (-not (Contains-Id $completed $d)) { $depsReady = $false; break }
    }
    if ($depsReady) { $next = $t; break }
  }

  if (-not $next) { break }
  if ($MaxTasks -gt 0 -and $attemptedThisRun -ge $MaxTasks) { break }

  $taskId = [string]$next.id
  $previousFailure = ""
  $taskPassed = $false

  for ($attempt=1; $attempt -le $MaxRepairAttempts; $attempt++) {
    $attemptedThisRun++
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "JOLCAR TASK $taskId — ATTEMPT $attempt/$MaxRepairAttempts"
    Write-Host "============================================================"

    $metaJson = & (Join-Path $PSScriptRoot "run-task.ps1") `
      -IntegrationRepo $RepoRoot `
      -TaskId $taskId `
      -Attempt $attempt `
      -PreviousFailure $previousFailure

    $meta = $metaJson | ConvertFrom-Json
    $result = Get-Content $meta.ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json

    & (Join-Path $PSScriptRoot "safety-check.ps1") -ResultFile $meta.ResultFile

    if ($result.task_id -ne $taskId) {
      throw "Task result ID mismatch: expected $taskId, got $($result.task_id)"
    }

    if ($result.status -eq "PASS") {
      $taskStatus = & git -C $meta.TaskWorktree status --porcelain=v1
      if ($taskStatus) {
        $previousFailure = "PASS was reported but task worktree is dirty. Exact status:`n$taskStatus"
        continue
      }

      $taskHead = (& git -C $meta.TaskWorktree rev-parse HEAD).Trim()
      $count = [int]((& git -C $meta.TaskWorktree rev-list --count "$($meta.BaseHead)..$taskHead").Trim())

      if ($count -gt 1) {
        $previousFailure = "Task created more than one commit ($count). One task must integrate at most one focused commit."
        continue
      }

      if ($count -eq 1) {
        $commit = (& git -C $meta.TaskWorktree rev-parse HEAD).Trim()
        Write-Host "Integrating PASS commit $commit"
        & git -C $RepoRoot cherry-pick $commit
        if ($LASTEXITCODE -ne 0) {
          throw "Cherry-pick conflict/integration failure. Safety stop."
        }
        $integratedThisRun++
      } else {
        if (-not $result.no_change_reason) {
          $previousFailure = "PASS with no commit requires a concrete no_change_reason proving the task was already satisfied/read-only."
          continue
        }
      }

      [void]$completed.Add($taskId)
      $taskPassed = $true

      # Clean successful isolated worktree/branch only.
      & git -C $RepoRoot worktree remove $meta.TaskWorktree
      if ($LASTEXITCODE -eq 0) {
        & git -C $RepoRoot branch -d $meta.TaskBranch | Out-Null
      }
      break
    }

    $previousFailure = @"
Previous status: $($result.status)
Stop reason: $($result.stop_reason)
Summary: $($result.summary)
Evidence:
$(@($result.evidence) -join "`n")
Failed isolated worktree preserved at: $($meta.TaskWorktree)
"@

    Write-Warning "$taskId attempt $attempt did not PASS. A fresh repair attempt will be launched if allowed."
  }

  if (-not $taskPassed) {
    [void]$blocked.Add([pscustomobject]@{
      task_id=$taskId; permanent=$true; at=(Get-Date).ToString("o");
      reason="Failed to PASS after $MaxRepairAttempts autonomous attempts.";
      last_evidence=$previousFailure
    })
  }

  $state = [pscustomobject]@{
    schema_version = 1
    started_at = $state.started_at
    updated_at = (Get-Date).ToString("o")
    completed = @($completed)
    deferred = @($deferred)
    blocked = @($blocked)
    last_integrated_head = ((& git -C $RepoRoot rev-parse HEAD).Trim())
  }
  Save-Json $state $statePath
}

$pending = @()
foreach ($t in $tasks) {
  if (-not (Contains-Id $completed $t.id)) { $pending += $t.id }
}

$summary = [pscustomobject]@{
  product = "Jolcar"
  finished_at = (Get-Date).ToString("o")
  integration_head = ((& git -C $RepoRoot rev-parse HEAD).Trim())
  task_total = $tasks.Count
  completed_total = $completed.Count
  attempted_this_run = $attemptedThisRun
  commits_integrated_this_run = $integratedThisRun
  deferred = @($deferred)
  blocked = @($blocked)
  pending = $pending
  production_accessed = $false
  push_performed = $false
  deploy_performed = $false
  status = if ($pending.Count -eq 0) { "LOCAL_QUEUE_COMPLETE" }
           elseif ($blocked.Count -gt 0) { "LOCAL_PROGRESS_WITH_BLOCKERS" }
           else { "WAITING_ON_DECISION_OR_MANUAL_GATES" }
}
Save-Json $summary $summaryPath

Write-Host ""
Write-Host "============================================================"
Write-Host "JOLCAR AUTONOMOUS RUN FINISHED"
Write-Host "============================================================"
Write-Host "Completed: $($completed.Count)/$($tasks.Count)"
Write-Host "Attempted this run: $attemptedThisRun"
Write-Host "Integrated commits this run: $integratedThisRun"
Write-Host "Deferred gates: $($deferred.Count)"
Write-Host "Blocked tasks: $($blocked.Count)"
Write-Host "Summary: $summaryPath"
