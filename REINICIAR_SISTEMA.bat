@echo off
setlocal EnableExtensions

set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

echo ============================================================
echo CONTROL S HUB - REINICIAR SISTEMA
echo ============================================================
echo Encerrando portas do HUB...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$portas = @(3334, 5174);" ^
  "foreach ($porta in $portas) {" ^
  "  Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue | ForEach-Object {" ^
  "    if ($_.OwningProcess) {" ^
  "      Write-Host ('Encerrando porta ' + $porta + ' PID ' + $_.OwningProcess);" ^
  "      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue;" ^
  "    }" ^
  "  }" ^
  "}" ^
  "Start-Sleep -Seconds 2;"

echo Subindo Control S Hub...
call "%BASE_DIR%\INICIAR_SISTEMA.bat"

echo.
echo Sistema reiniciado.
exit /b 0
