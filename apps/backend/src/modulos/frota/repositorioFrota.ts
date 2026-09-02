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

export type FiltrosDashboardFrota = {
  periodo?: string | null;
  motoristaId?: number | null;
  placa?: string | null;
  situacoes?: string | null;
};

export type FiltrosKmFrota = {
  empresaId: number;
  dataInicial?: string | null;
  dataFinal?: string | null;
  motoristaId?: number | null;
  veiculoId?: number | null;
  departamentoId?: number | null;
  coordenadorId?: number | null;
  validado?: string | null;
  integrado?: string | null;
  cancelado?: string | null;
  usuarioId?: number | null;
  podeVerTerceiros?: boolean;
  podeVerKmCoordenador?: boolean;
  incluirProprioComCoordenacao?: boolean;
  somenteCoordenacao?: boolean;
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

function dataIso(valor: unknown) {
  const data = converterData(valor);
  return data ? data.toISOString().slice(0, 10) : texto(valor);
}

function horaTexto(valor: unknown) {
  const valorTexto = texto(valor);
  return valorTexto ? valorTexto.slice(0, 5) : null;
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

function montarFiltrosDashboardFrota(empresaId: number, filtros: FiltrosDashboardFrota = {}) {
  const params: unknown[] = [empresaId];
  const condicoes = ['d.empresa_id = $1', 'd.excluido = FALSE'];
  const periodo = texto(filtros.periodo || 'MES_ATUAL').toUpperCase();

  if (periodo === '15_DIAS') {
    condicoes.push(`d.data_hora::DATE >= (CURRENT_DATE - INTERVAL '15 DAYS')::DATE`);
  } else if (periodo === 'MES_ANTERIOR') {
    condicoes.push(`d.data_hora >= (DATE_TRUNC('MONTH', CURRENT_DATE) - INTERVAL '1 MONTH')`);
    condicoes.push(`d.data_hora < DATE_TRUNC('MONTH', CURRENT_DATE)`);
  } else if (periodo === '3_MESES') {
    condicoes.push(`d.data_hora::DATE >= (CURRENT_DATE - INTERVAL '3 MONTHS')::DATE`);
  } else {
    condicoes.push(`d.data_hora::DATE >= DATE_TRUNC('MONTH', CURRENT_DATE)::DATE`);
  }

  if (filtros.motoristaId) {
    params.push(Number(filtros.motoristaId));
    condicoes.push(`d.motorista_id = $${params.length}::BIGINT`);
  }

  const placa = placaNormalizada(filtros.placa);
  if (placa) {
    params.push(placa);
    condicoes.push(`d.placa = $${params.length}`);
  }

  const situacoes = texto(filtros.situacoes)
    .split(',')
    .map((situacao) => situacao.trim().toUpperCase())
    .filter((situacao) => ['PENDENTE', 'VALIDADO', 'INTEGRADO'].includes(situacao));
  const situacoesUnicas = [...new Set(situacoes)];
  if (situacoesUnicas.length > 0 && situacoesUnicas.length < 3) {
    const condicoesSituacao = situacoesUnicas.map((situacao) => {
      if (situacao === 'VALIDADO') return 'd.validado = TRUE';
      if (situacao === 'INTEGRADO') return 'd.integrado = TRUE';
      return '(d.validado = FALSE AND d.integrado = FALSE)';
    });
    condicoes.push(`(${condicoesSituacao.join(' OR ')})`);
  }

  return { where: condicoes.join('\n      AND '), params };
}

export async function obterIndicadoresFrota(empresaId: number, filtros: FiltrosDashboardFrota = {}) {
  const configuracoes = await listarConfiguracoesFrota(empresaId);
  const tipoDespesaAbastecimentoId = Number(configuracoes.tipo_despesa_abastecimento_id);
  const tipoAbastecimentoValido = Number.isFinite(tipoDespesaAbastecimentoId) && tipoDespesaAbastecimentoId > 0;
  const filtroDashboard = montarFiltrosDashboardFrota(empresaId, filtros);

  const resumo = await consultarUm(
    `SELECT
      COUNT(*) FILTER (WHERE cancelado = FALSE)::INTEGER AS despesas_periodo,
      COUNT(*) FILTER (WHERE cancelado = TRUE)::INTEGER AS despesas_canceladas,
      COALESCE(SUM(total) FILTER (WHERE cancelado = FALSE), 0) AS valor_total,
      COALESCE(SUM(desconto) FILTER (WHERE cancelado = FALSE), 0) AS desconto_total_periodo,
      COUNT(*) FILTER (WHERE validado = FALSE AND cancelado = FALSE)::INTEGER AS despesas_pendentes_validacao,
      COUNT(*) FILTER (WHERE validado = TRUE AND cancelado = FALSE)::INTEGER AS despesas_validadas,
      COUNT(*) FILTER (WHERE integrado = TRUE AND cancelado = FALSE)::INTEGER AS despesas_integradas,
      COUNT(*) FILTER (WHERE integrado = FALSE AND cancelado = FALSE)::INTEGER AS despesas_nao_integradas
    FROM frota_despesas d
    WHERE ${filtroDashboard.where}`,
    filtroDashboard.params
  );

  const paramsAbastecimento = [...filtroDashboard.params, tipoDespesaAbastecimentoId];
  const indiceTipoAbastecimento = paramsAbastecimento.length;
  const custoMedioAbastecimentos = tipoAbastecimentoValido
    ? await consultar(
      `SELECT
        d.descricao_despesa AS descricao,
        COUNT(*)::INTEGER AS quantidade_lancamentos,
        COALESCE(SUM(d.quantidade), 0) AS quantidade_total,
        COALESCE(SUM(d.total), 0) AS valor_total,
        COALESCE(AVG(NULLIF(d.valor_unitario_liquido, 0)), 0) AS valor_unitario_liquido_medio,
        COALESCE(AVG(CASE WHEN d.quantidade > 0 THEN d.desconto / d.quantidade ELSE NULL END), 0) AS desconto_unitario_medio
      FROM frota_despesas d
      WHERE ${filtroDashboard.where}
        AND d.cancelado = FALSE
        AND d.tipo_despesa_id = $${indiceTipoAbastecimento}::BIGINT
      GROUP BY d.descricao_despesa
      ORDER BY valor_total DESC, d.descricao_despesa ASC
      LIMIT 12`,
      paramsAbastecimento
    )
    : [];

  const descontosPorTipo = await consultar(
    `SELECT
      COALESCE(td.descricao, 'Sem tipo') AS descricao,
      COALESCE(SUM(d.desconto), 0) AS valor_total
    FROM frota_despesas d
    LEFT JOIN frota_tipos_despesas td ON td.id = d.tipo_despesa_id
    WHERE ${filtroDashboard.where}
      AND d.cancelado = FALSE
    GROUP BY COALESCE(td.descricao, 'Sem tipo')
    HAVING COALESCE(SUM(d.desconto), 0) <> 0
    ORDER BY valor_total DESC
    LIMIT 8`,
    filtroDashboard.params
  );

  const veiculosMaiorDespesa = await consultar(
    `SELECT placa, COALESCE(SUM(total), 0) AS valor_total
    FROM frota_despesas d
    WHERE ${filtroDashboard.where}
      AND d.cancelado = FALSE
    GROUP BY placa
    ORDER BY valor_total DESC
    LIMIT 5`,
    filtroDashboard.params
  );

  const despesasPorTipo = await consultar(
    `SELECT COALESCE(td.descricao, 'Sem tipo') AS descricao, COALESCE(SUM(d.total), 0) AS valor_total
    FROM frota_despesas d
    LEFT JOIN frota_tipos_despesas td ON td.id = d.tipo_despesa_id
    WHERE ${filtroDashboard.where}
      AND d.cancelado = FALSE
    GROUP BY COALESCE(td.descricao, 'Sem tipo')
    ORDER BY valor_total DESC
    LIMIT 8`,
    filtroDashboard.params
  );

  const despesasPorDepartamento = await consultar(
    `SELECT COALESCE(dep.descricao, 'Sem departamento') AS descricao, COALESCE(SUM(d.total), 0) AS valor_total
    FROM frota_despesas d
    LEFT JOIN frota_departamentos dep ON dep.id = d.departamento_id
    WHERE ${filtroDashboard.where}
      AND d.cancelado = FALSE
    GROUP BY COALESCE(dep.descricao, 'Sem departamento')
    ORDER BY valor_total DESC
    LIMIT 8`,
    filtroDashboard.params
  );

  const despesasPorMotorista = await consultar(
    `SELECT COALESCE(mot.nome, 'Sem motorista') AS descricao, COALESCE(SUM(d.total), 0) AS valor_total
    FROM frota_despesas d
    LEFT JOIN frota_motoristas mot ON mot.id = d.motorista_id
    WHERE ${filtroDashboard.where}
      AND d.cancelado = FALSE
    GROUP BY COALESCE(mot.nome, 'Sem motorista')
    ORDER BY valor_total DESC
    LIMIT 8`,
    filtroDashboard.params
  );

  const evolucaoMensal = await consultar(
    `SELECT TO_CHAR(DATE_TRUNC('MONTH', data_hora), 'YYYY-MM') AS mes,
      COALESCE(SUM(total), 0) AS valor_total
    FROM frota_despesas d
    WHERE ${filtroDashboard.where}
      AND d.cancelado = FALSE
    GROUP BY DATE_TRUNC('MONTH', d.data_hora)
    ORDER BY mes ASC`,
    filtroDashboard.params
  );

  return {
    ...(resumo ?? {}),
    tipo_despesa_abastecimento_id: tipoAbastecimentoValido ? tipoDespesaAbastecimentoId : null,
    custo_medio_abastecimentos: custoMedioAbastecimentos,
    descontos_por_tipo: descontosPorTipo,
    veiculos_maior_despesa: veiculosMaiorDespesa,
    despesas_por_tipo: despesasPorTipo,
    despesas_por_departamento: despesasPorDepartamento,
    despesas_por_motorista: despesasPorMotorista,
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
    `INSERT INTO frota_departamentos (empresa_id, codigo_decis, descricao, filial_decis, codigo_origem_decis, ativo, criado_por_usuario_id)
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE), $7)
    ON CONFLICT (empresa_id, codigo_decis) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      filial_decis = EXCLUDED.filial_decis,
      codigo_origem_decis = EXCLUDED.codigo_origem_decis,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $7
    RETURNING *`,
    [
      empresaId,
      dados.codigo_decis,
      dados.descricao,
      dados.filial_decis ?? null,
      dados.codigo_origem_decis ?? null,
      dados.ativo ?? true,
      usuarioId
    ]
  );
  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'SALVAR_DEPARTAMENTO', tabelaAfetada: 'frota_departamentos', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarMotoristasFrota() {
  return consultar(
    `SELECT
      m.id,
      m.codigo_decis,
      m.nome,
      m.usuario_id,
      u.nome AS usuario_nome,
      m.departamento_id,
      d.descricao AS departamento_descricao,
      m.ajudante,
      m.ajudante_padrao,
      m.ajudante_padrao_motorista_id,
      aj.nome AS ajudante_padrao_nome,
      m.coordenador_padrao_motorista_id,
      cp.nome AS coordenador_padrao_nome,
      m.coordenador,
      m.codigo_coordenador_decis,
      m.ativo
    FROM frota_motoristas m
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    LEFT JOIN frota_departamentos d ON d.id = m.departamento_id
    LEFT JOIN frota_motoristas aj ON aj.id = m.ajudante_padrao_motorista_id
    LEFT JOIN frota_motoristas cp ON cp.id = m.coordenador_padrao_motorista_id
    WHERE m.excluido = FALSE
    ORDER BY m.nome ASC`
  );
}

export async function salvarMotoristaFrota(dados: Record<string, unknown>, usuarioId: number) {
  if (dados.id && dados.ajudante_padrao_motorista_id && Number(dados.id) === Number(dados.ajudante_padrao_motorista_id)) {
    throw new Error('O ajudante padrao nao pode ser o proprio motorista.');
  }
  if (dados.id && dados.coordenador_padrao_motorista_id && Number(dados.id) === Number(dados.coordenador_padrao_motorista_id)) {
    throw new Error('O coordenador padrao nao pode ser o proprio motorista.');
  }
  if (dados.coordenador_padrao_motorista_id) {
    const coordenadorPadrao = await consultarUm<{ id: number }>(
      `SELECT id
      FROM frota_motoristas
      WHERE id = $1
        AND coordenador = TRUE
        AND usuario_id IS NOT NULL
        AND excluido = FALSE
      LIMIT 1`,
      [Number(dados.coordenador_padrao_motorista_id)]
    );
    if (!coordenadorPadrao) {
      throw new Error('Selecione um coordenador padrao marcado como coordenador e com usuario vinculado.');
    }
  }
  if (dados.usuario_id) {
    const usuarioVinculado = await consultarUm<{ id: number; nome: string }>(
      `SELECT id, nome
      FROM frota_motoristas
      WHERE usuario_id = $1
        AND excluido = FALSE
        AND ($2::BIGINT IS NULL OR id <> $2::BIGINT)
      LIMIT 1`,
      [Number(dados.usuario_id), dados.id ? Number(dados.id) : null]
    );
    if (usuarioVinculado) {
      throw new Error(`Usuario ja vinculado ao motorista ${usuarioVinculado.nome}.`);
    }
  }
  const registro = await consultarUm(
    `INSERT INTO frota_motoristas (
      codigo_decis,
      nome,
      usuario_id,
      departamento_id,
      ajudante,
      ajudante_padrao,
      ajudante_padrao_motorista_id,
      coordenador_padrao_motorista_id,
      coordenador,
      codigo_coordenador_decis,
      ativo,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, COALESCE($5, FALSE), NULLIF($6, ''), $7, $8, COALESCE($9, FALSE), CASE WHEN COALESCE($9, FALSE) THEN NULLIF($10, '') ELSE NULL END, COALESCE($11, TRUE), $12)
    ON CONFLICT (codigo_decis) DO UPDATE SET
      nome = EXCLUDED.nome,
      usuario_id = EXCLUDED.usuario_id,
      departamento_id = EXCLUDED.departamento_id,
      ajudante = EXCLUDED.ajudante,
      ajudante_padrao = EXCLUDED.ajudante_padrao,
      ajudante_padrao_motorista_id = EXCLUDED.ajudante_padrao_motorista_id,
      coordenador_padrao_motorista_id = EXCLUDED.coordenador_padrao_motorista_id,
      coordenador = EXCLUDED.coordenador,
      codigo_coordenador_decis = EXCLUDED.codigo_coordenador_decis,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $12
    RETURNING *`,
    [
      dados.codigo_decis,
      dados.nome,
      dados.usuario_id ? Number(dados.usuario_id) : null,
      dados.departamento_id ? Number(dados.departamento_id) : null,
      dados.ajudante ?? false,
      dados.ajudante_padrao ?? null,
      dados.ajudante_padrao_motorista_id ? Number(dados.ajudante_padrao_motorista_id) : null,
      dados.coordenador_padrao_motorista_id ? Number(dados.coordenador_padrao_motorista_id) : null,
      dados.coordenador ?? false,
      dados.codigo_coordenador_decis ?? null,
      dados.ativo ?? true,
      usuarioId
    ]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_MOTORISTA', tabelaAfetada: 'frota_motoristas', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

function normalizarParteEmail(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function montarEmailMotorista(nome: string, dominio: string) {
  const partes = nome.split(/\s+/).map(normalizarParteEmail).filter(Boolean);
  if (partes.length === 0) {
    throw new Error('Nome do motorista invalido para gerar usuario.');
  }
  const primeiro = partes[0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : partes[0];
  const dominioTratado = dominio.trim().toLowerCase().startsWith('@') ? dominio.trim().toLowerCase() : `@${dominio.trim().toLowerCase()}`;
  return `${primeiro}.${ultimo}${dominioTratado}`;
}

export async function gerarUsuarioMotoristaFrota(empresaId: number, motoristaId: number, usuarioId: number) {
  const config = await listarConfiguracoesFrota(empresaId);
  const dominioEmail = String(config.email_padrao_motorista ?? '').trim();
  const perfilPadraoId = Number(config.perfil_padrao_motorista_id ?? 0);

  if (!dominioEmail) {
    throw new Error('Configure o complemento do e-mail dos motoristas nas configuracoes do Frota.');
  }
  if (!perfilPadraoId) {
    throw new Error('Configure o grupo padrao para cadastro de motoristas nas configuracoes do Frota.');
  }

  const motorista = await consultarUm<{ id: number; nome: string; usuario_id: number | null }>(
    `SELECT id, nome, usuario_id
    FROM frota_motoristas
    WHERE id = $1
      AND excluido = FALSE
      AND ativo = TRUE`,
    [motoristaId]
  );
  if (!motorista) {
    throw new Error('Motorista nao encontrado.');
  }
  if (motorista.usuario_id) {
    throw new Error('Motorista ja possui usuario vinculado.');
  }

  const perfil = await consultarUm<{ id: number; nome: string }>(
    `SELECT id, nome
    FROM perfis
    WHERE id = $1
      AND ativo = TRUE
      AND excluido = FALSE`,
    [perfilPadraoId]
  );
  if (!perfil) {
    throw new Error('Grupo padrao configurado para motoristas nao foi encontrado.');
  }

  const email = montarEmailMotorista(motorista.nome, dominioEmail);
  const emailExistente = await consultarUm<{ id: number }>(
    `SELECT id
    FROM usuarios
    WHERE LOWER(email) = LOWER($1)
      AND excluido = FALSE`,
    [email]
  );
  if (emailExistente) {
    throw new Error(`Ja existe usuario cadastrado com o e-mail ${email}.`);
  }

  const cliente = await banco.connect();
  try {
    await cliente.query('BEGIN');
    const usuarioCriado = await cliente.query<{ id: number; nome: string; email: string }>(
      `INSERT INTO usuarios (
        perfil_id,
        nome,
        email,
        senha_hash,
        ativo,
        administrador,
        superadmin,
        alterar_senha_proximo_login,
        criado_por_usuario_id
      )
      VALUES ($1, $2, LOWER($3), CRYPT('controls', GEN_SALT('bf')), TRUE, FALSE, FALSE, TRUE, $4)
      RETURNING id, nome, email`,
      [perfilPadraoId, motorista.nome, email, usuarioId]
    );
    const novoUsuario = usuarioCriado.rows[0];

    await cliente.query(
      `INSERT INTO usuarios_empresas (usuario_id, empresa_id, padrao, ativo)
      VALUES ($1, $2, TRUE, TRUE)
      ON CONFLICT (usuario_id, empresa_id) DO UPDATE SET
        padrao = TRUE,
        ativo = TRUE`,
      [novoUsuario.id, empresaId]
    );

    await cliente.query(
      `UPDATE frota_motoristas
      SET usuario_id = $1,
        alterado_em = NOW(),
        alterado_por_usuario_id = $2
      WHERE id = $3
        AND usuario_id IS NULL`,
      [novoUsuario.id, usuarioId, motoristaId]
    );

    await cliente.query('COMMIT');
    await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'GERAR_USUARIO_MOTORISTA', tabelaAfetada: 'frota_motoristas', registroId: motoristaId, valorPosterior: { usuario_id: novoUsuario.id, email: novoUsuario.email, perfil_id: perfilPadraoId } });
    return { ...novoUsuario, perfil_nome: perfil.nome, senha_inicial: 'controls', alterar_senha_proximo_login: true };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export async function listarTiposDespesasFrota() {
  return consultar(
    `SELECT id, codigo_decis, descricao, natureza_credito_decis, conf_custo_decis, ativo
    FROM frota_tipos_despesas
    WHERE excluido = FALSE
    ORDER BY descricao ASC`
  );
}

export async function salvarTipoDespesaFrota(dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_tipos_despesas (codigo_decis, descricao, natureza_credito_decis, conf_custo_decis, ativo, criado_por_usuario_id)
    VALUES ($1, $2, COALESCE(NULLIF($3, ''), '2'), NULLIF($4, ''), COALESCE($5, TRUE), $6)
    ON CONFLICT (codigo_decis) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      natureza_credito_decis = EXCLUDED.natureza_credito_decis,
      conf_custo_decis = EXCLUDED.conf_custo_decis,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $6
    RETURNING *`,
    [dados.codigo_decis, dados.descricao, dados.natureza_credito_decis ?? '2', dados.conf_custo_decis ?? null, dados.ativo ?? true, usuarioId]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_TIPO_DESPESA', tabelaAfetada: 'frota_tipos_despesas', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarMotivosSemPedidoFrota() {
  return consultar(
    `SELECT id, codigo_decis, descricao, ativo
    FROM frota_motivos_sem_pedido
    WHERE excluido = FALSE
    ORDER BY descricao ASC`
  );
}

export async function salvarMotivoSemPedidoFrota(dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_motivos_sem_pedido (codigo_decis, descricao, ativo, criado_por_usuario_id)
    VALUES ($1, $2, COALESCE($3, TRUE), $4)
    ON CONFLICT (descricao) DO UPDATE SET
      codigo_decis = EXCLUDED.codigo_decis,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $4
    RETURNING *`,
    [dados.codigo_decis ?? null, dados.descricao, dados.ativo ?? true, usuarioId]
  );
  await registrarHistoricoFrota({ usuarioId, operacao: 'SALVAR_MOTIVO_SEM_PEDIDO', tabelaAfetada: 'frota_motivos_sem_pedido', registroId: registro?.id, valorPosterior: registro });
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
  const tipo = await consultarUm<{ tipo_despesa_id: number; conf_custo_decis: string | null }>(
    `SELECT
      dt.tipo_despesa_id,
      td.conf_custo_decis
    FROM frota_despesas_tipos dt
    INNER JOIN frota_tipos_despesas td ON td.id = dt.tipo_despesa_id
    WHERE UPPER(dt.descricao_despesa) = $1
      AND dt.ativo = TRUE
      AND dt.excluido = FALSE
      AND (dt.fornecedor_id = $2 OR dt.fornecedor_id IS NULL)
    ORDER BY dt.fornecedor_id NULLS LAST
    LIMIT 1`,
    [descricaoDespesa, fornecedorId]
  );
  const fornecedor = await consultarUm<Record<string, unknown>>(
    `SELECT codigo_forma_pagamento_decis, descricao_forma_pagamento, dia_vencimento, conf_custo_decis
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
    conf_custo_decis: texto(tipo?.conf_custo_decis) || texto(fornecedor?.conf_custo_decis) || null,
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
      COALESCE(NULLIF(td.conf_custo_decis, ''), NULLIF(f.conf_custo_decis, '')) AS conf_custo_decis,
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
      FOR UPDATE OF d`,
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
        `WITH vinculos AS (
          SELECT
            d.id AS despesa_id,
            v.id AS veiculo_id,
            v.departamento_id,
            v.motorista_id
          FROM frota_despesas d
          INNER JOIN frota_veiculos v ON v.placa = d.placa
          WHERE d.empresa_id = $1
            AND d.id = ANY($3::BIGINT[])
            AND v.excluido = FALSE
            AND v.departamento_id IS NOT NULL
            AND v.motorista_id IS NOT NULL
        )
        UPDATE frota_despesas d
        SET veiculo_id = vinculos.veiculo_id,
          departamento_id = vinculos.departamento_id,
          motorista_id = vinculos.motorista_id,
          usuario_ultima_alteracao_id = $2,
          data_hora_ultima_alteracao = NOW()
        FROM vinculos
        WHERE d.id = vinculos.despesa_id
          AND (d.veiculo_id IS DISTINCT FROM vinculos.veiculo_id OR d.departamento_id IS DISTINCT FROM vinculos.departamento_id OR d.motorista_id IS DISTINCT FROM vinculos.motorista_id)`,
        [empresaId, usuarioId, ids]
      );
    }

    const resultado = await cliente.query(
      `UPDATE frota_despesas
      SET validado = $3::BOOLEAN,
        usuario_validacao_id = CASE WHEN $3::BOOLEAN THEN $2::BIGINT ELSE NULL::BIGINT END,
        data_hora_validacao = CASE WHEN $3::BOOLEAN THEN NOW() ELSE NULL::TIMESTAMPTZ END,
        usuario_ultima_alteracao_id = $2::BIGINT,
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
        motivo_cancelamento_id = $3::BIGINT,
        motivo_cancelamento_texto = NULLIF($4, ''),
        usuario_cancelamento_id = $2::BIGINT,
        data_hora_cancelamento = NOW(),
        validado = FALSE,
        usuario_validacao_id = NULL,
        data_hora_validacao = NULL,
        usuario_ultima_alteracao_id = $2::BIGINT,
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

export async function listarHistoricoApontamentoKmFrota(empresaId: number, apontamentoId: number) {
  return consultar(
    `SELECT h.*, u.nome AS usuario_nome
    FROM frota_historicos h
    LEFT JOIN usuarios u ON u.id = h.usuario_id
    WHERE h.empresa_id = $1
      AND h.tabela_afetada = 'frota_apontamentos_km'
      AND h.registro_id = $2
    ORDER BY h.criado_em DESC`,
    [empresaId, apontamentoId]
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
      const pontoSalvamento = `sp_importacao_frota_${indice + 1}`;
      await cliente.query(`SAVEPOINT ${pontoSalvamento}`);
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
          await cliente.query(`RELEASE SAVEPOINT ${pontoSalvamento}`);
          continue;
        }

        if (!organizacao.tipo_despesa_id) {
          resultado.com_erro += 1;
          resultado.mensagens.push(`Linha ${indice + 1}: despesa sem De/Para para ${organizacao.descricao_despesa}.`);
          await cliente.query(`RELEASE SAVEPOINT ${pontoSalvamento}`);
          continue;
        }

        const valoresDespesa = calcularValoresDespesa(linha);
        const existenteExato = await cliente.query(
          `SELECT *
          FROM frota_despesas
          WHERE empresa_id = $1::BIGINT
            AND fornecedor_id = $2::BIGINT
            AND numero_documento = $3
            AND COALESCE(placa, '') = COALESCE($4::VARCHAR, '')
            AND data_despesa = $5::DATE
            AND descricao_despesa = $6
            AND COALESCE(fatura, '') = COALESCE($7::VARCHAR, '')
            AND quantidade = $8::NUMERIC
            AND total = $9::NUMERIC
            AND excluido = FALSE
            AND integrado = FALSE
            AND validado = FALSE
          ORDER BY id ASC
          LIMIT 1
          FOR UPDATE`,
          [
            organizacao.empresa_id,
            fornecedorId,
            documento,
            organizacao.placa,
            calcularDataDespesa(dataHora),
            organizacao.descricao_despesa,
            texto(linha.fatura) || null,
            valoresDespesa.quantidade,
            valoresDespesa.total
          ]
        );
        const atual = existenteExato.rows[0];

        if (atual?.validado || atual?.integrado) {
          resultado.ignoradas += 1;
          resultado.mensagens.push(`Linha ${indice + 1}: documento ${documento} ignorado por estar validado ou integrado.`);
          await cliente.query(`RELEASE SAVEPOINT ${pontoSalvamento}`);
          continue;
        }

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
              fornecedor_id = $5,
              veiculo_id = $6,
              placa = $7,
              data_hora = $8::TIMESTAMPTZ,
              data_despesa = $9,
              hodometro = $10,
              numero_documento = $11,
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
              AND empresa_id = $1::BIGINT
              AND integrado = FALSE
              AND validado = FALSE
            RETURNING *`,
            [...valores, atual.id]
          );
          resultado.atualizadas += atualizado.rowCount ?? 0;
          if ((atualizado.rowCount ?? 0) > 0) {
            resultado.mensagens.push(`Linha ${indice + 1}: documento ${documento} atualizado (${organizacao.descricao_despesa}, total ${valoresDespesa.total}).`);
          }
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
          resultado.mensagens.push(`Linha ${indice + 1}: documento ${documento} importado (${organizacao.descricao_despesa}, total ${valoresDespesa.total}).`);
        }
        await cliente.query(`RELEASE SAVEPOINT ${pontoSalvamento}`);
      } catch (erro) {
        await cliente.query(`ROLLBACK TO SAVEPOINT ${pontoSalvamento}`).catch(() => undefined);
        await cliente.query(`RELEASE SAVEPOINT ${pontoSalvamento}`).catch(() => undefined);
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

export async function registrarStatusIntegracaoFrota(empresaId: number, dados: Record<string, unknown>, usuarioId?: number | null) {
  return consultarUm(
    `INSERT INTO frota_integracoes_status (
      empresa_id,
      workflow_nome,
      ultima_consulta_em,
      ultima_integracao_em,
      status,
      mensagem,
      quantidade_lida,
      quantidade_integrada,
      quantidade_erro,
      detalhes,
      criado_por_usuario_id
    )
    VALUES ($1, COALESCE($2, 'CONTROL S - Integracao DECIS x Control S Hub - Frota'), COALESCE($3::TIMESTAMPTZ, NOW()), $4::TIMESTAMPTZ, COALESCE($5, 'OK'), $6, COALESCE($7::INTEGER, 0), COALESCE($8::INTEGER, 0), COALESCE($9::INTEGER, 0), COALESCE($10::JSONB, '{}'::JSONB), $11)
    RETURNING *`,
    [
      empresaId,
      texto(dados.workflow_nome) || null,
      dados.ultima_consulta_em ?? null,
      dados.ultima_integracao_em ?? null,
      texto(dados.status) || 'OK',
      texto(dados.mensagem) || null,
      dados.quantidade_lida ?? 0,
      dados.quantidade_integrada ?? 0,
      dados.quantidade_erro ?? 0,
      JSON.stringify(dados.detalhes ?? {}),
      usuarioId ?? null
    ]
  );
}

export async function obterResumoIntegracaoFrota(empresaId: number) {
  const ultimoStatus = await consultarUm<Record<string, unknown>>(
    `SELECT *
    FROM frota_integracoes_status
    WHERE empresa_id = $1
    ORDER BY COALESCE(ultima_consulta_em, criado_em) DESC, id DESC
    LIMIT 1`,
    [empresaId]
  );

  const resumo = await consultarUm<Record<string, unknown>>(
    `SELECT
      MAX(data_hora_integracao) FILTER (WHERE integrado = TRUE) AS ultima_integracao_despesas_em,
      COUNT(*) FILTER (WHERE validado = TRUE AND integrado = FALSE AND cancelado = FALSE AND excluido = FALSE) AS despesas_validadas_pendentes,
      COUNT(*) FILTER (WHERE integrado = TRUE AND COALESCE(data_hora_integracao, data_hora_ultima_alteracao, data_hora_inclusao)::DATE = CURRENT_DATE AND excluido = FALSE) AS despesas_integradas_hoje,
      COUNT(*) FILTER (WHERE integrado = TRUE AND excluido = FALSE) AS despesas_integradas_total,
      COUNT(*) FILTER (WHERE validado = TRUE AND excluido = FALSE) AS despesas_validadas_total,
      COUNT(*) FILTER (WHERE cancelado = TRUE AND excluido = FALSE) AS despesas_canceladas_total
    FROM frota_despesas
    WHERE empresa_id = $1`,
    [empresaId]
  );

  return {
    ultimo_status: ultimoStatus ?? null,
    resumo: resumo ?? {}
  };
}

function condicaoKmBase(filtros: FiltrosKmFrota) {
  const params: unknown[] = [filtros.empresaId];
  const condicoes = ['a.empresa_id = $1', 'a.excluido = FALSE'];
  if (filtros.dataInicial) {
    params.push(filtros.dataInicial);
    condicoes.push(`a.data_apontamento >= $${params.length}::DATE`);
  }
  if (filtros.dataFinal) {
    params.push(filtros.dataFinal);
    condicoes.push(`a.data_apontamento <= $${params.length}::DATE`);
  }
  if (filtros.motoristaId) {
    params.push(filtros.motoristaId);
    condicoes.push(`a.motorista_id = $${params.length}::BIGINT`);
  }
  if (filtros.veiculoId) {
    params.push(filtros.veiculoId);
    condicoes.push(`a.veiculo_id = $${params.length}::BIGINT`);
  }
  if (filtros.departamentoId) {
    params.push(filtros.departamentoId);
    condicoes.push(`a.departamento_id = $${params.length}::BIGINT`);
  }
  const coordenadorComProprio = filtros.coordenadorId && filtros.incluirProprioComCoordenacao && !filtros.somenteCoordenacao && !filtros.podeVerTerceiros;
  if (filtros.coordenadorId && !coordenadorComProprio) {
    params.push(filtros.coordenadorId);
    condicoes.push(`coord_efetivo.id = $${params.length}::BIGINT`);
  }
  if (filtros.validado === 'SIM') condicoes.push('a.validado = TRUE');
  if (filtros.validado === 'NAO') condicoes.push('a.validado = FALSE');
  if (filtros.integrado === 'SIM') condicoes.push('a.integrado = TRUE');
  if (filtros.integrado === 'NAO') condicoes.push('a.integrado = FALSE');
  if (filtros.cancelado === 'SIM') condicoes.push('a.cancelado = TRUE');
  if (filtros.cancelado === 'NAO') condicoes.push('COALESCE(a.cancelado, FALSE) = FALSE');
  if (coordenadorComProprio && filtros.usuarioId) {
    params.push(filtros.usuarioId);
    const indiceUsuario = params.length;
    params.push(filtros.coordenadorId);
    const indiceCoordenador = params.length;
    condicoes.push(`(m.usuario_id = $${indiceUsuario}::BIGINT OR coord_efetivo.id = $${indiceCoordenador}::BIGINT)`);
  } else if (!filtros.podeVerTerceiros && filtros.usuarioId && !filtros.coordenadorId) {
    params.push(filtros.usuarioId);
    condicoes.push(`m.usuario_id = $${params.length}::BIGINT`);
  }
  return { where: condicoes.join(' AND '), params };
}

export function calcularPeriodoKm(referencia = new Date(), diaInicio = 26, diaFim = 25) {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const inicioBase = referencia.getDate() >= diaInicio
    ? new Date(ano, mes, diaInicio)
    : new Date(ano, mes - 1, diaInicio);
  const fimBase = new Date(inicioBase.getFullYear(), inicioBase.getMonth() + 1, diaFim);
  return {
    data_inicial: inicioBase.toISOString().slice(0, 10),
    data_final: fimBase.toISOString().slice(0, 10)
  };
}

export async function obterContextoKmFrota(empresaId: number, usuarioId: number, permissoes: string[] = []) {
  const config = await listarConfiguracoesFrota(empresaId);
  const motorista = await consultarUm(
    `SELECT
      m.*,
      d.descricao AS departamento_descricao,
      v.id AS veiculo_id,
      v.placa,
      v.modelo,
      v.odometro_atual,
      aj.nome AS ajudante_padrao_nome,
      m.coordenador_padrao_motorista_id,
      cp.nome AS coordenador_padrao_nome
    FROM frota_motoristas m
    LEFT JOIN frota_departamentos d ON d.id = m.departamento_id
    LEFT JOIN frota_veiculos v ON v.motorista_id = m.id AND v.excluido = FALSE AND v.ativo = TRUE
    LEFT JOIN frota_motoristas aj ON aj.id = m.ajudante_padrao_motorista_id
    LEFT JOIN frota_motoristas cp ON cp.id = m.coordenador_padrao_motorista_id
    WHERE m.usuario_id = $1
      AND m.excluido = FALSE
    ORDER BY v.id NULLS LAST
    LIMIT 1`,
    [usuarioId]
  );
  const podeVerKmCoordenador = permissoes.includes('FROTA_CONSULTAR_KM_COORDENADOR');
  const podeVerTerceiros = permissoes.includes('FROTA_CONSULTAR_KM_TERCEIROS')
    || (!motorista && !podeVerKmCoordenador);
  const periodo = calcularPeriodoKm(new Date(), Number(config.dia_inicio_periodo_km ?? 26), Number(config.dia_fim_periodo_km ?? 25));
  return {
    motorista,
    pode_ver_terceiros: podeVerTerceiros,
    pode_ver_km_coordenador: podeVerKmCoordenador,
    periodo,
    configuracoes: config
  };
}

export async function listarPedidosVendaFrota(empresaId: number) {
  return consultar(
    `SELECT *
    FROM frota_pedidos_venda
    WHERE empresa_id = $1
      AND excluido = FALSE
    ORDER BY data_pedido DESC NULLS LAST, pedido DESC`,
    [empresaId]
  );
}

export async function salvarPedidoVendaFrota(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const registro = await consultarUm(
    `INSERT INTO frota_pedidos_venda (
      empresa_id,
      filial_decis,
      pedido,
      departamento_codigo_decis,
      departamento_nome,
      departamento_vendedor,
      data_pedido,
      cliente_codigo_decis,
      cliente_nome,
      cliente,
      valor,
      codigo_coordenador_decis,
      coordenador_nome,
      coordenador,
      pedido_sequencial,
      ativo,
      criado_por_usuario_id
    )
    VALUES ($1, NULLIF($2, ''), $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, '')::DATE, NULLIF($8, ''), NULLIF($9, ''), $10, COALESCE($11::NUMERIC, 0), NULLIF($12, ''), NULLIF($13, ''), NULLIF($14, ''), NULLIF($15, ''), COALESCE($16, TRUE), $17)
    ON CONFLICT (empresa_id, pedido) DO UPDATE SET
      filial_decis = EXCLUDED.filial_decis,
      departamento_codigo_decis = EXCLUDED.departamento_codigo_decis,
      departamento_nome = EXCLUDED.departamento_nome,
      departamento_vendedor = EXCLUDED.departamento_vendedor,
      data_pedido = EXCLUDED.data_pedido,
      cliente_codigo_decis = EXCLUDED.cliente_codigo_decis,
      cliente_nome = EXCLUDED.cliente_nome,
      cliente = EXCLUDED.cliente,
      valor = EXCLUDED.valor,
      codigo_coordenador_decis = EXCLUDED.codigo_coordenador_decis,
      coordenador_nome = EXCLUDED.coordenador_nome,
      coordenador = EXCLUDED.coordenador,
      pedido_sequencial = EXCLUDED.pedido_sequencial,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $17
    RETURNING *`,
    [
      empresaId,
      dados.filial_decis ?? null,
      dados.pedido,
      dados.departamento_codigo_decis ?? dados.departamento_codigo ?? null,
      dados.departamento_nome ?? dados.departamento_vendedor ?? null,
      dados.departamento_vendedor ?? null,
      dados.data_pedido || dados.data ? dataIso(dados.data_pedido || dados.data) : '',
      dados.cliente_codigo_decis ?? dados.cliente_codigo ?? null,
      dados.cliente_nome ?? dados.cliente,
      dados.cliente_nome ?? dados.cliente,
      dados.valor ?? 0,
      dados.codigo_coordenador_decis ?? null,
      dados.coordenador_nome ?? dados.coordenador ?? null,
      dados.coordenador_nome ?? dados.coordenador ?? null,
      dados.pedido_sequencial ?? null,
      dados.ativo ?? true,
      usuarioId
    ]
  );
  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'SALVAR_PEDIDO_VENDA_KM', tabelaAfetada: 'frota_pedidos_venda', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function listarApontamentosKmFrota(filtros: FiltrosKmFrota) {
  const consultaBase = condicaoKmBase(filtros);
  const linhas = await consultar(
    `SELECT
      a.*,
      0 AS percurso,
      v.codigo_decis AS veiculo_decis,
      a.data_apontamento AS datasaida,
      a.data_apontamento AS dataretorno,
      p.coordenador_nome AS solicitante,
      msp.descricao AS motivo,
      d.codigo_origem_decis AS origem,
      CASE
        WHEN p.pedido_sequencial IS NOT NULL THEN p.pedido_sequencial
        ELSE d.codigo_origem_decis
      END AS destino,
      m.codigo_decis AS motorista_decis,
      a.km_inicial AS medicaosaida,
      a.km_final AS medicaoretorno,
      aj.codigo_decis AS ajudante_decis,
      aj2.codigo_decis AS ajudante2_decis,
      d.filial_decis AS filial,
      uinc.nome AS usuario_inclusao_nome,
      ualt.nome AS usuario_alteracao_nome,
      mc.descricao AS motivo_cancelamento_descricao,
      p.pedido,
      p.cliente_codigo_decis,
      COALESCE(p.cliente_nome, p.cliente) AS cliente,
      p.departamento_codigo_decis,
      COALESCE(p.departamento_nome, p.departamento_vendedor) AS departamento_pedido_nome,
      p.codigo_coordenador_decis,
      COALESCE(p.coordenador_nome, p.coordenador) AS coordenador,
      coord_pedido.id AS coordenador_pedido_motorista_id,
      coord_pedido.nome AS coordenador_pedido_motorista_nome,
      coord_padrao.id AS coordenador_padrao_motorista_id,
      coord_padrao.nome AS coordenador_padrao_motorista_nome,
      COALESCE(coord_pedido.nome, coord_padrao.nome, 'SEM COORDENADOR') AS coordenador_encontrado,
      p.filial_decis,
      msp.descricao AS motivo_sem_pedido_descricao,
      m.nome AS motorista_nome,
      m.codigo_decis AS motorista_codigo_decis,
      aj.nome AS ajudante_motorista_nome,
      aj.codigo_decis AS ajudante_codigo_decis,
      aj2.nome AS ajudante_motorista2_nome,
      v.placa,
      v.modelo,
      d.descricao AS departamento_descricao,
      d.codigo_origem_decis,
      coord_efetivo.id AS coordenador_motorista_id,
      coord_efetivo.nome AS coordenador_motorista_nome
    FROM frota_apontamentos_km a
    LEFT JOIN frota_pedidos_venda p ON p.id = a.pedido_venda_id
    LEFT JOIN frota_motivos_sem_pedido msp ON msp.id = a.motivo_sem_pedido_id
    LEFT JOIN frota_motivos_cancelamento mc ON mc.id = a.motivo_cancelamento_id
    LEFT JOIN frota_motoristas m ON m.id = a.motorista_id
    LEFT JOIN frota_motoristas aj ON aj.id = a.ajudante_motorista_id
    LEFT JOIN frota_motoristas aj2 ON aj2.id = a.ajudante_motorista2_id
    LEFT JOIN frota_veiculos v ON v.id = a.veiculo_id
    LEFT JOIN frota_departamentos d ON d.id = a.departamento_id
    LEFT JOIN usuarios uinc ON uinc.id = a.usuario_inclusao_id
    LEFT JOIN usuarios ualt ON ualt.id = a.usuario_ultima_alteracao_id
    LEFT JOIN frota_motoristas coord_pedido ON coord_pedido.coordenador = TRUE AND coord_pedido.usuario_id IS NOT NULL AND coord_pedido.codigo_coordenador_decis = p.codigo_coordenador_decis AND coord_pedido.excluido = FALSE
    LEFT JOIN frota_motoristas coord_padrao ON coord_padrao.id = m.coordenador_padrao_motorista_id AND coord_padrao.coordenador = TRUE AND coord_padrao.usuario_id IS NOT NULL AND coord_padrao.excluido = FALSE
    LEFT JOIN frota_motoristas coord_efetivo ON coord_efetivo.id = COALESCE(coord_pedido.id, coord_padrao.id)
    WHERE ${consultaBase.where}
    ORDER BY a.data_apontamento DESC, a.id DESC`,
    consultaBase.params
  );

  const totalizadores = await consultarUm(
    `SELECT
      COUNT(*)::INTEGER AS registros,
      COUNT(*) FILTER (WHERE a.validado = TRUE)::INTEGER AS validados,
      COUNT(*) FILTER (WHERE a.validado = FALSE)::INTEGER AS pendentes,
      COUNT(*) FILTER (WHERE a.integrado = TRUE)::INTEGER AS integrados,
      COALESCE(SUM(a.km_total), 0)::NUMERIC AS km_total
    FROM frota_apontamentos_km a
    LEFT JOIN frota_pedidos_venda p ON p.id = a.pedido_venda_id
    LEFT JOIN frota_motoristas m ON m.id = a.motorista_id
    LEFT JOIN frota_veiculos v ON v.id = a.veiculo_id
    LEFT JOIN frota_departamentos d ON d.id = a.departamento_id
    LEFT JOIN frota_motoristas coord_pedido ON coord_pedido.coordenador = TRUE AND coord_pedido.usuario_id IS NOT NULL AND coord_pedido.codigo_coordenador_decis = p.codigo_coordenador_decis AND coord_pedido.excluido = FALSE
    LEFT JOIN frota_motoristas coord_padrao ON coord_padrao.id = m.coordenador_padrao_motorista_id AND coord_padrao.coordenador = TRUE AND coord_padrao.usuario_id IS NOT NULL AND coord_padrao.excluido = FALSE
    LEFT JOIN frota_motoristas coord_efetivo ON coord_efetivo.id = COALESCE(coord_pedido.id, coord_padrao.id)
    WHERE ${consultaBase.where}`,
    consultaBase.params
  );

  return { linhas, totalizadores: totalizadores ?? {} };
}

export async function obterCalendarioKmFrota(filtros: FiltrosKmFrota) {
  const resultado = await listarApontamentosKmFrota(filtros);
  const mapa = new Map<string, any[]>();
  for (const linha of resultado.linhas as any[]) {
    const valorData = linha.data_apontamento;
    const chave = valorData instanceof Date
      ? valorData.toISOString().slice(0, 10)
      : String(valorData).slice(0, 10);
    mapa.set(chave, [...(mapa.get(chave) ?? []), linha]);
  }
  return { ...resultado, calendario: Array.from(mapa.entries()).map(([data, apontamentos]) => ({ data, apontamentos })) };
}

export async function salvarApontamentoKmFrota(empresaId: number, dados: Record<string, unknown>, usuarioId: number) {
  const id = dados.id ? Number(dados.id) : null;
  const semPedido = dados.sem_pedido === true || String(dados.sem_pedido ?? '').toUpperCase() === 'TRUE';
  if (!semPedido && !dados.pedido_venda_id) {
    throw new Error('Informe o pedido de venda ou marque Sem Pedido.');
  }
  if (semPedido && !dados.motivo_sem_pedido_id) {
    throw new Error('Informe o motivo para lancamento sem pedido.');
  }
  if (id) {
    const atual = await consultarUm<{ validado: boolean; integrado: boolean }>(
      `SELECT validado, integrado FROM frota_apontamentos_km WHERE id = $1 AND empresa_id = $2 AND excluido = FALSE`,
      [id, empresaId]
    );
    if (atual?.validado || atual?.integrado) {
      throw new Error('Apontamento validado ou integrado nao pode ser alterado. Remova a validacao antes de alterar.');
    }
  }

  const veiculo = dados.veiculo_id ? await consultarUm<{ odometro_atual: string }>(
    `SELECT odometro_atual FROM frota_veiculos WHERE id = $1 AND excluido = FALSE`,
    [Number(dados.veiculo_id)]
  ) : null;
  const dataApontamento = dataIso(dados.data_apontamento);
  if (dataApontamento > new Date().toISOString().slice(0, 10)) {
    throw new Error('Nao e permitido lancar apontamento de KM em data futura.');
  }
  const kmInicial = Math.trunc(numero(dados.km_inicial));
  const kmFinal = numero(dados.km_final);
  const ultimoKm = dados.veiculo_id ? await consultarUm<{ ultimo_km: string | null }>(
    `SELECT COALESCE(MAX(km_final), MAX(km_inicial)) AS ultimo_km
    FROM frota_apontamentos_km
    WHERE empresa_id = $1
      AND veiculo_id = $2
      AND excluido = FALSE
      AND ($3::BIGINT IS NULL OR id <> $3::BIGINT)`,
    [empresaId, Number(dados.veiculo_id), id]
  ) : null;
  const referenciaKm = Number(ultimoKm?.ultimo_km ?? veiculo?.odometro_atual ?? 0);
  if (referenciaKm > 0 && kmInicial - referenciaKm > 999) {
    throw new Error(`KM inicial nao pode ficar mais de 999 km acima do ultimo lancamento/odometro (${referenciaKm}).`);
  }
  if (Math.trunc(kmFinal) < kmInicial) {
    throw new Error('KM final nao pode ser menor que o KM inicial.');
  }
  if (Math.trunc(kmFinal) - kmInicial > 9999) {
    throw new Error('KM final nao pode ultrapassar o KM inicial em mais de 9999 km.');
  }
  const avisoOdometro = veiculo && kmFinal > 0 && kmFinal < Number(veiculo.odometro_atual ?? 0)
    ? `KM final inferior ao odometro atual do veiculo (${Number(veiculo.odometro_atual).toLocaleString('pt-BR')}). Registro salvo por confirmacao do usuario.`
    : null;
  const motoristaId = dados.motorista_id ? Number(dados.motorista_id) : null;
  const ajudanteMotoristaId = dados.ajudante_motorista_id ? Number(dados.ajudante_motorista_id) : null;
  const ajudanteMotorista2Id = dados.ajudante_motorista2_id ? Number(dados.ajudante_motorista2_id) : null;
  if (ajudanteMotorista2Id && ajudanteMotorista2Id === motoristaId) {
    throw new Error('O ajudante 2 nao pode ser o proprio motorista.');
  }
  if (ajudanteMotorista2Id && ajudanteMotorista2Id === ajudanteMotoristaId) {
    throw new Error('O ajudante 2 deve ser diferente do ajudante 1.');
  }
  const motoristaApontamento = motoristaId ? await consultarUm<{ ajudante_padrao_motorista_id: number | null }>(
    `SELECT ajudante_padrao_motorista_id
    FROM frota_motoristas
    WHERE id = $1
      AND excluido = FALSE`,
    [motoristaId]
  ) : null;

  const registro = await consultarUm(
    `INSERT INTO frota_apontamentos_km (
      id,
      empresa_id,
      pedido_venda_id,
      sem_pedido,
      motivo_sem_pedido_id,
      motorista_id,
      veiculo_id,
      departamento_id,
      data_apontamento,
      km_inicial,
      km_final,
      ajudante_motorista_id,
      ajudante_motorista2_id,
      ajudante,
      manha_inicio,
      manha_fim,
      tarde_inicio,
      tarde_fim,
      noite_inicio,
      noite_fim,
      observacao,
      usuario_inclusao_id
    )
    VALUES (
      COALESCE($1::BIGINT, NEXTVAL('frota_apontamentos_km_id_seq')),
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9::DATE,
      COALESCE($10::NUMERIC, 0),
      COALESCE($11::NUMERIC, 0),
      $12,
      $13,
      NULLIF($14, ''),
      $15::TIME,
      $16::TIME,
      $17::TIME,
      $18::TIME,
      $19::TIME,
      $20::TIME,
      NULLIF($21, ''),
      $22
    )
    ON CONFLICT (id) DO UPDATE SET
      pedido_venda_id = EXCLUDED.pedido_venda_id,
      sem_pedido = EXCLUDED.sem_pedido,
      motivo_sem_pedido_id = EXCLUDED.motivo_sem_pedido_id,
      motorista_id = EXCLUDED.motorista_id,
      veiculo_id = EXCLUDED.veiculo_id,
      departamento_id = EXCLUDED.departamento_id,
      data_apontamento = EXCLUDED.data_apontamento,
      km_inicial = EXCLUDED.km_inicial,
      km_final = EXCLUDED.km_final,
      ajudante_motorista_id = EXCLUDED.ajudante_motorista_id,
      ajudante_motorista2_id = EXCLUDED.ajudante_motorista2_id,
      ajudante = EXCLUDED.ajudante,
      manha_inicio = EXCLUDED.manha_inicio,
      manha_fim = EXCLUDED.manha_fim,
      tarde_inicio = EXCLUDED.tarde_inicio,
      tarde_fim = EXCLUDED.tarde_fim,
      noite_inicio = EXCLUDED.noite_inicio,
      noite_fim = EXCLUDED.noite_fim,
      observacao = EXCLUDED.observacao,
      usuario_ultima_alteracao_id = $22,
      data_hora_ultima_alteracao = NOW()
    RETURNING *`,
    [
      id,
      empresaId,
      semPedido ? null : Number(dados.pedido_venda_id),
      semPedido,
      dados.motivo_sem_pedido_id ? Number(dados.motivo_sem_pedido_id) : null,
      motoristaId,
      dados.veiculo_id ? Number(dados.veiculo_id) : null,
      dados.departamento_id ? Number(dados.departamento_id) : null,
      dataApontamento,
      kmInicial,
      Math.trunc(kmFinal),
      ajudanteMotoristaId,
      ajudanteMotorista2Id,
      dados.ajudante ?? null,
      horaTexto(dados.manha_inicio),
      horaTexto(dados.manha_fim),
      horaTexto(dados.tarde_inicio),
      horaTexto(dados.tarde_fim),
      horaTexto(dados.noite_inicio),
      horaTexto(dados.noite_fim),
      [dados.observacao, avisoOdometro].filter(Boolean).join('\n') || null,
      usuarioId
    ]
  );

  if (dados.veiculo_id && kmFinal > 0) {
    await consultar(
      `UPDATE frota_veiculos
      SET odometro_atual = GREATEST(odometro_atual, $1::NUMERIC),
        alterado_em = NOW(),
        alterado_por_usuario_id = $2
      WHERE id = $3`,
      [kmFinal, usuarioId, Number(dados.veiculo_id)]
    );
  }

  if (motoristaId && ajudanteMotoristaId && (!motoristaApontamento?.ajudante_padrao_motorista_id || dados.atualizar_ajudante_padrao === true)) {
    await consultar(
      `UPDATE frota_motoristas
      SET ajudante_padrao_motorista_id = $1,
        ajudante_padrao = (
          SELECT nome
          FROM frota_motoristas
          WHERE id = $1
        ),
        alterado_em = NOW(),
        alterado_por_usuario_id = $2
      WHERE id = $3
        AND excluido = FALSE`,
      [ajudanteMotoristaId, usuarioId, motoristaId]
    );
  }

  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: id ? 'ALTERACAO_APONTAMENTO_KM' : 'INCLUSAO_APONTAMENTO_KM', tabelaAfetada: 'frota_apontamentos_km', registroId: registro?.id, valorPosterior: registro });
  return registro;
}

export async function excluirApontamentoKmFrota(empresaId: number, id: number, usuarioId: number) {
  const apontamento = await consultarUm<{ id: number; validado: boolean; integrado: boolean }>(
    `SELECT id, validado, integrado
    FROM frota_apontamentos_km
    WHERE empresa_id = $1
      AND id = $2
      AND excluido = FALSE`,
    [empresaId, id]
  );
  if (!apontamento) {
    throw new Error('Apontamento de KM nao encontrado.');
  }
  if (apontamento.validado) {
    throw new Error('Apontamento de KM validado nao pode ser excluido. Remova a validacao antes de excluir.');
  }
  if (apontamento.integrado) {
    throw new Error('Apontamento de KM integrado nao pode ser excluido.');
  }

  const registro = await consultarUm(
    `UPDATE frota_apontamentos_km
    SET excluido = TRUE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $3::BIGINT,
      usuario_ultima_alteracao_id = $3::BIGINT,
      data_hora_ultima_alteracao = NOW()
    WHERE empresa_id = $1
      AND id = $2
      AND validado = FALSE
      AND integrado = FALSE
      AND excluido = FALSE
    RETURNING id`,
    [empresaId, id, usuarioId]
  );
  if (!registro) {
    throw new Error('Nao foi possivel excluir o apontamento de KM.');
  }
  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'EXCLUSAO_APONTAMENTO_KM', tabelaAfetada: 'frota_apontamentos_km', registroId: id, valorPosterior: { excluido: true } });
  return registro;
}

export async function validarApontamentosKmFrota(empresaId: number, ids: number[], validado: boolean, usuarioId: number) {
  const registros = await consultar<any>(
    `SELECT
      a.id,
      a.integrado,
      a.cancelado,
      a.manha_inicio,
      a.manha_fim,
      a.tarde_inicio,
      a.tarde_fim,
      a.noite_inicio,
      a.noite_fim,
      a.sem_pedido,
      p.pedido,
      p.codigo_coordenador_decis,
      d.codigo_origem_decis,
      COALESCE(coord_pedido.id, coord_padrao.id) AS coordenador_motorista_id
    FROM frota_apontamentos_km a
    LEFT JOIN frota_pedidos_venda p ON p.id = a.pedido_venda_id
    LEFT JOIN frota_departamentos d ON d.id = a.departamento_id
    LEFT JOIN frota_motoristas m ON m.id = a.motorista_id
    LEFT JOIN frota_motoristas coord_pedido ON coord_pedido.coordenador = TRUE AND coord_pedido.usuario_id IS NOT NULL AND coord_pedido.codigo_coordenador_decis = p.codigo_coordenador_decis AND coord_pedido.excluido = FALSE
    LEFT JOIN frota_motoristas coord_padrao ON coord_padrao.id = m.coordenador_padrao_motorista_id AND coord_padrao.coordenador = TRUE AND coord_padrao.usuario_id IS NOT NULL AND coord_padrao.excluido = FALSE
    WHERE a.empresa_id = $1
      AND a.id = ANY($2::BIGINT[])
      AND a.excluido = FALSE`,
    [empresaId, ids]
  );
  const integrados = registros.filter((item) => item.integrado);
  if (integrados.length) {
    throw new Error(`Apontamento integrado nao pode ser alterado: ${integrados.map((item) => item.id).join(', ')}.`);
  }
  if (validado) {
    const cancelados = registros.filter((item) => item.cancelado);
    if (cancelados.length) {
      throw new Error(`Apontamento cancelado nao pode ser validado: ${cancelados.map((item) => item.id).join(', ')}.`);
    }
    const turnosIncompletos = registros.filter((item) =>
      (Boolean(item.manha_inicio) !== Boolean(item.manha_fim))
      || (Boolean(item.tarde_inicio) !== Boolean(item.tarde_fim))
      || (Boolean(item.noite_inicio) !== Boolean(item.noite_fim))
    );
    if (turnosIncompletos.length) {
      throw new Error(`Complete inicio e fim dos turnos antes de validar os apontamentos: ${turnosIncompletos.map((item) => item.id).join(', ')}.`);
    }
    const semCoordenador = registros.filter((item) => !item.sem_pedido && !item.coordenador_motorista_id);
    if (semCoordenador.length) {
      throw new Error(`Vincule o coordenador Decis antes de validar os pedidos: ${semCoordenador.map((item) => item.pedido).join(', ')}.`);
    }
    const semOrigem = registros.filter((item) => !item.codigo_origem_decis);
    if (semOrigem.length) {
      throw new Error(`Informe Codigo Origem Decis no departamento antes de validar: ${semOrigem.map((item) => item.pedido).join(', ')}.`);
    }
  }
  await consultar(
    `UPDATE frota_apontamentos_km
    SET validado = $3::BOOLEAN,
      usuario_validacao_id = CASE WHEN $3::BOOLEAN THEN $4::BIGINT ELSE NULL::BIGINT END,
      data_hora_validacao = CASE WHEN $3::BOOLEAN THEN NOW() ELSE NULL END,
      usuario_ultima_alteracao_id = $4::BIGINT,
      data_hora_ultima_alteracao = NOW()
    WHERE empresa_id = $1
      AND id = ANY($2::BIGINT[])
      AND integrado = FALSE
      AND excluido = FALSE`,
    [empresaId, ids, validado, usuarioId]
  );
  for (const id of ids) {
    await registrarHistoricoFrota({ empresaId, usuarioId, operacao: validado ? 'VALIDACAO_APONTAMENTO_KM' : 'REMOCAO_VALIDACAO_APONTAMENTO_KM', tabelaAfetada: 'frota_apontamentos_km', registroId: id, valorPosterior: { validado } });
  }
  return { processados: ids.length, validado };
}

export async function cancelarApontamentosKmFrota(empresaId: number, ids: number[], motivoId: number, observacao: string | null, usuarioId: number) {
  const integrados = await consultar<any>(
    `SELECT id
    FROM frota_apontamentos_km
    WHERE empresa_id = $1
      AND id = ANY($2::BIGINT[])
      AND integrado = TRUE
      AND excluido = FALSE`,
    [empresaId, ids]
  );
  if (integrados.length) {
    throw new Error(`Apontamento integrado nao pode ser cancelado: ${integrados.map((item) => item.id).join(', ')}.`);
  }
  await consultar(
    `UPDATE frota_apontamentos_km
    SET cancelado = TRUE,
      motivo_cancelamento_id = $3::BIGINT,
      motivo_cancelamento_texto = NULLIF($4, ''),
      usuario_cancelamento_id = $5::BIGINT,
      data_hora_cancelamento = NOW(),
      validado = FALSE,
      usuario_validacao_id = NULL,
      data_hora_validacao = NULL,
      usuario_ultima_alteracao_id = $5::BIGINT,
      data_hora_ultima_alteracao = NOW()
    WHERE empresa_id = $1
      AND id = ANY($2::BIGINT[])
      AND integrado = FALSE
      AND excluido = FALSE`,
    [empresaId, ids, motivoId, observacao ?? null, usuarioId]
  );
  for (const id of ids) {
    await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'CANCELAMENTO_APONTAMENTO_KM', tabelaAfetada: 'frota_apontamentos_km', registroId: id, valorPosterior: { motivoId, observacao } });
  }
  return { processados: ids.length, cancelado: true };
}

export async function listarConfiguracoesFrota(empresaId: number): Promise<Record<string, unknown>> {
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
  return {
    dia_inicio_periodo_km: 26,
    dia_fim_periodo_km: 25,
    email_padrao_motorista: '',
    perfil_padrao_motorista_id: null,
    ...(config?.valor ?? {})
  };
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
    'frota_motivos_cancelamento',
    'frota_pedidos_venda'
  ]);
  if (!tabelasPermitidas.has(tabela)) throw new Error('Tabela nao permitida para exclusao.');
  const resultado = await consultarUm(
    `UPDATE ${tabela}
    SET excluido = TRUE,
      ativo = FALSE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $2
    WHERE id = $1
      AND excluido = FALSE
    RETURNING id`,
    [id, usuarioId]
  );
  if (!resultado) {
    throw new Error('Registro nao encontrado ou ja excluido.');
  }
  await registrarHistoricoFrota({ empresaId, usuarioId, operacao: 'EXCLUSAO', tabelaAfetada: tabela, registroId: id, valorPosterior: resultado });
  return resultado;
}
