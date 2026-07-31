-- =============================================================================
-- Phone Gestor ERP — Motor de créditos da loja (wallet + ledger)
--
-- Base para NFC-e, consultas CPF/CNPJ e IMEI. Saldo nunca é atualizado direto
-- pelo client: só via RPC SECURITY DEFINER com lock e ledger imutável.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loja_credito_custos (
  acao text PRIMARY KEY,
  creditos integer NOT NULL CHECK (creditos > 0),
  label text NOT NULL,
  ativo boolean NOT NULL DEFAULT true
);

INSERT INTO public.loja_credito_custos (acao, creditos, label) VALUES
  ('consulta_cpf_cnpj', 1, 'Consulta CPF/CNPJ'),
  ('consulta_imei', 2, 'Consulta IMEI'),
  ('nfce_emissao', 4, 'Emissão NFC-e'),
  ('nfe_emissao', 5, 'Emissão NF-e')
ON CONFLICT (acao) DO UPDATE
SET creditos = EXCLUDED.creditos,
    label = EXCLUDED.label,
    ativo = true;

CREATE TABLE IF NOT EXISTS public.loja_carteiras (
  loja_id uuid PRIMARY KEY REFERENCES public.lojas (id) ON DELETE CASCADE,
  saldo integer NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loja_credito_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('credito', 'debito')),
  quantidade integer NOT NULL CHECK (quantidade > 0),
  saldo_apos integer NOT NULL CHECK (saldo_apos >= 0),
  acao text NOT NULL,
  descricao text,
  referencia_tipo text,
  referencia_id uuid,
  created_by uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loja_credito_lancamentos_loja_created_idx
  ON public.loja_credito_lancamentos (loja_id, created_at DESC);

ALTER TABLE public.loja_credito_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loja_carteiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loja_credito_lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loja_credito_custos_select_auth ON public.loja_credito_custos;
CREATE POLICY loja_credito_custos_select_auth ON public.loja_credito_custos
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS loja_carteiras_select_member ON public.loja_carteiras;
CREATE POLICY loja_carteiras_select_member ON public.loja_carteiras
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

DROP POLICY IF EXISTS loja_credito_lancamentos_select_member ON public.loja_credito_lancamentos;
CREATE POLICY loja_credito_lancamentos_select_member ON public.loja_credito_lancamentos
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

-- Sem INSERT/UPDATE/DELETE diretos no client: mutações só via RPC.

CREATE OR REPLACE FUNCTION public.garantir_loja_carteira(p_loja_id uuid)
RETURNS public.loja_carteiras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_carteiras%ROWTYPE;
  v_bonus integer := 50;
