Set-StrictMode -Version Latest

$script:LegacyProductStageByCommit = @{
    '2563146b3d67a7c0c78757e467faf2fa7926695b' = 'FUNCTIONAL-02D'
    '9fd84fe787c7b2e26bfeeb288f99507bb506daec' = 'FUNCTIONAL-02B1'
    'd4eeb576dc579b2a2137f942cd3c9a686c30a7cd' = 'FUNCTIONAL-02B2'
    '9b2f247750f06948b6a2eb5654209466a68f8182' = 'FUNCTIONAL-02B3'
    '392762c28e624b233da3af5f7baff144264d3b77' = 'FUNCTIONAL-02C1A'
    '9cea42b8915a3ea91286a2d779a929a3ed78d4d3' = 'FUNCTIONAL-02C1B'
    'aa038a7addca08e4bf4a29d80cf9665c0cedda12' = 'FUNCTIONAL-02C1C'
    'fbcc40700209c667d8b17b0e7f6bcc9048f32088' = 'FUNCTIONAL-02C1D'
    '4c0978fc69608ee18298c67f8c105746b512b038' = 'FUNCTIONAL-02C2'
    'cab325d45dc14c047449f4f07f967457c0fb3284' = 'FUNCTIONAL-02E'
    '5b4369d0e10c514f389b1bc0afd81ca677fe96b7' = 'FUNCTIONAL-02F'
    'dff3f4fc2c25e8c96fd3cbf49f13e550fc3039d0' = 'FUNCTIONAL-02H'
    '75f6e9de4fbc900c2e81fd048b2c06edede6eac4' = 'FUNCTIONAL-02J'
    'a4e0b90cad30cd0497fe0e7c17fbcd6f774fb758' = 'FUNCTIONAL-03A'
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
    if ($trailers['Yolmod-Stage'] -notmatch '^(?:FUNCTIONAL|STABILIZATION|AI|DISCOVERY|RELEASE)-[0-9]+[A-Z0-9-]*$') { throw "INVALID_STAGE_ID:$Commit" }
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

function Get-CompletedProductStages([string]$Head) {
    $commits = @(& git rev-list --first-parent $Head)
    if ($LASTEXITCODE -ne 0) { throw 'GIT_PRODUCT_HISTORY_UNAVAILABLE' }
    return @($commits | ForEach-Object { Get-ProductCommitIdentity $_ } | Where-Object { $null -ne $_ } | ForEach-Object {
        if ($_.Stage -match '^FUNCTIONAL-03A[1-5]$') { 'FUNCTIONAL-03A' } else { $_.Stage }
    } | Select-Object -Unique)
}

function Get-OrderedApprovedParentStages([string]$RoadmapPath) {
    $section = $false
    $stages = New-Object 'System.Collections.Generic.List[string]'
    foreach ($line in Get-Content -LiteralPath $RoadmapPath) {
        if ($line -match '^## (Current dependency sequence|Subsequent V1 stages)$') { $section = $true; continue }
        if ($section -and $line -match '^## ') { $section = $false; continue }
        if (-not $section) { continue }
        $match = [regex]::Match($line, '^\d+\.\s+`(?<stage>(?:FUNCTIONAL|STABILIZATION|AI|DISCOVERY|RELEASE)-[0-9]+[A-Z0-9-]*)`')
        if ($match.Success) { $stages.Add($match.Groups['stage'].Value) }
    }
    if ($stages.Count -eq 0) { throw 'ROADMAP_PARENT_STAGE_ORDER_MISSING' }
    return @($stages)
}

function Get-NextUnfinishedApprovedStage([string]$Head, [string]$RoadmapPath) {
    $completed = @(Get-CompletedProductStages $Head)
    $next = @(Get-OrderedApprovedParentStages $RoadmapPath | Where-Object { $_ -notin $completed } | Select-Object -First 1)
    if ($next.Count -ne 1) { throw 'NO_UNFINISHED_APPROVED_PRODUCT_STAGE' }
    return $next[0]
}
