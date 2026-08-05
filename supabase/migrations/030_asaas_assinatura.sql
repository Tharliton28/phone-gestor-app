-- =============================================================================
-- Phone Gestor — Integração Asaas (assinatura mensal)
-- Colunas na loja + log idempotente de eventos de webhook.
-- =============================================================================

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS asaas_plano_pendente public.plano_assinatura;

COMMENT ON COLUMN public.lojas.asaas_customer_id IS 'ID do cliente no Asaas (cus_...).';
COMMENT ON COLUMN public.lojas.asaas_subscription_id IS 'ID da assinatura mensal no Asaas (sub_...).';
COMMENT ON COLUMN public.lojas.asaas_plano_pendente IS 'Plano escolhido no checkout, aguardando confirmação do pagamento.';

CREATE TABLE IF NOT EXISTS public.loja_asaas_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  loja_id uuid REFERENCES public.lojas (id) ON DELETE SET NULL,
  payment_id text,
  subscription_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loja_asaas_eventos_loja_id_idx
  ON public.loja_asaas_eventos (loja_id);

ALTER TABLE public.loja_asaas_eventos ENABLE ROW LEVEL SECURITY;

-- Sem policies para authenticated/anon: só service role (Edge Functions).

CREATE OR REPLACE FUNCTION public.aplicar_pagamento_asaas(
  p_event_id text,
  p_event_type text,
  p_loja_id uuid,
  p_plano public.plano_assinatura,
  p_payment_id text DEFAULT NULL,
  p_subscription_id text DEFAULT NULL,
  p_expira_em timestamptz DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expira timestamptz;
BEGIN
  IF p_event_id IS NULL OR trim(p_event_id) = '' THEN
    RAISE EXCEPTION 'event_id obrigatório.';
  END IF;

  -- Idempotência
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

  IF p_event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') THEN
    v_expira := COALESCE(p_expira_em, now() + interval '31 days');

    UPDATE public.lojas
    SET
      plano = COALESCE(p_plano, plano),
      assinatura_status = 'ativa',
      assinatura_origem = 'gateway',
      assinatura_expira_em = v_expira,
      asaas_subscription_id = COALESCE(p_subscription_id, asaas_subscription_id),
      asaas_plano_pendente = NULL,
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
    -- Não suspende na hora: o bloqueio automático usa assinatura_expira_em.
    NULL;
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_pagamento_asaas(
  text, text, uuid, public.plano_assinatura, text, text, timestamptz, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_pagamento_asaas(
  text, text, uuid, public.plano_assinatura, text, text, timestamptz, jsonb
) TO service_role;
