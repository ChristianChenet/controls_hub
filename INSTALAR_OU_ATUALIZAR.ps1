param(
  [string]$Banco = "CONTROLSHUB",
  [string]$UsuarioBanco = "postgres",
  [string]$SenhaBanco = "CONTROLS",
  [switch]$PrepararProducao
)

$ErrorActionPreference = "Stop"
$raiz = Resolve-Path $PSScriptRoot
Set-Location $raiz

Write-Host "CONTROL S HUB - instalacao/atualizacao"
Write-Host "Instalando dependencias..."
npm.cmd install

Write-Host "Aplicando banco PostgreSQL..."
& (Join-Path $raiz "scripts\windows\aplicar-banco.ps1") -Banco $Banco -Usuario $UsuarioBanco -Senha $SenhaBanco

if ($PrepararProducao) {
  Write-Host "Preparando base limpa de producao..."
  $psqlPadrao = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
  $psqlPgAdmin = "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\psql.exe"
  if (Test-Path $psqlPadrao) {
    $psql = $psqlPadrao
  } elseif (Test-Path $psqlPgAdmin) {
    $psql = $psqlPgAdmin
  } else {
    throw "psql.exe nao encontrado para preparar producao."
  }

  $env:PGPASSWORD = $SenhaBanco
  try {
    & $psql -h 127.0.0.1 -U $UsuarioBanco -d $Banco.ToLowerInvariant() -f (Join-Path $raiz "database\producao\001_preparar_base_producao.sql")
  } finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  }
}

Write-Host "Gerando build..."
npm.cmd run build

Write-Host "Instalacao/atualizacao finalizada."
Write-Host "Frontend dev: npm.cmd run dev:frontend"
Write-Host "Backend dev: npm.cmd run dev:backend"
Write-Host "Producao: INICIAR_PRODUCAO_CONTROL_S_HUB.cmd"
