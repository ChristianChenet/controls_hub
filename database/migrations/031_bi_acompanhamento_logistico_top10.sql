-- Atualiza o dashboard exemplo de Business Intelligence para exibir Top 10 nos paineis de detalhe.
-- A regra fica em migration separada porque a 029 pode ja ter sido aplicada em clientes existentes.
UPDATE bi_dashboard_widgets w
SET top_x_registros = 10,
  altura = GREATEST(COALESCE(w.altura, 0), 5)
FROM bi_dashboards d
WHERE d.id = w.dashboard_id
  AND d.nome IN ('Acompanhamento Logistico', 'Acompanhamento Logístico')
  AND w.titulo IN (
    'Pendente Escolha da Transportadora',
    'Faturados sem Inicio de Separacao',
    'Faturados sem Início de Separação',
    'Em Separacao',
    'Em Separação',
    'Sem Entrega Total',
    'Sem Envio > 2 Dias',
    'Nao Vinculados > 1 Dia',
    'Não Vinculados > 1 Dia'
  )
  AND (
    COALESCE(w.top_x_registros, 0) <> 10
    OR COALESCE(w.altura, 0) < 5
  );

-- Limpa o cache dos widgets para forcar nova consulta com o Top 10 e manter o detalhe completo atualizado.
DELETE FROM bi_widget_cache cache
USING bi_dashboard_widgets w
INNER JOIN bi_dashboards d ON d.id = w.dashboard_id
WHERE cache.widget_id = w.id
  AND d.nome IN ('Acompanhamento Logistico', 'Acompanhamento Logístico');
