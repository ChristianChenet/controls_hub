import { consultar, consultarUm } from '../../banco/conexao.js';

type ChaveCotacao = {
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  codigoChave: string;
};

function montarIdCotacaoSql(alias = 'c') {
  return `CONCAT_WS('|', ${alias}.empresa_id, ${alias}.tipo_documento, ${alias}.numero_documento, ${alias}.codigo_chave)`;
}

function interpretarChaveCotacao(empresaId: number, valor: string | number): ChaveCotacao {
  const texto = decodeURIComponent(String(valor ?? '')).trim();
  const partes = texto.split('|');

  if (partes.length >= 4) {
    return {
      empresaId: Number(partes[0]) || empresaId,
      tipoDocumento: partes[1],
      numeroDocumento: partes[2],
      codigoChave: partes.slice(3).join('|')
    };
  }

  return {
    empresaId,
    tipoDocumento: '',
    numeroDocumento: '',
    codigoChave: texto
  };
}

async function resolverCotacaoBase(empresaId: number, cotacaoId: string | number) {
  const chave = interpretarChaveCotacao(empresaId, cotacaoId);

  if (chave.tipoDocumento && chave.numeroDocumento && chave.codigoChave) {
    return consultarUm<{
      id: number;
      empresa_id: number;
      tipo_documento: string;
      numero_documento: string;
      codigo_chave: string;
    }>(
      `SELECT id, empresa_id, tipo_documento, numero_documento, codigo_chave
      FROM cotacoes_frete
      WHERE empresa_id = $1
        AND tipo_documento = $2
        AND numero_documento = $3
        AND codigo_chave = $4`,
      [chave.empresaId, chave.tipoDocumento, chave.numeroDocumento, chave.codigoChave]
    );
  }

  const idNumerico = Number(cotacaoId);
  if (!Number.isFinite(idNumerico) || idNumerico <= 0) {
    return null;
  }

  return consultarUm<{
    id: number;
    empresa_id: number;
    tipo_documento: string;
    numero_documento: string;
    codigo_chave: string;
  }>(
    `SELECT id, empresa_id, tipo_documento, numero_documento, codigo_chave
    FROM cotacoes_frete
    WHERE empresa_id = $1
      AND id = $2`,
    [empresaId, idNumerico]
  );
}

