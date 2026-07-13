import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { Socket } from 'node:net';
import { ambiente } from './configuracao/ambiente.js';
import { consultarUm } from './banco/conexao.js';
import { falha, sucesso } from './http/respostas.js';
import {
  buscarUsuarioPorEmail,
  excluirEmpresa,
  excluirPerfil,
  excluirUsuario,
  listarCodigosPermissaoUsuario,
  listarAcoesPermissao,
  listarAuditorias,
  listarEmpresasAdministracao,
  listarEmpresasDoUsuario,
  listarPerfisAdministracao,
  listarPermissoesPerfil,
  listarParametrosSistema,
  listarMotivosEscolhaTransportadora,
  listarMotivosPrejuizoLogistico,
  listarOrigensComerciaisCotacao,
  listarTelasFonte,
  listarUsuariosAdministracao,
  obterPreferenciasInterfaceUsuario,
  obterValorParametroSistema,
  registrarAuditoria,
  salvarEmpresa,
  salvarParametroSistema,
  salvarMotivoEscolhaTransportadora,
  salvarMotivoPrejuizoCotacao,
  salvarMotivoPrejuizoLogistico,
  salvarPerfil,
  salvarPreferenciasInterfaceUsuario,
  salvarPermissoesPerfil,
  salvarUsuario,
  verificarSenhaUsuario
} from './modulos/administracao/repositorioAdministracao.js';
import {
  listarConfiguracoesEmailAdministracao,
  obterConfiguracaoEmailPorId,
  obterConfiguracaoEmailUsuario,
  registrarResultadoTesteEmailPorId,
  registrarResultadoTesteEmail,
  salvarConfiguracaoEmailUsuario
} from './modulos/administracao/repositorioEmailUsuario.js';
import {
  buscarModuloCotacaoFrete,
  excluirEtapaKanban,
  excluirTransportadora,
  listarEtapasKanban,
  listarTransportadoras,
  salvarEtapaKanban,
  salvarTransportadora
} from './modulos/cotacao_frete/repositorioCadastrosCotacao.js';
import {
  listarCotacoesFrete,
  listarItensPublicosPorToken,
  listarKanbanCotacao,
  adicionarTransportadoraCotacao,
  excluirTransportadoraCotacao,
  alterarEtapaCotacao,
  avancarEtapaAposEnvio,
  atualizarFluxoCotacaoErp,
  bloquearCotacaoPorErp,
  escolherTransportadora,
  alterarValorFreteManual,
  obterCotacaoFrete,
  obterIndicadoresCotacao,
  obterResumoPublicoPorToken,
  marcarTransportadoraSolicitadaPorLink,
  registrarRespostaTransportadora,
  registrarTokenCotacao,
  registrarTimelineCotacao,
  registrarUrlTokenCotacao,
  registrarVisualizacaoToken,
  listarCotacoesPendentesErp,
  receberCotacaoErp,
  sincronizarStatusCotacoes
} from './modulos/cotacao_frete/repositorioCotacaoFrete.js';
import {
  atualizarFornecedorEnvio,
  concluirEnvio,
  criarEnvioCotacao,
  listarPedidosAptosEnvioMassa,
  prepararEnvioMassa,
  registrarFornecedorEnvio
} from './modulos/cotacao_frete/repositorioEnvioMassa.js';
import {
  alterarStatusProduto,
  consultarSqlServerPim,
  duplicarProduto,
  executarCargaSqlServerPim,
  excluirAtributo,
  excluirMapeamentoAtributoCanal,
  excluirProduto,
  exportarProdutos,
  listarCargasSqlServerPim,
  listarAssets,
  listarAtributos,
  listarAuditoriaPim,
  listarCanais,
  listarComponentes,
  listarConfiguracoesModulo,
  listarConexoesSqlServerPim,
  listarGruposAtributos,
  listarImportacoes,
  listarMapeamentosAtributosCanais,
  listarProdutos,
  listarScoreCanais,
  listarWorkflowAprovacoes,
  obterDashboardPim,
  obterProdutoCompleto,
  registrarImportacao,
  restaurarProduto,
  salvarAsset,
  salvarAtributo,
  salvarCanal,
  salvarComponente,
  salvarConfiguracoesModulo,
  salvarConexaoSqlServerPim,
  salvarMapeamentoAtributoCanal,
  salvarProduto,
  testarConexaoSqlServerPim
} from './modulos/cadastro_produto_central/repositorioCadastroProdutoCentral.js';
import { exigirSuperadmin, obterUsuarioSessao } from './seguranca/sessao.js';
import { enviarEmail, testarConfiguracaoEmail } from './servicos/email.js';

function testarPortaTcp(urlMonitor: string, timeoutMs = 3000) {
  return new Promise<boolean>((resolve) => {
    try {
      const url = new URL(urlMonitor);
      const porta = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
      const socket = new Socket();
      let finalizado = false;
      const concluir = (resultado: boolean) => {
        if (finalizado) {
          return;
        }
        finalizado = true;
        socket.destroy();
        resolve(resultado);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => concluir(true));
      socket.once('timeout', () => concluir(false));
      socket.once('error', () => concluir(false));
      socket.connect(porta, url.hostname);
    } catch {
      resolve(false);
    }
  });
}

