const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export type UsuarioLogado = {
  id: number;
  nome: string;
  email: string;
  administrador: boolean;
  superadmin: boolean;
  empresaAtivaId?: number;
  permissoes?: string[];
  preferencias_interface?: Record<string, unknown>;
};

export type EmpresaUsuario = {
  id: number;
  codigo_empresa: string;
  razao_social: string;
  nome_fantasia: string;
  nome_exibido: string;
  caminho_logo?: string;
  caminho_imagem_fundo?: string;
  dominio_publico?: string;
  padrao: boolean;
};

export type FonteTela = {
  codigo: string;
  nome: string;
  rota: string;
  arquivo_fonte: string;
  componentes_principais?: string;
  endpoints_usados?: string;
  tabelas_principais?: string;
  rotinas_relacionadas?: string;
};

export type RegistroGenerico = Record<string, any>;

async function requisitar<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  const token = localStorage.getItem('controlSHubToken');
  let resposta: Response;

  try {
    resposta = await fetch(`${API_BASE}${caminho}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opcoes?.headers ?? {})
      }
    });
  } catch (erro) {
    throw new Error(`Falha de comunicacao com a API. Endpoint: ${caminho}. URL: ${API_BASE}${caminho}. Erro: ${erro instanceof Error ? erro.message : String(erro)}`);
  }

  const texto = await resposta.text();
  const payload = texto ? (() => {
    try {
      return JSON.parse(texto);
    } catch {
      return { sucesso: false, erro: { mensagem: texto } };
    }
  })() : null;

  if (!resposta.ok || payload?.sucesso === false) {
    throw new Error(payload?.erro?.mensagem ?? payload?.message ?? `Erro HTTP ${resposta.status} ao chamar ${caminho}.`);
  }

  return payload?.dados ?? payload;
}

export async function entrar(email: string, senha: string) {
  return requisitar<{
    token: string;
    usuario: UsuarioLogado;
    empresas: EmpresaUsuario[];
    permissoes: string[];
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha })
  });
}


export async function obterSessaoAtual() {
  return requisitar<{
    usuario: UsuarioLogado;
    empresas: EmpresaUsuario[];
    permissoes: string[];
  }>('/api/auth/sessao');
}

export async function trocarEmpresa(empresa_id: number) {
  return requisitar<{ token: string; empresa: EmpresaUsuario; permissoes: string[] }>('/api/auth/trocar-empresa', {
    method: 'POST',
    body: JSON.stringify({ empresa_id })
  });
}

export async function obterPreferenciasInterface() {
  return requisitar<Record<string, unknown>>('/api/usuarios/preferencias-interface');
}

export async function salvarPreferenciasInterface(preferencias: Record<string, unknown>) {
  return requisitar<Record<string, unknown>>('/api/usuarios/preferencias-interface', {
    method: 'POST',
    body: JSON.stringify({ preferencias })
  });
}

export async function buscarFonteDasTelas() {
  return requisitar<FonteTela[]>('/api/telas/fonte');
}

export async function buscarIndicadoresCotacao(filtros?: Record<string, string | number | boolean | undefined>) {
  return requisitar<Record<string, any>>(`/api/cotacao-frete/dashboard${montarQuery(filtros)}`);
}

export async function listarEmpresas() {
  return requisitar<RegistroGenerico[]>('/api/admin/empresas');
}

export async function salvarEmpresa(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/admin/empresas', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirEmpresa(id: number) {
  return requisitar<RegistroGenerico>(`/api/admin/empresas/${id}`, { method: 'DELETE' });
}

export async function listarPerfis() {
  return requisitar<RegistroGenerico[]>('/api/admin/perfis');
}

export async function salvarPerfil(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/admin/perfis', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirPerfil(id: number) {
  return requisitar<RegistroGenerico>(`/api/admin/perfis/${id}`, { method: 'DELETE' });
}

export async function listarUsuarios() {
  return requisitar<RegistroGenerico[]>('/api/admin/usuarios');
}

export async function salvarUsuario(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirUsuario(id: number) {
  return requisitar<RegistroGenerico>(`/api/admin/usuarios/${id}`, { method: 'DELETE' });
}

export async function listarTransportadoras() {
  return requisitar<RegistroGenerico[]>('/api/cotacao-frete/transportadoras');
}

export async function salvarTransportadora(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cotacao-frete/transportadoras', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirTransportadora(id: number) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/transportadoras/${id}`, { method: 'DELETE' });
}

