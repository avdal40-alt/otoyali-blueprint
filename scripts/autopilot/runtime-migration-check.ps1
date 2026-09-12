[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^\d{14}$')]
    [string]$MigrationVersion
)

$ErrorActionPreference = 'Stop'

function Resolve-SupabaseCli {
    $discovered = Get-Command supabase -ErrorAction SilentlyContinue
    if ($null -ne $discovered) { return $discovered.Source }

    $pinnedFallback = 'C:\Users\Work\AppData\Local\npm-cache\_npx\66b4952730d9cac8\node_modules\@supabase\cli-windows-x64\bin\supabase.exe'
    if (Test-Path -LiteralPath $pinnedFallback) { return $pinnedFallback }

    throw 'Supabase CLI is unavailable: normal command discovery and pinned local fallback both failed.'
}

try {
    $repoRoot = (git rev-parse --show-toplevel).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'This script must run in a Git repository.' }
    $cli = Resolve-SupabaseCli
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($null -eq $docker) { throw 'Docker is unavailable; local runtime migration validation cannot run.' }
    & $docker.Source version --format '{{.Server.Version}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is unavailable; local runtime migration validation cannot run.' }

    $output = @(& $cli migration list --local)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read local migration history.' }
    $payload = [string]::Join("`n", $output)
    $jsonStart = $payload.IndexOf('{"migrations"')
    if ($jsonStart -lt 0) { throw 'Local migration history did not return machine-readable JSON.' }
    $history = $payload.Substring($jsonStart) | ConvertFrom-Json
    $entry = @($history.migrations | Where-Object { $_.local -eq $MigrationVersion } | Select-Object -First 1)
    if ($entry.Count -ne 1 -or $entry[0].remote -ne $MigrationVersion) {
        throw "RUNTIME MIGRATION CHECK BLOCKED: migration $MigrationVersion is not applied to the local database. Apply it only through an explicitly authorized forward-only local workflow."
    }

    Write-Output "Supabase CLI: $cli"
    Write-Output "RUNTIME MIGRATION CHECK PASS: $MigrationVersion is applied to the local database."
    Write-Output 'This check does not access remote databases or replace semantic migration/RLS review.'
    exit 0
} catch {
    Write-Error $_
    exit 1
}
