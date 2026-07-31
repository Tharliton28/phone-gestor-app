-- =============================================================================
-- Phone Gestor ERP — Fotos durante o reparo (evidência técnica interna)
--
-- Entrada e saída são evidências contra contestação do cliente.
-- As fotos "durante" protegem a loja em discussão técnica: estado interno da
-- placa, oxidação, componente queimado, peça trocada. Não têm termo nem
-- assinatura, pois são ato exclusivo do técnico.
-- =============================================================================

ALTER TYPE public.os_foto_momento ADD VALUE IF NOT EXISTS 'durante' BEFORE 'saida';

COMMENT ON COLUMN public.ordem_servico_fotos.momento IS
  'entrada = recebimento; durante = execução do reparo (uso interno); saida = retirada pelo cliente.';
