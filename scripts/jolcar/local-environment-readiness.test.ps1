$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$readiness = Join-Path $repoRoot "scripts\jolcar\local-environment-readiness.ps1"
$before = (Get-FileHash -LiteralPath (Join-Path $repoRoot "supabase\config.toml") -Algorithm SHA256).Hash

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $readiness -RepoRoot $repoRoot
if ($LASTEXITCODE -ne 0) { throw "Local environment readiness smoke failed." }

$after = (Get-FileHash -LiteralPath (Join-Path $repoRoot "supabase\config.toml") -Algorithm SHA256).Hash
if ($before -ne $after) { throw "Readiness smoke changed supabase/config.toml." }

Write-Host "JLC-0004 LOCAL ENVIRONMENT READINESS TEST PASS"
