-- CONTROL S HUB
-- Cadastro de Produto Central: carga manual de produtos a partir de SQL Server.
-- Objetos novos e isolados do modulo PIM. Nao altera Cotacao de Frete.

CREATE TABLE IF NOT EXISTS pim_conexoes_sqlserver (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome VARCHAR(140) NOT NULL,
  host VARCHAR(180) NOT NULL,
  porta INTEGER NOT NULL DEFAULT 1433,
  banco VARCHAR(140) NOT NULL,
  usuario VARCHAR(140) NOT NULL,
  senha TEXT,
  ambiente VARCHAR(40) NOT NULL DEFAULT 'PRODUCAO',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  opcoes JSONB NOT NULL DEFAULT '{}'::JSONB,
  ultima_validacao_em TIMESTAMPTZ,
  ultima_mensagem TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT pim_conexoes_sqlserver_nome_unico UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS pim_cargas_sqlserver (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  conexao_id BIGINT REFERENCES pim_conexoes_sqlserver(id),
  nome VARCHAR(160) NOT NULL,
  tipo_carga VARCHAR(60) NOT NULL DEFAULT 'PRODUTO_MESTRE',
  consulta_sql TEXT NOT NULL,
  modo_carga VARCHAR(40) NOT NULL DEFAULT 'APENAS_VALIDAR',
  status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  colunas_detectadas JSONB NOT NULL DEFAULT '[]'::JSONB,
  mapeamento JSONB NOT NULL DEFAULT '{}'::JSONB,
  previa JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_linhas INTEGER NOT NULL DEFAULT 0,
  produtos_processados INTEGER NOT NULL DEFAULT 0,
  produtos_inseridos INTEGER NOT NULL DEFAULT 0,
  produtos_atualizados INTEGER NOT NULL DEFAULT 0,
  produtos_com_erro INTEGER NOT NULL DEFAULT 0,
  logs JSONB NOT NULL DEFAULT '[]'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executado_em TIMESTAMPTZ,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_pim_conexoes_sqlserver_empresa ON pim_conexoes_sqlserver(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_pim_cargas_sqlserver_empresa ON pim_cargas_sqlserver(empresa_id, criado_em DESC);

ALTER TABLE pim_cargas_sqlserver
  ADD COLUMN IF NOT EXISTS tipo_carga VARCHAR(60) NOT NULL DEFAULT 'PRODUTO_MESTRE';
