-- =============================================================================
-- PhoneGestor — Fase 2: Pessoas, Produtos e Estoque
-- PostgreSQL / Supabase
--
-- Pré-requisito: 001_fase1_nucleo_saas_identidade.sql executado com sucesso
--
-- Ordem de execução:
--   1. ENUMs
--   2. Tabelas
--   3. Funções
--   4. Triggers
--   5. Views
--   6. RLS
-- =============================================================================

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

CREATE TYPE public.pessoa_tipo AS ENUM ('fisica', 'juridica');

CREATE TYPE public.pessoa_categoria AS ENUM (
  'cliente',
  'fornecedor',
  'tecnico',
  'motoboy'
);

CREATE TYPE public.produto_tipo AS ENUM (
  'aparelho',
  'acessorio',
  'peca',
  'servico'
);

CREATE TYPE public.produto_status AS ENUM (
  'ativo',
  'estoque_baixo',
  'inativo',
  'aguardando_conserto'
);

CREATE TYPE public.produto_disponibilidade AS ENUM (
  'disponivel_venda',
  'uso_interno',
  'aguardando_conserto'
);

CREATE TYPE public.movimentacao_tipo AS ENUM (
  'entrada',
  'saida',
  'ajuste'
);

CREATE TYPE public.movimentacao_origem AS ENUM (
  'manual',
  'venda',
  'ordem_compra',
  'inventario',
  'devolucao',
  'estorno',
  'troca'
);

CREATE TYPE public.ordem_compra_status AS ENUM (
  'pendente',
  'recebido',
  'cancelado'
);

CREATE TYPE public.inventario_status AS ENUM (
  'aberto',
  'finalizado',
  'cancelado'
);

CREATE TYPE public.inventario_item_status AS ENUM (
  'ok',
  'faltando',
  'sobrando'
);

CREATE TYPE public.forma_pagamento_tipo AS ENUM (
  'pix',
  'dinheiro',
  'credito',
  'debito',
  'boleto',
  'aparelho_troca'
);

-- =============================================================================
-- 2. TABELAS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PESSOAS (Clientes, Fornecedores, Técnicos, Motoboys)
-- ---------------------------------------------------------------------------

CREATE TABLE public.pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo integer NOT NULL,

  tipo public.pessoa_tipo NOT NULL DEFAULT 'fisica',
  categoria public.pessoa_categoria NOT NULL DEFAULT 'cliente',

  cpf_cnpj char(14),
  nome text NOT NULL,
  origem text,
  inscricao_estadual text,
  indicador_contribuinte text,
  inscricao_municipal text,
  data_nascimento date,
  genero text,

  telefone text,
  telefone_alternativo text,
  email text,
  instagram text,

  cep char(8),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado char(2),
  observacoes text,

  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pessoas_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT pessoas_cpf_cnpj_digits_chk CHECK (
    cpf_cnpj IS NULL OR cpf_cnpj ~ '^[0-9]{11}$' OR cpf_cnpj ~ '^[0-9]{14}$'
  ),
  CONSTRAINT pessoas_cep_digits_chk CHECK (cep IS NULL OR cep ~ '^[0-9]{8}$'),
  CONSTRAINT pessoas_estado_len_chk CHECK (estado IS NULL OR char_length(estado) = 2)
);

CREATE UNIQUE INDEX pessoas_loja_cpf_cnpj_uidx
  ON public.pessoas (loja_id, cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;

CREATE INDEX pessoas_loja_id_idx ON public.pessoas (loja_id);
CREATE INDEX pessoas_loja_categoria_idx ON public.pessoas (loja_id, categoria);
CREATE INDEX pessoas_loja_nome_idx ON public.pessoas (loja_id, nome);

COMMENT ON TABLE public.pessoas IS 'Cadastro unificado de clientes, fornecedores, técnicos e motoboys por loja.';


CREATE TABLE public.pessoa_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas (id) ON DELETE CASCADE,

  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pessoa_anexos_pessoa_id_idx ON public.pessoa_anexos (pessoa_id);
CREATE INDEX pessoa_anexos_loja_id_idx ON public.pessoa_anexos (loja_id);

COMMENT ON TABLE public.pessoa_anexos IS 'Anexos/documentos vinculados a pessoas (Storage Supabase).';


-- ---------------------------------------------------------------------------
-- FORMAS DE PAGAMENTO (normaliza Configuracoes.jsx para uso no PDV)
-- ---------------------------------------------------------------------------

CREATE TABLE public.formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  nome text NOT NULL,
  tipo public.forma_pagamento_tipo NOT NULL,
  taxa_percentual numeric(6, 3) NOT NULL DEFAULT 0,
  prazo_descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem_exibicao integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT formas_pagamento_loja_nome_uidx UNIQUE (loja_id, nome),
  CONSTRAINT formas_pagamento_taxa_chk CHECK (taxa_percentual >= 0)
);

