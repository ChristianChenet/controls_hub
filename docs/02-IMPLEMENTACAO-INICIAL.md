# CONTROL S HUB - Implementacao Inicial

## 1. DDL do banco

Arquivo criado:

- `database/migrations/001_estrutura_inicial.sql`

Conteudo entregue:

- Estrutura central multiempresa.
- Usuarios, perfis, permissoes, modulos, menus, telas, botoes e acoes.
- Auditoria.
- Parametros globais e por empresa.
- Transportadoras e vinculo por empresa.
- Etapas de kanban parametrizaveis por empresa.
- Cotacoes de frete, itens, cotacoes por transportadora, tokens, historicos e integracoes ERP.
- Indices iniciais para filtros operacionais, auditoria, kanban e integracao.

## 2. Seeds iniciais

Arquivo criado:

- `database/seeds/001_seed_inicial.sql`

Conteudo entregue:

- Empresa padrao `CONTROL-S`.
- Modulos `ADMINISTRACAO`, `COTACAO_FRETE` e `PUBLICO_TRANSPORTADORA`.
- Menus iniciais.
- Telas iniciais com metadados para `FONTE DA TELA`.
- Perfis/setores iniciais.
- Usuario superadmin:
  - Login: `christian@controlsconsultoria.com.br`
  - Senha: `controls`
- Permissoes iniciais.
- Etapas iniciais do kanban.
- Parametros basicos do sistema.
- Transportadoras exemplo.
- Cotacao de frete exemplo com TOP 3.

## 3. Estrutura backend

Base criada em:

- `apps/backend`

Camadas iniciais:

- `configuracao`: variaveis de ambiente.
- `banco`: pool PostgreSQL e helpers de consulta.
- `http`: padrao de resposta.
- `seguranca`: sessao e validacao de superadmin.
- `modulos/administracao`: usuarios, empresas e fonte da tela.
- `modulos/cotacao_frete`: dashboard e kanban.

Stack:

- Fastify.
- TypeScript.
- PostgreSQL.
- JWT.
- OpenAPI/Swagger.

## 4. Estrutura frontend

Base criada em:

- `apps/frontend`

Componentes iniciais:

- Login visual Control S.
- Shell principal com sidebar.
- Topbar com selecao de empresa.
- Botao `FONTE DA TELA` para superadmin.
- Dashboard de cotacao.
- Preview de kanban no padrao Control S One.
- Telas de listagem para administracao, cadastros operacionais e auditoria.

Assets reaproveitados:

- `apps/frontend/public/brand/fundo-control-s.png`
- `apps/frontend/public/brand/logo-s-novo.jpg`

## 5. Endpoints iniciais

| Metodo | Endpoint | Finalidade |
| --- | --- | --- |
| `GET` | `/saude` | Healthcheck da API. |
| `POST` | `/api/auth/login` | Login do usuario. |
| `GET` | `/api/empresas/minhas` | Empresas vinculadas ao usuario logado. |
| `GET` | `/api/telas/fonte` | Metadados do botao `FONTE DA TELA`. |
| `GET` | `/api/admin/empresas` | Lista empresas para administracao. |
| `POST` | `/api/admin/empresas` | Cria ou atualiza empresa. |
| `GET` | `/api/admin/perfis` | Lista perfis/setores. |
| `POST` | `/api/admin/perfis` | Cria ou atualiza perfil/setor. |
| `GET` | `/api/admin/usuarios` | Lista usuarios. |
| `POST` | `/api/admin/usuarios` | Cria ou atualiza usuario. |
| `GET` | `/api/admin/acoes` | Lista acoes/permissoes disponiveis. |
| `GET` | `/api/admin/auditorias` | Lista eventos recentes de auditoria. |
| `GET` | `/api/cotacao-frete/dashboard` | Indicadores do modulo Cotacao de Frete. |
| `GET` | `/api/cotacao-frete/kanban` | Dados iniciais do kanban. |
| `GET` | `/api/cotacao-frete/cotacoes` | Lista cotacoes da empresa ativa. |
| `GET` | `/api/cotacao-frete/cotacoes/:id` | Detalhe da cotacao, itens e transportadoras. |
| `POST` | `/api/cotacao-frete/cotacoes/:id/tokens` | Gera token publico para transportadora. |
| `GET` | `/api/cotacao-frete/transportadoras` | Lista transportadoras. |
| `POST` | `/api/cotacao-frete/transportadoras` | Cria ou atualiza transportadora. |
| `GET` | `/api/cotacao-frete/etapas` | Lista etapas do kanban da empresa ativa. |
| `POST` | `/api/cotacao-frete/etapas` | Cria ou atualiza etapa do kanban. |
| `GET` | `/api/publico/cotacao/:token` | Consulta publica sem login por token. |
| `POST` | `/api/publico/cotacao/:token/responder` | Resposta publica da transportadora. |
| `POST` | `/api/integracoes/erp/cotacoes` | Recebe cotacao completa do ERP com itens e transportadoras. |
| `GET` | `/api/integracoes/erp/pendentes` | Lista cotacoes aprovadas pendentes de atualizacao no ERP. |
| `POST` | `/api/integracoes/erp/cotacoes/:id/confirmar-atualizacao` | Confirma atualizacao no ERP e bloqueia a cotacao. |
| `GET` | `/swagger` | Documentacao Swagger da API. |

