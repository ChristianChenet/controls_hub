@echo off
setlocal EnableExtensions

REM Gera um pacote ZIP do Control S Hub para envio ao servidor.
REM Exclui node_modules, logs, backups e arquivos locais sensiveis.

set "RAIZ=%~dp0"
set "DESTINO=%RAIZ%dist-atualizacao"
set "ZIP=%DESTINO%\ControlSHub_atualizacao.zip"

if not exist "%DESTINO%" mkdir "%DESTINO%"
if exist "%ZIP%" del /f /q "%ZIP%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$raiz = '%RAIZ%'.TrimEnd('\');" ^
  "$zip = '%ZIP%';" ^
  "$tmp = Join-Path $env:TEMP ('ControlSHub_zip_' + [guid]::NewGuid());" ^
  "New-Item -ItemType Directory -Path $tmp | Out-Null;" ^
  "$excluir = '\\node_modules\\|\\logs\\|\\backups\\|\\.git\\|\\dist-atualizacao\\|\\.env$|\\.bak_';" ^
  "Get-ChildItem -LiteralPath $raiz -Recurse -File | Where-Object { $_.FullName -notmatch $excluir } | ForEach-Object {" ^
  "  $rel = $_.FullName.Substring($raiz.Length).TrimStart('\');" ^
  "  $dest = Join-Path $tmp $rel;" ^
  "  New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null;" ^
  "  Copy-Item -LiteralPath $_.FullName -Destination $dest -Force;" ^
  "};" ^
  "Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $zip -Force;" ^
  "Remove-Item -LiteralPath $tmp -Recurse -Force;" ^
  "Write-Host ('Pacote gerado em: ' + $zip);"

if errorlevel 1 (
  echo Falha ao gerar ZIP.
  exit /b 1
)

echo ZIP pronto: %ZIP%
exit /b 0
