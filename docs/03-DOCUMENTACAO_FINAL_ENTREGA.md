# CONTROL S HUB - Documentacao Final da Entrega Atual

## 1. Decisoes tecnicas tomadas

- Stack principal: React, Vite, TypeScript, Fastify e PostgreSQL.
- Identidade visual: assets e padrao visual reaproveitados do Control S API Hub/Fiscal Hub.
- Banco logico solicitado: `CONTROLSHUB`. No PostgreSQL local, a conexao usa `controlshub`, pois nomes nao aspados sao normalizados em minusculo.
- Autenticacao: JWT com empresa ativa no token.
- Senha: hash via `pgcrypto` no PostgreSQL.
- Modulos: base administrativa e Cotacao de Frete.
- Integracao ERP: preparada por tabelas e views para consumo externo por N8N/banco.

## 2. Mapa de fontes

| Area | Fonte |
| --- | --- |
| Backend principal | `apps/backend/src/app.ts` |
| Configuracao backend | `apps/backend/src/configuracao/ambiente.ts` |
| Banco backend | `apps/backend/src/banco/conexao.ts` |
| Administracao backend | `apps/backend/src/modulos/administracao/repositorioAdministracao.ts` |
| Cotacao backend | `apps/backend/src/modulos/cotacao_frete/repositorioCotacaoFrete.ts` |
| Cadastros cotacao backend | `apps/backend/src/modulos/cotacao_frete/repositorioCadastrosCotacao.ts` |
| Frontend principal | `apps/frontend/src/App.tsx` |
| API frontend | `apps/frontend/src/servicos/api.ts` |
| Estilos | `apps/frontend/src/styles.css` |
| Migration inicial | `database/migrations/001_estrutura_inicial.sql` |
| Views ERP | `database/migrations/002_views_integracao_erp.sql` |
| Seed inicial | `database/seeds/001_seed_inicial.sql` |
| Instalacao banco | `scripts/windows/aplicar-banco.ps1` |
| Inicializacao | `INICIAR_CONTROL_S_HUB.cmd` |

## 3. Fluxos entregues

### Login e empresa ativa

1. Usuario informa e-mail e senha.
2. Backend valida senha com `CRYPT`.
3. Backend retorna JWT com empresa ativa padrao.
4. Usuario pode trocar empresa no topo.
5. Backend valida se a empresa pertence ao usuario.
6. Backend emite novo JWT com a empresa ativa.
7. Auditoria registra a troca.

### Administracao

1. Empresas podem ser listadas e salvas.
2. Usuarios podem ser listados e salvos.
3. Perfis podem ser listados e salvos.
4. Empresas, usuarios, perfis, transportadoras e etapas possuem inserir, alterar e excluir logico.
5. Cadastro de usuario permite selecionar perfil/setor.
6. Permissoes por perfil podem ser consultadas e salvas.
7. Auditoria pode ser listada.
8. Superadmin pode abrir `FONTE DA TELA`.

### Cotacao de Frete

1. Cotacoes sao listadas por empresa ativa.
2. Detalhe da cotacao exibe cabecalho completo, produtos/itens, historico e transportadoras cotadas.
3. Kanban usa dados reais e permite alterar etapa pelo card.
4. Usuario pode gerar token publico para uma transportadora.
5. Transportadora acessa `/cotacao/token/...` sem login.
6. Transportadora responde valor do frete e observacao.
7. Portal registra resposta externa e historico.
8. Usuario escolhe transportadora vencedora.
9. Portal marca cotacao como aprovada.
10. Usuario/admin pode bloquear por ERP.
11. Views deixam dados prontos para N8N/ERP.

## 4. Endpoints principais

| Endpoint | Uso |
| --- | --- |
| `POST /api/auth/login` | Login |
| `POST /api/auth/trocar-empresa` | Troca de empresa ativa |
| `GET /api/empresas/minhas` | Empresas do usuario |
| `GET /api/admin/empresas` | Lista empresas |
| `POST /api/admin/empresas` | Salva empresa |
| `GET /api/admin/usuarios` | Lista usuarios |
| `POST /api/admin/usuarios` | Salva usuario |
| `GET /api/admin/perfis` | Lista perfis |
| `POST /api/admin/perfis` | Salva perfil |
| `GET /api/admin/perfis/:id/permissoes` | Lista permissoes do perfil |
| `POST /api/admin/perfis/:id/permissoes` | Salva permissoes do perfil |
| `GET /api/admin/auditorias` | Lista auditoria |
| `GET /api/telas/fonte` | Fonte da tela para superadmin |
| `GET /api/cotacao-frete/dashboard` | Indicadores |
| `GET /api/cotacao-frete/cotacoes` | Lista cotacoes |
| `GET /api/cotacao-frete/cotacoes/:id` | Detalhe da cotacao |
| `POST /api/cotacao-frete/cotacoes/:id/tokens` | Gera token publico |
| `POST /api/cotacao-frete/cotacoes/:id/escolher-transportadora` | Escolhe vencedora |
| `POST /api/cotacao-frete/cotacoes/:id/alterar-etapa` | Altera etapa |
| `POST /api/cotacao-frete/cotacoes/:id/bloquear-erp` | Bloqueia por ERP |
| `GET /api/publico/cotacao/:token` | Consulta publica |
| `POST /api/publico/cotacao/:token/responder` | Resposta publica |
| `POST /api/integracoes/erp/cotacoes` | Recebimento interno de cotacao ERP |
| `GET /api/integracoes/erp/pendentes` | Lista pendencias de atualizacao ERP |
| `POST /api/integracoes/erp/cotacoes/:id/confirmar-atualizacao` | Confirma atualizacao ERP e bloqueia cotacao |

## 5. Views para ERP/N8N

- `vw_cotacoes_frete_resumo`
- `vw_cotacoes_frete_transportadoras`
- `vw_cotacoes_frete_pendentes_erp`

## 6. Checklist entregue

- Arquitetura inicial.
- Modelagem PostgreSQL.
- DDL inicial.
- Seed inicial com superadmin.
- Empresas, usuarios, perfis, permissoes e auditoria.
- Selecao de empresa ativa com novo token.
- Tela transitoria de selecao de modulo apos login, com card `🚚 Cotação de Frete`.
- Menu lateral recolhivel.
- Transportadoras.
- Etapas do kanban.
- Cotacoes de frete.
- Dashboard inicial.
- Kanban inicial.
- Detalhe e comparativo de cotacao.
- Detalhamento completo dos dados da cotacao e produtos.
- Geracao de token.
- Pagina publica sem login.
- Resposta da transportadora.
- Escolha de transportadora vencedora.
- Bloqueio ERP.
- Views para integracao externa.
- Scripts Windows iniciais.
- Build validado.

## 7. Pendencias externas

- Banco local aplicado com `postgres / controls`.
- Confirmacao do layout final de envio de dados do ERP.
- Confirmacao de como o N8N marcara `atualizado_no_erp`.
- Canal real de envio de link para transportadora.
- Regras finais de SLA, expiracao e reutilizacao de token por cliente.
- Publicacao/dominio final por empresa.

## 8. Proximos refinamentos recomendados

- Formularios completos com edicao em linha.
- Drag and drop real no kanban.
- Filtros avancados na tela de cotacoes.
- Upload de logo/fundo por empresa.
- Backup automatico antes de migrations.
- Testes automatizados de API.
- Permissoes aplicadas como middleware granular em todos os endpoints.
