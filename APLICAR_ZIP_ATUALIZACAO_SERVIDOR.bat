@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Atualiza o Control S Hub a partir de um ZIP copiado para a pasta do sistema.
REM Nao apaga banco, nao remove .env, logs, backups nem dados locais.

set "RAIZ=%~dp0"
set "ZIP=%RAIZ%ControlSHub_atualizacao.zip"
set "TMP=%RAIZ%_update_tmp"
set "DATA_LOG=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%"
set "HORA_LOG=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "HORA_LOG=%HORA_LOG: =0%"
set "LOG=%RAIZ%logs\aplicar_zip_%DATA_LOG%_%HORA_LOG%.log"

if not exist "%RAIZ%logs" mkdir "%RAIZ%logs"

call :log "=================================================="
call :log "Control S Hub - Aplicar atualizacao por ZIP"
call :log "=================================================="
call :log "Pasta: %RAIZ%"
call :log "ZIP: %ZIP%"

if not exist "%ZIP%" (
  call :log "ERRO: coloque o arquivo ControlSHub_atualizacao.zip nesta pasta antes de executar."
  exit /b 1
)

echo.
echo Banco de dados:
echo S = aplicar migrations gerais antigas do sistema
echo N = nao mexer no banco agora
echo.
set /p APLICAR_SQL_PREDEFINIDO="Aplicar migrations gerais no banco? (S/N): "
if /I not "%APLICAR_SQL_PREDEFINIDO%"=="S" set "APLICAR_SQL_PREDEFINIDO=N"
call :log "Opcao de banco selecionada: %APLICAR_SQL_PREDEFINIDO%"

if exist "%TMP%" rmdir /s /q "%TMP%"
mkdir "%TMP%"

call :log "Extraindo pacote..."
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%TMP%' -Force; Write-Host 'ZIP extraido com sucesso.'" >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

call :log "Copiando arquivos sem apagar dados locais..."
robocopy "%TMP%" "%RAIZ%" /E /NFL /NDL /NJH /NJS /NP /XD node_modules logs backups dist-atualizacao .git /XF .env *.backup *.bak_* >> "%LOG%" 2>&1
if %ERRORLEVEL% GEQ 8 goto :falha

call :log "Limpando temporarios..."
rmdir /s /q "%TMP%"

call :log "Executando atualizador seguro..."
call "%RAIZ%ATUALIZAR_SERVIDOR_SEM_PERDER_DADOS.bat"
if errorlevel 1 goto :falha

call :log "Atualizacao por ZIP concluida."
exit /b 0

:falha
call :log "FALHA ao aplicar ZIP. Consulte o log: %LOG%"
if exist "%TMP%" rmdir /s /q "%TMP%"
exit /b 1

:log
set "linha=%~1"
echo %linha%
>> "%LOG%" echo %linha%
exit /b 0