CREATE INDEX formas_pagamento_loja_id_idx ON public.formas_pagamento (loja_id);

COMMENT ON TABLE public.formas_pagamento IS 'Formas de pagamento configuráveis por loja (PDV e financeiro).';


-- ---------------------------------------------------------------------------
-- PRODUTOS / ESTOQUE
-- ---------------------------------------------------------------------------

CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo integer NOT NULL,
  sku text,

  tipo public.produto_tipo NOT NULL DEFAULT 'aparelho',
  categoria text NOT NULL,
  marca text NOT NULL,
  nome text NOT NULL,
  descricao text,

  ean text,
  disponibilidade public.produto_disponibilidade NOT NULL DEFAULT 'disponivel_venda',
  status public.produto_status NOT NULL DEFAULT 'ativo',

  -- Campos específicos de aparelho
  cor text,
  capacidade_gb integer,
  estado_aparelho text,
  imei1 char(15),
  imei2 char(15),
  saude_bateria smallint,
  ciclos_bateria integer,

  -- Campos específicos de acessório/peça
  aparelhos_compativeis text,
  qualidade_peca text,
  cor_estilo text,

  -- Estoque e preços
  quantidade_atual integer NOT NULL DEFAULT 0,
  quantidade_minima integer NOT NULL DEFAULT 0,
  valor_custo numeric(12, 2) NOT NULL DEFAULT 0,
  custos_extras numeric(12, 2) NOT NULL DEFAULT 0,
  margem_lucro_percentual numeric(6, 2),
  valor_venda numeric(12, 2) NOT NULL DEFAULT 0,

  data_entrada date,
  dias_garantia integer DEFAULT 90,
  observacoes text,

  -- Origem / fornecedor
  fornecedor_id uuid REFERENCES public.pessoas (id) ON DELETE SET NULL,
  numero_nfe_entrada text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT produtos_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT produtos_quantidade_minima_chk CHECK (quantidade_minima >= 0),
  CONSTRAINT produtos_saude_bateria_chk CHECK (
    saude_bateria IS NULL OR (saude_bateria >= 0 AND saude_bateria <= 100)
  ),
  CONSTRAINT produtos_imei1_digits_chk CHECK (imei1 IS NULL OR imei1 ~ '^[0-9]{15}$'),
  CONSTRAINT produtos_imei2_digits_chk CHECK (imei2 IS NULL OR imei2 ~ '^[0-9]{15}$')
);

CREATE UNIQUE INDEX produtos_loja_imei1_uidx
  ON public.produtos (loja_id, imei1)
  WHERE imei1 IS NOT NULL;

CREATE INDEX produtos_loja_id_idx ON public.produtos (loja_id);
CREATE INDEX produtos_loja_tipo_idx ON public.produtos (loja_id, tipo);
CREATE INDEX produtos_loja_status_idx ON public.produtos (loja_id, status);
CREATE INDEX produtos_fornecedor_id_idx ON public.produtos (fornecedor_id);

COMMENT ON TABLE public.produtos IS 'Catálogo e saldo de produtos por loja (aparelhos, acessórios, peças).';


CREATE TABLE public.produto_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos (id) ON DELETE CASCADE,

  storage_path text NOT NULL,
  url_publica text,
  ordem integer NOT NULL DEFAULT 0,
  principal boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX produto_imagens_produto_id_idx ON public.produto_imagens (produto_id);
CREATE INDEX produto_imagens_loja_id_idx ON public.produto_imagens (loja_id);