export async function listarPedidosAptosEnvioMassa(empresaId: number, filtros: {
  situacao?: string;
  busca?: string;
  envio?: string;
  vendedor?: string;
  transportadora?: string;
}) {
  const situacao = filtros.situacao ?? 'ATIVOS';
  const busca = `%${String(filtros.busca ?? '').toLowerCase()}%`;
  const vendedor = filtros.vendedor ? `%${String(filtros.vendedor).toLowerCase()}%` : null;
  const transportadora = filtros.transportadora ? `%${String(filtros.transportadora).toLowerCase()}%` : null;

  return consultar(
    `SELECT
      ${montarIdCotacaoSql('c')} AS id,
      ${montarIdCotacaoSql('c')} AS cotacao_frete_id,
      c.tipo_documento,
      c.numero_documento,
      c.numero_pedido,
      c.data_documento,
      c.codigo_chave,
      c.situacao_pedido,
      c.status,
      c.vendedor_nome,
      c.transportadora_pedido_nome,
      COALESCE(c.valor_frete_pedido, 0) AS valor_frete_pedido,
      COALESCE(c.prazo_pedido_dias, 0) AS prazo_pedido_dias,
      c.nome_destinatario,
      c.cidade_destino,
      c.uf_destino,
      c.valor_mercadoria,
      COALESCE(c.bloqueado_para_alteracao, FALSE) AS bloqueado_para_alteracao,
      CASE
        WHEN c.status IN ('COTACAO_PENDENTE', 'COTACAO_AUTOMATICA') THEN TRUE
        ELSE FALSE
      END AS sugestao_cotacao,
      e.nome AS etapa_nome,
      COUNT(DISTINCT cft.transportadora_id) AS fornecedores_vinculados,
      COUNT(DISTINCT ef.transportadora_id) FILTER (WHERE ef.status_envio = 'ENVIADO') AS fornecedores_enviados,
      COALESCE(melhor.nome_fantasia, c.transportadora_pedido_nome, 'Sem transportadora') AS transportadora_referencia,
      melhor.transportadora_id AS transportadora_cotacao_automatica_id,
      melhor.nome_fantasia AS transportadora_cotacao_automatica,
      COALESCE(melhor.valor_frete, 0) AS valor_cotacao_automatica,
      COALESCE(melhor.prazo_dias, 0) AS prazo_cotacao_automatica,
      CASE
        WHEN COALESCE(c.valor_mercadoria, 0) > 0 THEN ROUND((COALESCE(c.valor_frete_pedido, 0) / c.valor_mercadoria) * 100, 2)
        ELSE 0
      END AS percentual_frete_pedido,
      CASE
        WHEN COALESCE(c.valor_mercadoria, 0) > 0 THEN ROUND((COALESCE(melhor.valor_frete, 0) / c.valor_mercadoria) * 100, 2)
        ELSE 0
      END AS percentual_frete_cotacao_automatica,
      ROUND(COALESCE(melhor.valor_frete, 0) - COALESCE(c.valor_frete_pedido, 0), 2) AS diferenca_valor_cotacao,
      CASE
        WHEN COALESCE(c.valor_frete_pedido, 0) > 0 THEN ROUND(((COALESCE(melhor.valor_frete, 0) - c.valor_frete_pedido) / c.valor_frete_pedido) * 100, 2)
        ELSE 0
      END AS diferenca_percentual_cotacao
    FROM cotacoes_frete c
    LEFT JOIN etapas_kanban e
      ON e.id = c.etapa_kanban_id
    LEFT JOIN cotacoes_frete_transportadoras cft
      ON cft.empresa_id = c.empresa_id
     AND cft.tipo_documento = c.tipo_documento
     AND cft.numero_documento = c.numero_documento
     AND cft.codigo_chave = c.codigo_chave
    LEFT JOIN cotacoes_frete_envios env
      ON env.empresa_id = c.empresa_id
     AND env.tipo_documento = c.tipo_documento
     AND env.numero_documento = c.numero_documento
     AND env.codigo_chave = c.codigo_chave
    LEFT JOIN cotacoes_frete_envios_fornecedores ef
      ON ef.empresa_id = env.empresa_id
     AND ef.tipo_documento = env.tipo_documento
     AND ef.numero_documento = env.numero_documento
     AND ef.codigo_chave = env.codigo_chave
     AND ef.numero_envio = env.numero_envio
    LEFT JOIN LATERAL (
      SELECT
        cftr.transportadora_id,
        t.nome_fantasia,
        cftr.valor_frete,
        COALESCE(cftr.prazo_dias, 0) AS prazo_dias
      FROM cotacoes_frete_transportadoras cftr
      INNER JOIN transportadoras t
        ON t.id = cftr.transportadora_id
      WHERE cftr.empresa_id = c.empresa_id
        AND cftr.tipo_documento = c.tipo_documento
        AND cftr.numero_documento = c.numero_documento
        AND cftr.codigo_chave = c.codigo_chave
        AND (
          UPPER(COALESCE(cftr.origem_cotacao, '')) IN ('ERP', 'AUTOMATICA', 'BANCO')
          OR UPPER(COALESCE(cftr.origem_detalhada, '')) LIKE '%AUTOMATICA%'
        )
      ORDER BY cftr.valor_frete ASC NULLS LAST, COALESCE(cftr.ranking_frete, 999999) ASC, cftr.transportadora_id ASC
      LIMIT 1
    ) melhor ON TRUE
    WHERE c.empresa_id = $1
      AND COALESCE(c.bloqueado_para_alteracao, FALSE) = FALSE
      AND c.status IN ('COTACAO_PENDENTE', 'COTACAO_AUTOMATICA', 'COTACAO_TRANSPORTADORA', 'EM_ANALISE')
      AND (
        $2 = 'TODOS'
        OR ($2 = 'ATIVOS' AND c.situacao_pedido = 'ATIVO' AND COALESCE(c.excluido, FALSE) = FALSE)
        OR ($2 = 'CANCELADOS' AND c.situacao_pedido = 'CANCELADO')
        OR ($2 = 'EXCLUIDOS' AND (c.situacao_pedido = 'EXCLUIDO' OR COALESCE(c.excluido, FALSE) = TRUE))
        OR ($2 = 'CANCELADOS_EXCLUIDOS' AND (c.situacao_pedido IN ('CANCELADO', 'EXCLUIDO') OR COALESCE(c.excluido, FALSE) = TRUE))
      )
      AND (
        $3 = '%%'
        OR LOWER(COALESCE(c.numero_documento, '')) LIKE $3
        OR LOWER(COALESCE(c.numero_pedido, '')) LIKE $3
        OR LOWER(COALESCE(c.codigo_chave, '')) LIKE $3
        OR LOWER(COALESCE(c.nome_destinatario, '')) LIKE $3
      )
      AND ($5::VARCHAR IS NULL OR LOWER(COALESCE(c.vendedor_nome, '')) LIKE $5)
      AND (
        $6::VARCHAR IS NULL
        OR LOWER(COALESCE(c.transportadora_pedido_nome, '')) LIKE $6
        OR LOWER(COALESCE(melhor.nome_fantasia, '')) LIKE $6
      )
    GROUP BY
      c.empresa_id,
      c.tipo_documento,
      c.numero_documento,
      c.numero_pedido,
      c.codigo_chave,
      c.situacao_pedido,
      c.status,
      c.vendedor_nome,
      c.transportadora_pedido_nome,
      c.valor_frete_pedido,
      c.prazo_pedido_dias,
      c.nome_destinatario,
      c.cidade_destino,
      c.uf_destino,
      c.valor_mercadoria,
      c.bloqueado_para_alteracao,
      e.nome,
      melhor.nome_fantasia,
      melhor.transportadora_id,
      melhor.valor_frete,
      melhor.prazo_dias
    HAVING (
      $4 = 'TODOS'
      OR ($4 = 'NAO_ENVIADOS' AND COUNT(DISTINCT ef.transportadora_id) FILTER (WHERE ef.status_envio = 'ENVIADO') = 0)
      OR ($4 = 'JA_ENVIADOS' AND COUNT(DISTINCT ef.transportadora_id) FILTER (WHERE ef.status_envio = 'ENVIADO') > 0)
    )
    ORDER BY c.criado_em DESC`,
    [empresaId, situacao, busca, filtros.envio ?? 'TODOS', vendedor, transportadora]
  );
}

