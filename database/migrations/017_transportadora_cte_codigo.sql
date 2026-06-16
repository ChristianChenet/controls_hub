-- Adiciona o codigo da transportadora na tabela de CT-es para permitir
-- buscar o nome da transportadora pelo cadastro oficial.

ALTER TABLE cotacoes_frete_ctes
  ADD COLUMN IF NOT EXISTS transportadora_cte_codigo VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_ctes_transportadora_codigo
  ON cotacoes_frete_ctes (transportadora_cte_codigo);

UPDATE cotacoes_frete_ctes cte
SET transportadora_cte_codigo = t.codigo_interno,
  transportadora_cte_nome = COALESCE(cte.transportadora_cte_nome, t.nome_fantasia, t.razao_social)
FROM cotacoes_frete c
INNER JOIN transportadoras t
  ON t.id = c.transportadora_escolhida_id
WHERE c.empresa_id = cte.empresa_id
  AND c.tipo_documento = cte.tipo_documento
  AND c.numero_documento = cte.numero_documento
  AND c.codigo_chave = cte.codigo_chave
  AND COALESCE(cte.transportadora_cte_codigo, '') = '';
