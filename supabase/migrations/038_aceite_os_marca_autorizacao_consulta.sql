-- Ao confirmar aceite do termo de OS (cliente), registra autorização de consulta no cadastro
-- se ainda não existir (trilha LGPD — origem termo_os).

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

  -- Propaga autorização LGPD para o cliente da OS (não sobrescreve se já autorizou).
  UPDATE public.pessoas p
  SET
    autoriza_consulta_dados = true,
    autoriza_consulta_em = now(),
    autoriza_consulta_origem = 'termo_os'
  FROM public.ordens_servico os
  WHERE os.id = v_row.ordem_servico_id
    AND os.loja_id = v_row.loja_id
    AND p.id = os.cliente_id
    AND p.loja_id = v_row.loja_id
    AND p.autoriza_consulta_dados = false;

  RETURN v_termo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text, text) TO anon, authenticated;
