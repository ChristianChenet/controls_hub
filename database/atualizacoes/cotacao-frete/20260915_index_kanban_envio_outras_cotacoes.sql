-- Acelera o contador de "outras cotacoes" usado no Kanban e no Envio de Cotacao.
-- Sem este indice, o banco precisa varrer cotacoes_frete inteira para cada card.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cotacoes_frete_empresa_pedido_ativo_perf
ON cotacoes_frete (empresa_id, COALESCE(numero_pedido, numero_documento))
WHERE COALESCE(excluido, FALSE) = FALSE;
