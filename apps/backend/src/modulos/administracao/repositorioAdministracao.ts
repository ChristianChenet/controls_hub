import { consultar, consultarUm } from '../../banco/conexao.js';

export type UsuarioBanco = {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  administrador: boolean;
  superadmin: boolean;
  ativo: boolean;
  preferencias_interface?: Record<string, unknown> | null;
};

export type EmpresaUsuarioBanco = {
  id: number;
  codigo_empresa: string;
  razao_social: string;
  nome_fantasia: string;
  nome_exibido: string | null;
  caminho_logo: string | null;
  caminho_imagem_fundo: string | null;
  dominio_publico: string | null;
  padrao: boolean;
};

export type EmpresaCadastro = {
  codigo_empresa: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj?: string | null;
  dominio_publico?: string | null;
  nome_exibido?: string | null;
  caminho_logo?: string | null;
  caminho_imagem_fundo?: string | null;
  ativa?: boolean;
};

export type PerfilCadastro = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  administrador?: boolean;
  ativo?: boolean;
};

export type UsuarioCadastro = {
  perfil_id?: number | null;
  nome: string;
  email: string;
  senha?: string;
  ativo?: boolean;
  administrador?: boolean;
  superadmin?: boolean;
  empresas_ids?: number[];
  empresa_padrao_id?: number;
  configuracao_email_padrao_id?: number | null;
};

export async function buscarUsuarioPorEmail(email: string) {
  return consultarUm<UsuarioBanco>(
    `SELECT
      id,
      nome,
      email,
      senha_hash,
      administrador,
      superadmin,
      ativo,
      preferencias_interface
    FROM usuarios
    WHERE LOWER(email) = LOWER($1)
      AND ativo = TRUE
      AND excluido = FALSE`,
    [email]
  );
}

export async function verificarSenhaUsuario(usuarioId: number, senha: string) {
  const resultado = await consultarUm<{ valida: boolean }>(
    `SELECT
      senha_hash = CRYPT($1, senha_hash) AS valida
    FROM usuarios
    WHERE id = $2
      AND ativo = TRUE
      AND excluido = FALSE`,
    [senha, usuarioId]
  );

  return Boolean(resultado?.valida);
}

export async function listarEmpresasDoUsuario(usuarioId: number) {
  return consultar<EmpresaUsuarioBanco>(
    `SELECT
      e.id,
      e.codigo_empresa,
      e.razao_social,
      e.nome_fantasia,
      e.nome_exibido,
      e.caminho_logo,
      e.caminho_imagem_fundo,
      e.dominio_publico,
      ue.padrao
    FROM usuarios_empresas ue
    INNER JOIN empresas e ON e.id = ue.empresa_id
    WHERE ue.usuario_id = $1
      AND ue.ativo = TRUE
      AND e.ativa = TRUE
      AND e.excluido = FALSE
    ORDER BY ue.padrao DESC, e.nome_fantasia ASC`,
    [usuarioId]
  );
}

export async function listarCodigosPermissaoUsuario(usuarioId: number, empresaId: number) {
  const usuario = await consultarUm<{ superadmin: boolean; administrador: boolean; perfil_id: number | null }>(
    `SELECT
      superadmin,
      administrador,
      perfil_id
    FROM usuarios
    WHERE id = $1`,
    [usuarioId]
  );

  if (usuario?.superadmin || usuario?.administrador) {
    const acoes = await consultar<{ codigo: string }>(
      `SELECT codigo
      FROM acoes
      WHERE ativo = TRUE`
    );
    return acoes.map((acao) => acao.codigo);
  }

  if (!usuario?.perfil_id) {
    return [];
  }

  const permissoes = await consultar<{ codigo: string }>(
    `SELECT DISTINCT a.codigo
    FROM perfis_permissoes pp
    INNER JOIN acoes a ON a.id = pp.acao_id
    WHERE pp.perfil_id = $1
      AND (pp.empresa_id = $2 OR pp.empresa_id IS NULL)
      AND pp.permitido = TRUE
      AND a.ativo = TRUE`,
    [usuario.perfil_id, empresaId]
  );

  return permissoes.map((permissao) => permissao.codigo);
}

