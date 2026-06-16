import pg from 'pg';
import type { QueryResultRow } from 'pg';
import { ambiente } from '../configuracao/ambiente.js';

// Pool unico da aplicacao. As consultas devem manter SQL em maiusculo.
export const banco = new pg.Pool({
  connectionString: ambiente.bancoUrl
});

export async function consultar<T extends QueryResultRow>(sql: string, parametros: unknown[] = []) {
  const resultado = await banco.query<T>(sql, parametros);
  return resultado.rows;
}

export async function consultarUm<T extends QueryResultRow>(sql: string, parametros: unknown[] = []) {
  const linhas = await consultar<T>(sql, parametros);
  return linhas[0] ?? null;
}
