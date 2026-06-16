-- CONTROL S HUB - MODELOS DE CONSULTA PARA INTEGRACAO N8N / ERP
-- Banco destino do portal: CONTROLSHUB
-- Empresa inicial em producao: MONVIZO
-- Usuario tecnico inicial: christian@controlsconsultoria.com.br
--
-- FLUXO RECOMENDADO NO N8N
-- 1. Buscar pedidos/notas elegiveis no ERP usando o SELECT 01.
-- 2. Para cada documento, buscar itens usando o SELECT 02.
-- 3. Para cada documento, buscar cotacoes automaticas usando o SELECT 03.
-- 4. Montar um JSON unico e enviar para:
--    POST /api/integracoes/erp/cotacoes
-- 5. Quando o Control S Hub aprovar a transportadora, consultar:
--    GET /api/integracoes/erp/pendentes
-- 6. Atualizar o ERP via n8n.
-- 7. Confirmar no Control S Hub:
--    POST /api/integracoes/erp/cotacoes/:id/confirmar-atualizacao
-- 8. Atualizar faturamento e CT-e conforme SELECT 04 e SELECT 05:
--    POST /api/cotacao-frete/cotacoes/:id/fluxo-erp

-- ================================================================
-- ETAPAS OFICIAIS DO KANBAN
-- ================================================================
-- Use estes codigos para status/etapa. Nao inventar outros codigos no ERP/n8n.
SELECT
  EK.CODIGO AS CODIGO_ETAPA, -- Codigo tecnico usado nas integracoes.
  EK.NOME AS NOME_ETAPA, -- Nome apresentado no Kanban.
  EK.ORDEM AS ORDEM_ETAPA, -- Ordem visual no funil.
  EK.PERMITE_ARRASTAR AS PERMITE_MOVIMENTACAO_MANUAL, -- Se o usuario pode mover manualmente.
  EK.OBRIGA_FEEDBACK AS OBRIGA_FEEDBACK -- Se exige observacao ao movimentar.
FROM ETAPAS_KANBAN EK
INNER JOIN EMPRESAS E ON E.ID = EK.EMPRESA_ID
WHERE E.CODIGO_EMPRESA = 'MONVIZO'
ORDER BY EK.ORDEM;

-- Codigos esperados:
-- RECEBIDO_ERP
-- COTACAO_AUTOMATICA_RECEBIDA
-- AGUARDANDO_RETORNO_TRANSPORTADORA
-- EM_ANALISE
-- APROVADO
-- AGUARDANDO_FATURAMENTO
-- FATURADO
-- AGUARDANDO_CTE
-- CTE_RECEBIDO
-- BLOQUEADO_FINALIZADO

