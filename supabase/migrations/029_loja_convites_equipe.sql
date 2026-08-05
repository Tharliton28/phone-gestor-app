-- =============================================================================
-- Phone Gestor — Convites de equipe (multi-usuário por loja)
-- Owner/admin gera link; convidado aceita após login/signup com o mesmo e-mail.
-- Limite de usuários: trigger trg_usuario_lojas_limite_plano (025/028).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loja_convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  email text NOT NULL,
  papel public.usuario_papel NOT NULL DEFAULT 'vendedor',
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aceito', 'revogado', 'expirado')),
  convidado_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  aceito_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loja_convites_papel_nao_owner CHECK (papel <> 'owner'),
  CONSTRAINT loja_convites_email_lower CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS loja_convites_loja_id_idx ON public.loja_convites (loja_id);
CREATE INDEX IF NOT EXISTS loja_convites_token_idx ON public.loja_convites (token);

CREATE UNIQUE INDEX IF NOT EXISTS loja_convites_pendente_email_loja_uidx
  ON public.loja_convites (loja_id, email)
  WHERE status = 'pendente';

COMMENT ON TABLE public.loja_convites IS
  'Convites por e-mail para vincular usuário a uma loja com papel (exceto owner).';

ALTER TABLE public.loja_convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY loja_convites_select_admin
ON public.loja_convites FOR SELECT TO authenticated
USING (
  public.auth_user_has_papel(loja_id, ARRAY['owner', 'admin']::public.usuario_papel[])
);

CREATE POLICY loja_convites_insert_admin
ON public.loja_convites FOR INSERT TO authenticated
WITH CHECK (
  public.auth_user_has_papel(loja_id, ARRAY['owner', 'admin']::public.usuario_papel[])
);

