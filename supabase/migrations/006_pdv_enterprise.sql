-- =============================================================================
-- Phone Gestor ERP — Fase 4b: PDV Enterprise
-- valor_troco, taxas por pagamento, aparelho entrada real, RPC transacional
-- =============================================================================

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS valor_troco numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.venda_pagamentos
  ADD COLUMN IF NOT EXISTS valor_base numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_taxa numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aparelho_entrada_produto_id uuid REFERENCES public.produtos (id) ON DELETE SET NULL;

ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_valores_chk;

ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_valores_chk CHECK (
    valor_subtotal >= 0
    AND valor_desconto >= 0
    AND valor_acrescimo >= 0
    AND valor_total >= 0
    AND valor_troco >= 0
    AND valor_desconto <= valor_subtotal
    AND valor_total = round(valor_subtotal - valor_desconto + valor_acrescimo, 2)
  );

ALTER TABLE public.venda_pagamentos DROP CONSTRAINT IF EXISTS venda_pagamentos_valor_chk;

ALTER TABLE public.venda_pagamentos
  ADD CONSTRAINT venda_pagamentos_valor_chk CHECK (
    valor >= 0
    AND valor_base >= 0
    AND valor_taxa >= 0
  );


-- ---------------------------------------------------------------------------
-- Movimentação interna (transacional, sem RLS bypass issues)
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- Cria produto seminovo a partir de aparelho na troca
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._pdv_criar_aparelho_entrada(
  p_loja_id uuid,
  p_modelo text,
  p_imei text,
  p_valor numeric,
  p_venda_id uuid,
  p_operador_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_produto_id uuid;
  v_codigo integer;
  v_imei char(15);
  v_nome text;
BEGIN
  v_nome := trim(p_modelo);
  IF v_nome = '' THEN
    RAISE EXCEPTION 'Modelo do aparelho de entrada é obrigatório.';
  END IF;

  v_imei := NULL;
  IF p_imei IS NOT NULL AND trim(p_imei) <> '' THEN
    v_imei := regexp_replace(p_imei, '\D', '', 'g');
    IF length(v_imei) <> 15 THEN
      RAISE EXCEPTION 'IMEI deve conter 15 dígitos.';
    END IF;
  END IF;

  v_codigo := public.next_produto_codigo(p_loja_id);

  INSERT INTO public.produtos (
    loja_id, codigo, tipo, categoria, marca, nome,
    disponibilidade, status,
    imei1, quantidade_atual, valor_custo, valor_venda,
    estado_aparelho, data_entrada, observacoes
  ) VALUES (
    p_loja_id, v_codigo, 'aparelho', 'Smartphone', 'Entrada PDV', v_nome,
    'disponivel_venda', 'ativo',
    v_imei, 0, coalesce(p_valor, 0), coalesce(p_valor, 0),
    'Seminovo', CURRENT_DATE,
    'Entrada via troca — venda PDV'
  )
  RETURNING id INTO v_produto_id;

  PERFORM public._pdv_registrar_movimentacao(
    p_loja_id, v_produto_id, 'entrada', 1,
    'troca',
    'Aparelho recebido na troca (PDV)',
    p_venda_id,
    p_operador_id
  );

  RETURN v_produto_id;
END;
$$;


-- ---------------------------------------------------------------------------
-- RPC principal: criar venda PDV (atômico)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_venda_pdv(
  p_loja_id uuid,
  p_payload jsonb,
  p_operador_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_pag jsonb;
  v_aparelho jsonb;
  v_status public.venda_status;
  v_codigo text;
  v_venda_id uuid;
  v_subtotal numeric(12, 2) := 0;
  v_desconto numeric(12, 2) := 0;
  v_acrescimo numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_total_pago numeric(12, 2) := 0;
  v_troco numeric(12, 2) := 0;
  v_linha_total numeric(12, 2);
  v_qtd integer;
  v_preco numeric(12, 2);
  v_produto_id uuid;
  v_demanda integer;
  v_estoque integer;
  v_permite_ruptura boolean := false;
  v_item_row record;
  v_pag_valor numeric(12, 2);
  v_pag_base numeric(12, 2);
  v_pag_taxa numeric(12, 2);
  v_aparelho_produto_id uuid;
  v_itens jsonb;
  v_pagamentos jsonb;
BEGIN
  IF p_loja_id IS NULL THEN
    RAISE EXCEPTION 'Loja não informada.';
  END IF;

  IF p_loja_id NOT IN (SELECT public.auth_user_loja_ids()) THEN
    RAISE EXCEPTION 'Sem permissão para criar venda nesta loja.';
  END IF;

  v_itens := coalesce(p_payload->'itens', '[]'::jsonb);
  v_pagamentos := coalesce(p_payload->'pagamentos', '[]'::jsonb);

  IF jsonb_array_length(v_itens) = 0 THEN
    RAISE EXCEPTION 'Adicione produtos ao carrinho.';
  END IF;

  v_status := coalesce((p_payload->>'status')::public.venda_status, 'concluido');
  v_desconto := round(coalesce((p_payload->>'descontoGlobal')::numeric, 0), 2);

  -- Subtotal por linha arredondado
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_itens)
  LOOP
    v_qtd := greatest(coalesce((v_item->>'quantidade')::integer, 1), 1);
    v_preco := round(coalesce((v_item->>'preco')::numeric, (v_item->>'valorUnitario')::numeric, 0), 2);
    v_linha_total := round(v_qtd * v_preco, 2);
    v_subtotal := round(v_subtotal + v_linha_total, 2);
  END LOOP;

  IF v_desconto > v_subtotal THEN
    RAISE EXCEPTION 'Desconto não pode ser maior que o subtotal da venda.';
  END IF;

  -- Acréscimo manual + taxas repassadas nos pagamentos
  v_acrescimo := round(coalesce((p_payload->>'acrescimoManual')::numeric, 0), 2);

  FOR v_pag IN SELECT * FROM jsonb_array_elements(v_pagamentos)
  LOOP
    IF coalesce((v_pag->>'taxaRepassada')::boolean, false) THEN
      v_pag_taxa := round(coalesce((v_pag->>'valorTaxa')::numeric, 0), 2);
      IF v_pag_taxa <= 0 THEN
        v_pag_base := round(coalesce((v_pag->>'valorBase')::numeric, (v_pag->>'valor')::numeric, 0), 2);
        v_pag_taxa := round(v_pag_base * coalesce((v_pag->>'taxa')::numeric, 0) / 100, 2);
      END IF;
      v_acrescimo := round(v_acrescimo + v_pag_taxa, 2);
    END IF;
  END LOOP;

  v_total := round(greatest(v_subtotal - v_desconto + v_acrescimo, 0), 2);

  FOR v_pag IN SELECT * FROM jsonb_array_elements(v_pagamentos)
  LOOP
    v_pag_valor := round(coalesce((v_pag->>'valor')::numeric, 0), 2);
    IF v_pag_valor > 0 THEN
      v_total_pago := round(v_total_pago + v_pag_valor, 2);
    END IF;
  END LOOP;

  IF v_total_pago < v_total THEN
    RAISE EXCEPTION 'O valor pago não confere com o total da venda.';
  END IF;

  v_troco := round(greatest(v_total_pago - v_total, 0), 2);

  SELECT coalesce(venda_sem_estoque, false) INTO v_permite_ruptura
  FROM public.loja_configuracoes
  WHERE loja_id = p_loja_id;

  IF v_status = 'concluido' AND NOT coalesce(v_permite_ruptura, false) THEN
    FOR v_produto_id, v_demanda IN
      SELECT
        (elem->>'produtoId')::uuid,
        sum(greatest(coalesce((elem->>'quantidade')::integer, 1), 1))::integer
      FROM jsonb_array_elements(v_itens) AS elem
      WHERE elem->>'produtoId' IS NOT NULL AND elem->>'produtoId' <> ''
      GROUP BY 1
    LOOP
      SELECT quantidade_atual INTO v_estoque
      FROM public.produtos
      WHERE id = v_produto_id AND loja_id = p_loja_id;

      IF NOT FOUND OR v_estoque < v_demanda THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto solicitado.';
      END IF;
    END LOOP;
  END IF;

  v_codigo := public.next_venda_codigo(p_loja_id);

  INSERT INTO public.vendas (
    loja_id, codigo, cliente_id, vendedor_id, status, tipo_venda,
    valor_subtotal, valor_desconto, valor_acrescimo, valor_total, valor_troco,
    data_venda, observacoes
  ) VALUES (
    p_loja_id,
    v_codigo,
    nullif(p_payload->>'clienteId', '')::uuid,
    coalesce(nullif(p_payload->>'vendedorId', '')::uuid, p_operador_id),
    v_status,
    nullif(p_payload->>'tipoVenda', ''),
    v_subtotal,
    v_desconto,
    v_acrescimo,
    v_total,
    v_troco,
    coalesce((p_payload->>'dataVenda')::date, CURRENT_DATE),
    nullif(trim(p_payload->>'observacoes'), '')
  )
  RETURNING id INTO v_venda_id;

  -- Itens
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_itens)
  LOOP
    v_qtd := greatest(coalesce((v_item->>'quantidade')::integer, 1), 1);
    v_preco := round(coalesce((v_item->>'preco')::numeric, (v_item->>'valorUnitario')::numeric, 0), 2);
    v_linha_total := round(v_qtd * v_preco, 2);

    INSERT INTO public.venda_itens (
      loja_id, venda_id, produto_id, descricao, imei,
      quantidade, valor_unitario, valor_total
    ) VALUES (
      p_loja_id,
      v_venda_id,
      nullif(v_item->>'produtoId', '')::uuid,
      coalesce(nullif(trim(v_item->>'nome'), ''), nullif(trim(v_item->>'descricao'), ''), 'Item avulso'),
      nullif(trim(v_item->>'imei'), ''),
      v_qtd,
      v_preco,
      v_linha_total
    );
  END LOOP;

  -- Pagamentos (+ aparelho entrada)
  FOR v_pag IN SELECT * FROM jsonb_array_elements(v_pagamentos)
  LOOP
    v_pag_valor := round(coalesce((v_pag->>'valor')::numeric, 0), 2);
    IF v_pag_valor <= 0 THEN
      CONTINUE;
    END IF;

    v_pag_base := round(coalesce((v_pag->>'valorBase')::numeric, v_pag_valor), 2);
    v_pag_taxa := round(coalesce((v_pag->>'valorTaxa')::numeric, 0), 2);
    v_aparelho_produto_id := NULL;

    v_aparelho := v_pag->'aparelhoEntrada';
    IF v_aparelho IS NOT NULL AND v_aparelho <> 'null'::jsonb THEN
      v_aparelho_produto_id := public._pdv_criar_aparelho_entrada(
        p_loja_id,
        v_aparelho->>'modelo',
        v_aparelho->>'imei',
        v_pag_valor,
        v_venda_id,
        p_operador_id
      );
    END IF;

    INSERT INTO public.venda_pagamentos (
      loja_id, venda_id,
      forma_pagamento_id, forma_nome,
      valor, valor_base, valor_taxa,
      parcelas, detalhes,
      taxa_percentual, taxa_repassada,
      aparelho_entrada_produto_id
    ) VALUES (
      p_loja_id,
      v_venda_id,
      nullif(v_pag->>'formaPagamentoId', '')::uuid,
      coalesce(nullif(v_pag->>'formaNome', ''), nullif(v_pag->>'forma', ''), 'Não informado'),
      v_pag_valor,
      v_pag_base,
      v_pag_taxa,
      nullif(v_pag->>'parcelas', ''),
      nullif(trim(v_pag->>'detalhes'), ''),
      coalesce((v_pag->>'taxa')::numeric, 0),
      coalesce((v_pag->>'taxaRepassada')::boolean, false),
      v_aparelho_produto_id
    );
  END LOOP;

  -- Baixa estoque (venda concluída)
  IF v_status = 'concluido' THEN
    FOR v_item_row IN
      SELECT id, produto_id, quantidade, descricao
      FROM public.venda_itens
      WHERE venda_id = v_venda_id AND loja_id = p_loja_id
    LOOP
      IF v_item_row.produto_id IS NULL THEN
        CONTINUE;
      END IF;

      PERFORM public._pdv_registrar_movimentacao(
        p_loja_id,
        v_item_row.produto_id,
        'saida',
        v_item_row.quantidade,
        'venda',
        'Venda ' || v_codigo || ' — ' || v_item_row.descricao,
        v_venda_id,
        p_operador_id
      );

      UPDATE public.venda_itens
      SET baixou_estoque = true
      WHERE id = v_item_row.id;
    END LOOP;

    UPDATE public.vendas
    SET estoque_baixado = true
    WHERE id = v_venda_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_venda_id,
    'codigo', v_codigo,
    'valor_total', v_total,
    'valor_troco', v_troco
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_venda_pdv(uuid, jsonb, uuid) TO authenticated;

COMMENT ON FUNCTION public.criar_venda_pdv IS
  'Cria venda PDV de forma atômica: totais, pagamentos, troco, aparelho entrada e estoque.';
