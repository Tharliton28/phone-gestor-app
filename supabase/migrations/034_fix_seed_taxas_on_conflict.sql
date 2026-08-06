-- =============================================================================
-- Fix: seed de taxas ao criar loja
-- Migration 012 trocou UNIQUE (loja_id, parcelas) por índice parcial
-- WHERE forma_pagamento_id IS NULL. O seed ainda usava ON CONFLICT sem o WHERE,
-- quebrando o onboarding (create-loja).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_taxas_credito_parcela_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.taxas_credito_parcela (loja_id, parcelas, taxa_percentual)
  VALUES
    (NEW.id, 1, 3.500),
    (NEW.id, 2, 4.500),
    (NEW.id, 3, 5.000),
    (NEW.id, 4, 6.000),
    (NEW.id, 5, 7.000),
    (NEW.id, 6, 8.000),
    (NEW.id, 7, 9.000),
    (NEW.id, 8, 10.000),
    (NEW.id, 9, 11.000),
    (NEW.id, 10, 12.000),
    (NEW.id, 11, 13.000),
    (NEW.id, 12, 15.000)
  ON CONFLICT (loja_id, parcelas) WHERE (forma_pagamento_id IS NULL) DO NOTHING;

  RETURN NEW;
END;
$$;
