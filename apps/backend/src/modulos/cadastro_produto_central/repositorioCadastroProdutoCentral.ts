import { consultar, consultarUm } from '../../banco/conexao.js';

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
  profundidade?: number | null;
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
    LIMIT 10000`,
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
      dados.profundidade ?? dados.comprimento ?? null,
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
  const asset = await consultarUm(
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

  const produtoIds = Array.isArray(dados.produto_ids) ? dados.produto_ids.map(Number).filter(Boolean) : [];
  if (asset?.id && produtoIds.length) {
    await vincularAssetsProdutos(empresaId, {
      asset_ids: [asset.id],
      produto_ids: produtoIds,
      tipo_vinculo: dados.tipo_vinculo ?? 'SECUNDARIA',
      principal: Boolean(dados.principal)
    }, usuarioId);
  }

  return asset;
}

export async function vincularAssetsProdutos(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const assetIds = Array.isArray(dados.asset_ids) ? dados.asset_ids.map(Number).filter(Boolean) : [];
  const produtoIdsDiretos = Array.isArray(dados.produto_ids) ? dados.produto_ids.map(Number).filter(Boolean) : [];
  const codigosErp = Array.isArray(dados.codigos_erp)
    ? dados.codigos_erp.map((item) => String(item).trim()).filter(Boolean)
    : String(dados.codigos_erp ?? '').split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
  const tipoVinculo = String(dados.tipo_vinculo ?? 'SECUNDARIA');
  const principal = Boolean(dados.principal);

  if (!assetIds.length) throw new Error('Selecione ao menos uma imagem ou documento.');
  const produtosPorCodigo = codigosErp.length
    ? await consultar<{ id: number }>(
      `SELECT id
      FROM produtos
      WHERE empresa_id = $1
        AND codigo_erp_decis = ANY($2::TEXT[])
        AND excluido = FALSE`,
      [empresaId, codigosErp]
    )
    : [];
  const produtoIds = Array.from(new Set([...produtoIdsDiretos, ...produtosPorCodigo.map((item) => Number(item.id))]));
  if (!produtoIds.length) throw new Error('Informe ao menos um produto/conjunto para vincular.');

  const assetsValidos = await consultar<{ id: number }>(
    `SELECT id FROM ativos_digitais WHERE empresa_id = $1 AND id = ANY($2::BIGINT[])`,
    [empresaId, assetIds]
  );
  const produtosValidos = await consultar<{ id: number }>(
    `SELECT id FROM produtos WHERE empresa_id = $1 AND id = ANY($2::BIGINT[]) AND excluido = FALSE`,
    [empresaId, produtoIds]
  );

  let vinculados = 0;
  for (const asset of assetsValidos) {
    for (const produto of produtosValidos) {
      if (principal) {
        await consultar(
          `UPDATE ativos_digitais_produtos_vinculos
          SET principal = FALSE
          WHERE produto_id = $1`,
          [produto.id]
        );
      }
      await consultar(
        `INSERT INTO ativos_digitais_produtos_vinculos (ativo_digital_id, produto_id, tipo_vinculo, ordem, principal)
        VALUES ($1, $2, $3, COALESCE($4, 0), $5)
        ON CONFLICT (ativo_digital_id, produto_id, tipo_vinculo) DO UPDATE SET
          ordem = EXCLUDED.ordem,
          principal = EXCLUDED.principal`,
        [asset.id, produto.id, tipoVinculo, dados.ordem ? Number(dados.ordem) : 0, principal]
      );
      vinculados += 1;
    }
  }

  await consultar(
    `INSERT INTO produtos_historico_campos (produto_id, empresa_id, campo, valor_anterior, valor_novo, origem, comentario, criado_por_usuario_id)
    SELECT id, $1, 'assets', NULL, $2, 'MANUAL', 'Vinculo de imagens/documentos em massa', $3
    FROM produtos
    WHERE id = ANY($4::BIGINT[])`,
    [empresaId, JSON.stringify({ asset_ids: assetIds, tipo_vinculo: tipoVinculo, principal }), usuarioId, produtoIds]
  );

  return { vinculados, assets: assetsValidos.length, produtos: produtosValidos.length };
}

export async function desvincularAssetProduto(empresaId: number, produtoId: number, assetId: number) {
  const removido = await consultarUm<{ id: number }>(
    `DELETE FROM ativos_digitais_produtos_vinculos apl
    USING produtos p, ativos_digitais a
    WHERE apl.produto_id = p.id
      AND apl.ativo_digital_id = a.id
      AND p.empresa_id = $1
      AND a.empresa_id = $1
      AND apl.produto_id = $2
      AND apl.ativo_digital_id = $3
    RETURNING apl.id`,
    [empresaId, produtoId, assetId]
  );

  return { removido: Boolean(removido) };
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

async function buscarConfiguracaoIa(empresaId: number) {
  const modulo = await buscarModuloCadastroProdutoCentral();
  if (!modulo) return null;
  return consultarUm<{ ativo: boolean; modelo_padrao: string; temperatura: number; limite_tokens: number; chave_openai?: string | null }>(
    `SELECT ativo, modelo_padrao, temperatura, limite_tokens, chave_openai
    FROM ia_configuracoes
    WHERE empresa_id = $1
      AND modulo_id = $2`,
    [empresaId, modulo.id]
  );
}

export async function testarIaCadastroProdutoCentral(empresaId: number, dados: Record<string, unknown>) {
  const configuracao = await buscarConfiguracaoIa(empresaId);
  const chave = String(dados.chave_openai ?? configuracao?.chave_openai ?? '').trim();
  const modelo = String(dados.modelo ?? dados.ia_modelo_padrao ?? configuracao?.modelo_padrao ?? 'gpt-4.1-mini');
  if (!chave) return { ok: false, mensagem: 'Informe a chave OpenAI ou salve a configuracao antes de testar.', modelo };

  const resposta = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(modelo)}`, {
    headers: { Authorization: `Bearer ${chave}` }
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    return { ok: false, modelo, mensagem: `Falha ao validar modelo/chave: HTTP ${resposta.status}`, detalhe: texto.slice(0, 500) };
  }

  const json = await resposta.json() as Record<string, unknown>;
  return { ok: true, modelo: json.id ?? modelo, mensagem: 'Conexao com OpenAI validada.' };
}

