-- CONTROL S HUB
-- Permite configurar alteracao manual do frete cotado mesmo apos CT-e emitido.

INSERT INTO parametros_sistema (chave, valor, descricao)
VALUES (
  'PERMITE_ALTERAR_FRETE_COTADO_APOS_CTE',
  'SIM',
  'Permite alterar valor e prazo do frete cotado manualmente mesmo quando a cotacao estiver com CT-e emitido.'
)
ON CONFLICT (chave) DO UPDATE SET
  valor = COALESCE(NULLIF(parametros_sistema.valor, ''), EXCLUDED.valor),
  descricao = EXCLUDED.descricao,
  alterado_em = NOW();

INSERT INTO acoes (codigo, nome, descricao, ativo)
VALUES (
  'ALTERAR_COTACAO_MANUAL',
  'Alterar Cotacao Manual',
  'Permite alterar manualmente valor recebido da transportadora, conforme configuracao do sistema.',
  TRUE
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

INSERT INTO perfis_permissoes (
  perfil_id,
  empresa_id,
  modulo_id,
  acao_id,
  permitido
)
SELECT
  p.id,
  e.id,
  m.id,
  a.id,
  TRUE
FROM perfis p
CROSS JOIN empresas e
INNER JOIN modulos m
  ON m.codigo = 'COTACAO_FRETE'
INNER JOIN acoes a
  ON a.codigo = 'ALTERAR_COTACAO_MANUAL'
WHERE NOT EXISTS (
  SELECT 1
  FROM perfis_permissoes pp
  WHERE pp.perfil_id = p.id
    AND pp.empresa_id = e.id
    AND pp.modulo_id = m.id
    AND pp.acao_id = a.id
);
