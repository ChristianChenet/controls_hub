@echo off
cd /d "%~dp0"
start "CONTROL S HUB Backend" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\iniciar-backend.ps1"
start "CONTROL S HUB Frontend" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\iniciar-frontend.ps1"
echo CONTROL S HUB iniciado.
echo Frontend: http://127.0.0.1:5174
echo Backend:  http://127.0.0.1:3334
pause
