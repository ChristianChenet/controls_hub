$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $raiz

if (-not $env:BANCO_URL) {
  $env:BANCO_URL = "postgres://postgres:controls@localhost:5432/controlshub"
}

if (-not $env:PORTA_API) {
  $env:PORTA_API = "3334"
}

npm.cmd --workspace apps/backend run start
