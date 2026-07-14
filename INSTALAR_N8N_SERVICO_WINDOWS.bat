@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION

REM ================================================================
REM N8N - Control S - Instalador de servico Windows
REM ================================================================
REM Cria/atualiza o n8n como servico do Windows usando NSSM.
REM O servico fica automatico, com log e reinicio em caso de queda.
REM
REM Execute como Administrador no servidor.
REM ================================================================

SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"

SET "SERVICO_N8N=ControlSIntN8N"
SET "NSSM_DIR=C:\nssm"
SET "NSSM_EXE=%NSSM_DIR%\win64\nssm.exe"
SET "NSSM_URL=https://nssm.cc/release/nssm-2.24.zip"
SET "NSSM_ZIP=%TEMP%\nssm-2.24.zip"

SET "N8N_CMD=C:\Users\Daikin\AppData\Roaming\npm\n8n.cmd"
SET "N8N_DIR=C:\Users\Daikin"
SET "N8N_LOG_DIR=C:\n8n\logs"
SET "N8N_HOST=192.168.1.70"
SET "N8N_PORT=5678"
SET "N8N_PROTOCOL=http"
SET "WEBHOOK_URL=http://192.168.1.70:5678/"
SET "N8N_EDITOR_BASE_URL=http://192.168.1.70:5678/"
SET "N8N_SECURE_COOKIE=false"

IF NOT EXIST "%BASE_DIR%\logs" MKDIR "%BASE_DIR%\logs"
IF NOT EXIST "%N8N_LOG_DIR%" MKDIR "%N8N_LOG_DIR%"

SET "LOG=%BASE_DIR%\logs\instalar-n8n-servico-windows.log"

CALL :LOG "================================================"
CALL :LOG "Iniciando instalacao/atualizacao do servico n8n."

NET SESSION >NUL 2>&1
IF ERRORLEVEL 1 (
  CALL :LOG "ERRO: execute este arquivo como Administrador."
  ECHO.
  ECHO ERRO: execute este arquivo como Administrador.
  PAUSE
  EXIT /B 1
)

IF NOT EXIST "%N8N_CMD%" (
  CALL :LOG "ERRO: n8n.cmd nao encontrado em %N8N_CMD%."
  ECHO ERRO: n8n.cmd nao encontrado em "%N8N_CMD%".
  ECHO Instale ou ajuste o caminho do n8n neste arquivo.
  PAUSE
  EXIT /B 1
)

CALL :GARANTIR_NSSM
IF ERRORLEVEL 1 EXIT /B 1

CALL :PARAR_N8N_MANUAL

SC QUERY "%SERVICO_N8N%" >NUL 2>&1
IF ERRORLEVEL 1 (
  CALL :LOG "Criando servico %SERVICO_N8N%."
  "%NSSM_EXE%" install "%SERVICO_N8N%" "C:\Windows\System32\cmd.exe" "/c ""%N8N_CMD%"" start" >> "%LOG%" 2>&1
) ELSE (
  CALL :LOG "Servico %SERVICO_N8N% ja existe. Atualizando configuracao."
  NET STOP "%SERVICO_N8N%" >> "%LOG%" 2>&1
)

"%NSSM_EXE%" set "%SERVICO_N8N%" AppDirectory "%N8N_DIR%" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppEnvironmentExtra "N8N_HOST=%N8N_HOST%" "N8N_PORT=%N8N_PORT%" "N8N_PROTOCOL=%N8N_PROTOCOL%" "WEBHOOK_URL=%WEBHOOK_URL%" "N8N_EDITOR_BASE_URL=%N8N_EDITOR_BASE_URL%" "N8N_SECURE_COOKIE=%N8N_SECURE_COOKIE%" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppStdout "%N8N_LOG_DIR%\n8n-service.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppStderr "%N8N_LOG_DIR%\n8n-service.err.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppRotateFiles 1 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppRotateOnline 1 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppRotateBytes 10485760 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppRestartDelay 5000 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppThrottle 1500 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" Start SERVICE_AUTO_START >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_N8N%" AppExit Default Restart >> "%LOG%" 2>&1

