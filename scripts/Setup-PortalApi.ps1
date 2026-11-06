<#
.SYNOPSIS
  One-time go-live for the VizionAI Portal API on this PC. Safe to re-run.

.DESCRIPTION
  1. Creates Infisical folder vizion-infrastructure/prod:/platform/portal and any missing secrets:
       PORTAL_API_KEY, PORTAL_DB_PASSWORD, PORTAL_SESSION_SECRET, PORTAL_OWNER_EMAIL, PORTAL_OWNER_PASSWORD
     Existing secrets are never overwritten. Values are never printed.
  2. Creates/updates the read-only Postgres role portal_ro (api/sql/portal_ro.sql) with PORTAL_DB_PASSWORD.
  3. Adds /platform/portal to vizion-infra/stack/infisical/stack.paths.json so vizion-up.ps1 injects it.
  4. Builds and starts vizion-portal-api through vizion-up.ps1.
  5. With -GoLive: switches the Caddy block from the 503 holding page to reverse_proxy and reloads Caddy.

  Needs your own `infisical login` session (admin), not the runtime-read identity.

.EXAMPLE
  .\Setup-PortalApi.ps1            # steps 1-4
  .\Setup-PortalApi.ps1 -GoLive    # steps 1-5
#>
param([switch]$GoLive)
$ErrorActionPreference = 'Stop'

$Project = '918f6641-7111-4c80-b08a-46321c6b81ab'   # vizion-infrastructure
$Env     = 'prod'
$Path    = '/platform/portal'
$Repo    = Split-Path -Parent $PSScriptRoot
$Stack   = Join-Path (Split-Path -Parent $Repo) 'vizion-infra\stack'

function New-Token([int]$bytes) {
    $b = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Get-Secret([string]$name) {
    $ErrorActionPreference = 'Continue'
    $v = & infisical secrets get $name --projectId=$Project --env=$Env --path=$Path --plain --silent 2>$null
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -eq 0 -and $v -and $v -notmatch '\*not found\*') { return "$v".Trim() }
    return $null
}

Write-Host "1/5 Infisical secrets in $Path"
$ErrorActionPreference = 'Continue'
& infisical secrets folders create --name portal --path /platform --projectId=$Project --env=$Env --silent 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

$wanted = [ordered]@{
    PORTAL_API_KEY        = { New-Token 32 }
    PORTAL_DB_PASSWORD    = { New-Token 24 }
    PORTAL_SESSION_SECRET = { New-Token 32 }
    PORTAL_OWNER_EMAIL    = { 'admin@iamvisioncorp.org' }
    PORTAL_OWNER_PASSWORD = { New-Token 12 }
}
foreach ($k in $wanted.Keys) {
    if (Get-Secret $k) { Write-Host "   $k exists (kept)"; continue }
    $val = & $wanted[$k]
    $ErrorActionPreference = 'Continue'
    & infisical secrets set "$k=$val" --projectId=$Project --env=$Env --path=$Path --silent 2>&1 | Out-Null
    $ErrorActionPreference = 'Stop'
    if (-not (Get-Secret $k)) { throw "Could not create $k in Infisical (are you logged in? run: infisical login)" }
    Write-Host "   $k created"
}

Write-Host "2/5 Postgres role portal_ro"
$dbpw = Get-Secret 'PORTAL_DB_PASSWORD'
docker cp (Join-Path $Repo 'api\sql\portal_ro.sql') vizion-postgres:/tmp/portal_ro.sql | Out-Null
# no double quotes inside: Windows PowerShell 5.1 mangles them for native commands
docker exec -e PW=$dbpw vizion-postgres sh -c 'psql -U $POSTGRES_USER -d AIDB -v ON_ERROR_STOP=1 -v pw=$PW -qf /tmp/portal_ro.sql; rc=$?; rm -f /tmp/portal_ro.sql; exit $rc'
if ($LASTEXITCODE -ne 0) { throw "portal_ro.sql failed" }
$dbpw = $null

Write-Host "3/5 stack.paths.json"
$pathsFile = Join-Path $Stack 'infisical\stack.paths.json'
$json = Get-Content $pathsFile -Raw
if ($json -notmatch '"/platform/portal"') {
    $anchor = '        { "path": "/integrations/infisical",'
    if (-not $json.Contains($anchor)) { throw "Anchor not found in stack.paths.json; add /platform/portal by hand" }
    $line = '        { "path": "/platform/portal",               "keys": ["PORTAL_API_KEY", "PORTAL_DB_PASSWORD"] },' + "`n"
    $json = $json.Replace($anchor, $line + $anchor)
    [IO.File]::WriteAllText($pathsFile, $json, (New-Object Text.UTF8Encoding $false))
    Write-Host "   added"
} else { Write-Host "   already there" }

Write-Host "4/5 Build and start vizion-portal-api"
& (Join-Path $Stack 'infisical\vizion-up.ps1') up -d --build portal-api
Start-Sleep -Seconds 4
docker logs --tail 3 vizion-portal-api

if ($GoLive) {
    Write-Host "5/5 Caddy go-live"
    $caddy = Join-Path $Stack 'caddy\Caddyfile'
    $c = Get-Content $caddy -Raw
    $hold = "`trespond `"Portal API: not live yet.`" 503"
    if ($c.Contains($hold)) {
        $c = $c.Replace($hold, "`treverse_proxy vizion-portal-api:3000")
        [IO.File]::WriteAllText($caddy, $c, (New-Object Text.UTF8Encoding $false))
    }
    docker exec vizion-caddy caddy reload --config /etc/caddy/Caddyfile
    Write-Host "   Live. Test from OUTSIDE the LAN (phone on mobile data): https://portal-api.vizionai.iamvisioncorp.org/healthz"
} else {
    Write-Host "5/5 skipped (run again with -GoLive to expose it through Caddy)"
}
Write-Host "Done. Your portal login: PORTAL_OWNER_EMAIL / PORTAL_OWNER_PASSWORD in Infisical $Path."
