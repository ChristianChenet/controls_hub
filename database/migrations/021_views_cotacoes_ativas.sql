-- CONTROL S HUB
-- Reaplica views operacionais garantindo que cotacoes excluidas logicamente nao aparecam.

CREATE OR REPLACE VIEW vw_cotacoes_frete_resumo AS
SELECT
  c.id AS cotacao_frete_id,
  e.codigo_empresa,
  e.nome_fantasia AS empresa_nome,
  c.tipo_documento,
  c.numero_documento,
  c.numero_pedido,
  c.status,
  ek.codigo AS etapa_codigo,
  ek.nome AS etapa_nome,
  c.valor_mercadoria,
  c.peso_real,
  c.volumes_total,
  c.cubagem_total,
  c.cep_destino,
  c.uf_destino,
  c.cidade_destino,
  c.nome_destinatario,
  c.documento_destinatario,
  c.transportadora_escolhida_id,
  te.codigo_interno AS transportadora_escolhida_codigo,
  te.nome_fantasia AS transportadora_escolhida_nome,
  c.escolhido_em,
  c.atualizado_no_erp,
  c.atualizado_no_erp_em,
  c.bloqueado_para_alteracao,
  c.identificador_externo,
  c.criado_em,
  c.alterado_em
FROM cotacoes_frete c
INNER JOIN empresas e ON e.id = c.empresa_id
LEFT JOIN etapas_kanban ek ON ek.id = c.etapa_kanban_id
LEFT JOIN transportadoras te ON te.id = c.transportadora_escolhida_id
WHERE COALESCE(c.excluido, FALSE) = FALSE;

CREATE OR REPLACE VIEW vw_cotacoes_frete_transportadoras AS
SELECT
  cft.id AS cotacao_transportadora_id,
  cft.cotacao_frete_id,
  e.codigo_empresa,
  c.tipo_documento,
  c.numero_documento,
  t.codigo_interno AS transportadora_codigo,
  t.razao_social AS transportadora_razao_social,
  t.nome_fantasia AS transportadora_nome_fantasia,
  cft.valor_frete,
  cft.percentual_frete,
  cft.ranking_frete,
  cft.origem_cotacao,
  cft.observacao,
  cft.validada,
  cft.selecionada,
  cft.status,
  cft.cotada_em,
  cft.validada_em
FROM cotacoes_frete_transportadoras cft
INNER JOIN cotacoes_frete c ON c.id = cft.cotacao_frete_id
INNER JOIN empresas e ON e.id = c.empresa_id
INNER JOIN transportadoras t ON t.id = cft.transportadora_id
WHERE COALESCE(c.excluido, FALSE) = FALSE;

CREATE OR REPLACE VIEW vw_cotacoes_frete_pendentes_erp AS
SELECT
  *
FROM vw_cotacoes_frete_resumo
WHERE transportadora_escolhida_id IS NOT NULL
  AND atualizado_no_erp = FALSE
  AND bloqueado_para_alteracao = FALSE;

CREATE INDEX IF NOT EXISTS idx_cotacoes_frete_ativas_empresa
  ON cotacoes_frete (empresa_id, data_documento, status)
  WHERE COALESCE(excluido, FALSE) = FALSE;