BEGIN
  IF p_loja_id IS NULL OR p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RAISE EXCEPTION 'Loja inválida ou sem permissão.';
  END IF;

  SELECT * INTO v_row FROM public.loja_carteiras WHERE loja_id = p_loja_id;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  INSERT INTO public.loja_carteiras (loja_id, saldo)
  VALUES (p_loja_id, v_bonus)
  RETURNING * INTO v_row;

  INSERT INTO public.loja_credito_lancamentos (
    loja_id, tipo, quantidade, saldo_apos, acao, descricao, created_by
  ) VALUES (
    p_loja_id, 'credito', v_bonus, v_bonus, 'bonus_inicial',
    'Créditos iniciais para testar o motor (NFC-e e consultas).',
    auth.uid()
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_loja_creditos(p_loja_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_carteiras%ROWTYPE;
BEGIN
  v_row := public.garantir_loja_carteira(p_loja_id);
  RETURN json_build_object(
    'loja_id', v_row.loja_id,
    'saldo', v_row.saldo,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_loja_credito_lancamentos(
  p_loja_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS SETOF public.loja_credito_lancamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_loja_id IS NULL OR p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RAISE EXCEPTION 'Loja inválida ou sem permissão.';
  END IF;

  PERFORM public.garantir_loja_carteira(p_loja_id);

  RETURN QUERY
  SELECT *
  FROM public.loja_credito_lancamentos
  WHERE loja_id = p_loja_id
  ORDER BY created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.consumir_loja_creditos(
  p_loja_id uuid,
  p_acao text,
  p_quantidade integer DEFAULT NULL,
  p_descricao text DEFAULT NULL,
  p_referencia_tipo text DEFAULT NULL,
  p_referencia_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_carteiras%ROWTYPE;
  v_qtd integer;
  v_label text;
BEGIN
  IF p_loja_id IS NULL OR p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RAISE EXCEPTION 'Loja inválida ou sem permissão.';
  END IF;

  PERFORM public.garantir_loja_carteira(p_loja_id);

  SELECT creditos, label INTO v_qtd, v_label
  FROM public.loja_credito_custos
  WHERE acao = p_acao AND ativo = true;

  IF p_quantidade IS NOT NULL THEN
    v_qtd := p_quantidade;
  END IF;

  IF v_qtd IS NULL OR v_qtd <= 0 THEN
    RAISE EXCEPTION 'Ação de crédito inválida: %', p_acao;
  END IF;

  SELECT * INTO v_row
  FROM public.loja_carteiras
  WHERE loja_id = p_loja_id
  FOR UPDATE;

  IF v_row.saldo < v_qtd THEN
    RAISE EXCEPTION 'Saldo insuficiente. Necessário % crédito(s); disponível: %.', v_qtd, v_row.saldo;
  END IF;

  UPDATE public.loja_carteiras
  SET saldo = saldo - v_qtd,
      updated_at = now()
  WHERE loja_id = p_loja_id
  RETURNING * INTO v_row;

  INSERT INTO public.loja_credito_lancamentos (
    loja_id, tipo, quantidade, saldo_apos, acao, descricao,
    referencia_tipo, referencia_id, created_by
  ) VALUES (
    p_loja_id, 'debito', v_qtd, v_row.saldo, p_acao,
    COALESCE(p_descricao, v_label),
    p_referencia_tipo, p_referencia_id, auth.uid()
  );

  RETURN json_build_object(
    'ok', true,
    'consumido', v_qtd,
    'saldo', v_row.saldo,
    'acao', p_acao
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.creditar_loja_creditos(
  p_loja_id uuid,
  p_quantidade integer,
  p_acao text DEFAULT 'compra_pacote',
  p_descricao text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_carteiras%ROWTYPE;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida.';
  END IF;

  IF NOT public.auth_user_has_papel(p_loja_id, ARRAY['owner', 'admin']::public.usuario_papel[]) THEN
    RAISE EXCEPTION 'Apenas owner/admin podem creditar a carteira.';
  END IF;

  PERFORM public.garantir_loja_carteira(p_loja_id);

  SELECT * INTO v_row
  FROM public.loja_carteiras
  WHERE loja_id = p_loja_id
  FOR UPDATE;

  UPDATE public.loja_carteiras
  SET saldo = saldo + p_quantidade,
      updated_at = now()
  WHERE loja_id = p_loja_id
  RETURNING * INTO v_row;

  INSERT INTO public.loja_credito_lancamentos (
    loja_id, tipo, quantidade, saldo_apos, acao, descricao, created_by
  ) VALUES (
    p_loja_id, 'credito', p_quantidade, v_row.saldo, COALESCE(NULLIF(trim(p_acao), ''), 'compra_pacote'),
    COALESCE(p_descricao, 'Créditos adicionados à carteira.'),
    auth.uid()
  );

  RETURN json_build_object(
    'ok', true,
    'creditado', p_quantidade,
    'saldo', v_row.saldo,
    'acao', COALESCE(NULLIF(trim(p_acao), ''), 'compra_pacote')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.garantir_loja_carteira(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_loja_creditos(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.listar_loja_credito_lancamentos(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consumir_loja_creditos(uuid, text, integer, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.creditar_loja_creditos(uuid, integer, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.garantir_loja_carteira(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_loja_creditos(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_loja_credito_lancamentos(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consumir_loja_creditos(uuid, text, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_loja_creditos(uuid, integer, text, text) TO authenticated;
