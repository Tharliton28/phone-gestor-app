-- =============================================================================
-- Phone Gestor ERP — Arquivo permanente da via assinada
--
-- Termo + assinatura + fotos + IP já ficam no banco. Este caminho guarda um
-- snapshot HTML da via (com imagens embutidas) para reabrir o comprovante
-- sem regenerar a partir de URLs assinadas que expiram.
-- =============================================================================

ALTER TABLE public.ordem_servico_termos
  ADD COLUMN IF NOT EXISTS via_html_storage_path text;

COMMENT ON COLUMN public.ordem_servico_termos.via_html_storage_path IS
  'Snapshot HTML da via do cliente no bucket os-evidencias (comprovante permanente).';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'image/heic', 'image/heif', 'application/octet-stream', 'text/html'
]
WHERE id = 'os-evidencias';
