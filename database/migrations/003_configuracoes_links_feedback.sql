-- CONTROL S HUB
-- Configuracoes de links publicos/internos e feedback obrigatorio por etapa.

ALTER TABLE etapas_kanban
  ADD COLUMN IF NOT EXISTS obriga_feedback BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cotacoes_frete_historicos
  ADD COLUMN IF NOT EXISTS feedback_usuario TEXT;

INSERT INTO parametros_sistema (chave, valor, descricao, sensivel)
VALUES
  ('AMBIENTE_LINK_COTACAO', 'HOMOLOGACAO', 'Define se o link gerado para transportadora usa URL interna ou publica. Valores: HOMOLOGACAO ou PRODUCAO.', FALSE),
  ('URL_PUBLICA_COTACAO', 'https://hub.controlsconsultoria.com.br', 'URL publica base para links de cotacao enviados para transportadoras.', FALSE),
  ('URL_INTERNA_COTACAO', 'http://127.0.0.1:5174', 'URL interna/base homologacao para links de cotacao.', FALSE)
ON CONFLICT (chave) DO NOTHING;

