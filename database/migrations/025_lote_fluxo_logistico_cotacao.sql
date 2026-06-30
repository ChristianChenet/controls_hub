-- Adiciona o identificador do lote do fluxo logistico na cotacao de frete.
-- Campo usado para filtrar e evidenciar cotações originadas do fluxo logistico.

ALTER TABLE public.cotacoes_frete
  ADD COLUMN IF NOT EXISTS lote_fluxo_logistico VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_lote_fluxo_logistico
  ON public.cotacoes_frete (empresa_id, lote_fluxo_logistico)
  WHERE COALESCE(excluido, FALSE) = FALSE
    AND lote_fluxo_logistico IS NOT NULL
    AND TRIM(lote_fluxo_logistico) <> '';
