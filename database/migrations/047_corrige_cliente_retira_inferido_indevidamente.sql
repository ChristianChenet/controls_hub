-- CONTROL S HUB
-- Corrige regra indevida: frete zero sem transportadora nao significa CLIENTE RETIRA.
-- CLIENTE RETIRA so deve ser escolhido automaticamente quando vier explicitamente como
-- transportadora do pedido.

CREATE OR REPLACE FUNCTION controlshub_normalizar_transportadora_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_transportadora RECORD;
  v_codigo TEXT;
  v_nome TEXT;
BEGIN
  v_codigo := NULLIF(NULLIF(TRIM(COALESCE(NEW.transportadora_pedido_codigo, '')), ''), '0');
  v_nome := NULLIF(NULLIF(TRIM(COALESCE(NEW.transportadora_pedido_nome, '')), ''), '0');

  NEW.transportadora_pedido_codigo := v_codigo;
  NEW.transportadora_pedido_nome := v_nome;

  IF NEW.transportadora_pedido_id IS NULL
    AND (v_codigo IS NOT NULL OR v_nome IS NOT NULL)
  THEN
    SELECT t.*
    INTO v_transportadora
    FROM transportadoras t
    WHERE COALESCE(t.escolher_automaticamente_se_pedido, FALSE) = TRUE
      AND COALESCE(t.ativa, TRUE) = TRUE
      AND COALESCE(t.excluido, FALSE) = FALSE
      AND (
        (v_codigo IS NOT NULL AND UPPER(TRIM(COALESCE(t.codigo_interno, ''))) = UPPER(v_codigo))
        OR (
          v_nome IS NOT NULL
          AND (
            UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) = UPPER(v_nome)
            OR UPPER(TRIM(COALESCE(t.razao_social, ''))) = UPPER(v_nome)
            OR UPPER(v_nome) LIKE '%' || UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) || '%'
            OR UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) LIKE '%' || UPPER(v_nome) || '%'
            OR UPPER(v_nome) LIKE '%' || UPPER(TRIM(COALESCE(t.razao_social, ''))) || '%'
            OR UPPER(TRIM(COALESCE(t.razao_social, ''))) LIKE '%' || UPPER(v_nome) || '%'
          )
        )
      )
    ORDER BY
      CASE WHEN v_codigo IS NOT NULL AND UPPER(TRIM(COALESCE(t.codigo_interno, ''))) = UPPER(v_codigo) THEN 0 ELSE 1 END,
      t.id
    LIMIT 1;

    IF FOUND THEN
      NEW.transportadora_pedido_id := v_transportadora.id;
      NEW.transportadora_pedido_codigo := COALESCE(NULLIF(TRIM(v_transportadora.codigo_interno), ''), NEW.transportadora_pedido_codigo);
      NEW.transportadora_pedido_nome := COALESCE(NULLIF(TRIM(v_transportadora.nome_fantasia), ''), NULLIF(TRIM(v_transportadora.razao_social), ''), NEW.transportadora_pedido_nome);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_controlshub_normalizar_transportadora_pedido ON cotacoes_frete;
CREATE TRIGGER trg_controlshub_normalizar_transportadora_pedido
BEFORE INSERT OR UPDATE OF
  transportadora_pedido_id,
  transportadora_pedido_codigo,
  transportadora_pedido_nome,
  valor_frete_pedido
ON cotacoes_frete
FOR EACH ROW
EXECUTE FUNCTION controlshub_normalizar_transportadora_pedido();

CREATE TEMP TABLE tmp_cotacoes_cliente_retira_inferido AS
SELECT cf.empresa_id, cf.tipo_documento, cf.numero_documento, cf.codigo_chave
FROM cotacoes_frete cf
WHERE COALESCE(cf.excluido, FALSE) = FALSE
  AND cf.transportadora_pedido_id = 52472
  AND cf.transportadora_escolhida_id = 52472
  AND COALESCE(cf.valor_frete_pedido, 0) = 0
  AND COALESCE(cf.valor_frete_final, 0) = 0
  AND COALESCE(cf.prazo_final_dias, 0) = 0
  AND cf.escolhido_em >= TIMESTAMPTZ '2026-08-31 20:50:00+00'
  AND COALESCE(cf.motivo_escolha_transportadora_descricao, '') = 'Escolha automatica pela configuracao da transportadora do pedido.'
  AND EXISTS (
    SELECT 1
    FROM cotacoes_frete_transportadoras cft
    WHERE cft.empresa_id = cf.empresa_id
      AND cft.tipo_documento = cf.tipo_documento
      AND cft.numero_documento = cf.numero_documento
      AND cft.codigo_chave = cf.codigo_chave
      AND cft.transportadora_id = 52472
      AND COALESCE(cft.valor_frete, 0) = 0
      AND COALESCE(cft.prazo_dias, 0) = 0
      AND COALESCE(cft.selecionada, FALSE) = TRUE
      AND COALESCE(cft.escolhida_plataforma, FALSE) = TRUE
  );