-- ---------------------------------------------------------------------------
-- ORDENS DE COMPRA
-- ---------------------------------------------------------------------------

CREATE TABLE public.ordens_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo text NOT NULL,
  fornecedor_id uuid NOT NULL REFERENCES public.pessoas (id) ON DELETE RESTRICT,

  condicao_pagamento text,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  previsao_entrega date,

  comprador_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,

  valor_subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  valor_desconto numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL DEFAULT 0,

  status public.ordem_compra_status NOT NULL DEFAULT 'pendente',
  observacoes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ordens_compra_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT ordens_compra_valores_chk CHECK (
    valor_subtotal >= 0 AND valor_desconto >= 0 AND valor_total >= 0
  )
);

CREATE INDEX ordens_compra_loja_id_idx ON public.ordens_compra (loja_id);
CREATE INDEX ordens_compra_fornecedor_id_idx ON public.ordens_compra (fornecedor_id);
CREATE INDEX ordens_compra_loja_status_idx ON public.ordens_compra (loja_id, status);


CREATE TABLE public.ordem_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  ordem_compra_id uuid NOT NULL REFERENCES public.ordens_compra (id) ON DELETE CASCADE,

  produto_id uuid REFERENCES public.produtos (id) ON DELETE SET NULL,
  descricao text NOT NULL,

  quantidade integer NOT NULL,
  custo_unitario numeric(12, 2) NOT NULL,
  desconto numeric(12, 2) NOT NULL DEFAULT 0,
  valor_total numeric(12, 2) NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ordem_compra_itens_quantidade_chk CHECK (quantidade > 0),
  CONSTRAINT ordem_compra_itens_custo_chk CHECK (custo_unitario >= 0),
  CONSTRAINT ordem_compra_itens_desconto_chk CHECK (desconto >= 0)
);

CREATE INDEX ordem_compra_itens_ordem_id_idx ON public.ordem_compra_itens (ordem_compra_id);
CREATE INDEX ordem_compra_itens_loja_id_idx ON public.ordem_compra_itens (loja_id);


-- ---------------------------------------------------------------------------
-- MOVIMENTAÇÕES DE ESTOQUE
-- ---------------------------------------------------------------------------

CREATE TABLE public.movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo text NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos (id) ON DELETE RESTRICT,

  tipo public.movimentacao_tipo NOT NULL,
  quantidade integer NOT NULL,
  quantidade_anterior integer NOT NULL,
  quantidade_posterior integer NOT NULL,

  origem public.movimentacao_origem NOT NULL DEFAULT 'manual',
  motivo text,
  referencia_id uuid,

  operador_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  estornado boolean NOT NULL DEFAULT false,
  estornado_em timestamptz,
  estornado_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT movimentacoes_estoque_loja_codigo_uidx UNIQUE (loja_id, codigo),
  CONSTRAINT movimentacoes_estoque_quantidade_chk CHECK (quantidade <> 0)
);

CREATE INDEX movimentacoes_estoque_loja_id_idx ON public.movimentacoes_estoque (loja_id);
CREATE INDEX movimentacoes_estoque_produto_id_idx ON public.movimentacoes_estoque (produto_id);
CREATE INDEX movimentacoes_estoque_loja_created_idx ON public.movimentacoes_estoque (loja_id, created_at DESC);
CREATE INDEX movimentacoes_estoque_referencia_idx ON public.movimentacoes_estoque (origem, referencia_id);


-- ---------------------------------------------------------------------------
-- INVENTÁRIO / BALANÇO FÍSICO
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventario_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  codigo text NOT NULL,
  status public.inventario_status NOT NULL DEFAULT 'aberto',

  responsavel_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  observacoes text,

  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventario_sessoes_loja_codigo_uidx UNIQUE (loja_id, codigo)
);

CREATE INDEX inventario_sessoes_loja_id_idx ON public.inventario_sessoes (loja_id);
CREATE INDEX inventario_sessoes_loja_status_idx ON public.inventario_sessoes (loja_id, status);


