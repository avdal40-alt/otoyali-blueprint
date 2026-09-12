[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
try {
    $gitRepoRoot = (git rev-parse --show-toplevel).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'This script must run in a Git repository.' }
    $repoRoot = (Get-Item -LiteralPath $gitRepoRoot -ErrorAction Stop).FullName.TrimEnd('\')
    $canonicalYolmodRoot = [IO.Path]::GetFullPath('C:\Users\Work\source\repos\Yolmod').TrimEnd('\')
    if (-not [string]::Equals($repoRoot, $canonicalYolmodRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'FORBIDDEN_OR_UNEXPECTED_REPOSITORY'
    }
    $branch = (git branch --show-current).Trim()
    if ($branch -eq 'main') { throw 'Protected main branch: autopilot is blocked.' }
    $forbidden = 'git\s+(?:push\s+.*--force|reset\s+--hard|rebase\b|commit\s+.*--amend)|supabase\s+db\s+reset|\b(?:DROP\s+(?:TABLE|SCHEMA)|TRUNCATE)\b'
    $sources = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'scripts/autopilot') -Filter '*.ps1' -File | Where-Object { $_.Name -notin @('safety-check.ps1', 'migration-check.ps1') }
    $matches = @($sources | Select-String -Pattern $forbidden -AllMatches)
    if ($matches.Count -gt 0) { throw "Forbidden command pattern in autopilot script: $($matches[0].Path):$($matches[0].LineNumber)" }
    & (Join-Path $repoRoot 'scripts/autopilot/migration-check.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Migration safety gate failed.' }
    Write-Output 'Safety check passed.'
    exit 0
} catch {
    Write-Error $_
    exit 1
}
