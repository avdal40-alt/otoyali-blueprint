[CmdletBinding()]
param(
    [ValidateSet('local', 'staging', 'production')]
    [string]$Environment = 'local',
    [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'

try {
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
        if ($Environment -ne 'local') { throw 'Provide an explicit HTTPS BaseUrl only after confirming the remote environment identity.' }
        $BaseUrl = 'http://127.0.0.1:3000'
    }
    $uri = [Uri]$BaseUrl
    if ($Environment -ne 'local' -and $uri.Scheme -ne 'https') { throw 'Remote smoke checks require HTTPS.' }
    if ($Environment -eq 'local' -and $uri.Host -notin @('127.0.0.1', 'localhost')) { throw 'Local smoke checks may target only localhost.' }
    $response = Invoke-WebRequest -Uri $uri -Method Get -MaximumRedirection 3 -UseBasicParsing
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) { throw "Unexpected HTTP status: $($response.StatusCode)" }
    Write-Output "Read-only $Environment smoke passed: $($response.StatusCode) $($uri.AbsoluteUri)"
    exit 0
} catch {
    Write-Error $_
    exit 1
}
