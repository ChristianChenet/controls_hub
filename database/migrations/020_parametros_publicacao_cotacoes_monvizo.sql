-- Parametros de publicacao externa do portal de cotacoes Monvizo.
-- Script aditivo e seguro: nao apaga dados, apenas ajusta os parametros de URL.

INSERT INTO parametros_sistema (
  chave,
  valor,
  descricao,
  sensivel
)
VALUES
  ('AMBIENTE_LINK_COTACAO', 'HOMOLOGACAO', 'Ambiente operacional do link de cotacao. Os links compartilhados usam URL_PUBLICA_COTACAO.', FALSE),
  ('URL_PUBLICA_COTACAO', 'http://frete.monvizo.com.br:8080/', 'URL publica base para links de cotacao enviados para transportadoras.', FALSE),
  ('URL_INTERNA_COTACAO', 'http://192.168.1.70:5174/', 'URL interna/base para referencia tecnica e chamadas internas quando aplicavel.', FALSE)
ON CONFLICT (chave) DO UPDATE SET
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao,
  sensivel = EXCLUDED.sensivel;

UPDATE empresas
SET dominio_publico = 'frete.monvizo.com.br:8080',
  alterado_em = NOW()
WHERE COALESCE(codigo_empresa, '') = 'MONVIZO'
   OR COALESCE(nome_fantasia, '') ILIKE '%MONVIZO%'
   OR COALESCE(nome_exibido, '') ILIKE '%MONVIZO%';