export async function listarTelasFonte() {
  return consultar(
    `SELECT
      codigo,
      nome,
      rota,
      arquivo_fonte,
      componentes_principais,
      endpoints_usados,
      tabelas_principais,
      rotinas_relacionadas
    FROM telas
    WHERE ativo = TRUE
    ORDER BY nome ASC`
  );
}

export async function obterPreferenciasInterfaceUsuario(usuarioId: number) {
  const usuario = await consultarUm<{ preferencias_interface: Record<string, unknown> | null }>(
    `SELECT
      preferencias_interface
    FROM usuarios
    WHERE id = $1
      AND excluido = FALSE`,
    [usuarioId]
  );

  return usuario?.preferencias_interface ?? {};
}

export async function salvarPreferenciasInterfaceUsuario(usuarioId: number, preferencias: Record<string, unknown>) {
  return consultarUm<{ preferencias_interface: Record<string, unknown> }>(
    `UPDATE usuarios
    SET preferencias_interface = COALESCE(preferencias_interface, '{}'::JSONB) || $2::JSONB,
      alterado_em = NOW(),
      alterado_por_usuario_id = $1
    WHERE id = $1
      AND excluido = FALSE
    RETURNING preferencias_interface`,
    [usuarioId, JSON.stringify(preferencias)]
  );
}

export async function listarEmpresasAdministracao() {
  return consultar(
    `SELECT
      id,
      codigo_empresa,
      razao_social,
      nome_fantasia,
      cnpj,
      dominio_publico,
      nome_exibido,
      caminho_logo,
      caminho_imagem_fundo,
      ativa
    FROM empresas
    WHERE excluido = FALSE
    ORDER BY nome_fantasia ASC`
  );
}

export async function salvarEmpresa(dados: EmpresaCadastro, usuarioId: number) {
  return consultarUm(
    `INSERT INTO empresas (
      codigo_empresa,
      razao_social,
      nome_fantasia,
      cnpj,
      dominio_publico,
      nome_exibido,
      caminho_logo,
      caminho_imagem_fundo,
      ativa,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, TRUE), $10)
    ON CONFLICT (codigo_empresa) DO UPDATE SET
      razao_social = EXCLUDED.razao_social,
      nome_fantasia = EXCLUDED.nome_fantasia,
      cnpj = EXCLUDED.cnpj,
      dominio_publico = EXCLUDED.dominio_publico,
      nome_exibido = EXCLUDED.nome_exibido,
      caminho_logo = EXCLUDED.caminho_logo,
      caminho_imagem_fundo = EXCLUDED.caminho_imagem_fundo,
      ativa = EXCLUDED.ativa,
      alterado_em = NOW(),
      alterado_por_usuario_id = $10
    RETURNING *`,
    [
      dados.codigo_empresa,
      dados.razao_social,
      dados.nome_fantasia,
      dados.cnpj ?? null,
      dados.dominio_publico ?? null,
      dados.nome_exibido ?? dados.nome_fantasia,
      dados.caminho_logo ?? null,
      dados.caminho_imagem_fundo ?? null,
      dados.ativa ?? true,
      usuarioId
    ]
  );
}

export async function excluirEmpresa(empresaId: number, usuarioId: number) {
  return consultarUm(
    `UPDATE empresas
    SET excluido = TRUE,
      ativa = FALSE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $2
    WHERE id = $1
    RETURNING id`,
    [empresaId, usuarioId]
  );
}

export async function listarPerfisAdministracao() {
  return consultar(
    `SELECT
      id,
      codigo,
      nome,
      descricao,
      administrador,
      ativo
    FROM perfis
    WHERE excluido = FALSE
    ORDER BY nome ASC`
  );
}

