import { Activity, ArrowLeft, BarChart3, Copy, Database, Download, Eye, FileCode2, Filter, Info, LayoutDashboard, Maximize2, Monitor, PanelsTopLeft, Plus, RefreshCw, Save, Settings, Sparkles, Table2, Trash2, Upload, UserCheck, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
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
  return chave === 'valor'
    || chave.startsWith('valor_')
    || chave.includes('valor_total')
    || chave.includes('custo')
    || chave.includes('preco')
    || chave.includes('financeiro');
}

function rotuloCampoBi(campo: string) {
  const chave = normalizarChaveBi(campo);
  const rotulos: Record<string, string> = {
    valor: 'Valor',
    valor_monetario: 'Valor parado preço venda',
    valor_unitario: 'Custo unitário',
    valor_total_estoque: 'Valor custo estoque',
    valor_total_endereco: 'Valor custo endereço',
    valor_produtos_sem_giro_endereco: 'Valor parado preço venda',
    valor_vendido_ultimos_90_dias: 'Valor vendido 90 dias',
    saldo_estoque: 'Saldo estoque',
    saldo_disponivel: 'Saldo disponível',
    saldo_reservado: 'Saldo reservado',
    volume_unitario_m3: 'Volume unitário m3',
    volume_total_m3: 'Volume total m3',
    ocupacao_percentual: 'Ocupação percentual',
    quantidade_vendas_ultimos_90_dias: 'Vendas últimos 90 dias',
    quantidade_vendida_ultimos_90_dias: 'Quantidade vendida 90 dias',
    numeros_serie: 'Números de série',
    quantidade_numeros_serie: 'Qtd. números de série'
  };
  return rotulos[chave] ?? campo.replace(/_/g, ' ');
}

function formatarCampoBi(coluna: string, valor: unknown) {
  const chave = normalizarChaveBi(coluna);
  const numero = Number(valor);
  if (Number.isFinite(numero)) {
    if (chave.includes('ocupacao') || chave.includes('percentual') || chave.includes('porcentagem')) {
      return `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    }
    if (chave.includes('volume') || chave.endsWith('_m3')) {
      return `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} m3`;
    }
    if (chave.includes('peso') || chave.endsWith('_kg')) {
      return `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
    }
  }
  return formatarValorBi(valor, colunaValorBi(coluna));
}

function formatarCampoGraficoBi(coluna: string, valor: unknown, contexto = '') {
  const chave = normalizarChaveBi(coluna);
  const contextoNormalizado = normalizarChaveBi(contexto);
  if (chave === 'valor') {
    if (contextoNormalizado.includes('ocupacao') || contextoNormalizado.includes('percentual')) {
      return formatarCampoBi('ocupacao_percentual', valor);
    }
    if (contextoNormalizado.includes('volume')) {
      return formatarCampoBi('volume_total_m3', valor);
    }
    if (contextoNormalizado.includes('quantidade') || contextoNormalizado.includes('produto') || contextoNormalizado.includes('sku') || contextoNormalizado.includes('giro') || contextoNormalizado.includes('localizacao')) {
      return formatarValorBi(valor);
    }
  }
  return formatarCampoBi(coluna, valor);
}

function formatarCelulaBi(coluna: string, valor: unknown) {
  if (colunaPedidoBi(coluna)) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? String(Math.trunc(numero)) : String(valor ?? '-');
  }
  return formatarCampoBi(coluna, valor);
}

