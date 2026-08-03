-- Home patrocínios (plataforma) + storage de logo da loja

CREATE TABLE IF NOT EXISTS public.home_patrocinios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  cta_label text NOT NULL DEFAULT 'Saiba mais',
  cta_url text,
  badge text NOT NULL DEFAULT 'Patrocinado',
  accent text NOT NULL DEFAULT '#38bdf8',
  gradiente text NOT NULL DEFAULT 'linear-gradient(135deg, #0c4a6e 0%, #020617 100%)',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS home_patrocinios_ativo_ordem_idx
  ON public.home_patrocinios (ativo, ordem);

COMMENT ON TABLE public.home_patrocinios IS
  'Slots de mídia da home (plataforma). Lojas só leem; gestão via SQL/admin.';

ALTER TABLE public.home_patrocinios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS home_patrocinios_select_auth ON public.home_patrocinios;
CREATE POLICY home_patrocinios_select_auth ON public.home_patrocinios
  FOR SELECT TO authenticated
  USING (ativo = true);

INSERT INTO public.home_patrocinios (titulo, subtitulo, cta_label, cta_url, badge, accent, gradiente, ordem)
SELECT * FROM (VALUES
  (
    'Linha iPhone e acessórios originais',
    'Reposição rápida · garantia de fábrica · condições para lojista',
    'Falar com o fornecedor',
    'https://wa.me/5585989733574?text=Quero%20anunciar%20na%20home%20do%20Phone%20Gestor',
    'Patrocinado',
    '#38bdf8',
    'linear-gradient(135deg, #0c4a6e 0%, #082f49 45%, #020617 100%)',
    10
  ),
  (
    'Android seminovo com IMEI limpo',
    'Lotes semanais · checklist técnico · frete para CE e Nordeste',
    'Ver condições',
    'https://wa.me/5585989733574?text=Quero%20espa%C3%A7o%20patrocinado%20Android',
    'Patrocinado',
    '#60a5fa',
    'linear-gradient(135deg, #1e3a8a 0%, #172554 50%, #020617 100%)',
    20
  ),
  (
    'Capas, películas e carregadores no atacado',
    'Margem alta no balcão · catálogo atualizado toda semana',
    'Pedir catálogo',
    'https://wa.me/5585989733574?text=Quero%20anunciar%20acess%C3%B3rios',
    'Patrocinado',
    '#38bdf8',
    'linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #020617 100%)',
    30
  ),
  (
    'Seu fornecedor aqui',
    'Espaço premium na home de lojistas Phone Gestor — celulares, peças e acessórios.',
    'Anunciar neste espaço',
    'https://wa.me/5585989733574?text=Quero%20comprar%20espa%C3%A7o%20na%20home%20do%20Phone%20Gestor',
    'Espaço disponível',
    '#93c5fd',
    'linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #020617 100%)',
    40
  )
) AS v(titulo, subtitulo, cta_label, cta_url, badge, accent, gradiente, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.home_patrocinios LIMIT 1);

-- Bucket público para logos (leitura via URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'loja-assets',
  'loja-assets',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS loja_assets_select_public ON storage.objects;
CREATE POLICY loja_assets_select_public ON storage.objects
  FOR SELECT
  USING (bucket_id = 'loja-assets');

DROP POLICY IF EXISTS loja_assets_insert_member ON storage.objects;
CREATE POLICY loja_assets_insert_member ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'loja-assets'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );

DROP POLICY IF EXISTS loja_assets_update_member ON storage.objects;
CREATE POLICY loja_assets_update_member ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'loja-assets'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  )
  WITH CHECK (
    bucket_id = 'loja-assets'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );

DROP POLICY IF EXISTS loja_assets_delete_member ON storage.objects;
CREATE POLICY loja_assets_delete_member ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'loja-assets'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );
