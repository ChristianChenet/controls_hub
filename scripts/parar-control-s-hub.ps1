param(
  [int]$Porta = 3334,
  [string]$NomeTarefa = "ControlSHub",
  [string]$DiretorioProjeto = ""
)

$ErrorActionPreference = "SilentlyContinue"

function Escrever($Mensagem, $Cor = "White") {
  Write-Host $Mensagem -ForegroundColor $Cor
}

Escrever "============================================================" "Green"
Escrever " CONTROL S HUB - PARAR BACKEND / PORTA" "Green"
Escrever "============================================================" "Green"
Escrever ""
Escrever "Porta alvo: $Porta" "Cyan"

if ([string]::IsNullOrWhiteSpace($DiretorioProjeto)) {
  $DiretorioProjeto = Split-Path -Parent $PSScriptRoot
}

Escrever "Diretorio base: $DiretorioProjeto" "Cyan"
Escrever ""

Escrever "Finalizando tarefa agendada, se existir: $NomeTarefa" "Yellow"
schtasks.exe /End /TN $NomeTarefa | Out-Null

Escrever "Procurando processos escutando na porta $Porta..." "Yellow"
$conexoes = Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue

if (-not $conexoes) {
  Escrever "Nenhum processo escutando diretamente na porta $Porta." "DarkGray"
}

foreach ($conexao in $conexoes) {
  if ($conexao.OwningProcess) {
    $pidAlvo = $conexao.OwningProcess
    $proc = Get-Process -Id $pidAlvo -ErrorAction SilentlyContinue
    if ($proc) {
      Escrever "Encerrando processo da porta ${Porta}: PID $pidAlvo - $($proc.ProcessName)" "Yellow"
      Stop-Process -Id $pidAlvo -Force -ErrorAction SilentlyContinue
    }
  }
}

Escrever "Procurando supervisores/terminais relacionados ao Control S Hub..." "Yellow"

$padraoDiretorio = $DiretorioProjeto.Replace("\", "\\")
$processosRelacionados = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and (
    $_.CommandLine -like '*start-backend-producao.cmd*' -or
    $_.CommandLine -like '*start.cmd*' -or
    $_.CommandLine -like '*npm run dev*' -or
    $_.CommandLine -like '*npm run start*' -or
    $_.CommandLine -like '*node*apps*backend*' -or
    $_.CommandLine -like "*$DiretorioProjeto*" -or
    $_.CommandLine -like "*$padraoDiretorio*"
  )
}

foreach ($processo in $processosRelacionados) {
  if ($processo.ProcessId -ne $PID) {
    Escrever "Encerrando processo relacionado: PID $($processo.ProcessId)" "Yellow"
    Escrever "  $($processo.CommandLine)" "DarkGray"
    Stop-Process -Id $processo.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Seconds 2

$aindaAtivo = Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue
if ($aindaAtivo) {
  Escrever ""
  Escrever "A porta $Porta ainda aparece em uso." "Red"
  foreach ($conexao in $aindaAtivo) {
    $pidAlvo = $conexao.OwningProcess
    $proc = Get-Process -Id $pidAlvo -ErrorAction SilentlyContinue
    Escrever "PID $pidAlvo - $($proc.ProcessName)" "Red"
  }
  Escrever "Verifique manualmente no Gerenciador de Tarefas." "Yellow"
  exit 1
}

Escrever ""
Escrever "Control S Hub parado nesta maquina. Porta $Porta liberada." "Green"
exit 0
