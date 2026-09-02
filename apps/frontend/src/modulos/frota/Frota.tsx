import { BadgeCheck, Ban, CalendarDays, Car, CheckSquare, ClipboardList, Clock, FileSpreadsheet, FileUp, Filter, Gauge, History, KeyRound, LayoutGrid, PanelRightOpen, Printer, RefreshCw, Settings, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  buscarDashboardFrota,
  cancelarApontamentosKmFrota,
  cancelarDespesasFrota,
  excluirDepartamentoFrota,
  excluirDespesaTipoFrota,
  excluirFornecedorFrota,
  excluirMotivoCancelamentoFrota,
  excluirMotivoSemPedidoFrota,
  excluirMotoristaFrota,
  excluirApontamentoKmFrota,
  excluirPedidoVendaFrota,
  excluirTipoDespesaFrota,
  excluirVeiculoFrota,
  gerarUsuarioMotoristaFrota,
  importarDespesasFrota,
  listarApontamentosKmFrota,
  listarConfiguracoesFrota,
  listarDepartamentosFrota,
  listarDespesasFrota,
  listarDespesasTiposFrota,
  listarFornecedoresFrota,
  listarHistoricoApontamentoKmFrota,
  listarHistoricoDespesaFrota,
  listarMotivosCancelamentoFrota,
  listarMotivosSemPedidoFrota,
  listarMotoristasFrota,
  listarPedidosVendaFrota,
  listarTiposDespesasFrota,
  listarPerfis,
  listarUsuarios,
  listarVeiculosFrota,
  obterCalendarioKmFrota,
  obterContextoKmFrota,
  obterMapeamentoImportacaoFrota,
  RegistroGenerico,
  salvarApontamentoKmFrota,
  salvarConfiguracoesFrota,
  salvarDepartamentoFrota,
  salvarDespesaFrota,
  salvarDespesaTipoFrota,
  salvarFornecedorFrota,
  salvarMapeamentoImportacaoFrota,
  salvarMotivoCancelamentoFrota,
  salvarMotivoSemPedidoFrota,
  salvarMotoristaFrota,
  salvarPedidoVendaFrota,
  salvarTipoDespesaFrota,
  salvarVeiculoFrota,
  validarApontamentosKmFrota,
  validarDespesasFrota
} from '../../servicos/api';

export type TelaFrota =
  | 'frotaDashboard'
  | 'frotaDepartamentos'
  | 'frotaMotoristas'
  | 'frotaVeiculos'
  | 'frotaTiposDespesas'
  | 'frotaFornecedores'
  | 'frotaDespesaTipo'
  | 'frotaMotivosCancelamento'
  | 'frotaMotivosSemPedido'
  | 'frotaPedidosVenda'
  | 'frotaKmApontamento'
  | 'frotaKmMobile'
  | 'frotaKmValidacao'
  | 'frotaImportacao'
  | 'frotaValidacao'
  | 'frotaConfiguracoes'
  | 'usuarios'
  | 'perfis'
  | 'direitos';

export const menusFrota = [
  { id: 'frotaDashboard' as TelaFrota, nome: 'Dashboard', icone: LayoutGrid },
  { id: 'frotaValidacao' as TelaFrota, nome: 'Validacao', icone: ShieldCheck },
  { id: 'frotaImportacao' as TelaFrota, nome: 'Importacao', icone: FileSpreadsheet },
  { id: 'frotaVeiculos' as TelaFrota, nome: 'Veiculos', icone: Car },
  { id: 'frotaMotoristas' as TelaFrota, nome: 'Motoristas', icone: Users },
  { id: 'frotaDepartamentos' as TelaFrota, nome: 'Departamentos', icone: Settings },
  { id: 'frotaFornecedores' as TelaFrota, nome: 'Fornecedores', icone: Settings },
  { id: 'frotaTiposDespesas' as TelaFrota, nome: 'Tipos de Despesas', icone: Settings },
  { id: 'frotaDespesaTipo' as TelaFrota, nome: 'Despesa por Tipo', icone: Settings },
  { id: 'frotaMotivosCancelamento' as TelaFrota, nome: 'Motivos Canc.', icone: Ban },
  { id: 'frotaMotivosSemPedido' as TelaFrota, nome: 'Motivos Sem Pedido', icone: Ban },
  { id: 'frotaPedidosVenda' as TelaFrota, nome: 'Pedidos Venda', icone: ClipboardList },
  { id: 'frotaKmApontamento' as TelaFrota, nome: 'Apontamento KM', icone: CalendarDays },
  { id: 'frotaKmValidacao' as TelaFrota, nome: 'Validacao KM', icone: Gauge },
  { id: 'usuarios' as TelaFrota, nome: 'Cadastro de Usuarios', icone: UserCog },
  { id: 'perfis' as TelaFrota, nome: 'Perfis de Acesso', icone: BadgeCheck },
  { id: 'direitos' as TelaFrota, nome: 'Direitos de Acesso', icone: KeyRound },
  { id: 'frotaConfiguracoes' as TelaFrota, nome: 'Configuracoes', icone: Settings }
];

export const permissoesMenuFrota: Partial<Record<TelaFrota, string[]>> = {
  frotaDashboard: ['FROTA_VISUALIZAR_DASHBOARD'],
  frotaDepartamentos: ['FROTA_CONSULTAR_CADASTROS'],
  frotaMotoristas: ['FROTA_CONSULTAR_CADASTROS'],
  frotaVeiculos: ['FROTA_CONSULTAR_CADASTROS'],
  frotaTiposDespesas: ['FROTA_CONSULTAR_CADASTROS'],
  frotaFornecedores: ['FROTA_CONSULTAR_CADASTROS'],
  frotaDespesaTipo: ['FROTA_CONFIGURAR', 'FROTA_IMPORTAR_DESPESAS'],
  frotaMotivosCancelamento: ['FROTA_CANCELAR_DESPESAS', 'FROTA_CONFIGURAR'],
  frotaMotivosSemPedido: ['FROTA_CONFIGURAR'],
  frotaPedidosVenda: ['FROTA_CONSULTAR_PEDIDOS_KM', 'FROTA_CONFIGURAR'],
  frotaKmApontamento: ['FROTA_LANCAR_KM', 'FROTA_MOBILE_KM'],
  frotaKmMobile: ['FROTA_MOBILE_KM', 'FROTA_LANCAR_KM'],
  frotaKmValidacao: ['FROTA_VALIDAR_KM', 'FROTA_CONSULTAR_KM_TERCEIROS', 'FROTA_CONSULTAR_KM_COORDENADOR'],
  frotaImportacao: ['FROTA_IMPORTAR_DESPESAS'],
  frotaValidacao: ['FROTA_VALIDAR_DESPESAS'],
  frotaConfiguracoes: ['FROTA_CONFIGURAR'],
  usuarios: ['ADMINISTRAR_USUARIOS'],
  perfis: ['ADMINISTRAR_PERFIS'],
  direitos: ['ADMINISTRAR_PERFIS']
};

const LOGO_FROTA = '/brand/logo-frota.png';
const LOGO_KM = '/brand/logo-km.png';

export function LogoFrota({ pequeno = false }: { pequeno?: boolean }) {
  return (
    <span className={pequeno ? 'pimLogoAsset pequeno frotaLogoAsset' : 'pimLogoAsset frotaLogoAsset'} aria-hidden="true">
      <img src={LOGO_FROTA} alt="" />
    </span>
  );
}

function moeda(valor: unknown) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function numeroPtBr(valor: unknown, casas = 2) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function dataIsoLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function dataBr(valor: unknown) {
  if (!valor) return '-';
  const texto = String(valor).slice(0, 10);
  const [ano, mes, dia] = texto.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : String(valor);
}

function dataHoraBrMinuto(valor: unknown) {
  if (!valor) return '-';
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo'
  });
}

function dataHoraBrSegundo(valor: unknown) {
  if (!valor) return '-';
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo'
  });
}

function horaBr(valor: unknown) {
  if (!valor) return '-';
  const texto = String(valor);
  const hora = texto.match(/(\d{2}):(\d{2})/);
  if (hora) return `${hora[1]}:${hora[2]}`;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return texto;
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo'
  });
}

function valorSimNao(valor: unknown, sim: string, nao: string) {
  return valor ? sim : nao;
}

function resumirHistoricoFrota(valor: unknown) {
  if (!valor || typeof valor !== 'object') return '';
  const dados = valor as RegistroGenerico;
  const campos = ['validado', 'integrado', 'cancelado', 'motivoId', 'observacao', 'pedido', 'placa', 'km_inicial', 'km_final', 'km_total'];
  return campos
    .filter((campo) => dados[campo] !== undefined && dados[campo] !== null && dados[campo] !== '')
    .map((campo) => `${campo}: ${String(dados[campo])}`)
    .join(' | ');
}

function diasEntre(inicio: string, fim: string) {
  const dias: Date[] = [];
  const atual = new Date(`${inicio}T00:00:00`);
  const limite = new Date(`${fim}T00:00:00`);
  while (atual <= limite) {
    dias.push(new Date(atual));
    atual.setDate(atual.getDate() + 1);
  }
  return dias;
}

function periodoKmPorReferencia(referencia: string, diaInicio = 26, diaFim = 25) {
  const base = new Date(`${referencia}T00:00:00`);
  const inicio = base.getDate() >= diaInicio
    ? new Date(base.getFullYear(), base.getMonth(), diaInicio)
    : new Date(base.getFullYear(), base.getMonth() - 1, diaInicio);
  const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, diaFim);
  return { data_inicial: dataIsoLocal(inicio), data_final: dataIsoLocal(fim) };
}

function BotaoAtualizar({ carregando, aoAtualizar }: { carregando: boolean; aoAtualizar: () => void | Promise<unknown> }) {
  return (
    <button className={`botaoAtualizar botaoAtualizarIcone${carregando ? ' carregando' : ''}`} type="button" onClick={() => aoAtualizar()} disabled={carregando} title="Atualizar" aria-label="Atualizar">
      {carregando ? <span className="gaugeAtualizacao" /> : <RefreshCw size={17} />}
    </button>
  );
}

function textoOpcaoBusca(item: RegistroGenerico, campos: string[]) {
  return campos.map((campo) => String(item[campo] ?? '')).filter(Boolean).join(' - ');
}

function CampoBusca({
  rotulo,
  valorId,
  itens,
  camposBusca,
  placeholder = 'Digite para buscar',
  desabilitado = false,
  minimo = 0,
  aoSelecionar
}: {
  rotulo: string;
  valorId?: unknown;
  itens: RegistroGenerico[];
  camposBusca: string[];
  placeholder?: string;
  desabilitado?: boolean;
  minimo?: number;
  aoSelecionar: (item: RegistroGenerico | null) => void;
}) {
  const selecionado = itens.find((item) => Number(item.id) === Number(valorId));
  const [texto, setTexto] = useState(selecionado ? textoOpcaoBusca(selecionado, camposBusca) : '');
  const [aberto, setAberto] = useState(false);
  const chaveCampos = camposBusca.join('|');
  useEffect(() => {
    const atual = itens.find((item) => Number(item.id) === Number(valorId));
    setTexto(atual ? textoOpcaoBusca(atual, camposBusca) : '');
  }, [valorId, itens, chaveCampos]);
  const termo = texto.trim().toLowerCase();
  const opcoes = termo.length >= minimo
    ? itens.filter((item) => textoOpcaoBusca(item, camposBusca).toLowerCase().includes(termo)).slice(0, 80)
    : [];
  function selecionar(item: RegistroGenerico | null) {
    aoSelecionar(item);
    setTexto(item ? textoOpcaoBusca(item, camposBusca) : '');
    setAberto(false);
  }
  return (
    <label className="campoBuscaMobile">{rotulo}
      <div className="campoBuscaCaixa">
        <input
          disabled={desabilitado}
          placeholder={placeholder}
          value={texto}
          onFocus={() => setAberto(true)}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
            if (!e.target.value) aoSelecionar(null);
          }}
        />
        {texto && !desabilitado && <button type="button" className="campoBuscaLimpar" onClick={() => selecionar(null)}>x</button>}
      </div>
      {minimo > 0 && termo.length > 0 && termo.length < minimo && <small className="campoAjuda">Digite ao menos {minimo} letras.</small>}
      {aberto && !desabilitado && termo.length >= minimo && (
        <div className="campoBuscaLista">
          {opcoes.map((item) => (
            <button key={String(item.id)} type="button" onMouseDown={(evento) => evento.preventDefault()} onClick={() => selecionar(item)}>
              <strong>{String(item[camposBusca[0]] ?? '')}</strong>
              <span>{camposBusca.slice(1).map((campo) => String(item[campo] ?? '')).filter(Boolean).join(' - ')}</span>
            </button>
          ))}
          {!opcoes.length && <p>Nenhum registro encontrado.</p>}
        </div>
      )}
    </label>
  );
}

