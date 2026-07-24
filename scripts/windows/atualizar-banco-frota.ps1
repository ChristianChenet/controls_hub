param(
  [string]$Banco = "CONTROLSHUB",
  [string]$Usuario = "postgres",
  [string]$Senha = "CONTROLS",
  [string]$HostBanco = "127.0.0.1",
  [int]$Porta = 5432
)

$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$arquivoEnv = Join-Path $raiz ".env"

$candidatosPsql = @(
  "C:\Program Files\PostgreSQL\18\bin\psql.exe",
  "C:\Program Files\PostgreSQL\17\bin\psql.exe",
  "C:\Program Files\PostgreSQL\16\bin\psql.exe",
  "C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

$psql = $candidatosPsql | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $psql) {
  $comando = Get-Command psql.exe -ErrorAction SilentlyContinue
  if ($comando) {
    $psql = $comando.Source
  }
}

if (-not $psql) {
  throw "psql.exe nao encontrado. Instale o cliente PostgreSQL ou ajuste o caminho no script."
}

if (Test-Path -LiteralPath $arquivoEnv) {
  Get-Content -LiteralPath $arquivoEnv | ForEach-Object {
    $linha = $_.Trim()
    if (-not $linha -or $linha.StartsWith("#") -or -not $linha.Contains("=")) {
      return
    }

    $indice = $linha.IndexOf("=")
    $chave = $linha.Substring(0, $indice).Trim()
    $valor = $linha.Substring($indice + 1).Trim().Trim('"').Trim("'")
    if ($chave -and -not [Environment]::GetEnvironmentVariable($chave, "Process")) {
      [Environment]::SetEnvironmentVariable($chave, $valor, "Process")
    }
  }
}

$urlBanco = $env:BANCO_URL
if (-not $urlBanco) {
  $urlBanco = $env:DATABASE_URL
}

# Lista propositalmente restrita ao Modulo Frota.
$sqls = @(
  "database\migrations\033_modulo_frota.sql"
)

Write-Host "Atualizando banco do Modulo Frota..."
if ($urlBanco) {
  Write-Host "Banco: conexao por DATABASE_URL/BANCO_URL do .env ou ambiente"
} else {
  Write-Host "Banco: $Banco"
}
Write-Host "Host: $HostBanco"
Write-Host "Porta: $Porta"
Write-Host "Usuario: $Usuario"
Write-Host "PSQL: $psql"

$env:PGPASSWORD = $Senha
try {
  foreach ($relativo in $sqls) {
    $arquivo = Join-Path $raiz $relativo
    if (-not (Test-Path -LiteralPath $arquivo)) {
      throw "Arquivo SQL nao encontrado: $arquivo"
    }

    Write-Host "Aplicando somente: $relativo"
    if ($urlBanco) {
      & $psql $urlBanco -v ON_ERROR_STOP=1 -f $arquivo
    } else {
      & $psql -h $HostBanco -p $Porta -U $Usuario -d $Banco -v ON_ERROR_STOP=1 -f $arquivo
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao aplicar $relativo"
    }
  }
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Atualizacao de banco do Modulo Frota concluida."