## 6. Regras de negocio implementadas na fundacao

- Usuario precisa estar autenticado para acessar endpoints internos.
- `FONTE DA TELA` e retornado apenas para superadmin.
- Empresas disponiveis sao filtradas pelo vinculo `usuarios_empresas`.
- Dashboard de cotacao considera a empresa ativa da sessao.
- Kanban e filtrado por empresa ativa.
- Senha do seed e gerada com `CRYPT` e `GEN_SALT` usando `pgcrypto`.
- Estrutura de bloqueio ERP ja existe em `cotacoes_frete.bloqueado_para_alteracao`.
- Estrutura de token publico ja existe em `cotacoes_frete_tokens`.
- Token publico e armazenado por hash SHA-256; o token cru aparece apenas no retorno da geracao.
- Pagina publica valida token ativo, nao utilizado, nao expirado e cotacao nao bloqueada.
- Resposta da transportadora grava cotacao externa, marca token como utilizado e registra historico.
- Usuario interno pode escolher transportadora vencedora quando a cotacao nao esta bloqueada.
- Usuario interno pode bloquear a cotacao por ERP, marcando `atualizado_no_erp` e `bloqueado_para_alteracao`.
- Perfil/setor possui matriz inicial de permissoes por acao.
- Endpoint interno recebe cotacao do ERP e grava cabecalho, itens, transportadoras e cotacoes automaticas.
- Endpoint de pendencias ERP retorna cotacoes aprovadas ainda nao atualizadas no ERP.
- Confirmacao ERP bloqueia a cotacao para novas alteracoes.

## 7. Instrucoes de instalacao local

1. Criar banco PostgreSQL:

```sql
CREATE DATABASE CONTROLSHUB;
```

2. Aplicar migration:

```text
database/migrations/001_estrutura_inicial.sql
```

3. Aplicar seed:

```text
database/seeds/001_seed_inicial.sql
```

4. Instalar dependencias:

```text
npm.cmd install
```

5. Configurar variaveis se necessario:

Aplicacao automatica, se houver usuario PostgreSQL com permissao de criar banco:

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\aplicar-banco.ps1 -Banco CONTROLSHUB -Usuario postgres -Senha controls
```

No ambiente atual, a credencial validada foi `postgres / controls`. O banco foi aplicado com sucesso usando essa combinacao.

```text
BANCO_URL=postgres://postgres:controls@localhost:5432/controlshub
PORTA_API=3334
ORIGEM_FRONTEND=http://localhost:5174
SEGREDO_JWT=trocar-em-producao
```

6. Rodar backend:

```text
npm.cmd run dev:backend
```

7. Rodar frontend:

```text
npm.cmd run dev:frontend
```

## 8. Instrucoes de atualizacao

O padrao de atualizacao deve seguir o Control S Fiscal Hub:

- Scripts PowerShell em `scripts`.
- Backup antes de aplicar migration.
- Aplicacao incremental das migrations.
- Rebuild do backend/frontend.
- Preservacao de `.env` e dados locais.
- Pacote final em `release`.

Proxima etapa tecnica:

- Evoluir `INSTALAR_OU_ATUALIZAR.ps1` com backup automatico antes de migrations destrutivas.

## 9. Checklist do que ficou pronto

- Documentacao executiva, arquitetura e modelagem inicial.
- DDL inicial PostgreSQL.
- Seed inicial obrigatoria.
- Estrutura monorepo.
- Backend Fastify/TypeScript.
- Frontend React/Vite.
- Assets visuais Control S.
- Login inicial.
- Selecao de empresa no topo.
- Botao `FONTE DA TELA` para superadmin.
- Dashboard inicial de Cotacao de Frete.
- Preview de kanban.
- Listagem administrativa de empresas.
- Listagem administrativa de usuarios.
- Listagem administrativa de perfis.
- Listagem de transportadoras.
- Listagem de etapas do kanban.
- Listagem de auditoria.
- Listagem de cotacoes.
- Endpoint de detalhe da cotacao.
- Geracao de token publico.
- Consulta e resposta publica por token.
- Tela publica inicial da transportadora.
- Escolha de transportadora vencedora.
- Bloqueio de cotacao por atualizacao ERP.
- Matriz inicial de permissoes por perfil.
- Views de integracao `vw_cotacoes_frete_resumo`, `vw_cotacoes_frete_transportadoras` e `vw_cotacoes_frete_pendentes_erp`.
- Recebimento de cotacao ERP por endpoint autenticado.
- Listagem de pendencias para ERP/N8N.
- Confirmacao de atualizacao ERP por endpoint autenticado.
- Banco PostgreSQL local aplicado com migrations e seed.
- Scripts Windows de banco e inicializacao.
- Build validado com sucesso.

## 10. Pendencias e integracoes externas

Dependem de etapa futura ou integracao externa:

- Recebimento real de cotacoes vindas do ERP.
- Views finais para consumo n8n/ERP.
- Confirmacao do campo/status que o ERP usara para bloquear cotacao.
- Envio real de link por e-mail/WhatsApp.
- Pagina publica completa por token.
- Formularios completos de empresas, usuarios, perfis, direitos, transportadoras e etapas.
- Auditoria automatica em todos os endpoints.
- Backup automatico no instalador/atualizador Windows definitivo.
- Revisao de vulnerabilidades npm sem aplicar alteracoes quebraveis automaticamente.
