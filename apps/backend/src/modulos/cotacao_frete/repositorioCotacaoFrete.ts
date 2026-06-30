import { consultar } from '../../banco/conexao.js';
import { consultarUm } from '../../banco/conexao.js';


type ChaveCotacaoFrete = {
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  codigoChave: string;
};

type ChaveCotacaoTransportadora = ChaveCotacaoFrete & {
  transportadoraId: number;
  origemCotacao: string;
};

function montarIdCotacaoSql(alias = 'c') {
  return `CONCAT_WS('|', ${alias}.empresa_id, ${alias}.tipo_documento, ${alias}.numero_documento, ${alias}.codigo_chave)`;
}

function interpretarChaveCotacao(empresaId: number, chave: string | number): ChaveCotacaoFrete {
  const valor = decodeURIComponent(String(chave ?? '')).trim();
  const partes = valor.split('|');

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
    codigoChave: valor
  };
}

function parametrosChave(chave: ChaveCotacaoFrete) {
  return [chave.empresaId, chave.tipoDocumento, chave.numeroDocumento, chave.codigoChave];
}

function montarCondicaoChave(alias = 'c') {
  return `${alias}.empresa_id = $1 AND ${alias}.tipo_documento = $2 AND ${alias}.numero_documento = $3 AND ${alias}.codigo_chave = $4`;
}

function interpretarChaveCotacaoTransportadora(empresaId: number, chave: string | number): ChaveCotacaoTransportadora {
  const valor = decodeURIComponent(String(chave ?? '')).trim();
  const partes = valor.split('|');

  if (partes.length >= 6) {
    return {
      empresaId: Number(partes[0]) || empresaId,
      tipoDocumento: partes[1],
      numeroDocumento: partes[2],
      codigoChave: partes[3],
      transportadoraId: Number(partes[4]) || 0,
      origemCotacao: partes.slice(5).join('|')
    };
  }

  return {
    empresaId,
    tipoDocumento: '',
    numeroDocumento: '',
    codigoChave: valor,
    transportadoraId: 0,
    origemCotacao: ''
  };
}

async function obterMapaEtapasAtivas(empresaId: number) {
  const etapas = await consultar<{ id: number; codigo: string }>(
    `SELECT
      id,
      codigo
    FROM etapas_kanban
    WHERE empresa_id = $1
      AND ativa = TRUE`,
    [empresaId]
  );

  return etapas.reduce<Record<string, number>>((acumulado, etapa) => {
    acumulado[String(etapa.codigo)] = Number(etapa.id);
    return acumulado;
  }, {});
}

function definirStatusOperacionalCotacao(resumo: Record<string, any>) {
  const cancelada = ['CANCELADO', 'EXCLUIDO'].includes(String(resumo.situacao_pedido ?? '').toUpperCase());
  if (cancelada) {
    return 'COTACAO_CANCELADA';
  }

  if (Boolean(resumo.tem_cte)) {
    return 'CTE_EMITIDO';
  }

  const possuiEscolhaReal = Boolean(resumo.tem_transportadora_selecionada)
    || Boolean(resumo.escolhido_em)
    || Boolean(resumo.escolhido_por_usuario_id);

  if (possuiEscolhaReal) {
    return 'TRANSPORTADORA_ESCOLHIDA';
  }

  const totalSolicitadas = Number(resumo.total_solicitadas ?? 0);
  const totalPendentes = Number(resumo.total_pendentes ?? 0);
  const totalExternasRespondidas = Number(resumo.total_externas_respondidas ?? 0);
  const totalExternas = Number(resumo.total_externas ?? 0);

  if (totalSolicitadas > 0 && totalPendentes === 0 && (totalExternasRespondidas > 0 || totalExternas > 0)) {
    return 'EM_ANALISE';
  }

  if (totalSolicitadas > 0 || totalExternas > 0) {
    return 'COTACAO_TRANSPORTADORA';
  }

  if (Number(resumo.total_automaticas ?? 0) > 0) {
    return 'COTACAO_AUTOMATICA';
  }

  return 'COTACAO_PENDENTE';
}

export async function sincronizarStatusCotacoes(empresaId: number, cotacaoId?: string | number) {
  const chave = cotacaoId !== undefined && cotacaoId !== null
    ? interpretarChaveCotacao(empresaId, cotacaoId)
    : null;
  const etapasAtivas = await obterMapaEtapasAtivas(empresaId);
  const filtros: Array<string> = ['c.empresa_id = $1', 'COALESCE(c.excluido, FALSE) = FALSE'];
  const parametros: Array<string | number> = [empresaId];

  if (chave?.tipoDocumento && chave.numeroDocumento && chave.codigoChave) {
    filtros.push('c.tipo_documento = $2', 'c.numero_documento = $3', 'c.codigo_chave = $4');
    parametros.push(chave.tipoDocumento, chave.numeroDocumento, chave.codigoChave);
  }

  const resumos = await consultar<Record<string, any>>(
    `SELECT
      c.empresa_id,
      c.tipo_documento,
      c.numero_documento,
      c.codigo_chave,
      c.status,
      c.etapa_kanban_id,
      COALESCE(c.situacao_pedido, 'ATIVO') AS situacao_pedido,
      COALESCE(c.excluido, FALSE) AS excluido,
      c.escolhido_em,
      c.escolhido_por_usuario_id,
      c.transportadora_escolhida_id,
      c.valor_frete_final,
      c.prazo_final_origem,
      CASE
        WHEN COALESCE(c.numero_cte, '') <> '' THEN TRUE
        WHEN EXISTS (
          SELECT 1
          FROM cotacoes_frete_ctes ct
          WHERE ct.empresa_id = c.empresa_id
            AND ct.tipo_documento = c.tipo_documento
            AND ct.numero_documento = c.numero_documento
            AND ct.codigo_chave = c.codigo_chave
        ) THEN TRUE
        ELSE FALSE
      END AS tem_cte,
      EXISTS (
        SELECT 1
        FROM cotacoes_frete_transportadoras tsel
        WHERE tsel.empresa_id = c.empresa_id
          AND tsel.tipo_documento = c.tipo_documento
          AND tsel.numero_documento = c.numero_documento
          AND tsel.codigo_chave = c.codigo_chave
          AND COALESCE(tsel.selecionada, FALSE) = TRUE
      ) AS tem_transportadora_selecionada,
      COALESCE(automaticas.total_automaticas, 0) AS total_automaticas,
      COALESCE(transportadoras.total_externas, 0) AS total_externas,
      COALESCE(transportadoras.total_externas_respondidas, 0) AS total_externas_respondidas,
      COALESCE(envios.total_solicitadas, 0) AS total_solicitadas,
      COALESCE(envios.total_pendentes, 0) AS total_pendentes
    FROM cotacoes_frete c
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE COALESCE(t.valor_frete, 0) > 0
            AND (
              UPPER(COALESCE(t.origem_detalhada, '')) = 'COTACAO_AUTOMATICA'
              OR UPPER(COALESCE(t.origem_cotacao, '')) IN ('AUTOMATICA', 'BANCO')
              OR (UPPER(COALESCE(t.origem_cotacao, '')) = 'ERP' AND UPPER(COALESCE(t.origem_detalhada, '')) <> 'DIGITACAO_ERP')
            )
            AND UPPER(COALESCE(t.status, '')) NOT IN ('COTACAO_TRANSPORTADORA_RECEBIDA', 'RESPONDIDA', 'ALTERADA_MANUALMENTE')
        ) AS total_automaticas
      FROM cotacoes_frete_transportadoras t
      WHERE t.empresa_id = c.empresa_id
        AND t.tipo_documento = c.tipo_documento
        AND t.numero_documento = c.numero_documento
        AND t.codigo_chave = c.codigo_chave
    ) automaticas ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE COALESCE(t.valor_frete, 0) > 0
            AND (
              UPPER(COALESCE(t.origem_cotacao, '')) NOT IN ('ERP', 'AUTOMATICA', 'BANCO')
              OR UPPER(COALESCE(t.origem_detalhada, '')) = 'DIGITACAO_ERP'
              OR UPPER(COALESCE(t.status, '')) IN ('COTACAO_TRANSPORTADORA_RECEBIDA', 'RESPONDIDA', 'ALTERADA_MANUALMENTE')
            )
        ) AS total_externas,
        COUNT(*) FILTER (
          WHERE COALESCE(t.valor_frete, 0) > 0
            AND (
              UPPER(COALESCE(t.origem_cotacao, '')) NOT IN ('ERP', 'AUTOMATICA', 'BANCO')
              OR UPPER(COALESCE(t.origem_detalhada, '')) = 'DIGITACAO_ERP'
              OR UPPER(COALESCE(t.status, '')) IN ('COTACAO_TRANSPORTADORA_RECEBIDA', 'RESPONDIDA', 'ALTERADA_MANUALMENTE')
            )
            AND (t.respondida_em IS NOT NULL OR COALESCE(t.status, '') IN ('RESPONDIDA', 'SELECIONADA', 'ALTERADA_MANUALMENTE', 'COTADA'))
        ) AS total_externas_respondidas
      FROM cotacoes_frete_transportadoras t
      WHERE t.empresa_id = c.empresa_id
        AND t.tipo_documento = c.tipo_documento
        AND t.numero_documento = c.numero_documento
        AND t.codigo_chave = c.codigo_chave
    ) transportadoras ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_solicitadas,
        COUNT(*) FILTER (WHERE COALESCE(ef.status_envio, 'PENDENTE') IN ('PENDENTE', 'ENVIADO')) AS total_pendentes
      FROM cotacoes_frete_envios_fornecedores ef
      WHERE ef.empresa_id = c.empresa_id
        AND ef.tipo_documento = c.tipo_documento
        AND ef.numero_documento = c.numero_documento
        AND ef.codigo_chave = c.codigo_chave
    ) envios ON TRUE
    WHERE ${filtros.join(' AND ')}`,
    parametros
  );

  const alteracoes = resumos
    .map((resumo) => {
      const novoStatus = definirStatusOperacionalCotacao(resumo);
      const novaEtapaId = etapasAtivas[novoStatus] ?? Number(resumo.etapa_kanban_id ?? 0);
      const etapaAtual = Number(resumo.etapa_kanban_id ?? 0);
      if (String(resumo.status ?? '') === novoStatus && etapaAtual === novaEtapaId) {
        return null;
      }
      return {
        empresa_id: Number(resumo.empresa_id),
        tipo_documento: String(resumo.tipo_documento),
        numero_documento: String(resumo.numero_documento),
        codigo_chave: String(resumo.codigo_chave),
        status: novoStatus,
        etapa_id: novaEtapaId
      };
    })
    .filter(Boolean) as Array<Record<string, string | number>>;

  if (!alteracoes.length) {
    return 0;
  }

  for (let indice = 0; indice < alteracoes.length; indice += 200) {
    const lote = alteracoes.slice(indice, indice + 200);
    const valoresSql: string[] = [];
    const valores: Array<string | number> = [];

    lote.forEach((item, posicao) => {
      const base = posicao * 6;
      valoresSql.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
      valores.push(
        item.empresa_id,
        item.tipo_documento,
        item.numero_documento,
        item.codigo_chave,
        item.status,
        item.etapa_id
      );
    });

    await consultar(
      `UPDATE cotacoes_frete c
      SET status = dados.status,
        etapa_kanban_id = dados.etapa_id::BIGINT,
        alterado_em = NOW()
      FROM (
        VALUES ${valoresSql.join(', ')}
      ) AS dados(empresa_id, tipo_documento, numero_documento, codigo_chave, status, etapa_id)
      WHERE c.empresa_id = dados.empresa_id::BIGINT
        AND c.tipo_documento = dados.tipo_documento
        AND c.numero_documento = dados.numero_documento
        AND c.codigo_chave = dados.codigo_chave
        AND COALESCE(c.excluido, FALSE) = FALSE`,
      valores
    );
  }

  return alteracoes.length;
}

async function resolverCotacaoBase(empresaId: number, cotacaoId: string | number) {
  const chave = interpretarChaveCotacao(empresaId, cotacaoId);

  if (chave.tipoDocumento && chave.numeroDocumento && chave.codigoChave) {
    return consultarUm<{
      id: string;
      empresa_id: number;
      tipo_documento: string;
      numero_documento: string;
      codigo_chave: string;
      bloqueado_para_alteracao: boolean;
      excluido: boolean;
    }>(
      `SELECT
        ${montarIdCotacaoSql('c')} AS id,
        c.empresa_id,
        c.tipo_documento,
        c.numero_documento,
        c.codigo_chave,
        COALESCE(bloqueado_para_alteracao, FALSE) AS bloqueado_para_alteracao,
        COALESCE(excluido, FALSE) AS excluido
      FROM cotacoes_frete c
      WHERE ${montarCondicaoChave('c')}
        AND COALESCE(c.excluido, FALSE) = FALSE`,
      parametrosChave(chave)
    );
  }

  const cotacaoNumerica = Number(cotacaoId);
  if (!Number.isFinite(cotacaoNumerica) || cotacaoNumerica <= 0) {
    return null;
  }

  return null;
}


export type FiltrosDashboardCotacao = {
  dataInicial?: string;
  dataFinal?: string;
  vendedor?: string;
  cliente?: string;
  cidade?: string;
  uf?: string;
  transportadora?: string;
  status?: string;
  valorPedidoMin?: number;
  valorPedidoMax?: number;
  percentualFreteMin?: number;
  percentualFreteMax?: number;
  comTrocaTransportadora?: boolean;
  comDivergenciaValor?: boolean;
  comDivergenciaPrazo?: boolean;
};

