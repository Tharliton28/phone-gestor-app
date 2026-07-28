-- =============================================================================
-- Fix PDV: remove overload antigo e corrige cast enum na movimentação
-- Rode ESTE script completo no Supabase SQL Editor (substitui o 007 anterior)
-- =============================================================================

-- Remove versão com parâmetros text (006 original — causa do erro)
DROP FUNCTION IF EXISTS public._pdv_registrar_movimentacao(
  uuid, uuid, text, integer, text, text, uuid, uuid
);

-- Remove overload enum criado pelo 007 anterior (se existir)
DROP FUNCTION IF EXISTS public._pdv_registrar_movimentacao(
  uuid, uuid, public.movimentacao_tipo, integer, public.movimentacao_origem, text, uuid, uuid
);

CREATE OR REPLACE FUNCTION public._pdv_registrar_movimentacao(
  p_loja_id uuid,
  p_produto_id uuid,
  p_tipo text,
  p_quantidade integer,
  p_origem text,
  p_motivo text,
  p_referencia_id uuid,
  p_operador_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anterior integer;
  v_posterior integer;
  v_delta integer;
  v_codigo text;
  v_tipo public.movimentacao_tipo;
  v_origem public.movimentacao_origem;
BEGIN
  v_tipo := p_tipo::public.movimentacao_tipo;
  v_origem := p_origem::public.movimentacao_origem;

  SELECT quantidade_atual INTO v_anterior
  FROM public.produtos
  WHERE id = p_produto_id AND loja_id = p_loja_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto % não encontrado na loja.', p_produto_id;
  END IF;

  IF v_tipo = 'entrada'::public.movimentacao_tipo THEN
    v_delta := abs(p_quantidade);
  ELSIF v_tipo = 'saida'::public.movimentacao_tipo THEN
    v_delta := -abs(p_quantidade);
  ELSE
    RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_tipo;
  END IF;

  v_posterior := v_anterior + v_delta;
  v_codigo := public.next_movimentacao_codigo(p_loja_id);

  INSERT INTO public.movimentacoes_estoque (
    loja_id, codigo, produto_id, tipo, quantidade,
    quantidade_anterior, quantidade_posterior,
    origem, motivo, referencia_id, operador_id
  ) VALUES (
    p_loja_id, v_codigo, p_produto_id, v_tipo, v_delta,
    v_anterior, v_posterior,
    v_origem, p_motivo, p_referencia_id, p_operador_id
  );

  UPDATE public.produtos
  SET quantidade_atual = v_posterior, updated_at = now()
  WHERE id = p_produto_id AND loja_id = p_loja_id;
END;
$$;
