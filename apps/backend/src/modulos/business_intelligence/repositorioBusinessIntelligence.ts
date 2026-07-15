import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { banco, consultar, consultarUm } from '../../banco/conexao.js';
import { ambiente } from '../../configuracao/ambiente.js';
import { consultarSqlServerPim } from '../cadastro_produto_central/repositorioCadastroProdutoCentral.js';

type RegistroBi = Record<string, any>;

const comandosBloqueados = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|MERGE|GRANT|REVOKE|VACUUM|CALL|DO)\b/i;
const comandoExec = /\bEXEC(UTE)?\b/i;

function chaveCriptografia() {
  return createHash('sha256').update(ambiente.segredoJwt).digest();
}

function criptografarSenha(valor?: string | null) {
  if (!valor) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', chaveCriptografia(), iv);
  const criptografado = Buffer.concat([cipher.update(valor, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), criptografado.toString('base64')].join(':');
}

function descriptografarSenha(valor?: string | null) {
  if (!valor) return null;
  const [ivTexto, tagTexto, conteudoTexto] = valor.split(':');
  if (!ivTexto || !tagTexto || !conteudoTexto) return null;
  const decipher = createDecipheriv('aes-256-gcm', chaveCriptografia(), Buffer.from(ivTexto, 'base64'));
  decipher.setAuthTag(Buffer.from(tagTexto, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(conteudoTexto, 'base64')), decipher.final()]).toString('utf8');
}

function consultaTemSintaxeSqlServer(sql: string) {
  return /(^|\s)DECLARE\s+@|\bWITH\s*\(\s*NOLOCK\s*\)|\bOUTER\s+APPLY\b|\bCROSS\s+APPLY\b|\bFOR\s+JSON\b|@\w+/i.test(sql);
}

// A execucao de dashboards aceita consultas de leitura; SQL Server pode usar T-SQL quando a fonte correta estiver selecionada.
export function validarSqlDashboard(sql: string, permitirExec = false, permitirTsql = false) {
  const texto = String(sql ?? '').trim();
  const normalizado = texto.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const inicioPermitido = permitirTsql
    ? /^(DECLARE|SELECT|WITH|EXEC|EXECUTE|CALL)\b/i
    : permitirExec
      ? /^(SELECT|WITH|EXEC|EXECUTE|CALL)\b/i
      : /^(SELECT|WITH)\b/i;
  if (!inicioPermitido.test(normalizado)) {
    throw new Error(permitirTsql ? 'A consulta SQL Server deve iniciar com DECLARE, SELECT, WITH, EXEC ou CALL.' : permitirExec ? 'A consulta do dashboard deve iniciar com SELECT, WITH, EXEC ou CALL.' : 'A consulta do dashboard deve iniciar com SELECT ou WITH.');
  }
  const comandosBloqueadosConsulta = permitirExec
    ? /\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|MERGE|GRANT|REVOKE|VACUUM|DO)\b/i
    : comandosBloqueados;
  if (comandosBloqueadosConsulta.test(normalizado) || (!permitirExec && comandoExec.test(normalizado))) {
    throw new Error('Consulta bloqueada por conter comando potencialmente perigoso.');
  }
  return normalizado;
}

// Converte marcadores :nome em parametros nativos do PostgreSQL, evitando SQL Injection.
function montarParametrosSql(sql: string, filtros: RegistroBi) {
  const valores: unknown[] = [];
  const mapa = new Map<string, number>();
  const texto = sql.replace(/(^|[^:]):([a-zA-Z_][a-zA-Z0-9_]*)/g, (_trecho, prefixo: string, nome: string) => {
    if (!mapa.has(nome)) {
      valores.push(filtros?.[nome] ?? null);
      mapa.set(nome, valores.length);
    }
    return `${prefixo}$${mapa.get(nome)}`;
  });
  return { texto, valores };
}

// O Top X e a ordenacao sao aplicados no resultado ja carregado para manter a consulta original segura.
function aplicarTopX(linhas: RegistroBi[], widget: RegistroBi) {
  const ordenarPor = String(widget.ordenar_por ?? '').trim();
  const direcao = String(widget.direcao_ordenacao ?? 'DESC').toUpperCase() === 'ASC' ? 1 : -1;
  const obterValorOrdenacao = (linha: RegistroBi) => {
    if (!ordenarPor) return null;
    const chave = Object.keys(linha).find((campo) => campo.toLocaleLowerCase('pt-BR') === ordenarPor.toLocaleLowerCase('pt-BR'));
    return chave ? linha[chave] : linha[ordenarPor];
  };
  const ordenadas = ordenarPor
    ? [...linhas].sort((a, b) => {
        const va = obterValorOrdenacao(a);
        const vb = obterValorOrdenacao(b);
        if (va === vb) return 0;
        return va > vb ? direcao : -direcao;
      })
    : linhas;
  const limite = Number(widget.top_x_registros ?? 0);
  const dados = limite > 0 ? ordenadas.slice(0, limite) : ordenadas;
  return { dados, total: linhas.length, naoExibidos: Math.max(0, linhas.length - dados.length) };
}