-- ================================================================
-- SELECT 01 - DOCUMENTOS/PEDIDOS/NOTAS ELEGIVEIS PARA COTACAO
-- ================================================================
-- Trocar os nomes das tabelas abaixo pelas tabelas reais do ERP.
-- O importante e manter os aliases, pois eles viram o JSON enviado ao Hub.
SELECT
  'PEDIDO' AS TIPO_DOCUMENTO, -- PEDIDO ou NOTA_FISCAL.
  P.NUMERO_PEDIDO AS NUMERO_DOCUMENTO, -- Numero principal exibido no portal.
  P.NUMERO_PEDIDO AS NUMERO_PEDIDO, -- Numero do pedido quando existir.
  NF.CHAVE_NFE AS CHAVE_NFE, -- Chave NF-e quando ja existir.
  CAST(P.DATA_PEDIDO AS DATE) AS DATA_DOCUMENTO, -- Data do pedido/nota para filtros e Kanban.
  CASE
    WHEN P.ORIGEM = 'MARKETPLACE' THEN 'MARKETPLACE'
    WHEN P.ORIGEM = 'TELEVENDAS' THEN 'TELEVENDAS'
    ELSE 'ERP'
  END AS ORIGEM_COMERCIAL, -- Origem operacional do processo.
  P.CODIGO_VENDEDOR AS VENDEDOR_CODIGO, -- Codigo do vendedor.
  P.NOME_VENDEDOR AS VENDEDOR_NOME, -- Nome do vendedor.
  P.LOJA_ORIGEM AS LOJA_ORIGEM, -- Loja/local de coleta.
  P.LOJA_DESTINO AS LOJA_DESTINO, -- Loja destino quando houver transferencia.
  P.VALOR_MERCADORIA AS VALOR_MERCADORIA, -- Valor total dos produtos.
  P.PESO_REAL AS PESO_REAL, -- Peso real total.
  P.VOLUMES_TOTAL AS VOLUMES_TOTAL, -- Total de volumes.
  P.CUBAGEM_TOTAL AS CUBAGEM_TOTAL, -- Cubagem total.
  P.PERCENTUAL_FRETE_NF AS PERCENTUAL_SOBRE_NF, -- Percentual de frete sobre NF quando houver.
  P.VALOR_SOLICITADO AS VALOR_SOLICITADO, -- Valor solicitado/orcado originalmente.
  P.VALOR_FRETE_VENDA AS VALOR_FRETE_VENDA, -- Frete cobrado/informado na venda.
  P.PRAZO_INFORMADO_VENDA_DIAS AS PRAZO_INFORMADO_VENDA_DIAS, -- Prazo informado na venda.
  P.CEP_DESTINO AS CEP_DESTINO, -- CEP destino.
  P.UF_DESTINO AS UF_DESTINO, -- UF destino.
  P.CIDADE_DESTINO AS CIDADE_DESTINO, -- Cidade destino.
  P.ENDERECO_DESTINATARIO AS ENDERECO_DESTINATARIO, -- Endereco destino completo.
  P.NOME_DESTINATARIO AS NOME_DESTINATARIO, -- Nome do cliente/destinatario.
  P.DOCUMENTO_DESTINATARIO AS DOCUMENTO_DESTINATARIO, -- CPF/CNPJ destinatario.
  P.DESTINO_ZONA_RURAL AS DESTINO_ZONA_RURAL, -- TRUE/FALSE.
  P.DESTINATARIO_PESSOA_FISICA AS DESTINATARIO_PESSOA_FISICA, -- TRUE/FALSE.
  P.CODIGO_TRANSPORTADORA AS TRANSPORTADORA_PEDIDO_CODIGO, -- Marketplace: transportadora definida no pedido.
  P.NOME_TRANSPORTADORA AS TRANSPORTADORA_PEDIDO_NOME, -- Nome da transportadora definida no pedido.
  P.VALOR_FRETE_PEDIDO AS VALOR_FRETE_PEDIDO, -- Valor de frete do pedido quando houver.
  P.PRAZO_PEDIDO_DIAS AS PRAZO_PEDIDO_DIAS, -- Prazo de entrega do pedido quando houver.
  CASE
    WHEN P.CANCELADO = 1 THEN 'CANCELADO'
    WHEN P.EXCLUIDO = 1 THEN 'EXCLUIDO'
    ELSE 'ATIVO'
  END AS SITUACAO_PEDIDO, -- ATIVO, CANCELADO ou EXCLUIDO.
  P.DATA_CANCELAMENTO AS CANCELADO_EM, -- Data de cancelamento.
  P.DATA_EXCLUSAO AS EXCLUIDO_ORIGEM_EM, -- Data de exclusao no ERP.
  P.ID_EXTERNO AS IDENTIFICADOR_EXTERNO, -- ID unico do ERP para idempotencia.
  CONCAT(P.NUMERO_PEDIDO, '-P001') AS CODIGO_CHAVE, -- Chave do envio parcial. Para pedido inteiro usar P001.
  P.ID_EXTERNO AS IDEMPOTENCIA_ORIGEM -- Chave unica para evitar duplicidade no n8n.
FROM ERP_PEDIDOS P
LEFT JOIN ERP_NOTAS_FISCAIS NF ON NF.PEDIDO_ID = P.ID
WHERE P.DATA_PEDIDO >= CURRENT_DATE - INTERVAL '30 DAYS'
  AND P.ELEGIVEL_COTACAO_FRETE = 1;

