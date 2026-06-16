# Control S Hub — Documentação Técnica e Operacional

## 1. Visão geral

O Control S Hub é um portal operacional para cotação de frete, gestão de transportadoras, envio em massa de cotações por link, acompanhamento por Kanban, gestão de e-mails SMTP, usuários, permissões e auditoria.

Esta versão está padronizada para a chave operacional composta da cotação:

```text
EMPRESA_ID | TIPO_DOCUMENTO | NUMERO_DOCUMENTO | CODIGO_CHAVE
```

No frontend, a chave trafega codificada na URL com `encodeURIComponent`.
No backend, a chave é decodificada com `decodeURIComponent`.

## 2. Módulos e rotas do frontend

| Tela | Rota | Componente principal | Fonte |
|---|---|---|---|
| Dashboard | `/Dashboard` | `Dashboard` | `apps/frontend/src/App.tsx` |
| Cotações | `/Cotacao_Frete` | `CotacoesOperacional` | `apps/frontend/src/App.tsx` |
| Envio em Massa | `/Cotacao_Frete/Envio_Massa` | `EnvioMassaCotacoes` | `apps/frontend/src/App.tsx` |
| Kanban | `/Cotacao_Frete/Kanban` | `KanbanCotacoes` | `apps/frontend/src/App.tsx` |
| Transportadoras | `/Cotacao_Frete/Transportadoras` | `TabelaOperacional` | `apps/frontend/src/App.tsx` |
| Etapas Kanban | `/Cotacao_Frete/Etapas_Kanban` | `TabelaOperacional` | `apps/frontend/src/App.tsx` |
| Configurações de E-mail | `/Configuracoes_Email` | `ConfiguracaoEmailUsuario`, `ConfiguracoesEmailAdmin` | `apps/frontend/src/App.tsx` |
| Administração | `/Empresas`, `/Usuarios`, `/Perfis_Direitos`, `/Matriz_Permissoes`, `/Auditoria`, `/Configuracoes` | componentes administrativos | `apps/frontend/src/App.tsx` |

## 3. Principais arquivos do frontend

| Arquivo | Responsabilidade |
|---|---|
| `apps/frontend/src/App.tsx` | Layout principal, rotas visuais, telas, filtros, paginação, componentes e interações |
| `apps/frontend/src/servicos/api.ts` | Cliente HTTP, autenticação via Bearer token, chamadas da API |
| `apps/frontend/src/main.tsx` | Entrada do React |
| `apps/frontend/src/index.css` | Estilos globais |
| `apps/frontend/vite.config.ts` | Configuração Vite |

## 4. Principais arquivos do backend

| Arquivo | Responsabilidade |
|---|---|
| `apps/backend/src/app.ts` | Declaração das rotas Fastify, autenticação, CORS, auditoria e orquestrações |
| `apps/backend/src/server.ts` | Inicialização HTTP |
| `apps/backend/src/banco/conexao.ts` | Pool PostgreSQL |
| `apps/backend/src/seguranca/sessao.ts` | Extração de usuário do JWT |
| `apps/backend/src/http/respostas.ts` | Padronização de sucesso/falha |
| `apps/backend/src/modulos/cotacao_frete/repositorioCotacaoFrete.ts` | Consultas e comandos de cotação |
| `apps/backend/src/modulos/cotacao_frete/repositorioEnvioMassa.ts` | Listagem, preparação e registro de envio em massa |
| `apps/backend/src/modulos/cotacao_frete/repositorioCadastrosCotacao.ts` | Transportadoras e etapas |
| `apps/backend/src/modulos/administracao/repositorioAdministracao.ts` | Usuários, empresas, perfis, permissões, telas-fonte |
| `apps/backend/src/modulos/administracao/repositorioEmailUsuario.ts` | Configuração SMTP |
| `apps/backend/src/servicos/email.ts` | Teste e envio SMTP |

## 5. Endpoints principais

### Autenticação

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/sessao` | Validação de sessão/token |
| `POST` | `/api/auth/trocar-empresa` | Troca da empresa ativa |

### Cotação de frete

| Método | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/cotacao-frete/dashboard` | Indicadores do Dashboard |
| `GET` | `/api/cotacao-frete/cotacoes` | Listagem paginada e filtrada |
| `GET` | `/api/cotacao-frete/cotacoes/:id` | Detalhe da cotação por chave composta |
| `POST` | `/api/cotacao-frete/cotacoes/:id/alterar-etapa` | Mover etapa |
| `POST` | `/api/cotacao-frete/cotacoes/:id/timeline` | Registrar timeline |
| `POST` | `/api/cotacao-frete/cotacoes/:id/tokens` | Gerar link/token |
| `POST` | `/api/cotacao-frete/cotacoes/:id/transportadoras` | Adicionar transportadora |
| `POST` | `/api/cotacao-frete/cotacoes/:id/escolher-transportadora` | Aprovar transportadora |

### Envio em massa

| Método | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/cotacao-frete/envio-massa/pedidos` | Pedidos aptos ao envio |
| `POST` | `/api/cotacao-frete/envio-massa/preparar` | Preparação/conferência |
| `POST` | `/api/cotacao-frete/envio-massa/enviar` | Disparo de e-mail |

### Configuração de e-mail

| Método | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/usuarios/minha-configuracao-email` | Configuração individual |
| `POST` | `/api/usuarios/minha-configuracao-email` | Salvar configuração individual |
| `POST` | `/api/usuarios/minha-configuracao-email/testar` | Testar SMTP individual |
| `GET` | `/api/admin/configuracoes-email` | Listar configurações administrativas |
| `POST` | `/api/admin/configuracoes-email` | Salvar configuração administrativa |
| `POST` | `/api/admin/configuracoes-email/:id/testar` | Testar SMTP administrativo |

