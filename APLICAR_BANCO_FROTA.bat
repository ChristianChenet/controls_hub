@echo off
setlocal
cd /d "%~dp0"

REM Aplica somente o banco do Modulo Frota.
REM Nao executa migrations antigas da Cotacao de Frete, PIM, BI ou demais modulos.

set "SENHA=%~1"
if "%SENHA%"=="" set "SENHA=CONTROLS"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\atualizar-banco-frota.ps1" -Banco "CONTROLSHUB" -Usuario "postgres" -Senha "%SENHA%"

if errorlevel 1 (
  echo.
  echo ERRO ao atualizar banco do Modulo Frota.
  exit /b 1
)

echo.
echo Banco do Modulo Frota atualizado com sucesso.
exit /b 0
