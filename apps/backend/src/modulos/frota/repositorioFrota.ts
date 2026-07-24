import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { banco, consultar, consultarUm } from '../../banco/conexao.js';

export type FiltrosDespesasFrota = {
  empresaId: number;
  departamentosIds?: number[];
  fornecedorId?: number | null;
  placa?: string | null;
  motoristaId?: number | null;
  dataInicial?: string | null;
  dataFinal?: string | null;
  validado?: string | null;
  integrado?: string | null;
  tipoDespesaId?: number | null;
  numeroDocumento?: string | null;
  fatura?: string | null;
  ativo?: string | null;
};

let promessaEstruturaFrota: Promise<void> | null = null;

async function lerMigrationFrota() {
  const candidatos = [
    path.resolve(process.cwd(), 'database', 'migrations', '033_modulo_frota.sql'),
    path.resolve(process.cwd(), '..', '..', 'database', 'migrations', '033_modulo_frota.sql')
  ];

  for (const arquivo of candidatos) {
    try {
      return await readFile(arquivo, 'utf8');
    } catch {
      // Continua procurando em outros caminhos de execucao do servico.
    }
  }

  throw new Error('Migration do Modulo Frota nao encontrada em database/migrations/033_modulo_frota.sql.');
}

export async function garantirEstruturaFrota() {
  if (!promessaEstruturaFrota) {
    promessaEstruturaFrota = (async () => {
      const existe = await consultarUm<{ existe: string | null }>(
        `SELECT TO_REGCLASS('public.frota_fornecedores') AS existe`
      );
      const sql = await lerMigrationFrota();
      if (!existe?.existe) {
        await banco.query(sql);
        return;
      }

      // Reexecuta a migration idempotente para garantir colunas novas em bases ja atualizadas.
      await banco.query(sql);
    })().catch((erro) => {
      promessaEstruturaFrota = null;
      throw erro;
    });
  }

  await promessaEstruturaFrota;
}

