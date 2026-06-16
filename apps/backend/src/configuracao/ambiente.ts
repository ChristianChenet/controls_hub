// Centraliza as variaveis de ambiente para manter instalacao e atualizacao simples.
export const ambiente = {
  porta: Number(process.env.PORTA_API ?? process.env.PORT ?? 3334),
  bancoUrl:
    process.env.BANCO_URL ??
    'postgres://postgres:controls@localhost:5432/controlshub',
  segredoJwt: process.env.SEGREDO_JWT ?? 'CONTROL_S_HUB_DESENVOLVIMENTO',
  origemFrontend: process.env.ORIGEM_FRONTEND ?? true
};
