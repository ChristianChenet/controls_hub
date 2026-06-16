export type ChaveCotacaoFrete = {
  empresaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  codigoChave: string;
};

export function montarIdCotacaoSql(alias = 'c') {
  return `CONCAT_WS('|', ${alias}.empresa_id, ${alias}.tipo_documento, ${alias}.numero_documento, ${alias}.codigo_chave)`;
}

export function montarCondicaoChaveCotacao(aliasCotacao = 'c', aliasReferencia = 'r') {
  return `${aliasCotacao}.empresa_id = ${aliasReferencia}.empresa_id
    AND ${aliasCotacao}.tipo_documento = ${aliasReferencia}.tipo_documento
    AND ${aliasCotacao}.numero_documento = ${aliasReferencia}.numero_documento
    AND ${aliasCotacao}.codigo_chave = ${aliasReferencia}.codigo_chave`;
}

export function parseChaveCotacao(valor: string | number, empresaPadrao?: number | string): ChaveCotacaoFrete {
  const decodificado = decodeURIComponent(String(valor ?? '')).trim();
  const partes = decodificado.split('|');

  if (partes.length !== 4) {
    throw Object.assign(new Error('Chave da cotacao invalida. Use empresa_id|tipo_documento|numero_documento|codigo_chave.'), {
      codigo: 'CHAVE_COTACAO_INVALIDA',
      statusCode: 400
    });
  }

  const empresaId = Number(partes[0]);
  if (!Number.isFinite(empresaId) || empresaId <= 0) {
    throw Object.assign(new Error('Empresa da chave da cotacao invalida.'), {
      codigo: 'CHAVE_COTACAO_INVALIDA',
      statusCode: 400
    });
  }

  const empresaEsperada = empresaPadrao === undefined ? null : Number(empresaPadrao);
  if (empresaEsperada && empresaId !== empresaEsperada) {
    throw Object.assign(new Error('Chave da cotacao pertence a outra empresa.'), {
      codigo: 'CHAVE_COTACAO_EMPRESA_DIVERGENTE',
      statusCode: 403
    });
  }

  return {
    empresaId,
    tipoDocumento: partes[1],
    numeroDocumento: partes[2],
    codigoChave: partes[3]
  };
}

export function parametrosChave(chave: ChaveCotacaoFrete) {
  return [chave.empresaId, chave.tipoDocumento, chave.numeroDocumento, chave.codigoChave];
}