-- ================================================================
-- SELECT 02 - ITENS DO DOCUMENTO / ENVIO PARCIAL
-- ================================================================
SELECT
  P.NUMERO_PEDIDO AS NUMERO_DOCUMENTO, -- Deve bater com SELECT 01.
  CONCAT(P.NUMERO_PEDIDO, '-P001') AS CODIGO_CHAVE, -- Mesma chave parcial do SELECT 01.
  I.CODIGO_ITEM AS CODIGO_ITEM, -- Codigo do produto.
  I.DESCRICAO_ITEM AS DESCRICAO_ITEM, -- Descricao do produto.
  I.QUANTIDADE AS QUANTIDADE, -- Quantidade enviada para cotacao.
  I.CUBAGEM_ITEM AS CUBAGEM_ITEM, -- Cubagem do item.
  I.LARGURA AS LARGURA, -- Largura.
  I.ALTURA AS ALTURA, -- Altura.
  I.COMPRIMENTO AS COMPRIMENTO, -- Comprimento.
  I.PESO_ITEM AS PESO_ITEM -- Peso do item.
FROM ERP_PEDIDOS P
INNER JOIN ERP_PEDIDOS_ITENS I ON I.PEDIDO_ID = P.ID
WHERE P.ELEGIVEL_COTACAO_FRETE = 1;

-- ================================================================
-- SELECT 03 - COTACOES AUTOMATICAS ERP / INTELIPOST
-- ================================================================
SELECT
  P.NUMERO_PEDIDO AS NUMERO_DOCUMENTO, -- Deve bater com SELECT 01.
  CONCAT(P.NUMERO_PEDIDO, '-P001') AS CODIGO_CHAVE, -- Mesma chave parcial.
  T.CODIGO_TRANSPORTADORA AS CODIGO_TRANSPORTADORA, -- Codigo interno da transportadora.
  T.NOME_TRANSPORTADORA AS NOME_TRANSPORTADORA, -- Nome/fantasia da transportadora.
  T.VALOR_FRETE AS VALOR_FRETE, -- Valor retornado automaticamente.
  T.PERCENTUAL_FRETE AS PERCENTUAL_FRETE, -- Percentual sobre NF quando houver.
  T.RANKING_FRETE AS RANKING_FRETE, -- Posicao retornada pelo ERP/Intelipost.
  T.PRAZO_DIAS AS PRAZO_DIAS, -- Prazo retornado pela cotacao automatica.
  T.DATA_HORA_COTACAO AS DATA_HORA_COTACAO, -- Momento da cotacao automatica.
  T.ORIGEM_COTACAO AS ORIGEM_COTACAO, -- ERP, INTELIPOST ou AUTOMATICA.
  T.OBSERVACAO AS OBSERVACAO, -- Observacao tecnica.
  T.STATUS_COTACAO AS STATUS_COTACAO -- Status da cotacao automatica.
FROM ERP_PEDIDOS P
INNER JOIN ERP_COTACOES_FRETE T ON T.PEDIDO_ID = P.ID
WHERE P.ELEGIVEL_COTACAO_FRETE = 1;

-- REGRA MARKETPLACE:
-- Se o pedido vier com TRANSPORTADORA_PEDIDO_CODIGO, a cotacao automatica deve considerar
-- apenas essa transportadora. No n8n, filtre o SELECT 03 por esse codigo quando existir.

-- ================================================================
-- SELECT 04 - FATURAMENTO / NF-E
-- ================================================================
-- Usar para chamar POST /api/cotacao-frete/cotacoes/:id/fluxo-erp
-- com status FATURADO ou AGUARDANDO_CTE.
SELECT
  P.NUMERO_PEDIDO AS NUMERO_DOCUMENTO, -- Documento original.
  CONCAT(P.NUMERO_PEDIDO, '-P001') AS CODIGO_CHAVE, -- Chave parcial.
  NF.NUMERO_NFE AS NUMERO_NFE, -- Numero da NF-e faturada.
  NF.DATA_FATURAMENTO AS FATURADO_EM, -- Data/hora faturamento.
  'FATURADO' AS STATUS_FLUXO, -- Status para o endpoint.
  NF.PAYLOAD_ORIGINAL AS PAYLOAD -- Payload bruto opcional para rastreabilidade.
FROM ERP_PEDIDOS P
INNER JOIN ERP_NOTAS_FISCAIS NF ON NF.PEDIDO_ID = P.ID
WHERE NF.EMITIDA = 1;

