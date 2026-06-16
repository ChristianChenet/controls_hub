# AJUSTE 014 — E-mail, atualização de telas e documentos fiscais

## Objetivo

Este pacote parte da versão 013, mantendo os batches 011, 012 e 013, e adiciona ajustes funcionais para operação final do Control S Hub.

## Ajustes aplicados

- Teste de e-mail com retorno técnico detalhado.
- Erros SMTP agora retornam:
  - servidor
  - porta
  - segurança
  - se usuário SMTP foi informado
  - código técnico
  - comando SMTP
  - resposta do servidor
  - stack reduzido
- `falha()` aceita `detalhes` para que o frontend mostre erro real.
- Frontend exibe detalhes técnicos quando a API retornar erro estruturado.
- Botão **Atualizar** com gauge/carregamento no Dashboard.
- Botão **Atualizar** com gauge/carregamento na tela de Cotações.
- Consulta de cotações passa a considerar NF-e e CT-e na busca.
- Detalhe da cotação exibe NF-es e CT-es vinculados.
- `obterCotacaoFrete` no backend foi ajustado para chave operacional composta:
  - `EMPRESA_ID`
  - `TIPO_DOCUMENTO`
  - `NUMERO_DOCUMENTO`
  - `CODIGO_CHAVE`

## Banco de dados

Permanece usando os batches existentes:

- `ATUALIZAR_011_DOCUMENTOS_FISCAIS_NFE_CTE.sql`
- `ATUALIZAR_012_CHAVE_OPERACIONAL_COTACAO_FRETE.sql`
- `ATUALIZAR_013_REMOVER_ID_CHAVE_COMPOSTA_COTACAO_FRETE.sql`

Execute pela raiz:

```bat
INSTALAR_OU_ATUALIZAR.bat
```

## Validação

Build validado com sucesso:

```text
npm run build
backend: OK
frontend: OK
```
