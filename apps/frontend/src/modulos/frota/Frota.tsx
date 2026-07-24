import { BadgeCheck, Ban, Car, CheckSquare, FileSpreadsheet, FileUp, Filter, History, KeyRound, LayoutGrid, PanelRightOpen, Printer, Settings, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  buscarDashboardFrota,
  cancelarDespesasFrota,
  excluirDepartamentoFrota,
  excluirDespesaTipoFrota,
  excluirFornecedorFrota,
  excluirMotivoCancelamentoFrota,
  excluirMotoristaFrota,
  excluirTipoDespesaFrota,
  excluirVeiculoFrota,
  importarDespesasFrota,
  listarConfiguracoesFrota,
  listarDepartamentosFrota,
  listarDespesasFrota,
  listarDespesasTiposFrota,
  listarFornecedoresFrota,
  listarHistoricoDespesaFrota,
  listarMotivosCancelamentoFrota,
  listarMotoristasFrota,
  listarTiposDespesasFrota,
  listarVeiculosFrota,
  obterMapeamentoImportacaoFrota,
  RegistroGenerico,
  salvarConfiguracoesFrota,
  salvarDepartamentoFrota,
  salvarDespesaFrota,
  salvarDespesaTipoFrota,
  salvarFornecedorFrota,
  salvarMapeamentoImportacaoFrota,
  salvarMotivoCancelamentoFrota,
  salvarMotoristaFrota,
  salvarTipoDespesaFrota,
  salvarVeiculoFrota,
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
  { id: 'frotaMotivosCancelamento' as TelaFrota, nome: 'Motivos de Cancelamento', icone: Ban },
  { id: 'usuarios' as TelaFrota, nome: 'Cadastro de Usuarios', icone: UserCog },
  { id: 'perfis' as TelaFrota, nome: 'Perfis de Acesso', icone: BadgeCheck },
  { id: 'direitos' as TelaFrota, nome: 'Direitos de Acesso', icone: KeyRound },
  { id: 'frotaConfiguracoes' as TelaFrota, nome: 'Configuracoes', icone: Settings }
];

export const permissoesMenuFrota: Partial<Record<TelaFrota, string[]>> = {
  frotaDashboard: ['FROTA_ACESSAR', 'FROTA_CONSULTAR'],
  frotaDepartamentos: ['FROTA_CONSULTAR'],
  frotaMotoristas: ['FROTA_CONSULTAR'],
  frotaVeiculos: ['FROTA_CONSULTAR'],
  frotaTiposDespesas: ['FROTA_CONSULTAR'],
  frotaFornecedores: ['FROTA_CONSULTAR'],
  frotaDespesaTipo: ['FROTA_CONFIGURAR'],
  frotaMotivosCancelamento: ['FROTA_CANCELAR_DESPESAS', 'FROTA_CONFIGURAR'],
  frotaImportacao: ['FROTA_IMPORTAR_DESPESAS'],
  frotaValidacao: ['FROTA_CONSULTAR', 'FROTA_VALIDAR_DESPESAS'],
  frotaConfiguracoes: ['FROTA_CONFIGURAR'],
  usuarios: ['ADMINISTRAR_USUARIOS'],
  perfis: ['ADMINISTRAR_PERFIS'],
  direitos: ['ADMINISTRAR_PERFIS']
};

const LOGO_FROTA = '/brand/logo-frota.png';

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

