param(
  [string]$Banco = "controlshub",
  [string]$Usuario = "postgres",
  [string]$Senha = "CONTROLS",
  [string]$HostBanco = "127.0.0.1",
  [int]$Porta = 5432
)

$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")

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

$sqls = @(
  "database\migrations\012_cadastro_produto_central.sql",
  "database\migrations\013_evolucao_pim_identidade_visual.sql",
  "database\migrations\014_consolidacao_pim_permissoes.sql",
  "database\migrations\015_padronizar_pim_banco_portugues.sql",
  "database\migrations\027_pim_sqlserver_carga_manual.sql",
  "database\migrations\028_pim_consultas_sqlserver_salvas.sql"
)

Write-Host "Atualizando banco do Cadastro de Produto Central..."
Write-Host "Banco: $Banco"
Write-Host "PSQL: $psql"

$env:PGPASSWORD = $Senha
try {
  foreach ($relativo in $sqls) {
    $arquivo = Join-Path $raiz $relativo
    if (-not (Test-Path -LiteralPath $arquivo)) {
      throw "Arquivo SQL nao encontrado: $arquivo"
    }

    Write-Host "Aplicando: $relativo"
    & $psql -h $HostBanco -p $Porta -U $Usuario -d $Banco -v ON_ERROR_STOP=1 -f $arquivo
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao aplicar $relativo"
    }
  }
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Atualizacao de banco do Cadastro de Produto Central concluida."