function montarComparacaoIa(produto: Record<string, unknown>, sugestao: Record<string, unknown>) {
  const campos = ['codigo_referencia', 'codigo_fabricante', 'nome_comercial', 'marca', 'modelo', 'categoria', 'ciclo', 'tensao', 'btu', 'tecnologia', 'garantia'];
  return campos.map((campo) => ({
    campo,
    valor_cadastro: produto[campo] ?? '',
    valor_ia: sugestao[campo] ?? '',
    valor_escolhido: produto[campo] ?? sugestao[campo] ?? '',
    diferente: String(produto[campo] ?? '') !== String(sugestao[campo] ?? '')
  }));
}

export async function compararProdutoComIa(empresaId: number, produtoId: number, dados: Record<string, unknown>, usuarioId: number) {
  const produto = await consultarUm<Record<string, unknown>>(
    `SELECT *
    FROM produtos
    WHERE id = $1
      AND empresa_id = $2
      AND excluido = FALSE`,
    [produtoId, empresaId]
  );
  if (!produto) throw new Error('Produto/conjunto nao encontrado.');

  const configuracao = await buscarConfiguracaoIa(empresaId);
  const chave = String(dados.chave_openai ?? configuracao?.chave_openai ?? '').trim();
  const modelo = String(dados.modelo ?? configuracao?.modelo_padrao ?? 'gpt-4.1-mini');
  const sitePrioritario = String(dados.site_prioritario ?? 'https://www.leveros.com.br/');
  const codigoReferencia = String(dados.codigo_referencia ?? dados.codigo_fabricante ?? produto.codigo_fabricante ?? produto.modelo ?? '').trim();
  const referencias = codigoReferencia.split('|').map((item) => item.trim()).filter(Boolean);
  if (!codigoReferencia) throw new Error('Informe a referencia da condensadora e evaporadora para comparar com dados enriquecidos.');

  if (!chave || configuracao?.ativo === false) {
    const sugestao = { codigo_referencia: codigoReferencia, referencias, fonte_prioritaria: sitePrioritario };
    return {
      configurado: false,
      modelo,
      site_prioritario: sitePrioritario,
      mensagem: 'IA nao configurada/ativa. Salve a chave OpenAI e ative a IA para consultar dados externos.',
      comparacao: montarComparacaoIa({ ...produto, codigo_referencia: codigoReferencia }, sugestao)
    };
  }

  const prompt = `Busque informacoes publicas de um conjunto de ar-condicionado no site ${sitePrioritario} priorizando a referencia composta do conjunto. Referencia composta: ${codigoReferencia}. Separe as referencias por pipe quando houver, considerando condensadora e evaporadora: ${referencias.join(' | ')}. Retorne somente JSON com campos codigo_referencia, referencias, nome_comercial, marca, modelo, categoria, ciclo, tensao, btu, tecnologia, garantia, fonte_url e observacoes.`;
  let sugestao: Record<string, unknown> = {};
  let bruto = '';
  try {
    const resposta = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelo,
        input: prompt,
        temperature: Number(configuracao?.temperatura ?? 0.2),
        max_output_tokens: Number(configuracao?.limite_tokens ?? 1200)
      })
    });
    bruto = await resposta.text();
    if (!resposta.ok) throw new Error(`OpenAI HTTP ${resposta.status}: ${bruto.slice(0, 400)}`);
    const json = JSON.parse(bruto) as any;
    const texto = json.output_text ?? json.output?.flatMap((item: any) => item.content ?? []).map((item: any) => item.text ?? '').join('\n') ?? '';
    bruto = texto || bruto;
    const match = bruto.match(/\{[\s\S]*\}/);
    sugestao = match ? JSON.parse(match[0]) : { observacoes: bruto };
  } catch (error) {
    sugestao = { codigo_referencia: codigoReferencia, referencias, observacoes: error instanceof Error ? error.message : 'Falha ao consultar IA.' };
  }

  await consultar(
    `INSERT INTO ia_sugestoes (produto_id, tipo_sugestao, entrada, sugestao, status, criado_por_usuario_id)
    VALUES ($1, 'ENRIQUECIMENTO_LEVEROS', $2::JSONB, $3::JSONB, 'GERADA', $4)`,
    [produtoId, JSON.stringify({ codigo_referencia: codigoReferencia, referencias, site_prioritario: sitePrioritario, modelo }), JSON.stringify({ sugestao, bruto }), usuarioId]
  );

  return {
    configurado: true,
    modelo,
    site_prioritario: sitePrioritario,
    sugestao,
    comparacao: montarComparacaoIa({ ...produto, codigo_referencia: codigoReferencia }, sugestao)
  };
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
  if (!/^(SELECT|WITH|EXEC|EXECUTE)\s/i.test(sql)) {
    throw new Error('A consulta SQL Server deve iniciar com SELECT, WITH, EXEC ou EXECUTE.');
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|MERGE|CREATE|GRANT|REVOKE)\b/i.test(sql)) {
    throw new Error('A consulta SQL Server contem comando nao permitido para carga manual.');
  }
  return sql;
}

