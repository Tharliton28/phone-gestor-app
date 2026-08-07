-- Link público de autorização de atendimento/consulta (LGPD) — espelha aceite de OS.

CREATE TABLE IF NOT EXISTS public.autorizacao_consulta_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas (id) ON DELETE CASCADE,

  termo_texto text NOT NULL,
  termo_hash text NOT NULL,

  expires_at timestamptz NOT NULL,
  usado_em timestamptz,
  assinatura_data_url text,
  cpf_informado text,
  ip_cliente inet,
  user_agent text,

  created_by uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS autorizacao_consulta_tokens_token_idx
  ON public.autorizacao_consulta_tokens (token);

CREATE INDEX IF NOT EXISTS autorizacao_consulta_tokens_pessoa_pendente_idx
  ON public.autorizacao_consulta_tokens (loja_id, pessoa_id)
  WHERE usado_em IS NULL;

COMMENT ON TABLE public.autorizacao_consulta_tokens IS
  'Tokens públicos para o titular assinar autorização de atendimento/consulta (sem OS).';

ALTER TABLE public.autorizacao_consulta_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS autorizacao_consulta_tokens_select_member ON public.autorizacao_consulta_tokens;
DROP POLICY IF EXISTS autorizacao_consulta_tokens_insert_member ON public.autorizacao_consulta_tokens;
DROP POLICY IF EXISTS autorizacao_consulta_tokens_update_member ON public.autorizacao_consulta_tokens;
DROP POLICY IF EXISTS autorizacao_consulta_tokens_delete_member ON public.autorizacao_consulta_tokens;

CREATE POLICY autorizacao_consulta_tokens_select_member ON public.autorizacao_consulta_tokens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY autorizacao_consulta_tokens_insert_member ON public.autorizacao_consulta_tokens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY autorizacao_consulta_tokens_update_member ON public.autorizacao_consulta_tokens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY autorizacao_consulta_tokens_delete_member ON public.autorizacao_consulta_tokens
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

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

  UPDATE public.pessoas
  SET
    autoriza_consulta_dados = true,
    autoriza_consulta_em = now(),
    autoriza_consulta_origem = 'link_consulta'
  WHERE id = v_row.pessoa_id
    AND loja_id = v_row.loja_id
    AND autoriza_consulta_dados = false;

  RETURN v_row.id;
END;
$$;

REVOKE ALL ON FUNCTION public.obter_autorizacao_consulta_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_autorizacao_consulta_token(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_autorizacao_consulta_token(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.confirmar_autorizacao_consulta(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_autorizacao_consulta(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirmar_autorizacao_consulta(uuid, text, text, text, text) TO anon, authenticated;
