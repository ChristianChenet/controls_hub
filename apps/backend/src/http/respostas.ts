export function sucesso<T>(dados: T) {
  return {
    sucesso: true,
    dados
  };
}

export function falha(codigo: string, mensagem: string, detalhes?: unknown) {
  return {
    sucesso: false,
    erro: {
      codigo,
      mensagem,
      ...(detalhes ? { detalhes } : {})
    }
  };
}
