# Control S Hub - Documentacao do Sistema

## Visao geral

O Control S Hub e uma aplicacao modular em React/Vite/TypeScript no frontend, Node/Fastify/TypeScript no backend e PostgreSQL como banco central. O modulo operacional principal e Cotacao de Frete.

## Arquitetura

- Frontend: `apps/frontend`
- Backend: `apps/backend`
- Banco: PostgreSQL, base `controlshub`
- Scripts operacionais: raiz do projeto
- Documentacao: `docs`

## Autenticacao

O login usa `/api/auth/login` e gera JWT. A sessao e validada em `/api/auth/sessao`. Usuario sem empresa vinculada nao deve operar rotas protegidas.

Usuario padrao restaurado:

- `christian@controlsconsultoria.com.br`
- senha: `controls`

## Cotacao de Frete

As cotacoes usam chave operacional composta:

`empresa_id|tipo_documento|numero_documento|codigo_chave`

Essa chave trafega no frontend como string codificada em URL. O backend valida a chave antes de consultar ou alterar dados.

Fluxo principal:

1. ERP cria/atualiza cotacao em `RECEBIDO_ERP`.
2. Retorno automatico grava transportadoras e move para `COTACAO_AUTOMATICA_RECEBIDA`.
3. Analista seleciona transportadoras e gera/envia link.
4. Envio move para `AGUARDANDO_RETORNO_TRANSPORTADORA`.
5. Resposta da transportadora entra via link publico.
6. Quando nao ha pendencias externas, a cotacao pode ir para `EM_ANALISE`.
7. Analista escolhe transportadora, valor e prazo final.
8. ERP/N8N atualiza faturamento, NF-e e CT-e pelas tabelas fiscais.

## Envio em Massa

Rotas:

- `GET /api/cotacao-frete/envio-massa/pedidos`
- `POST /api/cotacao-frete/envio-massa/preparar`
- `POST /api/cotacao-frete/envio-massa/enviar`

O envio usa `numero_envio` dentro da chave composta. Nao usa `envio_id` numerico como vinculo de cotacao.

## Kanban

Rotas:

- `GET /api/cotacao-frete/kanban`
- `POST /api/cotacao-frete/cotacoes/:id/alterar-etapa`

O card usa `cotacao_id` composto. Movimentacao nao converte a chave para numero.

## E-mail

Configuracao por usuario/administracao:

- `GET/POST /api/usuarios/minha-configuracao-email`
- `POST /api/usuarios/minha-configuracao-email/testar`
- `GET/POST /api/admin/configuracoes-email`
- `POST /api/admin/configuracoes-email/:id/testar`

Erros SMTP retornam mensagem detalhada no padrao JSON.

