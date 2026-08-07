-- Tipo do link de autorização: atendimento (cadastro) vs avaliação de aparelho usado.

ALTER TABLE public.autorizacao_consulta_tokens
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'atendimento';

ALTER TABLE public.autorizacao_consulta_tokens
  DROP CONSTRAINT IF EXISTS autorizacao_consulta_tokens_tipo_chk;

ALTER TABLE public.autorizacao_consulta_tokens
  ADD CONSTRAINT autorizacao_consulta_tokens_tipo_chk
  CHECK (tipo IN ('atendimento', 'avaliacao_usado'));

COMMENT ON COLUMN public.autorizacao_consulta_tokens.tipo IS
  'atendimento = autorização geral; avaliacao_usado = compra/avaliação de aparelho.';

CREATE OR REPLACE FUNCTION public.obter_autorizacao_consulta_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.autorizacao_consulta_tokens%ROWTYPE;
  v_loja text;
  v_nome text;
  v_cpf text;
BEGIN
  SELECT * INTO v_row
  FROM public.autorizacao_consulta_tokens
  WHERE token = p_token
    AND usado_em IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link inválido ou expirado.';
  END IF;

  SELECT COALESCE(nome_fantasia, razao_social) INTO v_loja
  FROM public.lojas WHERE id = v_row.loja_id;

  SELECT nome, cpf_cnpj INTO v_nome, v_cpf
  FROM public.pessoas WHERE id = v_row.pessoa_id;

  RETURN json_build_object(
    'token', v_row.token,
    'tipo', v_row.tipo,
    'nome_empresa', v_loja,
    'nome_cliente', v_nome,
    'cpf_cliente_cadastro', v_cpf,
    'termo_texto', v_row.termo_texto,
    'expires_at', v_row.expires_at
  );
END;
$$;

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
BEGIN
  IF p_assinatura_data_url IS NULL OR length(trim(p_assinatura_data_url)) < 50 THEN
    RAISE EXCEPTION 'Assinatura inválida.';
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

  UPDATE public.autorizacao_consulta_tokens
  SET
    usado_em = now(),
    assinatura_data_url = p_assinatura_data_url,
    cpf_informado = NULLIF(trim(p_cpf_cliente), ''),
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

REVOKE ALL ON FUNCTION public.obter_autorizacao_consulta_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_autorizacao_consulta_token(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.confirmar_autorizacao_consulta(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_autorizacao_consulta(uuid, text, text, text, text) TO anon, authenticated;
