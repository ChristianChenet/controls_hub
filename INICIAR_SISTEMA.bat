@ECHO OFF
SETLOCAL ENABLEEXTENSIONS
SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"
IF NOT EXIST "%BASE_DIR%\logs" MKDIR "%BASE_DIR%\logs"
SET "BANCO_URL=postgres://postgres:controls@localhost:5432/controlshub"
SET "PORTA_API=3334"
SET "SEGREDO_JWT=CONTROL_S_HUB_DESENVOLVIMENTO"
START "Control S Hub Backend" /D "%BASE_DIR%" /MIN CMD /C "SET BANCO_URL=%BANCO_URL%&& SET PORTA_API=%PORTA_API%&& SET SEGREDO_JWT=%SEGREDO_JWT%&& npm run dev:backend 1^>^"%BASE_DIR%\logs\backend-dev.log^" 2^>^"%BASE_DIR%\logs\backend-dev.err.log^""
START "Control S Hub Frontend" /D "%BASE_DIR%\apps\frontend" /MIN CMD /C "npm run dev -- --host 0.0.0.0 --port 5174 1^>^"%BASE_DIR%\logs\frontend-dev.log^" 2^>^"%BASE_DIR%\logs\frontend-dev.err.log^""
ECHO Backend: http://127.0.0.1:3334
ECHO Frontend: http://127.0.0.1:5174
