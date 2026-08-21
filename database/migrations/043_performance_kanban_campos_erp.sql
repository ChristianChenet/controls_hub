-- Ajustes aditivos para estabilidade e performance do Kanban.
-- Nao remove dados e nao recria tabelas produtivas.

ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS atualizado_no_erp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS atualizado_no_erp_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retorno_erp_status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS retorno_erp_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_kanban_filtros
  ON cotacoes_frete (empresa_id, etapa_kanban_id, criado_em, data_documento)
  WHERE COALESCE(excluido, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_kanban_documento
  ON cotacoes_frete (empresa_id, numero_documento, codigo_chave)
  WHERE COALESCE(excluido, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_transportadoras_chave_status
  ON cotacoes_frete_transportadoras (empresa_id, tipo_documento, numero_documento, codigo_chave, status, transportadora_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_tokens_chave_transportadora
  ON cotacoes_frete_tokens (empresa_id, tipo_documento, numero_documento, codigo_chave, transportadora_id, gerado_em DESC);
