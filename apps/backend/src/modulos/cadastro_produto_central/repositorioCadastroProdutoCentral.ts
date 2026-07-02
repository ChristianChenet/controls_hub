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
      dados.atributo_grupo_id ? Number(dados.atributo_grupo_id) : null,
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
  return consultarUm(
    `INSERT INTO importacoes (empresa_id, nome_arquivo, tipo_arquivo, modo_importacao, status, total_linhas, relatorio, criado_por_usuario_id)
    VALUES ($1, $2, $3, COALESCE($4, 'APENAS_VALIDAR'), 'RASCUNHO', COALESCE($5, 0), COALESCE($6, '{}'::JSONB), $7)
    RETURNING *`,
    [
      empresaId,
      String(dados.nome_arquivo ?? 'importacao.csv'),
      String(dados.tipo_arquivo ?? 'CSV'),
      dados.modo_importacao ?? 'APENAS_VALIDAR',
      dados.total_linhas ? Number(dados.total_linhas) : 0,
      JSON.stringify(dados.relatorio ?? { observacao: 'Estrutura preparada. Importacao real entrara como rascunho.' }),
      usuarioId
    ]
  );
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

