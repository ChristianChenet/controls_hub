import { BadgeCheck, Boxes, FileUp, ListChecks, PackageSearch, Settings, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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
  listarAssetsPim,
  listarAtributosPim,
  listarAuditoriaPim,
  listarCanaisPim,
  listarConexoesSqlServerPim,
  listarConsultasSqlServerPim,
  listarComponentesPim,
  listarConfiguracoesPim,
  listarImportacoesPim,
  listarMapeamentosAtributosCanaisPim,
  listarProdutosPim,
  listarWorkflowsPim,
  obterProdutoPim,
  RegistroGenerico,
  registrarImportacaoPim,
  restaurarProdutoPim,
  salvarAssetPim,
  salvarAtributoPim,
  salvarCanalPim,
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
  | 'pimAtributos'
  | 'pimCanais'
  | 'pimImportacao'
  | 'pimAssets'
  | 'pimWorkflows'
  | 'pimAprovacoes'
  | 'pimIa'
  | 'pimIntegracoes'
  | 'pimAuditoria'
  | 'pimConfiguracoes';

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
    pimAtributos: '/Cadastro_Produto_Central/Atributos',
    pimCanais: '/Cadastro_Produto_Central/Canais',
    pimImportacao: '/Cadastro_Produto_Central/Importacao',
    pimAssets: '/Cadastro_Produto_Central/Assets',
    pimWorkflows: '/Cadastro_Produto_Central/Workflows',
    pimAprovacoes: '/Cadastro_Produto_Central/Aprovacoes',
    pimIa: '/Cadastro_Produto_Central/IA',
    pimIntegracoes: '/Cadastro_Produto_Central/Integracoes',
    pimAuditoria: '/Cadastro_Produto_Central/Auditoria',
    pimConfiguracoes: '/Cadastro_Produto_Central/Configuracoes'
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
        <article><span>Total de produtos</span><strong>{indicadores.total_produtos ?? 0}</strong></article>
        <article><span>Rascunho</span><strong>{indicadores.produtos_rascunho ?? 0}</strong></article>
        <article><span>Aguardando aprovacao</span><strong>{indicadores.produtos_aguardando_aprovacao ?? 0}</strong></article>
        <article><span>Publicados</span><strong>{indicadores.produtos_publicados ?? 0}</strong></article>
        <article><span>Rejeitados</span><strong>{indicadores.produtos_rejeitados ?? 0}</strong></article>
        <article><span>Cadastro incompleto</span><strong>{indicadores.produtos_incompletos ?? 0}</strong></article>
        <article><span>Sem imagem</span><strong>{indicadores.produtos_sem_imagem ?? 0}</strong></article>
        <article><span>Sem EAN</span><strong>{indicadores.produtos_sem_ean ?? 0}</strong></article>
        <article><span>Sem categoria marketplace</span><strong>{indicadores.produtos_sem_categoria_marketplace ?? 0}</strong></article>
        <article><span>Score medio</span><strong>{indicadores.score_medio_completude ?? 0}%</strong></article>
      </div>
      <div className="dashboardGrid pimDashboardGrid">
        <div className="rankingPainel">
          <span>Produtos por status</span>
          {status.map((item: RegistroGenerico) => (
            <div className="barraDashboard" key={String(item.status)}>
              <strong>{String(item.status)}</strong>
              <span style={{ width: `${Math.max(8, (Number(item.total ?? 0) / maxStatus) * 100)}%` }} />
              <small>{String(item.total)} produtos</small>
            </div>
          ))}
          {status.length === 0 && <p>Nenhum produto cadastrado.</p>}
        </div>
        <div className="rankingPainel">
          <span>Produtos por canal</span>
          {canais.map((item: RegistroGenerico) => <p key={String(item.canal)}><strong>{String(item.canal)}</strong> - score {String(item.score ?? 0)}%</p>)}
        </div>
        <div className="rankingPainel">
          <span>Produtos por categoria</span>
          {categorias.map((item: RegistroGenerico) => <p key={String(item.categoria)}><strong>{String(item.categoria)}</strong> - {String(item.total)}</p>)}
        </div>
        <div className="rankingPainel">
          <span>Pendencias por tipo</span>
          {pendencias.map((item: RegistroGenerico) => <p key={String(item.canal)}><strong>{String(item.canal)}</strong> - {String(item.total)} pendencias</p>)}
          {pendencias.length === 0 && <p>Nenhum erro por canal registrado.</p>}
        </div>
      </div>
    </section>
  );
}

