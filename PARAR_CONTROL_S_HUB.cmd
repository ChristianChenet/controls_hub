@ECHO OFF
SETLOCAL ENABLEEXTENSIONS

REM ============================================================
REM  CONTROL S HUB - PARAR BACKEND / PORTA
REM ============================================================

CD /D "%~dp0"

IF NOT EXIST "%~dp0scripts" (
  MKDIR "%~dp0scripts"
)

IF NOT EXIST "%~dp0scripts\parar-control-s-hub.ps1" (
  ECHO [ERRO] Arquivo scripts\parar-control-s-hub.ps1 nao encontrado.
  ECHO Coloque este .cmd na raiz do Control S Hub junto com a pasta scripts.
  PAUSE
  EXIT /B 1
)

POWERSHELL.EXE -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\parar-control-s-hub.ps1" -Porta 3334 -NomeTarefa "ControlSHub" -DiretorioProjeto "%~dp0"

IF ERRORLEVEL 1 (
  ECHO.
  ECHO [ERRO] Nao foi possivel parar totalmente o Control S Hub.
  PAUSE
  EXIT /B 1
)

ECHO.
PAUSE
EXIT /B 0
