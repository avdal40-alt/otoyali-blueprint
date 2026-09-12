[CmdletBinding()]
param(
    [switch]$DryRun,
    [ValidateRange(0, 3)]
    [int]$MaxTransientRetries = 2
)

$ErrorActionPreference = 'Stop'
$script:LockOwned = $false
$script:RuntimePath = $null
$script:LockPath = $null

function Write-SupervisorLog([string]$Message) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K') $Message"
    Write-Output $line
    if ($null -ne $script:RuntimePath -and (Test-Path -LiteralPath $script:RuntimePath)) {
        Add-Content -LiteralPath (Join-Path $script:RuntimePath 'supervisor.log') -Value $line
    }
}

function Write-RunResult([string]$Status, [string]$Stage, [string]$StartingHead, [string]$EndingHead, [string]$Commit, [string]$NextStage, [bool]$Clean, [bool]$TestsPassed, [string[]]$Tests, [string]$Reason) {
    $result = [ordered]@{
        status = $Status; stage = $Stage; starting_head = $StartingHead; ending_head = $EndingHead
        commit = $Commit; next_stage = $NextStage; worktree_clean = $Clean; tests_passed = $TestsPassed
        tests = @($Tests); push_performed = $false; production_accessed = $false; stop_reason = $Reason
    }
    $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $script:RuntimePath 'last-run.json') -Encoding utf8
}

function Get-Git([string[]]$Arguments) {
    $value = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed." }
    return @($value | Where-Object { $null -ne $_ })
}

function Get-StateValue([string]$State, [string]$Label) {
    $match = [regex]::Match($State, "(?m)^\\|\\s*$([regex]::Escape($Label))\\s*\\|\\s*(.+?)\\s*\\|$")
    if (-not $match.Success) { throw "AUTOPILOT_STATE is missing '$Label'." }
    return $match.Groups[1].Value.Trim()
}

function Get-StateSnapshot([string]$RepoRoot) {
    $statePath = Join-Path $RepoRoot 'docs/autopilot/AUTOPILOT_STATE.md'
    $state = Get-Content -LiteralPath $statePath -Raw
    $next = Get-StateValue $state 'Next approved stage'
    $lastStage = Get-StateValue $state 'Last completed product stage'
    $lastCommit = Get-StateValue $state 'Last completed stage commit'
    $countMatch = [regex]::Match($state, '(?m)^\*\*Stages completed in current run:\*\*\s*`?(\d+)`?\s*$')
    if (-not $countMatch.Success) { throw 'AUTOPILOT_STATE has an invalid current-run stage counter.' }
    [pscustomobject]@{ NextStage = $next; LastStage = $lastStage; LastCommit = $lastCommit; StageCount = [int]$countMatch.Groups[1].Value }
}

function Assert-Ready([string]$RepoRoot) {
    & (Join-Path $RepoRoot 'scripts/autopilot/preflight.ps1') -RequireClean
    if ($LASTEXITCODE -ne 0) { throw 'PREFLIGHT_FAILED' }
    $snapshot = Get-StateSnapshot $RepoRoot
    $head = (@(Get-Git @('rev-parse', 'HEAD'))[0]).Trim()
    $commitMatch = [regex]::Match($snapshot.LastCommit, '[0-9a-f]{40}')
    if (-not $commitMatch.Success) { throw 'GIT_STATE_INCONSISTENCY: State last completed stage commit is not a full hash.' }
    & git cat-file -e "$($commitMatch.Value)^{commit}"
    if ($LASTEXITCODE -ne 0) { throw 'GIT_STATE_INCONSISTENCY: State stage commit is unavailable.' }
    & git merge-base --is-ancestor $commitMatch.Value $head
    if ($LASTEXITCODE -ne 0) { throw 'GIT_STATE_INCONSISTENCY: State stage commit is not an ancestor of HEAD.' }
    $stageId = ($snapshot.NextStage -split '\s+')[0]
    if ([string]::IsNullOrWhiteSpace($stageId) -or -not (Select-String -LiteralPath (Join-Path $RepoRoot 'docs/autopilot/IMPLEMENTATION_ROADMAP_V1.md') -SimpleMatch $stageId -Quiet)) {
        throw 'NO_APPROVED_NEXT_STAGE'
    }
    return [pscustomobject]@{ Head = $head; State = $snapshot; StageId = $stageId }
}