export async function obterIndicadoresCotacao(empresaId: number, filtros: FiltrosDashboardCotacao = {}) {
  const linhas = await consultar(
    `SELECT
      ${montarIdCotacaoSql('c')} AS cotacao_id,
      c.numero_documento AS numero_pedido,
      c.nome_destinatario AS cliente,
      c.cidade_destino AS cidade,
      c.uf_destino AS uf,
      c.data_documento AS data_pedido,
      COALESCE(c.valor_mercadoria, 0) AS valor_pedido,
      COALESCE(c.transportadora_pedido_nome, 'Sem transportadora') AS transportadora_pedido,
      COALESCE(c.valor_frete_pedido, 0) AS valor_frete_pedido,
      COALESCE(c.prazo_pedido_dias, 0) AS prazo_pedido,
      automatica.nome_fantasia AS transportadora_cotacao_automatica,
      COALESCE(automatica.valor_frete, 0) AS valor_cotacao_automatica,
      COALESCE(automatica.prazo_dias, 0) AS prazo_cotacao_automatica,
      transportadora.nome_fantasia AS transportadora_cotacao_transportadora,
      COALESCE(transportadora.valor_frete, 0) AS valor_cotacao_transportadora,
      COALESCE(transportadora.prazo_dias, 0) AS prazo_cotacao_transportadora,
      CASE
        WHEN c.escolhido_em IS NOT NULL
          OR c.escolhido_por_usuario_id IS NOT NULL
          OR pedido_escolhido.transportadora_id IS NOT NULL
        THEN COALESCE(escolhida.nome_fantasia, pedido_escolhido.nome_fantasia, 'Sem transportadora')
        ELSE 'Sem transportadora'
      END AS transportadora_escolhida,
      CASE
        WHEN c.escolhido_em IS NOT NULL
          OR c.escolhido_por_usuario_id IS NOT NULL
          OR pedido_escolhido.transportadora_id IS NOT NULL
        THEN COALESCE(c.valor_frete_final, pedido_escolhido.valor_frete, 0)
        ELSE 0
      END AS valor_transportadora_escolhida,
      CASE
        WHEN c.escolhido_em IS NOT NULL
          OR c.escolhido_por_usuario_id IS NOT NULL
          OR pedido_escolhido.transportadora_id IS NOT NULL
        THEN COALESCE(c.prazo_final_dias, pedido_escolhido.prazo_dias, 0)
        ELSE 0
      END AS prazo_transportadora_escolhida,
      COALESCE(cte.transportadora_cte_nome, 'Sem CT-e') AS transportadora_cte,
      COALESCE(cte.valorfrete_cte, 0) AS valor_cte,
      0 AS prazo_cte,
      c.status,
      e.nome AS etapa_nome,
      '' AS observacao
    FROM cotacoes_frete c
    LEFT JOIN etapas_kanban e
      ON e.id = c.etapa_kanban_id
    LEFT JOIN LATERAL (
      SELECT
        t.nome_fantasia,
        cft.valor_frete,
        COALESCE(cft.prazo_dias, 0) AS prazo_dias
      FROM cotacoes_frete_transportadoras cft
      INNER JOIN transportadoras t
        ON t.id = cft.transportadora_id
      WHERE cft.empresa_id = c.empresa_id
        AND cft.tipo_documento = c.tipo_documento
        AND cft.numero_documento = c.numero_documento
        AND cft.codigo_chave = c.codigo_chave
        AND UPPER(COALESCE(cft.origem_cotacao, '')) IN ('BANCO', 'AUTOMATICA', 'ERP')
        AND COALESCE(cft.valor_frete, 0) > 0
      ORDER BY cft.valor_frete ASC, COALESCE(cft.ranking_frete, 999999) ASC, cft.transportadora_id ASC
      LIMIT 1
    ) automatica ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        t.nome_fantasia,
        cft.valor_frete,
        COALESCE(cft.prazo_dias, 0) AS prazo_dias
      FROM cotacoes_frete_transportadoras cft
      INNER JOIN transportadoras t
        ON t.id = cft.transportadora_id
      WHERE cft.empresa_id = c.empresa_id
        AND cft.tipo_documento = c.tipo_documento
        AND cft.numero_documento = c.numero_documento
        AND cft.codigo_chave = c.codigo_chave
        AND UPPER(COALESCE(cft.origem_cotacao, '')) NOT IN ('BANCO', 'AUTOMATICA', 'ERP')
        AND COALESCE(cft.valor_frete, 0) > 0
      ORDER BY cft.valor_frete ASC, COALESCE(cft.ranking_frete, 999999) ASC, cft.transportadora_id ASC
      LIMIT 1
    ) transportadora ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        cft.transportadora_id,
        t.nome_fantasia,
        cft.valor_frete,
        COALESCE(cft.prazo_dias, 0) AS prazo_dias
      FROM cotacoes_frete_transportadoras cft
      INNER JOIN transportadoras t
        ON t.id = cft.transportadora_id
      WHERE cft.empresa_id = c.empresa_id
        AND cft.tipo_documento = c.tipo_documento
        AND cft.numero_documento = c.numero_documento
        AND cft.codigo_chave = c.codigo_chave
        AND COALESCE(cft.selecionada, FALSE) = TRUE
      ORDER BY cft.alterado_em DESC NULLS LAST, cft.transportadora_id DESC
      LIMIT 1
    ) pedido_escolhido ON TRUE
    LEFT JOIN transportadoras escolhida
      ON escolhida.id = c.transportadora_escolhida_id
    LEFT JOIN LATERAL (
      SELECT
        cte.valorfrete_cte,
        COALESCE(t_codigo.nome_fantasia, cte.transportadora_cte_codigo, 'Sem transportadora') AS transportadora_cte_nome
      FROM cotacoes_frete_ctes cte
      LEFT JOIN transportadoras t_codigo
        ON TRIM(t_codigo.codigo_interno::TEXT) = TRIM(cte.transportadora_cte_codigo::TEXT)
      WHERE cte.empresa_id = c.empresa_id
        AND cte.tipo_documento = c.tipo_documento
        AND cte.numero_documento = c.numero_documento
        AND cte.codigo_chave = c.codigo_chave
      ORDER BY COALESCE(cte.valorfrete_cte, 0) DESC, cte.data_cte DESC NULLS LAST, cte.numero_cte DESC NULLS LAST
      LIMIT 1
    ) cte ON TRUE
    WHERE c.empresa_id = $1
      AND COALESCE(c.excluido, FALSE) = FALSE
      AND ($2::DATE IS NULL OR c.data_documento >= $2::DATE)
      AND ($3::DATE IS NULL OR c.data_documento <= $3::DATE)
      AND ($4::VARCHAR IS NULL OR c.vendedor_nome ILIKE $4)
      AND ($5::VARCHAR IS NULL OR c.nome_destinatario ILIKE $5)
      AND ($6::VARCHAR IS NULL OR c.cidade_destino ILIKE $6)
      AND ($7::VARCHAR IS NULL OR c.uf_destino = $7)
      AND ($8::VARCHAR IS NULL OR c.status = $8)
      AND ($9::NUMERIC IS NULL OR COALESCE(c.valor_mercadoria, 0) >= $9::NUMERIC)
      AND ($10::NUMERIC IS NULL OR COALESCE(c.valor_mercadoria, 0) <= $10::NUMERIC)
    ORDER BY c.data_documento DESC NULLS LAST, c.numero_documento DESC`,
    [
      empresaId,
      filtros.dataInicial || null,
      filtros.dataFinal || null,
      filtros.vendedor ? `%${filtros.vendedor}%` : null,
      filtros.cliente ? `%${filtros.cliente}%` : null,
      filtros.cidade ? `%${filtros.cidade}%` : null,
      filtros.uf || null,
      filtros.status || null,
      filtros.valorPedidoMin ?? null,
      filtros.valorPedidoMax ?? null
    ]
  );

  const itens = linhas
    .map((linha: any) => {
      const valorPedido = Number(linha.valor_pedido ?? 0);
      const valorPedidoFrete = Number(linha.valor_frete_pedido ?? 0);
      const valorAutomatica = Number(linha.valor_cotacao_automatica ?? 0);
      const valorTransportadora = Number(linha.valor_cotacao_transportadora ?? 0);
      const valorEscolhida = Number(linha.valor_transportadora_escolhida ?? 0);
      const valorCte = Number(linha.valor_cte ?? 0);
      const prazoEscolhido = Number(linha.prazo_transportadora_escolhida ?? 0);
      const prazoFinal = Number(linha.prazo_cte ?? 0);

      const percentualFretePedido = valorPedido > 0 ? (valorPedidoFrete / valorPedido) * 100 : 0;
      const percentualFreteFinal = valorPedido > 0 ? (valorCte / valorPedido) * 100 : 0;
      const diferencaAutomaticaCte = valorCte - valorAutomatica;
      const diferencaEscolhidaCte = valorCte - valorEscolhida;
      const diferencaAutomaticaCtePercentual = valorAutomatica > 0 ? (diferencaAutomaticaCte / valorAutomatica) * 100 : 0;
      const diferencaEscolhidaCtePercentual = valorEscolhida > 0 ? (diferencaEscolhidaCte / valorEscolhida) * 100 : 0;
      const houveTrocaTransportadora =
        Boolean(linha.transportadora_escolhida) &&
        Boolean(linha.transportadora_cte) &&
        String(linha.transportadora_escolhida) !== 'Sem transportadora' &&
        String(linha.transportadora_cte) !== 'Sem CT-e' &&
        String(linha.transportadora_escolhida).trim().toUpperCase() !== String(linha.transportadora_cte).trim().toUpperCase();

      return {
        ...linha,
        percentual_frete_pedido: percentualFretePedido,
        percentual_frete_final: percentualFreteFinal,
        diferenca_automatica_cte: diferencaAutomaticaCte,
        diferenca_automatica_cte_percentual: diferencaAutomaticaCtePercentual,
        diferenca_escolhida_cte: diferencaEscolhidaCte,
        diferenca_escolhida_cte_percentual: diferencaEscolhidaCtePercentual,
        prazo_cotado: prazoEscolhido || Number(linha.prazo_cotacao_transportadora ?? 0) || Number(linha.prazo_cotacao_automatica ?? 0),
        prazo_final: prazoFinal,
        houve_troca_transportadora: houveTrocaTransportadora,
        divergencia_prazo: prazoFinal > prazoEscolhido && prazoEscolhido > 0
      };
    })
    .filter((linha: any) => {
      if (filtros.transportadora) {
        const busca = filtros.transportadora.toUpperCase();
        const valores = [
          linha.transportadora_pedido,
          linha.transportadora_cotacao_automatica,
          linha.transportadora_cotacao_transportadora,
          linha.transportadora_escolhida,
          linha.transportadora_cte
        ]
          .map((item: unknown) => String(item ?? '').toUpperCase());
        if (!valores.some((item: string) => item.includes(busca))) {
          return false;
        }
      }

      if (filtros.percentualFreteMin !== undefined && linha.percentual_frete_final < filtros.percentualFreteMin) {
        return false;
      }

      if (filtros.percentualFreteMax !== undefined && linha.percentual_frete_final > filtros.percentualFreteMax) {
        return false;
      }

      if (filtros.comTrocaTransportadora && !linha.houve_troca_transportadora) {
        return false;
      }

      if (filtros.comDivergenciaValor && Number(linha.diferenca_escolhida_cte ?? 0) === 0 && Number(linha.diferenca_automatica_cte ?? 0) === 0) {
        return false;
      }

      if (filtros.comDivergenciaPrazo && !linha.divergencia_prazo) {
        return false;
      }

      return true;
    });

  return {
    gerado_em: new Date().toISOString(),
    itens
  };
}

export type FiltrosCotacao = {
  dataInicial?: string;
  dataFinal?: string;
  etapaCodigo?: string;
  busca?: string;
  numeroDocumento?: string;
  numeroNfe?: string;
  cliente?: string;
  cidade?: string;
  codigoChave?: string;
  vendedor?: string;
  transportadora?: string;
  bloqueado?: string;
  faturado?: string;
  multiplasCotacoes?: boolean;
  fluxoLogistico?: boolean | string;
  pagina?: number;
  limite?: number;
};