async function carregarDashboardBase(empresaId: number, dashboardId: number): Promise<(RegistroBi & { paginas: RegistroBi[]; widgets: RegistroBi[]; filtros: RegistroBi[]; permissoes: RegistroBi[] }) | null> {
  const dashboard = await consultarUm<RegistroBi>('SELECT * FROM bi_dashboards WHERE empresa_id = $1 AND id = $2', [empresaId, dashboardId]);
  if (!dashboard) return null;
  const paginas = await consultar<RegistroBi>('SELECT * FROM bi_dashboard_paginas WHERE dashboard_id = $1 AND ativo = TRUE ORDER BY ordem, id', [dashboardId]);
  const widgets = await consultar<RegistroBi>('SELECT * FROM bi_dashboard_widgets WHERE dashboard_id = $1 AND ativo = TRUE ORDER BY ordem, id', [dashboardId]);
  const filtros = await consultar<RegistroBi>('SELECT * FROM bi_filtros WHERE dashboard_id = $1 AND ativo = TRUE ORDER BY ordem, id', [dashboardId]);
  const permissoes = await listarPermissoesDashboardBi(empresaId, dashboardId);
  return { ...dashboard, paginas, widgets, filtros, permissoes };
}

// Centraliza a leitura das liberacoes do dashboard para o builder mostrar quem possui acesso.
export async function listarPermissoesDashboardBi(empresaId: number, dashboardId: number) {
  return consultar<RegistroBi>(`
    SELECT
      perm.*,
      u.nome AS usuario_nome,
      u.email AS usuario_email,
      p.nome AS perfil_nome
    FROM bi_dashboard_permissoes perm
    INNER JOIN bi_dashboards d ON d.id = perm.dashboard_id AND d.empresa_id = $1
    LEFT JOIN usuarios u ON u.id = perm.usuario_id
    LEFT JOIN perfis p ON p.id = perm.perfil_id
    WHERE perm.dashboard_id = $2
    ORDER BY COALESCE(u.nome, p.nome, 'Sem nome')
  `, [empresaId, dashboardId]);
}

export async function listarDashboardsBi(empresaId: number, usuarioId: number, perfilId?: number | null, administrador = false) {
  if (administrador) {
    return consultar<RegistroBi>(`
      SELECT d.*, COUNT(DISTINCT p.id) AS quantidade_paginas, COUNT(DISTINCT w.id) AS quantidade_widgets
      FROM bi_dashboards d
      LEFT JOIN bi_dashboard_paginas p ON p.dashboard_id = d.id
      LEFT JOIN bi_dashboard_widgets w ON w.dashboard_id = d.id
      WHERE d.empresa_id = $1
      GROUP BY d.id
      ORDER BY d.atualizado_em DESC NULLS LAST, d.nome
    `, [empresaId]);
  }
  return consultar<RegistroBi>(`
    SELECT DISTINCT d.*, COUNT(DISTINCT p.id) AS quantidade_paginas, COUNT(DISTINCT w.id) AS quantidade_widgets
    FROM bi_dashboards d
    LEFT JOIN bi_dashboard_paginas p ON p.dashboard_id = d.id
    LEFT JOIN bi_dashboard_widgets w ON w.dashboard_id = d.id
    LEFT JOIN bi_dashboard_permissoes perm ON perm.dashboard_id = d.id
    WHERE d.empresa_id = $1
      AND d.status = 'PUBLICADO'
      AND (d.publico = TRUE OR (perm.pode_visualizar = TRUE AND (perm.usuario_id = $2 OR perm.perfil_id = $3)))
    GROUP BY d.id
    ORDER BY d.nome
  `, [empresaId, usuarioId, perfilId ?? null]);
}

export async function obterDashboardBi(empresaId: number, dashboardId: number, usuarioId: number, perfilId?: number | null, administrador = false) {
  const dashboard = await carregarDashboardBase(empresaId, dashboardId);
  if (!dashboard || administrador) return dashboard;
  const permitido = dashboard.publico && dashboard.status === 'PUBLICADO'
    ? true
    : await consultarUm<RegistroBi>(
        'SELECT 1 FROM bi_dashboard_permissoes WHERE dashboard_id = $1 AND pode_visualizar = TRUE AND (usuario_id = $2 OR perfil_id = $3)',
        [dashboardId, usuarioId, perfilId ?? null]
      );
  return permitido ? dashboard : null;
}

