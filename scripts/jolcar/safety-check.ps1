param(
  [Parameter(Mandatory=$true)]
  [string]$ResultFile,

  [string]$SchemaFile = (Join-Path $PSScriptRoot "task-result.schema.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ResultFile)) {
  throw "Missing result file: $ResultFile"
}

if (-not (Test-Path $SchemaFile)) {
  throw "Missing task-result schema: $SchemaFile"
}

$result = Get-Content $ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json
$requiredProperties = @(
  "task_id", "status", "starting_head", "ending_head", "commit",
  "working_tree_clean", "tests_passed", "tests", "production_accessed",
  "push_performed", "remote_migrations_applied", "deploy_performed",
  "secrets_changed", "otp_sms_sent", "user_decision_required",
  "stop_reason", "summary", "evidence", "no_change_reason"
)
$actualProperties = @($result.PSObject.Properties.Name)

foreach ($property in $requiredProperties) {
  if ($actualProperties -notcontains $property) {
    throw "Task result is missing required property: $property"
  }
}

foreach ($property in $actualProperties) {
  if ($requiredProperties -notcontains $property) {
    throw "Task result contains unsupported property: $property"
  }
}

foreach ($property in @("task_id", "starting_head", "ending_head", "summary")) {
  if ($result.$property -isnot [string]) {
    throw "Task result property must be a string: $property"
  }
}

if (@("PASS", "FAIL", "BLOCKED", "DEFERRED") -notcontains $result.status) {
  throw "Task result status is invalid."
}

if (($null -ne $result.commit) -and ($result.commit -isnot [string])) {
  throw "Task result commit must be a string or null."
}

foreach ($property in @(
  "working_tree_clean", "tests_passed", "production_accessed", "push_performed",
  "remote_migrations_applied", "deploy_performed", "secrets_changed", "user_decision_required"
)) {
  if ($result.$property -isnot [bool]) {
    throw "Task result property must be a boolean: $property"
  }
}

if (($result.otp_sms_sent -isnot [int]) -and ($result.otp_sms_sent -isnot [long])) {
  throw "Task result otp_sms_sent must be an integer."
}

foreach ($property in @("stop_reason", "no_change_reason")) {
  if (($null -ne $result.$property) -and ($result.$property -isnot [string])) {
    throw "Task result property must be a string or null: $property"
  }
}

foreach ($property in @("tests", "evidence")) {
  if (($result.$property -isnot [System.Collections.IEnumerable]) -or ($result.$property -is [string])) {
    throw "Task result property must be an array: $property"
  }
  foreach ($item in @($result.$property)) {
    if ($item -isnot [string]) {
      throw "Task result array must contain strings: $property"
    }
  }
}

$violations = @()

if ($result.production_accessed -ne $false) { $violations += "production_accessed" }
if ($result.push_performed -ne $false) { $violations += "push_performed" }
if ($result.remote_migrations_applied -ne $false) { $violations += "remote_migrations_applied" }
if ($result.deploy_performed -ne $false) { $violations += "deploy_performed" }
if ($result.secrets_changed -ne $false) { $violations += "secrets_changed" }
if ([int]$result.otp_sms_sent -ne 0) { $violations += "otp_sms_sent" }

if ($violations.Count -gt 0) {
  throw ("SAFETY VIOLATION: " + ($violations -join ", "))
}

if ($result.status -eq "PASS") {
  if ($result.tests_passed -ne $true) {
    throw "PASS result requires tests_passed=true."
  }
  if (@($result.tests).Count -eq 0) {
    throw "PASS result requires test evidence."
  }
  if (@($result.evidence).Count -eq 0) {
    throw "PASS result requires evidence."
  }
  if ($null -ne $result.stop_reason) {
    throw "PASS result must not include a stop_reason."
  }
}

Write-Host "SAFETY CHECK PASS"
