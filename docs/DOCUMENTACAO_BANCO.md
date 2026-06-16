# Control S Hub - Documentacao do Banco

## Banco

- PostgreSQL
- Banco local: `controlshub`
- Usuario validado: `postgres`
- Senha validada: `controls`

## Regra central da cotacao

A chave operacional oficial da cotacao e composta por:

1. `empresa_id`
2. `tipo_documento`
3. `numero_documento`
4. `codigo_chave`

Todas as tabelas operacionais de cotacao usam essa chave em joins.

Exemplo:

```sql
SELECT *
FROM cotacoes_frete c
JOIN cotacoes_frete_transportadoras t
  ON t.empresa_id = c.empresa_id
 AND t.tipo_documento = c.tipo_documento
 AND t.numero_documento = c.numero_documento
 AND t.codigo_chave = c.codigo_chave;
```

## NF-e e CT-e

NF-e e CT-e ficam em tabelas separadas 1:N:

- `cotacoes_frete_notas_fiscais`
- `cotacoes_frete_ctes`

Consultas principais usam `LEFT JOIN LATERAL`, mantendo cotacoes visiveis mesmo sem nota ou CT-e.

## Tabelas principais

- `cotacoes_frete`: cabecalho operacional da cotacao.
- `cotacoes_frete_itens`: itens/produtos da cotacao.
- `cotacoes_frete_transportadoras`: valores automaticos, externos e manuais por transportadora.
- `cotacoes_frete_tokens`: tokens publicos de resposta por transportadora.
- `cotacoes_frete_envios`: lotes de envio por chave composta e `numero_envio`.
- `cotacoes_frete_envios_fornecedores`: envio por transportadora.
- `cotacoes_frete_envios_itens`: itens enviados em cotacao parcial.
- `cotacoes_frete_historicos`: trilha tecnica.
- `cotacoes_frete_timeline`: timeline operacional.
- `cotacoes_frete_notas_fiscais`: NF-e vinculadas.
- `cotacoes_frete_ctes`: CT-e vinculados.
- `etapas_kanban`: etapas por empresa.
- `transportadoras`: cadastro e regras de exibicao.
- `empresas`, `usuarios`, `perfis`, `perfis_permissoes`, `telas`, `modulos`.

## Query de NF-e

```sql
LEFT JOIN LATERAL (
  SELECT
    STRING_AGG(nf.numero_nfe::TEXT, ', ') AS numeros_nfe,
    COUNT(*) AS total_nfes,
    SUM(COALESCE(nf.valorfrete_nfe, 0)) AS valor_frete_nfe_total
  FROM cotacoes_frete_notas_fiscais nf
  WHERE nf.empresa_id = c.empresa_id
    AND nf.tipo_documento = c.tipo_documento
    AND nf.numero_documento = c.numero_documento
    AND nf.codigo_chave = c.codigo_chave
) nfes ON TRUE
```

## Query de CT-e

```sql
LEFT JOIN LATERAL (
  SELECT
    STRING_AGG(ct.numero_cte::TEXT, ', ') AS numeros_cte,
    COUNT(*) AS total_ctes,
    SUM(COALESCE(ct.valorfrete_cte, 0)) AS valor_frete_cte_total,
    MAX(ct.data_cte) AS ultimo_cte_em
  FROM cotacoes_frete_ctes ct
  WHERE ct.empresa_id = c.empresa_id
    AND ct.tipo_documento = c.tipo_documento
    AND ct.numero_documento = c.numero_documento
    AND ct.codigo_chave = c.codigo_chave
) ctes ON TRUE
```

