-- Permite PDF de recibos no bucket loja-assets (além de imagens de logo)

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf'
  ]
WHERE id = 'loja-assets';
