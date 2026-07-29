-- =============================================================================
-- Phone Gestor ERP — Fase 6: Orçamentos
-- Funil comercial: orçamento → aprovação → conversão em venda (PDV)
-- =============================================================================

CREATE TYPE public.orcamento_status AS ENUM (
  'pendente',
  'aprovado',
  'rejeitado',
  'expirado',
  'convertido'
);


CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo text NOT NULL,
  cliente_id uuid REFERENCES public.pessoas (id) ON DELETE SET NULL,
  vendedor_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,

  status public.orcamento_status NOT NULL DEFAULT 'pendente',

  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_validade date,

  valor_subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  valor_desconto numeric(12, 2) NOT NULL DEFAULT 0,
  valor_acrescimo numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL DEFAULT 0,

  -- Simulador financeiro (persistido para PDF e preload do PDV)
  valor_entrada numeric(12, 2) NOT NULL DEFAULT 0,
  forma_pagamento_sim text,
  parcelas_sim smallint NOT NULL DEFAULT 1,
  taxa_repassada boolean NOT NULL DEFAULT true,
  taxa_percentual numeric(6, 3) NOT NULL DEFAULT 0,

  observacoes text,
  venda_id uuid REFERENCES public.vendas (id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orcamentos_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT orcamentos_valores_chk CHECK (
    valor_subtotal >= 0
    AND valor_desconto >= 0
    AND valor_acrescimo >= 0
    AND valor_total >= 0
    AND valor_entrada >= 0
  )
);

CREATE INDEX orcamentos_loja_id_idx ON public.orcamentos (loja_id);
CREATE INDEX orcamentos_cliente_id_idx ON public.orcamentos (cliente_id);
CREATE INDEX orcamentos_loja_status_idx ON public.orcamentos (loja_id, status);
CREATE INDEX orcamentos_loja_data_idx ON public.orcamentos (loja_id, data_emissao DESC);
CREATE INDEX orcamentos_venda_id_idx ON public.orcamentos (venda_id);


CREATE TABLE public.orcamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos (id) ON DELETE CASCADE,

  produto_id uuid REFERENCES public.produtos (id) ON DELETE SET NULL,
  descricao text NOT NULL,

  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric(12, 2) NOT NULL DEFAULT 0,
  valor_desconto numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orcamento_itens_quantidade_chk CHECK (quantidade > 0),
  CONSTRAINT orcamento_itens_valor_chk CHECK (
    valor_unitario >= 0
    AND valor_desconto >= 0
    AND valor_total >= 0
  )
);

CREATE INDEX orcamento_itens_orcamento_id_idx ON public.orcamento_itens (orcamento_id);
CREATE INDEX orcamento_itens_loja_id_idx ON public.orcamento_itens (loja_id);
CREATE INDEX orcamento_itens_produto_id_idx ON public.orcamento_itens (produto_id);


CREATE TABLE public.orcamento_aparelhos_troca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos (id) ON DELETE CASCADE,

  modelo text NOT NULL,
  imei text,
  valor_avaliacao numeric(12, 2) NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orcamento_aparelhos_valor_chk CHECK (valor_avaliacao >= 0)
);

CREATE INDEX orcamento_aparelhos_orcamento_id_idx ON public.orcamento_aparelhos_troca (orcamento_id);
CREATE INDEX orcamento_aparelhos_loja_id_idx ON public.orcamento_aparelhos_troca (loja_id);


-- ---------------------------------------------------------------------------
-- FUNÇÕES
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.next_orcamento_codigo(p_loja_id uuid)
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
    9000
  )::integer + 1
  INTO v_seq
  FROM public.orcamentos
  WHERE loja_id = p_loja_id;

  RETURN lpad(v_seq::text, 4, '0');
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_orcamento_pessoa_loja()
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
    RAISE EXCEPTION 'Cliente do orçamento não pertence à mesma loja.';
  END IF;

  RETURN NEW;
END;
$$;


CREATE TRIGGER trg_orcamentos_validate_cliente
BEFORE INSERT OR UPDATE OF cliente_id, loja_id ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.validate_orcamento_pessoa_loja();


CREATE TRIGGER trg_orcamentos_updated_at
BEFORE UPDATE ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER trg_orcamento_itens_updated_at
BEFORE UPDATE ON public.orcamento_itens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_aparelhos_troca ENABLE ROW LEVEL SECURITY;

CREATE POLICY orcamentos_select_member ON public.orcamentos
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamentos_insert_member ON public.orcamentos
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamentos_update_member ON public.orcamentos
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamentos_delete_admin ON public.orcamentos
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

CREATE POLICY orcamento_itens_select_member ON public.orcamento_itens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamento_itens_insert_member ON public.orcamento_itens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamento_itens_update_member ON public.orcamento_itens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamento_itens_delete_member ON public.orcamento_itens
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamento_aparelhos_select_member ON public.orcamento_aparelhos_troca
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamento_aparelhos_insert_member ON public.orcamento_aparelhos_troca
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamento_aparelhos_update_member ON public.orcamento_aparelhos_troca
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY orcamento_aparelhos_delete_member ON public.orcamento_aparelhos_troca
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));
