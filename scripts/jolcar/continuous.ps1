param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [int]$MaxRepairAttempts = 3,
  [int]$MaxTasks = 0
)

$ErrorActionPreference = "Stop"

function Save-Json {
  param($Object, [string]$Path)
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
  param($Items, [string]$Id)

  foreach ($item in @($Items)) {
    if ([string]$item -eq $Id) { return $true }
  }
  return $false
}

function Assert-SafeTaskPaths {
  param([string]$TaskWorktree)

  $changed = @(& git -C $TaskWorktree status --porcelain=v1)
  $bad = @()

  foreach ($line in $changed) {
    if (-not $line) { continue }
    $path = $line.Substring(3).Trim()

    # Rename status can contain "old -> new"; validate both sides.
    $paths = @($path)
    if ($path -match ' -> ') {
      $paths = @($path -split ' -> ')
    }

    foreach ($candidate in $paths) {
      $leaf = [System.IO.Path]::GetFileName($candidate)

      $allowedTemplate = (
        $leaf -eq ".env.example" -or
        $leaf -eq ".env.sample" -or
        $leaf -eq ".env.template"
      )

      $blockedEnv = (
        (-not $allowedTemplate) -and
        (
          $leaf -eq ".env" -or
          $leaf -match '^\.env\.(local|production|prod|staging|stage|development|dev|test)$'
        )
      )

      $blockedCredential = (
        $leaf -match '^(credentials|secrets)\.(json|ya?ml|toml|ini)$' -or
        $leaf -match '\.(pem|p12|pfx)$'
      )

      $blockedRuntime = ($candidate -like ".jolcar-runtime/*")

      if ($blockedEnv -or $blockedCredential -or $blockedRuntime) {
        $bad += $candidate
      }
    }
  }

  if ($bad.Count -gt 0) {
    throw ("Unsafe task paths detected; refusing orchestrator commit:`r`n" + ($bad -join "`r`n"))
  }
}


function Get-ResultDiagnosticText {
  param($Result)

  $parts = @(
    [string]$Result.stop_reason,
    [string]$Result.summary
  )

  foreach ($entry in @($Result.evidence)) {
    if (-not $entry) { continue }

    $entryText = [string]$entry
    $parts += $entryText

    # Evidence is usually prose, not a path. Strings such as
    # "VehicleCard uses aspect-[4/3]." contain wildcard metacharacters that
    # PowerShell's Test-Path treats as patterns. Diagnostic enrichment must
    # therefore use literal-path semantics and must never terminate the runner.
    try {
      if (Test-Path -LiteralPath $entryText -PathType Leaf -ErrorAction SilentlyContinue) {
        $parts += (Get-Content -LiteralPath $entryText -Raw -Encoding UTF8 -ErrorAction Stop)
      }
    } catch {
      # Optional diagnostic enrichment only.
    }
  }

  return ($parts -join "`r`n")
}

function Test-UsageLimitText {
  param([string]$Text)

  if (-not $Text) { return $false }

  return (
    $Text -match "(?i)you.?ve hit your usage limit" -or
    $Text -match "(?i)usage limit" -or
    $Text -match "(?i)purchase more credits" -or
    $Text -match "(?i)try again at\s+\d{1,2}:\d{2}\s*(AM|PM)"
  )
}

function Get-UsageResetDateTime {
  param([string]$Text)

  if (-not $Text) { return $null }

  $match = [regex]::Match(
    $Text,
    "(?i)try again at\s+(\d{1,2}:\d{2}\s*(?:AM|PM))"
  )

  if (-not $match.Success) { return $null }

  try {
    $timeOnly = [DateTime]::ParseExact(
      $match.Groups[1].Value.ToUpperInvariant(),
      "h:mm tt",
      [System.Globalization.CultureInfo]::InvariantCulture
    )

    $now = Get-Date
    $reset = Get-Date `
      -Year $now.Year `
      -Month $now.Month `
      -Day $now.Day `
      -Hour $timeOnly.Hour `
      -Minute $timeOnly.Minute `
      -Second 0

    if ($reset -le $now) {
      $reset = $reset.AddDays(1)
    }

    # Small safety margin so the very first retry is not a few seconds early.
    return $reset.AddMinutes(2)
  } catch {
    return $null
  }
}


