# Ajuste 013 — Chave composta definitiva em Cotação de Frete

Este ajuste remove a dependência de `ID` e `COTACAO_FRETE_ID` das tabelas operacionais de cotação de frete.

## Chave oficial

Todas as tabelas relacionadas passam a usar:

- `EMPRESA_ID`
- `TIPO_DOCUMENTO`
- `NUMERO_DOCUMENTO`
- `CODIGO_CHAVE`

## Batch

Arquivo:

```text
database/batches/ATUALIZAR_013_REMOVER_ID_CHAVE_COMPOSTA_COTACAO_FRETE.sql
```

O `INSTALAR_OU_ATUALIZAR` executa automaticamente os `.sql` da pasta `database/batches`.

## Tabelas recriadas sem ID técnico de cotação

- `COTACOES_FRETE`
- `COTACOES_FRETE_ITENS`
- `COTACOES_FRETE_TRANSPORTADORAS`
- `COTACOES_FRETE_TOKENS`
- `COTACOES_FRETE_HISTORICOS`
- `COTACOES_FRETE_TIMELINE`
- `COTACOES_FRETE_ENVIOS`
- `COTACOES_FRETE_ENVIOS_ITENS`
- `COTACOES_FRETE_ENVIOS_FORNECEDORES`
- `COTACOES_FRETE_NOTAS_FISCAIS`
- `COTACOES_FRETE_CTES`

## Campos removidos

- `ID` em `COTACOES_FRETE`
- `COTACAO_FRETE_ID` nas tabelas filhas
- `ID` técnico das tabelas filhas operacionais de cotação
- `TOKEN_ID` em fornecedor de envio, substituído por `TOKEN_HASH`
- `ENVIO_ID`, substituído por `NUMERO_ENVIO`
- `COTACAO_FRETE_ITEM_ID`, substituído por `ITEM_SEQUENCIA`

## Novos identificadores operacionais internos

Para tabelas que precisam diferenciar múltiplos registros da mesma cotação:

- Itens: `ITEM_SEQUENCIA`
- Envios: `NUMERO_ENVIO`
- Histórico: `HISTORICO_SEQUENCIA`
- Timeline: `TIMELINE_SEQUENCIA`

Esses campos não substituem a chave da cotação. Eles apenas identificam múltiplas linhas dentro da mesma chave operacional.

## Integração Banco x Banco

A integração deve usar sempre a chave composta:

```sql
EMPRESA_ID,
TIPO_DOCUMENTO,
NUMERO_DOCUMENTO,
CODIGO_CHAVE
```

Para carga incremental, priorizar:

- `COTACOES_FRETE.ALTERADO_EM`
- `COTACOES_FRETE_NOTAS_FISCAIS.ALTERADO_EM`
- `COTACOES_FRETE_CTES.ALTERADO_EM`
