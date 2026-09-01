-- CONTROL S HUB
-- Restaura cotacoes antigas afetadas pela limpeza ampla de CLIENTE RETIRA.
-- A restauracao usa a menor cotacao positiva disponivel e preserva pedidos novos
-- de 30/08/2026 em diante.

DO $$
BEGIN
  CREATE TEMP TABLE tmp_restaura_escolhas_antigas AS
  WITH alvo AS (
    SELECT cf.empresa_id, cf.tipo_documento, cf.numero_documento, cf.codigo_chave
    FROM cotacoes_frete cf
    WHERE COALESCE(cf.excluido, FALSE) = FALSE
      AND UPPER(COALESCE(cf.status, '')) = 'EM_ANALISE'
      AND cf.data_documento < DATE '2026-08-30'
      AND cf.alterado_em >= TIMESTAMPTZ '2026-09-01 12:30:00+00'
      AND EXISTS (
        SELECT 1
        FROM cotacoes_frete_transportadoras cft
        WHERE cft.empresa_id = cf.empresa_id
          AND cft.tipo_documento = cf.tipo_documento
          AND cft.numero_documento = cf.numero_documento
          AND cft.codigo_chave = cf.codigo_chave
          AND COALESCE(cft.valor_frete, 0) > 0
      )
  ),
  melhor AS (
    SELECT DISTINCT ON (cft.empresa_id, cft.tipo_documento, cft.numero_documento, cft.codigo_chave)
      cft.empresa_id,
      cft.tipo_documento,
      cft.numero_documento,
      cft.codigo_chave,
      cft.transportadora_id,
      cft.valor_frete,
      cft.prazo_dias,
      cft.origem_cotacao
    FROM cotacoes_frete_transportadoras cft
    INNER JOIN alvo a
      ON a.empresa_id = cft.empresa_id
     AND a.tipo_documento = cft.tipo_documento
     AND a.numero_documento = cft.numero_documento
     AND a.codigo_chave = cft.codigo_chave
    WHERE COALESCE(cft.valor_frete, 0) > 0
    ORDER BY
      cft.empresa_id,
      cft.tipo_documento,
      cft.numero_documento,
      cft.codigo_chave,
      cft.valor_frete ASC,
      cft.prazo_dias ASC NULLS LAST,
      cft.alterado_em DESC NULLS LAST
  )
  SELECT * FROM melhor;

  UPDATE cotacoes_frete_transportadoras cft
  SET selecionada = FALSE,
    escolhida_plataforma = FALSE
  WHERE EXISTS (
    SELECT 1
    FROM tmp_restaura_escolhas_antigas r
    WHERE r.empresa_id = cft.empresa_id
      AND r.tipo_documento = cft.tipo_documento
      AND r.numero_documento = cft.numero_documento
      AND r.codigo_chave = cft.codigo_chave
  );

  UPDATE cotacoes_frete_transportadoras cft
  SET selecionada = TRUE,
    escolhida_plataforma = TRUE,
    validada = TRUE,
    validada_em = COALESCE(cft.validada_em, NOW()),
    status = 'SELECIONADA',
    alterado_em = NOW()
  FROM tmp_restaura_escolhas_antigas r
  WHERE r.empresa_id = cft.empresa_id
    AND r.tipo_documento = cft.tipo_documento
    AND r.numero_documento = cft.numero_documento
    AND r.codigo_chave = cft.codigo_chave
    AND r.transportadora_id = cft.transportadora_id
    AND r.origem_cotacao = cft.origem_cotacao;

  UPDATE cotacoes_frete cf
  SET transportadora_escolhida_id = r.transportadora_id,
    transportadora_final_id = r.transportadora_id,
    escolhido_em = COALESCE(cf.escolhido_em, NOW()),
    valor_frete_final = r.valor_frete,
    prazo_final_dias = r.prazo_dias,
    motivo_escolha_transportadora_descricao = COALESCE(
      cf.motivo_escolha_transportadora_descricao,
      'Restaurado apos ajuste de Cliente Retira aplicado indevidamente.'
    ),
    status = 'TRANSPORTADORA_ESCOLHIDA',
    atualizado_no_erp = FALSE,
    retorno_erp_status = 'PENDENTE',
    retorno_erp_em = NULL,
    alterado_em = NOW()
  FROM tmp_restaura_escolhas_antigas r
  WHERE r.empresa_id = cf.empresa_id
    AND r.tipo_documento = cf.tipo_documento
    AND r.numero_documento = cf.numero_documento
    AND r.codigo_chave = cf.codigo_chave;

  DROP TABLE IF EXISTS tmp_restaura_escolhas_antigas;
END;
$$;
