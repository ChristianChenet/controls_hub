-- CONTROL S HUB
-- Configuracoes visuais/funcionais para transportadora, e-mail e preferencias do usuario.

ALTER TABLE transportadoras
  ADD COLUMN IF NOT EXISTS apresenta_menor_cotacao BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS apresenta_cubagem BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS apresenta_peso BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS apresenta_valor_tabela BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE usuarios_configuracoes_email
  ADD COLUMN IF NOT EXISTS descricao VARCHAR(160),
  ADD COLUMN IF NOT EXISTS assinatura_html TEXT,
  ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES empresas(id),
  ADD COLUMN IF NOT EXISTS padrao BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS configuracao_email_padrao_id BIGINT REFERENCES usuarios_configuracoes_email(id),
  ADD COLUMN IF NOT EXISTS preferencias_interface JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS cor_apoio VARCHAR(20) DEFAULT '#2EE66F';

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES
  ('ALTERAR_COTACAO_MANUAL', 'Alterar Cotacao Manual', 'Permite alterar manualmente valor recebido da transportadora.', TRUE),
  ('VISUALIZAR_VALOR_AUTOMATICO', 'Visualizar Valor Automatico', 'Permite visualizar valores recebidos do ERP.', TRUE),
  ('VISUALIZAR_MENOR_VALOR_ATUAL', 'Visualizar Menor Valor Atual', 'Permite visualizar menor valor atual da cotacao.', TRUE),
  ('VISUALIZAR_CUBAGEM', 'Visualizar Cubagem', 'Permite visualizar cubagem na cotacao publica.', TRUE),
  ('VISUALIZAR_PESO', 'Visualizar Peso', 'Permite visualizar peso na cotacao publica.', TRUE),
  ('VISUALIZAR_VALOR_TABELA', 'Visualizar Valor Tabela', 'Permite visualizar valor de tabela da transportadora.', TRUE),
  ('VISUALIZAR_LINK_INTERNO_TRANSPORTADORA', 'Visualizar Link Interno Transportadora', 'Permite abrir a tela interna de validacao do link.', TRUE),
  ('IMPRIMIR_RESUMO_COTACAO', 'Imprimir Resumo da Cotacao', 'Permite imprimir resumo da cotacao enviada.', TRUE),
  ('CONFIGURAR_EMAIL', 'Configurar E-mail', 'Permite configurar contas de e-mail de envio.', TRUE),
  ('VINCULAR_EMAIL_USUARIO', 'Vincular E-mail ao Usuario', 'Permite vincular configuracao de e-mail ao usuario.', TRUE),
  ('REORGANIZAR_MENU_LATERAL', 'Reorganizar Menu Lateral', 'Permite reorganizar o menu lateral.', TRUE),
  ('REORGANIZAR_COLUNAS_KANBAN', 'Reorganizar Colunas Kanban', 'Permite reorganizar colunas do kanban.', TRUE)
ON CONFLICT (codigo) DO NOTHING;

