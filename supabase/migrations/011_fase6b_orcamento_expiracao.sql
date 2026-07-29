-- =============================================================================
-- Phone Gestor ERP — Fase 6b: Expiração automática de orçamentos
-- Marca como expirado orçamentos pendentes/aprovados após data_validade
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expirar_orcamentos_vencidos(p_loja_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.orcamentos
  SET status = 'expirado'
  WHERE status IN ('pendente', 'aprovado')
    AND data_validade IS NOT NULL
    AND data_validade < CURRENT_DATE
    AND (p_loja_id IS NULL OR loja_id = p_loja_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_orcamentos_vencidos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expirar_orcamentos_vencidos(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS orcamentos_loja_validade_status_idx
  ON public.orcamentos (loja_id, data_validade, status)
  WHERE status IN ('pendente', 'aprovado');
