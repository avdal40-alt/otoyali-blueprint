param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)

$ErrorActionPreference = "Stop"

function Fail([string]$m) {
  Write-Error $m
  exit 1
}

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  # Git worktrees often use a .git file instead of a directory; Test-Path is enough.
  if (-not (Test-Path (Join-Path $RepoRoot ".git"))) { Fail "Not a Git worktree: $RepoRoot" }
}

$required = @(
  "docs\jolcar-control\MASTER_PLAN.md",
  "docs\jolcar-control\TASK_QUEUE.json",
  "docs\jolcar-control\AGENTS.md",
  "docs\jolcar-control\DECISIONS.md",
  "scripts\jolcar\task-result.schema.json"
)
foreach ($rel in $required) {
  if (-not (Test-Path (Join-Path $RepoRoot $rel))) { Fail "Missing required file: $rel" }
}

$inside = (& git -C $RepoRoot rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -ne 0 -or $inside.Trim() -ne "true") { Fail "Git worktree verification failed." }

$status = (& git -C $RepoRoot status --porcelain=v1)
if ($LASTEXITCODE -ne 0) { Fail "git status failed." }
if ($status) { Fail "Integration worktree is not clean. Refusing autonomous run.`n$status" }

$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) {
  $root = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin"
  if (Test-Path $root) {
    $candidate = Get-ChildItem $root -Recurse -Filter codex.exe -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($candidate) { $codex = $candidate }
  }
}
if (-not $codex) { Fail "Codex CLI not found. Open/install the ChatGPT Codex desktop integration first." }

# Refuse tracked env/secret-like files. Untracked user env files are not copied into isolated task worktrees.
$tracked = & git -C $RepoRoot ls-files
$badTracked = @($tracked | Where-Object {
  $_ -match '(^|/)\.env($|\.)' -or
  $_ -match '(service[_-]?role|private[_-]?key|credentials?|secrets?)'
})
if ($badTracked.Count -gt 0) {
  Write-Warning "Potentially sensitive tracked filenames detected. Review required before autonomous run:"
  $badTracked | ForEach-Object { Write-Warning "  $_" }
  Fail "Tracked secret-like files detected."
}

Write-Host "PREFLIGHT PASS"
Write-Host "Repo: $RepoRoot"
Write-Host "HEAD: $(& git -C $RepoRoot rev-parse HEAD)"
$codexPath = if ($codex.Source) { $codex.Source } elseif ($codex.FullName) { $codex.FullName } else { [string]$codex }
Write-Host "Codex: $codexPath"