-- ================================================================
-- SELECT 05 - CT-E RECEBIDO
-- ================================================================
-- Usar para chamar POST /api/cotacao-frete/cotacoes/:id/fluxo-erp
-- com status CTE_RECEBIDO.
SELECT
  P.NUMERO_PEDIDO AS NUMERO_DOCUMENTO, -- Documento original.
  CONCAT(P.NUMERO_PEDIDO, '-P001') AS CODIGO_CHAVE, -- Chave parcial.
  CTE.NUMERO_NFE AS NUMERO_NFE, -- Numero NF-e vinculada.
  CTE.NUMERO_CTE AS NUMERO_CTE, -- Numero CT-e.
  CTE.DATA_RECEBIMENTO AS CTE_RECEBIDO_EM, -- Data/hora recebimento CT-e.
  CTE.CODIGO_TRANSPORTADORA AS TRANSPORTADORA_CODIGO, -- Codigo da transportadora efetiva.
  CTE.NOME_TRANSPORTADORA AS TRANSPORTADORA_NOME, -- Nome da transportadora efetiva.
  CTE.VALOR_FRETE AS VALOR_FRETE_CTE, -- Valor real do frete no CT-e.
  CTE.PRAZO_DIAS AS PRAZO_CTE_DIAS, -- Prazo real/estimado quando houver.
  'CTE_RECEBIDO' AS STATUS_FLUXO, -- Status para o endpoint.
  CTE.PAYLOAD_ORIGINAL AS PAYLOAD -- Payload bruto opcional para auditoria.
FROM ERP_PEDIDOS P
INNER JOIN ERP_CTES CTE ON CTE.PEDIDO_ID = P.ID
WHERE CTE.RECEBIDO = 1;

-- ================================================================
-- SELECT 06 - TRANSPORTADORAS CADASTRAVEIS NO HUB
-- ================================================================
-- Use quando quiser popular o cadastro de transportadoras por n8n/API.
SELECT
  T.CODIGO_TRANSPORTADORA AS CODIGO_INTERNO, -- Codigo interno.
  T.RAZAO_SOCIAL AS RAZAO_SOCIAL, -- Razao social.
  T.NOME_FANTASIA AS NOME_FANTASIA, -- Nome fantasia.
  T.CNPJ_CPF AS DOCUMENTO, -- CNPJ/CPF.
  T.EMAIL AS EMAIL, -- E-mail para envio de link.
  T.TELEFONE AS TELEFONE, -- Telefone.
  T.RESPONSAVEL AS RESPONSAVEL, -- Contato responsavel.
  TRUE AS ACEITA_COTACAO_EXTERNA, -- Permite link publico.
  TRUE AS APRESENTA_MENOR_COTACAO, -- Mostra menor frete atual no link.
  TRUE AS APRESENTA_CUBAGEM, -- Mostra cubagem no link.
  TRUE AS APRESENTA_PESO, -- Mostra peso no link.
  TRUE AS APRESENTA_VALOR_TABELA, -- Mostra valor tabela no link.
  TRUE AS RECEBE_PRAZO_SOLICITADO, -- Mostra prazo da venda.
  TRUE AS EXIGE_PRAZO_RESPOSTA, -- Solicita prazo no link.
  FALSE AS PRAZO_RESPOSTA_OBRIGATORIO, -- Se prazo e obrigatorio.
  TRUE AS APRESENTA_LISTA_PRODUTOS, -- Mostra produtos no link.
  24 AS SLA_RESPOSTA_HORAS, -- SLA padrao de resposta.
  T.ATIVA AS ATIVA -- Ativa/inativa.
FROM ERP_TRANSPORTADORAS T
WHERE T.ATIVA = 1;

-- ================================================================
-- PAYLOAD JSON RECOMENDADO PARA POST /api/integracoes/erp/cotacoes
-- ================================================================
-- {
--   "tipo_documento": "PEDIDO",
--   "numero_documento": "12345",
--   "codigo_chave": "12345-P001",
--   "origem_comercial": "TELEVENDAS",
--   "vendedor_codigo": "001",
--   "vendedor_nome": "Nome vendedor",
--   "valor_frete_venda": 100.00,
--   "prazo_informado_venda_dias": 3,
--   "itens": [],
--   "cotacoes": []
-- }
