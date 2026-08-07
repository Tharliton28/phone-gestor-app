-- =============================================================================
-- Phone Gestor — Trial por créditos (7 = 3 CPF + 2 IMEI), sem cota paralela
-- Barbie Fantasy (loja modelo) NÃO é alterada neste script.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.garantir_loja_carteira(p_loja_id uuid)
RETURNS public.loja_carteiras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_carteiras%ROWTYPE;
  v_bonus integer := 7; -- trial: 3×CPF(1) + 2×IMEI(2)
BEGIN
  IF p_loja_id IS NULL OR p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RAISE EXCEPTION 'Loja inválida ou sem permissão.';
  END IF;

  SELECT * INTO v_row FROM public.loja_carteiras WHERE loja_id = p_loja_id;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  INSERT INTO public.loja_carteiras (loja_id, saldo)
  VALUES (p_loja_id, v_bonus)
  RETURNING * INTO v_row;

  INSERT INTO public.loja_credito_lancamentos (
    loja_id, tipo, quantidade, saldo_apos, acao, descricao, created_by
  ) VALUES (
    p_loja_id, 'credito', v_bonus, v_bonus, 'bonus_inicial',
    'Créditos de trial (7) — equivalentes a até 3 consultas CPF/CNPJ e 2 IMEI.',
    auth.uid()
  );

  RETURN v_row;
END;
$$;

-- Permissão de consulta: trial vigente OU plano que libera módulo.
-- Sempre mode=credits (não há mais cota gratuita sem débito).
CREATE OR REPLACE FUNCTION public.checar_consulta_permitida(
  p_loja_id uuid,
  p_tipo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja public.lojas%ROWTYPE;
  v_vigente boolean;
  v_tipo text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.usuario_lojas ul
    WHERE ul.usuario_id = auth.uid()
      AND ul.loja_id = p_loja_id
      AND ul.ativo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden', 'error', 'Sem acesso a esta loja');
  END IF;

  v_tipo := lower(trim(COALESCE(p_tipo, '')));
  IF v_tipo NOT IN ('cpf_cnpj', 'imei') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_tipo', 'error', 'tipo inválido');
  END IF;

  v_loja := public.sincronizar_assinatura_expirada(p_loja_id);
  SELECT * INTO v_loja FROM public.lojas WHERE id = p_loja_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'error', 'Loja não encontrada');
  END IF;

  v_vigente := public.loja_assinatura_vigente(v_loja.assinatura_status, v_loja.assinatura_expira_em);
  IF NOT v_vigente THEN
    RETURN jsonb_build_object('ok', false, 'code', 'subscription_inactive', 'error', 'Assinatura inativa.');
  END IF;

  IF NOT (
    public.plano_permite_consultas(v_loja.plano)
    OR v_loja.assinatura_status = 'trial'
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'plan_locked',
      'error', 'Consultas estão no plano Profissional/Rede. Faça upgrade para liberar o módulo.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'credits',
    'assinatura_status', v_loja.assinatura_status
  );
END;
$$;

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
  v_ciclo text;
  v_pode_consultas boolean;
  v_saldo integer := 0;
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
  v_ciclo := CASE
    WHEN v_loja.assinatura_ciclo IN ('mensal', 'anual') THEN v_loja.assinatura_ciclo
    ELSE 'mensal'
  END;

  v_pode_consultas := v_vigente AND (
    public.plano_permite_consultas(v_loja.plano)
    OR v_loja.assinatura_status = 'trial'
  );

  SELECT COALESCE(c.saldo, 0) INTO v_saldo
  FROM public.loja_carteiras c
  WHERE c.loja_id = p_loja_id;

  RETURN jsonb_build_object(
    'ok', true,
    'loja_id', v_loja.id,
    'plano', v_loja.plano,
    'assinatura_status', v_loja.assinatura_status,
    'assinatura_origem', v_loja.assinatura_origem,
    'assinatura_expira_em', v_loja.assinatura_expira_em,
    'assinatura_ciclo', v_ciclo,
    'assinatura_ativa', v_vigente,
    'max_usuarios', v_max,
    'usuarios_ativos', v_ativos,
    'pode_adicionar_usuario', v_vigente AND v_ativos < v_max,
    'pode_nfce', v_vigente AND public.plano_permite_nfce(v_loja.plano),
    'pode_consultas', v_pode_consultas,
    'pode_multi_loja', v_vigente AND public.plano_permite_multi_loja(v_loja.plano),
    'plano_atualizado_em', v_loja.plano_atualizado_em,
    'creditos_saldo', v_saldo,
    'trial_consultas', jsonb_build_object(
      'ativo', (v_loja.assinatura_status = 'trial' AND v_vigente),
      'creditos_iniciais', 7,
      'modo', 'credits',
      'saldo', v_saldo
    )
  );
END;
$$;
