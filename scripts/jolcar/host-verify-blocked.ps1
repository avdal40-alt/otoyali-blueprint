param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot,

  [Parameter(Mandatory=$true)]
  [string]$TaskWorktree,

  [Parameter(Mandatory=$true)]
  [string]$ResultFile
)

$ErrorActionPreference = "Stop"

function Quote-NativeArg {
  param([string]$Value)

  if ($null -eq $Value) { return '""' }
  if ($Value -notmatch '[\s"]') { return $Value }

  # Windows command-line quoting for arguments passed directly to CreateProcess.
  $escaped = $Value -replace '(\\*)"', '$1$1\"'
  $escaped = $escaped -replace '(\\+)$', '$1$1'
  return '"' + $escaped + '"'
}

function Get-RedactedTail {
  param(
    [string]$Text,
    [int]$MaxChars = 1600
  )

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return ""
  }

  # Do not persist or print token-like values even from local test stderr.
  $safe = $Text
  $safe = [regex]::Replace($safe, 'sb_secret_[A-Za-z0-9_-]+', '[REDACTED_SUPABASE_SECRET]')
  $safe = [regex]::Replace($safe, 'sb_publishable_[A-Za-z0-9_-]+', '[REDACTED_SUPABASE_KEY]')
  $safe = [regex]::Replace($safe, '(?i)(service[_-]?role|anon)[^\r\n:=]{0,20}[:=]\s*[A-Za-z0-9._-]{20,}', '$1=[REDACTED]')
  $safe = [regex]::Replace($safe, 'postgresql://[^@\s]+@', 'postgresql://[REDACTED]@')

  if ($safe.Length -gt $MaxChars) {
    $safe = "...[tail] " + $safe.Substring($safe.Length - $MaxChars)
  }

  return ($safe -replace '[\r\n]+', ' ').Trim()
}

function Run-ProcessSafe {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory,
    [int]$TimeoutSeconds = 300
  )

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
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = (($ArgumentList | ForEach-Object { Quote-NativeArg ([string]$_) }) -join " ")

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi

    if (-not $p.Start()) {
      return [pscustomobject]@{
        passed = $false
        exit_code = $null
        reason = "process did not start"
        tail = ""
      }
    }

    # Read both streams asynchronously to avoid stdout/stderr pipe deadlocks.
    $stdoutTask = $p.StandardOutput.ReadToEndAsync()
    $stderrTask = $p.StandardError.ReadToEndAsync()

    $finished = $p.WaitForExit($TimeoutSeconds * 1000)
    if (-not $finished) {
      try { $p.Kill() } catch {}
      try { $p.WaitForExit() } catch {}

      $outText = ""
      $errText = ""
      try { $outText = $stdoutTask.Result } catch {}
      try { $errText = $stderrTask.Result } catch {}

      return [pscustomobject]@{
        passed = $false
        exit_code = $null
        reason = "timeout"
        tail = (Get-RedactedTail (($outText + "`n" + $errText).Trim()))
      }
    }

    # Required on some Windows/.NET combinations before ExitCode is reliable.
    $p.WaitForExit()
    $p.Refresh()

    $stdoutText = ""
    $stderrText = ""
    try { $stdoutText = $stdoutTask.Result } catch {}
    try { $stderrText = $stderrTask.Result } catch {}

    $exitCode = [int]$p.ExitCode
    $tail = ""
    if ($exitCode -ne 0) {
      $tail = Get-RedactedTail (($stdoutText + "`n" + $stderrText).Trim())
    }

    return [pscustomobject]@{
      passed = ($exitCode -eq 0)
      exit_code = $exitCode
      reason = $(if ($exitCode -eq 0) { "PASS" } else { "exit " + $exitCode })
      tail = $tail
    }
  } catch {
    return [pscustomobject]@{
      passed = $false
      exit_code = $null
      reason = ("process exception: " + $_.Exception.Message)
      tail = ""
    }
  } finally {
    foreach ($name in $secretNames) {
      [Environment]::SetEnvironmentVariable($name, $old[$name], "Process")
    }
  }
}

$result = Get-Content -LiteralPath $ResultFile -Raw -Encoding UTF8 | ConvertFrom-Json

$infraDiagnostic = (
  ([string]$result.stop_reason) + "`n" +
  (@($result.tests) -join "`n") + "`n" +
  (@($result.evidence) -join "`n")
)

