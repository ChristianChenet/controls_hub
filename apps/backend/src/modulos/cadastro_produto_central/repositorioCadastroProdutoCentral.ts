import { consultar, consultarUm } from '../../banco/conexao.js';

import sqlServer from 'mssql';

export type ProdutoCadastro = {
  id?: number;
  codigo_interno?: string;
  codigo_erp_decis?: string | null;
  sku_interno?: string | null;
  sku_comercial?: string | null;
  sku_fornecedor?: string | null;
  codigo_fabricante?: string | null;
  ean_gtin?: string | null;
  ean?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  ncm?: string | null;
  cest?: string | null;
  nome_interno?: string | null;
  nome_comercial?: string | null;
  marca?: string | null;
  linha?: string | null;
  modelo?: string | null;
  familia?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  tipo_produto?: string;
  status?: string;
  origem?: string | null;
  garantia?: string | null;
  descricao_interna?: string | null;
  observacoes?: string | null;
  peso?: number | null;
  altura?: number | null;
  largura?: number | null;
  comprimento?: number | null;
  titulo_meta?: string | null;
  descricao_meta?: string | null;
  slug?: string | null;
  descricao_curta?: string | null;
  descricao_longa?: string | null;
  pontos_destaque?: string[] | string | null;
  palavras_chave?: string[] | string | null;
  fiscal_comercial?: Record<string, unknown> | null;
  skus?: Record<string, unknown>[];
  componentes?: Record<string, unknown>[];
  atributos?: Record<string, unknown>[];
  usuario_responsavel_id?: number | null;
};

type ConexaoSqlServerPim = {
  id: number;
  empresa_id: number;
  nome: string;
  host: string;
  porta: number;
  banco: string;
  usuario: string;
  senha?: string | null;
  ambiente: string;
  ativo: boolean;
  opcoes?: Record<string, unknown>;
};

const camposObrigatoriosMestre = [
  'codigo_interno',
  'sku_interno',
  'nome_comercial',
  'marca',
  'modelo',
  'categoria',
  'tipo_produto',
  'status',
  'ean_gtin'
];

const camposObrigatoriosPorCanal: Record<string, string[]> = {
  ERP_DECIS: ['codigo_interno', 'codigo_erp_decis', 'sku_interno', 'ncm'],
  SHOPPUB: ['sku_comercial', 'nome_comercial', 'descricao_curta', 'categoria', 'marca', 'ean_gtin'],
  ECOMMERCE_PROPRIO: ['slug', 'titulo_meta', 'descricao_meta', 'descricao_longa', 'nome_comercial'],
  AMAZON: ['ean_gtin', 'marca', 'modelo', 'categoria', 'descricao_longa', 'pontos_destaque'],
  MERCADO_LIVRE: ['ean_gtin', 'nome_comercial', 'categoria', 'imagens', 'descricao_curta'],
  MAGAZINE_LUIZA: ['ean_gtin', 'marca', 'modelo', 'ncm', 'descricao_longa'],
  VIA_CASAS_BAHIA: ['ean_gtin', 'sku_comercial', 'nome_comercial', 'categoria'],
  GOOGLE_SHOPPING: ['gtin', 'marca', 'nome_comercial', 'imagem_principal', 'slug']
};

