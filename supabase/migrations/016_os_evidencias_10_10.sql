-- =============================================================================
-- Phone Gestor ERP — OS 10/10: saída, CPF no aceite, bloqueio kanban
-- =============================================================================

ALTER TABLE public.loja_configuracoes
  ADD COLUMN IF NOT EXISTS termo_os_saida text,
  ADD COLUMN IF NOT EXISTS os_exigir_termo_saida boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS os_exigir_foto_saida boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS os_bloquear_kanban_sem_entrada boolean NOT NULL DEFAULT true;

ALTER TABLE public.ordem_servico_termos
  ADD COLUMN IF NOT EXISTS cpf_cliente text;

COMMENT ON COLUMN public.loja_configuracoes.os_bloquear_kanban_sem_entrada IS
  'Impede mover OS no kanban se entrada (termo/fotos) estiver incompleta.';

-- RPC: aceite com CPF do cliente
CREATE OR REPLACE FUNCTION public.confirmar_aceite_os_cliente(
  p_token uuid,
  p_assinatura_data_url text,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_cpf_cliente text DEFAULT NULL
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
    ip_cliente, user_agent, assinatura_data_url, origem_assinatura,
    registrado_por, cpf_cliente
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
    v_row.created_by,
    NULLIF(trim(p_cpf_cliente), '')
  )
  RETURNING id INTO v_termo_id;

  UPDATE public.ordem_servico_aceite_tokens
  SET usado_em = now()
  WHERE id = v_row.id;

  RETURN v_termo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text, text) TO anon, authenticated;

-- Retorna tipo do termo no payload público
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
    'tipo', v_row.tipo,
    'codigo_os', v_codigo,
    'nome_empresa', v_loja,
    'termo_texto', v_row.termo_texto,
    'expires_at', v_row.expires_at
  );
END;
$$;