CREATE TABLE public.inventario_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  inventario_sessao_id uuid NOT NULL REFERENCES public.inventario_sessoes (id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos (id) ON DELETE RESTRICT,

  quantidade_sistema integer NOT NULL,
  quantidade_contada integer,
  divergencia integer GENERATED ALWAYS AS (quantidade_contada - quantidade_sistema) STORED,
  status public.inventario_item_status,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventario_itens_sessao_produto_uidx UNIQUE (inventario_sessao_id, produto_id)
);

CREATE INDEX inventario_itens_sessao_id_idx ON public.inventario_itens (inventario_sessao_id);
CREATE INDEX inventario_itens_loja_id_idx ON public.inventario_itens (loja_id);


-- =============================================================================
-- 3. FUNÇÕES
-- =============================================================================

-- Próximo código numérico de pessoa por loja
CREATE OR REPLACE FUNCTION public.next_pessoa_codigo(p_loja_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(codigo), 0) + 1
  FROM public.pessoas
  WHERE loja_id = p_loja_id;
$$;

-- Próximo código numérico de produto por loja
CREATE OR REPLACE FUNCTION public.next_produto_codigo(p_loja_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(codigo), 0) + 1
  FROM public.produtos
  WHERE loja_id = p_loja_id;
$$;

-- Próximo código de ordem de compra (OC-0001)
CREATE OR REPLACE FUNCTION public.next_ordem_compra_codigo(p_loja_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(regexp_replace(codigo, '^OC-', '') AS integer)),
    0
  ) + 1
  INTO v_seq
  FROM public.ordens_compra
  WHERE loja_id = p_loja_id
    AND codigo ~ '^OC-[0-9]+$';

  RETURN 'OC-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- Próximo código de movimentação (MOV-0001)