export function ProdutosPim({ modo = 'produtos' }: { modo?: 'produtos' | 'conjuntos' | 'skus' }) {
  const ehConjunto = modo === 'conjuntos';
  const tipoPadrao = ehConjunto ? 'SPLIT_HI_WALL' : 'EVAPORADORA';
  const abasProduto = modo === 'conjuntos'
    ? ['Identificacao', 'Estrutura', 'Produtos vinculados', 'Logistica', 'Comercial', 'Estoque / Controle', 'Atributos Tecnicos', 'SEO', 'Imagens e Documentos', 'Marketplaces', 'Workflow', 'Historico']
    : ['Identificacao', 'Logistica', 'Comercial', 'Estoque / Controle', 'Atributos Tecnicos', 'SEO', 'Imagens e Documentos', 'Marketplaces', 'Workflow', 'Historico'];
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
      setReferenciaIa('');
    } else {
      const dados = await obterProdutoPim(Number(linha.id));
      setFormulario(dados.produto);
      setDetalhe(dados);
      setReferenciaIa(String(dados.produto.codigo_fabricante ?? dados.produto.modelo ?? ''));
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

  async function compararComIa() {
    if (!formulario.id) {
      setErro('Salve o cadastro antes de comparar com IA.');
      return;
    }
    setErro('');
    setMensagem('');
    const retorno = await compararProdutoIaPim(Number(formulario.id), {
      codigo_referencia: referenciaIa,
      codigo_fabricante: formulario.codigo_fabricante,
      modelo: formulario.modelo,
      site_prioritario: siteIa
    });
    setResultadoIa(retorno);
    setMensagem(retorno.configurado === false ? String(retorno.mensagem ?? 'IA nao configurada.') : 'Comparacao com IA gerada.');
  }

  const titulo = ehConjunto ? 'Conjuntos' : 'Produtos';
  const descricaoTela = ehConjunto
    ? 'Conjuntos sao os itens vendidos. Aqui ficam composicao, produtos vinculados, atributos, imagens, canais e workflow.'
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
    return (
      <label key={campo}>
        {rotulo}
        <input
          type={tipo === 'numero' ? 'number' : 'text'}
          value={String(valor ?? '')}
          onChange={(e) => setFormulario({
            ...formulario,
            [campo]: tipo === 'numero' && e.target.value !== '' ? Number(e.target.value) : e.target.value,
            ...(campo === 'profundidade' ? { comprimento: e.target.value !== '' ? Number(e.target.value) : '' } : {})
          })}
        />
      </label>
    );
  }

  return (
    <section className="painelTabela pimProdutoShell">
      <header>
        <div>
          <span>Cadastro mestre</span>
          <h2>{titulo}</h2>
          <p>{descricaoTela}</p>
        </div>
        <div className="acoesDetalhe">
          <button className="ghost" onClick={() => abrirProduto()}><PackageSearch size={15} />{ehConjunto ? 'Novo conjunto' : 'Novo produto base'}</button>
          <button className="ghost" onClick={() => navegarParaTela('pimImportacao')}><FileUp size={15} />Importar planilha</button>
          <button className="ghost" onClick={exportar}>Exportar</button>
        </div>
      </header>
      <div className="filtrosLinha">
        <input placeholder="Buscar por codigo ERP, EAN, GTIN, modelo, marca ou nome" value={busca} onChange={(evento) => setBusca(evento.target.value)} />
        <select value={status} onChange={(evento) => setStatus(evento.target.value)}>
          <option value="">Todos os status</option>
          {['RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'PUBLICADO', 'REJEITADO', 'ARQUIVADO'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="ghost" onClick={carregar}>Filtrar</button>
        <button className="ghost" onClick={() => { setBusca(''); setStatus(''); setTimeout(() => carregar(), 0); }}>Limpar filtros</button>
      </div>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {!editorAberto && (
        <TabelaPimCompacta
          titulo={titulo}
          nomeArquivo={`pim-${titulo.toLowerCase()}`}
          linhas={linhas}
          colunas={['codigo_erp_decis', 'codigo_fabricante', 'ean_gtin', 'gtin', 'nome_comercial', 'marca', 'modelo', 'categoria', 'tipo_produto', 'status', 'score_completude', 'alterado_em']}
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
            <div>
              <span>{String(formulario.codigo_erp_decis || 'Novo cadastro')}</span>
              <h3>{String(formulario.nome_comercial || formulario.modelo || 'Cadastro mestre')}</h3>
              <p>{String(formulario.marca ?? 'Marca')} - {String(ROTULOS_TIPOS_CLIMATIZACAO[String(formulario.tipo_produto)] ?? formulario.tipo_produto ?? tipoPadrao)} - {String(formulario.status ?? 'RASCUNHO')}</p>
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
                      <label className="campoLargo">Referencia condensadora | evaporadora<input value={referenciaIa} onChange={(e) => setReferenciaIa(e.target.value)} placeholder="S3UW24K231A.EB2GAM1 | S3NW24K231A.EB2GAM1" /></label>
                      <label className="campoLargo">Fonte prioritaria<input value={siteIa} onChange={(e) => setSiteIa(e.target.value)} /></label>
                    </div>
                    {resultadoIa && <TabelaPimCompacta linhas={(resultadoIa.comparacao as RegistroGenerico[]) ?? []} colunas={['campo', 'valor_cadastro', 'valor_ia', 'valor_escolhido', 'diferente']} vazio="Nenhuma comparacao gerada." />}
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
            {abaProduto === 'Marketplaces' && <TabelaPimCompacta linhas={detalhe.canais ?? []} colunas={['canal_nome', 'status', 'score_completude', 'campos_faltantes', 'ultima_validacao_em']} vazio="Salve o produto para calcular o score por canal." />}
            {abaProduto === 'Workflow' && (
              <div className="workflowAcoes">
                {['RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'PUBLICADO', 'REJEITADO', 'ARQUIVADO'].map((item) => <button type="button" className={formulario.status === item ? 'primary' : 'ghost'} key={item} onClick={() => formulario.id ? alterarStatus(Number(formulario.id), item) : setFormulario({ ...formulario, status: item })}>{item}</button>)}
                <div className="comparacaoCadastro">
                  <strong>Cadastro paralelo</strong>
                  <TabelaPimCompacta linhas={[{ campo: 'Nome comercial', valor_a: formulario.nome_comercial ?? '-', valor_b: '-', valor_oficial: formulario.nome_comercial ?? '-', valor_escolhido: formulario.nome_comercial ?? '-', comentario: '' }]} colunas={['campo', 'valor_a', 'valor_b', 'valor_oficial', 'valor_escolhido', 'comentario']} />
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
  renderAcoes
}: {
  linhas: RegistroGenerico[];
  colunas: string[];
  vazio?: string;
  titulo?: string;
  nomeArquivo?: string;
  renderAcoes?: (linha: RegistroGenerico) => ReactNode;
}) {
  const [pagina, setPagina] = useState(1);
  const [filtro, setFiltro] = useState('');
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(colunas);
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
          <thead><tr>{colunasAtivas.map((coluna) => <th key={coluna}>{rotuloColunaPim(coluna)}</th>)}{renderAcoes && <th>Acoes</th>}</tr></thead>
          <tbody>
            {linhasPagina.map((linha, indice) => (
              <tr key={String(linha.id ?? `${paginaAtual}-${indice}`)}>
                {colunasAtivas.map((coluna) => <td key={coluna}>{valorCelulaTabela(linha[coluna])}</td>)}
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
  ['codigo_fabricante', 'REFERENCIA / Codigo fabricante'],
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
  ['Identificacao', 'volume', 'VOLUME']
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
  ['SEER', 'SEER', 'PRODUTO', 'DECIMAL'],
  ['EER', 'EER', 'PRODUTO', 'DECIMAL'],
  ['EFICIENCIA_ENERGETICA', 'Eficiencia energetica', 'PRODUTO', 'TEXTO'],
  ['CLASSIFICACAO_ENERGETICA', 'Classificacao energetica', 'PRODUTO', 'TEXTO'],
  ['CONSUMO_ENERGIA_PROCEL', 'Consumo energia PROCEL', 'PRODUTO', 'DECIMAL'],
  ['VAZAO_AR', 'Vazao de ar', 'PRODUTO', 'TEXTO'],
  ['NIVEL_RUIDO_INTERNO', 'Nivel ruido interno', 'PRODUTO', 'TEXTO'],
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
  ['AREA_APLICACAO', 'Area aplicacao', 'PRODUTO', 'TEXTO'],
  ['MATERIAL_SERPENTINA', 'Material serpentina', 'PRODUTO', 'TEXTO'],
  ['MATERIAL_GABINETE', 'Material gabinete', 'PRODUTO', 'TEXTO'],
  ['MATERIAL_GABINETE_CONDENSADORA', 'Material gabinete condensadora', 'PRODUTO', 'TEXTO'],
  ['MATERIAL_SERPENTINA_CONDENSADORA', 'Material serpentina condensadora', 'PRODUTO', 'TEXTO'],
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
  material_tubulacao: atributoMonvizo('MATERIAL_SERPENTINA_CONDENSADORA')
});

const ETAPAS_CARGA_SQL_PIM = [
  { tipo: 'PRODUTOS_BASE', titulo: '1. Produtos base / materia prima', detalhe: 'Importe evaporadoras, condensadoras, controles, kits, acessorios e componentes tecnicos.' },
  { tipo: 'CONJUNTOS', titulo: '2. Conjuntos / equipamentos vendidos', detalhe: 'Importe Split Hi Wall, Piso Teto, Cassete, Dutado, Multi Split, VRF, Chiller, Fan Coil e UTA.' },
  { tipo: 'PRODUTOS_CONJUNTO', titulo: '3. Vinculo conjunto x produtos', detalhe: 'Relacione cada conjunto aos produtos base ja cadastrados.' },
  { tipo: 'PRODUTOS_ITEM_CARACTERISTICAS', titulo: '4. Atributos dos produtos', detalhe: 'Carregue caracteristicas dos produtos base. Numericos podem alimentar a soma do conjunto.' },
  { tipo: 'PRODUTOS_CJ_CARACTERISTICAS', titulo: '5. Atributos dos conjuntos', detalhe: 'Carregue caracteristicas finais e especificas do conjunto.' },
  { tipo: 'ATRIBUTOS_MARKETPLACE', titulo: '6. Atributos por Marketplace', detalhe: 'Opcional: mapeamentos e ordem de atributos por canal.' }
];

function normalizarTextoPim(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
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
  return { colunas, previa, totalLinhas: linhas.length, separador };
}

async function lerArquivoImportacaoPim(file: File) {
  const extensao = file.name.split('.').pop()?.toLowerCase();
  if (extensao === 'csv' || extensao === 'txt') {
    return lerCsvPim(await file.text());
  }

  throw new Error('Para gerar o De/Para inteligente, exporte a planilha Excel como CSV e selecione o arquivo CSV. O cadastro oficial nao sera alterado sem validacao.');
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
    const campoOperacional = DEPARA_OPERACIONAL_MONVIZO_POR_COLUNA[normalizada];
    const campoAtributoMonvizo = DEPARA_ATRIBUTO_MONVIZO_POR_COLUNA[normalizada];
    const campoPorAlias = Object.entries(aliases).find(([, lista]) => lista.includes(normalizada))?.[0];
    const campoPorContem = Object.entries(aliases).find(([, lista]) => lista.some((alias) => normalizada.includes(alias) || alias.includes(normalizada)))?.[0];
    const campo = campoDireto ?? campoOperacional ?? campoAtributoMonvizo ?? campoPorAlias ?? campoPorContem ?? '';
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
    if (!file) return;
    setNomeLayout(file.name.replace(/\.[^.]+$/, ''));
    try {
      const leitura = await lerArquivoImportacaoPim(file);
      setColunas(leitura.colunas);
      setPrevia(leitura.previa);
      setTotalLinhas(leitura.totalLinhas);
      setSeparador(leitura.separador);
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
        observacao: 'Importacao registrada somente para atualizacao por codigo ERP. Produtos novos nao serao inseridos por planilha.'
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
          <p>Selecione um arquivo da maquina, valide as colunas e confirme o De/Para. Planilha apenas atualiza produtos existentes pela chave ERP.</p>
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

export function AtributosPim() {
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
  const [aberto, setAberto] = useState(false);
  const [assetsMarcados, setAssetsMarcados] = useState<number[]>([]);
  const [codigosErpAssets, setCodigosErpAssets] = useState('');
  const [assetMassaPrincipal, setAssetMassaPrincipal] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function carregar() {
    if (tela === 'pimComponentes') setLinhas(await listarComponentesPim());
    if (tela === 'pimAtributos') {
      const dados = await listarAtributosPim();
      setLinhas(dados.atributos);
      setExtra({ grupos: dados.grupos });
    }
    if (tela === 'pimCanais') setLinhas(await listarCanaisPim());
    if (tela === 'pimAssets') setLinhas(await listarAssetsPim());
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
  const colunas = Object.keys(linhas[0] ?? {}).slice(0, 8);

  return (
    <section className="painelTabela">
      <header>
        <div>
          <span>Cadastro de Produto Central</span>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        {editavel && <button className="ghost" onClick={() => setAberto(!aberto)}><Settings size={15} />Novo registro</button>}
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {tela === 'pimAssets' && (
        <div className="pimBlocoInterno">
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
      {aberto && (
        <form className="formCadastro" onSubmit={salvar}>
          {tela === 'pimComponentes' && (
            <>
              <label>Codigo<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
              <label>Nome<input value={String(formulario.nome ?? '')} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_componente ?? 'EVAPORADORA')} onChange={(e) => setFormulario({ ...formulario, tipo_componente: e.target.value })}>{['EVAPORADORA', 'CONDENSADORA', 'CONTROLE_REMOTO', 'KIT_INSTALACAO', 'ACESSORIO', 'OUTRO'].map((item) => <option key={item}>{item}</option>)}</select></label>
            </>
          )}
          {tela === 'pimAtributos' && (
            <>
              <label>Grupo<select value={String(formulario.attribute_group_id ?? '')} onChange={(e) => setFormulario({ ...formulario, attribute_group_id: Number(e.target.value) })}><option value="">Selecione</option>{(extra.grupos ?? []).map((g: RegistroGenerico) => <option key={String(g.id)} value={String(g.id)}>{String(g.nome)}</option>)}</select></label>
              <label>Codigo<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
              <label>Nome exibido<input value={String(formulario.nome_exibido ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_exibido: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_campo ?? 'TEXTO')} onChange={(e) => setFormulario({ ...formulario, tipo_campo: e.target.value })}>{['TEXTO', 'NUMERO', 'DECIMAL', 'LISTA', 'MULTIPLA_ESCOLHA', 'BOOLEANO', 'DATA', 'URL', 'ARQUIVO', 'IMAGEM'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Escopo<select value={String(formulario.escopo ?? 'PRODUTO')} onChange={(e) => setFormulario({ ...formulario, escopo: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'COMPONENTE', 'EVAPORADORA', 'CONDENSADORA', 'SKU', 'CANAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Obrigatorio<input type="checkbox" checked={Boolean(formulario.obrigatorio)} onChange={(e) => setFormulario({ ...formulario, obrigatorio: e.target.checked })} /></label>
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
      <TabelaPimCompacta
        titulo={titulo}
        nomeArquivo={`pim-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        linhas={linhas}
        colunas={colunas.length ? colunas : ['status']}
      />
    </section>
  );
}

export function ConfiguracoesPim() {
  const abas = ['Geral', 'Atributos', 'Marketplaces', 'Workflow', 'Importacao', 'Assets', 'IA', 'Integracoes', 'Notificacoes', 'Logs'];
  const [aba, setAba] = useState(abas[0]);
  const [dados, setDados] = useState<RegistroGenerico>({});
  const [mensagem, setMensagem] = useState('');
  const [testandoIa, setTestandoIa] = useState(false);

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
          <span>Configuracoes por modulo</span>
          <h2>Cadastro de Produto Central</h2>
          <p>Configuracoes especificas do PIM, separadas das configuracoes gerais do Control S HUB.</p>
        </div>
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
          {aba === 'Marketplaces' && (
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
    </section>
  );
}


