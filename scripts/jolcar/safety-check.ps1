param(
  [Parameter(Mandatory=$true)][string]$ResultFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ResultFile)) { throw "Missing result file: $ResultFile" }
$r = Get-Content $ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json

$violations = @()
if ($r.production_accessed -ne $false) { $violations += "production_accessed" }
if ($r.push_performed -ne $false) { $violations += "push_performed" }
if ($r.remote_migrations_applied -ne $false) { $violations += "remote_migrations_applied" }
if ($r.deploy_performed -ne $false) { $violations += "deploy_performed" }
if ($r.secrets_changed -ne $false) { $violations += "secrets_changed" }
if ([int]$r.otp_sms_sent -ne 0) { $violations += "otp_sms_sent" }

if ($violations.Count -gt 0) {
  throw ("SAFETY VIOLATION: " + ($violations -join ", "))
}

Write-Host "SAFETY CHECK PASS"
