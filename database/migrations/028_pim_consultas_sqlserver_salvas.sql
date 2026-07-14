-- CONTROL S HUB
-- Cadastro de Produto Central: modelos de consultas SQL Server para reutilizacao.
-- Objetos novos e isolados do modulo PIM. Nao altera Cotacao de Frete.

CREATE TABLE IF NOT EXISTS pim_consultas_sqlserver (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  conexao_id BIGINT REFERENCES pim_conexoes_sqlserver(id),
  nome VARCHAR(180) NOT NULL,
  descricao TEXT,
  tipo_carga VARCHAR(60) NOT NULL DEFAULT 'PRODUTO_MESTRE',
  consulta_sql TEXT NOT NULL,
  modo_carga_padrao VARCHAR(40) NOT NULL DEFAULT 'APENAS_VALIDAR',
  mapeamento JSONB NOT NULL DEFAULT '{}'::JSONB,
  colunas_detectadas JSONB NOT NULL DEFAULT '[]'::JSONB,
  parametros JSONB NOT NULL DEFAULT '[]'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_pim_consultas_sqlserver_empresa
  ON pim_consultas_sqlserver(empresa_id, ativo, tipo_carga);

CREATE INDEX IF NOT EXISTS idx_pim_consultas_sqlserver_nome
  ON pim_consultas_sqlserver(empresa_id, nome);

ALTER TABLE pim_consultas_sqlserver
  ADD COLUMN IF NOT EXISTS parametros JSONB NOT NULL DEFAULT '[]'::JSONB;