function codificarChaveCotacao(id: string | number) {
  return encodeURIComponent(String(id));
}

function montarQuery(filtros?: Record<string, string | number | boolean | undefined>) {
  const parametros = new URLSearchParams();
  Object.entries(filtros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      parametros.set(chave, String(valor));
    }
  });
  const query = parametros.toString();
  return query ? `?${query}` : '';
}

export async function listarCotacoes(filtros?: {
  data_inicial?: string;
  data_final?: string;
  etapa_codigo?: string;
  busca?: string;
  numero_documento?: string;
  numero_nfe?: string;
  cliente?: string;
  cidade?: string;
  codigo_chave?: string;
  vendedor?: string;
  transportadora?: string;
  bloqueado?: string;
  faturado?: string;
  multiplas_cotacoes?: string;
  fluxo_logistico?: string;
  frete_gratis?: string;
  pagina?: string;
  limite?: string;
}) {
  return requisitar<RegistroGenerico[]>(`/api/cotacao-frete/cotacoes${montarQuery(filtros)}`);
}

export async function listarPedidosEnvioMassa(filtros: {
  situacao?: string;
  busca?: string;
  envio?: string;
  status?: string;
  vendedor?: string;
  transportadora?: string;
  faturado?: string;
  fluxo_logistico?: string;
  frete_gratis?: string;
  cotacao_criada_inicio?: string;
  cotacao_criada_fim?: string;
  data_documento_inicio?: string;
  data_documento_fim?: string;
}) {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      parametros.set(chave, String(valor));
    }
  });
  return requisitar<RegistroGenerico[]>(`/api/cotacao-frete/envio-massa/pedidos?${parametros.toString()}`);
}

export async function prepararEnvioMassa(cotacoes_ids: Array<string | number>) {
  return requisitar<RegistroGenerico[]>('/api/cotacao-frete/envio-massa/preparar', {
    method: 'POST',
    body: JSON.stringify({ cotacoes_ids })
  });
}

export async function enviarCotacoesMassa(dados: {
  cotacoes_ids: Array<string | number>;
  transportadoras_ids?: Array<string | number>;
  grupos?: Array<{
    transportadora_id: string | number;
    cotacoes_ids: Array<string | number>;
    assunto?: string;
    html?: string;
  }>;
  reenviar: boolean;
  itens_por_cotacao?: Record<string, number[]>;
}) {
  return requisitar<RegistroGenerico>('/api/cotacao-frete/envio-massa/enviar', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarKanbanCotacoes(filtros?: { data_inicial?: string; data_final?: string; etapa_codigo?: string; faturado?: string; multiplas_cotacoes?: string; fluxo_logistico?: string; frete_gratis?: string; cte_diferente_escolhido?: string }) {
  return requisitar<RegistroGenerico[]>(`/api/cotacao-frete/kanban${montarQuery(filtros)}`);
}

export async function alterarEtapaCotacao(cotacaoId: string | number, etapa_kanban_id: number, feedback?: string) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/alterar-etapa`, {
    method: 'POST',
    body: JSON.stringify({ etapa_kanban_id, feedback })
  });
}

export async function obterCotacao(id: string | number) {
  return requisitar<{ cotacao: RegistroGenerico; itens: RegistroGenerico[]; transportadoras: RegistroGenerico[]; historicos: RegistroGenerico[]; timeline?: RegistroGenerico[]; notasFiscais?: RegistroGenerico[]; ctes?: RegistroGenerico[]; outrasCotacoes?: RegistroGenerico[] }>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(id)}`);
}

export async function escolherTransportadora(
  cotacaoId: string | number,
  cotacao_transportadora_id: string | number,
  dados?: { motivo_id?: number | null; motivo_descricao?: string | null }
) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/escolher-transportadora`, {
    method: 'POST',
    body: JSON.stringify({
      cotacao_transportadora_id,
      motivo_id: dados?.motivo_id ?? null,
      motivo_descricao: dados?.motivo_descricao ?? null
    })
  });
}

export async function bloquearCotacaoErp(cotacaoId: string | number) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/bloquear-erp`, {
    method: 'POST',
    body: JSON.stringify({ payload_retorno: { origem: 'PORTAL_CONTROL_S_HUB' } })
  });
}

