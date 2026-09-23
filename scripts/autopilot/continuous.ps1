[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SmokeOnly,
    [switch]$PreStageOnly,
    [ValidateRange(0, 3)]
    [int]$MaxTransientRetries = 2
)

$ErrorActionPreference = 'Stop'
$script:LockOwned = $false
$script:RuntimePath = $null
$script:LockPath = $null

function Write-SupervisorLog([string]$Message) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K') $Message"
    Write-Host $line
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
    $match = [regex]::Match($State, "(?m)^\|\s*$([regex]::Escape($Label))\s*\|\s*(.+?)\s*\|$")
    if (-not $match.Success) { throw "AUTOPILOT_STATE is missing '$Label'." }
    return $match.Groups[1].Value.Trim()
}

function Get-StateSnapshot([string]$RepoRoot) {
    $statePath = Join-Path $RepoRoot 'docs/autopilot/AUTOPILOT_STATE.md'
    $state = [IO.File]::ReadAllText($statePath, [Text.Encoding]::UTF8)
    $next = Get-StateValue $state 'Next approved stage'
    $lastStage = Get-StateValue $state 'Last completed product stage'
    $countMatch = [regex]::Match($state, '(?m)^\*\*Stages completed in current run:\*\*\s*`?(\d+)`?\s*$')
    if (-not $countMatch.Success) { throw 'AUTOPILOT_STATE has an invalid current-run stage counter.' }
    [pscustomobject]@{ NextStage = $next; LastStage = $lastStage; StageCount = [int]$countMatch.Groups[1].Value }
}

function Test-OnlySupervisorInfrastructureChanges() {
    $changes = @(Get-Git @('status', '--porcelain'))
    return $changes.Count -gt 0 -and @($changes | Where-Object { $_ -notmatch '^\s*[MADRCU?]{1,2}\s+(scripts/autopilot/|\.agents/skills/yolmod-autopilot/|docs/autopilot/AUTOPILOT_STATE\.md)' }).Count -eq 0
}

