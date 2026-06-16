@ECHO OFF
SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

REM ============================================================
REM CONTROL S HUB - INSTALAR OU ATUALIZAR
REM Padrao:
REM - .env oficial na raiz
REM - executa npm install/build
REM - executa database\batches\*.sql no PostgreSQL
REM - log em logs\INSTALAR_OU_ATUALIZAR.log
REM ============================================================

SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"
SET "LOG_DIR=%BASE_DIR%\logs"
SET "LOG_FILE=%LOG_DIR%\INSTALAR_OU_ATUALIZAR.log"
SET "ENV_RAIZ=%BASE_DIR%\.env"
SET "ENV_BACKEND=%BASE_DIR%\apps\backend\.env"
SET "ENV_EXAMPLE=%BASE_DIR%\.env.example"
SET "BATCH_DIR=%BASE_DIR%\database\batches"

IF NOT EXIST "%LOG_DIR%" MKDIR "%LOG_DIR%"
> "%LOG_FILE%" ECHO ============================================================
>> "%LOG_FILE%" ECHO CONTROL S HUB - INSTALAR OU ATUALIZAR
>> "%LOG_FILE%" ECHO DATA/HORA: %DATE% %TIME%
>> "%LOG_FILE%" ECHO DIRETORIO: %BASE_DIR%
>> "%LOG_FILE%" ECHO ============================================================

ECHO.
ECHO ============================================================
ECHO  CONTROL S HUB - INSTALAR OU ATUALIZAR
ECHO ============================================================
ECHO.
ECHO Diretorio base:
ECHO %BASE_DIR%
ECHO.
ECHO Log:
ECHO %LOG_FILE%
ECHO.

CALL :LOG "Iniciando processo..."
CALL :LOG "Diretorio base: %BASE_DIR%"

REM ------------------------------------------------------------
REM .env oficial na raiz
REM ------------------------------------------------------------
CALL :LOG "Padronizando arquivo .env na raiz..."

IF EXIST "%ENV_RAIZ%" (
  CALL :LOG ".env encontrado na raiz. Este sera o arquivo oficial."
) ELSE (
  IF EXIST "%ENV_BACKEND%" (
    COPY "%ENV_BACKEND%" "%ENV_RAIZ%" >NUL
    CALL :LOG ".env migrado de apps\backend\.env para a raiz."
  ) ELSE (
    CALL :CRIAR_ENV_EXEMPLO
    CALL :ERRO ".env nao encontrado. Foi criado .env.example. Crie o arquivo .env na raiz com os dados reais do banco."
    GOTO FIM_ERRO
  )
)

IF NOT EXIST "%ENV_EXAMPLE%" CALL :CRIAR_ENV_EXEMPLO

CALL :CARREGAR_ENV

REM Trata DATABASE_URL de exemplo: ignora e tenta usar PG*
SET "DATABASE_URL_VALIDO=0"
IF DEFINED DATABASE_URL (
  ECHO %DATABASE_URL% | FINDSTR /I "usuario:senha host porta banco localhost:5432/controlshub" >NUL
  IF ERRORLEVEL 1 (
    SET "DATABASE_URL_VALIDO=1"
    CALL :LOG "DATABASE_URL valida encontrada no .env."
  ) ELSE (
    CALL :LOG "DATABASE_URL parece estar com valor de exemplo. Ela sera ignorada."
    SET "DATABASE_URL="
  )
)

SET "PG_CONFIG_VALIDO=0"
IF DEFINED PGHOST IF DEFINED PGDATABASE IF DEFINED PGUSER SET "PG_CONFIG_VALIDO=1"

