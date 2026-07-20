import { Activity, ArrowLeft, BarChart3, Copy, Database, Download, Eye, FileCode2, Filter, Info, LayoutDashboard, Maximize2, Monitor, PanelsTopLeft, Plus, RefreshCw, Save, Settings, Sparkles, Table2, Trash2, Upload, UserCheck, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  duplicarDashboardBi,
  EmpresaUsuario,
  executarWidgetBi,
  excluirConsultaBi,
  excluirDashboardBi,
  excluirPermissaoDashboardBi,
  excluirWidgetBi,
  exportarDashboardBi,
  importarDashboardBi,
  listarConsultasBi,
  listarDashboardsBi,
  listarFontesDadosBi,
  listarLogsBi,
  listarPerfis,
  listarTemplatesBi,
  listarUsuarios,
  obterDashboardBi,
  publicarDashboardBi,
  RegistroGenerico,
  salvarConsultaBi,
  salvarDashboardBi,
  salvarPaginaBi,
  salvarPermissaoDashboardBi,
  salvarWidgetBi,
  testarConsultaBi,
  UsuarioLogado
} from '../../servicos/api';

export const menusBusinessIntelligence = [
  { id: 'biDashboards', nome: 'Dashboards', icone: LayoutDashboard },
  { id: 'biFontesDados', nome: 'Fontes de Dados', icone: Database },
  { id: 'biConsultas', nome: 'Consultas SQL', icone: FileCode2 },
  { id: 'biTemplates', nome: 'Templates', icone: PanelsTopLeft },
  { id: 'biLogs', nome: 'Logs', icone: Activity }
];

export const permissoesMenuBi: Record<string, string[]> = {
  biDashboards: ['VISUALIZAR_BUSINESS_INTELLIGENCE'],
  biFontesDados: ['BI_CONFIGURAR_FONTES_DADOS'],
  biConsultas: ['BI_CONFIGURAR_CONSULTAS'],
  biTemplates: ['VISUALIZAR_BUSINESS_INTELLIGENCE'],
  biLogs: ['BI_VISUALIZAR_LOGS']
};

export function usuarioPodeBi(usuario: UsuarioLogado, codigos: string[]) {
  return usuario.superadmin || usuario.administrador || codigos.some((codigo) => usuario.permissoes?.includes(codigo));
}

function formatarValorBi(valor: unknown, monetario = false) {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const data = new Date(valor);
    if (!Number.isNaN(data.getTime())) {
      return data.toLocaleDateString('pt-BR');
    }
  }
  const numero = Number(valor);
  if (Number.isFinite(numero)) {
    return monetario
      ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : numero.toLocaleString('pt-BR');
  }
  return String(valor ?? '-');
}

function colunaPedidoBi(coluna: string) {
  const chave = normalizarChaveBi(coluna);
  return chave === 'pedido' || chave === 'numero_pedido' || chave.endsWith('_pedido');
}

function colunaValorBi(coluna: string) {
  const chave = normalizarChaveBi(coluna);
  return chave === 'valor' || chave.includes('valor') || chave.includes('total');
}

function formatarCelulaBi(coluna: string, valor: unknown) {
  if (colunaPedidoBi(coluna)) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? String(Math.trunc(numero)) : String(valor ?? '-');
  }
  return formatarValorBi(valor, colunaValorBi(coluna));
}

function rotuloMetricaKpi(campo: string) {
  const rotulos: Record<string, string> = {
    pedidos_do_dia: 'Pedidos do dia',
    pedidos_maior_1_dia: 'Pedidos > 1 dia',
    aguardando_faturamento: 'Aguardando faturamento',
    aguardando_escolha_transportadora: 'Aguardando escolha da transportadora'
  };
  return rotulos[campo] ?? campo.replace(/_/g, ' ');
}

function EstadoBi({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <section className="biEstado">
      <BarChart3 size={34} />
      <strong>{titulo}</strong>
      <p>{descricao}</p>
    </section>
  );
}

