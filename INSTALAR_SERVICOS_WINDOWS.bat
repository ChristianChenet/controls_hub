@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION

REM ================================================================
REM Control S Hub - Instalador de servicos Windows
REM ================================================================
REM Este script transforma Backend, Frontend e, se existir, Nginx em
REM servicos do Windows usando NSSM. Ele nao apaga banco, nao apaga
REM arquivos de configuracao e nao executa SQL.
REM
REM Execute como Administrador no servidor.
REM ================================================================

SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"

SET "NSSM_DIR=C:\nssm"
SET "NSSM_EXE=%NSSM_DIR%\win64\nssm.exe"
SET "NSSM_URL=https://nssm.cc/release/nssm-2.24.zip"
SET "NSSM_ZIP=%TEMP%\nssm-2.24.zip"

SET "NODE_EXE=C:\Program Files\nodejs\node.exe"
SET "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
SET "NGINX_EXE=C:\nginx\nginx.exe"

SET "CONTROL_SHUB_DIR=C:\Control S Hub"
SET "CONTROL_API_HUB_DIR=C:\Control S API Hub"
SET "CONTROL_FISCAL_HUB_DIR=C:\Control S Fiscal Hub"

SET "SERVICO_BACKEND=ControlSHubBackend"
SET "SERVICO_FRONTEND=ControlSHubFrontend"
SET "SERVICO_NGINX=Nginx"
SET "SERVICO_API_BACKEND=ControlSApiHubBackend"
SET "SERVICO_API_FRONTEND=ControlSApiHubFrontend"
SET "SERVICO_FISCAL_PORTAL=ControlSFiscalHubPortal"

SET "PORTA_API=3334"
SET "PORTA_FRONTEND=5174"
SET "PORTA_API_HUB_BACKEND=3335"
SET "PORTA_API_HUB_FRONTEND=5173"
SET "PORTA_FISCAL_HUB=8088"
SET "BANCO_URL=postgres://postgres:controls@localhost:5432/controlshub"
SET "SEGREDO_JWT=CONTROL_S_HUB_DESENVOLVIMENTO"

IF NOT EXIST "%BASE_DIR%\logs" MKDIR "%BASE_DIR%\logs"
SET "LOG=%BASE_DIR%\logs\instalar-servicos-windows.log"

CALL :LOG "================================================"
CALL :LOG "Iniciando instalacao/atualizacao dos servicos."
CALL :LOG "Projeto: %BASE_DIR%"

NET SESSION >NUL 2>&1
IF ERRORLEVEL 1 (
  CALL :LOG "ERRO: execute este arquivo como Administrador."
  ECHO.
  ECHO ERRO: execute este arquivo como Administrador.
  PAUSE
  EXIT /B 1
)

IF NOT EXIST "%NODE_EXE%" (
  CALL :LOG "ERRO: Node.js nao encontrado em %NODE_EXE%."
  ECHO ERRO: Node.js nao encontrado em "%NODE_EXE%".
  PAUSE
  EXIT /B 1
)

IF NOT EXIST "%NPM_CMD%" (
  CALL :LOG "ERRO: npm nao encontrado em %NPM_CMD%."
  ECHO ERRO: npm nao encontrado em "%NPM_CMD%".
  PAUSE
  EXIT /B 1
)

CALL :GARANTIR_NSSM
IF ERRORLEVEL 1 EXIT /B 1

CALL :LOG "Instalando dependencias e gerando build..."
PUSHD "%BASE_DIR%"
CALL "%NPM_CMD%" install >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  POPD
  CALL :LOG "ERRO: npm install falhou."
  ECHO ERRO: npm install falhou. Veja o log: %LOG%
  PAUSE
  EXIT /B 1
)

CALL "%NPM_CMD%" run build >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  POPD
  CALL :LOG "ERRO: npm run build falhou."
  ECHO ERRO: npm run build falhou. Veja o log: %LOG%
  PAUSE
  EXIT /B 1
)
POPD

IF NOT EXIST "%BASE_DIR%\apps\backend\dist\server.js" (
  CALL :LOG "ERRO: build do backend nao gerou apps\backend\dist\server.js."
  ECHO ERRO: build do backend nao gerou apps\backend\dist\server.js.
  PAUSE
  EXIT /B 1
)

CALL :INSTALAR_BACKEND
IF ERRORLEVEL 1 EXIT /B 1

CALL :INSTALAR_FRONTEND
IF ERRORLEVEL 1 EXIT /B 1