export async function prepararEnvioMassa(empresaId: number, cotacoesIds: Array<string | number>) {
  if (!cotacoesIds.length) {
    return [];
  }

  return consultar(
    `SELECT
      ${montarIdCotacaoSql('c')} AS cotacao_id,
      ${montarIdCotacaoSql('c')} AS cotacao_frete_id,
      c.numero_documento,
      c.numero_pedido,
      c.codigo_chave,
      c.situacao_pedido,
      COALESCE(c.excluido, FALSE) AS excluido,
      c.status,
      t.id AS transportadora_id,
      t.nome_fantasia,
      t.email,
      t.sla_resposta_horas,
      t.prazo_resposta_obrigatorio,
      t.recebe_prazo_solicitado,
      t.apresenta_lista_produtos,
      cft.valor_frete,
      cft.ranking_frete,
      RANK() OVER (
        PARTITION BY c.empresa_id, c.tipo_documento, c.numero_documento, c.codigo_chave
        ORDER BY cft.valor_frete ASC NULLS LAST, COALESCE(cft.ranking_frete, 999999) ASC, cft.transportadora_id ASC
      ) AS posicao_cotacao,
      cft.origem_cotacao,
      ultimo_envio.url_publica AS ultimo_link_enviado,
      ultimo_envio.enviado_em AS ultimo_link_enviado_em,
      EXISTS (
        SELECT 1
        FROM cotacoes_frete_envios_fornecedores ef
        WHERE ef.empresa_id = c.empresa_id
          AND ef.tipo_documento = c.tipo_documento
          AND ef.numero_documento = c.numero_documento
          AND ef.codigo_chave = c.codigo_chave
          AND ef.transportadora_id = t.id
          AND ef.status_envio = 'ENVIADO'
      ) AS ja_enviado
    FROM cotacoes_frete c
    INNER JOIN cotacoes_frete_transportadoras cft
      ON cft.empresa_id = c.empresa_id
     AND cft.tipo_documento = c.tipo_documento
     AND cft.numero_documento = c.numero_documento
     AND cft.codigo_chave = c.codigo_chave
    INNER JOIN transportadoras t
      ON t.id = cft.transportadora_id
    LEFT JOIN LATERAL (
      SELECT
        ef.url_publica,
        ef.enviado_em
      FROM cotacoes_frete_envios_fornecedores ef
      WHERE ef.empresa_id = c.empresa_id
        AND ef.tipo_documento = c.tipo_documento
        AND ef.numero_documento = c.numero_documento
        AND ef.codigo_chave = c.codigo_chave
        AND ef.transportadora_id = t.id
        AND ef.url_publica IS NOT NULL
      ORDER BY ef.numero_envio DESC NULLS LAST
      LIMIT 1
    ) ultimo_envio ON TRUE
    WHERE c.empresa_id = $1
      AND ${montarIdCotacaoSql('c')} = ANY($2::TEXT[])
    ORDER BY c.numero_documento ASC, t.nome_fantasia ASC`,
    [empresaId, cotacoesIds.map((item) => String(item))]
  );
}

