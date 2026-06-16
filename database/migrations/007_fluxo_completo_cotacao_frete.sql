-- CONTROL S HUB
-- Complemento operacional para Marketplace, Televendas, prazo, SLA, links e timeline.

ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS origem_comercial VARCHAR(30) NOT NULL DEFAULT 'ERP',
  ADD COLUMN IF NOT EXISTS transportadora_pedido_id BIGINT REFERENCES transportadoras(id),
  ADD COLUMN IF NOT EXISTS transportadora_pedido_codigo VARCHAR(80),
  ADD COLUMN IF NOT EXISTS transportadora_pedido_nome VARCHAR(180),
  ADD COLUMN IF NOT EXISTS valor_frete_pedido NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS prazo_pedido_dias INTEGER,
  ADD COLUMN IF NOT EXISTS prazo_vendedor_dias INTEGER,
  ADD COLUMN IF NOT EXISTS prazo_final_dias INTEGER,
  ADD COLUMN IF NOT EXISTS valor_frete_final NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS observacao_analista TEXT,
  ADD COLUMN IF NOT EXISTS aprovado_por_usuario_id BIGINT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retorno_erp_status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS retorno_erp_tentativas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retorno_erp_erro TEXT,
  ADD COLUMN IF NOT EXISTS retorno_erp_payload JSONB,
  ADD COLUMN IF NOT EXISTS idempotencia_origem VARCHAR(120);

ALTER TABLE cotacoes_frete_transportadoras
  ADD COLUMN IF NOT EXISTS prazo_dias INTEGER,
  ADD COLUMN IF NOT EXISTS prazo_origem VARCHAR(30),
  ADD COLUMN IF NOT EXISTS valor_original NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS prazo_original_dias INTEGER,
  ADD COLUMN IF NOT EXISTS observacao_analista TEXT,
  ADD COLUMN IF NOT EXISTS origem_detalhada VARCHAR(40),
  ADD COLUMN IF NOT EXISTS solicitada_por_link BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resposta_obrigatoria_prazo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sla_limite_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS respondida_em TIMESTAMPTZ;

ALTER TABLE transportadoras
  ADD COLUMN IF NOT EXISTS sla_resposta_horas INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS recebe_prazo_solicitado BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS exige_prazo_resposta BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prazo_resposta_obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS apresenta_lista_produtos BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE cotacoes_frete_tokens
  ADD COLUMN IF NOT EXISTS url_publica TEXT,
  ADD COLUMN IF NOT EXISTS ambiente_link VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visualizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultimo_acesso_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_acessos INTEGER NOT NULL DEFAULT 0;

ALTER TABLE cotacoes_frete_envios_fornecedores
  ADD COLUMN IF NOT EXISTS url_publica TEXT,
  ADD COLUMN IF NOT EXISTS sla_limite_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visualizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS respondido_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS cotacoes_frete_timeline (
  id BIGSERIAL PRIMARY KEY,
  cotacao_frete_id BIGINT NOT NULL REFERENCES cotacoes_frete(id) ON DELETE CASCADE,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  transportadora_id BIGINT REFERENCES transportadoras(id),
  usuario_id BIGINT REFERENCES usuarios(id),
  tipo_evento VARCHAR(60) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  descricao TEXT,
  dados_evento JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_origem
  ON cotacoes_frete (empresa_id, origem_comercial);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_idempotencia
  ON cotacoes_frete (empresa_id, idempotencia_origem)
  WHERE idempotencia_origem IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_timeline_cotacao
  ON cotacoes_frete_timeline (cotacao_frete_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_transportadoras_sla
  ON cotacoes_frete_transportadoras (cotacao_frete_id, sla_limite_em);
