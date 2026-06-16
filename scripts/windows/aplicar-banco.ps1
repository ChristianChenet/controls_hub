param(
  [string]$Banco = "CONTROLSHUB",
  [string]$Usuario = "postgres",
  [string]$Senha = "CONTROLS",
  [string]$HostBanco = "127.0.0.1",
  [int]$PortaBanco = 5432
)

$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BancoConexao = $Banco.ToLowerInvariant()
$psqlPadrao = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$psqlPgAdmin = "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\psql.exe"

if (Test-Path $psqlPadrao) {
  $psql = $psqlPadrao
} elseif (Test-Path $psqlPgAdmin) {
  $psql = $psqlPgAdmin
} else {
  throw "psql.exe nao encontrado. Instale o PostgreSQL 18 ou ajuste este script."
}

$env:PGPASSWORD = $Senha

try {
  Write-Host "Verificando banco $Banco..."
  $existe = & $psql -h $HostBanco -p $PortaBanco -U $Usuario -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$BancoConexao';"
  if ($LASTEXITCODE -ne 0) {
    throw "Nao foi possivel autenticar no PostgreSQL com o usuario '$Usuario'. Verifique usuario e senha."
  }

  $existeTexto = "$existe"
  if ($existeTexto.Trim() -ne "1") {
    Write-Host "Criando banco $Banco..."
    & $psql -h $HostBanco -p $PortaBanco -U $Usuario -d postgres -c "CREATE DATABASE $BancoConexao;"
    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel criar o banco $Banco."
    }
  }

  Write-Host "Aplicando migrations..."
  Get-ChildItem -LiteralPath (Join-Path $raiz "database\migrations") -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Aplicando $($_.Name)..."
    & $psql -h $HostBanco -p $PortaBanco -U $Usuario -d $BancoConexao -f $_.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao aplicar migration $($_.Name)."
    }
  }


  $batchesAutomaticos = @(
    "ATUALIZAR_011_DOCUMENTOS_FISCAIS_NFE_CTE.sql",
    "ATUALIZAR_012_CHAVE_OPERACIONAL_COTACAO_FRETE.sql"
  )

  Write-Host "Aplicando batches automaticos..."
  foreach ($batch in $batchesAutomaticos) {
    $arquivoBatch = Join-Path $raiz "database\batches\$batch"
    if (Test-Path $arquivoBatch) {
      Write-Host "Aplicando batch $batch..."
      & $psql -h $HostBanco -p $PortaBanco -U $Usuario -d $BancoConexao -v ON_ERROR_STOP=1 -f $arquivoBatch
      if ($LASTEXITCODE -ne 0) {
        throw "Falha ao aplicar batch automatico $batch."
      }
    }
  }

  Write-Host "Aplicando seed inicial..."
  & $psql -h $HostBanco -p $PortaBanco -U $Usuario -d $BancoConexao -f (Join-Path $raiz "database\seeds\001_seed_inicial.sql")

  Write-Host "Banco aplicado com sucesso."
} finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
