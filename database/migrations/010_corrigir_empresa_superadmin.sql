-- Corrige a empresa base do superadmin para garantir acesso operacional apos seeds e testes.
UPDATE EMPRESAS
SET
  ATIVA = TRUE,
  EXCLUIDO = FALSE
WHERE ID = 1;

INSERT INTO USUARIOS_EMPRESAS (USUARIO_ID, EMPRESA_ID, PADRAO, ATIVO)
SELECT
  U.ID,
  1,
  TRUE,
  TRUE
FROM USUARIOS U
WHERE U.EMAIL = 'christian@controlsconsultoria.com.br'
ON CONFLICT (USUARIO_ID, EMPRESA_ID) DO UPDATE
SET
  PADRAO = TRUE,
  ATIVO = TRUE;
