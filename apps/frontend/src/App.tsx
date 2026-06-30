import {
  Building2,
  Columns3,
  FileCode2,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Truck,
  Users
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';



async function obterSessaoAtualLocal() {
  const token = localStorage.getItem('controlSHubToken');
  const apiBase = import.meta.env.VITE_API_BASE ?? '';

  const resposta = await fetch(`${apiBase}/api/auth/sessao`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const payload = await resposta.json().catch(() => null);

  if (!resposta.ok || payload?.sucesso === false) {
    throw new Error(payload?.erro?.mensagem ?? payload?.message ?? 'Sessão inválida ou expirada.');
  }

  return payload?.dados ?? payload;
}


import {
  buscarFonteDasTelas,
  buscarIndicadoresCotacao,
  buscarCotacaoPublica,
  adicionarTransportadoraCotacao,
  alterarEtapaCotacao,
  alterarValorFreteManual,
  EmpresaUsuario,
  entrar,
  excluirEmpresa,
  excluirEtapa,
  excluirPerfil,
  excluirTransportadoraCotacao,
  excluirTransportadora,
  excluirUsuario,
  escolherTransportadora,
  FonteTela,
  gerarNovoLinkCotacao,
  enviarCotacoesMassa,
  listarAuditorias,
  listarConfiguracoesEmail,
  listarCotacoes,
  listarEmpresas,
  listarEtapas,
  listarKanbanCotacoes,
  listarMotivosEscolhaTransportadora,
  listarOrigensComerciaisCotacao,
  listarPedidosEnvioMassa,
  listarParametrosSistema,
  listarPermissoesPerfil,
  listarPerfis,
  listarTransportadoras,
  listarUsuarios,
  obterCotacao,
  obterMinhaConfiguracaoEmail,
  prepararEnvioMassa,
  RegistroGenerico,
  registrarTimelineCotacao,
  responderCotacaoPublica,
  salvarEmpresa,
  salvarConfiguracaoEmail,
  salvarEtapa,
  salvarPerfil,
  salvarPermissoesPerfil,
  salvarPreferenciasInterface,
  salvarMotivoEscolhaTransportadora,
  salvarParametrosSistema,
  salvarTransportadora,
  salvarUsuario,
  salvarMinhaConfiguracaoEmail,
  testarConfiguracaoEmail,
  testarMinhaConfiguracaoEmail,
  trocarEmpresa,
  UsuarioLogado
} from './servicos/api';

type TelaAtual =
  | 'dashboard'
  | 'cotacoes'
  | 'envioMassa'
  | 'kanban'
  | 'transportadoras'
  | 'empresas'
  | 'usuarios'
  | 'perfis'
  | 'direitos'
  | 'etapas'
  | 'auditoria'
  | 'emailConfiguracoes'
  | 'configuracoes';

type DetalheCotacaoNormalizado = {
  cotacao: RegistroGenerico;
  itens: RegistroGenerico[];
  transportadoras: RegistroGenerico[];
  historicos: RegistroGenerico[];
  timeline?: RegistroGenerico[];
  notasFiscais?: RegistroGenerico[];
  ctes?: RegistroGenerico[];
  outrasCotacoes?: RegistroGenerico[];
};

const menus: { id: TelaAtual; nome: string; icone: typeof LayoutDashboard }[] = [
  { id: 'dashboard' as TelaAtual, nome: 'Dashboard', icone: LayoutDashboard },
  { id: 'cotacoes' as TelaAtual, nome: 'Cotações', icone: Truck },
  { id: 'envioMassa' as TelaAtual, nome: 'Envio Cotação', icone: Truck },
  { id: 'kanban' as TelaAtual, nome: 'Kanban', icone: Columns3 },
  { id: 'transportadoras' as TelaAtual, nome: 'Transportadoras', icone: Truck },
  { id: 'etapas' as TelaAtual, nome: 'Etapas Kanban', icone: Columns3 },
  { id: 'empresas' as TelaAtual, nome: 'Empresas', icone: Building2 },
  { id: 'usuarios' as TelaAtual, nome: 'Usuários', icone: Users },
  { id: 'perfis' as TelaAtual, nome: 'Perfis e Direitos', icone: ShieldCheck },
  { id: 'direitos' as TelaAtual, nome: 'Matriz de Permissões', icone: ShieldCheck },
  { id: 'auditoria' as TelaAtual, nome: 'Auditoria', icone: FileCode2 },
  { id: 'emailConfiguracoes' as TelaAtual, nome: 'Config. E-mail', icone: Settings },
  { id: 'configuracoes' as TelaAtual, nome: 'Configurações', icone: Settings }
];

const permissoesPorMenu: Partial<Record<TelaAtual, string[]>> = {
  dashboard: ['UTILIZA_COTACAO_FRETE'],
  cotacoes: ['UTILIZA_COTACAO_FRETE'],
  envioMassa: ['UTILIZA_COTACAO_FRETE'],
  kanban: ['UTILIZA_COTACAO_FRETE'],
  transportadoras: ['UTILIZA_COTACAO_FRETE'],
  etapas: ['UTILIZA_COTACAO_FRETE'],
  empresas: ['ADMINISTRAR_EMPRESAS'],
  usuarios: ['ADMINISTRAR_USUARIOS'],
  perfis: ['ADMINISTRAR_PERFIS'],
  direitos: ['ADMINISTRAR_PERFIS'],
  auditoria: ['VISUALIZAR_AUDITORIA'],
  emailConfiguracoes: ['CONFIGURAR_EMAIL'],
  configuracoes: ['ADMINISTRAR_EMPRESAS']
};

function usuarioPodeVerMenu(usuario: UsuarioLogado, telaMenu: TelaAtual) {
  if (usuario.superadmin || usuario.administrador) {
    return true;
  }
  const permissoesNecessarias = permissoesPorMenu[telaMenu] ?? [];
  if (!permissoesNecessarias.length) {
    return true;
  }
  const permissoesUsuario = new Set(usuario.permissoes ?? []);
  return permissoesNecessarias.some((permissao) => permissoesUsuario.has(permissao));
}


const rotasPorTela: Record<TelaAtual, string> = {
  dashboard: '/Dashboard',
  cotacoes: '/Cotacao_Frete',
  envioMassa: '/Cotacao_Frete/Envio_Massa',
  kanban: '/Cotacao_Frete/Kanban',
  transportadoras: '/Cotacao_Frete/Transportadoras',
  empresas: '/Empresas',
  usuarios: '/Usuarios',
  perfis: '/Perfis_Direitos',
  direitos: '/Matriz_Permissoes',
  etapas: '/Cotacao_Frete/Etapas_Kanban',
  auditoria: '/Auditoria',
  emailConfiguracoes: '/Configuracoes_Email',
  configuracoes: '/Configuracoes'
};

const MODELO_EMAIL_TRANSPORTADORA_PADRAO = `<div style="font-family:Arial,sans-serif;color:#172033">
  <p>Olá, TRANSPORTADORA.</p>
  <p>Solicitamos a cotação de frete dos documentos abaixo:</p>
  <p>DOCUMENTOS</p>
  <br></br>
  <p>Atenciosamente.</p>
</div>`;

const etapasFluxoAtivas = new Set([
  'COTACAO_PENDENTE',
  'COTACAO_AUTOMATICA',
  'COTACAO_TRANSPORTADORA',
  'EM_ANALISE',
  'TRANSPORTADORA_ESCOLHIDA',
  'CTE_EMITIDO',
  'COTACAO_CANCELADA'
]);

const telasPorRota = Object.entries(rotasPorTela).reduce((acumulador, [tela, rota]) => {
  acumulador[rota.toLowerCase()] = tela as TelaAtual;
  return acumulador;
}, {} as Record<string, TelaAtual>);

function obterTelaPelaRota(): TelaAtual {
  return telasPorRota[window.location.pathname.toLowerCase()] ?? 'dashboard';
}

function navegarParaTela(tela: TelaAtual, substituir = false) {
  const rota = rotasPorTela[tela] ?? '/Dashboard';
  if (window.location.pathname !== rota) {
    substituir ? window.history.replaceState(null, '', rota) : window.history.pushState(null, '', rota);
  }
}


function BotaoAtualizar({ carregando, aoAtualizar }: { carregando: boolean; aoAtualizar: () => void | Promise<unknown> }) {
  return (
    <button className={`botaoAtualizar${carregando ? ' carregando' : ''}`} type="button" onClick={() => aoAtualizar()} disabled={carregando}>
      <span className="gaugeAtualizacao">
        <RefreshCw size={16} />
      </span>
      {carregando ? 'Atualizando...' : 'Atualizar'}
    </button>
  );
}

function PainelContextual({
  aberto,
  titulo,
  subtitulo,
  largura = 'amplo',
  aoFechar,
  children
}: {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  largura?: 'medio' | 'amplo';
  aoFechar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!aberto) {
      return;
    }
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        aoFechar();
      }
    };
    document.body.classList.add('painelContextualAberto');
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.classList.remove('painelContextualAberto');
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, aoFechar]);

  if (!aberto) {
    return null;
  }

  return (
    <div className="painelContextualOverlay" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="painelContextualFundo" type="button" aria-label="Fechar detalhe" onClick={aoFechar} />
      <aside className={`painelContextual ${largura}`}>
        <header className="painelContextualTopo">
          <div>
            <span>Detalhe da seleção</span>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button className="ghost" type="button" onClick={aoFechar}>Fechar</button>
        </header>
        <div className="painelContextualConteudo">
          {children}
        </div>
      </aside>
    </div>
  );
}

function ModalConfirmacaoEscolha({
  aberto,
  transportadora,
  titulo = 'Confirmar escolha da transportadora',
  mensagem,
  erro,
  aoConfirmar,
  aoCancelar
}: {
  aberto: boolean;
  transportadora?: RegistroGenerico | null;
  titulo?: string;
  mensagem?: string;
  erro?: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  if (!aberto || !transportadora) {
    return null;
  }

  return (
    <div className="painelContextualOverlay confirmacaoOverlay" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="painelContextualFundo" type="button" aria-label="Cancelar confirmação" onClick={aoCancelar} />
      <aside className="modalConfirmacao">
        <header>
          <span>Confirmação operacional</span>
          <h2>{titulo}</h2>
          <p>{mensagem ?? 'Confirme para gravar a transportadora escolhida e avançar o fluxo.'}</p>
        </header>
        <section className="modalConfirmacaoResumo">
          <small>Transportadora</small>
          <strong>{String(transportadora.nome_fantasia ?? transportadora.razao_social ?? '-')}</strong>
          <small>Valor</small>
          <strong>{formatarMoeda(transportadora.valor_frete)}</strong>
          <small>Prazo</small>
          <strong>{String(transportadora.prazo_dias ?? 0)} dia(s)</strong>
        </section>
        {erro && <div className="alerta alertaModal">{erro}</div>}
        <footer>
          <button className="ghost" type="button" onClick={aoCancelar}>Cancelar</button>
          <button className="primary" type="button" disabled={Boolean(erro)} onClick={aoConfirmar}>Confirmar escolha</button>
        </footer>
      </aside>
    </div>
  );
}

function ModalSelecaoMotivoEscolha({
  aberto,
  transportadora,
  motivos,
  aoSelecionar,
  aoCancelar
}: {
  aberto: boolean;
  transportadora?: RegistroGenerico | null;
  motivos: RegistroGenerico[];
  aoSelecionar: (motivo: RegistroGenerico) => void;
  aoCancelar: () => void;
}) {
  if (!aberto || !transportadora) {
    return null;
  }

  return (
    <div className="painelContextualOverlay confirmacaoOverlay" role="dialog" aria-modal="true" aria-label="Selecionar motivo da escolha">
      <button className="painelContextualFundo" type="button" aria-label="Cancelar seleção de motivo" onClick={aoCancelar} />
      <aside className="modalConfirmacao">
        <header>
          <span>Motivo obrigatório</span>
          <h2>Selecionar motivo da escolha</h2>
          <p>A transportadora selecionada não é a menor oferta. Escolha o motivo para continuar.</p>
        </header>
        <section className="modalConfirmacaoResumo">
          <small>Transportadora</small>
          <strong>{String(transportadora.nome_fantasia ?? transportadora.razao_social ?? '-')}</strong>
          <small>Valor</small>
          <strong>{formatarMoeda(transportadora.valor_frete)}</strong>
        </section>
        <strong className="instrucaoMotivoEscolha">Selecione um dos Motivos Abaixo:</strong>
        <div className="listaMotivosEscolha">
          {motivos.filter((item) => item.ativo !== false).map((motivo) => (
            <button key={String(motivo.id)} type="button" className="ghost" onClick={() => aoSelecionar(motivo)}>
              {String(motivo.descricao)}
            </button>
          ))}
          {motivos.filter((item) => item.ativo !== false).length === 0 && (
            <p>Nenhum motivo cadastrado. Cadastre um motivo em Configurações antes de continuar.</p>
          )}
        </div>
        <footer>
          <button className="ghost" type="button" onClick={aoCancelar}>Cancelar</button>
        </footer>
      </aside>
    </div>
  );
}

function SeletorTransportadoraModal({
  aberto,
  titulo,
  transportadoras,
  idsBloqueados,
  sugestaoId,
  erro,
  aoSelecionar,
  aoFechar
}: {
  aberto: boolean;
  titulo: string;
  transportadoras: RegistroGenerico[];
  idsBloqueados?: Array<string | number>;
  sugestaoId?: string | number | null;
  erro?: string;
  aoSelecionar: (transportadora: RegistroGenerico) => void | Promise<void>;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = useState('');
  const bloqueados = new Set((idsBloqueados ?? []).map((item) => String(item)));
  const termo = busca.trim().toUpperCase();
  const lista = transportadoras
    .filter((item) => item.aceita_cotacao_externa !== false)
    .filter((item) => {
      const idReal = obterTransportadoraId(item);
      return !bloqueados.has(String(item.id)) && !bloqueados.has(String(item.transportadora_id)) && !bloqueados.has(String(idReal));
    })
    .filter((item) => {
      if (!termo) {
        return true;
      }
      return [
        item.codigo_interno,
        item.nome_fantasia,
        item.razao_social,
        item.documento,
        item.cnpj_cpf
      ].some((valor) => String(valor ?? '').toUpperCase().includes(termo));
    });
  const sugerida = lista.find((item) => String(item.id) === String(sugestaoId) || String(obterTransportadoraId(item)) === String(sugestaoId));

  return (
    <PainelContextual
      aberto={aberto}
      largura="medio"
      titulo={titulo}
      subtitulo="Consulte transportadoras cadastradas e liberadas para cotação externa."
      aoFechar={aoFechar}
    >
      <section className="seletorTransportadora">
        <input
          autoFocus
          placeholder="Código ou nome da transportadora"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        {erro && <div className="alerta alertaModal">{erro}</div>}
        {sugerida && (
          <button className="transportadoraOpcao sugerida" onClick={() => aoSelecionar(sugerida)}>
            <span>Sugestão</span>
            <strong>{String(sugerida.nome_fantasia ?? sugerida.razao_social)}</strong>
            <small>Código {String(sugerida.codigo_interno ?? sugerida.id)}</small>
          </button>
        )}
        <div className="listaTransportadorasConsulta">
          {lista.map((transportadora) => (
            <button
              key={String(transportadora.id)}
              className="transportadoraOpcao"
              onClick={() => aoSelecionar(transportadora)}
            >
              <span>{String(transportadora.codigo_interno ?? transportadora.id)}</span>
              <strong>{String(transportadora.nome_fantasia ?? transportadora.razao_social)}</strong>
              <small>{String(transportadora.documento ?? transportadora.cnpj_cpf ?? '')}</small>
            </button>
          ))}
          {!lista.length && <p>Nenhuma transportadora liberada para cotação externa encontrada.</p>}
        </div>
      </section>
    </PainelContextual>
  );
}




function obterDataIso(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function obterDataDiasAtras(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return obterDataIso(data);
}

async function copiarTexto(texto: unknown) {
  const conteudo = String(texto ?? '').trim();
  if (!conteudo) {
    throw new Error('Nenhum link disponível para copiar.');
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(conteudo);
      return;
    } catch {
      // Alguns navegadores bloqueiam clipboard em HTTP; usa fallback abaixo.
    }
  }

  const area = document.createElement('textarea');
  area.value = conteudo;
  area.setAttribute('readonly', 'true');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  area.style.top = '0';
  document.body.appendChild(area);
  area.focus();
  area.select();
  const copiou = document.execCommand('copy');
  document.body.removeChild(area);

  if (!copiou) {
    throw new Error('Não foi possível copiar o link neste navegador.');
  }
}

const moduloCotacao = {
  id: 'cotacao_frete',
  nome: 'Cotação de Frete',
  emoji: '🚚',
  descricao: 'Cotações por documento, transportadoras, kanban, tokens e integração banco x banco.'
};

function Login({ aoEntrar }: { aoEntrar: (usuario: UsuarioLogado, empresas: EmpresaUsuario[]) => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      const dados = await entrar(email, senha);
      localStorage.setItem('controlSHubToken', dados.token);
      aoEntrar({ ...dados.usuario, permissoes: dados.permissoes }, dados.empresas);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao entrar.');
    }
  }

  return (
    <main className="loginScreen">
      <form className="loginPanel" onSubmit={enviar}>
        <div className="loginBrand">
          <img src="/brand/logo-s-novo.jpg" alt="Control S" />
          <span>Plataforma modular corporativa</span>
        </div>
        <h1>Control S Hub</h1>
        <label>
          E-mail
          <input value={email} onChange={(evento) => setEmail(evento.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(evento) => setSenha(evento.target.value)} />
        </label>
        {erro && <div className="alerta">{erro}</div>}
        <button className="primary">Entrar</button>
      </form>
    </main>
  );
}

function FonteDaTela({ tela, usuario }: { tela: TelaAtual; usuario: UsuarioLogado }) {
  const [aberto, setAberto] = useState(false);
  const [fontes, setFontes] = useState<FonteTela[]>([]);
  const [erroFonte, setErroFonte] = useState('');

  async function abrir() {
    if (!aberto && fontes.length === 0) {
      try {
        setErroFonte('');
        setFontes(await buscarFonteDasTelas());
      } catch (error) {
        setErroFonte(error instanceof Error ? error.message : 'Não foi possível carregar os detalhes técnicos.');
      }
    }
    setAberto(!aberto);
  }

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (usuario.superadmin && evento.ctrlKey && evento.key === 'F3') {
        evento.preventDefault();
        abrir();
      }
    }

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, fontes.length, usuario.superadmin]);

  if (!usuario.superadmin) {
    return null;
  }

  const rotaAtual = rotasPorTela[tela];
  const fonte =
    fontes.find((item: any) => String(item.rota ?? '').toLowerCase() === String(rotaAtual ?? '').toLowerCase()) ??
    fontes.find((item: any) => String(item.codigo ?? '').toUpperCase().includes(String(tela).toUpperCase())) ??
    fontes[0] ??
    {
      codigo: String(tela),
      nome: String(tela),
      rota: rotaAtual,
      arquivo_fonte: 'apps/frontend/src/App.tsx',
      componentes_principais: 'Layout, FonteDaTela e componente principal da tela',
      endpoints_usados: '/api/auth/sessao, /api/cotacao-frete/*, /api/admin/*',
      tabelas_principais: 'cotacoes_frete, cotacoes_frete_transportadoras, empresas, usuarios, permissoes',
      rotinas_relacionadas: 'Carregamento da tela, permissões, filtros e ações operacionais.'
    };

  return (
    <div className="fonteTela">
      <button className="ghost" onClick={abrir}>
        <FileCode2 size={15} />
        FONTE DA TELA
      </button>
      {aberto && (
        <section className="fontePainel">
          <strong>{fonte?.nome ?? tela}</strong>
          {erroFonte && <small><strong>Aviso:</strong> {erroFonte}</small>}
          <small><strong>Técnico:</strong> {fonte?.codigo ?? tela}</small>
          <small><strong>Rota:</strong> {fonte?.rota ?? rotaAtual}</small>
          <small><strong>Frontend:</strong> {fonte?.arquivo_fonte ?? 'apps/frontend/src/App.tsx'}</small>
          <small><strong>Componentes:</strong> {fonte?.componentes_principais ?? 'Layout, FonteDaTela, Dashboard'}</small>
          <small><strong>Endpoints:</strong> {fonte?.endpoints_usados ?? '/api/cotacao-frete/dashboard'}</small>
          <small><strong>Tabelas:</strong> {fonte?.tabelas_principais ?? 'cotacoes_frete, etapas_kanban'}</small>
          <small><strong>Rotinas:</strong> {fonte?.rotinas_relacionadas ?? 'Carregamento da tela, permissões e ações principais.'}</small>
        </section>
      )}
    </div>
  );
}