function Assert-Ready([string]$RepoRoot, [bool]$AllowSupervisorInfrastructureChange = $false) {
    if ($AllowSupervisorInfrastructureChange) {
        & (Join-Path $RepoRoot 'scripts/autopilot/preflight.ps1') | ForEach-Object { Write-SupervisorLog "PREFLIGHT $_" }
    } else {
        & (Join-Path $RepoRoot 'scripts/autopilot/preflight.ps1') -RequireClean | ForEach-Object { Write-SupervisorLog "PREFLIGHT $_" }
    }
    if ($LASTEXITCODE -ne 0) { throw 'PREFLIGHT_FAILED' }
    $changes = @(Get-Git @('status', '--porcelain'))
    if ($changes.Count -gt 0) {
        if (-not ($AllowSupervisorInfrastructureChange -and (Test-OnlySupervisorInfrastructureChanges))) { throw 'WORKTREE_NOT_CLEAN_FOR_PRODUCT_STAGE' }
        Write-SupervisorLog 'INFRASTRUCTURE_ONLY_WORKTREE_CHANGE_ALLOWED_FOR_DIAGNOSTIC'
    }
    $snapshot = Get-StateSnapshot $RepoRoot
    $head = (@(Get-Git @('rev-parse', 'HEAD'))[0]).Trim()
    $lastProduct = Get-LastProductStageIdentity $head
    $stateLastStageId = (([string]$snapshot.LastStage -split '\s+')[0]).Trim()
    if ($stateLastStageId -ne $lastProduct.Stage) { throw 'GIT_STATE_INCONSISTENCY: State last completed product stage does not match Git identity.' }
    $stageId = ($snapshot.NextStage -split '\s+')[0]
    $canonicalNextStage = Get-NextUnfinishedApprovedStage $head (Join-Path $RepoRoot 'docs/autopilot/IMPLEMENTATION_ROADMAP_V1.md')
    if ($stageId -ne $canonicalNextStage) { throw 'GIT_STATE_INCONSISTENCY: State next approved stage does not match canonical unfinished roadmap stage.' }
    return [pscustomobject]@{ Head = $head; State = $snapshot; StageId = $stageId; LastProduct = $lastProduct }
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

function ConvertTo-ExternalArgument([string]$Value) {
    if ($Value.Length -eq 0) { return '""' }
    if ($Value -notmatch '[\s"]') { return $Value }
    $escaped = [regex]::Replace($Value, '(\\*)"', '$1$1\\"')
    $escaped = [regex]::Replace($escaped, '(\\*)$', '$1$1')
    return '"' + $escaped + '"'
}

function Write-ProcessLog([string]$Label, [string]$Stream, [string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Get-Content -LiteralPath $Path | ForEach-Object { Write-SupervisorLog "$Label $Stream $_" }
}

function Invoke-CodexProcess([string]$CodexPath, [string[]]$Arguments, [string]$Label) {
    $stdoutPath = Join-Path $script:RuntimePath "$Label.stdout.log"
    $stderrPath = Join-Path $script:RuntimePath "$Label.stderr.log"
    Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
    $argumentLine = (@($Arguments | ForEach-Object { ConvertTo-ExternalArgument ([string]$_) }) -join ' ')
    Write-SupervisorLog "CODEX_PROCESS_START label=$Label path=$CodexPath arguments=$argumentLine"
    $process = Start-Process -FilePath $CodexPath -ArgumentList $argumentLine -PassThru -Wait -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $result = [pscustomobject]@{
        ProcessId = [int]$process.Id
        ExitCode = [int]$process.ExitCode
        StdoutPath = $stdoutPath
        StderrPath = $stderrPath
    }
    Write-ProcessLog $Label 'STDOUT' $stdoutPath
    Write-ProcessLog $Label 'STDERR' $stderrPath
    Write-SupervisorLog "CODEX_PROCESS_END label=$Label pid=$($result.ProcessId) exit_code=$($result.ExitCode) exit_code_type=$($result.ExitCode.GetType().FullName)"
    return $result
}

function Get-ProcessText([object]$ProcessResult) {
    $stdout = if (Test-Path -LiteralPath $ProcessResult.StdoutPath) { [IO.File]::ReadAllText($ProcessResult.StdoutPath, [Text.Encoding]::UTF8) } else { '' }
    $stderr = if (Test-Path -LiteralPath $ProcessResult.StderrPath) { [IO.File]::ReadAllText($ProcessResult.StderrPath, [Text.Encoding]::UTF8) } else { '' }
    return "$stdout`n$stderr"
}

function Add-CodexCandidate([System.Collections.Generic.List[object]]$Candidates, [string]$Path, [int]$Priority, [string]$Origin) {
    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }
    $fullPath = [IO.Path]::GetFullPath($Path)
    $existing = @($Candidates | Where-Object { [string]::Equals($_.Path, $fullPath, [StringComparison]::OrdinalIgnoreCase) } | Select-Object -First 1)
    if ($existing.Count -eq 0) {
        $Candidates.Add([pscustomobject]@{ Path = $fullPath; Priority = $Priority; Origin = $Origin })
        return
    }
    if ($Priority -lt $existing[0].Priority) {
        $existing[0].Priority = $Priority
        $existing[0].Origin = $Origin
    }
}

function Resolve-CodexExecutable() {
    $candidates = New-Object 'System.Collections.Generic.List[object]'
    $localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    $stableBin = Join-Path $localAppData 'OpenAI\Codex\bin'
    if (Test-Path -LiteralPath $stableBin -PathType Container) {
        Get-ChildItem -LiteralPath $stableBin -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            Add-CodexCandidate $candidates (Join-Path $_.FullName 'codex.exe') 1 'LOCALAPPDATA_OPENAI_CODEX_CURRENT_INSTALL'
        }
    }
    $programsCodex = Join-Path $localAppData 'Programs\OpenAI\Codex\bin\codex.exe'
    Add-CodexCandidate $candidates $programsCodex 2 'LOCALAPPDATA_PROGRAMS_OPENAI_CODEX'
    Get-Command codex -CommandType Application -All -ErrorAction SilentlyContinue | ForEach-Object {
        Add-CodexCandidate $candidates $_.Source 3 'PATH'
    }
    $valid = New-Object 'System.Collections.Generic.List[object]'
    foreach ($candidate in @($candidates | Sort-Object Priority, Path)) {
        $directory = Split-Path -Parent $candidate.Path
        $runner = Test-Path -LiteralPath (Join-Path $directory 'codex-command-runner.exe') -PathType Leaf
        $sandboxSetup = Test-Path -LiteralPath (Join-Path $directory 'codex-windows-sandbox-setup.exe') -PathType Leaf
        if (-not ($runner -and $sandboxSetup)) {
            Write-SupervisorLog "CODEX_CANDIDATE path=$($candidate.Path) origin=$($candidate.Origin) priority=$($candidate.Priority) version=NOT_RUN helper_status=runner:$runner,sandbox_setup:$sandboxSetup reason_rejected=INCOMPLETE_SANDBOX_HELPERS"
            continue
        }
        $versionResult = Invoke-CodexProcess $candidate.Path @('--version') "codex-candidate-$($valid.Count)"
        $version = (Get-ProcessText $versionResult).Trim()
        if ($versionResult.ExitCode -ne 0 -or $version -notmatch '^codex-cli\s+\S+') {
            Write-SupervisorLog "CODEX_CANDIDATE path=$($candidate.Path) origin=$($candidate.Origin) priority=$($candidate.Priority) version=$version helper_status=runner:$runner,sandbox_setup:$sandboxSetup reason_rejected=VERSION_CHECK_FAILED"
            continue
        }
        Write-SupervisorLog "CODEX_CANDIDATE path=$($candidate.Path) origin=$($candidate.Origin) priority=$($candidate.Priority) version=$version helper_status=runner:$runner,sandbox_setup:$sandboxSetup reason_rejected=NONE"
        $valid.Add([pscustomobject]@{ Path = $candidate.Path; Priority = $candidate.Priority; Origin = $candidate.Origin; Version = $version })
    }
    if ($valid.Count -eq 0) { throw 'CODEX_INSTALLATION_REPAIR_REQUIRED' }
    $bestPriority = ($valid | Measure-Object -Property Priority -Minimum).Minimum
    $best = @($valid | Where-Object { $_.Priority -eq $bestPriority })
    if ($best.Count -ne 1) { throw 'CODEX_EXECUTABLE_AMBIGUITY' }
    $path = $best[0].Path
    $version = $best[0].Version
    $versionResult = Invoke-CodexProcess $path @('--version') 'codex-version'
    if ($versionResult.ExitCode -ne 0) { throw 'CODEX_VERSION_CHECK_FAILED' }
    if ($version -notmatch '^codex-cli\s+\S+') { throw 'CODEX_VERSION_OUTPUT_INVALID' }
    $helpResult = Invoke-CodexProcess $path @('exec', '--help') 'codex-exec-help'
    if ($helpResult.ExitCode -ne 0 -or (Get-ProcessText $helpResult) -notmatch 'workspace-write') { throw 'CODEX_EXEC_HELP_FAILED' }
    $doctorResult = Invoke-CodexProcess $path @('doctor') 'codex-doctor'
    $doctorText = Get-ProcessText $doctorResult
    $doctorTermOnly = $doctorResult.ExitCode -ne 0 -and $doctorText -match 'TERM=dumb' -and $doctorText -notmatch '(?i)(sandbox.*(fail|error)|provisioning.*(fail|error)|helper.*(fail|error))'
    if ($doctorResult.ExitCode -ne 0 -and -not $doctorTermOnly) { throw 'CODEX_DOCTOR_FAILED' }
    Write-SupervisorLog "CODEX_DOCTOR usable=True exit_code=$($doctorResult.ExitCode) term_dumb_nonfatal=$doctorTermOnly"
    Write-SupervisorLog "CODEX_SELECTED path=$path version=$version origin=$($best[0].Origin) priority=$bestPriority"
    return [pscustomobject]@{ Path = $path; Version = $version }
}

