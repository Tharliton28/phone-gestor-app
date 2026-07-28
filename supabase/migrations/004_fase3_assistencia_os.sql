-- =============================================================================
-- Phone Gestor ERP — Fase 3: Assistência Técnica (Ordens de Serviço)
-- =============================================================================

CREATE TYPE public.os_status AS ENUM (
  'aberta',
  'em_manutencao',
  'aguardando_peca',
  'finalizada',
  'cancelada'
);

CREATE TYPE public.os_item_tipo AS ENUM (
  'peca',
  'servico'
);

ALTER TYPE public.movimentacao_origem ADD VALUE IF NOT EXISTS 'ordem_servico';

-- ---------------------------------------------------------------------------
-- ORDENS DE SERVIÇO
-- ---------------------------------------------------------------------------

CREATE TABLE public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo text NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.pessoas (id) ON DELETE RESTRICT,
  tecnico_id uuid REFERENCES public.pessoas (id) ON DELETE SET NULL,

  aparelho_modelo text NOT NULL,
  aparelho_imei text,
  aparelho_cor_acessorios text,
  estado_fisico text,

  relato_cliente text,
  laudo_tecnico text,

  valor_servico numeric(12, 2) NOT NULL DEFAULT 0,
  valor_pecas numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL DEFAULT 0,

  status public.os_status NOT NULL DEFAULT 'aberta',
  aberto_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,

  data_entrada timestamptz NOT NULL DEFAULT now(),
  data_previsao date,
  data_finalizacao timestamptz,

  observacoes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ordens_servico_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT ordens_servico_valores_chk CHECK (
    valor_servico >= 0 AND valor_pecas >= 0 AND valor_total >= 0
  )
);

CREATE INDEX ordens_servico_loja_id_idx ON public.ordens_servico (loja_id);
CREATE INDEX ordens_servico_cliente_id_idx ON public.ordens_servico (cliente_id);
CREATE INDEX ordens_servico_tecnico_id_idx ON public.ordens_servico (tecnico_id);
CREATE INDEX ordens_servico_loja_status_idx ON public.ordens_servico (loja_id, status);
CREATE INDEX ordens_servico_loja_created_idx ON public.ordens_servico (loja_id, created_at DESC);


CREATE TABLE public.ordem_servico_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico (id) ON DELETE CASCADE,

  produto_id uuid REFERENCES public.produtos (id) ON DELETE SET NULL,
  tipo public.os_item_tipo NOT NULL DEFAULT 'peca',
  descricao text NOT NULL,

  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL DEFAULT 0,

  baixou_estoque boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ordem_servico_itens_quantidade_chk CHECK (quantidade > 0),
  CONSTRAINT ordem_servico_itens_valor_chk CHECK (valor_unitario >= 0 AND valor_total >= 0)
);

CREATE INDEX ordem_servico_itens_ordem_id_idx ON public.ordem_servico_itens (ordem_servico_id);
CREATE INDEX ordem_servico_itens_loja_id_idx ON public.ordem_servico_itens (loja_id);


-- ---------------------------------------------------------------------------
-- FUNÇÕES
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.next_ordem_servico_codigo(p_loja_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(regexp_replace(codigo, '^OS-', '') AS integer)),
    0
  ) + 1
  INTO v_seq
  FROM public.ordens_servico
  WHERE loja_id = p_loja_id
    AND codigo ~ '^OS-[0-9]+$';

  RETURN 'OS-' || lpad(v_seq::text, 4, '0');
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_ordem_servico_pessoas_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_cliente uuid;
  v_loja_tecnico uuid;
BEGIN
  SELECT loja_id INTO v_loja_cliente FROM public.pessoas WHERE id = NEW.cliente_id;
  IF v_loja_cliente IS NULL OR v_loja_cliente <> NEW.loja_id THEN
    RAISE EXCEPTION 'Cliente da OS não pertence à mesma loja.';
  END IF;

  IF NEW.tecnico_id IS NOT NULL THEN
    SELECT loja_id INTO v_loja_tecnico FROM public.pessoas WHERE id = NEW.tecnico_id;
    IF v_loja_tecnico IS NULL OR v_loja_tecnico <> NEW.loja_id THEN
      RAISE EXCEPTION 'Técnico da OS não pertence à mesma loja.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_ordem_servico_item_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_os uuid;
  v_loja_produto uuid;
BEGIN
  SELECT loja_id INTO v_loja_os FROM public.ordens_servico WHERE id = NEW.ordem_servico_id;
  IF v_loja_os IS NULL OR v_loja_os <> NEW.loja_id THEN
    RAISE EXCEPTION 'Item de OS com loja_id inconsistente.';
  END IF;

  IF NEW.produto_id IS NOT NULL THEN
    SELECT loja_id INTO v_loja_produto FROM public.produtos WHERE id = NEW.produto_id;
    IF v_loja_produto IS NULL OR v_loja_produto <> NEW.loja_id THEN
      RAISE EXCEPTION 'Produto do item de OS não pertence à mesma loja.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_ordens_servico_set_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ordem_servico_itens_set_updated_at
BEFORE UPDATE ON public.ordem_servico_itens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ordens_servico_validate_pessoas
BEFORE INSERT OR UPDATE OF cliente_id, tecnico_id, loja_id ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.validate_ordem_servico_pessoas_loja();

CREATE TRIGGER trg_ordem_servico_itens_validate_loja
BEFORE INSERT OR UPDATE ON public.ordem_servico_itens
FOR EACH ROW EXECUTE FUNCTION public.validate_ordem_servico_item_loja();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordem_servico_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordens_servico_select_member ON public.ordens_servico
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordens_servico_insert_member ON public.ordens_servico
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordens_servico_update_member ON public.ordens_servico
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordens_servico_delete_admin ON public.ordens_servico
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

CREATE POLICY ordem_servico_itens_select_member ON public.ordem_servico_itens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_itens_insert_member ON public.ordem_servico_itens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_itens_update_member ON public.ordem_servico_itens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_itens_delete_member ON public.ordem_servico_itens
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));
