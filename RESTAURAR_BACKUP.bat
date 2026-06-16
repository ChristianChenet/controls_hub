@ECHO OFF
SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"
SET "LOG_DIR=%BASE_DIR%\logs"
IF NOT EXIST "%LOG_DIR%" MKDIR "%LOG_DIR%"
SET /P "BACKUP=Informe o caminho do arquivo .backup: "
IF NOT EXIST "%BACKUP%" (
  ECHO Backup nao encontrado.
  EXIT /B 1
)
ECHO Esta operacao vai recriar o banco controlshub.
SET /P "CONFIRMA=Digite RESTAURAR para confirmar: "
IF /I "%CONFIRMA%" NEQ "RESTAURAR" EXIT /B 1
SET "PGPASSWORD=controls"
CALL :LOCALIZAR_PG psql.exe PSQL
CALL :LOCALIZAR_PG pg_restore.exe PGRESTORE
IF NOT DEFINED PSQL EXIT /B 1
IF NOT DEFINED PGRESTORE EXIT /B 1
"%PSQL%" -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='controlshub' AND pid <> pg_backend_pid();" > "%LOG_DIR%\RESTAURAR_BACKUP.log" 2>&1
"%PSQL%" -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS controlshub;" >> "%LOG_DIR%\RESTAURAR_BACKUP.log" 2>&1
"%PSQL%" -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE controlshub WITH OWNER postgres ENCODING 'UTF8';" >> "%LOG_DIR%\RESTAURAR_BACKUP.log" 2>&1
"%PGRESTORE%" -h 127.0.0.1 -U postgres -d controlshub --no-owner --no-privileges "%BACKUP%" >> "%LOG_DIR%\RESTAURAR_BACKUP.log" 2>&1
IF ERRORLEVEL 1 (
  ECHO Falha na restauracao. Veja logs\RESTAURAR_BACKUP.log
  EXIT /B 1
)
ECHO Banco restaurado com sucesso.
EXIT /B 0

:LOCALIZAR_PG
FOR /F "tokens=* USEBACKQ" %%A IN (`WHERE %1 2^>NUL`) DO SET "%2=%%A"
IF DEFINED %2 EXIT /B 0
FOR /D %%D IN ("C:\Program Files\PostgreSQL\*") DO IF EXIST "%%D\bin\%1" SET "%2=%%D\bin\%1"
IF NOT DEFINED %2 ECHO %1 nao encontrado.
EXIT /B 0
