-- CONTROL S HUB
-- Fechamento operacional da Cotacao de Frete: venda, faturamento, CTe, links e operacao.

ALTER TABLE cotacoes_frete
  ADD COLUMN IF NOT EXISTS vendedor_codigo VARCHAR(80),
  ADD COLUMN IF NOT EXISTS vendedor_nome VARCHAR(180),
  ADD COLUMN IF NOT EXISTS valor_frete_venda NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS prazo_informado_venda_dias INTEGER,
  ADD COLUMN IF NOT EXISTS transportadora_pedido_id BIGINT REFERENCES transportadoras(id),
  ADD COLUMN IF NOT EXISTS numero_nfe_faturada VARCHAR(80),
  ADD COLUMN IF NOT EXISTS faturado_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS numero_cte VARCHAR(80),
  ADD COLUMN IF NOT EXISTS cte_recebido_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS transportadora_cte_id BIGINT REFERENCES transportadoras(id),
  ADD COLUMN IF NOT EXISTS transportadora_cte_codigo VARCHAR(80),
  ADD COLUMN IF NOT EXISTS transportadora_cte_nome VARCHAR(180),
  ADD COLUMN IF NOT EXISTS valor_frete_cte NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS prazo_cte_dias INTEGER,
  ADD COLUMN IF NOT EXISTS payload_cte JSONB,
  ADD COLUMN IF NOT EXISTS payload_faturamento JSONB,
  ADD COLUMN IF NOT EXISTS payload_retorno_erp JSONB,
  ADD COLUMN IF NOT EXISTS retorno_erp_em TIMESTAMP;

UPDATE cotacoes_frete
SET prazo_informado_venda_dias = COALESCE(prazo_informado_venda_dias, prazo_vendedor_dias),
  valor_frete_venda = COALESCE(valor_frete_venda, valor_solicitado)
WHERE prazo_informado_venda_dias IS NULL
  OR valor_frete_venda IS NULL;

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES
  ('ADICIONAR_TRANSPORTADORA_COTACAO', 'Adicionar Transportadora na Cotacao', 'Permite incluir transportadora adicional para concorrencia por link.', TRUE),
  ('COPIAR_LINK_COTACAO', 'Copiar Link de Cotacao', 'Permite copiar link ja enviado para transportadora.', TRUE),
  ('REGISTRAR_TIMELINE_COTACAO', 'Registrar Timeline da Cotacao', 'Permite incluir observacoes operacionais na timeline da cotacao.', TRUE),
  ('ATUALIZAR_FLUXO_ERP_COTACAO', 'Atualizar Fluxo ERP da Cotacao', 'Permite registrar atualizacoes de ERP, faturamento e CTe.', TRUE)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

INSERT INTO etapas_kanban (empresa_id, modulo_id, codigo, nome, descricao, cor, ordem, permite_arrastar, etapa_final, etapa_bloqueada, ativa)
SELECT e.id, m.id, etapa.codigo, etapa.nome, etapa.descricao, etapa.cor, etapa.ordem, etapa.permite_arrastar, etapa.etapa_final, etapa.etapa_bloqueada, TRUE
FROM empresas e
CROSS JOIN modulos m
CROSS JOIN (
  VALUES
    ('AGUARDANDO_FATURAMENTO', 'Aguardando Faturamento', 'Cotacao aprovada aguardando faturamento da venda.', '#38BDF8', 80, FALSE, FALSE, FALSE),
    ('FATURADO', 'Faturado', 'Nota fiscal faturada pela integracao.', '#22C55E', 90, FALSE, FALSE, FALSE),
    ('AGUARDANDO_CTE', 'Aguardando CTe', 'Aguardando recebimento do CTe para fechamento do frete.', '#F59E0B', 100, FALSE, FALSE, FALSE),
    ('CTE_RECEBIDO', 'CTe Recebido', 'CTe recebido e comparado com a cotacao aprovada.', '#10B981', 110, FALSE, TRUE, TRUE)
) AS etapa(codigo, nome, descricao, cor, ordem, permite_arrastar, etapa_final, etapa_bloqueada)
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

UPDATE etapas_kanban
SET ordem = CASE codigo
    WHEN 'RECEBIDO_ERP' THEN 10
    WHEN 'COTACAO_AUTOMATICA_RECEBIDA' THEN 20
    WHEN 'AGUARDANDO_REENVIO_TRANSPORTADORA' THEN 30
    WHEN 'AGUARDANDO_RETORNO_TRANSPORTADORA' THEN 40
    WHEN 'EM_ANALISE' THEN 50
    WHEN 'APROVADO' THEN 60
    WHEN 'INTEGRADO_ERP' THEN 70
    WHEN 'AGUARDANDO_FATURAMENTO' THEN 80
    WHEN 'FATURADO' THEN 90
    WHEN 'AGUARDANDO_CTE' THEN 100
    WHEN 'CTE_RECEBIDO' THEN 110
    WHEN 'BLOQUEADO_FINALIZADO' THEN 120
    ELSE ordem
  END,
  etapa_final = CASE WHEN codigo IN ('CTE_RECEBIDO', 'BLOQUEADO_FINALIZADO') THEN TRUE ELSE etapa_final END
WHERE codigo IN (
  'RECEBIDO_ERP',
  'COTACAO_AUTOMATICA_RECEBIDA',
  'AGUARDANDO_REENVIO_TRANSPORTADORA',
  'AGUARDANDO_RETORNO_TRANSPORTADORA',
  'EM_ANALISE',
  'APROVADO',
  'INTEGRADO_ERP',
  'AGUARDANDO_FATURAMENTO',
  'FATURADO',
  'AGUARDANDO_CTE',
  'CTE_RECEBIDO',
  'BLOQUEADO_FINALIZADO'
);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_nfe
  ON cotacoes_frete (empresa_id, numero_nfe_faturada);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_cte
  ON cotacoes_frete (empresa_id, numero_cte);

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_retorno_erp
  ON cotacoes_frete (empresa_id, retorno_erp_status);
