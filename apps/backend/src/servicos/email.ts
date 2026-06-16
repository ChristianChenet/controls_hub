import nodemailer from 'nodemailer';

type ConfiguracaoEnvioEmail = {
  nome_remetente: string;
  email_remetente: string;
  servidor_smtp: string;
  porta_smtp: number;
  usuario_smtp?: string | null;
  senha_smtp?: string | null;
  seguranca?: string | null;
  email_resposta?: string | null;
};

export type ResultadoTesteEmail = {
  sucesso: boolean;
  mensagem: string;
  detalhes: {
    servidor_smtp: string;
    porta_smtp: number;
    seguranca: string;
    usuario_informado: boolean;
    codigo?: string;
    comando?: string;
    resposta?: string;
    stack?: string;
  };
};

function normalizarSeguranca(seguranca?: string | null) {
  return String(seguranca ?? 'STARTTLS').trim().toUpperCase();
}

function criarTransporte(configuracao: ConfiguracaoEnvioEmail) {
  const seguranca = normalizarSeguranca(configuracao.seguranca);

  return nodemailer.createTransport({
    host: configuracao.servidor_smtp,
    port: Number(configuracao.porta_smtp),
    secure: seguranca === 'SSL' || seguranca === 'TLS',
    requireTLS: seguranca === 'STARTTLS',
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: configuracao.usuario_smtp
      ? {
          user: configuracao.usuario_smtp,
          pass: configuracao.senha_smtp ?? ''
        }
      : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });
}

function mensagemAmigavelErroEmail(error: any) {
  const codigo = String(error?.code ?? '').toUpperCase();
  const mensagem = String(error?.message ?? '');

  if (codigo === 'EAUTH') {
    return 'Falha de autenticacao SMTP. Verifique usuario, senha, senha de aplicativo e permissao de SMTP.';
  }

  if (codigo === 'ECONNECTION' || codigo === 'ETIMEDOUT' || mensagem.toLowerCase().includes('timeout')) {
    return 'Nao foi possivel conectar ao servidor SMTP. Verifique servidor, porta, firewall e seguranca SSL/TLS/STARTTLS.';
  }

  if (codigo === 'ESOCKET' || mensagem.toLowerCase().includes('certificate')) {
    return 'Falha de socket/certificado TLS ao conectar no SMTP. Verifique seguranca, porta e certificado do servidor.';
  }

  if (mensagem.toLowerCase().includes('invalid login')) {
    return 'Login SMTP invalido. Verifique usuario, senha e exigencia de senha de aplicativo.';
  }

  return mensagem || 'Falha desconhecida ao testar SMTP.';
}

export function detalharErroEmail(error: unknown, configuracao: ConfiguracaoEnvioEmail): ResultadoTesteEmail {
  const erro = error as any;
  const seguranca = normalizarSeguranca(configuracao.seguranca);

  return {
    sucesso: false,
    mensagem: mensagemAmigavelErroEmail(erro),
    detalhes: {
      servidor_smtp: configuracao.servidor_smtp,
      porta_smtp: Number(configuracao.porta_smtp),
      seguranca,
      usuario_informado: Boolean(configuracao.usuario_smtp),
      codigo: erro?.code ? String(erro.code) : undefined,
      comando: erro?.command ? String(erro.command) : undefined,
      resposta: erro?.response ? String(erro.response) : undefined,
      stack: erro?.stack ? String(erro.stack).split('\n').slice(0, 6).join('\n') : undefined
    }
  };
}

export async function testarConfiguracaoEmail(configuracao: ConfiguracaoEnvioEmail): Promise<ResultadoTesteEmail> {
  const seguranca = normalizarSeguranca(configuracao.seguranca);

  if (!configuracao.servidor_smtp?.trim()) {
    throw new Error('Servidor SMTP nao informado.');
  }

  if (!Number(configuracao.porta_smtp)) {
    throw new Error('Porta SMTP nao informada ou invalida.');
  }

  if (!configuracao.email_remetente?.trim()) {
    throw new Error('E-mail remetente nao informado.');
  }

  const transporte = criarTransporte(configuracao);
  await transporte.verify();

  return {
    sucesso: true,
    mensagem: 'Conexao SMTP validada com sucesso.',
    detalhes: {
      servidor_smtp: configuracao.servidor_smtp,
      porta_smtp: Number(configuracao.porta_smtp),
      seguranca,
      usuario_informado: Boolean(configuracao.usuario_smtp)
    }
  };
}

export async function enviarEmail(configuracao: ConfiguracaoEnvioEmail, dados: {
  para: string;
  assunto: string;
  html: string;
  texto?: string;
}) {
  const transporte = criarTransporte(configuracao);

  return transporte.sendMail({
    from: `"${configuracao.nome_remetente}" <${configuracao.email_remetente}>`,
    to: dados.para,
    replyTo: configuracao.email_resposta ?? configuracao.email_remetente,
    subject: dados.assunto,
    html: dados.html,
    text: dados.texto
  });
}
