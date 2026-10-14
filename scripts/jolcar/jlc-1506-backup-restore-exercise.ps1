[CmdletBinding()]
param(
  [string]$DatabaseContainer = "supabase_db_Otoyali-blueprint"
)

$ErrorActionPreference = "Stop"

function Invoke-DockerChecked([string[]]$Arguments, [string]$Failure) {
  $output = & docker @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "$Failure $($output -join [Environment]::NewLine)" }
  return @($output)
}

$suffix = [Guid]::NewGuid().ToString("N").Substring(0, 16)
$sourceDatabase = "jlc1506_source_$suffix"
$targetDatabase = "jlc1506_target_$suffix"
$archivePath = "/tmp/jlc1506_$suffix.dump"
$createdDatabases = @()

try {
  if ($DatabaseContainer -ne "supabase_db_Otoyali-blueprint") {
    throw "JLC-1506 only permits the configured local Supabase database container."
  }

  $running = (Invoke-DockerChecked @("inspect", "--format", "{{.State.Running}}", $DatabaseContainer) "Could not inspect local database container.") -join ""
  if ($running.Trim() -ne "true") { throw "The configured local database container is not running." }

  foreach ($database in @($sourceDatabase, $targetDatabase)) {
    if ($database -notmatch '^jlc1506_(source|target)_[0-9a-f]{16}$') { throw "Refusing an unsafe temporary database name." }
    Invoke-DockerChecked @("exec", $DatabaseContainer, "createdb", "-U", "postgres", $database) "Could not create the isolated exercise database $database." | Out-Null
    $createdDatabases += $database
  }

  $seedSql = @'
CREATE TABLE recovery_probe (
  id integer PRIMARY KEY,
  label text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0)
);
INSERT INTO recovery_probe (id, label, amount) VALUES
  (1, 'alpha', 11),
  (2, 'beta', 29),
  (3, 'gamma', 47);
'@
  Invoke-DockerChecked @("exec", "-i", $DatabaseContainer, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", $sourceDatabase, "-c", $seedSql) "Could not seed the isolated source database." | Out-Null
  Invoke-DockerChecked @("exec", $DatabaseContainer, "pg_dump", "-U", "postgres", "-Fc", "-d", $sourceDatabase, "-f", $archivePath) "Could not create the isolated backup archive." | Out-Null
  Invoke-DockerChecked @("exec", $DatabaseContainer, "pg_restore", "-U", "postgres", "-d", $targetDatabase, "--exit-on-error", $archivePath) "Could not restore the isolated backup archive." | Out-Null

  $integrity = (Invoke-DockerChecked @("exec", $DatabaseContainer, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", $targetDatabase, "-Atqc", "SELECT count(*) || ':' || coalesce(sum(amount), 0) || ':' || string_agg(label, ',' ORDER BY id) FROM recovery_probe") "Could not verify restored data integrity.") -join ""
  if ($integrity.Trim() -ne "3:87:alpha,beta,gamma") { throw "Restored data-integrity check failed: $($integrity.Trim())." }

  Write-Host "PASS JLC-1506 isolated local backup/restore exercise integrity=$($integrity.Trim())"
}
finally {
  & docker exec $DatabaseContainer sh -c "rm -f $archivePath" 2>$null | Out-Null
  foreach ($database in $createdDatabases) {
    & docker exec $DatabaseContainer dropdb -U postgres --force $database 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Error "Cleanup failed for isolated exercise database $database." }
  }
}
