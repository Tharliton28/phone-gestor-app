-- Autorização do titular para consultas cadastrais (LGPD / trilha de auditoria)
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS autoriza_consulta_dados boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autoriza_consulta_em timestamptz,
  ADD COLUMN IF NOT EXISTS autoriza_consulta_origem text;

COMMENT ON COLUMN public.pessoas.autoriza_consulta_dados IS
  'Titular autorizou consultas cadastrais (CPF/CNPJ/IMEI) pela loja — trilha LGPD.';
COMMENT ON COLUMN public.pessoas.autoriza_consulta_em IS
  'Momento em que a autorização de consulta foi registrada.';
COMMENT ON COLUMN public.pessoas.autoriza_consulta_origem IS
  'Origem da autorização: cadastro, termo_os, recibo, etc.';
