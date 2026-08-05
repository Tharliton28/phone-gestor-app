-- =============================================================================
-- Phone Gestor — PDFs de recibo em bucket privado (LGPD / go-live)
-- Logos continuam em loja-assets (público). Recibos vão para loja-recibos.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'loja-recibos',
  'loja-recibos',
  false,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS loja_recibos_select_member ON storage.objects;
CREATE POLICY loja_recibos_select_member ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'loja-recibos'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );

DROP POLICY IF EXISTS loja_recibos_insert_member ON storage.objects;
CREATE POLICY loja_recibos_insert_member ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'loja-recibos'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );

DROP POLICY IF EXISTS loja_recibos_update_member ON storage.objects;
CREATE POLICY loja_recibos_update_member ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'loja-recibos'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  )
  WITH CHECK (
    bucket_id = 'loja-recibos'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );

DROP POLICY IF EXISTS loja_recibos_delete_member ON storage.objects;
CREATE POLICY loja_recibos_delete_member ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'loja-recibos'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );

-- Loja-assets: leitura pública só de logos (não de PDFs legados)
DROP POLICY IF EXISTS loja_assets_select_public ON storage.objects;
CREATE POLICY loja_assets_select_public_logos ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'loja-assets'
    AND name ~* '/logo\.(png|jpe?g|webp)$'
  );

DROP POLICY IF EXISTS loja_assets_select_member ON storage.objects;
CREATE POLICY loja_assets_select_member ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'loja-assets'
    AND split_part(name, '/', 1)::uuid IN (SELECT public.auth_user_loja_ids())
  );
