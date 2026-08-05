-- =============================================================================
-- Phone Gestor — Hardening de privilégios (go-live SaaS)
--
-- Problema: DEFAULT PRIVILEGES no schema public concedem EXECUTE a anon
-- em toda função nova. REVOKE FROM PUBLIC não remove o grant explícito a anon.
-- =============================================================================

-- 1) Remove EXECUTE de anon em TODAS as funções public atuais
-- Nota: ALTER DEFAULT PRIVILEGES exige superuser no projeto hospedado;
-- o revoke explícito abaixo cobre o estado atual. Em funções novas, sempre
-- fazer REVOKE FROM PUBLIC/anon + GRANT mínimo na própria migration.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END;
$$;

-- 3) RPCs públicas (cliente sem login: convite + aceite de OS)
GRANT EXECUTE ON FUNCTION public.get_convite_publico(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_convite_loja(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aceite_os_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_aceite_os_cliente(uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.os_foto_liberada_por_aceite(text) TO anon, authenticated;

-- Helpers usados em policies RLS (authenticated + anon onde policy permite)
GRANT EXECUTE ON FUNCTION public.auth_user_loja_ids() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_has_papel(uuid, public.usuario_papel[]) TO authenticated, anon;

-- 4) RPCs só service_role (nunca via client/anon)
REVOKE ALL ON FUNCTION public.aplicar_pagamento_asaas(
  text, text, uuid, public.plano_assinatura, text, text, timestamptz, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_pagamento_asaas(
  text, text, uuid, public.plano_assinatura, text, text, timestamptz, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.atualizar_plano_loja(
  uuid, public.plano_assinatura, public.assinatura_status, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_plano_loja(
  uuid, public.plano_assinatura, public.assinatura_status, timestamptz
) TO service_role;

-- Crédito de carteira só via backend (pagamento/admin). Client não pode se auto-creditar.
REVOKE ALL ON FUNCTION public.creditar_loja_creditos(uuid, integer, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_loja_creditos(uuid, integer, text, text)
  TO service_role;

-- Helpers internos do PDV (só chamadas por outras funções DEFINER)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE '\_pdv\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END;
$$;

-- 5) Demais SECURITY DEFINER / RPCs de app: authenticated (+ service_role)
DO $$
DECLARE
  r record;
  service_only text[] := ARRAY[
    'aplicar_pagamento_asaas',
    'atualizar_plano_loja',
    'creditar_loja_creditos',
    'handle_new_auth_user',
    'seed_financeiro_loja',
    'seed_formas_pagamento_loja',
    'seed_taxas_credito_parcela_loja',
    'trg_usuario_lojas_limite_plano'
  ];
  public_anon text[] := ARRAY[
    'get_convite_publico',
    'obter_aceite_os_token',
    'confirmar_aceite_os_cliente',
    'os_foto_liberada_por_aceite',
    'auth_user_loja_ids',
    'auth_user_has_papel'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef = true
      AND p.proname NOT LIKE '\_pdv\_%' ESCAPE '\'
      AND NOT (p.proname = ANY (service_only))
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    -- anon já revogado no passo 2; só re-grant se estiver na allowlist
    IF r.proname = ANY (public_anon) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
    END IF;
  END LOOP;

  -- Funções INVOKER usadas pelo client (ex.: next_* códigos) também precisam authenticated
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef = false
      AND p.proname LIKE 'next\_%' ESCAPE '\'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END;
$$;

-- aceitar_convite exige login
GRANT EXECUTE ON FUNCTION public.aceitar_convite_loja(text) TO authenticated, service_role;