CREATE POLICY loja_convites_update_admin
ON public.loja_convites FOR UPDATE TO authenticated
USING (
  public.auth_user_has_papel(loja_id, ARRAY['owner', 'admin']::public.usuario_papel[])
)
WITH CHECK (
  public.auth_user_has_papel(loja_id, ARRAY['owner', 'admin']::public.usuario_papel[])
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.loja_pode_adicionar_usuario(p_loja_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja public.lojas%ROWTYPE;
  v_ativos integer;
BEGIN
  v_loja := public.sincronizar_assinatura_expirada(p_loja_id);
  IF NOT public.loja_assinatura_vigente(v_loja.assinatura_status, v_loja.assinatura_expira_em) THEN
    RETURN false;
  END IF;
  SELECT count(*)::integer INTO v_ativos
  FROM public.usuario_lojas
  WHERE loja_id = p_loja_id AND ativo = true;
  RETURN v_ativos < public.plano_max_usuarios(v_loja.plano);
END;
$$;

REVOKE ALL ON FUNCTION public.loja_pode_adicionar_usuario(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.loja_pode_adicionar_usuario(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Criar convite
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_convite_loja(
  p_loja_id uuid,
  p_email text,
  p_papel public.usuario_papel DEFAULT 'vendedor'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_token text;
  v_row public.loja_convites%ROWTYPE;
  v_loja public.lojas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Sem permissão para convidar usuários nesta loja.';
  END IF;

  IF p_papel = 'owner' THEN
    RAISE EXCEPTION 'Não é permitido convidar com papel owner.';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'E-mail inválido.';
  END IF;

  IF NOT public.loja_pode_adicionar_usuario(p_loja_id) THEN
    RAISE EXCEPTION 'Limite de usuários do plano atingido ou assinatura inativa.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.usuario_lojas ul
    JOIN public.usuarios u ON u.id = ul.usuario_id
    WHERE ul.loja_id = p_loja_id
      AND ul.ativo = true
      AND lower(u.email) = v_email
  ) THEN
    RAISE EXCEPTION 'Este e-mail já faz parte da equipe da loja.';
  END IF;

  -- Revoga convite pendente anterior para o mesmo e-mail
  UPDATE public.loja_convites
  SET status = 'revogado', updated_at = now()
  WHERE loja_id = p_loja_id
    AND email = v_email
    AND status = 'pendente';

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO public.loja_convites (
    loja_id, email, papel, token, status, convidado_por, expires_at
  ) VALUES (
    p_loja_id,
    v_email,
    p_papel,
    v_token,
    'pendente',
    auth.uid(),
    now() + interval '7 days'
  )
  RETURNING * INTO v_row;

  SELECT * INTO v_loja FROM public.lojas WHERE id = p_loja_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'email', v_row.email,
    'papel', v_row.papel,
    'token', v_row.token,
    'expires_at', v_row.expires_at,
    'loja_nome', COALESCE(v_loja.nome_fantasia, v_loja.razao_social)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.criar_convite_loja(uuid, text, public.usuario_papel) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_convite_loja(uuid, text, public.usuario_papel) TO authenticated;

-- ---------------------------------------------------------------------------
-- Listagens
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.listar_equipe_loja(p_loja_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usuario_lojas
    WHERE loja_id = p_loja_id AND usuario_id = auth.uid() AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Sem acesso a esta loja.';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'membership_id', ul.id,
        'usuario_id', u.id,
        'nome', u.nome,
        'email', u.email,
        'papel', ul.papel,
        'ativo', ul.ativo,
        'created_at', ul.created_at
      )
      ORDER BY
        CASE ul.papel
          WHEN 'owner' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END,
        u.nome
    )
    FROM public.usuario_lojas ul
    JOIN public.usuarios u ON u.id = ul.usuario_id
    WHERE ul.loja_id = p_loja_id
      AND ul.ativo = true
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.listar_equipe_loja(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_equipe_loja(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_convites_loja(p_loja_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Sem permissão para ver convites.';
  END IF;

  -- Expira pendentes vencidos (VOLATILE por causa deste UPDATE)
  UPDATE public.loja_convites
  SET status = 'expirado', updated_at = now()
  WHERE loja_id = p_loja_id
    AND status = 'pendente'
    AND expires_at <= now();

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'email', c.email,
        'papel', c.papel,
        'status', c.status,
        'token', c.token,
        'expires_at', c.expires_at,
        'created_at', c.created_at
      )
      ORDER BY c.created_at DESC
    )
    FROM public.loja_convites c
    WHERE c.loja_id = p_loja_id
      AND c.status IN ('pendente', 'expirado', 'revogado')
      AND c.created_at > now() - interval '30 days'
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.listar_convites_loja(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_convites_loja(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.revogar_convite_loja(p_convite_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja_id uuid;
BEGIN
  SELECT loja_id INTO v_loja_id FROM public.loja_convites WHERE id = p_convite_id;
  IF v_loja_id IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado.';
  END IF;

  IF NOT public.auth_user_has_papel(
    v_loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Sem permissão para revogar convite.';
  END IF;

  UPDATE public.loja_convites
  SET status = 'revogado', updated_at = now()
  WHERE id = p_convite_id
    AND status = 'pendente';

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.revogar_convite_loja(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revogar_convite_loja(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.desativar_membro_loja(
  p_loja_id uuid,
  p_usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_papel public.usuario_papel;
BEGIN
  IF NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Sem permissão para remover membros.';
  END IF;

  IF p_usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode desativar a si mesmo.';
  END IF;

  SELECT papel INTO v_papel
  FROM public.usuario_lojas
  WHERE loja_id = p_loja_id AND usuario_id = p_usuario_id AND ativo = true;

  IF v_papel IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado.';
  END IF;

  IF v_papel = 'owner' THEN
    RAISE EXCEPTION 'Não é possível desativar o owner da loja.';
  END IF;

  UPDATE public.usuario_lojas
  SET ativo = false, updated_at = now()
  WHERE loja_id = p_loja_id AND usuario_id = p_usuario_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.desativar_membro_loja(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desativar_membro_loja(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Público (pré-login) + aceite
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_convite_publico(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_convites%ROWTYPE;
  v_loja public.lojas%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.loja_convites
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Convite inválido.');
  END IF;

  IF v_row.status = 'pendente' AND v_row.expires_at <= now() THEN
    UPDATE public.loja_convites
    SET status = 'expirado', updated_at = now()
    WHERE id = v_row.id;
    v_row.status := 'expirado';
  END IF;

  SELECT * INTO v_loja FROM public.lojas WHERE id = v_row.loja_id;

  RETURN jsonb_build_object(
    'ok', true,
    'email', v_row.email,
    'papel', v_row.papel,
    'status', v_row.status,
    'expires_at', v_row.expires_at,
    'loja_nome', COALESCE(v_loja.nome_fantasia, v_loja.razao_social, 'Loja')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_convite_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_convite_publico(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.aceitar_convite_loja(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_convites%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login ou crie sua conta para aceitar o convite.';
  END IF;

  SELECT * INTO v_row
  FROM public.loja_convites
  WHERE token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido.';
  END IF;

  IF v_row.status = 'pendente' AND v_row.expires_at <= now() THEN
    UPDATE public.loja_convites
    SET status = 'expirado', updated_at = now()
    WHERE id = v_row.id;
    RAISE EXCEPTION 'Este convite expirou. Peça um novo ao administrador.';
  END IF;

  IF v_row.status <> 'pendente' THEN
    RAISE EXCEPTION 'Este convite não está mais disponível (%).', v_row.status;
  END IF;

  SELECT lower(email) INTO v_email FROM public.usuarios WHERE id = auth.uid();
  IF v_email IS NULL THEN
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  END IF;
  IF v_email IS DISTINCT FROM v_row.email THEN
    RAISE EXCEPTION 'Este convite é para %. Entre com esse e-mail.', v_row.email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.usuario_lojas
    WHERE loja_id = v_row.loja_id AND usuario_id = auth.uid() AND ativo = true
  ) THEN
    UPDATE public.loja_convites
    SET status = 'aceito', aceito_por = auth.uid(), updated_at = now()
    WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', true, 'loja_id', v_row.loja_id, 'already_member', true);
  END IF;

  IF NOT public.loja_pode_adicionar_usuario(v_row.loja_id) THEN
    RAISE EXCEPTION 'A loja atingiu o limite de usuários do plano.';
  END IF;

  -- Garante perfil público (trigger de signup; fallback se falhou)
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (
    auth.uid(),
    v_email,
    COALESCE(
      (SELECT nullif(trim(raw_user_meta_data->>'nome'), '') FROM auth.users WHERE id = auth.uid()),
      split_part(v_email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.usuario_lojas (usuario_id, loja_id, papel, loja_padrao, ativo)
  VALUES (auth.uid(), v_row.loja_id, v_row.papel, true, true)
  ON CONFLICT (usuario_id, loja_id) DO UPDATE
  SET
    papel = EXCLUDED.papel,
    ativo = true,
    loja_padrao = true,
    updated_at = now();

  UPDATE public.loja_convites
  SET status = 'aceito', aceito_por = auth.uid(), updated_at = now()
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'loja_id', v_row.loja_id,
    'papel', v_row.papel,
    'already_member', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.aceitar_convite_loja(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aceitar_convite_loja(text) TO authenticated;
