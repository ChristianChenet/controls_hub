-- CONTROL S HUB
-- CLIENTE RETIRA so deve permanecer como transportadora cotada quando o CEP
-- destino for 87050440. A limpeza historica fica limitada ao periodo posterior
-- a atualizacao de 31/08/2026 17:50 (America/Sao_Paulo).

CREATE OR REPLACE FUNCTION controlshub_remover_cliente_retira_cep_diferente(
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

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF regexp_replace(COALESCE(v_cotacao.cep_destino, ''), '[^0-9]', '', 'g') = '87050440' THEN
    RETURN;
  END IF;

  DELETE FROM cotacoes_frete_transportadoras cft
  WHERE cft.empresa_id = v_cotacao.empresa_id
    AND cft.tipo_documento = v_cotacao.tipo_documento
    AND cft.numero_documento = v_cotacao.numero_documento
    AND cft.codigo_chave = v_cotacao.codigo_chave
    AND cft.transportadora_id = 52472;

  IF v_cotacao.transportadora_escolhida_id = 52472
    OR v_cotacao.transportadora_final_id = 52472
  THEN
    UPDATE cotacoes_frete cf
    SET transportadora_escolhida_id = NULL,
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
    WHERE cf.id = v_cotacao.id
      AND COALESCE(cf.excluido, FALSE) = FALSE;
  END IF;

  IF to_regprocedure('controlshub_calcular_status_cotacao(bigint, character varying, character varying, character varying, boolean)') IS NOT NULL THEN
    PERFORM controlshub_calcular_status_cotacao(
      v_cotacao.empresa_id,
      v_cotacao.tipo_documento,
      v_cotacao.numero_documento,
      v_cotacao.codigo_chave,
      TRUE
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_controlshub_cliente_retira_cep_cft()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.transportadora_id = 52472 THEN
    PERFORM controlshub_remover_cliente_retira_cep_diferente(
      NEW.empresa_id,
      NEW.tipo_documento,
      NEW.numero_documento,
      NEW.codigo_chave
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_controlshub_cliente_retira_cep_cft ON cotacoes_frete_transportadoras;
CREATE TRIGGER trg_controlshub_cliente_retira_cep_cft
AFTER INSERT OR UPDATE OF transportadora_id, valor_frete, prazo_dias, selecionada, escolhida_plataforma
ON cotacoes_frete_transportadoras
FOR EACH ROW
WHEN (NEW.transportadora_id = 52472)
EXECUTE FUNCTION trg_controlshub_cliente_retira_cep_cft();

CREATE OR REPLACE FUNCTION trg_controlshub_cliente_retira_cep_cf()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM controlshub_remover_cliente_retira_cep_diferente(
    NEW.empresa_id,
    NEW.tipo_documento,
    NEW.numero_documento,
    NEW.codigo_chave
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_controlshub_cliente_retira_cep_cf ON cotacoes_frete;
CREATE TRIGGER trg_controlshub_cliente_retira_cep_cf
AFTER INSERT OR UPDATE OF cep_destino, transportadora_escolhida_id, transportadora_final_id
ON cotacoes_frete
FOR EACH ROW
WHEN (
  NEW.transportadora_escolhida_id = 52472
  OR NEW.transportadora_final_id = 52472
  OR regexp_replace(COALESCE(NEW.cep_destino, ''), '[^0-9]', '', 'g') <> '87050440'
)
EXECUTE FUNCTION trg_controlshub_cliente_retira_cep_cf();

DO $$
DECLARE
  registro RECORD;
BEGIN
  ALTER TABLE cotacoes_frete DISABLE TRIGGER USER;
  ALTER TABLE cotacoes_frete_transportadoras DISABLE TRIGGER USER;

  CREATE TEMP TABLE tmp_cliente_retira_cep_diferente AS
  SELECT DISTINCT cf.empresa_id, cf.tipo_documento, cf.numero_documento, cf.codigo_chave
  FROM cotacoes_frete cf
  WHERE COALESCE(cf.excluido, FALSE) = FALSE
    AND regexp_replace(COALESCE(cf.cep_destino, ''), '[^0-9]', '', 'g') <> '87050440'
    AND (
      cf.escolhido_em >= TIMESTAMPTZ '2026-08-31 20:50:00+00'
      OR cf.alterado_em >= TIMESTAMPTZ '2026-08-31 20:50:00+00'
      OR EXISTS (
        SELECT 1
        FROM cotacoes_frete_transportadoras cft_periodo
        WHERE cft_periodo.empresa_id = cf.empresa_id
          AND cft_periodo.tipo_documento = cf.tipo_documento
          AND cft_periodo.numero_documento = cf.numero_documento
          AND cft_periodo.codigo_chave = cf.codigo_chave
          AND cft_periodo.transportadora_id = 52472
          AND cft_periodo.alterado_em >= TIMESTAMPTZ '2026-08-31 20:50:00+00'
      )
    )
    AND (
      cf.transportadora_escolhida_id = 52472
      OR cf.transportadora_final_id = 52472
      OR EXISTS (
        SELECT 1
        FROM cotacoes_frete_transportadoras cft
        WHERE cft.empresa_id = cf.empresa_id
          AND cft.tipo_documento = cf.tipo_documento
          AND cft.numero_documento = cf.numero_documento
          AND cft.codigo_chave = cf.codigo_chave
          AND cft.transportadora_id = 52472
      )
    );

  DELETE FROM cotacoes_frete_transportadoras cft
  USING tmp_cliente_retira_cep_diferente tmp
  WHERE cft.empresa_id = tmp.empresa_id
    AND cft.tipo_documento = tmp.tipo_documento
    AND cft.numero_documento = tmp.numero_documento
    AND cft.codigo_chave = tmp.codigo_chave
    AND cft.transportadora_id = 52472;

  UPDATE cotacoes_frete cf
  SET transportadora_escolhida_id = NULL,
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
  FROM tmp_cliente_retira_cep_diferente tmp
  WHERE cf.empresa_id = tmp.empresa_id
    AND cf.tipo_documento = tmp.tipo_documento
    AND cf.numero_documento = tmp.numero_documento
    AND cf.codigo_chave = tmp.codigo_chave
    AND (
      cf.transportadora_escolhida_id = 52472
      OR cf.transportadora_final_id = 52472
    );

  FOR registro IN
    SELECT empresa_id, tipo_documento, numero_documento, codigo_chave
    FROM tmp_cliente_retira_cep_diferente
  LOOP
    IF to_regprocedure('controlshub_calcular_status_cotacao(bigint, character varying, character varying, character varying, boolean)') IS NOT NULL THEN
      PERFORM controlshub_calcular_status_cotacao(
        registro.empresa_id,
        registro.tipo_documento,
        registro.numero_documento,
        registro.codigo_chave,
        TRUE
      );
    END IF;
  END LOOP;

  DROP TABLE IF EXISTS tmp_cliente_retira_cep_diferente;

  ALTER TABLE cotacoes_frete ENABLE TRIGGER USER;
  ALTER TABLE cotacoes_frete_transportadoras ENABLE TRIGGER USER;
END;
$$;
