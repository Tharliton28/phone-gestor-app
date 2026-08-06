-- =============================================================================
-- Cancelamento atômico de venda (status + financeiro + estoque)
-- Evita venda "Concluída" com receitas já canceladas / estoque pela metade.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancelar_venda(
  p_loja_id uuid,
  p_venda_id uuid,
  p_operador_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda public.vendas%ROWTYPE;
  v_item record;
  v_doc_autorizado integer;
  v_recebido integer;
  v_operador uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  IF NOT public.auth_user_has_papel(
    p_loja_id,
    ARRAY['owner', 'admin', 'gerente', 'vendedor']::public.usuario_papel[]
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para cancelar vendas.');
  END IF;

  v_operador := coalesce(p_operador_id, auth.uid());

  SELECT * INTO v_venda
  FROM public.vendas
  WHERE id = p_venda_id AND loja_id = p_loja_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  END IF;

  IF v_venda.status = 'cancelada' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta venda já está cancelada.');
  END IF;

  -- NFC-e autorizada: exige cancelamento fiscal antes (não apaga o rastro SEFAZ)
  SELECT count(*)::integer INTO v_doc_autorizado
  FROM public.documentos_fiscais
  WHERE loja_id = p_loja_id
    AND venda_id = p_venda_id
    AND status = 'autorizado';

  IF v_doc_autorizado > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error',
      'Esta venda tem NFC-e autorizada. Cancele o documento fiscal antes de cancelar a venda.'
    );
  END IF;

  -- Não apaga receita já liquidada sem estorno de caixa
  SELECT count(*)::integer INTO v_recebido
  FROM public.lancamentos_financeiros
  WHERE loja_id = p_loja_id
    AND venda_id = p_venda_id
    AND origem = 'venda'
    AND status = 'recebido';

  IF v_recebido > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error',
      'Há receitas já recebidas vinculadas a esta venda. Estorne o financeiro antes de cancelar.'
    );
  END IF;

  IF v_venda.status = 'concluido' THEN
    PERFORM public.fin_cancelar_receitas_venda(p_loja_id, p_venda_id);
  END IF;

  -- Estorno de estoque (DEFINER — vendedor também consegue)
  IF v_venda.estoque_baixado THEN
    FOR v_item IN
      SELECT id, produto_id, quantidade, descricao, baixou_estoque
      FROM public.venda_itens
      WHERE loja_id = p_loja_id AND venda_id = p_venda_id
    LOOP
      IF v_item.produto_id IS NOT NULL AND v_item.baixou_estoque THEN
        PERFORM public._pdv_registrar_movimentacao(
          p_loja_id,
          v_item.produto_id,
          'entrada',
          abs(v_item.quantidade)::integer,
          'estorno',
          format('Estorno venda %s — %s', v_venda.codigo, coalesce(v_item.descricao, 'item')),
          p_venda_id,
          v_operador
        );

        UPDATE public.venda_itens
        SET baixou_estoque = false
        WHERE id = v_item.id AND loja_id = p_loja_id;
      END IF;
    END LOOP;
  END IF;

  -- Docs mock/dev: marcar cancelados para não parecerem válidos
  UPDATE public.documentos_fiscais
  SET status = 'cancelado',
      mensagem = coalesce(mensagem, '') || ' | Venda cancelada',
      updated_at = now()
  WHERE loja_id = p_loja_id
    AND venda_id = p_venda_id
    AND status IN ('mock', 'rascunho', 'rejeitado', 'processando');

  UPDATE public.vendas
  SET status = 'cancelada',
      estoque_baixado = false,
      updated_at = now()
  WHERE id = p_venda_id AND loja_id = p_loja_id;

  RETURN jsonb_build_object('ok', true, 'venda_id', p_venda_id, 'status', 'cancelada');
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_venda(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancelar_venda(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancelar_venda(uuid, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.cancelar_venda IS
  'Cancela venda de forma atômica: receitas pendentes, estorno de estoque e status.';
