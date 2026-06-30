import { consultar, consultarUm } from '../../banco/conexao.js';

export type TransportadoraCadastro = {
  codigo_interno: string;
  razao_social: string;
  nome_fantasia?: string | null;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  aceita_cotacao_externa?: boolean;
  apresenta_menor_cotacao?: boolean;
  apresenta_cubagem?: boolean;
  apresenta_peso?: boolean;
  apresenta_valor_tabela?: boolean;
  sla_resposta_horas?: number;
  recebe_prazo_solicitado?: boolean;
  exige_prazo_resposta?: boolean;
  prazo_resposta_obrigatorio?: boolean;
  solicita_numero_cotacao?: boolean;
  apresenta_lista_produtos?: boolean;
  observacoes?: string | null;
  ativa?: boolean;
  empresas_ids?: number[];
};

export type EtapaKanbanCadastro = {
  empresa_id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  cor?: string;
  ordem?: number;
  permite_arrastar?: boolean;
  etapa_final?: boolean;
  etapa_bloqueada?: boolean;
  obriga_feedback?: boolean;
  ativa?: boolean;
};

export async function listarTransportadoras() {
  return consultar(
    `SELECT
      t.id,
      t.codigo_interno,
      t.razao_social,
      t.nome_fantasia,
      t.documento,
      t.email,
      t.telefone,
      t.responsavel,
      t.aceita_cotacao_externa,
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
      t.ativa,
      COUNT(te.empresa_id) AS empresas_vinculadas
    FROM transportadoras t
    LEFT JOIN transportadoras_empresas te ON te.transportadora_id = t.id
      AND te.ativa = TRUE
    WHERE t.excluido = FALSE
    GROUP BY t.id
    ORDER BY t.nome_fantasia ASC, t.razao_social ASC`
  );
}

export async function salvarTransportadora(dados: TransportadoraCadastro, usuarioId: number) {
  const transportadora = await consultarUm<{ id: number }>(
    `INSERT INTO transportadoras (
      codigo_interno,
      razao_social,
      nome_fantasia,
      documento,
      email,
      telefone,
      responsavel,
      aceita_cotacao_externa,
      apresenta_menor_cotacao,
      apresenta_cubagem,
      apresenta_peso,
      apresenta_valor_tabela,
      sla_resposta_horas,
      recebe_prazo_solicitado,
      exige_prazo_resposta,
      prazo_resposta_obrigatorio,
      solicita_numero_cotacao,
      apresenta_lista_produtos,
      observacoes,
      ativa,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, TRUE), COALESCE($9, TRUE), COALESCE($10, TRUE), COALESCE($11, TRUE), COALESCE($12, TRUE), COALESCE($13, 24), COALESCE($14, TRUE), COALESCE($15, FALSE), COALESCE($16, FALSE), COALESCE($17, FALSE), COALESCE($18, TRUE), $19, COALESCE($20, TRUE), $21)
    ON CONFLICT (codigo_interno) DO UPDATE SET
      razao_social = EXCLUDED.razao_social,
      nome_fantasia = EXCLUDED.nome_fantasia,
      documento = EXCLUDED.documento,
      email = EXCLUDED.email,
      telefone = EXCLUDED.telefone,
      responsavel = EXCLUDED.responsavel,
      aceita_cotacao_externa = EXCLUDED.aceita_cotacao_externa,
      apresenta_menor_cotacao = EXCLUDED.apresenta_menor_cotacao,
      apresenta_cubagem = EXCLUDED.apresenta_cubagem,
      apresenta_peso = EXCLUDED.apresenta_peso,
      apresenta_valor_tabela = EXCLUDED.apresenta_valor_tabela,
      sla_resposta_horas = EXCLUDED.sla_resposta_horas,
      recebe_prazo_solicitado = EXCLUDED.recebe_prazo_solicitado,
      exige_prazo_resposta = EXCLUDED.exige_prazo_resposta,
      prazo_resposta_obrigatorio = EXCLUDED.prazo_resposta_obrigatorio,
      solicita_numero_cotacao = EXCLUDED.solicita_numero_cotacao,
      apresenta_lista_produtos = EXCLUDED.apresenta_lista_produtos,
      observacoes = EXCLUDED.observacoes,
      ativa = EXCLUDED.ativa,
      alterado_em = NOW(),
      alterado_por_usuario_id = $21
    RETURNING id`,
    [
      dados.codigo_interno,
      dados.razao_social,
      dados.nome_fantasia ?? dados.razao_social,
      dados.documento ?? null,
      dados.email ?? null,
      dados.telefone ?? null,
      dados.responsavel ?? null,
      dados.aceita_cotacao_externa ?? true,
      dados.apresenta_menor_cotacao ?? true,
      dados.apresenta_cubagem ?? true,
      dados.apresenta_peso ?? true,
      dados.apresenta_valor_tabela ?? true,
      dados.sla_resposta_horas ?? 24,
      dados.recebe_prazo_solicitado ?? true,
      dados.exige_prazo_resposta ?? false,
      dados.prazo_resposta_obrigatorio ?? false,
      dados.solicita_numero_cotacao ?? false,
      dados.apresenta_lista_produtos ?? true,
      dados.observacoes ?? null,
      dados.ativa ?? true,
      usuarioId
    ]
  );

  if (transportadora && dados.empresas_ids?.length) {
    await consultar(
      `DELETE FROM transportadoras_empresas
      WHERE transportadora_id = $1`,
      [transportadora.id]
    );

    for (const empresaId of dados.empresas_ids) {
      await consultar(
        `INSERT INTO transportadoras_empresas (transportadora_id, empresa_id, ativa)
        VALUES ($1, $2, TRUE)
        ON CONFLICT (transportadora_id, empresa_id) DO UPDATE SET
          ativa = TRUE`,
        [transportadora.id, empresaId]
      );
    }
  }

  return transportadora;
}

