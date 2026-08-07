-- =============================================================================
-- Phone Gestor — Ciclo mensal/anual na assinatura Asaas
-- =============================================================================

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS asaas_ciclo_pendente text,
  ADD COLUMN IF NOT EXISTS assinatura_ciclo text;

COMMENT ON COLUMN public.lojas.asaas_ciclo_pendente IS 'Ciclo escolhido no checkout (mensal|anual), aguardando pagamento.';
COMMENT ON COLUMN public.lojas.assinatura_ciclo IS 'Ciclo da assinatura ativa (mensal|anual).';

ALTER TABLE public.lojas DROP CONSTRAINT IF EXISTS lojas_asaas_ciclo_pendente_check;
ALTER TABLE public.lojas
  ADD CONSTRAINT lojas_asaas_ciclo_pendente_check
  CHECK (asaas_ciclo_pendente IS NULL OR asaas_ciclo_pendente IN ('mensal', 'anual'));

ALTER TABLE public.lojas DROP CONSTRAINT IF EXISTS lojas_assinatura_ciclo_check;
ALTER TABLE public.lojas
  ADD CONSTRAINT lojas_assinatura_ciclo_check
  CHECK (assinatura_ciclo IS NULL OR assinatura_ciclo IN ('mensal', 'anual'));

DROP FUNCTION IF EXISTS public.aplicar_pagamento_asaas(
  text, text, uuid, public.plano_assinatura, text, text, timestamptz, jsonb
);

CREATE OR REPLACE FUNCTION public.aplicar_pagamento_asaas(
  p_event_id text,
  p_event_type text,
  p_loja_id uuid,
  p_plano public.plano_assinatura,
  p_payment_id text DEFAULT NULL,
  p_subscription_id text DEFAULT NULL,
  p_expira_em timestamptz DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_ciclo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expira timestamptz;
  v_ciclo text;
BEGIN
  IF p_event_id IS NULL OR trim(p_event_id) = '' THEN
    RAISE EXCEPTION 'event_id obrigatório.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.loja_asaas_eventos WHERE event_id = p_event_id) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  INSERT INTO public.loja_asaas_eventos (
    event_id, event_type, loja_id, payment_id, subscription_id, payload
  ) VALUES (
    p_event_id,
    p_event_type,
    p_loja_id,
    p_payment_id,
    p_subscription_id,
    COALESCE(p_payload, '{}'::jsonb)
  );

  IF p_loja_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'loja_id ausente');
  END IF;

  v_ciclo := lower(trim(COALESCE(p_ciclo, '')));
  IF v_ciclo NOT IN ('mensal', 'anual') THEN
    v_ciclo := NULL;
  END IF;

  IF p_event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') THEN
    v_expira := COALESCE(
      p_expira_em,
      now() + CASE WHEN v_ciclo = 'anual' THEN interval '366 days' ELSE interval '31 days' END
    );

    UPDATE public.lojas
    SET
      plano = COALESCE(p_plano, plano),
      assinatura_status = 'ativa',
      assinatura_origem = 'gateway',
      assinatura_expira_em = v_expira,
      assinatura_ciclo = COALESCE(v_ciclo, assinatura_ciclo, 'mensal'),
      asaas_subscription_id = COALESCE(p_subscription_id, asaas_subscription_id),
      asaas_plano_pendente = NULL,
      asaas_ciclo_pendente = NULL,
      plano_atualizado_em = now(),
      updated_at = now()
    WHERE id = p_loja_id;

  ELSIF p_event_type IN (
    'PAYMENT_REFUNDED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_DELETED'
  ) THEN
    UPDATE public.lojas
    SET
      assinatura_status = 'suspensa',
      assinatura_origem = 'gateway',
      assinatura_expira_em = now(),
      plano_atualizado_em = now(),
      updated_at = now()
    WHERE id = p_loja_id
      AND assinatura_origem = 'gateway';

  ELSIF p_event_type = 'PAYMENT_OVERDUE' THEN
    NULL;
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'ciclo', v_ciclo);
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_pagamento_asaas(
  text, text, uuid, public.plano_assinatura, text, text, timestamptz, jsonb, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_pagamento_asaas(
  text, text, uuid, public.plano_assinatura, text, text, timestamptz, jsonb, text
) TO service_role;