export async function salvarPerfil(dados: PerfilCadastro, usuarioId: number) {
  return consultarUm(
    `INSERT INTO perfis (
      codigo,
      nome,
      descricao,
      administrador,
      ativo,
      criado_por_usuario_id
    )
    VALUES ($1, $2, $3, COALESCE($4, FALSE), COALESCE($5, TRUE), $6)
    ON CONFLICT (codigo) DO UPDATE SET
      nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      administrador = EXCLUDED.administrador,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW(),
      alterado_por_usuario_id = $6
    RETURNING *`,
    [
      dados.codigo,
      dados.nome,
      dados.descricao ?? null,
      dados.administrador ?? false,
      dados.ativo ?? true,
      usuarioId
    ]
  );
}

export async function excluirPerfil(perfilId: number, usuarioId: number) {
  return consultarUm(
    `UPDATE perfis
    SET excluido = TRUE,
      ativo = FALSE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $2
    WHERE id = $1
    RETURNING id`,
    [perfilId, usuarioId]
  );
}

export async function listarUsuariosAdministracao() {
  return consultar(
    `SELECT
      u.id,
      u.nome,
      u.email,
      u.ativo,
      u.administrador,
      u.superadmin,
      u.configuracao_email_padrao_id,
      u.ultimo_acesso_em,
      p.nome AS perfil_nome
    FROM usuarios u
    LEFT JOIN perfis p ON p.id = u.perfil_id
    WHERE u.excluido = FALSE
    ORDER BY u.nome ASC`
  );
}

export async function salvarUsuario(dados: UsuarioCadastro, usuarioId: number) {
  const usuario = await consultarUm<{ id: number }>(
    `INSERT INTO usuarios (
      perfil_id,
      nome,
      email,
      senha_hash,
      ativo,
      administrador,
      superadmin,
      configuracao_email_padrao_id,
      criado_por_usuario_id
    )
    VALUES ($1, $2, LOWER($3), CRYPT(COALESCE($4, 'controls'), GEN_SALT('bf')), COALESCE($5, TRUE), COALESCE($6, FALSE), COALESCE($7, FALSE), $8, $9)
    ON CONFLICT (email) DO UPDATE SET
      perfil_id = EXCLUDED.perfil_id,
      nome = EXCLUDED.nome,
      ativo = EXCLUDED.ativo,
      administrador = EXCLUDED.administrador,
      superadmin = EXCLUDED.superadmin,
      configuracao_email_padrao_id = EXCLUDED.configuracao_email_padrao_id,
      alterado_em = NOW(),
      alterado_por_usuario_id = $9
    RETURNING id`,
    [
      dados.perfil_id ?? null,
      dados.nome,
      dados.email,
      dados.senha ?? null,
      dados.ativo ?? true,
      dados.administrador ?? false,
      dados.superadmin ?? false,
      dados.configuracao_email_padrao_id ?? null,
      usuarioId
    ]
  );

  const empresasIds = dados.empresas_ids?.length ? dados.empresas_ids : dados.empresa_padrao_id ? [dados.empresa_padrao_id] : [];

  if (usuario && empresasIds.length) {
    await consultar(
      `DELETE FROM usuarios_empresas
      WHERE usuario_id = $1`,
      [usuario.id]
    );

    for (const [indice, empresaId] of empresasIds.entries()) {
      await consultar(
        `INSERT INTO usuarios_empresas (usuario_id, empresa_id, padrao, ativo)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (usuario_id, empresa_id) DO UPDATE SET
          padrao = EXCLUDED.padrao,
          ativo = TRUE`,
        [usuario.id, empresaId, indice === 0]
      );
    }
  }

  return usuario;
}

export async function excluirUsuario(usuarioExcluidoId: number, usuarioId: number) {
  return consultarUm(
    `UPDATE usuarios
    SET excluido = TRUE,
      ativo = FALSE,
      excluido_em = NOW(),
      excluido_por_usuario_id = $2
    WHERE id = $1
    RETURNING id`,
    [usuarioExcluidoId, usuarioId]
  );
}

export async function listarAcoesPermissao() {
  return consultar(
    `SELECT
      id,
      codigo,
      nome,
      descricao
    FROM acoes
    WHERE ativo = TRUE
    ORDER BY nome ASC`
  );
}

