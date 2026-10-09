param(
  [Parameter(Mandatory=$true)]
  [string]$ResultFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ResultFile)) {
  throw "Missing result file: $ResultFile"
}

$result = Get-Content $ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json
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

Write-Host "SAFETY CHECK PASS"
