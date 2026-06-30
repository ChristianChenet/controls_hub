-- Campos para controlar quando a transportadora deve informar o numero da propria cotacao.
ALTER TABLE transportadoras
  ADD COLUMN IF NOT EXISTS solicita_numero_cotacao BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cotacoes_frete_transportadoras
  ADD COLUMN IF NOT EXISTS numero_cotacao_transportadora VARCHAR(80);

-- Campos de coleta/emitente recebidos do ERP para exibicao no link publico.
ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS cnpj_emitente VARCHAR(20),
  ADD COLUMN IF NOT EXISTS endereco_coleta TEXT,
  ADD COLUMN IF NOT EXISTS cep_coleta VARCHAR(12),
  ADD COLUMN IF NOT EXISTS cidade_coleta VARCHAR(120),
  ADD COLUMN IF NOT EXISTS uf_coleta CHAR(2);
