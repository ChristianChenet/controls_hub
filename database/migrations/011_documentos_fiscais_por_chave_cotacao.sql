-- CONTROL S HUB
-- Separacao de NF-e e CT-e por chave natural da cotacao.
-- A chave operacional dos documentos fiscais passa a ser:
-- EMPRESA_ID, TIPO_DOCUMENTO, NUMERO_DOCUMENTO, CODIGO_CHAVE.
-- Observacao: os documentos nao usam mais ID de cotacao como chave de negocio.

CREATE TABLE IF NOT EXISTS cotacoes_frete_notas_fiscais (
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  tipo_documento VARCHAR(30) NOT NULL,
  numero_documento VARCHAR(80) NOT NULL,
  codigo_chave VARCHAR(120) NOT NULL,
  numero_nfe VARCHAR(80) NOT NULL,
  chave_nfe VARCHAR(80) NOT NULL DEFAULT '',
  data_nfe TIMESTAMPTZ,
  finalidade_nfe VARCHAR(40),
  valorfrete_nfe NUMERIC(15, 2),
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cotacoes_frete_notas_fiscais_pk PRIMARY KEY (
    empresa_id,
    tipo_documento,
    numero_documento,
    codigo_chave,
    numero_nfe,
    chave_nfe
  )
);

CREATE TABLE IF NOT EXISTS cotacoes_frete_ctes (
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  tipo_documento VARCHAR(30) NOT NULL,
  numero_documento VARCHAR(80) NOT NULL,
  codigo_chave VARCHAR(120) NOT NULL,
  numero_cte VARCHAR(80) NOT NULL,
  chave_cte VARCHAR(80) NOT NULL DEFAULT '',
  data_cte TIMESTAMPTZ,
  finalidade_cte VARCHAR(40),
  valorfrete_cte NUMERIC(15, 2),
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cotacoes_frete_ctes_pk PRIMARY KEY (
    empresa_id,
    tipo_documento,
    numero_documento,
    codigo_chave,
    numero_cte,
    chave_cte
  )
);

INSERT INTO cotacoes_frete_notas_fiscais (
  empresa_id,
  tipo_documento,
  numero_documento,
  codigo_chave,
  numero_nfe,
  chave_nfe,
  data_nfe,
  finalidade_nfe,
  valorfrete_nfe,
  alterado_em
)
SELECT
  c.empresa_id,
  c.tipo_documento,
  c.numero_documento,
  c.codigo_chave,
  c.numero_nfe_faturada,
  COALESCE(c.chave_nfe, ''),
  c.faturado_em,
  'REVENDA',
  c.valor_frete_venda,
  COALESCE(c.atualizado_em, c.criado_em, NOW())
FROM cotacoes_frete c
WHERE c.numero_nfe_faturada IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO cotacoes_frete_ctes (
  empresa_id,
  tipo_documento,
  numero_documento,
  codigo_chave,
  numero_cte,
  chave_cte,
  data_cte,
  finalidade_cte,
  valorfrete_cte,
  alterado_em
)
SELECT
  c.empresa_id,
  c.tipo_documento,
  c.numero_documento,
  c.codigo_chave,
  c.numero_cte,
  '',
  c.cte_recebido_em,
  'ENTREGA',
  c.valor_frete_cte,
  COALESCE(c.atualizado_em, c.criado_em, NOW())
FROM cotacoes_frete c
WHERE c.numero_cte IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_notas_chave
  ON cotacoes_frete_notas_fiscais (
    empresa_id,
    tipo_documento,
    numero_documento,
    codigo_chave
  );

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_notas_alterado
  ON cotacoes_frete_notas_fiscais (alterado_em);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_ctes_chave
  ON cotacoes_frete_ctes (
    empresa_id,
    tipo_documento,
    numero_documento,
    codigo_chave
  );

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_ctes_alterado
  ON cotacoes_frete_ctes (alterado_em);

ALTER TABLE cotacoes_frete
  DROP COLUMN IF EXISTS numero_nfe_faturada,
  DROP COLUMN IF EXISTS chave_nfe,
  DROP COLUMN IF EXISTS numero_cte,
  DROP COLUMN IF EXISTS transportadora_cte_id,
  DROP COLUMN IF EXISTS transportadora_cte_codigo,
  DROP COLUMN IF EXISTS transportadora_cte_nome,
  DROP COLUMN IF EXISTS valor_frete_cte,
  DROP COLUMN IF EXISTS prazo_cte_dias,
  DROP COLUMN IF EXISTS payload_cte;