export async function criarEnvioCotacao(dados: {
  empresaId: number;
  cotacaoId: string | number;
  codigoChave: string;
  parcial: boolean;
  usuarioId: number;
  itensIds: number[];
}) {
  const cotacao = await resolverCotacaoBase(dados.empresaId, dados.cotacaoId);
  if (!cotacao) {
    return null;
  }

  const controle = await consultarUm<{ numero_envio: number; primeiro_envio: boolean }>(
    `SELECT
      COALESCE(MAX(numero_envio), 0) + 1 AS numero_envio,
      COUNT(*) = 0 AS primeiro_envio
    FROM cotacoes_frete_envios
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4`,
    [cotacao.empresa_id, cotacao.tipo_documento, cotacao.numero_documento, cotacao.codigo_chave]
  );

  const numeroEnvio = Number(controle?.numero_envio ?? 1);

  const envio = await consultarUm<{ numero_envio: number; codigo_chave: string }>(
    `INSERT INTO cotacoes_frete_envios (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      numero_envio,
      parcial,
      primeiro_envio,
      status_envio,
      criado_em,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDENTE', NOW(), $8)
    RETURNING numero_envio, codigo_chave`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      numeroEnvio,
      dados.parcial,
      Boolean(controle?.primeiro_envio),
      dados.usuarioId
    ]
  );

  await consultar(
    `INSERT INTO cotacoes_frete_envios_itens (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      numero_envio,
      item_sequencia,
      quantidade_enviada
    )
    SELECT
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      $5,
      item_sequencia,
      quantidade
    FROM cotacoes_frete_itens
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
    ON CONFLICT (empresa_id, tipo_documento, numero_documento, codigo_chave, numero_envio, item_sequencia) DO NOTHING`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      numeroEnvio
    ]
  );

  return {
    ...envio,
    numero_envio: numeroEnvio,
    empresa_id: cotacao.empresa_id,
    tipo_documento: cotacao.tipo_documento,
    numero_documento: cotacao.numero_documento,
    codigo_chave_base: cotacao.codigo_chave
  };
}

