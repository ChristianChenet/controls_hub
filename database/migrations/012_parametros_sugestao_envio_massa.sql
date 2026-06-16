-- Parametros operacionais para sugestao de cotacao no envio em massa.
-- Script aditivo: nao remove dados e nao sobrescreve valores ja configurados.

INSERT INTO parametros_sistema (chave, valor, descricao, sensivel)
VALUES
  (
    'VALOR_FRETE_COTADO_AUT_MAIOR_QUE',
    '0',
    'Valor minimo da cotacao automatica para indicar sugestao de envio a transportadora.',
    FALSE
  ),
  (
    'DIFERENCA_FRETE_COTADO',
    '0',
    'Diferenca nominal minima entre frete do pedido e frete cotado automaticamente.',
    FALSE
  ),
  (
    'PERCENTUAL_DIFERENCA_FRETE_COTADO_AUT',
    '0',
    'Percentual minimo de diferenca entre frete do pedido e frete cotado automaticamente.',
    FALSE
  ),
  (
    'DIAS_ACEITAVEL_DIFERENCA_PRAZO_PEDIDO_COTACAO',
    '0',
    'Quantidade de dias aceitavel para prazo da cotacao automatica acima do prazo do pedido.',
    FALSE
  )
ON CONFLICT (chave) DO NOTHING;
