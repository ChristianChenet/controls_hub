-- CONTROL S HUB
-- Modulo Frota: cadastros, despesas, importacao, validacao, auditoria e permissoes.

BEGIN;

INSERT INTO modulos (codigo, nome, descricao, icone, ordem, ativo)
VALUES (
  'FROTA',
  'Frota',
  'Gestao de frota, veiculos, despesas, importacoes e validacao.',
  'Car',
  35,
  TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

INSERT INTO modulos (codigo, nome, descricao, icone, ordem, ativo)
VALUES (
  'KM_MOBILE',
  'KM Mobile',
  'Aplicativo mobile para motoristas e mecanicos apontarem KM pelo celular.',
  'Smartphone',
  36,
  TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

CREATE TABLE IF NOT EXISTS frota_configuracoes (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  modulo_id BIGINT NOT NULL REFERENCES modulos(id),
  chave VARCHAR(120) NOT NULL,
  valor JSONB NOT NULL DEFAULT '{}'::JSONB,
  sensivel BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_configuracoes_chave_unica UNIQUE (empresa_id, modulo_id, chave)
);

CREATE TABLE IF NOT EXISTS frota_departamentos (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  codigo_decis VARCHAR(60) NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  filial_decis VARCHAR(60),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_departamentos_codigo_empresa_unico UNIQUE (empresa_id, codigo_decis)
);

ALTER TABLE frota_departamentos
  ADD COLUMN IF NOT EXISTS filial_decis VARCHAR(60),
  ADD COLUMN IF NOT EXISTS codigo_origem_decis VARCHAR(60);

CREATE TABLE IF NOT EXISTS frota_motoristas (
  id BIGSERIAL PRIMARY KEY,
  codigo_decis VARCHAR(60) NOT NULL,
  nome VARCHAR(180) NOT NULL,
  usuario_id BIGINT REFERENCES usuarios(id),
  departamento_id BIGINT REFERENCES frota_departamentos(id),
  ajudante BOOLEAN NOT NULL DEFAULT FALSE,
  ajudante_padrao VARCHAR(180),
  ajudante_padrao_motorista_id BIGINT REFERENCES frota_motoristas(id),
  coordenador_padrao_motorista_id BIGINT REFERENCES frota_motoristas(id),
  coordenador BOOLEAN NOT NULL DEFAULT FALSE,
  codigo_coordenador_decis VARCHAR(60),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_motoristas_codigo_unico UNIQUE (codigo_decis)
);

ALTER TABLE frota_motoristas
  ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS departamento_id BIGINT REFERENCES frota_departamentos(id),
  ADD COLUMN IF NOT EXISTS ajudante BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ajudante_padrao VARCHAR(180),
  ADD COLUMN IF NOT EXISTS ajudante_padrao_motorista_id BIGINT REFERENCES frota_motoristas(id),
  ADD COLUMN IF NOT EXISTS coordenador_padrao_motorista_id BIGINT REFERENCES frota_motoristas(id),
  ADD COLUMN IF NOT EXISTS coordenador BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS codigo_coordenador_decis VARCHAR(60);

DROP INDEX IF EXISTS idx_frota_motoristas_usuario_unico;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM frota_motoristas
    WHERE usuario_id IS NOT NULL
      AND excluido = FALSE
    GROUP BY usuario_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_frota_motoristas_usuario_unico
    ON frota_motoristas(usuario_id)
    WHERE usuario_id IS NOT NULL
      AND excluido = FALSE;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS frota_tipos_despesas (
  id BIGSERIAL PRIMARY KEY,
  codigo_decis VARCHAR(60) NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  natureza_credito_decis VARCHAR(20) NOT NULL DEFAULT '2',
  conf_custo_decis VARCHAR(60),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_tipos_despesas_codigo_unico UNIQUE (codigo_decis)
);

ALTER TABLE frota_tipos_despesas
  ADD COLUMN IF NOT EXISTS natureza_credito_decis VARCHAR(20) NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS conf_custo_decis VARCHAR(60);

CREATE TABLE IF NOT EXISTS frota_fornecedores (
  id BIGSERIAL PRIMARY KEY,
  codigo_decis VARCHAR(60) NOT NULL,
  nome VARCHAR(180) NOT NULL,
  nome_fantasia VARCHAR(180),
  codigo_forma_pagamento_decis VARCHAR(60),
  descricao_forma_pagamento VARCHAR(180),
  dia_vencimento INTEGER,
  natureza_credito_decis VARCHAR(20),
  grupo_custo_decis VARCHAR(60),
  conf_custo_decis VARCHAR(60),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_fornecedores_codigo_unico UNIQUE (codigo_decis)
);

ALTER TABLE frota_fornecedores
  ADD COLUMN IF NOT EXISTS codigo_forma_pagamento_decis VARCHAR(60),
  ADD COLUMN IF NOT EXISTS descricao_forma_pagamento VARCHAR(180),
  ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER,
  ADD COLUMN IF NOT EXISTS natureza_credito_decis VARCHAR(20),
  ADD COLUMN IF NOT EXISTS grupo_custo_decis VARCHAR(60),
  ADD COLUMN IF NOT EXISTS conf_custo_decis VARCHAR(60);

ALTER TABLE frota_fornecedores
  DROP CONSTRAINT IF EXISTS frota_fornecedores_dia_vencimento_chk;

ALTER TABLE frota_fornecedores
  ADD CONSTRAINT frota_fornecedores_dia_vencimento_chk CHECK (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31);

CREATE TABLE IF NOT EXISTS frota_veiculos (
  id BIGSERIAL PRIMARY KEY,
  codigo_decis VARCHAR(60),
  placa VARCHAR(12) NOT NULL,
  modelo VARCHAR(140) NOT NULL,
  departamento_id BIGINT REFERENCES frota_departamentos(id),
  motorista_id BIGINT REFERENCES frota_motoristas(id),
  odometro_atual NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_veiculos_placa_unica UNIQUE (placa)
);

ALTER TABLE frota_veiculos
  ADD COLUMN IF NOT EXISTS codigo_decis VARCHAR(60);

CREATE TABLE IF NOT EXISTS frota_despesas_tipos (
  id BIGSERIAL PRIMARY KEY,
  fornecedor_id BIGINT REFERENCES frota_fornecedores(id),
  descricao_despesa VARCHAR(220) NOT NULL,
  tipo_despesa_id BIGINT NOT NULL REFERENCES frota_tipos_despesas(id),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_despesas_tipos_descricao_unica UNIQUE (descricao_despesa, fornecedor_id)
);

CREATE TABLE IF NOT EXISTS frota_mapeamentos_importacao (
  id BIGSERIAL PRIMARY KEY,
  fornecedor_id BIGINT NOT NULL REFERENCES frota_fornecedores(id),
  mapeamento JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_mapeamentos_fornecedor_unico UNIQUE (fornecedor_id)
);

CREATE TABLE IF NOT EXISTS frota_motivos_cancelamento (
  id BIGSERIAL PRIMARY KEY,
  codigo_decis VARCHAR(60),
  descricao VARCHAR(180) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_motivos_cancelamento_descricao_unica UNIQUE (descricao)
);

CREATE TABLE IF NOT EXISTS frota_motivos_sem_pedido (
  id BIGSERIAL PRIMARY KEY,
  codigo_decis VARCHAR(60),
  descricao VARCHAR(180) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_motivos_sem_pedido_descricao_unica UNIQUE (descricao)
);

CREATE TABLE IF NOT EXISTS frota_lotes_importacao (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  fornecedor_id BIGINT NOT NULL REFERENCES frota_fornecedores(id),
  nome_arquivo VARCHAR(260),
  usuario_id BIGINT REFERENCES usuarios(id),
  quantidade_linhas INTEGER NOT NULL DEFAULT 0,
  quantidade_importada INTEGER NOT NULL DEFAULT 0,
  quantidade_atualizada INTEGER NOT NULL DEFAULT 0,
  quantidade_ignorada INTEGER NOT NULL DEFAULT 0,
  quantidade_erro INTEGER NOT NULL DEFAULT 0,
  resultado VARCHAR(60) NOT NULL DEFAULT 'PENDENTE',
  mensagens_processamento JSONB NOT NULL DEFAULT '[]'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frota_integracoes_status (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  workflow_nome VARCHAR(180) NOT NULL DEFAULT 'CONTROL S - Integracao DECIS x Control S Hub - Frota',
  ultima_consulta_em TIMESTAMPTZ,
  ultima_integracao_em TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  mensagem TEXT,
  quantidade_lida INTEGER NOT NULL DEFAULT 0,
  quantidade_integrada INTEGER NOT NULL DEFAULT 0,
  quantidade_erro INTEGER NOT NULL DEFAULT 0,
  detalhes JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS frota_pedidos_venda (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  filial_decis VARCHAR(60),
  pedido VARCHAR(80) NOT NULL,
  departamento_codigo_decis VARCHAR(60),
  departamento_nome VARCHAR(180),
  departamento_vendedor VARCHAR(120),
  data_pedido DATE,
  cliente_codigo_decis VARCHAR(60),
  cliente_nome VARCHAR(220),
  cliente VARCHAR(220) NOT NULL,
  valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
  codigo_coordenador_decis VARCHAR(60),
  coordenador_nome VARCHAR(180),
  coordenador VARCHAR(180),
  pedido_sequencial VARCHAR(80),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_pedidos_venda_empresa_pedido_unico UNIQUE (empresa_id, pedido)
);

ALTER TABLE frota_pedidos_venda
  ADD COLUMN IF NOT EXISTS departamento_codigo_decis VARCHAR(60),
  ADD COLUMN IF NOT EXISTS departamento_nome VARCHAR(180),
  ADD COLUMN IF NOT EXISTS cliente_codigo_decis VARCHAR(60),
  ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(220),
  ADD COLUMN IF NOT EXISTS codigo_coordenador_decis VARCHAR(60),
  ADD COLUMN IF NOT EXISTS coordenador_nome VARCHAR(180);

UPDATE frota_pedidos_venda
SET cliente_nome = COALESCE(cliente_nome, cliente),
  coordenador_nome = COALESCE(coordenador_nome, coordenador),
  departamento_nome = COALESCE(departamento_nome, departamento_vendedor)
WHERE cliente_nome IS NULL
  OR coordenador_nome IS NULL
  OR departamento_nome IS NULL;

CREATE TABLE IF NOT EXISTS frota_apontamentos_km (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  pedido_venda_id BIGINT REFERENCES frota_pedidos_venda(id),
  sem_pedido BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_sem_pedido_id BIGINT REFERENCES frota_motivos_sem_pedido(id),
  motorista_id BIGINT REFERENCES frota_motoristas(id),
  veiculo_id BIGINT REFERENCES frota_veiculos(id),
  departamento_id BIGINT REFERENCES frota_departamentos(id),
  data_apontamento DATE NOT NULL,
  km_inicial NUMERIC(15, 2) NOT NULL DEFAULT 0,
  km_final NUMERIC(15, 2) NOT NULL DEFAULT 0,
  km_total NUMERIC(15, 2) GENERATED ALWAYS AS (GREATEST(km_final - km_inicial, 0)) STORED,
  ajudante_motorista_id BIGINT REFERENCES frota_motoristas(id),
  ajudante_motorista2_id BIGINT REFERENCES frota_motoristas(id),
  ajudante VARCHAR(180),
  manha_inicio TIME,
  manha_fim TIME,
  tarde_inicio TIME,
  tarde_fim TIME,
  noite_inicio TIME,
  noite_fim TIME,
  observacao TEXT,
  validado BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_validacao_id BIGINT REFERENCES usuarios(id),
  data_hora_validacao TIMESTAMPTZ,
  integrado BOOLEAN NOT NULL DEFAULT FALSE,
  data_hora_integracao TIMESTAMPTZ,
  usuario_inclusao_id BIGINT REFERENCES usuarios(id),
  data_hora_inclusao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_ultima_alteracao_id BIGINT REFERENCES usuarios(id),
  data_hora_ultima_alteracao TIMESTAMPTZ,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  cancelado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_cancelamento_id BIGINT REFERENCES frota_motivos_cancelamento(id),
  motivo_cancelamento_texto TEXT,
  usuario_cancelamento_id BIGINT REFERENCES usuarios(id),
  data_hora_cancelamento TIMESTAMPTZ,
  CONSTRAINT frota_apontamentos_km_valores_chk CHECK (km_inicial >= 0 AND km_final >= 0)
);

ALTER TABLE frota_apontamentos_km
  ALTER COLUMN pedido_venda_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS sem_pedido BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_sem_pedido_id BIGINT REFERENCES frota_motivos_sem_pedido(id),
  ADD COLUMN IF NOT EXISTS ajudante_motorista_id BIGINT REFERENCES frota_motoristas(id),
  ADD COLUMN IF NOT EXISTS ajudante_motorista2_id BIGINT REFERENCES frota_motoristas(id),
  ADD COLUMN IF NOT EXISTS cancelado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento_id BIGINT REFERENCES frota_motivos_cancelamento(id),
  ADD COLUMN IF NOT EXISTS motivo_cancelamento_texto TEXT,
  ADD COLUMN IF NOT EXISTS usuario_cancelamento_id BIGINT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS data_hora_cancelamento TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_frota_pedidos_venda_empresa ON frota_pedidos_venda(empresa_id, pedido);
CREATE INDEX IF NOT EXISTS idx_frota_pedidos_venda_coordenador ON frota_pedidos_venda(codigo_coordenador_decis);
CREATE INDEX IF NOT EXISTS idx_frota_apontamentos_km_periodo ON frota_apontamentos_km(empresa_id, data_apontamento DESC);
CREATE INDEX IF NOT EXISTS idx_frota_apontamentos_km_motorista ON frota_apontamentos_km(motorista_id);
CREATE INDEX IF NOT EXISTS idx_frota_apontamentos_km_veiculo ON frota_apontamentos_km(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_frota_apontamentos_km_validado ON frota_apontamentos_km(validado);
CREATE INDEX IF NOT EXISTS idx_frota_apontamentos_km_integrado ON frota_apontamentos_km(integrado);

CREATE TABLE IF NOT EXISTS frota_despesas (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  departamento_id BIGINT REFERENCES frota_departamentos(id),
  motorista_id BIGINT REFERENCES frota_motoristas(id),
  tipo_despesa_id BIGINT REFERENCES frota_tipos_despesas(id),
  fornecedor_id BIGINT NOT NULL REFERENCES frota_fornecedores(id),
  veiculo_id BIGINT REFERENCES frota_veiculos(id),
  placa VARCHAR(12),
  data_hora TIMESTAMPTZ NOT NULL,
  data_despesa DATE NOT NULL,
  hodometro NUMERIC(15, 2) NOT NULL DEFAULT 0,
  numero_documento VARCHAR(100) NOT NULL,
  fatura VARCHAR(100),
  descricao_despesa VARCHAR(220) NOT NULL,
  quantidade NUMERIC(15, 4) NOT NULL DEFAULT 0,
  unidade_despesa VARCHAR(30),
  valor_unitario NUMERIC(15, 4) NOT NULL DEFAULT 0,
  valor_unitario_liquido NUMERIC(15, 4) NOT NULL DEFAULT 0,
  valor_bruto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  desconto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  codigo_forma_pagamento_decis VARCHAR(60),
  descricao_forma_pagamento VARCHAR(180),
  dia_vencimento INTEGER,
  data_vencimento DATE,
  validado BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_validacao_id BIGINT REFERENCES usuarios(id),
  data_hora_validacao TIMESTAMPTZ,
  integrado BOOLEAN NOT NULL DEFAULT FALSE,
  data_hora_integracao TIMESTAMPTZ,
  cancelado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_cancelamento_id BIGINT REFERENCES frota_motivos_cancelamento(id),
  motivo_cancelamento_texto TEXT,
  usuario_cancelamento_id BIGINT REFERENCES usuarios(id),
  data_hora_cancelamento TIMESTAMPTZ,
  usuario_inclusao_id BIGINT REFERENCES usuarios(id),
  data_hora_inclusao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_ultima_alteracao_id BIGINT REFERENCES usuarios(id),
  data_hora_ultima_alteracao TIMESTAMPTZ,
  origem_lancamento VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
  lote_importacao_id BIGINT REFERENCES frota_lotes_importacao(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT frota_despesas_origem_chk CHECK (origem_lancamento IN ('MANUAL', 'IMPORTACAO')),
  CONSTRAINT frota_despesas_total_chk CHECK (total >= 0)
);

ALTER TABLE frota_despesas
  ADD COLUMN IF NOT EXISTS data_despesa DATE,
  ADD COLUMN IF NOT EXISTS valor_unitario_liquido NUMERIC(15, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo_forma_pagamento_decis VARCHAR(60),
  ADD COLUMN IF NOT EXISTS descricao_forma_pagamento VARCHAR(180),
  ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER,
  ADD COLUMN IF NOT EXISTS data_vencimento DATE,
  ADD COLUMN IF NOT EXISTS cancelado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento_id BIGINT REFERENCES frota_motivos_cancelamento(id),
  ADD COLUMN IF NOT EXISTS motivo_cancelamento_texto TEXT,
  ADD COLUMN IF NOT EXISTS usuario_cancelamento_id BIGINT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS data_hora_cancelamento TIMESTAMPTZ;

ALTER TABLE frota_despesas
  ALTER COLUMN placa DROP NOT NULL;

UPDATE frota_despesas
SET data_despesa = COALESCE(data_despesa, (data_hora AT TIME ZONE 'America/Sao_Paulo')::DATE)
WHERE data_despesa IS NULL;

ALTER TABLE frota_despesas
  ALTER COLUMN data_despesa SET NOT NULL;

ALTER TABLE frota_despesas
  DROP CONSTRAINT IF EXISTS frota_despesas_dia_vencimento_chk;

ALTER TABLE frota_despesas
  ADD CONSTRAINT frota_despesas_dia_vencimento_chk CHECK (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31);

DROP INDEX IF EXISTS idx_frota_despesas_duplicidade;

CREATE INDEX IF NOT EXISTS idx_frota_despesas_duplicidade
ON frota_despesas (empresa_id, fornecedor_id, numero_documento, COALESCE(placa, ''), data_despesa, descricao_despesa)
WHERE excluido = FALSE;

CREATE TABLE IF NOT EXISTS frota_historicos (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  usuario_id BIGINT REFERENCES usuarios(id),
  operacao VARCHAR(80) NOT NULL,
  tabela_afetada VARCHAR(120) NOT NULL,
  registro_id BIGINT,
  valor_anterior JSONB,
  valor_posterior JSONB,
  origem_operacao VARCHAR(80),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_frota_atualizar_odometro()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.veiculo_id IS NOT NULL THEN
    UPDATE frota_veiculos
    SET odometro_atual = GREATEST(odometro_atual, COALESCE(NEW.hodometro, 0)),
      alterado_em = NOW()
    WHERE id = NEW.veiculo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_frota_atualizar_odometro ON frota_despesas;
CREATE TRIGGER trg_frota_atualizar_odometro
AFTER INSERT OR UPDATE OF hodometro, veiculo_id
ON frota_despesas
FOR EACH ROW
EXECUTE FUNCTION fn_frota_atualizar_odometro();

DROP TRIGGER IF EXISTS trg_frota_bloquear_reducao_odometro ON frota_veiculos;
DROP FUNCTION IF EXISTS fn_frota_bloquear_reducao_odometro();

CREATE INDEX IF NOT EXISTS idx_frota_departamentos_empresa ON frota_departamentos(empresa_id, descricao);
CREATE INDEX IF NOT EXISTS idx_frota_motoristas_nome ON frota_motoristas(nome);
CREATE INDEX IF NOT EXISTS idx_frota_motoristas_coordenador_padrao ON frota_motoristas(coordenador_padrao_motorista_id);
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_departamento ON frota_veiculos(departamento_id);
CREATE INDEX IF NOT EXISTS idx_frota_despesas_placa ON frota_despesas(placa);
CREATE INDEX IF NOT EXISTS idx_frota_despesas_fornecedor ON frota_despesas(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_frota_despesas_documento ON frota_despesas(numero_documento);
CREATE INDEX IF NOT EXISTS idx_frota_despesas_periodo ON frota_despesas(empresa_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_frota_despesas_validado ON frota_despesas(validado);
CREATE INDEX IF NOT EXISTS idx_frota_despesas_integrado ON frota_despesas(integrado);
CREATE INDEX IF NOT EXISTS idx_frota_despesas_cancelado ON frota_despesas(cancelado);
CREATE INDEX IF NOT EXISTS idx_frota_historicos_registro ON frota_historicos(tabela_afetada, registro_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_frota_motivos_cancelamento_descricao ON frota_motivos_cancelamento(descricao);
CREATE INDEX IF NOT EXISTS idx_frota_motivos_sem_pedido_descricao ON frota_motivos_sem_pedido(descricao);
CREATE INDEX IF NOT EXISTS idx_frota_integracoes_status_empresa ON frota_integracoes_status(empresa_id, criado_em DESC);

INSERT INTO frota_motivos_cancelamento (codigo_decis, descricao, ativo)
VALUES
  ('DUPLICADO', 'Documento duplicado', TRUE),
  ('INDEVIDO', 'Lancamento indevido', TRUE),
  ('CORRECAO', 'Cancelamento para correcao', TRUE)
ON CONFLICT (descricao) DO UPDATE SET
  codigo_decis = EXCLUDED.codigo_decis,
  ativo = TRUE;

INSERT INTO frota_motivos_sem_pedido (codigo_decis, descricao, ativo)
VALUES
  ('INTERNO', 'Atendimento interno', TRUE),
  ('MANUTENCAO', 'Manutencao sem pedido', TRUE),
  ('DESLOCAMENTO', 'Deslocamento sem pedido', TRUE)
ON CONFLICT (descricao) DO UPDATE SET
  codigo_decis = EXCLUDED.codigo_decis,
  ativo = TRUE;

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT modulos.id, item.codigo, item.nome, item.rota, item.icone, item.ordem, TRUE
FROM modulos
CROSS JOIN (
  VALUES
    ('FROTA_DASHBOARD', 'Dashboard', '/Frota/Dashboard', 'LayoutDashboard', 10),
    ('FROTA_DEPARTAMENTOS', 'Departamentos', '/Frota/Departamentos', 'Building2', 20),
    ('FROTA_MOTORISTAS', 'Motoristas', '/Frota/Motoristas', 'Users', 30),
    ('FROTA_VEICULOS', 'Veiculos', '/Frota/Veiculos', 'Car', 40),
    ('FROTA_TIPOS_DESPESAS', 'Tipos de Despesas', '/Frota/Tipos_Despesas', 'ListChecks', 50),
    ('FROTA_FORNECEDORES', 'Fornecedores', '/Frota/Fornecedores', 'Store', 60),
    ('FROTA_DESPESA_TIPO', 'Despesa por Tipo', '/Frota/Despesa_Tipo', 'Settings', 70),
    ('FROTA_MOTIVOS_CANCELAMENTO', 'Motivos de Cancelamento', '/Frota/Motivos_Cancelamento', 'Ban', 80),
    ('FROTA_MOTIVOS_SEM_PEDIDO', 'Motivos Sem Pedido', '/Frota/Motivos_Sem_Pedido', 'CircleSlash', 82),
    ('FROTA_PEDIDOS_VENDA', 'Pedidos de Venda', '/Frota/Pedidos_Venda', 'ClipboardList', 85),
    ('FROTA_IMPORTACAO', 'Importacao de Despesas', '/Frota/Importacao', 'FileUp', 90),
    ('FROTA_KM_APONTAMENTO', 'Apontamento KM', '/Frota/KM_Apontamento', 'CalendarDays', 95),
    ('FROTA_KM_MOBILE', 'KM Mobile', '/Frota/KM_Mobile', 'Smartphone', 96),
    ('FROTA_VALIDACAO', 'Validacao de Despesas', '/Frota/Validacao', 'ShieldCheck', 100),
    ('FROTA_KM_VALIDACAO', 'Validacao KM', '/Frota/KM_Validacao', 'Gauge', 105),
    ('FROTA_CONFIGURACOES', 'Configuracoes', '/Frota/Configuracoes', 'Settings', 110)
) AS item(codigo, nome, rota, icone, ordem)
WHERE modulos.codigo = 'FROTA'
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  rota = EXCLUDED.rota,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

UPDATE menus
SET ativo = FALSE
WHERE codigo = 'FROTA_KM_MOBILE';

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT modulos.id, item.codigo, item.nome, item.rota, item.icone, item.ordem, TRUE
FROM modulos
CROSS JOIN (
  VALUES
    ('KM_MOBILE_APONTAMENTO', 'Apontamento KM', '/KM_Mobile', 'Smartphone', 1)
) AS item(codigo, nome, rota, icone, ordem)
WHERE modulos.codigo = 'KM_MOBILE'
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  rota = EXCLUDED.rota,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

INSERT INTO telas (modulo_id, menu_id, codigo, nome, rota, arquivo_fonte, componentes_principais, endpoints_usados, tabelas_principais, rotinas_relacionadas, ativo)
SELECT m.id, me.id, me.codigo || '_TELA', me.nome, me.rota, 'apps/frontend/src/modulos/frota/Frota.tsx', 'ModuloFrota, FonteDaTela', '/api/frota/*', 'frota_departamentos, frota_motoristas, frota_veiculos, frota_despesas', 'repositorioFrota', TRUE
FROM modulos m
INNER JOIN menus me ON me.modulo_id = m.id
WHERE m.codigo IN ('FROTA', 'KM_MOBILE')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  rota = EXCLUDED.rota,
  arquivo_fonte = EXCLUDED.arquivo_fonte,
  componentes_principais = EXCLUDED.componentes_principais,
  endpoints_usados = EXCLUDED.endpoints_usados,
  tabelas_principais = EXCLUDED.tabelas_principais,
  rotinas_relacionadas = EXCLUDED.rotinas_relacionadas,
  ativo = TRUE;

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES
  ('FROTA_ACESSAR', 'Acessar Modulo Frota', 'Permite acessar o modulo Frota.', TRUE),
  ('FROTA_CONSULTAR', 'Consultar Frota', 'Permite consultar cadastros e despesas da frota.', TRUE),
  ('FROTA_VISUALIZAR_DASHBOARD', 'Visualizar Dashboard Frota', 'Permite visualizar o dashboard do modulo Frota.', TRUE),
  ('FROTA_CONSULTAR_CADASTROS', 'Consultar Cadastros Frota', 'Permite consultar os cadastros administrativos do modulo Frota.', TRUE),
  ('FROTA_CONSULTAR_PEDIDOS_KM', 'Consultar Pedidos de KM', 'Permite consultar a tela de pedidos de venda usada no apontamento de KM.', TRUE),
  ('FROTA_INCLUIR', 'Incluir Frota', 'Permite incluir registros da frota.', TRUE),
  ('FROTA_ALTERAR', 'Alterar Frota', 'Permite alterar registros da frota.', TRUE),
  ('FROTA_EXCLUIR', 'Excluir Frota', 'Permite excluir registros da frota.', TRUE),
  ('FROTA_IMPORTAR_DESPESAS', 'Importar Despesas Frota', 'Permite importar despesas por planilha.', TRUE),
  ('FROTA_VALIDAR_DESPESAS', 'Validar Despesas Frota', 'Permite validar e remover validacao de despesas.', TRUE),
  ('FROTA_CANCELAR_DESPESAS', 'Cancelar Despesas Frota', 'Permite cancelar documentos de despesas com motivo.', TRUE),
  ('FROTA_LANCAR_KM', 'Lancar KM Frota', 'Permite incluir e alterar apontamentos de KM.', TRUE),
  ('FROTA_MOBILE_KM', 'Usar KM Mobile', 'Permite usar o aplicativo mobile de apontamento de KM.', TRUE),
  ('FROTA_CONSULTAR_KM_TERCEIROS', 'Consultar KM de Terceiros', 'Permite consultar apontamentos de outros motoristas.', TRUE),
  ('FROTA_CONSULTAR_KM_COORDENADOR', 'Consultar KM da Coordenacao', 'Permite ao coordenador consultar apontamentos vinculados aos pedidos da sua coordenacao.', TRUE),
  ('FROTA_VALIDAR_KM', 'Validar KM Frota', 'Permite validar e remover validacao de apontamentos de KM.', TRUE),
  ('FROTA_EXPORTAR', 'Exportar Frota', 'Permite exportar dados de frota.', TRUE),
  ('FROTA_CONFIGURAR', 'Configurar Frota', 'Permite acessar configuracoes e De/Para da frota.', TRUE),
  ('FROTA_VISUALIZAR_FONTE_TELA', 'Visualizar Fonte da Tela Frota', 'Acao tecnica limitada a superadmin.', TRUE)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

INSERT INTO frota_configuracoes (empresa_id, modulo_id, chave, valor, sensivel)
SELECT e.id, m.id, 'FROTA_GERAL', jsonb_build_object(
  'nome_modulo', 'Frota',
  'status_modulo', 'ATIVO',
  'moeda_padrao', 'BRL',
  'permitir_reimportacao_nao_validada', TRUE,
  'bloquear_registro_integrado', TRUE,
  'atualizar_odometro_automaticamente', TRUE,
  'dia_inicio_periodo_km', 26,
  'dia_fim_periodo_km', 25
), FALSE
FROM empresas e
CROSS JOIN modulos m
WHERE m.codigo = 'FROTA'
ON CONFLICT (empresa_id, modulo_id, chave) DO NOTHING;

INSERT INTO perfis_permissoes (perfil_id, empresa_id, modulo_id, acao_id, permitido)
SELECT p.id, e.id, m.id, a.id, TRUE
FROM perfis p
CROSS JOIN empresas e
CROSS JOIN modulos m
CROSS JOIN acoes a
WHERE p.administrador = TRUE
  AND m.codigo IN ('FROTA', 'KM_MOBILE')
  AND a.codigo IN (
    'FROTA_ACESSAR',
    'FROTA_CONSULTAR',
    'FROTA_VISUALIZAR_DASHBOARD',
    'FROTA_CONSULTAR_CADASTROS',
    'FROTA_CONSULTAR_PEDIDOS_KM',
    'FROTA_INCLUIR',
    'FROTA_ALTERAR',
    'FROTA_EXCLUIR',
    'FROTA_IMPORTAR_DESPESAS',
    'FROTA_VALIDAR_DESPESAS',
    'FROTA_CANCELAR_DESPESAS',
    'FROTA_LANCAR_KM',
    'FROTA_MOBILE_KM',
    'FROTA_CONSULTAR_KM_TERCEIROS',
    'FROTA_CONSULTAR_KM_COORDENADOR',
    'FROTA_VALIDAR_KM',
    'FROTA_EXPORTAR',
    'FROTA_CONFIGURAR'
  )
ON CONFLICT DO NOTHING;

COMMIT;
