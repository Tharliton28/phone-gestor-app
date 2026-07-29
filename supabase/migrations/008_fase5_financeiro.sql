-- =============================================================================
-- Phone Gestor ERP — Fase 5: Financeiro
-- Lançamentos, plano de contas, contas bancárias, receitas automáticas da venda
-- =============================================================================

CREATE TYPE public.lancamento_tipo AS ENUM ('receita', 'despesa');

CREATE TYPE public.lancamento_status AS ENUM (
  'pendente',
  'recebido',
  'pago',
  'cancelado'
);

CREATE TYPE public.lancamento_origem AS ENUM (
  'manual',
  'venda',
  'ordem_compra',
  'os'
);


CREATE TABLE public.plano_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo public.lancamento_tipo NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem_exibicao integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plano_contas_loja_nome_uidx UNIQUE (loja_id, nome)
);

CREATE INDEX plano_contas_loja_id_idx ON public.plano_contas (loja_id);


CREATE TABLE public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem_exibicao integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contas_bancarias_loja_nome_uidx UNIQUE (loja_id, nome)
);

CREATE INDEX contas_bancarias_loja_id_idx ON public.contas_bancarias (loja_id);


CREATE TABLE public.lancamentos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo text NOT NULL,
  tipo public.lancamento_tipo NOT NULL,
  status public.lancamento_status NOT NULL DEFAULT 'pendente',

  descricao text NOT NULL,
  valor numeric(12, 2) NOT NULL,
  valor_liquidado numeric(12, 2) NOT NULL DEFAULT 0,

  pessoa_id uuid REFERENCES public.pessoas (id) ON DELETE SET NULL,
  plano_conta_id uuid REFERENCES public.plano_contas (id) ON DELETE SET NULL,
  conta_bancaria_id uuid REFERENCES public.contas_bancarias (id) ON DELETE SET NULL,
  forma_pagamento_id uuid REFERENCES public.formas_pagamento (id) ON DELETE SET NULL,
  forma_pagamento_nome text,

  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  data_liquidacao date,

  numero_documento text,
  observacoes text,

  origem public.lancamento_origem NOT NULL DEFAULT 'manual',
  venda_id uuid REFERENCES public.vendas (id) ON DELETE SET NULL,
  venda_pagamento_id uuid REFERENCES public.venda_pagamentos (id) ON DELETE SET NULL,

  parcela_num smallint,
  parcela_total smallint,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lancamentos_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT lancamentos_valor_chk CHECK (valor >= 0),
  CONSTRAINT lancamentos_valor_liquidado_chk CHECK (valor_liquidado >= 0)
);

CREATE INDEX lancamentos_loja_id_idx ON public.lancamentos_financeiros (loja_id);
CREATE INDEX lancamentos_loja_tipo_idx ON public.lancamentos_financeiros (loja_id, tipo);
CREATE INDEX lancamentos_loja_status_idx ON public.lancamentos_financeiros (loja_id, status);
CREATE INDEX lancamentos_loja_vencimento_idx ON public.lancamentos_financeiros (loja_id, data_vencimento);
CREATE INDEX lancamentos_venda_id_idx ON public.lancamentos_financeiros (venda_id);


-- ---------------------------------------------------------------------------
-- Seed financeiro por loja
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.seed_financeiro_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.plano_contas (loja_id, nome, tipo, ordem_exibicao)
  VALUES
    (NEW.id, 'Venda de Aparelhos', 'receita', 1),
    (NEW.id, 'Venda de Acessórios', 'receita', 2),
    (NEW.id, 'Serviços e Mão de Obra', 'receita', 3),
    (NEW.id, 'Custo com Mercadorias', 'despesa', 4),
    (NEW.id, 'Despesas Fixas', 'despesa', 5),
    (NEW.id, 'Folha de Pagamento', 'despesa', 6),
    (NEW.id, 'Impostos', 'despesa', 7);

  INSERT INTO public.contas_bancarias (loja_id, nome, ordem_exibicao)
  VALUES
    (NEW.id, 'Caixa da Loja (Dinheiro)', 1),
    (NEW.id, 'Conta PIX', 2),
    (NEW.id, 'Conta Corrente', 3);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lojas_seed_financeiro ON public.lojas;
