-- =============================================================================
-- Phone Gestor ERP — OS evidências: fix storage, assinatura cliente, link público
-- =============================================================================

ALTER TABLE public.ordem_servico_termos
  ADD COLUMN IF NOT EXISTS assinatura_data_url text,
  ADD COLUMN IF NOT EXISTS origem_assinatura text NOT NULL DEFAULT 'loja'
    CHECK (origem_assinatura IN ('loja', 'cliente'));

COMMENT ON COLUMN public.ordem_servico_termos.assinatura_data_url IS
  'Assinatura PNG em data URL (base64). Preferido para assinatura do cliente no próprio dispositivo.';
COMMENT ON COLUMN public.ordem_servico_termos.origem_assinatura IS
  'loja = assinatura na tela do operador; cliente = link público no celular/tablet do cliente.';

CREATE TABLE IF NOT EXISTS public.ordem_servico_aceite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico (id) ON DELETE CASCADE,

  tipo public.os_termo_tipo NOT NULL DEFAULT 'entrada',
  termo_texto text NOT NULL,
  termo_hash text NOT NULL,

  expires_at timestamptz NOT NULL,
  usado_em timestamptz,
  created_by uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ordem_servico_aceite_tokens_os_tipo_uidx UNIQUE (ordem_servico_id, tipo)
);

CREATE INDEX IF NOT EXISTS ordem_servico_aceite_tokens_token_idx
  ON public.ordem_servico_aceite_tokens (token);

ALTER TABLE public.ordem_servico_aceite_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordem_servico_aceite_tokens_select_member ON public.ordem_servico_aceite_tokens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_aceite_tokens_insert_member ON public.ordem_servico_aceite_tokens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_aceite_tokens_update_member ON public.ordem_servico_aceite_tokens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

-- Bucket: aceitar fotos de celular (HEIC) e ampliar limite
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'application/octet-stream'
  ]
WHERE id = 'os-evidencias';

-- Corrige políticas de storage (split_part mais confiável que foldername)
DROP POLICY IF EXISTS os_evidencias_select_member ON storage.objects;
DROP POLICY IF EXISTS os_evidencias_insert_member ON storage.objects;
DROP POLICY IF EXISTS os_evidencias_delete_member ON storage.objects;

CREATE POLICY os_evidencias_select_member ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'os-evidencias'
  AND (split_part(name, '/', 1))::uuid IN (SELECT public.auth_user_loja_ids())
);

CREATE POLICY os_evidencias_insert_member ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'os-evidencias'
  AND (split_part(name, '/', 1))::uuid IN (SELECT public.auth_user_loja_ids())
);

CREATE POLICY os_evidencias_delete_member ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'os-evidencias'
  AND (split_part(name, '/', 1))::uuid IN (SELECT public.auth_user_loja_ids())
);

-- ---------------------------------------------------------------------------
-- RPC público: cliente assina no próprio dispositivo (IP do cliente)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obter_aceite_os_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ordem_servico_aceite_tokens%ROWTYPE;
  v_codigo text;
  v_loja text;
BEGIN
  SELECT * INTO v_row
  FROM public.ordem_servico_aceite_tokens
  WHERE token = p_token
    AND usado_em IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link inválido ou expirado.';
  END IF;

  SELECT codigo INTO v_codigo FROM public.ordens_servico WHERE id = v_row.ordem_servico_id;
  SELECT COALESCE(nome_fantasia, razao_social) INTO v_loja FROM public.lojas WHERE id = v_row.loja_id;

  RETURN json_build_object(
    'token', v_row.token,
    'codigo_os', v_codigo,
    'nome_empresa', v_loja,
    'termo_texto', v_row.termo_texto,
    'expires_at', v_row.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_aceite_os_cliente(
  p_token uuid,
  p_assinatura_data_url text,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ordem_servico_aceite_tokens%ROWTYPE;
  v_termo_id uuid;
BEGIN
  IF p_assinatura_data_url IS NULL OR length(trim(p_assinatura_data_url)) < 50 THEN
    RAISE EXCEPTION 'Assinatura inválida.';
  END IF;

  SELECT * INTO v_row
  FROM public.ordem_servico_aceite_tokens
  WHERE token = p_token
    AND usado_em IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link inválido ou expirado.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ordem_servico_termos
    WHERE ordem_servico_id = v_row.ordem_servico_id AND tipo = v_row.tipo
  ) THEN
    RAISE EXCEPTION 'Termo já registrado para esta OS.';
  END IF;

  INSERT INTO public.ordem_servico_termos (
    loja_id, ordem_servico_id, tipo, termo_texto, termo_hash,
    ip_cliente, user_agent, assinatura_data_url, origem_assinatura, registrado_por
  ) VALUES (
    v_row.loja_id,
    v_row.ordem_servico_id,
    v_row.tipo,
    v_row.termo_texto,
    v_row.termo_hash,
    NULLIF(p_ip, '')::inet,
    p_user_agent,
    p_assinatura_data_url,
    'cliente',
    v_row.created_by
  )
  RETURNING id INTO v_termo_id;

  UPDATE public.ordem_servico_aceite_tokens
  SET usado_em = now()
  WHERE id = v_row.id;

  RETURN v_termo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.obter_aceite_os_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_aceite_os_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text) TO anon, authenticated;
