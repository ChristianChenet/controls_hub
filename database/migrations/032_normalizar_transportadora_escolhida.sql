-- NORMALIZA MARCACOES ANTIGAS DE TRANSPORTADORA ESCOLHIDA.
-- QUANDO O CABECALHO DA COTACAO TEM TRANSPORTADORA_ESCOLHIDA_ID,
-- QUALQUER OUTRA TRANSPORTADORA MARCADA COMO SELECIONADA DEVE SER DESMARCADA.
UPDATE cotacoes_frete_transportadoras cft
SET selecionada = FALSE,
  escolhida_plataforma = FALSE,
  alterado_em = NOW()
FROM cotacoes_frete c
WHERE cft.empresa_id = c.empresa_id
  AND cft.tipo_documento = c.tipo_documento
  AND cft.numero_documento = c.numero_documento
  AND cft.codigo_chave = c.codigo_chave
  AND COALESCE(c.excluido, FALSE) = FALSE
  AND c.transportadora_escolhida_id IS NOT NULL
  AND cft.transportadora_id <> c.transportadora_escolhida_id
  AND (
    COALESCE(cft.selecionada, FALSE) = TRUE
    OR COALESCE(cft.escolhida_plataforma, FALSE) = TRUE
    OR UPPER(COALESCE(cft.status, '')) IN ('SELECIONADA', 'ESCOLHIDA')
  );
