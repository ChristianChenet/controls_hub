@echo off
setlocal EnableExtensions

REM Instala somente o driver SQL Server usado pelo modulo Cadastro de Produto Central.
REM Nao altera banco de dados e nao mexe no modulo Cotacao de Frete.

set "RAIZ=%~dp0"
set "DATA_LOG=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%"
set "HORA_LOG=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "HORA_LOG=%HORA_LOG: =0%"
set "LOG=%RAIZ%logs\instalar_driver_sqlserver_pim_%DATA_LOG%_%HORA_LOG%.log"

if not exist "%RAIZ%logs" mkdir "%RAIZ%logs"

echo ==================================================
echo Control S Hub - Driver SQL Server do PIM
echo ==================================================
echo Pasta: %RAIZ%
echo Log: %LOG%
echo.

>> "%LOG%" echo ==================================================
>> "%LOG%" echo Control S Hub - Driver SQL Server do PIM
>> "%LOG%" echo ==================================================
>> "%LOG%" echo Pasta: %RAIZ%

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: node nao encontrado no PATH.
  >> "%LOG%" echo ERRO: node nao encontrado no PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: npm nao encontrado no PATH.
  >> "%LOG%" echo ERRO: npm nao encontrado no PATH.
  exit /b 1
)

pushd "%RAIZ%apps\backend"
echo Instalando mssql@12.7.0 no backend...
call npm install mssql@12.7.0 >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

echo Validando carregamento do driver...
call node -e "import('mssql').then(()=>{console.log('mssql ok');process.exit(0)}).catch((e)=>{console.error(e);process.exit(1)})" >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

echo Recompilando backend...
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 goto :falha
popd

echo.
echo Driver SQL Server instalado e validado com sucesso.
echo Reinicie o Control S Hub para o backend carregar a dependencia.
exit /b 0

:falha
popd
echo.
echo FALHA ao instalar driver SQL Server. Consulte o log: %LOG%
exit /b 1
