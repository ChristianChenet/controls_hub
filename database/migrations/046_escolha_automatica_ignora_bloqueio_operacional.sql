-- CONTROL S HUB
-- A escolha automatica da transportadora do pedido deve ocorrer mesmo quando
-- o pedido estiver bloqueado para alteracao manual. CT-e continua soberano.

ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS atualizado_no_erp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS atualizado_no_erp_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retorno_erp_status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS retorno_erp_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valor_frete_final NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS prazo_final_dias INTEGER,
  ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_descricao TEXT;

ALTER TABLE cotacoes_frete_transportadoras
  ADD COLUMN IF NOT EXISTS escolhida_plataforma BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS origem_detalhada VARCHAR(80),
  ADD COLUMN IF NOT EXISTS prazo_origem VARCHAR(40);

CREATE OR REPLACE FUNCTION fn_aplicar_escolha_automatica_transportadora_pedido(
  p_empresa_id BIGINT,
  p_tipo_documento VARCHAR,
  p_numero_documento VARCHAR,
  p_codigo_chave VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cotacao RECORD;
  v_transportadora RECORD;
  v_cotacao_transportadora RECORD;
  v_etapa_id BIGINT;
BEGIN
  SELECT *
  INTO v_cotacao
  FROM cotacoes_frete cf
  WHERE cf.empresa_id = p_empresa_id
    AND cf.tipo_documento = p_tipo_documento
    AND cf.numero_documento = p_numero_documento
    AND cf.codigo_chave = p_codigo_chave
    AND COALESCE(cf.excluido, FALSE) = FALSE
  LIMIT 1;

  IF NOT FOUND OR UPPER(COALESCE(v_cotacao.status, '')) = 'CTE_EMITIDO' THEN
    RETURN;
  END IF;

  SELECT t.*
  INTO v_transportadora
  FROM transportadoras t
  WHERE COALESCE(t.escolher_automaticamente_se_pedido, FALSE) = TRUE
    AND COALESCE(t.ativa, TRUE) = TRUE
    AND COALESCE(t.excluido, FALSE) = FALSE
    AND (
      (v_cotacao.transportadora_pedido_id IS NOT NULL AND t.id = v_cotacao.transportadora_pedido_id)
      OR (
        NULLIF(NULLIF(TRIM(COALESCE(v_cotacao.transportadora_pedido_codigo, '')), ''), '0') IS NOT NULL
        AND UPPER(TRIM(COALESCE(t.codigo_interno, ''))) = UPPER(TRIM(v_cotacao.transportadora_pedido_codigo))
      )
      OR (
        NULLIF(NULLIF(TRIM(COALESCE(v_cotacao.transportadora_pedido_nome, '')), ''), '0') IS NOT NULL
        AND (
          UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) = UPPER(TRIM(v_cotacao.transportadora_pedido_nome))
          OR UPPER(TRIM(COALESCE(t.razao_social, ''))) = UPPER(TRIM(v_cotacao.transportadora_pedido_nome))
          OR UPPER(TRIM(v_cotacao.transportadora_pedido_nome)) LIKE '%' || UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) || '%'
          OR UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) LIKE '%' || UPPER(TRIM(v_cotacao.transportadora_pedido_nome)) || '%'
          OR UPPER(TRIM(v_cotacao.transportadora_pedido_nome)) LIKE '%' || UPPER(TRIM(COALESCE(t.razao_social, ''))) || '%'
          OR UPPER(TRIM(COALESCE(t.razao_social, ''))) LIKE '%' || UPPER(TRIM(v_cotacao.transportadora_pedido_nome)) || '%'
        )
      )
    )
  ORDER BY
    CASE WHEN v_cotacao.transportadora_pedido_id IS NOT NULL AND t.id = v_cotacao.transportadora_pedido_id THEN 0 ELSE 1 END,
    CASE WHEN UPPER(TRIM(COALESCE(v_cotacao.transportadora_pedido_nome, ''))) = 'CLIENTE RETIRA'
      AND UPPER(TRIM(COALESCE(t.nome_fantasia, t.razao_social, ''))) = 'CLIENTE RETIRA' THEN 0 ELSE 1 END,
    t.id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT cft.*
  INTO v_cotacao_transportadora
  FROM cotacoes_frete_transportadoras cft
  WHERE cft.empresa_id = v_cotacao.empresa_id
    AND cft.tipo_documento = v_cotacao.tipo_documento
    AND cft.numero_documento = v_cotacao.numero_documento
    AND cft.codigo_chave = v_cotacao.codigo_chave
    AND cft.transportadora_id = v_transportadora.id
  ORDER BY
    CASE WHEN COALESCE(cft.valor_frete, 0) > 0 THEN 0 ELSE 1 END,
    CASE
      WHEN UPPER(COALESCE(cft.origem_detalhada, '')) = 'COTACAO_AUTOMATICA' THEN 0
      WHEN UPPER(COALESCE(cft.origem_cotacao, '')) IN ('AUTOMATICA', 'ERP', 'BANCO') THEN 1
      ELSE 2
    END,
    COALESCE(cft.valor_frete, 0) ASC,
    cft.alterado_em DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO cotacoes_frete_transportadoras (
      empresa_id, tipo_documento, numero_documento, codigo_chave,
      transportadora_id, codigo_transportadora, valor_frete, prazo_dias,
      prazo_origem, origem_cotacao, origem_detalhada, observacao,
      status, cotada_em, criada_em
    )
    VALUES (
      v_cotacao.empresa_id, v_cotacao.tipo_documento, v_cotacao.numero_documento, v_cotacao.codigo_chave,
      v_transportadora.id, v_transportadora.codigo_interno, 0, 0,
      'MANUAL', 'MANUAL', 'ESCOLHA_AUTOMATICA_PEDIDO',
      'Transportadora escolhida automaticamente por configuracao do cadastro da transportadora.',
      'ALTERADA_MANUALMENTE', NOW(), NOW()
    )
    RETURNING *
    INTO v_cotacao_transportadora;
  END IF;

  SELECT e.id
  INTO v_etapa_id
  FROM etapas_kanban e
  WHERE e.empresa_id = v_cotacao.empresa_id
    AND e.codigo = 'TRANSPORTADORA_ESCOLHIDA'
    AND COALESCE(e.ativa, TRUE) = TRUE
  ORDER BY e.ordem, e.id
  LIMIT 1;

  UPDATE cotacoes_frete_transportadoras cft
  SET selecionada = FALSE,
    escolhida_plataforma = FALSE
  WHERE cft.empresa_id = v_cotacao.empresa_id
    AND cft.tipo_documento = v_cotacao.tipo_documento
    AND cft.numero_documento = v_cotacao.numero_documento
    AND cft.codigo_chave = v_cotacao.codigo_chave;

  UPDATE cotacoes_frete_transportadoras cft
  SET selecionada = TRUE,
    escolhida_plataforma = TRUE,
    validada = TRUE,
    validada_em = COALESCE(cft.validada_em, NOW()),
    status = 'SELECIONADA',
    alterado_em = NOW()
  WHERE cft.empresa_id = v_cotacao.empresa_id
    AND cft.tipo_documento = v_cotacao.tipo_documento
    AND cft.numero_documento = v_cotacao.numero_documento
    AND cft.codigo_chave = v_cotacao.codigo_chave
    AND cft.transportadora_id = v_transportadora.id;

  UPDATE cotacoes_frete cf
  SET transportadora_escolhida_id = v_transportadora.id,
    escolhido_em = COALESCE(cf.escolhido_em, NOW()),
    valor_frete_final = COALESCE(v_cotacao_transportadora.valor_frete, 0),
    prazo_final_dias = COALESCE(v_cotacao_transportadora.prazo_dias, 0),
    motivo_escolha_transportadora_descricao = COALESCE(cf.motivo_escolha_transportadora_descricao, 'Escolha automatica pela configuracao da transportadora do pedido.'),
    status = 'TRANSPORTADORA_ESCOLHIDA',
    etapa_kanban_id = COALESCE(v_etapa_id, cf.etapa_kanban_id),
    atualizado_no_erp = FALSE,
    retorno_erp_status = 'PENDENTE',
    retorno_erp_em = NULL,
    alterado_em = NOW()
  WHERE cf.id = v_cotacao.id
    AND COALESCE(cf.excluido, FALSE) = FALSE;
END;
$$;

SELECT fn_aplicar_escolha_automatica_transportadora_pedido(
  empresa_id,
  tipo_documento,
  numero_documento,
  codigo_chave
)
FROM cotacoes_frete
WHERE COALESCE(excluido, FALSE) = FALSE
  AND UPPER(COALESCE(status, '')) <> 'CTE_EMITIDO'
  AND transportadora_pedido_id IS NOT NULL;
