param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot,

  [Parameter(Mandatory=$true)]
  [string]$TaskId
)

$ErrorActionPreference = "Stop"

function Save-Json {
  param($Object, [string]$Path)
  $Object | ConvertTo-Json -Depth 30 | Set-Content $Path -Encoding UTF8
}

function Get-SafeTail {
  param([string]$Path, [int]$MaxChars = 1200)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return ""
  }

  $text = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if ($text.Length -le $MaxChars) {
    return $text.Trim()
  }

  return ("...[tail truncated] " + $text.Substring($text.Length - $MaxChars)).Trim()
}

function Invoke-SafeNpmScript {
  param(
    [string]$WebRoot,
    [string]$ScriptName,
    [string]$ScriptCommand,
    [string]$RuntimeDir,
    [int]$TimeoutSeconds = 180
  )

  $blockedText = (
    [string]$ScriptName + " " + [string]$ScriptCommand
  )

  if ($blockedText -match "(?i)\b(vercel|deploy|publish|production|prod:|supabase\s+(link|db\s+push|functions\s+deploy)|git\s+push|twilio|curl\s+https?://|invoke-webrequest\s+https?://|npm\s+publish)\b") {
    return [pscustomobject]@{
      script = $ScriptName
      status = "SKIPPED_POLICY"
      exit_code = $null
      duration_ms = 0
      tail = ""
    }
  }

  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npm) {
    return [pscustomobject]@{
      script = $ScriptName
      status = "SKIPPED_NO_NPM"
      exit_code = $null
      duration_ms = 0
      tail = ""
    }
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmssfff"
  $safeName = ($ScriptName -replace '[^A-Za-z0-9_.-]', '_')
  $stdoutFile = Join-Path $RuntimeDir ("precheck-" + $safeName + "-" + $stamp + ".stdout.tmp")
  $stderrFile = Join-Path $RuntimeDir ("precheck-" + $safeName + "-" + $stamp + ".stderr.tmp")

  $secretNames = @(
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_DB_PASSWORD",
    "VERCEL_TOKEN",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "OPENAI_API_KEY"
  )

  $oldValues = @{}
  foreach ($name in $secretNames) {
    $oldValues[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
    [Environment]::SetEnvironmentVariable($name, $null, "Process")
  }
  [Environment]::SetEnvironmentVariable("SUPABASE_TELEMETRY_DISABLED", "1", "Process")

  $sw = [System.Diagnostics.Stopwatch]::StartNew()

  try {
    $p = Start-Process `
      -FilePath $npm.Source `
      -ArgumentList @("run", $ScriptName) `
      -WorkingDirectory $WebRoot `
      -RedirectStandardOutput $stdoutFile `
      -RedirectStandardError $stderrFile `
      -NoNewWindow `
      -PassThru

    $finished = $p.WaitForExit($TimeoutSeconds * 1000)

    if (-not $finished) {
      try { $p.Kill() } catch {}
      $sw.Stop()

      return [pscustomobject]@{
        script = $ScriptName
        status = "TIMEOUT"
        exit_code = $null
        duration_ms = [int]$sw.ElapsedMilliseconds
        tail = (Get-SafeTail -Path $stderrFile)
      }
    }

    $p.WaitForExit()
    $sw.Stop()

    $tail = ""
    if ($p.ExitCode -ne 0) {
      $tail = ((Get-SafeTail -Path $stdoutFile) + "`n" + (Get-SafeTail -Path $stderrFile)).Trim()
    }

    return [pscustomobject]@{
      script = $ScriptName
      status = $(if ($p.ExitCode -eq 0) { "PASS" } else { "FAIL" })
      exit_code = $p.ExitCode
      duration_ms = [int]$sw.ElapsedMilliseconds
      tail = $tail
    }
  } finally {
    foreach ($name in $secretNames) {
      [Environment]::SetEnvironmentVariable($name, $oldValues[$name], "Process")
    }

    Remove-Item -LiteralPath $stdoutFile,$stderrFile -Force -ErrorAction SilentlyContinue
  }
}

$queuePath = Join-Path $RepoRoot "docs\jolcar-control\TASK_QUEUE.json"
if (-not (Test-Path -LiteralPath $queuePath)) {
  throw "TASK_QUEUE.json not found: $queuePath"
}

$runtime = Join-Path $RepoRoot ".jolcar-runtime"
$precheckDir = Join-Path $runtime "precheck"
$logs = Join-Path $runtime "logs"
New-Item -ItemType Directory -Force $precheckDir | Out-Null

$queue = Get-Content -LiteralPath $queuePath -Raw -Encoding UTF8 | ConvertFrom-Json
$task = $queue.tasks | Where-Object { [string]$_.id -eq $TaskId } | Select-Object -First 1
if (-not $task) {
  throw "Task not found in queue: $TaskId"
}

