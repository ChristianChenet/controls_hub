-- CONTROL S HUB
-- Padronizacao fisica do Cadastro de Produto Central.
-- Regra fixa: objetos fisicos do banco em portugues e SQL em maiusculo.

DO $$
BEGIN
  IF TO_REGCLASS('public.module_settings') IS NOT NULL AND TO_REGCLASS('public.configuracoes_modulos') IS NULL THEN ALTER TABLE module_settings RENAME TO configuracoes_modulos; END IF;
  IF TO_REGCLASS('public.products') IS NOT NULL AND TO_REGCLASS('public.produtos') IS NULL THEN ALTER TABLE products RENAME TO produtos; END IF;
  IF TO_REGCLASS('public.product_versions') IS NOT NULL AND TO_REGCLASS('public.produtos_versoes') IS NULL THEN ALTER TABLE product_versions RENAME TO produtos_versoes; END IF;
  IF TO_REGCLASS('public.product_skus') IS NOT NULL AND TO_REGCLASS('public.produtos_skus') IS NULL THEN ALTER TABLE product_skus RENAME TO produtos_skus; END IF;
  IF TO_REGCLASS('public.product_components') IS NOT NULL AND TO_REGCLASS('public.produtos_componentes') IS NULL THEN ALTER TABLE product_components RENAME TO produtos_componentes; END IF;
  IF TO_REGCLASS('public.product_component_links') IS NOT NULL AND TO_REGCLASS('public.produtos_componentes_vinculos') IS NULL THEN ALTER TABLE product_component_links RENAME TO produtos_componentes_vinculos; END IF;
  IF TO_REGCLASS('public.attribute_groups') IS NOT NULL AND TO_REGCLASS('public.atributos_grupos') IS NULL THEN ALTER TABLE attribute_groups RENAME TO atributos_grupos; END IF;
  IF TO_REGCLASS('public.attributes') IS NOT NULL AND TO_REGCLASS('public.atributos') IS NULL THEN ALTER TABLE attributes RENAME TO atributos; END IF;
  IF TO_REGCLASS('public.attribute_values') IS NOT NULL AND TO_REGCLASS('public.atributos_valores') IS NULL THEN ALTER TABLE attribute_values RENAME TO atributos_valores; END IF;
  IF TO_REGCLASS('public.channels') IS NOT NULL AND TO_REGCLASS('public.canais') IS NULL THEN ALTER TABLE channels RENAME TO canais; END IF;
  IF TO_REGCLASS('public.channel_categories') IS NOT NULL AND TO_REGCLASS('public.canais_categorias') IS NULL THEN ALTER TABLE channel_categories RENAME TO canais_categorias; END IF;
  IF TO_REGCLASS('public.channel_attributes') IS NOT NULL AND TO_REGCLASS('public.canais_atributos') IS NULL THEN ALTER TABLE channel_attributes RENAME TO canais_atributos; END IF;
  IF TO_REGCLASS('public.channel_attribute_mappings') IS NOT NULL AND TO_REGCLASS('public.canais_atributos_mapeamentos') IS NULL THEN ALTER TABLE channel_attribute_mappings RENAME TO canais_atributos_mapeamentos; END IF;
  IF TO_REGCLASS('public.product_channel_status') IS NOT NULL AND TO_REGCLASS('public.produtos_canais_status') IS NULL THEN ALTER TABLE product_channel_status RENAME TO produtos_canais_status; END IF;
  IF TO_REGCLASS('public.assets') IS NOT NULL AND TO_REGCLASS('public.ativos_digitais') IS NULL THEN ALTER TABLE assets RENAME TO ativos_digitais; END IF;
  IF TO_REGCLASS('public.asset_product_links') IS NOT NULL AND TO_REGCLASS('public.ativos_digitais_produtos_vinculos') IS NULL THEN ALTER TABLE asset_product_links RENAME TO ativos_digitais_produtos_vinculos; END IF;
  IF TO_REGCLASS('public.imports') IS NOT NULL AND TO_REGCLASS('public.importacoes') IS NULL THEN ALTER TABLE imports RENAME TO importacoes; END IF;
  IF TO_REGCLASS('public.import_mappings') IS NOT NULL AND TO_REGCLASS('public.importacoes_mapeamentos') IS NULL THEN ALTER TABLE import_mappings RENAME TO importacoes_mapeamentos; END IF;
  IF TO_REGCLASS('public.import_layouts') IS NOT NULL AND TO_REGCLASS('public.importacoes_layouts') IS NULL THEN ALTER TABLE import_layouts RENAME TO importacoes_layouts; END IF;
  IF TO_REGCLASS('public.workflows') IS NOT NULL AND TO_REGCLASS('public.fluxos_trabalho') IS NULL THEN ALTER TABLE workflows RENAME TO fluxos_trabalho; END IF;
  IF TO_REGCLASS('public.workflow_steps') IS NOT NULL AND TO_REGCLASS('public.fluxos_trabalho_etapas') IS NULL THEN ALTER TABLE workflow_steps RENAME TO fluxos_trabalho_etapas; END IF;
  IF TO_REGCLASS('public.approvals') IS NOT NULL AND TO_REGCLASS('public.aprovacoes') IS NULL THEN ALTER TABLE approvals RENAME TO aprovacoes; END IF;
  IF TO_REGCLASS('public.approval_comparisons') IS NOT NULL AND TO_REGCLASS('public.aprovacoes_comparacoes') IS NULL THEN ALTER TABLE approval_comparisons RENAME TO aprovacoes_comparacoes; END IF;
  IF TO_REGCLASS('public.ai_settings') IS NOT NULL AND TO_REGCLASS('public.ia_configuracoes') IS NULL THEN ALTER TABLE ai_settings RENAME TO ia_configuracoes; END IF;
  IF TO_REGCLASS('public.ai_suggestions') IS NOT NULL AND TO_REGCLASS('public.ia_sugestoes') IS NULL THEN ALTER TABLE ai_suggestions RENAME TO ia_sugestoes; END IF;
  IF TO_REGCLASS('public.integration_settings') IS NOT NULL AND TO_REGCLASS('public.integracoes_configuracoes') IS NULL THEN ALTER TABLE integration_settings RENAME TO integracoes_configuracoes; END IF;
  IF TO_REGCLASS('public.integration_logs') IS NOT NULL AND TO_REGCLASS('public.integracoes_logs') IS NULL THEN ALTER TABLE integration_logs RENAME TO integracoes_logs; END IF;
  IF TO_REGCLASS('public.product_field_history') IS NOT NULL AND TO_REGCLASS('public.produtos_historico_campos') IS NULL THEN ALTER TABLE product_field_history RENAME TO produtos_historico_campos; END IF;
  IF TO_REGCLASS('public.product_parallel_registrations') IS NOT NULL AND TO_REGCLASS('public.produtos_cadastros_paralelos') IS NULL THEN ALTER TABLE product_parallel_registrations RENAME TO produtos_cadastros_paralelos; END IF;
