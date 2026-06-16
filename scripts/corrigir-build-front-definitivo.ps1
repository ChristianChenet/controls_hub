param(
  [string]$BaseDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

Write-Host "Corrigindo App.tsx do frontend..." -ForegroundColor Green

$appPath = Join-Path $BaseDir "apps\frontend\src\App.tsx"

if (-not (Test-Path $appPath)) {
  throw "App.tsx nao encontrado em: $appPath"
}

$backup = "$appPath.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $appPath $backup -Force
Write-Host "Backup criado: $backup" -ForegroundColor Yellow

$texto = Get-Content -LiteralPath $appPath -Raw -Encoding UTF8

# ============================================================
# 1. Corrigir callbacks sem tipo:
#    error TS7006: Parameter 'item' implicitly has an 'any' type.
# ============================================================

$texto = [regex]::Replace($texto, '\.map\(\(item\)\s*=>', '.map((item: any) =>')
$texto = [regex]::Replace($texto, '\.filter\(\(item\)\s*=>', '.filter((item: any) =>')
$texto = [regex]::Replace($texto, '\.find\(\(item\)\s*=>', '.find((item: any) =>')
$texto = [regex]::Replace($texto, '\.some\(\(item\)\s*=>', '.some((item: any) =>')
$texto = [regex]::Replace($texto, '\.every\(\(item\)\s*=>', '.every((item: any) =>')

# Evita duplicidade caso rode mais de uma vez
$texto = $texto.Replace('(item: any: any)', '(item: any)')
$texto = $texto.Replace('(item: RegistroGenerico: any)', '(item: RegistroGenerico)')
$texto = $texto.Replace('(item: any: RegistroGenerico)', '(item: any)')

# ============================================================
# 2. Corrigir resposta.mensagem:
#    error TS2339: Property 'mensagem' does not exist on type 'string | number | boolean'.
# ============================================================

$texto = $texto.Replace('resposta.mensagem', 'String((resposta as any).mensagem ?? ''Operação concluída.'')')

# Evita duplicidade caso rode mais de uma vez
$texto = $texto.Replace('String((String((resposta as any).mensagem ?? ''Operação concluída.'' ) as any).mensagem ?? ''Operação concluída.'')', 'String((resposta as any).mensagem ?? ''Operação concluída.'')')

# ============================================================
# 3. Garantir que chave composta da cotação não seja forçada para number.
# ============================================================

$texto = $texto.Replace('Number(card.cotacao_id)', 'String(card.cotacao_id)')
$texto = $texto.Replace('Number(linha.id)', 'String(linha.id)')
$texto = $texto.Replace('Number(cotacaoId)', 'String(cotacaoId)')

# ============================================================
# 4. Estados de cotação não podem ser apenas number.
# ============================================================

$texto = $texto.Replace('useState<number | null>(null)', 'useState<string | number | null>(null)')

# ============================================================
# 5. Garantir retorno de mensagem tipado quando estiver em setMensagem.
# ============================================================

$texto = $texto.Replace('setMensagem(String((resposta as any).mensagem ?? ''Operação concluída.''));', 'setMensagem(String((resposta as any).mensagem ?? ''Operação concluída.''));')

Set-Content -LiteralPath $appPath -Value $texto -Encoding UTF8

Write-Host "App.tsx corrigido com sucesso." -ForegroundColor Green
Write-Host "Agora execute: INSTALAR_OU_ATUALIZAR.bat" -ForegroundColor Cyan