$head = ((& git -C $RepoRoot rev-parse HEAD).Trim())

$result = [ordered]@{
  task_id = $TaskId
  head = $head
  checked_at = (Get-Date).ToString("o")
  decision = "CODEX"
  reason = "No deterministic zero-AI completion proof."
  recovered_no_change_pass = $false
  candidate_files = @()
  candidate_scripts = @()
  checks = @()
}

# ------------------------------------------------------------------
# Tier 0A: strict same-HEAD no-change PASS recovery.
# This costs zero Codex tokens and is safe because it requires:
# - PASS
# - tests passed
# - clean task worktree
# - identical start/end/current HEAD
# - no commit
# - explicit no_change_reason
# - all safety flags false
# ------------------------------------------------------------------
$latestResults = @(
  Get-ChildItem (Join-Path $logs ($TaskId + "-*-result.json")) -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
)

foreach ($item in $latestResults) {
  try {
    $prior = Get-Content -LiteralPath $item.FullName -Raw -Encoding UTF8 | ConvertFrom-Json

    $strict = (
      [string]$prior.task_id -eq $TaskId -and
      [string]$prior.status -eq "PASS" -and
      -not $prior.commit -and
      $prior.working_tree_clean -eq $true -and
      $prior.tests_passed -eq $true -and
      [string]$prior.starting_head -eq $head -and
      [string]$prior.ending_head -eq $head -and
      -not [string]::IsNullOrWhiteSpace([string]$prior.no_change_reason) -and
      $prior.production_accessed -eq $false -and
      $prior.push_performed -eq $false -and
      $prior.remote_migrations_applied -eq $false -and
      $prior.deploy_performed -eq $false -and
      $prior.secrets_changed -eq $false -and
      [int]$prior.otp_sms_sent -eq 0
    )

    if ($strict) {
      $result.decision = "PASS"
      $result.reason = "Recovered verified same-HEAD no-change PASS; Codex call not needed."
      $result.recovered_no_change_pass = $true
      $result.checks = @(
        [pscustomobject]@{
          kind = "cached_result"
          status = "PASS"
          source = $item.Name
        }
      )
      break
    }
  } catch {
    # Ignore malformed old evidence and continue conservatively.
  }
}

if ($result.decision -eq "PASS") {
  $outPath = Join-Path $precheckDir ($TaskId + ".json")
  Save-Json -Object $result -Path $outPath
  $result | ConvertTo-Json -Depth 30 -Compress
  exit 0
}

# ------------------------------------------------------------------
# Tier 0B: host-side relevance indexing. No AI.
# Find likely files before Codex so the model does not inventory the repo.
# ------------------------------------------------------------------
$signal = (
  [string]$task.title + " " +
  [string]$task.description + " " +
  (@($task.acceptance_criteria) -join " ") + " " +
  (@($task.verification) -join " ")
).ToLowerInvariant()

$stopWords = @(
  "the","and","for","with","from","into","without","where","when","then",
  "current","existing","relevant","tests","test","testing","typecheck",
  "implementation","foundation","baseline","readiness","launch","local",
  "shared","public","private","works","work","pass","passes","explicit",
  "required","support","supported","using","used","only","task","code"
)

$keywords = @()
foreach ($m in [regex]::Matches($signal, '[a-z0-9][a-z0-9_-]{2,}')) {
  $word = $m.Value
  if ($word.Length -lt 4) { continue }
  if ($stopWords -contains $word) { continue }
  if (-not ($keywords -contains $word)) {
    $keywords += $word
  }
  if ($keywords.Count -ge 12) { break }
}

$trackedFiles = @(& git -C $RepoRoot ls-files)
$scoredFiles = @()

foreach ($file in $trackedFiles) {
  $lower = $file.ToLowerInvariant()

  if ($lower -match '(^|/)(node_modules|\.next|dist|coverage|vendor)(/|$)') {
    continue
  }

  $score = 0
  foreach ($kw in $keywords) {
    if ($lower.Contains($kw)) {
      $score += 3
    }
  }

  if ($file -match '(?i)(test|spec)\.(cjs|mjs|js|jsx|ts|tsx)$') {
    $score += 1
  }

  if ($score -gt 0) {
    $scoredFiles += [pscustomobject]@{
      path = $file
      score = $score
    }
  }
}

$candidates = @(
  $scoredFiles |
    Sort-Object @{Expression="score";Descending=$true}, @{Expression="path";Descending=$false} |
    Select-Object -First 12 |
    ForEach-Object { $_.path }
)