function Dashboard() {
  const [indicadores, setIndicadores] = useState<Record<string, any>>({ itens: [] });
  const [carregando, setCarregando] = useState(false);
  const [documentacaoAberta, setDocumentacaoAberta] = useState(false);
  const [dataInicial, setDataInicial] = useState(obterDataDiasAtras(30));
  const [dataFinal, setDataFinal] = useState(obterDataIso(new Date()));
  const [vendedorFiltro, setVendedorFiltro] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [cidadeFiltro, setCidadeFiltro] = useState('');
  const [ufFiltro, setUfFiltro] = useState('');
  const [transportadoraFiltro, setTransportadoraFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [valorPedidoMin, setValorPedidoMin] = useState('');
  const [valorPedidoMax, setValorPedidoMax] = useState('');
  const [percentualFreteMin, setPercentualFreteMin] = useState('');
  const [percentualFreteMax, setPercentualFreteMax] = useState('');
  const [somenteTrocaTransportadora, setSomenteTrocaTransportadora] = useState(false);
  const [somenteDivergenciaValor, setSomenteDivergenciaValor] = useState(false);
  const [somenteDivergenciaPrazo, setSomenteDivergenciaPrazo] = useState(false);
  const [limiteAlertaPercentual, setLimiteAlertaPercentual] = useState('5');
  const [paginaAnalisePedido, setPaginaAnalisePedido] = useState(1);

  async function carregarDashboard() {
    setCarregando(true);
    try {
      setIndicadores(await buscarIndicadoresCotacao({
        data_inicial: dataInicial,
        data_final: dataFinal,
        vendedor: vendedorFiltro || undefined,
        cliente: clienteFiltro || undefined,
        cidade: cidadeFiltro || undefined,
        uf: ufFiltro || undefined,
        transportadora: transportadoraFiltro || undefined,
        status: statusFiltro || undefined,
        valor_pedido_min: valorPedidoMin || undefined,
        valor_pedido_max: valorPedidoMax || undefined,
        percentual_frete_min: percentualFreteMin || undefined,
        percentual_frete_max: percentualFreteMax || undefined,
        com_troca_transportadora: somenteTrocaTransportadora || undefined,
        com_divergencia_valor: somenteDivergenciaValor || undefined,
        com_divergencia_prazo: somenteDivergenciaPrazo || undefined
      }));
    } catch {
      setIndicadores({ itens: [] });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDashboard();
  }, []);

  const pedidos = useMemo(() => Array.isArray(indicadores.itens) ? indicadores.itens : [], [indicadores]);
  const totalPaginasAnalisePedido = Math.max(1, Math.ceil(pedidos.length / 40));
  const paginaAnaliseCorrigida = Math.min(paginaAnalisePedido, totalPaginasAnalisePedido);
  const pedidosAnalisePagina = pedidos.slice((paginaAnaliseCorrigida - 1) * 40, paginaAnaliseCorrigida * 40);
  const statusDisponiveis = useMemo(
    () => [...new Set(pedidos.map((item: RegistroGenerico) => String(item.status ?? '')).filter(Boolean))].sort(),
    [pedidos]
  );

  useEffect(() => {
    setPaginaAnalisePedido(1);
  }, [pedidos.length]);

  const dashboard = useMemo(() => {
    const totalPedidos = pedidos.length;
    const valorTotalPedidos = pedidos.reduce((total: number, item: RegistroGenerico) => total + Number(item.valor_pedido ?? 0), 0);
    const valorTotalFreteCte = pedidos.reduce((total: number, item: RegistroGenerico) => total + Number(item.valor_cte ?? 0), 0);
    const percentualMedioFretePedido = totalPedidos
      ? pedidos.reduce((total: number, item: RegistroGenerico) => total + Number(item.percentual_frete_final ?? 0), 0) / totalPedidos
      : 0;
    const economiaAutomatica = pedidos.reduce((total: number, item: RegistroGenerico) => total + (Number(item.valor_cotacao_automatica ?? 0) - Number(item.valor_cte ?? 0)), 0);
    const economiaEscolhida = pedidos.reduce((total: number, item: RegistroGenerico) => total + (Number(item.valor_transportadora_escolhida ?? 0) - Number(item.valor_cte ?? 0)), 0);
    const prazoMedioFinal = totalPedidos
      ? pedidos.reduce((total: number, item: RegistroGenerico) => total + Number(item.prazo_final ?? 0), 0) / totalPedidos
      : 0;
    const trocasTransportadora = pedidos.filter((item: RegistroGenerico) => Boolean(item.houve_troca_transportadora)).length;
    const divergencias = pedidos.filter((item: RegistroGenerico) =>
      Number(item.diferenca_automatica_cte ?? 0) > 0
      || Number(item.diferenca_escolhida_cte ?? 0) > 0
      || Boolean(item.houve_troca_transportadora)
      || Boolean(item.divergencia_prazo)
    );

    const rankingMapa = new Map<string, {
      nome: string;
      cotada: number;
      escolhida: number;
      cte: number;
      totalFrete: number;
      totalPrazo: number;
      percentualTotal: number;
      mantida: number;
      substituida: number;
    }>();

    pedidos.forEach((item: RegistroGenerico) => {
      const registrar = (nomeBruto: unknown, campo: 'cotada' | 'escolhida' | 'cte') => {
        const nome = String(nomeBruto ?? '').trim();
        if (!nome || nome.startsWith('Sem ')) {
          return;
        }
        const atual = rankingMapa.get(nome) ?? {
          nome,
          cotada: 0,
          escolhida: 0,
          cte: 0,
          totalFrete: 0,
          totalPrazo: 0,
          percentualTotal: 0,
          mantida: 0,
          substituida: 0
        };
        atual[campo] += 1;
        atual.totalFrete += Number(
          campo === 'cotada' ? item.valor_cotacao_automatica
            : campo === 'escolhida' ? item.valor_transportadora_escolhida
            : item.valor_cte
        );
        atual.totalPrazo += Number(
          campo === 'cotada' ? item.prazo_cotacao_automatica
            : campo === 'escolhida' ? item.prazo_transportadora_escolhida
            : item.prazo_cte
        );
        atual.percentualTotal += Number(item.percentual_frete_final ?? 0);
        if (campo === 'cte') {
          if (Boolean(item.houve_troca_transportadora)) {
            atual.substituida += 1;
          } else {
            atual.mantida += 1;
          }
        }
        rankingMapa.set(nome, atual);
      };

      registrar(item.transportadora_cotacao_automatica, 'cotada');
      registrar(item.transportadora_escolhida, 'escolhida');
      registrar(item.transportadora_cte, 'cte');
    });

    const rankingTransportadoras = [...rankingMapa.values()]
      .map((item) => ({
        ...item,
        freteMedio: item.cte + item.escolhida + item.cotada > 0 ? item.totalFrete / (item.cte + item.escolhida + item.cotada) : 0,
        prazoMedio: item.cte + item.escolhida + item.cotada > 0 ? item.totalPrazo / (item.cte + item.escolhida + item.cotada) : 0,
        percentualMedio: item.cte + item.escolhida + item.cotada > 0 ? item.percentualTotal / (item.cte + item.escolhida + item.cotada) : 0
      }))
      .sort((a, b) => b.cte - a.cte || b.escolhida - a.escolhida || b.cotada - a.cotada);

    const evolucaoMensalMapa = new Map<string, number>();
    pedidos.forEach((item: RegistroGenerico) => {
      const data = String(item.data_pedido ?? '').slice(0, 7);
      if (!data) {
        return;
      }
      evolucaoMensalMapa.set(data, (evolucaoMensalMapa.get(data) ?? 0) + Number(item.valor_cte ?? 0));
    });

    const distribuicaoPrazosMapa = new Map<string, number>();
    pedidos.forEach((item: RegistroGenerico) => {
      const prazo = Number(item.prazo_final ?? 0);
      const faixa = prazo <= 2 ? '0-2 dias' : prazo <= 5 ? '3-5 dias' : prazo <= 10 ? '6-10 dias' : '11+ dias';
      distribuicaoPrazosMapa.set(faixa, (distribuicaoPrazosMapa.get(faixa) ?? 0) + 1);
    });

    return {
      totalPedidos,
      valorTotalPedidos,
      valorTotalFreteCte,
      percentualMedioFretePedido,
      economiaAutomatica,
      economiaEscolhida,
      prazoMedioFinal,
      trocasTransportadora,
      divergencias,
      rankingTransportadoras,
      evolucaoMensalLista: [...evolucaoMensalMapa.entries()].map(([mes, valor]) => ({ mes, valor })),
      distribuicaoPrazosLista: [...distribuicaoPrazosMapa.entries()].map(([faixa, total]) => ({ faixa, total }))
    };
  }, [pedidos]);

  function classeDivergencia(valorPercentual: number) {
    const limite = Number(limiteAlertaPercentual || 5);
    if (valorPercentual <= 0) {
      return 'ok';
    }
    if (valorPercentual <= limite) {
      return 'alerta';
    }
    return 'critico';
  }

  function exportarCsvDashboard() {
    const linhas = [
      [
        'Pedido',
        'Cliente',
        'Cidade/UF',
        'Valor pedido',
        'Frete pedido',
        'Cotação automática',
        'Cotação transportadora',
        'Transportadora escolhida',
        'CT-e final',
        'Diferença R$ automática x CT-e',
        'Diferença % automática x CT-e',
        'Diferença R$ escolhida x CT-e',
        'Diferença % escolhida x CT-e',
        'Prazo cotado',
        'Prazo final',
        'Transportadora inicial',
        'Transportadora final',
        'Houve troca'
      ].join(';'),
      ...pedidos.map((item: RegistroGenerico) => [
        item.numero_pedido,
        item.cliente,
        `${String(item.cidade ?? '')}/${String(item.uf ?? '')}`,
        Number(item.valor_pedido ?? 0).toFixed(2).replace('.', ','),
        Number(item.valor_frete_pedido ?? 0).toFixed(2).replace('.', ','),
        Number(item.valor_cotacao_automatica ?? 0).toFixed(2).replace('.', ','),
        Number(item.valor_cotacao_transportadora ?? 0).toFixed(2).replace('.', ','),
        Number(item.valor_transportadora_escolhida ?? 0).toFixed(2).replace('.', ','),
        Number(item.valor_cte ?? 0).toFixed(2).replace('.', ','),
        Number(item.diferenca_automatica_cte ?? 0).toFixed(2).replace('.', ','),
        Number(item.diferenca_automatica_cte_percentual ?? 0).toFixed(2).replace('.', ','),
        Number(item.diferenca_escolhida_cte ?? 0).toFixed(2).replace('.', ','),
        Number(item.diferenca_escolhida_cte_percentual ?? 0).toFixed(2).replace('.', ','),
        Number(item.prazo_cotado ?? 0),
        Number(item.prazo_final ?? 0),
        item.transportadora_escolhida,
        item.transportadora_cte,
        item.houve_troca_transportadora ? 'Sim' : 'Não'
      ].join(';'))
    ].join('\n');

    const blob = new Blob([linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard_fretes_${obterDataIso(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="barraAcoesTela">
        <div>
          <span>Dashboard</span>
          <h2>Gestão de Fretes</h2>
        </div>
        <div className="acoesDashboard">
          <button className="ghost" onClick={() => setDocumentacaoAberta(true)}>Documentação</button>
          <button className="ghost" onClick={exportarCsvDashboard}>Exportar Excel</button>
          <BotaoAtualizar carregando={carregando} aoAtualizar={carregarDashboard} />
        </div>
      </div>
      <div className="filtrosLinha dashboardFiltros">
        <input type="date" value={dataInicial} onChange={(evento) => setDataInicial(evento.target.value)} />
        <input type="date" value={dataFinal} onChange={(evento) => setDataFinal(evento.target.value)} />
        <input placeholder="Vendedor" value={vendedorFiltro} onChange={(evento) => setVendedorFiltro(evento.target.value)} />
        <input placeholder="Cliente" value={clienteFiltro} onChange={(evento) => setClienteFiltro(evento.target.value)} />
        <input placeholder="Cidade" value={cidadeFiltro} onChange={(evento) => setCidadeFiltro(evento.target.value)} />
        <input placeholder="UF" value={ufFiltro} onChange={(evento) => setUfFiltro(evento.target.value.toUpperCase())} maxLength={2} />
        <input placeholder="Transportadora" value={transportadoraFiltro} onChange={(evento) => setTransportadoraFiltro(evento.target.value)} />
        <select value={statusFiltro} onChange={(evento) => setStatusFiltro(evento.target.value)}>
          <option value="">Todos os status</option>
          {statusDisponiveis.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <input placeholder="Pedido mín." type="number" value={valorPedidoMin} onChange={(evento) => setValorPedidoMin(evento.target.value)} />
        <input placeholder="Pedido máx." type="number" value={valorPedidoMax} onChange={(evento) => setValorPedidoMax(evento.target.value)} />
        <input placeholder="% frete mín." type="number" value={percentualFreteMin} onChange={(evento) => setPercentualFreteMin(evento.target.value)} />
        <input placeholder="% frete máx." type="number" value={percentualFreteMax} onChange={(evento) => setPercentualFreteMax(evento.target.value)} />
        <label className="toggleLinha"><input type="checkbox" checked={somenteTrocaTransportadora} onChange={(evento) => setSomenteTrocaTransportadora(evento.target.checked)} />Troca de transportadora</label>
        <label className="toggleLinha"><input type="checkbox" checked={somenteDivergenciaValor} onChange={(evento) => setSomenteDivergenciaValor(evento.target.checked)} />Divergência de valor</label>
        <label className="toggleLinha"><input type="checkbox" checked={somenteDivergenciaPrazo} onChange={(evento) => setSomenteDivergenciaPrazo(evento.target.checked)} />Divergência de prazo</label>
      </div>
      <div className="metrics metricsDashboardExecutivo">
        <article><span>Total de pedidos cotados</span><strong>{formatarNumero(dashboard.totalPedidos)}</strong></article>
        <article><span>Valor total dos pedidos</span><strong>{formatarMoeda(dashboard.valorTotalPedidos)}</strong></article>
        <article><span>Frete final CT-e</span><strong>{formatarMoeda(dashboard.valorTotalFreteCte)}</strong></article>
        <article><span>% médio do frete sobre o pedido</span><strong>{formatarPercentual(dashboard.percentualMedioFretePedido)}</strong></article>
        <article><span>Automática x CT-e</span><strong>{formatarMoeda(dashboard.economiaAutomatica)}</strong></article>
        <article><span>Escolhida x CT-e</span><strong>{formatarMoeda(dashboard.economiaEscolhida)}</strong></article>
        <article><span>Prazo médio final</span><strong>{dashboard.prazoMedioFinal.toFixed(1)} dias</strong></article>
        <article><span>Trocas até o CT-e</span><strong>{formatarNumero(dashboard.trocasTransportadora)}</strong></article>
      </div>
      <div className="dashboardExecutivoGrid">
        <div className="painelOperacional dashboardPainel">
          <div>
            <span>Visão geral</span>
            <h2>Resumo executivo</h2>
            <p>Comparativo entre pedido, cotação automática, resposta da transportadora, transportadora escolhida e CT-e final.</p>
          </div>
        </div>
        <div className="rankingPainel dashboardPainel">
          <span>Análise financeira do frete</span>
          <p>Diferença acumulada automática x CT-e: <strong>{formatarMoeda(dashboard.economiaAutomatica)}</strong></p>
          <p>Diferença acumulada escolhida x CT-e: <strong>{formatarMoeda(dashboard.economiaEscolhida)}</strong></p>
          <p>Pedidos com divergência: <strong>{formatarNumero(dashboard.divergencias.length)}</strong></p>
        </div>
        <div className="rankingPainel dashboardPainel">
          <span>Análise de prazo</span>
          <p>Prazo médio final: <strong>{dashboard.prazoMedioFinal.toFixed(1)} dias</strong></p>
          <p>Pedidos com prazo final maior que o cotado: <strong>{formatarNumero(pedidos.filter((item: RegistroGenerico) => Boolean(item.divergencia_prazo)).length)}</strong></p>
          <p>Trocas de transportadora até CT-e: <strong>{formatarNumero(dashboard.trocasTransportadora)}</strong></p>
        </div>
      </div>
      <div className="dashboardExecutivoGrid">
        <div className="rankingPainel dashboardPainel">
          <span>Ranking de transportadoras</span>
          {dashboard.rankingTransportadoras.slice(0, 8).map((item: RegistroGenerico) => (
            <div className="barraDashboard" key={String(item.nome)}>
              <strong>{String(item.nome)}</strong>
              <span style={{ width: `${Math.max(8, (Number(item.cte ?? 0) / Math.max(1, ...dashboard.rankingTransportadoras.map((linha: RegistroGenerico) => Number(linha.cte ?? 0)))) * 100)}%` }} />
              <small>{formatarNumero(item.cte)} CT-es</small>
            </div>
          ))}
        </div>
        <div className="rankingPainel dashboardPainel">
          <span>Evolução mensal do custo de frete</span>
          {dashboard.evolucaoMensalLista.length === 0 && <p>Nenhum dado no período selecionado.</p>}
          {dashboard.evolucaoMensalLista.map((item: RegistroGenerico) => (
            <div className="barraDashboard resposta" key={String(item.mes)}>
              <strong>{String(item.mes)}</strong>
              <span style={{ width: `${Math.max(8, (Number(item.valor ?? 0) / Math.max(1, ...dashboard.evolucaoMensalLista.map((linha: RegistroGenerico) => Number(linha.valor ?? 0)))) * 100)}%` }} />
              <small>{formatarMoeda(item.valor)}</small>
            </div>
          ))}
        </div>
        <div className="rankingPainel dashboardPainel">
          <span>Distribuição de prazos</span>
          {dashboard.distribuicaoPrazosLista.length === 0 && <p>Nenhum dado no período selecionado.</p>}
          {dashboard.distribuicaoPrazosLista.map((item: RegistroGenerico) => (
            <div className="barraDashboard" key={String(item.faixa)}>
              <strong>{String(item.faixa)}</strong>
              <span style={{ width: `${Math.max(8, (Number(item.total ?? 0) / Math.max(1, ...dashboard.distribuicaoPrazosLista.map((linha: RegistroGenerico) => Number(linha.total ?? 0)))) * 100)}%` }} />
              <small>{formatarNumero(item.total)} pedidos</small>
            </div>
          ))}
        </div>
      </div>
      <div className="dashboardExecutivoGrid">
        <div className="rankingPainel dashboardPainel dashboardPainelLargo">
          <span>Análise de divergências</span>
          <div className="tabelaWrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Automática</th>
                  <th>Escolhida</th>
                  <th>CT-e</th>
                  <th>Dif. automática</th>
                  <th>Dif. escolhida</th>
                  <th>Prazo final</th>
                  <th>Troca</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.divergencias.slice(0, 20).map((item: RegistroGenerico) => (
                  <tr key={String(item.cotacao_id)}>
                    <td>{String(item.numero_pedido ?? '-')}</td>
                    <td>{String(item.cliente ?? '-')}</td>
                    <td>{formatarMoeda(item.valor_cotacao_automatica)}</td>
                    <td>{formatarMoeda(item.valor_transportadora_escolhida)}</td>
                    <td>{formatarMoeda(item.valor_cte)}</td>
                    <td><span className={`pillDivergencia ${classeDivergencia(Number(item.diferenca_automatica_cte_percentual ?? 0))}`}>{formatarPercentual(item.diferenca_automatica_cte_percentual)}</span></td>
                    <td><span className={`pillDivergencia ${classeDivergencia(Number(item.diferenca_escolhida_cte_percentual ?? 0))}`}>{formatarPercentual(item.diferenca_escolhida_cte_percentual)}</span></td>
                    <td>{formatarNumero(item.prazo_final)} dias</td>
                    <td>{item.houve_troca_transportadora ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
                {dashboard.divergencias.length === 0 && (
                  <tr><td colSpan={9}>Nenhuma divergência encontrada com os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="rankingPainel dashboardPainel dashboardPainelLargo">
        <div className="cabecalhoTabelaDashboard">
          <span>Análise por pedido</span>
          <small>{pedidos.length} registro(s) · página {paginaAnaliseCorrigida}/{totalPaginasAnalisePedido}</small>
        </div>
        <div className="tabelaWrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Cidade/UF</th>
                <th>Valor do pedido</th>
                <th>Frete pedido</th>
                <th>Cotação aut.</th>
                <th>Cotação transp.</th>
                <th>Transp. escolhida</th>
                <th>CT-e final</th>
                <th>Dif. R$ aut. x CT-e</th>
                <th>Dif. % aut. x CT-e</th>
                <th>Dif. R$ escolhida x CT-e</th>
                <th>Dif. % escolhida x CT-e</th>
                <th>Prazo cotado</th>
                <th>Prazo final</th>
                <th>Inicial</th>
                <th>Final</th>
                <th>Troca</th>
              </tr>
            </thead>
            <tbody>
              {pedidosAnalisePagina.map((item: RegistroGenerico) => (
                <tr key={String(item.cotacao_id)}>
                  <td>{String(item.numero_pedido ?? '-')}</td>
                  <td>{String(item.cliente ?? '-')}</td>
                  <td>{String(item.cidade ?? '-')}/{String(item.uf ?? '-')}</td>
                  <td>{formatarMoeda(item.valor_pedido)}</td>
                  <td>{formatarMoeda(item.valor_frete_pedido)}</td>
                  <td>{formatarMoeda(item.valor_cotacao_automatica)}</td>
                  <td>{formatarMoeda(item.valor_cotacao_transportadora)}</td>
                  <td>{formatarMoeda(item.valor_transportadora_escolhida)}</td>
                  <td>{formatarMoeda(item.valor_cte)}</td>
                  <td className={Number(item.diferenca_automatica_cte ?? 0) > 0 ? 'economiaNegativa' : Number(item.diferenca_automatica_cte ?? 0) < 0 ? 'economiaPositiva' : ''}>{formatarMoeda(item.diferenca_automatica_cte)}</td>
                  <td className={Number(item.diferenca_automatica_cte_percentual ?? 0) > 0 ? 'economiaNegativa' : Number(item.diferenca_automatica_cte_percentual ?? 0) < 0 ? 'economiaPositiva' : ''}>{formatarPercentual(item.diferenca_automatica_cte_percentual)}</td>
                  <td className={Number(item.diferenca_escolhida_cte ?? 0) > 0 ? 'economiaNegativa' : Number(item.diferenca_escolhida_cte ?? 0) < 0 ? 'economiaPositiva' : ''}>{formatarMoeda(item.diferenca_escolhida_cte)}</td>
                  <td className={Number(item.diferenca_escolhida_cte_percentual ?? 0) > 0 ? 'economiaNegativa' : Number(item.diferenca_escolhida_cte_percentual ?? 0) < 0 ? 'economiaPositiva' : ''}>{formatarPercentual(item.diferenca_escolhida_cte_percentual)}</td>
                  <td>{formatarNumero(item.prazo_cotado)} dias</td>
                  <td>{formatarNumero(item.prazo_final)} dias</td>
                  <td>{String(item.transportadora_escolhida ?? '-')}</td>
                  <td>{String(item.transportadora_cte ?? '-')}</td>
                  <td>{item.houve_troca_transportadora ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr><td colSpan={18}>Nenhum pedido encontrado para os filtros selecionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="paginacaoLinha">
          <button className="ghost" disabled={paginaAnaliseCorrigida <= 1} onClick={() => setPaginaAnalisePedido((atual) => Math.max(1, atual - 1))}>Anterior</button>
          <button className="ghost" disabled={paginaAnaliseCorrigida >= totalPaginasAnalisePedido} onClick={() => setPaginaAnalisePedido((atual) => Math.min(totalPaginasAnalisePedido, atual + 1))}>Próxima</button>
        </div>
      </div>
      <PainelContextual
        aberto={documentacaoAberta}
        titulo="Documentação do Dashboard"
        subtitulo="Regras de cálculo, interpretação dos indicadores e orientação de uso."
        largura="amplo"
        aoFechar={() => setDocumentacaoAberta(false)}
      >
        <section className="historicoPainel documentacaoDashboard">
          <div className="documentacaoBloco">
            <h3>Objetivo</h3>
            <p>Dar visão gerencial do frete desde o valor do pedido até o CT-e final, destacando divergências de valor, prazo e troca de transportadora.</p>
          </div>
          <div className="documentacaoBloco">
            <h3>Métricas</h3>
            <ul>
              <li>% Frete sobre Pedido = valor_cte / valor_pedido * 100</li>
              <li>Diferença Cotação Automática x CT-e = valor_cte - valor_cotacao_automatica</li>
              <li>Diferença % Cotação Automática x CT-e = diferença / valor_cotacao_automatica * 100</li>
              <li>Diferença Escolhida x CT-e = valor_cte - valor_transportadora_escolhida</li>
              <li>Troca de Transportadora = transportadora_escolhida diferente de transportadora_cte</li>
              <li>Divergência de Prazo = prazo_cte maior que prazo_transportadora_escolhida</li>
            </ul>
          </div>
          <div className="documentacaoBloco">
            <h3>Como interpretar</h3>
            <ul>
              <li>Visão Geral acompanha o desempenho global.</li>
              <li>Divergências destaca perdas e inconsistências.</li>
              <li>Ranking de Transportadoras ajuda a medir competitividade e retenção até o CT-e.</li>
              <li>Verde: CT-e menor ou igual ao valor escolhido.</li>
              <li>Amarelo: diferença positiva até o limite configurado.</li>
              <li>Vermelho: diferença acima do limite configurado.</li>
            </ul>
          </div>
          <div className="documentacaoBloco">
            <h3>Filtros</h3>
            <p>Use período, cliente, cidade, UF, transportadora, status, faixa de valor e faixa percentual para reduzir a massa de análise. Os toggles isolam troca de transportadora, divergência de valor e divergência de prazo.</p>
          </div>
          <div className="documentacaoBloco">
            <h3>Exemplos práticos</h3>
            <ul>
              <li>Quando o CT-e sobe acima da automática, você identifica perda financeira.</li>
              <li>Quando a transportadora escolhida difere da do CT-e, você enxerga ruptura de execução.</li>
              <li>Quando o prazo final aumenta, você enxerga impacto operacional.</li>
            </ul>
          </div>
          <label>
            Limite percentual do alerta
            <input type="number" value={limiteAlertaPercentual} onChange={(evento) => setLimiteAlertaPercentual(evento.target.value)} />
          </label>
        </section>
      </PainelContextual>
    </section>
  );
}

function KanbanCotacoes({
  aoAbrirCotacao,
  ordemInicial,
  aoSalvarOrdem
}: {
  aoAbrirCotacao: (cotacaoId: string | number) => void;
  ordemInicial?: string[];
  aoSalvarOrdem?: (ordem: string[]) => void;
}) {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [etapasDisponiveis, setEtapasDisponiveis] = useState<RegistroGenerico[]>([]);
  const [erro, setErro] = useState('');
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [colunaArrastada, setColunaArrastada] = useState('');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [chaveFiltro, setChaveFiltro] = useState('');
  const [faturadoFiltro, setFaturadoFiltro] = useState('');
  const [multiplasCotacoesFiltro, setMultiplasCotacoesFiltro] = useState(false);
  const [fluxoLogisticoFiltro, setFluxoLogisticoFiltro] = useState('SOMENTE');
  const [somentePendentes, setSomentePendentes] = useState(true);
  const [etapasSelecionadas, setEtapasSelecionadas] = useState<string[]>(() => {
    const salvas = localStorage.getItem('controlSHubKanbanEtapas');
    return salvas ? JSON.parse(salvas) : [];
  });
  const [detalheKanban, setDetalheKanban] = useState<DetalheCotacaoNormalizado | null>(null);
  const [ordemColunas, setOrdemColunas] = useState<string[]>(() => {
    const salva = localStorage.getItem('controlSHubKanbanOrdem');
    return ordemInicial?.length ? ordemInicial : salva ? JSON.parse(salva) : [];
  });

  async function carregarKanban() {
    await listarKanbanCotacoes({ data_inicial: dataInicial, data_final: dataFinal, faturado: faturadoFiltro || undefined, multiplas_cotacoes: multiplasCotacoesFiltro ? 'true' : undefined, fluxo_logistico: fluxoLogisticoFiltro || undefined })
      .then(setLinhas)
      .catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar kanban.'));
  }

  useEffect(() => {
    carregarKanban();
    listarEtapas()
      .then((dados) => {
        const ativas = dados.filter((item: any) => Boolean(item.ativa) && etapasFluxoAtivas.has(String(item.codigo ?? '')));
        setEtapasDisponiveis(ativas);
        if (!etapasSelecionadas.length) {
          const codigos = ativas.map((item: any) => String(item.codigo));
          setEtapasSelecionadas(codigos);
          localStorage.setItem('controlSHubKanbanEtapas', JSON.stringify(codigos));
        }
      })
      .catch(() => setEtapasDisponiveis([]));
  }, []);

  function alternarEtapaKanban(codigo: string) {
    setEtapasSelecionadas((atuais) => {
      const nova = atuais.includes(codigo) ? atuais.filter((item) => item !== codigo) : [...atuais, codigo];
      localStorage.setItem('controlSHubKanbanEtapas', JSON.stringify(nova));
      return nova;
    });
  }

  async function moverCotacao(cotacaoId: string | number, etapaId: number) {
    const etapaDestino = etapasDisponiveis.find((item: any) => Number(item.id) === etapaId);
    let feedback = '';

    if (etapaDestino?.obriga_feedback) {
      feedback = window.prompt('Informe o feedback obrigatório para movimentar esta cotação:') ?? '';
      if (!feedback.trim()) {
        setErro('Feedback obrigatório para esta etapa.');
        return;
      }
    }

    setErro('');
    await alterarEtapaCotacao(cotacaoId, etapaId, feedback);
    await carregarKanban();
  }

  async function abrirDetalheKanban(cotacaoId: string | number) {
    setErro('');
    try {
      const detalheNormalizado = normalizarDetalheCotacao(await obterCotacao(String(cotacaoId)));
      if (!detalheNormalizado) {
        setErro('Cotação não encontrada para abrir os detalhes.');
        return;
      }
      setDetalheKanban(detalheNormalizado);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao abrir detalhe da cotação.');
    }
  }

  const linhasFiltradas = linhas.filter((linha: any) => {
    const codigoEtapa = String(linha.etapa_codigo ?? '');
    if (etapasSelecionadas.length && !etapasSelecionadas.includes(codigoEtapa)) {
      return false;
    }
    if (somentePendentes && ['CTE_EMITIDO', 'COTACAO_CANCELADA'].includes(codigoEtapa)) {
      return false;
    }
    const buscaChave = chaveFiltro.trim().toUpperCase();
    if (buscaChave) {
      const valores = [
        linha.codigo_chave,
        linha.numero_documento,
        linha.nome_destinatario,
        linha.numeros_nfe,
        linha.numero_nfe_faturada,
        linha.numeros_cte,
        linha.numero_cte,
        linha.transportadora_vencedora_nome,
        linha.transportadora_pedido_nome,
        linha.transportadora_cte_nome,
        linha.vendedor_nome
      ]
        .map((item: unknown) => String(item ?? '').toUpperCase());
      if (!valores.some((valor) => valor.includes(buscaChave))) {
        return false;
      }
    }
    return true;
  });

  const etapas = linhasFiltradas.reduce<Record<string, { etapa: RegistroGenerico; cards: RegistroGenerico[] }>>((acc, linha) => {
    const codigo = String(linha.etapa_codigo);
    if (!acc[codigo]) {
      acc[codigo] = { etapa: linha, cards: [] };
    }
    if (linha.cotacao_id) {
      acc[codigo].cards.push(linha);
    }
    return acc;
  }, {});
  const listaEtapas = Object.values(etapas).sort((a, b) => {
    const ia = ordemColunas.indexOf(String(a.etapa.etapa_codigo));
    const ib = ordemColunas.indexOf(String(b.etapa.etapa_codigo));
    if (ia === -1 && ib === -1) {
      return Number(a.etapa.etapa_ordem ?? 0) - Number(b.etapa.etapa_ordem ?? 0);
    }
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  function reordenarColuna(destino: string) {
    if (!colunaArrastada || colunaArrastada === destino) {
      return;
    }
    const codigos = listaEtapas.map((item: any) => String(item.etapa.etapa_codigo));
    const nova = codigos.filter((codigo) => codigo !== colunaArrastada);
    nova.splice(nova.indexOf(destino), 0, colunaArrastada);
    setOrdemColunas(nova);
    localStorage.setItem('controlSHubKanbanOrdem', JSON.stringify(nova));
    aoSalvarOrdem?.(nova);
    setColunaArrastada('');
  }

  if (erro) {
    return <div className="alerta">{erro}</div>;
  }

  return (
    <>
      <div className="filtrosLinha kanbanFiltros kanbanFiltrosPremium">
        <input type="date" value={dataInicial} onChange={(evento) => setDataInicial(evento.target.value)} />
        <input type="date" value={dataFinal} onChange={(evento) => setDataFinal(evento.target.value)} />
        <input placeholder="Pedido, chave, cliente, NF-e, CT-e, transportadora ou vendedor" value={chaveFiltro} onChange={(evento) => setChaveFiltro(evento.target.value)} />
        <label className="toggleLinha compacto" title="Mostra somente etapas em aberto, ocultando CT-e emitido e cotações canceladas.">
          <input type="checkbox" checked={somentePendentes} onChange={(evento) => setSomentePendentes(evento.target.checked)} />
          Pendentes
        </label>
        <label className="toggleLinha compacto" title="Mostra pedidos que possuem mais de uma chave de cotação.">
          <input type="checkbox" checked={multiplasCotacoesFiltro} onChange={(evento) => setMultiplasCotacoesFiltro(evento.target.checked)} />
          Mais de uma cotação
        </label>
        <select value={fluxoLogisticoFiltro} onChange={(evento) => setFluxoLogisticoFiltro(evento.target.value)} title="Filtra cotações conforme o lote de fluxo logístico do pedido.">
          <option value="">Fluxo: todos</option>
          <option value="SOMENTE">Somente com fluxo</option>
          <option value="SEM_PEDIDO">Pedidos sem fluxo</option>
        </select>
        <select value={faturadoFiltro} onChange={(evento) => setFaturadoFiltro(evento.target.value)}>
          <option value="">Faturamento: todos</option>
          <option value="SOMENTE">Somente faturados</option>
          <option value="EXCETO">Exceto faturados</option>
        </select>
        <button className="ghost" onClick={carregarKanban}>Filtrar</button>
      </div>
      <div className="etapasFiltroChips">
        <button className="ghost" onClick={() => {
          const todas = etapasDisponiveis.map((item: any) => String(item.codigo));
          setEtapasSelecionadas(todas);
          localStorage.setItem('controlSHubKanbanEtapas', JSON.stringify(todas));
        }}>Todas</button>
        {etapasDisponiveis.map((item: any) => {
          const codigo = String(item.codigo);
          const ativo = etapasSelecionadas.includes(codigo);
          return (
            <button
              className={`chipEtapaFiltro${ativo ? ' ativo' : ''}`}
              key={codigo}
              onClick={() => alternarEtapaKanban(codigo)}
              style={{ borderColor: String(item.cor ?? '#22c55e') }}
            >
              <span style={{ background: String(item.cor ?? '#22c55e') }} />
              {String(item.nome)}
            </button>
          );
        })}
      </div>
      <section className="kanban kanbanPremium">
        {listaEtapas.map(({ etapa, cards }) => (
          <div
          className="coluna"
          style={{ '--cor-etapa': String(etapa.etapa_cor ?? '#22c55e') } as CSSProperties}
          draggable
          key={String(etapa.etapa_codigo)}
          onDragStart={(evento) => {
            if ((evento.target as HTMLElement).className === 'coluna') {
              setColunaArrastada(String(etapa.etapa_codigo));
            }
          }}
          onDragOver={(evento) => evento.preventDefault()}
          onDrop={() => {
            if (colunaArrastada) {
              reordenarColuna(String(etapa.etapa_codigo));
            } else if (arrastandoId && etapa.etapa_id) {
              moverCotacao(arrastandoId, Number(etapa.etapa_id));
            }
          }}
          >
          <header>
            <div>
              <strong>{String(etapa.etapa_nome)}</strong>
              <small>Total R$ {cards.reduce((total, card) => total + Number(card.valor_mercadoria ?? 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</small>
            </div>
            <span>{cards.length}</span>
          </header>
          {cards.map((card) => (
            <article
              className="cartao"
              style={{ '--cor-etapa': String(card.etapa_cor ?? etapa.etapa_cor ?? '#22c55e') } as CSSProperties}
              key={String(card.cotacao_id)}
              draggable={!card.bloqueado_para_alteracao}
              onClick={() => abrirDetalheKanban(String(card.cotacao_id))}
              onDragStart={() => setArrastandoId(String(card.cotacao_id))}
            >
              <small>{String(card.tipo_documento)} {String(card.numero_documento)}</small>
              <small className="chaveKanban">Chave {String(card.codigo_chave ?? '-')}</small>
              <small>{String(card.origem_comercial ?? 'Banco')} · {String(card.situacao_pedido ?? 'ATIVO')}</small>
              <strong>{String(card.nome_destinatario ?? 'Destinatario')}</strong>
              <p>{String(card.cidade_destino ?? '')}/{String(card.uf_destino ?? '')}</p>
              <span>{formatarMoeda(card.valor_mercadoria ?? 0)}</span>
              <small>Pedido: {formatarMoeda(card.valor_frete_pedido ?? card.valor_frete_venda ?? 0)} · Prazo pedido: {String(card.prazo_pedido_dias ?? card.prazo_informado_venda_dias ?? 0)} dias</small>
              <b>{String(card.transportadora_vencedora_nome ?? 'Sem vencedora')}</b>
              <small>Menor frete {formatarMoeda(card.menor_frete ?? 0)}</small>
              <small>Respostas {String(card.total_respostas ?? 0)}/{String(card.total_transportadoras ?? 0)} · SLA vencido {String(card.total_sla_vencido ?? 0)}</small>
              {Number(card.total_transportadoras ?? 0) > Number(card.total_respostas ?? 0) && <em>Pendência externa</em>}
              {String(card.etapa_codigo) === 'EM_ANALISE' && <em>Ação interna: definir vencedor</em>}
              {(card.numeros_nfe || card.numero_nfe_faturada || Number(card.total_nfes ?? 0) > 0 || card.faturado_em) && <em className="tagFaturadoKanban">Faturado</em>}
              {card.lote_fluxo_logistico && <em className="tagFluxoLogisticoKanban">Fluxo {String(card.lote_fluxo_logistico)}</em>}
              {Number(card.total_outras_cotacoes ?? 0) > 0 && <em className="tagOutrasCotacoesKanban">Outras cotações</em>}
              {card.numeros_nfe && <small>NF-e {String(card.numeros_nfe)}</small>}
              {card.numeros_cte && <small>CTe {String(card.numeros_cte)}</small>}
              {card.bloqueado_para_alteracao && <em>Bloqueada Banco</em>}
            </article>
          ))}
          </div>
        ))}
      </section>
      <PainelContextual
        aberto={Boolean(detalheKanban)}
        largura="amplo"
        titulo={detalheKanban ? `${String(detalheKanban.cotacao.tipo_documento)} ${String(detalheKanban.cotacao.numero_documento)}` : 'Detalhe da seleção'}
        subtitulo={detalheKanban ? `Chave ${String(detalheKanban.cotacao.codigo_chave ?? '-')} · ${String(detalheKanban.cotacao.nome_destinatario ?? '-')}` : undefined}
        aoFechar={() => setDetalheKanban(null)}
      >
        {detalheKanban && <DetalheCotacaoConteudo detalhe={detalheKanban} usuario={null} aoAtualizar={async () => setDetalheKanban(normalizarDetalheCotacao(await obterCotacao(String(detalheKanban.cotacao.id))))} />}
      </PainelContextual>
    </>
  );
}

function TabelaOperacional({
  titulo,
  subtitulo,
  carregar,
  colunas,
  camposFormulario,
  salvar,
  excluir,
  aoSelecionar
}: {
  titulo: string;
  subtitulo: string;
  carregar: () => Promise<RegistroGenerico[]>;
  colunas: string[];
  camposFormulario?: { nome: string; rotulo: string; tipo?: 'text' | 'number' | 'checkbox' | 'select'; opcoes?: RegistroGenerico[]; valorOpcao?: string; textoOpcao?: string }[];
  salvar?: (dados: RegistroGenerico) => Promise<RegistroGenerico>;
  excluir?: (id: number) => Promise<RegistroGenerico>;
  aoSelecionar?: (linha: RegistroGenerico) => void;
}) {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [formulario, setFormulario] = useState<RegistroGenerico>({});
  const [registroEditando, setRegistroEditando] = useState<RegistroGenerico | null>(null);

  function recarregar() {
    return carregar()
      .then(setLinhas)
      .catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar dados.'));
  }

  useEffect(() => {
    recarregar();
  }, []);

  async function enviarFormulario(evento: FormEvent) {
    evento.preventDefault();
    if (!salvar) {
      return;
    }

    setErro('');
    setMensagem('');

    try {
      await salvar(formulario);
      setMensagem('Registro salvo com sucesso.');
      setFormulario({});
      setRegistroEditando(null);
      setFormularioAberto(false);
      await recarregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar registro.');
    }
  }

  function editarRegistro(linha: RegistroGenerico) {
    setRegistroEditando(linha);
    setFormulario(linha);
    setFormularioAberto(true);
  }

  async function excluirRegistro(linha: RegistroGenerico) {
    if (!excluir || !linha.id) {
      return;
    }

    setErro('');
    setMensagem('');

    try {
      await excluir(Number(linha.id));
      setMensagem('Registro excluido com sucesso.');
      await recarregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao excluir registro.');
    }
  }

  return (
    <section className="painelTabela">
      <header>
        <div>
          <span>Cadastro e controle</span>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        {camposFormulario && salvar && (
          <button className="primary" onClick={() => setFormularioAberto(!formularioAberto)}>
            {registroEditando ? 'Editando registro' : 'Novo registro'}
          </button>
        )}
      </header>
      {erro && <div className="alerta">{erro}</div>}
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {formularioAberto && camposFormulario && (
        <form className="formCadastro" onSubmit={enviarFormulario}>
          {camposFormulario.map((campo) => (
            <label key={campo.nome}>
              {campo.rotulo}
              {campo.tipo === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={Boolean(formulario[campo.nome])}
                  onChange={(evento) => setFormulario({ ...formulario, [campo.nome]: evento.target.checked })}
                />
              ) : campo.tipo === 'select' ? (
                <select value={String(formulario[campo.nome] ?? '')} onChange={(evento) => setFormulario({ ...formulario, [campo.nome]: Number(evento.target.value) })}>
                  <option value="">Selecione</option>
                  {(campo.opcoes ?? []).map((opcao) => (
                    <option key={String(opcao[campo.valorOpcao ?? 'id'])} value={String(opcao[campo.valorOpcao ?? 'id'])}>
                      {String(opcao[campo.textoOpcao ?? 'nome'])}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={campo.tipo ?? 'text'}
                  value={String(formulario[campo.nome] ?? '')}
                  onChange={(evento) => setFormulario({ ...formulario, [campo.nome]: campo.tipo === 'number' ? Number(evento.target.value) : evento.target.value })}
                />
              )}
            </label>
          ))}
          <button className="primary">Salvar</button>
          {registroEditando && (
            <button className="ghost" type="button" onClick={() => { setRegistroEditando(null); setFormulario({}); setFormularioAberto(false); }}>
              Cancelar
            </button>
          )}
        </form>
      )}
      <div className="tabelaWrap">
        <table>
          <thead>
            <tr>
              {colunas.map((coluna) => <th key={coluna}>{rotuloCampo(coluna)}</th>)}
              {(salvar || excluir) && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => (
              <tr key={String(linha.id ?? indice)} onClick={() => aoSelecionar?.(linha)}>
                {colunas.map((coluna) => (
                  <td key={coluna}>{renderizarValorCampo(coluna, linha[coluna], { semMoeda: true })}</td>
                ))}
                {(salvar || excluir) && (
                  <td className="acoesTabela">
                    {salvar && <button className="ghost" onClick={(evento) => { evento.stopPropagation(); editarRegistro(linha); }}>Alterar</button>}
                    {excluir && <button className="ghost danger" onClick={(evento) => { evento.stopPropagation(); excluirRegistro(linha); }}>Excluir</button>}
                  </td>
                )}
              </tr>
            ))}
            {linhas.length === 0 && !erro && (
              <tr>
                <td colSpan={colunas.length + (salvar || excluir ? 1 : 0)}>Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CotacoesOperacional({
  cotacaoInicialId,
  aoCotacaoInicialAberta,
  usuario
}: {
  cotacaoInicialId?: string | number | null;
  aoCotacaoInicialAberta?: () => void;
  usuario: UsuarioLogado;
}) {
  const [cotacoes, setCotacoes] = useState<RegistroGenerico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [detalhe, setDetalhe] = useState<DetalheCotacaoNormalizado | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('');
  const [transportadoraFiltro, setTransportadoraFiltro] = useState('');
  const [bloqueadoFiltro, setBloqueadoFiltro] = useState('');
  const [faturadoFiltro, setFaturadoFiltro] = useState('');
  const [multiplasCotacoesFiltro, setMultiplasCotacoesFiltro] = useState(false);
  const [fluxoLogisticoFiltro, setFluxoLogisticoFiltro] = useState('SOMENTE');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [dataInicial, setDataInicial] = useState(() => obterDataDiasAtras(30));
  const [dataFinal, setDataFinal] = useState(() => obterDataIso(new Date()));
  const [etapaFiltro, setEtapaFiltro] = useState('');
  const [etapasCadastro, setEtapasCadastro] = useState<RegistroGenerico[]>([]);
  const [abaCotacao, setAbaCotacao] = useState('VENDAS');
  const [timelineTexto, setTimelineTexto] = useState('');
  const [timelineImagem, setTimelineImagem] = useState('');
  const [timelineTranscricao, setTimelineTranscricao] = useState('');
  const [transportadorasCadastro, setTransportadorasCadastro] = useState<RegistroGenerico[]>([]);
  const [parametrosEscolha, setParametrosEscolha] = useState<Record<string, string>>({});
  const [motivosEscolha, setMotivosEscolha] = useState<RegistroGenerico[]>([]);
  const [transportadoraConfirmacao, setTransportadoraConfirmacao] = useState<RegistroGenerico | null>(null);
  const [transportadoraMotivo, setTransportadoraMotivo] = useState<RegistroGenerico | null>(null);
  const [motivoEscolhaManual, setMotivoEscolhaManual] = useState<RegistroGenerico | null>(null);
  const [erroEscolhaModal, setErroEscolhaModal] = useState('');
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [ultimoLinkGerado, setUltimoLinkGerado] = useState('');
  const [paginaCotacao, setPaginaCotacao] = useState(1);
  const [limiteCotacao, setLimiteCotacao] = useState(15);
  const [totalCotacoes, setTotalCotacoes] = useState(0);
  const [numeroDocumentoFiltro, setNumeroDocumentoFiltro] = useState('');
  const [numeroNfeFiltro, setNumeroNfeFiltro] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [cidadeFiltro, setCidadeFiltro] = useState('');
  const [codigoChaveFiltro, setCodigoChaveFiltro] = useState('');
  const [versaoTabelaCotacao, setVersaoTabelaCotacao] = useState(0);
  const pode = (codigo: string) => Boolean(usuario.superadmin || usuario.administrador || usuario.permissoes?.includes(codigo));

  async function carregar() {
    setCarregando(true);
    try {
      const retorno = await listarCotacoes({
        data_inicial: dataInicial,
        data_final: dataFinal,
        etapa_codigo: etapaFiltro,
        busca: busca || undefined,
        numero_documento: numeroDocumentoFiltro || undefined,
        numero_nfe: numeroNfeFiltro || undefined,
        cliente: clienteFiltro || undefined,
        cidade: cidadeFiltro || undefined,
        codigo_chave: codigoChaveFiltro || undefined,
        vendedor: vendedorFiltro || undefined,
        transportadora: transportadoraFiltro || undefined,
        bloqueado: bloqueadoFiltro || undefined,
        faturado: faturadoFiltro || undefined,
        multiplas_cotacoes: multiplasCotacoesFiltro ? 'true' : undefined,
        fluxo_logistico: fluxoLogisticoFiltro || undefined,
        pagina: String(paginaCotacao),
        limite: String(limiteCotacao)
      });
      const dados = Array.isArray(retorno) ? retorno : ((retorno as any).itens ?? []);
      setTotalCotacoes(Array.isArray(retorno) ? dados.length : Number((retorno as any).total ?? dados.length));
      setCotacoes(dados);
      return dados.filter((item: any) => {
        const texto = `${item.numero_documento ?? ''} ${item.numero_pedido ?? ''} ${item.codigo_chave ?? ''} ${item.nome_destinatario ?? ''} ${item.cidade_destino ?? ''} ${item.numeros_nfe ?? ''} ${item.numeros_cte ?? ''}`.toLowerCase();
        const bateBusca = !busca || texto.includes(busca.toLowerCase());
        return bateBusca;
      });
    } finally {
      setCarregando(false);
    }
  }

  async function abrir(linha: RegistroGenerico) {
    setErro('');
    setMensagem('');
    setHistoricoAberto(false);
    setUltimoLinkGerado('');
    setDetalhe(normalizarDetalheCotacao(await obterCotacao(String(linha.id))));
  }

  useEffect(() => {
    listarTransportadoras().then(setTransportadorasCadastro).catch(() => setTransportadorasCadastro([]));
    listarParametrosSistema().then((dados: any) => {
      const mapa: Record<string, string> = {};
      dados.forEach((item: any) => {
        mapa[String(item.chave)] = String(item.valor ?? '');
      });
      setParametrosEscolha(mapa);
    }).catch(() => setParametrosEscolha({}));
    listarMotivosEscolhaTransportadora().then(setMotivosEscolha).catch(() => setMotivosEscolha([]));
    listarEtapas()
      .then((dados) => setEtapasCadastro(dados.filter((item: any) => Boolean(item.ativa) && etapasFluxoAtivas.has(String(item.codigo ?? '')))))
      .catch(() => setEtapasCadastro([]));
  }, []);

  function obterBloqueioEscolha(transportadora: RegistroGenerico) {
    if (!detalhe?.cotacao || !cotacaoObrigaTransportadoraPedido(detalhe.cotacao, parametrosEscolha)) {
      return null;
    }

    if (obterTransportadoraId(transportadora) !== Number(detalhe.cotacao.transportadora_pedido_id ?? 0)) {
      return 'Origem obriga a transportadora do pedido.';
    }

    return null;
  }

  function montarMotivoEscolha(transportadora: RegistroGenerico, motivoSelecionado?: RegistroGenerico | null): { motivo_id?: number | null; motivo_descricao?: string | null } {
    if (!detalhe?.cotacao) {
      return {};
    }

    if (cotacaoObrigaTransportadoraPedido(detalhe.cotacao, parametrosEscolha)) {
      return {
        motivo_id: obterMotivoPadraoTransportadoraPedido(parametrosEscolha),
        motivo_descricao: 'Transportadora definida no pedido/origem comercial.'
      };
    }

    if (motivoEscolhaTransportadoraNaoVencedora(transportadora, detalhe.transportadoras)) {
      if (motivoSelecionado?.id || motivoSelecionado?.descricao) {
        return {
          motivo_id: motivoSelecionado.id ? Number(motivoSelecionado.id) : null,
          motivo_descricao: String(motivoSelecionado.descricao ?? '').trim()
        };
      }
      throw new Error('Selecione o motivo para escolher uma transportadora que não venceu a cotação.');
    }

    return {};
  }

  async function executarEscolhaTransportadora(transportadora: RegistroGenerico) {
    if (!detalhe?.cotacao.id) {
      return;
    }

    let dadosMotivo: { motivo_id?: number | null; motivo_descricao?: string | null } = montarMotivoEscolha(transportadora, motivoEscolhaManual);

    if (detalhe.cotacao.transportadora_escolhida_id || detalhe.cotacao.transportadora_escolhida) {
      await registrarTimelineCotacao(String(detalhe.cotacao.id), {
        transportadora_id: transportadora.transportadora_id ?? null,
        tipo_evento: 'ALTERACAO_TRANSPORTADORA_ESCOLHIDA',
        titulo: 'Alteração da transportadora escolhida',
        descricao: dadosMotivo.motivo_descricao ?? 'Transportadora escolhida alterada pelo usuário.'
      });
    }

    await escolherTransportadora(String(detalhe.cotacao.id), String(transportadora.id), dadosMotivo);
    setMensagem('Transportadora escolhida com sucesso.');
    setTransportadoraConfirmacao(null);
    setMotivoEscolhaManual(null);
    setErroEscolhaModal('');
    setDetalhe(normalizarDetalheCotacao(await obterCotacao(String(detalhe.cotacao.id))));
  }

  useEffect(() => {
    if (cotacaoInicialId) {
      abrir({ id: String(cotacaoInicialId) });
      aoCotacaoInicialAberta?.();
    }
  }, [cotacaoInicialId]);

  async function acao(tipo: 'escolher' | 'link', transportadora?: RegistroGenerico) {
    if (!detalhe?.cotacao.id) {
      return;
    }

    try {
      let linkGerado = '';
      let transportadoraLinkGerado = '';
      if (tipo === 'escolher' && transportadora?.id) {
        if (String(detalhe.cotacao.status ?? '').toUpperCase() === 'CTE_EMITIDO' || String(detalhe.cotacao.etapa_codigo ?? '').toUpperCase() === 'CTE_EMITIDO') {
          setErro('Cotação com CT-e emitido não permite alteração da transportadora escolhida.');
          return;
        }

        const origemAutomatica = ehCotacaoAutomatica(transportadora);
        const existeCotacaoTransportadora = detalhe.transportadoras.some((item: any) => ehCotacaoTransportadora(item) && Number(item.valor_frete ?? 0) > 0);

        if (origemAutomatica && existeCotacaoTransportadora) {
          const seguir = window.confirm('Esta cotação já possui cotação transportadora respondida. Deseja escolher a cotação automática mesmo assim?');
          if (!seguir) {
            return;
          }
        } else if (origemAutomatica && detalhe.cotacao.sugestao_cotacao) {
          const seguir = window.confirm('Esta cotação possui sugestão de cotação adicional. Deseja escolher a transportadora mesmo assim?');
          if (!seguir) {
            return;
          }
        }

        const bloqueioEscolha = obterBloqueioEscolha(transportadora);
        if (bloqueioEscolha) {
          setErroEscolhaModal(bloqueioEscolha);
          setTransportadoraConfirmacao(transportadora);
          return;
        }

        if (!cotacaoObrigaTransportadoraPedido(detalhe.cotacao, parametrosEscolha) && motivoEscolhaTransportadoraNaoVencedora(transportadora, detalhe.transportadoras)) {
          setTransportadoraMotivo(transportadora);
          return;
        }

        setTransportadoraConfirmacao(transportadora);
        return;
      }
      if (tipo === 'link') {
        const transportadoraId = Number(transportadora?.transportadora_id ?? String(transportadora?.id ?? '').split('|')[4] ?? 0);
        if (!transportadoraId) {
          setErro('Transportadora não identificada para gerar o link.');
          return;
        }
        const retorno = await gerarNovoLinkCotacao(String(detalhe.cotacao.id), transportadoraId);
        const urlGerada = String(retorno.url_publica ?? '');
        linkGerado = urlGerada;
        transportadoraLinkGerado = String(transportadoraId);
        setUltimoLinkGerado(urlGerada);
        setMensagem(`Novo link gerado: ${urlGerada}`);
        setDetalhe((atual) => atual ? {
          ...atual,
          transportadoras: atual.transportadoras.map((item) => (
            String(item.transportadora_id) === String(transportadoraId)
              ? { ...item, url_publica: urlGerada, token_status: 'ATIVO', status_envio: item.status_envio ?? 'ENVIADO' }
              : item
          ))
        } : atual);
      }
      const detalheAtualizado = normalizarDetalheCotacao(await obterCotacao(String(detalhe.cotacao.id)));
      if (!detalheAtualizado) {
        setDetalhe(null);
        return;
      }
      setDetalhe(linkGerado ? {
        ...detalheAtualizado,
        transportadoras: detalheAtualizado.transportadoras.map((item) => (
          String(item.transportadora_id) === transportadoraLinkGerado
            ? { ...item, url_publica: String(item.url_publica ?? linkGerado), token_status: item.token_status ?? 'ATIVO', status_envio: item.status_envio ?? 'ENVIADO' }
            : item
        ))
      } : detalheAtualizado);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha na operação.');
    }
  }

  async function editarValorManual(transportadora: RegistroGenerico) {
    if (!detalhe?.cotacao.id) {
      return;
    }

    const valor = window.prompt('Informe o novo valor do frete:', String(transportadora.valor_frete ?? ''));
    if (!valor) {
      return;
    }
    const prazo = window.prompt('Informe o prazo em dias, se houver:', String(transportadora.prazo_dias ?? '')) ?? '';
    const observacao = window.prompt('Observacao da alteracao manual:', 'Ajuste manual pelo usuario') ?? '';

    try {
      await alterarValorFreteManual(String(transportadora.id), Number(valor.replace(',', '.')), observacao, prazo ? Number(prazo) : null);
      setMensagem('Valor alterado manualmente com rastreabilidade.');
      setDetalhe(normalizarDetalheCotacao(await obterCotacao(String(detalhe.cotacao.id))));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao alterar valor.');
    }
  }

  async function copiarLink(link?: unknown) {
    if (!link) {
      return;
    }
    await copiarTexto(link);
    setMensagem('Link copiado para a área de transferência.');
  }

  async function adicionarTransportadora() {
    if (!detalhe?.cotacao.id) {
      return;
    }

    const opcoes = transportadorasCadastro
      .map((item: RegistroGenerico) => `${String(item.id)} - ${String(item.nome_fantasia ?? item.razao_social)}`)
      .join('\n');
    const resposta = window.prompt(`Informe o ID da transportadora para adicionar:\n${opcoes}`);
    const transportadoraId = Number(resposta);

    if (!transportadoraId) {
      return;
    }

    const observacao = window.prompt('Observação para inclusão da transportadora:', 'Transportadora adicionada para ampliar a concorrência.') ?? '';
    await adicionarTransportadoraCotacao(String(detalhe.cotacao.id), transportadoraId, observacao);
    setMensagem('Transportadora adicionada na cotação.');
    setDetalhe(normalizarDetalheCotacao(await obterCotacao(String(detalhe.cotacao.id))));
  }

  async function registrarObservacaoTimeline(transportadoraId?: number) {
    if (!detalhe?.cotacao.id) {
      return;
    }

    const descricao = window.prompt('Observação operacional da cotação:') ?? '';
    if (!descricao.trim()) {
      return;
    }

    await registrarTimelineCotacao(String(detalhe.cotacao.id), {
      transportadora_id: transportadoraId ?? null,
      tipo_evento: 'OBSERVACAO_OPERACIONAL',
      titulo: 'Observação operacional',
      descricao
    });
    setDetalhe(normalizarDetalheCotacao(await obterCotacao(String(detalhe.cotacao.id))));
    setMensagem('Observação registrada na timeline.');
  }

  function carregarImagemTimeline(arquivo?: File) {
    if (!arquivo) {
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => setTimelineImagem(String(leitor.result ?? ''));
    leitor.readAsDataURL(arquivo);
  }

  function iniciarDitadoTimeline() {
    const Reconhecimento = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Reconhecimento) {
      setErro('Este navegador não suporta transcrição de áudio.');
      return;
    }
    const reconhecimento = new Reconhecimento();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.interimResults = false;
    reconhecimento.onresult = (evento: any) => {
      const texto = String(evento.results?.[0]?.[0]?.transcript ?? '');
      setTimelineTranscricao(texto);
      setTimelineTexto((atual) => `${atual}${atual ? '\n' : ''}${texto}`);
    };
    reconhecimento.start();
  }

  async function enviarTimelineRica() {
    if (!detalhe?.cotacao.id || (!timelineTexto.trim() && !timelineImagem && !timelineTranscricao)) {
      return;
    }
    await registrarTimelineCotacao(String(detalhe.cotacao.id), {
      tipo_evento: 'OBSERVACAO_OPERACIONAL',
      titulo: 'Observação operacional',
      descricao: timelineTexto,
      tipo_midia: timelineImagem ? 'IMAGEM' : timelineTranscricao ? 'AUDIO_TRANSCRITO' : 'TEXTO',
      midia_base64: timelineImagem || null,
      transcricao_audio: timelineTranscricao || null
    });
    setTimelineTexto('');
    setTimelineImagem('');
    setTimelineTranscricao('');
    setDetalhe(normalizarDetalheCotacao(await obterCotacao(String(detalhe.cotacao.id))));
    setMensagem('Timeline atualizada.');
  }

  return (
    <>
      <div className="barraAcoesTela">
        <div>
          <span>Cotação de Frete</span>
          <h2>Consulta operacional</h2>
        </div>
        <div className="acoesDashboard">
          <button className="ghost" onClick={() => setFiltrosAbertos(!filtrosAbertos)}>{filtrosAbertos ? 'Recolher filtros' : 'Filtros'}</button>
          <BotaoAtualizar carregando={carregando} aoAtualizar={() => setVersaoTabelaCotacao((atual) => atual + 1)} />
        </div>
      </div>
      <div className="filtrosLinha">
        <input placeholder="Busca geral" value={busca} onChange={(evento) => { setBusca(evento.target.value); setPaginaCotacao(1); }} />
        <input type="date" value={dataInicial} onChange={(evento) => setDataInicial(evento.target.value)} />
        <input type="date" value={dataFinal} onChange={(evento) => setDataFinal(evento.target.value)} />
        <select value={etapaFiltro} onChange={(evento) => setEtapaFiltro(evento.target.value)}>
          <option value="">Todas as etapas</option>
          {etapasCadastro.map((item: RegistroGenerico) => <option key={String(item.codigo)} value={String(item.codigo)}>{String(item.nome)}</option>)}
        </select>
        <select value={bloqueadoFiltro} onChange={(evento) => setBloqueadoFiltro(evento.target.value)}>
          <option value="">Bloqueado: todos</option>
          <option value="NAO">Bloqueado: não</option>
          <option value="SIM">Bloqueado: sim</option>
        </select>
        <select value={faturadoFiltro} onChange={(evento) => { setFaturadoFiltro(evento.target.value); setPaginaCotacao(1); }}>
          <option value="">Faturamento: todos</option>
          <option value="SOMENTE">Somente faturados</option>
          <option value="EXCETO">Exceto faturados</option>
        </select>
        <label className="toggleLinha compacto" title="Mostra pedidos que possuem mais de uma chave de cotação.">
          <input type="checkbox" checked={multiplasCotacoesFiltro} onChange={(evento) => { setMultiplasCotacoesFiltro(evento.target.checked); setPaginaCotacao(1); }} />
          Mais de uma cotação
        </label>
        <select value={fluxoLogisticoFiltro} onChange={(evento) => { setFluxoLogisticoFiltro(evento.target.value); setPaginaCotacao(1); }} title="Filtra cotações conforme o lote de fluxo logístico do pedido.">
          <option value="">Fluxo: todos</option>
          <option value="SOMENTE">Somente com fluxo</option>
          <option value="SEM_PEDIDO">Pedidos sem fluxo</option>
        </select>
      </div>
      {filtrosAbertos && (
        <div className="filtrosLinha">
          <input placeholder="Pedido/documento" value={numeroDocumentoFiltro} onChange={(evento) => { setNumeroDocumentoFiltro(evento.target.value); setPaginaCotacao(1); }} />
          <input placeholder="Número NF-e" value={numeroNfeFiltro} onChange={(evento) => { setNumeroNfeFiltro(evento.target.value); setPaginaCotacao(1); }} />
          <input placeholder="Cliente" value={clienteFiltro} onChange={(evento) => { setClienteFiltro(evento.target.value); setPaginaCotacao(1); }} />
          <input placeholder="Cidade" value={cidadeFiltro} onChange={(evento) => { setCidadeFiltro(evento.target.value); setPaginaCotacao(1); }} />
          <input placeholder="Chave" value={codigoChaveFiltro} onChange={(evento) => { setCodigoChaveFiltro(evento.target.value); setPaginaCotacao(1); }} />
          <input placeholder="Vendedor" value={vendedorFiltro} onChange={(evento) => setVendedorFiltro(evento.target.value)} />
          <input placeholder="Transportadora" value={transportadoraFiltro} onChange={(evento) => setTransportadoraFiltro(evento.target.value)} />
        </div>
      )}
      <TabelaOperacional
        key={`${busca}-${numeroDocumentoFiltro}-${numeroNfeFiltro}-${clienteFiltro}-${cidadeFiltro}-${codigoChaveFiltro}-${bloqueadoFiltro}-${faturadoFiltro}-${multiplasCotacoesFiltro}-${fluxoLogisticoFiltro}-${vendedorFiltro}-${transportadoraFiltro}-${dataInicial}-${dataFinal}-${etapaFiltro}-${paginaCotacao}-${limiteCotacao}-${versaoTabelaCotacao}`}
        titulo="Cotações de Frete"
        subtitulo="Clique em uma cotação para abrir o detalhe operacional, comparar transportadoras e acompanhar o fluxo completo."
        carregar={carregar}
        colunas={['tipo_documento', 'numero_documento', 'codigo_chave', 'lote_fluxo_logistico', 'status', 'etapa_nome', 'nome_destinatario', 'cidade_destino', 'valor_mercadoria', 'bloqueado_para_alteracao']}
        aoSelecionar={abrir}
      />
      <div className="paginacaoLinha">
        <span>{totalCotacoes} registro(s) · página {paginaCotacao}/{Math.max(1, Math.ceil(totalCotacoes / limiteCotacao))}</span>
        <select value={limiteCotacao} onChange={(evento) => { setLimiteCotacao(Number(evento.target.value)); setPaginaCotacao(1); }}>
          <option value={15}>15 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
          <option value={200}>200 por página</option>
        </select>
        <button className="ghost" disabled={paginaCotacao <= 1} onClick={() => setPaginaCotacao((atual) => Math.max(1, atual - 1))}>Anterior</button>
        <button className="ghost" disabled={paginaCotacao >= Math.max(1, Math.ceil(totalCotacoes / limiteCotacao))} onClick={() => setPaginaCotacao((atual) => Math.min(Math.max(1, Math.ceil(totalCotacoes / limiteCotacao)), atual + 1))}>Próxima</button>
      </div>
      {erro && <div className="alerta">{erro}</div>}
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {ultimoLinkGerado && (
        <div className="sucesso linkValidacao">
          <span>Link interno de validação disponível.</span>
          <button className="ghost" onClick={() => copiarLink(ultimoLinkGerado)}>Copiar link</button>
          <button className="ghost" onClick={() => window.open(ultimoLinkGerado, '_blank')}>Visualizar link enviado</button>
        </div>
      )}
      <PainelContextual
        aberto={Boolean(detalhe)}
        largura="amplo"
        titulo={detalhe ? `${String(detalhe.cotacao.tipo_documento)} ${String(detalhe.cotacao.numero_documento)}` : 'Detalhe da cotação'}
        subtitulo={detalhe ? `Chave ${String(detalhe.cotacao.codigo_chave ?? '-')} · ${String(detalhe.cotacao.nome_destinatario ?? '-')}` : undefined}
        aoFechar={() => setDetalhe(null)}
      >
        {detalhe && <DetalheCotacaoConteudo detalhe={detalhe} usuario={usuario} aoAtualizar={async () => setDetalhe(normalizarDetalheCotacao(await obterCotacao(String(detalhe.cotacao.id))))} />}
        {false && null}
      </PainelContextual>
      <ModalConfirmacaoEscolha
        aberto={Boolean(transportadoraConfirmacao)}
        transportadora={transportadoraConfirmacao}
        erro={erroEscolhaModal}
        aoCancelar={() => {
          setTransportadoraConfirmacao(null);
          setErroEscolhaModal('');
        }}
        aoConfirmar={() => transportadoraConfirmacao ? executarEscolhaTransportadora(transportadoraConfirmacao).catch((error) => setErroEscolhaModal(error instanceof Error ? error.message : 'Falha ao escolher transportadora.')) : undefined}
      />
      <ModalSelecaoMotivoEscolha
        aberto={Boolean(transportadoraMotivo)}
        transportadora={transportadoraMotivo}
        motivos={motivosEscolha}
        aoCancelar={() => setTransportadoraMotivo(null)}
        aoSelecionar={(motivo) => {
          const transportadora = transportadoraMotivo;
          setMotivoEscolhaManual(motivo);
          setErroEscolhaModal('');
          setTransportadoraMotivo(null);
          setTransportadoraConfirmacao(transportadora);
        }}
      />
    </>
  );
}

function formatarMoeda(valor: unknown) {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function interpretarMoedaBrasileira(valor: unknown) {
  const texto = String(valor ?? '').trim();
  if (!texto) {
    return 0;
  }
  const normalizado = texto
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : NaN;
}

function compararValorFreteRanking(a: RegistroGenerico, b: RegistroGenerico) {
  const valorA = Number(a.valor_frete ?? 0);
  const valorB = Number(b.valor_frete ?? 0);
  const validoA = valorA > 0;
  const validoB = valorB > 0;
  if (validoA !== validoB) {
    return validoA ? -1 : 1;
  }
  return valorA - valorB;
}

function formatarNumero(valor: unknown, casas = 0) {
  return Number(valor ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function formatarPercentual(valor: unknown) {
  const numero = Number(valor ?? 0);
  return `${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatarDataBrasileira(valor: unknown) {
  if (!valor) {
    return '0';
  }
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }
  return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatarDataHoraBrasileira(valor: unknown) {
  if (!valor) {
    return '0';
  }
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }
  return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

const rotulosCampos: Record<string, string> = {
  origem_comercial: 'Origem comercial',
  lote_fluxo_logistico: 'Lote Fluxo Logístico',
  total_outras_cotacoes: 'Outras cotações',
  criado_em: 'Cotação criada em',
  vendedor_nome: 'Vendedor',
  data_documento: 'Data do documento',
  valor_frete_venda: 'Frete pedido',
  valor_frete_pedido: 'Frete pedido',
  prazo_informado_venda_dias: 'Prazo pedido',
  prazo_pedido_dias: 'Prazo pedido',
  valor_mercadoria: 'Valor mercadoria',
  nome_destinatario: 'Destinatário',
  cidade_destino: 'Cidade destino',
  uf_destino: 'UF destino',
  transportadora_pedido_nome: 'Transportadora pedido',
  transportadora_escolhida: 'Transportadora escolhida',
  valor_frete_final: 'Frete escolhido',
  prazo_final_dias: 'Prazo escolhido',
  motivo_escolha_transportadora_descricao: 'Motivo da escolha',
  aprovado_em: 'Escolhido em',
  escolhido_em: 'Escolhido em',
  observacao_analista: 'Observação',
  transportadora_cte_nome: 'Transportadora CT-e',
  numeros_cte: 'Números CT-e',
  total_ctes: 'Total CT-e',
  valor_frete_cte_total: 'Frete CT-e',
  ultimo_cte_em: 'Último CT-e em',
  tipo_documento: 'Tipo documento',
  numero_documento: 'Documento',
  numero_pedido: 'Número pedido',
  status: 'Status',
  loja_origem: 'Loja faturamento',
  loja_destino: 'Loja coleta',
  peso_real: 'Peso real',
  volumes_total: 'Volumes total',
  cubagem_total: 'Cubagem total',
  percentual_sobre_nf: 'Percentual sobre o total',
  cep_destino: 'CEP destino',
  endereco_destinatario: 'Endereço destinatário',
  documento_destinatario: 'Documento destinatário',
  destino_zona_rural: 'Destino zona rural',
  destinatario_pessoa_fisica: 'Destinatário pessoa física',
  bloqueado_para_alteracao: 'Bloqueado',
  etapa_nome: 'Etapa',
  ativa: 'Ativa',
  administrador: 'Administrador',
  superadmin: 'Superadmin',
  aceita_cotacao_externa: 'Aceita cotação externa',
  apresenta_menor_cotacao: 'Mostrar menor cotação',
  apresenta_cubagem: 'Mostrar cubagem',
  apresenta_peso: 'Mostrar peso',
  apresenta_valor_tabela: 'Mostrar valor tabela',
  recebe_prazo_solicitado: 'Mostrar prazo pedido',
  exige_prazo_resposta: 'Solicitar prazo',
  prazo_resposta_obrigatorio: 'Prazo obrigatório',
  apresenta_lista_produtos: 'Mostrar produtos',
  permite_arrastar: 'Permite arrastar',
  etapa_final: 'Etapa final',
  etapa_bloqueada: 'Etapa bloqueada',
  obriga_feedback: 'Obriga feedback'
};

const camposMoeda = new Set([
  'valor_mercadoria',
  'valor_frete_venda',
  'valor_frete_pedido',
  'valor_frete_final',
  'valor_frete_cte_total',
  'valorfrete_cte',
  'valorfrete_nfe',
  'valor_solicitado',
  'valor_frete',
  'valor_tabela',
  'valor_cte',
  'valor_cotacao_automatica',
  'valor_cotacao_transportadora',
  'valor_transportadora_escolhida',
  'diferenca_automatica_cte',
  'diferenca_escolhida_cte',
  'diferenca_valor_cotacao'
]);

const camposPercentuais = new Set([
  'percentual_sobre_nf',
  'percentual_frete_pedido',
  'percentual_frete_cotacao_automatica',
  'diferenca_percentual_cotacao',
  'diferenca_automatica_cte_percentual',
  'diferenca_escolhida_cte_percentual'
]);

const camposData = new Set(['data_documento', 'data_pedido', 'data_nfe', 'data_cte']);
const camposDataHora = new Set(['criado_em', 'alterado_em', 'aprovado_em', 'escolhido_em', 'ultimo_cte_em', 'respondida_em', 'enviado_em']);
const camposDecimais = new Set(['peso_real', 'cubagem_total', 'cubagem_item', 'largura', 'altura', 'comprimento', 'volumes_total']);
const camposDias = new Set(['prazo_informado_venda_dias', 'prazo_pedido_dias', 'prazo_final_dias', 'prazo_dias', 'prazo_cte', 'prazo_cotado', 'prazo_final']);

function rotuloCampo(campo: string) {
  return rotulosCampos[campo] ?? campo.replace(/_/g, ' ');
}

function renderizarValorCampo(campo: string, valor: unknown, opcoes?: { semMoeda?: boolean }) {
  if (typeof valor === 'boolean') {
    return <input type="checkbox" checked={valor} readOnly disabled />;
  }

  if (valor === null || valor === undefined || valor === '') {
    return camposMoeda.has(campo) ? (opcoes?.semMoeda ? '0,00' : formatarMoeda(0)) : '0';
  }

  if (camposDataHora.has(campo)) {
    return formatarDataHoraBrasileira(valor);
  }

  if (camposData.has(campo)) {
    return formatarDataBrasileira(valor);
  }

  if (camposPercentuais.has(campo)) {
    return formatarPercentual(valor);
  }

  if (camposMoeda.has(campo)) {
    return opcoes?.semMoeda ? formatarNumero(valor, 2) : formatarMoeda(valor);
  }

  if (camposDias.has(campo)) {
    return `${formatarNumero(valor)} dia(s)`;
  }

  if (camposDecimais.has(campo)) {
    return formatarNumero(valor, 2);
  }

  return String(valor);
}

function percentualContraBase(valor: unknown, base: unknown) {
  const valorNumero = Number(valor ?? 0);
  const baseNumero = Number(base ?? 0);
  if (!valorNumero || !baseNumero) {
    return '-';
  }
  const percentual = ((valorNumero / baseNumero) - 1) * 100;
  return `${percentual > 0 ? '+' : ''}${percentual.toFixed(2)}%`;
}

function origemCotacaoAutomatica(origem: unknown) {
  const texto = String(origem ?? '').trim().toUpperCase();
  return ['BANCO', 'AUTOMATICA', 'ERP'].includes(texto);
}

function origemCotacaoTransportadora(origem: unknown) {
  return !origemCotacaoAutomatica(origem);
}

function statusCotacaoTransportadora(status: unknown) {
  const texto = String(status ?? '').trim().toUpperCase();
  return ['COTACAO_TRANSPORTADORA_RECEBIDA', 'RESPONDIDA', 'ALTERADA_MANUALMENTE'].includes(texto);
}

function ehCotacaoTransportadora(item: RegistroGenerico) {
  const origemDetalhada = String(item.origem_detalhada ?? '').trim().toUpperCase();
  return origemDetalhada === 'DIGITACAO_ERP' || origemCotacaoTransportadora(item.origem_cotacao) || statusCotacaoTransportadora(item.status);
}

function ehCotacaoAutomatica(item: RegistroGenerico) {
  const origemDetalhada = String(item.origem_detalhada ?? '').trim().toUpperCase();
  if (origemDetalhada === 'DIGITACAO_ERP') {
    return false;
  }
  return (origemDetalhada === 'COTACAO_AUTOMATICA' || origemCotacaoAutomatica(item.origem_cotacao)) && !statusCotacaoTransportadora(item.status);
}

function obterTransportadoraEscolhidaReal(cotacao: RegistroGenerico, transportadoras: RegistroGenerico[]) {
  if (!cotacao) {
    return null;
  }

  const selecionada = transportadoras.find((item: any) =>
    Boolean(item.selecionada)
    || ['SELECIONADA', 'ESCOLHIDA'].includes(String(item.status ?? '').toUpperCase())
  );

  if (selecionada) {
    return selecionada;
  }

  if (cotacao.escolhido_em || cotacao.escolhido_por_usuario_id) {
    return transportadoras.find((item: any) => Number(item.transportadora_id ?? 0) === Number(cotacao.transportadora_escolhida_id ?? 0)) ?? null;
  }

  return null;
}

function obterTransportadoraId(item?: RegistroGenerico | null) {
  const candidatos = [
    item?.transportadora_id,
    item?.id && String(item.id).includes('|') ? String(item.id).split('|')[4] : null,
    item?.id
  ];

  for (const candidato of candidatos) {
    const numero = Number(candidato);
    if (Number.isFinite(numero) && numero > 0) {
      return numero;
    }
  }

  return 0;
}

function podeRemoverTransportadoraCotacao(item?: RegistroGenerico | null) {
  if (!item) {
    return false;
  }

  const valor = Number(item.valor_frete ?? 0);
  const status = String(item.status ?? '').toUpperCase();
  const origem = String(item.origem_cotacao ?? '').toUpperCase();

  return valor === 0
    && !item.respondida_em
    && !item.validada
    && !item.selecionada
    && !item.escolhida_plataforma
    && ['MANUAL', 'EXTERNA'].includes(origem)
    && !['RESPONDIDA', 'SELECIONADA', 'ALTERADA_MANUALMENTE', 'COTACAO_TRANSPORTADORA_RECEBIDA'].includes(status);
}

function obterAutomaticaReferenciaEscolhida(cotacao: RegistroGenerico, transportadoras: RegistroGenerico[]) {
  const automaticas = transportadoras
    .filter((item) => ehCotacaoAutomatica(item) && Number(item.valor_frete ?? 0) > 0)
    .sort((a, b) => Number(a.valor_frete ?? 0) - Number(b.valor_frete ?? 0));

  return automaticas[0] ?? null;
}

function listarOrigensObrigatorias(parametros: Record<string, string>) {
  return String(parametros.ORIGENS_OBRIGAM_TRANSPORTADORA_PEDIDO ?? '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function cotacaoObrigaTransportadoraPedido(cotacao: RegistroGenerico, parametros: Record<string, string>) {
  const origem = String(cotacao.origem_comercial ?? '').trim().toUpperCase();
  return Boolean(cotacao.transportadora_pedido_id) && listarOrigensObrigatorias(parametros).includes(origem);
}

function obterMotivoPadraoTransportadoraPedido(parametros: Record<string, string>) {
  const motivoId = Number(parametros.MOTIVO_PADRAO_TRANSPORTADORA_PEDIDO_ID ?? 0);
  return motivoId > 0 ? motivoId : null;
}

function obterMenorValorCotacao(transportadoras: RegistroGenerico[]) {
  const valores = transportadoras
    .map((item) => Number(item.valor_frete ?? 0))
    .filter((valor) => valor > 0);
  return valores.length ? Math.min(...valores) : 0;
}

function motivoEscolhaTransportadoraNaoVencedora(transportadora: RegistroGenerico, transportadoras: RegistroGenerico[]) {
  const menorValor = obterMenorValorCotacao(transportadoras);
  const valorAtual = Number(transportadora.valor_frete ?? 0);
  return menorValor > 0 && valorAtual > menorValor;
}

function classeComparacaoFrete(valor: unknown, base: unknown) {
  const valorNumero = Number(valor ?? 0);
  const baseNumero = Number(base ?? 0);
  if (valorNumero === 0 && baseNumero === 0) {
    return 'comparacaoNeutra';
  }
  return valorNumero > baseNumero ? 'economiaNegativa' : 'economiaPositiva';
}

function montarIdCotacaoLocal(cotacao?: RegistroGenerico | null) {
  if (!cotacao) {
    return '';
  }

  const idAtual = cotacao.id;
  if (idAtual && String(idAtual).includes('|')) {
    return String(idAtual);
  }

  const empresaId = cotacao.empresa_id ?? cotacao.empresaId ?? 1;
  const tipoDocumento = cotacao.tipo_documento;
  const numeroDocumento = cotacao.numero_documento;
  const codigoChave = cotacao.codigo_chave;

  if (empresaId && tipoDocumento && numeroDocumento && codigoChave) {
    return `${String(empresaId)}|${String(tipoDocumento)}|${String(numeroDocumento)}|${String(codigoChave)}`;
  }

  return idAtual ? String(idAtual) : '';
}

function normalizarDetalheCotacao(detalhe: {
  cotacao: RegistroGenerico;
  itens: RegistroGenerico[];
  transportadoras: RegistroGenerico[];
  historicos: RegistroGenerico[];
  timeline?: RegistroGenerico[];
  notasFiscais?: RegistroGenerico[];
  ctes?: RegistroGenerico[];
  outrasCotacoes?: RegistroGenerico[];
} | null) {
  if (!detalhe?.cotacao) {
    return null;
  }

  const transportadoras = Array.isArray(detalhe.transportadoras) ? detalhe.transportadoras : [];
  const ctes = Array.isArray(detalhe.ctes) ? detalhe.ctes : [];
  const escolhidaReal = obterTransportadoraEscolhidaReal(detalhe.cotacao, transportadoras);
  const ctePrincipal = [...ctes]
    .sort((a: any, b: any) => {
      const valorB = Number(b.valorfrete_cte ?? 0);
      const valorA = Number(a.valorfrete_cte ?? 0);
      if (valorB !== valorA) {
        return valorB - valorA;
      }
      return String(b.numero_cte ?? '').localeCompare(String(a.numero_cte ?? ''));
    })[0];

  return {
    ...detalhe,
    cotacao: {
      ...detalhe.cotacao,
      id: montarIdCotacaoLocal(detalhe.cotacao),
      transportadora_escolhida: escolhidaReal?.nome_fantasia ?? detalhe.cotacao.transportadora_escolhida ?? null,
      valor_frete_final: escolhidaReal
        ? Number(detalhe.cotacao.valor_frete_final ?? escolhidaReal.valor_frete ?? 0)
        : 0,
      prazo_final_dias: escolhidaReal
        ? Number(detalhe.cotacao.prazo_final_dias ?? escolhidaReal.prazo_dias ?? 0)
        : 0,
      transportadora_cte_nome: ctePrincipal?.transportadora_cte_nome ?? detalhe.cotacao.transportadora_cte_nome ?? null,
      total_outras_cotacoes: Number(detalhe.cotacao.total_outras_cotacoes ?? detalhe.outrasCotacoes?.length ?? 0),
      prazo_cte_dias: Number(detalhe.cotacao.prazo_cte_dias ?? 0) || 0
    }
  };
}

function ComparativoFases({ cotacao, transportadoras }: { cotacao: RegistroGenerico; transportadoras: RegistroGenerico[] }) {
  const valorPedido = Number(cotacao.valor_frete_pedido ?? cotacao.valor_frete_venda ?? cotacao.valor_solicitado ?? 0);
  const prazoPedido = Number(cotacao.prazo_pedido_dias ?? cotacao.prazo_informado_venda_dias ?? cotacao.prazo_vendedor_dias ?? 0);
  const automatica = obterAutomaticaReferenciaEscolhida(cotacao, transportadoras);
  const resposta = transportadoras.find((item: any) => ehCotacaoTransportadora(item) && Number(item.valor_frete ?? 0) > 0);
  const valorCte = Number(cotacao.valor_frete_cte_total ?? 0);
  const economiaPedidoCte = valorPedido - valorCte;
  const economiaAutomaticaCte = Number(automatica?.valor_frete ?? 0) - valorCte;
  const fases = [
    {
      titulo: 'Pedido',
      detalhe: String(cotacao.transportadora_pedido_nome ?? 'Sem transportadora definida'),
      valor: cotacao.valor_frete_pedido,
      prazo: cotacao.prazo_pedido_dias
    },
    {
      titulo: 'Cotação automática',
      detalhe: String(automatica?.nome_fantasia ?? '-'),
      valor: automatica?.valor_frete,
      prazo: automatica?.prazo_dias
    },
    {
      titulo: 'Cotação transportadora',
      detalhe: String(resposta?.nome_fantasia ?? '-'),
      valor: resposta?.valor_frete,
      prazo: resposta?.prazo_dias
    },
    {
      titulo: 'Transportadora escolhida',
      detalhe: String(cotacao.transportadora_escolhida ?? '-'),
      valor: cotacao.valor_frete_final,
      prazo: cotacao.prazo_final_dias
    },
    {
      titulo: 'CT-e',
      detalhe: String(cotacao.transportadora_cte_nome ?? cotacao.numeros_cte ?? 'Sem CT-e'),
      valor: cotacao.valor_frete_cte_total,
      prazo: cotacao.prazo_cte_dias
    }
  ];

  return (
    <section className="comparativoFases">
      {fases.map((fase) => {
        const prazo = Number(fase.prazo ?? 0);
        const diferencaPrazo = prazo && prazoPedido ? prazo - prazoPedido : null;
        const valorFase = Number(fase.valor ?? 0);
        const economiaEscolhidaAut = Number(automatica?.valor_frete ?? 0) - valorFase;
        return (
          <article key={fase.titulo}>
            <span>{fase.titulo}</span>
            <strong>{formatarMoeda(fase.valor)}</strong>
            <small>{fase.detalhe}</small>
            <em className={fase.titulo === 'Pedido' ? undefined : classeComparacaoFrete(fase.valor, valorPedido)}>
              {percentualContraBase(fase.valor, valorPedido)} vs Pedido
            </em>
            {fase.titulo !== 'Pedido' && valorPedido === 0 && valorFase > 0 && (
              <em className="economiaNegativa">Prejuízo Pedido: {formatarMoeda(valorFase)}</em>
            )}
            {fase.titulo !== 'Pedido' && valorPedido > 0 && valorFase !== valorPedido && (
              <em className={valorFase > valorPedido ? 'economiaNegativa' : 'economiaPositiva'}>
                {valorFase > valorPedido ? 'Prejuízo Pedido' : 'Ganho Pedido'}: {formatarMoeda(Math.abs(valorPedido - valorFase))}
              </em>
            )}
            <b>{fase.prazo ? `${String(fase.prazo)} dias` : '0 dia(s)'}{diferencaPrazo !== null ? ` · ${diferencaPrazo > 0 ? '+' : ''}${diferencaPrazo} dia(s) vs Pedido` : ''}</b>
            {fase.titulo === 'CT-e' && (
              <>
                <em className={economiaPedidoCte >= 0 ? 'economiaPositiva' : 'economiaNegativa'}>Economia Pedido: {formatarMoeda(economiaPedidoCte)}</em>
                <em>vs Cotação Aut.</em>
                <em className={economiaAutomaticaCte >= 0 ? 'economiaPositiva' : 'economiaNegativa'}>Economia Cotação Aut: {formatarMoeda(economiaAutomaticaCte)}</em>
              </>
            )}
            {fase.titulo === 'Transportadora escolhida' && Number(automatica?.valor_frete ?? 0) > 0 && (
              <em className={economiaEscolhidaAut >= 0 ? 'economiaPositiva' : 'economiaNegativa'}>
                vs Cotação Aut.: {formatarMoeda(economiaEscolhidaAut)}
              </em>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ResumoInicialCotacao({ cotacao }: { cotacao: RegistroGenerico }) {
  return (
    <section className="resumoInicialCotacao">
      <article><span>Origem</span><strong>{String(cotacao.origem_comercial ?? '-')}</strong></article>
      <article><span>Pedido</span><strong>{formatarMoeda(cotacao.valor_frete_pedido)}</strong><small>{String(cotacao.prazo_pedido_dias ?? 0)} dias · {String(cotacao.transportadora_pedido_nome ?? '-')}</small></article>
      <article><span>Escolhido</span><strong>{formatarMoeda(cotacao.valor_frete_final)}</strong><small>{String(cotacao.prazo_final_dias ?? 0)} dias · {String(cotacao.transportadora_escolhida ?? '-')}</small></article>
      <article><span>CT-e</span><strong>{formatarMoeda(cotacao.valor_frete_cte_total)}</strong><small>{String(cotacao.transportadora_cte_nome ?? cotacao.numeros_cte ?? 'Sem CT-e')}</small></article>
    </section>
  );
}

function AbaCampos({ titulo, cotacao, campos }: { titulo: string; cotacao: RegistroGenerico; campos: string[] }) {
  return (
    <section className="abaPainel">
      <h3>{titulo}</h3>
      <div className="dadosCotacaoGrid compacto">
        {campos.map((campo) => (
          <div key={campo}>
            <small>{rotuloCampo(campo)}</small>
            <strong>{renderizarValorCampo(campo, cotacao[campo])}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function AbaTransportadoras({
  titulo,
  cotacao,
  transportadoras,
  pode,
  copiarLink,
  acao,
  editarValorManual,
  registrarObservacaoTimeline,
  removerTransportadora,
  bloqueioEscolha,
  escolhaBloqueada
}: {
  titulo: string;
  cotacao: RegistroGenerico;
  transportadoras: RegistroGenerico[];
  pode: (codigo: string) => boolean;
  copiarLink: (link?: unknown) => Promise<void>;
  acao: (tipo: 'escolher' | 'link', transportadora: RegistroGenerico) => Promise<void>;
  editarValorManual: (transportadora: RegistroGenerico) => Promise<void>;
  registrarObservacaoTimeline: (transportadoraId?: number) => Promise<void>;
  removerTransportadora?: (transportadora: RegistroGenerico) => Promise<void>;
  bloqueioEscolha?: (transportadora: RegistroGenerico) => string | null;
  escolhaBloqueada?: boolean;
}) {
  const [verTodas, setVerTodas] = useState(false);
  const ordenadas = [...transportadoras].sort(compararValorFreteRanking);
  const exibidas = verTodas ? ordenadas : ordenadas.slice(0, 3);
  const valorPedidoBase = cotacao.valor_frete_pedido ?? cotacao.valor_frete_venda ?? cotacao.valor_solicitado;

  return (
    <section className="abaPainel">
      <header>
        <div>
          <small>Ranking da etapa</small>
          <h3>{titulo}</h3>
        </div>
        {ordenadas.length > 3 && <button className="ghost" onClick={() => setVerTodas(!verTodas)}>{verTodas ? 'Ver Top 3' : 'Ver todas'}</button>}
      </header>
      <PodioCotacao transportadoras={ordenadas} />
      <div className="comparativo compacto listaRankingAba">
        {exibidas.map((transportadora, indice) => {
          const motivoBloqueio = escolhaBloqueada
            ? 'CT-e emitido. A escolha da transportadora está bloqueada.'
            : bloqueioEscolha?.(transportadora) ?? null;
          return (
            <article className={`${indice === 0 ? 'primeiro' : indice === 1 ? 'segundo' : indice === 2 ? 'terceiro' : ''} ${motivoBloqueio ? 'cotacaoCardBloqueada' : ''}`} key={`${String(transportadora.id ?? transportadora.transportadora_id ?? transportadora.nome_fantasia ?? 'transportadora')}-${String(transportadora.origem_cotacao ?? indice)}-${indice}`}>
              <small>{indice + 1}º lugar · {String(transportadora.origem_cotacao ?? '-')}</small>
              <strong>{String(transportadora.nome_fantasia ?? '-')}</strong>
              <span>{formatarMoeda(transportadora.valor_frete)}</span>
              <small>{percentualContraBase(transportadora.valor_frete, valorPedidoBase)} vs Pedido</small>
              <small>Prazo {String(transportadora.prazo_dias ?? 0)} dias</small>
              {transportadora.numero_cotacao_transportadora && <small>Nº cotação: {String(transportadora.numero_cotacao_transportadora)}</small>}
              <small>Status: {String(transportadora.status ?? transportadora.status_envio ?? '-')}</small>
              {indice === 0 && Number(transportadora.valor_frete ?? 0) > 0 && <small className="pillDivergencia ok">Melhor oferta</small>}
              {motivoBloqueio && <small className="pillDivergencia neutro">{motivoBloqueio}</small>}
              {transportadora.url_publica && <small className="linkQuebra">Link enviado: {String(transportadora.url_publica)}</small>}
              <div>
                {transportadora.url_publica && pode('COPIAR_LINK_COTACAO') && <button className="ghost" onClick={() => copiarLink(transportadora.url_publica)}>Copiar link</button>}
                {transportadora.url_publica && <button className="ghost" onClick={() => window.open(String(transportadora.url_publica), '_blank')}>Visualizar link</button>}
                {pode('GERAR_TOKEN_COTACAO_FRETE') && <button className="ghost" onClick={() => acao('link', transportadora)}>Gerar novo link</button>}
                {pode('ALTERAR_COTACAO_MANUAL') && ehCotacaoTransportadora(transportadora) && (
                  <button className="ghost" onClick={() => editarValorManual(transportadora)}>Alterar valor</button>
                )}
                {removerTransportadora && podeRemoverTransportadoraCotacao(transportadora) && (
                  <button className="ghost danger" onClick={() => removerTransportadora(transportadora)}>Remover</button>
                )}
                {pode('REGISTRAR_TIMELINE_COTACAO') && <button className="ghost" onClick={() => registrarObservacaoTimeline(Number(transportadora.transportadora_id))}>Observação</button>}
                {pode('ESCOLHER_TRANSPORTADORA') && <button className="primary" disabled={Boolean(motivoBloqueio)} onClick={() => acao('escolher', transportadora)}>Escolher</button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DetalhamentoCompletoCotacao({ cotacao, itens, notasFiscais, ctes, outrasCotacoes }: { cotacao: RegistroGenerico; itens: RegistroGenerico[]; notasFiscais?: RegistroGenerico[]; ctes?: RegistroGenerico[]; outrasCotacoes?: RegistroGenerico[] }) {
  const campos = [
    'origem_comercial', 'lote_fluxo_logistico', 'vendedor_nome', 'tipo_documento', 'numero_documento',
    'numero_pedido', 'data_documento', 'status', 'valor_mercadoria',
    'loja_origem', 'loja_destino', 'peso_real', 'volumes_total', 'cubagem_total',
    'nome_destinatario', 'documento_destinatario', 'endereco_destinatario',
    'cep_destino', 'cidade_destino', 'uf_destino',
    'destino_zona_rural', 'destinatario_pessoa_fisica', 'bloqueado_para_alteracao'
  ];

  return (
    <details className="detalhamentoCompleto">
      <summary>Dados completos e produtos da cotação</summary>
      <div className="dadosCotacaoGrid compacto">
        {campos.map((campo) => (
          <div key={campo}>
            <small>{rotuloCampo(campo)}</small>
            <strong>{renderizarValorCampo(campo, cotacao[campo])}</strong>
          </div>
        ))}
      </div>
      <div className="itensCotacaoPainel">
        <span>Produtos da cotação</span>
        <div className="tabelaWrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Cubagem</th>
                <th>Largura</th>
                <th>Altura</th>
                <th>Comprimento</th>
                <th>Peso</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, indice) => (
                <tr key={indice}>
                  <td>{String(item.codigo_item ?? '-')}</td>
                  <td>{String(item.descricao_item ?? '-')}</td>
                  <td>{String(item.quantidade ?? '-')}</td>
                  <td>{String(item.cubagem_item ?? '-')}</td>
                  <td>{String(item.largura ?? '-')}</td>
                  <td>{String(item.altura ?? '-')}</td>
                  <td>{String(item.comprimento ?? '-')}</td>
                  <td>{String(item.peso_item ?? '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <TabelaDocumentosFiscais titulo="Notas fiscais vinculadas" dados={notasFiscais ?? []} colunas={['numero_nfe', 'chave_nfe', 'data_nfe', 'finalidade_nfe', 'valorfrete_nfe', 'alterado_em']} />
      <TabelaDocumentosFiscais titulo="CT-es vinculados" dados={ctes ?? []} colunas={['numero_cte', 'chave_cte', 'transportadora_cte_nome', 'data_cte', 'finalidade_cte', 'valorfrete_cte', 'alterado_em']} />
      <TabelaDocumentosFiscais titulo="Outras cotações do Pedido" dados={outrasCotacoes ?? []} colunas={['tipo_documento', 'numero_documento', 'codigo_chave', 'lote_fluxo_logistico', 'criado_em', 'status', 'etapa_nome', 'valor_mercadoria']} />
    </details>
  );
}

function montarTextoSugestaoCotacao(cotacao: RegistroGenerico, linhaEnvio?: RegistroGenerico) {
  const base = linhaEnvio ?? cotacao;
  const motivoCalculado = String(base.motivo_sugestao_cotacao ?? cotacao.motivo_sugestao_cotacao ?? '').trim();
  if (motivoCalculado) {
    return motivoCalculado;
  }
  if (!Boolean(base.sugestao_cotacao)) {
    return 'Sem sugestão crítica calculada para esta cotação.';
  }

  const motivos: string[] = [];
  const fretePedido = Number(base.valor_frete_pedido ?? cotacao.valor_frete_pedido ?? 0);
  const freteAutomatico = Number(base.valor_cotacao_automatica ?? cotacao.valor_cotacao_automatica ?? 0);
  const diferencaValor = Number(base.diferenca_valor_cotacao ?? (freteAutomatico - fretePedido));
  const diferencaPercentual = Number(base.diferenca_percentual_cotacao ?? (fretePedido > 0 ? ((freteAutomatico - fretePedido) / fretePedido) * 100 : 0));
  const prazoPedido = Number(base.prazo_pedido_dias ?? cotacao.prazo_pedido_dias ?? 0);
  const prazoAutomatico = Number(base.prazo_cotacao_automatica ?? 0);

  if (freteAutomatico > 0 && fretePedido > 0 && freteAutomatico > fretePedido) {
    motivos.push(`Diferença frete cotado: cotação automática ${formatarMoeda(freteAutomatico)} contra pedido ${formatarMoeda(fretePedido)}.`);
  }
  if (diferencaValor > 0) {
    motivos.push(`Diferença em valor: ${formatarMoeda(diferencaValor)} acima do pedido.`);
  }
  if (diferencaPercentual > 0) {
    motivos.push(`Diferença percentual: ${formatarPercentual(diferencaPercentual)} acima do pedido.`);
  }
  if (prazoAutomatico > prazoPedido && prazoPedido > 0) {
    motivos.push(`Diferença no prazo: cotação automática ${prazoAutomatico} dia(s), pedido ${prazoPedido} dia(s).`);
  }

  return motivos.length ? motivos.join(' ') : 'Sem sugestão crítica calculada para esta cotação.';
}

function agruparPreparacaoPorTransportadora(preparacao: RegistroGenerico[]) {
  const mapa = new Map<string, { chave: string; transportadoraId: number; nome: string; email: string; itens: RegistroGenerico[] }>();

  for (const item of preparacao) {
    const transportadoraId = Number(item.transportadora_id ?? 0);
    const chave = String(transportadoraId || item.nome_fantasia || 'SEM_TRANSPORTADORA');
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        transportadoraId,
        nome: String(item.nome_fantasia ?? 'Transportadora'),
        email: String(item.email ?? ''),
        itens: []
      });
    }
    mapa.get(chave)!.itens.push(item);
  }

  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

function criarEmailsPadraoPorTransportadora(preparacao: RegistroGenerico[]) {
  const grupos = agruparPreparacaoPorTransportadora(preparacao);
  return grupos.reduce<Record<string, string>>((acc, grupo) => {
    acc[grupo.chave] = `
      <div style="font-family:Arial,sans-serif;color:#172033">
        <p>Olá, ${grupo.nome}.</p>
        <p>Solicitamos a cotação de frete dos documentos abaixo:</p>
        <p>DOCUMENTOS</p>
        <br></br>
        <p>Atenciosamente.</p>
      </div>
    `.trim();
    return acc;
  }, {});
}

function montarTabelaDocumentosPreview(itens: RegistroGenerico[]) {
  return `
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;color:#172033" border="1" cellpadding="6">
      <thead>
        <tr>
          <th align="left">Documento</th>
          <th align="left">Chave</th>
          <th align="right">Valor referência</th>
          <th align="left">Validade do Link</th>
          <th align="left">Link</th>
        </tr>
      </thead>
      <tbody>
        ${itens.map((item) => (
          `<tr><td>${String(item.numero_documento)}</td><td>${String(item.codigo_chave)}</td><td align="right">${formatarMoeda(item.valor_frete ?? 0)}</td><td>será definida no envio</td><td>O link será gerado no envio.</td></tr>`
        )).join('')}
      </tbody>
    </table>
  `;
}

function DetalheCotacaoConteudo({
  detalhe,
  usuario,
  aoAtualizar
}: {
  detalhe: DetalheCotacaoNormalizado;
  usuario: UsuarioLogado | null;
  aoAtualizar: () => Promise<void>;
}) {
  const [aba, setAba] = useState('VENDAS');
  const [mensagemLink, setMensagemLink] = useState('');
  const [erroLink, setErroLink] = useState('');
  const [transportadorasCadastro, setTransportadorasCadastro] = useState<RegistroGenerico[]>([]);
  const [seletorTransportadoraAberto, setSeletorTransportadoraAberto] = useState(false);
  const [erroSeletorTransportadora, setErroSeletorTransportadora] = useState('');
  const [parametrosEscolha, setParametrosEscolha] = useState<Record<string, string>>({});
  const [motivosEscolha, setMotivosEscolha] = useState<RegistroGenerico[]>([]);
  const [transportadoraConfirmacao, setTransportadoraConfirmacao] = useState<RegistroGenerico | null>(null);
  const [transportadoraMotivo, setTransportadoraMotivo] = useState<RegistroGenerico | null>(null);
  const [motivoEscolhaManual, setMotivoEscolhaManual] = useState<RegistroGenerico | null>(null);
  const [erroEscolhaModal, setErroEscolhaModal] = useState('');
  const pode = (codigo: string) => Boolean(!usuario || usuario.superadmin || usuario.administrador || usuario.permissoes?.includes(codigo));

  useEffect(() => {
    listarTransportadoras().then(setTransportadorasCadastro).catch(() => setTransportadorasCadastro([]));
    listarParametrosSistema().then((dados: any) => {
      const mapa: Record<string, string> = {};
      dados.forEach((item: any) => {
        mapa[String(item.chave)] = String(item.valor ?? '');
      });
      setParametrosEscolha(mapa);
    }).catch(() => setParametrosEscolha({}));
    listarMotivosEscolhaTransportadora().then(setMotivosEscolha).catch(() => setMotivosEscolha([]));
  }, []);

  function obterBloqueioEscolha(transportadora: RegistroGenerico) {
    if (!cotacaoObrigaTransportadoraPedido(detalhe.cotacao, parametrosEscolha)) {
      return null;
    }

    if (obterTransportadoraId(transportadora) !== Number(detalhe.cotacao.transportadora_pedido_id ?? 0)) {
      return 'Origem obriga a transportadora do pedido.';
    }

    return null;
  }

  function montarMotivoEscolha(transportadora: RegistroGenerico, motivoSelecionado?: RegistroGenerico | null): { motivo_id?: number | null; motivo_descricao?: string | null } {
    if (cotacaoObrigaTransportadoraPedido(detalhe.cotacao, parametrosEscolha)) {
      return {
        motivo_id: obterMotivoPadraoTransportadoraPedido(parametrosEscolha),
        motivo_descricao: 'Transportadora definida no pedido/origem comercial.'
      };
    }

    if (motivoEscolhaTransportadoraNaoVencedora(transportadora, detalhe.transportadoras)) {
      if (motivoSelecionado?.id || motivoSelecionado?.descricao) {
        return {
          motivo_id: motivoSelecionado.id ? Number(motivoSelecionado.id) : null,
          motivo_descricao: String(motivoSelecionado.descricao ?? '').trim()
        };
      }
      throw new Error('Selecione o motivo para escolher uma transportadora que não venceu a cotação.');
    }

    return {};
  }

  async function copiarLink(link?: unknown) {
    if (!link) {
      return;
    }
    await copiarTexto(link);
  }

  async function escolher(transportadora: RegistroGenerico) {
    if (String(detalhe.cotacao.status ?? '').toUpperCase() === 'CTE_EMITIDO' || String(detalhe.cotacao.etapa_codigo ?? '').toUpperCase() === 'CTE_EMITIDO') {
      setErroEscolhaModal('Cotação com CT-e emitido não permite alteração da transportadora escolhida.');
      setTransportadoraConfirmacao(transportadora);
      return;
    }

    const bloqueioEscolha = obterBloqueioEscolha(transportadora);
    if (bloqueioEscolha) {
      setErroEscolhaModal(bloqueioEscolha);
      setTransportadoraConfirmacao(transportadora);
      return;
    }

    if (!cotacaoObrigaTransportadoraPedido(detalhe.cotacao, parametrosEscolha) && motivoEscolhaTransportadoraNaoVencedora(transportadora, detalhe.transportadoras)) {
      setTransportadoraMotivo(transportadora);
      return;
    }

    setTransportadoraConfirmacao(transportadora);
  }

  async function confirmarEscolhaTransportadora(transportadora: RegistroGenerico) {
    if (String(detalhe.cotacao.status ?? '').toUpperCase() === 'CTE_EMITIDO' || String(detalhe.cotacao.etapa_codigo ?? '').toUpperCase() === 'CTE_EMITIDO') {
      setErroEscolhaModal('Cotação com CT-e emitido não permite alteração da transportadora escolhida.');
      return;
    }

    let dadosMotivo: { motivo_id?: number | null; motivo_descricao?: string | null } = montarMotivoEscolha(transportadora, motivoEscolhaManual);

    if (detalhe.cotacao.transportadora_escolhida_id || detalhe.cotacao.transportadora_escolhida) {
      await registrarTimelineCotacao(String(detalhe.cotacao.id), {
        transportadora_id: transportadora.transportadora_id ?? null,
        tipo_evento: 'ALTERACAO_TRANSPORTADORA_ESCOLHIDA',
        titulo: 'Alteração da transportadora escolhida',
        descricao: dadosMotivo.motivo_descricao ?? 'Transportadora escolhida alterada pelo usuário.'
      });
    }

    await escolherTransportadora(String(detalhe.cotacao.id), String(transportadora.id), dadosMotivo);
    setTransportadoraConfirmacao(null);
    setMotivoEscolhaManual(null);
    setErroEscolhaModal('');
    await aoAtualizar();
  }

  async function acaoTransportadora(tipo: 'escolher' | 'link', transportadora: RegistroGenerico) {
    if (tipo === 'escolher') {
      await escolher(transportadora);
      return;
    }

    setErroLink('');
    setMensagemLink('');
    const transportadoraId = Number(transportadora.transportadora_id ?? String(transportadora.id ?? '').split('|')[4] ?? 0);
    if (!transportadoraId) {
      setErroLink('Transportadora não identificada para gerar o link.');
      return;
    }

    try {
      const retorno = await gerarNovoLinkCotacao(String(detalhe.cotacao.id), transportadoraId);
      const urlPublica = String(retorno.url_publica ?? '');
      setMensagemLink(`Novo link gerado: ${urlPublica}`);
      await aoAtualizar();
    } catch (error) {
      setErroLink(error instanceof Error ? error.message : 'Falha ao gerar link da transportadora.');
    }
  }

  async function vincularTransportadoraDetalhe(transportadora: RegistroGenerico) {
    const transportadoraId = obterTransportadoraId(transportadora);
    if (!transportadoraId) {
      setErroSeletorTransportadora('Transportadora sem identificador válido para vincular.');
      return;
    }

    const jaVinculada = detalhe.transportadoras.some((item: RegistroGenerico) => String(item.transportadora_id ?? item.id) === String(transportadoraId));
    if (jaVinculada) {
      setErroSeletorTransportadora('Essa transportadora já está vinculada na cotação.');
      return;
    }

    try {
      await adicionarTransportadoraCotacao(String(detalhe.cotacao.id), transportadoraId, 'Transportadora adicionada pela aba Cotação Transportadora.');
      setSeletorTransportadoraAberto(false);
      setErroSeletorTransportadora('');
      setMensagemLink('Transportadora vinculada para cotação.');
      await aoAtualizar();
    } catch (error) {
      setErroSeletorTransportadora(error instanceof Error ? error.message : 'Falha ao vincular transportadora.');
    }
  }

  async function editarValorManualDetalhe(transportadora: RegistroGenerico) {
    const valor = window.prompt('Informe o novo valor do frete:', String(transportadora.valor_frete ?? ''));
    if (!valor) {
      return;
    }
    const prazo = window.prompt('Informe o prazo em dias, se houver:', String(transportadora.prazo_dias ?? '')) ?? '';
    const observacao = window.prompt('Observação da alteração manual:', 'Ajuste manual pelo usuário') ?? '';

    await alterarValorFreteManual(String(transportadora.id), Number(valor.replace(',', '.')), observacao, prazo ? Number(prazo) : null);
    setMensagemLink('Valor/prazo alterado manualmente com rastreabilidade.');
    await aoAtualizar();
  }

  async function removerTransportadoraDetalhe(transportadora: RegistroGenerico) {
    if (!podeRemoverTransportadoraCotacao(transportadora)) {
      setErroSeletorTransportadora('Somente transportadoras adicionadas sem valor e sem resposta podem ser removidas.');
      return;
    }

    const confirmar = window.confirm('Remover esta transportadora adicionada sem valor da cotação?');
    if (!confirmar) {
      return;
    }

    try {
      await excluirTransportadoraCotacao(String(detalhe.cotacao.id), String(transportadora.id));
      setMensagemLink('Transportadora removida da cotação.');
      setErroSeletorTransportadora('');
      await aoAtualizar();
    } catch (error) {
      setErroSeletorTransportadora(error instanceof Error ? error.message : 'Falha ao remover transportadora.');
    }
  }

  async function registrarObservacaoTimelineDetalhe(transportadoraId?: number) {
    const descricao = window.prompt('Observação operacional da cotação:') ?? '';
    if (!descricao.trim()) {
      return;
    }

    await registrarTimelineCotacao(String(detalhe.cotacao.id), {
      transportadora_id: transportadoraId ?? null,
      tipo_evento: 'OBSERVACAO_OPERACIONAL',
      titulo: 'Observação operacional',
      descricao
    });
    setMensagemLink('Observação registrada na timeline.');
    await aoAtualizar();
  }

  return (
    <section className="detalheCotacao detalheCotacaoContextual">
      <header>
        <div>
          <span>Detalhe operacional</span>
          <h2>{String(detalhe.cotacao.tipo_documento)} {String(detalhe.cotacao.numero_documento)}</h2>
          <p>{String(detalhe.cotacao.nome_destinatario ?? '')} - {String(detalhe.cotacao.cidade_destino ?? '')}/{String(detalhe.cotacao.uf_destino ?? '')}</p>
          <p className="metaDetalheCotacao">Cotação criada em: {formatarDataHoraBrasileira(detalhe.cotacao.criado_em)}</p>
        </div>
        <div className="statusRapidoDetalhe">
          {String(detalhe.cotacao.etapa_nome ?? detalhe.cotacao.status ?? '').trim() && <i className="tagStatusDetalhe etapaKanban">{String(detalhe.cotacao.etapa_nome ?? detalhe.cotacao.status)}</i>}
          {(detalhe.cotacao.numeros_nfe || detalhe.cotacao.numero_nfe_faturada || Number(detalhe.cotacao.total_nfes ?? 0) > 0 || detalhe.cotacao.faturado_em) && <i className="tagStatusDetalhe faturado">Faturado</i>}
          {detalhe.cotacao.lote_fluxo_logistico && <i className="tagStatusDetalhe fluxoLogistico">Fluxo {String(detalhe.cotacao.lote_fluxo_logistico)}</i>}
          {Number(detalhe.cotacao.total_outras_cotacoes ?? detalhe.outrasCotacoes?.length ?? 0) > 0 && <i className="tagStatusDetalhe outrasCotacoes">Outras cotações do pedido</i>}
        </div>
      </header>
      <ComparativoFases cotacao={detalhe.cotacao} transportadoras={detalhe.transportadoras} />
      <ResumoInicialCotacao cotacao={detalhe.cotacao} />
      {mensagemLink && (
        <div className="sucesso linkGeradoPainel">
          <span>{mensagemLink}</span>
          <button className="ghost" onClick={() => copiarLink(mensagemLink.replace('Novo link gerado: ', ''))}>Copiar link</button>
          <button className="ghost" onClick={() => window.open(mensagemLink.replace('Novo link gerado: ', ''), '_blank')}>Visualizar link</button>
        </div>
      )}
      {erroLink && <div className="alerta">{erroLink}</div>}
      <nav className="abasCotacao">
        {[
          { id: 'VENDAS', nome: 'Vendas' },
          { id: 'AUTOMATICA', nome: 'Cotação Aut.' },
          { id: 'TRANSPORTADORA', nome: 'Cotação Trasp.' },
          { id: 'APROVADA', nome: 'Transp. Escolhida' },
          { id: 'CTE', nome: 'CT-e' }
        ].map((item) => <button key={item.id} className={aba === item.id ? 'active' : ''} onClick={() => setAba(item.id)}>{item.nome}</button>)}
      </nav>
      {aba === 'VENDAS' && <AbaCampos titulo="Vendas" cotacao={detalhe.cotacao} campos={['origem_comercial', 'vendedor_nome', 'data_documento', 'transportadora_pedido_nome', 'valor_frete_pedido', 'prazo_pedido_dias', 'valor_mercadoria', 'nome_destinatario', 'cidade_destino', 'uf_destino']} />}
      {aba === 'AUTOMATICA' && <AbaTransportadoras titulo="Cotação Automática" cotacao={detalhe.cotacao} transportadoras={detalhe.transportadoras.filter((item: any) => ehCotacaoAutomatica(item))} pode={pode} copiarLink={copiarLink} acao={acaoTransportadora} editarValorManual={async () => undefined} registrarObservacaoTimeline={async () => undefined} removerTransportadora={removerTransportadoraDetalhe} bloqueioEscolha={obterBloqueioEscolha} escolhaBloqueada={String(detalhe.cotacao.status ?? '').toUpperCase() === 'CTE_EMITIDO' || String(detalhe.cotacao.etapa_codigo ?? '').toUpperCase() === 'CTE_EMITIDO'} />}
      {aba === 'TRANSPORTADORA' && (
        <>
          <div className="abaAcaoInline">
            <button className="ghost" onClick={() => setSeletorTransportadoraAberto(true)}>+ Vincular transportadora</button>
          </div>
          <AbaTransportadoras titulo="Cotação Transportadora" cotacao={detalhe.cotacao} transportadoras={detalhe.transportadoras.filter((item: any) => ehCotacaoTransportadora(item))} pode={pode} copiarLink={copiarLink} acao={acaoTransportadora} editarValorManual={editarValorManualDetalhe} registrarObservacaoTimeline={registrarObservacaoTimelineDetalhe} removerTransportadora={removerTransportadoraDetalhe} bloqueioEscolha={obterBloqueioEscolha} escolhaBloqueada={String(detalhe.cotacao.status ?? '').toUpperCase() === 'CTE_EMITIDO' || String(detalhe.cotacao.etapa_codigo ?? '').toUpperCase() === 'CTE_EMITIDO'} />
        </>
      )}
      {aba === 'APROVADA' && <AbaCampos titulo="Transportadora Escolhida" cotacao={detalhe.cotacao} campos={['transportadora_escolhida', 'valor_frete_final', 'prazo_final_dias', 'motivo_escolha_transportadora_descricao', 'escolhido_em', 'observacao_analista']} />}
      {aba === 'CTE' && <AbaCampos titulo="CT-e" cotacao={detalhe.cotacao} campos={['transportadora_cte_nome', 'numeros_cte', 'valor_frete_cte_total', 'ultimo_cte_em']} />}
      <DetalhamentoCompletoCotacao cotacao={detalhe.cotacao} itens={detalhe.itens} notasFiscais={detalhe.notasFiscais ?? []} ctes={detalhe.ctes ?? []} outrasCotacoes={detalhe.outrasCotacoes ?? []} />
      <SeletorTransportadoraModal
        aberto={seletorTransportadoraAberto}
        titulo="Vincular transportadora"
        transportadoras={transportadorasCadastro}
        idsBloqueados={detalhe.transportadoras.map((item: RegistroGenerico) => item.transportadora_id ?? item.id)}
        sugestaoId={transportadorasCadastro.find((item) => String(item.codigo_interno ?? '') === String(detalhe.cotacao.transportadora_pedido_codigo ?? ''))?.id}
        erro={erroSeletorTransportadora}
        aoSelecionar={vincularTransportadoraDetalhe}
        aoFechar={() => {
          setSeletorTransportadoraAberto(false);
          setErroSeletorTransportadora('');
        }}
      />
      <ModalConfirmacaoEscolha
        aberto={Boolean(transportadoraConfirmacao)}
        transportadora={transportadoraConfirmacao}
        erro={erroEscolhaModal}
        aoCancelar={() => {
          setTransportadoraConfirmacao(null);
          setErroEscolhaModal('');
        }}
        aoConfirmar={() => transportadoraConfirmacao ? confirmarEscolhaTransportadora(transportadoraConfirmacao).catch((error) => setErroEscolhaModal(error instanceof Error ? error.message : 'Falha ao escolher transportadora.')) : undefined}
      />
      <ModalSelecaoMotivoEscolha
        aberto={Boolean(transportadoraMotivo)}
        transportadora={transportadoraMotivo}
        motivos={motivosEscolha}
        aoCancelar={() => setTransportadoraMotivo(null)}
        aoSelecionar={(motivo) => {
          const transportadora = transportadoraMotivo;
          setMotivoEscolhaManual(motivo);
          setErroEscolhaModal('');
          setTransportadoraMotivo(null);
          setTransportadoraConfirmacao(transportadora);
        }}
      />
    </section>
  );
}

function TabelaDocumentosFiscais({ titulo, dados, colunas }: { titulo: string; dados: RegistroGenerico[]; colunas: string[] }) {
  return (
    <div className="itensCotacaoPainel">
      <span>{titulo}</span>
      {dados.length === 0 ? (
        <p>Nenhum documento fiscal vinculado.</p>
      ) : (
        <div className="tabelaWrap">
          <table>
            <thead>
              <tr>{colunas.map((coluna) => <th key={coluna}>{rotuloCampo(coluna)}</th>)}</tr>
            </thead>
            <tbody>
              {dados.map((item, indice) => (
                <tr key={indice}>
                  {colunas.map((coluna) => <td key={coluna}>{renderizarValorCampo(coluna, item[coluna])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PodioCotacao({ transportadoras }: { transportadoras: RegistroGenerico[] }) {
  const top = [...transportadoras]
    .filter((transportadora) => Number(transportadora.valor_frete ?? 0) > 0)
    .sort(compararValorFreteRanking)
    .slice(0, 3);

  if (!top.length) {
    return null;
  }

  return (
    <section className="podioCotacao">
      {top.map((transportadora, indice) => (
        <article className={indice === 0 ? 'ouro' : indice === 1 ? 'prata' : 'bronze'} key={`${String(transportadora.id ?? transportadora.transportadora_id ?? transportadora.nome_fantasia ?? 'transportadora')}-${String(transportadora.origem_cotacao ?? indice)}-${indice}`}>
          <small>{indice === 0 ? '1º lugar · melhor oferta' : `${indice + 1}º lugar`}</small>
          <strong>{String(transportadora.nome_fantasia)}</strong>
          <span>{formatarMoeda(transportadora.valor_frete)}</span>
          <em>{Number(transportadora.diferenca_percentual ?? 0) === 0 ? 'Vencendo agora' : `+${String(transportadora.diferenca_percentual)}% acima`}</em>
          <b>{String(transportadora.prazo_dias ?? 0)} dias</b>
        </article>
      ))}
    </section>
  );
}

function PreviewTransportadora({ cotacao, itens }: { cotacao: RegistroGenerico; itens: RegistroGenerico[] }) {
  const [aberto, setAberto] = useState(false);
  const campos = [
    ['Documento', cotacao.numero_documento],
    ['CNPJ Remetente', cotacao.cnpj_remetente ?? '-'],
    ['Cidade Coleta', cotacao.loja_origem ?? '-'],
    ['CNPJ Destinatário', cotacao.documento_destinatario],
    ['Nome Destinatário', cotacao.nome_destinatario],
    ['Endereço Destinatário', cotacao.endereco_destinatario],
    ['CEP', cotacao.cep_destino],
    ['Destino', cotacao.cidade_destino],
    ['UF', cotacao.uf_destino],
    ['Destino Zona Rural?', cotacao.destino_zona_rural],
    ['Dest. Pessoa física', cotacao.destinatario_pessoa_fisica],
    ['Valor Da Mercadoria', formatarMoeda(cotacao.valor_mercadoria ?? 0)],
    ['Peso Real', formatarNumero(cotacao.peso_real ?? 0, 2)],
    ['Volumes Total', formatarNumero(cotacao.volumes_total ?? 0, 2)],
    ['Cubagem Total', formatarNumero(cotacao.cubagem_total ?? 0, 2)],
    ['Total do Frete', formatarMoeda(cotacao.valor_solicitado ?? 0)],
    ['% Tabela sobre o Total', formatarPercentual(cotacao.percentual_sobre_nf ?? 0)]
  ];

  return (
    <div className="previewBloco">
      <button className="ghost" onClick={() => setAberto(!aberto)}>Ver tela enviada para transportadora</button>
      {aberto && (
        <section className="previewTransportadora">
          <h3>Visualização interna do resumo enviado</h3>
          <table>
            <tbody>
              {campos.map(([rotulo, valor]) => (
                <tr key={String(rotulo)}>
                  <th>{String(rotulo)}</th>
                  <td>{String(valor ?? '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tabelaWrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Quantidade</th>
                  <th>Cubagem</th>
                  <th>Largura</th>
                  <th>Altura</th>
                  <th>Comprimento</th>
                  <th>Peso</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, indice) => (
                  <tr key={indice}>
                    <td>{String(item.codigo_item ?? '-')}</td>
                    <td>{String(item.descricao_item ?? '-')}</td>
                    <td>{String(item.quantidade ?? '-')}</td>
                    <td>{String(item.cubagem_item ?? '-')}</td>
                    <td>{String(item.largura ?? '-')}</td>
                    <td>{String(item.altura ?? '-')}</td>
                    <td>{String(item.comprimento ?? '-')}</td>
                    <td>{String(item.peso_item ?? '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MatrizPermissoes() {
  const [perfis, setPerfis] = useState<RegistroGenerico[]>([]);
  const [perfilId, setPerfilId] = useState<number>(0);
  const [permissoes, setPermissoes] = useState<RegistroGenerico[]>([]);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    listarPerfis().then((dados: any) => {
      setPerfis(dados);
      setPerfilId(Number(dados[0]?.id ?? 0));
    });
  }, []);

  useEffect(() => {
    if (perfilId) {
      listarPermissoesPerfil(perfilId).then(setPermissoes);
    }
  }, [perfilId]);

  async function salvar() {
    const itens = permissoes
      .filter((item: any) => item.permitido)
      .map((item: any) => ({ tipo: String(item.tipo), referencia_id: Number(item.referencia_id) }));
    await salvarPermissoesPerfil(perfilId, itens);
    setMensagem('Permissões salvas.');
  }

  return (
    <section className="painelTabela">
      <header>
        <div>
          <span>Direitos de acesso</span>
          <h2>Matriz de Permissões</h2>
          <p>Controle por perfil/setor, incluindo a permissão obrigatória UTILIZA_COTACAO_FRETE.</p>
        </div>
        <select value={perfilId} onChange={(evento) => setPerfilId(Number(evento.target.value))}>
          {perfis.map((perfil) => <option key={String(perfil.id)} value={Number(perfil.id)}>{String(perfil.nome)}</option>)}
        </select>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      <div className="permissoesGrid">
        {permissoes.map((permissao, indice) => (
          <label className={`permissao${String(permissao.tipo).toLowerCase()}`} key={`${String(permissao.tipo)}-${String(permissao.referencia_id)}`}>
            <input
              type="checkbox"
              checked={Boolean(permissao.permitido)}
              onChange={(evento) => {
                const copia = [...permissoes];
                copia[indice] = { ...permissao, permitido: evento.target.checked };
                setPermissoes(copia);
              }}
            />
            <strong>{String(permissao.nome)}</strong>
            <small>{String(permissao.tipo)} · {String(permissao.codigo)}</small>
          </label>
        ))}
      </div>
      <div className="rodapeAcoes">
        <button className="primary" onClick={salvar}>Salvar permissoes</button>
      </div>
    </section>
  );
}

function PaginaPublicaCotacao({ token }: { token: string }) {
  const [dados, setDados] = useState<{ resumo: RegistroGenerico; itens: RegistroGenerico[] } | null>(null);
  const [valorFrete, setValorFrete] = useState('');
  const [prazoDias, setPrazoDias] = useState('');
  const [numeroCotacaoTransportadora, setNumeroCotacaoTransportadora] = useState('');
  const [observacao, setObservacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const melhorFrete = Number(dados?.resumo.menor_frete_atual ?? 0);
  const valorInformado = interpretarMoedaBrasileira(valorFrete);
  const diferenca = melhorFrete > 0 && valorInformado > 0 ? ((valorInformado / melhorFrete) - 1) * 100 : 0;
  const valorMercadoriaPublico = Number(dados?.resumo.valor_mercadoria ?? 0);
  const valorTabelaPublico = Number(dados?.resumo.valor_tabela_transportadora ?? 0);
  const percentualTabelaTotal = valorMercadoriaPublico > 0 ? (valorTabelaPublico / valorMercadoriaPublico) * 100 : 0;
  const percentualFreteTotal = valorMercadoriaPublico > 0 && valorInformado > 0 ? (valorInformado / valorMercadoriaPublico) * 100 : 0;

  useEffect(() => {
    buscarCotacaoPublica(token)
      .then(setDados)
      .catch((error) => setErro(error instanceof Error ? error.message : 'Cotação indisponível.'));
  }, [token]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');

    try {
      if (!Number.isFinite(valorInformado) || valorInformado <= 0) {
        setErro('Informe um valor de frete válido. Exemplo: 1.200,50.');
        return;
      }
      const resposta = await responderCotacaoPublica(token, valorInformado, observacao, prazoDias ? Number(prazoDias) : null, numeroCotacaoTransportadora.trim() || null);
      setMensagem(String((resposta as any).mensagem ?? 'Operação concluída.'));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao responder cotação.');
    }
  }

  const resumo = dados?.resumo ?? {};
  const camposPublicos = [
    ['Tipo do Documento', resumo.tipo_documento],
    ['Documento', resumo.numero_documento],
    ['Cotação', resumo.codigo_chave],
    ['Emitente', resumo.empresa_nome_exibido ?? resumo.empresa_nome],
    ['CNPJ Emitente', resumo.cnpj_emitente ?? '-'],
    ['Endereço Coleta', resumo.endereco_coleta ?? resumo.loja_origem ?? '-'],
    ['CEP', resumo.cep_coleta ?? '-'],
    ['Cidade Coleta', resumo.cidade_coleta ?? '-'],
    ['UF Coleta', resumo.uf_coleta ?? '-'],
    ['Destinatário', resumo.nome_destinatario],
    ['CNPJ Destinatário', resumo.documento_destinatario],
    ['Endereço Destinatário', resumo.endereco_destinatario],
    ['CEP Destinatário', resumo.cep_destino],
    ['Cidade Destinatário', resumo.cidade_destino],
    ['UF', resumo.uf_destino],
    ['Dest. Pessoa Física', resumo.destinatario_pessoa_fisica ? 'Sim' : 'Não'],
    ['Valor da Mercadoria', formatarMoeda(resumo.valor_mercadoria ?? 0)],
    ...(resumo.apresenta_peso === false ? [] : [['Peso Real', resumo.peso_real]]),
    ['Volumes Total', resumo.volumes_total],
    ...(resumo.apresenta_cubagem === false ? [] : [['Cubagem Total', resumo.cubagem_total]]),
    ['Total do Frete', formatarMoeda(valorFrete || resumo.valor_solicitado || 0)],
    ...(resumo.recebe_prazo_solicitado === false ? [] : [['Prazo informado na venda', `${String(resumo.prazo_informado_venda_dias ?? resumo.prazo_pedido_dias ?? 0)} dias`]]),
    ['Prazo tabela', `${String(resumo.prazo_tabela_transportadora ?? resumo.menor_prazo_atual ?? 0)} dias`],
    ...(resumo.apresenta_valor_tabela === false || valorTabelaPublico <= 0 ? [] : [
      ['% Tabela sobre o Total', formatarPercentual(percentualTabelaTotal)],
      ['Valor Tabela', formatarMoeda(resumo.valor_tabela_transportadora ?? 0)]
    ]),
    ...(resumo.apresenta_menor_cotacao === false || Number(resumo.menor_frete_atual ?? 0) <= 0 ? [] : [['Menor valor automático atual', formatarMoeda(resumo.menor_frete_atual ?? 0)]])
  ];

  return (
    <main className="publicoCotacao" style={{ backgroundImage: resumo.empresa_fundo ? `linear-gradient(90deg, rgba(4, 8, 14, .90), rgba(5, 20, 17, .76)), url(${String(resumo.empresa_fundo)})` : undefined }}>
      <section className="publicoPainel">
        <header className="publicoCabecalho somenteEmpresa">
          <div>
            <img src={String(resumo.empresa_logo ?? '/brand/logo-s-novo.jpg')} alt="Empresa" />
            <div>
              <span>{String(resumo.empresa_nome_exibido ?? resumo.empresa_nome ?? 'Empresa')}</span>
              <strong>Cotação de frete</strong>
            </div>
          </div>
        </header>
        <section className="publicoHero">
          <small>Cotação de frete</small>
          <h1>{String(resumo.transportadora_nome ?? 'Transportadora')}</h1>
          <p>Documento {String(resumo.numero_documento ?? '-')} · Chave {String(resumo.codigo_chave ?? '-')}</p>
        </section>
        {erro && <div className="alerta">{erro}</div>}
        {mensagem && (
          <section className="publicoFinal">
            <strong>Cotação registrada com sucesso.</strong>
            <p>O link foi revogado e não poderá ser reutilizado. Você pode imprimir este comprovante para controle interno.</p>
            <button className="ghost" onClick={() => window.print()}>Imprimir resumo</button>
          </section>
        )}
        {dados && (
          <>
            <div className="resumoPublico">
              <strong>{String(resumo.transportadora_nome ?? '')}</strong>
              <p>{String(resumo.nome_destinatario ?? '')} - {String(resumo.cidade_destino ?? '')}/{String(resumo.uf_destino ?? '')}</p>
              {(valorTabelaPublico > 0 || Number(resumo.menor_frete_atual ?? 0) > 0) && (
                <p>
                  {valorTabelaPublico > 0 ? `Valor tabela: ${formatarMoeda(resumo.valor_tabela_transportadora ?? 0)}` : ''}
                  {valorTabelaPublico > 0 && Number(resumo.menor_frete_atual ?? 0) > 0 ? ' · ' : ''}
                  {Number(resumo.menor_frete_atual ?? 0) > 0 ? `Menor automático: ${formatarMoeda(resumo.menor_frete_atual ?? 0)}` : ''}
                </p>
              )}
            </div>
            <div className="publicoCampos">
              {camposPublicos.map(([rotulo, valor]) => (
                <article key={String(rotulo)}>
                  <span>{String(rotulo)}</span>
                  <strong>{String(valor ?? '-')}</strong>
                </article>
              ))}
            </div>
            {resumo.apresenta_lista_produtos !== false && <div className="tabelaWrap itensPublicos">
              <table>
                <thead><tr><th>Item</th><th>Descrição</th><th>Quantidade</th><th>Cubagem</th><th>Largura</th><th>Altura</th><th>Comprimento</th><th>Peso</th></tr></thead>
                <tbody>
                  {dados.itens.map((item, indice) => (
                    <tr key={indice}>
                      <td>{String(item.codigo_item ?? '-')}</td>
                      <td>{String(item.descricao_item ?? '-')}</td>
                      <td>{String(item.quantidade ?? '-')}</td>
                      <td>{String(item.cubagem_item ?? '-')}</td>
                      <td>{String(item.largura ?? '-')}</td>
                      <td>{String(item.altura ?? '-')}</td>
                      <td>{String(item.comprimento ?? '-')}</td>
                      <td>{String(item.peso_item ?? '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
            <form className="formPublico" onSubmit={enviar}>
              <label>
                Valor do frete
                <input value={valorFrete} onChange={(evento) => setValorFrete(evento.target.value)} placeholder="0,00" />
                <small>% Frete sobre o Total: {formatarPercentual(percentualFreteTotal)}</small>
              </label>
              {resumo.exige_prazo_resposta !== false && (
                <label>
                  Prazo em dias{resumo.prazo_resposta_obrigatorio ? ' *' : ''}
                  <input type="number" value={prazoDias} onChange={(evento) => setPrazoDias(evento.target.value)} placeholder="Ex.: 3" />
                </label>
              )}
              {resumo.solicita_numero_cotacao && (
                <label>
                  Número da cotação da transportadora
                  <input value={numeroCotacaoTransportadora} onChange={(evento) => setNumeroCotacaoTransportadora(evento.target.value)} placeholder="Ex.: COT-12345" />
                </label>
              )}
              <div className={diferenca <= 0 && valorInformado > 0 ? 'indicadorDesconto' : 'indicadorAcrescimo'}>
                {valorInformado > 0 ? (diferenca > 0 ? `Já existe proposta menor: ${formatarMoeda(resumo.menor_frete_atual ?? 0)} · +${diferenca.toFixed(2)}%` : `${diferenca.toFixed(2)}% vs menor valor atual`) : 'Informe o valor para comparar'}
              </div>
              <label>
                Observacao
                <input value={observacao} onChange={(evento) => setObservacao(evento.target.value)} placeholder="Observacoes ou detalhes adicionais" />
              </label>
              <button className="primary">Enviar cotação</button>
            </form>
            <footer className="publicoRodape">Control S Consultoria - Direitos Reservados</footer>
          </>
        )}
      </section>
    </main>
  );
}

type ColunaEnvioCotacao = {
  chave: string;
  titulo: string;
  largura: number;
  visivel: boolean;
};

const colunasPadraoEnvioCotacao: ColunaEnvioCotacao[] = [
  { chave: 'numero_documento', titulo: 'Pedido', largura: 92, visivel: true },
  { chave: 'codigo_chave', titulo: 'Chave', largura: 132, visivel: true },
  { chave: 'status', titulo: 'Status', largura: 132, visivel: true },
  { chave: 'vendedor_nome', titulo: 'Vendedor do Pedido', largura: 180, visivel: true },
  { chave: 'transportadora_pedido_nome', titulo: 'Transportadora Pedido', largura: 180, visivel: true },
  { chave: 'valor_frete_pedido', titulo: 'Frete Pedido', largura: 112, visivel: true },
  { chave: 'percentual_frete_pedido', titulo: '% Frete Pedido', largura: 110, visivel: true },
  { chave: 'prazo_pedido_dias', titulo: 'Prazo Pedido', largura: 96, visivel: true },
  { chave: 'transportadora_cotacao_automatica', titulo: 'Transportadora Cotação Aut.', largura: 210, visivel: true },
  { chave: 'valor_cotacao_automatica', titulo: 'Frete Cotação Aut.', largura: 124, visivel: true },
  { chave: 'percentual_frete_cotacao_automatica', titulo: '% Frete Cotado', largura: 116, visivel: true },
  { chave: 'diferenca_percentual_cotacao', titulo: '% Diferença Cotação', largura: 128, visivel: true },
  { chave: 'diferenca_valor_cotacao', titulo: '$ Diferença Cotação', largura: 128, visivel: true },
  { chave: 'prazo_cotacao_automatica', titulo: 'Prazo Cotação Aut.', largura: 122, visivel: true },
  { chave: 'fornecedores_vinculados', titulo: 'Fornecedores', largura: 96, visivel: true },
  { chave: 'fornecedores_enviados', titulo: 'Enviados', largura: 88, visivel: true },
  { chave: 'nome_destinatario', titulo: 'Cliente', largura: 220, visivel: true },
  { chave: 'cidade_destino', titulo: 'Cidade', largura: 130, visivel: true },
  { chave: 'sugestao_cotacao', titulo: 'Sugestão', largura: 96, visivel: true }
];

function EnvioMassaCotacoes() {
  const [pedidos, setPedidos] = useState<RegistroGenerico[]>([]);
  const [selecionados, setSelecionados] = useState<Array<string | number>>([]);
  const [preparacao, setPreparacao] = useState<RegistroGenerico[]>([]);
  const [emailsPorTransportadora, setEmailsPorTransportadora] = useState<Record<string, string>>({});
  const [detalheEnvio, setDetalheEnvio] = useState<{ cotacao: RegistroGenerico; itens: RegistroGenerico[]; transportadoras: RegistroGenerico[] } | null>(null);
  const [detalheCotacaoCompleto, setDetalheCotacaoCompleto] = useState<DetalheCotacaoNormalizado | null>(null);
  const [envio, setEnvio] = useState('TODOS');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [somenteTop3, setSomenteTop3] = useState(false);
  const [busca, setBusca] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('');
  const [transportadoraFiltro, setTransportadoraFiltro] = useState('');
  const [sugestaoFiltro, setSugestaoFiltro] = useState('TODOS');
  const [faturadoFiltro, setFaturadoFiltro] = useState('');
  const [fluxoLogisticoFiltro, setFluxoLogisticoFiltro] = useState('SOMENTE');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [colunasAbertas, setColunasAbertas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(15);
  const [colunaArrastadaEnvio, setColunaArrastadaEnvio] = useState('');
  const [colunasEnvio, setColunasEnvio] = useState<ColunaEnvioCotacao[]>(() => {
    const salvas = localStorage.getItem('controlSHubEnvioColunas');
    if (!salvas) {
      return colunasPadraoEnvioCotacao;
    }
    try {
      const parsed = JSON.parse(salvas) as ColunaEnvioCotacao[];
      const mapa = new Map(parsed.map((coluna) => [coluna.chave, coluna]));
      return colunasPadraoEnvioCotacao.map((coluna) => ({ ...coluna, ...(mapa.get(coluna.chave) ?? {}) }));
    } catch {
      return colunasPadraoEnvioCotacao;
    }
  });
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [emailEnvioConfigurado, setEmailEnvioConfigurado] = useState(false);
  const [emailEnvioAviso, setEmailEnvioAviso] = useState('Validando configuração de e-mail do usuário...');
  const [transportadorasCadastro, setTransportadorasCadastro] = useState<RegistroGenerico[]>([]);
  const [seletorEnvioAberto, setSeletorEnvioAberto] = useState(false);
  const [erroSeletorEnvio, setErroSeletorEnvio] = useState('');
  const [logSelecao, setLogSelecao] = useState('');
  const pedidosLista = Array.isArray(pedidos) ? pedidos : [];
  const preparacaoLista = Array.isArray(preparacao) ? preparacao : [];
  const colunasVisiveis = colunasEnvio.filter((coluna) => coluna.visivel);
  const pedidosFiltrados = pedidosLista.filter((pedido: any) => {
    if (sugestaoFiltro === 'SOMENTE_SUGESTAO' && !pedido.sugestao_cotacao) {
      return false;
    }
    if (sugestaoFiltro === 'EXCETO_SUGESTAO' && pedido.sugestao_cotacao) {
      return false;
    }
    return true;
  });
  const totalPaginas = Math.max(1, Math.ceil(pedidosFiltrados.length / limite));
  const paginaCorrigida = Math.min(pagina, totalPaginas);
  const pedidosPagina = pedidosFiltrados.slice((paginaCorrigida - 1) * limite, paginaCorrigida * limite);
  const pedidoSemOfertaBloqueante = (pedido: RegistroGenerico) => Boolean(pedido.sem_oferta_disponivel) && Number(pedido.fornecedores_vinculados ?? 0) <= 0;

  useEffect(() => {
    localStorage.setItem('controlSHubEnvioColunas', JSON.stringify(colunasEnvio));
  }, [colunasEnvio]);

  useEffect(() => {
    listarTransportadoras().then(setTransportadorasCadastro).catch(() => setTransportadorasCadastro([]));
  }, []);

  useEffect(() => {
    obterMinhaConfiguracaoEmail()
      .then((configuracao: RegistroGenerico) => {
        const configurado = Boolean(
          configuracao
          && configuracao.ativo !== false
          && configuracao.email_remetente
          && configuracao.servidor_smtp
          && configuracao.usuario_smtp
        );
        setEmailEnvioConfigurado(configurado);
        setEmailEnvioAviso(configurado ? '' : 'Configure o e-mail do usuário antes de enviar cotações por e-mail.');
      })
      .catch(() => {
        setEmailEnvioConfigurado(false);
        setEmailEnvioAviso('Configure o e-mail do usuário antes de enviar cotações por e-mail.');
      });
  }, []);

  function atualizarColuna(chave: string, dados: Partial<ColunaEnvioCotacao>) {
    setColunasEnvio((atuais) => atuais.map((coluna) => coluna.chave === chave ? { ...coluna, ...dados } : coluna));
  }

  function reordenarColunaEnvio(destino: string) {
    if (!colunaArrastadaEnvio || colunaArrastadaEnvio === destino) {
      return;
    }
    setColunasEnvio((atuais) => {
      const origem = atuais.find((coluna) => coluna.chave === colunaArrastadaEnvio);
      if (!origem) {
        return atuais;
      }
      const nova = atuais.filter((coluna) => coluna.chave !== colunaArrastadaEnvio);
      const indiceDestino = nova.findIndex((coluna) => coluna.chave === destino);
      nova.splice(indiceDestino < 0 ? nova.length : indiceDestino, 0, origem);
      return nova;
    });
    setColunaArrastadaEnvio('');
  }

  function exportarCsvEnvio() {
    const cabecalho = colunasVisiveis.map((coluna) => coluna.titulo).join(';');
    const linhas = pedidosFiltrados.map((pedido: any) => colunasVisiveis.map((coluna) => {
      const valor = pedido[coluna.chave];
      if (typeof valor === 'boolean') {
        return valor ? 'Sim' : 'Nao';
      }
      return String(valor ?? '').replace(/;/g, ',').replace(/\r?\n/g, ' ');
    }).join(';'));
    const blob = new Blob([[cabecalho, ...linhas].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `envio_cotacao_transportadora_${obterDataIso(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function carregar() {
    const retorno = await listarPedidosEnvioMassa({ situacao: 'ATIVOS', envio, status: statusFiltro || undefined, busca, vendedor: vendedorFiltro, transportadora: transportadoraFiltro, faturado: faturadoFiltro || undefined, fluxo_logistico: fluxoLogisticoFiltro || undefined });
    const dados = Array.isArray(retorno) ? retorno : Array.isArray((retorno as any)?.itens) ? (retorno as any).itens : [];
    setPedidos(dados);
    setPagina(1);
  }

  useEffect(() => {
    carregar().catch(() => setPedidos([]));
  }, [envio, faturadoFiltro, statusFiltro, fluxoLogisticoFiltro]);

  useEffect(() => {
    if (!mensagem) {
      return;
    }
    const timer = window.setTimeout(() => setMensagem(''), 7000);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  async function preparar() {
    setErro('');
    setMensagem('');
    if (!emailEnvioConfigurado) {
      setErro(emailEnvioAviso || 'Configure o e-mail do usuário antes de enviar cotações por e-mail.');
      return;
    }
    const retorno = await prepararEnvioMassa(selecionados);
    const dados = Array.isArray(retorno) ? retorno : Array.isArray((retorno as any)?.itens) ? (retorno as any).itens : [];
    const filtrados = somenteTop3
      ? dados.filter((item: any) => Number(item.ranking_frete ?? item.posicao_cotacao ?? 999) <= 3)
      : dados;
    setPreparacao(filtrados);
    setEmailsPorTransportadora(criarEmailsPadraoPorTransportadora(filtrados));
  }

  async function abrirDetalheEnvio(cotacaoId: string | number) {
    setErro('');
    try {
      const detalhe = await obterCotacao(cotacaoId);
      if (!detalhe?.cotacao) {
        setErro('Cotação não encontrada para abrir os detalhes.');
        return;
      }
      setDetalheEnvio({
        cotacao: {
          ...detalhe.cotacao,
          id: montarIdCotacaoLocal(detalhe.cotacao)
        },
        itens: Array.isArray(detalhe.itens) ? detalhe.itens : [],
        transportadoras: Array.isArray(detalhe.transportadoras) ? detalhe.transportadoras : []
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao abrir detalhe da cotação.');
    }
  }

  async function abrirDetalheCotacaoCompleto(cotacaoId: string | number) {
    setErro('');
    try {
      const detalheNormalizado = normalizarDetalheCotacao(await obterCotacao(cotacaoId));
      if (!detalheNormalizado) {
        setErro('Cotação não encontrada para abrir o detalhe completo.');
        return;
      }
      setDetalheCotacaoCompleto(detalheNormalizado);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao abrir detalhe completo da cotação.');
    }
  }

  async function adicionarTransportadoraNoDetalheEnvio() {
    if (!detalheEnvio) {
      return;
    }
    setSeletorEnvioAberto(true);
  }

  async function selecionarTransportadoraNoDetalheEnvio(escolhida: RegistroGenerico) {
    if (!detalheEnvio) {
      return;
    }
    const transportadoraId = obterTransportadoraId(escolhida);
    if (!transportadoraId) {
      setErroSeletorEnvio('Transportadora sem identificador válido para vincular.');
      return;
    }

    const transportadorasJaVinculadas = new Set(detalheEnvio.transportadoras.map((item: RegistroGenerico) => String(item.transportadora_id ?? item.id)));
    if (transportadorasJaVinculadas.has(String(transportadoraId))) {
      setErroSeletorEnvio('Essa transportadora já está vinculada na cotação.');
      return;
    }

    try {
      await adicionarTransportadoraCotacao(String(detalheEnvio.cotacao.id), transportadoraId, 'Transportadora adicionada pela tela de envio.');
      await abrirDetalheEnvio(String(detalheEnvio.cotacao.id));
      setSeletorEnvioAberto(false);
      setErroSeletorEnvio('');
      setMensagem('Transportadora adicionada para envio da cotação.');
    } catch (error) {
      setErroSeletorEnvio(error instanceof Error ? error.message : 'Falha ao vincular transportadora.');
    }
  }

  async function removerTransportadoraNoDetalheEnvio(transportadora: RegistroGenerico) {
    if (!detalheEnvio) {
      return;
    }

    if (!podeRemoverTransportadoraCotacao(transportadora)) {
      setErroSeletorEnvio('Somente transportadoras adicionadas sem valor e sem resposta podem ser removidas.');
      return;
    }

    const confirmar = window.confirm('Remover esta transportadora adicionada sem valor da cotação?');
    if (!confirmar) {
      return;
    }

    try {
      await excluirTransportadoraCotacao(String(detalheEnvio.cotacao.id), String(transportadora.id));
      await abrirDetalheEnvio(String(detalheEnvio.cotacao.id));
      setErroSeletorEnvio('');
      setMensagem('Transportadora removida da cotação.');
    } catch (error) {
      setErroSeletorEnvio(error instanceof Error ? error.message : 'Falha ao remover transportadora.');
    }
  }

  async function enviar(reenviar: boolean, itensEnvio?: RegistroGenerico[], grupoEnvio?: { chave: string; transportadoraId: number; nome: string }) {
    setErro('');
    setMensagem('');
    if (!emailEnvioConfigurado) {
      setErro(emailEnvioAviso || 'Configure o e-mail do usuário antes de enviar cotações por e-mail.');
      return;
    }
    try {
      const lista = itensEnvio ?? preparacaoLista;
      const cotacoes = Array.from(new Set(lista.map((item: any) => String(item.cotacao_id ?? item.cotacao_frete_id)).filter(Boolean)));
      const transportadorasIds = Array.from(new Set(lista.map((item: any) => Number(item.transportadora_id)).filter(Boolean)));
      const resposta = await enviarCotacoesMassa(grupoEnvio ? {
        cotacoes_ids: cotacoes,
        grupos: [{
          transportadora_id: grupoEnvio.transportadoraId,
          cotacoes_ids: cotacoes,
          assunto: `Cotação de frete - ${grupoEnvio.nome}`,
          html: emailsPorTransportadora[grupoEnvio.chave] ?? ''
        }],
        reenviar
      } : {
        cotacoes_ids: cotacoes.length ? cotacoes : selecionados,
        transportadoras_ids: transportadorasIds,
        reenviar
      });
      const resultados = Array.isArray((resposta as any).resultados) ? (resposta as any).resultados : [];
      const erros = resultados.filter((item: any) => String(item.status ?? '').toUpperCase() === 'ERRO');
      setMensagem(erros.length
        ? `Envio concluído com ${erros.length} alerta(s). Verifique os itens não enviados.`
        : `Cotação enviada para ${grupoEnvio?.nome ?? 'as transportadoras'} com sucesso.`);
      if (itensEnvio?.length) {
        const enviados = new Set(itensEnvio.map((item: any) => `${String(item.cotacao_id)}|${String(item.transportadora_id)}`));
        setPreparacao((atuais) => atuais.filter((item: any) => !enviados.has(`${String(item.cotacao_id)}|${String(item.transportadora_id)}`)));
      } else {
        setSelecionados([]);
        setPreparacao([]);
      }
      setDetalheEnvio(null);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao enviar cotações.');
    }
  }

  async function escolherTransportadoraEnvio(cotacaoId: string | number, transportadora: RegistroGenerico) {
    const pedidoBase = pedidosLista.find((pedido: RegistroGenerico) => String(pedido.id) === String(cotacaoId));
    if (pedidoBase?.sugestao_cotacao) {
      const seguir = window.confirm('Esta cotação possui sugestão de cotação adicional. Deseja escolher a transportadora mesmo assim?');
      if (!seguir) {
        return;
      }
    }

    try {
      await escolherTransportadora(cotacaoId, String(transportadora.id ?? transportadora.transportadora_id));
      setMensagem('Transportadora escolhida com sucesso.');
      setDetalheEnvio(null);
      await carregar();
      setLogSelecao(`Transportadora escolhida com sucesso para ${String(pedidoBase?.numero_documento ?? cotacaoId)}.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao escolher a transportadora.');
    }
  }

  async function escolherTransportadoraAutomatica(pedido: RegistroGenerico) {
    const transportadoraId = pedido.transportadora_cotacao_automatica_id ?? pedido.transportadora_referencia_id;
    const origemCotacao = String(pedido.origem_cotacao_automatica ?? 'ERP');
    if (!transportadoraId) {
      await abrirDetalheEnvio(String(pedido.id));
      setErro('Abra os detalhes e escolha a transportadora desejada. Esta linha não trouxe o identificador da melhor cotação automática.');
      return;
    }

    await escolherTransportadoraEnvio(String(pedido.id), {
      id: `${String(pedido.id)}|${String(transportadoraId)}|${origemCotacao}`,
      transportadora_id: transportadoraId,
      nome_fantasia: pedido.transportadora_cotacao_automatica ?? pedido.transportadora_referencia,
      origem_cotacao: origemCotacao
    });
  }

  async function escolherTransportadorasSelecionadas() {
    const selecionadas = pedidosFiltrados.filter((pedido: RegistroGenerico) => selecionados.map(String).includes(String(pedido.id)));
    if (!selecionadas.length) {
      setErro('Selecione ao menos uma cotação para escolher a transportadora.');
      return;
    }

    if (selecionadas.some((pedido: RegistroGenerico) => Boolean(pedido.sugestao_cotacao))) {
      const seguir = window.confirm('Esta cotação possui sugestão de cotação adicional. Deseja escolher a transportadora mesmo assim?');
      if (!seguir) {
        return;
      }
    }

    setErro('');
    setMensagem('Escolhendo transportadora de menor valor dos pedidos selecionados...');
    const falhas: string[] = [];

    for (const pedido of selecionadas) {
      const transportadoraId = pedido.transportadora_cotacao_automatica_id ?? pedido.transportadora_referencia_id;
      if (!transportadoraId) {
        falhas.push(`${String(pedido.numero_documento ?? pedido.codigo_chave)} sem transportadora automática identificada`);
        continue;
      }

      try {
        await escolherTransportadora(String(pedido.id), `${String(pedido.id)}|${String(transportadoraId)}|${String(pedido.origem_cotacao_automatica ?? 'ERP')}`);
      } catch (error) {
        falhas.push(`${String(pedido.numero_documento ?? pedido.codigo_chave)}: ${error instanceof Error ? error.message : 'falha ao escolher'}`);
      }
    }

    await carregar();
    setSelecionados([]);
    const textoLog = falhas.length ? `Escolha concluída com alertas:\n${falhas.join('\n')}` : 'Transportadora de menor valor escolhida para os pedidos selecionados.';
    setMensagem(falhas.length ? 'Escolha concluída com alertas. Veja o log da seleção.' : 'Transportadora de menor valor escolhida para os pedidos selecionados.');
    setLogSelecao(textoLog);
  }

  const temReenvio = preparacaoLista.some((item: any) => item.ja_enviado);
  const gruposPreparacao = agruparPreparacaoPorTransportadora(preparacaoLista);

  return (
    <section className="painelTabela envioMassa">
      <header>
        <div>
          <span>Operação em massa</span>
          <h2>Envio de Cotação para Transportadora</h2>
          <p>Apresenta somente cotações operacionais abertas para envio ou definição direta da transportadora.</p>
        </div>
        <div className="acoesDashboard">
          <button className="ghost" onClick={() => setFiltrosAbertos(!filtrosAbertos)}>{filtrosAbertos ? 'Recolher filtros' : 'Filtros'}</button>
          <div className="acoesEnvioPrincipal">
            <button className="primary" onClick={preparar} disabled={!selecionados.length || !emailEnvioConfigurado}>Enviar cotação transportadora</button>
            <button className="ghost botaoEscolherMassa" onClick={escolherTransportadorasSelecionadas} disabled={!selecionados.length}>Escolher Transportadora</button>
          </div>
        </div>
      </header>
      {!emailEnvioConfigurado && <div className="alerta">{emailEnvioAviso}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {mensagem && <div className="sucesso">{mensagem}</div>}
      <div className="filtrosLinha envioFiltros">
        <input placeholder="Pedido, chave, destinatário" value={busca} onChange={(evento) => setBusca(evento.target.value)} />
        <select value={statusFiltro} onChange={(evento) => { setStatusFiltro(evento.target.value); setPagina(1); }}>
          <option value="">Todos status</option>
          <option value="COTACAO_PENDENTE">Cotação Pendente</option>
          <option value="COTACAO_AUTOMATICA">Cotação Automática</option>
          <option value="COTACAO_TRANSPORTADORA">Cotação Transportadora</option>
          <option value="EM_ANALISE">Em Análise</option>
        </select>
        <select value={envio} onChange={(evento) => setEnvio(evento.target.value)}>
          <option value="TODOS">Todos envios</option>
          <option value="NAO_ENVIADOS">Não enviados</option>
          <option value="JA_ENVIADOS">Já enviados</option>
        </select>
        <select value={sugestaoFiltro} onChange={(evento) => { setSugestaoFiltro(evento.target.value); setPagina(1); }}>
          <option value="TODOS">Todas sugestões</option>
          <option value="SOMENTE_SUGESTAO">Somente com sugestão</option>
          <option value="EXCETO_SUGESTAO">Exceto com sugestão</option>
        </select>
        <select value={faturadoFiltro} onChange={(evento) => { setFaturadoFiltro(evento.target.value); setPagina(1); }}>
          <option value="">Faturamento: todos</option>
          <option value="SOMENTE">Somente faturados</option>
          <option value="EXCETO">Exceto faturados</option>
        </select>
        <label className="toggleLinha">
          <input type="checkbox" checked={somenteTop3} onChange={(evento) => setSomenteTop3(evento.target.checked)} />
          Enviar somente Top 3
        </label>
        <select value={fluxoLogisticoFiltro} onChange={(evento) => { setFluxoLogisticoFiltro(evento.target.value); setPagina(1); }} title="Filtra cotações conforme o lote de fluxo logístico do pedido.">
          <option value="">Fluxo: todos</option>
          <option value="SOMENTE">Somente com fluxo</option>
          <option value="SEM_PEDIDO">Pedidos sem fluxo</option>
        </select>
        <button className="ghost" onClick={() => {
          const bloqueados = pedidosPagina.filter((pedido: any) => pedidoSemOfertaBloqueante(pedido));
          if (bloqueados.length) {
            setMensagem('Cotações sem oferta disponível não foram marcadas.');
          }
          setSelecionados(pedidosPagina.filter((pedido: any) => String(pedido.situacao_pedido) === 'ATIVO' && !pedidoSemOfertaBloqueante(pedido)).map((pedido: any) => String(pedido.id)));
        }}>
          Selecionar página
        </button>
        <button className="ghost" onClick={() => {
          const bloqueados = pedidosFiltrados.filter((pedido: any) => pedidoSemOfertaBloqueante(pedido));
          if (bloqueados.length) {
            setMensagem('Cotações sem oferta disponível não foram marcadas.');
          }
          setSelecionados(pedidosFiltrados.filter((pedido: any) => String(pedido.situacao_pedido) === 'ATIVO' && !pedidoSemOfertaBloqueante(pedido)).map((pedido: any) => String(pedido.id)));
        }}>
          Selecionar todos
        </button>
        <button className="ghost" onClick={() => setSelecionados([])}>
          Desmarcar todos
        </button>
        <button className="ghost" onClick={() => setColunasAbertas(!colunasAbertas)}>Colunas</button>
        <button className="ghost" onClick={exportarCsvEnvio}>Exportar CSV</button>
        <button className="ghost" onClick={carregar}>Filtrar</button>
      </div>
      {filtrosAbertos && (
        <div className="filtrosLinha">
          <input placeholder="Vendedor" value={vendedorFiltro} onChange={(evento) => setVendedorFiltro(evento.target.value)} />
          <input placeholder="Transportadora" value={transportadoraFiltro} onChange={(evento) => setTransportadoraFiltro(evento.target.value)} />
        </div>
      )}
      {colunasAbertas && (
        <div className="painelColunasEnvio">
          {colunasEnvio.map((coluna) => (
            <div
              key={coluna.chave}
              draggable
              onDragStart={() => setColunaArrastadaEnvio(coluna.chave)}
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={() => reordenarColunaEnvio(coluna.chave)}
            >
              <label>
                <input type="checkbox" checked={coluna.visivel} onChange={(evento) => atualizarColuna(coluna.chave, { visivel: evento.target.checked })} />
                {coluna.titulo}
              </label>
              <input type="range" min="70" max="320" value={coluna.largura} onChange={(evento) => atualizarColuna(coluna.chave, { largura: Number(evento.target.value) })} />
            </div>
          ))}
        </div>
      )}
      <div className="tabelaWrap tabelaEnvioConfiguravel">
        <table>
          <thead>
            <tr>
              <th className="colunaSelecao"></th>
              {colunasVisiveis.map((coluna) => <th key={coluna.chave} style={{ minWidth: coluna.largura, width: coluna.largura }}>{coluna.titulo}</th>)}
              <th className="colunaAcoes">Ação</th>
            </tr>
          </thead>
          <tbody>
            {pedidosPagina.map((pedido, indice) => (
              <tr
                className={pedidoSemOfertaBloqueante(pedido) ? 'linhaSemOferta' : pedido.sugestao_cotacao || pedido.sem_oferta_disponivel ? 'linhaAlertaSugestao' : ''}
                title={pedidoSemOfertaBloqueante(pedido) ? 'Cotação sem Oferta disponível' : pedido.sugestao_cotacao || pedido.sem_oferta_disponivel ? montarTextoSugestaoCotacao(pedido, pedido) : ''}
                key={`${String(pedido.id ?? pedido.numero_documento ?? 'pedido')}-${String(pedido.codigo_chave ?? indice)}`}
                onDoubleClick={() => abrirDetalheEnvio(String(pedido.id))}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-disabled={pedidoSemOfertaBloqueante(pedido)}
                    checked={selecionados.map(String).includes(String(pedido.id))}
                    onChange={(evento) => {
                      if (pedidoSemOfertaBloqueante(pedido)) {
                        abrirDetalheEnvio(String(pedido.id));
                        return;
                      }
                      setSelecionados(evento.target.checked ? [...selecionados, String(pedido.id)] : selecionados.filter((id) => String(id) !== String(pedido.id)));
                    }}
                  />
                </td>
                {colunasVisiveis.map((coluna) => (
                  <td key={coluna.chave} style={{ minWidth: coluna.largura, width: coluna.largura }}>
                    {renderizarValorCampo(coluna.chave, pedido[coluna.chave], { semMoeda: true })}
                  </td>
                ))}
                <td>
                  <div className="acoesTabela">
                    <button className="miniBotao" onClick={() => abrirDetalheEnvio(String(pedido.id))}>Detalhes</button>
                    <button className="miniBotao" onClick={() => escolherTransportadoraAutomatica(pedido)}>Escolher</button>
                  </div>
                </td>
              </tr>
            ))}
            {pedidosPagina.length === 0 && <tr><td colSpan={colunasVisiveis.length + 2}>Nenhuma cotação encontrada para os filtros informados.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="paginacaoLinha">
        <span>{pedidosFiltrados.length} registro(s) · página {paginaCorrigida}/{totalPaginas}</span>
        <select value={limite} onChange={(evento) => { setLimite(Number(evento.target.value)); setPagina(1); }}>
          <option value={15}>15 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
        <button className="ghost" disabled={paginaCorrigida <= 1} onClick={() => setPagina((atual) => Math.max(1, atual - 1))}>Anterior</button>
        <button className="ghost" disabled={paginaCorrigida >= totalPaginas} onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}>Próxima</button>
      </div>
      <PainelContextual
        aberto={Boolean(detalheEnvio)}
        largura="medio"
        titulo={detalheEnvio ? `${String(detalheEnvio.cotacao.tipo_documento)} ${String(detalheEnvio.cotacao.numero_documento)}` : 'Detalhe do envio'}
        subtitulo={detalheEnvio ? `Chave ${String(detalheEnvio.cotacao.codigo_chave ?? '-')} · ${String(detalheEnvio.cotacao.nome_destinatario ?? '-')}` : undefined}
        aoFechar={() => setDetalheEnvio(null)}
      >
        {detalheEnvio && (
        <section className="detalheEnvioMassa detalheEnvioContextual">
          <header>
            <div>
              <span>Conferência do documento</span>
              <h3>{String(detalheEnvio.cotacao.tipo_documento)} {String(detalheEnvio.cotacao.numero_documento)}</h3>
              <p>Chave {String(detalheEnvio.cotacao.codigo_chave ?? '-')} · {String(detalheEnvio.cotacao.nome_destinatario ?? '-')}</p>
            </div>
            <button className="ghost" onClick={() => setDetalheEnvio(null)}>Fechar</button>
          </header>
          <div className="motivoSugestaoCotacao">
            <strong>Motivo da sugestão</strong>
            <p>{pedidosLista.find((pedido: RegistroGenerico) => String(pedido.id) === String(detalheEnvio.cotacao.id))?.sem_oferta_disponivel ? 'Cotação sem Oferta disponível.' : montarTextoSugestaoCotacao(detalheEnvio.cotacao, pedidosLista.find((pedido: RegistroGenerico) => String(pedido.id) === String(detalheEnvio.cotacao.id)))}</p>
            <button className="ghost" onClick={() => abrirDetalheCotacaoCompleto(String(detalheEnvio.cotacao.id))}>Abrir detalhe da cotação</button>
          </div>
          <div className="detalheEnvioResumo">
            <article><span>Valor mercadoria</span><strong>R$ {String(detalheEnvio.cotacao.valor_mercadoria ?? '0')}</strong></article>
            <article><span>Peso</span><strong>{String(detalheEnvio.cotacao.peso_real ?? '0')}</strong></article>
            <article><span>Cubagem</span><strong>{String(detalheEnvio.cotacao.cubagem_total ?? '0')}</strong></article>
            <article><span>Volumes</span><strong>{String(detalheEnvio.cotacao.volumes_total ?? '0')}</strong></article>
          </div>
          <div className="detalheEnvioGrid">
            <div>
              <h4>Transportadoras vinculadas <button className="miniBotao" onClick={adicionarTransportadoraNoDetalheEnvio}>+ Adicionar</button></h4>
              {detalheEnvio.transportadoras.map((transportadora, indice) => (
                <article className="linhaFornecedorEnvio" key={`${String(transportadora.id ?? transportadora.transportadora_id ?? transportadora.nome_fantasia ?? 'transportadora')}-${String(transportadora.origem_cotacao ?? indice)}`}>
                  <div>
                    <strong>{String(transportadora.nome_fantasia)}</strong>
                    <small>{String(transportadora.origem_cotacao)} · {String(transportadora.status_cotacao)}</small>
                  </div>
                  <div className="acoesTabela">
                    <span>R$ {String(transportadora.valor_frete ?? '0')}</span>
                    {podeRemoverTransportadoraCotacao(transportadora) && (
                      <button className="miniBotao perigo" onClick={() => removerTransportadoraNoDetalheEnvio(transportadora)}>Remover</button>
                    )}
                    <button className="miniBotao" onClick={() => { abrirDetalheCotacaoCompleto(String(detalheEnvio.cotacao.id)); setDetalheEnvio(null); }}>Escolher</button>
                  </div>
                </article>
              ))}
            </div>
            <div>
              <h4>Itens do documento</h4>
              <div className="listaItensCompacta">
                {detalheEnvio.itens.map((item: any, indice: number) => (
                  <p key={`${String(item.id ?? item.item_sequencia ?? item.codigo_item ?? 'item')}-${indice}`}>
                    <strong>{String(item.codigo_item ?? '-')}</strong>
                    {String(item.descricao_item ?? '-')} · qtd {String(item.quantidade ?? '-')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
        )}
      </PainelContextual>
      <PainelContextual
        aberto={Boolean(detalheCotacaoCompleto)}
        largura="amplo"
        titulo={detalheCotacaoCompleto ? `${String(detalheCotacaoCompleto.cotacao.tipo_documento)} ${String(detalheCotacaoCompleto.cotacao.numero_documento)}` : 'Detalhe da cotação'}
        subtitulo={detalheCotacaoCompleto ? `Chave ${String(detalheCotacaoCompleto.cotacao.codigo_chave ?? '-')} · ${String(detalheCotacaoCompleto.cotacao.nome_destinatario ?? '-')}` : undefined}
        aoFechar={() => setDetalheCotacaoCompleto(null)}
      >
        {detalheCotacaoCompleto && <DetalheCotacaoConteudo detalhe={detalheCotacaoCompleto} usuario={null} aoAtualizar={async () => setDetalheCotacaoCompleto(normalizarDetalheCotacao(await obterCotacao(String(detalheCotacaoCompleto.cotacao.id))))} />}
      </PainelContextual>
      <PainelContextual
        aberto={preparacao.length > 0}
        largura="amplo"
        titulo="Conferência e envio por transportadora"
        subtitulo="Revise o e-mail, confira documentos e envie por transportadora."
        aoFechar={() => setPreparacao([])}
      >
      {preparacao.length > 0 && (
        <section className="preEnvio">
          <h3>Conferência e envio por transportadora</h3>
          {temReenvio && <div className="alerta">Existem fornecedores que já receberam cotação. Confirme se deseja reenviar.</div>}
          <div className="gruposEmailEnvio">
            {gruposPreparacao.map((grupo) => {
              const chave = grupo.chave;
              const emailHtml = emailsPorTransportadora[chave] ?? '';
              const emailPreviewHtml = emailHtml.split('DOCUMENTOS').join(montarTabelaDocumentosPreview(grupo.itens));
              return (
                <article key={chave} className="grupoEmailTransportadora">
                  <header>
                    <div>
                      <span>Transportadora</span>
                      <h4>{grupo.nome}</h4>
                      <p>{grupo.email || 'Transportadora sem e-mail cadastrado'} · {grupo.itens.length} documento(s)</p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => {
                        const possuiReenvio = grupo.itens.some((item: any) => item.ja_enviado);
                        if (possuiReenvio && !window.confirm('Existem documentos já enviados para esta transportadora. Deseja reenviar gerando novo link?')) {
                          return;
                        }
                        enviar(possuiReenvio, grupo.itens, grupo);
                      }}
                      disabled={!grupo.email || !emailEnvioConfigurado}
                    >
                      Enviar para esta transportadora
                    </button>
                  </header>
                  <div className="chipsEnvio">
                    {grupo.itens.map((item, indice) => (
                      <span className={item.ja_enviado ? 'reenvio' : 'inedito'} key={`${chave}-${indice}`}>
                        {String(item.numero_documento)} · chave {String(item.codigo_chave)} · #{String(item.ranking_frete ?? item.posicao_cotacao ?? '-')} · R$ {String(item.valor_frete ?? '0')} · {item.ja_enviado ? 'já enviado' : 'inédito'}
                        {item.ultimo_link_enviado && (
                          <button
                            className="miniBotao"
                            onClick={async () => {
                              try {
                                await copiarTexto(item.ultimo_link_enviado);
                                setMensagem('Link copiado para a área de transferência.');
                              } catch (error) {
                                setErro(error instanceof Error ? error.message : 'Não foi possível copiar o link.');
                              }
                            }}
                          >
                            Copiar link
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <label className="editorEmailEnvio">
                    Prévia/editável do e-mail
                    <textarea
                      value={emailHtml}
                      onChange={(evento) => setEmailsPorTransportadora((atuais) => ({ ...atuais, [chave]: evento.target.value }))}
                    />
                  </label>
                  <div className="previewEmailEnvio" dangerouslySetInnerHTML={{ __html: emailPreviewHtml }} />
                </article>
              );
            })}
          </div>
        </section>
      )}
      </PainelContextual>
      <SeletorTransportadoraModal
        aberto={seletorEnvioAberto}
        titulo="Adicionar transportadora para cotação"
        transportadoras={transportadorasCadastro}
        idsBloqueados={detalheEnvio?.transportadoras.map((item: RegistroGenerico) => item.transportadora_id ?? item.id) ?? []}
        sugestaoId={transportadorasCadastro.find((item) => String(item.codigo_interno ?? '') === String(detalheEnvio?.cotacao.transportadora_pedido_codigo ?? ''))?.id}
        erro={erroSeletorEnvio}
        aoSelecionar={selecionarTransportadoraNoDetalheEnvio}
        aoFechar={() => {
          setSeletorEnvioAberto(false);
          setErroSeletorEnvio('');
        }}
      />
      <PainelContextual
        aberto={Boolean(logSelecao)}
        largura="medio"
        titulo="Log da seleção"
        subtitulo="Resultado da ação executada para a escolha de transportadora."
        aoFechar={() => setLogSelecao('')}
      >
        <pre className="logSelecaoTransportadora">{logSelecao}</pre>
      </PainelContextual>
    </section>
  );
}

function ConfiguracaoEmailUsuario() {
  const [formulario, setFormulario] = useState<RegistroGenerico>({});
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    obterMinhaConfiguracaoEmail().then((dados) => setFormulario(dados ?? {})).catch(() => setFormulario({}));
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    try {
      const dados = await salvarMinhaConfiguracaoEmail(formulario);
      setFormulario(dados);
      setMensagem('Configuração de e-mail salva.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar e-mail.');
    }
  }

  async function testar() {
    setErro('');
    setMensagem('');
    try {
      const dados = await testarMinhaConfiguracaoEmail();
      setMensagem(String((dados as any).teste?.mensagem ?? (dados as any).teste_mensagem ?? 'Teste realizado com sucesso.'));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha no teste de e-mail.');
    }
  }

  return (
    <section className="painelTabela">
      <header>
        <div>
          <span>Configuração individual</span>
          <h2>Meu e-mail de envio</h2>
          <p>Conta usada para disparar cotações com rastreabilidade por usuário.</p>
        </div>
        <button className="ghost" onClick={testar}>Testar configuração</button>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      <form className="formCadastro" onSubmit={salvar}>
        <label>Descrição<input value={String(formulario.descricao ?? '')} onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })} /></label>
        <label>Nome remetente<input value={String(formulario.nome_remetente ?? '')} onChange={(evento) => setFormulario({ ...formulario, nome_remetente: evento.target.value })} /></label>
        <label>E-mail remetente<input value={String(formulario.email_remetente ?? '')} onChange={(evento) => setFormulario({ ...formulario, email_remetente: evento.target.value })} /></label>
        <label>Servidor SMTP<input value={String(formulario.servidor_smtp ?? '')} onChange={(evento) => setFormulario({ ...formulario, servidor_smtp: evento.target.value })} /></label>
        <label>Porta<input type="number" value={String(formulario.porta_smtp ?? 587)} onChange={(evento) => setFormulario({ ...formulario, porta_smtp: Number(evento.target.value) })} /></label>
        <label>Usuario SMTP<input value={String(formulario.usuario_smtp ?? '')} onChange={(evento) => setFormulario({ ...formulario, usuario_smtp: evento.target.value })} /></label>
        <label>Senha SMTP<input type="password" value={String(formulario.senha_smtp ?? '')} onChange={(evento) => setFormulario({ ...formulario, senha_smtp: evento.target.value })} /></label>
        <label>Seguranca
          <select value={String(formulario.seguranca ?? 'STARTTLS')} onChange={(evento) => setFormulario({ ...formulario, seguranca: evento.target.value })}>
            <option value="STARTTLS">STARTTLS</option>
            <option value="SSL">SSL/TLS</option>
            <option value="NENHUMA">Nenhuma</option>
          </select>
        </label>
        <label>Reply-to<input value={String(formulario.email_resposta ?? '')} onChange={(evento) => setFormulario({ ...formulario, email_resposta: evento.target.value })} /></label>
        <label>Assinatura HTML<input value={String(formulario.assinatura_html ?? '')} onChange={(evento) => setFormulario({ ...formulario, assinatura_html: evento.target.value })} /></label>
        <label className="campoLargo">
          Modelo do e-mail para transportadora
          <small>Tags disponíveis: TRANSPORTADORA e DOCUMENTOS. A tag DOCUMENTOS monta a tabela com Documento, Chave, Valor referência, Validade do Link e Link.</small>
          <textarea
            value={String(formulario.modelo_email_transportadora ?? MODELO_EMAIL_TRANSPORTADORA_PADRAO)}
            onChange={(evento) => setFormulario({ ...formulario, modelo_email_transportadora: evento.target.value })}
          />
        </label>
        <label>Configuração padrão<input type="checkbox" checked={Boolean(formulario.padrao ?? false)} onChange={(evento) => setFormulario({ ...formulario, padrao: evento.target.checked })} /></label>
        <label>Permite envio de cotacao<input type="checkbox" checked={Boolean(formulario.permite_envio_cotacao ?? true)} onChange={(evento) => setFormulario({ ...formulario, permite_envio_cotacao: evento.target.checked })} /></label>
        <button className="primary">Salvar e-mail</button>
      </form>
    </section>
  );
}

function TransportadorasOperacional() {
  const [filtro, setFiltro] = useState('');
  const [filtroAceitaCotacao, setFiltroAceitaCotacao] = useState('');
  const [versao, setVersao] = useState(0);

  async function carregar() {
    const dados = await listarTransportadoras();
    const busca = filtro.trim().toLowerCase();
    return dados.filter((item: RegistroGenerico) => {
      const texto = `${item.codigo_interno ?? ''} ${item.nome_fantasia ?? ''} ${item.razao_social ?? ''} ${item.documento ?? ''}`.toLowerCase();
      const passouBusca = !busca || texto.includes(busca);
      const passouAceita = !filtroAceitaCotacao
        || (filtroAceitaCotacao === 'SIM' && Boolean(item.aceita_cotacao_externa))
        || (filtroAceitaCotacao === 'NAO' && !Boolean(item.aceita_cotacao_externa));
      return passouBusca && passouAceita;
    });
  }

  return (
    <>
      <div className="filtrosLinha">
        <input placeholder="Filtrar por nome, código, razão social ou documento" value={filtro} onChange={(evento) => setFiltro(evento.target.value)} />
        <select value={filtroAceitaCotacao} onChange={(evento) => setFiltroAceitaCotacao(evento.target.value)}>
          <option value="">Aceita cotação: todos</option>
          <option value="SIM">Aceita cotação: sim</option>
          <option value="NAO">Aceita cotação: não</option>
        </select>
        <button className="ghost" onClick={() => setVersao((atual) => atual + 1)}>Filtrar</button>
      </div>
      <TabelaOperacional
        key={`${filtro}-${filtroAceitaCotacao}-${versao}`}
        titulo="Transportadoras"
        subtitulo="Transportadoras disponíveis para cotação automática e retorno público por link."
        carregar={carregar}
        colunas={['codigo_interno', 'nome_fantasia', 'documento', 'email', 'aceita_cotacao_externa', 'ativa']}
        salvar={salvarTransportadora}
        excluir={excluirTransportadora}
        camposFormulario={[
          { nome: 'codigo_interno', rotulo: 'Código interno' },
          { nome: 'razao_social', rotulo: 'Razão social' },
          { nome: 'nome_fantasia', rotulo: 'Nome fantasia' },
          { nome: 'documento', rotulo: 'CNPJ/CPF' },
          { nome: 'email', rotulo: 'E-mail' },
          { nome: 'telefone', rotulo: 'Telefone' },
          { nome: 'responsavel', rotulo: 'Responsável' },
          { nome: 'aceita_cotacao_externa', rotulo: 'Aceita cotação externa', tipo: 'checkbox' },
          { nome: 'apresenta_menor_cotacao', rotulo: 'Mostrar menor cotação', tipo: 'checkbox' },
          { nome: 'apresenta_cubagem', rotulo: 'Mostrar cubagem', tipo: 'checkbox' },
          { nome: 'apresenta_peso', rotulo: 'Mostrar peso', tipo: 'checkbox' },
          { nome: 'apresenta_valor_tabela', rotulo: 'Mostrar valor tabela', tipo: 'checkbox' },
          { nome: 'sla_resposta_horas', rotulo: 'SLA resposta horas', tipo: 'number' },
          { nome: 'recebe_prazo_solicitado', rotulo: 'Mostrar prazo da venda', tipo: 'checkbox' },
          { nome: 'exige_prazo_resposta', rotulo: 'Solicitar prazo no link', tipo: 'checkbox' },
          { nome: 'prazo_resposta_obrigatorio', rotulo: 'Prazo obrigatório', tipo: 'checkbox' },
          { nome: 'solicita_numero_cotacao', rotulo: 'Solicitar número da cotação', tipo: 'checkbox' },
          { nome: 'apresenta_lista_produtos', rotulo: 'Mostrar produtos no link', tipo: 'checkbox' },
          { nome: 'ativa', rotulo: 'Ativa', tipo: 'checkbox' }
        ]}
      />
    </>
  );
}

function ConfiguracoesEmailAdmin({
  usuarios,
  empresas
}: {
  usuarios: RegistroGenerico[];
  empresas: EmpresaUsuario[];
}) {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({});
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      setLinhas(await listarConfiguracoesEmail());
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar configurações de e-mail.');
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setMensagem('');
    setErro('');
    try {
      await salvarConfiguracaoEmail(formulario);
      setMensagem('Configuração de e-mail salva com sucesso.');
      setFormulario({});
      setAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar configuração de e-mail.');
    }
  }

  async function testar(id: number) {
    setMensagem('');
    setErro('');
    try {
      const retorno = await testarConfiguracaoEmail(id);
      setMensagem(String((retorno as any).teste?.mensagem ?? (retorno as any).teste_mensagem ?? 'Conexão SMTP validada com sucesso.'));
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao testar configuração.');
    }
  }

  return (
    <section className="painelTabela">
      <header>
        <div>
          <span>Rotina administrativa</span>
          <h2>Configurações de E-mail</h2>
          <p>Contas SMTP, assinatura e liberação de envio vinculadas aos usuários.</p>
        </div>
        <button className="primary" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : 'Nova configuração'}</button>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {aberto && (
        <form className="formCadastro" onSubmit={salvar}>
          <label>Usuário
            <select value={String(formulario.usuario_id ?? '')} onChange={(evento) => setFormulario({ ...formulario, usuario_id: Number(evento.target.value) })}>
              <option value="">Selecione</option>
              {usuarios.map((item: any) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome)} · {String(item.email)}</option>)}
            </select>
          </label>
          <label>Empresa
            <select value={String(formulario.empresa_id ?? '')} onChange={(evento) => setFormulario({ ...formulario, empresa_id: evento.target.value ? Number(evento.target.value) : null })}>
              <option value="">Todas</option>
              {empresas.map((item: any) => <option key={item.id} value={item.id}>{item.nome_exibido ?? item.nome_fantasia}</option>)}
            </select>
          </label>
          <label>Descrição<input value={String(formulario.descricao ?? '')} onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })} /></label>
          <label>Nome remetente<input value={String(formulario.nome_remetente ?? '')} onChange={(evento) => setFormulario({ ...formulario, nome_remetente: evento.target.value })} /></label>
          <label>E-mail remetente<input value={String(formulario.email_remetente ?? '')} onChange={(evento) => setFormulario({ ...formulario, email_remetente: evento.target.value })} /></label>
          <label>Servidor SMTP<input value={String(formulario.servidor_smtp ?? '')} onChange={(evento) => setFormulario({ ...formulario, servidor_smtp: evento.target.value })} /></label>
          <label>Porta<input type="number" value={String(formulario.porta_smtp ?? 587)} onChange={(evento) => setFormulario({ ...formulario, porta_smtp: Number(evento.target.value) })} /></label>
          <label>Usuário SMTP<input value={String(formulario.usuario_smtp ?? '')} onChange={(evento) => setFormulario({ ...formulario, usuario_smtp: evento.target.value })} /></label>
          <label>Senha SMTP<input type="password" value={String(formulario.senha_smtp ?? '')} onChange={(evento) => setFormulario({ ...formulario, senha_smtp: evento.target.value })} /></label>
          <label>Segurança
            <select value={String(formulario.seguranca ?? 'STARTTLS')} onChange={(evento) => setFormulario({ ...formulario, seguranca: evento.target.value })}>
              <option value="STARTTLS">STARTTLS</option>
              <option value="SSL">SSL/TLS</option>
              <option value="NENHUMA">Nenhuma</option>
            </select>
          </label>
          <label>Reply-to<input value={String(formulario.email_resposta ?? '')} onChange={(evento) => setFormulario({ ...formulario, email_resposta: evento.target.value })} /></label>
          <label>Assinatura HTML<input value={String(formulario.assinatura_html ?? '')} onChange={(evento) => setFormulario({ ...formulario, assinatura_html: evento.target.value })} /></label>
          <label className="campoLargo">
            Modelo do e-mail para transportadora
            <small>Tags disponíveis: TRANSPORTADORA e DOCUMENTOS. A tag DOCUMENTOS monta a tabela com Documento, Chave, Valor referência, Validade do Link e Link.</small>
            <textarea
              value={String(formulario.modelo_email_transportadora ?? MODELO_EMAIL_TRANSPORTADORA_PADRAO)}
              onChange={(evento) => setFormulario({ ...formulario, modelo_email_transportadora: evento.target.value })}
            />
          </label>
          <label>Permite envio de cotação<input type="checkbox" checked={Boolean(formulario.permite_envio_cotacao ?? true)} onChange={(evento) => setFormulario({ ...formulario, permite_envio_cotacao: evento.target.checked })} /></label>
          <label>Padrão<input type="checkbox" checked={Boolean(formulario.padrao ?? false)} onChange={(evento) => setFormulario({ ...formulario, padrao: evento.target.checked })} /></label>
          <label>Ativa<input type="checkbox" checked={Boolean(formulario.ativo ?? true)} onChange={(evento) => setFormulario({ ...formulario, ativo: evento.target.checked })} /></label>
          <button className="primary">Salvar configuração</button>
        </form>
      )}
      <div className="tabelaWrap">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Descrição</th>
              <th>Remetente</th>
              <th>SMTP</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={String(linha.id)}>
                <td>{String(linha.usuario_nome ?? '-')}</td>
                <td>{String(linha.descricao ?? '-')}</td>
                <td>{String(linha.email_remetente ?? '-')}</td>
                <td>{String(linha.servidor_smtp ?? '-')}:{String(linha.porta_smtp ?? '-')}</td>
                <td>{String(linha.ativo ? 'Ativa' : 'Inativa')} · {String(linha.teste_status ?? 'Não testado')}</td>
                <td className="acoesTabela">
                  <button className="ghost" onClick={() => { setFormulario(linha); setAberto(true); }}>Alterar</button>
                  <button className="ghost" onClick={() => testar(Number(linha.id))}>Testar</button>
                </td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={6}>Nenhuma configuração cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConfiguracoesSistema({ empresaAtiva }: { empresaAtiva: EmpresaUsuario | null }) {
  const [empresa, setEmpresa] = useState<RegistroGenerico>({});
  const [parametros, setParametros] = useState<Record<string, string>>({});
  const [origensCotacao, setOrigensCotacao] = useState<RegistroGenerico[]>([]);
  const [motivosEscolha, setMotivosEscolha] = useState<RegistroGenerico[]>([]);
  const [novoMotivo, setNovoMotivo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    setEmpresa({
      codigo_empresa: empresaAtiva?.codigo_empresa ?? '',
      razao_social: empresaAtiva?.razao_social ?? '',
      nome_fantasia: empresaAtiva?.nome_fantasia ?? '',
      nome_exibido: empresaAtiva?.nome_exibido ?? '',
      dominio_publico: empresaAtiva?.dominio_publico ?? '',
      caminho_logo: empresaAtiva?.caminho_logo ?? '',
      caminho_imagem_fundo: empresaAtiva?.caminho_imagem_fundo ?? '',
      ativa: true
    });
  }, [empresaAtiva]);

  useEffect(() => {
    listarParametrosSistema()
      .then((dados: any) => {
        const mapa: Record<string, string> = {};
        dados.forEach((item: any) => {
          mapa[String(item.chave)] = String(item.valor ?? '');
        });
        setParametros(mapa);
      })
      .catch(() => setParametros({}));
    listarOrigensComerciaisCotacao().then(setOrigensCotacao).catch(() => setOrigensCotacao([]));
    listarMotivosEscolhaTransportadora().then(setMotivosEscolha).catch(() => setMotivosEscolha([]));
  }, []);

  function alternarOrigemObrigatoria(origem: string) {
    const origemNormalizada = origem.trim().toUpperCase();
    const atuais = listarOrigensObrigatorias(parametros);
    const novas = atuais.includes(origemNormalizada)
      ? atuais.filter((item) => item !== origemNormalizada)
      : [...atuais, origemNormalizada];
    setParametros({ ...parametros, ORIGENS_OBRIGAM_TRANSPORTADORA_PEDIDO: novas.join(',') });
  }

  async function cadastrarMotivoEscolha() {
    if (!novoMotivo.trim()) {
      return;
    }
    await salvarMotivoEscolhaTransportadora({
      descricao: novoMotivo.trim(),
      ativo: true
    });
    setNovoMotivo('');
    setMotivosEscolha(await listarMotivosEscolhaTransportadora());
    setMensagem('Motivo cadastrado com sucesso.');
  }

  function carregarImagem(campo: 'caminho_logo' | 'caminho_imagem_fundo', arquivo?: File) {
    if (!arquivo) {
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => setEmpresa((atual) => ({ ...atual, [campo]: String(leitor.result ?? '') }));
    leitor.readAsDataURL(arquivo);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setMensagem('');
    setErro('');

    try {
      await salvarEmpresa(empresa);
      await salvarParametrosSistema([
        { chave: 'AMBIENTE_LINK_COTACAO', valor: parametros.AMBIENTE_LINK_COTACAO ?? 'HOMOLOGACAO' },
        { chave: 'URL_PUBLICA_COTACAO', valor: parametros.URL_PUBLICA_COTACAO ?? '' },
        { chave: 'URL_INTERNA_COTACAO', valor: parametros.URL_INTERNA_COTACAO ?? '' },
        { chave: 'VALOR_FRETE_COTADO_AUT_MAIOR_QUE', valor: parametros.VALOR_FRETE_COTADO_AUT_MAIOR_QUE ?? '' },
        { chave: 'DIFERENCA_FRETE_COTADO', valor: parametros.DIFERENCA_FRETE_COTADO ?? '' },
        { chave: 'PERCENTUAL_DIFERENCA_FRETE_COTADO_AUT', valor: parametros.PERCENTUAL_DIFERENCA_FRETE_COTADO_AUT ?? '' },
        { chave: 'DIAS_ACEITAVEL_DIFERENCA_PRAZO_PEDIDO_COTACAO', valor: parametros.DIAS_ACEITAVEL_DIFERENCA_PRAZO_PEDIDO_COTACAO ?? '' },
        { chave: 'ORIGENS_OBRIGAM_TRANSPORTADORA_PEDIDO', valor: parametros.ORIGENS_OBRIGAM_TRANSPORTADORA_PEDIDO ?? '' },
        { chave: 'MOTIVO_PADRAO_TRANSPORTADORA_PEDIDO_ID', valor: parametros.MOTIVO_PADRAO_TRANSPORTADORA_PEDIDO_ID ?? '' }
      ]);
      setMensagem('Configurações salvas com sucesso.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar configurações.');
    }
  }

  return (
    <section className="painelTabela configuracoesPainel">
      <header>
        <div>
          <span>Configurações</span>
          <h2>Identidade visual do cliente</h2>
          <p>Identidade, marcas e URLs usadas nas telas internas e nos links enviados para transportadoras.</p>
        </div>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      <form className="formCadastro" onSubmit={salvar}>
        <label>Nome exibido no topo<input value={String(empresa.nome_exibido ?? '')} onChange={(evento) => setEmpresa({ ...empresa, nome_exibido: evento.target.value })} /></label>
        <label>Descricao curta<input value={String(empresa.nome_fantasia ?? '')} onChange={(evento) => setEmpresa({ ...empresa, nome_fantasia: evento.target.value })} /></label>
        <label>Razao social<input value={String(empresa.razao_social ?? '')} onChange={(evento) => setEmpresa({ ...empresa, razao_social: evento.target.value })} /></label>
        <label>Codigo da empresa<input value={String(empresa.codigo_empresa ?? '')} onChange={(evento) => setEmpresa({ ...empresa, codigo_empresa: evento.target.value })} /></label>
        <label>Dominio publico<input value={String(empresa.dominio_publico ?? '')} onChange={(evento) => setEmpresa({ ...empresa, dominio_publico: evento.target.value })} /></label>
        <label>Logo do cliente<input value={String(empresa.caminho_logo ?? '')} onChange={(evento) => setEmpresa({ ...empresa, caminho_logo: evento.target.value })} /></label>
        <label>Escolher logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(evento) => carregarImagem('caminho_logo', evento.target.files?.[0])} /></label>
        <label>Imagem de fundo<input value={String(empresa.caminho_imagem_fundo ?? '')} onChange={(evento) => setEmpresa({ ...empresa, caminho_imagem_fundo: evento.target.value })} /></label>
        <label>Escolher fundo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(evento) => carregarImagem('caminho_imagem_fundo', evento.target.files?.[0])} /></label>
        <label>Ambiente do link
          <select value={parametros.AMBIENTE_LINK_COTACAO ?? 'HOMOLOGACAO'} onChange={(evento) => setParametros({ ...parametros, AMBIENTE_LINK_COTACAO: evento.target.value })}>
            <option value="HOMOLOGACAO">HOMOLOGACAO</option>
            <option value="PRODUCAO">PRODUCAO</option>
          </select>
        </label>
        <label>Link publico<input value={parametros.URL_PUBLICA_COTACAO ?? ''} onChange={(evento) => setParametros({ ...parametros, URL_PUBLICA_COTACAO: evento.target.value })} /></label>
        <label>Link interno<input value={parametros.URL_INTERNA_COTACAO ?? ''} onChange={(evento) => setParametros({ ...parametros, URL_INTERNA_COTACAO: evento.target.value })} /></label>
        <label>Valor frete cotado aut. maior que<input value={parametros.VALOR_FRETE_COTADO_AUT_MAIOR_QUE ?? ''} onChange={(evento) => setParametros({ ...parametros, VALOR_FRETE_COTADO_AUT_MAIOR_QUE: evento.target.value })} /></label>
        <label>Diferença frete cotado<input value={parametros.DIFERENCA_FRETE_COTADO ?? ''} onChange={(evento) => setParametros({ ...parametros, DIFERENCA_FRETE_COTADO: evento.target.value })} /></label>
        <label>% diferença frete cotado aut.<input value={parametros.PERCENTUAL_DIFERENCA_FRETE_COTADO_AUT ?? ''} onChange={(evento) => setParametros({ ...parametros, PERCENTUAL_DIFERENCA_FRETE_COTADO_AUT: evento.target.value })} /></label>
        <label>Dias aceitáveis prazo pedido x cotação<input value={parametros.DIAS_ACEITAVEL_DIFERENCA_PRAZO_PEDIDO_COTACAO ?? ''} onChange={(evento) => setParametros({ ...parametros, DIAS_ACEITAVEL_DIFERENCA_PRAZO_PEDIDO_COTACAO: evento.target.value })} /></label>
        <fieldset className="campoLargo grupoConfiguracao">
          <legend>Obriga transportadora do Pedido para</legend>
          <small>Selecione as origens comerciais em que a transportadora definida no pedido deve ser obrigatória.</small>
          <div className="chipsSelecao">
            {origensCotacao.map((item) => {
              const origem = String(item.origem_comercial ?? '');
              const selecionada = listarOrigensObrigatorias(parametros).includes(origem.trim().toUpperCase());
              return (
                <label key={origem} className={selecionada ? 'chipOpcao ativo' : 'chipOpcao'}>
                  <input type="checkbox" checked={selecionada} onChange={() => alternarOrigemObrigatoria(origem)} />
                  {origem}
                </label>
              );
            })}
            {origensCotacao.length === 0 && <small>Nenhuma origem encontrada em cotações ativas.</small>}
          </div>
        </fieldset>
        <label>Motivo padrão para transportadora do Pedido
          <select value={parametros.MOTIVO_PADRAO_TRANSPORTADORA_PEDIDO_ID ?? ''} onChange={(evento) => setParametros({ ...parametros, MOTIVO_PADRAO_TRANSPORTADORA_PEDIDO_ID: evento.target.value })}>
            <option value="">Selecionar motivo</option>
            {motivosEscolha.filter((item) => item.ativo !== false).map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.descricao)}</option>)}
          </select>
        </label>
        <button className="primary">Salvar configuracoes</button>
      </form>
      <section className="painelSecundarioCadastro">
        <header>
          <div>
            <span>Cadastro auxiliar</span>
            <h3>Motivos de escolha da transportadora</h3>
            <p>Use para justificar escolhas que não foram a melhor oferta.</p>
          </div>
        </header>
        <div className="linhaCadastroRapido">
          <input placeholder="Novo motivo" value={novoMotivo} onChange={(evento) => setNovoMotivo(evento.target.value)} />
          <button type="button" className="ghost" onClick={cadastrarMotivoEscolha}>Cadastrar motivo</button>
        </div>
        <div className="chipsSelecao">
          {motivosEscolha.map((item) => <span className={item.ativo === false ? 'chipLeitura inativo' : 'chipLeitura'} key={String(item.id)}>{String(item.descricao)}</span>)}
          {motivosEscolha.length === 0 && <span className="chipLeitura inativo">Nenhum motivo cadastrado</span>}
        </div>
      </section>
    </section>
  );
}

function SelecaoModulo({
  usuario,
  empresaAtiva,
  empresas,
  aoTrocarEmpresa,
  aoAbrirModulo,
  aoSair
}: {
  usuario: UsuarioLogado;
  empresaAtiva: EmpresaUsuario | null;
  empresas: EmpresaUsuario[];
  aoTrocarEmpresa: (empresaId: number) => void;
  aoAbrirModulo: () => void;
  aoSair: () => void;
}) {
  const podeCotacao = usuario.superadmin || usuario.administrador || usuario.permissoes?.includes('UTILIZA_COTACAO_FRETE');

  return (
    <main className="selecaoModulo">
      <section className="selecaoModuloTopo">
        <div>
          <span>Control S Hub</span>
          <h1>Selecione o módulo</h1>
          <p>{usuario.nome}</p>
        </div>
        <div className="selecaoModuloAcoes">
          <select value={empresaAtiva?.id ?? ''} onChange={(evento) => aoTrocarEmpresa(Number(evento.target.value))}>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>{empresa.nome_exibido ?? empresa.nome_fantasia}</option>
            ))}
          </select>
          <button className="ghost" onClick={aoSair}>Sair</button>
        </div>
      </section>
      <section className="modulosGrid">
        <button className="moduloCard" disabled={!podeCotacao} onClick={aoAbrirModulo}>
          <strong>{moduloCotacao.emoji}</strong>
          <span>{moduloCotacao.nome}</span>
          <small>{podeCotacao ? moduloCotacao.descricao : 'Sem permissão: UTILIZA_COTACAO_FRETE'}</small>
        </button>
      </section>
    </main>
  );
}

export function App() {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaUsuario[]>([]);
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaUsuario | null>(null);
  const [tela, setTela] = useState<TelaAtual>(() => obterTelaPelaRota());
  const [moduloAberto, setModuloAberto] = useState(false);
  const [menuRecolhido, setMenuRecolhido] = useState(false);
  const [perfisCadastro, setPerfisCadastro] = useState<RegistroGenerico[]>([]);
  const [usuariosCadastro, setUsuariosCadastro] = useState<RegistroGenerico[]>([]);
  const [emailConfiguracoesCadastro, setConfiguracoesEmailCadastro] = useState<RegistroGenerico[]>([]);
  const [cotacaoParaAbrir, setCotacaoParaAbrir] = useState<string | number | null>(null);
  const [menuArrastado, setMenuArrastado] = useState<TelaAtual | null>(null);
  const [preferenciasInterface, setPreferenciasInterface] = useState<Record<string, unknown>>({});
  const [ordemMenus, setOrdemMenus] = useState<TelaAtual[]>(() => {
    const salvo = localStorage.getItem('controlSHubMenuOrdem');
    return salvo ? JSON.parse(salvo) : menus.map((item: any) => item.id);
  });

  function aoEntrar(usuarioLogado: UsuarioLogado, empresasUsuario: EmpresaUsuario[]) {
    const preferencias = usuarioLogado.preferencias_interface ?? {};
    const ordemMenusUsuario = Array.isArray(preferencias.ordem_menus)
      ? preferencias.ordem_menus.filter((id): id is TelaAtual => menus.some((menu) => menu.id === id))
      : [];

    setUsuario(usuarioLogado);
    setEmpresas(empresasUsuario);
    setEmpresaAtiva(empresasUsuario.find((empresa) => empresa.padrao) ?? empresasUsuario[0] ?? null);
    setPreferenciasInterface(preferencias);
    setMenuRecolhido(Boolean(preferencias.menu_recolhido));
    if (ordemMenusUsuario.length) {
      setOrdemMenus([...ordemMenusUsuario, ...menus.map((item: any) => item.id).filter((id) => !ordemMenusUsuario.includes(id))]);
    }
    const telaRota = obterTelaPelaRota();
    setTela(telaRota);
    setModuloAberto(window.location.pathname !== '/');
  }

  function sair() {
    localStorage.removeItem('controlSHubToken');
    setUsuario(null);
    setModuloAberto(false);
    window.history.replaceState(null, '', '/');
  }

  async function alterarEmpresaAtiva(empresaId: number) {
    const retorno = await trocarEmpresa(empresaId);
    localStorage.setItem('controlSHubToken', retorno.token);
    setEmpresaAtiva(retorno.empresa);
    setUsuario((atual) => atual ? { ...atual, empresaAtivaId: retorno.empresa.id, permissoes: retorno.permissoes } : atual);
  }

  function salvarPreferenciasLocais(preferencias: Record<string, unknown>) {
    setPreferenciasInterface((atuais) => ({ ...atuais, ...preferencias }));
    salvarPreferenciasInterface(preferencias).catch(() => undefined);
  }

  function alternarMenuRecolhido() {
    const novoValor = !menuRecolhido;
    setMenuRecolhido(novoValor);
    salvarPreferenciasLocais({ menu_recolhido: novoValor });
  }


  useEffect(() => {
    const tokenSalvo = localStorage.getItem('controlSHubToken');
    if (!tokenSalvo || usuario) {
      return;
    }

    obterSessaoAtualLocal()
      .then((dados) => {
        aoEntrar({ ...dados.usuario, permissoes: dados.permissoes }, dados.empresas);
      })
      .catch(() => {
        localStorage.removeItem('controlSHubToken');
      });
  }, [usuario]);

  useEffect(() => {
    const aoAlterarRota = () => {
      const telaRota = obterTelaPelaRota();
      setTela(telaRota);
      if (window.location.pathname !== '/') {
        setModuloAberto(true);
      }
    };

    window.addEventListener('popstate', aoAlterarRota);
    return () => window.removeEventListener('popstate', aoAlterarRota);
  }, []);

  useEffect(() => {
    if (usuario) {
      listarPerfis().then(setPerfisCadastro).catch(() => setPerfisCadastro([]));
      listarUsuarios().then(setUsuariosCadastro).catch(() => setUsuariosCadastro([]));
      listarConfiguracoesEmail().then(setConfiguracoesEmailCadastro).catch(() => setConfiguracoesEmailCadastro([]));
    }
  }, [usuario]);

  const tokenPublico = window.location.pathname.startsWith('/cotacao/token/')
    ? window.location.pathname.replace('/cotacao/token/', '')
    : '';

  if (tokenPublico) {
    return <PaginaPublicaCotacao token={tokenPublico} />;
  }

  if (!usuario) {
    return <Login aoEntrar={aoEntrar} />;
  }

  if (!moduloAberto) {
    return (
      <SelecaoModulo
        usuario={usuario}
        empresaAtiva={empresaAtiva}
        empresas={empresas}
        aoTrocarEmpresa={alterarEmpresaAtiva}
        aoAbrirModulo={() => { setModuloAberto(true); navegarParaTela(tela, true); }}
        aoSair={sair}
      />
    );
  }

  const menusPermitidos = menus.filter((item) => usuarioPodeVerMenu(usuario, item.id));
  const menusOrdenados = ordemMenus
    .map((id) => menusPermitidos.find((item: any) => item.id === id))
    .filter(Boolean) as typeof menus;
  const menusVisiveis = [
    ...menusOrdenados,
    ...menusPermitidos.filter((item) => !menusOrdenados.some((menu) => menu.id === item.id))
  ];
  const titulo = menus.find((item: any) => item.id === tela)?.nome ?? 'Control S Hub';
  const telaAtualPermitida = usuarioPodeVerMenu(usuario, tela);

  useEffect(() => {
    if (!telaAtualPermitida && menusVisiveis.length) {
      setTela(menusVisiveis[0].id);
      navegarParaTela(menusVisiveis[0].id, true);
    }
  }, [telaAtualPermitida, menusVisiveis, tela]);

  if (!telaAtualPermitida && menusVisiveis.length) {
    return null;
  }

  function reordenarMenu(destino: TelaAtual) {
    if (!menuArrastado || menuArrastado === destino) {
      return;
    }
    const novaOrdem = ordemMenus.filter((id) => id !== menuArrastado);
    novaOrdem.splice(novaOrdem.indexOf(destino), 0, menuArrastado);
    setOrdemMenus(novaOrdem);
    localStorage.setItem('controlSHubMenuOrdem', JSON.stringify(novaOrdem));
    salvarPreferenciasLocais({ ordem_menus: novaOrdem });
    setMenuArrastado(null);
  }

  return (
    <div className={menuRecolhido ? 'appShell compacta' : 'appShell'}>
      <aside>
        <div className="marca">
          <img src="/brand/logo-s-novo.jpg" alt="Control S" />
          <div>
            <strong>Control S</strong>
            <span>Hub</span>
          </div>
        </div>
        <nav>
          {menusVisiveis.map((item: any) => {
            const Icone = item.icone;
            return (
              <button
                className={tela === item.id ? 'active' : ''}
                draggable
                key={item.id}
                onClick={() => { setTela(item.id); navegarParaTela(item.id); setModuloAberto(true); }}
                onDragStart={() => setMenuArrastado(item.id)}
                onDragOver={(evento) => evento.preventDefault()}
                onDrop={() => reordenarMenu(item.id)}
                title="Arraste para reorganizar"
              >
                <Icone size={17} />
                {item.nome}
              </button>
            );
          })}
        </nav>
        <button className="collapse" onClick={alternarMenuRecolhido}>
          {menuRecolhido ? '⬺' : '⬹ Recolher menu'}
        </button>
      </aside>
      <main>
        <header className="topbar">
          <div className="topbarTitulo">
            <img src="/brand/logo-s-novo.jpg" alt="Control S Hub" />
            <div>
              <span className="eyebrow">Control S Hub</span>
              <h1>{titulo}</h1>
            </div>
          </div>
          <select value={empresaAtiva?.id ?? ''} onChange={(evento) => alterarEmpresaAtiva(Number(evento.target.value))}>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>{empresa.nome_exibido ?? empresa.nome_fantasia}</option>
            ))}
          </select>
          <div className="empresaTopo">
            <img src={empresaAtiva?.caminho_logo || '/brand/logo-s-novo.jpg'} alt={empresaAtiva?.nome_fantasia ?? 'Empresa'} />
            <div>
              <small>{empresaAtiva?.nome_fantasia ?? 'Empresa ativa'}</small>
              <strong>{empresaAtiva?.nome_exibido ?? empresaAtiva?.razao_social ?? ''}</strong>
            </div>
          </div>
          <FonteDaTela tela={tela} usuario={usuario} />
          <button className="ghost" onClick={sair}>
            <LogOut size={15} />
            Sair
          </button>
          <button className="ghost" onClick={() => { setModuloAberto(false); window.history.pushState(null, '', '/'); }}>Módulos</button>
        </header>
        {tela === 'dashboard' && <Dashboard />}
        {tela === 'cotacoes' && <CotacoesOperacional usuario={usuario} cotacaoInicialId={cotacaoParaAbrir} aoCotacaoInicialAberta={() => setCotacaoParaAbrir(null)} />}
        {tela === 'envioMassa' && <EnvioMassaCotacoes />}
        {tela === 'kanban' && (
          <KanbanCotacoes
            aoAbrirCotacao={(cotacaoId) => { setCotacaoParaAbrir(String(cotacaoId)); setTela('cotacoes'); navegarParaTela('cotacoes'); }}
            ordemInicial={Array.isArray(preferenciasInterface.ordem_kanban) ? preferenciasInterface.ordem_kanban as string[] : []}
            aoSalvarOrdem={(ordem) => salvarPreferenciasLocais({ ordem_kanban: ordem })}
          />
        )}
        {tela === 'empresas' && (
          <TabelaOperacional
            titulo="Empresas"
            subtitulo="Base multiempresa com dominio publico, identidade visual e status."
            carregar={listarEmpresas}
            colunas={['codigo_empresa', 'nome_fantasia', 'cnpj', 'dominio_publico', 'ativa']}
            salvar={salvarEmpresa}
            excluir={excluirEmpresa}
            camposFormulario={[
              { nome: 'codigo_empresa', rotulo: 'Codigo' },
              { nome: 'razao_social', rotulo: 'Razao social' },
              { nome: 'nome_fantasia', rotulo: 'Nome fantasia' },
              { nome: 'cnpj', rotulo: 'CNPJ' },
              { nome: 'dominio_publico', rotulo: 'Dominio publico' },
              { nome: 'nome_exibido', rotulo: 'Nome exibido' },
              { nome: 'caminho_logo', rotulo: 'Logo do cliente' },
              { nome: 'caminho_imagem_fundo', rotulo: 'Imagem de fundo' },
              { nome: 'ativa', rotulo: 'Ativa', tipo: 'checkbox' }
            ]}
          />
        )}
        {tela === 'usuarios' && (
          <TabelaOperacional
            titulo="Usuários"
            subtitulo="Usuários vinculados a perfis/setores, empresas e permissões complementares."
            carregar={listarUsuarios}
            colunas={['nome', 'email', 'perfil_nome', 'administrador', 'superadmin', 'ativo']}
            salvar={salvarUsuario}
            excluir={excluirUsuario}
            camposFormulario={[
              { nome: 'nome', rotulo: 'Nome' },
              { nome: 'email', rotulo: 'E-mail' },
              { nome: 'senha', rotulo: 'Senha inicial' },
              { nome: 'perfil_id', rotulo: 'Perfil/Setor', tipo: 'select', opcoes: perfisCadastro, valorOpcao: 'id', textoOpcao: 'nome' },
              { nome: 'configuracao_email_padrao_id', rotulo: 'Configuração e-mail padrão', tipo: 'select', opcoes: emailConfiguracoesCadastro, valorOpcao: 'id', textoOpcao: 'descricao' },
              { nome: 'administrador', rotulo: 'Administrador', tipo: 'checkbox' },
              { nome: 'superadmin', rotulo: 'Superadmin', tipo: 'checkbox' },
              { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }
            ]}
          />
        )}
        {tela === 'perfis' && (
          <TabelaOperacional
            titulo="Perfis e Direitos"
            subtitulo="Perfis baseados em setores com permissoes por modulo, tela, botao, acao e etapa."
            carregar={listarPerfis}
            colunas={['codigo', 'nome', 'administrador', 'ativo']}
            salvar={salvarPerfil}
            excluir={excluirPerfil}
            camposFormulario={[
              { nome: 'codigo', rotulo: 'Codigo' },
              { nome: 'nome', rotulo: 'Nome' },
              { nome: 'descricao', rotulo: 'Descricao' },
              { nome: 'administrador', rotulo: 'Administrador', tipo: 'checkbox' },
              { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }
            ]}
          />
        )}
        {tela === 'direitos' && <MatrizPermissoes />}
        {tela === 'transportadoras' && <TransportadorasOperacional />}
        {tela === 'etapas' && (
          <TabelaOperacional
            titulo="Etapas do Kanban"
            subtitulo="Pipeline parametrizavel por empresa para Cotacao de Frete."
            carregar={listarEtapas}
            colunas={['ordem', 'codigo', 'nome', 'cor', 'permite_arrastar', 'obriga_feedback', 'etapa_bloqueada']}
            salvar={salvarEtapa}
            excluir={excluirEtapa}
            camposFormulario={[
              { nome: 'codigo', rotulo: 'Codigo' },
              { nome: 'nome', rotulo: 'Nome' },
              { nome: 'descricao', rotulo: 'Descricao' },
              { nome: 'cor', rotulo: 'Cor' },
              { nome: 'ordem', rotulo: 'Ordem', tipo: 'number' },
              { nome: 'permite_arrastar', rotulo: 'Permite arrastar', tipo: 'checkbox' },
              { nome: 'obriga_feedback', rotulo: 'Obriga feedback', tipo: 'checkbox' },
              { nome: 'etapa_final', rotulo: 'Etapa final', tipo: 'checkbox' },
              { nome: 'etapa_bloqueada', rotulo: 'Etapa bloqueada', tipo: 'checkbox' },
              { nome: 'ativa', rotulo: 'Ativa', tipo: 'checkbox' }
            ]}
          />
        )}
        {tela === 'auditoria' && (
          <TabelaOperacional
            titulo="Auditoria"
            subtitulo="Eventos recentes de login, alteracoes, tokens, bloqueios e operacao."
            carregar={listarAuditorias}
            colunas={['criado_em', 'tipo_evento', 'modulo_codigo', 'tabela_afetada', 'descricao', 'usuario_nome']}
          />
        )}
        {tela === 'emailConfiguracoes' && <ConfiguracoesEmailAdmin usuarios={usuariosCadastro} empresas={empresas} />}
        {tela === 'configuracoes' && <ConfiguracoesSistema empresaAtiva={empresaAtiva} />}
        <footer className="appFooter">CONTROL S CONSULTORIA — Direitos Reservados</footer>
      </main>
    </div>
  );
}