function exportarCsv(nome: string, linhas: RegistroGenerico[], colunas: string[]) {
  const csv = [colunas.join(';'), ...linhas.map((linha) => colunas.map((coluna) => `"${String(linha[coluna] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function carregarXlsx() {
  const janela = window as typeof window & { XLSX?: any };
  if (janela.XLSX) {
    return janela.XLSX;
  }

  await new Promise<void>((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>('script[data-control-s-xlsx="true"]');
    if (existente) {
      existente.addEventListener('load', () => resolve(), { once: true });
      existente.addEventListener('error', () => reject(new Error('Falha ao carregar biblioteca Excel.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/vendor/xlsx.full.min.js';
    script.async = true;
    script.dataset.controlSXlsx = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Leitura/exportacao Excel indisponivel neste servidor. Reaplique o ZIP para instalar vendor/xlsx.full.min.js.'));
    document.head.appendChild(script);
  });

  if (!janela.XLSX) {
    throw new Error('Biblioteca Excel nao ficou disponivel apos carregamento.');
  }
  return janela.XLSX;
}

async function exportarXlsx(nome: string, linhas: RegistroGenerico[], colunas: string[]) {
  const XLSX = await carregarXlsx();
  const dados = linhas.map((linha) => colunas.reduce<RegistroGenerico>((acumulador, coluna) => {
    acumulador[coluna.replace(/_/g, ' ')] = linha[coluna] ?? '';
    return acumulador;
  }, {}));
  const planilha = XLSX.utils.json_to_sheet(dados);
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, planilha, 'Despesas');
  XLSX.writeFile(pasta, `${nome}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

type ProgressoLeituraArquivo = {
  etapa: string;
  percentual: number;
};

type ConfiguracaoLeituraImportacao = {
  linhaCabecalho: number;
  linhaInicialDados: number;
  linhaFinalDados: number;
  colunaInicial: number;
};

const configuracaoLeituraPadrao: ConfiguracaoLeituraImportacao = {
  linhaCabecalho: 1,
  linhaInicialDados: 2,
  linhaFinalDados: 9999,
  colunaInicial: 1
};

function linhasPlanilhaParaMatriz(arquivo: File, aoProgresso?: (progresso: ProgressoLeituraArquivo) => void) {
  if (arquivo.name.toLowerCase().endsWith('.pdf')) {
    return extrairMatrizPdf(arquivo, aoProgresso);
  }

  return new Promise<string[][]>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Nao foi possivel ler o arquivo.'));
    leitor.onload = async () => {
      try {
        const nome = arquivo.name.toLowerCase();
        if (nome.endsWith('.xls') || nome.endsWith('.xlsx')) {
          const XLSX = await carregarXlsx();
          const pasta = XLSX.read(leitor.result, { type: 'array', cellDates: true });
          const primeiraAba = pasta.SheetNames[0];
          const linhas = XLSX.utils.sheet_to_json(pasta.Sheets[primeiraAba], { header: 1, raw: false, defval: '', dateNF: 'yyyy-mm-dd hh:mm:ss' }) as Array<Array<string | number | Date>>;
          resolve(linhas.map((linha: Array<string | number | Date>) => linha.map((valor: string | number | Date) => String(valor ?? '').trim())));
          return;
        }
        const textoArquivo = String(leitor.result ?? '');
        resolve(parseCsv(textoArquivo));
      } catch (error) {
        reject(error);
      }
    };

    if (arquivo.name.toLowerCase().endsWith('.xls') || arquivo.name.toLowerCase().endsWith('.xlsx')) {
      leitor.readAsArrayBuffer(arquivo);
    } else {
      leitor.readAsText(arquivo);
    }
  });
}

function TabelaFrota({
  titulo,
  subtitulo,
  carregar,
  colunas,
  campos,
  salvar,
  excluir,
  acoesExtras
}: {
  titulo: string;
  subtitulo: string;
  carregar: () => Promise<RegistroGenerico[]>;
  colunas: string[];
  campos: { nome: string; rotulo: string; tipo?: 'text' | 'number' | 'date' | 'time' | 'checkbox' | 'select'; opcoes?: RegistroGenerico[]; valorOpcao?: string; textoOpcao?: string; valorPadrao?: unknown }[];
  salvar: (dados: RegistroGenerico) => Promise<RegistroGenerico>;
  excluir?: (id: number) => Promise<RegistroGenerico>;
  acoesExtras?: (linha: RegistroGenerico, recarregar: () => Promise<void>, definirMensagem: (mensagem: string) => void, definirErro: (erro: string) => void) => ReactNode;
}) {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({});
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [consulta, setConsulta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const carregamentoAtual = useRef(0);
  const linhasFiltradas = useMemo(() => {
    const termo = consulta.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter((linha) => colunas.some((coluna) => String(linha[coluna] ?? '').toLowerCase().includes(termo)));
  }, [linhas, consulta, colunas]);

  async function recarregar() {
    const sequencia = carregamentoAtual.current + 1;
    carregamentoAtual.current = sequencia;
    setCarregando(true);
    setErro('');
    try {
      const registros = await carregar();
      if (carregamentoAtual.current === sequencia) {
        setLinhas(registros);
      }
    } catch (error) {
      if (carregamentoAtual.current === sequencia) {
        setLinhas([]);
        setErro(error instanceof Error ? error.message : 'Falha ao carregar registros.');
      }
    } finally {
      if (carregamentoAtual.current === sequencia) {
        setCarregando(false);
      }
    }
  }

  useEffect(() => {
    setLinhas([]);
    setFormulario({});
    setAberto(false);
    setMensagem('');
    setErro('');
    recarregar();
  }, [titulo]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setMensagem('');
    try {
      await salvar(formulario);
      setFormulario({});
      setAberto(false);
      setMensagem('Registro salvo.');
      await recarregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao salvar.');
    }
  }

  async function excluirLinha(id: number) {
    if (!excluir || !window.confirm('Confirma excluir este registro?')) return;
    setErro('');
    setMensagem('');
    try {
      await excluir(id);
      setMensagem('Registro excluido.');
      await recarregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao excluir.');
    }
  }

  function novoRegistro() {
    const valoresPadrao = campos.reduce<RegistroGenerico>((acumulador, campo) => {
      if (campo.valorPadrao !== undefined) {
        acumulador[campo.nome] = campo.valorPadrao;
      }
      return acumulador;
    }, {});
    setFormulario(valoresPadrao);
    setAberto(true);
  }

  return (
    <section className="painelTabela frotaPainel">
      <header>
        <div>
          <span>Modulo Frota</span>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        <div className="acoesTopoTabela">
          <BotaoAtualizar carregando={carregando} aoAtualizar={recarregar} />
          <button className="ghost" onClick={() => aberto ? setAberto(false) : novoRegistro()}><Settings size={15} />{aberto ? 'Fechar' : 'Novo registro'}</button>
        </div>
      </header>
      <div className="consultaTabelaFrota">
        <Filter size={15} />
        <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder={`Consultar em ${titulo.toLowerCase()}`} />
      </div>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {aberto && (
        <form className="formCadastro" onSubmit={enviar}>
          {campos.map((campo) => {
            if (campo.nome === 'codigo_coordenador_decis' && !formulario.coordenador) {
              return null;
            }
            const opcoes = campo.nome === 'ajudante_padrao_motorista_id'
              ? (campo.opcoes ?? []).filter((opcao) => Boolean(opcao.ajudante) && Number(opcao.id) !== Number(formulario.id))
              : (campo.opcoes ?? []);
            return (
              <label key={campo.nome}>
                {campo.rotulo}
                {campo.tipo === 'select' ? (
                  <select value={String(formulario[campo.nome] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo.nome]: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Selecione</option>
                    {opcoes.map((opcao) => <option key={String(opcao[campo.valorOpcao ?? 'id'])} value={String(opcao[campo.valorOpcao ?? 'id'])}>{String(opcao[campo.textoOpcao ?? 'descricao'] ?? opcao.nome ?? opcao.id)}</option>)}
                  </select>
                ) : campo.tipo === 'checkbox' ? (
                  <input type="checkbox" checked={Boolean(formulario[campo.nome] ?? campo.valorPadrao ?? true)} onChange={(e) => setFormulario({ ...formulario, [campo.nome]: e.target.checked })} />
                ) : (
                  <input type={campo.tipo ?? 'text'} value={String(formulario[campo.nome] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo.nome]: campo.tipo === 'number' ? Number(e.target.value) : e.target.value })} />
                )}
              </label>
            );
          })}
          <button className="primary">Salvar</button>
        </form>
      )}
      <div className="tabelaWrap">
        <table>
          <thead><tr>{colunas.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}<th>Acoes</th></tr></thead>
          <tbody>
            {linhasFiltradas.map((linha) => (
              <tr key={String(linha.id ?? JSON.stringify(linha))} onDoubleClick={() => { setFormulario(linha); setAberto(true); }}>
                {colunas.map((coluna) => <td key={coluna}>{String(linha[coluna] ?? '-')}</td>)}
                <td className="acoesTabela"><button className="ghost" onClick={() => { setFormulario(linha); setAberto(true); }}>Alterar</button>{acoesExtras?.(linha, recarregar, setMensagem, setErro)}{excluir && <button className="ghost" onClick={() => excluirLinha(Number(linha.id))}><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {linhasFiltradas.length === 0 && <tr><td colSpan={colunas.length + 1}>{carregando ? 'Carregando registros...' : consulta ? 'Nenhum registro encontrado para a consulta.' : 'Nenhum registro encontrado.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GraficoBarrasFrota({ titulo, linhas, chave = 'descricao' }: { titulo: string; linhas: RegistroGenerico[]; chave?: string }) {
  const maiorValor = Math.max(...linhas.map((linha) => Number(linha.valor_total ?? 0)), 0);
  return (
    <div className="rankingPainel rankingPainelAmplo graficoBarrasFrota">
      <span>{titulo}</span>
      {linhas.map((linha) => {
        const valor = Number(linha.valor_total ?? 0);
        const percentual = maiorValor > 0 ? Math.max(6, (valor / maiorValor) * 100) : 0;
        return (
          <div className="barraGraficoFrota" key={String(linha[chave])}>
            <div>
              <strong>{String(linha[chave])}</strong>
              <b>{moeda(valor)}</b>
            </div>
            <i style={{ width: `${percentual}%` }} />
          </div>
        );
      })}
      {linhas.length === 0 && <p>Nenhum dado registrado.</p>}
    </div>
  );
}

export function DashboardFrota() {
  const [indicadores, setIndicadores] = useState<RegistroGenerico>({});
  const [filtros, setFiltros] = useState<RegistroGenerico>({ periodo: 'MES_ATUAL', motorista_id: '', placa: '', situacoes: 'PENDENTE,VALIDADO,INTEGRADO' });
  const [motoristas, setMotoristas] = useState<RegistroGenerico[]>([]);
  const [veiculos, setVeiculos] = useState<RegistroGenerico[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      setIndicadores(await buscarDashboardFrota(filtros));
    } finally {
      setCarregando(false);
    }
  }

  function alternarSituacao(situacao: string) {
    const atuais = String(filtros.situacoes || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const proximas = atuais.includes(situacao)
      ? atuais.filter((item) => item !== situacao)
      : [...atuais, situacao];
    setFiltros({ ...filtros, situacoes: proximas.join(',') });
  }

  useEffect(() => {
    carregar();
  }, [filtros]);

  useEffect(() => {
    listarMotoristasFrota().then(setMotoristas).catch(() => setMotoristas([]));
    listarVeiculosFrota().then(setVeiculos).catch(() => setVeiculos([]));
  }, []);

  const rankings = [
    ['Veiculos com maior despesa', indicadores.veiculos_maior_despesa ?? [], 'placa'],
    ['Despesas por tipo', indicadores.despesas_por_tipo ?? [], 'descricao'],
    ['Descontos por tipo', indicadores.descontos_por_tipo ?? [], 'descricao'],
    ['Despesas por departamento', indicadores.despesas_por_departamento ?? [], 'descricao'],
    ['Despesas por motorista', indicadores.despesas_por_motorista ?? [], 'descricao'],
    ['Evolucao mensal', indicadores.evolucao_mensal ?? [], 'mes']
  ] as const;
  const custoMedioAbastecimentos = indicadores.custo_medio_abastecimentos ?? [];

  return (
    <section>
      <div className="barraAcoesTela">
        <div>
          <span>Modulo Frota</span>
          <h2>Dashboard operacional</h2>
        </div>
        <BotaoAtualizar carregando={carregando} aoAtualizar={carregar} />
      </div>
      <div className="filtrosLinha filtrosDashboardFrota">
        <label>Periodo
          <select value={String(filtros.periodo ?? 'MES_ATUAL')} onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })}>
            <option value="15_DIAS">Ultimos 15 dias</option>
            <option value="MES_ATUAL">Mes atual</option>
            <option value="MES_ANTERIOR">Mes anterior</option>
            <option value="3_MESES">Ultimos 3 meses</option>
          </select>
        </label>
        <label>Motorista
          <select value={String(filtros.motorista_id ?? '')} onChange={(e) => setFiltros({ ...filtros, motorista_id: e.target.value })}>
            <option value="">Todos</option>
            {motoristas.map((motorista) => <option key={String(motorista.id)} value={String(motorista.id)}>{String(motorista.nome)}</option>)}
          </select>
        </label>
        <label>Veiculo
          <select value={String(filtros.placa ?? '')} onChange={(e) => setFiltros({ ...filtros, placa: e.target.value })}>
            <option value="">Todos</option>
            {veiculos.map((veiculo) => <option key={String(veiculo.placa)} value={String(veiculo.placa)}>{String(veiculo.placa)} - {String(veiculo.modelo ?? '')}</option>)}
          </select>
        </label>
        <div className="grupoChecksDashboard">
          <span>Situacoes</span>
          {[
            ['PENDENTE', 'Pendentes'],
            ['VALIDADO', 'Validadas'],
            ['INTEGRADO', 'Integradas']
          ].map(([valor, rotulo]) => (
            <label key={valor}>
              <input type="checkbox" checked={String(filtros.situacoes || '').split(',').includes(valor)} onChange={() => alternarSituacao(valor)} />
              {rotulo}
            </label>
          ))}
        </div>
      </div>
      <div className="metrics pimMetrics frotaMetrics">
        <article><span>Despesas no periodo</span><strong>{indicadores.despesas_periodo ?? 0}</strong></article>
        <article title="Despesas canceladas ficam fora dos valores, pendencias, validacoes e rankings abaixo."><span>Canceladas</span><strong>{indicadores.despesas_canceladas ?? 0}</strong><small>Fora dos totais abaixo</small></article>
        <article><span>Valor total</span><strong>{moeda(indicadores.valor_total)}</strong></article>
        <article><span>Desconto no periodo</span><strong>{moeda(indicadores.desconto_total_periodo)}</strong></article>
        <article><span>Pendentes</span><strong>{indicadores.despesas_pendentes_validacao ?? 0}</strong></article>
        <article><span>Validadas</span><strong>{indicadores.despesas_validadas ?? 0}</strong></article>
        <article><span>Integradas</span><strong>{indicadores.despesas_integradas ?? 0}</strong></article>
        <article><span>Nao integradas</span><strong>{indicadores.despesas_nao_integradas ?? 0}</strong></article>
      </div>
      <div className="dashboardGrid pimDashboardGrid">
        <GraficoBarrasFrota titulo="Valor por tipo de despesa" linhas={indicadores.despesas_por_tipo ?? []} />
        <div className="rankingPainel rankingPainelAmplo">
          <span>Custo Medio Abastecimentos</span>
          {indicadores.tipo_despesa_abastecimento_id ? (
            <div className="tabelaResponsiva">
              <table>
                <thead>
                  <tr>
                    <th>Descricao</th>
                    <th>Qtd.</th>
                    <th>Valor</th>
                    <th>Vlr unit liq. medio</th>
                    <th>Desc. unit medio</th>
                  </tr>
                </thead>
                <tbody>
                  {custoMedioAbastecimentos.map((item: RegistroGenerico) => (
                    <tr key={String(item.descricao)}>
                      <td>{String(item.descricao)}</td>
                      <td>{Number(item.quantidade_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{moeda(item.valor_total)}</td>
                      <td>{moeda(item.valor_unitario_liquido_medio)}</td>
                      <td>{moeda(item.desconto_unitario_medio)}</td>
                    </tr>
                  ))}
                  {custoMedioAbastecimentos.length === 0 && <tr><td colSpan={5}>Nenhum abastecimento no periodo.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Selecione o tipo de despesa de abastecimento nas configuracoes.</p>
          )}
        </div>
        {rankings.map(([titulo, linhas, chave]) => (
          <div className="rankingPainel" key={titulo}>
            <span>{titulo}</span>
            {linhas.map((item: RegistroGenerico) => <p key={String(item[chave])}><strong>{String(item[chave])}</strong> - {moeda(item.valor_total)}</p>)}
            {linhas.length === 0 && <p>Nenhum dado registrado.</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function parseCsv(textoArquivo: string) {
  const linhas = textoArquivo.split(/\r?\n/).filter((linha) => linha.trim());
  const separador = linhas[0]?.includes('\t') ? '\t' : ';';
  return linhas.map((linha) => linha.split(separador).map((valor) => valor.trim().replace(/^"|"$/g, '')));
}

function normalizarTextoCabecalho(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function contarCabecalhosConhecidos(linha: string[]) {
  const texto = normalizarTextoCabecalho(linha.join(' '));
  const termos = ['data hora', 'placa', 'km', 'cp nf', 'doc pgto', 'descricao', 'quantidade', 'preco unit', 'valor final'];
  return termos.filter((termo) => texto.includes(termo)).length;
}

function detectarConfiguracaoLeitura(matriz: string[][]): ConfiguracaoLeituraImportacao {
  const indiceCabecalho = matriz.findIndex((linha) => contarCabecalhosConhecidos(linha) >= 4);
  if (indiceCabecalho < 0) {
    return { ...configuracaoLeituraPadrao, linhaFinalDados: matriz.length };
  }
  const colunaInicial = Math.max(0, matriz[indiceCabecalho].findIndex((valor) => String(valor ?? '').trim()));
  const indiceFinalDados = matriz.reduce((ultimo, linha, indice) => {
    if (indice <= indiceCabecalho) return ultimo;
    const primeiraCelula = String(linha[colunaInicial] ?? '').trim();
    return dataHoraImportacaoValida(primeiraCelula) ? indice : ultimo;
  }, indiceCabecalho + 1);
  return {
    linhaCabecalho: indiceCabecalho + 1,
    linhaInicialDados: indiceCabecalho + 2,
    linhaFinalDados: indiceFinalDados + 1,
    colunaInicial: colunaInicial + 1
  };
}

function prepararMatrizImportacao(matriz: string[][], configuracao: ConfiguracaoLeituraImportacao) {
  const linhaCabecalho = Math.max(1, Number(configuracao.linhaCabecalho || 1)) - 1;
  const linhaInicialDados = Math.max(linhaCabecalho + 2, Number(configuracao.linhaInicialDados || linhaCabecalho + 2)) - 1;
  const linhaFinalDados = Math.max(linhaInicialDados + 1, Number(configuracao.linhaFinalDados || matriz.length));
  const colunaInicial = Math.max(1, Number(configuracao.colunaInicial || 1)) - 1;
  const cabecalhos = (matriz[linhaCabecalho] ?? [])
    .slice(colunaInicial)
    .map((valor, indice) => String(valor || `coluna_${indice + 1}`).trim())
    .filter(Boolean);
  const linhas = matriz
    .slice(linhaInicialDados, linhaFinalDados)
    .map((linha) => linha.slice(colunaInicial, colunaInicial + cabecalhos.length).map((valor) => String(valor ?? '').trim()))
    .filter((linha) => linha.some(Boolean));
  return { cabecalhos, linhas };
}

function sugerirMapeamento(cabecalhos: string[], mapeamentoAtual: RegistroGenerico) {
  const sinonimos: Record<string, string[]> = {
    placa: ['placa'],
    data_hora: ['data hora', 'data/hora', 'data'],
    hodometro: ['hodometro', 'odometro', 'km'],
    numero_documento: ['numero documento', 'numero doc', 'documento', 'cp nf', 'nf'],
    fatura: ['fatura', 'doc pgto', 'doc pagamento'],
    descricao_despesa: ['descricao despesa', 'descricao', 'produto'],
    quantidade: ['quantidade', 'qtd'],
    unidade_despesa: ['unidade despesa', 'un', 'unidade'],
    valor_unitario: ['valor unitario', 'preco unit', 'preco unitario'],
    valor_unitario_liquido: ['valor unitario liquido', 'preco liquido'],
    valor_bruto: ['valor bruto', 'valor'],
    desconto: ['desconto', 'desc'],
    total: ['total', 'valor final', 'valor liquido']
  };
  return Object.entries(sinonimos).reduce<RegistroGenerico>((acumulador, [campo, opcoes]) => {
    if (acumulador[campo]) return acumulador;
    const encontrado = cabecalhos.find((cabecalho) => {
      const texto = normalizarTextoCabecalho(cabecalho);
      return opcoes.some((opcao) => texto === normalizarTextoCabecalho(opcao) || texto.includes(normalizarTextoCabecalho(opcao)));
    });
    if (encontrado) {
      acumulador[campo] = encontrado;
    }
    return acumulador;
  }, { ...mapeamentoAtual });
}

function temValorImportacao(valor: unknown) {
  return String(valor ?? '').trim() !== '';
}

function dataHoraImportacaoValida(valor: unknown) {
  const textoValor = String(valor ?? '').trim();
  return /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(textoValor)
    || /^\d{4}-\d{2}-\d{2}/.test(textoValor);
}

function linhaDespesaImportacaoValida(linha: RegistroGenerico) {
  return dataHoraImportacaoValida(linha.data_hora)
    && temValorImportacao(linha.numero_documento)
    && temValorImportacao(linha.descricao_despesa)
    && temValorImportacao(linha.quantidade)
    && temValorImportacao(linha.total);
}

function normalizarLinhaOcr(textoLinha: string) {
  return textoLinha
    .replace(/[|]+/g, ' ')
    .replace(/\s{2,}/g, '\t')
    .trim()
    .split('\t')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

function textoOcrParaMatriz(textoPdf: string) {
  const linhasAac = textoAacParaMatriz(textoPdf);
  if (linhasAac.length > 1) {
    return linhasAac;
  }

  const linhas = textoPdf
    .split(/\r?\n/)
    .map((linha) => normalizarLinhaOcr(linha))
    .filter((linha) => linha.length > 1);

  if (!linhas.length) {
    return [['texto_extraido'], ...textoPdf.split(/\r?\n/).filter(Boolean).map((linha) => [linha])];
  }

  const quantidadeColunas = Math.max(...linhas.map((linha) => linha.length));
  const cabecalho = Array.from({ length: quantidadeColunas }, (_, indice) => `coluna_${indice + 1}`);
  return [cabecalho, ...linhas.map((linha) => [...linha, ...Array(Math.max(0, quantidadeColunas - linha.length)).fill('')])];
}

function limparPartesPipe(linha: string) {
  const partes = linha
    .split('|')
    .map((parte) => parte.replace(/[\]\[]/g, '').trim());
  while (partes.length && !partes[0]) partes.shift();
  while (partes.length && !partes[partes.length - 1]) partes.pop();
  return partes;
}

function normalizarNumeroOcr(valor: string) {
  return valor
    .replace(/[oO]/g, '0')
    .replace(/[lI]/g, '1')
    .replace(/[^\d,.]/g, '');
}

function extrairLinhaAacPorEspacos(linha: string) {
  const texto = linha
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const data = texto.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}[:;]\d{2})\s+/);
  if (!data) return null;
  const restante = texto.slice(data[0].length).trim();
  const placa = restante.match(/^([A-Z]{3}\d[A-Z0-9]\d{2}|[A-Z]{3}\d{4})\s+/i);
  if (!placa) return null;
  const aposPlaca = restante.slice(placa[0].length).trim();
  const partesFim = aposPlaca.match(/([\d.,]+)\s+([A-Z]{1,4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/i);
  if (!partesFim) return null;
  const antesValores = aposPlaca.slice(0, partesFim.index).trim();
  const inicio = antesValores.match(/^(\d*)\s+(\d+)\s+(\d+)\s+(.+)$/);
  if (!inicio) return null;
  return [
    `${data[1]} ${data[2].replace(';', ':')}`,
    placa[1].toUpperCase(),
    inicio[1] ?? '',
    inicio[2] ?? '',
    inicio[3] ?? inicio[2],
    inicio[4].trim(),
    normalizarNumeroOcr(partesFim[1]),
    partesFim[2].toUpperCase(),
    normalizarNumeroOcr(partesFim[3]),
    normalizarNumeroOcr(partesFim[4]),
    normalizarNumeroOcr(partesFim[5]),
    normalizarNumeroOcr(partesFim[6])
  ];
}

function textoAacParaMatriz(textoPdf: string) {
  const cabecalhos = ['data_hora', 'placa', 'hodometro', 'numero_documento', 'fatura', 'descricao_despesa', 'quantidade', 'unidade_despesa', 'valor_unitario', 'valor_bruto', 'desconto', 'total'];
  const linhas = textoPdf
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => /^\|?\s*\d{2}\/\d{2}\/\d{4}/.test(linha))
    .map((linha) => {
      if (!linha.includes('|')) {
        return extrairLinhaAacPorEspacos(linha) ?? [];
      }
      const partes = limparPartesPipe(linha);
      const dataHora = partes[0] ?? '';
      const placa = partes[1] ?? '';
      const hodometro = partes[2]?.replace(/\D/g, '') ?? '';
      const numeroDocumento = partes[3]?.replace(/\D/g, '') ?? '';
      const fatura = partes[4]?.replace(/\D/g, '') ?? numeroDocumento;
      const descricao = partes.slice(5, -6).join(' ').trim();
      const ultimos = partes.slice(-6);
      return [
        dataHora,
        placa,
        hodometro,
        numeroDocumento,
        fatura,
        descricao,
        ultimos[0] ?? '',
        ultimos[1] ?? '',
        ultimos[2] ?? '',
        ultimos[3] ?? '',
        ultimos[4] ?? '',
        ultimos[5] ?? ''
      ];
    })
    .filter((linha) => linha[0] && linha[5]);

  return [cabecalhos, ...linhas];
}

async function renderizarPaginaPdfComoCanvas(pagina: any, rotacao: number) {
  const viewport = pagina.getViewport({ scale: 3, rotation: rotacao });
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d');
  if (!contexto) {
    throw new Error('Nao foi possivel preparar a leitura visual do PDF.');
  }
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await pagina.render({ canvasContext: contexto, viewport }).promise;
  return canvas;
}

async function carregarBibliotecasPdf() {
  try {
    const importar = new Function('modulo', 'return import(modulo)') as (modulo: string) => Promise<any>;
    const [pdfjsLib, tesseract] = await Promise.all([
      importar('pdfjs-dist'),
      importar('tesseract.js')
    ]);
    try {
      const worker = await importar('pdfjs-dist/build/pdf.worker.mjs?url');
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default ?? worker;
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    return {
      pdfjsLib,
      createWorker: tesseract.createWorker,
      PSM: tesseract.PSM
    };
  } catch {
    throw new Error('Leitura de PDF indisponivel neste servidor. Execute INSTALAR_DEPENDENCIAS_FROTA.bat, reinicie o sistema e tente novamente.');
  }
}

async function extrairMatrizPdf(arquivo: File, aoProgresso?: (progresso: ProgressoLeituraArquivo) => void) {
  const { pdfjsLib, createWorker, PSM } = await carregarBibliotecasPdf();
  const dados = await arquivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: dados }).promise;
  const textos: string[] = [];
  const worker = await createWorker('eng');
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });

  try {
    for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina += 1) {
      aoProgresso?.({ etapa: `Pagina ${numeroPagina} de ${pdf.numPages}`, percentual: Math.round(((numeroPagina - 1) / pdf.numPages) * 100) });
      const pagina = await pdf.getPage(numeroPagina);
      const conteudo = await pagina.getTextContent();
      const textoExtraido = conteudo.items.map((item: any) => String(item.str ?? '').trim()).filter(Boolean).join('\n');
      if (textoAacParaMatriz(textoExtraido).length > 1) {
        textos.push(textoExtraido);
        continue;
      }

      let melhorTexto = '';
      let melhorPontuacao = -1;
      for (const rotacao of [90, 0, 180, 270]) {
        aoProgresso?.({ etapa: `OCR pagina ${numeroPagina}/${pdf.numPages} - rotacao ${rotacao}`, percentual: Math.round(((numeroPagina - 1) / pdf.numPages) * 100) });
        const canvas = await renderizarPaginaPdfComoCanvas(pagina, rotacao);
        const resultado = await worker.recognize(canvas);
        const confianca = Number(resultado.data.confidence ?? 0);
        const linhasReconhecidas = textoAacParaMatriz(resultado.data.text).length - 1;
        const pontuacao = linhasReconhecidas * 1000 + confianca;
        if (pontuacao > melhorPontuacao && resultado.data.text.trim()) {
          melhorPontuacao = pontuacao;
          melhorTexto = resultado.data.text;
        }
      }
      textos.push(melhorTexto);
    }
  } finally {
    await worker.terminate();
  }

  const textoFinal = textos.join('\n');
  if (!textoFinal.trim()) {
    throw new Error('Nao foi possivel extrair dados do PDF. Verifique se o arquivo esta legivel.');
  }
  aoProgresso?.({ etapa: 'Dados extraidos', percentual: 100 });
  return textoOcrParaMatriz(textoFinal);
}

export function ImportacaoFrota() {
  const campos = ['placa', 'data_hora', 'hodometro', 'numero_documento', 'fatura', 'descricao_despesa', 'quantidade', 'unidade_despesa', 'valor_unitario', 'valor_unitario_liquido', 'valor_bruto', 'desconto', 'total'];
  const [fornecedores, setFornecedores] = useState<RegistroGenerico[]>([]);
  const [tipos, setTipos] = useState<RegistroGenerico[]>([]);
  const [departamentos, setDepartamentos] = useState<RegistroGenerico[]>([]);
  const [motoristas, setMotoristas] = useState<RegistroGenerico[]>([]);
  const [veiculos, setVeiculos] = useState<RegistroGenerico[]>([]);
  const [fornecedorId, setFornecedorId] = useState(0);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [matrizOrigem, setMatrizOrigem] = useState<string[][]>([]);
  const [configuracaoLeitura, setConfiguracaoLeitura] = useState<ConfiguracaoLeituraImportacao>(configuracaoLeituraPadrao);
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhasOrigem, setLinhasOrigem] = useState<string[][]>([]);
  const [mapeamento, setMapeamento] = useState<RegistroGenerico>({});
  const [resultado, setResultado] = useState<RegistroGenerico | null>(null);
  const [resultadoAberto, setResultadoAberto] = useState(false);
  const [vinculos, setVinculos] = useState<RegistroGenerico>({});
  const [erro, setErro] = useState('');
  const [pendenciasVeiculos, setPendenciasVeiculos] = useState<RegistroGenerico[]>([]);
  const [mensagemModalVinculo, setMensagemModalVinculo] = useState('');
  const [salvandoVinculos, setSalvandoVinculos] = useState(false);
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [progressoLeitura, setProgressoLeitura] = useState<ProgressoLeituraArquivo | null>(null);

  useEffect(() => {
    listarFornecedoresFrota().then(setFornecedores).catch(() => setFornecedores([]));
    listarTiposDespesasFrota().then(setTipos).catch(() => setTipos([]));
    listarDepartamentosFrota().then(setDepartamentos).catch(() => setDepartamentos([]));
    listarMotoristasFrota().then(setMotoristas).catch(() => setMotoristas([]));
    listarVeiculosFrota().then(setVeiculos).catch(() => setVeiculos([]));
  }, []);

  useEffect(() => {
    if (!fornecedorId) return;
    obterMapeamentoImportacaoFrota(fornecedorId).then((retorno) => setMapeamento(retorno?.mapeamento ?? {})).catch(() => undefined);
  }, [fornecedorId]);

  function aplicarConfiguracaoLeitura(matriz: string[][], configuracao: ConfiguracaoLeituraImportacao, mapeamentoBase = mapeamento) {
    const dados = prepararMatrizImportacao(matriz, configuracao);
    if (!dados.cabecalhos.length || !dados.linhas.length) {
      throw new Error('Nao foi possivel localizar cabecalho e linhas de dados. Ajuste a linha do cabecalho, linha inicial e coluna inicial.');
    }
    setCabecalhos(dados.cabecalhos);
    setLinhasOrigem(dados.linhas);
    setMapeamento(sugerirMapeamento(dados.cabecalhos, mapeamentoBase));
  }

  function alterarConfiguracaoLeitura(campo: keyof ConfiguracaoLeituraImportacao, valor: number) {
    const novaConfiguracao = {
      ...configuracaoLeitura,
      [campo]: Math.max(1, Number(valor || 1))
    };
    setConfiguracaoLeitura(novaConfiguracao);
    setErro('');
    try {
      aplicarConfiguracaoLeitura(matrizOrigem, novaConfiguracao);
    } catch (error) {
      setCabecalhos([]);
      setLinhasOrigem([]);
      setErro(error instanceof Error ? error.message : 'Nao foi possivel aplicar a configuracao de leitura.');
    }
  }

  async function carregarArquivo(arquivo?: File) {
    if (!arquivo) return;
    setErro('');
    if (!fornecedorId) {
      setErro('Selecione o fornecedor antes de escolher o arquivo.');
      return;
    }
    setLendoArquivo(true);
    setProgressoLeitura({ etapa: 'Preparando leitura', percentual: 0 });
    try {
      setNomeArquivo(arquivo.name);
      const dados = await linhasPlanilhaParaMatriz(arquivo, setProgressoLeitura);
      const linhasComDados = dados.filter((linha) => linha.some(Boolean));
      if (linhasComDados.length <= 1) {
        throw new Error('O arquivo foi lido, mas nao retornou linhas de dados para importacao.');
      }
      const configuracaoDetectada = detectarConfiguracaoLeitura(dados);
      setMatrizOrigem(dados);
      setConfiguracaoLeitura(configuracaoDetectada);
      aplicarConfiguracaoLeitura(dados, configuracaoDetectada);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Nao foi possivel ler o arquivo.');
    } finally {
      setLendoArquivo(false);
      setProgressoLeitura(null);
    }
  }

  const linhasMapeadas = useMemo(() => linhasOrigem
    .map((linha) => {
      const registro: RegistroGenerico = {};
      campos.forEach((campo) => {
        const cabecalho = mapeamento[campo];
        const indice = cabecalhos.indexOf(String(cabecalho ?? ''));
        registro[campo] = indice >= 0 ? linha[indice] : '';
      });
      return registro;
    })
    .filter(linhaDespesaImportacaoValida), [linhasOrigem, mapeamento, cabecalhos]);

  function obterPendenciasVeiculosImportacao() {
    const placas = [...new Set(linhasMapeadas.map((linha) => String(linha.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean))];
    const veiculosPorPlaca = new Map(veiculos.map((veiculo) => [String(veiculo.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), veiculo]));
    return placas
      .map((placa) => veiculosPorPlaca.get(placa))
      .filter((veiculo): veiculo is RegistroGenerico => Boolean(veiculo && (!veiculo.departamento_id || !veiculo.motorista_id)));
  }

  function validarVinculosVeiculosImportacao() {
    const pendentes = obterPendenciasVeiculosImportacao();
    if (pendentes.length) {
      setPendenciasVeiculos(pendentes.map((veiculo) => ({ ...veiculo })));
      setErro('Complete departamento e motorista dos veiculos encontrados para continuar.');
      return false;
    }
    return true;
  }

  async function confirmarImportacao(_ignorarValidacaoVeiculos = false) {
    setErro('');
    setMensagemModalVinculo('');
    if (!fornecedorId) {
      setErro('Selecione o fornecedor.');
      return;
    }
    await salvarMapeamentoImportacaoFrota(fornecedorId, mapeamento);
    const retorno = await importarDespesasFrota({ fornecedor_id: fornecedorId, nome_arquivo: nomeArquivo, mapeamento, linhas: linhasMapeadas });
    setResultado(retorno);
    const atualizados = await listarVeiculosFrota().catch(() => veiculos);
    setVeiculos(atualizados);
    const placas = [...new Set(linhasMapeadas.map((linha) => String(linha.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean))];
    const veiculosPorPlaca = new Map(atualizados.map((veiculo) => [String(veiculo.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), veiculo]));
    const pendentes = placas
      .map((placa) => veiculosPorPlaca.get(placa))
      .filter((veiculo): veiculo is RegistroGenerico => Boolean(veiculo && (!veiculo.departamento_id || !veiculo.motorista_id)));
    if (pendentes.length) {
      setPendenciasVeiculos(Array.from(new Map(pendentes.map((veiculo) => [String(veiculo.id), { ...veiculo }])).values()));
      setErro('');
      setResultadoAberto(false);
    } else {
      setErro('');
      setResultadoAberto(true);
    }
  }

  async function salvarVinculosVeiculosPendentes() {
    setErro('');
    setMensagemModalVinculo('');
    const completos = pendenciasVeiculos.filter((veiculo) => veiculo.departamento_id && veiculo.motorista_id);
    if (!completos.length) {
      setMensagemModalVinculo('Informe departamento e motorista em pelo menos um veiculo para salvar parcial.');
      return;
    }
    setSalvandoVinculos(true);
    try {
      for (const veiculo of completos) {
        await salvarVeiculoFrota(veiculo);
      }
      const atualizados = await listarVeiculosFrota();
      setVeiculos(atualizados);
      const pendentes = pendenciasVeiculos.filter((veiculo) => !veiculo.departamento_id || !veiculo.motorista_id);
      setPendenciasVeiculos(pendentes);
      setErro('');
      if (pendentes.length) {
        setMensagemModalVinculo(`${completos.length} vinculo(s) salvo(s). Ainda falta completar ${pendentes.length} veiculo(s) abaixo.`);
      } else {
        setMensagemModalVinculo('');
        setResultadoAberto(true);
      }
    } catch (error) {
      setMensagemModalVinculo(error instanceof Error ? error.message : 'Nao foi possivel salvar os vinculos dos veiculos.');
    } finally {
      setSalvandoVinculos(false);
    }
  }

  async function salvarVinculosPendentes() {
    setErro('');
    setMensagemModalVinculo('');
    const pendentes = (resultado?.pendentes_vinculo ?? []) as string[];
    const preenchidos = pendentes.filter((descricao) => vinculos[descricao]);
    if (!preenchidos.length) {
      setMensagemModalVinculo('Selecione o tipo de despesa em pelo menos uma descricao para salvar parcial.');
      return;
    }
    setSalvandoVinculos(true);
    try {
      for (const descricao of preenchidos) {
        await salvarDespesaTipoFrota({ fornecedor_id: fornecedorId, descricao_despesa: descricao, tipo_despesa_id: Number(vinculos[descricao]), ativo: true });
      }
      setVinculos((atuais) => {
        const proximos = { ...atuais };
        preenchidos.forEach((descricao) => delete proximos[descricao]);
        return proximos;
      });
      await confirmarImportacao();
      const restantes = pendentes.length - preenchidos.length;
      setMensagemModalVinculo(restantes > 0 ? `${preenchidos.length} De/Para salvo(s). Ainda falta vincular ${restantes} descricao(oes).` : '');
    } catch (error) {
      setMensagemModalVinculo(error instanceof Error ? error.message : 'Nao foi possivel salvar o De/Para.');
    } finally {
      setSalvandoVinculos(false);
    }
  }

  return (
    <section className="painelTabela frotaPainel frotaImportacaoTela">
      <header className="frotaHero">
        <div>
          <span>Modulo Frota</span>
          <h2>Importacao de Despesas</h2>
          <p>Mapeie colunas de XLS, XLSX, CSV, TSV ou PDF. Quando o PDF for imagem, o HUB usa OCR e gera uma pre-visualizacao editavel.</p>
        </div>
        <FileSpreadsheet size={42} />
      </header>
      {erro && <div className="alerta">{erro}</div>}
      <div className="formCadastro frotaImportacaoPasso">
        <label>Fornecedor<select value={fornecedorId} onChange={(e) => setFornecedorId(Number(e.target.value))}><option value="">Selecione</option>{fornecedores.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome_fantasia ?? item.nome)}</option>)}</select></label>
        <label className="campoLargo">Arquivo XLS, XLSX, CSV, TSV ou PDF<input type="file" accept=".xls,.xlsx,.csv,.tsv,.txt,.pdf,application/pdf" disabled={!fornecedorId || lendoArquivo} onChange={(e) => carregarArquivo(e.target.files?.[0])} /></label>
      </div>
      {!fornecedorId && <div className="aviso">Selecione o fornecedor para liberar a leitura do arquivo e carregar o mapeamento salvo.</div>}
      {lendoArquivo && (
        <div className="frotaProgressoLeitura">
          <div>
            <strong><span className="gaugeAtualizacao" />{progressoLeitura?.etapa ?? 'Lendo arquivo'}</strong>
            <span>{progressoLeitura?.percentual ?? 0}%</span>
          </div>
          <progress max={100} value={progressoLeitura?.percentual ?? 0} />
          <small>PDFs escaneados podem levar alguns minutos por causa do OCR.</small>
        </div>
      )}
      {matrizOrigem.length > 0 && (
        <div className="frotaLeituraArquivo">
          <div>
            <span>Leitura do arquivo</span>
            <strong>{linhasOrigem.length} linha(s) encontradas entre as linhas {configuracaoLeitura.linhaInicialDados} e {configuracaoLeitura.linhaFinalDados}</strong>
            <small>Cabecalho encontrado na linha {configuracaoLeitura.linhaCabecalho}. Ajuste quando a planilha tiver titulo, filtros, colunas antes da tabela ou rodape.</small>
          </div>
          <label>Linha do cabecalho<input type="number" min={1} value={configuracaoLeitura.linhaCabecalho} onChange={(e) => alterarConfiguracaoLeitura('linhaCabecalho', Number(e.target.value))} /></label>
          <label>Linha inicial dos dados<input type="number" min={1} value={configuracaoLeitura.linhaInicialDados} onChange={(e) => alterarConfiguracaoLeitura('linhaInicialDados', Number(e.target.value))} /></label>
          <label>Linha final dos dados<input type="number" min={1} value={configuracaoLeitura.linhaFinalDados} onChange={(e) => alterarConfiguracaoLeitura('linhaFinalDados', Number(e.target.value))} /></label>
          <label>Coluna inicial<input type="number" min={1} value={configuracaoLeitura.colunaInicial} onChange={(e) => alterarConfiguracaoLeitura('colunaInicial', Number(e.target.value))} /></label>
        </div>
      )}
      {cabecalhos.length > 0 && (
        <>
          <div className="formCadastro semBorda">
            {campos.map((campo) => <label key={campo}>{campo.replace(/_/g, ' ')}<select value={String(mapeamento[campo] ?? '')} onChange={(e) => setMapeamento({ ...mapeamento, [campo]: e.target.value })}><option value="">Nao vincular</option>{cabecalhos.map((cabecalho) => <option key={cabecalho}>{cabecalho}</option>)}</select></label>)}
          </div>
          <TabelaPreview linhas={linhasMapeadas.slice(0, 20)} colunas={campos} />
          <button className="primary" onClick={() => confirmarImportacao()}>Validar e importar</button>
        </>
      )}
      <FilaVinculoVeiculosModal
        titulo="Completar veiculos da importacao"
        subtitulo="As placas abaixo ja existem no cadastro, mas ainda precisam de departamento e motorista. Ao salvar, o cadastro do veiculo sera atualizado e o log da importacao sera exibido."
        veiculos={pendenciasVeiculos}
        departamentos={departamentos}
        motoristas={motoristas}
        aoAlterar={setPendenciasVeiculos}
        aoSalvar={salvarVinculosVeiculosPendentes}
        salvando={salvandoVinculos}
        mensagem={mensagemModalVinculo}
        aoFechar={() => { setPendenciasVeiculos([]); setResultadoAberto(true); }}
      />
      {resultadoAberto && (
        <ModalLogImportacao
          resultado={resultado}
          aoFechar={() => setResultadoAberto(false)}
          aoVincularDePara={() => (resultado?.pendentes_vinculo ?? []).length > 0 ? (
            <div className="modalInterno">
              <h3>De/Para pendente</h3>
              <p className="textoApoio">Voce pode salvar apenas os itens ja conferidos. O restante continuara listado neste modal.</p>
              {mensagemModalVinculo && <div className="avisoModalVinculo">{mensagemModalVinculo}</div>}
              {(resultado?.pendentes_vinculo ?? []).map((descricao: string) => (
                <label key={descricao}>{descricao}<select value={String(vinculos[descricao] ?? '')} onChange={(e) => setVinculos({ ...vinculos, [descricao]: e.target.value })}><option value="">Selecione</option>{tipos.map((tipo) => <option key={String(tipo.id)} value={String(tipo.id)}>{String(tipo.descricao)}</option>)}</select></label>
              ))}
              <button className="primary" onClick={salvarVinculosPendentes} disabled={salvandoVinculos}>{salvandoVinculos ? 'Salvando...' : 'Salvar parcial e continuar'}</button>
            </div>
          ) : null}
        />
      )}
    </section>
  );
}

function TabelaPreview({ linhas, colunas }: { linhas: RegistroGenerico[]; colunas: string[] }) {
  return (
    <div className="tabelaWrap">
      <table>
        <thead><tr>{colunas.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}</tr></thead>
        <tbody>{linhas.map((linha, indice) => <tr key={indice}>{colunas.map((coluna) => <td key={coluna}>{String(linha[coluna] ?? '-')}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function FilaVinculoVeiculosModal({
  titulo,
  subtitulo,
  veiculos,
  departamentos,
  motoristas,
  aoAlterar,
  aoSalvar,
  salvando,
  mensagem,
  aoFechar
}: {
  titulo: string;
  subtitulo: string;
  veiculos: RegistroGenerico[];
  departamentos: RegistroGenerico[];
  motoristas: RegistroGenerico[];
  aoAlterar: (veiculos: RegistroGenerico[]) => void;
  aoSalvar: () => void | Promise<void>;
  salvando?: boolean;
  mensagem?: string;
  aoFechar: () => void;
}) {
  if (!veiculos.length) return null;
  return (
    <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="frotaModalFundo" type="button" aria-label="Fechar vinculos" onClick={aoFechar} />
      <section className="frotaModalDetalhe frotaModalCompacto">
        <header>
          <div>
            <span>Fila de vinculo</span>
            <h3>{titulo}</h3>
          </div>
          <button className="ghost" type="button" onClick={aoFechar}>Fechar</button>
        </header>
        <p className="textoApoio">{subtitulo}</p>
        <p className="textoApoio">Voce pode salvar parcialmente os veiculos ja preenchidos. Os pendentes permanecem aqui para continuar depois.</p>
        {mensagem && <div className="avisoModalVinculo">{mensagem}</div>}
        {veiculos.map((veiculo, indice) => (
          <div className="frotaVinculoVeiculo" key={String(veiculo.id ?? veiculo.placa)}>
            <strong>{String(veiculo.placa)} - {String(veiculo.modelo ?? 'Sem modelo')}</strong>
            <label>Departamento<select value={String(veiculo.departamento_id ?? '')} onChange={(e) => aoAlterar(veiculos.map((item, itemIndice) => itemIndice === indice ? { ...item, departamento_id: e.target.value ? Number(e.target.value) : null } : item))}><option value="">Selecione</option>{departamentos.map((departamento) => <option key={String(departamento.id)} value={String(departamento.id)}>{String(departamento.descricao)}</option>)}</select></label>
            <label>Motorista<select value={String(veiculo.motorista_id ?? '')} onChange={(e) => aoAlterar(veiculos.map((item, itemIndice) => itemIndice === indice ? { ...item, motorista_id: e.target.value ? Number(e.target.value) : null } : item))}><option value="">Selecione</option>{motoristas.map((motorista) => <option key={String(motorista.id)} value={String(motorista.id)}>{String(motorista.nome)}</option>)}</select></label>
          </div>
        ))}
        <button className="primary" onClick={aoSalvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar parcial e continuar'}</button>
      </section>
    </div>
  );
}

function ModalLogImportacao({
  resultado,
  aoFechar,
  aoVincularDePara
}: {
  resultado: RegistroGenerico | null;
  aoFechar: () => void;
  aoVincularDePara: () => ReactNode;
}) {
  if (!resultado) return null;
  const mensagens = (resultado.mensagens ?? []) as string[];
  const placasSemCadastro = [...new Set(mensagens
    .map((mensagem) => mensagem.match(/placa\s+([A-Z0-9]+)/i)?.[1]?.toUpperCase())
    .filter(Boolean) as string[])];
  const temBloqueioVeiculo = mensagens.some((mensagem) => /cadastro de veiculo|sem motorista|sem departamento|cadastro no Decis/i.test(mensagem));
  const mensagensVisiveis = mensagens.filter((mensagem) => (
    !/cadastro de veiculo|sem motorista|sem departamento|cadastro no Decis|nao foi possivel determinar o tipo de dados do parametro/i.test(mensagem)
  ));
  return (
    <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Resultado da importacao">
      <button className="frotaModalFundo" type="button" aria-label="Fechar resultado" onClick={aoFechar} />
      <section className="frotaModalDetalhe frotaModalCompacto frotaModalLog">
        <header>
          <div>
            <span>Resultado da importacao</span>
            <h3>Resumo do processamento</h3>
          </div>
          <button className="ghost" type="button" onClick={aoFechar}>Fechar</button>
        </header>
        <div className="metrics">
          <article><span>Lidas</span><strong>{String(resultado.total_linhas ?? 0)}</strong></article>
          <article><span>Importadas</span><strong>{String(resultado.importadas ?? 0)}</strong></article>
          <article><span>Atualizadas</span><strong>{String(resultado.atualizadas ?? 0)}</strong></article>
          <article><span>Ignoradas</span><strong>{String(resultado.ignoradas ?? 0)}</strong></article>
          <article><span>Com erro</span><strong>{String(resultado.com_erro ?? 0)}</strong></article>
          <article><span>Pendentes</span><strong>{String((resultado.pendentes_vinculo ?? []).length)}</strong></article>
        </div>
        {aoVincularDePara()}
        {temBloqueioVeiculo && (
          <div className="frotaAvisoValidacaoImportacao">
            <strong>Atencao para a validacao</strong>
            <p>As despesas foram importadas, mas nao sera possivel validar os documentos enquanto os veiculos nao estiverem cadastrados no Decis e com motorista/departamento vinculados no HUB.</p>
            {placasSemCadastro.length > 0 && <small>Placas identificadas: {placasSemCadastro.join(', ')}</small>}
          </div>
        )}
        {(!temBloqueioVeiculo || mensagensVisiveis.length > 0) && (
          <div className="frotaLogLista frotaLogListaMelhorada">
            {mensagensVisiveis.length === 0 && <p>Nenhuma ocorrencia registrada.</p>}
            {mensagensVisiveis.map((mensagem: string, indice: number) => <p key={`${indice}-${mensagem}`}>{mensagem}</p>)}
          </div>
        )}
      </section>
    </div>
  );
}

function ModalAvisoFrota({
  titulo,
  mensagem,
  aoFechar
}: {
  titulo: string;
  mensagem: string;
  aoFechar: () => void;
}) {
  if (!mensagem) return null;
  return (
    <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="frotaModalFundo" type="button" aria-label="Fechar aviso" onClick={aoFechar} />
      <section className="frotaModalDetalhe frotaModalAviso">
        <header>
          <div>
            <span>Aviso</span>
            <h3>{titulo}</h3>
          </div>
          <button className="ghost" type="button" onClick={aoFechar}>Fechar</button>
        </header>
        <p>{mensagem}</p>
        <button className="primary" type="button" onClick={aoFechar}>Entendi</button>
      </section>
    </div>
  );
}

export function ValidacaoFrota() {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [totalizadores, setTotalizadores] = useState<RegistroGenerico>({});
  const [filtros, setFiltros] = useState<RegistroGenerico>({ validado: 'TODOS', integrado: 'TODOS', ativo: 'SIM' });
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [historico, setHistorico] = useState<RegistroGenerico[]>([]);
  const [detalhe, setDetalhe] = useState<RegistroGenerico | null>(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [cancelamentoAberto, setCancelamentoAberto] = useState(false);
  const [motivoCancelamentoId, setMotivoCancelamentoId] = useState('');
  const [observacaoCancelamento, setObservacaoCancelamento] = useState('');
  const [fornecedores, setFornecedores] = useState<RegistroGenerico[]>([]);
  const [departamentos, setDepartamentos] = useState<RegistroGenerico[]>([]);
  const [motoristas, setMotoristas] = useState<RegistroGenerico[]>([]);
  const [tipos, setTipos] = useState<RegistroGenerico[]>([]);
  const [veiculos, setVeiculos] = useState<RegistroGenerico[]>([]);
  const [motivosCancelamento, setMotivosCancelamento] = useState<RegistroGenerico[]>([]);
  const [pendenciasVeiculos, setPendenciasVeiculos] = useState<RegistroGenerico[]>([]);
  const [erroValidacaoModal, setErroValidacaoModal] = useState('');
  const [avisoIntegradosModal, setAvisoIntegradosModal] = useState<{ acao: string; ignorados: RegistroGenerico[]; processados: number } | null>(null);
  const [idsValidacaoPendente, setIdsValidacaoPendente] = useState<number[]>([]);
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: 'data_hora', direcao: 'desc' });
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(() => {
    const salvo = localStorage.getItem('controlSHubFrotaColunasValidacao');
    return salvo ? JSON.parse(salvo) : ['data_hora', 'placa', 'numero_documento', 'fornecedor_nome', 'departamento_descricao', 'motorista_nome', 'tipo_despesa_descricao', 'hodometro', 'valor_unitario_liquido', 'total', 'data_vencimento', 'validado', 'integrado'];
  });
  const [erro, setErro] = useState('');
  const colunas = ['data_hora', 'placa', 'numero_documento', 'fatura', 'fornecedor_nome', 'departamento_descricao', 'motorista_nome', 'tipo_despesa_descricao', 'descricao_despesa', 'hodometro', 'quantidade', 'unidade_despesa', 'valor_unitario', 'valor_unitario_liquido', 'valor_bruto', 'desconto', 'total', 'conf_custo_decis', 'codigo_forma_pagamento_decis', 'descricao_forma_pagamento', 'dia_vencimento', 'data_vencimento', 'validado', 'integrado', 'cancelado', 'origem_lancamento'];
  const linhasOrdenadas = useMemo(() => {
    const multiplicador = ordenacao.direcao === 'asc' ? 1 : -1;
    return [...linhas].sort((a, b) => {
      const valorA = a[ordenacao.coluna];
      const valorB = b[ordenacao.coluna];
      const dataA = ordenacao.coluna.includes('data') ? new Date(String(valorA ?? '')).getTime() : Number.NaN;
      const dataB = ordenacao.coluna.includes('data') ? new Date(String(valorB ?? '')).getTime() : Number.NaN;
      if (Number.isFinite(dataA) && Number.isFinite(dataB)) return (dataA - dataB) * multiplicador;
      const numeroA = Number(valorA);
      const numeroB = Number(valorB);
      if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) return (numeroA - numeroB) * multiplicador;
      return String(valorA ?? '').localeCompare(String(valorB ?? ''), 'pt-BR') * multiplicador;
    });
  }, [linhas, ordenacao]);

  async function carregar() {
    const [retorno, veiculosAtualizados] = await Promise.all([
      listarDespesasFrota(filtros),
      listarVeiculosFrota()
    ]);
    setLinhas(retorno.linhas);
    setTotalizadores(retorno.totalizadores ?? {});
    setVeiculos(veiculosAtualizados);
  }

  useEffect(() => {
    carregar().catch(() => undefined);
    listarFornecedoresFrota().then(setFornecedores).catch(() => setFornecedores([]));
    listarDepartamentosFrota().then(setDepartamentos).catch(() => setDepartamentos([]));
    listarMotoristasFrota().then(setMotoristas).catch(() => setMotoristas([]));
    listarTiposDespesasFrota().then(setTipos).catch(() => setTipos([]));
    listarVeiculosFrota().then(setVeiculos).catch(() => setVeiculos([]));
    listarMotivosCancelamentoFrota().then(setMotivosCancelamento).catch(() => setMotivosCancelamento([]));
  }, []);

  function prepararPendenciasValidacao(idsAcionaveis = selecionados) {
    const veiculosPorPlaca = new Map(veiculos.map((veiculo) => [String(veiculo.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), veiculo]));
    const despesasSelecionadas = linhas.filter((linha) => idsAcionaveis.includes(Number(linha.id)));
    const semPlaca = despesasSelecionadas.filter((linha) => !String(linha.placa ?? '').trim());
    if (semPlaca.length) {
      const mensagem = `Nao e permitido validar despesas sem placa: ${semPlaca.map((linha) => linha.numero_documento ?? linha.id).join(', ')}.`;
      setErro(mensagem);
      setErroValidacaoModal(mensagem);
      return false;
    }

    const semVeiculo = despesasSelecionadas.filter((linha) => {
      const placa = String(linha.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return placa && !veiculosPorPlaca.has(placa);
    });
    if (semVeiculo.length) {
      const mensagem = `Cadastre no Decis os veiculos antes de validar: ${[...new Set(semVeiculo.map((linha) => String(linha.placa).trim().toUpperCase()))].join(', ')}.`;
      setErro(mensagem);
      setErroValidacaoModal(mensagem);
      return false;
    }

    const pendentes = despesasSelecionadas
      .map((linha) => {
        const placa = String(linha.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        return veiculosPorPlaca.get(placa);
      })
      .filter((veiculo): veiculo is RegistroGenerico => Boolean(veiculo && (!veiculo.departamento_id || !veiculo.motorista_id)));
    if (pendentes.length) {
      const unicos = Array.from(new Map(pendentes.map((veiculo) => [String(veiculo.id), { ...veiculo }])).values());
      setPendenciasVeiculos(unicos);
      const mensagem = 'Complete departamento e motorista dos veiculos selecionados para validar.';
      setErro(mensagem);
      setErroValidacaoModal(mensagem);
      return false;
    }

    return true;
  }

  async function validar(validado: boolean) {
    setErro('');
    try {
      const despesasSelecionadas = linhas.filter((linha) => selecionados.includes(Number(linha.id)));
      const integradas = despesasSelecionadas.filter((linha) => linha.integrado);
      const idsAcionaveis = despesasSelecionadas.filter((linha) => !linha.integrado).map((linha) => Number(linha.id));
      if (integradas.length) {
        setAvisoIntegradosModal({
          acao: validado ? 'validar' : 'remover validacao',
          ignorados: integradas,
          processados: idsAcionaveis.length
        });
        setSelecionados(idsAcionaveis);
      }
      if (!idsAcionaveis.length) {
        return;
      }
      if (validado && !prepararPendenciasValidacao(idsAcionaveis)) {
        setIdsValidacaoPendente(idsAcionaveis);
        return;
      }
      await validarDespesasFrota(idsAcionaveis, validado);
      setSelecionados([]);
      setIdsValidacaoPendente([]);
      await carregar();
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Falha ao validar despesas.';
      setErro(mensagem);
      setErroValidacaoModal(mensagem);
    }
  }

  async function salvarVinculosValidacaoPendentes() {
    setErro('');
    const incompletos = pendenciasVeiculos.filter((veiculo) => !veiculo.departamento_id || !veiculo.motorista_id);
    if (incompletos.length) {
      setErro('Informe departamento e motorista em todos os veiculos para validar.');
      return;
    }
    for (const veiculo of pendenciasVeiculos) {
      await salvarVeiculoFrota(veiculo);
    }
    const atualizados = await listarVeiculosFrota();
    setVeiculos(atualizados);
    setPendenciasVeiculos([]);
    const ids = idsValidacaoPendente.length ? idsValidacaoPendente : selecionados;
    await validarDespesasFrota(ids, true);
    setSelecionados([]);
    setIdsValidacaoPendente([]);
    await carregar();
  }

  async function cancelarSelecionados() {
    setErro('');
    if (!motivoCancelamentoId) {
      setErro('Informe o motivo do cancelamento.');
      return;
    }
    try {
      await cancelarDespesasFrota(selecionados, Number(motivoCancelamentoId), observacaoCancelamento);
      setSelecionados([]);
      setCancelamentoAberto(false);
      setMotivoCancelamentoId('');
      setObservacaoCancelamento('');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao cancelar despesas.');
    }
  }

  async function abrirHistorico(id: number) {
    setHistorico(await listarHistoricoDespesaFrota(id));
  }

  function alternarColuna(coluna: string) {
    const novas = colunasVisiveis.includes(coluna)
      ? colunasVisiveis.filter((item) => item !== coluna)
      : [...colunasVisiveis, coluna];
    setColunasVisiveis(novas);
    localStorage.setItem('controlSHubFrotaColunasValidacao', JSON.stringify(novas));
  }

  function formatarCelula(linha: RegistroGenerico, coluna: string) {
    if (coluna === 'validado') {
      return <span className={linha.validado ? 'frotaChip sucesso' : 'frotaChip alerta'}>{linha.validado ? 'Validado' : 'Pendente'}</span>;
    }
    if (coluna === 'integrado') {
      return <span className={linha.integrado ? 'frotaChip info' : 'frotaChip neutro'}>{linha.integrado ? 'Integrado' : 'Aberto'}</span>;
    }
    if (coluna === 'cancelado') {
      return <span className={linha.cancelado ? 'frotaChip perigo' : 'frotaChip sucesso'}>{linha.cancelado ? 'Cancelado' : 'Ativo'}</span>;
    }
    if (coluna === 'total' || coluna.startsWith('valor_') || coluna === 'desconto') {
      return moeda(linha[coluna]);
    }
    if (coluna === 'data_hora') {
      return formatarDataHora(linha[coluna]);
    }
    if (coluna === 'data_vencimento') {
      return formatarData(linha[coluna]);
    }
    return String(linha[coluna] ?? '-');
  }

  function formatarDataHora(valor: unknown) {
    if (!valor) return '-';
    const data = new Date(String(valor));
    if (Number.isNaN(data.getTime())) return String(valor);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo'
    });
  }

  function formatarData(valor: unknown) {
    if (!valor) return '-';
    const data = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(data.getTime())) return String(valor);
    return data.toLocaleDateString('pt-BR');
  }

  function rotuloColuna(coluna: string) {
    return coluna.replace(/_/g, ' ');
  }

  function valorRelatorio(linha: RegistroGenerico, coluna: string) {
    if (coluna === 'validado') return linha.validado ? 'Validado' : 'Pendente';
    if (coluna === 'integrado') return linha.integrado ? 'Integrado' : 'Aberto';
    if (coluna === 'cancelado') return linha.cancelado ? 'Cancelado' : 'Ativo';
    if (coluna === 'data_hora') return formatarDataHora(linha[coluna]);
    if (coluna === 'data_vencimento') return formatarData(linha[coluna]);
    if (coluna === 'total' || coluna.startsWith('valor_') || coluna === 'desconto') return moeda(linha[coluna]);
    return String(linha[coluna] ?? '-');
  }

  function alterarOrdenacao(coluna: string) {
    setOrdenacao((atual) => ({
      coluna,
      direcao: atual.coluna === coluna && atual.direcao === 'desc' ? 'asc' : 'desc'
    }));
  }

  function textoRelatorio(valor: unknown) {
    return String(valor ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function imprimirSelecionados() {
    const despesas = linhasOrdenadas.filter((linha) => selecionados.includes(Number(linha.id)));
    if (!despesas.length) {
      setErro('Selecione ao menos uma despesa para imprimir.');
      return;
    }

    const empresaLogo = (document.querySelector('.empresaTopo img') as HTMLImageElement | null)?.src || '/brand/logo-s-novo.jpg';
    const grupos = despesas.reduce<Record<string, RegistroGenerico[]>>((acumulador, linha) => {
      const fornecedor = String(linha.fornecedor_nome ?? 'Fornecedor nao informado');
      acumulador[fornecedor] = acumulador[fornecedor] ?? [];
      acumulador[fornecedor].push(linha);
      return acumulador;
    }, {});
    const total = despesas.reduce((soma, linha) => soma + Number(linha.total ?? 0), 0);
    const bruto = despesas.reduce((soma, linha) => soma + Number(linha.valor_bruto ?? 0), 0);
    const desconto = despesas.reduce((soma, linha) => soma + Number(linha.desconto ?? 0), 0);
    const filtrosTexto = [
      filtros.placa ? `Placa: ${filtros.placa}` : '',
      filtros.numero_documento ? `Documento: ${filtros.numero_documento}` : '',
      filtros.fatura ? `Fatura: ${filtros.fatura}` : '',
      filtros.validado && filtros.validado !== 'TODOS' ? `Validado: ${filtros.validado}` : '',
      filtros.integrado && filtros.integrado !== 'TODOS' ? `Integrado: ${filtros.integrado}` : '',
      filtros.ativo && filtros.ativo !== 'TODOS' ? `Status: ${filtros.ativo === 'SIM' ? 'Ativos' : 'Cancelados'}` : '',
      filtros.data_inicial ? `Inicio: ${filtros.data_inicial}` : '',
      filtros.data_final ? `Fim: ${filtros.data_final}` : ''
    ].filter(Boolean).join(' | ') || 'Sem filtros adicionais';

    const linhasHtml = Object.entries(grupos).map(([fornecedor, itens]) => {
      const totalFornecedor = itens.reduce((soma, linha) => soma + Number(linha.total ?? 0), 0);
      const brutoFornecedor = itens.reduce((soma, linha) => soma + Number(linha.valor_bruto ?? 0), 0);
      const descontoFornecedor = itens.reduce((soma, linha) => soma + Number(linha.desconto ?? 0), 0);
      const exibirSubtotalPosto = Object.keys(grupos).length > 1;
      return `
        <section class="grupo">
          <h2>${textoRelatorio(fornecedor)} <small>${itens.length} documento(s) | ${moeda(totalFornecedor)}</small></h2>
          <table>
            <thead>
              <tr>
                ${colunasVisiveis.map((coluna) => `<th>${textoRelatorio(rotuloColuna(coluna))}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${itens.map((linha) => `
                <tr class="${linha.cancelado ? 'cancelado' : ''}">
                  ${colunasVisiveis.map((coluna) => `<td>${textoRelatorio(valorRelatorio(linha, coluna))}</td>`).join('')}
                </tr>
              `).join('')}
              ${exibirSubtotalPosto ? `
                <tr class="subtotal">
                  <td colspan="${Math.max(1, colunasVisiveis.length)}"><strong>Total do posto: ${moeda(totalFornecedor)} | Bruto: ${moeda(brutoFornecedor)} | Desconto: ${moeda(descontoFornecedor)}</strong></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </section>`;
    }).join('');

    const janela = window.open('', '_blank', 'width=1180,height=820');
    if (!janela) {
      setErro('O navegador bloqueou a janela de impressao.');
      return;
    }
    janela.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Relatorio de Validacao Frota</title>
          <style>
            body { font-family: Arial, sans-serif; color: #101828; margin: 32px; }
            header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0d3f8f; padding-bottom: 16px; margin-bottom: 20px; }
            .empresa { display: flex; align-items: center; gap: 16px; }
            .empresa img { width: 86px; max-height: 64px; object-fit: contain; }
            .acoes { display: flex; gap: 8px; }
            button { background: #0d3f8f; border: 0; border-radius: 7px; color: #fff; cursor: pointer; font-weight: 700; padding: 10px 14px; }
            h1 { margin: 0; font-size: 22px; }
            h2 { background: #eef5ff; border-left: 5px solid #1d6fd4; padding: 10px 12px; font-size: 15px; display: flex; justify-content: space-between; }
            h2 small { font-weight: 700; color: #0d3f8f; }
            .meta { color: #52627a; font-size: 12px; margin-top: 6px; }
            .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .resumo div { border: 1px solid #d7e0ec; border-radius: 8px; padding: 10px; }
            .resumo span { display: block; color: #667085; font-size: 11px; text-transform: uppercase; font-weight: 700; }
            .resumo strong { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; }
            th { background: #0b1f3b; color: #fff; text-align: left; padding: 8px; }
            td { border-bottom: 1px solid #e6edf5; padding: 7px 8px; }
            tr.cancelado td { color: #b42318; background: #fff1f0; }
            tr.subtotal td { background: #f4f8ff; border-top: 2px solid #b9cbe7; color: #0b1f3b; }
            footer { margin-top: 22px; color: #667085; font-size: 11px; text-align: right; }
            @media print { body { margin: 18mm; } button { display: none; } .grupo { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <header>
            <div class="empresa">
              <img src="${empresaLogo}" />
              <div>
                <h1>Relatorio de Validacao de Despesas - Frota</h1>
                <div class="meta">Filtros: ${textoRelatorio(filtrosTexto)}</div>
                <div class="meta">Gerado em ${formatarDataHora(new Date().toISOString())}</div>
              </div>
            </div>
            <div class="acoes"><button type="button" onclick="window.print()">Imprimir</button></div>
          </header>
          <section class="resumo">
            <div><span>Documentos</span><strong>${despesas.length}</strong></div>
            <div><span>Valor bruto</span><strong>${moeda(bruto)}</strong></div>
            <div><span>Desconto</span><strong>${moeda(desconto)}</strong></div>
            <div><span>Total</span><strong>${moeda(total)}</strong></div>
          </section>
          ${linhasHtml}
          <footer>CONTROL S CONSULTORIA - relatorio executivo de conferencia</footer>
        </body>
      </html>
    `);
    janela.document.close();
  }

  const totalSelecionado = linhas
    .filter((linha) => selecionados.includes(Number(linha.id)))
    .reduce((total, linha) => total + Number(linha.total ?? 0), 0);

  return (
    <section className="painelTabela frotaPainel frotaValidacaoTela">
      <header className="frotaHero frotaHeroValidacao">
        <div>
          <span>Modulo Frota</span>
          <h2>Validacao de Despesas</h2>
          <p>Analise despesas, selecione em lote, revise excecoes e valide apenas o que ainda nao foi integrado.</p>
        </div>
        <div className="frotaHeroAcoes">
          <button className="ghost" type="button" onClick={() => setFiltrosAbertos((atual) => !atual)}><Filter size={15} />{filtrosAbertos ? 'Ocultar filtros' : 'Mostrar filtros'}</button>
          <button className="ghost" disabled={!selecionados.length} onClick={imprimirSelecionados}><Printer size={15} />Imprimir</button>
          <button className="ghost" onClick={() => exportarCsv('frota-despesas', linhas, colunas)}>CSV</button>
          <button className="primary" onClick={() => exportarXlsx('frota-despesas', linhas, colunas)}><FileSpreadsheet size={15} />Excel</button>
        </div>
      </header>
      {erro && <div className="alerta">{erro}</div>}
      <div className="metrics frotaTotalizadores frotaTotalizadoresCompactos">
        <article><span>Registros</span><strong>{totalizadores.quantidade_registros ?? 0}</strong></article>
        <article><span>Validados</span><strong>{totalizadores.quantidade_validada ?? 0}</strong></article>
        <article><span>Nao validados</span><strong>{totalizadores.quantidade_nao_validada ?? 0}</strong></article>
        <article><span>Integrados</span><strong>{totalizadores.quantidade_integrada ?? 0}</strong></article>
        <article><span>Total filtrado</span><strong>{moeda(totalizadores.valor_total_filtrado)}</strong></article>
        <article><span>Total validado</span><strong>{moeda(totalizadores.valor_total_validado)}</strong></article>
      </div>
      <div className={filtrosAbertos ? 'frotaMesa' : 'frotaMesa filtrosFechados'}>
        {filtrosAbertos && <aside className="frotaFiltrosPainel">
          <strong><Filter size={16} />Filtros</strong>
          <label>Placa<input placeholder="Placa" value={String(filtros.placa ?? '')} onChange={(e) => setFiltros({ ...filtros, placa: e.target.value })} /></label>
          <label>Documento<input placeholder="Documento" value={String(filtros.numero_documento ?? '')} onChange={(e) => setFiltros({ ...filtros, numero_documento: e.target.value })} /></label>
          <label>Fatura<input placeholder="Fatura" value={String(filtros.fatura ?? '')} onChange={(e) => setFiltros({ ...filtros, fatura: e.target.value })} /></label>
          <label>Fornecedor<select value={String(filtros.fornecedor_id ?? '')} onChange={(e) => setFiltros({ ...filtros, fornecedor_id: e.target.value })}><option value="">Todos fornecedores</option>{fornecedores.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome_fantasia ?? item.nome)}</option>)}</select></label>
          <label>Departamento<select value={String(filtros.departamentos_ids ?? '')} onChange={(e) => setFiltros({ ...filtros, departamentos_ids: e.target.value })}><option value="">Todos departamentos</option>{departamentos.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.descricao)}</option>)}</select></label>
          <label>Motorista<select value={String(filtros.motorista_id ?? '')} onChange={(e) => setFiltros({ ...filtros, motorista_id: e.target.value })}><option value="">Todos motoristas</option>{motoristas.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome)}</option>)}</select></label>
          <label>Tipo de despesa<select value={String(filtros.tipo_despesa_id ?? '')} onChange={(e) => setFiltros({ ...filtros, tipo_despesa_id: e.target.value })}><option value="">Todos tipos</option>{tipos.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.descricao)}</option>)}</select></label>
          <label>Periodo inicial<input type="date" value={String(filtros.data_inicial ?? '')} onChange={(e) => setFiltros({ ...filtros, data_inicial: e.target.value })} /></label>
          <label>Periodo final<input type="date" value={String(filtros.data_final ?? '')} onChange={(e) => setFiltros({ ...filtros, data_final: e.target.value })} /></label>
          <label>Validado<select value={String(filtros.validado ?? 'TODOS')} onChange={(e) => setFiltros({ ...filtros, validado: e.target.value })}><option value="TODOS">Todos</option><option value="SIM">Sim</option><option value="NAO">Nao</option></select></label>
          <label>Integrado<select value={String(filtros.integrado ?? 'TODOS')} onChange={(e) => setFiltros({ ...filtros, integrado: e.target.value })}><option value="TODOS">Todos</option><option value="SIM">Sim</option><option value="NAO">Nao</option></select></label>
          <label>Status<select value={String(filtros.ativo ?? 'SIM')} onChange={(e) => setFiltros({ ...filtros, ativo: e.target.value })}><option value="SIM">Somente ativos</option><option value="NAO">Somente cancelados</option><option value="TODOS">Todos</option></select></label>
          <button className="primary" onClick={carregar}>Aplicar filtros</button>
        </aside>}
        <section className="frotaGridArea">
          <div className="frotaBarraLote">
            <div>
              <strong>{selecionados.length} selecionado(s)</strong>
              <small>{moeda(totalSelecionado)} em despesas selecionadas</small>
            </div>
            <button className="primary" disabled={!selecionados.length} onClick={() => validar(true)}><CheckSquare size={15} />Validar</button>
            <button className="ghost" disabled={!selecionados.length} onClick={() => validar(false)}>Remover validacao</button>
            <button className="ghost perigo" disabled={!selecionados.length} onClick={() => setCancelamentoAberto(true)}><Ban size={15} />Cancelar</button>
          </div>
          <details className="frotaColunas">
            <summary>Colunas visiveis</summary>
            <div>{colunas.map((coluna) => <label key={coluna}><input type="checkbox" checked={colunasVisiveis.includes(coluna)} onChange={() => alternarColuna(coluna)} />{coluna.replace(/_/g, ' ')}</label>)}</div>
          </details>
          <div className="tabelaWrap frotaGridWrap frotaGridPremium">
            <table>
              <thead><tr><th><input type="checkbox" checked={linhasOrdenadas.length > 0 && selecionados.length === linhasOrdenadas.length} onChange={(e) => setSelecionados(e.target.checked ? linhasOrdenadas.map((l) => Number(l.id)) : [])} /></th>{colunasVisiveis.map((coluna) => <th key={coluna}><button className="botaoOrdenacaoTabela" type="button" onClick={() => alterarOrdenacao(coluna)}>{rotuloColuna(coluna)}{ordenacao.coluna === coluna ? ordenacao.direcao === 'desc' ? ' ↓' : ' ↑' : ''}</button></th>)}<th>Acoes</th></tr></thead>
              <tbody>
                {linhasOrdenadas.map((linha) => {
                  const id = Number(linha.id);
                  const marcado = selecionados.includes(id);
                  return (
                    <tr key={id} className={`${detalhe?.id === linha.id ? 'linhaAtiva' : ''} ${linha.cancelado ? 'linhaCancelada' : ''}`}>
                      <td><input type="checkbox" checked={marcado} onChange={(e) => setSelecionados(e.target.checked ? [...selecionados, id] : selecionados.filter((item) => item !== id))} /></td>
                      {colunasVisiveis.map((coluna) => <td key={coluna}>{formatarCelula(linha, coluna)}</td>)}
                      <td className="acoesTabela">
                        <button className="ghost" onClick={() => { setDetalhe(linha); abrirHistorico(id); }}><PanelRightOpen size={14} />Detalhe</button>
                      </td>
                    </tr>
                  );
                })}
                {linhasOrdenadas.length === 0 && <tr><td colSpan={colunasVisiveis.length + 2}>Nenhuma despesa encontrada para os filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <FilaVinculoVeiculosModal
        titulo="Completar veiculos para validar"
        subtitulo="Os veiculos existem no cadastro, mas precisam de motorista e departamento. Ao salvar, o cadastro do veiculo sera atualizado e a validacao continuara."
        veiculos={pendenciasVeiculos}
        departamentos={departamentos}
        motoristas={motoristas}
        aoAlterar={setPendenciasVeiculos}
        aoSalvar={salvarVinculosValidacaoPendentes}
        aoFechar={() => setPendenciasVeiculos([])}
      />
      <ModalAvisoFrota
        titulo="Nao foi possivel validar"
        mensagem={erroValidacaoModal}
        aoFechar={() => setErroValidacaoModal('')}
      />
      {avisoIntegradosModal && (
        <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Registros integrados ignorados">
          <button className="frotaModalFundo" type="button" aria-label="Fechar aviso" onClick={() => setAvisoIntegradosModal(null)} />
          <section className="frotaModalDetalhe frotaModalCompacto">
            <header>
              <div>
                <span>Registros integrados</span>
                <h3>Itens retirados da acao</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setAvisoIntegradosModal(null)}>Fechar</button>
            </header>
            <p className="textoApoio">
              {avisoIntegradosModal.ignorados.length} documento(s) integrado(s) foram desmarcados para {avisoIntegradosModal.acao}. 
              {avisoIntegradosModal.processados > 0 ? ` ${avisoIntegradosModal.processados} documento(s) aberto(s) continuaram no processamento.` : ' Nenhum documento aberto ficou disponivel para processar.'}
            </p>
            <div className="frotaLogLista frotaLogListaMelhorada">
              {avisoIntegradosModal.ignorados.map((linha) => (
                <p key={String(linha.id)}>
                  Documento {String(linha.numero_documento ?? linha.id)} - {String(linha.placa ?? 'sem placa')} - {moeda(linha.total)}
                </p>
              ))}
            </div>
            <button className="primary" type="button" onClick={() => setAvisoIntegradosModal(null)}>Entendi</button>
          </section>
        </div>
      )}
      {cancelamentoAberto && (
        <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Cancelar despesas">
          <button className="frotaModalFundo" type="button" aria-label="Fechar cancelamento" onClick={() => setCancelamentoAberto(false)} />
          <section className="frotaModalDetalhe frotaModalCompacto">
            <header>
              <div>
                <span>Cancelamento manual</span>
                <h3>Cancelar {selecionados.length} documento(s)</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setCancelamentoAberto(false)}>Fechar</button>
            </header>
            <label>Motivo<select value={motivoCancelamentoId} onChange={(e) => setMotivoCancelamentoId(e.target.value)}><option value="">Selecione</option>{motivosCancelamento.filter((motivo) => motivo.ativo !== false).map((motivo) => <option key={String(motivo.id)} value={String(motivo.id)}>{String(motivo.descricao)}</option>)}</select></label>
            <label>Observacao<textarea value={observacaoCancelamento} onChange={(e) => setObservacaoCancelamento(e.target.value)} placeholder="Complemento opcional para auditoria" /></label>
            <button className="primary perigo" onClick={cancelarSelecionados}><Ban size={15} />Confirmar cancelamento</button>
          </section>
        </div>
      )}
      {detalhe && (
        <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Detalhe da despesa">
          <button className="frotaModalFundo" type="button" aria-label="Fechar detalhe" onClick={() => { setDetalhe(null); setHistorico([]); }} />
          <section className="frotaModalDetalhe">
            <header>
              <div>
                <span>Detalhe da despesa</span>
                <h3>{String(detalhe.placa)} - {moeda(detalhe.total)}</h3>
              </div>
              <button className="ghost" type="button" onClick={() => { setDetalhe(null); setHistorico([]); }}>Fechar</button>
            </header>
            <div className="frotaDetalheGrid">
              {['numero_documento', 'fatura', 'fornecedor_nome', 'departamento_descricao', 'motorista_nome', 'tipo_despesa_descricao', 'descricao_despesa', 'hodometro', 'quantidade', 'valor_unitario', 'valor_unitario_liquido', 'valor_bruto', 'desconto', 'total', 'conf_custo_decis', 'codigo_forma_pagamento_decis', 'descricao_forma_pagamento', 'dia_vencimento', 'data_vencimento', 'validado', 'integrado', 'cancelado', 'motivo_cancelamento_descricao', 'motivo_cancelamento_texto', 'origem_lancamento'].map((campo) => <p key={campo}><span>{campo.replace(/_/g, ' ')}</span><b>{formatarCelula(detalhe, campo)}</b></p>)}
            </div>
            <div className="historicoPainel frotaHistoricoMini">
              <strong><History size={16} />Historico</strong>
              {historico.length === 0 && <p>Nenhum historico encontrado.</p>}
              {historico.map((item) => <p key={String(item.id)}><strong>{String(item.operacao)}</strong><br />{formatarDataHora(item.criado_em)} - {String(item.usuario_nome ?? 'Sistema')}</p>)}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export function LogoKm() {
  return <span className="kmLogoAsset" aria-hidden="true"><img src={LOGO_KM} alt="" /></span>;
}

function turnoAtual() {
  const hora = new Date().getHours();
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
}

function ApontamentoKmFormulario({
  data,
  registro,
  contexto,
  pedidos,
  motoristas,
  veiculos,
  departamentos,
  motivosSemPedido = [],
  modoMobile = false,
  aoSalvar,
  aoFechar
}: {
  data: string;
  registro?: RegistroGenerico | null;
  contexto: RegistroGenerico;
  pedidos: RegistroGenerico[];
  motoristas: RegistroGenerico[];
  veiculos: RegistroGenerico[];
  departamentos: RegistroGenerico[];
  motivosSemPedido?: RegistroGenerico[];
  modoMobile?: boolean;
  aoSalvar: () => Promise<void>;
  aoFechar: () => void;
}) {
  const motoristaPadrao = contexto.motorista ?? {};
  const [formulario, setFormulario] = useState<RegistroGenerico>(() => ({
    data_apontamento: data,
    motorista_id: motoristaPadrao.id ?? '',
    veiculo_id: motoristaPadrao.veiculo_id ?? '',
    departamento_id: motoristaPadrao.departamento_id ?? '',
    ajudante_motorista_id: motoristaPadrao.ajudante_padrao_motorista_id ?? '',
    ajudante_motorista2_id: '',
    ajudante: motoristaPadrao.ajudante_padrao_nome ?? motoristaPadrao.ajudante_padrao ?? '',
    sem_pedido: false,
    motivo_sem_pedido_id: '',
    km_inicial: motoristaPadrao.odometro_atual ?? 0,
    km_final: motoristaPadrao.odometro_atual ?? 0,
    ...registro
  }));
  const [erro, setErro] = useState('');
  const [campoKmAberto, setCampoKmAberto] = useState<'km_inicial' | 'km_final' | null>(null);
  const [valorKmTemporario, setValorKmTemporario] = useState('0');
  const [modalErro, setModalErro] = useState('');
  const pedidoSelecionado = pedidos.find((pedido) => Number(pedido.id) === Number(formulario.pedido_venda_id));
  const veiculoSelecionado = veiculos.find((veiculo) => Number(veiculo.id) === Number(formulario.veiculo_id));
  const motoristaSelecionado = motoristas.find((motorista) => Number(motorista.id) === Number(formulario.motorista_id));
  const ajudantes = motoristas.filter((motorista) => Boolean(motorista.ajudante) && Number(motorista.id) !== Number(formulario.motorista_id));
  const kmTotal = Math.max(Math.trunc(Number(formulario.km_final ?? 0)) - Math.trunc(Number(formulario.km_inicial ?? 0)), 0);
  const bloqueado = Boolean(registro?.validado || registro?.integrado);
  const dataFutura = data > dataIsoLocal(new Date());

  function preencherAgora(campo: string) {
    const agora = new Date();
    const valor = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  function preencherTurnoPadrao(prefixo: string) {
    const padroes: Record<string, { inicio: string; fim: string }> = {
      manha: { inicio: '07:52', fim: '12:00' },
      tarde: { inicio: '13:20', fim: '18:00' },
      noite: { inicio: '', fim: '' }
    };
    const padrao = padroes[prefixo];
    if (!padrao) return;
    setFormulario((atual) => ({ ...atual, [`${prefixo}_inicio`]: padrao.inicio, [`${prefixo}_fim`]: padrao.fim }));
  }

  function abrirPickerKm(campo: 'km_inicial' | 'km_final') {
    setCampoKmAberto(campo);
    setValorKmTemporario(String(Math.trunc(Number(formulario[campo] ?? 0))));
  }

  function confirmarKm() {
    if (!campoKmAberto) return;
    setFormulario((atual) => ({ ...atual, [campoKmAberto]: Math.max(0, Math.trunc(Number(valorKmTemporario || 0))) }));
    setCampoKmAberto(null);
  }

  function turnoIncompleto(prefixo: string) {
    return Boolean(formulario[`${prefixo}_inicio`]) !== Boolean(formulario[`${prefixo}_fim`]);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    if (bloqueado) {
      setErro('Apontamento validado ou integrado nao pode ser alterado.');
      return;
    }
    if (dataFutura) {
      setErro('Nao e permitido selecionar data futura.');
      return;
    }
    if ((!formulario.sem_pedido && !formulario.pedido_venda_id) || !formulario.motorista_id || !formulario.veiculo_id) {
      setErro('Informe pedido, motorista e veiculo.');
      return;
    }
    if (formulario.sem_pedido && !formulario.motivo_sem_pedido_id) {
      setErro('Informe o motivo para lancamento sem pedido.');
      return;
    }
    if (veiculoSelecionado && Number(formulario.km_final ?? 0) < Number(veiculoSelecionado.odometro_atual ?? 0)) {
      const continuar = window.confirm(`KM final menor que o ultimo KM do veiculo (${numeroPtBr(veiculoSelecionado.odometro_atual)}). Deseja continuar mesmo assim?`);
      if (!continuar) return;
    }
    const kmInicial = Math.trunc(Number(formulario.km_inicial ?? 0));
    const kmFinal = Math.trunc(Number(formulario.km_final ?? 0));
    if (veiculoSelecionado && kmInicial - Number(veiculoSelecionado.odometro_atual ?? 0) > 999) {
      setErro(`KM inicial nao pode ficar mais de 999 km acima do ultimo KM do veiculo (${numeroPtBr(veiculoSelecionado.odometro_atual, 0)}).`);
      return;
    }
    if (kmFinal - kmInicial > 9999) {
      setErro('KM final nao pode ultrapassar o KM inicial em mais de 9999 km.');
      return;
    }
    if (kmFinal < kmInicial) {
      setErro('KM final nao pode ser menor que o KM inicial.');
      return;
    }
    let atualizarAjudantePadrao = false;
    if (formulario.ajudante_motorista_id && motoristaSelecionado?.ajudante_padrao_motorista_id && Number(formulario.ajudante_motorista_id) !== Number(motoristaSelecionado.ajudante_padrao_motorista_id)) {
      atualizarAjudantePadrao = window.confirm('Este ajudante e diferente do padrao do motorista. Deseja salvar este ajudante como novo padrao?');
    }
    try {
      await salvarApontamentoKmFrota({ ...formulario, km_inicial: kmInicial, km_final: kmFinal, atualizar_ajudante_padrao: atualizarAjudantePadrao });
      await aoSalvar();
      aoFechar();
    } catch (error) {
      setModalErro(error instanceof Error ? error.message : 'Falha ao salvar apontamento.');
    }
  }

  const turnos = [
    ['manha', 'MANHA'],
    ['tarde', 'TARDE'],
    ['noite', 'NOITE']
  ];

  return (
    <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Apontamento de KM">
      <button className="frotaModalFundo" type="button" aria-label="Fechar apontamento" onClick={aoFechar} />
      <form className="frotaModalDetalhe kmFormularioMobile" onSubmit={salvar}>
        <header>
          <div>
            <span>Apontamento KM</span>
            <h3>{dataBr(data)}</h3>
          </div>
          <button className="ghost" type="button" onClick={aoFechar}>Fechar</button>
        </header>
        {erro && <div className="alerta">{erro}</div>}
        {dataFutura && <div className="alerta">Data futura bloqueada para lancamento.</div>}
        {bloqueado && <div className="alerta">Este apontamento esta validado ou integrado. Solicite remocao da validacao para alterar.</div>}
        <div className="kmGridFormulario">
          <CampoBusca
            rotulo="Motorista"
            valorId={formulario.motorista_id}
            itens={motoristas}
            camposBusca={['nome', 'codigo_decis']}
            desabilitado={bloqueado || (modoMobile && Boolean(contexto.motorista?.id))}
            aoSelecionar={(motorista) => {
              if (!motorista) {
                setFormulario({ ...formulario, motorista_id: '', departamento_id: '', ajudante_motorista_id: '', ajudante: '' });
                return;
              }
              setFormulario({
                ...formulario,
                motorista_id: motorista.id,
                departamento_id: motorista.departamento_id ?? formulario.departamento_id,
                ajudante_motorista_id: motorista.ajudante_padrao_motorista_id ?? '',
                ajudante: motorista.ajudante_padrao_nome ?? motorista.ajudante_padrao ?? ''
              });
            }}
          />
          <CampoBusca
            rotulo="Veiculo"
            valorId={formulario.veiculo_id}
            itens={veiculos}
            camposBusca={['placa', 'modelo']}
            desabilitado={bloqueado}
            aoSelecionar={(veiculo) => setFormulario({
              ...formulario,
              veiculo_id: veiculo?.id ?? '',
              km_inicial: registro?.id ? formulario.km_inicial : Math.trunc(Number(veiculo?.odometro_atual ?? formulario.km_inicial ?? 0)),
              km_final: registro?.id ? formulario.km_final : Math.trunc(Number(veiculo?.odometro_atual ?? formulario.km_final ?? 0))
            })}
          />
          {false && (
            <label>Motorista
            <select disabled={bloqueado || (modoMobile && Boolean(contexto.motorista?.id))} value={String(formulario.motorista_id ?? '')} onChange={(e) => {
              const motorista = motoristas.find((item) => Number(item.id) === Number(e.target.value));
              setFormulario({
                ...formulario,
                motorista_id: e.target.value ? Number(e.target.value) : '',
                departamento_id: motorista?.departamento_id ?? formulario.departamento_id,
                ajudante_motorista_id: motorista?.ajudante_padrao_motorista_id ?? '',
                ajudante: motorista?.ajudante_padrao_nome ?? motorista?.ajudante_padrao ?? ''
              });
            }}>
              <option value="">Selecione</option>
              {motoristas.map((motorista) => <option key={String(motorista.id)} value={String(motorista.id)}>{String(motorista.nome)}</option>)}
            </select>
          </label>
          )}
          {false && <label>Veiculo
            <select disabled={bloqueado} value={String(formulario.veiculo_id ?? '')} onChange={(e) => setFormulario({ ...formulario, veiculo_id: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">Selecione</option>
              {veiculos.map((veiculo) => <option key={String(veiculo.id)} value={String(veiculo.id)}>{String(veiculo.placa)} - {String(veiculo.modelo)}</option>)}
            </select>
          </label>}
          {!modoMobile && (
            <label>Departamento
              <select disabled={bloqueado} value={String(formulario.departamento_id ?? '')} onChange={(e) => setFormulario({ ...formulario, departamento_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">Selecione</option>
                {departamentos.map((departamento) => <option key={String(departamento.id)} value={String(departamento.id)}>{String(departamento.descricao)}</option>)}
              </select>
            </label>
          )}
          <CampoBusca
            rotulo="Ajudante"
            valorId={formulario.ajudante_motorista_id}
            itens={ajudantes}
            camposBusca={['nome', 'codigo_decis']}
            placeholder="Sem ajudante"
            desabilitado={bloqueado}
            aoSelecionar={(ajudante) => setFormulario({ ...formulario, ajudante_motorista_id: ajudante?.id ?? '', ajudante: ajudante?.nome ?? '' })}
          />
          <CampoBusca
            rotulo="Ajudante 2"
            valorId={formulario.ajudante_motorista2_id}
            itens={ajudantes.filter((item) => Number(item.id) !== Number(formulario.ajudante_motorista_id))}
            camposBusca={['nome', 'codigo_decis']}
            placeholder="Sem ajudante 2"
            desabilitado={bloqueado}
            aoSelecionar={(ajudante) => setFormulario({ ...formulario, ajudante_motorista2_id: ajudante?.id ?? '' })}
          />
          <label>KM inicial<input disabled={bloqueado} inputMode="numeric" readOnly value={String(Math.trunc(Number(formulario.km_inicial ?? 0)))} onClick={() => abrirPickerKm('km_inicial')} /></label>
          <label>KM final<input disabled={bloqueado} inputMode="numeric" readOnly value={String(Math.trunc(Number(formulario.km_final ?? 0)))} onClick={() => abrirPickerKm('km_final')} /></label>
        </div>
        <div className="kmTotalDia"><span>Total do apontamento</span><strong>{numeroPtBr(kmTotal, 0)} km</strong></div>
        <label className="kmCheckboxLinha"><input disabled={bloqueado} type="checkbox" checked={Boolean(formulario.sem_pedido)} onChange={(e) => setFormulario({ ...formulario, sem_pedido: e.target.checked, pedido_venda_id: e.target.checked ? '' : formulario.pedido_venda_id })} />Sem Pedido</label>
        {formulario.sem_pedido ? (
          <label>Motivo sem pedido
            <select disabled={bloqueado} value={String(formulario.motivo_sem_pedido_id ?? '')} onChange={(e) => setFormulario({ ...formulario, motivo_sem_pedido_id: e.target.value ? Number(e.target.value) : '' })}>
              <option value="">Selecione</option>
              {motivosSemPedido.filter((motivo) => motivo.ativo !== false).map((motivo) => <option key={String(motivo.id)} value={String(motivo.id)}>{String(motivo.descricao)}</option>)}
            </select>
          </label>
        ) : (
          <CampoBusca
            rotulo="Pedido"
            valorId={formulario.pedido_venda_id}
            itens={pedidos.filter((pedido) => pedido.ativo !== false)}
            camposBusca={['pedido', 'cliente_nome', 'cliente']}
            placeholder="Digite 3 letras do pedido ou cliente"
            minimo={3}
            desabilitado={bloqueado}
            aoSelecionar={(pedido) => setFormulario({ ...formulario, pedido_venda_id: pedido?.id ?? '' })}
          />
        )}
        {pedidoSelecionado && !formulario.sem_pedido && (
          <div className="kmResumoPedido">
            <p><span>Pedido</span><strong>{String(pedidoSelecionado.pedido)}</strong></p>
            <p><span>Cliente</span><strong>{String(pedidoSelecionado.cliente_nome ?? pedidoSelecionado.cliente)} {pedidoSelecionado.cliente_codigo_decis ? `(${pedidoSelecionado.cliente_codigo_decis})` : ''}</strong></p>
            <p><span>Coordenador</span><strong>{String(pedidoSelecionado.coordenador_nome ?? pedidoSelecionado.coordenador ?? '-')} {pedidoSelecionado.codigo_coordenador_decis ? `(${pedidoSelecionado.codigo_coordenador_decis})` : ''}</strong></p>
            <p><span>Valor</span><strong>{moeda(pedidoSelecionado.valor)}</strong></p>
            <p><span>Data</span><strong>{dataBr(pedidoSelecionado.data_pedido)}</strong></p>
          </div>
        )}
        <div className="kmTurnos">
          {turnos.map(([prefixo, titulo]) => (
            <section key={prefixo} className={`${turnoAtual() === prefixo ? 'turnoAtual' : ''} ${turnoIncompleto(prefixo) ? 'turnoIncompleto' : ''}`}>
              <strong>{titulo}</strong>
              {prefixo !== 'noite' && <button className="ghost kmBotaoPadraoTurno" disabled={bloqueado} type="button" onClick={() => preencherTurnoPadrao(prefixo)}>{prefixo === 'manha' ? '07:52 - 12:00' : '13:20 - 18:00'}</button>}
              <div>
                <label>Inicio<input disabled={bloqueado} type="time" value={String(formulario[`${prefixo}_inicio`] ?? '')} onChange={(e) => setFormulario({ ...formulario, [`${prefixo}_inicio`]: e.target.value })} /></label>
                <button className="ghost" disabled={bloqueado} type="button" onClick={() => preencherAgora(`${prefixo}_inicio`)}><Clock size={14} />Agora</button>
              </div>
              <div>
                <label>Fim<input disabled={bloqueado} type="time" value={String(formulario[`${prefixo}_fim`] ?? '')} onChange={(e) => setFormulario({ ...formulario, [`${prefixo}_fim`]: e.target.value })} /></label>
                <button className="ghost" disabled={bloqueado} type="button" onClick={() => preencherAgora(`${prefixo}_fim`)}><Clock size={14} />Agora</button>
              </div>
            </section>
          ))}
        </div>
        <label>Observacao<textarea disabled={bloqueado} value={String(formulario.observacao ?? '')} onChange={(e) => setFormulario({ ...formulario, observacao: e.target.value })} /></label>
        <button className="primary" disabled={bloqueado}>Salvar apontamento</button>
      </form>
      {campoKmAberto && (
        <div className="frotaModalOverlay kmPickerOverlay" role="dialog" aria-modal="true" aria-label="Selecionar KM">
          <button className="frotaModalFundo" type="button" aria-label="Fechar KM" onClick={() => setCampoKmAberto(null)} />
          <section className="frotaModalDetalhe kmPickerModal">
            <header><div><span>Selecionar KM</span><h3>{campoKmAberto === 'km_inicial' ? 'KM inicial' : 'KM final'}</h3></div><button className="ghost" type="button" onClick={() => setCampoKmAberto(null)}>Fechar</button></header>
            <input autoFocus inputMode="numeric" pattern="[0-9]*" value={valorKmTemporario} onChange={(e) => setValorKmTemporario(e.target.value.replace(/\D/g, ''))} />
            <div className="kmPickerAcoes">
              {[-1000, -100, -10, -1, 1, 10, 100, 1000].map((passo) => <button key={passo} type="button" className="ghost" onClick={() => setValorKmTemporario(String(Math.max(0, Math.trunc(Number(valorKmTemporario || 0)) + passo)))}>{passo > 0 ? `+${passo}` : passo}</button>)}
            </div>
            <div className="kmPickerAtalhos">
              <button className="ghost" type="button" onClick={() => setValorKmTemporario(String(Math.trunc(Number(formulario.km_inicial ?? 0))))}>Igual inicial</button>
              <button className="ghost" type="button" onClick={() => setValorKmTemporario(String(Math.trunc(Number(formulario.km_final ?? 0))))}>Igual final</button>
            </div>
            <button className="primary" type="button" onClick={confirmarKm}>Confirmar KM</button>
          </section>
        </div>
      )}
      {modalErro && (
        <div className="frotaModalOverlay kmErroOverlay" role="dialog" aria-modal="true" aria-label="Erro no apontamento">
          <button className="frotaModalFundo" type="button" aria-label="Fechar erro" onClick={() => setModalErro('')} />
          <section className="frotaModalDetalhe frotaModalCompacto">
            <header><div><span>Apontamento KM</span><h3>Atencao</h3></div><button className="ghost" type="button" onClick={() => setModalErro('')}>Fechar</button></header>
            <div className="alerta">{modalErro}</div>
            <button className="primary" type="button" onClick={() => setModalErro('')}>Entendi</button>
          </section>
        </div>
      )}
    </div>
  );
}

export function ApontamentoKmFrota({ modoMobile = false }: { modoMobile?: boolean } = {}) {
  const [contexto, setContexto] = useState<RegistroGenerico>({});
  const [calendario, setCalendario] = useState<RegistroGenerico>({});
  const [pedidos, setPedidos] = useState<RegistroGenerico[]>([]);
  const [motoristas, setMotoristas] = useState<RegistroGenerico[]>([]);
  const [veiculos, setVeiculos] = useState<RegistroGenerico[]>([]);
  const [departamentos, setDepartamentos] = useState<RegistroGenerico[]>([]);
  const [motivosSemPedido, setMotivosSemPedido] = useState<RegistroGenerico[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [registroEditar, setRegistroEditar] = useState<RegistroGenerico | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [filtros, setFiltros] = useState<RegistroGenerico>({});
  const [carregando, setCarregando] = useState(false);
  const [dataReferencia, setDataReferencia] = useState(dataIsoLocal(new Date()));
  const [erroAcaoDia, setErroAcaoDia] = useState('');
  const [mensagemAcaoDia, setMensagemAcaoDia] = useState('');

  async function carregar(filtrosForcados: RegistroGenerico = {}) {
    setCarregando(true);
    try {
      const ctx = await obterContextoKmFrota();
      setContexto(ctx);
      const periodo = ctx.periodo ?? {};
      const filtrosAtuais = { ...filtros, ...filtrosForcados };
      const filtrosComPeriodo = {
        data_inicial: filtrosAtuais.data_inicial || periodo.data_inicial,
        data_final: filtrosAtuais.data_final || periodo.data_final,
        motorista_id: filtrosAtuais.motorista_id,
        veiculo_id: filtrosAtuais.veiculo_id,
        departamento_id: filtrosAtuais.departamento_id,
        somente_coordenacao: filtrosAtuais.somente_coordenacao
      };
      const [cal, ped, mot, vei, dep, msp] = await Promise.all([
        obterCalendarioKmFrota(filtrosComPeriodo),
        listarPedidosVendaFrota(),
        listarMotoristasFrota(),
        listarVeiculosFrota(),
        listarDepartamentosFrota(),
        listarMotivosSemPedidoFrota()
      ]);
      setCalendario(cal);
      setPedidos(ped);
      setMotoristas(mot);
      setVeiculos(vei);
      setDepartamentos(dep);
      setMotivosSemPedido(msp);
      setFiltros((atual) => ({ ...atual, ...filtrosComPeriodo }));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar().catch(() => undefined);
  }, []);

  async function selecionarDataReferencia(valor: string) {
    setDataReferencia(valor);
    const cfg = contexto.configuracoes ?? {};
    const periodoReferencia = periodoKmPorReferencia(valor, Number(cfg.dia_inicio_periodo_km ?? 26), Number(cfg.dia_fim_periodo_km ?? 25));
    setFiltros((atual) => ({ ...atual, ...periodoReferencia }));
    setDataSelecionada('');
    await carregar(periodoReferencia);
  }

  const apontamentosPorDia = new Map<string, RegistroGenerico[]>();
  (calendario.calendario ?? []).forEach((item: RegistroGenerico) => apontamentosPorDia.set(String(item.data), item.apontamentos ?? []));
  const periodo = contexto.periodo ?? {};
  const dias = periodo.data_inicial && periodo.data_final ? diasEntre(String(filtros.data_inicial || periodo.data_inicial), String(filtros.data_final || periodo.data_final)) : [];
  const hoje = dataIsoLocal(new Date());
  const apontamentosDia = dataSelecionada ? (apontamentosPorDia.get(dataSelecionada) ?? []) : [];

  async function excluirApontamentoDia(item: RegistroGenerico) {
    setErroAcaoDia('');
    setMensagemAcaoDia('');
    if (item.validado || item.integrado) {
      setErroAcaoDia('Este apontamento ja foi validado ou integrado e nao pode ser excluido.');
      return;
    }
    if (!window.confirm('Confirma excluir este apontamento de KM?')) {
      return;
    }
    try {
      await excluirApontamentoKmFrota(Number(item.id));
      setMensagemAcaoDia('Apontamento excluido.');
      await carregar({ data_inicial: filtros.data_inicial || periodo.data_inicial, data_final: filtros.data_final || periodo.data_final });
      setRegistroEditar(null);
    } catch (error) {
      setErroAcaoDia(error instanceof Error ? error.message : 'Falha ao excluir apontamento.');
    }
  }

  return (
    <section className={`painelTabela frotaPainel kmTela ${modoMobile ? 'kmTelaMobileApp' : ''}`}>
      {!modoMobile && (
        <header className="kmTopoMobile">
          <LogoKm />
          <div>
            <span>Modulo Frota</span>
            <h2>Apontamento de KM</h2>
            <p>Periodo {dataBr(filtros.data_inicial || periodo.data_inicial)} a {dataBr(filtros.data_final || periodo.data_final)}</p>
          </div>
          <div className="kmTopoWebAcoes">
            <label>Data referencia<input type="date" value={dataReferencia} onChange={(e) => selecionarDataReferencia(e.target.value)} /></label>
            <BotaoAtualizar carregando={carregando} aoAtualizar={carregar} />
          </div>
        </header>
      )}
      {modoMobile && (
        <div className="kmMobilePeriodo">
          <div>
            <span>Periodo Atual</span>
            <strong>{dataBr(filtros.data_inicial || periodo.data_inicial)} a {dataBr(filtros.data_final || periodo.data_final)}</strong>
          </div>
          <label>Data referencia<input type="date" value={dataReferencia} onChange={(e) => selecionarDataReferencia(e.target.value)} /></label>
          <BotaoAtualizar carregando={carregando} aoAtualizar={carregar} />
        </div>
      )}
      {(contexto.pode_ver_terceiros || (contexto.pode_ver_km_coordenador && contexto.motorista?.coordenador)) && !modoMobile && (
        <div className="filtrosLinha kmFiltros">
          {(contexto.pode_ver_terceiros || (contexto.pode_ver_km_coordenador && contexto.motorista?.coordenador)) && <label>Motorista<select value={String(filtros.motorista_id ?? '')} onChange={(e) => setFiltros({ ...filtros, motorista_id: e.target.value })}><option value="">Todos</option>{motoristas.map((m) => <option key={String(m.id)} value={String(m.id)}>{String(m.nome)}</option>)}</select></label>}
          {contexto.pode_ver_terceiros && <label>Veiculo<select value={String(filtros.veiculo_id ?? '')} onChange={(e) => setFiltros({ ...filtros, veiculo_id: e.target.value })}><option value="">Todos</option>{veiculos.map((v) => <option key={String(v.id)} value={String(v.id)}>{String(v.placa)}</option>)}</select></label>}
          {contexto.pode_ver_terceiros && <label>Departamento<select value={String(filtros.departamento_id ?? '')} onChange={(e) => setFiltros({ ...filtros, departamento_id: e.target.value })}><option value="">Todos</option>{departamentos.map((d) => <option key={String(d.id)} value={String(d.id)}>{String(d.descricao)}</option>)}</select></label>}
          {contexto.pode_ver_km_coordenador && contexto.motorista?.coordenador && (
            <label>Coordenador efetivo<select value={String(filtros.somente_coordenacao ?? 'NAO')} onChange={(e) => setFiltros({ ...filtros, somente_coordenacao: e.target.value })}>
              <option value="NAO">Meus + coordenacao efetiva</option>
              <option value="SIM">Somente minha coordenacao efetiva</option>
            </select></label>
          )}
          <button className="primary" onClick={carregar}>Aplicar</button>
        </div>
      )}
      <div className="kmLegenda"><span className="diaSemKm" />Sem apontamento útil <span className="diaComKm" />Com KM <span className="diaFuturo" />Futuro/período</div>
      {carregando && <div className="kmLoading"><span className="gaugeAtualizacao" />Carregando dados do KM...</div>}
      <div className="kmCalendario">
        {dias.map((dia) => {
          const data = dataIsoLocal(dia);
          const registros = apontamentosPorDia.get(data) ?? [];
          const totalKmDia = registros.reduce((soma, registro) => soma + Number(registro.km_total ?? 0), 0);
          const fimSemana = [0, 6].includes(dia.getDay());
          const classe = registros.length ? 'comKm' : data > hoje ? 'futuro' : fimSemana ? 'fimSemana' : 'semKm';
          return (
            <button key={data} disabled={data > hoje} className={`${classe} ${dataSelecionada === data ? 'selecionado' : ''}`} onClick={() => setDataSelecionada(data)}>
              <strong>{dia.getDate()}</strong>
              <small>{registros.length ? `${numeroPtBr(totalKmDia, 0)} km` : fimSemana ? 'folga' : data > hoje ? 'futuro' : 'pendente'}</small>
            </button>
          );
        })}
      </div>
      {dataSelecionada && (
        <div className={`frotaModalOverlay ${modoMobile ? 'kmDiaModalMobile' : 'kmDiaModalWeb'}`} role="dialog" aria-modal="true" aria-label="Apontamentos do dia">
          <button className="frotaModalFundo" type="button" onClick={() => setDataSelecionada('')} aria-label="Fechar dia" />
          <section className="frotaModalDetalhe kmDiaPainel">
            <header>
              <div><span>{dataBr(dataSelecionada)}</span><h3>Apontamentos do dia</h3></div>
              <div className="kmDiaAcoes">
                <button className="primary" onClick={() => { setRegistroEditar(null); setFormularioAberto(true); }}>Incluir</button>
                <button className="ghost" onClick={() => setDataSelecionada('')}>Fechar</button>
              </div>
            </header>
            {mensagemAcaoDia && <div className="sucesso">{mensagemAcaoDia}</div>}
            {erroAcaoDia && <div className="alerta">{erroAcaoDia}</div>}
            <div className="kmCardsDia">
              {apontamentosDia.map((item) => (
                <div key={String(item.id)} className="kmCardApontamentoLinha">
                  <button className="kmCardApontamento" onClick={() => { setRegistroEditar(item); setFormularioAberto(false); }}>
                    <strong>{item.sem_pedido ? 'Sem pedido' : `${String(item.pedido)} - ${String(item.cliente)}`}</strong>
                    <span>{String(item.placa ?? '-')} | {String(item.motorista_nome ?? '-')}</span>
                    <b>{numeroPtBr(item.km_total)} km</b>
                    <small>{item.integrado ? 'Integrado' : item.validado ? 'Validado' : 'Pendente'}</small>
                  </button>
                  {!item.validado && !item.integrado && (
                    <button className="ghost kmExcluirApontamento" onClick={() => excluirApontamentoDia(item)} title="Excluir apontamento">
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  )}
                </div>
              ))}
              {!apontamentosDia.length && <p>Nenhum apontamento neste dia. Clique em incluir para fazer o primeiro lancamento.</p>}
            </div>
          </section>
        </div>
      )}
      {dataSelecionada && formularioAberto && (
        <ApontamentoKmFormulario data={dataSelecionada} contexto={contexto} pedidos={pedidos} motoristas={motoristas} veiculos={veiculos} departamentos={departamentos} motivosSemPedido={motivosSemPedido} modoMobile={modoMobile} aoSalvar={() => carregar({ data_inicial: filtros.data_inicial || periodo.data_inicial, data_final: filtros.data_final || periodo.data_final })} aoFechar={() => setFormularioAberto(false)} />
      )}
      {registroEditar && (
        <ApontamentoKmFormulario data={String(registroEditar.data_apontamento).slice(0, 10)} registro={registroEditar} contexto={contexto} pedidos={pedidos} motoristas={motoristas} veiculos={veiculos} departamentos={departamentos} motivosSemPedido={motivosSemPedido} modoMobile={modoMobile} aoSalvar={() => carregar({ data_inicial: filtros.data_inicial || periodo.data_inicial, data_final: filtros.data_final || periodo.data_final })} aoFechar={() => setRegistroEditar(null)} />
      )}
    </section>
  );
}

export function ApontamentoKmMobileFrota({ usuario, empresaAtiva, aoSair }: { usuario?: { nome?: string }; empresaAtiva?: RegistroGenerico | null; aoSair?: () => void }) {
  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const manifestAnterior = manifest?.getAttribute('href') ?? '/manifest.webmanifest';
    const appleAnterior = appleIcon?.getAttribute('href') ?? '/brand/logo-s-novo.jpg';
    manifest?.setAttribute('href', '/manifest-km.webmanifest');
    appleIcon?.setAttribute('href', '/brand/logo-km-512.png');
    return () => {
      manifest?.setAttribute('href', manifestAnterior);
      appleIcon?.setAttribute('href', appleAnterior);
    };
  }, []);

  return (
    <main className="kmAppMobileShell">
      <section className="kmAppHeader">
        <div className="kmAppMarca">
          <LogoKm />
          <div>
            <span>Control S Frota</span>
            <h1>KM Mobile</h1>
            <p>{usuario?.nome ?? 'Motorista'}</p>
          </div>
        </div>
        {empresaAtiva?.caminho_logo && <img className="kmLogoEmpresaCard" src={String(empresaAtiva.caminho_logo)} alt={String(empresaAtiva.nome_fantasia ?? 'Empresa')} />}
        <div className="kmAppAcoes">
          <img className="kmLogoControlTopo" src="/brand/logo-s-novo.jpg" alt="Control S" />
          {aoSair && <button className="ghost" type="button" onClick={aoSair}>Sair</button>}
        </div>
      </section>
      <ApontamentoKmFrota modoMobile />
      <footer className="kmAppRodape">CONTROL S CONSULTORIA - Direitos Reservados</footer>
    </main>
  );
}

export function ValidacaoKmFrota() {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [totalizadores, setTotalizadores] = useState<RegistroGenerico>({});
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [detalhe, setDetalhe] = useState<RegistroGenerico | null>(null);
  const [historicoKm, setHistoricoKm] = useState<RegistroGenerico[]>([]);
  const [filtros, setFiltros] = useState<RegistroGenerico>({ validado: 'TODOS', integrado: 'TODOS', cancelado: 'NAO' });
  const [motoristas, setMotoristas] = useState<RegistroGenerico[]>([]);
  const [veiculos, setVeiculos] = useState<RegistroGenerico[]>([]);
  const [departamentos, setDepartamentos] = useState<RegistroGenerico[]>([]);
  const [motivosCancelamento, setMotivosCancelamento] = useState<RegistroGenerico[]>([]);
  const [modalErro, setModalErro] = useState('');
  const [cancelamentoAberto, setCancelamentoAberto] = useState(false);
  const [motivoCancelamentoId, setMotivoCancelamentoId] = useState('');
  const [observacaoCancelamento, setObservacaoCancelamento] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const coordenadores = motoristas.filter((item) => Boolean(item.coordenador));
  const colunasKm = [
    { id: 'data_apontamento', rotulo: 'Data' },
    { id: 'pedido', rotulo: 'Pedido' },
    { id: 'cliente', rotulo: 'Obra' },
    { id: 'coordenador_pedido', rotulo: 'Coord. pedido' },
    { id: 'coordenador_padrao', rotulo: 'Coord. padrao' },
    { id: 'coordenador_efetivo', rotulo: 'Coord. efetivo' },
    { id: 'motorista_nome', rotulo: 'Motorista' },
    { id: 'placa', rotulo: 'Veiculo' },
    { id: 'origem', rotulo: 'Origem' },
    { id: 'destino', rotulo: 'Destino' },
    { id: 'filial', rotulo: 'Filial' },
    { id: 'km_inicial', rotulo: 'KM inicial' },
    { id: 'km_final', rotulo: 'KM final' },
    { id: 'km_total', rotulo: 'Total' },
    { id: 'manha', rotulo: 'Manha' },
    { id: 'tarde', rotulo: 'Tarde' },
    { id: 'noite', rotulo: 'Noite' },
    { id: 'ajudante', rotulo: 'Ajudante' },
    { id: 'ajudante2', rotulo: 'Ajudante 2' },
    { id: 'cancelado', rotulo: 'Cancelado' },
    { id: 'validado', rotulo: 'Validado' },
    { id: 'integrado', rotulo: 'Integrado' }
  ];
  const [colunasKmVisiveis, setColunasKmVisiveis] = useState<string[]>(() => {
    const salvo = localStorage.getItem('controlSHubFrotaColunasValidacaoKm');
    return salvo ? JSON.parse(salvo) : colunasKm.map((coluna) => coluna.id);
  });

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const retorno = await listarApontamentosKmFrota(filtros);
      setLinhas(retorno.linhas ?? []);
      setTotalizadores(retorno.totalizadores ?? {});
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar KM.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar().catch(() => undefined);
    listarMotoristasFrota().then(setMotoristas).catch(() => setMotoristas([]));
    listarVeiculosFrota().then(setVeiculos).catch(() => setVeiculos([]));
    listarDepartamentosFrota().then(setDepartamentos).catch(() => setDepartamentos([]));
    listarMotivosCancelamentoFrota().then(setMotivosCancelamento).catch(() => setMotivosCancelamento([]));
  }, []);

  async function validar(validado: boolean) {
    setErro('');
    try {
      const acionaveis = linhas.filter((linha) => selecionados.includes(Number(linha.id)) && !linha.integrado).map((linha) => Number(linha.id));
      if (!acionaveis.length) {
        setModalErro('Selecione apontamentos nao integrados para validar ou remover validacao.');
        return;
      }
      await validarApontamentosKmFrota(acionaveis, validado);
      setSelecionados([]);
      await carregar();
    } catch (error) {
      setModalErro(error instanceof Error ? error.message : 'Falha ao validar KM.');
    }
  }

  async function abrirDetalheKm(linha: RegistroGenerico) {
    setDetalhe(linha);
    setHistoricoKm([]);
    try {
      setHistoricoKm(await listarHistoricoApontamentoKmFrota(Number(linha.id)));
    } catch {
      setHistoricoKm([]);
    }
  }

  function fecharDetalheKm() {
    setDetalhe(null);
    setHistoricoKm([]);
  }

  async function cancelarSelecionadosKm() {
    setErro('');
    setModalErro('');
    try {
      if (!motivoCancelamentoId) {
        setModalErro('Informe o motivo do cancelamento.');
        return;
      }
      const acionaveis = linhas.filter((linha) => selecionados.includes(Number(linha.id)) && !linha.integrado).map((linha) => Number(linha.id));
      if (!acionaveis.length) {
        setModalErro('Selecione apontamentos nao integrados para cancelar.');
        return;
      }
      await cancelarApontamentosKmFrota(acionaveis, Number(motivoCancelamentoId), observacaoCancelamento);
      setSelecionados([]);
      setCancelamentoAberto(false);
      setMotivoCancelamentoId('');
      setObservacaoCancelamento('');
      await carregar();
    } catch (error) {
      setModalErro(error instanceof Error ? error.message : 'Falha ao cancelar KM.');
    }
  }

  const totalSelecionado = linhas.filter((linha) => selecionados.includes(Number(linha.id))).reduce((soma, linha) => soma + Number(linha.km_total ?? 0), 0);

  function alternarColunaKm(coluna: string) {
    const novas = colunasKmVisiveis.includes(coluna)
      ? colunasKmVisiveis.filter((item) => item !== coluna)
      : [...colunasKmVisiveis, coluna];
    setColunasKmVisiveis(novas);
    localStorage.setItem('controlSHubFrotaColunasValidacaoKm', JSON.stringify(novas));
  }

  function valorColunaKm(linha: RegistroGenerico, coluna: string) {
    if (coluna === 'data_apontamento') return dataBr(linha.data_apontamento);
    if (coluna === 'coordenador_pedido') return String(linha.coordenador_pedido_motorista_nome ?? linha.coordenador ?? '-');
    if (coluna === 'coordenador_padrao') return String(linha.coordenador_padrao_motorista_nome ?? '-');
    if (coluna === 'coordenador_efetivo') return String(linha.coordenador_motorista_nome ?? linha.coordenador_encontrado ?? '-');
    if (coluna === 'origem') return String(linha.origem ?? linha.codigo_origem_decis ?? '-');
    if (coluna === 'manha') return `${String(linha.manha_inicio ?? '-')} / ${String(linha.manha_fim ?? '-')}`;
    if (coluna === 'tarde') return `${String(linha.tarde_inicio ?? '-')} / ${String(linha.tarde_fim ?? '-')}`;
    if (coluna === 'noite') return `${String(linha.noite_inicio ?? '-')} / ${String(linha.noite_fim ?? '-')}`;
    if (coluna === 'ajudante') return String(linha.ajudante_motorista_nome ?? linha.ajudante ?? '-');
    if (coluna === 'ajudante2') return String(linha.ajudante_motorista2_nome ?? '-');
    if (coluna === 'cancelado') return <span className={linha.cancelado ? 'frotaChip perigo' : 'frotaChip neutro'}>{linha.cancelado ? 'Cancelado' : 'Ativo'}</span>;
    if (coluna === 'validado') return <span className={linha.validado ? 'frotaChip sucesso' : 'frotaChip alerta'}>{linha.validado ? 'Validado' : 'Pendente'}</span>;
    if (coluna === 'integrado') return <span className={linha.integrado ? 'frotaChip info' : 'frotaChip neutro'}>{linha.integrado ? 'Integrado' : 'Aberto'}</span>;
    if (['km_inicial', 'km_final', 'km_total'].includes(coluna)) return numeroPtBr(linha[coluna]);
    return String(linha[coluna] ?? '-');
  }

  return (
    <section className="painelTabela frotaPainel frotaValidacaoTela">
      <header className="frotaHero frotaHeroValidacao">
        <div>
          <span>Modulo Frota</span>
          <h2>Validacao de KM</h2>
          <p>Conferencia do periodo, motoristas, veiculos, pedidos, coordenadores e integracao.</p>
        </div>
        <div className="frotaHeroAcoes">
          <button className="ghost" type="button" onClick={() => setFiltrosAbertos((atual) => !atual)}><Filter size={15} />{filtrosAbertos ? 'Ocultar filtros' : 'Mostrar filtros'}</button>
          <BotaoAtualizar carregando={carregando} aoAtualizar={carregar} />
        </div>
      </header>
      {erro && <div className="alerta">{erro}</div>}
      <div className="metrics pimMetrics frotaTotalizadoresCompactos">
        <article><span>Registros</span><strong>{totalizadores.registros ?? 0}</strong></article>
        <article><span>Validados</span><strong>{totalizadores.validados ?? 0}</strong></article>
        <article><span>Pendentes</span><strong>{totalizadores.pendentes ?? 0}</strong></article>
        <article><span>Integrados</span><strong>{totalizadores.integrados ?? 0}</strong></article>
        <article><span>KM total</span><strong>{numeroPtBr(totalizadores.km_total)} km</strong></article>
      </div>
      <div className={filtrosAbertos ? 'frotaMesa' : 'frotaMesa filtrosFechados'}>
        {filtrosAbertos && (
          <aside className="frotaFiltrosPainel">
            <strong><Filter size={16} />Filtros</strong>
            <label>Periodo inicial<input type="date" value={String(filtros.data_inicial ?? '')} onChange={(e) => setFiltros({ ...filtros, data_inicial: e.target.value })} /></label>
            <label>Periodo final<input type="date" value={String(filtros.data_final ?? '')} onChange={(e) => setFiltros({ ...filtros, data_final: e.target.value })} /></label>
            <label>Motorista<select value={String(filtros.motorista_id ?? '')} onChange={(e) => setFiltros({ ...filtros, motorista_id: e.target.value })}><option value="">Todos</option>{motoristas.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome)}</option>)}</select></label>
            <label>Veiculo<select value={String(filtros.veiculo_id ?? '')} onChange={(e) => setFiltros({ ...filtros, veiculo_id: e.target.value })}><option value="">Todos</option>{veiculos.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.placa)}</option>)}</select></label>
            <label>Departamento<select value={String(filtros.departamento_id ?? '')} onChange={(e) => setFiltros({ ...filtros, departamento_id: e.target.value })}><option value="">Todos</option>{departamentos.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.descricao)}</option>)}</select></label>
            <label>Coordenador efetivo<select value={String(filtros.coordenador_id ?? '')} onChange={(e) => setFiltros({ ...filtros, coordenador_id: e.target.value })}><option value="">Todos</option>{coordenadores.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nome)}</option>)}</select></label>
            <label>Validado<select value={String(filtros.validado ?? 'TODOS')} onChange={(e) => setFiltros({ ...filtros, validado: e.target.value })}><option value="TODOS">Todos</option><option value="SIM">Sim</option><option value="NAO">Nao</option></select></label>
            <label>Integrado<select value={String(filtros.integrado ?? 'TODOS')} onChange={(e) => setFiltros({ ...filtros, integrado: e.target.value })}><option value="TODOS">Todos</option><option value="SIM">Sim</option><option value="NAO">Nao</option></select></label>
            <label>Cancelado<select value={String(filtros.cancelado ?? 'NAO')} onChange={(e) => setFiltros({ ...filtros, cancelado: e.target.value })}><option value="NAO">Exceto cancelados</option><option value="SIM">Cancelados</option><option value="TODOS">Todos</option></select></label>
            <button className="primary" onClick={carregar}>Aplicar filtros</button>
          </aside>
        )}
        <section className="frotaGridArea">
          <div className="frotaBarraLote">
            <div><strong>{selecionados.length} selecionado(s)</strong><small>{numeroPtBr(totalSelecionado)} km selecionados</small></div>
            <button className="primary" disabled={!selecionados.length} onClick={() => validar(true)}><CheckSquare size={15} />Validar</button>
            <button className="ghost" disabled={!selecionados.length} onClick={() => validar(false)}>Remover validacao</button>
            <button className="ghost perigo" disabled={!selecionados.length} onClick={() => setCancelamentoAberto(true)}><Ban size={15} />Cancelar</button>
          </div>
          <details className="frotaColunas">
            <summary>Colunas visiveis</summary>
            <div>{colunasKm.map((coluna) => <label key={coluna.id}><input type="checkbox" checked={colunasKmVisiveis.includes(coluna.id)} onChange={() => alternarColunaKm(coluna.id)} />{coluna.rotulo}</label>)}</div>
          </details>
          <div className="tabelaWrap frotaGridWrap frotaGridPremium">
            <table>
              <thead><tr><th><input type="checkbox" checked={linhas.length > 0 && selecionados.length === linhas.length} onChange={(e) => setSelecionados(e.target.checked ? linhas.map((l) => Number(l.id)) : [])} /></th>{colunasKm.filter((coluna) => colunasKmVisiveis.includes(coluna.id)).map((coluna) => <th key={coluna.id}>{coluna.rotulo}</th>)}<th>Acoes</th></tr></thead>
              <tbody>
                {linhas.map((linha) => {
                  const id = Number(linha.id);
                  return (
                    <tr key={id} className={linha.cancelado ? 'linhaCancelada' : (['manha', 'tarde', 'noite'].some((prefixo) => Boolean(linha[`${prefixo}_inicio`]) !== Boolean(linha[`${prefixo}_fim`])) ? 'linhaTurnoIncompleto' : '')}>
                      <td><input type="checkbox" checked={selecionados.includes(id)} onChange={(e) => setSelecionados(e.target.checked ? [...selecionados, id] : selecionados.filter((item) => item !== id))} /></td>
                      {colunasKm.filter((coluna) => colunasKmVisiveis.includes(coluna.id)).map((coluna) => <td key={coluna.id}>{valorColunaKm(linha, coluna.id)}</td>)}
                      <td><button className="ghost" onClick={() => abrirDetalheKm(linha)}>Detalhe</button></td>
                    </tr>
                  );
                })}
                {!linhas.length && <tr><td colSpan={colunasKmVisiveis.length + 2}>Nenhum apontamento encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {detalhe && (
        <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Detalhe KM">
          <button className="frotaModalFundo" type="button" aria-label="Fechar detalhe" onClick={fecharDetalheKm} />
          <section className="frotaModalDetalhe">
            <header><div><span>Detalhe KM</span><h3>{String(detalhe.pedido)} - {dataBr(detalhe.data_apontamento)}</h3></div><button className="ghost" onClick={fecharDetalheKm}>Fechar</button></header>
            <div className="frotaDetalheGrid">
              {[
                ['Pedido', detalhe.pedido],
                ['Data do apontamento', dataBr(detalhe.data_apontamento)],
                ['Cliente / obra', detalhe.cliente],
                ['Coordenador', detalhe.coordenador ?? detalhe.solicitante],
                ['Coordenador do pedido encontrado', detalhe.coordenador_pedido_motorista_nome],
                ['Coordenador padrao', detalhe.coordenador_padrao_motorista_nome],
                ['Coordenador efetivo', detalhe.coordenador_motorista_nome ?? detalhe.coordenador_encontrado],
                ['Veiculo', detalhe.placa],
                ['Veiculo Decis', detalhe.veiculo_decis],
                ['Modelo', detalhe.modelo],
                ['Motorista', detalhe.motorista_nome],
                ['Motorista Decis', detalhe.motorista_decis],
                ['Ajudante', detalhe.ajudante_motorista_nome],
                ['Ajudante Decis', detalhe.ajudante_decis],
                ['Ajudante 2', detalhe.ajudante_motorista2_nome],
                ['Ajudante 2 Decis', detalhe.ajudante2_decis],
                ['Departamento', detalhe.departamento_descricao],
                ['Origem', detalhe.origem],
                ['Destino', detalhe.destino],
                ['Empresa', detalhe.empresa_id],
                ['Filial', detalhe.filial],
                ['KM inicial', numeroPtBr(detalhe.km_inicial ?? detalhe.medicaosaida)],
                ['KM final', numeroPtBr(detalhe.km_final ?? detalhe.medicaoretorno)],
                ['KM total', `${numeroPtBr(detalhe.km_total)} km`],
                ['Manha', `${horaBr(detalhe.manha_inicio)} / ${horaBr(detalhe.manha_fim)}`],
                ['Tarde', `${horaBr(detalhe.tarde_inicio)} / ${horaBr(detalhe.tarde_fim)}`],
                ['Noite', `${horaBr(detalhe.noite_inicio)} / ${horaBr(detalhe.noite_fim)}`],
                ['Observacao', detalhe.observacao],
                ['Usuario inclusao', detalhe.usuario_inclusao_nome],
                ['Data hora inclusao', dataHoraBrMinuto(detalhe.data_hora_inclusao)],
                ['Usuario alteracao', detalhe.usuario_alteracao_nome],
                ['Data hora ultima alteracao', dataHoraBrMinuto(detalhe.data_hora_ultima_alteracao)],
                ['Cancelado', valorSimNao(detalhe.cancelado, 'Sim', 'Nao')],
                ['Motivo cancelamento', detalhe.motivo_cancelamento_descricao],
                ['Validado', valorSimNao(detalhe.validado, 'Sim', 'Nao')],
                ['Integrado', valorSimNao(detalhe.integrado, 'Sim', 'Nao')]
              ].map(([rotulo, valor]) => <p key={String(rotulo)}><span>{rotulo}</span><b>{String(valor ?? '-')}</b></p>)}
            </div>
            <section className="frotaHistoricoDetalhe">
              <header>
                <div>
                  <span>Historico</span>
                  <h4>Movimentacoes do apontamento</h4>
                </div>
              </header>
              {historicoKm.length ? (
                <div className="frotaHistoricoLista">
                  {historicoKm.map((item) => {
                    const resumoPosterior = resumirHistoricoFrota(item.valor_posterior);
                    const resumoAnterior = resumirHistoricoFrota(item.valor_anterior);
                    return (
                      <article key={String(item.id)}>
                        <div>
                          <strong>{String(item.operacao ?? '-').replace(/_/g, ' ')}</strong>
                          <span>{dataHoraBrSegundo(item.criado_em)} - {String(item.usuario_nome ?? item.usuario_id ?? 'Sistema')}</span>
                        </div>
                        <small>{String(item.origem_operacao ?? 'CONTROL_S_HUB')}</small>
                        {(resumoPosterior || resumoAnterior) && (
                          <p>
                            {resumoAnterior && <><b>Antes:</b> {resumoAnterior}<br /></>}
                            {resumoPosterior && <><b>Depois:</b> {resumoPosterior}</>}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="frotaHistoricoVazio">Nenhum historico registrado para este apontamento.</p>
              )}
            </section>
          </section>
        </div>
      )}
      {cancelamentoAberto && (
        <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Cancelar KM">
          <button className="frotaModalFundo" type="button" aria-label="Fechar cancelamento" onClick={() => setCancelamentoAberto(false)} />
          <section className="frotaModalDetalhe frotaModalCompacto">
            <header><div><span>Cancelamento manual</span><h3>Cancelar {selecionados.length} apontamento(s)</h3></div><button className="ghost" type="button" onClick={() => setCancelamentoAberto(false)}>Fechar</button></header>
            <label>Motivo<select value={motivoCancelamentoId} onChange={(e) => setMotivoCancelamentoId(e.target.value)}><option value="">Selecione</option>{motivosCancelamento.filter((motivo) => motivo.ativo !== false).map((motivo) => <option key={String(motivo.id)} value={String(motivo.id)}>{String(motivo.descricao)}</option>)}</select></label>
            <label>Observacao<textarea value={observacaoCancelamento} onChange={(e) => setObservacaoCancelamento(e.target.value)} /></label>
            <button className="primary perigo" type="button" onClick={cancelarSelecionadosKm}><Ban size={15} />Confirmar cancelamento</button>
          </section>
        </div>
      )}
      {modalErro && (
        <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Erro de validacao KM">
          <button className="frotaModalFundo" type="button" aria-label="Fechar erro" onClick={() => setModalErro('')} />
          <section className="frotaModalDetalhe frotaModalCompacto">
            <header><div><span>Validacao KM</span><h3>Nao foi possivel concluir</h3></div><button className="ghost" type="button" onClick={() => setModalErro('')}>Fechar</button></header>
            <div className="alerta">{modalErro}</div>
            <button className="primary" type="button" onClick={() => setModalErro('')}>Entendi</button>
          </section>
        </div>
      )}
    </section>
  );
}

export function ConfiguracoesFrota() {
  const [dados, setDados] = useState<RegistroGenerico>({});
  const [tipos, setTipos] = useState<RegistroGenerico[]>([]);
  const [perfis, setPerfis] = useState<RegistroGenerico[]>([]);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    listarConfiguracoesFrota().then(setDados).catch(() => setDados({}));
    listarTiposDespesasFrota().then(setTipos).catch(() => setTipos([]));
    listarPerfis().then(setPerfis).catch(() => setPerfis([]));
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    await salvarConfiguracoesFrota(dados);
    setMensagem('Configuracoes do modulo Frota salvas.');
  }

  return (
    <section className="painelTabela configuracoesPainel frotaPainel">
      <header>
        <div>
          <span>Configuracoes por modulo</span>
          <h2>Frota</h2>
          <p>Parametros especificos de importacao, validacao, integracao e odometro.</p>
        </div>
      </header>
      {mensagem && <div className="sucesso">{mensagem}</div>}
      <form className="formCadastro" onSubmit={salvar}>
        <label>Tipo de despesa de abastecimento
          <select value={String(dados.tipo_despesa_abastecimento_id ?? '')} onChange={(e) => setDados({ ...dados, tipo_despesa_abastecimento_id: e.target.value ? Number(e.target.value) : '' })}>
            <option value="">Selecione</option>
            {tipos.map((tipo) => <option key={String(tipo.id)} value={String(tipo.id)}>{String(tipo.descricao)}</option>)}
          </select>
        </label>
        <label>Dia inicial do periodo de KM<input type="number" min="1" max="31" value={String(dados.dia_inicio_periodo_km ?? 26)} onChange={(e) => setDados({ ...dados, dia_inicio_periodo_km: Number(e.target.value) })} /></label>
        <label>Dia final do periodo de KM<input type="number" min="1" max="31" value={String(dados.dia_fim_periodo_km ?? 25)} onChange={(e) => setDados({ ...dados, dia_fim_periodo_km: Number(e.target.value) })} /></label>
        <label>Complemento do e-mail dos motoristas<input placeholder="@monvizo.com.br" value={String(dados.email_padrao_motorista ?? '')} onChange={(e) => setDados({ ...dados, email_padrao_motorista: e.target.value })} /></label>
        <label>Grupo padrao para motoristas
          <select value={String(dados.perfil_padrao_motorista_id ?? '')} onChange={(e) => setDados({ ...dados, perfil_padrao_motorista_id: e.target.value ? Number(e.target.value) : '' })}>
            <option value="">Selecione</option>
            {perfis.map((perfil) => <option key={String(perfil.id)} value={String(perfil.id)}>{String(perfil.nome)}</option>)}
          </select>
        </label>
        {['nome_modulo', 'status_modulo', 'moeda_padrao'].map((campo) => <label key={campo}>{campo.replace(/_/g, ' ')}<input value={String(dados[campo] ?? '')} onChange={(e) => setDados({ ...dados, [campo]: e.target.value })} /></label>)}
        {['permitir_reimportacao_nao_validada', 'bloquear_registro_integrado', 'atualizar_odometro_automaticamente'].map((campo) => <label key={campo}>{campo.replace(/_/g, ' ')}<input type="checkbox" checked={dados[campo] !== false} onChange={(e) => setDados({ ...dados, [campo]: e.target.checked })} /></label>)}
        <label>Permitir ver KM de terceiros<input type="checkbox" checked={Boolean(dados.permitir_ver_km_terceiros)} onChange={(e) => setDados({ ...dados, permitir_ver_km_terceiros: e.target.checked })} /></label>
        <button className="primary">Salvar configuracoes</button>
      </form>
    </section>
  );
}

export function ModuloFrota({ tela }: { tela: TelaFrota }) {
  const [departamentos, setDepartamentos] = useState<RegistroGenerico[]>([]);
  const [motoristas, setMotoristas] = useState<RegistroGenerico[]>([]);
  const [tipos, setTipos] = useState<RegistroGenerico[]>([]);
  const [fornecedores, setFornecedores] = useState<RegistroGenerico[]>([]);
  const [usuarios, setUsuarios] = useState<RegistroGenerico[]>([]);

  useEffect(() => {
    listarDepartamentosFrota().then(setDepartamentos).catch(() => setDepartamentos([]));
    listarMotoristasFrota().then(setMotoristas).catch(() => setMotoristas([]));
    listarTiposDespesasFrota().then(setTipos).catch(() => setTipos([]));
    listarFornecedoresFrota().then(setFornecedores).catch(() => setFornecedores([]));
    listarUsuarios().then(setUsuarios).catch(() => setUsuarios([]));
  }, [tela]);

  if (tela === 'frotaDashboard') return <DashboardFrota />;
  if (tela === 'frotaImportacao') return <ImportacaoFrota />;
  if (tela === 'frotaValidacao') return <ValidacaoFrota />;
  if (tela === 'frotaKmApontamento') return <ApontamentoKmFrota />;
  if (tela === 'frotaKmValidacao') return <ValidacaoKmFrota />;
  if (tela === 'frotaConfiguracoes') return <ConfiguracoesFrota />;
  if (tela === 'frotaDepartamentos') return <TabelaFrota titulo="Departamentos" subtitulo="Departamentos vinculados a empresa ativa pelo codigo da empresa." carregar={listarDepartamentosFrota} colunas={['codigo_decis', 'descricao', 'filial_decis', 'codigo_origem_decis', 'codigo_empresa', 'ativo']} salvar={salvarDepartamentoFrota} excluir={excluirDepartamentoFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'descricao', rotulo: 'Descricao' }, { nome: 'filial_decis', rotulo: 'Filial Decis' }, { nome: 'codigo_origem_decis', rotulo: 'Codigo Origem Decis' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaMotoristas') return <TabelaFrota titulo="Motoristas" subtitulo="Motoristas, mecanicos, ajudantes e coordenadores usados nos apontamentos de KM." carregar={listarMotoristasFrota} colunas={['codigo_decis', 'nome', 'usuario_nome', 'departamento_descricao', 'ajudante', 'ajudante_padrao_nome', 'coordenador_padrao_nome', 'coordenador', 'codigo_coordenador_decis', 'ativo']} salvar={salvarMotoristaFrota} excluir={excluirMotoristaFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'usuario_id', rotulo: 'Usuario vinculado', tipo: 'select', opcoes: usuarios, textoOpcao: 'nome' }, { nome: 'departamento_id', rotulo: 'Departamento', tipo: 'select', opcoes: departamentos, textoOpcao: 'descricao' }, { nome: 'ajudante', rotulo: 'Ajudante', tipo: 'checkbox', valorPadrao: false }, { nome: 'ajudante_padrao_motorista_id', rotulo: 'Ajudante padrao', tipo: 'select', opcoes: motoristas, textoOpcao: 'nome' }, { nome: 'coordenador_padrao_motorista_id', rotulo: 'Coordenador padrao', tipo: 'select', opcoes: motoristas.filter((motorista) => Boolean(motorista.coordenador) && Boolean(motorista.usuario_id)), textoOpcao: 'nome' }, { nome: 'coordenador', rotulo: 'Coordenador', tipo: 'checkbox', valorPadrao: false }, { nome: 'codigo_coordenador_decis', rotulo: 'Codigo Coordenador Decis' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} acoesExtras={(linha, recarregar, definirMensagem, definirErro) => !linha.usuario_id ? <button className="ghost" onClick={async () => { try { definirErro(''); const usuario = await gerarUsuarioMotoristaFrota(Number(linha.id)); definirMensagem(`Usuario ${usuario.email} criado. Senha inicial: controls. No primeiro acesso sera solicitada a troca da senha.`); await recarregar(); } catch (error) { definirErro(error instanceof Error ? error.message : 'Falha ao gerar usuario.'); } }}>Gerar usuario</button> : null} />;
  if (tela === 'frotaPedidosVenda') return <TabelaFrota titulo="Pedidos de Venda" subtitulo="Pedidos integrados do Decis usados como obra/base do apontamento de KM." carregar={listarPedidosVendaFrota} colunas={['filial_decis', 'pedido', 'departamento_codigo_decis', 'departamento_nome', 'data_pedido', 'cliente_codigo_decis', 'cliente_nome', 'valor', 'codigo_coordenador_decis', 'coordenador_nome', 'pedido_sequencial', 'ativo']} salvar={salvarPedidoVendaFrota} excluir={excluirPedidoVendaFrota} campos={[{ nome: 'filial_decis', rotulo: 'Filial' }, { nome: 'pedido', rotulo: 'Pedido' }, { nome: 'departamento_codigo_decis', rotulo: 'Codigo Departamento Decis' }, { nome: 'departamento_nome', rotulo: 'Nome Departamento' }, { nome: 'data_pedido', rotulo: 'Data', tipo: 'date' }, { nome: 'cliente_codigo_decis', rotulo: 'Codigo Cliente Decis' }, { nome: 'cliente_nome', rotulo: 'Nome Cliente / Obra' }, { nome: 'valor', rotulo: 'Valor', tipo: 'number' }, { nome: 'codigo_coordenador_decis', rotulo: 'Codigo Coordenador Decis' }, { nome: 'coordenador_nome', rotulo: 'Nome Coordenador' }, { nome: 'pedido_sequencial', rotulo: 'Pedido Sequencial' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaVeiculos') return <TabelaFrota titulo="Veiculos" subtitulo="Placa unica, departamento, motorista e odometro protegido por regra de banco." carregar={listarVeiculosFrota} colunas={['codigo_decis', 'placa', 'modelo', 'departamento_descricao', 'motorista_nome', 'odometro_atual', 'ativo']} salvar={salvarVeiculoFrota} excluir={excluirVeiculoFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'placa', rotulo: 'Placa' }, { nome: 'modelo', rotulo: 'Modelo' }, { nome: 'departamento_id', rotulo: 'Departamento', tipo: 'select', opcoes: departamentos, textoOpcao: 'descricao' }, { nome: 'motorista_id', rotulo: 'Motorista', tipo: 'select', opcoes: motoristas, textoOpcao: 'nome' }, { nome: 'odometro_atual', rotulo: 'Odometro atual', tipo: 'number' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaTiposDespesas') return <TabelaFrota titulo="Tipos de Despesas" subtitulo="Tipos internos usados na classificacao das despesas importadas." carregar={listarTiposDespesasFrota} colunas={['codigo_decis', 'descricao', 'natureza_credito_decis', 'conf_custo_decis', 'ativo']} salvar={salvarTipoDespesaFrota} excluir={excluirTipoDespesaFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'descricao', rotulo: 'Descricao' }, { nome: 'natureza_credito_decis', rotulo: 'Natureza de credito Decis', valorPadrao: '2' }, { nome: 'conf_custo_decis', rotulo: 'Conf Custo Decis' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaFornecedores') return <TabelaFrota titulo="Fornecedores" subtitulo="Fornecedores de despesas e suas descricoes de origem." carregar={listarFornecedoresFrota} colunas={['codigo_decis', 'nome', 'nome_fantasia', 'codigo_forma_pagamento_decis', 'descricao_forma_pagamento', 'dia_vencimento', 'natureza_credito_decis', 'grupo_custo_decis', 'conf_custo_decis', 'ativo']} salvar={salvarFornecedorFrota} excluir={excluirFornecedorFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'nome_fantasia', rotulo: 'Nome fantasia' }, { nome: 'codigo_forma_pagamento_decis', rotulo: 'Codigo Forma de Pagamento Decis' }, { nome: 'descricao_forma_pagamento', rotulo: 'Descricao forma de pagamento' }, { nome: 'dia_vencimento', rotulo: 'Dia de vencimento', tipo: 'number' }, { nome: 'natureza_credito_decis', rotulo: 'Nat de Credito Decis' }, { nome: 'grupo_custo_decis', rotulo: 'Grupo de Custo Decis' }, { nome: 'conf_custo_decis', rotulo: 'Conf Custo Decis' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaMotivosCancelamento') return <TabelaFrota titulo="Motivos de Cancelamento" subtitulo="Motivos usados para cancelar documentos de despesas na validacao." carregar={listarMotivosCancelamentoFrota} colunas={['codigo_decis', 'descricao', 'ativo']} salvar={salvarMotivoCancelamentoFrota} excluir={excluirMotivoCancelamentoFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'descricao', rotulo: 'Descricao' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaMotivosSemPedido') return <TabelaFrota titulo="Motivos Sem Pedido" subtitulo="Motivos usados no apontamento de KM quando nao existe pedido vinculado." carregar={listarMotivosSemPedidoFrota} colunas={['codigo_decis', 'descricao', 'ativo']} salvar={salvarMotivoSemPedidoFrota} excluir={excluirMotivoSemPedidoFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'descricao', rotulo: 'Descricao' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  return <TabelaFrota titulo="Despesa por Tipo" subtitulo="De/Para persistente entre descricao do fornecedor e tipo interno de despesa." carregar={listarDespesasTiposFrota} colunas={['descricao_despesa', 'tipo_despesa_descricao', 'fornecedor_nome', 'ativo']} salvar={salvarDespesaTipoFrota} excluir={excluirDespesaTipoFrota} campos={[{ nome: 'descricao_despesa', rotulo: 'Descricao da despesa' }, { nome: 'tipo_despesa_id', rotulo: 'Tipo da despesa', tipo: 'select', opcoes: tipos, textoOpcao: 'descricao' }, { nome: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'select', opcoes: fornecedores, textoOpcao: 'nome_fantasia' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
}
