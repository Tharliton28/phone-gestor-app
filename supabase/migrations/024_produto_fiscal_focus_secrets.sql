-- =============================================================================
-- Phone Gestor ERP — Campos fiscais do produto + segredo Focus por loja
-- =============================================================================

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS cfop text NOT NULL DEFAULT '5102',
  ADD COLUMN IF NOT EXISTS unidade text NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS icms_origem text NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS icms_situacao_tributaria text NOT NULL DEFAULT '102';

COMMENT ON COLUMN public.produtos.ncm IS 'NCM (8 dígitos). Obrigatório para emitir NFC-e real.';
COMMENT ON COLUMN public.produtos.cfop IS 'CFOP padrão da venda (ex.: 5102).';
COMMENT ON COLUMN public.produtos.icms_situacao_tributaria IS 'CST ou CSOSN (ex.: 102 Simples).';

ALTER TABLE public.documentos_fiscais
  ADD COLUMN IF NOT EXISTS caminho_xml text,
  ADD COLUMN IF NOT EXISTS caminho_danfe text,
  ADD COLUMN IF NOT EXISTS qrcode_url text;

-- Token Focus nunca exposto via SELECT do client (sem policy de leitura).
CREATE TABLE IF NOT EXISTS public.loja_fiscal_secrets (
  loja_id uuid PRIMARY KEY REFERENCES public.lojas (id) ON DELETE CASCADE,
  focus_nfe_token text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.usuarios (id) ON DELETE SET NULL
);

ALTER TABLE public.loja_fiscal_secrets ENABLE ROW LEVEL SECURITY;

-- Sem policies de SELECT/INSERT/UPDATE/DELETE para authenticated.
-- Mutação só via RPC SECURITY DEFINER; leitura do token só service_role (Edge).

CREATE OR REPLACE FUNCTION public.salvar_focus_nfe_token(p_loja_id uuid, p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_loja_id IS NULL OR NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Sem permissão para configurar token fiscal.';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RAISE EXCEPTION 'Token Focus inválido.';
  END IF;

  INSERT INTO public.loja_fiscal_secrets (loja_id, focus_nfe_token, updated_at, updated_by)
  VALUES (p_loja_id, trim(p_token), now(), auth.uid())
  ON CONFLICT (loja_id) DO UPDATE
  SET focus_nfe_token = EXCLUDED.focus_nfe_token,
      updated_at = now(),
      updated_by = auth.uid();

  RETURN json_build_object('ok', true, 'focus_token_configurado', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remover_focus_nfe_token(p_loja_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_loja_id IS NULL OR NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Sem permissão para remover token fiscal.';
  END IF;

  UPDATE public.loja_fiscal_secrets
  SET focus_nfe_token = NULL,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE loja_id = p_loja_id;

  RETURN json_build_object('ok', true, 'focus_token_configurado', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.focus_nfe_token_configurado(p_loja_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_loja_id IS NULL OR p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RETURN false;
  END IF;

  SELECT focus_nfe_token IS NOT NULL AND length(trim(focus_nfe_token)) >= 8
  INTO v_ok
  FROM public.loja_fiscal_secrets
  WHERE loja_id = p_loja_id;

  RETURN COALESCE(v_ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_focus_nfe_token(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remover_focus_nfe_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.focus_nfe_token_configurado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_focus_nfe_token(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_focus_nfe_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.focus_nfe_token_configurado(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.loja_fiscal_secrets TO service_role;
