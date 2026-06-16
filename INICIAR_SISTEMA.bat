@ECHO OFF
SETLOCAL ENABLEEXTENSIONS
SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"
IF NOT EXIST "%BASE_DIR%\logs" MKDIR "%BASE_DIR%\logs"
START "Control S Hub Backend" /D "%BASE_DIR%\apps\backend" /MIN CMD /C "npm run dev 1^>^"%BASE_DIR%\logs\backend-dev.log^" 2^>^"%BASE_DIR%\logs\backend-dev.err.log^""
START "Control S Hub Frontend" /D "%BASE_DIR%\apps\frontend" /MIN CMD /C "npm run dev -- --host 0.0.0.0 --port 5174 1^>^"%BASE_DIR%\logs\frontend-dev.log^" 2^>^"%BASE_DIR%\logs\frontend-dev.err.log^""
ECHO Backend: http://127.0.0.1:3000
ECHO Frontend: http://127.0.0.1:5174