export async function listarPermissoesPerfil(perfilId: number, empresaId: number) {
  return consultar(
    `SELECT
      'MODULO' AS tipo,
      m.id AS referencia_id,
      m.codigo,
      m.nome,
      NULL::TEXT AS modulo_codigo,
      NULL::TEXT AS menu_codigo,
      EXISTS (
        SELECT 1
        FROM perfis_permissoes pp
        WHERE pp.perfil_id = $1
          AND (pp.empresa_id = $2 OR pp.empresa_id IS NULL)
          AND pp.modulo_id = m.id
          AND pp.menu_id IS NULL
          AND pp.acao_id IS NULL
          AND pp.permitido = TRUE
      ) AS permitido
    FROM modulos m
    WHERE m.ativo = TRUE

    UNION ALL

    SELECT
      'MENU' AS tipo,
      me.id AS referencia_id,
      me.codigo,
      me.nome,
      m.codigo AS modulo_codigo,
      NULL::TEXT AS menu_codigo,
      EXISTS (
        SELECT 1
        FROM perfis_permissoes pp
        WHERE pp.perfil_id = $1
          AND (pp.empresa_id = $2 OR pp.empresa_id IS NULL)
          AND pp.menu_id = me.id
          AND pp.acao_id IS NULL
          AND pp.permitido = TRUE
      ) AS permitido
    FROM menus me
    INNER JOIN modulos m ON m.id = me.modulo_id
    WHERE me.ativo = TRUE

    UNION ALL

    SELECT
      'ACAO' AS tipo,
      a.id AS referencia_id,
      a.codigo,
      a.nome,
      NULL::TEXT AS modulo_codigo,
      NULL::TEXT AS menu_codigo,
      EXISTS (
        SELECT 1
        FROM perfis_permissoes pp
        WHERE pp.perfil_id = $1
          AND (pp.empresa_id = $2 OR pp.empresa_id IS NULL)
          AND pp.acao_id = a.id
          AND pp.permitido = TRUE
      ) AS permitido
    FROM acoes a
    WHERE a.ativo = TRUE
    ORDER BY tipo DESC, modulo_codigo NULLS FIRST, menu_codigo NULLS FIRST, nome ASC`,
    [perfilId, empresaId]
  );
}

