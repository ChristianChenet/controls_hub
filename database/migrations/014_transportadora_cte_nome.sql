ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS transportadora_cte_nome VARCHAR(180);

ALTER TABLE cotacoes_frete_ctes
  ADD COLUMN IF NOT EXISTS transportadora_cte_nome VARCHAR(180);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cotacoes_frete'
      AND column_name = 'transportadora_cte_nome'
  ) THEN
    EXECUTE '
      UPDATE cotacoes_frete_ctes cte
      SET transportadora_cte_nome = c.transportadora_cte_nome
      FROM cotacoes_frete c
      WHERE c.empresa_id = cte.empresa_id
        AND c.tipo_documento = cte.tipo_documento
        AND c.numero_documento = cte.numero_documento
        AND c.codigo_chave = cte.codigo_chave
        AND COALESCE(cte.transportadora_cte_nome, '''') = ''''
        AND COALESCE(c.transportadora_cte_nome, '''') <> '''''
    ;
  END IF;
END $$;
