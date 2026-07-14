# Comandos de Banco e Atualizacao - Business Intelligence

Use estes comandos no servidor depois de copiar/extrair o pacote do Control S Hub.

## 1. Atualizador completo do modulo

Este comando gera build do backend/frontend e aplica somente a migration do Business Intelligence.

Prompt de comando:

```bat
cd /d "C:\Control S Hub"
set BANCO_URL=postgres://postgres:controls@localhost:5432/controlshub
ATUALIZAR_BUSINESS_INTELLIGENCE_SERVIDOR.bat
```

PowerShell:

```powershell
cd "C:\Control S Hub"
$env:BANCO_URL="postgres://postgres:controls@localhost:5432/controlshub"
.\ATUALIZAR_BUSINESS_INTELLIGENCE_SERVIDOR.bat
```

## 2. Aplicar somente os campos/tabelas do banco

Use quando os arquivos ja estiverem atualizados e voce quiser aplicar apenas o banco.

Prompt de comando:

```bat
cd /d "C:\Control S Hub"
set BANCO_URL=postgres://postgres:controls@localhost:5432/controlshub
database\scripts\APLICAR_BANCO_BUSINESS_INTELLIGENCE.bat
```

PowerShell:

```powershell
cd "C:\Control S Hub"
$env:BANCO_URL="postgres://postgres:controls@localhost:5432/controlshub"
node database\scripts\aplicar-business-intelligence.js
```

## 3. Opcao direta com psql

Use se o servidor tiver `psql` no PATH.

```bat
cd /d "C:\Control S Hub"
psql "postgres://postgres:controls@localhost:5432/controlshub" -v ON_ERROR_STOP=1 -f database\migrations\029_business_intelligence.sql
```

## O que a migration 029 cria/atualiza

- Tabelas do Business Intelligence:
  - bi_dashboards
  - bi_dashboard_paginas
  - bi_dashboard_widgets
  - bi_fontes_dados
  - bi_consultas
  - bi_filtros
  - bi_dashboard_permissoes
  - bi_widget_parametros
  - bi_widget_cache
  - bi_execucoes
  - bi_logs_atualizacao
  - bi_templates
  - bi_temas
  - bi_playlists_tv
- Colunas auxiliares de cache, consulta, fonte de dados e logs.
- Modulo Business Intelligence no cadastro de modulos.
- Permissoes do modulo para administradores.
- Fonte padrao PostgreSQL Control S Hub.
- Integracao com conexoes SQL Server ja cadastradas no Cadastro Central.
- Dashboard exemplo Acompanhamento Logistico.
- Consultas SQL simuladas para teste.
- Widgets KPI e tabelas com Top X.
- Dados ficticios para testar o layout antes da conexao real.
- Logo transparente da Monvizo, quando a empresa for Monvizo.
- Prompt IA para gerar JSON importavel pela Salvia IA da Control S Hub.
