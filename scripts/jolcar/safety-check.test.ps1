$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$safetyCheck = Join-Path $repoRoot "scripts\jolcar\safety-check.ps1"
$preflight = Join-Path $repoRoot "scripts\jolcar\preflight.ps1"
$safeResult = Join-Path ([System.IO.Path]::GetTempPath()) ("jolcar-safe-" + [guid]::NewGuid().ToString() + ".json")
$unsafeResult = Join-Path ([System.IO.Path]::GetTempPath()) ("jolcar-unsafe-" + [guid]::NewGuid().ToString() + ".json")
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("jolcar-preflight-" + [guid]::NewGuid().ToString())

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function Write-ResultFixture {
  param([string]$Path, [string]$UnsafeProperty = "")
  $fixture = [ordered]@{ task_id="JLC-TEST"; status="PASS"; starting_head="test"; ending_head="test"; commit=$null; working_tree_clean=$true; tests_passed=$true; tests=@("fixture"); production_accessed=$false; push_performed=$false; remote_migrations_applied=$false; deploy_performed=$false; secrets_changed=$false; otp_sms_sent=0; user_decision_required=$false; stop_reason=$null; summary="fixture"; evidence=@("fixture"); no_change_reason=$null }
  if ($UnsafeProperty) { $fixture[$UnsafeProperty] = if ($UnsafeProperty -eq "otp_sms_sent") { 1 } else { $true } }
  $fixture | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path -Encoding UTF8
}

try {
  Write-ResultFixture -Path $safeResult
  & $safetyCheck -ResultFile $safeResult
  foreach ($property in @("production_accessed", "push_performed", "remote_migrations_applied", "deploy_performed", "secrets_changed", "otp_sms_sent")) {
    Write-ResultFixture -Path $unsafeResult -UnsafeProperty $property
    $rejected = $false
    try { & $safetyCheck -ResultFile $unsafeResult } catch { $rejected = $true }
    Assert-True $rejected "Policy guard accepted $property=true."
  }

  # A minimal isolated repository exercises static unsafe paths without touching Docker or Supabase.
  New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
  @("docs\jolcar-control", "scripts\jolcar", "supabase\migrations") | ForEach-Object { New-Item -ItemType Directory -Path (Join-Path $fixtureRoot $_) -Force | Out-Null }
  @("MASTER_PLAN.md", "TASK_QUEUE.json", "DECISIONS.md", "AGENTS.md") | ForEach-Object { Set-Content -LiteralPath (Join-Path $fixtureRoot "docs\jolcar-control\$_") -Value "fixture" }
  @("safety-check.ps1", "task-result.schema.json") | ForEach-Object { Set-Content -LiteralPath (Join-Path $fixtureRoot "scripts\jolcar\$_") -Value "fixture" }
  Set-Content -LiteralPath (Join-Path $fixtureRoot "supabase\config.toml") -Value 'project_id = "local-fixture"'
  Set-Content -LiteralPath (Join-Path $fixtureRoot "supabase\migrations\20260101000000_one.sql") -Value "select 1;"
  Set-Content -LiteralPath (Join-Path $fixtureRoot "supabase\migrations\20260101000000_two.sql") -Value "select 1;"
  & git -C $fixtureRoot init -q; & git -C $fixtureRoot add .; & git -C $fixtureRoot -c user.name=fixture -c user.email=fixture@example.invalid commit -qm fixture
  $duplicateOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preflight -RepoRoot $fixtureRoot 2>&1
  $duplicateExit = $LASTEXITCODE
  Assert-True ($duplicateExit -ne 0 -and ($duplicateOutput -join "`n") -match "Duplicate migration version") "Duplicate migration versions were not rejected."

  Remove-Item -LiteralPath (Join-Path $fixtureRoot "supabase\migrations\20260101000000_two.sql")
  New-Item -ItemType Directory -Path (Join-Path $fixtureRoot "supabase\.temp") | Out-Null
  Set-Content -LiteralPath (Join-Path $fixtureRoot "supabase\.temp\linked-project-ref") -Value "production-looking-ref"
  $remoteOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preflight -RepoRoot $fixtureRoot 2>&1
  $remoteExit = $LASTEXITCODE
  Assert-True ($remoteExit -ne 0 -and ($remoteOutput -join "`n") -match "Remote guard rejected") "Linked project metadata was not rejected."

  $wrongRootOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $preflight -RepoRoot (Join-Path $fixtureRoot "missing") 2>&1
  Assert-True ($LASTEXITCODE -ne 0 -and ($wrongRootOutput -join "`n") -match "FAIL") "Wrong repository context was not rejected."
  Write-Host "JOLCAR PREFLIGHT TEST PASS"
} finally {
  foreach ($fixture in @($safeResult, $unsafeResult, $fixtureRoot)) { if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force } }
}