CREATE TRIGGER trg_lojas_seed_financeiro
AFTER INSERT ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.seed_financeiro_loja();

-- Backfill lojas existentes
INSERT INTO public.plano_contas (loja_id, nome, tipo, ordem_exibicao)
SELECT l.id, v.nome, v.tipo::public.lancamento_tipo, v.ordem
FROM public.lojas l
CROSS JOIN (VALUES
  ('Venda de Aparelhos', 'receita', 1),
  ('Venda de Acessórios', 'receita', 2),
  ('Serviços e Mão de Obra', 'receita', 3),
  ('Custo com Mercadorias', 'despesa', 4),
  ('Despesas Fixas', 'despesa', 5),
  ('Folha de Pagamento', 'despesa', 6),
  ('Impostos', 'despesa', 7)
) AS v(nome, tipo, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.plano_contas pc WHERE pc.loja_id = l.id AND pc.nome = v.nome
);

INSERT INTO public.contas_bancarias (loja_id, nome, ordem_exibicao)
SELECT l.id, v.nome, v.ordem
FROM public.lojas l
CROSS JOIN (VALUES
  ('Caixa da Loja (Dinheiro)', 1),
  ('Conta PIX', 2),
  ('Conta Corrente', 3)
) AS v(nome, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.contas_bancarias cb WHERE cb.loja_id = l.id AND cb.nome = v.nome
);