export async function salvarDashboardBi(empresaId: number, dados: RegistroBi, usuarioId: number) {
  const valores = [
    dados.id ?? null,
    empresaId,
    dados.nome,
    dados.descricao ?? null,
    dados.categoria ?? null,
    dados.status ?? 'RASCUNHO',
    Boolean(dados.publico),
    Boolean(dados.atualizar_automaticamente ?? true),
    Number(dados.intervalo_atualizacao_segundos ?? 60),
    Boolean(dados.exibir_logo_empresa ?? true),
    Boolean(dados.modo_tv_habilitado),
    usuarioId
  ];
  return consultarUm<RegistroBi>(`
    INSERT INTO bi_dashboards (id, empresa_id, nome, descricao, categoria, status, publico, atualizar_automaticamente,
      intervalo_atualizacao_segundos, exibir_logo_empresa, modo_tv_habilitado, criado_por, atualizado_por)
    VALUES (COALESCE($1, nextval(pg_get_serial_sequence('bi_dashboards','id'))), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, categoria = EXCLUDED.categoria,
      status = EXCLUDED.status, publico = EXCLUDED.publico, atualizar_automaticamente = EXCLUDED.atualizar_automaticamente,
      intervalo_atualizacao_segundos = EXCLUDED.intervalo_atualizacao_segundos, exibir_logo_empresa = EXCLUDED.exibir_logo_empresa,
      modo_tv_habilitado = EXCLUDED.modo_tv_habilitado, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = NOW()
    RETURNING *
  `, valores);
}

export async function excluirDashboardBi(empresaId: number, dashboardId: number, usuarioId: number) {
  await consultar('UPDATE bi_dashboards SET status = $1, atualizado_por = $2, atualizado_em = NOW() WHERE empresa_id = $3 AND id = $4', ['INATIVO', usuarioId, empresaId, dashboardId]);
  return { excluido: true };
}

export async function publicarDashboardBi(empresaId: number, dashboardId: number, usuarioId: number) {
  return consultarUm<RegistroBi>('UPDATE bi_dashboards SET status = $1, atualizado_por = $2, atualizado_em = NOW() WHERE empresa_id = $3 AND id = $4 RETURNING *', ['PUBLICADO', usuarioId, empresaId, dashboardId]);
}

export async function duplicarDashboardBi(empresaId: number, dashboardId: number, usuarioId: number) {
  const original = await carregarDashboardBase(empresaId, dashboardId);
  if (!original) return null;
  const novo = await salvarDashboardBi(empresaId, { ...original, id: null, nome: `${original.nome} - Copia`, status: 'RASCUNHO' }, usuarioId);
  for (const pagina of original.paginas ?? []) {
    await salvarPaginaBi(empresaId, novo!.id, { ...pagina, id: null });
  }
  for (const widget of original.widgets ?? []) {
    await salvarWidgetBi(empresaId, novo!.id, { ...widget, id: null, pagina_id: null });
  }
  return carregarDashboardBase(empresaId, novo!.id);
}

export async function salvarPaginaBi(empresaId: number, dashboardId: number, dados: RegistroBi) {
  await consultarUm('SELECT 1 FROM bi_dashboards WHERE empresa_id = $1 AND id = $2', [empresaId, dashboardId]);
  return consultarUm<RegistroBi>(`
    INSERT INTO bi_dashboard_paginas (id, dashboard_id, nome, ordem, layout_colunas, tempo_exibicao_tv_segundos, ativo)
    VALUES (COALESCE($1, nextval(pg_get_serial_sequence('bi_dashboard_paginas','id'))), $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, ordem = EXCLUDED.ordem, layout_colunas = EXCLUDED.layout_colunas,
      tempo_exibicao_tv_segundos = EXCLUDED.tempo_exibicao_tv_segundos, ativo = EXCLUDED.ativo
    RETURNING *
  `, [dados.id ?? null, dashboardId, dados.nome, Number(dados.ordem ?? 1), Number(dados.layout_colunas ?? 12), Number(dados.tempo_exibicao_tv_segundos ?? 30), dados.ativo !== false]);
}

export async function excluirPaginaBi(_empresaId: number, _dashboardId: number, paginaId: number) {
  await consultar('UPDATE bi_dashboard_paginas SET ativo = FALSE WHERE id = $1', [paginaId]);
  return { excluido: true };
}

