@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Atualizador seguro do Control S Hub.
REM Nao apaga banco, nao restaura backup e nao remove dados de producao.

set "RAIZ=%~dp0"
set "DATA_LOG=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%"
set "HORA_LOG=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "HORA_LOG=%HORA_LOG: =0%"
set "LOG=%RAIZ%logs\atualizacao_servidor_%DATA_LOG%_%HORA_LOG%.log"

if not exist "%RAIZ%logs" mkdir "%RAIZ%logs"

call :log "=================================================="
call :log "Control S Hub - Atualizador seguro de servidor"
call :log "=================================================="
call :log "Pasta: %RAIZ%"
call :log "Log: %LOG%"
call :log ""

call :validar_comando node
if errorlevel 1 goto :falha
call :validar_comando npm
if errorlevel 1 goto :falha

call :log "Este atualizador nao executa DROP, nao restaura backup e nao remove dados."
call :log "Instalando dependencias e gerando builds de producao."
call :log ""

pushd "%RAIZ%"
call npm install >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd

call :log "Build do backend..."
pushd "%RAIZ%apps\backend"
call npm install >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
call :log "Garantindo driver SQL Server do PIM..."
call npm install mssql@12.7.0 >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
call node -e "import('mssql').then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1)})" >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
popd

call :log "Build do frontend..."
pushd "%RAIZ%apps\frontend"
call npm install >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
popd

call :log ""
if "%APLICAR_SQL_PREDEFINIDO%"=="" (
  set /p APLICAR_SQL="Aplicar migrations aditivas 012 a 029 no banco? (S/N): "
) else (
  set "APLICAR_SQL=%APLICAR_SQL_PREDEFINIDO%"
  call :log "Opcao de banco recebida do aplicador ZIP: %APLICAR_SQL%"
)
if /I "%APLICAR_SQL%"=="S" (
  call :validar_comando psql
  if errorlevel 1 goto :falha_popd
  if "%DATABASE_URL%"=="" (
    call :carregar_database_url_env
  )
  if "%DATABASE_URL%"=="" (
    call :log "ERRO: defina DATABASE_URL antes de aplicar migrations ou preencha DATABASE_URL no .env da raiz."
    goto :falha_popd
  )
  call :log "Aplicando migration 012_parametros_sugestao_envio_massa.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\012_parametros_sugestao_envio_massa.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 013_etapas_kanban_fluxo_simplificado.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\013_etapas_kanban_fluxo_simplificado.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 014_transportadora_cte_nome.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\014_transportadora_cte_nome.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 015_normalizar_etapas_status_cotacao.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\015_normalizar_etapas_status_cotacao.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 016_status_cotacao_automatico_trigger.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\016_status_cotacao_automatico_trigger.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 017_transportadora_cte_codigo.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\017_transportadora_cte_codigo.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 018_recalculo_status_fluxo_cotacao.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\018_recalculo_status_fluxo_cotacao.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 018_status_operacional_sem_trava_legada.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\018_status_operacional_sem_trava_legada.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 020_parametros_publicacao_cotacoes_monvizo.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\020_parametros_publicacao_cotacoes_monvizo.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 021_views_cotacoes_ativas.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\021_views_cotacoes_ativas.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 022_numero_cotacao_transportadora.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\022_numero_cotacao_transportadora.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 023_modelo_email_transportadora.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\023_modelo_email_transportadora.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 024_origens_obrigatorias_motivos_escolha.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\024_origens_obrigatorias_motivos_escolha.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 025_lote_fluxo_logistico_cotacao.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\025_lote_fluxo_logistico_cotacao.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 026_transportadora_escolhida_plataforma_sequencia.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\026_transportadora_escolhida_plataforma_sequencia.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 027_pim_sqlserver_carga_manual.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\027_pim_sqlserver_carga_manual.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 028_pim_consultas_sqlserver_salvas.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\028_pim_consultas_sqlserver_salvas.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 029_business_intelligence.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\029_business_intelligence.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
  call :log "Aplicando migration 030_parametros_monitor_n8n.sql..."
  psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%RAIZ%database\migrations\030_parametros_monitor_n8n.sql" >> "%LOG%" 2>&1
  if errorlevel 1 goto :falha_popd
) else (
  call :log "Migrations nao aplicadas por opcao do operador."
)

call :log ""
call :log "Atualizacao concluida sem alterar dados do banco."
call :log "Use INICIAR_SISTEMA.bat para subir backend e frontend."
popd
exit /b 0

:validar_comando
where %1 >nul 2>nul
if errorlevel 1 (
  call :log "ERRO: comando %1 nao encontrado no PATH."
  exit /b 1
)
call :log "OK: %1 encontrado."
exit /b 0

:falha_popd
popd
:falha
call :log ""
call :log "FALHA NA ATUALIZACAO. Consulte o log: %LOG%"
exit /b 1

:carregar_database_url_env
if not exist "%RAIZ%.env" exit /b 0
for /f "usebackq tokens=1,* delims==" %%A in ("%RAIZ%.env") do (
  if /I "%%A"=="DATABASE_URL" set "DATABASE_URL=%%B"
)
if not "%DATABASE_URL%"=="" call :log "DATABASE_URL carregado do .env."
exit /b 0

:log
set "linha=%~1"
echo %linha%
>> "%LOG%" echo %linha%
exit /b 0
