Set-StrictMode -Version Latest

$script:LegacyProductStageByCommit = @{
    '2563146b3d67a7c0c78757e467faf2fa7926695b' = 'FUNCTIONAL-02D'
}

function ConvertFrom-YolmodCommitMessage([string]$Commit, [string]$Message) {
    $trailers = @{}
    foreach ($line in @($Message -split "`r?`n")) {
        $match = [regex]::Match($line, '^([A-Za-z0-9-]+):\s*(\S.*?)\s*$')
        if (-not $match.Success) { continue }
        $key = $match.Groups[1].Value
        if ($key -notin @('Yolmod-Stage', 'Yolmod-Stage-Type')) { continue }
        if ($trailers.ContainsKey($key)) { throw "DUPLICATE_STAGE_TRAILER:${Commit}:$key" }
        $trailers[$key] = $match.Groups[2].Value
    }
    $hasStage = $trailers.ContainsKey('Yolmod-Stage')
    $hasType = $trailers.ContainsKey('Yolmod-Stage-Type')
    if ($hasStage -xor $hasType) { throw "INCOMPLETE_STAGE_TRAILER:$Commit" }
    if (-not $hasStage) { return $null }
    if ($trailers['Yolmod-Stage-Type'] -ne 'product') { throw "INVALID_STAGE_TYPE:$Commit" }
    if ($trailers['Yolmod-Stage'] -notmatch '^(?:FUNCTIONAL|STABILIZATION)-[0-9]+[A-Z0-9-]*$') { throw "INVALID_STAGE_ID:$Commit" }
    return [pscustomobject]@{ Commit = $Commit; Stage = $trailers['Yolmod-Stage']; Source = 'trailer' }
}

function Get-ProductCommitIdentity([string]$Commit) {
    $message = (& git show -s --format=%B $Commit) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "GIT_COMMIT_MESSAGE_UNAVAILABLE:$Commit" }
    $identity = ConvertFrom-YolmodCommitMessage $Commit $message
    if ($null -ne $identity) { return $identity }
    $key = $Commit.ToLowerInvariant()
    if ($script:LegacyProductStageByCommit.ContainsKey($key)) {
        return [pscustomobject]@{ Commit = $Commit; Stage = $script:LegacyProductStageByCommit[$key]; Source = 'legacy-seed' }
    }
    return $null
}

function Get-LastProductStageIdentity([string]$Head) {
    $commits = @(& git rev-list --first-parent $Head)
    if ($LASTEXITCODE -ne 0) { throw 'GIT_PRODUCT_HISTORY_UNAVAILABLE' }
    $identities = @($commits | ForEach-Object { Get-ProductCommitIdentity $_ } | Where-Object { $null -ne $_ })
    if ($identities.Count -eq 0) { throw 'GIT_PRODUCT_STAGE_IDENTITY_MISSING' }
    $duplicates = @($identities | Group-Object Stage | Where-Object { $_.Count -gt 1 })
    if ($duplicates.Count -gt 0) { throw "AMBIGUOUS_DUPLICATE_PRODUCT_STAGE:$($duplicates[0].Name)" }
    return $identities[0]
}