IF EXIST "%CONTROL_API_HUB_DIR%\package.json" (
  CALL :INSTALAR_API_HUB
  IF ERRORLEVEL 1 EXIT /B 1
) ELSE (
  CALL :LOG "Control S API Hub nao encontrado em %CONTROL_API_HUB_DIR%. Pulei esses servicos."
)

IF EXIST "%CONTROL_FISCAL_HUB_DIR%\app\public\index.php" (
  CALL :INSTALAR_FISCAL_HUB
  IF ERRORLEVEL 1 EXIT /B 1
) ELSE (
  CALL :LOG "Control S Fiscal Hub nao encontrado em %CONTROL_FISCAL_HUB_DIR%. Pulei esses servicos."
)

IF EXIST "%NGINX_EXE%" (
  CALL :INSTALAR_NGINX
) ELSE (
  CALL :LOG "Nginx nao encontrado em %NGINX_EXE%. Servico Nginx nao foi criado."
  ECHO Aviso: Nginx nao encontrado em "%NGINX_EXE%". Pulei o servico Nginx.
)

CALL :LOG "Validando portas e endpoints..."
TIMEOUT /T 3 /NOBREAK >NUL
POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort %PORTA_API%,%PORTA_FRONTEND%,8080 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess | Format-Table -AutoSize" >> "%LOG%" 2>&1
POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%PORTA_API%/saude -TimeoutSec 10).StatusCode } catch { $_.Exception.Message; exit 1 }" >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  CALL :LOG "AVISO: backend nao respondeu /saude apos iniciar. Verifique logs do servico."
  ECHO AVISO: backend nao respondeu /saude. Veja o log: %LOG%
) ELSE (
  CALL :LOG "Backend respondeu /saude."
)

CALL :LOG "Concluido."
ECHO.
ECHO Servicos instalados/atualizados:
ECHO - %SERVICO_BACKEND%
ECHO - %SERVICO_FRONTEND%
IF EXIST "%CONTROL_API_HUB_DIR%\package.json" ECHO - %SERVICO_API_BACKEND%
IF EXIST "%CONTROL_API_HUB_DIR%\package.json" ECHO - %SERVICO_API_FRONTEND%
IF EXIST "%CONTROL_FISCAL_HUB_DIR%\app\public\index.php" ECHO - %SERVICO_FISCAL_PORTAL%
IF EXIST "%NGINX_EXE%" ECHO - %SERVICO_NGINX%
ECHO.
ECHO Log: %LOG%
ECHO.
ECHO Comandos uteis:
ECHO   Get-Service ControlSHubBackend,ControlSHubFrontend,Nginx
ECHO   Get-Service ControlSApiHubBackend,ControlSApiHubFrontend
ECHO   Get-Service ControlSFiscalHubPortal
ECHO   Restart-Service ControlSHubBackend
ECHO   Restart-Service ControlSHubFrontend
ECHO   sc query ControlSHubBackend
ECHO.
PAUSE
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

:INSTALAR_BACKEND
CALL :LOG "Configurando servico %SERVICO_BACKEND%..."
SC QUERY "%SERVICO_BACKEND%" >NUL 2>&1
IF ERRORLEVEL 1 (
  "%NSSM_EXE%" install "%SERVICO_BACKEND%" "%NODE_EXE%" "apps\backend\dist\server.js" >> "%LOG%" 2>&1
) ELSE (
  NET STOP "%SERVICO_BACKEND%" >> "%LOG%" 2>&1
)

"%NSSM_EXE%" set "%SERVICO_BACKEND%" AppDirectory "%BASE_DIR%" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_BACKEND%" AppEnvironmentExtra "PORTA_API=%PORTA_API%" "BANCO_URL=%BANCO_URL%" "SEGREDO_JWT=%SEGREDO_JWT%" "NODE_ENV=production" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_BACKEND%" AppStdout "%BASE_DIR%\logs\backend-service.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_BACKEND%" AppStderr "%BASE_DIR%\logs\backend-service.err.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_BACKEND%" AppRotateFiles 1 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_BACKEND%" AppRotateBytes 10485760 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_BACKEND%" AppRestartDelay 5000 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_BACKEND%" Start SERVICE_AUTO_START >> "%LOG%" 2>&1
NET START "%SERVICO_BACKEND%" >> "%LOG%" 2>&1
EXIT /B 0

