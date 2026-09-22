[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) { throw 'This test must run in a Git repository.' }

. (Join-Path $repoRoot 'scripts/autopilot/host-baselines.ps1')
. (Join-Path $repoRoot 'scripts/autopilot/stage-identity.ps1')
. (Join-Path $repoRoot 'scripts/autopilot/supervisor-policy.ps1')

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw "ASSERTION_FAILED:$Message" }
}

function Invoke-TestNativeProcess([string]$Body, [int]$TimeoutSeconds = 5) {
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Body))
    return Invoke-NativeProcessCapture -Executable 'powershell.exe' -Arguments @('-NoProfile', '-NonInteractive', '-EncodedCommand', $encoded) -WorkingDirectory $repoRoot -TimeoutSeconds $TimeoutSeconds
}

try {
    $head = (git rev-parse HEAD).Trim()
    $legacy = Get-ProductCommitIdentity '2563146b3d67a7c0c78757e467faf2fa7926695b'
    Assert-True ($legacy.Commit -eq '2563146b3d67a7c0c78757e467faf2fa7926695b') 'legacy D commit resolves from Git seed'
    Assert-True ($legacy.Stage -eq 'FUNCTIONAL-02D') 'legacy D stage resolves from Git seed'
    $currentProduct = Get-LastProductStageIdentity $head
    $state = Get-Content -LiteralPath (Join-Path $repoRoot 'docs/autopilot/AUTOPILOT_STATE.md') -Raw
    $stateProduct = [regex]::Match($state, '(?m)^\| Last completed product stage \| (?<stage>(?:FUNCTIONAL|STABILIZATION)-[^\s|]+)')
    $stateNext = [regex]::Match($state, '(?m)^\| Next approved stage \| (?<stage>FUNCTIONAL-[^\s|]+)')
    Assert-True ($stateProduct.Success -and $stateNext.Success) 'state exposes completed product and next planned stages'
    Assert-True ($currentProduct.Stage -eq $stateProduct.Groups['stage'].Value -and $currentProduct.Source -eq 'trailer') 'current product stage resolves dynamically from Git trailers and reconciles with state'
    $a1Commit = '7887c26a74a346e0ff715d9b00534b44f809bc50'
    Assert-True ($null -eq (Get-ProductCommitIdentity $a1Commit)) 'reviewed A1 intermediate commit remains non-product'
    Assert-True ($currentProduct.Stage -eq 'STABILIZATION-02') 'latest completed product stage is STABILIZATION-02'
    Assert-True ($state -match '(?m)^\| Current parent stage \| FUNCTIONAL-03B .* IN PROGRESS \|$') 'current parent remains FUNCTIONAL-03B in progress'
    Assert-True ($state -match '(?m)^\| Next internal substep \| FUNCTIONAL-03B-B .*\|$') 'next internal substep is FUNCTIONAL-03B-B'
    $descendants = @(& git rev-list "$($currentProduct.Commit)..$head")
    if ($LASTEXITCODE -ne 0) { throw 'GIT_PRODUCT_DESCENDANTS_UNAVAILABLE' }
    foreach ($commit in $descendants) {
        Assert-True ($null -eq (Get-ProductCommitIdentity $commit)) "planning-only descendant does not replace product identity: $commit"
    }
    $nextStage = $stateNext.Groups['stage'].Value
    $roadmap = Get-Content -LiteralPath (Join-Path $repoRoot 'docs/autopilot/IMPLEMENTATION_ROADMAP_V1.md') -Raw
    Assert-True ($roadmap.Contains($nextStage) -and $nextStage -ne $currentProduct.Stage) 'next planned stage is approved but not treated as complete'

    $parsed = ConvertFrom-YolmodCommitMessage 'test-commit' "subject`n`nYolmod-Stage: FUNCTIONAL-02E`nYolmod-Stage-Type: product"
    Assert-True ($parsed.Stage -eq 'FUNCTIONAL-02E') 'product trailer parses'
    try { ConvertFrom-YolmodCommitMessage 'duplicate' "Yolmod-Stage: FUNCTIONAL-02E`nYolmod-Stage-Type: product`nYolmod-Stage: FUNCTIONAL-02E"; throw 'duplicate trailer accepted' } catch { Assert-True ($_.Exception.Message -match '^DUPLICATE_STAGE_TRAILER:') 'duplicate trailer fails closed' }
    try { ConvertFrom-YolmodCommitMessage 'partial' 'Yolmod-Stage: FUNCTIONAL-02E'; throw 'partial trailer accepted' } catch { Assert-True ($_.Exception.Message -match '^INCOMPLETE_STAGE_TRAILER:') 'partial trailer fails closed' }
    try { ConvertFrom-YolmodCommitMessage 'malformed' "Yolmod-Stage: UNKNOWN-01`nYolmod-Stage-Type: product"; throw 'malformed stage accepted' } catch { Assert-True ($_.Exception.Message -match '^INVALID_STAGE_ID:') 'malformed product trailer fails closed' }

    $definitions = @(Get-ApprovedHostBaselines)
    Assert-True ($definitions.Count -eq 1 -and $definitions[0].ExactTestId -eq 'npm --prefix apps/web run test:functional-02c2') 'trusted C2 baseline allowlist is exact'
    $stdoutOnly = Invoke-TestNativeProcess "[Console]::Out.WriteLine('stdout-only'); exit 0"
    Assert-True ($stdoutOnly.ExitCode -eq 0 -and $stdoutOnly.StandardOutput -match 'stdout-only' -and [string]::IsNullOrWhiteSpace($stdoutOnly.StandardError)) 'native stdout-only exit zero is preserved'
    $stderrOnly = Invoke-TestNativeProcess "[Console]::Error.WriteLine('ERROR stderr-only'); exit 0"
    Assert-True ($stderrOnly.ExitCode -eq 0 -and $stderrOnly.StandardError -match 'ERROR stderr-only') 'native stderr-only exit zero is preserved'
    $bothStreams = Invoke-TestNativeProcess "[Console]::Out.WriteLine('stdout'); [Console]::Error.WriteLine('CONTEXT stderr'); exit 0"
    Assert-True ($bothStreams.ExitCode -eq 0 -and $bothStreams.StandardOutput -match 'stdout' -and $bothStreams.StandardError -match 'CONTEXT stderr') 'native stdout and stderr exit zero is preserved'
    $nonZero = Invoke-TestNativeProcess "[Console]::Error.WriteLine('ERROR nonzero'); exit 17"
    Assert-True ($nonZero.ExitCode -eq 17 -and $nonZero.StandardError -match 'ERROR nonzero') 'native nonzero exit is preserved'
    $largeOutput = Invoke-TestNativeProcess "[Console]::Out.Write(('o' * 100000)); [Console]::Error.Write(('e' * 100000)); exit 0"
    Assert-True ($largeOutput.ExitCode -eq 0 -and $largeOutput.StandardOutput.Length -ge 100000 -and $largeOutput.StandardError.Length -ge 100000) 'large native output drains without deadlock'
    $missingExecutable = Invoke-NativeProcessCapture -Executable 'yolmod-does-not-exist.exe' -Arguments @() -WorkingDirectory $repoRoot -TimeoutSeconds 5
    Assert-True ($missingExecutable.ExitCode -ne 0 -and $null -ne $missingExecutable.LaunchError) 'missing native executable fails closed'
    $timedOut = Invoke-TestNativeProcess "Start-Sleep -Seconds 2; exit 0" 1
    Assert-True ($timedOut.ExitCode -ne 0 -and $timedOut.TimedOut) 'native timeout fails closed'
    Assert-True ((Resolve-RepositoryRelativePath $repoRoot (Join-Path $repoRoot 'child\file.txt')) -eq 'child/file.txt') 'child path resolves'
    Assert-True ((Resolve-RepositoryRelativePath $repoRoot $repoRoot) -eq '.') 'repository root resolves'
    Assert-True ((Resolve-RepositoryRelativePath $repoRoot (Join-Path $repoRoot 'folder with spaces\file.txt')) -eq 'folder with spaces/file.txt') 'spaces resolve'
    Assert-True ((Resolve-RepositoryRelativePath $repoRoot (Join-Path $repoRoot 'child\nested\..\file.txt')) -eq 'child/file.txt') 'inside dotdot normalizes'
    Assert-True ((Resolve-RepositoryRelativePath $repoRoot ($repoRoot + '\child\folder\')) -eq 'child/folder') 'trailing separators resolve'
    $rootParent = Split-Path -Parent $repoRoot
    $rootLeaf = Split-Path -Leaf $repoRoot
    foreach ($outsidePath in @(
        (Join-Path $rootParent "$rootLeaf-evil\file.txt"),
        (Join-Path $rootParent 'outside\file.txt'),
        'D:\outside\file.txt'
    )) {
        try { Resolve-RepositoryRelativePath $repoRoot $outsidePath | Out-Null; throw "outside path accepted: $outsidePath" } catch { Assert-True ($_.Exception.Message -eq 'PATH_OUTSIDE_REPOSITORY_ROOT') "outside path fails closed: $outsidePath" }
    }
    $passRunner = { param($definition) [pscustomobject]@{ ExitCode = 0; Output = "simulated $($definition.ExactTestId)" } }
    $pass = @(Invoke-ApprovedHostBaselines -RepoRoot $repoRoot -StartingHead $head -EvaluatedHead $head -CommandRunner $passRunner)
    Assert-True ($pass.Count -eq 1 -and $pass[0].status -eq 'PASS' -and $pass[0].log_sha256 -match '^[0-9a-f]{64}$') 'simulated host baseline pass records SHA evidence'
    $failRunner = { param($definition) [pscustomobject]@{ ExitCode = 7; Output = 'simulated failure' } }
    $failed = @(Invoke-ApprovedHostBaselines -RepoRoot $repoRoot -StartingHead $head -EvaluatedHead $head -CommandRunner $failRunner)
    Assert-True ($failed[0].status -eq 'FAIL' -and $failed[0].exit_code -eq 7) 'simulated host baseline failure is fail closed before agent'

    Assert-True (Test-SupervisorPolicyPath 'scripts/autopilot/continuous.ps1' 'scripts/autopilot/**') 'autopilot path is protected'
    Assert-True (-not (Test-SupervisorPolicyPath 'apps/web/package.json' 'scripts/autopilot/**')) 'product path is not a supervisor policy path'
    Assert-True (-not (Test-AuthorizedInfrastructureStage 'FUNCTIONAL-02E')) 'product stages cannot authorize infrastructure modifications'
    Assert-True (Test-AuthorizedInfrastructureStage 'CONTINUOUS-HOST-BASELINE-AND-GIT-STAGE-IDENTITY-01') 'explicit infrastructure stage remains authorized'

    $contractPaths = @(Get-ContractSensitiveChanges '2725663e248442891324c0a1999bab55eeadbc50' $head)
    Assert-True ($contractPaths -contains 'apps/web/src/lib/search/server-search.ts') 'C2 RPC integration is contract-sensitive'
    Assert-True ($contractPaths -contains 'apps/web/package.json') 'C2 package mapping is contract-sensitive'

    $originalErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'scripts/autopilot/preflight.ps1') -RequireClean *> $null
        $dirtyPreflightExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $originalErrorActionPreference
    }
    Assert-True ($dirtyPreflightExit -ne 0) 'dirty worktree fails closed before a product stage'

    $continuous = Get-Content -LiteralPath (Join-Path $repoRoot 'scripts/autopilot/continuous.ps1') -Raw
    Assert-True ($continuous -match 'HOST_BASELINE_FAILED_BEFORE_STAGE_AGENT') 'supervisor stops before stage agent when baseline fails'
    Assert-True (($continuous -match '--sandbox') -and ($continuous -match 'workspace-write')) 'supervisor retains workspace-write sandbox'
    Assert-True ($continuous -notmatch 'danger-full-access|dangerously-bypass-approvals') 'supervisor contains no sandbox bypass'
    Assert-True ($continuous -match 'Test-StopRequested') 'STOP marker remains checked'
    Assert-True ($continuous -match 'PRODUCT_STAGE_TRAILER_IDENTITY_REJECTED') 'stage trailer validation is enforced'
    Assert-True ($continuous -match 'POST_CHANGE_HOST_BASELINE_FAILED') 'contract changes require post-change baseline'
    Assert-True ($continuous -match 'PRE_STAGE_GATE_PASS') 'normal startup has a no-agent pre-stage gate validation mode'
    Write-Output 'Continuous supervisor infrastructure tests passed.'
    exit 0
} catch {
    Write-Error $_
    exit 1
}
