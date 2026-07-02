import { BadgeCheck, Boxes, FileUp, ListChecks, PackageSearch, Settings, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  alterarStatusProdutoPim,
  buscarDashboardPim,
  duplicarProdutoPim,
  excluirProdutoPim,
  exportarProdutosPim,
  listarAssetsPim,
  listarAtributosPim,
  listarAuditoriaPim,
  listarCanaisPim,
  listarComponentesPim,
  listarConfiguracoesPim,
  listarImportacoesPim,
  listarProdutosPim,
  listarScoreCanaisPim,
  listarWorkflowsPim,
  obterProdutoPim,
  RegistroGenerico,
  registrarImportacaoPim,
  restaurarProdutoPim,
  salvarAssetPim,
  salvarAtributoPim,
  salvarCanalPim,
  salvarComponentePim,
  salvarConfiguracoesPim,
  salvarProdutoPim
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

const LOGO_CADASTRO_PRODUTO = '/brand/logo-cadastro-produto-central.svg';

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
        <article><span>Aguardando aprovação</span><strong>{indicadores.produtos_aguardando_aprovacao ?? 0}</strong></article>
        <article><span>Publicados</span><strong>{indicadores.produtos_publicados ?? 0}</strong></article>
        <article><span>Rejeitados</span><strong>{indicadores.produtos_rejeitados ?? 0}</strong></article>
        <article><span>Cadastro incompleto</span><strong>{indicadores.produtos_incompletos ?? 0}</strong></article>
        <article><span>Sem imagem</span><strong>{indicadores.produtos_sem_imagem ?? 0}</strong></article>
        <article><span>Sem EAN</span><strong>{indicadores.produtos_sem_ean ?? 0}</strong></article>
        <article><span>Sem categoria marketplace</span><strong>{indicadores.produtos_sem_categoria_marketplace ?? 0}</strong></article>
        <article><span>Score médio</span><strong>{indicadores.score_medio_completude ?? 0}%</strong></article>
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
          {canais.map((item: RegistroGenerico) => <p key={String(item.canal)}><strong>{String(item.canal)}</strong> · score {String(item.score ?? 0)}%</p>)}
        </div>
        <div className="rankingPainel">
          <span>Produtos por categoria</span>
          {categorias.map((item: RegistroGenerico) => <p key={String(item.categoria)}><strong>{String(item.categoria)}</strong> · {String(item.total)}</p>)}
        </div>
        <div className="rankingPainel">
          <span>Pendências por tipo</span>
          {pendencias.map((item: RegistroGenerico) => <p key={String(item.canal)}><strong>{String(item.canal)}</strong> · {String(item.total)} pendências</p>)}
          {pendencias.length === 0 && <p>Nenhum erro por canal registrado.</p>}
        </div>
      </div>
    </section>
  );
}