export async function salvarWidgetBi(empresaId: number, dashboardId: number, dados: RegistroBi) {
  await consultarUm('SELECT 1 FROM bi_dashboards WHERE empresa_id = $1 AND id = $2', [empresaId, dashboardId]);
  const colunasVisiveis = Array.isArray(dados.colunas_visiveis_json)
    ? dados.colunas_visiveis_json
    : String(dados.colunas_visiveis_json ?? dados.colunas_visiveis ?? '')
      .split(',')
      .map((coluna) => coluna.trim())
      .filter(Boolean);
  return consultarUm<RegistroBi>(`
    INSERT INTO bi_dashboard_widgets (id, dashboard_id, pagina_id, titulo, subtitulo, descricao, tipo_widget, consulta_id, ordem,
      posicao_x, posicao_y, largura, altura, cor_principal, icone, top_x_registros, ordenar_por, direcao_ordenacao,
      atualizar_automaticamente, intervalo_atualizacao_segundos, exibir_cabecalho, exibir_borda, exibir_sombra,
      exibir_exportacao, exibir_tela_cheia, colunas_visiveis_json, ativo)
    VALUES (COALESCE($1, nextval(pg_get_serial_sequence('bi_dashboard_widgets','id'))), $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
    ON CONFLICT (id) DO UPDATE SET pagina_id = EXCLUDED.pagina_id, titulo = EXCLUDED.titulo, subtitulo = EXCLUDED.subtitulo,
      descricao = EXCLUDED.descricao, tipo_widget = EXCLUDED.tipo_widget, consulta_id = EXCLUDED.consulta_id, ordem = EXCLUDED.ordem,
      posicao_x = EXCLUDED.posicao_x, posicao_y = EXCLUDED.posicao_y, largura = EXCLUDED.largura, altura = EXCLUDED.altura,
      cor_principal = EXCLUDED.cor_principal, icone = EXCLUDED.icone, top_x_registros = EXCLUDED.top_x_registros,
      ordenar_por = EXCLUDED.ordenar_por, direcao_ordenacao = EXCLUDED.direcao_ordenacao,
      atualizar_automaticamente = EXCLUDED.atualizar_automaticamente, intervalo_atualizacao_segundos = EXCLUDED.intervalo_atualizacao_segundos,
      exibir_cabecalho = EXCLUDED.exibir_cabecalho, exibir_borda = EXCLUDED.exibir_borda, exibir_sombra = EXCLUDED.exibir_sombra,
      exibir_exportacao = EXCLUDED.exibir_exportacao, exibir_tela_cheia = EXCLUDED.exibir_tela_cheia,
      colunas_visiveis_json = EXCLUDED.colunas_visiveis_json, ativo = EXCLUDED.ativo
    RETURNING *
  `, [dados.id ?? null, dashboardId, dados.pagina_id ?? null, dados.titulo, dados.subtitulo ?? null, dados.descricao ?? null, dados.tipo_widget ?? 'TABELA',
    dados.consulta_id ?? null, Number(dados.ordem ?? 1), Number(dados.posicao_x ?? 0), Number(dados.posicao_y ?? 0), Number(dados.largura ?? 4),
    Number(dados.altura ?? 3), dados.cor_principal ?? '#2563eb', dados.icone ?? null, dados.top_x_registros ?? null, dados.ordenar_por ?? null,
    dados.direcao_ordenacao ?? 'DESC', dados.atualizar_automaticamente !== false, Number(dados.intervalo_atualizacao_segundos ?? 60),
    dados.exibir_cabecalho !== false, dados.exibir_borda !== false, dados.exibir_sombra !== false, Boolean(dados.exibir_exportacao),
    dados.exibir_tela_cheia !== false, JSON.stringify(colunasVisiveis), dados.ativo !== false]);
}

export async function excluirWidgetBi(_empresaId: number, _dashboardId: number, widgetId: number) {
  await consultar('UPDATE bi_dashboard_widgets SET ativo = FALSE WHERE id = $1', [widgetId]);
  return { excluido: true };
}

