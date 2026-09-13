Set-StrictMode -Version Latest

# This definition is infrastructure-owned. Commands are structured data rather than
# shell text so a product-stage result can never select an arbitrary host command.
$script:ApprovedHostBaselines = @(
    [pscustomobject]@{
        Id = 'functional-02c2'
        Executable = 'npm.cmd'
        Arguments = @('--prefix', 'apps/web', 'run', 'test:functional-02c2')
        ExactTestId = 'npm --prefix apps/web run test:functional-02c2'
        TimeoutSeconds = 120
        ContractSensitivePaths = @(
            'supabase/migrations/**',
            'apps/web/src/lib/search/server-search.ts',
            'apps/web/scripts/functional-02c2.test.cjs',
            'apps/web/package.json'
        )
    }
)

function Get-NormalizedAbsolutePath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { throw 'PATH_EMPTY' }
    $fullPath = [IO.Path]::GetFullPath($Path)
    $pathRoot = [IO.Path]::GetPathRoot($fullPath)
    if ([string]::IsNullOrWhiteSpace($pathRoot)) { throw 'PATH_ROOT_MISSING' }
    if ($fullPath.Length -gt $pathRoot.Length) {
        return $fullPath.TrimEnd([char[]]@('\', '/'))
    }
    return $fullPath
}

function Resolve-RepositoryRelativePath([string]$RepoRoot, [string]$Path) {
    $canonicalRoot = Get-NormalizedAbsolutePath $RepoRoot
    $canonicalPath = Get-NormalizedAbsolutePath $Path
    $rootDrive = [IO.Path]::GetPathRoot($canonicalRoot)
    $pathDrive = [IO.Path]::GetPathRoot($canonicalPath)
    if (-not [string]::Equals($rootDrive, $pathDrive, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'PATH_OUTSIDE_REPOSITORY_ROOT'
    }
    if ([string]::Equals($canonicalRoot, $canonicalPath, [StringComparison]::OrdinalIgnoreCase)) {
        return '.'
    }
    $boundary = $canonicalRoot + '\'
    if (-not $canonicalPath.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'PATH_OUTSIDE_REPOSITORY_ROOT'
    }
    return $canonicalPath.Substring($boundary.Length).Replace('\', '/')
}

function Get-ApprovedHostBaselines() {
    return @($script:ApprovedHostBaselines | ForEach-Object {
        [pscustomobject]@{
            Id = $_.Id; Executable = $_.Executable; Arguments = @($_.Arguments); TimeoutSeconds = $_.TimeoutSeconds
            ExactTestId = $_.ExactTestId; ContractSensitivePaths = @($_.ContractSensitivePaths)
        }
    })
}

function ConvertTo-WindowsProcessArgument([string]$Argument) {
    if ($null -eq $Argument -or $Argument.Length -eq 0) { return '""' }
    if ($Argument -notmatch '[\s"]') { return $Argument }

    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append('"')
    $backslashes = 0
    foreach ($character in $Argument.ToCharArray()) {
        if ($character -eq '\') {
            $backslashes++
        } elseif ($character -eq '"') {
            [void]$builder.Append('\', ($backslashes * 2) + 1)
            [void]$builder.Append('"')
            $backslashes = 0
        } else {
            if ($backslashes -gt 0) { [void]$builder.Append('\', $backslashes) }
            [void]$builder.Append($character)
            $backslashes = 0
        }
    }
    if ($backslashes -gt 0) { [void]$builder.Append('\', $backslashes * 2) }
    [void]$builder.Append('"')
    return $builder.ToString()
}

function Invoke-NativeProcessCapture {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string]$Executable,
        [Parameter(Mandatory)] [AllowEmptyCollection()] [string[]]$Arguments,
        [Parameter(Mandatory)] [string]$WorkingDirectory,
        [Parameter(Mandatory)] [int]$TimeoutSeconds
    )

    $process = New-Object System.Diagnostics.Process
    $standardOutput = ''
    $standardError = ''
    try {
        $startInfo = New-Object System.Diagnostics.ProcessStartInfo
        $resolvedExecutable = @(Get-Command -Name $Executable -CommandType Application -ErrorAction Stop | Select-Object -First 1)
        if ($resolvedExecutable.Count -ne 1 -or [string]::IsNullOrWhiteSpace($resolvedExecutable[0].Source)) { throw 'NATIVE_EXECUTABLE_NOT_RESOLVED' }
        $startInfo.FileName = $resolvedExecutable[0].Source
        $quotedArguments = @($Arguments | ForEach-Object { ConvertTo-WindowsProcessArgument ([string]$_) })
        $startInfo.Arguments = $quotedArguments -join ' '
        $startInfo.WorkingDirectory = $WorkingDirectory
        $startInfo.UseShellExecute = $false
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $startInfo.CreateNoWindow = $true
        $process.StartInfo = $startInfo
        if (-not $process.Start()) { throw 'NATIVE_PROCESS_START_RETURNED_FALSE' }
        $standardOutputTask = $process.StandardOutput.ReadToEndAsync()
        $standardErrorTask = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            try { $process.Kill() } catch {}
            $process.WaitForExit()
            [Threading.Tasks.Task]::WaitAll(@($standardOutputTask, $standardErrorTask))
            return [pscustomobject]@{ ExitCode = -1; StandardOutput = $standardOutputTask.Result; StandardError = $standardErrorTask.Result; TimedOut = $true; LaunchError = $null }
        }
        $process.WaitForExit()
        [Threading.Tasks.Task]::WaitAll(@($standardOutputTask, $standardErrorTask))
        return [pscustomobject]@{ ExitCode = [int]$process.ExitCode; StandardOutput = $standardOutputTask.Result; StandardError = $standardErrorTask.Result; TimedOut = $false; LaunchError = $null }
    } catch {
        return [pscustomobject]@{ ExitCode = -1; StandardOutput = $standardOutput; StandardError = $standardError; TimedOut = $false; LaunchError = $_.Exception.Message }
    } finally {
        $process.Dispose()
    }
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
                $run = Invoke-NativeProcessCapture -Executable $definition.Executable -Arguments @($definition.Arguments) -WorkingDirectory $RepoRoot -TimeoutSeconds $definition.TimeoutSeconds
                $exitCode = [int]$run.ExitCode
                "STDOUT:`n$($run.StandardOutput)`nSTDERR:`n$($run.StandardError)" | Set-Content -LiteralPath $logPath -Encoding utf8
                if ($run.TimedOut) { $exitCode = -1 }
                if ($null -ne $run.LaunchError) { $exitCode = -1 }
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
            executable = $definition.Executable
            arguments = @($definition.Arguments)
            exit_code = $exitCode
            status = $status
            timestamp_utc = (Get-Date).ToUniversalTime().ToString('o')
            log_path = Resolve-RepositoryRelativePath $RepoRoot $logPath
            log_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $logPath).Hash.ToLowerInvariant()
        }
        $evidencePath = Join-Path $runtimePath "host-baseline-$($definition.Id)-$stamp.json"
        $record | ConvertTo-Json | Set-Content -LiteralPath $evidencePath -Encoding utf8
        $records.Add([pscustomobject]($record + @{ evidence_path = Resolve-RepositoryRelativePath $RepoRoot $evidencePath }))
    }
    return $records.ToArray()
}
