param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [int]$MaxRepairAttempts = 3,
  [int]$MaxTasks = 0
)

$ErrorActionPreference = "Stop"

function Save-Json {
  param(
    $Object,
    [string]$Path
  )
  $Object | ConvertTo-Json -Depth 50 | Set-Content $Path -Encoding UTF8
}

function Load-State {
  param([string]$Path)

  if (Test-Path $Path) {
    return (Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
  }

  return [pscustomobject]@{
    schema_version = 1
    started_at = (Get-Date).ToString("o")
    updated_at = (Get-Date).ToString("o")
    completed = @()
    deferred = @()
    blocked = @()
    last_integrated_head = ((& git -C $RepoRoot rev-parse HEAD).Trim())
  }
}

function Contains-Id {
  param(
    $Items,
    [string]$Id
  )

  foreach ($item in @($Items)) {
    if ([string]$item -eq $Id) {
      return $true
    }
  }
  return $false
}

& (Join-Path $PSScriptRoot "preflight.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) {
  exit 1
}

$runtime = Join-Path $RepoRoot ".jolcar-runtime"
$logs = Join-Path $runtime "logs"
New-Item -ItemType Directory -Force $logs | Out-Null

$statePath = Join-Path $runtime "state.json"
$summaryPath = Join-Path $runtime "summary.json"

$queuePath = Join-Path $RepoRoot "docs\jolcar-control\TASK_QUEUE.json"
$queue = Get-Content $queuePath -Raw -Encoding UTF8 | ConvertFrom-Json
$tasks = @($queue.tasks | Sort-Object order)
$state = Load-State -Path $statePath

$completed = @()
foreach ($item in @($state.completed)) {
  if ($item) { $completed += [string]$item }
}

$deferred = @()
foreach ($item in @($state.deferred)) {
  if ($item) { $deferred += $item }
}

$blocked = @()
foreach ($item in @($state.blocked)) {
  if ($item) { $blocked += $item }
}

$integratedThisRun = 0
$attemptedThisRun = 0

while ($true) {
  $dirty = & git -C $RepoRoot status --porcelain=v1
  if ($dirty) {
    throw ("Integration worktree unexpectedly dirty. Safety stop.`r`n" + ($dirty -join "`r`n"))
  }

  foreach ($task in $tasks) {
    $taskIdForGate = [string]$task.id

    if (Contains-Id -Items $completed -Id $taskIdForGate) {
      continue
    }

    $alreadyDeferred = $false
    foreach ($item in $deferred) {
      if ([string]$item.task_id -eq $taskIdForGate) {
        $alreadyDeferred = $true
        break
      }
    }

    $depsReady = $true
    foreach ($dep in @($task.dependencies)) {
      if (-not (Contains-Id -Items $completed -Id ([string]$dep))) {
        $depsReady = $false
        break
      }
    }

    if (-not $depsReady) {
      continue
    }

    if (($task.requires_user_authorization -eq $true) -and (-not $alreadyDeferred)) {
      $deferred += [pscustomobject]@{
        task_id = $taskIdForGate
        kind = "MANUAL_AUTHORIZATION"
        at = (Get-Date).ToString("o")
        reason = "Explicit user authorization required; autonomous runner will not execute it."
      }
    } elseif (($task.requires_user_decision -eq $true) -and (-not $alreadyDeferred)) {
      $deferred += [pscustomobject]@{
        task_id = $taskIdForGate
        kind = "USER_DECISION"
        at = (Get-Date).ToString("o")
        decision_ref = $task.decision_ref
        reason = "Unresolved decision gate. Runner continues independent tasks."
      }
    }
  }

  $nextTask = $null

  foreach ($task in $tasks) {
    $candidateId = [string]$task.id

    if (Contains-Id -Items $completed -Id $candidateId) {
      continue
    }

    if (($task.requires_user_authorization -eq $true) -or ($task.requires_user_decision -eq $true)) {
      continue
    }

    $isPermanentlyBlocked = $false
    foreach ($item in $blocked) {
      if (([string]$item.task_id -eq $candidateId) -and ($item.permanent -eq $true)) {
        $isPermanentlyBlocked = $true
        break
      }
    }

    if ($isPermanentlyBlocked) {
      continue
    }

    $depsReady = $true
    foreach ($dep in @($task.dependencies)) {
      if (-not (Contains-Id -Items $completed -Id ([string]$dep))) {
        $depsReady = $false
        break
      }
    }

    if ($depsReady) {
      $nextTask = $task
      break
    }
  }

  if (-not $nextTask) {
    break
  }

  if (($MaxTasks -gt 0) -and ($attemptedThisRun -ge $MaxTasks)) {
    break
  }

  $taskId = [string]$nextTask.id
  $previousFailure = ""
  $taskPassed = $false

  for ($attempt = 1; $attempt -le $MaxRepairAttempts; $attempt++) {
    $attemptedThisRun++

    Write-Host ""
    Write-Host "============================================================"
    Write-Host ("JOLCAR TASK " + $taskId + " - ATTEMPT " + $attempt + "/" + $MaxRepairAttempts)
    Write-Host "============================================================"

    $metaJson = & (Join-Path $PSScriptRoot "run-task.ps1") `
      -IntegrationRepo $RepoRoot `
      -TaskId $taskId `
      -Attempt $attempt `
      -PreviousFailure $previousFailure

    if (-not $metaJson) {
      $previousFailure = "run-task.ps1 returned no metadata."
      continue
    }

    $meta = $metaJson | ConvertFrom-Json
    $result = Get-Content $meta.ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json

    & (Join-Path $PSScriptRoot "safety-check.ps1") -ResultFile $meta.ResultFile

    if ([string]$result.task_id -ne $taskId) {
      throw ("Task result ID mismatch. Expected " + $taskId + ", got " + [string]$result.task_id)
    }

    if ([string]$result.status -eq "PASS") {
      $taskStatus = & git -C $meta.TaskWorktree status --porcelain=v1
      if ($taskStatus) {
        $previousFailure = "PASS was reported but task worktree is dirty.`r`n" + ($taskStatus -join "`r`n")
        continue
      }

      $taskHead = ((& git -C $meta.TaskWorktree rev-parse HEAD).Trim())
      $countText = ((& git -C $meta.TaskWorktree rev-list --count ($meta.BaseHead + ".." + $taskHead)).Trim())
      $count = [int]$countText

      if ($count -gt 1) {
        $previousFailure = "Task created more than one commit (" + $count + "). One task may integrate at most one focused commit."
        continue
      }

      if ($count -eq 1) {
        $commit = ((& git -C $meta.TaskWorktree rev-parse HEAD).Trim())
        Write-Host ("Integrating PASS commit " + $commit)

        & git -C $RepoRoot cherry-pick $commit | Out-Host
        if ($LASTEXITCODE -ne 0) {
          throw "Cherry-pick conflict or integration failure. Safety stop."
        }

        $integratedThisRun++
      } else {
        if (-not $result.no_change_reason) {
          $previousFailure = "PASS with no commit requires a concrete no_change_reason."
          continue
        }
      }

      if (-not (Contains-Id -Items $completed -Id $taskId)) {
        $completed += $taskId
      }

      $taskPassed = $true

      & git -C $RepoRoot worktree remove $meta.TaskWorktree | Out-Host
      if ($LASTEXITCODE -eq 0) {
        & git -C $RepoRoot branch -d $meta.TaskBranch | Out-Null
      }

      break
    }

    $evidenceText = ""
    if ($result.evidence) {
      $evidenceText = (@($result.evidence) -join "`r`n")
    }

    $previousFailureParts = @(
      ("Previous status: " + [string]$result.status),
      ("Stop reason: " + [string]$result.stop_reason),
      ("Summary: " + [string]$result.summary),
      "Evidence:",
      $evidenceText,
      ("Failed isolated worktree preserved at: " + [string]$meta.TaskWorktree)
    )
    $previousFailure = $previousFailureParts -join "`r`n"

    Write-Warning ($taskId + " attempt " + $attempt + " did not PASS. A fresh repair attempt will be launched if allowed.")
  }

  if (-not $taskPassed) {
    $blocked += [pscustomobject]@{
      task_id = $taskId
      permanent = $true
      at = (Get-Date).ToString("o")
      reason = "Failed to PASS after " + $MaxRepairAttempts + " autonomous attempts."
      last_evidence = $previousFailure
    }
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

  Save-Json -Object $state -Path $statePath
}

$pending = @()
foreach ($task in $tasks) {
  if (-not (Contains-Id -Items $completed -Id ([string]$task.id))) {
    $pending += [string]$task.id
  }
}

if ($pending.Count -eq 0) {
  $overallStatus = "LOCAL_QUEUE_COMPLETE"
} elseif ($blocked.Count -gt 0) {
  $overallStatus = "LOCAL_PROGRESS_WITH_BLOCKERS"
} else {
  $overallStatus = "WAITING_ON_DECISION_OR_MANUAL_GATES"
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
  pending = @($pending)
  production_accessed = $false
  push_performed = $false
  deploy_performed = $false
  status = $overallStatus
}

Save-Json -Object $summary -Path $summaryPath

Write-Host ""
Write-Host "============================================================"
Write-Host "JOLCAR AUTONOMOUS RUN FINISHED"
Write-Host "============================================================"
Write-Host ("Completed: " + $completed.Count + "/" + $tasks.Count)
Write-Host ("Attempted this run: " + $attemptedThisRun)
Write-Host ("Integrated commits this run: " + $integratedThisRun)
Write-Host ("Deferred gates: " + $deferred.Count)
Write-Host ("Blocked tasks: " + $blocked.Count)
Write-Host ("Summary: " + $summaryPath)
