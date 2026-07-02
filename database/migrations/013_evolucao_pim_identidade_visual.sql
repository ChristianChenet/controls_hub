-- Control S HUB
-- Evolucao do Cadastro de Produto Central para PIM completo e padronizacao da escrita da marca.

UPDATE parametros_sistema
SET valor = 'Control S HUB'
WHERE chave = 'NOME_SISTEMA';

UPDATE perfis
SET descricao = REPLACE(descricao, 'CONTROL S HUB', 'Control S HUB')
WHERE descricao LIKE '%CONTROL S HUB%';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS codigo_fabricante VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gtin VARCHAR(40),
  ADD COLUMN IF NOT EXISTS nome_interno VARCHAR(180),
  ADD COLUMN IF NOT EXISTS nome_comercial VARCHAR(220),
  ADD COLUMN IF NOT EXISTS meta_title VARCHAR(180),
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(320),
  ADD COLUMN IF NOT EXISTS slug VARCHAR(180),
  ADD COLUMN IF NOT EXISTS descricao_curta TEXT,
  ADD COLUMN IF NOT EXISTS descricao_longa TEXT,
  ADD COLUMN IF NOT EXISTS bullet_points TEXT[],
  ADD COLUMN IF NOT EXISTS palavras_chave TEXT[],
  ADD COLUMN IF NOT EXISTS fiscal_comercial JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS pendencias_validacao JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE product_skus
  ADD COLUMN IF NOT EXISTS sku_erp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sku_fornecedor VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sku_marketplace VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ean VARCHAR(40),
  ADD COLUMN IF NOT EXISTS codigo_fabricante VARCHAR(100),
  ADD COLUMN IF NOT EXISTS principal BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS variacoes JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE product_component_links
  ADD COLUMN IF NOT EXISTS observacao TEXT;

ALTER TABLE imports
  ADD COLUMN IF NOT EXISTS colunas_detectadas JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS mapeamento JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS previa JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS logs JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE module_settings
  ADD COLUMN IF NOT EXISTS aba VARCHAR(80) NOT NULL DEFAULT 'GERAL';

CREATE TABLE IF NOT EXISTS product_field_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  campo VARCHAR(140) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  origem VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
  motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS product_parallel_registrations (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  product_id BIGINT REFERENCES products(id),
  codigo_referencia VARCHAR(120) NOT NULL,
  usuario_a_id BIGINT REFERENCES usuarios(id),
  usuario_b_id BIGINT REFERENCES usuarios(id),
  dados_usuario_a JSONB NOT NULL DEFAULT '{}'::JSONB,
  dados_usuario_b JSONB NOT NULL DEFAULT '{}'::JSONB,
  status VARCHAR(40) NOT NULL DEFAULT 'EM_COMPARACAO',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em TIMESTAMPTZ,
  CONSTRAINT product_parallel_registrations_ref_unica UNIQUE (empresa_id, codigo_referencia)
);