IF "%DATABASE_URL_VALIDO%"=="0" IF "%PG_CONFIG_VALIDO%"=="0" (
  CALL :ERRO "Configuracao de banco ausente. Preencha DATABASE_URL real ou PGHOST, PGDATABASE, PGUSER e PGPASSWORD no .env da raiz."
  ECHO.
  ECHO Exemplo DATABASE_URL:
  ECHO DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/controlshub
  ECHO.
  ECHO Ou exemplo separado:
  ECHO PGHOST=localhost
  ECHO PGPORT=5432
  ECHO PGDATABASE=controlshub
  ECHO PGUSER=postgres
  ECHO PGPASSWORD=SUA_SENHA
  ECHO.
  GOTO FIM_ERRO
)

IF NOT DEFINED PGPORT SET "PGPORT=5432"

REM ------------------------------------------------------------
REM Validar Node.js e npm
REM ------------------------------------------------------------
CALL :LOG "Validando Node.js..."
WHERE node >NUL 2>NUL
IF ERRORLEVEL 1 (
  CALL :ERRO "Node.js nao encontrado no PATH."
  GOTO FIM_ERRO
)
FOR /F "tokens=* USEBACKQ" %%A IN (`node --version`) DO SET "NODE_VERSION=%%A"
CALL :LOG "Node.js encontrado: %NODE_VERSION%"

CALL :LOG "Validando npm..."
WHERE npm >NUL 2>NUL
IF ERRORLEVEL 1 (
  CALL :ERRO "npm nao encontrado no PATH."
  GOTO FIM_ERRO
)
FOR /F "tokens=* USEBACKQ" %%A IN (`npm --version`) DO SET "NPM_VERSION=%%A"
CALL :LOG "npm encontrado: %NPM_VERSION%"

REM ------------------------------------------------------------
REM npm install
REM ------------------------------------------------------------
IF EXIST "%BASE_DIR%\package.json" (
  CALL :LOG "Instalando dependencias do projeto raiz..."
  PUSHD "%BASE_DIR%"
  CALL npm install >> "%LOG_FILE%" 2>&1
  SET "RET=!ERRORLEVEL!"
  POPD
  IF NOT "!RET!"=="0" (
    CALL :ERRO_COM_LOG "Falha ao instalar dependencias do projeto raiz"
    GOTO FIM_ERRO
  )
  CALL :LOG "Dependencias do projeto raiz instaladas com sucesso."
)

IF EXIST "%BASE_DIR%\apps\backend\package.json" (
  CALL :LOG "Instalando dependencias do backend..."
  PUSHD "%BASE_DIR%\apps\backend"
  CALL npm install >> "%LOG_FILE%" 2>&1
  SET "RET=!ERRORLEVEL!"
  POPD
  IF NOT "!RET!"=="0" (
    CALL :ERRO_COM_LOG "Falha ao instalar dependencias do backend"
    GOTO FIM_ERRO
  )
  CALL :LOG "Dependencias do backend instaladas com sucesso."
)

IF EXIST "%BASE_DIR%\apps\frontend\package.json" (
  CALL :LOG "Instalando dependencias do frontend..."
  PUSHD "%BASE_DIR%\apps\frontend"
  CALL npm install >> "%LOG_FILE%" 2>&1
  SET "RET=!ERRORLEVEL!"
  POPD
  IF NOT "!RET!"=="0" (
    CALL :ERRO_COM_LOG "Falha ao instalar dependencias do frontend"
    GOTO FIM_ERRO
  )
  CALL :LOG "Dependencias do frontend instaladas com sucesso."
)

REM ------------------------------------------------------------
REM psql
REM ------------------------------------------------------------
CALL :LOG "Localizando psql.exe..."
SET "PSQL_EXE="
WHERE psql >NUL 2>NUL
IF NOT ERRORLEVEL 1 (
  FOR /F "tokens=* USEBACKQ" %%A IN (`WHERE psql`) DO (
    IF NOT DEFINED PSQL_EXE SET "PSQL_EXE=%%A"
  )
)

IF NOT DEFINED PSQL_EXE (
  FOR /D %%D IN ("C:\Program Files\PostgreSQL\*") DO (
    IF EXIST "%%D\bin\psql.exe" SET "PSQL_EXE=%%D\bin\psql.exe"
  )
)

