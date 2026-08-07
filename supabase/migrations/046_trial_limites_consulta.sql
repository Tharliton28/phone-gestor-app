-- =============================================================================
-- Phone Gestor — Limites de consulta no trial (3 CPF/CNPJ + 2 IMEI por loja)
-- Trial vigente libera módulo de consultas; plano pago continua por créditos.
-- =============================================================================

CREATE INDEX IF NOT EXISTS consulta_logs_loja_tipo_sucesso_idx
  ON public.consulta_logs (loja_id, tipo)
  WHERE sucesso = true;

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
  v_usados integer := 0;
  v_limite integer;
  v_restantes integer;
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

  -- Trava a loja para reduzir corrida entre duas consultas paralelas no trial
  SELECT * INTO v_loja
  FROM public.lojas
  WHERE id = p_loja_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'error', 'Loja não encontrada');
  END IF;

  -- Reaplica expiração sob lock
  v_loja := public.sincronizar_assinatura_expirada(p_loja_id);
  SELECT * INTO v_loja FROM public.lojas WHERE id = p_loja_id;

  v_vigente := public.loja_assinatura_vigente(v_loja.assinatura_status, v_loja.assinatura_expira_em);
  IF NOT v_vigente THEN
    RETURN jsonb_build_object('ok', false, 'code', 'subscription_inactive', 'error', 'Assinatura inativa.');
  END IF;

  -- Plano pago (ou trial já convertido): créditos
  IF v_loja.assinatura_status IS DISTINCT FROM 'trial' THEN
    IF NOT public.plano_permite_consultas(v_loja.plano) THEN
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
  END IF;

  -- Trial vigente: cotas gratuitas
  v_limite := CASE WHEN v_tipo = 'imei' THEN 2 ELSE 3 END;

  SELECT count(*)::integer INTO v_usados
  FROM public.consulta_logs
  WHERE loja_id = p_loja_id
    AND tipo = v_tipo
    AND sucesso = true;

  v_restantes := GREATEST(v_limite - v_usados, 0);

  IF v_usados >= v_limite THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'trial_limit',
      'mode', 'trial',
      'tipo', v_tipo,
      'usados', v_usados,
      'limite', v_limite,
      'restantes', 0,
      'error', CASE
        WHEN v_tipo = 'imei' THEN
          'No trial você pode fazer até 2 consultas IMEI. Assine um plano para continuar com créditos.'
        ELSE
          'No trial você pode fazer até 3 consultas CPF/CNPJ. Assine um plano para continuar com créditos.'
      END
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'trial',
    'tipo', v_tipo,
    'usados', v_usados,
    'limite', v_limite,
    'restantes', v_restantes,
    'assinatura_status', 'trial'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.checar_consulta_permitida(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checar_consulta_permitida(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checar_consulta_permitida(uuid, text) TO service_role;

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
  v_trial_cpf integer := 0;
  v_trial_imei integer := 0;
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

  -- Trial vigente também libera consultas (com cotas); pago segue o plano
  v_pode_consultas := v_vigente AND (
    public.plano_permite_consultas(v_loja.plano)
    OR v_loja.assinatura_status = 'trial'
  );

  IF v_loja.assinatura_status = 'trial' AND v_vigente THEN
    SELECT count(*)::integer INTO v_trial_cpf
    FROM public.consulta_logs
    WHERE loja_id = p_loja_id AND tipo = 'cpf_cnpj' AND sucesso = true;

    SELECT count(*)::integer INTO v_trial_imei
    FROM public.consulta_logs
    WHERE loja_id = p_loja_id AND tipo = 'imei' AND sucesso = true;
  END IF;

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
    'trial_consultas', jsonb_build_object(
      'ativo', (v_loja.assinatura_status = 'trial' AND v_vigente),
      'cpf_cnpj_usados', v_trial_cpf,
      'cpf_cnpj_limite', 3,
      'imei_usados', v_trial_imei,
      'imei_limite', 2
    )
  );
END;
$$;
