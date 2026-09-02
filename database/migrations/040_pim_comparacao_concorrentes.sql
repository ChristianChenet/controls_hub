-- Estrutura exclusiva do Cadastro de Produto Central para comparacao ERP x concorrentes.
-- Nao altera Cotacao de Frete nem entidades globais de autenticacao.

CREATE TABLE IF NOT EXISTS pim_comparacao_fontes (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  codigo VARCHAR(80) NOT NULL,
  nome VARCHAR(160) NOT NULL,
  tipo_fonte VARCHAR(30) NOT NULL DEFAULT 'CONCORRENTE',
  url_base TEXT,
  prioridade INTEGER NOT NULL DEFAULT 50,
  regras JSONB NOT NULL DEFAULT '{}'::JSONB,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ,
  CONSTRAINT pim_comparacao_fontes_codigo_unico UNIQUE (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS pim_comparacao_atributos (
  id BIGSERIAL PRIMARY KEY,
  fonte_id BIGINT NOT NULL REFERENCES pim_comparacao_fontes(id) ON DELETE CASCADE,
  codigo VARCHAR(120) NOT NULL,
  nome VARCHAR(180) NOT NULL,
  tipo_campo VARCHAR(40) NOT NULL DEFAULT 'TEXTO',
  unidade_medida VARCHAR(60),
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT pim_comparacao_atributos_unico UNIQUE (fonte_id, codigo)
);

CREATE TABLE IF NOT EXISTS pim_comparacao_registros (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  fonte_id BIGINT NOT NULL REFERENCES pim_comparacao_fontes(id) ON DELETE CASCADE,
  produto_id BIGINT REFERENCES produtos(id) ON DELETE SET NULL,
  chave_original VARCHAR(260) NOT NULL,
  chave_normalizada VARCHAR(260) NOT NULL,
  anuncio_url TEXT NOT NULL,
  titulo VARCHAR(320),
  marca VARCHAR(180),
  modelo VARCHAR(220),
  dados JSONB NOT NULL DEFAULT '{}'::JSONB,
  confiabilidade JSONB NOT NULL DEFAULT '{}'::JSONB,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  origem VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alterado_em TIMESTAMPTZ,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id),
  CONSTRAINT pim_comparacao_registros_url_unico UNIQUE (fonte_id, anuncio_url)
);

CREATE INDEX IF NOT EXISTS idx_pim_comparacao_registros_chave
  ON pim_comparacao_registros (empresa_id, chave_normalizada);
CREATE INDEX IF NOT EXISTS idx_pim_comparacao_registros_produto
  ON pim_comparacao_registros (empresa_id, produto_id, alterado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pim_comparacao_fontes_tipo
  ON pim_comparacao_fontes (empresa_id, tipo_fonte, prioridade);

INSERT INTO pim_comparacao_fontes (empresa_id, codigo, nome, tipo_fonte, url_base, prioridade, regras, ativo)
SELECT e.id, fonte.codigo, fonte.nome, fonte.tipo_fonte, fonte.url_base, fonte.prioridade, fonte.regras::JSONB, TRUE
FROM empresas e
CROSS JOIN (
  VALUES
    ('ERP_ATRIBUTOS', 'Atributos ERP - Planilha', 'ERP', NULL, 0, '{"chave":"MODELO_ALFA_NUMERICO","origem":"Atributos_ERP.xlsx"}'),
    ('LEVEROS', 'Leveros', 'CONCORRENTE', 'https://www.leveros.com.br/', 10, '{"prioridade_comercial":true}'),
    ('DUFRIO', 'Dufrio', 'CONCORRENTE', 'https://www.dufrio.com.br/', 20, '{}'),
    ('CENTRAL_AR', 'Central Ar', 'CONCORRENTE', 'https://www.centralar.com.br/', 30, '{}'),
    ('FRIGELAR', 'Frigelar', 'CONCORRENTE', 'https://www.frigelar.com.br/', 40, '{}'),
    ('WEBCONTINENTAL', 'Webcontinental', 'CONCORRENTE', 'https://www.webcontinental.com.br/', 50, '{}')
) AS fonte(codigo, nome, tipo_fonte, url_base, prioridade, regras)
ON CONFLICT (empresa_id, codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  tipo_fonte = EXCLUDED.tipo_fonte,
  url_base = EXCLUDED.url_base,
  prioridade = EXCLUDED.prioridade,
  regras = EXCLUDED.regras,
  ativo = TRUE,
  alterado_em = NOW();

WITH catalogo(codigo, nome, tipo_campo, unidade_medida, ordem) AS (
  VALUES
    ('TIPO_GAS', 'Tipo de gas', 'TEXTO', NULL, 10),
    ('CAPACIDADE', 'Capacidade', 'DECIMAL', 'BTU/h', 20),
    ('CICLO', 'Ciclo', 'TEXTO', NULL, 30),
    ('TIPO_TECNOLOGIA_COMPRESSOR', 'Tipo tecnologia compressor', 'TEXTO', NULL, 40),
    ('TIPO_COMPRESSOR', 'Tipo compressor', 'TEXTO', NULL, 50),
    ('TIPO_CONDENSADOR', 'Tipo condensador', 'TEXTO', NULL, 60),
    ('POTENCIA_REFRIGERACAO', 'Potencia refrigeracao', 'DECIMAL', NULL, 70),
    ('POTENCIA_AQUECIMENTO', 'Potencia aquecimento', 'DECIMAL', NULL, 80),
    ('CORRENTE_ELETRICA_REFRIGERACAO', 'Corrente eletrica refrigeracao', 'DECIMAL', 'A', 90),
    ('CORRENTE_ELETRICA_AQUECIMENTO', 'Corrente eletrica aquecimento', 'DECIMAL', 'A', 100),
    ('EFICIENCIA_ENERGETICA', 'Eficiencia energetica', 'TEXTO', NULL, 110),
    ('CLASSIFICACAO_ENERGETICA', 'Classificacao energetica', 'TEXTO', NULL, 120),
    ('CONSUMO_ENERGIA_PROCEL', 'Consumo energia PROCEL', 'DECIMAL', 'kWh/ano', 130),
    ('VAZAO_AR', 'Vazao de ar', 'DECIMAL', 'm3/h', 140),
    ('NIVEL_RUIDO_INTERNO', 'Nivel de ruido interno', 'DECIMAL', 'dB', 150),
    ('NIVEL_RUIDO_EXTERNO', 'Nivel de ruido externo', 'DECIMAL', 'dB', 160),
    ('ALIMENTACAO', 'Alimentacao', 'TEXTO', NULL, 170),
    ('FREQUENCIA', 'Frequencia', 'DECIMAL', 'Hz', 180),
    ('FASE', 'Fase', 'TEXTO', NULL, 190),
    ('DISJUNTOR', 'Disjuntor', 'TEXTO', NULL, 200),
    ('CONEXAO_TUBULACAO_LIQUIDO', 'Conexao tubulacao liquido', 'TEXTO', NULL, 210),
    ('CONEXAO_TUBULACAO_GAS', 'Conexao tubulacao gas', 'TEXTO', NULL, 220),
    ('DISTANCIA_MAXIMA_TUBULACAO', 'Distancia maxima tubulacao', 'DECIMAL', 'm', 230),
    ('DESNIVEL_MAXIMO_TUBULACAO', 'Desnivel maximo tubulacao', 'DECIMAL', 'm', 240),
    ('AREA_APLICACAO', 'Area de aplicacao', 'DECIMAL', 'm2', 250),
    ('MATERIAL_SERPENTINA', 'Material serpentina', 'TEXTO', NULL, 260),
    ('MATERIAL_GABINETE', 'Material gabinete', 'TEXTO', NULL, 270),
    ('MATERIAL_GABINETE_CONDENSADORA', 'Material gabinete condensadora', 'TEXTO', NULL, 280),
    ('MATERIAL_SERPENTINA_CONDENSADORA', 'Material serpentina condensadora', 'TEXTO', NULL, 290),
    ('PROTECAO_ANTICORROSAO', 'Protecao anticorrosao', 'BOOLEANO', NULL, 300),
    ('SEER', 'SEER', 'DECIMAL', NULL, 310),
    ('EER', 'EER', 'DECIMAL', NULL, 320),
    ('WIFI', 'Wi-Fi', 'BOOLEANO', NULL, 330),
    ('COR', 'Cor', 'TEXTO', NULL, 340),
    ('TIMER', 'Temporizador', 'BOOLEANO', NULL, 350),
    ('SLEEP', 'Sleep', 'BOOLEANO', NULL, 360),
    ('SWING', 'Swing', 'BOOLEANO', NULL, 370),
    ('TURBO', 'Turbo', 'BOOLEANO', NULL, 380),
    ('MEMORIA', 'Memoria', 'BOOLEANO', NULL, 390),
    ('CONTROLE_REMOTO_ILUMINADO', 'Controle remoto iluminado', 'BOOLEANO', NULL, 400),
    ('AVISO_LIMPA_FILTRO', 'Aviso limpa filtro', 'BOOLEANO', NULL, 405),
    ('FILTRO_ANTIBACTERIA', 'Filtro antibacteria', 'BOOLEANO', NULL, 410),
    ('DESUMIDIFICACAO', 'Desumidificacao', 'BOOLEANO', NULL, 420),
    ('FUNCAO_BRISA', 'Funcao brisa', 'BOOLEANO', NULL, 430),
    ('CONTROLE_DIRECAO_AR', 'Controle direcao do ar', 'TEXTO', NULL, 440),
    ('INDICADOR_TEMPERATURA', 'Indicador temperatura', 'BOOLEANO', NULL, 445),
    ('REGULA_VELOCIDADE_VENTILACAO', 'Regula velocidade ventilacao', 'BOOLEANO', NULL, 450)
)
INSERT INTO pim_comparacao_atributos (fonte_id, codigo, nome, tipo_campo, unidade_medida, obrigatorio, ordem, ativo)
SELECT f.id, c.codigo, c.nome, c.tipo_campo, c.unidade_medida, FALSE, c.ordem, TRUE
FROM pim_comparacao_fontes f
CROSS JOIN catalogo c
WHERE f.tipo_fonte IN ('ERP', 'CONCORRENTE')
ON CONFLICT (fonte_id, codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  tipo_campo = EXCLUDED.tipo_campo,
  unidade_medida = EXCLUDED.unidade_medida,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

-- Cadastro mestre dos atributos tecnicos usados pelo produto e pelo comparativo.
WITH grupos(codigo, nome, ordem) AS (
  VALUES
    ('DADOS_TECNICOS', 'Dados tecnicos', 10),
    ('ENERGIA', 'Energia', 20),
    ('GAS_REFRIGERANTE', 'Gas refrigerante', 30),
    ('TUBULACAO', 'Tubulacao', 40),
    ('CAPACIDADE', 'Capacidade', 50),
    ('RUIDO', 'Ruido', 60)
)
INSERT INTO atributos_grupos (empresa_id, codigo, nome, ordem, ativo)
SELECT e.id, g.codigo, g.nome, g.ordem, TRUE
FROM empresas e
CROSS JOIN grupos g
ON CONFLICT (empresa_id, codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem,
  ativo = TRUE;

WITH catalogo(codigo, nome, tipo_campo, escopo, unidade_medida, grupo_codigo, ordem) AS (
  VALUES
    ('TIPO_GAS', 'Tipo de gas', 'TEXTO', 'PRODUTO', NULL, 'GAS_REFRIGERANTE', 10),
    ('CAPACIDADE', 'Capacidade', 'DECIMAL', 'PRODUTO', 'BTU/h', 'CAPACIDADE', 20),
    ('CICLO', 'Ciclo', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 30),
    ('TIPO_TECNOLOGIA_COMPRESSOR', 'Tipo tecnologia compressor', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 40),
    ('TIPO_COMPRESSOR', 'Tipo compressor', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 50),
    ('TIPO_CONDENSADOR', 'Tipo condensador', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 60),
    ('POTENCIA_REFRIGERACAO', 'Potencia refrigeracao', 'DECIMAL', 'PRODUTO', NULL, 'ENERGIA', 70),
    ('POTENCIA_AQUECIMENTO', 'Potencia aquecimento', 'DECIMAL', 'PRODUTO', NULL, 'ENERGIA', 80),
    ('CORRENTE', 'Corrente eletrica', 'DECIMAL', 'PRODUTO', 'A', 'ENERGIA', 90),
    ('CORRENTE_ELETRICA_REFRIGERACAO', 'Corrente eletrica refrigeracao', 'DECIMAL', 'PRODUTO', 'A', 'ENERGIA', 100),
    ('CORRENTE_ELETRICA_AQUECIMENTO', 'Corrente eletrica aquecimento', 'DECIMAL', 'PRODUTO', 'A', 'ENERGIA', 110),
    ('EFICIENCIA_ENERGETICA', 'Eficiencia energetica', 'TEXTO', 'PRODUTO', NULL, 'ENERGIA', 120),
    ('CLASSIFICACAO_ENERGETICA', 'Classificacao energetica', 'TEXTO', 'PRODUTO', NULL, 'ENERGIA', 130),
    ('CONSUMO_ENERGIA_PROCEL', 'Consumo energia PROCEL', 'DECIMAL', 'PRODUTO', 'kWh/ano', 'ENERGIA', 140),
    ('VAZAO_AR', 'Vazao de ar', 'DECIMAL', 'PRODUTO', 'm3/h', 'DADOS_TECNICOS', 150),
    ('NIVEL_RUIDO_INTERNO', 'Nivel de ruido interno', 'DECIMAL', 'PRODUTO', 'dB', 'RUIDO', 160),
    ('NIVEL_RUIDO_EXTERNO', 'Nivel de ruido externo', 'DECIMAL', 'PRODUTO', 'dB', 'RUIDO', 170),
    ('ALIMENTACAO', 'Alimentacao', 'TEXTO', 'PRODUTO', NULL, 'ENERGIA', 180),
    ('FREQUENCIA', 'Frequencia', 'DECIMAL', 'PRODUTO', 'Hz', 'ENERGIA', 190),
    ('FASE', 'Fase', 'TEXTO', 'PRODUTO', NULL, 'ENERGIA', 200),
    ('DISJUNTOR', 'Disjuntor', 'TEXTO', 'PRODUTO', NULL, 'ENERGIA', 210),
    ('CONEXAO_TUBULACAO_LIQUIDO', 'Conexao tubulacao liquido', 'TEXTO', 'PRODUTO', NULL, 'TUBULACAO', 220),
    ('CONEXAO_TUBULACAO_GAS', 'Conexao tubulacao gas', 'TEXTO', 'PRODUTO', NULL, 'TUBULACAO', 230),
    ('DISTANCIA_MAXIMA_TUBULACAO', 'Distancia maxima tubulacao', 'DECIMAL', 'PRODUTO', 'm', 'TUBULACAO', 240),
    ('DESNIVEL_MAXIMO_TUBULACAO', 'Desnivel maximo tubulacao', 'DECIMAL', 'PRODUTO', 'm', 'TUBULACAO', 250),
    ('TUBULACAO', 'Tubulacao', 'TEXTO', 'PRODUTO', NULL, 'TUBULACAO', 260),
    ('AREA_APLICACAO', 'Area de aplicacao', 'DECIMAL', 'PRODUTO', 'm2', 'CAPACIDADE', 270),
    ('MATERIAL_SERPENTINA', 'Material serpentina', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 280),
    ('MATERIAL_GABINETE', 'Material gabinete', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 290),
    ('MATERIAL_GABINETE_CONDENSADORA', 'Material gabinete condensadora', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 300),
    ('MATERIAL_SERPENTINA_CONDENSADORA', 'Material serpentina condensadora', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 310),
    ('MATERIAIS', 'Materiais', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 320),
    ('PROTECAO_ANTICORROSAO', 'Protecao anticorrosao', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 330),
    ('SEER', 'SEER', 'DECIMAL', 'PRODUTO', NULL, 'ENERGIA', 340),
    ('EER', 'EER', 'DECIMAL', 'PRODUTO', NULL, 'ENERGIA', 350),
    ('WIFI', 'Wi-Fi', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 360),
    ('COR', 'Cor', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 370),
    ('CONTROLE_REMOTO_ILUMINADO', 'Controle remoto iluminado', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 380),
    ('AVISO_LIMPA_FILTRO', 'Aviso limpa filtro', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 385),
    ('TIMER', 'Temporizador', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 390),
    ('SLEEP', 'Sleep', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 400),
    ('SWING', 'Swing', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 410),
    ('TURBO', 'Turbo', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 420),
    ('MEMORIA', 'Memoria', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 430),
    ('FILTRO_ANTIBACTERIA', 'Filtro antibacteria', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 440),
    ('DESUMIDIFICACAO', 'Desumidificacao', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 450),
    ('FUNCAO_BRISA', 'Funcao brisa', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 460),
    ('CONTROLE_DIRECAO_AR', 'Controle direcao do ar', 'TEXTO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 470),
    ('INDICADOR_TEMPERATURA', 'Indicador temperatura', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 475),
    ('REGULA_VELOCIDADE_VENTILACAO', 'Regula velocidade ventilacao', 'BOOLEANO', 'PRODUTO', NULL, 'DADOS_TECNICOS', 480)
)
INSERT INTO atributos (empresa_id, atributo_grupo_id, nome_interno, nome_exibido, codigo, tipo_campo, escopo, unidade_medida, obrigatorio, ordem_exibicao, ativo, editavel, visivel)
SELECT e.id, g.id, LOWER(c.codigo), c.nome, c.codigo, c.tipo_campo, c.escopo, c.unidade_medida, FALSE, c.ordem, TRUE, TRUE, TRUE
FROM empresas e
INNER JOIN catalogo c ON TRUE
INNER JOIN atributos_grupos g ON g.empresa_id = e.id AND g.codigo = c.grupo_codigo
ON CONFLICT (empresa_id, codigo) DO UPDATE SET
  atributo_grupo_id = EXCLUDED.atributo_grupo_id,
  nome_exibido = EXCLUDED.nome_exibido,
  tipo_campo = EXCLUDED.tipo_campo,
  escopo = EXCLUDED.escopo,
  unidade_medida = EXCLUDED.unidade_medida,
  ordem_exibicao = EXCLUDED.ordem_exibicao,
  ativo = TRUE,
  editavel = TRUE,
  visivel = TRUE;