function Write-SupervisorProcessFailure([string]$RepoRoot, [object]$Before, [object]$ProcessResult) {
    $resultPath = Join-Path $script:RuntimePath 'last-run.json'
    if (Test-Path -LiteralPath $resultPath) { return }
    $text = Get-ProcessText $ProcessResult
    $reason = if ($text -match '(?i)(sandbox|orchestrator_helper_launch_failed|windows-sandbox-setup)') { 'CODEX_SANDBOX_START_FAILED' } else { 'CODEX_PROCESS_FAILED' }
    $head = (@(Get-Git @('rev-parse', 'HEAD'))[0]).Trim()
    $clean = @(Get-Git @('status', '--short')).Count -eq 0
    Write-RunResult 'BLOCKED' $Before.State.NextStage $Before.Head $head $null $Before.State.NextStage $clean $false @() $reason
    Write-SupervisorLog "SUPERVISOR_PROCESS_FAILURE reason=$reason pid=$($ProcessResult.ProcessId) exit_code=$($ProcessResult.ExitCode)"
}

function Invoke-Stage([string]$RepoRoot, [object]$Codex, [object[]]$HostBaselineEvidence) {
    $promptPath = Join-Path $RepoRoot 'scripts/autopilot/stage-prompt.md'
    $schemaPath = Join-Path $RepoRoot 'scripts/autopilot/stage-result.schema.json'
    $lastMessagePath = Join-Path $script:RuntimePath 'last-message.json'
    Remove-Item -LiteralPath (Join-Path $script:RuntimePath 'last-run.json') -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $lastMessagePath -Force -ErrorAction SilentlyContinue
    $prompt = Get-Content -LiteralPath $promptPath -Raw
    $baselineSummary = @($HostBaselineEvidence | ForEach-Object { "test=$($_.exact_test_id); status=$($_.status); exit=$($_.exit_code); evidence=$($_.evidence_path)" }) -join "`n"
    $prompt += "`n`nTrusted host baseline completed before product changes for clean start HEAD. Consume this supervisor evidence: $baselineSummary. Do not retry Docker named-pipe access from workspace-write merely to prove FUNCTIONAL-02C2; a sandbox named-pipe restriction is infrastructure, not product failure."
    return Invoke-CodexProcess $Codex.Path @('exec', '--sandbox', 'workspace-write', '--cd', $RepoRoot, '--output-schema', $schemaPath, '--output-last-message', $lastMessagePath, $prompt) 'stage-agent'
}