export async function listarKanbanCotacao(empresaId: number, filtros: FiltrosCotacao = {}) {
  const filtroFluxoLogistico = filtros.fluxoLogistico === true || String(filtros.fluxoLogistico ?? '').toLowerCase() === 'true'
    ? 'SOMENTE'
    : String(filtros.fluxoLogistico ?? '').trim().toUpperCase() || null;
  return consultar(
    `SELECT
      e.id AS etapa_id,
      e.codigo AS etapa_codigo,
      e.nome AS etapa_nome,
      e.cor AS etapa_cor,
      e.ordem AS etapa_ordem,
      e.permite_arrastar,
      e.obriga_feedback,
      ${montarIdCotacaoSql('c')} AS cotacao_id,
      c.tipo_documento,
      c.numero_documento,
      c.data_documento,
      c.codigo_chave,
      c.lote_fluxo_logistico,
      c.origem_comercial,
      c.situacao_pedido,
      c.nome_destinatario,
      c.cidade_destino,
      c.uf_destino,
      c.valor_mercadoria,
      c.peso_real,
      c.volumes_total,
      COALESCE(c.prazo_informado_venda_dias, c.prazo_vendedor_dias) AS prazo_informado_venda_dias,
      c.prazo_final_dias,
      c.valor_frete_venda,
      c.valor_frete_final,
      c.vendedor_nome,
      c.numero_nfe_faturada,
      c.faturado_em,
      nfes.numeros_nfe,
      COALESCE(nfes.total_nfes, 0) AS total_nfes,
      c.numero_cte,
      c.bloqueado_para_alteracao,
      COALESCE(t_escolhida.nome_fantasia, melhor.nome_fantasia) AS transportadora_vencedora_nome,
      melhor.valor_frete AS menor_frete,
      melhor.prazo_dias AS menor_prazo_dias,
      COALESCE(respostas.total_transportadoras, 0) AS total_transportadoras,
      COALESCE(respostas.total_respostas, 0) AS total_respostas,
      COALESCE(respostas.total_sla_vencido, 0) AS total_sla_vencido,
      COALESCE(outras.total_outras_cotacoes, 0) AS total_outras_cotacoes
    FROM etapas_kanban e
    LEFT JOIN cotacoes_frete c ON c.etapa_kanban_id = e.id
      AND c.empresa_id = $1
      AND COALESCE(c.excluido, FALSE) = FALSE
      AND c.situacao_pedido = 'ATIVO'
      AND ($2::DATE IS NULL OR c.data_documento >= $2::DATE)
      AND ($3::DATE IS NULL OR c.data_documento <= $3::DATE)
      AND (
        $5::VARCHAR IS NULL
        OR ($5 = 'SOMENTE' AND (c.faturado_em IS NOT NULL OR COALESCE(c.numero_nfe_faturada, '') <> '' OR EXISTS (
          SELECT 1
          FROM cotacoes_frete_notas_fiscais nf
          WHERE nf.empresa_id = c.empresa_id
            AND nf.tipo_documento = c.tipo_documento
            AND nf.numero_documento = c.numero_documento
            AND nf.codigo_chave = c.codigo_chave
        )))
        OR ($5 = 'EXCETO' AND c.faturado_em IS NULL AND COALESCE(c.numero_nfe_faturada, '') = '' AND NOT EXISTS (
          SELECT 1
          FROM cotacoes_frete_notas_fiscais nf
          WHERE nf.empresa_id = c.empresa_id
            AND nf.tipo_documento = c.tipo_documento
            AND nf.numero_documento = c.numero_documento
            AND nf.codigo_chave = c.codigo_chave
        ))
      )
      AND (
        $6::BOOLEAN IS DISTINCT FROM TRUE
        OR EXISTS (
          SELECT 1
          FROM cotacoes_frete cx
          WHERE cx.empresa_id = c.empresa_id
            AND COALESCE(cx.excluido, FALSE) = FALSE
            AND COALESCE(cx.numero_pedido, cx.numero_documento) = COALESCE(c.numero_pedido, c.numero_documento)
            AND cx.codigo_chave <> c.codigo_chave
            AND (
              $7::VARCHAR IS DISTINCT FROM 'SOMENTE'
              OR COALESCE(NULLIF(TRIM(cx.lote_fluxo_logistico), ''), '') <> ''
            )
        )
      )
      AND (
        $7::VARCHAR IS NULL
        OR ($7 = 'SOMENTE' AND COALESCE(NULLIF(TRIM(c.lote_fluxo_logistico), ''), '') <> '')
        OR ($7 = 'SEM_PEDIDO' AND NOT EXISTS (
          SELECT 1
          FROM cotacoes_frete cf
          WHERE cf.empresa_id = c.empresa_id
            AND COALESCE(cf.excluido, FALSE) = FALSE
            AND COALESCE(cf.numero_pedido, cf.numero_documento) = COALESCE(c.numero_pedido, c.numero_documento)
            AND COALESCE(NULLIF(TRIM(cf.lote_fluxo_logistico), ''), '') <> ''
        ))
      )
    LEFT JOIN transportadoras t_escolhida ON t_escolhida.id = c.transportadora_escolhida_id
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(nf.numero_nfe::TEXT, ', ' ORDER BY nf.data_nfe DESC NULLS LAST, nf.numero_nfe::TEXT) AS numeros_nfe,
        COUNT(*) AS total_nfes
      FROM cotacoes_frete_notas_fiscais nf
      WHERE nf.empresa_id = c.empresa_id
        AND nf.tipo_documento = c.tipo_documento
        AND nf.numero_documento = c.numero_documento
        AND nf.codigo_chave = c.codigo_chave
    ) nfes ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        t.nome_fantasia,
        cft.valor_frete,
        cft.prazo_dias
      FROM cotacoes_frete_transportadoras cft
      INNER JOIN transportadoras t ON t.id = cft.transportadora_id
      WHERE cft.empresa_id = c.empresa_id
        AND cft.tipo_documento = c.tipo_documento
        AND cft.numero_documento = c.numero_documento
        AND cft.codigo_chave = c.codigo_chave
      ORDER BY cft.valor_frete ASC, COALESCE(cft.ranking_frete, 999999) ASC, cft.transportadora_id ASC
      LIMIT 1
    ) melhor ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_transportadoras,
        COUNT(*) FILTER (WHERE cft.status IN ('RESPONDIDA', 'SELECIONADA', 'ALTERADA_MANUALMENTE') OR cft.respondida_em IS NOT NULL) AS total_respostas,
        COUNT(*) FILTER (WHERE cft.sla_limite_em IS NOT NULL AND cft.respondida_em IS NULL AND cft.sla_limite_em < NOW()) AS total_sla_vencido
      FROM cotacoes_frete_transportadoras cft
      WHERE cft.empresa_id = c.empresa_id
        AND cft.tipo_documento = c.tipo_documento
        AND cft.numero_documento = c.numero_documento
        AND cft.codigo_chave = c.codigo_chave
    ) respostas ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total_outras_cotacoes
      FROM cotacoes_frete cx
      WHERE cx.empresa_id = c.empresa_id
        AND COALESCE(cx.excluido, FALSE) = FALSE
        AND COALESCE(cx.numero_pedido, cx.numero_documento) = COALESCE(c.numero_pedido, c.numero_documento)
        AND NOT (
          cx.tipo_documento = c.tipo_documento
          AND cx.numero_documento = c.numero_documento
          AND cx.codigo_chave = c.codigo_chave
        )
        AND (
          $7::VARCHAR IS DISTINCT FROM 'SOMENTE'
          OR COALESCE(NULLIF(TRIM(cx.lote_fluxo_logistico), ''), '') <> ''
        )
    ) outras ON TRUE
    WHERE e.empresa_id = $1
      AND e.ativa = TRUE
      AND ($4::VARCHAR IS NULL OR e.codigo = $4)
    ORDER BY e.ordem ASC, c.criado_em DESC`,
    [empresaId, filtros.dataInicial || null, filtros.dataFinal || null, filtros.etapaCodigo || null, filtros.faturado || null, filtros.multiplasCotacoes === true, filtroFluxoLogistico]
  );
}

export async function listarCotacoesFrete(empresaId: number, filtros: FiltrosCotacao = {}) {
  const pagina = Math.max(1, Number(filtros.pagina ?? 1) || 1);
  const limite = Math.min(200, Math.max(15, Number(filtros.limite ?? 15) || 15));
  const offset = (pagina - 1) * limite;
  const filtroFluxoLogistico = filtros.fluxoLogistico === true || String(filtros.fluxoLogistico ?? '').toLowerCase() === 'true'
    ? 'SOMENTE'
    : String(filtros.fluxoLogistico ?? '').trim().toUpperCase() || null;
  const parametros = [
    empresaId,
    filtros.dataInicial || null,
    filtros.dataFinal || null,
    filtros.etapaCodigo || null,
    filtros.vendedor ? `%${filtros.vendedor}%` : null,
    filtros.transportadora ? `%${filtros.transportadora}%` : null,
    filtros.bloqueado || null,
    filtros.busca ? `%${filtros.busca}%` : null,
    filtros.numeroDocumento ? `%${filtros.numeroDocumento}%` : null,
    filtros.numeroNfe ? `%${filtros.numeroNfe}%` : null,
    filtros.cliente ? `%${filtros.cliente}%` : null,
    filtros.cidade ? `%${filtros.cidade}%` : null,
    filtros.codigoChave ? `%${filtros.codigoChave}%` : null,
    filtros.faturado || null,
    filtros.multiplasCotacoes === true,
    filtroFluxoLogistico
  ];
  const where = `
    c.empresa_id = $1
    AND COALESCE(c.excluido, FALSE) = FALSE
    AND c.situacao_pedido = 'ATIVO'
    AND ($2::DATE IS NULL OR c.data_documento >= $2::DATE)
    AND ($3::DATE IS NULL OR c.data_documento <= $3::DATE)
    AND ($4::VARCHAR IS NULL OR e.codigo = $4)
    AND ($5::VARCHAR IS NULL OR c.vendedor_nome ILIKE $5)
    AND (
      $6::VARCHAR IS NULL
      OR COALESCE(c.transportadora_pedido_nome, '') ILIKE $6
      OR COALESCE(t.nome_fantasia, '') ILIKE $6
    )
    AND (
      $7::VARCHAR IS NULL
      OR ($7 = 'SIM' AND COALESCE(c.bloqueado_para_alteracao, FALSE) = TRUE)
      OR ($7 = 'NAO' AND COALESCE(c.bloqueado_para_alteracao, FALSE) = FALSE)
    )
    AND (
      $8::VARCHAR IS NULL
      OR c.numero_documento ILIKE $8
      OR COALESCE(c.numero_pedido, '') ILIKE $8
      OR c.codigo_chave ILIKE $8
      OR COALESCE(c.nome_destinatario, '') ILIKE $8
      OR COALESCE(c.cidade_destino, '') ILIKE $8
      OR COALESCE(c.numero_nfe_faturada, '') ILIKE $8
    )
    AND ($9::VARCHAR IS NULL OR c.numero_documento ILIKE $9 OR COALESCE(c.numero_pedido, '') ILIKE $9)
    AND ($10::VARCHAR IS NULL OR COALESCE(c.numero_nfe_faturada, '') ILIKE $10)
    AND ($11::VARCHAR IS NULL OR COALESCE(c.nome_destinatario, '') ILIKE $11)
    AND ($12::VARCHAR IS NULL OR COALESCE(c.cidade_destino, '') ILIKE $12)
    AND ($13::VARCHAR IS NULL OR c.codigo_chave ILIKE $13)
    AND (
      $14::VARCHAR IS NULL
      OR ($14 = 'SOMENTE' AND (c.faturado_em IS NOT NULL OR COALESCE(c.numero_nfe_faturada, '') <> '' OR nfes.total_nfes > 0))
      OR ($14 = 'EXCETO' AND c.faturado_em IS NULL AND COALESCE(c.numero_nfe_faturada, '') = '' AND COALESCE(nfes.total_nfes, 0) = 0)
    )
      AND (
        $15::BOOLEAN IS DISTINCT FROM TRUE
        OR EXISTS (
          SELECT 1
          FROM cotacoes_frete cx
        WHERE cx.empresa_id = c.empresa_id
          AND COALESCE(cx.excluido, FALSE) = FALSE
          AND COALESCE(cx.numero_pedido, cx.numero_documento) = COALESCE(c.numero_pedido, c.numero_documento)
          AND cx.codigo_chave <> c.codigo_chave
          AND (
            $16::VARCHAR IS DISTINCT FROM 'SOMENTE'
            OR COALESCE(NULLIF(TRIM(cx.lote_fluxo_logistico), ''), '') <> ''
          )
      )
    )
    AND (
      $16::VARCHAR IS NULL
      OR ($16 = 'SOMENTE' AND COALESCE(NULLIF(TRIM(c.lote_fluxo_logistico), ''), '') <> '')
      OR ($16 = 'SEM_PEDIDO' AND NOT EXISTS (
        SELECT 1
        FROM cotacoes_frete cf
        WHERE cf.empresa_id = c.empresa_id
          AND COALESCE(cf.excluido, FALSE) = FALSE
          AND COALESCE(cf.numero_pedido, cf.numero_documento) = COALESCE(c.numero_pedido, c.numero_documento)
          AND COALESCE(NULLIF(TRIM(cf.lote_fluxo_logistico), ''), '') <> ''
      ))
    )
  `;
  const itens = await consultar(
    `SELECT
      ${montarIdCotacaoSql('c')} AS id,
      c.tipo_documento,
      c.numero_documento,
      c.numero_pedido,
      c.codigo_chave,
      c.lote_fluxo_logistico,
      c.data_documento,
      c.origem_comercial,
      c.situacao_pedido,
      c.status,
      c.nome_destinatario,
      c.cidade_destino,
      c.uf_destino,
      c.valor_mercadoria,
      c.peso_real,
      c.volumes_total,
      COALESCE(c.prazo_informado_venda_dias, c.prazo_vendedor_dias) AS prazo_informado_venda_dias,
      c.prazo_final_dias,
      c.valor_frete_venda,
      c.valor_frete_final,
      c.vendedor_nome,
      c.transportadora_pedido_nome,
      c.numero_nfe_faturada,
      c.faturado_em,
      nfes.numeros_nfe,
      COALESCE(nfes.total_nfes, 0) AS total_nfes,
      c.numero_cte,
      c.bloqueado_para_alteracao,
      e.nome AS etapa_nome,
      t.nome_fantasia AS transportadora_escolhida,
      COALESCE(outras.total_outras_cotacoes, 0) AS total_outras_cotacoes
    FROM cotacoes_frete c
    LEFT JOIN etapas_kanban e ON e.id = c.etapa_kanban_id
    LEFT JOIN transportadoras t ON t.id = c.transportadora_escolhida_id
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(nf.numero_nfe::TEXT, ', ' ORDER BY nf.data_nfe DESC NULLS LAST, nf.numero_nfe::TEXT) AS numeros_nfe,
        COUNT(*) AS total_nfes
      FROM cotacoes_frete_notas_fiscais nf
      WHERE nf.empresa_id = c.empresa_id
        AND nf.tipo_documento = c.tipo_documento
        AND nf.numero_documento = c.numero_documento
        AND nf.codigo_chave = c.codigo_chave
    ) nfes ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total_outras_cotacoes
      FROM cotacoes_frete cx
      WHERE cx.empresa_id = c.empresa_id
        AND COALESCE(cx.excluido, FALSE) = FALSE
        AND COALESCE(cx.numero_pedido, cx.numero_documento) = COALESCE(c.numero_pedido, c.numero_documento)
        AND NOT (
          cx.tipo_documento = c.tipo_documento
          AND cx.numero_documento = c.numero_documento
          AND cx.codigo_chave = c.codigo_chave
        )
        AND (
          $16::VARCHAR IS DISTINCT FROM 'SOMENTE'
          OR COALESCE(NULLIF(TRIM(cx.lote_fluxo_logistico), ''), '') <> ''
        )
    ) outras ON TRUE
    WHERE ${where}
    ORDER BY c.criado_em DESC
    LIMIT $17 OFFSET $18`,
    [...parametros, limite, offset]
  );
  const total = await consultarUm<{ total: string }>(
    `SELECT COUNT(*) AS total
    FROM cotacoes_frete c
    LEFT JOIN etapas_kanban e ON e.id = c.etapa_kanban_id
    LEFT JOIN transportadoras t ON t.id = c.transportadora_escolhida_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total_nfes
      FROM cotacoes_frete_notas_fiscais nf
      WHERE nf.empresa_id = c.empresa_id
        AND nf.tipo_documento = c.tipo_documento
        AND nf.numero_documento = c.numero_documento
        AND nf.codigo_chave = c.codigo_chave
    ) nfes ON TRUE
    WHERE ${where}`,
    parametros
  );

  return {
    itens,
    total: Number(total?.total ?? 0),
    pagina,
    limite
  };
}