function Test-DecisionRefsResolved {
  param(
    [string]$DecisionRef,
    [string]$DecisionFile
  )

  if ([string]::IsNullOrWhiteSpace($DecisionRef)) {
    return $false
  }

  if (-not (Test-Path -LiteralPath $DecisionFile -PathType Leaf)) {
    return $false
  }

  $text = Get-Content -LiteralPath $DecisionFile -Raw -Encoding UTF8
  $refs = @(
    $DecisionRef -split '/' |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ }
  )

  if ($refs.Count -eq 0) {
    return $false
  }

  foreach ($ref in $refs) {
    $pattern = "(?m)^\|\s*" + [regex]::Escape($ref) + "\s*\|\s*(DECIDED|APPROVED)\s*\|"
    if ($text -notmatch $pattern) {
      return $false
    }
  }

  return $true
}

& (Join-Path $PSScriptRoot "preflight.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { exit 1 }

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
    $gateId = [string]$task.id
    if (Contains-Id -Items $completed -Id $gateId) { continue }

    $alreadyDeferred = $false
    foreach ($item in $deferred) {
      if ([string]$item.task_id -eq $gateId) {
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
    if (-not $depsReady) { continue }

    if (($task.requires_user_authorization -eq $true) -and (-not $alreadyDeferred)) {
      $deferred += [pscustomobject]@{
        task_id = $gateId
        kind = "MANUAL_AUTHORIZATION"
        at = (Get-Date).ToString("o")
        reason = "Explicit user authorization required; autonomous runner will not execute it."
      }
    } elseif ($task.requires_user_decision -eq $true) {
      $decisionFile = Join-Path $RepoRoot "docs\jolcar-control\DECISIONS.md"

      if (Test-DecisionRefsResolved -DecisionRef ([string]$task.decision_ref) -DecisionFile $decisionFile) {
        if (-not (Contains-Id -Items $completed -Id $gateId)) {
          $completed += $gateId
          Write-Host (
            "DECISION GATE RESOLVED FROM DECISIONS.md: " +
            $gateId + " -> " + [string]$task.decision_ref
          )
        }

        # Remove stale USER_DECISION deferrals for an explicitly decided gate.
        $deferred = @(
          $deferred | Where-Object {
            [string]$_.task_id -ne $gateId
          }
        )
      } elseif (-not $alreadyDeferred) {
        $deferred += [pscustomobject]@{
          task_id = $gateId
          kind = "USER_DECISION"
          at = (Get-Date).ToString("o")
          decision_ref = $task.decision_ref
          reason = "Unresolved decision gate. Runner continues independent tasks."
        }
      }
    }
  }

  # Persist resolved decision gates even when no ordinary implementation task
  # becomes runnable in this loop. This makes DECISIONS.md the durable source of
  # truth while state.json remains the fast runtime cache.
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

  $nextTask = $null
  foreach ($task in $tasks) {
    $candidateId = [string]$task.id

    if (Contains-Id -Items $completed -Id $candidateId) { continue }
    if (($task.requires_user_authorization -eq $true) -or ($task.requires_user_decision -eq $true)) { continue }

    $isBlocked = $false
    foreach ($item in $blocked) {
      if (([string]$item.task_id -eq $candidateId) -and ($item.permanent -eq $true)) {
        $isBlocked = $true
        break
      }
    }
    if ($isBlocked) { continue }

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

  if (-not $nextTask) { break }
  if (($MaxTasks -gt 0) -and ($attemptedThisRun -ge $MaxTasks)) { break }

  $taskId = [string]$nextTask.id

  # --------------------------------------------------------------
  # TIER 0 — NO AI
  # Run deterministic host-side recovery/index/checks before Codex.
  # It may auto-complete only a strict same-HEAD verified no-change PASS.
  # All semantic/implementation uncertainty falls through to Codex.
  # --------------------------------------------------------------
  $tier0 = $null
  try {
    $tier0Json = & (Join-Path $PSScriptRoot "precheck-task.ps1") `
      -RepoRoot $RepoRoot `
      -TaskId $taskId

    if ($tier0Json) {
      $tier0 = $tier0Json | ConvertFrom-Json
    }
  } catch {
    Write-Warning (
      "Tier-0 precheck failed nonfatally for " + $taskId +
      ". Falling back to Codex. " + $_.Exception.Message
    )
  }

  if ($tier0 -and [string]$tier0.decision -eq "PASS") {
    Write-Host ""
    Write-Host ("TIER 0 NO-AI PASS: " + $taskId)
    Write-Host ([string]$tier0.reason)

    if (-not (Contains-Id -Items $completed -Id $taskId)) {
      $completed += $taskId
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

    # Do not increment attemptedThisRun because no Codex call was made.
    continue
  }

  $previousFailure = ""
  $taskPassed = $false
  $taskPausedForUsageLimit = $false
  $taskHardBlocked = $false

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

    if ([string]$result.task_id -ne $taskId) {
      throw ("Task result ID mismatch. Expected " + $taskId + ", got " + [string]$result.task_id)
    }

    # Validate obvious PASS invariants before safety-check.ps1. Previously a
    # malformed/internally inconsistent PASS (for example status=PASS while
    # tests_passed=false) caused safety-check.ps1 to throw and terminate the
    # entire autonomous run. It should only reject THIS attempt.
    if (
      [string]$result.status -eq "PASS" -and
      ($nextTask.verification.Count -gt 0) -and
      ($result.tests_passed -ne $true)
    ) {
      $testSummary = ""
      if ($result.tests) {
        $testSummary = (@($result.tests | Select-Object -First 6) -join "; ")
      }

      $previousFailure = (
        "Previous result was rejected: Codex returned PASS but required " +
        "verification had tests_passed=false. Tests: " + $testSummary + ". " +
        "On the repair attempt, run only acceptance-relevant verification. " +
        "Do not count an unrelated pre-existing baseline failure as task " +
        "verification; if required task verification itself cannot pass, " +
        "return FAIL or BLOCKED, not PASS."
      )

      Write-Warning (
        $taskId + " returned an invalid PASS (tests_passed=false). " +
        "Treating this as a failed attempt instead of stopping the runner."
      )
      continue
    }

    if ([string]$result.status -eq "PASS" -and $result.commit) {
      $previousFailure = (
        "Previous PASS was rejected because Codex attempted to own Git metadata. " +
        "Return commit=null; the outer orchestrator owns add/commit/cherry-pick."
      )
      Write-Warning ($taskId + " returned an invalid PASS with commit metadata. Retrying safely.")
      continue
    }

    $safetyAccepted = $true
    try {
      & (Join-Path $PSScriptRoot "safety-check.ps1") -ResultFile $meta.ResultFile
      if ($LASTEXITCODE -ne 0) {
        $safetyAccepted = $false
      }
    } catch {
      $safetyAccepted = $false
      $previousFailure = (
        "Previous task result was rejected by the local safety policy: " +
        $_.Exception.Message
      )
    }

    if (-not $safetyAccepted) {
      if ([string]::IsNullOrWhiteSpace($previousFailure)) {
        $previousFailure = "Previous task result was rejected by the local safety policy."
      }

      Write-Warning (
        $taskId + " result failed safety validation. " +
        "The autonomous run will continue with a fresh repair attempt."
      )
      continue
    }

    # If Codex completed the task but a LOCAL Windows sandbox EPERM prevented only
    # the final executable verification, allow the outer host to run explicitly
    # requested, tightly allow-listed verification commands. No arbitrary shell.
    if (
      [string]$result.status -eq "BLOCKED" -and
      (
        [string]$result.stop_reason -match "(?i)\bEPERM\b" -or
        [string]$result.stop_reason -match "(?i)(denied|cannot|could not|unable to)\s+(spawn|spawning).*(cmd\.exe|docker)" -or
        [string]$result.stop_reason -match "(?i)(cmd\.exe|docker).*(denied|blocked|cannot|could not|unable)" -or
        [string]$result.stop_reason -match "(?i)windows sandbox.*(cmd\.exe|docker)" -or
        [string]$result.stop_reason -match "(?i)(cmd\.exe|docker).*windows sandbox"
      )
    ) {
      try {
        $hostVerifyJson = & (Join-Path $PSScriptRoot "host-verify-blocked.ps1") `
          -RepoRoot $RepoRoot `
          -TaskWorktree $meta.TaskWorktree `
          -ResultFile $meta.ResultFile

        if ($hostVerifyJson) {
          $hostVerify = $hostVerifyJson | ConvertFrom-Json

          if ($hostVerify.attempted -eq $true -and $hostVerify.passed -eq $true) {
            Write-Host ("HOST VERIFICATION BRIDGE PASS: " + $taskId)

            $result.status = "PASS"
            $result.tests_passed = $true
            $result.stop_reason = $null

            $hostEvidence = @()
            foreach ($check in @($hostVerify.checks)) {
              $hostEvidence += (
                "HOST PASS: " + [string]$check.command
              )
            }

            $result.evidence = @($result.evidence) + @($hostEvidence)

            # Persist the converted local-only result so recovery/audit evidence
            # reflects what the outer host actually proved.
            $result | ConvertTo-Json -Depth 30 | Set-Content $meta.ResultFile -Encoding UTF8

            & (Join-Path $PSScriptRoot "safety-check.ps1") -ResultFile $meta.ResultFile
          }
        }
      } catch {
        Write-Warning (
          "Host verification bridge failed nonfatally for " + $taskId +
          ": " + $_.Exception.Message
        )
      }
    }

    $diagnosticText = Get-ResultDiagnosticText -Result $result
    if (Test-UsageLimitText -Text $diagnosticText) {
      $resetAt = Get-UsageResetDateTime -Text $diagnosticText

      if ($resetAt) {
        $seconds = [int][Math]::Ceiling(($resetAt - (Get-Date)).TotalSeconds)
        if ($seconds -lt 1) { $seconds = 1 }

        Write-Warning (
          "Codex usage limit reached. This is NOT a task failure. " +
          "Runner will wait until " + $resetAt.ToString("yyyy-MM-dd HH:mm:ss") +
          " and retry the same task without consuming a repair attempt."
        )

        Start-Sleep -Seconds $seconds

        # The for-loop increments at the end of the iteration. Decrement here so
        # the retry keeps the same logical repair-attempt number.
        $attempt--
        continue
      }

      $deferred += [pscustomobject]@{
        task_id = $taskId
        kind = "USAGE_LIMIT"
        at = (Get-Date).ToString("o")
        reason = "Codex usage limit reached and reset time could not be parsed. Task was not marked blocked."
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

      Write-Warning "Usage limit detected without a parseable reset time. Pausing the autonomous run without blocking the task."
      $taskPausedForUsageLimit = $true
      break
    }

    if ([string]$result.status -eq "PASS") {
      if ($result.commit) {
        $previousFailure = "Codex attempted to own the Git commit contract. commit must be null; orchestrator owns Git metadata."
        continue
      }

      if (($nextTask.verification.Count -gt 0) -and ($result.tests_passed -ne $true)) {
        $previousFailure = "PASS reported without required verification/tests_passed=true."
        continue
      }

      Assert-SafeTaskPaths -TaskWorktree $meta.TaskWorktree

      & git -C $meta.TaskWorktree diff --check
      if ($LASTEXITCODE -ne 0) {
        $previousFailure = "git diff --check failed for task changes."
        continue
      }

      $taskStatus = @(& git -C $meta.TaskWorktree status --porcelain=v1)

      if ($taskStatus.Count -gt 0) {
        # The outer PowerShell process is intentionally outside the Codex sandbox
        # and owns Git metadata writes for the isolated task worktree.
        & git -C $meta.TaskWorktree add -A
        if ($LASTEXITCODE -ne 0) {
          $previousFailure = "Outer orchestrator failed to stage task changes."
          continue
        }

        & git -C $meta.TaskWorktree diff --cached --check
        if ($LASTEXITCODE -ne 0) {
          & git -C $meta.TaskWorktree reset | Out-Null
          $previousFailure = "Staged diff failed git diff --cached --check."
          continue
        }

        $subject = ([string]$nextTask.title -replace '[\r\n]+', ' ').Trim()
        if ($subject.Length -gt 72) {
          $subject = $subject.Substring(0,72).TrimEnd()
        }
        $message = $taskId + ": " + $subject

        & git -C $meta.TaskWorktree -c gc.auto=0 -c maintenance.auto=false commit -m $message | Out-Host
        if ($LASTEXITCODE -ne 0) {
          $previousFailure = "Outer orchestrator could not commit verified task changes."
          continue
        }

        $postCommitStatus = & git -C $meta.TaskWorktree status --porcelain=v1
        if ($postCommitStatus) {
          $previousFailure = "Task worktree remained dirty after orchestrator commit."
          continue
        }

        $commit = ((& git -C $meta.TaskWorktree rev-parse HEAD).Trim())
        Write-Host ("Integrating orchestrator-owned PASS commit " + $commit)

        & git -C $RepoRoot -c gc.auto=0 -c maintenance.auto=false cherry-pick $commit | Out-Host
        if ($LASTEXITCODE -ne 0) {
          throw "Cherry-pick conflict or integration failure. Safety stop."
        }

        $integratedThisRun++
      } else {
        if (-not $result.no_change_reason) {
          $previousFailure = "PASS with no task changes requires no_change_reason."
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
      $evidenceText = (@($result.evidence | Select-Object -First 6) -join "; ")
    }

    $previousFailure = @(
      ("status=" + [string]$result.status),
      ("stop=" + [string]$result.stop_reason),
      ("summary=" + [string]$result.summary),
      ("evidence=" + $evidenceText)
    ) -join "`r`n"

    if ([string]$result.status -eq "BLOCKED") {
      # BLOCKED means the model has identified a prerequisite/infrastructure/
      # authorization condition that another identical fresh attempt cannot fix.
      # Repeating it burns allowance without adding information.
      $taskHardBlocked = $true
      Write-Warning ($taskId + " returned BLOCKED. Economy mode will not spend additional Codex attempts on the same blocker.")
      break
    }

    Write-Warning ($taskId + " attempt " + $attempt + " failed. Economy mode will retry only while repair attempts remain.")
  }

  if ((-not $taskPassed) -and (-not $taskPausedForUsageLimit)) {
    if ($taskHardBlocked) {
      $blockReason = "Codex returned BLOCKED; no duplicate retries were spent in economy mode."
    } else {
      $blockReason = "Failed to PASS after " + $MaxRepairAttempts + " autonomous attempts."
    }

    $blocked += [pscustomobject]@{
      task_id = $taskId
      permanent = $true
      at = (Get-Date).ToString("o")
      reason = $blockReason
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

  if ($taskPausedForUsageLimit) {
    break
  }
}

$pending = @()
foreach ($task in $tasks) {
  if (-not (Contains-Id -Items $completed -Id ([string]$task.id))) {
    $pending += [string]$task.id
  }
}

$hasUsageLimitDeferred = $false
foreach ($entry in $deferred) {
  if ([string]$entry.kind -eq "USAGE_LIMIT") {
    $hasUsageLimitDeferred = $true
    break
  }
}

if ($pending.Count -eq 0) {
  $overallStatus = "LOCAL_QUEUE_COMPLETE"
} elseif ($hasUsageLimitDeferred) {
  $overallStatus = "PAUSED_USAGE_LIMIT"
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
