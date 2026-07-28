-- Fix: colunas CHAR preenchem com espaços e quebram constraints de dígitos (CPF/CNPJ, CEP)
-- Ex.: CPF 11 dígitos em char(14) vira '61812926324   ' e falha pessoas_cpf_cnpj_digits_chk
--
-- A view pessoas_resumo referencia cpf_cnpj; é necessário recriá-la após o ALTER.

DROP VIEW IF EXISTS public.pessoas_resumo;

ALTER TABLE public.pessoas
  ALTER COLUMN cpf_cnpj TYPE varchar(14) USING trim(cpf_cnpj);

ALTER TABLE public.pessoas
  ALTER COLUMN cep TYPE varchar(8) USING trim(cep);

ALTER TABLE public.pessoas
  ALTER COLUMN estado TYPE varchar(2) USING trim(estado);

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
