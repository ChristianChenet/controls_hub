import { ambiente } from '../../configuracao/ambiente.js';
import { consultar, consultarUm } from '../../banco/conexao.js';

export type ConfiguracaoEmailUsuario = {
  descricao?: string | null;
  empresa_id?: number | null;
  nome_remetente: string;
  email_remetente: string;
  servidor_smtp: string;
  porta_smtp: number;
  usuario_smtp?: string | null;
  senha_smtp?: string | null;
  seguranca?: string | null;
  email_resposta?: string | null;
  assinatura_html?: string | null;
  modelo_email_transportadora?: string | null;
  permite_envio_cotacao?: boolean;
  padrao?: boolean;
  ativo?: boolean;
};

async function garantirModeloEmailTransportadora() {
  // Mantem compatibilidade com servidores que ainda nao executaram a migration 023.
  await consultar(
    `ALTER TABLE usuarios_configuracoes_email
    ADD COLUMN IF NOT EXISTS modelo_email_transportadora TEXT`
  );
}

export async function obterConfiguracaoEmailUsuario(usuarioId: number, incluirSenha = false) {
  await garantirModeloEmailTransportadora();
  return consultarUm(
    `SELECT
      id,
      usuario_id,
      descricao,
      empresa_id,
      nome_remetente,
      email_remetente,
      servidor_smtp,
      porta_smtp,
      usuario_smtp,
      ${incluirSenha ? 'PGP_SYM_DECRYPT(senha_smtp_criptografada, $2)' : 'NULL'} AS senha_smtp,
      seguranca,
      email_resposta,
      assinatura_html,
      modelo_email_transportadora,
      permite_envio_cotacao,
      padrao,
      ativo,
      teste_status,
      teste_mensagem,
      testado_em
    FROM usuarios_configuracoes_email
    WHERE usuario_id = $1`,
    incluirSenha ? [usuarioId, ambiente.segredoJwt] : [usuarioId]
  );
}

export async function obterConfiguracaoEmailPorId(configuracaoId: number, incluirSenha = false) {
  await garantirModeloEmailTransportadora();
  return consultarUm(
    `SELECT
      id,
      usuario_id,
      descricao,
      empresa_id,
      nome_remetente,
      email_remetente,
      servidor_smtp,
      porta_smtp,
      usuario_smtp,
      ${incluirSenha ? 'PGP_SYM_DECRYPT(senha_smtp_criptografada, $2)' : 'NULL'} AS senha_smtp,
      seguranca,
      email_resposta,
      assinatura_html,
      modelo_email_transportadora,
      permite_envio_cotacao,
      padrao,
      ativo,
      teste_status,
      teste_mensagem,
      testado_em
    FROM usuarios_configuracoes_email
    WHERE id = $1`,
    incluirSenha ? [configuracaoId, ambiente.segredoJwt] : [configuracaoId]
  );
}

export async function listarConfiguracoesEmailAdministracao() {
  await garantirModeloEmailTransportadora();
  return consultar(
    `SELECT
      ce.id,
      ce.usuario_id,
      u.nome AS usuario_nome,
      ce.descricao,
      ce.empresa_id,
      e.nome_fantasia AS empresa_nome,
      ce.nome_remetente,
      ce.email_remetente,
      ce.servidor_smtp,
      ce.porta_smtp,
      ce.usuario_smtp,
      ce.seguranca,
      ce.email_resposta,
      ce.assinatura_html,
      ce.modelo_email_transportadora,
      ce.permite_envio_cotacao,
      ce.padrao,
      ce.ativo,
      ce.teste_status,
      ce.teste_mensagem,
      ce.testado_em
    FROM usuarios_configuracoes_email ce
    INNER JOIN usuarios u ON u.id = ce.usuario_id
    LEFT JOIN empresas e ON e.id = ce.empresa_id
    WHERE u.excluido = FALSE
    ORDER BY ce.padrao DESC, u.nome ASC`
  );
}

