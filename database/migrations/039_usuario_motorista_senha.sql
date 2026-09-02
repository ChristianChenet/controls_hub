ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS alterar_senha_proximo_login BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_usuarios_login_curto
  ON usuarios (LOWER(SPLIT_PART(email, '@', 1)))
  WHERE excluido = FALSE
    AND ativo = TRUE;
