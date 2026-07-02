-- CONTROL S HUB
-- Cadastro de Produto Central: PIM interno, configuracoes por modulo, atributos, canais e estruturas futuras.

INSERT INTO modulos (codigo, nome, descricao, icone, ordem, ativo)
VALUES (
  'CADASTRO_PRODUTO_CENTRAL',
  'Cadastro de Produto Central',
  'Cadastro mestre de produtos, atributos, imagens, documentos e integracao multicanal.',
  'PackageSearch',
  25,
  TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

CREATE TABLE IF NOT EXISTS module_settings (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  modulo_id BIGINT NOT NULL REFERENCES modulos(id),
  chave VARCHAR(120) NOT NULL,
  valor JSONB,
  sensivel BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT module_settings_chave_unica UNIQUE (empresa_id, modulo_id, chave)
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  codigo_interno VARCHAR(80) NOT NULL,
  codigo_erp_decis VARCHAR(80),
  sku_interno VARCHAR(80),
  sku_comercial VARCHAR(80),
  sku_fornecedor VARCHAR(80),
  ean_gtin VARCHAR(40),
  mpn VARCHAR(80),
  ncm VARCHAR(20),
  cest VARCHAR(20),
  marca VARCHAR(120),
  linha VARCHAR(120),
  modelo VARCHAR(140),
  familia VARCHAR(120),
  categoria VARCHAR(140),
  subcategoria VARCHAR(140),
  tipo_produto VARCHAR(40) NOT NULL DEFAULT 'PRODUTO_SIMPLES',
  status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  origem VARCHAR(60) DEFAULT 'MANUAL',
  garantia VARCHAR(120),
  descricao_interna TEXT,
  observacoes TEXT,
  peso NUMERIC(15, 4),
  altura NUMERIC(15, 4),
  largura NUMERIC(15, 4),
  comprimento NUMERIC(15, 4),
  score_completude NUMERIC(6, 2) NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT FALSE,
  versao_atual INTEGER NOT NULL DEFAULT 1,
  usuario_responsavel_id BIGINT REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  excluido_em TIMESTAMPTZ,
  excluido_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT products_codigo_empresa_unico UNIQUE (empresa_id, codigo_interno)
);

CREATE TABLE IF NOT EXISTS product_versions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  numero_versao INTEGER NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  dados_produto JSONB NOT NULL DEFAULT '{}'::JSONB,
  motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT product_versions_unica UNIQUE (product_id, numero_versao)
);

CREATE TABLE IF NOT EXISTS product_skus (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  sku VARCHAR(100) NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'INTERNO',
  status VARCHAR(40) NOT NULL DEFAULT 'ATIVO',
  dados JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_skus_unico UNIQUE (product_id, sku, tipo)
);

