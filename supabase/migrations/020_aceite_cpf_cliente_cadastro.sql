-- =============================================================================
-- Phone Gestor ERP — Aceite público: CPF do cliente cadastrado na OS
--
-- Permite à página de aceite validar se o CPF digitado confere com o cadastro,
-- sem abrir a tabela pessoas para anon. O token já é o segredo de acesso.
-- =============================================================================

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
  v_fotos json;
  v_cpf_cadastro text;
  v_cpf_digits text;
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

  SELECT regexp_replace(COALESCE(p.cpf_cnpj, ''), '[^0-9]', '', 'g')
  INTO v_cpf_digits
  FROM public.ordens_servico os
  JOIN public.pessoas p ON p.id = os.cliente_id
  WHERE os.id = v_row.ordem_servico_id;

  -- Só CPF (11 dígitos). CNPJ de pessoa jurídica não entra na conferência deste campo.
  IF v_cpf_digits IS NOT NULL AND length(v_cpf_digits) = 11 THEN
    v_cpf_cadastro := v_cpf_digits;
  ELSE
    v_cpf_cadastro := NULL;
  END IF;

  SELECT COALESCE(json_agg(f.storage_path ORDER BY f.created_at), '[]'::json)
  INTO v_fotos
  FROM public.ordem_servico_fotos f
  WHERE f.ordem_servico_id = v_row.ordem_servico_id
    AND f.momento::text = v_row.tipo::text;

  RETURN json_build_object(
    'token', v_row.token,
    'tipo', v_row.tipo,
    'codigo_os', v_codigo,
    'nome_empresa', v_loja,
    'termo_texto', v_row.termo_texto,
    'expires_at', v_row.expires_at,
    'fotos', v_fotos,
    'cliente_tem_cpf', v_cpf_cadastro IS NOT NULL,
    'cpf_cliente_cadastro', v_cpf_cadastro
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obter_aceite_os_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_aceite_os_token(uuid) TO anon, authenticated;
