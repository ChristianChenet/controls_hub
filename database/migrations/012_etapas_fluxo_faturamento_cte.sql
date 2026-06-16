-- Complementa as etapas obrigatorias do fluxo operacional de cotacao de frete.
-- Mantem SQL em maiusculo e usa chave natural empresa/modulo/codigo para idempotencia.

INSERT INTO etapas_kanban (
  empresa_id,
  modulo_id,
  codigo,
  nome,
  descricao,
  cor,
  ordem,
  permite_arrastar,
  etapa_final,
  etapa_bloqueada,
  ativa,
  obriga_feedback
)
SELECT
  e.id,
  m.id,
  v.codigo,
  v.nome,
  v.descricao,
  v.cor,
  v.ordem,
  v.permite_arrastar,
  v.etapa_final,
  v.etapa_bloqueada,
  TRUE,
  FALSE
FROM empresas e
CROSS JOIN modulos m
CROSS JOIN (
  VALUES
    ('INTEGRADO_ERP', 'Integrado ao ERP', 'Cotacao aprovada enviada para retorno ao ERP.', '#14B8A6', 70, FALSE, FALSE, FALSE),
    ('AGUARDANDO_FATURAMENTO', 'Aguardando Faturamento', 'Pedido aguardando faturamento apos definicao do frete.', '#6366F1', 80, FALSE, FALSE, FALSE),
    ('FATURADO', 'Faturado', 'Documento faturado e aguardando emissao ou recebimento do CTe.', '#8B5CF6', 90, FALSE, FALSE, FALSE),
    ('AGUARDANDO_CTE', 'Aguardando CTe', 'Aguardando recebimento do CTe para fechamento do frete.', '#F59E0B', 100, FALSE, FALSE, FALSE),
    ('CTE_RECEBIDO', 'CTe Recebido', 'CTe recebido e comparado com a cotacao aprovada.', '#10B981', 110, FALSE, TRUE, TRUE)
) AS v(codigo, nome, descricao, cor, ordem, permite_arrastar, etapa_final, etapa_bloqueada)
WHERE m.codigo = 'COTACAO_FRETE'
ON CONFLICT (empresa_id, modulo_id, codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  cor = EXCLUDED.cor,
  ordem = EXCLUDED.ordem,
  permite_arrastar = EXCLUDED.permite_arrastar,
  etapa_final = EXCLUDED.etapa_final,
  etapa_bloqueada = EXCLUDED.etapa_bloqueada,
  ativa = TRUE;

