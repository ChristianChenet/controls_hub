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
  modelo_alfa_numerico?: string | null;
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

function normalizarChaveModeloAlfaNumerico(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function partesChaveModeloAlfaNumerico(valor: unknown) {
  return String(valor ?? '')
    .split(/[|;,/\\\n]+/)
    .map(normalizarChaveModeloAlfaNumerico)
    .filter(Boolean);
}

function compararChavesModeloAlfaNumerico(chaveCadastro: unknown, chaveOrigem: unknown) {
  const partesCadastro = partesChaveModeloAlfaNumerico(chaveCadastro);
  const partesOrigem = partesChaveModeloAlfaNumerico(chaveOrigem);
  const restantes = [...partesOrigem];
  let correspondencias = 0;
  for (const parte of partesCadastro) {
    const indice = restantes.indexOf(parte);
    if (indice >= 0) {
      correspondencias += 1;
      restantes.splice(indice, 1);
    }
  }
  const total = Math.max(partesCadastro.length, partesOrigem.length);
  return {
    chave_cadastro_normalizada: partesCadastro.join('|'),
    chave_origem_normalizada: partesOrigem.join('|'),
    correspondencias,
    total,
    percentual: total ? Math.round((correspondencias / total) * 100) : 0,
    exata: total > 0 && correspondencias === total && partesCadastro.length === partesOrigem.length
  };
}

function equivalentesModeloClimatizacao(codigo: string) {
  const normalizado = normalizarChaveModeloAlfaNumerico(codigo);
  const match = normalizado.match(/^(\d{2}EZVC)([AB])(\d{2}M\d)$/);
  if (!match) return [];
  const alternativa = match[2] === 'A' ? 'B' : 'A';
  return [`${match[1]}${alternativa}${match[3]}`];
}

function permiteEquivalenciaModelo(contexto?: Record<string, unknown>) {
  return String(contexto?._fonte_codigo ?? '').toUpperCase() === 'LEVEROS';
}

function contextoConfirmaEquivalencia(textoBusca: string, textoNormalizado: string, contexto?: Record<string, unknown>) {
  const marcaContexto = normalizarTextoModeloBusca(contexto?.marca);
  const marcaMidea = marcaContexto.includes('MIDEA') || textoBusca.includes('MIDEA');
  const btu = extrairBtuTexto(contexto?.nome_comercial ?? contexto?.descricao_interna ?? contexto?.descricao ?? contexto?.capacidade ?? contexto?.btu);
  const btuConfere = !btu || textoNormalizado.includes(btu);
  return marcaMidea && btuConfere && /\bHW\b/.test(textoBusca);
}

function contextoConfirmaMatchParcial(textoBusca: string, textoNormalizado: string, contexto?: Record<string, unknown>) {
  const marcaContexto = normalizarTextoModeloBusca(contexto?.marca);
  const marcaPrincipal = marcaContexto.split(/\s+/).find((parte) => parte.length >= 4) ?? '';
  const marcaConfere = !marcaPrincipal || textoBusca.includes(marcaPrincipal);
  const btu = extrairBtuTexto(contexto?.nome_comercial ?? contexto?.descricao_interna ?? contexto?.descricao ?? contexto?.capacidade ?? contexto?.btu);
  const btuConfere = !btu || textoNormalizado.includes(btu);
  const parecePecaAvulsa = /\b(PLACA|SERPENTINA|MOTOR|COMPRESSOR|SENSOR|VALVULA|VÁLVULA|FILTRO|TURBINA|VENTILADOR|CONTROLE\s+REMOTO|PECA|PEÇA|REPOSICAO|REPOSIÇÃO|ORIGINAL)\b/.test(textoBusca)
    && !/\b(AR\s*CONDICIONADO\s*SPLIT|SPLIT\s*HI\s*WALL|SPLIT\s*HW)\b/.test(textoBusca);
  return { marcaConfere, btuConfere, peca_avulsa: parecePecaAvulsa, valido: marcaConfere && btuConfere && !parecePecaAvulsa };
}

function encontrarCodigosModelo(textoNormalizado: string, codigos: string[], contexto?: Record<string, unknown>) {
  const codigosEncontrados: string[] = [];
  const codigosEquivalentes: Record<string, string> = {};
  const permitirEquivalencia = permiteEquivalenciaModelo(contexto);
  for (const codigo of codigos) {
    if (textoNormalizado.includes(codigo)) {
      codigosEncontrados.push(codigo);
      continue;
    }
    if (!permitirEquivalencia) continue;
    const equivalente = equivalentesModeloClimatizacao(codigo).find((item) => textoNormalizado.includes(item));
    if (equivalente) {
      codigosEncontrados.push(codigo);
      codigosEquivalentes[codigo] = equivalente;
    }
  }
  return { codigosEncontrados, codigosEquivalentes };
}

function valoresModeloParaValidacao(dados: Record<string, unknown> = {}, extras: unknown[] = []) {
  const chaves = [
    'MODELO',
    'MODELO_ALFA_NUMERICO',
    'CODIGO_FABRICANTE',
    'CODIGO_MODELO',
    'CODIGO_MODELO_CONDENSADORA',
    'CODIGO_MODELO_EVAPORADORA',
    'MODELO_CONDENSADORA',
    'MODELO_EVAPORADORA',
    'CODIGO_DA_CONDENSADORA',
    'CODIGO_DA_EVAPORADORA',
    'CODIGO_CONDENSADORA',
    'CODIGO_EVAPORADORA',
    'NOME_DO_MODELO_CONDENSADORA',
    'NOME_DO_MODELO_EVAPORADORA',
    'MPN',
    'REFERENCIA',
    'REF',
    'SKU'
  ];
  return [...extras, ...chaves.map((chave) => dados[chave])].filter(Boolean).join(' | ');
}

function compararChavesModeloAlfaNumericoValidado(chaveCadastro: unknown, chaveOrigem: unknown, contexto?: Record<string, unknown>) {
  const partesCadastro = partesChaveModeloAlfaNumerico(chaveCadastro).map(normalizarChaveModeloAlfaNumerico).filter(Boolean);
  const textoOrigemNormalizado = normalizarChaveModeloAlfaNumerico(chaveOrigem);
  const textoOrigemBusca = normalizarTextoModeloBusca(chaveOrigem);
  const usarEquivalencia = contextoConfirmaEquivalencia(textoOrigemBusca, textoOrigemNormalizado, contexto) ? contexto : undefined;
  const encontrados = encontrarCodigosModelo(textoOrigemNormalizado, partesCadastro, usarEquivalencia);
  const total = partesCadastro.length;
  const validacaoParcial = contextoConfirmaMatchParcial(textoOrigemBusca, textoOrigemNormalizado, contexto);
  if (validacaoParcial.peca_avulsa) {
    return {
      chave_cadastro_normalizada: partesCadastro.join('|'),
      chave_origem_normalizada: partesChaveModeloAlfaNumerico(chaveOrigem).join('|'),
      correspondencias: 0,
      total,
      percentual: 0,
      exata: false,
      codigos_encontrados: [],
      codigos_equivalentes: {},
      marca_confere: validacaoParcial.marcaConfere,
      btu_confere: validacaoParcial.btuConfere
    };
  }
  const parcial = encontrados.codigosEncontrados.length > 0 && encontrados.codigosEncontrados.length < total;
  const correspondencias = parcial && !validacaoParcial.valido ? 0 : encontrados.codigosEncontrados.length;
  return {
    chave_cadastro_normalizada: partesCadastro.join('|'),
    chave_origem_normalizada: partesChaveModeloAlfaNumerico(chaveOrigem).join('|'),
    correspondencias,
    total,
    percentual: total ? Math.round((correspondencias / total) * 100) : 0,
    exata: total > 0 && correspondencias === total && Object.keys(encontrados.codigosEquivalentes).length === 0,
    codigos_encontrados: correspondencias ? encontrados.codigosEncontrados : [],
    codigos_equivalentes: correspondencias ? encontrados.codigosEquivalentes : {},
    marca_confere: validacaoParcial.marcaConfere,
    btu_confere: validacaoParcial.btuConfere
  };
}

function extrairBtuTexto(valor: unknown) {
  const texto = String(valor ?? '').toUpperCase();
  const match = texto.match(/(\d{1,3}(?:[.,]\d{3})|\d{4,6})\s*(?:BTU|BTUS|BTU\/H)/i);
  if (!match) return '';
  return match[1].replace(/[^\d]/g, '').replace(/^0+/, '') || '0';
}

function normalizarTextoModeloBusca(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function gerarConsultasModeloAlfaNumerico(chave: unknown) {
  const partes = Array.from(new Set(partesChaveModeloAlfaNumerico(chave)));
  const consultas = new Set<string>();
  const original = String(chave ?? '').trim();
  if (original) consultas.add(original);
  if (partes.length > 1) {
    consultas.add(partes.join(' '));
    consultas.add(partes.join(' | '));
  }
  for (let tamanho = Math.max(2, partes.length - 1); tamanho >= 2; tamanho -= 1) {
    for (let inicio = 0; inicio <= partes.length - tamanho; inicio += 1) {
      consultas.add(partes.slice(inicio, inicio + tamanho).join(' '));
    }
  }
  partes.forEach((parte) => consultas.add(parte));
  return Array.from(consultas).filter(Boolean);
}

function avaliarTextoCandidatoModelo(textoCandidato: unknown, codigos: string[], contexto?: Record<string, unknown>) {
  const textoNormalizado = normalizarChaveModeloAlfaNumerico(textoCandidato);
  const textoBusca = normalizarTextoModeloBusca(textoCandidato);
  const contextoEquivalencia = contextoConfirmaEquivalencia(textoBusca, textoNormalizado, contexto) ? contexto : undefined;
  const { codigosEncontrados, codigosEquivalentes } = encontrarCodigosModelo(textoNormalizado, codigos, contextoEquivalencia);
  if (!codigosEncontrados.length) return null;
  const marca = normalizarTextoModeloBusca(contexto?.marca);
  const btu = extrairBtuTexto(contexto?.nome_comercial ?? contexto?.descricao_interna ?? contexto?.descricao ?? contexto?.capacidade ?? contexto?.btu);
  const marcaConfere = !marca || textoBusca.includes(marca);
  const btuConfere = !btu || textoNormalizado.includes(btu);
  const parcial = codigosEncontrados.length < codigos.length;
  const validacaoParcial = contextoConfirmaMatchParcial(textoBusca, textoNormalizado, contexto);
  if (validacaoParcial.peca_avulsa) return null;
  if (parcial && !validacaoParcial.valido) return null;
  if (parcial && marca && btu && (!marcaConfere || !btuConfere)) return null;
  if (parcial && marca && !btu && !marcaConfere) return null;
  if (parcial && btu && !marca && !btuConfere) return null;
  return {
    codigosEncontrados,
    codigosEquivalentes,
    marca_confere: marcaConfere,
    btu_confere: btuConfere,
    score: (codigosEncontrados.length * 100) - (Object.keys(codigosEquivalentes).length * 15) + (marcaConfere ? 10 : 0) + (btuConfere ? 10 : 0)
  };
}

function obterChaveModeloAlfaNumerico(produto: Record<string, unknown>) {
  const fiscalComercial = produto.fiscal_comercial && typeof produto.fiscal_comercial === 'object'
    ? produto.fiscal_comercial as Record<string, unknown>
    : {};
  const identificacao = fiscalComercial.Identificacao && typeof fiscalComercial.Identificacao === 'object'
    ? fiscalComercial.Identificacao as Record<string, unknown>
    : {};
  return produto.modelo_alfa_numerico ?? identificacao.modelo_alfa_numerico ?? '';
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
  const ehConjuntoErp = String(dados.tipo_produto ?? '') === 'CONJUNTO_ERP';
  const modeloConjunto = ehConjuntoErp
    ? (String(dados.modelo ?? dados.codigo_fabricante ?? '').trim() || null)
    : dados.modelo;
  const fiscalComercialOriginal = (dados.fiscal_comercial && typeof dados.fiscal_comercial === 'object'
    ? dados.fiscal_comercial
    : {}) as Record<string, unknown>;
  const identificacaoOriginal = (fiscalComercialOriginal.Identificacao && typeof fiscalComercialOriginal.Identificacao === 'object'
    ? fiscalComercialOriginal.Identificacao
    : {}) as Record<string, unknown>;
  const dadosPersistidos: ProdutoCadastro = ehConjuntoErp
    ? {
      ...dados,
      modelo: modeloConjunto,
      codigo_fabricante: modeloConjunto,
      fiscal_comercial: {
        ...fiscalComercialOriginal,
        Identificacao: {
          ...identificacaoOriginal,
          modelo_alfa_numerico: modeloConjunto
        }
      }
    }
    : dados;
  const scoreBase = calcularScore({
    ...dadosPersistidos,
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
      dadosPersistidos.codigo_fabricante ?? null,
      dados.ean_gtin ?? dados.ean ?? dados.gtin ?? null,
      dados.gtin ?? dados.ean_gtin ?? null,
      dados.mpn ?? null,
      dados.ncm ?? null,
      dados.cest ?? null,
      dados.nome_interno ?? dados.nome_comercial ?? null,
      dados.nome_comercial ?? dados.nome_interno ?? null,
      dados.marca ?? null,
      dados.linha ?? null,
      dadosPersistidos.modelo ?? null,
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
      JSON.stringify(dadosPersistidos.fiscal_comercial ?? {}),
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
      AND COALESCE(UPPER(c.codigo), '') NOT IN ('DECIS', 'ERP_DECIS')
      AND COALESCE(UPPER(c.nome), '') NOT LIKE '%ERP DECIS%'
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
    WHERE (empresa_id = $1 OR empresa_id IS NULL)
      AND COALESCE(UPPER(codigo), '') NOT IN ('DECIS', 'ERP_DECIS')
      AND COALESCE(UPPER(nome), '') NOT LIKE '%ERP DECIS%'
    ORDER BY tipo_canal ASC, nome ASC`,
    [empresaId]
  );
}

export async function salvarCanal(empresaId: number, dados: Record<string, unknown>) {
  const codigo = String(dados.codigo ?? '').trim().toUpperCase();
  const nome = String(dados.nome ?? 'Canal').trim();
  if (['DECIS', 'ERP_DECIS'].includes(codigo) || nome.toUpperCase().includes('ERP DECIS')) {
    throw new Error('O ERP Decis não é um marketplace do PIM e não pode ser cadastrado nesta lista.');
  }
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
      codigo,
      nome,
      String(dados.tipo_canal ?? 'MARKETPLACE'),
      dados.categoria_interna ?? null,
      dados.categoria_canal ?? null,
      dados.score_minimo_publicacao ? Number(dados.score_minimo_publicacao) : 80,
      JSON.stringify(dados.regras ?? {}),
      dados.ativo !== false
    ]
  );
}

export async function listarFontesComparacao(empresaId: number) {
  return consultar(
    `SELECT f.*, COUNT(DISTINCT a.id)::INTEGER AS total_atributos, COUNT(DISTINCT r.id)::INTEGER AS total_anuncios
    FROM pim_comparacao_fontes f
    LEFT JOIN pim_comparacao_atributos a ON a.fonte_id = f.id AND a.ativo = TRUE
    LEFT JOIN pim_comparacao_registros r ON r.fonte_id = f.id
    WHERE f.empresa_id = $1
    GROUP BY f.id
    ORDER BY f.tipo_fonte ASC, f.prioridade ASC, f.nome ASC`,
    [empresaId]
  );
}

export async function salvarFonteComparacao(empresaId: number, dados: Record<string, unknown>) {
  const codigo = String(dados.codigo ?? '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
  const nome = String(dados.nome ?? '').trim();
  if (!codigo || !nome) throw new Error('Informe o codigo e o nome da fonte de comparacao.');
  return consultarUm(
    `INSERT INTO pim_comparacao_fontes (empresa_id, codigo, nome, tipo_fonte, url_base, prioridade, regras, ativo, alterado_em)
    VALUES ($1, $2, $3, COALESCE($4, 'CONCORRENTE'), NULLIF($5, ''), COALESCE($6, 50), COALESCE($7, '{}'::JSONB), COALESCE($8, TRUE), NOW())
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET
      nome = EXCLUDED.nome,
      tipo_fonte = EXCLUDED.tipo_fonte,
      url_base = EXCLUDED.url_base,
      prioridade = EXCLUDED.prioridade,
      regras = EXCLUDED.regras,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW()
    RETURNING *`,
    [
      empresaId,
      codigo,
      nome,
      String(dados.tipo_fonte ?? 'CONCORRENTE'),
      String(dados.url_base ?? ''),
      Number(dados.prioridade ?? 50),
      JSON.stringify(dados.regras ?? {}),
      dados.ativo !== false
    ]
  );
}

export async function excluirFonteComparacao(empresaId: number, fonteId: number) {
  return consultarUm(
    `UPDATE pim_comparacao_fontes
    SET ativo = FALSE, alterado_em = NOW()
    WHERE id = $1 AND empresa_id = $2
    RETURNING *`,
    [fonteId, empresaId]
  );
}

export async function listarAtributosComparacao(empresaId: number, fonteId: number) {
  return consultar(
    `SELECT a.*
    FROM pim_comparacao_atributos a
    INNER JOIN pim_comparacao_fontes f ON f.id = a.fonte_id
    WHERE a.fonte_id = $1 AND f.empresa_id = $2 AND a.ativo = TRUE
    ORDER BY a.ordem ASC, a.nome ASC`,
    [fonteId, empresaId]
  );
}

export async function salvarAtributosComparacao(empresaId: number, fonteId: number, dados: Record<string, unknown>) {
  const fonte = await consultarUm<{ id: number }>(
    `SELECT id FROM pim_comparacao_fontes WHERE id = $1 AND empresa_id = $2 AND ativo = TRUE`,
    [fonteId, empresaId]
  );
  if (!fonte) throw new Error('Fonte de comparacao nao encontrada.');
  const atributos = Array.isArray(dados.atributos) ? dados.atributos : [dados];
  const salvos = [];
  for (const item of atributos as Record<string, unknown>[]) {
    const codigo = String(item.codigo ?? '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
    const nome = String(item.nome ?? item.nome_exibido ?? codigo).trim();
    if (!codigo || !nome) continue;
    const salvo = await consultarUm(
      `INSERT INTO pim_comparacao_atributos (fonte_id, codigo, nome, tipo_campo, unidade_medida, obrigatorio, ordem, ativo)
      VALUES ($1, $2, $3, COALESCE($4, 'TEXTO'), NULLIF($5, ''), COALESCE($6, FALSE), COALESCE($7, 0), COALESCE($8, TRUE))
      ON CONFLICT (fonte_id, codigo) DO UPDATE SET
        nome = EXCLUDED.nome,
        tipo_campo = EXCLUDED.tipo_campo,
        unidade_medida = EXCLUDED.unidade_medida,
        obrigatorio = EXCLUDED.obrigatorio,
        ordem = EXCLUDED.ordem,
        ativo = EXCLUDED.ativo
      RETURNING *`,
      [
        fonteId,
        codigo,
        nome,
        String(item.tipo_campo ?? 'TEXTO'),
        String(item.unidade_medida ?? ''),
        item.obrigatorio === true,
        Number(item.ordem ?? 0),
        item.ativo !== false
      ]
    );
    if (salvo) salvos.push(salvo);
  }
  return salvos;
}

export async function obterDeParaConcorrente(empresaId: number, fonteId: number) {
  const fonte = await consultarUm<Record<string, unknown>>(
    `SELECT *
    FROM pim_comparacao_fontes
    WHERE id = $1 AND empresa_id = $2 AND ativo = TRUE`,
    [fonteId, empresaId]
  );
  if (!fonte) throw new Error('Concorrente nao encontrado.');

  const atributosPim = await consultar<{ codigo: string; nome_exibido: string; grupo: string | null; ativo: boolean }>(
    `SELECT a.codigo, a.nome_exibido, COALESCE(ag.nome, 'Atributos ERP') AS grupo, a.ativo
    FROM atributos a
    LEFT JOIN atributos_grupos ag ON ag.id = a.atributo_grupo_id
    WHERE a.empresa_id = $1 AND a.ativo = TRUE
    ORDER BY COALESCE(ag.ordem, 999), a.ordem_exibicao ASC, a.nome_exibido ASC`,
    [empresaId]
  );
  const destinosConhecidos = new Set(atributosPim.map((item) => String(item.codigo)));
  const regras = (fonte.regras && typeof fonte.regras === 'object' ? fonte.regras : {}) as Record<string, unknown>;
  const dePara = (regras.de_para && typeof regras.de_para === 'object' ? regras.de_para : {}) as Record<string, unknown>;

  const registros = await consultar<Record<string, unknown>>(
    `SELECT dados
    FROM pim_comparacao_registros
    WHERE empresa_id = $1
      AND fonte_id = $2
      AND dados IS NOT NULL
    ORDER BY alterado_em DESC NULLS LAST, id DESC
    LIMIT 50000`,
    [empresaId, fonteId]
  );

  const campos = new Map<string, { campo_concorrente: string; codigo_normalizado: string; ocorrencias: number; exemplos: string[] }>();
  const ignorar = new Set(['_DADOS_BRUTOS', '_DEPARA_APLICADO', '_DADOS_MAPEADOS', '_CONFIANCA_MODELO']);
  for (const registro of registros) {
    const persistido = registro.dados && typeof registro.dados === 'object' ? registro.dados as Record<string, unknown> : {};
    const bruto = persistido._DADOS_BRUTOS && typeof persistido._DADOS_BRUTOS === 'object' ? persistido._DADOS_BRUTOS as Record<string, unknown> : persistido;
    for (const [campo, valor] of Object.entries(bruto)) {
      if (!campo || ignorar.has(campo) || campo.startsWith('__')) continue;
      const codigoNormalizado = normalizarNomeAtributoComparacao(campo);
      if (!codigoNormalizado) continue;
      const texto = String(normalizarValorConcorrente(valor) ?? '').trim();
      if (!texto) continue;
      const atual = campos.get(codigoNormalizado) ?? { campo_concorrente: campo, codigo_normalizado: codigoNormalizado, ocorrencias: 0, exemplos: [] };
      atual.ocorrencias += 1;
      if (texto && !atual.exemplos.includes(texto)) atual.exemplos.push(texto.slice(0, 180));
      campos.set(codigoNormalizado, atual);
    }
  }

  const linhas = Array.from(campos.values()).map((campo) => {
    const destino = String(dePara[campo.campo_concorrente] ?? dePara[campo.codigo_normalizado] ?? DEPARA_CONCORRENTE_PADRAO[campo.codigo_normalizado] ?? '').trim();
    const existeNoPim = Boolean(destino && destinosConhecidos.has(destino));
    return {
      ...campo,
      atributo_pim_codigo: destino,
      atributo_pim_nome: atributosPim.find((item) => item.codigo === destino)?.nome_exibido ?? '',
      status: existeNoPim ? 'VINCULADO' : destino ? 'DESTINO_NAO_ENCONTRADO' : 'SEM_DEPARA',
      existe_no_pim: existeNoPim,
      exemplos: campo.exemplos.slice(0, 3).join(' | ')
    };
  }).sort((a, b) => a.status.localeCompare(b.status, 'pt-BR') || b.ocorrencias - a.ocorrencias || a.campo_concorrente.localeCompare(b.campo_concorrente, 'pt-BR'));

  const camposConcorrente = new Set(linhas.map((item) => item.atributo_pim_codigo).filter(Boolean));
  const atributosAtendidos = atributosPim.filter((item) => camposConcorrente.has(item.codigo));
  const atributosNaoEntregues = atributosPim.filter((item) => !camposConcorrente.has(item.codigo)).map((item) => ({
    codigo_normalizado: item.codigo,
    campo_concorrente: '',
    atributo_pim_codigo: item.codigo,
    atributo_pim_nome: item.nome_exibido,
    grupo: item.grupo,
    status: 'PIM_SEM_CAMPO_CONCORRENTE',
    existe_no_pim: true,
    ocorrencias: 0,
    exemplos: ''
  }));
  const concorrenteVinculados = linhas.filter((item) => item.existe_no_pim).length;
  const resumo = {
    total_campos_concorrente: linhas.length,
    campos_concorrente_vinculados: concorrenteVinculados,
    campos_concorrente_sem_depara: linhas.filter((item) => item.status === 'SEM_DEPARA').length,
    campos_concorrente_destino_invalido: linhas.filter((item) => item.status === 'DESTINO_NAO_ENCONTRADO').length,
    total_atributos_pim: atributosPim.length,
    atributos_pim_entregues: atributosAtendidos.length,
    atributos_pim_nao_entregues: atributosNaoEntregues.length,
    percentual_concorrente_mapeado: linhas.length ? Math.round((concorrenteVinculados / linhas.length) * 10000) / 100 : 0,
    percentual_pim_entregue: atributosPim.length ? Math.round((atributosAtendidos.length / atributosPim.length) * 10000) / 100 : 0
  };

  return { fonte, resumo, campos: linhas, atributos_pim: atributosPim, atributos_nao_entregues: atributosNaoEntregues };
}

function normalizarNomeAtributoComparacao(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function extrairMetaHtml(html: string, nome: string) {
  const nomeEscapado = nome;
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${nomeEscapado}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  return regex.exec(html)?.[1]?.trim() ?? '';
}

function extrairJsonLdProdutos(html: string) {
  const produtos: Record<string, unknown>[] = [];
  const blocos = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const bloco of blocos) {
    try {
      const valor = JSON.parse(String(bloco[1]).trim()) as unknown;
      const fila = Array.isArray(valor) ? valor : [valor];
      for (const item of fila) {
        if (!item || typeof item !== 'object') continue;
        const objeto = item as Record<string, unknown>;
        if (Array.isArray(objeto['@graph'])) {
          for (const grafico of objeto['@graph']) {
            if (grafico && typeof grafico === 'object') produtos.push(grafico as Record<string, unknown>);
          }
        } else {
          produtos.push(objeto);
        }
      }
    } catch {
      // Algumas lojas publicam JSON-LD incompleto; os metadados HTML continuam sendo usados.
    }
  }
  return produtos;
}

function extrairAtributosJsonLd(produto: Record<string, unknown>) {
  const dados: Record<string, unknown> = {};
  const propriedades = Array.isArray(produto.additionalProperty) ? produto.additionalProperty : [];
  for (const item of propriedades) {
    if (!item || typeof item !== 'object') continue;
    const propriedade = item as Record<string, unknown>;
    const codigo = normalizarNomeAtributoComparacao(propriedade.name);
    if (codigo) dados[codigo] = propriedade.value ?? '';
  }
  const aliases: Record<string, string> = {
    brand: 'MARCA',
    model: 'MODELO',
    mpn: 'CODIGO_FABRICANTE',
    sku: 'SKU',
    gtin: 'GTIN',
    category: 'CATEGORIA',
    description: 'DESCRICAO'
  };
  for (const [origem, destino] of Object.entries(aliases)) {
    if (produto[origem] !== undefined && produto[origem] !== null && produto[origem] !== '') {
      dados[destino] = typeof produto[origem] === 'object'
        ? JSON.stringify(produto[origem])
        : produto[origem];
    }
  }
  const ofertas = produto.offers && typeof produto.offers === 'object' ? produto.offers as Record<string, unknown> : {};
  if (ofertas.price !== undefined && ofertas.price !== null) dados.PRECO = ofertas.price;
  if (ofertas.lowPrice !== undefined && ofertas.lowPrice !== null) dados.PRECO_MENOR = ofertas.lowPrice;
  if (ofertas.highPrice !== undefined && ofertas.highPrice !== null) dados.PRECO_MAIOR = ofertas.highPrice;
  if (ofertas.priceCurrency !== undefined && ofertas.priceCurrency !== null) dados.MOEDA = ofertas.priceCurrency;
  return dados;
}

const WEBCONTINENTAL_ALIASES: Record<string, string> = {
  FABRICANTE: 'MARCA',
  COR_PREDOMINANTE: 'COR',
  CICLO_DO_AR_CONDICIONADO: 'CICLO',
  GAS_REFRIGERANTE: 'GAS',
  NOME_DO_MODELO_CONDENSADORA: 'MODELO',
  NOME_DO_MODELO_EVAPORADORA: 'CODIGO_MODELO',
  VAZAO_DE_AR: 'VAZAO_DE_AR',
  TECNOLOGIA: 'TECNOLOGIA',
  CLASSIFICACAO_ENERGETICA: 'CLASSIFICACAO_ENERGETICA',
  CAPACIDADE_BTUS: 'CAPACIDADE',
  CONSUMO_DE_ENERGIA: 'CONSUMO_DE_ENERGIA',
  GARANTIA_DO_FABRICANTE: 'GARANTIA',
  PRODUCTREFERENCE: 'EAN',
  LINK: 'URL_CANONICA'
};

const FRIGELAR_ALIASES: Record<string, string> = {
  X_QUANTIDADE_DE_BTUS: 'CAPACIDADE',
  X_TENSION: 'VOLTAGEM',
  X_FASE: 'FASE',
  X_CICLO: 'CICLO',
  X_TIPO_DE_GAS: 'GAS',
  X_TECNOLOGIA: 'TECNOLOGIA',
  X_SERPENTINA: 'MATERIAIS',
  X_VAZAO_DE_AR: 'VAZAO_DE_AR',
  X_FREQUENCIA: 'FREQUENCIA',
  X_CLASSIFICACAO_ENERGETICA_INMETRO: 'CLASSIFICACAO_ENERGETICA',
  X_IDRS: 'SEER',
  X_CONSUMO_APROXIMADO_DE_ENERGIA: 'CONSUMO_DE_ENERGIA',
  X_MEDIDA_CONDENSADORA_EXT_LXAXP_CM: 'DIMENSOES_CONDENSADORA',
  X_MEDIDA_EVAPORADORA_INT_LXAXP_CM: 'DIMENSOES_EVAPORADORA',
  X_PESO_LIQUIDO_CONDENSADORA_EXT_KG: 'PESO_LIQUIDO_CONDENSADORA',
  X_PESO_LIQUIDO_EVAPORADORA_INT_KG: 'PESO_LIQUIDO_EVAPORADORA',
  X_TUBULACAO_BITOLAS: 'TUBULACAO',
  X_DESNIVEL_MAXIMO_DE_INSTALACAO: 'DESNIVEL_MAXIMO',
  X_DISTANCIA_MAXIMA_ENTRE_EVAPORADORA_E_CONDENSADORA_METROS: 'DISTANCIA_MAXIMA_TUBULACAO',
  X_FUNCAO_LED: 'FUNCAO_LED',
  X_FUNCAO_SIGAME: 'FUNCAO_SIGA_ME',
  X_FUNCAO_BRISA: 'FUNCAO_BRISA',
  X_WIFI: 'COM_WI_FI',
  X_WIFI_INTEGRADO: 'COM_WI_FI',
  X_COMPATIVEL_COM_ALEXA: 'COM_ALEXA',
  X_COMPATIVEL_COM_GOOGLE_ASSISTENTE: 'COM_GOOGLE_ASSISTENTE',
  X_AUTO_LIMPEZA: 'AUTO_LIMPEZA',
  X_TURBO: 'TURBO',
  X_GARANTIA_DO_COMPRESSOR: 'GARANTIA_COMPRESSOR',
  X_WARRANTY: 'GARANTIA',
  X_FABRICANTE: 'MARCA',
  X_MODEL: 'MODELO',
  X_CODIGO_FRIGELAR: 'CODIGO_FABRICANTE',
  X_EAN: 'EAN',
  X_EAN_EXTERNA_COND: 'EAN_CONDENSADORA',
  X_EAN_INTERNA_EVAP: 'EAN_EVAPORADORA'
};

function adicionarCamposApi(dados: Record<string, unknown>, objeto: Record<string, unknown>, aliases: Record<string, string> = {}) {
  for (const [campo, valor] of Object.entries(objeto)) {
    if (valor === null || valor === undefined || valor === '' || ['links', 'childSKUs', 'listPrices', 'salePrices', 'saleVolumePrices', 'listVolumePrices', 'productImagesMetadata', 'mediumImageURLs', 'smallImageURLs', 'largeImageURLs', 'fullImageURLs', 'sourceImageURLs', 'thumbImageURLs', 'primarySourceImageURL', 'primaryFullImageURL', 'primaryMediumImageURL', 'primaryLargeImageURL', 'primarySmallImageURL', 'primaryThumbImageURL'].includes(campo)) continue;
    const codigo = normalizarNomeAtributoComparacao(campo);
    if (Array.isArray(valor) && valor.some((item) => item && typeof item === 'object')) continue;
    adicionarAtributoExtraido(dados, campo, valor);
    const destino = aliases[codigo];
    if (destino) adicionarAtributoExtraido(dados, destino, valor);
  }
}

async function buscarJsonApi(url: string, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const resposta = await fetch(url, { signal: controller.signal, headers });
    if (!resposta.ok) return null;
    return await resposta.json() as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function idProdutoFrigelar(url: string, produto: Record<string, unknown>) {
  const ofertas = Array.isArray(produto.offers) ? produto.offers : produto.offers ? [produto.offers] : [];
  const oferecido = ofertas.find((item) => item && typeof item === 'object') as Record<string, unknown> | undefined;
  const itemOferecido = oferecido?.itemOffered && typeof oferecido.itemOffered === 'object' ? oferecido.itemOffered as Record<string, unknown> : {};
  return String(itemOferecido.productID ?? produto.productID ?? new URL(url).pathname.match(/\/p\/([^/?#]+)/i)?.[1] ?? '').trim();
}

function itemIdWebcontinental(html: string) {
  return html.match(/["'](?:itemId|skuId)["']\s*:\s*["']([^"']+)["']/i)?.[1] ?? '';
}

async function enriquecerDadosPorApiConcorrente(url: string, html: string, produto: Record<string, unknown>, dados: Record<string, unknown>) {
  let midia: { imagens: string[]; manuais: string[] } = { imagens: [], manuais: [] };
  try {
    const endereco = new URL(url);
    const host = endereco.hostname.toLowerCase();
    if (host.includes('frigelar.com.br')) {
      const id = idProdutoFrigelar(url, produto);
      if (id) {
        const api = `${endereco.origin}/ccstore/v1/products/${encodeURIComponent(id)}?expand=details,skus,childSKUs,variantProperties`;
        const retorno = await buscarJsonApi(api, { 'User-Agent': 'ControlS-Hub-PIM/1.0 (extracao-de-anuncio)', 'X-CCProfileType': 'storefrontUI', Accept: 'application/json' });
        if (retorno && typeof retorno === 'object' && !Array.isArray(retorno)) {
          adicionarCamposApi(dados, retorno as Record<string, unknown>, FRIGELAR_ALIASES);
          const objeto = retorno as Record<string, unknown>;
          const imagens = [...(Array.isArray(objeto.fullImageURLs) ? objeto.fullImageURLs : []), ...(Array.isArray(objeto.largeImageURLs) ? objeto.largeImageURLs : []), ...(Array.isArray(objeto.sourceImageURLs) ? objeto.sourceImageURLs : [])].map(String).filter(Boolean);
          midia.imagens = Array.from(new Set(imagens)).slice(0, 80);
        }
      }
    }
    if (host.includes('webcontinental.com.br')) {
      const itemId = itemIdWebcontinental(html);
      const consultas = itemId ? [`${endereco.origin}/api/catalog_system/pub/products/search?fq=skuId:${encodeURIComponent(itemId)}`] : [];
      const canonical = extrairMetaHtml(html, 'og:url') || html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || url;
      const slug = new URL(canonical, url).pathname.replace(/^\/+|\/+$/g, '').replace(/\/p$/i, '');
      consultas.push(`${endereco.origin}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(slug)}`);
      let retorno: unknown = null;
      for (const consulta of consultas) {
        retorno = await buscarJsonApi(consulta, { 'User-Agent': 'ControlS-Hub-PIM/1.0 (extracao-vtex)', Accept: 'application/json' });
        if (Array.isArray(retorno) && retorno.length) break;
      }
      const produtoVtex = Array.isArray(retorno) ? retorno[0] : null;
      if (produtoVtex && typeof produtoVtex === 'object') {
        const vtex = produtoVtex as Record<string, unknown>;
        adicionarCamposApi(dados, vtex, WEBCONTINENTAL_ALIASES);
        if (vtex.brand) adicionarAtributoExtraido(dados, 'MARCA', vtex.brand);
        if (vtex.productName) adicionarAtributoExtraido(dados, 'PRODUTO', vtex.productName);
        if (vtex.link) adicionarAtributoExtraido(dados, 'URL_CANONICA', vtex.link);
        const item = Array.isArray(vtex.items) && vtex.items[0] && typeof vtex.items[0] === 'object' ? vtex.items[0] as Record<string, unknown> : null;
        if (item) {
          adicionarCamposApi(dados, item, WEBCONTINENTAL_ALIASES);
          const modelos = [vtex['Nome do Modelo Condensadora'], vtex['Nome do Modelo Evaporadora'], item.name, item.nameComplete].flatMap((valor) => Array.isArray(valor) ? valor : [valor]).map((valor) => String(valor ?? '').trim()).filter(Boolean);
          if (modelos.length) {
            adicionarAtributoExtraido(dados, 'MODELO', modelos.slice(0, 2).join(' | '));
            adicionarAtributoExtraido(dados, 'CODIGO_FABRICANTE', modelos.slice(0, 2).join(' | '));
          }
          const imagens = Array.isArray(item.images) ? item.images.map((imagem) => imagem && typeof imagem === 'object' ? String((imagem as Record<string, unknown>).imageUrl ?? '') : '').filter(Boolean) : [];
          midia.imagens = Array.from(new Set(imagens)).slice(0, 80);
        }
        const especificacoes = Array.isArray(vtex.allSpecifications) ? vtex.allSpecifications : [];
        const grupos = Array.isArray(vtex.allSpecificationsGroups) ? vtex.allSpecificationsGroups : [];
        if (especificacoes.length) adicionarAtributoExtraido(dados, 'ESPECIFICACOES_TECNICAS', especificacoes.join(' | '));
        if (grupos.length) adicionarAtributoExtraido(dados, 'GRUPOS_ESPECIFICACOES', grupos.join(' | '));
      }
    }
  } catch {
    // A API complementar é opcional; o HTML e JSON-LD continuam sendo usados.
  }
  return midia;
}

function decodificarTextoHtml(valor: string) {
  return valor
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/dt>|<\/dd>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, codigo) => String.fromCharCode(Number(codigo)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, codigo) => String.fromCharCode(parseInt(codigo, 16)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function normalizarValorConcorrente(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  if (Array.isArray(valor)) {
    const itens = valor.map((item) => normalizarValorConcorrente(item)).filter((item) => item !== null && item !== undefined && String(item).trim() !== '');
    return itens.length ? itens.join(' | ') : null;
  }
  if (typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    const prioridade = ['name', 'value', 'text', 'label', 'title', 'description', 'content'];
    const chave = prioridade.find((item) => objeto[item] !== undefined && objeto[item] !== null && String(objeto[item]).trim() !== '');
    if (chave) return normalizarValorConcorrente(objeto[chave]);
    const valores = Object.values(objeto).map((item) => normalizarValorConcorrente(item)).filter((item) => item !== null && item !== undefined && String(item).trim() !== '');
    return valores.length ? valores.join(' | ') : null;
  }
  let texto = decodificarTextoHtml(String(valor));
  if (!texto) return null;
  if ((texto.startsWith('{') && texto.endsWith('}')) || (texto.startsWith('[') && texto.endsWith(']'))) {
    try {
      const estruturado = JSON.parse(texto) as unknown;
      const normalizado = normalizarValorConcorrente(estruturado);
      if (normalizado !== null && String(normalizado).trim() !== '') return normalizado;
    } catch {
      // Texto parecido com JSON, mas inválido, continua como texto limpo.
    }
  }
  return texto.replace(/\s+/g, ' ').trim();
}

function normalizarMapaConcorrente(dados: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(dados).map(([chave, valor]) => [chave, chave.startsWith('__') ? valor : normalizarValorConcorrente(valor)]));
}

function adicionarAtributoExtraido(dados: Record<string, unknown>, origem: unknown, valor: unknown) {
  const nome = String(origem ?? '').replace(/[:*?]+$/g, '').trim();
  const conteudo = String(normalizarValorConcorrente(valor) ?? '').trim();
  if (!nome || !conteudo) return;
  const codigo = normalizarNomeAtributoComparacao(nome);
  if (codigo && !dados[codigo]) dados[codigo] = conteudo;
}

function extrairMidiaCandidataHtml(html: string, urlBase: string, produto?: Record<string, unknown>) {
  const resolver = (valor: string) => {
    try {
      return new URL(valor, urlBase).toString();
    } catch {
      return '';
    }
  };
  const imagens = new Set<string>();
  const manuais = new Set<string>();
  const produtoTexto = [produto?.name, produto?.model, produto?.mpn, produto?.sku, produto?.gtin, produto?.category].filter(Boolean).join(' ');
  const palavrasProduto = produtoTexto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length >= 4);
  const contextoProduto = (valor: string) => {
      const normalizado = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return palavrasProduto.some((palavra) => normalizado.includes(palavra)) || /(product[-_ ]?(gallery|image|photo)|pdp[-_ ]?(gallery|image)|gallery[-_ ]?(image|photo)|swiper[-_ ]?slide|product[-_ ]?media|manual[-_ ]?(produto|product)|ficha[-_ ]?(tecnica|technical))/i.test(normalizado);
  };
  const imagemRelevante = (url: string, contexto = '') => !/(\/menu\/|logo|favicon|sprite|icon|banner|pixel|placeholder|avatar|topo|rodape|footer|header|\/PHN2Zy|\/iVBOR|\/R0lGOD|data:image)/i.test(url) && url.length < 500 && contextoProduto(`${url} ${contexto}`);
  const imagensJsonLd = produto?.image;
  for (const valor of (Array.isArray(imagensJsonLd) ? imagensJsonLd : [imagensJsonLd])) {
    const url = resolver(typeof valor === 'object' && valor !== null ? String((valor as Record<string, unknown>).url ?? '') : String(valor ?? ''));
    if (url && imagemRelevante(url, 'product image')) imagens.add(url);
  }
  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)) {
    const url = resolver(match[1]);
    if (url && imagemRelevante(url, 'product image')) imagens.add(url);
  }
  for (const match of html.matchAll(/<(?:img|source)[^>]+(?:src|data-src|srcset)=["']([^"']+)["'][^>]*>/gi)) {
    const valores = String(match[1]).split(',').map((item) => item.trim().split(/\s+/)[0]);
    const contexto = html.slice(Math.max(0, match.index ?? 0 - 360), Math.min(html.length, (match.index ?? 0) + match[0].length + 360));
    valores.forEach((valor) => { const url = resolver(valor); if (/^https?:\/\//i.test(url) && imagemRelevante(url, contexto)) imagens.add(url); });
  }
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,500})<\/a>/gi)) {
    const url = resolver(match[1]);
    const contexto = decodificarTextoHtml(match[2]);
    if (/\.(?:pdf|docx?|xlsx?)(?:[?#].*)?$/i.test(url) && /(manual|manuais|ficha técnica|ficha tecnica|catálogo|catalogo|instrução|instrucao|download|produto|product|modelo|sku)/i.test(`${url} ${contexto}`) && contextoProduto(`${url} ${contexto}`)) {
      if (url) manuais.add(url);
    }
  }
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:pdf|docx?|xlsx?)(?:[?#][^\s"'<>]*)?/gi)) {
    const url = resolver(match[0]);
    const contexto = html.slice(Math.max(0, match.index ?? 0 - 300), Math.min(html.length, (match.index ?? 0) + match[0].length + 300));
    if (contextoProduto(`${url} ${contexto}`) && /(manual|ficha|catalogo|catálogo|instrução|instrucao|download|produto|product|modelo|sku)/i.test(`${url} ${contexto}`)) manuais.add(url);
  }
  return { imagens: Array.from(imagens).slice(0, 80), manuais: Array.from(manuais).slice(0, 40) };
}

function extrairAtributosHtml(html: string) {
  const dados: Record<string, unknown> = {};
  const pares: Array<[string, string]> = [];
  const htmlConteudo = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  for (const match of htmlConteudo.matchAll(/<(?:dt|th|strong|b)[^>]*>([\s\S]*?)<\/(?:dt|th|strong|b)>\s*(?:<[^>]+>\s*){0,4}([^<]{1,800})/gi)) {
    pares.push([match[1], match[2]]);
  }
  for (const match of htmlConteudo.matchAll(/<tr[^>]*>[\s\S]*?<t[hd][^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)) {
    pares.push([match[1], match[2]]);
  }
  const texto = decodificarTextoHtml(htmlConteudo);
  for (const linha of texto.split('\n')) {
    const match = linha.trim().match(/^([^:]{2,100}):\s*(.{1,600})$/);
    if (match) pares.push([match[1], match[2]]);
  }
  for (const [origem, valor] of pares) adicionarAtributoExtraido(dados, origem, valor);
  const imagens = [...html.matchAll(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/gi)].map((match) => match[1]);
  if (imagens.length) dados.IMAGENS = Array.from(new Set(imagens));
  const sku = extrairMetaHtml(html, 'product:retailer_item_id') || extrairMetaHtml(html, 'product:sku');
  if (sku) dados.SKU = sku;
  return dados;
}

const CAMPOS_DIRETOS_CONJUNTO: Array<{ codigo: string; nome: string; grupo: string; unidade_medida?: string }> = [
  { codigo: 'ITEM', nome: 'ITEM / Código ERP', grupo: 'Identificação' },
  { codigo: 'DESCRICAO', nome: 'Descrição / Nome comercial', grupo: 'Identificação' },
  { codigo: 'REFERENCIA', nome: 'Referência / Código do fabricante', grupo: 'Identificação' },
  { codigo: 'MARCA', nome: 'Marca', grupo: 'Identificação' },
  { codigo: 'MARCA_COMPLETA', nome: 'Marca completa', grupo: 'Identificação' },
  { codigo: 'MODELO', nome: 'Modelo', grupo: 'Identificação' },
  { codigo: 'CODIGO_MODELO', nome: 'Código do modelo', grupo: 'Identificação' },
  { codigo: 'CATEGORIA', nome: 'Categoria', grupo: 'Identificação' },
  { codigo: 'CODIGO_NCM', nome: 'NCM / Código NCM', grupo: 'Identificação' },
  { codigo: 'VOLUME', nome: 'Volume', grupo: 'Identificação' },
  { codigo: 'CEST', nome: 'CEST', grupo: 'Identificação' },
  { codigo: 'EAN_GTIN', nome: 'EAN / GTIN', grupo: 'Identificação' },
  { codigo: 'MPN', nome: 'MPN', grupo: 'Identificação' },
  { codigo: 'ALTURA', nome: 'Altura', grupo: 'Logística', unidade_medida: 'cm' },
  { codigo: 'LARGURA', nome: 'Largura', grupo: 'Logística', unidade_medida: 'cm' },
  { codigo: 'PROFUNDIDADE', nome: 'Profundidade', grupo: 'Logística', unidade_medida: 'cm' },
  { codigo: 'ALTURA_EMBALADO', nome: 'Altura embalado', grupo: 'Logística', unidade_medida: 'cm' },
  { codigo: 'LARGURA_EMBALADO', nome: 'Largura embalado', grupo: 'Logística', unidade_medida: 'cm' },
  { codigo: 'PROFUNDIDADE_EMBALADO', nome: 'Profundidade embalado', grupo: 'Logística', unidade_medida: 'cm' },
  { codigo: 'PESO', nome: 'Peso', grupo: 'Logística', unidade_medida: 'kg' },
  { codigo: 'PESO_LIQUIDO', nome: 'Peso líquido', grupo: 'Logística', unidade_medida: 'kg' },
  { codigo: 'VENDA_PADRAO', nome: 'Venda padrão', grupo: 'Comercial' },
  { codigo: 'VENDA_CARTAO', nome: 'Venda cartão', grupo: 'Comercial' },
  { codigo: 'VENDA_A_VISTA', nome: 'Venda à vista', grupo: 'Comercial' },
  { codigo: 'CFF', nome: 'CFF', grupo: 'Comercial' },
  { codigo: 'CFFUSO', nome: 'CFFUSO', grupo: 'Comercial' },
  { codigo: 'DISP', nome: 'Disponibilidade', grupo: 'Estoque / Controle' },
  { codigo: 'FIS', nome: 'Estoque físico', grupo: 'Estoque / Controle' },
  { codigo: 'RES', nome: 'Estoque reservado', grupo: 'Estoque / Controle' },
  { codigo: 'ULTIMA_ALTERACAO', nome: 'Última alteração', grupo: 'Estoque / Controle' }
];

function valorDiretoConjunto(produto: Record<string, unknown>, codigo: string) {
  const fiscal = produto.fiscal_comercial && typeof produto.fiscal_comercial === 'object' ? produto.fiscal_comercial as Record<string, unknown> : {};
  const grupos = Object.values(fiscal).filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>;
  const identificacao = fiscal.Identificacao && typeof fiscal.Identificacao === 'object' ? fiscal.Identificacao as Record<string, unknown> : {};
  const logistica = fiscal.Logistica && typeof fiscal.Logistica === 'object' ? fiscal.Logistica as Record<string, unknown> : {};
  const comercial = fiscal.Comercial && typeof fiscal.Comercial === 'object' ? fiscal.Comercial as Record<string, unknown> : {};
  const estoque = fiscal.Estoque && typeof fiscal.Estoque === 'object' ? fiscal.Estoque as Record<string, unknown> : {};
  const controle = fiscal.Controle && typeof fiscal.Controle === 'object' ? fiscal.Controle as Record<string, unknown> : {};
  const valores: Record<string, unknown> = {
    ITEM: produto.codigo_erp_decis ?? produto.codigo_interno,
    DESCRICAO: produto.nome_comercial ?? produto.descricao_interna,
    REFERENCIA: produto.codigo_fabricante,
    MARCA: produto.marca,
    MARCA_COMPLETA: identificacao.marca_completa,
    MODELO: produto.modelo ?? identificacao.modelo_alfa_numerico ?? produto.codigo_fabricante,
    CODIGO_MODELO: identificacao.codigo_modelo,
    CATEGORIA: produto.categoria,
    CODIGO_NCM: produto.ncm ?? identificacao.codigo_ncm ?? identificacao.ncm,
    VOLUME: identificacao.volume,
    CEST: produto.cest ?? identificacao.cest,
    EAN_GTIN: produto.ean_gtin,
    MPN: produto.mpn,
    ALTURA: produto.altura ?? logistica.altura,
    LARGURA: produto.largura ?? logistica.largura,
    PROFUNDIDADE: produto.comprimento ?? logistica.profundidade,
    ALTURA_EMBALADO: logistica.altura_embalado,
    LARGURA_EMBALADO: logistica.largura_embalado,
    PROFUNDIDADE_EMBALADO: logistica.profundidade_embalado,
    PESO: produto.peso ?? logistica.peso,
    PESO_LIQUIDO: logistica.peso_liquido,
    VENDA_PADRAO: comercial.venda_padrao,
    VENDA_CARTAO: comercial.venda_cartao,
    VENDA_A_VISTA: comercial.venda_a_vista,
    CFF: comercial.cff,
    CFFUSO: comercial.cffuso,
    DISP: estoque.disp,
    FIS: estoque.fis,
    RES: estoque.res,
    ULTIMA_ALTERACAO: controle.ultima_alteracao ?? produto.alterado_em
  };
  if (valores[codigo] !== undefined) return valores[codigo];
  const chaveNormalizada = normalizarNomeAtributoComparacao(codigo);
  for (const grupo of [identificacao, logistica, comercial, estoque, controle, ...grupos]) {
    const encontrado = Object.entries(grupo).find(([chave]) => normalizarNomeAtributoComparacao(chave) === chaveNormalizada);
    if (encontrado) return encontrado[1];
  }
  return undefined;
}

const DEPARA_CONCORRENTE_PADRAO: Record<string, string> = {
  ITEM: 'ITEM',
  SKU: 'SKU_CJ',
  SKU_CJ: 'SKU_CJ',
  PRODUTO: 'PRODUTO',
  TITULO: 'PRODUTO',
  DESCRICAO: 'DESCRICAO',
  MARCA: 'MARCA',
  MODELO: 'MODELO_ALFA_NUMERICO',
  MPN: 'MODELO_ALFA_NUMERICO',
  CODIGO_FABRICANTE: 'MODELO_ALFA_NUMERICO',
  REFERENCIA: 'MODELO_ALFA_NUMERICO',
  CAPACIDADE: 'POTENCIA_NOMINAL',
  BTU: 'POTENCIA_NOMINAL',
  BTUS: 'POTENCIA_NOMINAL',
  POTENCIA: 'POTENCIA_NOMINAL',
  GAS_REFRIGERANTE: 'GAS',
  REFRIGERANTE: 'GAS',
  VOLTAGEM: 'TIPO_DE_ALIMENTACAO',
  TENSAO: 'TIPO_DE_ALIMENTACAO',
  TECNOLOGIA: 'TECNOLOGIA',
  CICLO: 'CICLO',
  WIFI: 'COM_WI_FI',
  WI_FI: 'COM_WI_FI',
  CONECTIVIDADE: 'COM_WI_FI',
  PRECO: 'VENDA_PADRAO',
  PRECO_A_VISTA: 'VENDA_A_VISTA',
  POSSUI_WIFI: 'COM_WI_FI',
  POSSUI_WI_FI: 'COM_WI_FI',
  CAPACIDADE_DE_REFRIGERACAO_BTU_H: 'POTENCIA_DE_REFRIGERACAO',
  CAPACIDADE_DE_AQUECIMENTO_BTU_H: 'POTENCIA_DE_AQUECIMENTO',
  VOLTAGEM_V: 'VOLTAGEM',
  SISTEMA_DE_FASE: 'FASE',
  CLASSIFICACAO_ENERGETICA_INMETRO: 'CLASSIFICACAO_ENERGETICA',
  INDICE_IDRS: 'SEER',
  CONSUMO_DE_ENERGIA_ANUAL_KWH_ANO: 'CONSUMO_DE_ENERGIA_ANUAL_KWH_ANO',
  POTENCIA_ELETRICA_CONSUMIDA_W: 'POTENCIA_ELETRICA_CONSUMIDA_W',
  VAZAO_DE_AR_MAXIMA_M3_MIN: 'VAZAO_DE_AR',
  NIVEL_DE_RUIDO_UNIDADE_INTERNA_DB: 'NIVEL_DE_RUIDO_INTERNO',
  NIVEL_DE_RUIDO_UNIDADE_EXTERNA_DB: 'NIVEL_DE_RUIDO_UE',
  CONEXAO_DA_TUBULACAO_LIQUIDA_MM: 'TUBULACAO_DE_LIQUIDO',
  CONEXAO_DA_TUBULACAO_DE_GAS_MM: 'TUBULACAO_DE_GAS',
  COMPRIMENTO_MAXIMO_DA_TUBULACAO_M: 'COMPRIMENTO_MAXIMO_TUBULACAO',
  DESNIVEL_MAXIMO_M: 'DESNIVEL_MAXIMO',
  SERPENTINA_DA_CONDENSADORA: 'MATERIAIS',
  MATERIAL_SERPENTINA: 'MATERIAIS',
  ORIGEM: 'ORIGEM',
  NCM: 'CODIGO_NCM',
  CODIGO_NCM: 'CODIGO_NCM',
  CEST: 'CEST',
  VOLUME: 'VOLUME',
  ITEM_ERP: 'ITEM',
  CODIGO_ERP: 'ITEM',
  CODIGO: 'ITEM',
  DESCRICAO_PRODUTO: 'DESCRICAO',
  NOME: 'DESCRICAO',
  NOME_COMERCIAL: 'DESCRICAO',
  REFERENCIA_FABRICANTE: 'REFERENCIA',
  MARCA_COMPLETA: 'MARCA_COMPLETA',
  CODIGO_MODELO: 'CODIGO_MODELO',
  EAN: 'EAN_GTIN',
  GTIN: 'EAN_GTIN',
  ALTURA: 'ALTURA',
  LARGURA: 'LARGURA',
  PROFUNDIDADE: 'PROFUNDIDADE',
  COMPRIMENTO: 'PROFUNDIDADE',
  ALTURA_EMBALAGEM: 'ALTURA_EMBALADO',
  LARGURA_EMBALAGEM: 'LARGURA_EMBALADO',
  PROFUNDIDADE_EMBALAGEM: 'PROFUNDIDADE_EMBALADO',
  PESO_BRUTO: 'PESO',
  PESO_LIQUIDO: 'PESO_LIQUIDO',
  PRECO_CARTAO: 'VENDA_CARTAO',
  PRECO_VISTA: 'VENDA_A_VISTA',
  DISPONIBILIDADE: 'DISP',
  ESTOQUE: 'FIS',
  ESTOQUE_FISICO: 'FIS',
  ESTOQUE_RESERVADO: 'RES',
  ULTIMA_ATUALIZACAO: 'ULTIMA_ALTERACAO',
  DATA_ULTIMA_ALTERACAO: 'ULTIMA_ALTERACAO'
};

async function descobrirDeParaConcorrente(empresaId: number, dados: Record<string, unknown>, regras: Record<string, unknown>) {
  const atributos = await consultar<{ codigo: string; nome_exibido: string }>(
    `SELECT codigo, nome_exibido FROM atributos WHERE empresa_id = $1 AND ativo = TRUE`,
    [empresaId]
  );
  const configurado = (regras.de_para && typeof regras.de_para === 'object' ? regras.de_para : {}) as Record<string, unknown>;
  const porCodigo = new Map(atributos.map((item) => [normalizarNomeAtributoComparacao(item.codigo), item.codigo]));
  const porNome = new Map(atributos.map((item) => [normalizarNomeAtributoComparacao(item.nome_exibido), item.codigo]));
  const dePara: Record<string, string> = { ...Object.fromEntries(Object.entries(configurado).map(([origem, destino]) => [origem, String(destino)])) };
  for (const origem of Object.keys(dados)) {
    const chave = normalizarNomeAtributoComparacao(origem);
    const destinoConfigurado = configurado[origem] ?? configurado[chave];
    const destino = String(destinoConfigurado ?? DEPARA_CONCORRENTE_PADRAO[chave] ?? porCodigo.get(chave) ?? porNome.get(chave) ?? '').trim();
    if (destino) dePara[origem] = destino;
  }
  return dePara;
}

function mapearAtributosConcorrente(dados: Record<string, unknown>, regras: Record<string, unknown>) {
  const configurado = (regras.de_para && typeof regras.de_para === 'object' ? regras.de_para : {}) as Record<string, unknown>;
  const mapeado: Record<string, unknown> = {};
  for (const [origem, valor] of Object.entries(dados)) {
    const chave = normalizarNomeAtributoComparacao(origem);
    const destinoConfigurado = configurado[origem] ?? configurado[chave];
    const destino = String(destinoConfigurado ?? DEPARA_CONCORRENTE_PADRAO[chave] ?? chave).trim();
    if (destino) mapeado[destino] = valor;
  }
  return mapeado;
}

function urlEhPaginaBusca(url: unknown) {
  try {
    const endereco = new URL(String(url ?? ''));
    const caminho = endereco.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return caminho === '/search' || caminho === '/busca' || caminho.includes('/catalogsearch/result') || caminho.includes('/searchresults');
  } catch {
    return false;
  }
}

function urlEhPaginaGenerica(url: unknown) {
  try {
    const endereco = new URL(String(url ?? ''));
    const caminho = endereco.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    if (caminho === '/') return true;
    if (endereco.hostname.includes('centralar.com.br') && !caminho.includes('/p/')) return true;
    if (endereco.hostname.includes('frigelar.com.br') && !caminho.includes('/p/')) return true;
    if (endereco.hostname.includes('webcontinental.com.br') && !caminho.endsWith('/p')) return true;
    if (caminho.includes('/pagina/') || caminho.includes('/politica') || caminho.includes('/tipos-de-ar-condicionado') || caminho.includes('/categor') || caminho.includes('/parceiros') || caminho.includes('/rastreio') || caminho.includes('/login') || caminho.includes('/checkout')) return true;
    return false;
  } catch {
    return true;
  }
}

function urlEhPaginaNaoProduto(url: unknown) {
  return urlEhPaginaBusca(url) || urlEhPaginaGenerica(url);
}

function montarUrlsBuscaFonte(fonte: Record<string, unknown>, chave: string) {
  const base = String(fonte.url_base ?? '').trim();
  if (!/^https?:\/\//i.test(base)) return [];
  const termo = encodeURIComponent(chave);
  const codigo = String(fonte.codigo ?? '').toUpperCase();
  const urlBase = new URL(base);
  const caminhos = codigo === 'DUFRIO'
    ? [`catalogsearch/result/?q=${termo}`]
    : codigo === 'FRIGELAR'
      ? [`searchresults?Ntt=${termo}&searchType=simple&type=search`]
      : codigo === 'LEVEROS'
        ? [`busca?term=${termo}`, `?q=${termo}`]
        : [`?q=${termo}`, `?text=${termo}`, `search?query=${termo}`];
  return caminhos.map((caminho) => new URL(caminho, urlBase).toString());
}

async function descobrirAnuncioPorModelo(fonte: Record<string, unknown>, chave: string, contexto?: Record<string, unknown>) {
  const codigos = partesChaveModeloAlfaNumerico(chave).map(normalizarChaveModeloAlfaNumerico).filter(Boolean);
  if (!codigos.length) return null;
  const consultas = gerarConsultasModeloAlfaNumerico(chave);
  let melhor: { url: string; score: number; codigos_encontrados: string[]; codigos_equivalentes?: Record<string, string>; busca_utilizada: string; tentativa: number; marca_confere?: boolean; btu_confere?: boolean } | null = null;

  for (let tentativa = 0; tentativa < consultas.length; tentativa += 1) {
    const consulta = consultas[tentativa];
    const codigoFonte = String(fonte.codigo ?? '').toUpperCase();
    const contextoAvaliacao = { ...(contexto ?? {}), _fonte_codigo: codigoFonte };
    if (codigoFonte === 'WEBCONTINENTAL') {
      const base = String(fonte.url_base ?? '').trim();
      try {
        const apiUrl = new URL('/api/catalog_system/pub/products/search', base);
        apiUrl.searchParams.set('ft', consulta);
        const retorno = await buscarJsonApi(apiUrl.toString(), { 'User-Agent': 'ControlS-Hub-PIM/1.0 (busca-vtex)', Accept: 'application/json' });
        const produtos = Array.isArray(retorno) ? retorno : [];
        for (const produto of produtos) {
          if (!produto || typeof produto !== 'object') continue;
          const item = produto as Record<string, unknown>;
          const link = String(item.link ?? '').trim() || (item.linkText ? new URL(`/${String(item.linkText).replace(/^\/+|\/+$/g, '')}/p`, base).toString() : '');
          if (!link || urlEhPaginaNaoProduto(link)) continue;
          const avaliacao = avaliarTextoCandidatoModelo(JSON.stringify(item), codigos, contextoAvaliacao);
          if (!avaliacao) continue;
          const candidato = { url: link, score: avaliacao.score, codigos_encontrados: avaliacao.codigosEncontrados, codigos_equivalentes: avaliacao.codigosEquivalentes, busca_utilizada: consulta, tentativa, marca_confere: avaliacao.marca_confere, btu_confere: avaliacao.btu_confere };
          if (!melhor || candidato.score > melhor.score) melhor = candidato;
          if (tentativa === 0 && candidato.codigos_encontrados.length === codigos.length) return candidato;
        }
      } catch {
        // A API pública pode bloquear a consulta; segue para os formatos HTML da fonte.
      }
    }
    const urlsBusca = montarUrlsBuscaFonte(fonte, consulta);
    for (const urlBusca of urlsBusca) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const resposta = await fetch(urlBusca, { signal: controller.signal, headers: { 'User-Agent': 'ControlS-Hub-PIM/1.0 (busca-de-produtos)' } });
        if (!resposta.ok) continue;
        const html = (await resposta.text()).slice(0, 4_000_000);
        const origem = new URL(urlBusca);
        const candidatos = new Map<string, { url: string; score: number; codigos_encontrados: string[]; busca_utilizada: string; tentativa: number }>();
        for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
          try {
            const destino = new URL(match[1], urlBusca);
            if (destino.hostname !== origem.hostname || urlEhPaginaNaoProduto(destino.toString())) continue;
            const texto = `${destino.toString()} ${decodificarTextoHtml(match[2])}`;
            const avaliacao = avaliarTextoCandidatoModelo(texto, codigos, contextoAvaliacao);
            if (!avaliacao) continue;
            const candidato = { url: destino.toString(), score: avaliacao.score, codigos_encontrados: avaliacao.codigosEncontrados, codigos_equivalentes: avaliacao.codigosEquivalentes, busca_utilizada: consulta, tentativa, marca_confere: avaliacao.marca_confere, btu_confere: avaliacao.btu_confere };
            const anterior = candidatos.get(candidato.url);
            if (!anterior || candidato.score > anterior.score) candidatos.set(candidato.url, candidato);
          } catch {
            // Links inválidos ou páginas de busca são ignorados.
          }
        }
        const melhorDaPagina = [...candidatos.values()].sort((a, b) => b.score - a.score)[0];
        if (!melhorDaPagina) continue;
        if (!melhor || melhorDaPagina.score > melhor.score) melhor = melhorDaPagina;
        // A busca completa encontrou todos os códigos: não reduzimos a consulta.
        if (tentativa === 0 && melhorDaPagina.codigos_encontrados.length === codigos.length) return melhorDaPagina;
      } catch {
        // Uma fonte pode bloquear uma forma de busca; tenta o próximo padrão.
      } finally {
        clearTimeout(timeout);
      }
    }
  }
  return melhor;
}

async function descobrirAnuncioPorDescricao(fonte: Record<string, unknown>, descricao: string) {
  const textoDescricao = String(descricao ?? '').trim();
  if (!textoDescricao) return null;
  const termos = textoDescricao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter((termo) => termo.length >= 3);
  const codigoFonte = String(fonte.codigo ?? '').toUpperCase();
  if (codigoFonte === 'WEBCONTINENTAL') {
    const base = String(fonte.url_base ?? '').trim();
    try {
      const apiUrl = new URL('/api/catalog_system/pub/products/search', base);
      apiUrl.searchParams.set('ft', textoDescricao);
      const retorno = await buscarJsonApi(apiUrl.toString(), { 'User-Agent': 'ControlS-Hub-PIM/1.0 (busca-vtex-descricao)', Accept: 'application/json' });
      const produtos = Array.isArray(retorno) ? retorno : [];
      let melhor: { url: string; score: number; codigos_encontrados: string[]; busca_utilizada: string; tentativa: number } | null = null;
      for (const produto of produtos) {
        if (!produto || typeof produto !== 'object') continue;
        const item = produto as Record<string, unknown>;
        const link = String(item.link ?? '').trim();
        if (!link || urlEhPaginaNaoProduto(link)) continue;
        const texto = normalizarChaveModeloAlfaNumerico(JSON.stringify(item));
        const score = termos.filter((termo) => texto.includes(termo)).length;
        if (score >= Math.min(3, termos.length) && (!melhor || score > melhor.score)) melhor = { url: link, score, codigos_encontrados: [], busca_utilizada: textoDescricao, tentativa: 0 };
      }
      if (melhor) return melhor;
    } catch {
      // A API de descrição é opcional; segue para o mecanismo HTML.
    }
  }
  const resultado = await descobrirAnuncioPorModelo(fonte, textoDescricao);
  return resultado ? { ...resultado, codigos_encontrados: [] } : null;
}

async function descobrirUrlAnuncioPorModelo(fonte: Record<string, unknown>, chave: string) {
  const resultado = await descobrirAnuncioPorModelo(fonte, chave);
  return resultado?.url ?? '';
}

export async function carregarFonteComparacao(empresaId: number, fonteId: number, dados: Record<string, unknown>, usuarioId: number) {
  const fonte = await consultarUm<Record<string, unknown>>(
    `SELECT * FROM pim_comparacao_fontes WHERE id = $1 AND empresa_id = $2 AND ativo = TRUE`,
    [fonteId, empresaId]
  );
  if (!fonte) throw new Error('Fonte de comparacao nao encontrada.');
  let url = String(dados.url ?? dados.anuncio_url ?? '').trim();
  if (urlEhPaginaNaoProduto(url)) url = '';
  const produtoId = dados.produto_id ? Number(dados.produto_id) : null;
  let chaveProduto = String(dados.chave_original ?? '').trim();
  let resultadoBusca: { url: string; score: number; codigos_encontrados: string[]; codigos_equivalentes?: Record<string, string>; busca_utilizada: string; tentativa: number; marca_confere?: boolean; btu_confere?: boolean } | null = null;
  let buscaPorDescricao = false;
  const descricaoProduto = String(dados.descricao ?? dados.nome_comercial ?? '').trim();
  let produtoContexto: Record<string, unknown> = { ...dados };
  if (produtoId && !chaveProduto) {
    const produto = await consultarUm<Record<string, unknown>>(
      `SELECT * FROM produtos WHERE id = $1 AND empresa_id = $2 AND excluido = FALSE`,
      [produtoId, empresaId]
    );
    if (!produto) throw new Error('Conjunto selecionado nao encontrado.');
    produtoContexto = { ...produtoContexto, ...produto };
    chaveProduto = String(obterChaveModeloAlfaNumerico(produto) ?? '').trim();
  } else if (produtoId) {
    const produto = await consultarUm<Record<string, unknown>>(
      `SELECT * FROM produtos WHERE id = $1 AND empresa_id = $2 AND excluido = FALSE`,
      [produtoId, empresaId]
    );
    if (produto) produtoContexto = { ...produtoContexto, ...produto };
  }
  if (!url && chaveProduto) {
    resultadoBusca = await descobrirAnuncioPorModelo(fonte, chaveProduto, produtoContexto);
    url = resultadoBusca?.url ?? '';
  }
  if (!url && descricaoProduto) {
    resultadoBusca = await descobrirAnuncioPorDescricao(fonte, descricaoProduto);
    buscaPorDescricao = Boolean(resultadoBusca?.url);
    url = resultadoBusca?.url ?? '';
  }
  if (!/^https?:\/\//i.test(url) || urlEhPaginaNaoProduto(url)) throw new Error('Não foi encontrado um anúncio específico por Modelo ou descrição. Informe a URL do produto selecionado.');
  const contextoValidacao = { ...produtoContexto, _fonte_codigo: String(fonte.codigo ?? '').toUpperCase() };
  let extraido = await extrairAnuncioComparacao(empresaId, { anuncio_url: url, chave_original: chaveProduto });
  let confiancaLinkInformado = compararChavesModeloAlfaNumericoValidado(chaveProduto, valoresModeloParaValidacao(extraido.dados as Record<string, unknown>, [extraido.modelo, extraido.titulo]), contextoValidacao);
  if (chaveProduto && confiancaLinkInformado.percentual === 0 && !buscaPorDescricao) {
    const redescoberto = await descobrirAnuncioPorModelo(fonte, chaveProduto, produtoContexto);
    if (redescoberto?.url && redescoberto.url !== url) {
      resultadoBusca = redescoberto;
      url = redescoberto.url;
      extraido = await extrairAnuncioComparacao(empresaId, { anuncio_url: url, chave_original: chaveProduto });
      confiancaLinkInformado = compararChavesModeloAlfaNumericoValidado(chaveProduto, valoresModeloParaValidacao(extraido.dados as Record<string, unknown>, [extraido.modelo, extraido.titulo]), contextoValidacao);
    }
  }
  if (chaveProduto && confiancaLinkInformado.percentual === 0) throw new Error('O anúncio encontrado não confirmou nenhum código do Modelo.');
  if (dados.anuncio_url && chaveProduto && confiancaLinkInformado.percentual < 100) {
    const redescoberto = await descobrirAnuncioPorModelo(fonte, chaveProduto, produtoContexto);
    const correspondenciasAtuais = Number((confiancaLinkInformado as Record<string, unknown>).correspondencias ?? 0);
    if (redescoberto?.url && (redescoberto.url !== url || redescoberto.score > correspondenciasAtuais)) {
      resultadoBusca = redescoberto;
      url = redescoberto.url;
      extraido = await extrairAnuncioComparacao(empresaId, { anuncio_url: url, chave_original: chaveProduto });
    }
  }
  const regras = (fonte.regras && typeof fonte.regras === 'object' ? fonte.regras : {}) as Record<string, unknown>;
  const dadosOriginais = (extraido.dados ?? {}) as Record<string, unknown>;
  const deParaAtualizado = await descobrirDeParaConcorrente(empresaId, dadosOriginais, regras);
  const regrasAtualizadas = { ...regras, de_para: deParaAtualizado };
  const dadosMapeados = mapearAtributosConcorrente(dadosOriginais, regrasAtualizadas);
  const candidatosPagina = valoresModeloParaValidacao(dadosOriginais, [extraido.modelo, extraido.titulo]);
  const confiancaPagina = compararChavesModeloAlfaNumericoValidado(chaveProduto, candidatosPagina, contextoValidacao);
  const codigosEncontrados = Array.from(new Set([...(resultadoBusca?.codigos_encontrados ?? []), ...(confiancaPagina.codigos_encontrados ?? [])]));
  const codigosEquivalentes = { ...(resultadoBusca?.codigos_equivalentes ?? {}), ...(confiancaPagina.codigos_equivalentes ?? {}) };
  const confiancaModelo = {
    codigos_total: partesChaveModeloAlfaNumerico(chaveProduto).length,
    codigos_encontrados: codigosEncontrados,
    correspondencias: codigosEncontrados.length,
    percentual: partesChaveModeloAlfaNumerico(chaveProduto).length ? Math.round((codigosEncontrados.length / partesChaveModeloAlfaNumerico(chaveProduto).length) * 100) : confiancaPagina.percentual,
    busca_utilizada: resultadoBusca?.busca_utilizada ?? chaveProduto,
    tentativa: resultadoBusca?.tentativa ?? 0,
    consulta_completa: resultadoBusca?.tentativa === 0,
    marca_confere: resultadoBusca?.marca_confere,
    btu_confere: resultadoBusca?.btu_confere,
    codigos_equivalentes: codigosEquivalentes,
    url_especifica: url,
    chave_pagina: candidatosPagina,
    percentual_pagina: confiancaPagina.percentual
  };
  const dadosPersistidos = {
    ...dadosOriginais,
    ...dadosMapeados,
    _DADOS_BRUTOS: dadosOriginais,
    _DEPARA_APLICADO: deParaAtualizado,
    _DADOS_MAPEADOS: dadosMapeados,
    _CONFIANCA_MODELO: confiancaModelo
  };
  await consultar(
    `UPDATE pim_comparacao_fontes SET regras = $3::JSONB, alterado_em = NOW() WHERE id = $1 AND empresa_id = $2`,
    [fonteId, empresaId, JSON.stringify(regrasAtualizadas)]
  );
  const registro = await salvarComparacaoAnuncio(empresaId, {
    ...extraido,
    fonte_id: fonteId,
    produto_id: produtoId,
    chave_original: chaveProduto || extraido.chave_original,
    dados: dadosPersistidos,
    status: 'PENDENTE',
    origem: 'ANUNCIO_AUTOMATICO'
  }, usuarioId);
  return { fonte: { ...fonte, regras: regrasAtualizadas }, registro, extraido, dados_mapeados: dadosMapeados, de_para: deParaAtualizado };
}

export async function extrairAnuncioComparacao(empresaId: number, dados: Record<string, unknown>) {
  const url = String(dados.anuncio_url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Informe uma URL http(s) valida do anuncio.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const resposta = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ControlS-Hub-PIM/1.0 (comparacao-de-produtos)' }
    });
    const html = (await resposta.text()).slice(0, 4_000_000);
    if (!resposta.ok) throw new Error(`Nao foi possivel ler o anuncio: HTTP ${resposta.status}.`);
    const produtos = extrairJsonLdProdutos(html);
    const produtoLd = produtos.find((item) => {
      const tipo = item['@type'];
      return tipo === 'Product' || (Array.isArray(tipo) && tipo.includes('Product'));
    }) ?? produtos[0] ?? {};
    const dadosExtraidos: Record<string, unknown> = normalizarMapaConcorrente({
      ...extrairAtributosHtml(html),
      ...extrairAtributosJsonLd(produtoLd),
      TITULO: produtoLd.name ?? extrairMetaHtml(html, 'og:title'),
      DESCRICAO: produtoLd.description ?? extrairMetaHtml(html, 'description'),
      URL_CANONICA: extrairMetaHtml(html, 'og:url') || url,
      ANUNCIO_URL: url,
      __MIDIA_CANDIDATOS: extrairMidiaCandidataHtml(html, url, produtoLd)
    });
    const midiaApi = await enriquecerDadosPorApiConcorrente(url, html, produtoLd, dadosExtraidos);
    const midiaAtual = dadosExtraidos.__MIDIA_CANDIDATOS && typeof dadosExtraidos.__MIDIA_CANDIDATOS === 'object'
      ? dadosExtraidos.__MIDIA_CANDIDATOS as Record<string, unknown>
      : {};
    dadosExtraidos.__MIDIA_CANDIDATOS = {
      ...midiaAtual,
      imagens: Array.from(new Set([...(Array.isArray(midiaAtual.imagens) ? midiaAtual.imagens : []), ...midiaApi.imagens])).slice(0, 80),
      manuais: Array.from(new Set([...(Array.isArray(midiaAtual.manuais) ? midiaAtual.manuais : []), ...midiaApi.manuais])).slice(0, 40)
    };
    const marca = typeof produtoLd.brand === 'object' && produtoLd.brand !== null
      ? String((produtoLd.brand as Record<string, unknown>).name ?? '')
      : String(produtoLd.brand ?? dadosExtraidos.MARCA ?? '');
    const modelo = String(produtoLd.model ?? dadosExtraidos.MODELO ?? produtoLd.mpn ?? '');
    const chave = String(dados.chave_original ?? produtoLd.mpn ?? produtoLd.sku ?? modelo ?? '').trim();
    return {
      anuncio_url: url,
      titulo: String(produtoLd.name ?? dadosExtraidos.TITULO ?? ''),
      marca,
      modelo,
      chave_original: chave,
      chave_normalizada: normalizarChaveModeloAlfaNumerico(chave),
      dados: dadosExtraidos,
      fonte: 'JSON-LD_META_HTML',
      pagina_http: resposta.status
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function salvarComparacaoAnuncio(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const fonteId = Number(dados.fonte_id);
  const fonte = await consultarUm<{ id: number }>(
    `SELECT id FROM pim_comparacao_fontes WHERE id = $1 AND empresa_id = $2 AND ativo = TRUE`,
    [fonteId, empresaId]
  );
  if (!fonte) throw new Error('Fonte de comparacao nao encontrada.');
  const limitarTexto = (valor: unknown, limite: number) => String(valor ?? '').trim().slice(0, limite);
  const anuncioUrl = String(dados.anuncio_url ?? '').trim();
  const chaveOriginal = limitarTexto(dados.chave_original ?? dados.modelo_alfa_numerico, 260);
  if (!anuncioUrl || !chaveOriginal) throw new Error('Informe a URL do anuncio e a chave Modelo Alfa Numerico.');
  const produtoId = dados.produto_id ? Number(dados.produto_id) : null;
  let chaveCadastro = '';
  if (produtoId) {
    const produto = await consultarUm<Record<string, unknown>>(
      `SELECT * FROM produtos WHERE id = $1 AND empresa_id = $2 AND excluido = FALSE`,
      [produtoId, empresaId]
    );
    if (!produto) throw new Error('Produto selecionado nao encontrado.');
    chaveCadastro = String(obterChaveModeloAlfaNumerico(produto) ?? '').trim();
  }
  const confiabilidade = chaveCadastro
    ? compararChavesModeloAlfaNumericoValidado(
      chaveCadastro,
      valoresModeloParaValidacao((dados.dados as Record<string, unknown> | undefined) ?? {}, [dados.modelo, dados.titulo]),
      { ...dados, _fonte_codigo: String((dados.fonte_codigo ?? dados.codigo_fonte) ?? '').toUpperCase() }
    )
    : { chave_cadastro_normalizada: '', chave_origem_normalizada: normalizarChaveModeloAlfaNumerico(chaveOriginal), correspondencias: 0, total: partesChaveModeloAlfaNumerico(chaveOriginal).length, percentual: 0, exata: false };
  return consultarUm(
    `INSERT INTO pim_comparacao_registros (
      empresa_id, fonte_id, produto_id, chave_original, chave_normalizada, anuncio_url,
      titulo, marca, modelo, dados, confiabilidade, status, origem, alterado_em, criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), COALESCE($10, '{}'::JSONB), COALESCE($11, '{}'::JSONB), $12, $13, NOW(), $14)
    ON CONFLICT (empresa_id, fonte_id, produto_id) WHERE produto_id IS NOT NULL DO UPDATE SET
      produto_id = EXCLUDED.produto_id,
      chave_original = EXCLUDED.chave_original,
      chave_normalizada = EXCLUDED.chave_normalizada,
      titulo = EXCLUDED.titulo,
      marca = EXCLUDED.marca,
      modelo = EXCLUDED.modelo,
      dados = EXCLUDED.dados,
      confiabilidade = EXCLUDED.confiabilidade,
      status = EXCLUDED.status,
      origem = EXCLUDED.origem,
      alterado_em = NOW()
    RETURNING *`,
    [
      empresaId,
      fonteId,
      produtoId,
      chaveOriginal,
      normalizarChaveModeloAlfaNumerico(chaveOriginal),
      anuncioUrl,
      limitarTexto(dados.titulo, 320),
      limitarTexto(dados.marca, 180),
      limitarTexto(dados.modelo, 220),
      JSON.stringify(dados.dados ?? {}),
      JSON.stringify(confiabilidade),
      String(dados.status ?? 'PENDENTE'),
      String(dados.origem ?? 'MANUAL'),
      usuarioId
    ]
  );
}

export async function listarComparacoesProduto(empresaId: number, produtoId?: number) {
  return consultar(
    `SELECT r.*, f.codigo AS fonte_codigo, f.nome AS fonte_nome, f.tipo_fonte
    FROM pim_comparacao_registros r
    INNER JOIN pim_comparacao_fontes f ON f.id = r.fonte_id
    WHERE r.empresa_id = $1
      AND ($2::BIGINT IS NULL OR r.produto_id = $2)
    ORDER BY r.alterado_em DESC NULLS LAST, r.criado_em DESC
    LIMIT 10000`,
    [empresaId, produtoId ?? null]
  );
}

export async function listarCoberturaComparacaoConcorrentes(empresaId: number) {
  return consultar(
    `WITH ultimos AS (
      SELECT DISTINCT ON (r.produto_id, r.fonte_id)
        r.produto_id,
        r.fonte_id,
        f.codigo AS fonte_codigo,
        f.nome AS fonte_nome,
        r.anuncio_url,
        r.dados,
        r.confiabilidade,
        r.alterado_em
      FROM pim_comparacao_registros r
      INNER JOIN pim_comparacao_fontes f ON f.id = r.fonte_id
      WHERE r.empresa_id = $1
        AND f.empresa_id = $1
        AND f.tipo_fonte = 'CONCORRENTE'
        AND f.ativo = TRUE
        AND r.produto_id IS NOT NULL
      ORDER BY r.produto_id, r.fonte_id, r.alterado_em DESC NULLS LAST, r.id DESC
    )
    SELECT
      produto_id,
      fonte_id,
      fonte_codigo,
      fonte_nome,
      anuncio_url,
      COALESCE(NULLIF(dados #>> '{_CONFIANCA_MODELO,codigos_total}', '')::INTEGER, NULLIF(confiabilidade->>'total', '')::INTEGER, 0) AS codigos_total,
      COALESCE(NULLIF(dados #>> '{_CONFIANCA_MODELO,correspondencias}', '')::INTEGER, NULLIF(confiabilidade->>'correspondencias', '')::INTEGER, 0) AS correspondencias,
      COALESCE(dados #> '{_CONFIANCA_MODELO,codigos_encontrados}', '[]'::JSONB) AS codigos_encontrados,
      COALESCE(NULLIF(dados #>> '{_CONFIANCA_MODELO,percentual}', '')::INTEGER, NULLIF(confiabilidade->>'percentual', '')::INTEGER, 0) AS percentual,
      alterado_em
    FROM ultimos
    ORDER BY produto_id ASC, fonte_codigo ASC`,
    [empresaId]
  );
}

export async function salvarConsolidadoComparacaoProduto(empresaId: number, produtoId: number, dados: Record<string, unknown>, usuarioId: number) {
  const codigo = String(dados.codigo ?? '').trim();
  const valor = String(dados.valor ?? '').trim();
  if (!codigo) throw new Error('Informe o código do atributo para salvar o Consolidado.');
  const produto = await consultarUm<Record<string, unknown>>(
    `SELECT id, fiscal_comercial FROM produtos WHERE id = $1 AND empresa_id = $2 AND excluido = FALSE`,
    [produtoId, empresaId]
  );
  if (!produto) throw new Error('Produto/conjunto não encontrado.');
  const fiscal = produto.fiscal_comercial && typeof produto.fiscal_comercial === 'object' ? produto.fiscal_comercial as Record<string, unknown> : {};
  const comparacao = fiscal.ComparacaoConcorrentes && typeof fiscal.ComparacaoConcorrentes === 'object' ? fiscal.ComparacaoConcorrentes as Record<string, unknown> : {};
  const consolidado = comparacao.Consolidado && typeof comparacao.Consolidado === 'object' ? comparacao.Consolidado as Record<string, unknown> : {};
  consolidado[codigo] = { valor, origem: 'MANUAL', alterado_em: new Date().toISOString(), alterado_por: usuarioId };
  const novoFiscal = { ...fiscal, ComparacaoConcorrentes: { ...comparacao, Consolidado: consolidado } };
  await consultar(`UPDATE produtos SET fiscal_comercial = $3::JSONB, alterado_em = NOW() WHERE id = $1 AND empresa_id = $2`, [produtoId, empresaId, JSON.stringify(novoFiscal)]);
  return { codigo, valor, origem: 'MANUAL' };
}

export async function obterMatrizComparacaoProduto(empresaId: number, produtoId: number) {
  const produto = await consultarUm<Record<string, unknown>>(
    `    SELECT id, codigo_interno, sku_interno, codigo_erp_decis, ean_gtin, mpn, ncm, cest, nome_comercial, descricao_interna, marca, linha, modelo, familia, categoria, tipo_produto, status, peso, altura, largura, comprimento, alterado_em, fiscal_comercial, pendencias_validacao

    FROM produtos
    WHERE id = $1 AND empresa_id = $2 AND excluido = FALSE`,
    [produtoId, empresaId]
  );
  if (!produto) throw new Error('Produto/conjunto nao encontrado.');

  const fontes = await consultar(
    `SELECT id, codigo, nome, tipo_fonte, prioridade, url_base
    FROM pim_comparacao_fontes
    WHERE empresa_id = $1 AND ativo = TRUE AND tipo_fonte = 'CONCORRENTE'
    ORDER BY prioridade ASC, nome ASC`,
    [empresaId]
  );

  const atributosBrutos = await consultar(
    `SELECT a.codigo, a.nome, COALESCE(ag.nome, 'Atributos ERP') AS grupo, a.tipo_campo, a.unidade_medida, a.ordem,
      COALESCE(
        (SELECT er.dados->>a.codigo
         FROM pim_comparacao_registros er
         WHERE er.empresa_id = $1 AND er.produto_id = $2 AND er.origem = 'ATRIBUTOS_ERP'
         ORDER BY er.alterado_em DESC NULLS LAST, er.id DESC LIMIT 1),
        p.fiscal_comercial->'TecnicosERP'->>a.codigo
      ) AS valor_erp,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'fonte_id', cf.id,
          'fonte_codigo', cf.codigo,
          'fonte_nome', cf.nome,
          'valor', rr.dados->>a.codigo,
          'anuncio_url', rr.anuncio_url,
          'titulo', rr.titulo,
          'status', COALESCE(rr.status, 'SEM_DADO')
        ) ORDER BY cf.prioridade ASC, cf.nome ASC)
        FROM pim_comparacao_fontes cf
        LEFT JOIN pim_comparacao_registros rr
          ON rr.fonte_id = cf.id
          AND rr.empresa_id = $1
          AND (rr.produto_id = $2 OR rr.chave_normalizada = regexp_replace(upper(COALESCE(p.fiscal_comercial->'Identificacao'->>'modelo_alfa_numerico', '')), '[^A-Z0-9]', '', 'g'))
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/search?%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/busca?%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/catalogsearch/result%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/searchresults%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%centralar.com.br/tipos-de-ar-condicionado%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%leveros.com.br/pagina/%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/parceiros%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/rastreio%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/login%'
          AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/checkout%'
          AND NOT (cf.codigo = 'WEBCONTINENTAL' AND COALESCE(lower(rr.anuncio_url), '') NOT LIKE '%/p%')
        WHERE cf.empresa_id = $1 AND cf.ativo = TRUE AND cf.tipo_fonte = 'CONCORRENTE'
      ), '[]'::JSONB) AS valores_fontes
    FROM pim_comparacao_atributos a
    INNER JOIN pim_comparacao_fontes base ON base.id = a.fonte_id
    LEFT JOIN atributos ma ON ma.empresa_id = $1 AND ma.codigo = a.codigo AND ma.ativo = TRUE
    LEFT JOIN atributos_grupos ag ON ag.id = ma.atributo_grupo_id
    CROSS JOIN produtos p
    WHERE p.id = $2 AND p.empresa_id = $1 AND base.codigo = 'ERP_ATRIBUTOS'
      AND base.id = (SELECT id FROM pim_comparacao_fontes WHERE empresa_id = $1 AND ativo = TRUE AND codigo = 'ERP_ATRIBUTOS' LIMIT 1)
      AND a.ativo = TRUE
    ORDER BY a.ordem ASC, a.nome ASC`,
    [empresaId, produtoId]
  );
  const atributos: Array<Record<string, unknown>> = (atributosBrutos as Array<Record<string, unknown>>).map((atributo) => ({
    ...atributo,
    valor_erp: normalizarValorConcorrente(atributo.valor_erp),
    valores_fontes: Array.isArray(atributo.valores_fontes)
      ? (atributo.valores_fontes as Array<Record<string, unknown>>).map((valor) => ({ ...valor, valor: normalizarValorConcorrente(valor.valor) }))
      : []
  }));

  const fiscalProduto = produto.fiscal_comercial && typeof produto.fiscal_comercial === 'object' ? produto.fiscal_comercial as Record<string, unknown> : {};
  const comparacaoProduto = fiscalProduto.ComparacaoConcorrentes && typeof fiscalProduto.ComparacaoConcorrentes === 'object' ? fiscalProduto.ComparacaoConcorrentes as Record<string, unknown> : {};
  const consolidadoManual = comparacaoProduto.Consolidado && typeof comparacaoProduto.Consolidado === 'object' ? comparacaoProduto.Consolidado as Record<string, unknown> : {};
  const registrosFontes = await consultar(
    `SELECT r.id, r.produto_id, r.fonte_id, f.codigo AS fonte_codigo, f.nome AS fonte_nome, r.anuncio_url, r.titulo, r.marca, r.modelo, r.status, r.origem, r.dados, f.regras
     FROM pim_comparacao_registros r
     INNER JOIN pim_comparacao_fontes f ON f.id = r.fonte_id
     WHERE r.empresa_id = $1 AND r.produto_id = $2 AND f.tipo_fonte = 'CONCORRENTE'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/search?%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/busca?%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/catalogsearch/result%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/searchresults%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%centralar.com.br/tipos-de-ar-condicionado%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%leveros.com.br/pagina/%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/parceiros%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/rastreio%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/login%'
       AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/checkout%'
       AND NOT (f.codigo = 'WEBCONTINENTAL' AND COALESCE(lower(r.anuncio_url), '') NOT LIKE '%/p%')
     ORDER BY f.prioridade ASC, f.nome ASC, r.alterado_em DESC NULLS LAST, r.id DESC`,
    [empresaId, produtoId]
  );
  const codigosMestres = new Set(atributos.map((item) => String(item.codigo ?? '').trim()).filter(Boolean));
  const destinosConhecidosPim = new Set([
    ...codigosMestres,
    ...CAMPOS_DIRETOS_CONJUNTO.map((campo) => campo.codigo),
    ...Object.values(DEPARA_CONCORRENTE_PADRAO),
    'ITEM', 'DESCRICAO', 'REFERENCIA', 'MARCA', 'MODELO', 'CODIGO_FABRICANTE', 'CODIGO_NCM',
    'ALTURA', 'LARGURA', 'PROFUNDIDADE', 'ALTURA_EMBALADO', 'LARGURA_EMBALADO', 'PROFUNDIDADE_EMBALADO',
    'PESO', 'PESO_LIQUIDO', 'VENDA_PADRAO', 'VENDA_CARTAO', 'VENDA_A_VISTA', 'CFF', 'CFFUSO', 'DISP', 'FIS', 'RES', 'ULTIMA_ALTERACAO'
  ]);
  const registrosComRevisao: Array<Record<string, unknown>> = (registrosFontes as Array<Record<string, unknown>>).map((registro) => {
    const dadosPersistidos = registro.dados && typeof registro.dados === 'object' ? registro.dados as Record<string, unknown> : {};
    const dadosOriginais = dadosPersistidos._DADOS_BRUTOS && typeof dadosPersistidos._DADOS_BRUTOS === 'object'
      ? dadosPersistidos._DADOS_BRUTOS as Record<string, unknown>
      : dadosPersistidos;
    const dados = normalizarMapaConcorrente(dadosOriginais);
    const deParaAplicado = dadosPersistidos._DEPARA_APLICADO && typeof dadosPersistidos._DEPARA_APLICADO === 'object'
      ? dadosPersistidos._DEPARA_APLICADO as Record<string, unknown>
      : {};
    const campos = Object.entries(dados)
      .filter(([origem]) => origem !== '_DADOS_BRUTOS' && origem !== '_DEPARA_APLICADO' && origem !== '_DADOS_MAPEADOS' && !origem.startsWith('__'))
      .map(([origem, valor]) => {
        const destino = String(deParaAplicado[origem] ?? '').trim();
        const mapeado = Boolean(destino) && destinosConhecidosPim.has(destino);
        return {
          origem,
          valor,
          destino_sugerido: mapeado ? destino : '',
          status: mapeado ? 'VINCULADO' : 'PENDENTE'
        };
      });
    return {
      ...registro,
      dados_brutos: dados,
      midia_candidata: dadosPersistidos.__MIDIA_CANDIDATOS && typeof dadosPersistidos.__MIDIA_CANDIDATOS === 'object' ? dadosPersistidos.__MIDIA_CANDIDATOS : { imagens: [], manuais: [] },
      campos_mapeados: campos.filter((campo) => campo.status === 'VINCULADO'),
      campos_pendentes: campos.filter((campo) => campo.status === 'PENDENTE')
    };
  });
  const codigosAtributosExistentes = new Set(atributos.map((atributo) => String(atributo.codigo ?? '').trim()));
  const maiorOrdem = atributos.reduce((maior, atributo) => Math.max(maior, Number(atributo.ordem ?? 0)), 0);
  const atributosComCamposDiretos: Array<Record<string, unknown>> = [
    ...atributos.map((atributo) => {
      const valorDireto = valorDiretoConjunto(produto, String(atributo.codigo ?? ''));
      return { ...atributo, valor_erp: atributo.valor_erp ?? valorDireto ?? null };
    }),
    ...CAMPOS_DIRETOS_CONJUNTO
      .filter((campo) => !codigosAtributosExistentes.has(campo.codigo))
      .map((campo, indice) => ({
        codigo: campo.codigo,
        nome: campo.nome,
        grupo: campo.grupo,
        tipo_campo: 'TEXTO',
        unidade_medida: campo.unidade_medida ?? null,
        ordem: maiorOrdem + indice + 1,
        valor_erp: valorDiretoConjunto(produto, campo.codigo) ?? null,
        valores_fontes: registrosComRevisao.map((registro) => {
          const persistido = registro.dados && typeof registro.dados === 'object' ? registro.dados as Record<string, unknown> : {};
                      const mapeado = persistido._DADOS_MAPEADOS && typeof persistido._DADOS_MAPEADOS === 'object' ? normalizarMapaConcorrente(persistido._DADOS_MAPEADOS as Record<string, unknown>) : normalizarMapaConcorrente(persistido);

          return {
            fonte_id: registro.fonte_id,
            fonte_codigo: registro.fonte_codigo,
            fonte_nome: registro.fonte_nome,
            valor: mapeado[campo.codigo] ?? null,
            anuncio_url: registro.anuncio_url,
            titulo: registro.titulo,
            status: registro.status ?? 'SEM_DADO'
          };
        })
      }))
  ];
  const pendencias = registrosComRevisao.flatMap((registro) => (registro.campos_pendentes as Array<Record<string, unknown>>).map((campo) => ({
    ...campo,
    registro_id: registro.id,
    fonte_id: registro.fonte_id,
    fonte_codigo: registro.fonte_codigo,
    fonte_nome: registro.fonte_nome,
    anuncio_url: registro.anuncio_url
  })));
  const atributosComConsolidado = atributosComCamposDiretos.map((atributo) => ({
    ...atributo,
    consolidado_manual: consolidadoManual[String(atributo.codigo)] ?? null
  }));
  return { produto, fontes, atributos: atributosComConsolidado, consolidado: consolidadoManual, registros_fontes: registrosComRevisao, pendencias_de_para: pendencias };
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

export async function listarCandidatosMidiaProduto(empresaId: number, produtoId: number) {
  const registros = await consultar<Record<string, unknown>>(
    `SELECT r.id AS registro_id, r.produto_id, r.fonte_id, f.codigo AS fonte_codigo, f.nome AS fonte_nome, r.anuncio_url, r.titulo, r.marca, r.modelo, r.dados->'__MIDIA_CANDIDATOS' AS midia
     FROM pim_comparacao_registros r
     INNER JOIN pim_comparacao_fontes f ON f.id = r.fonte_id
     WHERE r.empresa_id = $1 AND r.produto_id = $2 AND f.tipo_fonte = 'CONCORRENTE'
       AND r.dados ? '__MIDIA_CANDIDATOS'
     ORDER BY f.prioridade ASC, f.nome ASC, r.id DESC`,
    [empresaId, produtoId]
  );
  const candidatos: Array<Record<string, unknown>> = [];
  const vistos = new Set<string>();
  for (const registro of registros) {
    const midia = registro.midia && typeof registro.midia === 'object' ? registro.midia as Record<string, unknown> : {};
    const adicionar = (tipo: 'IMAGEM' | 'MANUAL', valor: unknown) => {
      const url = String(valor ?? '').trim();
      if (!/^https?:\/\//i.test(url) || vistos.has(`${tipo}:${url}`)) return;
      vistos.add(`${tipo}:${url}`);
      candidatos.push({
        tipo,
        url,
        produto_id: produtoId,
        registro_id: registro.registro_id,
        fonte_id: registro.fonte_id,
        fonte_codigo: registro.fonte_codigo,
        fonte_nome: registro.fonte_nome,
        anuncio_url: registro.anuncio_url,
        titulo: registro.titulo,
        marca: registro.marca,
        modelo: registro.modelo,
        status: 'PENDENTE_ESCOLHA'
      });
    };
    (Array.isArray(midia.imagens) ? midia.imagens : []).forEach((valor) => adicionar('IMAGEM', valor));
    (Array.isArray(midia.manuais) ? midia.manuais : []).forEach((valor) => adicionar('MANUAL', valor));
  }
  return candidatos;
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
  const campos = ['codigo_referencia', 'modelo_alfa_numerico', 'codigo_fabricante', 'nome_comercial', 'marca', 'modelo', 'categoria', 'ciclo', 'tensao', 'btu', 'tecnologia', 'garantia'];
  const chaveCadastro = obterChaveModeloAlfaNumerico(produto);
  const chaveOrigem = sugestao.modelo_alfa_numerico ?? sugestao.codigo_referencia ?? sugestao.referencias ?? '';
  return campos.map((campo) => {
    const valorCadastro = campo === 'modelo_alfa_numerico' ? chaveCadastro : produto[campo] ?? '';
    const valorIa = campo === 'modelo_alfa_numerico' ? chaveOrigem : sugestao[campo] ?? '';
    const compararComoChave = campo === 'modelo_alfa_numerico' || campo === 'codigo_referencia';
    return {
      campo,
      valor_cadastro: valorCadastro,
      valor_ia: valorIa,
      valor_escolhido: valorCadastro || valorIa,
      diferente: compararComoChave
        ? normalizarChaveModeloAlfaNumerico(valorCadastro) !== normalizarChaveModeloAlfaNumerico(valorIa)
        : String(valorCadastro) !== String(valorIa)
    };
  });
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
  const chaveModeloAlfaNumerico = String(dados.modelo_alfa_numerico ?? obterChaveModeloAlfaNumerico(produto) ?? '').trim();
  const codigoReferencia = String(dados.codigo_referencia ?? '').trim()
    || chaveModeloAlfaNumerico
    || String(dados.codigo_fabricante ?? produto.codigo_fabricante ?? produto.modelo ?? '').trim();
  const referencias = partesChaveModeloAlfaNumerico(codigoReferencia);
  const confiabilidadeBase = compararChavesModeloAlfaNumerico(chaveModeloAlfaNumerico || codigoReferencia, codigoReferencia);
  if (!codigoReferencia) throw new Error('Informe o Modelo Alfa Numerico para comparar as referencias do ERP e do concorrente.');

  if (!chave || configuracao?.ativo === false) {
    const sugestao = { codigo_referencia: codigoReferencia, modelo_alfa_numerico: codigoReferencia, referencias, fonte_prioritaria: sitePrioritario };
    return {
      configurado: false,
      modelo,
      site_prioritario: sitePrioritario,
      mensagem: 'IA nao configurada/ativa. Salve a chave OpenAI e ative a IA para consultar dados externos.',
      confiabilidade: confiabilidadeBase,
      comparacao: montarComparacaoIa({ ...produto, codigo_referencia: codigoReferencia }, sugestao)
    };
  }

  const prompt = `Busque informacoes publicas de um conjunto de ar-condicionado no site ${sitePrioritario} usando a chave Modelo Alfa Numerico do ERP. Chave original: ${codigoReferencia}. Chave normalizada: ${normalizarChaveModeloAlfaNumerico(codigoReferencia)}. Separe as referencias por pipe quando houver, considerando condensadora, evaporadora, controle e kit: ${referencias.join(' | ')}. Retorne somente JSON com campos codigo_referencia, modelo_alfa_numerico, referencias, nome_comercial, marca, modelo, categoria, ciclo, tensao, btu, tecnologia, garantia, fonte_url e observacoes.`;
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
    if (!sugestao.modelo_alfa_numerico) {
      sugestao.modelo_alfa_numerico = sugestao.codigo_referencia ?? sugestao.referencias ?? '';
    }
  } catch (error) {
    sugestao = { codigo_referencia: codigoReferencia, referencias, observacoes: error instanceof Error ? error.message : 'Falha ao consultar IA.' };
  }

  await consultar(
    `INSERT INTO ia_sugestoes (produto_id, tipo_sugestao, entrada, sugestao, status, criado_por_usuario_id)
    VALUES ($1, 'ENRIQUECIMENTO_LEVEROS', $2::JSONB, $3::JSONB, 'GERADA', $4)`,
    [produtoId, JSON.stringify({ codigo_referencia: codigoReferencia, chave_modelo_alfa_numerico: normalizarChaveModeloAlfaNumerico(codigoReferencia), referencias, site_prioritario: sitePrioritario, modelo }), JSON.stringify({ sugestao, bruto }), usuarioId]
  );

  const confiabilidade = compararChavesModeloAlfaNumerico(chaveModeloAlfaNumerico || codigoReferencia, sugestao.modelo_alfa_numerico ?? sugestao.codigo_referencia ?? sugestao.referencias ?? '');
  return {
    configurado: true,
    modelo,
    site_prioritario: sitePrioritario,
    sugestao,
    confiabilidade,
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
  if (!/^(DECLARE|SELECT|WITH|EXEC|EXECUTE|CALL)\s/i.test(sql)) {
    throw new Error('A consulta SQL Server deve iniciar com DECLARE, SELECT, WITH, EXEC, EXECUTE ou CALL.');
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
    linhas: resultado.linhas,
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
  const chaveModeloAlfaNumerico = normalizarChaveModeloAlfaNumerico(obterChaveModeloAlfaNumerico(produto as Record<string, unknown>));
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
        OR ($7::TEXT IS NOT NULL AND regexp_replace(upper(COALESCE(fiscal_comercial->'Identificacao'->>'modelo_alfa_numerico', '')), '[^A-Z0-9]', '', 'g') = $7)
      )
    ORDER BY alterado_em DESC NULLS LAST, criado_em DESC
    LIMIT 1`,
    [
      empresaId,
      produto.sku_interno ?? null,
      produto.codigo_erp_decis ?? null,
      produto.ean_gtin ?? produto.ean ?? produto.gtin ?? null,
      produto.codigo_fabricante ?? null,
      produto.modelo ?? null,
      chaveModeloAlfaNumerico || null
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