export async function salvarConfiguracaoEmailUsuario(usuarioId: number, dados: ConfiguracaoEmailUsuario) {
  await garantirModeloEmailTransportadora();
  return consultarUm(
    `INSERT INTO usuarios_configuracoes_email (
      usuario_id,
      descricao,
      empresa_id,
      nome_remetente,
      email_remetente,
      servidor_smtp,
      porta_smtp,
      usuario_smtp,
      senha_smtp_criptografada,
      seguranca,
      email_resposta,
      assinatura_html,
      modelo_email_transportadora,
      permite_envio_cotacao,
      padrao,
      ativo
    )
    VALUES ($1, $2, $3, $4, LOWER($5), $6, $7, $8, PGP_SYM_ENCRYPT(COALESCE($9, ''), $17), $10, LOWER($11), $12, $13, COALESCE($14, TRUE), COALESCE($15, FALSE), COALESCE($16, TRUE))
    ON CONFLICT (usuario_id) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      empresa_id = EXCLUDED.empresa_id,
      nome_remetente = EXCLUDED.nome_remetente,
      email_remetente = EXCLUDED.email_remetente,
      servidor_smtp = EXCLUDED.servidor_smtp,
      porta_smtp = EXCLUDED.porta_smtp,
      usuario_smtp = EXCLUDED.usuario_smtp,
      senha_smtp_criptografada = CASE
        WHEN COALESCE($9, '') = '' THEN usuarios_configuracoes_email.senha_smtp_criptografada
        ELSE EXCLUDED.senha_smtp_criptografada
      END,
      seguranca = EXCLUDED.seguranca,
      email_resposta = EXCLUDED.email_resposta,
      assinatura_html = EXCLUDED.assinatura_html,
      modelo_email_transportadora = EXCLUDED.modelo_email_transportadora,
      permite_envio_cotacao = EXCLUDED.permite_envio_cotacao,
      padrao = EXCLUDED.padrao,
      ativo = EXCLUDED.ativo,
      alterado_em = NOW()
    RETURNING
      id,
      usuario_id,
      descricao,
      empresa_id,
      nome_remetente,
      email_remetente,
      servidor_smtp,
      porta_smtp,
      usuario_smtp,
      seguranca,
      email_resposta,
      assinatura_html,
      modelo_email_transportadora,
      permite_envio_cotacao,
      padrao,
      ativo`,
    [
      usuarioId,
      dados.descricao ?? null,
      dados.empresa_id ?? null,
      dados.nome_remetente,
      dados.email_remetente,
      dados.servidor_smtp,
      dados.porta_smtp ?? 587,
      dados.usuario_smtp ?? null,
      dados.senha_smtp ?? null,
      dados.seguranca ?? 'STARTTLS',
      dados.email_resposta ?? null,
      dados.assinatura_html ?? null,
      dados.modelo_email_transportadora ?? null,
      dados.permite_envio_cotacao ?? true,
      dados.padrao ?? false,
      dados.ativo ?? true,
      ambiente.segredoJwt
    ]
  );
}

export async function registrarResultadoTesteEmail(usuarioId: number, status: string, mensagem: string) {
  return consultarUm(
    `UPDATE usuarios_configuracoes_email
    SET teste_status = $2,
      teste_mensagem = $3,
      testado_em = NOW(),
      alterado_em = NOW()
    WHERE usuario_id = $1
    RETURNING teste_status, teste_mensagem, testado_em`,
    [usuarioId, status, mensagem]
  );
}

export async function registrarResultadoTesteEmailPorId(configuracaoId: number, status: string, mensagem: string) {
  return consultarUm(
    `UPDATE usuarios_configuracoes_email
    SET teste_status = $2,
      teste_mensagem = $3,
      testado_em = NOW(),
      alterado_em = NOW()
    WHERE id = $1
    RETURNING teste_status, teste_mensagem, testado_em`,
    [configuracaoId, status, mensagem]
  );
}

export async function listarUsuariosComEmailConfigurado() {
  return consultar(
    `SELECT
      u.id,
      u.nome,
      u.email,
      ce.email_remetente,
      ce.permite_envio_cotacao,
      ce.ativo
    FROM usuarios u
    LEFT JOIN usuarios_configuracoes_email ce ON ce.usuario_id = u.id
    WHERE u.excluido = FALSE
    ORDER BY u.nome ASC`
  );
}
