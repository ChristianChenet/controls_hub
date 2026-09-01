-- CONTROL S HUB
-- Protege a escolha automatica para executar somente quando a transportadora
-- veio informada no pedido. Evita escolher Cliente Retira por efeito residual.

CREATE OR REPLACE FUNCTION trg_cotacoes_frete_escolha_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.transportadora_pedido_id IS NULL
    AND NULLIF(NULLIF(TRIM(COALESCE(NEW.transportadora_pedido_codigo, '')), ''), '0') IS NULL
    AND NULLIF(NULLIF(TRIM(COALESCE(NEW.transportadora_pedido_nome, '')), ''), '0') IS NULL
  THEN
    RETURN NEW;
  END IF;

  PERFORM fn_aplicar_escolha_automatica_transportadora_pedido(
    NEW.empresa_id,
    NEW.tipo_documento,
    NEW.numero_documento,
    NEW.codigo_chave
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_cft_escolha_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tem_transportadora_pedido BOOLEAN;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM cotacoes_frete cf
    WHERE cf.empresa_id = NEW.empresa_id
      AND cf.tipo_documento = NEW.tipo_documento
      AND cf.numero_documento = NEW.numero_documento
      AND cf.codigo_chave = NEW.codigo_chave
      AND COALESCE(cf.excluido, FALSE) = FALSE
      AND (
        cf.transportadora_pedido_id IS NOT NULL
        OR NULLIF(NULLIF(TRIM(COALESCE(cf.transportadora_pedido_codigo, '')), ''), '0') IS NOT NULL
        OR NULLIF(NULLIF(TRIM(COALESCE(cf.transportadora_pedido_nome, '')), ''), '0') IS NOT NULL
      )
  )
  INTO v_tem_transportadora_pedido;

  IF NOT COALESCE(v_tem_transportadora_pedido, FALSE) THEN
    RETURN NEW;
  END IF;

  PERFORM fn_aplicar_escolha_automatica_transportadora_pedido(
    NEW.empresa_id,
    NEW.tipo_documento,
    NEW.numero_documento,
    NEW.codigo_chave
  );

  RETURN NEW;
END;
$$;