export async function obterCotacaoFrete(empresaId: number, cotacaoId: string | number) {
  await consultar(
    `CREATE TABLE IF NOT EXISTS motivos_escolha_transportadora (
      id BIGSERIAL PRIMARY KEY,
      codigo VARCHAR(80) NOT NULL UNIQUE,
      descricao VARCHAR(220) NOT NULL,
      padrao_transportadora_pedido BOOLEAN NOT NULL DEFAULT FALSE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      alterado_em TIMESTAMPTZ
    )`
  );
  await consultar(
    `ALTER TABLE cotacoes_frete
      ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_id BIGINT REFERENCES motivos_escolha_transportadora(id),
      ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_descricao TEXT,
      ADD COLUMN IF NOT EXISTS lote_fluxo_logistico VARCHAR(80)`
  );

  const chave = interpretarChaveCotacao(empresaId, cotacaoId);

  const cotacao = await consultarUm(
    `SELECT
      ${montarIdCotacaoSql('c')} AS id,
      c.*,
      e.nome AS etapa_nome,
      nfes.numeros_nfe,
      nfes.total_nfes,
      ctes.numeros_cte,
      ctes.total_ctes,
      ctes.valor_frete_cte_total,
      ctes.ultimo_cte_em,
      ctes.transportadora_cte_nome,
      COALESCE(met.descricao, c.motivo_escolha_transportadora_descricao) AS motivo_escolha_transportadora_descricao
    FROM cotacoes_frete c
    LEFT JOIN etapas_kanban e
      ON e.id = c.etapa_kanban_id
    LEFT JOIN motivos_escolha_transportadora met
      ON met.id = c.motivo_escolha_transportadora_id
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(nf.numero_nfe::TEXT, ', ' ORDER BY nf.data_nfe DESC NULLS LAST, nf.numero_nfe::TEXT) AS numeros_nfe,
        COUNT(*) AS total_nfes
      FROM cotacoes_frete_notas_fiscais nf
      WHERE nf.empresa_id = c.empresa_id
        AND nf.tipo_documento = c.tipo_documento
        AND nf.numero_documento = c.numero_documento
        AND nf.codigo_chave = c.codigo_chave
    ) nfes ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(cte.numero_cte::TEXT, ', ' ORDER BY cte.data_cte DESC NULLS LAST, cte.numero_cte::TEXT) AS numeros_cte,
        COUNT(*) AS total_ctes,
        SUM(cte.valorfrete_cte) AS valor_frete_cte_total,
        MAX(cte.data_cte) AS ultimo_cte_em,
        (ARRAY_AGG(COALESCE(t_codigo.nome_fantasia, cte.transportadora_cte_codigo, 'Sem transportadora') ORDER BY COALESCE(cte.valorfrete_cte, 0) DESC, cte.data_cte DESC NULLS LAST, cte.numero_cte::TEXT DESC NULLS LAST))[1] AS transportadora_cte_nome
      FROM cotacoes_frete_ctes cte
      LEFT JOIN transportadoras t_codigo
        ON TRIM(t_codigo.codigo_interno::TEXT) = TRIM(cte.transportadora_cte_codigo::TEXT)
      WHERE cte.empresa_id = c.empresa_id
        AND cte.tipo_documento = c.tipo_documento
        AND cte.numero_documento = c.numero_documento
        AND cte.codigo_chave = c.codigo_chave
    ) ctes ON TRUE
    WHERE c.empresa_id = $1
      AND c.tipo_documento = $2
      AND c.numero_documento = $3
      AND c.codigo_chave = $4
      AND COALESCE(c.excluido, FALSE) = FALSE`,
    parametrosChave(chave)
  );

  if (!cotacao) {
    return null;
  }

  const itens = await consultar(
    `SELECT *
    FROM cotacoes_frete_itens
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
    ORDER BY item_sequencia ASC NULLS LAST, codigo_item ASC NULLS LAST, descricao_item ASC NULLS LAST`,
    parametrosChave(chave)
  );

  const transportadoras = await consultar(
    `SELECT
      CONCAT_WS('|', cft.empresa_id, cft.tipo_documento, cft.numero_documento, cft.codigo_chave, cft.transportadora_id, cft.origem_cotacao) AS id,
      cft.*,
      t.razao_social,
      t.nome_fantasia,
      t.email,
      t.telefone,
      t.sla_resposta_horas,
      t.recebe_prazo_solicitado,
      t.exige_prazo_resposta,
      t.prazo_resposta_obrigatorio,
      t.solicita_numero_cotacao,
      t.apresenta_lista_produtos,
      cft.numero_cotacao_transportadora,
      ultimo_link.url_publica,
      ultimo_link.token_status,
      ultimo_link.status_envio,
      ultimo_link.enviado_em,
      ultimo_link.envio_sla_limite_em,
      RANK() OVER (ORDER BY cft.valor_frete ASC NULLS LAST, cft.transportadora_id ASC) AS posicao_final,
      CASE
        WHEN MIN(cft.valor_frete) OVER () > 0 THEN ROUND(((cft.valor_frete / MIN(cft.valor_frete) OVER ()) - 1) * 100, 2)
        ELSE 0
      END AS diferenca_percentual,
      CASE
        WHEN COALESCE(c.valor_frete_pedido, c.valor_solicitado, c.valor_frete_final, 0) > 0 THEN ROUND(((cft.valor_frete / COALESCE(c.valor_frete_pedido, c.valor_solicitado, c.valor_frete_final, 0)) - 1) * 100, 2)
        ELSE NULL
      END AS diferenca_percentual_venda,
      cft.prazo_dias - COALESCE(c.prazo_informado_venda_dias, c.prazo_vendedor_dias) AS diferenca_prazo_venda_dias
    FROM cotacoes_frete_transportadoras cft
    INNER JOIN cotacoes_frete c
      ON c.empresa_id = cft.empresa_id
     AND c.tipo_documento = cft.tipo_documento
     AND c.numero_documento = cft.numero_documento
     AND c.codigo_chave = cft.codigo_chave
    INNER JOIN transportadoras t
      ON t.id = cft.transportadora_id
    LEFT JOIN LATERAL (
      SELECT
        tok.url_publica,
        tok.status AS token_status,
        ef.status_envio,
        COALESCE(ef.enviado_em, tok.gerado_em) AS enviado_em,
        COALESCE(ef.sla_limite_em, tok.expira_em) AS envio_sla_limite_em
      FROM cotacoes_frete_tokens tok
      LEFT JOIN cotacoes_frete_envios_fornecedores ef
        ON ef.empresa_id = tok.empresa_id
       AND ef.tipo_documento = tok.tipo_documento
       AND ef.numero_documento = tok.numero_documento
       AND ef.codigo_chave = tok.codigo_chave
       AND ef.transportadora_id = tok.transportadora_id
      WHERE tok.empresa_id = cft.empresa_id
        AND tok.tipo_documento = cft.tipo_documento
        AND tok.numero_documento = cft.numero_documento
        AND tok.codigo_chave = cft.codigo_chave
        AND tok.transportadora_id = cft.transportadora_id
      ORDER BY tok.gerado_em DESC NULLS LAST, tok.numero_envio DESC NULLS LAST
      LIMIT 1
    ) ultimo_link ON TRUE
    WHERE cft.empresa_id = $1
      AND cft.tipo_documento = $2
      AND cft.numero_documento = $3
      AND cft.codigo_chave = $4
    ORDER BY cft.ranking_frete ASC NULLS LAST, cft.valor_frete ASC NULLS LAST`,
    parametrosChave(chave)
  );

  const historicos = await consultar(
    `SELECT
      h.*,
      u.nome AS usuario_nome
    FROM cotacoes_frete_historicos h
    LEFT JOIN usuarios u
      ON u.id = h.usuario_id
    WHERE h.empresa_id = $1
      AND h.tipo_documento = $2
      AND h.numero_documento = $3
      AND h.codigo_chave = $4
    ORDER BY h.criado_em DESC`,
    parametrosChave(chave)
  );

  const timeline = await consultar(
    `SELECT
      tl.*,
      u.nome AS usuario_nome,
      t.nome_fantasia AS transportadora_nome
    FROM cotacoes_frete_timeline tl
    LEFT JOIN usuarios u
      ON u.id = tl.usuario_id
    LEFT JOIN transportadoras t
      ON t.id = tl.transportadora_id
    WHERE tl.empresa_id = $1
      AND tl.tipo_documento = $2
      AND tl.numero_documento = $3
      AND tl.codigo_chave = $4
    ORDER BY tl.criado_em DESC`,
    parametrosChave(chave)
  );

  const notasFiscais = await consultar(
    `SELECT *
    FROM cotacoes_frete_notas_fiscais
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
    ORDER BY data_nfe DESC NULLS LAST, numero_nfe`,
    parametrosChave(chave)
  );

  const ctes = await consultar(
    `SELECT
      cte.*,
      COALESCE(t_codigo.nome_fantasia, cte.transportadora_cte_codigo, 'Sem transportadora') AS transportadora_cte_nome
    FROM cotacoes_frete_ctes cte
    LEFT JOIN transportadoras t_codigo
      ON TRIM(t_codigo.codigo_interno::TEXT) = TRIM(cte.transportadora_cte_codigo::TEXT)
    WHERE cte.empresa_id = $1
      AND cte.tipo_documento = $2
      AND cte.numero_documento = $3
      AND cte.codigo_chave = $4
    ORDER BY cte.data_cte DESC NULLS LAST, cte.numero_cte`,
    parametrosChave(chave)
  );

  const outrasCotacoes = await consultar(
    `SELECT
      ${montarIdCotacaoSql('cx')} AS id,
      cx.tipo_documento,
      cx.numero_documento,
      cx.numero_pedido,
      cx.codigo_chave,
      cx.lote_fluxo_logistico,
      cx.data_documento,
      cx.criado_em,
      cx.status,
      e.nome AS etapa_nome,
      cx.nome_destinatario,
      cx.cidade_destino,
      cx.uf_destino,
      cx.valor_mercadoria,
      cx.valor_frete_pedido,
      cx.valor_frete_final
    FROM cotacoes_frete cx
    LEFT JOIN etapas_kanban e
      ON e.id = cx.etapa_kanban_id
    WHERE cx.empresa_id = $1
      AND COALESCE(cx.excluido, FALSE) = FALSE
      AND COALESCE(cx.numero_pedido, cx.numero_documento) = COALESCE($5::VARCHAR, $3::VARCHAR)
      AND NOT (
        cx.tipo_documento = $2
        AND cx.numero_documento = $3
        AND cx.codigo_chave = $4
      )
    ORDER BY cx.criado_em DESC NULLS LAST, cx.data_documento DESC NULLS LAST`,
    [...parametrosChave(chave), cotacao.numero_pedido ?? cotacao.numero_documento]
  );

  cotacao.total_outras_cotacoes = outrasCotacoes.length;

  return {
    cotacao,
    itens,
    transportadoras,
    historicos,
    timeline,
    notasFiscais,
    ctes,
    outrasCotacoes
  };
}


export async function obterResumoPublicoPorToken(tokenHash: string) {
  return consultarUm(
    `SELECT
      tok.token_hash AS token_id,
      tok.empresa_id,
      tok.status AS token_status,
      tok.utilizado,
      tok.expira_em,
      tok.transportadora_id,
      tok.gerado_por_usuario_id,
      tok.numero_envio AS envio_id,
      ${montarIdCotacaoSql('c')} AS cotacao_frete_id,
      c.tipo_documento,
      c.numero_documento,
      c.numero_pedido,
      c.origem_comercial,
      COALESCE(env.codigo_chave, tok.codigo_chave, c.codigo_chave) AS codigo_chave,
      c.valor_mercadoria,
      c.peso_real,
      c.volumes_total,
      c.cubagem_total,
      c.cep_destino,
      c.uf_destino,
      c.cidade_destino,
      c.endereco_destinatario,
      c.nome_destinatario,
      c.documento_destinatario,
      c.destino_zona_rural,
      c.destinatario_pessoa_fisica,
      c.bloqueado_para_alteracao,
      c.percentual_sobre_nf,
      c.valor_solicitado,
      c.valor_frete_venda,
      c.cnpj_emitente,
      c.endereco_coleta,
      c.cep_coleta,
      c.cidade_coleta,
      c.uf_coleta,
      c.prazo_pedido_dias,
      COALESCE(c.prazo_informado_venda_dias, c.prazo_vendedor_dias) AS prazo_informado_venda_dias,
      c.vendedor_nome,
      c.transportadora_pedido_nome,
      propria.valor_frete AS valor_tabela_transportadora,
      propria.prazo_dias AS prazo_tabela_transportadora,
      menor.valor_frete AS menor_frete_atual,
      menor.prazo_dias AS menor_prazo_atual,
      t.nome_fantasia AS transportadora_nome,
      t.email AS transportadora_email,
      t.apresenta_menor_cotacao,
      t.apresenta_cubagem,
      t.apresenta_peso,
      t.apresenta_valor_tabela,
      t.sla_resposta_horas,
      t.recebe_prazo_solicitado,
      t.exige_prazo_resposta,
      t.prazo_resposta_obrigatorio,
      t.solicita_numero_cotacao,
      t.apresenta_lista_produtos,
      e.nome_fantasia AS empresa_nome,
      e.nome_exibido AS empresa_nome_exibido,
      e.caminho_logo AS empresa_logo,
      e.caminho_imagem_fundo AS empresa_fundo,
      e.cor_primaria,
      e.cor_secundaria,
      e.cor_apoio
    FROM cotacoes_frete_tokens tok
    INNER JOIN cotacoes_frete c
      ON c.empresa_id = tok.empresa_id
     AND c.tipo_documento = tok.tipo_documento
     AND c.numero_documento = tok.numero_documento
     AND c.codigo_chave = tok.codigo_chave
    LEFT JOIN cotacoes_frete_envios env
      ON env.empresa_id = tok.empresa_id
     AND env.tipo_documento = tok.tipo_documento
     AND env.numero_documento = tok.numero_documento
     AND env.codigo_chave = tok.codigo_chave
     AND env.numero_envio = tok.numero_envio
    INNER JOIN transportadoras t ON t.id = tok.transportadora_id
    INNER JOIN empresas e ON e.id = tok.empresa_id
    LEFT JOIN LATERAL (
      SELECT cft.valor_frete, cft.prazo_dias
      FROM cotacoes_frete_transportadoras cft
      WHERE cft.empresa_id = c.empresa_id
        AND cft.tipo_documento = c.tipo_documento
        AND cft.numero_documento = c.numero_documento
        AND cft.codigo_chave = c.codigo_chave
        AND cft.transportadora_id = tok.transportadora_id
      ORDER BY CASE WHEN cft.origem_cotacao IN ('ERP', 'AUTOMATICA', 'BANCO') THEN 0 ELSE 1 END,
        COALESCE(cft.ranking_frete, 999999) ASC,
        cft.transportadora_id ASC
      LIMIT 1
    ) propria ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        MIN(cft.valor_frete) AS valor_frete,
        (ARRAY_AGG(cft.prazo_dias ORDER BY cft.valor_frete ASC NULLS LAST, COALESCE(cft.ranking_frete, 999999) ASC, cft.transportadora_id ASC))[1] AS prazo_dias
      FROM cotacoes_frete_transportadoras cft
      WHERE cft.empresa_id = c.empresa_id
        AND cft.tipo_documento = c.tipo_documento
        AND cft.numero_documento = c.numero_documento
        AND cft.codigo_chave = c.codigo_chave
        AND cft.origem_cotacao IN ('ERP', 'AUTOMATICA', 'BANCO')
    ) menor ON TRUE
    WHERE tok.token_hash = $1
      AND COALESCE(c.excluido, FALSE) = FALSE`,
    [tokenHash]
  );
}

