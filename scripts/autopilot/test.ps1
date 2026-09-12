[CmdletBinding()]
param(
    [ValidateSet('Targeted', 'Checkpoint')]
    [string]$Mode = 'Targeted',
    [string[]]$Tests,
    [switch]$SkipLint,
    [switch]$SkipTypecheck,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repoRoot = (git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) { throw 'This script must run in a Git repository.' }
$webRoot = Join-Path $repoRoot 'apps/web'

function Invoke-Npm([string[]]$Arguments) {
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) { throw "npm $($Arguments -join ' ') failed." }
}

try {
    if (-not (Test-Path (Join-Path $webRoot 'node_modules'))) { throw 'apps/web/node_modules is missing. Install the existing project dependencies before running checks.' }
    Push-Location $webRoot
    try {
        $package = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
        $availableTests = @($package.scripts.PSObject.Properties.Name | Where-Object { $_ -like 'test:*' -and $_ -ne 'test:prod-04a:db' } | Sort-Object)
        $selectedTests = if ($Tests.Count -gt 0) { $Tests } elseif ($Mode -eq 'Checkpoint') { $availableTests } else { @('test:auth-return-path') }
        $unknownTests = @($selectedTests | Where-Object { $_ -notin $availableTests })
        if ($unknownTests.Count -gt 0) { throw "Unknown or environment-dependent test scripts: $($unknownTests -join ', ')." }
        if (-not $SkipTypecheck) { Invoke-Npm @('run', 'typecheck') }
        if (-not $SkipLint) { Invoke-Npm @('run', 'lint') }
        foreach ($test in $selectedTests) { Invoke-Npm @('run', $test) }
        if ($Mode -eq 'Checkpoint' -and -not $SkipBuild) { Invoke-Npm @('run', 'build') }
    } finally {
        Pop-Location
    }
    Write-Output 'Local web verification passed.'
    exit 0
} catch {
    Write-Error $_
    exit 1
}