$infraBlocked = (
  [string]$result.status -eq "BLOCKED" -and
  (
    $infraDiagnostic -match "(?i)\bEPERM\b" -or
    $infraDiagnostic -match "(?i)(denied|cannot|could not|unable to)\s+(spawn|spawning).*(cmd\.exe|docker)" -or
    $infraDiagnostic -match "(?i)(cmd\.exe|docker).*(denied|blocked|cannot|could not|unable)" -or
    $infraDiagnostic -match "(?i)windows sandbox.*(cmd\.exe|docker|process)" -or
    $infraDiagnostic -match "(?i)(cmd\.exe|docker|process).*(windows sandbox|sandbox process restrictions)"
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

function Add-VerifyRequest {
  param(
    [System.Collections.ArrayList]$List,
    [string]$Kind,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) { return }

  $normalizedKind = $Kind.ToLowerInvariant()
  $normalizedValue = $Value.Trim()

  # Some Codex runs emitted HOST_VERIFY_NPM:<filename.test.cjs>. That is not an
  # npm package script, but it is still a tightly bounded repository test file.
  if (
    $normalizedKind -eq "npm" -and
    $normalizedValue -match '^[A-Za-z0-9_.-]+\.(cjs|mjs|js)$'
  ) {
    $normalizedKind = "node"
    $normalizedValue = "apps/web/scripts/" + $normalizedValue
  }

  foreach ($existing in @($List)) {
    if (
      [string]$existing.kind -eq $normalizedKind -and
      [string]$existing.value -eq $normalizedValue
    ) {
      return
    }
  }

  [void]$List.Add([pscustomobject]@{
    kind = $normalizedKind
    value = $normalizedValue
  })
}

function Extract-AllowListedRequestsFromText {
  param(
    [System.Collections.ArrayList]$List,
    [string]$Text
  )

  if ([string]::IsNullOrWhiteSpace($Text)) { return }

  # Exact package-script invocations only. No args, pipes, redirection, shell
  # operators, or environment assignment are accepted.
  foreach ($m in [regex]::Matches(
    $Text,
    '(?i)(?:^|[\s:;])npm(?:\.cmd)?\s+run\s+([A-Za-z0-9:_-]+)(?=$|[\s,.;)])'
  )) {
    Add-VerifyRequest -List $List -Kind "npm" -Value $m.Groups[1].Value
  }

  # Exact repository JS test files only.
  foreach ($m in [regex]::Matches(
    $Text,
    '(?i)(?:^|[\s:;])node(?:\.exe)?\s+((?:apps[\\/]+web[\\/]+)?scripts[\\/]+[A-Za-z0-9_.\\/-]+\.(?:cjs|mjs|js))(?=$|[\s,.;)])'
  )) {
    Add-VerifyRequest -List $List -Kind "node" -Value $m.Groups[1].Value
  }
}

$requests = New-Object System.Collections.ArrayList

foreach ($entry in @($result.evidence) + @($result.tests)) {
  $text = [string]$entry

  if ($text -match '^\s*HOST_VERIFY_NPM:\s*([A-Za-z0-9:_.\\/-]+)\s*$') {
    Add-VerifyRequest -List $requests -Kind "npm" -Value $matches[1]
  }

  if ($text -match '^\s*HOST_VERIFY_NODE:\s*([A-Za-z0-9_./\\-]+)\s*$') {
    Add-VerifyRequest -List $requests -Kind "node" -Value $matches[1]
  }
}

# Existing historical blockers sometimes predate the current marker protocol.
# Recover only literal allow-listed commands already recorded by Codex.
if ($requests.Count -eq 0) {
  foreach ($entry in @($result.tests)) {
    Extract-AllowListedRequestsFromText -List $requests -Text ([string]$entry)
  }
}

# Last bounded fallback: parse command-shaped strings from this task's queue
# verification field. Descriptive prose is ignored.
if ($requests.Count -eq 0) {
  $queuePath = Join-Path $RepoRoot "docs\jolcar-control\TASK_QUEUE.json"
  if (Test-Path -LiteralPath $queuePath) {
    try {
      $queue = Get-Content -LiteralPath $queuePath -Raw -Encoding UTF8 | ConvertFrom-Json
      $task = $queue.tasks |
        Where-Object { [string]$_.id -eq [string]$result.task_id } |
        Select-Object -First 1

      foreach ($entry in @($task.verification)) {
        Extract-AllowListedRequestsFromText -List $requests -Text ([string]$entry)
      }
    } catch {
      # Queue parsing is diagnostic fallback only; never weaken the allow-list.
    }
  }
}

if ($requests.Count -eq 0) {
  [pscustomobject]@{
    attempted = $false
    passed = $false
    reason = "No exact allow-listed host verification command could be recovered"
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
    $checks += [pscustomobject]@{ command = "npm run " + $scriptName; passed = $r.passed; reason = $r.reason; tail = $r.tail }
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
    $checks += [pscustomobject]@{ command = "node " + $relative; passed = $r.passed; reason = $r.reason; tail = $r.tail }
    if (-not $r.passed) { $allPassed = $false }
  }
}

[pscustomobject]@{
  attempted = $true
  passed = $allPassed
  reason = $(if ($allPassed) { "all allow-listed host verification requests passed" } else { "one or more host verification requests failed" })
  checks = @($checks)
} | ConvertTo-Json -Depth 10 -Compress