function Assert-StagePass([string]$RepoRoot, [object]$Before, [object]$ProcessResult) {
    $resultPath = Join-Path $script:RuntimePath 'last-run.json'
    if (-not (Test-Path -LiteralPath $resultPath)) {
        if ($ProcessResult.ExitCode -ne 0) { Write-SupervisorProcessFailure $RepoRoot $Before $ProcessResult }
        throw 'MACHINE_RESULT_MISSING'
    }
    try { $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { throw 'MACHINE_RESULT_INVALID_JSON' }
    $head = (@(Get-Git @('rev-parse', 'HEAD'))[0]).Trim()
    $clean = @(Get-Git @('status', '--short')).Count -eq 0
    if (-not $clean) { throw 'INTERRUPTED_STAGE_RECOVERY_REQUIRED' }
    if ($ProcessResult.ExitCode -ne 0) { throw "CODEX_EXIT_$($ProcessResult.ExitCode)" }
    $required = @('status','stage','starting_head','ending_head','commit','next_stage','worktree_clean','tests_passed','tests','push_performed','production_accessed','stop_reason')
    if (@($required | Where-Object { $null -eq $result.PSObject.Properties[$_] }).Count -gt 0) { throw 'MACHINE_RESULT_CONTRACT_INVALID' }
    if ($result.status -ne 'PASS' -or $result.stage -eq 'initialization' -or $result.stage -ne $Before.State.NextStage -or $result.starting_head -ne $Before.Head -or $result.ending_head -ne $head -or $result.commit -ne $head -or -not $result.worktree_clean -or -not $result.tests_passed -or $result.push_performed -or $result.production_accessed -or $null -ne $result.stop_reason) { throw 'MACHINE_RESULT_CLAIM_REJECTED' }
    $commitCount = [int](@(Get-Git @('rev-list', '--count', "$($Before.Head)..$head"))[0])
    if ($commitCount -ne 1) { throw 'EXPECTED_EXACTLY_ONE_STAGE_COMMIT' }
    $commitIdentity = Get-ProductCommitIdentity $head
    if ($null -eq $commitIdentity -or $commitIdentity.Stage -ne $Before.StageId) { throw 'PRODUCT_STAGE_TRAILER_IDENTITY_REJECTED' }
    $protectedChanges = @(Get-ProductStageProtectedChanges $Before.Head $head)
    if ($protectedChanges.Count -gt 0 -and -not (Test-AuthorizedInfrastructureStage $Before.StageId)) {
        throw "PRODUCT_STAGE_MODIFIED_SUPERVISOR_POLICY:$($protectedChanges -join ',')"
    }
    $contractSensitiveChanges = @(Get-ContractSensitiveChanges $Before.Head $head)
    if ($contractSensitiveChanges.Count -gt 0) {
        $postChangeBaselines = @(Invoke-ApprovedHostBaselines -RepoRoot $RepoRoot -StartingHead $Before.Head -EvaluatedHead $head)
        if (@($postChangeBaselines | Where-Object { $_.status -ne 'PASS' }).Count -gt 0) { throw 'POST_CHANGE_HOST_BASELINE_FAILED' }
        Write-SupervisorLog "POST_CHANGE_HOST_BASELINE_PASS files=$($contractSensitiveChanges -join ',')"
    }
    $after = Get-StateSnapshot $RepoRoot
    $afterLastStageId = (([string]$after.LastStage -split '\s+')[0]).Trim()
    $afterIdentity = Get-LastProductStageIdentity $head
    if ($afterLastStageId -ne $Before.StageId -or $afterIdentity.Commit -ne $head -or $afterIdentity.Stage -ne $Before.StageId -or $after.NextStage -ne $result.next_stage -or $after.StageCount -ne ($Before.State.StageCount + 1)) { throw 'GIT_STATE_INCONSISTENCY_AFTER_STAGE' }
    if ($null -eq $result.tests -or @($result.tests).Count -eq 0) { throw 'MACHINE_RESULT_TESTS_MISSING' }
    & (Join-Path $RepoRoot 'scripts/autopilot/test.ps1') -Mode Targeted -Tests @($result.tests)
    if ($LASTEXITCODE -ne 0) { throw 'SUPERVISOR_TEST_RECHECK_FAILED' }
    & (Join-Path $RepoRoot 'scripts/autopilot/safety-check.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'SAFETY_CHECK_FAILED' }
    return $after
}

try {
    $canonicalYolmodRoot = [IO.Path]::GetFullPath('C:\Users\Work\source\repos\Yolmod').TrimEnd('\')
    $gitRepoRoot = (@(Get-Git @('rev-parse', '--show-toplevel'))[0]).Trim()
    $repoRoot = (Get-Item -LiteralPath $gitRepoRoot -ErrorAction Stop).FullName.TrimEnd('\')
    if (-not [string]::Equals($repoRoot, $canonicalYolmodRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'FORBIDDEN_OR_UNEXPECTED_REPOSITORY'
    }
    $script:RuntimePath = Join-Path $repoRoot '.autopilot-runtime'
    New-Item -ItemType Directory -Path $script:RuntimePath -Force | Out-Null
    . (Join-Path $repoRoot 'scripts/autopilot/host-baselines.ps1')
    . (Join-Path $repoRoot 'scripts/autopilot/stage-identity.ps1')
    . (Join-Path $repoRoot 'scripts/autopilot/supervisor-policy.ps1')
    Acquire-Lock $script:RuntimePath
    Write-SupervisorLog "SUPERVISOR_START dry_run=$DryRun smoke_only=$SmokeOnly pre_stage_only=$PreStageOnly"
    if (Test-StopRequested) { Write-SupervisorLog 'STOP_MARKER_DETECTED'; exit 0 }
    $ready = Assert-Ready $repoRoot ($DryRun -or $SmokeOnly)
    $codex = Resolve-CodexExecutable
    if ($DryRun) {
        Write-SupervisorLog "DRY_RUN stage=$($ready.State.NextStage) command=$($codex.Path) exec --sandbox workspace-write --cd $repoRoot --output-schema scripts/autopilot/stage-result.schema.json --output-last-message .autopilot-runtime/last-message.json"
        Write-RunResult 'BLOCKED' $ready.State.NextStage $ready.Head $ready.Head $null $ready.State.NextStage $true $false @() 'DRY_RUN_NO_CODEX_EXECUTION'
        exit 0
    }
    if ($SmokeOnly) {
        $smokePrompt = 'Read-only supervisor smoke: run only git rev-parse HEAD and read docs/autopilot/AUTOPILOT_STATE.md. Final response must contain HEAD=<full hash> and NEXT_STAGE=<exact next approved stage>. Do not modify files, create commits, access a database, push, deploy, or access production.'
        $smoke = Invoke-CodexProcess $codex.Path @('exec', '--sandbox', 'workspace-write', '--cd', $repoRoot, $smokePrompt) 'codex-sandbox-smoke'
        if ($smoke.ExitCode -ne 0) { throw "CODEX_SANDBOX_SMOKE_EXIT_$($smoke.ExitCode)" }
        $smokeText = Get-ProcessText $smoke
        if ($smokeText -match '(?i)base_instructions') { throw 'CODEX_MODEL_CACHE_BASE_INSTRUCTIONS_ERROR' }
        if ($smokeText -notmatch [regex]::Escape("HEAD=$($ready.Head)") -or $smokeText -notmatch [regex]::Escape("NEXT_STAGE=$($ready.State.NextStage)")) { throw 'CODEX_SANDBOX_SMOKE_OUTPUT_INVALID' }
        if (@(Get-Git @('status', '--short')).Count -ne 0 -and -not (Test-OnlySupervisorInfrastructureChanges)) { throw 'CODEX_SANDBOX_SMOKE_DIRTY_WORKTREE' }
        Write-RunResult 'BLOCKED' $ready.State.NextStage $ready.Head $ready.Head $null $ready.State.NextStage $true $false @() 'SMOKE_ONLY_NO_PRODUCT_STAGE'
        Write-SupervisorLog 'CODEX_SANDBOX_SMOKE_PASS'
        exit 0
    }
    $successfulStages = 0
    while ($true) {
        if (Test-StopRequested) { Write-SupervisorLog 'STOP_MARKER_DETECTED'; exit 0 }
        $ready = Assert-Ready $repoRoot
        $hostBaselineEvidence = @(Invoke-ApprovedHostBaselines -RepoRoot $repoRoot -StartingHead $ready.Head -EvaluatedHead $ready.Head)
        if (@($hostBaselineEvidence | Where-Object { $_.status -ne 'PASS' }).Count -gt 0) { throw 'HOST_BASELINE_FAILED_BEFORE_STAGE_AGENT' }
        Write-SupervisorLog "HOST_BASELINE_PASS stage=$($ready.StageId) evidence=$($hostBaselineEvidence.evidence_path -join ',')"
        if ($PreStageOnly) {
            Write-SupervisorLog "PRE_STAGE_GATE_PASS stage=$($ready.StageId) stage_agent_not_started=True"
            Write-RunResult 'BLOCKED' $ready.State.NextStage $ready.Head $ready.Head $null $ready.State.NextStage $true $false @() 'PRE_STAGE_ONLY_NO_STAGE_AGENT'
            exit 0
        }
        $attempt = 0
        do {
            $processResult = Invoke-Stage $repoRoot $codex $hostBaselineEvidence
            try {
                $after = Assert-StagePass $repoRoot $ready $processResult
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
