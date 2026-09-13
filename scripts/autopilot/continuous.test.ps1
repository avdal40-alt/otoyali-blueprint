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

try {
    $head = (git rev-parse HEAD).Trim()
    $legacy = Get-ProductCommitIdentity '2563146b3d67a7c0c78757e467faf2fa7926695b'
    Assert-True ($legacy.Commit -eq '2563146b3d67a7c0c78757e467faf2fa7926695b') 'legacy D commit resolves from Git seed'
    Assert-True ($legacy.Stage -eq 'FUNCTIONAL-02D') 'legacy D stage resolves from Git seed'
    $currentProduct = Get-LastProductStageIdentity $head
    Assert-True ($currentProduct.Stage -eq 'FUNCTIONAL-02E' -and $currentProduct.Source -eq 'trailer') 'current product stage resolves from trailer after legacy reconciliation'

    $parsed = ConvertFrom-YolmodCommitMessage 'test-commit' "subject`n`nYolmod-Stage: FUNCTIONAL-02E`nYolmod-Stage-Type: product"
    Assert-True ($parsed.Stage -eq 'FUNCTIONAL-02E') 'product trailer parses'
    try { ConvertFrom-YolmodCommitMessage 'duplicate' "Yolmod-Stage: FUNCTIONAL-02E`nYolmod-Stage-Type: product`nYolmod-Stage: FUNCTIONAL-02E"; throw 'duplicate trailer accepted' } catch { Assert-True ($_.Exception.Message -match '^DUPLICATE_STAGE_TRAILER:') 'duplicate trailer fails closed' }
    try { ConvertFrom-YolmodCommitMessage 'partial' 'Yolmod-Stage: FUNCTIONAL-02E'; throw 'partial trailer accepted' } catch { Assert-True ($_.Exception.Message -match '^INCOMPLETE_STAGE_TRAILER:') 'partial trailer fails closed' }

    $definitions = @(Get-ApprovedHostBaselines)
    Assert-True ($definitions.Count -eq 1 -and $definitions[0].ExactTestId -eq 'npm --prefix apps/web run test:functional-02c2') 'trusted C2 baseline allowlist is exact'
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
