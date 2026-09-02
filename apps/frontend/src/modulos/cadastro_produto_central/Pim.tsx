import { BadgeCheck, Building2, Boxes, ChevronLeft, Database, Download, ExternalLink, FileUp, Globe2, ListChecks, Maximize2, Minimize2, PackageSearch, Printer, RefreshCw, Settings, SlidersHorizontal, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import * as XLSX from 'xlsx';
import {
  alterarStatusProdutoPim,
  buscarDashboardPim,
  compararProdutoIaPim,
  consultarSqlServerPim,
  desvincularAssetProdutoPim,
  duplicarProdutoPim,
  executarCargaSqlServerPim,
  excluirConsultaSqlServerPim,
  excluirProdutoPim,
  exportarProdutosPim,
  excluirAtributoPim,
  excluirMapeamentoAtributoCanalPim,
  listarCargasSqlServerPim,
  listarEmpresas,
  listarAssetsPim,
  listarCandidatosMidiaProdutoPim,
  listarAtributosPim,
    listarAuditoriaPim,
  listarAtributosComparacaoPim,
  listarComparacoesProdutoPim,
  listarCoberturaConcorrentesPim,
  listarCanaisPim,

  listarConexoesSqlServerPim,
  listarConsultasSqlServerPim,
  listarComponentesPim,
  listarConfiguracoesPim,
  listarImportacoesPim,
  listarFontesComparacaoPim,
  carregarFonteComparacaoPim,
  obterMatrizComparacaoProdutoPim,
  listarMapeamentosAtributosCanaisPim,
  listarProdutosPim,
  listarWorkflowsPim,
  obterProdutoPim,
  obterDeParaConcorrentePim,
  RegistroGenerico,
  registrarImportacaoPim,
    restaurarProdutoPim,
  salvarAtributosComparacaoPim,
  salvarComparacaoAnuncioPim,
  salvarConsolidadoComparacaoPim,
  salvarFonteComparacaoPim,
  salvarEmpresa,
  extrairAnuncioComparacaoPim,
  excluirFonteComparacaoPim,
  salvarAssetPim,

  salvarAtributoPim,
  salvarCanalPim,
  excluirEmpresa,
  salvarComponentePim,
  salvarConexaoSqlServerPim,
  salvarConsultaSqlServerPim,
  salvarConfiguracoesPim,
  salvarMapeamentoAtributoCanalPim,
  salvarProdutoPim,
  testarConexaoSqlServerPim,
  testarIaPim,
  vincularAssetsProdutosPim
} from '../../servicos/api';

type TelaAtual =
  | 'pimDashboard'
  | 'pimProdutos'
  | 'pimConjuntos'
  | 'pimComponentes'
  | 'pimSkus'
  | 'pimSqlConexoes'
  | 'pimSqlCargas'
  | 'pimAtributos'
    | 'pimCanais'
  | 'pimConcorrentes'
  | 'pimImportacao'

  | 'pimAssets'
  | 'pimWorkflows'
  | 'pimAprovacoes'
  | 'pimIa'
  | 'pimIntegracoes'
  | 'pimAuditoria'
  | 'pimConfiguracoes'
  | 'configuracoes';

const LOGO_CADASTRO_PRODUTO = '/brand/logo-cadastro-produto-central.png';

function LogoCadastroProduto({ pequeno = false }: { pequeno?: boolean }) {
  return (
    <span className={pequeno ? 'pimLogoAsset pequeno' : 'pimLogoAsset'} aria-hidden="true">
      <img src={LOGO_CADASTRO_PRODUTO} alt="" />
    </span>
  );
}

export function LogoProdutoCentral({ pequeno = false }: { pequeno?: boolean }) {
  return <LogoCadastroProduto pequeno={pequeno} />;
}

const TIPOS_PRODUTO_BASE_CLIMATIZACAO = [
  'EVAPORADORA',
  'CONDENSADORA',
  'CONTROLE_REMOTO',
  'KIT_INSTALACAO',
  'ACESSORIO',
  'COMPRESSOR',
  'SERPENTINA_EVAPORADORA',
  'SERPENTINA_CONDENSADORA',
  'VENTILADOR',
  'MOTOR',
  'PLACA_ELETRONICA',
  'SENSOR',
  'VALVULA',
  'FILTRO',
  'MODULO_WIFI',
  'CONTROLADOR',
  'INTERFACE',
  'CAIXA_DERIVACAO',
  'PECA_REPOSICAO'
];

const TIPOS_CONJUNTO_CLIMATIZACAO = [
  'CONJUNTO_ERP',
  'SPLIT_HI_WALL',
  'PISO_TETO',
  'CASSETE_1_VIA',
  'CASSETE_2_VIAS',
  'CASSETE_4_VIAS',
  'CASSETE_COMPACTO',
  'DUTADO',
  'MULTI_SPLIT',
  'VRF',
  'CHILLER',
  'FAN_COIL',
  'UTA',
  'JANELA',
  'PORTATIL'
];

const ROTULOS_TIPOS_CLIMATIZACAO: Record<string, string> = {
  CONJUNTO_ERP: 'Conjunto importado ERP',
  EVAPORADORA: 'Evaporadora',
  CONDENSADORA: 'Condensadora',
  CONTROLE_REMOTO: 'Controle remoto',
  KIT_INSTALACAO: 'Kit instalacao',
  ACESSORIO: 'Acessorio',
  COMPRESSOR: 'Compressor',
  SERPENTINA_EVAPORADORA: 'Serpentina evaporadora',
  SERPENTINA_CONDENSADORA: 'Serpentina condensadora',
  VENTILADOR: 'Ventilador',
  MOTOR: 'Motor',
  PLACA_ELETRONICA: 'Placa eletronica',
  SENSOR: 'Sensor',
  VALVULA: 'Valvula',
  FILTRO: 'Filtro',
  MODULO_WIFI: 'Modulo Wi-Fi',
  CONTROLADOR: 'Controlador',
  INTERFACE: 'Interface',
  CAIXA_DERIVACAO: 'Caixa de derivacao',
  PECA_REPOSICAO: 'Peca de reposicao',
  SPLIT_HI_WALL: 'Split Hi Wall',
  PISO_TETO: 'Piso Teto',
  CASSETE_1_VIA: 'Cassete 1 via',
  CASSETE_2_VIAS: 'Cassete 2 vias',
  CASSETE_4_VIAS: 'Cassete 4 vias',
  CASSETE_COMPACTO: 'Cassete compacto',
  DUTADO: 'Dutado',
  MULTI_SPLIT: 'Multi Split',
  VRF: 'VRF',
  CHILLER: 'Chiller',
  FAN_COIL: 'Fan Coil',
  UTA: 'UTA',
  JANELA: 'Janela',
  PORTATIL: 'Portatil'
};

function ehConjuntoClimatizacao(item: RegistroGenerico) {
  const tipo = String(item.tipo_produto ?? '').trim().toUpperCase();
  return TIPOS_CONJUNTO_CLIMATIZACAO.includes(tipo) || tipo.includes('CONJUNTO') || tipo === 'KIT';
}

function BotaoAtualizar({ carregando, aoAtualizar }: { carregando: boolean; aoAtualizar: () => void | Promise<unknown> }) {
  return <button className={`botaoAtualizar${carregando ? ' carregando' : ''}`} type="button" onClick={() => aoAtualizar()} disabled={carregando}>{carregando ? 'Atualizando...' : 'Atualizar'}</button>;
}

function navegarParaTela(tela: TelaAtual) {
  const rotas: Record<TelaAtual, string> = {
    pimDashboard: '/Cadastro_Produto_Central/Dashboard',
    pimProdutos: '/Cadastro_Produto_Central/Produtos',
    pimConjuntos: '/Cadastro_Produto_Central/Conjuntos',
    pimComponentes: '/Cadastro_Produto_Central/Componentes',
    pimSkus: '/Cadastro_Produto_Central/SKUs',
    pimSqlConexoes: '/Cadastro_Produto_Central/Conexoes_SQL',
    pimSqlCargas: '/Cadastro_Produto_Central/Carga_SQL',
    pimAtributos: '/Cadastro_Produto_Central/Atributos',
        pimCanais: '/Cadastro_Produto_Central/Canais',
    pimConcorrentes: '/Cadastro_Produto_Central/Concorrentes',
    pimImportacao: '/Cadastro_Produto_Central/Importacao',

    pimAssets: '/Cadastro_Produto_Central/Assets',
    pimWorkflows: '/Cadastro_Produto_Central/Workflows',
    pimAprovacoes: '/Cadastro_Produto_Central/Aprovacoes',
    pimIa: '/Cadastro_Produto_Central/IA',
    pimIntegracoes: '/Cadastro_Produto_Central/Integracoes',
    pimAuditoria: '/Cadastro_Produto_Central/Auditoria',
    pimConfiguracoes: '/Cadastro_Produto_Central/Configuracoes',
    configuracoes: '/Configuracoes'
  };
  window.history.pushState(null, '', rotas[tela]);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function DashboardPim() {
  const [indicadores, setIndicadores] = useState<Record<string, any>>({});
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      setIndicadores(await buscarDashboardPim());
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const status = indicadores.por_status ?? [];
  const canais = indicadores.por_canal ?? [];
  const categorias = indicadores.por_categoria ?? [];
  const pendencias = indicadores.erros_por_canal ?? [];
  const maxStatus = Math.max(1, ...status.map((item: RegistroGenerico) => Number(item.total ?? 0)));

  return (
    <section>
      <div className="barraAcoesTela">
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>Dashboard PIM</h2>
        </div>
        <BotaoAtualizar carregando={carregando} aoAtualizar={carregar} />
      </div>
      <div className="metrics pimMetrics">
        <article><span>Total de cadastros</span><strong>{indicadores.total_produtos ?? 0}</strong></article>
        <article><span>Rascunhos</span><strong>{indicadores.produtos_rascunho ?? 0}</strong></article>
        <article><span>Em aprovação</span><strong>{indicadores.produtos_aguardando_aprovacao ?? 0}</strong></article>
        <article><span>Publicados</span><strong>{indicadores.produtos_publicados ?? 0}</strong></article>
        <article><span>Incompletos</span><strong>{indicadores.produtos_incompletos ?? 0}</strong></article>
        <article><span>Score médio</span><strong>{indicadores.score_medio_completude ?? 0}%</strong></article>
      </div>
      <div className="dashboardGrid pimDashboardGrid">
        <div className="rankingPainel">
          <span>Cadastros por status</span>
          {status.map((item: RegistroGenerico) => (
            <div className="barraDashboard" key={String(item.status)}>
              <strong>{String(item.status)}</strong>
              <span style={{ width: `${Math.max(8, (Number(item.total ?? 0) / maxStatus) * 100)}%` }} />
              <small>{String(item.total)} cadastro(s)</small>
            </div>
          ))}
          {status.length === 0 && <p>Nenhum cadastro encontrado.</p>}
        </div>
        <div className="rankingPainel">
          <span>Indicadores de atenção</span>
          <p><strong>{indicadores.produtos_rejeitados ?? 0}</strong> rejeitado(s)</p>
          <p><strong>{indicadores.produtos_sem_imagem ?? 0}</strong> sem imagem</p>
          <p><strong>{indicadores.produtos_sem_ean ?? 0}</strong> sem EAN</p>
        </div>
      </div>
    </section>
  );
}

export function ProdutosPim({ modo = 'produtos' }: { modo?: 'produtos' | 'conjuntos' | 'skus' }) {
  const ehConjunto = modo === 'conjuntos';
  const tipoPadrao = ehConjunto ? 'SPLIT_HI_WALL' : 'EVAPORADORA';
  const abasProduto = ehConjunto
    ? ['Identificacao', 'Logistica', 'Produtos vinculados', 'Atributos Tecnicos', 'Imagens e Documentos', 'Plataformas']
    : ['Identificacao', 'Logistica', 'Comercial', 'Estoque / Controle', 'Atributos Tecnicos', 'SEO', 'Imagens e Documentos', 'Plataformas'];
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [editorAberto, setEditorAberto] = useState(false);
  const [abaProduto, setAbaProduto] = useState(abasProduto[0]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({ tipo_produto: tipoPadrao, status: 'RASCUNHO', origem: 'MANUAL' });
  const [detalhe, setDetalhe] = useState<RegistroGenerico>({ skus: [], componentes: [], atributos: [], canais: [], assets: [], historico: [], aprovacoes: [] });
  const [atributosDisponiveis, setAtributosDisponiveis] = useState<RegistroGenerico[]>([]);
  const [linhaSku, setLinhaSku] = useState<RegistroGenerico>({ status: 'ATIVO', principal: false });
  const [linhaComponente, setLinhaComponente] = useState<RegistroGenerico>({ tipo_relacao: 'EVAPORADORA', quantidade: 1, obrigatorio: true });
  const [linhaAtributo, setLinhaAtributo] = useState<RegistroGenerico>({});
  const [bibliotecaAssets, setBibliotecaAssets] = useState<RegistroGenerico[]>([]);
  const [buscaAsset, setBuscaAsset] = useState('');
  const [assetsSelecionados, setAssetsSelecionados] = useState<number[]>([]);
  const [assetPrincipal, setAssetPrincipal] = useState(false);
  const [resultadoIa, setResultadoIa] = useState<RegistroGenerico | null>(null);
  const [comparacoesConcorrentes, setComparacoesConcorrentes] = useState<RegistroGenerico[]>([]);
  const [siteIa, setSiteIa] = useState('https://www.leveros.com.br/');
  const [referenciaIa, setReferenciaIa] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function carregar() {
    const dados = await listarProdutosPim({ busca, status });
    const filtrados = modo === 'conjuntos'
      ? dados.filter((item) => TIPOS_CONJUNTO_CLIMATIZACAO.includes(String(item.tipo_produto)))
      : dados.filter((item) => !TIPOS_CONJUNTO_CLIMATIZACAO.includes(String(item.tipo_produto)));
    setLinhas(filtrados);
  }

  useEffect(() => {
    carregar().catch(() => setLinhas([]));
    listarAtributosPim().then((dados) => setAtributosDisponiveis(dados.atributos)).catch(() => setAtributosDisponiveis([]));
    listarAssetsPim().then(setBibliotecaAssets).catch(() => setBibliotecaAssets([]));
  }, []);

  async function abrirProduto(linha?: RegistroGenerico, duplicar = false) {
    setErro('');
    setMensagem('');
    if (!linha?.id || duplicar) {
      setFormulario({
        ...(linha ?? {}),
        id: undefined,
        codigo_erp_decis: duplicar ? '' : linha?.codigo_erp_decis,
        tipo_produto: tipoPadrao,
        status: 'RASCUNHO',
        origem: 'MANUAL'
      });
      setDetalhe({ skus: [], componentes: [], atributos: [], canais: [], assets: [], historico: [], aprovacoes: [] });
      setComparacoesConcorrentes([]);
      setReferenciaIa('');
    } else {
      const dados = await obterProdutoPim(Number(linha.id));
      setFormulario(dados.produto);
      setDetalhe(dados);
      try {
        setComparacoesConcorrentes(await listarComparacoesProdutoPim(Number(linha.id)));
      } catch {
        setComparacoesConcorrentes([]);
      }
      const chaveModeloAlfaNumerico = dados.produto.fiscal_comercial?.Identificacao?.modelo_alfa_numerico;
      setReferenciaIa(String(chaveModeloAlfaNumerico ?? dados.produto.codigo_fabricante ?? dados.produto.modelo ?? ''));
    }
    setAbaProduto('Identificacao');
    setEditorAberto(true);
  }

  async function salvar(evento?: FormEvent) {
    evento?.preventDefault();
    setErro('');
    setMensagem('');
    try {
      const salvo = await salvarProdutoPim({
        ...formulario,
        skus: detalhe.skus ?? [],
        componentes: detalhe.componentes ?? [],
        atributos: detalhe.atributos ?? []
      });
      setMensagem('Produto salvo, validado e versionado.');
      if (salvo?.id) {
        const atualizado = await obterProdutoPim(Number(salvo.id));
        setFormulario(atualizado.produto);
        setDetalhe(atualizado);
      }
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar produto.');
    }
  }

  async function alterarStatus(id: number, novoStatus: string) {
    setErro('');
    setMensagem('');
    try {
      const comentario = novoStatus === 'REJEITADO' ? 'Rejeitado pela rotina de aprovacao do PIM.' : `Transicao para ${novoStatus}.`;
      await alterarStatusProdutoPim(id, novoStatus, comentario);
      await carregar();
      if (formulario.id && Number(formulario.id) === id) {
        const atualizado = await obterProdutoPim(id);
        setFormulario(atualizado.produto);
        setDetalhe(atualizado);
      }
      setMensagem('Workflow atualizado e auditado.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao alterar workflow.');
    }
  }

  async function duplicarLinha(linha: RegistroGenerico) {
    setErro('');
    setMensagem('');
    try {
      if (!linha.id) return;
      const duplicado = await duplicarProdutoPim(Number(linha.id));
      setMensagem('Produto duplicado como rascunho.');
      await carregar();
      if (duplicado?.id) await abrirProduto(duplicado);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao duplicar produto.');
    }
  }

  async function restaurarLinha(linha: RegistroGenerico) {
    setErro('');
    setMensagem('');
    try {
      if (!linha.id) return;
      await restaurarProdutoPim(Number(linha.id));
      setMensagem('Produto restaurado.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao restaurar produto.');
    }
  }

  async function exportar() {
    setErro('');
    setMensagem('');
    try {
      const dados = await exportarProdutosPim();
      const colunas = ['codigo_erp_decis', 'codigo_fabricante', 'ean_gtin', 'gtin', 'nome_comercial', 'marca', 'modelo', 'categoria', 'tipo_produto', 'status', 'score_completude'];
      const linhasCsv = [colunas.join(';'), ...dados.map((item) => colunas.map((coluna) => `"${String(item[coluna] ?? '').replace(/"/g, '""')}"`).join(';'))];
      const blob = new Blob([linhasCsv.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cadastro-produto-central-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMensagem('Exportacao gerada em CSV.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao exportar produtos.');
    }
  }

  function adicionarSku() {
    if (!linhaSku.sku && !linhaSku.sku_interno) return;
    setDetalhe({ ...detalhe, skus: [...(detalhe.skus ?? []), { ...linhaSku, sku: linhaSku.sku ?? linhaSku.sku_interno }] });
    setLinhaSku({ status: 'ATIVO', principal: false });
  }

  function adicionarComponente() {
    if (!linhaComponente.codigo && !linhaComponente.nome) return;
    setDetalhe({ ...detalhe, componentes: [...(detalhe.componentes ?? []), linhaComponente] });
    setLinhaComponente({ tipo_relacao: 'EVAPORADORA', quantidade: 1, obrigatorio: true });
  }

  function adicionarAtributo() {
    if (!linhaAtributo.attribute_id) return;
    const atributo = atributosDisponiveis.find((item) => Number(item.id) === Number(linhaAtributo.attribute_id));
    setDetalhe({ ...detalhe, atributos: [...(detalhe.atributos ?? []), { ...linhaAtributo, nome_exibido: atributo?.nome_exibido, codigo: atributo?.codigo, tipo_campo: atributo?.tipo_campo }] });
    setLinhaAtributo({});
  }

  function sugerirSeo() {
    setMensagem('Configure a chave OpenAI em IA & Enriquecimento para usar sugestoes automaticas.');
  }

  async function carregarBibliotecaAssets() {
    setBibliotecaAssets(await listarAssetsPim(buscaAsset));
  }

  async function vincularAssetsSelecionados() {
    if (!formulario.id) {
      setErro('Salve o cadastro antes de vincular imagens e documentos.');
      return;
    }
    if (!assetsSelecionados.length) {
      setErro('Selecione uma ou mais imagens/documentos da biblioteca.');
      return;
    }
    setErro('');
    const retorno = await vincularAssetsProdutosPim({
      asset_ids: assetsSelecionados,
      produto_ids: [Number(formulario.id)],
      tipo_vinculo: assetPrincipal ? 'PRINCIPAL' : 'SECUNDARIA',
      principal: assetPrincipal
    });
    const atualizado = await obterProdutoPim(Number(formulario.id));
    setDetalhe(atualizado);
    setAssetsSelecionados([]);
    setMensagem(`Vinculo concluido: ${String(retorno.vinculados ?? 0)} item(ns).`);
  }

  async function desvincularAsset(assetId: number) {
    if (!formulario.id) return;
    await desvincularAssetProdutoPim(Number(formulario.id), assetId);
    const atualizado = await obterProdutoPim(Number(formulario.id));
    setDetalhe(atualizado);
    setMensagem('Imagem/documento desvinculado.');
  }

  function abrirEnriquecimentoProduto() {
    if (!formulario.id) {
      setErro('Salve o Conjunto antes de abrir o Enriquecimento filtrado pelo produto.');
      return;
    }
    window.history.pushState(null, '', `/Cadastro_Produto_Central/Concorrentes?produto_id=${Number(formulario.id)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  async function compararComIa() {
    if (!formulario.id) {
      setErro('Salve o cadastro antes de comparar com IA.');
      return;
    }
    setErro('');
    setMensagem('');
    const retorno = await compararProdutoIaPim(Number(formulario.id), {
      codigo_referencia: referenciaIa,
      modelo_alfa_numerico: formulario.fiscal_comercial?.Identificacao?.modelo_alfa_numerico,
      codigo_fabricante: formulario.codigo_fabricante,
      modelo: formulario.modelo,
      site_prioritario: siteIa
    });
    setResultadoIa(retorno);
    setMensagem(retorno.configurado === false ? String(retorno.mensagem ?? 'IA nao configurada.') : 'Comparacao com IA gerada.');
  }

  const titulo = ehConjunto ? 'Conjuntos' : 'Produtos';
  const descricaoTela = ehConjunto
    ? 'Conjuntos sao os itens vendidos. Aqui ficam identificacao, logistica, produtos vinculados, atributos tecnicos, imagens e plataformas.'
    : 'Produtos sao materia-prima/base do conjunto, como evaporadora, condensadora, controle, kit e acessorios.';
  const tiposPermitidos = ehConjunto ? TIPOS_CONJUNTO_CLIMATIZACAO : TIPOS_PRODUTO_BASE_CLIMATIZACAO;
  const pendencias = Array.isArray(formulario.pendencias_validacao) ? formulario.pendencias_validacao : [];
  const dadosOperacionais = (formulario.fiscal_comercial && typeof formulario.fiscal_comercial === 'object'
    ? formulario.fiscal_comercial
    : {}) as RegistroGenerico;

  function valorOperacional(grupo: string, campo: string) {
    const dadosGrupo = (dadosOperacionais[grupo] && typeof dadosOperacionais[grupo] === 'object' ? dadosOperacionais[grupo] : {}) as RegistroGenerico;
    return String(dadosGrupo[campo] ?? '');
  }

  function alterarOperacional(grupo: string, campo: string, valor: string) {
    const dadosGrupo = (dadosOperacionais[grupo] && typeof dadosOperacionais[grupo] === 'object' ? dadosOperacionais[grupo] : {}) as RegistroGenerico;
    setFormulario({
      ...formulario,
      fiscal_comercial: {
        ...dadosOperacionais,
        [grupo]: {
          ...dadosGrupo,
          [campo]: valor
        }
      }
    });
  }

  function campoOperacional([grupo, campo, rotulo]: string[]) {
    return (
      <label key={`${grupo}-${campo}`}>
        {rotulo}
        <input value={valorOperacional(grupo, campo)} onChange={(e) => alterarOperacional(grupo, campo, e.target.value)} />
      </label>
    );
  }

  function campoProduto([campo, rotulo]: string[], tipo: 'texto' | 'numero' = 'texto') {
    const valor = campo === 'profundidade' ? formulario.profundidade ?? formulario.comprimento : formulario[campo];
    const somenteLeitura = ehConjunto && campo === 'codigo_fabricante';
    return (
      <label key={campo}>
        {rotulo}
        <input
          type={tipo === 'numero' ? 'number' : 'text'}
          value={String(valor ?? '')}
          readOnly={somenteLeitura}
          onChange={(e) => {
            const valorEditado = tipo === 'numero' && e.target.value !== '' ? Number(e.target.value) : e.target.value;
            setFormulario({
              ...formulario,
              [campo]: valorEditado,
              ...(campo === 'modelo' && ehConjunto
                ? {
                  codigo_fabricante: valorEditado,
                  fiscal_comercial: {
                    ...(formulario.fiscal_comercial ?? {}),
                    Identificacao: {
                      ...((formulario.fiscal_comercial?.Identificacao ?? {}) as RegistroGenerico),
                      modelo_alfa_numerico: valorEditado
                    }
                  }
                }
                : {}),
              ...(campo === 'profundidade' ? { comprimento: e.target.value !== '' ? Number(e.target.value) : '' } : {})
            });
          }}
        />
      </label>
    );
  }

  return (
    <section className="painelTabela pimProdutoShell">
            <header className={editorAberto ? 'pimListaCabecalhoOculto' : undefined}>
        <div>
          <span>Cadastro mestre</span>
          <h2>{titulo}</h2>
          <p>{descricaoTela}</p>
        </div>
        {!editorAberto && <div className="acoesDetalhe">
          <button className="ghost" onClick={() => abrirProduto()}><PackageSearch size={15} />{ehConjunto ? 'Novo conjunto' : 'Novo produto base'}</button>
          <button className="ghost" onClick={exportar}>Exportar</button>
        </div>}
      </header>
      {!editorAberto && <div className="filtrosLinha">
        <input placeholder="Buscar por codigo ERP, EAN, GTIN, modelo, marca ou nome" value={busca} onChange={(evento) => setBusca(evento.target.value)} />
        <select value={status} onChange={(evento) => setStatus(evento.target.value)}>
          <option value="">Todos os status</option>
          {['RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'PUBLICADO', 'REJEITADO', 'ARQUIVADO'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="ghost" onClick={carregar}>Filtrar</button>
        <button className="ghost" onClick={() => { setBusca(''); setStatus(''); setTimeout(() => carregar(), 0); }}>Limpar filtros</button>
      </div>}

      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {!editorAberto && (
                  <TabelaPimCompacta
            titulo={titulo}
            nomeArquivo={`pim-${titulo.toLowerCase()}`}
            linhas={linhas}
            colunas={['codigo_erp_decis', 'codigo_fabricante', 'ean_gtin', 'gtin', 'nome_comercial', 'marca', 'modelo', 'categoria', 'tipo_produto', 'status', 'score_completude', 'alterado_em']}
            onRowDoubleClick={ehConjunto ? (linha) => { void abrirProduto(linha); } : undefined}
            vazio="Nenhum produto encontrado."

          renderAcoes={(linha) => (
            <>
              <button className="ghost" onClick={() => abrirProduto(linha)}>Abrir</button>
              <button className="ghost" onClick={() => duplicarLinha(linha)}>Duplicar</button>
              <button className="ghost" onClick={() => alterarStatus(Number(linha.id), 'AGUARDANDO_APROVACAO')}>Enviar</button>
              <button className="ghost" onClick={() => alterarStatus(Number(linha.id), 'ARQUIVADO')}>Arquivar</button>
              <button className="ghost" onClick={() => restaurarLinha(linha)}>Restaurar</button>
              <button className="danger" onClick={() => excluirProdutoPim(Number(linha.id)).then(carregar)}>Excluir</button>
            </>
          )}
        />
      )}
      {editorAberto && (
        <form onSubmit={salvar}>
                    <div className="pimProdutoHeader">
            <div className="pimProdutoIdentidade">
              <button type="button" className="ghost pimProdutoVoltarTopo" onClick={() => setEditorAberto(false)}><ChevronLeft size={15} />Voltar à lista de {ehConjunto ? 'Conjuntos' : 'Produtos'}</button>
              <span>{String(formulario.codigo_erp_decis || 'Novo cadastro')}</span>
              <h3>{String(formulario.nome_comercial || formulario.modelo || 'Cadastro mestre')}</h3>
              <p>{String(formulario.marca ?? 'Marca')} - {String(ROTULOS_TIPOS_CLIMATIZACAO[String(formulario.tipo_produto)] ?? formulario.tipo_produto ?? tipoPadrao)} - {String(formulario.status ?? 'RASCUNHO')}</p>
              {ehConjunto && formulario.id && <button type="button" className="ghost" onClick={abrirEnriquecimentoProduto}><Sparkles size={15} />Abrir Enriquecimento deste Conjunto</button>}
            </div>

            <div className="pimScoreBox">
              <span>Completude</span>
              <strong>{String(formulario.score_completude ?? 0)}%</strong>
              <small>{pendencias.length ? `${pendencias.length} pendencias` : 'Sem pendencias criticas'}</small>
            </div>
          </div>
          <div className="abasCotacao pimAbas">
            {abasProduto.map((item) => <button type="button" key={item} className={abaProduto === item ? 'active' : ''} onClick={() => setAbaProduto(item)}>{item}</button>)}
          </div>
          <section className="abaPainel pimAbaProduto">
            {abaProduto === 'Identificacao' && (
              <>
                <div className="formCadastro pimFormProduto semBorda">
                  {CAMPOS_IDENTIFICACAO_PRODUTO_BASE.map((campo) => campoProduto(campo))}
                  {CAMPOS_IDENTIFICACAO_OPERACIONAL.map((campo) => campoOperacional(campo))}
                  {[
                    ['nome_interno', 'Nome interno'],
                    ['linha', 'Linha'],
                    ['familia', 'Familia'],
                    ['subcategoria', 'Subcategoria'],
                    ['cest', 'CEST'],
                    ['garantia', 'Garantia'],
                    ['observacoes', 'Observacoes']
                  ].map((campo) => campoProduto(campo))}
                <label>{ehConjunto ? 'Tipo de equipamento vendido' : 'Tipo de unidade / materia-prima'}<select value={String(formulario.tipo_produto ?? tipoPadrao)} onChange={(e) => setFormulario({ ...formulario, tipo_produto: e.target.value })}>{tiposPermitidos.map((item) => <option key={item} value={item}>{ROTULOS_TIPOS_CLIMATIZACAO[item] ?? item}</option>)}</select></label>
                  <label>Status<select value={String(formulario.status ?? 'RASCUNHO')} onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}>{['RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'PUBLICADO', 'REJEITADO', 'ARQUIVADO'].map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>Origem<input value={String(formulario.origem ?? 'MANUAL')} onChange={(e) => setFormulario({ ...formulario, origem: e.target.value })} /></label>
                </div>
                {modo === 'conjuntos' && (
                  <div className="pimBlocoInterno">
                    <div className="pimBlocoTopo">
                      <h4>Conferencia com IA</h4>
                      <button type="button" className="ghost" onClick={compararComIa}><Sparkles size={15} />Comparar referencias</button>
                    </div>
                    <div className="formCadastro semBorda">
                      <label className="campoLargo">Referencia do anuncio / concorrente<input value={referenciaIa} onChange={(e) => setReferenciaIa(e.target.value)} placeholder="S3UW24K231A.EB2GAM1 | S3NW24K231A.EB2GAM1" /></label>
                      <label className="campoLargo">Modelo<input value={String(formulario.modelo ?? formulario.fiscal_comercial?.Identificacao?.modelo_alfa_numerico ?? '')} readOnly placeholder="Preenchido pelo Codigo do Fabricante da planilha ERP" /></label>
                      <label className="campoLargo">Fonte prioritaria<input value={siteIa} onChange={(e) => setSiteIa(e.target.value)} /></label>
                    </div>
                    {resultadoIa && <>
                      {resultadoIa.confiabilidade && <div className="pimScoreBox" style={{ marginBottom: 12 }}>
                        <span>Confiabilidade da chave normalizada</span>
                        <strong>{String(resultadoIa.confiabilidade.correspondencias ?? 0)}/{String(resultadoIa.confiabilidade.total ?? 0)} ({String(resultadoIa.confiabilidade.percentual ?? 0)}%)</strong>
                        <small>{resultadoIa.confiabilidade.exata ? 'Match exato em verde: maior confiabilidade.' : 'Match parcial: revise os componentes e o anuncio.'}</small>
                      </div>}
                      <TabelaPimCompacta linhas={(resultadoIa.comparacao as RegistroGenerico[]) ?? []} colunas={['campo', 'valor_cadastro', 'valor_ia', 'valor_escolhido', 'diferente']} vazio="Nenhuma comparacao gerada." />
                    </>}
                  </div>
                )}
              </>
            )}
            {abaProduto === 'Estrutura' && (
              <div className="pimGridDuplo">
                <article><span>Estrutura de climatizacao</span><p>Produtos do tipo conjunto podem agrupar evaporadora, condensadora, controle, kit e acessorios com vinculo muitos-para-muitos.</p></article>
                <article><span>Dimensoes</span><div className="formCadastro semBorda">{[
                  ['peso', 'Peso'],
                  ['altura', 'Altura'],
                  ['largura', 'Largura'],
                  ['profundidade', 'Profundidade']
                ].map(([campo, rotulo]) => <label key={campo}>{rotulo}<input type="number" value={String(formulario[campo] ?? (campo === 'profundidade' ? formulario.comprimento : '') ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo]: Number(e.target.value), ...(campo === 'profundidade' ? { comprimento: Number(e.target.value) } : {}) })} /></label>)}</div></article>
              </div>
            )}
            {abaProduto === 'Produtos vinculados' && (
              <>
                <div className="formCadastro semBorda">
                  <label>Tipo de vinculo<select value={String(linhaComponente.tipo_relacao ?? 'EVAPORADORA')} onChange={(e) => setLinhaComponente({ ...linhaComponente, tipo_relacao: e.target.value })}>{['EVAPORADORA', 'CONDENSADORA', 'CONTROLE_REMOTO', 'KIT_INSTALACAO', 'ACESSORIO', 'OUTRO'].map((item) => <option key={item} value={item}>{ROTULOS_TIPOS_CLIMATIZACAO[item] ?? item}</option>)}</select></label>
                  <label>Codigo<input value={String(linhaComponente.codigo ?? '')} onChange={(e) => setLinhaComponente({ ...linhaComponente, codigo: e.target.value })} /></label>
                  <label>Nome<input value={String(linhaComponente.nome ?? '')} onChange={(e) => setLinhaComponente({ ...linhaComponente, nome: e.target.value })} /></label>
                  <label>Ordem<input type="number" value={String(linhaComponente.ordem ?? 0)} onChange={(e) => setLinhaComponente({ ...linhaComponente, ordem: Number(e.target.value) })} /></label>
                  <label>Quantidade<input type="number" value={String(linhaComponente.quantidade ?? 1)} onChange={(e) => setLinhaComponente({ ...linhaComponente, quantidade: Number(e.target.value) })} /></label>
                  <label>Obrigatorio<input type="checkbox" checked={Boolean(linhaComponente.obrigatorio)} onChange={(e) => setLinhaComponente({ ...linhaComponente, obrigatorio: e.target.checked })} /></label>
                  <label>Observacao<input value={String(linhaComponente.observacao ?? '')} onChange={(e) => setLinhaComponente({ ...linhaComponente, observacao: e.target.value })} /></label>
                  <button type="button" className="ghost" onClick={adicionarComponente}>Vincular produto</button>
                </div>
                <TabelaPimCompacta titulo="Produtos vinculados" nomeArquivo="pim-produtos-vinculados" linhas={detalhe.componentes ?? []} colunas={['tipo_relacao', 'codigo', 'nome', 'ordem', 'quantidade', 'obrigatorio', 'observacao']} />
              </>
            )}
            {abaProduto === 'Atributos Tecnicos' && (
              <>
                <div className="formCadastro semBorda">
                  <label>Atributo<select value={String(linhaAtributo.attribute_id ?? '')} onChange={(e) => setLinhaAtributo({ ...linhaAtributo, attribute_id: Number(e.target.value) })}><option value="">Selecione</option>{atributosDisponiveis.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome_exibido)} - {String(item.escopo)}</option>)}</select></label>
                  <label>Valor<input value={String(linhaAtributo.valor_texto ?? linhaAtributo.valor_numero ?? '')} onChange={(e) => setLinhaAtributo({ ...linhaAtributo, valor_texto: e.target.value })} /></label>
                  <button type="button" className="ghost" onClick={adicionarAtributo}>Adicionar atributo</button>
                </div>
                <TabelaPimCompacta linhas={detalhe.atributos ?? []} colunas={['grupo_nome', 'nome_exibido', 'codigo', 'escopo', 'tipo_campo', 'valor_texto', 'valor_numero']} />
              </>
            )}
            {abaProduto === 'Logistica' && (
              <div className="formCadastro pimFormProduto semBorda">
                {CAMPOS_LOGISTICA_PRODUTO_BASE.map((campo) => campoProduto(campo, 'numero'))}
                {CAMPOS_LOGISTICA_OPERACIONAL.map((campo) => campoOperacional(campo))}
              </div>
            )}
            {abaProduto === 'Comercial' && (
              <div className="formCadastro pimFormProduto semBorda">
                {CAMPOS_COMERCIAL_OPERACIONAL.map((campo) => campoOperacional(campo))}
                <label>Moeda<input value={String(formulario.fiscal_comercial?.moeda ?? 'BRL')} onChange={(e) => setFormulario({ ...formulario, fiscal_comercial: { ...(formulario.fiscal_comercial ?? {}), moeda: e.target.value } })} /></label>
              </div>
            )}
            {abaProduto === 'Estoque / Controle' && (
              <div className="formCadastro pimFormProduto semBorda">
                {CAMPOS_ESTOQUE_OPERACIONAL.map((campo) => campoOperacional(campo))}
                {CAMPOS_CONTROLE_OPERACIONAL.map((campo) => campoOperacional(campo))}
              </div>
            )}
            {abaProduto === 'SEO' && (
              <div className="formCadastro pimFormProduto semBorda">
                {[
                  ['meta_title', 'Meta Title'], ['meta_description', 'Meta Description'], ['slug', 'Slug'], ['descricao_curta', 'Descricao curta'], ['descricao_longa', 'Descricao longa'], ['bullet_points', 'Bullet Points'], ['palavras_chave', 'Palavras-chave']
                ].map(([campo, rotulo]) => <label key={campo}>{rotulo}<input value={Array.isArray(formulario[campo]) ? formulario[campo].join('\n') : String(formulario[campo] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })} /></label>)}
                <button type="button" className="ghost" onClick={sugerirSeo}><Sparkles size={15} />Sugerir com IA</button>
              </div>
            )}
            {abaProduto === 'Imagens e Documentos' && (
              <>
                <div className="pimBlocoInterno">
                  <div className="pimBlocoTopo">
                    <h4>Vincular imagens e documentos</h4>
                    <div className="acoesDetalhe">
                      <button type="button" className="ghost" onClick={carregarBibliotecaAssets}>Buscar</button>
                      <button type="button" className="primary" onClick={vincularAssetsSelecionados}>Vincular selecionados</button>
                    </div>
                  </div>
                  <div className="formCadastro semBorda">
                    <label className="campoLargo">Buscar na biblioteca<input placeholder="Nome, marca, modelo ou tag" value={buscaAsset} onChange={(e) => setBuscaAsset(e.target.value)} /></label>
                    <label>Definir como principal<input type="checkbox" checked={assetPrincipal} onChange={(e) => setAssetPrincipal(e.target.checked)} /></label>
                  </div>
                  <div className="pimAssetsConjunto">
                    {bibliotecaAssets.map((asset) => {
                      const id = Number(asset.id);
                      const marcado = assetsSelecionados.includes(id);
                      return (
                        <article key={String(asset.id)} className={marcado ? 'selecionado' : ''}>
                          {String(asset.tipo ?? '').includes('IMAGEM') && asset.url ? <img src={String(asset.url)} alt={String(asset.texto_alternativo ?? asset.nome ?? 'Imagem')} /> : <div className="pimAssetArquivo">Arquivo</div>}
                          <strong>{String(asset.nome ?? 'Asset')}</strong>
                          <span>{String(asset.tipo ?? '-')}</span>
                          <button type="button" className={marcado ? 'primary' : 'ghost'} onClick={() => setAssetsSelecionados(marcado ? assetsSelecionados.filter((item) => item !== id) : [...assetsSelecionados, id])}>
                            {marcado ? 'Selecionado' : 'Selecionar'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
                <div className="pimAssetsConjunto">
                  {(detalhe.assets ?? []).map((asset: RegistroGenerico, indice: number) => (
                    <article key={String(asset.id ?? `${asset.nome ?? 'asset'}-${indice}`)}>
                      {String(asset.tipo ?? '').includes('IMAGEM') && asset.url ? <img src={String(asset.url)} alt={String(asset.alt_text ?? asset.nome ?? 'Imagem do conjunto')} /> : <div className="pimAssetArquivo">Arquivo</div>}
                      <strong>{String(asset.nome ?? 'Asset sem nome')}</strong>
                      <span>{String(asset.tipo ?? '-')}</span>
                      {asset.principal && <small>Imagem principal</small>}
                      {asset.id && <button type="button" className="danger" onClick={() => desvincularAsset(Number(asset.id))}>Desvincular</button>}
                    </article>
                  ))}
                  {(detalhe.assets ?? []).length === 0 && <p>Nenhuma imagem ou documento vinculado ao cadastro.</p>}
                </div>
                <TabelaPimCompacta linhas={detalhe.assets ?? []} colunas={['nome', 'tipo', 'url', 'alt_text', 'principal', 'status']} vazio="Nenhum asset vinculado. Use a biblioteca Imagens e Documentos para upload multiplo e vinculo." />
              </>
            )}
            {abaProduto === 'Plataformas' && <TabelaPimCompacta linhas={detalhe.canais ?? []} colunas={['canal_nome', 'status', 'score_completude', 'campos_faltantes', 'ultima_validacao_em']} vazio="Salve o produto para calcular o score por plataforma." />}
            {abaProduto === 'Workflow' && (
              <div className="workflowAcoes">
                {['RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'PUBLICADO', 'REJEITADO', 'ARQUIVADO'].map((item) => <button type="button" className={formulario.status === item ? 'primary' : 'ghost'} key={item} onClick={() => formulario.id ? alterarStatus(Number(formulario.id), item) : setFormulario({ ...formulario, status: item })}>{item}</button>)}
                                <div className="comparacaoCadastro">
                  <strong>Cadastro paralelo e concorrentes</strong>
                  {comparacoesConcorrentes.length ? <TabelaPimCompacta linhas={comparacoesConcorrentes} colunas={['fonte_nome', 'titulo', 'chave_original', 'chave_normalizada', 'confiabilidade', 'status', 'anuncio_url']} /> : <TabelaPimCompacta linhas={[{ campo: 'Modelo Alfa Numerico', valor_a: formulario.fiscal_comercial?.Identificacao?.modelo_alfa_numerico ?? '-', valor_b: '-', valor_oficial: formulario.fiscal_comercial?.Identificacao?.modelo_alfa_numerico ?? '-', valor_escolhido: formulario.fiscal_comercial?.Identificacao?.modelo_alfa_numerico ?? '-', comentario: 'Cadastre os anuncios na tela Concorrentes / Comparacao.' }]} colunas={['campo', 'valor_a', 'valor_b', 'valor_oficial', 'valor_escolhido', 'comentario']} />}
                </div>

              </div>
            )}
            {abaProduto === 'Historico' && <TabelaPimCompacta linhas={detalhe.historico ?? []} colunas={['criado_em', 'campo', 'valor_anterior', 'valor_novo', 'origem', 'usuario_nome']} />}
          </section>
          <div className="rodapeAcoes">
            <button type="button" className="ghost" onClick={() => setEditorAberto(false)}>Voltar a lista</button>
            <div className="acoesDetalhe">
              <button type="submit" className="primary"><PackageSearch size={15} />Salvar</button>
              <button type="button" className="ghost" onClick={() => formulario.id ? alterarStatus(Number(formulario.id), 'AGUARDANDO_APROVACAO') : setFormulario({ ...formulario, status: 'AGUARDANDO_APROVACAO' })}><BadgeCheck size={15} />Enviar</button>
              <button type="button" className="ghost" onClick={() => salvar()}><ListChecks size={15} />Validar cadastro</button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

function valorCelulaTabela(valor: unknown) {
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'object' && valor !== null) return JSON.stringify(valor);
  return String(valor ?? '-');
}

function exportarTabelaExcel(nomeArquivo: string, linhas: RegistroGenerico[], colunas: string[]) {
  const cabecalho = colunas.map(rotuloColunaPim).join(';');
  const corpo = linhas.map((linha) => colunas.map((coluna) => `"${valorCelulaTabela(linha[coluna]).replace(/"/g, '""')}"`).join(';'));
  const blob = new Blob([`\uFEFF${[cabecalho, ...corpo].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function rotuloColunaPim(coluna: string) {
  const rotulos: Record<string, string> = {
    codigo_erp_decis: 'codigo_erp',
    comprimento: 'profundidade',
    profundidade: 'profundidade',
    nome_exibido: 'nome',
    ordem_exibicao: 'ordem'
  };
  return rotulos[coluna] ?? coluna.replace(/_/g, ' ');
}

function TabelaPimCompacta({
  linhas,
  colunas,
  vazio = 'Nenhum registro encontrado.',
  titulo = 'Registros',
  nomeArquivo = 'pim-exportacao',
  renderAcoes,
  onRowDoubleClick
}: {
  linhas: RegistroGenerico[];
  colunas: string[];
  vazio?: string;
  titulo?: string;
  nomeArquivo?: string;
  renderAcoes?: (linha: RegistroGenerico) => ReactNode;
  onRowDoubleClick?: (linha: RegistroGenerico) => void;
}) {
  const [pagina, setPagina] = useState(1);
  const [filtro, setFiltro] = useState('');
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(colunas);
  const [largurasColunas, setLargurasColunas] = useState<Record<string, number>>({});
  const porPagina = 100;
  const colunasAtivas = colunasVisiveis.filter((coluna) => colunas.includes(coluna));
  const termo = filtro.trim().toLowerCase();
  const filtradas = termo
    ? linhas.filter((linha) => colunas.some((coluna) => valorCelulaTabela(linha[coluna]).toLowerCase().includes(termo)))
    : linhas;
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const linhasPagina = filtradas.slice(inicio, inicio + porPagina);

  useEffect(() => {
    setColunasVisiveis((atuais) => {
      const validas = atuais.filter((coluna) => colunas.includes(coluna));
      return validas.length ? validas : colunas;
    });
    setPagina(1);
  }, [colunas.join('|'), linhas.length]);

  function iniciarResizeColuna(coluna: string, evento: ReactMouseEvent<HTMLSpanElement>) {
    evento.preventDefault();
    evento.stopPropagation();
    const inicioX = evento.clientX;
    const atual = (evento.currentTarget.parentElement as HTMLElement | null)?.offsetWidth ?? largurasColunas[coluna] ?? 160;
    const aoMover = (movimento: MouseEvent) => {
      const largura = Math.max(80, Math.min(720, atual + movimento.clientX - inicioX));
      setLargurasColunas((larguras) => ({ ...larguras, [coluna]: largura }));
    };
    const aoSoltar = () => {
      window.removeEventListener('mousemove', aoMover);
      window.removeEventListener('mouseup', aoSoltar);
    };
    window.addEventListener('mousemove', aoMover);
    window.addEventListener('mouseup', aoSoltar);
  }

  return (
    <div className="pimGridDados">
      <div className="pimGridTopo">
        <div>
          <strong>{titulo}</strong>
          <span>Total: {linhas.length} | Filtrado: {filtradas.length} | Pagina: {paginaAtual}/{totalPaginas}</span>
        </div>
        <div className="pimGridAcoes">
          <input placeholder="Filtrar grid" value={filtro} onChange={(e) => { setFiltro(e.target.value); setPagina(1); }} />
          <button type="button" className="ghost" onClick={() => exportarTabelaExcel(nomeArquivo, filtradas, colunasAtivas)}>Exportar Excel</button>
        </div>
      </div>
      <details className="pimColunasGrid">
        <summary>Colunas</summary>
        <div>
          {colunas.map((coluna) => (
            <label key={coluna}>
              <input
                type="checkbox"
                checked={colunasAtivas.includes(coluna)}
                onChange={(e) => {
                  setColunasVisiveis((atuais) => e.target.checked ? [...new Set([...atuais, coluna])] : atuais.filter((item) => item !== coluna));
                  setPagina(1);
                }}
              />
              {rotuloColunaPim(coluna)}
            </label>
          ))}
        </div>
      </details>
      <div className="tabelaWrap">
        <table>
          <thead><tr>{colunasAtivas.map((coluna) => <th key={coluna} className="pimThRedimensionavel" style={{ width: largurasColunas[coluna] ? `${largurasColunas[coluna]}px` : undefined, minWidth: largurasColunas[coluna] ? `${largurasColunas[coluna]}px` : undefined }}><span>{rotuloColunaPim(coluna)}</span><span className="pimColResizeHandle" onMouseDown={(evento) => iniciarResizeColuna(coluna, evento)} title="Arraste para ajustar a largura" /></th>)}{renderAcoes && <th>Acoes</th>}</tr></thead>
          <tbody>
            {linhasPagina.map((linha, indice) => (
              <tr key={String(linha.id ?? `${paginaAtual}-${indice}`)} className={onRowDoubleClick ? 'pimGridLinhaInterativa' : undefined} onDoubleClick={() => onRowDoubleClick?.(linha)} title={onRowDoubleClick ? 'Duplo clique para abrir e editar' : undefined}>
                {colunasAtivas.map((coluna) => <td key={coluna}><span className="pimCelulaCortada" title={valorCelulaTabela(linha[coluna])}>{valorCelulaTabela(linha[coluna])}</span></td>)}
                {renderAcoes && <td className="acoesTabela">{renderAcoes(linha)}</td>}
              </tr>
            ))}
            {linhasPagina.length === 0 && <tr><td colSpan={colunasAtivas.length + (renderAcoes ? 1 : 0)}>{vazio}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="paginacaoGrid">
        <button type="button" className="ghost" disabled={paginaAtual <= 1} onClick={() => setPagina(1)}>Primeira</button>
        <button type="button" className="ghost" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button>
        <span>{inicio + 1}-{Math.min(inicio + porPagina, filtradas.length)} de {filtradas.length}</span>
        <button type="button" className="ghost" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Proxima</button>
        <button type="button" className="ghost" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(totalPaginas)}>Ultima</button>
      </div>
    </div>
  );
}

const CAMPOS_IMPORTACAO_PIM = [
  'codigo_erp_decis',
  'codigo_fabricante',
  'ean_gtin',
  'gtin',
  'mpn',
  'nome_interno',
  'nome_comercial',
  'marca',
  'linha',
  'modelo',
  'familia',
  'categoria',
  'subcategoria',
  'tipo_produto',
    'status',
  'ncm',
  'cest',
  'peso',

  'peso_bruto',
  'altura',
  'largura',
  'profundidade',
  'unidade_medida',
  'ciclo',
  'tensao',
  'tipo_capacidade',
  'btu',
  'tecnologia',
  'origem',
  'garantia',
  'observacoes',
  'ultima_alteracao'
];

const GRUPOS_OPERACIONAIS_MONVIZO = [
  ['Identificacao', 'marca_completa', 'Marca completa'],
  ['Identificacao', 'codigo_modelo', 'Codigo do modelo'],
  ['Identificacao', 'volume', 'Volume'],
    ['Identificacao', 'modelo_alfa_numerico', 'Modelo']
,
  ['Logistica', 'altura_embalado', 'Altura embalado'],
  ['Logistica', 'largura_embalado', 'Largura embalado'],
  ['Logistica', 'profundidade_embalado', 'Profundidade embalado'],
  ['Logistica', 'peso_liquido', 'Peso liquido'],
  ['Comercial', 'venda_padrao', 'Venda padrao'],
  ['Comercial', 'venda_cartao', 'Venda cartao'],
  ['Comercial', 'venda_a_vista', 'Venda a vista'],
  ['Comercial', 'cff', 'CFF - Custo de aquisicao'],
  ['Comercial', 'cffuso', 'CFFUSO - Custo estimado'],
  ['Estoque', 'disp', 'Disponivel'],
  ['Estoque', 'fis', 'Fisico'],
  ['Estoque', 'res', 'Reservado'],
  ['Controle', 'ultima_alteracao', 'Ultima alteracao']
].map(([grupo, campo, nome]) => ({
  grupo,
  campo,
  nome,
  destino: `GRUPO::${grupo}::${campo}`
}));

function grupoOperacionalMonvizo(grupo: string, campo: string) {
  return GRUPOS_OPERACIONAIS_MONVIZO.find((item) => item.grupo === grupo && item.campo === campo)?.destino ?? '';
}

const CAMPOS_IDENTIFICACAO_PRODUTO_BASE = [
  ['codigo_erp_decis', 'ITEM / Codigo ERP'],
  ['nome_comercial', 'DESCRICAO / Nome comercial'],
  ['codigo_fabricante', 'REFERENCIA / Codigo do Fabricante'],
  ['marca', 'MARCA'],
  ['modelo', 'MODELO'],
  ['categoria', 'CATEGORIA'],
  ['ncm', 'CODIGO_NCM'],
  ['ean_gtin', 'EAN'],
  ['gtin', 'GTIN'],
  ['mpn', 'MPN']
];

const CAMPOS_IDENTIFICACAO_OPERACIONAL = [
  ['Identificacao', 'marca_completa', 'MARCA_COMPLETA'],
  ['Identificacao', 'codigo_modelo', 'CODIGO_MODELO'],
  ['Identificacao', 'volume', 'VOLUME'],
];

const CAMPOS_LOGISTICA_PRODUTO_BASE = [
  ['altura', 'ALTURA'],
  ['largura', 'LARGURA'],
  ['profundidade', 'PROFUNDIDADE'],
  ['peso', 'PESO']
];

const CAMPOS_LOGISTICA_OPERACIONAL = [
  ['Logistica', 'altura_embalado', 'ALTURA_EMBALADO'],
  ['Logistica', 'largura_embalado', 'LARGURA_EMBALADO'],
  ['Logistica', 'profundidade_embalado', 'PROFUNDIDADE_EMBALADO'],
  ['Logistica', 'peso_liquido', 'PESO_LIQUIDO']
];

const CAMPOS_COMERCIAL_OPERACIONAL = [
  ['Comercial', 'venda_padrao', 'VENDA_PADRAO'],
  ['Comercial', 'venda_cartao', 'VENDA_CARTAO'],
  ['Comercial', 'venda_a_vista', 'VENDA_A_VISTA'],
  ['Comercial', 'cff', 'CFF - Custo de aquisicao'],
  ['Comercial', 'cffuso', 'CFFUSO - Custo estimado']
];

const CAMPOS_ESTOQUE_OPERACIONAL = [
  ['Estoque', 'disp', 'DISP'],
  ['Estoque', 'fis', 'FIS'],
  ['Estoque', 'res', 'RES']
];

const CAMPOS_CONTROLE_OPERACIONAL = [
  ['Controle', 'ultima_alteracao', 'ULTIMA_ALTERACAO']
];

const DEPARA_OPERACIONAL_MONVIZO_POR_COLUNA: Record<string, string> = {
  marca_completa: grupoOperacionalMonvizo('Identificacao', 'marca_completa'),
  marcacompleta: grupoOperacionalMonvizo('Identificacao', 'marca_completa'),
  codigo_modelo: grupoOperacionalMonvizo('Identificacao', 'codigo_modelo'),
  codigomodelo: grupoOperacionalMonvizo('Identificacao', 'codigo_modelo'),
  cod_modelo: grupoOperacionalMonvizo('Identificacao', 'codigo_modelo'),
  volume: grupoOperacionalMonvizo('Identificacao', 'volume'),
  modelo_alfa_numerico: grupoOperacionalMonvizo('Identificacao', 'modelo_alfa_numerico'),
  modeloalfanumerico: grupoOperacionalMonvizo('Identificacao', 'modelo_alfa_numerico'),
  modelo_alfa_num: grupoOperacionalMonvizo('Identificacao', 'modelo_alfa_numerico'),
  altura_embalado: grupoOperacionalMonvizo('Logistica', 'altura_embalado'),
  alturaembalado: grupoOperacionalMonvizo('Logistica', 'altura_embalado'),
  alt_embalado: grupoOperacionalMonvizo('Logistica', 'altura_embalado'),
  largura_embalado: grupoOperacionalMonvizo('Logistica', 'largura_embalado'),
  larguraembalado: grupoOperacionalMonvizo('Logistica', 'largura_embalado'),
  larg_embalado: grupoOperacionalMonvizo('Logistica', 'largura_embalado'),
  profundidade_embalado: grupoOperacionalMonvizo('Logistica', 'profundidade_embalado'),
  profundidadeembalado: grupoOperacionalMonvizo('Logistica', 'profundidade_embalado'),
  comprimento_embalado: grupoOperacionalMonvizo('Logistica', 'profundidade_embalado'),
  comprimentoembalado: grupoOperacionalMonvizo('Logistica', 'profundidade_embalado'),
  prof_embalado: grupoOperacionalMonvizo('Logistica', 'profundidade_embalado'),
  peso_liquido: grupoOperacionalMonvizo('Logistica', 'peso_liquido'),
  pesoliquido: grupoOperacionalMonvizo('Logistica', 'peso_liquido'),
  venda_padrao: grupoOperacionalMonvizo('Comercial', 'venda_padrao'),
  vendapadrao: grupoOperacionalMonvizo('Comercial', 'venda_padrao'),
  venda_cartao: grupoOperacionalMonvizo('Comercial', 'venda_cartao'),
  vendacartao: grupoOperacionalMonvizo('Comercial', 'venda_cartao'),
  venda_a_vista: grupoOperacionalMonvizo('Comercial', 'venda_a_vista'),
  vendaavista: grupoOperacionalMonvizo('Comercial', 'venda_a_vista'),
  venda_avista: grupoOperacionalMonvizo('Comercial', 'venda_a_vista'),
  cff: grupoOperacionalMonvizo('Comercial', 'cff'),
  cffuso: grupoOperacionalMonvizo('Comercial', 'cffuso'),
  disp: grupoOperacionalMonvizo('Estoque', 'disp'),
  fis: grupoOperacionalMonvizo('Estoque', 'fis'),
  res: grupoOperacionalMonvizo('Estoque', 'res'),
  ultima_alteracao: grupoOperacionalMonvizo('Controle', 'ultima_alteracao'),
  ultimaalteracao: grupoOperacionalMonvizo('Controle', 'ultima_alteracao')
};

const CAMPOS_SQLSERVER_POR_TIPO: Record<string, string[]> = {
  PRODUTOS_BASE: CAMPOS_IMPORTACAO_PIM,
  CONJUNTOS: CAMPOS_IMPORTACAO_PIM,
  PRODUTO_MESTRE: CAMPOS_IMPORTACAO_PIM,
  PRODUTOS_CONJUNTO: ['conjunto_codigo', 'item_codigo', 'item_nome', 'tipo_relacao', 'quantidade', 'ordem', 'obrigatorio', 'observacao', 'status', 'ultima_alteracao'],
  PRODUTOS_ITEM_CARACTERISTICAS: ['item_codigo', 'item_nome', 'atributo_codigo', 'atributo_nome', 'grupo_nome', 'tipo_campo', 'escopo', 'unidade_medida', 'valor_texto', 'valor_numero', 'valor_booleano', 'ordem', 'obrigatorio'],
  PRODUTOS_CJ_CARACTERISTICAS: ['conjunto_codigo', 'atributo_codigo', 'atributo_nome', 'grupo_nome', 'tipo_campo', 'escopo', 'unidade_medida', 'valor_texto', 'valor_numero', 'valor_booleano', 'ordem', 'obrigatorio'],
  SKU: ['produto_codigo', 'sku', 'tipo', 'status', 'sku_erp', 'sku_fornecedor', 'sku_marketplace', 'ean', 'codigo_fabricante', 'principal'],
  COMPOSICAO: ['conjunto_codigo', 'componente_codigo', 'componente_nome', 'tipo_relacao', 'quantidade', 'ordem', 'obrigatorio', 'observacao'],
  ATRIBUTOS_MARKETPLACE: ['canal_codigo', 'canal_nome', 'atributo_codigo', 'atributo_nome', 'atributo_canal_codigo', 'atributo_canal_nome', 'tipo_campo', 'escopo', 'obrigatorio', 'ordem', 'validacao']
};

const ATRIBUTOS_MONVIZO_CARGA = [
  ['TIPO_GAS', 'Tipo de gas', 'PRODUTO', 'TEXTO'],
  ['CAPACIDADE', 'Capacidade', 'PRODUTO', 'TEXTO'],
  ['CICLO', 'Ciclo', 'PRODUTO', 'TEXTO'],
  ['TIPO_TECNOLOGIA_COMPRESSOR', 'Tipo tecnologia compressor', 'PRODUTO', 'TEXTO'],
  ['TIPO_COMPRESSOR', 'Tipo compressor', 'PRODUTO', 'TEXTO'],
  ['TIPO_CONDENSADOR', 'Tipo condensador', 'PRODUTO', 'TEXTO'],
  ['POTENCIA_REFRIGERACAO', 'Potencia refrigeracao', 'PRODUTO', 'DECIMAL'],
  ['POTENCIA_AQUECIMENTO', 'Potencia aquecimento', 'PRODUTO', 'DECIMAL'],
  ['CORRENTE_ELETRICA_REFRIGERACAO', 'Corrente eletrica refrigeracao', 'PRODUTO', 'DECIMAL'],
  ['CORRENTE_ELETRICA_AQUECIMENTO', 'Corrente eletrica aquecimento', 'PRODUTO', 'DECIMAL'],
  ['CORRENTE', 'Corrente eletrica', 'PRODUTO', 'DECIMAL'],
  ['SEER', 'SEER', 'PRODUTO', 'DECIMAL'],
  ['EER', 'EER', 'PRODUTO', 'DECIMAL'],
  ['EFICIENCIA_ENERGETICA', 'Eficiencia energetica', 'PRODUTO', 'TEXTO'],
  ['CLASSIFICACAO_ENERGETICA', 'Classificacao energetica', 'PRODUTO', 'TEXTO'],
  ['CONSUMO_ENERGIA_PROCEL', 'Consumo energia PROCEL', 'PRODUTO', 'DECIMAL'],
  ['VAZAO_AR', 'Vazao de ar', 'PRODUTO', 'DECIMAL'],
  ['NIVEL_RUIDO_INTERNO', 'Nivel ruido interno', 'PRODUTO', 'DECIMAL'],
  ['NIVEL_RUIDO_EXTERNO', 'Nivel ruido externo', 'PRODUTO', 'DECIMAL'],
  ['CONTROLE_REMOTO_ILUMINADO', 'Controle remoto iluminado', 'PRODUTO', 'BOOLEANO'],
  ['WIFI', 'Wi-Fi', 'PRODUTO', 'BOOLEANO'],
  ['COR', 'Cor', 'PRODUTO', 'TEXTO'],
  ['TIMER', 'Timer', 'PRODUTO', 'BOOLEANO'],
  ['SLEEP', 'Sleep', 'PRODUTO', 'BOOLEANO'],
  ['SWING', 'Swing', 'PRODUTO', 'BOOLEANO'],
  ['TURBO', 'Turbo', 'PRODUTO', 'BOOLEANO'],
  ['MEMORIA', 'Memoria', 'PRODUTO', 'BOOLEANO'],
  ['AVISO_LIMPA_FILTRO', 'Aviso limpa filtro', 'PRODUTO', 'BOOLEANO'],
  ['FILTRO_ANTIBACTERIA', 'Filtro antibacteria', 'PRODUTO', 'BOOLEANO'],
  ['DESUMIDIFICACAO', 'Desumidificacao', 'PRODUTO', 'BOOLEANO'],
  ['FUNCAO_BRISA', 'Funcao brisa', 'PRODUTO', 'BOOLEANO'],
  ['CONTROLE_DIRECAO_AR', 'Controle direcao ar', 'PRODUTO', 'BOOLEANO'],
  ['INDICADOR_TEMPERATURA', 'Indicador temperatura', 'PRODUTO', 'BOOLEANO'],
  ['REGULA_VELOCIDADE_VENTILACAO', 'Regula velocidade ventilacao', 'PRODUTO', 'BOOLEANO'],
  ['ALIMENTACAO', 'Alimentacao', 'PRODUTO', 'TEXTO'],
  ['FREQUENCIA', 'Frequencia', 'PRODUTO', 'TEXTO'],
  ['FASE', 'Fase', 'PRODUTO', 'TEXTO'],
  ['DISJUNTOR', 'Disjuntor', 'PRODUTO', 'TEXTO'],
  ['CONEXAO_TUBULACAO_LIQUIDO', 'Conexao tubulacao liquido', 'PRODUTO', 'TEXTO'],
  ['CONEXAO_TUBULACAO_GAS', 'Conexao tubulacao gas', 'PRODUTO', 'TEXTO'],
  ['DISTANCIA_MAXIMA_TUBULACAO', 'Distancia maxima tubulacao', 'PRODUTO', 'DECIMAL'],
  ['DESNIVEL_MAXIMO_TUBULACAO', 'Desnivel maximo tubulacao', 'PRODUTO', 'DECIMAL'],
  ['AREA_APLICACAO', 'Area aplicacao', 'PRODUTO', 'DECIMAL'],
  ['MATERIAL_SERPENTINA', 'Material serpentina', 'PRODUTO', 'TEXTO'],
  ['MATERIAL_GABINETE', 'Material gabinete', 'PRODUTO', 'TEXTO'],
  ['MATERIAL_GABINETE_CONDENSADORA', 'Material gabinete condensadora', 'PRODUTO', 'TEXTO'],
  ['MATERIAL_SERPENTINA_CONDENSADORA', 'Material serpentina condensadora', 'PRODUTO', 'TEXTO'],
  ['MATERIAIS', 'Materiais', 'PRODUTO', 'TEXTO'],
  ['TUBULACAO', 'Tubulacao', 'PRODUTO', 'TEXTO'],
  ['PROTECAO_ANTICORROSAO', 'Protecao anticorrosao', 'PRODUTO', 'BOOLEANO']
].map(([codigo, nome, escopo, tipo]) => ({
  codigo,
  nome,
  escopo,
  tipo,
  destino: `ATRIBUTO_AUTO::${codigo}::${nome}::${escopo}::${tipo}`
}));

function atributoMonvizo(codigo: string) {
  return ATRIBUTOS_MONVIZO_CARGA.find((item) => item.codigo === codigo)?.destino ?? '';
}

const DEPARA_ATRIBUTO_MONVIZO_POR_COLUNA: Record<string, string> = ATRIBUTOS_MONVIZO_CARGA.reduce<Record<string, string>>((acc, atributo) => {
  acc[normalizarTextoPim(atributo.codigo)] = atributo.destino;
  acc[normalizarTextoPim(atributo.nome)] = atributo.destino;
  return acc;
}, {
  gas: atributoMonvizo('TIPO_GAS'),
  gas_refrigerante: atributoMonvizo('TIPO_GAS'),
  tipogas: atributoMonvizo('TIPO_GAS'),
  capacidade_comercial: atributoMonvizo('CAPACIDADE'),
  tipocapacidade: atributoMonvizo('CAPACIDADE'),
  tecnologia: atributoMonvizo('TIPO_TECNOLOGIA_COMPRESSOR'),
  tecnologia_compressor: atributoMonvizo('TIPO_TECNOLOGIA_COMPRESSOR'),
  inverter: atributoMonvizo('TIPO_TECNOLOGIA_COMPRESSOR'),
  consumo: atributoMonvizo('CONSUMO_ENERGIA_PROCEL'),
  consumo_energia: atributoMonvizo('CONSUMO_ENERGIA_PROCEL'),
  ruido: atributoMonvizo('NIVEL_RUIDO_INTERNO'),
  nivel_ruido: atributoMonvizo('NIVEL_RUIDO_INTERNO'),
  controle_remoto: atributoMonvizo('CONTROLE_REMOTO_ILUMINADO'),
  tubulacao_liquido: atributoMonvizo('CONEXAO_TUBULACAO_LIQUIDO'),
  tubulacao_linha_liquida: atributoMonvizo('CONEXAO_TUBULACAO_LIQUIDO'),
  linha_liquida: atributoMonvizo('CONEXAO_TUBULACAO_LIQUIDO'),
  tubulacao_gas: atributoMonvizo('CONEXAO_TUBULACAO_GAS'),
  tubulacao_linha_gas: atributoMonvizo('CONEXAO_TUBULACAO_GAS'),
  linha_gas: atributoMonvizo('CONEXAO_TUBULACAO_GAS'),
  distancia_maxima: atributoMonvizo('DISTANCIA_MAXIMA_TUBULACAO'),
  desnivel_maximo: atributoMonvizo('DESNIVEL_MAXIMO_TUBULACAO'),
  area: atributoMonvizo('AREA_APLICACAO'),
  area_aplicacao: atributoMonvizo('AREA_APLICACAO'),
  serpentina: atributoMonvizo('MATERIAL_SERPENTINA'),
  material_tubulacao: atributoMonvizo('MATERIAL_SERPENTINA_CONDENSADORA'),
  materiais: atributoMonvizo('MATERIAIS'),
  material: atributoMonvizo('MATERIAIS'),
  tubulacao: atributoMonvizo('TUBULACAO'),
  tubo: atributoMonvizo('TUBULACAO'),
  corrente: atributoMonvizo('CORRENTE'),
  corrente_eletrica: atributoMonvizo('CORRENTE'),
  potencia_refrigeracao: atributoMonvizo('POTENCIA_REFRIGERACAO'),
  potencia_aquecimento: atributoMonvizo('POTENCIA_AQUECIMENTO'),
  eficiencia_energetica: atributoMonvizo('EFICIENCIA_ENERGETICA'),
  classificacao_energetica: atributoMonvizo('CLASSIFICACAO_ENERGETICA'),
  wifi: atributoMonvizo('WIFI'),
  com_wifi: atributoMonvizo('WIFI')
});

const ETAPAS_CARGA_SQL_PIM = [
  { tipo: 'PRODUTOS_BASE', titulo: '1. Produtos base / materia prima', detalhe: 'Importe evaporadoras, condensadoras, controles, kits, acessorios e componentes tecnicos.' },
  { tipo: 'CONJUNTOS', titulo: '2. Conjuntos / equipamentos vendidos', detalhe: 'Importe Split Hi Wall, Piso Teto, Cassete, Dutado, Multi Split, VRF, Chiller, Fan Coil e UTA.' },
  { tipo: 'PRODUTOS_CONJUNTO', titulo: '3. Vinculo conjunto x produtos', detalhe: 'Relacione cada conjunto aos produtos base ja cadastrados.' },
  { tipo: 'PRODUTOS_ITEM_CARACTERISTICAS', titulo: '4. Atributos dos produtos', detalhe: 'Carregue caracteristicas dos produtos base. Numericos podem alimentar a soma do conjunto.' },
  { tipo: 'PRODUTOS_CJ_CARACTERISTICAS', titulo: '5. Atributos dos conjuntos', detalhe: 'Carregue caracteristicas finais e especificas do conjunto.' },
  { tipo: 'ATRIBUTOS_MARKETPLACE', titulo: '6. Atributos por Plataforma', detalhe: 'Opcional: mapeamentos e ordem de atributos por plataforma.' }
];

function normalizarTextoPim(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function normalizarChaveModeloAlfaNumerico(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function partesChaveModeloAlfaNumerico(valor: unknown) {
  return String(valor ?? '')
    .split(/[|;,/\\\n]+/)
    .map(normalizarChaveModeloAlfaNumerico)
    .filter(Boolean);
}

function compararChavesModeloAlfaNumerico(chaveCadastro: unknown, chaveOrigem: unknown) {
  const partesCadastro = partesChaveModeloAlfaNumerico(chaveCadastro);
  const partesOrigem = partesChaveModeloAlfaNumerico(chaveOrigem);
  const restantes = [...partesOrigem];
  let correspondencias = 0;
  for (const parte of partesCadastro) {
    const indice = restantes.indexOf(parte);
    if (indice >= 0) {
      correspondencias += 1;
      restantes.splice(indice, 1);
    }
  }
  const total = Math.max(partesCadastro.length, partesOrigem.length);
  return {
    chave_cadastro_normalizada: partesCadastro.join('|'),
    chave_origem_normalizada: partesOrigem.join('|'),
    correspondencias,
    total,
    percentual: total ? Math.round((correspondencias / total) * 100) : 0,
    exata: total > 0 && correspondencias === total && partesCadastro.length === partesOrigem.length
  };
}

function detectarSeparadorCsv(conteudo: string) {
  const primeiraLinha = conteudo.split(/\r?\n/).find((linha) => linha.trim()) ?? '';
  const candidatos = [';', ',', '\t'];
  return candidatos
    .map((separador) => ({ separador, total: primeiraLinha.split(separador).length }))
    .sort((a, b) => b.total - a.total)[0]?.separador ?? ';';
}

function lerCsvPim(conteudo: string) {
  const separador = detectarSeparadorCsv(conteudo);
  const linhas = conteudo.split(/\r?\n/).filter((linha) => linha.trim());
  const colunas = (linhas.shift() ?? '').split(separador).map((coluna) => coluna.trim().replace(/^"|"$/g, ''));
  const previa = linhas.slice(0, 8).map((linha) => {
    const valores = linha.split(separador).map((valor) => valor.trim().replace(/^"|"$/g, ''));
    return colunas.reduce<RegistroGenerico>((acc, coluna, indice) => ({ ...acc, [coluna]: valores[indice] ?? '' }), {});
  });
  const registros = linhas.map((linha) => {
    const valores = linha.split(separador).map((valor) => valor.trim().replace(/^"|"$/g, ''));
    return colunas.reduce<RegistroGenerico>((acc, coluna, indice) => ({ ...acc, [coluna]: valores[indice] ?? '' }), {});
  });
  return { colunas, linhas: registros, previa: registros.slice(0, 8), totalLinhas: registros.length, separador };
}

async function lerArquivoImportacaoPim(file: File) {
  const extensao = file.name.split('.').pop()?.toLowerCase();
  if (extensao === 'csv' || extensao === 'txt') {
    return lerCsvPim(await file.text());
  }
  if (extensao === 'xls' || extensao === 'xlsx') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const primeiraAba = workbook.SheetNames[0];
    if (!primeiraAba) throw new Error('A planilha Excel nao possui abas para leitura.');
    const planilha = workbook.Sheets[primeiraAba];
    const registros = XLSX.utils.sheet_to_json<RegistroGenerico>(planilha, { defval: '' });
    const colunas = Array.from(new Set(registros.flatMap((linha) => Object.keys(linha))));
    return { colunas, linhas: registros, previa: registros.slice(0, 8), totalLinhas: registros.length, separador: 'excel' };
  }

  throw new Error('Selecione um arquivo CSV, TXT, XLS ou XLSX.');
}

function sugerirMapeamentoPim(colunas: string[]) {
  const aliases: Record<string, string[]> = {
    codigo_erp_decis: ['item', 'codigo_erp', 'cod_erp', 'erp', 'codigo_produto_erp', 'produto_erp', 'codigo', 'cod_produto', 'codigo_produto'],
    codigo_fabricante: ['referencia', 'ref', 'codigo_fabricante', 'cod_fabricante', 'codigo_do_fabricante', 'codigo_referencia', 'cod_referencia'],
    ean_gtin: ['ean', 'ean_gtin', 'codigo_barras', 'gtin'],
    gtin: ['gtin'],
    mpn: ['mpn'],
    nome_interno: ['nome_interno', 'descricao_interna'],
    nome_comercial: ['descricao', 'descr', 'nome', 'nome_comercial', 'produto', 'titulo', 'descricao_produto'],
    marca: ['marca', 'fabricante', 'marca_produto'],
    linha: ['linha'],
    modelo: ['modelo', 'cod_modelo_produto'],
    familia: ['familia'],
    categoria: ['categoria', 'departamento'],
    subcategoria: ['subcategoria', 'sub_categoria'],
    tipo_produto: ['tipo', 'tipo_produto', 'tipo_item', 'tipo_unidade'],
    status: ['status', 'situacao', 'situacao_conjunto', 'situacao_item'],
    ncm: ['ncm', 'codigo_ncm', 'cod_ncm'],
    cest: ['cest'],
    peso: ['peso', 'peso_bruto'],
    peso_bruto: ['peso_bruto'],
    altura: ['altura'],
    largura: ['largura'],
    profundidade: ['profundidade', 'comprimento'],
    unidade_medida: ['unidade', 'unidade_medida', 'um'],
    ciclo: ['ciclo'],
    tensao: ['tensao', 'voltagem', 'volts'],
    tipo_capacidade: ['tipocapacidade', 'tipo_capacidade'],
    btu: ['btu'],
    tecnologia: ['tecnologia'],
    origem: ['origem'],
    garantia: ['garantia'],
    observacoes: ['observacao', 'observacoes']
  };
  const colunasNormalizadas = colunas.map((coluna) => ({ original: coluna, normalizada: normalizarTextoPim(coluna) }));
  return colunas.reduce<RegistroGenerico>((acc, coluna) => {
    const normalizada = normalizarTextoPim(coluna);
    const campoDireto = CAMPOS_IMPORTACAO_PIM.find((campo) => campo === normalizada);
    const campoOperacional = DEPARA_OPERACIONAL_MONVIZO_POR_COLUNA[normalizada]
      ?? Object.entries(DEPARA_OPERACIONAL_MONVIZO_POR_COLUNA).find(([alias]) => alias && (normalizada.includes(alias) || alias.includes(normalizada)))?.[1];
    const campoAtributoMonvizo = DEPARA_ATRIBUTO_MONVIZO_POR_COLUNA[normalizada]
      ?? Object.entries(DEPARA_ATRIBUTO_MONVIZO_POR_COLUNA).find(([alias]) => alias && (normalizada.includes(alias) || alias.includes(normalizada)))?.[1];
    const campoPorAlias = Object.entries(aliases).find(([, lista]) => lista.includes(normalizada))?.[0];
    const campoPorContem = Object.entries(aliases).find(([, lista]) => lista.some((alias) => normalizada.includes(alias) || alias.includes(normalizada)))?.[0];
    const campo = campoOperacional ?? campoAtributoMonvizo ?? campoDireto ?? campoPorAlias ?? campoPorContem ?? '';
    return campo ? { ...acc, [coluna]: campo } : acc;
  }, {});
}

function sugerirMapeamentoSqlServerPim(colunas: string[], tipoCarga: string) {
  const campos = CAMPOS_SQLSERVER_POR_TIPO[tipoCarga] ?? CAMPOS_IMPORTACAO_PIM;
  const aliasesExtras: Record<string, string[]> = {
    conjunto_codigo: ['conjunto', 'codigo_conjunto', 'cod_conjunto', 'produto_conjunto', 'sku_conjunto'],
    item_codigo: ['item', 'codigo_item', 'cod_item', 'materia_prima', 'cod_materia_prima', 'codigo_materia_prima', 'componente', 'codigo_componente'],
    item_nome: ['nome_item', 'descricao_item', 'materia_prima_descricao', 'descricao_materia_prima', 'componente_nome'],
    componente_codigo: ['componente', 'codigo_componente', 'cod_componente', 'materia_prima', 'codigo_materia_prima'],
    componente_nome: ['nome_componente', 'descricao_componente', 'descricao_materia_prima'],
    atributo_codigo: ['caracteristica', 'codigo_caracteristica', 'cod_caracteristica', 'atributo', 'codigo_atributo'],
    atributo_nome: ['nome_caracteristica', 'descricao_caracteristica', 'atributo_nome', 'nome_atributo', 'tensao', 'voltagem', 'volts', 'fase', 'frequencia', 'ciclo', 'frio', 'quente_frio', 'inverter', 'dual_inverter', 'inmetro', 'procel', 'wifi', 'gas_refrigerante', 'linha_liquida', 'linha_gas', 'tubulacao'],
    valor_texto: ['valor', 'valor_texto', 'conteudo', 'descricao_valor', 'tensao', 'voltagem', 'volts', 'fase', 'frequencia', 'ciclo', 'inverter', 'dual_inverter', 'inmetro', 'procel', 'wifi', 'gas_refrigerante', 'linha_liquida', 'linha_gas', 'tubulacao'],
    valor_numero: ['valor_numerico', 'valor_numero', 'numero', 'btu', 'capacidade', 'seer', 'eer', 'cop', 'consumo', 'potencia', 'corrente', 'area', 'ruido', 'vazao', 'desnivel', 'carga_gas'],
    unidade_medida: ['unidade', 'um', 'unidade_medida'],
    tipo_relacao: ['tipo', 'tipo_item', 'tipo_relacao', 'tipo_componente'],
    quantidade: ['quantidade', 'qtde', 'qtd'],
    status: ['situacao', 'flag_situacao', 'flagsituacao', 'status'],
    ultima_alteracao: ['ultimaalteracao', 'ultima_alteracao', 'data_ultima_alteracao'],
    ordem: ['ordem', 'sequencia', 'seq'],
    obrigatorio: ['obrigatorio', 'requerido', 'mandatory']
  };
  const sugestaoBase = sugerirMapeamentoPim(colunas);
  return colunas.reduce<RegistroGenerico>((acc, coluna) => {
    const normalizada = normalizarTextoPim(coluna);
    const direto = campos.find((campo) => campo === normalizada);
    const operacional = DEPARA_OPERACIONAL_MONVIZO_POR_COLUNA[normalizada];
    const atributoMonvizo = DEPARA_ATRIBUTO_MONVIZO_POR_COLUNA[normalizada];
    const porAlias = Object.entries(aliasesExtras)
      .filter(([campo]) => campos.includes(campo))
      .find(([, aliases]) => aliases.some((alias) => normalizada === alias || normalizada.includes(alias) || alias.includes(normalizada)))?.[0];
    return { ...acc, [coluna]: direto ?? operacional ?? atributoMonvizo ?? porAlias ?? sugestaoBase[coluna] ?? '' };
  }, {});
}

function sugerirAtributosDinamicosCarga(colunas: string[], atributos: RegistroGenerico[], base: RegistroGenerico) {
  return colunas.reduce<RegistroGenerico>((acc, coluna) => {
    if (acc[coluna]) return acc;
    const normalizada = normalizarTextoPim(coluna);
    const atributo = atributos.find((item) => {
      const codigo = normalizarTextoPim(String(item.codigo ?? ''));
      const nome = normalizarTextoPim(String(item.nome_exibido ?? item.nome_interno ?? ''));
      return normalizada === codigo || normalizada === nome || (codigo && normalizada.includes(codigo)) || (nome && normalizada.includes(nome));
    });
    return atributo?.id ? { ...acc, [coluna]: `ATRIBUTO::${String(atributo.id)}` } : acc;
  }, base);
}

function aplicarTemplateMonvizoPorLayout(colunas: string[], tipoCarga: string, base: RegistroGenerico) {
  const destinoPorIndice: Record<number, string> = {};
  if (tipoCarga === 'PRODUTOS_BASE' && colunas.length === 70) {
    Object.assign(destinoPorIndice, {
      1: 'codigo_erp_decis',
      2: 'nome_comercial',
      3: 'codigo_fabricante',
      4: 'altura',
      5: 'largura',
      6: 'profundidade',
      7: grupoOperacionalMonvizo('Logistica', 'altura_embalado'),
      8: grupoOperacionalMonvizo('Logistica', 'largura_embalado'),
      9: grupoOperacionalMonvizo('Logistica', 'profundidade_embalado'),
      10: grupoOperacionalMonvizo('Identificacao', 'volume'),
      11: 'peso',
      12: grupoOperacionalMonvizo('Logistica', 'peso_liquido'),
      13: 'ncm',
      14: 'marca',
      15: grupoOperacionalMonvizo('Identificacao', 'marca_completa'),
      16: 'modelo',
      17: atributoMonvizo('TIPO_GAS'),
      18: atributoMonvizo('CAPACIDADE'),
      19: atributoMonvizo('CICLO'),
      20: atributoMonvizo('TIPO_TECNOLOGIA_COMPRESSOR'),
      21: 'tipo_produto',
      22: atributoMonvizo('SEER'),
      23: atributoMonvizo('EER'),
      24: atributoMonvizo('POTENCIA_REFRIGERACAO'),
      25: atributoMonvizo('CORRENTE_ELETRICA_REFRIGERACAO'),
      26: atributoMonvizo('CLASSIFICACAO_ENERGETICA'),
      27: atributoMonvizo('TIPO_CONDENSADOR'),
      28: atributoMonvizo('CONSUMO_ENERGIA_PROCEL'),
      29: atributoMonvizo('WIFI'),
      30: atributoMonvizo('NIVEL_RUIDO_INTERNO'),
      31: atributoMonvizo('COR'),
      32: atributoMonvizo('CONTROLE_REMOTO_ILUMINADO'),
      33: atributoMonvizo('TIMER'),
      34: atributoMonvizo('SLEEP'),
      35: atributoMonvizo('SWING'),
      36: atributoMonvizo('TURBO'),
      37: atributoMonvizo('MEMORIA'),
      38: atributoMonvizo('AVISO_LIMPA_FILTRO'),
      39: atributoMonvizo('FILTRO_ANTIBACTERIA'),
      40: atributoMonvizo('DESUMIDIFICACAO'),
      41: atributoMonvizo('FUNCAO_BRISA'),
      42: atributoMonvizo('CONTROLE_DIRECAO_AR'),
      43: atributoMonvizo('INDICADOR_TEMPERATURA'),
      44: atributoMonvizo('POTENCIA_AQUECIMENTO'),
      45: atributoMonvizo('CORRENTE_ELETRICA_AQUECIMENTO'),
      46: atributoMonvizo('REGULA_VELOCIDADE_VENTILACAO'),
      47: atributoMonvizo('ALIMENTACAO'),
      48: atributoMonvizo('MATERIAL_SERPENTINA'),
      49: grupoOperacionalMonvizo('Identificacao', 'marca_completa'),
      50: atributoMonvizo('DISJUNTOR'),
      51: atributoMonvizo('CONEXAO_TUBULACAO_LIQUIDO'),
      52: atributoMonvizo('CONEXAO_TUBULACAO_GAS'),
      53: atributoMonvizo('MATERIAL_GABINETE_CONDENSADORA'),
      54: atributoMonvizo('FREQUENCIA'),
      55: atributoMonvizo('DISTANCIA_MAXIMA_TUBULACAO'),
      56: atributoMonvizo('DESNIVEL_MAXIMO_TUBULACAO'),
      57: atributoMonvizo('TIPO_TECNOLOGIA_COMPRESSOR'),
      58: atributoMonvizo('FASE'),
      59: atributoMonvizo('AREA_APLICACAO'),
      60: atributoMonvizo('MATERIAL_GABINETE'),
      61: atributoMonvizo('MATERIAL_SERPENTINA_CONDENSADORA'),
      62: grupoOperacionalMonvizo('Comercial', 'cff'),
      63: grupoOperacionalMonvizo('Comercial', 'cffuso'),
      64: grupoOperacionalMonvizo('Comercial', 'venda_a_vista'),
      65: grupoOperacionalMonvizo('Comercial', 'venda_padrao'),
      66: grupoOperacionalMonvizo('Comercial', 'venda_cartao'),
      67: grupoOperacionalMonvizo('Estoque', 'disp'),
      68: grupoOperacionalMonvizo('Estoque', 'fis'),
      69: grupoOperacionalMonvizo('Estoque', 'res'),
      70: grupoOperacionalMonvizo('Controle', 'ultima_alteracao')
    });
  }
  if (tipoCarga === 'CONJUNTOS' && colunas.length === 22) {
    Object.assign(destinoPorIndice, {
      1: 'codigo_erp_decis',
      2: 'nome_comercial',
      3: 'marca',
      4: 'linha',
      5: 'ciclo',
      6: 'tipo_produto',
      7: 'tensao',
      8: 'tipo_capacidade',
      9: 'btu',
      10: 'tecnologia',
      11: 'status',
      12: grupoOperacionalMonvizo('Comercial', 'cff'),
      13: grupoOperacionalMonvizo('Comercial', 'cffuso'),
      14: grupoOperacionalMonvizo('Comercial', 'venda_a_vista'),
      15: grupoOperacionalMonvizo('Comercial', 'venda_padrao'),
      16: grupoOperacionalMonvizo('Comercial', 'venda_cartao'),
      19: grupoOperacionalMonvizo('Estoque', 'disp'),
      20: grupoOperacionalMonvizo('Estoque', 'fis'),
      21: grupoOperacionalMonvizo('Estoque', 'res'),
      22: grupoOperacionalMonvizo('Controle', 'ultima_alteracao')
    });
  }
  if (tipoCarga === 'PRODUTOS_CONJUNTO' && colunas.length === 6) {
    Object.assign(destinoPorIndice, {
      1: 'conjunto_codigo',
      2: 'item_codigo',
      3: 'quantidade',
      4: 'ultima_alteracao',
      5: 'ordem',
      6: 'status'
    });
  }
  return colunas.reduce<RegistroGenerico>((acc, coluna, indice) => {
    const destino = destinoPorIndice[indice + 1];
    return destino ? { ...acc, [coluna]: destino } : acc;
  }, base);
}

export function ImportacaoPim() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [colunas, setColunas] = useState<string[]>([]);
  const [previa, setPrevia] = useState<RegistroGenerico[]>([]);
  const [mapeamento, setMapeamento] = useState<RegistroGenerico>({});
  const [modo, setModo] = useState('ATUALIZAR_EXISTENTES');
  const [salvarLayout, setSalvarLayout] = useState(true);
  const [nomeLayout, setNomeLayout] = useState('');
    const [totalLinhas, setTotalLinhas] = useState(0);
  const [separador, setSeparador] = useState(';');
  const [dadosArquivo, setDadosArquivo] = useState<RegistroGenerico[]>([]);
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);

  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function carregarHistorico() {
    setLinhas(await listarImportacoesPim());
  }

  useEffect(() => {
    carregarHistorico().catch(() => setLinhas([]));
  }, []);

  async function selecionarArquivo(file?: File | null) {
    setArquivo(file ?? null);
    setErro('');
    setMensagem('');
    setColunas([]);
    setPrevia([]);
        setMapeamento({});
    setTotalLinhas(0);
    setDadosArquivo([]);
    if (!file) return;

    setNomeLayout(file.name.replace(/\.[^.]+$/, ''));
    try {
      const leitura = await lerArquivoImportacaoPim(file);
      setColunas(leitura.colunas);
      setPrevia(leitura.previa);
            setTotalLinhas(leitura.totalLinhas);
      setSeparador(leitura.separador);
      setDadosArquivo(leitura.linhas ?? leitura.previa);
      setMapeamento(sugerirMapeamentoPim(leitura.colunas));

      setMensagem(`Arquivo lido com ${leitura.colunas.length} coluna(s). Confira o De/Para antes de importar.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao ler arquivo.');
    }
  }

  async function registrar() {
    if (!arquivo) {
      setErro('Selecione um arquivo da maquina antes de importar.');
      return;
    }
    setErro('');
    setMensagem('');
    const camposObrigatorios = ['codigo_erp_decis'];
    const camposMapeados = Object.values(mapeamento).filter(Boolean);
    const faltantes = camposObrigatorios.filter((campo) => !camposMapeados.includes(campo));
    const logs = [
      `Arquivo selecionado: ${arquivo.name}`,
      `Separador detectado: ${separador === '\t' ? 'TAB' : separador}`,
      `${Object.keys(mapeamento).length} coluna(s) com De/Para.`,
      'Modelo Alfa Numerico sera normalizado sem espacos, acentos ou separadores na comparacao.',
      'Planilha configurada somente para atualizar produtos existentes pela chave ERP.',
      faltantes.length ? `Campos obrigatorios pendentes: ${faltantes.join(', ')}` : 'Chave ERP mapeada.'
    ];
    await registrarImportacaoPim({
      nome_arquivo: arquivo.name,
      tipo_arquivo: arquivo.name.split('.').pop()?.toUpperCase() ?? 'CSV',
      modo_importacao: modo,
      total_linhas: totalLinhas,
      colunas_detectadas: colunas,
      mapeamento,
      previa,
      logs,
      relatorio: {
        produtos_novos: 0,
        produtos_encontrados: 0,
        produtos_com_erro: faltantes.length ? totalLinhas : 0,
        campos_obrigatorios_faltantes: faltantes,
        observacao: 'Importacao registrada somente para atualizacao por codigo ERP. Produtos novos nao serao inseridos por planilha.',
        fonte_comparacao: arquivo.name.toLowerCase().includes('atributos_erp') ? 'ATRIBUTOS_ERP' : 'ARQUIVO_IMPORTADO',
        chave_comparacao: 'MODELO_ALFA_NUMERICO_NORMALIZADO',
        dados_comparacao: dadosArquivo
      },
      salvar_layout: salvarLayout,
      nome_layout: nomeLayout
    });
    setMensagem('Importacao registrada para atualizacao por ERP. Nenhum produto novo sera inserido por planilha.');
    await carregarHistorico();
  }

  const colunasHistorico = ['nome_arquivo', 'tipo_arquivo', 'modo_importacao', 'status', 'total_linhas', 'criado_em'];

  return (
    <section className="painelTabela pimTelaAvancada">
      <header>
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>Importacao por Arquivo</h2>
          <p>Selecione um CSV ou Excel, valide as colunas e confirme o De/Para. O Modelo Alfa Numerico sera preservado como chave de comparacao; a importacao oficial continua sem criar produto novo.</p>
        </div>
        <button className="ghost" onClick={registrar}><FileUp size={15} />Registrar importacao</button>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      <div className="pimGridOperacional">
        <section className="pimBloco">
          <h3>Arquivo</h3>
          <div className="formCadastro semBorda">
            <label className="campoLargo">Selecionar arquivo<input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={(e) => selecionarArquivo(e.target.files?.[0])} /></label>
            <small>Excel (.xls/.xlsx) e CSV sao aceitos. A planilha Atributos ERP usa Modelo Alfa Numerico como chave de comparacao normalizada.</small>
            <label>Modo<select value={modo} onChange={(e) => setModo(e.target.value)}>{['ATUALIZAR_EXISTENTES', 'APENAS_VALIDAR'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Salvar layout<input type="checkbox" checked={salvarLayout} onChange={(e) => setSalvarLayout(e.target.checked)} /></label>
            <label>Nome do layout<input value={nomeLayout} onChange={(e) => setNomeLayout(e.target.value)} /></label>
          </div>
        </section>
        <section className="pimBloco">
          <h3>Resumo</h3>
          <div className="pimResumoArquivo">
            <article><span>Arquivo</span><strong>{arquivo?.name ?? '-'}</strong></article>
            <article><span>Colunas</span><strong>{colunas.length}</strong></article>
            <article><span>Linhas</span><strong>{totalLinhas}</strong></article>
            <article><span>Separador</span><strong>{separador === '\t' ? 'TAB' : separador}</strong></article>
          </div>
        </section>
      </div>
      <section className="pimBloco">
        <div className="pimBlocoTopo">
          <h3>De / Para inteligente</h3>
          <button className="ghost" onClick={() => setMapeamento(sugerirMapeamentoPim(colunas))}>Sugerir novamente</button>
        </div>
        <div className="pimMapaImportacao">
          {colunas.map((coluna) => (
            <label key={coluna}>
              <span>{coluna}</span>
              <select value={String(mapeamento[coluna] ?? '')} onChange={(e) => setMapeamento({ ...mapeamento, [coluna]: e.target.value })}>
                  <option value="">Ignorar coluna</option>
                {CAMPOS_IMPORTACAO_PIM.map((campo) => <option key={campo} value={campo}>{campo}</option>)}
                <option disabled>-- Dados operacionais --</option>
                {GRUPOS_OPERACIONAIS_MONVIZO.map((item) => <option key={item.destino} value={item.destino}>{`${String(item.nome).toUpperCase()} -> ${item.grupo}`}</option>)}
                <option disabled>-- Atributos tecnicos --</option>
                {ATRIBUTOS_MONVIZO_CARGA.map((atributo) => <option key={atributo.destino} value={atributo.destino}>{`Atributo: ${atributo.nome}`}</option>)}
              </select>
            </label>
          ))}
          {colunas.length === 0 && <p>Selecione um CSV para visualizar as colunas e validar o De/Para.</p>}
        </div>
      </section>
      <section className="pimBloco">
        <h3>Previa</h3>
        <TabelaPimCompacta linhas={previa} colunas={colunas.slice(0, 8)} vazio="Nenhuma previa disponivel." />
      </section>
      <section className="pimBloco">
        <h3>Historico de importacoes</h3>
        <TabelaPimCompacta linhas={linhas} colunas={colunasHistorico} />
      </section>
    </section>
  );
}

export function ConexoesSqlServerPim() {
  return <CargaSqlServerPim modoTela="conexoes" />;
}

function detectarParametrosSqlServer(sql: string, atuais: RegistroGenerico[] = []) {
  const valoresAtuais = new Map(atuais.map((item) => [String(item.nome ?? '').toUpperCase(), item]));
  const nomes = Array.from(new Set(Array.from(sql.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)).map((item) => item[1].toUpperCase())));
  return nomes.map((nome) => ({
    nome,
    rotulo: valoresAtuais.get(nome)?.rotulo ?? nome,
    valor: valoresAtuais.get(nome)?.valor ?? valoresAtuais.get(nome)?.valor_padrao ?? '',
    valor_padrao: valoresAtuais.get(nome)?.valor_padrao ?? valoresAtuais.get(nome)?.valor ?? '',
    obrigatorio: valoresAtuais.get(nome)?.obrigatorio !== false
  }));
}

function valoresParametrosSqlServer(parametros: RegistroGenerico[]) {
  return parametros.reduce<RegistroGenerico>((acc, item) => {
    const nome = String(item.nome ?? '').trim();
    if (nome) acc[nome] = item.valor ?? item.valor_padrao ?? null;
    return acc;
  }, {});
}

export function CargaSqlServerPim({ modoTela = 'carga' }: { modoTela?: 'conexoes' | 'carga' }) {
  const [conexoes, setConexoes] = useState<RegistroGenerico[]>([]);
  const [consultasSalvas, setConsultasSalvas] = useState<RegistroGenerico[]>([]);
  const [cargas, setCargas] = useState<RegistroGenerico[]>([]);
  const [atributosCarga, setAtributosCarga] = useState<RegistroGenerico[]>([]);
  const [conexao, setConexao] = useState<RegistroGenerico>({ porta: 1433, ambiente: 'PRODUCAO', ativo: true });
  const [consulta, setConsulta] = useState('SELECT TOP 100 * FROM PRODUTOS');
  const [conexaoId, setConexaoId] = useState('');
  const [modoCarga, setModoCarga] = useState('INSERIR_OU_ATUALIZAR_ERP');
  const [tipoCarga, setTipoCarga] = useState('PRODUTOS_BASE');
  const [nomeCarga, setNomeCarga] = useState('Carga manual SQL Server');
  const [colunas, setColunas] = useState<string[]>([]);
  const [previa, setPrevia] = useState<RegistroGenerico[]>([]);
  const [mapeamento, setMapeamento] = useState<RegistroGenerico>({});
  const [parametros, setParametros] = useState<RegistroGenerico[]>([]);
  const [totalLinhas, setTotalLinhas] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function carregar() {
    const [listaConexoes, listaConsultas, listaCargas, listaAtributos] = await Promise.all([
      listarConexoesSqlServerPim(),
      listarConsultasSqlServerPim(),
      listarCargasSqlServerPim(),
      listarAtributosPim()
    ]);
    setConexoes(listaConexoes);
    setConsultasSalvas(listaConsultas);
    setCargas(listaCargas);
    setAtributosCarga(listaAtributos.atributos ?? []);
    if (!conexaoId && listaConexoes[0]?.id) setConexaoId(String(listaConexoes[0].id));
  }

  useEffect(() => {
    carregar().catch(() => {
      setConexoes([]);
      setConsultasSalvas([]);
      setCargas([]);
      setAtributosCarga([]);
    });
  }, []);

  useEffect(() => {
    setParametros((atuais) => detectarParametrosSqlServer(consulta, atuais));
  }, [consulta]);

  async function salvarConexao(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    try {
      const salva = await salvarConexaoSqlServerPim(conexao);
      setMensagem('Conexao SQL Server salva.');
      setConexaoId(String(salva.id));
      setConexao({ porta: 1433, ambiente: 'PRODUCAO', ativo: true });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar conexao SQL Server.');
    }
  }

  async function testar(id: number) {
    setErro('');
    setMensagem('');
    try {
      const retorno = await testarConexaoSqlServerPim(id);
      setMensagem(String(retorno.ultima_mensagem ?? 'Conexao validada.'));
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao testar conexao.');
    }
  }

  async function consultarOrigem() {
    setErro('');
    setMensagem('');
    try {
      const retorno = await consultarSqlServerPim({ conexao_id: Number(conexaoId), consulta_sql: consulta, limite: 100, parametros_valores: valoresParametrosSqlServer(parametros) });
      setColunas(retorno.colunas);
      setPrevia(retorno.previa);
      setTotalLinhas(retorno.total_linhas);
      const sugestaoBase = sugerirAtributosDinamicosCarga(retorno.colunas, atributosCarga, sugerirMapeamentoSqlServerPim(retorno.colunas, tipoCarga));
      setMapeamento(aplicarTemplateMonvizoPorLayout(retorno.colunas, tipoCarga, sugestaoBase));
      setMensagem(`Consulta executada. ${retorno.colunas.length} coluna(s) detectada(s) e ${retorno.total_linhas} linha(s) retornada(s).`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao consultar SQL Server.');
    }
  }

  async function executarCarga() {
    setErro('');
    setMensagem('');
    try {
      const retorno = await executarCargaSqlServerPim({
        conexao_id: Number(conexaoId),
        nome: nomeCarga,
        tipo_carga: tipoCarga,
        consulta_sql: consulta,
        modo_carga: modoCarga,
        mapeamento,
        parametros_valores: valoresParametrosSqlServer(parametros),
        limite: 0
      });
      setMensagem(`Carga concluida. Processados: ${retorno.produtos_processados ?? 0}, inseridos: ${retorno.produtos_inseridos ?? 0}, atualizados: ${retorno.produtos_atualizados ?? 0}, erros: ${retorno.produtos_com_erro ?? 0}.`);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao executar carga SQL Server.');
    }
  }

  async function salvarModeloConsulta() {
    setErro('');
    setMensagem('');
    try {
      await salvarConsultaSqlServerPim({
        nome: nomeCarga,
        conexao_id: Number(conexaoId),
        tipo_carga: tipoCarga,
        consulta_sql: consulta,
        modo_carga_padrao: modoCarga,
        mapeamento,
        colunas_detectadas: colunas,
        parametros
      });
      setMensagem('Consulta SQL salva para reutilizacao.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar consulta SQL.');
    }
  }

  function carregarModeloConsulta(id: string) {
    const modelo = consultasSalvas.find((item) => String(item.id) === id);
    if (!modelo) return;
    setNomeCarga(String(modelo.nome ?? 'Carga manual SQL Server'));
    setConexaoId(modelo.conexao_id ? String(modelo.conexao_id) : conexaoId);
    setTipoCarga(String(modelo.tipo_carga ?? 'PRODUTOS_BASE'));
    setModoCarga(String(modelo.modo_carga_padrao ?? 'APENAS_VALIDAR'));
    setConsulta(String(modelo.consulta_sql ?? ''));
    setMapeamento(modelo.mapeamento ?? {});
    setColunas(Array.isArray(modelo.colunas_detectadas) ? modelo.colunas_detectadas : []);
    setParametros(detectarParametrosSqlServer(String(modelo.consulta_sql ?? ''), Array.isArray(modelo.parametros) ? modelo.parametros : []));
    setPrevia([]);
    setTotalLinhas(0);
    setMensagem(`Consulta carregada: ${String(modelo.nome ?? '')}`);
  }

  async function excluirModeloConsulta(id: number) {
    setErro('');
    setMensagem('');
    try {
      await excluirConsultaSqlServerPim(id);
      setMensagem('Consulta salva excluida.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao excluir consulta salva.');
    }
  }

  if (modoTela === 'conexoes') {
    return (
      <section className="painelTabela pimTelaAvancada pimSqlServer">
        <header>
          <div>
            <span>Cadastro de Produto Central</span>
            <h2>Conexoes SQL Server</h2>
            <p>Cadastre e valide conexoes com as bases oficiais utilizadas nas cargas banco a banco.</p>
          </div>
          <button className="ghost" onClick={carregar}>Atualizar</button>
        </header>
        {mensagem && <div className="sucesso">{mensagem}</div>}
        {erro && <div className="alerta">{erro}</div>}
        <div className="pimGridOperacional">
          <form className="pimBloco" onSubmit={salvarConexao}>
            <h3>Conexao</h3>
            <div className="formCadastro semBorda">
              <label>Nome<input value={String(conexao.nome ?? '')} onChange={(e) => setConexao({ ...conexao, nome: e.target.value })} /></label>
              <label>Ambiente<select value={String(conexao.ambiente ?? 'PRODUCAO')} onChange={(e) => setConexao({ ...conexao, ambiente: e.target.value })}><option>PRODUCAO</option><option>HOMOLOGACAO</option></select></label>
              <label>Host<input value={String(conexao.host ?? '')} onChange={(e) => setConexao({ ...conexao, host: e.target.value })} /></label>
              <label>Porta<input type="number" value={String(conexao.porta ?? 1433)} onChange={(e) => setConexao({ ...conexao, porta: Number(e.target.value) })} /></label>
              <label>Banco<input value={String(conexao.banco ?? '')} onChange={(e) => setConexao({ ...conexao, banco: e.target.value })} /></label>
              <label>Usuario<input value={String(conexao.usuario ?? '')} onChange={(e) => setConexao({ ...conexao, usuario: e.target.value })} /></label>
              <label>Senha<input type="password" placeholder="Preencha para gravar/trocar" value={String(conexao.senha ?? '')} onChange={(e) => setConexao({ ...conexao, senha: e.target.value })} /></label>
              <label>Ativa<input type="checkbox" checked={conexao.ativo !== false} onChange={(e) => setConexao({ ...conexao, ativo: e.target.checked })} /></label>
            </div>
            <div className="rodapeAcoes">
              <button className="primary">Salvar conexao</button>
            </div>
          </form>
          <section className="pimBloco">
            <h3>Conexoes cadastradas</h3>
            <TabelaPimCompacta linhas={conexoes} colunas={['nome', 'host', 'porta', 'banco', 'ambiente', 'ultima_validacao_em', 'ultima_mensagem']} vazio="Nenhuma conexao cadastrada." />
            <div className="pimConexoesAcoes">
              {conexoes.map((item) => (
                <button key={String(item.id)} className="ghost" onClick={() => testar(Number(item.id))}>Testar {String(item.nome)}</button>
              ))}
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="painelTabela pimTelaAvancada pimSqlServer">
      <header>
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>Carga SQL / De-Para</h2>
          <p>Execute em ordem: produtos base, conjuntos, vinculos conjunto-produtos, atributos dos produtos e atributos dos conjuntos.</p>
        </div>
        <button className="ghost" onClick={carregar}>Atualizar</button>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      <div className="pimBlocoInterno">
        <div className="pimBlocoTopo">
          <h4>Consultas salvas</h4>
          <span>{consultasSalvas.length} modelo(s)</span>
        </div>
        <div className="formCadastro semBorda">
          <label className="campoLargo">Carregar modelo salvo
            <select defaultValue="" onChange={(e) => { carregarModeloConsulta(e.target.value); e.currentTarget.value = ''; }}>
              <option value="">Selecione uma consulta salva</option>
              {consultasSalvas.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>{String(item.nome)} - {String(item.tipo_carga)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="pimConexoesAcoes">
          {consultasSalvas.map((item) => (
            <button key={String(item.id)} className="ghost" onClick={() => carregarModeloConsulta(String(item.id))}>
              Carregar {String(item.nome)}
            </button>
          ))}
        </div>
      </div>
      <div className="pimBlocoInterno">
        <div className="pimEtapasCarga">
          {ETAPAS_CARGA_SQL_PIM.map((etapa) => (
            <button type="button" key={etapa.tipo} className={tipoCarga === etapa.tipo ? 'active' : ''} onClick={() => { setTipoCarga(etapa.tipo); setMapeamento({}); }}>
              <strong>{etapa.titulo}</strong>
              <span>{etapa.detalhe}</span>
            </button>
          ))}
        </div>
        <h4>Consulta SQL</h4>
        <div className="formCadastro semBorda">
          <label>Conexao<select value={conexaoId} onChange={(e) => setConexaoId(e.target.value)}><option value="">Selecione</option>{conexoes.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome)} - {String(item.banco)}</option>)}</select></label>
          <label>Destino da carga<select value={tipoCarga} onChange={(e) => { setTipoCarga(e.target.value); setMapeamento({}); }}>
            {ETAPAS_CARGA_SQL_PIM.map((etapa) => <option key={etapa.tipo} value={etapa.tipo}>{etapa.titulo}</option>)}
          </select></label>
          <label>Modo<select value={modoCarga} onChange={(e) => setModoCarga(e.target.value)}>{['INSERIR_OU_ATUALIZAR_ERP', 'APENAS_VALIDAR'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="campoLargo">Nome da carga<input value={nomeCarga} onChange={(e) => setNomeCarga(e.target.value)} /></label>
          <label className="campoLargo">SQL de leitura<textarea value={consulta} onChange={(e) => setConsulta(e.target.value)} /></label>
        </div>
        {parametros.length > 0 && (
          <div className="pimBlocoInterno">
            <div className="pimBlocoTopo">
              <h4>Parametros da consulta</h4>
              <span>Use no SQL como :NOME_PARAMETRO</span>
            </div>
            <div className="formCadastro semBorda">
              {parametros.map((parametro, indice) => (
                <label key={String(parametro.nome)}>
                  {String(parametro.rotulo ?? parametro.nome)}
                  <input
                    value={String(parametro.valor ?? '')}
                    placeholder={String(parametro.nome)}
                    onChange={(e) => {
                      const novos = [...parametros];
                      novos[indice] = { ...novos[indice], valor: e.target.value, valor_padrao: e.target.value };
                      setParametros(novos);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="rodapeAcoes">
          <button className="ghost" onClick={salvarModeloConsulta}>Salvar consulta</button>
          <button className="ghost" onClick={consultarOrigem}>Consultar / Pre-validar</button>
          <button className="primary" onClick={executarCarga}>Executar carga</button>
        </div>
      </div>
      <div className="pimBlocoInterno">
        <div className="pimBlocoTopo">
          <h4>De / Para SQL Server</h4>
          <span>{totalLinhas} linha(s) na consulta</span>
        </div>
        <div className="pimMapaImportacao">
          {colunas.map((coluna) => (
            <label key={coluna}>
              <span>{coluna}</span>
              <select value={String(mapeamento[coluna] ?? '')} onChange={(e) => setMapeamento({ ...mapeamento, [coluna]: e.target.value })}>
                <option value="">Ignorar coluna</option>
                {(CAMPOS_SQLSERVER_POR_TIPO[tipoCarga] ?? CAMPOS_IMPORTACAO_PIM).map((campo) => <option key={campo} value={campo}>{campo}</option>)}
                {atributosCarga.length > 0 && <option disabled>-- Atributos cadastrados --</option>}
                {atributosCarga.map((atributo) => (
                  <option key={`atributo-${String(atributo.id)}`} value={`ATRIBUTO::${String(atributo.id)}`}>
                    {`Atributo: ${String(atributo.nome_exibido ?? atributo.codigo)} (${String(atributo.escopo ?? 'PRODUTO')})`}
                  </option>
                ))}
                <option disabled>-- Dados operacionais Monvizo / nao sao atributos --</option>
                {GRUPOS_OPERACIONAIS_MONVIZO.map((item) => (
                  <option key={item.destino} value={item.destino}>
                    {`${String(item.nome).toUpperCase()} -> ${item.grupo}`}
                  </option>
                ))}
                <option disabled>-- Atributos Monvizo / criar se nao existir --</option>
                {ATRIBUTOS_MONVIZO_CARGA.map((atributo) => (
                  <option key={atributo.destino} value={atributo.destino}>
                    {`Monvizo: ${atributo.nome} (${atributo.escopo})`}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {colunas.length === 0 && <p>Execute uma consulta para detectar colunas e montar o De/Para inteligente.</p>}
        </div>
      </div>
      <div className="pimBlocoInterno">
        <h4>Previa da base oficial</h4>
        <TabelaPimCompacta linhas={previa} colunas={colunas.slice(0, 8)} vazio="Nenhuma previa carregada." />
      </div>
      <div className="pimBlocoInterno">
        <h4>Historico de cargas SQL Server</h4>
        <TabelaPimCompacta linhas={cargas} colunas={['nome', 'conexao_nome', 'tipo_carga', 'modo_carga', 'status', 'total_linhas', 'produtos_inseridos', 'produtos_atualizados', 'produtos_com_erro', 'criado_em']} vazio="Nenhuma carga SQL Server registrada." />
      </div>
      <div className="pimBlocoInterno">
        <h4>Manutencao de consultas salvas</h4>
        <TabelaPimCompacta linhas={consultasSalvas} colunas={['nome', 'conexao_nome', 'tipo_carga', 'modo_carga_padrao', 'alterado_em', 'criado_em']} vazio="Nenhuma consulta salva." />
        <div className="pimConexoesAcoes">
          {consultasSalvas.map((item) => (
            <button key={String(item.id)} className="ghost" onClick={() => excluirModeloConsulta(Number(item.id))}>
              Excluir {String(item.nome)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AtributosPimLegacy() {
  const [atributos, setAtributos] = useState<RegistroGenerico[]>([]);
  const [grupos, setGrupos] = useState<RegistroGenerico[]>([]);
  const [canais, setCanais] = useState<RegistroGenerico[]>([]);
  const [mapeamentos, setMapeamentos] = useState<RegistroGenerico[]>([]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({ tipo_campo: 'TEXTO', escopo: 'PRODUTO', ativo: true, editavel: true, visivel: true });
  const [mapa, setMapa] = useState<RegistroGenerico>({ ativo: true, obrigatorio: false, ordem: 0, canal_ids: [] });
  const [busca, setBusca] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function carregar() {
    const [dadosAtributos, dadosCanais, dadosMapeamentos] = await Promise.all([
      listarAtributosPim(),
      listarCanaisPim(),
      listarMapeamentosAtributosCanaisPim()
    ]);
    setAtributos(dadosAtributos.atributos);
    setGrupos(dadosAtributos.grupos);
    setCanais(dadosCanais);
    setMapeamentos(dadosMapeamentos);
  }

  useEffect(() => {
    carregar().catch(() => {
      setAtributos([]);
      setCanais([]);
      setMapeamentos([]);
    });
  }, []);

  async function salvarAtributo(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    try {
      await salvarAtributoPim(formulario);
      setFormulario({ tipo_campo: 'TEXTO', escopo: 'PRODUTO', ativo: true, editavel: true, visivel: true });
      setMensagem('Atributo salvo.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar atributo.');
    }
  }

  async function salvarMapa(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    try {
      await salvarMapeamentoAtributoCanalPim(mapa);
      setMapa({ ativo: true, obrigatorio: false, ordem: 0, canal_ids: [] });
      setMensagem('Atributo vinculado as plataformas selecionadas.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar mapeamento.');
    }
  }

  const atributosFiltrados = atributos.filter((atributo) => {
    const texto = `${atributo.codigo ?? ''} ${atributo.nome_exibido ?? ''} ${atributo.escopo ?? ''}`.toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  const mapeamentosPorCanal = canais.map((canal) => ({
    canal,
    linhas: mapeamentos.filter((item) => Number(item.canal_id) === Number(canal.id))
  }));

  return (
    <section className="painelTabela pimTelaAvancada">
      <header>
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>Atributos</h2>
          <p>Crie, edite, inative e organize atributos dinamicos por escopo e por plataforma, com ordem e mapeamento de manutencao facil.</p>
        </div>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      <div className="pimGridOperacional">
        <form className="pimBloco" onSubmit={salvarAtributo}>
          <h3>{formulario.id ? 'Editar atributo' : 'Novo atributo'}</h3>
          <div className="formCadastro semBorda">
            <label>Grupo<select value={String(formulario.atributo_grupo_id ?? formulario.attribute_group_id ?? '')} onChange={(e) => setFormulario({ ...formulario, atributo_grupo_id: Number(e.target.value) })}><option value="">Selecione</option>{grupos.map((g) => <option key={String(g.id)} value={String(g.id)}>{String(g.nome)}</option>)}</select></label>
            <label>Codigo<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
            <label>Nome exibido<input value={String(formulario.nome_exibido ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_exibido: e.target.value, nome_interno: normalizarTextoPim(e.target.value) })} /></label>
            <label>Tipo<select value={String(formulario.tipo_campo ?? 'TEXTO')} onChange={(e) => setFormulario({ ...formulario, tipo_campo: e.target.value })}>{['TEXTO', 'NUMERO', 'DECIMAL', 'LISTA', 'MULTIPLA_ESCOLHA', 'BOOLEANO', 'DATA', 'URL', 'ARQUIVO', 'IMAGEM'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Escopo<select value={String(formulario.escopo ?? 'PRODUTO')} onChange={(e) => setFormulario({ ...formulario, escopo: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'COMPONENTE', 'EVAPORADORA', 'CONDENSADORA', 'SKU', 'CANAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Unidade<input value={String(formulario.unidade_medida ?? '')} onChange={(e) => setFormulario({ ...formulario, unidade_medida: e.target.value })} /></label>
            <label>Ordem<input type="number" value={String(formulario.ordem_exibicao ?? 0)} onChange={(e) => setFormulario({ ...formulario, ordem_exibicao: Number(e.target.value) })} /></label>
            <label>Obrigatorio<input type="checkbox" checked={Boolean(formulario.obrigatorio)} onChange={(e) => setFormulario({ ...formulario, obrigatorio: e.target.checked })} /></label>
            <label>Editavel<input type="checkbox" checked={formulario.editavel !== false} onChange={(e) => setFormulario({ ...formulario, editavel: e.target.checked })} /></label>
            <label>Visivel<input type="checkbox" checked={formulario.visivel !== false} onChange={(e) => setFormulario({ ...formulario, visivel: e.target.checked })} /></label>
            <label>Ativo<input type="checkbox" checked={formulario.ativo !== false} onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })} /></label>
            <label className="campoLargo">Ajuda / Tooltip<input value={String(formulario.ajuda_tooltip ?? '')} onChange={(e) => setFormulario({ ...formulario, ajuda_tooltip: e.target.value })} /></label>
          </div>
          <div className="rodapeAcoes">
            <button type="button" className="ghost" onClick={() => setFormulario({ tipo_campo: 'TEXTO', escopo: 'PRODUTO', ativo: true, editavel: true, visivel: true })}>Cancelar</button>
            <button className="primary">Salvar atributo</button>
          </div>
        </form>
        <form className="pimBloco" onSubmit={salvarMapa}>
          <h3>Atributo por plataforma</h3>
          <div className="formCadastro semBorda">
            <label className="campoLargo">Atributo<select value={String(mapa.atributo_id ?? '')} onChange={(e) => {
              const atributo = atributos.find((item) => Number(item.id) === Number(e.target.value));
              setMapa({ ...mapa, atributo_id: Number(e.target.value), atributo_canal_codigo: atributo?.codigo, atributo_canal_nome: atributo?.nome_exibido });
            }}><option value="">Selecione</option>{atributos.map((atributo) => <option key={String(atributo.id)} value={String(atributo.id)}>{String(atributo.nome_exibido)} - {String(atributo.escopo)}</option>)}</select></label>
            <label className="campoLargo">Plataformas<select multiple value={(mapa.canal_ids ?? []).map(String)} onChange={(e) => setMapa({ ...mapa, canal_ids: Array.from(e.target.selectedOptions).map((opcao) => Number(opcao.value)) })}>{canais.map((canal) => <option key={String(canal.id)} value={String(canal.id)}>{String(canal.nome)}</option>)}</select></label>
            <label>Codigo na plataforma<input value={String(mapa.atributo_canal_codigo ?? '')} onChange={(e) => setMapa({ ...mapa, atributo_canal_codigo: e.target.value })} /></label>
            <label>Nome na plataforma<input value={String(mapa.atributo_canal_nome ?? '')} onChange={(e) => setMapa({ ...mapa, atributo_canal_nome: e.target.value })} /></label>
            <label>Ordem<input type="number" value={String(mapa.ordem ?? 0)} onChange={(e) => setMapa({ ...mapa, ordem: Number(e.target.value) })} /></label>
            <label>Obrigatorio<input type="checkbox" checked={Boolean(mapa.obrigatorio)} onChange={(e) => setMapa({ ...mapa, obrigatorio: e.target.checked })} /></label>
            <label>Ativo<input type="checkbox" checked={mapa.ativo !== false} onChange={(e) => setMapa({ ...mapa, ativo: e.target.checked })} /></label>
            <label className="campoLargo">Validacao<input value={String(mapa.validacao ?? '')} onChange={(e) => setMapa({ ...mapa, validacao: e.target.value })} /></label>
          </div>
          <div className="rodapeAcoes">
            <button type="button" className="ghost" onClick={() => setMapa({ ativo: true, obrigatorio: false, ordem: 0, canal_ids: [] })}>Cancelar</button>
            <button className="primary">Aplicar nas plataformas</button>
          </div>
        </form>
      </div>
      <section className="pimBloco">
        <div className="pimBlocoTopo">
          <h3>Atributos cadastrados</h3>
          <input placeholder="Buscar atributo, codigo ou escopo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <TabelaPimCompacta
          titulo="Atributos cadastrados"
          nomeArquivo="pim-atributos"
          linhas={atributosFiltrados}
          colunas={['codigo', 'nome_exibido', 'grupo_nome', 'tipo_campo', 'escopo', 'ordem_exibicao', 'ativo']}
          vazio="Nenhum atributo encontrado."
          renderAcoes={(atributo) => (
            <>
              <button type="button" className="ghost" onClick={() => setFormulario(atributo)}>Editar</button>
              <button type="button" className="danger" onClick={async () => { await excluirAtributoPim(Number(atributo.id)); await carregar(); }}><Trash2 size={14} />Excluir</button>
            </>
          )}
        />
      </section>
      <section className="pimBloco">
        <h3>Visualizacao por plataforma</h3>
        <div className="pimCanaisAtributos">
          {mapeamentosPorCanal.map(({ canal, linhas }) => (
            <article key={String(canal.id)}>
              <header><strong>{String(canal.nome)}</strong><span>{linhas.length} atributo(s)</span></header>
              <TabelaPimCompacta
                titulo={`Atributos - ${String(canal.nome)}`}
                nomeArquivo={`pim-atributos-${String(canal.nome).toLowerCase()}`}
                linhas={linhas}
                colunas={['ordem', 'atributo_nome', 'atributo_codigo', 'atributo_canal_nome', 'atributo_canal_codigo', 'obrigatorio', 'ativo']}
                vazio="Nenhum atributo configurado para esta plataforma."
                renderAcoes={(linha) => (
                  <>
                    <button type="button" className="ghost" onClick={() => setMapa({ ...linha, canal_ids: [linha.canal_id] })}>Editar</button>
                    <button type="button" className="danger" onClick={async () => { await excluirMapeamentoAtributoCanalPim(Number(linha.id)); await carregar(); }}>Remover</button>
                  </>
                )}
              />
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export function AtributosPim({ modo = 'atributos' }: { modo?: 'atributos' | 'canais' } = {}) {
  return <PainelPimGenerico tela={modo === 'canais' ? 'pimCanais' : 'pimAtributos'} titulo={modo === 'canais' ? 'Plataformas' : 'Atributos'} subtitulo={modo === 'canais' ? 'Consulte plataformas, edite em modal e vincule atributos obrigatórios ou opcionais.' : 'Consulte o catálogo completo, abra com duplo clique e edite os atributos em modal.'} />;
}

const DEPARA_CONCORRENTE_PADRAO_UI: Record<string, string> = {
  SKU: 'SKU_CJ',
  SKU_CJ: 'SKU_CJ',
  PRODUTO: 'PRODUTO',
  TITULO: 'PRODUTO',
  DESCRICAO: 'DESCRICAO',
  MARCA: 'MARCA',
  MODELO: 'MODELO_ALFA_NUMERICO',
  MPN: 'MODELO_ALFA_NUMERICO',
  CODIGO_FABRICANTE: 'MODELO_ALFA_NUMERICO',
  CAPACIDADE: 'POTENCIA_NOMINAL',
  BTU: 'POTENCIA_NOMINAL',
  GAS_REFRIGERANTE: 'GAS',
  VOLTAGEM: 'TIPO_DE_ALIMENTACAO',
  TECNOLOGIA: 'TECNOLOGIA',
  CICLO: 'CICLO',
  WIFI: 'COM_WI_FI',
  PRECO: 'VENDA_PADRAO'
};

function parseAtributosComparacao(texto: string) {
  return texto
    .split(/\r?\n/)
    .map((linha, indice) => {
      const [codigo, nome, tipo_campo, unidade_medida, obrigatorio] = linha.split('|').map((item) => item.trim());
      if (!codigo || !nome) return null;
      return {
        codigo,
        nome,
        tipo_campo: tipo_campo || 'TEXTO',
        unidade_medida: unidade_medida || '',
        obrigatorio: ['S', 'SIM', 'TRUE', '1'].includes(String(obrigatorio).toUpperCase()),
        ordem: indice + 1
      };
    })
    .filter(Boolean) as RegistroGenerico[];
}

export function ConcorrentesDeParaPim() {
  const [fontes, setFontes] = useState<RegistroGenerico[]>([]);
  const [fonteId, setFonteId] = useState('');
  const [dados, setDados] = useState<RegistroGenerico | null>(null);
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [filtro, setFiltro] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function carregarFontes() {
    setErro('');
    try {
      const retorno = await listarFontesComparacaoPim();
      const concorrentes = retorno.filter((item) => item.tipo_fonte === 'CONCORRENTE' && item.ativo !== false);
      setFontes(concorrentes);
      if (!fonteId && concorrentes[0]?.id) setFonteId(String(concorrentes[0].id));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar concorrentes.');
    }
  }

  async function carregarDePara(id = fonteId) {
    if (!id) return;
    setCarregando(true);
    setErro('');
    try {
      const retorno = await obterDeParaConcorrentePim(Number(id));
      setDados(retorno);
      setLinhas((retorno.campos ?? []) as RegistroGenerico[]);
      setMensagem('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar De/Para do concorrente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarFontes();
  }, []);

  useEffect(() => {
    if (fonteId) carregarDePara(fonteId);
  }, [fonteId]);

  const atributosPim = ((dados?.atributos_pim ?? []) as RegistroGenerico[]);
  const resumo = (dados?.resumo ?? {}) as RegistroGenerico;
  const termo = normalizarTextoPim(busca);
  const atributosEntregues = new Set(linhas.map((linha) => String(linha.atributo_pim_codigo ?? '')).filter(Boolean));
  const atributosNaoEntregues = atributosPim
    .filter((atributo) => !atributosEntregues.has(String(atributo.codigo)))
    .map((atributo) => ({
      codigo_normalizado: String(atributo.codigo),
      campo_concorrente: '',
      atributo_pim_codigo: String(atributo.codigo),
      atributo_pim_nome: String(atributo.nome_exibido ?? ''),
      grupo: atributo.grupo,
      status: 'PIM_SEM_CAMPO_CONCORRENTE',
      ocorrencias: 0,
      exemplos: ''
    }));
  const linhasBase = filtro === 'PIM_SEM_CAMPO_CONCORRENTE'
    ? atributosNaoEntregues
    : linhas;
  const linhasFiltradas = linhasBase
    .filter((linha) => {
      if (filtro === 'TODOS' || filtro === 'PIM_SEM_CAMPO_CONCORRENTE') return true;
      if (filtro === 'CONCORRENTE_SEM_DEPARA') return linha.status === 'SEM_DEPARA' || linha.status === 'DESTINO_NAO_ENCONTRADO';
      if (filtro === 'VINCULADOS') return linha.status === 'VINCULADO';
      return true;
    })
    .filter((linha) => !termo || normalizarTextoPim([linha.campo_concorrente, linha.codigo_normalizado, linha.atributo_pim_codigo, linha.atributo_pim_nome, linha.exemplos, linha.status].join(' ')).includes(termo));

  function atualizarLinha(codigoNormalizado: string, destino: string) {
    setLinhas((atuais) => atuais.map((linha) => String(linha.codigo_normalizado) === codigoNormalizado ? {
      ...linha,
      atributo_pim_codigo: destino,
      atributo_pim_nome: atributosPim.find((item) => String(item.codigo) === destino)?.nome_exibido ?? '',
      status: destino ? 'VINCULADO' : 'SEM_DEPARA',
      existe_no_pim: Boolean(destino)
    } : linha));
  }

  function vincularCampoConcorrenteAoAtributo(atributoCodigo: string, codigoNormalizado: string) {
    if (!atributoCodigo || !codigoNormalizado) return;
    atualizarLinha(codigoNormalizado, atributoCodigo);
    setMensagem('Vínculo aplicado na tela. Clique em Salvar De/Para para gravar.');
  }

  async function salvarDePara() {
    const fonte = fontes.find((item) => String(item.id) === String(fonteId));
    if (!fonte) {
      setErro('Selecione um concorrente para salvar o De/Para.');
      return;
    }
    const dePara = Object.fromEntries(linhas.filter((linha) => String(linha.atributo_pim_codigo ?? '').trim()).map((linha) => [String(linha.campo_concorrente || linha.codigo_normalizado), String(linha.atributo_pim_codigo)]));
    setCarregando(true);
    setErro('');
    try {
      await salvarFonteComparacaoPim({
        ...fonte,
        regras: { ...((fonte.regras ?? {}) as RegistroGenerico), de_para: dePara }
      });
      await carregarDePara(fonteId);
      setMensagem(`De/Para salvo para ${String(fonte.nome)} com ${Object.keys(dePara).length} vínculo(s).`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar De/Para.');
    } finally {
      setCarregando(false);
    }
  }

  function exportarDePara() {
    const dePara = linhas.map((linha) => {
      const atributo = atributosPim.find((item) => String(item.codigo) === String(linha.atributo_pim_codigo ?? ''));
      return {
        campo_concorrente: linha.campo_concorrente,
        codigo_normalizado: linha.codigo_normalizado,
        nosso_atributo_codigo: linha.atributo_pim_codigo ?? '',
        nosso_atributo_descricao: atributo?.nome_exibido ?? linha.atributo_pim_nome ?? '',
        status: linha.status,
        ocorrencias: linha.ocorrencias,
        exemplos: linha.exemplos
      };
    });
    const atributos = atributosPim.map((atributo) => ({
      nosso_atributo_codigo: atributo.codigo,
      nosso_atributo_descricao: atributo.nome_exibido,
      grupo: atributo.grupo ?? '',
      ativo: atributo.ativo !== false ? 'SIM' : 'NAO'
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dePara), 'DePara');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(atributos), 'Atributos_PIM');
    XLSX.writeFile(workbook, `pim-depara-concorrente-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function importarDePara(arquivo?: File) {
    if (!arquivo) return;
    setErro('');
    try {
      const leitura = await lerArquivoImportacaoPim(arquivo);
      const linhasArquivo = leitura.linhas;
      let alterados = 0;
      setLinhas((atuais) => atuais.map((linha) => {
        const encontrado = linhasArquivo.find((item: RegistroGenerico) => normalizarTextoPim(item.campo_concorrente ?? item.codigo_normalizado ?? '') === normalizarTextoPim(linha.campo_concorrente ?? linha.codigo_normalizado ?? ''));
        const destinoInformado = String(encontrado?.nosso_atributo_codigo ?? encontrado?.atributo_pim_codigo ?? encontrado?.destino ?? encontrado?.atributo_pim ?? '').trim();
        const descricaoInformada = String(encontrado?.nosso_atributo_descricao ?? encontrado?.atributo_pim_nome ?? encontrado?.descricao_atributo ?? '').trim();
        const destino = destinoInformado || String(atributosPim.find((atributo) => normalizarTextoPim(atributo.nome_exibido ?? '') === normalizarTextoPim(descricaoInformada))?.codigo ?? '');
        if (!encontrado || !destino) return linha;
        alterados += 1;
        return {
          ...linha,
          atributo_pim_codigo: destino,
          atributo_pim_nome: atributosPim.find((item) => String(item.codigo) === destino)?.nome_exibido ?? '',
          status: 'VINCULADO',
          existe_no_pim: true
        };
      }));
      setMensagem(`${alterados} vínculo(s) carregado(s) da planilha. Revise e clique em Salvar De/Para.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao importar planilha de De/Para.');
    }
  }

  const colunas = ['campo_concorrente', 'codigo_normalizado', 'atributo_pim_codigo', 'atributo_pim_nome', 'status', 'ocorrencias', 'exemplos'];

  return <div className="pimShell">
    {erro && <div className="alertaErro">{erro}</div>}
    {mensagem && <div className="alertaSucesso">{mensagem}</div>}
    <section className="pimBloco">
      <div className="pimBlocoTopo pimDeParaTopo">
        <div>
          <h3>De/Para de concorrentes</h3>
          <small>Selecione o concorrente, revise todos os campos encontrados e vincule aos atributos do Cadastro Central.</small>
        </div>
      </div>
      <div className="pimDeParaBarraAcoes">
        <div className="pimDeParaFornecedor">
          <span>Concorrente</span>
          <select value={fonteId} onChange={(e) => setFonteId(e.target.value)}>
            <option value="">Selecione um concorrente</option>
            {fontes.map((fonte) => <option key={String(fonte.id)} value={String(fonte.id)}>{String(fonte.nome)}</option>)}
          </select>
        </div>
        <div className="acoesDetalhe pimDeParaAcoes">
          <button type="button" className="ghost" onClick={() => carregarDePara()} disabled={carregando}><RefreshCw size={15} />Atualizar</button>
          <button type="button" className="ghost" onClick={exportarDePara} disabled={!linhas.length}><Download size={15} />Exportar</button>
          <label className="ghost botaoArquivoPim"><FileUp size={15} />Importar<input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={(e) => importarDePara(e.target.files?.[0])} /></label>
          <button type="button" className="primary" onClick={salvarDePara} disabled={carregando || !fonteId}>{carregando ? 'Salvando...' : 'Salvar De/Para'}</button>
        </div>
      </div>
      <div className="pimAtributosResumo">
        <div><span>Campos do concorrente mapeados</span><strong>{Number(resumo.percentual_concorrente_mapeado ?? 0).toFixed(2)}%</strong><small>{String(resumo.campos_concorrente_vinculados ?? 0)} de {String(resumo.total_campos_concorrente ?? 0)}</small></div>
        <div><span>Atributos PIM entregues</span><strong>{Number(resumo.percentual_pim_entregue ?? 0).toFixed(2)}%</strong><small>{String(resumo.atributos_pim_entregues ?? 0)} de {String(resumo.total_atributos_pim ?? 0)}</small></div>
        <div><span>Campos sem De/Para</span><strong>{String(resumo.campos_concorrente_sem_depara ?? 0)}</strong></div>
        <div><span>Atributos PIM não entregues</span><strong>{String(resumo.atributos_pim_nao_entregues ?? 0)}</strong></div>
      </div>
      <div className="pimDeParaFiltros">
        <input placeholder="Buscar campo, destino, exemplo ou status" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="TODOS">Todos os campos encontrados</option>
          <option value="CONCORRENTE_SEM_DEPARA">Concorrente tem e não temos vínculo</option>
          <option value="PIM_SEM_CAMPO_CONCORRENTE">Nós temos e ele não entrega</option>
          <option value="VINCULADOS">Vinculados</option>
        </select>
      </div>
      {filtro === 'PIM_SEM_CAMPO_CONCORRENTE' ? (
        <TabelaPimCompacta
          titulo="Atributos PIM não entregues pelo concorrente"
          nomeArquivo="pim-atributos-nao-entregues"
          linhas={linhasFiltradas}
          colunas={['atributo_pim_codigo', 'atributo_pim_nome', 'grupo', 'status']}
          vazio="Todos os atributos PIM possuem algum campo vinculado neste concorrente."
          renderAcoes={(linha) => <select value="" onChange={(e) => vincularCampoConcorrenteAoAtributo(String(linha.atributo_pim_codigo), e.target.value)}><option value="">Vincular campo do concorrente</option>{linhas.filter((campo) => String(campo.atributo_pim_codigo ?? '') !== String(linha.atributo_pim_codigo)).map((campo) => <option key={String(campo.codigo_normalizado)} value={String(campo.codigo_normalizado)}>{String(campo.campo_concorrente)} · {String(campo.exemplos ?? '').slice(0, 60)}</option>)}</select>}
        />
      ) : (
        <TabelaPimCompacta
          titulo="Campos encontrados no concorrente"
          nomeArquivo="pim-depara-concorrente"
          linhas={linhasFiltradas}
          colunas={colunas}
          vazio="Nenhum campo encontrado para este concorrente."
          renderAcoes={(linha) => <select value={String(linha.atributo_pim_codigo ?? '')} onChange={(e) => atualizarLinha(String(linha.codigo_normalizado), e.target.value)}><option value="">Sem vínculo</option>{atributosPim.map((atributo) => <option key={String(atributo.codigo)} value={String(atributo.codigo)}>{String(atributo.nome_exibido)} · {String(atributo.codigo)}</option>)}</select>}
        />
      )}
    </section>
  </div>;
}

export function ComparacaoConcorrentesPim() {
  const [fontes, setFontes] = useState<RegistroGenerico[]>([]);
  const [produtos, setProdutos] = useState<RegistroGenerico[]>([]);
  const [comparacoes, setComparacoes] = useState<RegistroGenerico[]>([]);
  const [coberturasConcorrentes, setCoberturasConcorrentes] = useState<RegistroGenerico[]>([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<number | null>(() => {
    const valor = Number(new URLSearchParams(window.location.search).get('produto_id'));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  });
  const [matriz, setMatriz] = useState<RegistroGenerico | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [fontesFiltro, setFontesFiltro] = useState<string[]>([]);
  const [filtroConcorrentesAberto, setFiltroConcorrentesAberto] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState('Todos');
  const [somenteDiferencas, setSomenteDiferencas] = useState(false);
  const [somenteComDados, setSomenteComDados] = useState(false);
  const [listaProdutosRecolhida, setListaProdutosRecolhida] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [modoDetalhe, setModoDetalhe] = useState(false);
  const [modalFonteId, setModalFonteId] = useState<number | null>(null);
  const [urlFonte, setUrlFonte] = useState('');
  const [deParaTexto, setDeParaTexto] = useState('');
  const [revisaoFonte, setRevisaoFonte] = useState<RegistroGenerico | null>(null);
  const [pendenciasDePara, setPendenciasDePara] = useState<Record<string, string>>({});
  const [buscaDePara, setBuscaDePara] = useState('');
  const [mostrarMapeados, setMostrarMapeados] = useState(true);
  const [consolidadoEditado, setConsolidadoEditado] = useState<Record<string, string>>({});
  const [enriquecimentoAberto, setEnriquecimentoAberto] = useState(false);
  const [fontesEnriquecimento, setFontesEnriquecimento] = useState<number[]>([]);
  const [progressoEnriquecimento, setProgressoEnriquecimento] = useState({ atual: 0, total: 0 });
  const [carregandoFonte, setCarregandoFonte] = useState(false);
  const [progressoFonte, setProgressoFonte] = useState({ atual: 0, total: 0 });
  const [midiaProduto, setMidiaProduto] = useState<RegistroGenerico[]>([]);
  const [modalMidia, setModalMidia] = useState<'IMAGEM' | 'MANUAL' | null>(null);
  const [midiaSelecionada, setMidiaSelecionada] = useState<RegistroGenerico | null>(null);
  const [midiasMarcadas, setMidiasMarcadas] = useState<string[]>([]);
  const [filtroMidiaFonte, setFiltroMidiaFonte] = useState('TODAS');
  const [salvandoMidia, setSalvandoMidia] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [erroEnriquecimento, setErroEnriquecimento] = useState('');

  const normalizarChave = (valor: unknown) => String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const normalizarTextoBusca = (valor: unknown) => String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

  const possuiValor = (valor: unknown) => valor !== null && valor !== undefined && String(valor).trim() !== '';

  function atendeBuscaLike(texto: unknown, consulta: unknown) {
    const termoOriginal = String(consulta ?? '').trim();
    if (!termoOriginal) return true;
    const textoNormalizado = normalizarTextoBusca(texto);
    if (termoOriginal.includes('%')) {
      const partes = termoOriginal.split('%').map((parte) => normalizarTextoBusca(parte)).filter(Boolean);
      let cursor = 0;
      return partes.every((parte) => {
        const indice = textoNormalizado.indexOf(parte, cursor);
        if (indice < 0) return false;
        cursor = indice + parte.length;
        return true;
      });
    }
    return normalizarTextoBusca(termoOriginal).split(' ').filter(Boolean).every((parte) => textoNormalizado.includes(parte));
  }

  const fontesConcorrentes = fontes.filter((item) => item.tipo_fonte === 'CONCORRENTE' && item.ativo !== false);
  const produtosConjuntos = produtos.filter(ehConjuntoClimatizacao);

  function separarCodigosModelo(valor: unknown) {
    return String(valor ?? '')
      .split(/\s*(?:\||;|,|\/|\s+e\s+|\s+ou\s+)\s*/i)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function urlEhPaginaBusca(url: unknown) {
    try {
      const endereco = new URL(String(url ?? ''));
      const caminho = endereco.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      return caminho === '/search' || caminho === '/busca' || caminho.includes('/catalogsearch/result') || caminho.includes('/searchresults');
    } catch {
      return false;
    }
  }

  function registrosConcorrenteProduto(produto: RegistroGenerico, fonte?: RegistroGenerico) {
    const chave = normalizarChave(produto.modelo ?? produto.codigo_fabricante);
    return comparacoes
      .filter((item) => item.tipo_fonte === 'CONCORRENTE')
      .filter((item) => !urlEhPaginaBusca(item.anuncio_url))
      .filter((item) => !fonte || Number(item.fonte_id) === Number(fonte.id) || String(item.fonte_codigo) === String(fonte.codigo))
      .filter((item) => Number(item.produto_id) === Number(produto.id) || (chave && String(item.chave_normalizada ?? '') === chave));
  }

  function registroContemCodigoModelo(registro: RegistroGenerico, codigo: string) {
    const dados = registro.dados && typeof registro.dados === 'object' ? registro.dados as RegistroGenerico : {};
    const confianca = dados._CONFIANCA_MODELO && typeof dados._CONFIANCA_MODELO === 'object' ? dados._CONFIANCA_MODELO as RegistroGenerico : {};
    const candidatos = [
      ...(Array.isArray(confianca.codigos_encontrados) ? confianca.codigos_encontrados : []),
      registro.modelo,
      dados.MODELO_ALFA_NUMERICO,
      dados.MODELO,
      dados.CODIGO_FABRICANTE,
      dados.MPN,
      dados.REFERENCIA,
      dados.REF
    ];
    return candidatos
      .flatMap((valor) => separarCodigosModelo(valor))
      .some((valor) => normalizarChave(valor) === normalizarChave(codigo) || normalizarChave(valor).includes(normalizarChave(codigo)));
  }

  function coberturaProduto(produto: RegistroGenerico) {
    const codigos = separarCodigosModelo(produto.modelo ?? produto.codigo_fabricante);
    const coberturasProduto = coberturasConcorrentes.filter((item) => Number(item.produto_id) === Number(produto.id));
    const fontes = fontesConcorrentes.map((fonte) => {
      const coberturaSalva = coberturasProduto.find((item) => Number(item.fonte_id) === Number(fonte.id) || String(item.fonte_codigo) === String(fonte.codigo));
      const encontradosSalvos = Array.isArray(coberturaSalva?.codigos_encontrados) ? coberturaSalva?.codigos_encontrados : [];
      const registros = coberturaSalva ? [] : registrosConcorrenteProduto(produto, fonte);
      const encontrados = coberturaSalva
        ? codigos.filter((codigo) => encontradosSalvos.some((item) => normalizarChave(item) === normalizarChave(codigo)))
        : codigos.filter((codigo) => registros.some((registro) => registroContemCodigoModelo(registro, codigo)));
      const status = encontrados.length === 0 ? 'cinza' : encontrados.length === codigos.length ? 'verde' : 'vermelho';
      return { fonte, encontrados, status };
    });
    const codigosEncontrados = codigos.filter((codigo) => fontes.some((fonte) => fonte.encontrados.some((item) => normalizarChave(item) === normalizarChave(codigo))));
    const status = codigos.length === 0 || codigosEncontrados.length === 0 ? 'cinza' : codigosEncontrados.length === codigos.length ? 'verde' : 'vermelho';
    return { codigos, fontes, codigosEncontrados, status };
  }

  function fontesComDadosProduto(produto: RegistroGenerico) {
    return new Set(coberturaProduto(produto).fontes.filter((item) => item.encontrados.length > 0).map((item) => String(item.fonte.fonte_codigo ?? item.fonte.codigo ?? item.fonte.id)));
  }

  const produtosFiltrados = produtosConjuntos.filter((produto) => {
    const textoProduto = normalizarTextoBusca([
      produto.codigo_erp_decis,
      produto.codigo_interno,
      produto.sku_interno,
      produto.modelo,
      produto.codigo_fabricante,
      produto.nome_comercial,
      produto.descricao_interna,
      produto.descricao,
      produto.marca,
      produto.linha,
      produto.familia,
      produto.categoria,
      produto.tipo_produto
    ].filter(Boolean).join(' '));
    if (!atendeBuscaLike(textoProduto, buscaProduto)) return false;
    const fontesProduto = fontesComDadosProduto(produto);
    if (fontesFiltro.length > 0 && !fontesFiltro.some((codigo) => fontesProduto.has(codigo))) return false;
    return true;
  });

  async function carregar() {
    setErro('');
    try {
      const [fontesRetorno, produtosRetorno, coberturasRetorno] = await Promise.all([
        listarFontesComparacaoPim(),
        listarProdutosPim(),
        listarCoberturaConcorrentesPim()
      ]);
      setFontes(fontesRetorno);
      setProdutos(produtosRetorno);
      setCoberturasConcorrentes(coberturasRetorno);
      setComparacoes([]);
      const conjuntos = produtosRetorno.filter(ehConjuntoClimatizacao);
      if (!produtoSelecionadoId && conjuntos[0]?.id) setProdutoSelecionadoId(Number(conjuntos[0].id));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar a matriz de concorrentes.');
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!produtoSelecionadoId) {
      setMatriz(null);
      setMidiaProduto([]);
      return;
    }
    Promise.all([
      obterMatrizComparacaoProdutoPim(produtoSelecionadoId),
      listarCandidatosMidiaProdutoPim(produtoSelecionadoId),
      listarComparacoesProdutoPim(produtoSelecionadoId)
    ])
      .then(([dados, candidatos, comparacoesProduto]) => {
        setMatriz(dados);
        setMidiaProduto(candidatos);
        setComparacoes(comparacoesProduto);
        setGrupoSelecionado('Todos');
      })
      .catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar o cadastro completo do Conjunto.'));
  }, [produtoSelecionadoId]);

  const produtoSelecionado = (matriz?.produto ?? produtosConjuntos.find((item) => Number(item.id) === Number(produtoSelecionadoId))) as RegistroGenerico | undefined;
  const fontesMatriz = ((matriz?.fontes ?? fontesConcorrentes) as RegistroGenerico[]).filter((item) => item.tipo_fonte === 'CONCORRENTE' || !item.tipo_fonte);
  const codigosPublicacao = new Set(['SHOPPUB', 'ANYMARKET', 'ML', 'AMAZON', 'SHOPEE', 'B2W', 'CASAS_B', 'VALIDACAO_SAMARA', 'VALIDACAO_SANDRO']);
  const atributosMatriz = ((matriz?.atributos ?? []) as RegistroGenerico[]).filter((item) => {
    const grupo = normalizarChave(item.grupo ?? '');
    const codigo = normalizarChave(item.codigo ?? '');
    return grupo !== 'PUBLICACAO' && !codigosPublicacao.has(codigo);
  });
  const atributosParaDePara = Array.from(new Map(atributosMatriz.map((item) => [String(item.codigo), item])).values()).sort((a, b) => String(a.nome ?? a.codigo).localeCompare(String(b.nome ?? b.codigo), 'pt-BR'));

  useEffect(() => {
    const consolidado = matriz?.consolidado && typeof matriz.consolidado === 'object' ? matriz.consolidado as Record<string, unknown> : {};
    const manual = Object.fromEntries(Object.entries(consolidado).map(([codigo, valor]) => [codigo, String(valor && typeof valor === 'object' ? (valor as Record<string, unknown>).valor ?? '' : valor ?? '')]));
    setConsolidadoEditado(manual);
  }, [matriz]);

  function valorConsolidadoAutomatico(linha: RegistroGenerico) {
    const ocorrencias = new Map<string, { valor: string; quantidade: number }>();
    fontesMatriz.forEach((fonte) => {
      const valor = valorDaFonte(linha, fonte)?.valor;
      if (!possuiValor(valor)) return;
      const chave = normalizarChave(valor);
      const atual = ocorrencias.get(chave);
      ocorrencias.set(chave, { valor: atual?.valor ?? String(valor), quantidade: (atual?.quantidade ?? 0) + 1 });
    });
    return Array.from(ocorrencias.values()).sort((a, b) => b.quantidade - a.quantidade || a.valor.localeCompare(b.valor, 'pt-BR'))[0]?.valor ?? '';
  }

  function valorConsolidado(linha: RegistroGenerico) {
    const manual = consolidadoEditado[String(linha.codigo)];
    return manual !== undefined ? manual : valorConsolidadoAutomatico(linha);
  }

  async function salvarConsolidadoLocal(codigo: string, valor: string) {
    if (!produtoSelecionadoId) return;
    setConsolidadoEditado((atual) => ({ ...atual, [codigo]: valor }));
    try {
      await salvarConsolidadoComparacaoPim(produtoSelecionadoId, { codigo, valor });
      setMensagem(`Consolidado do atributo ${codigo} salvo.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar o Consolidado.');
    }
  }

  function abrirEnriquecimento() {
    setErroEnriquecimento('');
    setFontesEnriquecimento(fontesElegiveisEnriquecimento.map((fonte) => Number(fonte.id)).filter(Boolean));
    setProgressoEnriquecimento({ atual: 0, total: 0 });
    setEnriquecimentoAberto(true);
  }

  function fecharEnriquecimento() {
    if (carregandoFonte) return;
    setEnriquecimentoAberto(false);
    setErroEnriquecimento('');
  }

  async function executarEnriquecimento() {
    setErroEnriquecimento('');
    if (!produtoSelecionadoId || fontesEnriquecimento.length === 0) {
      setErroEnriquecimento('Selecione ao menos um concorrente com cobertura verde ou parcial para o enriquecimento cadastral.');
      return;
    }
    const produtoModelo = String(produtoSelecionado?.modelo ?? produtoSelecionado?.codigo_fabricante ?? '');
    setCarregandoFonte(true);
    setProgressoEnriquecimento({ atual: 0, total: fontesEnriquecimento.length });
    setMensagem('');
    try {
      for (const fonteId of fontesEnriquecimento) {
        const fonte = fontes.find((item) => Number(item.id) === fonteId);
        if (!fonte) continue;
        const url = urlDaFonteProduto(fonte);
        await carregarFonteComparacaoPim(fonteId, {
          url,
          produto_id: produtoSelecionadoId,
          chave_original: produtoModelo,
          salvar_url_base: false
        });
        setProgressoEnriquecimento((atual) => ({ ...atual, atual: atual.atual + 1 }));
      }
      await carregar();
      setMatriz(await obterMatrizComparacaoProdutoPim(produtoSelecionadoId));
      setMensagem(`Enriquecimento concluído em ${fontesEnriquecimento.length} concorrente(s).`);
      setEnriquecimentoAberto(false);
      setErroEnriquecimento('');
    } catch (error) {
      setErroEnriquecimento(error instanceof Error ? error.message : 'Falha ao executar o enriquecimento cadastral.');
    } finally {
      setCarregandoFonte(false);
    }
  }

  function urlDaFonteProduto(fonte: RegistroGenerico) {
    const registroComparacao = comparacoes.find((item) => Number(item.fonte_id) === Number(fonte.id) && Number(item.produto_id) === Number(produtoSelecionadoId) && !urlEhPaginaBusca(item.anuncio_url));
    if (registroComparacao?.anuncio_url) return String(registroComparacao.anuncio_url);

    const registroMatriz = ((matriz?.registros_fontes ?? []) as RegistroGenerico[]).find((item) => Number(item.fonte_id) === Number(fonte.id) && Number(item.produto_id) === Number(produtoSelecionadoId) && !urlEhPaginaBusca(item.anuncio_url));
    if (registroMatriz?.anuncio_url) return String(registroMatriz.anuncio_url);

    const cobertura = coberturasConcorrentes.find((item) => Number(item.produto_id) === Number(produtoSelecionadoId) && (Number(item.fonte_id) === Number(fonte.id) || String(item.fonte_codigo) === String(fonte.codigo)) && !urlEhPaginaBusca(item.anuncio_url));
    return String(cobertura?.anuncio_url ?? '');
  }

  function abrirModalMidia(tipo: 'IMAGEM' | 'MANUAL') {
    const candidatos = midiaProduto.filter((item) => String(item.tipo) === tipo);
    setModalMidia(tipo);
    setFiltroMidiaFonte('TODAS');
    setMidiasMarcadas([]);
    setMidiaSelecionada(candidatos[0] ?? null);
  }

  function alternarMidiaMarcada(candidato: RegistroGenerico) {
    const url = String(candidato.url ?? '');
    setMidiasMarcadas((atual) => atual.includes(url) ? atual.filter((item) => item !== url) : [...atual, url]);
  }

  function fecharModalMidia() {
    if (salvandoMidia) return;
    setModalMidia(null);
    setMidiaSelecionada(null);
    setMidiasMarcadas([]);
    setFiltroMidiaFonte('TODAS');
  }

  function baixarMidia(candidato: RegistroGenerico) {
    const link = document.createElement('a');
    link.href = String(candidato.url ?? '');
    link.download = String(candidato.nome ?? candidato.titulo ?? `midia-${candidato.tipo ?? 'arquivo'}`);
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function imprimirMidia(candidato: RegistroGenerico) {
    const url = String(candidato.url ?? '');
    const janela = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
    if (!janela) return;
    const elemento = candidato.tipo === 'IMAGEM' ? janela.document.createElement('img') : janela.document.createElement('iframe');
    elemento.setAttribute('src', url);
    elemento.setAttribute('style', 'border:0;display:block;height:100%;width:100%;object-fit:contain;');
    janela.document.title = String(candidato.titulo ?? candidato.fonte_nome ?? 'Material do produto');
    janela.document.body.style.margin = '0';
    janela.document.body.appendChild(elemento);
    elemento.addEventListener('load', () => janela.print());
  }

  async function aprovarMidiasSelecionadas() {
    if (!produtoSelecionadoId || !modalMidia) return;
    const candidatos = midiaProduto.filter((item) => String(item.tipo) === modalMidia && midiasMarcadas.includes(String(item.url)));
    if (candidatos.length === 0) {
      setErro('Selecione ao menos um material para usar no anúncio.');
      return;
    }
    setSalvandoMidia(true);
    setErro('');
    try {
      for (const [indice, candidato] of candidatos.entries()) {
        await salvarAssetPim({
          nome: `${candidato.tipo === 'IMAGEM' ? 'Imagem' : 'Manual'} - ${String(produtoSelecionado?.nome_comercial ?? produtoSelecionado?.modelo ?? 'Produto')}`,
          tipo: candidato.tipo === 'IMAGEM' ? 'IMAGEM_PRINCIPAL' : 'MANUAL',
          url: candidato.url,
          texto_alternativo: String(produtoSelecionado?.nome_comercial ?? produtoSelecionado?.modelo ?? ''),
          marca: candidato.marca ?? produtoSelecionado?.marca,
          modelo: candidato.modelo ?? produtoSelecionado?.modelo,
          produto_ids: [produtoSelecionadoId],
          tipo_vinculo: candidato.tipo === 'IMAGEM' ? (indice === 0 ? 'PRINCIPAL' : 'SECUNDARIA') : 'DOCUMENTO',
          principal: candidato.tipo === 'IMAGEM' && indice === 0
        });
      }
      const urlsSalvas = new Set(candidatos.map((item) => String(item.url)));
      setMensagem(`${candidatos.length} material(is) escolhido(s) e gravado(s) para o Conjunto selecionado.`);
      setMidiaProduto((atual) => atual.map((item) => urlsSalvas.has(String(item.url)) ? { ...item, status: 'ESCOLHIDO' } : item));
      setMidiasMarcadas([]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao gravar os materiais escolhidos.');
    } finally {
      setSalvandoMidia(false);
    }
  }
  const grupos = ['Todos', ...Array.from(new Set(atributosMatriz.map((item) => String(item.grupo ?? 'Atributos ERP')).filter(Boolean)))];

  function valoresDaFonte(linha: RegistroGenerico) {
    return (Array.isArray(linha.valores_fontes) ? linha.valores_fontes : []) as RegistroGenerico[];
  }

  function valorDaFonte(linha: RegistroGenerico, fonte: RegistroGenerico) {
    return valoresDaFonte(linha).find((item) => Number(item.fonte_id) === Number(fonte.id) || String(item.fonte_codigo) === String(fonte.codigo));
  }

  function estadoDaCelula(erp: unknown, fonte: RegistroGenerico | undefined) {
    if (!fonte || !possuiValor(fonte.valor)) return 'sem-dado';
    if (!possuiValor(erp)) return 'sem-erp';
    return normalizarChave(erp) === normalizarChave(fonte.valor) ? 'concordante' : 'divergente';
  }

  const linhasMatriz = atributosMatriz
    .filter((item) => grupoSelecionado === 'Todos' || String(item.grupo ?? 'Atributos ERP') === grupoSelecionado)
    .filter((item) => {
      if (!somenteComDados) return true;
      return possuiValor(item.valor_erp) || fontesMatriz.some((fonte) => possuiValor(valorDaFonte(item, fonte)?.valor));
    })
    .filter((item) => {
      if (!somenteDiferencas) return true;
      return fontesMatriz.some((fonte) => estadoDaCelula(item.valor_erp, valorDaFonte(item, fonte)) === 'divergente');
    });

  function abrirModalFonte(fonte: RegistroGenerico) {
    const regras = (fonte.regras && typeof fonte.regras === 'object' ? fonte.regras : {}) as RegistroGenerico;
    const dePara = { ...DEPARA_CONCORRENTE_PADRAO_UI, ...((regras.de_para && typeof regras.de_para === 'object' ? regras.de_para : {}) as RegistroGenerico) };
    const registroProdutoFonte = comparacoes.find((item) => Number(item.fonte_id) === Number(fonte.id) && Number(item.produto_id) === Number(produtoSelecionadoId));
    const registroDetalhado = ((matriz?.registros_fontes ?? []) as RegistroGenerico[]).find((item) => Number(item.fonte_id) === Number(fonte.id) && Number(item.produto_id) === Number(produtoSelecionadoId));
    const urlSalvaProduto = urlDaFonteProduto(fonte);
    const camposPendentes = (Array.isArray(registroDetalhado?.campos_pendentes) ? registroDetalhado?.campos_pendentes : []) as RegistroGenerico[];
    const camposMapeados = (Array.isArray(registroDetalhado?.campos_mapeados) ? registroDetalhado?.campos_mapeados : []) as RegistroGenerico[];
    const camposTodos = Array.from(new Map([...camposPendentes, ...camposMapeados].map((campo) => [String(campo.origem), campo])).values());
    setModalFonteId(Number(fonte.id));
    setUrlFonte(urlSalvaProduto);
    setRevisaoFonte(registroDetalhado ?? null);
    setPendenciasDePara(Object.fromEntries(camposTodos.map((campo) => [String(campo.origem), String(campo.destino_sugerido ?? '')])));
    setBuscaDePara('');
    setMostrarMapeados(true);
    setDeParaTexto(Object.entries(dePara).map(([origem, destino]) => `${origem}|${String(destino)}`).join('\n'));
    setErro('');
    setMensagem('');
  }

  function fecharModalFonte() {
    setModalFonteId(null);
    setUrlFonte('');
    setDeParaTexto('');
    setRevisaoFonte(null);
    setPendenciasDePara({});
    setBuscaDePara('');
    setMostrarMapeados(false);
  }

  async function atualizarFonteSelecionada() {
    const fonte = fontes.find((item) => Number(item.id) === Number(modalFonteId));
    if (!fonte || !produtoSelecionadoId) {
      setErro('Selecione um Conjunto e uma fonte antes de atualizar os dados.');
      return;
    }
    if (urlFonte.trim() && !/^https?:\/\//i.test(urlFonte.trim())) {
      setErro('Informe uma URL http(s) válida para o site ou anúncio da fonte, ou deixe em branco para buscar pelo Modelo.');
      return;
    }
    setCarregandoFonte(true);
    setErro('');
    setMensagem('');
    try {
      const deParaBase = Object.fromEntries(deParaTexto.split(/\r?\n/).map((linha) => linha.split('|').map((item) => item.trim())).filter(([origem, destino]) => Boolean(origem && destino)));
      const deParaPendencias = Object.fromEntries(Object.entries(pendenciasDePara).filter(([origem, destino]) => Boolean(origem && destino)));
      const dePara = { ...deParaBase, ...deParaPendencias };
      await salvarFonteComparacaoPim({
        ...fonte,
        url_base: String(fonte.url_base ?? ''),
        regras: { ...((fonte.regras ?? {}) as RegistroGenerico), de_para: dePara }
      });
      await carregarFonteComparacaoPim(Number(fonte.id), {
        url: urlFonte.trim(),
        produto_id: produtoSelecionadoId,
        chave_original: String(produtoSelecionado?.modelo ?? produtoSelecionado?.codigo_fabricante ?? ''),
        salvar_url_base: false
      });
      const novaMatriz = await obterMatrizComparacaoProdutoPim(produtoSelecionadoId);
      setMatriz(novaMatriz);
      await carregar();
      setMensagem(`${String(fonte.nome)} atualizado e mapeado para o Conjunto selecionado${urlFonte.trim() ? ' pela URL informada' : ' pela busca do Modelo'}.`);
      fecharModalFonte();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar os dados da fonte concorrente.');
    } finally {
      setCarregandoFonte(false);
    }
  }

  async function carregarTodosConjuntosFonte() {
    const fonte = fontes.find((item) => Number(item.id) === Number(modalFonteId));
    const template = urlFonte.trim();
    if (!fonte || !template) {
      setErro('Informe a URL-base ou template da fonte antes de iniciar a carga em lote.');
      return;
    }
    if (!/\{(MODELO|SKU|ITEM|CODIGO)\}/i.test(template)) {
      setErro('Para carregar todos, use um template com {MODELO}, {SKU}, {ITEM} ou {CODIGO}. Para um único produto, use a ação de atualização normal.');
      return;
    }
    const dePara = Object.fromEntries(deParaTexto.split(/\r?\n/).map((linha) => linha.split('|').map((item) => item.trim())).filter(([origem, destino]) => Boolean(origem && destino)));
    const produtosParaCarregar = produtosConjuntos.slice();
    let cursor = 0;
    let sucesso = 0;
    let falhas = 0;
    setCarregandoFonte(true);
    setProgressoFonte({ atual: 0, total: produtosParaCarregar.length });
    setErro('');
    setMensagem('');
    try {
      await salvarFonteComparacaoPim({
        ...fonte,
        url_base: String(fonte.url_base ?? ''),
        regras: { ...((fonte.regras ?? {}) as RegistroGenerico), de_para: dePara }
      });
      const worker = async () => {
        while (true) {
          const indice = cursor++;
          if (indice >= produtosParaCarregar.length) return;
          const produto = produtosParaCarregar[indice];
          const modelo = encodeURIComponent(String(produto.modelo ?? produto.codigo_fabricante ?? ''));
          const sku = encodeURIComponent(String(produto.codigo_erp_decis ?? produto.codigo_interno ?? ''));
          const url = template
            .replace(/\{MODELO\}/gi, modelo)
            .replace(/\{SKU\}/gi, sku)
            .replace(/\{ITEM\}/gi, sku)
            .replace(/\{CODIGO\}/gi, sku);
          try {
            await carregarFonteComparacaoPim(Number(fonte.id), {
              url,
              produto_id: Number(produto.id),
              chave_original: String(produto.modelo ?? produto.codigo_fabricante ?? ''),
              salvar_url_base: false
            });
            sucesso += 1;
          } catch {
            falhas += 1;
          } finally {
            setProgressoFonte((atual) => ({ ...atual, atual: atual.atual + 1 }));
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      await carregar();
      if (produtoSelecionadoId) setMatriz(await obterMatrizComparacaoProdutoPim(produtoSelecionadoId));
      setMensagem(`Carga concluída: ${sucesso} Conjuntos atualizados${falhas ? ` e ${falhas} falha(s) para revisar` : ''}.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao iniciar a carga em lote.');
    } finally {
      setCarregandoFonte(false);
    }
  }

  const produtoDetalheCampos = [
    ['ITEM', produtoSelecionado?.codigo_erp_decis ?? produtoSelecionado?.codigo_interno],
    ['DESCRIÇÃO', produtoSelecionado?.nome_comercial],
    ['MODELO', produtoSelecionado?.modelo],
    ['CÓDIGO DO FABRICANTE', produtoSelecionado?.codigo_fabricante],
    ['MARCA', produtoSelecionado?.marca],
    ['CATEGORIA', produtoSelecionado?.categoria],
    ['NCM', produtoSelecionado?.ncm],
    ['STATUS', produtoSelecionado?.status]
  ];
    const fonteModal = fontes.find((item) => Number(item.id) === Number(modalFonteId));
  const camposPendentesFonte = (Array.isArray(revisaoFonte?.campos_pendentes) ? revisaoFonte?.campos_pendentes : []) as RegistroGenerico[];
  const camposMapeadosFonte = (Array.isArray(revisaoFonte?.campos_mapeados) ? revisaoFonte?.campos_mapeados : []) as RegistroGenerico[];
  const camposTodosFonte = Array.from(new Map([...camposPendentesFonte, ...camposMapeadosFonte].map((campo) => [String(campo.origem), campo])).values());
  const termosDePara = normalizarTextoBusca(buscaDePara).split(' ').filter(Boolean);
  const camposVisiveisFonte = (mostrarMapeados ? camposTodosFonte : camposPendentesFonte).filter((campo) => {
    if (termosDePara.length === 0) return true;
    const texto = normalizarTextoBusca([campo.origem, campo.valor].filter(Boolean).join(' '));
    return termosDePara.every((termo) => texto.includes(termo));
  });
  function sugerirAtributoPim(origem: unknown) {
    const termo = normalizarTextoBusca(origem);
    return atributosParaDePara.find((atributo) => {
      const codigo = normalizarTextoBusca(atributo.codigo);
      const nome = normalizarTextoBusca(atributo.nome);
      return termo && (termo === codigo || termo === nome || termo.includes(codigo) || codigo.includes(termo) || termo.includes(nome) || nome.includes(termo));
    });
  }
    const coberturaSelecionada = produtoSelecionado ? coberturaProduto(produtoSelecionado) : { codigos: [], codigosEncontrados: [], fontes: [], status: 'cinza' };
  // Verde = modelo completo; parcial/amarelo = ao menos um código encontrado.
  // A classe visual legada do parcial continua "vermelho" fora deste modal; a regra de seleção usa a cobertura real.
  const fontesElegiveisEnriquecimento = fontesMatriz.filter((fonte) => {
    const coberturaFonte = coberturaSelecionada.fontes.find((item) => Number(item.fonte.id) === Number(fonte.id));
    return Boolean(coberturaFonte && coberturaFonte.encontrados.length > 0);
  });
  const fontesMidia = Array.from(new Map(midiaProduto.filter((item) => !modalMidia || String(item.tipo) === modalMidia).map((item) => [String(item.fonte_codigo ?? item.fonte_id ?? item.fonte_nome ?? 'FONTE'), String(item.fonte_nome ?? item.fonte_codigo ?? 'Fonte')])).entries()).map(([codigo, nome]) => ({ codigo, nome }));
  const midiaVisiveisModal = midiaProduto.filter((item) => String(item.tipo) === String(modalMidia) && (filtroMidiaFonte === 'TODAS' || String(item.fonte_codigo ?? item.fonte_id ?? item.fonte_nome ?? 'FONTE') === filtroMidiaFonte));

  return (
    <section className="painelTabela pimTelaAvancada pimMatrizTela">
      <header className="pimMatrizTopoTela">
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>{modoDetalhe ? 'Ficha completa do Conjunto' : 'Matriz de Concorrentes'}</h2>
          <p>{modoDetalhe ? 'Modo foco: a lista e os filtros de outros produtos foram ocultados.' : 'Selecione um Conjunto ERP para comparar os 111 atributos da planilha com cada concorrente.'}</p>
        </div>
        <div className="pimMatrizTopoAcoes">
          {produtoSelecionado && <button type="button" className="ghost" onClick={() => setModoDetalhe((atual) => !atual)}>{modoDetalhe ? <><ChevronLeft size={15} />Voltar à matriz</> : <><Maximize2 size={15} />Ver produto inteiro</>}</button>}
          {produtoSelecionado && !modoDetalhe && <button type="button" className="ghost" onClick={() => setListaProdutosRecolhida((atual) => !atual)}>{listaProdutosRecolhida ? <><PackageSearch size={15} />Mostrar lista de produtos</> : <><ChevronLeft size={15} />Recolher lista de produtos</>}</button>}
          <button type="button" className={configAberta ? 'primary' : 'ghost'} onClick={() => setConfigAberta((atual) => !atual)}><SlidersHorizontal size={15} />{configAberta ? 'Fechar configuração' : 'Fontes e De/Para'}</button>
        </div>
      </header>
      {mensagem && <div className="sucesso pimMatrizFeedback" role="status"><span>{mensagem}</span><button type="button" className="pimMatrizFeedbackFechar" aria-label="Fechar mensagem de sucesso" title="Fechar mensagem" onClick={() => setMensagem('')}><X size={16} /></button></div>}
      {erro && <div className="alerta pimMatrizFeedback" role="alert"><span>{erro}</span><button type="button" className="pimMatrizFeedbackFechar" aria-label="Fechar mensagem de erro" title="Fechar mensagem" onClick={() => setErro('')}><X size={16} /></button></div>}
      <div className={`pimMatrizShell${modoDetalhe ? ' pimMatrizShellDetalhe' : ''}${listaProdutosRecolhida ? ' pimMatrizShellListaRecolhida' : ''}`}>
        {!modoDetalhe && !listaProdutosRecolhida && <aside className="pimMatrizLateral">
          <div className="pimMatrizLateralTopo">
            <div><span>Catálogo ERP</span><strong>{produtosFiltrados.length} de {produtosConjuntos.length} conjuntos</strong></div>
            <button type="button" className="ghost" onClick={carregar}>Atualizar</button>
          </div>
          <input className="pimMatrizBusca" placeholder="Buscar descrição, SKU, modelo ou marca · use % como coringa" value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} />
          <div className="pimMatrizFiltroConcorrentes">
            <button type="button" className={`pimMatrizFiltroBotao${fontesFiltro.length ? ' active' : ''}`} onClick={() => setFiltroConcorrentesAberto((atual) => !atual)}><Globe2 size={14} /><span>{fontesFiltro.length ? `${fontesFiltro.length} concorrente(s)` : 'Filtrar concorrentes'}</span><SlidersHorizontal size={13} /></button>
            {fontesFiltro.length > 0 && <button type="button" className="pimMatrizLimparFiltro" onClick={() => setFontesFiltro([])}>Limpar</button>}
            {filtroConcorrentesAberto && <div className="pimMatrizFiltroMenu"><strong>Mostrar produtos com dados em</strong>{fontesConcorrentes.map((fonte) => { const codigo = String(fonte.codigo); return <label key={String(fonte.id)}><input type="checkbox" checked={fontesFiltro.includes(codigo)} onChange={(e) => setFontesFiltro((atual) => e.target.checked ? [...atual, codigo] : atual.filter((item) => item !== codigo))} /><span>{String(fonte.nome)}</span></label>; })}<small>Selecione mais de um concorrente. O filtro usa a lógica “qualquer selecionado”.</small></div>}
          </div>
          <div className="pimMatrizLista">
            {produtosFiltrados.map((produto) => {
              const cobertura = coberturaProduto(produto);
              const selecionado = Number(produtoSelecionadoId) === Number(produto.id);
              return (
                <button type="button" className={`pimMatrizItem${selecionado ? ' active' : ''}`} key={String(produto.id)} onClick={() => setProdutoSelecionadoId(Number(produto.id))}>
                  <span className="pimMatrizItemTitulo">{String(produto.codigo_erp_decis ?? produto.codigo_interno ?? produto.id)}</span>
                  <span className="pimMatrizItemNomeLinha"><strong>{String(produto.nome_comercial ?? produto.descricao_interna ?? produto.modelo ?? 'Conjunto sem nome')}</strong></span>
                  <span className="pimMatrizItemMatches" title={`${cobertura.codigosEncontrados.length}/${cobertura.codigos.length} código(s) do Modelo encontrados entre os concorrentes`} aria-label="Encontrabilidade por concorrente">{cobertura.fontes.map((item) => <i key={String(item.fonte.id)} className={`pimSemaforoDot ${item.status}`} title={`${String(item.fonte.nome)}: ${item.encontrados.length}/${cobertura.codigos.length} código(s) encontrados`} />)}</span>
                </button>
              );
            })}
            {produtosFiltrados.length === 0 && <p className="pimMatrizVazio">Nenhum Conjunto atende aos filtros.</p>}
          </div>
        </aside>}
        <main className="pimMatrizPrincipal">
          {produtoSelecionado ? (
            <>
              <div className="pimMatrizCabecalhoProduto">
                <div>
                  <span>{String(produtoSelecionado.codigo_erp_decis ?? produtoSelecionado.codigo_interno ?? 'ITEM')}</span>
                  <h3>{String(produtoSelecionado.nome_comercial ?? produtoSelecionado.modelo ?? 'Conjunto ERP')}</h3>
                  <p>{String(produtoSelecionado.marca ?? 'Marca não informada')} · Modelo: {String(produtoSelecionado.modelo ?? produtoSelecionado.codigo_fabricante ?? 'Não informado')} · {String(produtoSelecionado.categoria ?? 'Sem categoria')}</p>
                  <div className="pimMatrizCoberturaResumo"><span>Matches por concorrente</span><small>Passe o mouse nas bolinhas ao lado de cada fonte para ver a cobertura do Modelo.</small></div>
                </div>
                <div className="pimMatrizKpis">
                  <div className="pimMatrizKpiAtributos"><span>Atributos</span><strong>{atributosMatriz.length}</strong><button type="button" className="primary pimEnriquecimentoBotao" onClick={abrirEnriquecimento}><Sparkles size={13} />Enriquecimento cadastral</button><div className="pimMatrizMidiaKpiBotoes"><button type="button" className="ghost" onClick={() => abrirModalMidia('IMAGEM')}><Globe2 size={13} />Imagens ({midiaProduto.filter((item) => item.tipo === 'IMAGEM').length})</button><button type="button" className="ghost" onClick={() => abrirModalMidia('MANUAL')}><FileUp size={13} />Manuais ({midiaProduto.filter((item) => item.tipo === 'MANUAL').length})</button></div></div>
                  <div className="pimMatrizKpiColuna"><div><span>Fontes</span><strong>{fontesMatriz.length}</strong></div><div><span>ERP preenchido</span><strong>{atributosMatriz.filter((item) => possuiValor(item.valor_erp)).length}</strong></div></div>
                </div>
                <div className="pimMatrizCabecalhoAcoes">
                  <span>Fontes-base</span>
                  {fontesMatriz.map((fonte) => { const coberturaFonte = coberturaSelecionada.fontes.find((item) => Number(item.fonte.id) === Number(fonte.id)); const encontrados = coberturaFonte?.encontrados ?? []; const statusFonte = coberturaFonte?.status ?? 'cinza'; const hintFonte = `${String(fonte.nome)}: ${encontrados.length}/${coberturaSelecionada.codigos.length} código(s) encontrados · ${statusFonte === 'verde' ? 'modelo completo' : statusFonte === 'vermelho' ? 'cobertura parcial' : 'sem correspondência'}`; return <button type="button" key={String(fonte.id)} onClick={() => abrirModalFonte(fonte)} title={`${hintFonte}${urlDaFonteProduto(fonte) ? ` · ${urlDaFonteProduto(fonte)}` : ''}`}><Globe2 size={13} /><span className="pimFonteNomeComMatch">{coberturaSelecionada.codigos.map((codigo) => { const encontrado = encontrados.some((item) => normalizarChave(item) === normalizarChave(codigo)); return <i key={codigo} className={`pimSemaforoDot ${encontrado ? 'verde' : 'vermelho'}`} title={`${String(fonte.nome)} · ${codigo}: ${encontrado ? 'encontrado' : 'não encontrado'}`} />; })}<span>{String(fonte.nome)}</span></span><small>{urlDaFonteProduto(fonte) ? 'URL do produto' : 'Sem anúncio'}</small></button>; })}
                </div>
              </div>
              {modoDetalhe && <section className="pimMatrizDetalheFicha">
                <div className="pimMatrizDetalheTopo"><div><span>Cadastro completo</span><h4>Dados do Conjunto</h4></div><button type="button" className="ghost" onClick={() => setModoDetalhe(false)}><Minimize2 size={15} />Voltar à matriz</button></div>
                <div className="pimMatrizDadosDiretos">{produtoDetalheCampos.map(([campo, valor]) => <div key={campo}><span>{campo}</span><strong>{possuiValor(valor) ? String(valor) : '—'}</strong></div>)}</div>
                <div className="pimMatrizDetalheAtributos"><div className="pimMatrizDetalheTitulo"><span>Atributos da planilha</span><strong>{atributosMatriz.length} campos carregados no Conjunto</strong></div><div className="pimMatrizAtributosGrid">{atributosMatriz.map((linha) => <div key={String(linha.codigo)}><span>{String(linha.nome ?? linha.codigo)}</span><strong>{possuiValor(linha.valor_erp) ? String(linha.valor_erp) : '—'}</strong><small>{String(linha.grupo ?? 'Atributos ERP')}</small></div>)}</div></div>
              </section>}
              <div className="pimMatrizFiltros">
                <div className="pimMatrizGrupoChips">{grupos.map((grupo) => <button type="button" key={grupo} className={grupoSelecionado === grupo ? 'active' : ''} onClick={() => setGrupoSelecionado(grupo)}>{grupo}</button>)}</div>
                <div className="pimMatrizFiltrosChecks"><label className="pimMatrizCheck"><input type="checkbox" checked={somenteDiferencas} onChange={(e) => setSomenteDiferencas(e.target.checked)} /> Somente diferenças</label><label className="pimMatrizCheck"><input type="checkbox" checked={somenteComDados} onChange={(e) => setSomenteComDados(e.target.checked)} /> Somente com dados</label></div>
              </div>
              <div className="pimMatrizTabelaWrap">
                <table className="pimMatrizTabela">
                  <thead><tr><th>Atributo</th><th className="pimConsolidadoCabecalho">Consolidado</th><th className="erp">ERP</th>{fontesMatriz.map((fonte) => <th key={String(fonte.id)}>{String(fonte.nome)}</th>)}</tr></thead>
                  <tbody>
                    {linhasMatriz.map((linha) => (
                      <tr key={String(linha.codigo)}>
                        <td className="pimMatrizAtributo"><strong>{String(linha.nome ?? linha.codigo)}</strong><small>{String(linha.grupo ?? 'Atributos ERP')}{linha.unidade_medida ? ` · ${String(linha.unidade_medida)}` : ''}</small></td>
                        <td className="pimMatrizValor pimConsolidadoCelula"><input aria-label={`Consolidado ${String(linha.nome ?? linha.codigo)}`} value={valorConsolidado(linha)} placeholder="—" onChange={(e) => setConsolidadoEditado((atual) => ({ ...atual, [String(linha.codigo)]: e.target.value }))} onBlur={(e) => salvarConsolidadoLocal(String(linha.codigo), e.currentTarget.value)} /></td>
                        <td className="pimMatrizValor erp"><span title={String(linha.valor_erp ?? '')}>{possuiValor(linha.valor_erp) ? String(linha.valor_erp) : '—'}</span></td>
                        {fontesMatriz.map((fonte) => {
                          const valor = valorDaFonte(linha, fonte);
                          const estado = estadoDaCelula(linha.valor_erp, valor);
                          return <td className={`pimMatrizValor ${estado}`} key={String(fonte.id)}><span title={String(valor?.valor ?? '')}>{possuiValor(valor?.valor) ? String(valor?.valor) : 'Sem dado'}</span>{valor?.anuncio_url && <a href={String(valor.anuncio_url)} target="_blank" rel="noreferrer">Evidência</a>}</td>;
                        })}
                      </tr>
                    ))}
                    {linhasMatriz.length === 0 && <tr><td colSpan={3 + fontesMatriz.length}>Nenhum atributo encontrado para os filtros selecionados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="pimMatrizVazioPrincipal">Selecione um Conjunto na lista lateral.</div>}
        </main>
      </div>
      {modalMidia && <div className="pimMatrizModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) fecharModalMidia(); }}>
        <section className="pimMatrizModal pimMatrizModalMidia" role="dialog" aria-modal="true" aria-label={modalMidia === 'IMAGEM' ? 'Imagens encontradas' : 'Manuais encontrados'}>
          <header><div><span>{modalMidia === 'IMAGEM' ? 'Imagens do produto' : 'Documentos do produto'}</span><h3>{modalMidia === 'IMAGEM' ? 'Imagens encontradas' : 'Manuais encontrados'}</h3><p>Filtre por concorrente, revise a origem e selecione um ou mais materiais para usar no anúncio.</p></div><button type="button" className="ghost pimMatrizFecharModal" onClick={fecharModalMidia} disabled={salvandoMidia}><X size={17} /></button></header>
          <div className="pimMatrizMidiaFiltros"><label>Concorrente<select value={filtroMidiaFonte} onChange={(e) => setFiltroMidiaFonte(e.target.value)}><option value="TODAS">Todos os concorrentes</option>{fontesMidia.map((fonte) => <option key={fonte.codigo} value={fonte.codigo}>{fonte.nome}</option>)}</select></label><div><strong>{midiasMarcadas.length} selecionado(s)</strong><button type="button" className="ghost" onClick={() => setMidiasMarcadas(midiaVisiveisModal.map((item) => String(item.url)))}>Selecionar visíveis</button><button type="button" className="ghost" onClick={() => setMidiasMarcadas([])}>Limpar seleção</button></div></div>
          <div className="pimMatrizMidiaLista">{midiaVisiveisModal.map((candidato) => <div key={`${String(candidato.tipo)}-${String(candidato.url)}`} className={`pimMatrizMidiaItem${midiaSelecionada?.url === candidato.url ? ' selecionado' : ''}`}><label className="pimMatrizMidiaCheck"><input type="checkbox" checked={midiasMarcadas.includes(String(candidato.url))} onChange={() => alternarMidiaMarcada(candidato)} /><span>{String(candidato.fonte_nome ?? 'Fonte')}</span><strong>{String(candidato.url)}</strong><small>{candidato.status === 'ESCOLHIDO' ? 'Já escolhido para este produto' : 'Pendente de escolha'}</small></label><button type="button" className="ghost" onClick={() => setMidiaSelecionada(candidato)}>Ver</button></div>)}{midiaVisiveisModal.length === 0 && <div className="pimMatrizMidiaVazio">Nenhum material deste tipo foi encontrado para o filtro selecionado.</div>}</div>
          {midiaSelecionada && <div className="pimMatrizMidiaPreview"><div className="pimMatrizMidiaPreviewCabecalho"><div><span>Prévia</span><strong>{String(midiaSelecionada.fonte_nome ?? 'Fonte concorrente')}</strong></div><small>{String(midiaSelecionada.url)}</small></div>{midiaSelecionada.tipo === 'IMAGEM' ? <img src={String(midiaSelecionada.url)} alt={String(produtoSelecionado?.nome_comercial ?? 'Imagem do produto')} /> : <iframe title="Manual encontrado" src={String(midiaSelecionada.url)} />}</div>}
          <footer className="pimMatrizModalRodape"><button type="button" className="ghost" onClick={fecharModalMidia} disabled={salvandoMidia}>Fechar</button>{midiaSelecionada && <><button type="button" className="ghost" onClick={() => baixarMidia(midiaSelecionada)}><Download size={15} />Baixar</button><button type="button" className="ghost" onClick={() => imprimirMidia(midiaSelecionada)}><Printer size={15} />Imprimir</button></>}{midiasMarcadas.length > 0 && <button type="button" className="primary" onClick={aprovarMidiasSelecionadas} disabled={salvandoMidia}>{salvandoMidia ? 'Gravando...' : `Usar ${midiasMarcadas.length} material(is)`}</button>}</footer>
        </section>
      </div>}
      {configAberta && <div className="pimMatrizModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setConfigAberta(false); }}>
        <section className="pimMatrizModal" role="dialog" aria-modal="true" aria-label="Configuração de fontes e atributos">
          <header><div><span>Configuração avançada</span><h3>Fontes, sites e De/Para</h3><p>Cadastre a origem dos dados sem sair da matriz principal.</p></div><button type="button" className="ghost pimMatrizFecharModal" onClick={() => setConfigAberta(false)}><X size={17} /></button></header>
          <ComparacaoConcorrentesPimLegacy />
        </section>
      </div>}
      {enriquecimentoAberto && <div className="pimMatrizModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) fecharEnriquecimento(); }}>
        <section className="pimMatrizModal pimMatrizModalEnriquecimento" role="dialog" aria-modal="true" aria-label="Enriquecimento cadastral">
          <header><div><span><RefreshCw size={15} /> Atualização cadastral</span><h3>Enriquecimento cadastral</h3><p>Selecione somente concorrentes com cobertura verde ou parcial/amarela. Os concorrentes sem nenhuma correspondência ficam ocultos.</p></div><button type="button" className="ghost pimMatrizFecharModal" onClick={fecharEnriquecimento} disabled={carregandoFonte}><X size={17} /></button></header>
          <div className="pimEnriquecimentoContexto"><strong>{String(produtoSelecionado?.nome_comercial ?? produtoSelecionado?.modelo ?? 'Conjunto selecionado')}</strong><span>Modelo: {String(produtoSelecionado?.modelo ?? produtoSelecionado?.codigo_fabricante ?? 'Não informado')}</span></div>
          {erroEnriquecimento && <div className="alerta">{erroEnriquecimento}</div>}
          {fontesElegiveisEnriquecimento.length > 0 ? <div className="pimEnriquecimentoLista">{fontesElegiveisEnriquecimento.map((fonte) => { const fonteId = Number(fonte.id); const coberturaFonte = coberturaSelecionada.fontes.find((item) => Number(item.fonte.id) === fonteId); const selecionada = fontesEnriquecimento.includes(fonteId); const status = coberturaFonte?.status === 'verde' ? 'Verde' : 'Parcial/amarela'; return <label key={String(fonte.id)} className={`pimEnriquecimentoFonte${selecionada ? ' selecionada' : ''}`}><input type="checkbox" checked={selecionada} onChange={(e) => setFontesEnriquecimento((atual) => e.target.checked ? Array.from(new Set([...atual, fonteId])) : atual.filter((id) => id !== fonteId))} disabled={carregandoFonte} /><span><strong>{String(fonte.nome)}</strong><small>{status} · {urlDaFonteProduto(fonte) ? 'Anúncio específico salvo' : 'Buscar pelo Modelo'}</small></span></label>; })}</div> : <div className="pimDeParaVazio">Nenhum concorrente verde ou parcial/amarelo está disponível para este Conjunto.</div>}
          {progressoEnriquecimento.total > 0 && <div className="pimMatrizProgresso"><div><span>Atualizando concorrentes</span><strong>{progressoEnriquecimento.atual}/{progressoEnriquecimento.total}</strong></div><progress value={progressoEnriquecimento.atual} max={progressoEnriquecimento.total} /></div>}
          <footer className="pimMatrizModalRodape"><button type="button" className="ghost" onClick={fecharEnriquecimento} disabled={carregandoFonte}>Cancelar</button><button type="button" className="primary" onClick={executarEnriquecimento} disabled={carregandoFonte || fontesEnriquecimento.length === 0}>{carregandoFonte ? <><RefreshCw size={15} className="pimGirando" />Atualizando...</> : <><RefreshCw size={15} />Buscar dados atualizados</>}</button></footer>
        </section>
      </div>}
      {modalFonteId && fonteModal && <div className="pimMatrizModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) fecharModalFonte(); }}>
        <section className="pimMatrizModal pimMatrizModalFonte" role="dialog" aria-modal="true" aria-label={`Atualizar ${String(fonteModal.nome)}`}>
          <header><div><span><Globe2 size={15} /> Fonte concorrente</span><h3>{String(fonteModal.nome)}</h3><p>Atualize a URL utilizada como base e carregue os dados no Conjunto selecionado.</p></div><button type="button" className="ghost pimMatrizFecharModal" onClick={fecharModalFonte} disabled={carregandoFonte}><X size={17} /></button></header>
          <div className="pimMatrizFonteContexto"><div><span>Conjunto selecionado</span><strong>{String(produtoSelecionado?.codigo_erp_decis ?? produtoSelecionado?.codigo_interno ?? 'Nenhum')}</strong></div><div><span>Modelo</span><strong>{String(produtoSelecionado?.modelo ?? produtoSelecionado?.codigo_fabricante ?? 'Não informado')}</strong></div></div>
          {revisaoFonte && <div className="pimDeParaResumo"><div><span>Campos encontrados no site</span><strong>{camposTodosFonte.length}</strong></div><div className="pendente"><span>Faltam vincular</span><strong>{camposPendentesFonte.length}</strong></div><div className="vinculado"><span>Já vinculados</span><strong>{camposMapeadosFonte.length}</strong></div></div>}
          <div className="pimMatrizModalGrid">
            <label className="campoLargo">Site ou anúncio utilizado como base<input value={urlFonte} onChange={(e) => setUrlFonte(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); atualizarFonteSelecionada(); } }} placeholder="Deixe vazio para buscar automaticamente pelo Modelo" /></label>
            <div className="pimDeParaPainel campoLargo">
              <div className="pimDeParaCabecalho"><div><strong>Todos os campos encontrados no site</strong><span>Revise o nome e o valor original de cada campo. Os reconhecidos entram pré-vinculados; os demais ficam disponíveis como Pendente.</span></div><span className="pimDeParaContagem">{camposTodosFonte.length} encontrados · {camposPendentesFonte.length} pendentes · {camposMapeadosFonte.length} vinculados</span></div>
              <div className="pimDeParaBarra"><input value={buscaDePara} onChange={(e) => setBuscaDePara(e.target.value)} placeholder="Filtrar campo ou valor encontrado..." /><button type="button" className="ghost" onClick={() => setMostrarMapeados((atual) => !atual)}>{mostrarMapeados ? 'Mostrar somente pendentes' : 'Mostrar todos os campos'}</button></div>
              {!revisaoFonte ? <div className="pimDeParaVazio">Carregue um anúncio específico para revisar os campos encontrados.</div> : camposVisiveisFonte.length === 0 ? <div className="pimDeParaVazio">Nenhum campo encontrado para este filtro.</div> : <div className="pimDeParaLista">{camposVisiveisFonte.map((campo) => { const sugestao = sugerirAtributoPim(campo.origem); const destinoAtual = String(pendenciasDePara[String(campo.origem)] ?? ''); const vinculado = Boolean(destinoAtual); return <div className={`pimDeParaLinha${vinculado ? ' vinculado' : ' pendente'}`} key={String(campo.origem)}><div className="pimDeParaOrigem"><strong>{String(campo.origem)}</strong><small title={String(campo.valor ?? '')}>{String(campo.valor ?? '—')}</small><em>{vinculado ? 'Vinculado automaticamente' : 'Pendente de vínculo'}</em></div><span className="pimDeParaSeta">→</span><select className="pimDeParaSelect" value={destinoAtual} onChange={(e) => setPendenciasDePara((atual) => ({ ...atual, [String(campo.origem)]: e.target.value }))}><option value="">Pendente — escolher atributo ERP</option>{atributosParaDePara.map((atributo) => <option key={String(atributo.codigo)} value={String(atributo.codigo)}>{String(atributo.nome ?? atributo.codigo)} · {String(atributo.codigo)}</option>)}</select><button type="button" className="ghost pimDeParaSugerir" onClick={() => { if (sugestao) setPendenciasDePara((atual) => ({ ...atual, [String(campo.origem)]: String(sugestao.codigo) })); }} disabled={!sugestao || vinculado}>Sugerir</button></div>; })}</div>}
            </div>
          </div>
          <div className="pimMatrizAjudaModal"><strong>Como funciona</strong><p>Campos desconhecidos entram como <b>Pendente</b>. Escolha o atributo ERP correspondente e salve; o vínculo será reaproveitado nas próximas cargas da mesma fonte.</p></div>
          {progressoFonte.total > 0 && <div className="pimMatrizProgresso"><div><span>Carga em lote</span><strong>{progressoFonte.atual}/{progressoFonte.total}</strong></div><progress value={progressoFonte.atual} max={progressoFonte.total} /></div>}
          <footer className="pimMatrizModalRodape"><button type="button" className="ghost" onClick={fecharModalFonte} disabled={carregandoFonte}>Cancelar</button><button type="button" className="ghost" onClick={carregarTodosConjuntosFonte} disabled={carregandoFonte || !/\{(MODELO|SKU|ITEM|CODIGO)\}/i.test(urlFonte)}><Boxes size={15} />Carregar todos os Conjuntos</button><button type="button" className="primary" onClick={atualizarFonteSelecionada} disabled={carregandoFonte || !produtoSelecionadoId}>{carregandoFonte ? <><RefreshCw size={15} className="pimGirando" />Carregando dados...</> : <><RefreshCw size={15} />{urlFonte.trim() ? 'Salvar URL e atualizar' : 'Buscar pelo Modelo'}</>}</button></footer>
        </section>
      </div>}
    </section>
  );
}

function ComparacaoConcorrentesPimLegacy() {
  const [fontes, setFontes] = useState<RegistroGenerico[]>([]);
  const [fonteSelecionada, setFonteSelecionada] = useState<RegistroGenerico>({});
  const [atributos, setAtributos] = useState<RegistroGenerico[]>([]);
  const [produtos, setProdutos] = useState<RegistroGenerico[]>([]);
  const [comparacoes, setComparacoes] = useState<RegistroGenerico[]>([]);
  const [formFonte, setFormFonte] = useState<RegistroGenerico>({ tipo_fonte: 'CONCORRENTE', prioridade: 50, ativo: true });
  const [atributosTexto, setAtributosTexto] = useState('');
  const [anuncio, setAnuncio] = useState<RegistroGenerico>({});
  const [extraido, setExtraido] = useState<RegistroGenerico | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);

  async function carregar() {
    const [fontesRetorno, produtosRetorno, comparacoesRetorno] = await Promise.all([
      listarFontesComparacaoPim(),
      listarProdutosPim(),
      listarComparacoesProdutoPim()
    ]);
    setFontes(fontesRetorno);
    setProdutos(produtosRetorno);
    setComparacoes(comparacoesRetorno);
    const primeiraFonte = fontesRetorno.find((item) => item.ativo !== false) ?? fontesRetorno[0];
    if (primeiraFonte && !fonteSelecionada.id) setFonteSelecionada(primeiraFonte);
  }

  useEffect(() => {
    carregar().catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar comparadores.'));
  }, []);

  useEffect(() => {
    if (!fonteSelecionada.id) {
      setAtributos([]);
      return;
    }
    listarAtributosComparacaoPim(Number(fonteSelecionada.id))
      .then((retorno) => {
        setAtributos(retorno);
        setAtributosTexto(retorno.map((item) => [item.codigo, item.nome, item.tipo_campo, item.unidade_medida ?? '', item.obrigatorio ? 'SIM' : 'NAO'].join('|')).join('\\n'));
      })
      .catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar atributos da fonte.'));
  }, [fonteSelecionada.id]);

  async function salvarFonte(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    try {
      const salvo = await salvarFonteComparacaoPim(formFonte);
      setMensagem('Fonte de comparacao salva.');
      setFormFonte({ tipo_fonte: 'CONCORRENTE', prioridade: 50, ativo: true });
      await carregar();
      if (salvo?.id) setFonteSelecionada(salvo);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar fonte.');
    }
  }

  async function salvarAtributos() {
    if (!fonteSelecionada.id) {
      setErro('Selecione uma fonte antes de cadastrar os atributos.');
      return;
    }
    setErro('');
    setMensagem('');
    try {
      const lista = parseAtributosComparacao(atributosTexto);
      await salvarAtributosComparacaoPim(Number(fonteSelecionada.id), { atributos: lista });
      setAtributos(await listarAtributosComparacaoPim(Number(fonteSelecionada.id)));
      setMensagem(`${lista.length} atributo(s) cadastrado(s) para ${String(fonteSelecionada.nome)}.`);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar atributos da fonte.');
    }
  }

  async function extrairAnuncio() {
    if (!anuncio.anuncio_url) {
      setErro('Informe a URL do anuncio.');
      return;
    }
    setErro('');
    setMensagem('');
    setProcessando(true);
    try {
      const retorno = await extrairAnuncioComparacaoPim({
        anuncio_url: anuncio.anuncio_url,
        chave_original: anuncio.modelo_alfa_numerico
      });
      setExtraido(retorno);
      setMensagem('Anuncio lido. Confira os dados e salve o comparativo.');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao extrair o anuncio.');
    } finally {
      setProcessando(false);
    }
  }

  async function salvarAnuncio() {
    if (!fonteSelecionada.id || !extraido) {
      setErro('Selecione a fonte e extraia um anuncio antes de salvar.');
      return;
    }
    setErro('');
    setMensagem('');
    setProcessando(true);
    try {
      await salvarComparacaoAnuncioPim({
        ...extraido,
        fonte_id: Number(fonteSelecionada.id),
        produto_id: anuncio.produto_id ? Number(anuncio.produto_id) : null,
        chave_original: extraido.chave_original,
        status: 'PENDENTE',
        origem: 'ANUNCIO_EXTRAIDO'
      });
      setMensagem('Comparativo salvo com chave normalizada.');
      setExtraido(null);
      setAnuncio({});
      setComparacoes(await listarComparacoesProdutoPim());
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar comparativo.');
    } finally {
      setProcessando(false);
    }
  }

  async function excluirFonte(fonte: RegistroGenerico) {
    if (!window.confirm(`Inativar a fonte ${String(fonte.nome)}?`)) return;
    await excluirFonteComparacaoPim(Number(fonte.id));
    setMensagem('Fonte inativada.');
    await carregar();
  }

  return (
    <section className="painelTabela pimTelaAvancada">
      <header>
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>Concorrentes e Comparação</h2>
          <p>Cadastre fontes, atributos por concorrente e anúncios. A chave do Modelo é normalizada antes de qualquer comparação.</p>
        </div>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      <div className="pimGridOperacional">
        <form className="pimBloco" onSubmit={salvarFonte}>
          <h3>Cadastro de concorrente / fonte</h3>
          <div className="formCadastro semBorda">
            <label>Codigo<input value={String(formFonte.codigo ?? '')} onChange={(e) => setFormFonte({ ...formFonte, codigo: e.target.value })} placeholder="LEVEROS" /></label>
            <label>Nome<input value={String(formFonte.nome ?? '')} onChange={(e) => setFormFonte({ ...formFonte, nome: e.target.value })} placeholder="Leveros" /></label>
            <label>Tipo<select value={String(formFonte.tipo_fonte ?? 'CONCORRENTE')} onChange={(e) => setFormFonte({ ...formFonte, tipo_fonte: e.target.value })}><option>CONCORRENTE</option><option>ERP</option><option>FABRICANTE</option></select></label>
            <label>Prioridade<input type="number" value={String(formFonte.prioridade ?? 50)} onChange={(e) => setFormFonte({ ...formFonte, prioridade: Number(e.target.value) })} /></label>
            <label className="campoLargo">URL base<input value={String(formFonte.url_base ?? '')} onChange={(e) => setFormFonte({ ...formFonte, url_base: e.target.value })} placeholder="https://www.exemplo.com.br/" /></label>
          </div>
          <button className="primary">Salvar fonte</button>
        </form>
        <section className="pimBloco">
          <h3>Fontes cadastradas</h3>
          <TabelaPimCompacta linhas={fontes} colunas={['codigo', 'nome', 'tipo_fonte', 'prioridade', 'total_atributos', 'total_anuncios', 'ativo']} renderAcoes={(linha) => <><button type="button" className={Number(fonteSelecionada.id) === Number(linha.id) ? 'primary' : 'ghost'} onClick={() => setFonteSelecionada(linha)}>Selecionar</button><button type="button" className="danger" onClick={() => excluirFonte(linha)}>Inativar</button></>} vazio="Nenhuma fonte cadastrada." />
        </section>
      </div>
      <div className="pimGridOperacional">
        <section className="pimBloco">
          <h3>Atributos da fonte selecionada</h3>
          <p>Uma linha por atributo: <code>CODIGO|Nome|TIPO|Unidade|Obrigatorio</code>.</p>
          <textarea className="campoLargo" rows={12} value={atributosTexto} onChange={(e) => setAtributosTexto(e.target.value)} />
          <button type="button" className="primary" onClick={salvarAtributos}>Salvar atributos ({atributos.length})</button>
        </section>
        <section className="pimBloco">
          <h3>Extrair anúncio para comparação</h3>
          <div className="formCadastro semBorda">
            <label>Fonte<select value={String(fonteSelecionada.id ?? '')} onChange={(e) => setFonteSelecionada(fontes.find((item) => Number(item.id) === Number(e.target.value)) ?? {})}><option value="">Selecione</option>{fontes.filter((item) => item.tipo_fonte !== 'ERP' && item.ativo !== false).map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome)}</option>)}</select></label>
            <label>Produto do PIM<select value={String(anuncio.produto_id ?? '')} onChange={(e) => setAnuncio({ ...anuncio, produto_id: Number(e.target.value) || null })}><option value="">Comparação sem produto vinculado</option>{produtos.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.codigo_interno ?? item.sku_interno ?? item.modelo ?? item.nome_comercial ?? item.id)}</option>)}</select></label>
            <label className="campoLargo">URL do anúncio<input value={String(anuncio.anuncio_url ?? '')} onChange={(e) => setAnuncio({ ...anuncio, anuncio_url: e.target.value })} placeholder="https://..." /></label>
            <label className="campoLargo">Modelo do anúncio (opcional)<input value={String(anuncio.modelo_alfa_numerico ?? '')} onChange={(e) => setAnuncio({ ...anuncio, modelo_alfa_numerico: e.target.value })} placeholder="Ex.: condensadora | evaporadora; vazio usa a chave do anúncio" /></label>
          </div>
          <div className="rodapeAcoes"><button type="button" className="primary" onClick={extrairAnuncio} disabled={processando}>{processando ? 'Lendo...' : 'Ler anúncio'}</button>{extraido && <button type="button" className="ghost" onClick={salvarAnuncio} disabled={processando}>Salvar comparação</button>}</div>
          {extraido && <div className="pimBlocoInterno"><strong>{String(extraido.titulo ?? 'Anúncio sem título')}</strong><p>Chave: {String(extraido.chave_original ?? '')} | Normalizada: {String(extraido.chave_normalizada ?? '')}</p><TabelaPimCompacta linhas={Object.entries((extraido.dados ?? {}) as RegistroGenerico).map(([campo, valor]) => ({ campo, valor }))} colunas={['campo', 'valor']} vazio="Nenhum atributo extraído." /></div>}
        </section>
      </div>
      <section className="pimBloco">
        <h3>Comparativos salvos</h3>
        <TabelaPimCompacta linhas={comparacoes} colunas={['fonte_nome', 'titulo', 'chave_original', 'chave_normalizada', 'confiabilidade', 'status', 'anuncio_url']} vazio="Nenhum comparativo salvo." />
      </section>
    </section>
  );
}

export function PainelPimGenerico({
  tela,
  titulo,
  subtitulo
}: {
  tela: TelaAtual;
  titulo: string;
  subtitulo: string;
}) {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [extra, setExtra] = useState<RegistroGenerico>({});
  const [formulario, setFormulario] = useState<RegistroGenerico>({});
  const [mapa, setMapa] = useState<RegistroGenerico>({ ativo: true, obrigatorio: false, ordem: 0 });
  const [aberto, setAberto] = useState(false);
  const [mapaAberto, setMapaAberto] = useState(false);
  const [canalSelecionadoId, setCanalSelecionadoId] = useState('');
  const [assetsMarcados, setAssetsMarcados] = useState<number[]>([]);
  const [codigosErpAssets, setCodigosErpAssets] = useState('');
  const [assetMassaPrincipal, setAssetMassaPrincipal] = useState(false);
  const [produtosAssets, setProdutosAssets] = useState<RegistroGenerico[]>([]);
  const [produtoAssetSelecionado, setProdutoAssetSelecionado] = useState('');
  const [candidatosAssets, setCandidatosAssets] = useState<RegistroGenerico[]>([]);
  const [carregandoCandidatosAssets, setCarregandoCandidatosAssets] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function carregar() {
    if (tela === 'pimComponentes') setLinhas(await listarComponentesPim());
    if (tela === 'pimAtributos') {
      const dados = await listarAtributosPim();
      setLinhas(dados.atributos);
      setExtra({ grupos: dados.grupos });
    }
    if (tela === 'pimCanais') {
      const [canais, mapeamentos, dadosAtributos] = await Promise.all([listarCanaisPim(), listarMapeamentosAtributosCanaisPim(), listarAtributosPim()]);
      setLinhas(canais);
      setExtra({ mapeamentos, atributos: dadosAtributos.atributos });
    }
        if (tela === 'pimAssets') {
      const [assets, produtosDisponiveis] = await Promise.all([listarAssetsPim(), listarProdutosPim()]);
      setLinhas(assets);
      setProdutosAssets(produtosDisponiveis);
    }

    if (tela === 'pimImportacao') setLinhas(await listarImportacoesPim());
    if (tela === 'pimWorkflows' || tela === 'pimAprovacoes') {
      const dados = await listarWorkflowsPim();
      setLinhas(tela === 'pimWorkflows' ? dados.workflows : dados.aprovacoes);
    }
    if (tela === 'pimIa') {
      const dados = await listarConfiguracoesPim();
      setLinhas(tela === 'pimIa' ? [dados.ia ?? {}] : dados.integracoes ?? []);
    }
    if (tela === 'pimAuditoria') setLinhas(await listarAuditoriaPim());
  }

  useEffect(() => {
    carregar().catch(() => setLinhas([]));
  }, [tela]);

  function editarAtributo(linha: RegistroGenerico) {
    setErro('');
    setMensagem('');
    setFormulario({
      ...linha,
      atributo_grupo_id: linha.atributo_grupo_id ?? linha.attribute_group_id ?? '',
      attribute_group_id: linha.atributo_grupo_id ?? linha.attribute_group_id ?? ''
    });
    setAberto(true);
  }

  function novoRegistro() {
    setFormulario({});
    setErro('');
    setMensagem('');
    setAberto(true);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    try {
      if (tela === 'pimComponentes') await salvarComponentePim(formulario);
      if (tela === 'pimAtributos') await salvarAtributoPim(formulario);
      if (tela === 'pimCanais') await salvarCanalPim(formulario);
      if (tela === 'pimAssets') await salvarAssetPim(formulario);
      if (tela === 'pimImportacao') await registrarImportacaoPim(formulario);
      setMensagem('Registro salvo.');
      setFormulario({});
      setAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar.');
    }
  }

  async function salvarMapa(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    if (!mapa.canal_id || !mapa.atributo_id) {
      setErro('Selecione a plataforma e o atributo ERP antes de salvar o vínculo.');
      return;
    }
    try {
      await salvarMapeamentoAtributoCanalPim({ ...mapa, canal_ids: [Number(mapa.canal_id)] });
      setMensagem('Vínculo de atributo salvo.');
      setMapaAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar vínculo.');
    }
  }

  async function alterarStatusCanal(linha: RegistroGenerico) {
    setErro('');
    setMensagem('');
    try {
      await salvarCanalPim({ ...linha, ativo: linha.ativo === false });
      setMensagem(linha.ativo === false ? 'Plataforma reativada.' : 'Plataforma inativada.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao alterar plataforma.');
    }
  }

  async function carregarCandidatosAssets() {
    if (!produtoAssetSelecionado) {
      setErro('Selecione um produto ou conjunto para consultar os materiais encontrados.');
      return;
    }
    setErro('');
    setCarregandoCandidatosAssets(true);
    try {
      setCandidatosAssets(await listarCandidatosMidiaProdutoPim(Number(produtoAssetSelecionado)));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar os materiais encontrados.');
    } finally {
      setCarregandoCandidatosAssets(false);
    }
  }

  async function aprovarCandidatoAsset(candidato: RegistroGenerico) {
    if (!produtoAssetSelecionado) return;
    setErro('');
    try {
      await salvarAssetPim({
        nome: `${candidato.tipo === 'IMAGEM' ? 'Imagem' : 'Manual'} - ${String(candidato.modelo ?? 'Produto')}`,
        tipo: candidato.tipo === 'IMAGEM' ? 'IMAGEM_PRINCIPAL' : 'MANUAL',
        url: candidato.url,
        marca: candidato.marca,
        modelo: candidato.modelo,
        produto_ids: [Number(produtoAssetSelecionado)],
        tipo_vinculo: candidato.tipo === 'IMAGEM' ? 'PRINCIPAL' : 'DOCUMENTO',
        principal: candidato.tipo === 'IMAGEM'
      });
      setMensagem('Material escolhido e gravado no catálogo de Imagens.');
      setCandidatosAssets((atual) => atual.map((item) => item === candidato ? { ...item, status: 'ESCOLHIDO' } : item));
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao gravar o material escolhido.');
    }
  }

  async function vincularAssetsEmMassa() {
    setErro('');
    setMensagem('');
    try {
      const retorno = await vincularAssetsProdutosPim({
        asset_ids: assetsMarcados,
        codigos_erp: codigosErpAssets,
        tipo_vinculo: assetMassaPrincipal ? 'PRINCIPAL' : 'SECUNDARIA',
        principal: assetMassaPrincipal
      });
      setMensagem(`Vinculo em massa concluido: ${String(retorno.vinculados ?? 0)} vinculo(s).`);
      setAssetsMarcados([]);
      setCodigosErpAssets('');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao vincular assets.');
    }
  }

  const editavel = ['pimComponentes', 'pimAtributos', 'pimCanais', 'pimAssets', 'pimImportacao'].includes(tela);
  const telaNome = String(tela);
  const editorModal = telaNome === 'pimAtributos' || telaNome === 'pimCanais';
  const editorVisivel = aberto && !editorModal;
  const colunas = telaNome === 'pimAtributos'
    ? ['grupo_nome', 'codigo', 'nome_exibido', 'tipo_campo', 'escopo', 'unidade_medida', 'ordem_exibicao', 'obrigatorio', 'ativo']
    : telaNome === 'pimCanais'
      ? ['codigo', 'nome', 'tipo_canal', 'categoria_interna', 'categoria_canal', 'score_minimo_publicacao', 'ativo']
      : Object.keys(linhas[0] ?? {}).slice(0, 8);

  return (
    <section className="painelTabela">
      <header>
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
                {editavel && <button className={aberto ? 'ghost' : 'primary'} onClick={() => aberto ? setAberto(false) : novoRegistro()}><Settings size={15} />{aberto ? 'Fechar editor' : telaNome === 'pimAtributos' ? 'Novo atributo' : telaNome === 'pimCanais' ? 'Nova plataforma' : 'Novo registro'}</button>}

      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {tela === 'pimAtributos' && <div className="pimAtributosResumo"><div><span>Atributos cadastrados</span><strong>{linhas.length}</strong></div><div><span>Grupos disponíveis</span><strong>{(extra.grupos ?? []).length}</strong></div><div><span>Ativos</span><strong>{linhas.filter((item) => item.ativo !== false).length}</strong></div><div><span>Escopos</span><strong>{new Set(linhas.map((item) => String(item.escopo ?? ''))).size}</strong></div></div>}
      {tela === 'pimAssets' && (
        <div className="pimBlocoInterno">
          <div className="pimAssetsCandidatos">
            <div className="pimBlocoTopo"><div><h4>Materiais encontrados por produto</h4><small>Selecione um Conjunto para revisar imagens e manuais capturados dos anúncios concorrentes.</small></div><div className="pimAssetsCandidatosControles"><select value={produtoAssetSelecionado} onChange={(e) => { setProdutoAssetSelecionado(e.target.value); setCandidatosAssets([]); }}><option value="">Selecione um produto/conjunto</option>{produtosAssets.map((produto) => <option key={String(produto.id)} value={String(produto.id)}>{String(produto.codigo_erp_decis ?? produto.codigo_interno ?? produto.id)} · {String(produto.nome_comercial ?? produto.modelo ?? 'Produto')}</option>)}</select><button type="button" className="primary" onClick={carregarCandidatosAssets} disabled={carregandoCandidatosAssets}>{carregandoCandidatosAssets ? 'Consultando...' : 'Buscar materiais'}</button></div></div>
            {candidatosAssets.length > 0 && <div className="pimAssetsCandidatosLista">{candidatosAssets.map((candidato) => <div className="pimAssetsCandidato" key={`${String(candidato.tipo)}-${String(candidato.url)}`}><div><span>{String(candidato.tipo)} · {String(candidato.fonte_nome ?? 'Fonte')}</span><strong>{String(candidato.url)}</strong><small>{candidato.status === 'ESCOLHIDO' ? 'Escolhido para o produto' : 'Ainda não gravado; revise antes de usar'}</small></div><button type="button" className={candidato.status === 'ESCOLHIDO' ? 'ghost' : 'primary'} onClick={() => aprovarCandidatoAsset(candidato)} disabled={candidato.status === 'ESCOLHIDO'}>{candidato.status === 'ESCOLHIDO' ? 'Usado' : 'Usar este'}</button></div>)}</div>}
            {produtoAssetSelecionado && !carregandoCandidatosAssets && candidatosAssets.length === 0 && <div className="pimAssetsCandidatosVazio">Nenhum candidato carregado para este produto. Use Buscar materiais.</div>}
          </div>
          <div className="pimBlocoTopo">
            <h4>Vinculo rapido por codigo ERP</h4>
            <button className="primary" onClick={vincularAssetsEmMassa}>Vincular selecionados</button>
          </div>
          <div className="formCadastro semBorda">
            <label className="campoLargo">Codigos ERP dos produtos/conjuntos<textarea value={codigosErpAssets} onChange={(e) => setCodigosErpAssets(e.target.value)} placeholder="Cole um codigo por linha, ou separe por virgula/ponto e virgula" /></label>
            <label>Imagem principal<input type="checkbox" checked={assetMassaPrincipal} onChange={(e) => setAssetMassaPrincipal(e.target.checked)} /></label>
          </div>
          <TabelaPimCompacta
            titulo="Selecionar imagens/documentos"
            nomeArquivo="pim-assets-selecao"
            linhas={linhas}
            colunas={['nome', 'tipo', 'marca', 'modelo', 'produtos_vinculados']}
            renderAcoes={(linha) => {
              const id = Number(linha.id);
              const marcado = assetsMarcados.includes(id);
              return <button className={marcado ? 'primary' : 'ghost'} onClick={() => setAssetsMarcados(marcado ? assetsMarcados.filter((item) => item !== id) : [...assetsMarcados, id])}>{marcado ? 'Selecionado' : 'Selecionar'}</button>;
            }}
          />
        </div>
      )}
            {editorVisivel && (
        <form className={`formCadastro pimCadastroEditor${telaNome === 'pimAtributos' ? ' pimCadastroAtributoEditor' : ''}`} onSubmit={salvar}>
          <div className="pimCadastroEditorTopo"><div><span>{formulario.id ? 'Editando registro existente' : 'Novo cadastro'}</span><strong>{telaNome === 'pimAtributos' ? String(formulario.nome_exibido ?? formulario.codigo ?? 'Atributo') : titulo}</strong></div><button type="button" className="ghost" onClick={() => setAberto(false)}>Cancelar</button></div>

          {tela === 'pimComponentes' && (
            <>
              <label>Codigo<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
              <label>Nome<input value={String(formulario.nome ?? '')} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_componente ?? 'EVAPORADORA')} onChange={(e) => setFormulario({ ...formulario, tipo_componente: e.target.value })}>{['EVAPORADORA', 'CONDENSADORA', 'CONTROLE_REMOTO', 'KIT_INSTALACAO', 'ACESSORIO', 'OUTRO'].map((item) => <option key={item}>{item}</option>)}</select></label>
            </>
          )}
                    {tela === 'pimAtributos' && (
            <>
              <label>Grupo<select value={String(formulario.atributo_grupo_id ?? formulario.attribute_group_id ?? '')} onChange={(e) => setFormulario({ ...formulario, atributo_grupo_id: e.target.value ? Number(e.target.value) : null, attribute_group_id: e.target.value ? Number(e.target.value) : null })}><option value="">Sem grupo</option>{(extra.grupos ?? []).map((g: RegistroGenerico) => <option key={String(g.id)} value={String(g.id)}>{String(g.nome)}</option>)}</select></label>
              <label>Código<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value.toUpperCase() })} /></label>
              <label>Nome interno<input value={String(formulario.nome_interno ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_interno: e.target.value })} /></label>
              <label>Nome exibido<input value={String(formulario.nome_exibido ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_exibido: e.target.value })} /></label>
              <label className="campoLargo">Descrição<textarea value={String(formulario.descricao ?? '')} onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })} rows={2} /></label>
              <label>Tipo<select value={String(formulario.tipo_campo ?? 'TEXTO')} onChange={(e) => setFormulario({ ...formulario, tipo_campo: e.target.value })}>{['TEXTO', 'NUMERO', 'DECIMAL', 'LISTA', 'MULTIPLA_ESCOLHA', 'BOOLEANO', 'DATA', 'URL', 'ARQUIVO', 'IMAGEM'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Escopo<select value={String(formulario.escopo ?? 'PRODUTO')} onChange={(e) => setFormulario({ ...formulario, escopo: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'COMPONENTE', 'EVAPORADORA', 'CONDENSADORA', 'SKU', 'CANAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Unidade de medida<input value={String(formulario.unidade_medida ?? '')} onChange={(e) => setFormulario({ ...formulario, unidade_medida: e.target.value })} /></label>
              <label>Ordem de exibição<input type="number" value={String(formulario.ordem_exibicao ?? 0)} onChange={(e) => setFormulario({ ...formulario, ordem_exibicao: Number(e.target.value) })} /></label>
              <label>Valor padrão<input value={String(formulario.valor_padrao ?? '')} onChange={(e) => setFormulario({ ...formulario, valor_padrao: e.target.value })} /></label>
              <label>Máscara<input value={String(formulario.mascara ?? '')} onChange={(e) => setFormulario({ ...formulario, mascara: e.target.value })} /></label>
              <label className="campoLargo">Validação<textarea value={String(formulario.validacao ?? '')} onChange={(e) => setFormulario({ ...formulario, validacao: e.target.value })} rows={2} /></label>
              <label className="campoLargo">Ajuda / tooltip<textarea value={String(formulario.ajuda_tooltip ?? '')} onChange={(e) => setFormulario({ ...formulario, ajuda_tooltip: e.target.value })} rows={2} /></label>
              <label className="pimCheckEditor">Obrigatório<input type="checkbox" checked={Boolean(formulario.obrigatorio)} onChange={(e) => setFormulario({ ...formulario, obrigatorio: e.target.checked })} /></label>
              <label className="pimCheckEditor">Editável<input type="checkbox" checked={formulario.editavel !== false} onChange={(e) => setFormulario({ ...formulario, editavel: e.target.checked })} /></label>
              <label className="pimCheckEditor">Visível<input type="checkbox" checked={formulario.visivel !== false} onChange={(e) => setFormulario({ ...formulario, visivel: e.target.checked })} /></label>
              <label className="pimCheckEditor">Ativo<input type="checkbox" checked={formulario.ativo !== false} onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })} /></label>
            </>
          )}

          {tela === 'pimCanais' && (
            <>
              <label>Codigo<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
              <label>Nome<input value={String(formulario.nome ?? '')} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_canal ?? 'MARKETPLACE')} onChange={(e) => setFormulario({ ...formulario, tipo_canal: e.target.value })}>{['ERP', 'ECOMMERCE', 'MARKETPLACE', 'ADS', 'OUTRO'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Score minimo<input type="number" value={String(formulario.score_minimo_publicacao ?? 80)} onChange={(e) => setFormulario({ ...formulario, score_minimo_publicacao: Number(e.target.value) })} /></label>
            </>
          )}
          {tela === 'pimAssets' && (
            <>
              <label>Nome<input value={String(formulario.nome ?? '')} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo ?? 'IMAGEM_PRINCIPAL')} onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value })}>{['IMAGEM_PRINCIPAL', 'IMAGEM_SECUNDARIA', 'IMAGEM_AMBIENTE', 'IMAGEM_TECNICA', 'SELO_INMETRO_PROCEL', 'MANUAL', 'FICHA_TECNICA', 'CERTIFICADO', 'VIDEO', 'URL_EXTERNA'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>URL<input value={String(formulario.url ?? '')} onChange={(e) => setFormulario({ ...formulario, url: e.target.value })} /></label>
              <label>Alt text<input value={String(formulario.alt_text ?? '')} onChange={(e) => setFormulario({ ...formulario, alt_text: e.target.value })} /></label>
              <label>Tags<input value={String(formulario.tags ?? '')} onChange={(e) => setFormulario({ ...formulario, tags: e.target.value })} /></label>
            </>
          )}
          {tela === 'pimImportacao' && (
            <>
              <label>Arquivo<input value={String(formulario.nome_arquivo ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_arquivo: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_arquivo ?? 'CSV')} onChange={(e) => setFormulario({ ...formulario, tipo_arquivo: e.target.value })}><option>CSV</option><option>XLSX</option></select></label>
              <label>Modo<select value={String(formulario.modo_importacao ?? 'APENAS_VALIDAR')} onChange={(e) => setFormulario({ ...formulario, modo_importacao: e.target.value })}>{['CRIAR_NOVOS', 'ATUALIZAR_EXISTENTES', 'CRIAR_RASCUNHOS', 'APENAS_VALIDAR'].map((item) => <option key={item}>{item}</option>)}</select></label>
            </>
          )}
          <button className="primary">Salvar</button>
        </form>
      )}
      {telaNome === 'pimCanais' && <section className="pimBloco pimCanaisAtributos"><div className="pimBlocoTopo"><div><h3>Atributos por plataforma</h3><small>Defina quais campos são obrigatórios ou opcionais em cada plataforma.</small></div><div className="acoesDetalhe"><select value={canalSelecionadoId} onChange={(e) => setCanalSelecionadoId(e.target.value)}><option value="">Selecione uma plataforma</option>{linhas.map((canal) => <option key={String(canal.id)} value={String(canal.id)}>{String(canal.nome)}</option>)}</select><button type="button" className="primary" disabled={!canalSelecionadoId} onClick={() => { setMapa({ canal_id: Number(canalSelecionadoId), ativo: true, obrigatorio: false, ordem: 0 }); setMapaAberto(true); }}>Vincular atributo</button></div></div>{canalSelecionadoId ? <TabelaPimCompacta titulo="Atributos da plataforma" nomeArquivo="pim-mapeamentos-plataforma" linhas={(extra.mapeamentos ?? []).filter((item: RegistroGenerico) => Number(item.canal_id) === Number(canalSelecionadoId))} colunas={['atributo_nome', 'atributo_codigo', 'atributo_canal_nome', 'atributo_canal_codigo', 'obrigatorio', 'ordem', 'validacao', 'ativo']} onRowDoubleClick={(linha) => { setMapa({ ...linha, canal_id: Number(canalSelecionadoId), canal_ids: [Number(canalSelecionadoId)] }); setMapaAberto(true); }} renderAcoes={(linha) => <><button type="button" className="ghost" onClick={() => { setMapa({ ...linha, canal_id: Number(canalSelecionadoId), canal_ids: [Number(canalSelecionadoId)] }); setMapaAberto(true); }}>Editar</button><button type="button" className="danger" onClick={async () => { await excluirMapeamentoAtributoCanalPim(Number(linha.id)); setMensagem('Vínculo inativado.'); await carregar(); }}>Inativar</button></>} vazio="Nenhum atributo vinculado a esta plataforma." /> : <div className="pimDeParaVazio">Selecione uma plataforma para consultar seus atributos.</div>}</section>}
      {editorModal && aberto && <div className="pimCadastroEditorModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setAberto(false); }}><form className="formCadastro pimCadastroEditor pimCadastroEditorModal" onSubmit={salvar} onClick={(evento) => evento.stopPropagation()}><div className="pimCadastroEditorTopo"><div><span>{formulario.id ? 'Editando registro existente' : 'Novo cadastro'}</span><strong>{String(formulario.nome_exibido ?? formulario.nome ?? formulario.codigo ?? titulo)}</strong></div><button type="button" className="ghost" onClick={() => setAberto(false)}>Fechar</button></div>{telaNome === 'pimAtributos' ? <><label>Grupo<select value={String(formulario.atributo_grupo_id ?? '')} onChange={(e) => setFormulario({ ...formulario, atributo_grupo_id: e.target.value ? Number(e.target.value) : null })}><option value="">Sem grupo</option>{(extra.grupos ?? []).map((grupo: RegistroGenerico) => <option key={String(grupo.id)} value={String(grupo.id)}>{String(grupo.nome)}</option>)}</select></label><label>Código<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value.toUpperCase() })} /></label><label>Nome exibido<input value={String(formulario.nome_exibido ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_exibido: e.target.value, nome_interno: normalizarTextoPim(e.target.value) })} /></label><label>Tipo<select value={String(formulario.tipo_campo ?? 'TEXTO')} onChange={(e) => setFormulario({ ...formulario, tipo_campo: e.target.value })}>{['TEXTO', 'NUMERO', 'DECIMAL', 'LISTA', 'MULTIPLA_ESCOLHA', 'BOOLEANO', 'DATA', 'URL', 'ARQUIVO', 'IMAGEM'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Escopo<select value={String(formulario.escopo ?? 'PRODUTO')} onChange={(e) => setFormulario({ ...formulario, escopo: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'COMPONENTE', 'EVAPORADORA', 'CONDENSADORA', 'SKU', 'CANAL'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Unidade<input value={String(formulario.unidade_medida ?? '')} onChange={(e) => setFormulario({ ...formulario, unidade_medida: e.target.value })} /></label><label>Ordem<input type="number" value={String(formulario.ordem_exibicao ?? 0)} onChange={(e) => setFormulario({ ...formulario, ordem_exibicao: Number(e.target.value) })} /></label><label className="campoLargo">Descrição<textarea rows={2} value={String(formulario.descricao ?? '')} onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })} /></label><label className="pimCheckEditor">Obrigatório<input type="checkbox" checked={Boolean(formulario.obrigatorio)} onChange={(e) => setFormulario({ ...formulario, obrigatorio: e.target.checked })} /></label><label className="pimCheckEditor">Ativo<input type="checkbox" checked={formulario.ativo !== false} onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })} /></label></> : <><label>Código<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value.toUpperCase() })} /></label><label>Nome<input value={String(formulario.nome ?? '')} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label><label>Tipo<select value={String(formulario.tipo_canal ?? 'MARKETPLACE')} onChange={(e) => setFormulario({ ...formulario, tipo_canal: e.target.value })}>{['MARKETPLACE', 'ECOMMERCE', 'ADS', 'ERP', 'OUTRO'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Categoria interna<input value={String(formulario.categoria_interna ?? '')} onChange={(e) => setFormulario({ ...formulario, categoria_interna: e.target.value })} /></label><label>Categoria no canal<input value={String(formulario.categoria_canal ?? '')} onChange={(e) => setFormulario({ ...formulario, categoria_canal: e.target.value })} /></label><label>Score mínimo<input type="number" value={String(formulario.score_minimo_publicacao ?? 80)} onChange={(e) => setFormulario({ ...formulario, score_minimo_publicacao: Number(e.target.value) })} /></label><label className="pimCheckEditor">Ativo<input type="checkbox" checked={formulario.ativo !== false} onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })} /></label></>}<div className="rodapeAcoes"><button type="button" className="ghost" onClick={() => setAberto(false)}>Cancelar</button><button className="primary">Salvar</button></div></form></div>}
      {telaNome === 'pimCanais' && mapaAberto && <div className="pimCadastroEditorModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setMapaAberto(false); }}><form className="formCadastro pimCadastroEditor pimCadastroEditorModal" onSubmit={salvarMapa} onClick={(evento) => evento.stopPropagation()}><div className="pimCadastroEditorTopo"><div><span>{mapa.id ? 'Editando vínculo' : 'Novo vínculo'}</span><strong>Atributo por plataforma</strong></div><button type="button" className="ghost" onClick={() => setMapaAberto(false)}>Fechar</button></div><label>Atributo<select value={String(mapa.atributo_id ?? '')} onChange={(e) => { const atributo = (extra.atributos ?? []).find((item: RegistroGenerico) => Number(item.id) === Number(e.target.value)); setMapa({ ...mapa, atributo_id: Number(e.target.value), atributo_canal_codigo: atributo?.codigo, atributo_canal_nome: atributo?.nome_exibido }); }}><option value="">Selecione um atributo ERP</option>{(extra.atributos ?? []).filter((item: RegistroGenerico) => item.ativo !== false).map((atributo: RegistroGenerico) => <option key={String(atributo.id)} value={String(atributo.id)}>{String(atributo.nome_exibido)} · {String(atributo.codigo)}</option>)}</select></label><label>Código na plataforma<input value={String(mapa.atributo_canal_codigo ?? '')} onChange={(e) => setMapa({ ...mapa, atributo_canal_codigo: e.target.value })} /></label><label>Nome na plataforma<input value={String(mapa.atributo_canal_nome ?? '')} onChange={(e) => setMapa({ ...mapa, atributo_canal_nome: e.target.value })} /></label><label>Ordem<input type="number" value={String(mapa.ordem ?? 0)} onChange={(e) => setMapa({ ...mapa, ordem: Number(e.target.value) })} /></label><label>Validação<input value={String(mapa.validacao ?? '')} onChange={(e) => setMapa({ ...mapa, validacao: e.target.value })} /></label><label className="pimCheckEditor">Obrigatório<input type="checkbox" checked={Boolean(mapa.obrigatorio)} onChange={(e) => setMapa({ ...mapa, obrigatorio: e.target.checked })} /></label><label className="pimCheckEditor">Ativo<input type="checkbox" checked={mapa.ativo !== false} onChange={(e) => setMapa({ ...mapa, ativo: e.target.checked })} /></label><div className="rodapeAcoes"><button type="button" className="ghost" onClick={() => setMapaAberto(false)}>Cancelar</button><button className="primary">Salvar vínculo</button></div></form></div>}
      <TabelaPimCompacta
        titulo={telaNome === 'pimAtributos' ? 'Catálogo completo de atributos' : titulo}
        nomeArquivo={`pim-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        linhas={linhas}
        colunas={colunas.length ? colunas : ['status']}
        onRowDoubleClick={editorModal ? (linha) => editarAtributo(linha) : undefined}
        renderAcoes={telaNome === 'pimAtributos' ? (linha) => <><button type="button" className="ghost" onClick={() => editarAtributo(linha)}>Editar</button><button type="button" className="danger" onClick={async () => { await excluirAtributoPim(Number(linha.id)); setMensagem('Atributo inativado.'); await carregar(); }}>Inativar</button></> : telaNome === 'pimCanais' ? (linha) => <><button type="button" className="ghost" onClick={() => editarAtributo(linha)}>Editar</button><button type="button" className={linha.ativo === false ? 'ghost' : 'danger'} onClick={() => alterarStatusCanal(linha)}>{linha.ativo === false ? 'Reativar' : 'Inativar'}</button></> : undefined}
      />
    </section>
  );
}

function EmpresasPim({ aoFechar }: { aoFechar: () => void }) {
  const [empresas, setEmpresas] = useState<RegistroGenerico[]>([]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({ ativa: true });
  const [editorAberto, setEditorAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function carregar() {
    setEmpresas(await listarEmpresas());
  }

  useEffect(() => {
    carregar().catch((error) => setErro(error instanceof Error ? error.message : 'Falha ao carregar empresas.'));
  }, []);

  function novo() {
    setFormulario({ ativa: true });
    setMensagem('');
    setErro('');
    setEditorAberto(true);
  }

  function editar(linha: RegistroGenerico) {
    setFormulario({ ...linha });
    setMensagem('');
    setErro('');
    setEditorAberto(true);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setMensagem('');
    setErro('');
    try {
      await salvarEmpresa(formulario);
      setMensagem('Empresa salva.');
      setEditorAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar empresa.');
    }
  }

  async function alterarAtivo(linha: RegistroGenerico) {
    setMensagem('');
    setErro('');
    try {
      if (linha.ativa !== false) await excluirEmpresa(Number(linha.id));
      else await salvarEmpresa({ ...linha, ativa: true });
      setMensagem(linha.ativa !== false ? 'Empresa inativada.' : 'Empresa reativada.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao alterar o status da empresa.');
    }
  }

  const empresasFiltradas = empresas.filter((empresa) => normalizarTextoPim(`${empresa.codigo_empresa ?? ''} ${empresa.nome_fantasia ?? ''} ${empresa.razao_social ?? ''} ${empresa.cnpj ?? ''}`).includes(normalizarTextoPim(busca)));

  return <div className="pimMatrizModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) aoFechar(); }}>
    <section className="pimMatrizModal pimConfiguracaoEmpresasModal" role="dialog" aria-modal="true" aria-label="Empresas">
      <header><div><span><Building2 size={15} /> Configurações</span><h3>Empresas</h3><p>Consulte e mantenha as empresas disponíveis para o módulo.</p></div><button type="button" className="ghost pimMatrizFecharModal" onClick={aoFechar}><X size={17} /></button></header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      <div className="pimBlocoTopo"><input placeholder="Buscar empresa, CNPJ ou código" value={busca} onChange={(e) => setBusca(e.target.value)} /><button type="button" className="primary" onClick={novo}><Building2 size={15} />Nova empresa</button></div>
      <TabelaPimCompacta titulo="Empresas cadastradas" nomeArquivo="pim-empresas" linhas={empresasFiltradas} colunas={['codigo_empresa', 'nome_fantasia', 'razao_social', 'cnpj', 'dominio_publico', 'ativa']} onRowDoubleClick={editar} renderAcoes={(linha) => <><button type="button" className="ghost" onClick={() => editar(linha)}>Editar</button><button type="button" className={linha.ativa === false ? 'ghost' : 'danger'} onClick={() => alterarAtivo(linha)}>{linha.ativa === false ? 'Reativar' : 'Inativar'}</button></>} vazio="Nenhuma empresa encontrada." />
      {editorAberto && <div className="pimCadastroEditorModalBackdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setEditorAberto(false); }}><form className="formCadastro pimCadastroEditor pimCadastroEditorModal" onSubmit={salvar} onClick={(evento) => evento.stopPropagation()}><div className="pimCadastroEditorTopo"><div><span>{formulario.id ? 'Editando empresa' : 'Nova empresa'}</span><strong>{String(formulario.nome_fantasia ?? formulario.razao_social ?? 'Cadastro de empresa')}</strong></div><button type="button" className="ghost" onClick={() => setEditorAberto(false)}>Cancelar</button></div><label>Código<input value={String(formulario.codigo_empresa ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo_empresa: e.target.value })} /></label><label>Razão social<input value={String(formulario.razao_social ?? '')} onChange={(e) => setFormulario({ ...formulario, razao_social: e.target.value })} /></label><label>Nome fantasia<input value={String(formulario.nome_fantasia ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_fantasia: e.target.value })} /></label><label>CNPJ<input value={String(formulario.cnpj ?? '')} onChange={(e) => setFormulario({ ...formulario, cnpj: e.target.value })} /></label><label>Domínio público<input value={String(formulario.dominio_publico ?? '')} onChange={(e) => setFormulario({ ...formulario, dominio_publico: e.target.value })} /></label><label>Nome exibido<input value={String(formulario.nome_exibido ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_exibido: e.target.value })} /></label><label className="campoLargo">Logo<input value={String(formulario.caminho_logo ?? '')} onChange={(e) => setFormulario({ ...formulario, caminho_logo: e.target.value })} /></label><label className="pimCheckEditor">Ativa<input type="checkbox" checked={formulario.ativa !== false} onChange={(e) => setFormulario({ ...formulario, ativa: e.target.checked })} /></label><div className="rodapeAcoes"><button type="button" className="ghost" onClick={() => setEditorAberto(false)}>Cancelar</button><button className="primary">Salvar empresa</button></div></form></div>}
    </section>
  </div>;
}

export function ConfiguracoesPim() {
  const abas = ['Geral', 'Atributos', 'Plataformas', 'Workflow', 'Importacao', 'Assets', 'IA', 'Integracoes', 'Notificacoes', 'Logs'];
  const [aba, setAba] = useState(abas[0]);
  const [dados, setDados] = useState<RegistroGenerico>({});
  const [mensagem, setMensagem] = useState('');
  const [testandoIa, setTestandoIa] = useState(false);
  const [empresasAberto, setEmpresasAberto] = useState(false);

  useEffect(() => {
    listarConfiguracoesPim().then((retorno) => {
      const ia = retorno.ia ?? {};
      setDados({
        ...(retorno.geral ?? {}),
        ia_ativa: ia.ativo ?? false,
        ia_modelo_padrao: ia.modelo_padrao ?? 'gpt-4.1-mini',
        ia_temperatura: ia.temperatura ?? 0.2,
        ia_limite_tokens: ia.limite_tokens ?? 1200,
        ia_chave_configurada: ia.chave_configurada ?? false
      });
    }).catch(() => setDados({}));
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    await salvarConfiguracoesPim(dados);
    setMensagem('Configuracoes do modulo salvas.');
  }

  async function testarIaConfigurada() {
    setTestandoIa(true);
    try {
      const retorno = await testarIaPim({ modelo: dados.ia_modelo_padrao, chave_openai: dados.ia_chave_openai });
      setMensagem(String(retorno.mensagem ?? (retorno.ok ? 'Conexao validada.' : 'Falha ao validar IA.')));
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : 'Falha ao testar IA.');
    } finally {
      setTestandoIa(false);
    }
  }

  const camposGeral = [
    ['nome_modulo', 'Nome do modulo'],
    ['descricao_modulo', 'Descricao do modulo'],
    ['status_modulo', 'Status do modulo'],
    ['logo_modulo', 'Logo do modulo'],
    ['moeda_padrao', 'Moeda padrao'],
    ['unidade_medida_padrao', 'Unidade de medida padrao'],
    ['idioma_padrao', 'Idioma padrao'],
    ['fuso_horario', 'Fuso horario'],
    ['precisao_decimal', 'Precisao decimal']
  ];
  const flags = [
    ['exigir_aprovacao_antes_publicacao', 'Exigir aprovacao antes da publicacao'],
    ['permitir_cadastro_duplicado_rascunho', 'Permitir cadastro duplicado em rascunho'],
    ['bloquear_edicao_direta_produto_publicado', 'Bloquear edicao direta de produto publicado'],
    ['gerar_historico_alteracoes', 'Gerar historico de alteracoes'],
    ['calcular_score_completude_por_canal', 'Calcular score de completude por canal']
  ];

  return (
    <section className="painelTabela configuracoesPainel">
            <header>
        <div>
          <span>Configurações por módulo</span>
          <h2>Cadastro de Produto Central</h2>
          <p>Configurações específicas do PIM, separadas das configurações gerais do Control S HUB.</p>
        </div>
        <div className="acoesDetalhe"><button type="button" className="ghost" onClick={() => setEmpresasAberto(true)}><Building2 size={15} />Empresas</button><button type="button" className="ghost" onClick={() => navegarParaTela('configuracoes')}><Settings size={15} />Configurações Gerais</button><button type="button" className="ghost" onClick={() => navegarParaTela('pimSqlConexoes')}><Database size={15} />Conexão SQL</button></div>
      </header>

      <div className="abasCotacao pimAbas">
        {abas.map((item) => <button key={item} className={aba === item ? 'active' : ''} onClick={() => setAba(item)}>{item}</button>)}
      </div>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {aba === 'Geral' ? (
        <form className="formCadastro" onSubmit={salvar}>
          {camposGeral.map(([chave, rotulo]) => <label key={chave}>{rotulo}<input value={String(dados[chave] ?? '')} onChange={(e) => setDados({ ...dados, [chave]: e.target.value })} /></label>)}
          {flags.map(([chave, rotulo]) => <label key={chave}>{rotulo}<input type="checkbox" checked={Boolean(dados[chave])} onChange={(e) => setDados({ ...dados, [chave]: e.target.checked })} /></label>)}
          <button className="primary">Salvar configuracoes</button>
        </form>
      ) : (
        <form className="formCadastro pimConfigForm" onSubmit={salvar}>
          {aba === 'Atributos' && (
            <>
              <label>Permitir criar atributo<input type="checkbox" checked={dados.permite_criar_atributo !== false} onChange={(e) => setDados({ ...dados, permite_criar_atributo: e.target.checked })} /></label>
              <label>Permitir inativar<input type="checkbox" checked={dados.permite_inativar_atributo !== false} onChange={(e) => setDados({ ...dados, permite_inativar_atributo: e.target.checked })} /></label>
              <label>Ordenacao manual<input type="checkbox" checked={dados.ordenacao_manual_atributos !== false} onChange={(e) => setDados({ ...dados, ordenacao_manual_atributos: e.target.checked })} /></label>
              <label>Escopo padrao<select value={String(dados.escopo_padrao ?? 'PRODUTO')} onChange={(e) => setDados({ ...dados, escopo_padrao: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'EVAPORADORA', 'CONDENSADORA', 'SKU', 'CANAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
            </>
          )}
          {aba === 'Plataformas' && (
            <>
              <label>Score minimo padrao<input type="number" value={String(dados.score_minimo_marketplace ?? 80)} onChange={(e) => setDados({ ...dados, score_minimo_marketplace: Number(e.target.value) })} /></label>
              <label>Mostrar pendencias<input type="checkbox" checked={dados.exibir_pendencias_marketplace !== false} onChange={(e) => setDados({ ...dados, exibir_pendencias_marketplace: e.target.checked })} /></label>
              <label>Bloquear publicacao sem categoria<input type="checkbox" checked={Boolean(dados.bloquear_sem_categoria_marketplace)} onChange={(e) => setDados({ ...dados, bloquear_sem_categoria_marketplace: e.target.checked })} /></label>
            </>
          )}
          {aba === 'Workflow' && (
            <>
              <label>Exigir aprovacao<input type="checkbox" checked={dados.exigir_aprovacao_workflow !== false} onChange={(e) => setDados({ ...dados, exigir_aprovacao_workflow: e.target.checked })} /></label>
              <label>Bloquear edicao de publicado<input type="checkbox" checked={dados.bloquear_publicado_workflow !== false} onChange={(e) => setDados({ ...dados, bloquear_publicado_workflow: e.target.checked })} /></label>
              <label>Permitir cadastro paralelo<input type="checkbox" checked={dados.cadastro_paralelo !== false} onChange={(e) => setDados({ ...dados, cadastro_paralelo: e.target.checked })} /></label>
            </>
          )}
          {aba === 'Importacao' && (
            <>
              <label>Importar sempre como rascunho<input type="checkbox" checked={dados.importacao_sempre_rascunho !== false} onChange={(e) => setDados({ ...dados, importacao_sempre_rascunho: e.target.checked })} /></label>
              <label>Salvar layout de de-para<input type="checkbox" checked={dados.importacao_salvar_layout !== false} onChange={(e) => setDados({ ...dados, importacao_salvar_layout: e.target.checked })} /></label>
              <label>Limite de linhas por arquivo<input type="number" value={String(dados.importacao_limite_linhas ?? 5000)} onChange={(e) => setDados({ ...dados, importacao_limite_linhas: Number(e.target.value) })} /></label>
            </>
          )}
          {aba === 'Assets' && (
            <>
              <label>Upload multiplo<input type="checkbox" checked={dados.assets_upload_multiplo !== false} onChange={(e) => setDados({ ...dados, assets_upload_multiplo: e.target.checked })} /></label>
              <label>Permitir URL externa<input type="checkbox" checked={dados.assets_url_externa !== false} onChange={(e) => setDados({ ...dados, assets_url_externa: e.target.checked })} /></label>
              <label>Tamanho maximo MB<input type="number" value={String(dados.assets_tamanho_max_mb ?? 25)} onChange={(e) => setDados({ ...dados, assets_tamanho_max_mb: Number(e.target.value) })} /></label>
            </>
          )}
          {aba === 'IA' && (
            <>
              <label>Ativar IA<input type="checkbox" checked={Boolean(dados.ia_ativa)} onChange={(e) => setDados({ ...dados, ia_ativa: e.target.checked })} /></label>
              <label>Modelo padrao<select value={String(dados.ia_modelo_padrao ?? 'gpt-4.1-mini')} onChange={(e) => setDados({ ...dados, ia_modelo_padrao: e.target.value })}>{['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o'].map((modelo) => <option key={modelo} value={modelo}>{modelo}</option>)}</select></label>
              <label>Temperatura<input type="number" value={String(dados.ia_temperatura ?? 0.2)} onChange={(e) => setDados({ ...dados, ia_temperatura: Number(e.target.value) })} /></label>
              <label>Limite de tokens<input type="number" value={String(dados.ia_limite_tokens ?? 1200)} onChange={(e) => setDados({ ...dados, ia_limite_tokens: Number(e.target.value) })} /></label>
              <label>Chave OpenAI<input type="password" value={String(dados.ia_chave_openai ?? '')} onChange={(e) => setDados({ ...dados, ia_chave_openai: e.target.value })} /></label>
              <label>Chave salva<input readOnly value={dados.ia_chave_configurada ? 'Sim' : 'Nao'} /></label>
              <button type="button" className="ghost" onClick={testarIaConfigurada} disabled={testandoIa}>{testandoIa ? 'Testando...' : 'Testar conexao IA'}</button>
            </>
          )}
          {aba === 'Integracoes' && (
            <>
              <label>Fila ativa<input type="checkbox" checked={dados.integracoes_fila_ativa !== false} onChange={(e) => setDados({ ...dados, integracoes_fila_ativa: e.target.checked })} /></label>
              <label>Ambiente padrao<select value={String(dados.integracoes_ambiente_padrao ?? 'HOMOLOGACAO')} onChange={(e) => setDados({ ...dados, integracoes_ambiente_padrao: e.target.value })}><option>HOMOLOGACAO</option><option>PRODUCAO</option></select></label>
              <label>Timeout segundos<input type="number" value={String(dados.integracoes_timeout_segundos ?? 30)} onChange={(e) => setDados({ ...dados, integracoes_timeout_segundos: Number(e.target.value) })} /></label>
            </>
          )}
          {aba === 'Notificacoes' && (
            <>
              <label>E-mail na aprovacao<input type="checkbox" checked={Boolean(dados.notificar_aprovacao)} onChange={(e) => setDados({ ...dados, notificar_aprovacao: e.target.checked })} /></label>
              <label>E-mail na publicacao<input type="checkbox" checked={Boolean(dados.notificar_publicacao)} onChange={(e) => setDados({ ...dados, notificar_publicacao: e.target.checked })} /></label>
              <label>E-mail em erro de integracao<input type="checkbox" checked={Boolean(dados.notificar_erro_integracao)} onChange={(e) => setDados({ ...dados, notificar_erro_integracao: e.target.checked })} /></label>
            </>
          )}
          {aba === 'Logs' && (
            <>
              <label>Reter logs por dias<input type="number" value={String(dados.logs_reter_dias ?? 365)} onChange={(e) => setDados({ ...dados, logs_reter_dias: Number(e.target.value) })} /></label>
              <label>Registrar campo a campo<input type="checkbox" checked={dados.logs_campo_a_campo !== false} onChange={(e) => setDados({ ...dados, logs_campo_a_campo: e.target.checked })} /></label>
              <label>Registrar payload de integracao<input type="checkbox" checked={dados.logs_payload_integracao !== false} onChange={(e) => setDados({ ...dados, logs_payload_integracao: e.target.checked })} /></label>
            </>
          )}
          <button className="primary">Salvar {aba}</button>
        </form>
      )}
      {empresasAberto && <EmpresasPim aoFechar={() => setEmpresasAberto(false)} />}
    </section>
  );
}
