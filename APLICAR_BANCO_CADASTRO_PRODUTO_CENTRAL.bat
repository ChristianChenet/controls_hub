@echo off
setlocal
cd /d "%~dp0"

set "SENHA=%~1"
if "%SENHA%"=="" set "SENHA=CONTROLS"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\atualizar-banco-cadastro-produto-central.ps1" -Banco "controlshub" -Usuario "postgres" -Senha "%SENHA%"

if errorlevel 1 (
  echo.
  echo ERRO ao atualizar banco do Cadastro de Produto Central.
  exit /b 1
)

echo.
echo Banco do Cadastro de Produto Central atualizado com sucesso.
exit /b 0
