-- =============================================================================
-- Phone Gestor ERP — Fase 4: Vendas / PDV
-- =============================================================================

CREATE TYPE public.venda_status AS ENUM (
  'concluido',
  'pre_venda',
  'cancelada'
);

-- ---------------------------------------------------------------------------
-- VENDAS
-- ---------------------------------------------------------------------------

CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo text NOT NULL,
  cliente_id uuid REFERENCES public.pessoas (id) ON DELETE SET NULL,
  vendedor_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,

  status public.venda_status NOT NULL DEFAULT 'concluido',
  tipo_venda text,

  valor_subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  valor_desconto numeric(12, 2) NOT NULL DEFAULT 0,
  valor_acrescimo numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL DEFAULT 0,

  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  estoque_baixado boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vendas_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT vendas_valores_chk CHECK (
    valor_subtotal >= 0
    AND valor_desconto >= 0
    AND valor_acrescimo >= 0
    AND valor_total >= 0
  )
);

CREATE INDEX vendas_loja_id_idx ON public.vendas (loja_id);
CREATE INDEX vendas_cliente_id_idx ON public.vendas (cliente_id);
CREATE INDEX vendas_vendedor_id_idx ON public.vendas (vendedor_id);
CREATE INDEX vendas_loja_status_idx ON public.vendas (loja_id, status);
CREATE INDEX vendas_loja_data_idx ON public.vendas (loja_id, data_venda DESC);


CREATE TABLE public.venda_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  venda_id uuid NOT NULL REFERENCES public.vendas (id) ON DELETE CASCADE,

  produto_id uuid REFERENCES public.produtos (id) ON DELETE SET NULL,
  descricao text NOT NULL,
  imei text,

  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL DEFAULT 0,

  baixou_estoque boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT venda_itens_quantidade_chk CHECK (quantidade > 0),
  CONSTRAINT venda_itens_valor_chk CHECK (valor_unitario >= 0 AND valor_total >= 0)
);

CREATE INDEX venda_itens_venda_id_idx ON public.venda_itens (venda_id);
CREATE INDEX venda_itens_loja_id_idx ON public.venda_itens (loja_id);
CREATE INDEX venda_itens_produto_id_idx ON public.venda_itens (produto_id);


CREATE TABLE public.venda_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  venda_id uuid NOT NULL REFERENCES public.vendas (id) ON DELETE CASCADE,

  forma_pagamento_id uuid REFERENCES public.formas_pagamento (id) ON DELETE SET NULL,
  forma_nome text NOT NULL,

  valor numeric(12, 2) NOT NULL DEFAULT 0,
  parcelas text,
  detalhes text,
  taxa_percentual numeric(6, 3) NOT NULL DEFAULT 0,
  taxa_repassada boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT venda_pagamentos_valor_chk CHECK (valor >= 0)
);

CREATE INDEX venda_pagamentos_venda_id_idx ON public.venda_pagamentos (venda_id);
CREATE INDEX venda_pagamentos_loja_id_idx ON public.venda_pagamentos (loja_id);


-- ---------------------------------------------------------------------------
-- FUNÇÕES
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.next_venda_codigo(p_loja_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(regexp_replace(codigo, '\D', '', 'g') AS bigint)),
    0
  )::integer + 1
  INTO v_seq
  FROM public.vendas
  WHERE loja_id = p_loja_id;

  RETURN lpad(v_seq::text, 7, '0');
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_venda_pessoa_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_cliente uuid;
BEGIN
  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT loja_id INTO v_loja_cliente FROM public.pessoas WHERE id = NEW.cliente_id;
  IF v_loja_cliente IS NULL OR v_loja_cliente <> NEW.loja_id THEN
    RAISE EXCEPTION 'Cliente da venda não pertence à mesma loja.';
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_venda_item_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_venda uuid;
  v_loja_produto uuid;
BEGIN
  SELECT loja_id INTO v_loja_venda FROM public.vendas WHERE id = NEW.venda_id;
  IF v_loja_venda IS NULL OR v_loja_venda <> NEW.loja_id THEN
    RAISE EXCEPTION 'Item de venda com loja_id inconsistente.';
  END IF;

  IF NEW.produto_id IS NOT NULL THEN
    SELECT loja_id INTO v_loja_produto FROM public.produtos WHERE id = NEW.produto_id;
    IF v_loja_produto IS NULL OR v_loja_produto <> NEW.loja_id THEN
      RAISE EXCEPTION 'Produto do item de venda não pertence à mesma loja.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_venda_pagamento_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_venda uuid;
BEGIN
  SELECT loja_id INTO v_loja_venda FROM public.vendas WHERE id = NEW.venda_id;
  IF v_loja_venda IS NULL OR v_loja_venda <> NEW.loja_id THEN
    RAISE EXCEPTION 'Pagamento de venda com loja_id inconsistente.';
  END IF;

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_vendas_set_updated_at
BEFORE UPDATE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_venda_itens_set_updated_at
BEFORE UPDATE ON public.venda_itens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_vendas_validate_cliente
BEFORE INSERT OR UPDATE OF cliente_id, loja_id ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.validate_venda_pessoa_loja();

CREATE TRIGGER trg_venda_itens_validate_loja
BEFORE INSERT OR UPDATE ON public.venda_itens
FOR EACH ROW EXECUTE FUNCTION public.validate_venda_item_loja();

CREATE TRIGGER trg_venda_pagamentos_validate_loja
BEFORE INSERT OR UPDATE ON public.venda_pagamentos
FOR EACH ROW EXECUTE FUNCTION public.validate_venda_pagamento_loja();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendas_select_member ON public.vendas
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY vendas_insert_member ON public.vendas
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY vendas_update_member ON public.vendas
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY vendas_delete_admin ON public.vendas
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

CREATE POLICY venda_itens_select_member ON public.venda_itens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY venda_itens_insert_member ON public.venda_itens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY venda_itens_update_member ON public.venda_itens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY venda_itens_delete_member ON public.venda_itens
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY venda_pagamentos_select_member ON public.venda_pagamentos
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY venda_pagamentos_insert_member ON public.venda_pagamentos
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY venda_pagamentos_update_member ON public.venda_pagamentos
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY venda_pagamentos_delete_member ON public.venda_pagamentos
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));