export async function listarItensPublicos(cotacaoId: string | number) {
  const cotacao = await resolverCotacaoBase(0, cotacaoId);

  if (!cotacao) {
    return [];
  }

  return consultar(
    `SELECT
      codigo_item,
      descricao_item,
      quantidade,
      cubagem_item,
      largura,
      altura,
      comprimento,
      peso_item
    FROM cotacoes_frete_itens
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
    ORDER BY item_sequencia ASC NULLS LAST, codigo_item ASC NULLS LAST`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave
    ]
  );
}

export async function listarItensPublicosPorToken(tokenHash: string) {
  const token = await consultarUm<{
    empresa_id: number;
    tipo_documento: string;
    numero_documento: string;
    codigo_chave: string;
    numero_envio: number | null;
  }>(
    `SELECT
      tok.empresa_id,
      tok.tipo_documento,
      tok.numero_documento,
      tok.codigo_chave,
      tok.numero_envio
    FROM cotacoes_frete_tokens tok
    INNER JOIN cotacoes_frete c
      ON c.empresa_id = tok.empresa_id
     AND c.tipo_documento = tok.tipo_documento
     AND c.numero_documento = tok.numero_documento
     AND c.codigo_chave = tok.codigo_chave
    WHERE tok.token_hash = $1
      AND COALESCE(c.excluido, FALSE) = FALSE`,
    [tokenHash]
  );

  if (!token) {
    return [];
  }

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
    [
      token.empresa_id,
      token.tipo_documento,
      token.numero_documento,
      token.codigo_chave,
      token.numero_envio ?? null
    ]
  );
}

export async function registrarTokenCotacao(dados: {
  cotacaoId: string | number;
  empresaId: number;
  transportadoraId: number;
  tokenHash: string;
  numeroEnvio?: number | null;
  geradoPorUsuarioId: number;
  expiraEm: Date;
}) {
  const cotacao = await resolverCotacaoBase(dados.empresaId, dados.cotacaoId);
  if (!cotacao) {
    return null;
  }

  return consultarUm<{ token_hash: string; numero_envio: number | null }>(
    `INSERT INTO cotacoes_frete_tokens (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      transportadora_id,
      numero_envio,
      token_hash,
      status,
      utilizado,
      expira_em,
      gerado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'ATIVO', FALSE, $8, $9)
    RETURNING token_hash, numero_envio`,
    [
      dados.empresaId,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      dados.transportadoraId,
      dados.numeroEnvio ?? null,
      dados.tokenHash,
      dados.expiraEm,
      dados.geradoPorUsuarioId
    ]
  );
}

export async function registrarUrlTokenCotacao(dados: {
  tokenHash: string;
  urlPublica: string;
  ambienteLink: string;
}) {
  return consultarUm(
    `UPDATE cotacoes_frete_tokens
    SET url_publica = $2,
      ambiente_link = $3
    WHERE token_hash = $1
    RETURNING token_hash, url_publica, ambiente_link`,
    [dados.tokenHash, dados.urlPublica, dados.ambienteLink]
  );
}

export async function marcarTransportadoraSolicitadaPorLink(dados: {
  cotacaoId: string | number;
  transportadoraId: number;
  slaLimiteEm?: Date | null;
  exigePrazo?: boolean;
}) {
  const cotacao = await resolverCotacaoBase(0, dados.cotacaoId);
  if (!cotacao) {
    return null;
  }

  return consultarUm(
    `UPDATE cotacoes_frete_transportadoras
    SET solicitada_por_link = TRUE,
      resposta_obrigatoria_prazo = COALESCE($6, resposta_obrigatoria_prazo),
      sla_limite_em = COALESCE($7, sla_limite_em),
      status = CASE
        WHEN status IN ('RESPONDIDA', 'SELECIONADA', 'ALTERADA_MANUALMENTE') THEN status
        ELSE 'AGUARDANDO_RESPOSTA'
      END
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND transportadora_id = $5
    RETURNING transportadora_id`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      dados.transportadoraId,
      dados.exigePrazo ?? false,
      dados.slaLimiteEm ?? null
    ]
  );
}

export async function registrarVisualizacaoToken(tokenHash: string) {
  return consultarUm(
    `UPDATE cotacoes_frete_tokens
    SET visualizado_em = COALESCE(visualizado_em, NOW()),
      ultimo_acesso_em = NOW(),
      total_acessos = total_acessos + 1
    WHERE token_hash = $1
    RETURNING token_hash`,
    [tokenHash]
  );
}

export async function registrarRespostaTransportadora(dados: {
  tokenHash: string;
  cotacaoId: string | number;
  transportadoraId: number;
  valorFrete: number;
  prazoDias?: number | null;
  numeroCotacaoTransportadora?: string | null;
  observacao?: string | null;
  ip?: string | null;
  agenteUsuario?: string | null;
}) {
  const cotacao = await resolverCotacaoBase(0, dados.cotacaoId);
  if (!cotacao) {
    return null;
  }

  await consultar(
    `INSERT INTO cotacoes_frete_transportadoras (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      transportadora_id,
      valor_frete,
      prazo_dias,
      prazo_origem,
      origem_cotacao,
      origem_detalhada,
      numero_cotacao_transportadora,
      observacao,
      status,
      cotada_em,
      respondida_em
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'LINK', 'EXTERNA', 'LINK_TRANSPORTADORA', $8, $9, 'RESPONDIDA', NOW(), NOW())
    ON CONFLICT (empresa_id, tipo_documento, numero_documento, codigo_chave, transportadora_id, origem_cotacao) DO UPDATE SET
      valor_frete = EXCLUDED.valor_frete,
      prazo_dias = EXCLUDED.prazo_dias,
      prazo_origem = EXCLUDED.prazo_origem,
      origem_detalhada = EXCLUDED.origem_detalhada,
      numero_cotacao_transportadora = EXCLUDED.numero_cotacao_transportadora,
      observacao = EXCLUDED.observacao,
      status = 'RESPONDIDA',
      cotada_em = NOW(),
      respondida_em = NOW()`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      dados.transportadoraId,
      dados.valorFrete,
      dados.prazoDias ?? null,
      dados.numeroCotacaoTransportadora ?? null,
      dados.observacao ?? null
    ]
  );

  await consultar(
    `UPDATE cotacoes_frete_tokens
    SET utilizado = TRUE,
      utilizado_em = NOW(),
      status = 'UTILIZADO',
      ip_utilizacao = $2,
      agente_usuario_utilizacao = $3
    WHERE token_hash = $1`,
    [dados.tokenHash, dados.ip ?? null, dados.agenteUsuario ?? null]
  );

  await consultar(
    `UPDATE cotacoes_frete_envios_fornecedores
    SET status_envio = 'RESPONDIDO',
      respondido_em = NOW()
    WHERE token_hash = $1`,
    [dados.tokenHash]
  );

  await consultar(
    `INSERT INTO cotacoes_frete_historicos (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      tipo_evento,
      descricao,
      dados_evento
    )
    VALUES ($1, $2, $3, $4, 'RESPOSTA_TRANSPORTADORA', 'Transportadora respondeu cotacao publica.', $5::JSONB)`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      JSON.stringify({
        transportadora_id: dados.transportadoraId,
        valor_frete: dados.valorFrete,
        prazo_dias: dados.prazoDias ?? null,
        numero_cotacao_transportadora: dados.numeroCotacaoTransportadora ?? null,
        observacao: dados.observacao ?? null
      })
    ]
  );

  await registrarTimelineCotacao({
    cotacaoId: dados.cotacaoId,
    transportadoraId: dados.transportadoraId,
    tipoEvento: 'RESPOSTA_LINK',
    titulo: 'Resposta da transportadora',
    descricao: `Valor informado: ${dados.valorFrete}${dados.prazoDias ? `, prazo: ${dados.prazoDias} dias` : ''}${dados.numeroCotacaoTransportadora ? `, cotacao: ${dados.numeroCotacaoTransportadora}` : ''}.`,
    dadosEvento: {
      valor_frete: dados.valorFrete,
      prazo_dias: dados.prazoDias ?? null,
      numero_cotacao_transportadora: dados.numeroCotacaoTransportadora ?? null,
      observacao: dados.observacao ?? null
    }
  });

  await avancarParaAnaliseQuandoCompleto(dados.cotacaoId);
}

export async function registrarTimelineCotacao(dados: {
  cotacaoId: string | number;
  usuarioId?: number | null;
  transportadoraId?: number | null;
  tipoEvento: string;
  titulo: string;
  descricao?: string | null;
  tipoMidia?: string | null;
  midiaBase64?: string | null;
  transcricaoAudio?: string | null;
  dadosEvento?: unknown;
}) {
  const cotacao = await resolverCotacaoBase(0, dados.cotacaoId);
  if (!cotacao) {
    return null;
  }

  return consultarUm(
    `INSERT INTO cotacoes_frete_timeline (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      usuario_id,
      transportadora_id,
      tipo_evento,
      titulo,
      descricao,
      tipo_midia,
      midia_base64,
      transcricao_audio,
      dados_evento
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::JSONB)
    RETURNING timeline_sequencia`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      dados.usuarioId ?? null,
      dados.transportadoraId ?? null,
      dados.tipoEvento,
      dados.titulo,
      dados.descricao ?? null,
      dados.tipoMidia ?? null,
      dados.midiaBase64 ?? null,
      dados.transcricaoAudio ?? null,
      dados.dadosEvento ? JSON.stringify(dados.dadosEvento) : null
    ]
  );
}

export async function avancarParaAnaliseQuandoCompleto(cotacaoId: string | number) {
  const cotacao = await resolverCotacaoBase(0, cotacaoId);
  if (!cotacao) {
    return null;
  }

  await sincronizarStatusCotacoes(cotacao.empresa_id, cotacao.id);

  const atualizada = await consultarUm<{ etapa_kanban_id: number; status: string }>(
    `SELECT etapa_kanban_id, status
    FROM cotacoes_frete
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND COALESCE(excluido, FALSE) = FALSE`,
    [cotacao.empresa_id, cotacao.tipo_documento, cotacao.numero_documento, cotacao.codigo_chave]
  );

  if (!atualizada || atualizada.status !== 'EM_ANALISE') {
    return null;
  }

  return {
    id: cotacao.id,
    etapa_kanban_id: atualizada.etapa_kanban_id,
    status: atualizada.status
  };
}