CREATE OR REPLACE FUNCTION public.next_movimentacao_codigo(p_loja_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
BEGIN
  SELECT COALESCE(
    MAX(CAST(regexp_replace(codigo, '^MOV-', '') AS integer)),
    0
  ) + 1
  INTO v_seq
  FROM public.movimentacoes_estoque
  WHERE loja_id = p_loja_id
    AND codigo ~ '^MOV-[0-9]+$';

  RETURN 'MOV-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- Valida que registros filhos pertencem à mesma loja do pai
CREATE OR REPLACE FUNCTION public.validate_same_loja_pessoa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_pessoa uuid;
BEGIN
  IF NEW.fornecedor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT loja_id INTO v_loja_pessoa
  FROM public.pessoas
  WHERE id = NEW.fornecedor_id;

  IF v_loja_pessoa IS NULL OR v_loja_pessoa <> NEW.loja_id THEN
    RAISE EXCEPTION 'Fornecedor não pertence à mesma loja do registro.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_ordem_compra_fornecedor_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_pessoa uuid;
BEGIN
  SELECT loja_id INTO v_loja_pessoa
  FROM public.pessoas
  WHERE id = NEW.fornecedor_id;

  IF v_loja_pessoa IS NULL OR v_loja_pessoa <> NEW.loja_id THEN
    RAISE EXCEPTION 'Fornecedor da ordem de compra não pertence à mesma loja.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_produto_loja_references()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_loja_ref uuid;
BEGIN
  IF TG_TABLE_NAME = 'ordem_compra_itens' THEN
    SELECT loja_id INTO v_loja_ref FROM public.ordens_compra WHERE id = NEW.ordem_compra_id;
    IF v_loja_ref <> NEW.loja_id THEN
      RAISE EXCEPTION 'Item de ordem de compra com loja_id inconsistente.';
    END IF;
    IF NEW.produto_id IS NOT NULL THEN
      SELECT loja_id INTO v_loja_ref FROM public.produtos WHERE id = NEW.produto_id;
      IF v_loja_ref <> NEW.loja_id THEN
        RAISE EXCEPTION 'Produto do item não pertence à mesma loja.';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'movimentacoes_estoque' THEN
    SELECT loja_id INTO v_loja_ref FROM public.produtos WHERE id = NEW.produto_id;
    IF v_loja_ref <> NEW.loja_id THEN
      RAISE EXCEPTION 'Produto da movimentação não pertence à mesma loja.';
    END IF;
  ELSIF TG_TABLE_NAME = 'inventario_itens' THEN
    SELECT loja_id INTO v_loja_ref FROM public.inventario_sessoes WHERE id = NEW.inventario_sessao_id;
    IF v_loja_ref <> NEW.loja_id THEN
      RAISE EXCEPTION 'Item de inventário com loja_id inconsistente.';
    END IF;
    SELECT loja_id INTO v_loja_ref FROM public.produtos WHERE id = NEW.produto_id;
    IF v_loja_ref <> NEW.loja_id THEN
      RAISE EXCEPTION 'Produto do inventário não pertence à mesma loja.';
    END IF;
  ELSIF TG_TABLE_NAME = 'pessoa_anexos' THEN
    SELECT loja_id INTO v_loja_ref FROM public.pessoas WHERE id = NEW.pessoa_id;
    IF v_loja_ref <> NEW.loja_id THEN
      RAISE EXCEPTION 'Anexo de pessoa com loja_id inconsistente.';
    END IF;
  ELSIF TG_TABLE_NAME = 'produto_imagens' THEN
    SELECT loja_id INTO v_loja_ref FROM public.produtos WHERE id = NEW.produto_id;
    IF v_loja_ref <> NEW.loja_id THEN
      RAISE EXCEPTION 'Imagem de produto com loja_id inconsistente.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Atualiza status do produto conforme saldo mínimo
CREATE OR REPLACE FUNCTION public.sync_produto_status_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quantidade_atual <= 0 THEN
    NEW.status := 'inativo';
  ELSIF NEW.quantidade_atual <= NEW.quantidade_minima THEN
    NEW.status := 'estoque_baixo';
  ELSIF NEW.status IN ('estoque_baixo', 'inativo') AND NEW.quantidade_atual > NEW.quantidade_minima THEN
    NEW.status := 'ativo';
  END IF;

  RETURN NEW;
END;
$$;

-- Calcula status do item de inventário
CREATE OR REPLACE FUNCTION public.sync_inventario_item_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quantidade_contada IS NULL THEN
    NEW.status := NULL;
  ELSIF NEW.quantidade_contada = NEW.quantidade_sistema THEN
    NEW.status := 'ok';
  ELSIF NEW.quantidade_contada < NEW.quantidade_sistema THEN
    NEW.status := 'faltando';
  ELSE
    NEW.status := 'sobrando';
  END IF;

  RETURN NEW;
END;
$$;

-- Seed de formas de pagamento padrão ao criar loja
CREATE OR REPLACE FUNCTION public.seed_formas_pagamento_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.formas_pagamento (loja_id, nome, tipo, taxa_percentual, prazo_descricao, ordem_exibicao)
  VALUES
    (NEW.id, 'PIX', 'pix', 0, 'Imediato', 1),
    (NEW.id, 'Dinheiro', 'dinheiro', 0, 'Imediato', 2),
    (NEW.id, 'Crédito à Vista', 'credito', 3.49, 'D+1', 3),
    (NEW.id, 'Crédito Parcelado 12x', 'credito', 12.99, 'D+1', 4),
    (NEW.id, 'Débito', 'debito', 1.99, 'Na hora', 5),
    (NEW.id, 'Boleto Bancário', 'boleto', 2.50, 'D+2 após pago', 6),
    (NEW.id, 'Aparelho Usado (Entrada)', 'aparelho_troca', 0, 'Imediato', 7);

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_pessoas_set_updated_at
BEFORE UPDATE ON public.pessoas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pessoa_anexos_set_updated_at
BEFORE UPDATE ON public.pessoa_anexos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_formas_pagamento_set_updated_at
BEFORE UPDATE ON public.formas_pagamento
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_produtos_set_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_produtos_sync_status
BEFORE INSERT OR UPDATE OF quantidade_atual, quantidade_minima ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.sync_produto_status_estoque();

CREATE TRIGGER trg_produtos_validate_fornecedor_loja
BEFORE INSERT OR UPDATE OF fornecedor_id, loja_id ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.validate_same_loja_pessoa();

CREATE TRIGGER trg_produto_imagens_set_updated_at
BEFORE UPDATE ON public.produto_imagens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_produto_imagens_validate_loja
BEFORE INSERT OR UPDATE ON public.produto_imagens
FOR EACH ROW EXECUTE FUNCTION public.validate_produto_loja_references();

CREATE TRIGGER trg_ordens_compra_set_updated_at
BEFORE UPDATE ON public.ordens_compra
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ordens_compra_validate_fornecedor
BEFORE INSERT OR UPDATE OF fornecedor_id, loja_id ON public.ordens_compra
FOR EACH ROW EXECUTE FUNCTION public.validate_ordem_compra_fornecedor_loja();

CREATE TRIGGER trg_ordem_compra_itens_set_updated_at
BEFORE UPDATE ON public.ordem_compra_itens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ordem_compra_itens_validate_loja
BEFORE INSERT OR UPDATE ON public.ordem_compra_itens
FOR EACH ROW EXECUTE FUNCTION public.validate_produto_loja_references();

CREATE TRIGGER trg_movimentacoes_estoque_set_updated_at
BEFORE UPDATE ON public.movimentacoes_estoque
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_movimentacoes_estoque_validate_loja
BEFORE INSERT OR UPDATE ON public.movimentacoes_estoque
FOR EACH ROW EXECUTE FUNCTION public.validate_produto_loja_references();

CREATE TRIGGER trg_inventario_sessoes_set_updated_at
BEFORE UPDATE ON public.inventario_sessoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_inventario_itens_set_updated_at
BEFORE UPDATE ON public.inventario_itens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_inventario_itens_sync_status
BEFORE INSERT OR UPDATE OF quantidade_contada, quantidade_sistema ON public.inventario_itens
FOR EACH ROW EXECUTE FUNCTION public.sync_inventario_item_status();

CREATE TRIGGER trg_inventario_itens_validate_loja
BEFORE INSERT OR UPDATE ON public.inventario_itens
FOR EACH ROW EXECUTE FUNCTION public.validate_produto_loja_references();

CREATE TRIGGER trg_pessoa_anexos_validate_loja
BEFORE INSERT OR UPDATE ON public.pessoa_anexos
FOR EACH ROW EXECUTE FUNCTION public.validate_produto_loja_references();

CREATE TRIGGER trg_lojas_seed_formas_pagamento
AFTER INSERT ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.seed_formas_pagamento_loja();


-- =============================================================================
-- 5. VIEWS
-- =============================================================================

-- Alimenta a tela "Vendidos sem Estoque" (ruptura por saldo negativo)
CREATE OR REPLACE VIEW public.rupturas_estoque
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.loja_id,
  p.codigo,
  p.nome AS produto,
  p.tipo,
  p.categoria,
  p.marca,
  p.quantidade_atual AS saldo_atual,
  p.valor_venda,
  p.updated_at AS atualizado_em
FROM public.produtos AS p
WHERE p.quantidade_atual < 0;


-- Resumo de pessoa para listagem (última compra virá na Fase 3 com vendas)
CREATE OR REPLACE VIEW public.pessoas_resumo
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.loja_id,
  p.codigo,
  p.nome,
  p.cpf_cnpj,
  p.telefone,
  p.categoria,
  p.ativo,
  p.created_at,
  p.updated_at
FROM public.pessoas AS p;


-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoa_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordem_compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_itens ENABLE ROW LEVEL SECURITY;

-- Macro-política: membro da loja pode ler
-- Escrita: membro autenticado da loja; delete restrito a admin/gerente

-- PESSOAS ---------------------------------------------------------------------

CREATE POLICY pessoas_select_member ON public.pessoas
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY pessoas_insert_member ON public.pessoas
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY pessoas_update_member ON public.pessoas
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY pessoas_delete_admin ON public.pessoas
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- PESSOA_ANEXOS ---------------------------------------------------------------

CREATE POLICY pessoa_anexos_select_member ON public.pessoa_anexos
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY pessoa_anexos_insert_member ON public.pessoa_anexos
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY pessoa_anexos_update_member ON public.pessoa_anexos
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY pessoa_anexos_delete_admin ON public.pessoa_anexos
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- FORMAS_PAGAMENTO ------------------------------------------------------------

CREATE POLICY formas_pagamento_select_member ON public.formas_pagamento
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY formas_pagamento_insert_admin ON public.formas_pagamento
FOR INSERT TO authenticated
WITH CHECK (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

CREATE POLICY formas_pagamento_update_admin ON public.formas_pagamento
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

CREATE POLICY formas_pagamento_delete_admin ON public.formas_pagamento
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- PRODUTOS --------------------------------------------------------------------

CREATE POLICY produtos_select_member ON public.produtos
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY produtos_insert_member ON public.produtos
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY produtos_update_member ON public.produtos
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY produtos_delete_admin ON public.produtos
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- PRODUTO_IMAGENS -------------------------------------------------------------

CREATE POLICY produto_imagens_select_member ON public.produto_imagens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY produto_imagens_insert_member ON public.produto_imagens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY produto_imagens_update_member ON public.produto_imagens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY produto_imagens_delete_admin ON public.produto_imagens
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- ORDENS_COMPRA ---------------------------------------------------------------

CREATE POLICY ordens_compra_select_member ON public.ordens_compra
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordens_compra_insert_member ON public.ordens_compra
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordens_compra_update_member ON public.ordens_compra
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordens_compra_delete_admin ON public.ordens_compra
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- ORDEM_COMPRA_ITENS ----------------------------------------------------------

CREATE POLICY ordem_compra_itens_select_member ON public.ordem_compra_itens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_compra_itens_insert_member ON public.ordem_compra_itens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_compra_itens_update_member ON public.ordem_compra_itens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_compra_itens_delete_admin ON public.ordem_compra_itens
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- MOVIMENTACOES_ESTOQUE -------------------------------------------------------

CREATE POLICY movimentacoes_estoque_select_member ON public.movimentacoes_estoque
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY movimentacoes_estoque_insert_member ON public.movimentacoes_estoque
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY movimentacoes_estoque_update_member ON public.movimentacoes_estoque
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY movimentacoes_estoque_delete_admin ON public.movimentacoes_estoque
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- INVENTARIO_SESSOES ----------------------------------------------------------

CREATE POLICY inventario_sessoes_select_member ON public.inventario_sessoes
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY inventario_sessoes_insert_member ON public.inventario_sessoes
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY inventario_sessoes_update_member ON public.inventario_sessoes
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY inventario_sessoes_delete_admin ON public.inventario_sessoes
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- INVENTARIO_ITENS ------------------------------------------------------------

CREATE POLICY inventario_itens_select_member ON public.inventario_itens
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY inventario_itens_insert_member ON public.inventario_itens
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY inventario_itens_update_member ON public.inventario_itens
FOR UPDATE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()))
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY inventario_itens_delete_admin ON public.inventario_itens
FOR DELETE TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin', 'gerente']::public.usuario_papel[]
  )
);

