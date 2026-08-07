-- Exige CPF igual ao do cadastro (PF) ao confirmar autorização de consulta.

CREATE OR REPLACE FUNCTION public.confirmar_autorizacao_consulta(
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
  v_row public.autorizacao_consulta_tokens%ROWTYPE;
  v_origem text;
  v_cpf_cadastro text;
  v_cpf_informado text;
BEGIN
  IF p_assinatura_data_url IS NULL OR length(trim(p_assinatura_data_url)) < 50 THEN
    RAISE EXCEPTION 'Assinatura inválida.';
  END IF;

  v_cpf_informado := regexp_replace(COALESCE(p_cpf_cliente, ''), '\D', '', 'g');
  IF length(v_cpf_informado) <> 11 THEN
    RAISE EXCEPTION 'Informe um CPF válido com 11 dígitos.';
  END IF;

  SELECT * INTO v_row
  FROM public.autorizacao_consulta_tokens
  WHERE token = p_token
    AND usado_em IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link inválido ou expirado.';
  END IF;

  SELECT regexp_replace(COALESCE(cpf_cnpj, ''), '\D', '', 'g')
  INTO v_cpf_cadastro
  FROM public.pessoas
  WHERE id = v_row.pessoa_id
    AND loja_id = v_row.loja_id;

  IF v_cpf_cadastro IS NOT NULL AND length(v_cpf_cadastro) = 11 AND v_cpf_informado <> v_cpf_cadastro THEN
    RAISE EXCEPTION 'CPF informado não confere com o cadastro.';
  END IF;

  UPDATE public.autorizacao_consulta_tokens
  SET
    usado_em = now(),
    assinatura_data_url = p_assinatura_data_url,
    cpf_informado = NULLIF(v_cpf_informado, ''),
    ip_cliente = NULLIF(p_ip, '')::inet,
    user_agent = p_user_agent
  WHERE id = v_row.id;

  v_origem := CASE
    WHEN v_row.tipo = 'avaliacao_usado' THEN 'avaliacao_usado'
    ELSE 'link_consulta'
  END;

  UPDATE public.pessoas
  SET
    autoriza_consulta_dados = true,
    autoriza_consulta_em = now(),
    autoriza_consulta_origem = v_origem
  WHERE id = v_row.pessoa_id
    AND loja_id = v_row.loja_id
    AND autoriza_consulta_dados = false;

  RETURN v_row.id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_autorizacao_consulta(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_autorizacao_consulta(uuid, text, text, text, text) TO anon, authenticated;