CREATE OR REPLACE FUNCTION public.next_lancamento_codigo(
  p_loja_id uuid,
  p_tipo public.lancamento_tipo
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
BEGIN
  v_prefix := CASE WHEN p_tipo = 'receita' THEN 'REC' ELSE 'PAG' END;

  SELECT coalesce(
    max((regexp_replace(codigo, '\D', '', 'g'))::integer),
    0
  ) + 1
  INTO v_seq
  FROM public.lancamentos_financeiros
  WHERE loja_id = p_loja_id AND tipo = p_tipo;

  RETURN v_prefix || '-' || lpad(v_seq::text, 4, '0');
END;
$$;


-- ---------------------------------------------------------------------------
-- Gera contas a receber a partir de uma venda concluída
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fin_gerar_receitas_venda(
  p_loja_id uuid,
  p_venda_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda record;
  v_pag record;
  v_plano_id uuid;
  v_forma_tipo public.forma_pagamento_tipo;
  v_parcelas_text text;
  v_num_parcelas integer;
  v_parcela integer;
  v_valor_parcela numeric(12, 2);
  v_resto numeric(12, 2);
  v_imediato boolean;
  v_codigo text;
  v_descricao text;
  v_count integer := 0;
BEGIN
  SELECT id, codigo, cliente_id, data_venda, status
  INTO v_venda
  FROM public.vendas
  WHERE id = p_venda_id AND loja_id = p_loja_id;

  IF NOT FOUND OR v_venda.status <> 'concluido' THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lancamentos_financeiros
    WHERE loja_id = p_loja_id AND venda_id = p_venda_id AND origem = 'venda'
      AND status <> 'cancelado'
  ) THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_plano_id
  FROM public.plano_contas
  WHERE loja_id = p_loja_id AND nome = 'Venda de Aparelhos'
  LIMIT 1;

  FOR v_pag IN
    SELECT *
    FROM public.venda_pagamentos
    WHERE loja_id = p_loja_id AND venda_id = p_venda_id AND valor > 0
  LOOP
    v_forma_tipo := NULL;
    IF v_pag.forma_pagamento_id IS NOT NULL THEN
      SELECT tipo INTO v_forma_tipo
      FROM public.formas_pagamento
      WHERE id = v_pag.forma_pagamento_id;
    END IF;

    v_imediato := coalesce(v_forma_tipo::text, '') IN ('pix', 'dinheiro', 'debito', 'aparelho_troca')
      OR v_pag.forma_nome ILIKE '%pix%'
      OR v_pag.forma_nome ILIKE '%dinheiro%'
      OR v_pag.forma_nome ILIKE '%débito%'
      OR v_pag.forma_nome ILIKE '%debito%'
      OR v_pag.forma_nome ILIKE '%aparelho%';

    v_parcelas_text := coalesce(nullif(trim(v_pag.parcelas), ''), 'À vista');

    IF v_imediato OR v_parcelas_text ILIKE '%vista%' THEN
      v_num_parcelas := 1;
    ELSE
      v_num_parcelas := coalesce(
        (regexp_match(v_parcelas_text, '(\d+)'))[1]::integer,
        1
      );
      v_num_parcelas := greatest(v_num_parcelas, 1);
    END IF;

    v_valor_parcela := round(v_pag.valor / v_num_parcelas, 2);
    v_resto := v_pag.valor;

    FOR v_parcela IN 1..v_num_parcelas
    LOOP
      IF v_parcela = v_num_parcelas THEN
        v_valor_parcela := v_resto;
      ELSE
        v_resto := round(v_resto - v_valor_parcela, 2);
      END IF;

      IF v_num_parcelas = 1 THEN
        v_descricao := 'Venda #' || v_venda.codigo || ' — ' || v_pag.forma_nome;
      ELSE
        v_descricao := 'Parcela ' || v_parcela || '/' || v_num_parcelas || ' — Venda #' || v_venda.codigo;
      END IF;

      v_codigo := public.next_lancamento_codigo(p_loja_id, 'receita');

      INSERT INTO public.lancamentos_financeiros (
        loja_id, codigo, tipo, status,
        descricao, valor, valor_liquidado,
        pessoa_id, plano_conta_id,
        forma_pagamento_id, forma_pagamento_nome,
        data_emissao, data_vencimento, data_liquidacao,
        origem, venda_id, venda_pagamento_id,
        parcela_num, parcela_total
      ) VALUES (
        p_loja_id,
        v_codigo,
        'receita',
        CASE WHEN v_imediato THEN 'recebido'::public.lancamento_status ELSE 'pendente'::public.lancamento_status END,
        v_descricao,
        v_valor_parcela,
        CASE WHEN v_imediato THEN v_valor_parcela ELSE 0 END,
        v_venda.cliente_id,
        v_plano_id,
        v_pag.forma_pagamento_id,
        v_pag.forma_nome,
        v_venda.data_venda,
        v_venda.data_venda + ((v_parcela - 1) * 30),
        CASE WHEN v_imediato THEN v_venda.data_venda ELSE NULL END,
        'venda',
        p_venda_id,
        v_pag.id,
        v_parcela,
        v_num_parcelas
      );

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.fin_cancelar_receitas_venda(
  p_loja_id uuid,
  p_venda_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.lancamentos_financeiros
  SET status = 'cancelado', updated_at = now()
  WHERE loja_id = p_loja_id
    AND venda_id = p_venda_id
    AND origem = 'venda'
    AND status IN ('pendente', 'recebido');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fin_gerar_receitas_venda(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_cancelar_receitas_venda(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_lancamento_codigo(uuid, public.lancamento_tipo) TO authenticated;


-- ---------------------------------------------------------------------------
-- Patch criar_venda_pdv: gerar receitas antes da baixa de estoque
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

  IF v_status = 'concluido' THEN
    PERFORM public.fin_gerar_receitas_venda(p_loja_id, v_venda_id);

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


-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_plano_contas_set_updated_at
BEFORE UPDATE ON public.plano_contas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_contas_bancarias_set_updated_at
BEFORE UPDATE ON public.contas_bancarias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lancamentos_financeiros_set_updated_at
BEFORE UPDATE ON public.lancamentos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY plano_contas_select_member ON public.plano_contas
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY plano_contas_write_admin ON public.plano_contas
FOR ALL TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY contas_bancarias_select_member ON public.contas_bancarias
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY contas_bancarias_write_admin ON public.contas_bancarias
FOR ALL TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY lancamentos_select_member ON public.lancamentos_financeiros
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY lancamentos_insert_member ON public.lancamentos_financeiros
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY lancamentos_update_member ON public.lancamentos_financeiros
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY lancamentos_delete_admin ON public.lancamentos_financeiros
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);