:INSTALAR_FRONTEND
CALL :LOG "Configurando servico %SERVICO_FRONTEND%..."
SC QUERY "%SERVICO_FRONTEND%" >NUL 2>&1
IF ERRORLEVEL 1 (
  "%NSSM_EXE%" install "%SERVICO_FRONTEND%" "%NPM_CMD%" "--workspace apps/frontend run dev -- --host 0.0.0.0 --port %PORTA_FRONTEND%" >> "%LOG%" 2>&1
) ELSE (
  NET STOP "%SERVICO_FRONTEND%" >> "%LOG%" 2>&1
)

"%NSSM_EXE%" set "%SERVICO_FRONTEND%" AppDirectory "%BASE_DIR%" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FRONTEND%" AppStdout "%BASE_DIR%\logs\frontend-service.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FRONTEND%" AppStderr "%BASE_DIR%\logs\frontend-service.err.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FRONTEND%" AppRotateFiles 1 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FRONTEND%" AppRotateBytes 10485760 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FRONTEND%" AppRestartDelay 5000 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FRONTEND%" Start SERVICE_AUTO_START >> "%LOG%" 2>&1
NET START "%SERVICO_FRONTEND%" >> "%LOG%" 2>&1
EXIT /B 0

:INSTALAR_API_HUB
CALL :LOG "Configurando servicos do Control S API Hub..."
PUSHD "%CONTROL_API_HUB_DIR%"
CALL "%NPM_CMD%" install >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  POPD
  CALL :LOG "ERRO: npm install do Control S API Hub falhou."
  ECHO ERRO: npm install do Control S API Hub falhou. Veja o log: %LOG%
  EXIT /B 1
)

CALL "%NPM_CMD%" run build >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  POPD
  CALL :LOG "ERRO: npm run build do Control S API Hub falhou."
  ECHO ERRO: npm run build do Control S API Hub falhou. Veja o log: %LOG%
  EXIT /B 1
)
POPD

IF NOT EXIST "%CONTROL_API_HUB_DIR%\apps\backend\dist\server.js" (
  CALL :LOG "ERRO: build do API Hub nao gerou apps\backend\dist\server.js."
  ECHO ERRO: build do API Hub nao gerou apps\backend\dist\server.js.
  EXIT /B 1
)

SC QUERY "%SERVICO_API_BACKEND%" >NUL 2>&1
IF ERRORLEVEL 1 (
  "%NSSM_EXE%" install "%SERVICO_API_BACKEND%" "%NODE_EXE%" "apps\backend\dist\server.js" >> "%LOG%" 2>&1
) ELSE (
  NET STOP "%SERVICO_API_BACKEND%" >> "%LOG%" 2>&1
)

"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" AppDirectory "%CONTROL_API_HUB_DIR%" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" AppEnvironmentExtra "NODE_ENV=production" "PORT=%PORTA_API_HUB_BACKEND%" "HOST=0.0.0.0" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" AppStdout "%CONTROL_API_HUB_DIR%\logs\backend-service.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" AppStderr "%CONTROL_API_HUB_DIR%\logs\backend-service.err.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" AppRotateFiles 1 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" AppRotateBytes 10485760 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" AppRestartDelay 5000 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_BACKEND%" Start SERVICE_AUTO_START >> "%LOG%" 2>&1
NET START "%SERVICO_API_BACKEND%" >> "%LOG%" 2>&1

SC QUERY "%SERVICO_API_FRONTEND%" >NUL 2>&1
IF ERRORLEVEL 1 (
  "%NSSM_EXE%" install "%SERVICO_API_FRONTEND%" "%NPM_CMD%" "--workspace apps/frontend run dev -- --host 0.0.0.0 --port %PORTA_API_HUB_FRONTEND%" >> "%LOG%" 2>&1
) ELSE (
  NET STOP "%SERVICO_API_FRONTEND%" >> "%LOG%" 2>&1
)

"%NSSM_EXE%" set "%SERVICO_API_FRONTEND%" AppDirectory "%CONTROL_API_HUB_DIR%" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_FRONTEND%" AppStdout "%CONTROL_API_HUB_DIR%\logs\frontend-service.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_FRONTEND%" AppStderr "%CONTROL_API_HUB_DIR%\logs\frontend-service.err.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_FRONTEND%" AppRotateFiles 1 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_FRONTEND%" AppRotateBytes 10485760 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_FRONTEND%" AppRestartDelay 5000 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_API_FRONTEND%" Start SERVICE_AUTO_START >> "%LOG%" 2>&1
NET START "%SERVICO_API_FRONTEND%" >> "%LOG%" 2>&1
EXIT /B 0