function Acquire-Lock([string]$RuntimePath) {
    $script:LockPath = Join-Path $RuntimePath 'supervisor.lock'
    if (Test-Path -LiteralPath $script:LockPath) {
        $existing = Get-Content -LiteralPath $script:LockPath -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($null -ne $existing -and $null -ne $existing.pid -and (Get-Process -Id ([int]$existing.pid) -ErrorAction SilentlyContinue)) {
            throw 'SUPERVISOR_ALREADY_RUNNING'
        }
        throw 'STALE_LOCK_RECOVERY_REQUIRED'
    }
    New-Item -ItemType File -Path $script:LockPath -ErrorAction Stop | Out-Null
    [ordered]@{ pid = $PID; started_at = (Get-Date).ToString('o'); repository = (@(Get-Git @('rev-parse', '--show-toplevel'))[0]).Trim() } | ConvertTo-Json | Set-Content -LiteralPath $script:LockPath -Encoding utf8
    $script:LockOwned = $true
}

function Release-Lock() {
    if ($script:LockOwned -and (Test-Path -LiteralPath $script:LockPath)) {
        Remove-Item -LiteralPath $script:LockPath -Force
    }
    $script:LockOwned = $false
}

function Test-StopRequested() { return Test-Path -LiteralPath (Join-Path $script:RuntimePath 'STOP') }

function Test-TransientFailure([string]$Text) {
    return $Text -match '(?i)(temporary|temporarily|rate limit|network|connection|service unavailable|timeout)'
}

function Invoke-Stage([string]$RepoRoot, [string]$StartingHead) {
    $promptPath = Join-Path $RepoRoot 'scripts/autopilot/stage-prompt.md'
    $schemaPath = Join-Path $RepoRoot 'scripts/autopilot/stage-result.schema.json'
    $lastMessagePath = Join-Path $script:RuntimePath 'last-message.json'
    Remove-Item -LiteralPath (Join-Path $script:RuntimePath 'last-run.json') -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $lastMessagePath -Force -ErrorAction SilentlyContinue
    Write-SupervisorLog "CODEX_START stage=$StartingHead sandbox=workspace-write"
    Get-Content -LiteralPath $promptPath -Raw | & codex exec --sandbox workspace-write --cd $RepoRoot --output-schema $schemaPath --output-last-message $lastMessagePath -
    $exitCode = $LASTEXITCODE
    Write-SupervisorLog "CODEX_END exit_code=$exitCode"
    return $exitCode
}

