-- CONTROL S HUB
-- Ajustes de UX: imagens em base64, filtros por data e timeline rica.

ALTER TABLE empresas
  ALTER COLUMN caminho_logo TYPE TEXT,
  ALTER COLUMN caminho_imagem_fundo TYPE TEXT;

ALTER TABLE cotacoes_frete_timeline
  ADD COLUMN IF NOT EXISTS tipo_midia VARCHAR(30),
  ADD COLUMN IF NOT EXISTS midia_base64 TEXT,
  ADD COLUMN IF NOT EXISTS transcricao_audio TEXT;

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_data_documento
  ON cotacoes_frete (empresa_id, data_documento);
