-- Control S HUB
-- Consolidacao de permissoes granulares do Cadastro de Produto Central.

ALTER TABLE product_field_history
  ADD COLUMN IF NOT EXISTS comentario TEXT;

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES
  ('PIM_VISUALIZAR_DASHBOARD', 'PIM - Visualizar Dashboard', 'Permite visualizar o dashboard do Cadastro de Produto Central.', TRUE),
  ('PIM_VISUALIZAR_PRODUTOS', 'PIM - Visualizar Produtos', 'Permite visualizar produtos.', TRUE),
  ('PIM_VISUALIZAR_COMPONENTES', 'PIM - Visualizar Componentes', 'Permite visualizar componentes.', TRUE),
  ('PIM_VISUALIZAR_CONJUNTOS', 'PIM - Visualizar Conjuntos', 'Permite visualizar conjuntos.', TRUE),
  ('PIM_VISUALIZAR_SKUS', 'PIM - Visualizar SKUs', 'Permite visualizar SKUs.', TRUE),
  ('PIM_VISUALIZAR_ATRIBUTOS', 'PIM - Visualizar Atributos', 'Permite visualizar atributos.', TRUE),
  ('PIM_VISUALIZAR_CATEGORIAS', 'PIM - Visualizar Categorias', 'Permite visualizar categorias e taxonomias.', TRUE),
  ('PIM_VISUALIZAR_TEMPLATES', 'PIM - Visualizar Templates', 'Permite visualizar templates de produto.', TRUE),
  ('PIM_VISUALIZAR_ASSETS', 'PIM - Visualizar Assets', 'Permite visualizar biblioteca de imagens e documentos.', TRUE),
  ('PIM_VISUALIZAR_IMPORTACAO', 'PIM - Visualizar Importacao', 'Permite visualizar importacoes.', TRUE),
  ('PIM_VISUALIZAR_EXPORTACAO', 'PIM - Visualizar Exportacao', 'Permite exportar dados do PIM.', TRUE),
  ('PIM_VISUALIZAR_SEO', 'PIM - Visualizar SEO', 'Permite visualizar e editar SEO.', TRUE),
  ('PIM_VISUALIZAR_WORKFLOW', 'PIM - Visualizar Workflow', 'Permite visualizar workflow.', TRUE),
  ('PIM_VISUALIZAR_APROVACAO', 'PIM - Visualizar Aprovacao', 'Permite visualizar aprovacoes.', TRUE),
  ('PIM_VISUALIZAR_PUBLICACAO', 'PIM - Visualizar Publicacao', 'Permite visualizar publicacoes.', TRUE),
  ('PIM_VISUALIZAR_INTEGRACOES', 'PIM - Visualizar Integracoes', 'Permite visualizar integracoes.', TRUE),
  ('PIM_VISUALIZAR_IA', 'PIM - Visualizar IA', 'Permite visualizar recursos de IA.', TRUE),
  ('PIM_VISUALIZAR_CONFIGURACOES', 'PIM - Visualizar Configuracoes', 'Permite visualizar configuracoes do modulo.', TRUE),
  ('PIM_VISUALIZAR_LOGS', 'PIM - Visualizar Logs', 'Permite visualizar logs do modulo.', TRUE),
  ('PIM_VISUALIZAR_AUDITORIA', 'PIM - Visualizar Auditoria', 'Permite visualizar auditoria do modulo.', TRUE),
  ('PIM_CRIAR', 'PIM - Criar', 'Permite criar registros no PIM.', TRUE),
  ('PIM_EDITAR', 'PIM - Editar', 'Permite editar registros no PIM.', TRUE),
  ('PIM_EXCLUIR', 'PIM - Excluir', 'Permite excluir logicamente registros no PIM.', TRUE),
  ('PIM_RESTAURAR', 'PIM - Restaurar', 'Permite restaurar registros excluidos no PIM.', TRUE),
  ('PIM_ARQUIVAR', 'PIM - Arquivar', 'Permite arquivar registros no PIM.', TRUE),
  ('PIM_REATIVAR', 'PIM - Reativar', 'Permite reativar registros no PIM.', TRUE),
  ('PIM_DUPLICAR', 'PIM - Duplicar', 'Permite duplicar registros no PIM.', TRUE),
  ('PIM_IMPORTAR', 'PIM - Importar', 'Permite importar arquivos para o PIM.', TRUE),
  ('PIM_EXPORTAR', 'PIM - Exportar', 'Permite exportar dados do PIM.', TRUE),
  ('PIM_PUBLICAR', 'PIM - Publicar', 'Permite publicar produtos.', TRUE),
  ('PIM_APROVAR', 'PIM - Aprovar', 'Permite aprovar produtos.', TRUE),
  ('PIM_REJEITAR', 'PIM - Rejeitar', 'Permite rejeitar produtos.', TRUE),
  ('PIM_SOLICITAR_AJUSTES', 'PIM - Solicitar Ajustes', 'Permite solicitar ajustes em aprovacao.', TRUE)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

INSERT INTO perfis_permissoes (perfil_id, empresa_id, modulo_id, acao_id, permitido)
SELECT p.id, e.id, m.id, a.id, TRUE
FROM perfis p
CROSS JOIN empresas e
CROSS JOIN modulos m
CROSS JOIN acoes a
WHERE p.codigo = 'ADMINISTRADOR_GERAL'
  AND m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
  AND a.codigo LIKE 'PIM_%'
ON CONFLICT DO NOTHING;