function Assert-StagePass([string]$RepoRoot, [object]$Before, [int]$ExitCode) {
    $resultPath = Join-Path $script:RuntimePath 'last-run.json'
    if (-not (Test-Path -LiteralPath $resultPath)) { throw 'MACHINE_RESULT_MISSING' }
    try { $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { throw 'MACHINE_RESULT_INVALID_JSON' }
    $head = (@(Get-Git @('rev-parse', 'HEAD'))[0]).Trim()
    $clean = @(Get-Git @('status', '--short')).Count -eq 0
    if (-not $clean) { throw 'INTERRUPTED_STAGE_RECOVERY_REQUIRED' }
    if ($ExitCode -ne 0) { throw "CODEX_EXIT_$ExitCode" }
    $required = @('status','stage','starting_head','ending_head','commit','next_stage','worktree_clean','tests_passed','tests','push_performed','production_accessed','stop_reason')
    if (@($required | Where-Object { $null -eq $result.PSObject.Properties[$_] }).Count -gt 0) { throw 'MACHINE_RESULT_CONTRACT_INVALID' }
    if ($result.status -ne 'PASS' -or $result.stage -ne $Before.State.NextStage -or $result.starting_head -ne $Before.Head -or $result.ending_head -ne $head -or $result.commit -ne $head -or -not $result.worktree_clean -or -not $result.tests_passed -or $result.push_performed -or $result.production_accessed -or $null -ne $result.stop_reason) { throw 'MACHINE_RESULT_CLAIM_REJECTED' }
    $commitCount = [int](@(Get-Git @('rev-list', '--count', "$($Before.Head)..$head"))[0])
    if ($commitCount -ne 1) { throw 'EXPECTED_EXACTLY_ONE_STAGE_COMMIT' }
    $after = Get-StateSnapshot $RepoRoot
    if ($after.LastStage -ne $Before.State.NextStage -or $after.NextStage -ne $result.next_stage -or $after.StageCount -ne ($Before.State.StageCount + 1)) { throw 'GIT_STATE_INCONSISTENCY_AFTER_STAGE' }
    if ($null -eq $result.tests -or @($result.tests).Count -eq 0) { throw 'MACHINE_RESULT_TESTS_MISSING' }
    & (Join-Path $RepoRoot 'scripts/autopilot/test.ps1') -Mode Targeted -Tests @($result.tests)
    if ($LASTEXITCODE -ne 0) { throw 'SUPERVISOR_TEST_RECHECK_FAILED' }
    & (Join-Path $RepoRoot 'scripts/autopilot/safety-check.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'SAFETY_CHECK_FAILED' }
    return $after
}

try {
    $repoRoot = (@(Get-Git @('rev-parse', '--show-toplevel'))[0]).Trim()
    if ($repoRoot -ieq 'C:\Проекты\Otoyali-blueprint') { throw 'FORBIDDEN_REPOSITORY' }
    $script:RuntimePath = Join-Path $repoRoot '.autopilot-runtime'
    New-Item -ItemType Directory -Path $script:RuntimePath -Force | Out-Null
    Acquire-Lock $script:RuntimePath
    Write-SupervisorLog "SUPERVISOR_START dry_run=$DryRun"
    if (Test-StopRequested) { Write-SupervisorLog 'STOP_MARKER_DETECTED'; exit 0 }
    $ready = Assert-Ready $repoRoot
    if ($DryRun) {
        Write-SupervisorLog "DRY_RUN stage=$($ready.State.NextStage) command=codex exec --sandbox workspace-write --cd $repoRoot --output-schema scripts/autopilot/stage-result.schema.json --output-last-message .autopilot-runtime/last-message.json -"
        Write-RunResult 'BLOCKED' $ready.State.NextStage $ready.Head $ready.Head $null $ready.State.NextStage $true $false @() 'DRY_RUN_NO_CODEX_EXECUTION'
        exit 0
    }
    $successfulStages = 0
    while ($true) {
        if (Test-StopRequested) { Write-SupervisorLog 'STOP_MARKER_DETECTED'; exit 0 }
        $ready = Assert-Ready $repoRoot
        $attempt = 0
        do {
            $exitCode = Invoke-Stage $repoRoot $ready.Head
            try {
                $after = Assert-StagePass $repoRoot $ready $exitCode
                $passed = $true
            } catch {
                $passed = $false
                $failure = $_.Exception.Message
            }
            if ($passed) { break }
            $dirty = @(Get-Git @('status', '--short')).Count -gt 0
            $evidence = (Get-Content -LiteralPath (Join-Path $script:RuntimePath 'last-message.json') -Raw -ErrorAction SilentlyContinue)
            if ($dirty) { throw 'INTERRUPTED_STAGE_RECOVERY_REQUIRED' }
            if ($attempt -ge $MaxTransientRetries -or -not (Test-TransientFailure "$failure $evidence")) { throw $failure }
            $attempt++
            $seconds = 15 * $attempt
            Write-SupervisorLog "TRANSIENT_RETRY attempt=$attempt wait_seconds=$seconds reason=$failure"
            Start-Sleep -Seconds $seconds
        } while ($true)
        $successfulStages++
        Write-SupervisorLog "STAGE_PASS stage=$($ready.State.NextStage) ending_head=$((@(Get-Git @('rev-parse','HEAD'))[0]).Trim())"
        if (($successfulStages % 3) -eq 0) {
            Write-SupervisorLog 'CHECKPOINT_START cadence=3'
            & (Join-Path $repoRoot 'scripts/autopilot/checkpoint.ps1')
            if ($LASTEXITCODE -ne 0) { throw 'CHECKPOINT_FAILED' }
            Write-SupervisorLog 'CHECKPOINT_PASS'
        }
    }
} catch {
    $reason = $_.Exception.Message
    if ($null -ne $script:RuntimePath) { Write-SupervisorLog "SUPERVISOR_STOP reason=$reason" }
    Write-Error $reason
    exit 1
} finally {
    Release-Lock
}