IF NOT DEFINED PSQL_EXE (
  CALL :ERRO "psql.exe nao encontrado. Instale o PostgreSQL Client ou adicione C:\Program Files\PostgreSQL\XX\bin ao PATH."
  GOTO FIM_ERRO
)
CALL :LOG "psql encontrado: %PSQL_EXE%"

REM ------------------------------------------------------------
REM Executar batches SQL
REM ------------------------------------------------------------
CALL :LOG "Validando batches SQL..."
IF NOT EXIST "%BATCH_DIR%" (
  CALL :LOG "Pasta database\batches nao encontrada. Nenhum SQL de atualizacao foi executado."
) ELSE (
  DIR /B "%BATCH_DIR%\*.sql" >NUL 2>NUL
  IF ERRORLEVEL 1 (
    CALL :LOG "Nenhum arquivo .sql encontrado em database\batches."
  ) ELSE (
    CALL :LOG "Executando batches SQL do banco de dados..."
    FOR /F "usebackq delims=" %%F IN (`DIR /B /ON "%BATCH_DIR%\ATUALIZAR_*.sql"`) DO (
      CALL :LOG "Executando batch: %%F"
      IF DEFINED DATABASE_URL (
        "%PSQL_EXE%" "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "%BATCH_DIR%\%%F" >> "%LOG_FILE%" 2>&1
      ) ELSE (
        "%PSQL_EXE%" -h "%PGHOST%" -p "%PGPORT%" -U "%PGUSER%" -d "%PGDATABASE%" -v ON_ERROR_STOP=1 -f "%BATCH_DIR%\%%F" >> "%LOG_FILE%" 2>&1
      )
      SET "RET=!ERRORLEVEL!"
      IF NOT "!RET!"=="0" (
        CALL :ERRO_COM_LOG "Falha ao executar batch SQL: %%F"
        GOTO FIM_ERRO
      )
      CALL :LOG "Batch executado com sucesso: %%F"
    )
  )
)

REM ------------------------------------------------------------
REM Build
REM ------------------------------------------------------------
IF EXIST "%BASE_DIR%\apps\backend\package.json" (
  CALL :LOG "Executando build do backend..."
  PUSHD "%BASE_DIR%\apps\backend"
  CALL npm run build >> "%LOG_FILE%" 2>&1
  SET "RET=!ERRORLEVEL!"
  POPD
  IF NOT "!RET!"=="0" (
    CALL :ERRO_COM_LOG "Falha no build do backend"
    GOTO FIM_ERRO
  )
  CALL :LOG "Build do backend concluido com sucesso."
)

IF EXIST "%BASE_DIR%\apps\frontend\package.json" (
  CALL :LOG "Executando build do frontend..."
  PUSHD "%BASE_DIR%\apps\frontend"
  CALL npm run build >> "%LOG_FILE%" 2>&1
  SET "RET=!ERRORLEVEL!"
  POPD
  IF NOT "!RET!"=="0" (
    CALL :ERRO_COM_LOG "Falha no build do frontend"
    GOTO FIM_ERRO
  )
  CALL :LOG "Build do frontend concluido com sucesso."
)

CALL :REINICIAR_SERVICOS

CALL :LOG "Processo concluido com sucesso."
ECHO.
ECHO ============================================================
ECHO  INSTALACAO/ATUALIZACAO CONCLUIDA COM SUCESSO
ECHO ============================================================
ECHO.
ECHO Banco de dados atualizado conforme batches disponiveis.
ECHO Log salvo em:
ECHO %LOG_FILE%
ECHO.
PAUSE
EXIT /B 0

:FIM_ERRO
ECHO.
ECHO ============================================================
ECHO  ERRO NA INSTALACAO/ATUALIZACAO
ECHO ============================================================
ECHO.
ECHO Veja o erro acima e o log completo em:
ECHO %LOG_FILE%
ECHO.
PAUSE
EXIT /B 1