:INSTALAR_FISCAL_HUB
CALL :LOG "Configurando servicos do Control S Fiscal Hub..."
CALL :LOCALIZAR_PHP
IF ERRORLEVEL 1 (
  CALL :LOG "ERRO: PHP nao encontrado. Nao foi possivel criar servicos do Fiscal Hub."
  ECHO ERRO: PHP nao encontrado. Instale/ajuste PHP antes de criar os servicos do Fiscal Hub.
  EXIT /B 1
)

CALL :LOG "Tarefas agendadas existentes do Fiscal Hub serao preservadas. Nenhuma tarefa sera parada ou removida."
CALL :LOG "Workers fiscais nao serao criados como servico para evitar duplicidade com tarefas agendadas."

CALL :INSTALAR_FISCAL_PORTAL
IF ERRORLEVEL 1 EXIT /B 1
EXIT /B 0

:LOCALIZAR_PHP
SET "PHP_EXE="
FOR /F "usebackq delims=" %%P IN (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$cmd=Get-Command php.exe -ErrorAction SilentlyContinue; if($cmd){$cmd.Source; exit}; $c=Get-ChildItem 'C:\Users\chris\AppData\Local\Microsoft\WinGet\Packages','C:\tools','C:\Program Files' -Filter php.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1; if($c){$c.FullName}"`) DO SET "PHP_EXE=%%P"
IF "%PHP_EXE%"=="" EXIT /B 1
IF NOT EXIST "%PHP_EXE%" EXIT /B 1
CALL :LOG "PHP encontrado em %PHP_EXE%."
EXIT /B 0

:INSTALAR_FISCAL_PORTAL
SC QUERY "%SERVICO_FISCAL_PORTAL%" >NUL 2>&1
IF ERRORLEVEL 1 (
  "%NSSM_EXE%" install "%SERVICO_FISCAL_PORTAL%" "powershell.exe" "-NoProfile -ExecutionPolicy Bypass -File scripts\windows\run-portal.ps1 -PhpPath ""%PHP_EXE%"" -Port %PORTA_FISCAL_HUB%" >> "%LOG%" 2>&1
) ELSE (
  NET STOP "%SERVICO_FISCAL_PORTAL%" >> "%LOG%" 2>&1
)

"%NSSM_EXE%" set "%SERVICO_FISCAL_PORTAL%" AppDirectory "%CONTROL_FISCAL_HUB_DIR%" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FISCAL_PORTAL%" AppStdout "%CONTROL_FISCAL_HUB_DIR%\app\storage\logs\fiscal-portal-service.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FISCAL_PORTAL%" AppStderr "%CONTROL_FISCAL_HUB_DIR%\app\storage\logs\fiscal-portal-service.err.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FISCAL_PORTAL%" AppRestartDelay 5000 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_FISCAL_PORTAL%" Start SERVICE_AUTO_START >> "%LOG%" 2>&1
NET START "%SERVICO_FISCAL_PORTAL%" >> "%LOG%" 2>&1
EXIT /B 0

:INSTALAR_NGINX
CALL :LOG "Configurando servico %SERVICO_NGINX%..."
PUSHD "C:\nginx"
"%NGINX_EXE%" -t >> "%LOG%" 2>&1
IF ERRORLEVEL 1 (
  POPD
  CALL :LOG "ERRO: nginx -t falhou. Corrija a configuracao antes de instalar o servico."
  ECHO ERRO: nginx -t falhou. Veja o log: %LOG%
  EXIT /B 1
)
POPD

SC QUERY "%SERVICO_NGINX%" >NUL 2>&1
IF ERRORLEVEL 1 (
  "%NSSM_EXE%" install "%SERVICO_NGINX%" "%NGINX_EXE%" >> "%LOG%" 2>&1
) ELSE (
  NET STOP "%SERVICO_NGINX%" >> "%LOG%" 2>&1
)

"%NSSM_EXE%" set "%SERVICO_NGINX%" AppDirectory "C:\nginx" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_NGINX%" AppStdout "%BASE_DIR%\logs\nginx-service.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_NGINX%" AppStderr "%BASE_DIR%\logs\nginx-service.err.log" >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_NGINX%" AppStopMethodSkip 6 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_NGINX%" AppRestartDelay 5000 >> "%LOG%" 2>&1
"%NSSM_EXE%" set "%SERVICO_NGINX%" Start SERVICE_AUTO_START >> "%LOG%" 2>&1
NET START "%SERVICO_NGINX%" >> "%LOG%" 2>&1
EXIT /B 0

:LOG
ECHO [%DATE% %TIME%] %~1
ECHO [%DATE% %TIME%] %~1>> "%LOG%"
EXIT /B 0