UPDATE cotacoes_frete_transportadoras cft
SET selecionada = FALSE,
  escolhida_plataforma = FALSE,
  validada = FALSE,
  status = CASE
    WHEN UPPER(COALESCE(cft.origem_cotacao, '')) = 'MANUAL' THEN 'ALTERADA_MANUALMENTE'
    ELSE 'COTADA'
  END,
  alterado_em = NOW()
FROM tmp_cotacoes_cliente_retira_inferido tmp
WHERE cft.empresa_id = tmp.empresa_id
  AND cft.tipo_documento = tmp.tipo_documento
  AND cft.numero_documento = tmp.numero_documento
  AND cft.codigo_chave = tmp.codigo_chave
  AND cft.transportadora_id = 52472
  AND COALESCE(cft.valor_frete, 0) = 0
  AND COALESCE(cft.prazo_dias, 0) = 0;

UPDATE cotacoes_frete cf
SET transportadora_pedido_id = NULL,
  transportadora_pedido_codigo = NULL,
  transportadora_pedido_nome = NULL,
  transportadora_escolhida_id = NULL,
  transportadora_final_id = NULL,
  escolhido_por_usuario_id = NULL,
  escolhido_em = NULL,
  valor_frete_final = NULL,
  prazo_final_dias = NULL,
  motivo_escolha_transportadora_descricao = NULL,
  atualizado_no_erp = FALSE,
  retorno_erp_status = 'PENDENTE',
  retorno_erp_em = NULL,
  alterado_em = NOW()
FROM tmp_cotacoes_cliente_retira_inferido tmp
WHERE cf.empresa_id = tmp.empresa_id
  AND cf.tipo_documento = tmp.tipo_documento
  AND cf.numero_documento = tmp.numero_documento
  AND cf.codigo_chave = tmp.codigo_chave;

DO $$
DECLARE
  registro RECORD;
BEGIN
  IF to_regprocedure('controlshub_calcular_status_cotacao(bigint, character varying, character varying, character varying, boolean)') IS NULL THEN
    RETURN;
  END IF;

  FOR registro IN
    SELECT empresa_id, tipo_documento, numero_documento, codigo_chave
    FROM tmp_cotacoes_cliente_retira_inferido
  LOOP
    PERFORM controlshub_calcular_status_cotacao(
      registro.empresa_id,
      registro.tipo_documento,
      registro.numero_documento,
      registro.codigo_chave,
      TRUE
    );
  END LOOP;
END;
$$;

DROP TABLE IF EXISTS tmp_cotacoes_cliente_retira_inferido;

CREATE TEMP TABLE tmp_cotacoes_cliente_retira_selecionado AS
SELECT DISTINCT cf.empresa_id, cf.tipo_documento, cf.numero_documento, cf.codigo_chave
FROM cotacoes_frete cf
WHERE COALESCE(cf.excluido, FALSE) = FALSE
  AND cf.transportadora_pedido_id IS NULL
  AND cf.transportadora_escolhida_id IS NULL
  AND UPPER(COALESCE(cf.status, '')) = 'TRANSPORTADORA_ESCOLHIDA'
  AND EXISTS (
    SELECT 1
    FROM cotacoes_frete_transportadoras cft
    WHERE cft.empresa_id = cf.empresa_id
      AND cft.tipo_documento = cf.tipo_documento
      AND cft.numero_documento = cf.numero_documento
      AND cft.codigo_chave = cf.codigo_chave
      AND cft.transportadora_id = 52472
      AND COALESCE(cft.valor_frete, 0) = 0
      AND COALESCE(cft.prazo_dias, 0) = 0
      AND COALESCE(cft.selecionada, FALSE) = TRUE
  )
  AND EXISTS (
    SELECT 1
    FROM cotacoes_frete_transportadoras cft_real
    WHERE cft_real.empresa_id = cf.empresa_id
      AND cft_real.tipo_documento = cf.tipo_documento
      AND cft_real.numero_documento = cf.numero_documento
      AND cft_real.codigo_chave = cf.codigo_chave
      AND COALESCE(cft_real.valor_frete, 0) > 0
  );

UPDATE cotacoes_frete_transportadoras cft
SET selecionada = FALSE,
  escolhida_plataforma = FALSE,
  validada = FALSE,
  status = 'COTADA',
  alterado_em = NOW()
FROM tmp_cotacoes_cliente_retira_selecionado tmp
WHERE cft.empresa_id = tmp.empresa_id
  AND cft.tipo_documento = tmp.tipo_documento
  AND cft.numero_documento = tmp.numero_documento
  AND cft.codigo_chave = tmp.codigo_chave
  AND cft.transportadora_id = 52472
  AND COALESCE(cft.valor_frete, 0) = 0
  AND COALESCE(cft.prazo_dias, 0) = 0;

