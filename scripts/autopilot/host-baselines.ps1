Set-StrictMode -Version Latest

# This definition is infrastructure-owned. Commands are structured data rather than
# shell text so a product-stage result can never select an arbitrary host command.
$script:ApprovedHostBaselines = @(
    [pscustomobject]@{
        Id = 'functional-02c2'
        Executable = 'npm.cmd'
        Arguments = @('--prefix', 'apps/web', 'run', 'test:functional-02c2')
        ExactTestId = 'npm --prefix apps/web run test:functional-02c2'
        ContractSensitivePaths = @(
            'supabase/migrations/**',
            'apps/web/src/lib/search/server-search.ts',
            'apps/web/scripts/functional-02c2.test.cjs',
            'apps/web/package.json'
        )
    }
)

function Get-ApprovedHostBaselines() {
    return @($script:ApprovedHostBaselines | ForEach-Object {
        [pscustomobject]@{
            Id = $_.Id; Executable = $_.Executable; Arguments = @($_.Arguments)
            ExactTestId = $_.ExactTestId; ContractSensitivePaths = @($_.ContractSensitivePaths)
        }
    })
}

function Test-HostBaselineContractPath([string]$Path, [string]$Pattern) {
    $regex = '^' + [regex]::Escape($Pattern).Replace('\*\*', '.*').Replace('\*', '[^/]*') + '$'
    return $Path.Replace('\', '/') -match $regex
}

function Get-ContractSensitiveChanges([string]$StartingHead, [string]$EndingHead) {
    $paths = @(& git diff --name-only "$StartingHead..$EndingHead")
    if ($LASTEXITCODE -ne 0) { throw 'GIT_CONTRACT_SENSITIVITY_DIFF_FAILED' }
    $definitions = Get-ApprovedHostBaselines
    return @($paths | Where-Object {
        $path = $_
        @($definitions | Where-Object {
            @($_.ContractSensitivePaths | Where-Object { Test-HostBaselineContractPath $path $_ }).Count -gt 0
        }).Count -gt 0
    })
}

function Invoke-ApprovedHostBaselines {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$RepoRoot,
        [Parameter(Mandatory)] [string]$StartingHead,
        [Parameter(Mandatory)] [string]$EvaluatedHead,
        [scriptblock]$CommandRunner
    )

    $runtimePath = Join-Path $RepoRoot '.autopilot-runtime'
    New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
    $records = New-Object 'System.Collections.Generic.List[object]'
    foreach ($definition in (Get-ApprovedHostBaselines)) {
        $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')
        $logPath = Join-Path $runtimePath "host-baseline-$($definition.Id)-$stamp.log"
        $exitCode = 1
        try {
            if ($null -ne $CommandRunner) {
                $run = & $CommandRunner $definition
                $exitCode = [int]$run.ExitCode
                [string]$run.Output | Set-Content -LiteralPath $logPath -Encoding utf8
            } else {
                Push-Location $RepoRoot
                try {
                    & $definition.Executable @($definition.Arguments) *> $logPath
                    $exitCode = [int]$LASTEXITCODE
                } finally {
                    Pop-Location
                }
            }
        } catch {
            $_ | Out-String | Set-Content -LiteralPath $logPath -Encoding utf8
            $exitCode = 1
        }
        $status = if ($exitCode -eq 0) { 'PASS' } else { 'FAIL' }
        $record = [ordered]@{
            starting_head = $StartingHead
            evaluated_head = $EvaluatedHead
            exact_test_id = $definition.ExactTestId
            exit_code = $exitCode
            status = $status
            timestamp_utc = (Get-Date).ToUniversalTime().ToString('o')
            log_path = [IO.Path]::GetRelativePath($RepoRoot, $logPath).Replace('\', '/')
            log_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $logPath).Hash.ToLowerInvariant()
        }
        $evidencePath = Join-Path $runtimePath "host-baseline-$($definition.Id)-$stamp.json"
        $record | ConvertTo-Json | Set-Content -LiteralPath $evidencePath -Encoding utf8
        $records.Add([pscustomobject]($record + @{ evidence_path = [IO.Path]::GetRelativePath($RepoRoot, $evidencePath).Replace('\', '/') }))
    }
    return $records.ToArray()
}
