import type { FastifyRequest } from 'fastify';

export type UsuarioSessao = {
  id: number;
  nome: string;
  email: string;
  superadmin: boolean;
  administrador: boolean;
  empresaAtivaId?: number;
};

export function obterUsuarioSessao(request: FastifyRequest) {
  return request.user as UsuarioSessao | undefined;
}

export function exigirSuperadmin(request: FastifyRequest) {
  const usuario = obterUsuarioSessao(request);
  return Boolean(usuario?.superadmin);
}

