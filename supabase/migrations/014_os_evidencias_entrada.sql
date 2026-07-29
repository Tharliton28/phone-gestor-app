-- =============================================================================
-- Phone Gestor ERP — Fase 3b: Evidências de OS (termo entrada + fotos)
-- =============================================================================

CREATE TYPE public.os_termo_tipo AS ENUM ('entrada', 'saida');

CREATE TYPE public.os_foto_momento AS ENUM ('entrada', 'saida');

ALTER TABLE public.loja_configuracoes
  ADD COLUMN IF NOT EXISTS os_exigir_termo_entrada boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS os_exigir_foto_entrada boolean NOT NULL DEFAULT true;

CREATE TABLE public.ordem_servico_termos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico (id) ON DELETE CASCADE,

  tipo public.os_termo_tipo NOT NULL,
  termo_texto text NOT NULL,
  termo_hash text NOT NULL,

  aceito_em timestamptz NOT NULL DEFAULT now(),
  ip_cliente inet,
  user_agent text,
  assinatura_storage_path text,
  registrado_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ordem_servico_termos_os_tipo_uidx UNIQUE (ordem_servico_id, tipo)
);

CREATE INDEX ordem_servico_termos_loja_id_idx ON public.ordem_servico_termos (loja_id);
CREATE INDEX ordem_servico_termos_os_id_idx ON public.ordem_servico_termos (ordem_servico_id);

CREATE TABLE public.ordem_servico_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas (id) ON DELETE CASCADE,
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico (id) ON DELETE CASCADE,

  momento public.os_foto_momento NOT NULL DEFAULT 'entrada',
  storage_path text NOT NULL,
  legenda text,
  uploaded_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ordem_servico_fotos_os_id_idx ON public.ordem_servico_fotos (ordem_servico_id);
CREATE INDEX ordem_servico_fotos_loja_momento_idx ON public.ordem_servico_fotos (loja_id, momento);

-- Storage bucket (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'os-evidencias',
  'os-evidencias',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS — tabelas
-- ---------------------------------------------------------------------------

ALTER TABLE public.ordem_servico_termos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordem_servico_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordem_servico_termos_select_member ON public.ordem_servico_termos
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_termos_insert_member ON public.ordem_servico_termos
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_fotos_select_member ON public.ordem_servico_fotos
FOR SELECT TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_fotos_insert_member ON public.ordem_servico_fotos
FOR INSERT TO authenticated
WITH CHECK (loja_id IN (SELECT public.auth_user_loja_ids()));

CREATE POLICY ordem_servico_fotos_delete_member ON public.ordem_servico_fotos
FOR DELETE TO authenticated
USING (loja_id IN (SELECT public.auth_user_loja_ids()));

-- ---------------------------------------------------------------------------
-- RLS — storage
-- ---------------------------------------------------------------------------

CREATE POLICY os_evidencias_select_member ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'os-evidencias'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.auth_user_loja_ids())
);

CREATE POLICY os_evidencias_insert_member ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'os-evidencias'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.auth_user_loja_ids())
);

CREATE POLICY os_evidencias_delete_member ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'os-evidencias'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.auth_user_loja_ids())
);

COMMENT ON TABLE public.ordem_servico_termos IS 'Aceite de termos de entrada/saída com audit trail (IP, user-agent, hash do texto).';
COMMENT ON TABLE public.ordem_servico_fotos IS 'Fotos do aparelho na entrada ou saída da assistência.';
