@echo off
setlocal EnableExtensions

REM Instala as dependencias usadas pela importacao de planilhas e PDF do Modulo Frota.
REM Execute no servidor quando o Vite acusar falta de pdfjs-dist, tesseract.js ou xlsx.

cd /d "%~dp0"

echo Instalando dependencias do Modulo Frota...
call npm install
if errorlevel 1 exit /b 1

call npm --workspace apps/frontend install pdfjs-dist@6.1.200 tesseract.js@7.0.0 xlsx@0.18.5
if errorlevel 1 exit /b 1

echo Dependencias do Modulo Frota instaladas.
echo Reinicie o sistema para o Vite carregar os novos pacotes.
exit /b 0