DO $$
DECLARE
  registro RECORD;
BEGIN
  IF to_regprocedure('controlshub_calcular_status_cotacao(bigint, character varying, character varying, character varying, boolean)') IS NULL THEN
    RETURN;
  END IF;

  FOR registro IN
    SELECT empresa_id, tipo_documento, numero_documento, codigo_chave
    FROM tmp_cotacoes_cliente_retira_selecionado
  LOOP
    PERFORM controlshub_calcular_status_cotacao(
      registro.empresa_id,
      registro.tipo_documento,
      registro.numero_documento,
      registro.codigo_chave,
      TRUE
    );
  END LOOP;
END;
$$;

DROP TABLE IF EXISTS tmp_cotacoes_cliente_retira_selecionado;

ALTER TABLE cotacoes_frete DISABLE TRIGGER USER;
ALTER TABLE cotacoes_frete_transportadoras DISABLE TRIGGER USER;

CREATE TEMP TABLE tmp_cotacoes_cliente_retira_errado_final AS
SELECT DISTINCT cf.empresa_id, cf.tipo_documento, cf.numero_documento, cf.codigo_chave
FROM cotacoes_frete cf
WHERE COALESCE(cf.excluido, FALSE) = FALSE
  AND cf.transportadora_pedido_id IS NULL
  AND cf.transportadora_escolhida_id = 52472
  AND cf.escolhido_em >= TIMESTAMPTZ '2026-08-31 20:50:00+00'
  AND UPPER(COALESCE(cf.status, '')) <> 'CTE_EMITIDO'
  AND NOT EXISTS (
    SELECT 1
    FROM cotacoes_frete_ctes cte
    WHERE cte.empresa_id = cf.empresa_id
      AND cte.tipo_documento = cf.tipo_documento
      AND cte.numero_documento = cf.numero_documento
      AND cte.codigo_chave = cf.codigo_chave
  )
  AND EXISTS (
    SELECT 1
    FROM cotacoes_frete_transportadoras cft_real
    WHERE cft_real.empresa_id = cf.empresa_id
      AND cft_real.tipo_documento = cf.tipo_documento
      AND cft_real.numero_documento = cf.numero_documento
      AND cft_real.codigo_chave = cf.codigo_chave
      AND COALESCE(cft_real.valor_frete, 0) > 0
  );

UPDATE cotacoes_frete_transportadoras cft
SET selecionada = FALSE,
  escolhida_plataforma = FALSE,
  validada = FALSE,
  status = CASE
    WHEN UPPER(COALESCE(cft.status, '')) IN ('SELECIONADA', 'ESCOLHIDA') THEN 'COTADA'
    ELSE cft.status
  END,
  alterado_em = NOW()
FROM tmp_cotacoes_cliente_retira_errado_final tmp
WHERE cft.empresa_id = tmp.empresa_id
  AND cft.tipo_documento = tmp.tipo_documento
  AND cft.numero_documento = tmp.numero_documento
  AND cft.codigo_chave = tmp.codigo_chave
  AND cft.transportadora_id = 52472;

UPDATE cotacoes_frete cf
SET transportadora_pedido_id = NULL,
  transportadora_pedido_codigo = NULL,
  transportadora_pedido_nome = NULL,
  transportadora_escolhida_id = NULL,
  transportadora_final_id = NULL,
  escolhido_por_usuario_id = NULL,
  escolhido_em = NULL,
  valor_frete_final = NULL,
  prazo_final_dias = NULL,
  motivo_escolha_transportadora_descricao = NULL,
  atualizado_no_erp = FALSE,
  retorno_erp_status = 'PENDENTE',
  retorno_erp_em = NULL,
  alterado_em = NOW()
FROM tmp_cotacoes_cliente_retira_errado_final tmp
WHERE cf.empresa_id = tmp.empresa_id
  AND cf.tipo_documento = tmp.tipo_documento
  AND cf.numero_documento = tmp.numero_documento
  AND cf.codigo_chave = tmp.codigo_chave;

DO $$
DECLARE
  registro RECORD;
BEGIN
  IF to_regprocedure('controlshub_calcular_status_cotacao(bigint, character varying, character varying, character varying, boolean)') IS NULL THEN
    RETURN;
  END IF;

  FOR registro IN
    SELECT empresa_id, tipo_documento, numero_documento, codigo_chave
    FROM tmp_cotacoes_cliente_retira_errado_final
  LOOP
    PERFORM controlshub_calcular_status_cotacao(
      registro.empresa_id,
      registro.tipo_documento,
      registro.numero_documento,
      registro.codigo_chave,
      TRUE
    );
  END LOOP;
END;
$$;

ALTER TABLE cotacoes_frete ENABLE TRIGGER USER;
ALTER TABLE cotacoes_frete_transportadoras ENABLE TRIGGER USER;

DROP TABLE IF EXISTS tmp_cotacoes_cliente_retira_errado_final;