export async function alterarValorFreteManual(cotacaoTransportadoraId: string | number, valor_frete: number, observacao: string, prazo_dias?: number | null) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/transportadoras/${codificarChaveCotacao(cotacaoTransportadoraId)}/valor-manual`, {
    method: 'POST',
    body: JSON.stringify({ valor_frete, prazo_dias, observacao })
  });
}

export async function gerarNovoLinkCotacao(cotacaoId: string | number, transportadora_id: number) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/tokens`, {
    method: 'POST',
    body: JSON.stringify({ transportadora_id })
  });
}

export async function adicionarTransportadoraCotacao(cotacaoId: string | number, transportadora_id: number, observacao?: string) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/transportadoras`, {
    method: 'POST',
    body: JSON.stringify({ transportadora_id, observacao })
  });
}

export async function excluirTransportadoraCotacao(cotacaoId: string | number, cotacaoTransportadoraId: string | number) {
  const idTransportadoraCotacao = encodeURIComponent(String(cotacaoTransportadoraId ?? ''));
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/transportadoras/${idTransportadoraCotacao}`, {
    method: 'DELETE'
  });
}

export async function registrarTimelineCotacao(cotacaoId: string | number, dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/timeline`, {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function atualizarFluxoErpCotacao(cotacaoId: string | number, dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/fluxo-erp`, {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarEtapas() {
  return requisitar<RegistroGenerico[]>('/api/cotacao-frete/etapas');
}

export async function salvarEtapa(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cotacao-frete/etapas', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirEtapa(id: number) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/etapas/${id}`, { method: 'DELETE' });
}

export async function listarAuditorias() {
  return requisitar<RegistroGenerico[]>('/api/admin/auditorias');
}

export async function listarPermissoesPerfil(perfilId: number) {
  return requisitar<RegistroGenerico[]>(`/api/admin/perfis/${perfilId}/permissoes`);
}

export async function salvarPermissoesPerfil(perfilId: number, itens: { tipo: string; referencia_id: number }[]) {
  return requisitar<RegistroGenerico>(`/api/admin/perfis/${perfilId}/permissoes`, {
    method: 'POST',
    body: JSON.stringify({ itens })
  });
}

export async function listarParametrosSistema() {
  return requisitar<RegistroGenerico[]>('/api/admin/parametros-sistema');
}

export async function salvarParametrosSistema(parametros: { chave: string; valor: string }[]) {
  return requisitar<RegistroGenerico[]>('/api/admin/parametros-sistema', {
    method: 'POST',
    body: JSON.stringify({ parametros })
  });
}

export async function listarOrigensComerciaisCotacao() {
  return requisitar<RegistroGenerico[]>('/api/admin/origens-comerciais-cotacao');
}

export async function listarMotivosEscolhaTransportadora() {
  return requisitar<RegistroGenerico[]>('/api/admin/motivos-escolha-transportadora');
}

export async function salvarMotivoEscolhaTransportadora(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/admin/motivos-escolha-transportadora', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarMotivosPrejuizoLogistico() {
  return requisitar<RegistroGenerico[]>('/api/admin/motivos-prejuizo-logistico');
}

export async function salvarMotivoPrejuizoLogistico(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/admin/motivos-prejuizo-logistico', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function salvarMotivoPrejuizoCotacao(cotacaoId: string, dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>(`/api/cotacao-frete/cotacoes/${codificarChaveCotacao(cotacaoId)}/motivo-prejuizo-logistico`, {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function obterMinhaConfiguracaoEmail() {
  return requisitar<RegistroGenerico>('/api/usuarios/minha-configuracao-email');
}

export async function salvarMinhaConfiguracaoEmail(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/usuarios/minha-configuracao-email', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function testarMinhaConfiguracaoEmail() {
  return requisitar<RegistroGenerico>('/api/usuarios/minha-configuracao-email/testar', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function listarConfiguracoesEmail() {
  return requisitar<RegistroGenerico[]>('/api/admin/configuracoes-email');
}

export async function salvarConfiguracaoEmail(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/admin/configuracoes-email', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function testarConfiguracaoEmail(id: number) {
  return requisitar<RegistroGenerico>(`/api/admin/configuracoes-email/${id}/testar`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function buscarCotacaoPublica(token: string) {
  return requisitar<{ resumo: RegistroGenerico; itens: RegistroGenerico[] }>(`/api/publico/cotacao/${token}`);
}

export async function responderCotacaoPublica(token: string, valor_frete: number, observacao: string, prazo_dias?: number | null, numero_cotacao_transportadora?: string | null) {
  return requisitar<{ mensagem: string }>(`/api/publico/cotacao/${token}/responder`, {
    method: 'POST',
    body: JSON.stringify({ valor_frete, prazo_dias, numero_cotacao_transportadora, observacao })
  });
}

export async function buscarDashboardPim() {
  return requisitar<Record<string, any>>('/api/cadastro-produto-central/dashboard');
}

export async function listarProdutosPim(filtros?: { busca?: string; status?: string }) {
  return requisitar<RegistroGenerico[]>(`/api/cadastro-produto-central/produtos${montarQuery(filtros)}`);
}

export async function obterProdutoPim(id: number) {
  return requisitar<{
    produto: RegistroGenerico;
    skus: RegistroGenerico[];
    componentes: RegistroGenerico[];
    atributos: RegistroGenerico[];
    canais: RegistroGenerico[];
    assets: RegistroGenerico[];
    historico: RegistroGenerico[];
    aprovacoes: RegistroGenerico[];
  }>(`/api/cadastro-produto-central/produtos/${id}`);
}

export async function salvarProdutoPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/produtos', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirProdutoPim(id: number) {
  return requisitar<RegistroGenerico>(`/api/cadastro-produto-central/produtos/${id}`, { method: 'DELETE' });
}

export async function restaurarProdutoPim(id: number) {
  return requisitar<RegistroGenerico>(`/api/cadastro-produto-central/produtos/${id}/restaurar`, { method: 'POST' });
}

export async function duplicarProdutoPim(id: number) {
  return requisitar<RegistroGenerico>(`/api/cadastro-produto-central/produtos/${id}/duplicar`, { method: 'POST' });
}

export async function exportarProdutosPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/produtos-exportacao');
}

export async function alterarStatusProdutoPim(id: number, status: string, comentario?: string) {
  return requisitar<RegistroGenerico>(`/api/cadastro-produto-central/produtos/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, comentario })
  });
}

export async function listarComponentesPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/componentes');
}

export async function salvarComponentePim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/componentes', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarAtributosPim() {
  return requisitar<{ atributos: RegistroGenerico[]; grupos: RegistroGenerico[] }>('/api/cadastro-produto-central/atributos');
}

export async function salvarAtributoPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/atributos', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirAtributoPim(id: number) {
  return requisitar<RegistroGenerico>(`/api/cadastro-produto-central/atributos/${id}`, { method: 'DELETE' });
}

export async function listarMapeamentosAtributosCanaisPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/atributos-canais-mapeamentos');
}

export async function salvarMapeamentoAtributoCanalPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/atributos-canais-mapeamentos', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function excluirMapeamentoAtributoCanalPim(id: number) {
  return requisitar<RegistroGenerico>(`/api/cadastro-produto-central/atributos-canais-mapeamentos/${id}`, { method: 'DELETE' });
}

export async function listarCanaisPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/canais');
}

export async function salvarCanalPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/canais', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarScoreCanaisPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/score-canais');
}

export async function listarAssetsPim(busca?: string) {
  return requisitar<RegistroGenerico[]>(`/api/cadastro-produto-central/assets${montarQuery({ busca })}`);
}

export async function salvarAssetPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/assets', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarImportacoesPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/importacoes');
}

export async function registrarImportacaoPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/importacoes', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarConexoesSqlServerPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/sqlserver/conexoes');
}

export async function salvarConexaoSqlServerPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/sqlserver/conexoes', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function testarConexaoSqlServerPim(id: number) {
  return requisitar<RegistroGenerico>(`/api/cadastro-produto-central/sqlserver/conexoes/${id}/testar`, { method: 'POST' });
}

export async function consultarSqlServerPim(dados: RegistroGenerico) {
  return requisitar<{ colunas: string[]; previa: RegistroGenerico[]; total_linhas: number }>('/api/cadastro-produto-central/sqlserver/consultar', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function executarCargaSqlServerPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/sqlserver/cargas', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarCargasSqlServerPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/sqlserver/cargas');
}

export async function listarWorkflowsPim() {
  return requisitar<{ workflows: RegistroGenerico[]; aprovacoes: RegistroGenerico[] }>('/api/cadastro-produto-central/workflows');
}

export async function listarConfiguracoesPim() {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/configuracoes');
}

export async function salvarConfiguracoesPim(dados: RegistroGenerico) {
  return requisitar<RegistroGenerico>('/api/cadastro-produto-central/configuracoes', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export async function listarAuditoriaPim() {
  return requisitar<RegistroGenerico[]>('/api/cadastro-produto-central/auditoria');
}
