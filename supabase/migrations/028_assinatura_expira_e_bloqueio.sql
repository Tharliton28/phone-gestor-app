-- =============================================================================
-- Phone Gestor — Expiração de trial / assinatura + bloqueio automático
-- Trial self-serve ganha prazo; loja_entitlements sincroniza status → suspensa.
-- =============================================================================

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS assinatura_expira_em timestamptz;

COMMENT ON COLUMN public.lojas.assinatura_expira_em IS
  'Fim da vigência (trial ou ciclo pago). NULL = sem expiração automática.';

-- Vigência: status ativo E (sem data OU ainda no prazo)
CREATE OR REPLACE FUNCTION public.loja_assinatura_vigente(
  p_status public.assinatura_status,
  p_expira_em timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_status IN ('trial', 'ativa')
    AND (p_expira_em IS NULL OR p_expira_em > now());
$$;

-- Compatível: status sozinho (sem data)
CREATE OR REPLACE FUNCTION public.loja_assinatura_ativa(p_status public.assinatura_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('trial', 'ativa');
$$;

-- Suspende lojas cuja vigência já passou (idempotente)
CREATE OR REPLACE FUNCTION public.sincronizar_assinatura_expirada(p_loja_id uuid)
RETURNS public.lojas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja public.lojas%ROWTYPE;
BEGIN
  SELECT * INTO v_loja FROM public.lojas WHERE id = p_loja_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada';
  END IF;

  IF v_loja.assinatura_status IN ('trial', 'ativa')
     AND v_loja.assinatura_expira_em IS NOT NULL
     AND v_loja.assinatura_expira_em <= now()
  THEN
    UPDATE public.lojas
    SET
      assinatura_status = 'suspensa',
      plano_atualizado_em = now(),
      updated_at = now()
    WHERE id = p_loja_id
    RETURNING * INTO v_loja;
  END IF;

  RETURN v_loja;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_assinatura_expirada(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincronizar_assinatura_expirada(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sincronizar_assinatura_expirada(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.loja_entitlements(p_loja_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja public.lojas%ROWTYPE;
  v_ativos integer;
  v_max integer;
  v_vigente boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usuario_lojas ul
    WHERE ul.usuario_id = auth.uid()
      AND ul.loja_id = p_loja_id
      AND ul.ativo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem acesso a esta loja');
  END IF;

  v_loja := public.sincronizar_assinatura_expirada(p_loja_id);

  v_max := public.plano_max_usuarios(v_loja.plano);
  SELECT count(*)::integer INTO v_ativos
  FROM public.usuario_lojas
  WHERE loja_id = p_loja_id AND ativo = true;

  v_vigente := public.loja_assinatura_vigente(v_loja.assinatura_status, v_loja.assinatura_expira_em);

  RETURN jsonb_build_object(
    'ok', true,
    'loja_id', v_loja.id,
    'plano', v_loja.plano,
    'assinatura_status', v_loja.assinatura_status,
    'assinatura_origem', v_loja.assinatura_origem,
    'assinatura_expira_em', v_loja.assinatura_expira_em,
    'assinatura_ativa', v_vigente,
    'max_usuarios', v_max,
    'usuarios_ativos', v_ativos,
    'pode_adicionar_usuario', v_vigente AND v_ativos < v_max,
    'pode_nfce', v_vigente AND public.plano_permite_nfce(v_loja.plano),
    'pode_consultas', v_vigente AND public.plano_permite_consultas(v_loja.plano),
    'pode_multi_loja', v_vigente AND public.plano_permite_multi_loja(v_loja.plano),
    'plano_atualizado_em', v_loja.plano_atualizado_em
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_usuario_lojas_limite_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja public.lojas%ROWTYPE;
  v_max integer;
  v_ativos integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.ativo IS TRUE AND NEW.ativo IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.ativo IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  v_loja := public.sincronizar_assinatura_expirada(NEW.loja_id);

  IF NOT public.loja_assinatura_vigente(v_loja.assinatura_status, v_loja.assinatura_expira_em) THEN
    RAISE EXCEPTION 'Assinatura da loja não está ativa. Não é possível adicionar usuários.';
  END IF;

  v_max := public.plano_max_usuarios(v_loja.plano);

  SELECT count(*)::integer INTO v_ativos
  FROM public.usuario_lojas
  WHERE loja_id = NEW.loja_id
    AND ativo = true
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_ativos >= v_max THEN
    RAISE EXCEPTION 'Limite de usuários do plano % atingido (%). Faça upgrade para adicionar mais.',
      v_loja.plano, v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.atualizar_plano_loja(uuid, public.plano_assinatura, public.assinatura_status);

CREATE OR REPLACE FUNCTION public.atualizar_plano_loja(
  p_loja_id uuid,
  p_plano public.plano_assinatura,
  p_status public.assinatura_status DEFAULT 'ativa',
  p_expira_em timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expira timestamptz;
BEGIN
  IF NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  ) THEN
    RAISE EXCEPTION 'Sem permissão para alterar o plano desta loja.';
  END IF;

  IF p_status = 'trial' THEN
    v_expira := COALESCE(p_expira_em, now() + interval '14 days');
  ELSIF p_status = 'ativa' THEN
    v_expira := p_expira_em;
  ELSE
    v_expira := COALESCE(p_expira_em, now());
  END IF;

  UPDATE public.lojas
  SET
    plano = p_plano,
    assinatura_status = p_status,
    assinatura_origem = 'manual',
    assinatura_expira_em = v_expira,
    plano_atualizado_em = now(),
    updated_at = now()
  WHERE id = p_loja_id;

  RETURN public.loja_entitlements(p_loja_id);
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_plano_loja(uuid, public.plano_assinatura, public.assinatura_status, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_plano_loja(uuid, public.plano_assinatura, public.assinatura_status, timestamptz) TO authenticated;

UPDATE public.lojas
SET assinatura_expira_em = now() + interval '14 days'
WHERE assinatura_status = 'trial'
  AND assinatura_expira_em IS NULL;
