-- CONTROL S HUB
-- Normaliza a transportadora do pedido antes das regras automaticas.
-- Regra operacional: apenas normaliza transportadora quando ela vier informada no pedido.

ALTER TABLE transportadoras
  ADD COLUMN IF NOT EXISTS escolher_automaticamente_se_pedido BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS atualizado_no_erp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS atualizado_no_erp_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retorno_erp_status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS retorno_erp_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valor_frete_final NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS prazo_final_dias INTEGER,
  ADD COLUMN IF NOT EXISTS motivo_escolha_transportadora_descricao TEXT;

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
      CASE WHEN UPPER(v_nome) = 'CLIENTE RETIRA' AND UPPER(TRIM(COALESCE(t.nome_fantasia, t.razao_social, ''))) = 'CLIENTE RETIRA' THEN 0 ELSE 1 END,
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

UPDATE cotacoes_frete
SET transportadora_pedido_codigo = NULLIF(NULLIF(TRIM(COALESCE(transportadora_pedido_codigo, '')), ''), '0'),
  transportadora_pedido_nome = CASE
    WHEN NULLIF(NULLIF(TRIM(COALESCE(transportadora_pedido_nome, '')), ''), '0') IS NOT NULL
      THEN NULLIF(NULLIF(TRIM(COALESCE(transportadora_pedido_nome, '')), ''), '0')
    ELSE NULL
  END,
  alterado_em = NOW()
WHERE COALESCE(excluido, FALSE) = FALSE
  AND transportadora_pedido_id IS NULL
  AND (
    TRIM(COALESCE(transportadora_pedido_codigo, '')) IN ('', '0')
    OR TRIM(COALESCE(transportadora_pedido_nome, '')) IN ('', '0')
  );

UPDATE cotacoes_frete cf
SET transportadora_pedido_id = t.id,
  transportadora_pedido_codigo = COALESCE(NULLIF(TRIM(t.codigo_interno), ''), cf.transportadora_pedido_codigo),
  transportadora_pedido_nome = COALESCE(NULLIF(TRIM(t.nome_fantasia), ''), NULLIF(TRIM(t.razao_social), ''), cf.transportadora_pedido_nome),
  alterado_em = NOW()
FROM transportadoras t
WHERE COALESCE(cf.excluido, FALSE) = FALSE
  AND cf.transportadora_pedido_id IS NULL
  AND COALESCE(t.escolher_automaticamente_se_pedido, FALSE) = TRUE
  AND COALESCE(t.ativa, TRUE) = TRUE
  AND COALESCE(t.excluido, FALSE) = FALSE
  AND (
    (
      NULLIF(TRIM(COALESCE(cf.transportadora_pedido_codigo, '')), '') IS NOT NULL
      AND UPPER(TRIM(COALESCE(t.codigo_interno, ''))) = UPPER(TRIM(cf.transportadora_pedido_codigo))
    )
    OR (
      NULLIF(TRIM(COALESCE(cf.transportadora_pedido_nome, '')), '') IS NOT NULL
      AND (
        UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) = UPPER(TRIM(cf.transportadora_pedido_nome))
        OR UPPER(TRIM(COALESCE(t.razao_social, ''))) = UPPER(TRIM(cf.transportadora_pedido_nome))
        OR UPPER(TRIM(cf.transportadora_pedido_nome)) LIKE '%' || UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) || '%'
        OR UPPER(TRIM(COALESCE(t.nome_fantasia, ''))) LIKE '%' || UPPER(TRIM(cf.transportadora_pedido_nome)) || '%'
      )
    )
  );

DO $$
DECLARE
  registro RECORD;
BEGIN
  IF to_regprocedure('fn_aplicar_escolha_automatica_transportadora_pedido(bigint, character varying, character varying, character varying)') IS NULL THEN
    RETURN;
  END IF;

  FOR registro IN
    SELECT cf.empresa_id, cf.tipo_documento, cf.numero_documento, cf.codigo_chave
    FROM cotacoes_frete cf
    WHERE COALESCE(cf.excluido, FALSE) = FALSE
      AND COALESCE(cf.bloqueado_para_alteracao, FALSE) = FALSE
      AND UPPER(COALESCE(cf.status, '')) <> 'CTE_EMITIDO'
      AND cf.transportadora_pedido_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM transportadoras t
        WHERE t.id = cf.transportadora_pedido_id
          AND COALESCE(t.escolher_automaticamente_se_pedido, FALSE) = TRUE
          AND COALESCE(t.ativa, TRUE) = TRUE
          AND COALESCE(t.excluido, FALSE) = FALSE
      )
  LOOP
    PERFORM fn_aplicar_escolha_automatica_transportadora_pedido(
      registro.empresa_id,
      registro.tipo_documento,
      registro.numero_documento,
      registro.codigo_chave
    );
  END LOOP;
END;
$$;
