[CmdletBinding()]
param(
    [string]$Baseline = 'HEAD'
)

$ErrorActionPreference = 'Stop'

function Invoke-Git([string[]]$Arguments) {
    $result = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed." }
    return $result
}

function Get-MigrationName([string]$Path) {
    return [IO.Path]::GetFileName($Path)
}

try {
    $repoRoot = (Invoke-Git @('rev-parse', '--show-toplevel')).Trim()
    $migrationDirectory = Join-Path $repoRoot 'supabase/migrations'
    if (-not (Test-Path $migrationDirectory)) { throw 'supabase/migrations is missing.' }
    & git rev-parse --verify --quiet "$Baseline^{commit}" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Baseline '$Baseline' is not available locally." }

    $baselineFiles = @(Invoke-Git @('ls-tree', '-r', '--name-only', $Baseline, '--', 'supabase/migrations'))
    $baselineNames = @($baselineFiles | ForEach-Object { Get-MigrationName $_ })
    $headChanges = @(Invoke-Git @('diff', '--name-status', "$Baseline...HEAD", '--', 'supabase/migrations'))
    $worktreeChanges = @(Invoke-Git @('diff', '--name-status', '--', 'supabase/migrations'))
    $stagedChanges = @(Invoke-Git @('diff', '--cached', '--name-status', '--', 'supabase/migrations'))
    $untracked = @(Invoke-Git @('ls-files', '--others', '--exclude-standard', '--', 'supabase/migrations'))
    $allChanges = @($headChanges + $worktreeChanges + $stagedChanges) | Where-Object { $_ }
    $rewritten = @()
    $newPaths = @()
    foreach ($line in $allChanges) {
        $parts = $line -split "`t"
        $status = $parts[0]
        $paths = @($parts | Select-Object -Skip 1)
        foreach ($path in $paths) {
            if (-not $path) { continue }
            $name = Get-MigrationName $path
            if ($name -in $baselineNames -and $status -notmatch '^A') { $rewritten += "$status $path" }
            if ($status -match '^A') { $newPaths += $path }
        }
    }
    $newPaths += $untracked
    $newPaths = @($newPaths | Sort-Object -Unique)
    if ($rewritten.Count -gt 0) { throw "Existing migrations were changed or removed:`n$($rewritten -join "`n")" }

    $baselineTimestamps = @($baselineNames | ForEach-Object { if ($_ -match '^(\d{14})_.+\.sql$') { [int64]$Matches[1] } })
    $highestBaselineTimestamp = if ($baselineTimestamps.Count -gt 0) { ($baselineTimestamps | Measure-Object -Maximum).Maximum } else { 0 }
    $dangerousPattern = '(?im)^\s*(?:drop\s+(?:table|schema|database|function|policy|type|view|materialized\s+view)|truncate\b|delete\s+from\b|alter\s+table\b[^;]*\bdrop\b|grant\s+(?:all(?:\s+privileges)?|[^;]*(?:\binsert\b|\bupdate\b|\bdelete\b))[^;]*\bto\s+(?:anon|authenticated|public)\b)'

    foreach ($path in $newPaths) {
        $name = Get-MigrationName $path
        if ($name -notmatch '^(\d{14})_[a-z0-9_]+\.sql$') { throw "Invalid migration filename: $name" }
        if ([int64]$Matches[1] -le $highestBaselineTimestamp) { throw "Migration timestamp must be newer than ${highestBaselineTimestamp}: $name" }
        $fullPath = Join-Path $repoRoot $path
        if (-not (Test-Path -LiteralPath $fullPath)) { continue }
        $sql = Get-Content -LiteralPath $fullPath -Raw
        if ($sql -match $dangerousPattern) { throw "Potentially destructive or privilege-expanding SQL in $path. Stop for explicit migration review." }
        Write-Output "New migration requires manual schema, RLS, privilege, lock, and compatibility review: $path"
    }

    Write-Output "STATIC MIGRATION CHECK PASS against $Baseline. New migrations: $($newPaths.Count)."
    Write-Output 'Static validation is not runtime execution or proof that SQL is safe; review every new migration before any remote application.'
    exit 0
} catch {
    Write-Error $_
    exit 1
}