CREATE TABLE IF NOT EXISTS product_components (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  product_id BIGINT REFERENCES products(id),
  codigo VARCHAR(80) NOT NULL,
  nome VARCHAR(180) NOT NULL,
  tipo_componente VARCHAR(60) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ATIVO',
  atributos JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT product_components_codigo_unico UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS product_component_links (
  id BIGSERIAL PRIMARY KEY,
  conjunto_product_id BIGINT NOT NULL REFERENCES products(id),
  componente_product_id BIGINT REFERENCES products(id),
  product_component_id BIGINT REFERENCES product_components(id),
  quantidade NUMERIC(15, 4) NOT NULL DEFAULT 1,
  tipo_relacao VARCHAR(60) NOT NULL DEFAULT 'COMPONENTE',
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_component_links_alvo CHECK (componente_product_id IS NOT NULL OR product_component_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS attribute_groups (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  codigo VARCHAR(80) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attribute_groups_codigo_unico UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS attributes (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  attribute_group_id BIGINT REFERENCES attribute_groups(id),
  nome_interno VARCHAR(120) NOT NULL,
  nome_exibido VARCHAR(140) NOT NULL,
  codigo VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_campo VARCHAR(40) NOT NULL DEFAULT 'TEXTO',
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
  escopo VARCHAR(40) NOT NULL DEFAULT 'PRODUTO',
  unidade_medida VARCHAR(30),
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  editavel BOOLEAN NOT NULL DEFAULT TRUE,
  visivel BOOLEAN NOT NULL DEFAULT TRUE,
  valor_padrao TEXT,
  mascara VARCHAR(120),
  validacao TEXT,
  ajuda_tooltip TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attributes_codigo_unico UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS attribute_values (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id),
  product_sku_id BIGINT REFERENCES product_skus(id),
  channel_id BIGINT,
  attribute_id BIGINT NOT NULL REFERENCES attributes(id),
  valor_texto TEXT,
  valor_numero NUMERIC(18, 6),
  valor_booleano BOOLEAN,
  valor_data DATE,
  valor_json JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS channels (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  codigo VARCHAR(80) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  tipo_canal VARCHAR(60) NOT NULL,
  categoria_interna VARCHAR(140),
  categoria_canal VARCHAR(180),
  score_minimo_publicacao NUMERIC(6, 2) NOT NULL DEFAULT 80,
  regras JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT channels_codigo_unico UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS channel_categories (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES channels(id),
  codigo_interno VARCHAR(100),
  codigo_canal VARCHAR(140),
  nome VARCHAR(180) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS channel_attributes (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES channels(id),
  codigo VARCHAR(120) NOT NULL,
  nome VARCHAR(160) NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 0,
  validacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT channel_attributes_unico UNIQUE (channel_id, codigo)
);

CREATE TABLE IF NOT EXISTS channel_attribute_mappings (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES channels(id),
  attribute_id BIGINT NOT NULL REFERENCES attributes(id),
  channel_attribute_id BIGINT REFERENCES channel_attributes(id),
  regra_transformacao JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT channel_attribute_mappings_unico UNIQUE (channel_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS product_channel_status (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  channel_id BIGINT NOT NULL REFERENCES channels(id),
  status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  score_completude NUMERIC(6, 2) NOT NULL DEFAULT 0,
  campos_faltantes JSONB NOT NULL DEFAULT '[]'::JSONB,
  ultima_validacao_em TIMESTAMPTZ,
  publicado_em TIMESTAMPTZ,
  CONSTRAINT product_channel_status_unico UNIQUE (product_id, channel_id)
);

CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome VARCHAR(180) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  arquivo TEXT,
  url TEXT,
  alt_text VARCHAR(260),
  ordem INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'ATIVO',
  tags TEXT[],
  marca VARCHAR(120),
  modelo VARCHAR(140),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS asset_product_links (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  tipo_vinculo VARCHAR(60) NOT NULL DEFAULT 'SECUNDARIA',
  ordem INTEGER NOT NULL DEFAULT 0,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT asset_product_links_unico UNIQUE (asset_id, product_id, tipo_vinculo)
);

CREATE TABLE IF NOT EXISTS imports (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome_arquivo VARCHAR(240) NOT NULL,
  tipo_arquivo VARCHAR(20) NOT NULL,
  modo_importacao VARCHAR(40) NOT NULL DEFAULT 'APENAS_VALIDAR',
  status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  total_linhas INTEGER NOT NULL DEFAULT 0,
  produtos_novos INTEGER NOT NULL DEFAULT 0,
  produtos_encontrados INTEGER NOT NULL DEFAULT 0,
  produtos_com_erro INTEGER NOT NULL DEFAULT 0,
  produtos_duplicados INTEGER NOT NULL DEFAULT 0,
  relatorio JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS import_mappings (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome VARCHAR(140) NOT NULL,
  mapeamento JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT import_mappings_nome_unico UNIQUE (empresa_id, nome)
);

CREATE TABLE IF NOT EXISTS workflows (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  modulo_id BIGINT NOT NULL REFERENCES modulos(id),
  codigo VARCHAR(80) NOT NULL,
  nome VARCHAR(140) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workflows_codigo_unico UNIQUE (empresa_id, modulo_id, codigo)
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES workflows(id),
  codigo VARCHAR(80) NOT NULL,
  nome VARCHAR(140) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  status_produto VARCHAR(40) NOT NULL,
  permissoes JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT workflow_steps_codigo_unico UNIQUE (workflow_id, codigo)
);

CREATE TABLE IF NOT EXISTS approvals (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  workflow_step_id BIGINT REFERENCES workflow_steps(id),
  status VARCHAR(40) NOT NULL DEFAULT 'AGUARDANDO_APROVACAO',
  comentario TEXT,
  solicitado_por_usuario_id BIGINT REFERENCES usuarios(id),
  aprovador_usuario_id BIGINT REFERENCES usuarios(id),
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS approval_comparisons (
  id BIGSERIAL PRIMARY KEY,
  approval_id BIGINT NOT NULL REFERENCES approvals(id),
  campo VARCHAR(120) NOT NULL,
  valor_usuario_a TEXT,
  valor_usuario_b TEXT,
  valor_sugerido_ia TEXT,
  valor_escolhido TEXT,
  comentario_aprovador TEXT,
  aprovado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ai_settings (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  modulo_id BIGINT NOT NULL REFERENCES modulos(id),
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  modelo_padrao VARCHAR(80) DEFAULT 'gpt-4.1-mini',
  temperatura NUMERIC(4, 2) NOT NULL DEFAULT 0.20,
  limite_tokens INTEGER NOT NULL DEFAULT 1200,
  chave_openai TEXT,
  permissoes_por_perfil JSONB NOT NULL DEFAULT '{}'::JSONB,
  alterado_em TIMESTAMPTZ,
  alterado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT ai_settings_unico UNIQUE (empresa_id, modulo_id)
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id),
  tipo_sugestao VARCHAR(80) NOT NULL,
  entrada JSONB NOT NULL DEFAULT '{}'::JSONB,
  sugestao JSONB NOT NULL DEFAULT '{}'::JSONB,
  status VARCHAR(40) NOT NULL DEFAULT 'GERADA',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_usuario_id BIGINT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS integration_settings (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  modulo_id BIGINT NOT NULL REFERENCES modulos(id),
  channel_id BIGINT REFERENCES channels(id),
  codigo VARCHAR(80) NOT NULL,
  nome VARCHAR(140) NOT NULL,
  api_url TEXT,
  token TEXT,
  usuario VARCHAR(160),
  senha TEXT,
  ambiente VARCHAR(40) NOT NULL DEFAULT 'HOMOLOGACAO',
  status VARCHAR(40) NOT NULL DEFAULT 'INATIVO',
  ultima_sincronizacao_em TIMESTAMPTZ,
  configuracao JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT integration_settings_codigo_unico UNIQUE (empresa_id, modulo_id, codigo)
);

CREATE TABLE IF NOT EXISTS integration_logs (
  id BIGSERIAL PRIMARY KEY,
  integration_setting_id BIGINT REFERENCES integration_settings(id),
  product_id BIGINT REFERENCES products(id),
  tipo_evento VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  payload_enviado JSONB,
  payload_recebido JSONB,
  mensagem TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_empresa_status ON products(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_products_busca ON products(empresa_id, sku_interno, ean_gtin, modelo, marca);
CREATE INDEX IF NOT EXISTS idx_product_component_links_conjunto ON product_component_links(conjunto_product_id);
CREATE INDEX IF NOT EXISTS idx_attribute_values_produto ON attribute_values(product_id);
CREATE INDEX IF NOT EXISTS idx_assets_empresa_tipo ON assets(empresa_id, tipo);
CREATE INDEX IF NOT EXISTS idx_imports_empresa_data ON imports(empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status, criado_em DESC);

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT modulos.id, item.codigo, item.nome, item.rota, item.icone, item.ordem, TRUE
FROM modulos
CROSS JOIN (
  VALUES
    ('PIM_DASHBOARD', 'Dashboard', '/Cadastro_Produto_Central/Dashboard', 'LayoutDashboard', 10),
    ('PIM_PRODUTOS', 'Produtos', '/Cadastro_Produto_Central/Produtos', 'PackageSearch', 20),
    ('PIM_CONJUNTOS', 'Conjuntos', '/Cadastro_Produto_Central/Conjuntos', 'Boxes', 30),
    ('PIM_COMPONENTES', 'Componentes', '/Cadastro_Produto_Central/Componentes', 'Cpu', 40),
    ('PIM_SKUS', 'SKUs', '/Cadastro_Produto_Central/SKUs', 'Barcode', 50),
    ('PIM_ATRIBUTOS', 'Atributos', '/Cadastro_Produto_Central/Atributos', 'ListChecks', 60),
    ('PIM_CANAIS', 'Canais / Marketplaces', '/Cadastro_Produto_Central/Canais', 'Store', 70),
    ('PIM_IMPORTACAO', 'Importacao', '/Cadastro_Produto_Central/Importacao', 'FileUp', 80),
    ('PIM_ASSETS', 'Imagens e Documentos', '/Cadastro_Produto_Central/Assets', 'Images', 90),
    ('PIM_WORKFLOWS', 'Workflows', '/Cadastro_Produto_Central/Workflows', 'GitBranch', 100),
    ('PIM_APROVACOES', 'Aprovacoes', '/Cadastro_Produto_Central/Aprovacoes', 'BadgeCheck', 110),
    ('PIM_IA', 'IA & Enriquecimento', '/Cadastro_Produto_Central/IA', 'Sparkles', 120),
    ('PIM_INTEGRACOES', 'Integracoes', '/Cadastro_Produto_Central/Integracoes', 'PlugZap', 130),
    ('PIM_AUDITORIA', 'Auditoria', '/Cadastro_Produto_Central/Auditoria', 'FileCode2', 140),
    ('PIM_CONFIGURACOES', 'Configuracoes', '/Cadastro_Produto_Central/Configuracoes', 'Settings', 150)
) AS item(codigo, nome, rota, icone, ordem)
WHERE modulos.codigo = 'CADASTRO_PRODUTO_CENTRAL'
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  rota = EXCLUDED.rota,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

INSERT INTO telas (modulo_id, menu_id, codigo, nome, rota, arquivo_fonte, componentes_principais, endpoints_usados, tabelas_principais, rotinas_relacionadas, ativo)
SELECT m.id, me.id, me.codigo || '_TELA', me.nome, me.rota, 'apps/frontend/src/App.tsx', 'CadastroProdutoCentral', '/api/cadastro-produto-central/*', 'products, attributes, channels, assets, workflows', 'repositorioCadastroProdutoCentral', TRUE
FROM modulos m
INNER JOIN menus me ON me.modulo_id = m.id
WHERE m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES
  ('VISUALIZAR_CADASTRO_PRODUTO_CENTRAL', 'Visualizar Cadastro de Produto Central', 'Permite visualizar o modulo Cadastro de Produto Central.', TRUE),
  ('ACESSAR_DASHBOARD_PIM', 'Acessar Dashboard do modulo', 'Permite acessar o dashboard do PIM.', TRUE),
  ('CRIAR_PRODUTO_PIM', 'Criar produto', 'Permite criar produtos no cadastro mestre.', TRUE),
  ('EDITAR_PRODUTO_PIM', 'Editar produto', 'Permite editar produtos em rascunho e criar novas versoes.', TRUE),
  ('EXCLUIR_PRODUTO_PIM', 'Excluir produto', 'Permite excluir logicamente produtos.', TRUE),
  ('ARQUIVAR_PRODUTO_PIM', 'Arquivar produto', 'Permite arquivar produtos.', TRUE),
  ('PUBLICAR_PRODUTO_PIM', 'Publicar produto', 'Permite publicar produtos aprovados.', TRUE),
  ('APROVAR_PRODUTO_PIM', 'Aprovar produto', 'Permite aprovar cadastros de produto.', TRUE),
  ('REJEITAR_PRODUTO_PIM', 'Rejeitar produto', 'Permite rejeitar cadastros de produto.', TRUE),
  ('IMPORTAR_PLANILHA_PIM', 'Importar planilha', 'Permite importar planilhas para rascunho.', TRUE),
  ('CONFIGURAR_ATRIBUTOS_PIM', 'Configurar atributos', 'Permite configurar atributos dinamicos.', TRUE),
  ('CONFIGURAR_CANAIS_PIM', 'Configurar canais', 'Permite configurar canais e marketplaces.', TRUE),
  ('CONFIGURAR_WORKFLOWS_PIM', 'Configurar workflows', 'Permite configurar workflows do modulo.', TRUE),
  ('GERENCIAR_IMAGENS_PIM', 'Gerenciar imagens', 'Permite gerenciar imagens do PIM.', TRUE),
  ('GERENCIAR_DOCUMENTOS_PIM', 'Gerenciar documentos', 'Permite gerenciar documentos do PIM.', TRUE),
  ('USAR_IA_PIM', 'Usar IA', 'Permite usar funcoes de IA do PIM.', TRUE),
  ('CONFIGURAR_IA_PIM', 'Configurar IA', 'Permite configurar IA do PIM.', TRUE),
  ('VISUALIZAR_AUDITORIA_PIM', 'Visualizar auditoria', 'Permite visualizar auditoria do PIM.', TRUE),
  ('GERENCIAR_INTEGRACOES_PIM', 'Gerenciar integracoes', 'Permite gerenciar integracoes futuras.', TRUE),
  ('CONFIGURAR_MODULO_PIM', 'Configurar modulo', 'Permite configurar o Cadastro de Produto Central.', TRUE)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

INSERT INTO attribute_groups (empresa_id, codigo, nome, ordem, ativo)
SELECT e.id, item.codigo, item.nome, item.ordem, TRUE
FROM empresas e
CROSS JOIN (
  VALUES
    ('IDENTIFICACAO', 'Identificacao', 10),
    ('DADOS_TECNICOS', 'Dados tecnicos', 20),
    ('CAPACIDADE', 'Capacidade', 30),
    ('ENERGIA', 'Energia', 40),
    ('INSTALACAO', 'Instalacao', 50),
    ('DIMENSOES', 'Dimensoes', 60),
    ('PESO', 'Peso', 70),
    ('RUIDO', 'Ruido', 80),
    ('GAS_REFRIGERANTE', 'Gas refrigerante', 90),
    ('TUBULACAO', 'Tubulacao', 100),
    ('SEO', 'SEO', 110),
    ('FISCAL', 'Fiscal', 120),
    ('LOGISTICA', 'Logistica', 130),
    ('MARKETPLACE', 'Marketplace', 140),
    ('IMAGENS', 'Imagens', 150),
    ('DOCUMENTOS', 'Documentos', 160)
) AS item(codigo, nome, ordem)
ON CONFLICT (empresa_id, codigo) DO NOTHING;

INSERT INTO attributes (empresa_id, attribute_group_id, nome_interno, nome_exibido, codigo, tipo_campo, escopo, unidade_medida, obrigatorio, ordem_exibicao, ativo)
SELECT e.id, g.id, item.nome_interno, item.nome_exibido, item.codigo, item.tipo_campo, item.escopo, item.unidade, item.obrigatorio, item.ordem, TRUE
FROM empresas e
INNER JOIN attribute_groups g ON g.empresa_id = e.id
CROSS JOIN (
  VALUES
    ('btu', 'BTU', 'BTU', 'NUMERO', 'PRODUTO', 'BTU/h', TRUE, 10, 'CAPACIDADE'),
    ('capacidade_nominal', 'Capacidade nominal', 'CAPACIDADE_NOMINAL', 'DECIMAL', 'PRODUTO', 'kW', FALSE, 20, 'CAPACIDADE'),
    ('ciclo', 'Ciclo', 'CICLO', 'LISTA', 'PRODUTO', NULL, TRUE, 30, 'DADOS_TECNICOS'),
    ('tecnologia_inverter', 'Tecnologia inverter', 'TECNOLOGIA_INVERTER', 'BOOLEANO', 'PRODUTO', NULL, FALSE, 40, 'DADOS_TECNICOS'),
    ('tensao', 'Tensao', 'TENSAO', 'LISTA', 'SKU', 'V', TRUE, 50, 'ENERGIA'),
    ('classificacao_energetica', 'Classificacao energetica', 'CLASSIFICACAO_ENERGETICA', 'LISTA', 'PRODUTO', NULL, FALSE, 60, 'ENERGIA'),
    ('inmetro', 'INMETRO', 'INMETRO', 'TEXTO', 'PRODUTO', NULL, FALSE, 70, 'ENERGIA'),
    ('procel', 'PROCEL', 'PROCEL', 'BOOLEANO', 'PRODUTO', NULL, FALSE, 80, 'ENERGIA'),
    ('gas_refrigerante', 'Gas refrigerante', 'GAS_REFRIGERANTE', 'LISTA', 'PRODUTO', NULL, FALSE, 90, 'GAS_REFRIGERANTE'),
    ('vazao_ar', 'Vazao de ar', 'VAZAO_AR', 'DECIMAL', 'PRODUTO', 'm3/h', FALSE, 100, 'DADOS_TECNICOS'),
    ('nivel_ruido', 'Nivel de ruido', 'NIVEL_RUIDO', 'DECIMAL', 'PRODUTO', 'dB', FALSE, 110, 'RUIDO'),
    ('area_indicada', 'Area indicada', 'AREA_INDICADA', 'DECIMAL', 'PRODUTO', 'm2', FALSE, 120, 'CAPACIDADE'),
    ('tubulacao_linha_liquida', 'Tubulacao linha liquida', 'TUBULACAO_LINHA_LIQUIDA', 'TEXTO', 'PRODUTO', NULL, FALSE, 130, 'TUBULACAO'),
    ('tubulacao_linha_gas', 'Tubulacao linha gas', 'TUBULACAO_LINHA_GAS', 'TEXTO', 'PRODUTO', NULL, FALSE, 140, 'TUBULACAO'),
    ('distancia_maxima', 'Distancia maxima', 'DISTANCIA_MAXIMA', 'DECIMAL', 'PRODUTO', 'm', FALSE, 150, 'INSTALACAO'),
    ('desnivel_maximo', 'Desnivel maximo', 'DESNIVEL_MAXIMO', 'DECIMAL', 'PRODUTO', 'm', FALSE, 160, 'INSTALACAO'),
    ('wifi', 'Wi-Fi', 'WI_FI', 'BOOLEANO', 'PRODUTO', NULL, FALSE, 170, 'DADOS_TECNICOS'),
    ('controle_remoto', 'Controle remoto', 'CONTROLE_REMOTO', 'BOOLEANO', 'PRODUTO', NULL, FALSE, 180, 'DADOS_TECNICOS')
) AS item(nome_interno, nome_exibido, codigo, tipo_campo, escopo, unidade, obrigatorio, ordem, grupo_codigo)
WHERE g.codigo = item.grupo_codigo
ON CONFLICT (empresa_id, codigo) DO NOTHING;

INSERT INTO channels (empresa_id, codigo, nome, tipo_canal, score_minimo_publicacao, ativo)
SELECT e.id, item.codigo, item.nome, item.tipo_canal, item.score, TRUE
FROM empresas e
CROSS JOIN (
  VALUES
    ('ERP_DECIS', 'ERP Decis', 'ERP', 90),
    ('SHOPPUB', 'ShopPub', 'ECOMMERCE', 85),
    ('ECOMMERCE_PROPRIO', 'E-commerce proprio', 'ECOMMERCE', 85),
    ('MAGAZINE_LUIZA', 'Magazine Luiza', 'MARKETPLACE', 80),
    ('MERCADO_LIVRE', 'Mercado Livre', 'MARKETPLACE', 80),
    ('AMAZON', 'Amazon', 'MARKETPLACE', 80),
    ('VIA_CASAS_BAHIA', 'Via / Casas Bahia', 'MARKETPLACE', 80),
    ('GOOGLE_SHOPPING', 'Google Shopping', 'ADS', 80),
    ('OUTROS', 'Outros', 'OUTRO', 70)
) AS item(codigo, nome, tipo_canal, score)
ON CONFLICT (empresa_id, codigo) DO NOTHING;

INSERT INTO workflows (empresa_id, modulo_id, codigo, nome, ativo)
SELECT e.id, m.id, 'PIM_PADRAO', 'Workflow padrao de produto', TRUE
FROM empresas e
CROSS JOIN modulos m
WHERE m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
ON CONFLICT (empresa_id, modulo_id, codigo) DO NOTHING;

INSERT INTO workflow_steps (workflow_id, codigo, nome, ordem, status_produto, ativo)
SELECT w.id, item.codigo, item.nome, item.ordem, item.status_produto, TRUE
FROM workflows w
CROSS JOIN (
  VALUES
    ('RASCUNHO', 'Rascunho', 10, 'RASCUNHO'),
    ('EM_REVISAO', 'Em revisao', 20, 'EM_REVISAO'),
    ('AGUARDANDO_APROVACAO', 'Aguardando aprovacao', 30, 'AGUARDANDO_APROVACAO'),
    ('APROVADO', 'Aprovado', 40, 'APROVADO'),
    ('PUBLICADO', 'Publicado', 50, 'PUBLICADO'),
    ('REJEITADO', 'Rejeitado', 60, 'REJEITADO')
) AS item(codigo, nome, ordem, status_produto)
WHERE w.codigo = 'PIM_PADRAO'
ON CONFLICT (workflow_id, codigo) DO NOTHING;

INSERT INTO module_settings (empresa_id, modulo_id, chave, valor, sensivel)
SELECT e.id, m.id, 'CADASTRO_PRODUTO_CENTRAL_GERAL', jsonb_build_object(
  'nome_modulo', 'Cadastro de Produto Central',
  'descricao_modulo', 'Cadastro mestre de produtos, atributos, imagens, documentos e integracao multicanal.',
  'status_modulo', 'ATIVO',
  'logo_modulo', 'PIM_CUBE',
  'prefixo_sku_interno', 'CS',
  'tamanho_codigo_sku', 8,
  'proximo_numero_sequencial', 1,
  'separador_codigo_composto', '-',
  'moeda_padrao', 'BRL',
  'unidade_medida_padrao', 'UN',
  'idioma_padrao', 'pt-BR',
  'fuso_horario', 'America/Sao_Paulo',
  'precisao_decimal', 2,
  'exigir_aprovacao_antes_publicacao', TRUE,
  'permitir_cadastro_duplicado_rascunho', TRUE,
  'bloquear_edicao_direta_produto_publicado', TRUE,
  'gerar_historico_alteracoes', TRUE,
  'calcular_score_completude_por_canal', TRUE
), FALSE
FROM empresas e
CROSS JOIN modulos m
WHERE m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
ON CONFLICT (empresa_id, modulo_id, chave) DO NOTHING;

INSERT INTO integration_settings (empresa_id, modulo_id, channel_id, codigo, nome, status)
SELECT c.empresa_id, m.id, c.id, c.codigo, c.nome, 'INATIVO'
FROM channels c
CROSS JOIN modulos m
WHERE m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
ON CONFLICT (empresa_id, modulo_id, codigo) DO NOTHING;

INSERT INTO ai_settings (empresa_id, modulo_id, ativo, modelo_padrao, temperatura, limite_tokens)
SELECT e.id, m.id, FALSE, 'gpt-4.1-mini', 0.20, 1200
FROM empresas e
CROSS JOIN modulos m
WHERE m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
ON CONFLICT (empresa_id, modulo_id) DO NOTHING;

INSERT INTO perfis_permissoes (perfil_id, empresa_id, modulo_id, acao_id, permitido)
SELECT p.id, e.id, m.id, a.id, TRUE
FROM perfis p
CROSS JOIN empresas e
CROSS JOIN modulos m
CROSS JOIN acoes a
WHERE p.codigo = 'ADMINISTRADOR_GERAL'
  AND m.codigo = 'CADASTRO_PRODUTO_CENTRAL'
  AND a.codigo IN (
    'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL',
    'ACESSAR_DASHBOARD_PIM',
    'CRIAR_PRODUTO_PIM',
    'EDITAR_PRODUTO_PIM',
    'EXCLUIR_PRODUTO_PIM',
    'ARQUIVAR_PRODUTO_PIM',
    'PUBLICAR_PRODUTO_PIM',
    'APROVAR_PRODUTO_PIM',
    'REJEITAR_PRODUTO_PIM',
    'IMPORTAR_PLANILHA_PIM',
    'CONFIGURAR_ATRIBUTOS_PIM',
    'CONFIGURAR_CANAIS_PIM',
    'CONFIGURAR_WORKFLOWS_PIM',
    'GERENCIAR_IMAGENS_PIM',
    'GERENCIAR_DOCUMENTOS_PIM',
    'USAR_IA_PIM',
    'CONFIGURAR_IA_PIM',
    'VISUALIZAR_AUDITORIA_PIM',
    'GERENCIAR_INTEGRACOES_PIM',
    'CONFIGURAR_MODULO_PIM'
  )
ON CONFLICT DO NOTHING;
