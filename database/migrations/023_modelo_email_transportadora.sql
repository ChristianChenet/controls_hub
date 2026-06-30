-- CONTROL S HUB
-- Modelo configuravel do e-mail enviado para transportadoras.

ALTER TABLE usuarios_configuracoes_email
  ADD COLUMN IF NOT EXISTS modelo_email_transportadora TEXT;

UPDATE usuarios_configuracoes_email
SET modelo_email_transportadora = '<div style="font-family:Arial,sans-serif;color:#172033">
  <p>Olá, TRANSPORTADORA.</p>
  <p>Solicitamos a cotação de frete dos documentos abaixo:</p>
  <p>DOCUMENTOS</p>
  <br></br>
  <p>Atenciosamente.</p>
</div>'
WHERE modelo_email_transportadora IS NULL;
