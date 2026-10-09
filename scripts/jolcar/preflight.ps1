param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot
)

$ErrorActionPreference = "Stop"

function Fail {
  param([string]$Message)
  Write-Error $Message
  exit 1
}

if (-not (Test-Path $RepoRoot)) {
  Fail "Repository path not found: $RepoRoot"
}

$inside = & git -C $RepoRoot rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0 -or ([string]$inside).Trim() -ne "true") {
  Fail "Not a Git worktree: $RepoRoot"
}

$required = @(
  "docs\jolcar-control\MASTER_PLAN.md",
  "docs\jolcar-control\TASK_QUEUE.json",
  "docs\jolcar-control\AGENTS.md",
  "docs\jolcar-control\DECISIONS.md",
  "scripts\jolcar\task-result.schema.json",
  "scripts\jolcar\run-task.ps1",
  "scripts\jolcar\continuous.ps1",
  "scripts\jolcar\safety-check.ps1"
)

foreach ($rel in $required) {
  $full = Join-Path $RepoRoot $rel
  if (-not (Test-Path $full)) {
    Fail "Missing required runner/control file: $rel"
  }
}

$status = & git -C $RepoRoot status --porcelain=v1
if ($LASTEXITCODE -ne 0) {
  Fail "git status failed."
}
if ($status) {
  Fail ("Integration worktree is not clean. Refusing autonomous run.`r`n" + ($status -join "`r`n"))
}

$codexPath = $null
$cmd = Get-Command codex -ErrorAction SilentlyContinue
if ($cmd) {
  if ($cmd.Source) {
    $codexPath = $cmd.Source
  } elseif ($cmd.Path) {
    $codexPath = $cmd.Path
  }
}

if (-not $codexPath) {
  $root = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin"
  if (Test-Path $root) {
    $candidate = Get-ChildItem $root -Recurse -Filter codex.exe -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($candidate) {
      $codexPath = $candidate.FullName
    }
  }
}

if (-not $codexPath) {
  Fail "Codex CLI not found."
}

# Block only obviously secret material committed to Git. Do not flag normal source
# files merely because their names contain words such as security or secret.
$tracked = @(& git -C $RepoRoot ls-files)
$badTracked = @()
foreach ($name in $tracked) {
  $leaf = [System.IO.Path]::GetFileName($name)
  if (
    $leaf -match '^\.env($|\.)' -or
    $leaf -match '^(credentials|secrets)\.(json|ya?ml|toml|ini)$' -or
    $leaf -match '\.(pem|p12|pfx)$'
  ) {
    $badTracked += $name
  }
}

if ($badTracked.Count -gt 0) {
  Write-Warning "Potential secret-bearing tracked files detected:"
  foreach ($name in $badTracked) {
    Write-Warning ("  " + $name)
  }
  Fail "Review tracked secret-like files before autonomous execution."
}

Write-Host "PREFLIGHT PASS"
Write-Host ("Repo: " + $RepoRoot)
Write-Host ("HEAD: " + ((& git -C $RepoRoot rev-parse HEAD).Trim()))
Write-Host ("Codex: " + $codexPath)
