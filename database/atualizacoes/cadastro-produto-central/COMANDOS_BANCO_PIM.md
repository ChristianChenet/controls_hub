# CONTROL S HUB - Comandos de Banco - Cadastro de Produto Central

Este arquivo separa os comandos de banco do atualizador da aplicacao.

## 1. Regra de seguranca

Executar somente os SQLs abaixo para atualizar o modulo Cadastro de Produto Central.

Nao executar os batches da Cotacao de Frete:

- `database/batches/ATUALIZAR_011_DOCUMENTOS_FISCAIS_NFE_CTE.sql`
- `database/batches/ATUALIZAR_012_CHAVE_OPERACIONAL_COTACAO_FRETE.sql`
- `database/batches/ATUALIZAR_013_REMOVER_ID_CHAVE_COMPOSTA_COTACAO_FRETE.sql`

## 2. Comando recomendado no servidor

Use o `.bat` da raiz, no mesmo padrao operacional dos aplicadores de ZIP:

```bat
APLICAR_BANCO_CADASTRO_PRODUTO_CENTRAL.bat
```

Se a senha local do PostgreSQL for diferente de `CONTROLS`, informe a senha como primeiro parametro:

```bat
APLICAR_BANCO_CADASTRO_PRODUTO_CENTRAL.bat controls
```

## 3. Comando PowerShell direto

```powershell
.\scripts\windows\atualizar-banco-cadastro-produto-central.ps1 -Banco CONTROLSHUB -Usuario postgres -Senha CONTROLS
```

## 4. SQLs aplicados pelo atualizador

```text
database/migrations/012_cadastro_produto_central.sql
database/migrations/013_evolucao_pim_identidade_visual.sql
database/migrations/014_consolidacao_pim_permissoes.sql
database/migrations/015_padronizar_pim_banco_portugues.sql
```

## 5. Comandos manuais equivalentes

```powershell
$env:PGPASSWORD = "CONTROLS"
$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

& $PSQL -h 127.0.0.1 -p 5432 -U postgres -d controlshub -v ON_ERROR_STOP=1 -f "database\migrations\012_cadastro_produto_central.sql"
& $PSQL -h 127.0.0.1 -p 5432 -U postgres -d controlshub -v ON_ERROR_STOP=1 -f "database\migrations\013_evolucao_pim_identidade_visual.sql"
& $PSQL -h 127.0.0.1 -p 5432 -U postgres -d controlshub -v ON_ERROR_STOP=1 -f "database\migrations\014_consolidacao_pim_permissoes.sql"
& $PSQL -h 127.0.0.1 -p 5432 -U postgres -d controlshub -v ON_ERROR_STOP=1 -f "database\migrations\015_padronizar_pim_banco_portugues.sql"

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
```

## 6. Validacao rapida

```sql
SELECT TO_REGCLASS('public.produtos') AS produtos;
SELECT TO_REGCLASS('public.produtos_skus') AS produtos_skus;
SELECT TO_REGCLASS('public.atributos') AS atributos;
SELECT TO_REGCLASS('public.canais') AS canais;
SELECT TO_REGCLASS('public.ativos_digitais') AS ativos_digitais;
```
