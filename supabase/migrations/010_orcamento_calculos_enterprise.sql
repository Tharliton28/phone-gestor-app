-- =============================================================================
-- Phone Gestor ERP — Taxas de crédito por parcela + campos de simulação
-- Fonte configurável para orçamento e PDV (mesma tabela por loja)
-- =============================================================================

CREATE TABLE public.taxas_credito_parcela (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  parcelas smallint NOT NULL,
  taxa_percentual numeric(6, 3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxas_credito_parcela_loja_parcelas_uidx UNIQUE (loja_id, parcelas),
  CONSTRAINT taxas_credito_parcela_parcelas_chk CHECK (parcelas BETWEEN 1 AND 12),
  CONSTRAINT taxas_credito_parcela_taxa_chk CHECK (taxa_percentual >= 0)
);

CREATE INDEX taxas_credito_parcela_loja_id_idx ON public.taxas_credito_parcela (loja_id);


ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS valor_restante_sim numeric(12, 2) NOT NULL DEFAULT 0;


-- Seed padrão (mesmas taxas do simulador original) para lojas existentes e novas
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
  ON CONFLICT (loja_id, parcelas) DO NOTHING;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_lojas_seed_taxas_credito ON public.lojas;

CREATE TRIGGER trg_lojas_seed_taxas_credito
AFTER INSERT ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.seed_taxas_credito_parcela_loja();


-- Backfill lojas já existentes
INSERT INTO public.taxas_credito_parcela (loja_id, parcelas, taxa_percentual)
SELECT l.id, v.parcelas, v.taxa_percentual
FROM public.lojas l
CROSS JOIN (
  VALUES
    (1, 3.500::numeric),
    (2, 4.500),
    (3, 5.000),
    (4, 6.000),
    (5, 7.000),
    (6, 8.000),
    (7, 9.000),
    (8, 10.000),
    (9, 11.000),
    (10, 12.000),
    (11, 13.000),
    (12, 15.000)
) AS v(parcelas, taxa_percentual)
ON CONFLICT (loja_id, parcelas) DO NOTHING;


CREATE TRIGGER trg_taxas_credito_parcela_updated_at
BEFORE UPDATE ON public.taxas_credito_parcela
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


ALTER TABLE public.taxas_credito_parcela ENABLE ROW LEVEL SECURITY;

CREATE POLICY taxas_credito_select_member ON public.taxas_credito_parcela
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY taxas_credito_insert_admin ON public.taxas_credito_parcela
FOR INSERT TO authenticated
WITH CHECK (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

CREATE POLICY taxas_credito_update_admin ON public.taxas_credito_parcela
FOR UPDATE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
)
WITH CHECK (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

CREATE POLICY taxas_credito_delete_admin ON public.taxas_credito_parcela
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);
