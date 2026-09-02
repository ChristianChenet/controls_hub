-- Corrige a persistência do PIM: cada produto deve ter seu próprio registro por concorrente.
-- Não altera Cotação de Frete nem entidades globais.
BEGIN;

-- Remove duplicidades históricas por produto/fonte, mantendo a versão mais recente.
WITH ordenados AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY empresa_id, fonte_id, produto_id
           ORDER BY alterado_em DESC NULLS LAST, criado_em DESC NULLS LAST, id DESC
         ) AS ordem
  FROM pim_comparacao_registros
  WHERE produto_id IS NOT NULL
)
DELETE FROM pim_comparacao_registros r
USING ordenados o
WHERE r.id = o.id
  AND o.ordem > 1;

ALTER TABLE pim_comparacao_registros
  DROP CONSTRAINT IF EXISTS pim_comparacao_registros_url_unico;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pim_comparacao_registros_empresa_fonte_produto_unico
  ON pim_comparacao_registros (empresa_id, fonte_id, produto_id)
  WHERE produto_id IS NOT NULL;

COMMIT;
