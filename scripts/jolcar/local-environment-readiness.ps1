[CmdletBinding()]
param(
  [string]$RepoRoot
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Join-Path (Split-Path -Parent $PSScriptRoot) ".."
}

function Assert-LocalUri([string]$Value, [string]$Name) {
  $uri = [uri]$Value
  if ($uri.Scheme -notin @("http", "https") -or $uri.Host -notin @("127.0.0.1", "localhost", "::1")) {
    throw "$Name is not a loopback HTTP endpoint."
  }
  return $uri
}

try {
  $resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot -ErrorAction Stop).Path
  $configPath = Join-Path $resolvedRoot "supabase\config.toml"
  if (-not (Test-Path -LiteralPath $configPath)) { throw "Local Supabase config is missing." }
  $initialConfigHash = (Get-FileHash -LiteralPath $configPath -Algorithm SHA256).Hash

  # Capture the CLI environment only in memory: it contains credentials that
  # must never be emitted by local readiness checks.
  $statusOutput = & cmd.exe /d /c "npx.cmd supabase status -o env 2>&1"
  $statusExitCode = $LASTEXITCODE
  if ($statusExitCode -ne 0) { throw "Local Supabase status discovery failed." }

  $runtime = @{}
  foreach ($line in $statusOutput) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      $runtime[$matches[1]] = $matches[2].Trim('"')
    }
  }
  foreach ($required in @("API_URL", "REST_URL", "ANON_KEY")) {
    if ([string]::IsNullOrWhiteSpace($runtime[$required])) { throw "Local Supabase status omitted $required." }
  }

  $apiUri = Assert-LocalUri $runtime["API_URL"] "API_URL"
  $restUri = Assert-LocalUri $runtime["REST_URL"] "REST_URL"
  $authResponse = Invoke-WebRequest -Uri ($apiUri.AbsoluteUri.TrimEnd('/') + "/auth/v1/health") -UseBasicParsing
  if ($authResponse.StatusCode -ne 200) { throw "Local Auth health check returned HTTP $($authResponse.StatusCode)." }
  $restResponse = Invoke-WebRequest -Uri ($restUri.AbsoluteUri.TrimEnd('/') + "/") -Headers @{ apikey = $runtime["ANON_KEY"] } -UseBasicParsing
  if ($restResponse.StatusCode -ne 200) { throw "Local PostgREST health check returned HTTP $($restResponse.StatusCode)." }

  $finalConfigHash = (Get-FileHash -LiteralPath $configPath -Algorithm SHA256).Hash
  if ($finalConfigHash -ne $initialConfigHash) { throw "supabase/config.toml changed during readiness verification." }
  $configDiff = & git -C $resolvedRoot diff --exit-code -- supabase/config.toml 2>$null
  if ($LASTEXITCODE -ne 0) { throw "supabase/config.toml has uncommitted changes." }

  Write-Host "LOCAL ENVIRONMENT READINESS PASS api=loopback auth=200 postgrest=200 config=unchanged"
  exit 0
} catch {
  Write-Host "LOCAL ENVIRONMENT READINESS FAIL $($_.Exception.Message)"
  exit 1
}
