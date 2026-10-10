param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot,

  [Parameter(Mandatory=$true)]
  [string]$TaskWorktree,

  [Parameter(Mandatory=$true)]
  [string]$ResultFile
)

$ErrorActionPreference = "Stop"

function Run-ProcessSafe {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory,
    [int]$TimeoutSeconds = 300
  )

  $runtime = Join-Path $RepoRoot ".jolcar-runtime"
  New-Item -ItemType Directory -Force $runtime | Out-Null
  $stamp = Get-Date -Format "yyyyMMdd-HHmmssfff"
  $stdout = Join-Path $runtime ("host-verify-" + $stamp + ".stdout.tmp")
  $stderr = Join-Path $runtime ("host-verify-" + $stamp + ".stderr.tmp")

  $secretNames = @(
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_DB_PASSWORD",
    "VERCEL_TOKEN",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "OPENAI_API_KEY"
  )

  $old = @{}
  foreach ($name in $secretNames) {
    $old[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
    [Environment]::SetEnvironmentVariable($name, $null, "Process")
  }
  [Environment]::SetEnvironmentVariable("SUPABASE_TELEMETRY_DISABLED", "1", "Process")

  try {
    $p = Start-Process `
      -FilePath $FilePath `
      -ArgumentList $ArgumentList `
      -WorkingDirectory $WorkingDirectory `
      -RedirectStandardOutput $stdout `
      -RedirectStandardError $stderr `
      -NoNewWindow `
      -PassThru

    $finished = $p.WaitForExit($TimeoutSeconds * 1000)
    if (-not $finished) {
      try { $p.Kill() } catch {}
      return [pscustomobject]@{
        passed = $false
        exit_code = $null
        reason = "timeout"
      }
    }

    $p.WaitForExit()
    return [pscustomobject]@{
      passed = ($p.ExitCode -eq 0)
      exit_code = $p.ExitCode
      reason = $(if ($p.ExitCode -eq 0) { "PASS" } else { "exit " + $p.ExitCode })
    }
  } finally {
    foreach ($name in $secretNames) {
      [Environment]::SetEnvironmentVariable($name, $old[$name], "Process")
    }
    Remove-Item -LiteralPath $stdout,$stderr -Force -ErrorAction SilentlyContinue
  }
}

$result = Get-Content -LiteralPath $ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json

$infraBlocked = (
  [string]$result.status -eq "BLOCKED" -and
  (
    [string]$result.stop_reason -match "(?i)\bEPERM\b" -or
    [string]$result.stop_reason -match "(?i)(denied|cannot|could not|unable to)\s+(spawn|spawning).*(cmd\.exe|docker)" -or
    [string]$result.stop_reason -match "(?i)(cmd\.exe|docker).*(denied|blocked|cannot|could not|unable)" -or
    [string]$result.stop_reason -match "(?i)windows sandbox.*(cmd\.exe|docker)" -or
    [string]$result.stop_reason -match "(?i)(cmd\.exe|docker).*windows sandbox"
  )
)

if (-not $infraBlocked) {
  [pscustomobject]@{
    attempted = $false
    passed = $false
    reason = "not an allow-listed Windows sandbox infrastructure blocker"
    checks = @()
  } | ConvertTo-Json -Depth 10 -Compress
  exit 0
}

$requests = @()
foreach ($entry in @($result.evidence)) {
  $text = [string]$entry

  if ($text -match '^\s*HOST_VERIFY_NPM:\s*([A-Za-z0-9:_-]+)\s*$') {
    $requests += [pscustomobject]@{
      kind = "npm"
      value = $matches[1]
    }
  }

  if ($text -match '^\s*HOST_VERIFY_NODE:\s*([A-Za-z0-9_./\\-]+)\s*$') {
    $requests += [pscustomobject]@{
      kind = "node"
      value = $matches[1]
    }
  }
}

if ($requests.Count -eq 0) {
  [pscustomobject]@{
    attempted = $false
    passed = $false
    reason = "Codex did not provide allow-listed HOST_VERIFY requests"
    checks = @()
  } | ConvertTo-Json -Depth 10 -Compress
  exit 0
}

$webRoot = Join-Path $TaskWorktree "apps\web"
$packagePath = Join-Path $webRoot "package.json"
if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "apps/web/package.json missing in task worktree."
}

$package = Get-Content -LiteralPath $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
$node = (Get-Command node.exe -ErrorAction SilentlyContinue)
if (-not $npm -or -not $node) {
  throw "npm.cmd or node.exe unavailable for host verification."
}

$checks = @()
$allPassed = $true

foreach ($req in $requests) {
  if ($req.kind -eq "npm") {
    $scriptName = [string]$req.value
    $prop = $package.scripts.PSObject.Properties[$scriptName]
    if (-not $prop) {
      $checks += [pscustomobject]@{ command = "npm run " + $scriptName; passed = $false; reason = "script missing" }
      $allPassed = $false
      continue
    }

    $scriptCommand = [string]$prop.Value
    if ($scriptCommand -match "(?i)\b(vercel|deploy|publish|production|supabase\s+(link|db\s+push|functions\s+deploy)|git\s+push|twilio|npm\s+publish)\b") {
      $checks += [pscustomobject]@{ command = "npm run " + $scriptName; passed = $false; reason = "blocked by host policy" }
      $allPassed = $false
      continue
    }

    $r = Run-ProcessSafe -FilePath $npm.Source -ArgumentList @("run",$scriptName) -WorkingDirectory $webRoot
    $checks += [pscustomobject]@{ command = "npm run " + $scriptName; passed = $r.passed; reason = $r.reason }
    if (-not $r.passed) { $allPassed = $false }
  }

  if ($req.kind -eq "node") {
    $relative = ([string]$req.value).Replace("/","\")

    # Codex may express the allow-listed path either as:
    #   scripts/foo.test.cjs
    # or:
    #   apps/web/scripts/foo.test.cjs
    # Normalize both to a path relative to apps/web.
    if ($relative -match '^(?i)apps\\web\\(.+)$') {
      $relative = $matches[1]
    }

    $candidate = Join-Path $webRoot $relative
    $full = [System.IO.Path]::GetFullPath($candidate)
    $webFull = [System.IO.Path]::GetFullPath($webRoot)

    if (-not $full.StartsWith($webFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      $checks += [pscustomobject]@{ command = "node " + $relative; passed = $false; reason = "path escapes apps/web" }
      $allPassed = $false
      continue
    }

    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $checks += [pscustomobject]@{ command = "node " + $relative; passed = $false; reason = "file missing" }
      $allPassed = $false
      continue
    }

    if ($full -notmatch '(?i)\\scripts\\.*\.(cjs|mjs|js)$') {
      $checks += [pscustomobject]@{ command = "node " + $relative; passed = $false; reason = "only apps/web/scripts JS test files are allowed" }
      $allPassed = $false
      continue
    }

    # Repository test scripts are normally invoked from the task/repository root as
    # `node apps/web/scripts/...`. Keep that cwd so process.cwd()-based fixtures
    # and config resolution behave exactly like the normal test command.
    $r = Run-ProcessSafe -FilePath $node.Source -ArgumentList @($full) -WorkingDirectory $TaskWorktree
    $checks += [pscustomobject]@{ command = "node " + $relative; passed = $r.passed; reason = $r.reason }
    if (-not $r.passed) { $allPassed = $false }
  }
}

[pscustomobject]@{
  attempted = $true
  passed = $allPassed
  reason = $(if ($allPassed) { "all allow-listed host verification requests passed" } else { "one or more host verification requests failed" })
  checks = @($checks)
} | ConvertTo-Json -Depth 10 -Compress
