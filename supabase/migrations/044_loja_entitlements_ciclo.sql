-- =============================================================================
-- Phone Gestor — Expor ciclo da assinatura em loja_entitlements
-- Assinaturas antigas sem ciclo: assume mensal (cobrança Asaas MONTHLY).
-- =============================================================================

UPDATE public.lojas
SET assinatura_ciclo = 'mensal'
WHERE assinatura_ciclo IS NULL;

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
    'pode_consultas', v_vigente AND public.plano_permite_consultas(v_loja.plano),
    'pode_multi_loja', v_vigente AND public.plano_permite_multi_loja(v_loja.plano),
    'plano_atualizado_em', v_loja.plano_atualizado_em
  );
END;
$$;