function listaTexto(valor?: string[] | string | null) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  return String(valor ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function valorPreenchido(dados: Record<string, unknown>, campo: string) {
  if (campo === 'imagens' || campo === 'imagem_principal') {
    return Number(dados.total_imagens ?? 0) > 0;
  }
  const valor = dados[campo];
  if (Array.isArray(valor)) return valor.length > 0;
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

function calcularScore(dados: Record<string, unknown>, obrigatorios = camposObrigatoriosMestre) {
  const faltantes = obrigatorios.filter((campo) => !valorPreenchido(dados, campo));
  const score = obrigatorios.length ? Math.round(((obrigatorios.length - faltantes.length) / obrigatorios.length) * 100) : 100;
  return { score, faltantes };
}

export async function buscarModuloCadastroProdutoCentral() {
  return consultarUm<{ id: number }>(
    `SELECT id
    FROM modulos
    WHERE codigo = 'CADASTRO_PRODUTO_CENTRAL'`
  );
}

export async function obterDashboardPim(empresaId: number) {
  const resumo = await consultarUm<Record<string, unknown>>(
    `SELECT
      COUNT(*)::INTEGER AS total_produtos,
      COUNT(*) FILTER (WHERE status = 'RASCUNHO')::INTEGER AS produtos_rascunho,
      COUNT(*) FILTER (WHERE status = 'AGUARDANDO_APROVACAO')::INTEGER AS produtos_aguardando_aprovacao,
      COUNT(*) FILTER (WHERE status = 'PUBLICADO')::INTEGER AS produtos_publicados,
      COUNT(*) FILTER (WHERE status = 'REJEITADO')::INTEGER AS produtos_rejeitados,
      COUNT(*) FILTER (WHERE score_completude < 80)::INTEGER AS produtos_incompletos,
      COUNT(*) FILTER (WHERE ean_gtin IS NULL OR ean_gtin = '')::INTEGER AS produtos_sem_ean,
      COUNT(*) FILTER (WHERE categoria IS NULL OR categoria = '')::INTEGER AS produtos_sem_categoria_marketplace,
      COALESCE(ROUND(AVG(score_completude), 2), 0)::NUMERIC AS score_medio_completude
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE`,
    [empresaId]
  );

  const produtosSemImagem = await consultarUm<{ total: number }>(
    `SELECT COUNT(*)::INTEGER AS total
    FROM produtos p
    WHERE p.empresa_id = $1
      AND p.excluido = FALSE
      AND NOT EXISTS (
        SELECT 1
        FROM ativos_digitais_produtos_vinculos apl
        INNER JOIN ativos_digitais a ON a.id = apl.ativo_digital_id
        WHERE apl.produto_id = p.id
          AND a.tipo LIKE 'IMAGEM%'
      )`,
    [empresaId]
  );

  const porStatus = await consultar(
    `SELECT status, COUNT(*)::INTEGER AS total
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE
    GROUP BY status
    ORDER BY total DESC`,
    [empresaId]
  );

  const porCategoria = await consultar(
    `SELECT COALESCE(NULLIF(categoria, ''), 'Sem categoria') AS categoria, COUNT(*)::INTEGER AS total
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE
    GROUP BY COALESCE(NULLIF(categoria, ''), 'Sem categoria')
    ORDER BY total DESC
    LIMIT 8`,
    [empresaId]
  );

  const porCanal = await consultar(
    `SELECT c.nome AS canal, COUNT(pcs.id)::INTEGER AS total, COALESCE(ROUND(AVG(pcs.score_completude), 2), 0)::NUMERIC AS score
    FROM canais c
    LEFT JOIN produtos_canais_status pcs ON pcs.canal_id = c.id
    WHERE c.empresa_id = $1
      AND c.ativo = TRUE
    GROUP BY c.nome
    ORDER BY c.nome ASC`,
    [empresaId]
  );

  const ultimasImportacoes = await consultar(
    `SELECT id, nome_arquivo, modo_importacao, status, total_linhas, produtos_com_erro, criado_em
    FROM importacoes
    WHERE empresa_id = $1
    ORDER BY criado_em DESC
    LIMIT 5`,
    [empresaId]
  );

  const ultimasAprovacoes = await consultar(
    `SELECT a.id, p.codigo_interno, p.modelo, a.status, a.solicitado_em, a.concluido_em
    FROM aprovacoes a
    INNER JOIN produtos p ON p.id = a.produto_id
    WHERE p.empresa_id = $1
    ORDER BY a.solicitado_em DESC
    LIMIT 5`,
    [empresaId]
  );

  const errosPorCanal = await consultar(
    `SELECT c.nome AS canal, COUNT(pcs.id)::INTEGER AS total
    FROM produtos_canais_status pcs
    INNER JOIN canais c ON c.id = pcs.canal_id
    INNER JOIN produtos p ON p.id = pcs.produto_id
    WHERE p.empresa_id = $1
      AND pcs.status IN ('ERRO', 'PENDENTE')
    GROUP BY c.nome
    ORDER BY total DESC`,
    [empresaId]
  );

  return {
    ...(resumo ?? {}),
    produtos_sem_imagem: produtosSemImagem?.total ?? 0,
    por_status: porStatus,
    por_categoria: porCategoria,
    por_canal: porCanal,
    ultimas_importacoes: ultimasImportacoes,
    ultimas_aprovacoes: ultimasAprovacoes,
    erros_por_canal: errosPorCanal
  };
}

export async function listarProdutos(empresaId: number, busca?: string, status?: string) {
  const termo = busca ? `%${busca.trim()}%` : null;
  return consultar(
    `SELECT
      id,
      codigo_interno,
      codigo_erp_decis,
      sku_interno,
      sku_comercial,
      codigo_fabricante,
      ean_gtin,
      gtin,
      mpn,
      nome_interno,
      nome_comercial,
      marca,
      linha,
      modelo,
      categoria,
      subcategoria,
      tipo_produto,
      status,
      score_completude,
      pendencias_validacao,
      publicado,
      versao_atual,
      criado_em,
      alterado_em
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE
      AND ($2::TEXT IS NULL OR codigo_interno ILIKE $2 OR sku_interno ILIKE $2 OR ean_gtin ILIKE $2 OR modelo ILIKE $2 OR marca ILIKE $2 OR descricao_interna ILIKE $2)
      AND ($3::TEXT IS NULL OR status = $3)
    ORDER BY alterado_em DESC NULLS LAST, criado_em DESC
    LIMIT 300`,
    [empresaId, termo, status || null]
  );
}

export async function salvarProduto(empresaId: number, dados: ProdutoCadastro, usuarioId: number) {
  const codigoInterno = dados.codigo_interno?.trim() || `PIM-${Date.now()}`;
  const tituloMeta = dados.titulo_meta ?? (dados as Record<string, unknown>).meta_title as string | null | undefined;
  const descricaoMeta = dados.descricao_meta ?? (dados as Record<string, unknown>).meta_description as string | null | undefined;
  const pontosDestaque = dados.pontos_destaque ?? (dados as Record<string, unknown>).bullet_points as string[] | string | null | undefined;
  const produtoAnterior = dados.id
    ? await consultarUm<Record<string, unknown>>(
      `SELECT *
      FROM produtos
      WHERE id = $1
        AND empresa_id = $2
        AND excluido = FALSE`,
      [dados.id, empresaId]
    )
    : null;
  const produtoAtual = dados.id
    ? await consultarUm<{ publicado: boolean; versao_atual: number }>(
      `SELECT publicado, versao_atual
      FROM produtos
      WHERE id = $1
        AND empresa_id = $2
        AND excluido = FALSE`,
      [dados.id, empresaId]
    )
    : null;

  const novaVersao = produtoAtual?.publicado ? Number(produtoAtual.versao_atual ?? 1) + 1 : Number(produtoAtual?.versao_atual ?? 1);
  const status = produtoAtual?.publicado ? 'RASCUNHO' : (dados.status ?? 'RASCUNHO');
  const scoreBase = calcularScore({
    ...dados,
    ean_gtin: dados.ean_gtin ?? dados.ean ?? dados.gtin,
    titulo_meta: tituloMeta,
    descricao_meta: descricaoMeta,
    pontos_destaque: listaTexto(pontosDestaque),
    palavras_chave: listaTexto(dados.palavras_chave)
  });

  const produto = await consultarUm(
    `INSERT INTO produtos (
      empresa_id,
      codigo_interno,
      codigo_erp_decis,
      sku_interno,
      sku_comercial,
      sku_fornecedor,
      codigo_fabricante,
      ean_gtin,
      gtin,
      mpn,
      ncm,
      cest,
      nome_interno,
      nome_comercial,
      marca,
      linha,
      modelo,
      familia,
      categoria,
      subcategoria,
      tipo_produto,
      status,
      origem,
      garantia,
      descricao_interna,
      observacoes,
      peso,
      altura,
      largura,
      comprimento,
      score_completude,
      pendencias_validacao,
      titulo_meta,
      descricao_meta,
      slug,
      descricao_curta,
      descricao_longa,
      pontos_destaque,
      palavras_chave,
      fiscal_comercial,
      publicado,
      versao_atual,
      usuario_responsavel_id,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, COALESCE($19, 'PRODUTO_SIMPLES'), COALESCE($20, 'RASCUNHO'), COALESCE($21, 'MANUAL'), $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32::JSONB, $33, $34, $35, $36, $37, $38, $39, $40::JSONB, FALSE, 1, $41, $42)
    ON CONFLICT (empresa_id, codigo_interno) DO UPDATE SET
      codigo_erp_decis = EXCLUDED.codigo_erp_decis,
      sku_interno = EXCLUDED.sku_interno,
      sku_comercial = EXCLUDED.sku_comercial,
      sku_fornecedor = EXCLUDED.sku_fornecedor,
      codigo_fabricante = EXCLUDED.codigo_fabricante,
      ean_gtin = EXCLUDED.ean_gtin,
      gtin = EXCLUDED.gtin,
      mpn = EXCLUDED.mpn,
      ncm = EXCLUDED.ncm,
      cest = EXCLUDED.cest,
      nome_interno = EXCLUDED.nome_interno,
      nome_comercial = EXCLUDED.nome_comercial,
      marca = EXCLUDED.marca,
      linha = EXCLUDED.linha,
      modelo = EXCLUDED.modelo,
      familia = EXCLUDED.familia,
      categoria = EXCLUDED.categoria,
      subcategoria = EXCLUDED.subcategoria,
      tipo_produto = EXCLUDED.tipo_produto,
      status = $18,
      origem = EXCLUDED.origem,
      garantia = EXCLUDED.garantia,
      descricao_interna = EXCLUDED.descricao_interna,
      observacoes = EXCLUDED.observacoes,
      peso = EXCLUDED.peso,
      altura = EXCLUDED.altura,
      largura = EXCLUDED.largura,
      comprimento = EXCLUDED.comprimento,
      score_completude = EXCLUDED.score_completude,
      pendencias_validacao = EXCLUDED.pendencias_validacao,
      titulo_meta = EXCLUDED.titulo_meta,
      descricao_meta = EXCLUDED.descricao_meta,
      slug = EXCLUDED.slug,
      descricao_curta = EXCLUDED.descricao_curta,
      descricao_longa = EXCLUDED.descricao_longa,
      pontos_destaque = EXCLUDED.pontos_destaque,
      palavras_chave = EXCLUDED.palavras_chave,
      fiscal_comercial = EXCLUDED.fiscal_comercial,
      versao_atual = $43,
      usuario_responsavel_id = EXCLUDED.usuario_responsavel_id,
      alterado_em = NOW(),
      alterado_por_usuario_id = $42
    RETURNING *`,
    [
      empresaId,
      codigoInterno,
      dados.codigo_erp_decis ?? null,
      dados.sku_interno ?? null,
      dados.sku_comercial ?? null,
      dados.sku_fornecedor ?? null,
      dados.codigo_fabricante ?? null,
      dados.ean_gtin ?? dados.ean ?? dados.gtin ?? null,
      dados.gtin ?? dados.ean_gtin ?? null,
      dados.mpn ?? null,
      dados.ncm ?? null,
      dados.cest ?? null,
      dados.nome_interno ?? dados.nome_comercial ?? null,
      dados.nome_comercial ?? dados.nome_interno ?? null,
      dados.marca ?? null,
      dados.linha ?? null,
      dados.modelo ?? null,
      dados.familia ?? null,
      dados.categoria ?? null,
      dados.subcategoria ?? null,
      dados.tipo_produto ?? 'PRODUTO_SIMPLES',
      status,
      dados.origem ?? 'MANUAL',
      dados.garantia ?? null,
      dados.descricao_interna ?? null,
      dados.observacoes ?? null,
      dados.peso ?? null,
      dados.altura ?? null,
      dados.largura ?? null,
      dados.comprimento ?? null,
      scoreBase.score,
      JSON.stringify(scoreBase.faltantes),
      tituloMeta ?? null,
      descricaoMeta ?? null,
      dados.slug ?? null,
      dados.descricao_curta ?? null,
      dados.descricao_longa ?? null,
      listaTexto(pontosDestaque),
      listaTexto(dados.palavras_chave),
      JSON.stringify(dados.fiscal_comercial ?? {}),
      dados.usuario_responsavel_id ?? null,
      usuarioId,
      novaVersao
    ]
  );

  if (produto) {
    await salvarSkusProduto(produto.id, dados.skus ?? [], usuarioId);
    await salvarComponentesProduto(empresaId, produto.id, dados.componentes ?? [], usuarioId);
    await salvarAtributosProduto(produto.id, dados.atributos ?? []);
    await salvarStatusCanaisProduto(empresaId, produto as Record<string, unknown>);
    await registrarHistoricoCampos(empresaId, produto.id, produtoAnterior, produto as Record<string, unknown>, usuarioId);
    await consultar(
      `INSERT INTO produtos_versoes (produto_id, numero_versao, status, dados_produto, motivo, criado_por_usuario_id)
      VALUES ($1, $2, $3, $4::JSONB, $5, $6)
      ON CONFLICT (produto_id, numero_versao) DO UPDATE SET
        status = EXCLUDED.status,
        dados_produto = EXCLUDED.dados_produto,
        motivo = EXCLUDED.motivo`,
      [produto.id, novaVersao, status, JSON.stringify(produto), produtoAtual?.publicado ? 'Nova versao gerada a partir de produto publicado.' : null, usuarioId]
    );
  }

  return produto;
}

export async function obterProdutoCompleto(empresaId: number, produtoId: number) {
  const produto = await consultarUm(
    `SELECT *
    FROM produtos
    WHERE id = $1
      AND empresa_id = $2
      AND excluido = FALSE`,
    [produtoId, empresaId]
  );

  if (!produto) return null;

  const skus = await consultar(
    `SELECT *
    FROM produtos_skus
    WHERE produto_id = $1
    ORDER BY principal DESC, id ASC`,
    [produtoId]
  );
  const componentes = await consultar(
    `SELECT pcl.*, COALESCE(cp.codigo_interno, pc.codigo) AS codigo, COALESCE(cp.nome_comercial, cp.modelo, pc.nome) AS nome, COALESCE(cp.tipo_produto, pc.tipo_componente) AS tipo
    FROM produtos_componentes_vinculos pcl
    LEFT JOIN produtos cp ON cp.id = pcl.componente_produto_id
    LEFT JOIN produtos_componentes pc ON pc.id = pcl.produto_componente_id
    WHERE pcl.conjunto_produto_id = $1
    ORDER BY pcl.ordem ASC, pcl.id ASC`,
    [produtoId]
  );
  const atributos = await consultar(
    `SELECT av.*, a.codigo, a.nome_exibido, a.tipo_campo, a.escopo, a.unidade_medida, ag.nome AS grupo_nome
    FROM atributos_valores av
    INNER JOIN atributos a ON a.id = av.atributo_id
    LEFT JOIN atributos_grupos ag ON ag.id = a.atributo_grupo_id
    WHERE av.produto_id = $1
    ORDER BY ag.ordem ASC NULLS LAST, a.ordem_exibicao ASC`,
    [produtoId]
  );
  const canais = await consultar(
    `SELECT pcs.*, c.codigo, c.nome AS canal_nome
    FROM produtos_canais_status pcs
    INNER JOIN canais c ON c.id = pcs.canal_id
    WHERE pcs.produto_id = $1
    ORDER BY c.nome ASC`,
    [produtoId]
  );
  const ativos_digitais = await consultar(
    `SELECT a.*, apl.tipo_vinculo, apl.principal, apl.ordem AS ordem_vinculo
    FROM ativos_digitais_produtos_vinculos apl
    INNER JOIN ativos_digitais a ON a.id = apl.ativo_digital_id
    WHERE apl.produto_id = $1
    ORDER BY apl.principal DESC, apl.ordem ASC`,
    [produtoId]
  );
  const historico = await consultar(
    `SELECT h.*, u.nome AS usuario_nome
    FROM produtos_historico_campos h
    LEFT JOIN usuarios u ON u.id = h.criado_por_usuario_id
    WHERE h.produto_id = $1
    ORDER BY h.criado_em DESC
    LIMIT 120`,
    [produtoId]
  );
  const aprovacoes = await consultar(
    `SELECT *
    FROM aprovacoes
    WHERE produto_id = $1
    ORDER BY solicitado_em DESC`,
    [produtoId]
  );

  return { produto, skus, componentes, atributos, canais, ativos_digitais, historico, aprovacoes };
}

async function salvarSkusProduto(productId: number, skus: Record<string, unknown>[], usuarioId: number) {
  for (const sku of skus.filter((item) => item.sku || item.sku_interno)) {
    const codigoSku = String(sku.sku ?? sku.sku_interno);
    await consultar(
      `INSERT INTO produtos_skus (produto_id, sku, tipo, status, dados, sku_erp, sku_fornecedor, sku_marketplace, ean, codigo_fabricante, principal, variacoes)
      VALUES ($1, $2, COALESCE($3, 'INTERNO'), COALESCE($4, 'ATIVO'), COALESCE($5, '{}'::JSONB), $6, $7, $8, $9, $10, COALESCE($11, FALSE), COALESCE($12, '{}'::JSONB))
      ON CONFLICT (produto_id, sku, tipo) DO UPDATE SET
        status = EXCLUDED.status,
        dados = EXCLUDED.dados,
        sku_erp = EXCLUDED.sku_erp,
        sku_fornecedor = EXCLUDED.sku_fornecedor,
        sku_marketplace = EXCLUDED.sku_marketplace,
        ean = EXCLUDED.ean,
        codigo_fabricante = EXCLUDED.codigo_fabricante,
        principal = EXCLUDED.principal,
        variacoes = EXCLUDED.variacoes`,
      [
        productId,
        codigoSku,
        sku.tipo ?? 'INTERNO',
        sku.status ?? 'ATIVO',
        JSON.stringify({ criado_por_usuario_id: usuarioId }),
        sku.sku_erp ?? null,
        sku.sku_fornecedor ?? null,
        sku.sku_marketplace ?? null,
        sku.ean ?? null,
        sku.codigo_fabricante ?? null,
        Boolean(sku.principal),
        JSON.stringify(sku.variacoes ?? {})
      ]
    );
  }
}

async function salvarComponentesProduto(empresaId: number, productId: number, componentes: Record<string, unknown>[], usuarioId: number) {
  if (componentes.length) {
    await consultar(
      `DELETE FROM produtos_componentes_vinculos
      WHERE conjunto_produto_id = $1`,
      [productId]
    );
  }
  for (const componente of componentes.filter((item) => item.codigo || item.nome || item.componente_produto_id || item.produto_componente_id)) {
    let productComponentId = componente.produto_componente_id ? Number(componente.produto_componente_id) : null;
    const componenteProductId = componente.componente_produto_id ? Number(componente.componente_produto_id) : null;

    if (!productComponentId && !componenteProductId) {
      const registro = await consultarUm<{ id: number }>(
        `INSERT INTO produtos_componentes (empresa_id, codigo, nome, tipo_componente, status, atributos, criado_por_usuario_id)
        VALUES ($1, $2, $3, $4, 'ATIVO', '{}'::JSONB, $5)
        ON CONFLICT (empresa_id, codigo) DO UPDATE SET
          nome = EXCLUDED.nome,
          tipo_componente = EXCLUDED.tipo_componente
        RETURNING id`,
        [
          empresaId,
          String(componente.codigo ?? `COMP-${Date.now()}`),
          String(componente.nome ?? componente.codigo ?? 'Componente'),
          String(componente.tipo_relacao ?? componente.tipo_componente ?? 'OUTRO'),
          usuarioId
        ]
      );
      productComponentId = registro?.id ?? null;
    }

    await consultar(
      `INSERT INTO produtos_componentes_vinculos (conjunto_produto_id, componente_produto_id, produto_componente_id, quantidade, tipo_relacao, ordem, obrigatorio, observacao)
      VALUES ($1, $2, $3, COALESCE($4, 1), COALESCE($5, 'COMPONENTE'), COALESCE($6, 0), COALESCE($7, TRUE), $8)`,
      [
        productId,
        componenteProductId,
        productComponentId,
        componente.quantidade !== undefined ? Number(componente.quantidade) : 1,
        componente.tipo_relacao ?? componente.tipo_componente ?? 'COMPONENTE',
        componente.ordem !== undefined ? Number(componente.ordem) : 0,
        componente.obrigatorio !== false,
        componente.observacao ?? null
      ]
    );
  }
}

async function salvarAtributosProduto(productId: number, atributos: Record<string, unknown>[]) {
  if (atributos.length) {
    await consultar(
      `DELETE FROM atributos_valores
      WHERE produto_id = $1`,
      [productId]
    );
  }
  for (const atributo of atributos.filter((item) => item.atributo_id && (item.valor_texto || item.valor_numero || item.valor_booleano !== undefined || item.valor_data))) {
    await consultar(
      `INSERT INTO atributos_valores (produto_id, atributo_id, valor_texto, valor_numero, valor_booleano, valor_data, valor_json, alterado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7::JSONB, NOW())`,
      [
        productId,
        Number(atributo.atributo_id),
        atributo.valor_texto ?? null,
        atributo.valor_numero !== undefined && atributo.valor_numero !== null && atributo.valor_numero !== '' ? Number(atributo.valor_numero) : null,
        atributo.valor_booleano === undefined ? null : Boolean(atributo.valor_booleano),
        atributo.valor_data ?? null,
        JSON.stringify(atributo.valor_json ?? {})
      ]
    );
  }
}

async function salvarStatusCanaisProduto(empresaId: number, produto: Record<string, unknown>) {
  const canais = await consultar<{ id: number; codigo: string }>(
    `SELECT id, codigo
    FROM canais
    WHERE empresa_id = $1
      AND ativo = TRUE`,
    [empresaId]
  );
  for (const canal of canais) {
    const obrigatorios = camposObrigatoriosPorCanal[canal.codigo] ?? camposObrigatoriosMestre;
    const { score, faltantes } = calcularScore(produto, obrigatorios);
    await consultar(
      `INSERT INTO produtos_canais_status (produto_id, canal_id, status, score_completude, campos_faltantes, ultima_validacao_em)
      VALUES ($1, $2, $3, $4, $5::JSONB, NOW())
      ON CONFLICT (produto_id, canal_id) DO UPDATE SET
        status = EXCLUDED.status,
        score_completude = EXCLUDED.score_completude,
        campos_faltantes = EXCLUDED.campos_faltantes,
        ultima_validacao_em = NOW()`,
      [produto.id, canal.id, faltantes.length ? 'PENDENTE' : 'VALIDO', score, JSON.stringify(faltantes)]
    );
  }
}

async function registrarHistoricoCampos(empresaId: number, productId: number, anterior: Record<string, unknown> | null, novo: Record<string, unknown>, usuarioId: number) {
  const campos = ['codigo_interno', 'sku_interno', 'sku_comercial', 'ean_gtin', 'gtin', 'codigo_fabricante', 'nome_comercial', 'marca', 'modelo', 'categoria', 'status', 'titulo_meta', 'slug'];
  for (const campo of campos) {
    const antes = anterior?.[campo] ?? null;
    const depois = novo[campo] ?? null;
    if (String(antes ?? '') !== String(depois ?? '')) {
      await consultar(
        `INSERT INTO produtos_historico_campos (produto_id, empresa_id, campo, valor_anterior, valor_novo, origem, criado_por_usuario_id)
        VALUES ($1, $2, $3, $4, $5, 'MANUAL', $6)`,
        [productId, empresaId, campo, antes === null ? null : String(antes), depois === null ? null : String(depois), usuarioId]
      );
    }
  }
}

export async function excluirProduto(empresaId: number, produtoId: number, usuarioId: number) {
  return consultarUm(
    `UPDATE produtos
    SET excluido = TRUE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $3
    WHERE id = $1
      AND empresa_id = $2
    RETURNING id`,
    [produtoId, empresaId, usuarioId]
  );
}

export async function restaurarProduto(empresaId: number, produtoId: number, usuarioId: number) {
  return consultarUm(
    `UPDATE produtos
    SET excluido = FALSE,
      excluido_em = NULL,
      excluido_por_usuario_id = NULL,
      status = CASE WHEN status = 'ARQUIVADO' THEN 'RASCUNHO' ELSE status END,
      alterado_em = NOW(),
      alterado_por_usuario_id = $3
    WHERE id = $1
      AND empresa_id = $2
    RETURNING id, codigo_interno, sku_interno, status, excluido`,
    [produtoId, empresaId, usuarioId]
  );
}

export async function alterarStatusProduto(empresaId: number, produtoId: number, status: string, usuarioId: number, comentario?: string) {
  const anterior = await consultarUm<Record<string, unknown>>(
    `SELECT id, status
    FROM produtos
    WHERE id = $1
      AND empresa_id = $2`,
    [produtoId, empresaId]
  );

  const produto = await consultarUm<Record<string, unknown>>(
    `UPDATE produtos
    SET status = $3::VARCHAR,
      publicado = CASE WHEN $3::VARCHAR = 'PUBLICADO' THEN TRUE WHEN $3::VARCHAR IN ('ARQUIVADO', 'REJEITADO') THEN FALSE ELSE publicado END,
      alterado_em = NOW(),
      alterado_por_usuario_id = $4
    WHERE id = $1
      AND empresa_id = $2
      AND excluido = FALSE
    RETURNING *`,
    [produtoId, empresaId, status, usuarioId]
  );

  if (produto && String(anterior?.status ?? '') !== status) {
    await consultar(
      `INSERT INTO produtos_historico_campos (produto_id, empresa_id, campo, valor_anterior, valor_novo, origem, comentario, criado_por_usuario_id)
      VALUES ($1, $2, 'status', $3, $4, 'APROVACAO', $5, $6)`,
      [produtoId, empresaId, String(anterior?.status ?? ''), status, comentario ?? null, usuarioId]
    );

    if (['AGUARDANDO_APROVACAO', 'APROVADO', 'REJEITADO', 'PUBLICADO'].includes(status)) {
      await consultar(
        `INSERT INTO aprovacoes (produto_id, status, comentario, solicitado_por_usuario_id, aprovador_usuario_id, solicitado_em, concluido_em)
        VALUES ($1::BIGINT, $2::VARCHAR, $3::TEXT, $4::BIGINT, CASE WHEN $2::VARCHAR IN ('APROVADO', 'REJEITADO', 'PUBLICADO') THEN $4::BIGINT ELSE NULL END, NOW(), CASE WHEN $2::VARCHAR IN ('APROVADO', 'REJEITADO', 'PUBLICADO') THEN NOW() ELSE NULL END)`,
        [
          produtoId,
          status === 'AGUARDANDO_APROVACAO' ? 'PENDENTE' : 'CONCLUIDO',
          comentario ?? null,
          usuarioId
        ]
      );
    }
  }

  return produto;
}

export async function duplicarProduto(empresaId: number, produtoId: number, usuarioId: number) {
  const original = await obterProdutoCompleto(empresaId, produtoId);
  if (!original?.produto) return null;

  const timestamp = Date.now();
  const produto = original.produto as ProdutoCadastro;
  const copia: ProdutoCadastro = {
    ...produto,
    id: undefined,
    codigo_interno: `${produto.codigo_interno ?? 'PROD'}-COPIA-${timestamp}`,
    sku_interno: `${produto.sku_interno ?? 'SKU'}-COPIA-${timestamp}`,
    sku_comercial: produto.sku_comercial ? `${produto.sku_comercial}-COPIA` : null,
    nome_interno: produto.nome_interno ? `${produto.nome_interno} (copia)` : null,
    nome_comercial: produto.nome_comercial ? `${produto.nome_comercial} (copia)` : null,
    status: 'RASCUNHO',
    skus: (original.skus ?? []).map((sku: Record<string, unknown>, indice: number) => ({
      ...sku,
      id: undefined,
      sku_interno: `${sku.sku_interno ?? produto.sku_interno ?? 'SKU'}-COPIA-${indice + 1}`,
      principal: indice === 0
    })),
    componentes: (original.componentes ?? []).map((componente: Record<string, unknown>) => ({
      component_id: componente.component_id,
      tipo: componente.tipo_vinculo,
      ordem: componente.ordem,
      quantidade: componente.quantidade,
      obrigatorio: componente.obrigatorio,
      observacao: componente.observacao
    })),
    atributos: (original.atributos ?? []).map((atributo: Record<string, unknown>) => ({
      atributo_id: atributo.atributo_id,
      valor: atributo.valor,
      origem: 'MANUAL'
    }))
  };

  return salvarProduto(empresaId, copia, usuarioId);
}

export async function exportarProdutos(empresaId: number) {
  return consultar(
    `SELECT codigo_interno, codigo_erp_decis, sku_interno, sku_comercial, ean_gtin, gtin,
      nome_comercial, marca, linha, modelo, familia, categoria, subcategoria, tipo_produto,
      status, score_completude, criado_em, alterado_em
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE
    ORDER BY alterado_em DESC, criado_em DESC`,
    [empresaId]
  );
}

export async function listarComponentes(empresaId: number) {
  return consultar(
    `SELECT pc.*, p.codigo_interno AS produto_codigo, p.modelo AS produto_modelo
    FROM produtos_componentes pc
    LEFT JOIN produtos p ON p.id = pc.produto_id
    WHERE pc.empresa_id = $1
    ORDER BY pc.tipo_componente ASC, pc.nome ASC`,
    [empresaId]
  );
}

export async function salvarComponente(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  return consultarUm(
    `INSERT INTO produtos_componentes (empresa_id, produto_id, codigo, nome, tipo_componente, status, atributos, criado_por_usuario_id)
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'ATIVO'), COALESCE($7, '{}'::JSONB), $8)
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET
      produto_id = EXCLUDED.produto_id,
      nome = EXCLUDED.nome,
      tipo_componente = EXCLUDED.tipo_componente,
      status = EXCLUDED.status,
      atributos = EXCLUDED.atributos
    RETURNING *`,
    [
      empresaId,
      dados.produto_id ? Number(dados.produto_id) : null,
      String(dados.codigo ?? `COMP-${Date.now()}`),
      String(dados.nome ?? 'Componente'),
      String(dados.tipo_componente ?? 'OUTRO'),
      String(dados.status ?? 'ATIVO'),
      JSON.stringify(dados.atributos ?? {}),
      usuarioId
    ]
  );
}

export async function listarAtributos(empresaId: number) {
  return consultar(
    `SELECT a.*, ag.nome AS grupo_nome
    FROM atributos a
    LEFT JOIN atributos_grupos ag ON ag.id = a.atributo_grupo_id
    WHERE a.empresa_id = $1 OR a.empresa_id IS NULL
    ORDER BY ag.ordem ASC NULLS LAST, a.ordem_exibicao ASC, a.nome_exibido ASC`,
    [empresaId]
  );
}

export async function listarGruposAtributos(empresaId: number) {
  return consultar(
    `SELECT *
    FROM atributos_grupos
    WHERE empresa_id = $1 OR empresa_id IS NULL
    ORDER BY ordem ASC, nome ASC`,
    [empresaId]
  );
}

export async function salvarAtributo(empresaId: number, dados: Record<string, unknown>) {
  return consultarUm(
    `INSERT INTO atributos (
      empresa_id,
      atributo_grupo_id,
      nome_interno,
      nome_exibido,
      codigo,
      descricao,
      tipo_campo,
      ordem_exibicao,
      escopo,
      unidade_medida,
      obrigatorio,
      editavel,
      visivel,
      valor_padrao,
      mascara,
      validacao,
      ajuda_tooltip,
      ativo
    )
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'TEXTO'), COALESCE($8, 0), COALESCE($9, 'PRODUTO'), $10, COALESCE($11, FALSE), COALESCE($12, TRUE), COALESCE($13, TRUE), $14, $15, $16, $17, COALESCE($18, TRUE))
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET
      atributo_grupo_id = EXCLUDED.atributo_grupo_id,
      nome_interno = EXCLUDED.nome_interno,
      nome_exibido = EXCLUDED.nome_exibido,
      descricao = EXCLUDED.descricao,
      tipo_campo = EXCLUDED.tipo_campo,
      ordem_exibicao = EXCLUDED.ordem_exibicao,
      escopo = EXCLUDED.escopo,
      unidade_medida = EXCLUDED.unidade_medida,
      obrigatorio = EXCLUDED.obrigatorio,
      editavel = EXCLUDED.editavel,
      visivel = EXCLUDED.visivel,
      valor_padrao = EXCLUDED.valor_padrao,
      mascara = EXCLUDED.mascara,
      validacao = EXCLUDED.validacao,
      ajuda_tooltip = EXCLUDED.ajuda_tooltip,
      ativo = EXCLUDED.ativo
    RETURNING *`,
    [
      empresaId,
      dados.atributo_grupo_id || dados.attribute_group_id ? Number(dados.atributo_grupo_id ?? dados.attribute_group_id) : null,
      String(dados.nome_interno ?? dados.codigo ?? '').toLowerCase(),
      String(dados.nome_exibido ?? dados.nome_interno ?? 'Atributo'),
      String(dados.codigo ?? '').toUpperCase(),
      dados.descricao ?? null,
      dados.tipo_campo ?? 'TEXTO',
      dados.ordem_exibicao ? Number(dados.ordem_exibicao) : 0,
      dados.escopo ?? 'PRODUTO',
      dados.unidade_medida ?? null,
      Boolean(dados.obrigatorio),
      dados.editavel !== false,
      dados.visivel !== false,
      dados.valor_padrao ?? null,
      dados.mascara ?? null,
      dados.validacao ?? null,
      dados.ajuda_tooltip ?? null,
      dados.ativo !== false
    ]
  );
}

export async function excluirAtributo(empresaId: number, id: number) {
  return consultarUm(
    `UPDATE atributos
    SET ativo = FALSE, editavel = FALSE, visivel = FALSE
    WHERE id = $1
      AND empresa_id = $2
    RETURNING *`,
    [id, empresaId]
  );
}

export async function listarMapeamentosAtributosCanais(empresaId: number) {
  return consultar(
    `SELECT
      cam.id,
      cam.canal_id,
      cam.atributo_id,
      cam.canal_atributo_id,
      cam.regra_transformacao,
      cam.ativo,
      c.codigo AS canal_codigo,
      c.nome AS canal_nome,
      c.tipo_canal,
      a.codigo AS atributo_codigo,
      a.nome_exibido AS atributo_nome,
      a.escopo,
      ca.codigo AS atributo_canal_codigo,
      ca.nome AS atributo_canal_nome,
      ca.obrigatorio,
      ca.ordem,
      ca.validacao
    FROM canais_atributos_mapeamentos cam
    INNER JOIN canais c ON c.id = cam.canal_id
    INNER JOIN atributos a ON a.id = cam.atributo_id
    LEFT JOIN canais_atributos ca ON ca.id = cam.canal_atributo_id
    WHERE c.empresa_id = $1
      AND a.empresa_id = $1
    ORDER BY c.nome ASC, ca.ordem ASC NULLS LAST, a.ordem_exibicao ASC, a.nome_exibido ASC`,
    [empresaId]
  );
}

export async function salvarMapeamentoAtributoCanal(empresaId: number, dados: Record<string, unknown>) {
  const canalIds = Array.isArray(dados.canal_ids) && dados.canal_ids.length
    ? dados.canal_ids.map((id) => Number(id)).filter(Boolean)
    : [Number(dados.canal_id)].filter(Boolean);
  const atributoId = Number(dados.atributo_id);
  const resultados = [];

  for (const canalId of canalIds) {
    const canal = await consultarUm<{ id: number }>(
      `SELECT id FROM canais WHERE id = $1 AND empresa_id = $2`,
      [canalId, empresaId]
    );
    const atributo = await consultarUm<{ id: number; codigo: string; nome_exibido: string }>(
      `SELECT id, codigo, nome_exibido FROM atributos WHERE id = $1 AND empresa_id = $2`,
      [atributoId, empresaId]
    );

    if (!canal || !atributo) continue;

    const atributoCanal = await consultarUm<{ id: number }>(
      `INSERT INTO canais_atributos (canal_id, codigo, nome, obrigatorio, ordem, validacao, ativo)
      VALUES ($1, $2, $3, COALESCE($4, FALSE), COALESCE($5, 0), $6, COALESCE($7, TRUE))
      ON CONFLICT (canal_id, codigo) DO UPDATE SET
        nome = EXCLUDED.nome,
        obrigatorio = EXCLUDED.obrigatorio,
        ordem = EXCLUDED.ordem,
        validacao = EXCLUDED.validacao,
        ativo = EXCLUDED.ativo
      RETURNING id`,
      [
        canalId,
        String(dados.atributo_canal_codigo ?? dados.codigo_canal ?? atributo.codigo).toUpperCase(),
        String(dados.atributo_canal_nome ?? dados.nome_canal ?? atributo.nome_exibido),
        Boolean(dados.obrigatorio),
        dados.ordem ? Number(dados.ordem) : 0,
        dados.validacao ?? null,
        dados.ativo !== false
      ]
    );

    const mapeamento = await consultarUm(
      `INSERT INTO canais_atributos_mapeamentos (canal_id, atributo_id, canal_atributo_id, regra_transformacao, ativo)
      VALUES ($1, $2, $3, COALESCE($4, '{}'::JSONB), COALESCE($5, TRUE))
      ON CONFLICT (canal_id, atributo_id) DO UPDATE SET
        canal_atributo_id = EXCLUDED.canal_atributo_id,
        regra_transformacao = EXCLUDED.regra_transformacao,
        ativo = EXCLUDED.ativo
      RETURNING *`,
      [
        canalId,
        atributoId,
        atributoCanal?.id ?? null,
        JSON.stringify(dados.regra_transformacao ?? {}),
        dados.ativo !== false
      ]
    );
    resultados.push(mapeamento);
  }

  return resultados;
}

export async function excluirMapeamentoAtributoCanal(empresaId: number, id: number) {
  return consultarUm(
    `UPDATE canais_atributos_mapeamentos cam
    SET ativo = FALSE
    FROM canais c
    WHERE cam.id = $1
      AND cam.canal_id = c.id
      AND c.empresa_id = $2
    RETURNING cam.*`,
    [id, empresaId]
  );
}

export async function listarCanais(empresaId: number) {
  return consultar(
    `SELECT *
    FROM canais
    WHERE empresa_id = $1 OR empresa_id IS NULL
    ORDER BY tipo_canal ASC, nome ASC`,
    [empresaId]
  );
}

export async function salvarCanal(empresaId: number, dados: Record<string, unknown>) {
  return consultarUm(
    `INSERT INTO canais (empresa_id, codigo, nome, tipo_canal, categoria_interna, categoria_canal, score_minimo_publicacao, regras, ativo)
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 80), COALESCE($8, '{}'::JSONB), COALESCE($9, TRUE))
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET
      nome = EXCLUDED.nome,
      tipo_canal = EXCLUDED.tipo_canal,
      categoria_interna = EXCLUDED.categoria_interna,
      categoria_canal = EXCLUDED.categoria_canal,
      score_minimo_publicacao = EXCLUDED.score_minimo_publicacao,
      regras = EXCLUDED.regras,
      ativo = EXCLUDED.ativo
    RETURNING *`,
    [
      empresaId,
      String(dados.codigo ?? '').toUpperCase(),
      String(dados.nome ?? 'Canal'),
      String(dados.tipo_canal ?? 'MARKETPLACE'),
      dados.categoria_interna ?? null,
      dados.categoria_canal ?? null,
      dados.score_minimo_publicacao ? Number(dados.score_minimo_publicacao) : 80,
      JSON.stringify(dados.regras ?? {}),
      dados.ativo !== false
    ]
  );
}

export async function listarScoreCanais(empresaId: number) {
  return consultar(
    `SELECT
      p.id AS produto_id,
      p.codigo_interno,
      p.modelo,
      p.score_completude AS cadastro_mestre,
      c.nome AS canal,
      COALESCE(pcs.score_completude, 0) AS score_canal,
      COALESCE(pcs.campos_faltantes, '[]'::JSONB) AS campos_faltantes,
      COALESCE(pcs.status, 'PENDENTE') AS status
    FROM produtos p
    CROSS JOIN canais c
    LEFT JOIN produtos_canais_status pcs ON pcs.produto_id = p.id AND pcs.canal_id = c.id
    WHERE p.empresa_id = $1
      AND p.excluido = FALSE
      AND c.empresa_id = $1
      AND c.ativo = TRUE
    ORDER BY p.codigo_interno ASC, c.nome ASC
    LIMIT 500`,
    [empresaId]
  );
}

export async function listarAssets(empresaId: number, busca?: string) {
  const termo = busca ? `%${busca.trim()}%` : null;
  return consultar(
    `SELECT a.*, COUNT(apl.produto_id)::INTEGER AS produtos_vinculados
    FROM ativos_digitais a
    LEFT JOIN ativos_digitais_produtos_vinculos apl ON apl.ativo_digital_id = a.id
    WHERE a.empresa_id = $1
      AND ($2::TEXT IS NULL OR a.nome ILIKE $2 OR a.modelo ILIKE $2 OR a.marca ILIKE $2 OR $2 ILIKE ANY(a.tags))
    GROUP BY a.id
    ORDER BY a.criado_em DESC
    LIMIT 200`,
    [empresaId, termo]
  );
}

export async function salvarAsset(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  return consultarUm(
    `INSERT INTO ativos_digitais (empresa_id, nome, tipo, arquivo, url, texto_alternativo, ordem, status, tags, marca, modelo, criado_por_usuario_id)
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), COALESCE($8, 'ATIVO'), $9, $10, $11, $12)
    RETURNING *`,
    [
      empresaId,
      String(dados.nome ?? 'Asset'),
      String(dados.tipo ?? 'IMAGEM_SECUNDARIA'),
      dados.arquivo ?? null,
      dados.url ?? null,
      dados.texto_alternativo ?? null,
      dados.ordem ? Number(dados.ordem) : 0,
      dados.status ?? 'ATIVO',
      Array.isArray(dados.tags) ? dados.tags : String(dados.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean),
      dados.marca ?? null,
      dados.modelo ?? null,
      usuarioId
    ]
  );
}

export async function listarImportacoes(empresaId: number) {
  return consultar(
    `SELECT *
    FROM importacoes
    WHERE empresa_id = $1
    ORDER BY criado_em DESC
    LIMIT 100`,
    [empresaId]
  );
}

export async function registrarImportacao(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const importacao = await consultarUm(
    `INSERT INTO importacoes (
      empresa_id,
      nome_arquivo,
      tipo_arquivo,
      modo_importacao,
      status,
      total_linhas,
      relatorio,
      colunas_detectadas,
      mapeamento,
      previa,
      logs,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, COALESCE($4, 'APENAS_VALIDAR'), 'RASCUNHO', COALESCE($5, 0), COALESCE($6, '{}'::JSONB), COALESCE($7, '[]'::JSONB), COALESCE($8, '{}'::JSONB), COALESCE($9, '[]'::JSONB), COALESCE($10, '[]'::JSONB), $11)
    RETURNING *`,
    [
      empresaId,
      String(dados.nome_arquivo ?? 'importacao.csv'),
      String(dados.tipo_arquivo ?? 'CSV'),
      dados.modo_importacao ?? 'APENAS_VALIDAR',
      dados.total_linhas ? Number(dados.total_linhas) : 0,
      JSON.stringify(dados.relatorio ?? { observacao: 'Importacao registrada como rascunho.' }),
      JSON.stringify(dados.colunas_detectadas ?? []),
      JSON.stringify(dados.mapeamento ?? {}),
      JSON.stringify(dados.previa ?? []),
      JSON.stringify(dados.logs ?? []),
      usuarioId
    ]
  );

  if (dados.salvar_layout && dados.nome_layout) {
    await consultarUm(
      `INSERT INTO importacoes_layouts (empresa_id, nome, descricao, mapeamento, ativo, criado_por_usuario_id)
      VALUES ($1, $2, $3, COALESCE($4, '{}'::JSONB), TRUE, $5)
      ON CONFLICT (empresa_id, nome) DO UPDATE SET
        descricao = EXCLUDED.descricao,
        mapeamento = EXCLUDED.mapeamento,
        ativo = TRUE
      RETURNING *`,
      [
        empresaId,
        String(dados.nome_layout),
        dados.descricao_layout ?? null,
        JSON.stringify(dados.mapeamento ?? {}),
        usuarioId
      ]
    );
  }

  return importacao;
}

export async function listarWorkflowAprovacoes(empresaId: number) {
  const fluxos_trabalho = await consultar(
    `SELECT w.*, COUNT(ws.id)::INTEGER AS total_etapas
    FROM fluxos_trabalho w
    LEFT JOIN fluxos_trabalho_etapas ws ON ws.fluxo_trabalho_id = w.id
    WHERE w.empresa_id = $1
    GROUP BY w.id
    ORDER BY w.nome ASC`,
    [empresaId]
  );

  const aprovacoes = await consultar(
    `SELECT a.*, p.codigo_interno, p.modelo
    FROM aprovacoes a
    INNER JOIN produtos p ON p.id = a.produto_id
    WHERE p.empresa_id = $1
    ORDER BY a.solicitado_em DESC
    LIMIT 100`,
    [empresaId]
  );

  return { fluxos_trabalho, aprovacoes };
}

export async function listarConfiguracoesModulo(empresaId: number) {
  const modulo = await buscarModuloCadastroProdutoCentral();
  if (!modulo) return {};

  const geral = await consultarUm<{ valor: Record<string, unknown> }>(
    `SELECT valor
    FROM configuracoes_modulos
    WHERE empresa_id = $1
      AND modulo_id = $2
      AND chave = 'CADASTRO_PRODUTO_CENTRAL_GERAL'`,
    [empresaId, modulo.id]
  );
  const ia = await consultarUm(
    `SELECT ativo, modelo_padrao, temperatura, limite_tokens, CASE WHEN chave_openai IS NULL OR chave_openai = '' THEN FALSE ELSE TRUE END AS chave_configurada
    FROM ia_configuracoes
    WHERE empresa_id = $1
      AND modulo_id = $2`,
    [empresaId, modulo.id]
  );
  const integracoes = await consultar(
    `SELECT id, codigo, nome, api_url, ambiente, status, ultima_sincronizacao_em
    FROM integracoes_configuracoes
    WHERE empresa_id = $1
      AND modulo_id = $2
    ORDER BY nome ASC`,
    [empresaId, modulo.id]
  );

  return { geral: geral?.valor ?? {}, ia: ia ?? {}, integracoes };
}

export async function salvarConfiguracoesModulo(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const modulo = await buscarModuloCadastroProdutoCentral();
  if (!modulo) return null;

  if ('ia_ativa' in dados || 'ia_modelo_padrao' in dados || 'ia_chave_openai' in dados) {
    await consultar(
      `INSERT INTO ia_configuracoes (empresa_id, modulo_id, ativo, modelo_padrao, temperatura, limite_tokens, chave_openai, alterado_em, alterado_por_usuario_id)
      VALUES ($1, $2, COALESCE($3, FALSE), COALESCE($4, 'gpt-4.1-mini'), COALESCE($5, 0.2), COALESCE($6, 1200), $7, NOW(), $8)
      ON CONFLICT (empresa_id, modulo_id) DO UPDATE SET
        ativo = EXCLUDED.ativo,
        modelo_padrao = EXCLUDED.modelo_padrao,
        temperatura = EXCLUDED.temperatura,
        limite_tokens = EXCLUDED.limite_tokens,
        chave_openai = COALESCE(NULLIF(EXCLUDED.chave_openai, ''), ia_configuracoes.chave_openai),
        alterado_em = NOW(),
        alterado_por_usuario_id = $8`,
      [
        empresaId,
        modulo.id,
        Boolean(dados.ia_ativa),
        dados.ia_modelo_padrao ?? 'gpt-4.1-mini',
        dados.ia_temperatura ? Number(dados.ia_temperatura) : 0.2,
        dados.ia_limite_tokens ? Number(dados.ia_limite_tokens) : 1200,
        dados.ia_chave_openai ?? null,
        usuarioId
      ]
    );
  }

  return consultarUm(
    `INSERT INTO configuracoes_modulos (empresa_id, modulo_id, chave, valor, sensivel, alterado_em, alterado_por_usuario_id)
    VALUES ($1, $2, 'CADASTRO_PRODUTO_CENTRAL_GERAL', $3::JSONB, FALSE, NOW(), $4)
    ON CONFLICT (empresa_id, modulo_id, chave) DO UPDATE SET
      valor = EXCLUDED.valor,
      alterado_em = NOW(),
      alterado_por_usuario_id = $4
    RETURNING valor`,
    [empresaId, modulo.id, JSON.stringify(dados), usuarioId]
  );
}

export async function listarAuditoriaPim(empresaId: number) {
  return consultar(
    `SELECT a.*, u.nome AS usuario_nome
    FROM auditorias a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    WHERE (a.empresa_id = $1 OR a.empresa_id IS NULL)
      AND (a.modulo_codigo = 'CADASTRO_PRODUTO_CENTRAL' OR a.tabela_afetada IN ('produtos', 'atributos', 'canais', 'ativos_digitais', 'importacoes', 'fluxos_trabalho'))
    ORDER BY a.criado_em DESC
    LIMIT 200`,
    [empresaId]
  );
}

function validarConsultaSqlServerLeitura(consultaSql: string) {
  const sql = consultaSql.trim().replace(/;+\s*$/g, '');
  if (!/^(SELECT|WITH)\s/i.test(sql)) {
    throw new Error('A consulta SQL Server deve ser somente leitura e iniciar com SELECT ou WITH.');
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|MERGE|EXEC|EXECUTE|CREATE|GRANT|REVOKE)\b/i.test(sql)) {
    throw new Error('A consulta SQL Server contem comando nao permitido para carga manual.');
  }
  return sql;
}

async function buscarConexaoSqlServer(empresaId: number, id: number) {
  return consultarUm<ConexaoSqlServerPim>(
    `SELECT *
    FROM pim_conexoes_sqlserver
    WHERE id = $1
      AND empresa_id = $2
      AND ativo = TRUE`,
    [id, empresaId]
  );
}

async function executarConsultaSqlServer(conexao: ConexaoSqlServerPim, consultaSql: string, limite = 500) {
  const pool = new sqlServer.ConnectionPool({
    server: conexao.host,
    port: Number(conexao.porta || 1433),
    database: conexao.banco,
    user: conexao.usuario,
    password: String(conexao.senha ?? ''),
    options: {
      encrypt: Boolean(conexao.opcoes?.encrypt ?? false),
      trustServerCertificate: conexao.opcoes?.trustServerCertificate !== false
    },
    requestTimeout: Number(conexao.opcoes?.requestTimeout ?? 60000),
    connectionTimeout: Number(conexao.opcoes?.connectionTimeout ?? 15000)
  });

  await pool.connect();
  try {
    const resultado = await pool.request().query(validarConsultaSqlServerLeitura(consultaSql));
    const linhas = (resultado.recordset ?? []).slice(0, limite);
    const colunas = Object.keys(linhas[0] ?? {});
    return { colunas, linhas, total: resultado.recordset?.length ?? 0 };
  } finally {
    await pool.close();
  }
}

export async function listarConexoesSqlServerPim(empresaId: number) {
  return consultar(
    `SELECT id, nome, host, porta, banco, usuario, ambiente, ativo, ultima_validacao_em, ultima_mensagem, criado_em
    FROM pim_conexoes_sqlserver
    WHERE empresa_id = $1
    ORDER BY nome ASC`,
    [empresaId]
  );
}

export async function salvarConexaoSqlServerPim(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  return consultarUm(
    `INSERT INTO pim_conexoes_sqlserver (empresa_id, nome, host, porta, banco, usuario, senha, ambiente, ativo, opcoes, alterado_em, criado_por_usuario_id)
    VALUES ($1, $2, $3, COALESCE($4, 1433), $5, $6, NULLIF($7, ''), COALESCE($8, 'PRODUCAO'), COALESCE($9, TRUE), COALESCE($10, '{}'::JSONB), NOW(), $11)
    ON CONFLICT (empresa_id, nome) DO UPDATE SET
      host = EXCLUDED.host,
      porta = EXCLUDED.porta,
      banco = EXCLUDED.banco,
      usuario = EXCLUDED.usuario,
      senha = COALESCE(EXCLUDED.senha, pim_conexoes_sqlserver.senha),
      ambiente = EXCLUDED.ambiente,
      ativo = EXCLUDED.ativo,
      opcoes = EXCLUDED.opcoes,
      alterado_em = NOW()
    RETURNING id, nome, host, porta, banco, usuario, ambiente, ativo, ultima_validacao_em, ultima_mensagem`,
    [
      empresaId,
      String(dados.nome ?? 'Banco oficial'),
      String(dados.host ?? ''),
      dados.porta ? Number(dados.porta) : 1433,
      String(dados.banco ?? ''),
      String(dados.usuario ?? ''),
      dados.senha ?? null,
      dados.ambiente ?? 'PRODUCAO',
      dados.ativo !== false,
      JSON.stringify(dados.opcoes ?? {}),
      usuarioId
    ]
  );
}

export async function testarConexaoSqlServerPim(empresaId: number, id: number) {
  const conexao = await buscarConexaoSqlServer(empresaId, id);
  if (!conexao) throw new Error('Conexao SQL Server nao encontrada.');
  try {
    await executarConsultaSqlServer(conexao, 'SELECT 1 AS teste', 1);
    return consultarUm(
      `UPDATE pim_conexoes_sqlserver
      SET ultima_validacao_em = NOW(), ultima_mensagem = 'Conexao validada com sucesso.'
      WHERE id = $1
      RETURNING id, nome, ultima_validacao_em, ultima_mensagem`,
      [id]
    );
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Falha ao validar conexao SQL Server.';
    await consultar(
      `UPDATE pim_conexoes_sqlserver
      SET ultima_validacao_em = NOW(), ultima_mensagem = $2
      WHERE id = $1`,
      [id, mensagem]
    );
    throw error;
  }
}

export async function consultarSqlServerPim(empresaId: number, dados: Record<string, unknown>) {
  const conexao = await buscarConexaoSqlServer(empresaId, Number(dados.conexao_id));
  if (!conexao) throw new Error('Conexao SQL Server nao encontrada.');
  const resultado = await executarConsultaSqlServer(conexao, String(dados.consulta_sql ?? ''), Number(dados.limite ?? 100));
  return {
    colunas: resultado.colunas,
    previa: resultado.linhas.slice(0, 20),
    total_linhas: resultado.total
  };
}

function mapearLinhaSqlServerParaProduto(linha: Record<string, unknown>, mapeamento: Record<string, unknown>) {
  return Object.entries(mapeamento).reduce<ProdutoCadastro>((acc, [colunaOrigem, campoDestino]) => {
    if (!campoDestino) return acc;
    const campo = String(campoDestino);
    const valor = linha[colunaOrigem];
    if (valor === undefined || valor === null || valor === '') return acc;
    return { ...acc, [campo]: valor } as ProdutoCadastro;
  }, {});
}

async function localizarProdutoExistente(empresaId: number, produto: ProdutoCadastro) {
  return consultarUm<{ id: number }>(
    `SELECT id
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE
      AND (
        ($2::TEXT IS NOT NULL AND sku_interno = $2)
        OR ($3::TEXT IS NOT NULL AND codigo_erp_decis = $3)
        OR ($4::TEXT IS NOT NULL AND ean_gtin = $4)
        OR ($5::TEXT IS NOT NULL AND codigo_fabricante = $5)
        OR ($6::TEXT IS NOT NULL AND modelo = $6)
      )
    ORDER BY alterado_em DESC NULLS LAST, criado_em DESC
    LIMIT 1`,
    [
      empresaId,
      produto.sku_interno ?? null,
      produto.codigo_erp_decis ?? null,
      produto.ean_gtin ?? produto.ean ?? produto.gtin ?? null,
      produto.codigo_fabricante ?? null,
      produto.modelo ?? null
    ]
  );
}

async function localizarProdutoPorCodigo(empresaId: number, codigo?: unknown) {
  if (!codigo) return null;
  return consultarUm<{ id: number }>(
    `SELECT id
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE
      AND (codigo_interno = $2 OR sku_interno = $2 OR codigo_erp_decis = $2 OR modelo = $2)
    ORDER BY alterado_em DESC NULLS LAST, criado_em DESC
    LIMIT 1`,
    [empresaId, String(codigo)]
  );
}

async function processarLinhaSkuSqlServer(empresaId: number, linhaMapeada: Record<string, unknown>) {
  const produto = await localizarProdutoPorCodigo(empresaId, linhaMapeada.produto_codigo ?? linhaMapeada.codigo_interno ?? linhaMapeada.sku_interno);
  if (!produto) throw new Error('Produto nao encontrado para vincular SKU.');
  await consultar(
    `INSERT INTO produtos_skus (produto_id, sku, tipo, status, dados, sku_erp, sku_fornecedor, sku_marketplace, ean, codigo_fabricante, principal, variacoes)
    VALUES ($1, $2, COALESCE($3, 'INTERNO'), COALESCE($4, 'ATIVO'), COALESCE($5, '{}'::JSONB), $6, $7, $8, $9, $10, COALESCE($11, FALSE), COALESCE($12, '{}'::JSONB))
    ON CONFLICT (produto_id, sku, tipo) DO UPDATE SET
      status = EXCLUDED.status,
      dados = EXCLUDED.dados,
      sku_erp = EXCLUDED.sku_erp,
      sku_fornecedor = EXCLUDED.sku_fornecedor,
      sku_marketplace = EXCLUDED.sku_marketplace,
      ean = EXCLUDED.ean,
      codigo_fabricante = EXCLUDED.codigo_fabricante,
      principal = EXCLUDED.principal,
      variacoes = EXCLUDED.variacoes`,
    [
      produto.id,
      String(linhaMapeada.sku ?? linhaMapeada.sku_interno ?? ''),
      linhaMapeada.tipo ?? 'INTERNO',
      linhaMapeada.status ?? 'ATIVO',
      JSON.stringify(linhaMapeada.dados ?? {}),
      linhaMapeada.sku_erp ?? null,
      linhaMapeada.sku_fornecedor ?? null,
      linhaMapeada.sku_marketplace ?? null,
      linhaMapeada.ean ?? null,
      linhaMapeada.codigo_fabricante ?? null,
      Boolean(linhaMapeada.principal),
      JSON.stringify(linhaMapeada.variacoes ?? {})
    ]
  );
}

async function processarLinhaComposicaoSqlServer(empresaId: number, linhaMapeada: Record<string, unknown>, usuarioId: number) {
  const conjunto = await localizarProdutoPorCodigo(empresaId, linhaMapeada.conjunto_codigo);
  if (!conjunto) throw new Error('Conjunto nao encontrado.');
  const componenteProduto = await localizarProdutoPorCodigo(empresaId, linhaMapeada.componente_codigo);
  let produtoComponenteId: number | null = null;

  if (!componenteProduto) {
    const componente = await consultarUm<{ id: number }>(
      `INSERT INTO produtos_componentes (empresa_id, codigo, nome, tipo_componente, status, atributos, criado_por_usuario_id)
      VALUES ($1, $2, $3, COALESCE($4, 'OUTRO'), 'ATIVO', '{}'::JSONB, $5)
      ON CONFLICT (empresa_id, codigo) DO UPDATE SET
        nome = EXCLUDED.nome,
        tipo_componente = EXCLUDED.tipo_componente
      RETURNING id`,
      [
        empresaId,
        String(linhaMapeada.componente_codigo ?? `COMP-${Date.now()}`),
        String(linhaMapeada.componente_nome ?? linhaMapeada.componente_codigo ?? 'Componente'),
        linhaMapeada.tipo_relacao ?? 'COMPONENTE',
        usuarioId
      ]
    );
    produtoComponenteId = componente?.id ?? null;
  }

  await consultar(
    `INSERT INTO produtos_componentes_vinculos (conjunto_produto_id, componente_produto_id, produto_componente_id, quantidade, tipo_relacao, ordem, obrigatorio, observacao)
    VALUES ($1, $2, $3, COALESCE($4, 1), COALESCE($5, 'COMPONENTE'), COALESCE($6, 0), COALESCE($7, TRUE), $8)
    ON CONFLICT DO NOTHING`,
    [
      conjunto.id,
      componenteProduto?.id ?? null,
      produtoComponenteId,
      linhaMapeada.quantidade ? Number(linhaMapeada.quantidade) : 1,
      linhaMapeada.tipo_relacao ?? 'COMPONENTE',
      linhaMapeada.ordem ? Number(linhaMapeada.ordem) : 0,
      linhaMapeada.obrigatorio === undefined ? true : Boolean(linhaMapeada.obrigatorio),
      linhaMapeada.observacao ?? null
    ]
  );
}

async function processarLinhaAtributoMarketplaceSqlServer(empresaId: number, linhaMapeada: Record<string, unknown>) {
  const canal = await consultarUm<{ id: number }>(
    `INSERT INTO canais (empresa_id, codigo, nome, tipo_canal, score_minimo_publicacao, ativo)
    VALUES ($1, $2, $3, 'MARKETPLACE', 80, TRUE)
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id`,
    [empresaId, String(linhaMapeada.canal_codigo ?? linhaMapeada.canal_nome ?? 'CANAL').toUpperCase(), String(linhaMapeada.canal_nome ?? linhaMapeada.canal_codigo ?? 'Canal')]
  );
  const atributo = await consultarUm<{ id: number }>(
    `INSERT INTO atributos (empresa_id, nome_interno, nome_exibido, codigo, tipo_campo, escopo, obrigatorio, ativo)
    VALUES ($1, $2, $3, $4, COALESCE($5, 'TEXTO'), COALESCE($6, 'CANAL'), COALESCE($7, FALSE), TRUE)
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET
      nome_exibido = EXCLUDED.nome_exibido,
      escopo = EXCLUDED.escopo,
      obrigatorio = EXCLUDED.obrigatorio
    RETURNING id`,
    [
      empresaId,
      String(linhaMapeada.atributo_codigo ?? linhaMapeada.atributo_nome ?? 'atributo').toLowerCase(),
      String(linhaMapeada.atributo_nome ?? linhaMapeada.atributo_codigo ?? 'Atributo'),
      String(linhaMapeada.atributo_codigo ?? linhaMapeada.atributo_nome ?? 'ATRIBUTO').toUpperCase(),
      linhaMapeada.tipo_campo ?? 'TEXTO',
      linhaMapeada.escopo ?? 'CANAL',
      Boolean(linhaMapeada.obrigatorio)
    ]
  );
  await salvarMapeamentoAtributoCanal(empresaId, {
    canal_id: canal?.id,
    atributo_id: atributo?.id,
    atributo_canal_codigo: linhaMapeada.atributo_canal_codigo ?? linhaMapeada.atributo_codigo,
    atributo_canal_nome: linhaMapeada.atributo_canal_nome ?? linhaMapeada.atributo_nome,
    obrigatorio: Boolean(linhaMapeada.obrigatorio),
    ordem: linhaMapeada.ordem ?? 0,
    validacao: linhaMapeada.validacao ?? null,
    ativo: true
  });
}

async function obterOuCriarAtributoCarga(empresaId: number, linhaMapeada: Record<string, unknown>, escopoPadrao: string) {
  return consultarUm<{ id: number }>(
    `INSERT INTO atributos (empresa_id, nome_interno, nome_exibido, codigo, tipo_campo, escopo, unidade_medida, obrigatorio, ordem_exibicao, ativo)
    VALUES ($1, $2, $3, $4, COALESCE($5, 'TEXTO'), COALESCE($6, $7), $8, COALESCE($9, FALSE), COALESCE($10, 0), TRUE)
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET
      nome_exibido = EXCLUDED.nome_exibido,
      tipo_campo = EXCLUDED.tipo_campo,
      escopo = EXCLUDED.escopo,
      unidade_medida = EXCLUDED.unidade_medida,
      obrigatorio = EXCLUDED.obrigatorio,
      ordem_exibicao = EXCLUDED.ordem_exibicao
    RETURNING id`,
    [
      empresaId,
      String(linhaMapeada.atributo_codigo ?? linhaMapeada.atributo_nome ?? 'atributo').toLowerCase(),
      String(linhaMapeada.atributo_nome ?? linhaMapeada.atributo_codigo ?? 'Atributo'),
      String(linhaMapeada.atributo_codigo ?? linhaMapeada.atributo_nome ?? 'ATRIBUTO').toUpperCase(),
      linhaMapeada.tipo_campo ?? 'TEXTO',
      linhaMapeada.escopo ?? escopoPadrao,
      escopoPadrao,
      linhaMapeada.unidade_medida ?? null,
      Boolean(linhaMapeada.obrigatorio),
      linhaMapeada.ordem ? Number(linhaMapeada.ordem) : 0
    ]
  );
}

async function gravarValorAtributoProduto(produtoId: number, atributoId: number, linhaMapeada: Record<string, unknown>) {
  await consultar(
    `INSERT INTO atributos_valores (produto_id, atributo_id, valor_texto, valor_numero, valor_booleano, valor_json, alterado_em)
    VALUES ($1, $2, $3, $4, $5, '{}'::JSONB, NOW())
    ON CONFLICT DO NOTHING`,
    [
      produtoId,
      atributoId,
      linhaMapeada.valor_texto ?? linhaMapeada.valor ?? null,
      linhaMapeada.valor_numero !== undefined && linhaMapeada.valor_numero !== null && linhaMapeada.valor_numero !== '' ? Number(linhaMapeada.valor_numero) : null,
      linhaMapeada.valor_booleano === undefined ? null : Boolean(linhaMapeada.valor_booleano)
    ]
  );
}

async function processarLinhaCaracteristicaConjuntoSqlServer(empresaId: number, linhaMapeada: Record<string, unknown>) {
  const conjunto = await localizarProdutoPorCodigo(empresaId, linhaMapeada.conjunto_codigo);
  if (!conjunto) throw new Error('Conjunto nao encontrado para gravar caracteristica.');
  const atributo = await obterOuCriarAtributoCarga(empresaId, linhaMapeada, 'CONJUNTO');
  if (!atributo) throw new Error('Atributo nao criado.');
  await gravarValorAtributoProduto(conjunto.id, atributo.id, linhaMapeada);
}

async function processarLinhaCaracteristicaItemSqlServer(empresaId: number, linhaMapeada: Record<string, unknown>, usuarioId: number) {
  await processarLinhaComposicaoSqlServer(empresaId, {
    conjunto_codigo: linhaMapeada.conjunto_codigo,
    componente_codigo: linhaMapeada.item_codigo,
    componente_nome: linhaMapeada.item_nome ?? linhaMapeada.item_codigo,
    tipo_relacao: linhaMapeada.tipo_relacao ?? 'MATERIA_PRIMA',
    quantidade: linhaMapeada.quantidade ?? 1,
    ordem: linhaMapeada.ordem ?? 0,
    obrigatorio: linhaMapeada.obrigatorio ?? true
  }, usuarioId);

  const itemProduto = await localizarProdutoPorCodigo(empresaId, linhaMapeada.item_codigo);
  const atributo = await obterOuCriarAtributoCarga(empresaId, linhaMapeada, 'COMPONENTE');
  if (itemProduto && atributo) {
    await gravarValorAtributoProduto(itemProduto.id, atributo.id, linhaMapeada);
  }
}

export async function executarCargaSqlServerPim(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const conexao = await buscarConexaoSqlServer(empresaId, Number(dados.conexao_id));
  if (!conexao) throw new Error('Conexao SQL Server nao encontrada.');

  const consultaSql = validarConsultaSqlServerLeitura(String(dados.consulta_sql ?? ''));
  const modo = String(dados.modo_carga ?? 'APENAS_VALIDAR');
  const tipoCarga = String(dados.tipo_carga ?? 'PRODUTO_MESTRE');
  const resultado = await executarConsultaSqlServer(conexao, consultaSql, Number(dados.limite ?? 500));
  const mapeamento = (dados.mapeamento ?? {}) as Record<string, unknown>;
  let produtosProcessados = 0;
  let produtosInseridos = 0;
  let produtosAtualizados = 0;
  let produtosComErro = 0;
  const logs: string[] = [];

  for (const linha of resultado.linhas) {
    const linhaMapeada = mapearLinhaSqlServerParaProduto(linha, mapeamento) as Record<string, unknown>;
    const produto = linhaMapeada as ProdutoCadastro;
    produto.status = 'RASCUNHO';
    produto.origem = 'SQL_SERVER_OFICIAL';
    produtosProcessados += 1;

    const existente = tipoCarga === 'PRODUTO_MESTRE' ? await localizarProdutoExistente(empresaId, produto) : null;
    if (modo === 'APENAS_VALIDAR') {
      logs.push(`${produto.sku_interno ?? produto.codigo_interno ?? produto.modelo ?? 'Produto'}: validado${existente ? ' com cadastro existente' : ' como novo cadastro'}.`);
      continue;
    }

    if (modo === 'CRIAR_NOVOS' && existente) {
      logs.push(`${produto.sku_interno ?? produto.codigo_interno ?? produto.modelo ?? 'Produto'}: ignorado, ja existe.`);
      continue;
    }

    if (modo === 'ATUALIZAR_EXISTENTES' && !existente) {
      logs.push(`${produto.sku_interno ?? produto.codigo_interno ?? produto.modelo ?? 'Produto'}: ignorado, nao encontrado para atualizacao.`);
      continue;
    }

    try {
      if (tipoCarga === 'SKU') {
        await processarLinhaSkuSqlServer(empresaId, linhaMapeada);
        produtosAtualizados += 1;
      } else if (tipoCarga === 'COMPOSICAO' || tipoCarga === 'PRODUTOS_CONJUNTO') {
        await processarLinhaComposicaoSqlServer(empresaId, linhaMapeada, usuarioId);
        produtosAtualizados += 1;
      } else if (tipoCarga === 'PRODUTOS_CJ_CARACTERISTICAS') {
        await processarLinhaCaracteristicaConjuntoSqlServer(empresaId, linhaMapeada);
        produtosAtualizados += 1;
      } else if (tipoCarga === 'PRODUTOS_ITEM_CARACTERISTICAS') {
        await processarLinhaCaracteristicaItemSqlServer(empresaId, linhaMapeada, usuarioId);
        produtosAtualizados += 1;
      } else if (tipoCarga === 'ATRIBUTOS_MARKETPLACE') {
        await processarLinhaAtributoMarketplaceSqlServer(empresaId, linhaMapeada);
        produtosAtualizados += 1;
      } else if (existente && modo === 'ATUALIZAR_EXISTENTES') {
        produto.id = existente.id;
        await salvarProduto(empresaId, produto, usuarioId);
        produtosAtualizados += 1;
      } else {
        await salvarProduto(empresaId, produto, usuarioId);
        produtosInseridos += 1;
      }
    } catch (error) {
      produtosComErro += 1;
      logs.push(`${produto.sku_interno ?? produto.codigo_interno ?? produto.modelo ?? 'Produto'}: ${error instanceof Error ? error.message : 'erro ao salvar'}.`);
    }
  }

  return consultarUm(
    `INSERT INTO pim_cargas_sqlserver (
      empresa_id, conexao_id, nome, tipo_carga, consulta_sql, modo_carga, status, colunas_detectadas, mapeamento, previa,
      total_linhas, produtos_processados, produtos_inseridos, produtos_atualizados, produtos_com_erro, logs,
      executado_em, criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'CONCLUIDA', $7::JSONB, $8::JSONB, $9::JSONB, $10, $11, $12, $13, $14, $15::JSONB, NOW(), $16)
    RETURNING *`,
    [
      empresaId,
      conexao.id,
      String(dados.nome ?? `Carga SQL Server ${new Date().toISOString()}`),
      tipoCarga,
      consultaSql,
      modo,
      JSON.stringify(resultado.colunas),
      JSON.stringify(mapeamento),
      JSON.stringify(resultado.linhas.slice(0, 20)),
      resultado.total,
      produtosProcessados,
      produtosInseridos,
      produtosAtualizados,
      produtosComErro,
      JSON.stringify(logs),
      usuarioId
    ]
  );
}

export async function listarCargasSqlServerPim(empresaId: number) {
  return consultar(
    `SELECT cs.*, c.nome AS conexao_nome
    FROM pim_cargas_sqlserver cs
    LEFT JOIN pim_conexoes_sqlserver c ON c.id = cs.conexao_id
    WHERE cs.empresa_id = $1
    ORDER BY cs.criado_em DESC
    LIMIT 100`,
    [empresaId]
  );
}

