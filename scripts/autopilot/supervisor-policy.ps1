Set-StrictMode -Version Latest

$script:ProtectedProductStagePatterns = @('scripts/autopilot/**', '.agents/skills/yolmod-autopilot/**')
$script:AuthorizedInfrastructureStages = @('CONTINUOUS-HOST-BASELINE-AND-GIT-STAGE-IDENTITY-01')

function Test-SupervisorPolicyPath([string]$Path, [string]$Pattern) {
    $regex = '^' + [regex]::Escape($Pattern).Replace('\*\*', '.*').Replace('\*', '[^/]*') + '$'
    return $Path.Replace('\', '/') -match $regex
}

function Get-ProductStageProtectedChanges([string]$StartingHead, [string]$EndingHead) {
    $paths = @(& git diff --name-only "$StartingHead..$EndingHead")
    if ($LASTEXITCODE -ne 0) { throw 'GIT_PROTECTED_PATH_DIFF_FAILED' }
    return @($paths | Where-Object {
        $path = $_
        @($script:ProtectedProductStagePatterns | Where-Object { Test-SupervisorPolicyPath $path $_ }).Count -gt 0
    })
}

function Test-AuthorizedInfrastructureStage([string]$StageId) {
    return $StageId -in $script:AuthorizedInfrastructureStages
}
