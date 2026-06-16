# Ajuste 014 - Correção do batch 012 e instalador

## Correção aplicada

O batch `ATUALIZAR_012_CHAVE_OPERACIONAL_COTACAO_FRETE.sql` foi substituído por versão robusta para tratar colunas opcionais ausentes nos backups/tabelas antigas.

Quando uma coluna antiga não existir, o script usa `NULL` com cast adequado e segue a migração.

## Instalador

O `INSTALAR_OU_ATUALIZAR.bat` agora executa somente arquivos:

```text
database/batches/ATUALIZAR_*.sql
```

em ordem alfabética, evitando executar arquivos de leitura/apoio como se fossem batch de banco.

## Motivo

Ambientes já parcialmente atualizados podem não possuir colunas antigas de integração, como:

- retorno_erp_status
- retorno_erp_em
- transportadora_final_id
- motivo_cancelamento_exclusao

Essas colunas foram removidas do modelo final porque a integração será Banco x Banco.
