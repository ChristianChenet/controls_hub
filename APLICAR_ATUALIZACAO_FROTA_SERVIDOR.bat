@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Atualizador completo do Modulo Frota.
REM Aplica o ZIP do Control S Hub e depois executa somente o banco do Frota.
REM Nao executa migrations antigas de Cotacao de Frete, PIM, BI ou outros modulos.

set "RAIZ=%~dp0"
set "ZIP=%RAIZ%ControlSHub_atualizacao.zip"
set "TMP=%RAIZ%_update_tmp"
set "DATA_LOG=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%"
set "HORA_LOG=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "HORA_LOG=%HORA_LOG: =0%"
set "LOG=%RAIZ%logs\atualizacao_frota_%DATA_LOG%_%HORA_LOG%.log"

if not exist "%RAIZ%logs" mkdir "%RAIZ%logs"

call :log "=================================================="
call :log "Control S Hub - Atualizacao completa do Modulo Frota"
call :log "=================================================="
call :log "Pasta: %RAIZ%"
call :log "ZIP: %ZIP%"
call :log "Log: %LOG%"

if not exist "%ZIP%" (
  call :log "ERRO: coloque o arquivo ControlSHub_atualizacao.zip nesta pasta antes de executar."
  exit /b 1
)

set "SENHA=%~1"
if "%SENHA%"=="" set "SENHA=CONTROLS"

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

call :log "Executando atualizador seguro sem migrations gerais..."
set "APLICAR_SQL_PREDEFINIDO=N"
call "%RAIZ%ATUALIZAR_SERVIDOR_SEM_PERDER_DADOS.bat" >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

call :log "Aplicando somente o banco do Modulo Frota..."
call "%RAIZ%APLICAR_BANCO_FROTA.bat" "%SENHA%" >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

call :log "Atualizacao completa do Modulo Frota concluida."
echo.
echo Atualizacao completa do Modulo Frota concluida.
echo Reinicie o sistema se ele estiver em execucao.
exit /b 0

:falha
call :log "FALHA na atualizacao do Modulo Frota. Consulte o log: %LOG%"
if exist "%TMP%" rmdir /s /q "%TMP%"
exit /b 1

:log
set "linha=%~1"
echo %linha%
>> "%LOG%" echo %linha%
exit /b 0