export async function excluirTransportadora(transportadoraId: number, usuarioId: number) {
  return consultarUm(
    `UPDATE transportadoras
    SET excluido = TRUE,
      ativa = FALSE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $2
    WHERE id = $1
    RETURNING id`,
    [transportadoraId, usuarioId]
  );
}

export async function listarEtapasKanban(empresaId: number) {
  return consultar(
    `SELECT
      id,
      codigo,
      nome,
      descricao,
      cor,
      ordem,
      permite_arrastar,
      etapa_final,
      etapa_bloqueada,
      obriga_feedback,
      ativa
    FROM etapas_kanban
    WHERE empresa_id = $1
      AND ativa = TRUE
    ORDER BY ordem ASC, nome ASC`,
    [empresaId]
  );
}

export async function salvarEtapaKanban(dados: EtapaKanbanCadastro, moduloId: number) {
  return consultarUm(
    `INSERT INTO etapas_kanban (
      empresa_id,
      modulo_id,
      codigo,
      nome,
      descricao,
      cor,
      ordem,
      permite_arrastar,
      etapa_final,
      etapa_bloqueada,
      obriga_feedback,
      ativa
    )
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, '#2EE66F'), COALESCE($7, 0), COALESCE($8, TRUE), COALESCE($9, FALSE), COALESCE($10, FALSE), COALESCE($11, FALSE), COALESCE($12, TRUE))
    ON CONFLICT (empresa_id, modulo_id, codigo) DO UPDATE SET
      nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      cor = EXCLUDED.cor,
      ordem = EXCLUDED.ordem,
      permite_arrastar = EXCLUDED.permite_arrastar,
      etapa_final = EXCLUDED.etapa_final,
      etapa_bloqueada = EXCLUDED.etapa_bloqueada,
      obriga_feedback = EXCLUDED.obriga_feedback,
      ativa = EXCLUDED.ativa
    RETURNING *`,
    [
      dados.empresa_id,
      moduloId,
      dados.codigo,
      dados.nome,
      dados.descricao ?? null,
      dados.cor ?? '#2EE66F',
      dados.ordem ?? 0,
      dados.permite_arrastar ?? true,
      dados.etapa_final ?? false,
      dados.etapa_bloqueada ?? false,
      dados.obriga_feedback ?? false,
      dados.ativa ?? true
    ]
  );
}

export async function excluirEtapaKanban(etapaId: number) {
  return consultarUm(
    `UPDATE etapas_kanban
    SET ativa = FALSE
    WHERE id = $1
    RETURNING id`,
    [etapaId]
  );
}

export async function buscarModuloCotacaoFrete() {
  return consultarUm<{ id: number }>(
    `SELECT id
    FROM modulos
    WHERE codigo = 'COTACAO_FRETE'`
  );
}