CALL :LOG "Iniciando servico %SERVICO_N8N%."
NET START "%SERVICO_N8N%" >> "%LOG%" 2>&1

TIMEOUT /T 5 /NOBREAK >NUL

CALL :LOG "Validando porta %N8N_PORT%."
POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort %N8N_PORT% -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess | Format-Table -AutoSize" >> "%LOG%" 2>&1

POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://%N8N_HOST%:%N8N_PORT%/' -TimeoutSec 20; Write-Output ('HTTP ' + [int]$r.StatusCode); exit 0 } catch { Write-Output $_.Exception.Message; exit 1 }" >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  CALL :LOG "AVISO: n8n nao respondeu pelo HTTP apos iniciar. Verifique logs."
  ECHO.
  ECHO AVISO: n8n nao respondeu pelo HTTP apos iniciar.
  ECHO Veja:
  ECHO   %LOG%
  ECHO   %N8N_LOG_DIR%\n8n-service.err.log
) ELSE (
  CALL :LOG "n8n respondeu pelo HTTP."
)

CALL :LOG "Concluido."
ECHO.
ECHO Servico configurado: %SERVICO_N8N%
ECHO URL: http://%N8N_HOST%:%N8N_PORT%/
ECHO.
ECHO Comandos uteis:
ECHO   Get-Service %SERVICO_N8N%
ECHO   Restart-Service %SERVICO_N8N%
ECHO   Get-Content "%N8N_LOG_DIR%\n8n-service.err.log" -Tail 80
ECHO   Get-Content "%N8N_LOG_DIR%\n8n-service.log" -Tail 80
ECHO.
ECHO Log do instalador: %LOG%
ECHO.
PAUSE
EXIT /B 0

:PARAR_N8N_MANUAL
CALL :LOG "Parando possiveis processos manuais do n8n na porta %N8N_PORT%."
FOR /F "usebackq tokens=*" %%P IN (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort %N8N_PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`) DO (
  IF NOT "%%P"=="0" (
    CALL :LOG "Parando processo que ocupava a porta %N8N_PORT%: %%P"
    POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "Stop-Process -Id %%P -Force -ErrorAction SilentlyContinue" >> "%LOG%" 2>&1
  )
)
EXIT /B 0

:GARANTIR_NSSM
IF EXIST "%NSSM_EXE%" (
  CALL :LOG "NSSM encontrado em %NSSM_EXE%."
  EXIT /B 0
)

CALL :LOG "NSSM nao encontrado. Tentando baixar automaticamente..."
IF NOT EXIST "%NSSM_DIR%" MKDIR "%NSSM_DIR%"

POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%NSSM_URL%' -OutFile '%NSSM_ZIP%'" >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  CALL :LOG "ERRO: nao foi possivel baixar NSSM."
  ECHO ERRO: nao foi possivel baixar NSSM.
  ECHO Baixe manualmente em https://nssm.cc/download e extraia em C:\nssm
  PAUSE
  EXIT /B 1
)

POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%NSSM_ZIP%' -DestinationPath '%TEMP%\nssm-extraido' -Force; Copy-Item -LiteralPath '%TEMP%\nssm-extraido\nssm-2.24\win64' -Destination '%NSSM_DIR%' -Recurse -Force" >> "%LOG%" 2>&1
IF NOT EXIST "%NSSM_EXE%" (
  CALL :LOG "ERRO: NSSM baixado, mas executavel nao foi encontrado."
  ECHO ERRO: NSSM baixado, mas executavel nao foi encontrado em "%NSSM_EXE%".
  PAUSE
  EXIT /B 1
)

CALL :LOG "NSSM instalado em %NSSM_EXE%."
EXIT /B 0

:LOG
ECHO [%DATE% %TIME%] %~1
ECHO [%DATE% %TIME%] %~1>> "%LOG%"
EXIT /B 0
