-- =============================================================================
-- Phone Gestor — Crédito de pacotes via webhook Asaas (service_role)
-- Não usa garantir_loja_carteira: ela exige auth.uid() / membership.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.aplicar_pagamento_creditos_asaas(
  p_event_id text,
  p_event_type text,
  p_loja_id uuid,
  p_payment_id text DEFAULT NULL,
  p_quantidade integer DEFAULT NULL,
  p_pacote_id text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.loja_carteiras%ROWTYPE;
  v_qtd integer;
  v_desc text;
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
    NULL,
    COALESCE(p_payload, '{}'::jsonb)
  );

  IF p_loja_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'loja_id ausente');
  END IF;

  IF p_event_type NOT IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'evento sem crédito');
  END IF;

  v_qtd := COALESCE(p_quantidade, 0);
  IF v_qtd <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'quantidade inválida');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lojas WHERE id = p_loja_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'loja inexistente');
  END IF;

  v_desc := format(
    'Compra %s — %s créditos (Asaas %s)',
    COALESCE(NULLIF(trim(p_pacote_id), ''), 'pacote'),
    v_qtd,
    COALESCE(p_payment_id, '—')
  );

  INSERT INTO public.loja_carteiras (loja_id, saldo)
  VALUES (p_loja_id, 0)
  ON CONFLICT (loja_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.loja_carteiras
  WHERE loja_id = p_loja_id
  FOR UPDATE;

  UPDATE public.loja_carteiras
  SET saldo = saldo + v_qtd,
      updated_at = now()
  WHERE loja_id = p_loja_id
  RETURNING * INTO v_row;

  INSERT INTO public.loja_credito_lancamentos (
    loja_id, tipo, quantidade, saldo_apos, acao, descricao, created_by
  ) VALUES (
    p_loja_id,
    'credito',
    v_qtd,
    v_row.saldo,
    'compra_pacote',
    v_desc,
    NULL
  );

  RETURN jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'creditado', v_qtd,
    'saldo', v_row.saldo,
    'pacote_id', p_pacote_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_pagamento_creditos_asaas(
  text, text, uuid, text, integer, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_pagamento_creditos_asaas(
  text, text, uuid, text, integer, text, jsonb
) TO service_role;
