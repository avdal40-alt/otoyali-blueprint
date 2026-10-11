[CmdletBinding()]
param(
  [string]$RepoRoot,
  [switch]$RequireClean,
  [string]$ExpectedDatabaseContainer = "supabase_db_Otoyali-blueprint"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Join-Path (Split-Path -Parent $PSScriptRoot) ".."
}

function Stop-Preflight([string]$Message) {
  Write-Host "FAIL $Message"
  exit 1
}

function Pass-Preflight([string]$Name, [string]$Detail = "") {
  if ($Detail) { Write-Host "PASS $Name $Detail" } else { Write-Host "PASS $Name" }
}

function Invoke-Checked([string]$File, [string[]]$Arguments, [string]$Failure) {
  $output = & $File @Arguments 2>$null
  if ($LASTEXITCODE -ne 0) { throw $Failure }
  return @($output)
}

try {
  $resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot -ErrorAction Stop).Path
  $gitRootRaw = ((Invoke-Checked git @("-C", $resolvedRoot, "rev-parse", "--show-toplevel") "Git repository root could not be resolved.") -join "").Trim()
  $gitRoot = (Resolve-Path -LiteralPath $gitRootRaw -ErrorAction Stop).Path
  if (-not [string]::Equals($resolvedRoot.TrimEnd([IO.Path]::DirectorySeparatorChar), $gitRoot.TrimEnd([IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Preflight must run at the repository root, not a nested path."
  }
  if (-not (Test-Path -LiteralPath (Join-Path $resolvedRoot "docs\jolcar-control\TASK_QUEUE.json"))) {
    throw "This is not the intended Jolcar repository."
  }
  Pass-Preflight "repository" $resolvedRoot

  $required = @("git", "node", "npm", "docker", "npx.cmd")
  $missing = @($required | Where-Object { -not (Get-Command $_ -ErrorAction SilentlyContinue) })
  if ($missing.Count -gt 0) { throw "Required local tooling is unavailable: $($missing -join ', ')." }
  Pass-Preflight "tooling" "git,node,npm,docker,npx"

  $requiredFiles = @(
    "docs\jolcar-control\MASTER_PLAN.md",
    "docs\jolcar-control\TASK_QUEUE.json",
    "docs\jolcar-control\DECISIONS.md",
    "docs\jolcar-control\AGENTS.md",
    "scripts\jolcar\safety-check.ps1",
    "scripts\jolcar\task-result.schema.json",
    "supabase\config.toml",
    "supabase\migrations"
  )
  $missingFiles = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $resolvedRoot $_)) })
  if ($missingFiles.Count -gt 0) { throw "Required Jolcar files are missing: $($missingFiles -join ', ')." }

  $trackedSecretContainers = @(
    Invoke-Checked git @("-C", $resolvedRoot, "ls-files") "Tracked file inventory could not be read."
  ) | Where-Object {
    $leaf = [IO.Path]::GetFileName($_)
    ($leaf -eq ".env" -or $leaf -match '^\.env\.(local|production|prod|staging|stage|development|dev|test)$' -or
      $leaf -match '^(credentials|secrets)\.(json|ya?ml|toml|ini)$' -or $leaf -match '\.(pem|p12|pfx)$')
  }
  if ($trackedSecretContainers.Count -gt 0) { throw "Tracked secret-bearing file names are blocked by local preflight." }

  $linkedMetadata = @(
    "supabase\.temp\linked-project-ref",
    "supabase\.temp\linked-project.json",
    "supabase\.temp\project-ref"
  ) | ForEach-Object { Join-Path $resolvedRoot $_ } | Where-Object { Test-Path -LiteralPath $_ }
  if ($linkedMetadata.Count -gt 0) { throw "Remote guard rejected linked Supabase project metadata." }
  $guardSources = Get-ChildItem -LiteralPath (Join-Path $resolvedRoot "scripts\jolcar") -Filter "*.ps1" -File |
    Where-Object { $_.Name -notmatch '\.test\.ps1$' }
  $forbidden = '(?im)^\s*(?:git\s+push\b|supabase(?:\.exe)?\s+db\s+(?:push|pull|remote)\b|vercel(?:\.exe)?\s+(?:deploy|--prod)\b)'
  $unsafeSource = @($guardSources | Select-String -Pattern $forbidden -AllMatches)
  if ($unsafeSource.Count -gt 0) { throw "Remote guard rejected an unsafe runner command at $($unsafeSource[0].Path):$($unsafeSource[0].LineNumber)." }
  Pass-Preflight "remote_guard" "unlinked_static_local_only"

  $branch = ((Invoke-Checked git @("-C", $resolvedRoot, "branch", "--show-current") "Git branch could not be read.") -join "").Trim()
  $head = ((Invoke-Checked git @("-C", $resolvedRoot, "rev-parse", "HEAD") "Git HEAD could not be read.") -join "").Trim()
  $status = @(Invoke-Checked git @("-C", $resolvedRoot, "status", "--porcelain=v1") "Git status could not be read.") | Where-Object { $_ }
  $disallowedChanges = @($status | Where-Object { $_ -notmatch '^\?\? CODEX_[^\\/]+$' })
  if ($RequireClean -and $status.Count -gt 0) { throw "Git worktree is not clean (strict mode)." }
  if ($disallowedChanges.Count -gt 0) { throw "Git worktree has changes outside allowed untracked CODEX artifacts." }
  $gitDetail = "branch=$branch head=$head"
  if ($status.Count -gt 0) { $gitDetail += " allowed_runner_artifacts=$($status.Count)" }
  Pass-Preflight "git_state" $gitDetail

  $migrations = @(Get-ChildItem -LiteralPath (Join-Path $resolvedRoot "supabase\migrations") -File -Filter "*.sql")
  $invalidMigrations = @($migrations | Where-Object { $_.Name -notmatch '^\d{14}_.+\.sql$' })
  if ($invalidMigrations.Count -gt 0) { throw "Invalid migration filename: $($invalidMigrations[0].Name)" }
  $duplicates = @($migrations | ForEach-Object { ([regex]::Match($_.Name, '^\d{14}')).Value } | Group-Object | Where-Object Count -gt 1)
  if ($duplicates.Count -gt 0) { throw "Duplicate migration version prefix: $($duplicates[0].Name)" }
  Pass-Preflight "migrations" "filesystem_versions_unique=$($migrations.Count)"

  $containerState = (Invoke-Checked docker @("inspect", "--format", "{{.State.Running}}", $ExpectedDatabaseContainer) "Expected local Supabase database container is unavailable.") -join ""
  if ($containerState.Trim() -ne "true") { throw "Expected local Supabase database container is not running." }
  $databaseName = (Invoke-Checked docker @("exec", $ExpectedDatabaseContainer, "psql", "-U", "postgres", "-d", "postgres", "-Atqc", "select current_database()") "Expected local Postgres did not respond.") -join ""
  if ($databaseName.Trim() -ne "postgres") { throw "Database container did not identify the expected local postgres database." }
  # Invoke through cmd so Supabase's informational stderr does not become a
  # PowerShell NativeCommandError under ErrorActionPreference=Stop.
  & cmd.exe /d /c "npx.cmd supabase migration list --local >NUL 2>&1"
  if ($LASTEXITCODE -ne 0) { throw "Local Supabase migration history is unavailable." }
  Pass-Preflight "local_database" "container=$ExpectedDatabaseContainer migration_history=available"

  Write-Host "PREFLIGHT PASS"
  exit 0
} catch {
  Stop-Preflight $_.Exception.Message
}
