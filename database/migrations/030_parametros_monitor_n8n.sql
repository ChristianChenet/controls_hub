-- Parametros do semaforo do n8n.
-- Script aditivo: nao remove dados e pode ser executado mais de uma vez.

INSERT INTO parametros_sistema (chave, valor, descricao, sensivel)
VALUES
  ('URL_MONITOR_N8N', 'http://192.168.1.70:5678/', 'URL usada para monitorar se o n8n esta online.', FALSE),
  ('INTERVALO_MONITOR_N8N_MINUTOS', '15', 'Intervalo em minutos para atualizar o semaforo do n8n.', FALSE),
  ('LIMITE_ALERTA_INTEGRACAO_N8N_MINUTOS', '30', 'Tempo maximo sem integracao de cotacao de frete antes do alerta amarelo.', FALSE)
ON CONFLICT (chave) DO UPDATE
SET
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao,
  sensivel = EXCLUDED.sensivel;
