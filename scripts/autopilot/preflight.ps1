[CmdletBinding()]
param(
    [ValidateSet('local', 'staging', 'production')]
    [string]$Environment = 'local',
    [switch]$RequireClean
)

$ErrorActionPreference = 'Stop'

function Invoke-Git([string[]]$Arguments) {
    $result = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed." }
    return $result
}

try {
    $repoRoot = (Invoke-Git @('rev-parse', '--show-toplevel')).Trim()
    $archivePath = 'C:\Проекты\Otoyali-blueprint'
    if ($repoRoot -ieq $archivePath) { throw 'The historical archive repository is forbidden.' }
    $branch = (Invoke-Git @('branch', '--show-current')).Trim()
    $head = (Invoke-Git @('rev-parse', 'HEAD')).Trim()
    $status = @(Invoke-Git @('status', '--short'))
    Write-Output "Repository: $repoRoot"
    Write-Output "Branch: $branch"
    Write-Output "HEAD: $head"
    Write-Output "Environment: $Environment"
    Write-Output "Working tree: $(if ($status.Count -eq 0) { 'clean' } else { 'changed' })"
    if ($status.Count -gt 0) { $status | ForEach-Object { Write-Output "  $_" } }

    $requiredCommands = @('git', 'node', 'npm')
    $missing = @($requiredCommands | Where-Object { $null -eq (Get-Command $_ -ErrorAction SilentlyContinue) })
    $requiredCommands | ForEach-Object {
        $command = Get-Command $_ -ErrorAction SilentlyContinue
        Write-Output "Tool ${_}: $(if ($null -eq $command) { 'missing' } else { $command.Source })"
    }
    $supabase = Get-Command supabase -ErrorAction SilentlyContinue
    Write-Output "Tool supabase: $(if ($null -eq $supabase) { 'unavailable (optional for local code checks)' } else { $supabase.Source })"
    if ($missing.Count -gt 0) { throw "Required tools are unavailable: $($missing -join ', ')." }
    if (-not (Test-Path (Join-Path $repoRoot 'apps/web/package.json'))) { throw 'apps/web/package.json is missing.' }
    $statePath = Join-Path $repoRoot 'docs/autopilot/AUTOPILOT_STATE.md'
    if (-not (Test-Path $statePath)) { throw 'docs/autopilot/AUTOPILOT_STATE.md is missing.' }
    $state = Get-Content -LiteralPath $statePath -Raw
    $expectedStateBranch = '**Current branch at bootstrap:** `' + $branch + '`'
    if ($state -notmatch [regex]::Escape($expectedStateBranch)) { throw 'AUTOPILOT_STATE branch does not match Git.' }
    if ($branch -eq 'main') { throw 'Protected main branch: autopilot execution is blocked.' }
    if ($RequireClean -and $status.Count -gt 0) { throw 'Working tree is not clean; stop before selecting an autopilot stage.' }
    if ($Environment -ne 'local') { throw "$Environment is not configured by this local script. Confirm the remote project identity and use an explicit release workflow." }
    Write-Output 'Preflight passed.'
    exit 0
} catch {
    Write-Error $_
    exit 1
}
