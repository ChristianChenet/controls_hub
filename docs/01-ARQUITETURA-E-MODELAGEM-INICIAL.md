# CONTROL S HUB - Arquitetura e Modelagem Inicial

## 1. Resumo executivo

O CONTROL S HUB sera a plataforma central de modulos corporativos da Control S, iniciando pelo modulo de Cotacao de Frete e preparada para absorver rotinas futuras no mesmo banco PostgreSQL. A diretriz principal e acelerar a entrega copiando o padrao visual, administrativo e operacional ja existente no Control S Fiscal Hub, usando a selecao de empresa mais fluida do Control S API Hub e tomando o kanban do Control S One como referencia de operacao premium.

O sistema nasce multiempresa, modular, auditavel e orientado por permissoes. Usuarios, perfis, empresas, parametros, etapas, permissoes, auditoria e integracoes ficam em uma base central reaproveitavel. O primeiro valor operacional entregue sera permitir que usuarios internos recebam cotacoes iniciais vindas do ERP, comparem o TOP 3 de transportadoras, gerem links publicos por token para novas cotacoes, escolham a transportadora vencedora e bloqueiem alteracoes quando o ERP confirmar a atualizacao.

Diretrizes fixas do projeto:

- Banco PostgreSQL `CONTROLSHUB`, senha padrao local `CONTROLS`.
- Todos os nomes fisicos de banco em portugues.
- SQL em maiusculo.
- Comentarios de fonte em portugues.
- Identacao com 2 espacos.
- UX premium baseada no ecossistema Control S.
- Botao `FONTE DA TELA` em todas as telas para usuario superadmin.
- Arquitetura modular para novos modulos futuros.
- Desenvolvimento rapido por reaproveitamento dos padroes Control S.

## 2. Stack tecnologica escolhida

Stack definida:

- Backend: Node.js, TypeScript, Fastify, PostgreSQL, Zod, JWT/sessao segura e OpenAPI.
- Frontend: React, TypeScript, Vite, CSS proprio, Lucide React e componentes reutilizaveis Control S.
- Banco: PostgreSQL.
- Migrations/seeds: SQL versionado em `database/migrations` e `database/seeds`.
- Instalacao/atualizacao Windows: scripts PowerShell no mesmo padrao do Control S Fiscal Hub.

Motivo da escolha:

O Control S API Hub ja usa React, Vite, TypeScript, Fastify e PostgreSQL, entregando uma base mais moderna e produtiva para frontend/backend. O Control S Fiscal Hub tem padrao maduro de instalacao Windows, atualizacao, assets visuais, navegacao administrativa e operacao local. O CONTROL S HUB deve combinar os dois: velocidade e modernidade do API Hub com disciplina operacional e identidade visual do Fiscal Hub.

## 3. Arquitetura proposta

Arquitetura em camadas:

- Apresentacao: React/Vite com layout Control S, sidebar, topbar, selecao visual de empresa, dashboard, tabelas, formularios, kanban e pagina publica por token.
- API HTTP: Fastify com rotas versionadas, validacao de payload, middlewares de autenticacao, autorizacao, empresa ativa e auditoria.
- Aplicacao: casos de uso por modulo, sem regra de negocio presa ao controller.
- Dominio: regras de cotacao, permissao, token, bloqueio ERP, etapa kanban e auditoria.
- Persistencia: repositorios PostgreSQL com SQL em maiusculo.
- Banco: schema modular em portugues, com tabelas centrais e tabelas do modulo de cotacao.
- Integracao: tabelas de entrada/saida e payloads JSONB para ERP/n8n, sem acoplar a primeira versao a uma API externa.

Estrutura prevista:

```text
CONTROL S HUB/
  apps/
    backend/
      src/
        aplicacao/
        banco/
        configuracao/
        dominio/
        http/
        modulos/
          administracao/
          cotacao_frete/
          publico/
        seguranca/
        compartilhado/
    frontend/
      src/
        componentes/
        modulos/
          administracao/
          cotacao_frete/
          publico/
        servicos/
        estilos/
        rotas/
  database/
    migrations/
    seeds/
  docs/
  scripts/
  release/
```

## 4. Modelagem inicial do banco PostgreSQL

O banco sera modelado com tabelas centrais compartilhadas e tabelas especificas por modulo. Todos os nomes fisicos ficarao em portugues e em minusculo com `snake_case`, mantendo SQL em maiusculo nos arquivos `.sql`.

Padroes de coluna:

- Chave primaria: `id BIGSERIAL PRIMARY KEY`.
- Multiempresa: `empresa_id BIGINT` quando o dado pertencer a empresa.
- Auditoria basica: `criado_em`, `criado_por_usuario_id`, `alterado_em`, `alterado_por_usuario_id`.
- Exclusao logica: `excluido BOOLEAN DEFAULT FALSE`, `excluido_em`, `excluido_por_usuario_id`.
- Status: campos textuais controlados por constraints ou tabelas de dominio.
- Integração externa: `identificador_externo`, `payload_recebido JSONB`, `payload_retorno JSONB`.

Nucleos da modelagem:

- Identidade e acesso: empresas, usuarios, perfis, permissoes, vinculos e sessoes.
- Modularidade: modulos, menus, telas, botoes, acoes e direitos por perfil/usuario/empresa.
- Operacao: transportadoras, etapas de kanban, cotacoes, itens, ofertas e tokens.
- Auditoria: eventos do sistema com antes/depois em JSONB.
- Parametrizacao: parametros globais e por empresa.

## 5. Lista inicial de tabelas e finalidade

Tabelas centrais:

| Tabela | Finalidade |
| --- | --- |
| `empresas` | Cadastro multiempresa, identidade visual, dominio publico e status. |
| `parametros_sistema` | Parametros globais do CONTROL S HUB. |
| `parametros_empresa` | Parametros especificos por empresa. |
| `modulos` | Catalogo de modulos atuais e futuros. |
| `menus` | Menus liberaveis por permissao. |
| `telas` | Telas tecnicas do sistema e metadados do `FONTE DA TELA`. |
| `botoes` | Botoes e comandos controlados por permissao. |
| `acoes` | Acoes funcionais como visualizar, editar, gerar token e aprovar. |
| `perfis` | Perfis/setores como Comercial, Logistica, Fiscal e Diretoria. |
| `usuarios` | Usuarios, login, senha hash, perfil e flags admin/superadmin. |
| `usuarios_empresas` | Empresas vinculadas ao usuario. |
| `perfis_permissoes` | Direitos por perfil, empresa, modulo, tela, botao, acao e etapa. |
| `usuarios_permissoes` | Permissoes complementares por usuario. |
| `sessoes_usuario` | Controle de sessao, login, logout e ultimo acesso. |
| `auditorias` | Trilha de auditoria completa. |

Tabelas do modulo Cotacao de Frete:

| Tabela | Finalidade |
| --- | --- |
| `transportadoras` | Cadastro mestre de transportadoras. |
| `transportadoras_empresas` | Vinculo de transportadoras autorizadas por empresa. |
| `etapas_kanban` | Etapas parametrizaveis por empresa e modulo. |
| `cotacoes_frete` | Cabecalho/documento recebido do ERP. |
| `cotacoes_frete_itens` | Itens, pesos e dimensoes do documento. |
| `cotacoes_frete_transportadoras` | Cotacoes por transportadora, automaticas ou externas. |
| `cotacoes_frete_tokens` | Tokens seguros para pagina publica da transportadora. |
| `cotacoes_frete_historicos` | Historico operacional da cotacao. |
| `integracoes_erp` | Controle de recebimento, bloqueio e consumo externo via n8n/banco. |

## 6. Mapa de modulos

Modulos iniciais:

- Administracao: empresas, usuarios, perfis, direitos, parametros e auditoria.
- Cotacao de Frete: dashboard, lista, kanban, detalhe, comparativo, tokens e historico.
- Publico Transportadora: acesso sem login por token.
- Configuracoes Tecnicas: fonte da tela, parametros, integracoes e diagnostico.

Modulos futuros previstos:

- Fiscal, Compras, Comercial, Expediçao, Financeiro, CRM, tarefas internas e integracoes API.

## 7. Mapa de telas

Telas administrativas:

- Login.
- Selecao de empresa ativa.
- Hub inicial de modulos.
- Empresas.
- Usuarios.
- Perfis/Setores.
- Direitos de acesso.
- Parametros do sistema.
- Etapas do kanban.
- Transportadoras.
- Auditoria.

Telas operacionais da Cotacao de Frete:

- Dashboard de cotacao.
- Lista de cotacoes.
- Kanban de cotacoes.
- Detalhe da cotacao.
- Comparativo de transportadoras.
- Historico da cotacao.
- Geracao de token.
- Pagina publica da transportadora.