function prepararConsultaSqlServerComParametros(request: any, consultaSql: string, parametros: Record<string, unknown> = {}) {
  const nomes = new Set<string>();
  const sql = consultaSql.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_texto, nome) => {
    nomes.add(nome);
    return `@${nome}`;
  });

  for (const nome of nomes) {
    const valor = parametros[nome] ?? parametros[nome.toUpperCase()] ?? parametros[nome.toLowerCase()] ?? null;
    request.input(nome, valor);
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

async function executarConsultaSqlServer(conexao: ConexaoSqlServerPim, consultaSql: string, limite = 500, parametros: Record<string, unknown> = {}) {
  let mssql: any;
  try {
    mssql = await import('mssql');
  } catch {
    throw new Error('Driver SQL Server nao instalado. Execute npm install no backend.');
  }

  const sqlDriver = mssql.default ?? mssql;
  const pool = new sqlDriver.ConnectionPool({
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
    const request = pool.request();
    const sqlPreparado = prepararConsultaSqlServerComParametros(request, validarConsultaSqlServerLeitura(consultaSql), parametros);
    const resultado = await request.query(sqlPreparado);
    const todasLinhas = resultado.recordset ?? [];
    const linhas = limite > 0 ? todasLinhas.slice(0, limite) : todasLinhas;
    const colunas = Object.keys(linhas[0] ?? {});
    return { colunas, linhas, total: todasLinhas.length };
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

export async function listarConsultasSqlServerPim(empresaId: number) {
  return consultar(
    `SELECT q.*, c.nome AS conexao_nome
    FROM pim_consultas_sqlserver q
    LEFT JOIN pim_conexoes_sqlserver c ON c.id = q.conexao_id
    WHERE q.empresa_id = $1
      AND q.ativo = TRUE
    ORDER BY q.tipo_carga ASC, q.nome ASC`,
    [empresaId]
  );
}

export async function salvarConsultaSqlServerPim(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const consultaSql = validarConsultaSqlServerLeitura(String(dados.consulta_sql ?? ''));
  const nome = String(dados.nome ?? '').trim();
  if (!nome) throw new Error('Informe um nome para salvar a consulta.');

  const existente = await consultarUm<{ id: number }>(
    `SELECT id
    FROM pim_consultas_sqlserver
    WHERE empresa_id = $1
      AND nome = $2
    ORDER BY ativo DESC, alterado_em DESC NULLS LAST, criado_em DESC
    LIMIT 1`,
    [empresaId, nome]
  );

  const parametros = [
    empresaId,
    dados.conexao_id ? Number(dados.conexao_id) : null,
    nome,
    dados.descricao ?? null,
    String(dados.tipo_carga ?? 'PRODUTO_MESTRE'),
    consultaSql,
    String(dados.modo_carga_padrao ?? dados.modo_carga ?? 'APENAS_VALIDAR'),
    JSON.stringify(dados.mapeamento ?? {}),
    JSON.stringify(dados.colunas_detectadas ?? []),
    JSON.stringify(dados.parametros ?? []),
    usuarioId
  ];

  if (existente?.id) {
    return consultarUm(
      `UPDATE pim_consultas_sqlserver
      SET conexao_id = $2,
      descricao = $4,
      tipo_carga = $5,
      consulta_sql = $6,
      modo_carga_padrao = $7,
      mapeamento = $8::JSONB,
      colunas_detectadas = $9::JSONB,
      parametros = $10::JSONB,
      ativo = TRUE,
      alterado_em = NOW()
      WHERE id = $12
        AND empresa_id = $1
      RETURNING *`,
      [...parametros, existente.id]
    );
  }

  return consultarUm(
    `INSERT INTO pim_consultas_sqlserver (
      empresa_id, conexao_id, nome, descricao, tipo_carga, consulta_sql, modo_carga_padrao,
      mapeamento, colunas_detectadas, parametros, ativo, alterado_em, criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::JSONB, $9::JSONB, $10::JSONB, TRUE, NOW(), $11)
    RETURNING *`,
    parametros
  );
}

export async function excluirConsultaSqlServerPim(empresaId: number, id: number) {
  return consultarUm(
    `UPDATE pim_consultas_sqlserver
    SET ativo = FALSE,
      alterado_em = NOW()
    WHERE id = $1
      AND empresa_id = $2
    RETURNING *`,
    [id, empresaId]
  );
}

export async function consultarSqlServerPim(empresaId: number, dados: Record<string, unknown>) {
  const conexao = await buscarConexaoSqlServer(empresaId, Number(dados.conexao_id));
  if (!conexao) throw new Error('Conexao SQL Server nao encontrada.');
  const resultado = await executarConsultaSqlServer(
    conexao,
    String(dados.consulta_sql ?? ''),
    Number(dados.limite ?? 100),
    (dados.parametros_valores ?? {}) as Record<string, unknown>
  );
  return {
    colunas: resultado.colunas,
    previa: resultado.linhas.slice(0, 20),
    total_linhas: resultado.total
  };
}

function mapearLinhaSqlServerParaProduto(linha: Record<string, unknown>, mapeamento: Record<string, unknown>) {
  const produto = Object.entries(mapeamento).reduce<ProdutoCadastro>((acc, [colunaOrigem, campoDestino]) => {
    if (!campoDestino) return acc;
    const campo = String(campoDestino);
    const valor = linha[colunaOrigem];
    if (valor === undefined || valor === null || valor === '') return acc;
    if (campo.startsWith('ATRIBUTO::')) {
      const atual = Array.isArray((acc as any).__atributos_dinamicos) ? (acc as any).__atributos_dinamicos : [];
      return {
        ...acc,
        __atributos_dinamicos: [
          ...atual,
          { atributo_id: Number(campo.replace('ATRIBUTO::', '')), valor, coluna_origem: colunaOrigem }
        ]
      } as ProdutoCadastro;
    }
    if (campo.startsWith('ATRIBUTO_AUTO::')) {
      const [, codigo, nome, escopo, tipo] = campo.split('::');
      const atual = Array.isArray((acc as any).__atributos_dinamicos) ? (acc as any).__atributos_dinamicos : [];
      return {
        ...acc,
        __atributos_dinamicos: [
          ...atual,
          {
            atributo_codigo: codigo,
            atributo_nome: nome,
            escopo: escopo || 'PRODUTO',
            tipo_campo: tipo || 'TEXTO',
            valor,
            coluna_origem: colunaOrigem
          }
        ]
      } as ProdutoCadastro;
    }
    if (campo.startsWith('GRUPO::')) {
      const [, grupo, nomeCampo] = campo.split('::');
      const fiscalComercialAtual = { ...((acc as any).fiscal_comercial ?? {}) };
      const grupoAtual = { ...((fiscalComercialAtual as any)[grupo] ?? {}) };
      return {
        ...acc,
        fiscal_comercial: {
          ...fiscalComercialAtual,
          [grupo]: {
            ...grupoAtual,
            [nomeCampo]: valor
          }
        }
      } as ProdutoCadastro;
    }
    if (campo === 'profundidade') {
      return { ...acc, profundidade: valor, comprimento: valor } as ProdutoCadastro;
    }
    return { ...acc, [campo]: campo === 'tipo_produto' ? normalizarTipoClimatizacao(valor) : valor } as ProdutoCadastro;
  }, {});

  const comerciais: Record<string, string> = {
    preco: 'preco_venda_padrao',
    preco_promocional: 'preco_promocional',
    venda_avista: 'preco_venda_avista',
    venda_padrao: 'preco_venda_padrao',
    venda_cartao: 'preco_venda_cartao',
    estoque: 'estoque_disponivel',
    estoque_disponivel: 'estoque_disponivel',
    estoque_fisico: 'estoque_fisico',
    estoque_reservado: 'estoque_reservado',
    custo_fabrica: 'custo_fabrica',
    custo_fabrica_uso: 'custo_fabrica_uso',
    acrescimo_avista: 'acrescimo_avista',
    acrescimo: 'acrescimo'
  };

  const fiscalComercial = { ...((produto as any).fiscal_comercial ?? {}) };
  for (const [campo, destino] of Object.entries(comerciais)) {
    if ((produto as any)[campo] !== undefined) {
      fiscalComercial[destino] = (produto as any)[campo];
      delete (produto as any)[campo];
    }
  }
  if (Object.keys(fiscalComercial).length) {
    (produto as any).fiscal_comercial = fiscalComercial;
  }

  return produto;
}

function normalizarTipoClimatizacao(valor: unknown) {
  const texto = String(valor ?? '').trim();
  const normalizado = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  const aliases: Record<string, string> = {
    HI_WALL: 'SPLIT_HI_WALL',
    HW: 'SPLIT_HI_WALL',
    SPLIT: 'SPLIT_HI_WALL',
    SPLIT_HIWALL: 'SPLIT_HI_WALL',
    SPLIT_HI_WALL: 'SPLIT_HI_WALL',
    PISO_TETO: 'PISO_TETO',
    PT: 'PISO_TETO',
    CASSETE: 'CASSETE_4_VIAS',
    K7: 'CASSETE_4_VIAS',
    CASSETE_1_VIA: 'CASSETE_1_VIA',
    CASSETE_2_VIAS: 'CASSETE_2_VIAS',
    CASSETE_4_VIAS: 'CASSETE_4_VIAS',
    CASSETE_COMPACTO: 'CASSETE_COMPACTO',
    DUTADO: 'DUTADO',
    DUTO: 'DUTADO',
    BUILT_IN: 'DUTADO',
    SPLITAO: 'DUTADO',
    MULTI_SPLIT: 'MULTI_SPLIT',
    VRF: 'VRF',
    CHILLER: 'CHILLER',
    FAN_COIL: 'FAN_COIL',
    FANCOIL: 'FAN_COIL',
    UTA: 'UTA',
    SELF: 'UTA',
    JANELA: 'JANELA',
    PORTATIL: 'PORTATIL',
    EVAPORADORA: 'EVAPORADORA',
    CONDENSADORA: 'CONDENSADORA',
    CONTROLE: 'CONTROLE_REMOTO',
    CONTROLE_REMOTO: 'CONTROLE_REMOTO',
    KIT: 'KIT_INSTALACAO',
    KITS: 'KIT_INSTALACAO',
    KIT_S: 'KIT_INSTALACAO',
    KIT_INSTALACAO: 'KIT_INSTALACAO',
    ACESSORIO: 'ACESSORIO',
    PAINEL: 'ACESSORIO',
    MODULO_TROCADOR: 'ACESSORIO',
    COMPRESSOR: 'COMPRESSOR',
    VENTILADOR: 'VENTILADOR',
    MODULO_VENTILADOR: 'VENTILADOR',
    MOTOR: 'MOTOR',
    PLACA: 'PLACA_ELETRONICA',
    PLACA_ELETRONICA: 'PLACA_ELETRONICA',
    SENSOR: 'SENSOR',
    VALVULA: 'VALVULA',
    FILTRO: 'FILTRO',
    MODULO_WIFI: 'MODULO_WIFI'
  };
  return aliases[normalizado] ?? normalizado;
}

async function gravarAtributosDinamicosCarga(empresaId: number, produtoId: number, linhaMapeada: Record<string, unknown>) {
  const atributos = Array.isArray((linhaMapeada as any).__atributos_dinamicos) ? (linhaMapeada as any).__atributos_dinamicos : [];
  for (const item of atributos) {
    let atributo = null as { id: number; tipo_campo: string | null } | null;
    const atributoId = Number(item.atributo_id);
    if (atributoId) {
      atributo = await consultarUm<{ id: number; tipo_campo: string | null }>(
        `SELECT id, tipo_campo
        FROM atributos
        WHERE id = $1
          AND empresa_id = $2
          AND ativo = TRUE`,
        [atributoId, empresaId]
      );
    } else if (item.atributo_codigo) {
      const criado = await obterOuCriarAtributoCarga(empresaId, {
        atributo_codigo: item.atributo_codigo,
        atributo_nome: item.atributo_nome ?? item.atributo_codigo,
        escopo: item.escopo ?? 'PRODUTO',
        tipo_campo: item.tipo_campo ?? 'TEXTO'
      }, String(item.escopo ?? 'PRODUTO'));
      atributo = criado ? { id: criado.id, tipo_campo: String(item.tipo_campo ?? 'TEXTO') } : null;
    }
    if (!atributo) continue;
    const valor = item.valor;
    const tipo = String(atributo.tipo_campo ?? '').toUpperCase();
    const numero = ['NUMERO', 'DECIMAL'].includes(tipo) && valor !== '' && valor !== null && valor !== undefined ? Number(String(valor).replace(',', '.')) : null;
    await gravarValorAtributoProduto(produtoId, atributo.id, {
      valor_texto: numero === null ? valor : null,
      valor_numero: Number.isFinite(numero as number) ? numero : null,
      valor_booleano: tipo === 'BOOLEANO' ? ['S', 'SIM', 'TRUE', '1'].includes(String(valor).toUpperCase()) : null
    });
  }
}

const ATRIBUTOS_TECNICOS_CARGA: Record<string, { nome: string; unidade?: string; tipo?: string }> = {
  ciclo: { nome: 'Ciclo' },
  tensao: { nome: 'Tensao', unidade: 'V' },
  tipo_capacidade: { nome: 'Tipo de capacidade' },
  btu: { nome: 'BTU', unidade: 'BTU/h', tipo: 'NUMERO' },
  tecnologia: { nome: 'Tecnologia' }
};

async function gravarAtributosTecnicosProdutoMestre(empresaId: number, produtoId: number, linhaMapeada: Record<string, unknown>) {
  for (const [campo, config] of Object.entries(ATRIBUTOS_TECNICOS_CARGA)) {
    const valor = linhaMapeada[campo];
    if (valor === undefined || valor === null || valor === '') continue;
    const atributo = await obterOuCriarAtributoCarga(empresaId, {
      atributo_codigo: campo.toUpperCase(),
      atributo_nome: config.nome,
      tipo_campo: config.tipo ?? 'TEXTO',
      escopo: 'PRODUTO',
      unidade_medida: config.unidade ?? null,
      valor_texto: valor,
      valor_numero: config.tipo === 'NUMERO' ? valor : null
    }, 'PRODUTO');
    if (atributo) {
      await gravarValorAtributoProduto(produtoId, atributo.id, {
        valor_texto: config.tipo === 'NUMERO' ? null : valor,
        valor_numero: config.tipo === 'NUMERO' ? valor : null,
        unidade_medida: config.unidade ?? null
      });
    }
  }
}

async function localizarProdutoPorCodigoErp(empresaId: number, codigoErp: unknown) {
  const codigo = String(codigoErp ?? '').trim();
  if (!codigo) return null;
  return consultarUm<{ id: number; codigo_interno: string | null }>(
    `SELECT id, codigo_interno
    FROM produtos
    WHERE empresa_id = $1
      AND excluido = FALSE
      AND codigo_erp_decis = $2
    ORDER BY alterado_em DESC NULLS LAST, criado_em DESC
    LIMIT 1`,
    [empresaId, codigo]
  );
}

async function localizarProdutoExistente(empresaId: number, produto: ProdutoCadastro) {
  return consultarUm<{ id: number; codigo_interno: string | null }>(
    `SELECT id, codigo_interno
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
  const codigoProduto = linhaMapeada.item_codigo ?? linhaMapeada.componente_codigo ?? linhaMapeada.produto_codigo;
  const componenteProduto = await localizarProdutoPorCodigo(empresaId, codigoProduto);
  let produtoComponenteId: number | null = null;

  if (!componenteProduto) {
    throw new Error(`Produto materia prima nao encontrado para vinculo: ${String(codigoProduto ?? '')}. Importe os produtos antes dos conjuntos/vinculos.`);
  }

  await consultar(
    `INSERT INTO produtos_componentes_vinculos (conjunto_produto_id, componente_produto_id, produto_componente_id, quantidade, tipo_relacao, ordem, obrigatorio, observacao)
    VALUES ($1, $2, $3, COALESCE($4, 1), COALESCE($5, 'COMPONENTE'), COALESCE($6, 0), COALESCE($7, TRUE), $8)
    ON CONFLICT DO NOTHING`,
    [
      conjunto.id,
      componenteProduto.id,
      produtoComponenteId,
      linhaMapeada.quantidade ? Number(linhaMapeada.quantidade) : 1,
      linhaMapeada.tipo_relacao ?? 'COMPONENTE',
      linhaMapeada.ordem ? Number(linhaMapeada.ordem) : 0,
      linhaMapeada.obrigatorio === undefined ? true : Boolean(linhaMapeada.obrigatorio),
      linhaMapeada.observacao ?? null
    ]
  );

  await recalcularAtributosNumericosConjunto(empresaId, conjunto.id);
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
  const itemProduto = await localizarProdutoPorCodigo(empresaId, linhaMapeada.item_codigo);
  if (!itemProduto) throw new Error(`Produto materia prima nao encontrado para caracteristica: ${String(linhaMapeada.item_codigo ?? '')}.`);
  const atributo = await obterOuCriarAtributoCarga(empresaId, linhaMapeada, 'COMPONENTE');
  if (itemProduto && atributo) {
    await gravarValorAtributoProduto(itemProduto.id, atributo.id, linhaMapeada);
  }
}

async function recalcularAtributoNumericoConjunto(empresaId: number, conjuntoCodigo: string, atributoId: number) {
  if (!conjuntoCodigo || !atributoId) return;
  const conjunto = await localizarProdutoPorCodigo(empresaId, conjuntoCodigo);
  if (!conjunto) return;
  const soma = await consultarUm<{ total: number | null }>(
    `SELECT SUM(COALESCE(av.valor_numero, 0) * COALESCE(pcv.quantidade, 1)) AS total
    FROM produtos_componentes_vinculos pcv
    INNER JOIN produtos p ON p.id = pcv.componente_produto_id
    INNER JOIN atributos_valores av ON av.produto_id = p.id
    WHERE pcv.conjunto_produto_id = $1
      AND av.atributo_id = $2
      AND p.empresa_id = $3
      AND av.valor_numero IS NOT NULL`,
    [conjunto.id, atributoId, empresaId]
  );
  if (soma?.total === null || soma?.total === undefined) return;
  await consultar(
    `DELETE FROM atributos_valores
    WHERE produto_id = $1
      AND atributo_id = $2
      AND valor_json->>'origem' = 'SOMA_PRODUTOS_CONJUNTO'`,
    [conjunto.id, atributoId]
  );
  await consultar(
    `INSERT INTO atributos_valores (produto_id, atributo_id, valor_texto, valor_numero, valor_booleano, valor_json, alterado_em)
    VALUES ($1, $2, NULL, $3, NULL, $4::JSONB, NOW())`,
    [conjunto.id, atributoId, Number(soma.total), JSON.stringify({ origem: 'SOMA_PRODUTOS_CONJUNTO' })]
  );
}

async function recalcularAtributosNumericosConjunto(empresaId: number, conjuntoId: number) {
  const atributos = await consultar<{ atributo_id: number }>(
    `SELECT DISTINCT av.atributo_id
    FROM produtos_componentes_vinculos pcv
    INNER JOIN produtos p ON p.id = pcv.componente_produto_id
    INNER JOIN atributos_valores av ON av.produto_id = p.id
    WHERE pcv.conjunto_produto_id = $1
      AND p.empresa_id = $2
      AND av.valor_numero IS NOT NULL`,
    [conjuntoId, empresaId]
  );
  const conjunto = await consultarUm<{ codigo_erp_decis: string | null; codigo_interno: string | null }>(
    `SELECT codigo_erp_decis, codigo_interno FROM produtos WHERE id = $1 AND empresa_id = $2`,
    [conjuntoId, empresaId]
  );
  const codigo = conjunto?.codigo_erp_decis ?? conjunto?.codigo_interno;
  for (const atributo of atributos) {
    await recalcularAtributoNumericoConjunto(empresaId, String(codigo ?? ''), atributo.atributo_id);
  }
}

function aplicarTipoProdutoPorCarga(produto: ProdutoCadastro, tipoCarga: string) {
  if (tipoCarga === 'PRODUTOS_BASE' && !produto.tipo_produto) {
    produto.tipo_produto = 'EVAPORADORA';
  }
  if (tipoCarga === 'CONJUNTOS' && !produto.tipo_produto) {
    produto.tipo_produto = 'SPLIT_HI_WALL';
  }
}

export async function executarCargaSqlServerPim(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const conexao = await buscarConexaoSqlServer(empresaId, Number(dados.conexao_id));
  if (!conexao) throw new Error('Conexao SQL Server nao encontrada.');

  const consultaSql = validarConsultaSqlServerLeitura(String(dados.consulta_sql ?? ''));
  const modo = String(dados.modo_carga ?? 'APENAS_VALIDAR');
  const tipoCarga = String(dados.tipo_carga ?? 'PRODUTO_MESTRE');
  const resultado = await executarConsultaSqlServer(
    conexao,
    consultaSql,
    Number(dados.limite ?? 500),
    (dados.parametros_valores ?? {}) as Record<string, unknown>
  );
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
    aplicarTipoProdutoPorCarga(produto, tipoCarga);
    produtosProcessados += 1;

    const tipoCadastroProduto = ['PRODUTO_MESTRE', 'PRODUTOS_BASE', 'CONJUNTOS'].includes(tipoCarga);
    const existente = tipoCadastroProduto
      ? (modo === 'INSERIR_OU_ATUALIZAR_ERP'
        ? await localizarProdutoPorCodigoErp(empresaId, produto.codigo_erp_decis)
        : await localizarProdutoExistente(empresaId, produto))
      : null;
    if (modo === 'APENAS_VALIDAR') {
      logs.push(`${produto.sku_interno ?? produto.codigo_interno ?? produto.modelo ?? 'Produto'}: validado${existente ? ' com cadastro existente' : ' como novo cadastro'}.`);
      continue;
    }

    if (modo === 'INSERIR_OU_ATUALIZAR_ERP' && !produto.codigo_erp_decis) {
      produtosComErro += 1;
      logs.push(`${produto.sku_interno ?? produto.codigo_interno ?? produto.modelo ?? 'Produto'}: codigo_erp_decis obrigatorio para inserir/atualizar por ERP.`);
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
      } else if (tipoCadastroProduto && existente && (modo === 'ATUALIZAR_EXISTENTES' || modo === 'INSERIR_OU_ATUALIZAR_ERP')) {
        produto.id = existente.id;
        produto.codigo_interno = existente.codigo_interno ?? produto.codigo_interno;
        const salvo = await salvarProduto(empresaId, produto, usuarioId);
        if (salvo?.id) {
          await gravarAtributosTecnicosProdutoMestre(empresaId, Number(salvo.id), linhaMapeada);
          await gravarAtributosDinamicosCarga(empresaId, Number(salvo.id), linhaMapeada);
        }
        produtosAtualizados += 1;
      } else if (tipoCadastroProduto) {
        const salvo = await salvarProduto(empresaId, produto, usuarioId);
        if (salvo?.id) {
          await gravarAtributosTecnicosProdutoMestre(empresaId, Number(salvo.id), linhaMapeada);
          await gravarAtributosDinamicosCarga(empresaId, Number(salvo.id), linhaMapeada);
        }
        produtosInseridos += 1;
      } else {
        logs.push('Tipo de carga nao processado para esta linha.');
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

