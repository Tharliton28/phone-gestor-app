-- Validade padrão de orçamentos por loja (dias corridos)
ALTER TABLE public.loja_configuracoes
  ADD COLUMN IF NOT EXISTS orcamento_validade_dias smallint NOT NULL DEFAULT 15
  CHECK (orcamento_validade_dias BETWEEN 1 AND 365);

COMMENT ON COLUMN public.loja_configuracoes.orcamento_validade_dias IS
  'Dias corridos de validade padrão ao criar um novo orçamento.';
