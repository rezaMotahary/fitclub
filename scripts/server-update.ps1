# Server update: backup, pull, migrate deploy, build.
# Refuses to run unless FITCLUB_SERVER_UPDATE=1 so a laptop cannot start it by mistake.
# Never runs prisma db seed or migrate reset.
$ErrorActionPreference = 'Stop'

if ($env:FITCLUB_SERVER_UPDATE -ne '1') {
  Write-Error 'Refusing: set FITCLUB_SERVER_UPDATE=1 only on the club server.'
  exit 1
}

if ([string]::IsNullOrWhiteSpace($env:BACKUP_DIR)) {
  Write-Error 'Refusing: BACKUP_DIR must be an absolute folder outside the project.'
  exit 1
}

if (-not [System.IO.Path]::IsPathRooted($env:BACKUP_DIR)) {
  Write-Error 'Refusing: BACKUP_DIR must be absolute.'
  exit 1
}

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Output '1/6 Backing up the database'
Set-Location (Join-Path $Root 'api')
npm run backup:db
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output '2/6 Pulling the latest code'
Set-Location $Root
git pull --ff-only
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output '3/6 Updating the API and applying new tables'
Set-Location (Join-Path $Root 'api')
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output '4/6 Updating the website'
Set-Location (Join-Path $Root 'web')
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output '5/6 Build finished'
Write-Output '6/6 Restart the API and the website the way they are already running on this server.'
Write-Output 'Do not run prisma db seed or prisma migrate reset.'