export async function listarFontesDadosBi(empresaId: number) {
  const fontesBi = await consultar<RegistroBi>(`
    SELECT id::TEXT AS id, empresa_id, nome, tipo, descricao, host, porta, banco, usuario, parametros_json, ativo, FALSE AS somente_leitura
    FROM bi_fontes_dados
    WHERE empresa_id = $1
      AND ativo = TRUE
  `, [empresaId]);
  const conexoesPim = await consultar<RegistroBi>(`
    SELECT ('SQLSERVER_PIM:' || id)::TEXT AS id,
      empresa_id,
      nome,
      'SQLSERVER' AS tipo,
      'Conexao SQL Server cadastrada no Cadastro Central de Produtos.' AS descricao,
      host,
      porta,
      banco,
      usuario,
      jsonb_build_object('origem', 'CADASTRO_CENTRAL_PRODUTOS', 'conexao_id', id) AS parametros_json,
      ativo,
      TRUE AS somente_leitura
    FROM pim_conexoes_sqlserver
    WHERE empresa_id = $1
      AND ativo = TRUE
  `, [empresaId]);
  return [...fontesBi, ...conexoesPim].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

export async function salvarFonteDadosBi(empresaId: number, dados: RegistroBi, _usuarioId: number) {
  const senha = dados.senha ? criptografarSenha(dados.senha) : dados.senha_criptografada ?? null;
  return consultarUm<RegistroBi>(`
    INSERT INTO bi_fontes_dados (id, empresa_id, nome, tipo, descricao, host, porta, banco, usuario, senha_criptografada, parametros_json, ativo)
    VALUES (COALESCE($1, nextval(pg_get_serial_sequence('bi_fontes_dados','id'))), $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, ''), $11, $12)
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, tipo = EXCLUDED.tipo, descricao = EXCLUDED.descricao, host = EXCLUDED.host,
      porta = EXCLUDED.porta, banco = EXCLUDED.banco, usuario = EXCLUDED.usuario,
      senha_criptografada = COALESCE(NULLIF(EXCLUDED.senha_criptografada, ''), bi_fontes_dados.senha_criptografada),
      parametros_json = EXCLUDED.parametros_json, ativo = EXCLUDED.ativo
    RETURNING id, empresa_id, nome, tipo, descricao, host, porta, banco, usuario, parametros_json, ativo
  `, [dados.id ?? null, empresaId, dados.nome, dados.tipo ?? 'POSTGRESQL', dados.descricao ?? null, dados.host ?? null, dados.porta ?? null,
    dados.banco ?? null, dados.usuario ?? null, senha, JSON.stringify(dados.parametros_json ?? {}), dados.ativo !== false]);
}

export async function excluirFonteDadosBi(empresaId: number, fonteId: number) {
  await consultar('UPDATE bi_fontes_dados SET ativo = FALSE WHERE empresa_id = $1 AND id = $2', [empresaId, fonteId]);
  return { excluido: true };
}

export async function testarFonteDadosBi(empresaId: number, fonteId: number) {
  const fonte = await consultarUm<RegistroBi>('SELECT * FROM bi_fontes_dados WHERE empresa_id = $1 AND id = $2', [empresaId, fonteId]);
  if (!fonte) throw new Error('Fonte de dados nao encontrada.');
  if (fonte.tipo !== 'POSTGRESQL') return { sucesso: true, mensagem: 'Fonte cadastrada para uso futuro. Teste automatico disponivel nesta versao apenas para PostgreSQL.' };
  descriptografarSenha(fonte.senha_criptografada);
  return { sucesso: true, mensagem: 'Fonte PostgreSQL cadastrada. As consultas desta versao executam no PostgreSQL principal do Control S Hub.' };
}

export async function listarConsultasBi(empresaId: number) {
  return consultar<RegistroBi>(`
    SELECT c.*,
      COALESCE(f.nome, ps.nome, 'PostgreSQL padrao') AS fonte_dados_nome,
      COALESCE(c.fonte_dados_tipo, CASE WHEN c.conexao_sqlserver_id IS NOT NULL THEN 'SQLSERVER' ELSE 'POSTGRESQL' END) AS fonte_dados_tipo
    FROM bi_consultas c
    LEFT JOIN bi_fontes_dados f ON f.id = c.fonte_dados_id
    LEFT JOIN pim_conexoes_sqlserver ps ON ps.id = c.conexao_sqlserver_id
    WHERE c.empresa_id = $1
    ORDER BY c.nome
  `, [empresaId]);
}

export async function salvarConsultaBi(empresaId: number, dados: RegistroBi, usuarioId: number) {
  const fonteSelecionada = String(dados.fonte_dados_id ?? '');
  const fonteInformadaSqlServer = String(dados.fonte_dados_tipo ?? '').toUpperCase() === 'SQLSERVER' || Boolean(dados.conexao_sqlserver_id);
  const fonteTipo = fonteSelecionada.startsWith('SQLSERVER_PIM:') || fonteInformadaSqlServer ? 'SQLSERVER' : 'POSTGRESQL';
  const conexaoSqlServerId = fonteSelecionada.startsWith('SQLSERVER_PIM:')
    ? Number(fonteSelecionada.replace('SQLSERVER_PIM:', ''))
    : dados.conexao_sqlserver_id
      ? Number(dados.conexao_sqlserver_id)
      : null;
  const fonteDadosId = fonteTipo === 'POSTGRESQL' && fonteSelecionada ? Number(fonteSelecionada) : null;
  const permitirTsql = fonteTipo === 'SQLSERVER' || String(dados.fonte_dados_tipo ?? '').toUpperCase() === 'SQLSERVER';
  if (!permitirTsql && consultaTemSintaxeSqlServer(String(dados.sql_consulta ?? ''))) {
    throw new Error('Esta consulta usa sintaxe de SQL Server. Selecione uma conexao SQL Server em Fonte de dados antes de salvar ou testar.');
  }
  validarSqlDashboard(dados.sql_consulta, Boolean(dados.permitir_procedure) || permitirTsql, permitirTsql);
  return consultarUm<RegistroBi>(`
    INSERT INTO bi_consultas (id, empresa_id, fonte_dados_id, fonte_dados_tipo, conexao_sqlserver_id, nome, descricao, sql_consulta, parametros_json, tempo_cache_segundos, ativo, criado_por, atualizado_por, permitir_procedure)
    VALUES (COALESCE($1, nextval(pg_get_serial_sequence('bi_consultas','id'))), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13)
    ON CONFLICT (id) DO UPDATE SET fonte_dados_id = EXCLUDED.fonte_dados_id, fonte_dados_tipo = EXCLUDED.fonte_dados_tipo,
      conexao_sqlserver_id = EXCLUDED.conexao_sqlserver_id, nome = EXCLUDED.nome, descricao = EXCLUDED.descricao,
      sql_consulta = EXCLUDED.sql_consulta, parametros_json = EXCLUDED.parametros_json, tempo_cache_segundos = EXCLUDED.tempo_cache_segundos,
      ativo = EXCLUDED.ativo, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = NOW(), permitir_procedure = EXCLUDED.permitir_procedure
    RETURNING *
  `, [dados.id ?? null, empresaId, fonteDadosId, fonteTipo, conexaoSqlServerId, dados.nome, dados.descricao ?? null, dados.sql_consulta,
    JSON.stringify(dados.parametros_json ?? {}), Number(dados.tempo_cache_segundos ?? 60), dados.ativo !== false, usuarioId, Boolean(dados.permitir_procedure)]);
}

export async function excluirConsultaBi(empresaId: number, consultaId: number) {
  await consultar('UPDATE bi_consultas SET ativo = FALSE WHERE empresa_id = $1 AND id = $2', [empresaId, consultaId]);
  return { excluido: true };
}

export async function executarConsultaBi(empresaId: number, consultaOuDados: RegistroBi, filtros: RegistroBi, usuarioId: number, widgetId?: number | null) {
  // Quando a execução vem de um widget, o registro possui id do widget e consulta_id da consulta.
  // A regra abaixo evita buscar a consulta pelo id do widget e mantém o log vinculado à consulta correta.
  const consultaId = consultaOuDados.consulta_id ?? consultaOuDados.id;
  const consulta = consultaOuDados.sql_consulta
    ? { ...consultaOuDados, id: consultaId }
    : consultaId
      ? await consultarUm<RegistroBi>('SELECT * FROM bi_consultas WHERE empresa_id = $1 AND id = $2 AND ativo = TRUE', [empresaId, consultaId])
      : consultaOuDados;
  if (!consulta) throw new Error('Consulta nao encontrada ou inativa.');
  const permitirTsql = String(consulta.fonte_dados_tipo ?? '').toUpperCase() === 'SQLSERVER' || Boolean(consulta.conexao_sqlserver_id);
  if (!permitirTsql && consultaTemSintaxeSqlServer(String(consulta.sql_consulta ?? ''))) {
    throw new Error('Esta consulta usa sintaxe de SQL Server. Selecione uma conexao SQL Server em Fonte de dados para testar.');
  }
  const sql = validarSqlDashboard(consulta.sql_consulta, Boolean(consulta.permitir_procedure) || permitirTsql, permitirTsql);
  const { texto, valores } = montarParametrosSql(sql, filtros);
  const inicio = Date.now();
  let execucaoId: number | null = null;
  try {
    const execucao = await consultarUm<RegistroBi>(
      'INSERT INTO bi_execucoes (dashboard_id, widget_id, consulta_id, status, data_inicio, usuario_id) VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING id',
      [consulta.dashboard_id ?? null, widgetId ?? null, consulta.id ?? null, 'EXECUTANDO', usuarioId]
    );
    execucaoId = execucao?.id ?? null;
    if (String(consulta.fonte_dados_tipo ?? '').toUpperCase() === 'SQLSERVER' && consulta.conexao_sqlserver_id) {
      const resultadoSqlServer = await consultarSqlServerPim(empresaId, {
        conexao_id: consulta.conexao_sqlserver_id,
        consulta_sql: consulta.sql_consulta,
        limite: 1000,
        parametros_valores: filtros
      });
      const linhas = (resultadoSqlServer as any).linhas ?? (resultadoSqlServer as any).previa ?? [];
      const tempo = Date.now() - inicio;
      await consultar('UPDATE bi_execucoes SET status = $1, data_fim = NOW(), tempo_execucao_ms = $2, quantidade_registros = $3 WHERE id = $4', ['SUCESSO', tempo, linhas.length, execucaoId]);
      await consultar('INSERT INTO bi_logs_atualizacao (dashboard_id, widget_id, consulta_id, usuario_id, tipo_evento, status, mensagem, tempo_execucao_ms, quantidade_registros) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [consulta.dashboard_id ?? null, widgetId ?? null, consulta.id ?? null, usuarioId, 'EXECUCAO_WIDGET', 'SUCESSO', 'Consulta SQL Server executada com sucesso.', tempo, linhas.length]);
      return { dados: linhas, quantidade_registros: linhas.length, tempo_execucao_ms: tempo };
    }

    const cliente = await banco.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SET LOCAL statement_timeout = 30000');
      const resultado = await cliente.query(texto, valores);
      await cliente.query('COMMIT');
      const tempo = Date.now() - inicio;
      await consultar(
        'UPDATE bi_execucoes SET status = $1, data_fim = NOW(), tempo_execucao_ms = $2, quantidade_registros = $3 WHERE id = $4',
        ['SUCESSO', tempo, resultado.rowCount ?? resultado.rows.length, execucaoId]
      );
      await consultar(
        'INSERT INTO bi_logs_atualizacao (dashboard_id, widget_id, consulta_id, usuario_id, tipo_evento, status, mensagem, tempo_execucao_ms, quantidade_registros) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [consulta.dashboard_id ?? null, widgetId ?? null, consulta.id ?? null, usuarioId, 'EXECUCAO_WIDGET', 'SUCESSO', 'Consulta executada com sucesso.', tempo, resultado.rowCount ?? resultado.rows.length]
      );
      return { dados: resultado.rows, quantidade_registros: resultado.rows.length, tempo_execucao_ms: tempo };
    } catch (erro) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw erro;
    } finally {
      cliente.release();
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao executar consulta.';
    const tempo = Date.now() - inicio;
    if (execucaoId) {
      await consultar('UPDATE bi_execucoes SET status = $1, data_fim = NOW(), tempo_execucao_ms = $2, mensagem_erro = $3 WHERE id = $4', ['ERRO', tempo, mensagem, execucaoId]);
    }
    await consultar(
      'INSERT INTO bi_logs_atualizacao (dashboard_id, widget_id, consulta_id, usuario_id, tipo_evento, status, mensagem, tempo_execucao_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [consulta.dashboard_id ?? null, widgetId ?? null, consulta.id ?? null, usuarioId, 'EXECUCAO_WIDGET', 'ERRO', mensagem, tempo]
    );
    throw erro;
  }
}

export async function executarWidgetBi(empresaId: number, widgetId: number, filtros: RegistroBi, usuarioId: number) {
  const widget = await consultarUm<RegistroBi>(`
    SELECT
      w.*,
      c.sql_consulta,
      c.tempo_cache_segundos,
      c.fonte_dados_tipo,
      c.conexao_sqlserver_id,
      c.permitir_procedure,
      c.id AS consulta_id
    FROM bi_dashboard_widgets w
    JOIN bi_dashboards d ON d.id = w.dashboard_id AND d.empresa_id = $1
    LEFT JOIN bi_consultas c ON c.id = w.consulta_id
    WHERE w.id = $2 AND w.ativo = TRUE
  `, [empresaId, widgetId]);
  if (!widget) throw new Error('Widget nao encontrado.');
  const cache = await consultarUm<RegistroBi>('SELECT * FROM bi_widget_cache WHERE widget_id = $1 AND valido_ate > NOW() ORDER BY atualizado_em DESC LIMIT 1', [widgetId]);
  const filtrosComEmpresa = { empresa_id: empresaId, ...(filtros ?? {}) };
  const linhas = cache?.dados_json ? cache.dados_json : (await executarConsultaBi(empresaId, widget, filtrosComEmpresa, usuarioId, widgetId)).dados;
  if (!cache) {
    const validade = Number(widget.tempo_cache_segundos ?? widget.intervalo_atualizacao_segundos ?? 60);
    const filtrosTexto = JSON.stringify(filtrosComEmpresa);
    const filtrosHash = createHash('sha1').update(filtrosTexto).digest('hex');
    await consultar(`
      INSERT INTO bi_widget_cache (widget_id, consulta_id, filtros_hash, filtros_json, dados_json, quantidade_registros, expira_em, valido_ate)
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' seconds')::interval, NOW() + ($7 || ' seconds')::interval)
    `, [widgetId, widget.consulta_id ?? null, filtrosHash, filtrosTexto, JSON.stringify(linhas), linhas.length, validade]);
  }
  const recorte = aplicarTopX(linhas, widget);
  return {
    registros: recorte.dados,
    registros_completos: linhas,
    total_registros: recorte.total,
    registros_nao_exibidos: recorte.naoExibidos,
    origem_cache: Boolean(cache),
    atualizado_em: new Date().toISOString()
  };
}

export async function listarLogsBi(empresaId: number) {
  return consultar<RegistroBi>(`
    SELECT l.*, d.nome AS dashboard_nome, w.titulo AS widget_titulo, c.nome AS consulta_nome
    FROM bi_logs_atualizacao l
    LEFT JOIN bi_dashboards d ON d.id = l.dashboard_id
    LEFT JOIN bi_dashboard_widgets w ON w.id = l.widget_id
    LEFT JOIN bi_consultas c ON c.id = l.consulta_id
    WHERE COALESCE(d.empresa_id, c.empresa_id, $1) = $1
    ORDER BY l.criado_em DESC
    LIMIT 300
  `, [empresaId]);
}

export async function listarTemplatesBi() {
  return consultar<RegistroBi>('SELECT * FROM bi_templates WHERE ativo = TRUE ORDER BY nome');
}

// Salva uma liberacao por usuario ou perfil. A remocao previa evita duplicidade para o mesmo alvo.
export async function salvarPermissaoDashboardBi(empresaId: number, dashboardId: number, dados: RegistroBi) {
  const dashboard = await consultarUm<RegistroBi>('SELECT id FROM bi_dashboards WHERE empresa_id = $1 AND id = $2', [empresaId, dashboardId]);
  if (!dashboard) throw new Error('Dashboard nao encontrado para liberar acesso.');
  const usuarioId = dados.usuario_id ? Number(dados.usuario_id) : null;
  const perfilId = dados.perfil_id ? Number(dados.perfil_id) : null;
  if (!usuarioId && !perfilId) {
    throw new Error('Informe um usuario ou perfil para liberar o dashboard.');
  }
  await consultar(`
    DELETE FROM bi_dashboard_permissoes
    WHERE dashboard_id = $1
      AND COALESCE(usuario_id, 0) = COALESCE($2, 0)
      AND COALESCE(perfil_id, 0) = COALESCE($3, 0)
  `, [dashboardId, usuarioId, perfilId]);
  await consultar(`
    INSERT INTO bi_dashboard_permissoes (
      dashboard_id, usuario_id, perfil_id, pode_visualizar, pode_editar, pode_excluir, pode_publicar, pode_modo_tv
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    dashboardId,
    usuarioId,
    perfilId,
    dados.pode_visualizar !== false,
    Boolean(dados.pode_editar),
    Boolean(dados.pode_excluir),
    Boolean(dados.pode_publicar),
    Boolean(dados.pode_modo_tv)
  ]);
  return listarPermissoesDashboardBi(empresaId, dashboardId);
}

// Remove uma liberacao especifica sem afetar outras permissoes do dashboard.
export async function excluirPermissaoDashboardBi(empresaId: number, dashboardId: number, permissaoId: number) {
  const removida = await consultarUm<RegistroBi>(`
    DELETE FROM bi_dashboard_permissoes perm
    USING bi_dashboards d
    WHERE d.id = perm.dashboard_id
      AND d.empresa_id = $1
      AND perm.dashboard_id = $2
      AND perm.id = $3
    RETURNING perm.id
  `, [empresaId, dashboardId, permissaoId]);
  if (!removida) throw new Error('Permissao nao encontrada para remover.');
  return { removido: true };
}

export async function exportarDashboardBi(empresaId: number, dashboardId: number) {
  const dashboard = await carregarDashboardBase(empresaId, dashboardId);
  if (!dashboard) throw new Error('Dashboard nao encontrado para exportacao.');
  const consultasIds = Array.from(new Set((dashboard.widgets ?? []).map((widget) => widget.consulta_id).filter(Boolean)));
  const consultas = consultasIds.length
    ? await consultar<RegistroBi>('SELECT * FROM bi_consultas WHERE empresa_id = $1 AND id = ANY($2::BIGINT[]) ORDER BY id', [empresaId, consultasIds])
    : [];
  return {
    versao: 1,
    tipo: 'CONTROL_S_HUB_BI_DASHBOARD',
    exportado_em: new Date().toISOString(),
    dashboard,
    consultas
  };
}

export async function importarDashboardBi(empresaId: number, pacote: RegistroBi, usuarioId: number) {
  if (pacote?.tipo !== 'CONTROL_S_HUB_BI_DASHBOARD') {
    throw new Error('Arquivo de dashboard invalido.');
  }
  const mapaConsultas = new Map<number, number>();
  const mapaConsultasPorNome = new Map<string, number>();
  for (const consulta of pacote.consultas ?? []) {
    const novaConsulta = await salvarConsultaBi(empresaId, { ...consulta, id: null, nome: `${consulta.nome} (importado)` }, usuarioId);
    if (consulta.id) mapaConsultas.set(Number(consulta.id), Number(novaConsulta?.id));
    mapaConsultasPorNome.set(String(consulta.nome ?? '').trim(), Number(novaConsulta?.id));
  }
  const origem = pacote.dashboard ?? {};
  const novo = await salvarDashboardBi(empresaId, { ...origem, id: null, nome: `${origem.nome ?? 'Dashboard'} (importado)`, status: 'RASCUNHO' }, usuarioId);
  const mapaPaginas = new Map<number, number>();
  const mapaPaginasPorNome = new Map<string, number>();
  for (const pagina of origem.paginas ?? []) {
    const novaPagina = await salvarPaginaBi(empresaId, Number(novo?.id), { ...pagina, id: null });
    if (pagina.id) mapaPaginas.set(Number(pagina.id), Number(novaPagina?.id));
    mapaPaginasPorNome.set(String(pagina.nome ?? '').trim(), Number(novaPagina?.id));
  }
  for (const filtro of origem.filtros ?? []) {
    await consultar(`
      INSERT INTO bi_filtros (dashboard_id, nome, label, tipo, campo, valor_padrao, opcoes_json, obrigatorio, global, ordem, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      Number(novo?.id),
      filtro.nome,
      filtro.label ?? filtro.nome,
      filtro.tipo ?? 'TEXTO',
      filtro.campo ?? null,
      filtro.valor_padrao ?? null,
      JSON.stringify(filtro.opcoes_json ?? []),
      Boolean(filtro.obrigatorio),
      filtro.global !== false,
      Number(filtro.ordem ?? 1),
      filtro.ativo !== false
    ]);
  }
  const primeiraPaginaId = Number(Array.from(mapaPaginasPorNome.values())[0] ?? Array.from(mapaPaginas.values())[0] ?? null) || null;
  for (const widget of origem.widgets ?? []) {
    const consultaImportadaId = widget.consulta_id
      ? mapaConsultas.get(Number(widget.consulta_id))
      : mapaConsultasPorNome.get(String(widget.consulta_nome ?? widget.consulta ?? '').trim());
    const paginaImportadaId = widget.pagina_id
      ? mapaPaginas.get(Number(widget.pagina_id))
      : mapaPaginasPorNome.get(String(widget.pagina_nome ?? widget.pagina ?? 'Visao Geral').trim());
    await salvarWidgetBi(empresaId, Number(novo?.id), {
      ...widget,
      id: null,
      pagina_id: paginaImportadaId ?? primeiraPaginaId,
      consulta_id: consultaImportadaId ?? null
    });
  }
  return carregarDashboardBase(empresaId, Number(novo?.id));
}