export function ProdutosPim({ modo = 'produtos' }: { modo?: 'produtos' | 'conjuntos' | 'skus' }) {
  const abasProduto = ['Identificação', 'Estrutura', 'Componentes', 'SKUs', 'Atributos Técnicos', 'Fiscal / Comercial', 'SEO', 'Imagens e Documentos', 'Marketplaces', 'Workflow', 'Histórico'];
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [editorAberto, setEditorAberto] = useState(false);
  const [abaProduto, setAbaProduto] = useState(abasProduto[0]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({ tipo_produto: modo === 'conjuntos' ? 'CONJUNTO' : 'PRODUTO', status: 'RASCUNHO', origem: 'MANUAL' });
  const [detalhe, setDetalhe] = useState<RegistroGenerico>({ skus: [], componentes: [], atributos: [], canais: [], assets: [], historico: [], aprovacoes: [] });
  const [atributosDisponiveis, setAtributosDisponiveis] = useState<RegistroGenerico[]>([]);
  const [linhaSku, setLinhaSku] = useState<RegistroGenerico>({ status: 'ATIVO', principal: false });
  const [linhaComponente, setLinhaComponente] = useState<RegistroGenerico>({ tipo_relacao: 'EVAPORADORA', quantidade: 1, obrigatorio: true });
  const [linhaAtributo, setLinhaAtributo] = useState<RegistroGenerico>({});
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function carregar() {
    const dados = await listarProdutosPim({ busca, status });
    const filtrados = modo === 'conjuntos'
      ? dados.filter((item) => ['CONJUNTO', 'KIT'].includes(String(item.tipo_produto)))
      : dados;
    setLinhas(filtrados);
  }

  useEffect(() => {
    carregar().catch(() => setLinhas([]));
    listarAtributosPim().then((dados) => setAtributosDisponiveis(dados.atributos)).catch(() => setAtributosDisponiveis([]));
  }, []);

  async function abrirProduto(linha?: RegistroGenerico, duplicar = false) {
    setErro('');
    setMensagem('');
    if (!linha?.id || duplicar) {
      setFormulario({
        ...(linha ?? {}),
        id: undefined,
        codigo_interno: duplicar ? `${linha?.codigo_interno ?? 'PIM'}-COPIA` : '',
        tipo_produto: modo === 'conjuntos' ? 'CONJUNTO' : 'PRODUTO',
        status: 'RASCUNHO',
        origem: 'MANUAL'
      });
      setDetalhe({ skus: [], componentes: [], atributos: [], canais: [], assets: [], historico: [], aprovacoes: [] });
    } else {
      const dados = await obterProdutoPim(Number(linha.id));
      setFormulario(dados.produto);
      setDetalhe(dados);
    }
    setAbaProduto('Identificação');
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
      const comentario = novoStatus === 'REJEITADO' ? 'Rejeitado pela rotina de aprovação do PIM.' : `Transição para ${novoStatus}.`;
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
      const colunas = ['codigo_interno', 'codigo_erp_decis', 'sku_interno', 'sku_comercial', 'ean_gtin', 'gtin', 'nome_comercial', 'marca', 'modelo', 'categoria', 'tipo_produto', 'status', 'score_completude'];
      const linhasCsv = [colunas.join(';'), ...dados.map((item) => colunas.map((coluna) => `"${String(item[coluna] ?? '').replace(/"/g, '""')}"`).join(';'))];
      const blob = new Blob([linhasCsv.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cadastro-produto-central-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMensagem('Exportação gerada em CSV.');
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
    setMensagem('Configure a chave OpenAI em IA & Enriquecimento para usar sugestões automáticas.');
  }

  const titulo = modo === 'conjuntos' ? 'Conjuntos' : modo === 'skus' ? 'SKUs' : 'Produtos';
  const pendencias = Array.isArray(formulario.pendencias_validacao) ? formulario.pendencias_validacao : [];

  return (
    <section className="painelTabela pimProdutoShell">
      <header>
        <div>
          <span>Cadastro mestre</span>
          <h2>{titulo}</h2>
          <p>PIM completo para produtos, conjuntos, componentes, SKUs, atributos, SEO, canais, workflow e histórico.</p>
        </div>
        <div className="acoesDetalhe">
          <button className="ghost" onClick={() => abrirProduto()}><PackageSearch size={15} />Novo produto</button>
          <button className="ghost" onClick={() => { abrirProduto({ tipo_produto: 'CONJUNTO' }); setAbaProduto('Componentes'); }}><Boxes size={15} />Criar conjunto</button>
          <button className="ghost" onClick={() => navegarParaTela('pimImportacao')}><FileUp size={15} />Importar planilha</button>
          <button className="ghost" onClick={exportar}>Exportar</button>
        </div>
      </header>
      <div className="filtrosLinha">
        <input placeholder="Buscar por SKU, EAN, GTIN, modelo, marca ou nome" value={busca} onChange={(evento) => setBusca(evento.target.value)} />
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
        <div className="tabelaWrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>SKU</th><th>EAN/GTIN</th><th>Nome</th><th>Marca</th><th>Modelo</th><th>Tipo</th><th>Status</th><th>Score</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={String(linha.id)}>
                  <td>{String(linha.codigo_interno ?? '-')}</td>
                  <td>{String(linha.sku_interno ?? '-')}</td>
                  <td>{String(linha.ean_gtin ?? linha.gtin ?? '-')}</td>
                  <td>{String(linha.nome_comercial ?? linha.modelo ?? '-')}</td>
                  <td>{String(linha.marca ?? '-')}</td>
                  <td>{String(linha.modelo ?? '-')}</td>
                  <td>{String(linha.tipo_produto ?? '-')}</td>
                  <td>{String(linha.status ?? '-')}</td>
                  <td><span className="scorePill">{String(linha.score_completude ?? 0)}%</span></td>
                  <td className="acoesTabela">
                    <button className="ghost" onClick={() => abrirProduto(linha)}>Abrir</button>
                    <button className="ghost" onClick={() => duplicarLinha(linha)}>Duplicar</button>
                    <button className="ghost" onClick={() => alterarStatus(Number(linha.id), 'AGUARDANDO_APROVACAO')}>Enviar</button>
                    <button className="ghost" onClick={() => alterarStatus(Number(linha.id), 'ARQUIVADO')}>Arquivar</button>
                    <button className="ghost" onClick={() => restaurarLinha(linha)}>Restaurar</button>
                    <button className="danger" onClick={() => excluirProdutoPim(Number(linha.id)).then(carregar)}>Excluir</button>
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && <tr><td colSpan={10}>Nenhum produto encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editorAberto && (
        <form onSubmit={salvar}>
          <div className="pimProdutoHeader">
            <div>
              <span>{String(formulario.codigo_interno || 'Novo produto')}</span>
              <h3>{String(formulario.nome_comercial || formulario.modelo || 'Cadastro mestre')}</h3>
              <p>{String(formulario.marca ?? 'Marca')} · {String(formulario.tipo_produto ?? 'PRODUTO')} · {String(formulario.status ?? 'RASCUNHO')}</p>
            </div>
            <div className="pimScoreBox">
              <span>Completude</span>
              <strong>{String(formulario.score_completude ?? 0)}%</strong>
              <small>{pendencias.length ? `${pendencias.length} pendências` : 'Sem pendências críticas'}</small>
            </div>
          </div>
          <div className="abasCotacao pimAbas">
            {abasProduto.map((item) => <button type="button" key={item} className={abaProduto === item ? 'active' : ''} onClick={() => setAbaProduto(item)}>{item}</button>)}
          </div>
          <section className="abaPainel pimAbaProduto">
            {abaProduto === 'Identificação' && (
              <div className="formCadastro pimFormProduto semBorda">
                {[
                  ['codigo_interno', 'Código interno'], ['codigo_erp_decis', 'Código ERP Decis'], ['sku_interno', 'SKU interno'], ['sku_comercial', 'SKU comercial'],
                  ['codigo_fabricante', 'Código fabricante'], ['ean_gtin', 'EAN'], ['gtin', 'GTIN'], ['mpn', 'MPN'], ['nome_interno', 'Nome interno'],
                  ['nome_comercial', 'Nome comercial'], ['marca', 'Marca'], ['linha', 'Linha'], ['modelo', 'Modelo'], ['familia', 'Família'],
                  ['categoria', 'Categoria'], ['subcategoria', 'Subcategoria'], ['garantia', 'Garantia'], ['observacoes', 'Observações']
                ].map(([campo, rotulo]) => <label key={campo}>{rotulo}<input value={String(formulario[campo] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })} /></label>)}
                <label>Tipo<select value={String(formulario.tipo_produto ?? 'PRODUTO')} onChange={(e) => setFormulario({ ...formulario, tipo_produto: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'KIT', 'COMPONENTE', 'PECA', 'ACESSORIO'].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Status<select value={String(formulario.status ?? 'RASCUNHO')} onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}>{['RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'PUBLICADO', 'REJEITADO', 'ARQUIVADO'].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Origem<input value={String(formulario.origem ?? 'MANUAL')} onChange={(e) => setFormulario({ ...formulario, origem: e.target.value })} /></label>
              </div>
            )}
            {abaProduto === 'Estrutura' && (
              <div className="pimGridDuplo">
                <article><span>Estrutura de climatização</span><p>Produtos do tipo conjunto podem agrupar evaporadora, condensadora, controle, kit e acessórios com vínculo muitos-para-muitos.</p></article>
                <article><span>Dimensões</span><div className="formCadastro semBorda">{['peso', 'altura', 'largura', 'comprimento'].map((campo) => <label key={campo}>{campo}<input type="number" value={String(formulario[campo] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo]: Number(e.target.value) })} /></label>)}</div></article>
              </div>
            )}
            {abaProduto === 'Componentes' && (
              <>
                <div className="formCadastro semBorda">
                  <label>Tipo<select value={String(linhaComponente.tipo_relacao ?? 'EVAPORADORA')} onChange={(e) => setLinhaComponente({ ...linhaComponente, tipo_relacao: e.target.value })}>{['EVAPORADORA', 'CONDENSADORA', 'CONTROLE', 'KIT', 'ACESSORIO', 'OUTRO'].map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>Código<input value={String(linhaComponente.codigo ?? '')} onChange={(e) => setLinhaComponente({ ...linhaComponente, codigo: e.target.value })} /></label>
                  <label>Nome<input value={String(linhaComponente.nome ?? '')} onChange={(e) => setLinhaComponente({ ...linhaComponente, nome: e.target.value })} /></label>
                  <label>Ordem<input type="number" value={String(linhaComponente.ordem ?? 0)} onChange={(e) => setLinhaComponente({ ...linhaComponente, ordem: Number(e.target.value) })} /></label>
                  <label>Quantidade<input type="number" value={String(linhaComponente.quantidade ?? 1)} onChange={(e) => setLinhaComponente({ ...linhaComponente, quantidade: Number(e.target.value) })} /></label>
                  <label>Obrigatório<input type="checkbox" checked={Boolean(linhaComponente.obrigatorio)} onChange={(e) => setLinhaComponente({ ...linhaComponente, obrigatorio: e.target.checked })} /></label>
                  <label>Observação<input value={String(linhaComponente.observacao ?? '')} onChange={(e) => setLinhaComponente({ ...linhaComponente, observacao: e.target.value })} /></label>
                  <button type="button" className="ghost" onClick={adicionarComponente}>Criar componente</button>
                </div>
                <TabelaPimCompacta linhas={detalhe.componentes ?? []} colunas={['tipo_relacao', 'codigo', 'nome', 'ordem', 'quantidade', 'obrigatorio', 'observacao']} />
              </>
            )}
            {abaProduto === 'SKUs' && (
              <>
                <div className="formCadastro semBorda">
                  {['sku', 'sku_erp', 'sku_fornecedor', 'sku_marketplace', 'ean', 'codigo_fabricante'].map((campo) => <label key={campo}>{campo}<input value={String(linhaSku[campo] ?? '')} onChange={(e) => setLinhaSku({ ...linhaSku, [campo]: e.target.value })} /></label>)}
                  <label>Principal<input type="checkbox" checked={Boolean(linhaSku.principal)} onChange={(e) => setLinhaSku({ ...linhaSku, principal: e.target.checked })} /></label>
                  <label>Status<select value={String(linhaSku.status ?? 'ATIVO')} onChange={(e) => setLinhaSku({ ...linhaSku, status: e.target.value })}><option>ATIVO</option><option>INATIVO</option></select></label>
                  <button type="button" className="ghost" onClick={adicionarSku}>Adicionar SKU</button>
                </div>
                <TabelaPimCompacta linhas={detalhe.skus ?? []} colunas={['sku', 'sku_erp', 'sku_fornecedor', 'sku_marketplace', 'ean', 'codigo_fabricante', 'principal', 'status']} />
              </>
            )}
            {abaProduto === 'Atributos Técnicos' && (
              <>
                <div className="formCadastro semBorda">
                  <label>Atributo<select value={String(linhaAtributo.attribute_id ?? '')} onChange={(e) => setLinhaAtributo({ ...linhaAtributo, attribute_id: Number(e.target.value) })}><option value="">Selecione</option>{atributosDisponiveis.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome_exibido)} · {String(item.escopo)}</option>)}</select></label>
                  <label>Valor<input value={String(linhaAtributo.valor_texto ?? linhaAtributo.valor_numero ?? '')} onChange={(e) => setLinhaAtributo({ ...linhaAtributo, valor_texto: e.target.value })} /></label>
                  <button type="button" className="ghost" onClick={adicionarAtributo}>Adicionar atributo</button>
                </div>
                <TabelaPimCompacta linhas={detalhe.atributos ?? []} colunas={['grupo_nome', 'nome_exibido', 'codigo', 'escopo', 'tipo_campo', 'valor_texto', 'valor_numero']} />
              </>
            )}
            {abaProduto === 'Fiscal / Comercial' && (
              <div className="formCadastro pimFormProduto semBorda">
                {['ncm', 'cest'].map((campo) => <label key={campo}>{campo.toUpperCase()}<input value={String(formulario[campo] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })} /></label>)}
                <label>Moeda<input value={String(formulario.fiscal_comercial?.moeda ?? 'BRL')} onChange={(e) => setFormulario({ ...formulario, fiscal_comercial: { ...(formulario.fiscal_comercial ?? {}), moeda: e.target.value } })} /></label>
                <label>Preço referência<input type="number" value={String(formulario.fiscal_comercial?.preco ?? '')} onChange={(e) => setFormulario({ ...formulario, fiscal_comercial: { ...(formulario.fiscal_comercial ?? {}), preco: Number(e.target.value) } })} /></label>
              </div>
            )}
            {abaProduto === 'SEO' && (
              <div className="formCadastro pimFormProduto semBorda">
                {[
                  ['meta_title', 'Meta Title'], ['meta_description', 'Meta Description'], ['slug', 'Slug'], ['descricao_curta', 'Descrição curta'], ['descricao_longa', 'Descrição longa'], ['bullet_points', 'Bullet Points'], ['palavras_chave', 'Palavras-chave']
                ].map(([campo, rotulo]) => <label key={campo}>{rotulo}<input value={Array.isArray(formulario[campo]) ? formulario[campo].join('\n') : String(formulario[campo] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })} /></label>)}
                <button type="button" className="ghost" onClick={sugerirSeo}><Sparkles size={15} />Sugerir com IA</button>
              </div>
            )}
            {abaProduto === 'Imagens e Documentos' && <TabelaPimCompacta linhas={detalhe.assets ?? []} colunas={['nome', 'tipo', 'url', 'alt_text', 'principal', 'status']} vazio="Nenhum asset vinculado. Use a biblioteca Imagens e Documentos para upload múltiplo e vínculo." />}
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
            {abaProduto === 'Histórico' && <TabelaPimCompacta linhas={detalhe.historico ?? []} colunas={['criado_em', 'campo', 'valor_anterior', 'valor_novo', 'origem', 'usuario_nome']} />}
          </section>
          <div className="rodapeAcoes">
            <button type="button" className="ghost" onClick={() => setEditorAberto(false)}>Voltar à lista</button>
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

function TabelaPimCompacta({ linhas, colunas, vazio = 'Nenhum registro encontrado.' }: { linhas: RegistroGenerico[]; colunas: string[]; vazio?: string }) {
  return (
    <div className="tabelaWrap">
      <table>
        <thead><tr>{colunas.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}</tr></thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr key={String(linha.id ?? indice)}>
              {colunas.map((coluna) => <td key={coluna}>{Array.isArray(linha[coluna]) ? linha[coluna].join(', ') : typeof linha[coluna] === 'object' && linha[coluna] !== null ? JSON.stringify(linha[coluna]) : String(linha[coluna] ?? '-')}</td>)}
            </tr>
          ))}
          {linhas.length === 0 && <tr><td colSpan={colunas.length}>{vazio}</td></tr>}
        </tbody>
      </table>
    </div>
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
    if (tela === 'pimIa' || tela === 'pimIntegracoes') {
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
      {tela === 'pimCanais' && <ScoreCanaisPim />}
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {aberto && (
        <form className="formCadastro" onSubmit={salvar}>
          {tela === 'pimComponentes' && (
            <>
              <label>Código<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
              <label>Nome<input value={String(formulario.nome ?? '')} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_componente ?? 'EVAPORADORA')} onChange={(e) => setFormulario({ ...formulario, tipo_componente: e.target.value })}>{['EVAPORADORA', 'CONDENSADORA', 'CONTROLE_REMOTO', 'KIT_INSTALACAO', 'ACESSORIO', 'OUTRO'].map((item) => <option key={item}>{item}</option>)}</select></label>
            </>
          )}
          {tela === 'pimAtributos' && (
            <>
              <label>Grupo<select value={String(formulario.attribute_group_id ?? '')} onChange={(e) => setFormulario({ ...formulario, attribute_group_id: Number(e.target.value) })}><option value="">Selecione</option>{(extra.grupos ?? []).map((g: RegistroGenerico) => <option key={String(g.id)} value={String(g.id)}>{String(g.nome)}</option>)}</select></label>
              <label>Código<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
              <label>Nome exibido<input value={String(formulario.nome_exibido ?? '')} onChange={(e) => setFormulario({ ...formulario, nome_exibido: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_campo ?? 'TEXTO')} onChange={(e) => setFormulario({ ...formulario, tipo_campo: e.target.value })}>{['TEXTO', 'NUMERO', 'DECIMAL', 'LISTA', 'MULTIPLA_ESCOLHA', 'BOOLEANO', 'DATA', 'URL', 'ARQUIVO', 'IMAGEM'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Escopo<select value={String(formulario.escopo ?? 'PRODUTO')} onChange={(e) => setFormulario({ ...formulario, escopo: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'COMPONENTE', 'EVAPORADORA', 'CONDENSADORA', 'SKU', 'CANAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Obrigatório<input type="checkbox" checked={Boolean(formulario.obrigatorio)} onChange={(e) => setFormulario({ ...formulario, obrigatorio: e.target.checked })} /></label>
            </>
          )}
          {tela === 'pimCanais' && (
            <>
              <label>Código<input value={String(formulario.codigo ?? '')} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
              <label>Nome<input value={String(formulario.nome ?? '')} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label>
              <label>Tipo<select value={String(formulario.tipo_canal ?? 'MARKETPLACE')} onChange={(e) => setFormulario({ ...formulario, tipo_canal: e.target.value })}>{['ERP', 'ECOMMERCE', 'MARKETPLACE', 'ADS', 'OUTRO'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Score mínimo<input type="number" value={String(formulario.score_minimo_publicacao ?? 80)} onChange={(e) => setFormulario({ ...formulario, score_minimo_publicacao: Number(e.target.value) })} /></label>
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
      <div className="tabelaWrap">
        <table>
          <thead><tr>{(colunas.length ? colunas : ['status']).map((coluna) => <th key={coluna}>{coluna}</th>)}</tr></thead>
          <tbody>
            {linhas.map((linha, indice) => <tr key={String(linha.id ?? indice)}>{(colunas.length ? colunas : ['status']).map((coluna) => <td key={coluna}>{typeof linha[coluna] === 'object' ? JSON.stringify(linha[coluna]) : String(linha[coluna] ?? '-')}</td>)}</tr>)}
            {linhas.length === 0 && <tr><td>Nenhum registro encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreCanaisPim() {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);

  useEffect(() => {
    listarScoreCanaisPim().then(setLinhas).catch(() => setLinhas([]));
  }, []);

  if (!linhas.length) return null;

  return (
    <div className="scoreCanais">
      <strong>Score de Completude por Canal</strong>
      <div className="tabelaWrap">
        <table>
          <thead><tr><th>Produto</th><th>Cadastro Mestre</th><th>Canal</th><th>Score</th><th>Campos faltantes</th></tr></thead>
          <tbody>
            {linhas.slice(0, 12).map((linha, indice) => (
              <tr key={`${linha.product_id}-${linha.canal}-${indice}`}>
                <td>{String(linha.codigo_interno)} · {String(linha.modelo ?? '-')}</td>
                <td>{String(linha.cadastro_mestre ?? 0)}%</td>
                <td>{String(linha.canal)}</td>
                <td>{String(linha.score_canal ?? 0)}%</td>
                <td>{Array.isArray(linha.campos_faltantes) ? linha.campos_faltantes.join(', ') : String(linha.campos_faltantes ?? '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ConfiguracoesPim() {
  const abas = ['Geral', 'Atributos', 'Marketplaces', 'Workflow', 'Importação', 'Assets', 'IA', 'Integrações', 'Notificações', 'Logs'];
  const [aba, setAba] = useState(abas[0]);
  const [dados, setDados] = useState<RegistroGenerico>({});
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    listarConfiguracoesPim().then((retorno) => setDados(retorno.geral ?? {})).catch(() => setDados({}));
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    await salvarConfiguracoesPim(dados);
    setMensagem('Configurações do módulo salvas.');
  }

  const camposGeral = [
    ['nome_modulo', 'Nome do módulo'],
    ['descricao_modulo', 'Descrição do módulo'],
    ['status_modulo', 'Status do módulo'],
    ['logo_modulo', 'Logo do módulo'],
    ['prefixo_sku_interno', 'Prefixo de SKU interno'],
    ['tamanho_codigo_sku', 'Tamanho do código SKU'],
    ['proximo_numero_sequencial', 'Próximo número sequencial'],
    ['separador_codigo_composto', 'Separador para código composto'],
    ['moeda_padrao', 'Moeda padrão'],
    ['unidade_medida_padrao', 'Unidade de medida padrão'],
    ['idioma_padrao', 'Idioma padrão'],
    ['fuso_horario', 'Fuso horário'],
    ['precisao_decimal', 'Precisão decimal']
  ];
  const flags = [
    ['exigir_aprovacao_antes_publicacao', 'Exigir aprovação antes da publicação'],
    ['permitir_cadastro_duplicado_rascunho', 'Permitir cadastro duplicado em rascunho'],
    ['bloquear_edicao_direta_produto_publicado', 'Bloquear edição direta de produto publicado'],
    ['gerar_historico_alteracoes', 'Gerar histórico de alterações'],
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
      </header>
      <div className="abasCotacao pimAbas">
        {abas.map((item) => <button key={item} className={aba === item ? 'active' : ''} onClick={() => setAba(item)}>{item}</button>)}
      </div>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {aba === 'Geral' ? (
        <form className="formCadastro" onSubmit={salvar}>
          {camposGeral.map(([chave, rotulo]) => <label key={chave}>{rotulo}<input value={String(dados[chave] ?? '')} onChange={(e) => setDados({ ...dados, [chave]: e.target.value })} /></label>)}
          {flags.map(([chave, rotulo]) => <label key={chave}>{rotulo}<input type="checkbox" checked={Boolean(dados[chave])} onChange={(e) => setDados({ ...dados, [chave]: e.target.checked })} /></label>)}
          <button className="primary">Salvar configurações</button>
        </form>
      ) : (
        <form className="formCadastro pimConfigForm" onSubmit={salvar}>
          {aba === 'Atributos' && (
            <>
              <label>Permitir criar atributo<input type="checkbox" checked={dados.permite_criar_atributo !== false} onChange={(e) => setDados({ ...dados, permite_criar_atributo: e.target.checked })} /></label>
              <label>Permitir inativar<input type="checkbox" checked={dados.permite_inativar_atributo !== false} onChange={(e) => setDados({ ...dados, permite_inativar_atributo: e.target.checked })} /></label>
              <label>Ordenação manual<input type="checkbox" checked={dados.ordenacao_manual_atributos !== false} onChange={(e) => setDados({ ...dados, ordenacao_manual_atributos: e.target.checked })} /></label>
              <label>Escopo padrão<select value={String(dados.escopo_padrao ?? 'PRODUTO')} onChange={(e) => setDados({ ...dados, escopo_padrao: e.target.value })}>{['PRODUTO', 'CONJUNTO', 'EVAPORADORA', 'CONDENSADORA', 'SKU', 'CANAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
            </>
          )}
          {aba === 'Marketplaces' && (
            <>
              <label>Score mínimo padrão<input type="number" value={String(dados.score_minimo_marketplace ?? 80)} onChange={(e) => setDados({ ...dados, score_minimo_marketplace: Number(e.target.value) })} /></label>
              <label>Mostrar pendências<input type="checkbox" checked={dados.exibir_pendencias_marketplace !== false} onChange={(e) => setDados({ ...dados, exibir_pendencias_marketplace: e.target.checked })} /></label>
              <label>Bloquear publicação sem categoria<input type="checkbox" checked={Boolean(dados.bloquear_sem_categoria_marketplace)} onChange={(e) => setDados({ ...dados, bloquear_sem_categoria_marketplace: e.target.checked })} /></label>
            </>
          )}
          {aba === 'Workflow' && (
            <>
              <label>Exigir aprovação<input type="checkbox" checked={dados.exigir_aprovacao_workflow !== false} onChange={(e) => setDados({ ...dados, exigir_aprovacao_workflow: e.target.checked })} /></label>
              <label>Bloquear edição de publicado<input type="checkbox" checked={dados.bloquear_publicado_workflow !== false} onChange={(e) => setDados({ ...dados, bloquear_publicado_workflow: e.target.checked })} /></label>
              <label>Permitir cadastro paralelo<input type="checkbox" checked={dados.cadastro_paralelo !== false} onChange={(e) => setDados({ ...dados, cadastro_paralelo: e.target.checked })} /></label>
            </>
          )}
          {aba === 'Importação' && (
            <>
              <label>Importar sempre como rascunho<input type="checkbox" checked={dados.importacao_sempre_rascunho !== false} onChange={(e) => setDados({ ...dados, importacao_sempre_rascunho: e.target.checked })} /></label>
              <label>Salvar layout de de-para<input type="checkbox" checked={dados.importacao_salvar_layout !== false} onChange={(e) => setDados({ ...dados, importacao_salvar_layout: e.target.checked })} /></label>
              <label>Limite de linhas por arquivo<input type="number" value={String(dados.importacao_limite_linhas ?? 5000)} onChange={(e) => setDados({ ...dados, importacao_limite_linhas: Number(e.target.value) })} /></label>
            </>
          )}
          {aba === 'Assets' && (
            <>
              <label>Upload múltiplo<input type="checkbox" checked={dados.assets_upload_multiplo !== false} onChange={(e) => setDados({ ...dados, assets_upload_multiplo: e.target.checked })} /></label>
              <label>Permitir URL externa<input type="checkbox" checked={dados.assets_url_externa !== false} onChange={(e) => setDados({ ...dados, assets_url_externa: e.target.checked })} /></label>
              <label>Tamanho máximo MB<input type="number" value={String(dados.assets_tamanho_max_mb ?? 25)} onChange={(e) => setDados({ ...dados, assets_tamanho_max_mb: Number(e.target.value) })} /></label>
            </>
          )}
          {aba === 'IA' && (
            <>
              <label>Ativar IA<input type="checkbox" checked={Boolean(dados.ia_ativa)} onChange={(e) => setDados({ ...dados, ia_ativa: e.target.checked })} /></label>
              <label>Modelo padrão<input value={String(dados.ia_modelo_padrao ?? 'gpt-4.1-mini')} onChange={(e) => setDados({ ...dados, ia_modelo_padrao: e.target.value })} /></label>
              <label>Temperatura<input type="number" value={String(dados.ia_temperatura ?? 0.2)} onChange={(e) => setDados({ ...dados, ia_temperatura: Number(e.target.value) })} /></label>
              <label>Limite de tokens<input type="number" value={String(dados.ia_limite_tokens ?? 1200)} onChange={(e) => setDados({ ...dados, ia_limite_tokens: Number(e.target.value) })} /></label>
              <label>Chave OpenAI<input type="password" value={String(dados.ia_chave_openai ?? '')} onChange={(e) => setDados({ ...dados, ia_chave_openai: e.target.value })} /></label>
            </>
          )}
          {aba === 'Integrações' && (
            <>
              <label>Fila ativa<input type="checkbox" checked={dados.integracoes_fila_ativa !== false} onChange={(e) => setDados({ ...dados, integracoes_fila_ativa: e.target.checked })} /></label>
              <label>Ambiente padrão<select value={String(dados.integracoes_ambiente_padrao ?? 'HOMOLOGACAO')} onChange={(e) => setDados({ ...dados, integracoes_ambiente_padrao: e.target.value })}><option>HOMOLOGACAO</option><option>PRODUCAO</option></select></label>
              <label>Timeout segundos<input type="number" value={String(dados.integracoes_timeout_segundos ?? 30)} onChange={(e) => setDados({ ...dados, integracoes_timeout_segundos: Number(e.target.value) })} /></label>
            </>
          )}
          {aba === 'Notificações' && (
            <>
              <label>E-mail na aprovação<input type="checkbox" checked={Boolean(dados.notificar_aprovacao)} onChange={(e) => setDados({ ...dados, notificar_aprovacao: e.target.checked })} /></label>
              <label>E-mail na publicação<input type="checkbox" checked={Boolean(dados.notificar_publicacao)} onChange={(e) => setDados({ ...dados, notificar_publicacao: e.target.checked })} /></label>
              <label>E-mail em erro de integração<input type="checkbox" checked={Boolean(dados.notificar_erro_integracao)} onChange={(e) => setDados({ ...dados, notificar_erro_integracao: e.target.checked })} /></label>
            </>
          )}
          {aba === 'Logs' && (
            <>
              <label>Reter logs por dias<input type="number" value={String(dados.logs_reter_dias ?? 365)} onChange={(e) => setDados({ ...dados, logs_reter_dias: Number(e.target.value) })} /></label>
              <label>Registrar campo a campo<input type="checkbox" checked={dados.logs_campo_a_campo !== false} onChange={(e) => setDados({ ...dados, logs_campo_a_campo: e.target.checked })} /></label>
              <label>Registrar payload de integração<input type="checkbox" checked={dados.logs_payload_integracao !== false} onChange={(e) => setDados({ ...dados, logs_payload_integracao: e.target.checked })} /></label>
            </>
          )}
          <button className="primary">Salvar {aba}</button>
        </form>
      )}
    </section>
  );
}

