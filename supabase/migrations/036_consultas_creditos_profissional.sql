-- Consultas externas (CPF/CNPJ, IMEI) liberadas no Profissional e Rede.
CREATE OR REPLACE FUNCTION public.plano_permite_consultas(p_plano public.plano_assinatura)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_plano IN ('profissional', 'rede');
$$;

COMMENT ON FUNCTION public.plano_permite_consultas IS
  'Consultas externas (CPF/CNPJ, IMEI) liberadas no Profissional e Rede; consumo via carteira de créditos.';

CREATE TABLE IF NOT EXISTS public.consulta_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('cpf_cnpj', 'imei')),
  chave text NOT NULL,
  provider text,
  sucesso boolean NOT NULL DEFAULT false,
  creditos_consumidos integer NOT NULL DEFAULT 0,
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consulta_logs_loja_created_idx
  ON public.consulta_logs (loja_id, created_at DESC);

ALTER TABLE public.consulta_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consulta_logs_select_loja ON public.consulta_logs;
CREATE POLICY consulta_logs_select_loja ON public.consulta_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_lojas ul
      WHERE ul.loja_id = consulta_logs.loja_id
        AND ul.usuario_id = auth.uid()
        AND ul.ativo = true
    )
  );

INSERT INTO public.loja_credito_custos (acao, creditos, ativo)
VALUES
  ('consulta_cpf_cnpj', 1, true),
  ('consulta_imei', 2, true)
ON CONFLICT (acao) DO UPDATE
SET creditos = EXCLUDED.creditos,
    ativo = true;
