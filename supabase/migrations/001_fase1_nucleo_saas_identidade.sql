-- =============================================================================
-- PhoneGestor — Fase 1: Núcleo SaaS e Identidade
-- PostgreSQL / Supabase
--
-- Ordem de execução:
--   1. Extensões e ENUMs
--   2. Tabelas (+ índices e comentários)
--   3. Funções (dependem das tabelas)
--   4. Triggers
--   5. RLS (políticas por último)
-- =============================================================================

-- =============================================================================
-- 1. EXTENSÕES E ENUMS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.usuario_papel AS ENUM (
  'owner',
  'admin',
  'gerente',
  'vendedor',
  'tecnico',
  'financeiro',
  'visualizador'
);

CREATE TYPE public.nfe_ambiente AS ENUM (
  'homologacao',
  'producao'
);

-- Função genérica de timestamp (não referencia tabelas de domínio)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. TABELAS
-- =============================================================================

CREATE TABLE public.lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação legal
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj char(14) NOT NULL,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario text,

  -- Contato
  email text,
  telefone text,

  -- Endereço
  cep char(8),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado char(2),
  codigo_ibge text,

  -- Marca
  logo_url text,

  -- SaaS
  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lojas_cnpj_digits_chk CHECK (cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT lojas_cep_digits_chk CHECK (cep IS NULL OR cep ~ '^[0-9]{8}$'),
  CONSTRAINT lojas_estado_len_chk CHECK (estado IS NULL OR char_length(estado) = 2)
);

CREATE UNIQUE INDEX lojas_cnpj_uidx ON public.lojas (cnpj);

COMMENT ON TABLE public.lojas IS 'Tenant raiz do SaaS. Cada loja representa um cliente assinante isolado via RLS.';


CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,

  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  avatar_url text,

  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX usuarios_email_uidx ON public.usuarios (lower(email));

COMMENT ON TABLE public.usuarios IS 'Perfil público do usuário, vinculado 1:1 ao auth.users do Supabase.';


CREATE TABLE public.usuario_lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,

  papel public.usuario_papel NOT NULL DEFAULT 'vendedor',
  loja_padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT usuario_lojas_usuario_loja_uidx UNIQUE (usuario_id, loja_id)
);

CREATE INDEX usuario_lojas_loja_id_idx ON public.usuario_lojas (loja_id);
CREATE INDEX usuario_lojas_usuario_id_idx ON public.usuario_lojas (usuario_id);

COMMENT ON TABLE public.usuario_lojas IS 'Associação N:N entre usuários e lojas, com papel de acesso por tenant.';


CREATE TABLE public.loja_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  loja_id uuid NOT NULL UNIQUE REFERENCES public.lojas (id) ON DELETE CASCADE,

  -- Toggles (Configuracoes.jsx)
  venda_sem_estoque boolean NOT NULL DEFAULT false,
  alerta_estoque_baixo boolean NOT NULL DEFAULT true,
  juros_automaticos boolean NOT NULL DEFAULT true,
  resumo_email_diario boolean NOT NULL DEFAULT true,

  -- Documentos / impressão
  termo_garantia text,
  termo_os text,

  -- Fiscal
  nfe_ambiente public.nfe_ambiente NOT NULL DEFAULT 'homologacao',
  nfe_serie integer NOT NULL DEFAULT 1,
  nfe_ultimo_numero integer NOT NULL DEFAULT 0,
  certificado_storage_path text,
  contador_cpf_cnpj text,
  contador_nome text,
  contador_email text,

  -- Listas de lookup (tipos_venda, marcas, plano_contas, etc.)
  listas jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT loja_configuracoes_nfe_serie_chk CHECK (nfe_serie > 0),
  CONSTRAINT loja_configuracoes_nfe_ultimo_numero_chk CHECK (nfe_ultimo_numero >= 0)
);

CREATE INDEX loja_configuracoes_loja_id_idx ON public.loja_configuracoes (loja_id);

COMMENT ON TABLE public.loja_configuracoes IS 'Configurações operacionais e fiscais por loja (1:1 com lojas).';

-- =============================================================================
-- 3. FUNÇÕES (após criação das tabelas referenciadas)
-- =============================================================================

