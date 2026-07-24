# CONTROL S HUB - Comandos de Banco - Modulo Frota

Este roteiro aplica somente os objetos de banco do Modulo Frota no PostgreSQL `CONTROLSHUB`.

## Arquivos

- SQL completo manual: `database\scripts\COMANDOS_BANCO_FROTA.sql`
- Migration idempotente original: `database\migrations\033_modulo_frota.sql`
- Batch somente banco Frota: `APLICAR_BANCO_FROTA.bat`
- Batch completo Frota, ZIP + banco: `APLICAR_ATUALIZACAO_FROTA_SERVIDOR.bat`

## Opcao 1 - Atualizacao completa do modulo

Copie `ControlSHub_atualizacao.zip` para a pasta do sistema no servidor e execute:

```bat
cd /d "C:\Control S Hub"
APLICAR_ATUALIZACAO_FROTA_SERVIDOR.bat
```

Se a senha do usuario `postgres` nao for `CONTROLS`, informe a senha:

```bat
cd /d "C:\Control S Hub"
APLICAR_ATUALIZACAO_FROTA_SERVIDOR.bat SUA_SENHA_POSTGRES
```

Esse processo:

- aplica o ZIP;
- executa `ATUALIZAR_SERVIDOR_SEM_PERDER_DADOS.bat` sem migrations gerais;
- executa somente o banco da Frota.

## Opcao 2 - Aplicar somente banco Frota

```bat
cd /d "C:\Control S Hub"
APLICAR_BANCO_FROTA.bat
```

Com senha diferente:

```bat
cd /d "C:\Control S Hub"
APLICAR_BANCO_FROTA.bat SUA_SENHA_POSTGRES
```

## Opcao 3 - Executar SQL manual por psql

PostgreSQL 18:

```bat
cd /d "C:\Control S Hub"
set PGPASSWORD=CONTROLS
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d CONTROLSHUB -v ON_ERROR_STOP=1 -f "database\scripts\COMANDOS_BANCO_FROTA.sql"
set PGPASSWORD=
```

PostgreSQL 17:

```bat
cd /d "C:\Control S Hub"
set PGPASSWORD=CONTROLS
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d CONTROLSHUB -v ON_ERROR_STOP=1 -f "database\scripts\COMANDOS_BANCO_FROTA.sql"
set PGPASSWORD=
```

PostgreSQL 16:

```bat
cd /d "C:\Control S Hub"
set PGPASSWORD=CONTROLS
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d CONTROLSHUB -v ON_ERROR_STOP=1 -f "database\scripts\COMANDOS_BANCO_FROTA.sql"
set PGPASSWORD=
```

Se usar `DATABASE_URL`:

```bat
cd /d "C:\Control S Hub"
set DATABASE_URL=postgresql://postgres:CONTROLS@127.0.0.1:5432/CONTROLSHUB
psql "%DATABASE_URL%" -v ON_ERROR_STOP=1 -f "database\scripts\COMANDOS_BANCO_FROTA.sql"
```

## Validacao rapida

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

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('frota_fornecedores', 'frota_departamentos', 'frota_veiculos')
  AND column_name IN ('natureza_credito_decis', 'grupo_custo_decis', 'conf_custo_decis', 'filial_decis', 'codigo_decis')
ORDER BY table_name, column_name;
```
