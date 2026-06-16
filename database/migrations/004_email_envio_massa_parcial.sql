-- CONTROL S HUB
-- E-mail por usuario, envios em massa, reenvio, parcial e situacao operacional do pedido.

ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS codigo_chave VARCHAR(120),
  ADD COLUMN IF NOT EXISTS situacao_pedido VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS excluido_origem_em TIMESTAMPTZ;

UPDATE cotacoes_frete
SET codigo_chave = CONCAT(numero_documento, '-P001')
WHERE codigo_chave IS NULL;

ALTER TABLE cotacoes_frete
  ALTER COLUMN codigo_chave SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cotacoes_frete_documento_unico'
  ) THEN
    ALTER TABLE cotacoes_frete
      DROP CONSTRAINT cotacoes_frete_documento_unico;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cotacoes_frete_documento_chave_unico'
  ) THEN
    ALTER TABLE cotacoes_frete
      ADD CONSTRAINT cotacoes_frete_documento_chave_unico UNIQUE (empresa_id, tipo_documento, numero_documento, codigo_chave);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS usuarios_configuracoes_email (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
  nome_remetente VARCHAR(160) NOT NULL,
  email_remetente VARCHAR(180) NOT NULL,
  servidor_smtp VARCHAR(180) NOT NULL,
  porta_smtp INTEGER NOT NULL DEFAULT 587,
  usuario_smtp VARCHAR(180),
  senha_smtp_criptografada BYTEA,
  seguranca VARCHAR(30) NOT NULL DEFAULT 'STARTTLS',
  email_resposta VARCHAR(180),
  permite_envio_cotacao BOOLEAN NOT NULL DEFAULT TRUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  teste_status VARCHAR(30),
  teste_mensagem TEXT,
  testado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ,
  CONSTRAINT usuarios_configuracoes_email_usuario_unico UNIQUE (usuario_id)
);

CREATE TABLE IF NOT EXISTS cotacoes_frete_envios (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  cotacao_frete_id BIGINT NOT NULL REFERENCES cotacoes_frete(id),
  codigo_chave VARCHAR(120) NOT NULL,
  parcial BOOLEAN NOT NULL DEFAULT FALSE,
  primeiro_envio BOOLEAN NOT NULL DEFAULT TRUE,
  status_envio VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  observacao TEXT,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  enviado_por_usuario_id BIGINT REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviado_em TIMESTAMPTZ,
  CONSTRAINT cotacoes_frete_envios_codigo_unico UNIQUE (empresa_id, codigo_chave)
);

CREATE TABLE IF NOT EXISTS cotacoes_frete_envios_itens (
  id BIGSERIAL PRIMARY KEY,
  envio_id BIGINT NOT NULL REFERENCES cotacoes_frete_envios(id) ON DELETE CASCADE,
  cotacao_frete_item_id BIGINT NOT NULL REFERENCES cotacoes_frete_itens(id),
  quantidade_enviada NUMERIC(15, 4),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cotacoes_frete_envios_itens_unico UNIQUE (envio_id, cotacao_frete_item_id)
);

CREATE TABLE IF NOT EXISTS cotacoes_frete_envios_fornecedores (
  id BIGSERIAL PRIMARY KEY,
  envio_id BIGINT NOT NULL REFERENCES cotacoes_frete_envios(id) ON DELETE CASCADE,
  transportadora_id BIGINT NOT NULL REFERENCES transportadoras(id),
  token_id BIGINT REFERENCES cotacoes_frete_tokens(id),
  email_destino VARCHAR(180),
  status_envio VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  primeiro_envio BOOLEAN NOT NULL DEFAULT TRUE,
  reenvio BOOLEAN NOT NULL DEFAULT FALSE,
  tentativas INTEGER NOT NULL DEFAULT 0,
  enviado_em TIMESTAMPTZ,
  erro_envio TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cotacoes_frete_envios_fornecedores_unico UNIQUE (envio_id, transportadora_id)
);

ALTER TABLE cotacoes_frete_tokens
  ADD COLUMN IF NOT EXISTS envio_id BIGINT REFERENCES cotacoes_frete_envios(id);

ALTER TABLE cotacoes_frete_historicos
  ADD COLUMN IF NOT EXISTS envio_id BIGINT REFERENCES cotacoes_frete_envios(id),
  ADD COLUMN IF NOT EXISTS codigo_chave VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_codigo_chave
  ON cotacoes_frete (empresa_id, codigo_chave);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_situacao
  ON cotacoes_frete (empresa_id, situacao_pedido);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_envios_cotacao
  ON cotacoes_frete_envios (cotacao_frete_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_envios_fornecedores_envio
  ON cotacoes_frete_envios_fornecedores (envio_id);
