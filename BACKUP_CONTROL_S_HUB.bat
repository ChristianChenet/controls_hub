@ECHO OFF
SETLOCAL

REM ============================================================
REM CONFIGURACAO
REM ============================================================

SET "PGHOST=localhost"
SET "PGPORT=5432"
SET "PGUSER=postgres"
SET "PGDATABASE=controlshub"

REM senha
SET "PGPASSWORD=controls"

REM pasta backup
SET "BACKUP_DIR=%~dp0backups"

IF NOT EXIST "%BACKUP_DIR%" (
  MKDIR "%BACKUP_DIR%"
)

REM timestamp
FOR /F %%I IN ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') DO SET DATAHORA=%%I

SET "ARQUIVO=%BACKUP_DIR%\backup_%PGDATABASE%_%DATAHORA%.backup"

REM caminho pg_dump
SET "PG_DUMP=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"

ECHO.
ECHO ============================================================
ECHO  BACKUP POSTGRESQL
ECHO ============================================================
ECHO.

ECHO Banco:
ECHO %PGDATABASE%

ECHO.
ECHO Gerando backup...
ECHO.

"%PG_DUMP%" ^
  -h %PGHOST% ^
  -p %PGPORT% ^
  -U %PGUSER% ^
  -F c ^
  -b ^
  -v ^
  -f "%ARQUIVO%" ^
  %PGDATABASE%

IF ERRORLEVEL 1 (
  ECHO.
  ECHO ERRO AO GERAR BACKUP
  PAUSE
  EXIT /B 1
)

ECHO.
ECHO ============================================================
ECHO  BACKUP CONCLUIDO
ECHO ============================================================
ECHO.

ECHO Arquivo:
ECHO %ARQUIVO%

ECHO.
PAUSE
EXIT /B 0