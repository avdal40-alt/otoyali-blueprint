$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$safetyCheck = Join-Path $repoRoot "scripts\jolcar\safety-check.ps1"
$safeResult = Join-Path ([System.IO.Path]::GetTempPath()) ("jolcar-safe-" + [guid]::NewGuid().ToString() + ".json")
$unsafeResult = Join-Path ([System.IO.Path]::GetTempPath()) ("jolcar-unsafe-" + [guid]::NewGuid().ToString() + ".json")

function Write-ResultFixture {
  param([string]$Path, [string]$UnsafeProperty = "")

  $fixture = [ordered]@{
    task_id = "JLC-TEST"
    status = "PASS"
    starting_head = "test"
    ending_head = "test"
    commit = $null
    working_tree_clean = $true
    tests_passed = $true
    tests = @("fixture")
    production_accessed = $false
    push_performed = $false
    remote_migrations_applied = $false
    deploy_performed = $false
    secrets_changed = $false
    otp_sms_sent = 0
    user_decision_required = $false
    stop_reason = $null
    summary = "fixture"
    evidence = @("fixture")
    no_change_reason = $null
  }

  if ($UnsafeProperty) {
    $fixture[$UnsafeProperty] = if ($UnsafeProperty -eq "otp_sms_sent") { 1 } else { $true }
  }

  $fixture | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path -Encoding UTF8
}

try {
  Write-ResultFixture -Path $safeResult
  & $safetyCheck -ResultFile $safeResult

  foreach ($property in @(
    "production_accessed",
    "push_performed",
    "remote_migrations_applied",
    "deploy_performed",
    "secrets_changed",
    "otp_sms_sent"
  )) {
    Write-ResultFixture -Path $unsafeResult -UnsafeProperty $property
    $unsafeRejected = $false
    try {
      & $safetyCheck -ResultFile $unsafeResult
    } catch {
      $unsafeRejected = $true
    }

    if (-not $unsafeRejected) {
      throw "Policy guard accepted $property=true."
    }
  }

  Write-Host "SAFETY CHECK TEST PASS"
} finally {
  foreach ($fixture in @($safeResult, $unsafeResult)) {
    if (Test-Path -LiteralPath $fixture) {
      [System.IO.File]::Delete($fixture)
    }
  }
}
