-- =============================================================================
-- Phone Gestor ERP — Documentos fiscais (NFC-e) + config de emissão
--
-- Fatia 1: estrutura real + provider mock no app. SEFAZ/Focus entra depois
-- sem mudar o contrato do PDV.
-- =============================================================================

ALTER TABLE public.loja_configuracoes
  ADD COLUMN IF NOT EXISTS nfce_serie integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nfce_ultimo_numero integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiscal_provider text NOT NULL DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS fiscal_emitir_nfce_auto boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loja_configuracoes_nfce_serie_chk'
  ) THEN
    ALTER TABLE public.loja_configuracoes
      ADD CONSTRAINT loja_configuracoes_nfce_serie_chk CHECK (nfce_serie > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loja_configuracoes_nfce_ultimo_numero_chk'
  ) THEN
    ALTER TABLE public.loja_configuracoes
      ADD CONSTRAINT loja_configuracoes_nfce_ultimo_numero_chk CHECK (nfce_ultimo_numero >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loja_configuracoes_fiscal_provider_chk'
  ) THEN
    ALTER TABLE public.loja_configuracoes
      ADD CONSTRAINT loja_configuracoes_fiscal_provider_chk
      CHECK (fiscal_provider IN ('mock', 'focus', 'enotas'));
  END IF;
END $$;

COMMENT ON COLUMN public.loja_configuracoes.fiscal_provider IS
  'Provedor de emissão: mock (dev), focus/enotas (produção futura).';
COMMENT ON COLUMN public.loja_configuracoes.fiscal_emitir_nfce_auto IS
  'Se true, o PDV tenta emitir NFC-e ao concluir a venda.';

CREATE TABLE IF NOT EXISTS public.documentos_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  venda_id uuid REFERENCES public.vendas (id) ON DELETE SET NULL,

  tipo text NOT NULL DEFAULT 'nfce' CHECK (tipo IN ('nfce', 'nfe')),
  ambiente public.nfe_ambiente NOT NULL DEFAULT 'homologacao',
  serie integer NOT NULL CHECK (serie > 0),
  numero integer NOT NULL CHECK (numero > 0),

  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'processando', 'autorizado', 'rejeitado', 'cancelado', 'mock')),

  chave_acesso text,
  protocolo text,
  mensagem text,
  provider text NOT NULL DEFAULT 'mock',
  provider_ref text,

  valor_total numeric(14, 2),
  consumiu_creditos integer NOT NULL DEFAULT 0,

  created_by uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT documentos_fiscais_loja_tipo_serie_numero_uidx UNIQUE (loja_id, tipo, serie, numero)
);

CREATE INDEX IF NOT EXISTS documentos_fiscais_loja_created_idx
  ON public.documentos_fiscais (loja_id, created_at DESC);

CREATE INDEX IF NOT EXISTS documentos_fiscais_venda_idx
  ON public.documentos_fiscais (venda_id);

ALTER TABLE public.documentos_fiscais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documentos_fiscais_select_member ON public.documentos_fiscais;
CREATE POLICY documentos_fiscais_select_member ON public.documentos_fiscais
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

DROP POLICY IF EXISTS documentos_fiscais_insert_member ON public.documentos_fiscais;
CREATE POLICY documentos_fiscais_insert_member ON public.documentos_fiscais
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

DROP POLICY IF EXISTS documentos_fiscais_update_member ON public.documentos_fiscais;
CREATE POLICY documentos_fiscais_update_member ON public.documentos_fiscais
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE OR REPLACE FUNCTION public.reservar_proximo_numero_nfce(p_loja_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serie integer;
  v_numero integer;
  v_ambiente public.nfe_ambiente;
  v_provider text;
BEGIN
  IF p_loja_id IS NULL OR p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RAISE EXCEPTION 'Loja inválida ou sem permissão.';
  END IF;

  SELECT nfce_serie, nfce_ultimo_numero, nfe_ambiente, fiscal_provider
  INTO v_serie, v_numero, v_ambiente, v_provider
  FROM public.loja_configuracoes
  WHERE loja_id = p_loja_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuração fiscal da loja não encontrada.';
  END IF;

  v_numero := COALESCE(v_numero, 0) + 1;

  UPDATE public.loja_configuracoes
  SET nfce_ultimo_numero = v_numero,
      updated_at = now()
  WHERE loja_id = p_loja_id;

  RETURN json_build_object(
    'serie', COALESCE(v_serie, 1),
    'numero', v_numero,
    'ambiente', v_ambiente,
    'provider', COALESCE(v_provider, 'mock')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_proximo_numero_nfce(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservar_proximo_numero_nfce(uuid) TO authenticated;
