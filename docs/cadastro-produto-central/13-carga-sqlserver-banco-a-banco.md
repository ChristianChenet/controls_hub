# Carga SQL Server banco a banco

## Objetivo

Permitir que o modulo Cadastro de Produto Central carregue dados da base oficial SQL Server para o PIM interno do Control S HUB, com operacao manual, validacao previa e De/Para por tipo de carga.

O fluxo nao usa a API como fonte de carga. O Swagger do Control S API Hub foi usado apenas como referencia dos dominios existentes.

## Fluxo

1. Usuario cadastra uma conexao SQL Server.
2. Usuario testa a conexao.
3. Usuario escolhe o destino da carga.
4. Usuario informa uma consulta SQL somente leitura.
5. Sistema executa a consulta e mostra previa.
6. Sistema sugere o De/Para das colunas.
7. Usuario ajusta e valida o De/Para.
8. Usuario executa a carga como validacao, criacao ou atualizacao.
9. Sistema registra historico, logs e resultado da carga.

## Destinos de carga

### Composicao do conjunto

Usado para vincular itens/componentes ao conjunto.

Campos internos principais:

- conjunto_codigo
- item_codigo
- quantidade
- status
- ultima_alteracao

### Atributos tecnicos do conjunto

Usado para alimentar atributos especificos do conjunto.

Campos internos principais:

- conjunto_codigo
- atributo_codigo
- atributo_nome
- grupo_nome
- tipo_campo
- escopo
- unidade_medida
- valor_texto
- valor_numero
- valor_booleano
- ordem
- obrigatorio

### Composicao e atributos dos itens

Usado para alimentar materia-prima/componentes e suas caracteristicas.

Campos internos principais:

- conjunto_codigo
- item_codigo
- item_nome
- tipo_relacao
- quantidade
- ordem
- obrigatorio
- atributo_codigo
- atributo_nome
- grupo_nome
- tipo_campo
- escopo
- unidade_medida
- valor_texto
- valor_numero
- valor_booleano

### Outros destinos preparados

- Produto Mestre
- SKUs
- Composicao generica
- Atributos por Marketplace

## Seguranca da consulta

O backend aceita somente SQL de leitura começando com `SELECT` ou `WITH`.

Comandos bloqueados:

- INSERT
- UPDATE
- DELETE
- DROP
- ALTER
- TRUNCATE
- MERGE
- EXEC / EXECUTE
- CREATE
- GRANT
- REVOKE

## Tabelas criadas

Migration:

`database/migrations/027_pim_sqlserver_carga_manual.sql`

Tabelas:

- pim_conexoes_sqlserver
- pim_cargas_sqlserver

## Backend

Endpoints:

- `GET /api/cadastro-produto-central/sqlserver/conexoes`
- `POST /api/cadastro-produto-central/sqlserver/conexoes`
- `POST /api/cadastro-produto-central/sqlserver/conexoes/:id/testar`
- `POST /api/cadastro-produto-central/sqlserver/consultar`
- `POST /api/cadastro-produto-central/sqlserver/cargas`
- `GET /api/cadastro-produto-central/sqlserver/cargas`

Servico principal:

`apps/backend/src/modulos/cadastro_produto_central/repositorioCadastroProdutoCentral.ts`

## Frontend

Tela:

`Cadastro de Produto Central > Importacao`

Componente:

`CargaSqlServerPim`

Arquivo:

`apps/frontend/src/modulos/cadastro_produto_central/Pim.tsx`

## Atualizacao do banco

Executar:

```bat
APLICAR_BANCO_CADASTRO_PRODUTO_CENTRAL.bat
```

Esse script aplica as migrations do PIM, incluindo a `027_pim_sqlserver_carga_manual.sql`.

## Observacoes

- A carga e manual e controlada.
- A base SQL Server e tratada como origem oficial.
- Produto publicado nao deve ser sobrescrito diretamente sem passar pelo fluxo de validacao do PIM.
- O modo `APENAS_VALIDAR` deve ser usado antes de qualquer carga real.
- O modulo Cotacao de Frete nao e alterado por essa estrutura.
