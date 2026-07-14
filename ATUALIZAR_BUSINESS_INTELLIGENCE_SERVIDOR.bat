@echo off
setlocal EnableExtensions

REM Atualizador especifico do modulo Business Intelligence.
REM Nao apaga dados. Gera build do Control S Hub e aplica somente a migration 029 do BI.

set "RAIZ=%~dp0"
set "DATA_LOG=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%"
set "HORA_LOG=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "HORA_LOG=%HORA_LOG: =0%"
set "LOG=%RAIZ%logs\atualizacao_business_intelligence_%DATA_LOG%_%HORA_LOG%.log"

if not exist "%RAIZ%logs" mkdir "%RAIZ%logs"

echo ==================================================
echo Control S Hub - Atualizador Business Intelligence
echo ==================================================
echo Pasta: %RAIZ%
echo Log: %LOG%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado no PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: npm nao encontrado no PATH.
  exit /b 1
)

if "%BANCO_URL%"=="" if "%DATABASE_URL%"=="" (
  echo ERRO: defina BANCO_URL ou DATABASE_URL apontando para o PostgreSQL do Control S Hub.
  echo Exemplo:
  echo set BANCO_URL=postgres://postgres:controls@localhost:5432/controlshub
  exit /b 1
)

pushd "%RAIZ%"

echo Instalando dependencias da raiz...
call npm install >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

echo Gerando build do backend...
pushd "%RAIZ%apps\backend"
call npm install >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
popd

echo Gerando build do frontend...
pushd "%RAIZ%apps\frontend"
call npm install >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 goto :falha_popd
popd

echo Aplicando banco do Business Intelligence...
call node database\scripts\aplicar-business-intelligence.js >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

echo.
echo Atualizacao do Business Intelligence concluida com sucesso.
echo Reinicie o Control S Hub para carregar os novos arquivos.
popd
exit /b 0

:falha_popd
popd

:falha
echo.
echo FALHA NA ATUALIZACAO. Consulte o log:
echo %LOG%
popd
exit /b 1
