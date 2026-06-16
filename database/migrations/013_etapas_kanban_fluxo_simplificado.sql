-- Atualiza o fluxo padrao do Kanban de Cotacao de Frete para o modelo simplificado.
-- Script aditivo/idempotente: nao apaga cotacoes nem historicos.

WITH modulo AS (
  SELECT id
  FROM modulos
  WHERE codigo = 'COTACAO_FRETE'
  LIMIT 1
),
empresas_ativas AS (
  SELECT id AS empresa_id
  FROM empresas
  WHERE ativa = TRUE
),
etapas AS (
  SELECT *
  FROM (VALUES
    ('COTACAO_PENDENTE', 'Cotação Pendente', 'Cotação sem Ofertas.', '#22C55E', 10, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('COTACAO_AUTOMATICA', 'Cotação Automática', 'Cotações automáticas recebidas.', '#06B6D4', 20, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('COTACAO_TRANSPORTADORA', 'Cotação Transportadora', 'Em cotação com as Transportadoras.', '#F59E0B', 30, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('EM_ANALISE', 'Em Análise', 'Analista de Logística esta analisando as cotações.', '#3B82F6', 40, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('TRANSPORTADORA_ESCOLHIDA', 'Transportadora Escolhida', 'Transportadora escolhida.', '#8B5CF6', 50, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('CTE_EMITIDO', 'CT-e Emitido', 'CT-e Emitido pela Transportadora.', '#10B981', 60, FALSE, TRUE, FALSE, FALSE, TRUE),
    ('COTACAO_CANCELADA', 'Cotação Cancelada', 'Cotação Cancelada.', '#EF4444', 70, FALSE, TRUE, TRUE, FALSE, TRUE)
  ) AS e(codigo, nome, descricao, cor, ordem, permite_arrastar, etapa_final, etapa_bloqueada, obriga_feedback, ativa)
)
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
  obriga_feedback,
  ativa
)
SELECT
  emp.empresa_id,
  modulo.id,
  etapas.codigo,
  etapas.nome,
  etapas.descricao,
  etapas.cor,
  etapas.ordem,
  etapas.permite_arrastar,
  etapas.etapa_final,
  etapas.etapa_bloqueada,
  etapas.obriga_feedback,
  etapas.ativa
FROM empresas_ativas emp
CROSS JOIN modulo
CROSS JOIN etapas
ON CONFLICT (empresa_id, modulo_id, codigo) DO UPDATE SET
  modulo_id = EXCLUDED.modulo_id,
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  cor = EXCLUDED.cor,
  ordem = EXCLUDED.ordem,
  permite_arrastar = EXCLUDED.permite_arrastar,
  etapa_final = EXCLUDED.etapa_final,
  etapa_bloqueada = EXCLUDED.etapa_bloqueada,
  obriga_feedback = EXCLUDED.obriga_feedback,
  ativa = EXCLUDED.ativa;

UPDATE cotacoes_frete
SET status = CASE status
  WHEN 'RECEBIDO_ERP' THEN 'COTACAO_PENDENTE'
  WHEN 'COTACAO_AUTOMATICA_RECEBIDA' THEN 'COTACAO_AUTOMATICA'
  WHEN 'AGUARDANDO_REENVIO_TRANSPORTADORA' THEN 'COTACAO_TRANSPORTADORA'
  WHEN 'AGUARDANDO_RETORNO_TRANSPORTADORA' THEN 'COTACAO_TRANSPORTADORA'
  WHEN 'APROVADO' THEN 'TRANSPORTADORA_ESCOLHIDA'
  WHEN 'INTEGRADO_ERP' THEN 'TRANSPORTADORA_ESCOLHIDA'
  WHEN 'BLOQUEADO_FINALIZADO' THEN 'CTE_EMITIDO'
  WHEN 'CTE_RECEBIDO' THEN 'CTE_EMITIDO'
  ELSE status
END
WHERE status IN (
  'RECEBIDO_ERP',
  'COTACAO_AUTOMATICA_RECEBIDA',
  'AGUARDANDO_REENVIO_TRANSPORTADORA',
  'AGUARDANDO_RETORNO_TRANSPORTADORA',
  'APROVADO',
  'INTEGRADO_ERP',
  'BLOQUEADO_FINALIZADO',
  'CTE_RECEBIDO'
);

UPDATE cotacoes_frete c
SET etapa_kanban_id = e.id
FROM etapas_kanban e
WHERE e.empresa_id = c.empresa_id
  AND e.codigo = c.status
  AND e.ativa = TRUE;

UPDATE etapas_kanban e
SET ativa = FALSE
FROM modulos m
WHERE m.id = e.modulo_id
  AND m.codigo = 'COTACAO_FRETE'
  AND e.codigo NOT IN (
    'COTACAO_PENDENTE',
    'COTACAO_AUTOMATICA',
    'COTACAO_TRANSPORTADORA',
    'EM_ANALISE',
    'TRANSPORTADORA_ESCOLHIDA',
    'CTE_EMITIDO',
    'COTACAO_CANCELADA'
  );

DELETE FROM etapas_kanban e
USING modulos m
WHERE m.id = e.modulo_id
  AND m.codigo = 'COTACAO_FRETE'
  AND e.codigo NOT IN (
    'COTACAO_PENDENTE',
    'COTACAO_AUTOMATICA',
    'COTACAO_TRANSPORTADORA',
    'EM_ANALISE',
    'TRANSPORTADORA_ESCOLHIDA',
    'CTE_EMITIDO',
    'COTACAO_CANCELADA'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM cotacoes_frete c
    WHERE c.etapa_kanban_id = e.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM cotacoes_frete_historicos h
    WHERE h.etapa_origem_id = e.id
       OR h.etapa_destino_id = e.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM perfis_permissoes pp
    WHERE pp.etapa_kanban_id = e.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM usuarios_permissoes up
    WHERE up.etapa_kanban_id = e.id
  );