function BotaoAtualizar({ carregando, aoAtualizar }: { carregando: boolean; aoAtualizar: () => void | Promise<unknown> }) {
  return <button className={`botaoAtualizar${carregando ? ' carregando' : ''}`} type="button" onClick={() => aoAtualizar()} disabled={carregando}>{carregando ? 'Atualizando...' : 'Atualizar'}</button>;
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
  excluir
}: {
  titulo: string;
  subtitulo: string;
  carregar: () => Promise<RegistroGenerico[]>;
  colunas: string[];
  campos: { nome: string; rotulo: string; tipo?: 'text' | 'number' | 'checkbox' | 'select'; opcoes?: RegistroGenerico[]; valorOpcao?: string; textoOpcao?: string; valorPadrao?: unknown }[];
  salvar: (dados: RegistroGenerico) => Promise<RegistroGenerico>;
  excluir?: (id: number) => Promise<RegistroGenerico>;
}) {
  const [linhas, setLinhas] = useState<RegistroGenerico[]>([]);
  const [formulario, setFormulario] = useState<RegistroGenerico>({});
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const carregamentoAtual = useRef(0);

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
    await excluir(id);
    await recarregar();
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
      {mensagem && <div className="sucesso">{mensagem}</div>}
      {erro && <div className="alerta">{erro}</div>}
      {aberto && (
        <form className="formCadastro" onSubmit={enviar}>
          {campos.map((campo) => (
            <label key={campo.nome}>
              {campo.rotulo}
              {campo.tipo === 'select' ? (
                <select value={String(formulario[campo.nome] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo.nome]: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Selecione</option>
                  {(campo.opcoes ?? []).map((opcao) => <option key={String(opcao[campo.valorOpcao ?? 'id'])} value={String(opcao[campo.valorOpcao ?? 'id'])}>{String(opcao[campo.textoOpcao ?? 'descricao'] ?? opcao.nome ?? opcao.id)}</option>)}
                </select>
              ) : campo.tipo === 'checkbox' ? (
                <input type="checkbox" checked={Boolean(formulario[campo.nome] ?? true)} onChange={(e) => setFormulario({ ...formulario, [campo.nome]: e.target.checked })} />
              ) : (
                <input type={campo.tipo ?? 'text'} value={String(formulario[campo.nome] ?? '')} onChange={(e) => setFormulario({ ...formulario, [campo.nome]: campo.tipo === 'number' ? Number(e.target.value) : e.target.value })} />
              )}
            </label>
          ))}
          <button className="primary">Salvar</button>
        </form>
      )}
      <div className="tabelaWrap">
        <table>
          <thead><tr>{colunas.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}<th>Acoes</th></tr></thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={String(linha.id ?? JSON.stringify(linha))} onDoubleClick={() => { setFormulario(linha); setAberto(true); }}>
                {colunas.map((coluna) => <td key={coluna}>{String(linha[coluna] ?? '-')}</td>)}
                <td className="acoesTabela"><button className="ghost" onClick={() => { setFormulario(linha); setAberto(true); }}>Alterar</button>{excluir && <button className="ghost" onClick={() => excluirLinha(Number(linha.id))}><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={colunas.length + 1}>{carregando ? 'Carregando registros...' : 'Nenhum registro encontrado.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DashboardFrota() {
  const [indicadores, setIndicadores] = useState<RegistroGenerico>({});
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      setIndicadores(await buscarDashboardFrota());
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const rankings = [
    ['Veiculos com maior despesa', indicadores.veiculos_maior_despesa ?? [], 'placa'],
    ['Despesas por tipo', indicadores.despesas_por_tipo ?? [], 'descricao'],
    ['Despesas por departamento', indicadores.despesas_por_departamento ?? [], 'descricao'],
    ['Evolucao mensal', indicadores.evolucao_mensal ?? [], 'mes']
  ] as const;

  return (
    <section>
      <div className="barraAcoesTela">
        <div>
          <span>Modulo Frota</span>
          <h2>Dashboard operacional</h2>
        </div>
        <BotaoAtualizar carregando={carregando} aoAtualizar={carregar} />
      </div>
      <div className="metrics pimMetrics frotaMetrics">
        <article><span>Despesas no periodo</span><strong>{indicadores.despesas_periodo ?? 0}</strong></article>
        <article><span>Valor total</span><strong>{moeda(indicadores.valor_total)}</strong></article>
        <article><span>Pendentes</span><strong>{indicadores.despesas_pendentes_validacao ?? 0}</strong></article>
        <article><span>Validadas</span><strong>{indicadores.despesas_validadas ?? 0}</strong></article>
        <article><span>Integradas</span><strong>{indicadores.despesas_integradas ?? 0}</strong></article>
        <article><span>Nao integradas</span><strong>{indicadores.despesas_nao_integradas ?? 0}</strong></article>
      </div>
      <div className="dashboardGrid pimDashboardGrid">
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
  const [vinculos, setVinculos] = useState<RegistroGenerico>({});
  const [erro, setErro] = useState('');
  const [pendenciasVeiculos, setPendenciasVeiculos] = useState<RegistroGenerico[]>([]);
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

  function validarVinculosVeiculosImportacao() {
    const placas = [...new Set(linhasMapeadas.map((linha) => String(linha.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean))];
    const veiculosPorPlaca = new Map(veiculos.map((veiculo) => [String(veiculo.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), veiculo]));
    const pendentes = placas
      .map((placa) => veiculosPorPlaca.get(placa))
      .filter((veiculo): veiculo is RegistroGenerico => Boolean(veiculo && (!veiculo.departamento_id || !veiculo.motorista_id)));
    if (pendentes.length) {
      setPendenciasVeiculos(pendentes.map((veiculo) => ({ ...veiculo })));
      setErro('Complete departamento e motorista dos veiculos encontrados para continuar.');
      return false;
    }
    return true;
  }

  async function confirmarImportacao(_ignorarValidacaoVeiculos = false) {
    setErro('');
    if (!fornecedorId) {
      setErro('Selecione o fornecedor.');
      return;
    }
    await salvarMapeamentoImportacaoFrota(fornecedorId, mapeamento);
    const retorno = await importarDespesasFrota({ fornecedor_id: fornecedorId, nome_arquivo: nomeArquivo, mapeamento, linhas: linhasMapeadas });
    setResultado(retorno);
  }

  async function salvarVinculosVeiculosPendentes() {
    setErro('');
    const incompletos = pendenciasVeiculos.filter((veiculo) => !veiculo.departamento_id || !veiculo.motorista_id);
    if (incompletos.length) {
      setErro('Informe departamento e motorista em todos os veiculos para continuar.');
      return;
    }
    for (const veiculo of pendenciasVeiculos) {
      await salvarVeiculoFrota(veiculo);
    }
    const atualizados = await listarVeiculosFrota();
    setVeiculos(atualizados);
    setPendenciasVeiculos([]);
    await confirmarImportacao(true);
  }

  async function salvarVinculosPendentes() {
    for (const [descricao, tipoId] of Object.entries(vinculos)) {
      if (tipoId) {
        await salvarDespesaTipoFrota({ fornecedor_id: fornecedorId, descricao_despesa: descricao, tipo_despesa_id: Number(tipoId), ativo: true });
      }
    }
    await confirmarImportacao();
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
            <strong>{progressoLeitura?.etapa ?? 'Lendo arquivo'}</strong>
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
      {pendenciasVeiculos.length > 0 && (
        <div className="modalInterno">
          <h3>Vincular veiculos</h3>
          <p>As placas abaixo existem no cadastro, mas ainda precisam de departamento e motorista. Ao salvar, o cadastro do veiculo sera atualizado automaticamente.</p>
          {pendenciasVeiculos.map((veiculo, indice) => (
            <div className="frotaVinculoVeiculo" key={String(veiculo.id)}>
              <strong>{String(veiculo.placa)} - {String(veiculo.modelo ?? 'Sem modelo')}</strong>
              <label>Departamento<select value={String(veiculo.departamento_id ?? '')} onChange={(e) => setPendenciasVeiculos(pendenciasVeiculos.map((item, itemIndice) => itemIndice === indice ? { ...item, departamento_id: e.target.value ? Number(e.target.value) : null } : item))}><option value="">Selecione</option>{departamentos.map((departamento) => <option key={String(departamento.id)} value={String(departamento.id)}>{String(departamento.descricao)}</option>)}</select></label>
              <label>Motorista<select value={String(veiculo.motorista_id ?? '')} onChange={(e) => setPendenciasVeiculos(pendenciasVeiculos.map((item, itemIndice) => itemIndice === indice ? { ...item, motorista_id: e.target.value ? Number(e.target.value) : null } : item))}><option value="">Selecione</option>{motoristas.map((motorista) => <option key={String(motorista.id)} value={String(motorista.id)}>{String(motorista.nome)}</option>)}</select></label>
            </div>
          ))}
          <button className="primary" onClick={salvarVinculosVeiculosPendentes}>Salvar vinculos e continuar</button>
        </div>
      )}
      {resultado && (
        <div className="pimBlocoInterno">
          <div className="metrics">
            <article><span>Lidas</span><strong>{String(resultado.total_linhas ?? 0)}</strong></article>
            <article><span>Importadas</span><strong>{String(resultado.importadas ?? 0)}</strong></article>
            <article><span>Atualizadas</span><strong>{String(resultado.atualizadas ?? 0)}</strong></article>
            <article><span>Ignoradas</span><strong>{String(resultado.ignoradas ?? 0)}</strong></article>
            <article><span>Com erro</span><strong>{String(resultado.com_erro ?? 0)}</strong></article>
            <article><span>Pendentes</span><strong>{String((resultado.pendentes_vinculo ?? []).length)}</strong></article>
          </div>
          {(resultado.pendentes_vinculo ?? []).length > 0 && (
            <div className="modalInterno">
              <h3>De/Para pendente</h3>
              {(resultado.pendentes_vinculo ?? []).map((descricao: string) => (
                <label key={descricao}>{descricao}<select value={String(vinculos[descricao] ?? '')} onChange={(e) => setVinculos({ ...vinculos, [descricao]: e.target.value })}><option value="">Selecione</option>{tipos.map((tipo) => <option key={String(tipo.id)} value={String(tipo.id)}>{String(tipo.descricao)}</option>)}</select></label>
              ))}
              <button className="primary" onClick={salvarVinculosPendentes}>Salvar De/Para e continuar</button>
            </div>
          )}
          {(resultado.mensagens ?? []).map((mensagem: string) => <p key={mensagem}>{mensagem}</p>)}
        </div>
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
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(() => {
    const salvo = localStorage.getItem('controlSHubFrotaColunasValidacao');
    return salvo ? JSON.parse(salvo) : ['data_hora', 'placa', 'numero_documento', 'fornecedor_nome', 'departamento_descricao', 'motorista_nome', 'tipo_despesa_descricao', 'hodometro', 'valor_unitario_liquido', 'total', 'data_vencimento', 'validado', 'integrado'];
  });
  const [erro, setErro] = useState('');
  const colunas = ['data_hora', 'placa', 'numero_documento', 'fatura', 'fornecedor_nome', 'departamento_descricao', 'motorista_nome', 'tipo_despesa_descricao', 'descricao_despesa', 'hodometro', 'quantidade', 'unidade_despesa', 'valor_unitario', 'valor_unitario_liquido', 'valor_bruto', 'desconto', 'total', 'codigo_forma_pagamento_decis', 'descricao_forma_pagamento', 'dia_vencimento', 'data_vencimento', 'validado', 'integrado', 'cancelado', 'origem_lancamento'];

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

  function prepararPendenciasValidacao() {
    const veiculosPorPlaca = new Map(veiculos.map((veiculo) => [String(veiculo.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), veiculo]));
    const despesasSelecionadas = linhas.filter((linha) => selecionados.includes(Number(linha.id)));
    const semPlaca = despesasSelecionadas.filter((linha) => !String(linha.placa ?? '').trim());
    if (semPlaca.length) {
      setErro(`Nao e permitido validar despesas sem placa: ${semPlaca.map((linha) => linha.numero_documento ?? linha.id).join(', ')}.`);
      return false;
    }

    const semVeiculo = despesasSelecionadas.filter((linha) => {
      const placa = String(linha.placa ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return placa && !veiculosPorPlaca.has(placa);
    });
    if (semVeiculo.length) {
      setErro(`Cadastre no Decis os veiculos antes de validar: ${[...new Set(semVeiculo.map((linha) => String(linha.placa).trim().toUpperCase()))].join(', ')}.`);
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
      setErro('Complete departamento e motorista dos veiculos selecionados para validar.');
      return false;
    }

    return true;
  }

  async function validar(validado: boolean) {
    setErro('');
    try {
      if (validado && !prepararPendenciasValidacao()) {
        return;
      }
      await validarDespesasFrota(selecionados, validado);
      setSelecionados([]);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao validar despesas.');
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
    await validarDespesasFrota(selecionados, true);
    setSelecionados([]);
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
    return String(linha[coluna] ?? '-');
  }

  function textoRelatorio(valor: unknown) {
    return String(valor ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function imprimirSelecionados() {
    const despesas = linhas.filter((linha) => selecionados.includes(Number(linha.id)));
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
      return `
        <section class="grupo">
          <h2>${textoRelatorio(fornecedor)} <small>${itens.length} documento(s) | ${moeda(totalFornecedor)}</small></h2>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Documento</th><th>Placa</th><th>Despesa</th><th>Qtd.</th><th>Vlr bruto</th><th>Desconto</th><th>Total</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map((linha) => `
                <tr class="${linha.cancelado ? 'cancelado' : ''}">
                  <td>${textoRelatorio(linha.data_hora)}</td>
                  <td>${textoRelatorio(linha.numero_documento)}</td>
                  <td>${textoRelatorio(linha.placa)}</td>
                  <td>${textoRelatorio(linha.descricao_despesa)}</td>
                  <td>${textoRelatorio(linha.quantidade)}</td>
                  <td>${moeda(linha.valor_bruto)}</td>
                  <td>${moeda(linha.desconto)}</td>
                  <td><strong>${moeda(linha.total)}</strong></td>
                  <td>${linha.cancelado ? 'Cancelado' : linha.validado ? 'Validado' : 'Pendente'}</td>
                </tr>
              `).join('')}
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
            .controls { width: 34px; height: 34px; object-fit: contain; opacity: .82; }
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
                <div class="meta">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
              </div>
            </div>
            <img class="controls" src="/brand/logo-s-novo.jpg" />
          </header>
          <section class="resumo">
            <div><span>Documentos</span><strong>${despesas.length}</strong></div>
            <div><span>Valor bruto</span><strong>${moeda(bruto)}</strong></div>
            <div><span>Desconto</span><strong>${moeda(desconto)}</strong></div>
            <div><span>Total</span><strong>${moeda(total)}</strong></div>
          </section>
          ${linhasHtml}
          <footer>CONTROL S CONSULTORIA - relatorio executivo de conferencia</footer>
          <script>window.onload = () => { window.focus(); window.print(); };</script>
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
              <thead><tr><th><input type="checkbox" checked={selecionados.length > 0 && selecionados.length === linhas.filter((l) => !l.integrado).length} onChange={(e) => setSelecionados(e.target.checked ? linhas.filter((l) => !l.integrado).map((l) => Number(l.id)) : [])} /></th>{colunasVisiveis.map((coluna) => <th key={coluna}>{coluna.replace(/_/g, ' ')}</th>)}<th>Acoes</th></tr></thead>
              <tbody>
                {linhas.map((linha) => {
                  const id = Number(linha.id);
                  const marcado = selecionados.includes(id);
                  return (
                    <tr key={id} className={`${detalhe?.id === linha.id ? 'linhaAtiva' : ''} ${linha.cancelado ? 'linhaCancelada' : ''}`}>
                      <td><input type="checkbox" disabled={Boolean(linha.integrado)} checked={marcado} onChange={(e) => setSelecionados(e.target.checked ? [...selecionados, id] : selecionados.filter((item) => item !== id))} /></td>
                      {colunasVisiveis.map((coluna) => <td key={coluna}>{formatarCelula(linha, coluna)}</td>)}
                      <td className="acoesTabela">
                        <button className="ghost" onClick={() => { setDetalhe(linha); abrirHistorico(id); }}><PanelRightOpen size={14} />Detalhe</button>
                      </td>
                    </tr>
                  );
                })}
                {linhas.length === 0 && <tr><td colSpan={colunasVisiveis.length + 2}>Nenhuma despesa encontrada para os filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {pendenciasVeiculos.length > 0 && (
        <div className="frotaModalOverlay" role="dialog" aria-modal="true" aria-label="Vincular veiculos">
          <button className="frotaModalFundo" type="button" aria-label="Fechar vinculos" onClick={() => setPendenciasVeiculos([])} />
          <section className="frotaModalDetalhe frotaModalCompacto">
            <header>
              <div>
                <span>Vinculos obrigatorios</span>
                <h3>Completar veiculos para validar</h3>
              </div>
              <button className="ghost" type="button" onClick={() => setPendenciasVeiculos([])}>Fechar</button>
            </header>
            <p className="textoApoio">Os veiculos existem no cadastro, mas precisam de motorista e departamento. Ao salvar, o cadastro do veiculo sera atualizado e a validacao continuara.</p>
            {pendenciasVeiculos.map((veiculo, indice) => (
              <div className="frotaVinculoVeiculo" key={String(veiculo.id)}>
                <strong>{String(veiculo.placa)} - {String(veiculo.modelo ?? 'Sem modelo')}</strong>
                <label>Departamento<select value={String(veiculo.departamento_id ?? '')} onChange={(e) => setPendenciasVeiculos(pendenciasVeiculos.map((item, itemIndice) => itemIndice === indice ? { ...item, departamento_id: e.target.value ? Number(e.target.value) : null } : item))}><option value="">Selecione</option>{departamentos.map((departamento) => <option key={String(departamento.id)} value={String(departamento.id)}>{String(departamento.descricao)}</option>)}</select></label>
                <label>Motorista<select value={String(veiculo.motorista_id ?? '')} onChange={(e) => setPendenciasVeiculos(pendenciasVeiculos.map((item, itemIndice) => itemIndice === indice ? { ...item, motorista_id: e.target.value ? Number(e.target.value) : null } : item))}><option value="">Selecione</option>{motoristas.map((motorista) => <option key={String(motorista.id)} value={String(motorista.id)}>{String(motorista.nome)}</option>)}</select></label>
              </div>
            ))}
            <button className="primary" onClick={salvarVinculosValidacaoPendentes}>Salvar vinculos e validar</button>
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
              {['numero_documento', 'fatura', 'fornecedor_nome', 'departamento_descricao', 'motorista_nome', 'tipo_despesa_descricao', 'descricao_despesa', 'hodometro', 'quantidade', 'valor_unitario', 'valor_unitario_liquido', 'valor_bruto', 'desconto', 'total', 'codigo_forma_pagamento_decis', 'descricao_forma_pagamento', 'dia_vencimento', 'data_vencimento', 'validado', 'integrado', 'cancelado', 'motivo_cancelamento_descricao', 'motivo_cancelamento_texto', 'origem_lancamento'].map((campo) => <p key={campo}><span>{campo.replace(/_/g, ' ')}</span><b>{formatarCelula(detalhe, campo)}</b></p>)}
            </div>
            <div className="historicoPainel frotaHistoricoMini">
              <strong><History size={16} />Historico</strong>
              {historico.length === 0 && <p>Nenhum historico encontrado.</p>}
              {historico.map((item) => <p key={String(item.id)}><strong>{String(item.operacao)}</strong><br />{String(item.criado_em)} - {String(item.usuario_nome ?? 'Sistema')}</p>)}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export function ConfiguracoesFrota() {
  const [dados, setDados] = useState<RegistroGenerico>({});
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    listarConfiguracoesFrota().then(setDados).catch(() => setDados({}));
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
        {['nome_modulo', 'status_modulo', 'moeda_padrao'].map((campo) => <label key={campo}>{campo.replace(/_/g, ' ')}<input value={String(dados[campo] ?? '')} onChange={(e) => setDados({ ...dados, [campo]: e.target.value })} /></label>)}
        {['permitir_reimportacao_nao_validada', 'bloquear_registro_integrado', 'atualizar_odometro_automaticamente'].map((campo) => <label key={campo}>{campo.replace(/_/g, ' ')}<input type="checkbox" checked={dados[campo] !== false} onChange={(e) => setDados({ ...dados, [campo]: e.target.checked })} /></label>)}
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

  useEffect(() => {
    listarDepartamentosFrota().then(setDepartamentos).catch(() => setDepartamentos([]));
    listarMotoristasFrota().then(setMotoristas).catch(() => setMotoristas([]));
    listarTiposDespesasFrota().then(setTipos).catch(() => setTipos([]));
    listarFornecedoresFrota().then(setFornecedores).catch(() => setFornecedores([]));
  }, [tela]);

  if (tela === 'frotaDashboard') return <DashboardFrota />;
  if (tela === 'frotaImportacao') return <ImportacaoFrota />;
  if (tela === 'frotaValidacao') return <ValidacaoFrota />;
  if (tela === 'frotaConfiguracoes') return <ConfiguracoesFrota />;
  if (tela === 'frotaDepartamentos') return <TabelaFrota titulo="Departamentos" subtitulo="Departamentos vinculados a empresa ativa pelo codigo da empresa." carregar={listarDepartamentosFrota} colunas={['codigo_decis', 'descricao', 'filial_decis', 'codigo_empresa', 'ativo']} salvar={salvarDepartamentoFrota} excluir={excluirDepartamentoFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'descricao', rotulo: 'Descricao' }, { nome: 'filial_decis', rotulo: 'Filial Decis' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaMotoristas') return <TabelaFrota titulo="Motoristas" subtitulo="Cadastro base de motoristas recebidos ou mantidos no HUB." carregar={listarMotoristasFrota} colunas={['codigo_decis', 'nome', 'ativo']} salvar={salvarMotoristaFrota} excluir={excluirMotoristaFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaVeiculos') return <TabelaFrota titulo="Veiculos" subtitulo="Placa unica, departamento, motorista e odometro protegido por regra de banco." carregar={listarVeiculosFrota} colunas={['codigo_decis', 'placa', 'modelo', 'departamento_descricao', 'motorista_nome', 'odometro_atual', 'ativo']} salvar={salvarVeiculoFrota} excluir={excluirVeiculoFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'placa', rotulo: 'Placa' }, { nome: 'modelo', rotulo: 'Modelo' }, { nome: 'departamento_id', rotulo: 'Departamento', tipo: 'select', opcoes: departamentos, textoOpcao: 'descricao' }, { nome: 'motorista_id', rotulo: 'Motorista', tipo: 'select', opcoes: motoristas, textoOpcao: 'nome' }, { nome: 'odometro_atual', rotulo: 'Odometro atual', tipo: 'number' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaTiposDespesas') return <TabelaFrota titulo="Tipos de Despesas" subtitulo="Tipos internos usados na classificacao das despesas importadas." carregar={listarTiposDespesasFrota} colunas={['codigo_decis', 'descricao', 'natureza_credito_decis', 'ativo']} salvar={salvarTipoDespesaFrota} excluir={excluirTipoDespesaFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'descricao', rotulo: 'Descricao' }, { nome: 'natureza_credito_decis', rotulo: 'Natureza de credito Decis', valorPadrao: '2' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaFornecedores') return <TabelaFrota titulo="Fornecedores" subtitulo="Fornecedores de despesas e suas descricoes de origem." carregar={listarFornecedoresFrota} colunas={['codigo_decis', 'nome', 'nome_fantasia', 'codigo_forma_pagamento_decis', 'descricao_forma_pagamento', 'dia_vencimento', 'natureza_credito_decis', 'grupo_custo_decis', 'conf_custo_decis', 'ativo']} salvar={salvarFornecedorFrota} excluir={excluirFornecedorFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'nome', rotulo: 'Nome' }, { nome: 'nome_fantasia', rotulo: 'Nome fantasia' }, { nome: 'codigo_forma_pagamento_decis', rotulo: 'Codigo Forma de Pagamento Decis' }, { nome: 'descricao_forma_pagamento', rotulo: 'Descricao forma de pagamento' }, { nome: 'dia_vencimento', rotulo: 'Dia de vencimento', tipo: 'number' }, { nome: 'natureza_credito_decis', rotulo: 'Nat de Credito Decis' }, { nome: 'grupo_custo_decis', rotulo: 'Grupo de Custo Decis' }, { nome: 'conf_custo_decis', rotulo: 'Conf Custo Decis' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  if (tela === 'frotaMotivosCancelamento') return <TabelaFrota titulo="Motivos de Cancelamento" subtitulo="Motivos usados para cancelar documentos de despesas na validacao." carregar={listarMotivosCancelamentoFrota} colunas={['codigo_decis', 'descricao', 'ativo']} salvar={salvarMotivoCancelamentoFrota} excluir={excluirMotivoCancelamentoFrota} campos={[{ nome: 'codigo_decis', rotulo: 'Codigo Decis' }, { nome: 'descricao', rotulo: 'Descricao' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
  return <TabelaFrota titulo="Despesa por Tipo" subtitulo="De/Para persistente entre descricao do fornecedor e tipo interno de despesa." carregar={listarDespesasTiposFrota} colunas={['descricao_despesa', 'tipo_despesa_descricao', 'fornecedor_nome', 'ativo']} salvar={salvarDespesaTipoFrota} excluir={excluirDespesaTipoFrota} campos={[{ nome: 'descricao_despesa', rotulo: 'Descricao da despesa' }, { nome: 'tipo_despesa_id', rotulo: 'Tipo da despesa', tipo: 'select', opcoes: tipos, textoOpcao: 'descricao' }, { nome: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'select', opcoes: fornecedores, textoOpcao: 'nome_fantasia' }, { nome: 'ativo', rotulo: 'Ativo', tipo: 'checkbox' }]} />;
}
