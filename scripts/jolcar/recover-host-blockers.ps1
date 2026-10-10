param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot,

  [string[]]$TaskIds = @("JLC-0306","JLC-0401","JLC-0801")
)

$ErrorActionPreference = "Stop"

function Contains-Id {
  param($Items, [string]$Id)
  foreach ($item in @($Items)) {
    if ([string]$item -eq $Id) { return $true }
  }
  return $false
}

function Get-LatestResult {
  param([string]$Logs, [string]$TaskId)

  Get-ChildItem (Join-Path $Logs ($TaskId + "-*-result.json")) -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Get-TaskWorktree {
  param(
    [string]$RepoRoot,
    [string]$TaskId,
    [string]$StartingHead
  )

  $records = @()
  $current = $null

  foreach ($line in @(& git -C $RepoRoot worktree list --porcelain) + @("")) {
    if ($line -like "worktree *") {
      $current = [ordered]@{
        path = $line.Substring(9)
        head = $null
        branch = $null
      }
      continue
    }

    if (-not $current) { continue }

    if ($line -like "HEAD *") {
      $current.head = $line.Substring(5)
      continue
    }

    if ($line -like "branch refs/heads/*") {
      $current.branch = $line.Substring(18)
      continue
    }

    if ($line -eq "") {
      if (
        $current.branch -like ("jolcar/task/" + $TaskId + "-*") -and
        (
          [string]::IsNullOrWhiteSpace($StartingHead) -or
          [string]$current.head -eq $StartingHead
        )
      ) {
        $records += [pscustomobject]$current
      }
      $current = $null
    }
  }

  $records | Sort-Object branch -Descending | Select-Object -First 1
}

function Ensure-TaskDependencies {
  param(
    [string]$RepoRoot,
    [string]$TaskRoot
  )

  $sourceModules = Join-Path $RepoRoot "apps\web\node_modules"
  $targetModules = Join-Path $TaskRoot "apps\web\node_modules"

  if (Test-Path -LiteralPath $targetModules) {
    return
  }

  if (-not (Test-Path -LiteralPath $sourceModules)) {
    throw "apps/web/node_modules is unavailable in integration repo."
  }

  $effectiveSource = $sourceModules
  try {
    $item = Get-Item -LiteralPath $sourceModules -Force
    if ($item.LinkType -eq "Junction" -and $item.Target -and $item.Target.Count -gt 0) {
      $candidate = [string]$item.Target[0]
      if (Test-Path -LiteralPath $candidate) {
        $effectiveSource = $candidate
      }
    }
  } catch {}

  New-Item -ItemType Junction -Path $targetModules -Target $effectiveSource | Out-Null
}

function Assert-SafeChangedPaths {
  param([string]$TaskRoot)

  $bad = @()
  foreach ($line in @(& git -C $TaskRoot status --porcelain=v1)) {
    if (-not $line) { continue }

    $path = $line.Substring(3).Trim()
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

      $blocked = (
        ((-not $allowedTemplate) -and (
          $leaf -eq ".env" -or
          $leaf -match '^\.env\.(local|production|prod|staging|stage|development|dev|test)$'
        )) -or
        $leaf -match '^(credentials|secrets)\.(json|ya?ml|toml|ini)$' -or
        $leaf -match '\.(pem|p12|pfx)$' -or
        $candidate -like ".jolcar-runtime/*"
      )

      if ($blocked) {
        $bad += $candidate
      }
    }
  }

  if ($bad.Count -gt 0) {
    throw ("Unsafe changed paths:`r`n" + ($bad -join "`r`n"))
  }
}

function Update-StateComplete {
  param(
    [string]$RepoRoot,
    [string]$StatePath,
    [string]$TaskId
  )

  $state = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json

  $completed = @()
  foreach ($item in @($state.completed)) {
    if ($item) { $completed += [string]$item }
  }
  if (-not (Contains-Id -Items $completed -Id $TaskId)) {
    $completed += $TaskId
  }

  $blocked = @()
  foreach ($entry in @($state.blocked)) {
    if ([string]$entry.task_id -ne $TaskId) {
      $blocked += $entry
    }
  }

  $deferred = @()
  foreach ($entry in @($state.deferred)) {
    if ([string]$entry.task_id -ne $TaskId) {
      $deferred += $entry
    }
  }

  [ordered]@{
    schema_version = $state.schema_version
    started_at = $state.started_at
    updated_at = (Get-Date).ToString("o")
    completed = @($completed)
    deferred = @($deferred)
    blocked = @($blocked)
    last_integrated_head = ((& git -C $RepoRoot rev-parse HEAD).Trim())
  } | ConvertTo-Json -Depth 50 | Set-Content $StatePath -Encoding UTF8
}