function rotuloMetricaKpi(campo: string) {
  const rotulos: Record<string, string> = {
    pedidos_do_dia: 'Pedidos do dia',
    pedidos_maior_1_dia: 'Pedidos > 1 dia',
    aguardando_faturamento: 'Aguardando faturamento',
    aguardando_escolha_transportadora: 'Aguardando escolha da transportadora'
  };
  return rotulos[campo] ?? rotuloCampoBi(campo);
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
            {colunas.map((coluna) => <th key={coluna}>{rotuloCampoBi(coluna)}</th>)}
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

function obterCampoNumericoBi(registros: RegistroGenerico[], preferidos: string[]) {
  const colunas = Array.from(new Set(registros.flatMap((registro) => Object.keys(registro))));
  return preferidos.flatMap((preferido) => [
      colunas.find((coluna) => normalizarChaveBi(coluna) === normalizarChaveBi(preferido)),
      colunas.find((coluna) => normalizarChaveBi(coluna).includes(normalizarChaveBi(preferido)))
    ]).find(Boolean)
    ?? colunas.find((coluna) => registros.some((registro) => Number.isFinite(Number(registro[coluna]))))
    ?? 'valor';
}

function obterCampoRotuloBi(registros: RegistroGenerico[], preferidos: string[]) {
  const colunas = Array.from(new Set(registros.flatMap((registro) => Object.keys(registro))));
  return preferidos.find((coluna) => colunas.includes(coluna)) ?? colunas[0] ?? 'categoria';
}

function BiGraficoBarras({ registros, cor, titulo = '' }: { registros: RegistroGenerico[]; cor: string; titulo?: string }) {
  const campoRotulo = obterCampoRotuloBi(registros, ['categoria', 'marca_nome', 'categoria_nome', 'setor', 'rua', 'produto_codigo']);
  const campoValor = obterCampoNumericoBi(registros, ['ocupacao', 'percentual', 'valor_total_estoque', 'volume_total_m3', 'quantidade', 'total', 'valor']);
  const maiorValor = Math.max(1, ...registros.map((registro) => Number(registro[campoValor] ?? 0)));

  return (
    <div className="biGraficoBarras">
      {registros.slice(0, 12).map((registro, indice) => {
        const valor = Number(registro[campoValor] ?? 0);
        return (
          <div key={`${String(registro[campoRotulo])}-${indice}`} className="biBarraLinha">
            <span>{String(registro[campoRotulo] ?? '-')}</span>
            <strong>{formatarCampoGraficoBi(campoValor, valor, titulo)}</strong>
            <i style={{ width: `${Math.max(3, (valor / maiorValor) * 100)}%`, background: cor }} />
          </div>
        );
      })}
    </div>
  );
}

function BiGraficoRosca({ registros, cor, titulo = '' }: { registros: RegistroGenerico[]; cor: string; titulo?: string }) {
  const campoRotulo = obterCampoRotuloBi(registros, ['categoria', 'classificacao_giro', 'situacao']);
  const campoValor = obterCampoNumericoBi(registros, ['valor', 'quantidade', 'total']);
  const paleta = [cor, '#16a34a', '#f59e0b', '#dc2626', '#0891b2', '#7c3aed', '#64748b'];
  const total = registros.reduce((soma, registro) => soma + Math.max(0, Number(registro[campoValor] ?? 0)), 0);
  let acumulado = 0;
  const segmentos = total > 0
    ? registros.map((registro, indice) => {
        const valor = Math.max(0, Number(registro[campoValor] ?? 0));
        const inicio = acumulado;
        const fim = acumulado + (valor / total) * 100;
        acumulado = fim;
        return `${paleta[indice % paleta.length]} ${inicio}% ${fim}%`;
      }).join(', ')
    : '#e2e8f0 0% 100%';

  return (
    <div className="biRoscaPainel">
      <div className="biRosca" style={{ background: `conic-gradient(${segmentos})` }}>
        <strong>{formatarCampoGraficoBi(campoValor, total, titulo)}</strong>
        <span>Total</span>
      </div>
      <div className="biRoscaLegenda">
        {registros.slice(0, 7).map((registro, indice) => (
          <div key={`${String(registro[campoRotulo])}-${indice}`}>
            <i style={{ background: paleta[indice % paleta.length] }} />
            <span>{String(registro[campoRotulo] ?? '-')}</span>
            <strong>{formatarCampoGraficoBi(campoValor, registro[campoValor], titulo)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function BiRanking({ registros, colunas, cor }: { registros: RegistroGenerico[]; colunas: string[]; cor: string }) {
  const campoTitulo = colunas.find((coluna) => coluna.includes('descricao')) ?? colunas[1] ?? colunas[0];
  const campoCodigo = colunas.find((coluna) => coluna.includes('codigo')) ?? colunas[0];
  const campoValor = colunas.find((coluna) => colunaValorBi(coluna)) ?? obterCampoNumericoBi(registros, ['valor_total_estoque', 'volume_total_m3', 'valor']);
  const maiorValor = Math.max(1, ...registros.map((registro) => Number(registro[campoValor] ?? 0)));

  return (
    <div className="biRanking">
      {registros.slice(0, 10).map((registro, indice) => {
        const valor = Number(registro[campoValor] ?? 0);
        return (
          <button key={`${String(registro[campoCodigo])}-${indice}`} type="button" className="biRankingItem" title="Abrir detalhe do item">
            <b>{String(indice + 1).padStart(2, '0')}</b>
            <div>
              <strong>{String(registro[campoTitulo] ?? registro[campoCodigo] ?? '-')}</strong>
              <span>{String(registro[campoCodigo] ?? '')} {registro.classificacao_giro ? `- ${String(registro.classificacao_giro)}` : ''}</span>
              <i style={{ width: `${Math.max(4, (valor / maiorValor) * 100)}%`, background: cor }} />
            </div>
            <em>{formatarValorBi(registro[campoValor], colunaValorBi(campoValor))}</em>
          </button>
        );
      })}
    </div>
  );
}

function corEnderecoMapaBi(registro: RegistroGenerico) {
  if (String(registro.localizacao_bloqueada) === 'true') return '#1f2937';
  if (Number(registro.quantidade_produtos_sem_giro_endereco ?? 0) > 0) return '#7c3aed';
  const ocupacao = Number(registro.ocupacao_percentual);
  if (!Number.isFinite(ocupacao)) return '#94a3b8';
  if (ocupacao >= 100) return '#dc2626';
  if (ocupacao >= 80) return '#f97316';
  if (ocupacao >= 50) return '#f59e0b';
  return '#16a34a';
}

function corEnderecoMapaPorModoBi(registro: RegistroGenerico, modo: string) {
  const valor = (campo: string) => Number(registro[campo] ?? 0);
  if (registro.__livre) return '#16a34a';
  if (modo === 'giro') return valor('quantidade_produtos_sem_giro_endereco') > 0 ? '#7c3aed' : '#16a34a';
  if (modo === 'valor') {
    const total = valor('valor_total_endereco');
    if (total >= 180000) return '#dc2626';
    if (total >= 100000) return '#f97316';
    if (total >= 50000) return '#f59e0b';
    return '#16a34a';
  }
  if (modo === 'volume') {
    const volume = valor('volume_ocupado_m3');
    if (volume >= 10) return '#dc2626';
    if (volume >= 6) return '#f97316';
    if (volume >= 2) return '#f59e0b';
    return '#16a34a';
  }
  if (modo === 'skus') {
    const skus = valor('quantidade_skus_endereco');
    if (skus >= 3) return '#dc2626';
    if (skus === 2) return '#f59e0b';
    return '#16a34a';
  }
  return corEnderecoMapaBi(registro);
}

type ConfiguracaoRuaMapaBi = {
  barracao: string;
  rua: string;
  setor: string;
  colunas: number;
  niveis: number;
  posicoes: number;
  larguraCm: number;
  profundidadeCm: number;
  alturaNivelCm: number;
  capacidadeM3: number;
};

const CHAVE_ESTRUTURA_MAPA_CD_BI = 'bi_estoque_cd_estrutura_mapa_v2';
const RUAS_PADRAO_BARRACAO_MAPA_BI = Array.from({ length: 15 }, (_, indice) => nomeSequencialMapaBi('R', indice + 1));

function extrairNumeroMapaBi(valor: unknown, fallback = 1) {
  const encontrado = String(valor ?? '').match(/\d+/)?.[0];
  const numero = Number(encontrado ?? fallback);
  return Number.isFinite(numero) && numero > 0 ? numero : fallback;
}

function nomeSequencialMapaBi(prefixo: string, indice: number) {
  return `${prefixo}${String(indice).padStart(2, '0')}`;
}

function chaveEnderecoMapaBi(registro: RegistroGenerico) {
  return [
    String(registro.barracao ?? registro.deposito_nome ?? 'Barracao 01'),
    String(registro.rua ?? 'Sem rua'),
    String(registro.coluna ?? 'C01'),
    String(registro.nivel ?? 'N01'),
    String(registro.posicao ?? 'P01')
  ].join('|');
}

function consolidarEnderecosMapaBi(registros: RegistroGenerico[]) {
  const mapa = new Map<string, RegistroGenerico>();
  registros.forEach((registro) => {
    const chave = chaveEnderecoMapaBi(registro);
    const atual = mapa.get(chave);
    if (!atual) {
      mapa.set(chave, { ...registro });
      return;
    }
    const somar = [
      'quantidade_skus_endereco',
      'quantidade_itens_endereco',
      'quantidade_numeros_serie_endereco',
      'valor_total_endereco',
      'volume_total_endereco',
      'volume_ocupado_m3',
      'peso_ocupado_kg',
      'quantidade_produtos_sem_giro_endereco',
      'valor_produtos_sem_giro_endereco',
      'volume_produtos_sem_giro_endereco'
    ];
    somar.forEach((campo) => {
      const total = Number(atual[campo] ?? 0) + Number(registro[campo] ?? 0);
      if (Number.isFinite(total)) atual[campo] = total;
    });
    const capacidade = Number(atual.capacidade_util_volume_m3 ?? registro.capacidade_util_volume_m3);
    const volume = Number(atual.volume_ocupado_m3 ?? 0);
    atual.ocupacao_percentual = Number.isFinite(capacidade) && capacidade > 0 ? (volume / capacidade) * 100 : null;
    atual.detalhes_json = [
      ...(Array.isArray(atual.detalhes_json) ? atual.detalhes_json : []),
      ...(Array.isArray(registro.detalhes_json) ? registro.detalhes_json : [registro])
    ];
  });
  return mapa;
}

function estruturaPadraoMapaBi(registros: RegistroGenerico[]): ConfiguracaoRuaMapaBi[] {
  const porRua = new Map<string, RegistroGenerico[]>();
  registros.forEach((registro) => {
    const rua = String(registro.rua ?? 'R01');
    porRua.set(rua, [...(porRua.get(rua) ?? []), registro]);
  });
  const ruas = Array.from(new Set([...RUAS_PADRAO_BARRACAO_MAPA_BI, ...porRua.keys()]))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  const base = ruas.map((rua, indiceRua) => {
    const itens = porRua.get(rua) ?? [];
    const maiorColuna = Math.max(1, ...itens.map((item) => extrairNumeroMapaBi(item.coluna)));
    const maiorNivel = Math.max(1, ...itens.map((item) => extrairNumeroMapaBi(item.nivel)));
    const maiorPosicao = Math.max(1, ...itens.map((item) => extrairNumeroMapaBi(item.posicao)));
    const capacidadeMedia = itens
      .map((item) => Number(item.capacidade_util_volume_m3))
      .filter((valor) => Number.isFinite(valor) && valor > 0);
    return {
      barracao: String(itens[0]?.barracao ?? itens[0]?.deposito_nome ?? 'Barracao 01'),
      rua,
      setor: String(itens[0]?.setor ?? `S${Math.floor(indiceRua / 5) + 1}`),
      colunas: Math.max(maiorColuna, 16),
      niveis: Math.max(maiorNivel, 4),
      posicoes: Math.max(maiorPosicao, 2),
      larguraCm: 120,
      profundidadeCm: 110,
      alturaNivelCm: 95,
      capacidadeM3: capacidadeMedia.length
        ? Number((capacidadeMedia.reduce((soma, valor) => soma + valor, 0) / capacidadeMedia.length).toFixed(2))
        : 1.25
    };
  });
  return base.length ? base : RUAS_PADRAO_BARRACAO_MAPA_BI.map((rua, indiceRua) => ({
    barracao: 'Barracao 01',
    rua,
    setor: `S${Math.floor(indiceRua / 5) + 1}`,
    colunas: 16,
    niveis: 4,
    posicoes: 2,
    larguraCm: 120,
    profundidadeCm: 110,
    alturaNivelCm: 95,
    capacidadeM3: 1.25
  }));
}

function textoEstruturaMapaBi(estrutura: ConfiguracaoRuaMapaBi[]) {
  return estrutura.map((rua) => [
    `barracao=${rua.barracao || 'Barracao 01'}`,
    `rua=${rua.rua}`,
    `setor=${rua.setor || '-'}`,
    `colunas=${rua.colunas}`,
    `niveis=${rua.niveis}`,
    `posicoes=${rua.posicoes}`,
    `largura_cm=${rua.larguraCm}`,
    `profundidade_cm=${rua.profundidadeCm}`,
    `altura_nivel_cm=${rua.alturaNivelCm}`,
    `capacidade_m3=${rua.capacidadeM3}`
  ].join('; ')).join('\n');
}

function lerEstruturaMapaBi(registros: RegistroGenerico[]) {
  try {
    const salvo = window.localStorage.getItem(CHAVE_ESTRUTURA_MAPA_CD_BI);
    if (salvo) {
      const estrutura = JSON.parse(salvo) as ConfiguracaoRuaMapaBi[];
      if (Array.isArray(estrutura) && estrutura.length) return estrutura;
    }
  } catch {
    return estruturaPadraoMapaBi(registros);
  }
  return estruturaPadraoMapaBi(registros);
}

function parseEstruturaMapaBi(texto: string, registros: RegistroGenerico[]) {
  const linhas = texto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  const estrutura = linhas.map((linha) => {
    const partes = Object.fromEntries(linha.split(';').map((parte) => {
      const [campo, ...resto] = parte.split('=');
      return [normalizarChaveBi(campo ?? ''), resto.join('=').trim()];
    }).filter(([campo]) => campo));
    return {
      barracao: partes.barracao || partes.barracão || partes.deposito || 'Barracao 01',
      rua: partes.rua || partes.endereco || 'R01',
      setor: partes.setor === '-' ? '' : partes.setor || '',
      colunas: Math.max(1, Number(partes.colunas ?? 1)),
      niveis: Math.max(1, Number(partes.niveis ?? 1)),
      posicoes: Math.max(1, Number(partes.posicoes ?? 1)),
      larguraCm: Math.max(1, Number(partes.largura_cm ?? partes.largura ?? 120)),
      profundidadeCm: Math.max(1, Number(partes.profundidade_cm ?? partes.profundidade ?? 110)),
      alturaNivelCm: Math.max(1, Number(partes.altura_nivel_cm ?? partes.altura_cm ?? 95)),
      capacidadeM3: Math.max(0, Number(partes.capacidade_m3 ?? 1.25))
    };
  }).filter((item) => item.rua && Number.isFinite(item.colunas) && Number.isFinite(item.niveis) && Number.isFinite(item.posicoes));
  return estrutura.length ? estrutura : estruturaPadraoMapaBi(registros);
}

function gerarPosicoesCompletasMapaBi(registros: RegistroGenerico[], estrutura: ConfiguracaoRuaMapaBi[]) {
  const enderecosOcupados = consolidarEnderecosMapaBi(registros);
  const posicoes: RegistroGenerico[] = [];
  estrutura.forEach((ruaConfig) => {
    for (let colunaIndice = 1; colunaIndice <= ruaConfig.colunas; colunaIndice += 1) {
      for (let nivelIndice = 1; nivelIndice <= ruaConfig.niveis; nivelIndice += 1) {
        for (let posicaoIndice = 1; posicaoIndice <= ruaConfig.posicoes; posicaoIndice += 1) {
          const enderecoBase = {
            barracao: ruaConfig.barracao || 'Barracao 01',
            setor: ruaConfig.setor || undefined,
            rua: ruaConfig.rua,
            coluna: nomeSequencialMapaBi('C', colunaIndice),
            nivel: nomeSequencialMapaBi('N', nivelIndice),
            posicao: nomeSequencialMapaBi('P', posicaoIndice)
          };
          const chave = chaveEnderecoMapaBi(enderecoBase);
          const ocupado = enderecosOcupados.get(chave);
          const capacidade = Number(ocupado?.capacidade_util_volume_m3 ?? ruaConfig.capacidadeM3);
          const volume = Number(ocupado?.volume_ocupado_m3 ?? ocupado?.volume_total_endereco ?? 0);
          posicoes.push({
            ...enderecoBase,
            endereco_completo: ocupado?.endereco_completo ?? `${enderecoBase.barracao}-${ruaConfig.setor ? `${ruaConfig.setor}-` : ''}${ruaConfig.rua}-${enderecoBase.coluna}-${enderecoBase.nivel}-${enderecoBase.posicao}`,
            tipo_estrutura: ocupado?.tipo_estrutura ?? 'Porta-palete',
            localizacao_bloqueada: ocupado?.localizacao_bloqueada ?? false,
            capacidade_util_volume_m3: Number.isFinite(capacidade) && capacidade > 0 ? capacidade : null,
            volume_ocupado_m3: Number.isFinite(volume) ? volume : 0,
            ocupacao_percentual: Number.isFinite(capacidade) && capacidade > 0 ? (volume / capacidade) * 100 : null,
            quantidade_skus_endereco: ocupado?.quantidade_skus_endereco ?? 0,
            quantidade_itens_endereco: ocupado?.quantidade_itens_endereco ?? 0,
            quantidade_numeros_serie_endereco: ocupado?.quantidade_numeros_serie_endereco ?? 0,
            valor_total_endereco: ocupado?.valor_total_endereco ?? 0,
            peso_ocupado_kg: ocupado?.peso_ocupado_kg ?? 0,
            quantidade_produtos_sem_giro_endereco: ocupado?.quantidade_produtos_sem_giro_endereco ?? 0,
            detalhes_json: ocupado?.detalhes_json ?? [],
            __livre: !ocupado,
            __estrutura: true,
            __dimensoes: `${ruaConfig.larguraCm} x ${ruaConfig.profundidadeCm} x ${ruaConfig.alturaNivelCm} cm`
          });
        }
      }
    }
  });
  return posicoes;
}

function BiMapaCd({ registros }: { registros: RegistroGenerico[] }) {
  const compararNatural = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
  const chaveRegistros = useMemo(() => registros.map((registro) => String(registro.endereco_completo ?? registro.produto_id ?? '')).join('|'), [registros]);
  const [estrutura, setEstrutura] = useState<ConfiguracaoRuaMapaBi[]>(() => lerEstruturaMapaBi(registros));
  const [textoEstrutura, setTextoEstrutura] = useState(() => textoEstruturaMapaBi(lerEstruturaMapaBi(registros)));
  const [estruturaAberta, setEstruturaAberta] = useState(false);
  const posicoesMapa = useMemo(() => gerarPosicoesCompletasMapaBi(registros, estrutura), [registros, estrutura]);
  const barracoes = useMemo(() => Array.from(new Set(posicoesMapa.map((registro) => String(registro.barracao ?? 'Barracao 01')))).sort(compararNatural), [posicoesMapa]);
  const [focoBarracao, setFocoBarracao] = useState('');
  const ruas = useMemo(() => Array.from(new Set(posicoesMapa.map((registro) => String(registro.rua ?? 'Sem rua')))).sort(compararNatural), [posicoesMapa]);
  const [selecionado, setSelecionado] = useState<RegistroGenerico | null>(posicoesMapa.find((item) => !item.__livre) ?? posicoesMapa[0] ?? null);
  const [modoCor, setModoCor] = useState('ocupacao');
  const [zoom, setZoom] = useState(0.68);
  const [rotacao, setRotacao] = useState(-20);
  const [focoRua, setFocoRua] = useState('');
  const posicoesFiltradas = useMemo(() => posicoesMapa.filter((registro) =>
    (!focoBarracao || String(registro.barracao ?? 'Barracao 01') === focoBarracao)
    && (!focoRua || String(registro.rua ?? 'Sem rua') === focoRua)
  ), [posicoesMapa, focoBarracao, focoRua]);
  const ruasVisiveis = useMemo(() => Array.from(new Set(posicoesFiltradas.map((registro) => String(registro.rua ?? 'Sem rua')))).sort(compararNatural), [posicoesFiltradas]);
  const enderecosVisiveis = posicoesFiltradas;
  const ruasEstruturadas = useMemo(() => ruasVisiveis.map((rua) => {
    const itensRua = posicoesFiltradas.filter((registro) => String(registro.rua ?? 'Sem rua') === rua);
    const colunas = Array.from(new Set(itensRua.map((registro) => String(registro.coluna ?? 'S/C')))).sort(compararNatural);
    return { rua, itensRua, colunas };
  }), [ruasVisiveis, posicoesFiltradas]);
  const totalOcupados = useMemo(() => posicoesMapa.filter((item) => !item.__livre).length, [posicoesMapa]);
  const totalLivres = useMemo(() => posicoesMapa.filter((item) => item.__livre).length, [posicoesMapa]);
  const renderDetalhado = Boolean(focoRua) || posicoesFiltradas.length <= 360;

  useEffect(() => {
    const primeiroOcupado = posicoesMapa.find((item) => !item.__livre) ?? null;
    setSelecionado(primeiroOcupado ?? posicoesMapa[0] ?? null);
    if (registros.length > 0 && registros.length <= 5 && primeiroOcupado?.rua) {
      setFocoBarracao(String(primeiroOcupado.barracao ?? 'Barracao 01'));
      setFocoRua(String(primeiroOcupado.rua));
      setZoom(1.05);
      setRotacao(-8);
      return;
    }
    setFocoRua('');
    setFocoBarracao('');
    setZoom(0.68);
    setRotacao(-20);
  }, [chaveRegistros]);

  function focarEnderecoMapa(registro?: RegistroGenerico | null) {
    const alvo = registro && !registro.__livre ? registro : posicoesMapa.find((item) => !item.__livre);
    if (!alvo) return;
    setSelecionado(alvo);
    setFocoBarracao(String(alvo.barracao ?? 'Barracao 01'));
    setFocoRua(String(alvo.rua ?? 'Sem rua'));
    setZoom(1.08);
    setRotacao(-8);
  }

  function resumoColunaMapa(itensColuna: RegistroGenerico[]) {
    const ocupados = itensColuna.filter((item) => !item.__livre);
    const principal = ocupados[0] ?? itensColuna[0] ?? null;
    const volume = ocupados.reduce((total, item) => total + Number(item.volume_ocupado_m3 ?? 0), 0);
    const skus = ocupados.reduce((total, item) => total + Number(item.quantidade_skus_endereco ?? 0), 0);
    const semGiro = ocupados.some((item) => Number(item.quantidade_produtos_sem_giro_endereco ?? 0) > 0);
    const capacidade = itensColuna.reduce((total, item) => total + Number(item.capacidade_util_volume_m3 ?? 0), 0);
    const ocupacao = capacidade > 0 ? (volume / capacidade) * 100 : null;
    return { principal, ocupados, volume, skus, semGiro, ocupacao };
  }

  function salvarEstrutura() {
    const proxima = parseEstruturaMapaBi(textoEstrutura, registros);
    setEstrutura(proxima);
    setTextoEstrutura(textoEstruturaMapaBi(proxima));
    window.localStorage.setItem(CHAVE_ESTRUTURA_MAPA_CD_BI, JSON.stringify(proxima));
    setEstruturaAberta(false);
  }

  function gerarEstruturaDosDados() {
    const proxima = estruturaPadraoMapaBi(registros);
    setEstrutura(proxima);
    setTextoEstrutura(textoEstruturaMapaBi(proxima));
  }

  function limparEstrutura() {
    const proxima = estruturaPadraoMapaBi(registros);
    window.localStorage.removeItem(CHAVE_ESTRUTURA_MAPA_CD_BI);
    setEstrutura(proxima);
    setTextoEstrutura(textoEstruturaMapaBi(proxima));
  }

  function fecharCadastroEstrutura() {
    document.querySelectorAll('.biMapaEstruturaOverlay').forEach((elemento) => elemento.remove());
    window.setTimeout(() => setEstruturaAberta(false), 0);
  }

  useEffect(() => {
    if (!estruturaAberta) return;
    const fecharPorAtributo = (evento: Event) => {
      const alvo = evento.target instanceof Element ? evento.target : null;
      if (!alvo?.closest('[data-bi-fechar-estrutura="true"]')) return;
      evento.preventDefault();
      evento.stopPropagation();
      fecharCadastroEstrutura();
    };
    document.addEventListener('pointerup', fecharPorAtributo, true);
    document.addEventListener('click', fecharPorAtributo, true);
    return () => {
      document.removeEventListener('pointerup', fecharPorAtributo, true);
      document.removeEventListener('click', fecharPorAtributo, true);
    };
  }, [estruturaAberta]);

  return (
    <div className="biMapaCd">
      <div className="biMapaToolbar">
        <div>
          <strong>Mapa 3D completo</strong>
          <span>{enderecosVisiveis.length} posições · {totalOcupados} ocupadas · {totalLivres} livres</span>
        </div>
        <label>
          Cor
          <select value={modoCor} onChange={(evento) => setModoCor(evento.target.value)}>
            <option value="ocupacao">Ocupação</option>
            <option value="giro">Giro</option>
            <option value="valor">Valor</option>
            <option value="volume">Volume</option>
            <option value="skus">Quantidade de SKUs</option>
          </select>
        </label>
        <label>
          Barracão
          <select value={focoBarracao} onChange={(evento) => setFocoBarracao(evento.target.value)}>
            <option value="">Todos</option>
            {barracoes.map((barracao) => <option key={barracao} value={barracao}>{barracao}</option>)}
          </select>
        </label>
        <label>
          Rua
          <select value={focoRua} onChange={(evento) => {
            setFocoRua(evento.target.value);
            setZoom(evento.target.value ? 1.02 : 0.68);
          }}>
            <option value="">Todas</option>
            {ruas.map((rua) => <option key={rua} value={rua}>{rua}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setZoom((atual) => Math.max(0.5, Number((atual - 0.1).toFixed(2))))}>-</button>
        <button type="button" onClick={() => setZoom((atual) => Math.min(1.25, Number((atual + 0.1).toFixed(2))))}>+</button>
        <button type="button" onClick={() => setRotacao((atual) => atual - 8)}>Girar</button>
        <button type="button" onClick={() => focarEnderecoMapa(selecionado)}>Entrar no produto</button>
        <button type="button" onClick={() => { setZoom(0.68); setRotacao(-20); setFocoRua(''); setFocoBarracao(''); }}>Visão geral</button>
        <button type="button" onClick={() => setEstruturaAberta((atual) => !atual)}><Settings size={15} /> {estruturaAberta ? 'Fechar estrutura' : 'Estrutura do CD'}</button>
      </div>
      {estruturaAberta && (
        <section className="biMapaEstruturaInline" aria-label="Cadastro da estrutura do Centro de Distribuicao">
          <header>
            <div>
              <span>Cadastro do mapa físico</span>
              <h3>Estrutura completa do CD</h3>
              <p>Informe uma rua por linha. O mapa 3D usa este cadastro para desenhar posições livres e ocupadas.</p>
            </div>
            <button type="button" onClick={() => setEstruturaAberta(false)} aria-label="Fechar cadastro da estrutura"><X size={18} /></button>
          </header>
          <textarea
            value={textoEstrutura}
            onChange={(evento) => setTextoEstrutura(evento.target.value)}
            spellCheck={false}
          />
          <div className="biMapaEstruturaAjuda">
            <strong>Formato</strong>
            <span>rua=R01; setor=S1; colunas=8; niveis=4; posicoes=3; largura_cm=120; profundidade_cm=110; altura_nivel_cm=95; capacidade_m3=1.25</span>
          </div>
          <footer>
            <button type="button" onClick={limparEstrutura}>Limpar cadastro</button>
            <button type="button" onClick={gerarEstruturaDosDados}>Gerar pelos dados</button>
            <button type="button" className="primary" onClick={salvarEstrutura}><Save size={16} />Salvar estrutura</button>
          </footer>
        </section>
      )}
      <div className="biMapaCena" role="img" aria-label="Mapa logico tridimensional do Centro de Distribuicao">
        <div className="biMapaPerspectivaInfo">
          <strong>Estoque vertical</strong>
          <span>Planta horizontal do barracao com armazenagem vertical</span>
        </div>
        <div className="biMapaPlano" style={{ '--bi-mapa-zoom': zoom, '--bi-mapa-rotacao': `${rotacao}deg` } as CSSProperties}>
          {ruasEstruturadas.map(({ rua, itensRua, colunas }, indiceRua) => (
            <div key={rua} className="biMapaRua" style={{ '--rua-offset': indiceRua, '--qtd-colunas': colunas.length } as CSSProperties}>
              <span>{rua}</span>
              <div className="biMapaCorredor" />
              <div className="biMapaEstruturas">
                {colunas.map((coluna) => {
                  const itensColuna = itensRua
                    .filter((registro) => String(registro.coluna ?? 'S/C') === coluna)
                    .sort((a, b) => compararNatural(String(b.nivel ?? ''), String(a.nivel ?? '')));
                  return (
                    <div key={`${rua}-${coluna}`} className="biMapaColuna">
                      <strong>{coluna}</strong>
                      <div>
                        {!renderDetalhado ? (() => {
                          const resumo = resumoColunaMapa(itensColuna);
                          const selecionadoNaColuna = Boolean(selecionado && itensColuna.some((item) => item.endereco_completo === selecionado.endereco_completo));
                          return (
                            <button
                              type="button"
                              className={`biMapaPilhaResumo ${selecionadoNaColuna ? 'selecionado' : ''} ${resumo.ocupados.length ? 'ocupado' : 'livre'} ${resumo.semGiro ? 'semGiro' : ''}`}
                              onClick={() => setSelecionado(resumo.principal)}
                              onDoubleClick={() => focarEnderecoMapa(resumo.principal)}
                              title={`${rua}-${coluna} - ${resumo.ocupados.length} posicoes ocupadas. Duplo clique para entrar na rua.`}
                              style={{
                                '--endereco-cor': resumo.semGiro ? '#7c3aed' : resumo.principal ? corEnderecoMapaPorModoBi({ ...resumo.principal, ocupacao_percentual: resumo.ocupacao, quantidade_skus_endereco: resumo.skus, volume_ocupado_m3: resumo.volume }, modoCor) : '#16a34a',
                                '--ocupacao-altura': `${Math.max(8, Math.min(100, Number.isFinite(Number(resumo.ocupacao)) ? Number(resumo.ocupacao) : 0))}%`
                              } as CSSProperties}
                            >
                              <span>{coluna}</span>
                            </button>
                          );
                        })() : itensColuna.map((registro, indice) => {
                          const selecionadoAtual = selecionado?.endereco_completo === registro.endereco_completo;
                          const ocupacao = Number(registro.ocupacao_percentual);
                          return (
                            <button
                              key={`${String(registro.endereco_completo ?? `${rua}-${coluna}`)}-${String(registro.localizacao_id ?? registro.produto_id ?? '')}-${indice}`}
                              type="button"
                              className={`${selecionadoAtual ? 'selecionado' : ''} ${registro.__livre ? 'livre' : 'ocupado'}`}
                              onClick={() => setSelecionado(registro)}
                              title={`${String(registro.endereco_completo)} - ${registro.__livre ? 'livre' : registro.ocupacao_percentual === null ? 'capacidade nao informada' : `${formatarValorBi(registro.ocupacao_percentual)}% ocupacao`}`}
                              style={{
                                '--endereco-cor': corEnderecoMapaPorModoBi(registro, modoCor),
                                '--ocupacao-altura': `${Math.max(8, Math.min(100, Number.isFinite(ocupacao) ? ocupacao : 0))}%`
                              } as CSSProperties}
                            >
                              <span>{String(registro.nivel ?? '-')}</span>
                              <b>{String(registro.posicao ?? '-')}</b>
                              <small>{formatarValorBi(registro.quantidade_itens_endereco ?? 0)}</small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="biMapaDetalhe">
        <strong>{String(selecionado?.endereco_completo ?? 'Selecione um endereco')}</strong>
        <div><span>Situação</span><b>{selecionado?.__livre ? 'Livre' : String(selecionado?.localizacao_bloqueada) === 'true' ? 'Bloqueado' : 'Ocupado'}</b></div>
        <div><span>Ocupacao</span><b>{selecionado?.ocupacao_percentual === null || selecionado?.ocupacao_percentual === undefined ? 'Capacidade nao informada' : `${formatarValorBi(selecionado.ocupacao_percentual)}%`}</b></div>
        <div><span>SKUs</span><b>{formatarValorBi(selecionado?.quantidade_skus_endereco ?? 0)}</b></div>
        <div><span>Itens</span><b>{formatarValorBi(selecionado?.quantidade_itens_endereco ?? 0)}</b></div>
        <div><span>Volume</span><b>{formatarValorBi(selecionado?.volume_ocupado_m3 ?? 0)} m3</b></div>
        <small>{String(selecionado?.setor ?? '-')} · {String(selecionado?.__dimensoes ?? 'dimensao nao informada')}</small>
      </aside>
      <div className="biMapaLegenda">
        {[
          ['#16a34a', 'Livre/baixa'], ['#f59e0b', 'Intermediaria'], ['#f97316', 'Alta'],
          ['#dc2626', 'Lotado'], ['#7c3aed', 'Sem giro'], ['#94a3b8', 'Sem capacidade'], ['#1f2937', 'Bloqueado']
        ].map(([cor, label]) => <span key={label}><i style={{ background: cor }} />{label}</span>)}
      </div>
      {false && estruturaAberta && (
        <div className="biMapaEstruturaOverlay" role="dialog" aria-modal="true" aria-label="Cadastro da estrutura do Centro de Distribuicao">
          <section className="biMapaEstruturaModal">
            <header>
              <div>
                <span>Cadastro do mapa físico</span>
                <h3>Estrutura completa do CD</h3>
                <p>Informe uma rua por linha. O mapa 3D usa este cadastro para desenhar posições livres e ocupadas.</p>
              </div>
              <button
                type="button"
                onMouseUp={(evento) => {
                  evento.preventDefault();
                  evento.stopPropagation();
                  fecharCadastroEstrutura();
                }}
                onClick={(evento) => {
                  evento.preventDefault();
                  evento.stopPropagation();
                  fecharCadastroEstrutura();
                }}
                aria-label="Fechar cadastro da estrutura"
                data-bi-fechar-estrutura="true"
              >
                <X size={18} />
              </button>
            </header>
            <textarea
              value={textoEstrutura}
              onChange={(evento) => setTextoEstrutura(evento.target.value)}
              spellCheck={false}
            />
            <div className="biMapaEstruturaAjuda">
              <strong>Formato</strong>
              <span>rua=R01; setor=S1; colunas=8; niveis=4; posicoes=3; largura_cm=120; profundidade_cm=110; altura_nivel_cm=95; capacidade_m3=1.25</span>
            </div>
            <footer>
              <button type="button" onClick={limparEstrutura}>Limpar cadastro</button>
              <button type="button" onClick={gerarEstruturaDosDados}>Gerar pelos dados</button>
              <button type="button" className="primary" onClick={salvarEstrutura}><Save size={16} />Salvar estrutura</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function normalizarChaveBi(chave: string) {
  return chave.trim().toLocaleLowerCase('pt-BR');
}

function classeColunaTabelaBi(coluna: string) {
  const chave = normalizarChaveBi(coluna);
  if (['pedido', 'numero_pedido', 'id_pedido'].includes(chave) || chave.endsWith('_pedido')) return 'biColPedido';
  if (['fluxo', 'fl_fluxo'].includes(chave)) return 'biColFluxo';
  if (['codigo', 'cod', 'id_codigo'].includes(chave) || chave.endsWith('_codigo')) return 'biColCodigo';
  if (['dias', 'qtd', 'quantidade', 'falt', 'fat_entr'].includes(chave)) return 'biColNumeroCurto';
  if (chave.includes('cliente')) return 'biColCliente';
  if (chave.includes('transportadora') || chave === 'transp') return 'biColTransportadora';
  if (chave.includes('vendedor')) return 'biColVendedor';
  return '';
}

function larguraColunaTabelaTvBi(coluna: string, registros: RegistroGenerico[]) {
  const chave = normalizarChaveBi(coluna);
  // No modo TV usamos CSS Grid para travar campos pequenos e cortar textos longos.
  // Assim PEDIDO/FLUXO/CODIGO nao crescem sozinhos e sobram colunas visiveis no painel.
  if (['pedido', 'numero_pedido', 'id_pedido'].includes(chave) || chave.endsWith('_pedido')) return '6.6ch';
  if (['fluxo', 'fl_fluxo'].includes(chave)) return '4.2ch';
  if (['codigo', 'cod', 'id_codigo'].includes(chave) || chave.endsWith('_codigo')) return '6.8ch';
  if (['dias', 'qtd', 'quantidade', 'falt', 'fat_entr'].includes(chave)) return '4.8ch';
  if (chave.includes('valor') || chave.includes('total')) return '12.5ch';
  if (chave.includes('data') || chave.includes('dt')) return '10.5ch';
  if (['sit', 'status', 'situacao'].includes(chave)) return 'minmax(6ch, .55fr)';
  if (chave.includes('cliente')) return 'minmax(6ch, .8fr)';
  if (chave.includes('transportadora') || chave === 'transp') return 'minmax(6ch, .78fr)';
  if (chave.includes('vendedor')) return 'minmax(6ch, .65fr)';
  return 'minmax(4.5ch, .75fr)';
}

function mapaLargurasColunasBi(valor: unknown) {
  if (!valor) return {};
  if (typeof valor === 'object' && !Array.isArray(valor)) return valor as Record<string, string>;
  return Object.fromEntries(String(valor)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [coluna, largura] = item.split('=').map((parte) => parte?.trim());
      return [normalizarChaveBi(coluna ?? ''), largura ?? ''];
    })
    .filter(([coluna, largura]) => coluna && largura));
}

function larguraColunaWidgetTvBi(widget: RegistroGenerico, coluna: string, registros: RegistroGenerico[]) {
  const larguras = mapaLargurasColunasBi(widget.colunas_larguras_json);
  const manual = larguras[normalizarChaveBi(coluna)];
  return manual || larguraColunaTabelaTvBi(coluna, registros);
}

function textoLargurasColunasBi(valor: unknown) {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'object' && !Array.isArray(valor)) {
    return Object.entries(valor as Record<string, unknown>).map(([coluna, largura]) => `${coluna}=${String(largura)}`).join(', ');
  }
  return '';
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

function calcularLimiteLinhasTv() {
  const altura = Math.min(window.innerHeight || 900, window.visualViewport?.height ?? window.innerHeight ?? 900);
  if (altura <= 520) return 5;
  if (altura <= 620) return 6;
  if (altura <= 740) return 8;
  return 10;
}

function calcularLimiteMetricasKpiTv() {
  // No modo TV os cards superiores precisam mostrar o contexto completo do KPI.
  // A compactacao para caber na tela fica no CSS, preservando as informacoes retornadas pela consulta.
  return 99;
}

function BiWidgetContainer({ widget, filtros, modoTv = false }: { widget: RegistroGenerico; filtros: RegistroGenerico; modoTv?: boolean }) {
  const [dados, setDados] = useState<RegistroGenerico | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [limiteLinhasTv, setLimiteLinhasTv] = useState(() => calcularLimiteLinhasTv());
  const [limiteMetricasKpiTv, setLimiteMetricasKpiTv] = useState(() => calcularLimiteMetricasKpiTv());

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

  useEffect(() => {
    if (!modoTv) return;
    const atualizarLimite = () => {
      setLimiteLinhasTv(calcularLimiteLinhasTv());
      setLimiteMetricasKpiTv(calcularLimiteMetricasKpiTv());
    };
    atualizarLimite();
    window.addEventListener('resize', atualizarLimite);
    window.visualViewport?.addEventListener('resize', atualizarLimite);
    return () => {
      window.removeEventListener('resize', atualizarLimite);
      window.visualViewport?.removeEventListener('resize', atualizarLimite);
    };
  }, [modoTv]);

  useEffect(() => {
    if (!detalheAberto) return;
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setDetalheAberto(false);
    };
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [detalheAberto]);

  const registros = ((dados?.registros ?? dados?.dados ?? []) as RegistroGenerico[]).map(normalizarLinhaBi);
  const registrosCompletos = ((dados?.registros_completos ?? dados?.dados_completos ?? dados?.registros ?? dados?.dados ?? []) as RegistroGenerico[]).map(normalizarLinhaBi);
  const primeiro = registros[0] ?? {};
  const tipo = String(widget.tipo_widget ?? 'KPI').toUpperCase();
  const tipoLinha = ['LINHAS', 'GRAFICO_LINHAS', 'AREA'].includes(tipo);
  const tipoGraficoTv = ['LINHAS', 'GRAFICO_LINHAS', 'AREA', 'BARRAS'].includes(tipo);
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
  const registrosTabela = modoTv ? registros.slice(0, limiteLinhasTv) : registros;
  const registrosNaoExibidosTabela = registrosNaoExibidos + Math.max(0, registros.length - registrosTabela.length);
  const camposMetricaKpi = Object.keys(primeiro).filter((campo) => !['valor', 'total', 'quantidade', 'valor_monetario', 'valor_secundario', 'situacao', 'comparacao_dia_anterior', 'detalhes_json'].includes(campo));
  const camposMetricaKpiVisiveis = modoTv ? camposMetricaKpi.slice(0, limiteMetricasKpiTv) : camposMetricaKpi;
  const metricasKpiNaoExibidas = Math.max(0, camposMetricaKpi.length - camposMetricaKpiVisiveis.length);
  const carregamentoInicial = carregando && !dados;
  const podeExibirConteudo = !erro && !carregamentoInicial;

  function exportarDetalheExcel() {
    const escaparHtml = (valor: unknown) => String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const cabecalho = `<th>#</th>${colunasDetalhe.map((coluna) => `<th>${escaparHtml(rotuloCampoBi(coluna))}</th>`).join('')}`;
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

  if (modoTv) {
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
              {camposMetricaKpiVisiveis.length > 0 && (
                <div className="biKpiMetricas">
                  {camposMetricaKpiVisiveis.map((campo) => (
                    <small key={campo}><b>{formatarValorBi(primeiro[campo])}</b> {rotuloMetricaKpi(campo)}</small>
                  ))}
                </div>
              )}
              <small>{Number(primeiro.comparacao_dia_anterior ?? 0) >= 0 ? '+' : ''}{formatarValorBi(primeiro.comparacao_dia_anterior ?? 0)}% versus dia anterior</small>
            </div>
          )}
          {!erro && !carregando && tipoGraficoTv && registros.length > 0 && <BiGraficoLinhas registros={registros} cor={corWidget} />}
          {!erro && !carregando && tipo !== 'KPI' && !tipoGraficoTv && registros.length > 0 && (
            <div className="biTabelaWidget">
              <div
                className="biTabelaGradeTv"
                style={{ gridTemplateColumns: colunas.map((coluna) => larguraColunaWidgetTvBi(widget, coluna, registros)).join(' ') } as CSSProperties}
              >
                {colunas.map((coluna) => (
                  <div key={`cab-${coluna}`} className={`biTabelaGradeCabecalho ${classeColunaTabelaBi(coluna)}`}>{coluna.replace(/_/g, ' ')}</div>
                ))}
                {registrosTabela.map((registro, indice) => (
                  colunas.map((coluna) => (
                    <div key={`${indice}-${coluna}`} className={`biTabelaGradeCelula ${classeColunaTabelaBi(coluna)} ${Number(registro.dias ?? 0) > 2 ? 'biLinhaCritica' : ''}`}>
                      {formatarCelulaBi(coluna, registro[coluna])}
                    </div>
                  ))
                ))}
              </div>
              {registrosNaoExibidosTabela > 0 && <small className="biNaoExibidos">+ {String(registrosNaoExibidosTabela)} registro(s) nao exibido(s)</small>}
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
            <section className="biDetalheModal" onMouseDown={(evento) => evento.stopPropagation()}>
              <header>
                <div>
                  <span>Detalhamento do calculo</span>
                  <h3>{String(widget.titulo ?? 'Widget')}</h3>
                  <p>{String(widget.descricao ?? widget.subtitulo ?? 'Registros usados para compor este indicador.')}</p>
                </div>
                <div className="biModalControles">
                  <button type="button" onClick={exportarDetalheExcel} title="Exportar detalhe para Excel" aria-label="Exportar detalhe para Excel"><Download size={18} /></button>
                  <button
                    type="button"
                    onPointerDown={(evento) => {
                      evento.preventDefault();
                      evento.stopPropagation();
                      setDetalheAberto(false);
                    }}
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      evento.stopPropagation();
                      setDetalheAberto(false);
                    }}
                    onClick={(evento) => evento.stopPropagation()}
                    title="Fechar detalhe"
                    aria-label="Fechar detalhe"
                    data-bi-fechar-detalhe="true"
                  >
                    <X size={18} />
                  </button>
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
        {carregamentoInicial && <div className="biSkeleton" />}
        {carregando && dados && <span className="biAtualizandoWidget">Atualizando</span>}
        {erro && <div className="biErroWidget">Erro na consulta: {erro}</div>}
        {podeExibirConteudo && tipo === 'KPI' && (
          <div className="biKpi">
            <strong>{formatarValorBi(primeiro.valor ?? primeiro.total ?? primeiro.quantidade)}</strong>
            {primeiro.valor_monetario !== undefined && <em>{formatarValorBi(primeiro.valor_monetario, true)}</em>}
            {primeiro.situacao && <span>{String(primeiro.situacao)}</span>}
            {camposMetricaKpiVisiveis.length > 0 && (
              <div className="biKpiMetricas">
                {camposMetricaKpiVisiveis.map((campo) => (
                  <small key={campo}><b>{formatarValorBi(primeiro[campo])}</b> {rotuloMetricaKpi(campo)}</small>
                ))}
                {metricasKpiNaoExibidas > 0 && <small className="biKpiMaisInfo">+ {metricasKpiNaoExibidas} info(s)</small>}
              </div>
            )}
            <small>{Number(primeiro.comparacao_dia_anterior ?? 0) >= 0 ? '+' : ''}{formatarValorBi(primeiro.comparacao_dia_anterior ?? 0)}% versus dia anterior</small>
          </div>
        )}
        {podeExibirConteudo && (modoTv ? tipoGraficoTv : tipoLinha) && registros.length > 0 && <BiGraficoLinhas registros={registros} cor={corWidget} />}
        {podeExibirConteudo && !modoTv && tipo === 'BARRAS' && registros.length > 0 && <BiGraficoBarras registros={registros} cor={corWidget} titulo={String(widget.titulo ?? '')} />}
        {podeExibirConteudo && !modoTv && ['ROSCA', 'GAUGE'].includes(tipo) && registros.length > 0 && <BiGraficoRosca registros={registros} cor={corWidget} titulo={String(widget.titulo ?? '')} />}
        {podeExibirConteudo && !modoTv && tipo === 'RANKING' && registros.length > 0 && <BiRanking registros={registros} colunas={colunas} cor={corWidget} />}
        {podeExibirConteudo && tipo === 'MAPA_CD' && registros.length > 0 && <BiMapaCd registros={registros} />}
        {podeExibirConteudo && !['KPI', 'LINHAS', 'GRAFICO_LINHAS', 'AREA', ...(modoTv ? ['BARRAS'] : ['BARRAS', 'ROSCA', 'GAUGE', 'RANKING']), 'MAPA_CD'].includes(tipo) && registros.length > 0 && (
          <div className="biTabelaWidget">
            <table>
              <thead><tr>{colunas.map((coluna) => <th key={coluna} className={classeColunaTabelaBi(coluna)}>{modoTv ? coluna.replace(/_/g, ' ') : rotuloCampoBi(coluna)}</th>)}</tr></thead>
              <tbody>
                {registrosTabela.map((registro, indice) => (
                  <tr key={indice} className={Number(registro.dias ?? 0) > 2 ? 'biLinhaCritica' : ''}>
                    {colunas.map((coluna) => <td key={coluna} className={classeColunaTabelaBi(coluna)}>{formatarCelulaBi(coluna, registro[coluna])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {registrosNaoExibidosTabela > 0 && <small className="biNaoExibidos">+ {String(registrosNaoExibidosTabela)} registro(s) nao exibido(s)</small>}
          </div>
        )}
        {podeExibirConteudo && registros.length === 0 && <EstadoBi titulo="Sem dados" descricao="A consulta executou com sucesso, mas nao retornou registros." />}
      </div>
      <footer>
        <small>Ultima atualizacao: {dados?.atualizado_em ? new Date(String(dados.atualizado_em)).toLocaleString('pt-BR') : 'Aguardando execucao'}</small>
        {dados?.origem_cache && <small>Cache aplicado</small>}
      </footer>
      {detalheAberto && (
        <div className="biDetalheOverlay" role="dialog" aria-modal="true" aria-label={`Detalhe de ${String(widget.titulo ?? 'widget')}`}>
          <section className="biDetalheModal" onMouseDown={(evento) => evento.stopPropagation()}>
            <header>
              <div>
                <span>Detalhamento do calculo</span>
                <h3>{String(widget.titulo ?? 'Widget')}</h3>
                <p>{String(widget.descricao ?? widget.subtitulo ?? 'Registros usados para compor este indicador.')}</p>
              </div>
              <div className="biModalControles">
                <button type="button" onClick={exportarDetalheExcel} title="Exportar detalhe para Excel" aria-label="Exportar detalhe para Excel"><Download size={18} /></button>
                <button
                  type="button"
                  onPointerDown={(evento) => {
                    evento.preventDefault();
                    evento.stopPropagation();
                    setDetalheAberto(false);
                  }}
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    evento.stopPropagation();
                    setDetalheAberto(false);
                  }}
                  onClick={(evento) => evento.stopPropagation()}
                  title="Fechar detalhe"
                  aria-label="Fechar detalhe"
                  data-bi-fechar-detalhe="true"
                >
                  <X size={18} />
                </button>
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
                  <thead><tr><th className="biIndiceDetalhe">#</th>{colunasDetalhe.map((coluna) => <th key={coluna}>{rotuloCampoBi(coluna)}</th>)}</tr></thead>
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
  const [filtrosPainelAberto, setFiltrosPainelAberto] = useState(false);
  const [filtrosRascunho, setFiltrosRascunho] = useState<RegistroGenerico>({});
  const [buscaRapida, setBuscaRapida] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
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
    const filtrosSalvos = window.sessionStorage.getItem(`bi_dashboard_filtros_${dashboardId}`);
    if (filtrosSalvos) {
      try {
        const salvos = JSON.parse(filtrosSalvos);
        setFiltros(salvos);
        setFiltrosRascunho(salvos);
      } catch {
        setFiltros({});
        setFiltrosRascunho({});
      }
    }
  }, [dashboardId]);

  useEffect(() => {
    const debounce = window.setTimeout(() => setBuscaDebounced(buscaRapida), 350);
    return () => window.clearTimeout(debounce);
  }, [buscaRapida]);

  useEffect(() => {
    if (!filtrosPainelAberto) return;
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setFiltrosPainelAberto(false);
      }
    };
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [filtrosPainelAberto]);

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
  const filtrosExecucao = { ...filtros, busca_rapida: buscaDebounced };
  const filtrosAtivos = Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== null && String(valor).trim() !== '');
  const quantidadeFiltrosAtivos = filtrosAtivos.length + (buscaDebounced.trim() ? 1 : 0);
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
      {!modoTv && (
        <section className="biBarraExploracao">
          <div className="biBarraResumo">
            <span>Analisar</span>
            <strong>{String(pagina.nome ?? 'Visao Geral')}</strong>
          </div>
          <label>
            <Filter size={16} />
            <input
              placeholder="Buscar codigo, modelo, numero de serie, descricao, marca ou endereco..."
              value={buscaRapida}
              onChange={(evento) => setBuscaRapida(evento.target.value)}
            />
          </label>
          {dados.filtros.length > 0 && <button className="biBotaoFiltro" type="button" onClick={() => { setFiltrosRascunho(filtros); setFiltrosPainelAberto(true); }}><Filter size={16} />Filtros <strong>{quantidadeFiltrosAtivos}</strong></button>}
          <button className="biBotaoAtualizar" type="button" onClick={carregarDashboard}><RefreshCw size={16} />Atualizar</button>
        </section>
      )}
      {!modoTv && quantidadeFiltrosAtivos > 0 && (
        <div className="biChipsFiltros">
          {buscaDebounced.trim() && <button type="button" onClick={() => { setBuscaRapida(''); setBuscaDebounced(''); }}>Busca: {buscaDebounced}<X size={13} /></button>}
          {filtrosAtivos.map(([nome, valor]) => (
            <button key={nome} type="button" onClick={() => {
              const proximos = { ...filtros };
              delete proximos[nome];
              setFiltros(proximos);
              setFiltrosRascunho(proximos);
              window.sessionStorage.setItem(`bi_dashboard_filtros_${dashboardId}`, JSON.stringify(proximos));
            }}>
              {String(dados.filtros.find((filtro) => String(filtro.nome) === nome)?.label ?? nome)}: {String(valor)}<X size={13} />
            </button>
          ))}
        </div>
      )}
      <div className={`biPaginas ${modoTv && paginas.length <= 1 ? 'biPaginasTvOculta' : ''}`}>
        {paginas.map((item, indice) => <button key={String(item.id)} className={indice === paginaAtual ? 'active' : ''} onClick={() => setPaginaAtual(indice)}>{String(item.nome)}</button>)}
      </div>
      <section className="biWidgetsGrid">
        {widgets.map((widget) => <BiWidgetContainer key={String(widget.id)} widget={widget} filtros={filtrosExecucao} modoTv={modoTv} />)}
        {widgets.length === 0 && <EstadoBi titulo="Sem widgets" descricao="Adicione widgets no builder para montar esta pagina." />}
      </section>
      {!modoTv && filtrosPainelAberto && (
        <div className="biFiltroOverlay" onMouseDown={() => setFiltrosPainelAberto(false)}>
          <aside className="biFiltroPainel" onMouseDown={(evento) => evento.stopPropagation()}>
            <header>
              <div>
                <span>Filtros do dashboard</span>
                <h3>Refinar Estoque do CD</h3>
                <p>{quantidadeFiltrosAtivos} filtro(s) ativo(s) · {dados.filtros.length} opcoes disponiveis</p>
              </div>
              <button type="button" onClick={() => setFiltrosPainelAberto(false)} title="Fechar filtros"><X size={18} /></button>
            </header>
            <div className="biFiltroCampos">
              {dados.filtros.map((filtro) => {
                const nome = String(filtro.nome);
                const tipo = String(filtro.tipo ?? 'TEXTO').toUpperCase();
                return (
                  <label key={String(filtro.id ?? nome)}>
                    <span>{String(filtro.label ?? nome)}</span>
                    {tipo.includes('BOOLEAN') ? (
                      <select value={String(filtrosRascunho[nome] ?? '')} onChange={(evento) => setFiltrosRascunho({ ...filtrosRascunho, [nome]: evento.target.value })}>
                        <option value="">Todos</option>
                        <option value="true">Sim</option>
                        <option value="false">Nao</option>
                      </select>
                    ) : tipo.includes('DATA') ? (
                      <input type="date" value={String(filtrosRascunho[nome] ?? '')} onChange={(evento) => setFiltrosRascunho({ ...filtrosRascunho, [nome]: evento.target.value })} />
                    ) : tipo.includes('NUMERO') ? (
                      <input type="number" value={String(filtrosRascunho[nome] ?? '')} onChange={(evento) => setFiltrosRascunho({ ...filtrosRascunho, [nome]: evento.target.value })} />
                    ) : (
                      <input value={String(filtrosRascunho[nome] ?? '')} onChange={(evento) => setFiltrosRascunho({ ...filtrosRascunho, [nome]: evento.target.value })} />
                    )}
                  </label>
                );
              })}
            </div>
            <footer>
              <button type="button" className="ghost" onClick={() => { setFiltros({}); setFiltrosRascunho({}); window.sessionStorage.removeItem(`bi_dashboard_filtros_${dashboardId}`); }}>Limpar filtros</button>
              <button type="button" className="primary" onClick={() => { setFiltros(filtrosRascunho); window.sessionStorage.setItem(`bi_dashboard_filtros_${dashboardId}`, JSON.stringify(filtrosRascunho)); setFiltrosPainelAberto(false); }}>Aplicar filtros</button>
            </footer>
          </aside>
        </div>
      )}
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

  useEffect(() => {
    const visualizacaoAtiva = Boolean(visualizandoId || modoTvId);
    document.body.classList.toggle('biVisualizacaoAtiva', visualizacaoAtiva);
    return () => document.body.classList.remove('biVisualizacaoAtiva');
  }, [visualizandoId, modoTvId]);

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
    setFormWidget({ dashboard_id: selecionadoId, pagina_id: detalhe?.paginas[0]?.id, titulo: 'Novo widget', tipo_widget: 'KPI', largura: 3, altura: 2, top_x_registros: '10', intervalo_atualizacao_segundos: 60, atualizar_automaticamente: true, exibir_cabecalho: true, exibir_borda: true, exibir_sombra: true, exibir_exportacao: true, exibir_tela_cheia: true, colunas_larguras_json: '', ativo: true });
    setModalWidgetAberto(true);
  }

  function editarWidget(widget: RegistroGenerico) {
    setFormWidget({
      ...widget,
      colunas_visiveis_json: Array.isArray(widget.colunas_visiveis_json) ? widget.colunas_visiveis_json.join(', ') : widget.colunas_visiveis_json,
      colunas_larguras_json: textoLargurasColunasBi(widget.colunas_larguras_json)
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
    const pacote = JSON.parse(texto);
    await importarDashboardBi(detalhe?.dashboard?.id ? { ...pacote, dashboard_destino_id: detalhe.dashboard.id } : pacote);
    evento.target.value = '';
    setMensagem(detalhe?.dashboard?.id ? 'Dashboard atualizado pela importacao com sucesso.' : 'Dashboard importado com sucesso.');
    await carregar();
    if (detalhe?.dashboard?.id) {
      await carregarDetalhe(Number(detalhe.dashboard.id));
    }
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
                <BiCampo rotulo="Tipo"><select value={String(formWidget.tipo_widget ?? 'KPI')} onChange={(evento) => setFormWidget({ ...formWidget, tipo_widget: evento.target.value })}><option>KPI</option><option>TABELA</option><option>RANKING</option><option>BARRAS</option><option>LINHAS</option><option>ROSCA</option><option>GAUGE</option><option>MAPA_CD</option><option>TEXTO</option><option>IFRAME</option></select></BiCampo>
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
                <BiCampo rotulo="Largura das colunas na TV"><input placeholder="pedido=6.6ch, valor=12.5ch, data_faturamento=10.5ch, cliente=minmax(6ch,.8fr)" value={String(formWidget.colunas_larguras_json ?? '')} onChange={(evento) => setFormWidget({ ...formWidget, colunas_larguras_json: evento.target.value })} /></BiCampo>
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