function BiTabelaSimples({ linhas, colunas, acoes }: { linhas: RegistroGenerico[]; colunas: string[]; acoes?: (linha: RegistroGenerico) => JSX.Element }) {
  return (
    <div className="tabelaWrap">
      <table>
        <thead>
          <tr>
            {colunas.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}
            {acoes && <th>Acoes</th>}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr key={String(linha.id ?? indice)}>
              {colunas.map((coluna) => <td key={coluna}>{String(linha[coluna] ?? '-')}</td>)}
              {acoes && <td className="acoesTabela">{acoes(linha)}</td>}
            </tr>
          ))}
          {linhas.length === 0 && <tr><td colSpan={colunas.length + (acoes ? 1 : 0)}>Nenhum registro encontrado.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function BiCampo({ rotulo, children }: { rotulo: string; children: JSX.Element }) {
  return <label className="biCampo"><span>{rotulo}</span>{children}</label>;
}

function BiGraficoLinhas({ registros, cor }: { registros: RegistroGenerico[]; cor: string }) {
  const colunas = Array.from(new Set(registros.flatMap((registro) => Object.keys(registro))));
  const colunaValor = colunas.find((coluna) => ['valor', 'separados', 'quantidade', 'total'].includes(coluna)) ?? colunas.find((coluna) => Number.isFinite(Number(registros[0]?.[coluna]))) ?? 'valor';
  const colunaRotulo = colunas.find((coluna) => ['dia', 'data', 'periodo', 'mes'].includes(coluna)) ?? colunas[0] ?? 'dia';
  const valores = registros.map((registro) => Number(registro[colunaValor] ?? 0));
  const maximo = Math.max(1, ...valores);
  const pontos = valores.map((valor, indice) => {
    const x = registros.length <= 1 ? 8 : 8 + (indice * 84) / (registros.length - 1);
    const y = 74 - (valor * 58) / maximo;
    return { x, y, valor, rotulo: formatarValorBi(registros[indice]?.[colunaRotulo]) };
  });
  const linha = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(' ');
  const area = pontos.length ? `8,80 ${linha} 92,80` : '';
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  return (
    <div className="biGraficoLinha">
      <svg viewBox="0 0 100 88" preserveAspectRatio="none" role="img" aria-label="Grafico de linhas">
        <defs>
          <linearGradient id="biLinhaGradiente" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={cor} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d={area ? `M ${area} Z` : ''} fill="url(#biLinhaGradiente)" />
        <polyline points={linha} fill="none" stroke={cor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
        {pontos.map((ponto, indice) => <circle key={indice} cx={ponto.x} cy={ponto.y} r="1.8" fill={cor} vectorEffect="non-scaling-stroke" />)}
      </svg>
      <div className="biGraficoLegenda">
        <span>{primeiro ? `${primeiro.rotulo}: ${formatarValorBi(primeiro.valor)}` : 'Sem dados'}</span>
        <strong>{ultimo ? `${ultimo.rotulo}: ${formatarValorBi(ultimo.valor)}` : '-'}</strong>
      </div>
    </div>
  );
}

function normalizarChaveBi(chave: string) {
  return chave.trim().toLocaleLowerCase('pt-BR');
}

function normalizarLinhaBi(linha: RegistroGenerico): RegistroGenerico {
  const normalizada = Object.entries(linha ?? {}).reduce<RegistroGenerico>((acc, [chave, valor]) => {
    const chaveNormalizada = normalizarChaveBi(chave);
    if (chaveNormalizada === 'detalhes_json' && typeof valor === 'string') {
      try {
        const detalhes = JSON.parse(valor);
        acc[chaveNormalizada] = Array.isArray(detalhes) ? detalhes.map((item) => normalizarLinhaBi(item as RegistroGenerico)) : detalhes;
      } catch {
        acc[chaveNormalizada] = valor;
      }
      return acc;
    }
    if (Array.isArray(valor)) {
      acc[chaveNormalizada] = valor.map((item) => typeof item === 'object' && item !== null ? normalizarLinhaBi(item as RegistroGenerico) : item);
      return acc;
    }
    acc[chaveNormalizada] = valor;
    return acc;
  }, {});
  return normalizada;
}

function normalizarDetalheDashboardBi(dados: any): { dashboard: RegistroGenerico; paginas: RegistroGenerico[]; widgets: RegistroGenerico[]; filtros: RegistroGenerico[]; permissoes: RegistroGenerico[] } {
  if (dados?.dashboard) {
    return {
      dashboard: dados.dashboard,
      paginas: Array.isArray(dados.paginas) ? dados.paginas : [],
      widgets: Array.isArray(dados.widgets) ? dados.widgets : [],
      filtros: Array.isArray(dados.filtros) ? dados.filtros : [],
      permissoes: Array.isArray(dados.permissoes) ? dados.permissoes : []
    };
  }

  const { paginas, widgets, filtros, permissoes, ...dashboard } = dados ?? {};
  return {
    dashboard,
    paginas: Array.isArray(paginas) ? paginas : [],
    widgets: Array.isArray(widgets) ? widgets : [],
    filtros: Array.isArray(filtros) ? filtros : [],
    permissoes: Array.isArray(permissoes) ? permissoes : []
  };
}

function BiWidgetContainer({ widget, filtros }: { widget: RegistroGenerico; filtros: RegistroGenerico }) {
  const [dados, setDados] = useState<RegistroGenerico | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [detalheAberto, setDetalheAberto] = useState(false);

  async function carregarWidget() {
    if (!widget.consulta_id) {
      setErro('Widget sem consulta vinculada.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      setDados(await executarWidgetBi(Number(widget.id), filtros));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao executar widget.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarWidget();
    if (widget.atualizar_automaticamente === false) return;
    const intervalo = window.setInterval(carregarWidget, Math.max(15, Number(widget.intervalo_atualizacao_segundos ?? 60)) * 1000);
    return () => window.clearInterval(intervalo);
  }, [widget.id, JSON.stringify(filtros)]);

  const registros = ((dados?.registros ?? dados?.dados ?? []) as RegistroGenerico[]).map(normalizarLinhaBi);
  const registrosCompletos = ((dados?.registros_completos ?? dados?.dados_completos ?? dados?.registros ?? dados?.dados ?? []) as RegistroGenerico[]).map(normalizarLinhaBi);
  const primeiro = registros[0] ?? {};
  const tipo = String(widget.tipo_widget ?? 'KPI').toUpperCase();
  const tipoGrafico = ['LINHAS', 'GRAFICO_LINHAS', 'AREA', 'BARRAS'].includes(tipo);
  const colunasConfiguradas = Array.isArray(widget.colunas_visiveis_json)
    ? widget.colunas_visiveis_json.map((coluna) => normalizarChaveBi(String(coluna))).filter(Boolean)
    : String(widget.colunas_visiveis_json ?? '').split(',').map((coluna) => normalizarChaveBi(coluna)).filter(Boolean);
  const primeiroCompleto = registrosCompletos[0] ?? primeiro;
  const registrosDetalhe = Array.isArray(primeiroCompleto.detalhes_json) ? primeiroCompleto.detalhes_json as RegistroGenerico[] : registrosCompletos;
  const colunasBase = Array.from(new Set(registros.flatMap((registro) => Object.keys(registro).filter((coluna) => coluna !== 'detalhes_json'))));
  const colunas = (colunasConfiguradas.length ? colunasConfiguradas : colunasBase).slice(0, 10);
  const colunasDetalhe = Array.from(new Set(registrosDetalhe.flatMap((registro) => Object.keys(registro).filter((coluna) => coluna !== 'detalhes_json')))).slice(0, 14);
  const colunasValorDetalhe = colunasDetalhe.filter(colunaValorBi);
  const totaisDetalhe = colunasValorDetalhe.reduce<Record<string, number>>((acc, coluna) => {
    acc[coluna] = registrosDetalhe.reduce((total, registro) => {
      const valor = Number(registro[coluna]);
      return total + (Number.isFinite(valor) ? valor : 0);
    }, 0);
    return acc;
  }, {});
  const corWidget = String(widget.cor_principal ?? '#16a34a');
  const totalRegistros = Number(dados?.total_registros ?? registros.length);
  const registrosNaoExibidos = Number(dados?.registros_nao_exibidos ?? 0);
  const camposMetricaKpi = Object.keys(primeiro).filter((campo) => !['valor', 'total', 'quantidade', 'valor_monetario', 'valor_secundario', 'situacao', 'comparacao_dia_anterior', 'detalhes_json'].includes(campo));

  function exportarDetalheExcel() {
    const escaparHtml = (valor: unknown) => String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const cabecalho = `<th>#</th>${colunasDetalhe.map((coluna) => `<th>${escaparHtml(coluna.replace(/_/g, ' '))}</th>`).join('')}`;
    const linhas = registrosDetalhe.map((registro, indice) => `<tr><td>${indice + 1}</td>${colunasDetalhe.map((coluna) => `<td>${escaparHtml(formatarCelulaBi(coluna, registro[coluna]))}</td>`).join('')}</tr>`).join('');
    const rodape = colunasValorDetalhe.length > 0
      ? `<tfoot><tr><td></td>${colunasDetalhe.map((coluna, indice) => `<td>${escaparHtml(colunasValorDetalhe.includes(coluna) ? formatarValorBi(totaisDetalhe[coluna], true) : indice === 0 ? 'Total' : '')}</td>`).join('')}</tr></tfoot>`
      : '';
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${cabecalho}</tr></thead><tbody>${linhas}</tbody>${rodape}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nomeWidget = String(widget.titulo ?? 'detalhe').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'detalhe';
    link.href = url;
    link.download = `${nomeWidget}-detalhe.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className={`biWidget biWidget${tipo}`} style={{ '--bi-cor': corWidget, borderTopColor: corWidget, gridColumn: `span ${Math.min(15, Math.max(2, Number(widget.largura ?? 3)))}` } as CSSProperties}>
      {widget.exibir_cabecalho !== false && (
        <header>
          <div>
            <span>{String(widget.subtitulo ?? tipo)}</span>
            <h3>{String(widget.titulo ?? 'Widget')}</h3>
          </div>
          <button className="ghost" type="button" onClick={carregarWidget} title="Atualizar widget agora"><RefreshCw size={15} /></button>
        </header>
      )}
      <button className="biWidgetDetalheBotao" type="button" onClick={() => setDetalheAberto(true)} title="Ver detalhe do calculo"><Info size={14} /></button>
      <div className="biWidgetConteudo">
        {carregando && <div className="biSkeleton" />}
        {erro && <div className="biErroWidget">Erro na consulta: {erro}</div>}
        {!erro && !carregando && tipo === 'KPI' && (
          <div className="biKpi">
            <strong>{formatarValorBi(primeiro.valor ?? primeiro.total ?? primeiro.quantidade)}</strong>
            {primeiro.valor_monetario !== undefined && <em>{formatarValorBi(primeiro.valor_monetario, true)}</em>}
            {primeiro.situacao && <span>{String(primeiro.situacao)}</span>}
            {camposMetricaKpi.length > 0 && (
              <div className="biKpiMetricas">
                {camposMetricaKpi.map((campo) => (
                  <small key={campo}><b>{formatarValorBi(primeiro[campo])}</b> {rotuloMetricaKpi(campo)}</small>
                ))}
              </div>
            )}
            <small>{Number(primeiro.comparacao_dia_anterior ?? 0) >= 0 ? '+' : ''}{formatarValorBi(primeiro.comparacao_dia_anterior ?? 0)}% versus dia anterior</small>
          </div>
        )}
        {!erro && !carregando && tipoGrafico && registros.length > 0 && <BiGraficoLinhas registros={registros} cor={corWidget} />}
        {!erro && !carregando && tipo !== 'KPI' && !tipoGrafico && registros.length > 0 && (
          <div className="biTabelaWidget">
            <table>
              <thead><tr>{colunas.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}</tr></thead>
              <tbody>
                {registros.map((registro, indice) => (
                  <tr key={indice} className={Number(registro.dias ?? 0) > 2 ? 'biLinhaCritica' : ''}>
                    {colunas.map((coluna) => <td key={coluna}>{formatarCelulaBi(coluna, registro[coluna])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {Number(dados?.registros_nao_exibidos ?? 0) > 0 && <small className="biNaoExibidos">+ {String(dados?.registros_nao_exibidos)} registro(s) nao exibido(s)</small>}
          </div>
        )}
        {!erro && !carregando && registros.length === 0 && <EstadoBi titulo="Sem dados" descricao="A consulta executou com sucesso, mas nao retornou registros." />}
      </div>
      <footer>
        <small>Ultima atualizacao: {dados?.atualizado_em ? new Date(String(dados.atualizado_em)).toLocaleString('pt-BR') : 'Aguardando execucao'}</small>
        {dados?.origem_cache && <small>Cache aplicado</small>}
      </footer>
      {detalheAberto && (
        <div className="biDetalheOverlay" role="dialog" aria-modal="true" aria-label={`Detalhe de ${String(widget.titulo ?? 'widget')}`}>
          <section className="biDetalheModal">
            <header>
              <div>
                <span>Detalhamento do calculo</span>
                <h3>{String(widget.titulo ?? 'Widget')}</h3>
                <p>{String(widget.descricao ?? widget.subtitulo ?? 'Registros usados para compor este indicador.')}</p>
              </div>
              <div className="biModalControles">
                <span className="biEtiquetaDetalhe" style={{ '--bi-cor': corWidget } as CSSProperties}>{String(widget.titulo ?? 'Widget')}</span>
                <button type="button" onClick={exportarDetalheExcel} title="Exportar detalhe para Excel"><Download size={18} /></button>
                <button type="button" onClick={() => setDetalheAberto(false)} title="Fechar detalhe"><X size={18} /></button>
              </div>
            </header>
            <div className="biDetalheResumo">
              <div><span>Consulta</span><strong>{String(widget.consulta_nome ?? widget.consulta_id ?? '-')}</strong></div>
              <div><span>Total retornado</span><strong>{formatarValorBi(totalRegistros)}</strong></div>
              <div><span>Top X aplicado</span><strong>{String(widget.top_x_registros ?? 'Todos')}</strong></div>
              <div><span>Nao exibidos</span><strong>{formatarValorBi(registrosNaoExibidos)}</strong></div>
              <div><span>Origem</span><strong>{dados?.origem_cache ? 'Cache' : 'Consulta'}</strong></div>
              <div><span>Atualizado em</span><strong>{dados?.atualizado_em ? new Date(String(dados.atualizado_em)).toLocaleString('pt-BR') : 'Aguardando'}</strong></div>
            </div>
            {erro && <div className="biErroWidget">Erro na consulta: {erro}</div>}
            {!erro && registros.length > 0 && (
              <div className="biDetalheTabela">
                <table>
                  <thead><tr><th className="biIndiceDetalhe">#</th>{colunasDetalhe.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}</tr></thead>
                  <tbody>
                    {registrosDetalhe.map((registro, indice) => (
                      <tr key={indice}>
                        <td className="biIndiceDetalhe">{indice + 1}</td>
                        {colunasDetalhe.map((coluna) => <td key={coluna}>{formatarCelulaBi(coluna, registro[coluna])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                  {colunasValorDetalhe.length > 0 && (
                    <tfoot>
                      <tr>
                        <td className="biIndiceDetalhe" />
                        {colunasDetalhe.map((coluna, indice) => (
                          <td key={coluna} className={colunasValorDetalhe.includes(coluna) ? 'biTotalValor' : ''}>
                            {colunasValorDetalhe.includes(coluna) ? formatarValorBi(totaisDetalhe[coluna], true) : indice === 0 ? 'Total' : ''}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
            {!erro && registros.length === 0 && <EstadoBi titulo="Sem registros" descricao="Este widget nao possui registros detalhados para exibir agora." />}
          </section>
        </div>
      )}
    </article>
  );
}

function BiDashboardVisualizador({ dashboardId, empresaAtiva, usuario, modoTvInicial = false, permitirRetornoTv = false, aoVoltar }: {
  dashboardId: number;
  empresaAtiva: EmpresaUsuario | null;
  usuario: UsuarioLogado;
  modoTvInicial?: boolean;
  permitirRetornoTv?: boolean;
  aoVoltar: () => void;
}) {
  const [dados, setDados] = useState<{ dashboard: RegistroGenerico; paginas: RegistroGenerico[]; widgets: RegistroGenerico[]; filtros: RegistroGenerico[] } | null>(null);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState<RegistroGenerico>({});
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [modoTv, setModoTv] = useState(modoTvInicial);
  const [mostrarRetornoTv, setMostrarRetornoTv] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  async function carregarDashboard() {
    try {
      setDados(normalizarDetalheDashboardBi(await obterDashboardBi(dashboardId)));
      setUltimaAtualizacao(new Date());
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Dashboard nao encontrado.');
    }
  }

  useEffect(() => {
    carregarDashboard();
  }, [dashboardId]);

  useEffect(() => {
    if (!modoTv || !dados?.paginas.length) return;
    const pagina = dados.paginas[paginaAtual] ?? dados.paginas[0];
    const intervalo = window.setTimeout(() => setPaginaAtual((atual) => (atual + 1) % dados.paginas.length), Math.max(10, Number(pagina.tempo_exibicao_tv_segundos ?? 30)) * 1000);
    return () => window.clearTimeout(intervalo);
  }, [modoTv, paginaAtual, dados?.paginas.length]);

  useEffect(() => {
    if (!modoTv) return;
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, [modoTv]);

  if (erro) return <EstadoBi titulo="Dashboard indisponivel" descricao={erro} />;
  if (!dados) return <EstadoBi titulo="Carregando dashboard" descricao="Montando paginas, filtros e widgets." />;

  const dashboard = dados.dashboard;
  const nomeDashboard = String(dashboard.nome ?? '');
  const tituloDashboard = nomeDashboard.toLocaleLowerCase('pt-BR').includes('acompanhamento logistico')
    ? `🚚 ${nomeDashboard}`
    : nomeDashboard;
  const paginas = dados.paginas.length ? dados.paginas : [{ id: 0, nome: 'Visao Geral' }];
  const pagina = paginas[paginaAtual] ?? paginas[0];
  const widgets = dados.widgets.filter((widget) => Number(widget.pagina_id ?? pagina.id) === Number(pagina.id));
  const nomeEmpresa = String(dashboard.empresa_nome_exibido ?? empresaAtiva?.nome_exibido ?? empresaAtiva?.nome_fantasia ?? 'Monvizo');
  const logoEmpresa = String(dashboard.empresa_logo || empresaAtiva?.caminho_logo || '/brand/logo-s-novo.jpg');
  const imagemFundoEmpresa = String(dashboard.empresa_imagem_fundo || empresaAtiva?.caminho_imagem_fundo || '').trim();
  const estiloDashboard = imagemFundoEmpresa
    ? ({ '--bi-fundo-empresa': `url("${imagemFundoEmpresa}")` } as CSSProperties)
    : undefined;

  return (
    <section className={modoTv ? 'biModoTv biComFundoEmpresa' : 'biDashboardViewer biComFundoEmpresa'} style={estiloDashboard}>
      {modoTv && permitirRetornoTv && (
        <div className="biTvRetornoArea" onClick={() => setMostrarRetornoTv(true)} title="Mostrar retorno">
          {mostrarRetornoTv && <button type="button" onClick={(evento) => { evento.stopPropagation(); aoVoltar(); }}><ArrowLeft size={14} />Voltar</button>}
        </div>
      )}
      <header className="biDashboardHeader biDashboardHeaderLogistico">
        <div className="biEmpresaMarca">
          {dashboard.exibir_logo_empresa !== false && <img src={logoEmpresa} alt={`Logo ${nomeEmpresa}`} />}
          <div>
            <span>{nomeEmpresa}</span>
            <h2>{tituloDashboard}</h2>
            <p>{String(dashboard.descricao ?? '')}</p>
          </div>
        </div>
        <div className="biHeaderStatus">
          <div className="biAtualizacaoTv">
            <span>Última Atualização:</span>
            <strong>{ultimaAtualizacao ? ultimaAtualizacao.toLocaleString('pt-BR') : 'Aguardando atualização'}</strong>
          </div>
          {!modoTv && <button className="ghost" type="button" onClick={aoVoltar} title="Voltar"><ArrowLeft size={15} /></button>}
          {!modoTv && <button className="ghost" type="button" onClick={carregarDashboard} title="Atualizar dashboard agora"><RefreshCw size={15} /></button>}
          {!modoTv && <button className="ghost" type="button" onClick={() => setModoTv(true)} title="Modo TV"><Monitor size={15} /></button>}
          {!modoTv && <button className="ghost" type="button" onClick={() => document.documentElement.requestFullscreen?.()} title="Tela cheia"><Maximize2 size={15} /></button>}
          {!modoTv && usuarioPodeBi(usuario, ['BI_EDITAR_DASHBOARDS']) && <button className="ghost" type="button" onClick={aoVoltar} title="Configuracoes"><Settings size={15} /></button>}
        </div>
      </header>
      {!modoTv && dados.filtros.length > 0 && (
        <section className="biFiltros">
          <Filter size={16} />
          {dados.filtros.map((filtro) => (
            <label key={String(filtro.id)}>
              {String(filtro.label)}
              <input value={String(filtros[String(filtro.nome)] ?? filtro.valor_padrao ?? '')} onChange={(evento) => setFiltros({ ...filtros, [String(filtro.nome)]: evento.target.value })} />
            </label>
          ))}
        </section>
      )}
      <div className="biPaginas">
        {paginas.map((item, indice) => <button key={String(item.id)} className={indice === paginaAtual ? 'active' : ''} onClick={() => setPaginaAtual(indice)}>{String(item.nome)}</button>)}
      </div>
      <section className="biWidgetsGrid">
        {widgets.map((widget) => <BiWidgetContainer key={String(widget.id)} widget={widget} filtros={filtros} />)}
        {widgets.length === 0 && <EstadoBi titulo="Sem widgets" descricao="Adicione widgets no builder para montar esta pagina." />}
      </section>
    </section>
  );
}

export function BusinessIntelligenceDashboards({ usuario, empresaAtiva }: { usuario: UsuarioLogado; empresaAtiva: EmpresaUsuario | null }) {
  const [dashboards, setDashboards] = useState<RegistroGenerico[]>([]);
  const [consultas, setConsultas] = useState<RegistroGenerico[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [editorAberto, setEditorAberto] = useState(false);
  const [visualizandoId, setVisualizandoId] = useState<number | null>(null);
  const [modoTvId, setModoTvId] = useState<number | null>(() => {
    const encontrado = window.location.pathname.match(/\/Business_Intelligence\/Dashboards\/(\d+)\/TV/i);
    return encontrado ? Number(encontrado[1]) : null;
  });
  const [detalhe, setDetalhe] = useState<{ dashboard: RegistroGenerico; paginas: RegistroGenerico[]; widgets: RegistroGenerico[]; permissoes: RegistroGenerico[] } | null>(null);
  const [abaBuilder, setAbaBuilder] = useState<'dashboard' | 'paginas' | 'widgets' | 'acessos'>('dashboard');
  const [usuarios, setUsuarios] = useState<RegistroGenerico[]>([]);
  const [perfis, setPerfis] = useState<RegistroGenerico[]>([]);
  const [formDashboard, setFormDashboard] = useState<RegistroGenerico>({ nome: '', descricao: '', categoria: 'GERAL', status: 'RASCUNHO', intervalo_atualizacao_segundos: 60, atualizar_automaticamente: true, exibir_logo_empresa: true, modo_tv_habilitado: true, publico: false });
  const [formPagina, setFormPagina] = useState<RegistroGenerico>({ nome: 'Visao Geral', ordem: 1, layout_colunas: 15, tempo_exibicao_tv_segundos: 30, ativo: true });
  const [formWidget, setFormWidget] = useState<RegistroGenerico>({ titulo: 'Novo widget', tipo_widget: 'KPI', largura: 3, altura: 2, top_x_registros: '10', intervalo_atualizacao_segundos: 60, atualizar_automaticamente: true, exibir_cabecalho: true, exibir_borda: true, exibir_sombra: true, exibir_exportacao: true, exibir_tela_cheia: true, ativo: true });
  const [formPermissao, setFormPermissao] = useState<RegistroGenerico>({ tipo: 'USUARIO', usuario_id: '', perfil_id: '', pode_visualizar: true, pode_editar: false, pode_excluir: false, pode_publicar: false, pode_modo_tv: true });
  const [previewWidget, setPreviewWidget] = useState<RegistroGenerico | null>(null);
  const [modalWidgetAberto, setModalWidgetAberto] = useState(false);
  const [modalWidgetCompacto, setModalWidgetCompacto] = useState(false);
  const [modalPreviewWidgetAberto, setModalPreviewWidgetAberto] = useState(false);
  const [promptIaAberto, setPromptIaAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const podeEditar = usuarioPodeBi(usuario, ['BI_EDITAR_DASHBOARDS', 'BI_CRIAR_DASHBOARDS']);

  async function carregar() {
    setDashboards(await listarDashboardsBi());
    listarConsultasBi().then(setConsultas).catch(() => setConsultas([]));
    listarUsuarios().then(setUsuarios).catch(() => setUsuarios([]));
    listarPerfis().then(setPerfis).catch(() => setPerfis([]));
  }

  async function carregarDetalhe(id: number) {
    const dados = normalizarDetalheDashboardBi(await obterDashboardBi(id));
    setDetalhe(dados);
    setSelecionadoId(id);
    setFormDashboard({
      ...dados.dashboard,
      atualizar_automaticamente: dados.dashboard.atualizar_automaticamente !== false,
      exibir_logo_empresa: dados.dashboard.exibir_logo_empresa !== false,
      modo_tv_habilitado: Boolean(dados.dashboard.modo_tv_habilitado),
      publico: Boolean(dados.dashboard.publico)
    });
    setFormPagina({ dashboard_id: id, nome: 'Nova pagina', ordem: (dados.paginas.length ?? 0) + 1, layout_colunas: 15, tempo_exibicao_tv_segundos: 30, ativo: true });
    setFormWidget({ dashboard_id: id, pagina_id: dados.paginas[0]?.id, titulo: 'Novo widget', tipo_widget: 'KPI', largura: 3, altura: 2, top_x_registros: '10', intervalo_atualizacao_segundos: 60, atualizar_automaticamente: true, exibir_cabecalho: true, exibir_borda: true, exibir_sombra: true, exibir_exportacao: true, exibir_tela_cheia: true, ativo: true });
    setFormPermissao({ tipo: 'USUARIO', usuario_id: '', perfil_id: '', pode_visualizar: true, pode_editar: false, pode_excluir: false, pode_publicar: false, pode_modo_tv: true });
    setEditorAberto(true);
    setAbaBuilder('dashboard');
  }

  function novoDashboard() {
    setSelecionadoId(null);
    setDetalhe(null);
    setEditorAberto(true);
    setAbaBuilder('dashboard');
    setFormDashboard({ nome: 'Novo dashboard', descricao: '', categoria: 'GERAL', status: 'RASCUNHO', intervalo_atualizacao_segundos: 60, atualizar_automaticamente: true, exibir_logo_empresa: true, modo_tv_habilitado: true, publico: false });
    setMensagem('Preencha as configuracoes e clique em Salvar dashboard.');
  }

  function voltarListaDashboards() {
    setEditorAberto(false);
    setSelecionadoId(null);
    setDetalhe(null);
    setModalWidgetAberto(false);
    setModalPreviewWidgetAberto(false);
    setPreviewWidget(null);
  }

  function obterLinkTv(id: number) {
    return `${window.location.origin}/Business_Intelligence/Dashboards/${id}/TV`;
  }

  async function copiarTextoParaAreaTransferencia(texto: string) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', 'true');
    campo.style.position = 'fixed';
    campo.style.left = '-9999px';
    campo.style.top = '0';
    document.body.appendChild(campo);
    campo.focus();
    campo.select();
    campo.setSelectionRange(0, campo.value.length);
    const copiado = document.execCommand('copy');
    document.body.removeChild(campo);
    return copiado;
  }

  async function copiarLinkTv(id: number) {
    const link = obterLinkTv(id);
    const copiado = await copiarTextoParaAreaTransferencia(link);
    setMensagem(copiado ? `Link TV copiado. Use Ctrl + V para colar: ${link}` : `Nao foi possivel copiar automaticamente. Link TV: ${link}`);
  }

  function abrirModoTv(id: number) {
    window.sessionStorage.setItem('bi_tv_aberto_pelo_modulo', '1');
    window.history.pushState(null, '', `/Business_Intelligence/Dashboards/${id}/TV`);
    setModoTvId(id);
  }

  useEffect(() => {
    carregar().catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar dashboards.'));
  }, []);

  if (visualizandoId || modoTvId) {
    const tvAbertoPeloModulo = window.sessionStorage.getItem('bi_tv_aberto_pelo_modulo') === '1';
    return <BiDashboardVisualizador dashboardId={Number(visualizandoId ?? modoTvId)} empresaAtiva={empresaAtiva} usuario={usuario} modoTvInicial={Boolean(modoTvId)} permitirRetornoTv={Boolean(modoTvId) && tvAbertoPeloModulo} aoVoltar={() => { setVisualizandoId(null); setModoTvId(null); window.sessionStorage.removeItem('bi_tv_aberto_pelo_modulo'); window.history.pushState(null, '', '/Business_Intelligence/Dashboards'); }} />;
  }

  async function salvarDashboard(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    const salvo = await salvarDashboardBi(formDashboard);
    setMensagem('Dashboard salvo com sucesso.');
    await carregar();
    await carregarDetalhe(Number(salvo.id));
  }

  async function adicionarPagina(evento: FormEvent) {
    evento.preventDefault();
    if (!selecionadoId) return;
    await salvarPaginaBi(selecionadoId, formPagina);
    setMensagem('Pagina salva com sucesso.');
    await carregarDetalhe(selecionadoId);
  }

  async function adicionarWidget(evento: FormEvent) {
    evento.preventDefault();
    if (!selecionadoId) return;
    await salvarWidgetBi(selecionadoId, formWidget);
    setMensagem('Widget salvo com sucesso.');
    setModalWidgetAberto(false);
    await carregarDetalhe(selecionadoId);
  }

  function novoWidget() {
    setFormWidget({ dashboard_id: selecionadoId, pagina_id: detalhe?.paginas[0]?.id, titulo: 'Novo widget', tipo_widget: 'KPI', largura: 3, altura: 2, top_x_registros: '10', intervalo_atualizacao_segundos: 60, atualizar_automaticamente: true, exibir_cabecalho: true, exibir_borda: true, exibir_sombra: true, exibir_exportacao: true, exibir_tela_cheia: true, ativo: true });
    setModalWidgetAberto(true);
  }

  function editarWidget(widget: RegistroGenerico) {
    setFormWidget({
      ...widget,
      colunas_visiveis_json: Array.isArray(widget.colunas_visiveis_json) ? widget.colunas_visiveis_json.join(', ') : widget.colunas_visiveis_json
    });
    setAbaBuilder('widgets');
    setModalWidgetAberto(true);
  }

  async function testarWidget(widget: RegistroGenerico) {
    setPreviewWidget({ titulo: widget.titulo, carregando: true });
    setModalPreviewWidgetAberto(true);
    try {
      const resultado = await executarWidgetBi(Number(widget.id), {});
      setPreviewWidget({ titulo: widget.titulo, ...resultado });
    } catch (error) {
      setPreviewWidget({ titulo: widget.titulo, erro: error instanceof Error ? error.message : 'Falha ao testar widget.' });
    }
  }

  async function removerWidget(widget: RegistroGenerico) {
    if (!selecionadoId) return;
    await excluirWidgetBi(selecionadoId, Number(widget.id));
    setMensagem('Widget removido do dashboard.');
    await carregarDetalhe(selecionadoId);
  }

  async function salvarAcessoDashboard(evento: FormEvent) {
    evento.preventDefault();
    if (!selecionadoId) return;
    const porUsuario = String(formPermissao.tipo ?? 'USUARIO') === 'USUARIO';
    if (porUsuario && !formPermissao.usuario_id) {
      setErro('Selecione um usuario para liberar o dashboard.');
      return;
    }
    if (!porUsuario && !formPermissao.perfil_id) {
      setErro('Selecione um perfil para liberar o dashboard.');
      return;
    }
    setErro('');
    await salvarPermissaoDashboardBi(selecionadoId, {
      usuario_id: porUsuario ? Number(formPermissao.usuario_id) : null,
      perfil_id: porUsuario ? null : Number(formPermissao.perfil_id),
      pode_visualizar: formPermissao.pode_visualizar !== false,
      pode_editar: Boolean(formPermissao.pode_editar),
      pode_excluir: Boolean(formPermissao.pode_excluir),
      pode_publicar: Boolean(formPermissao.pode_publicar),
      pode_modo_tv: Boolean(formPermissao.pode_modo_tv)
    });
    setMensagem('Acesso ao dashboard liberado com sucesso.');
    setFormPermissao({ tipo: 'USUARIO', usuario_id: '', perfil_id: '', pode_visualizar: true, pode_editar: false, pode_excluir: false, pode_publicar: false, pode_modo_tv: true });
    await carregarDetalhe(selecionadoId);
  }

  async function removerAcessoDashboard(permissao: RegistroGenerico) {
    if (!selecionadoId) return;
    await excluirPermissaoDashboardBi(selecionadoId, Number(permissao.id));
    setMensagem('Acesso removido do dashboard.');
    await carregarDetalhe(selecionadoId);
  }

  async function exportarDashboard(id: number) {
    const pacote = await exportarDashboardBi(id);
    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-bi-${id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importarDashboard(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    const texto = await arquivo.text();
    await importarDashboardBi(JSON.parse(texto));
    evento.target.value = '';
    setMensagem('Dashboard importado com sucesso.');
    await carregar();
  }

  function gerarPromptIaDashboard() {
    const contextoAtual = detalhe ? {
      dashboard: detalhe.dashboard,
      paginas: detalhe.paginas,
      widgets: detalhe.widgets,
      consultas_disponiveis: consultas.map((consulta) => ({
        nome: consulta.nome,
        fonte_dados_tipo: consulta.fonte_dados_tipo,
        sql_consulta: consulta.sql_consulta
      }))
    } : null;
    const contextoTexto = contextoAtual
      ? JSON.stringify(contextoAtual, null, 2)
      : 'Nenhum dashboard foi selecionado no momento. Crie o JSON do zero seguindo o contrato de importacao e o exemplo completo abaixo.';

    return `Voce e a Salvia IA da Control S Hub, especialista em criar dashboards premium para o modulo nativo Business Intelligence do Control S Hub.

Missao:
Criar um JSON completo, valido e importavel pelo botao Importar do Business Intelligence. O JSON deve vir com dashboard, paginas, filtros, widgets e consultas SQL simuladas. Depois da importacao, o usuario deve trocar apenas a conexao e o SQL base, preservando os mesmos nomes de campos retornados pelas consultas para nao quebrar widgets, graficos, tabelas e KPIs.

Contrato de importacao:
- Responda somente com JSON valido. Nao use markdown.
- Use "tipo": "CONTROL_S_HUB_BI_DASHBOARD" e "versao": 1.
- O objeto "dashboard" deve conter "paginas", "widgets" e "filtros".
- O array "consultas" deve conter todas as consultas usadas pelos widgets.
- Cada widget deve apontar para uma consulta por "consulta_nome", exatamente igual ao campo "nome" da consulta.
- Cada widget pode apontar para pagina por "pagina_nome"; se omitir, use "Visao Geral".
- Tipos aceitos: KPI, TABELA, RANKING, LINHAS, BARRAS, ROSCA, GAUGE, TEXTO, IFRAME.
- O layout usa 15 colunas. KPI de topo normalmente usa largura 3. Tres quadros por linha usam largura 5. Dois quadros usam largura 7 ou 8.
- Use sempre textos em portugues do Brasil.
- Use SQL somente SELECT ou WITH. Nunca use DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, CREATE, EXEC, CALL, DO, GRANT ou REVOKE.
- Use parametros seguros no padrão :empresa_id, :data_inicial, :data_final, :filial_id, :cliente_id, :vendedor_id quando fizer sentido.
- Use tabelas/views ficticias profissionais, por exemplo vw_bi_pedidos_logisticos, vw_bi_faturamento, vw_bi_separacao, vw_bi_entregas. O usuario troca depois pela view real.
- Nao altere os nomes dos campos entre a consulta simulada e o widget. Exemplo: se a tabela usa colunas_visiveis_json ["pedido","cliente","valor"], a consulta deve retornar pedido, cliente e valor.

Campos esperados por tipo:
- KPI: valor, valor_monetario, situacao, comparacao_dia_anterior. Pode incluir metricas extras como pedidos_do_dia, pedidos_maior_1_dia, aguardando_faturamento. Se precisar abrir detalhe, inclua detalhes_json como array JSON.
- TABELA/RANKING: retorne exatamente as colunas visiveis. Configure top_x_registros, ordenar_por e direcao_ordenacao.
- LINHAS: retorne dia ou periodo e valor/separados/quantidade/meta. Configure ordenar_por "dia" e direcao_ordenacao "ASC".
- BARRAS/ROSCA: retorne categoria e valor.

Exemplo completo importavel:
{
  "versao": 1,
  "tipo": "CONTROL_S_HUB_BI_DASHBOARD",
  "dashboard": {
    "nome": "Acompanhamento Logistico IA",
    "descricao": "Dashboard criado pela Salvia IA para operacao logistica em tempo real.",
    "categoria": "Logistica",
    "status": "RASCUNHO",
    "publico": false,
    "atualizar_automaticamente": true,
    "intervalo_atualizacao_segundos": 60,
    "exibir_logo_empresa": true,
    "modo_tv_habilitado": true,
    "paginas": [
      { "nome": "Visao Geral", "ordem": 1, "layout_colunas": 15, "tempo_exibicao_tv_segundos": 35, "ativo": true }
    ],
    "filtros": [
      { "nome": "data_inicial", "label": "Data inicial", "tipo": "DATA", "campo": "data_referencia", "valor_padrao": "", "global": true, "ordem": 1, "ativo": true },
      { "nome": "data_final", "label": "Data final", "tipo": "DATA", "campo": "data_referencia", "valor_padrao": "", "global": true, "ordem": 2, "ativo": true },
      { "nome": "filial_id", "label": "Filial", "tipo": "SELECAO_UNICA", "campo": "filial_id", "valor_padrao": "", "global": true, "ordem": 3, "ativo": true }
    ],
    "widgets": [
      { "titulo": "Faturamento Aprovado", "subtitulo": "Valor aprovado", "pagina_nome": "Visao Geral", "tipo_widget": "KPI", "consulta_nome": "BI IA - Faturamento Aprovado", "ordem": 1, "largura": 3, "altura": 2, "cor_principal": "#1b3f66", "top_x_registros": null, "ordenar_por": null, "direcao_ordenacao": "DESC", "intervalo_atualizacao_segundos": 60, "colunas_visiveis_json": [] },
      { "titulo": "Pedidos em Separacao", "subtitulo": "Pedidos", "pagina_nome": "Visao Geral", "tipo_widget": "KPI", "consulta_nome": "BI IA - Pedidos em Separacao KPI", "ordem": 2, "largura": 3, "altura": 2, "cor_principal": "#ffe780", "top_x_registros": null, "ordenar_por": null, "direcao_ordenacao": "DESC", "intervalo_atualizacao_segundos": 60, "colunas_visiveis_json": [] },
      { "titulo": "Evolucao da Separacao", "subtitulo": "Ultimos 30 dias", "pagina_nome": "Visao Geral", "tipo_widget": "LINHAS", "consulta_nome": "BI IA - Evolucao Separacao", "ordem": 3, "largura": 9, "altura": 4, "cor_principal": "#2563eb", "top_x_registros": null, "ordenar_por": "dia", "direcao_ordenacao": "ASC", "intervalo_atualizacao_segundos": 120, "colunas_visiveis_json": ["dia","separados","meta"] },
      { "titulo": "Pedidos em Separacao", "subtitulo": "Detalhe", "pagina_nome": "Visao Geral", "tipo_widget": "TABELA", "consulta_nome": "BI IA - Pedidos em Separacao Detalhe", "ordem": 4, "largura": 5, "altura": 4, "cor_principal": "#ffe780", "top_x_registros": 10, "ordenar_por": "dias", "direcao_ordenacao": "DESC", "intervalo_atualizacao_segundos": 120, "colunas_visiveis_json": ["pedido","cliente","vendedor","valor","data_faturamento","dias","situacao"] }
    ]
  },
  "consultas": [
    { "nome": "BI IA - Faturamento Aprovado", "descricao": "SQL simulado. Ao trocar a conexao, mantenha os aliases valor, valor_monetario, situacao e comparacao_dia_anterior.", "fonte_dados_tipo": "POSTGRESQL", "tempo_cache_segundos": 60, "ativo": true, "sql_consulta": "SELECT 7 AS valor, 241919.88 AS valor_monetario, 'Valor faturado aprovado' AS situacao, 1 AS aguardando_faturamento, 4 AS aguardando_escolha_transportadora, 0 AS comparacao_dia_anterior" },
    { "nome": "BI IA - Pedidos em Separacao KPI", "descricao": "SQL simulado para KPI com composicao por prazo.", "fonte_dados_tipo": "POSTGRESQL", "tempo_cache_segundos": 60, "ativo": true, "sql_consulta": "WITH base AS (SELECT * FROM (VALUES (728682,'UNIMED','GUSTAVO',128529.88::numeric,CURRENT_DATE-174,174,'FAT. ENTR'),(730071,'EDINELSON','OMAR',2680.00::numeric,CURRENT_DATE-161,161,'FAT. ENTR')) AS t(pedido,cliente,vendedor,valor,data_faturamento,dias,situacao)) SELECT COUNT(*)::int AS valor, 'Pedidos' AS situacao, COUNT(*) FILTER (WHERE dias <= 1)::int AS pedidos_do_dia, COUNT(*) FILTER (WHERE dias > 1)::int AS pedidos_maior_1_dia, 0 AS comparacao_dia_anterior, jsonb_agg(to_jsonb(base)) AS detalhes_json FROM base" },
    { "nome": "BI IA - Evolucao Separacao", "descricao": "SQL simulado para grafico de linha. Ao trocar pelo SQL real, mantenha dia, separados e meta.", "fonte_dados_tipo": "POSTGRESQL", "tempo_cache_segundos": 120, "ativo": true, "sql_consulta": "SELECT (CURRENT_DATE - (29 - gs)::integer) AS dia, (8 + ((gs * 7) % 13))::integer AS separados, (10 + ((gs * 5) % 11))::integer AS meta FROM generate_series(0, 29) AS gs ORDER BY dia" },
    { "nome": "BI IA - Pedidos em Separacao Detalhe", "descricao": "SQL simulado para tabela. Ao trocar pelo SQL real, mantenha todos os aliases usados nas colunas.", "fonte_dados_tipo": "POSTGRESQL", "tempo_cache_segundos": 120, "ativo": true, "sql_consulta": "SELECT pedido, cliente, vendedor, valor, data_faturamento, dias, situacao FROM (VALUES (728682,'UNIMED','GUSTAVO',128529.88::numeric,CURRENT_DATE-174,174,'FAT. ENTR'),(730071,'EDINELSON','OMAR',2680.00::numeric,CURRENT_DATE-161,161,'FAT. ENTR')) AS t(pedido,cliente,vendedor,valor,data_faturamento,dias,situacao) ORDER BY dias DESC" }
  ]
}

Contexto atual do Control S Hub para usar como referencia:
${contextoTexto}

Pedido do usuario:
Crie o dashboard solicitado pelo usuario com visual premium, consultas SQL simuladas completas e nomes de campos estaveis para posterior troca de conexao e SQL real.`;
  }

  async function copiarPromptIa() {
    await navigator.clipboard?.writeText(gerarPromptIaDashboard());
    setMensagem('Prompt da Salvia IA copiado. Cole em uma IA para gerar o JSON e importe o resultado aqui.');
  }

  const dashboardAtivo = detalhe?.dashboard?.nome ?? (formDashboard.nome ? 'Novo dashboard' : 'Nenhum dashboard selecionado');

  return (
    <section className="biModulo">
      <div className="barraAcoesTela biTopoModulo">
        <div>
          <span>Business Intelligence</span>
          <h2>Dashboards</h2>
          <p>{dashboardAtivo}</p>
        </div>
        {podeEditar && (
          <div className="biAcoes">
            <label className="ghost biBotaoArquivo"><Upload size={16} />Importar<input type="file" accept="application/json" onChange={importarDashboard} /></label>
            <button className="ghost biBotaoIa" type="button" onClick={() => setPromptIaAberto(true)}><Sparkles size={16} />🤖 Prompt IA</button>
            <button className="primary" type="button" onClick={novoDashboard}><Plus size={16} />Novo dashboard</button>
          </div>
        )}
      </div>
      {promptIaAberto && (
        <div className="biDetalheOverlay" role="dialog" aria-modal="true" aria-label="Prompt IA para criar dashboard">
          <section className="biDetalheModal biPromptIaModal">
            <header>
              <div>
                <span>Salvia IA da Control S Hub</span>
                <h3>Prompt IA para gerar JSON importavel</h3>
                <p>Cole este prompt em uma IA, peça o dashboard desejado e importe aqui o JSON que ela devolver.</p>
              </div>
              <button type="button" onClick={() => setPromptIaAberto(false)} title="Fechar"><X size={18} /></button>
            </header>
            <textarea readOnly value={gerarPromptIaDashboard()} />
            <div className="biFormAcoes">
              <button className="ghost" type="button" onClick={copiarPromptIa}><Copy size={15} />Copiar prompt</button>
              <button className="primary" type="button" onClick={() => setPromptIaAberto(false)}>Concluir</button>
            </div>
          </section>
        </div>
      )}
      {erro && <div className="alerta">{erro}</div>}
      {mensagem && <div className="sucesso">{mensagem}</div>}
      <section className={editorAberto ? 'biDashboardAdmin biDashboardEditorTela' : 'biDashboardAdmin biDashboardListaTela'}>
        {!editorAberto && (
        <div className="painelTabela biPainelLista">
          <header><div><span>Listagem</span><h2>Dashboards cadastrados</h2><p>Visualize, edite, publique, duplique, exporte e abra o modo TV.</p></div></header>
          <div className="biWorkspaceResumo">
            <div><strong>{dashboards.length}</strong><span>dashboards</span></div>
            <div><strong>{dashboards.filter((dashboard) => String(dashboard.status).toUpperCase() === 'PUBLICADO').length}</strong><span>publicados</span></div>
            <div><strong>{consultas.length}</strong><span>consultas</span></div>
          </div>
          <BiTabelaSimples
            linhas={dashboards}
            colunas={['nome', 'categoria', 'status', 'quantidade_paginas', 'quantidade_widgets']}
            acoes={(dashboard) => (
              <>
                <button className="ghost" onClick={() => setVisualizandoId(Number(dashboard.id))} title="Visualizar"><Eye size={14} /></button>
                <button className="ghost" onClick={() => carregarDetalhe(Number(dashboard.id))} title="Editar"><Settings size={14} /></button>
                <button className="ghost" onClick={() => duplicarDashboardBi(Number(dashboard.id)).then(carregar)} title="Duplicar"><Copy size={14} /></button>
                <button className="ghost" onClick={() => publicarDashboardBi(Number(dashboard.id)).then(carregar)} title="Publicar"><Save size={14} /></button>
                <button className="ghost" onClick={() => exportarDashboard(Number(dashboard.id))} title="Exportar"><Download size={14} /></button>
                <button className="ghost" onClick={() => abrirModoTv(Number(dashboard.id))} title="Modo TV"><Monitor size={14} /></button>
                <button className="ghost" onClick={() => copiarLinkTv(Number(dashboard.id))} title="Copiar link TV"><Copy size={14} /></button>
                <button className="ghost danger" onClick={() => excluirDashboardBi(Number(dashboard.id)).then(carregar)} title="Excluir"><Trash2 size={14} /></button>
              </>
            )}
          />
        </div>
        )}
        {podeEditar && editorAberto && (
          <aside className="biBuilderPainel biBuilderTelaCheia">
            <header>
              <div>
                <span>Configuracoes</span>
                <h3>{dashboardAtivo}</h3>
              </div>
              <div className="biAcoes">
                <button className="ghost" type="button" onClick={voltarListaDashboards}><ArrowLeft size={15} />Voltar</button>
                {selecionadoId && <button className="ghost" type="button" onClick={() => setVisualizandoId(selecionadoId)}><Eye size={15} />Prever</button>}
              </div>
            </header>
            {selecionadoId && (
              <div className="biAcoesRapidas">
                <button type="button" onClick={() => setAbaBuilder('dashboard')}><LayoutDashboard size={16} /><span>Dados</span></button>
                <button type="button" onClick={() => setAbaBuilder('paginas')}><PanelsTopLeft size={16} /><span>Paginas</span></button>
                <button type="button" onClick={() => setAbaBuilder('widgets')}><BarChart3 size={16} /><span>Widgets</span></button>
                <button type="button" onClick={() => setAbaBuilder('acessos')}><UserCheck size={16} /><span>Acessos</span></button>
                <button type="button" onClick={() => abrirModoTv(selecionadoId)}><Monitor size={16} /><span>TV</span></button>
                <button type="button" onClick={() => copiarLinkTv(selecionadoId)}><Copy size={16} /><span>Link TV</span></button>
              </div>
            )}
            <div className="biBuilderAbas">
              <button className={abaBuilder === 'dashboard' ? 'active' : ''} onClick={() => setAbaBuilder('dashboard')}>Dashboard</button>
              <button className={abaBuilder === 'paginas' ? 'active' : ''} onClick={() => setAbaBuilder('paginas')} disabled={!selecionadoId}>Paginas</button>
              <button className={abaBuilder === 'widgets' ? 'active' : ''} onClick={() => setAbaBuilder('widgets')} disabled={!selecionadoId}>Widgets</button>
              <button className={abaBuilder === 'acessos' ? 'active' : ''} onClick={() => setAbaBuilder('acessos')} disabled={!selecionadoId}>Acessos</button>
            </div>

            {abaBuilder === 'dashboard' && (
              <form className="biFormGrid" onSubmit={salvarDashboard}>
                <BiCampo rotulo="Nome"><input value={String(formDashboard.nome ?? '')} onChange={(evento) => setFormDashboard({ ...formDashboard, nome: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Categoria"><input value={String(formDashboard.categoria ?? '')} onChange={(evento) => setFormDashboard({ ...formDashboard, categoria: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Status"><select value={String(formDashboard.status ?? 'RASCUNHO')} onChange={(evento) => setFormDashboard({ ...formDashboard, status: evento.target.value })}><option value="RASCUNHO">Rascunho</option><option value="PUBLICADO">Publicado</option><option value="INATIVO">Inativo</option></select></BiCampo>
                <BiCampo rotulo="Atualizacao global (segundos)"><input type="number" min={15} value={Number(formDashboard.intervalo_atualizacao_segundos ?? 60)} onChange={(evento) => setFormDashboard({ ...formDashboard, intervalo_atualizacao_segundos: Number(evento.target.value) })} /></BiCampo>
                <label className="biCampo biCampoGrande"><span>Descricao</span><textarea value={String(formDashboard.descricao ?? '')} onChange={(evento) => setFormDashboard({ ...formDashboard, descricao: evento.target.value })} /></label>
                <div className="biChecks biCampoGrande">
                  <label><input type="checkbox" checked={formDashboard.atualizar_automaticamente !== false} onChange={(evento) => setFormDashboard({ ...formDashboard, atualizar_automaticamente: evento.target.checked })} /> Atualizar automaticamente</label>
                  <label><input type="checkbox" checked={Boolean(formDashboard.publico)} onChange={(evento) => setFormDashboard({ ...formDashboard, publico: evento.target.checked })} /> Dashboard publico para autorizados</label>
                  <label><input type="checkbox" checked={formDashboard.exibir_logo_empresa !== false} onChange={(evento) => setFormDashboard({ ...formDashboard, exibir_logo_empresa: evento.target.checked })} /> Exibir logo da empresa</label>
                  <label><input type="checkbox" checked={Boolean(formDashboard.modo_tv_habilitado)} onChange={(evento) => setFormDashboard({ ...formDashboard, modo_tv_habilitado: evento.target.checked })} /> Habilitar modo TV</label>
                </div>
                <div className="biFormAcoes biCampoGrande">
                  <button className="primary"><Save size={15} />Salvar dashboard</button>
                </div>
              </form>
            )}

            {abaBuilder === 'paginas' && (
              <form className="biFormGrid" onSubmit={adicionarPagina}>
                <BiCampo rotulo="Nome"><input value={String(formPagina.nome ?? '')} onChange={(evento) => setFormPagina({ ...formPagina, nome: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Ordem"><input type="number" value={Number(formPagina.ordem ?? 1)} onChange={(evento) => setFormPagina({ ...formPagina, ordem: Number(evento.target.value) })} /></BiCampo>
                <BiCampo rotulo="Colunas do layout"><input type="number" min={6} max={15} value={Number(formPagina.layout_colunas ?? 15)} onChange={(evento) => setFormPagina({ ...formPagina, layout_colunas: Number(evento.target.value) })} /></BiCampo>
                <BiCampo rotulo="Tempo no modo TV"><input type="number" min={10} value={Number(formPagina.tempo_exibicao_tv_segundos ?? 30)} onChange={(evento) => setFormPagina({ ...formPagina, tempo_exibicao_tv_segundos: Number(evento.target.value) })} /></BiCampo>
                <div className="biFormAcoes biCampoGrande"><button className="ghost"><Plus size={15} />Salvar pagina</button></div>
                <div className="biChips biCampoGrande">{detalhe?.paginas.map((pagina) => <span key={String(pagina.id)}>{String(pagina.nome)}</span>)}</div>
              </form>
            )}

            {abaBuilder === 'widgets' && (
              <>
                <div className="biManutencaoWidgets biCampoGrande">
                  <div className="biManutencaoCabecalho">
                    <strong>Widgets do dashboard</strong>
                    <button type="button" onClick={novoWidget}><Plus size={14} />Novo widget</button>
                  </div>
                  {[...(detalhe?.widgets ?? [])].sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0)).map((widget) => (
                    <div key={String(widget.id)}>
                      <span>{String(widget.ordem ?? '-')} - {String(widget.titulo)}</span>
                      <small>{String(widget.tipo_widget)} | pagina {String(detalhe?.paginas.find((pagina) => Number(pagina.id) === Number(widget.pagina_id))?.nome ?? '-')} | largura {String(widget.largura ?? '-')} | Top {String(widget.top_x_registros ?? 'Todos')}</small>
                      <button type="button" onClick={() => editarWidget(widget)}>Editar</button>
                      <button type="button" onClick={() => testarWidget(widget)}>Ver dados</button>
                      <button type="button" onClick={() => removerWidget(widget)}>Remover</button>
                    </div>
                  ))}
                  {(detalhe?.widgets ?? []).length === 0 && <p>Nenhum widget cadastrado. Clique em Novo widget para começar a montar o dashboard.</p>}
                </div>
                {modalWidgetAberto && (
                  <div className="biDetalheOverlay" role="dialog" aria-modal="true" aria-label="Editar widget">
                    <section className={`biDetalheModal biWidgetEditorModal ${modalWidgetCompacto ? 'biModalCompacto' : 'biModalTelaCheia'}`}>
                      <header>
                        <div>
                          <span>Widget</span>
                          <h3>{String(formWidget.id ? 'Editar widget' : 'Novo widget')}</h3>
                          <p>Altere apenas este widget. A lista do dashboard permanece no fundo para facilitar a manutencao.</p>
                        </div>
                        <div className="biModalControles">
                          <button type="button" onClick={() => setModalWidgetCompacto((atual) => !atual)} title={modalWidgetCompacto ? 'Expandir tela' : 'Reduzir tela'}>{modalWidgetCompacto ? <Maximize2 size={18} /> : <PanelsTopLeft size={18} />}</button>
                          <button type="button" onClick={() => setModalWidgetAberto(false)} title="Fechar"><X size={18} /></button>
                        </div>
                      </header>
                      <form className="biFormGrid" onSubmit={adicionarWidget}>
                <BiCampo rotulo="Titulo"><input value={String(formWidget.titulo ?? '')} onChange={(evento) => setFormWidget({ ...formWidget, titulo: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Subtitulo"><input value={String(formWidget.subtitulo ?? '')} onChange={(evento) => setFormWidget({ ...formWidget, subtitulo: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Tipo"><select value={String(formWidget.tipo_widget ?? 'KPI')} onChange={(evento) => setFormWidget({ ...formWidget, tipo_widget: evento.target.value })}><option>KPI</option><option>TABELA</option><option>RANKING</option><option>BARRAS</option><option>LINHAS</option><option>ROSCA</option><option>GAUGE</option><option>TEXTO</option><option>IFRAME</option></select></BiCampo>
                <BiCampo rotulo="Ordem"><input type="number" value={Number(formWidget.ordem ?? 1)} onChange={(evento) => setFormWidget({ ...formWidget, ordem: Number(evento.target.value) })} /></BiCampo>
                <BiCampo rotulo="Pagina"><select value={String(formWidget.pagina_id ?? '')} onChange={(evento) => setFormWidget({ ...formWidget, pagina_id: Number(evento.target.value) })}>{detalhe?.paginas.map((pagina) => <option key={String(pagina.id)} value={String(pagina.id)}>{String(pagina.nome)}</option>)}</select></BiCampo>
                <BiCampo rotulo="Consulta"><select value={String(formWidget.consulta_id ?? '')} onChange={(evento) => setFormWidget({ ...formWidget, consulta_id: Number(evento.target.value) })}><option value="">Selecione</option>{consultas.map((consulta) => <option key={String(consulta.id)} value={String(consulta.id)}>{String(consulta.nome)}</option>)}</select></BiCampo>
                <BiCampo rotulo="Cor principal"><input type="color" value={String(formWidget.cor_principal ?? '#2563eb')} onChange={(evento) => setFormWidget({ ...formWidget, cor_principal: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Largura"><input type="number" min={2} max={15} value={Number(formWidget.largura ?? 3)} onChange={(evento) => setFormWidget({ ...formWidget, largura: Number(evento.target.value) })} /></BiCampo>
                <BiCampo rotulo="Altura"><input type="number" min={1} max={8} value={Number(formWidget.altura ?? 2)} onChange={(evento) => setFormWidget({ ...formWidget, altura: Number(evento.target.value) })} /></BiCampo>
                <BiCampo rotulo="Top X"><select value={String(formWidget.top_x_registros ?? '10')} onChange={(evento) => setFormWidget({ ...formWidget, top_x_registros: evento.target.value })}><option value="5">Top 5</option><option value="10">Top 10</option><option value="20">Top 20</option><option value="50">Top 50</option><option value="100">Top 100</option><option value="">Todos</option></select></BiCampo>
                <BiCampo rotulo="Ordenar por"><input value={String(formWidget.ordenar_por ?? '')} onChange={(evento) => setFormWidget({ ...formWidget, ordenar_por: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Direcao"><select value={String(formWidget.direcao_ordenacao ?? 'DESC')} onChange={(evento) => setFormWidget({ ...formWidget, direcao_ordenacao: evento.target.value })}><option value="DESC">Decrescente</option><option value="ASC">Crescente</option></select></BiCampo>
                <BiCampo rotulo="Colunas visiveis"><input placeholder="pedido, cliente, vendedor, valor" value={String(formWidget.colunas_visiveis_json ?? '')} onChange={(evento) => setFormWidget({ ...formWidget, colunas_visiveis_json: evento.target.value })} /></BiCampo>
                <BiCampo rotulo="Atualizacao do widget"><input type="number" min={15} value={Number(formWidget.intervalo_atualizacao_segundos ?? 60)} onChange={(evento) => setFormWidget({ ...formWidget, intervalo_atualizacao_segundos: Number(evento.target.value) })} /></BiCampo>
                <div className="biChecks biCampoGrande">
                  <label><input type="checkbox" checked={formWidget.atualizar_automaticamente !== false} onChange={(evento) => setFormWidget({ ...formWidget, atualizar_automaticamente: evento.target.checked })} /> Atualizar automaticamente</label>
                  <label><input type="checkbox" checked={formWidget.exibir_cabecalho !== false} onChange={(evento) => setFormWidget({ ...formWidget, exibir_cabecalho: evento.target.checked })} /> Exibir cabecalho</label>
                  <label><input type="checkbox" checked={formWidget.exibir_exportacao !== false} onChange={(evento) => setFormWidget({ ...formWidget, exibir_exportacao: evento.target.checked })} /> Permitir exportacao</label>
                  <label><input type="checkbox" checked={formWidget.exibir_tela_cheia !== false} onChange={(evento) => setFormWidget({ ...formWidget, exibir_tela_cheia: evento.target.checked })} /> Tela cheia</label>
                </div>
                <div className="biFormAcoes biCampoGrande"><button className="ghost"><Plus size={15} />Salvar widget</button></div>
                      </form>
                    </section>
                  </div>
                )}
                {modalPreviewWidgetAberto && (
                  <div className="biDetalheOverlay" role="dialog" aria-modal="true" aria-label="Prévia do widget">
                    <section className="biDetalheModal biPreviewModal">
                      <header>
                        <div>
                          <span>Prévia rápida</span>
                          <h3>{String(previewWidget?.titulo ?? 'Widget')}</h3>
                          <p>Resultado da consulta usada por este widget.</p>
                        </div>
                        <button type="button" onClick={() => setModalPreviewWidgetAberto(false)} title="Fechar"><X size={18} /></button>
                      </header>
                      <pre>{previewWidget ? JSON.stringify(previewWidget, null, 2) : 'Carregando dados do widget.'}</pre>
                    </section>
                  </div>
                )}
              </>
            )}

            {abaBuilder === 'acessos' && (
              <form className="biFormGrid" onSubmit={salvarAcessoDashboard}>
                <div className="biAvisoFonte biCampoGrande">
                  <UserCheck size={18} />
                  Libere aqui quem pode acessar este dashboard. Para aparecer no menu, o usuario ou perfil tambem precisa ter a permissao do modulo Business Intelligence no cadastro de permissoes.
                </div>
                <BiCampo rotulo="Liberar por">
                  <select value={String(formPermissao.tipo ?? 'USUARIO')} onChange={(evento) => setFormPermissao({ ...formPermissao, tipo: evento.target.value, usuario_id: '', perfil_id: '' })}>
                    <option value="USUARIO">Usuario</option>
                    <option value="PERFIL">Perfil</option>
                  </select>
                </BiCampo>
                {String(formPermissao.tipo ?? 'USUARIO') === 'USUARIO' ? (
                  <BiCampo rotulo="Usuario">
                    <select value={String(formPermissao.usuario_id ?? '')} onChange={(evento) => setFormPermissao({ ...formPermissao, usuario_id: evento.target.value })}>
                      <option value="">Selecione o usuario</option>
                      {usuarios.map((usuarioLinha) => <option key={String(usuarioLinha.id)} value={String(usuarioLinha.id)}>{String(usuarioLinha.nome ?? usuarioLinha.email ?? usuarioLinha.login ?? usuarioLinha.id)}</option>)}
                    </select>
                  </BiCampo>
                ) : (
                  <BiCampo rotulo="Perfil">
                    <select value={String(formPermissao.perfil_id ?? '')} onChange={(evento) => setFormPermissao({ ...formPermissao, perfil_id: evento.target.value })}>
                      <option value="">Selecione o perfil</option>
                      {perfis.map((perfil) => <option key={String(perfil.id)} value={String(perfil.id)}>{String(perfil.nome ?? perfil.descricao ?? perfil.id)}</option>)}
                    </select>
                  </BiCampo>
                )}
                <div className="biChecks biCampoGrande">
                  <label><input type="checkbox" checked={formPermissao.pode_visualizar !== false} onChange={(evento) => setFormPermissao({ ...formPermissao, pode_visualizar: evento.target.checked })} /> Visualizar dashboard</label>
                  <label><input type="checkbox" checked={Boolean(formPermissao.pode_editar)} onChange={(evento) => setFormPermissao({ ...formPermissao, pode_editar: evento.target.checked })} /> Editar dashboard</label>
                  <label><input type="checkbox" checked={Boolean(formPermissao.pode_excluir)} onChange={(evento) => setFormPermissao({ ...formPermissao, pode_excluir: evento.target.checked })} /> Excluir dashboard</label>
                  <label><input type="checkbox" checked={Boolean(formPermissao.pode_publicar)} onChange={(evento) => setFormPermissao({ ...formPermissao, pode_publicar: evento.target.checked })} /> Publicar dashboard</label>
                  <label><input type="checkbox" checked={Boolean(formPermissao.pode_modo_tv)} onChange={(evento) => setFormPermissao({ ...formPermissao, pode_modo_tv: evento.target.checked })} /> Acessar modo TV</label>
                </div>
                <div className="biFormAcoes biCampoGrande">
                  <button className="primary"><UserCheck size={15} />Liberar acesso</button>
                </div>
                <div className="biManutencaoWidgets biCampoGrande">
                  <strong>Acessos liberados neste dashboard</strong>
                  {(detalhe?.permissoes ?? []).map((permissao) => (
                    <div key={String(permissao.id)}>
                      <span>{permissao.usuario_id ? String(permissao.usuario_nome ?? permissao.usuario_email ?? `Usuario ${permissao.usuario_id}`) : String(permissao.perfil_nome ?? `Perfil ${permissao.perfil_id}`)}</span>
                      <small>
                        {permissao.usuario_id ? 'Usuario' : 'Perfil'} |
                        {permissao.pode_visualizar ? ' Visualizar' : ''}
                        {permissao.pode_editar ? ' | Editar' : ''}
                        {permissao.pode_excluir ? ' | Excluir' : ''}
                        {permissao.pode_publicar ? ' | Publicar' : ''}
                        {permissao.pode_modo_tv ? ' | TV' : ''}
                      </small>
                      <button type="button" onClick={() => removerAcessoDashboard(permissao)}>Remover acesso</button>
                    </div>
                  ))}
                  {(detalhe?.permissoes ?? []).length === 0 && <p>Nenhum acesso especifico cadastrado. Apenas administradores ou dashboards publicos ficam visiveis.</p>}
                </div>
              </form>
            )}
          </aside>
        )}
      </section>
    </section>
  );
}

export function BiFontesDados() {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarFontesDadosBi().then(setLinhas).catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar fontes.'));
  }, []);

  return (
    <section className="painelTabela biFontesLeitura">
      <header>
        <div>
          <span>Business Intelligence</span>
          <h2>Fontes de Dados</h2>
          <p>O BI usa automaticamente o PostgreSQL padrão do Control S Hub e reaproveita as conexoes SQL Server cadastradas no Cadastro Central de Produtos.</p>
        </div>
      </header>
      {erro && <div className="alerta">{erro}</div>}
      <div className="biAvisoFonte"><Database size={18} />Cadastre ou edite SQL Server em Cadastro Central de Produtos &gt; Conexoes SQL Server. Aqui as fontes ficam disponiveis para consultas do BI.</div>
      <BiTabelaSimples linhas={linhas} colunas={['nome', 'tipo', 'descricao', 'host', 'porta', 'banco', 'usuario', 'somente_leitura']} />
    </section>
  );
}

export function BiConsultasEditor() {
  const [consultas, setConsultas] = useState<RegistroGenerico[]>([]);
  const [fontes, setFontes] = useState<RegistroGenerico[]>([]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({ nome: '', descricao: '', sql_consulta: 'SELECT 1 AS valor', tempo_cache_segundos: 60, ativo: true });
  const [filtro, setFiltro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConsultaCompacto, setModalConsultaCompacto] = useState(false);
  const [limitePrevia, setLimitePrevia] = useState(5);
  const [preview, setPreview] = useState<RegistroGenerico | null>(null);
  const [modalPreviewConsultaAberto, setModalPreviewConsultaAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function carregar() {
    setConsultas(await listarConsultasBi());
    listarFontesDadosBi().then(setFontes).catch(() => setFontes([]));
  }

  useEffect(() => {
    carregar().catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar consultas.'));
  }, []);

  function obterValorFonteConsulta(consulta: RegistroGenerico) {
    if (consulta.conexao_sqlserver_id) return `SQLSERVER_PIM:${consulta.conexao_sqlserver_id}`;
    return String(consulta.fonte_dados_id ?? '');
  }

  function normalizarConsultaParaEnvio(consulta: RegistroGenerico) {
    const fonteSelecionada = String(consulta.fonte_dados_id ?? '');
    if (fonteSelecionada.startsWith('SQLSERVER_PIM:')) {
      return { ...consulta, fonte_dados_tipo: 'SQLSERVER', conexao_sqlserver_id: Number(fonteSelecionada.replace('SQLSERVER_PIM:', '')) };
    }
    if (!fonteSelecionada) {
      return { ...consulta, fonte_dados_tipo: 'POSTGRESQL', conexao_sqlserver_id: null, fonte_dados_id: '' };
    }
    return { ...consulta, fonte_dados_tipo: 'POSTGRESQL', conexao_sqlserver_id: null };
  }

  function formatarSqlControlS(sql: string) {
    const palavrasQuebram = ['SELECT', 'FROM', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT'];
    let texto = String(sql ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
    palavrasQuebram.forEach((palavra) => {
      texto = texto.replace(new RegExp(`\\s+${palavra}\\s+`, 'gi'), `\n${palavra}\n  `);
    });
    texto = texto
      .replace(/^SELECT\s+/i, 'SELECT\n  ')
      .replace(/\s*,\s*/g, ',\n  ')
      .replace(/\n  FROM\n  /gi, '\nFROM ')
      .replace(/\n  (INNER|LEFT|RIGHT|FULL) JOIN\n  /gi, '\n$1 JOIN ')
      .replace(/\n  WHERE\n  /gi, '\nWHERE ')
      .replace(/\n  GROUP BY\n  /gi, '\nGROUP BY ')
      .replace(/\n  ORDER BY\n  /gi, '\nORDER BY ')
      .replace(/\s+ON\s+/gi, '\n  ON ')
      .replace(/\s+AND\s+/gi, '\n  AND ')
      .replace(/\s+OR\s+/gi, '\n  OR ')
      .replace(/\n{3,}/g, '\n\n');
    return texto.trim();
  }

  function novaConsulta() {
    setFormulario({
      nome: '',
      descricao: '',
      sql_consulta: 'SELECT\n  T1.ID,\n  T1.NOME\nFROM TABELA1 T1\nWHERE T1.ID = :ID',
      tempo_cache_segundos: 60,
      permitir_procedure: false,
      ativo: true
    });
    setPreview(null);
    setErro('');
    setMensagem('');
    setModalAberto(true);
  }

  function editarConsulta(consulta: RegistroGenerico) {
    setFormulario({ ...consulta, fonte_dados_id: obterValorFonteConsulta(consulta) });
    setPreview(null);
    setErro('');
    setMensagem('');
    setModalAberto(true);
  }

  async function testarFormulario() {
    setErro('');
    setMensagem('');
    try {
      const resultado = await testarConsultaBi(normalizarConsultaParaEnvio(formulario), {}, limitePrevia);
      setPreview(resultado);
      setModalPreviewConsultaAberto(true);
      setMensagem(`Consulta testada com sucesso. Prévia limitada a ${limitePrevia} registro(s).`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao testar consulta.');
    }
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    try {
      setErro('');
      await salvarConsultaBi(normalizarConsultaParaEnvio(formulario));
      setMensagem('Consulta salva com sucesso.');
      setModalAberto(false);
      setFormulario({ nome: '', descricao: '', sql_consulta: 'SELECT 1 AS valor', tempo_cache_segundos: 60, ativo: true });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar consulta.');
    }
  }

  const consultasFiltradas = consultas.filter((consulta) => {
    const termo = filtro.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return true;
    return [consulta.nome, consulta.descricao, consulta.fonte_dados_nome, consulta.fonte_dados_tipo, consulta.sql_consulta]
      .some((valor) => String(valor ?? '').toLocaleLowerCase('pt-BR').includes(termo));
  });
  const linhasPreview = Array.isArray(preview?.dados) ? preview.dados as RegistroGenerico[] : [];
  const colunasPreview = Array.from(new Set(linhasPreview.flatMap((linha) => Object.keys(linha)))).slice(0, 20);

  return (
    <section className="biConsultaPagina">
      <div className="painelTabela">
        <header>
          <div>
            <span>Consultas SQL</span>
            <h2>Cadastro de consultas</h2>
            <p>Gerencie consultas SELECT/WITH usadas pelos dashboards. Use parametros com dois pontos, como :empresa_id, :data_inicial, :data_final e :ID.</p>
          </div>
          <button className="primary" type="button" onClick={novaConsulta}><Plus size={15} />Nova consulta</button>
        </header>
        <div className="biConsultaAjuda">
          <Info size={18} />
          <div>
            <strong>Como usar parametros</strong>
            <p>Escreva filtros como <code>WHERE T1.ID = :ID</code>. O backend substitui os parametros com segurança. Dashboards aceitam apenas comandos de leitura: <code>SELECT</code> ou <code>WITH</code>.</p>
          </div>
        </div>
        {erro && !modalAberto && <div className="alerta">{erro}</div>}
        {mensagem && !modalAberto && <div className="sucesso">{mensagem}</div>}
        <div className="biConsultaFiltro">
          <Filter size={16} />
          <input placeholder="Filtrar por nome, fonte, tipo ou trecho do SQL..." value={filtro} onChange={(evento) => setFiltro(evento.target.value)} />
          <span>{consultasFiltradas.length} de {consultas.length} consulta(s)</span>
        </div>
        <BiTabelaSimples
          linhas={consultasFiltradas}
          colunas={['nome', 'fonte_dados_nome', 'fonte_dados_tipo', 'tempo_cache_segundos', 'ativo']}
          acoes={(consulta) => (
            <>
              <button className="ghost" type="button" onClick={() => editarConsulta(consulta)}>Editar</button>
              <button className="ghost" type="button" onClick={() => { const consultaTeste = { ...consulta, fonte_dados_id: obterValorFonteConsulta(consulta) }; editarConsulta(consulta); testarConsultaBi(normalizarConsultaParaEnvio(consultaTeste), {}, 5).then((resultado) => { setPreview(resultado); setModalPreviewConsultaAberto(true); }).catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao testar consulta.')); }}>Testar</button>
              <button className="ghost danger" type="button" onClick={() => excluirConsultaBi(Number(consulta.id)).then(carregar)}>Excluir</button>
            </>
          )}
        />
      </div>
      {modalAberto && (
        <div className="biDetalheOverlay" role="dialog" aria-modal="true" aria-label="Editar consulta SQL">
          <section className={`biDetalheModal biConsultaModal ${modalConsultaCompacto ? 'biModalCompacto' : 'biModalTelaCheia'}`}>
            <header>
              <div>
                <span>Consulta SQL</span>
                <h3>{formulario.id ? 'Editar consulta' : 'Nova consulta'}</h3>
                <p>Teste a consulta e confira a prévia antes de salvar.</p>
              </div>
              <div className="biModalControles">
                <button type="button" onClick={() => setModalConsultaCompacto((atual) => !atual)} title={modalConsultaCompacto ? 'Expandir tela' : 'Reduzir tela'}>{modalConsultaCompacto ? <Maximize2 size={18} /> : <PanelsTopLeft size={18} />}</button>
                <button type="button" onClick={() => setModalAberto(false)} title="Fechar"><X size={18} /></button>
              </div>
            </header>
            {erro && <div className="alerta">{erro}</div>}
            {mensagem && <div className="sucesso">{mensagem}</div>}
            <form className="biConsultaModalForm" onSubmit={salvar}>
              <BiCampo rotulo="Nome"><input value={String(formulario.nome ?? '')} onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })} /></BiCampo>
              <BiCampo rotulo="Fonte de dados"><select value={String(formulario.fonte_dados_id ?? '')} onChange={(evento) => setFormulario({ ...formulario, fonte_dados_id: evento.target.value })}><option value="">PostgreSQL padrão</option>{fontes.map((fonte) => <option key={String(fonte.id)} value={String(fonte.id)}>{String(fonte.nome)} - {String(fonte.tipo)}</option>)}</select></BiCampo>
              <BiCampo rotulo="Cache (segundos)"><input type="number" value={Number(formulario.tempo_cache_segundos ?? 60)} onChange={(evento) => setFormulario({ ...formulario, tempo_cache_segundos: Number(evento.target.value) })} /></BiCampo>
              <BiCampo rotulo="Registros na prévia"><select value={limitePrevia} onChange={(evento) => setLimitePrevia(Number(evento.target.value))}><option value={5}>5 registros</option><option value={10}>10 registros</option><option value={50}>50 registros</option></select></BiCampo>
              <div className="biChecks biCampoGrande">
                <label><input type="checkbox" checked={Boolean(formulario.permitir_procedure)} onChange={(evento) => setFormulario({ ...formulario, permitir_procedure: evento.target.checked })} /> Permitir procedure / EXEC / CALL nesta consulta</label>
              </div>
              <label className="biCampo biCampoGrande"><span>Descricao</span><input value={String(formulario.descricao ?? '')} onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })} /></label>
              <label className="biCampo biSqlEditor">
                <span>Query SQL</span>
                <textarea spellCheck={false} value={String(formulario.sql_consulta ?? '')} onChange={(evento) => setFormulario({ ...formulario, sql_consulta: evento.target.value })} />
              </label>
              <div className="biConsultaParametros biCampoGrande">
                <strong>Parametros aceitos</strong>
                <span><code>:empresa_id</code> empresa ativa do usuario</span>
                <span><code>:data_inicial</code> e <code>:data_final</code> periodo informado nos filtros</span>
                <span><code>:ID</code>, <code>:cliente_id</code>, <code>:filial_id</code> ou qualquer nome usado no SQL</span>
                <span>Procedure/EXEC fica bloqueado por padrão. Marque a opção acima apenas para consultas controladas.</span>
              </div>
              <div className="biFormAcoes biCampoGrande">
                <button className="ghost" type="button" onClick={() => setFormulario({ ...formulario, sql_consulta: formatarSqlControlS(String(formulario.sql_consulta ?? '')) })}><FileCode2 size={15} />Identar padrão Control S</button>
                <button className="ghost" type="button" onClick={testarFormulario}><Table2 size={15} />Testar e ver prévia</button>
                <button className="primary" type="submit"><Save size={15} />Salvar consulta</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {modalPreviewConsultaAberto && (
        <div className="biDetalheOverlay" role="dialog" aria-modal="true" aria-label="Prévia da consulta SQL">
          <section className="biDetalheModal biPreviewModal">
            <header>
              <div>
                <span>Prévia dos dados</span>
                <h3>{String(formulario.nome ?? 'Consulta SQL')}</h3>
                <p>{linhasPreview.length} registro(s) exibido(s) de {String(preview?.quantidade_total_consulta ?? preview?.quantidade_registros ?? 0)}</p>
              </div>
              <button type="button" onClick={() => setModalPreviewConsultaAberto(false)} title="Fechar"><X size={18} /></button>
            </header>
            {linhasPreview.length > 0 ? (
              <div className="biDetalheTabela">
                <table>
                  <thead><tr>{colunasPreview.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}</tr></thead>
                  <tbody>{linhasPreview.map((linha, indice) => <tr key={indice}>{colunasPreview.map((coluna) => <td key={coluna}>{formatarValorBi(linha[coluna], coluna.includes('valor'))}</td>)}</tr>)}</tbody>
                </table>
              </div>
            ) : <EstadoBi titulo="Sem prévia" descricao="A consulta executou, mas não retornou registros para a prévia." />}
          </section>
        </div>
      )}
    </section>
  );
}

export function BiLogsExecucao() {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  useEffect(() => { listarLogsBi().then(setLinhas).catch(() => setLinhas([])); }, []);
  return <section className="painelTabela"><header><div><span>Business Intelligence</span><h2>Logs de Execucao</h2><p>Execucoes, tempos, erros e quantidade de registros por dashboard, widget e consulta.</p></div></header><BiTabelaSimples linhas={linhas} colunas={['criado_em', 'status', 'dashboard_nome', 'widget_titulo', 'consulta_nome', 'tempo_execucao_ms', 'quantidade_registros', 'mensagem']} /></section>;
}

export function BiTemplates() {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  useEffect(() => { listarTemplatesBi().then(setLinhas).catch(() => setLinhas([])); }, []);
  return <section className="painelTabela"><header><div><span>Business Intelligence</span><h2>Templates</h2><p>Modelos prontos para acelerar novos dashboards.</p></div></header><BiTabelaSimples linhas={linhas} colunas={['nome', 'categoria', 'descricao', 'ativo']} /></section>;
}

export function BiSemPermissao({ descricao }: { descricao: string }) {
  return <EstadoBi titulo="Sem permissao" descricao={descricao} />;
}