-- =============================================================================
-- 7. BACKFILL — lojas criadas na Fase 1 (antes deste script)
-- =============================================================================

INSERT INTO public.formas_pagamento (loja_id, nome, tipo, taxa_percentual, prazo_descricao, ordem_exibicao)
SELECT
  l.id,
  v.nome,
  v.tipo,
  v.taxa_percentual,
  v.prazo_descricao,
  v.ordem_exibicao
FROM public.lojas AS l
CROSS JOIN (
  VALUES
    ('PIX', 'pix'::public.forma_pagamento_tipo, 0::numeric, 'Imediato', 1),
    ('Dinheiro', 'dinheiro'::public.forma_pagamento_tipo, 0::numeric, 'Imediato', 2),
    ('Crédito à Vista', 'credito'::public.forma_pagamento_tipo, 3.49::numeric, 'D+1', 3),
    ('Crédito Parcelado 12x', 'credito'::public.forma_pagamento_tipo, 12.99::numeric, 'D+1', 4),
    ('Débito', 'debito'::public.forma_pagamento_tipo, 1.99::numeric, 'Na hora', 5),
    ('Boleto Bancário', 'boleto'::public.forma_pagamento_tipo, 2.50::numeric, 'D+2 após pago', 6),
    ('Aparelho Usado (Entrada)', 'aparelho_troca'::public.forma_pagamento_tipo, 0::numeric, 'Imediato', 7)
) AS v(nome, tipo, taxa_percentual, prazo_descricao, ordem_exibicao)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.formas_pagamento AS fp
  WHERE fp.loja_id = l.id
);