$runtime = Join-Path $RepoRoot ".jolcar-runtime"
$logs = Join-Path $runtime "logs"
$statePath = Join-Path $runtime "state.json"
$hostVerifier = Join-Path $RepoRoot "scripts\jolcar\host-verify-blocked.ps1"
$safetyCheck = Join-Path $RepoRoot "scripts\jolcar\safety-check.ps1"

if (-not (Test-Path -LiteralPath $statePath)) {
  throw "Runner state missing."
}

$summary = @()

foreach ($taskId in $TaskIds) {
  Write-Host ""
  Write-Host ("===== RECOVER " + $taskId + " =====")

  $stateNow = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
  if (Contains-Id -Items @($stateNow.completed) -Id $taskId) {
    Write-Host ($taskId + " already completed.")
    $summary += [pscustomobject]@{ task_id=$taskId; recovered=$true; detail="already completed" }
    continue
  }

  $latest = Get-LatestResult -Logs $logs -TaskId $taskId
  if (-not $latest) {
    Write-Warning ($taskId + ": no result file found.")
    $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail="no result" }
    continue
  }

  $result = Get-Content -LiteralPath $latest.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  if ([string]$result.status -ne "BLOCKED") {
    Write-Warning ($taskId + ": latest result is not BLOCKED.")
    $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail="latest result not blocked" }
    continue
  }

  $wt = Get-TaskWorktree -RepoRoot $RepoRoot -TaskId $taskId -StartingHead ([string]$result.starting_head)

  # No-change audit tasks may not need a preserved task worktree. If the exact
  # failed worktree exists, use it. Otherwise only JLC-0801 may safely verify on
  # the integration tree because its previous result explicitly says no files changed.
  if (-not $wt) {
    if (
      $taskId -eq "JLC-0801" -and
      (
        $result.working_tree_clean -eq $true -or
        (@($result.evidence) -join " ") -match "(?i)no files changed|git status clean"
      )
    ) {
      $taskRoot = $RepoRoot
      $usingIntegrationTree = $true
    } else {
      Write-Warning ($taskId + ": preserved task worktree not found.")
      $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail="worktree missing" }
      continue
    }
  } else {
    $taskRoot = [string]$wt.path
    $usingIntegrationTree = $false
    Ensure-TaskDependencies -RepoRoot $RepoRoot -TaskRoot $taskRoot
  }

  # JLC-0801 had one requested host runtime test plus two already-passing related
  # tests. Re-run all three on the host so its no-change PASS is self-contained.
  $verificationResultFile = $latest.FullName
  $tempResult = $null

  if ($taskId -eq "JLC-0801") {
    $clone = $result | ConvertTo-Json -Depth 30 | ConvertFrom-Json
    $clone.evidence = @(
      "HOST_VERIFY_NODE:apps/web/scripts/functional-03b-a1.test.cjs",
      "HOST_VERIFY_NODE:apps/web/scripts/functional-03b-a2.test.cjs",
      "HOST_VERIFY_NODE:apps/web/scripts/functional-03b-c.test.cjs"
    )

    $tempResult = Join-Path $runtime ("recover-" + $taskId + "-" + (Get-Date -Format "yyyyMMdd-HHmmssfff") + ".json")
    $clone | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $tempResult -Encoding UTF8
    $verificationResultFile = $tempResult
  }

  try {
    $hostJson = & $hostVerifier `
      -RepoRoot $RepoRoot `
      -TaskWorktree $taskRoot `
      -ResultFile $verificationResultFile

    if (-not $hostJson) {
      Write-Warning ($taskId + ": host verifier returned no result.")
      $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail="host verifier empty" }
      continue
    }

    $hostResult = $hostJson | ConvertFrom-Json
    if ($hostResult.attempted -ne $true -or $hostResult.passed -ne $true) {
      Write-Warning ($taskId + ": host verification did not PASS: " + [string]$hostResult.reason)
      $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail=[string]$hostResult.reason }
      continue
    }

    Write-Host ($taskId + " host verification: PASS")
    foreach ($check in @($hostResult.checks)) {
      Write-Host ("  PASS: " + [string]$check.command)
    }

    if (-not $usingIntegrationTree) {
      Assert-SafeChangedPaths -TaskRoot $taskRoot

      & git -C $taskRoot diff --check
      if ($LASTEXITCODE -ne 0) {
        Write-Warning ($taskId + ": git diff --check failed.")
        $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail="diff check failed" }
        continue
      }
    }

    $result.status = "PASS"
    $result.tests_passed = $true
    $result.stop_reason = $null

    $hostEvidence = @()
    foreach ($check in @($hostResult.checks)) {
      $hostEvidence += ("HOST PASS: " + [string]$check.command)
    }
    $result.evidence = @($result.evidence) + @($hostEvidence)

    $taskStatus = @()
    if (-not $usingIntegrationTree) {
      $taskStatus = @(& git -C $taskRoot status --porcelain=v1)
    }

    if ($taskStatus.Count -gt 0) {
      $result.working_tree_clean = $false
      $result.commit = $null

      $recoveryResult = Join-Path $logs ($taskId + "-host-recovery-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-result.json")
      $result | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $recoveryResult -Encoding UTF8

      & $safetyCheck -ResultFile $recoveryResult | Out-Host
      if ($LASTEXITCODE -ne 0) {
        Write-Warning ($taskId + ": recovery safety-check failed.")
        $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail="safety-check failed" }
        continue
      }

      & git -C $taskRoot add -A
      if ($LASTEXITCODE -ne 0) { throw ($taskId + ": git add failed") }

      & git -C $taskRoot diff --cached --check
      if ($LASTEXITCODE -ne 0) { throw ($taskId + ": staged diff check failed") }

      $queue = Get-Content (Join-Path $RepoRoot "docs\jolcar-control\TASK_QUEUE.json") -Raw -Encoding UTF8 | ConvertFrom-Json
      $task = $queue.tasks | Where-Object { [string]$_.id -eq $taskId } | Select-Object -First 1
      $subject = ([string]$task.title -replace '[\r\n]+',' ').Trim()
      if ($subject.Length -gt 72) { $subject = $subject.Substring(0,72).TrimEnd() }

      & git -C $taskRoot -c gc.auto=0 -c maintenance.auto=false commit -m ($taskId + ": " + $subject) | Out-Host
      if ($LASTEXITCODE -ne 0) { throw ($taskId + ": commit failed") }

      $commit = ((& git -C $taskRoot rev-parse HEAD).Trim())

      & git -C $RepoRoot -c gc.auto=0 -c maintenance.auto=false cherry-pick $commit | Out-Host
      if ($LASTEXITCODE -ne 0) {
        throw ($taskId + ": cherry-pick failed; safety stop")
      }

      Update-StateComplete -RepoRoot $RepoRoot -StatePath $statePath -TaskId $taskId

      & git -C $RepoRoot worktree remove $taskRoot | Out-Host
      if ($LASTEXITCODE -eq 0 -and $wt.branch) {
        & git -C $RepoRoot branch -D ([string]$wt.branch) | Out-Null
      }

      Write-Host ($taskId + " recovered and integrated: " + $commit)
      $summary += [pscustomobject]@{ task_id=$taskId; recovered=$true; detail=("integrated " + $commit) }
    } else {
      $result.working_tree_clean = $true
      $result.commit = $null
      if ([string]::IsNullOrWhiteSpace([string]$result.no_change_reason)) {
        $result.no_change_reason = "Existing implementation satisfied acceptance criteria; previously blocked host-only runtime verification now passed outside the Codex Windows sandbox."
      }

      $recoveryResult = Join-Path $logs ($taskId + "-host-recovery-" + (Get-Date -Format "yyyyMMdd-HHmmss") + "-result.json")
      $result | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $recoveryResult -Encoding UTF8

      & $safetyCheck -ResultFile $recoveryResult | Out-Host
      if ($LASTEXITCODE -ne 0) {
        Write-Warning ($taskId + ": recovery safety-check failed.")
        $summary += [pscustomobject]@{ task_id=$taskId; recovered=$false; detail="safety-check failed" }
        continue
      }

      Update-StateComplete -RepoRoot $RepoRoot -StatePath $statePath -TaskId $taskId
      Write-Host ($taskId + " recovered as verified no-change PASS.")
      $summary += [pscustomobject]@{ task_id=$taskId; recovered=$true; detail="verified no-change PASS" }
    }
  } finally {
    if ($tempResult -and (Test-Path -LiteralPath $tempResult)) {
      Remove-Item -LiteralPath $tempResult -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host ""
Write-Host "===== BLOCKER RECOVERY SUMMARY ====="
$summary | Format-Table -AutoSize
