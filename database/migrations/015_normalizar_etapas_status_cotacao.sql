-- Normaliza as etapas oficiais do fluxo de Cotacao de Frete.
-- Script aditivo/idempotente.

WITH modulo AS (
  SELECT id
  FROM modulos
  WHERE codigo = 'COTACAO_FRETE'
  LIMIT 1
),
etapas_oficiais AS (
  SELECT *
  FROM (VALUES
    ('COTACAO_PENDENTE', 'Cotação Pendente', 'Cotações sem cotação automática recebida.', '#22C55E', 10, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('COTACAO_AUTOMATICA', 'Cotação Automática', 'Cotações automáticas recebidas do ERP/integração.', '#06B6D4', 20, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('COTACAO_TRANSPORTADORA', 'Cotação Transportadora', 'Cotações enviadas para transportadoras com resposta pendente.', '#F59E0B', 30, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('EM_ANALISE', 'Em Análise', 'Todas as respostas recebidas ou análise iniciada pelo analista.', '#3B82F6', 40, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('TRANSPORTADORA_ESCOLHIDA', 'Transportadora Escolhida', 'Transportadora final definida pelo analista.', '#8B5CF6', 50, FALSE, FALSE, FALSE, FALSE, TRUE),
    ('CTE_EMITIDO', 'CT-e Emitido', 'CT-e emitido e cotação concluída operacionalmente.', '#10B981', 60, FALSE, TRUE, FALSE, FALSE, TRUE),
    ('COTACAO_CANCELADA', 'Cotação Cancelada', 'Cotação cancelada ou pedido cancelado.', '#EF4444', 70, FALSE, TRUE, TRUE, FALSE, TRUE)
  ) AS etapa(codigo, nome, descricao, cor, ordem, permite_arrastar, etapa_final, etapa_bloqueada, obriga_feedback, ativa)
)
UPDATE etapas_kanban ek
SET nome = eo.nome,
  descricao = eo.descricao,
  cor = eo.cor,
  ordem = eo.ordem,
  permite_arrastar = eo.permite_arrastar,
  etapa_final = eo.etapa_final,
  etapa_bloqueada = eo.etapa_bloqueada,
  obriga_feedback = eo.obriga_feedback,
  ativa = eo.ativa
FROM etapas_oficiais eo
INNER JOIN modulo m ON TRUE
WHERE ek.modulo_id = m.id
  AND ek.codigo = eo.codigo;

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
  emp.id,
  m.id,
  eo.codigo,
  eo.nome,
  eo.descricao,
  eo.cor,
  eo.ordem,
  eo.permite_arrastar,
  eo.etapa_final,
  eo.etapa_bloqueada,
  eo.obriga_feedback,
  eo.ativa
FROM empresas emp
INNER JOIN modulo m ON TRUE
CROSS JOIN etapas_oficiais eo
WHERE emp.ativa = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM etapas_kanban ek
    WHERE ek.empresa_id = emp.id
      AND ek.modulo_id = m.id
      AND ek.codigo = eo.codigo
  );
