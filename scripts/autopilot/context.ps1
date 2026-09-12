[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
try {
  $root = (git rev-parse --show-toplevel).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Git repository required.' }
  Write-Output "Repository: $root"
  Write-Output "Branch: $((git branch --show-current).Trim())"
  Write-Output "HEAD: $((git rev-parse HEAD).Trim())"
  Write-Output 'Worktree:'; git status --short
  Write-Output 'Recent commits:'; git log -5 --oneline
  Write-Output 'Autopilot state:'
  Select-String -Path (Join-Path $root 'docs/autopilot/AUTOPILOT_STATE.md') -Pattern 'Current stage|Last completed stage|Required next stage' | ForEach-Object { $_.Line.Trim() }
  Write-Output 'Durable contracts:'; Get-ChildItem (Join-Path $root 'docs/autopilot/contracts') -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
} catch { Write-Error $_; exit 1 }