export async function escolherTransportadora(dados: {
  empresaId: number;
  cotacaoId: string | number;
  cotacaoTransportadoraId: string | number;
  usuarioId: number;
  motivoId?: number | null;
  motivoDescricao?: string | null;
}) {
  await consultar(
    `CREATE TABLE IF NOT EXISTS motivos_escolha_transportadora (
      id BIGSERIAL PRIMARY KEY,
      codigo VARCHAR(80) NOT NULL UNIQUE,
      descricao VARCHAR(220) NOT NULL,
      padrao_transportadora_pedido BOOLEAN NOT NULL DEFAULT FALSE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      alterado_em TIMESTAMPTZ
    )`
  );
  await consultar(
    `ALTER TABLE cotacoes_frete
      ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_id BIGINT REFERENCES motivos_escolha_transportadora(id),
      ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_descricao TEXT`
  );

  await consultar(
    `ALTER TABLE cotacoes_frete_transportadoras
      ADD COLUMN IF NOT EXISTS escolhida_plataforma BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sequencia INTEGER`
  );

  const cotacaoBase = await resolverCotacaoBase(dados.empresaId, dados.cotacaoId);
  if (!cotacaoBase) {
    return null;
  }

  const identificador = decodeURIComponent(String(dados.cotacaoTransportadoraId ?? '')).trim();
  const partes = identificador.split('|');
  const transportadoraId = Number(partes.length >= 5 ? partes[4] : dados.cotacaoTransportadoraId);
  const origemCotacao = partes.length >= 6 ? partes.slice(5).join('|').trim().toUpperCase() : null;

  if (!Number.isFinite(transportadoraId) || transportadoraId <= 0) {
    return null;
  }

  const cotacao = await consultarUm<{
    bloqueado_para_alteracao: boolean;
    status: string | null;
    origem_comercial: string | null;
    transportadora_pedido_id: number | null;
    transportadora_pedido_nome: string | null;
    tipo_documento: string;
    numero_documento: string;
    codigo_chave: string;
    transportadora_id: number;
    nome_fantasia: string | null;
    valor_frete: string;
    prazo_dias: number | null;
    origem_cotacao: string;
    menor_valor_frete: string | null;
  }>(
    `SELECT
      c.bloqueado_para_alteracao,
      c.status,
      c.origem_comercial,
      c.transportadora_pedido_id,
      c.transportadora_pedido_nome,
      c.tipo_documento,
      c.numero_documento,
      c.codigo_chave,
      cft.transportadora_id,
      t.nome_fantasia,
      cft.valor_frete,
      COALESCE(cft.prazo_dias, 0) AS prazo_dias,
      cft.origem_cotacao,
      menor.menor_valor_frete
    FROM cotacoes_frete c
    INNER JOIN cotacoes_frete_transportadoras cft
      ON cft.empresa_id = c.empresa_id
     AND cft.tipo_documento = c.tipo_documento
     AND cft.numero_documento = c.numero_documento
     AND cft.codigo_chave = c.codigo_chave
    LEFT JOIN transportadoras t ON t.id = cft.transportadora_id
    LEFT JOIN LATERAL (
      SELECT MIN(valor_frete) AS menor_valor_frete
      FROM cotacoes_frete_transportadoras cft_menor
      WHERE cft_menor.empresa_id = c.empresa_id
        AND cft_menor.tipo_documento = c.tipo_documento
        AND cft_menor.numero_documento = c.numero_documento
        AND cft_menor.codigo_chave = c.codigo_chave
        AND COALESCE(cft_menor.valor_frete, 0) > 0
    ) menor ON TRUE
    WHERE c.empresa_id = $1
      AND c.tipo_documento = $2
      AND c.numero_documento = $3
      AND c.codigo_chave = $4
      AND cft.transportadora_id = $5
      AND COALESCE(c.excluido, FALSE) = FALSE
    ORDER BY
      CASE
        WHEN $6::VARCHAR IS NULL THEN 0
        WHEN cft.origem_cotacao = $6 THEN 0
        ELSE 1
      END,
      COALESCE(cft.valor_frete, 0) ASC,
      cft.alterado_em DESC NULLS LAST
    LIMIT 1`,
    [dados.empresaId, cotacaoBase.tipo_documento, cotacaoBase.numero_documento, cotacaoBase.codigo_chave, transportadoraId, origemCotacao]
  );

  if (!cotacao || cotacao.bloqueado_para_alteracao) {
    return null;
  }

  if (String(cotacao.status ?? '').toUpperCase() === 'CTE_EMITIDO') {
    return null;
  }

  const parametroOrigens = await consultarUm<{ valor: string }>(
    `SELECT valor
    FROM parametros_sistema
    WHERE chave = 'ORIGENS_OBRIGAM_TRANSPORTADORA_PEDIDO'`
  );
  const origensObrigatorias = String(parametroOrigens?.valor ?? '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const origemAtual = String(cotacao.origem_comercial ?? '').trim().toUpperCase();
  const obrigaTransportadoraPedido = Boolean(cotacao.transportadora_pedido_id) && origensObrigatorias.includes(origemAtual);

  let motivoId = dados.motivoId ?? null;
  let motivoDescricao = dados.motivoDescricao?.trim() || null;

  if (obrigaTransportadoraPedido && Number(cotacao.transportadora_pedido_id) !== Number(cotacao.transportadora_id)) {
    throw new Error('Esta origem obriga escolher a transportadora definida no pedido.');
  }

  if (obrigaTransportadoraPedido) {
    const parametroMotivo = await consultarUm<{ valor: string }>(
      `SELECT valor
      FROM parametros_sistema
      WHERE chave = 'MOTIVO_PADRAO_TRANSPORTADORA_PEDIDO_ID'`
    );
    const motivoPadrao = Number(parametroMotivo?.valor ?? 0);
    if (motivoPadrao > 0) {
      motivoId = motivoPadrao;
    }
    motivoDescricao = motivoDescricao || 'Transportadora definida no pedido/origem comercial.';
  }

  const menorValor = Number(cotacao.menor_valor_frete ?? 0);
  const valorEscolhido = Number(cotacao.valor_frete ?? 0);
  const escolhaNaoVencedora = menorValor > 0 && valorEscolhido > menorValor;
  if (escolhaNaoVencedora && !motivoId && !motivoDescricao) {
    throw new Error('Informe o motivo para escolher uma transportadora que nÃ£o venceu a cotaÃ§Ã£o.');
  }

  await consultar(
    `UPDATE cotacoes_frete_transportadoras
    SET selecionada = FALSE,
      escolhida_plataforma = FALSE
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4`,
    [dados.empresaId, cotacao.tipo_documento, cotacao.numero_documento, cotacao.codigo_chave]
  );

  await consultar(
    `UPDATE cotacoes_frete_transportadoras
    SET selecionada = TRUE,
      escolhida_plataforma = TRUE,
      validada = TRUE,
      validada_por_usuario_id = $3,
      validada_em = NOW(),
      status = 'SELECIONADA'
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $4
      AND codigo_chave = $5
      AND transportadora_id = $6
      AND origem_cotacao = $7`,
    [
      dados.empresaId,
      cotacao.tipo_documento,
      dados.usuarioId,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      cotacao.transportadora_id,
      cotacao.origem_cotacao
    ]
  );

  const cabecalhoAtualizado = await consultarUm<{
    transportadora_escolhida_id: number;
    valor_frete_final: string | null;
    prazo_final_dias: number | null;
    escolhido_em: Date | string | null;
  }>(
    `UPDATE cotacoes_frete
    SET transportadora_escolhida_id = $5,
      escolhido_por_usuario_id = $6,
      escolhido_em = NOW(),
      valor_frete_final = $7,
      prazo_final_dias = $8,
      motivo_escolha_transportadora_id = $9,
      motivo_escolha_transportadora_descricao = $10,
      alterado_em = NOW(),
      alterado_por_usuario_id = $6
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND COALESCE(excluido, FALSE) = FALSE
    RETURNING transportadora_escolhida_id, valor_frete_final, prazo_final_dias, escolhido_em`,
    [
      dados.empresaId,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      cotacao.transportadora_id,
      dados.usuarioId,
      cotacao.valor_frete,
      cotacao.prazo_dias,
      motivoId,
      motivoDescricao
    ]
  );

  if (!cabecalhoAtualizado?.escolhido_em) {
    throw new Error('Nao foi possivel gravar a data da escolha da transportadora.');
  }

  await sincronizarStatusCotacoes(dados.empresaId, cotacaoBase.id);

  await registrarTimelineCotacao({
    cotacaoId: cotacaoBase.id,
    usuarioId: dados.usuarioId,
    transportadoraId: cotacao.transportadora_id,
    tipoEvento: 'APROVACAO_ANALISTA',
    titulo: 'Transportadora aprovada',
    descricao: `Valor final ${cotacao.valor_frete}${cotacao.prazo_dias ? `, prazo ${cotacao.prazo_dias} dias` : ''}${motivoDescricao ? ` Motivo: ${motivoDescricao}` : ''}.`,
    dadosEvento: {
      transportadora_id: cotacao.transportadora_id,
      valor_frete_final: cotacao.valor_frete,
      prazo_final_dias: cotacao.prazo_dias,
      motivo_id: motivoId,
      motivo_descricao: motivoDescricao,
      escolha_nao_vencedora: escolhaNaoVencedora
    }
  });

  return {
    transportadora_id: cotacao.transportadora_id,
    valor_frete_final: cabecalhoAtualizado.valor_frete_final ?? cotacao.valor_frete,
    prazo_final_dias: cabecalhoAtualizado.prazo_final_dias ?? cotacao.prazo_dias,
    escolhido_em: cabecalhoAtualizado.escolhido_em,
    motivo_id: motivoId,
    motivo_descricao: motivoDescricao
  };
}

export async function alterarValorFreteManual(dados: {
  empresaId: number;
  cotacaoTransportadoraId: string | number;
  valorFrete: number;
  prazoDias?: number | null;
  usuarioId: number;
  observacao?: string | null;
}) {
  const identificador = decodeURIComponent(String(dados.cotacaoTransportadoraId ?? '')).trim();
  const partes = identificador.split('|');
  const chaveInformada = partes.length >= 4
    ? {
        empresa_id: Number(partes[0]) || dados.empresaId,
        tipo_documento: partes[1],
        numero_documento: partes[2],
        codigo_chave: partes[3]
      }
    : null;
  const transportadoraId = Number(partes.length >= 5 ? partes[4] : dados.cotacaoTransportadoraId);
  const origemCotacao = partes.length >= 6 ? partes.slice(5).join('|') : null;

  if (!Number.isFinite(transportadoraId) || transportadoraId <= 0) {
    return null;
  }

  const anterior = await consultarUm<{
    empresa_id: number;
    tipo_documento: string;
    numero_documento: string;
    codigo_chave: string;
    valor_frete: string;
    prazo_dias: number | null;
    origem_cotacao: string;
  }>(
    `SELECT
      cft.empresa_id,
      cft.tipo_documento,
      cft.numero_documento,
      cft.codigo_chave,
      cft.valor_frete,
      COALESCE(cft.prazo_dias, 0) AS prazo_dias,
      cft.origem_cotacao
    FROM cotacoes_frete_transportadoras cft
    INNER JOIN cotacoes_frete c
      ON c.empresa_id = cft.empresa_id
     AND c.tipo_documento = cft.tipo_documento
     AND c.numero_documento = cft.numero_documento
     AND c.codigo_chave = cft.codigo_chave
    WHERE cft.transportadora_id = $1
      AND cft.empresa_id = $2
      AND ($3::VARCHAR IS NULL OR cft.origem_cotacao = $3)
      AND ($4::VARCHAR IS NULL OR cft.tipo_documento = $4)
      AND ($5::VARCHAR IS NULL OR cft.numero_documento = $5)
      AND ($6::VARCHAR IS NULL OR cft.codigo_chave = $6)
      AND c.bloqueado_para_alteracao = FALSE
      AND COALESCE(c.excluido, FALSE) = FALSE
      AND cft.origem_cotacao NOT IN ('ERP', 'AUTOMATICA')`,
    [
      transportadoraId,
      dados.empresaId,
      origemCotacao,
      chaveInformada?.tipo_documento ?? null,
      chaveInformada?.numero_documento ?? null,
      chaveInformada?.codigo_chave ?? null
    ]
  );

  if (!anterior) {
    return null;
  }

  const atualizado = await consultarUm(
    `UPDATE cotacoes_frete_transportadoras
    SET valor_frete = $2,
      prazo_dias = COALESCE($3, prazo_dias),
      prazo_origem = CASE WHEN $3 IS NULL THEN prazo_origem ELSE 'MANUAL' END,
      observacao = COALESCE($4, observacao),
      origem_cotacao = 'MANUAL',
      validada = TRUE,
      validada_por_usuario_id = $5,
      validada_em = NOW(),
      status = 'ALTERADA_MANUALMENTE'
    WHERE empresa_id = $1
      AND tipo_documento = $6
      AND numero_documento = $7
      AND codigo_chave = $8
      AND transportadora_id = $9
      AND origem_cotacao = $10
    RETURNING *`,
    [
      anterior.empresa_id,
      dados.valorFrete,
      dados.prazoDias ?? null,
      dados.observacao ?? null,
      dados.usuarioId,
      anterior.tipo_documento,
      anterior.numero_documento,
      anterior.codigo_chave,
      transportadoraId,
      anterior.origem_cotacao
    ]
  );

  await consultar(
    `INSERT INTO cotacoes_frete_historicos (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      usuario_id,
      tipo_evento,
      descricao,
      dados_evento
    )
    VALUES ($1, $2, $3, $4, $5, 'ALTERAR_VALOR_MANUAL', 'Valor de frete alterado manualmente pelo usuario.', $6::JSONB)`,
    [
      anterior.empresa_id,
      anterior.tipo_documento,
      anterior.numero_documento,
      anterior.codigo_chave,
      dados.usuarioId,
      JSON.stringify({
        cotacao_transportadora_id: dados.cotacaoTransportadoraId,
        valor_original: anterior.valor_frete,
        valor_alterado: dados.valorFrete,
        prazo_original_dias: anterior.prazo_dias,
        prazo_alterado_dias: dados.prazoDias ?? null,
        observacao: dados.observacao ?? null
      })
    ]
  );

  const cotacao = await resolverCotacaoBase(anterior.empresa_id, `${anterior.empresa_id}|${anterior.tipo_documento}|${anterior.numero_documento}|${anterior.codigo_chave}`);
  if (cotacao) {
    await sincronizarStatusCotacoes(anterior.empresa_id, cotacao.id);
  }

  await registrarTimelineCotacao({
    cotacaoId: `${anterior.empresa_id}|${anterior.tipo_documento}|${anterior.numero_documento}|${anterior.codigo_chave}`,
    usuarioId: dados.usuarioId,
    tipoEvento: 'AJUSTE_MANUAL',
    titulo: 'Valor ou prazo ajustado',
    descricao: `Valor alterado de ${anterior.valor_frete} para ${dados.valorFrete}.`,
    dadosEvento: {
      cotacao_transportadora_id: dados.cotacaoTransportadoraId,
      valor_original: anterior.valor_frete,
      valor_alterado: dados.valorFrete,
      prazo_original_dias: anterior.prazo_dias,
      prazo_alterado_dias: dados.prazoDias ?? null,
      observacao: dados.observacao ?? null
    }
  });

  return atualizado;
}

export async function alterarEtapaCotacao(dados: {
  empresaId: number;
  cotacaoId: string | number;
  etapaId: number;
  usuarioId: number;
  feedback?: string | null;
}) {
  const etapa = await consultarUm<{ obriga_feedback: boolean; nome: string }>(
    `SELECT
      obriga_feedback,
      nome
    FROM etapas_kanban
    WHERE id = $1
      AND empresa_id = $2
      AND ativa = TRUE`,
    [dados.etapaId, dados.empresaId]
  );

  if (!etapa || (etapa.obriga_feedback && !dados.feedback?.trim())) {
    return null;
  }

  const cotacao = await resolverCotacaoBase(dados.empresaId, dados.cotacaoId);
  if (!cotacao) {
    return null;
  }

  const resultado = await consultarUm(
    `UPDATE cotacoes_frete
    SET etapa_kanban_id = $5,
      alterado_em = NOW(),
      alterado_por_usuario_id = $6
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND bloqueado_para_alteracao = FALSE
      AND COALESCE(excluido, FALSE) = FALSE
    RETURNING ${montarIdCotacaoSql('cotacoes_frete')} AS id, etapa_kanban_id`,
    [cotacao.empresa_id, cotacao.tipo_documento, cotacao.numero_documento, cotacao.codigo_chave, dados.etapaId, dados.usuarioId]
  );

  if (resultado) {
    await consultar(
      `INSERT INTO cotacoes_frete_historicos (
        empresa_id,
        tipo_documento,
        numero_documento,
        codigo_chave,
        usuario_id,
        tipo_evento,
        descricao,
        dados_evento
      )
      VALUES ($1, $2, $3, $4, $5, 'ALTERAR_ETAPA', $6, $7::JSONB)`,
      [
        cotacao.empresa_id,
        cotacao.tipo_documento,
        cotacao.numero_documento,
        cotacao.codigo_chave,
        dados.usuarioId,
        `Etapa alterada para ${etapa.nome}.`,
        JSON.stringify({
          etapa_id: dados.etapaId,
          etapa_nome: etapa.nome,
          feedback_usuario: dados.feedback?.trim() ?? null
        })
      ]
    );
  }

  return resultado;
}

export async function avancarEtapaAposEnvio(dados: {
  empresaId: number;
  cotacaoId: string | number;
  usuarioId: number;
  envioId: number;
  codigoChave: string;
}) {
  const cotacao = await resolverCotacaoBase(dados.empresaId, dados.cotacaoId);
  if (!cotacao || cotacao.bloqueado_para_alteracao || cotacao.excluido) {
    return null;
  }

  const destino = await consultarUm<{ etapa_id: number; etapa_nome: string }>(
    `SELECT
      etapa.id AS etapa_id,
      etapa.nome AS etapa_nome
    FROM cotacoes_frete c
    INNER JOIN etapas_kanban etapa
      ON etapa.empresa_id = c.empresa_id
     AND etapa.ativa = TRUE
     AND etapa.codigo = 'COTACAO_TRANSPORTADORA'
    WHERE c.empresa_id = $1
      AND c.tipo_documento = $2
      AND c.numero_documento = $3
      AND c.codigo_chave = $4
      AND c.bloqueado_para_alteracao = FALSE
      AND COALESCE(c.excluido, FALSE) = FALSE
    LIMIT 1`,
    [cotacao.empresa_id, cotacao.tipo_documento, cotacao.numero_documento, cotacao.codigo_chave]
  );

  if (!destino) {
    return null;
  }

  const resultado = await consultarUm(
    `UPDATE cotacoes_frete
    SET etapa_kanban_id = $5,
      status = 'COTACAO_TRANSPORTADORA',
      alterado_em = NOW(),
      alterado_por_usuario_id = $6
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND COALESCE(excluido, FALSE) = FALSE
    RETURNING ${montarIdCotacaoSql('cotacoes_frete')} AS id, etapa_kanban_id, status`,
    [cotacao.empresa_id, cotacao.tipo_documento, cotacao.numero_documento, cotacao.codigo_chave, destino.etapa_id, dados.usuarioId]
  );

  if (resultado) {
    await consultar(
      `INSERT INTO cotacoes_frete_historicos (
        empresa_id,
        tipo_documento,
        numero_documento,
        codigo_chave,
        usuario_id,
        numero_envio,
        tipo_evento,
        descricao,
        dados_evento
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'AVANCO_AUTOMATICO_ENVIO', $7, $8::JSONB)`,
      [
        cotacao.empresa_id,
        cotacao.tipo_documento,
        cotacao.numero_documento,
        cotacao.codigo_chave,
        dados.usuarioId,
        dados.envioId,
        `Cotacao avancada automaticamente apos envio para ${destino.etapa_nome}.`,
        JSON.stringify({ etapa_id: destino.etapa_id, etapa_nome: destino.etapa_nome })
      ]
    );
  }

  return resultado;
}

export async function bloquearCotacaoPorErp(dados: {
  empresaId: number;
  cotacaoId: number;
  usuarioId: number;
  payloadRetorno?: unknown;
}) {
  return consultarUm(
    `UPDATE cotacoes_frete
    SET atualizado_no_erp = TRUE,
      atualizado_no_erp_em = NOW(),
      bloqueado_para_alteracao = TRUE,
      status = 'BLOQUEADO_FINALIZADO',
      payload_retorno = COALESCE($4::JSONB, payload_retorno),
      alterado_em = NOW(),
      alterado_por_usuario_id = $3
    WHERE id = $1
      AND empresa_id = $2
      AND COALESCE(excluido, FALSE) = FALSE
    RETURNING id, atualizado_no_erp, bloqueado_para_alteracao, status`,
    [
      dados.cotacaoId,
      dados.empresaId,
      dados.usuarioId,
      dados.payloadRetorno ? JSON.stringify(dados.payloadRetorno) : null
    ]
  );
}

export async function receberCotacaoErp(empresaId: number, dados: any) {
  const etapa = await consultarUm<{ id: number }>(
    `SELECT id
    FROM etapas_kanban
    WHERE empresa_id = $1
      AND codigo = 'RECEBIDO_ERP'
    LIMIT 1`,
    [empresaId]
  );

  const cotacao = await consultarUm<{
    id: number;
    tipo_documento: string;
    numero_documento: string;
    codigo_chave: string;
  }>(
    `INSERT INTO cotacoes_frete (
      empresa_id,
      etapa_kanban_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      chave_nfe,
      numero_pedido,
      data_documento,
      status,
      loja_origem,
      loja_destino,
      valor_mercadoria,
      peso_real,
      volumes_total,
      cubagem_total,
      percentual_sobre_nf,
      valor_solicitado,
      cnpj_emitente,
      endereco_coleta,
      cep_coleta,
      cidade_coleta,
      uf_coleta,
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
    VALUES ($1, $2, $3, $4, COALESCE($5, CONCAT($4, '-P001')), $6, $7, $8, 'RECEBIDO_ERP', $9, $10, COALESCE($11::NUMERIC, 0), COALESCE($12::NUMERIC, 0), COALESCE($13::NUMERIC, 0), COALESCE($14::NUMERIC, 0), $15::NUMERIC, $16::NUMERIC, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, COALESCE($28::BOOLEAN, FALSE), COALESCE($29::BOOLEAN, FALSE), $30, $31::JSONB)
    ON CONFLICT (empresa_id, tipo_documento, numero_documento, codigo_chave) DO UPDATE SET
      chave_nfe = EXCLUDED.chave_nfe,
      numero_pedido = EXCLUDED.numero_pedido,
      data_documento = EXCLUDED.data_documento,
      loja_origem = EXCLUDED.loja_origem,
      loja_destino = EXCLUDED.loja_destino,
      valor_mercadoria = EXCLUDED.valor_mercadoria,
      peso_real = EXCLUDED.peso_real,
      volumes_total = EXCLUDED.volumes_total,
      cubagem_total = EXCLUDED.cubagem_total,
      percentual_sobre_nf = EXCLUDED.percentual_sobre_nf,
      valor_solicitado = EXCLUDED.valor_solicitado,
      cnpj_emitente = EXCLUDED.cnpj_emitente,
      endereco_coleta = EXCLUDED.endereco_coleta,
      cep_coleta = EXCLUDED.cep_coleta,
      cidade_coleta = EXCLUDED.cidade_coleta,
      uf_coleta = EXCLUDED.uf_coleta,
      cep_destino = EXCLUDED.cep_destino,
      uf_destino = EXCLUDED.uf_destino,
      cidade_destino = EXCLUDED.cidade_destino,
      endereco_destinatario = EXCLUDED.endereco_destinatario,
      nome_destinatario = EXCLUDED.nome_destinatario,
      documento_destinatario = EXCLUDED.documento_destinatario,
      destino_zona_rural = EXCLUDED.destino_zona_rural,
      destinatario_pessoa_fisica = EXCLUDED.destinatario_pessoa_fisica,
      identificador_externo = EXCLUDED.identificador_externo,
      payload_recebido = EXCLUDED.payload_recebido,
      alterado_em = NOW()
    WHERE COALESCE(cotacoes_frete.excluido, FALSE) = FALSE
    RETURNING id, tipo_documento, numero_documento, codigo_chave`,
    [
      empresaId,
      etapa?.id ?? null,
      dados.tipo_documento ?? 'PEDIDO',
      dados.numero_documento,
      dados.codigo_chave ?? dados.codigo_chave_cotacao ?? null,
      dados.chave_nfe ?? null,
      dados.numero_pedido ?? dados.pedido ?? null,
      dados.data_documento ?? null,
      dados.loja_origem ?? null,
      dados.loja_destino ?? null,
      dados.valor_mercadoria ?? 0,
      dados.peso_real ?? 0,
      dados.volumes_total ?? 0,
      dados.cubagem_total ?? 0,
      dados.percentual_sobre_nf ?? null,
      dados.valor_solicitado ?? null,
      dados.cnpj_emitente ?? dados.cnpj_remetente ?? dados.documento_emitente ?? null,
      dados.endereco_coleta ?? dados.endereco_remetente ?? null,
      dados.cep_coleta ?? dados.cep_origem ?? null,
      dados.cidade_coleta ?? dados.cidade_origem ?? null,
      dados.uf_coleta ?? dados.uf_origem ?? null,
      dados.cep_destino ?? null,
      dados.uf_destino ?? null,
      dados.cidade_destino ?? null,
      dados.endereco_destinatario ?? null,
      dados.nome_destinatario ?? null,
      dados.documento_destinatario ?? null,
      dados.destino_zona_rural ?? false,
      dados.destinatario_pessoa_fisica ?? false,
      dados.identificador_externo ?? null,
      JSON.stringify(dados)
    ]
  );

  if (!cotacao) {
    return null;
  }

  await consultar(
    `UPDATE cotacoes_frete
    SET origem_comercial = COALESCE($2, origem_comercial),
      transportadora_pedido_codigo = $3,
      transportadora_pedido_nome = $4,
      valor_frete_pedido = $5,
      prazo_pedido_dias = $6,
      prazo_vendedor_dias = $7,
      prazo_informado_venda_dias = COALESCE($8, $7, prazo_informado_venda_dias),
      valor_frete_venda = COALESCE($9, $5, valor_frete_venda),
      vendedor_codigo = $10,
      vendedor_nome = $11,
      numero_nfe_faturada = COALESCE($12, numero_nfe_faturada),
      numero_cte = COALESCE($13, numero_cte),
      idempotencia_origem = $14,
      alterado_em = NOW()
    WHERE id = $1
      AND COALESCE(excluido, FALSE) = FALSE`,
    [
      cotacao.id,
      String(dados.origem_comercial ?? dados.origem ?? 'ERP').toUpperCase(),
      dados.transportadora_pedido_codigo ?? dados.transportadora_definida_codigo ?? null,
      dados.transportadora_pedido_nome ?? dados.transportadora_definida_nome ?? null,
      dados.valor_frete_pedido ?? null,
      dados.prazo_pedido_dias ?? null,
      dados.prazo_vendedor_dias ?? dados.prazo_vendedor ?? null,
      dados.prazo_informado_venda_dias ?? dados.prazo_venda_dias ?? dados.prazo_venda ?? null,
      dados.valor_frete_venda ?? dados.valor_frete_cobrado_venda ?? dados.valor_solicitado ?? null,
      dados.vendedor_codigo ?? dados.codigo_vendedor ?? null,
      dados.vendedor_nome ?? dados.nome_vendedor ?? dados.vendedor ?? null,
      dados.numero_nfe_faturada ?? dados.numero_nfe ?? null,
      dados.numero_cte ?? null,
      dados.idempotencia_origem ?? dados.identificador_externo ?? null
    ]
  );

  await consultar(
    `DELETE FROM cotacoes_frete_itens
    WHERE cotacao_frete_id = $1`,
    [cotacao.id]
  );

  for (const item of dados.itens ?? []) {
    await consultar(
      `INSERT INTO cotacoes_frete_itens (
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
      VALUES ($1, $2, $3, COALESCE($4::NUMERIC, 0), COALESCE($5::NUMERIC, 0), COALESCE($6::NUMERIC, 0), COALESCE($7::NUMERIC, 0), COALESCE($8::NUMERIC, 0), COALESCE($9::NUMERIC, 0))`,
      [
        cotacao.id,
        item.codigo_item ?? null,
        item.descricao_item ?? 'Item recebido do ERP',
        item.quantidade ?? 0,
        item.cubagem_item ?? 0,
        item.largura ?? 0,
        item.altura ?? 0,
        item.comprimento ?? 0,
        item.peso_item ?? 0
      ]
    );
  }

  const codigoTransportadoraPedido = dados.transportadora_pedido_codigo ?? dados.transportadora_definida_codigo ?? null;
  const origemComercial = String(dados.origem_comercial ?? dados.origem ?? '').toUpperCase();
  const transportadorasRecebidas = origemComercial === 'MARKETPLACE' && codigoTransportadoraPedido
    ? (dados.transportadoras ?? []).filter((transporte: any) => String(transporte.codigo_transportadora ?? transporte.codigo_interno ?? '') === String(codigoTransportadoraPedido))
    : (dados.transportadoras ?? []);

  for (const transporte of transportadorasRecebidas) {
    const transportadora = await consultarUm<{ id: number }>(
      `INSERT INTO transportadoras (
        codigo_interno,
        razao_social,
        nome_fantasia,
        documento,
        email,
        ativa
      )
      VALUES ($1, $2, $3, $4, $5, TRUE)
      ON CONFLICT (codigo_interno) DO UPDATE SET
        razao_social = EXCLUDED.razao_social,
        nome_fantasia = EXCLUDED.nome_fantasia,
        documento = EXCLUDED.documento,
        email = EXCLUDED.email,
        ativa = TRUE
      RETURNING id`,
      [
        transporte.codigo_transportadora ?? transporte.codigo_interno,
        transporte.razao_social ?? transporte.nome_fantasia ?? 'Transportadora ERP',
        transporte.nome_fantasia ?? transporte.razao_social ?? 'Transportadora ERP',
        transporte.documento ?? null,
        transporte.email ?? null
      ]
    );

    if (transportadora) {
      if (String(transporte.codigo_transportadora ?? transporte.codigo_interno ?? '') === String(codigoTransportadoraPedido ?? '')) {
        await consultar(
          `UPDATE cotacoes_frete
          SET transportadora_pedido_id = $2
          WHERE id = $1
            AND COALESCE(excluido, FALSE) = FALSE`,
          [cotacao.id, transportadora.id]
        );
      }

      await consultar(
        `INSERT INTO transportadoras_empresas (transportadora_id, empresa_id, ativa)
        VALUES ($1, $2, TRUE)
        ON CONFLICT (transportadora_id, empresa_id) DO UPDATE SET ativa = TRUE`,
        [transportadora.id, empresaId]
      );

      await consultar(
        `INSERT INTO cotacoes_frete_transportadoras (
          cotacao_frete_id,
          empresa_id,
          tipo_documento,
          numero_documento,
          codigo_chave,
          transportadora_id,
          codigo_transportadora,
          sequencia,
          valor_frete,
          prazo_dias,
          prazo_origem,
          percentual_frete,
          ranking_frete,
          origem_cotacao,
          origem_detalhada,
          observacao,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::INTEGER, COALESCE($9::NUMERIC, 0), $10::INTEGER, 'ERP', $11::NUMERIC, $12::INTEGER, 'ERP', 'COTACAO_AUTOMATICA', $13, 'RECEBIDA')
        ON CONFLICT (cotacao_frete_id, transportadora_id, origem_cotacao) DO UPDATE SET
          empresa_id = EXCLUDED.empresa_id,
          tipo_documento = EXCLUDED.tipo_documento,
          numero_documento = EXCLUDED.numero_documento,
          codigo_chave = EXCLUDED.codigo_chave,
          sequencia = EXCLUDED.sequencia,
          valor_frete = EXCLUDED.valor_frete,
          prazo_dias = EXCLUDED.prazo_dias,
          prazo_origem = EXCLUDED.prazo_origem,
          percentual_frete = EXCLUDED.percentual_frete,
          ranking_frete = EXCLUDED.ranking_frete,
          origem_detalhada = EXCLUDED.origem_detalhada,
          observacao = EXCLUDED.observacao,
          status = 'RECEBIDA',
          cotada_em = NOW()`,
        [
          cotacao.id,
          empresaId,
          cotacao.tipo_documento,
          cotacao.numero_documento,
          cotacao.codigo_chave,
          transportadora.id,
          transporte.codigo_transportadora ?? transporte.codigo_interno,
          transporte.sequencia ?? transporte.SEQUENCIA ?? null,
          transporte.valor_frete ?? 0,
          transporte.prazo_dias ?? transporte.prazo ?? null,
          transporte.percentual_frete ?? null,
          transporte.ranking_frete ?? null,
          transporte.observacao ?? null
        ]
      );
    }
  }

  if (transportadorasRecebidas.length > 0) {
    await consultar(
      `UPDATE cotacoes_frete c
      SET etapa_kanban_id = e.id,
        status = 'COTACAO_AUTOMATICA',
        alterado_em = NOW()
      FROM etapas_kanban e
      WHERE c.id = $1
        AND e.empresa_id = c.empresa_id
        AND e.codigo = 'COTACAO_AUTOMATICA'
        AND e.ativa = TRUE`,
      [cotacao.id]
    );

    await registrarTimelineCotacao({
      cotacaoId: cotacao.id,
      tipoEvento: 'COTACAO_AUTOMATICA',
      titulo: 'Cotacao automatica recebida',
      descricao: `${transportadorasRecebidas.length} opcao(oes) retornada(s) pela integracao.`,
      dadosEvento: {
        origem_comercial: origemComercial || 'ERP',
        total_transportadoras: transportadorasRecebidas.length,
        transportadora_pedido_codigo: codigoTransportadoraPedido ?? null
      }
    });
  }

  return cotacao;
}

export async function adicionarTransportadoraCotacao(dados: {
  empresaId: number;
  cotacaoId: string | number;
  transportadoraId: number;
  usuarioId: number;
  observacao?: string | null;
}) {
  const cotacao = await consultarUm<{
    empresa_id: number;
    tipo_documento: string;
    numero_documento: string;
    codigo_chave: string;
    bloqueado_para_alteracao: boolean;
  }>(
    `SELECT
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      bloqueado_para_alteracao
    FROM cotacoes_frete
    WHERE ${montarCondicaoChave('cotacoes_frete')}
      AND COALESCE(excluido, FALSE) = FALSE`,
    parametrosChave(interpretarChaveCotacao(dados.empresaId, dados.cotacaoId))
  );

  if (!cotacao || cotacao.bloqueado_para_alteracao) {
    return null;
  }

  const registro = await consultarUm(
    `INSERT INTO cotacoes_frete_transportadoras (
      empresa_id,
      tipo_documento,
      numero_documento,
      codigo_chave,
      transportadora_id,
      codigo_transportadora,
      valor_frete,
      origem_cotacao,
      origem_detalhada,
      observacao,
      status
    )
    SELECT
      $1,
      $2,
      $3,
      $4,
      t.id,
      t.codigo_interno,
      0,
      'MANUAL',
      'ADICIONADA_ANALISTA',
      $6,
      'PENDENTE_ENVIO'
    FROM transportadoras t
    WHERE t.id = $5
      AND t.ativa = TRUE
      AND t.excluido = FALSE
    ON CONFLICT (empresa_id, tipo_documento, numero_documento, codigo_chave, transportadora_id, origem_cotacao) DO UPDATE SET
      observacao = COALESCE(EXCLUDED.observacao, cotacoes_frete_transportadoras.observacao),
      status = CASE
        WHEN cotacoes_frete_transportadoras.status IN ('RESPONDIDA', 'SELECIONADA', 'ALTERADA_MANUALMENTE') THEN cotacoes_frete_transportadoras.status
        ELSE 'PENDENTE_ENVIO'
      END
    RETURNING
      0 AS registro_id,
      CONCAT_WS('|', empresa_id, tipo_documento, numero_documento, codigo_chave, transportadora_id, origem_cotacao) AS id,
      *`,
    [
      cotacao.empresa_id,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      dados.transportadoraId,
      dados.observacao ?? 'Transportadora adicionada manualmente pelo analista.'
    ]
  );

  if (registro) {
    await registrarTimelineCotacao({
      cotacaoId: `${cotacao.empresa_id}|${cotacao.tipo_documento}|${cotacao.numero_documento}|${cotacao.codigo_chave}`,
      usuarioId: dados.usuarioId,
      transportadoraId: dados.transportadoraId,
      tipoEvento: 'TRANSPORTADORA_ADICIONADA',
      titulo: 'Transportadora adicionada',
      descricao: dados.observacao ?? 'Transportadora incluida manualmente para ampliar a concorrencia.',
      dadosEvento: { transportadora_id: dados.transportadoraId }
    });
  }

  return registro;
}

export async function excluirTransportadoraCotacao(dados: {
  empresaId: number;
  cotacaoId: string | number;
  cotacaoTransportadoraId: string | number;
  usuarioId: number;
}) {
  await consultar(
    `ALTER TABLE cotacoes_frete_transportadoras
      ADD COLUMN IF NOT EXISTS escolhida_plataforma BOOLEAN NOT NULL DEFAULT FALSE`
  );

  const cotacao = await resolverCotacaoBase(dados.empresaId, dados.cotacaoId);
  if (!cotacao) {
    return null;
  }

  const identificador = decodeURIComponent(String(dados.cotacaoTransportadoraId ?? '')).trim();
  const partes = identificador.split('|');
  const transportadoraId = Number(partes.length >= 5 ? partes[4] : dados.cotacaoTransportadoraId);
  const origemCotacao = partes.length >= 6 ? partes.slice(5).join('|') : null;

  if (!Number.isFinite(transportadoraId) || transportadoraId <= 0) {
    return null;
  }

  const removida = await consultarUm<{
    registro_id: number;
    transportadora_id: number;
    origem_cotacao: string | null;
    valor_frete: string | null;
  }>(
    `DELETE FROM cotacoes_frete_transportadoras
    WHERE empresa_id = $1
      AND tipo_documento = $2
      AND numero_documento = $3
      AND codigo_chave = $4
      AND transportadora_id = $5
      AND ($6::VARCHAR IS NULL OR UPPER(COALESCE(origem_cotacao, '')) = $6)
      AND COALESCE(valor_frete, 0) = 0
      AND COALESCE(validada, FALSE) = FALSE
      AND COALESCE(selecionada, FALSE) = FALSE
      AND COALESCE(escolhida_plataforma, FALSE) = FALSE
      AND respondida_em IS NULL
      AND UPPER(COALESCE(status, '')) NOT IN ('RESPONDIDA', 'SELECIONADA', 'ALTERADA_MANUALMENTE', 'COTACAO_TRANSPORTADORA_RECEBIDA')
      AND (
        UPPER(COALESCE(origem_cotacao, '')) IN ('MANUAL', 'EXTERNA')
        OR UPPER(COALESCE(origem_detalhada, '')) = 'ADICIONADA_ANALISTA'
      )
    RETURNING 0 AS registro_id, transportadora_id, origem_cotacao, valor_frete`,
    [
      dados.empresaId,
      cotacao.tipo_documento,
      cotacao.numero_documento,
      cotacao.codigo_chave,
      transportadoraId,
      origemCotacao
    ]
  );

  if (removida) {
    await registrarTimelineCotacao({
      cotacaoId: cotacao.id,
      usuarioId: dados.usuarioId,
      transportadoraId,
      tipoEvento: 'TRANSPORTADORA_REMOVIDA',
      titulo: 'Transportadora removida',
      descricao: 'Transportadora adicionada sem valor foi removida da cotacao.',
      dadosEvento: removida
    });
  }

  return removida;
}

export async function atualizarFluxoCotacaoErp(dados: {
  empresaId: number;
  cotacaoId: number;
  usuarioId?: number | null;
  status: string;
  numeroNfe?: string | null;
  numeroCte?: string | null;
  transportadoraCodigo?: string | null;
  transportadoraNome?: string | null;
  valorFreteCte?: number | null;
  prazoCteDias?: number | null;
  payload?: unknown;
}) {
  const status = dados.status.toUpperCase();
  const codigoEtapa = status === 'INTEGRADO_ERP'
    ? 'INTEGRADO_ERP'
    : status === 'AGUARDANDO_FATURAMENTO'
      ? 'AGUARDANDO_FATURAMENTO'
      : status === 'FATURADO'
        ? 'FATURADO'
        : status === 'AGUARDANDO_CTE'
          ? 'AGUARDANDO_CTE'
          : status === 'CTE_RECEBIDO'
            ? 'CTE_RECEBIDO'
            : null;

  if (!codigoEtapa) {
    return null;
  }

  let transportadoraCteId: number | null = null;
  if (dados.transportadoraCodigo) {
    const transportadora = await consultarUm<{ id: number }>(
      `INSERT INTO transportadoras (
        codigo_interno,
        razao_social,
        nome_fantasia,
        ativa
      )
      VALUES ($1::VARCHAR, COALESCE($2::VARCHAR, $1::VARCHAR), COALESCE($2::VARCHAR, $1::VARCHAR), TRUE)
      ON CONFLICT (codigo_interno) DO UPDATE SET
        razao_social = COALESCE(EXCLUDED.razao_social, transportadoras.razao_social),
        nome_fantasia = COALESCE(EXCLUDED.nome_fantasia, transportadoras.nome_fantasia),
        ativa = TRUE
      RETURNING id`,
      [dados.transportadoraCodigo, dados.transportadoraNome ?? null]
    );
    transportadoraCteId = transportadora?.id ?? null;
  }

  const resultado = await consultarUm(
    `UPDATE cotacoes_frete c
    SET etapa_kanban_id = e.id,
      status = $3::VARCHAR,
      retorno_erp_status = CASE WHEN $3::VARCHAR = 'INTEGRADO_ERP' THEN 'CONCLUIDO' ELSE retorno_erp_status END,
      retorno_erp_em = CASE WHEN $3::VARCHAR = 'INTEGRADO_ERP' THEN NOW() ELSE retorno_erp_em END,
      numero_nfe_faturada = COALESCE($4, numero_nfe_faturada),
      faturado_em = CASE WHEN $3::VARCHAR IN ('FATURADO', 'AGUARDANDO_CTE', 'CTE_RECEBIDO') THEN COALESCE(faturado_em, NOW()) ELSE faturado_em END,
      numero_cte = COALESCE($5, numero_cte),
      cte_recebido_em = CASE WHEN $3::VARCHAR = 'CTE_RECEBIDO' THEN COALESCE(cte_recebido_em, NOW()) ELSE cte_recebido_em END,
      transportadora_cte_id = COALESCE($6, transportadora_cte_id),
      transportadora_cte_codigo = COALESCE($7, transportadora_cte_codigo),
      transportadora_cte_nome = COALESCE($8, transportadora_cte_nome),
      valor_frete_cte = COALESCE($9, valor_frete_cte),
      prazo_cte_dias = COALESCE($10, prazo_cte_dias),
      payload_cte = CASE WHEN $3::VARCHAR = 'CTE_RECEBIDO' THEN COALESCE($11::JSONB, payload_cte) ELSE payload_cte END,
      payload_faturamento = CASE WHEN $3::VARCHAR IN ('FATURADO', 'AGUARDANDO_CTE') THEN COALESCE($11::JSONB, payload_faturamento) ELSE payload_faturamento END,
      payload_retorno_erp = CASE WHEN $3::VARCHAR = 'INTEGRADO_ERP' THEN COALESCE($11::JSONB, payload_retorno_erp) ELSE payload_retorno_erp END,
      atualizado_no_erp = CASE WHEN $3::VARCHAR = 'INTEGRADO_ERP' THEN TRUE ELSE atualizado_no_erp END,
      alterado_em = NOW(),
      alterado_por_usuario_id = COALESCE($12, alterado_por_usuario_id)
    FROM etapas_kanban e
    WHERE c.id = $1
      AND c.empresa_id = $2
      AND COALESCE(c.excluido, FALSE) = FALSE
      AND e.empresa_id = c.empresa_id
      AND e.codigo = $13
      AND e.ativa = TRUE
    RETURNING c.*`,
    [
      dados.cotacaoId,
      dados.empresaId,
      status,
      dados.numeroNfe ?? null,
      dados.numeroCte ?? null,
      transportadoraCteId,
      dados.transportadoraCodigo ?? null,
      dados.transportadoraNome ?? null,
      dados.valorFreteCte ?? null,
      dados.prazoCteDias ?? null,
      dados.payload ? JSON.stringify(dados.payload) : null,
      dados.usuarioId ?? null,
      codigoEtapa
    ]
  );

  if (resultado) {
    await registrarTimelineCotacao({
      cotacaoId: dados.cotacaoId,
      usuarioId: dados.usuarioId ?? null,
      transportadoraId: transportadoraCteId,
      tipoEvento: `ATUALIZACAO_${status}`,
      titulo: `Atualizacao ${status}`,
      descricao: 'Fluxo operacional atualizado por integracao.',
      dadosEvento: dados.payload ?? {
        numero_nfe: dados.numeroNfe ?? null,
        numero_cte: dados.numeroCte ?? null,
        valor_frete_cte: dados.valorFreteCte ?? null,
        prazo_cte_dias: dados.prazoCteDias ?? null
      }
    });
  }

  return resultado;
}

export async function listarCotacoesPendentesErp(empresaId: number) {
  return consultar(
    `SELECT
      *
    FROM vw_cotacoes_frete_pendentes_erp
    WHERE codigo_empresa IN (
      SELECT codigo_empresa
      FROM empresas
      WHERE id = $1
    )
    ORDER BY escolhido_em ASC`,
    [empresaId]
  );
}