# If path matching was sparse, use at most four literal grep keywords.
if ($candidates.Count -lt 8) {
  foreach ($kw in @($keywords | Select-Object -First 4)) {
    $grepFiles = @(& git -C $RepoRoot grep -I -l -i -F -- $kw 2>$null)
    foreach ($gf in $grepFiles) {
      if (-not ($candidates -contains $gf)) {
        $candidates += $gf
      }
      if ($candidates.Count -ge 12) { break }
    }
    if ($candidates.Count -ge 12) { break }
  }
}

$result.candidate_files = @($candidates | Select-Object -First 12)

# ------------------------------------------------------------------
# Tier 0C: safe, local, targeted check discovery.
# We run only:
# - typecheck when the queue explicitly asks for it;
# - up to 2 strongly-related test:* scripts;
# and refuse scripts that look like deploy/prod/network mutation commands.
# This is evidence for Codex, not an automatic semantic PASS.
# ------------------------------------------------------------------
$webRoot = Join-Path $RepoRoot "apps\web"
$packagePath = Join-Path $webRoot "package.json"

if (Test-Path -LiteralPath $packagePath) {
  try {
    $package = Get-Content -LiteralPath $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $scriptProps = @($package.scripts.PSObject.Properties)

    $verificationText = (@($task.verification) -join " ").ToLowerInvariant()
    $scriptsToRun = @()

    if (
      $verificationText -match '\btypecheck\b' -and
      ($scriptProps.Name -contains "typecheck")
    ) {
      $scriptsToRun += [pscustomobject]@{
        name = "typecheck"
        command = [string]$package.scripts.typecheck
        score = 999
      }
    }

    $domainAliases = @{
      "auth" = @("auth","phone","otp","seller-contact","b01")
      "phone" = @("phone","otp","auth","seller-contact")
      "seller" = @("seller","listing","contact")
      "country" = @("country","market","locale","routing")
      "metadata" = @("metadata","seo","routing","country")
      "message" = @("message","messaging","chat","unread")
      "messaging" = @("message","messaging","chat","unread")
      "chat" = @("chat","message","messaging")
      "listing" = @("listing","seller","draft","publish")
      "draft" = @("draft","listing")
      "media" = @("media","image","video","storage")
      "dealer" = @("dealer","crm","live","import")
      "crm" = @("crm","dealer","lead")
      "live" = @("live","dealer","stream")
      "review" = @("review","vehicle")
      "vin" = @("vin","trust")
      "fraud" = @("fraud","moderation")
      "notification" = @("notification","alert")
      "search" = @("search","filter")
      "ai" = @("ai","tool","redaction")
      "accessibility" = @("accessibility","a11y")
      "news" = @("news")
    }

    $expandedTerms = @()
    foreach ($kw in $keywords) {
      if (-not ($expandedTerms -contains $kw)) {
        $expandedTerms += $kw
      }
      if ($domainAliases.ContainsKey($kw)) {
        foreach ($alias in $domainAliases[$kw]) {
          if (-not ($expandedTerms -contains $alias)) {
            $expandedTerms += $alias
          }
        }
      }
    }

    $testCandidates = @()
    foreach ($prop in $scriptProps) {
      $name = [string]$prop.Name
      $command = [string]$prop.Value

      if ($name -notlike "test:*") { continue }
      if ($name -match "(?i)(e2e|browser|visual|smoke|prod|production)") { continue }

      $lowerName = $name.ToLowerInvariant()
      $score = 0

      foreach ($term in $expandedTerms) {
        if ($term.Length -ge 3 -and $lowerName.Contains($term)) {
          $score++
        }
      }

      if ($score -gt 0) {
        $testCandidates += [pscustomobject]@{
          name = $name
          command = $command
          score = $score
        }
      }
    }

    foreach ($candidate in @(
      $testCandidates |
        Sort-Object @{Expression="score";Descending=$true}, @{Expression="name";Descending=$false} |
        Select-Object -First 2
    )) {
      if (-not ($scriptsToRun.name -contains $candidate.name)) {
        $scriptsToRun += $candidate
      }
    }

    $result.candidate_scripts = @($scriptsToRun | ForEach-Object { $_.name })

    foreach ($script in $scriptsToRun) {
      $check = Invoke-SafeNpmScript `
        -WebRoot $webRoot `
        -ScriptName ([string]$script.name) `
        -ScriptCommand ([string]$script.command) `
        -RuntimeDir $runtime

      $result.checks += $check
    }
  } catch {
    $result.checks += [pscustomobject]@{
      kind = "precheck"
      status = "NONFATAL_ERROR"
      message = $_.Exception.Message
    }
  }
}

$outPath = Join-Path $precheckDir ($TaskId + ".json")
Save-Json -Object $result -Path $outPath
$result | ConvertTo-Json -Depth 30 -Compress
