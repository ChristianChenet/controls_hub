# Fonte das Telas

| Tela | Rota | Frontend | Backend | Endpoints | Tabelas |
|---|---|---|---|---|---|
| Dashboard | `/Dashboard` | `apps/frontend/src/App.tsx` | `apps/backend/src/app.ts` | `/api/cotacao-frete/dashboard` | `cotacoes_frete`, `cotacoes_frete_transportadoras` |
| Cotacoes | `/Cotacao_Frete` | `apps/frontend/src/App.tsx` | `repositorioCotacaoFrete.ts` | `/api/cotacao-frete/cotacoes`, `/api/cotacao-frete/cotacoes/:id` | `cotacoes_frete`, `cotacoes_frete_itens`, `cotacoes_frete_transportadoras`, `cotacoes_frete_notas_fiscais`, `cotacoes_frete_ctes` |
| Envio em Massa | `/Cotacao_Frete/Envio_Massa` | `apps/frontend/src/App.tsx` | `repositorioEnvioMassa.ts` | `/api/cotacao-frete/envio-massa/pedidos`, `/preparar`, `/enviar` | `cotacoes_frete_envios`, `cotacoes_frete_envios_fornecedores`, `cotacoes_frete_envios_itens` |
| Kanban | `/Cotacao_Frete/Kanban` | `apps/frontend/src/App.tsx` | `repositorioCotacaoFrete.ts` | `/api/cotacao-frete/kanban`, `/alterar-etapa` | `etapas_kanban`, `cotacoes_frete` |
| Transportadoras | `/Cotacao_Frete/Transportadoras` | `apps/frontend/src/App.tsx` | `repositorioCadastrosCotacao.ts` | `/api/cotacao-frete/transportadoras` | `transportadoras`, `transportadoras_empresas` |
| Etapas Kanban | `/Cotacao_Frete/Etapas_Kanban` | `apps/frontend/src/App.tsx` | `repositorioCadastrosCotacao.ts` | `/api/cotacao-frete/etapas` | `etapas_kanban` |
| Empresas | `/Empresas` | `apps/frontend/src/App.tsx` | `repositorioAdministracao.ts` | `/api/admin/empresas` | `empresas` |
| Usuarios | `/Usuarios` | `apps/frontend/src/App.tsx` | `repositorioAdministracao.ts` | `/api/admin/usuarios` | `usuarios`, `usuarios_empresas`, `usuarios_configuracoes_email` |
| Perfis e Direitos | `/Perfis_Direitos` | `apps/frontend/src/App.tsx` | `repositorioAdministracao.ts` | `/api/admin/perfis` | `perfis`, `perfis_permissoes` |
| Matriz de Permissoes | `/Matriz_Permissoes` | `apps/frontend/src/App.tsx` | `repositorioAdministracao.ts` | `/api/admin/perfis/:id/permissoes` | `perfis_permissoes`, `modulos`, `menus`, `telas`, `botoes`, `acoes` |
| Auditoria | `/Auditoria` | `apps/frontend/src/App.tsx` | `repositorioAdministracao.ts` | `/api/admin/auditorias` | `auditorias` |
| Configuracoes de E-mail | `/Configuracoes_Email` | `apps/frontend/src/App.tsx` | `repositorioEmailUsuario.ts` | `/api/admin/configuracoes-email` | `usuarios_configuracoes_email` |
| Configuracoes | `/Configuracoes` | `apps/frontend/src/App.tsx` | `repositorioAdministracao.ts` | `/api/admin/parametros-sistema` | `parametros_sistema`, `parametros_empresa`, `empresas` |

