# Ajuste 012 — Chave operacional Cotação de Frete

Este pacote altera o padrão operacional das tabelas de cotação para:

- EMPRESA_ID
- TIPO_DOCUMENTO
- NUMERO_DOCUMENTO
- CODIGO_CHAVE

## Execução

Rodar normalmente:

```powershell
.\INSTALAR_OU_ATUALIZAR.ps1
```

O instalador agora chama automaticamente:

```text
database/batches/ATUALIZAR_011_DOCUMENTOS_FISCAIS_NFE_CTE.sql
database/batches/ATUALIZAR_012_CHAVE_OPERACIONAL_COTACAO_FRETE.sql
```

## O que o batch 012 faz

- Cria backup em `manutencao.backup_012_*`.
- Dropa e recria as tabelas operacionais de cotação.
- Remove a tabela `integracoes_erp`.
- Remove colunas antigas de integração/API/ERP da tabela principal.
- Mantém `ID` apenas como surrogate técnico para compatibilidade de tela/backend, mas a chave operacional do negócio passa a ser composta.
- Recria NF-e e CT-e como tabelas 1:N por chave operacional.
- Inclui `ALTERADO_EM` em NF-e e CT-e.
- Cria triggers para preencher a chave operacional nas tabelas relacionadas quando algum trecho legado ainda enviar `cotacao_frete_id`.

## Observação

A integração futura será banco x banco. Os endpoints `/api/integracoes/erp/*` foram removidos do backend.
