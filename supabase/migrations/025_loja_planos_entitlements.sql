-- =============================================================================
-- Phone Gestor — Planos SaaS (entitlements)
-- Contrato pronto para gateway depois: plano + status + origem.
-- Atribuição inicial = manual (WhatsApp / fundador).
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.plano_assinatura AS ENUM ('essencial', 'profissional', 'rede');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.assinatura_status AS ENUM ('trial', 'ativa', 'suspensa', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.assinatura_origem AS ENUM ('manual', 'gateway', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS plano public.plano_assinatura NOT NULL DEFAULT 'essencial',
  ADD COLUMN IF NOT EXISTS assinatura_status public.assinatura_status NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS assinatura_origem public.assinatura_origem NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS plano_atualizado_em timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.lojas.plano IS
  'Plano comercial da loja (essencial|profissional|rede). Gateway futuro só atualiza status/origem.';
COMMENT ON COLUMN public.lojas.assinatura_status IS
  'Ciclo de vida da assinatura. suspensa/cancelada bloqueiam features pagas.';
COMMENT ON COLUMN public.lojas.assinatura_origem IS
  'manual = atribuído pelo time; gateway = webhook de pagamento; admin = override.';

-- Limites canônicos (espelho do domain JS)
CREATE OR REPLACE FUNCTION public.plano_max_usuarios(p_plano public.plano_assinatura)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plano
    WHEN 'essencial' THEN 2
    WHEN 'profissional' THEN 5
    WHEN 'rede' THEN 25
    ELSE 2
  END;
$$;

CREATE OR REPLACE FUNCTION public.plano_permite_nfce(p_plano public.plano_assinatura)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_plano IN ('profissional', 'rede');
$$;

CREATE OR REPLACE FUNCTION public.plano_permite_consultas(p_plano public.plano_assinatura)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_plano = 'rede';
$$;

CREATE OR REPLACE FUNCTION public.plano_permite_multi_loja(p_plano public.plano_assinatura)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_plano = 'rede';
$$;

CREATE OR REPLACE FUNCTION public.loja_assinatura_ativa(p_status public.assinatura_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('trial', 'ativa');
$$;

CREATE OR REPLACE FUNCTION public.loja_entitlements(p_loja_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja public.lojas%ROWTYPE;
  v_ativos integer;
  v_max integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usuario_lojas ul
    WHERE ul.usuario_id = auth.uid()
      AND ul.loja_id = p_loja_id
      AND ul.ativo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem acesso a esta loja');
  END IF;

  SELECT * INTO v_loja FROM public.lojas WHERE id = p_loja_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Loja não encontrada');
  END IF;

  v_max := public.plano_max_usuarios(v_loja.plano);
  SELECT count(*)::integer INTO v_ativos
  FROM public.usuario_lojas
  WHERE loja_id = p_loja_id AND ativo = true;

  RETURN jsonb_build_object(
    'ok', true,
    'loja_id', v_loja.id,
    'plano', v_loja.plano,
    'assinatura_status', v_loja.assinatura_status,
    'assinatura_origem', v_loja.assinatura_origem,
    'assinatura_ativa', public.loja_assinatura_ativa(v_loja.assinatura_status),
    'max_usuarios', v_max,
    'usuarios_ativos', v_ativos,
    'pode_adicionar_usuario', public.loja_assinatura_ativa(v_loja.assinatura_status)
      AND v_ativos < v_max,
    'pode_nfce', public.loja_assinatura_ativa(v_loja.assinatura_status)
      AND public.plano_permite_nfce(v_loja.plano),
    'pode_consultas', public.loja_assinatura_ativa(v_loja.assinatura_status)
      AND public.plano_permite_consultas(v_loja.plano),
    'pode_multi_loja', public.loja_assinatura_ativa(v_loja.assinatura_status)
      AND public.plano_permite_multi_loja(v_loja.plano),
    'plano_atualizado_em', v_loja.plano_atualizado_em
  );
END;
$$;

REVOKE ALL ON FUNCTION public.loja_entitlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.loja_entitlements(uuid) TO authenticated;

-- Bloqueia novo membro ativo acima o limite do plano
CREATE OR REPLACE FUNCTION public.trg_usuario_lojas_limite_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano public.plano_assinatura;
  v_status public.assinatura_status;
  v_max integer;
  v_ativos integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.ativo IS TRUE AND NEW.ativo IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.ativo IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT plano, assinatura_status INTO v_plano, v_status
  FROM public.lojas WHERE id = NEW.loja_id;

  IF NOT public.loja_assinatura_ativa(v_status) THEN
    RAISE EXCEPTION 'Assinatura da loja não está ativa. Não é possível adicionar usuários.';
  END IF;

  v_max := public.plano_max_usuarios(v_plano);

  SELECT count(*)::integer INTO v_ativos
  FROM public.usuario_lojas
  WHERE loja_id = NEW.loja_id
    AND ativo = true
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_ativos >= v_max THEN
    RAISE EXCEPTION 'Limite de usuários do plano % atingido (%). Faça upgrade para adicionar mais.',
      v_plano, v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuario_lojas_limite_plano ON public.usuario_lojas;
CREATE TRIGGER trg_usuario_lojas_limite_plano
  BEFORE INSERT OR UPDATE OF ativo ON public.usuario_lojas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_usuario_lojas_limite_plano();

-- Atualização de plano (owner/admin da loja) — até existir gateway
CREATE OR REPLACE FUNCTION public.atualizar_plano_loja(
  p_loja_id uuid,
  p_plano public.plano_assinatura,
  p_status public.assinatura_status DEFAULT 'ativa'
)
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
    RAISE EXCEPTION 'Sem permissão para alterar o plano desta loja.';
  END IF;

  UPDATE public.lojas
  SET
    plano = p_plano,
    assinatura_status = p_status,
    assinatura_origem = 'manual',
    plano_atualizado_em = now(),
    updated_at = now()
  WHERE id = p_loja_id;

  RETURN public.loja_entitlements(p_loja_id);
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_plano_loja(uuid, public.plano_assinatura, public.assinatura_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_plano_loja(uuid, public.plano_assinatura, public.assinatura_status) TO authenticated;