-- Retorna os IDs das lojas às quais o usuário autenticado pertence (ativo).
CREATE OR REPLACE FUNCTION public.auth_user_loja_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ul.loja_id
  FROM public.usuario_lojas AS ul
  WHERE ul.usuario_id = auth.uid()
    AND ul.ativo = true;
$$;

-- Verifica se o usuário autenticado tem um papel mínimo em uma loja.
CREATE OR REPLACE FUNCTION public.auth_user_has_papel(
  p_loja_id uuid,
  p_papeis public.usuario_papel[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario_lojas AS ul
    WHERE ul.usuario_id = auth.uid()
      AND ul.loja_id = p_loja_id
      AND ul.ativo = true
      AND ul.papel = ANY (p_papeis)
  );
$$;

-- Sincroniza perfil público quando um usuário é criado no Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$$;

-- Garante no máximo uma loja padrão por usuário.
CREATE OR REPLACE FUNCTION public.enforce_single_loja_padrao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.loja_padrao IS TRUE THEN
    UPDATE public.usuario_lojas
    SET loja_padrao = false,
        updated_at = now()
    WHERE usuario_id = NEW.usuario_id
      AND id <> NEW.id
      AND loja_padrao = true;
  END IF;

  RETURN NEW;
END;
$$;

-- Cria configurações padrão ao cadastrar uma nova loja.
CREATE OR REPLACE FUNCTION public.handle_new_loja()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.loja_configuracoes (loja_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_lojas_set_updated_at
BEFORE UPDATE ON public.lojas
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_usuarios_set_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_usuario_lojas_set_updated_at
BEFORE UPDATE ON public.usuario_lojas
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_loja_configuracoes_set_updated_at
BEFORE UPDATE ON public.loja_configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_usuario_lojas_single_loja_padrao
BEFORE INSERT OR UPDATE OF loja_padrao ON public.usuario_lojas
FOR EACH ROW
WHEN (NEW.loja_padrao IS TRUE)
EXECUTE FUNCTION public.enforce_single_loja_padrao();

CREATE TRIGGER trg_lojas_create_configuracoes
AFTER INSERT ON public.lojas
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_loja();

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loja_configuracoes ENABLE ROW LEVEL SECURITY;

-- LOJAS -----------------------------------------------------------------------

CREATE POLICY lojas_select_member
ON public.lojas
FOR SELECT
TO authenticated
USING (id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY lojas_update_admin
ON public.lojas
FOR UPDATE
TO authenticated
USING (
  public.auth_user_has_papel(
    id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  )
)
WITH CHECK (
  public.auth_user_has_papel(
    id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  )
);

-- Inserção de lojas: fluxo de onboarding (Edge Function / service role).
CREATE POLICY lojas_insert_service
ON public.lojas
FOR INSERT
TO authenticated
WITH CHECK (false);

-- USUARIOS --------------------------------------------------------------------

CREATE POLICY usuarios_select_self_or_coworkers
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR id IN (
    SELECT ul.usuario_id
    FROM public.usuario_lojas AS ul
    WHERE ul.loja_id IN (SELECT public.auth_user_loja_ids())
      AND ul.ativo = true
  )
);

CREATE POLICY usuarios_update_self
ON public.usuarios
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY usuarios_insert_self
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- USUARIO_LOJAS ---------------------------------------------------------------

CREATE POLICY usuario_lojas_select_member
ON public.usuario_lojas
FOR SELECT
TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY usuario_lojas_insert_admin
ON public.usuario_lojas
FOR INSERT
TO authenticated
WITH CHECK (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  )
);

CREATE POLICY usuario_lojas_update_admin
ON public.usuario_lojas
FOR UPDATE
TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  )
)
WITH CHECK (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  )
);

CREATE POLICY usuario_lojas_delete_admin
ON public.usuario_lojas
FOR DELETE
TO authenticated
USING (
  public.auth_user_has_papel(
    loja_id,
    ARRAY['owner', 'admin']::public.usuario_papel[]
  )
);

-- LOJA_CONFIGURACOES ----------------------------------------------------------

CREATE POLICY loja_configuracoes_select_member
ON public.loja_configuracoes
FOR SELECT
TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY loja_configuracoes_update_admin
ON public.loja_configuracoes
FOR UPDATE
TO authenticated
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

CREATE POLICY loja_configuracoes_insert_member
ON public.loja_configuracoes
FOR INSERT
TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));