Todas as telas terao metadados para `FONTE DA TELA`, incluindo nome tecnico, arquivo, componentes, endpoints, tabelas e rotinas.

## 8. Fluxo completo da cotacao de frete

1. ERP grava ou envia cotacao inicial no banco.
2. CONTROL S HUB registra documento em `cotacoes_frete`.
3. Itens entram em `cotacoes_frete_itens`.
4. Cotacoes automaticas entram em `cotacoes_frete_transportadoras`.
5. Usuario interno visualiza TOP 3 por menor frete/ranking.
6. Usuario gera token para transportadora, se tiver permissao.
7. Sistema registra token seguro em `cotacoes_frete_tokens`.
8. Transportadora acessa pagina publica sem login.
9. Token e validado por hash, status, expiracao, empresa e transportadora.
10. Transportadora informa valor, observacao e confirma resposta.
11. Sistema grava resposta como nova cotacao externa ou atualiza a cotacao vinculada.
12. Usuario interno compara opcoes.
13. Usuario escolhe transportadora vencedora.
14. Dados ficam prontos para consumo externo por n8n/banco.
15. ERP atualiza a transportadora em sua base.
16. ERP marca `bloqueado_para_alteracao = TRUE`.
17. Portal bloqueia alteracoes, troca de transportadora e mudanca indevida de etapa.

## 9. Matriz inicial de permissoes

Permissoes iniciais:

| Codigo | Finalidade |
| --- | --- |
| `UTILIZA_COTACAO_FRETE` | Libera visualizacao do modulo Cotacao de Frete. |
| `VISUALIZAR_COTACAO_FRETE` | Permite listar e abrir cotacoes. |
| `EDITAR_COTACAO_FRETE` | Permite editar dados operacionais nao bloqueados. |
| `GERAR_TOKEN_COTACAO_FRETE` | Permite gerar link externo para transportadora. |
| `VALIDAR_COTACAO_FRETE` | Permite validar retorno de transportadora. |
| `ESCOLHER_TRANSPORTADORA` | Permite marcar cotacao vencedora. |
| `ALTERAR_ETAPA_COTACAO` | Permite mover cards no kanban. |
| `CADASTRAR_TRANSPORTADORA` | Permite administrar transportadoras. |
| `ADMINISTRAR_EMPRESAS` | Permite administrar empresas. |
| `ADMINISTRAR_USUARIOS` | Permite administrar usuarios. |
| `ADMINISTRAR_PERFIS` | Permite administrar perfis e direitos. |
| `VISUALIZAR_AUDITORIA` | Permite consultar trilha de auditoria. |
| `CONFIGURAR_SISTEMA` | Permite alterar parametros tecnicos. |

Regra obrigatoria:

Se `UTILIZA_COTACAO_FRETE` nao estiver marcada para o perfil/usuario/empresa, o usuario nao visualiza menu, telas, dados, acoes, transportadoras nem indicadores da rotina.

## 10. Plano de implementacao por fases

Fase 1 - Fundacao:

- Criar estrutura de monorepo.
- Criar migrations centrais.
- Criar seeds do superadmin, empresa padrao, perfil administrador, permissoes e etapas.
- Criar autenticacao, sessao, empresa ativa e autorizacao.
- Criar layout base com sidebar, topbar, selecao de empresa e `FONTE DA TELA`.

Fase 2 - Administracao:

- Empresas.
- Perfis/setores.
- Direitos de acesso.
- Usuarios.
- Parametros.
- Auditoria.

Fase 3 - Cadastros operacionais:

- Transportadoras.
- Vinculo transportadora/empresa.
- Etapas do kanban.

Fase 4 - Cotacao de Frete:

- Recebimento/registro de cotacoes.
- Dashboard.
- Lista.
- Kanban.
- Detalhe.
- Comparativo.
- Historico.
- Geracao de token.

Fase 5 - Pagina publica:

- Validacao segura de token.
- Tela responsiva para transportadora.
- Registro de resposta.
- Auditoria de acesso e resposta.

Fase 6 - Integracao e bloqueio ERP:

- Campos e status de integracao.
- Views para n8n/ERP consumir.
- Bloqueios por `bloqueado_para_alteracao`.
- Indicadores de integrado/bloqueado.

Fase 7 - Refinamento premium:

- Ajustes visuais seguindo Fiscal Hub/API Hub/Control S One.
- Melhorias de performance.
- Relatorios e indicadores adicionais.
- Empacotamento Windows e rotina de atualizacao.