function placaNormalizada(valor: unknown) {
  return String(valor ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function texto(valor: unknown) {
  return String(valor ?? '').trim();
}

function numero(valor: unknown, padrao = 0) {
  const convertido = Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(convertido) ? convertido : padrao;
}

function numeroValido(valor: unknown) {
  const convertido = Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(convertido);
}

function temValor(valor: unknown) {
  return texto(valor) !== '';
}

function dataValida(valor: unknown) {
  return converterData(valor) !== null;
}

function calcularValoresDespesa(dados: Record<string, unknown>) {
  const quantidade = numero(dados.quantidade);
  const desconto = numero(dados.desconto);
  const totalInformado = numero(dados.total);
  const valorBruto = temValor(dados.valor_bruto)
    ? numero(dados.valor_bruto)
    : totalInformado + desconto;
  const total = temValor(dados.total) ? totalInformado : valorBruto - desconto;
  const valorUnitario = quantidade > 0 && valorBruto > 0
    ? valorBruto / quantidade
    : numero(dados.valor_unitario);
  const valorUnitarioLiquido = temValor(dados.valor_unitario_liquido)
    ? numero(dados.valor_unitario_liquido)
    : quantidade > 0
      ? total / quantidade
      : numero(dados.valor_unitario_liquido);

  return {
    quantidade,
    valorUnitario,
    valorUnitarioLiquido,
    valorBruto,
    desconto,
    total
  };
}

function converterData(dataReferencia: unknown) {
  const textoData = texto(dataReferencia);
  const dataBr = textoData.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (dataBr) {
    const [, dia, mes, ano, hora = '00', minuto = '00', segundo = '00'] = dataBr;
    const data = new Date(`${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(textoData);
  return Number.isNaN(data.getTime()) ? null : data;
}

function normalizarDataHoraBanco(dataReferencia: unknown) {
  return converterData(dataReferencia)?.toISOString() ?? texto(dataReferencia);
}

function calcularDataVencimento(dataReferencia: unknown, diaVencimento: unknown) {
  const dia = Number(diaVencimento);
  const data = converterData(dataReferencia);
  if (!Number.isFinite(dia) || dia < 1 || dia > 31 || !data) {
    return null;
  }

  const ano = data.getUTCFullYear();
  const mesPosterior = data.getUTCMonth() + 1;
  const ultimoDiaMesPosterior = new Date(Date.UTC(ano, mesPosterior + 1, 0)).getUTCDate();
  const diaCalculado = Math.min(dia, ultimoDiaMesPosterior);
  const vencimento = new Date(Date.UTC(ano, mesPosterior, diaCalculado));
  return vencimento.toISOString().slice(0, 10);
}

function calcularDataDespesa(dataReferencia: unknown) {
  const data = converterData(dataReferencia);
  if (!data) {
    return null;
  }
  return data.toISOString().slice(0, 10);
}

async function registrarHistoricoFrota(dados: {
  empresaId?: number | null;
  usuarioId?: number | null;
  operacao: string;
  tabelaAfetada: string;
  registroId?: number | null;
  valorAnterior?: unknown;
  valorPosterior?: unknown;
  origemOperacao?: string | null;
}) {
  await consultar(
    `INSERT INTO frota_historicos (
      empresa_id,
      usuario_id,
      operacao,
      tabela_afetada,
      registro_id,
      valor_anterior,
      valor_posterior,
      origem_operacao
    )
    VALUES ($1, $2, $3, $4, $5, $6::JSONB, $7::JSONB, $8)`,
    [
      dados.empresaId ?? null,
      dados.usuarioId ?? null,
      dados.operacao,
      dados.tabelaAfetada,
      dados.registroId ?? null,
      dados.valorAnterior ? JSON.stringify(dados.valorAnterior) : null,
      dados.valorPosterior ? JSON.stringify(dados.valorPosterior) : null,
      dados.origemOperacao ?? 'CONTROL_S_HUB'
    ]
  );
}

export async function obterIndicadoresFrota(empresaId: number) {
  const resumo = await consultarUm(
    `SELECT
      COUNT(*)::INTEGER AS despesas_periodo,
      COALESCE(SUM(total), 0) AS valor_total,
      COUNT(*) FILTER (WHERE validado = FALSE)::INTEGER AS despesas_pendentes_validacao,
      COUNT(*) FILTER (WHERE validado = TRUE)::INTEGER AS despesas_validadas,
      COUNT(*) FILTER (WHERE integrado = TRUE)::INTEGER AS despesas_integradas,
      COUNT(*) FILTER (WHERE integrado = FALSE)::INTEGER AS despesas_nao_integradas
    FROM frota_despesas
    WHERE empresa_id = $1
      AND excluido = FALSE
      AND data_hora::DATE >= DATE_TRUNC('MONTH', CURRENT_DATE)::DATE`,
    [empresaId]
  );

  const veiculosMaiorDespesa = await consultar(
    `SELECT placa, COALESCE(SUM(total), 0) AS valor_total
    FROM frota_despesas
    WHERE empresa_id = $1
      AND excluido = FALSE
    GROUP BY placa
    ORDER BY valor_total DESC
    LIMIT 5`,
    [empresaId]
  );

  const despesasPorTipo = await consultar(
    `SELECT COALESCE(td.descricao, 'Sem tipo') AS descricao, COALESCE(SUM(d.total), 0) AS valor_total
    FROM frota_despesas d
    LEFT JOIN frota_tipos_despesas td ON td.id = d.tipo_despesa_id
    WHERE d.empresa_id = $1
      AND d.excluido = FALSE
    GROUP BY COALESCE(td.descricao, 'Sem tipo')
    ORDER BY valor_total DESC
    LIMIT 8`,
    [empresaId]
  );

  const despesasPorDepartamento = await consultar(
    `SELECT COALESCE(dep.descricao, 'Sem departamento') AS descricao, COALESCE(SUM(d.total), 0) AS valor_total
    FROM frota_despesas d
    LEFT JOIN frota_departamentos dep ON dep.id = d.departamento_id
    WHERE d.empresa_id = $1
      AND d.excluido = FALSE
    GROUP BY COALESCE(dep.descricao, 'Sem departamento')
    ORDER BY valor_total DESC
    LIMIT 8`,
    [empresaId]
  );

  const evolucaoMensal = await consultar(
    `SELECT TO_CHAR(DATE_TRUNC('MONTH', data_hora), 'YYYY-MM') AS mes,
      COALESCE(SUM(total), 0) AS valor_total
    FROM frota_despesas
    WHERE empresa_id = $1
      AND excluido = FALSE
      AND data_hora >= (CURRENT_DATE - INTERVAL '12 MONTHS')
    GROUP BY DATE_TRUNC('MONTH', data_hora)
    ORDER BY mes ASC`,
    [empresaId]
  );

  return {
    ...(resumo ?? {}),
    veiculos_maior_despesa: veiculosMaiorDespesa,
    despesas_por_tipo: despesasPorTipo,
    despesas_por_departamento: despesasPorDepartamento,
    evolucao_mensal: evolucaoMensal
  };
}

export async function listarDepartamentosFrota(empresaId: number) {
  return consultar(
    `SELECT d.*, e.codigo_empresa
    FROM frota_departamentos d
    INNER JOIN empresas e ON e.id = d.empresa_id
    WHERE d.empresa_id = $1
      AND d.excluido = FALSE
    ORDER BY d.descricao ASC`,
    [empresaId]
  );
}

export async function salvarDepartamentoFrota(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_departamentos (empresa_id, codigo_decis, descricao, filial_decis, ativo, criado_por_usuario_id)
    VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6)
    ON CONFLICT (empresa_id, codigo_decis) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      filial_decis = EXCLUDED.filial_decis,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $6
    RETURNING *`,
    [
      empresaId,
      dados.codigo_decis,
      dados.descricao,
      dados.filial_decis ?? null,
      dados.ativo ?? true,
      usuarioId
    ]
  );
  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'SALVAR_DEPARTAMENTO', tabelaAfetada: 'frota_departamentos', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarMotoristasFrota() {
  return consultar(
    `SELECT id, codigo_decis, nome, ativo
    FROM frota_motoristas
    WHERE excluido = FALSE
    ORDER BY nome ASC`
  );
}

export async function salvarMotoristaFrota(dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_motoristas (codigo_decis, nome, ativo, criado_por_usuario_id)
    VALUES ($1, $2, COALESCE($3, TRUE), $4)
    ON CONFLICT (codigo_decis) DO UPDATE SET
      nome = EXCLUDED.nome,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $4
    RETURNING *`,
    [dados.codigo_decis, dados.nome, dados.ativo ?? true, usuarioId]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_MOTORISTA', tabelaAfetada: 'frota_motoristas', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarTiposDespesasFrota() {
  return consultar(
    `SELECT id, codigo_decis, descricao, natureza_credito_decis, ativo
    FROM frota_tipos_despesas
    WHERE excluido = FALSE
    ORDER BY descricao ASC`
  );
}

export async function salvarTipoDespesaFrota(dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_tipos_despesas (codigo_decis, descricao, natureza_credito_decis, ativo, criado_por_usuario_id)
    VALUES ($1, $2, COALESCE(NULLIF($3, ''), '2'), COALESCE($4, TRUE), $5)
    ON CONFLICT (codigo_decis) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      natureza_credito_decis = EXCLUDED.natureza_credito_decis,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $5
    RETURNING *`,
    [dados.codigo_decis, dados.descricao, dados.natureza_credito_decis ?? '2', dados.ativo ?? true, usuarioId]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_TIPO_DESPESA', tabelaAfetada: 'frota_tipos_despesas', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarFornecedoresFrota() {
  return consultar(
    `SELECT
      id,
      codigo_decis,
      nome,
      nome_fantasia,
      codigo_forma_pagamento_decis,
      descricao_forma_pagamento,
      dia_vencimento,
      natureza_credito_decis,
      grupo_custo_decis,
      conf_custo_decis,
      ativo
    FROM frota_fornecedores
    WHERE excluido = FALSE
    ORDER BY COALESCE(nome_fantasia, nome) ASC`
  );
}

export async function salvarFornecedorFrota(dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_fornecedores (
      codigo_decis,
      nome,
      nome_fantasia,
      codigo_forma_pagamento_decis,
      descricao_forma_pagamento,
      dia_vencimento,
      natureza_credito_decis,
      grupo_custo_decis,
      conf_custo_decis,
      ativo,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, TRUE), $11)
    ON CONFLICT (codigo_decis) DO UPDATE SET
      nome = EXCLUDED.nome,
      nome_fantasia = EXCLUDED.nome_fantasia,
      codigo_forma_pagamento_decis = EXCLUDED.codigo_forma_pagamento_decis,
      descricao_forma_pagamento = EXCLUDED.descricao_forma_pagamento,
      dia_vencimento = EXCLUDED.dia_vencimento,
      natureza_credito_decis = EXCLUDED.natureza_credito_decis,
      grupo_custo_decis = EXCLUDED.grupo_custo_decis,
      conf_custo_decis = EXCLUDED.conf_custo_decis,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $11
    RETURNING *`,
    [
      dados.codigo_decis,
      dados.nome,
      dados.nome_fantasia ?? null,
      dados.codigo_forma_pagamento_decis ?? null,
      dados.descricao_forma_pagamento ?? null,
      dados.dia_vencimento ? Number(dados.dia_vencimento) : null,
      dados.natureza_credito_decis ?? null,
      dados.grupo_custo_decis ?? null,
      dados.conf_custo_decis ?? null,
      dados.ativo ?? true,
      usuarioId
    ]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_FORNECEDOR', tabelaAfetada: 'frota_fornecedores', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarVeiculosFrota(empresaId: number) {
  return consultar(
    `SELECT
      v.id,
      v.codigo_decis,
      v.placa,
      v.modelo,
      v.departamento_id,
      d.descricao AS departamento_descricao,
      v.motorista_id,
      m.nome AS motorista_nome,
      v.odometro_atual,
      v.ativo
    FROM frota_veiculos v
    LEFT JOIN frota_departamentos d ON d.id = v.departamento_id
    LEFT JOIN frota_motoristas m ON m.id = v.motorista_id
    WHERE v.excluido = FALSE
      AND (d.empresa_id = $1 OR d.empresa_id IS NULL)
    ORDER BY v.placa ASC`,
    [empresaId]
  );
}

export async function salvarVeiculoFrota(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_veiculos (codigo_decis, placa, modelo, departamento_id, motorista_id, odometro_atual, ativo, criado_por_usuario_id)
    VALUES ($1, $2, $3, $4, $5, COALESCE($6::NUMERIC, 0), COALESCE($7, TRUE), $8)
    ON CONFLICT (placa) DO UPDATE SET
      codigo_decis = EXCLUDED.codigo_decis,
      modelo = EXCLUDED.modelo,
      departamento_id = EXCLUDED.departamento_id,
      motorista_id = EXCLUDED.motorista_id,
      odometro_atual = EXCLUDED.odometro_atual,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $8
    RETURNING *`,
    [
      dados.codigo_decis ?? null,
      placaNormalizada(dados.placa),
      dados.modelo,
      dados.departamento_id ? Number(dados.departamento_id) : null,
      dados.motorista_id ? Number(dados.motorista_id) : null,
      dados.odometro_atual ?? 0,
      dados.ativo ?? true,
      usuarioId
    ]
  );
  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'SALVAR_VEICULO', tabelaAfetada: 'frota_veiculos', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarDespesasTiposFrota() {
  return consultar(
    `SELECT
      dt.id,
      dt.descricao_despesa,
      dt.tipo_despesa_id,
      td.descricao AS tipo_despesa_descricao,
      dt.fornecedor_id,
      COALESCE(f.nome_fantasia, f.nome) AS fornecedor_nome,
      dt.ativo
    FROM frota_despesas_tipos dt
    INNER JOIN frota_tipos_despesas td ON td.id = dt.tipo_despesa_id
    LEFT JOIN frota_fornecedores f ON f.id = dt.fornecedor_id
    WHERE dt.excluido = FALSE
    ORDER BY dt.descricao_despesa ASC`
  );
}

export async function salvarDespesaTipoFrota(dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_despesas_tipos (fornecedor_id, descricao_despesa, tipo_despesa_id, ativo, criado_por_usuario_id)
    VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
    ON CONFLICT (descricao_despesa, fornecedor_id) DO UPDATE SET
      tipo_despesa_id = EXCLUDED.tipo_despesa_id,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $5
    RETURNING *`,
    [dados.fornecedor_id ? Number(dados.fornecedor_id) : null, texto(dados.descricao_despesa).toUpperCase(), Number(dados.tipo_despesa_id), dados.ativo ?? true, usuarioId]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_DESPESA_TIPO', tabelaAfetada: 'frota_despesas_tipos', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarMotivosCancelamentoFrota() {
  return consultar(
    `SELECT id, codigo_decis, descricao, ativo
    FROM frota_motivos_cancelamento
    WHERE excluido = FALSE
    ORDER BY descricao ASC`
  );
}

export async function salvarMotivoCancelamentoFrota(dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_motivos_cancelamento (id, codigo_decis, descricao, ativo, criado_por_usuario_id)
    VALUES (COALESCE($1::BIGINT, NEXTVAL('frota_motivos_cancelamento_id_seq')), $2, $3, COALESCE($4, TRUE), $5)
    ON CONFLICT (id) DO UPDATE SET
      codigo_decis = EXCLUDED.codigo_decis,
      descricao = EXCLUDED.descricao,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $5
    RETURNING *`,
    [
      dados.id ? Number(dados.id) : null,
      dados.codigo_decis ?? null,
      texto(dados.descricao),
      dados.ativo ?? true,
      usuarioId
    ]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_MOTIVO_CANCELAMENTO', tabelaAfetada: 'frota_motivos_cancelamento', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

async function resolverOrganizacaoDespesa(empresaId: number, fornecedorId: number, linha: Record<string, unknown>) {
  const placa = placaNormalizada(linha.placa);
  const veiculo = placa
    ? await consultarUm<Record<string, unknown>>(
      `SELECT
        v.id AS veiculo_id,
        v.departamento_id,
        v.motorista_id,
        d.empresa_id
      FROM frota_veiculos v
      LEFT JOIN frota_departamentos d ON d.id = v.departamento_id
      WHERE v.placa = $1
        AND v.excluido = FALSE`,
      [placa]
    )
    : null;

  const descricaoDespesa = texto(linha.descricao_despesa).toUpperCase();
  const tipo = await consultarUm<{ tipo_despesa_id: number }>(
    `SELECT tipo_despesa_id
    FROM frota_despesas_tipos
    WHERE UPPER(descricao_despesa) = $1
      AND ativo = TRUE
      AND excluido = FALSE
      AND (fornecedor_id = $2 OR fornecedor_id IS NULL)
    ORDER BY fornecedor_id NULLS LAST
    LIMIT 1`,
    [descricaoDespesa, fornecedorId]
  );
  const fornecedor = await consultarUm<Record<string, unknown>>(
    `SELECT codigo_forma_pagamento_decis, descricao_forma_pagamento, dia_vencimento
    FROM frota_fornecedores
    WHERE id = $1
      AND excluido = FALSE`,
    [fornecedorId]
  );

  return {
    placa,
    veiculo_encontrado: !placa || Boolean(veiculo?.veiculo_id),
    veiculo_com_vinculos: !placa || Boolean(veiculo?.departamento_id && veiculo?.motorista_id),
    veiculo_id: veiculo?.veiculo_id ? Number(veiculo.veiculo_id) : null,
    departamento_id: veiculo?.departamento_id ? Number(veiculo.departamento_id) : null,
    motorista_id: veiculo?.motorista_id ? Number(veiculo.motorista_id) : null,
    empresa_id: veiculo?.empresa_id ? Number(veiculo.empresa_id) : empresaId,
    tipo_despesa_id: tipo?.tipo_despesa_id ?? null,
    descricao_despesa: descricaoDespesa,
    codigo_forma_pagamento_decis: fornecedor?.codigo_forma_pagamento_decis ?? null,
    descricao_forma_pagamento: fornecedor?.descricao_forma_pagamento ?? null,
    dia_vencimento: fornecedor?.dia_vencimento ? Number(fornecedor.dia_vencimento) : null,
    data_vencimento: calcularDataVencimento(linha.data_hora, fornecedor?.dia_vencimento)
  };
}

export async function salvarDespesaFrota(empresaId: number, dados: Record<string, unknown>, usuarioId: number, origem = 'MANUAL', loteId?: number | null) {
  const fornecedorId = Number(dados.fornecedor_id);
  const organizacao = await resolverOrganizacaoDespesa(empresaId, fornecedorId, dados);
  const valoresDespesa = calcularValoresDespesa(dados);

  if (organizacao.placa && !organizacao.veiculo_encontrado) {
    throw new Error(`Placa ${organizacao.placa} nao cadastrada. Cadastre o veiculo no Decis antes de lancar a despesa.`);
  }

  if (organizacao.placa && !organizacao.veiculo_com_vinculos) {
    throw new Error(`Placa ${organizacao.placa} sem departamento ou motorista vinculado. Atualize o cadastro do veiculo antes de lancar a despesa.`);
  }

  if (!dataValida(dados.data_hora) || !texto(dados.numero_documento) || !organizacao.descricao_despesa || !temValor(dados.quantidade) || !numeroValido(dados.quantidade) || !temValor(dados.total) || !numeroValido(dados.total)) {
    throw new Error('Documento, data/hora, descricao da despesa, quantidade e total sao obrigatorios.');
  }

  if (!organizacao.tipo_despesa_id) {
    throw new Error(`Despesa sem De/Para: ${organizacao.descricao_despesa}.`);
  }

  const registro = await consultarUm(
    `INSERT INTO frota_despesas (
      empresa_id,
      departamento_id,
      motorista_id,
      tipo_despesa_id,
      fornecedor_id,
      veiculo_id,
      placa,
      data_hora,
      data_despesa,
      hodometro,
      numero_documento,
      fatura,
      descricao_despesa,
      quantidade,
      unidade_despesa,
      valor_unitario,
      valor_unitario_liquido,
      valor_bruto,
      desconto,
      total,
      codigo_forma_pagamento_decis,
      descricao_forma_pagamento,
      dia_vencimento,
      data_vencimento,
      usuario_inclusao_id,
      usuario_ultima_alteracao_id,
      data_hora_ultima_alteracao,
      origem_lancamento,
      lote_importacao_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::TIMESTAMPTZ, $9::DATE, $10::NUMERIC, $11, $12, $13, $14::NUMERIC, $15, $16::NUMERIC, $17::NUMERIC, $18::NUMERIC, $19::NUMERIC, $20::NUMERIC, $21, $22, $23, $24::DATE, $25, $25, NOW(), $26, $27)
    RETURNING *`,
    [
      organizacao.empresa_id,
      organizacao.departamento_id,
      organizacao.motorista_id,
      organizacao.tipo_despesa_id,
      fornecedorId,
      organizacao.veiculo_id,
      organizacao.placa,
      normalizarDataHoraBanco(dados.data_hora),
      calcularDataDespesa(dados.data_hora),
      numero(dados.hodometro),
      texto(dados.numero_documento),
      texto(dados.fatura) || null,
      organizacao.descricao_despesa,
      valoresDespesa.quantidade,
      texto(dados.unidade_despesa) || null,
      valoresDespesa.valorUnitario,
      valoresDespesa.valorUnitarioLiquido,
      valoresDespesa.valorBruto,
      valoresDespesa.desconto,
      valoresDespesa.total,
      organizacao.codigo_forma_pagamento_decis,
      organizacao.descricao_forma_pagamento,
      organizacao.dia_vencimento,
      organizacao.data_vencimento,
      usuarioId,
      origem,
      loteId ?? null
    ]
  );

  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'INCLUSAO_DESPESA', tabelaAfetada: 'frota_despesas', registroId: registro?.id, valorPosterior: registro, origemOperacao: origem });
  return registro;
}

function montarParametrosDespesas(filtros: FiltrosDespesasFrota) {
  return [
    filtros.empresaId,
    filtros.departamentosIds?.length ? filtros.departamentosIds : null,
    filtros.fornecedorId ?? null,
    filtros.placa ? placaNormalizada(filtros.placa) : null,
    filtros.motoristaId ?? null,
    filtros.dataInicial ?? null,
    filtros.dataFinal ?? null,
    filtros.validado ?? null,
    filtros.integrado ?? null,
    filtros.tipoDespesaId ?? null,
    filtros.numeroDocumento ?? null,
    filtros.fatura ?? null,
    filtros.ativo ?? null
  ];
}

const whereDespesas = `WHERE d.empresa_id = $1
  AND d.excluido = FALSE
  AND ($2::BIGINT[] IS NULL OR d.departamento_id = ANY($2::BIGINT[]))
  AND ($3::BIGINT IS NULL OR d.fornecedor_id = $3)
  AND ($4::VARCHAR IS NULL OR d.placa = $4)
  AND ($5::BIGINT IS NULL OR d.motorista_id = $5)
  AND ($6::DATE IS NULL OR d.data_hora::DATE >= $6::DATE)
  AND ($7::DATE IS NULL OR d.data_hora::DATE <= $7::DATE)
  AND ($8::VARCHAR IS NULL OR $8 = 'TODOS' OR d.validado = ($8 = 'SIM'))
  AND ($9::VARCHAR IS NULL OR $9 = 'TODOS' OR d.integrado = ($9 = 'SIM'))
  AND ($10::BIGINT IS NULL OR d.tipo_despesa_id = $10)
  AND ($11::VARCHAR IS NULL OR d.numero_documento ILIKE '%' || $11 || '%')
  AND ($12::VARCHAR IS NULL OR d.fatura ILIKE '%' || $12 || '%')
  AND ($13::VARCHAR IS NULL OR $13 = 'TODOS' OR d.cancelado = ($13 = 'NAO'))`;

export async function listarDespesasFrota(filtros: FiltrosDespesasFrota) {
  const parametros = montarParametrosDespesas(filtros);
  const linhas = await consultar(
    `SELECT
      d.*,
      e.codigo_empresa,
      dep.descricao AS departamento_descricao,
      mot.nome AS motorista_nome,
      td.descricao AS tipo_despesa_descricao,
      COALESCE(f.nome_fantasia, f.nome) AS fornecedor_nome,
      uval.nome AS usuario_validacao_nome,
      mc.descricao AS motivo_cancelamento_descricao,
      ucan.nome AS usuario_cancelamento_nome
    FROM frota_despesas d
    INNER JOIN empresas e ON e.id = d.empresa_id
    LEFT JOIN frota_departamentos dep ON dep.id = d.departamento_id
    LEFT JOIN frota_motoristas mot ON mot.id = d.motorista_id
    LEFT JOIN frota_tipos_despesas td ON td.id = d.tipo_despesa_id
    LEFT JOIN frota_fornecedores f ON f.id = d.fornecedor_id
    LEFT JOIN usuarios uval ON uval.id = d.usuario_validacao_id
    LEFT JOIN frota_motivos_cancelamento mc ON mc.id = d.motivo_cancelamento_id
    LEFT JOIN usuarios ucan ON ucan.id = d.usuario_cancelamento_id
    ${whereDespesas}
    ORDER BY d.data_hora DESC, d.id DESC
    LIMIT 1000`,
    parametros
  );

  const totalizadores = await consultarUm(
    `SELECT
      COUNT(*)::INTEGER AS quantidade_registros,
      COUNT(*) FILTER (WHERE validado = TRUE)::INTEGER AS quantidade_validada,
      COUNT(*) FILTER (WHERE validado = FALSE)::INTEGER AS quantidade_nao_validada,
      COUNT(*) FILTER (WHERE integrado = TRUE)::INTEGER AS quantidade_integrada,
      COUNT(*) FILTER (WHERE integrado = FALSE)::INTEGER AS quantidade_nao_integrada,
      COALESCE(SUM(total), 0) AS valor_total_filtrado,
      COALESCE(SUM(total) FILTER (WHERE validado = TRUE), 0) AS valor_total_validado,
      COALESCE(SUM(total) FILTER (WHERE validado = FALSE), 0) AS valor_total_nao_validado
    FROM frota_despesas d
    ${whereDespesas}`,
    parametros
  );

  return { linhas, totalizadores };
}

export async function validarDespesasFrota(empresaId: number, ids: number[], validado: boolean, usuarioId: number) {
  const cliente = await banco.connect();
  try {
    await cliente.query('BEGIN');
    const anteriores = await cliente.query(
      `SELECT
        d.id,
        d.placa,
        d.validado,
        d.integrado,
        d.cancelado,
        v.id AS veiculo_id_encontrado,
        v.departamento_id AS departamento_id_encontrado,
        v.motorista_id AS motorista_id_encontrado
      FROM frota_despesas d
      LEFT JOIN frota_veiculos v ON v.placa = d.placa
        AND v.excluido = FALSE
      WHERE d.empresa_id = $1
        AND d.id = ANY($2::BIGINT[])
        AND d.excluido = FALSE
      FOR UPDATE`,
      [empresaId, ids]
    );

    if (anteriores.rows.some((linha) => linha.integrado)) {
      throw new Error('Nao e permitido alterar validacao de registros integrados.');
    }

    if (validado) {
      const cancelados = anteriores.rows.filter((linha) => linha.cancelado);
      if (cancelados.length) {
        throw new Error(`Nao e permitido validar documentos cancelados: ${cancelados.map((linha) => linha.id).join(', ')}.`);
      }

      const semPlaca = anteriores.rows.filter((linha) => !texto(linha.placa));
      if (semPlaca.length) {
        throw new Error(`Nao e permitido validar despesas sem placa: ${semPlaca.map((linha) => linha.id).join(', ')}.`);
      }

      const semVeiculo = anteriores.rows.filter((linha) => texto(linha.placa) && !linha.veiculo_id_encontrado);
      if (semVeiculo.length) {
        throw new Error(`Cadastre no Decis os veiculos antes de validar: ${[...new Set(semVeiculo.map((linha) => linha.placa))].join(', ')}.`);
      }

      const semVinculos = anteriores.rows.filter((linha) => linha.veiculo_id_encontrado && (!linha.departamento_id_encontrado || !linha.motorista_id_encontrado));
      if (semVinculos.length) {
        throw new Error(`Complete motorista e departamento no cadastro dos veiculos antes de validar: ${[...new Set(semVinculos.map((linha) => linha.placa))].join(', ')}.`);
      }

      await cliente.query(
        `UPDATE frota_despesas d
        SET veiculo_id = v.id,
          departamento_id = v.departamento_id,
          motorista_id = v.motorista_id,
          usuario_ultima_alteracao_id = $2,
          data_hora_ultima_alteracao = NOW()
        FROM frota_veiculos v
        WHERE d.empresa_id = $1
          AND d.id = ANY($3::BIGINT[])
          AND v.placa = d.placa
          AND v.excluido = FALSE
          AND v.departamento_id IS NOT NULL
          AND v.motorista_id IS NOT NULL
          AND (d.veiculo_id IS DISTINCT FROM v.id OR d.departamento_id IS DISTINCT FROM v.departamento_id OR d.motorista_id IS DISTINCT FROM v.motorista_id)`,
        [empresaId, usuarioId, ids]
      );
    }

    const resultado = await cliente.query(
      `UPDATE frota_despesas
      SET validado = $3,
        usuario_validacao_id = CASE WHEN $3 THEN $2 ELSE NULL END,
        data_hora_validacao = CASE WHEN $3 THEN NOW() ELSE NULL END,
        usuario_ultima_alteracao_id = $2,
        data_hora_ultima_alteracao = NOW()
      WHERE empresa_id = $1
        AND id = ANY($4::BIGINT[])
        AND integrado = FALSE
        AND cancelado = FALSE
        AND excluido = FALSE
      RETURNING *`,
      [empresaId, usuarioId, validado, ids]
    );

    for (const linha of resultado.rows) {
      await cliente.query(
        `INSERT INTO frota_historicos (empresa_id, usuario_id, operacao, tabela_afetada, registro_id, valor_anterior, valor_posterior, origem_operacao)
        VALUES ($1, $2, $3, 'frota_despesas', $4, $5::JSONB, $6::JSONB, 'VALIDACAO_DESPESAS')`,
        [
          empresaId,
          usuarioId,
          validado ? 'VALIDACAO' : 'REMOCAO_VALIDACAO',
          linha.id,
          JSON.stringify(anteriores.rows.find((item) => Number(item.id) === Number(linha.id)) ?? {}),
          JSON.stringify(linha)
        ]
      );
    }

    await cliente.query('COMMIT');
    return { alterados: resultado.rowCount };
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function cancelarDespesasFrota(empresaId: number, ids: number[], motivoId: number, observacao: string | null, usuarioId: number) {
  const cliente = await banco.connect();
  try {
    await cliente.query('BEGIN');
    const motivo = await cliente.query(
      `SELECT id, descricao
      FROM frota_motivos_cancelamento
      WHERE id = $1
        AND ativo = TRUE
        AND excluido = FALSE`,
      [motivoId]
    );
    if (!motivo.rowCount) {
      throw new Error('Informe um motivo de cancelamento ativo.');
    }

    const anteriores = await cliente.query(
      `SELECT *
      FROM frota_despesas
      WHERE empresa_id = $1
        AND id = ANY($2::BIGINT[])
        AND excluido = FALSE
      FOR UPDATE`,
      [empresaId, ids]
    );

    if (anteriores.rows.some((linha) => linha.integrado)) {
      throw new Error('Nao e permitido cancelar registros integrados.');
    }

    const resultado = await cliente.query(
      `UPDATE frota_despesas
      SET cancelado = TRUE,
        motivo_cancelamento_id = $3,
        motivo_cancelamento_texto = NULLIF($4, ''),
        usuario_cancelamento_id = $2,
        data_hora_cancelamento = NOW(),
        validado = FALSE,
        usuario_validacao_id = NULL,
        data_hora_validacao = NULL,
        usuario_ultima_alteracao_id = $2,
        data_hora_ultima_alteracao = NOW()
      WHERE empresa_id = $1
        AND id = ANY($5::BIGINT[])
        AND integrado = FALSE
        AND excluido = FALSE
      RETURNING *`,
      [empresaId, usuarioId, motivoId, observacao ?? '', ids]
    );

    for (const linha of resultado.rows) {
      await cliente.query(
        `INSERT INTO frota_historicos (empresa_id, usuario_id, operacao, tabela_afetada, registro_id, valor_anterior, valor_posterior, origem_operacao)
        VALUES ($1, $2, 'CANCELAMENTO', 'frota_despesas', $3, $4::JSONB, $5::JSONB, 'CANCELAMENTO_MANUAL')`,
        [
          empresaId,
          usuarioId,
          linha.id,
          JSON.stringify(anteriores.rows.find((item) => Number(item.id) === Number(linha.id)) ?? {}),
          JSON.stringify(linha)
        ]
      );
    }

    await cliente.query('COMMIT');
    return { cancelados: resultado.rowCount };
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function listarHistoricoDespesaFrota(empresaId: number, despesaId: number) {
  return consultar(
    `SELECT h.*, u.nome AS usuario_nome
    FROM frota_historicos h
    LEFT JOIN usuarios u ON u.id = h.usuario_id
    WHERE h.empresa_id = $1
      AND h.tabela_afetada = 'frota_despesas'
      AND h.registro_id = $2
    ORDER BY h.criado_em DESC`,
    [empresaId, despesaId]
  );
}

export async function obterMapeamentoImportacaoFrota(fornecedorId: number) {
  return consultarUm(
    `SELECT fornecedor_id, mapeamento
    FROM frota_mapeamentos_importacao
    WHERE fornecedor_id = $1`,
    [fornecedorId]
  );
}

export async function salvarMapeamentoImportacaoFrota(fornecedorId: number, mapeamento: Record<string, string>, usuarioId: number) {
  return consultarUm(
    `INSERT INTO frota_mapeamentos_importacao (fornecedor_id, mapeamento, criado_por_usuario_id)
    VALUES ($1, $2::JSONB, $3)
    ON CONFLICT (fornecedor_id) DO UPDATE SET
      mapeamento = EXCLUDED.mapeamento,
      alterado_em = NOW(),
      alterado_por_usuario_id = $3
    RETURNING fornecedor_id, mapeamento`,
    [fornecedorId, JSON.stringify(mapeamento), usuarioId]
  );
}

export async function importarDespesasFrota(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const fornecedorId = Number(dados.fornecedor_id);
  const linhas = Array.isArray(dados.linhas) ? dados.linhas as Record<string, unknown>[] : [];
  const resultado = {
    lote_id: undefined as number | undefined,
    total_linhas: linhas.length,
    importadas: 0,
    atualizadas: 0,
    ignoradas: 0,
    com_erro: 0,
    pendentes_vinculo: [] as string[],
    mensagens: [] as string[]
  };

  if (dados.mapeamento && typeof dados.mapeamento === 'object') {
    await salvarMapeamentoImportacaoFrota(fornecedorId, dados.mapeamento as Record<string, string>, usuarioId);
  }

  const descricoes = [...new Set(linhas.map((linha) => texto(linha.descricao_despesa).toUpperCase()).filter(Boolean))];
  const vinculadas = await consultar<{ descricao_despesa: string }>(
    `SELECT UPPER(descricao_despesa) AS descricao_despesa
    FROM frota_despesas_tipos
    WHERE ativo = TRUE
      AND excluido = FALSE
      AND (fornecedor_id = $1 OR fornecedor_id IS NULL)
      AND UPPER(descricao_despesa) = ANY($2::VARCHAR[])`,
    [fornecedorId, descricoes]
  );
  const setVinculadas = new Set(vinculadas.map((item) => item.descricao_despesa));
  resultado.pendentes_vinculo = descricoes.filter((descricao) => !setVinculadas.has(descricao));
  if (resultado.pendentes_vinculo.length) {
    resultado.mensagens.push('Existem descricoes de despesa sem De/Para. A importacao nao foi confirmada.');
    return resultado;
  }

  const cliente = await banco.connect();
  try {
    await cliente.query('BEGIN');
    const lote = await cliente.query(
      `INSERT INTO frota_lotes_importacao (empresa_id, fornecedor_id, nome_arquivo, usuario_id, quantidade_linhas, resultado)
      VALUES ($1, $2, $3, $4, $5, 'PROCESSANDO')
      RETURNING id`,
      [empresaId, fornecedorId, dados.nome_arquivo ?? null, usuarioId, linhas.length]
    );
    resultado.lote_id = Number(lote.rows[0].id);

    for (const [indice, linha] of linhas.entries()) {
      try {
        const organizacao = await resolverOrganizacaoDespesa(empresaId, fornecedorId, linha);
        const dataHora = linha.data_hora;
        const documento = texto(linha.numero_documento);
        if (organizacao.placa && !organizacao.veiculo_encontrado) {
          resultado.mensagens.push(`Linha ${indice + 1}: placa ${organizacao.placa} importada sem cadastro de veiculo. A validacao ficara bloqueada ate o cadastro no Decis.`);
        } else if (organizacao.placa && !organizacao.veiculo_com_vinculos) {
          resultado.mensagens.push(`Linha ${indice + 1}: placa ${organizacao.placa} importada sem motorista ou departamento no veiculo. A validacao ficara bloqueada ate completar o cadastro.`);
        }

        if (!dataHora || !dataValida(dataHora) || !documento || !organizacao.descricao_despesa || !temValor(linha.quantidade) || !numeroValido(linha.quantidade) || !temValor(linha.total) || !numeroValido(linha.total)) {
          resultado.com_erro += 1;
          resultado.mensagens.push(`Linha ${indice + 1}: documento, data/hora, descricao da despesa, quantidade e total sao obrigatorios.`);
          continue;
        }

        if (!organizacao.tipo_despesa_id) {
          resultado.com_erro += 1;
          resultado.mensagens.push(`Linha ${indice + 1}: despesa sem De/Para para ${organizacao.descricao_despesa}.`);
          continue;
        }

        const existente = await cliente.query(
          `SELECT *
          FROM frota_despesas
          WHERE empresa_id = $1
            AND fornecedor_id = $2
            AND numero_documento = $3
            AND COALESCE(placa, '') = COALESCE($4::VARCHAR, '')
            AND data_despesa = $5::DATE
            AND descricao_despesa = $6
            AND excluido = FALSE
          FOR UPDATE`,
          [organizacao.empresa_id, fornecedorId, documento, organizacao.placa, calcularDataDespesa(dataHora), organizacao.descricao_despesa]
        );
        const atual = existente.rows[0];
        if (atual?.validado || atual?.integrado) {
          resultado.ignoradas += 1;
          resultado.mensagens.push(`Linha ${indice + 1}: documento ${documento} ignorado por estar validado ou integrado.`);
          continue;
        }

        const valoresDespesa = calcularValoresDespesa(linha);
        const valores = [
          organizacao.empresa_id,
          organizacao.departamento_id,
          organizacao.motorista_id,
          organizacao.tipo_despesa_id,
          fornecedorId,
          organizacao.veiculo_id,
          organizacao.placa,
          normalizarDataHoraBanco(dataHora),
          calcularDataDespesa(dataHora),
          numero(linha.hodometro),
          documento,
          texto(linha.fatura) || null,
          organizacao.descricao_despesa,
          valoresDespesa.quantidade,
          texto(linha.unidade_despesa) || null,
          valoresDespesa.valorUnitario,
          valoresDespesa.valorUnitarioLiquido,
          valoresDespesa.valorBruto,
          valoresDespesa.desconto,
          valoresDespesa.total,
          organizacao.codigo_forma_pagamento_decis,
          organizacao.descricao_forma_pagamento,
          organizacao.dia_vencimento,
          organizacao.data_vencimento,
          usuarioId,
          resultado.lote_id
        ];

        if (atual) {
          const atualizado = await cliente.query(
            `UPDATE frota_despesas
            SET departamento_id = $2,
              motorista_id = $3,
              tipo_despesa_id = $4,
              veiculo_id = $6,
              data_despesa = $9,
              hodometro = $10,
              fatura = $12,
              descricao_despesa = $13,
              quantidade = $14,
              unidade_despesa = $15,
              valor_unitario = $16,
              valor_unitario_liquido = $17,
              valor_bruto = $18,
              desconto = $19,
              total = $20,
              codigo_forma_pagamento_decis = $21,
              descricao_forma_pagamento = $22,
              dia_vencimento = $23,
              data_vencimento = $24,
              usuario_ultima_alteracao_id = $25,
              data_hora_ultima_alteracao = NOW(),
              origem_lancamento = 'IMPORTACAO',
              lote_importacao_id = $26
            WHERE id = $27
              AND integrado = FALSE
              AND validado = FALSE
            RETURNING *`,
            [...valores, atual.id]
          );
          resultado.atualizadas += atualizado.rowCount ?? 0;
        } else {
          await cliente.query(
            `INSERT INTO frota_despesas (
              empresa_id, departamento_id, motorista_id, tipo_despesa_id, fornecedor_id, veiculo_id, placa, data_hora,
              data_despesa, hodometro, numero_documento, fatura, descricao_despesa, quantidade, unidade_despesa, valor_unitario,
              valor_unitario_liquido, valor_bruto, desconto, total, codigo_forma_pagamento_decis, descricao_forma_pagamento,
              dia_vencimento, data_vencimento, usuario_inclusao_id, usuario_ultima_alteracao_id, data_hora_ultima_alteracao,
              origem_lancamento, lote_importacao_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::TIMESTAMPTZ, $9::DATE, $10::NUMERIC, $11, $12, $13, $14::NUMERIC, $15, $16::NUMERIC, $17::NUMERIC, $18::NUMERIC, $19::NUMERIC, $20::NUMERIC, $21, $22, $23, $24::DATE, $25, $25, NOW(), 'IMPORTACAO', $26)`,
            valores
          );
          resultado.importadas += 1;
        }
      } catch (erro) {
        resultado.com_erro += 1;
        resultado.mensagens.push(`Linha ${indice + 1}: ${erro instanceof Error ? erro.message : 'erro nao identificado'}.`);
      }
    }

    await cliente.query(
      `UPDATE frota_lotes_importacao
      SET quantidade_importada = $2,
        quantidade_atualizada = $3,
        quantidade_ignorada = $4,
        quantidade_erro = $5,
        resultado = $6,
        mensagens_processamento = $7::JSONB
      WHERE id = $1`,
      [
        resultado.lote_id,
        resultado.importadas,
        resultado.atualizadas,
        resultado.ignoradas,
        resultado.com_erro,
        resultado.com_erro ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO',
        JSON.stringify(resultado.mensagens)
      ]
    );

    await cliente.query('COMMIT');
    await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'IMPORTACAO', tabelaAfetada: 'frota_lotes_importacao', registroId: resultado.lote_id, valorPosterior: resultado });
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function listarConfiguracoesFrota(empresaId: number) {
  const modulo = await consultarUm<{ id: number }>(`SELECT id FROM modulos WHERE codigo = 'FROTA'`);
  if (!modulo) return {};
  const config = await consultarUm<{ valor: Record<string, unknown> }>(
    `SELECT valor
    FROM frota_configuracoes
    WHERE empresa_id = $1
      AND modulo_id = $2
      AND chave = 'FROTA_GERAL'`,
    [empresaId, modulo.id]
  );
  return config?.valor ?? {};
}

export async function salvarConfiguracoesFrota(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const modulo = await consultarUm<{ id: number }>(`SELECT id FROM modulos WHERE codigo = 'FROTA'`);
  if (!modulo) throw new Error('Modulo Frota nao encontrado.');
  return consultarUm(
    `INSERT INTO frota_configuracoes (empresa_id, modulo_id, chave, valor, sensivel, alterado_por_usuario_id)
    VALUES ($1, $2, 'FROTA_GERAL', $3::JSONB, FALSE, $4)
    ON CONFLICT (empresa_id, modulo_id, chave) DO UPDATE SET
      valor = EXCLUDED.valor,
      alterado_em = NOW(),
      alterado_por_usuario_id = $4
    RETURNING valor`,
    [empresaId, modulo.id, JSON.stringify(dados), usuarioId]
  );
}

export async function excluirRegistroFrota(tabela: string, id: number, usuarioId: number, empresaId?: number | null) {
  const tabelasPermitidas = new Set([
    'frota_departamentos',
    'frota_motoristas',
    'frota_veiculos',
    'frota_tipos_despesas',
    'frota_fornecedores',
    'frota_despesas_tipos',
    'frota_motivos_cancelamento'
  ]);
  if (!tabelasPermitidas.has(tabela)) throw new Error('Tabela nao permitida para exclusao.');
  const resultado = await consultarUm(
    `UPDATE ${tabela}
    SET excluido = TRUE,
      ativo = FALSE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $2
    WHERE id = $1
    RETURNING id`,
    [id, usuarioId]
  );
  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'EXCLUSAO', tabelaAfetada: tabela, registroId: id, valorPosterior: resultado });
  return resultado;
}
