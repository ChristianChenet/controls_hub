-- CONTROL S HUB
-- Origens que obrigam uso da transportadora do pedido e motivos de escolha.

CREATE TABLE IF NOT EXISTS motivos_escolha_transportadora (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  descricao VARCHAR(220) NOT NULL,
  padrao_transportadora_pedido BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ
);

ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_id BIGINT REFERENCES motivos_escolha_transportadora(id),
  ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_descricao TEXT;

INSERT INTO motivos_escolha_transportadora (
  codigo,
  descricao,
  padrao_transportadora_pedido,
  ativo
)
VALUES (
  'TRANSPORTADORA_DEFINIDA_NO_PEDIDO',
  'Transportadora definida no pedido/origem comercial',
  TRUE,
  TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  padrao_transportadora_pedido = TRUE,
  ativo = TRUE,
  alterado_em = NOW();

INSERT INTO parametros_sistema (chave, valor, descricao, sensivel)
VALUES
  ('ORIGENS_OBRIGAM_TRANSPORTADORA_PEDIDO', '', 'Origens comerciais que obrigam escolher a transportadora do pedido.', FALSE),
  ('MOTIVO_PADRAO_TRANSPORTADORA_PEDIDO_ID', '', 'Motivo padrao usado quando a transportadora do pedido for obrigatoria.', FALSE)
ON CONFLICT (chave) DO NOTHING;
