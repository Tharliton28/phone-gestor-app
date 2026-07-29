-- =============================================================================
-- Phone Gestor ERP — Fase 7a: Taxas de crédito por maquininha
-- forma_pagamento_id NULL = grade padrão da loja (fallback)
-- forma_pagamento_id preenchido = grade da adquirente/maquininha de crédito
-- =============================================================================

ALTER TABLE public.taxas_credito_parcela
  ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid
  REFERENCES public.formas_pagamento (id) ON DELETE CASCADE;

ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS forma_pagamento_credito_id uuid
  REFERENCES public.formas_pagamento (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS taxas_credito_parcela_forma_id_idx
  ON public.taxas_credito_parcela (forma_pagamento_id)
  WHERE forma_pagamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orcamentos_forma_credito_id_idx
  ON public.orcamentos (forma_pagamento_credito_id)
  WHERE forma_pagamento_credito_id IS NOT NULL;

ALTER TABLE public.taxas_credito_parcela
  DROP CONSTRAINT IF EXISTS taxas_credito_parcela_loja_parcelas_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS taxas_credito_loja_parcelas_padrao_uidx
  ON public.taxas_credito_parcela (loja_id, parcelas)
  WHERE forma_pagamento_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS taxas_credito_loja_forma_parcelas_uidx
  ON public.taxas_credito_parcela (loja_id, forma_pagamento_id, parcelas)
  WHERE forma_pagamento_id IS NOT NULL;

-- Garante que taxas por forma só existam para formas de crédito da mesma loja
CREATE OR REPLACE FUNCTION public.validate_taxa_credito_forma_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_forma uuid;
  v_tipo public.forma_pagamento_tipo;
BEGIN
  IF NEW.forma_pagamento_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT loja_id, tipo INTO v_loja_forma, v_tipo
  FROM public.formas_pagamento
  WHERE id = NEW.forma_pagamento_id;

  IF v_loja_forma IS NULL OR v_loja_forma <> NEW.loja_id THEN
    RAISE EXCEPTION 'Forma de pagamento não pertence à mesma loja da taxa.';
  END IF;

  IF v_tipo <> 'credito' THEN
    RAISE EXCEPTION 'Taxas por parcela só podem ser vinculadas a formas de crédito.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_taxas_credito_validate_forma ON public.taxas_credito_parcela;

CREATE TRIGGER trg_taxas_credito_validate_forma
BEFORE INSERT OR UPDATE OF forma_pagamento_id, loja_id ON public.taxas_credito_parcela
FOR EACH ROW EXECUTE FUNCTION public.validate_taxa_credito_forma_loja();