export async function salvarPermissoesPerfil(dados: {
  perfilId: number;
  empresaId: number;
  acoesIds?: number[];
  itens?: { tipo: string; referencia_id: number }[];
}) {
  await consultar(
    `DELETE FROM perfis_permissoes
    WHERE perfil_id = $1
      AND empresa_id = $2`,
    [dados.perfilId, dados.empresaId]
  );

  const itens = dados.itens?.length
    ? dados.itens
    : (dados.acoesIds ?? []).map((acaoId) => ({ tipo: 'ACAO', referencia_id: acaoId }));

  for (const item of itens) {
    const moduloId = item.tipo === 'MODULO' ? item.referencia_id : null;
    const menuId = item.tipo === 'MENU' ? item.referencia_id : null;
    const acaoId = item.tipo === 'ACAO' ? item.referencia_id : null;

    await consultar(
      `INSERT INTO perfis_permissoes (
        perfil_id,
        empresa_id,
        modulo_id,
        menu_id,
        acao_id,
        permitido
      )
      VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [dados.perfilId, dados.empresaId, moduloId, menuId, acaoId]
    );
  }
}

export async function listarParametrosSistema() {
  return consultar(
    `SELECT
      chave,
      valor,
      descricao,
      sensivel
    FROM parametros_sistema
    WHERE sensivel = FALSE
    ORDER BY chave ASC`
  );
}

export async function salvarParametroSistema(chave: string, valor: string) {
  return consultarUm(
    `INSERT INTO parametros_sistema (
      chave,
      valor,
      sensivel
    )
    VALUES ($1, $2, FALSE)
    ON CONFLICT (chave) DO UPDATE SET
      valor = EXCLUDED.valor,
      alterado_em = NOW()
    RETURNING chave, valor, descricao, sensivel`,
    [chave, valor]
  );
}

export async function obterValorParametroSistema(chave: string, valorPadrao: string) {
  const parametro = await consultarUm<{ valor: string }>(
    `SELECT valor
    FROM parametros_sistema
    WHERE chave = $1`,
    [chave]
  );

  return parametro?.valor ?? valorPadrao;
}

async function garantirEstruturaMotivosEscolhaTransportadora() {
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
    `INSERT INTO motivos_escolha_transportadora (
      codigo,
      descricao,
      padrao_transportadora_pedido,
      ativo
    )
    VALUES (
      'TRANSPORTADORA_DEFINIDA_NO_PEDIDO',
      'Transportadora definida no pedido/origem comercial',
      TRUE,
      TRUE
    )
    ON CONFLICT (codigo) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      padrao_transportadora_pedido = TRUE,
      ativo = TRUE,
      alterado_em = NOW()`
  );
}

export async function listarOrigensComerciaisCotacao() {
  return consultar<{ origem_comercial: string }>(
    `SELECT DISTINCT origem_comercial
    FROM cotacoes_frete
    WHERE origem_comercial IS NOT NULL
      AND TRIM(origem_comercial) <> ''
    ORDER BY origem_comercial ASC`
  );
}

export async function listarMotivosEscolhaTransportadora() {
  await garantirEstruturaMotivosEscolhaTransportadora();

  return consultar(
    `SELECT
      id,
      codigo,
      descricao,
      padrao_transportadora_pedido,
      ativo
    FROM motivos_escolha_transportadora
    ORDER BY ativo DESC, descricao ASC`
  );
}

export async function salvarMotivoEscolhaTransportadora(dados: {
  id?: number | null;
  codigo?: string | null;
  descricao: string;
  padrao_transportadora_pedido?: boolean;
  ativo?: boolean;
}) {
  await garantirEstruturaMotivosEscolhaTransportadora();

  const codigo = String(dados.codigo ?? dados.descricao)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return consultarUm(
    `INSERT INTO motivos_escolha_transportadora (
      id,
      codigo,
      descricao,
      padrao_transportadora_pedido,
      ativo
    )
    VALUES (COALESCE($1, NEXTVAL(PG_GET_SERIAL_SEQUENCE('motivos_escolha_transportadora', 'id'))), $2, $3, COALESCE($4, FALSE), COALESCE($5, TRUE))
    ON CONFLICT (codigo) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      padrao_transportadora_pedido = EXCLUDED.padrao_transportadora_pedido,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW()
    RETURNING *`,
    [
      dados.id ?? null,
      codigo,
      dados.descricao,
      dados.padrao_transportadora_pedido ?? false,
      dados.ativo ?? true
    ]
  );
}

export async function registrarAuditoria(dados: {
  empresaId?: number | null;
  usuarioId?: number | null;
  moduloCodigo?: string | null;
  telaCodigo?: string | null;
  tipoEvento: string;
  tabelaAfetada?: string | null;
  registroId?: number | null;
  descricao: string;
  dadosNovos?: unknown;
}) {
  await consultar(
    `INSERT INTO auditorias (
      empresa_id,
      usuario_id,
      modulo_codigo,
      tela_codigo,
      tipo_evento,
      tabela_afetada,
      registro_id,
      descricao,
      dados_novos
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::JSONB)`,
    [
      dados.empresaId ?? null,
      dados.usuarioId ?? null,
      dados.moduloCodigo ?? null,
      dados.telaCodigo ?? null,
      dados.tipoEvento,
      dados.tabelaAfetada ?? null,
      dados.registroId ?? null,
      dados.descricao,
      dados.dadosNovos ? JSON.stringify(dados.dadosNovos) : null
    ]
  );
}

export async function listarAuditorias(empresaId: number) {
  return consultar(
    `SELECT
      a.id,
      a.tipo_evento,
      a.modulo_codigo,
      a.tela_codigo,
      a.tabela_afetada,
      a.registro_id,
      a.descricao,
      a.criado_em,
      u.nome AS usuario_nome
    FROM auditorias a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    WHERE (a.empresa_id = $1 OR a.empresa_id IS NULL)
    ORDER BY a.criado_em DESC
    LIMIT 200`,
    [empresaId]
  );
}
