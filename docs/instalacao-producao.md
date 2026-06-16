# Control S Hub - Instalação em Produção

## Requisitos

- Windows Server ou Windows 10/11.
- PostgreSQL 18 instalado.
- Node.js LTS instalado.
- Porta do backend: `3334`.
- Porta do frontend: `4174`.

## Instalação rápida

Execute no PowerShell dentro da pasta do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\INSTALAR_OU_ATUALIZAR.ps1 -Banco CONTROLSHUB -UsuarioBanco postgres -SenhaBanco controls -PrepararProducao
```

Esse comando:

- instala dependências;
- aplica migrations;
- prepara a base limpa de produção;
- mantém somente a empresa `MONVIZO`;
- mantém o usuário `christian@controlsconsultoria.com.br`;
- mantém etapas do Kanban;
- gera o build.

## Iniciar produção

Execute:

```bat
INICIAR_PRODUCAO_CONTROL_S_HUB.cmd
```

URLs:

- Frontend: `http://127.0.0.1:4174`
- Backend: `http://127.0.0.1:3334`

## Login inicial

- Usuário: `christian@controlsconsultoria.com.br`
- Senha: `controls`

## Banco limpo pronto

O arquivo `dist-instalador/controlshub_producao_limpo.sql` contém o dump da base já limpa.

Para restaurar manualmente:

```powershell
$env:PGPASSWORD='controls'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h 127.0.0.1 -U postgres -d postgres -c "DROP DATABASE IF EXISTS controlshub;"
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE controlshub;"
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h 127.0.0.1 -U postgres -d controlshub -f .\dist-instalador\controlshub_producao_limpo.sql
Remove-Item Env:\PGPASSWORD
```