CREATE TABLE IF NOT EXISTS import_layouts (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome VARCHAR(140) NOT NULL,
  descricao TEXT,
  mapeamento JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT import_layouts_nome_unico UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_product_field_history_product ON product_field_history(product_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_product_parallel_empresa_status ON product_parallel_registrations(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_products_nome_comercial ON products(empresa_id, nome_comercial);

INSERT INTO attributes (empresa_id, attribute_group_id, nome_interno, nome_exibido, codigo, tipo_campo, escopo, unidade_medida, obrigatorio, ordem_exibicao, ativo)
SELECT e.id, g.id, item.nome_interno, item.nome_exibido, item.codigo, item.tipo_campo, item.escopo, item.unidade, item.obrigatorio, item.ordem, TRUE
FROM empresas e
INNER JOIN attribute_groups g ON g.empresa_id = e.id
CROSS JOIN (
  VALUES
    ('capacidade', 'Capacidade', 'CAPACIDADE', 'DECIMAL', 'CONJUNTO', 'kW', TRUE, 11, 'CAPACIDADE'),
    ('seer', 'SEER', 'SEER', 'DECIMAL', 'CONJUNTO', NULL, FALSE, 12, 'ENERGIA'),
    ('eer', 'EER', 'EER', 'DECIMAL', 'CONJUNTO', NULL, FALSE, 13, 'ENERGIA'),
    ('cop', 'COP', 'COP', 'DECIMAL', 'CONJUNTO', NULL, FALSE, 14, 'ENERGIA'),
    ('dual_inverter', 'Dual Inverter', 'DUAL_INVERTER', 'BOOLEANO', 'CONJUNTO', NULL, FALSE, 15, 'DADOS_TECNICOS'),
    ('fase', 'Fase', 'FASE', 'LISTA', 'SKU', NULL, FALSE, 16, 'ENERGIA'),
    ('consumo', 'Consumo', 'CONSUMO', 'DECIMAL', 'SKU', 'kWh', FALSE, 17, 'ENERGIA'),
    ('potencia', 'Potencia', 'POTENCIA', 'DECIMAL', 'SKU', 'W', FALSE, 18, 'ENERGIA'),
    ('corrente', 'Corrente', 'CORRENTE', 'DECIMAL', 'SKU', 'A', FALSE, 19, 'ENERGIA'),
    ('frio', 'Frio', 'FRIO', 'BOOLEANO', 'CONJUNTO', NULL, FALSE, 20, 'DADOS_TECNICOS'),
    ('quente_frio', 'Quente e Frio', 'QUENTE_FRIO', 'BOOLEANO', 'CONJUNTO', NULL, FALSE, 21, 'DADOS_TECNICOS'),
    ('area', 'Area', 'AREA', 'DECIMAL', 'CONJUNTO', 'm2', FALSE, 22, 'CAPACIDADE'),
    ('ruido', 'Ruido', 'RUIDO', 'DECIMAL', 'EVAPORADORA', 'dB', FALSE, 23, 'RUIDO'),
    ('vazao', 'Vazao', 'VAZAO', 'DECIMAL', 'EVAPORADORA', 'm3/h', FALSE, 24, 'DADOS_TECNICOS'),
    ('tubulacao', 'Tubulacao', 'TUBULACAO', 'TEXTO', 'CONJUNTO', NULL, FALSE, 25, 'TUBULACAO'),
    ('linha_liquida', 'Linha Liquida', 'LINHA_LIQUIDA', 'TEXTO', 'CONDENSADORA', NULL, FALSE, 26, 'TUBULACAO'),
    ('linha_gas', 'Linha Gas', 'LINHA_GAS', 'TEXTO', 'CONDENSADORA', NULL, FALSE, 27, 'TUBULACAO'),
    ('desnivel', 'Desnivel', 'DESNIVEL', 'DECIMAL', 'CONDENSADORA', 'm', FALSE, 28, 'INSTALACAO'),
    ('dimensoes', 'Dimensoes', 'DIMENSOES', 'TEXTO', 'COMPONENTE', NULL, FALSE, 29, 'DIMENSOES'),
    ('carga_gas', 'Carga de gas', 'CARGA_GAS', 'DECIMAL', 'CONDENSADORA', 'kg', FALSE, 30, 'GAS_REFRIGERANTE'),
    ('garantia_atributo', 'Garantia', 'GARANTIA_ATRIBUTO', 'TEXTO', 'CONJUNTO', NULL, FALSE, 31, 'DADOS_TECNICOS')
) AS item(nome_interno, nome_exibido, codigo, tipo_campo, escopo, unidade, obrigatorio, ordem, grupo_codigo)
WHERE g.codigo = item.grupo_codigo
ON CONFLICT (empresa_id, codigo) DO UPDATE SET
  nome_exibido = EXCLUDED.nome_exibido,
  tipo_campo = EXCLUDED.tipo_campo,
  escopo = EXCLUDED.escopo,
  unidade_medida = EXCLUDED.unidade_medida,
  ativo = TRUE;

INSERT INTO module_settings (empresa_id, modulo_id, chave, aba, valor, sensivel)
SELECT e.id, m.id, item.chave, item.aba, item.valor::JSONB, FALSE
FROM empresas e
CROSS JOIN modulos m
CROSS JOIN (
  VALUES
    ('PIM_CONFIG_ATRIBUTOS', 'ATRIBUTOS', '{"permite_criar":true,"permite_inativar":true,"ordenacao_manual":true}'),
    ('PIM_CONFIG_MARKETPLACES', 'MARKETPLACES', '{"score_minimo_padrao":80,"exibir_pendencias":true}'),
    ('PIM_CONFIG_WORKFLOW', 'WORKFLOW', '{"exigir_aprovacao":true,"bloquear_publicado":true}'),
    ('PIM_CONFIG_IMPORTACAO', 'IMPORTACAO', '{"sempre_rascunho":true,"permitir_salvar_layout":true}'),
    ('PIM_CONFIG_ASSETS', 'ASSETS', '{"upload_multiplo":true,"permitir_url_externa":true}'),
    ('PIM_CONFIG_IA', 'IA', '{"ativo":false,"mensagem_sem_chave":"Configure a chave OpenAI para usar recursos de IA."}'),
    ('PIM_CONFIG_INTEGRACOES', 'INTEGRACOES', '{"fila_ativa":true,"ambiente_padrao":"HOMOLOGACAO"}'),
    ('PIM_CONFIG_NOTIFICACOES', 'NOTIFICACOES', '{"email_aprovacao":false,"email_publicacao":false}'),
    ('PIM_CONFIG_LOGS', 'LOGS', '{"reter_dias":365,"registrar_campo_a_campo":true}')
) AS item(chave, aba, valor)
WHERE m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
ON CONFLICT (empresa_id, modulo_id, chave) DO UPDATE SET
  aba = EXCLUDED.aba,
  valor = EXCLUDED.valor,
  alterado_em = NOW();
