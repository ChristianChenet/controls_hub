-- CONTROL S HUB
-- Seed inicial obrigatorio.

INSERT INTO empresas (
  codigo_empresa,
  razao_social,
  nome_fantasia,
  cnpj,
  dominio_publico,
  nome_exibido,
  caminho_logo,
  caminho_imagem_fundo,
  ativa
)
VALUES (
  'CONTROL-S',
  'CONTROL S CONSULTORIA LTDA',
  'Control S',
  NULL,
  'hub.controlsconsultoria.com.br',
  'Control S',
  '/brand/logo-s-novo.jpg',
  '/brand/fundo-control-s.png',
  TRUE
)
ON CONFLICT (codigo_empresa) DO NOTHING;

INSERT INTO modulos (codigo, nome, descricao, icone, ordem, ativo)
VALUES
  ('ADMINISTRACAO', 'Administracao', 'Cadastros, usuarios, perfis, permissoes, empresas e parametros.', 'Settings', 10, TRUE),
  ('COTACAO_FRETE', 'Cotacao de Frete', 'Modulo operacional para gestao de cotacoes de frete por documento.', 'Truck', 20, TRUE),
  ('PUBLICO_TRANSPORTADORA', 'Publico Transportadora', 'Acesso publico por token para resposta de transportadoras.', 'Globe2', 30, TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT id, 'DASHBOARD_COTACAO_FRETE', 'Dashboard', '/cotacao-frete/dashboard', 'LayoutDashboard', 10, TRUE
FROM modulos
WHERE codigo = 'COTACAO_FRETE'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT id, 'KANBAN_COTACAO_FRETE', 'Kanban de Cotacoes', '/cotacao-frete/kanban', 'Columns3', 20, TRUE
FROM modulos
WHERE codigo = 'COTACAO_FRETE'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT id, 'ADMINISTRACAO_EMPRESAS', 'Empresas', '/administracao/empresas', 'Building2', 10, TRUE
FROM modulos
WHERE codigo = 'ADMINISTRACAO'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT id, 'ADMINISTRACAO_USUARIOS', 'Usuarios', '/administracao/usuarios', 'Users', 20, TRUE
FROM modulos
WHERE codigo = 'ADMINISTRACAO'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO menus (modulo_id, codigo, nome, rota, icone, ordem, ativo)
SELECT id, 'ADMINISTRACAO_PERFIS', 'Perfis e Direitos', '/administracao/perfis', 'ShieldCheck', 30, TRUE
FROM modulos
WHERE codigo = 'ADMINISTRACAO'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO telas (
  modulo_id,
  menu_id,
  codigo,
  nome,
  rota,
  arquivo_fonte,
  componentes_principais,
  endpoints_usados,
  tabelas_principais,
  rotinas_relacionadas,
  ativo
)
SELECT
  modulos.id,
  menus.id,
  'COTACAO_FRETE_DASHBOARD',
  'Dashboard de Cotacao de Frete',
  '/cotacao-frete/dashboard',
  'apps/frontend/src/App.tsx',
  'Dashboard, FonteDaTela, MetricCards',
  '/api/cotacao-frete/dashboard',
  'cotacoes_frete, cotacoes_frete_transportadoras, etapas_kanban',
  'obterIndicadoresCotacao',
  TRUE
FROM modulos
INNER JOIN menus ON menus.codigo = 'DASHBOARD_COTACAO_FRETE'
WHERE modulos.codigo = 'COTACAO_FRETE'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO telas (
  modulo_id,
  menu_id,
  codigo,
  nome,
  rota,
  arquivo_fonte,
  componentes_principais,
  endpoints_usados,
  tabelas_principais,
  rotinas_relacionadas,
  ativo
)
SELECT
  modulos.id,
  menus.id,
  'COTACAO_FRETE_KANBAN',
  'Kanban de Cotacao de Frete',
  '/cotacao-frete/kanban',
  'apps/frontend/src/App.tsx',
  'KanbanPreview, FonteDaTela',
  '/api/cotacao-frete/kanban',
  'cotacoes_frete, etapas_kanban',
  'listarKanbanCotacao',
  TRUE
FROM modulos
INNER JOIN menus ON menus.codigo = 'KANBAN_COTACAO_FRETE'
WHERE modulos.codigo = 'COTACAO_FRETE'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO telas (
  modulo_id,
  menu_id,
  codigo,
  nome,
  rota,
  arquivo_fonte,
  componentes_principais,
  endpoints_usados,
  tabelas_principais,
  rotinas_relacionadas,
  ativo
)
SELECT
  modulos.id,
  menus.id,
  'ADMINISTRACAO_EMPRESAS',
  'Empresas',
  '/administracao/empresas',
  'apps/frontend/src/App.tsx',
  'FormularioEmpresa, FonteDaTela',
  '/api/empresas/minhas',
  'empresas, parametros_empresa, auditorias',
  'listarEmpresasDoUsuario',
  TRUE
FROM modulos
INNER JOIN menus ON menus.codigo = 'ADMINISTRACAO_EMPRESAS'
WHERE modulos.codigo = 'ADMINISTRACAO'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO perfis (codigo, nome, descricao, administrador, ativo)
VALUES
  ('ADMINISTRADOR_GERAL', 'Administrador Geral', 'Perfil inicial com acesso total ao CONTROL S HUB.', TRUE, TRUE),
  ('COMERCIAL', 'Comercial', 'Perfil/setor comercial.', FALSE, TRUE),
  ('LOGISTICA', 'Logistica', 'Perfil/setor logistico.', FALSE, TRUE),
  ('FISCAL', 'Fiscal', 'Perfil/setor fiscal.', FALSE, TRUE),
  ('COMPRAS', 'Compras', 'Perfil/setor compras.', FALSE, TRUE),
  ('ADMINISTRATIVO', 'Administrativo', 'Perfil/setor administrativo.', FALSE, TRUE),
  ('EXPEDICAO', 'Expedicao', 'Perfil/setor expedicao.', FALSE, TRUE),
  ('DIRETORIA', 'Diretoria', 'Perfil/setor diretoria.', FALSE, TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO usuarios (
  perfil_id,
  nome,
  email,
  senha_hash,
  ativo,
  administrador,
  superadmin
)
SELECT
  perfis.id,
  'Christian Control S',
  'christian@controlsconsultoria.com.br',
  CRYPT('controls', GEN_SALT('bf')),
  TRUE,
  TRUE,
  TRUE
FROM perfis
WHERE perfis.codigo = 'ADMINISTRADOR_GERAL'
ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios_empresas (usuario_id, empresa_id, padrao, ativo)
SELECT usuarios.id, empresas.id, TRUE, TRUE
FROM usuarios
CROSS JOIN empresas
WHERE usuarios.email = 'christian@controlsconsultoria.com.br'
  AND empresas.codigo_empresa = 'CONTROL-S'
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES
  ('UTILIZA_COTACAO_FRETE', 'Utiliza Cotacao de Frete', 'Libera menu, telas, dados e acoes do modulo de cotacao de frete.', TRUE),
  ('VISUALIZAR_COTACAO_FRETE', 'Visualizar Cotacao de Frete', 'Permite visualizar cotacoes de frete.', TRUE),
  ('EDITAR_COTACAO_FRETE', 'Editar Cotacao de Frete', 'Permite editar dados operacionais de cotacoes nao bloqueadas.', TRUE),
  ('GERAR_TOKEN_COTACAO_FRETE', 'Gerar Token de Cotacao', 'Permite gerar link publico para transportadora.', TRUE),
  ('VALIDAR_COTACAO_FRETE', 'Validar Cotacao de Frete', 'Permite validar retorno de transportadora.', TRUE),
  ('ESCOLHER_TRANSPORTADORA', 'Escolher Transportadora', 'Permite marcar a transportadora vencedora.', TRUE),
  ('ALTERAR_ETAPA_COTACAO', 'Alterar Etapa da Cotacao', 'Permite mover cotacoes entre etapas do kanban.', TRUE),
  ('CADASTRAR_TRANSPORTADORA', 'Cadastrar Transportadora', 'Permite administrar transportadoras.', TRUE),
  ('ADMINISTRAR_EMPRESAS', 'Administrar Empresas', 'Permite administrar empresas.', TRUE),
  ('ADMINISTRAR_USUARIOS', 'Administrar Usuarios', 'Permite administrar usuarios.', TRUE),
  ('ADMINISTRAR_PERFIS', 'Administrar Perfis', 'Permite administrar perfis e direitos.', TRUE),
  ('VISUALIZAR_AUDITORIA', 'Visualizar Auditoria', 'Permite consultar trilha de auditoria.', TRUE),
  ('CONFIGURAR_SISTEMA', 'Configurar Sistema', 'Permite alterar parametros tecnicos.', TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO etapas_kanban (empresa_id, modulo_id, codigo, nome, descricao, cor, ordem, permite_arrastar, etapa_final, etapa_bloqueada, ativa)
SELECT empresas.id, modulos.id, etapa.codigo, etapa.nome, etapa.descricao, etapa.cor, etapa.ordem, etapa.permite_arrastar, etapa.etapa_final, etapa.etapa_bloqueada, TRUE
FROM empresas
CROSS JOIN modulos
CROSS JOIN (
  VALUES
    ('RECEBIDO_ERP', 'Recebido do ERP', 'Documento recebido do ERP.', '#22C55E', 10, TRUE, FALSE, FALSE),
    ('COTACAO_AUTOMATICA_RECEBIDA', 'Cotacao Automatica Recebida', 'Cotacoes automaticas iniciais disponiveis.', '#06B6D4', 20, TRUE, FALSE, FALSE),
    ('AGUARDANDO_REENVIO_TRANSPORTADORA', 'Aguardando Reenvio para Transportadora', 'Aguardando geracao ou envio de link.', '#F59E0B', 30, TRUE, FALSE, FALSE),
    ('AGUARDANDO_RETORNO_TRANSPORTADORA', 'Aguardando Retorno da Transportadora', 'Token enviado e resposta pendente.', '#3B82F6', 40, TRUE, FALSE, FALSE),
    ('EM_ANALISE', 'Em Analise', 'Cotacoes em comparativo interno.', '#8B5CF6', 50, TRUE, FALSE, FALSE),
    ('APROVADO', 'Aprovado', 'Transportadora escolhida.', '#10B981', 60, TRUE, FALSE, FALSE),
    ('INTEGRADO_ERP', 'Integrado ao ERP', 'Dados consumidos pela integracao externa.', '#14B8A6', 70, FALSE, TRUE, TRUE),
    ('BLOQUEADO_FINALIZADO', 'Bloqueado / Finalizado', 'Cotacao bloqueada por atualizacao no ERP.', '#EF4444', 80, FALSE, TRUE, TRUE)
) AS etapa(codigo, nome, descricao, cor, ordem, permite_arrastar, etapa_final, etapa_bloqueada)
WHERE empresas.codigo_empresa = 'CONTROL-S'
  AND modulos.codigo = 'COTACAO_FRETE'
ON CONFLICT (empresa_id, modulo_id, codigo) DO NOTHING;

INSERT INTO perfis_permissoes (perfil_id, empresa_id, modulo_id, acao_id, permitido)
SELECT perfis.id, empresas.id, modulos.id, acoes.id, TRUE
FROM perfis
CROSS JOIN empresas
CROSS JOIN modulos
CROSS JOIN acoes
WHERE perfis.codigo = 'ADMINISTRADOR_GERAL'
  AND empresas.codigo_empresa = 'CONTROL-S'
ON CONFLICT DO NOTHING;

INSERT INTO parametros_sistema (chave, valor, descricao, sensivel)
VALUES
  ('NOME_SISTEMA', 'CONTROL S HUB', 'Nome oficial do sistema.', FALSE),
  ('BANCO_DADOS', 'CONTROLSHUB', 'Nome padrao do banco PostgreSQL.', FALSE),
  ('SENHA_BANCO_PADRAO_LOCAL', 'CONTROLS', 'Senha padrao local informada para instalacao inicial.', TRUE),
  ('PERMITE_FONTE_DA_TELA', 'TRUE', 'Exibe botao FONTE DA TELA para superadmin.', FALSE),
  ('EXPIRACAO_TOKEN_COTACAO_HORAS', '72', 'Prazo padrao de expiracao do token publico de cotacao.', FALSE)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO parametros_empresa (empresa_id, chave, valor, descricao, sensivel)
SELECT id, 'DOMINIO_PUBLICO_COTACAO', 'hub.controlsconsultoria.com.br', 'Dominio publico usado nos links de cotacao.', FALSE
FROM empresas
WHERE codigo_empresa = 'CONTROL-S'
ON CONFLICT (empresa_id, chave) DO NOTHING;

INSERT INTO transportadoras (
  codigo_interno,
  razao_social,
  nome_fantasia,
  documento,
  email,
  telefone,
  responsavel,
  aceita_cotacao_externa,
  observacoes,
  ativa
)
VALUES
  ('TRANS-001', 'SALVIA LOGISTICA LTDA', 'Salvia Logistica', '00000000000191', 'cotacao@salvia.example', '(11) 3000-1001', 'Equipe Cotacao', TRUE, 'Transportadora exemplo para seed inicial.', TRUE),
  ('TRANS-002', 'JACARE TRANSPORTES LTDA', 'Jacare Transportes', '00000000000272', 'cotacao@jacare.example', '(11) 3000-1002', 'Operacao', TRUE, 'Transportadora exemplo para comparativo.', TRUE),
  ('TRANS-003', 'ROTA VERDE CARGAS LTDA', 'Rota Verde Cargas', '00000000000353', 'cotacao@rotaverde.example', '(11) 3000-1003', 'Atendimento', TRUE, 'Transportadora exemplo para TOP 3.', TRUE)
ON CONFLICT (codigo_interno) DO NOTHING;

INSERT INTO transportadoras_empresas (transportadora_id, empresa_id, ativa)
SELECT transportadoras.id, empresas.id, TRUE
FROM transportadoras
CROSS JOIN empresas
WHERE empresas.codigo_empresa = 'CONTROL-S'
ON CONFLICT (transportadora_id, empresa_id) DO NOTHING;

INSERT INTO cotacoes_frete (
  empresa_id,
  etapa_kanban_id,
  tipo_documento,
  numero_documento,
  codigo_chave,
  numero_pedido,
  data_documento,
  status,
  loja_origem,
  valor_mercadoria,
  peso_real,
  volumes_total,
  cubagem_total,
  percentual_sobre_nf,
  cep_destino,
  uf_destino,
  cidade_destino,
  endereco_destinatario,
  nome_destinatario,
  documento_destinatario,
  destino_zona_rural,
  destinatario_pessoa_fisica,
  identificador_externo,
  payload_recebido
)
SELECT
  empresas.id,
  etapas_kanban.id,
  'PEDIDO',
  '2290476',
  '2290476-P001',
  '2290476',
  CURRENT_DATE,
  'COTACAO_AUTOMATICA_RECEBIDA',
  'MATRIZ',
  34196.92,
  128.5000,
  8,
  2.3400,
  3.5000,
  '01310-100',
  'SP',
  'Sao Paulo',
  'Avenida Paulista, 1000',
  'Jacare Santa Ines',
  '00000000000999',
  FALSE,
  FALSE,
  'ERP-SEED-2290476',
  '{"origem":"SEED","observacao":"Cotacao exemplo recebida do ERP"}'::JSONB
FROM empresas
INNER JOIN etapas_kanban ON etapas_kanban.empresa_id = empresas.id
WHERE empresas.codigo_empresa = 'CONTROL-S'
  AND etapas_kanban.codigo = 'COTACAO_AUTOMATICA_RECEBIDA'
ON CONFLICT (empresa_id, tipo_documento, numero_documento, codigo_chave) DO NOTHING;

INSERT INTO cotacoes_frete_itens (
  cotacao_frete_id,
  codigo_item,
  descricao_item,
  quantidade,
  cubagem_item,
  largura,
  altura,
  comprimento,
  peso_item
)
SELECT
  cotacoes_frete.id,
  'ITEM-001',
  'Produto exemplo para cotacao de frete',
  8,
  2.3400,
  0.6000,
  0.8000,
  1.2000,
  16.0600
FROM cotacoes_frete
WHERE cotacoes_frete.numero_documento = '2290476'
ON CONFLICT DO NOTHING;

INSERT INTO cotacoes_frete_transportadoras (
  cotacao_frete_id,
  transportadora_id,
  codigo_transportadora,
  valor_frete,
  percentual_frete,
  ranking_frete,
  origem_cotacao,
  observacao,
  status
)
SELECT cotacoes_frete.id, transportadoras.id, transportadoras.codigo_interno, dados.valor_frete, dados.percentual_frete, dados.ranking_frete, 'ERP', 'Cotacao automatica recebida do ERP.', 'RECEBIDA'
FROM cotacoes_frete
CROSS JOIN (
  VALUES
    ('TRANS-001', 1196.89, 3.5000, 1),
    ('TRANS-002', 1367.88, 4.0000, 2),
    ('TRANS-003', 1538.86, 4.5000, 3)
) AS dados(codigo_interno, valor_frete, percentual_frete, ranking_frete)
INNER JOIN transportadoras ON transportadoras.codigo_interno = dados.codigo_interno
WHERE cotacoes_frete.numero_documento = '2290476'
ON CONFLICT (cotacao_frete_id, transportadora_id, origem_cotacao) DO NOTHING;
