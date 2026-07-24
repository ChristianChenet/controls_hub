# CONTROL S HUB - Atualizacao Servidor - Modulo Frota

Padrao igual ao usado na Cotacao de Frete: aplicar ZIP primeiro e executar banco manualmente depois.

## 1. Arquivos que devem ir para o servidor

Copiar para `C:\Control S Hub`:

- `ControlSHub_atualizacao.zip`
- `APLICAR_ZIP_ATUALIZACAO_SERVIDOR.bat`
- `ATUALIZAR_SERVIDOR_SEM_PERDER_DADOS.bat`
- `COMANDOS_BANCO_FROTA.sql`
- `COMANDOS_BANCO_FROTA.md`

## 2. Aplicar o ZIP

No servidor:

```bat
cd /d "C:\Control S Hub"
APLICAR_ZIP_ATUALIZACAO_SERVIDOR.bat
```

Quando perguntar sobre banco, responda:

```text
N
```

Assim o aplicador atualiza os arquivos e nao roda migrations gerais antigas.

## 3. Executar banco manualmente

PostgreSQL 18:

```bat
cd /d "C:\Control S Hub"
set PGPASSWORD=CONTROLS
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d CONTROLSHUB -v ON_ERROR_STOP=1 -f "COMANDOS_BANCO_FROTA.sql"
set PGPASSWORD=
```

PostgreSQL 17:

```bat
cd /d "C:\Control S Hub"
set PGPASSWORD=CONTROLS
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d CONTROLSHUB -v ON_ERROR_STOP=1 -f "COMANDOS_BANCO_FROTA.sql"
set PGPASSWORD=
```

PostgreSQL 16:

```bat
cd /d "C:\Control S Hub"
set PGPASSWORD=CONTROLS
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d CONTROLSHUB -v ON_ERROR_STOP=1 -f "COMANDOS_BANCO_FROTA.sql"
set PGPASSWORD=
```

Se a senha nao for `CONTROLS`, altere somente:

```bat
set PGPASSWORD=SUA_SENHA_POSTGRES
```

## 4. Conferir depois de executar

```sql
SELECT TO_REGCLASS('public.frota_departamentos') AS frota_departamentos;
SELECT TO_REGCLASS('public.frota_motoristas') AS frota_motoristas;
SELECT TO_REGCLASS('public.frota_veiculos') AS frota_veiculos;
SELECT TO_REGCLASS('public.frota_fornecedores') AS frota_fornecedores;
SELECT TO_REGCLASS('public.frota_despesas') AS frota_despesas;
SELECT TO_REGCLASS('public.frota_historicos') AS frota_historicos;

SELECT codigo, nome
FROM modulos
WHERE codigo = 'FROTA';

SELECT codigo, nome
FROM acoes
WHERE codigo LIKE 'FROTA_%'
ORDER BY codigo;

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('frota_fornecedores', 'frota_departamentos', 'frota_veiculos', 'frota_despesas')
  AND column_name IN (
    'natureza_credito_decis',
    'grupo_custo_decis',
    'conf_custo_decis',
    'filial_decis',
    'codigo_decis',
    'valor_unitario_liquido',
    'data_despesa',
    'data_vencimento'
  )
ORDER BY table_name, column_name;
```

## 5. Reiniciar sistema

```bat
cd /d "C:\Control S Hub"
REINICIAR_SISTEMA.bat
```
