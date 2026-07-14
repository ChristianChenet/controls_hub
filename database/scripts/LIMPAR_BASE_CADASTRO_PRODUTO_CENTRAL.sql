-- CONTROL S HUB
-- LIMPEZA MANUAL DA BASE DO CADASTRO DE PRODUTO CENTRAL
--
-- OBJETIVO:
--   Limpar produtos, conjuntos, vinculos, caracteristicas, historico operacional,
--   aprovacoes, sugestoes de IA e status por canal do modulo Cadastro de Produto Central.
--
-- NAO ALTERA:
--   Cotacao de Frete, usuarios, empresas, perfis, permissoes, configuracoes globais,
--   atributos cadastrados, canais, conexoes SQL Server, consultas salvas e assets da biblioteca.
--
-- COMO USAR:
--   1. Troque o valor de EMPRESA_ID abaixo pelo ID da empresa correta.
--   2. Execute primeiro em homologacao ou backup local.
--   3. Revise o total exibido antes do COMMIT.

BEGIN;

DROP TABLE IF EXISTS tmp_pim_produtos_limpeza;
CREATE TEMP TABLE tmp_pim_produtos_limpeza AS
SELECT id
FROM produtos
WHERE empresa_id = 1; -- <<< TROQUE AQUI O ID DA EMPRESA

DO $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM tmp_pim_produtos_limpeza;
  IF v_total = 0 THEN
    RAISE NOTICE 'Nenhum produto/conjunto encontrado para limpeza.';
  ELSE
    RAISE NOTICE 'Produtos/conjuntos que serao limpos: %', v_total;
  END IF;
END $$;

DELETE FROM aprovacoes_comparacoes
WHERE aprovacao_id IN (
  SELECT id
  FROM aprovacoes
  WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza)
);

DELETE FROM aprovacoes
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM ia_sugestoes
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM integracoes_logs
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM ativos_digitais_produtos_vinculos
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM produtos_canais_status
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM atributos_valores
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza)
   OR produto_sku_id IN (
      SELECT id
      FROM produtos_skus
      WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza)
   );

DELETE FROM produtos_componentes_vinculos
WHERE conjunto_produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza)
   OR componente_produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM produtos_skus
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM produtos_versoes
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM produtos_historico_campos
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM produtos_cadastros_paralelos
WHERE produto_id IN (SELECT id FROM tmp_pim_produtos_limpeza);

DELETE FROM produtos_componentes
WHERE empresa_id = 1; -- <<< TROQUE AQUI O MESMO ID DA EMPRESA

DELETE FROM produtos
WHERE id IN (SELECT id FROM tmp_pim_produtos_limpeza);

-- OPCIONAL: descomente se quiser limpar tambem o historico de cargas/importacoes do PIM.
-- DELETE FROM pim_cargas_sqlserver WHERE empresa_id = 1;
-- DELETE FROM importacoes WHERE empresa_id = 1;

DROP TABLE IF EXISTS tmp_pim_produtos_limpeza;

COMMIT;
