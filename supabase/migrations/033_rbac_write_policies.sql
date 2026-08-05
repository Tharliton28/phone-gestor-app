-- =============================================================================
-- Phone Gestor — RBAC de escrita (go-live SaaS)
-- visualizador: só leitura
-- tecnico: OS (+ leitura)
-- vendedor: vendas
-- financeiro: lançamentos
-- gerente/admin/owner: operação ampla
-- =============================================================================

-- Financeiro
DROP POLICY IF EXISTS lancamentos_insert_member ON public.lancamentos_financeiros;
CREATE POLICY lancamentos_insert_staff ON public.lancamentos_financeiros
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'financeiro']::public.usuario_papel[]
    )
  );

DROP POLICY IF EXISTS lancamentos_update_member ON public.lancamentos_financeiros;
CREATE POLICY lancamentos_update_staff ON public.lancamentos_financeiros
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'financeiro']::public.usuario_papel[]
    )
  )
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'financeiro']::public.usuario_papel[]
    )
  );

-- Vendas (PDV também valida papel dentro da RPC)
DROP POLICY IF EXISTS vendas_insert_member ON public.vendas;
CREATE POLICY vendas_insert_staff ON public.vendas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'vendedor']::public.usuario_papel[]
    )
  );

DROP POLICY IF EXISTS vendas_update_member ON public.vendas;
CREATE POLICY vendas_update_staff ON public.vendas
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'vendedor']::public.usuario_papel[]
    )
  )
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'vendedor']::public.usuario_papel[]
    )
  );

-- Produtos / estoque
DROP POLICY IF EXISTS produtos_insert_member ON public.produtos;
CREATE POLICY produtos_insert_staff ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
    )
  );

DROP POLICY IF EXISTS produtos_update_member ON public.produtos;
CREATE POLICY produtos_update_staff ON public.produtos
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
    )
  )
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
    )
  );

DROP POLICY IF EXISTS movimentacoes_estoque_insert_member ON public.movimentacoes_estoque;
CREATE POLICY movimentacoes_estoque_insert_staff ON public.movimentacoes_estoque
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
    )
  );

DROP POLICY IF EXISTS movimentacoes_estoque_update_member ON public.movimentacoes_estoque;
CREATE POLICY movimentacoes_estoque_update_staff ON public.movimentacoes_estoque
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
    )
  )
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
    )
  );

-- Assistência técnica
DROP POLICY IF EXISTS ordens_servico_insert_member ON public.ordens_servico;
CREATE POLICY ordens_servico_insert_staff ON public.ordens_servico
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'tecnico']::public.usuario_papel[]
    )
  );

DROP POLICY IF EXISTS ordens_servico_update_member ON public.ordens_servico;
CREATE POLICY ordens_servico_update_staff ON public.ordens_servico
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'tecnico']::public.usuario_papel[]
    )
  )
  WITH CHECK (
    public.auth_user_has_papel(
      loja_id,
      ARRAY['owner', 'admin', 'gerente', 'tecnico']::public.usuario_papel[]
    )
  );

-- PDV: exige papel de venda (além de membership)
DO $$
DECLARE
  src text;
  patched text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO src
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'criar_venda_pdv'
  LIMIT 1;

  IF src IS NULL THEN
    RAISE EXCEPTION 'criar_venda_pdv não encontrada';
  END IF;

  IF src LIKE '%Seu papel não permite criar vendas%' THEN
    RETURN;
  END IF;

  patched := regexp_replace(
    src,
    'IF p_loja_id NOT IN \(SELECT public\.auth_user_loja_ids\(\)\) THEN[[:space:]]+RAISE EXCEPTION ''Sem permissão para criar venda nesta loja\.'';[[:space:]]+END IF;',
    $r$IF p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RAISE EXCEPTION 'Sem permissão para criar venda nesta loja.';
  END IF;

  IF NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin', 'gerente', 'vendedor']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Seu papel não permite criar vendas.';
  END IF;$r$,
    'n'
  );

  IF patched = src THEN
    RAISE EXCEPTION 'Falha ao injetar checagem de papel em criar_venda_pdv';
  END IF;

  EXECUTE patched;
END;
$$;
