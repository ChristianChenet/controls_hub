-- CONTROL S HUB
-- Business Intelligence: dashboards, consultas SQL, fontes de dados, cache, logs e modo TV.
-- Regras do modulo: autenticar pelo Control S Hub, validar permissao no backend e executar apenas consultas SELECT parametrizadas.

INSERT INTO modulos (codigo, nome, descricao, icone, ordem, ativo)
VALUES ('BUSINESS_INTELLIGENCE', 'Business Intelligence', 'Dashboards premium, consultas SQL, filtros, cache, logs e modo TV.', 'BarChart3', 30, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

CREATE TABLE IF NOT EXISTS bi_fontes_dados (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome VARCHAR(180) NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'POSTGRESQL',
  descricao TEXT,
  host VARCHAR(180),
  porta INTEGER,
  banco VARCHAR(120),
  usuario VARCHAR(120),
  senha_criptografada TEXT,
  parametros_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bi_consultas (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  fonte_dados_id BIGINT REFERENCES bi_fontes_dados(id),
  fonte_dados_tipo VARCHAR(40) NOT NULL DEFAULT 'POSTGRESQL',
  conexao_sqlserver_id BIGINT REFERENCES pim_conexoes_sqlserver(id),
  nome VARCHAR(180) NOT NULL,
  descricao TEXT,
  sql_consulta TEXT NOT NULL,
  parametros_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  tempo_cache_segundos INTEGER NOT NULL DEFAULT 60,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por BIGINT REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por BIGINT REFERENCES usuarios(id),
  atualizado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bi_dashboards (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome VARCHAR(180) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(80),
  status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  publico BOOLEAN NOT NULL DEFAULT FALSE,
  atualizar_automaticamente BOOLEAN NOT NULL DEFAULT TRUE,
  intervalo_atualizacao_segundos INTEGER NOT NULL DEFAULT 60,
  exibir_logo_empresa BOOLEAN NOT NULL DEFAULT TRUE,
  modo_tv_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_por BIGINT REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por BIGINT REFERENCES usuarios(id),
  atualizado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bi_dashboard_paginas (
  id BIGSERIAL PRIMARY KEY,
  dashboard_id BIGINT NOT NULL REFERENCES bi_dashboards(id) ON DELETE CASCADE,
  nome VARCHAR(160) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  layout_colunas INTEGER NOT NULL DEFAULT 12,
  tempo_exibicao_tv_segundos INTEGER NOT NULL DEFAULT 30,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bi_dashboard_widgets (
  id BIGSERIAL PRIMARY KEY,
  dashboard_id BIGINT NOT NULL REFERENCES bi_dashboards(id) ON DELETE CASCADE,
  pagina_id BIGINT REFERENCES bi_dashboard_paginas(id) ON DELETE SET NULL,
  titulo VARCHAR(180) NOT NULL,
  subtitulo VARCHAR(220),
  descricao TEXT,
  tipo_widget VARCHAR(50) NOT NULL DEFAULT 'TABELA',
  consulta_id BIGINT REFERENCES bi_consultas(id),
  ordem INTEGER NOT NULL DEFAULT 1,
  posicao_x INTEGER NOT NULL DEFAULT 0,
  posicao_y INTEGER NOT NULL DEFAULT 0,
  largura INTEGER NOT NULL DEFAULT 4,
  altura INTEGER NOT NULL DEFAULT 3,
  cor_principal VARCHAR(30) DEFAULT '#2563eb',
  icone VARCHAR(80),
  top_x_registros INTEGER,
  ordenar_por VARCHAR(120),
  direcao_ordenacao VARCHAR(10) DEFAULT 'DESC',
  atualizar_automaticamente BOOLEAN NOT NULL DEFAULT TRUE,
  intervalo_atualizacao_segundos INTEGER NOT NULL DEFAULT 60,
  exibir_cabecalho BOOLEAN NOT NULL DEFAULT TRUE,
  exibir_borda BOOLEAN NOT NULL DEFAULT TRUE,
  exibir_sombra BOOLEAN NOT NULL DEFAULT TRUE,
  exibir_exportacao BOOLEAN NOT NULL DEFAULT FALSE,
  exibir_tela_cheia BOOLEAN NOT NULL DEFAULT TRUE,
  colunas_visiveis_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bi_filtros (
  id BIGSERIAL PRIMARY KEY,
  dashboard_id BIGINT NOT NULL REFERENCES bi_dashboards(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  label VARCHAR(160) NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'TEXTO',
  campo VARCHAR(120),
  valor_padrao TEXT,
  opcoes_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  global BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bi_dashboard_permissoes (
  id BIGSERIAL PRIMARY KEY,
  dashboard_id BIGINT NOT NULL REFERENCES bi_dashboards(id) ON DELETE CASCADE,
  usuario_id BIGINT REFERENCES usuarios(id),
  perfil_id BIGINT REFERENCES perfis(id),
  pode_visualizar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_editar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_excluir BOOLEAN NOT NULL DEFAULT FALSE,
  pode_publicar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_modo_tv BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bi_widget_parametros (
  id BIGSERIAL PRIMARY KEY,
  widget_id BIGINT NOT NULL REFERENCES bi_dashboard_widgets(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  valor_padrao TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bi_widget_cache (
  id BIGSERIAL PRIMARY KEY,
  widget_id BIGINT NOT NULL REFERENCES bi_dashboard_widgets(id) ON DELETE CASCADE,
  filtros_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  dados_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  quantidade_registros INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valido_ate TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bi_execucoes (
  id BIGSERIAL PRIMARY KEY,
  dashboard_id BIGINT REFERENCES bi_dashboards(id) ON DELETE SET NULL,
  widget_id BIGINT REFERENCES bi_dashboard_widgets(id) ON DELETE SET NULL,
  consulta_id BIGINT REFERENCES bi_consultas(id) ON DELETE SET NULL,
  usuario_id BIGINT REFERENCES usuarios(id),
  status VARCHAR(40) NOT NULL,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  tempo_execucao_ms INTEGER,
  quantidade_registros INTEGER,
  mensagem_erro TEXT
);

CREATE TABLE IF NOT EXISTS bi_logs_atualizacao (
  id BIGSERIAL PRIMARY KEY,
  dashboard_id BIGINT REFERENCES bi_dashboards(id) ON DELETE SET NULL,
  widget_id BIGINT REFERENCES bi_dashboard_widgets(id) ON DELETE SET NULL,
  consulta_id BIGINT REFERENCES bi_consultas(id) ON DELETE SET NULL,
  usuario_id BIGINT REFERENCES usuarios(id),
  status VARCHAR(40) NOT NULL,
  mensagem TEXT,
  tempo_execucao_ms INTEGER,
  quantidade_registros INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bi_templates (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL UNIQUE,
  descricao TEXT,
  categoria VARCHAR(80),
  estrutura_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bi_temas (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES empresas(id),
  nome VARCHAR(160) NOT NULL,
  configuracao_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bi_playlists_tv (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  nome VARCHAR(160) NOT NULL,
  dashboards_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE bi_widget_cache
  ADD COLUMN IF NOT EXISTS consulta_id BIGINT REFERENCES bi_consultas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS filtros_hash VARCHAR(120) NOT NULL DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS filtros_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS dados_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS quantidade_registros INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS valido_ate TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE bi_widget_cache
  ALTER COLUMN filtros_hash SET DEFAULT 'padrao';

ALTER TABLE bi_dashboard_widgets
  ADD COLUMN IF NOT EXISTS colunas_visiveis_json JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE bi_consultas
  ADD COLUMN IF NOT EXISTS fonte_dados_tipo VARCHAR(40) NOT NULL DEFAULT 'POSTGRESQL',
  ADD COLUMN IF NOT EXISTS conexao_sqlserver_id BIGINT REFERENCES pim_conexoes_sqlserver(id),
  ADD COLUMN IF NOT EXISTS permitir_procedure BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE bi_execucoes
  ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS tempo_execucao_ms INTEGER,
  ADD COLUMN IF NOT EXISTS quantidade_registros INTEGER,
  ADD COLUMN IF NOT EXISTS mensagem_erro TEXT;

ALTER TABLE bi_logs_atualizacao
  ADD COLUMN IF NOT EXISTS consulta_id BIGINT REFERENCES bi_consultas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_evento VARCHAR(80) NOT NULL DEFAULT 'EXECUCAO_WIDGET',
  ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS mensagem TEXT,
  ADD COLUMN IF NOT EXISTS tempo_execucao_ms INTEGER,
  ADD COLUMN IF NOT EXISTS quantidade_registros INTEGER,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE bi_logs_atualizacao
  ALTER COLUMN tipo_evento SET DEFAULT 'EXECUCAO_WIDGET';

CREATE INDEX IF NOT EXISTS idx_bi_dashboards_empresa_status ON bi_dashboards(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_bi_widgets_dashboard ON bi_dashboard_widgets(dashboard_id, pagina_id, ativo);
CREATE INDEX IF NOT EXISTS idx_bi_consultas_empresa ON bi_consultas(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_bi_widget_cache_validade ON bi_widget_cache(widget_id, valido_ate DESC);
CREATE INDEX IF NOT EXISTS idx_bi_logs_data ON bi_logs_atualizacao(criado_em DESC);

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT m.id, item.codigo, item.nome, item.rota, item.icone, item.ordem, TRUE
FROM modulos m
CROSS JOIN (
  VALUES
    ('BI_DASHBOARDS', 'Dashboards', '/Business_Intelligence/Dashboards', 'LayoutDashboard', 10),
    ('BI_FONTES_DADOS', 'Fontes de Dados', '/Business_Intelligence/Fontes_Dados', 'Database', 20),
    ('BI_CONSULTAS', 'Consultas SQL', '/Business_Intelligence/Consultas', 'FileCode2', 30),
    ('BI_TEMPLATES', 'Templates', '/Business_Intelligence/Templates', 'PanelsTopLeft', 40),
    ('BI_LOGS', 'Logs', '/Business_Intelligence/Logs', 'Activity', 50)
) AS item(codigo, nome, rota, icone, ordem)
WHERE m.codigo = 'BUSINESS_INTELLIGENCE'
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, rota = EXCLUDED.rota, icone = EXCLUDED.icone, ordem = EXCLUDED.ordem, ativo = TRUE;

UPDATE menus
SET ativo = FALSE
WHERE codigo = 'BI_ETL';

INSERT INTO telas (modulo_id, menu_id, codigo, nome, rota, arquivo_fonte, componentes_principais, endpoints_usados, tabelas_principais, rotinas_relacionadas, ativo)
SELECT m.id, me.id, me.codigo || '_TELA', me.nome, me.rota, 'apps/frontend/src/modulos/business_intelligence/BusinessIntelligence.tsx',
  'BusinessIntelligenceDashboards, BiDashboardVisualizador, BiWidgetContainer',
  '/api/business-intelligence/*',
  'bi_dashboards, bi_dashboard_widgets, bi_consultas, bi_fontes_dados, bi_execucoes',
  'repositorioBusinessIntelligence', TRUE
FROM modulos m
INNER JOIN menus me ON me.modulo_id = m.id
WHERE m.codigo = 'BUSINESS_INTELLIGENCE'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES
  ('VISUALIZAR_BUSINESS_INTELLIGENCE', 'Visualizar dashboards', 'Permite acessar o modulo Business Intelligence e visualizar dashboards publicados.', TRUE),
  ('BI_CRIAR_DASHBOARDS', 'Criar dashboards', 'Permite criar dashboards e paginas.', TRUE),
  ('BI_EDITAR_DASHBOARDS', 'Editar dashboards', 'Permite editar dashboards, paginas, filtros e widgets.', TRUE),
  ('BI_EXCLUIR_DASHBOARDS', 'Excluir dashboards', 'Permite desativar ou excluir dashboards.', TRUE),
  ('BI_PUBLICAR_DASHBOARDS', 'Publicar dashboards', 'Permite publicar dashboards para usuarios autorizados.', TRUE),
  ('BI_CONFIGURAR_FONTES_DADOS', 'Configurar fontes de dados', 'Permite cadastrar e testar fontes de dados.', TRUE),
  ('BI_CONFIGURAR_CONSULTAS', 'Configurar consultas', 'Permite cadastrar, validar e testar consultas SQL.', TRUE),
  ('BI_GERENCIAR_PERMISSOES_DASHBOARDS', 'Gerenciar permissoes dos dashboards', 'Permite liberar dashboards por usuario ou perfil.', TRUE),
  ('BI_ACESSAR_MODO_TV', 'Acessar modo TV', 'Permite abrir dashboards em modo TV.', TRUE),
  ('BI_VISUALIZAR_LOGS', 'Visualizar logs do BI', 'Permite visualizar execucoes, erros e atualizacoes.', TRUE)
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, ativo = TRUE;

INSERT INTO perfis_permissoes (perfil_id, empresa_id, modulo_id, acao_id, permitido)
SELECT p.id, e.id, m.id, a.id, TRUE
FROM perfis p
CROSS JOIN empresas e
CROSS JOIN modulos m
CROSS JOIN acoes a
WHERE p.codigo = 'ADMINISTRADOR_GERAL'
  AND m.codigo = 'BUSINESS_INTELLIGENCE'
  AND a.codigo IN (
    'VISUALIZAR_BUSINESS_INTELLIGENCE',
    'BI_CRIAR_DASHBOARDS',
    'BI_EDITAR_DASHBOARDS',
    'BI_EXCLUIR_DASHBOARDS',
    'BI_PUBLICAR_DASHBOARDS',
    'BI_CONFIGURAR_FONTES_DADOS',
    'BI_CONFIGURAR_CONSULTAS',
    'BI_GERENCIAR_PERMISSOES_DASHBOARDS',
    'BI_ACESSAR_MODO_TV',
    'BI_VISUALIZAR_LOGS'
  )
  AND NOT EXISTS (
    SELECT 1 FROM perfis_permissoes pp
    WHERE pp.perfil_id = p.id AND pp.empresa_id = e.id AND pp.modulo_id = m.id AND pp.acao_id = a.id
  );

INSERT INTO bi_templates (nome, descricao, categoria, estrutura_json, ativo)
VALUES
  ('Dashboard Logistico', 'Template para acompanhamento de faturamento, separacao, envio e atrasos.', 'Logistica', '{"widgets":["KPI","TABELA","RANKING"],"modo_tv":true}'::JSONB, TRUE),
  ('Dashboard Comercial', 'Template para funil, vendas, metas e ranking de clientes.', 'Comercial', '{"widgets":["KPI","BARRAS","LINHAS"]}'::JSONB, TRUE),
  ('Dashboard Financeiro', 'Template para receitas, despesas, inadimplencia e fluxo de caixa.', 'Financeiro', '{"widgets":["KPI","AREA","TABELA"]}'::JSONB, TRUE),
  ('Dashboard Estoque', 'Template para giro, ruptura, cobertura e estoque critico.', 'Estoque', '{"widgets":["KPI","RANKING","TABELA"]}'::JSONB, TRUE),
  ('Dashboard Operacional', 'Template para filas, SLAs, produtividade e status.', 'Operacional', '{"widgets":["KPI","TIMELINE","STATUS"]}'::JSONB, TRUE),
  ('Dashboard TV', 'Template otimizado para monitores e playlists em tela cheia.', 'TV', '{"modo_tv":true,"tempo_pagina":30}'::JSONB, TRUE)
ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao, categoria = EXCLUDED.categoria, estrutura_json = EXCLUDED.estrutura_json, ativo = TRUE;

INSERT INTO bi_fontes_dados (empresa_id, nome, tipo, descricao, ativo)
SELECT e.id, 'PostgreSQL Control S Hub', 'POSTGRESQL', 'Fonte principal do Control S Hub para views, tabelas tratadas e materialized views alimentadas por ETL.', TRUE
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM bi_fontes_dados f WHERE f.empresa_id = e.id AND f.nome = 'PostgreSQL Control S Hub'
);

UPDATE empresas
SET caminho_logo = '/brand/logo-monvizo-m-transparente.png'
WHERE COALESCE(nome_fantasia, '') ILIKE '%MONVIZO%'
   OR COALESCE(nome_exibido, '') ILIKE '%MONVIZO%';

CREATE TABLE IF NOT EXISTS bi_demo_logistica (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  tipo VARCHAR(80) NOT NULL,
  pedido VARCHAR(40),
  cliente VARCHAR(180),
  vendedor VARCHAR(120),
  transportadora VARCHAR(120),
  codigo VARCHAR(80),
  quantidade INTEGER,
  valor NUMERIC(15, 2),
  valor_secundario NUMERIC(15, 2),
  data_faturamento DATE,
  ultima_data DATE,
  dias INTEGER,
  situacao VARCHAR(120),
  faltante INTEGER,
  comparacao_dia_anterior NUMERIC(10, 2),
  ordem INTEGER NOT NULL DEFAULT 1,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_demo_logistica_empresa_tipo
  ON bi_demo_logistica(empresa_id, tipo, ordem);

DELETE FROM bi_demo_logistica;

INSERT INTO bi_demo_logistica (empresa_id, tipo, pedido, cliente, vendedor, transportadora, codigo, quantidade, valor, valor_secundario, data_faturamento, ultima_data, dias, situacao, faltante, comparacao_dia_anterior, ordem)
SELECT e.id, item.tipo, item.pedido, item.cliente, item.vendedor, item.transportadora, item.codigo, item.quantidade, item.valor, item.valor_secundario, item.data_faturamento::DATE, item.ultima_data::DATE, item.dias, item.situacao, item.faltante, item.comparacao, item.ordem
FROM empresas e
CROSS JOIN (
  VALUES
    ('KPI_FATURAMENTO_APROVADO', NULL, NULL, NULL, NULL, NULL, 35, 112781.10, NULL, NULL, NULL, NULL, 'Valor faturado aprovado', NULL, 0.00, 1),
    ('KPI_FATURADOS_DIA', NULL, NULL, NULL, NULL, NULL, 449, 1655480.43, 791534.77, NULL, NULL, NULL, 'Valor faturado', NULL, 106.00, 1),
    ('KPI_SEPARADOS_DIA', NULL, NULL, NULL, NULL, NULL, 229, 1098721.83, NULL, NULL, NULL, NULL, 'Valor separado NF', NULL, 78.90, 1),
    ('KPI_FATURADOS_NAO_SEPARADOS', NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'Pedidos', NULL, 0.00, 1),
    ('KPI_EM_SEPARACAO', NULL, NULL, NULL, NULL, NULL, 489, NULL, NULL, NULL, NULL, NULL, 'Pedidos', NULL, 1711.10, 1),
    ('FATURADOS_NAO_SEPARADOS', '740211', 'CLIENTE TESTE', 'MAGAZINE', NULL, NULL, 1, 2450.00, NULL, '2026-07-08', NULL, 0, 'FAT. ENTR', NULL, 0.00, 1),
    ('EM_SEPARACAO', '728682', 'UNIMED', 'GUSTAVO', NULL, NULL, 2, 128529.88, NULL, '2026-01-15', NULL, 174, 'FAT. ENTR', NULL, 0.00, 1),
    ('EM_SEPARACAO', '730071', 'EDINELSON', 'OMAR', NULL, NULL, 2, 2680.00, NULL, '2026-01-28', NULL, 161, 'FAT. ENTR', NULL, 0.00, 2),
    ('EM_SEPARACAO', '730412', 'INFRAMASTER', 'JUCIEI', NULL, NULL, 1, 73500.00, NULL, '2026-02-02', NULL, 156, 'FAT. ENTR', NULL, 0.00, 3),
    ('EM_SEPARACAO', '730424', 'TWN17', 'NILSON', NULL, NULL, 1, 23160.00, NULL, '2026-02-03', NULL, 155, 'FAT. ENTR', NULL, 0.00, 4),
    ('EM_SEPARACAO', '731119', 'Moises', 'OMAR', NULL, NULL, 2, 3100.00, NULL, '2026-02-11', NULL, 147, 'FAT. ENTR', NULL, 0.00, 5),
    ('EM_SEPARACAO', '731568', 'ADONIS', 'OMAR', NULL, NULL, 4, 8500.00, NULL, '2026-02-17', NULL, 141, 'FAT. ENTR', NULL, 0.00, 6),
    ('SEM_ENTREGA_TOTAL', '746494', 'KIJEME', 'MAGAZINE', NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-06', NULL, NULL, 20, 0.00, 1),
    ('SEM_ENTREGA_TOTAL', '746732', 'SHEN', 'MAGAZINE', NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-06', NULL, NULL, 18, 0.00, 2),
    ('SEM_ENTREGA_TOTAL', '746317', 'FELUCCA', 'NILSON', NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-06', NULL, NULL, 9, 0.00, 3),
    ('SEM_ENTREGA_TOTAL', '746562', 'DIEGO', 'AMAZON', NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-06', NULL, NULL, 8, 0.00, 4),
    ('SEM_ENTREGA_TOTAL', '746498', 'NICOLE', 'MAGAZINE', NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-06', NULL, NULL, 8, 0.00, 5),
    ('SEM_ENTREGA_TOTAL', '746640', 'FLADEMIR', 'AMAZON', NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-06', NULL, NULL, 8, 0.00, 6),
    ('SEM_ENVIO_2_DIAS', '745991', 'CLIENTE A', 'OMAR', 'MONVIZO', NULL, NULL, NULL, NULL, NULL, '2026-07-05', 3, 'CRIADO', NULL, 0.00, 1),
    ('PENDENTE_ESCOLHA_TRANSPORTADORA', '747001', 'ALFA SERVICE', 'GUSTAVO', NULL, NULL, NULL, 18540.90, NULL, '2026-07-08', NULL, 0, 'AGUARDANDO ESCOLHA', NULL, 0.00, 1),
    ('PENDENTE_ESCOLHA_TRANSPORTADORA', '747018', 'BETA CLIMATIZACAO', 'OMAR', NULL, NULL, NULL, 9230.40, NULL, '2026-07-08', NULL, 0, 'AGUARDANDO ESCOLHA', NULL, 0.00, 2),
    ('PENDENTE_ESCOLHA_TRANSPORTADORA', '746884', 'GAMA INSTALACOES', 'NILSON', NULL, NULL, NULL, 31780.00, NULL, '2026-07-07', NULL, 1, 'AGUARDANDO ESCOLHA', NULL, 0.00, 3),
    ('PENDENTE_ESCOLHA_TRANSPORTADORA', '746802', 'DELTA PECAS', 'JUCIEI', NULL, NULL, NULL, 12760.35, NULL, '2026-07-07', NULL, 1, 'AGUARDANDO ESCOLHA', NULL, 0.00, 4),
    ('NAO_VINCULADOS_1_DIA', NULL, NULL, NULL, 'ALFA', '5261', 14, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 1),
    ('NAO_VINCULADOS_1_DIA', NULL, NULL, NULL, 'AGEX', '77582', 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 2),
    ('NAO_VINCULADOS_1_DIA', NULL, NULL, NULL, 'MONVIZO', '145688', 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 3),
    ('NAO_VINCULADOS_1_DIA', NULL, NULL, NULL, 'AVIOES', '125081', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 4)
) AS item(tipo, pedido, cliente, vendedor, transportadora, codigo, quantidade, valor, valor_secundario, data_faturamento, ultima_data, dias, situacao, faltante, comparacao, ordem);

INSERT INTO bi_consultas (empresa_id, fonte_dados_id, nome, descricao, sql_consulta, tempo_cache_segundos, ativo)
SELECT e.id, f.id, item.nome, item.descricao, item.sql_consulta, item.cache, TRUE
FROM empresas e
INNER JOIN bi_fontes_dados f ON f.empresa_id = e.id AND f.nome = 'PostgreSQL Control S Hub'
CROSS JOIN (
  VALUES
    ('BI - Faturamento Aprovado', 'Total aprovado no dia.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo IN (''FATURADOS_NAO_SEPARADOS'', ''EM_SEPARACAO'') ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, COALESCE(SUM(valor), 0) AS valor_monetario, ''Valor faturado aprovado'' AS situacao, (SELECT COUNT(*)::INTEGER FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''SEM_ENVIO_2_DIAS'') AS aguardando_faturamento, (SELECT COUNT(*)::INTEGER FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''PENDENTE_ESCOLHA_TRANSPORTADORA'') AS aguardando_escolha_transportadora, 0::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Faturados no Dia', 'Pedidos faturados no dia.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo IN (''FATURADOS_NAO_SEPARADOS'', ''EM_SEPARACAO'') ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, COALESCE(SUM(valor), 0) AS valor_monetario, 791534.77::NUMERIC AS valor_secundario, ''Valor faturado'' AS situacao, 106::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Separados no Dia', 'Pedidos separados no dia.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, quantidade AS fat_entr FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''EM_SEPARACAO'' ORDER BY ordem) SELECT COALESCE(SUM(fat_entr), 0)::INTEGER AS valor, COALESCE(SUM(valor), 0) AS valor_monetario, ''Valor separado NF'' AS situacao, 78.9::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Faturados e Nao Separados KPI', 'Quantidade faturada sem inicio de separacao.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''FATURADOS_NAO_SEPARADOS'' ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, ''Pedidos'' AS situacao, COUNT(*) FILTER (WHERE dias <= 1)::INTEGER AS pedidos_do_dia, COUNT(*) FILTER (WHERE dias > 1)::INTEGER AS pedidos_maior_1_dia, 0::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Em Separacao KPI', 'Quantidade em separacao.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, quantidade AS fat_entr FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''EM_SEPARACAO'' ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, ''Pedidos'' AS situacao, COUNT(*) FILTER (WHERE dias <= 1)::INTEGER AS pedidos_do_dia, COUNT(*) FILTER (WHERE dias > 1)::INTEGER AS pedidos_maior_1_dia, 1711.1::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Faturados e Nao Separados', 'Pedidos faturados aguardando separacao.', 'SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''FATURADOS_NAO_SEPARADOS'' ORDER BY ordem', 120),
    ('BI - Em Separacao', 'Pedidos em separacao ou fluxo logistico.', 'SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, quantidade AS fat_entr FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''EM_SEPARACAO'' ORDER BY ordem', 120),
    ('BI - Sem Entrega Total', 'Pedidos sem entrega total.', 'SELECT pedido, cliente, vendedor, faltante AS falt, ultima_data AS data_uc FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''SEM_ENTREGA_TOTAL'' ORDER BY ordem', 120),
    ('BI - Sem Envio 2 Dias', 'Pedidos sem envio ha mais de dois dias.', 'SELECT pedido, cliente, vendedor, transportadora AS transp, situacao AS sit, ultima_data AS ult_dt, dias FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''SEM_ENVIO_2_DIAS'' ORDER BY ordem', 120),
    ('BI - Pendente Escolha Transportadora', 'Pedidos aguardando escolha da transportadora.', 'SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''PENDENTE_ESCOLHA_TRANSPORTADORA'' ORDER BY ordem', 120),
    ('BI - Nao Vinculados 1 Dia', 'Transportadoras nao vinculadas ha mais de um dia.', 'SELECT transportadora AS transp, codigo, quantidade AS qtd FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''NAO_VINCULADOS_1_DIA'' ORDER BY ordem', 120),
    ('BI - Evolucao Separacao 30 Dias', 'Dados ficticios para grafico de evolucao da separacao nos ultimos 30 dias.', 'SELECT (CURRENT_DATE - (29 - gs)::INTEGER) AS dia, (8 + ((gs * 7) % 13))::INTEGER AS separados, (10 + ((gs * 5) % 11))::INTEGER AS meta FROM generate_series(0, 29) AS gs ORDER BY dia', 120)
) AS item(nome, descricao, sql_consulta, cache)
WHERE NOT EXISTS (
  SELECT 1 FROM bi_consultas c WHERE c.empresa_id = e.id AND c.nome = item.nome
);

UPDATE bi_consultas c
SET sql_consulta = item.sql_consulta,
  descricao = item.descricao,
  tempo_cache_segundos = item.cache,
  fonte_dados_tipo = 'POSTGRESQL',
  atualizado_em = NOW()
FROM (
  VALUES
    ('BI - Faturamento Aprovado', 'Total aprovado no dia.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo IN (''FATURADOS_NAO_SEPARADOS'', ''EM_SEPARACAO'') ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, COALESCE(SUM(valor), 0) AS valor_monetario, ''Valor faturado aprovado'' AS situacao, (SELECT COUNT(*)::INTEGER FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''SEM_ENVIO_2_DIAS'') AS aguardando_faturamento, (SELECT COUNT(*)::INTEGER FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''PENDENTE_ESCOLHA_TRANSPORTADORA'') AS aguardando_escolha_transportadora, 0::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Faturados no Dia', 'Pedidos faturados no dia.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo IN (''FATURADOS_NAO_SEPARADOS'', ''EM_SEPARACAO'') ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, COALESCE(SUM(valor), 0) AS valor_monetario, 791534.77::NUMERIC AS valor_secundario, ''Valor faturado'' AS situacao, 106::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Separados no Dia', 'Pedidos separados no dia.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, quantidade AS fat_entr FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''EM_SEPARACAO'' ORDER BY ordem) SELECT COALESCE(SUM(fat_entr), 0)::INTEGER AS valor, COALESCE(SUM(valor), 0) AS valor_monetario, ''Valor separado NF'' AS situacao, 78.9::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Faturados e Nao Separados KPI', 'Quantidade faturada sem inicio de separacao.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''FATURADOS_NAO_SEPARADOS'' ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, ''Pedidos'' AS situacao, COUNT(*) FILTER (WHERE dias <= 1)::INTEGER AS pedidos_do_dia, COUNT(*) FILTER (WHERE dias > 1)::INTEGER AS pedidos_maior_1_dia, 0::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Em Separacao KPI', 'Quantidade em separacao.', 'WITH base AS (SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, quantidade AS fat_entr FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''EM_SEPARACAO'' ORDER BY ordem) SELECT COUNT(*)::INTEGER AS valor, ''Pedidos'' AS situacao, COUNT(*) FILTER (WHERE dias <= 1)::INTEGER AS pedidos_do_dia, COUNT(*) FILTER (WHERE dias > 1)::INTEGER AS pedidos_maior_1_dia, 1711.1::NUMERIC AS comparacao_dia_anterior, COALESCE(jsonb_agg(to_jsonb(base)), ''[]''::jsonb) AS detalhes_json FROM base', 60),
    ('BI - Faturados e Nao Separados', 'Pedidos faturados aguardando separacao.', 'SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''FATURADOS_NAO_SEPARADOS'' ORDER BY ordem', 120),
    ('BI - Em Separacao', 'Pedidos em separacao ou fluxo logistico.', 'SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, quantidade AS fat_entr FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''EM_SEPARACAO'' ORDER BY ordem', 120),
    ('BI - Sem Entrega Total', 'Pedidos sem entrega total.', 'SELECT pedido, cliente, vendedor, faltante AS falt, ultima_data AS data_uc FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''SEM_ENTREGA_TOTAL'' ORDER BY ordem', 120),
    ('BI - Sem Envio 2 Dias', 'Pedidos sem envio ha mais de dois dias.', 'SELECT pedido, cliente, vendedor, transportadora AS transp, situacao AS sit, ultima_data AS ult_dt, dias FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''SEM_ENVIO_2_DIAS'' ORDER BY ordem', 120),
    ('BI - Pendente Escolha Transportadora', 'Pedidos aguardando escolha da transportadora.', 'SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''PENDENTE_ESCOLHA_TRANSPORTADORA'' ORDER BY ordem', 120),
    ('BI - Nao Vinculados 1 Dia', 'Transportadoras nao vinculadas ha mais de um dia.', 'SELECT transportadora AS transp, codigo, quantidade AS qtd FROM bi_demo_logistica WHERE empresa_id = :empresa_id AND tipo = ''NAO_VINCULADOS_1_DIA'' ORDER BY ordem', 120),
    ('BI - Evolucao Separacao 30 Dias', 'Dados ficticios para grafico de evolucao da separacao nos ultimos 30 dias.', 'SELECT (CURRENT_DATE - (29 - gs)::INTEGER) AS dia, (8 + ((gs * 7) % 13))::INTEGER AS separados, (10 + ((gs * 5) % 11))::INTEGER AS meta FROM generate_series(0, 29) AS gs ORDER BY dia', 120)
) AS item(nome, descricao, sql_consulta, cache)
WHERE c.nome = item.nome;

WITH dashboard_base AS (
  INSERT INTO bi_dashboards (empresa_id, nome, descricao, categoria, status, publico, atualizar_automaticamente, intervalo_atualizacao_segundos, exibir_logo_empresa, modo_tv_habilitado)
  SELECT e.id, 'Acompanhamento Logistico', 'Dashboard inicial para operacao logistica em tempo real.', 'Logistica', 'PUBLICADO', FALSE, TRUE, 60, TRUE, TRUE
  FROM empresas e
  WHERE NOT EXISTS (
    SELECT 1 FROM bi_dashboards d WHERE d.empresa_id = e.id AND d.nome = 'Acompanhamento Logistico'
  )
  RETURNING id, empresa_id
), dashboards AS (
  SELECT id, empresa_id FROM dashboard_base
  UNION ALL
  SELECT id, empresa_id FROM bi_dashboards WHERE nome = 'Acompanhamento Logistico'
), paginas AS (
  INSERT INTO bi_dashboard_paginas (dashboard_id, nome, ordem, layout_colunas, tempo_exibicao_tv_segundos, ativo)
  SELECT d.id, 'Visao Geral', 1, 15, 35, TRUE
  FROM dashboards d
  WHERE NOT EXISTS (SELECT 1 FROM bi_dashboard_paginas p WHERE p.dashboard_id = d.id AND p.nome = 'Visao Geral')
  RETURNING id, dashboard_id
)
DELETE FROM bi_widget_cache
WHERE widget_id IN (
  SELECT w.id
  FROM bi_dashboard_widgets w
  INNER JOIN dashboards d ON d.id = w.dashboard_id
);

UPDATE bi_execucoes e
SET widget_id = NULL
WHERE widget_id IN (
  SELECT w.id
  FROM bi_dashboard_widgets w
  INNER JOIN bi_dashboards d ON d.id = w.dashboard_id
  WHERE d.nome = 'Acompanhamento Logistico'
);

UPDATE bi_logs_atualizacao l
SET widget_id = NULL
WHERE widget_id IN (
  SELECT w.id
  FROM bi_dashboard_widgets w
  INNER JOIN bi_dashboards d ON d.id = w.dashboard_id
  WHERE d.nome = 'Acompanhamento Logistico'
);

UPDATE bi_dashboard_paginas p
SET layout_colunas = 15,
  tempo_exibicao_tv_segundos = 35,
  ativo = TRUE
FROM bi_dashboards d
WHERE d.id = p.dashboard_id
  AND d.nome = 'Acompanhamento Logistico'
  AND p.nome = 'Visao Geral';

UPDATE bi_dashboard_widgets w
SET titulo = CASE
    WHEN w.titulo = 'Faturados e Nao Separados KPI' THEN 'Faturados sem Inicio de Separacao KPI'
    WHEN w.titulo = 'Faturados e Nao Separados' THEN 'Faturados sem Inicio de Separacao'
    ELSE w.titulo
  END
FROM bi_dashboards d
WHERE d.id = w.dashboard_id
  AND d.nome = 'Acompanhamento Logistico'
  AND w.titulo IN ('Faturados e Nao Separados KPI', 'Faturados e Nao Separados');

WITH dashboards AS (
  SELECT id, empresa_id FROM bi_dashboards WHERE nome = 'Acompanhamento Logistico'
)
DELETE FROM bi_widget_cache
WHERE widget_id IN (
  SELECT w.id
  FROM bi_dashboard_widgets w
  INNER JOIN dashboards d ON d.id = w.dashboard_id
);

WITH dashboards AS (
  SELECT id, empresa_id FROM bi_dashboards WHERE nome = 'Acompanhamento Logistico'
)
INSERT INTO bi_dashboard_widgets (dashboard_id, pagina_id, titulo, subtitulo, tipo_widget, consulta_id, ordem, largura, altura, cor_principal, icone, top_x_registros, ordenar_por, direcao_ordenacao, intervalo_atualizacao_segundos)
SELECT d.id, p.id, item.titulo, item.subtitulo, item.tipo_widget, c.id, item.ordem, item.largura, item.altura, item.cor, item.icone, item.top_x, item.ordenar_por, item.direcao, item.intervalo
FROM dashboards d
CROSS JOIN (
  VALUES
    ('Faturamento Aprovado', 'Valor faturado aprovado', 'KPI', 'BI - Faturamento Aprovado', 1, 3, 2, '#1b3f66', 'CircleDollarSign', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Faturados no Dia', 'Valor faturado', 'KPI', 'BI - Faturados no Dia', 2, 3, 2, '#333333', 'Receipt', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Separados no Dia', 'Valor separado NF', 'KPI', 'BI - Separados no Dia', 3, 3, 2, '#80c0ff', 'PackageCheck', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Faturados sem Inicio de Separacao KPI', 'Pedidos', 'KPI', 'BI - Faturados e Nao Separados KPI', 4, 3, 2, '#7d7db2', 'AlertCircle', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Em Separacao KPI', 'Pedidos', 'KPI', 'BI - Em Separacao KPI', 5, 3, 2, '#ffe780', 'Clock', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Pendente Escolha da Transportadora', 'Transportadora', 'TABELA', 'BI - Pendente Escolha Transportadora', 6, 5, 5, '#1b3f66', 'Truck', 10, 'dias', 'DESC', 120),
    ('Faturados sem Inicio de Separacao', 'Detalhe', 'TABELA', 'BI - Faturados e Nao Separados', 7, 5, 5, '#7d7db2', 'PackageOpen', 10, 'dias', 'DESC', 120),
    ('Em Separacao', 'Detalhe', 'TABELA', 'BI - Em Separacao', 8, 5, 5, '#ffe780', 'Boxes', 10, 'dias', 'DESC', 120),
    ('Sem Entrega Total', 'MO 3104', 'TABELA', 'BI - Sem Entrega Total', 9, 5, 5, '#f28b2d', 'Truck', 10, 'falt', 'DESC', 120),
    ('Sem Envio > 2 Dias', 'Status criado/despachado', 'TABELA', 'BI - Sem Envio 2 Dias', 10, 5, 5, '#37b37e', 'Send', 10, 'dias', 'DESC', 120),
    ('Nao Vinculados > 1 Dia', 'Transportadoras', 'TABELA', 'BI - Nao Vinculados 1 Dia', 11, 5, 5, '#37b37e', 'Link', 10, 'qtd', 'DESC', 120)
) AS item(titulo, subtitulo, tipo_widget, item_consulta_nome, ordem, largura, altura, cor, icone, top_x, ordenar_por, direcao, intervalo)
INNER JOIN bi_dashboard_paginas p ON p.dashboard_id = d.id AND p.nome = 'Visao Geral'
INNER JOIN bi_consultas c ON c.empresa_id = d.empresa_id AND c.nome = item.item_consulta_nome
WHERE NOT EXISTS (
  SELECT 1 FROM bi_dashboard_widgets w WHERE w.dashboard_id = d.id AND w.titulo = item.titulo
);

UPDATE bi_dashboard_widgets w
SET subtitulo = item.subtitulo,
  tipo_widget = item.tipo_widget,
  consulta_id = c.id,
  ordem = item.ordem,
  largura = item.largura,
  altura = item.altura,
  cor_principal = item.cor,
  icone = item.icone,
  top_x_registros = item.top_x,
  ordenar_por = item.ordenar_por,
  direcao_ordenacao = item.direcao,
  intervalo_atualizacao_segundos = item.intervalo,
  ativo = TRUE
FROM bi_dashboards d
CROSS JOIN (
  VALUES
    ('Faturamento Aprovado', 'Valor faturado aprovado', 'KPI', 'BI - Faturamento Aprovado', 1, 3, 2, '#1b3f66', 'CircleDollarSign', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Faturados no Dia', 'Valor faturado', 'KPI', 'BI - Faturados no Dia', 2, 3, 2, '#333333', 'Receipt', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Separados no Dia', 'Valor separado NF', 'KPI', 'BI - Separados no Dia', 3, 3, 2, '#80c0ff', 'PackageCheck', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Faturados sem Inicio de Separacao KPI', 'Pedidos', 'KPI', 'BI - Faturados e Nao Separados KPI', 4, 3, 2, '#7d7db2', 'AlertCircle', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Em Separacao KPI', 'Pedidos', 'KPI', 'BI - Em Separacao KPI', 5, 3, 2, '#ffe780', 'Clock', NULL::INTEGER, NULL::VARCHAR, 'DESC', 60),
    ('Pendente Escolha da Transportadora', 'Transportadora', 'TABELA', 'BI - Pendente Escolha Transportadora', 6, 5, 5, '#1b3f66', 'Truck', 10, 'dias', 'DESC', 120),
    ('Faturados sem Inicio de Separacao', 'Detalhe', 'TABELA', 'BI - Faturados e Nao Separados', 7, 5, 5, '#7d7db2', 'PackageOpen', 10, 'dias', 'DESC', 120),
    ('Em Separacao', 'Detalhe', 'TABELA', 'BI - Em Separacao', 8, 5, 5, '#ffe780', 'Boxes', 10, 'dias', 'DESC', 120),
    ('Sem Entrega Total', 'MO 3104', 'TABELA', 'BI - Sem Entrega Total', 9, 5, 5, '#f28b2d', 'Truck', 10, 'falt', 'DESC', 120),
    ('Sem Envio > 2 Dias', 'Status criado/despachado', 'TABELA', 'BI - Sem Envio 2 Dias', 10, 5, 5, '#37b37e', 'Send', 10, 'dias', 'DESC', 120),
    ('Nao Vinculados > 1 Dia', 'Transportadoras', 'TABELA', 'BI - Nao Vinculados 1 Dia', 11, 5, 5, '#37b37e', 'Link', 10, 'qtd', 'DESC', 120)
) AS item(titulo, subtitulo, tipo_widget, item_consulta_nome, ordem, largura, altura, cor, icone, top_x, ordenar_por, direcao, intervalo)
INNER JOIN bi_consultas c ON c.empresa_id = d.empresa_id AND c.nome = item.item_consulta_nome
WHERE d.id = w.dashboard_id
  AND d.nome = 'Acompanhamento Logistico'
  AND w.titulo = item.titulo;

UPDATE bi_dashboard_widgets w
SET colunas_visiveis_json = item.colunas::JSONB
FROM bi_dashboards d
CROSS JOIN (
  VALUES
    ('Faturados sem Inicio de Separacao', '["pedido","cliente","vendedor","valor","data_faturamento","dias","situacao"]'),
    ('Em Separacao', '["pedido","cliente","vendedor","valor","data_faturamento","dias","fat_entr"]'),
    ('Sem Entrega Total', '["pedido","cliente","vendedor","falt","data_uc"]'),
    ('Sem Envio > 2 Dias', '["pedido","cliente","vendedor","transp","sit","ult_dt","dias"]'),
    ('Pendente Escolha da Transportadora', '["pedido","cliente","vendedor","valor","data_faturamento","dias","situacao"]'),
    ('Nao Vinculados > 1 Dia', '["transp","codigo","qtd"]')
) AS item(titulo, colunas)
WHERE d.id = w.dashboard_id
  AND d.nome = 'Acompanhamento Logistico'
  AND w.titulo = item.titulo;

UPDATE bi_dashboard_widgets w
SET ativo = FALSE
FROM bi_dashboards d
WHERE d.id = w.dashboard_id
  AND d.nome = 'Acompanhamento Logistico'
  AND w.titulo = 'Evolucao Separacao 30 Dias';