export async function registrarFornecedorEnvio(dados: {
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  codigoChave: string;
  numeroEnvio: number;
  transportadoraId: number;
  emailDestino?: string | null;
  primeiroEnvio: boolean;
  reenvio: boolean;
  urlPublica?: string | null;
  slaLimiteEm?: Date | null;
  tokenHash?: string | null;
}) {
  return consultarUm(
    `INSERT INTO cotacoes_frete_envios_fornecedores (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      numero_envio,
      transportadora_id,
      status_envio,
      email_destino,
      url_publica,
      token_hash,
      sla_limite_em,
      primeiro_envio,
      reenvio,
      tentativas
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'PENDENTE', $7, $8, $9, $10, $11, $12, 0)
    ON CONFLICT (empresa_id, tipo_documento, numero_documento, codigo_chave, numero_envio, transportadora_id) DO UPDATE SET
      email_destino = EXCLUDED.email_destino,
      url_publica = EXCLUDED.url_publica,
      token_hash = EXCLUDED.token_hash,
      sla_limite_em = EXCLUDED.sla_limite_em,
      reenvio = EXCLUDED.reenvio,
      status_envio = 'PENDENTE'
    RETURNING transportadora_id`,
    [
      dados.empresaId,
      dados.tipoDocumento,
      dados.numeroDocumento,
      dados.codigoChave,
      dados.numeroEnvio,
      dados.transportadoraId,
      dados.emailDestino ?? null,
      dados.urlPublica ?? null,
      dados.tokenHash ?? null,
      dados.slaLimiteEm ?? null,
      dados.primeiroEnvio,
      dados.reenvio
    ]
  );
}

export async function atualizarFornecedorEnvio(dados: {
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  codigoChave: string;
  numeroEnvio: number;
  transportadoraId: number;
  tokenHash?: string | null;
  status: string;
  erro?: string | null;
}) {
  return consultarUm(
    `UPDATE cotacoes_frete_envios_fornecedores
    SET token_hash = COALESCE($7, token_hash),
      status_envio = $8::VARCHAR,
      erro_envio = $9,
      tentativas = tentativas + 1,
      enviado_em = CASE WHEN $8::VARCHAR = 'ENVIADO' THEN NOW() ELSE enviado_em END
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND numero_envio = $5
      AND transportadora_id = $6
    RETURNING *`,
    [
      dados.empresaId,
      dados.tipoDocumento,
      dados.numeroDocumento,
      dados.codigoChave,
      dados.numeroEnvio,
      dados.transportadoraId,
      dados.tokenHash ?? null,
      dados.status,
      dados.erro ?? null
    ]
  );
}

export async function concluirEnvio(dados: {
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  codigoChave: string;
  numeroEnvio: number;
  status: string;
}) {
  return consultarUm(
    `UPDATE cotacoes_frete_envios
    SET status_envio = $6,
      enviado_em = NOW(),
      concluido_em = NOW()
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND numero_envio = $5
    RETURNING *`,
    [
      dados.empresaId,
      dados.tipoDocumento,
      dados.numeroDocumento,
      dados.codigoChave,
      dados.numeroEnvio,
      dados.status
    ]
  );
}

export async function listarItensDoEnvio(chave: {
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  codigoChave: string;
  numeroEnvio: number;
}) {
  return consultar(
    `SELECT
      i.codigo_item,
      i.descricao_item,
      COALESCE(ei.quantidade_enviada, i.quantidade) AS quantidade,
      i.cubagem_item,
      i.largura,
      i.altura,
      i.comprimento,
      i.peso_item
    FROM cotacoes_frete_itens i
    LEFT JOIN cotacoes_frete_envios_itens ei
      ON ei.empresa_id = i.empresa_id
     AND ei.tipo_documento = i.tipo_documento
     AND ei.numero_documento = i.numero_documento
     AND ei.codigo_chave = i.codigo_chave
     AND ei.item_sequencia = i.item_sequencia
     AND ei.numero_envio = $5
    WHERE i.empresa_id = $1
      AND i.tipo_documento = $2
      AND i.numero_documento = $3
      AND i.codigo_chave = $4
    ORDER BY i.item_sequencia ASC NULLS LAST, i.codigo_item ASC NULLS LAST`,
    [chave.empresaId, chave.tipoDocumento, chave.numeroDocumento, chave.codigoChave, chave.numeroEnvio]
  );
}
