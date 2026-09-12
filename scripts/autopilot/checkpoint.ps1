[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
try {
    $repoRoot = (git rev-parse --show-toplevel).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'This script must run in a Git repository.' }
    Write-Output "Branch: $((git branch --show-current).Trim())"
    Write-Output "HEAD: $((git rev-parse HEAD).Trim())"
    git status --short
    git log -5 --oneline
    & (Join-Path $repoRoot 'scripts/autopilot/preflight.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Preflight failed.' }
    & (Join-Path $repoRoot 'scripts/autopilot/safety-check.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Safety check failed.' }
    & (Join-Path $repoRoot 'scripts/autopilot/test.ps1') -Mode Checkpoint
    if ($LASTEXITCODE -ne 0) { throw 'Checkpoint verification failed.' }
    Write-Output 'Checkpoint passed.'
    exit 0
} catch {
    Write-Error $_
    exit 1
}
