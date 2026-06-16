-- CONTROL S HUB
-- Saneamento de permissoes repetidas e preferencias de interface.

DELETE FROM perfis_permissoes
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      ROW_NUMBER() OVER (
        PARTITION BY
          perfil_id,
          empresa_id,
          modulo_id,
          menu_id,
          tela_id,
          botao_id,
          acao_id,
          etapa_kanban_id
        ORDER BY id
      ) AS ordem_duplicidade
    FROM perfis_permissoes
  ) AS duplicadas
  WHERE duplicadas.ordem_duplicidade > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_perfis_permissoes_unico
ON perfis_permissoes (
  perfil_id,
  COALESCE(empresa_id, 0),
  COALESCE(modulo_id, 0),
  COALESCE(menu_id, 0),
  COALESCE(tela_id, 0),
  COALESCE(botao_id, 0),
  COALESCE(acao_id, 0),
  COALESCE(etapa_kanban_id, 0)
);

UPDATE parametros_sistema
SET valor = 'Control S Hub'
WHERE chave = 'NOME_SISTEMA'
  AND valor <> 'Control S Hub';