## 6. Tabelas mínimas por tela

### Dashboard

```text
cotacoes_frete
cotacoes_frete_transportadoras
transportadoras
etapas_kanban
```

### Cotação de frete — listagem

```text
cotacoes_frete
etapas_kanban
transportadoras
cotacoes_frete_notas_fiscais
cotacoes_frete_ctes
```

As tabelas `cotacoes_frete_notas_fiscais` e `cotacoes_frete_ctes` podem estar vazias, mas precisam existir.

### Cotação de frete — detalhe

```text
cotacoes_frete
cotacoes_frete_itens
cotacoes_frete_transportadoras
cotacoes_frete_historicos
cotacoes_frete_timeline
cotacoes_frete_tokens
cotacoes_frete_notas_fiscais
cotacoes_frete_ctes
transportadoras
etapas_kanban
usuarios
```

### Envio em Massa

```text
cotacoes_frete
cotacoes_frete_itens
cotacoes_frete_transportadoras
cotacoes_frete_envios
cotacoes_frete_envios_itens
cotacoes_frete_envios_fornecedores
cotacoes_frete_tokens
transportadoras
usuarios_configuracoes_email
```

### Configuração de e-mail

```text
usuarios_configuracoes_email
usuarios
empresas
```

## 7. Consulta base da tela de cotação

```sql
SELECT
  CONCAT_WS('|', C.EMPRESA_ID, C.TIPO_DOCUMENTO, C.NUMERO_DOCUMENTO, C.CODIGO_CHAVE) AS ID,
  C.EMPRESA_ID,
  C.TIPO_DOCUMENTO,
  C.NUMERO_DOCUMENTO,
  C.NUMERO_PEDIDO,
  C.CODIGO_CHAVE,
  C.DATA_DOCUMENTO,
  C.STATUS,
  E.NOME AS ETAPA_NOME,
  C.NOME_DESTINATARIO,
  C.CIDADE_DESTINO,
  C.UF_DESTINO,
  C.VALOR_MERCADORIA,
  COALESCE(C.VALOR_FRETE_PEDIDO, C.VALOR_SOLICITADO, C.VALOR_FRETE_FINAL, 0) AS VALOR_FRETE_VENDA,
  COALESCE(NFES.NUMEROS_NFE, '') AS NUMEROS_NFE,
  COALESCE(CTES.NUMEROS_CTE, '') AS NUMEROS_CTE
FROM COTACOES_FRETE C
LEFT JOIN ETAPAS_KANBAN E
  ON E.ID = C.ETAPA_KANBAN_ID
LEFT JOIN LATERAL (
  SELECT STRING_AGG(NF.NUMERO_NFE::TEXT, ', ') AS NUMEROS_NFE
  FROM COTACOES_FRETE_NOTAS_FISCAIS NF
  WHERE NF.EMPRESA_ID = C.EMPRESA_ID
    AND NF.TIPO_DOCUMENTO = C.TIPO_DOCUMENTO
    AND NF.NUMERO_DOCUMENTO = C.NUMERO_DOCUMENTO
    AND NF.CODIGO_CHAVE = C.CODIGO_CHAVE
) NFES ON TRUE
LEFT JOIN LATERAL (
  SELECT STRING_AGG(CT.NUMERO_CTE::TEXT, ', ') AS NUMEROS_CTE
  FROM COTACOES_FRETE_CTES CT
  WHERE CT.EMPRESA_ID = C.EMPRESA_ID
    AND CT.TIPO_DOCUMENTO = C.TIPO_DOCUMENTO
    AND CT.NUMERO_DOCUMENTO = C.NUMERO_DOCUMENTO
    AND CT.CODIGO_CHAVE = C.CODIGO_CHAVE
) CTES ON TRUE
WHERE C.EMPRESA_ID = $1
  AND COALESCE(C.EXCLUIDO, FALSE) = FALSE
  AND COALESCE(C.SITUACAO_PEDIDO, 'ATIVO') = 'ATIVO'
  AND ($2::DATE IS NULL OR C.DATA_DOCUMENTO >= $2::DATE)
  AND ($3::DATE IS NULL OR C.DATA_DOCUMENTO <= $3::DATE)
ORDER BY
  COALESCE(C.ALTERADO_EM, C.CRIADO_EM, C.DATA_DOCUMENTO) DESC NULLS LAST
LIMIT $4 OFFSET $5;
```

## 8. Manutenção

Para rastrear fonte pela tela, use o botão **FONTE DA TELA**. Os registros são carregados da tabela `telas`.

Em caso de manutenção, comece por:

1. Verificar o endpoint no DevTools > Network.
2. Abrir `apps/frontend/src/servicos/api.ts` para confirmar a chamada.
3. Abrir `apps/backend/src/app.ts` para localizar a rota.
4. Abrir o repositório correspondente para revisar SQL.
5. Validar a tabela e índices no PostgreSQL.

## 9. Instalação/atualização

Use:

```bat
INSTALAR_OU_ATUALIZAR.bat
```

O instalador:

1. valida `.env`;
2. instala dependências;
3. executa batches SQL;
4. compila backend;
5. compila frontend;
6. reinicia backend e frontend em novas janelas.
