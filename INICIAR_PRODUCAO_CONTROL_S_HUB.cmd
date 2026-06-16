@echo off
cd /d "%~dp0"
start "CONTROL S HUB Backend Producao" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\iniciar-backend-producao.ps1"
start "CONTROL S HUB Frontend Producao" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\iniciar-frontend-producao.ps1"
echo Control S Hub producao iniciado.
echo Frontend: http://127.0.0.1:4174
echo Backend:  http://127.0.0.1:3334
pause