export async function criarApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  await app.register(jwt, { secret: ambiente.segredoJwt });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Control S Hub',
        description: 'API modular corporativa do Control S Hub.',
        version: '0.1.0'
      }
    }
  });
  await app.register(swaggerUi, { routePrefix: '/swagger' });

  app.decorate('autenticar', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
    }
  });

  async function montarUrlCotacao(token: string) {
    const ambienteLink = (await obterValorParametroSistema('AMBIENTE_LINK_COTACAO', 'HOMOLOGACAO')).toUpperCase();
    const urlBase = await obterValorParametroSistema('URL_PUBLICA_COTACAO', 'http://frete.monvizo.com.br:8080/');

    return {
      ambienteLink,
      urlCotacao: `${urlBase.replace(/\/$/, '')}/cotacao/token/${token}`
    };
  }


  function obterChaveCotacaoParametro(id: string) {
    return decodeURIComponent(String(id ?? '')).trim();
  }

  async function exigirPermissao(request: any, reply: any, codigo: string, mensagem: string) {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
      return null;
    }

    if (usuario.superadmin || usuario.administrador) {
      return usuario;
    }

    const permissoes = usuario.empresaAtivaId ? await listarCodigosPermissaoUsuario(usuario.id, usuario.empresaAtivaId) : [];
    if (!permissoes.includes(codigo)) {
      reply.status(403).send(falha('ACESSO_NEGADO', mensagem));
      return null;
    }

    return usuario;
  }

  async function exigirUmaPermissao(request: any, reply: any, codigos: string[], mensagem: string) {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
      return null;
    }

    if (usuario.superadmin || usuario.administrador) {
      return usuario;
    }

    const permissoes = usuario.empresaAtivaId ? await listarCodigosPermissaoUsuario(usuario.id, usuario.empresaAtivaId) : [];
    if (!codigos.some((codigo) => permissoes.includes(codigo))) {
      reply.status(403).send(falha('ACESSO_NEGADO', mensagem));
      return null;
    }

    return usuario;
  }

  app.get('/saude', async () =>
    sucesso({
      produto: 'Control S Hub',
      status: 'OPERACIONAL'
    })
  );

  app.get('/api/integracoes/n8n/status', { preHandler: (app as any).autenticar }, async (request) => {
    const urlMonitorConfigurada = (await obterValorParametroSistema('URL_MONITOR_N8N', 'http://192.168.1.70:5678/')).trim();
    const urlMonitor = urlMonitorConfigurada && !/^https?:\/\//i.test(urlMonitorConfigurada)
      ? `http://${urlMonitorConfigurada}`
      : urlMonitorConfigurada;
    const intervaloMinutos = Number(await obterValorParametroSistema('INTERVALO_MONITOR_N8N_MINUTOS', '15')) || 15;
    const limiteSemIntegracaoMinutos = Number(await obterValorParametroSistema('LIMITE_ALERTA_INTEGRACAO_N8N_MINUTOS', '30')) || 30;
    const consultaEm = new Date();
    let n8nOnline = false;
    let detalheTecnico = '';

    if (urlMonitor) {
      const controlador = new AbortController();
      const timeout = setTimeout(() => controlador.abort(), 5000);
      try {
        const resposta = await fetch(urlMonitor, {
          method: 'GET',
          signal: controlador.signal
        });
        n8nOnline = resposta.status < 500;
        detalheTecnico = `HTTP ${resposta.status}`;
      } catch (error) {
        detalheTecnico = error instanceof Error ? error.message : String(error);
      } finally {
        clearTimeout(timeout);
      }

      if (!n8nOnline) {
        const portaAberta = await testarPortaTcp(urlMonitor);
        if (portaAberta) {
          n8nOnline = true;
          detalheTecnico = detalheTecnico
            ? `${detalheTecnico}; porta TCP respondendo`
            : 'Porta TCP respondendo';
        }
      }
    }

    const ultimaIntegracao = await consultarUm<{ ultima_integracao_em: Date | string | null }>(`
      SELECT MAX(COALESCE(alterado_em, criadoem, data_documento)) AS ultima_integracao_em
      FROM cotacoes_frete
      WHERE COALESCE(excluido, FALSE) = FALSE
    `);
    const ultimaIntegracaoEm = ultimaIntegracao?.ultima_integracao_em ? new Date(ultimaIntegracao.ultima_integracao_em) : null;
    const minutosSemIntegracao = ultimaIntegracaoEm
      ? Math.floor((consultaEm.getTime() - ultimaIntegracaoEm.getTime()) / 60000)
      : null;
    const semIntegracao = minutosSemIntegracao === null || minutosSemIntegracao > limiteSemIntegracaoMinutos;
    const cor = !n8nOnline ? 'VERMELHO' : semIntegracao ? 'AMARELO' : 'VERDE';
    const mensagem = !n8nOnline
      ? 'n8n offline ou inacessível.'
      : semIntegracao
        ? `n8n online, mas sem atualização de cotação de frete há mais de ${limiteSemIntegracaoMinutos} minuto(s).`
        : 'n8n online e integração de cotação recente.';

    request.log.info({
      urlMonitor,
      cor,
      n8nOnline,
      ultimaIntegracaoEm,
      minutosSemIntegracao
    }, 'Monitor n8n consultado.');

    return sucesso({
      cor,
      n8n_online: n8nOnline,
      url_monitor: urlMonitor,
      ultima_consulta_em: consultaEm.toISOString(),
      ultima_integracao_em: ultimaIntegracaoEm?.toISOString() ?? null,
      minutos_sem_integracao: minutosSemIntegracao,
      limite_sem_integracao_minutos: limiteSemIntegracaoMinutos,
      intervalo_monitor_minutos: intervaloMinutos,
      mensagem,
      detalhe_tecnico: detalheTecnico
    });
  });

  app.post<{ Body: { email?: string; senha?: string } }>('/api/auth/login', async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const senha = request.body.senha ?? '';

    if (!email || !senha) {
      return reply.status(400).send(falha('CREDENCIAIS_OBRIGATORIAS', 'Informe e-mail e senha.'));
    }

    const usuario = await buscarUsuarioPorEmail(email);
    if (!usuario) {
      return reply.status(401).send(falha('CREDENCIAIS_INVALIDAS', 'E-mail ou senha invalidos.'));
    }

    // A senha e validada pelo PostgreSQL com pgcrypto para evitar trafegar hash ao cliente.
    const senhaValida = await verificarSenhaUsuario(usuario.id, senha);
    if (!senhaValida) {
      return reply.status(401).send(falha('CREDENCIAIS_INVALIDAS', 'E-mail ou senha invalidos.'));
    }

    let empresas: any[] = [];
    let permissoes: string[] = [];
    try {
      empresas = await listarEmpresasDoUsuario(usuario.id);
    } catch (error) {
      request.log.error({ error }, 'Falha ao listar empresas do usuario no login.');
      return reply.status(500).send(falha('EMPRESAS_USUARIO_INDISPONIVEIS', 'Nao foi possivel carregar as empresas do usuario. Verifique a estrutura do banco.'));
    }

    const empresaPadrao = empresas.find((empresa: any) => empresa.padrao) ?? empresas[0];
    try {
      permissoes = empresaPadrao?.id ? await listarCodigosPermissaoUsuario(usuario.id, empresaPadrao.id) : [];
    } catch (error) {
      request.log.error({ error }, 'Falha ao listar permissoes do usuario no login.');
      permissoes = [];
    }
    const token = app.jwt.sign({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      administrador: usuario.administrador,
      superadmin: usuario.superadmin,
      empresaAtivaId: empresaPadrao?.id
    });

    return sucesso({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        administrador: usuario.administrador,
        superadmin: usuario.superadmin,
        empresaAtivaId: empresaPadrao?.id,
        preferencias_interface: usuario.preferencias_interface ?? {}
      },
      empresas,
      permissoes
    });
  });


  app.get('/api/auth/sessao', { preHandler: (app as any).autenticar }, async (request) => {
    const usuarioSessao = obterUsuarioSessao(request);
    const empresas = await listarEmpresasDoUsuario(usuarioSessao!.id);
    const permissoes = usuarioSessao!.empresaAtivaId
      ? await listarCodigosPermissaoUsuario(usuarioSessao!.id, usuarioSessao!.empresaAtivaId)
      : [];

    return sucesso({
      usuario: {
        id: usuarioSessao!.id,
        nome: usuarioSessao!.nome,
        email: usuarioSessao!.email,
        administrador: usuarioSessao!.administrador,
        superadmin: usuarioSessao!.superadmin,
        empresaAtivaId: usuarioSessao!.empresaAtivaId
      },
      empresas,
      permissoes
    });
  });

  app.get('/api/empresas/minhas', { preHandler: (app as any).autenticar }, async (request) => {
    const usuario = obterUsuarioSessao(request);
    return sucesso(await listarEmpresasDoUsuario(usuario!.id));
  });

  app.get('/api/usuarios/preferencias-interface', { preHandler: (app as any).autenticar }, async (request) => {
    const usuario = obterUsuarioSessao(request);
    return sucesso(await obterPreferenciasInterfaceUsuario(usuario!.id));
  });

  app.post<{ Body: { preferencias?: Record<string, unknown> } }>('/api/usuarios/preferencias-interface', { preHandler: (app as any).autenticar }, async (request) => {
    const usuario = obterUsuarioSessao(request);
    const resultado = await salvarPreferenciasInterfaceUsuario(usuario!.id, request.body.preferencias ?? {});

    await registrarAuditoria({
      empresaId: usuario!.empresaAtivaId,
      usuarioId: usuario!.id,
      tipoEvento: 'PREFERENCIAS_INTERFACE',
      tabelaAfetada: 'usuarios',
      registroId: usuario!.id,
      descricao: 'Preferencias de interface atualizadas.',
      dadosNovos: request.body.preferencias ?? {}
    });

    return sucesso(resultado?.preferencias_interface ?? {});
  });

  app.post<{ Body: { empresa_id?: number } }>('/api/auth/trocar-empresa', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    const empresaId = Number(request.body.empresa_id);
    const empresas = await listarEmpresasDoUsuario(usuario!.id);
    const empresa = empresas.find((item) => Number(item.id) === empresaId);

    if (!empresa) {
      return reply.status(403).send(falha('EMPRESA_NAO_LIBERADA', 'Empresa nao liberada para este usuario.'));
    }

    const permissoes = await listarCodigosPermissaoUsuario(usuario!.id, empresa.id);
    const token = app.jwt.sign({
      id: usuario!.id,
      nome: usuario!.nome,
      email: usuario!.email,
      administrador: usuario!.administrador,
      superadmin: usuario!.superadmin,
      empresaAtivaId: empresa.id
    });

    await registrarAuditoria({
      empresaId: empresa.id,
      usuarioId: usuario!.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'SELECAO_EMPRESA',
      tipoEvento: 'TROCAR_EMPRESA_ATIVA',
      tabelaAfetada: 'usuarios_empresas',
      registroId: empresa.id,
      descricao: 'Usuario trocou a empresa ativa.',
      dadosNovos: { empresa_id: empresa.id }
    });

    return sucesso({
      token,
      empresa,
      permissoes
    });
  });

  app.get('/api/admin/empresas', { preHandler: (app as any).autenticar }, async () =>
    sucesso(await listarEmpresasAdministracao())
  );

  app.post('/api/admin/empresas', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao administrativa.'));
    }

    const empresa = await salvarEmpresa(request.body as any, usuario.id);
    await registrarAuditoria({
      empresaId: empresa?.id as number,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'ADMINISTRACAO_EMPRESAS',
      tipoEvento: 'SALVAR_EMPRESA',
      tabelaAfetada: 'empresas',
      registroId: empresa?.id as number,
      descricao: 'Empresa criada ou atualizada.',
      dadosNovos: empresa
    });
    return sucesso(empresa);
  });

  app.delete<{ Params: { id: string } }>('/api/admin/empresas/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao administrativa.'));
    }

    const resultado = await excluirEmpresa(Number(request.params.id), usuario.id);
    await registrarAuditoria({
      empresaId: Number(request.params.id),
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'ADMINISTRACAO_EMPRESAS',
      tipoEvento: 'EXCLUIR_EMPRESA',
      tabelaAfetada: 'empresas',
      registroId: 0,
      descricao: 'Empresa excluida logicamente.',
      dadosNovos: resultado
    });
    return sucesso(resultado);
  });

  app.get('/api/admin/perfis', { preHandler: (app as any).autenticar }, async () =>
    sucesso(await listarPerfisAdministracao())
  );

  app.post('/api/admin/perfis', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao administrativa.'));
    }

    const perfil = await salvarPerfil(request.body as any, usuario.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'ADMINISTRACAO_PERFIS',
      tipoEvento: 'SALVAR_PERFIL',
      tabelaAfetada: 'perfis',
      registroId: perfil?.id as number,
      descricao: 'Perfil criado ou atualizado.',
      dadosNovos: perfil
    });
    return sucesso(perfil);
  });

  app.delete<{ Params: { id: string } }>('/api/admin/perfis/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao administrativa.'));
    }

    const resultado = await excluirPerfil(Number(request.params.id), usuario.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'ADMINISTRACAO_PERFIS',
      tipoEvento: 'EXCLUIR_PERFIL',
      tabelaAfetada: 'perfis',
      registroId: 0,
      descricao: 'Perfil excluido logicamente.',
      dadosNovos: resultado
    });
    return sucesso(resultado);
  });

  app.get('/api/admin/usuarios', { preHandler: (app as any).autenticar }, async () =>
    sucesso(await listarUsuariosAdministracao())
  );

  app.post('/api/admin/usuarios', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao administrativa.'));
    }

    const usuarioSalvo = await salvarUsuario({ ...(request.body as any), empresa_padrao_id: usuario.empresaAtivaId }, usuario.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'ADMINISTRACAO_USUARIOS',
      tipoEvento: 'SALVAR_USUARIO',
      tabelaAfetada: 'usuarios',
      registroId: usuarioSalvo?.id as number,
      descricao: 'Usuario criado ou atualizado.',
      dadosNovos: usuarioSalvo
    });
    return sucesso(usuarioSalvo);
  });

  app.delete<{ Params: { id: string } }>('/api/admin/usuarios/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao administrativa.'));
    }

    const resultado = await excluirUsuario(Number(request.params.id), usuario.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'ADMINISTRACAO_USUARIOS',
      tipoEvento: 'EXCLUIR_USUARIO',
      tabelaAfetada: 'usuarios',
      registroId: 0,
      descricao: 'Usuario excluido logicamente.',
      dadosNovos: resultado
    });
    return sucesso(resultado);
  });

  app.get('/api/admin/configuracoes-email', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'CONFIGURAR_EMAIL', 'Usuario sem permissao para configurar e-mail.');
    if (!usuario) return;
    return sucesso(await listarConfiguracoesEmailAdministracao());
  });

  app.post('/api/admin/configuracoes-email', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'CONFIGURAR_EMAIL', 'Usuario sem permissao para configurar e-mail.');
    if (!usuario) return;
    const corpo = request.body as any;
    const usuarioEmailId = Number(corpo.usuario_id);
    if (!usuarioEmailId) {
      return reply.status(400).send(falha('USUARIO_OBRIGATORIO', 'Informe o usuario da configuracao de e-mail.'));
    }

    const configuracao = await salvarConfiguracaoEmailUsuario(usuarioEmailId, corpo);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      tipoEvento: 'SALVAR_CONFIGURACAO_EMAIL',
      tabelaAfetada: 'usuarios_configuracoes_email',
      registroId: configuracao?.id as number,
      descricao: 'Configuracao de e-mail criada ou atualizada pela administracao.',
      dadosNovos: configuracao
    });

    return sucesso(configuracao);
  });

  app.post<{ Params: { id: string } }>('/api/admin/configuracoes-email/:id/testar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'CONFIGURAR_EMAIL', 'Usuario sem permissao para testar e-mail.');
    if (!usuario) return;
    const configuracao = await obterConfiguracaoEmailPorId(Number(request.params.id), true) as any;
    if (!configuracao?.ativo) {
      return reply.status(400).send(falha('EMAIL_NAO_CONFIGURADO', 'Configuracao de e-mail inativa ou inexistente.'));
    }

    try {
      await testarConfiguracaoEmail(configuracao);
      const resultado = await registrarResultadoTesteEmailPorId(Number(request.params.id), 'SUCESSO', 'Conexao SMTP validada com sucesso.');
      return sucesso(resultado);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Falha ao testar SMTP.';
      await registrarResultadoTesteEmailPorId(Number(request.params.id), 'ERRO', mensagem);
      return reply.status(400).send(falha('EMAIL_TESTE_ERRO', mensagem));
    }
  });

  app.get('/api/usuarios/minha-configuracao-email', { preHandler: (app as any).autenticar }, async (request) => {
    const usuario = obterUsuarioSessao(request);
    return sucesso(await obterConfiguracaoEmailUsuario(usuario!.id));
  });

  app.post('/api/usuarios/minha-configuracao-email', { preHandler: (app as any).autenticar }, async (request) => {
    const usuario = obterUsuarioSessao(request);
    const configuracao = await salvarConfiguracaoEmailUsuario(usuario!.id, request.body as any);

    await registrarAuditoria({
      empresaId: usuario!.empresaAtivaId,
      usuarioId: usuario!.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'CONFIGURACAO_EMAIL_USUARIO',
      tipoEvento: 'SALVAR_CONFIGURACAO_EMAIL',
      tabelaAfetada: 'usuarios_configuracoes_email',
      registroId: configuracao?.id as number,
      descricao: 'Configuracao de e-mail do usuario salva.',
      dadosNovos: configuracao
    });

    return sucesso(configuracao);
  });

  app.post('/api/usuarios/minha-configuracao-email/testar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    const configuracao = await obterConfiguracaoEmailUsuario(usuario!.id, true) as any;

    if (!configuracao?.ativo) {
      return reply.status(400).send(falha('EMAIL_NAO_CONFIGURADO', 'Configure o e-mail antes de testar.'));
    }

    try {
      await testarConfiguracaoEmail(configuracao);
      const resultado = await registrarResultadoTesteEmail(usuario!.id, 'SUCESSO', 'Conexao SMTP validada com sucesso.');
      return sucesso(resultado);
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Falha ao testar SMTP.';
      await registrarResultadoTesteEmail(usuario!.id, 'ERRO', mensagem);
      return reply.status(400).send(falha('TESTE_EMAIL_FALHOU', mensagem));
    }
  });

  app.get('/api/admin/acoes', { preHandler: (app as any).autenticar }, async () =>
    sucesso(await listarAcoesPermissao())
  );

  app.get<{ Params: { id: string } }>('/api/admin/perfis/:id/permissoes', { preHandler: (app as any).autenticar }, async (request) => {
    const usuario = obterUsuarioSessao(request);
    return sucesso(await listarPermissoesPerfil(Number(request.params.id), usuario!.empresaAtivaId!));
  });

  app.post<{ Params: { id: string }; Body: { acoes_ids?: number[] } }>('/api/admin/perfis/:id/permissoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao para alterar direitos.'));
    }

    await salvarPermissoesPerfil({
      perfilId: Number(request.params.id),
      empresaId: usuario.empresaAtivaId!,
      acoesIds: request.body.acoes_ids ?? [],
      itens: (request.body as any).itens ?? []
    });

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'ADMINISTRACAO_PERFIS',
      tipoEvento: 'ALTERAR_PERMISSOES',
      tabelaAfetada: 'perfis_permissoes',
      registroId: 0,
      descricao: 'Permissoes do perfil alteradas.',
      dadosNovos: request.body
    });

    return sucesso({ mensagem: 'Permissoes atualizadas.' });
  });

  app.get('/api/admin/auditorias', { preHandler: (app as any).autenticar }, async (request) => {
    const usuario = obterUsuarioSessao(request);
    return sucesso(await listarAuditorias(usuario!.empresaAtivaId!));
  });

  app.get('/api/admin/parametros-sistema', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao para parametros.'));
    }

    return sucesso(await listarParametrosSistema());
  });

  app.post<{ Body: { parametros?: { chave: string; valor: string }[] } }>('/api/admin/parametros-sistema', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao para parametros.'));
    }

    for (const parametro of request.body.parametros ?? []) {
      if (parametro.chave) {
        await salvarParametroSistema(parametro.chave, parametro.valor ?? '');
      }
    }

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'CONFIGURACOES',
      tipoEvento: 'ALTERAR_PARAMETROS',
      tabelaAfetada: 'parametros_sistema',
      descricao: 'Parametros do sistema alterados.',
      dadosNovos: request.body
    });

    return sucesso(await listarParametrosSistema());
  });

  app.get('/api/admin/origens-comerciais-cotacao', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      return reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
    }

    return sucesso(await listarOrigensComerciaisCotacao());
  });

  app.get('/api/admin/motivos-escolha-transportadora', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      return reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
    }

    return sucesso(await listarMotivosEscolhaTransportadora());
  });

  app.post('/api/admin/motivos-escolha-transportadora', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      return reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
    }

    const corpo = request.body as any;
    if (!String(corpo?.descricao ?? '').trim()) {
      return reply.status(400).send(falha('MOTIVO_OBRIGATORIO', 'Informe a descricao do motivo.'));
    }

    const motivo = await salvarMotivoEscolhaTransportadora(corpo);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'CONFIGURACOES',
      tipoEvento: 'SALVAR_MOTIVO_ESCOLHA_TRANSPORTADORA',
      tabelaAfetada: 'motivos_escolha_transportadora',
      registroId: Number((motivo as any).id),
      descricao: `Motivo de escolha salvo: ${String((motivo as any).descricao)}`
    });

    return sucesso(motivo);
  });

  app.get('/api/admin/motivos-prejuizo-logistico', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      return reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
    }

    return sucesso(await listarMotivosPrejuizoLogistico());
  });

  app.post('/api/admin/motivos-prejuizo-logistico', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      return reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
    }

    const corpo = request.body as any;
    if (!String(corpo?.descricao ?? '').trim()) {
      return reply.status(400).send(falha('MOTIVO_OBRIGATORIO', 'Informe a descricao do motivo.'));
    }

    const motivo = await salvarMotivoPrejuizoLogistico(corpo);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'ADMINISTRACAO',
      telaCodigo: 'CONFIGURACOES',
      tipoEvento: 'SALVAR_MOTIVO_PREJUIZO_LOGISTICO',
      tabelaAfetada: 'motivos_prejuizo_logistico',
      registroId: Number((motivo as any).id),
      descricao: `Motivo de prejuizo logistico salvo: ${String((motivo as any).descricao)}`
    });

    return sucesso(motivo);
  });

  app.post<{ Params: { id: string }; Body: { motivo_id?: number | null; motivo_descricao?: string | null } }>('/api/cotacao-frete/cotacoes/:id/motivo-prejuizo-logistico', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario) {
      return reply.status(401).send(falha('NAO_AUTENTICADO', 'Sessao invalida ou expirada.'));
    }

    const resultado = await salvarMotivoPrejuizoCotacao({
      empresaId: usuario.empresaAtivaId!,
      cotacaoId: obterChaveCotacaoParametro(request.params.id),
      motivoId: request.body.motivo_id ?? null,
      motivoDescricao: request.body.motivo_descricao ?? null,
      usuarioId: usuario.id
    });

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'DASHBOARD',
      tipoEvento: 'SALVAR_MOTIVO_PREJUIZO_LOGISTICO_COTACAO',
      tabelaAfetada: 'cotacoes_frete_motivos_prejuizo_logistico',
      registroId: 0,
      descricao: 'Motivo de prejuizo logistico vinculado a cotacao.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.get('/api/telas/fonte', { preHandler: (app as any).autenticar }, async (request, reply) => {
    if (!exigirSuperadmin(request)) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Recurso disponivel apenas para superadmin.'));
    }

    return sucesso(await listarTelasFonte());
  });

  app.get('/api/cadastro-produto-central/dashboard', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_DASHBOARD', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar Cadastro de Produto Central.');
    if (!usuario) return;
    return sucesso(await obterDashboardPim(usuario.empresaAtivaId!));
  });

  app.get<{ Querystring: { busca?: string; status?: string } }>('/api/cadastro-produto-central/produtos', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_PRODUTOS', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar produtos.');
    if (!usuario) return;
    return sucesso(await listarProdutos(usuario.empresaAtivaId!, request.query.busca, request.query.status));
  });

  app.get<{ Params: { id: string } }>('/api/cadastro-produto-central/produtos/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_PRODUTOS', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar produto.');
    if (!usuario) return;
    const produto = await obterProdutoCompleto(usuario.empresaAtivaId!, Number(request.params.id));
    if (!produto) {
      return reply.status(404).send(falha('PRODUTO_NAO_ENCONTRADO', 'Produto nao encontrado.'));
    }
    return sucesso(produto);
  });

  app.post('/api/cadastro-produto-central/produtos', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_CRIAR', 'PIM_EDITAR', 'CRIAR_PRODUTO_PIM', 'EDITAR_PRODUTO_PIM'], 'Usuario sem permissao para salvar produtos.');
    if (!usuario) return;
    const produto = await salvarProduto(usuario.empresaAtivaId!, request.body as any, usuario.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'CADASTRO_PRODUTO_CENTRAL',
      telaCodigo: 'PIM_PRODUTOS',
      tipoEvento: 'SALVAR_PRODUTO',
      tabelaAfetada: 'produtos',
      registroId: Number((produto as any)?.id ?? 0),
      descricao: 'Produto mestre criado ou atualizado.',
      dadosNovos: produto
    });
    return sucesso(produto);
  });

  app.delete<{ Params: { id: string } }>('/api/cadastro-produto-central/produtos/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EXCLUIR', 'EXCLUIR_PRODUTO_PIM'], 'Usuario sem permissao para excluir produtos.');
    if (!usuario) return;
    const resultado = await excluirProduto(usuario.empresaAtivaId!, Number(request.params.id), usuario.id);
    return sucesso(resultado);
  });

  app.post<{ Params: { id: string }; Body: { status?: string; comentario?: string } }>('/api/cadastro-produto-central/produtos/:id/status', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const status = request.body.status ?? 'RASCUNHO';
    const permissaoPorStatus: Record<string, string[]> = {
      AGUARDANDO_APROVACAO: ['PIM_SOLICITAR_AJUSTES', 'PIM_EDITAR', 'EDITAR_PRODUTO_PIM'],
      APROVADO: ['PIM_APROVAR', 'APROVAR_PRODUTO_PIM'],
      REJEITADO: ['PIM_REJEITAR', 'REJEITAR_PRODUTO_PIM'],
      PUBLICADO: ['PIM_PUBLICAR', 'PUBLICAR_PRODUTO_PIM'],
      ARQUIVADO: ['PIM_ARQUIVAR'],
      RASCUNHO: ['PIM_EDITAR', 'EDITAR_PRODUTO_PIM']
    };
    const usuario = await exigirUmaPermissao(request, reply, permissaoPorStatus[status] ?? ['PIM_EDITAR', 'EDITAR_PRODUTO_PIM'], 'Usuario sem permissao para alterar status de produto.');
    if (!usuario) return;
    const resultado = await alterarStatusProduto(usuario.empresaAtivaId!, Number(request.params.id), status, usuario.id, request.body.comentario);
    return sucesso(resultado);
  });

  app.post<{ Params: { id: string } }>('/api/cadastro-produto-central/produtos/:id/restaurar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_RESTAURAR', 'PIM_REATIVAR', 'PIM_EDITAR'], 'Usuario sem permissao para restaurar produtos.');
    if (!usuario) return;
    return sucesso(await restaurarProduto(usuario.empresaAtivaId!, Number(request.params.id), usuario.id));
  });

  app.post<{ Params: { id: string } }>('/api/cadastro-produto-central/produtos/:id/duplicar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_DUPLICAR', 'PIM_CRIAR', 'CRIAR_PRODUTO_PIM'], 'Usuario sem permissao para duplicar produtos.');
    if (!usuario) return;
    const resultado = await duplicarProduto(usuario.empresaAtivaId!, Number(request.params.id), usuario.id);
    if (!resultado) {
      return reply.status(404).send(falha('PRODUTO_NAO_ENCONTRADO', 'Produto nao encontrado para duplicacao.'));
    }
    return sucesso(resultado);
  });

  app.get('/api/cadastro-produto-central/produtos-exportacao', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EXPORTAR'], 'Usuario sem permissao para exportar produtos.');
    if (!usuario) return;
    return sucesso(await exportarProdutos(usuario.empresaAtivaId!));
  });

  app.get('/api/cadastro-produto-central/componentes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_COMPONENTES', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar componentes.');
    if (!usuario) return;
    return sucesso(await listarComponentes(usuario.empresaAtivaId!));
  });

  app.post('/api/cadastro-produto-central/componentes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EDITAR', 'EDITAR_PRODUTO_PIM'], 'Usuario sem permissao para salvar componentes.');
    if (!usuario) return;
    return sucesso(await salvarComponente(usuario.empresaAtivaId!, request.body as any, usuario.id));
  });

  app.get('/api/cadastro-produto-central/atributos', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_ATRIBUTOS', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar atributos.');
    if (!usuario) return;
    return sucesso({ atributos: await listarAtributos(usuario.empresaAtivaId!), grupos: await listarGruposAtributos(usuario.empresaAtivaId!) });
  });

  app.post('/api/cadastro-produto-central/atributos', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EDITAR', 'PIM_VISUALIZAR_ATRIBUTOS', 'CONFIGURAR_ATRIBUTOS_PIM'], 'Usuario sem permissao para configurar atributos.');
    if (!usuario) return;
    return sucesso(await salvarAtributo(usuario.empresaAtivaId!, request.body as any));
  });

  app.delete<{ Params: { id: string } }>('/api/cadastro-produto-central/atributos/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EDITAR', 'CONFIGURAR_ATRIBUTOS_PIM'], 'Usuario sem permissao para excluir atributos.');
    if (!usuario) return;
    return sucesso(await excluirAtributo(usuario.empresaAtivaId!, Number(request.params.id)));
  });

  app.get('/api/cadastro-produto-central/atributos-canais-mapeamentos', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_ATRIBUTOS', 'PIM_VISUALIZAR_PUBLICACAO', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar atributos por canal.');
    if (!usuario) return;
    return sucesso(await listarMapeamentosAtributosCanais(usuario.empresaAtivaId!));
  });

  app.post('/api/cadastro-produto-central/atributos-canais-mapeamentos', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EDITAR', 'CONFIGURAR_ATRIBUTOS_PIM', 'CONFIGURAR_CANAIS_PIM'], 'Usuario sem permissao para configurar atributos por canal.');
    if (!usuario) return;
    return sucesso(await salvarMapeamentoAtributoCanal(usuario.empresaAtivaId!, request.body as any));
  });

  app.delete<{ Params: { id: string } }>('/api/cadastro-produto-central/atributos-canais-mapeamentos/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EDITAR', 'CONFIGURAR_ATRIBUTOS_PIM', 'CONFIGURAR_CANAIS_PIM'], 'Usuario sem permissao para excluir mapeamento de atributo por canal.');
    if (!usuario) return;
    return sucesso(await excluirMapeamentoAtributoCanal(usuario.empresaAtivaId!, Number(request.params.id)));
  });

  app.get('/api/cadastro-produto-central/canais', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_INTEGRACOES', 'PIM_VISUALIZAR_PUBLICACAO', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar canais.');
    if (!usuario) return;
    return sucesso(await listarCanais(usuario.empresaAtivaId!));
  });

  app.post('/api/cadastro-produto-central/canais', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EDITAR', 'PIM_VISUALIZAR_INTEGRACOES', 'CONFIGURAR_CANAIS_PIM'], 'Usuario sem permissao para configurar canais.');
    if (!usuario) return;
    return sucesso(await salvarCanal(usuario.empresaAtivaId!, request.body as any));
  });

  app.get('/api/cadastro-produto-central/score-canais', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_PRODUTOS', 'PIM_VISUALIZAR_PUBLICACAO', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar score por canal.');
    if (!usuario) return;
    return sucesso(await listarScoreCanais(usuario.empresaAtivaId!));
  });

  app.get<{ Querystring: { busca?: string } }>('/api/cadastro-produto-central/assets', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_ASSETS', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar imagens e documentos.');
    if (!usuario) return;
    return sucesso(await listarAssets(usuario.empresaAtivaId!, request.query.busca));
  });

  app.post('/api/cadastro-produto-central/assets', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_EDITAR', 'PIM_VISUALIZAR_ASSETS', 'GERENCIAR_IMAGENS_PIM'], 'Usuario sem permissao para gerenciar ativos digitais.');
    if (!usuario) return;
    return sucesso(await salvarAsset(usuario.empresaAtivaId!, request.body as any, usuario.id));
  });

  app.get('/api/cadastro-produto-central/importacoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_IMPORTACAO', 'PIM_IMPORTAR', 'IMPORTAR_PLANILHA_PIM'], 'Usuario sem permissao para importar planilhas.');
    if (!usuario) return;
    return sucesso(await listarImportacoes(usuario.empresaAtivaId!));
  });

  app.post('/api/cadastro-produto-central/importacoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_IMPORTAR', 'IMPORTAR_PLANILHA_PIM'], 'Usuario sem permissao para importar planilhas.');
    if (!usuario) return;
    return sucesso(await registrarImportacao(usuario.empresaAtivaId!, request.body as any, usuario.id));
  });

  app.get('/api/cadastro-produto-central/sqlserver/conexoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_IMPORTACAO', 'PIM_IMPORTAR', 'GERENCIAR_INTEGRACOES_PIM'], 'Usuario sem permissao para visualizar conexoes SQL Server.');
    if (!usuario) return;
    return sucesso(await listarConexoesSqlServerPim(usuario.empresaAtivaId!));
  });

  app.post('/api/cadastro-produto-central/sqlserver/conexoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_IMPORTAR', 'GERENCIAR_INTEGRACOES_PIM'], 'Usuario sem permissao para configurar conexao SQL Server.');
    if (!usuario) return;
    return sucesso(await salvarConexaoSqlServerPim(usuario.empresaAtivaId!, request.body as any, usuario.id));
  });

  app.post<{ Params: { id: string } }>('/api/cadastro-produto-central/sqlserver/conexoes/:id/testar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_IMPORTAR', 'GERENCIAR_INTEGRACOES_PIM'], 'Usuario sem permissao para testar conexao SQL Server.');
    if (!usuario) return;
    return sucesso(await testarConexaoSqlServerPim(usuario.empresaAtivaId!, Number(request.params.id)));
  });

  app.post('/api/cadastro-produto-central/sqlserver/consultar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_IMPORTAR', 'IMPORTAR_PLANILHA_PIM'], 'Usuario sem permissao para consultar SQL Server.');
    if (!usuario) return;
    return sucesso(await consultarSqlServerPim(usuario.empresaAtivaId!, request.body as any));
  });

  app.post('/api/cadastro-produto-central/sqlserver/cargas', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_IMPORTAR', 'IMPORTAR_PLANILHA_PIM'], 'Usuario sem permissao para executar carga SQL Server.');
    if (!usuario) return;
    return sucesso(await executarCargaSqlServerPim(usuario.empresaAtivaId!, request.body as any, usuario.id));
  });

  app.get('/api/cadastro-produto-central/sqlserver/cargas', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_IMPORTACAO', 'PIM_IMPORTAR'], 'Usuario sem permissao para visualizar cargas SQL Server.');
    if (!usuario) return;
    return sucesso(await listarCargasSqlServerPim(usuario.empresaAtivaId!));
  });

  app.get('/api/cadastro-produto-central/workflows', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_WORKFLOW', 'PIM_VISUALIZAR_APROVACAO', 'VISUALIZAR_CADASTRO_PRODUTO_CENTRAL'], 'Usuario sem permissao para visualizar workflows.');
    if (!usuario) return;
    return sucesso(await listarWorkflowAprovacoes(usuario.empresaAtivaId!));
  });

  app.get('/api/cadastro-produto-central/configuracoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_CONFIGURACOES', 'PIM_EDITAR', 'CONFIGURAR_MODULO_PIM'], 'Usuario sem permissao para configurar o modulo.');
    if (!usuario) return;
    return sucesso(await listarConfiguracoesModulo(usuario.empresaAtivaId!));
  });

  app.post('/api/cadastro-produto-central/configuracoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_CONFIGURACOES', 'CONFIGURAR_MODULO_PIM'], 'Usuario sem permissao para configurar o modulo.');
    if (!usuario) return;
    return sucesso(await salvarConfiguracoesModulo(usuario.empresaAtivaId!, request.body as any, usuario.id));
  });

  app.get('/api/cadastro-produto-central/auditoria', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirUmaPermissao(request, reply, ['PIM_VISUALIZAR_AUDITORIA', 'VISUALIZAR_AUDITORIA_PIM'], 'Usuario sem permissao para visualizar auditoria do PIM.');
    if (!usuario) return;
    return sucesso(await listarAuditoriaPim(usuario.empresaAtivaId!));
  });

  app.get<{
    Querystring: {
      data_inicial?: string;
      data_final?: string;
      vendedor?: string;
      cliente?: string;
      cidade?: string;
      uf?: string;
      transportadora?: string;
      status?: string;
      valor_pedido_min?: string;
      valor_pedido_max?: string;
      percentual_frete_min?: string;
      percentual_frete_max?: string;
      frete_gratis?: string;
      com_troca_transportadora?: string;
      com_divergencia_valor?: string;
      com_divergencia_prazo?: string;
    };
  }>('/api/cotacao-frete/dashboard', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'UTILIZA_COTACAO_FRETE', 'Usuario sem permissao para utilizar Cotacao de Frete.');
    if (!usuario) return;
    await sincronizarStatusCotacoes(usuario!.empresaAtivaId!);
    return sucesso(await obterIndicadoresCotacao(usuario!.empresaAtivaId!, {
      dataInicial: request.query.data_inicial,
      dataFinal: request.query.data_final,
      vendedor: request.query.vendedor,
      cliente: request.query.cliente,
      cidade: request.query.cidade,
      uf: request.query.uf,
      transportadora: request.query.transportadora,
      status: request.query.status,
      valorPedidoMin: request.query.valor_pedido_min ? Number(request.query.valor_pedido_min) : undefined,
      valorPedidoMax: request.query.valor_pedido_max ? Number(request.query.valor_pedido_max) : undefined,
      percentualFreteMin: request.query.percentual_frete_min ? Number(request.query.percentual_frete_min) : undefined,
      percentualFreteMax: request.query.percentual_frete_max ? Number(request.query.percentual_frete_max) : undefined,
      freteGratis: request.query.frete_gratis,
      comTrocaTransportadora: request.query.com_troca_transportadora === 'true',
      comDivergenciaValor: request.query.com_divergencia_valor === 'true',
      comDivergenciaPrazo: request.query.com_divergencia_prazo === 'true'
    }));
  });

  app.get<{ Querystring: { data_inicial?: string; data_final?: string; etapa_codigo?: string; faturado?: string; multiplas_cotacoes?: string; fluxo_logistico?: string; cte_diferente_escolhido?: string; frete_gratis?: string } }>('/api/cotacao-frete/kanban', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'VISUALIZAR_COTACAO_FRETE', 'Usuario sem permissao para visualizar cotacoes.');
    if (!usuario) return;
    await sincronizarStatusCotacoes(usuario!.empresaAtivaId!);
    return sucesso(await listarKanbanCotacao(usuario!.empresaAtivaId!, {
      dataInicial: request.query.data_inicial,
      dataFinal: request.query.data_final,
      etapaCodigo: request.query.etapa_codigo,
      faturado: request.query.faturado,
      multiplasCotacoes: request.query.multiplas_cotacoes === 'true',
      fluxoLogistico: request.query.fluxo_logistico,
      cteDiferenteEscolhido: request.query.cte_diferente_escolhido === 'true',
      freteGratis: request.query.frete_gratis
    }));
  });

  app.get<{ Querystring: { data_inicial?: string; data_final?: string; etapa_codigo?: string; busca?: string; numero_documento?: string; numero_nfe?: string; cliente?: string; cidade?: string; codigo_chave?: string; vendedor?: string; transportadora?: string; bloqueado?: string; faturado?: string; multiplas_cotacoes?: string; fluxo_logistico?: string; frete_gratis?: string; pagina?: string; limite?: string } }>('/api/cotacao-frete/cotacoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'VISUALIZAR_COTACAO_FRETE', 'Usuario sem permissao para visualizar cotacoes.');
    if (!usuario) return;
    await sincronizarStatusCotacoes(usuario!.empresaAtivaId!);
    return sucesso(await listarCotacoesFrete(usuario!.empresaAtivaId!, {
      dataInicial: request.query.data_inicial,
      dataFinal: request.query.data_final,
      etapaCodigo: request.query.etapa_codigo,
      busca: request.query.busca,
      numeroDocumento: request.query.numero_documento,
      numeroNfe: request.query.numero_nfe,
      cliente: request.query.cliente,
      cidade: request.query.cidade,
      codigoChave: request.query.codigo_chave,
      vendedor: request.query.vendedor,
      transportadora: request.query.transportadora,
      bloqueado: request.query.bloqueado,
      faturado: request.query.faturado,
      multiplasCotacoes: request.query.multiplas_cotacoes === 'true',
      fluxoLogistico: request.query.fluxo_logistico,
      freteGratis: request.query.frete_gratis,
      pagina: Number(request.query.pagina ?? 1),
      limite: Number(request.query.limite ?? 15)
    }));
  });

  app.get<{ Querystring: { situacao?: string; busca?: string; envio?: string; status?: string; vendedor?: string; transportadora?: string; faturado?: string; fluxo_logistico?: string; frete_gratis?: string; cotacao_criada_inicio?: string; cotacao_criada_fim?: string; data_documento_inicio?: string; data_documento_fim?: string } }>('/api/cotacao-frete/envio-massa/pedidos', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'VISUALIZAR_COTACAO_FRETE', 'Usuario sem permissao para visualizar cotacoes.');
    if (!usuario) return;
    await sincronizarStatusCotacoes(usuario!.empresaAtivaId!);
    return sucesso(await listarPedidosAptosEnvioMassa(usuario!.empresaAtivaId!, request.query));
  });

  app.post<{ Body: { cotacoes_ids?: Array<string | number> } }>('/api/cotacao-frete/envio-massa/preparar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'VISUALIZAR_COTACAO_FRETE', 'Usuario sem permissao para visualizar cotacoes.');
    if (!usuario) return;
    return sucesso(await prepararEnvioMassa(usuario!.empresaAtivaId!, (request.body.cotacoes_ids ?? []) as any));
  });

  app.post<{
    Body: {
      cotacoes_ids?: Array<string | number>;
      transportadoras_ids?: Array<string | number>;
      grupos?: Array<{
        transportadora_id?: string | number;
        cotacoes_ids?: Array<string | number>;
        assunto?: string;
        html?: string;
      }>;
      reenviar?: boolean;
      ignorar_ja_enviados?: boolean;
      itens_por_cotacao?: Record<string, number[]>;
    }
  }>('/api/cotacao-frete/envio-massa/enviar', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'GERAR_TOKEN_COTACAO_FRETE', 'Usuario sem permissao para enviar cotacoes.');
    if (!usuario) return;
    const configuracaoEmail = await obterConfiguracaoEmailUsuario(usuario!.id, true) as any;

    if (!configuracaoEmail?.ativo || !configuracaoEmail.permite_envio_cotacao) {
      return reply.status(400).send(falha('EMAIL_USUARIO_NAO_LIBERADO', 'Configure e libere o e-mail do usuario para envio de cotacoes.'));
    }

    if (request.body.grupos?.length) {
      const resultados: any[] = [];

      for (const grupo of request.body.grupos) {
        const transportadoraIdGrupo = Number(grupo.transportadora_id);
        const cotacoesGrupo = grupo.cotacoes_ids ?? [];
        const preparacaoGrupo = (await prepararEnvioMassa(usuario!.empresaAtivaId!, cotacoesGrupo as any) as any[])
          .filter((item: any) => Number(item.transportadora_id) === transportadoraIdGrupo);
        const documentosEmail: Array<{ numero: string; chave: string; url: string; valor: string; validade: string }> = [];
        const atualizacoes: any[] = [];
        const fornecedorBase = preparacaoGrupo[0];

        if (!fornecedorBase?.email) {
          resultados.push({ transportadora_id: transportadoraIdGrupo, status: 'ERRO', mensagem: 'Transportadora sem e-mail cadastrado.' });
          continue;
        }

        for (const fornecedor of preparacaoGrupo) {
          if (fornecedor.situacao_pedido !== 'ATIVO' || fornecedor.excluido) {
            resultados.push({ cotacao_id: fornecedor.cotacao_id, transportadora_id: fornecedor.transportadora_id, status: 'BLOQUEADO', mensagem: 'Pedido cancelado ou excluido.' });
            continue;
          }

          if (fornecedor.ja_enviado && !request.body.reenviar) {
            resultados.push({ cotacao_id: fornecedor.cotacao_id, transportadora_id: fornecedor.transportadora_id, status: 'IGNORADO', mensagem: 'Ja enviado anteriormente.' });
            continue;
          }

          const codigoChave = `${fornecedor.numero_documento}-P${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`;
          const envio = await criarEnvioCotacao({
            empresaId: usuario!.empresaAtivaId!,
            cotacaoId: fornecedor.cotacao_id,
            codigoChave,
            parcial: false,
            usuarioId: usuario!.id,
            itensIds: []
          });

          if (!envio) {
            resultados.push({ cotacao_id: fornecedor.cotacao_id, transportadora_id: fornecedor.transportadora_id, status: 'ERRO', mensagem: 'Cotacao nao localizada para criar envio.' });
            continue;
          }

          const token = randomBytes(32).toString('hex');
          const tokenHash = createHash('sha256').update(token).digest('hex');
          const expiraEm = new Date(Date.now() + 72 * 60 * 60 * 1000);
          const slaLimiteEm = new Date(Date.now() + Number(fornecedor.sla_resposta_horas ?? 24) * 60 * 60 * 1000);
          const registroToken = await registrarTokenCotacao({
            cotacaoId: fornecedor.cotacao_id,
            empresaId: usuario!.empresaAtivaId!,
            transportadoraId: Number(fornecedor.transportadora_id),
            tokenHash,
            numeroEnvio: Number(envio.numero_envio),
            geradoPorUsuarioId: usuario!.id,
            expiraEm
          });
          const { ambienteLink, urlCotacao } = await montarUrlCotacao(token);
          if (registroToken?.token_hash) {
            await registrarUrlTokenCotacao({ tokenHash: registroToken.token_hash, urlPublica: urlCotacao, ambienteLink });
          }

          await registrarFornecedorEnvio({
            empresaId: Number(envio.empresa_id),
            tipoDocumento: String(envio.tipo_documento),
            numeroDocumento: String(envio.numero_documento),
            codigoChave: String(envio.codigo_chave_base ?? fornecedor.codigo_chave),
            numeroEnvio: Number(envio.numero_envio),
            transportadoraId: Number(fornecedor.transportadora_id),
            emailDestino: fornecedor.email,
            primeiroEnvio: !fornecedor.ja_enviado,
            reenvio: Boolean(fornecedor.ja_enviado),
            urlPublica: urlCotacao,
            slaLimiteEm,
            tokenHash
          });

          await marcarTransportadoraSolicitadaPorLink({
            cotacaoId: fornecedor.cotacao_id,
            transportadoraId: Number(fornecedor.transportadora_id),
            slaLimiteEm,
            exigePrazo: Boolean(fornecedor.prazo_resposta_obrigatorio)
          });

          documentosEmail.push({
            numero: String(fornecedor.numero_documento),
            chave: String(fornecedor.codigo_chave),
            url: urlCotacao,
            valor: String(fornecedor.valor_frete ?? '0'),
            validade: slaLimiteEm.toLocaleString('pt-BR')
          });
          atualizacoes.push({ envio, fornecedor, tokenHash: registroToken?.token_hash ?? tokenHash, cotacaoId: fornecedor.cotacao_id });
        }

        if (!documentosEmail.length) {
          continue;
        }

        const linhas = documentosEmail.map((documento) => (
          `<tr><td>${documento.numero}</td><td>${documento.chave}</td><td style="text-align:right">R$ ${documento.valor}</td><td>${documento.validade}</td><td><a href="${documento.url}">${documento.url}</a></td></tr>`
        )).join('');
        const tabelaDocumentos = `
          <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;color:#172033" border="1" cellpadding="6">
            <thead><tr><th align="left">Documento</th><th align="left">Chave</th><th align="right">Valor refer&ecirc;ncia</th><th align="left">Validade do Link</th><th align="left">Link</th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>`;
        const modeloConfigurado = String(configuracaoEmail.modelo_email_transportadora ?? '').trim();
        const htmlBaseConfigurado = grupo.html?.trim()
          ? grupo.html
          : modeloConfigurado || `<div style="font-family:Arial,sans-serif;color:#172033"><p>Ol&aacute;, TRANSPORTADORA.</p><p>Solicitamos a cota&ccedil;&atilde;o de frete dos documentos abaixo:</p><p>DOCUMENTOS</p><br><p>Atenciosamente.</p></div>`;
        const htmlBase = grupo.html?.trim()
          ? `<div>${grupo.html}</div>`
          : `<div style="font-family:Arial,sans-serif;color:#172033"><p>OlÃ¡, ${fornecedorBase.nome_fantasia}.</p><p>Solicitamos a cotaÃ§Ã£o de frete dos documentos abaixo:</p><p>DOCUMENTOS</p><br><p>Atenciosamente.</p></div>`;
        const htmlLegado = `${htmlBase}
          <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6">
            <thead><tr><th>Documento</th><th>Chave</th><th>Valor referÃªncia</th><th>Validade do Link</th><th>Link</th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
          ${configuracaoEmail.assinatura_html ?? ''}`;

        void htmlLegado;
        const html = `${htmlBaseConfigurado
          .replaceAll('TRANSPORTADORA', fornecedorBase.nome_fantasia)
          .replaceAll('DOCUMENTOS', tabelaDocumentos)}
          ${configuracaoEmail.assinatura_html ?? ''}`;

        try {
          await enviarEmail(configuracaoEmail, {
            para: fornecedorBase.email,
            assunto: grupo.assunto || `Cotacao de frete - ${fornecedorBase.nome_fantasia}`,
            html,
            texto: documentosEmail.map((documento) => `${documento.numero} ${documento.chave}: ${documento.url}`).join('\n')
          });

          for (const item of atualizacoes) {
            await atualizarFornecedorEnvio({
              empresaId: Number(item.envio.empresa_id),
              tipoDocumento: String(item.envio.tipo_documento),
              numeroDocumento: String(item.envio.numero_documento),
              codigoChave: String(item.envio.codigo_chave_base ?? item.fornecedor.codigo_chave),
              numeroEnvio: Number(item.envio.numero_envio),
              transportadoraId: Number(item.fornecedor.transportadora_id),
              tokenHash: item.tokenHash,
              status: 'ENVIADO'
            });
            await concluirEnvio({
              empresaId: Number(item.envio.empresa_id),
              tipoDocumento: String(item.envio.tipo_documento),
              numeroDocumento: String(item.envio.numero_documento),
              codigoChave: String(item.envio.codigo_chave_base ?? item.fornecedor.codigo_chave),
              numeroEnvio: Number(item.envio.numero_envio),
              status: 'ENVIADO'
            });
            await avancarEtapaAposEnvio({
              empresaId: usuario!.empresaAtivaId!,
              cotacaoId: item.cotacaoId,
              usuarioId: usuario!.id,
              envioId: Number(item.envio.numero_envio),
              codigoChave: item.envio.codigo_chave
            });
            resultados.push({ cotacao_id: item.cotacaoId, transportadora_id: item.fornecedor.transportadora_id, status: 'ENVIADO' });
          }
        } catch (error) {
          const mensagem = error instanceof Error ? error.message : 'Falha ao enviar e-mail.';
          for (const item of atualizacoes) {
            await atualizarFornecedorEnvio({
              empresaId: Number(item.envio.empresa_id),
              tipoDocumento: String(item.envio.tipo_documento),
              numeroDocumento: String(item.envio.numero_documento),
              codigoChave: String(item.envio.codigo_chave_base ?? item.fornecedor.codigo_chave),
              numeroEnvio: Number(item.envio.numero_envio),
              transportadoraId: Number(item.fornecedor.transportadora_id),
              tokenHash: item.tokenHash,
              status: 'ERRO',
              erro: mensagem
            });
          }
          resultados.push({ transportadora_id: transportadoraIdGrupo, status: 'ERRO', mensagem });
        }
      }

      return sucesso({ resultados });
    }

    const cotacoesIds = request.body.cotacoes_ids ?? [];
    const transportadorasFiltro = new Set((request.body.transportadoras_ids ?? []).map((item) => String(item)));
    const preparacaoBase = await prepararEnvioMassa(usuario!.empresaAtivaId!, cotacoesIds as any) as any[];
    const preparacao = transportadorasFiltro.size
      ? preparacaoBase.filter((item: any) => transportadorasFiltro.has(String(item.transportadora_id)))
      : preparacaoBase;
    const agrupado = new Map<string, any[]>();
    const resultados: any[] = [];

    for (const item of preparacao) {
      if (item.situacao_pedido !== 'ATIVO' || item.excluido) {
        resultados.push({ cotacao_id: item.cotacao_id, transportadora_id: item.transportadora_id, status: 'BLOQUEADO', mensagem: 'Pedido cancelado ou excluido.' });
        continue;
      }

      if (item.ja_enviado && !request.body.reenviar) {
        resultados.push({ cotacao_id: item.cotacao_id, transportadora_id: item.transportadora_id, status: 'IGNORADO', mensagem: 'Ja enviado anteriormente.' });
        continue;
      }

      const chaveCotacao = String(item.cotacao_id);
      if (!agrupado.has(chaveCotacao)) {
        agrupado.set(chaveCotacao, []);
      }
      agrupado.get(chaveCotacao)!.push(item);
    }

    for (const [cotacaoId, fornecedores] of agrupado.entries()) {
      const base = fornecedores[0];
      const codigoChave = `${base.numero_documento}-P${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`;
      const envio = await criarEnvioCotacao({
        empresaId: usuario!.empresaAtivaId!,
        cotacaoId,
        codigoChave,
        parcial: false,
        usuarioId: usuario!.id,
        itensIds: []
      });

      if (!envio) {
        continue;
      }

      let enviados = 0;
      for (const fornecedor of fornecedores) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expiraEm = new Date(Date.now() + 72 * 60 * 60 * 1000);
        const slaLimiteEm = new Date(Date.now() + Number(fornecedor.sla_resposta_horas ?? 24) * 60 * 60 * 1000);
        const registroToken = await registrarTokenCotacao({
          cotacaoId,
          empresaId: usuario!.empresaAtivaId!,
          transportadoraId: Number(fornecedor.transportadora_id),
          tokenHash,
          numeroEnvio: Number(envio.numero_envio),
          geradoPorUsuarioId: usuario!.id,
          expiraEm
        });
        const { ambienteLink, urlCotacao } = await montarUrlCotacao(token);
        if (registroToken?.token_hash) {
          await registrarUrlTokenCotacao({ tokenHash: registroToken.token_hash, urlPublica: urlCotacao, ambienteLink });
        }

        await registrarFornecedorEnvio({
          empresaId: Number(envio.empresa_id),
          tipoDocumento: String(envio.tipo_documento),
          numeroDocumento: String(envio.numero_documento),
          codigoChave: String(envio.codigo_chave_base ?? base.codigo_chave),
          numeroEnvio: Number(envio.numero_envio),
          transportadoraId: Number(fornecedor.transportadora_id),
          emailDestino: fornecedor.email,
          primeiroEnvio: !fornecedor.ja_enviado,
          reenvio: Boolean(fornecedor.ja_enviado),
          urlPublica: urlCotacao,
          slaLimiteEm,
          tokenHash
        });

        await marcarTransportadoraSolicitadaPorLink({
          cotacaoId,
          transportadoraId: Number(fornecedor.transportadora_id),
          slaLimiteEm,
          exigePrazo: Boolean(fornecedor.prazo_resposta_obrigatorio)
        });

        try {
          if (!fornecedor.email) {
            throw new Error('Transportadora sem e-mail cadastrado.');
          }

          await enviarEmail(configuracaoEmail, {
            para: fornecedor.email,
            assunto: `Cotacao de frete ${base.numero_documento} - ${envio.codigo_chave}`,
            html: `<p>Ola, ${fornecedor.nome_fantasia}.</p><p>Por favor, preencha a cotacao de frete pelo link abaixo:</p><p><a href="${urlCotacao}">${urlCotacao}</a></p><p>Chave da cotacao: <strong>${envio.codigo_chave}</strong></p><p>Validade do Link: ${slaLimiteEm.toLocaleString('pt-BR')}</p>${configuracaoEmail.assinatura_html ?? ''}`,
            texto: `Preencha a cotacao: ${urlCotacao}`
          });

          await atualizarFornecedorEnvio({
            empresaId: Number(envio.empresa_id),
            tipoDocumento: String(envio.tipo_documento),
            numeroDocumento: String(envio.numero_documento),
            codigoChave: String(envio.codigo_chave_base ?? base.codigo_chave),
            numeroEnvio: Number(envio.numero_envio),
            transportadoraId: Number(fornecedor.transportadora_id),
            tokenHash: registroToken?.token_hash ?? tokenHash,
            status: 'ENVIADO'
          });
          enviados += 1;
          resultados.push({ cotacao_id: cotacaoId, transportadora_id: fornecedor.transportadora_id, status: 'ENVIADO', url: urlCotacao });
        } catch (error) {
          const mensagem = error instanceof Error ? error.message : 'Falha ao enviar e-mail.';
          await atualizarFornecedorEnvio({
            empresaId: Number(envio.empresa_id),
            tipoDocumento: String(envio.tipo_documento),
            numeroDocumento: String(envio.numero_documento),
            codigoChave: String(envio.codigo_chave_base ?? base.codigo_chave),
            numeroEnvio: Number(envio.numero_envio),
            transportadoraId: Number(fornecedor.transportadora_id),
            tokenHash: registroToken?.token_hash ?? tokenHash,
            status: 'ERRO',
            erro: mensagem
          });
          resultados.push({ cotacao_id: cotacaoId, transportadora_id: fornecedor.transportadora_id, status: 'ERRO', mensagem });
        }
      }

      await concluirEnvio({
        empresaId: Number(envio.empresa_id),
        tipoDocumento: String(envio.tipo_documento),
        numeroDocumento: String(envio.numero_documento),
        codigoChave: String(envio.codigo_chave_base ?? base.codigo_chave),
        numeroEnvio: Number(envio.numero_envio),
        status: enviados > 0 ? 'ENVIADO' : 'ERRO'
      });

      if (enviados > 0) {
        await avancarEtapaAposEnvio({
          empresaId: usuario!.empresaAtivaId!,
          cotacaoId,
          usuarioId: usuario!.id,
          envioId: Number(envio.numero_envio),
          codigoChave: envio.codigo_chave
        });
      }
    }

    return sucesso({ resultados });
  });

  app.get<{ Params: { id: string } }>('/api/cotacao-frete/cotacoes/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'VISUALIZAR_COTACAO_FRETE', 'Usuario sem permissao para visualizar cotacoes.');
    if (!usuario) return;
    const chaveCotacao = obterChaveCotacaoParametro(request.params.id);
    await sincronizarStatusCotacoes(usuario!.empresaAtivaId!, chaveCotacao);
    const cotacao = await obterCotacaoFrete(usuario!.empresaAtivaId!, chaveCotacao);
    if (!cotacao) {
      return reply.status(404).send(falha('COTACAO_NAO_ENCONTRADA', 'Cotacao nao encontrada.'));
    }
    return sucesso(cotacao);
  });

  app.post<{ Params: { id: string }; Body: { transportadora_id?: number; observacao?: string } }>('/api/cotacao-frete/cotacoes/:id/transportadoras', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ADICIONAR_TRANSPORTADORA_COTACAO', 'Usuario sem permissao para adicionar transportadora na cotacao.');
    if (!usuario) return;

    const transportadoraId = Number(request.body.transportadora_id);
    if (!transportadoraId) {
      return reply.status(400).send(falha('TRANSPORTADORA_OBRIGATORIA', 'Informe a transportadora.'));
    }

    const resultado = await adicionarTransportadoraCotacao({
      empresaId: usuario.empresaAtivaId!,
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      transportadoraId,
      usuarioId: usuario.id,
      observacao: request.body.observacao ?? null
    });

    if (!resultado) {
      return reply.status(409).send(falha('COTACAO_BLOQUEADA', 'Cotacao inexistente ou bloqueada para alteracao.'));
    }

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'COTACAO_FRETE_DETALHE',
      tipoEvento: 'ADICIONAR_TRANSPORTADORA_COTACAO',
      tabelaAfetada: 'cotacoes_frete_transportadoras',
      registroId: Number.isFinite(Number((resultado as any).registro_id)) ? Number((resultado as any).registro_id) : 0,
      descricao: 'Transportadora adicionada manualmente na cotacao.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.delete<{ Params: { id: string; transportadoraId: string } }>('/api/cotacao-frete/cotacoes/:id/transportadoras/:transportadoraId', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ADICIONAR_TRANSPORTADORA_COTACAO', 'Usuario sem permissao para remover transportadora da cotacao.');
    if (!usuario) return;

    const resultado = await excluirTransportadoraCotacao({
      empresaId: usuario.empresaAtivaId!,
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      cotacaoTransportadoraId: obterChaveCotacaoParametro(request.params.transportadoraId) as any,
      usuarioId: usuario.id
    });

    if (!resultado) {
      return reply.status(409).send(falha('TRANSPORTADORA_NAO_REMOVIDA', 'Somente transportadoras adicionadas, sem valor e sem resposta podem ser removidas.'));
    }

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'COTACAO_FRETE_DETALHE',
      tipoEvento: 'REMOVER_TRANSPORTADORA_COTACAO',
      tabelaAfetada: 'cotacoes_frete_transportadoras',
      registroId: Number((resultado as any).registro_id ?? 0),
      descricao: 'Transportadora adicionada sem valor removida da cotacao.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.post<{ Params: { id: string }; Body: { transportadora_id?: number; tipo_evento?: string; titulo?: string; descricao?: string; tipo_midia?: string; midia_base64?: string; transcricao_audio?: string; dados_evento?: unknown } }>('/api/cotacao-frete/cotacoes/:id/timeline', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'REGISTRAR_TIMELINE_COTACAO', 'Usuario sem permissao para registrar timeline.');
    if (!usuario) return;

    const resultado = await registrarTimelineCotacao({
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      usuarioId: usuario.id,
      transportadoraId: request.body.transportadora_id ? Number(request.body.transportadora_id) : null,
      tipoEvento: request.body.tipo_evento ?? 'OBSERVACAO_OPERACIONAL',
      titulo: request.body.titulo ?? 'Observacao operacional',
      descricao: request.body.descricao ?? null,
      tipoMidia: request.body.tipo_midia ?? null,
      midiaBase64: request.body.midia_base64 ?? null,
      transcricaoAudio: request.body.transcricao_audio ?? null,
      dadosEvento: request.body.dados_evento ?? { origem: 'USUARIO' }
    });

    return sucesso(resultado);
  });

  app.post<{ Params: { id: string }; Body: { cotacao_transportadora_id?: string | number; motivo_id?: number | null; motivo_descricao?: string | null } }>('/api/cotacao-frete/cotacoes/:id/escolher-transportadora', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ESCOLHER_TRANSPORTADORA', 'Usuario sem permissao para escolher transportadora.');
    if (!usuario) return;
    const cotacaoTransportadoraId = request.body.cotacao_transportadora_id;
    if (!cotacaoTransportadoraId) {
      return reply.status(400).send(falha('COTACAO_TRANSPORTADORA_OBRIGATORIA', 'Informe a cotacao da transportadora.'));
    }

    let resultado;
    try {
      resultado = await escolherTransportadora({
        empresaId: usuario!.empresaAtivaId!,
        cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
        cotacaoTransportadoraId,
        usuarioId: usuario!.id,
        motivoId: request.body.motivo_id ?? null,
        motivoDescricao: request.body.motivo_descricao ?? null
      });
    } catch (error) {
      return reply.status(409).send(falha('ESCOLHA_TRANSPORTADORA_INVALIDA', error instanceof Error ? error.message : 'Nao foi possivel escolher a transportadora.'));
    }

    if (!resultado) {
      return reply.status(409).send(falha('COTACAO_BLOQUEADA', 'Cotacao inexistente ou bloqueada para alteracao.'));
    }

    await registrarAuditoria({
      empresaId: usuario!.empresaAtivaId,
      usuarioId: usuario!.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'COTACAO_FRETE_DETALHE',
      tipoEvento: 'ESCOLHER_TRANSPORTADORA',
      tabelaAfetada: 'cotacoes_frete',
      registroId: 0,
      descricao: 'Transportadora vencedora escolhida.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.post<{
    Params: { id: string };
    Body: {
      status?: string;
      numero_nfe?: string;
      numero_cte?: string;
      transportadora_codigo?: string;
      transportadora_nome?: string;
      valor_frete_cte?: number;
      prazo_cte_dias?: number;
      payload?: unknown;
    };
  }>('/api/cotacao-frete/cotacoes/:id/fluxo-erp', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ATUALIZAR_FLUXO_ERP_COTACAO', 'Usuario sem permissao para atualizar fluxo ERP.');
    if (!usuario) return;

    if (!request.body.status) {
      return reply.status(400).send(falha('STATUS_OBRIGATORIO', 'Informe o status do fluxo ERP.'));
    }

    const resultado = await atualizarFluxoCotacaoErp({
      empresaId: usuario.empresaAtivaId!,
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      usuarioId: usuario.id,
      status: request.body.status,
      numeroNfe: request.body.numero_nfe ?? null,
      numeroCte: request.body.numero_cte ?? null,
      transportadoraCodigo: request.body.transportadora_codigo ?? null,
      transportadoraNome: request.body.transportadora_nome ?? null,
      valorFreteCte: request.body.valor_frete_cte ?? null,
      prazoCteDias: request.body.prazo_cte_dias ?? null,
      payload: request.body.payload ?? request.body
    });

    if (!resultado) {
      return reply.status(400).send(falha('STATUS_INVALIDO', 'Status do fluxo ERP invalido ou etapa nao configurada.'));
    }

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'INTEGRACAO_ERP_COTACAO',
      tipoEvento: 'ATUALIZAR_FLUXO_ERP',
      tabelaAfetada: 'cotacoes_frete',
      registroId: 0,
      descricao: 'Fluxo da cotacao atualizado pela integracao ERP.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.post<{ Params: { id: string }; Body: { valor_frete?: number; prazo_dias?: number; observacao?: string } }>('/api/cotacao-frete/cotacoes/transportadoras/:id/valor-manual', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ALTERAR_COTACAO_MANUAL', 'Usuario sem permissao para alterar valor manual.');
    if (!usuario) return;
    const valorFrete = Number(request.body.valor_frete);

    if (!valorFrete || valorFrete <= 0) {
      return reply.status(400).send(falha('VALOR_FRETE_INVALIDO', 'Informe um valor de frete valido.'));
    }

    const resultado = await alterarValorFreteManual({
      empresaId: usuario!.empresaAtivaId!,
      cotacaoTransportadoraId: decodeURIComponent(request.params.id),
      valorFrete,
      prazoDias: request.body.prazo_dias ? Number(request.body.prazo_dias) : null,
      usuarioId: usuario!.id,
      observacao: request.body.observacao ?? null
    });

    if (!resultado) {
      return reply.status(409).send(falha('COTACAO_BLOQUEADA', 'Cotacao inexistente ou bloqueada para alteracao.'));
    }

    await registrarAuditoria({
      empresaId: usuario!.empresaAtivaId,
      usuarioId: usuario!.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'COTACAO_FRETE_DETALHE',
      tipoEvento: 'ALTERAR_VALOR_MANUAL',
      tabelaAfetada: 'cotacoes_frete_transportadoras',
      registroId: 0,
      descricao: 'Valor de frete alterado manualmente.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.post<{ Params: { id: string }; Body: { etapa_kanban_id?: number; feedback?: string } }>('/api/cotacao-frete/cotacoes/:id/alterar-etapa', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ALTERAR_ETAPA_COTACAO', 'Usuario sem permissao para alterar etapa da cotacao.');
    if (!usuario) return;
    const etapaId = Number(request.body.etapa_kanban_id);
    if (!etapaId) {
      return reply.status(400).send(falha('ETAPA_OBRIGATORIA', 'Informe a etapa de destino.'));
    }

    const resultado = await alterarEtapaCotacao({
      empresaId: usuario!.empresaAtivaId!,
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      etapaId,
      usuarioId: usuario!.id,
      feedback: request.body.feedback ?? null
    });

    if (!resultado) {
      return reply.status(409).send(falha('COTACAO_BLOQUEADA', 'Cotacao bloqueada, etapa inexistente ou feedback obrigatorio nao informado.'));
    }

    await registrarAuditoria({
      empresaId: usuario!.empresaAtivaId,
      usuarioId: usuario!.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'COTACAO_FRETE_KANBAN',
      tipoEvento: 'ALTERAR_ETAPA',
      tabelaAfetada: 'cotacoes_frete',
      registroId: 0,
      descricao: 'Etapa da cotacao alterada.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.post<{ Params: { id: string }; Body: { payload_retorno?: unknown } }>('/api/cotacao-frete/cotacoes/:id/bloquear-erp', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao para bloquear cotacao.'));
    }

    const resultado = await bloquearCotacaoPorErp({
      empresaId: usuario.empresaAtivaId!,
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      usuarioId: usuario.id,
      payloadRetorno: request.body.payload_retorno
    });

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'COTACAO_FRETE_DETALHE',
      tipoEvento: 'BLOQUEIO_ERP',
      tabelaAfetada: 'cotacoes_frete',
      registroId: 0,
      descricao: 'Cotacao bloqueada por atualizacao no ERP.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  app.post<{ Params: { id: string }; Body: { transportadora_id?: number } }>('/api/cotacao-frete/cotacoes/:id/tokens', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'GERAR_TOKEN_COTACAO_FRETE', 'Usuario sem permissao para gerar token.');
    if (!usuario) return;

    const transportadoraId = Number(request.body.transportadora_id);
    if (!transportadoraId) {
      return reply.status(400).send(falha('TRANSPORTADORA_OBRIGATORIA', 'Informe a transportadora.'));
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiraEm = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const registro = await registrarTokenCotacao({
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      empresaId: usuario.empresaAtivaId!,
      transportadoraId,
      tokenHash,
      geradoPorUsuarioId: usuario.id,
      expiraEm
    });

    const { ambienteLink, urlCotacao } = await montarUrlCotacao(token);
    if (registro?.token_hash) {
      await registrarUrlTokenCotacao({ tokenHash: registro.token_hash, urlPublica: urlCotacao, ambienteLink });
    }

    await marcarTransportadoraSolicitadaPorLink({
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      transportadoraId,
      slaLimiteEm: expiraEm,
      exigePrazo: false
    });

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'GERACAO_TOKEN_COTACAO',
      tipoEvento: 'GERAR_TOKEN_COTACAO',
      tabelaAfetada: 'cotacoes_frete_tokens',
      registroId: 0,
      descricao: 'Token publico de cotacao gerado.',
      dadosNovos: { cotacao_id: request.params.id, transportadora_id: transportadoraId, expira_em: expiraEm }
    });

    return sucesso({
      token,
      url_publica: urlCotacao,
      ambiente_link: ambienteLink,
      expira_em: expiraEm
    });
  });

  app.get('/api/cotacao-frete/transportadoras', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'UTILIZA_COTACAO_FRETE', 'Usuario sem permissao para visualizar transportadoras.');
    if (!usuario) return;
    return sucesso(await listarTransportadoras());
  });

  app.post('/api/cotacao-frete/transportadoras', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'CADASTRAR_TRANSPORTADORA', 'Usuario sem permissao para cadastrar transportadora.');
    if (!usuario) return;

    const transportadora = await salvarTransportadora(request.body as any, usuario.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'TRANSPORTADORAS',
      tipoEvento: 'SALVAR_TRANSPORTADORA',
      tabelaAfetada: 'transportadoras',
      registroId: transportadora?.id as number,
      descricao: 'Transportadora criada ou atualizada.',
      dadosNovos: transportadora
    });
    return sucesso(transportadora);
  });

  app.delete<{ Params: { id: string } }>('/api/cotacao-frete/transportadoras/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'CADASTRAR_TRANSPORTADORA', 'Usuario sem permissao para excluir transportadora.');
    if (!usuario) return;

    const resultado = await excluirTransportadora(Number(request.params.id), usuario.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'TRANSPORTADORAS',
      tipoEvento: 'EXCLUIR_TRANSPORTADORA',
      tabelaAfetada: 'transportadoras',
      registroId: 0,
      descricao: 'Transportadora excluida logicamente.',
      dadosNovos: resultado
    });
    return sucesso(resultado);
  });

  app.get('/api/cotacao-frete/etapas', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'UTILIZA_COTACAO_FRETE', 'Usuario sem permissao para visualizar etapas.');
    if (!usuario) return;
    return sucesso(await listarEtapasKanban(usuario!.empresaAtivaId!));
  });

  app.post('/api/cotacao-frete/etapas', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ALTERAR_ETAPA_COTACAO', 'Usuario sem permissao para cadastrar etapas.');
    if (!usuario) return;

    const modulo = await buscarModuloCotacaoFrete();
    if (!modulo) {
      return reply.status(400).send(falha('MODULO_NAO_ENCONTRADO', 'Modulo Cotacao de Frete nao encontrado.'));
    }

    const etapa = await salvarEtapaKanban({ ...(request.body as any), empresa_id: usuario.empresaAtivaId }, modulo.id);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'ETAPAS_KANBAN',
      tipoEvento: 'SALVAR_ETAPA_KANBAN',
      tabelaAfetada: 'etapas_kanban',
      registroId: etapa?.id as number,
      descricao: 'Etapa do kanban criada ou atualizada.',
      dadosNovos: etapa
    });
    return sucesso(etapa);
  });

  app.delete<{ Params: { id: string } }>('/api/cotacao-frete/etapas/:id', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = await exigirPermissao(request, reply, 'ALTERAR_ETAPA_COTACAO', 'Usuario sem permissao para excluir etapas.');
    if (!usuario) return;

    const resultado = await excluirEtapaKanban(Number(request.params.id));
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'ETAPAS_KANBAN',
      tipoEvento: 'EXCLUIR_ETAPA_KANBAN',
      tabelaAfetada: 'etapas_kanban',
      registroId: 0,
      descricao: 'Etapa do kanban desativada.',
      dadosNovos: resultado
    });
    return sucesso(resultado);
  });

  async function resolverTokenPublico(tokenParametro: string) {
    const tokenInformado = decodeURIComponent(String(tokenParametro ?? '')).trim();
    const tokenHashCalculado = createHash('sha256').update(tokenInformado).digest('hex');
    const candidatos = [tokenHashCalculado];

    // Links antigos ou gravados por rotinas de envio podem conter o hash salvo.
    // A rota pÃºblica aceita os dois formatos para nÃ£o quebrar links jÃ¡ enviados.
    if (/^[a-f0-9]{64}$/i.test(tokenInformado) && tokenInformado !== tokenHashCalculado) {
      candidatos.push(tokenInformado);
    }

    for (const tokenHash of candidatos) {
      const resumo = await obterResumoPublicoPorToken(tokenHash);
      if (resumo) {
        return { tokenHash, resumo };
      }
    }

    return null;
  }

  app.get<{ Params: { token: string } }>('/api/publico/cotacao/:token', async (request, reply) => {
    const tokenResolvido = await resolverTokenPublico(request.params.token);
    const resumo = tokenResolvido?.resumo;

    if (!resumo) {
      return reply.status(404).send(falha('TOKEN_INVALIDO', 'Cotacao nao encontrada.'));
    }

    const expiraEm = (resumo as any).expira_em ? new Date((resumo as any).expira_em) : null;
    if ((resumo as any).token_status !== 'ATIVO' || (resumo as any).utilizado || (expiraEm && expiraEm < new Date())) {
      return reply.status(410).send(falha('TOKEN_INDISPONIVEL', 'Token expirado ou ja utilizado.'));
    }

    await registrarVisualizacaoToken(tokenResolvido!.tokenHash);

    return sucesso({
      resumo,
      itens: await listarItensPublicosPorToken(tokenResolvido!.tokenHash)
    });
  });

  app.post<{ Params: { token: string }; Body: { valor_frete?: number; prazo_dias?: number; numero_cotacao_transportadora?: string; observacao?: string } }>('/api/publico/cotacao/:token/responder', async (request, reply) => {
    const tokenResolvido = await resolverTokenPublico(request.params.token);
    const resumo = tokenResolvido?.resumo;

    if (!resumo) {
      return reply.status(404).send(falha('TOKEN_INVALIDO', 'Cotacao nao encontrada.'));
    }

    const expiraEm = (resumo as any).expira_em ? new Date((resumo as any).expira_em) : null;
    if ((resumo as any).token_status !== 'ATIVO' || (resumo as any).utilizado || (expiraEm && expiraEm < new Date())) {
      return reply.status(410).send(falha('TOKEN_INDISPONIVEL', 'Token expirado ou ja utilizado.'));
    }

    if ((resumo as any).bloqueado_para_alteracao) {
      return reply.status(409).send(falha('COTACAO_BLOQUEADA', 'Cotacao bloqueada para alteracao.'));
    }

    const valorFrete = Number(request.body.valor_frete);
    if (!valorFrete || valorFrete <= 0) {
      return reply.status(400).send(falha('VALOR_FRETE_INVALIDO', 'Informe um valor de frete valido.'));
    }

    const prazoDias = request.body.prazo_dias !== undefined && request.body.prazo_dias !== null
      ? Number(request.body.prazo_dias)
      : null;
    if ((resumo as any).prazo_resposta_obrigatorio && (!prazoDias || prazoDias <= 0)) {
      return reply.status(400).send(falha('PRAZO_OBRIGATORIO', 'Informe o prazo de entrega para responder esta cotacao.'));
    }

    const numeroCotacaoTransportadora = request.body.numero_cotacao_transportadora?.trim() || null;
    const observacaoTransportadora = request.body.observacao?.trim() || null;

    await registrarRespostaTransportadora({
      tokenHash: tokenResolvido!.tokenHash,
      cotacaoId: `${String((resumo as any).empresa_id ?? '')}|${String((resumo as any).tipo_documento ?? '')}|${String((resumo as any).numero_documento ?? '')}|${String((resumo as any).codigo_chave ?? '')}`,
      transportadoraId: (resumo as any).transportadora_id,
      valorFrete,
      prazoDias,
      numeroCotacaoTransportadora,
      observacao: observacaoTransportadora,
      ip: request.ip,
      agenteUsuario: request.headers['user-agent']
    });

    try {
      const usuarioGeradorId = Number((resumo as any).gerado_por_usuario_id ?? 0);
      const emailTransportadora = String((resumo as any).transportadora_email ?? '').trim();
      const configuracaoEmail = usuarioGeradorId
        ? await obterConfiguracaoEmailUsuario(usuarioGeradorId, true) as any
        : null;

      if (emailTransportadora && configuracaoEmail?.ativo && configuracaoEmail.permite_envio_cotacao) {
        const valorMercadoria = Number((resumo as any).valor_mercadoria ?? 0);
        const percentualFrete = valorMercadoria > 0 ? (valorFrete / valorMercadoria) * 100 : 0;
        const htmlComprovante = `
          <div style="font-family:Arial,sans-serif;color:#172033">
            <h2 style="margin:0 0 8px">Cotacao de frete registrada</h2>
            <p>Recebemos a resposta da transportadora <strong>${String((resumo as any).transportadora_nome ?? 'Transportadora')}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:12px" border="1" cellpadding="7">
              <tbody>
                <tr><td><strong>Documento</strong></td><td>${String((resumo as any).tipo_documento ?? '')} ${String((resumo as any).numero_documento ?? '')}</td></tr>
                <tr><td><strong>Chave</strong></td><td>${String((resumo as any).codigo_chave ?? '')}</td></tr>
                <tr><td><strong>Cliente</strong></td><td>${String((resumo as any).nome_destinatario ?? '')}</td></tr>
                <tr><td><strong>Destino</strong></td><td>${String((resumo as any).cidade_destino ?? '')}/${String((resumo as any).uf_destino ?? '')}</td></tr>
                <tr><td><strong>Valor informado</strong></td><td>R$ ${valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                ${numeroCotacaoTransportadora ? `<tr><td><strong>Numero da cotacao da transportadora</strong></td><td>${String(numeroCotacaoTransportadora)}</td></tr>` : ''}
                <tr><td><strong>% frete sobre o total</strong></td><td>${percentualFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td></tr>
                <tr><td><strong>Prazo informado</strong></td><td>${Number(prazoDias ?? 0)} dia(s)</td></tr>
                <tr><td><strong>Observacao</strong></td><td>${String(observacaoTransportadora ?? '-')}</td></tr>
              </tbody>
            </table>
            <p style="margin-top:12px">Este e-mail confirma o registro da cotacao no Control S Hub.</p>
          </div>
          ${configuracaoEmail.assinatura_html ?? ''}`;

        await enviarEmail(configuracaoEmail, {
          para: emailTransportadora,
          assunto: `Cotacao registrada${numeroCotacaoTransportadora ? ` ${String(numeroCotacaoTransportadora)}` : ''} - ${String((resumo as any).numero_documento ?? '')}`,
          html: htmlComprovante,
          texto: `Cotacao registrada. Documento ${String((resumo as any).numero_documento ?? '')}. ${numeroCotacaoTransportadora ? `Numero da cotacao ${String(numeroCotacaoTransportadora)}. ` : ''}Valor R$ ${valorFrete}. Prazo ${Number(prazoDias ?? 0)} dia(s).`
        });
      }
    } catch (erroEmailConfirmacao) {
      request.log.warn({ erro: erroEmailConfirmacao }, 'Falha ao enviar comprovante de cotacao para transportadora.');
    }

    return sucesso({ mensagem: 'Cotacao respondida com sucesso.' });
  });

  app.post('/api/integracoes/erp/cotacoes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao para integrar cotacoes do ERP.'));
    }

    const dados = request.body as any;
    if (!dados?.numero_documento) {
      return reply.status(400).send(falha('NUMERO_DOCUMENTO_OBRIGATORIO', 'Informe o numero do documento.'));
    }

    const cotacao = await receberCotacaoErp(usuario.empresaAtivaId!, dados);
    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'INTEGRACAO_ERP',
      tipoEvento: 'RECEBER_COTACAO_ERP',
      tabelaAfetada: 'cotacoes_frete',
      registroId: cotacao?.id,
      descricao: 'Cotacao recebida do ERP por endpoint interno.',
      dadosNovos: { numero_documento: dados.numero_documento, identificador_externo: dados.identificador_externo }
    });

    return sucesso(cotacao);
  });

  app.get('/api/integracoes/erp/pendentes', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao para consultar pendencias ERP.'));
    }

    return sucesso(await listarCotacoesPendentesErp(usuario.empresaAtivaId!));
  });

  app.post<{ Params: { id: string }; Body: { payload_retorno?: unknown } }>('/api/integracoes/erp/cotacoes/:id/confirmar-atualizacao', { preHandler: (app as any).autenticar }, async (request, reply) => {
    const usuario = obterUsuarioSessao(request);
    if (!usuario?.administrador && !usuario?.superadmin) {
      return reply.status(403).send(falha('ACESSO_NEGADO', 'Usuario sem permissao para confirmar atualizacao ERP.'));
    }

    const resultado = await bloquearCotacaoPorErp({
      empresaId: usuario.empresaAtivaId!,
      cotacaoId: obterChaveCotacaoParametro(request.params.id) as any,
      usuarioId: usuario.id,
      payloadRetorno: request.body.payload_retorno ?? { origem: 'ERP_N8N' }
    });

    await registrarAuditoria({
      empresaId: usuario.empresaAtivaId,
      usuarioId: usuario.id,
      moduloCodigo: 'COTACAO_FRETE',
      telaCodigo: 'INTEGRACAO_ERP',
      tipoEvento: 'CONFIRMAR_ATUALIZACAO_ERP',
      tabelaAfetada: 'cotacoes_frete',
      registroId: 0,
      descricao: 'ERP confirmou atualizacao da transportadora vencedora.',
      dadosNovos: resultado
    });

    return sucesso(resultado);
  });

  return app;
}
