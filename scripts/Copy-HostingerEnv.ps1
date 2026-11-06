<#
.SYNOPSIS
  Copies the portal's 4 Hostinger env vars to the clipboard one at a time, straight from Infisical.
  Nothing is printed or written to disk. Paste each into hPanel:
    Websites > vizionai.iamvisioncorp.org > Node.js > Environment variables
  Uses your own `infisical login` session. The clipboard is cleared at the end.
#>
$ErrorActionPreference = 'Stop'
$project = '918f6641-7111-4c80-b08a-46321c6b81ab'   # vizion-infrastructure
$keys = 'PORTAL_OWNER_EMAIL', 'PORTAL_OWNER_PASSWORD', 'PORTAL_SESSION_SECRET', 'PORTAL_API_KEY'

Write-Host "Open hPanel > Websites > vizionai.iamvisioncorp.org > Node.js > Environment variables.`n"
foreach ($k in $keys) {
    $v = infisical secrets get $k --projectId $project --env prod --path /platform/portal --plain --silent
    if ([string]::IsNullOrWhiteSpace($v)) { throw "$k is empty in Infisical" }
    Set-Clipboard -Value $v.Trim()
    $v = $null
    Read-Host "Add a variable named $k and paste its value (Ctrl+V). Press Enter when done"
}
Set-Clipboard -Value ' '
Write-Host "`nDone, clipboard cleared. Save in hPanel, then tell Claude to rebuild and check the login."