:LOG
ECHO [%DATE% %TIME%] %~1
>> "%LOG_FILE%" ECHO [%DATE% %TIME%] %~1
EXIT /B 0

:ERRO
ECHO.
ECHO [ERRO] %~1
>> "%LOG_FILE%" ECHO [ERRO] %~1
ECHO.
EXIT /B 0

:ERRO_COM_LOG
ECHO.
ECHO [ERRO] %~1. Ultimas linhas do log:
>> "%LOG_FILE%" ECHO [ERRO] %~1
ECHO.
POWERSHELL -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%LOG_FILE%' -Tail 25"
ECHO.
EXIT /B 0

:CRIAR_ENV_EXEMPLO
> "%ENV_EXAMPLE%" ECHO # CONTROL S HUB - CONFIGURACAO OFICIAL NA RAIZ
>> "%ENV_EXAMPLE%" ECHO # Opção 1 - recomendado
>> "%ENV_EXAMPLE%" ECHO DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/controlshub
>> "%ENV_EXAMPLE%" ECHO.
>> "%ENV_EXAMPLE%" ECHO # Opção 2 - parametros separados
>> "%ENV_EXAMPLE%" ECHO PGHOST=localhost
>> "%ENV_EXAMPLE%" ECHO PGPORT=5432
>> "%ENV_EXAMPLE%" ECHO PGDATABASE=controlshub
>> "%ENV_EXAMPLE%" ECHO PGUSER=postgres
>> "%ENV_EXAMPLE%" ECHO PGPASSWORD=SUA_SENHA
>> "%ENV_EXAMPLE%" ECHO.
>> "%ENV_EXAMPLE%" ECHO NODE_ENV=production
>> "%ENV_EXAMPLE%" ECHO PORT=3001
CALL :LOG ".env.example criado/atualizado na raiz."
EXIT /B 0

:CARREGAR_ENV
FOR /F "usebackq tokens=1,* delims==" %%A IN ("%ENV_RAIZ%") DO (
  SET "K=%%A"
  SET "V=%%B"
  IF NOT "!K:~0,1!"=="#" (
    IF /I "!K!"=="DATABASE_URL" SET "DATABASE_URL=!V!"
    IF /I "!K!"=="PGHOST" SET "PGHOST=!V!"
    IF /I "!K!"=="PGPORT" SET "PGPORT=!V!"
    IF /I "!K!"=="PGDATABASE" SET "PGDATABASE=!V!"
    IF /I "!K!"=="PGUSER" SET "PGUSER=!V!"
    IF /I "!K!"=="PGPASSWORD" SET "PGPASSWORD=!V!"
    IF /I "!K!"=="DB_HOST" SET "PGHOST=!V!"
    IF /I "!K!"=="DB_PORT" SET "PGPORT=!V!"
    IF /I "!K!"=="DB_NAME" SET "PGDATABASE=!V!"
    IF /I "!K!"=="DB_USER" SET "PGUSER=!V!"
    IF /I "!K!"=="DB_PASSWORD" SET "PGPASSWORD=!V!"
  )
)
EXIT /B 0

:LOG
ECHO [%DATE% %TIME%] %~1
ECHO [%DATE% %TIME%] %~1 >> "%LOG_FILE%"
EXIT /B 0

:REINICIAR_SERVICOS
CALL :LOG "Reiniciando servicos frontend/backend..."

TASKKILL /F /IM node.exe >NUL 2>&1

IF EXIST "%BASE_DIR%\apps\backend\package.json" (
  START "Control S Hub Backend" /D "%BASE_DIR%\apps\backend" CMD /C "npm run dev"
)

IF EXIST "%BASE_DIR%\apps\frontend\package.json" (
  START "Control S Hub Frontend" /D "%BASE_DIR%\apps\frontend" CMD /C "npm run dev"
)

EXIT /B 0