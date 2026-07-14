@echo off
setlocal EnableExtensions

REM Aplica somente a migration do modulo Business Intelligence.
REM Use BANCO_URL ou DATABASE_URL apontando para o PostgreSQL do Control S Hub.

set "RAIZ=%~dp0..\.."
pushd "%RAIZ%"

if "%BANCO_URL%"=="" if "%DATABASE_URL%"=="" (
  echo Defina BANCO_URL ou DATABASE_URL antes de executar.
  echo Exemplo:
  echo set BANCO_URL=postgres://postgres:controls@localhost:5432/controlshub
  popd
  exit /b 1
)

node database\scripts\aplicar-business-intelligence.js
set "CODIGO=%ERRORLEVEL%"
popd
exit /b %CODIGO%