END $$;

DO $$
DECLARE
  tabela_nome TEXT;
  coluna_antiga TEXT;
  coluna_nova TEXT;
BEGIN
  FOR tabela_nome, coluna_antiga, coluna_nova IN
    SELECT *
    FROM (VALUES
      ('produtos_versoes', 'product_id', 'produto_id'),
      ('produtos_skus', 'product_id', 'produto_id'),
      ('produtos_componentes', 'product_id', 'produto_id'),
      ('produtos_componentes_vinculos', 'conjunto_product_id', 'conjunto_produto_id'),
      ('produtos_componentes_vinculos', 'componente_product_id', 'componente_produto_id'),
      ('produtos_componentes_vinculos', 'product_component_id', 'produto_componente_id'),
      ('atributos', 'attribute_group_id', 'atributo_grupo_id'),
      ('atributos_valores', 'product_id', 'produto_id'),
      ('atributos_valores', 'product_sku_id', 'produto_sku_id'),
      ('atributos_valores', 'channel_id', 'canal_id'),
      ('atributos_valores', 'attribute_id', 'atributo_id'),
      ('canais_categorias', 'channel_id', 'canal_id'),
      ('canais_atributos', 'channel_id', 'canal_id'),
      ('canais_atributos_mapeamentos', 'channel_id', 'canal_id'),
      ('canais_atributos_mapeamentos', 'attribute_id', 'atributo_id'),
      ('canais_atributos_mapeamentos', 'channel_attribute_id', 'canal_atributo_id'),
      ('produtos_canais_status', 'product_id', 'produto_id'),
      ('produtos_canais_status', 'channel_id', 'canal_id'),
      ('ativos_digitais', 'alt_text', 'texto_alternativo'),
      ('ativos_digitais_produtos_vinculos', 'asset_id', 'ativo_digital_id'),
      ('ativos_digitais_produtos_vinculos', 'product_id', 'produto_id'),
      ('fluxos_trabalho_etapas', 'workflow_id', 'fluxo_trabalho_id'),
      ('aprovacoes', 'product_id', 'produto_id'),
      ('aprovacoes', 'workflow_step_id', 'fluxo_trabalho_etapa_id'),
      ('aprovacoes_comparacoes', 'approval_id', 'aprovacao_id'),
      ('ia_sugestoes', 'product_id', 'produto_id'),
      ('integracoes_configuracoes', 'channel_id', 'canal_id'),
      ('integracoes_logs', 'integration_setting_id', 'integracao_configuracao_id'),
      ('integracoes_logs', 'product_id', 'produto_id'),
      ('produtos_historico_campos', 'product_id', 'produto_id'),
      ('produtos_cadastros_paralelos', 'product_id', 'produto_id'),
      ('produtos', 'meta_title', 'titulo_meta'),
      ('produtos', 'meta_description', 'descricao_meta'),
      ('produtos', 'bullet_points', 'pontos_destaque')
    ) AS colunas(tabela_nome, coluna_antiga, coluna_nova)
  LOOP
    IF TO_REGCLASS('public.' || tabela_nome) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = tabela_nome
          AND column_name = coluna_antiga
      )
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = tabela_nome
          AND column_name = coluna_nova
      )
    THEN
      EXECUTE FORMAT('ALTER TABLE %I RENAME COLUMN %I TO %I', tabela_nome, coluna_antiga, coluna_nova);
    END IF;
  END LOOP;
END $$;
